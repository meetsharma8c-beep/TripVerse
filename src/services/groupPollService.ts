/**
 * Group Trip Decision Polling Service (groupPollService.ts)
 * Enables trip collaborators to vote on meals, accommodations, and itinerary options.
 * Starts cleanly with zero fabricated polls or fake voter emails.
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
      const parsed: GroupPoll[] = JSON.parse(raw);
      // Strip any legacy sample poll with fake voter emails (alex@tripverse.com, rohit@travel.com, priya@travel.com)
      const cleaned = (Array.isArray(parsed) ? parsed : []).filter(
        (p) =>
          p &&
          !(
            p.id === `poll-${tripId}-1` &&
            p.options?.some((o) =>
              o.votes?.some((v) =>
                ['alex@tripverse.com', 'rohit@travel.com', 'priya@travel.com'].includes(v)
              )
            )
          )
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(cleaned));
      }
      return cleaned;
    }
  } catch {}

  return [];
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
    options: optionTexts
      .filter((t) => t.trim().length > 0)
      .map((text, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        text: text.trim(),
        votes: [],
      })),
    createdBy: userEmail || 'Traveler',
    createdAt: new Date().toISOString(),
    status: 'active',
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

  const updated = polls.map((p) => {
    if (p.id !== pollId || p.status === 'closed') return p;

    const newOptions = p.options.map((opt) => {
      const hasVoted = opt.votes.includes(voter);
      if (opt.id === optionId) {
        return {
          ...opt,
          votes: hasVoted ? opt.votes.filter((v) => v !== voter) : [...opt.votes, voter],
        };
      }
      return {
        ...opt,
        votes: opt.votes.filter((v) => v !== voter),
      };
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

  const updated = polls.map((p) => {
    if (p.id !== pollId) return p;

    let maxVotes = -1;
    let winnerId: string | undefined;
    p.options.forEach((opt) => {
      if (opt.votes.length > maxVotes) {
        maxVotes = opt.votes.length;
        winnerId = opt.id;
      }
    });

    return {
      ...p,
      status: 'closed' as const,
      winningOptionId: winnerId,
    };
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(updated));
  }
  return updated;
}
