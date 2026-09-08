/**
 * KAIRA AI
 * Groq + Neon Permanent Memory
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
   HANDLER
===================================================== */

export default async function handler(req, res) {

    /* -------------------------------------------------
       CORS
    ------------------------------------------------- */

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
       API KEY
    ================================================= */

    const apiKey =
        process.env.GROQ_API_KEY;


    if (!apiKey) {

        return res.status(500).json({
            error:
                "GROQ_API_KEY Vercel Environment Variables में नहीं मिली।"
        });

    }


    /* =================================================
       DATABASE
    ================================================= */

    if (!sql) {

        return res.status(500).json({
            error:
                "Neon database connection variable नहीं मिली।"
        });

    }


    try {

        const body =
            req.body || {};


        const userId =
            typeof body.userId === "string" &&
            body.userId.trim()
                ? body.userId.trim()
                : "default-user";


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
           HISTORY REQUEST
        ================================================= */

        if (body.action === "history") {

            const history =
                await sql`
                    SELECT
                        id,
                        role,
                        message,
                        created_at
                    FROM conversations
                    WHERE user_id = ${userId}
                    ORDER BY created_at ASC
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
           NORMAL MESSAGE
        ================================================= */

        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";


        const weather =
            body.weather || null;


        const image =
            typeof body.image === "string" &&
            body.image.startsWith("data:image/")
                ? body.image
                : null;


        if (!message && !image) {

            return res.status(400).json({
                error:
                    "Message या image जरूरी है।"
            });

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
           GET MEMORY
        ================================================= */

        const history =
            await sql`
                SELECT
                    role,
                    message
                FROM conversations
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
                LIMIT 30
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
           SYSTEM PROMPT
        ================================================= */

        const systemPrompt = `

You are KAIRA, a powerful personal AI assistant.

PERSONALITY:
- Helpful
- Smart
- Friendly
- Caring
- Natural
- Fast
- Confident
- Respectful

LANGUAGE:
- If user speaks Hindi/Hinglish, reply naturally in Hindi/Hinglish.
- If user speaks English, reply in English.
- Do not unnecessarily translate everything.

MEMORY:
- You have access to previous conversations.
- Use previous information when it is relevant.
- If the user previously told you their name or preference, use it naturally.
- Never invent memories.
- Do not reveal internal database information.

IMPORTANT:
- Never claim you performed an action you cannot actually perform.
- Never expose API keys, passwords or secrets.
- Answer directly.
- Do not unnecessarily repeat the question.
- Keep normal answers concise unless the user asks for detail.

VISION:
If an image is supplied:
- Carefully inspect it.
- Describe only what can actually be seen.
- Do not invent details.

You are running inside the KAIRA web application.

Your goal is to behave like a personal AI assistant.
`;


        /* =================================================
           WEATHER
        ================================================= */

        let weatherText = "";


        if (weather) {

            const current =
                weather.current || {};


            weatherText = `

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

Use this information when weather is relevant.
`;

        }


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
                        "इस image को ध्यान से देखकर बताओ कि इसमें क्या दिखाई दे रहा है।"

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
           AI MESSAGES
        ================================================= */

        const messages = [

            {
                role:
                    "system",

                content:
                    systemPrompt +
                    weatherText

            },

            ...memory.slice(0, -1),

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

        const model =
            image
                ? VISION_MODEL
                : TEXT_MODEL;


        /* =================================================
           GROQ REQUEST
        ================================================= */

        const groqResponse =
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
                                2048,

                            stream:
                                false

                        })

                }
            );


        const data =
            await groqResponse.json();


        /* =================================================
           GROQ ERROR
        ================================================= */

        if (!groqResponse.ok) {

            console.error(
                "Groq API Error:",
                data
            );


            const apiMessage =
                data?.error?.message ||
                data?.error ||
                "Groq API request failed.";


            return res.status(
                groqResponse.status
            ).json({

                error:
                    "KAIRA AI error: " +
                    apiMessage

            });

        }


        /* =================================================
           AI REPLY
        ================================================= */

        const reply =
            data?.choices?.[0]?.message?.content;


        if (!reply) {

            return res.status(502).json({

                error:
                    "AI ने कोई जवाब नहीं दिया।"

            });

        }


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
           SUCCESS
        ================================================= */

        return res.status(200).json({

            ok:
                true,

            reply:
                reply,

            model:
                model,

            vision:
                Boolean(image),

            memory:
                true,

            userId:
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
