import express from "express";
import { Telegraf } from "telegraf";
import fs from "node:fs/promises";
import path from "node:path";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // contoh: https://nama-app.onrender.com
const PORT = process.env.PORT || 3000;
const SECRET_PATH = process.env.SECRET_PATH || "/telegram-webhook";
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bot-data.json");
const MAX_TIMER_MS = 2_147_483_647; // batas setTimeout sekitar 24.8 hari

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN belum diisi. Set environment variable BOT_TOKEN di Render.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const reminderTimers = new Map();

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("Telegram bot is running ✅");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

function emptyData() {
  return {
    transactions: [],
    notes: [],
    reminders: [],
  };
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(emptyData(), null, 2));
  }
}

async function readData() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return { ...emptyData(), ...JSON.parse(raw) };
}

async function writeData(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseAmount(text) {
  const cleaned = String(text).replace(/[^0-9,-]/g, "").replace(",", ".");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function parseReminderInput(text) {
  // Format: /ingat 2026-07-13 18:30 bayar listrik
  const match = text.match(/^\/ingat\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)/i);
  if (!match) return null;

  const [, datePart, timePart, message] = match;
  const dueAt = new Date(`${datePart}T${timePart}:00+07:00`); // WIB
  if (Number.isNaN(dueAt.getTime())) return null;

  return { dueAt, message: message.trim() };
}

function helpText() {
  return [
    "Halo Mas, aku bisa bantu catat keuangan, simpan catatan, dan ingetin jadwal.",
    "",
    "Perintah keuangan:",
    "• /catat masuk 50000 gaji harian",
    "• /catat keluar 12000 makan",
    "• /saldo",
    "• /laporan",
    "",
    "Perintah catatan/file:",
    "• /file ide-bisnis isi catatan Mas",
    "• /files",
    "",
    "Perintah reminder:",
    "• /ingat 2026-07-13 18:30 bayar listrik",
    "• /jadwal",
    "",
    "Perintah lain:",
    "• /bantu",
  ].join("\n");
}

async function addTransaction(ctx, text) {
  const match = text.match(/^\/catat\s+(masuk|pemasukan|keluar|pengeluaran)\s+([^\s]+)\s*(.*)$/i);
  if (!match) {
    return ctx.reply("Format: /catat masuk 50000 gaji atau /catat keluar 12000 makan");
  }

  const [, rawType, rawAmount, description] = match;
  const amount = parseAmount(rawAmount);
  if (!amount || amount <= 0) {
    return ctx.reply("Nominalnya belum valid. Contoh: /catat keluar 12000 makan");
  }

  const type = ["masuk", "pemasukan"].includes(rawType.toLowerCase()) ? "income" : "expense";
  const data = await readData();
  const item = {
    id: Date.now().toString(36),
    chatId: ctx.chat.id,
    type,
    amount,
    description: description.trim() || "Tanpa keterangan",
    createdAt: new Date().toISOString(),
  };

  data.transactions.push(item);
  await writeData(data);

  const label = type === "income" ? "Pemasukan" : "Pengeluaran";
  return ctx.reply(`${label} dicatat ✅\n${rupiah(amount)} — ${item.description}`);
}

async function showBalance(ctx) {
  const data = await readData();
  const items = data.transactions.filter((item) => item.chatId === ctx.chat.id);
  const income = items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expense;

  return ctx.reply([
    "Ringkasan saldo:",
    `Pemasukan: ${rupiah(income)}`,
    `Pengeluaran: ${rupiah(expense)}`,
    `Saldo: ${rupiah(balance)}`,
  ].join("\n"));
}

async function showReport(ctx) {
  const data = await readData();
  const items = data.transactions
    .filter((item) => item.chatId === ctx.chat.id)
    .slice(-10)
    .reverse();

  if (items.length === 0) return ctx.reply("Belum ada transaksi yang dicatat.");

  const lines = items.map((item) => {
    const sign = item.type === "income" ? "+" : "-";
    return `${sign} ${rupiah(item.amount)} — ${item.description} (${formatDate(new Date(item.createdAt))})`;
  });

  return ctx.reply(["10 transaksi terakhir:", ...lines].join("\n"));
}

async function saveNote(ctx, text) {
  const match = text.match(/^\/file\s+([^\s]+)\s+([\s\S]+)/i);
  if (!match) return ctx.reply("Format: /file nama-catatan isi catatan Mas");

  const [, name, content] = match;
  const data = await readData();
  data.notes.push({
    id: Date.now().toString(36),
    chatId: ctx.chat.id,
    name,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  });
  await writeData(data);

  return ctx.reply(`Catatan disimpan ✅\nNama: ${name}`);
}

async function listNotes(ctx) {
  const data = await readData();
  const notes = data.notes.filter((note) => note.chatId === ctx.chat.id).slice(-10).reverse();
  if (notes.length === 0) return ctx.reply("Belum ada catatan tersimpan.");

  return ctx.reply([
    "Catatan tersimpan:",
    ...notes.map((note) => `• ${note.name}: ${note.content.slice(0, 80)}`),
  ].join("\n"));
}

async function scheduleReminder(reminder) {
  const delay = new Date(reminder.dueAt).getTime() - Date.now();
  if (delay <= 0 || delay > MAX_TIMER_MS) return;

  if (reminderTimers.has(reminder.id)) clearTimeout(reminderTimers.get(reminder.id));

  const timer = setTimeout(async () => {
    try {
      await bot.telegram.sendMessage(reminder.chatId, `Pengingat ⏰\n${reminder.message}`);
      const data = await readData();
      const found = data.reminders.find((item) => item.id === reminder.id);
      if (found) found.done = true;
      await writeData(data);
      reminderTimers.delete(reminder.id);
    } catch (error) {
      console.error("Gagal mengirim reminder:", error);
    }
  }, delay);

  reminderTimers.set(reminder.id, timer);
}

async function addReminder(ctx, text) {
  const parsed = parseReminderInput(text);
  if (!parsed) {
    return ctx.reply("Format: /ingat 2026-07-13 18:30 bayar listrik\nWaktu pakai WIB.");
  }

  if (parsed.dueAt.getTime() <= Date.now()) {
    return ctx.reply("Waktunya sudah lewat, Mas. Pakai waktu yang akan datang ya.");
  }

  const data = await readData();
  const reminder = {
    id: Date.now().toString(36),
    chatId: ctx.chat.id,
    message: parsed.message,
    dueAt: parsed.dueAt.toISOString(),
    done: false,
    createdAt: new Date().toISOString(),
  };

  data.reminders.push(reminder);
  await writeData(data);
  await scheduleReminder(reminder);

  return ctx.reply(`Siap, aku ingatkan ✅\n${formatDate(parsed.dueAt)}\n${parsed.message}`);
}

async function listReminders(ctx) {
  const data = await readData();
  const reminders = data.reminders
    .filter((item) => item.chatId === ctx.chat.id && !item.done)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 10);

  if (reminders.length === 0) return ctx.reply("Belum ada jadwal/pengingat aktif.");

  return ctx.reply([
    "Jadwal/pengingat aktif:",
    ...reminders.map((item) => `• ${formatDate(new Date(item.dueAt))} — ${item.message}`),
  ].join("\n"));
}

