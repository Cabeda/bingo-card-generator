module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.next/', '/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(next-intl)/)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './tsconfig.jest.json',
      diagnostics: false,
      astTransformers: { before: ['./scripts/jest-import-meta.cjs'] },
    }],
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'proxy.ts',
    'next.config.ts',
    'worker/**/*.js',
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
