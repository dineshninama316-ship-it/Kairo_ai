/**
 * =====================================================
 * KAIRA AI 4.0
 * Groq + Neon + Permanent Memory + Vision
 * =====================================================
 */

import { neon } from "@neondatabase/serverless";


/* =====================================================
   CONFIG
===================================================== */

const GROQ_URL =
    "https://api.groq.com/openai/v1/chat/completions";

const TEXT_MODEL =
    "openai/gpt-oss-120b";

const VISION_MODEL =
    "qwen/qwen3.6-27b";


/* =====================================================
   DATABASE
===================================================== */

const databaseUrl =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

const sql =
    databaseUrl
        ? neon(databaseUrl)
        : null;


/* =====================================================
   HELPERS
===================================================== */

function cleanText(value) {

    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}


/* =====================================================
   SAFE USER ID
===================================================== */

function getUserId(body) {

    const id =
        cleanText(body?.userId);

    if (id) {
        return id;
    }

    return "default-user";
}


/* =====================================================
   INTENT DETECTION
===================================================== */

function detectIntent(message, hasImage) {

    const text =
        cleanText(message).toLowerCase();


    /* =================================================
       VISION
    ================================================= */

    if (hasImage) {

        if (
            text.includes("chart") ||
            text.includes("trading") ||
            text.includes("trade") ||
            text.includes("buy") ||
            text.includes("sell") ||
            text.includes("support") ||
            text.includes("resistance") ||
            text.includes("fibonacci") ||
            text.includes("candlestick") ||
            text.includes("volume") ||
            text.includes("चार्ट") ||
            text.includes("ट्रेडिंग") ||
            text.includes("सपोर्ट") ||
            text.includes("रेजिस्टेंस") ||
            text.includes("फिबोनाची") ||
            text.includes("कैंडल")
        ) {

            return "trading_vision";

        }

        return "vision";

    }


    /* =================================================
       MEMORY QUERY
       IMPORTANT:
       Query must come BEFORE memory intent.
       ================================================= */

    if (
        text.includes("मेरा नाम क्या है") ||
        text.includes("मेरा नाम क्या") ||
        text.includes("my name") ||
        text.includes("what is my name") ||
        text.includes("what's my name") ||
        text.includes("मुझे क्या पसंद") ||
        text.includes("मैं कौन हूं") ||
        text.includes("मैं कौन हूँ") ||
        text.includes("मैं कौन") ||
        text.includes("मेरे बारे में क्या जानते") ||
        text.includes("मेरे बारे में बताओ") ||
        text.includes("what do you know about me")
    ) {

        return "memory_query";

    }


    /* =================================================
       MEMORY SAVE
    ================================================= */

    if (
        text.includes("याद रखो") ||
        text.includes("याद रखना") ||
        text.includes("याद रख") ||
        text.includes("remember") ||
        text.includes("don't forget") ||
        text.includes("dont forget") ||
        text.includes("मत भूलना")
    ) {

        return "memory";

    }


    /* =================================================
       WEATHER
    ================================================= */

    if (
        text.includes("मौसम") ||
        text.includes("weather") ||
        text.includes("temperature") ||
        text.includes("तापमान")
    ) {

        return "weather";

    }


    /* =================================================
       TRADING
    ================================================= */

    if (
        text.includes("trading") ||
        text.includes("trade") ||
        text.includes("stock") ||
        text.includes("crypto") ||
        text.includes("forex") ||
        text.includes("nifty") ||
        text.includes("banknifty") ||
        text.includes("bitcoin") ||
        text.includes("ethereum") ||
        text.includes("share") ||
        text.includes("शेयर") ||
        text.includes("ट्रेडिंग") ||
        text.includes("बिटकॉइन")
    ) {

        return "trading";

    }


    return "chat";

}


/* =====================================================
   MEMORY EXTRACTION
   Deterministic parser
===================================================== */

