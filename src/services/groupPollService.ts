/**
 * Group Trip Decision Polling Service (groupPollService.ts)
 * Enables trip collaborators to vote on meals, accommodations, and itinerary options.
 */

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // List of user emails/names who voted
}

export interface GroupPoll {
  id: string;
  tripId: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: string;
  status: 'active' | 'closed';
  winningOptionId?: string;
}

const STORAGE_PREFIX = 'tripverse_trip_polls_';

export function getTripPolls(tripId: string): GroupPoll[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // Initial default sample poll for group engagement
  const defaultPolls: GroupPoll[] = [
    {
      id: `poll-${tripId}-1`,
      tripId,
      question: 'Dinner choice for tomorrow evening?',
      options: [
        { id: 'opt-1', text: 'Authentic Local Street Food Market 🍜', votes: ['alex@tripverse.com', 'rohit@travel.com'] },
        { id: 'opt-2', text: 'Heritage Rooftop Bistro with View 🍷', votes: ['priya@travel.com'] }
      ],
      createdBy: 'Trip Organizer',
      createdAt: new Date().toISOString(),
      status: 'active'
    }
  ];

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(defaultPolls));
  } catch {}

  return defaultPolls;
}

export function createTripPoll(
  tripId: string,
  question: string,
  optionTexts: string[],
  userEmail: string
): GroupPoll {
  const polls = getTripPolls(tripId);

  const newPoll: GroupPoll = {
    id: `poll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tripId,
    question: question.trim(),
    options: optionTexts.filter(t => t.trim().length > 0).map((text, idx) => ({
      id: `opt-${idx}-${Date.now()}`,
      text: text.trim(),
      votes: []
    })),
    createdBy: userEmail || 'Traveler',
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  const updated = [newPoll, ...polls];
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(updated));
  }
  return newPoll;
}

export function voteOnPoll(
  tripId: string,
  pollId: string,
  optionId: string,
  userEmail: string
): GroupPoll[] {
  const polls = getTripPolls(tripId);
  const voter = userEmail || 'guest@traveler';

  const updated = polls.map(p => {
    if (p.id !== pollId || p.status === 'closed') return p;

    // Toggle vote: Remove voter from other options in this poll
    const newOptions = p.options.map(opt => {
      const hasVoted = opt.votes.includes(voter);
      if (opt.id === optionId) {
        // Toggle or add
        return {
          ...opt,
          votes: hasVoted ? opt.votes.filter(v => v !== voter) : [...opt.votes, voter]
        };
      } else {
        // Remove from other options (single-choice poll)
        return {
          ...opt,
          votes: opt.votes.filter(v => v !== voter)
        };
      }
    });

    return { ...p, options: newOptions };
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(updated));
  }
  return updated;
}

export function closePoll(tripId: string, pollId: string): GroupPoll[] {
  const polls = getTripPolls(tripId);

  const updated = polls.map(p => {
    if (p.id !== pollId) return p;

    // Determine winner
    let maxVotes = -1;
    let winningId: string | undefined;
    p.options.forEach(opt => {
      if (opt.votes.length > maxVotes) {
        maxVotes = opt.votes.length;
        winningId = opt.id;
      }
    });

    return {
      ...p,
      status: 'closed' as const,
      winningOptionId: winningId
    };
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(updated));
  }
  return updated;
}
