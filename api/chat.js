export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode refusée" });
  }

  const prompt = req.body?.message;

  if (!prompt) {
    return res.status(400).json({ error: "Message vide" });
  }

  // 🔒 limite simple anti-spam
  if (prompt.length > 1000) {
    return res.status(400).json({ error: "Message trop long" });
  }

  // 🧠 GPT (OpenRouter)
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: text })
});

const data = await res.json();
    const data = await r.json();

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json({
        text: data.choices[0].message.content
      });
    }

  } catch (e) {
    console.log("GPT KO", e.message);
  }

  // 🤖 HuggingFace fallback
  try {
    const r = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    const data = await r.json();

    return res.status(200).json({
      text: data[0]?.generated_text || "Réponse vide"
    });

  } catch (e) {
    console.log("HF KO", e.message);
  }

  return res.status(500).json({
    error: "Tous les modèles sont indisponibles"
  });
          }
