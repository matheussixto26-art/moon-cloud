const axios = require('axios');

const getEduspHeaders = (token) => ({
    'x-api-key': token,
    'x-client-domain': 'taskitos.cupiditys.lol',
    'origin': 'https://taskitos.cupiditys.lol',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36'
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const { token, targets } = req.body;
    if (!token || !targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: 'Token e uma lista de "targets" são necessários.' });
    }

    if (targets.length === 0) {
        return res.status(200).json([]); // Se não houver alvos, retorna uma lista vazia.
    }

    try {
        const publicationTargets = targets.map(target => `publication_target[]=${encodeURIComponent(target)}`).join('&');
        const urlTarefas = `https://edusp-api.ip.tv/tms/task/todo?expired_only=false&is_essay=false&is_exam=false&answer_statuses=draft&answer_statuses=pending&with_answer=true&with_apply_moment=true&limit=100&filter_expired=true&offset=0&${publicationTargets}`;

        const tarefasResponse = await axios.get(urlTarefas, { 
            headers: getEduspHeaders(token) 
        });

        res.status(200).json(tarefasResponse.data);

    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        res.status(error.response?.status || 500).json({ error: 'Falha ao buscar tarefas.', details: errorDetails });
    }
};
