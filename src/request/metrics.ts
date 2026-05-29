import { EventEmitter } from 'node:events';

const MILLISECONDS_PER_SECOND = 1000;
const DEFAULT_TICK_INTERVAL_MS = 250;

/** point-in-time snapshot of the request metrics */
export interface RequestMetricsSnapshot {
  /** total number of requests recorded since construction */
  requests: number;
  /** wall clock time in milliseconds since construction */
  wallMs: number;
  /** active time in milliseconds (wall time minus paused time) */
  activeMs: number;
  /** requests per second over the active window (0 when activeMs is 0) */
  rps: number;
}

/**
 * low-level request metrics counter with overlap-safe pause tracking
 * emits a 'tick' event with the current snapshot at a configurable cadence
 */
export class RequestMetrics {
  readonly #emitter = new EventEmitter();
  readonly #startedAt: number;
  #requests = 0;
  #pausedMs = 0;
  #pauseDepth = 0;
  #pauseStartedAt: number | undefined;
  #tickTimer: ReturnType<typeof setInterval> | undefined;

  /** constructs a fresh metrics tracker anchored at now */
  constructor() {
    this.#startedAt = Date.now();
  }

  /** records a single request dispatch */
  public recordRequest(): void {
    this.#requests += 1;
  }

  /**
   * starts (or extends) a pause window
   * concurrent calls are tracked via a depth counter so overlapping pauses
   * only count as a single paused window
   */
  public beginPause(): void {
    this.#pauseDepth += 1;

    if (this.#pauseDepth === 1) {
      this.#pauseStartedAt = Date.now();
    }
  }

  /**
   * ends a pause window started with {@link beginPause}
   * once all overlapping pauses have ended, the elapsed duration is added
   * to the cumulative paused time
   */
  public endPause(): void {
    if (this.#pauseDepth === 0) {
      return;
    }

    this.#pauseDepth -= 1;

    if (this.#pauseDepth === 0 && this.#pauseStartedAt !== undefined) {
      this.#pausedMs += Date.now() - this.#pauseStartedAt;
      this.#pauseStartedAt = undefined;
    }
  }

  /**
   * returns a point-in-time snapshot of the metrics
   * @returns immutable snapshot
   */
  public snapshot(): RequestMetricsSnapshot {
    const wallMs = Date.now() - this.#startedAt;
    const ongoingPauseMs =
      this.#pauseStartedAt !== undefined
        ? Date.now() - this.#pauseStartedAt
        : 0;
    const activeMs = Math.max(0, wallMs - this.#pausedMs - ongoingPauseMs);
    const rps =
      activeMs > 0 ? this.#requests / (activeMs / MILLISECONDS_PER_SECOND) : 0;

    return { requests: this.#requests, wallMs, activeMs, rps };
  }

  /**
   * subscribes to the 'tick' event emitted by {@link startTicking}
   * @param event event name ('tick')
   * @param listener listener invoked with the latest snapshot
   * @returns this for chaining
   */
  public on(
    event: 'tick',
    listener: (snapshot: RequestMetricsSnapshot) => void,
  ): this {
    this.#emitter.on(event, listener);

    return this;
  }

  /**
   * unsubscribes from the 'tick' event
   * @param event event name ('tick')
   * @param listener listener registered via {@link on}
   * @returns this for chaining
   */
  public off(
    event: 'tick',
    listener: (snapshot: RequestMetricsSnapshot) => void,
  ): this {
    this.#emitter.off(event, listener);

    return this;
  }

  /**
   * begins emitting 'tick' events at the configured cadence
   * the underlying timer is unref-ed so it does not block process exit
   * @param intervalMs tick interval in milliseconds
   */
  public startTicking(intervalMs: number = DEFAULT_TICK_INTERVAL_MS): void {
    if (this.#tickTimer !== undefined) {
      return;
    }

    this.#tickTimer = setInterval(() => {
      this.#emitter.emit('tick', this.snapshot());
    }, intervalMs);

    if (typeof this.#tickTimer.unref === 'function') {
      this.#tickTimer.unref();
    }
  }

  /** stops emitting 'tick' events */
  public stopTicking(): void {
    if (this.#tickTimer === undefined) {
      return;
    }

    clearInterval(this.#tickTimer);
    this.#tickTimer = undefined;
  }
}
