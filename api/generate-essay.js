const { GoogleGenerativeAI } = require("@google/generative-ai");

// ##################################################################
// # !!! COLE SUA CHAVE DA API DO GEMINI AQUI DENTRO DAS ASPAS !!!   #
// ##################################################################
const apiKey = "[AIzaSyBlB-LMuBI_TpDiKqCjO1zL-KeOjnexODQ]"; 
// CUIDADO: Se seu repositório no GitHub for público, a chave ficará visível!
// ##################################################################


// Verificação para garantir que a chave foi inserida
if (!apiKey || apiKey === "[COLE_SUA_CHAVE_API_AQUI]") {
    throw new Error("A chave da API do Gemini não foi inserida no código. Edite o arquivo api/generate-essay.js.");
}

const genAI = new GoogleGenerativeAI(apiKey);

function stripHtml(html){
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const { promptData } = req.body;
        if (!promptData || !promptData.taskContent) {
            return res.status(400).json({ error: 'Dados da proposta (promptData) são obrigatórios.' });
        }
        
        const coletaneaEEnunciado = stripHtml(promptData.taskContent);
        const focoNoGenero = stripHtml(promptData.supportText);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const fullPrompt = `
            Você é um especialista encarregado de criar uma redação modelo (gabarito) para um estudante do 7º ano do ensino fundamental no Brasil.
            Analise a proposta completa, incluindo a coletânea e as instruções sobre o gênero textual.
            Sua tarefa é gerar uma redação que siga TODAS as regras e se inspire nos textos de apoio.

            **PROPOSTA COMPLETA (PRÉVIA):**
            ---
            ${coletaneaEEnunciado}
            ---

            **INSTRUÇÕES DO GÊNERO:**
            ---
            ${focoNoGenero}
            ---

            **REDAÇÃO MODELO (GABARITO):**
            Com base em TUDO o que foi apresentado acima, escreva a redação.
            - Siga estritamente todas as regras do enunciado.
            - Mantenha a linguagem apropriada para um jovem de 12-13 anos, mas com excelente gramática e estrutura.
            - O texto deve ser escrito em parágrafos claros, sem títulos como "Introdução".
        `;
        
        const result = await model.generateContent(fullPrompt);
        const essayText = result.response.text();

        res.status(200).json({ success: true, essay: essayText });

    } catch (error) {
        console.error("--- ERRO FATAL EM /api/generate-essay ---", error);
        res.status(500).json({ 
            error: 'Ocorreu um erro ao gerar a redação com a IA.', 
            details: error.message 
        });
    }
};
