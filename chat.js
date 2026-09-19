/**
 * =====================================================
 * KAIRA AI — BACKEND v9
 * Groq + Neon Permanent Memory + Vision
 * =====================================================
 */

import { neon } from "@neondatabase/serverless";

/* =====================================================
   CONFIG
===================================================== */

const KAIRA_USER_ID = "test-user";

const GROQ_URL =
    "https://api.groq.com/openai/v1/chat/completions";

const TEXT_MODEL =
    "openai/gpt-oss-120b";

const VISION_MODEL =
    "qwen/qwen3.6-27b";

const MAX_HISTORY = 40;
const MAX_MEMORY = 100;

const GROQ_API_KEY =
    process.env.GROQ_API_KEY || "";

const DATABASE_URL =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";


/* =====================================================
   DATABASE
===================================================== */

let sql = null;

if (DATABASE_URL) {
    sql = neon(DATABASE_URL);
}


/* =====================================================
   BASIC HELPERS
===================================================== */

function cleanText(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value).trim();
}


function getUserId(body) {

    /*
      फिलहाल single-user mode.
      बाद में real authentication जोड़ेंगे.
    */

    return KAIRA_USER_ID;
}


function jsonResponse(data, status = 200) {

    return new Response(
        JSON.stringify(data),
        {
            status,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                "Access-Control-Allow-Origin":
                    "*",

                "Access-Control-Allow-Methods":
                    "POST, OPTIONS",

                "Access-Control-Allow-Headers":
                    "Content-Type"
            }
        }
    );
}


/* =====================================================
   REQUEST BODY
===================================================== */

async function getRequestBody(req) {

    try {

        const text =
            await req.text();

        if (!text) {
            return {};
        }

        return JSON.parse(text);

    } catch (error) {

        console.error(
            "Request body error:",
            error
        );

        throw new Error(
            "Invalid JSON request body."
        );
    }
}


/* =====================================================
   DATABASE CHECK
===================================================== */

async function databaseHealthCheck() {

    if (!sql) {

        return {
            connected: false,
            reason: "Database URL missing"
        };
    }

    try {

        await sql`
            SELECT 1;
        `;

        return {
            connected: true
        };

    } catch (error) {

        console.error(
            "Database health error:",
            error
        );

        return {
            connected: false,
            reason: "Database connection failed"
        };
    }
}


/* =====================================================
   SAVE CONVERSATION
===================================================== */

async function saveConversation(
    userId,
    role,
    message
) {

    if (!sql) {
        return;
    }

    const text =
        cleanText(message);

    if (!text) {
        return;
    }

    try {

        await sql`
            INSERT INTO conversations
            (
                user_id,
                role,
                message,
                created_at
            )
            VALUES
            (
                ${userId},
                ${role},
                ${text},
                NOW()
            );
        `;

    } catch (error) {

        console.error(
            "Save conversation error:",
            error
        );
    }
}


/* =====================================================
   LOAD HISTORY
===================================================== */

async function loadHistory(userId) {

    if (!sql) {
        return [];
    }

    try {

        const rows =
            await sql`
                SELECT
                    id,
                    user_id,
                    role,
                    message,
                    created_at
                FROM conversations
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
                LIMIT ${MAX_HISTORY};
            `;

        return rows.reverse();

    } catch (error) {

        console.error(
            "Load history error:",
            error
        );

        return [];
    }
}


/* =====================================================
   SAVE MEMORY
===================================================== */

async function saveMemory(
    userId,
    key,
    value
) {

    if (!sql) {
        return false;
    }

    const memoryKey =
        cleanText(key);

    const memoryValue =
        cleanText(value);

    if (
        !memoryKey ||
        !memoryValue
    ) {
        return false;
    }

    try {

        await sql`
            INSERT INTO memories
            (
                user_id,
                memory_key,
                memory_value,
                created_at,
                updated_at
            )
            VALUES
            (
                ${userId},
                ${memoryKey},
                ${memoryValue},
                NOW(),
                NOW()
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
                    NOW();
        `;

        return true;

    } catch (error) {

        console.error(
            "Save memory error:",
            error
        );

        return false;
    }
}


/* =====================================================
   LOAD MEMORIES
===================================================== */

async function loadMemories(userId) {

    if (!sql) {
        return [];
    }

    try {

        const rows =
            await sql`
                SELECT
                    memory_key,
                    memory_value,
                    created_at,
                    updated_at
                FROM memories
                WHERE user_id = ${userId}
                ORDER BY updated_at DESC
                LIMIT ${MAX_MEMORY};
            `;

        return rows;

    } catch (error) {

        console.error(
            "Load memories error:",
            error
        );

        return [];
    }
}


