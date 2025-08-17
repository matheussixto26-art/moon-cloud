const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        // Agora precisamos de mais dados do frontend
        const { tokenB, taskId, answerId, questionId, essayText, essayTitle, executedOn } = req.body;

        if (!tokenB || !taskId || !answerId || !questionId || !essayText || !executedOn) {
            return res.status(400).json({ error: 'Dados insuficientes para salvar o rascunho.' });
        }
        
        // A URL final e correta para ATUALIZAR um rascunho
        const apiUrl = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}`;

        // O Payload final e correto, exatamente como você capturou
        const payload = {
            status: "draft",
            answers: {
                [questionId]: {
                    question_id: parseInt(questionId, 10),
                    question_type: "essay",
                    answer: {
                        title: essayTitle,
                        body: essayText
                    }
                }
            },
            accessed_on: "room",
            executed_on: executedOn,
            duration: Math.floor(Math.random() * 5000) + 1000 // Simula uma duração aleatória
        };
        
        console.log(`Atualizando rascunho em ${apiUrl} com o método PUT.`);

        const response = await axios.put(apiUrl, payload, {
            headers: {
                "x-api-key": tokenB,
                "Content-Type": "application/json",
                "Referer": "https://saladofuturo.educacao.sp.gov.br/",
                "x-api-realm": "edusp",
                "x-api-platform": "webclient"
            }
        });

        res.status(200).json({ success: true, message: "Rascunho atualizado com sucesso no método correto!", data: response.data });

    } catch (error) {
        const errorData = error.response?.data;
        console.error("--- ERRO FATAL EM /api/submit-essay ---", errorData || error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Ocorreu um erro no servidor ao salvar o rascunho.', 
            details: errorData || { message: error.message }
        });
    }
};
                    
