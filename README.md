# Telegram Bot untuk Render

Template bot Telegram Node.js + Telegraf + Express, siap deploy ke Render.

## 1. Ambil token bot

1. Buka Telegram, chat `@BotFather`
2. Jalankan `/newbot`
3. Simpan tokennya

## 2. Upload ke GitHub

Upload isi folder ini ke repository GitHub baru.

## 3. Deploy ke Render

1. Buka https://render.com
2. New → Web Service
3. Connect repo GitHub bot ini
4. Isi:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Tambahkan Environment Variables:
   - `BOT_TOKEN` = token dari BotFather
   - `WEBHOOK_URL` = URL Render, contoh `https://telegram-render-bot.onrender.com`
   - `SECRET_PATH` = `/telegram-webhook`

Render otomatis memberi `PORT`, jadi tidak perlu diisi.

## 4. Tes

Buka URL Render:

```text
https://nama-app.onrender.com/health
```

Harus muncul:

```json
{"ok":true}
```

Lalu chat bot Telegram dan kirim `/start`.

## Catatan

- Di Render pakai webhook via `WEBHOOK_URL`.
- Kalau dijalankan lokal tanpa `WEBHOOK_URL`, bot otomatis pakai polling.
- Jangan commit token asli ke GitHub. Simpan token hanya di Render Environment Variables.
