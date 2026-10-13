import assert from 'node:assert';

// Import compiled or transpile-compatible JS or test logic mirroring transportFeasibilityEngine.ts & dealService.ts
import { resolveTransitContext, evaluateTransportFeasibility } from '../src/services/transportFeasibilityEngine.ts';
import { generateTransportDeals } from '../src/services/dealService.ts';

console.log('====================================================');
console.log('TRIPVERSE CONCODE — TRANSPORT FEASIBILITY TEST SUITE');
console.log('Testing compliance with 21 Master Reliability Principles');
console.log('====================================================\n');

// TEST 1: Destination ≠ Station (Manali)
console.log('[TEST 1] Destination ≠ Station Resolution: Manali');
const manaliTransit = resolveTransitContext('Manali');
assert.strictEqual(manaliTransit.hasDirectTrain, false, 'Manali must NOT have a direct railway station');
assert.strictEqual(manaliTransit.hasDirectAirport, false, 'Manali town must NOT have a direct commercial passenger airport');
assert.ok(manaliTransit.primaryRailwayStation.name.includes('Chandigarh'), 'Manali railhead must resolve to Chandigarh / Kalka');
assert.strictEqual(manaliTransit.requiresMultiModal, true, 'Manali journey must require multi-modal road transfer');
console.log('✅ Passed: Manali correctly resolves to Chandigarh railhead (310 km road transfer required).\n');

// TEST 2: Train Feasibility for Manali (Principle 3, 5, 9, 15)
console.log('[TEST 2] Train Feasibility Evaluation for Delhi -> Manali');
const manaliTrainFeasibility = evaluateTransportFeasibility('train', 'Delhi', 'Manali', '2026-10-20');
assert.strictEqual(manaliTrainFeasibility.status, 'UNAVAILABLE', 'Direct train to Manali must be marked UNAVAILABLE');
assert.strictEqual(manaliTrainFeasibility.isDirectPossible, false, 'Direct train to Manali must be impossible');
assert.ok(manaliTrainFeasibility.routeDecomposition.includes('Chandigarh'), 'Route decomposition must show transfer at Chandigarh');
assert.ok(manaliTrainFeasibility.transferSteps.length >= 2, 'Transfer steps must enumerate boarding, alighting, and road transfer');
assert.ok(manaliTrainFeasibility.alternatives.length >= 1, 'Must provide practical alternatives (Bus, Car)');
console.log('✅ Passed: Direct train evaluated as UNAVAILABLE with explicit Chandigarh transfer & bus/car alternatives.\n');

// TEST 3: Destination ≠ Station (Munnar)
console.log('[TEST 3] Destination ≠ Station Resolution: Munnar');
const munnarTransit = resolveTransitContext('Munnar, Kerala');
assert.strictEqual(munnarTransit.hasDirectTrain, false, 'Munnar must NOT have a railway station');
assert.strictEqual(munnarTransit.hasDirectAirport, false, 'Munnar must NOT have an airport');
assert.ok(munnarTransit.primaryAirport.name.includes('Cochin'), 'Munnar airport must resolve to Cochin (COK)');
assert.ok(munnarTransit.primaryRailwayStation.name.includes('Aluva') || munnarTransit.primaryRailwayStation.name.includes('Ernakulam'), 'Munnar railhead must resolve to Aluva / Ernakulam');
console.log('✅ Passed: Munnar correctly resolves to Cochin Airport and Aluva/Ernakulam railhead.\n');

// TEST 4: Destination ≠ Station (Leh / Ladakh) & Winter Seasonality (Principle 6, 19)
console.log('[TEST 4] High-Altitude & Seasonal Feasibility: Leh / Ladakh');
const lehTransit = resolveTransitContext('Leh, Ladakh');
assert.strictEqual(lehTransit.hasDirectTrain, false, 'Leh has zero railway stations');
assert.strictEqual(lehTransit.hasDirectAirport, true, 'Leh has Kushok Bakula Rimpochee Airport (IXL)');
assert.strictEqual(lehTransit.roadConnectivity.status, 'seasonal_high_altitude', 'Leh roads must be flagged as seasonal_high_altitude');
const lehCarFeasibility = evaluateTransportFeasibility('car', 'Delhi', 'Leh', '2026-12-15');
assert.ok(lehCarFeasibility.explanation.includes('winter') || lehCarFeasibility.explanation.includes('snow') || lehCarFeasibility.explanation.includes('seasonal'), 'Winter road trip to Leh must warn of mountain pass snow closures');
console.log('✅ Passed: Leh flight gateway recognized, and winter road closures explicitly flagged.\n');

// TEST 5: Direct Destinations (Goa & Udaipur)
console.log('[TEST 5] Direct Hub Resolution: Goa & Udaipur');
const goaTransit = resolveTransitContext('Goa');
assert.strictEqual(goaTransit.hasDirectAirport, true, 'Goa has commercial airports (GOI/GOX)');
assert.strictEqual(goaTransit.hasDirectTrain, true, 'Goa has railway stations (Madgaon MAO / Thivim THVM)');

const udaipurTransit = resolveTransitContext('Udaipur, Rajasthan');
assert.strictEqual(udaipurTransit.hasDirectAirport, true, 'Udaipur has Maharana Pratap Airport (UDR)');
assert.strictEqual(udaipurTransit.hasDirectTrain, true, 'Udaipur has Udaipur City Railway Station (UDZ)');
console.log('✅ Passed: Valid direct destinations recognized accurately without false multi-modal flags.\n');

// TEST 6: Deal Generator Eliminates Hallucinated Stations & Parametrizes Real Hubs (Principle 4, 11, 14)
console.log('[TEST 6] Deal Generator Feasibility & Action Link Separation for Delhi -> Manali');
const deals = generateTransportDeals({
  mode: 'train',
  origin: 'Delhi',
  destination: 'Manali',
  durationDays: 5,
  travelersCount: 2,
  totalBudget: 25000,
  priorities: ['comfort'],
  startDate: '2026-10-25'
});

const trainDeal = deals.allDeals.find(d => d.mode === 'train');
assert.ok(trainDeal, 'Train deal entry must exist');
// Ensure deal does not claim "Manali Railway Station" or "Train to Manali"
assert.ok(!trainDeal.route.to.toLowerCase().includes('manali railway station'), 'Must not claim Manali Railway Station');
assert.ok(trainDeal.route.to.includes('Chandigarh') || trainDeal.route.to.includes('Kalka'), 'Arrival point must be Chandigarh / Kalka');
assert.ok(trainDeal.bookingUrl.includes('irctc.co.in'), 'Booking URL must be official IRCTC');
assert.ok(!trainDeal.bookingUrl.includes('manali'), 'IRCTC query must not search for station "manali"');
assert.ok(trainDeal.termsAndConditions.includes('actual operational railhead') || trainDeal.features.some(f => f.includes('Official IRCTC Booking Portal Link')), 'Must state that booking link is an action link for operational railhead');
console.log('✅ Passed: Train deal for Manali uses Chandigarh railhead, proper IRCTC query, and action link disclaimer.\n');

console.log('====================================================');
console.log('ALL 6 CONCODE FEASIBILITY TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
