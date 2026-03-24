/**
 * Handles image loading and all drawing operations on canvas.
 */
export class Renderer {
  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.frontIcon = null;
    this.logo = null;
    this.state = 'loading'; // loading | ready | error
  }

  /**
   * Load both images. Returns a promise.
   * @param {string} frontIconSrc
   * @param {string} logoSrc
   */
  async loadImages(frontIconSrc, logoSrc) {
    try {
      const [icon, logo] = await Promise.all([
        this._loadImage(frontIconSrc),
        this._loadImage(logoSrc),
      ]);
      this.frontIcon = icon;
      this.logo = logo;
      this.state = 'ready';
    } catch (e) {
      this.state = 'error';
      console.error('Image load failed:', e);
    }
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${src}`));
      img.src = src;
    });
  }

  /**
   * Draw the full front icon centered on canvas.
   * @param {{ x: number, y: number }} center
   * @param {number} radius - draw radius
   */
  drawFrontIcon(center, radius) {
    if (!this.frontIcon) return;
    const size = radius * 2;
    this.ctx.drawImage(
      this.frontIcon,
      center.x - radius,
      center.y - radius,
      size,
      size
    );
  }

  /**
   * Draw one half of the front icon, clipped by a path, with offset.
   * @param {{ x: number, y: number }} center
   * @param {number} radius
   * @param {Path2D} clipPath - the bezier clip path for this half
   * @param {{ x: number, y: number }} offset - separation offset
   */
  drawHalf(center, radius, clipPath, offset) {
    if (!this.frontIcon) return;
    const size = radius * 2;
    this.ctx.save();
    this.ctx.translate(offset.x, offset.y);
    this.ctx.clip(clipPath);
    this.ctx.drawImage(
      this.frontIcon,
      center.x - radius,
      center.y - radius,
      size,
      size
    );
    this.ctx.restore();
  }

  /**
   * Draw the logo centered, with given opacity.
   * Logo height matches front icon, width scales by aspect ratio.
   * @param {{ x: number, y: number }} center
   * @param {number} radius
   * @param {number} opacity - 0 to 1
   */
  drawLogo(center, radius, opacity) {
    if (!this.logo || opacity <= 0) return;
    const logoH = radius * 2;
    const logoW = logoH * (this.logo.naturalWidth / this.logo.naturalHeight);

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.drawImage(
      this.logo,
      center.x - logoW / 2,
      center.y - logoH / 2,
      logoW,
      logoH
    );
    this.ctx.restore();
  }

  /**
   * Draw error message centered.
   * @param {{ x: number, y: number }} center
   */
  drawError(center) {
    this.ctx.save();
    this.ctx.fillStyle = '#999';
    this.ctx.font = '16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('圖片載入失敗', center.x, center.y);
    this.ctx.restore();
  }
}
