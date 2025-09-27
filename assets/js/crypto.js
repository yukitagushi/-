// Web Crypto: PBKDF2 + AES-GCM (256)
const enc = new TextEncoder();
const dec = new TextDecoder();

function getRandomBytes(n=16){ return crypto.getRandomValues(new Uint8Array(n)); }

async function deriveKey(password, salt, iterations=200000){
  const baseKey = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt","decrypt"]
  );
}

export async function encryptString(plaintext, password){
  const iv = getRandomBytes(12);
  const salt = getRandomBytes(16);
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, enc.encode(plaintext));
  return {
    version: 1,
    alg: "AES-GCM-256/PBKDF2-SHA256",
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ct)))
  };
}

export async function decryptString(bundle, password){
  const iv = Uint8Array.from(atob(bundle.iv), c => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(bundle.salt), c => c.charCodeAt(0));
  const key = await deriveKey(password, salt);
  const ct = Uint8Array.from(atob(bundle.ciphertext), c => c.charCodeAt(0));
  const ptBuf = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, ct);
  return dec.decode(ptBuf);
}
