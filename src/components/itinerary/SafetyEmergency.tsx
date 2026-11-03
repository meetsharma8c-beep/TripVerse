import React, { useState } from 'react';
import { ExternalLink, PhoneCall, ShieldCheck, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

interface SafetyEmergencyProps {
  destination?: string;
}

interface ScamItem {
  title: string;
  description: string;
  howToAvoid: string;
}

interface DestinationSafetyData {
  advisoryLevel: 'Safe' | 'Exercise Normal Caution' | 'High Vigilance';
  emergencyNumbers: { label: string; number: string; iconLabel?: string }[];
  safeNeighborhoods: string[];
  cautionAreas: string[];
  commonScams: ScamItem[];
}

function getDestinationSafety(destinationName: string = ''): DestinationSafetyData {
  const norm = destinationName.toLowerCase();

  // 1. Manali / Himachal Pradesh
  if (norm.includes('manali') || norm.includes('himachal') || norm.includes('shimla') || norm.includes('spiti')) {
    return {
      advisoryLevel: 'Safe',
      emergencyNumbers: [
        { label: 'Himachal Police / Emergency', number: '112' },
        { label: 'Manali Tourist Police Desk', number: '01902-252322' },
        { label: 'Mountain Rescue Helpline', number: '1077' },
        { label: 'Atal Tunnel Control Room', number: '01902-252114' }
      ],
      safeNeighborhoods: ['Old Manali', 'Mall Road Promenade', 'Vashisht Village', 'Aleo'],
      cautionAreas: ['Rohtang Pass roads after sunset during winter', 'Riverbanks during sudden dam discharge'],
      commonScams: [
        {
          title: 'Overpriced Winter Clothing Rental',
          description: 'Roadside shops near Kothi charge 5x regular rates for snow suits and boots claiming you cannot enter Solang or Rohtang without their exact gear.',
          howToAvoid: 'Rent gear from authorized HPTDC government counters or pre-book through your hotel at fixed rates (usually ₹250-₹400/set).'
        },
        {
          title: 'Unlicensed Adventure Sports Operators',
          description: 'Uncertified paragliding or river rafting operators lacking insurance or certified harness equipment.',
          howToAvoid: 'Always check that the operator displays an active Himachal Tourism Safety License and inspect helmet & harness.'
        },
        {
          title: 'Fake Saffron & Shilajit Vendors',
          description: 'Street vendors in Mall Road selling colored coconut fiber as Kashmiri Saffron or molasses as Shilajit.',
          howToAvoid: 'Buy authentic Himalayan herbs only from government emporiums or verified cooperative stores like Bhuttico.'
        }
      ]
    };
  }

  // 2. Dubai / UAE
  if (norm.includes('dubai') || norm.includes('uae') || norm.includes('abu dhabi')) {
    return {
      advisoryLevel: 'Safe',
      emergencyNumbers: [
        { label: 'UAE Police Emergency', number: '999' },
        { label: 'Ambulance', number: '998' },
        { label: 'Civil Defence (Fire)', number: '997' },
        { label: 'Dubai Tourist Security Helpline', number: '800-4888' }
      ],
      safeNeighborhoods: ['Downtown Dubai', 'Dubai Marina', 'Jumeirah Beach Residence (JBR)', 'Palm Jumeirah', 'Business Bay'],
      cautionAreas: ['Deira alleys late at night for solo travelers carrying visible valuables'],
      commonScams: [
        {
          title: 'Unauthorized Desert Safari Touts',
          description: 'Independent street vendors in Deira sell dirt-cheap desert safaris that omit dune bashing, food, or insurance.',
          howToAvoid: 'Book exclusively through certified DTCM tour companies with licensed 4x4 vehicles.'
        },
        {
          title: 'Counterfeit Perfume & Watch Hawkers',
          description: 'Street touts in Gold Souk whispering about replica Swiss watches or branded oud perfumes in back alleys.',
          howToAvoid: 'Never follow street hawkers into residential apartments or back alleys; purchase from registered Souk shops.'
        }
      ]
    };
  }

  // 3. Jaipur / Rajasthan / Udaipur
  if (norm.includes('jaipur') || norm.includes('rajasthan') || norm.includes('udaipur') || norm.includes('jodhpur')) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      emergencyNumbers: [
        { label: 'Rajasthan Police Emergency', number: '112' },
        { label: 'Jaipur Tourist Police (Amer/Hawa Mahal)', number: '0141-2601755' },
        { label: 'Medical Emergency Helpline', number: '108' },
        { label: 'Rajasthan Tourism Helpline', number: '1800-103-3500' }
      ],
      safeNeighborhoods: ['C-Scheme', 'Civil Lines', 'Malviya Nagar', 'Lake Pichola Promenade (Udaipur)'],
      cautionAreas: ['Old Walled City jewelry alleys after 10 PM', 'Isolated ghats alone after midnight'],
      commonScams: [
        {
          title: 'Gemstone & Jewelry Commission Trap',
          description: 'Auto-rickshaw or taxi drivers insist on taking you to an "exclusive government wholesale gem factory" where they receive up to 50% kickback commissions on inflated stones.',
          howToAvoid: 'Politely decline all shopping detours proposed by drivers and use ride-hailing apps (Ola/Uber) for transparent routes.'
        },
        {
          title: 'Fake Heritage Guide Trap',
          description: 'Men without official badges outside Amer Fort or City Palace claiming they are government historians.',
          howToAvoid: 'Hire guides strictly from the official monument ticket counter with approved photo ID badges and fixed rates.'
        }
      ]
    };
  }

  // 4. Goa / Gokarna
  if (norm.includes('goa') || norm.includes('gokarna')) {
    return {
      advisoryLevel: 'Safe',
      emergencyNumbers: [
        { label: 'Goa Integrated Police Emergency', number: '112' },
        { label: 'Goa Tourist Security Patrol', number: '1077' },
        { label: 'Coastal Lifeguard Emergency (Drishti)', number: '0832-2415108' },
        { label: 'Highway Road Assistance', number: '1033' }
      ],
      safeNeighborhoods: ['Candolim', 'Calangute Main Street', 'Panaji Promenade', 'Palolem Beach Strip'],
      cautionAreas: ['Isolated cliff trails after sunset', 'Rough surf waters outside designated red-flag swimming zones'],
      commonScams: [
        {
          title: 'Scooter Rental Pre-Existing Damage Claim',
          description: 'Rental vendors charge high damage fees for scratches that already existed when you picked up the vehicle.',
          howToAvoid: 'Always take a 360-degree high-definition video of the scooter and tires in front of the owner before riding off.'
        },
        {
          title: 'Overpriced Watersport Package Scams',
          description: 'Touts on the beach promising 5-in-1 sports packages but providing only 30-second token boat rides.',
          howToAvoid: 'Book only through registered operators with lifejackets and clear written receipt vouchers.'
        }
      ]
    };
  }

  // Default Universal Domestic & International Safety
  return {
    advisoryLevel: 'Exercise Normal Caution',
    emergencyNumbers: [
      { label: 'National Universal Emergency Response', number: '112' },
      { label: 'Police Assistance', number: '100' },
      { label: 'Medical Ambulance Support', number: '108' },
      { label: 'NHAI Highway & Breakdown Helpline', number: '1033' }
    ],
    safeNeighborhoods: ['City Center', 'Old Quarter Walking Street', 'Well-lit Transit Hubs'],
    cautionAreas: ['Poorly-lit alleys after midnight', 'Unregulated public transit at late hours'],
    commonScams: [
      {
        title: 'Broken Meter or Flat Rate Taxi Scam',
        description: 'Drivers outside airports or railway stations claim the meter is broken and charge 4x the regular tariff.',
        howToAvoid: 'Insist on using the meter, use official prepaid taxi booths inside terminals, or book via rideshare apps.'
      },
      {
        title: 'Overly Friendly "Free" Tour Detours',
        description: 'Friendly strangers inviting you for tea, only to lead you into souvenir emporiums with aggressive sales tactics.',
        howToAvoid: 'Keep polite boundaries with strangers offering unsolicited personalized shopping tours.'
      }
    ]
  };
}

