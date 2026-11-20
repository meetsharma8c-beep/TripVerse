/**
 * Curated Route Playbooks Service (communityItinerariesService.ts)
 * Official TripVerse editorial route templates ready to clone in 1-click.
 * Zero synthetic likes, zero fabricated creator personas, zero fake ratings.
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
  coverImage: string;
  highlights: string[];
  vibe: string;
}

export const COMMUNITY_ITINERARIES: CreatorItinerary[] = [
  {
    id: 'creator_himachal_alpine',
    title: 'Himalayan Ridge & Kasol Alpine Circuit',
    destination: 'Manali, Himachal Pradesh',
    author: 'TripVerse Curated',
    authorRole: 'Mountain Route Template',
    avatar: '🏔️',
    durationDays: 6,
    estimatedCost: '₹18,500 est.',
    coverImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    highlights: ['Solang Valley', 'Hadimba Devi Temple', 'Old Manali Cafes', 'Atal Tunnel & Sissu'],
    vibe: 'Alpine Adventure & Serenity'
  },
  {
    id: 'creator_paris_culture',
    title: 'Cafes & Classical Landmarks of Paris',
    destination: 'Paris, France',
    author: 'TripVerse Curated',
    authorRole: 'City Architecture Template',
    avatar: '🥐',
    durationDays: 5,
    estimatedCost: '€1,200 est.',
    coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
    highlights: ['Montmartre & Sacré-Cœur', 'Louvre Museum', 'Latin Quarter', 'Eiffel Tower & Seine'],
    vibe: 'Art, Romance & Patisserie'
  },
  {
    id: 'creator_tokyo_kyoto',
    title: 'Tokyo Skylines & Kyoto Bamboo Groves',
    destination: 'Tokyo & Kyoto, Japan',
    author: 'TripVerse Curated',
    authorRole: 'Japan Rail Template',
    avatar: '⛩️',
    durationDays: 8,
    estimatedCost: '¥195,000 est.',
    coverImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    highlights: ['Shibuya Sky', 'Fushimi Inari Taisha', 'Gion Historic District', 'Senso-ji Asakusa'],
    vibe: 'Modern Metropolis & Ancient Zen'
  },
  {
    id: 'creator_dubai_luxury',
    title: 'Golden Dunes, Skyline & Dubai Marina',
    destination: 'Dubai, UAE',
    author: 'Meet Sharma',
    authorRole: 'Founder Route Template',
    isFounder: true,
    avatar: '👑',
    durationDays: 4,
    estimatedCost: 'AED 3,800 est.',
    coverImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    highlights: ['Burj Khalifa At The Top', 'Red Dune Desert Safari', 'Dubai Marina Cruise', 'Old Dubai Creek Abra'],
    vibe: 'Skyline & Desert Escapes'
  }
];

export function getCommunityItineraries(): CreatorItinerary[] {
  return COMMUNITY_ITINERARIES;
}
