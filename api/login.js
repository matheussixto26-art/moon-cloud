const axios = require('axios');

const getEduspHeaders = (token) => ({
    'x-api-key': token,
    'x-client-domain': 'taskitos.cupiditys.lol',
    'origin': 'https://taskitos.cupiditys.lol',
    'referer': 'https://saladofuturo.educacao.sp.gov.br/',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36'
});

async function fetchApiData(requestConfig) {
    try {
        const response = await axios(requestConfig);
        return response.data;
    } catch (error) {
        console.error(`Falha em: ${requestConfig.url}.`);
        return null;
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { user, senha } = req.body;
    if (!user || !senha) return res.status(400).json({ error: 'RA e Senha são obrigatórios.' });

    try {
        const loginResponse = await axios.post("https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken", { user, senha }, { headers: { "Ocp-Apim-Subscription-Key": "2b03c1db3884488795f79c37c069381a" } });
        const tokenA = loginResponse.data.token;
        const userInfo = loginResponse.data.DadosUsuario;
        if (!tokenA || !userInfo) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const exchangeResponse = await axios.post("https://edusp-api.ip.tv/registration/edusp/token", { token: tokenA }, { headers: { "x-api-realm": "edusp", "x-api-platform": "webclient" } });
        const tokenB = exchangeResponse.data.auth_token;
        if (!tokenB) return res.status(500).json({ error: 'Falha ao obter token secundário.' });
        
        const roomUserData = await fetchApiData({ method: 'get', url: 'https://edusp-api.ip.tv/room/user?list_all=true', headers: getEduspHeaders(tokenB) });

        let publicationTargetsQuery = '';
        if (roomUserData && roomUserData.rooms) {
            const targets = roomUserData.rooms.flatMap(room => [room.publication_target, room.name, ...(room.group_categories?.map(g => g.id) || [])]);
            publicationTargetsQuery = [...new Set(targets)].map(target => `publication_target[]=${encodeURIComponent(target)}`).join('&');
        }

        const codigoAluno = userInfo.CD_USUARIO;
        const anoLetivo = new Date().getFullYear();
        const [raNumber, raDigit, raUf] = user.match(/^(\d+)(\d)(\w+)$/).slice(1);

        const requests = [
             fetchApiData({
                method: 'get',
                url: `https://sedintegracoes.educacao.sp.gov.br/apiboletim/api/Frequencia/GetFrequenciaAluno?anoLetivo=${anoLetivo}&codigoAluno=${codigoAluno}`,
                headers: { "Authorization": `Bearer ${tokenA}`, "Ocp-Apim-Subscription-Key": "a84380a41b144e0fa3d86cbc25027fe6" }
            }),
            fetchApiData({
                method: 'get',
                url: `https://edusp-api.ip.tv/tms/task/todo?expired_only=true&limit=100&${publicationTargetsQuery}`,
                headers: getEduspHeaders(tokenB)
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
            }),
            fetchApiData({
                 method: 'get',
                 url: `https://sedintegracoes.educacao.sp.gov.br/alunoapi/api/Aluno/ExibirAluno?inNumRA=${raNumber}&inDigitoRA=${raDigit}&inSiglaUFRA=${raUf}`,
                 headers: { "Authorization": `Bearer ${tokenA}`, "Ocp-Apim-Subscription-Key": "b141f65a88354e078a9d4fdb1df29867" }
            }),
            fetchApiData({
                method: 'get',
                url: `https://sedintegracoes.educacao.sp.gov.br/apiboletim/api/Fechamento/ConsultaFechamentoComparativo?codigoAluno=${codigoAluno}&anoLetivo=${anoLetivo}&somenteAtivo=0&tipoFechamento=5&codigoDisciplina=0`,
                headers: { "Authorization": `Bearer ${tokenA}`, "Ocp-Apim-Subscription-Key": "a84380a41b144e0fa3d86cbc25027fe6" }
            }),
            fetchApiData({
                method: 'get',
                url: `https://edusp-api.ip.tv/achievement/user/goal?limit=100&period=weekly&${publicationTargetsQuery}`,
                headers: getEduspHeaders(tokenB)
            })
        ];

        const [faltasData, tarefas, conquistas, notificacoes, dadosAluno, boletimData, medalhasSemanais] = await Promise.all(requests);
        
        if(dadosAluno?.aluno?.nome) {
            userInfo.NOME_COMPLETO = dadosAluno.aluno.nome;
            userInfo.NOME_ESCOLA = dadosAluno.aluno.nmEscola;
        }

        const dashboardData = {
            userInfo: userInfo,
            auth_token: tokenB,
            faltas: faltasData?.data?.disciplinas || [],
            tarefas: tarefas || [],
            conquistas: conquistas?.data || [],
            notificacoes: notificacoes || [],
            boletim: boletimData?.data || [],
            medalhasSemanais: medalhasSemanais || []
        };

        res.status(200).json(dashboardData);
    } catch (error) {
        const errorMessage = error.response?.data?.statusRetorno || 'RA ou Senha inválidos, ou falha na API.';
        res.status(error.response?.status || 500).json({ error: errorMessage });
    }
};

