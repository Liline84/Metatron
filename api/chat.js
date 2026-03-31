const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Accès Refusé');
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // On utilise Gemini 1.5 Flash : ultra rapide et connecté
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        // C'EST ICI QU'ON LUI DONNE ACCÈS AU WEB
        tools: [
            { googleSearch: {} }
        ]
    });

    const prompt = req.body.message;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lien neural rompu. Interférence réseau détectée." });
  }
};
