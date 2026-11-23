import { describe, it, expect } from 'vitest';
import {
  decodeEncodedPolyline,
  evaluateNavigationProgress,
  formatNavDistance,
  formatNavDuration,
  haversineMeters,
  pointToPolylineDistanceMeters,
  TurnStep
} from '../src/services/turnByTurnNavService';

describe('Turn-by-Turn In-App GPS Navigation Engine', () => {
  const sampleRoute: [number, number][] = [
    [19.076, 72.8777],
    [19.08, 72.8777],
    [19.08, 72.885]
  ];

  const sampleSteps: TurnStep[] = [
    {
      index: 0,
      instruction: 'Head north on Main Rd',
      type: 'depart',
      distanceMeters: 445,
      durationSeconds: 45,
      coordinates: { lat: 19.076, lng: 72.8777 },
      fromIndex: 0,
      toIndex: 1
    },
    {
      index: 1,
      instruction: 'Turn right onto Express Highway',
      type: 'right',
      distanceMeters: 765,
      durationSeconds: 60,
      coordinates: { lat: 19.08, lng: 72.8777 },
      fromIndex: 1,
      toIndex: 2
    },
    {
      index: 2,
      instruction: 'You have arrived at your destination',
      type: 'arrive',
      distanceMeters: 0,
      durationSeconds: 0,
      coordinates: { lat: 19.08, lng: 72.885 },
      fromIndex: 2,
      toIndex: 2
    }
  ];

  it('decodes standard 1e5 encoded polylines accurately', () => {
    const pts = decodeEncodedPolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts.length).toBe(3);
    expect(pts[0][0]).toBeCloseTo(38.5, 4);
    expect(pts[0][1]).toBeCloseTo(-120.2, 4);
    expect(pts[2][0]).toBeCloseTo(43.252, 3);
    expect(pts[2][1]).toBeCloseTo(-126.453, 3);
  });

  it('computes accurate on-route vs off-route distances', () => {
    const onRoute = pointToPolylineDistanceMeters({ lat: 19.078, lng: 72.8777 }, sampleRoute);
    expect(onRoute.offRouteMeters).toBeLessThan(10);

    const offRoute = pointToPolylineDistanceMeters({ lat: 19.078, lng: 72.8805 }, sampleRoute);
    expect(offRoute.offRouteMeters).toBeGreaterThan(200);
  });

  it('triggers voice guidance at approaching turn threshold and auto-advances at maneuver', () => {
    // ~111m before turn 1
    const approaching = evaluateNavigationProgress(
      { lat: 19.079, lng: 72.8777 },
      sampleRoute,
      sampleSteps,
      0
    );
    expect(approaching.isOffRoute).toBe(false);
    expect(approaching.arrived).toBe(false);
    expect(approaching.voiceKey).toBe('step-1-150');
    expect(approaching.voicePrompt).toContain('Turn right onto Express Highway');

    // Within 20m of turn 1 -> advances to step 1
    const atTurn = evaluateNavigationProgress(
      { lat: 19.0799, lng: 72.8777 },
      sampleRoute,
      sampleSteps,
      0
    );
    expect(atTurn.activeStepIndex).toBe(1);
  });

  it('flags off-route when GPS drifts > 85m away from polyline', () => {
    const res = evaluateNavigationProgress(
      { lat: 19.078, lng: 72.881 },
      sampleRoute,
      sampleSteps,
      0
    );
    expect(res.isOffRoute).toBe(true);
    expect(res.offRouteMeters).toBeGreaterThan(85);
  });

  it('detects arrival within 45m of destination', () => {
    const res = evaluateNavigationProgress(
      { lat: 19.0801, lng: 72.885 },
      sampleRoute,
      sampleSteps,
      1
    );
    expect(res.arrived).toBe(true);
    expect(res.remainingDistanceMeters).toBe(0);
    expect(res.voiceKey).toBe('arrived');
  });

  it('formats distances and durations cleanly for HUD display', () => {
    expect(formatNavDistance(35)).toBe('35 m');
    expect(formatNavDistance(347)).toBe('350 m');
    expect(formatNavDistance(2450)).toBe('2.5 km');
    expect(formatNavDistance(148000)).toBe('148 km');
    expect(formatNavDuration(45)).toBe('1 min');
    expect(formatNavDuration(2700)).toBe('45 min');
    expect(formatNavDuration(5400)).toBe('1 hr 30 min');
    expect(haversineMeters({ lat: 19.076, lng: 72.8777 }, { lat: 19.076, lng: 72.8777 })).toBe(0);
  });
});
