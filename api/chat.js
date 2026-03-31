const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");

// Fonction utilitaire pour créer un timeout
const timeoutPromise = (ms) => new Promise((_, reject) => {
    setTimeout(() => reject(new Error("TIMEOUT")), ms);
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const prompt = req.body?.message;
  
  // Sécurité supplémentaire : Limiter la taille du prompt
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: "Le message est invalide ou vide." });
  }
  if (prompt.length > 2000) {
    return res.status(400).json({ error: "Message trop long. Limite de 2000 caractères dépassée." });
  }

  // --- 1. TENTATIVE PRINCIPALE : GEMINI (avec Timeout de 8 secondes) ---
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("Clé Gemini manquante");
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        tools: [{ googleSearch: {} }] 
    });
    
    // On fait une course (race) entre la réponse de l'API et un timeout de 8 secondes
    const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise(8000)
    ]);
    
    // Vérification stricte du retour Gemini
    if (result && result.response && typeof result.response.text === 'function') {
        const text = result.response.text();
        return res.status(200).json({ text });
    } else {
        throw new Error("Format de réponse Gemini inattendu");
    }
    
  } catch (error) {
    console.error(`[Avertissement] Échec Gemini (${error.message}). Bascule sur Groq...`);
  }

  // --- 2. TENTATIVE DE SECOURS : GROQ ---
  try {
    if (!process.env.GROQ_API_KEY) throw new Error("Clé Groq manquante");
    
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Timeout de 6 secondes pour Groq
    const chat = await Promise.race([
        groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama3-8b-8192", 
        }),
        timeoutPromise(6000)
    ]);
    
    // Vérification robuste suggérée
    if (!chat || !chat.choices || chat.choices.length === 0 || !chat.choices[0]?.message?.content) {
        throw new Error("Réponse Groq vide ou mal formatée");
    }

    return res.status(200).json({ text: chat.choices[0].message.content });
    
  } catch (error) {
    console.error(`[Erreur Critique] Échec Groq (${error.message}).`);
  }

  // --- 3. ÉCHEC TOTAL ---
  return res.status(500).json({ 
    error: "Les serveurs cognitifs sont actuellement surchargés. Veuillez patienter un instant." 
  });
};
