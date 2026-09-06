<!DOCTYPE html>
<html lang="hi">

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>KAIRA AI</title>

    <style>

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }

        body {
            background: #05070d;
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* ================= HEADER ================= */

        header {

            height: 65px;

            background: #0b0f18;

            border-bottom: 1px solid #202735;

            display: flex;

            align-items: center;

            justify-content: space-between;

            padding: 0 15px;

            position: sticky;

            top: 0;

            z-index: 10;
        }

        .logo {

            font-size: 24px;

            font-weight: bold;

            letter-spacing: 1px;
        }

        .online {

            color: #00ff88;

            font-size: 13px;
        }

        #usageBtn {

            background: #151b27;

            border: 1px solid #293244;

            color: white;

            padding: 8px 12px;

            border-radius: 10px;

            cursor: pointer;
        }

        /* ================= USAGE ================= */

        #usagePanel {

            display: none;

            background: #0d121c;

            border-bottom: 1px solid #202735;

            padding: 15px;
        }

        .usage-box {

            display: flex;

            justify-content: space-between;

            gap: 10px;

            flex-wrap: wrap;
        }

        .usage-card {

            background: #151b27;

            border: 1px solid #293244;

            border-radius: 12px;

            padding: 12px;

            flex: 1;

            min-width: 140px;
        }

        .usage-title {

            font-size: 12px;

            color: #9da7b8;
        }

        .usage-number {

            font-size: 22px;

            font-weight: bold;

            margin-top: 5px;
        }

        #resetUsageBtn {

            margin-top: 12px;

            background: #1d2635;

            border: 1px solid #303b4e;

            color: white;

            padding: 8px 12px;

            border-radius: 8px;

            cursor: pointer;
        }

        /* ================= CHAT ================= */

        main {

            flex: 1;

            width: 100%;

            max-width: 900px;

            margin: auto;

            padding: 20px 15px 120px;

            overflow-y: auto;
        }

        #welcome {

            text-align: center;

            margin-top: 80px;

            color: #9da7b8;

            font-size: 18px;

            line-height: 1.6;
        }

        .message {

            display: flex;

            margin-bottom: 15px;
        }

        .message.user {

            justify-content: flex-end;
        }

        .message.kaira {

            justify-content: flex-start;
        }

        .bubble {

            max-width: 85%;

            padding: 12px 15px;

            border-radius: 16px;

            line-height: 1.5;

            white-space: pre-wrap;

            word-wrap: break-word;
        }

        .user .bubble {

            background: #1769ff;

            border-bottom-right-radius: 4px;
        }

        .kaira .bubble {

            background: #151b27;

            border: 1px solid #293244;

            border-bottom-left-radius: 4px;
        }

        /* ================= BOTTOM ================= */

        .bottom-area {

            position: fixed;

            bottom: 0;

            left: 0;

            right: 0;

            background: #05070d;

            border-top: 1px solid #202735;

            padding: 10px 12px;

            z-index: 20;
        }

        .input-area {

            max-width: 900px;

            margin: auto;

            display: flex;

            align-items: center;

            gap: 7px;
        }

        #messageInput {

            flex: 1;

            background: #111722;

            border: 1px solid #293244;

            color: white;

            outline: none;

            padding: 13px 14px;

            border-radius: 14px;

            font-size: 15px;
        }

        #messageInput::placeholder {

            color: #7f8999;
        }

        .action-btn {

            width: 45px;

            height: 45px;

            border-radius: 12px;

            border: 1px solid #293244;

            background: #111722;

            color: white;

            font-size: 20px;

            cursor: pointer;

            display: flex;

            align-items: center;

            justify-content: center;
        }

        .action-btn:hover {

            background: #1a2230;
        }

        .send-btn {

            background: #1769ff;

            border-color: #1769ff;
        }

        .send-btn:hover {

            background: #0f58dd;
        }

        #modeText {

            max-width: 900px;

            margin: 7px auto 0;

            color: #707b8e;

            font-size: 11px;

            text-align: center;
        }

        /* ================= MOBILE ================= */

        @media (max-width: 600px) {

            header {

                height: 58px;

                padding: 0 10px;
            }

            .logo {

                font-size: 21px;
            }

            .online {

                font-size: 11px;
            }

            #usageBtn {

                padding: 7px 9px;

                font-size: 12px;
            }

            main {

                padding: 15px 10px 120px;
            }

            #welcome {

                margin-top: 60px;

                font-size: 16px;
            }

            .bubble {

                max-width: 90%;

                font-size: 14px;
            }

            #messageInput {

                font-size: 14px;

                padding: 12px;
            }

            .action-btn {

                width: 42px;

                height: 42px;

                font-size: 18px;
            }
        }

    </style>

