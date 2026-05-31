import { describe, it, expect } from 'vitest';
import {
  encryptPrivateKey,
  decryptPrivateKey,
  encryptPrivateKeyServerOnly,
  decryptPrivateKeyServerOnly,
} from '../encryption';

describe('encryption', () => {
  const privateKey = 'abc123def456abc123def456abc123def456abc123def456abc123def456';
  const password = 'test-password-123';
  const serverSecret = 'server-secret-456';

  it('should encrypt and decrypt with user password', () => {
    const encrypted = encryptPrivateKey(privateKey, password, serverSecret);
    const decrypted = decryptPrivateKey(
      encrypted.encryptedData,
      password,
      serverSecret,
      encrypted.salt,
      encrypted.iv,
      encrypted.authTag,
    );
    expect(decrypted).toBe(privateKey);
  });

  it('should fail to decrypt with wrong password', () => {
    const encrypted = encryptPrivateKey(privateKey, password, serverSecret);
    expect(() =>
      decryptPrivateKey(
        encrypted.encryptedData,
        'wrong-password',
        serverSecret,
        encrypted.salt,
        encrypted.iv,
        encrypted.authTag,
      ),
    ).toThrow();
  });

  it('should encrypt and decrypt with server-only key', () => {
    const encrypted = encryptPrivateKeyServerOnly(privateKey, serverSecret);
    const decrypted = decryptPrivateKeyServerOnly(
      encrypted.encryptedData,
      serverSecret,
      encrypted.salt,
      encrypted.iv,
      encrypted.authTag,
    );
    expect(decrypted).toBe(privateKey);
  });

  it('should produce different ciphertexts for the same input', () => {
    const e1 = encryptPrivateKey(privateKey, password, serverSecret);
    const e2 = encryptPrivateKey(privateKey, password, serverSecret);
    expect(e1.encryptedData).not.toBe(e2.encryptedData);
    expect(e1.salt).not.toBe(e2.salt);
    expect(e1.iv).not.toBe(e2.iv);
  });

  it('should handle hex private key with 0x prefix', () => {
    const pkWithPrefix = `0x${privateKey}`;
    const encrypted = encryptPrivateKey(pkWithPrefix, password, serverSecret);
    const decrypted = decryptPrivateKey(
      encrypted.encryptedData,
      password,
      serverSecret,
      encrypted.salt,
      encrypted.iv,
      encrypted.authTag,
    );
    expect(decrypted).toBe(pkWithPrefix);
  });
});
