// =====================================================
// KAIRA AI SERVER
// api/chat.js
// =====================================================

export default async function handler(req, res) {

    // -----------------------------
    // CORS
    // -----------------------------

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    // Browser preflight
    if (req.method === "OPTIONS") {

        return res.status(200).end();
    }


    // -----------------------------
    // Only POST
    // -----------------------------

    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Only POST requests are allowed."
        });
    }


    try {

        const {
            message,
            image,
            weather
        } = req.body || {};


        // -----------------------------
        // Validate message
        // -----------------------------

        if (
            !message &&
            !image
        ) {

            return res.status(400).json({
                error: "Message या image आवश्यक है।"
            });
        }


        // -----------------------------
        // API KEY
        // -----------------------------

        const apiKey =
            process.env.OPENAI_API_KEY;


        if (!apiKey) {

            return res.status(500).json({

                error:
                    "OPENAI_API_KEY server पर सेट नहीं है।"

            });
        }


        // -----------------------------
        // SYSTEM INSTRUCTIONS
        // -----------------------------

        const systemPrompt = `

तुम KAIRA नाम की एक smart Hindi AI assistant हो।

User को friendly तरीके से "बॉस" कह सकते हो।

तुम्हारा काम:

1. सामान्य सवालों के सही और आसान जवाब देना।
2. Hindi में बातचीत करना।
3. जरूरत पड़ने पर English technical terms इस्तेमाल करना।
4. User की बात को समझकर सीधे useful जवाब देना।
5. बहुत ज्यादा लंबा जवाब नहीं देना जब तक user detail न मांगे।
6. अगर user voice से बात कर रहा है तो जवाब बोलने लायक साफ भाषा में देना।
7. Image मिलने पर image को ध्यान से analyze करना।
8. Screen image मिलने पर screen पर दिखाई दे रही चीजों को समझाना।
9. Trading chart मिलने पर:
   - trend
   - market structure
   - support
   - resistance
   - possible zones
   - risk
   समझाओ।
10. Trading में guaranteed profit या guaranteed prediction मत दो।
11. Financial decisions में risk साफ बताओ।
12. Weather data मिलने पर उसका उपयोग करके मौसम की जानकारी दो।
13. अगर image में कोई चीज साफ दिखाई नहीं देती तो अनुमान को fact की तरह मत बताओ।

तुम KAIRA हो।
`;



        // =================================================
        // USER CONTENT
        // =================================================

        const content = [];


        // -----------------------------
        // Text message
        // -----------------------------

        if (message) {

            content.push({

                type: "input_text",

                text: message

            });
        }


        // -----------------------------
        // Weather information
        // -----------------------------

        if (weather) {

            content.push({

                type: "input_text",

                text:
                    `

Current weather information:

Temperature:
${weather.temperature} °C

Feels like:
${weather.apparent_temperature} °C

Humidity:
${weather.humidity} %

Wind:
${weather.wind_speed} km/h

Condition:
${weather.description}

इस weather data का उपयोग करके user के सवाल का जवाब दो।
`

            });
        }


        // -----------------------------
        // Image / Camera / Screen
        // -----------------------------

        if (
            image &&
            typeof image === "string" &&
            image.startsWith("data:image/")
        ) {

            content.push({

                type: "input_image",

                image_url: image

            });
        }


        // =================================================
        // OPENAI REQUEST
        // =================================================

        const response =
            await fetch(
                "https://api.openai.com/v1/responses",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`

                    },

                    body: JSON.stringify({

                        model:
                            "gpt-5.6",

                        instructions:
                            systemPrompt,

                        input: [

                            {

                                role: "user",

                                content:
                                    content

                            }

                        ],

                        max_output_tokens:
                            1200

                    })

                }
            );


        // =================================================
        // OPENAI ERROR
        // =================================================

        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "OpenAI Error:",
                errorText
            );


            return res.status(
                response.status
            ).json({

                error:
                    "AI server से response नहीं मिला।"

            });
        }


        // =================================================
        // RESPONSE JSON
        // =================================================

        const data =
            await response.json();


        // =================================================
        // EXTRACT TEXT
        // =================================================

        let reply = "";


        if (
            typeof data.output_text ===
            "string"
        ) {

            reply =
                data.output_text.trim();

        } else if (
            Array.isArray(data.output)
        ) {

            for (
                const item
                of data.output
            ) {

                if (
                    Array.isArray(
                        item.content
                    )
                ) {

                    for (
                        const part
                        of item.content
                    ) {

                        if (
                            part.type ===
                            "output_text"
                        ) {

                            reply +=
                                part.text || "";
                        }
                    }
                }
            }


            reply =
                reply.trim();
        }


        // =================================================
        // EMPTY RESPONSE
        // =================================================

        if (!reply) {

            reply =
                "बॉस, अभी मुझे कोई जवाब नहीं मिला।";
        }


        // =================================================
        // SEND TO FRONTEND
        // =================================================

        return res.status(200).json({

            reply: reply

        });


    } catch (error) {

        console.error(
            "KAIRA Server Error:",
            error
        );


        return res.status(500).json({

            error:
                "KAIRA server में समस्या आ गई।"

        });
    }
}
