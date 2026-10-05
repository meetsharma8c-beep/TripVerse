import { processTravelCoPilotQuery } from '../src/services/aiAssistant';
import { INITIAL_TRIPS } from '../src/data/initialTrips';

async function runTests() {
  console.log('🧪 Starting CONCODE AI Capability & In-App Actions Test Suite...\n');
  const sampleTrip = INITIAL_TRIPS[0];

  const testCases = [
    {
      name: "Weather Query for Manali",
      query: "show me Manali's weather",
      validate: (res: any) => {
        const text = res.message.text;
        const passed = text.includes('Manali') && !text.includes('Custom Spot') && !text.includes('Fullstack Co-Pilot 92% match');
        return { passed, details: `Destination: ${text.slice(0, 80)}...` };
      }
    },
    {
      name: "Start GPS Navigation",
      query: "start navigation",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'START_NAVIGATION';
        return { passed, details: `appAction.type: ${res.appAction?.type}` };
      }
    },
    {
      name: "Turn-by-turn Navigation",
      query: "turn by turn driving hud",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'START_NAVIGATION';
        return { passed, details: `appAction.type: ${res.appAction?.type}` };
      }
    },
    {
      name: "Make Trip Cheaper (Budget Optimization)",
      query: "make this cheaper",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'UPDATE_TRIP' && res.updatedTrip && res.updatedTrip.estimatedTotal < sampleTrip.estimatedTotal;
        return { passed, details: `Old total: ₹${sampleTrip.estimatedTotal}, New total: ₹${res.updatedTrip?.estimatedTotal}` };
      }
    },
    {
      name: "Log Real-Time Expense",
      query: "log expense 850 for highway dinner",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'ADD_EXPENSE' && res.appAction?.payload?.expense?.amount === 850;
        return { passed, details: `Expense amount: ₹${res.appAction?.payload?.expense?.amount}, Category: ${res.appAction?.payload?.expense?.category}` };
      }
    },
    {
      name: "Log Petrol Expense",
      query: "spent 1500 on petrol",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'ADD_EXPENSE' && res.appAction?.payload?.expense?.category === 'fuel';
        return { passed, details: `Expense category: ${res.appAction?.payload?.expense?.category}, Amount: ₹${res.appAction?.payload?.expense?.amount}` };
      }
    },
    {
      name: "Add Items to Packing List",
      query: "add power bank and camera to packing list",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'ADD_PACKING_ITEM' && res.appAction?.payload?.items?.length > 0;
        return { passed, details: `Added items count: ${res.appAction?.payload?.items?.length}` };
      }
    },
    {
      name: "Print Travel Guide / PDF Export",
      query: "download pdf travel guide",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'OPEN_MODAL' && res.appAction?.payload?.modal === 'print';
        return { passed, details: `Modal to open: ${res.appAction?.payload?.modal}` };
      }
    },
    {
      name: "Share Trip & Collaborate",
      query: "share trip with friends",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'OPEN_MODAL' && res.appAction?.payload?.modal === 'share';
        return { passed, details: `Modal to open: ${res.appAction?.payload?.modal}` };
      }
    },
    {
      name: "Trip Photo Memories Scrapbook",
      query: "open photo scrapbook memories",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'OPEN_MODAL' && res.appAction?.payload?.modal === 'photos';
        return { passed, details: `Modal to open: ${res.appAction?.payload?.modal}` };
      }
    },
    {
      name: "Trip Replanning & Disruption Guard",
      query: "my flight is cancelled due to storm",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'OPEN_MODAL' && res.appAction?.payload?.modal === 'replanning';
        return { passed, details: `Modal to open: ${res.appAction?.payload?.modal}` };
      }
    },
    {
      name: "Direct AI Trip Generation via Chat",
      query: "plan a trip to Goa for 4 days with 20000 budget",
      validate: (res: any) => {
        const trip = res.appAction?.payload?.trip;
        const passed = res.appAction?.type === 'GENERATE_NEW_TRIP' && trip && trip.destination.toLowerCase().includes('goa') && trip.durationDays === 4;
        return { passed, details: `Generated: ${trip?.name} (${trip?.durationDays} days to ${trip?.destination})` };
      }
    },
    {
      name: "Add Mount Abu Waypoint Detour",
      query: "can we add Mount Abu?",
      validate: (res: any) => {
        const hasAbu = res.updatedTrip?.breakStops.some((s: any) => s.name.toLowerCase().includes('abu'));
        const passed = res.appAction?.type === 'UPDATE_TRIP' && hasAbu;
        return { passed, details: `Break stops count: ${res.updatedTrip?.breakStops?.length}` };
      }
    },
    {
      name: "Set Custom Budget",
      query: "set budget to 25000",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'UPDATE_TRIP' && res.updatedTrip?.totalBudget === 25000;
        return { passed, details: `New total budget: ₹${res.updatedTrip?.totalBudget}` };
      }
    },
    {
      name: "Extend Trip Duration",
      query: "add one more day",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'UPDATE_TRIP' && res.updatedTrip?.durationDays === sampleTrip.durationDays + 1;
        return { passed, details: `Duration: ${res.updatedTrip?.durationDays} days` };
      }
    },
    {
      name: "100% Pure Vegetarian Filter",
      query: "pure veg only",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'UPDATE_TRIP' && res.updatedTrip?.foodPreference === 'veg';
        return { passed, details: `Food preference: ${res.updatedTrip?.foodPreference}` };
      }
    },
    {
      name: "Switch Transport to Train",
      query: "switch to train",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'UPDATE_TRIP' && res.updatedTrip?.transportMode === 'train';
        return { passed, details: `Transport mode: ${res.updatedTrip?.transportMode}` };
      }
    },
    {
      name: "Switch Tab to Route Map",
      query: "show map",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'SWITCH_TAB' && res.appAction?.payload?.subTab === 'route';
        return { passed, details: `Tab: ${res.appAction?.payload?.tab}, SubTab: ${res.appAction?.payload?.subTab}` };
      }
    },
    {
      name: "Switch Tab to Profile",
      query: "go to profile",
      validate: (res: any) => {
        const passed = res.appAction?.type === 'SWITCH_TAB' && res.appAction?.payload?.tab === 'profile';
        return { passed, details: `Tab: ${res.appAction?.payload?.tab}` };
      }
    },
    {
      name: "Highway Safety & SOS Emergency Numbers",
      query: "emergency contacts and highway safety",
      validate: (res: any) => {
        const text = res.message.text;
        const passed = text.includes('112') && text.includes('1033');
        return { passed, details: `Includes 112 & 1033: ${passed}` };
      }
    }
  ];

  let passedCount = 0;
  for (const tc of testCases) {
    try {
      const res = await processTravelCoPilotQuery(tc.query, sampleTrip, { engine: 'concode_brain' });
      const { passed, details } = tc.validate(res);
      if (passed) {
        console.log(`✅ [PASS] ${tc.name}`);
        console.log(`   └─ ${details}`);
        passedCount++;
      } else {
        console.error(`❌ [FAIL] ${tc.name}`);
        console.error(`   └─ ${details}`);
        console.error(`   └─ Raw response:`, JSON.stringify(res, null, 2));
      }
    } catch (e: any) {
      console.error(`❌ [ERROR] ${tc.name}:`, e.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`🎉 Test Results: ${passedCount} / ${testCases.length} Tests Passed!`);
  console.log(`========================================\n`);

  if (passedCount === testCases.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
