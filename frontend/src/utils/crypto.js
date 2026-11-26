/**
 * CampusConnect 2.0 - Web Crypto API Cryptographic Utility
 * Implements client-side 3072-bit RSA-PSS key generation, SPKI/PKCS#8 PEM encoding/decoding,
 * binary SHA-256 hashing, and digital signing. Private keys never leave the client device.
 */

// ArrayBuffer to Base64
export function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Format SPKI ArrayBuffer to standard PEM
export function spkiToPem(spkiBuffer) {
  const b64 = arrayBufferToBase64(spkiBuffer);
  const formatted = b64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}

// Format PKCS#8 ArrayBuffer to standard PEM
export function pkcs8ToPem(pkcs8Buffer) {
  const b64 = arrayBufferToBase64(pkcs8Buffer);
  const formatted = b64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
}

// Extract base64 from PEM string
export function pemToArrayBuffer(pem) {
  const clean = pem
    .replace(/-----BEGIN [A-Z\s]+-----/g, "")
    .replace(/-----END [A-Z\s]+-----/g, "")
    .replace(/\s+/g, "");
  return base64ToArrayBuffer(clean);
}

/**
 * Compute 256-bit SHA-256 hash strictly from binary File or ArrayBuffer.
 */
export async function computeSHA256Hex(fileOrBuffer) {
  const buffer = fileOrBuffer instanceof ArrayBuffer
    ? fileOrBuffer
    : await fileOrBuffer.arrayBuffer();

  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Import a PKCS#8 PEM string as a CryptoKey for signing with RSA-PSS.
 */
export async function importPrivateKeyFromPem(pemString) {
  const buffer = pemToArrayBuffer(pemString);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "RSA-PSS",
      hash: "SHA-256"
    },
    true,
    ["sign"]
  );
}

/**
 * Import an SPKI PEM string as a CryptoKey for verification with RSA-PSS.
 */
export async function importPublicKeyFromPem(pemString) {
  const buffer = pemToArrayBuffer(pemString);
  return await window.crypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "RSA-PSS",
      hash: "SHA-256"
    },
    true,
    ["verify"]
  );
}

/**
 * Generate a new 3072-bit RSA-PSS key pair with SHA-256.
 * Returns { keyId, publicKeyPem, privateKeyPem, algorithm: "RSA-PSS-SHA256", createdAt }
 */
export async function generateRSAKeyPair(keySize = 3072) {
  // Try 3072-bit first, fallback to 2048-bit if browser limits
  let keyPair;
  try {
    keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: keySize,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: "SHA-256"
      },
      true,
      ["sign", "verify"]
    );
  } catch (err) {
    console.warn(`[CRYPTO] Could not generate ${keySize}-bit key, falling back to 2048-bit:`, err);
    keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["sign", "verify"]
    );
  }

  const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const pkcs8 = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const publicKeyPem = spkiToPem(spki);
  const privateKeyPem = pkcs8ToPem(pkcs8);
  const keyId = `key_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
  const createdAt = new Date().toISOString();

  return {
    keyId,
    publicKeyPem,
    privateKeyPem,
    algorithm: "RSA-PSS-SHA256",
    createdAt
  };
}

/**
 * Sign binary document bytes using the student's RSA private key.
 * Uses RSA-PSS with SHA-256 and salt length = 32.
 * Returns base64 encoded signature.
 */
export async function signDocumentContent(fileOrBuffer, privateKeyPem) {
  const buffer = fileOrBuffer instanceof ArrayBuffer
    ? fileOrBuffer
    : await fileOrBuffer.arrayBuffer();

  const privKey = await importPrivateKeyFromPem(privateKeyPem);
  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32
    },
    privKey,
    buffer
  );

  return arrayBufferToBase64(signatureBuffer);
}

/**
 * Local Key Storage Helpers (Stored strictly client-side)
 */
export function getSavedKeyForUser(userEmail) {
  if (!userEmail) return null;
  try {
    const raw = localStorage.getItem(`campusconnect_rsa_${userEmail.toLowerCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveKeyForUser(userEmail, keyData) {
  if (!userEmail || !keyData) return;
  try {
    localStorage.setItem(`campusconnect_rsa_${userEmail.toLowerCase()}`, JSON.stringify(keyData));
  } catch (e) {
    console.error("Failed to save RSA key in localStorage:", e);
  }
}

export function removeKeyForUser(userEmail) {
  if (!userEmail) return;
  try {
    localStorage.removeItem(`campusconnect_rsa_${userEmail.toLowerCase()}`);
  } catch {}
}

export function downloadPrivateKeyFile(keyData, userEmail) {
  const blob = new Blob([keyData.privateKeyPem], { type: "application/x-pem-file" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CampusConnect_PrivateKey_${userEmail.replace(/[@.]/g, "_")}.pem`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
