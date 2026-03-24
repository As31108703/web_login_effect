/**
 * Handles image loading and all drawing operations on canvas.
 */
export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.frontIcon = null;
    this.logo = null;
    this.state = 'loading';
  }

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

  drawFrontIcon(center, radius) {
    if (!this.frontIcon) return;
    const size = radius * 2;
    this.ctx.drawImage(this.frontIcon, center.x - radius, center.y - radius, size, size);
  }

  // =============================================
  // Splash path generation (called ONCE on slice)
  // =============================================

  /**
   * Build splash Path2D array for one half. Called once, reused every frame.
   * Samples pixels along cut line to find black segments, then generates
   * procedural tendril + droplet paths.
   */
  buildSplashPaths(center, radius, cutNormal, p1, p2) {
    if (!this.frontIcon) return [];
    const size = radius * 2;
    const pad = 250;
    const totalSize = size + pad * 2;
    const dpr = window.devicePixelRatio || 1;

    // Draw icon on temp canvas to sample pixels
    const tmp = document.createElement('canvas');
    tmp.width = Math.ceil(totalSize * dpr);
    tmp.height = Math.ceil(totalSize * dpr);
    const tc = tmp.getContext('2d');
    tc.setTransform(dpr, 0, 0, dpr, 0, 0);
    tc.drawImage(this.frontIcon, pad, pad, size, size);

    // Convert p1,p2 to offscreen coords
    const ox = center.x - radius;
    const oy = center.y - radius;
    const p1Off = { x: p1.x - ox + pad, y: p1.y - oy + pad };
    const p2Off = { x: p2.x - ox + pad, y: p2.y - oy + pad };

    // Find black segments along cut line
    const segments = this._findBlackSegments(tc, p1Off, p2Off, dpr);

    // Generate Path2D for each segment's splash
    const dx = p2Off.x - p1Off.x;
    const dy = p2Off.y - p1Off.y;
    const lineLen = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / lineLen;
    const dirY = dy / lineLen;

    const paths = [];
    for (const seg of segments) {
      const segWidth = seg.end - seg.start;
      const cx = p1Off.x + dirX * (seg.start + seg.end) / 2;
      const cy = p1Off.y + dirY * (seg.start + seg.end) / 2;
      const splashPaths = this._buildSplashShape(cx, cy, segWidth, cutNormal, dirX, dirY);
      paths.push(...splashPaths);
    }

    // Store offset info for drawing
    return { paths, pad, totalSize };
  }

  _findBlackSegments(offCtx, p1, p2, dpr) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lineLen = Math.sqrt(dx * dx + dy * dy);
    if (lineLen < 1) return [];
    const dirX = dx / lineLen;
    const dirY = dy / lineLen;

    const imgData = offCtx.getImageData(0, 0, offCtx.canvas.width, offCtx.canvas.height);
    const w = imgData.width;
    const segments = [];
    let segStart = -1;

    for (let t = 0; t <= lineLen; t += 1) {
      const px = Math.round((p1.x + dirX * t) * dpr);
      const py = Math.round((p1.y + dirY * t) * dpr);
      const idx = (py * w + px) * 4;
      const isDark = idx >= 0 && idx + 3 < imgData.data.length &&
        imgData.data[idx + 3] > 128 &&
        (imgData.data[idx] + imgData.data[idx + 1] + imgData.data[idx + 2]) < 200;

      if (isDark && segStart === -1) {
        segStart = t;
      } else if (!isDark && segStart !== -1) {
        segments.push({ start: segStart, end: t });
        segStart = -1;
      }
    }
    if (segStart !== -1) segments.push({ start: segStart, end: lineLen });
    return segments;
  }

  /**
   * Build Path2D shapes for one splash (tendrils + droplets).
   * All randomness happens here (called once).
   */
  _buildSplashShape(ox, oy, segWidth, cutNormal, lineX, lineY) {
    const paths = [];
    // Flattened semicircle — short toward gap, wide along cut line
    const angle = Math.atan2(cutNormal.y, cutNormal.x);
    const rx = segWidth * 0.25;    // height toward gap (short)
    const ry = segWidth / 2;       // width along cut line

    const path = new Path2D();
    path.ellipse(ox, oy, rx, ry, angle, -Math.PI / 2, Math.PI / 2);
    path.closePath();
    paths.push(path);

    return paths;
  }

  // =============================================
  // Drawing (called every frame)
  // =============================================

  /**
   * Draw one half with pre-built splash paths.
   */
  drawHalf(center, radius, clipPath, offset, opacity, splashData) {
    if (!this.frontIcon) return;
    const size = radius * 2;
    const { paths, pad } = splashData;

    // 1. Draw icon half — clipped by half-plane
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.translate(offset.x, offset.y);
    this.ctx.clip(clipPath);
    this.ctx.drawImage(
      this.frontIcon,
      center.x - radius, center.y - radius, size, size
    );
    this.ctx.restore();

    // 2. Draw splash paths — NO clip, directly on main canvas
    //    Splash paths are in offscreen coords (relative to icon top-left + pad).
    //    Convert to main canvas coords.
    const drawX = center.x - radius - pad + offset.x;
    const drawY = center.y - radius - pad + offset.y;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.translate(drawX, drawY);
    this.ctx.fillStyle = '#000000';
    for (const p of paths) {
      this.ctx.fill(p);
    }
    this.ctx.restore();
  }

  drawLogo(center, radius, opacity) {
    if (!this.logo || opacity <= 0) return;
    const logoW = radius * 2.2;
    const logoH = logoW * (this.logo.naturalHeight / this.logo.naturalWidth);
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.drawImage(this.logo, center.x - logoW / 2, center.y - logoH / 2, logoW, logoH);
    this.ctx.restore();
  }

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
