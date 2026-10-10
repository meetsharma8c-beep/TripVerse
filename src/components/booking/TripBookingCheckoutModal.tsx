import React from 'react';
import { Trip, CurrencyCode } from '../../types/trip';
import { ArrowRight, Bed, Bus, Car, ExternalLink, Plane, Train, X } from 'lucide-react';
import { formatCurrency } from '../../services/currencyService';

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
  if (!isOpen || !trip) return null;

  const destination = trip.destination.split(',')[0].trim();
  const origin = (trip.origin || '').split(',')[0].trim();
  const bookingLinks = [
    {
      label: 'Search hotels on Booking.com',
      detail: `Search accommodation in ${destination}`,
      href: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`,
      Icon: Bed
    },
    {
      label: 'Find stays near the destination',
      detail: `View hotel and accommodation listings in ${destination}`,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hotels in ${destination}`)}`,
      Icon: Bed
    },
    {
      label: 'Search flights',
      detail: `${origin || 'Choose origin'} to ${destination} in Google Flights`,
      href: `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${origin} to ${destination}`)}`,
      Icon: Plane
    },
    {
      label: 'Search trains on IRCTC',
      detail: `Open IRCTC and enter ${origin || 'your origin'} to ${destination}`,
      href: 'https://www.irctc.co.in/nget/train-search',
      Icon: Train
    },
    {
      label: 'Search buses on redBus',
      detail: `${origin || 'Choose origin'} to ${destination}`,
      href: 'https://www.redbus.in/',
      Icon: Bus
    },
    {
      label: 'Search self-drive cars',
      detail: `Open Zoomcar and check pickup availability near ${destination}`,
      href: 'https://www.zoomcar.com/',
      Icon: Car
    }
  ];
  const estimateItems = [
    { label: 'Transport', amount: trip.budgetBreakdown.transportation },
    { label: 'Accommodation', amount: trip.budgetBreakdown.accommodation },
    { label: 'Food', amount: trip.budgetBreakdown.food },
    { label: 'Activities', amount: trip.budgetBreakdown.activities },
    { label: 'Miscellaneous', amount: trip.budgetBreakdown.miscellaneous }
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-options-title"
        className="my-auto flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-5">
          <div>
            <h2 id="booking-options-title" className="text-lg font-bold text-[#0B2545]">
              Booking options for {destination}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              TripVerse is free to use and does not collect booking payments. These links take you to external providers to search and book directly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking options"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-950">
              Free planning estimate — no booking or payment has been made.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              Prices, inventory, taxes, schedules, cancellation terms, and provider availability can change.
              Check details and availability on the provider’s booking page. Any payment is handled by that provider, not TripVerse.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Trip budget estimate</span>
                <h3 className="mt-1 text-base font-bold text-[#0B2545]">
                  {trip.origin || 'Origin'} → {trip.destination}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {trip.durationDays} days · {trip.travelersCount} travelers
                </p>
              </div>
              <span className="text-xl font-black text-[#2D5A3D]">
                {formatCurrency(trip.estimatedTotal || trip.totalBudget, currency)}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {estimateItems.map(item => (
                <div key={item.label} className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-800">{formatCurrency(item.amount, currency)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#0B2545]">Continue with a booking provider</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {bookingLinks.map(({ label, detail, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[64px] items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
                >
                  <Icon className="h-5 w-5 shrink-0 text-emerald-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-800">{label}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">{detail}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
          <p className="text-[11px] text-slate-500">Review provider terms before confirming.</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2D5A3D] px-4 py-2 text-sm font-bold text-white hover:bg-[#244931]"
          >
            Back to trip
            <ArrowRight className="h-4 w-4" />
          </button>
        </footer>
      </section>
    </div>
  );
};
