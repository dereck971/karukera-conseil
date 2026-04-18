#!/usr/bin/env node
// wfs2geojson.js
// -----------------------------------------------------------------------------
// Conversion GML 3.2 (sortie standard MapServer / WFS KaruGéo) → GeoJSON
// Sans dépendance GDAL/ogr2ogr — parsing XML manuel + reprojection proj4.
//
// Couvre :
//   - <wfs:FeatureCollection>
//   - <wfs:member><ms:NomCouche gml:id="..."> ... </ms:NomCouche>
//   - <ms:msGeometry><gml:MultiSurface>/<gml:Polygon>/<gml:LineString>/<gml:Point>
//   - <gml:posList srsDimension="2">x y x y x y ...</gml:posList>
//   - Attributs simples (texte) à plat
//
// Reprojection :
//   - GML KaruGéo → EPSG:32620 (UTM 20N)
//   - GeoJSON cible → EPSG:4326 (WGS84) lon/lat
//
// Usage CLI :
//   node lib/wfs2geojson.js <input.gml> <output.geojson> [--src=EPSG:32620] [--dst=EPSG:4326]
//
// Usage programmatique :
//   const { gmlToGeojson } = require('./wfs2geojson');
//   const fc = gmlToGeojson(gmlString, { srcSrs: 'EPSG:32620' });
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

let proj4;
try {
  proj4 = require('proj4');
  proj4.defs('EPSG:32620', '+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs');
  proj4.defs('EPSG:32621', '+proj=utm +zone=21 +datum=WGS84 +units=m +no_defs'); // Saint-Martin
  proj4.defs('EPSG:5490', '+proj=utm +zone=20 +datum=RGAF09 +units=m +no_defs +ellps=GRS80'); // RGAF09
} catch (e) {
  console.warn('[wfs2geojson] proj4 absent — pas de reprojection. npm install proj4');
}

// ─── PARSER XML LÉGER (sans deps) ─────────────────────────────────────────
// Pour des GML simples typiques de MapServer.

/**
 * Trouve toutes les balises <prefix:tagName ...>contenu</prefix:tagName>.
 * Renvoie [{ openTag, content, attrs }]
 */
function findTags(xml, tagName) {
  const re = new RegExp(`<(?:[\\w-]+:)?${tagName}([^>]*)>([\\s\\S]*?)</(?:[\\w-]+:)?${tagName}>`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push({ openTag: m[0].split('>')[0] + '>', content: m[2], attrs: parseAttrs(m[1]) });
  }
  return out;
}

function parseAttrs(s) {
  const out = {};
  const re = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(s)) !== null) out[m[1]] = m[2];
  return out;
}

/**
 * Parse une posList GML : "x y x y x y ..." (srsDimension=2, axis order = x y = easting northing en UTM).
 * Renvoie un tableau [[x,y], [x,y], ...]
 */
function parsePosList(text) {
  const tokens = text.trim().split(/\s+/).map(Number);
  const out = [];
  for (let i = 0; i < tokens.length - 1; i += 2) {
    out.push([tokens[i], tokens[i + 1]]);
  }
  return out;
}

/**
 * Reprojette un anneau [[x,y],...] depuis srcSrs vers EPSG:4326 (lon,lat).
 * Si proj4 absent ou srsSrc déjà 4326 : passthrough.
 */
function reprojectRing(ring, srcSrs) {
  if (!proj4 || srcSrs === 'EPSG:4326') return ring;
  return ring.map(([x, y]) => proj4(srcSrs, 'EPSG:4326', [x, y]));
}

/**
 * Extrait l'EPSG depuis srsName="urn:ogc:def:crs:EPSG::32620" ou "EPSG:32620".
 */
function extractSrs(attrs, fallback) {
  const s = attrs.srsName || '';
  const m = s.match(/EPSG[:]{1,2}(\d+)/);
  return m ? `EPSG:${m[1]}` : fallback;
}

/**
 * Parse une géométrie GML (MultiSurface, Polygon, LineString, Point) en geometry GeoJSON.
 */
