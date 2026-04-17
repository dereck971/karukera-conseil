#!/usr/bin/env node
// karugeo.js
// -----------------------------------------------------------------------------
// Helpers pour interroger le portail SIG KaruGéo (DEAL/DAAF Guadeloupe).
// Endpoints :
//   - WMS  : https://datacarto.karugeo.fr/wms
//   - WFS  : https://datacarto.karugeo.fr/wfs
//   - CSW  : https://www.karugeo.fr/geonetwork/srv/fre/csw-INSPIRE
// Projection native : EPSG:32620 (UTM 20N).
//
// Couches connues utiles (mis à jour 17/04/2026) :
//   - ms:couche_unifiees_defrichement_2024  (WFS uniquement)
//   - ms:ocs_foret_2013                      (proxy occupation forêt)
//   - ms:forestier_hr_clc_2012               (espaces forestiers CLC)
//   - ms:mh_202_merimee                      (monuments historiques Mérimée)
//
// Usage CLI :
//   node lib/data-fetchers/karugeo.js fetch-defrichement <commune-slug> <bbox-utm>
//   ex : node lib/data-fetchers/karugeo.js fetch-defrichement petit-bourg "644338,1786553,660298,1797730"
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const https = require('https');

const WFS_BASE = 'https://datacarto.karugeo.fr/wfs';
const WMS_BASE = 'https://datacarto.karugeo.fr/wms';

// BBOX (lon_min, lat_min, lon_max, lat_max) approximatives en WGS84 par commune
// À enrichir au fur et à mesure que de nouvelles communes sont onboardées.
const COMMUNE_BBOX_WGS84 = {
  // Code INSEE confirmé via COG officiel + Wikipedia (17/04/2026)
  'petit-bourg':    { sw: [-61.65, 16.155], ne: [-61.50, 16.255], code: '97118' },
  'pap':            { sw: [-61.55, 16.225], ne: [-61.520, 16.250], code: '97120' },
  'sainte-anne':    { sw: [-61.40, 16.215], ne: [-61.30, 16.290], code: '97128' },
  'morne-a-leau':   { sw: [-61.51, 16.300], ne: [-61.36, 16.400], code: '97116' },
  'baie-mahault':   { sw: [-61.62, 16.230], ne: [-61.55, 16.295], code: '97103' },
  'sainte-rose':    { sw: [-61.74, 16.270], ne: [-61.65, 16.360], code: '97127' },
  // À étendre…
};

/**
 * Reprojette une bbox WGS84 (sw, ne) en EPSG:32620 (UTM 20N).
 * Renvoie [minx, miny, maxx, maxy] en mètres.
 */
function bboxWgs84ToUtm20(swLonLat, neLonLat) {
  let proj4;
  try {
    proj4 = require('proj4');
    proj4.defs('EPSG:32620', '+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs');
  } catch (e) {
    throw new Error('proj4 manquant : npm install proj4');
  }
  const sw = proj4('EPSG:4326', 'EPSG:32620', swLonLat);
  const ne = proj4('EPSG:4326', 'EPSG:32620', neLonLat);
  return [sw[0], sw[1], ne[0], ne[1]];
}

/**
 * Construit l'URL WFS GetFeature pour une couche.
 */
function buildWfsGetFeatureUrl(typeName, bboxUtm20, count = 500, startIndex = 0) {
  const bboxStr = `${bboxUtm20.join(',')},EPSG:32620`;
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: typeName,
    srsName: 'EPSG:32620',
    bbox: bboxStr,
    count: String(count),
    startIndex: String(startIndex)
  });
  return `${WFS_BASE}?${params.toString()}`;
}

/**
 * Télécharge un GML. Promise<string>.
 */
