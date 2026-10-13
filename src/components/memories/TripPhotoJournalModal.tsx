import React, { useState, useEffect } from 'react';
import { Trip, TripPhotoMemory } from '../../types/trip';
import { loadTripPhotos, saveTripPhoto, deleteTripPhoto } from '../../services/storageService';
import { 
  Camera, 
  X, 
  Plus, 
  MapPin, 
  Calendar, 
  Sparkles, 
  Trash2, 
  Download, 
  Maximize2, 
  Image as ImageIcon,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TripPhotoJournalModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrip?: (updated: Trip) => void;
}

// Curated high-res scenic presets travelers can instantly pick from
const PHOTO_PRESETS = [
  {
    title: 'Golden Hour Sunset Over Lake',
    url: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1200&q=80',
    tags: ['Sunset', 'Viewpoint', 'Heritage']
  },
  {
    title: 'Misty Pine Forest & Himalayan Peaks',
    url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    tags: ['Mountains', 'Nature', 'Misty']
  },
  {
    title: 'Palm-Fringed Coastal Highway Drive',
    url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    tags: ['Coast', 'Roadtrip', 'Beach']
  },
  {
    title: 'Historic Fort Ramparts & Valley Vista',
    url: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=80',
    tags: ['Palace', 'Fort', 'Panoramic']
  },
  {
    title: 'Traditional Clay Pot Chai & Hot Pakoras',
    url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    tags: ['Food', 'Highway Stop', 'Chai']
  },
  {
    title: 'Bustling Night Bazaar & Cultural Lanterns',
    url: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=1200&q=80',
    tags: ['Culture', 'Night Market', 'Street']
  }
];

