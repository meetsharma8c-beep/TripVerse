import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { getTripPolls, createTripPoll, voteOnPoll, closePoll } from '../src/services/groupPollService';

describe('Group Decision Poll Service (groupPollService)', () => {
  beforeAll(() => {
    if (typeof window === 'undefined') {
      const storageMock: Record<string, string> = {};
      (globalThis as any).window = globalThis;
      (globalThis as any).localStorage = {
        getItem: (k: string) => storageMock[k] || null,
        setItem: (k: string, v: string) => { storageMock[k] = v; },
        removeItem: (k: string) => { delete storageMock[k]; },
        clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
      };
    }
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('retrieves default initial poll for a trip', () => {
    const polls = getTripPolls('trip-dubai');
    expect(polls.length).toBeGreaterThan(0);
    expect(polls[0].question).toContain('Dinner choice');
    expect(polls[0].options.length).toBe(2);
  });

  it('creates a new group decision poll with custom options', () => {
    const created = createTripPoll(
      'trip-manali',
      'Should we do Paragliding at Solang or Hot Springs?',
      ['Paragliding 🪂', 'Hot Springs ♨️'],
      'alex@example.com'
    );

    expect(created.question).toContain('Paragliding');
    expect(created.options.length).toBe(2);
    expect(created.status).toBe('active');
  });

  it('records and toggles user votes accurately', () => {
    const poll = createTripPoll(
      'trip-manali',
      'Choose transport to Solang',
      ['Rental 4x4', 'Scenic Ropeway Cable Car'],
      'organizer@trip.com'
    );

    const opt1Id = poll.options[0].id;
    const opt2Id = poll.options[1].id;

    // Vote for option 1
    let updated = voteOnPoll('trip-manali', poll.id, opt1Id, 'traveler1@gmail.com');
    let target = updated.find(p => p.id === poll.id);
    expect(target?.options[0].votes).toContain('traveler1@gmail.com');

    // Switch vote to option 2
    updated = voteOnPoll('trip-manali', poll.id, opt2Id, 'traveler1@gmail.com');
    target = updated.find(p => p.id === poll.id);
    expect(target?.options[0].votes).not.toContain('traveler1@gmail.com');
    expect(target?.options[1].votes).toContain('traveler1@gmail.com');
  });

  it('closes poll and designates winning option', () => {
    const poll = createTripPoll('trip-paris', 'Museum day', ['Louvre', 'Orsay'], 'guide@paris.com');
    voteOnPoll('trip-paris', poll.id, poll.options[0].id, 'user1@test.com');
    voteOnPoll('trip-paris', poll.id, poll.options[0].id, 'user2@test.com');

    const closedList = closePoll('trip-paris', poll.id);
    const target = closedList.find(p => p.id === poll.id);
    expect(target?.status).toBe('closed');
    expect(target?.winningOptionId).toBe(poll.options[0].id);
  });
});
