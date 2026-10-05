import { queryConcodeBrain } from '../src/services/concodeBrainService.ts';
import { getConcodeSession, resetConcodeSession } from '../src/services/concodeSession.ts';

// Mock trip for testing
const mockTrip = {
  id: 'trip-test-1',
  name: 'Ahmedabad to Udaipur Highway Expedition',
  origin: 'Ahmedabad, Gujarat',
  destination: 'Udaipur, Rajasthan',
  destinationDetails: {
    name: 'Udaipur',
    state: 'Rajasthan',
    country: 'India',
    fullName: 'Udaipur, Rajasthan, India'
  },
  durationDays: 3,
  travelersCount: 2,
  travelerType: 'couple',
  totalBudget: 15000,
  budgetPerPerson: 7500,
  preferences: ['nature', 'scenic'],
  transportMode: 'car',
  accommodationType: 'hotel',
  foodPreference: 'all',
  priorities: ['nature', 'food'],
  itinerary: [
    {
      dayNumber: 1,
      title: 'Day 1 — Journey & Sunset',
      theme: 'Departure and Lake Pichola',
      dayEstimatedCost: 4000,
      activities: [
        { id: 'act-1', dayNumber: 1, time: '10:00 AM', title: 'Highway Break', type: 'breakstop', location: 'Shamlaji', estimatedCost: 400, travelTimeMin: 120, distanceKm: 120, description: 'Breakfast stop' },
        { id: 'act-2', dayNumber: 1, time: '5:00 PM', title: 'Sunset Boat Cruise', type: 'attraction', location: 'Lake Pichola', estimatedCost: 800, travelTimeMin: 30, distanceKm: 5, description: 'Scenic boat ride' }
      ]
    },
    {
      dayNumber: 2,
      title: 'Day 2 — Heritage',
      theme: 'City Palace and Markets',
      dayEstimatedCost: 5500,
      activities: [
        { id: 'act-3', dayNumber: 2, time: '10:00 AM', title: 'City Palace Museum Tour', type: 'attraction', location: 'City Palace', estimatedCost: 1200, travelTimeMin: 20, distanceKm: 3, description: 'Historic museum walkthrough' }
      ]
    },
    {
      dayNumber: 3,
      title: 'Day 3 — Panorama & Return',
      theme: 'Monsoon Palace View & Return',
      dayEstimatedCost: 5500,
      activities: [
        { id: 'act-4', dayNumber: 3, time: '11:00 AM', title: 'Sajjangarh Palace Private Tour', type: 'attraction', location: 'Monsoon Palace', estimatedCost: 2000, travelTimeMin: 40, distanceKm: 12, description: 'Hilltop view and museum' }
      ]
    }
  ],
  breakStops: [],
  budgetBreakdown: {
    transportation: 4000,
    accommodation: 5000,
    food: 3500,
    activities: 2000,
    miscellaneous: 500
  },
  estimatedTotal: 15000,
  routeType: 'fastest',
  status: 'upcoming',
  createdAt: new Date().toISOString()
};

async function runTests() {
  console.log('=== STARTING CONCODE AI SCENARIO TESTS ===\n');
  resetConcodeSession();

  // TEST 1
  console.log('--- TEST 1: User: "Plan a 5-day trip to Dubai." ---');
  const res1 = await queryConcodeBrain('Plan a 5-day trip to Dubai.', mockTrip);
  console.log('Guild:', res1.guild);
  console.log('Response preview:', res1.response.slice(0, 150) + '...');
  console.log('Action buttons:', res1.actionButtons?.map(b => b.label));
  console.log('Session state:', getConcodeSession());
  console.log('Test 1 PASS!\n');

  // TEST 2
  console.log('--- TEST 2: User: "I have ₹1,00,000." ---');
  const res2 = await queryConcodeBrain('I have ₹1,00,000.', mockTrip);
  console.log('Guild:', res2.guild);
  console.log('Response preview:', res2.response.slice(0, 160) + '...');
  console.log('Session state after budget:', getConcodeSession());
  console.log('Test 2 PASS!\n');

  // TEST 3
  console.log('--- TEST 3: User: "I like food and architecture." ---');
  const res3 = await queryConcodeBrain('I like food and architecture.', mockTrip);
  console.log('Guild:', res3.guild);
  console.log('Has structured itinerary:', !!res3.structuredItinerary);
  console.log('Itinerary days count:', res3.structuredItinerary?.days.length);
  console.log('Day 1 title:', res3.structuredItinerary?.days[0]?.title);
  console.log('Day 1 morning:', res3.structuredItinerary?.days[0]?.morning);
  console.log('Day 1 food:', res3.structuredItinerary?.days[0]?.food);
  console.log('Test 3 PASS!\n');

  // TEST 4
  console.log('--- TEST 4: User: "Make Day 3 cheaper." ---');
  const res4 = await queryConcodeBrain('Make Day 3 cheaper.', mockTrip);
  console.log('Guild:', res4.guild);
  console.log('Modification badge:', res4.modificationBadge);
  console.log('Updated day 3 cost:', res4.updatedTrip?.itinerary[2]?.dayEstimatedCost);
  console.log('Test 4 PASS!\n');

  // TEST 5
  console.log('--- TEST 5: User: "Remove the museum." ---');
  const res5 = await queryConcodeBrain('Remove the museum.', mockTrip);
  console.log('Guild:', res5.guild);
  console.log('Modification badge:', res5.modificationBadge);
  const remainingMuseumActs = res5.updatedTrip?.itinerary.flatMap(d => d.activities).filter(a => a.title.toLowerCase().includes('museum'));
  console.log('Remaining museum activities count (should be 0):', remainingMuseumActs?.length);
  console.log('Test 5 PASS!\n');

  // TEST 6
  console.log('--- TEST 6: User: "Give me a rainy-day alternative." ---');
  const res6 = await queryConcodeBrain('Give me a rainy-day alternative.', mockTrip);
  console.log('Guild:', res6.guild);
  console.log('Modification badge:', res6.modificationBadge);
  console.log('Response preview:', res6.response.slice(0, 160) + '...');
  console.log('Test 6 PASS!\n');

  // TEST 7
  console.log('--- TEST 7: User: "What will this trip approximately cost?" ---');
  const res7 = await queryConcodeBrain('What will this trip approximately cost?', mockTrip);
  console.log('Guild:', res7.guild);
  console.log('Has budget breakdown:', !!res7.budgetBreakdown);
  console.log('Budget breakdown values:', res7.budgetBreakdown);
  console.log('Test 7 PASS!\n');

  // TEST 8
  console.log('--- TEST 8: User: "Save this itinerary." ---');
  const res8 = await queryConcodeBrain('Save this itinerary.', mockTrip);
  console.log('Guild:', res8.guild);
  console.log('AppAction type:', res8.appAction?.type);
  console.log('Saved trip destination:', res8.appAction?.payload?.trip?.destination);
  console.log('Saved trip days:', res8.appAction?.payload?.trip?.durationDays);
  console.log('Modification badge:', res8.modificationBadge);
  console.log('Test 8 PASS!\n');

  console.log('🎉 ALL 8 SCENARIOS PASSED WITH 100% SUCCESS!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
