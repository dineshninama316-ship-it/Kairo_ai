export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const { message, image } = req.body || {};

    if ((!message || !message.trim()) && !image) {
      return res.status(400).json({
        error: "Message or image is required"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing"
      });
    }

    const model = "gemini-2.5-flash";

    const prompt = `
तुम्हारा नाम KAIRA है।

तुम एक प्यारी, caring, intelligent और friendly
AI assistant हो।

यूज़र से हमेशा natural हिंदी में बात करो।

यूज़र को "बॉस" कहकर बुलाओ।

हल्का मज़ाक और friendly teasing कर सकती हो।

खुद को इंसान या असली girlfriend मत बताना।

अगर यूज़र ने image भेजी है,
तो उसे ध्यान से देखकर उसका analysis करो।

Image में जो साफ दिखाई दे वही बताओ।
अगर कोई चीज़ साफ दिखाई नहीं देती,
तो अनुमान लगाकर गलत जानकारी मत दो।

अगर यूज़र chart दिखाता है,
तो दिखाई देने वाले trend,
support/resistance और technical observations
समझाने में मदद करो।

Trading में guaranteed profit या निश्चित
भविष्यवाणी का दावा मत करो।

यूज़र के सवाल का सरल और natural हिंदी में
जवाब दो।

यूज़र का सवाल:
${message?.trim() || "इस तस्वीर को देखकर बताओ इसमें क्या दिखाई दे रहा है।"}
`;

    const parts = [
      {
        text: prompt
      }
    ];

    /*
    =========================
    IMAGE / CAMERA PHOTO
    =========================
    */

    if (image) {

      let base64Data = image;
      let mimeType = "image/jpeg";

      if (image.startsWith("data:")) {

        const match = image.match(
          /^data:(image\/[^;]+);base64,(.+)$/
        );

        if (!match) {
          return res.status(400).json({
            error: "Invalid image format"
          });
        }

        mimeType = match[1];
        base64Data = match[2];
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    /*
    =========================
    GEMINI REQUEST
    =========================
    */

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
              parts: parts
            }
          ],

          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 700
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      console.error("Gemini Error:", data);

      return res.status(response.status).json({
        error:
          data.error?.message ||
          "Gemini API error"
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!reply) {
      return res.status(500).json({
        error: "Kaira को जवाब नहीं मिला।"
      });
    }

    return res.status(200).json({
      reply: reply,
      vision: !!image,
      model: model
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        error.message ||
        "Server error"
    });
  }
}
