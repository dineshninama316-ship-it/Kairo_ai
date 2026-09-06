export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const {
            message,
            image,
            weather
        } = req.body || {};

        const text =
            typeof message === "string"
                ? message.trim()
                : "";

        if (!text) {
            return res.status(400).json({
                error: "Message is required"
            });
        }


        /* =====================================================
           API KEYS
        ===================================================== */

        const geminiKey =
            process.env.GEMINI_API_KEY;

        const grounderKey =
            process.env.GROUNDER_API_KEY;


        if (!geminiKey) {

            return res.status(500).json({
                error: "GEMINI_API_KEY नहीं मिली।"
            });
        }


        /* =====================================================
           LIVE SEARCH DETECTION
        ===================================================== */

        const liveKeywords = [

            "आज",
            "अभी",
            "आज का",
            "आज की",
            "आज के",

            "लेटेस्ट",
            "ताजा",
            "ताज़ा",
            "नवीनतम",

            "न्यूज़",
            "न्यूज",
            "खबर",
            "खबरें",
            "समाचार",

            "weather",
            "today",
            "now",
            "current",
            "latest",
            "news",
            "live",

            "price",
            "प्राइस",
            "भाव",
            "रेट",
            "rate",
            "कीमत",

            "market",
            "मार्केट",

            "gold",
            "silver",
            "सोना",
            "चांदी",

            "bitcoin",
            "crypto",
            "क्रिप्टो",

            "share",
            "stock",
            "शेयर",
            "स्टॉक",

            "ipl",
            "cricket",
            "क्रिकेट",

            "result",
            "रिजल्ट",

            "election",
            "चुनाव"
        ];


        const lowerText =
            text.toLowerCase();


        const liveMode =
            liveKeywords.some(
                keyword =>
                    lowerText.includes(
                        keyword.toLowerCase()
                    )
            );


        /* =====================================================
           WEATHER DATA
        ===================================================== */

        let weatherContext = "";


        if (weather) {

            weatherContext = `
USER WEATHER DATA:

Temperature:
${weather.temperature ?? "N/A"} °C

Feels like:
${weather.apparent_temperature ?? "N/A"} °C

Humidity:
${weather.humidity ?? "N/A"} %

Wind:
${weather.wind_speed ?? "N/A"} km/h

Precipitation:
${weather.precipitation ?? "N/A"} mm

Condition:
${weather.description ?? "N/A"}

Use this weather data as the primary source
when answering the user's weather question.
`;
        }


        /* =====================================================
           GROUNDER LIVE SEARCH
        ===================================================== */

        let searchContext = "";
        let sources = [];


        if (
            liveMode &&
            grounderKey &&
            !weather
        ) {

            try {

                const grounderResponse =
                    await fetch(
                        "https://grounder.dev/v1/deep_search",
                        {

                            method: "POST",

                            headers: {

                                "Authorization":
                                    `Bearer ${grounderKey}`,

                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    query: text,

                                    source: "google",

                                    max_fetches: 4,

                                    max_tokens: 900
                                })
                        }
                    );


                if (
                    grounderResponse.ok
                ) {

                    const grounderData =
                        await grounderResponse.json();


                    const passages =
                        Array.isArray(
                            grounderData.passages
                        )
                            ? grounderData.passages
                            : [];


                    searchContext =
                        passages
                            .map(
                                (item, index) => {

                                    const url =
                                        item.url || "";

                                    if (url) {
                                        sources.push(url);
                                    }

                                    return `
SOURCE ${index + 1}

URL:
${url}

EVIDENCE:
${item.text || ""}
`;
                                }
                            )
                            .join("\n");


                    sources =
                        [...new Set(sources)];
                }

            } catch (error) {

                console.error(
                    "Grounder Error:",
                    error
                );
            }
        }


        /* =====================================================
           SYSTEM PROMPT
        ===================================================== */

        let systemPrompt = `

You are KAIRA AI.

You are a smart personal AI assistant.

The user prefers simple Hindi.

Answer naturally and clearly.

Do not claim that you performed an action
unless you actually received the required data.

For trading questions:
- Explain observations clearly.
- Do not guarantee profit.
- Do not claim guaranteed buy/sell signals.
- Mention important uncertainty.

For image or screen analysis:
- Only describe what is actually visible.
- Do not invent details.
- If something is unclear, say that it is unclear.

For live information:
- Prefer the provided live-search evidence.
- Do not invent current prices, news, weather or results.

Keep answers useful and reasonably concise.

`;


        /* =====================================================
           WEATHER PROMPT
        ===================================================== */

        if (weatherContext) {

            systemPrompt += `

${weatherContext}

Answer the user's weather question
using the supplied weather data.

`;
        }


        /* =====================================================
           LIVE SEARCH PROMPT
        ===================================================== */

        if (searchContext) {

            systemPrompt += `

LIVE WEB EVIDENCE:

${searchContext}

IMPORTANT:
Use this evidence when answering.

If the evidence is insufficient,
clearly say that the information could not
be verified.

Do not invent missing information.

`;

        }


        /* =====================================================
           IMAGE PROMPT
        ===================================================== */

        if (image) {

            systemPrompt += `

An image has been attached.

Analyze the image carefully.

If it is a camera frame:
describe what is visible.

If it is a phone/computer screen:
analyze the visible screen.

If it contains a TradingView chart:
you may discuss visible:

- trend
- support
- resistance
- candles
- market structure
- indicators

But do not guarantee future price movement
or guaranteed profit.

`;

        }


        /* =====================================================
           USER PROMPT
        ===================================================== */

        systemPrompt += `

USER MESSAGE:

${text}

Now answer the user.

`;


        /* =====================================================
           GEMINI CALL
        ===================================================== */

        const result =
            await callGemini(
                geminiKey,
                systemPrompt,
                image
            );


        if (!result.ok) {

            return res.status(
                result.status || 500
            ).json({

                error:
                    result.error ||
                    "AI response failed",

                retry:
                    result.retry || false
            });
        }


        /* =====================================================
           FINAL RESPONSE
        ===================================================== */

        return res.status(200).json({

            reply:
                result.reply,

            vision:
                !!image,

            live:
                !!searchContext,

            weather:
                !!weather,

            sources,

            model:
                "gemini-3.6-flash",

            status:
                "success"
        });


    } catch (error) {

        console.error(
            "KAIRA API Error:",
            error
        );


        return res.status(500).json({

            error:
                "KAIRA server में समस्या आ गई।"
        });
    }
            }
