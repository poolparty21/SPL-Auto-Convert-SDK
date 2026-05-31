import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

function deriveKey(password: string, serverSecret: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(password + serverSecret, salt, 100000, KEY_LENGTH, 'sha512');
}

function deriveServerKey(serverSecret: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(serverSecret, salt, 100000, KEY_LENGTH, 'sha512');
}

export function encryptPrivateKey(
  privateKeyHex: string,
  userPassword: string,
  serverSecret: string,
): {
  encryptedData: string;
  salt: string;
  iv: string;
  authTag: string;
} {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const key = deriveKey(userPassword, serverSecret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKeyHex, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted,
    salt,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function encryptPrivateKeyServerOnly(
  privateKeyHex: string,
  serverSecret: string,
): {
  encryptedData: string;
  salt: string;
  iv: string;
  authTag: string;
} {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const key = deriveServerKey(serverSecret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKeyHex, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted,
    salt,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decryptPrivateKey(
  encryptedData: string,
  userPassword: string,
  serverSecret: string,
  salt: string,
  iv: string,
  authTag: string,
): string {
  const key = deriveKey(userPassword, serverSecret, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function decryptPrivateKeyServerOnly(
  encryptedData: string,
  serverSecret: string,
  salt: string,
  iv: string,
  authTag: string,
): string {
  const key = deriveServerKey(serverSecret, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
