#!/usr/bin/env node
/*
 * build_vegetation_petitbourg.js
 *
 * Construit /data/vegetation/petitbourg_vegetation.geojson a partir de la
 * couche WFS IGN BDTOPO_V3:zone_de_vegetation pour la commune de Petit-Bourg
 * (97118).
 *
 * - BBOX serree autour de Petit-Bourg
 * - Nettoyage des proprietes (on garde l'essentiel)
 * - Calcul d'une hauteur par defaut (zone tropicale guadeloupeenne)
 * - Estimation surface (m2) via une projection equirectangulaire locale
 * - Estimation biomasse + CO2 stocke (utile mairie / Plan Climat)
 * - Simplification legere des polygones (Douglas-Peucker tolerance ~0.00003 deg ~ 3m)
 *
 * Usage : node build_vegetation_petitbourg.js
 *
 * Pas de dependance externe : on utilise un Douglas-Peucker minimal interne.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BBOX = '16.14,-61.66,16.24,-61.54'; // S,W,N,E (axis lat,lng IGN)
const TYPE = 'BDTOPO_V3:zone_de_vegetation';
const URL = `https://data.geopf.fr/wfs/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(TYPE)}&srsName=urn:ogc:def:crs:EPSG::4326&bbox=${BBOX},urn:ogc:def:crs:EPSG::4326&outputFormat=application/json&count=10000`;

const OUT_DIR = path.resolve(__dirname, '../../data/vegetation');
const OUT_FILE = path.join(OUT_DIR, 'petitbourg_vegetation.geojson');
const META_FILE = path.join(OUT_DIR, 'petitbourg_vegetation.meta.json');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept-Encoding': 'identity' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          const txt = Buffer.concat(chunks).toString('utf8');
          resolve(JSON.parse(txt));
        } catch (e) { reject(e); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─── Douglas-Peucker minimal (sur lng/lat directement, suffisant a notre echelle) ───
function distSqSegment(p, a, b) {
  let x = a[0], y = a[1];
  let dx = b[0] - x, dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = b[0]; y = b[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  const ex = p[0] - x, ey = p[1] - y;
  return ex * ex + ey * ey;
}

function simplifyDP(points, tol) {
  if (points.length < 3) return points;
  const tolSq = tol * tol;
  const out = new Array(points.length).fill(false);
  out[0] = true;
  out[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxDist = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distSqSegment(points[i], points[s], points[e]);
      if (d > maxDist) { maxDist = d; idx = i; }
    }
    if (maxDist > tolSq && idx !== -1) {
      out[idx] = true;
      stack.push([s, idx]);
      stack.push([idx, e]);
    }
  }
  return points.filter((_, i) => out[i]);
}

function simplifyRing(ring, tol) {
  const r = simplifyDP(ring, tol);
  if (r.length < 4) return null; // ring degenere
  // Boucle fermee
  if (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1]) {
    r.push(r[0]);
  }
  return r;
}

function simplifyGeometry(geom, tol) {
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates.map(r => simplifyRing(r, tol)).filter(Boolean);
    if (!rings.length) return null;
    return { type: 'Polygon', coordinates: rings };
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates
      .map(poly => poly.map(r => simplifyRing(r, tol)).filter(Boolean))
      .filter(p => p.length > 0);
    if (!polys.length) return null;
    return { type: 'MultiPolygon', coordinates: polys };
  }
  return geom;
}

// ─── Surface en m2 via projection equirectangulaire locale (assez precise sur ~10km) ───
const R = 6378137; // rayon Terre en m
function ringAreaM2(ring, lat0) {
  // Convertit en metres locaux puis applique la formule de l'aire signee
  const cosLat = Math.cos(lat0 * Math.PI / 180);
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][0] * cosLat * Math.PI / 180 * R;
    const y1 = ring[i][1] * Math.PI / 180 * R;
    const x2 = ring[i + 1][0] * cosLat * Math.PI / 180 * R;
    const y2 = ring[i + 1][1] * Math.PI / 180 * R;
    s += (x1 * y2 - x2 * y1);
  }
  return Math.abs(s / 2);
}

function geometryAreaM2(geom) {
  if (!geom) return 0;
  // lat moyenne pour la projection
  let lat = 16.19;
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0];
    let outer = ringAreaM2(ring, lat);
    for (let i = 1; i < geom.coordinates.length; i++) {
      outer -= ringAreaM2(geom.coordinates[i], lat);
    }
    return Math.max(0, outer);
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.reduce((s, poly) => {
      let outer = ringAreaM2(poly[0], lat);
      for (let i = 1; i < poly.length; i++) outer -= ringAreaM2(poly[i], lat);
      return s + Math.max(0, outer);
    }, 0);
  }
  return 0;
}

// ─── Hauteur estimee selon taille (proxy : grandes masses = forets matures) ───
function estimateHeight(areaM2) {
  // Fourchette plausible Guadeloupe :
  //  - Haie / petit bouquet < 200 m2 -> 4 m
  //  - Bois moyen 200-2000 m2 -> 8 m
  //  - Massif 2000-10000 m2 -> 12 m
  //  - Foret >10000 m2 -> 18 m
  if (areaM2 < 200) return 4;
  if (areaM2 < 2000) return 8;
  if (areaM2 < 10000) return 12;
  return 18;
}

function classify(areaM2) {
  if (areaM2 < 200) return 'Haie / bouquet';
  if (areaM2 < 2000) return 'Bois';
  if (areaM2 < 10000) return 'Massif arbore';
  return 'Foret';
}

(async () => {
  console.log('[veg] Telechargement WFS IGN zone_de_vegetation Petit-Bourg...');
  const raw = await fetchJSON(URL);
  console.log(`[veg] ${raw.features.length} polygones recus.`);

  const tol = 0.00003; // ~3m a cette latitude
  const out = { type: 'FeatureCollection', features: [] };
  let totalArea = 0;
  let dropped = 0;

  for (const f of raw.features) {
    const geom = simplifyGeometry(f.geometry, tol);
    if (!geom) { dropped++; continue; }
    const areaM2 = Math.round(geometryAreaM2(geom));
    if (areaM2 < 80) { dropped++; continue; } // bruit < 80 m2
    const hauteur = estimateHeight(areaM2);
    const classe = classify(areaM2);
    // Volume canopee (m3) : surface au sol * hauteur (utile pour rendu, pas pour biomasse)
    const volumeM3 = areaM2 * hauteur;
    // Biomasse aerienne (t/ha) : valeurs IPCC pour forets tropicales humides Caraibes
    //  - Haie/bouquet (~4m) : ~30 t/ha
    //  - Bois (~8m)        : ~80 t/ha
    //  - Massif (~12m)     : ~150 t/ha
    //  - Foret (~18m)      : ~250 t/ha
    let densiteBiomasseTHa;
    if (hauteur <= 4) densiteBiomasseTHa = 30;
    else if (hauteur <= 8) densiteBiomasseTHa = 80;
    else if (hauteur <= 12) densiteBiomasseTHa = 150;
    else densiteBiomasseTHa = 250;
    const biomasseT = Math.round(areaM2 / 10000 * densiteBiomasseTHa);
    // CO2 stocke : ~0.5 kg C par kg biomasse seche, * 3.67 (C -> CO2)
    const co2T = Math.round(biomasseT * 0.5 * 3.67);

    out.features.push({
      type: 'Feature',
      geometry: geom,
      properties: {
        cleabs: f.properties.cleabs,
        nature: f.properties.nature || 'Zone arboree',
        classe,
        surface_m2: areaM2,
        hauteur_m: hauteur,
        volume_m3: Math.round(volumeM3),
        biomasse_t: biomasseT,
        co2_stocke_t: co2T,
        source: 'BDTOPO IGN'
      }
    });
    totalArea += areaM2;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));

  const meta = {
    commune: 'Petit-Bourg',
    insee: '97118',
    bbox: BBOX,
    source: 'WFS IGN BDTOPO_V3:zone_de_vegetation',
    fetched_at: new Date().toISOString(),
    polygons_in: raw.features.length,
    polygons_out: out.features.length,
    polygons_dropped: dropped,
    surface_totale_ha: Math.round(totalArea / 10000),
    surface_totale_m2: Math.round(totalArea),
    biomasse_totale_t: out.features.reduce((s, f) => s + f.properties.biomasse_t, 0),
    co2_stocke_total_t: out.features.reduce((s, f) => s + f.properties.co2_stocke_t, 0),
    file_size_kb: Math.round(fs.statSync(OUT_FILE).size / 1024),
    simplify_tolerance_deg: tol
  };
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));

  console.log(`[veg] OK -> ${OUT_FILE}`);
  console.log(`[veg] ${out.features.length} polygones (drop=${dropped}), ${meta.file_size_kb} KB, ${meta.surface_totale_ha} ha de couverture vegetale.`);
  console.log(`[veg] Biomasse: ${meta.biomasse_totale_t} tonnes - CO2 stocke: ${meta.co2_stocke_total_t} tonnes.`);
})().catch(e => { console.error(e); process.exit(1); });