</head>


<body>


    <!-- ================= HEADER ================= -->

    <header>

        <div class="logo">
            KAIRA
        </div>

        <div class="online">
            ● ONLINE
        </div>

        <button id="usageBtn"
                onclick="toggleUsagePanel()">
            Usage
        </button>

    </header>


    <!-- ================= USAGE PANEL ================= -->

    <div id="usagePanel">

        <div class="usage-box">

            <div class="usage-card">

                <div class="usage-title">
                    Normal Requests
                </div>

                <div class="usage-number"
                     id="normalUsage">
                    0
                </div>

            </div>


            <div class="usage-card">

                <div class="usage-title">
                    Vision Requests
                </div>

                <div class="usage-number"
                     id="visionUsage">
                    0
                </div>

            </div>

        </div>


        <button id="resetUsageBtn"
                onclick="resetUsage()">

            Reset Usage

        </button>

    </div>


    <!-- ================= CHAT AREA ================= -->

    <main id="chatArea">

        <div id="welcome">

            <div style="font-size:45px;">
                🤖
            </div>

            <div>
                <b>नमस्ते बॉस 👋</b>
            </div>

            <div>
                मैं <b>KAIRA</b> हूँ।<br>
                बताइए, आज क्या काम करना है?
            </div>

        </div>

    </main>


    <!-- ================= INPUT ================= -->

    <div class="bottom-area">

        <div class="input-area">

            <input
                type="text"
                id="messageInput"
                placeholder="KAIRA से कुछ पूछें..."
                autocomplete="off"
            >


            <button
                class="action-btn"
                id="screenVisionBtn"
                onclick="analyzeScreen()"
                title="Screen Vision">

                🖥️

            </button>


            <button
                class="action-btn"
                id="voiceBtn"
                onclick="startVoice()"
                title="Voice">

                🎙️

            </button>


            <button
                class="action-btn send-btn"
                onclick="askKaira()"
                title="Send">

                ➤

            </button>

        </div>


        <div id="modeText">

            Text mode • 🎙️ दबाकर voice में बात करें

        </div>

    </div>


    <!--
    =====================================================
    PART 1 समाप्त
    PART 2 नीचे paste करना है
    =====================================================
    --> <script>

    /* =====================================================
       KAIRA — PART 2
       CHAT + USAGE + WEATHER + VOICE
    ===================================================== */


    /* ================= ELEMENTS ================= */

    const input =
        document.getElementById("messageInput");

    const chatArea =
        document.getElementById("chatArea");

    const welcome =
        document.getElementById("welcome");

    const voiceBtn =
        document.getElementById("voiceBtn");

    const modeText =
        document.getElementById("modeText");


    /* ================= USAGE ================= */

    let normalUsage =
        Number(
            localStorage.getItem("kairaNormalUsage") || 0
        );

    let visionUsage =
        Number(
            localStorage.getItem("kairaVisionUsage") || 0
        );


    function updateUsage() {

        document.getElementById("normalUsage").innerText =
            normalUsage;

        document.getElementById("visionUsage").innerText =
            visionUsage;
    }


    function countRequest(isVision = false) {

        if (isVision) {

            visionUsage++;

            localStorage.setItem(
                "kairaVisionUsage",
                visionUsage
            );

        } else {

            normalUsage++;

            localStorage.setItem(
                "kairaNormalUsage",
                normalUsage
            );
        }

        updateUsage();
    }


    function toggleUsagePanel() {

        const panel =
            document.getElementById("usagePanel");

        panel.style.display =
            panel.style.display === "block"
                ? "none"
                : "block";
    }


    function resetUsage() {

        normalUsage = 0;
        visionUsage = 0;

        localStorage.setItem(
            "kairaNormalUsage",
            "0"
        );

        localStorage.setItem(
            "kairaVisionUsage",
            "0"
        );

        updateUsage();
    }


    updateUsage();


    /* ================= ADD MESSAGE ================= */

    function addMessage(text, type) {

        if (welcome) {
            welcome.style.display = "none";
        }

        const message =
            document.createElement("div");

        message.className =
            "message " + type;


        const bubble =
            document.createElement("div");

        bubble.className =
            "bubble";

        bubble.innerText =
            text;


        message.appendChild(bubble);

        chatArea.appendChild(message);


        chatArea.scrollTop =
            chatArea.scrollHeight;
    }


    /* ================= WEATHER CHECK ================= */

    function isWeatherQuery(text) {

        const t =
            text.toLowerCase();

        const keywords = [

            "मौसम",
            "बारिश",
            "तापमान",
            "गर्मी",
            "ठंड",
            "weather",
            "temperature",
            "rain",
            "rainfall",
            "climate"

        ];

        return keywords.some(
            word =>
                t.includes(word)
        );
    }


    /* ================= LOCATION ================= */

    function getUserLocation() {

        return new Promise(
            (resolve, reject) => {

                const saved =
                    localStorage.getItem(
                        "kairaLocation"
                    );


                if (saved) {

                    try {

                        resolve(
                            JSON.parse(saved)
                        );

                        return;

                    } catch (error) {

                        localStorage.removeItem(
                            "kairaLocation"
                        );
                    }
                }


                if (!navigator.geolocation) {

                    reject(
                        new Error(
                            "Location उपलब्ध नहीं है।"
                        )
                    );

                    return;
                }


                navigator.geolocation.getCurrentPosition(

                    position => {

                        const location = {

                            latitude:
                                position.coords.latitude,

                            longitude:
                                position.coords.longitude

                        };


                        localStorage.setItem(
                            "kairaLocation",
                            JSON.stringify(location)
                        );


                        resolve(location);
                    },


                    error => {

                        reject(
                            new Error(
                                "Location permission नहीं मिली।"
                            )
                        );

                    },

                    {
                        enableHighAccuracy: false,
                        timeout: 10000,
                        maximumAge: 600000
                    }
                );
            }
        );
    }


    /* ================= WEATHER API ================= */

    async function getWeather(
        latitude,
        longitude
    ) {

        const url =
            "https://api.open-meteo.com/v1/forecast" +
            "?latitude=" + latitude +
            "&longitude=" + longitude +
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
            "&timezone=auto";


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Weather API error"
            );
        }


        return await response.json();
    }


    /* ================= WEATHER DESCRIPTION ================= */

    function weatherDescription(code) {

        const descriptions = {

            0: "आसमान साफ है ☀️",

            1: "मुख्यतः साफ मौसम है 🌤️",

            2: "आंशिक बादल हैं ⛅",

            3: "बादल छाए हुए हैं ☁️",

            45: "कोहरा है 🌫️",

            48: "कोहरा है 🌫️",

            51: "हल्की बूंदाबांदी हो रही है 🌦️",

            53: "बूंदाबांदी हो रही है 🌦️",

            55: "तेज बूंदाबांदी हो रही है 🌧️",

            61: "हल्की बारिश हो रही है 🌧️",

            63: "बारिश हो रही है 🌧️",

            65: "तेज बारिश हो रही है ⛈️",

            71: "हल्की बर्फबारी हो रही है ❄️",

            73: "बर्फबारी हो रही है ❄️",

            75: "तेज बर्फबारी हो रही है ❄️",

            80: "हल्की बारिश की बौछारें हैं 🌦️",

            81: "बारिश की बौछारें हैं 🌧️",

            82: "तेज बारिश की बौछारें हैं ⛈️",

            95: "गरज के साथ बारिश हो सकती है ⛈️",

            96: "गरज के साथ बारिश और ओले हो सकते हैं ⛈️",

            99: "गरज के साथ तेज बारिश और ओले हो सकते हैं ⛈️"

        };


        return (
            descriptions[code] ||
            "मौसम की जानकारी उपलब्ध है।"
        ); <script>

/* =====================================================
   PART 3 — CAMERA + SCREEN VISION
===================================================== */

let cameraStream = null;


/* =====================================================
   CAMERA
===================================================== */

async function startCamera() {

    try {

        if (cameraStream) {
            stopCamera();
        }

        cameraStream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment"
                },
                audio: false
            });

        const video = document.createElement("video");

        video.id = "kairaCamera";
        video.autoplay = true;
        video.playsInline = true;

        video.style.width = "100%";
        video.style.maxHeight = "300px";
        video.style.borderRadius = "15px";
        video.style.marginTop = "10px";

        video.srcObject = cameraStream;

        chatArea.appendChild(video);

        addMessage(
            "assistant",
            "📷 कैमरा चालू है। अब कैमरे के सामने जो दिख रहा है, उसके बारे में पूछ सकते हैं।"
        );

        return video;

    } catch (error) {

        console.error(error);

        addMessage(
            "assistant",
            "❌ कैमरा चालू नहीं हो पाया। कृपया Camera permission Allow करें।"
        );

    }
}