function downloadGml(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} on ${url}`));
        return;
      }
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

/**
 * Filtre un FeatureCollection GeoJSON par bbox (lon_min, lat_min, lon_max, lat_max) WGS84.
 * Garde toute feature dont l'enveloppe intersecte la bbox.
 */
function clipFeatureCollection(fc, bboxWgs84) {
  const [minLon, minLat, maxLon, maxLat] = bboxWgs84;
  const inside = (lon, lat) => lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
  const intersects = (geom) => {
    const flatten = (arr, depth) => {
      if (depth === 0) return [arr]; // [lon,lat]
      return arr.flatMap(a => flatten(a, depth - 1));
    };
    let pts;
    if (geom.type === 'Point') pts = [geom.coordinates];
    else if (geom.type === 'LineString' || geom.type === 'MultiPoint') pts = geom.coordinates;
    else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') pts = geom.coordinates.flat();
    else if (geom.type === 'MultiPolygon') pts = geom.coordinates.flat(2);
    else return false;
    return pts.some(([lon, lat]) => inside(lon, lat));
  };
  return {
    type: 'FeatureCollection',
    features: fc.features.filter(f => f.geometry && intersects(f.geometry))
  };
}

/**
 * Pipeline complet : fetch défrichement DAAF pour une commune.
 */
async function fetchDefrichementForCommune(communeSlug, outputPath) {
  const bbox = COMMUNE_BBOX_WGS84[communeSlug];
  if (!bbox) throw new Error(`Commune inconnue : ${communeSlug}. Ajouter dans COMMUNE_BBOX_WGS84.`);
  const bboxUtm = bboxWgs84ToUtm20(bbox.sw, bbox.ne);
  console.log(`[karugeo] Commune ${communeSlug} (${bbox.code}) — bbox UTM : ${bboxUtm.join(', ')}`);

  // Pagination : on récupère batchs de 500
  let allGml = '';
  let startIndex = 0;
  let header = '';
  let footer = '';
  for (let page = 0; page < 10; page++) {
    const url = buildWfsGetFeatureUrl('ms:couche_unifiees_defrichement_2024', bboxUtm, 500, startIndex);
    console.log(`[karugeo]   page ${page} (startIndex=${startIndex})…`);
    const gml = await downloadGml(url);
    if (page === 0) {
      const fcOpen = gml.match(/<wfs:FeatureCollection[^>]*>/);
      header = gml.slice(0, gml.indexOf(fcOpen[0]) + fcOpen[0].length);
      footer = '</wfs:FeatureCollection>';
      allGml = header;
    }
    // Extraire <wfs:member>…</wfs:member>
    const members = gml.match(/<wfs:member>[\s\S]*?<\/wfs:member>/g) || [];
    allGml += members.join('\n');
    if (members.length < 500) break;
    startIndex += 500;
  }
  allGml += footer;

  // Convertir GML → GeoJSON via wfs2geojson
  const { gmlToGeojson } = require('../wfs2geojson');
  const fc = gmlToGeojson(allGml, { srcSrs: 'EPSG:32620' });
  console.log(`[karugeo]   ${fc.features.length} feature(s) extraites → reprojection 4326`);

  // Clip pour ne garder que ce qui touche la commune
  const bboxWgs84 = [bbox.sw[0], bbox.sw[1], bbox.ne[0], bbox.ne[1]];
  const clipped = clipFeatureCollection(fc, bboxWgs84);
  console.log(`[karugeo]   ${clipped.features.length} feature(s) après clip bbox commune`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(clipped));
  console.log(`[karugeo] OK → ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
  return clipped;
}

module.exports = {
  WFS_BASE, WMS_BASE,
  COMMUNE_BBOX_WGS84,
  bboxWgs84ToUtm20,
  buildWfsGetFeatureUrl,
  downloadGml,
  clipFeatureCollection,
  fetchDefrichementForCommune
};

// ─── CLI ───
if (require.main === module) {
  const [cmd, communeSlug, customBbox] = process.argv.slice(2);
  if (cmd === 'fetch-defrichement' && communeSlug) {
    const out = path.resolve(__dirname, '..', '..', 'data', 'cadastre', `defrichement_${communeSlug}.geojson`);
    fetchDefrichementForCommune(communeSlug, out).catch(e => { console.error(e.message); process.exit(1); });
  } else {
    console.log('Usage: node karugeo.js fetch-defrichement <commune-slug>');
    console.log('Communes connues :', Object.keys(COMMUNE_BBOX_WGS84).join(', '));
  }
}
