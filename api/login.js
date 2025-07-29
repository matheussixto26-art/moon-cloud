import axios from 'axios';

// Função Serverless da Vercel
export default async function handler(req, res) {
    // 1. Aceitar apenas requisições POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { user, senha } = req.body;

    // 2. Validar se os dados foram recebidos
    if (!user || !senha) {
        return res.status(400).json({ error: 'RA e Senha são obrigatórios.' });
    }

    // 3. Bloco TRY/CATCH para lidar com erros externos
    try {
        // --- ETAPA 1: Autenticação para obter o Token ---
        const loginResponse = await axios.post(
            "https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken",
            { user, senha }, // Payload da requisição
            {
                headers: {
                    "Ocp-Apim-Subscription-Key": "2b03c1db3884488795f79c37c069381a",
                    "Content-Type": "application/json",
                }
            }
        );

        const token = loginResponse.data.token;
        const codigoAluno = loginResponse.data.codigoAluno;

        if (!token || !codigoAluno) {
            return res.status(401).json({ error: 'Token ou Código do Aluno não retornados pela API. Verifique as credenciais.' });
        }

        // --- ETAPA 2: Usar o Token para buscar dados do Aluno (Turmas) ---
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

        // 4. Se tudo deu certo, retornar os dados das turmas
        return res.status(200).json(turmasResponse.data);

    } catch (error) {
        // 5. Se qualquer chamada falhar, capturar o erro e retornar uma resposta JSON amigável
        console.error('ERRO NA API DA SED:', error.response ? error.response.data : error.message);
        
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ error: 'RA ou Senha inválidos.' });
        }

        return res.status(502).json({ error: 'Ocorreu um erro ao se comunicar com os servidores da educação. Tente novamente mais tarde.' });
    }
}
