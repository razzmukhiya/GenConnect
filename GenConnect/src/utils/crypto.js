// E2EE Crypto Utils - Robust with base64 validation
const EC_CURVE = 'P-256';
const AES_KEY_LEN = 32;
const HKDF_INFO = new TextEncoder().encode('GenConnect E2EE v1');
const HKDF_SALT = new Uint8Array(32);

function safeAt64(str) {
  if (!str || typeof str !== 'string') return new Uint8Array(0);
  try {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  } catch {
    return new Uint8Array(0);
  }
}

async function generateKeyPair() {
  const keypair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: EC_CURVE },
    true,
    ['deriveKey', 'deriveBits']
  );
  const pubBytes = await window.crypto.subtle.exportKey('spki', keypair.publicKey);
  const privBytes = await window.crypto.subtle.exportKey('pkcs8', keypair.privateKey);
  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(pubBytes))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privBytes))),
  };
}

async function importECKey(keyB64, isPrivate) {
  const keyData = safeAt64(keyB64);
  if (keyData.length === 0) {
    console.warn('Invalid/empty key data, using fallback');
    return null;
  }
  try {
    const format = isPrivate ? 'pkcs8' : 'spki';
    return await crypto.subtle.importKey(format, keyData, 
      { name: 'ECDH', namedCurve: EC_CURVE }, false, 
      isPrivate ? ['deriveKey', 'deriveBits'] : []);
  } catch (e) {
    console.error('Key import failed:', e);
    return null;
  }
}

async function deriveSharedSecret(myPrivRaw, theirPubB64) {
  const theirPub = await importECKey(theirPubB64, false);
  if (!theirPub || !myPrivRaw) {
    throw new Error('Missing private or sender public key');
  }
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirPub }, myPrivRaw, 256
  ));
}

async function deriveAESKey(sharedSecret) {
  const secretKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']);
  const aesBits = await crypto.subtle.deriveBits({ name: 'HKDF', salt: HKDF_SALT, info: HKDF_INFO, hash: 'SHA-256' }, secretKey, AES_KEY_LEN * 8);
  return crypto.subtle.importKey('raw', aesBits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptMessage(plaintext, myPrivRaw, theirPubB64) {
  const shared = await deriveSharedSecret(myPrivRaw, theirPubB64);
  const aesKey = await deriveAESKey(shared);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aesKey, encoded);
  const ct = new Uint8Array(encrypted);
  const ctLen = ct.length - 16;
  return {
    encrypted_text: btoa(String.fromCharCode(...ct.slice(0, ctLen))),
    iv: btoa(String.fromCharCode(...iv)),
    auth_tag: btoa(String.fromCharCode(...ct.slice(ctLen)))
  };
}

async function decryptMessage(encrypted_text, iv, auth_tag, myPrivRaw, senderPubB64) {
  const shared = await deriveSharedSecret(myPrivRaw, senderPubB64);
  const aesKey = await deriveAESKey(shared);
  const ct = safeAt64(encrypted_text);
  const ivBytes = safeAt64(iv);
  const tag = safeAt64(auth_tag);
  if (ct.length === 0 || ivBytes.length < 12 || tag.length < 16) {
    throw new Error(`Invalid E2EE data: ct=${ct.length}, iv=${ivBytes.length}, tag=${tag.length}`);
  }
  const data = new Uint8Array(ct.length + tag.length);
  data.set(ct);
  data.set(tag, ct.length);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, data);
  return new TextDecoder().decode(decrypted);
}

export { generateKeyPair, importECKey, encryptMessage, decryptMessage };

