export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const { message, image } = req.body || {};

        if (
            (!message || !message.trim()) &&
            !image
        ) {
            return res.status(400).json({
                error: "Message or image is required"
            });
        }

        const apiKey =
            process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is missing"
            });
        }

        const model = "gemini-3.6-flash";

        const visionMode = !!image;

        const text = message?.trim() || "";

        /* =========================
           PROMPT
        ========================= */

        const prompt = visionMode
            ? `
तुम्हारा नाम KAIRA है।

यूज़र तुम्हें camera या screen की तस्वीर दिखा रहा है।

यूज़र को "बॉस" कहकर बुलाओ।

तस्वीर को ध्यान से देखकर सिर्फ वही बताओ
जो वास्तव में दिखाई दे रहा है।

बिना evidence के अनुमान मत लगाओ।

अगर object, text, document या chart दिखाई दे
तो उसे समझाओ।

अगर trading chart दिखाई दे तो visible trend,
support, resistance और technical observations
बताओ।

Guaranteed profit या निश्चित भविष्यवाणी मत करो।

जवाब छोटा और सरल हिंदी में दो।

यूज़र का सवाल:

${text || "इस तस्वीर में क्या दिखाई दे रहा है?"}
`
            : `
तुम्हारा नाम KAIRA है।

तुम एक intelligent और friendly AI assistant हो।

यूज़र को "बॉस" कहकर बुलाओ।

सरल और natural हिंदी में जवाब दो।

जवाब सीधा और उपयोगी रखो।

अनावश्यक लंबा जवाब मत दो।

अगर current information उपलब्ध नहीं है तो
उसे निश्चित तथ्य की तरह मत बताओ।

Trading में analysis दो लेकिन guaranteed profit
का दावा मत करो।

यूज़र का सवाल:

${text}
`;

        /* =========================
           PARTS
        ========================= */

        const parts = [
            {
                text: prompt
            }
        ];

        /* =========================
           IMAGE
        ========================= */

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

        /* =========================
           REQUEST BODY
        ========================= */

        const requestBody = {

            contents: [
                {
                    role: "user",
                    parts: parts
                }
            ],

            generationConfig: {
                maxOutputTokens:
                    visionMode ? 450 : 500
            }
        };

        /* =========================
           GEMINI FUNCTION
        ========================= */

        async function callGemini() {

            return await fetch(

                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,

                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey
                    },

                    body: JSON.stringify(requestBody)
                }

            );
        }

        /* =========================
           FIRST REQUEST
        ========================= */

        let response = await callGemini();

        /* =========================
           RETRY 429
        ========================= */

        if (response.status === 429) {

            console.log(
                "Gemini 429 detected. Waiting before retry..."
            );

            await new Promise(
                resolve => setTimeout(resolve, 3000)
            );

            response = await callGemini();
        }

        /* =========================
           RESPONSE DATA
        ========================= */

        const data = await response.json();

        /* =========================
           ERROR
        ========================= */

        if (!response.ok) {

            console.error(
                "Gemini Error:",
                data
            );

            const errorMessage =
                data.error?.message ||
                "Gemini API error";

            if (response.status === 429) {

                return res.status(429).json({

                    error:
                        "बॉस, Gemini अभी requests स्वीकार नहीं कर रहा है। थोड़ी देर बाद फिर कोशिश करें।",

                    quotaExceeded: true,

                    vision: visionMode,

                    status: "rate_limited"

                });
            }

            if (response.status === 503) {

                return res.status(503).json({

                    error:
                        "बॉस, Gemini server अभी busy है। थोड़ी देर बाद फिर कोशिश करें।",

                    vision: visionMode,

                    status: "server_busy"

                });
            }

            return res.status(
                response.status
            ).json({

                error: errorMessage,

                vision: visionMode,

                status: "error"

            });
        }

        /* =========================
           GET REPLY
        ========================= */

        const reply =
            data
                .candidates?.[0]
                ?.content?.parts
                ?.map(
                    part => part.text || ""
                )
                .join("")
                .trim();

        if (!reply) {

            return res.status(500).json({

                error:
                    "बॉस, KAIRA को जवाब नहीं मिला।",

                status: "empty_response"

            });
        }

        /* =========================
           SUCCESS
        ========================= */

        return res.status(200).json({

            reply: reply,

            vision: visionMode,

            model: model,

            status: "ok"

        });

    } catch (error) {

        console.error(
            "Server Error:",
            error
        );

        return res.status(500).json({

            error:
                "बॉस, KAIRA server में समस्या आ गई। थोड़ी देर बाद फिर कोशिश करें।",

            status: "server_error"

        });
    }
}
