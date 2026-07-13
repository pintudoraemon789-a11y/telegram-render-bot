import fs from "node:fs";
import path from "node:path";

const stateDir = process.env.OPENCLAW_STATE_DIR || path.join(process.cwd(), ".openclaw-state");
const workspaceDir = process.env.OPENCLAW_WORKSPACE_DIR || path.join(stateDir, "workspace");
const configPath = process.env.OPENCLAW_CONFIG_PATH || path.join(stateDir, "openclaw.json");
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_URL || "";
const webhookPath = process.env.TELEGRAM_WEBHOOK_PATH || "/telegram-webhook";
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "${TELEGRAM_WEBHOOK_SECRET}";
const webhookLocalPort = Number(process.env.TELEGRAM_WEBHOOK_LOCAL_PORT || 8787);

fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(workspaceDir, { recursive: true });
fs.mkdirSync(path.dirname(configPath), { recursive: true });

if (!renderExternalUrl) {
  console.warn("RENDER_EXTERNAL_URL/WEBHOOK_URL belum diisi. Telegram webhookUrl akan kosong sampai env itu ditambahkan.");
}

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
        primary: "openai/gpt-5.5",
      },
    },
    list: [
      {
        id: "main",
        default: true,
        identity: {
          name: "Vero",
          theme: "Ramah, rajin, hangat, sigap, dan bisa diajak ngobrol santai dalam Bahasa Indonesia",
          emoji: "✨",
        },
      },
    ],
  },
  channels: {
    telegram: {
      enabled: true,
      botToken: "${TELEGRAM_BOT_TOKEN}",
      dmPolicy: "allowlist",
      allowFrom: ["506501649"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["506501649"],
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
