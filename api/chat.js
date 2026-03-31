const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const OpenAI = require("openai");
const { HfInference } = require("@huggingface/inference");

module.exports = async (req, res) => {
  // Sécurité méthode
  if (req.method !== 'POST') return res.status(405).send('Refusé');

  // Point 2 & 8 : Sécurisation du message reçu
  const prompt = req.body?.message;
  console.log("Message reçu pour Metatron:", prompt);

  if (!prompt) {
    return res.status(400).json({ error: "Le message est vide ou mal formaté." });
  }

  // --- 1. TENTATIVE GEMINI (Principal) ---
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("Clé Gemini manquante");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const text = result.response.text(); // Point 3 : Correction de l'appel texte
    return res.status(200).json({ text });
  } catch (e) {
    console.error("Gemini KO:", e.message); // Point 7 : Debug
  }

  // --- 2. TENTATIVE GROQ (Rapide) ---
  try {
    if (!process.env.GROQ_API_KEY) throw new Error("Clé Groq manquante");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const chat = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
    });
    const text = chat.choices[0]?.message?.content;
    if (text) return res.status(200).json({ text });
  } catch (e) {
    console.error("Groq KO:", e.message);
  }

  // --- 3. TENTATIVE OPENAI (Précis) ---
  try {
    if (!process.env.OPENAI_API_KEY) throw new Error("Clé OpenAI manquante");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return res.status(200).json({ text: response.choices[0].message.content });
  } catch (e) {
    console.error("OpenAI KO:", e.message);
  }

  // --- 4. TENTATIVE HUGGING FACE (Secours) ---
  try {
    if (!process.env.HUGGINGFACE_API_KEY) throw new Error("Clé HF manquante");
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    const out = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
    });
    // Point 5 : Sécurisation de la réponse HF
    const text = out.generated_text || out[0]?.generated_text;
    if (text) return res.status(200).json({ text });
  } catch (e) {
    console.error("HuggingFace KO:", e.message);
  }

  // Point 1 : Réponse finale si tout a échoué
  return res.status(500).json({ 
    error: "Désolé, tous les serveurs IA sont indisponibles. Vérifiez vos clés API dans Vercel." 
  });
};
