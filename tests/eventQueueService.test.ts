import { describe, it, expect, beforeEach } from 'vitest';
import { 
  enqueueTripVerseEvent, 
  getLocalEventQueue, 
  clearLocalEventQueue 
} from '../src/services/eventQueueService';

describe('Event Queue & Webhook Engine (eventQueueService)', () => {
  beforeEach(() => {
    clearLocalEventQueue();
  });

  it('queues a USER_SIGNUP event and returns immediately', async () => {
    const success = await enqueueTripVerseEvent({
      eventType: 'USER_SIGNUP',
      userId: 'test-user-123',
      userEmail: 'traveler@test.com',
      userName: 'Adventurer'
    });

    expect(success).toBe(true);
    const queue = getLocalEventQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].eventType).toBe('USER_SIGNUP');
    expect(queue[0].userEmail).toBe('traveler@test.com');
  });

  it('queues a TRIP_BOOKED event with rich booking details', async () => {
    await enqueueTripVerseEvent({
      eventType: 'TRIP_BOOKED',
      userId: 'booker-456',
      userEmail: 'explorer@tripverse.app',
      userName: 'Explorer',
      details: {
        destination: 'Jaipur',
        totalAmount: 18500,
        currency: 'INR'
      }
    });

    const queue = getLocalEventQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].eventType).toBe('TRIP_BOOKED');
    expect(queue[0].details?.destination).toBe('Jaipur');
  });

  it('automatically adds ISO timestamp to queued events', async () => {
    await enqueueTripVerseEvent({
      eventType: 'FEEDBACK_SUBMITTED',
      userEmail: 'critic@tripverse.app'
    });

    const queue = getLocalEventQueue();
    expect(queue[0].timestamp).toBeDefined();
    expect(new Date(queue[0].timestamp!).getTime()).toBeGreaterThan(0);
  });
});
