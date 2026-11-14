import { describe, it, expect } from 'vitest';
import { getEmergencyNumbersForCountry, COUNTRY_EMERGENCY_REGISTRY, EMERGENCY_PHRASES } from '../src/services/emergencySosService';

describe('Global Emergency SOS Service (emergencySosService)', () => {
  it('retrieves accurate national emergency numbers for India (112, 108, 101, 1363)', () => {
    const numbers = getEmergencyNumbersForCountry('IN');
    expect(numbers.countryName).toBe('India');
    expect(numbers.universalOrPolice).toBe('112');
    expect(numbers.ambulance).toBe('108');
    expect(numbers.fire).toBe('101');
    expect(numbers.touristPoliceOrHelp).toBe('1363');
  });

  it('retrieves emergency numbers for France, UAE, Japan, and USA', () => {
    const fr = getEmergencyNumbersForCountry('FR');
    expect(fr.universalOrPolice).toBe('112');
    expect(fr.ambulance).toBe('15');

    const ae = getEmergencyNumbersForCountry('AE');
    expect(ae.universalOrPolice).toBe('999');
    expect(ae.touristPoliceOrHelp).toBe('901');

    const jp = getEmergencyNumbersForCountry('JP');
    expect(jp.universalOrPolice).toBe('110');
    expect(jp.ambulance).toBe('119');

    const us = getEmergencyNumbersForCountry('US');
    expect(us.universalOrPolice).toBe('911');
  });

  it('falls back safely to default emergency numbers when country is unrecognized', () => {
    const fallback = getEmergencyNumbersForCountry('UNKNOWN_COUNTRY_XYZ');
    expect(fallback.universalOrPolice).toBe('112');
    expect(fallback.countryName).toBe('India');
  });

  it('provides phonetic and translated emergency phrase cards for key destinations', () => {
    expect(EMERGENCY_PHRASES['FR'].length).toBeGreaterThan(0);
    expect(EMERGENCY_PHRASES['JP'].length).toBeGreaterThan(0);
    expect(EMERGENCY_PHRASES['AE'].length).toBeGreaterThan(0);

    const frenchPhrase = EMERGENCY_PHRASES['FR'][0];
    expect(frenchPhrase.translatedText).toContain('médicale');
    expect(frenchPhrase.phoneticPronunciation.length).toBeGreaterThan(5);
  });
});