function parseGeometry(xml, defaultSrs = 'EPSG:32620') {
  // MultiSurface > surfaceMember > Polygon > exterior > LinearRing > posList
  const ms = findTags(xml, 'MultiSurface')[0];
  if (ms) {
    const srs = extractSrs(ms.attrs, defaultSrs);
    const polys = [];
    findTags(ms.content, 'Polygon').forEach(poly => {
      const ext = findTags(poly.content, 'exterior')[0];
      if (!ext) return;
      const ring = findTags(ext.content, 'LinearRing')[0];
      if (!ring) return;
      const posList = findTags(ring.content, 'posList')[0];
      if (!posList) return;
      const coords = reprojectRing(parsePosList(posList.content), srs);
      const ints = findTags(poly.content, 'interior').map(intr => {
        const r = findTags(intr.content, 'LinearRing')[0];
        if (!r) return null;
        const pl = findTags(r.content, 'posList')[0];
        if (!pl) return null;
        return reprojectRing(parsePosList(pl.content), srs);
      }).filter(Boolean);
      polys.push([coords, ...ints]);
    });
    return { type: 'MultiPolygon', coordinates: polys };
  }

  const poly = findTags(xml, 'Polygon')[0];
  if (poly) {
    const srs = extractSrs(poly.attrs, defaultSrs);
    const ext = findTags(poly.content, 'exterior')[0];
    if (!ext) return null;
    const ring = findTags(ext.content, 'LinearRing')[0];
    if (!ring) return null;
    const posList = findTags(ring.content, 'posList')[0];
    if (!posList) return null;
    const coords = reprojectRing(parsePosList(posList.content), srs);
    return { type: 'Polygon', coordinates: [coords] };
  }

  const line = findTags(xml, 'LineString')[0];
  if (line) {
    const srs = extractSrs(line.attrs, defaultSrs);
    const posList = findTags(line.content, 'posList')[0];
    if (!posList) return null;
    return { type: 'LineString', coordinates: reprojectRing(parsePosList(posList.content), srs) };
  }

  const pt = findTags(xml, 'Point')[0];
  if (pt) {
    const srs = extractSrs(pt.attrs, defaultSrs);
    const pos = findTags(pt.content, 'pos')[0];
    if (!pos) return null;
    const [x, y] = pos.content.trim().split(/\s+/).map(Number);
    const [lon, lat] = proj4 && srs !== 'EPSG:4326' ? proj4(srs, 'EPSG:4326', [x, y]) : [x, y];
    return { type: 'Point', coordinates: [lon, lat] };
  }

  return null;
}

/**
 * Extrait les attributs simples (text-only enfants directs de l'élément feature).
 */
function parseProperties(featureXml) {
  const props = {};
  const re = /<(?:[\w-]+:)?([\w_-]+)(?:\s[^>]*)?>([^<]*)<\/(?:[\w-]+:)?\1>/g;
  let m;
  while ((m = re.exec(featureXml)) !== null) {
    const key = m[1];
    if (['msGeometry', 'boundedBy', 'Envelope', 'lowerCorner', 'upperCorner'].includes(key)) continue;
    const val = m[2].trim();
    if (val.length === 0) continue;
    if (val.includes('<')) continue; // not a leaf
    props[key] = isFinite(Number(val)) && val !== '' ? Number(val) : val;
  }
  return props;
}

/**
 * Conversion principale : GML string → FeatureCollection GeoJSON.
 */
function gmlToGeojson(gml, options = {}) {
  const srcSrs = options.srcSrs || 'EPSG:32620';
  const features = [];

  // Chaque feature est dans <wfs:member><ms:NomCouche>...</ms:NomCouche></wfs:member>
  const members = findTags(gml, 'member');
  for (const mem of members) {
    // L'enfant immédiat est la feature ms:NomCouche
    const featRe = /<ms:([\w_-]+)([^>]*)>([\s\S]*?)<\/ms:\1>/;
    const m = mem.content.match(featRe);
    if (!m) continue;
    const layerName = m[1];
    const featXml = m[3];
    const geom = parseGeometry(featXml, srcSrs);
    if (!geom) continue;
    const props = parseProperties(featXml);
    props._layer = layerName;
    features.push({ type: 'Feature', geometry: geom, properties: props });
  }

  return { type: 'FeatureCollection', features };
}

module.exports = { gmlToGeojson, parsePosList, parseGeometry, findTags };

// ─── CLI ───
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node wfs2geojson.js <input.gml> <output.geojson> [--src=EPSG:32620]');
    process.exit(1);
  }
  const [input, output] = args;
  const srcSrs = (args.find(a => a.startsWith('--src=')) || '--src=EPSG:32620').split('=')[1];
  const gml = fs.readFileSync(input, 'utf8');
  const fc = gmlToGeojson(gml, { srcSrs });
  fs.writeFileSync(output, JSON.stringify(fc));
  console.log(`[wfs2geojson] ${fc.features.length} feature(s) → ${output} (src ${srcSrs})`);
}
