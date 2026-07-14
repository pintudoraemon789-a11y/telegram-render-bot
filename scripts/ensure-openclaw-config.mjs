import fs from "node:fs";
import path from "node:path";

const stateDir = process.env.OPENCLAW_STATE_DIR || path.join(process.cwd(), ".openclaw-state");
const workspaceDir = process.env.OPENCLAW_WORKSPACE_DIR || path.join(stateDir, "workspace");
const configPath = process.env.OPENCLAW_CONFIG_PATH || path.join(stateDir, "openclaw.json");
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_URL || "";
const webhookPath = process.env.TELEGRAM_WEBHOOK_PATH || "/telegram-webhook";
let webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "telegram_webhook_secret_render_123456789";
if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
  console.warn("TELEGRAM_WEBHOOK_SECRET tidak valid untuk Telegram. Memakai fallback aman tanpa spasi/simbol.");
  webhookSecret = "telegram_webhook_secret_render_123456789";
}
process.env.TELEGRAM_WEBHOOK_SECRET = webhookSecret;

const webhookLocalPort = Number(process.env.TELEGRAM_WEBHOOK_LOCAL_PORT || 8787);
const openclawModel = process.env.OPENCLAW_MODEL || "openai/gpt-5.6-sol";
const openclawFallbackModel = process.env.OPENCLAW_FALLBACK_MODEL || "google/gemini-3.1-pro-preview";

process.env.OPENCLAW_STATE_DIR = stateDir;
process.env.OPENCLAW_WORKSPACE_DIR = workspaceDir;
process.env.OPENCLAW_CONFIG_PATH = configPath;

fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(workspaceDir, { recursive: true });
fs.mkdirSync(path.dirname(configPath), { recursive: true });

if (!renderExternalUrl) {
  console.warn("RENDER_EXTERNAL_URL/WEBHOOK_URL belum diisi. Telegram webhookUrl akan kosong sampai env itu ditambahkan.");
}

console.log(`Env check: TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN ? "set" : "missing"}`);
console.log(`Env check: OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? "set" : "missing"}`);
console.log(`Env check: GEMINI_API_KEY=${process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "set" : "missing"}`);
console.log(`Env check: OPENCLAW_GATEWAY_TOKEN=${process.env.OPENCLAW_GATEWAY_TOKEN ? "set" : "missing"}`);
console.log(`Env check: TELEGRAM_WEBHOOK_SECRET=${webhookSecret ? "set" : "missing"}`);
console.log(`Env check: RENDER_EXTERNAL_URL=${renderExternalUrl || "missing"}`);
console.log(`Env check: OPENCLAW_MODEL=${openclawModel}`);
console.log(`Env check: OPENCLAW_FALLBACK_MODEL=${openclawFallbackModel}`);

const normalizedPath = webhookPath.startsWith("/") ? webhookPath : `/${webhookPath}`;
const webhookUrl = renderExternalUrl ? `${renderExternalUrl.replace(/\/$/, "")}${normalizedPath}` : "";

const config = {
  gateway: {
    mode: "local",
    bind: "lan",
    auth: {
      mode: "token",
      token: "${OPENCLAW_GATEWAY_TOKEN}",
    },
  },
  agents: {
    defaults: {
      workspace: workspaceDir,
      model: {
        primary: openclawModel,
        fallbacks: [openclawFallbackModel],
      },
    },
    list: [
      {
        id: "main",
        default: true,
        identity: {
          name: "Vero",
          theme: "Ramah, rajin, hangat, sigap, dan bisa diajak ngobrol santai dalam Bahasa Indonesia",
          emoji: "âœ¨",
        },
      },
    ],
  },
  channels: {
    telegram: {
      enabled: true,
      botToken: "${TELEGRAM_BOT_TOKEN}",
      dmPolicy: "allowlist",
      allowFrom: [506501649, "telegram:506501649", "tg:506501649"],
      groupPolicy: "allowlist",
      groupAllowFrom: [506501649, "telegram:506501649", "tg:506501649"],
      webhookUrl,
      webhookSecret,
      webhookPath: normalizedPath,
      webhookHost: "127.0.0.1",
      webhookPort: webhookLocalPort,
      groups: {
        "*": {
          requireMention: true,
        },
      },
    },
  },
   commands: {
    ownerAllowFrom: ["telegram:506501649"],
  },
  messages: {
    visibleReplies: "automatic",
    groupChat: {
      visibleReplies: "automatic",
      unmentionedInbound: "room_event",
    },
  },
};

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote OpenClaw config: ${configPath}`);
if (webhookUrl) console.log(`Telegram webhook URL: ${webhookUrl}`);
