/**
 * =========================================================
 * KAIRA AI — STABLE BACKEND v6
 * =========================================================
 *
 * Groq + Neon
 * ✅ Permanent Memory
 * ✅ Name Memory
 * ✅ Multiple Preferences
 * ✅ Goals
 * ✅ About User
 * ✅ Chat History
 * ✅ Weather Context
 * ✅ Trading Context
 * ✅ Vision
 * ✅ Single User ID Protection
 * ✅ Fresh Memory Reload
 * ✅ Memory Diagnostics
 * =========================================================
 */

import { neon } from "@neondatabase/serverless";

/* =========================================================
   CONFIG
========================================================= */

const GROQ_URL =
    "https://api.groq.com/openai/v1/chat/completions";

const TEXT_MODEL =
    "openai/gpt-oss-120b";

const VISION_MODEL =
    "qwen/qwen3.6-27b";

/*
 * अभी KAIRA single-user mode में है।
 *
 * Frontend चाहे कोई भी userId भेजे,
 * backend हमेशा इसी user की memory इस्तेमाल करेगा।
 *
 * इससे userId mismatch की समस्या खत्म होगी।
 */
const KAIRA_USER_ID = "test-user";


/* =========================================================
   DATABASE
========================================================= */

const DATABASE_URL =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

if (!DATABASE_URL) {
    throw new Error(
        "DATABASE_URL is not configured."
    );
}

const sql = neon(DATABASE_URL);


/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanText(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value).trim();
}


