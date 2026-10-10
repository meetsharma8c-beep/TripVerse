import React from 'react';
import { Trip } from '../../types/trip';
import { ExternalLink, MapPin, Navigation, X } from 'lucide-react';

interface LiveNavigationHUDProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveNavigationHUD: React.FC<LiveNavigationHUDProps> = ({ trip, isOpen, onClose }) => {
  if (!isOpen) return null;

  const destination = trip.routeDetails?.destinationCoordinates
    ? `${trip.routeDetails.destinationCoordinates.lat},${trip.routeDetails.destinationCoordinates.lng}`
    : trip.destination;
  const origin = trip.routeDetails?.originCoordinates
    ? `${trip.routeDetails.originCoordinates.lat},${trip.routeDetails.originCoordinates.lng}`
    : trip.origin.toLowerCase().startsWith('current location')
      ? undefined
      : trip.origin;
  const travelMode = trip.transportMode === 'bike' ? 'two-wheeler' : 'driving';
  const googleDirections = new URLSearchParams({
    api: '1',
    destination,
    travelmode: travelMode
  });
  if (origin) googleDirections.set('origin', origin);
  const googleMapsUrl = `https://www.google.com/maps/dir/?${googleDirections.toString()}`;

  const appleDirections = new URLSearchParams({
    daddr: destination,
    dirflg: 'd'
  });
  if (origin) appleDirections.set('saddr', origin);
  const appleMapsUrl = `https://maps.apple.com/?${appleDirections.toString()}`;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-navigation-title"
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#2D5A3D] flex items-center justify-center mb-4">
          <Navigation className="w-6 h-6" />
        </div>
        <h2 id="live-navigation-title" className="text-xl font-bold text-[#0B2545]">Continue to your destination</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose a navigation app for turn-by-turn directions and current road conditions. TripVerse does not provide live navigation. Your maps app may choose a different route, so confirm the destination and route before starting.
        </p>
        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#2D5A3D] mt-0.5 shrink-0" />
            <span><strong>From:</strong> {trip.origin}<br /><strong>To:</strong> {trip.destination}</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2D5A3D] px-4 py-3 font-bold text-white hover:bg-[#244931]"
          >
            Open Google Maps
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800 hover:bg-slate-50"
          >
            Open Apple Maps
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          Go back to trip
        </button>
      </section>
    </div>
  );
};
