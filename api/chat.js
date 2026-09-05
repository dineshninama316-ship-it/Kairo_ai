export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing"
      });
    }

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite"
    ];

    let lastError = "Gemini API error";

    for (const model of models) {

      for (let attempt = 1; attempt <= 2; attempt++) {

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: message
                    }
                  ]
                }
              ]
            })
          }
        );

        const data = await response.json();

        if (response.ok) {
          const reply =
            data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (reply) {
            return res.status(200).json({
              reply,
              model
            });
          }
        }

        lastError =
          data.error?.message ||
          "Gemini API error";

        // Retry on temporary overload/rate limit
        if (
          response.status === 429 ||
          response.status === 503 ||
          lastError.toLowerCase().includes("high demand")
        ) {
          await new Promise(resolve =>
            setTimeout(resolve, attempt * 1500)
          );

          continue;
        }

        break;
      }
    }

    return res.status(503).json({
      error:
        "KAIRO AI अभी busy है। थोड़ी देर बाद फिर कोशिश करें।",
      details: lastError
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
                        }
