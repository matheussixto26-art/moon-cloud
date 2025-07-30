const axios = require('axios');

// Função para criar os cabeçalhos que imitam o Taskitos/MoonScripts
const getEduspHeaders = (token) => ({
    'x-api-key': token,
    'x-client-domain': 'taskitos.cupiditys.lol',
    'origin': 'https://taskitos.cupiditys.lol',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36'
});

async function fetchApiData(requestConfig) {
    try {
        const response = await axios(requestConfig);
        return response.data;
    } catch (error) {
        console.error(`Falha ao buscar dados de: ${requestConfig.url}.`);
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
        const loginResponse = await axios.post(
            "https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken",
            { user, senha },
            { headers: { "Ocp-Apim-Subscription-Key": "2b03c1db3884488795f79c37c069381a" } }
        );

        const tokenA = loginResponse.data.token;
        const userInfo = loginResponse.data.DadosUsuario;
        if (!tokenA || !userInfo) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const exchangeResponse = await axios.post(
            "https://edusp-api.ip.tv/registration/edusp/token",
            { token: tokenA },
            { headers: { "Content-Type": "application/json", "x-api-realm": "edusp", "x-api-platform": "webclient" } }
        );
        const tokenB = exchangeResponse.data.auth_token;
        if (!tokenB) return res.status(500).json({ error: 'Falha ao obter o token secundário.' });
        
        const roomUserData = await fetchApiData({
            method: 'get',
            url: 'https://edusp-api.ip.tv/room/user?list_all=true',
            headers: getEduspHeaders(tokenB)
        });

        let targets = [];
        if (roomUserData && roomUserData.rooms) {
            roomUserData.rooms.forEach(room => {
                targets.push(room.publication_target);
                if (room.group_categories) {
                    room.group_categories.forEach(group => targets.push(group.id));
                }
            });
            targets = [...new Set(targets)];
        }

        const codigoAluno = userInfo.CD_USUARIO;
        const [faltasData, conquistas, notificacoes] = await Promise.all([
             fetchApiData({
                method: 'get',
                url: `https://sedintegracoes.educacao.sp.gov.br/apiboletim/api/Frequencia/GetFaltasBimestreAtual?codigoAluno=${codigoAluno}`,
                headers: { "Authorization": `Bearer ${tokenA}`, "Ocp-Apim-Subscription-Key": "a84380a41b144e0fa3d86cbc25027fe6" }
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
        ]);
        
        if(roomUserData && roomUserData.rooms && roomUserData.rooms[0]?.meta?.nome_escola) {
            userInfo.NOME_ESCOLA = roomUserData.rooms[0].meta.nome_escola;
        }

        const initialData = {
            userInfo: userInfo,
            auth_token: tokenB,
            targets: targets,
            faltas: faltasData?.data || [],
            conquistas: conquistas?.data || [],
            notificacoes: notificacoes || []
        };

        res.status(200).json(initialData);

    } catch (error) {
        const errorMessage = error.response?.data?.statusRetorno || 'RA ou Senha inválidos, ou falha na API.';
        res.status(error.response?.status || 500).json({ error: errorMessage });
    }
};

