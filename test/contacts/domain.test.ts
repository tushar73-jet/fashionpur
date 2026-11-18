import { describe, expect, it } from 'vitest';
import { isMarketingEligible, normalizeE164 } from '../../src/contacts/domain.js';

describe('contact phone numbers', () => {
  it('accepts an E.164 phone number', () => {
    expect(normalizeE164('+919934456783')).toBe('+919934456783');
  });

  it('rejects a number without a country code', () => {
    expect(() => normalizeE164('9934456783')).toThrow('E.164');
  });
});

describe('marketing eligibility', () => {
  it('allows only active consent', () => {
    expect(isMarketingEligible({ status: 'active', grantedAt: new Date('2026-11-18T00:00:00.000Z') })).toBe(true);
    expect(isMarketingEligible({ status: 'withdrawn', grantedAt: new Date('2026-11-18T00:00:00.000Z') })).toBe(false);
  });
});
