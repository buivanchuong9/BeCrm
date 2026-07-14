import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AppConfiguration } from '../../config/configuration';

const COMPROMISED_PASSWORD_DENYLIST = new Set([
  'password123',
  'password1234',
  '12345678901',
  'qwertyuiop1',
  'letmein12345',
]);

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService<AppConfiguration, true>) {}

  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(this.withPepper(plainPassword), { type: argon2.argon2id });
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, this.withPepper(plainPassword));
  }

  /** Minimum 12 characters for staff-created passwords per spec section 28; rejects
   * a small denylist of known-weak values. Full breach-corpus checking (e.g.
   * k-anonymity HaveIBeenPwned lookup) is a PROPOSED follow-up, not MVP-blocking. */
  assertAcceptablePassword(plainPassword: string): void {
    if (plainPassword.length < 12) {
      throw new Error('Password must be at least 12 characters.');
    }
    if (COMPROMISED_PASSWORD_DENYLIST.has(plainPassword.toLowerCase())) {
      throw new Error('This password is known to be compromised.');
    }
  }

  private withPepper(plainPassword: string): string {
    return `${plainPassword}${this.config.get('auth', { infer: true }).passwordPepper}`;
  }
}
