/**
 * Computes slice geometry: line-circle intersection, organic cut edge, half-plane clips.
 */
export class SliceEngine {
  /**
   * @param {{ x: number, y: number }} start
   * @param {{ x: number, y: number }} end
   * @param {{ x: number, y: number }} center
   * @param {number} radius
   * @returns {null | { clipA: Path2D, clipB: Path2D, normal: {x,y}, p1: {x,y}, p2: {x,y} }}
   */
  compute(start, end, center, radius) {
    const intersections = this._lineCircleIntersection(start, end, center, radius);
    if (!intersections) return null;

    const [p1, p2] = intersections;
    const normal = this._getNormal(start, end);
    const curvePoints = this._generateCurvePoints(p1, p2, normal);

    const clipA = this._buildClipPath(p1, p2, curvePoints, normal, -1);
    const clipB = this._buildClipPath(p1, p2, curvePoints, normal, 1);

    return { clipA, clipB, normal, p1, p2 };
  }

  _lineCircleIntersection(start, end, center, radius) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const fx = start.x - center.x;
    const fy = start.y - center.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    if (Math.abs(t1 - t2) < 0.001) return null;
    if (t1 > 1 || t2 < 0) return null;

    return [
      { x: start.x + t1 * dx, y: start.y + t1 * dy },
      { x: start.x + t2 * dx, y: start.y + t2 * dy },
    ];
  }

  _getNormal(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    return { x: -dy / len, y: dx / len };
  }

  /**
   * Generate bezier control points along the cut line for organic wavy edge.
   * Small magnitude (8px) — just enough for a water-droplet feel.
   */
  _generateCurvePoints(p1, p2, normal) {
    const count = 7;
    const points = [];
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const base = {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
      };
      // Alternating sign creates wavy cut edge; magnitude kept small
      const sign = (i % 2 === 0) ? 1 : -1;
      points.push({ base, magnitude: 8, sign });
    }
    return points;
  }

  /**
   * Resolve curve control points for a given side.
   */
  _resolvePoints(curvePoints, normal, side) {
    return curvePoints.map(cp => ({
      x: cp.base.x + normal.x * cp.magnitude * cp.sign * side,
      y: cp.base.y + normal.y * cp.magnitude * cp.sign * side,
    }));
  }

  /**
   * Trace bezier segments: p2 → through resolved points → p1.
   */
  _traceBezier(path, p2, resolvedPoints, p1) {
    const allPts = [p2, ...resolvedPoints, p1];
    for (let i = 1; i < allPts.length - 1; i++) {
      const cp = allPts[i];
      const next = allPts[i + 1];
      const isLast = i === allPts.length - 2;
      const ex = isLast ? next.x : (cp.x + next.x) / 2;
      const ey = isLast ? next.y : (cp.y + next.y) / 2;
      path.quadraticCurveTo(cp.x, cp.y, ex, ey);
    }
  }

  /**
   * Build clip path: organic bezier cut edge + half-plane extension.
   *
   * The bezier edge creates the watery cut look.
   * The half-plane extension ensures splash tendrils are never clipped.
   */
  _buildClipPath(p1, p2, curvePoints, normal, side) {
    const path = new Path2D();
    const FAR = 2000;

    // Line direction (p1 → p2)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ldx = dx / len;
    const ldy = dy / len;

    // Half-plane extends FAR on this side
    const nx = normal.x * side * FAR;
    const ny = normal.y * side * FAR;

    // 1. Start at p2
    path.moveTo(p2.x, p2.y);

    // 2. Organic bezier edge from p2 → p1
    const resolvedPoints = this._resolvePoints(curvePoints, normal, side);
    this._traceBezier(path, p2, resolvedPoints, p1);

    // 3. Extend to half-plane on this side
    path.lineTo(p1.x - ldx * FAR, p1.y - ldy * FAR);
    path.lineTo(p1.x - ldx * FAR + nx, p1.y - ldy * FAR + ny);
    path.lineTo(p2.x + ldx * FAR + nx, p2.y + ldy * FAR + ny);
    path.lineTo(p2.x + ldx * FAR, p2.y + ldy * FAR);

    // 4. Close back to p2
    path.closePath();
    return path;
  }
}
