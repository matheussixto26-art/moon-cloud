const axios = require('axios');

async function fetchApiData(requestConfig) {
    try {
        const response = await axios(requestConfig);
        return response.data;
    } catch (error) {
        const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`Falha ao buscar dados de: ${requestConfig.url}. Detalhes: ${errorDetails}`);
        return null;
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const { user, senha } = req.body;
    if (!user || !senha) {
        return res.status(400).json({ error: 'RA e Senha são obrigatórios.' });
    }

    try {
        // ETAPA 1: Login Principal
        const loginResponse = await axios.post(
            "https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken",
            { user, senha },
            { headers: { "Ocp-Apim-Subscription-Key": "2b03c1db3884488795f79c37c069381a" } }
        );

        const tokenA = loginResponse.data.token;
        const userInfo = loginResponse.data.DadosUsuario;
        if (!tokenA || !userInfo) return res.status(401).json({ error: 'Credenciais inválidas.' });

        // ETAPA 2: Troca de Token
        const exchangeResponse = await axios.post(
            "https://edusp-api.ip.tv/registration/edusp/token",
            { token: tokenA },
            { headers: { "Content-Type": "application/json", "x-api-realm": "edusp", "x-api-platform": "webclient" } }
        );
        const tokenB = exchangeResponse.data.auth_token;
        if (!tokenB) return res.status(500).json({ error: 'Falha ao obter o token secundário.' });
        
        // ETAPA 3: Buscar "salas" para obter os alvos de publicação (A SUA DESCOBERTA!)
        const roomUserData = await fetchApiData({
            method: 'get',
            url: 'https://edusp-api.ip.tv/room/user?list_all=true',
            headers: { "x-api-key": tokenB }
        });

        let publicationTargetsQuery = '';
        if (roomUserData && roomUserData.rooms) {
            const targets = [];
            roomUserData.rooms.forEach(room => {
                targets.push(room.publication_target); // O 'publication_target' da própria sala
                if (room.group_categories) {
                    room.group_categories.forEach(group => targets.push(group.id)); // E os IDs dos grupos
                }
            });
            const uniqueTargets = [...new Set(targets)];
            publicationTargetsQuery = uniqueTargets.map(target => `publication_target[]=${encodeURIComponent(target)}`).join('&');
        }

        // ETAPA 4: Buscar dados do dashboard em paralelo
        const codigoAluno = userInfo.CD_USUARIO;
        const anoLetivo = new Date().getFullYear();

        const requests = [
             fetchApiData({ // USANDO A API DE FREQUÊNCIA ANUAL
                method: 'get',
                url: `https://sedintegracoes.educacao.sp.gov.br/apiboletim/api/Frequencia/GetFrequenciaAluno?anoLetivo=${anoLetivo}&codigoAluno=${codigoAluno}`,
                headers: { "Authorization": `Bearer ${tokenA}`, "Ocp-Apim-Subscription-Key": "a84380a41b144e0fa3d86cbc25027fe6" }
            }),
            fetchApiData({ // USANDO A URL EXATA QUE VOCÊ DESCOBRIU
                method: 'get',
                url: `https://edusp-api.ip.tv/tms/task/todo?expired_only=false&is_essay=false&is_exam=false&answer_statuses=draft&answer_statuses=pending&with_answer=true&with_apply_moment=true&limit=100&filter_expired=true&offset=0&${publicationTargetsQuery}`,
                headers: { "x-api-key": tokenB }
            }),
            fetchApiData({
                method: 'get',
                url: `https://sedintegracoes.educacao.sp.gov.br/apisalaconquistas/api/salaConquista/conquistaAluno?CodigoAluno=${codigoAluno}`,
                headers: { "Authorization": `Bearer ${tokenA}`, "Ocp-Apim-Subscription-Key": "008ada07395f4045bc6e795d63718090" }
            }),
            fetchApiData({
                method: 'get',
                url: `https://sedintegracoes.educacao.sp.gov.br/cmspwebservice/api/sala-do-futuro-alunos/consulta-notificacao?userId=${codigoAluno}`,
                headers: { "Authorization": `Bearer ${tokenA}`, "Ocp-Apim-Subscription-Key": "1a758fd2f6be41448079c9616a861b91" }
            })
        ];

        const [faltasData, tarefas, conquistas, notificacoes] = await Promise.all(requests);
        
        if(roomUserData && roomUserData.rooms && roomUserData.rooms[0]?.meta?.nome_escola) {
            userInfo.NOME_ESCOLA = roomUserData.rooms[0].meta.nome_escola;
        }

        const dashboardData = {
            userInfo: userInfo,
            auth_token: tokenB,
            faltas: faltasData?.data?.disciplinas || [],
            tarefas: tarefas || [],
            conquistas: conquistas?.data || [],
            notificacoes: notificacoes || []
        };

        res.status(200).json(dashboardData);

    } catch (error) {
        const errorMessage = error.response?.data?.statusRetorno || 'RA ou Senha inválidos, ou falha em uma das APIs críticas.';
        console.error('ERRO GERAL NO PROCESSO:', error.response ? error.response.data : error.message);
        return res.status(error.response?.status || 500).json({ error: errorMessage });
    }
};

