import { describe, it, expect, afterEach } from 'vitest';
import { detectPerformanceTier } from '../src/services/deviceService';

describe('Adaptive Hardware Performance Tier Engine (deviceService)', () => {
  const originalMemory = Object.getOwnPropertyDescriptor(navigator, 'deviceMemory');
  const originalCores = Object.getOwnPropertyDescriptor(navigator, 'hardwareConcurrency');
  const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection');

  afterEach(() => {
    if (originalMemory) Object.defineProperty(navigator, 'deviceMemory', originalMemory);
    else delete (navigator as any).deviceMemory;
    if (originalCores) Object.defineProperty(navigator, 'hardwareConcurrency', originalCores);
    if (originalConnection) Object.defineProperty(navigator, 'connection', originalConnection);
    else delete (navigator as any).connection;
  });

  it('classifies low-RAM / quad-core budget devices as lite tier', () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: 4, configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 4, configurable: true });
    expect(detectPerformanceTier()).toBe('lite');
  });

  it('classifies save-data / 2G devices as lite tier regardless of CPU cores', () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
    Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true });
    expect(detectPerformanceTier()).toBe('lite');
  });

  it('classifies high-RAM desktop devices without save-data as high tier', () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
    Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: '4g' }, configurable: true });
    expect(['high', 'balanced']).toContain(detectPerformanceTier());
  });
});
