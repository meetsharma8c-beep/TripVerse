import React, { useState } from 'react';
import { Trip, CurrencyCode } from '../../types/trip';
import { 
  ArrowRight, 
  Bed, 
  Bus, 
  Car, 
  ExternalLink, 
  Plane, 
  Train, 
  X, 
  Star, 
  CheckCircle2, 
  Clock, 
  Tag, 
  Calendar, 
  Ticket, 
  MapPin, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../../services/currencyService';
import { buildHotelBookingUrl } from '../../services/hotelService';
import { buildFlightBookingUrl, buildTrainBookingUrl, buildBusBookingUrl, buildCabBookingUrl } from '../../services/dealService';

interface TripBookingCheckoutModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
}

export const TripBookingCheckoutModal: React.FC<TripBookingCheckoutModalProps> = ({
  trip,
  isOpen,
  onClose,
  currency
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'hotels' | 'transport' | 'activities'>('all');

  if (!isOpen || !trip) return null;

  const destination = trip.destination.split(',')[0].trim();
  const origin = (trip.origin || 'City Center').split(',')[0].trim();
  const travelers = Math.max(1, trip.travelersCount || 1);

  // Compute realistic travel dates
  const today = new Date();
  const startDateStr = trip.startDate
    ? trip.startDate.split('T')[0]
    : new Date(today.getTime() + 86400000 * 3).toISOString().split('T')[0];
  const startObj = new Date(startDateStr);
  const endDateStr = new Date(startObj.getTime() + 86400000 * trip.durationDays).toISOString().split('T')[0];

  // Selected Hotel details
  const hotel = trip.selectedHotel;
  const hotelLinks = buildHotelBookingUrl(destination, hotel?.name || `${destination} Hotel`, startDateStr, endDateStr, travelers);
  
  // Transport Deep-links
  const flightLinks = buildFlightBookingUrl(origin, destination, startDateStr);
  const trainLink = buildTrainBookingUrl(origin, destination, startDateStr);
  const busLink = buildBusBookingUrl(origin, destination);
  const cabLinks = buildCabBookingUrl(origin, destination);

  // Best Deal
  const bestTransport = trip.bestTransportDeal || trip.transportDeals?.[0];

  const estimateItems = [
    { label: 'Transport', amount: trip.budgetBreakdown.transportation, icon: Plane, color: 'text-sky-600 bg-sky-50' },
    { label: 'Stays & Lodging', amount: trip.budgetBreakdown.accommodation, icon: Bed, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Local Dining', amount: trip.budgetBreakdown.food, icon: Tag, color: 'text-amber-600 bg-amber-50' },
    { label: 'Activities & Entry', amount: trip.budgetBreakdown.activities, icon: Ticket, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Safety Buffer', amount: trip.budgetBreakdown.miscellaneous, icon: ShieldCheck, color: 'text-slate-600 bg-slate-100' }
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-options-title"
        className="my-auto flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-950 to-slate-900 p-5 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Live Booking & Ticketing Center
              </span>
              <span className="text-[11px] text-slate-300">
                {trip.durationDays} Days • {travelers} Traveler{travelers > 1 ? 's' : ''}
              </span>
            </div>
            <h2 id="booking-options-title" className="mt-1 text-lg sm:text-xl font-black text-white">
              Complete Your Trip to {destination}
            </h2>
            <p className="mt-0.5 text-xs text-slate-300">
              Verified hotel options, live flight & train tickets, and activity passes with direct partner links.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking options"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-5 pt-2 gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Essentials' },
            { id: 'hotels', label: 'Selected Hotel' },
            { id: 'transport', label: 'Flights & Trains' },
            { id: 'activities', label: 'Tours & Entry Passes' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="space-y-5 overflow-y-auto p-5 sm:p-6 text-slate-800">

          {/* Budget Overview Card */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Calibrated Trip Budget
                </span>
                <h3 className="text-base font-black text-[#0B2545]">
                  {origin} → {destination}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{startDateStr} to {endDateStr}</span>
                  <span>•</span>
                  <span>{trip.pacing ? `${trip.pacing.replace('_', ' ')} pace` : 'Balanced pacing'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Est. Cost</span>
                <span className="text-2xl font-black text-emerald-800">
                  {formatCurrency(trip.estimatedTotal || trip.totalBudget, currency)}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-200/60">
              {estimateItems.map(item => (
                <div key={item.label} className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <item.icon className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-[10px] font-bold uppercase truncate">{item.label}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 block truncate">
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 1. SELECTED HOTEL SECTION */}
          {(activeTab === 'all' || activeTab === 'hotels') && hotel && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#0B2545] flex items-center gap-2">
                  <Bed className="w-4 h-4 text-emerald-700" />
                  Recommended Stay: {hotel.name}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Match
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-emerald-300 transition-all">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                  {hotel.image && (
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full sm:w-44 h-32 object-cover rounded-xl shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{hotel.name}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{hotel.address || hotel.neighborhood}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1 text-amber-500 text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{hotel.userRating}</span>
                          <span className="text-slate-400 font-normal">({hotel.reviewCount})</span>
                        </div>
                        <span className="text-sm font-black text-emerald-800 block mt-0.5">
                          ₹{hotel.nightlyRate.toLocaleString('en-IN')}<span className="text-[10px] text-slate-500 font-normal">/night</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {hotel.amenities.slice(0, 4).map(am => (
                        <span key={am} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {am}
                        </span>
                      ))}
                    </div>

                    <p className="mt-2 text-[11px] text-emerald-700 font-medium">
                      ✓ {hotel.cancellationPolicy}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <a
                        href={hotel.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                      >
                        Book on Booking.com
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {hotel.googleHotelsUrl && (
                        <a
                          href={hotel.googleHotelsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Compare Google Hotels
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. LIVE TRANSPORT SECTION */}
          {(activeTab === 'all' || activeTab === 'transport') && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#0B2545] flex items-center gap-2">
                <Plane className="w-4 h-4 text-emerald-700" />
                Live Transport Deals & Ticketing Links
              </h3>

              {bestTransport && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 uppercase">
                      {bestTransport.badge || 'Recommended Transport'}
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      ₹{bestTransport.dealPrice.toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">({bestTransport.priceUnit.replace('_', ' ')})</span>
                    </span>
                  </div>

                  <h4 className="mt-1.5 text-sm font-black text-slate-900">{bestTransport.title}</h4>
                  <p className="text-xs text-slate-600">{bestTransport.subtitle}</p>

                  <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-700 bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Departure</span>
                      <span className="font-bold">{bestTransport.route.departureTime}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{bestTransport.route.duration}</span>
                      <span>•</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Arrival</span>
                      <span className="font-bold">{bestTransport.route.arrivalTime}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={bestTransport.bookingUrl || flightLinks.googleFlights}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                    >
                      Search & Book on Google Flights
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={trainLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                    >
                      <Train className="w-3.5 h-3.5 text-emerald-700" />
                      Search Trains on IRCTC
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>
              )}

              {/* Transport Grid Links */}
              <div className="grid gap-2 sm:grid-cols-2">
                <a
                  href={flightLinks.googleFlights}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Plane className="w-5 h-5 text-sky-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Google Flights</span>
                      <span className="text-[11px] text-slate-500">{origin} → {destination}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </a>

                <a
                  href={trainLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Train className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">IRCTC Train Booking</span>
                      <span className="text-[11px] text-slate-500">Live seat quota & PNR</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </a>

                <a
                  href={busLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Bus className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">redBus Sleeper & Luxury</span>
                      <span className="text-[11px] text-slate-500">Overnight intercity buses</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </a>

                <a
                  href={cabLinks.zoomcar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Car className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Zoomcar Self-Drive</span>
                      <span className="text-[11px] text-slate-500">Keyless pickup in {destination}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </a>
              </div>
            </div>
          )}

          {/* 3. EXPERIENCES & TOURS SECTION */}
          {(activeTab === 'all' || activeTab === 'activities') && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#0B2545] flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-700" />
                Attraction Tickets & Curated Experiences
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <a
                  href={`https://www.viator.com/searchResults/all?text=${encodeURIComponent(destination)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Viator (TripAdvisor) Experiences</span>
                    <span className="text-[11px] text-slate-500">Skip-the-line monument & guided passes</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </a>

                <a
                  href={`https://www.getyourguide.com/s/?q=${encodeURIComponent(destination)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">GetYourGuide Passes</span>
                    <span className="text-[11px] text-slate-500">Instant digital mobile tickets</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </a>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Booking & ticketing completed directly with verified travel partners.</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition-colors"
          >
            Done
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </footer>
      </section>
    </div>
  );
};
