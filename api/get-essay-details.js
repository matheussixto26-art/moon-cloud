const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }
    try {
        const { tokenB, taskId, answerId, publicationTarget } = req.body;
        if (!tokenB || !taskId || !publicationTarget) {
            return res.status(400).json({ error: 'Dados essenciais estão faltando.' });
        }

        const baseUrl = `https://edusp-api.ip.tv/tms/task/${taskId}/apply/`;
        const params = new URLSearchParams({
            preview_mode: 'false',
            room_name: publicationTarget
        });
        if (answerId) {
            params.append('answer_id', answerId);
        }
        
        const finalUrl = `${baseUrl}?${params.toString()}`;
        const response = await axios.get(finalUrl, {
            headers: { "x-api-key": tokenB, "Referer": "https://saladofuturo.educacao.sp.gov.br/" }
        });

        // AQUI ESTÁ A LÓGICA FINAL CORRETA
        const questionData = response.data?.questions?.[0];
        if (!questionData) {
            throw new Error("A resposta da API de detalhes não continha a estrutura 'questions' esperada.");
        }

        // Monta um objeto limpo para o frontend
        const details = {
            taskContent: questionData.statement,
            supportText: questionData.options?.support_text,
            questionId: questionData.id
        };

        res.status(200).json(details);
    } catch (error) {
        const errorData = error.response?.data;
        console.error("--- ERRO FATAL EM /api/get-essay-details ---", errorData || error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Ocorreu um erro ao buscar os detalhes da redação.', 
            details: errorData || { message: error.message }
        });
    }
};
