/**
 * =====================================================
 * KAIRA AI 3.1
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
   INTENT DETECTION
===================================================== */

function detectIntent(message, hasImage) {

    const text =
        cleanText(message).toLowerCase();


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
        text.includes("what is my name") ||
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


    /* =================================================
       NAME
    ================================================= */

    const namePatterns = [

        /मेरा\s+नाम\s+(.+?)\s+है(?:\s*,?\s*इसे\s+याद\s+रखो)?[।.!]?$/iu,

        /मेरा\s+नाम\s+(.+?)(?:\s*,?\s*इसे\s+याद\s+रखो)[।.!]?$/iu,

        /my\s+name\s+is\s+(.+?)(?:\s*,?\s*remember\s+(?:it|this))?[.!]?$/i,

        /i\s+am\s+(.+?)(?:\s*,?\s*remember\s+(?:it|this))?[.!]?$/i

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
                        /इसे\s+याद\s+रखो/giu,
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
                    .trim();


            if (name) {

                return {
                    key: "name",
                    value: name
                };

            }

        }

    }


    /* =================================================
       PREFERENCE
    ================================================= */

    const preferencePatterns = [

        /मुझे\s+(.+?)\s+पसंद\s+है/iu,

        /मुझे\s+(.+?)\s+अच्छा\s+लगता\s+है/iu,

        /i\s+like\s+(.+)/i,

        /my\s+favorite\s+is\s+(.+)/i

    ];


    for (
        const pattern of preferencePatterns
    ) {

        const match =
            text.match(pattern);


        if (match) {

            return {

                key:
                    "preference",

                value:
                    cleanText(match[1])

            };

        }

    }


    /* =================================================
       GOAL
    ================================================= */

    const goalPatterns = [

        /मेरा\s+goal\s+(.+)/iu,

        /मेरा\s+लक्ष्य\s+(.+)/iu,

        /my\s+goal\s+is\s+(.+)/i

    ];


    for (
        const pattern of goalPatterns
    ) {

        const match =
            text.match(pattern);


        if (match) {

            return {

                key:
                    "goal",

                value:
                    cleanText(match[1])

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

    const rows =
        await sql`
            SELECT
                memory_key,
                memory_value
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
CURRENT WEATHER:

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

You are a personal AI assistant.

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

Never pretend to be human.

Never invent information.

Never claim an action was completed unless
the system actually performed it.

=====================================================
LANGUAGE
=====================================================

If the user speaks Hindi/Hinglish:

Reply naturally in Hindi/Hinglish.

If the user speaks English:

Reply in English.

=====================================================
MEMORY
=====================================================

${memoryContext}

Use saved memory when relevant.

If the user's name is saved,
you may naturally call them by their name.

If the user asks:

"मेरा नाम क्या है?"

"What is my name?"

use the saved memory.

If no name is saved,
honestly say you don't know.

Never invent the user's name.

=====================================================
VISION
=====================================================

If an image is provided:

- inspect carefully
- describe visible information
- don't hallucinate
- separate observation from inference

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
- risk/reward
- possible scenarios

Never guarantee profit.

Never claim a trade is 100% certain.

=====================================================
CURRENT INTENT
=====================================================

${intent}

=====================================================
STYLE
=====================================================

Simple question:
give a concise answer.

Complex question:
use sections and bullet points.

Be helpful without unnecessary repetition.

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


    const data =
        await response.json();


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


    /* =================================================
       API KEY
    ================================================= */

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


    /* =================================================
       DATABASE CHECK
    ================================================= */

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


        /* =================================================
           USER ID
        ================================================= */

        const userId =
            cleanText(
                body.userId
            ) ||
            "default-user";


        /* =================================================
           USER CREATE
        ================================================= */

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

                    history

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

                    memories

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
           LOAD MEMORIES
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
           CURRENT MESSAGE REMOVE
        ================================================= */

        const previousMessages =
            historyMessages.slice(
                0,
                -1
            );


        /* =================================================
           FINAL MESSAGE ARRAY
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
           AI
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

                error:
                    "KAIRA server error: " +
                    (
                        error?.message ||
                        "Unknown error"
                    )

            });

    }

                          }
