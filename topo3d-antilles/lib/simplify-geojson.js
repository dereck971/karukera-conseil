#!/usr/bin/env node
// simplify-geojson.js
// -----------------------------------------------------------------------------
// Optimise un GeoJSON volumineux (sortie WFS KaruGéo) :
//   1. Filtre les features dont le centroide est hors de la bbox commune (clip strict)
//   2. Simplifie chaque ring via Douglas-Peucker (tolérance en degrés ≈ ~10m)
//   3. Arrondit les coordonnées à 6 décimales (~10 cm précision suffisante carto)
//   4. Filtre les features < seuil de surface minimale
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

function bboxOfRing(ring) {
  let minLon = +Infinity, minLat = +Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}

function centroidOfRing(ring) {
  let sx = 0, sy = 0, n = 0;
  for (const [lon, lat] of ring) { sx += lon; sy += lat; n++; }
  return [sx / n, sy / n];
}

function featureCentroid(f) {
  if (f.geometry.type === 'MultiPolygon') return centroidOfRing(f.geometry.coordinates[0][0]);
  if (f.geometry.type === 'Polygon') return centroidOfRing(f.geometry.coordinates[0]);
  if (f.geometry.type === 'LineString') return centroidOfRing(f.geometry.coordinates);
  if (f.geometry.type === 'Point') return f.geometry.coordinates;
  return null;
}

function inBbox(pt, bbox) {
  return pt[0] >= bbox[0] && pt[0] <= bbox[2] && pt[1] >= bbox[1] && pt[1] <= bbox[3];
}

// ─── Douglas-Peucker simple (sans dependance) ───
function perpendicularDistance(pt, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  if (dx === 0 && dy === 0) {
    const ddx = pt[0] - lineStart[0]; const ddy = pt[1] - lineStart[1];
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }
  const t = ((pt[0] - lineStart[0]) * dx + (pt[1] - lineStart[1]) * dy) / (dx * dx + dy * dy);
  const tt = Math.max(0, Math.min(1, t));
  const px = lineStart[0] + tt * dx;
  const py = lineStart[1] + tt * dy;
  return Math.sqrt((pt[0] - px) ** 2 + (pt[1] - py) ** 2);
}

function douglasPeucker(points, tolerance) {
  if (points.length < 3) return points;
  let maxDist = 0, maxIdx = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i++) {
    const d = perpendicularDistance(points[i], points[0], points[last]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const a = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const b = douglasPeucker(points.slice(maxIdx), tolerance);
    return a.slice(0, -1).concat(b);
  }
  return [points[0], points[last]];
}

function round6(arr) {
  return arr.map(([lon, lat]) => [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]);
}

function simplifyGeometry(geom, tolerance) {
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map(poly =>
        poly.map(ring => round6(douglasPeucker(ring, tolerance)))
          .filter(r => r.length >= 4)
      ).filter(p => p.length > 0)
    };
  }
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map(ring => round6(douglasPeucker(ring, tolerance)))
        .filter(r => r.length >= 4)
    };
  }
  if (geom.type === 'LineString') {
    return { type: 'LineString', coordinates: round6(douglasPeucker(geom.coordinates, tolerance)) };
  }
  return geom;
}

function ringArea(ring) {
  // Aire approximative (en degres² — pour filtrage relatif)
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  }
  return Math.abs(area / 2);
}

function featureArea(f) {
  if (f.geometry.type === 'MultiPolygon') return f.geometry.coordinates.reduce((s, p) => s + ringArea(p[0]), 0);
  if (f.geometry.type === 'Polygon') return ringArea(f.geometry.coordinates[0]);
  return 0;
}

/**
 * Pipeline principal.
 */
function simplifyAndClip(fc, options) {
  const { bbox, tolerance = 0.0001, minAreaDeg2 = 0 } = options;
  const out = [];
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const c = featureCentroid(f);
    if (!c) continue;
    if (bbox && !inBbox(c, bbox)) continue;
    const simp = simplifyGeometry(f.geometry, tolerance);
    if ((simp.type === 'Polygon' && simp.coordinates.length === 0) ||
        (simp.type === 'MultiPolygon' && simp.coordinates.length === 0)) continue;
    const a = featureArea({ geometry: simp });
    if (minAreaDeg2 && a < minAreaDeg2) continue;
    out.push({ type: 'Feature', geometry: simp, properties: f.properties });
  }
  return { type: 'FeatureCollection', features: out };
}

module.exports = { simplifyAndClip, douglasPeucker, simplifyGeometry, featureCentroid };

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: simplify-geojson.js <in.geojson> <out.geojson> [--bbox=lon_min,lat_min,lon_max,lat_max] [--tol=0.0001] [--min-area=0]');
    process.exit(1);
  }
  const [input, output] = args;
  const bboxArg = (args.find(a => a.startsWith('--bbox=')) || '').split('=')[1];
  const tol = parseFloat((args.find(a => a.startsWith('--tol=')) || '--tol=0.0001').split('=')[1]);
  const minArea = parseFloat((args.find(a => a.startsWith('--min-area=')) || '--min-area=0').split('=')[1]);
  const bbox = bboxArg ? bboxArg.split(',').map(Number) : null;

  const fc = JSON.parse(fs.readFileSync(input, 'utf8'));
  console.log(`[simplify] in: ${fc.features.length} features (${(fs.statSync(input).size / 1024 / 1024).toFixed(1)} MB)`);
  const out = simplifyAndClip(fc, { bbox, tolerance: tol, minAreaDeg2: minArea });
  fs.writeFileSync(output, JSON.stringify(out));
  console.log(`[simplify] out: ${out.features.length} features (${(fs.statSync(output).size / 1024).toFixed(1)} KB) tol=${tol}`);
}
