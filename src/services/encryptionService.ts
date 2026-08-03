/**
 * AES-GCM 256-bit Web Crypto API Encryption Service for sensitive guest PII.
 * Uses a unique random IV for every encryption call.
 */

const KEY_STORE_NAME = 'short_let_crypto_key_v1';
const ENCRYPTION_VERSION = 1;

export interface EncryptedPayload {
  version: number;
  iv: string; // Base64
  ciphertext: string; // Base64
}

class EncryptionService {
  private cryptoKey: CryptoKey | null = null;

  /**
   * Initializes or retrieves the AES-GCM 256-bit master key.
   */
  private async getMasterKey(): Promise<CryptoKey> {
    if (this.cryptoKey) return this.cryptoKey;

    try {
      // Check if raw key material is saved in sessionStorage / localStorage for browser persistence
      const storedKeyHex = localStorage.getItem(KEY_STORE_NAME);
      if (storedKeyHex) {
        const rawKey = this.hexToBuffer(storedKeyHex);
        this.cryptoKey = await crypto.subtle.importKey(
          'raw',
          rawKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
        return this.cryptoKey;
      }

      // Generate new key if not present
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const exportedRaw = await crypto.subtle.exportKey('raw', key);
      const exportedHex = this.bufferToHex(exportedRaw);
      localStorage.setItem(KEY_STORE_NAME, exportedHex);

      this.cryptoKey = key;
      return key;
    } catch (e) {
      console.error('Failed to initialize AES-GCM crypto key:', e);
      throw new Error('Encryption master key initialization failed.');
    }
  }

  /**
   * Encrypts plain text string into a versioned JSON payload with a fresh random IV.
   */
  public async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) return '';

    const key = await this.getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const payload: EncryptedPayload = {
      version: ENCRYPTION_VERSION,
      iv: this.bufferToBase64(iv.buffer),
      ciphertext: this.bufferToBase64(encryptedBuffer),
    };

    return JSON.stringify(payload);
  }

  /**
   * Decrypts a versioned JSON payload back to plain text.
   */
  public async decrypt(payloadStr: string): Promise<string> {
    if (!payloadStr) return '';
    if (!payloadStr.startsWith('{') || !payloadStr.includes('ciphertext')) {
      // If it's legacy unencrypted text or not a payload, handle or return safely
      return payloadStr;
    }

    try {
      const payload: EncryptedPayload = JSON.parse(payloadStr);
      const key = await this.getMasterKey();
      const iv = new Uint8Array(this.base64ToBuffer(payload.iv));
      const ciphertext = this.base64ToBuffer(payload.ciphertext);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (e) {
      console.error('Decryption failed for payload:', e);
      return '[ENCRYPTED_PII_UNREADABLE]';
    }
  }

  // --- Helper conversions ---
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
  }
}

export const encryptionService = new EncryptionService();
