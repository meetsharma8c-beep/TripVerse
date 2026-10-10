import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

export const OfflineStatusBar: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsDismissed(false);
      setShowReconnectedToast(true);
      const timer = setTimeout(() => {
        setShowReconnectedToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
      setShowReconnectedToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnectedToast) {
    return (
      <div className="fixed top-18 sm:top-20 inset-x-0 z-40 flex justify-center pointer-events-none px-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 pointer-events-auto border border-emerald-400">
          <Wifi className="w-3.5 h-3.5 animate-pulse" />
          <span>Back online</span>
        </div>
      </div>
    );
  }

  if (isOffline && !isDismissed) {
    return (
      <div className="fixed top-18 sm:top-20 inset-x-0 z-40 flex justify-center pointer-events-none px-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md text-amber-300 text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 pointer-events-auto border border-amber-500/40">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-200">
            <strong className="text-amber-300 font-bold">Offline Highway Mode:</strong> Cached itineraries, break stops & route guide available
          </span>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:text-white text-slate-400 ml-1 rounded-full transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
