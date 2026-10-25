"use client";

import sodiumModule from "libsodium-wrappers-sumo";

/**
 * End-to-end encryption for messages. Runs only in the browser; the server never
 * sees plaintext, message keys or unencrypted private keys.
 *
 * - Each user has one X25519 key pair.
 * - Each message is encrypted with a fresh XChaCha20-Poly1305 key, and that key is
 *   sealed (crypto_box_seal) to every participant's public key.
 * - The private key is backed up on the server encrypted with a key derived from
 *   the user's passphrase (Argon2id), so any of their devices can restore it.
 *
 * All binary values travel as standard base64 so the Flutter app can read them too.
 */

export interface KeyBackup {
  public_key: string;
  encrypted_private_key: string;
  private_key_nonce: string;
  kdf_salt: string;
  kdf_ops_limit: number;
  kdf_mem_limit: number;
}

export interface EncryptedMessage {
  id: string;
  ciphertext: string;
  nonce: string;
  keys: Record<string, string>;
}

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

async function sodium() {
  await sodiumModule.ready;
  return sodiumModule;
}

const b64 = (s: typeof sodiumModule, bytes: Uint8Array) => s.to_base64(bytes, s.base64_variants.ORIGINAL);
const unb64 = (s: typeof sodiumModule, text: string) => s.from_base64(text, s.base64_variants.ORIGINAL);

async function deriveKey(passphrase: string, salt: Uint8Array, ops: number, mem: number) {
  const s = await sodium();
  return s.crypto_pwhash(s.crypto_secretbox_KEYBYTES, passphrase, salt, ops, mem, s.crypto_pwhash_ALG_ARGON2ID13);
}

/** Creates a new key pair and its passphrase-encrypted backup. */
export async function createKeys(passphrase: string): Promise<{ pair: KeyPair; backup: KeyBackup }> {
  const s = await sodium();
  const pair = s.crypto_box_keypair();
  return { pair: { publicKey: pair.publicKey, privateKey: pair.privateKey }, backup: await wrapPrivateKey(pair, passphrase) };
}

/** Encrypts the private key under a passphrase (also used to change the passphrase). */
export async function wrapPrivateKey(pair: KeyPair, passphrase: string): Promise<KeyBackup> {
  const s = await sodium();
  const salt = s.randombytes_buf(s.crypto_pwhash_SALTBYTES);
  const ops = s.crypto_pwhash_OPSLIMIT_INTERACTIVE;
  const mem = s.crypto_pwhash_MEMLIMIT_INTERACTIVE;
  const key = await deriveKey(passphrase, salt, ops, mem);
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);

  return {
    public_key: b64(s, pair.publicKey),
    encrypted_private_key: b64(s, s.crypto_secretbox_easy(pair.privateKey, nonce, key)),
    private_key_nonce: b64(s, nonce),
    kdf_salt: b64(s, salt),
    kdf_ops_limit: ops,
    kdf_mem_limit: mem,
  };
}

/** Restores the key pair from the server backup. Throws on a wrong passphrase. */
export async function restoreKeys(backup: KeyBackup, passphrase: string): Promise<KeyPair> {
  const s = await sodium();
  const key = await deriveKey(passphrase, unb64(s, backup.kdf_salt), backup.kdf_ops_limit, backup.kdf_mem_limit);
  const privateKey = s.crypto_secretbox_open_easy(unb64(s, backup.encrypted_private_key), unb64(s, backup.private_key_nonce), key);
  return { publicKey: unb64(s, backup.public_key), privateKey };
}

export async function encryptMessage(text: string, recipients: { id: number; public_key: string }[]): Promise<EncryptedMessage> {
  const s = await sodium();
  const messageKey = s.crypto_aead_xchacha20poly1305_ietf_keygen();
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const body = JSON.stringify({ v: 1, text });

  return {
    id: crypto.randomUUID(),
    ciphertext: b64(s, s.crypto_aead_xchacha20poly1305_ietf_encrypt(body, null, null, nonce, messageKey)),
    nonce: b64(s, nonce),
    keys: Object.fromEntries(recipients.map((r) => [String(r.id), b64(s, s.crypto_box_seal(messageKey, unb64(s, r.public_key)))])),
  };
}

/** Returns the message text, or null if this user can't open it (e.g. sent before they had a key). */
export async function decryptMessage(message: EncryptedMessage, userId: number, pair: KeyPair): Promise<string | null> {
  const s = await sodium();
  const sealed = message.keys[String(userId)];
  if (!sealed) return null;
  try {
    const messageKey = s.crypto_box_seal_open(unb64(s, sealed), pair.publicKey, pair.privateKey);
    const body = s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, unb64(s, message.ciphertext), null, unb64(s, message.nonce), messageKey);
    return (JSON.parse(s.to_string(body)) as { text: string }).text;
  } catch {
    return null;
  }
}

// The unlocked key stays on this device so the passphrase is only needed once per device.
const storageKey = (userId: number) => `educloud-e2e-key-${userId}`;

export async function saveLocalKeys(userId: number, pair: KeyPair) {
  const s = await sodium();
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ pub: b64(s, pair.publicKey), priv: b64(s, pair.privateKey) }));
  } catch {}
}

export async function loadLocalKeys(userId: number, expectedPublicKey: string): Promise<KeyPair | null> {
  const s = await sodium();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const { pub, priv } = JSON.parse(raw) as { pub: string; priv: string };
    // A key reset on another device makes this copy stale.
    return pub === expectedPublicKey ? { publicKey: unb64(s, pub), privateKey: unb64(s, priv) } : null;
  } catch {
    return null;
  }
}

export function forgetLocalKeys(userId: number) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {}
}
