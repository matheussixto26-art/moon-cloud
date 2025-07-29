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

        // ======================= CORREÇÃO FINAL =======================
        // Pegando o token e o código do aluno nos lugares corretos, conforme a resposta da API
        const token = loginResponse.data.token;
        const codigoAluno = loginResponse.data.DadosUsuario.CD_USUARIO;
        // =============================================================

        if (!token || !codigoAluno) {
            return res.status(401).json({ error: 'Credenciais inválidas. A API não retornou os dados esperados.' });
        }
        
        // Se o login foi bem-sucedido, buscamos as turmas
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
