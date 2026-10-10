import React, { useState, useEffect } from 'react';
import { Trip, PackingItem, PackingCategory, WeatherDay, WeatherForecast } from '../../types/trip';
import { getDestinationWeather, fetchLiveDestinationWeather } from '../../services/weatherService';
import { generateSmartPackingList } from '../../services/packingService';
import { loadTripPacking, saveTripPacking } from '../../services/storageService';
import { openExternalUrl, triggerHaptic } from '../../services/deviceService';
import confetti from 'canvas-confetti';
import { 
  Sun, 
  CloudRain, 
  Wind, 
  Droplets, 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  RotateCcw, 
  ShieldAlert, 
  Sparkles,
  Thermometer,
  Share2,
  Copy,
  Check,
  Luggage,
  Compass,
  Umbrella,
  Flame,
  Shirt
} from 'lucide-react';

interface PackingWeatherViewProps {
  trip: Trip;
}

export function PackingWeatherView({ trip }: PackingWeatherViewProps) {
  // Show a clearly marked seasonal estimate until the live forecast request succeeds.
  const [weather, setWeather] = useState<WeatherForecast>(() => 
    getDestinationWeather(trip.destination, trip.durationDays)
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetchLiveDestinationWeather(
      trip.destination,
      trip.durationDays,
      undefined,
      trip.destinationDetails?.coordinates
    ).then((liveWeather) => {
      if (isMounted) {
        setWeather(liveWeather);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [trip.destination, trip.durationDays, trip.destinationDetails?.coordinates]);

  // Packing
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<PackingCategory | 'all'>('all');
  const [newCustomItemName, setNewCustomItemName] = useState('');
  const [newCustomItemCat, setNewCustomItemCat] = useState<PackingCategory>('essentials');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    const saved = loadTripPacking(trip.id);
    if (saved && saved.length > 0) {
      setPackingItems(saved);
    } else {
      const generated = generateSmartPackingList(trip);
      setPackingItems(generated);
      saveTripPacking(trip.id, generated);
    }
  }, [trip.id]);

  const handleToggleItem = (id: string) => {
    triggerHaptic('light');
    const updated = packingItems.map(item => {
      if (item.id === id) {
        return { ...item, isPacked: !item.isPacked };
      }
      return item;
    });
    setPackingItems(updated);
    saveTripPacking(trip.id, updated);

    // Check if everything is packed
    const allPacked = updated.every(i => i.isPacked);
    if (allPacked && updated.length > 0) {
      triggerHaptic('success');
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#386B49', '#2D5A3D', '#38BDF8']
        });
      } catch (e) {}
    }
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomItemName.trim()) return;

    const newItem: PackingItem = {
      id: `custom-${Date.now()}`,
      name: newCustomItemName.trim(),
      category: newCustomItemCat,
      isPacked: false,
      isCustom: true
    };

    const updated = [newItem, ...packingItems];
    setPackingItems(updated);
    saveTripPacking(trip.id, updated);
    setNewCustomItemName('');
    setIsAddingItem(false);
    triggerHaptic('medium');
  };

  const handleDeleteItem = (id: string) => {
    const updated = packingItems.filter(i => i.id !== id);
    setPackingItems(updated);
    saveTripPacking(trip.id, updated);
    triggerHaptic('light');
  };

  const handleResetList = () => {
    if (window.confirm('Reset packing list to default recommendations?')) {
      const fresh = generateSmartPackingList(trip);
      setPackingItems(fresh);
      saveTripPacking(trip.id, fresh);
      triggerHaptic('medium');
    }
  };

  // 1-Tap Seasonal Presets
  const handleApplyPreset = (presetType: 'monsoon' | 'winter' | 'summer' | 'backpacker') => {
    let presetItems: { name: string; category: PackingCategory; note: string }[] = [];

    if (presetType === 'monsoon') {
      presetItems = [
        { name: 'Waterproof Phone Pouch', category: 'essentials', note: 'Monsoon shield' },
        { name: 'Quick-dry Microfiber Towel', category: 'toiletries', note: 'Dries in 20 mins' },
        { name: 'Silica Gel Pouches for Bags', category: 'essentials', note: 'Prevents lens fungus' },
        { name: 'Compact Windproof Rain Poncho', category: 'clothing', note: 'Heavy highway rain' }
      ];
    } else if (presetType === 'winter') {
      presetItems = [
        { name: 'Thermal Base-layer Top & Bottom', category: 'clothing', note: 'For <12°C chilly nights' },
        { name: 'Insulated Hot Water Flask', category: 'essentials', note: 'Keeps tea hot for 12 hrs' },
        { name: 'SPF Lip Balm & Cold Cream', category: 'toiletries', note: 'Prevents mountain chapping' },
        { name: 'Woolen Beanie & Neck Gaiter', category: 'clothing', note: 'Wind protection' }
      ];
    } else if (presetType === 'summer') {
      presetItems = [
        { name: 'Broad Spectrum SPF 50+ Sunscreen', category: 'toiletries', note: 'UV index defense' },
        { name: 'Polarized UV Sunglasses', category: 'essentials', note: 'Highway glare protection' },
        { name: 'Cooling Aloe Vera Gel', category: 'toiletries', note: 'Sunburn relief' },
        { name: 'Electrolyte ORS Sachets (Pack of 5)', category: 'firstaid', note: 'Dehydration prevention' }
      ];
    } else {
      presetItems = [
        { name: '20,000 mAh Fast Powerbank', category: 'electronics', note: '65W PD fast charging' },
        { name: 'Universal Multi-Plug Travel Adapter', category: 'electronics', note: 'Fits all hotel wall sockets' },
        { name: 'Mini TSA Cable Combination Lock', category: 'essentials', note: 'Hostel & car locker safety' },
        { name: 'Emergency Offline Maps Backup', category: 'documents', note: 'Zero network zones' }
      ];
    }

    const newToAdd: PackingItem[] = [];
    presetItems.forEach(p => {
      if (!packingItems.some(i => i.name.toLowerCase() === p.name.toLowerCase())) {
        newToAdd.push({
          id: `preset-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: p.name,
          category: p.category,
          note: p.note,
          isPacked: false,
          isCustom: true
        });
      }
    });

    if (newToAdd.length > 0) {
      const merged = [...newToAdd, ...packingItems];
      setPackingItems(merged);
      saveTripPacking(trip.id, merged);
      triggerHaptic('success');

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#2D5A3D', '#38BDF8', '#F59E0B']
        });
      } catch (e) {}
    }
  };

  // WhatsApp / Share Packing List
  const handleShareList = () => {
    const header = `*TripVerse Packing Checklist — ${trip.destination} (${trip.durationDays} Days)*\n\n`;
    const progress = `Status: ${packedCount}/${totalCount} items packed (${progressPercent}% ready)\n\n`;
    const itemsText = packingItems
      .map(i => `${i.isPacked ? '[X]' : '[ ]'} ${i.name} [${i.category}]`)
      .join('\n');
    const fullText = `${header}${progress}${itemsText}\n\n_Planned via TripVerse AI_`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
      triggerHaptic('light');
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    openExternalUrl(waUrl);
  };

  const packedCount = packingItems.filter(i => i.isPacked).length;
  const totalCount = packingItems.length;
  const progressPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  // Luggage Weight Estimator (Base bag 1.2kg + approx 0.45kg per item)
  const currentWeightKg = (packedCount * 0.42 + 1.2).toFixed(1);
  const totalWeightKg = (totalCount * 0.42 + 1.2).toFixed(1);

  const categories: { id: PackingCategory | 'all'; label: string }[] = [
    { id: 'all', label: `All Items (${totalCount})` },
    { id: 'documents', label: 'Documents' },
    { id: 'essentials', label: 'Highway Essentials' },
    { id: 'clothing', label: 'Clothing' },
    { id: 'firstaid', label: 'First Aid' },
    { id: 'electronics', label: 'Tech & Power' },
    { id: 'toiletries', label: 'Personal Care' }
  ];

  const filteredItems = activeCategory === 'all' 
    ? packingItems 
    : packingItems.filter(i => i.category === activeCategory);

  const selectedDay: WeatherDay = weather.forecastDays[selectedDayIndex] || weather.forecastDays[0];

  // Dynamic tourist wardrobe & sightseeing recommendation
  const getTravelerAdvice = (day: WeatherDay) => {
    if (day.rainProbPercent >= 40) {
      return {
        outfit: 'Waterproof outer layer, quick-dry shorts/pants & sturdy grip shoes.',
        activity: 'High rain probability. Schedule outdoor sights for early morning; spend rainy afternoons exploring covered bazaars, museums, or heritage cafes.',
        badge: 'Monsoon Gear Recommended',
        goldenHour: 'Cloudy Sunset: ~6:20 PM'
      };
    }
    if (day.maxTempC >= 32) {
      return {
        outfit: 'Breathable organic cotton/linen, UV-blocking sunglasses & wide-brim hat.',
        activity: 'Bright sunshine with high thermal index. Carry hydration flasks; schedule palaces and walking tours before 11:30 AM or after 4:30 PM.',
        badge: 'Sun & Heat Protection',
        goldenHour: 'Golden Hour: ~6:15 PM (Stunning lighting over lakes & forts)'
      };
    }
    if (day.minTempC <= 14) {
      return {
        outfit: 'Mid-weight thermal layer, fleece pullover & windbreaker for evening breeze.',
        activity: 'Brisk mountain/plateau temperatures. Wonderful clear afternoon light; pack a warm scarf for sunset viewpoints and night strolls.',
        badge: 'Chilly Evening Layering',
        goldenHour: 'Crisp Twilight: ~5:55 PM (Bring warm outerwear for viewpoints)'
      };
    }
    return {
      outfit: 'Comfortable casuals, walking sneakers & a light shrug or denim jacket.',
      activity: 'Pleasant sightseeing climate. Excellent visibility across historic monuments, promenades, and nature trails all day.',
      badge: 'Optimal Sightseeing Climate',
      goldenHour: 'Scenic Golden Hour: ~6:10 PM (Perfect photographic reflections)'
    };
  };

  const advice = getTravelerAdvice(selectedDay);

  return (
    <div className="space-y-6">
      
      {/* 1. EXPEDITION WEATHER LOG & SIGHTSEEING CLIMATE */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#07172C] via-[#0B2545] to-[#133966] text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-700/60">
        
        {/* Subtle decorative celestial glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-medium tracking-wider uppercase px-3 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                weather.isLive 
                  ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40' 
                  : 'text-sky-300 bg-sky-950/80 border-sky-500/40'
              }`}>
                {weather.isLive ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Weather Forecast ({weather.lastUpdated || 'recently updated'})</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5 text-sky-300" />
                    <span>Seasonal Estimate · Not Live</span>
                  </>
                )}
              </span>
              <span className="text-xs text-slate-300/80 font-normal">
                {trip.destination} • {trip.durationDays} Days Travel Radar
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold mt-2 tracking-tight text-white flex items-center gap-2 flex-wrap">
              <span>The Skies Over</span>
              <span className="font-serif italic font-normal text-amber-200">
                {trip.destination}
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl font-normal leading-relaxed">
              Real-time atmospheric readings, temperature gradients, and tailored wardrobe suggestions for every day of your itinerary.
            </p>
          </div>

          {/* Current Temperature Badge */}
          <div className="flex items-center gap-3.5 bg-white/10 px-4 py-3 rounded-2xl border border-white/15 self-start sm:self-auto backdrop-blur-md shadow-inner">
            <div className="text-right">
              <div className="text-3xl font-light font-display text-white tracking-tight">
                {weather.currentTempC}<span className="text-emerald-300 font-normal text-xl">°C</span>
              </div>
              <div className="text-xs font-medium text-emerald-300 mt-0.5">
                {weather.currentCondition}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Sun className="w-6 h-6 animate-spin-slow" />
            </div>
          </div>
        </div>

        {/* 5-Day Forecast Day Selector (Styled as Daily Journey Boarding Tokens) */}
        <div className="relative z-10 mt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
              Select Day for Climate Details:
            </span>
            <span className="text-[11px] font-serif italic text-emerald-300">
              Tap day to check attire & photography timing
            </span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-2">
            {weather.forecastDays.map((day: WeatherDay, idx: number) => {
              const isSelected = selectedDayIndex === idx;
              return (
                <button
                  key={day.dayNumber}
                  onClick={() => {
                    setSelectedDayIndex(idx);
                    triggerHaptic('light');
                  }}
                  className={`flex-1 min-w-[125px] p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative group ${
                    isSelected
                      ? 'bg-white/20 border-emerald-400/80 shadow-lg ring-1 ring-emerald-400/50 backdrop-blur-md'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase font-semibold tracking-wider ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                      Day {day.dayNumber}
                    </span>
                    {day.rainProbPercent > 30 && (
                      <CloudRain className="w-3.5 h-3.5 text-cyan-300" />
                    )}
                  </div>
                  <div className="text-xs font-medium text-white mt-1 truncate">
                    {day.condition}
                  </div>
                  <div className="text-sm font-semibold text-emerald-300 mt-1 tracking-tight">
                    {day.maxTempC}° <span className="text-slate-300/80 font-normal text-xs">/ {day.minTempC}°</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300 mt-2 font-medium">
                    <Droplets className="w-3 h-3 text-cyan-300 shrink-0" />
                    <span>{day.rainProbPercent}% Precip.</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Climate Metrics Strip */}
        <div className="relative z-10 mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs backdrop-blur-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
            <Thermometer className="w-4 h-4 text-amber-300 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-medium block">Avg Humidity</span>
              <span className="font-semibold text-white text-sm tracking-tight">{selectedDay.humidityPercent}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
            <Wind className="w-4 h-4 text-teal-300 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-medium block">Wind & Breeze</span>
              <span className="font-semibold text-white text-sm tracking-tight">{selectedDay.windKmh} km/h</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
            <Sun className="w-4 h-4 text-amber-300 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-medium block">UV Intensity</span>
              <span className="font-semibold text-white text-sm tracking-tight">{selectedDay.uvi} (Moderate)</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
            <CloudRain className="w-4 h-4 text-cyan-300 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-medium block">Rainfall Risk</span>
              <span className="font-semibold text-white text-sm tracking-tight">{selectedDay.rainProbPercent}% Probability</span>
            </div>
          </div>
        </div>

        {/* Tourist Wardrobe & Sightseeing Advisory Banner */}
        <div className="relative z-10 mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900/80 to-slate-900/70 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-xs">{advice.badge}</span>
                <span className="text-[11px] text-amber-300 font-serif italic">• {advice.goldenHour}</span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed font-normal">
                <strong className="text-emerald-300 font-medium">Attire: </strong>{advice.outfit} — <span className="text-slate-300">{advice.activity}</span>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 2. THE TRAVELER'S LUGGAGE & GEAR HUB */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium tracking-wider uppercase text-[#2D5A3D] bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200/80 inline-flex items-center gap-1.5">
                <Luggage className="w-3.5 h-3.5 text-[#2D5A3D]" />
                <span>Luggage & Gear Hub</span>
              </span>
              <span className="text-xs text-slate-300 font-bold">•</span>
              <span className="text-xs font-serif italic text-slate-500">
                Personalized for {trip.destination} ({trip.durationDays} Days)
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-semibold text-[#0B2545] mt-1.5">
              The Traveler’s Packing Checklist
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Travel light, stay prepared. Track checked items, monitor luggage weight, and tap seasonal kits below.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleShareList}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Share checklist on WhatsApp"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedShare ? 'Copied to Clipboard!' : 'Share / WhatsApp'}</span>
            </button>

            <button
              onClick={() => setIsAddingItem(true)}
              className="px-3.5 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs hover:shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Gear</span>
            </button>

            <button
              onClick={handleResetList}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
              title="Reset to default suggestions"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Luggage Weight & Boarding Tag Scale (Creative Tourist Motif) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-emerald-50/30 to-slate-50 border border-slate-200/90 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Bag weight indicator */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                <Luggage className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                    Est. Luggage Weight
                  </span>
                  <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded bg-slate-200/70 text-slate-600">
                    TAG #TV-{trip.destination.slice(0, 3).toUpperCase()}-BAG
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl sm:text-2xl font-semibold font-display text-[#0B2545] tracking-tight">
                    ~{currentWeightKg} kg
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    of {totalWeightKg} kg total planned pack
                  </span>
                </div>
              </div>
            </div>

            {/* Allowance Pill & Packing Status */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
                parseFloat(currentWeightKg) <= 7.0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {parseFloat(currentWeightKg) <= 7.0 ? 'Cabin Friendly (<7 kg)' : 'Standard Checked Luggage'}
              </span>

              <span className="text-xs font-serif italic text-slate-600 px-2">
                {progressPercent === 100 
                  ? '100% Ready for Departure' 
                  : progressPercent >= 50 
                    ? `Halfway Packed (${packedCount}/${totalCount})` 
                    : `In Progress (${packedCount}/${totalCount})`}
              </span>
            </div>

          </div>

          {/* Visual Packing Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Packing Checklist Progress</span>
              </span>
              <span className="font-semibold text-slate-800">
                {progressPercent}% Completed
              </span>
            </div>
            <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-[#1E3E2B] via-[#2D5A3D] to-[#386B49] transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

        </div>

        {/* 1-Tap Adventure Presets (Explorer Passport Stamps) */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#0B2545]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>1-Tap Adventure Kits (Quick Pack by Weather):</span>
            </div>
            <span className="text-[11px] font-serif italic text-slate-400">
              Adds essential gear in 1 click
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => handleApplyPreset('monsoon')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-left transition-all hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 group-hover:text-blue-600">
                <Umbrella className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Monsoon Wanderer</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                Poncho, silica packs, dry bag
              </span>
            </button>

            <button
              onClick={() => handleApplyPreset('winter')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-left transition-all hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 group-hover:text-indigo-600">
                <Shirt className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Highland Chills</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                Thermals, flask, cold balm
              </span>
            </button>

            <button
              onClick={() => handleApplyPreset('summer')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-left transition-all hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 group-hover:text-amber-600">
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Sun & Safari</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                SPF 50+, sunglasses, ORS
              </span>
            </button>

            <button
              onClick={() => handleApplyPreset('backpacker')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 text-left transition-all hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 group-hover:text-teal-600">
                <Compass className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Nomadic Pack</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                65W powerbank, TSA lock
              </span>
            </button>
          </div>
        </div>

        {/* Add Item Inline Form */}
        {isAddingItem && (
          <form onSubmit={handleAddCustomItem} className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row gap-3 animate-in fade-in duration-200">
            <input
              type="text"
              placeholder="e.g., Drone battery pack, GoPro chest mount, Noise-cancelling pods..."
              value={newCustomItemName}
              onChange={e => setNewCustomItemName(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-normal focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none"
              autoFocus
            />

            <select
              value={newCustomItemCat}
              onChange={e => setNewCustomItemCat(e.target.value as PackingCategory)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-700"
            >
              <option value="essentials">Highway Essentials</option>
              <option value="clothing">Wardrobe</option>
              <option value="electronics">Tech & Power</option>
              <option value="firstaid">First Aid</option>
              <option value="documents">Travel Documents</option>
              <option value="toiletries">Personal Care</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-medium hover:bg-[#244931] transition-colors"
              >
                Save Item
              </button>
              <button
                type="button"
                onClick={() => setIsAddingItem(false)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-normal hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Packing Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => handleToggleItem(item.id)}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start justify-between gap-3 group ${
                item.isPacked
                  ? 'bg-emerald-50/40 border-emerald-200/80 text-slate-500'
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="mt-0.5 shrink-0"
                >
                  {item.isPacked ? (
                    <CheckCircle2 className="w-5 h-5 text-[#2D5A3D]" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 group-hover:text-[#2D5A3D] transition-colors" />
                  )}
                </button>

                <div>
                  <span className={`text-xs font-medium leading-snug block transition-all ${item.isPacked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {item.name}
                  </span>
                  {item.note && (
                    <span className="text-[11px] text-slate-500 mt-0.5 block font-normal leading-tight">
                      {item.note}
                    </span>
                  )}
                  <span className="inline-block text-[9px] uppercase font-medium tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1.5 border border-slate-200/60">
                    {item.category}
                  </span>
                </div>
              </div>

              {item.isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                  title="Delete custom item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
