/**
 * =====================================================
 * KAIRA AI 2.0
 * Brain + Router + Neon Memory + Vision
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

const sql = databaseUrl
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
   INTENT ROUTER
===================================================== */

function detectIntent(message, hasImage) {

    const text =
        message.toLowerCase();


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
            text.includes("ट्रेडिंग")
        ) {

            return "trading_vision";

        }

        return "vision";

    }


    if (
        text.includes("याद रखो") ||
        text.includes("याद रखना") ||
        text.includes("remember") ||
        text.includes("don't forget") ||
        text.includes("मत भूलना")
    ) {

        return "memory";

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
   SYSTEM BRAIN
===================================================== */

function buildSystemPrompt(intent) {

    return `

You are KAIRA.

You are not merely a chatbot.

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

Never claim an action was completed unless the system
actually performed that action.

=====================================================
LANGUAGE
=====================================================

If the user speaks Hindi/Hinglish:
reply naturally in Hindi/Hinglish.

If English:
reply in English.

Do not unnecessarily translate.

=====================================================
MEMORY
=====================================================

Previous conversation may be supplied.

Use it when relevant.

Never invent memories.

If the user says something like:

"याद रखो..."

treat it as information the user wants KAIRA
to remember.

=====================================================
VISION
=====================================================

If an image is supplied:

- inspect carefully
- describe visible information
- do not hallucinate
- clearly separate observation from inference

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

Avoid unnecessary repetition.

For simple questions:
keep the answer concise.

For complex questions:
use clear sections and bullet points.

`;
}


/* =====================================================
   WEATHER CONTEXT
===================================================== */

function buildWeatherContext(weather) {

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
        data?.choices?.[0]?.message?.content;


    if (!reply) {

        throw new Error(
            "AI ने कोई जवाब नहीं दिया।"
        );

    }


    return reply;

}


/* =====================================================
   HANDLER
===================================================== */

export default async function handler(req, res) {

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


    if (req.method === "OPTIONS") {

        return res.status(200).end();

    }


    if (req.method !== "POST") {

        return res.status(405).json({

            error:
                "Only POST requests are allowed."

        });

    }


    /* =================================================
       ENV
    ================================================= */

    const apiKey =
        process.env.GROQ_API_KEY;


    if (!apiKey) {

        return res.status(500).json({

            error:
                "GROQ_API_KEY नहीं मिली।"

        });

    }


    if (!sql) {

        return res.status(500).json({

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
            cleanText(body.userId) ||
            "default-user";


        /* =================================================
           USER CREATE
        ================================================= */

        await sql`

            INSERT INTO users (user_id)

            VALUES (${userId})

            ON CONFLICT (user_id)
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


            return res.status(200).json({

                ok: true,

                history:
                    history.map(item => ({

                        id:
                            item.id,

                        role:
                            item.role,

                        message:
                            item.message,

                        created_at:
                            item.created_at

                    }))

            });

        }


        /* =================================================
           INPUT
        ================================================= */

        const message =
            cleanText(body.message);


        const image =
            typeof body.image === "string" &&
            body.image.startsWith("data:image/")
                ? body.image
                : null;


        const weather =
            body.weather || null;


        if (!message && !image) {

            return res.status(400).json({

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
           LOAD MEMORY
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


        const memory =
            history
                .reverse()
                .map(item => ({

                    role:
                        item.role,

                    content:
                        item.message

                }));


        /* =================================================
           SYSTEM
        ================================================= */

        const systemPrompt =
            buildSystemPrompt(intent) +
            buildWeatherContext(weather);


        /* =================================================
           USER CONTENT
        ================================================= */

        let userContent;


        if (image) {

            userContent = [

                {

                    type: "text",

                    text:
                        message ||
                        "इस image को ध्यान से analyse करो।"

                },

                {

                    type: "image_url",

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
           REMOVE CURRENT USER FROM MEMORY
        ================================================= */

        const previousMessages =
            memory.slice(0, -1);


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
           MODEL ROUTING
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
           SAVE AI MEMORY
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
           SUCCESS
        ================================================= */

        return res.status(200).json({

            ok: true,

            reply,

            intent,

            model,

            vision:
                Boolean(image),

            memory:
                true,

            userId

        });


    } catch (error) {

        console.error(
            "KAIRA SERVER ERROR:",
            error
        );


        return res.status(500).json({

            error:
                "KAIRA server error: " +
                (
                    error?.message ||
                    "Unknown error"
                )

        });

    }

    }
