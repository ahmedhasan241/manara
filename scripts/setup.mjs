#!/usr/bin/env node
/*
 * First-time local setup for Manara (safe to run again):
 *   API  — composer install, .env, app key, Reverb keys, SQLite file, migrations, demo data
 *   Web  — npm install, a .env.local for each app (with the Reverb key filled in)
 *
 *   npm run setup            # set up, keep existing data
 *   npm run setup -- --fresh # also wipe the database and reseed the demo data
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, randomInt } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "api");
const webDir = path.join(root, "web");
const APPS = ["marketing", "platform-admin", "school-site", "school-portal", "learner-portal"];
const fresh = process.argv.includes("--fresh");
const windows = process.platform === "win32";
// composer and npm are batch files on Windows and need a shell; php.exe and node do not
// (and a shell would split arguments like `-r "echo PHP_VERSION;"`).
const needsShell = (cmd) => windows && (cmd === "composer" || cmd === "npm");

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const gold = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const step = (s) => console.log(`\n${gold("▸")} ${bold(s)}`);

/** Runs a command in the foreground; exits setup if it fails. */
function run(cmd, args, cwd, { capture = false, optional = false } = {}) {
  const result = spawnSync(cmd, args, { cwd, stdio: capture ? "pipe" : "inherit", shell: needsShell(cmd), encoding: "utf8" });
  if (result.status !== 0 && !optional) {
    if (capture) process.stderr.write(result.stderr || result.stdout || "");
    console.error(red(`\n✖ "${cmd} ${args.join(" ")}" failed in ${path.relative(root, cwd) || "."}.`));
    process.exit(1);
  }
  return (result.stdout || "").trim();
}

function need(name, cmd, args, minimum, parse) {
  const result = spawnSync(cmd, args, { shell: needsShell(cmd), encoding: "utf8" });
  if (result.status !== 0) {
    console.error(red(`✖ ${name} was not found. Install ${name} ${minimum}+ and try again.`));
    process.exit(1);
  }
  const version = parse(result.stdout);
  console.log(`  ${name} ${version}`);
  return version;
}

const atLeast = (version, minimum) => {
  const [a, b] = version.split(".").map(Number);
  const [x, y] = minimum.split(".").map(Number);
  return a > x || (a === x && b >= y);
};

/** Reads and updates KEY=value lines in an env file. */
const envGet = (text, key) => text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^"(.*)"$/, "$1") ?? "";
const envSet = (text, key, value) => (new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`) : `${text.trimEnd()}\n${key}=${value}\n`);

// 1. Tools ------------------------------------------------------------------
step("Checking tools");
const node = process.versions.node;
console.log(`  Node ${node}`);
if (!atLeast(node, "22.0")) {
  console.error(red("✖ Node 22 or newer is needed."));
  process.exit(1);
}
const php = need("PHP", "php", ["-r", "echo PHP_VERSION;"], "8.4", (out) => out.trim());
if (!atLeast(php, "8.4")) {
  console.error(red("✖ PHP 8.4 or newer is needed."));
  process.exit(1);
}
// Without Composer an already-installed api/vendor is good enough to keep going.
const hasVendor = existsSync(path.join(apiDir, "vendor", "autoload.php"));
const hasComposer = spawnSync("composer", ["--version", "--no-ansi"], { shell: needsShell("composer"), encoding: "utf8" }).status === 0;
if (hasComposer || !hasVendor) need("Composer", "composer", ["--version", "--no-ansi"], "2", (out) => out.match(/\d+\.\d+\.\d+/)?.[0] ?? "?");
else console.log(gold("  Composer not found — using the PHP packages already in api/vendor"));
for (const ext of ["pdo_sqlite", "intl", "mbstring", "openssl"]) {
  const loaded = spawnSync("php", ["-r", `echo extension_loaded('${ext}') ? 'yes' : 'no';`], { encoding: "utf8" }).stdout.trim();
  if (loaded !== "yes") {
    console.error(red(`✖ The PHP extension "${ext}" is not enabled. Enable it in php.ini and try again.`));
    process.exit(1);
  }
}

// 2. API --------------------------------------------------------------------
step("API: installing PHP packages");
if (hasComposer) run("composer", ["install", "--no-interaction", "--no-progress"], apiDir);

step("API: environment");
const envPath = path.join(apiDir, ".env");
if (!existsSync(envPath)) {
  copyFileSync(path.join(apiDir, ".env.example"), envPath);
  console.log("  created api/.env from .env.example");
}
let env = readFileSync(envPath, "utf8");
if (!envGet(env, "APP_KEY")) {
  run("php", ["artisan", "key:generate", "--force", "--no-interaction"], apiDir);
  env = readFileSync(envPath, "utf8");
}
if (!envGet(env, "REVERB_APP_KEY")) {
  const token = () => randomBytes(15).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  env = envSet(env, "REVERB_APP_ID", String(randomInt(100000, 999999)));
  env = envSet(env, "REVERB_APP_KEY", token());
  env = envSet(env, "REVERB_APP_SECRET", token());
  writeFileSync(envPath, env);
  console.log("  generated Reverb (WebSocket) keys");
}
if (envGet(env, "DB_CONNECTION") === "sqlite") {
  const configured = envGet(env, "DB_DATABASE");
  const file = configured ? path.resolve(apiDir, configured) : path.join(apiDir, "database", "database.sqlite");
  if (!existsSync(file)) {
    writeFileSync(file, "");
    console.log(`  created ${path.relative(root, file)}`);
  }
}
console.log("  api/.env is ready");

step(fresh ? "API: rebuilding the database with demo data" : "API: database");
if (fresh) {
  run("php", ["artisan", "migrate:fresh", "--seed", "--force", "--no-interaction"], apiDir);
} else {
  run("php", ["artisan", "migrate", "--force", "--no-interaction"], apiDir);
  const users = run("php", ["artisan", "tinker", "--execute", "echo \\App\\Models\\User::count();"], apiDir, { capture: true });
  if (/^0$/m.test(users.split("\n").pop() ?? "")) {
    run("php", ["artisan", "db:seed", "--force", "--no-interaction"], apiDir);
  } else {
    console.log("  existing data kept (use --fresh to reset the demo data)");
  }
}
run("php", ["artisan", "storage:link", "--no-interaction"], apiDir, { capture: true, optional: true });

// 3. Web --------------------------------------------------------------------
step("Web: installing packages");
run("npm", ["install", "--no-audit", "--no-fund"], webDir);

step("Web: environment files");
const reverbKey = envGet(readFileSync(envPath, "utf8"), "REVERB_APP_KEY");
for (const app of APPS) {
  const dir = path.join(webDir, "apps", app);
  const local = path.join(dir, ".env.local");
  if (!existsSync(local)) {
    copyFileSync(path.join(dir, ".env.example"), local);
    console.log(`  created web/apps/${app}/.env.local`);
  }
  let text = readFileSync(local, "utf8");
  if (/^NEXT_PUBLIC_REVERB_KEY=\s*$/m.test(text) && reverbKey) {
    text = envSet(text, "NEXT_PUBLIC_REVERB_KEY", reverbKey);
    writeFileSync(local, text);
    console.log(`  filled the Reverb key for ${app}`);
  }
}

console.log(`
${gold("✔")} ${bold("Manara is set up.")} Start everything with:

    ${bold("npm run dev")}

Then sign in with a demo account (password: ${bold("password")}):
  owner@greenwood.test / teacher@greenwood.test  → staff portal   http://localhost:3003
  student@greenwood.test / parent@greenwood.test → learner portal http://localhost:3004
  professor@nile.test / student@nile.test        → university demo
`);