/* =====================================================
   GEMINI FUNCTION
===================================================== */

async function callGemini(
    apiKey,
    prompt,
    image
) {

    const model =
        "gemini-3.6-flash";


    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;


    /* =====================================================
       REQUEST CONTENT
    ===================================================== */

    const parts = [
        {
            text: prompt
        }
    ];


    /* =====================================================
       IMAGE / CAMERA / SCREEN
    ===================================================== */

    if (image) {

        let imageData =
            image;


        /*
          data:image/jpeg;base64,XXXX
          में से केवल base64 हिस्सा निकालना है
        */

        if (
            imageData.startsWith(
                "data:"
            )
        ) {

            imageData =
                imageData.split(
                    ","
                )[1];
        }


        parts.push({

            inlineData: {

                mimeType:
                    "image/jpeg",

                data:
                    imageData
            }
        });
    }


    const requestBody = {

        contents: [

            {
                role: "user",

                parts:
                    parts
            }

        ],

        generationConfig: {

            temperature: 0.7,

            maxOutputTokens:
                1000
        }

    };


    /* =====================================================
       FIRST REQUEST
    ===================================================== */

    let response;

    try {

        response =
            await fetch(
                url,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );

    } catch (error) {

        console.error(
            "Gemini Network Error:",
            error
        );

        return {

            ok: false,

            status: 500,

            error:
                "Gemini server से connection नहीं हो पाया।"
        };
    }


    /* =====================================================
       429 → WAIT → RETRY
    ===================================================== */

    if (
        response.status === 429
    ) {

        console.log(
            "Gemini 429 received. Retrying..."
        );


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    3000
                )
        );


        try {

            response =
                await fetch(
                    url,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                requestBody
                            )
                    }
                );

        } catch (error) {

            console.error(
                "Gemini Retry Error:",
                error
            );

            return {

                ok: false,

                status: 500,

                error:
                    "Gemini retry के दौरान connection error आया।"
            };
        }
    }


    /* =====================================================
       OTHER API ERRORS
    ===================================================== */

    if (
        !response.ok
    ) {

        let errorData = null;

        try {

            errorData =
                await response.json();

        } catch (error) {

            errorData = null;
        }


        console.error(
            "Gemini API Error:",
            response.status,
            errorData
        );


        if (
            response.status === 429
        ) {

            return {

                ok: false,

                status: 429,

                retry: true,

                error:
                    "KAIRA की AI request limit अभी पूरी हो गई है। थोड़ी देर बाद फिर कोशिश करें।"
            };
        }


        if (
            response.status === 503
        ) {

            return {

                ok: false,

                status: 503,

                error:
                    "Gemini अभी busy है। थोड़ी देर बाद फिर कोशिश करें।"
            };
        }


        return {

            ok: false,

            status:
                response.status,

            error:
                "Gemini API error आया।"
        };
    }


    /* =====================================================
       READ RESPONSE
    ===================================================== */

    let data;

    try {

        data =
            await response.json();

    } catch (error) {

        return {

            ok: false,

            status: 500,

            error:
                "Gemini का response समझ नहीं आया।"
        };
    }


    /* =====================================================
       EXTRACT TEXT
    ===================================================== */

    const reply =
        data
            ?.candidates
            ?.map(
                candidate =>
                    candidate
                        ?.content
                        ?.parts
                        ?.map(
                            part =>
                                part.text || ""
                        )
                        .join("")
            )
            .filter(Boolean)
            .join("\n")
            .trim();


    if (!reply) {

        console.error(
            "Empty Gemini response:",
            data
        );


        return {

            ok: false,

            status: 500,

            error:
                "Gemini ने कोई जवाब नहीं दिया।"
        };
    }


    return {

        ok: true,

        reply:
            reply
    };
}
