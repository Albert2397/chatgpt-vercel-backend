export default async function handler(req, res) {
  // =========================
  // CORS
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // =========================
  // Input validation
  // =========================
  const { messages, image, model } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing or invalid messages" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  // =========================
  // Model selection
  // =========================
  const MODEL_TEXT = model || "gpt-4.1-mini";
  const MODEL_VISION = model || "gpt-4.1";

  // =========================
  // Build messages (multimodal)
  // =========================
  let finalMessages = messages;

  if (image) {
    // bierzemy OSTATNIA wiadomosc usera jako tekst + obraz
    const lastUserMessage =
      [...messages].reverse().find(m => m.role === "user")?.content ||
      "Opisz obraz.";

    finalMessages = [
      ...messages.slice(0, -1),
      {
        role: "user",
        content: [
          { type: "text", text: lastUserMessage },
          {
            type: "image_url",
            image_url: { url: image }
          }
        ]
      }
    ];
  }

  // =========================
  // OpenAI request
  // =========================
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: image ? MODEL_VISION : MODEL_TEXT,
        input: finalMessages,
        max_output_tokens: 2000
      })
    });

    const data = await response.json();

    // =========================
    // Error passthrough
    // =========================
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI API error",
        details: data
      });
    }

    // =========================
    // Normalize response to chat.completions-like format
    // (zeby frontend nie musial sie zmieniac)
    // =========================
    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

    const usage = data.usage || {};

    return res.status(200).json({
      choices: [
        {
          message: {
            role: "assistant",
            content: text
          }
        }
      ],
      usage: {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0
      }
    });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}
