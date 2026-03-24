/**
 * Manages canvas element sizing, DPR scaling, and resize events.
 */
export class CanvasManager {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cssSize = 0;    // CSS pixel size (square canvas)
    this.dpr = window.devicePixelRatio || 1;
    this.onResizeCallback = null;

    this._updateSize();
    this._bindResize();
  }

  /**
   * Register a callback for resize events.
   * @param {Function} cb - called with (cssSize)
   */
  onResize(cb) {
    this.onResizeCallback = cb;
  }

  /**
   * Calculate and apply canvas size.
   * Canvas is square: min(viewportW, viewportH) * 0.5
   */
  _updateSize() {
    this.dpr = window.devicePixelRatio || 1;
    this.cssSize = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.85);

    this.canvas.style.width = `${this.cssSize}px`;
    this.canvas.style.height = `${this.cssSize}px`;
    this.canvas.width = this.cssSize * this.dpr;
    this.canvas.height = this.cssSize * this.dpr;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _bindResize() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this._updateSize();
        if (this.onResizeCallback) {
          this.onResizeCallback(this.cssSize);
        }
      }, 100);
    });
  }

  /**
   * Clear the entire canvas.
   */
  clear() {
    this.ctx.clearRect(0, 0, this.cssSize, this.cssSize);
  }

  /**
   * Get the center point in CSS pixels.
   */
  getCenter() {
    return { x: this.cssSize / 2, y: this.cssSize / 2 };
  }

  /**
   * Get the image draw radius (half of cssSize).
   */
  getImageRadius() {
    return this.cssSize * 0.3;
  }
}
