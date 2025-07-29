const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { user, senha } = req.body;

    if (!user || !senha) {
        return res.status(400).json({ error: 'RA e Senha são obrigatórios.' });
    }

    try {
        const loginResponse = await axios.post(
            "https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken",
            { user, senha },
            {
                headers: {
                    "Ocp-Apim-Subscription-Key": "2b03c1db3884488795f79c37c069381a",
                    "Content-Type": "application/json",
                }
            }
        );

        // ======================= LINHA DE DEBATE =======================
        // A linha abaixo irá "imprimir" a resposta completa da SED nos logs da Vercel
        console.log('RESPOSTA COMPLETA DA API DA SED:', JSON.stringify(loginResponse.data, null, 2));
        // =============================================================

        const token = loginResponse.data.token;
        const codigoAluno = loginResponse.data.codigoAluno;

        if (!token || !codigoAluno) {
            // Agora retornamos a mensagem da API, se houver uma.
            const apiMessage = loginResponse.data.message || 'Token ou Código do Aluno não retornados pela API.';
            return res.status(401).json({ error: `Credenciais rejeitadas. (Detalhe: ${apiMessage})` });
        }
        
        // Se o login for bem-sucedido, continuamos normalmente
        const turmasResponse = await axios.get(
            `https://sedintegracoes.educacao.sp.gov.br/apihubintegracoes/api/v2/Turma/ListarTurmasPorAluno?codigoAluno=${codigoAluno}`,
            {
                headers: {
                    "Ocp-Apim-Subscription-Key": "5936fddda3484fe1aa4436df1bd76dab",
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json",
                }
            }
        );

        return res.status(200).json(turmasResponse.data);

    } catch (error) {
        console.error('ERRO NA CHAMADA AXIOS:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ error: 'RA ou Senha inválidos (Erro 401).' });
        }

        return res.status(502).json({ error: 'Ocorreu um erro ao se comunicar com os servidores da educação.' });
    }
};
