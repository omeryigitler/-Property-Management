/**
 * AES-GCM 256-bit Web Crypto API encryption service for sensitive guest PII.
 * A unique random IV is used for every encrypted value.
 */

const KEY_STORE_NAME = 'short_let_crypto_key_v1';
const ENCRYPTION_VERSION = 1;

export interface EncryptedPayload {
  version: number;
  iv: string;
  ciphertext: string;
}

class EncryptionService {
  private cryptoKey: CryptoKey | null = null;
  private cryptoKeyHex: string | null = null;

  private async getMasterKey(): Promise<CryptoKey> {
    try {
      const storedKeyHex = localStorage.getItem(KEY_STORE_NAME);

      if (
        this.cryptoKey &&
        storedKeyHex &&
        this.cryptoKeyHex === storedKeyHex
      ) {
        return this.cryptoKey;
      }

      this.cryptoKey = null;
      this.cryptoKeyHex = null;

      if (storedKeyHex) {
        const rawKey = this.hexToBuffer(storedKeyHex);
        this.cryptoKey = await crypto.subtle.importKey(
          'raw',
          rawKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
        this.cryptoKeyHex = storedKeyHex;
        return this.cryptoKey;
      }

      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const exportedRaw = await crypto.subtle.exportKey('raw', key);
      const exportedHex = this.bufferToHex(exportedRaw);
      localStorage.setItem(KEY_STORE_NAME, exportedHex);

      this.cryptoKey = key;
      this.cryptoKeyHex = exportedHex;
      return key;
    } catch (error) {
      console.error('Failed to initialize AES-GCM crypto key:', error);
      throw new Error('Encryption master key initialization failed.');
    }
  }

  public async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) return '';

    const key = await this.getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(plaintext);
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

  public async decrypt(payloadString: string): Promise<string> {
    if (!payloadString) return '';
    if (!payloadString.startsWith('{') || !payloadString.includes('ciphertext')) {
      return payloadString;
    }

    try {
      const payload = JSON.parse(payloadString) as EncryptedPayload;
      if (
        payload.version !== ENCRYPTION_VERSION ||
        typeof payload.iv !== 'string' ||
        typeof payload.ciphertext !== 'string'
      ) {
        return '[ENCRYPTED_PII_UNREADABLE]';
      }

      const key = await this.getMasterKey();
      const iv = new Uint8Array(this.base64ToBuffer(payload.iv));
      const ciphertext = this.base64ToBuffer(payload.ciphertext);
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed for encrypted PII:', error);
      return '[ENCRYPTED_PII_UNREADABLE]';
    }
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let index = 0; index < bytes.byteLength; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBuffer(hex: string): ArrayBuffer {
    if (!/^[a-f0-9]{64}$/i.test(hex)) {
      throw new Error('Stored encryption key has an invalid format.');
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < hex.length; index += 2) {
      bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
    }
    return bytes.buffer;
  }
}

export const encryptionService = new EncryptionService();
