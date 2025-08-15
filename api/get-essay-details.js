const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        console.log("--- INICIANDO /api/get-essay-details ---");
        
        // Agora pedimos mais informações do frontend
        const { tokenB, taskId, answerId, publicationTarget } = req.body;

        if (!tokenB || !taskId || !publicationTarget) {
            return res.status(400).json({ error: 'TokenB, taskId e publicationTarget são obrigatórios.' });
        }

        // Montamos a URL base
        const baseUrl = `https://edusp-api.ip.tv/tms/task/${taskId}/apply/`;

        // Adicionamos os parâmetros obrigatórios
        const params = new URLSearchParams({
            preview_mode: 'false',
            room_name: publicationTarget
        });

        // O answerId é opcional, mas importante se a redação já começou
        if (answerId) {
            params.append('answer_id', answerId);
        }
        
        const finalUrl = `${baseUrl}?${params.toString()}`;
        console.log("URL Final para a API do Sala do Futuro:", finalUrl);

        const response = await axios.get(finalUrl, {
            headers: {
                "x-api-key": tokenB,
                "Referer": "https://saladofuturo.educacao.sp.gov.br/"
            }
        });

        const details = {
            taskContent: response.data.taskContent,
            supportText: response.data.supportText,
            assessedSkills: response.data.assessedSkills
        };

        console.log(`--- Detalhes da tarefa ${taskId} obtidos com sucesso ---`);
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
