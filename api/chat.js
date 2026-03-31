const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Le modèle Flash est parfait pour un chat réactif
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        tools: [
            { googleSearch: {} }
        ]
    });

    const prompt = req.body.message;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Le message est vide.' });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ text });
    
  } catch (error) {
    console.error("Erreur API Gemini:", error);
    res.status(500).json({ error: "Désolé, je rencontre des problèmes de connexion en ce moment." });
  }
};
