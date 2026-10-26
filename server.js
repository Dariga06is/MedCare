import db from "./database/db.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import OpenAI from "openai";
import patientAppointmentsRoutes from "./routes/patient-appointments.js";
import doctorAuthRoutes from "./routes/doctor-auth.js";
import doctorDataRoutes from "./routes/doctor-data.js";
import patientAuthRoutes from "./routes/patient-auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175"
    ],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET .env файлында дұрыс орнатылмаған");
}

app.use("/api/doctor", doctorAuthRoutes);
app.use("/api/doctor", doctorDataRoutes);
app.use("/api", patientAppointmentsRoutes);
app.use("/api/patient", patientAuthRoutes);

app.use(express.static(process.cwd()));

const telegramToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const telegramChatId = process.env.TELEGRAM_CHAT_ID?.trim();

let lastUpdateId = 0;
let supportReplies = [];
let telegramPollingStarted = false;
let telegramPollingStopped = false;

if (telegramToken && telegramChatId) {
    console.log("✅ Telegram Support қосылды");
} else {
    console.log("⚠️ Telegram баптаулары толық емес");
}

let openai = null;

if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    console.log("✅ MEDCARE AI қосылды");
} else {
    console.log("⚠️ OPENAI_API_KEY табылмады");
    console.log("⚠️ MEDCARE AI әзірге өшірулі");
}

app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="kk">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MEDCARE Server</title>
        </head>
        <body>
            <h1>MEDCARE Server</h1>
            <p>✅ Сервер жұмыс істеп тұр</p>
            <p>Telegram Support: ${telegramToken && telegramChatId ? "ON" : "OFF"}</p>
            <p>MEDCARE AI: ${openai ? "ON" : "OFF"}</p>
            <p>Екіжақты Support Chat: ON</p>
        </body>
        </html>
    `);
});



app.get("/api/clinics", (req, res) => {
  try {
    const clinics = db.prepare(
      "SELECT id, name, address, type, phone FROM clinics ORDER BY name"
    ).all();

    res.json(clinics);
  } catch (error) {
    console.error("Клиникаларды жүктеу қатесі:", error);
    res.status(500).json({ message: "Клиникаларды жүктеу мүмкін болмады" });
  }
});



app.get("/api/status", (req, res) => {
    res.json({
        server: true,
        telegram: Boolean(telegramToken && telegramChatId),
        telegramPolling: Boolean(telegramPollingStarted && !telegramPollingStopped),
        openai: Boolean(openai),
        twoWaySupport: true
    });
});

app.post("/api/support/telegram", async (req, res) => {
    try {
        const message = req.body.message;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "Хабарлама бос болмауы керек"
            });
        }

        if (!telegramToken || !telegramChatId) {
            return res.status(503).json({
                success: false,
                error: "Telegram баптаулары .env файлында толық емес"
            });
        }

        const time = new Date().toLocaleString("kk-KZ", {
            timeZone: "Asia/Almaty"
        });

        const telegramMessage =
            "🏥 MEDCARE SUPPORT\n\n" +
            "🔔 Жаңа хабарлама\n\n" +
            "💬 Хабарлама:\n" +
            message.trim() +
            "\n\n🕐 Уақыт: " +
            time +
            "\n\n↩️ Осы хабарламаға Reply жасап жауап беріңіз.";

        const response = await fetch(
            `https://api.telegram.org/bot${telegramToken}/sendMessage`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chat_id: telegramChatId,
                    text: telegramMessage
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            console.error("❌ TELEGRAM SEND ERROR:", data);

            return res.status(502).json({
                success: false,
                error: data.description || "Telegram-ға хабарлама жіберілмеді"
            });
        }

        console.log("✅ MEDCARE → Telegram сәтті");
        console.log("📩 Message ID:", data.result.message_id);

        return res.json({
            success: true,
            message: "Хабарлама қолдау қызметіне жіберілді",
            telegramMessageId: data.result.message_id
        });
    } catch (error) {
        console.error("❌ TELEGRAM SEND SERVER ERROR:", error.message);

        return res.status(500).json({
            success: false,
            error: "Telegram серверінде қате шықты"
        });
    }
});

