/**
 * AgentSpark Crypto Helpers (AES-256-GCM and Legacy XOR)
 */

/**
 * Derive a 256-bit key from a password using PBKDF2 + salt
 */
async function _aesKeyFromPassword(password, saltBytes) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBytes, iterations: 200_000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt plaintext using AES-256-GCM
 */
export async function aesGcmEncrypt(plaintext, password) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV
    const salt = crypto.getRandomValues(new Uint8Array(16));  // 128-bit PBKDF2 salt
    const key = await _aesKeyFromPassword(password, salt);
    const ctBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
    );
    // Pack: [salt 16B][iv 12B][ciphertext …]
    const ct = new Uint8Array(ctBuf);
    const packed = new Uint8Array(salt.length + iv.length + ct.length);
    packed.set(salt, 0);
    packed.set(iv, salt.length);
    packed.set(ct, salt.length + iv.length);
    return packed;
}

/**
 * Decrypt packed bytes using AES-256-GCM
 */
export async function aesGcmDecrypt(packedBytes, password) {
    const salt = packedBytes.slice(0, 16);
    const iv = packedBytes.slice(16, 28);
    const ct = packedBytes.slice(28);
    const key = await _aesKeyFromPassword(password, salt);
    const ptBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ct
    );
    return new TextDecoder().decode(ptBuf);
}

/**
 * Simple XOR kept for backward-compatibility with v1/v2 links
 */
export function xorObfuscate(str, password) {
    const key = password.split('').map(c => c.charCodeAt(0));
    return str.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ key[i % key.length])
    ).join('');
}
