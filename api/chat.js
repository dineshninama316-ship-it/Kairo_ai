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
           GET REQUEST DATA
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
           GEMINI MODEL
        ========================= */

        const model =
            "gemini-3.6-flash";


        /* =========================
           KAIRA SYSTEM PROMPT
        ========================= */

        const prompt = `
तुम्हारा नाम KAIRA है।

तुम एक intelligent, caring और friendly AI assistant हो।

यूज़र से हमेशा natural और सरल हिंदी में बात करो।

यूज़र को "बॉस" कहकर बुलाओ।

अगर यूज़र English में भी सवाल करे,
तो जवाब हिंदी में देने की कोशिश करो।

अगर image भेजी गई है,
तो image को ध्यान से देखकर analysis करो।

Image में जो साफ दिखाई दे,
सिर्फ उसी के बारे में बताओ।

बिना evidence के चीजों का अनुमान मत लगाओ।

अगर image में कोई object, person, text,
document, chart या दूसरी चीज दिखाई दे,
तो उसे सरल हिंदी में समझाओ।

अगर trading chart दिखाई दे,
तो trend, support, resistance और
दिखाई देने वाले technical observations
समझाने में मदद करो।

लेकिन guaranteed profit या निश्चित भविष्यवाणी
का दावा मत करो।

हमेशा helpful और natural जवाब दो।

यूज़र का सवाल:

${message?.trim() ||
"इस तस्वीर को ध्यान से देखकर बताओ कि इसमें क्या दिखाई दे रहा है।"}
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
           IMAGE
        ========================= */

        if (image) {

            let base64Data = image;

            let mimeType =
                "image/jpeg";


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
           GEMINI API
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
                                700

                        }

                    })

                }

            );


        /* =========================
           RESPONSE
        ========================= */

        const data =
            await response.json();


        if (!response.ok) {

            console.error(
                "Gemini Error:",
                data
            );


            return res.status(
                response.status
            ).json({

                error:
                    data.error?.message ||
                    "Gemini API error"

            });

        }


        /* =========================
           GET AI REPLY
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
                !!image,

            model:
                model

        });


    } catch (error) {

        console.error(
            "Server Error:",
            error
        );


        return res.status(500).json({

            error:
                error.message ||
                "Server error"

        });

    }

}
