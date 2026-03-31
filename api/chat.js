const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk"); // Assure-toi de faire : npm install groq-sdk

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Refusé');

  const prompt = req.body.message;

  // --- TENTATIVE 1 : GEMINI (IA Principale) ---
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return res.status(200).json({ text: response.text() });

  } catch (error) {
    console.warn("Gemini a échoué, basculement sur le système de secours...");
    
    // --- TENTATIVE 2 : GROQ (IA de Secours) ---
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192", // Très rapide
      });

      const text = chatCompletion.choices[0]?.message?.content;
      return res.status(200).json({ text: text });

    } catch (secondError) {
      console.error("Toutes les IA ont échoué :", secondError);
      return res.status(500).json({ error: "Tous les systèmes sont indisponibles pour le moment." });
    }
  }
};
