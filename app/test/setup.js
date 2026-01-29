/**
 * Jest test setup
 * Global mocks and utilities
 * See: ../../doc/TESTING.md
 */

// Mock fetch API
global.fetch = jest.fn();

// Mock LocalStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock crypto.randomUUID for deterministic testing
global.crypto = {
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Utility: Generate test UUIDs
global.generateTestUUID = (prefix = 'test') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};
