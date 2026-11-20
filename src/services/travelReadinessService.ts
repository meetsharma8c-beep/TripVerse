// src/services/travelReadinessService.ts
// Provides verified "Before You Fly" international travel readiness essentials:
// power plug & voltage, timezone offset, tipping norms, transit pass, visa/entry & emergency code.

import { COUNTRY_EMERGENCY_REGISTRY, resolveEmergencyCountryCode } from './emergencySosService';

export interface TravelReadinessInfo {
  countryCode: string;
  countryName: string;
  plugTypes: string;
  voltage: string;
  timezoneSummary: string;
  currencyAndTipping: string;
  localTransitTip: string;
  entryReminder: string;
  emergencyDial: string;
}

const READINESS_REGISTRY: Record<string, Omit<TravelReadinessInfo, 'countryCode' | 'countryName' | 'emergencyDial'>> = {
  US: {
    plugTypes: 'Type A / B',
    voltage: '120V · 60Hz',
    timezoneSummary: 'UTC-5 to UTC-8 (East Coast ~10.5h behind IST)',
    currencyAndTipping: 'USD ($) · 18–20% customary at restaurants & rideshares',
    localTransitTip: 'Contactless Tap-to-Pay (OMNY / NJ Transit App / Clipper)',
    entryReminder: 'Valid US Visa (B1/B2) or approved ESTA + 6-month passport validity'
  },
  CA: {
    plugTypes: 'Type A / B',
    voltage: '120V · 60Hz',
    timezoneSummary: 'UTC-5 to UTC-8 (Toronto ~10.5h behind IST)',
    currencyAndTipping: 'CAD (C$) · 15–20% customary at restaurants',
    localTransitTip: 'PRESTO (Toronto), Compass Card (Vancouver), OPUS (Montreal)',
    entryReminder: 'Valid Canadian Tourist Visa or eTA + return itinerary'
  },
  GB: {
    plugTypes: 'Type G (3-pin)',
    voltage: '230V · 50Hz',
    timezoneSummary: 'GMT / BST (UTC+0/+1 · ~4.5–5.5h behind IST)',
    currencyAndTipping: 'GBP (£) · 10–12.5% (often included as service charge)',
    localTransitTip: 'Contactless Bank Card / Apple Pay / Oyster on Tube & buses',
    entryReminder: 'UK Standard Visitor Visa or ETA depending on passport nationality'
  },
  FR: {
    plugTypes: 'Type C / E',
    voltage: '230V · 50Hz',
    timezoneSummary: 'CET / CEST (UTC+1/+2 · ~3.5–4.5h behind IST)',
    currencyAndTipping: 'EUR (€) · Service included; round up or 5–10% for great service',
    localTransitTip: 'Navigo Easy / Île-de-France Mobilités app for Metro & RER',
    entryReminder: 'Schengen Visa / ETIAS + travel medical insurance (€30,000 min.)'
  },
  IT: {
    plugTypes: 'Type C / F / L',
    voltage: '230V · 50Hz',
    timezoneSummary: 'CET / CEST (UTC+1/+2 · ~3.5–4.5h behind IST)',
    currencyAndTipping: 'EUR (€) · Coperto cover charge common; tipping optional',
    localTransitTip: 'Validate regional Trenitalia tickets before boarding; contactless metro',
    entryReminder: 'Schengen Visa / ETIAS + proof of accommodation & insurance'
  },
  CH: {
    plugTypes: 'Type C / J',
    voltage: '230V · 50Hz',
    timezoneSummary: 'CET / CEST (UTC+1/+2 · ~3.5–4.5h behind IST)',
    currencyAndTipping: 'CHF · Service included; rounding up is appreciated',
    localTransitTip: 'SBB Mobile App + Swiss Travel Pass / Half Fare Card',
    entryReminder: 'Schengen Visa / ETIAS + passport valid 3+ months beyond departure'
  },
  DE: {
    plugTypes: 'Type C / F',
    voltage: '230V · 50Hz',
    timezoneSummary: 'CET / CEST (UTC+1/+2 · ~3.5–4.5h behind IST)',
    currencyAndTipping: 'EUR (€) · Round up or 5–10% stated when paying',
    localTransitTip: 'DB Navigator app for ICE trains & regional Deutschland-Ticket',
    entryReminder: 'Schengen Visa / ETIAS + travel health insurance'
  },
  ES: {
    plugTypes: 'Type C / F',
    voltage: '230V · 50Hz',
    timezoneSummary: 'CET / CEST (UTC+1/+2 · ~3.5–4.5h behind IST)',
    currencyAndTipping: 'EUR (€) · Tipping not expected; 5–10% for exceptional dining',
    localTransitTip: 'T-Casual (Barcelona) / Multi Card (Madrid) + Renfe AVE trains',
    entryReminder: 'Schengen Visa / ETIAS + confirmed return flight'
  },
  NL: {
    plugTypes: 'Type C / F',
    voltage: '230V · 50Hz',
    timezoneSummary: 'CET / CEST (UTC+1/+2 · ~3.5–4.5h behind IST)',
    currencyAndTipping: 'EUR (€) · 5–10% optional for good table service',
    localTransitTip: 'OVpay contactless debit/credit tap on all NS trains & trams',
    entryReminder: 'Schengen Visa / ETIAS + travel insurance'
  },
  JP: {
    plugTypes: 'Type A / B',
    voltage: '100V · 50/60Hz',
    timezoneSummary: 'JST (UTC+9 · 3.5h ahead of IST)',
    currencyAndTipping: 'JPY (¥) · Do NOT tip (considered impolite); carry some cash',
    localTransitTip: 'Digital Suica / PASMO in Apple Wallet or Welcome Suica at airport',
    entryReminder: 'Japan Visa / eVisa + Visit Japan Web QR for fast immigration'
  },
  AE: {
    plugTypes: 'Type G (3-pin)',
    voltage: '230V · 50Hz',
    timezoneSummary: 'GST (UTC+4 · 1.5h behind IST)',
    currencyAndTipping: 'AED · 10–15% at dining if service charge not included',
    localTransitTip: 'Nol Silver Card for Dubai Metro, tram & RTA buses; Careem/Uber',
    entryReminder: 'UAE Tourist Visa / Visa-on-Arrival (if eligible) + hotel voucher'
  },
  SG: {
    plugTypes: 'Type G (3-pin)',
    voltage: '230V · 50Hz',
    timezoneSummary: 'SGT (UTC+8 · 2.5h ahead of IST)',
    currencyAndTipping: 'SGD (S$) · 10% service charge included; extra tipping not expected',
    localTransitTip: 'SimplyGo contactless bank card on MRT & buses; Grab app',
    entryReminder: 'Singapore Visa + mandatory SG Arrival Card submitted 3 days prior'
  },
  TH: {
    plugTypes: 'Type A / B / C / O',
    voltage: '220V · 50Hz',
    timezoneSummary: 'ICT (UTC+7 · 1.5h ahead of IST)',
    currencyAndTipping: 'THB (฿) · Small tips (20–50 THB) appreciated; cash for street food',
    localTransitTip: 'Rabbit Card / contactless on Bangkok BTS & MRT; Grab/Bolt',
    entryReminder: 'Check visa-exempt / eVisa rules + carry 10,000–20,000 THB proof of funds'
  },
  AU: {
    plugTypes: 'Type I (3-pin angled)',
    voltage: '230V · 50Hz',
    timezoneSummary: 'AEST/AEDT (UTC+10/+11 · 4.5–5.5h ahead of IST)',
    currencyAndTipping: 'AUD (A$) · Tipping not mandatory; 10% only for fine dining',
    localTransitTip: 'Opal / Contactless (Sydney), Myki (Melbourne), Go Card (Brisbane)',
    entryReminder: 'Australia Subclass 600 / ETA + strict biosecurity customs declaration'
  },
  NZ: {
    plugTypes: 'Type I (3-pin angled)',
    voltage: '230V · 50Hz',
    timezoneSummary: 'NZST/NZDT (UTC+12/+13 · 6.5–7.5h ahead of IST)',
    currencyAndTipping: 'NZD (NZ$) · Tipping is not expected',
    localTransitTip: 'AT HOP Card (Auckland) / InterCity coaches & rental car for South Island',
    entryReminder: 'NZ Visitor Visa or NZeTA + NZ Traveller Declaration (NZTD)'
  }
};

/**
 * Return international "Before You Fly" travel readiness guidance for an overseas destination.
 * Returns null for domestic India destinations.
 */
export function getTravelReadinessInfo(destination: string): TravelReadinessInfo | null {
  const code = resolveEmergencyCountryCode(destination);
  if (!code || code === 'IN') return null;

  const emergency = COUNTRY_EMERGENCY_REGISTRY[code];
  const details = READINESS_REGISTRY[code];
  if (!emergency || !details) {
    return {
      countryCode: code,
      countryName: destination.split(',')[0].trim() || 'International',
      plugTypes: 'Universal Adapter Recommended',
      voltage: '110–240V (Check dual-voltage label)',
      timezoneSummary: 'Verify destination UTC offset before arrival',
      currencyAndTipping: 'Carry zero-forex card + small local cash for transit',
      localTransitTip: 'Check airport express rail or official taxi stand on arrival',
      entryReminder: 'Confirm visa, passport validity (6+ months), and travel insurance',
      emergencyDial: '112 / 911'
    };
  }

  return {
    countryCode: code,
    countryName: emergency.countryName,
    emergencyDial: emergency.universalOrPolice,
    ...details
  };
}