async function restoreReminders() {
  const data = await readData();
  const pending = data.reminders.filter((item) => !item.done && new Date(item.dueAt).getTime() > Date.now());
  await Promise.all(pending.map(scheduleReminder));
  console.log(`Reminder aktif dipulihkan: ${pending.length}`);
}

bot.start((ctx) => {
  ctx.reply("Halo! Bot sudah aktif di Render ✅\n\n" + helpText());
});

bot.help((ctx) => ctx.reply(helpText()));
bot.command("bantu", (ctx) => ctx.reply(helpText()));
bot.command("catat", (ctx) => addTransaction(ctx, ctx.message.text));
bot.command("saldo", showBalance);
bot.command("laporan", showReport);
bot.command("file", (ctx) => saveNote(ctx, ctx.message.text));
bot.command("files", listNotes);
bot.command("ingat", (ctx) => addReminder(ctx, ctx.message.text));
bot.command("jadwal", listReminders);

bot.on("text", (ctx) => {
  ctx.reply("Aku belum paham perintah itu, Mas. Ketik /bantu untuk lihat menu.");
});

bot.catch((err, ctx) => {
  console.error(`Error saat handle update ${ctx.update?.update_id}:`, err);
});

async function start() {
  await ensureDataFile();
  await restoreReminders();

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
