export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.d.ts',
    '!src/index.html'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  verbose: true,
  testTimeout: 10000,
  transform: {},
  // ESM support for Jest 29+
  testEnvironment: 'node',
  transformIgnorePatterns: [],
  moduleNameMapper: {}
};
