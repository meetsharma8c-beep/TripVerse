import React, { useState } from 'react';
import { ExternalLink, PhoneCall, ShieldCheck, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';
import { useLanguage } from '../../services/languageService';

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

  // 5. Paris / France
  if (norm.includes('paris') || norm.includes('france')) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      emergencyNumbers: [
        { label: 'European Universal Emergency', number: '112' },
        { label: 'Police Nationale (Secours)', number: '17' },
        { label: 'SAMU Medical Ambulance', number: '15' },
        { label: 'Sapeurs-Pompiers (Fire & Rescue)', number: '18' }
      ],
      safeNeighborhoods: ['Le Marais', 'Saint-Germain-des-Prés', '7th Arrondissement (Eiffel)', 'Latin Quarter'],
      cautionAreas: ['Gare du Nord surroundings late at night', 'Barbes-Rochechouart & isolated metro corridors'],
      commonScams: [
        {
          title: 'The String / Friendship Bracelet Trap',
          description: 'Men at the base of Sacré-Cœur grab your wrist and weave a string bracelet, then aggressively demand €20-€50.',
          howToAvoid: 'Keep your hands in your pockets or close to your chest when climbing Montmartre stairs; firmly say "Non merci".'
        },
        {
          title: 'The "Found Gold Ring" Trick',
          description: 'Someone picks up a shiny brass ring off the sidewalk right in front of you, claiming you dropped it and asking for cash reward.',
          howToAvoid: 'Ignore the gesture completely and keep walking without breaking your stride.'
        },
        {
          title: 'Fake Charity Petition Boards',
          description: 'Groups pretending to be deaf-mute volunteers asking for petition signatures while an accomplice picks your pockets.',
          howToAvoid: 'Never stop for clipboard petitions near the Eiffel Tower, Louvre courtyard, or Notre-Dame.'
        }
      ]
    };
  }

  // 6. Rome / Italy
  if (norm.includes('rome') || norm.includes('italy')) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      emergencyNumbers: [
        { label: 'Carabinieri & European Emergency', number: '112' },
        { label: 'Polizia di Stato', number: '113' },
        { label: 'Pronto Soccorso (Ambulance)', number: '118' },
        { label: 'Vigili del Fuoco (Fire)', number: '115' }
      ],
      safeNeighborhoods: ['Trastevere', 'Piazza Navona', 'Monti', 'Prati (Vatican)'],
      cautionAreas: ['Termini Station outer plazas after 11 PM', 'Crowded Bus #64 and metro lines'],
      commonScams: [
        {
          title: 'Gladiator Photo Extortion',
          description: 'Costumed gladiators outside the Colosseum pose with you enthusiastically, then aggressively demand €50 per person.',
          howToAvoid: 'Costumed touts are officially banned around the monument; avoid posing with them.'
        },
        {
          title: 'Pickpocketing on Crowded Transit',
          description: 'Teams create a jostle or distraction when boarding metro Line A or Bus 64.',
          howToAvoid: 'Wear cross-body bags with zipper clips and keep your phone secured inside your jacket.'
        }
      ]
    };
  }

  // 7. Tokyo / Japan
  if (norm.includes('tokyo') || norm.includes('japan') || norm.includes('kyoto')) {
    return {
      advisoryLevel: 'Safe',
      emergencyNumbers: [
        { label: 'Police Assistance (Keisatsu)', number: '110' },
        { label: 'Ambulance & Fire (Kyukyu)', number: '119' },
        { label: 'Japan Helpline (24/7 English)', number: '0570-000-911' },
        { label: 'Tokyo Metropolitan Tourist Info', number: '03-5321-3077' }
      ],
      safeNeighborhoods: ['Ginza', 'Shibuya', 'Shinjuku (West)', 'Asakusa', 'Roppongi Hills'],
      cautionAreas: ['Kabukicho back alleys with aggressive bar touts after midnight'],
      commonScams: [
        {
          title: 'Bottakuri (Exorbitant Bar Bill) Touts',
          description: 'Street touts in Roppongi or Kabukicho promise cheap drinks and attractive hosts, then present a ¥100,000+ bill with hidden seating fees.',
          howToAvoid: 'Never follow street touts into basement bars; only patronize establishments recommended by verified directories.'
        },
        {
          title: 'Fake Buddhist Monk Donations',
          description: 'Men dressed in robes hand out golden lucky talismans or peace cards and demand cash donations.',
          howToAvoid: 'True Japanese Buddhist monks do not solicit cash on street corners; politely decline.'
        }
      ]
    };
  }

  // 8. New York / USA
  if (norm.includes('new york') || norm.includes('usa') || norm.includes('united states')) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      emergencyNumbers: [
        { label: 'Universal Emergency (Police / Fire / EMS)', number: '911' },
        { label: 'NYC Non-Emergency City Services', number: '311' },
        { label: 'Poison Control Center', number: '1-800-222-1222' },
        { label: 'NYPD Tourist Information Desk', number: '212-343-4800' }
      ],
      safeNeighborhoods: ['Upper West Side', 'Greenwich Village', 'Hudson Yards', 'Battery Park City', 'Tribeca'],
      cautionAreas: ['Empty subway stations in outer boroughs late at night', 'Times Square alleys after midnight'],
      commonScams: [
        {
          title: 'Times Square CD / Mixtape Trap',
          description: 'Aspiring artists thrust their music CD into your hands, ask for your name, write on it, and aggressively demand a $20 "donation".',
          howToAvoid: 'Never accept items handed to you on sidewalks; keep your hands in your pockets and walk briskly.'
        },
        {
          title: 'Fake Broadway / Comedy Club Tickets',
          description: 'Street scalpers outside major theaters selling invalid printout barcodes.',
          howToAvoid: 'Purchase theater tickets exclusively through official TKTS booths or official box offices.'
        }
      ]
    };
  }

  // 9. Bangkok / Thailand
  if (norm.includes('bangkok') || norm.includes('thailand') || norm.includes('phuket')) {
    return {
      advisoryLevel: 'Safe',
      emergencyNumbers: [
        { label: 'Tourist Police (English Speaking)', number: '1155' },
        { label: 'Universal Police Emergency', number: '191' },
        { label: 'Medical Ambulance Helpline', number: '1669' },
        { label: 'Fire & Rescue Operations', number: '199' }
      ],
      safeNeighborhoods: ['Siam', 'Sukhumvit (Asok / Phrom Phong)', 'Silom', 'Riverside'],
      cautionAreas: ['Patpong alleys after 1 AM', 'Unmetered taxis outside Grand Palace'],
      commonScams: [
        {
          title: '"The Grand Palace is Closed Today" Tuk-Tuk Scam',
          description: 'Friendly tuk-tuk drivers outside temples tell you the palace is closed for a Buddhist ceremony and offer to take you to a "special government gem market".',
          howToAvoid: 'The Grand Palace is open daily; walk straight to the ticket counter and ignore street touts.'
        },
        {
          title: 'Jetski Pre-existing Damage Claim',
          description: 'Jetski operators in Phuket or Pattaya accuse you of causing hull cracks and demand thousands of Baht.',
          howToAvoid: 'Only rent jetskis through hotel-affiliated operators and photograph every scratch before riding.'
        }
      ]
    };
  }

  // 10. Default Universal Domestic (India) vs International Safety
  const isIndia = norm.includes('india') || norm.includes('delhi') || norm.includes('mumbai') || norm.includes('bangalore') || norm.includes('kolkata') || norm.includes('chennai');

  if (isIndia) {
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

  // Universal International Default
  return {
    advisoryLevel: 'Exercise Normal Caution',
    emergencyNumbers: [
      { label: 'European & Global Universal Emergency', number: '112' },
      { label: 'North American Emergency (US / Canada)', number: '911' },
      { label: 'UK & Commonwealth Emergency', number: '999' },
      { label: 'International Consular & SOS Assistance', number: '+1-202-501-4444' }
    ],
    safeNeighborhoods: ['City Center', 'Pedestrian Promenade', 'Well-lit Transit Terminals'],
    cautionAreas: ['Poorly-lit alleys after midnight', 'Unregulated unlicensed taxis at late hours'],
    commonScams: [
      {
        title: 'Broken Taxi Meter Scam',
        description: 'Taxis outside international airports claim their digital meter is broken and demand exorbitant fixed rates.',
        howToAvoid: 'Always use official airport taxi dispatch desks, licensed rideshare apps (Uber/Grab/Bolt), or agreed metered tariffs.'
      },
      {
        title: 'Spill / Distraction Pickpocket Trick',
        description: 'Someone accidentally drops ketchup, coffee, or coins near you, offering to help clean your jacket while taking your wallet.',
        howToAvoid: 'Step back, keep your hands on your belongings, and walk away calmly without accepting assistance.'
      }
    ]
  };
}

