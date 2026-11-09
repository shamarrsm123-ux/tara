module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
    },
    {
      displayName: 'tooling',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/scripts/**/__tests__/**/*.test.js', '<rootDir>/plugins/**/__tests__/**/*.test.js'],
    },
  ],
};
