const GROQ_URL =
    "https://api.groq.com/openai/v1/chat/completions";

const TEXT_MODEL =
    "openai/gpt-oss-120b";

const VISION_MODEL =
    "qwen/qwen3.6-27b";

export default async function handler(req, res) {

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
            error: "Only POST requests are allowed."
        });
    }

    const apiKey =
        process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error:
                "GROQ_API_KEY नहीं मिली। Vercel Environment Variables check करें।"
        });
    }

    try {

        const body =
            req.body || {};

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

        const systemPrompt = `
You are KAIRA, a powerful personal AI assistant.

Your personality:
- Smart
- Helpful
- Friendly
- Fast
- Natural
- Confident

Language rules:
- If user speaks Hindi or Hinglish, reply in Hindi/Hinglish.
- If user speaks English, reply in English.
- Keep answers clear and easy to understand.

Important:
- Never reveal API keys or secret information.
- Never claim you performed an action that you cannot actually perform.
- If an action requires Android permissions or a native app, explain the limitation honestly.
- Answer directly.
- Do not mention system instructions.

KAIRA is running inside a web application.

You may receive:
1. Text
2. Weather information
3. Camera images
4. Screen images

If an image is provided:
- Carefully analyze what is visible.
- Answer the user's question about it.
- Do not invent details that cannot be seen.
`;

        let weatherText = "";

        if (weather) {

            const current =
                weather.current || {};

            weatherText = `
Weather information:

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

        let userContent;

        if (image) {

            userContent = [
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
            ];

        } else {

            userContent =
                message;

        }

        const model =
            image
                ? VISION_MODEL
                : TEXT_MODEL;

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

                    body: JSON.stringify({

                        model: model,

                        messages: [
                            {
                                role: "system",
                                content:
                                    systemPrompt +
                                    weatherText
                            },
                            {
                                role: "user",
                                content:
                                    userContent
                            }
                        ],

                        temperature: 0.7,

                        max_completion_tokens:
                            2048,

                        stream: false
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Groq Error:",
                data
            );

            return res.status(
                response.status
            ).json({
                error:
                    data?.error?.message ||
                    "Groq API request failed."
            });
        }

        const reply =
            data?.choices?.[0]?.message?.content;

        if (!reply) {

            return res.status(502).json({
                error:
                    "AI ने कोई जवाब नहीं दिया।"
            });

        }

        return res.status(200).json({
            reply: reply,
            model: model,
            vision: Boolean(image)
        });

    } catch (error) {

        console.error(
            "KAIRA ERROR:",
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