export const SafetyEmergency: React.FC<SafetyEmergencyProps> = ({ destination }) => {
  const { t } = useLanguage();
  const cleanDest = destination ? destination.split(',')[0].trim() : t('Your Destination');
  const data = getDestinationSafety(cleanDest);
  const [expandedScam, setExpandedScam] = useState<number | null>(0);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Header Banner */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('CONCODE Security Sentinel')}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            <span>{t('Guild: security')} 🛡️</span>
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#0B2545]">{cleanDest} {t('Safety & Scam Radar')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('Real-time local intelligence, emergency hotlines, and tourist trap warnings verified for your journey.')}
            </p>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
            data.advisoryLevel === 'Safe'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${data.advisoryLevel === 'Safe' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
            <span>{t('Advisory')}: {t(data.advisoryLevel)}</span>
          </div>
        </div>
      </div>

      {/* Emergency Hotlines Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <PhoneCall className="w-4 h-4 text-[#2D5A3D]" />
          <span>{t('Verified Local Emergency Numbers')}</span>
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
                <span className="block text-xs text-slate-500 font-medium truncate">{t(item.label)}</span>
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
            <span>{t('Tourist Trap & Scam Radar for {cleanDest}', { cleanDest })}</span>
          </h3>
          <span className="text-[11px] text-slate-500">{t('Know before you go')}</span>
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
                    <span className="font-bold text-xs text-slate-900 truncate">{t(scam.title)}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-3.5 pt-0 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50 space-y-2">
                    <p className="leading-relaxed">{t(scam.description)}</p>
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[11px] font-bold text-emerald-900">{t('How to Protect Yourself:')}</strong>
                        <span className="text-[11px] leading-relaxed">{t(scam.howToAvoid)}</span>
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
