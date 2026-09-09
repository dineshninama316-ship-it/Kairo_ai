/**
 * =====================================================
 * KAIRA AI 3.0
 * Groq + Neon Conversations + Permanent Memory + Vision
 * =====================================================
 */

import { neon } from "@neondatabase/serverless";

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
   INTENT
===================================================== */

function detectIntent(message, hasImage) {

    const text =
        (message || "").toLowerCase();


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
            text.includes("चार्ट") ||
            text.includes("ट्रेडिंग") ||
            text.includes("सपोर्ट") ||
            text.includes("रेजिस्टेंस")
        ) {

            return "trading_vision";

        }

        return "vision";

    }


    if (
        text.includes("याद रखो") ||
        text.includes("याद रखना") ||
        text.includes("याद रख") ||
        text.includes("remember") ||
        text.includes("don't forget") ||
        text.includes("मत भूलना")
    ) {

        return "memory";

    }


    if (
        text.includes("मेरा नाम") ||
        text.includes("my name") ||
        text.includes("मुझे क्या पसंद") ||
        text.includes("मैं कौन") ||
        text.includes("मेरे बारे में")
    ) {

        return "memory_query";

    }


    if (
        text.includes("मौसम") ||
        text.includes("weather") ||
        text.includes("temperature") ||
        text.includes("तापमान")
    ) {

        return "weather";

    }


    if (
        text.includes("trading") ||
        text.includes("trade") ||
        text.includes("stock") ||
        text.includes("crypto") ||
        text.includes("forex") ||
        text.includes("nifty") ||
        text.includes("banknifty") ||
        text.includes("bitcoin") ||
        text.includes("शेयर") ||
        text.includes("ट्रेडिंग")
    ) {

        return "trading";

    }


    return "chat";

}


/* =====================================================
   MEMORY EXTRACTION
===================================================== */

