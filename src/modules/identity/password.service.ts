import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AppConfiguration } from '../../core/configuration/configuration';

const COMPROMISED_PASSWORD_DENYLIST = new Set([
  'password123',
  'password1234',
  '12345678901',
  'qwertyuiop1',
  'letmein12345',
]);

/** Fixed, never-matching argon2id hash used only to keep `login()`'s timing
 * profile constant when no real user/password hash exists to verify against
 * (see PasswordService.verifyDummy). Not a secret — it deliberately verifies
 * no real password. */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$oS6bFxffn8U/BqfDVxnPYQ$FzHQKcZK7uAO72i51B1pOYXrLWn0tRbItZlrC761+lg';

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService<AppConfiguration, true>) {}

  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(this.withPepper(plainPassword), { type: argon2.argon2id });
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, this.withPepper(plainPassword));
  }

  /** SECURITY FIX: run the same-cost argon2id verify against a fixed dummy
   * hash when there is no real user/passwordHash to check — e.g. an unknown
   * email at login. Without this, "unknown email" short-circuits before any
   * hashing work while "known email, wrong password" always pays the full
   * argon2id cost, making the two cases distinguishable by response time
   * alone (an email-enumeration side channel despite both returning the same
   * generic error body). The result is always discarded/false. */
  async verifyDummy(plainPassword: string): Promise<void> {
    await argon2.verify(DUMMY_HASH, this.withPepper(plainPassword)).catch(() => false);
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
