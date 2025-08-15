const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função para limpar o HTML e extrair só o texto puro
function stripHtml(html){
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        console.log("--- INICIANDO /api/generate-essay (VERSÃO TURBINADA) ---");

        // Agora recebemos o objeto completo com os detalhes
        const { promptData } = req.body;
        if (!promptData || !promptData.taskContent) {
            return res.status(400).json({ error: 'Dados da proposta (promptData) são obrigatórios.' });
        }
        
        // Limpamos o HTML para mandar só texto para a IA
        const coletaneaEEnunciado = stripHtml(promptData.taskContent);
        const focoNoGenero = stripHtml(promptData.supportText);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // Prompt muito mais detalhado para a IA
        const fullPrompt = `
            Você é um estudante do 7º ano do ensino fundamental no Brasil, muito dedicado e criativo. Sua tarefa é escrever uma redação impecável seguindo estritamente as instruções e os textos de apoio fornecidos.

            **INSTRUÇÕES E TEXTOS DE APOIO (COLETÂNEA):**
            ---
            ${coletaneaEEnunciado}
            ---

            **REGRAS E DICAS SOBRE O GÊNERO TEXTUAL:**
            ---
            ${focoNoGenero}
            ---

            **SUA TAREFA:**
            Com base em TUDO o que foi apresentado acima, escreva a redação solicitada.
            - Siga todas as regras do enunciado (personagens, local, contratempo, etc.).
            - Use a terceira pessoa.
            - Mantenha a linguagem de um jovem de 12-13 anos, mas seguindo a norma culta do português.
            - Estruture o texto em parágrafos claros (introdução, desenvolvimento e conclusão).
            - Não escreva nada além da redação em si. Sem títulos, sem "Introdução:", apenas o texto corrido.
        `;

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const essayText = response.text();

        console.log("--- FIM /api/generate-essay: Redação de alta qualidade gerada! ---");
        res.status(200).json({ success: true, essay: essayText });

    } catch (error) {
        console.error("--- ERRO FATAL EM /api/generate-essay ---", error);
        res.status(500).json({ 
            error: 'Ocorreu um erro ao gerar a redação com a IA.', 
            details: error.message 
        });
    }
};
