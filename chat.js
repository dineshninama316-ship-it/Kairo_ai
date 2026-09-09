/**
 * =========================================================
 * KAIRA AI — FINAL BACKEND
 * Part 1 / 3
 * =========================================================
 *
 * Features:
 * - Groq AI
 * - Neon PostgreSQL
 * - Permanent Memory
 * - Multiple Preferences
 * - Chat History
 * - Weather Context
 * - Vision Support
 * - Trading Support
 * - Hindi Friendly Assistant
 *
 * File:
 * api/chat.js
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


/* =========================================================
   DATABASE
========================================================= */

const DATABASE_URL =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
}

const sql = neon(DATABASE_URL);


/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanText(value) {

    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}


function getUserId(body) {

    const id = cleanText(body?.userId);

    // Temporary single-user mode.
    // Frontend also uses test-user.
    return id || "test-user";
}


function normalizeText(text) {

    return cleanText(text)
        .toLowerCase()
        .replace(/[।!??,]/g, " ")
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
   INTENT DETECTION
========================================================= */

function detectIntent(message, hasImage = false) {

    const text = normalizeText(message);

    if (hasImage) {
        return "vision";
    }


    /* MEMORY QUERY — CHECK FIRST */

    if (
        text.includes("मेरा नाम क्या") ||
        text.includes("मेरा नाम") && text.includes("क्या है") ||
        text.includes("मेरे को क्या पसंद") ||
        text.includes("मुझे क्या पसंद") ||
        text.includes("मेरी पसंद") ||
        text.includes("मैं क्या पसंद") ||
        text.includes("मेरा goal") ||
        text.includes("मेरा गोल") ||
        text.includes("मेरे बारे में क्या जानते") ||
        text.includes("मेरे बारे में") ||
        text.includes("what is my name") ||
        text.includes("what do i like") ||
        text.includes("what are my preferences") ||
        text.includes("what is my goal") ||
        text.includes("what do you know about me")
    ) {
        return "memory_query";
    }


    /* MEMORY SAVE */

    if (
        text.includes("याद रखना") ||
        text.includes("याद रखो") ||
        text.includes("याद रखना है") ||
        text.includes("याद रख") ||
        text.includes("remember this") ||
        text.includes("remember it") ||
        text.includes("save this") ||
        text.includes("don't forget")
    ) {
        return "memory";
    }


    /* WEATHER */

    if (
        text.includes("मौसम") ||
        text.includes("weather") ||
        text.includes("बारिश") ||
        text.includes("तापमान") ||
        text.includes("temperature")
    ) {
        return "weather";
    }


    /* TRADING */

    if (
        text.includes("trading") ||
        text.includes("trade") ||
        text.includes("forex") ||
        text.includes("crypto") ||
        text.includes("bitcoin") ||
        text.includes("btc") ||
        text.includes("nifty") ||
        text.includes("banknifty") ||
        text.includes("support") ||
        text.includes("resistance") ||
        text.includes("fibonacci") ||
        text.includes("chart") ||
        text.includes("candlestick") ||
        text.includes("buy") ||
        text.includes("sell") ||
        text.includes("long") ||
        text.includes("short")
    ) {
        return "trading";
    }


    return "chat";
}


/* =========================================================
   MEMORY EXTRACTION
========================================================= */

function extractMemory(message) {

    const original = cleanText(message);

    if (!original) {
        return null;
    }

    let text = original
        .replace(/इसे याद रखना/gi, "")
        .replace(/इसे याद रखो/gi, "")
        .replace(/इसे याद रख/gi, "")
        .replace(/याद रखना है/gi, "")
        .replace(/याद रखना/gi, "")
        .replace(/याद रखो/gi, "")
        .replace(/याद रख/gi, "")
        .replace(/remember this/gi, "")
        .replace(/remember it/gi, "")
        .replace(/save this/gi, "")
        .replace(/don't forget/gi, "")
        .trim();


    /* =====================================================
       NAME
    ===================================================== */

    let match = text.match(
        /(?:मेरा नाम|मेरा नाम है|my name is)\s*[:\-]?\s*([a-zA-Zअ-ह\u0900-\u097F][a-zA-Zअ-ह\u0900-\u097F0-9 _-]{0,30})/i
    );

    if (match) {

        let value = cleanText(match[1])
            .replace(/\s+है$/i, "")
            .trim();

        if (value) {

            return {
                key: "name",
                value
            };
        }
    }


    /* =====================================================
       "I AM AJAY" / "मैं AJAY हूँ"
    ===================================================== */

    match = text.match(
        /^(?:i am|i'm|मैं)\s+([a-zA-Zअ-ह\u0900-\u097F][a-zA-Zअ-ह\u0900-\u097F0-9 _-]{0,30})(?:\s+हूँ|\s+हू|\s+है)?$/i
    );

    if (match) {

        const value = cleanText(match[1])
            .replace(/\s+(हूँ|हू|है)$/i, "")
            .trim();

        if (value) {

            return {
                key: "name",
                value
            };
        }
    }


    /* =====================================================
       PREFERENCE
    ===================================================== */

    const preferencePatterns = [

        /मुझे\s+(.+?)\s+पसंद\s+है/i,

        /मुझे\s+(.+?)\s+पसंद\s+है/i,

        /मेरे को\s+(.+?)\s+पसंद\s+है/i,

        /मेरी\s+पसंद\s+(.+)/i,

        /मैं\s+(.+?)\s+पसंद\s+करता\s+हूँ/i,

        /मैं\s+(.+?)\s+पसंद\s+करता\s+हूं/i,

        /i like\s+(.+)/i,

        /i love\s+(.+)/i,

        /my favorite is\s+(.+)/i
    ];


    for (const pattern of preferencePatterns) {

        const found = text.match(pattern);

        if (!found) {
            continue;
        }

        let value = cleanText(found[1])
            .replace(/[।.!?]+$/g, "")
            .trim();

        if (!value) {
            continue;
        }

        /*
         * Multiple preferences को support करने के लिए
         * value से एक stable key बनाया जाएगा।
         *
         * Example:
         * preference_trading
         * preference_free_fire
         * preference_cricket
         */

        const normalizedValue = value
            .toLowerCase()
            .replace(/[^a-z0-9\u0900-\u097F]+/gi, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 40);

        return {
            key: `preference_${normalizedValue || "general"}`,
            value
        };
    }


    /* =====================================================
       GOAL
    ===================================================== */

    const goalPatterns = [

        /मेरा goal\s+(.+)/i,

        /मेरा गोल\s+(.+)/i,

        /मेरा लक्ष्य\s+(.+)/i,

        /मैं\s+(.+?)\s+करना चाहता\s+हूँ/i,

        /मैं\s+(.+?)\s+बनना चाहता\s+हूँ/i,

        /my goal is\s+(.+)/i,

        /i want to\s+(.+)/i
    ];


    for (const pattern of goalPatterns) {

        const found = text.match(pattern);

        if (!found) {
            continue;
        }

        const value = cleanText(found[1])
            .replace(/[।.!?]+$/g, "")
            .trim();

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

async function saveMemory(userId, memory) {

    if (!memory?.key || !memory?.value) {
        return false;
    }

    await sql`
        INSERT INTO memories
            (user_id, memory_key, memory_value)
        VALUES
            (${userId}, ${memory.key}, ${memory.value})
        ON CONFLICT (user_id, memory_key)
        DO UPDATE SET
            memory_value = EXCLUDED.memory_value,
            updated_at = NOW()
    `;

    return true;
}


/* =========================================================
   LOAD ALL MEMORIES
========================================================= */

async function loadMemories(userId) {

    const rows = await sql`
        SELECT
            memory_key,
            memory_value,
            created_at,
            updated_at
        FROM memories
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
    `;

    return rows || [];
}


/* =========================================================
   MEMORY CONTEXT
========================================================= */

function buildMemoryContext(memories) {

    if (!Array.isArray(memories) || memories.length === 0) {
        return "अभी कोई permanent memory उपलब्ध नहीं है।";
    }

    const lines = [];

    for (const memory of memories) {

        if (!memory?.memory_key || !memory?.memory_value) {
            continue;
        }

        lines.push(
            `${memory.memory_key}: ${memory.memory_value}`
        );
    }

    return lines.length
        ? lines.join("\n")
        : "अभी कोई permanent memory उपलब्ध नहीं है।";
}


/* =========================================================
   PART 1 END
=========================================================

   आगे Part 2 में आएगा:

   - Weather context
   - System prompt
   - Groq API
   - Conversation save
   - Direct memory answer
   - Vision handling

========================================================= */ 
/* =========================================================
   WEATHER CONTEXT
========================================================= */

function buildWeatherContext(weather) {

    if (!weather) {
        return "";
    }

    if (typeof weather === "string") {
        return weather;
    }

    const temperature =
        weather.temperature ??
        weather.temp ??
        "unknown";

    const weatherCode =
        weather.weatherCode ??
        weather.weathercode ??
        "";

    const location =
        weather.location ??
        weather.city ??
        "";

    return `
Current weather information:
Location: ${location || "Unknown"}
Temperature: ${temperature}°C
Weather code: ${weatherCode || "Unknown"}
`;
}


/* =========================================================
   KAIRA SYSTEM PROMPT
========================================================= */

function buildSystemPrompt({
    memoryContext = "",
    weatherContext = "",
    intent = "chat"
}) {

    return `
You are KAIRA AI.

You are a personal AI assistant and digital partner.

IMPORTANT IDENTITY:
- Your name is KAIRA.
- You are an AI assistant, not a human.
- Talk naturally in Hindi/Hinglish when the user uses Hindi/Hinglish.
- Be friendly, caring, helpful and slightly playful.
- Do not repeatedly say that you are an AI unless it is relevant.
- Do not invent personal information about the user.

USER MEMORY:
The following information comes from the user's permanent Neon memory.

${memoryContext}

MEMORY RULES:
- Treat the memory above as trusted user-provided information.
- Never claim you remember something if it is not present.
- Never invent a name, preference, goal or personal fact.
- If memory is empty, honestly say that you don't have that information.
- If a preference exists, use it naturally when relevant.

WEATHER:
${weatherContext || "No live weather information was provided."}

GENERAL BEHAVIOR:
- Answer directly and clearly.
- Prefer Hindi for Hindi users.
- For technical questions, give practical steps.
- For coding questions, provide complete working code when requested.
- Don't unnecessarily repeat the user's question.
- Don't pretend that an action was completed when it wasn't.

TRADING:
- You can explain charts, support, resistance, Fibonacci, trend, risk/reward and technical concepts.
- For an image/chart, describe what is actually visible.
- Never guarantee profit or claim a strategy has a 100% win rate.
- Clearly distinguish analysis from certainty.
- Risk management is important.

VISION:
- When an image is provided, analyze only what is actually visible.
- Do not invent details that cannot be seen.
- If the image is unclear, say so.

CURRENT INTENT:
${intent}
`;
}


/* =========================================================
   GROQ REQUEST
========================================================= */

async function askGroq({
    messages,
    model = TEXT_MODEL,
    temperature = 0.7,
    maxTokens = 1200
}) {

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured.");
    }


    const response = await fetch(GROQ_URL, {

        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({

            model,

            messages,

            temperature,

            max_tokens: maxTokens

        })

    });


    const rawText = await response.text();

    let data = safeJsonParse(rawText);


    if (!response.ok) {

        let errorMessage =
            data?.error?.message ||
            data?.message ||
            rawText ||
            `Groq request failed with status ${response.status}`;

        throw new Error(errorMessage);
    }


    const answer =
        data?.choices?.[0]?.message?.content;

    if (!answer) {
        throw new Error("Groq returned an empty response.");
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

    const text = cleanText(message);

    if (!text) {
        return;
    }

    await sql`
        INSERT INTO conversations
            (user_id, role, message)
        VALUES
            (${userId}, ${role}, ${text})
    `;
}


/* =========================================================
   LOAD CONVERSATION HISTORY
========================================================= */

async function loadHistory(
    userId,
    limit = 20
) {

    const safeLimit = Math.min(
        Math.max(Number(limit) || 20, 1),
        50
    );


    const rows = await sql`
        SELECT
            id,
            role,
            message,
            created_at
        FROM conversations
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${safeLimit}
    `;


    return (rows || []).reverse();
}


/* =========================================================
   CONVERT HISTORY TO GROQ MESSAGES
========================================================= */

function buildHistoryMessages(history) {

    if (!Array.isArray(history)) {
        return [];
    }


    const messages = [];

    for (const item of history) {

        if (
            !item?.message ||
            !item?.role
        ) {
            continue;
        }


        let role = item.role;

        if (role !== "user" && role !== "assistant") {
            continue;
        }


        messages.push({

            role,

            content: cleanText(item.message)

        });
    }


    return messages;
}


/* =========================================================
   DIRECT MEMORY RESPONSE
========================================================= */

function getDirectMemoryReply(
    message,
    memories
) {

    const text = normalizeText(message);

    const rows =
        Array.isArray(memories)
            ? memories
            : [];


    /* =====================================================
       NAME
    ===================================================== */

    if (
        text.includes("मेरा नाम क्या") ||
        text.includes("what is my name") ||
        (
            text.includes("मेरा नाम") &&
            text.includes("क्या है")
        )
    ) {

        const nameMemory =
            rows.find(
                item =>
                    item.memory_key === "name"
            );


        if (nameMemory?.memory_value) {

            return `आपका नाम ${nameMemory.memory_value} है 😊`;
        }


        return "अभी मेरी permanent memory में आपका नाम सेव नहीं है।";
    }


    /* =====================================================
       PREFERENCES
    ===================================================== */

    if (
        text.includes("मेरे को क्या पसंद") ||
        text.includes("मुझे क्या पसंद") ||
        text.includes("मेरी पसंद") ||
        text.includes("मैं क्या पसंद") ||
        text.includes("what do i like") ||
        text.includes("what are my preferences")
    ) {

        const preferences =
            rows.filter(item =>
                item?.memory_key === "preference" ||
                item?.memory_key?.startsWith("preference_")
            );


        if (preferences.length > 0) {

            const values = preferences
                .map(item => cleanText(item.memory_value))
                .filter(Boolean);


            const uniqueValues = [
                ...new Set(values)
            ];


            if (uniqueValues.length === 1) {

                return `आपको ${uniqueValues[0]} पसंद है 😊`;
            }


            return `मुझे याद है कि आपको ${uniqueValues.join(
                ", "
            )} पसंद है 😊`;
        }


        return "अभी मेरी permanent memory में आपकी कोई पसंद सेव नहीं है।";
    }


    /* =====================================================
       GOAL
    ===================================================== */

    if (
        text.includes("मेरा goal") ||
        text.includes("मेरा गोल") ||
        text.includes("मेरा लक्ष्य") ||
        text.includes("what is my goal")
    ) {

        const goalMemory =
            rows.find(
                item =>
                    item.memory_key === "goal"
            );


        if (goalMemory?.memory_value) {

            return `आपका goal है: ${goalMemory.memory_value} 🎯`;
        }


        return "अभी मेरी permanent memory में आपका goal सेव नहीं है।";
    }


    /* =====================================================
       ABOUT USER
    ===================================================== */

    if (
        text.includes("मेरे बारे में") ||
        text.includes("what do you know about me")
    ) {

        if (!rows.length) {

            return "अभी मेरी permanent memory में आपके बारे में कोई जानकारी सेव नहीं है।";
        }


        const name =
            rows.find(
                item => item.memory_key === "name"
            )?.memory_value;


        const preferences =
            rows
                .filter(item =>
                    item?.memory_key === "preference" ||
                    item?.memory_key?.startsWith("preference_")
                )
                .map(item => cleanText(item.memory_value))
                .filter(Boolean);


        const goal =
            rows.find(
                item => item.memory_key === "goal"
            )?.memory_value;


        const parts = [];


        if (name) {
            parts.push(`नाम: ${name}`);
        }


        if (preferences.length) {

            parts.push(
                `पसंद: ${[
                    ...new Set(preferences)
                ].join(", ")}`
            );
        }


        if (goal) {
            parts.push(`Goal: ${goal}`);
        }


        if (!parts.length) {

            return "मेरी memory में अभी कुछ personal information उपलब्ध नहीं है।";
        }


        return `मुझे आपके बारे में यह याद है:\n\n${parts.join(
            "\n"
        )}`;
    }


    return null;
}


/* =========================================================
   VISION MESSAGE BUILDER
========================================================= */

function buildVisionMessage(
    userMessage,
    image
) {

    return {

        role: "user",

        content: [

            {
                type: "text",
                text:
                    userMessage ||
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
   IMAGE VALIDATION
========================================================= */

function isValidImage(image) {

    if (!image || typeof image !== "string") {
        return false;
    }


    /*
     * Browser camera normally sends:
     * data:image/jpeg;base64,...
     *
     * Also allow normal https image URLs.
     */

    return (
        image.startsWith("data:image/") ||
        image.startsWith("https://") ||
        image.startsWith("http://")
    );
}


/* =========================================================
   HTTP RESPONSE HELPERS
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
                "Content-Type": "application/json",
                "Cache-Control": "no-store"
            }

        }
    );
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
            "Content-Type"

    };
}


/* =========================================================
   PART 2 END
=========================================================

   Part 3 में आएगा:

   - Main API handler
   - OPTIONS handling
   - Memory save
   - Memory query
   - Chat history
   - Vision
   - Weather
   - Trading
   - Groq response
   - Error handling

========================================================= */
/* =========================================================
   MAIN API HANDLER
========================================================= */

export default async function handler(req) {

    /* =====================================================
       CORS / OPTIONS
    ===================================================== */

    if (req.method === "OPTIONS") {

        return new Response(null, {
            status: 204,
            headers: corsHeaders()
        });
    }


    /* =====================================================
       ONLY POST
    ===================================================== */

    if (req.method !== "POST") {

        return jsonResponse(
            {
                success: false,
                error: "Only POST requests are allowed."
            },
            405
        );
    }


    try {

        /* =================================================
           READ REQUEST
        ================================================= */

        const body =
            typeof req.body === "string"
                ? safeJsonParse(req.body)
                : req.body;


        if (!body || typeof body !== "object") {

            return jsonResponse(
                {
                    success: false,
                    error: "Invalid request body."
                },
                400
            );
        }


        /* =================================================
           USER ID
        ================================================= */

        const userId =
            getUserId(body);


        /* =================================================
           ACTION
        ================================================= */

        const action =
            cleanText(body.action)
                .toLowerCase();


        /* =================================================
           HISTORY ACTION
        ================================================= */

        if (action === "history") {

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
           MEMORIES ACTION
        ================================================= */

        if (
            action === "memories" ||
            action === "memory"
        ) {

            const memories =
                await loadMemories(userId);


            return jsonResponse({
                success: true,
                userId,
                memories
            });
        }


        /* =================================================
           MESSAGE
        ================================================= */

        const message =
            cleanText(body.message);


        /* =================================================
           IMAGE
        ================================================= */

        const image =
            cleanText(body.image);


        const hasImage =
            isValidImage(image);


        /* =================================================
           BASIC VALIDATION
        ================================================= */

        if (!message && !hasImage) {

            return jsonResponse(
                {
                    success: false,
                    error: "Message or image is required."
                },
                400
            );
        }


        /* =================================================
           LOAD EXISTING MEMORY
        ================================================= */

        let memories =
            await loadMemories(userId);


        /* =================================================
           DETECT INTENT
        ================================================= */

        const intent =
            detectIntent(
                message,
                hasImage
            );


        /* =================================================
           MEMORY SAVE
        ================================================= */

        const extractedMemory =
            extractMemory(message);


        let memorySaved = false;


        if (extractedMemory) {

            memorySaved =
                await saveMemory(
                    userId,
                    extractedMemory
                );


            /*
             * Reload immediately so the AI can use
             * the newly saved memory in the same request.
             */

            memories =
                await loadMemories(userId);
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
           DIRECT ANSWER FROM NEON
        ================================================= */

        if (intent === "memory_query") {

            const directReply =
                getDirectMemoryReply(
                    message,
                    memories
                );


            if (directReply) {

                await saveConversation(
                    userId,
                    "assistant",
                    directReply
                );


                return jsonResponse({
                    success: true,
                    reply: directReply,
                    userId,
                    intent,
                    memories,
                    memorySaved
                });
            }
        }


        /* =================================================
           MEMORY SAVE CONFIRMATION
        ================================================= */

        if (
            intent === "memory" &&
            extractedMemory
        ) {

            const reply =
                extractedMemory.key === "name"

                    ? `ठीक है 😊 अब मुझे याद रहेगा कि आपका नाम ${extractedMemory.value} है।`

                    : extractedMemory.key === "goal"

                    ? `ठीक है 🎯 मैंने आपका goal याद रख लिया: ${extractedMemory.value}`

                    : `ठीक है 😊 मैंने याद रख लिया कि आपको ${extractedMemory.value} पसंद है।`;


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
                savedMemory: extractedMemory
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
           LOAD RECENT HISTORY
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


        /* =================================================
           BUILD GROQ MESSAGES
        ================================================= */

        let groqMessages = [

            {
                role: "system",
                content: systemPrompt
            }

        ];


        /*
         * History में अभी current user message भी save हो चुका है।
         * इसलिए उसे history से भेजेंगे।
         */

        if (historyMessages.length) {

            groqMessages.push(
                ...historyMessages
            );
        }


        /* =================================================
           VISION
        ================================================= */

        if (hasImage) {

            /*
             * Vision request में current message को
             * image के साथ भेजना जरूरी है।
             */

            /*
             * Current user message history में मौजूद है,
             * इसलिए duplicate text avoid करने के लिए
             * history से last user message हटाते हैं।
             */

            if (
                groqMessages.length > 1
            ) {

                const lastIndex =
                    groqMessages.length - 1;


                if (
                    groqMessages[lastIndex]?.role === "user"
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
                        0.4,

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
                memorySaved
            });
        }


        /* =================================================
           NORMAL TEXT / WEATHER / TRADING CHAT
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

            memories

        });

    } catch (error) {

        console.error(
            "KAIRA API ERROR:",
            error
        );


        const message =
            error?.message ||
            "Unknown server error";


        return jsonResponse(

            {
                success: false,

                error:
                    "KAIRA server में समस्या आ गई।",

                details:
                    process.env.NODE_ENV === "development"
                        ? message
                        : undefined
            },

            500
        );
    }
    }
