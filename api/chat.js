export default async function handler(req, res) {

    /* =========================
       METHOD CHECK
    ========================= */

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        /* =========================
           REQUEST DATA
        ========================= */

        const {
            message,
            image
        } = req.body || {};

        if (
            (!message || !message.trim()) &&
            !image
        ) {
            return res.status(400).json({
                error: "Message or image is required"
            });
        }


        /* =========================
           API KEY
        ========================= */

        const apiKey =
            process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is missing"
            });
        }


        /* =========================
           MODEL
        ========================= */

        const model =
            "gemini-3.6-flash";


        /* =========================
           VISION MODE
        ========================= */

        const visionMode =
            !!image;


        /* =========================
           SMART PROMPT
        ========================= */

        const prompt = visionMode
            ? `
तुम्हारा नाम KAIRA है।

यूज़र तुम्हें camera से वर्तमान तस्वीर दिखा रहा है।

यूज़र को "बॉस" कहकर बुलाओ।

तस्वीर को ध्यान से देखो और सिर्फ वही बताओ
जो वास्तव में दिखाई दे रहा है।

बिना evidence के अनुमान मत लगाओ।

अगर व्यक्ति दिखाई दे तो उसके दिखाई देने वाले
features या surroundings का वर्णन करो।

अगर object दिखाई दे तो उसे पहचानने और समझाने
की कोशिश करो।

अगर text दिखाई दे तो उसे पढ़कर समझाओ।

अगर document दिखाई दे तो visible information
समझाओ।

अगर trading chart दिखाई दे तो visible trend,
support, resistance और technical observations
बताओ।

लेकिन guaranteed profit या निश्चित भविष्यवाणी
मत करो।

जवाब छोटा, natural और सरल हिंदी में दो।

यूज़र का सवाल:

${message?.trim() ||
"इस तस्वीर को देखकर बताओ कि इसमें क्या दिखाई दे रहा है।"}
`
            : `
तुम्हारा नाम KAIRA है।

तुम एक intelligent, caring और friendly AI assistant हो।

यूज़र से natural और सरल हिंदी में बात करो।

यूज़र को "बॉस" कहकर बुलाओ।

अगर यूज़र English में पूछे तो भी संभव हो तो
हिंदी में जवाब दो।

जवाब सीधा, उपयोगी और natural रखो।

अनावश्यक लंबा जवाब मत दो।

अगर जानकारी current/live हो सकती है,
तो बिना उपलब्ध live data के उसे निश्चित तथ्य
की तरह मत बताओ।

अगर trading के बारे में पूछा जाए तो analysis
में मदद करो, लेकिन guaranteed profit या
निश्चित भविष्यवाणी का दावा मत करो।

यूज़र का सवाल:

${message?.trim()}
`;


        /* =========================
           GEMINI PARTS
        ========================= */

        const parts = [
            {
                text: prompt
            }
        ];


        /* =========================
           ADD IMAGE
        ========================= */

        if (image) {

            let base64Data = image;
            let mimeType = "image/jpeg";


            if (image.startsWith("data:")) {

                const match =
                    image.match(
                        /^data:(image\/[^;]+);base64,(.+)$/
                    );


                if (!match) {

                    return res.status(400).json({
                        error:
                            "Invalid image format"
                    });

                }


                mimeType =
                    match[1];

                base64Data =
                    match[2];

            }


            parts.push({

                inlineData: {

                    mimeType:
                        mimeType,

                    data:
                        base64Data

                }

            });

        }


        /* =========================
           GEMINI REQUEST
        ========================= */

        const response =
            await fetch(

                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            apiKey

                    },

                    body: JSON.stringify({

                        contents: [

                            {

                                role: "user",

                                parts:
                                    parts

                            }

                        ],

                        generationConfig: {

                            maxOutputTokens:
                                visionMode
                                    ? 450
                                    : 500

                        }

                    })

                }

            );


        /* =========================
           GEMINI RESPONSE
        ========================= */

        const data =
            await response.json();


        /* =========================
           QUOTA ERROR
        ========================= */

        if (!response.ok) {

            console.error(
                "Gemini Error:",
                data
            );


            const errorMessage =
                data.error?.message ||
                "Gemini API error";


            const isQuotaError =
                response.status === 429 ||
                errorMessage
                    .toLowerCase()
                    .includes("quota");


            if (isQuotaError) {

                return res.status(429).json({

                    error:
                        "बॉस, KAIRA का Gemini quota अभी पूरा हो गया है। थोड़ी देर बाद फिर कोशिश करें।",

                    quotaExceeded:
                        true,

                    vision:
                        visionMode

                });

            }


            return res.status(
                response.status
            ).json({

                error:
                    errorMessage,

                vision:
                    visionMode

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
                    "Kaira को जवाब नहीं मिला।"

            });

        }


        /* =========================
           SUCCESS
        ========================= */

        return res.status(200).json({

            reply:
                reply,

            vision:
                visionMode,

            model:
                model,

            status:
                "ok"

        });


    } catch (error) {

        console.error(
            "Server Error:",
            error
        );


        return res.status(500).json({

            error:
                "बॉस, server में अभी समस्या आ गई। थोड़ी देर बाद फिर कोशिश करें।"

        });

    }

}
