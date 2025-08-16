const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const { tokenB, taskId, answerId, publicationTarget } = req.body;

        if (!tokenB || !taskId || !publicationTarget) {
            return res.status(400).json({ error: 'TokenB, taskId e publicationTarget são obrigatórios.' });
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
            headers: {
                "x-api-key": tokenB,
                "Referer": "https://saladofuturo.educacao.sp.gov.br/"
            }
        });

        // Simplesmente retorna a resposta COMPLETA e bruta do servidor
        res.status(200).json(response.data);

    } catch (error) {
        const errorData = error.response?.data;
        console.error("--- ERRO FATAL EM /api/get-essay-details ---", errorData || error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Ocorreu um erro ao buscar os detalhes da redação.', 
            details: errorData || { message: error.message }
        });
    }
};
