const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const { tokenB, taskId, essayText, essayTitle } = req.body;

        if (!tokenB || !taskId || !essayText) {
            return res.status(400).json({ error: 'TokenB, taskId e essayText são obrigatórios.' });
        }
        
        // Usando o endpoint que já confirmamos que salva como rascunho
        const apiUrl = `https://edusp-api.ip.tv/tms/task/${taskId}/essay-check`;

        const payload = {
            title: essayTitle || "",
            body: essayText
        };
        
        const response = await axios.post(apiUrl, payload, {
            headers: {
                "x-api-key": tokenB,
                "Content-Type": "application/json",
                "Referer": "https://saladofuturo.educacao.sp.gov.br/"
            }
        });

        res.status(200).json({ success: true, message: "Rascunho salvo com sucesso!", data: response.data });

    } catch (error) {
        const errorData = error.response?.data;
        console.error("--- ERRO FATAL EM /api/submit-essay ---", errorData || error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Ocorreu um erro no servidor ao salvar a redação.', 
            details: errorData || { message: error.message }
        });
    }
};
