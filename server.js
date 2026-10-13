import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

console.log("MEDCARE сервері іске қосылып жатыр...");


// ======================================================
// TELEGRAM CONFIG
// ======================================================

const telegramToken =
    process.env.TELEGRAM_BOT_TOKEN?.trim();

const telegramChatId =
    process.env.TELEGRAM_CHAT_ID?.trim();


// Telegram-нан соңғы алынған update
let lastUpdateId = 0;


// MEDCARE-ге жіберілетін support жауаптары
let supportReplies = [];


if (telegramToken && telegramChatId) {

    console.log("✅ Telegram Support қосылды");

} else {

    console.log("⚠️ Telegram баптаулары толық емес");

}


// ======================================================
// OPENAI
// ======================================================

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


// ======================================================
// MAIN PAGE
// ======================================================

app.get("/", (req, res) => {

    res.send(`
        <!DOCTYPE html>

        <html lang="kk">

        <head>
            <meta charset="UTF-8">
            <title>MEDCARE Server</title>
        </head>

        <body>

            <h1>MEDCARE Server</h1>

            <p>✅ Сервер жұмыс істеп тұр</p>

            <p>
                Telegram Support:
                ${
                    telegramToken && telegramChatId
                        ? "ON"
                        : "OFF"
                }
            </p>

            <p>
                MEDCARE AI:
                ${
                    openai
                        ? "ON"
                        : "OFF"
                }
            </p>

            <p>
                Екіжақты Support Chat: ON
            </p>

        </body>

        </html>
    `);

});


// ======================================================
// STATUS
// ======================================================

app.get("/api/status", (req, res) => {

    res.json({

        server: true,

        telegram: Boolean(
            telegramToken &&
            telegramChatId
        ),

        openai: Boolean(openai),

        twoWaySupport: true

    });

});


// ======================================================
// MEDCARE -> TELEGRAM
// ======================================================

app.post(
    "/api/support/telegram",

    async (req, res) => {

        try {

            const message =
                req.body.message;


            // ------------------------------------------
            // MESSAGE CHECK
            // ------------------------------------------

            if (
                !message ||
                typeof message !== "string" ||
                !message.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Хабарлама бос болмауы керек"

                    });

            }


            // ------------------------------------------
            // TELEGRAM CONFIG CHECK
            // ------------------------------------------

            if (!telegramToken) {

                return res
                    .status(503)
                    .json({

                        success: false,

                        error:
                            "TELEGRAM_BOT_TOKEN табылмады"

                    });

            }


            if (!telegramChatId) {

                return res
                    .status(503)
                    .json({

                        success: false,

                        error:
                            "TELEGRAM_CHAT_ID табылмады"

                    });

            }


            // ------------------------------------------
            // TIME
            // ------------------------------------------

            const time =
                new Date()
                    .toLocaleString(
                        "kk-KZ",
                        {
                            timeZone:
                                "Asia/Almaty"
                        }
                    );


            // ------------------------------------------
            // TELEGRAM MESSAGE
            // ------------------------------------------

            const telegramMessage =

                "🏥 MEDCARE SUPPORT\n\n" +

                "🔔 Жаңа хабарлама\n\n" +

                "💬 Хабарлама:\n" +

                message.trim() +

                "\n\n" +

                "🕐 Уақыт: " +

                time +

                "\n\n" +

                "↩️ Осы хабарламаға Reply жасап жауап беріңіз.";


            console.log("");
            console.log(
                "======================================"
            );

            console.log(
                "📨 MEDCARE → Telegram"
            );

            console.log(
                "💬 Хабарлама:",
                message.trim()
            );

            console.log(
                "======================================"
            );


            // ------------------------------------------
            // TELEGRAM SENDMESSAGE
            // ------------------------------------------

            const response =
                await fetch(

                    `https://api.telegram.org/bot${telegramToken}/sendMessage`,

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                chat_id:
                                    telegramChatId,

                                text:
                                    telegramMessage

                            })

                    }

                );


            const data =
                await response.json();


            // ------------------------------------------
            // ERROR
            // ------------------------------------------

            if (
                !response.ok ||
                !data.ok
            ) {

                console.error(
                    "❌ TELEGRAM SEND ERROR:"
                );

                console.error(data);


                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        error:
                            data.description ||
                            "Telegram-ға хабарлама жіберілмеді"

                    });

            }


            // ------------------------------------------
            // SUCCESS
            // ------------------------------------------

            console.log(
                "✅ MEDCARE → Telegram сәтті"
            );


            console.log(
                "📩 Message ID:",
                data.result.message_id
            );


            return res.json({

                success:
                    true,

                message:
                    "Хабарлама MEDCARE қолдау қызметіне жіберілді",

                telegramMessageId:
                    data.result.message_id

            });


        } catch (error) {

            console.error(
                "❌ TELEGRAM SEND SERVER ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Telegram серверінде қате шықты"

                });

        }

    }
);


// ======================================================
// TELEGRAM -> MEDCARE POLLING
// ======================================================

