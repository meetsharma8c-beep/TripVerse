import { 
  ExpenseItem, 
  ExpenseSplitSummary, 
  SettlementTransaction, 
  VehicleType, 
  VehicleConfig, 
  VehicleFuelCalcResult,
  Trip 
} from '../types/trip';

export const VEHICLE_CONFIGS: Record<VehicleType, VehicleConfig> = {
  petrol_hatchback: {
    type: 'petrol_hatchback',
    label: 'Petrol Hatchback / Sedan',
    icon: 'Car',
    defaultMileage: 16,
    fuelRate: 96.72,
    fuelUnit: '₹/L'
  },
  diesel_suv: {
    type: 'diesel_suv',
    label: 'Diesel SUV / MUV',
    icon: 'Truck',
    defaultMileage: 14,
    fuelRate: 89.62,
    fuelUnit: '₹/L'
  },
  ev: {
    type: 'ev',
    label: 'Electric Vehicle (EV)',
    icon: 'Zap',
    defaultMileage: 6.5, // km per kWh
    fuelRate: 18.5, // ₹ per kWh fast-charge average
    fuelUnit: '₹/kWh'
  },
  bike: {
    type: 'bike',
    label: 'Cruiser / Touring Bike',
    icon: 'Bike',
    defaultMileage: 35,
    fuelRate: 96.72,
    fuelUnit: '₹/L'
  }
};

export function calculateFuelAndTolls(
  distanceKm: number,
  vehicleType: VehicleType,
  travelersCount: number = 3,
  customMileage?: number,
  customFuelRate?: number
): VehicleFuelCalcResult {
  const config = VEHICLE_CONFIGS[vehicleType] || VEHICLE_CONFIGS.petrol_hatchback;
  const mileage = customMileage && customMileage > 0 ? customMileage : config.defaultMileage;
  const fuelRate = customFuelRate && customFuelRate > 0 ? customFuelRate : config.fuelRate;

  // Round trip or total distance
  const fuelNeeded = Math.round((distanceKm / mileage) * 10) / 10;
  const estimatedFuelCost = Math.round(fuelNeeded * fuelRate);

  // Toll estimation on Indian National Highways: approx ₹140 - ₹180 per 100 km
  let tollRatePer100Km = 160;
  if (vehicleType === 'bike') {
    tollRatePer100Km = 0; // Bikes exempt from most NHAI tolls in India
  } else if (vehicleType === 'diesel_suv') {
    tollRatePer100Km = 175;
  }

  const estimatedTollCost = Math.round((distanceKm / 100) * tollRatePer100Km);
  const totalTransitCost = estimatedFuelCost + estimatedTollCost;
  const costPerPerson = Math.round(totalTransitCost / Math.max(1, travelersCount));

  return {
    vehicleType,
    totalDistanceKm: distanceKm,
    mileage,
    fuelRate,
    fuelNeeded,
    estimatedFuelCost,
    estimatedTollCost,
    totalTransitCost,
    costPerPerson
  };
}

export function computeExpenseSplitSummary(
  expenses: ExpenseItem[], 
  travelers: string[], 
  plannedBudget: number = 10000
): ExpenseSplitSummary {
  const balances: Record<string, number> = {};
  
  // Initialize all travelers with 0 balance
  travelers.forEach(name => {
    balances[name] = 0;
  });

  let totalSpent = 0;

  for (const exp of expenses) {
    totalSpent += exp.amount;
    const splitCount = exp.splitAmong.length > 0 ? exp.splitAmong.length : travelers.length;
    const splitAmount = exp.amount / splitCount;

    // Credit payer
    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;

    // Debit each person sharing
    const members = exp.splitAmong.length > 0 ? exp.splitAmong : travelers;
    for (const member of members) {
      balances[member] = (balances[member] || 0) - splitAmount;
    }
  }

  // Round balances to 2 decimal places
  for (const person in balances) {
    balances[person] = Math.round(balances[person]);
  }

  // Calculate settlement transactions using greedy two-pointer algorithm
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  for (const [name, net] of Object.entries(balances)) {
    if (net < -1) {
      debtors.push({ name, amount: -net });
    } else if (net > 1) {
      creditors.push({ name, amount: net });
    }
  }

  const settlements: SettlementTransaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 1) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(settleAmount)
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount <= 1) i++;
    if (creditor.amount <= 1) j++;
  }

  return {
    totalSpent,
    plannedBudget,
    perPersonBalances: balances,
    settlements
  };
}

export function generateWhatsAppSettlementSummary(
  tripName: string,
  summary: ExpenseSplitSummary,
  expenses: ExpenseItem[]
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  let text = `*TripVerse Expense Settlement: ${tripName}*\n`;
  text += `Date: ${dateStr}\n`;
  text += `*Total Spent:* ₹${summary.totalSpent.toLocaleString('en-IN')} (Budget: ₹${summary.plannedBudget.toLocaleString('en-IN')})\n`;
  text += `\n*Who Owes Whom:*\n`;

  if (summary.settlements.length === 0) {
    text += `All expenses are completely settled! No outstanding balances.\n`;
  } else {
    summary.settlements.forEach((s, idx) => {
      text += `${idx + 1}. *${s.from}* pays *${s.to}*: ₹${s.amount.toLocaleString('en-IN')}\n`;
    });
  }

  text += `\n*Individual Net Balances:*\n`;
  for (const [person, bal] of Object.entries(summary.perPersonBalances)) {
    if (bal > 0) {
      text += `• ${person}: receives +₹${bal.toLocaleString('en-IN')}\n`;
    } else if (bal < 0) {
      text += `• ${person}: owes -₹${Math.abs(bal).toLocaleString('en-IN')}\n`;
    } else {
      text += `• ${person}: settled (₹0)\n`;
    }
  }

  text += `\n*Recent Expenses Logged (${expenses.length}):*\n`;
  expenses.slice(0, 6).forEach(e => {
    text += `• ${e.title}: ₹${e.amount.toLocaleString('en-IN')} (Paid by ${e.paidBy})\n`;
  });

  text += `\n_Generated automatically via TripVerse Journey AI_`;
  return text;
}

export function generateDefaultTripExpenses(_trip: Trip): ExpenseItem[] {
  // NO MOCK DATA: Fresh trips begin with 0 recorded expenses until entered by the user
  return [];
}

