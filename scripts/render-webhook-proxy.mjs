import http from "node:http";
import fs from "node:fs";

const port = Number(process.env.PORT || 3000);
const webhookPath = (process.env.TELEGRAM_WEBHOOK_PATH || "/telegram-webhook").startsWith("/")
  ? process.env.TELEGRAM_WEBHOOK_PATH || "/telegram-webhook"
  : `/${process.env.TELEGRAM_WEBHOOK_PATH}`;
const targetPort = Number(process.env.TELEGRAM_WEBHOOK_LOCAL_PORT || 8787);
const targetUrl = `http://127.0.0.1:${targetPort}${webhookPath}`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "openclaw-render-webhook-proxy" }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/debug") {
      let localWebhookReachable = false;
      let localWebhookStatus = null;
      try {
        const response = await fetch(targetUrl, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        localWebhookReachable = true;
        localWebhookStatus = response.status;
      } catch {
        localWebhookReachable = false;
      }

      res.writeHead(200, { "content-type": "application/json" });
      let childStatus = null;
      try {
        childStatus = JSON.parse(fs.readFileSync(process.env.RENDER_CHILD_STATUS_PATH || "/tmp/openclaw-render-child-status.json", "utf8"));
      } catch {
        childStatus = null;
      }

      let startupLogTail = [];
      try {
        const rawLog = fs.readFileSync(process.env.RENDER_STARTUP_LOG_PATH || "/tmp/openclaw-render-startup.log", "utf8");
        const secrets = [
          process.env.TELEGRAM_BOT_TOKEN,
          process.env.OPENAI_API_KEY,
          process.env.OPENCLAW_GATEWAY_TOKEN,
          process.env.TELEGRAM_WEBHOOK_SECRET,
        ].filter(Boolean);
        let safeLog = rawLog;
        for (const secret of secrets) safeLog = safeLog.split(secret).join("***");
        startupLogTail = safeLog.split(/\r?\n/).filter(Boolean).slice(-120);
      } catch {
        startupLogTail = [];
      }

      res.end(JSON.stringify({
        ok: true,
        service: "openclaw-render-webhook-proxy",
        webhookPath,
        targetUrl,
        localWebhookReachable,
        localWebhookStatus,
        childStatus,
        startupLogTail,
        env: {
          telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ? "set" : "missing",
          openaiApiKey: process.env.OPENAI_API_KEY ? "set" : "missing",
          openclawGatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN ? "set" : "missing",
          telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ? "set" : "missing",
          renderExternalUrl: process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_URL || "missing",
        },
      }));
      return;
    }

    if (url.pathname === webhookPath) {
      if (req.method !== "POST") {
        res.writeHead(405, { "content-type": "text/plain" });
        res.end("Method Not Allowed");
        return;
      }

      const body = await readBody(req);
      const headers = { ...req.headers };
      delete headers.host;
      delete headers.connection;
      delete headers["content-length"];

      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers,
        body,
      });

      const text = await upstream.text();
      res.writeHead(upstream.status, {
        "content-type": upstream.headers.get("content-type") || "text/plain",
      });
      res.end(text);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not Found");
  } catch (error) {
    console.error("Webhook proxy error:", error);
    res.writeHead(502, { "content-type": "text/plain" });
    res.end("Bad Gateway");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Render webhook proxy listening on 0.0.0.0:${port}`);
  console.log(`Forwarding ${webhookPath} -> ${targetUrl}`);
});
