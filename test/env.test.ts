import { describe, expect, it } from 'vitest';
import { readEnvironment } from '../src/config/env.js';

describe('environment validation', () => {
  it('rejects a missing admin API key', () => {
    expect(() => readEnvironment({ PORT: '3000' })).toThrow('ADMIN_API_KEY');
  });

  it('accepts the minimum local development environment', () => {
    expect(readEnvironment({ ADMIN_API_KEY: 'local-test-key', PORT: '3100' })).toEqual({
      ADMIN_API_KEY: 'local-test-key',
      PORT: 3100,
    });
  });
});