async function checkTelegramReplies() {

    // Telegram конфигурациясы болмаса
    // polling басталмайды

    if (
        !telegramToken ||
        !telegramChatId
    ) {

        console.log(
            "⚠️ Telegram polling іске қосылмады"
        );

        return;

    }


    console.log(
        "👂 Telegram жауаптарын күтіп тұр..."
    );


    // Бір ғана polling цикл
    while (true) {

        try {

            // ------------------------------------------
            // GET UPDATES
            // ------------------------------------------

            const url =

                `https://api.telegram.org/bot${telegramToken}` +

                `/getUpdates?offset=${lastUpdateId + 1}&timeout=20`;


            const response =
                await fetch(url);


            const data =
                await response.json();


            // ------------------------------------------
            // TELEGRAM ERROR
            // ------------------------------------------

            if (
                !response.ok ||
                !data.ok
            ) {

                console.error(
                    "❌ Telegram getUpdates қатесі:"
                );

                console.error(data);


                // Егер 409 болса да
                // сервер құламайды

                await sleep(3000);

                continue;

            }


            // ------------------------------------------
            // UPDATES
            // ------------------------------------------

            for (
                const update
                of data.result
            ) {

                // update_id сақтаймыз

                lastUpdateId =
                    update.update_id;


                const telegramMessage =
                    update.message;


                if (!telegramMessage) {

                    continue;

                }


                // --------------------------------------
                // Тек біздің Telegram chat
                // --------------------------------------

                if (
                    String(
                        telegramMessage.chat?.id
                    )
                    !==
                    String(
                        telegramChatId
                    )
                ) {

                    continue;

                }


                // --------------------------------------
                // TEXT
                // --------------------------------------

                const text =
                    telegramMessage
                        .text
                        ?.trim();


                if (!text) {

                    continue;

                }


                // --------------------------------------
                // /start және command өткізу
                // --------------------------------------

                if (
                    text.startsWith("/")
                ) {

                    continue;

                }


                // --------------------------------------
                // REPLY CHECK
                // --------------------------------------

                const repliedMessage =
                    telegramMessage
                        .reply_to_message;


                // Reply болмаса MEDCARE-ге жібермейміз

                if (!repliedMessage) {

                    console.log(
                        "ℹ️ Telegram хабарламасы Reply емес:",
                        text
                    );

                    continue;

                }


                // --------------------------------------
                // Reply бот хабарламасына ма?
                // --------------------------------------

                if (
                    !repliedMessage
                        .from
                        ?.is_bot
                ) {

                    console.log(
                        "ℹ️ Reply бот хабарламасына жасалмаған"
                    );

                    continue;

                }


                // --------------------------------------
                // SUPPORT REPLY
                // --------------------------------------

                console.log("");
                console.log(
                    "======================================"
                );

                console.log(
                    "📥 Telegram → MEDCARE"
                );

                console.log(
                    "💬 Support жауабы:",
                    text
                );

                console.log(
                    "======================================"
                );


                // --------------------------------------
                // SAVE REPLY
                // --------------------------------------

                supportReplies.push({

                    id:
                        telegramMessage
                            .message_id,

                    text:
                        text,

                    time:
                        Date.now()

                });


                // Соңғы 50 жауапты ғана сақтау

                if (
                    supportReplies.length >
                    50
                ) {

                    supportReplies =
                        supportReplies
                            .slice(-50);

                }

            }


        } catch (error) {

            console.error(
                "❌ Telegram polling қатесі:",
                error.message
            );


            await sleep(3000);

        }

    }

}


// ======================================================
// SLEEP
// ======================================================

function sleep(ms) {

    return new Promise(

        resolve =>
            setTimeout(
                resolve,
                ms
            )

    );

}


// ======================================================
// MEDCARE GET SUPPORT REPLIES
// ======================================================

app.get(
    "/api/support/replies",

    (req, res) => {

        const after =
            Number(
                req.query.after ||
                0
            );


        const replies =
            supportReplies
                .filter(

                    reply =>
                        reply.time >
                        after

                );


        return res.json({

            success:
                true,

            replies:
                replies,

            serverTime:
                Date.now()

        });

    }
);


// ======================================================
// MEDCARE AI
// ======================================================

app.post(
    "/api/chat",

    async (req, res) => {

        try {

            const message =
                req.body.message;


            if (
                !message ||
                typeof message !== "string" ||
                !message.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        error:
                            "Хабарлама бос болмауы керек"

                    });

            }


            if (!openai) {

                return res
                    .status(503)
                    .json({

                        success:
                            false,

                        error:
                            "MEDCARE AI әзірге қосылмаған"

                    });

            }


            const response =
                await openai
                    .responses
                    .create({

                        model:
                            "gpt-5.6",

                        instructions:
                            "Сен MEDCARE медициналық платформасының көмекшісісің. " +
                            "Пайдаланушы қай тілде жазса, сол тілде жауап бер. " +
                            "Қысқа әрі түсінікті жауап бер. " +
                            "Диагноз қойма.",

                        input:
                            message.trim()

                    });


            return res.json({

                success:
                    true,

                reply:
                    response.output_text

            });


        } catch (error) {

            console.error(
                "❌ AI ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "AI жауап беру кезінде қате шықты"

                });

        }

    }
);


// ======================================================
// 404
// ======================================================

app.use(
    (req, res) => {

        res
            .status(404)
            .json({

                success:
                    false,

                error:
                    "MEDCARE API табылмады"

            });

    }
);


// ======================================================
// SERVER
// ======================================================

const PORT =
    process.env.PORT ||
    3000;


// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,

    () => {

        console.log("");
        console.log(
            "======================================"
        );

        console.log(
            "🚀 MEDCARE сервері жұмыс істеп тұр"
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            `📨 Telegram Support: ${
                telegramToken &&
                telegramChatId

                    ? "ON"
                    : "OFF"
            }`
        );

        console.log(
            `🤖 MEDCARE AI: ${
                openai
                    ? "ON"
                    : "OFF"
            }`
        );

        console.log(
            "↔️ Екіжақты Support Chat: ON"
        );

        console.log(
            "======================================"
        );

    }
);


// ======================================================
// START TELEGRAM POLLING
// ======================================================

// МАҢЫЗДЫ:
// checkTelegramReplies тек БІР РЕТ іске қосылады.
// setInterval қолданылмайды.

checkTelegramReplies();