export const TripPhotoJournalModal: React.FC<TripPhotoJournalModalProps> = ({
  trip,
  isOpen,
  onClose,
  onUpdateTrip
}) => {
  const [photos, setPhotos] = useState<TripPhotoMemory[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<TripPhotoMemory | null>(null);

  // New photo form state
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (isOpen && trip) {
      const loaded = loadTripPhotos(trip.id);
      setPhotos(loaded);
    }
  }, [isOpen, trip]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size is too large (max 5MB).');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl.trim()) {
      setUploadError('Please choose a preset photo or upload an image.');
      return;
    }

    const newPhoto: TripPhotoMemory = {
      id: `photo-${Date.now()}`,
      tripId: trip.id,
      dayNumber: selectedDay,
      url: photoUrl,
      caption: caption.trim() || `Memories from Day ${selectedDay}`,
      location: locationTag.trim() || trip.destination.split(',')[0],
      takenAt: new Date().toISOString(),
      tags: ['Travel', `Day ${selectedDay}`],
      featured: true
    };

    saveTripPhoto(newPhoto);
    const updatedPhotos = [newPhoto, ...photos];
    setPhotos(updatedPhotos);

    if (onUpdateTrip) {
      onUpdateTrip({
        ...trip,
        photos: updatedPhotos
      });
    }

    // Reset form
    setPhotoUrl('');
    setCaption('');
    setLocationTag('');
    setIsAddingPhoto(false);
    setUploadError('');

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#2D5A3D', '#386B49', '#F59E0B']
      });
    } catch {
      // safe fallback
    }
  };

  const handleDelete = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this photo memory?')) {
      deleteTripPhoto(trip.id, photoId);
      const updated = photos.filter(p => p.id !== photoId);
      setPhotos(updated);
      if (onUpdateTrip) {
        onUpdateTrip({
          ...trip,
          photos: updated
        });
      }
      if (lightboxPhoto?.id === photoId) {
        setLightboxPhoto(null);
      }
    }
  };

  const filteredPhotos = selectedDayFilter === 'all'
    ? photos
    : photos.filter(p => p.dayNumber === selectedDayFilter);

  // Available days array
  const daysArray = Array.from({ length: trip.durationDays || 3 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/90 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/50 via-teal-50/20 to-white">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#2D5A3D] flex items-center justify-center shrink-0 shadow-xs">
              <Camera className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Photo Journal
                </span>
                <span className="text-xs text-slate-500 font-medium truncate">
                  {trip.name}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B2545] tracking-tight truncate">
                Trip Memories & Photo Scrapbook
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddingPhoto(!isAddingPhoto)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              {isAddingPhoto ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isAddingPhoto ? 'Cancel' : 'Add Memory'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip & Day Filters */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Day Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none py-0.5">
            <button
              onClick={() => setSelectedDayFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedDayFilter === 'all'
                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Memories ({photos.length})
            </button>
            {daysArray.map(dayNum => {
              const count = photos.filter(p => p.dayNumber === dayNum).length;
              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDayFilter(dayNum)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedDayFilter === dayNum
                      ? 'bg-[#2D5A3D] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Day {dayNum} ({count})
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Preserve photos offline with full itinerary sync</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* ADD PHOTO DRAWER */}
          {isAddingPhoto && (
            <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-5 animate-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#2D5A3D]" />
                  <span>Attach a New Travel Photo</span>
                </h3>
                <span className="text-xs text-slate-500">Pick preset or upload custom image</span>
              </div>

              {/* Upload Input & Presets */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* File Upload Button */}
                  <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 rounded-2xl bg-white hover:bg-emerald-50/50 cursor-pointer transition-colors text-center">
                    <ImageIcon className="w-6 h-6 text-[#2D5A3D] mb-1" />
                    <span className="text-xs font-bold text-slate-800">Upload Photo from Device</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WEBP up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Image Preview if chosen */}
                  {photoUrl && (
                    <div className="w-32 h-24 rounded-2xl overflow-hidden border border-emerald-300 relative group shrink-0">
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-bold">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="text-xs font-semibold text-rose-600">{uploadError}</p>
                )}

                {/* Preset suggestions */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Or choose from curated destination photography:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {PHOTO_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(preset.url);
                          setCaption(preset.title);
                          setLocationTag(preset.tags[0]);
                        }}
                        className={`group relative h-20 rounded-xl overflow-hidden border transition-all text-left ${
                          photoUrl === preset.url
                            ? 'ring-2 ring-[#2D5A3D] border-transparent'
                            : 'border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <img src={preset.url} alt={preset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-1.5 flex flex-col justify-end">
                          <span className="text-[9px] font-bold text-white leading-tight line-clamp-2">
                            {preset.title}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Metadata */}
              <form onSubmit={handleSavePhoto} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Caption / Story</label>
                  <input
                    type="text"
                    placeholder="e.g., Golden sunset overlooking the palace lake"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#2D5A3D]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assign to Day</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2D5A3D]"
                  >
                    {daysArray.map(d => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Location Tag</label>
                  <input
                    type="text"
                    placeholder="e.g., Lake Pichola or Highway KM 120"
                    value={locationTag}
                    onChange={(e) => setLocationTag(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#2D5A3D]"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Save to Journal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PHOTO GRID */}
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50/80 rounded-3xl border border-dashed border-slate-300 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#2D5A3D] flex items-center justify-center mx-auto">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {selectedDayFilter === 'all' ? 'No memories added yet' : `No photos saved for Day ${selectedDayFilter}`}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Snap or upload photos from your smartphone to create a lasting travel scrapbook attached directly to your days and stops.
              </p>
              <button
                onClick={() => setIsAddingPhoto(true)}
                className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Photo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setLightboxPhoto(photo)}
                  className="group relative bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col"
                >
                  {/* Image Container */}
                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Day & Location Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      {photo.dayNumber ? (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 shadow-xs">
                          Day {photo.dayNumber}
                        </span>
                      ) : <span />}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDelete(photo.id, e)}
                          className="p-1.5 rounded-full bg-black/50 hover:bg-rose-600 text-white backdrop-blur-md transition-colors"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxPhoto(photo);
                          }}
                          className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                          title="Expand"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom overlay text */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      {photo.location && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 drop-shadow-sm mb-0.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{photo.location}</span>
                        </div>
                      )}
                      <h4 className="text-sm font-bold leading-snug drop-shadow line-clamp-2">
                        {photo.caption}
                      </h4>
                    </div>
                  </div>

                  {/* Card footer details */}
                  <div className="p-3.5 bg-white flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(photo.takenAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[#2D5A3D] group-hover:underline">
                      View full photo →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <div className="w-full bg-slate-900/90 text-white p-4 rounded-2xl mt-3 flex items-center justify-between gap-4 border border-slate-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{lightboxPhoto.location || trip.destination}</span>
                  {lightboxPhoto.dayNumber && <span>• Day {lightboxPhoto.dayNumber}</span>}
                </div>
                <h3 className="text-sm sm:text-base font-bold truncate">
                  {lightboxPhoto.caption}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxPhoto.url}
                  download={`TripVerse_Memory_${lightboxPhoto.id}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                  title="Download / Open Original"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
