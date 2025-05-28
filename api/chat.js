export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, image } = req.body;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };

  try {
    let content;

    if (image) {
      content = [
        {
          type: "text",
          text: messages?.[0]?.content || "Co jest na obrazku?",
        },
        {
          type: "image_url",
          image_url: {
            url: image, // base64 jako data:image/png;base64,...
          },
        },
      ];
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: image ? "gpt-4-turbo" : "gpt-3.5-turbo",
        messages: image
          ? [{ role: "user", content }]
          : messages,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
