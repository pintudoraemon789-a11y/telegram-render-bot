# OpenClaw Gateway / Vero di Render

Repo ini sekarang menjalankan OpenClaw Gateway, bukan bot Express biasa.

## Render Settings

Service lama `telegram-render-bot` tetap bisa dipakai.

Pastikan Render memakai:

- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

## Environment Variables wajib

Isi di Render → service → Environment:

- `TELEGRAM_BOT_TOKEN` = token bot Telegram dari BotFather
- `OPENAI_API_KEY` = API key OpenAI
- `OPENCLAW_GATEWAY_TOKEN` = secret random panjang

Opsional tapi disarankan:

- `OPENCLAW_STATE_DIR=/opt/render/project/src/.openclaw-state`
- `OPENCLAW_WORKSPACE_DIR=/opt/render/project/src/.openclaw-state/workspace`

Jika memakai paid Render disk, arahkan ke `/data`:

- `OPENCLAW_STATE_DIR=/data/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=/data/workspace`

## Telegram

Config memakai polling default. Jangan jalankan service/bot lain dengan token Telegram yang sama agar tidak rebutan update.

## Deploy

Setelah push terbaru:

Render → service `telegram-render-bot` → Manual Deploy → Deploy latest commit.
