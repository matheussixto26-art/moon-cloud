const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const getEduspHeaders = (token) => ({
    'x-api-key': token,
    'x-client-domain': 'taskitos.cupiditys.lol',
    'origin': 'https://taskitos.cupiditys.lol',
    'referer': 'https://saladofuturo.educacao.sp.gov.br/',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36'
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { type, taskId, token, room, answers, prompt, geminiApiKey } = req.body;
    if (!type || !token) return res.status(400).json({ error: 'Parâmetros insuficientes.' });
    
    let url, payload;
    if (type === 'preview') {
        if (!taskId || !room) return res.status(400).json({ error: 'taskId e room são necessários.' });
        url = 'https://edusp-api.ip.tv/tms/task/preview';
        payload = { task_id: taskId, publication_target: room };
    } else if (type === 'submit') {
        if (!taskId || !room || !answers) return res.status(400).json({ error: 'Dados insuficientes para enviar.' });
        url = 'https://edusp-api.ip.tv/tms/answer';
        payload = { task_id: taskId, publication_target: room, status: 'submitted', answers: answers };
    } else if (type === 'generate_essay') {
        if (!prompt || !geminiApiKey) return res.status(400).json({ error: 'Prompt e chave da API Gemini são necessários.' });
        try {
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
            const result = await model.generateContent(prompt);
            return res.status(200).json({ text: result.response.text() });
        } catch (error) {
            return res.status(500).json({ error: 'Falha ao gerar texto com a IA.' });
        }
    } else {
        return res.status(400).json({ error: 'Tipo de ação inválido.' });
    }

    try {
        const response = await axios.post(url, payload, { headers: getEduspHeaders(token) });
        return res.status(200).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: `Falha na API de tarefa: ${type}` });
    }
};
                
