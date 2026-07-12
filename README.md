# Telegram Bot untuk Render

Template bot Telegram Node.js + Telegraf + Express, siap deploy ke Render.

## Fitur

- Catat pemasukan dan pengeluaran harian
- Lihat saldo dan 10 transaksi terakhir
- Simpan catatan teks sederhana
- Buat reminder/jadwal
- Menu bantuan via `/bantu`

## Perintah Bot

```text
/catat masuk 50000 gaji harian
/catat keluar 12000 makan
/saldo
/laporan
/file ide-bisnis isi catatan
/files
/ingat 2026-07-13 18:30 bayar listrik
/jadwal
/bantu
```

Catatan: reminder memakai waktu WIB. Penyimpanan default memakai file JSON lokal di folder `data/`.

Penting untuk Render Free: file lokal dan reminder tidak selalu tahan restart/sleep/deploy. Untuk penggunaan serius, pindahkan storage ke database seperti PostgreSQL/SQLite persistent disk.

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
