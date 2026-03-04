import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 16;
  private readonly authTagLength = 16;
  private key: Buffer;

  constructor(private configService: ConfigService) {
    const secret = this.configService.get<string>('ENCRYPTION_KEY') || 'default-secret-key-change-in-production';
    this.key = this.deriveKey(secret);
    this.logger.log('CryptoService initialized');
  }

  /**
   * Деривация ключа из секрета с использованием scrypt
   */
  private deriveKey(secret: string): Buffer {
    const salt = Buffer.from('dedline-crm-salt-2024', 'utf-8').slice(0, this.saltLength);
    return scryptSync(secret, salt.toString('hex'), this.keyLength);
  }

  /**
   * Шифрование текста
   */
  encrypt(text: string): string {
    try {
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength,
      });

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Возвращаем: IV + AuthTag + зашифрованные данные (в hex)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Расшифровка текста
   */
  decrypt(encryptedText: string): string {
    try {
      const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');

      if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength,
      });

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Шифрование буфера (для файлов)
   */
  encryptBuffer(buffer: Buffer): { encrypted: Buffer; iv: Buffer; authTag: Buffer } {
    try {
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength,
      });

      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return { encrypted, iv, authTag };
    } catch (error) {
      this.logger.error('Buffer encryption failed:', error);
      throw error;
    }
  }

  /**
   * Расшифровка буфера (для файлов)
   */
  decryptBuffer(encrypted: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    try {
      const decipher = createDecipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength,
      });

      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted;
    } catch (error) {
      this.logger.error('Buffer decryption failed:', error);
      throw error;
    }
  }
}

// Синхронная версия scrypt для использования в конструкторе
function scryptSync(password: string, salt: string, keylen: number): Buffer {
  const { scryptSync: nodeScryptSync } = require('crypto');
  return nodeScryptSync(password, salt, keylen);
}
