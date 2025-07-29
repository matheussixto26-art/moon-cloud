const axios = require('axios');

// Handler da Serverless Function (padrão da Vercel)
export default async function handler(req, res) {
    // Permite que apenas requisições POST passem
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { user, senha } = req.body;

    if (!user || !senha) {
        return res.status(400).json({ error: 'RA e Senha são obrigatórios.' });
    }

    // --- Passo 1: Fazer o Login na API da SED e Obter o Token ---
    const loginUrl = "https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken";
    const loginHeaders = {
        "Ocp-Apim-Subscription-Key": "2b03c1db3884488795f79c37c069381a",
        "Content-Type": "application/json",
    };
    const loginPayload = { user, senha };

    try {
        const loginResponse = await axios.post(loginUrl, loginPayload, { headers: loginHeaders });
        
        const token = loginResponse.data.token;
        const codigoAluno = loginResponse.data.codigoAluno;

        if (!token || !codigoAluno) {
            return res.status(401).json({ error: 'Credenciais inválidas ou resposta da API incompleta.' });
        }

        // --- Passo 2: Buscar as Turmas usando o Token ---
        const turmasUrl = `https://sedintegracoes.educacao.sp.gov.br/apihubintegracoes/api/v2/Turma/ListarTurmasPorAluno?codigoAluno=${codigoAluno}`;
        const apiHeaders = {
            "Ocp-Apim-Subscription-Key": "5936fddda3484fe1aa4436df1bd76dab",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json, text/plain, */*"
        };

        const turmasResponse = await axios.get(turmasUrl, { headers: apiHeaders });
        
        // Retorna os dados das turmas para o frontend
        return res.status(200).json(turmasResponse.data);

    } catch (error) {
        console.error('Erro na chamada da API externa:', error.response ? error.response.data : error.message);
        
        if (error.response) {
            const statusCode = error.response.status;
            let errorMessage = 'Erro ao se comunicar com os servidores da SED.';
            if (statusCode === 401) {
                errorMessage = 'RA ou Senha inválidos. Verifique suas credenciais.';
            }
            return res.status(statusCode).json({ error: errorMessage });
        }

        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
              }
