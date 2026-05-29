import { describe, expect, it, vi } from 'vitest';

import { RequestMetrics } from '#request/metrics';

vi.useFakeTimers();

describe('cl:RequestMetrics', () => {
  describe('op:recordRequest', () => {
    it('should increment the request counter', () => {
      const metrics = new RequestMetrics();

      metrics.recordRequest();
      metrics.recordRequest();
      metrics.recordRequest();

      expect(metrics.snapshot().requests).toBe(3);
    });
  });

  describe('op:beginPause + op:endPause', () => {
    it('should add a single pause window to the paused total', () => {
      const metrics = new RequestMetrics();
      vi.advanceTimersByTime(100);

      metrics.beginPause();
      vi.advanceTimersByTime(500);
      metrics.endPause();
      vi.advanceTimersByTime(200);

      const snapshot = metrics.snapshot();

      expect(snapshot.wallMs).toBe(800);
      expect(snapshot.activeMs).toBe(300);
    });

    it('should count overlapping pauses as a single window', () => {
      const metrics = new RequestMetrics();
      vi.advanceTimersByTime(50);

      metrics.beginPause();
      vi.advanceTimersByTime(100);
      metrics.beginPause();
      vi.advanceTimersByTime(100);
      metrics.endPause();
      vi.advanceTimersByTime(100);
      metrics.endPause();
      vi.advanceTimersByTime(50);

      const snapshot = metrics.snapshot();

      expect(snapshot.wallMs).toBe(400);
      // outer pause covers 300ms (overlapping inner pause does not double-count)
      expect(snapshot.activeMs).toBe(100);
    });

    it('should reflect an ongoing pause in the snapshot active time', () => {
      const metrics = new RequestMetrics();
      vi.advanceTimersByTime(100);
      metrics.beginPause();
      vi.advanceTimersByTime(200);

      const snapshot = metrics.snapshot();

      expect(snapshot.wallMs).toBe(300);
      expect(snapshot.activeMs).toBe(100);
    });

    it('should ignore endPause when no pause is active', () => {
      const metrics = new RequestMetrics();
      vi.advanceTimersByTime(100);
      metrics.endPause();

      const snapshot = metrics.snapshot();

      expect(snapshot.wallMs).toBe(100);
      expect(snapshot.activeMs).toBe(100);
    });
  });

  describe('op:snapshot', () => {
    it('should return zero rps when activeMs is zero', () => {
      const metrics = new RequestMetrics();
      metrics.recordRequest();

      const snapshot = metrics.snapshot();

      expect(snapshot.rps).toBe(0);
    });

    it('should compute rps from requests over active seconds', () => {
      const metrics = new RequestMetrics();
      metrics.recordRequest();
      metrics.recordRequest();
      vi.advanceTimersByTime(1000);

      const snapshot = metrics.snapshot();

      expect(snapshot.activeMs).toBe(1000);
      expect(snapshot.rps).toBe(2);
    });
  });

  describe('op:startTicking + op:stopTicking', () => {
    it('should emit tick snapshots at the configured cadence', () => {
      const metrics = new RequestMetrics();
      const listener = vi.fn();
      metrics.on('tick', listener);

      metrics.startTicking(100);
      vi.advanceTimersByTime(350);

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener.mock.calls[0][0]).toMatchObject({
        requests: 0,
        wallMs: expect.any(Number),
      });

      metrics.stopTicking();
    });

    it('should stop emitting after stopTicking', () => {
      const metrics = new RequestMetrics();
      const listener = vi.fn();
      metrics.on('tick', listener);

      metrics.startTicking(50);
      vi.advanceTimersByTime(120);
      const before = listener.mock.calls.length;
      metrics.stopTicking();
      vi.advanceTimersByTime(500);

      expect(listener.mock.calls.length).toBe(before);
    });

    it('should be idempotent when startTicking is called twice', () => {
      const metrics = new RequestMetrics();
      const listener = vi.fn();
      metrics.on('tick', listener);

      metrics.startTicking(100);
      metrics.startTicking(100);
      vi.advanceTimersByTime(250);

      expect(listener).toHaveBeenCalledTimes(2);

      metrics.stopTicking();
    });

    it('should be a no-op when stopTicking is called without start', () => {
      const metrics = new RequestMetrics();

      expect(() => metrics.stopTicking()).not.toThrow();
    });

    it('should not throw when the timer has no unref method', () => {
      const metrics = new RequestMetrics();
      // simulate an environment where setInterval returns a timer without unref
      const timer = { unref: undefined } as unknown as ReturnType<
        typeof setInterval
      >;
      const setIntervalSpy = vi
        .spyOn(globalThis, 'setInterval')
        .mockReturnValueOnce(timer);

      expect(() => metrics.startTicking(100)).not.toThrow();

      setIntervalSpy.mockRestore();
      metrics.stopTicking();
    });

    it('should support off() to unsubscribe listeners', () => {
      const metrics = new RequestMetrics();
      const listener = vi.fn();
      metrics.on('tick', listener);
      metrics.off('tick', listener);

      metrics.startTicking(50);
      vi.advanceTimersByTime(150);

      expect(listener).not.toHaveBeenCalled();

      metrics.stopTicking();
    });
  });
});