function extractMemory(message) {

    let text =
        cleanText(message);

    if (!text) {
        return null;
    }


    /* =================================================
       REMOVE MEMORY COMMAND
    ================================================= */

    text =
        text
            .replace(
                /इसे\s+याद\s+रखो/giu,
                ""
            )
            .replace(
                /इसे\s+याद\s+रखना/giu,
                ""
            )
            .replace(
                /याद\s+रखो/giu,
                ""
            )
            .replace(
                /याद\s+रखना/giu,
                ""
            )
            .replace(
                /याद\s+रख/giu,
                ""
            )
            .replace(
                /remember\s+(it|this)/giu,
                ""
            )
            .replace(
                /don't\s+forget/giu,
                ""
            )
            .replace(
                /dont\s+forget/giu,
                ""
            )
            .trim();


    /* =================================================
       NAME
    ================================================= */

    const namePatterns = [

        /^मेरा\s+नाम\s+(.+?)\s+है[।.!]?$/iu,

        /^मेरा\s+नाम\s+(.+?)[।.!]?$/iu,

        /^my\s+name\s+is\s+(.+?)[.!]?$/iu,

        /^i\s+am\s+(.+?)[.!]?$/iu

    ];


    for (
        const pattern of namePatterns
    ) {

        const match =
            text.match(pattern);

        if (match) {

            let name =
                cleanText(match[1]);


            name =
                name
                    .replace(
                        /है$/iu,
                        ""
                    )
                    .replace(
                        /[।.!]+$/u,
                        ""
                    )
                    .trim();


            if (
                name &&
                name.length <= 100
            ) {

                return {

                    key:
                        "name",

                    value:
                        name

                };

            }

        }

    }


    /* =================================================
       PREFERENCE
    ================================================= */

    const preferencePatterns = [

        /^मुझे\s+(.+?)\s+पसंद\s+है[।.!]?$/iu,

        /^मुझे\s+(.+?)\s+अच्छा\s+लगता\s+है[।.!]?$/iu,

        /^i\s+like\s+(.+?)[.!]?$/iu,

        /^my\s+favorite\s+is\s+(.+?)[.!]?$/iu

    ];


    for (
        const pattern of preferencePatterns
    ) {

        const match =
            text.match(pattern);

        if (match) {

            const value =
                cleanText(match[1])
                    .replace(
                        /[।.!]+$/u,
                        ""
                    )
                    .trim();


            if (value) {

                return {

                    key:
                        "preference",

                    value

                };

            }

        }

    }


    /* =================================================
       GOAL
    ================================================= */

    const goalPatterns = [

        /^मेरा\s+goal\s+(.+?)[।.!]?$/iu,

        /^मेरा\s+लक्ष्य\s+(.+?)[।.!]?$/iu,

        /^my\s+goal\s+is\s+(.+?)[.!]?$/iu

    ];


    for (
        const pattern of goalPatterns
    ) {

        const match =
            text.match(pattern);

        if (match) {

            const value =
                cleanText(match[1])
                    .replace(
                        /[।.!]+$/u,
                        ""
                    )
                    .trim();


            if (value) {

                return {

                    key:
                        "goal",

                    value

                };

            }

        }

    }


    return null;

}


/* =====================================================
   SAVE MEMORY
===================================================== */

async function saveMemory(
    userId,
    memory
) {

    if (
        !sql ||
        !userId ||
        !memory ||
        !memory.key ||
        !memory.value
    ) {

        return false;

    }


    await sql`

        INSERT INTO memories
        (
            user_id,
            memory_key,
            memory_value
        )

        VALUES
        (
            ${userId},
            ${memory.key},
            ${memory.value}
        )

        ON CONFLICT
        (
            user_id,
            memory_key
        )

        DO UPDATE SET

            memory_value =
                EXCLUDED.memory_value,

            updated_at =
                NOW()

    `;


    return true;

}


/* =====================================================
   LOAD MEMORIES
===================================================== */

async function loadMemories(
    userId
) {

    if (!sql) {
        return [];
    }


    const rows =
        await sql`

            SELECT
                id,
                memory_key,
                memory_value,
                created_at,
                updated_at

            FROM memories

            WHERE user_id =
                ${userId}

            ORDER BY
                updated_at DESC

        `;


    return rows;

}


/* =====================================================
   MEMORY CONTEXT
===================================================== */

function buildMemoryContext(
    memories
) {

    if (
        !memories ||
        memories.length === 0
    ) {

        return `
USER MEMORY:

No saved memory.
`;

    }


    let context = `
USER MEMORY:

`;


    for (
        const memory of memories
    ) {

        context +=
            `- ${memory.memory_key}: ${memory.memory_value}\n`;

    }


    return context;

}


/* =====================================================
   WEATHER CONTEXT
===================================================== */

function buildWeatherContext(
    weather
) {

    if (!weather) {
        return "";
    }


    const current =
        weather.current || {};


    return `
=====================================================
CURRENT WEATHER
=====================================================

Temperature:
${current.temperature_2m ?? "unknown"} °C

Feels like:
${current.apparent_temperature ?? "unknown"} °C

Humidity:
${current.relative_humidity_2m ?? "unknown"} %

Wind:
${current.wind_speed_10m ?? "unknown"} km/h

Weather code:
${current.weather_code ?? "unknown"}

`;

}


