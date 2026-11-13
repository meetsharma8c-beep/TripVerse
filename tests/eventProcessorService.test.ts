import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  handleEvent,
  processPendingEvents,
  startEventProcessorWorker,
  stopEventProcessorWorker
} from '../src/services/eventProcessorService';
import { enqueueTripVerseEvent, clearLocalEventQueue } from '../src/services/eventQueueService';

describe('Event Processor & Notification Worker (eventProcessorService)', () => {
  beforeEach(() => {
    clearLocalEventQueue();
  });

  afterEach(() => {
    stopEventProcessorWorker();
  });

  it('handles USER_SIGNUP event and formats welcome notification', async () => {
    const outcome = await handleEvent({
      eventType: 'USER_SIGNUP',
      userEmail: 'traveler@example.com',
      userName: 'Alice Adventurer'
    });

    expect(outcome.status).toBe('completed');
    expect(outcome.details?.action).toBe('welcome_notice_dispatched');
    expect(outcome.details?.recipient).toBe('traveler@example.com');
  });

  it('handles TRIP_BOOKED event and generates receipt details', async () => {
    const outcome = await handleEvent({
      eventType: 'TRIP_BOOKED',
      details: {
        tripName: 'Paris Explorer',
        totalAmount: 1250,
        currency: 'EUR'
      }
    });

    expect(outcome.status).toBe('completed');
    expect(outcome.details?.action).toBe('booking_receipt_generated');
    expect(outcome.details?.tripName).toBe('Paris Explorer');
    expect(outcome.details?.receiptId).toMatch(/^TV-RCP-/);
  });

  it('handles COLLAB_JOINED event and prepares alert', async () => {
    const outcome = await handleEvent({
      eventType: 'COLLAB_JOINED',
      userName: 'Bob',
      details: {
        tripId: 'trip-999'
      }
    });

    expect(outcome.status).toBe('completed');
    expect(outcome.details?.action).toBe('collab_notification_sent');
    expect(outcome.details?.alert).toContain('Bob has joined');
  });

  it('processes events from queue and starts/stops worker safely', async () => {
    await enqueueTripVerseEvent({
      eventType: 'TRIP_CREATED',
      details: { destination: 'Kyoto' }
    });

    const results = await processPendingEvents(5);
    expect(Array.isArray(results)).toBe(true);

    // Verify worker interval starts and stops without error
    startEventProcessorWorker(10000);
    stopEventProcessorWorker();
  });
});