function extractMemory(message) {

    const text =
        cleanText(message);


    if (!text) {
        return null;
    }


    /* -----------------------------------------------
       NAME
    ------------------------------------------------ */

    const namePatterns = [

        /मेरा नाम\s+(.+?)(?:\s+है)?$/i,

        /मेरा नाम\s+(.+?)\s+है/i,

        /my name is\s+(.+)/i,

        /i am\s+(.+)/i,

        /मैं\s+(.+?)\s+हूँ/i,

        /mai\s+(.+?)\s+hu/i

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
                        /याद रखो.*$/i,
                        ""
                    )
                    .replace(
                        /याद रखना.*$/i,
                        ""
                    )
                    .trim();


            if (name.length > 0) {

                return {
                    key: "name",
                    value: name
                };

            }

        }

    }


    /* -----------------------------------------------
       LIKES
    ------------------------------------------------ */

    const likePatterns = [

        /मुझे\s+(.+?)\s+पसंद\s+है/i,

        /मुझे\s+(.+?)\s+पसंद\s+है.*याद/i,

        /i like\s+(.+)/i,

        /my favorite\s+(.+)/i

    ];


    for (
        const pattern of likePatterns
    ) {

        const match =
            text.match(pattern);


        if (match) {

            return {
                key: "preference",
                value: cleanText(match[1])
            };

        }

    }


    /* -----------------------------------------------
       GOAL
    ------------------------------------------------ */

    const goalPatterns = [

        /मेरा goal\s+(.+)/i,

        /मेरा लक्ष्य\s+(.+)/i,

        /मेरा उद्देश्य\s+(.+)/i,

        /my goal is\s+(.+)/i

    ];


    for (
        const pattern of goalPatterns
    ) {

        const match =
            text.match(pattern);


        if (match) {

            return {
                key: "goal",
                value: cleanText(match[1])
            };

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
        !memory ||
        !memory.key ||
        !memory.value
    ) {

        return;

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

}


/* =====================================================
   LOAD MEMORIES
===================================================== */

async function loadMemories(userId) {

    if (!sql) {
        return [];
    }


    const memories =
        await sql`
            SELECT
                memory_key,
                memory_value
            FROM memories
            WHERE user_id = ${userId}
            ORDER BY updated_at DESC
        `;


    return memories;

}


/* =====================================================
   MEMORY PROMPT
===================================================== */

function buildMemoryContext(
    memories
) {

    if (
        !memories ||
        memories.length === 0
    ) {

        return `
USER MEMORY

No saved memories yet.
`;

    }


    let result = `
USER MEMORY

The following information has been explicitly
saved for this user.

Use it naturally when relevant.

`;


    for (
        const memory of memories
    ) {

        result +=
            `- ${memory.memory_key}: ${memory.memory_value}\n`;

    }


    return result;

}


/* =====================================================
   WEATHER
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
CURRENT WEATHER DATA

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

Use this only when relevant.
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

You are the intelligent core of a personal AI assistant.

=====================================================
IDENTITY
=====================================================

Name:
KAIRA

Role:
Personal AI assistant.

Personality:

- intelligent
- friendly
- caring
- natural
- confident
- respectful
- helpful
- honest

Never pretend to be human.

Never claim an action was completed unless
the system actually performed that action.

=====================================================
LANGUAGE
=====================================================

If the user speaks Hindi/Hinglish:

Reply naturally in Hindi/Hinglish.

If the user speaks English:

Reply in English.

Do not unnecessarily translate.

=====================================================
PERMANENT MEMORY
=====================================================

${memoryContext}

IMPORTANT:

The USER MEMORY section contains information
explicitly saved for this user.

Use it when relevant.

If the user asks:

"मेरा नाम क्या है?"

or:

"What is my name?"

answer using saved memory.

Never invent a memory.

If no memory exists, honestly say that you
don't have that information.

=====================================================
MEMORY REQUESTS
=====================================================

If the user explicitly asks KAIRA to remember
something, the server may save it to Neon.

Do not claim something was permanently saved
unless the server actually saved it.

=====================================================
VISION
=====================================================

If an image is supplied:

- inspect it carefully
- describe visible information
- do not hallucinate
- separate observation from inference

=====================================================
TRADING
=====================================================

When analysing trading:

You may discuss:

- trend
- market structure
- support
- resistance
- Fibonacci
- candlestick patterns
- volume when visible
- risk/reward
- possible scenarios

Never guarantee profit.

Never say a trade is certain.

Never claim:

"100% win"

"guaranteed profit"

or

"certain trade".

If chart information is insufficient,
say what information is missing.

=====================================================
CURRENT INTENT
=====================================================

${intent}

=====================================================
RESPONSE STYLE
=====================================================

Be direct.

For simple questions:
keep the answer concise.

For complex questions:
use clear sections and bullets.

Use the user's saved name naturally,
but don't repeat it in every message.

`;
}


/* =====================================================
   GROQ
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

                method: "POST",

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


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "Groq error:",
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
   MAIN HANDLER
===================================================== */

export default async function handler(
    req,
    res
) {

    /* -----------------------------------------------
       CORS
    ------------------------------------------------ */

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


    if (
        req.method === "OPTIONS"
    ) {

        return res
            .status(200)
            .end();

    }


    if (
        req.method !== "POST"
    ) {

        return res
            .status(405)
            .json({

                error:
                    "Only POST requests are allowed."

            });

    }


    /* -----------------------------------------------
       API KEY
    ------------------------------------------------ */

    const apiKey =
        process.env.GROQ_API_KEY;


    if (!apiKey) {

        return res
            .status(500)
            .json({

                error:
                    "GROQ_API_KEY नहीं मिली।"

            });

    }


    /* -----------------------------------------------
       DATABASE
    ------------------------------------------------ */

    if (!sql) {

        return res
            .status(500)
            .json({

                error:
                    "Neon database connection नहीं मिली।"

            });

    }


    try {

        const body =
            req.body || {};


        const userId =
            cleanText(
                body.userId
            ) ||
            "default-user";


        /* -------------------------------------------
           ENSURE USER
        ------------------------------------------- */

        await sql`
            INSERT INTO users
            (user_id)
            VALUES
            (${userId})

            ON CONFLICT
            (user_id)

            DO NOTHING
        `;


        /* =================================================
           HISTORY
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

                    ok: true,

                    history:
                        history.map(
                            item => ({

                                id:
                                    item.id,

                                role:
                                    item.role,

                                message:
                                    item.message,

                                created_at:
                                    item.created_at

                            })
                        )

                });

        }


        /* =================================================
           MEMORIES
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

                    ok: true,

                    memories

                });

        }


        /* -----------------------------------------------
           MESSAGE
        ------------------------------------------------ */

        const message =
            cleanText(
                body.message
            );


        /* -----------------------------------------------
           IMAGE
        ------------------------------------------------ */

        const image =
            typeof body.image === "string" &&
            body.image.startsWith(
                "data:image/"
            )
                ? body.image
                : null;


        /* -----------------------------------------------
           WEATHER
        ------------------------------------------------ */

        const weather =
            body.weather || null;


        if (
            !message &&
            !image
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Message या image जरूरी है।"

                });

        }


        /* -----------------------------------------------
           INTENT
        ------------------------------------------------ */

        const intent =
            detectIntent(
                message,
                Boolean(image)
            );


        /* =================================================
           EXPLICIT MEMORY SAVE
        ================================================= */

        const extractedMemory =
            extractMemory(
                message
            );


        let memorySaved =
            false;


        if (
            extractedMemory
        ) {

            await saveMemory(
                userId,
                extractedMemory
            );


            memorySaved =
                true;

        }


        /* =================================================
           USER MESSAGE SAVE
        ================================================= */

        if (message) {

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
                    'user',
                    ${message}
                )
            `;

        }


        /* =================================================
           LOAD MEMORY
        ================================================= */

        const memories =
            await loadMemories(
                userId
            );


        const memoryContext =
            buildMemoryContext(
                memories
            );


        /* =================================================
           LOAD CHAT HISTORY
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


        const memoryMessages =
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
           SYSTEM
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
           REMOVE CURRENT USER MESSAGE
        ================================================= */

        const previousMessages =
            memoryMessages.slice(
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
           AI RESPONSE
        ================================================= */

        const reply =
            await askGroq({

                apiKey,

                model,

                messages

            });


        /* =================================================
           SAVE AI RESPONSE
        ================================================= */

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
                'assistant',
                ${reply}
            )
        `;


        /* =================================================
           RESPONSE
        ================================================= */

        return res
            .status(200)
            .json({

                ok: true,

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

                error:
                    "KAIRA server error: " +
                    (
                        error?.message ||
                        "Unknown error"
                    )

            });

    }

        }