/* =====================================================
   SYSTEM PROMPT
===================================================== */

function buildSystemPrompt(
    intent,
    memoryContext
) {

    return `
You are KAIRA.

You are the user's personal AI assistant.

=====================================================
IDENTITY
=====================================================

Name:
KAIRA

Personality:

- friendly
- caring
- intelligent
- natural
- confident
- respectful
- honest
- helpful

Never pretend to be human.

Never invent information.

Never claim an action was completed unless
the system actually performed it.

=====================================================
LANGUAGE
=====================================================

If the user speaks Hindi:

Reply naturally in Hindi.

If the user speaks Hinglish:

Reply naturally in Hinglish/Hindi.

If the user speaks English:

Reply in English.

Do not unnecessarily switch languages.

=====================================================
PERMANENT MEMORY
=====================================================

${memoryContext}

Important:

The USER MEMORY section contains information
actually retrieved from the Neon database.

Use it when relevant.

If a memory exists, use it.

Never invent a memory.

If the user asks for information that is not
inside USER MEMORY, honestly say that you don't
have that information saved.

=====================================================
VISION
=====================================================

If an image is provided:

- inspect it carefully
- describe what is actually visible
- do not hallucinate
- separate observation from inference
- if text is visible, read it carefully
- if uncertain, say that you are uncertain

=====================================================
TRADING
=====================================================

You may analyse:

- trend
- market structure
- support
- resistance
- Fibonacci
- candlestick patterns
- volume when visible
- entry zones
- stop-loss concepts
- target zones
- risk/reward
- bullish and bearish scenarios

Never guarantee profit.

Never say a trade is 100% certain.

Clearly mention uncertainty when analysing
a financial chart.

=====================================================
CURRENT INTENT
=====================================================

${intent}

=====================================================
STYLE
=====================================================

For simple questions:

Give a concise answer.

For complex questions:

Use:

- headings
- bullets
- clear steps

Be friendly but don't repeat yourself.

=====================================================
MEMORY RESPONSE RULE
=====================================================

If the server directly provides a memory answer,
do not contradict it.

If the memory says the user's name is X,
the user's name is X.

=====================================================
`;

}


/* =====================================================
   GROQ REQUEST
===================================================== */

