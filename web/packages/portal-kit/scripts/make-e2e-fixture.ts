/**
 * Writes a test fixture produced by the web client's real encryption code, so other
 * clients (the Flutter app) can prove they read the same format.
 *
 *   node --experimental-strip-types packages/portal-kit/scripts/make-e2e-fixture.ts ../mobile/test/fixtures/web_e2e_fixture.json
 */
import { writeFileSync } from "node:fs";
import { createKeys, decryptMessage, encryptMessage } from "../src/e2e.ts";

const passphrase = "correct horse battery staple";
const text = "Hello from the web 👋 — مرحبا";
const reader = await createKeys(passphrase);
const other = await createKeys("another passphrase");

const message = await encryptMessage(text, [
  { id: 42, public_key: reader.backup.public_key },
  { id: 7, public_key: other.backup.public_key },
]);

// Sanity check before writing: the web client can read its own output.
if ((await decryptMessage(message, 42, reader.pair)) !== text) throw new Error("web round trip failed");

const out = process.argv[2] ?? "web_e2e_fixture.json";
writeFileSync(out, JSON.stringify({ passphrase, user_id: 42, text, backup: reader.backup, message }, null, 2) + "\n");
console.log(`wrote ${out}`);