async function checkTelegramReplies() {
    if (telegramPollingStarted) {
        console.log("ℹ️ Telegram polling бұрын іске қосылған");
        return;
    }

    if (!telegramToken || !telegramChatId) {
        console.log("⚠️ Telegram polling іске қосылмады: .env баптауларын тексер");
        return;
    }

    telegramPollingStarted = true;
    telegramPollingStopped = false;

    console.log("👂 Telegram жауаптарын күтіп тұр...");

    while (!telegramPollingStopped) {
        try {
            const url =
                `https://api.telegram.org/bot${telegramToken}` +
                `/getUpdates?offset=${lastUpdateId + 1}&timeout=20`;

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok || !data.ok) {
                console.error("❌ Telegram getUpdates қатесі:", data);

                if (data.error_code === 409) {
                    telegramPollingStopped = true;
                    console.error("🛑 Telegram polling тоқтатылды. Басқа getUpdates процесін тоқтатып, серверді қайта іске қос.");
                    break;
                }

                await sleep(5000);
                continue;
            }

            for (const update of data.result) {
                lastUpdateId = update.update_id;

                const telegramMessage = update.message;

                if (!telegramMessage) continue;

                if (String(telegramMessage.chat?.id) !== String(telegramChatId)) {
                    continue;
                }

                const messageText = telegramMessage.text?.trim();

                if (!messageText || messageText.startsWith("/")) {
                    continue;
                }

                const repliedMessage = telegramMessage.reply_to_message;

                if (!repliedMessage) {
                    console.log("ℹ️ Telegram хабарламасы Reply емес:", messageText);
                    continue;
                }

                if (!repliedMessage.from?.is_bot) {
                    console.log("ℹ️ Reply бот хабарламасына жасалмаған");
                    continue;
                }

                console.log("📥 Telegram → MEDCARE");
                console.log("💬 Support жауабы:", messageText);

                supportReplies.push({
                    id: telegramMessage.message_id,
                    text: messageText,
                    time: Date.now()
                });

                if (supportReplies.length > 50) {
                    supportReplies = supportReplies.slice(-50);
                }
            }
        } catch (error) {
            if (telegramPollingStopped) break;

            console.error("❌ Telegram polling қатесі:", error.message);
            await sleep(5000);
        }
    }

    console.log("ℹ️ Telegram polling циклі аяқталды");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.get("/api/support/replies", (req, res) => {
    const after = Number(req.query.after || 0);

    const replies = supportReplies.filter(reply => reply.time > after);

    return res.json({
        success: true,
        replies,
        serverTime: Date.now()
    });
});

app.post("/api/chat", async (req, res) => {
    try {
        const message = req.body.message;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "Хабарлама бос болмауы керек"
            });
        }

        if (!openai) {
            return res.status(503).json({
                success: false,
                error: "MEDCARE AI әзірге қосылмаған"
            });
        }

        const response = await openai.responses.create({
            model: "gpt-5.6",
            instructions:
                "Сен MEDCARE медициналық платформасының көмекшісісің. " +
                "Пайдаланушы қай тілде жазса, сол тілде жауап бер. " +
                "Қысқа әрі түсінікті жауап бер. Диагноз қойма.",
            input: message.trim()
        });

        return res.json({
            success: true,
            reply: response.output_text
        });
    } catch (error) {
        console.error("❌ AI ERROR:", error.message);

        return res.status(500).json({
            success: false,
            error: "AI жауап беру кезінде қате шықты"
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "MEDCARE API табылмады",
        path: req.originalUrl
    });
});

app.listen(PORT, () => {
    console.log("");
    console.log("======================================");
    console.log("🚀 MEDCARE сервері жұмыс істеп тұр");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📨 Telegram Support: ${telegramToken && telegramChatId ? "ON" : "OFF"}`);
    console.log(`🤖 MEDCARE AI: ${openai ? "ON" : "OFF"}`);
    console.log("↔️ Екіжақты Support Chat: ON");
    console.log("======================================");
});

checkTelegramReplies();
