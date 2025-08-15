const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        console.log("--- INICIANDO /api/get-essay-details ---");
        const { tokenB, taskId } = req.body;

        if (!tokenB || !taskId) {
            return res.status(400).json({ error: 'TokenB e taskId são obrigatórios.' });
        }

        // Este é o endpoint que descobrimos para pegar todos os detalhes da tarefa
        const apiUrl = `https://edusp-api.ip.tv/tms/task/${taskId}/apply/`;

        const response = await axios.get(apiUrl, {
            headers: {
                "x-api-key": tokenB,
                "Referer": "https://saladofuturo.educacao.sp.gov.br/"
            }
        });

        // Retornamos apenas os dados que nos interessam
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
