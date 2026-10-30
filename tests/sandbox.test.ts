import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Polyfill localStorage & window for Node environment
const mockStorage: Record<string, string> = {};
beforeAll(() => {
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    }
  };
  (global as any).window = {
    location: { 
      origin: 'https://tripverse-pied.vercel.app',
      search: ''
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});

import {
  isSandboxMode,
  setSandboxMode,
  isSandboxVerificationCode,
  authenticateSandboxPersona,
  createSandboxAuthUser,
  SANDBOX_PERSONAS,
  SANDBOX_TEST_CODE
} from '../src/services/sandboxService';

describe('Sandbox Service Tests', () => {
  beforeEach(() => {
    (global as any).localStorage.clear();
  });

  it('detects sandbox mode toggle accurately', () => {
    expect(isSandboxMode()).toBe(false);
    setSandboxMode(true);
    expect(isSandboxMode()).toBe(true);
    setSandboxMode(false);
    expect(isSandboxMode()).toBe(false);
  });

  it('validates sandbox test codes correctly', () => {
    expect(isSandboxVerificationCode(SANDBOX_TEST_CODE)).toBe(true);
    expect(isSandboxVerificationCode('990471')).toBe(true);
    expect(isSandboxVerificationCode('000000')).toBe(false);
    expect(isSandboxVerificationCode('random')).toBe(false);
  });

  it('authenticates a pre-configured sandbox persona with deterministic UUID', async () => {
    const aarav = SANDBOX_PERSONAS.find(p => p.id === 'aarav_sharma')!;
    expect(aarav).toBeDefined();

    const user = await authenticateSandboxPersona(aarav);
    expect(user.displayName).toBe('Aarav Sharma');
    expect(user.email).toBe('aarav.sharma@demo.tripverse.ai');
    expect(user.emailVerified).toBe(true);
    expect(user.uid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('creates custom sandbox user for arbitrary phone and email', () => {
    const phoneUser = createSandboxAuthUser({
      identifier: '+919999988888',
      type: 'phone',
      name: 'Custom Tester'
    });
    expect(phoneUser.displayName).toBe('Custom Tester');
    expect(phoneUser.provider).toBe('phone');
    expect(phoneUser.emailVerified).toBe(true);
    expect(phoneUser.uid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const emailUser = createSandboxAuthUser({
      identifier: 'tester@custom.domain',
      type: 'email'
    });
    expect(emailUser.email).toBe('tester@custom.domain');
    expect(emailUser.provider).toBe('email');
  });
});
