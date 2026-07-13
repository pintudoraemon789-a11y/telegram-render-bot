import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

await import("./ensure-openclaw-config.mjs");

const root = process.cwd();
const openclawCli = path.join(root, "node_modules", "openclaw", "openclaw.mjs");
const proxyScript = path.join(root, "scripts", "render-webhook-proxy.mjs");
const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT || "18789";

if (!fs.existsSync(openclawCli)) {
  console.error(`OpenClaw CLI not found at ${openclawCli}`);
  console.error("Pastikan Build Command Render adalah: npm install");
  process.exit(127);
}

const children = new Set();
let shuttingDown = false;

function startChild(name, command, args) {
  console.log(`Starting ${name}: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);
    console.log(`${name} exited with code=${code ?? "null"} signal=${signal ?? "null"}`);

    if (!shuttingDown) {
      shuttingDown = true;
      for (const other of children) other.kill("SIGTERM");
      process.exit(code ?? 1);
    }
  });

  child.on("error", (error) => {
    console.error(`${name} failed to start:`, error);
    if (!shuttingDown) {
      shuttingDown = true;
      for (const other of children) other.kill("SIGTERM");
      process.exit(1);
    }
  });

  return child;
}

startChild("Render webhook proxy", process.execPath, [proxyScript]);
startChild("OpenClaw Gateway", process.execPath, [openclawCli, "gateway", "run", "--bind", "lan", "--port", gatewayPort]);

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, stopping children...`);
  for (const child of children) child.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
