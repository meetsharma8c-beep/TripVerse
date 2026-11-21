import { describe, it, expect } from 'vitest';
import {
  getOrInitializeCollaborationSession,
  castActivityVote,
  getActivityVoteSummary,
  addGroupSuggestion,
  acceptSuggestionIntoTrip,
  subscribeToTripCollaboration
} from '../src/services/collaborationService';
import { Trip, TripActivity } from '../src/types/trip';
import { AuthUser } from '../src/types/auth';

const MOCK_USER: AuthUser = {
  uid: 'user-traveler-1',
  email: 'traveler1@example.com',
  displayName: 'Traveler One',
  photoURL: 'https://example.com/avatar.png',
  travelerStyle: 'Explorer',
  travelStyleTag: 'Explorer',
  location: 'Tokyo',
  occupation: 'Designer',
  age: 28,
  emailVerified: true,
  provider: 'google',
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString()
};

const MOCK_TRIP: Trip = {
  id: 'trip-collab-test-101',
  userId: 'user-traveler-1',
  name: 'Kyoto Cultural Getaway',
  destination: 'Kyoto',
  startDate: '2026-12-01',
  endDate: '2026-12-04',
  durationDays: 3,
  totalBudget: 1500,
  currency: 'USD',
  travelersCount: 2,
  travelerType: 'couple',
  itinerary: [
    {
      dayNumber: 1,
      theme: 'Historic Temples',
      activities: [
        {
          id: 'act-fushimi-inari',
          time: '09:00',
          title: 'Fushimi Inari Shrine',
          description: 'Hike through the 10,000 torii gates',
          location: 'Fushimi Ward, Kyoto',
          duration: '2 hours',
          type: 'sightseeing',
          estimatedCost: 0
        }
      ]
    }
  ],
  preferences: ['culture', 'food'],
  createdAt: new Date().toISOString()
};

describe('Multiplayer Realtime Collaboration Service', () => {
  it('initializes a fresh collaboration session with host details', () => {
    const session = getOrInitializeCollaborationSession(MOCK_TRIP, MOCK_USER);
    expect(session).toBeDefined();
    expect(session.tripId).toBe(MOCK_TRIP.id);
    expect(session.collaborators[0].id).toBe(MOCK_USER.uid);
    expect(session.collaborators[0].role).toBe('owner');
    expect(session.inviteCode).toContain('TRIP-');
    expect(session.collaborators.length).toBeGreaterThanOrEqual(1);
  });

  it('casts an activity upvote and updates the summary', async () => {
    const updatedSession = await castActivityVote(
      MOCK_TRIP.id,
      'act-fushimi-inari',
      'up',
      MOCK_USER
    );
    expect(updatedSession).toBeDefined();

    const summary = getActivityVoteSummary(updatedSession, 'act-fushimi-inari');
    expect(summary.upvotes).toBeGreaterThanOrEqual(1);
    expect(summary.downvotes).toBe(0);
  });

  it('adds a group activity suggestion and accepts it into the itinerary', async () => {
    const suggestion = await addGroupSuggestion(MOCK_TRIP.id, MOCK_USER, {
      title: 'Kinkaku-ji Golden Pavilion',
      description: 'Visit the renowned Zen Buddhist temple covered in gold leaf',
      dayNumber: 1,
      category: 'spot'
    });

    expect(suggestion).toBeDefined();
    expect(suggestion.title).toBe('Kinkaku-ji Golden Pavilion');

    const { updatedTrip, acceptedActivity } = acceptSuggestionIntoTrip(
      MOCK_TRIP,
      suggestion.id
    );

    expect(acceptedActivity).toBeDefined();
    expect(acceptedActivity?.title).toBe('Kinkaku-ji Golden Pavilion');
    expect(updatedTrip.itinerary[0].activities.some(a => a.title.includes('Kinkaku-ji'))).toBe(true);
  });

  it('subscribes to realtime status updates and returns unsubscribe cleaner', () => {
    let capturedStatus = '';
    const unsubscribe = subscribeToTripCollaboration(
      MOCK_TRIP.id,
      () => {},
      (status) => {
        capturedStatus = status;
      }
    );

    expect(typeof unsubscribe).toBe('function');
    expect(['CONNECTING', 'LIVE', 'LOCAL_ONLY']).toContain(capturedStatus);
    unsubscribe();
  });
});