async function askGroq({
    apiKey,
    model,
    messages
}) {

    const response =
        await fetch(
            GROQ_URL,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${apiKey}`

                },

                body:
                    JSON.stringify({

                        model,

                        messages,

                        temperature:
                            0.7,

                        max_completion_tokens:
                            3000,

                        stream:
                            false

                    })

            }
        );


    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Groq से invalid response मिला।"
        );

    }


    if (!response.ok) {

        console.error(
            "GROQ ERROR:",
            data
        );


        throw new Error(
            data?.error?.message ||
            "Groq API request failed."
        );

    }


    const reply =
        data?.choices?.[0]
            ?.message
            ?.content;


    if (!reply) {

        throw new Error(
            "AI ने कोई जवाब नहीं दिया।"
        );

    }


    return reply;

}


/* =====================================================
   SAVE CONVERSATION
===================================================== */

async function saveConversation(
    userId,
    role,
    message
) {

    if (
        !sql ||
        !message
    ) {

        return;

    }


    await sql`

        INSERT INTO conversations
        (
            user_id,
            role,
            message
        )

        VALUES
        (
            ${userId},
            ${role},
            ${message}
        )

    `;

}


/* =====================================================
   DIRECT MEMORY RESPONSE
===================================================== */

async function getDirectMemoryReply(
    userId,
    memories,
    message
) {

    const text =
        cleanText(message).toLowerCase();


    /* =================================================
       NAME
    ================================================= */

    if (
        text.includes("मेरा नाम") ||
        text.includes("my name") ||
        text.includes("what is my name") ||
        text.includes("what's my name")
    ) {

        const nameMemory =
            memories.find(
                memory =>
                    memory.memory_key === "name"
            );


        if (nameMemory) {

            return (
                `आपका नाम ${nameMemory.memory_value} है। 😊`
            );

        }


        return (
            "मुझे अभी आपका नाम याद नहीं है।"
        );

    }


    /* =================================================
       PREFERENCE
    ================================================= */

    if (
        text.includes("मुझे क्या पसंद") ||
        text.includes("what do i like") ||
        text.includes("मेरी पसंद")
    ) {

        const preferences =
            memories.filter(
                memory =>
                    memory.memory_key === "preference"
            );


        if (preferences.length === 0) {

            return (
                "मुझे अभी आपकी पसंद के बारे में कोई memory नहीं मिली।"
            );

        }


        const values =
            preferences
                .map(
                    memory =>
                        memory.memory_value
                )
                .join(", ");


        return (
            `आपको ${values} पसंद है। 😊`
        );

    }


    /* =================================================
       GOAL
    ================================================= */

    if (
        text.includes("मेरा goal") ||
        text.includes("मेरा लक्ष्य") ||
        text.includes("what is my goal") ||
        text.includes("what's my goal")
    ) {

        const goal =
            memories.find(
                memory =>
                    memory.memory_key === "goal"
            );


        if (!goal) {

            return (
                "मुझे अभी आपका goal याद नहीं है।"
            );

        }


        return (
            `आपका goal है: ${goal.memory_value} 🎯`
        );

    }


    /* =================================================
       GENERAL ABOUT USER
    ================================================= */

    if (
        text.includes("मेरे बारे में") ||
        text.includes("मैं कौन हूं") ||
        text.includes("मैं कौन हूँ") ||
        text.includes("what do you know about me")
    ) {

        if (
            !memories ||
            memories.length === 0
        ) {

            return (
                "अभी मेरी memory में आपके बारे में कोई जानकारी saved नहीं है।"
            );

        }


        let reply =
            "मेरी memory में आपके बारे में यह जानकारी है:\n\n";


        for (
            const memory of memories
        ) {

            reply +=
                `• ${memory.memory_key}: ${memory.memory_value}\n`;

        }


        return reply;

    }


    return null;

}


/* =====================================================
   MAIN API
===================================================== */

export default async function handler(
    req,
    res
) {

    /* =================================================
       CORS
    ================================================= */

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


    /* =================================================
       OPTIONS
    ================================================= */

    if (
        req.method === "OPTIONS"
    ) {

        return res
            .status(200)
            .end();

    }


    /* =================================================
       METHOD
    ================================================= */

    if (
        req.method !== "POST"
    ) {

        return res
            .status(405)
            .json({

                ok:
                    false,

                error:
                    "Only POST requests are allowed."

            });

    }


    /* =================================================
       API KEY
    ================================================= */

    const apiKey =
        process.env.GROQ_API_KEY;


    if (!apiKey) {

        return res
            .status(500)
            .json({

                ok:
                    false,

                error:
                    "GROQ_API_KEY नहीं मिली।"

            });

    }


    /* =================================================
       DATABASE
    ================================================= */

    if (!sql) {

        return res
            .status(500)
            .json({

                ok:
                    false,

                error:
                    "Neon database connection नहीं मिली।"

            });

    }


    try {

        const body =
            req.body || {};


        /* =================================================
           USER ID
        ================================================= */

        const userId =
            getUserId(body);


        /* =================================================
           USER CREATE
        ================================================= */

        await sql`

            INSERT INTO users
            (
                user_id
            )

            VALUES
            (
                ${userId}
            )

            ON CONFLICT
            (
                user_id
            )

            DO NOTHING

        `;


        /* =================================================
           HISTORY ACTION
        ================================================= */

        if (
            body.action === "history"
        ) {

            const history =
                await sql`

                    SELECT
                        id,
                        role,
                        message,
                        created_at

                    FROM conversations

                    WHERE user_id =
                        ${userId}

                    ORDER BY
                        created_at ASC

                    LIMIT 100

                `;


            return res
                .status(200)
                .json({

                    ok:
                        true,

                    history,

                    userId

                });

        }


        /* =================================================
           MEMORIES ACTION
        ================================================= */

        if (
            body.action === "memories"
        ) {

            const memories =
                await loadMemories(
                    userId
                );


            return res
                .status(200)
                .json({

                    ok:
                        true,

                    memories,

                    userId

                });

        }


        /* =================================================
           MESSAGE
        ================================================= */

        const message =
            cleanText(
                body.message
            );


        /* =================================================
           IMAGE
        ================================================= */

        const image =
            typeof body.image === "string" &&
            body.image.startsWith(
                "data:image/"
            )
                ? body.image
                : null;


        /* =================================================
           WEATHER
        ================================================= */

        const weather =
            body.weather || null;


        /* =================================================
           VALIDATION
        ================================================= */

        if (
            !message &&
            !image
        ) {

            return res
                .status(400)
                .json({

                    ok:
                        false,

                    error:
                        "Message या image जरूरी है।"

                });

        }


        /* =================================================
           INTENT
        ================================================= */

        const intent =
            detectIntent(
                message,
                Boolean(image)
            );


        /* =================================================
           EXTRACT MEMORY
        ================================================= */

        const extractedMemory =
            extractMemory(
                message
            );


        let memorySaved =
            false;


        /* =================================================
           SAVE MEMORY
        ================================================= */

        if (
            extractedMemory
        ) {

            memorySaved =
                await saveMemory(
                    userId,
                    extractedMemory
                );

        }


        /* =================================================
           SAVE USER MESSAGE
        ================================================= */

        if (message) {

            await saveConversation(
                userId,
                "user",
                message
            );

        }


        /* =================================================
           LOAD MEMORIES
        ================================================= */

        const memories =
            await loadMemories(
                userId
            );


        /* =================================================
           DIRECT MEMORY QUERY
           No Groq required.
        ================================================= */

        if (
            intent === "memory_query"
        ) {

            const directReply =
                await getDirectMemoryReply(
                    userId,
                    memories,
                    message
                );


            if (directReply) {

                await saveConversation(
                    userId,
                    "assistant",
                    directReply
                );


                return res
                    .status(200)
                    .json({

                        ok:
                            true,

                        reply:
                            directReply,

                        intent:
                            "memory_query",

                        model:
                            "neon-memory",

                        vision:
                            false,

                        memory:
                            true,

                        memorySaved:
                            false,

                        savedMemory:
                            null,

                        userId

                    });

            }

        }


        /* =================================================
           MEMORY CONTEXT
        ================================================= */

        const memoryContext =
            buildMemoryContext(
                memories
            );


        /* =================================================
           LOAD HISTORY
        ================================================= */

        const history =
            await sql`

                SELECT
                    role,
                    message

                FROM conversations

                WHERE user_id =
                    ${userId}

                ORDER BY
                    created_at DESC

                LIMIT 40

            `;


        const historyMessages =
            history
                .reverse()
                .map(
                    item => ({

                        role:
                            item.role,

                        content:
                            item.message

                    })
                );


        /* =================================================
           SYSTEM PROMPT
        ================================================= */

        const systemPrompt =
            buildSystemPrompt(
                intent,
                memoryContext
            ) +
            buildWeatherContext(
                weather
            );


        /* =================================================
           USER CONTENT
        ================================================= */

        let userContent;


        if (image) {

            userContent = [

                {

                    type:
                        "text",

                    text:
                        message ||
                        "इस image को ध्यान से analyse करो।"

                },

                {

                    type:
                        "image_url",

                    image_url: {

                        url:
                            image

                    }

                }

            ];

        } else {

            userContent =
                message;

        }


        /* =================================================
           CURRENT MESSAGE REMOVE
        ================================================= */

        const previousMessages =
            historyMessages.slice(
                0,
                -1
            );


        /* =================================================
           FINAL MESSAGES
        ================================================= */

        const messages = [

            {

                role:
                    "system",

                content:
                    systemPrompt

            },

            ...previousMessages,

            {

                role:
                    "user",

                content:
                    userContent

            }

        ];


        /* =================================================
           MODEL
        ================================================= */

        let model =
            TEXT_MODEL;


        if (
            intent === "vision" ||
            intent === "trading_vision"
        ) {

            model =
                VISION_MODEL;

        }


        /* =================================================
           GROQ AI
        ================================================= */

        const reply =
            await askGroq({

                apiKey,

                model,

                messages

            });


        /* =================================================
           SAVE AI MESSAGE
        ================================================= */

        await saveConversation(
            userId,
            "assistant",
            reply
        );


        /* =================================================
           RESPONSE
        ================================================= */

        return res
            .status(200)
            .json({

                ok:
                    true,

                reply,

                intent,

                model,

                vision:
                    Boolean(image),

                memory:
                    true,

                memorySaved,

                savedMemory:
                    extractedMemory || null,

                userId

            });


    } catch (error) {

        console.error(
            "KAIRA SERVER ERROR:",
            error
        );


        return res
            .status(500)
            .json({

                ok:
                    false,

                error:
                    "KAIRA server error: " +
                    (
                        error?.message ||
                        "Unknown error"
                    )

            });

    }

}
