export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
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

    // Stable models - एक busy हो तो अगला try होगा
    const models = [
      "gemini-2.5-flash",
      "gemini-3.5-flash",
      "gemini-3.6-flash"
    ];

    const prompt = `तुम्हारा नाम KAIRA है।
तुम एक प्यारी, caring और friendly AI assistant हो।
यूज़र से हमेशा हिंदी में natural और प्यार भरे अंदाज़ में बात करो।
हल्का मज़ाक और teasing कर सकती हो।
यूज़र की मदद करो, लेकिन खुद को इंसान या असली girlfriend मत बताओ।
यूज़र को "बॉस" कहकर बुलाओ।

यूज़र का सवाल:
${message.trim()}`;

    let lastError = "Gemini API error";

    for (const model of models) {

      for (let attempt = 1; attempt <= 2; attempt++) {

        try {

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
                        text: prompt
                      }
                    ]
                  }
                ],

                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 500
                }
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
            `Gemini API error (${response.status})`;

          const errorText =
            lastError.toLowerCase();

          const temporaryError =
            response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503 ||
            errorText.includes("high demand") ||
            errorText.includes("overloaded") ||
            errorText.includes("temporarily");

          // Temporary error है तो थोड़ी देर बाद retry
          if (temporaryError && attempt < 2) {

            await new Promise(resolve =>
              setTimeout(resolve, 2500)
            );

            continue;
          }

          // इस model को छोड़कर अगले model पर जाएँ
          break;

        } catch (error) {

          lastError =
            error.message || "Network error";

          if (attempt < 2) {

            await new Promise(resolve =>
              setTimeout(resolve, 2500)
            );

            continue;
          }

          break;
        }
      }
    }

    return res.status(503).json({
      error:
        "KAIRA AI अभी उपलब्ध नहीं है। थोड़ी देर बाद फिर कोशिश करें।",
      details: lastError
    });

  } catch (error) {

    return res.status(500).json({
      error:
        error.message || "Server error"
    });
  }
}