/* =====================================================
   STOP CAMERA
===================================================== */

function stopCamera() {

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => {
            track.stop();
        });

        cameraStream = null;
    }

    const video =
        document.getElementById("kairaCamera");

    if (video) {
        video.remove();
    }
}


/* =====================================================
   CAPTURE CAMERA FRAME
===================================================== */

async function captureCurrentFrame() {

    try {

        let video =
            document.getElementById("kairaCamera");

        if (!video) {
            video = await startCamera();
        }

        if (!video) return null;

        await new Promise(resolve => {
            setTimeout(resolve, 500);
        });

        const canvas =
            document.createElement("canvas");

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx =
            canvas.getContext("2d");

        ctx.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return canvas.toDataURL(
            "image/jpeg",
            0.8
        );

    } catch (error) {

        console.error(error);

        return null;
    }
}


/* =====================================================
   SCREEN VISION
===================================================== */

async function captureScreenFrame() {

    try {

        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getDisplayMedia) {

            addMessage(
                "assistant",
                "❌ इस Browser में Screen Sharing उपलब्ध नहीं है।"
            );

            return null;
        }

        const stream =
            await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });

        const video =
            document.createElement("video");

        video.srcObject = stream;

        video.muted = true;

        await video.play();

        await new Promise(resolve => {
            setTimeout(resolve, 700);
        });

        const canvas =
            document.createElement("canvas");

        canvas.width =
            video.videoWidth || 1280;

        canvas.height =
            video.videoHeight || 720;

        const ctx =
            canvas.getContext("2d");

        ctx.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const image =
            canvas.toDataURL(
                "image/jpeg",
                0.75
            );

        stream.getTracks().forEach(track => {
            track.stop();
        });

        return image;

    } catch (error) {

        console.error(error);

        addMessage(
            "assistant",
            "❌ Screen permission नहीं मिली।"
        );

        return null;
    }
}


