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
  if (!plaintext || !myPrivRaw || !theirPubB64 || theirPubB64 === 'null') {
    throw new Error('Missing required data for encryption');
  }
  
  const shared = await deriveSharedSecret(myPrivRaw, theirPubB64);
  const aesKey = await deriveAESKey(shared);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aesKey, encoded);
  const ct = new Uint8Array(encrypted);
  const ctLen = ct.length - 16;
  
  const encrypted_text = btoa(String.fromCharCode(...ct.slice(0, ctLen)));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const auth_tag = btoa(String.fromCharCode(...ct.slice(ctLen)));
  
  // Validate output is not empty
  if (!encrypted_text || encrypted_text.length === 0 || !ivB64 || ivB64.length === 0 || !auth_tag || auth_tag.length === 0) {
    throw new Error('Encryption produced empty data');
  }
  
  return {
    encrypted_text,
    iv: ivB64,
    auth_tag
  };
}

async function decryptMessage(encrypted_text, iv, auth_tag, myPrivRaw, senderPubB64) {
  // Validate inputs before decryption
  if (!myPrivRaw) {
    throw new Error('Missing private key');
  }
  if (!senderPubB64 || senderPubB64 === 'null' || senderPubB64 === null) {
    throw new Error('Missing sender public key');
  }
  if (!encrypted_text || !iv || !auth_tag) {
    throw new Error('Missing encrypted data');
  }
  
  // Validate senderPubB64 is valid base64
  const senderPubData = safeAt64(senderPubB64);
  if (senderPubData.length === 0) {
    throw new Error('Invalid sender public key - not valid base64');
  }
  
  // Try to derive shared secret with error handling
  let shared;
  try {
    shared = await deriveSharedSecret(myPrivRaw, senderPubB64);
  } catch (e) {
    console.error('deriveSharedSecret error:', e);
    throw new Error(`Failed to derive shared secret: ${e.message || 'Unknown error'}`);
  }
  
  // Try to derive AES key with error handling
  let aesKey;
  try {
    aesKey = await deriveAESKey(shared);
  } catch (e) {
    console.error('deriveAESKey error:', e);
    throw new Error(`Failed to derive AES key: ${e.message || 'Unknown error'}`);
  }
  
  // Validate and decode base64 data
  const ct = safeAt64(encrypted_text);
  const ivBytes = safeAt64(iv);
  const tag = safeAt64(auth_tag);
  
  if (ct.length === 0 || ivBytes.length < 12 || tag.length < 16) {
    throw new Error(`Invalid E2EE data: ct=${ct.length}, iv=${ivBytes.length}, tag=${tag.length}`);
  }
  
  // Combine ciphertext and auth tag
  const data = new Uint8Array(ct.length + tag.length);
  data.set(ct);
  data.set(tag, ct.length);
  
  // Decrypt with error handling - WebCrypto errors are often silent
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, data);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    // WebCrypto AES-GCM decryption fails silently on auth tag mismatch
    // This usually means wrong key used or corrupted data
    console.error('WebCrypto decrypt error:', e);
    console.error('Key algorithm:', aesKey.algorithm.name);
    console.error('Data length:', data.length, 'IV length:', ivBytes.length);
    throw new Error('Decryption failed: Wrong key or corrupted data');
  }
}

export { generateKeyPair, importECKey, encryptMessage, decryptMessage };

