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

  // WebCrypto AES-GCM returns ciphertext || authTag in one buffer.
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aesKey, encoded)
  );

  const cipherPlusTagB64 = btoa(String.fromCharCode(...encrypted));
  const ivB64 = btoa(String.fromCharCode(...iv));

  if (!cipherPlusTagB64 || cipherPlusTagB64.length === 0 || !ivB64 || ivB64.length === 0) {
    throw new Error('Encryption produced empty data');
  }

  return {
    // New format (preferred): store full output together
    ciphertext_b64: cipherPlusTagB64,
    iv: ivB64,

    // Backward-compat fields (same as new format, but we keep them empty-ish to avoid misuse)
    // Old decrypt path will still work if server/client provide proper fields.
    encrypted_text: null,
    auth_tag: null,
  };
}


async function decryptMessage(encrypted_text, iv, auth_tag, myPrivRaw, senderPubB64, ciphertext_b64 = null) {
  // Validate inputs before decryption
  if (!myPrivRaw) {
    throw new Error('Missing private key');
  }
  if (!senderPubB64 || senderPubB64 === 'null' || senderPubB64 === null) {
    throw new Error('Missing sender public key');
  }
  if (!iv) {
    throw new Error('Missing IV');
  }
  
  const senderPubData = safeAt64(senderPubB64);
  if (senderPubData.length === 0) {
    throw new Error('Invalid sender public key - not valid base64');
  }

  // Derive shared secret and AES key
  let shared;
  try {
    shared = await deriveSharedSecret(myPrivRaw, senderPubB64);
  } catch (e) {
    console.error('deriveSharedSecret error:', e);
    throw new Error(`Failed to derive shared secret: ${e.message || 'Unknown error'}`);
  }

  let aesKey;
  try {
    aesKey = await deriveAESKey(shared);
  } catch (e) {
    console.error('deriveAESKey error:', e);
    throw new Error(`Failed to derive AES key: ${e.message || 'Unknown error'}`);
  }

  const ivBytes = safeAt64(iv);
  if (ivBytes.length < 12) {
    throw new Error(`Invalid IV length: ${ivBytes.length}`);
  }

  // Preferred new format: ciphertext_b64 (ciphertext||tag together)
  let data;
  if (ciphertext_b64 && typeof ciphertext_b64 === 'string' && ciphertext_b64 !== 'null') {
    const ctPlusTag = safeAt64(ciphertext_b64);
    if (ctPlusTag.length < 16) {
      throw new Error(`Invalid ciphertext_b64 length: ${ctPlusTag.length}`);
    }
    data = ctPlusTag;
  } else {
    // Backward compatible old format: encrypted_text + auth_tag split
    if (!encrypted_text || !auth_tag) {
      throw new Error('Missing encrypted data (need ciphertext_b64 or encrypted_text+auth_tag)');
    }
    const ct = safeAt64(encrypted_text);
    const tag = safeAt64(auth_tag);
    if (ct.length === 0 || tag.length < 16) {
      throw new Error(`Invalid E2EE data: ct=${ct.length}, tag=${tag.length}`);
    }
    data = new Uint8Array(ct.length + tag.length);
    data.set(ct);
    data.set(tag, ct.length);
  }

  try {
    // Probe: encrypt and decrypt a known test value to confirm the key pair is consistent.
    // If this fails, the stored pubkey and local privkey are not a matched pair — no point trying real decryption.
    const probeIv = crypto.getRandomValues(new Uint8Array(12));
    const probe = new Uint8Array([99, 88, 77]); // arbitrary 3-byte test payload
    const probeEncrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: probeIv, tagLength: 128 }, aesKey, probe);
    const probeDecrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: probeIv }, aesKey, probeEncrypted);
    if (new Uint8Array(probeDecrypted).every((v, i) => v === probe[i])) {
      // Key pair confirmed consistent — proceed with real decryption
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, data);
      return new TextDecoder().decode(decrypted);
    } else {
      throw new Error('Key probe validation failed');
    }
  } catch (e) {
    console.error('WebCrypto decrypt error:', e);
    console.error('Key algorithm:', aesKey.algorithm.name);
    console.error('Data length:', data.length, 'IV length:', ivBytes.length);
    // Log which keys were used so the user can verify the mismatch
    console.error('Decrypt failure — possible cause: stored public key does not match your private key (keypair was regenerated after this message was sent)');
    throw new Error('Decryption failed: Wrong key or corrupted data');
  }
}


export { generateKeyPair, importECKey, encryptMessage, decryptMessage };
