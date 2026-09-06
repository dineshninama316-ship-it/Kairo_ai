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
           API KEYS
        ========================= */

        const geminiKey =
            process.env.GEMINI_API_KEY;

        const grounderKey =
            process.env.GROUNDER_API_KEY;

        if (!geminiKey) {
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
           BASIC DATA
        ========================= */

        const text =
            message?.trim() || "";

        const visionMode =
            !!image;


        /* =========================
           LIVE SEARCH DETECTION
        ========================= */

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

            "मौसम",
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


        const liveMode =
            !visionMode &&
            liveKeywords.some(
                keyword =>
                    text
                        .toLowerCase()
                        .includes(
                            keyword.toLowerCase()
                        )
            );


        /* =========================
           GROUND SEARCH
        ========================= */

        let searchContext = "";
        let sources = [];

        if (
            liveMode &&
            grounderKey
        ) {

            try {

                const searchResponse =
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

                            body: JSON.stringify({

                                query:
                                    text,

                                region:
                                    "in",

                                source:
                                    "google",

                                max_fetches:
                                    4,

                                max_tokens:
                                    900
                            })
                        }
                    );


                const searchData =
                    await searchResponse.json();


                if (
                    searchResponse.ok &&
                    Array.isArray(
                        searchData.passages
                    ) &&
                    searchData.passages.length
                ) {

                    searchContext =
                        searchData.passages
                            .map(
                                (item, index) =>
                                    `
SOURCE ${index + 1}

URL:
${item.url || ""}

EVIDENCE:
${item.text || ""}
`
                            )
                            .join("\n");


                    sources =
                        searchData.passages
                            .map(
                                item =>
                                    item.url
                            )
                            .filter(Boolean);

                }

            } catch (searchError) {

                console.error(
                    "Grounder Search Error:",
                    searchError
                );

                searchContext = "";
                sources = [];
            }
        }


        /* =========================
           SMART PROMPT
        ========================= */

        let prompt;


        /* =========================
           VISION PROMPT
        ========================= */

        if (visionMode) {

            prompt = `
तुम्हारा नाम KAIRA है।

यूज़र तुम्हें camera या screen की वर्तमान
तस्वीर दिखा रहा है।

यूज़र को "बॉस" कहकर बुलाओ।

तस्वीर को ध्यान से देखो।

सिर्फ वही बताओ जो वास्तव में दिखाई दे रहा है।

बिना evidence के अनुमान मत लगाओ।

अगर object दिखाई दे तो पहचानने की कोशिश करो।

अगर text दिखाई दे तो उसे पढ़ो।

अगर document दिखाई दे तो visible information
समझाओ।

अगर trading chart दिखाई दे तो:

- trend
- support
- resistance
- visible indicators
- technical observations

बताओ।

Guaranteed profit या निश्चित भविष्यवाणी मत करो।

जवाब छोटा और सरल हिंदी में दो।

यूज़र का सवाल:

${text ||
"इस तस्वीर में क्या दिखाई दे रहा है?"}
`;

        }


        /* =========================
           LIVE PROMPT
        ========================= */

        else if (
            liveMode &&
            searchContext
        ) {

            prompt = `
तुम्हारा नाम KAIRA है।

यूज़र को "बॉस" कहकर बुलाओ।

यूज़र ने current/live information पूछी है।

नीचे Grounder Search से प्राप्त वर्तमान web
evidence दिया गया है।

IMPORTANT:

सिर्फ दिए गए evidence के आधार पर जवाब दो।

अपनी memory से current information मत बनाओ।

अगर evidence पर्याप्त नहीं है तो साफ बताओ
कि जानकारी verify नहीं हो सकी।

अलग-अलग sources में अंतर हो तो बताओ।

जवाब सरल और natural हिंदी में दो।

जहाँ जरूरी हो वहाँ तारीख/समय स्पष्ट करो।

Trading या market analysis में guaranteed
profit या निश्चित भविष्यवाणी मत करो।

SEARCH EVIDENCE:

${searchContext}

USER QUESTION:

${text}

जवाब देते समय source URLs को अंत में
"Sources" के नीचे सूचीबद्ध करो।
`;

        }


        /* =========================
           LIVE SEARCH FAILED
           ========================= */

        else if (liveMode) {

            prompt = `
तुम्हारा नाम KAIRA है।

यूज़र को "बॉस" कहकर बुलाओ।

यूज़र ने current/live information पूछी है,
लेकिन web search इस समय उपलब्ध नहीं है।

इसलिए current information को निश्चित तथ्य
की तरह मत बताओ।

अगर सामान्य जानकारी दे सकते हो तो स्पष्ट
करो कि वह live verified information नहीं है।

सरल हिंदी में जवाब दो।

यूज़र का सवाल:

${text}
`;

        }


        /* =========================
           NORMAL PROMPT
        ========================= */

        else {

            prompt = `
तुम्हारा नाम KAIRA है।

तुम एक intelligent, caring और friendly
AI assistant हो।

यूज़र को "बॉस" कहकर बुलाओ।

सरल और natural हिंदी में जवाब दो।

अगर यूज़र English में पूछे तो भी संभव हो
तो हिंदी में जवाब दो।

जवाब सीधा, उपयोगी और natural रखो।

अनावश्यक लंबा जवाब मत दो।

अगर current information उपलब्ध नहीं है तो
उसे निश्चित current fact की तरह मत बताओ।

Trading में analysis में मदद करो लेकिन
guaranteed profit का दावा मत करो।

यूज़र का सवाल:

${text}
`;

        }


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

            let base64Data =
                image;

            let mimeType =
                "image/jpeg";


            if (
                image.startsWith("data:")
            ) {

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
           GEMINI REQUEST BODY
        ========================= */

        const requestBody = {

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
                        : liveMode
                            ? 650
                            : 500
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

                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            geminiKey
                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }

            );
        }


        /* =========================
           GEMINI REQUEST
        ========================= */

        let response =
            await callGemini();


        /* =========================
           429 RETRY
        ========================= */

        if (
            response.status === 429
        ) {

            console.log(
                "Gemini 429 detected. Retrying..."
            );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        3000
                    )
            );


            response =
                await callGemini();
        }


        /* =========================
           RESPONSE DATA
        ========================= */

        const data =
            await response.json();


        /* =========================
           ERROR HANDLING
        ========================= */

        if (!response.ok) {

            console.error(
                "Gemini Error:",
                data
            );


            const errorMessage =
                data.error?.message ||
                "Gemini API error";


            if (
                response.status === 429
            ) {

                return res.status(429).json({

                    error:
                        "बॉस, Gemini अभी requests स्वीकार नहीं कर रहा है। थोड़ी देर बाद फिर कोशिश करें।",

                    quotaExceeded:
                        true,

                    vision:
                        visionMode,

                    live:
                        liveMode,

                    status:
                        "rate_limited"
                });
            }


            if (
                response.status === 503
            ) {

                return res.status(503).json({

                    error:
                        "बॉस, Gemini server अभी busy है। थोड़ी देर बाद फिर कोशिश करें।",

                    vision:
                        visionMode,

                    live:
                        liveMode,

                    status:
                        "server_busy"
                });
            }


            return res.status(
                response.status
            ).json({

                error:
                    errorMessage,

                vision:
                    visionMode,

                live:
                    liveMode,

                status:
                    "error"
            });
        }


        /* =========================
           GET GEMINI REPLY
        ========================= */

        const reply =
            data
                .candidates?.[0]
                ?.content?.parts
                ?.map(
                    part =>
                        part.text || ""
                )
                .join("")
                .trim();


        if (!reply) {

            return res.status(500).json({

                error:
                    "बॉस, KAIRA को जवाब नहीं मिला।",

                status:
                    "empty_response"
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

            live:
                liveMode,

            sources:
                sources,

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
                "बॉस, KAIRA server में समस्या आ गई। थोड़ी देर बाद फिर कोशिश करें।",

            status:
                "server_error"
        });
    }
                                    }
