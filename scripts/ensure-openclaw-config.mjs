import fs from "node:fs";
import path from "node:path";

const stateDir = process.env.OPENCLAW_STATE_DIR || path.join(process.cwd(), ".openclaw-state");
const workspaceDir = process.env.OPENCLAW_WORKSPACE_DIR || path.join(stateDir, "workspace");
const configPath = process.env.OPENCLAW_CONFIG_PATH || path.join(stateDir, "openclaw.json");

fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(workspaceDir, { recursive: true });
fs.mkdirSync(path.dirname(configPath), { recursive: true });

if (!fs.existsSync(configPath)) {
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
        dmPolicy: "pairing",
        groupPolicy: "allowlist",
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
  console.log(`Created OpenClaw config: ${configPath}`);
} else {
  console.log(`Using existing OpenClaw config: ${configPath}`);
}
