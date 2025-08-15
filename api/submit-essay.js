const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        console.log("--- INICIANDO /api/submit-essay ---");

        // Pegamos os dados necessários. Não precisamos mais de answerId ou questionId!
        const { tokenB, taskId, essayText, essayTitle } = req.body;

        if (!tokenB || !taskId || !essayText) {
            return res.status(400).json({ error: 'TokenB, taskId e essayText são obrigatórios.' });
        }
        
        // URL final e correta, com o ID da tarefa
        const apiUrl = `https://edusp-api.ip.tv/tms/task/${taskId}/essay-check`;

        // Payload final e correto, muito mais simples
        const payload = {
            title: essayTitle || "", // O título é opcional
            body: essayText
        };
        
        console.log(`Enviando redação para a tarefa ${taskId}. Método: POST`);
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const response = await axios.post(apiUrl, payload, {
            headers: {
                "x-api-key": tokenB,
                "Content-Type": "application/json",
                "Referer": "https://saladofuturo.educacao.sp.gov.br/"
            }
        });

        console.log("--- FIM /api/submit-essay: Sucesso ---");
        res.status(200).json({ success: true, message: "Redação salva com sucesso!", data: response.data });

    } catch (error) {
        const errorData = error.response?.data;
        console.error("--- ERRO FATAL NA FUNÇÃO /api/submit-essay ---", errorData || error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Ocorreu um erro no servidor ao enviar a redação.', 
            details: errorData || { message: error.message }
        });
    }
};
          