/* =====================================================
   SCREEN ANALYSIS
===================================================== */

async function analyzeScreen() {

    addMessage(
        "assistant",
        "🖥️ स्क्रीन देख रहा हूँ..."
    );

    const image =
        await captureScreenFrame();

    if (!image) return;

    try {

        countRequest(true);

        const response =
            await fetch("/api/chat", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    message:
                        "मेरी स्क्रीन को ध्यान से देखो और बताओ कि स्क्रीन पर क्या दिखाई दे रहा है। अगर कोई error, button, setting या important information दिखाई दे तो उसे समझाओ।",

                    weather: null,

                    image: image
                })
            });

        const data =
            await response.json();

        if (data.reply) {

            addMessage(
                "assistant",
                data.reply
            );

            speakKaira(data.reply);

        } else {

            addMessage(
                "assistant",
                "मुझे स्क्रीन का जवाब नहीं मिला।"
            );
        }

    } catch (error) {

        console.error(error);

        addMessage(
            "assistant",
            "❌ Server से connection नहीं हो पाया।"
        );
    }
}


/* =====================================================
   CAMERA ANALYSIS
===================================================== */

async function analyzeCamera() {

    addMessage(
        "assistant",
        "📷 कैमरे से देख रहा हूँ..."
    );

    const image =
        await captureCurrentFrame();

    if (!image) return;

    try {

        countRequest(true);

        const response =
            await fetch("/api/chat", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    message:
                        "कैमरे में दिखाई दे रही चीज़ को ध्यान से देखकर समझाओ कि इसमें क्या दिखाई दे रहा है।",

                    weather: null,

                    image: image
                })
            });

        const data =
            await response.json();

        if (data.reply) {

            addMessage(
                "assistant",
                data.reply
            );

            speakKaira(data.reply);

        } else {

            addMessage(
                "assistant",
                "मुझे कैमरे की image का जवाब नहीं मिला।"
            );
        }

    } catch (error) {

        console.error(error);

        addMessage(
            "assistant",
            "❌ Camera vision server error।"
        );
    }
}


