/**
 * Computes slice geometry: line-circle intersection, bezier cut edges, normal vector.
 */
export class SliceEngine {
  /**
   * Compute full slice result from a gesture line.
   * @param {{ x: number, y: number }} start - gesture start in canvas CSS coords
   * @param {{ x: number, y: number }} end - gesture end in canvas CSS coords
   * @param {{ x: number, y: number }} center - circle center
   * @param {number} radius - circle radius
   * @returns {null | SliceResult} null if line doesn't intersect circle
   *
   * @typedef {object} SliceResult
   * @property {Path2D} clipA - clip path for half A
   * @property {Path2D} clipB - clip path for half B
   * @property {{ x: number, y: number }} normal - unit normal vector of the cut line
   */
  compute(start, end, center, radius) {
    const intersections = this._lineCircleIntersection(start, end, center, radius);
    if (!intersections) return null;

    const [p1, p2] = intersections;
    const normal = this._getNormal(start, end);
    this._cachedNormal = normal; // cached for _buildClipPath
    const curvePoints = this._generateCurvePoints(p1, p2, normal);

    const clipA = this._buildClipPath(p1, p2, curvePoints, center, radius, 1);
    const clipB = this._buildClipPath(p1, p2, curvePoints, center, radius, -1);

    return { clipA, clipB, normal };
  }

  /**
   * Line-circle intersection.
   * Returns two intersection points sorted along the line direction, or null.
   */
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

    // Both intersections must exist (line passes through, not tangent only)
    if (Math.abs(t1 - t2) < 0.001) return null;

    // At least part of the gesture segment should overlap the circle.
    // The segment is t in [0,1]; the circle chord is t in [t1,t2].
    // Reject if the ranges don't overlap at all.
    if (t1 > 1 || t2 < 0) return null;

    const p1 = { x: start.x + t1 * dx, y: start.y + t1 * dy };
    const p2 = { x: start.x + t2 * dx, y: start.y + t2 * dy };

    return [p1, p2];
  }

  /**
   * Get the unit normal vector (perpendicular to line direction).
   */
  _getNormal(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Rotate 90 degrees
    return { x: -dy / len, y: dx / len };
  }

  /**
   * Generate bezier control point offsets along the cut line.
   * Returns array of { base, offset } for each interior point.
   * base = point on the cut line, offset = perpendicular displacement.
   * The sign of offset determines which side the curve bulges toward.
   */
  _generateCurvePoints(p1, p2, normal) {
    const count = 4;
    const points = [];

    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const base = {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
      };
      // Random offset 5~15px, alternating sign for organic feel
      const magnitude = 5 + Math.random() * 10;
      const sign = (i % 2 === 0) ? 1 : -1;
      points.push({ base, magnitude, sign });
    }

    return points;
  }

  /**
   * Build a clip Path2D for one half.
   * The path: arc on one side of the cut + smooth bezier curve along the cut edge.
   *
   * For side=1, curve offsets are applied as-is (convex).
   * For side=-1, curve offsets are negated (concave), producing the mirror edge.
   *
   * @param {object} p1 - first intersection
   * @param {object} p2 - second intersection
   * @param {Array} curvePoints - interior curve point descriptors
   * @param {object} center - circle center
   * @param {number} radius - circle radius
   * @param {number} side - 1 or -1 (which side of the cut)
   */
  _buildClipPath(p1, p2, curvePoints, center, radius, side) {
    const path = new Path2D();
    const normal = this._cachedNormal;

    // Angles for the arc
    const angle1 = Math.atan2(p1.y - center.y, p1.x - center.x);
    const angle2 = Math.atan2(p2.y - center.y, p2.x - center.x);

    // Draw arc on the correct side
    const counterclockwise = side === -1;
    path.arc(center.x, center.y, radius, angle1, angle2, counterclockwise);

    // Build the curve from p2 back to p1 using quadratic bezier segments.
    // For side A, use offsets as generated. For side B, negate offsets (mirror).
    const resolvedPoints = curvePoints.map(cp => ({
      x: cp.base.x + normal.x * cp.magnitude * cp.sign * side,
      y: cp.base.y + normal.y * cp.magnitude * cp.sign * side,
    }));

    // Use sequential quadratic bezier segments: p2 → c1 → c2 → c3 → c4 → p1
    // Each control point acts as a quadratic bezier control, with midpoints as
    // on-curve points between consecutive control points.
    const allPts = [p2, ...resolvedPoints, p1];

    for (let i = 1; i < allPts.length - 1; i++) {
      const cp = allPts[i];
      // End point is midpoint between this control point and the next
      const next = allPts[i + 1];
      const isLast = i === allPts.length - 2;
      const ex = isLast ? next.x : (cp.x + next.x) / 2;
      const ey = isLast ? next.y : (cp.y + next.y) / 2;
      path.quadraticCurveTo(cp.x, cp.y, ex, ey);
    }

    path.closePath();
    return path;
  }
}
