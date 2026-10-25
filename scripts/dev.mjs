#!/usr/bin/env node
/*
 * Runs Manara locally in one terminal: the API, WebSockets, queue worker and
 * scheduler, and the five web apps. Ctrl+C stops everything.
 *
 *   npm run dev                  # everything
 *   npm run dev -- backend       # server side only (api, reverb, queue, scheduler)
 *   npm run dev -- web           # the five web apps only
 *   npm run dev -- api learner   # any mix of the names below
 *
 * A port that is already in use is left alone (that service is probably
 * running already) and the rest still start.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "api");
const webDir = path.join(root, "web");
const nextBin = path.join(webDir, "node_modules", "next", "dist", "bin", "next");
const windows = process.platform === "win32";

const web = (name, app, port, color, label) => ({ name, group: "web", port, color, label, cmd: process.execPath, args: [nextBin, "dev", `apps/${app}`, "-p", String(port)], cwd: webDir });
const SERVICES = [
  { name: "api", group: "backend", port: Number(process.env.MANARA_API_PORT) || 8001, color: 36, label: "API", custom: startApi, ready: "/up" },
  { name: "reverb", group: "backend", port: 8080, color: 35, label: "WebSockets", cmd: "php", args: ["artisan", "reverb:start", "--port=8080"], cwd: apiDir },
  { name: "queue", group: "backend", color: 34, label: "Queue worker", cmd: "php", args: ["artisan", "queue:listen", "--tries=3", "--timeout=0"], cwd: apiDir },
  { name: "scheduler", group: "backend", color: 90, label: "Scheduler", cmd: "php", args: ["artisan", "schedule:work"], cwd: apiDir },
  web("marketing", "marketing", 3010, 33, "Product website"),
  web("admin", "platform-admin", 3001, 31, "Platform admin"),
  web("site", "school-site", 3002, 32, "School websites (e.g. /greenwood)"),
  web("portal", "school-portal", 3003, 93, "Staff portal"),
  web("learner", "learner-portal", 3004, 92, "Learner & family portal"),
];

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const tint = (color, s) => `\x1b[${color}m${s}\x1b[0m`;
const width = Math.max(...SERVICES.map((s) => s.name.length));

// Which services to run --------------------------------------------------------
const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const unknown = wanted.filter((w) => !SERVICES.some((s) => s.name === w || s.group === w));
if (unknown.length) {
  console.error(`Unknown: ${unknown.join(", ")}. Choose from: backend, web, ${SERVICES.map((s) => s.name).join(", ")}`);
  process.exit(1);
}
const selected = wanted.length ? SERVICES.filter((s) => wanted.includes(s.name) || wanted.includes(s.group)) : SERVICES;

// Preflight --------------------------------------------------------------------
const missing = [];
if (selected.some((s) => s.group === "backend")) {
  if (!existsSync(path.join(apiDir, "vendor"))) missing.push("api/vendor (PHP packages)");
  if (!existsSync(path.join(apiDir, ".env"))) missing.push("api/.env");
  if (spawnSync("php", ["-v"]).status !== 0) missing.push("PHP on your PATH");
}
if (selected.some((s) => s.group === "web") && !existsSync(nextBin)) missing.push("web/node_modules (npm packages)");
if (missing.length) {
  console.error(`Missing ${missing.join(", ")}.\nRun ${bold("npm run setup")} first.`);
  process.exit(1);
}

/** True when something already accepts connections on the port (IPv4 or IPv6). */
function inUse(port) {
  const probe = (host) =>
    new Promise((resolve) => {
      const socket = net.connect({ port, host });
      socket.setTimeout(600);
      socket.once("connect", () => (socket.destroy(), resolve(true)));
      socket.once("timeout", () => (socket.destroy(), resolve(false)));
      socket.once("error", () => resolve(false));
    });
  return Promise.all([probe("127.0.0.1"), probe("::1")]).then((r) => r.some(Boolean));
}

// Start ------------------------------------------------------------------------
const children = [];
let stopping = false;

function prefix(service, chunk, stream) {
  const tag = tint(service.color, service.name.padEnd(width)) + tint(90, " │ ");
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line.trim()) stream.write(`${tag}${line}\n`);
  }
}

