/**
 * Controls the multi-phase animation sequence after a slice.
 *
 * Phases:
 *   1. separate  — two halves move apart (400ms, easeOutCubic)
 *   2. fadeIn    — logo fades in + halves fade out (800ms)
 *   3. complete  — show login area
 */
export class AnimationController {
  constructor() {
    this.phase = 'idle'; // idle | separate | fadeIn | complete
    this.progress = 0;   // 0..1 within current phase
    this._startTime = 0;
    this._onFrameCallback = null;
    this._onCompleteCallback = null;
    this._rafId = null;

    this._phaseDurations = {
      separate: 600,
      fadeIn: 1000,
    };
  }

  /**
   * Register per-frame callback.
   * @param {(phase: string, progress: number) => void} cb
   */
  onFrame(cb) {
    this._onFrameCallback = cb;
  }

  /**
   * Register animation-complete callback.
   * @param {() => void} cb
   */
  onComplete(cb) {
    this._onCompleteCallback = cb;
  }

  /**
   * Start the animation sequence.
   */
  start() {
    this.phase = 'separate';
    this.progress = 0;
    this._startTime = performance.now();
    this._tick(this._startTime);
  }

  _tick(now) {
    const elapsed = now - this._startTime;
    const duration = this._phaseDurations[this.phase];
    this.progress = Math.min(elapsed / duration, 1);

    if (this._onFrameCallback) {
      this._onFrameCallback(this.phase, this.progress);
    }

    if (this.progress >= 1) {
      if (this.phase === 'separate') {
        this.phase = 'fadeIn';
        this.progress = 0;
        this._startTime = now;
      } else if (this.phase === 'fadeIn') {
        this.phase = 'complete';
        if (this._onCompleteCallback) {
          this._onCompleteCallback();
        }
        return;
      }
    }

    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }

  /**
   * EaseOutCubic: 1 - (1-t)^3
   */
  static easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
}
