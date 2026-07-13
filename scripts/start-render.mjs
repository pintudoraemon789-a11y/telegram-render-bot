import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

await import("./ensure-openclaw-config.mjs");

const root = process.cwd();
const openclawCli = path.join(root, "node_modules", "openclaw", "openclaw.mjs");
const proxyScript = path.join(root, "scripts", "render-webhook-proxy.mjs");
const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT || "18789";
const childStatusPath = process.env.RENDER_CHILD_STATUS_PATH || "/tmp/openclaw-render-child-status.json";
const startupLogPath = process.env.RENDER_STARTUP_LOG_PATH || "/tmp/openclaw-render-startup.log";

function appendStartupLog(line) {
  try {
    fs.appendFileSync(startupLogPath, `${new Date().toISOString()} ${line}\n`);
  } catch {
    // Best-effort debug log only.
  }
}

function writeChildStatus(extra = {}) {
  const childrenStatus = [...children].map((child) => ({
    pid: child.pid,
    exitCode: child.exitCode,
    signalCode: child.signalCode,
    killed: child.killed,
  }));
  try {
    fs.writeFileSync(childStatusPath, `${JSON.stringify({
      updatedAt: new Date().toISOString(),
      shuttingDown,
      children: childrenStatus,
      ...extra,
    }, null, 2)}\n`);
  } catch (error) {
    console.warn(`Could not write child status ${childStatusPath}: ${error.message}`);
  }
}

if (!fs.existsSync(openclawCli)) {
  console.error(`OpenClaw CLI not found at ${openclawCli}`);
  console.error("Pastikan Build Command Render adalah: npm install");
  process.exit(127);
}

const children = new Set();
let shuttingDown = false;
writeChildStatus({ event: "init" });

function startChild(name, command, args) {
  console.log(`Starting ${name}: ${command} ${args.join(" ")}`);
  appendStartupLog(`Starting ${name}: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(chunk);
    appendStartupLog(`[${name} stdout] ${chunk.toString().trimEnd()}`);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(chunk);
    appendStartupLog(`[${name} stderr] ${chunk.toString().trimEnd()}`);
  });

  children.add(child);
  writeChildStatus({ event: "started", name, command, args, pid: child.pid });

  child.on("exit", (code, signal) => {
    children.delete(child);
    console.log(`${name} exited with code=${code ?? "null"} signal=${signal ?? "null"}`);
    writeChildStatus({ event: "exited", name, code, signal });

    if (!shuttingDown) {
      shuttingDown = true;
      for (const other of children) other.kill("SIGTERM");
      process.exit(code ?? 1);
    }
  });

  child.on("error", (error) => {
    console.error(`${name} failed to start:`, error);
    writeChildStatus({ event: "error", name, error: error.message });
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
