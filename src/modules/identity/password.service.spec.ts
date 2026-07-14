import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';
import { AppConfiguration } from '../../config/configuration';

function makeService(pepper: string): PasswordService {
  const config = {
    get: () => ({ passwordPepper: pepper }),
  } as unknown as ConfigService<AppConfiguration, true>;
  return new PasswordService(config);
}

describe('PasswordService', () => {
  it('hashes and verifies a matching password', async () => {
    const service = makeService('pepper-a');
    const hash = await service.hash('a-strong-password-123');
    await expect(service.verify(hash, 'a-strong-password-123')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const service = makeService('pepper-a');
    const hash = await service.hash('a-strong-password-123');
    await expect(service.verify(hash, 'the-wrong-password')).resolves.toBe(false);
  });

  it('rejects a password hashed under a different pepper', async () => {
    const hash = await makeService('pepper-a').hash('a-strong-password-123');
    await expect(makeService('pepper-b').verify(hash, 'a-strong-password-123')).resolves.toBe(
      false,
    );
  });

  it('rejects passwords shorter than 12 characters', () => {
    const service = makeService('pepper-a');
    expect(() => service.assertAcceptablePassword('short1234567'.slice(0, 8))).toThrow();
  });

  it('accepts a strong password', () => {
    const service = makeService('pepper-a');
    expect(() => service.assertAcceptablePassword('a-strong-password-123')).not.toThrow();
  });

  it('rejects known-compromised passwords', () => {
    const service = makeService('pepper-a');
    expect(() => service.assertAcceptablePassword('password123')).toThrow();
  });
});
