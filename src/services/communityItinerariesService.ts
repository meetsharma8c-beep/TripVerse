/**
 * Community Creator Itineraries Service (communityItinerariesService.ts)
 * Curated, verified creator travel playbooks ready to clone in 1-click.
 */

export interface CreatorItinerary {
  id: string;
  title: string;
  destination: string;
  author: string;
  authorRole: string;
  isFounder?: boolean;
  avatar: string;
  durationDays: number;
  estimatedCost: string;
  likes: number;
  rating: number;
  coverImage: string;
  highlights: string[];
  vibe: string;
}

export const COMMUNITY_ITINERARIES: CreatorItinerary[] = [
  {
    id: 'creator_himachal_alpine',
    title: 'Himalayan Ridge & Kasol Alpine Circuit',
    destination: 'Manali, Himachal Pradesh',
    author: 'Aarav Mehta',
    authorRole: 'High-Altitude Trekker',
    avatar: '🏔️',
    durationDays: 6,
    estimatedCost: '₹18,500',
    likes: 1420,
    rating: 4.95,
    coverImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    highlights: ['Solang Valley Gliders', 'Hadimba Cedar Shrine', 'Old Manali Riverfront Cafes', 'Rohtang Snow Line'],
    vibe: 'Alpine Adventure & Serenity'
  },
  {
    id: 'creator_paris_culture',
    title: 'Secret Cafes & Classical Grandeur of Paris',
    destination: 'Paris, France',
    author: 'Camille Laurent',
    authorRole: 'Parisian Architectural Historian',
    avatar: '🥐',
    durationDays: 5,
    estimatedCost: '€1,200',
    likes: 2180,
    rating: 4.98,
    coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
    highlights: ['Montmartre Sunset Easels', 'Private Louvre Twilight Pass', 'Latin Quarter Bookstalls', 'Eiffel Midnight Sparkles'],
    vibe: 'Art, Romance & Fine Patisserie'
  },
  {
    id: 'creator_tokyo_kyoto',
    title: 'Neon Skylines & Sacred Bamboo Groves',
    destination: 'Tokyo & Kyoto, Japan',
    author: 'Kenji & Mei',
    authorRole: 'Japan Rail Curators',
    avatar: '⛩️',
    durationDays: 8,
    estimatedCost: '¥195,000',
    likes: 3410,
    rating: 4.99,
    coverImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    highlights: ['Shibuya Sky Observation', 'Fushimi Inari Torii Dawn', 'Gion Geisha Alleys', 'Akihabara Tech Arcades'],
    vibe: 'Futuristic High-Speed & Ancient Zen'
  },
  {
    id: 'creator_dubai_luxury',
    title: 'Golden Dunes, Sky High Luxury & Marina Glow',
    destination: 'Dubai, UAE',
    author: 'Meet Sharma',
    authorRole: 'VIP Founder & Architect',
    isFounder: true,
    avatar: '👑',
    durationDays: 4,
    estimatedCost: 'AED 3,800',
    likes: 4950,
    rating: 5.0,
    coverImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    highlights: ['Burj Khalifa Level 148', 'Red Dune 4x4 Sunset Safari', 'Marina Private Yacht Cruise', 'Old Creek Abra Ride'],
    vibe: 'Luxury Opulence & Desert Thrills'
  }
];

export function getCommunityItineraries(): CreatorItinerary[] {
  return COMMUNITY_ITINERARIES;
}
