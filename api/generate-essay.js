genAIenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function stripHtml(html){
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("A chave da API do Gemini não foi configurada no servidor.");
        }
        
        const { promptData } = req.body;
        if (!promptData || !promptData.taskContent) {
            return res.status(400).json({ error: 'Dados da proposta (promptData) são obrigatórios.' });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        
        // --- ETAPA 1: GERAR O CORPO DA REDAÇÃO ---
        const coletaneaEEnunciado = stripHtml(promptData.taskContent);
        const focoNoGenero = stripHtml(promptData.supportText);

        const bodyPrompt = `
            Você é um especialista encarregado de criar uma redação modelo (gabarito) para um estudante do 7º ano do ensino fundamental no Brasil.
            Analise a proposta completa abaixo e gere uma redação que siga TODAS as regras.
            PROPOSTA: """${coletaneaEEnunciado}"""
            INSTRUÇÕES DO GÊNERO: """${focoNoGenero}"""
            REDAÇÃO MODELO (GABARITO): Escreva a redação solicitada, mantendo a linguagem apropriada para um jovem de 12-13 anos, com excelente gramática e parágrafos claros. Não escreva nada além da redação em si.
        `;
        
        const bodyResult = await model.generateContent(bodyPrompt);
        const essayBody = bodyResult.response.text();

        // --- ETAPA 2: GERAR O TÍTULO PARA A REDAÇÃO CRIADA ---
        const titlePrompt = `
            Com base na redação abaixo, crie um título criativo, curto e impactante de no máximo 10 palavras.
            Responda APENAS com o título, sem aspas, sem "Título:" e sem nenhum outro texto.
            REDAÇÃO: """${essayBody}"""
        `;

        const titleResult = await model.generateContent(titlePrompt);
        let essayTitle = titleResult.response.text().trim();
        // Remove aspas se a IA as incluir por engano
        essayTitle = essayTitle.replace(/^"|"$/g, '');

        // Retorna AMBOS, o corpo e o título gerado
        res.status(200).json({ 
            success: true, 
            essayBody: essayBody, 
            essayTitle: essayTitle 
        });

    } catch (error) {
        console.error("--- ERRO FATAL EM /api/generate-essay ---", error);
        res.status(500).json({ 
            error: 'Ocorreu um erro ao gerar a redação com a IA.', 
            details: error.message 
        });
    }
};
