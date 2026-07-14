import type { Config } from 'jest';

const base: Partial<Config> = {
  rootDir: '.',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: { '^@app/(.*)$': '<rootDir>/src/$1' },
};

const config: Config = {
  projects: [
    {
      ...base,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
    },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
    },
    {
      ...base,
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.ts'],
    },
    {
      ...base,
      displayName: 'security',
      testMatch: ['<rootDir>/test/security/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.ts'],
    },
  ],
  coverageDirectory: './coverage',
};

export default config;
