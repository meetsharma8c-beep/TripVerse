import React from 'react';

export const SkeletonPulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`} />
);

export const TripCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm p-0 flex flex-col justify-between">
    <div className="h-44 bg-slate-200 animate-pulse relative" />
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SkeletonPulse className="h-14" />
        <SkeletonPulse className="h-14" />
      </div>
      <SkeletonPulse className="h-4 w-3/4" />
    </div>
    <div className="p-5 pt-0">
      <SkeletonPulse className="h-11 w-full rounded-2xl" />
    </div>
  </div>
);

export const TimelineSkeleton: React.FC = () => (
  <div className="space-y-4 max-w-4xl mx-auto py-6">
    <SkeletonPulse className="h-20 w-full rounded-2xl" />
    <div className="space-y-3 pl-6 border-l-2 border-slate-200">
      <SkeletonPulse className="h-24 w-full rounded-2xl" />
      <SkeletonPulse className="h-24 w-full rounded-2xl" />
      <SkeletonPulse className="h-24 w-full rounded-2xl" />
    </div>
  </div>
);

export const ModalSkeleton: React.FC<{ title?: string }> = ({ title = 'Loading...' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonPulse className="h-6 w-48" />
          <SkeletonPulse className="h-4 w-64" />
        </div>
        <SkeletonPulse className="w-9 h-9 rounded-full" />
      </div>

      <div className="space-y-4">
        <SkeletonPulse className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <SkeletonPulse className="h-20 rounded-2xl" />
          <SkeletonPulse className="h-20 rounded-2xl" />
          <SkeletonPulse className="h-20 rounded-2xl" />
        </div>
        <SkeletonPulse className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  </div>
);
