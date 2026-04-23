import { Injectable } from '@nestjs/common';
import * as forge from 'node-forge';

@Injectable()
export class EncryptionService {
  private readonly key: string;
  private readonly iv: string;

  constructor() {
    this.key = process.env.SM4_KEY || 'your-32-char-sm4-key-here!!';
    this.iv = process.env.SM4_IV || 'your-16-char-iv-here!';
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;
    try {
      const cipher = forge.cipher.createCipher('AES-CBC', forge.util.createBuffer(this.key));
      cipher.start({ iv: forge.util.createBuffer(this.iv) });
      cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
      cipher.finish();
      return forge.util.encode64(cipher.output.getBytes());
    } catch {
      return plaintext;
    }
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext;
    try {
      const decipher = forge.cipher.createDecipher('AES-CBC', forge.util.createBuffer(this.key));
      decipher.start({ iv: forge.util.createBuffer(this.iv) });
      decipher.update(forge.util.createBuffer(forge.util.decode64(ciphertext)));
      decipher.finish();
      return (decipher.output as any).toString('utf8');
    } catch {
      return ciphertext;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hashedPassword);
  }

  maskIdNo(idNo: string): string {
    if (!idNo || idNo.length < 8) return idNo;
    return idNo.substring(0, 4) + '****' + idNo.substring(idNo.length - 4);
  }

  maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }
}