/* =====================================================
   PART 1 END
===================================================== */
/* =====================================================
   MEMORY EXTRACTION
===================================================== */

function extractMemories(message) {

    const text =
        cleanText(message);

    const memories = [];

    if (!text) {
        return memories;
    }


    /* -----------------------------
       NAME
    ----------------------------- */

    const namePatterns = [

        /मेरा नाम\s+([^\s,।.!?]+)/i,

        /मुझे\s+([^\s,।.!?]+)\s+कहकर/i,

        /my name is\s+([a-zA-Z]+)/i,

        /call me\s+([a-zA-Z]+)/i

    ];


    for (
        const pattern of namePatterns
    ) {

        const match =
            text.match(pattern);

        if (match?.[1]) {

            memories.push({
                key: "name",
                value: match[1]
            });

            break;
        }
    }


    /* -----------------------------
       LIKES
    ----------------------------- */

    const likePatterns = [

        /मुझे\s+(.+?)\s+पसंद है/i,

        /मुझे\s+(.+?)\s+अच्छा लगता है/i,

        /i like\s+(.+)/i,

        /i love\s+(.+)/i

    ];


    for (
        const pattern of likePatterns
    ) {

        const match =
            text.match(pattern);

        if (match?.[1]) {

            memories.push({
                key: "likes",
                value:
                    match[1]
                        .trim()
                        .slice(0, 200)
            });

            break;
        }
    }


    /* -----------------------------
       DISLIKES
    ----------------------------- */

    const dislikePatterns = [

        /मुझे\s+(.+?)\s+पसंद नहीं है/i,

        /मुझे\s+(.+?)\s+अच्छा नहीं लगता/i,

        /i don't like\s+(.+)/i,

        /i hate\s+(.+)/i

    ];


    for (
        const pattern of dislikePatterns
    ) {

        const match =
            text.match(pattern);

        if (match?.[1]) {

            memories.push({
                key: "dislikes",
                value:
                    match[1]
                        .trim()
                        .slice(0, 200)
            });

            break;
        }
    }


    /* -----------------------------
       GOAL
    ----------------------------- */

    const goalPatterns = [

        /मेरा लक्ष्य\s+(.+)/i,

        /मेरा goal\s+(.+)/i,

        /मेरा सपना\s+(.+)/i,

        /my goal is\s+(.+)/i,

        /my dream is\s+(.+)/i

    ];


    for (
        const pattern of goalPatterns
    ) {

        const match =
            text.match(pattern);

        if (match?.[1]) {

            memories.push({
                key: "goal",
                value:
                    match[1]
                        .trim()
                        .slice(0, 300)
            });

            break;
        }
    }


    /* -----------------------------
       REMEMBER THIS
    ----------------------------- */

    const rememberPatterns = [

        /इसे याद रखना\s*[:\-]?\s*(.+)/i,

        /इसे याद रखो\s*[:\-]?\s*(.+)/i,

        /याद रखना\s*[:\-]?\s*(.+)/i,

        /remember this\s*[:\-]?\s*(.+)/i,

        /remember that\s*[:\-]?\s*(.+)/i

    ];


    for (
        const pattern of rememberPatterns
    ) {

        const match =
            text.match(pattern);

        if (match?.[1]) {

            memories.push({
                key:
                    "remember_" +
                    Date.now(),

                value:
                    match[1]
                        .trim()
                        .slice(0, 500)
            });

            break;
        }
    }


    return memories;
}


/* =====================================================
   PROCESS MEMORY SAVING
===================================================== */

async function processMemorySaving(
    userId,
    message
) {

    const extracted =
        extractMemories(message);

    const saved = [];


    for (
        const memory of extracted
    ) {

        const success =
            await saveMemory(
                userId,
                memory.key,
                memory.value
            );

        if (success) {

            saved.push(memory);
        }
    }


    return saved;
}


/* =====================================================
   MEMORY QUESTION
===================================================== */

function isMemoryQuestion(message) {

    const text =
        cleanText(message)
            .toLowerCase();


    const patterns = [

        "मेरा नाम क्या है",

        "मेरा नाम बताओ",

        "तुम्हें मेरा नाम याद है",

        "तुम मेरा नाम जानते हो",

        "मेरे बारे में क्या याद है",

        "मुझे क्या याद है",

        "what is my name",

        "do you remember my name",

        "what do you remember about me"

    ];


    return patterns.some(
        pattern =>
            text.includes(pattern)
    );
}


/* =====================================================
   MEMORY REPLY
===================================================== */

