const axios = require('axios');

async function fetchApiData(requestConfig) {
    try {
        const response = await axios(requestConfig);
        return response.data;
    } catch (error) {
        console.error(`Falha ao buscar dados de: ${requestConfig.url}`, error.message);
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
        console.log("ETAPA 1: Iniciando Login Principal...");
        const loginResponse = await axios.post(
            "https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken",
            { user, senha },
            { headers: { "Ocp-Apim-Subscription-Key": "2b03c1db3884488795f79c37c069381a" } }
        );
        console.log("SUCESSO: Login Principal OK.");

        const tokenA = loginResponse.data.token;
        const userInfo = loginResponse.data.DadosUsuario;

        if (!tokenA || !userInfo) {
            return res.status(401).json({ error: 'Credenciais inválidas ou resposta da API de login incompleta.' });
        }

        console.log("ETAPA 2: Iniciando Troca de Token...");
        const exchangeResponse = await axios.post(
            "https://edusp-api.ip.tv/registration/edusp/token",
            { token: tokenA },
            { 
                headers: { 
                    "Content-Type": "application/json",
                    // --- A CORREÇÃO ESTÁ AQUI ---
                    "x-api-realm": "edusp",
                    "x-api-platform": "webclient"
                } 
            }
        );
        console.log("SUCESSO: Troca de Token OK.");
        
        const tokenB = exchangeResponse.data.token;

        if (!tokenB) {
            return res.status(500).json({ error: 'Falha ao obter o token secundário (x-api-key).' });
        }
        
        console.log("ETAPA 3: Iniciando busca de dados em paralelo...");
        const codigoAluno = userInfo.CD_USUARIO;

        const requests = [
             fetchApiData({
                method: 'get',
                url: `https://sedintegracoes.educacao.sp.gov.br/apiboletim/api/Frequencia/GetFaltasBimestreAtual?codigoAluno=${codigoAluno}`,
                headers: { "Authorization": `Bearer ${tokenA}`, "Ocp-Apim-Subscription-Key": "a84380a41b144e0fa3d86cbc25027fe6" }
            }),
            fetchApiData({
                method: 'get',
                url: `https://edusp-api.ip.tv/tms/task/todo?expired_only=false&filter_expired=true&is_exam=false&with_answer=true`,
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

        const [faltas, tarefas, conquistas, notificacoes] = await Promise.all(requests);
        console.log("SUCESSO: Busca de dados concluída.");

        const dashboardData = {
            userInfo: { nome: userInfo.NOME },
            faltas: faltas || [],
            tarefas: tarefas || [],
            conquistas: conquistas || [],
            notificacoes: notificacoes || []
        };

        res.status(200).json(dashboardData);

    } catch (error) {
        console.error('ERRO GERAL NO PROCESSO:', error.response ? error.response.data : error.message);
        console.error('Objeto de erro completo:', error);
        return res.status(error.response?.status || 500).json({ error: 'RA ou Senha inválidos, ou falha em uma das APIs críticas.' });
    }
};

