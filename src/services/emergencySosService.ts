/**
 * Global Emergency SOS & Embassy Service (emergencySosService.ts)
 * 1-Tap emergency dialing, GPS coordinate locator, and multi-lingual emergency phrase cards.
 */

export interface CountryEmergencyNumbers {
  countryCode: string;
  countryName: string;
  universalOrPolice: string;
  ambulance: string;
  fire: string;
  touristPoliceOrHelp?: string;
  embassyNotes: string;
}

export const COUNTRY_EMERGENCY_REGISTRY: Record<string, CountryEmergencyNumbers> = {
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    universalOrPolice: '112',
    ambulance: '108',
    fire: '101',
    touristPoliceOrHelp: '1363',
    embassyNotes: 'National Emergency Support System (ERSS) is 112. 1363 offers 24x7 multilingual tourist helpline.'
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    universalOrPolice: '911',
    ambulance: '911',
    fire: '911',
    touristPoliceOrHelp: '311',
    embassyNotes: 'Dial 911 for all life-safety emergencies. Dial 311 for non-emergency city services.'
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    universalOrPolice: '999',
    ambulance: '999',
    fire: '999',
    touristPoliceOrHelp: '101',
    embassyNotes: '999 or 112 for critical emergencies; 101 for non-emergency police reporting.'
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    universalOrPolice: '112',
    ambulance: '15',
    fire: '18',
    touristPoliceOrHelp: '17',
    embassyNotes: '112 is European universal. SAMU (medical) is 15. Police Secours is 17.'
  },
  AE: {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    universalOrPolice: '999',
    ambulance: '998',
    fire: '997',
    touristPoliceOrHelp: '901',
    embassyNotes: 'Police is 999; Dubai Tourist Police is 901 or 800-4888.'
  },
  JP: {
    countryCode: 'JP',
    countryName: 'Japan',
    universalOrPolice: '110',
    ambulance: '119',
    fire: '119',
    touristPoliceOrHelp: '050-3816-2720',
    embassyNotes: 'Police 110; Ambulance 119. Japan National Tourism Org (JNTO) 24/7 hotline: 050-3816-2720.'
  },
  SG: {
    countryCode: 'SG',
    countryName: 'Singapore',
    universalOrPolice: '999',
    ambulance: '995',
    fire: '995',
    touristPoliceOrHelp: '1800-255-0000',
    embassyNotes: 'Police 999; Civil Defence (Ambulance/Fire) 995.'
  },
  TH: {
    countryCode: 'TH',
    countryName: 'Thailand',
    universalOrPolice: '191',
    ambulance: '1669',
    fire: '199',
    touristPoliceOrHelp: '1155',
    embassyNotes: 'Tourist Police hotline is 1155 with English and Chinese speaking officers.'
  },
  IT: {
    countryCode: 'IT',
    countryName: 'Italy',
    universalOrPolice: '112',
    ambulance: '118',
    fire: '115',
    touristPoliceOrHelp: '113',
    embassyNotes: '112 connects to Carabinieri and State Police in English.'
  },
  CH: {
    countryCode: 'CH',
    countryName: 'Switzerland',
    universalOrPolice: '112',
    ambulance: '144',
    fire: '118',
    touristPoliceOrHelp: '1414',
    embassyNotes: 'Alpine Air Rescue (REGA) is 1414. Universal emergency is 112.'
  }
};

export interface EmergencyPhrase {
  situation: string;
  targetLanguage: string;
  translatedText: string;
  phoneticPronunciation: string;
}

