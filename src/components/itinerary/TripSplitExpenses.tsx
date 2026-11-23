import React, { useState, useEffect } from 'react';
import { 
  Trip, 
  ExpenseItem, 
  ExpenseCategory, 
  VehicleType 
} from '../../types/trip';
import { 
  loadTripExpenses, 
  saveTripExpenses 
} from '../../services/storageService';
import { 
  computeExpenseSplitSummary, 
  generateWhatsAppSettlementSummary,
  calculateFuelAndTolls,
  VEHICLE_CONFIGS 
} from '../../services/expenseService';
import { triggerHaptic, copyTextToClipboard } from '../../services/deviceService';
import confetti from 'canvas-confetti';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Share2, 
  Check, 
  ArrowRight, 
  Fuel, 
  Car, 
  Zap, 
  Users, 
  CheckCircle2,
  Utensils,
  Hotel,
  Route,
  Ticket,
  ShoppingBag,
  Receipt,
  Bike,
  Plane,
  Train
} from 'lucide-react';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { UpiPaymentModal } from './UpiPaymentModal';
import { useLanguage } from '../../services/languageService';

interface TripSplitExpensesProps {
  trip: Trip;
}

export function TripSplitExpenses({ trip }: TripSplitExpensesProps) {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());
  const [upiModalData, setUpiModalData] = useState<{
    isOpen: boolean;
    fromUser: string;
    toUser: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  // Group members (real collaborators or trip travelers count)
  const [travelers, setTravelers] = useState<string[]>(() => {
    if (trip.collaboration?.collaborators && trip.collaboration.collaborators.length > 0) {
      return trip.collaboration.collaborators.map(c => c.name);
    }
    if (trip.travelersCount <= 1) {
      return ['You'];
    }
    return ['You', ...Array.from({ length: trip.travelersCount - 1 }, (_, i) => `Traveler ${i + 2}`)];
  });

  // New Expense Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidBy, setPaidBy] = useState(travelers[0]);
  const [splitAmong, setSplitAmong] = useState<string[]>(travelers);

  // Synchronize group members and trip parameters when active trip or collaborators change
  useEffect(() => {
    const members = (trip.collaboration?.collaborators && trip.collaboration.collaborators.length > 0)
      ? trip.collaboration.collaborators.map(c => c.name)
      : (trip.travelersCount <= 1 ? ['You'] : ['You', ...Array.from({ length: Math.max(1, trip.travelersCount - 1) }, (_, i) => `Traveler ${i + 2}`)]);
    
    setTravelers(members);
    setPaidBy(prev => members.includes(prev) ? prev : (members[0] || 'You'));
    setSplitAmong(prev => {
      const filtered = prev.filter(p => members.includes(p));
      return filtered.length > 0 ? filtered : members;
    });

    const routeRoundTripDist = trip.routeDetails?.distanceKm
      ? Math.round(trip.routeDetails.distanceKm * 2)
      : 0;
    const calculatedDist = (trip.itinerary || []).reduce((acc, d) => acc + (d.activities || []).reduce((s, a) => s + (a.distanceKm || 0), 0), 0) * 2;
    setTripDistanceKm(routeRoundTripDist || calculatedDist || 680);
  }, [trip.id, trip.travelersCount, trip.collaboration, trip.itinerary, trip.routeDetails]);

  // Fuel & Toll Calculator State
  const [vehicleType, setVehicleType] = useState<VehicleType>('petrol_hatchback');
  const [tripDistanceKm, setTripDistanceKm] = useState(() => {
    const routeRoundTripDist = trip.routeDetails?.distanceKm
      ? Math.round(trip.routeDetails.distanceKm * 2)
      : 0;
    const localDist = (trip.itinerary || []).reduce((acc, d) => acc + (d.activities || []).reduce((s, a) => s + (a.distanceKm || 0), 0), 0) * 2;
    return routeRoundTripDist || localDist || 680;
  });
  const [customMileage, setCustomMileage] = useState<number>(VEHICLE_CONFIGS.petrol_hatchback.defaultMileage);

  // Load expenses strictly from stored real data and stay synced with AI Assistant additions
  useEffect(() => {
    const refreshExpenses = () => {
      const saved = loadTripExpenses(trip.id);
      setExpenses(saved && saved.length > 0 ? saved : []);
    };
    refreshExpenses();
    window.addEventListener('tripverse_expenses_updated', refreshExpenses);
    return () => window.removeEventListener('tripverse_expenses_updated', refreshExpenses);
  }, [trip.id]);

  // Compute split summary
  const summary = computeExpenseSplitSummary(expenses, travelers, trip.totalBudget);
  const fuelResult = calculateFuelAndTolls(tripDistanceKm, vehicleType, travelers.length, customMileage);

  // Flight & Train Mode Economics
  const isFlight = trip.transportMode === 'flight';
  const isTrain = trip.transportMode === 'train';
  const destCountry = (trip.destinationDetails?.country || '').trim().toLowerCase();
  const isInternational =
    (destCountry.length > 0 && destCountry !== 'india') ||
    /tokyo|japan|paris|france|london|uk|bali|indonesia|singapore|dubai|uae|maldives|bangkok|thailand|new york|new jersey|usa|united states|canada|switzerland|rome|italy|spain|barcelona|greece|santorini|australia|sydney|germany|vietnam|sri lanka|nepal|bhutan|qatar|doha|turkey|istanbul|egypt|south korea|seoul/i.test(
      `${trip.destination} ${trip.name}`
    );

  // Flight Splitter State
  const [flightClass, setFlightClass] = useState<'economy' | 'premium' | 'business'>('economy');
  const [airfarePerPerson, setAirfarePerPerson] = useState<number>(isInternational ? 38000 : 6500);
  const [hasBaggageAddon, setHasBaggageAddon] = useState<boolean>(isInternational);
  const [airportTransferTotal, setAirportTransferTotal] = useState<number>(isInternational ? 3500 : 1500);

  useEffect(() => {
    setAirfarePerPerson(isInternational ? 38000 : 6500);
    setHasBaggageAddon(isInternational);
    setAirportTransferTotal(isInternational ? 3500 : 1500);
  }, [trip.id, isInternational]);

  // Train Splitter State
  const [trainClass, setTrainClass] = useState<'sleeper' | 'ac3' | 'ac2' | 'ac1'>('ac3');
  const [trainFarePerPerson, setTrainFarePerPerson] = useState<number>(1450);
  const [stationTransferTotal, setStationTransferTotal] = useState<number>(600);

  // Computed transit splits
  const baggageCostPerPerson = hasBaggageAddon ? (isInternational ? 3200 : 1200) : 0;
  const flightTransferPerPerson = Math.round(airportTransferTotal / Math.max(1, travelers.length));
  const flightTotalPerPerson = airfarePerPerson + baggageCostPerPerson + flightTransferPerPerson;
  const flightTotalGroup = flightTotalPerPerson * travelers.length;

  const trainTransferPerPerson = Math.round(stationTransferTotal / Math.max(1, travelers.length));
  const trainTotalPerPerson = trainFarePerPerson + trainTransferPerPerson;
  const trainTotalGroup = trainTotalPerPerson * travelers.length;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      tripId: trip.id,
      title: title.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      category,
      paidBy,
      splitAmong: splitAmong.length > 0 ? splitAmong : travelers,
      date: `Day ${Math.min(trip.durationDays, Math.ceil(expenses.length / 2) || 1)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveTripExpenses(trip.id, updated);

    setTitle('');
    setAmount('');
    setIsAddExpenseOpen(false);
    triggerHaptic('medium');
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveTripExpenses(trip.id, updated);
    triggerHaptic('light');
  };

  const handleSettleCompleted = (fromUser: string, toUser: string, settleAmount: number) => {
    const newExpense: ExpenseItem = {
      id: `exp-settle-${Date.now()}`,
      tripId: trip.id,
      title: `UPI Settlement: ${fromUser} → ${toUser}`,
      amount: Math.round(settleAmount),
      category: 'other',
      paidBy: fromUser,
      splitAmong: [toUser],
      date: `Day ${trip.durationDays || 1}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveTripExpenses(trip.id, updated);
    setUpiModalData(null);
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppSettlementSummary(trip.name, summary, expenses);
    void copyTextToClipboard(text);
    setCopiedWhatsApp(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedWhatsApp(false), 2500);

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {}
  };

  const toggleSplitMember = (name: string) => {
    if (splitAmong.includes(name)) {
      if (splitAmong.length > 1) {
        setSplitAmong(splitAmong.filter(n => n !== name));
      }
    } else {
      setSplitAmong([...splitAmong, name]);
    }
  };

  const categoryIcons: Record<ExpenseCategory, React.ComponentType<{ className?: string }>> = {
    fuel: Fuel,
    food: Utensils,
    stay: Hotel,
    toll: Route,
    activity: Ticket,
    shopping: ShoppingBag,
    other: Receipt
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Total Spent */}
        <div className="bg-white rounded-3xl p-5 border border-[#E2EBE1] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="badge-caps text-[#5A7362]">{t('Total Spent')}</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-[#152A1C]">
              {formatCurrency(summary.totalSpent, currency)}
            </div>
            <div className="text-xs font-semibold text-[#5A7362] mt-1">
              {t('Planned Budget')}: {formatCurrency(summary.plannedBudget, currency)}
            </div>
          </div>
          <div className="mt-3 w-full bg-[#EAF0E9] h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                summary.totalSpent > summary.plannedBudget ? 'bg-rose-500' : 'bg-[#2D5A3D]'
              }`}
              style={{ width: `${Math.min(100, (summary.totalSpent / summary.plannedBudget) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Per Person Average */}
        <div className="bg-white rounded-3xl p-5 border border-[#E2EBE1] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="badge-caps text-[#5A7362]">{t('Cost Per Traveler')}</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-[#152A1C]">
              {formatCurrency(Math.round(summary.totalSpent / travelers.length), currency)}
            </div>
            <div className="text-xs font-semibold text-[#5A7362] mt-1">
              {t('Split across')} {travelers.length} {t('companions')}
            </div>
          </div>
          <div className="mt-3 text-xs font-bold text-[#5A7362]">
            {expenses.length} {t('individual bills logged')}
          </div>
        </div>

        {/* Card 3: Settlements Action */}
        <div className="bg-gradient-to-br from-[#152A1C] to-[#1E3E2B] text-white rounded-3xl p-5 border border-[#2D5A3D]/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="badge-caps text-[#A8C7A5]">{t('Who Owes Whom')}</span>
            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
              {summary.settlements.length} {t('Settlements')}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-emerald-300">
              {summary.settlements.length === 0 ? t('All Settled') : `${summary.settlements.length} ${t('Pending')}`}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {summary.settlements.length === 0 ? t('Everyone is squared away') : t('Ready to clear balances')}
            </div>
          </div>
          <button
            onClick={handleCopyWhatsApp}
            className="mt-3 w-full py-2 px-3 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t('Copied Settlement Report!')}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>{t('Share WhatsApp Summary')}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Main Grid: Expenses List + Settlements & Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Expenses Ledger */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-7 border border-[#E2EBE1] shadow-xs">
          <div className="flex items-center justify-between gap-4 border-b border-[#E2EBE1] pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('Group Ledger')}</span>
              <h3 className="text-xl font-bold text-[#152A1C]">{t('Trip Expenses')}</h3>
            </div>

            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="px-4 py-2 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('Add Expense')}</span>
            </button>
          </div>

          {/* Add Expense Drawer/Form Modal */}
          {isAddExpenseOpen && (
            <div className="bg-white rounded-3xl p-6 border border-[#2D5A3D]/30 shadow-xl mt-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2EBE1]">
                <div className="flex items-center gap-2 font-bold text-[#152A1C]">
                  <Plus className="w-4 h-4 text-[#2D5A3D]" />
                  <span>{t('Log Group Expense')}</span>
                </div>
                <button
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="text-xs font-semibold text-slate-400 hover:text-[#152A1C]"
                >
                  {t('Cancel')}
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="mt-4 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Expense Title')}</label>
                    <input
                      type="text"
                      placeholder="e.g., Highway Dhaba Dinner, Toll Plaza, Jeep Safari"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Amount')} ({currency})</label>
                    <input
                      type="number"
                      placeholder="e.g., 1450"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Category')}</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="food">{t('Food & Dining')}</option>
                    <option value="fuel">{t('Fuel & Charging')}</option>
                    <option value="toll">{t('Highway Tolls')}</option>
                    <option value="stay">{t('Hotel & Homestay')}</option>
                    <option value="activity">{t('Activities & Tickets')}</option>
                    <option value="shopping">{t('Shopping & Souvenirs')}</option>
                    <option value="other">{t('Other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Paid By')}</label>
                  <select
                    value={paidBy}
                    onChange={e => setPaidBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                  >
                    {travelers.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Split With Checkboxes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Split Equally Among:')}</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {travelers.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleSplitMember(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          splitAmong.includes(t)
                            ? 'bg-[#2D5A3D] text-white shadow-xs'
                            : 'bg-white text-[#5A7362] border border-[#E2EBE1] hover:bg-[#EAF0E9]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white text-xs font-bold"
                  >
                    {t('Save Expense')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Expense Entries */}
          {expenses.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 p-6 my-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#2D5A3D] flex items-center justify-center mx-auto border border-emerald-100">
                <Receipt className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">{t('No expenses recorded yet')}</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {t('Add your first real expense to track budget consumption, fuel, dining, and split settlements.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trip-gradient text-white font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('Add First Expense')}</span>
              </button>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {expenses.map(exp => (

              <div key={exp.id} className="py-3.5 flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    {React.createElement(categoryIcons[exp.category] || Receipt, { className: 'w-4 h-4 text-slate-600' })}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                      {exp.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{t('Paid by')} <strong className="text-slate-700">{exp.paidBy}</strong></span>
                      <span>•</span>
                      <span>{t('Split with')} {exp.splitAmong.join(', ')}</span>
                      <span>•</span>
                      <span className="text-slate-400">{exp.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-black text-[#152A1C] font-display">
                      {formatCurrency(exp.amount, currency)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatCurrency(Math.round(exp.amount / exp.splitAmong.length), currency)} / {t('person')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}

        </div>

        {/* Right 1 Col: Settlement Matrix & Balances */}
        <div className="space-y-6">
          
          {/* Individual Balances */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E2EBE1] shadow-xs">
            <span className="badge-caps text-[#2D5A3D]">{t('Net Balance Sheet')}</span>
            <h4 className="text-base font-bold text-[#152A1C] mt-0.5 font-display">{t('Traveler Standing')}</h4>

            <div className="mt-4 space-y-3">
              {Object.entries(summary.perPersonBalances).map(([name, bal]) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 gap-2">
                  <span className="text-xs font-bold text-slate-700 truncate">{name}</span>
                  <span className={`text-xs font-black shrink-0 font-display ${
                    bal > 0 ? 'text-[#2D5A3D]' : bal < 0 ? 'text-rose-600' : 'text-slate-400'
                  }`}>
                    {bal > 0 ? `+${formatCurrency(bal, currency)} (${t('receives')})` : bal < 0 ? `-${formatCurrency(Math.abs(bal), currency)} (${t('owes')})` : `${t('Settled')} (${formatCurrency(0, currency)})`}
                  </span>
                </div>
              ))}
            </div>

            {/* Settlement Steps */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-2.5">{t('Suggested Settlements:')}</span>
              {summary.settlements.length === 0 ? (
                <div className="text-xs font-semibold text-[#2D5A3D] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('Everyone is even!')}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {summary.settlements.map((s, idx) => (
                    <div key={idx} className="text-xs font-medium text-slate-600 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                        <strong className="text-slate-800 truncate">{s.from}</strong>
                        <ArrowRight className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                        <strong className="text-slate-800 truncate">{s.to}</strong>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-[#2D5A3D] font-display">{formatCurrency(s.amount, currency)}</span>
                        <button
                          type="button"
                          onClick={() => setUpiModalData({
                            isOpen: true,
                            fromUser: s.from,
                            toUser: s.to,
                            amount: s.amount
                          })}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-[10px] transition-all active:scale-95 cursor-pointer shadow-xs"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>{t('Settlement details')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 3. TRANSIT ECONOMICS: MODE-ADAPTIVE CALCULATOR */}
      {isFlight ? (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-caps text-[#2D5A3D]">Aviation Transit Engine</span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">Live Airfare & Baggage Splitter</span>
              </div>
              <h3 className="text-xl font-bold font-display text-[#152A1C] mt-0.5">
                Flight Fare & Baggage Cost Splitter
              </h3>
            </div>

            <span className="text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-200 self-start sm:self-auto font-display flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5" />
              {isInternational ? 'International Flight Corridor' : 'Domestic Air Corridor'}
            </span>
          </div>

          {/* Cabin Class Selection Chips */}
          <div className="mt-5">
            <label className="block text-xs font-bold text-[#152A1C] mb-2">Select Cabin Class:</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'economy', label: 'Economy', mult: 1, desc: 'Standard carry-on' },
                { id: 'premium', label: 'Premium Economy', mult: 1.45, desc: 'Extra legroom + bag' },
                { id: 'business', label: 'Business Class', mult: 2.8, desc: 'Priority + lounge' }
              ].map(c => {
                const isSelected = flightClass === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setFlightClass(c.id as any);
                      const base = isInternational ? 38000 : 6500;
                      setAirfarePerPerson(Math.round(base * c.mult));
                      triggerHaptic('light');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-md scale-[1.02]'
                        : 'bg-[#F4F6F2] text-[#152A1C] border-[#E2EBE1] hover:bg-[#EAF0E9]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Plane className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold opacity-80">{c.id.toUpperCase()}</span>
                    </div>
                    <div className="text-xs font-bold mt-2 truncate">{c.label}</div>
                    <div className="text-[11px] opacity-70 mt-0.5">{c.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Airfare & Airport Transfer Sliders */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#152A1C] mb-1">
                <span>Base Airfare per Passenger</span>
                <span className="text-[#2D5A3D] font-display">{formatCurrency(airfarePerPerson, currency)}</span>
              </div>
              <input
                type="range"
                min={isInternational ? 15000 : 2500}
                max={isInternational ? 120000 : 25000}
                step={isInternational ? 1000 : 250}
                value={airfarePerPerson}
                onChange={e => setAirfarePerPerson(parseInt(e.target.value))}
                className="w-full accent-[#2D5A3D] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#152A1C] mb-1">
                <span>Airport Express / Cab Transfer (Group Pool)</span>
                <span className="text-[#2D5A3D] font-display">{formatCurrency(airportTransferTotal, currency)}</span>
              </div>
              <input
                type="range"
                min="500"
                max={isInternational ? 10000 : 4000}
                step="250"
                value={airportTransferTotal}
                onChange={e => setAirportTransferTotal(parseInt(e.target.value))}
                className="w-full accent-[#2D5A3D] cursor-pointer"
              />
            </div>
          </div>

          {/* Baggage Check-in Add-on */}
          <div className="mt-4 flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-slate-600" />
              <div>
                <div className="text-xs font-bold text-[#152A1C]">Checked Baggage Allowance (23kg standard)</div>
                <div className="text-[11px] text-slate-500">Includes airline standard check-in pieces</div>
              </div>
            </div>
            <button
              onClick={() => {
                setHasBaggageAddon(!hasBaggageAddon);
                triggerHaptic('light');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                hasBaggageAddon
                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {hasBaggageAddon ? `Included (+${formatCurrency(isInternational ? 3200 : 1200, currency)}/pax)` : 'Add Baggage'}
            </button>
          </div>

          {/* Flight Output Strip */}
          <div className="mt-6 p-4 rounded-2xl bg-sky-50/60 border border-sky-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#3B6680]">Airfare Subtotal</div>
              <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
                {formatCurrency(airfarePerPerson * travelers.length, currency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">for {travelers.length} tickets</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#3B6680]">Baggage & Addons</div>
              <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
                {formatCurrency(baggageCostPerPerson * travelers.length, currency)}
              </div>
              <div className="text-[10px] text-sky-700 font-semibold mt-0.5">{hasBaggageAddon ? 'Full Baggage' : 'Cabin Only'}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#3B6680]">Airport Express Pool</div>
              <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
                {formatCurrency(airportTransferTotal, currency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Roundtrip city link</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#2D5A3D]">Split Per Traveler</div>
              <div className="text-lg font-black text-[#2D5A3D] mt-0.5 font-display">
                {formatCurrency(flightTotalPerPerson, currency)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">for {travelers.length} companions</div>
            </div>
          </div>
        </div>
      ) : isTrain ? (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-caps text-[#2D5A3D]">Rail Transit Engine</span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">Live Railway & Transfer Estimates</span>
              </div>
              <h3 className="text-xl font-bold font-display text-[#152A1C] mt-0.5">
                Rail Fare & Station Transit Splitter
              </h3>
            </div>

            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 self-start sm:self-auto font-display flex items-center gap-1.5">
              <Train className="w-3.5 h-3.5" />
              Railway Network
            </span>
          </div>

          {/* Coach Class Selection */}
          <div className="mt-5">
            <label className="block text-xs font-bold text-[#152A1C] mb-2">Select Coach Class:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'sleeper', label: 'Sleeper Class (SL)', fare: 520 },
                { id: 'ac3', label: '3rd AC (3A)', fare: 1450 },
                { id: 'ac2', label: '2nd AC (2A)', fare: 2150 },
                { id: 'ac1', label: '1st AC / Vande Bharat', fare: 3100 }
              ].map(c => {
                const isSelected = trainClass === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setTrainClass(c.id as any);
                      setTrainFarePerPerson(c.fare);
                      triggerHaptic('light');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-md scale-[1.02]'
                        : 'bg-[#F4F6F2] text-[#152A1C] border-[#E2EBE1] hover:bg-[#EAF0E9]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Train className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold opacity-80">{c.id.toUpperCase()}</span>
                    </div>
                    <div className="text-xs font-bold mt-2 truncate">{c.label}</div>
                    <div className="text-[11px] opacity-70 mt-0.5">~{formatCurrency(c.fare, currency)}/seat</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rail Fare & Station Transfer Sliders */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#152A1C] mb-1">
                <span>Rail Ticket per Passenger</span>
                <span className="text-[#2D5A3D] font-display">{formatCurrency(trainFarePerPerson, currency)}</span>
              </div>
              <input
                type="range"
                min="300"
                max="6000"
                step="50"
                value={trainFarePerPerson}
                onChange={e => setTrainFarePerPerson(parseInt(e.target.value))}
                className="w-full accent-[#2D5A3D] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#152A1C] mb-1">
                <span>Station Auto / Cab Connectivity Pool</span>
                <span className="text-[#2D5A3D] font-display">{formatCurrency(stationTransferTotal, currency)}</span>
              </div>
              <input
                type="range"
                min="200"
                max="2500"
                step="50"
                value={stationTransferTotal}
                onChange={e => setStationTransferTotal(parseInt(e.target.value))}
                className="w-full accent-[#2D5A3D] cursor-pointer"
              />
            </div>
          </div>

          {/* Train Output Strip */}
          <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#7A6129]">Train Fares Subtotal</div>
              <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
                {formatCurrency(trainFarePerPerson * travelers.length, currency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">for {travelers.length} tickets</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#7A6129]">Reservation Fees</div>
              <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
                {formatCurrency(60 * travelers.length, currency)}
              </div>
              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">IRCTC / Portal Fee</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#7A6129]">Station Cab Pool</div>
              <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
                {formatCurrency(stationTransferTotal, currency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Both ends combined</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#2D5A3D]">Split Per Traveler</div>
              <div className="text-lg font-black text-[#2D5A3D] mt-0.5 font-display">
                {formatCurrency(trainTotalPerPerson, currency)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">for {travelers.length} companions</div>
            </div>
          </div>
        </div>
      ) : (
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge-caps text-[#2D5A3D]">Highway Transit Engine</span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">Live Indian Toll & Fuel Estimates</span>
            </div>
            <h3 className="text-xl font-bold font-display text-[#152A1C] mt-0.5">
              Fuel & FASTag Toll Calculator
            </h3>
          </div>

          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto font-display">
            {tripDistanceKm} km Roadtrip Est.
          </span>
        </div>

        {/* Vehicle Selection Chips */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-[#152A1C] mb-2">Select Your Vehicle Class:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(VEHICLE_CONFIGS) as VehicleType[]).map(vKey => {
              const cfg = VEHICLE_CONFIGS[vKey];
              const isSelected = vehicleType === vKey;

              return (
                <button
                  key={vKey}
                  onClick={() => {
                    setVehicleType(vKey);
                    setCustomMileage(cfg.defaultMileage);
                    triggerHaptic('light');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-md scale-[1.02]'
                      : 'bg-[#F4F6F2] text-[#152A1C] border-[#E2EBE1] hover:bg-[#EAF0E9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-black/10 flex items-center justify-center">
                      {vKey === 'petrol_hatchback' || vKey === 'diesel_suv' ? (
                        <Car className="w-3.5 h-3.5" />
                      ) : vKey === 'ev' ? (
                        <Zap className="w-3.5 h-3.5" />
                      ) : (
                        <Bike className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className="text-[10px] font-bold opacity-80">{cfg.fuelUnit}</span>
                  </div>
                  <div className="text-xs font-bold mt-2 truncate">{cfg.label}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">~{cfg.defaultMileage} km/unit</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Distance and Mileage Sliders */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#152A1C] mb-1">
              <span>Total Route Distance</span>
              <span className="text-[#2D5A3D] font-display">{tripDistanceKm} km</span>
            </div>
            <input
              type="range"
              min="100"
              max="2500"
              step="20"
              value={tripDistanceKm}
              onChange={e => setTripDistanceKm(parseInt(e.target.value))}
              className="w-full accent-[#2D5A3D] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#152A1C] mb-1">
              <span>Vehicle Mileage / Efficiency</span>
              <span className="text-[#2D5A3D] font-display">{customMileage} km/{VEHICLE_CONFIGS[vehicleType].fuelUnit.replace('₹/', '')}</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={customMileage}
              onChange={e => setCustomMileage(parseInt(e.target.value))}
              className="w-full accent-[#2D5A3D] cursor-pointer"
            />
          </div>
        </div>

        {/* Fuel & Toll Output Strip */}
        <div className="mt-6 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#5A7362]">Fuel / Energy Needed</div>
            <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
              {fuelResult.fuelNeeded} {VEHICLE_CONFIGS[vehicleType].fuelUnit.replace('₹/', '')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">@ {formatCurrency(fuelResult.fuelRate, currency)} / unit</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-[#5A7362]">Estimated Fuel Cost</div>
            <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
              {formatCurrency(fuelResult.estimatedFuelCost, currency)}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Direct Consumption</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-[#5A7362]">Estimated FASTag Tolls</div>
            <div className="text-lg font-black text-[#152A1C] mt-0.5 font-display">
              {formatCurrency(fuelResult.estimatedTollCost, currency)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">NHAI Corridor Avg</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-[#2D5A3D]">Split Per Traveler</div>
            <div className="text-lg font-black text-[#2D5A3D] mt-0.5 font-display">
              {formatCurrency(fuelResult.costPerPerson, currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">for {travelers.length} companions</div>
          </div>
        </div>

      </div>
      )}

      {/* Verified UPI Settlement Gateway */}
      {upiModalData && (
        <UpiPaymentModal
          isOpen={upiModalData.isOpen}
          onClose={() => setUpiModalData(null)}
          fromUser={upiModalData.fromUser}
          toUser={upiModalData.toUser}
          amount={upiModalData.amount}
          currency={currency}
          onSettleCompleted={handleSettleCompleted}
        />
      )}

    </div>
  );
}
