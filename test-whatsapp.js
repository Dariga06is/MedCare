import dotenv from "dotenv";

dotenv.config();

const token = process.env.WHATSAPP_TOKEN?.trim();
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

console.log("TOKEN найден:", Boolean(token));
console.log("TOKEN длина:", token?.length);
console.log("TOKEN начало:", token ? token.slice(0, 4) + "..." : "нет");
console.log("PHONE ID:", phoneId);

if (!token || !phoneId) {
    console.log("❌ Проверь .env");
    process.exit();
}

const response = await fetch(
    `https://graph.facebook.com/v25.0/${phoneId}`,
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
);

const data = await response.json();

console.log("\nHTTP:", response.status);
console.log(JSON.stringify(data, null, 2));