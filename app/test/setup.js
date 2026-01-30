/**
 * Jest test setup
 * Global mocks and utilities
 * See: ../../doc/TESTING.md
 */

import { jest, beforeEach } from '@jest/globals';

// Create a mock implementation of localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    // Simulate quota exceeded error with magic key
    if (key === 'TRIGGER_QUOTA_ERROR') {
      const error = new Error('QuotaExceededError');
      error.code = 22;
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  get length() {
    return Object.keys(this.store).length;
  }
}

// Set up global mocks
if (!global.localStorage) {
  global.localStorage = new LocalStorageMock();
}

// Mock fetch API
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock crypto.randomUUID for deterministic testing
if (!global.crypto) {
  global.crypto = {
    randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
  };
}

// Reset mocks before each test
beforeEach(() => {
  // Reset localStorage
  if (global.localStorage instanceof LocalStorageMock) {
    global.localStorage.clear();
  }
  
  // Clear all mock function calls
  if (typeof jest !== 'undefined' && jest.clearAllMocks) {
    jest.clearAllMocks();
  }
});

// Utility: Generate test UUIDs
global.generateTestUUID = (prefix = 'test') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};
