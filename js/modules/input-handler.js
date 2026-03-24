/**
 * Unified mouse/touch input handler for slash gesture detection.
 */
export class InputHandler {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} options
   * @param {number} options.minDistance - minimum drag distance in CSS px (default 30)
   */
  constructor(canvas, { minDistance = 30 } = {}) {
    this.canvas = canvas;
    this.minDistance = minDistance;
    this.enabled = false;
    this.onSliceCallback = null;
    this._startPoint = null;
    this._dragging = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
  }

  /**
   * Register the slice completion callback.
   * @param {(start: {x,y}, end: {x,y}) => void} cb
   */
  onSlice(cb) {
    this.onSliceCallback = cb;
  }

  /**
   * Enable input listening.
   */
  enable() {
    if (this.enabled) return;
    this.enabled = true;

    // Mouse
    this.canvas.addEventListener('mousedown', this._onPointerDown);
    window.addEventListener('mousemove', this._onPointerMove);
    window.addEventListener('mouseup', this._onPointerUp);

    // Touch
    this.canvas.addEventListener('touchstart', this._onPointerDown, { passive: false });
    window.addEventListener('touchmove', this._onPointerMove, { passive: false });
    window.addEventListener('touchend', this._onPointerUp);
  }

  /**
   * Disable input listening.
   */
  disable() {
    if (!this.enabled) return;
    this.enabled = false;

    this.canvas.removeEventListener('mousedown', this._onPointerDown);
    window.removeEventListener('mousemove', this._onPointerMove);
    window.removeEventListener('mouseup', this._onPointerUp);

    this.canvas.removeEventListener('touchstart', this._onPointerDown);
    window.removeEventListener('touchmove', this._onPointerMove);
    window.removeEventListener('touchend', this._onPointerUp);
  }

  _getPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const source = e.touches ? e.touches[0] || e.changedTouches[0] : e;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  }

  _onPointerDown(e) {
    e.preventDefault();
    this._startPoint = this._getPoint(e);
    this._dragging = true;
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    if (e.touches) e.preventDefault();
  }

  _onPointerUp(e) {
    if (!this._dragging) return;
    this._dragging = false;

    const endPoint = this._getPoint(e);
    const dx = endPoint.x - this._startPoint.x;
    const dy = endPoint.y - this._startPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= this.minDistance && this.onSliceCallback) {
      this.onSliceCallback(this._startPoint, endPoint);
    }

    this._startPoint = null;
  }
}