export const EMERGENCY_PHRASES: Record<string, EmergencyPhrase[]> = {
  FR: [
    {
      situation: 'Urgent Medical Need',
      targetLanguage: 'French',
      translatedText: 'J\'ai besoin d\'une aide médicale urgente immédiatement.',
      phoneticPronunciation: 'Zhay buh-zwan doon eyd may-dee-kahl oor-zhahnt'
    },
    {
      situation: 'Call the Police',
      targetLanguage: 'French',
      translatedText: 'Veuillez appeler la police s\'il vous plaît!',
      phoneticPronunciation: 'Vuh-yay ah-puh-lay lah po-lees seel voo play'
    }
  ],
  JP: [
    {
      situation: 'Urgent Medical Need',
      targetLanguage: 'Japanese',
      translatedText: '救急車を呼んでください。緊急です。',
      phoneticPronunciation: 'Kyu-kyu-sha o yon-de ku-da-sai. Kin-kyu desu.'
    },
    {
      situation: 'Call the Police',
      targetLanguage: 'Japanese',
      translatedText: '警察を呼んでください！',
      phoneticPronunciation: 'Kei-satsu o yon-de ku-da-sai!'
    }
  ],
  AE: [
    {
      situation: 'Urgent Medical Need',
      targetLanguage: 'Arabic',
      translatedText: 'أحتاج إلى سيارة إسعاف فوراً، حالة طارئة.',
      phoneticPronunciation: 'Ahtaj ila sayyarat is\'aaf fowran, hala tari\'ah'
    }
  ],
  IN: [
    {
      situation: 'Urgent Medical Need',
      targetLanguage: 'Hindi',
      translatedText: 'मुझे तुरंत एम्बुलेंस और डॉक्टर की ज़रूरत है।',
      phoneticPronunciation: 'Mujhe turant ambulance aur doctor ki zaroorat hai.'
    },
    {
      situation: 'Call the Police',
      targetLanguage: 'Hindi',
      translatedText: 'कृपया तुरंत पुलिस को बुलाइए!',
      phoneticPronunciation: 'Kripya turant police ko bulaiye!'
    }
  ]
};

export function getEmergencyNumbersForCountry(countryCode?: string): CountryEmergencyNumbers {
  const code = (countryCode || 'IN').toUpperCase();
  return COUNTRY_EMERGENCY_REGISTRY[code] || COUNTRY_EMERGENCY_REGISTRY['IN'];
}

const DESTINATION_COUNTRY_MATCHERS: Array<{ code: string; pattern: RegExp }> = [
  { code: 'FR', pattern: /\b(france|paris|nice|lyon|marseille|bordeaux|chamonix|riviera)\b/i },
  { code: 'AE', pattern: /\b(uae|united arab emirates|dubai|abu dhabi|sharjah)\b/i },
  { code: 'JP', pattern: /\b(japan|tokyo|kyoto|osaka|sapporo|hiroshima|fukuoka|nara|okinawa)\b/i },
  { code: 'US', pattern: /\b(usa|u\.s\.a\.|united states|new york|nyc|los angeles|san francisco|chicago|miami|seattle|las vegas|hawaii|california|texas|florida)\b/i },
  { code: 'GB', pattern: /\b(uk|u\.k\.|united kingdom|england|scotland|wales|london|edinburgh|manchester|liverpool|bath|oxford)\b/i },
  { code: 'SG', pattern: /\b(singapore|sentosa|marina bay)\b/i },
  { code: 'TH', pattern: /\b(thailand|bangkok|phuket|chiang mai|krabi|pattaya|koh samui)\b/i },
  { code: 'IT', pattern: /\b(italy|rome|venice|florence|milan|naples|amalfi|tuscany|sicily)\b/i },
  { code: 'CH', pattern: /\b(switzerland|zurich|zürich|geneva|interlaken|lucerne|zermatt|bern|basel)\b/i },
  { code: 'IN', pattern: /\b(india|delhi|mumbai|goa|jaipur|udaipur|bengaluru|bangalore|kerala|kashmir|manali|ladakh|varanasi|kolkata|chennai|hyderabad|agra|rishikesh)\b/i },
];

export function resolveEmergencyCountryCode(destination?: string): string {
  if (!destination) return 'IN';
  const normalized = destination.trim();
  if (/^[A-Z]{2}$/.test(normalized) && COUNTRY_EMERGENCY_REGISTRY[normalized]) {
    return normalized;
  }
  for (const { code, pattern } of DESTINATION_COUNTRY_MATCHERS) {
    if (pattern.test(normalized)) return code;
  }
  return 'IN';
}
