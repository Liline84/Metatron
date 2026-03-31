const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const OpenAI = require("openai");
const { HfInference } = require("@huggingface/inference");

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Refusé');
  const prompt = req.body.message;

  // 1. TENTATIVE GEMINI
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return res.status(200).json({ text: (await result.response).text() });
  } catch (e) {
    console.warn("Gemini KO, passage à Groq...");
  }

  // 2. TENTATIVE GROQ
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const chat = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
    });
    return res.status(200).json({ text: chat.choices[0]?.message?.content });
  } catch (e) {
    console.warn("Groq KO, passage à OpenAI...");
  }

  // 3. TENTATIVE OPENAI
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return res.status(200).json({ text: response.choices[0].message.content });
  } catch (e) {
    console.warn("OpenAI KO, passage à Hugging Face...");
  }

  // 4. TENTATIVE HUGGING FACE (Dernier rempart)
  try {
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    const out = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
    });
    return res.status(200).json({ text: out.generated_text });
  } catch (e) {
    return res.status(500).json({ error: "Désolé, tous les serveurs IA sont saturés." });
  }
};