function start(service, { cmd = service.cmd, args = service.args, cwd = service.cwd, quiet } = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: "1", NEXT_TELEMETRY_DISABLED: "1" },
    shell: false,
    detached: !windows,
  });
  const out = (stream) => (d) => {
    const text = quiet ? d.toString().split(/\r?\n/).filter((l) => !quiet.test(l)).join("\n") : d;
    prefix(service, text, stream);
  };
  child.stdout.on("data", out(process.stdout));
  child.stderr.on("data", out(process.stderr));
  child.on("exit", (code) => {
    if (!stopping) prefix(service, tint(31, `stopped (exit code ${code}).`), process.stderr);
  });
  children.push(child);
  return child;
}

/*
 * The API. PHP's built-in server answers one request at a time (and can't run
 * extra workers on Windows), so the web apps' parallel requests would queue.
 * Instead: several PHP servers with OPcache on, and a tiny balancer on the
 * API port that hands each request to the least busy one.
 */
async function startApi(service) {
  const workers = Math.max(1, Number(process.env.MANARA_API_WORKERS) || 4);
  const hasOpcache = spawnSync("php", ["-r", "echo extension_loaded('Zend OPcache') ? 1 : 0;"], { encoding: "utf8" }).stdout.trim() === "1";
  const ini = [
    ...(hasOpcache ? [] : ["-d", "zend_extension=opcache"]),
    // Re-check files on every request so code edits show up straight away.
    ...["opcache.enable=1", "opcache.enable_cli=1", "opcache.validate_timestamps=1", "opcache.revalidate_freq=0", "opcache.memory_consumption=256"].flatMap((d) => ["-d", d]),
  ];
  const router = path.join(apiDir, "vendor", "laravel", "framework", "src", "Illuminate", "Foundation", "resources", "server.php");
  const pool = [];
  for (let i = 0; i < workers; i++) {
    const port = service.port + 100 + i;
    if (await inUse(port)) continue;
    start(service, { cmd: "php", args: [...ini, "-S", `127.0.0.1:${port}`, router], cwd: path.join(apiDir, "public"), quiet: /URI: |Accepted$|Closing$|Development Server .* started/ });
    pool.push({ port, active: 0 });
  }
  if (!pool.length) {
    prefix(service, tint(31, `no free ports for API workers (${service.port + 100}…).`), process.stderr);
    return;
  }

  const handler = (req, res) => {
    const worker = pool.reduce((best, w) => (w.active < best.active ? w : best));
    worker.active++;
    const done = () => (worker.active = Math.max(0, worker.active - 1));
    const upstream = http.request({ host: "127.0.0.1", port: worker.port, method: req.method, path: req.url, headers: req.headers }, (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
      answer.on("end", done);
    });
    upstream.on("error", (error) => {
      done();
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
      res.end(`API worker unavailable: ${error.message}`);
    });
    req.pipe(upstream);
  };
  for (const host of ["127.0.0.1", "::1"]) {
    const server = http.createServer(handler);
    server.on("error", (error) => host === "127.0.0.1" && prefix(service, tint(31, error.message), process.stderr));
    server.listen(service.port, host);
  }
  prefix(service, `${pool.length} PHP workers${hasOpcache ? "" : " (OPcache on)"} behind http://localhost:${service.port}`, process.stdout);
}

const skipped = [];
for (const service of selected) {
  if (service.port && (await inUse(service.port))) {
    skipped.push(service);
    continue;
  }
  if (service.custom) await service.custom(service);
  else start(service);
}

// Summary once the API answers (or after a while) ---------------------------------
const summary = () => {
  console.log(`\n${bold("Manara is running")} ${tint(90, "(Ctrl+C to stop)")}`);
  for (const s of selected.filter((s) => s.port)) {
    const note = skipped.includes(s) ? tint(90, " — port already in use, left as is") : "";
    console.log(`  ${s.label.padEnd(34)} ${bold(`http://localhost:${s.port}`)}${note}`);
  }
  console.log(`\n  Demo sign-in: teacher@greenwood.test / student@greenwood.test, password ${bold("password")}\n`);
};
if (skipped.length === selected.length) {
  summary();
  console.log("Everything you asked for is already running.");
  process.exit(0);
}
const api = selected.find((s) => s.name === "api" && !skipped.includes(s));
if (api) {
  const until = Date.now() + 60_000;
  const wait = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${api.port}${api.ready}`);
      if (response.ok) return summary();
    } catch {}
    if (Date.now() < until && !stopping) setTimeout(wait, 1000);
    else summary();
  };
  setTimeout(wait, 1500);
} else {
  setTimeout(summary, 4000);
}

// Stop -------------------------------------------------------------------------
function stop() {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping…");
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (windows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
    }
  }
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
