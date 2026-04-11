// Updated with privB64 wrappers
const EC_CURVE = 'P-256';
const AES_KEY_LEN = 32;
const HKDF_INFO = new TextEncoder().encode('GenConnect E2EE v1');
const HKDF_SALT = new Uint8Array(32);

async function generateKeyPair() {
  const keypair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: EC_CURVE,
    },
    true, // extractable priv
    ['deriveKey']
  );

  const pubBytes = await window.crypto.subtle.exportKey('spki', keypair.publicKey);
  const privBytes = await window.crypto.subtle.exportKey('pkcs8', keypair.privateKey);

  const pubB64 = btoa(String.fromCharCode(...new Uint8Array(pubBytes)));
  const privB64 = btoa(String.fromCharCode(...new Uint8Array(privBytes)));

  return {
    publicKey: pubB64, // base64 SPKI for API
    privateKey: privB64, // base64 PKCS8 localStorage
    keypair // raw for immediate use
  };
}

async function importECKey(keyB64, isPrivate) {
  const keyData = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  const format = isPrivate ? 'pkcs8' : 'spki';
  return crypto.subtle.importKey(
    format,
    keyData,
    { name: 'ECDH', namedCurve: EC_CURVE },
    false,
    isPrivate ? ['deriveKey'] : []
  );
}

async function deriveSharedSecret(myPrivKeyRaw, theirPubB64) {
  const theirPub = await importECKey(theirPubB64, false);
  const secretBits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: theirPub
    },
    myPrivKeyRaw,
    256
  );
  return new Uint8Array(secretBits);
}

async function deriveAESKey(sharedSecret) {
  const secretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  const aesBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: HKDF_SALT,
      info: HKDF_INFO,
      hash: 'SHA-256'
    },
    secretKey,
    AES_KEY_LEN * 8
  );
  return crypto.subtle.importKey(
    'raw',
    aesBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptMessage(plaintext, myPrivRaw, theirPubB64) {
  const shared = await deriveSharedSecret(myPrivRaw, theirPubB64);
  const aesKey = await deriveAESKey(shared);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    encoded
  );
  const ct = new Uint8Array(encrypted);
  const ctLen = ct.length - 16;
  const ciphertext = ct.slice(0, ctLen);
  const tag = ct.slice(ctLen);
  return {
    encrypted_text: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    auth_tag: btoa(String.fromCharCode(...tag))
  };
}

async function decryptMessage(encrypted_text, iv, auth_tag, myPrivRaw, senderPubB64) {
  const shared = await deriveSharedSecret(myPrivRaw, senderPubB64);
  const aesKey = await deriveAESKey(shared);
  const ct = Uint8Array.from(atob(encrypted_text), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(auth_tag), (c) => c.charCodeAt(0));
  const data = new Uint8Array(ct.length + tag.length);
  data.set(ct);
  data.set(tag, ct.length);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    aesKey,
    data
  );
  return new TextDecoder().decode(decrypted);
}

export {
  generateKeyPair,
  encryptMessage,
  decryptMessage
};