/* =====================================================
   VOICE COMMAND HELPER
===================================================== */

function processVisionCommand(text) {

    const command =
        text.toLowerCase().trim();


    /* SCREEN COMMANDS */

    if (
        command.includes("स्क्रीन देखो") ||
        command.includes("स्क्रीन देख") ||
        command.includes("screen dekho") ||
        command.includes("screen dekh") ||
        command.includes("screen check") ||
        command.includes("मेरी स्क्रीन") ||
        command.includes("screen analyze")
    ) {

        analyzeScreen();

        return true;
    }


    /* CAMERA COMMANDS */

    if (
        command.includes("कैमरा चालू") ||
        command.includes("camera chalu") ||
        command.includes("camera on") ||
        command.includes("मुझे देखो") ||
        command.includes("यह क्या है") ||
        command.includes("what is this")
    ) {

        analyzeCamera();

        return true;
    }


    return false;
}


/* =====================================================
   CAMERA BUTTON
===================================================== */

function cameraMode() {

    startCamera();
}


/* =====================================================
   SCREEN BUTTON
===================================================== */

function screenMode() {

    analyzeScreen();
}


/* =====================================================
   CLEANUP
===================================================== */

window.addEventListener(
    "beforeunload",
    function () {

        stopCamera();

    }
);


/* =====================================================
   GLOBAL BUTTON SUPPORT
===================================================== */

window.startCamera =
    startCamera;

window.stopCamera =
    stopCamera;

window.analyzeCamera =
    analyzeCamera;

window.analyzeScreen =
    analyzeScreen;

window.captureCurrentFrame =
    captureCurrentFrame;

window.captureScreenFrame =
    captureScreenFrame;

window.cameraMode =
    cameraMode;

window.screenMode =
    screenMode;


/* =====================================================
   PART 3 समाप्त
===================================================== */

</script>

</body>
</html>
