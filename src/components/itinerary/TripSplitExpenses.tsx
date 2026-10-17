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
import { triggerHaptic } from '../../services/deviceService';
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
  Bike
} from 'lucide-react';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { UpiPaymentModal } from './UpiPaymentModal';

interface TripSplitExpensesProps {
  trip: Trip;
}

export function TripSplitExpenses({ trip }: TripSplitExpensesProps) {
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

  useEffect(() => {
    if (trip.collaboration?.collaborators && trip.collaboration.collaborators.length > 0) {
      const names = trip.collaboration.collaborators.map(c => c.name);
      setTravelers(names);
      setSplitAmong(prev => {
        const filtered = prev.filter(p => names.includes(p));
        return filtered.length > 0 ? filtered : names;
      });
    }
  }, [trip.collaboration]);

  // New Expense Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidBy, setPaidBy] = useState(travelers[0]);
  const [splitAmong, setSplitAmong] = useState<string[]>(travelers);

  // Fuel & Toll Calculator State
  const [vehicleType, setVehicleType] = useState<VehicleType>('petrol_hatchback');
  const [tripDistanceKm, setTripDistanceKm] = useState(
    trip.itinerary.reduce((acc, d) => acc + d.activities.reduce((s, a) => s + (a.distanceKm || 0), 0), 0) * 2 || 680
  );
  const [customMileage, setCustomMileage] = useState<number>(VEHICLE_CONFIGS.petrol_hatchback.defaultMileage);

  // Load expenses strictly from stored real data
  useEffect(() => {
    const saved = loadTripExpenses(trip.id);
    if (saved && saved.length > 0) {
      setExpenses(saved);
    } else {
      setExpenses([]);
    }
  }, [trip.id]);

  // Compute split summary
  const summary = computeExpenseSplitSummary(expenses, travelers, trip.totalBudget);
  const fuelResult = calculateFuelAndTolls(tripDistanceKm, vehicleType, travelers.length, customMileage);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      tripId: trip.id,
      title: title.trim(),
      amount: Math.round(parsedAmount),
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

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppSettlementSummary(trip.name, summary, expenses);
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedWhatsApp(false), 2500);

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {}
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
            <span className="badge-caps text-[#5A7362]">Total Spent</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-[#152A1C]">
              {formatCurrency(summary.totalSpent, currency)}
            </div>
            <div className="text-xs font-semibold text-[#5A7362] mt-1">
              Planned Budget: {formatCurrency(summary.plannedBudget, currency)}
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
            <span className="badge-caps text-[#5A7362]">Cost Per Traveler</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-[#152A1C]">
              {formatCurrency(Math.round(summary.totalSpent / travelers.length), currency)}
            </div>
            <div className="text-xs font-semibold text-[#5A7362] mt-1">
              Split across {travelers.length} companions
            </div>
          </div>
          <div className="mt-3 text-xs font-bold text-[#5A7362]">
            {expenses.length} individual bills logged
          </div>
        </div>

        {/* Card 3: Settlements Action */}
        <div className="bg-gradient-to-br from-[#152A1C] to-[#1E3E2B] text-white rounded-3xl p-5 border border-[#2D5A3D]/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="badge-caps text-[#A8C7A5]">Who Owes Whom</span>
            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
              {summary.settlements.length} Settlements
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-emerald-300">
              {summary.settlements.length === 0 ? 'All Settled' : `${summary.settlements.length} Pending`}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {summary.settlements.length === 0 ? 'Everyone is squared away' : 'Ready to clear balances'}
            </div>
          </div>
          <button
            onClick={handleCopyWhatsApp}
            className="mt-3 w-full py-2 px-3 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied Settlement Report!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp Summary</span>
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
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">Group Ledger</span>
              <h3 className="text-xl font-bold text-[#152A1C]">Trip Expenses</h3>
            </div>

            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="px-4 py-2 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>

          {/* Add Expense Drawer/Form Modal */}
          {isAddExpenseOpen && (
            <div className="bg-white rounded-3xl p-6 border border-[#2D5A3D]/30 shadow-xl mt-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2EBE1]">
                <div className="flex items-center gap-2 font-bold text-[#152A1C]">
                  <Plus className="w-4 h-4 text-[#2D5A3D]" />
                  <span>Log Group Expense</span>
                </div>
                <button
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="text-xs font-semibold text-slate-400 hover:text-[#152A1C]"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="mt-4 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Expense Title</label>
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
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Amount ({currency})</label>
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
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="food">Food & Dining</option>
                    <option value="fuel">Fuel & Charging</option>
                    <option value="toll">Highway Tolls</option>
                    <option value="stay">Hotel & Homestay</option>
                    <option value="activity">Activities & Tickets</option>
                    <option value="shopping">Shopping & Souvenirs</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Paid By</label>
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
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Split Equally Among:</label>
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white text-xs font-bold"
                  >
                    Save Expense
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
                <h4 className="text-sm font-bold text-slate-800">No expenses recorded yet</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Add your first real expense to track budget consumption, fuel, dining, and split settlements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trip-gradient text-white font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Expense</span>
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
                      <span>Paid by <strong className="text-slate-700">{exp.paidBy}</strong></span>
                      <span>•</span>
                      <span>Split with {exp.splitAmong.join(', ')}</span>
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
                      {formatCurrency(Math.round(exp.amount / exp.splitAmong.length), currency)} / person
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
            <span className="badge-caps text-[#2D5A3D]">Net Balance Sheet</span>
            <h4 className="text-base font-bold text-[#152A1C] mt-0.5 font-display">Traveler Standing</h4>

            <div className="mt-4 space-y-3">
              {Object.entries(summary.perPersonBalances).map(([name, bal]) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 gap-2">
                  <span className="text-xs font-bold text-slate-700 truncate">{name}</span>
                  <span className={`text-xs font-black shrink-0 font-display ${
                    bal > 0 ? 'text-[#2D5A3D]' : bal < 0 ? 'text-rose-600' : 'text-slate-400'
                  }`}>
                    {bal > 0 ? `+${formatCurrency(bal, currency)} (receives)` : bal < 0 ? `-${formatCurrency(Math.abs(bal), currency)} (owes)` : `Settled (${formatCurrency(0, currency)})`}
                  </span>
                </div>
              ))}
            </div>

            {/* Settlement Steps */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-2.5">Suggested Settlements:</span>
              {summary.settlements.length === 0 ? (
                <div className="text-xs font-semibold text-[#2D5A3D] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Everyone is even!</span>
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
                          <span>Settlement details</span>
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

      {/* 3. HIGHWAY FUEL & TOLL CALCULATOR */}
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

      {/* Suggested amount only; TripVerse does not initiate or verify payments. */}
      {upiModalData && (
        <UpiPaymentModal
          isOpen={upiModalData.isOpen}
          onClose={() => setUpiModalData(null)}
          fromUser={upiModalData.fromUser}
          toUser={upiModalData.toUser}
          amount={upiModalData.amount}
          currency={currency}
        />
      )}

    </div>
  );
}
