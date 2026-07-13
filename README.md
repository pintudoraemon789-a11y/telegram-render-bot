# OpenClaw Gateway / Vero di Render via Telegram Webhook

Repo ini menjalankan OpenClaw Gateway dan menerima update Telegram via webhook di Render.

## Cara kerja

Render hanya expose satu port publik (`PORT`). Karena OpenClaw Telegram webhook memakai listener lokal sendiri, repo ini menjalankan:

- proxy publik Render di `PORT`
- OpenClaw Telegram webhook lokal di `127.0.0.1:8787`
- OpenClaw Gateway internal di `18789`

Proxy meneruskan `POST /telegram-webhook` ke OpenClaw lokal.

## Render Settings

Service lama `telegram-render-bot` tetap dipakai.

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
- `TELEGRAM_WEBHOOK_SECRET` = secret random panjang untuk verifikasi webhook Telegram
- `RENDER_EXTERNAL_URL` = URL Render, contoh `https://telegram-render-bot-ir2l.onrender.com`

Environment lain:

- `TELEGRAM_WEBHOOK_PATH=/telegram-webhook`
- `TELEGRAM_WEBHOOK_LOCAL_PORT=8787`
- `OPENCLAW_GATEWAY_PORT=18789`

Untuk service tanpa persistent disk, pakai:

- `OPENCLAW_STATE_DIR=/opt/render/project/src/.openclaw-state`
- `OPENCLAW_WORKSPACE_DIR=/opt/render/project/src/.openclaw-state/workspace`

Jika nanti memakai paid Render disk, baru boleh ganti ke:

- `OPENCLAW_STATE_DIR=/data/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=/data/workspace`

## Deploy

Render → service `telegram-render-bot` → Manual Deploy → Deploy latest commit.

Tes setelah live:

- `GET /health` harus `ok: true`
- `GET /telegram-webhook` boleh `405` atau `404`; Telegram webhook memakai `POST`, bukan GET
- Kirim pesan ke bot Telegram

Jangan jalankan service lain atau OpenClaw lokal dengan token Telegram yang sama, supaya tidak rebutan update.
