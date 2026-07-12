import express from "express";
import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // contoh: https://nama-app.onrender.com
const PORT = process.env.PORT || 3000;
const SECRET_PATH = process.env.SECRET_PATH || "/telegram-webhook";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN belum diisi. Set environment variable BOT_TOKEN di Render.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("Telegram bot is running ✅");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

bot.start((ctx) => {
  ctx.reply("Halo! Bot sudah aktif di Render ✅");
});

bot.help((ctx) => {
  ctx.reply("Kirim pesan apa saja, nanti aku echo balik.");
});

bot.on("text", (ctx) => {
  ctx.reply(`Mas kirim: ${ctx.message.text}`);
});

bot.catch((err, ctx) => {
  console.error(`Error saat handle update ${ctx.update?.update_id}:`, err);
});

async function start() {
  if (WEBHOOK_URL) {
    const webhookPath = SECRET_PATH.startsWith("/") ? SECRET_PATH : `/${SECRET_PATH}`;
    const webhookFullUrl = `${WEBHOOK_URL.replace(/\/$/, "")}${webhookPath}`;

    app.use(webhookPath, bot.webhookCallback(webhookPath));

    app.listen(PORT, async () => {
      await bot.telegram.setWebhook(webhookFullUrl);
      console.log(`Server jalan di port ${PORT}`);
      console.log(`Webhook aktif: ${webhookFullUrl}`);
    });
  } else {
    // Mode lokal/dev: polling. Jangan pakai polling di Render kalau pakai webhook.
    app.listen(PORT, () => console.log(`Health server jalan di port ${PORT}`));
    await bot.launch();
    console.log("Bot jalan dengan polling mode");
  }
}

start();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