function normalizeText(text) {

    return cleanText(text)
        .toLowerCase()
        .replace(/[।!?,"'`]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function safeJsonParse(text) {

    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}


/* =========================================================
   USER ID
========================================================= */

function getUserId() {

    /*
     * IMPORTANT:
     * अभी single-user system है।
     *
     * Frontend से आने वाले userId को ignore करके
     * हमेशा test-user इस्तेमाल करेंगे।
     */

    return KAIRA_USER_ID;
}


/* =========================================================
   CORS
========================================================= */

function corsHeaders() {

    return {

        "Access-Control-Allow-Origin": "*",

        "Access-Control-Allow-Methods":
            "POST, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type",

        "Access-Control-Max-Age":
            "86400"
    };
}


/* =========================================================
   RESPONSE
========================================================= */

function jsonResponse(
    body,
    status = 200
) {

    return new Response(
        JSON.stringify(body),
        {
            status,

            headers: {
                "Content-Type":
                    "application/json",

                "Cache-Control":
                    "no-store",

                ...corsHeaders()
            }
        }
    );
}


/* =========================================================
   INTENT DETECTION
========================================================= */

function detectIntent(
    message,
    hasImage = false
) {

    const text =
        normalizeText(message);


    /* =========================
       VISION
    ========================= */

    if (hasImage) {
        return "vision";
    }


    /* =========================
       MEMORY QUERY
    ========================= */

    if (

        text.includes("मेरा नाम क्या") ||

        text.includes("मेरा नाम कौन") ||

        (
            text.includes("मेरा नाम") &&
            text.includes("क्या है")
        ) ||

        text.includes("मुझे क्या पसंद") ||

        text.includes("मेरे को क्या पसंद") ||

        text.includes("मेरी पसंद") ||

        text.includes("मैं क्या पसंद") ||

        text.includes("मेरा goal") ||

        text.includes("मेरा गोल") ||

        text.includes("मेरा लक्ष्य") ||

        text.includes("मेरे बारे में") ||

        text.includes("मेरे बारे मे") ||

        text.includes("आप मेरे बारे में क्या जानते") ||

        text.includes("what is my name") ||

        text.includes("what do i like") ||

        text.includes("what are my preferences") ||

        text.includes("what is my goal") ||

        text.includes("what do you know about me")

    ) {

        return "memory_query";
    }


    /* =========================
       MEMORY SAVE
    ========================= */

    if (

        text.includes("याद रखना") ||

        text.includes("याद रखो") ||

        text.includes("याद रख") ||

        text.includes("याद रखना है") ||

        text.includes("इसे याद") ||

        text.includes("इसे याद रखना") ||

        text.includes("इसे याद रखो") ||

        text.includes("remember this") ||

        text.includes("remember it") ||

        text.includes("save this") ||

        text.includes("don't forget") ||

        text.includes("dont forget")

    ) {

        return "memory";
    }


    /* =========================
       WEATHER
    ========================= */

    if (

        text.includes("मौसम") ||

        text.includes("weather") ||

        text.includes("बारिश") ||

        text.includes("तापमान") ||

        text.includes("temperature")

    ) {

        return "weather";
    }


    /* =========================
       TRADING
    ========================= */

    if (

        text.includes("trading") ||
        text.includes("trade") ||
        text.includes("forex") ||
        text.includes("crypto") ||
        text.includes("bitcoin") ||
        text.includes("btc") ||
        text.includes("eth") ||
        text.includes("nifty") ||
        text.includes("banknifty") ||
        text.includes("sensex") ||
        text.includes("support") ||
        text.includes("resistance") ||
        text.includes("fibonacci") ||
        text.includes("chart") ||
        text.includes("candlestick") ||
        text.includes("buy") ||
        text.includes("sell") ||
        text.includes("long") ||
        text.includes("short") ||
        text.includes("indicator") ||
        text.includes("rsi") ||
        text.includes("macd")

    ) {

        return "trading";
    }


    return "chat";
}


/* =========================================================
   REMOVE MEMORY COMMAND
========================================================= */

function removeRememberWords(text) {

    return cleanText(text)

        .replace(
            /इसे\s+याद\s+रखना\s+है/giu,
            ""
        )

        .replace(
            /इसे\s+याद\s+रखना/giu,
            ""
        )

        .replace(
            /इसे\s+याद\s+रखो/giu,
            ""
        )

        .replace(
            /इसे\s+याद\s+रख/giu,
            ""
        )

        .replace(
            /याद\s+रखना\s+है/giu,
            ""
        )

        .replace(
            /याद\s+रखना/giu,
            ""
        )

        .replace(
            /याद\s+रखो/giu,
            ""
        )

        .replace(
            /याद\s+रख/giu,
            ""
        )

        .replace(
            /remember\s+this/gi,
            ""
        )

        .replace(
            /remember\s+it/gi,
            ""
        )

        .replace(
            /save\s+this/gi,
            ""
        )

        .replace(
            /don't\s+forget/gi,
            ""
        )

        .replace(
            /dont\s+forget/gi,
            ""
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();
}


/* =========================================================
   NORMALIZE MEMORY VALUE
========================================================= */

function normalizeMemoryValue(value) {

    return cleanText(value)

        .replace(
            /^[\s:：\-]+/,
            ""
        )

        .replace(
            /[।.!?]+$/g,
            ""
        )

        .trim();
}


/* =========================================================
   MEMORY EXTRACTION
========================================================= */

function extractMemory(message) {

    const original =
        cleanText(message);

    if (!original) {
        return null;
    }


    const text =
        removeRememberWords(original);

    if (!text) {
        return null;
    }


    /* =====================================================
       NAME — HINDI
    ===================================================== */

    let match =
        text.match(
            /^मेरा\s+नाम\s*(?:है\s*)?[:\-]?\s*(.+?)\s*$/iu
        );

    if (match) {

        let value =
            normalizeMemoryValue(
                match[1]
            );

        value =
            value.replace(
                /\s+(है|हूँ|हूं|हो)$/iu,
                ""
            ).trim();

        if (value) {

            return {
                key: "name",
                value
            };
        }
    }


    /* =====================================================
       NAME — ENGLISH
    ===================================================== */

    match =
        text.match(
            /^my\s+name\s+is\s+(.+)$/i
        );

    if (match) {

        const value =
            normalizeMemoryValue(
                match[1]
            );

        if (value) {

            return {
                key: "name",
                value
            };
        }
    }


    /* =====================================================
       "I AM AJAY"
    ===================================================== */

    match =
        text.match(
            /^(?:i\s+am|i'm)\s+(.+)$/i
        );

    if (match) {

        const value =
            normalizeMemoryValue(
                match[1]
            );

        if (value) {

            return {
                key: "name",
                value
            };
        }
    }


    /* =====================================================
       PREFERENCE PATTERNS
    ===================================================== */

    const preferencePatterns = [

        /^मुझे\s+(.+?)\s+पसंद\s+है$/iu,

        /^मेरे\s+को\s+(.+?)\s+पसंद\s+है$/iu,

        /^मेरी\s+पसंद\s+(.+)$/iu,

        /^मैं\s+(.+?)\s+पसंद\s+करता\s+हूँ$/iu,

        /^मैं\s+(.+?)\s+पसंद\s+करता\s+हूं$/iu,

        /^मैं\s+(.+?)\s+पसंद\s+करता$/iu,

        /^i\s+like\s+(.+)$/i,

        /^i\s+love\s+(.+)$/i,

        /^my\s+favorite\s+is\s+(.+)$/i,

        /^my\s+favourite\s+is\s+(.+)$/i
    ];


    for (
        const pattern
        of preferencePatterns
    ) {

        const found =
            text.match(pattern);

        if (!found) {
            continue;
        }


        const value =
            normalizeMemoryValue(
                found[1]
            );

        if (!value) {
            continue;
        }


        /*
         * Preference key सुरक्षित तरीके से बनाना।
         */

        const normalizedValue =
            value
                .toLowerCase()
                .replace(
                    /[^a-z0-9\u0900-\u097F]+/gi,
                    "_"
                )
                .replace(
                    /^_+|_+$/g,
                    ""
                )
                .slice(0, 60);


        return {

            key:
                `preference_${normalizedValue || "general"}`,

            value
        };
    }


    /* =====================================================
       GOAL
    ===================================================== */

    const goalPatterns = [

        /^मेरा\s+goal\s*(?:है)?\s*(.+)$/iu,

        /^मेरा\s+गोल\s*(?:है)?\s*(.+)$/iu,

        /^मेरा\s+लक्ष्य\s*(?:है)?\s*(.+)$/iu,

        /^my\s+goal\s+is\s+(.+)$/i,

        /^i\s+want\s+to\s+(.+)$/i
    ];


    for (
        const pattern
        of goalPatterns
    ) {

        const found =
            text.match(pattern);

        if (!found) {
            continue;
        }


        const value =
            normalizeMemoryValue(
                found[1]
            );

        if (value) {

            return {

                key: "goal",

                value
            };
        }
    }


    return null;
}


/* =========================================================
   SAVE MEMORY
========================================================= */

async function saveMemory(
    userId,
    memory
) {

    if (
        !memory?.key ||
        !memory?.value
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


/* =========================================================
   LOAD MEMORY
========================================================= */

async function loadMemories(
    userId
) {

    const rows =
        await sql`

            SELECT
                id,
                user_id,
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

    return Array.isArray(rows)
        ? rows
        : [];
}


/* =========================================================
   MEMORY CONTEXT
========================================================= */

function buildMemoryContext(
    memories
) {

    if (
        !Array.isArray(memories) ||
        memories.length === 0
    ) {

        return (
            "कोई permanent memory उपलब्ध नहीं है।"
        );
    }


    return memories

        .filter(
            item =>
                item?.memory_key &&
                item?.memory_value
        )

        .map(
            item =>
                `${item.memory_key}: ${item.memory_value}`
        )

        .join("\n");
}


/* =========================================================
   MEMORY DEBUG SUMMARY
========================================================= */

function buildMemoryDebug(
    memories
) {

    const rows =
        Array.isArray(memories)
            ? memories
            : [];


    const name =
        rows.find(
            item =>
                item.memory_key === "name"
        )?.memory_value || null;


    const preferences =
        rows

            .filter(
                item =>
                    typeof item?.memory_key === "string" &&
                    item.memory_key.startsWith(
                        "preference_"
                    )
            )

            .map(
                item =>
                    cleanText(
                        item.memory_value
                    )
            )

            .filter(Boolean);


    const goal =
        rows.find(
            item =>
                item.memory_key === "goal"
        )?.memory_value || null;


    return {

        userId: KAIRA_USER_ID,

        memoryCount:
            rows.length,

        name,

        preferences:
            [...new Set(preferences)],

        goal
    };
}


/* =========================================================
   DIRECT MEMORY ANSWER
========================================================= */

function getDirectMemoryReply(
    message,
    memories
) {

    const text =
        normalizeText(message);


    const rows =
        Array.isArray(memories)
            ? memories
            : [];


    /* =====================================================
       NAME
    ===================================================== */

    const askingName =

        text.includes("मेरा नाम क्या") ||

        text.includes("मेरा नाम कौन") ||

        text.includes("what is my name") ||

        (
            text.includes("मेरा नाम") &&
            text.includes("क्या है")
        );


    if (askingName) {

        const name =
            rows.find(
                item =>
                    item.memory_key === "name"
            );


        if (
            name &&
            cleanText(
                name.memory_value
            )
        ) {

            return (
                `आपका नाम ${name.memory_value} है 😊`
            );
        }


        return (
            "अभी मेरी permanent memory में आपका नाम सेव नहीं है।"
        );
    }


    /* =====================================================
       PREFERENCE
    ===================================================== */

    const askingPreference =

        text.includes("मुझे क्या पसंद") ||

        text.includes("मेरे को क्या पसंद") ||

        text.includes("मेरी पसंद") ||

        text.includes("what do i like") ||

        text.includes("what are my preferences");


    if (askingPreference) {

        const preferences =
            rows

                .filter(
                    item =>
                        typeof item?.memory_key === "string" &&
                        item.memory_key.startsWith(
                            "preference_"
                        )
                )

                .map(
                    item =>
                        cleanText(
                            item.memory_value
                        )
                )

                .filter(Boolean);


        const uniquePreferences =
            [
                ...new Set(preferences)
            ];


        if (
            uniquePreferences.length === 0
        ) {

            return (
                "अभी मेरी permanent memory में आपकी कोई पसंद सेव नहीं है।"
            );
        }


        return (
            `मुझे याद है कि आपको ${uniquePreferences.join(", ")} पसंद है 😊`
        );
    }


    /* =====================================================
       GOAL
    ===================================================== */

    const askingGoal =

        text.includes("मेरा goal") ||

        text.includes("मेरा गोल") ||

        text.includes("मेरा लक्ष्य") ||

        text.includes("what is my goal");


    if (askingGoal) {

        const goal =
            rows.find(
                item =>
                    item.memory_key === "goal"
            );


        if (
            goal &&
            cleanText(
                goal.memory_value
            )
        ) {

            return (
                `आपका goal है: ${goal.memory_value} 🎯`
            );
        }


        return (
            "अभी मेरी permanent memory में आपका goal सेव नहीं है।"
        );
    }


    /* =====================================================
       ABOUT
    ===================================================== */

    const askingAbout =

        text.includes("मेरे बारे में") ||

        text.includes("मेरे बारे मे") ||

        text.includes("आप मेरे बारे में क्या जानते") ||

        text.includes("what do you know about me");


    if (askingAbout) {

        if (!rows.length) {

            return (
                "अभी मेरी permanent memory में आपके बारे में कोई जानकारी सेव नहीं है।"
            );
        }


        const name =
            rows.find(
                item =>
                    item.memory_key === "name"
            )?.memory_value;


        const preferences =
            rows

                .filter(
                    item =>
                        typeof item?.memory_key === "string" &&
                        item.memory_key.startsWith(
                            "preference_"
                        )
                )

                .map(
                    item =>
                        cleanText(
                            item.memory_value
                        )
                )

                .filter(Boolean);


        const goal =
            rows.find(
                item =>
                    item.memory_key === "goal"
            )?.memory_value;


        const parts = [];


        if (name) {

            parts.push(
                `नाम: ${name}`
            );
        }


        if (preferences.length) {

            parts.push(
                `पसंद: ${[
                    ...new Set(preferences)
                ].join(", ")}`
            );
        }


        if (goal) {

            parts.push(
                `Goal: ${goal}`
            );
        }


        if (!parts.length) {

            return (
                "मेरी permanent memory में अभी personal information उपलब्ध नहीं है।"
            );
        }


        return (
            "मुझे आपके बारे में यह याद है:\n\n" +
            parts.join("\n")
        );
    }


    return null;
}


/* =========================================================
   WEATHER
========================================================= */

function buildWeatherContext(
    weather
) {

    if (!weather) {
        return "";
    }


    if (
        typeof weather === "string"
    ) {

        return weather;
    }


    return `

Live Weather:

Location:
${weather.location ||
    weather.city ||
    "Unknown"}

Temperature:
${weather.temperature ??
    weather.temp ??
    "Unknown"}°C

Feels Like:
${weather.feelsLike ??
    "Unknown"}°C

Humidity:
${weather.humidity ??
    "Unknown"}%

Wind:
${weather.wind ??
    "Unknown"}

Weather Code:
${weather.code ??
    weather.weatherCode ??
    weather.weathercode ??
    "Unknown"}

`;
}


/* =========================================================
   SYSTEM PROMPT
========================================================= */

function buildSystemPrompt({
    memoryContext,
    weatherContext,
    intent
}) {

    return `

You are KAIRA AI.

You are the user's personal AI assistant and digital partner.

IDENTITY:

- Your name is KAIRA.
- You are an AI assistant.
- Be friendly, natural and helpful.
- Use Hindi/Hinglish when the user does.
- You may call the user "बॉस" naturally, but do not overuse it.

PERMANENT USER MEMORY:

${memoryContext}

MEMORY RULES:

1. The memory above comes from the user's Neon permanent memory.
2. Treat it as trusted user-provided information.
3. Never invent personal information.
4. Never say you forgot information that is present in memory.
5. If information exists in memory, use it.
6. If information does not exist, honestly say it is not stored.
7. Do not contradict stored memory.
8. Multiple preferences may exist.

WEATHER:

${weatherContext || "No live weather information."}

GENERAL:

- Answer clearly.
- Prefer Hindi/Hinglish for Hindi users.
- Do not unnecessarily repeat questions.
- Never claim an action happened if it did not happen.

TRADING:

- Explain trend, support, resistance, Fibonacci, indicators and risk/reward.
- Never guarantee profit.
- Never claim 100% accuracy.
- Clearly separate analysis from certainty.

VISION:

- Describe only what is actually visible.
- If the image is unclear, say so.

CURRENT INTENT:

${intent}

`;
}


/* =========================================================
   GROQ
========================================================= */

async function askGroq({
    messages,
    model = TEXT_MODEL,
    temperature = 0.7,
    maxTokens = 1400
}) {

    const apiKey =
        process.env.GROQ_API_KEY;


    if (!apiKey) {

        throw new Error(
            "GROQ_API_KEY is not configured."
        );
    }


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

                        temperature,

                        max_tokens:
                            maxTokens
                    })
            }
        );


    const raw =
        await response.text();


    const data =
        safeJsonParse(raw);


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            data?.message ||
            raw ||
            `Groq error ${response.status}`
        );
    }


    const answer =
        data?.choices?.[0]?.message?.content;


    if (!answer) {

        throw new Error(
            "Groq returned empty response."
        );
    }


    return cleanText(answer);
}


/* =========================================================
   CONVERSATION SAVE
========================================================= */

async function saveConversation(
    userId,
    role,
    message
) {

    const text =
        cleanText(message);


    if (!text) {
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
            ${text}
        )

    `;
}


/* =========================================================
   HISTORY
========================================================= */

async function loadHistory(
    userId,
    limit = 20
) {

    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 20,
                1
            ),
            50
        );


    const rows =
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
                created_at DESC

            LIMIT ${safeLimit}

        `;


    return (
        Array.isArray(rows)
            ? rows.reverse()
            : []
    );
}


function buildHistoryMessages(
    history
) {

    if (
        !Array.isArray(history)
    ) {

        return [];
    }


    return history

        .filter(
            item =>
                item?.message &&
                (
                    item.role === "user" ||
                    item.role === "assistant"
                )
        )

        .map(
            item => ({

                role:
                    item.role,

                content:
                    cleanText(
                        item.message
                    )
            })
        );
}


/* =========================================================
   VISION
========================================================= */

function isValidImage(
    image
) {

    if (
        !image ||
        typeof image !== "string"
    ) {

        return false;
    }


    return (

        image.startsWith(
            "data:image/"
        ) ||

        image.startsWith(
            "https://"
        ) ||

        image.startsWith(
            "http://"
        )
    );
}


function buildVisionMessage(
    message,
    image
) {

    return {

        role: "user",

        content: [

            {

                type: "text",

                text:
                    message ||
                    "इस image को ध्यान से analyze करके बताओ कि इसमें क्या दिखाई दे रहा है।"
            },

            {

                type: "image_url",

                image_url: {

                    url: image
                }
            }
        ]
    };
}


/* =========================================================
   MAIN HANDLER
========================================================= */

export default async function handler(
    req
) {

    /* =====================================================
       OPTIONS
    ===================================================== */

    if (
        req.method === "OPTIONS"
    ) {

        return new Response(
            null,
            {

                status: 204,

                headers:
                    corsHeaders()
            }
        );
    }


    /* =====================================================
       POST ONLY
    ===================================================== */

    if (
        req.method !== "POST"
    ) {

        return jsonResponse(
            {

                success: false,

                error:
                    "Only POST requests are allowed."
            },

            405
        );
    }


    try {

        /* =================================================
           BODY
        ================================================= */

        const body =
            typeof req.body === "string"
                ? safeJsonParse(req.body)
                : req.body;


        if (
            !body ||
            typeof body !== "object"
        ) {

            return jsonResponse(
                {

                    success: false,

                    error:
                        "Invalid request body."
                },

                400
            );
        }


        /* =================================================
           FORCE SINGLE USER
        ================================================= */

        const userId =
            getUserId();


        /* =================================================
           ACTION
        ================================================= */

        const action =
            cleanText(
                body.action
            ).toLowerCase();


        /* =================================================
           HISTORY ACTION
        ================================================= */

        if (
            action === "history"
        ) {

            const history =
                await loadHistory(
                    userId,
                    body.limit || 30
                );


            return jsonResponse({

                success: true,

                userId,

                history

            });
        }


        /* =================================================
           MEMORY ACTION
        ================================================= */

        if (

            action === "memories" ||

            action === "memory"

        ) {

            const memories =
                await loadMemories(
                    userId
                );


            return jsonResponse({

                success: true,

                userId,

                memories,

                debug:
                    buildMemoryDebug(
                        memories
                    )

            });
        }


        /* =================================================
           MESSAGE
        ================================================= */

        const message =
            cleanText(
                body.message
            );


        const image =
            cleanText(
                body.image
            );


        const hasImage =
            isValidImage(
                image
            );


        if (
            !message &&
            !hasImage
        ) {

            return jsonResponse(
                {

                    success: false,

                    error:
                        "Message or image is required."
                },

                400
            );
        }


        /* =================================================
           LOAD CURRENT MEMORY
        ================================================= */

        let memories =
            await loadMemories(
                userId
            );


        /* =================================================
           INTENT
        ================================================= */

        const intent =
            detectIntent(
                message,
                hasImage
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


            /*
             * Save के तुरंत बाद database से
             * fresh memory reload।
             */

            memories =
                await loadMemories(
                    userId
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
           MEMORY QUERY
        ================================================= */

        if (
            intent === "memory_query"
        ) {

            /*
             * हमेशा fresh Neon data।
             */

            memories =
                await loadMemories(
                    userId
                );


            const directReply =
                getDirectMemoryReply(
                    message,
                    memories
                );


            if (
                directReply
            ) {

                await saveConversation(
                    userId,
                    "assistant",
                    directReply
                );


                return jsonResponse({

                    success: true,

                    reply:
                        directReply,

                    userId,

                    intent,

                    memorySaved,

                    memories,

                    debug:
                        buildMemoryDebug(
                            memories
                        )

                });
            }
        }


        /* =================================================
           MEMORY SAVE RESPONSE
        ================================================= */

        if (
            intent === "memory" &&
            extractedMemory
        ) {

            let reply;


            if (
                extractedMemory.key === "name"
            ) {

                reply =
                    `ठीक है 😊 मैंने याद रख लिया कि आपका नाम ${extractedMemory.value} है।`;

            }

            else if (
                extractedMemory.key === "goal"
            ) {

                reply =
                    `ठीक है 🎯 मैंने आपका goal याद रख लिया: ${extractedMemory.value}`;

            }

            else {

                reply =
                    `ठीक है 😊 मैंने याद रख लिया कि आपको ${extractedMemory.value} पसंद है।`;
            }


            await saveConversation(
                userId,
                "assistant",
                reply
            );


            return jsonResponse({

                success: true,

                reply,

                userId,

                intent,

                memorySaved,

                savedMemory:
                    extractedMemory,

                memories,

                debug:
                    buildMemoryDebug(
                        memories
                    )

            });
        }


        /* =================================================
           MEMORY CONTEXT
        ================================================= */

        const memoryContext =
            buildMemoryContext(
                memories
            );


        /* =================================================
           WEATHER
        ================================================= */

        const weather =
            body.weather || null;


        const weatherContext =
            buildWeatherContext(
                weather
            );


        /* =================================================
           HISTORY
        ================================================= */

        const history =
            await loadHistory(
                userId,
                20
            );


        const historyMessages =
            buildHistoryMessages(
                history
            );


        /* =================================================
           SYSTEM PROMPT
        ================================================= */

        const systemPrompt =
            buildSystemPrompt({

                memoryContext,

                weatherContext,

                intent

            });


        const groqMessages = [

            {

                role: "system",

                content:
                    systemPrompt
            },

            ...historyMessages

        ];


        /* =================================================
           VISION
        ================================================= */

        if (
            hasImage
        ) {

            /*
             * History में अभी जो current user message save हुआ है
             * उसे vision message से duplicate नहीं करेंगे।
             */

            if (
                groqMessages.length > 1
            ) {

                const last =
                    groqMessages[
                        groqMessages.length - 1
                    ];


                if (
                    last?.role === "user"
                ) {

                    groqMessages.pop();
                }
            }


            groqMessages.push(

                buildVisionMessage(
                    message,
                    image
                )
            );


            const reply =
                await askGroq({

                    messages:
                        groqMessages,

                    model:
                        VISION_MODEL,

                    temperature:
                        0.35,

                    maxTokens:
                        1400
                });


            await saveConversation(
                userId,
                "assistant",
                reply
            );


            return jsonResponse({

                success: true,

                reply,

                userId,

                intent: "vision",

                memorySaved,

                debug:
                    buildMemoryDebug(
                        memories
                    )

            });
        }


        /* =================================================
           NORMAL GROQ
        ================================================= */

        const reply =
            await askGroq({

                messages:
                    groqMessages,

                model:
                    TEXT_MODEL,

                temperature:
                    intent === "trading"
                        ? 0.35
                        : 0.7,

                maxTokens:
                    1400

            });


        /* =================================================
           SAVE AI RESPONSE
        ================================================= */

        await saveConversation(
            userId,
            "assistant",
            reply
        );


        /* =================================================
           FINAL RESPONSE
        ================================================= */

        return jsonResponse({

            success: true,

            reply,

            userId,

            intent,

            memorySaved,

            memories,

            debug:
                buildMemoryDebug(
                    memories
                )

        });


    } catch (error) {

        console.error(
            "KAIRA API ERROR:",
            error
        );


        return jsonResponse(

            {

                success: false,

                error:
                    "KAIRA server में समस्या आ गई।",

                /*
                 * Debug information temporarily दिखाई जाएगी।
                 * इससे deployment problem पकड़ना आसान होगा।
                 */

                details:
                    error?.message || String(error),

                userId:
                    KAIRA_USER_ID

            },

            500
        );
    }
}