function buildMemoryReply(
    memories
) {

    if (
        !Array.isArray(memories) ||
        !memories.length
    ) {

        return (
            "अभी मेरी permanent memory में " +
            "आपके बारे में कोई जानकारी saved नहीं है।"
        );
    }


    const name =
        memories.find(
            item =>
                item.memory_key === "name"
        );


    if (name) {

        return (
            `हाँ 😊 मुझे याद है कि आपका नाम ` +
            `${name.memory_value} है।`
        );
    }


    const lines =
        memories
            .slice(0, 10)
            .map(
                item =>
                    `• ${item.memory_key}: ${item.memory_value}`
            );


    return (
        "मेरी memory में यह जानकारी saved है:\n\n" +
        lines.join("\n")
    );
}


/* =====================================================
   INTENT DETECTION
===================================================== */

function detectIntent(
    message,
    hasImage
) {

    if (hasImage) {
        return "vision";
    }


    if (isMemoryQuestion(message)) {
        return "memory";
    }


    const text =
        cleanText(message)
            .toLowerCase();


    if (
        /मौसम|weather|temperature|तापमान|बारिश|rain|गर्मी|गरमी|ठंड/
            .test(text)
    ) {

        return "weather";
    }


    if (
        /कोड|code|javascript|html|css|python|programming/
            .test(text)
    ) {

        return "coding";
    }


    if (
        /trading|trade|crypto|bitcoin|forex|nifty|stock|शेयर/
            .test(text)
    ) {

        return "trading";
    }


    return "general";
}


/* =====================================================
   WEATHER CONTEXT
===================================================== */

function buildWeatherContext(
    weather
) {

    if (
        !weather ||
        typeof weather !== "object"
    ) {

        return "";
    }


    const temperature =
        weather.temperature;

    const feelsLike =
        weather.feelsLike;

    const humidity =
        weather.humidity;

    const wind =
        weather.wind;


    return `
CURRENT USER WEATHER DATA:

Temperature: ${temperature ?? "unknown"} °C
Feels like: ${feelsLike ?? "unknown"} °C
Humidity: ${humidity ?? "unknown"} %
Wind: ${wind ?? "unknown"} km/h

Use this data when the user asks about current weather.
Do not invent weather information.
`;
}


/* =====================================================
   MEMORY CONTEXT
===================================================== */

function buildMemoryContext(
    memories
) {

    if (
        !Array.isArray(memories) ||
        !memories.length
    ) {

        return `
USER MEMORY:

No saved memory is currently available.
Do not invent personal information.
`;
    }


    const lines =
        memories
            .slice(0, MAX_MEMORY)
            .map(
                item =>
                    `- ${item.memory_key}: ${item.memory_value}`
            );


    return `
USER MEMORY:

${lines.join("\n")}

Use these memories naturally when relevant.
Never claim a memory that is not present here.
`;
}


/* =====================================================
   SYSTEM PROMPT
===================================================== */

function buildSystemPrompt(
    memories,
    weather,
    intent
) {

    return `
You are KAIRA.

KAIRA is a personal AI assistant designed for the user.

IMPORTANT IDENTITY:
- Your name is KAIRA.
- Do not call yourself ChatGPT unless specifically asked about the underlying AI.
- You are helpful, intelligent, natural and practical.
- The user prefers Hindi/Hinglish when appropriate.
- Respond naturally in the language used by the user.
- You can use light friendly humor when appropriate.

MEMORY RULES:
- Use only the memories supplied below.
- Never invent personal information.
- If something is not in memory, say you do not know it.
- When the user explicitly asks you to remember something, save it when possible.
- Never pretend that something was permanently remembered if saving failed.

SAFETY:
- Do not guarantee profits.
- For trading or financial questions, explain risks clearly.
- Do not invent live prices or market data.
- For medical, legal or financial matters, avoid presenting uncertain information as fact.

VISION:
- When an image is provided, carefully analyze only what is visible.
- Do not invent objects, text or details that cannot be seen.
- If image quality is insufficient, say so.

WEATHER:
- Use supplied weather data when available.
- Do not invent current weather data.

GENERAL:
- Give useful answers.
- Avoid unnecessary repetition.
- For technical tasks, give practical step-by-step instructions.
- When the user asks for code, provide complete usable code when appropriate.

CURRENT INTENT:
${intent}

${buildMemoryContext(memories)}

${buildWeatherContext(weather)}
`;
}


/* =====================================================
   GROQ API
===================================================== */