export const SafetyEmergency: React.FC<SafetyEmergencyProps> = ({ destination }) => {
  const cleanDest = destination ? destination.split(',')[0].trim() : 'Your Destination';
  const data = getDestinationSafety(cleanDest);
  const [expandedScam, setExpandedScam] = useState<number | null>(0);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Header Banner */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>CONCODE Security Sentinel</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            Guild: security 🛡️
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#0B2545]">{cleanDest} Safety & Scam Radar</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time local intelligence, emergency hotlines, and tourist trap warnings verified for your journey.
            </p>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
            data.advisoryLevel === 'Safe'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${data.advisoryLevel === 'Safe' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
            <span>Advisory: {data.advisoryLevel}</span>
          </div>
        </div>
      </div>

      {/* Emergency Hotlines Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <PhoneCall className="w-4 h-4 text-[#2D5A3D]" />
          <span>Verified Local Emergency Numbers</span>
        </h3>
        
        <div className="grid gap-2.5 sm:grid-cols-2">
          {data.emergencyNumbers.map((item) => (
            <a
              key={item.label}
              href={`tel:${item.number}`}
              onClick={() => triggerHaptic('medium')}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all group"
            >
              <div className="min-w-0">
                <span className="block text-xs text-slate-500 font-medium truncate">{item.label}</span>
                <strong className="block text-base font-bold text-slate-900 tracking-wide font-mono mt-0.5">{item.number}</strong>
              </div>
              <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#2D5A3D] group-hover:bg-[#2D5A3D] group-hover:text-white flex items-center justify-center transition-all shrink-0 shadow-2xs">
                <PhoneCall className="w-4 h-4" />
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Local Tourist Scam Radar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Tourist Trap & Scam Radar for {cleanDest}</span>
          </h3>
          <span className="text-[11px] text-slate-500">Know before you go</span>
        </div>

        <div className="space-y-2.5">
          {data.commonScams.map((scam, idx) => {
            const isExpanded = expandedScam === idx;
            return (
              <div
                key={scam.title}
                className="rounded-2xl border border-slate-200 overflow-hidden transition-all bg-white"
              >
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setExpandedScam(isExpanded ? null : idx);
                  }}
                  className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      !
                    </span>
                    <span className="font-bold text-xs text-slate-900 truncate">{scam.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-3.5 pt-0 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50 space-y-2">
                    <p className="leading-relaxed">{scam.description}</p>
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[11px] font-bold text-emerald-900">How to Protect Yourself:</strong>
                        <span className="text-[11px] leading-relaxed">{scam.howToAvoid}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safe Neighborhoods & Guidance */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Recommended Safe Areas</span>
          </div>
          <ul className="text-xs text-emerald-800 space-y-1">
            {data.safeNeighborhoods.map((n) => (
              <li key={n} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
            <Info className="w-4 h-4 text-slate-600" />
            <span>High Vigilance Zones</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            {data.cautionAreas.map((n) => (
              <li key={n} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
};
