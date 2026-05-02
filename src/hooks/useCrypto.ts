const VAULT_KEY = 'gemini_vault';

interface EncryptedVault {
  ciphertext: string;
  salt: string;
  iv: string;
}

function getSubtleCrypto(): SubtleCrypto {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API not available. Use HTTPS or localhost.');
  }
  return window.crypto.subtle;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations = 600000
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAndSave(
  apiKey: string,
  masterPassword: string
): Promise<void> {
  const subtle = getSubtleCrypto();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(masterPassword, salt);

  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    new TextEncoder().encode(apiKey)
  );

  const vault: EncryptedVault = {
    ciphertext: arrayBufferToBase64(encrypted),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };

  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export async function decryptKey(masterPassword: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) {
    throw new Error('No encrypted key found in storage.');
  }

  const vault: EncryptedVault = JSON.parse(raw);
  const salt = base64ToUint8Array(vault.salt);
  const iv = base64ToUint8Array(vault.iv);
  const ciphertext = base64ToUint8Array(vault.ciphertext);

  const key = await deriveKey(masterPassword, salt);

  const decrypted = await subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

export function hasKeyStored(): boolean {
  return localStorage.getItem(VAULT_KEY) !== null;
}