async function callGroq(
    messages,
    model
) {

    if (!GROQ_API_KEY) {

        throw new Error(
            "GROQ_API_KEY missing"
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
                        `Bearer ${GROQ_API_KEY}`
                },

                body:
                    JSON.stringify({

                        model,

                        messages,

                        temperature:
                            0.7,

                        max_tokens:
                            1500
                    })
            }
        );


    const raw =
        await response.text();


    let data = null;


    try {

        data =
            JSON.parse(raw);

    } catch {

        throw new Error(
            `Groq returned invalid response (${response.status}).`
        );
    }


    if (!response.ok) {

        console.error(
            "Groq API error:",
            data
        );

        const apiError =
            data?.error?.message ||
            `Groq API error (${response.status})`;

        throw new Error(
            apiError
        );
    }


    const reply =
        data?.choices?.[0]?.message?.content;


    if (!reply) {

        throw new Error(
            "Groq returned an empty response."
        );
    }


    return String(reply).trim();
}


/* =====================================================
   PART 2 END
===================================================== */
/* =====================================================
   VISION MESSAGE
===================================================== */

function buildVisionUserMessage(
    message,
    image
) {

    return {
        role: "user",

        content: [
            {
                type: "text",

                text:
                    cleanText(message) ||
                    "इस image को ध्यान से analyze करो।"
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


/* =====================================================
   IMAGE VALIDATION
===================================================== */

function validateImage(image) {

    if (!image) {
        return false;
    }

    const value =
        cleanText(image);

    if (!value.startsWith("data:image/")) {
        return false;
    }

    /*
      बहुत बड़ी image request को रोकना।
    */

    if (value.length > 8_000_000) {

        throw new Error(
            "Image बहुत बड़ी है। छोटी image भेजें।"
        );
    }

    return true;
}


/* =====================================================
   MESSAGE VALIDATION
===================================================== */

function validateUserMessage(
    message
) {

    const text =
        cleanText(message);

    if (!text) {

        throw new Error(
            "Message खाली है।"
        );
    }

    if (text.length > 10_000) {

        throw new Error(
            "Message बहुत लंबा है।"
        );
    }

    return text;
}


/* =====================================================
   BUILD CHAT MESSAGES
===================================================== */

function buildChatMessages(
    history,
    systemPrompt,
    currentMessage
) {

    const messages = [

        {
            role: "system",
            content: systemPrompt
        }

    ];


    if (
        Array.isArray(history)
    ) {

        for (
            const item of history
        ) {

            if (
                !item ||
                !item.message
            ) {
                continue;
            }


            const role =
                item.role === "assistant"
                    ? "assistant"
                    : "user";


            messages.push({

                role,

                content:
                    String(
                        item.message
                    ).slice(0, 6000)

            });
        }
    }


    messages.push({

        role: "user",

        content:
            currentMessage

    });


    return messages;
}


/* =====================================================
   MAIN CHAT HANDLER
===================================================== */

async function handleChat(
    body
) {

    const userId =
        getUserId(body);


    const message =
        validateUserMessage(
            body?.message
        );


    const image =
        cleanText(
            body?.image
        );


    const weather =
        body?.weather || null;


    const hasImage =
        validateImage(image);


    const intent =
        detectIntent(
            message,
            hasImage
        );


    /*
      Load existing memories
    */

    const memories =
        await loadMemories(
            userId
        );


    /* =================================================
       MEMORY QUESTION
    ================================================= */

    if (
        intent === "memory"
    ) {

        const reply =
            buildMemoryReply(
                memories
            );


        await saveConversation(
            userId,
            "user",
            message
        );


        await saveConversation(
            userId,
            "assistant",
            reply
        );


        return {

            success: true,

            reply,

            intent,

            memorySaved: [],

            userId
        };
    }


    /* =================================================
       LOAD HISTORY
    ================================================= */

    const history =
        await loadHistory(
            userId
        );


    /* =================================================
       SAVE USER MESSAGE
    ================================================= */

    await saveConversation(
        userId,
        "user",
        message
    );


    /* =================================================
       EXTRACT MEMORY
    ================================================= */

    const savedMemories =
        await processMemorySaving(
            userId,
            message
        );


    let currentMemories =
        memories;


    if (
        savedMemories.length
    ) {

        currentMemories =
            await loadMemories(
                userId
            );
    }


    /* =================================================
       SYSTEM PROMPT
    ================================================= */

    const systemPrompt =
        buildSystemPrompt(
            currentMemories,
            weather,
            intent
        );


    /* =================================================
       VISION
    ================================================= */

    if (hasImage) {

        const messages = [

            {
                role: "system",

                content:
                    systemPrompt
            }

        ];


        /*
          Previous conversation
        */

        for (
            const item of history
        ) {

            if (
                !item ||
                !item.message
            ) {
                continue;
            }


            messages.push({

                role:
                    item.role === "assistant"
                        ? "assistant"
                        : "user",

                content:
                    String(
                        item.message
                    ).slice(0, 5000)

            });
        }


        /*
          Current image
        */

        messages.push(
            buildVisionUserMessage(
                message,
                image
            )
        );


        const reply =
            await callGroq(
                messages,
                VISION_MODEL
            );


        await saveConversation(
            userId,
            "assistant",
            reply
        );


        return {

            success: true,

            reply,

            intent: "vision",

            vision: true,

            memorySaved:
                savedMemories,

            userId
        };
    }


    /* =================================================
       NORMAL CHAT
    ================================================= */

    const messages =
        buildChatMessages(
            history,
            systemPrompt,
            message
        );


    const reply =
        await callGroq(
            messages,
            TEXT_MODEL
        );


    /* =================================================
       SAVE AI RESPONSE
    ================================================= */

    await saveConversation(
        userId,
        "assistant",
        reply
    );


    return {

        success: true,

        reply,

        intent,

        vision: false,

        memorySaved:
            savedMemories,

        userId
    };
}


/* =====================================================
   HISTORY API
===================================================== */

async function handleHistory(
    body
) {

    const userId =
        getUserId(body);


    const history =
        await loadHistory(
            userId
        );


    return {

        success: true,

        history,

        count:
            history.length,

        userId
    };
}


/* =====================================================
   MEMORY API
===================================================== */

async function handleMemories(
    body
) {

    const userId =
        getUserId(body);


    const memories =
        await loadMemories(
            userId
        );


    return {

        success: true,

        memories,

        count:
            memories.length,

        userId
    };
}


/* =====================================================
   HEALTH API
===================================================== */

async function handleHealth() {

    const database =
        await databaseHealthCheck();


    return {

        success: true,

        status:
            "online",

        service:
            "KAIRA AI",

        database,

        groq:
            Boolean(
                GROQ_API_KEY
            ),

        timestamp:
            new Date().toISOString()
    };
}


/* =====================================================
   MAIN VERCEL HANDLER
===================================================== */

export default async function handler(
    req
) {

    try {

        /* =============================================
           CORS PREFLIGHT
        ============================================= */

        if (
            req.method === "OPTIONS"
        ) {

            return jsonResponse(
                {
                    success: true
                },
                200
            );
        }


        /* =============================================
           METHOD CHECK
        ============================================= */

        if (
            req.method !== "POST"
        ) {

            return jsonResponse(

                {
                    success: false,

                    error:
                        "Method not allowed. Use POST."
                },

                405
            );
        }


        /* =============================================
           BODY
        ============================================= */

        const body =
            await getRequestBody(
                req
            );


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


        /* =============================================
           ACTION ROUTER
           
           IMPORTANT:
           history / memories / health को
           normal chat में नहीं जाने देना।
        ============================================= */

        const action =
            cleanText(
                body.action
            ).toLowerCase();


        if (
            action === "health"
        ) {

            const result =
                await handleHealth();


            return jsonResponse(
                result,
                200
            );
        }


        if (
            action === "history"
        ) {

            const result =
                await handleHistory(
                    body
                );


            return jsonResponse(
                result,
                200
            );
        }


        if (
            action === "memories"
        ) {

            const result =
                await handleMemories(
                    body
                );


            return jsonResponse(
                result,
                200
            );
        }


        /* =============================================
           NORMAL CHAT
        ============================================= */

        const result =
            await handleChat(
                body
            );


        return jsonResponse(
            result,
            200
        );

    } catch (error) {

        console.error(
            "KAIRA SERVER ERROR:",
            error
        );


        let safeMessage =
            "KAIRA server में technical problem आ गई।";


        const errorMessage =
            String(
                error?.message || ""
            );


        /* =============================================
           SAFE ERROR MESSAGES
        ============================================= */

        if (
            errorMessage
                .toLowerCase()
                .includes(
                    "groq_api_key"
                )
        ) {

            safeMessage =
                "KAIRA AI configuration में GROQ_API_KEY missing है।";
        }


        else if (
            errorMessage
                .toLowerCase()
                .includes(
                    "database"
                ) ||

            errorMessage
                .toLowerCase()
                .includes(
                    "postgres"
                )
        ) {

            safeMessage =
                "KAIRA database configuration में problem है।";
        }


        else if (
            errorMessage
        ) {

            safeMessage =
                errorMessage;
        }


        return jsonResponse(

            {
                success: false,

                error:
                    safeMessage
            },

            500
        );
    }
}
