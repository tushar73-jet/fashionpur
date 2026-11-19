export type ConsentStatus = 'active' | 'withdrawn';

export interface MarketingConsent {
  status: ConsentStatus;
  grantedAt: Date;
}

const e164Pattern = /^\+[1-9]\d{7,14}$/;

export function normalizeE164(phoneNumber: string): string {
  const normalized = phoneNumber.trim().replace(/[\s()-]/g, '');

  if (!e164Pattern.test(normalized)) {
    throw new Error('Phone number must use E.164 format');
  }

  return normalized;
}

export function isMarketingEligible(consent: MarketingConsent): boolean {
  return consent.status === 'active';
}
