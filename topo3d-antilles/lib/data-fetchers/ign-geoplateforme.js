// ign-geoplateforme.js
// -----------------------------------------------------------------------------
// Helpers pour la Géoplateforme IGN (https://data.geopf.fr).
// Couvre WMS, WMTS, services API (apicarto cadastre, api adresse, etc.).
//
// Endpoints utilisés :
//   - https://data.geopf.fr/wms-r/wms      (raster — ortho, hillshade, MH)
//   - https://data.geopf.fr/wms-v/ows      (vector — PLU)
//   - https://data.geopf.fr/wmts           (tuiles WMTS — ortho, IGN scan)
//   - https://apicarto.ign.fr              (services REST cadastre, GPU…)
//   - https://api-adresse.data.gouv.fr     (BAN — geocoding / reverse)
//
// Toutes ces couches sont libres (Licence Etalab 2.0).
// -----------------------------------------------------------------------------

const WMS_RASTER = 'https://data.geopf.fr/wms-r/wms';
const WMS_VECTOR = 'https://data.geopf.fr/wms-v/ows';
const WMTS = 'https://data.geopf.fr/wmts';
const APICARTO = 'https://apicarto.ign.fr/api';
const ADRESSE = 'https://api-adresse.data.gouv.fr';

/**
 * Construit une URL WMS GetMap pour MapLibre (template avec {bbox-epsg-3857}).
 */
function buildWmsTileUrl(layerName, opts = {}) {
  const base = opts.vector ? WMS_VECTOR : WMS_RASTER;
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    LAYERS: layerName,
    CRS: 'EPSG:3857',
    BBOX: '{bbox-epsg-3857}',
    WIDTH: '256',
    HEIGHT: '256',
    FORMAT: opts.format || 'image/png',
    TRANSPARENT: opts.transparent !== false ? 'true' : 'false',
    STYLES: opts.styles || ''
  });
  // MapLibre n'encode pas {bbox-epsg-3857} → on doit garder les accolades
  return `${base}?${params.toString()}`.replace('%7Bbbox-epsg-3857%7D', '{bbox-epsg-3857}');
}

/**
 * Construit une URL WMTS GetTile (template avec {z}/{x}/{y}).
 */
function buildWmtsTileUrl(layerName, opts = {}) {
  const params = new URLSearchParams({
    SERVICE: 'WMTS',
    REQUEST: 'GetTile',
    VERSION: '1.0.0',
    LAYER: layerName,
    TILEMATRIXSET: opts.matrixSet || 'PM',
    TILEMATRIX: '{z}',
    TILEROW: '{y}',
    TILECOL: '{x}',
    FORMAT: opts.format || 'image/png',
    STYLE: opts.style || 'normal'
  });
  return `${WMTS}?${params.toString()}`
    .replace('%7Bz%7D', '{z}')
    .replace('%7By%7D', '{y}')
    .replace('%7Bx%7D', '{x}');
}

/**
 * Couches IGN couramment utilisées sur la plateforme (raccourcis).
 */
const LAYERS = {
  ORTHO_WMTS: { fn: 'wmts', layer: 'ORTHOIMAGERY.ORTHOPHOTOS', opts: { format: 'image/jpeg' } },
  PLAN_IGN_WMTS: { fn: 'wmts', layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' },
  CADASTRE_WMS: { fn: 'wms', layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS' },
  PPR_WMS: { fn: 'wms', layer: 'GEOGRAPHICALGRIDSYSTEMS.1702_PPR' },
  PLU_ZONE_WMS: { fn: 'wms', layer: 'zone_urba', opts: { vector: true } },
  PLU_PRESCRIP_WMS: { fn: 'wms', layer: 'prescription_surf', opts: { vector: true } },
  MONUMENTS_HIST_WMS: { fn: 'wms', layer: 'PROTECTEDSITES.MNHN.MONUMENTS_HISTORIQUES.PERIMETRES' },
  HYDRO_WMS: { fn: 'wms', layer: 'HYDROGRAPHY.HYDROGRAPHY' },
  LIDAR_HD_MNT: { fn: 'wmts', layer: 'IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW' },
  LIDAR_HD_MNS: { fn: 'wmts', layer: 'IGNF_LIDAR-HD_MNS_ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW' },
  LIDAR_HD_MNH: { fn: 'wmts', layer: 'IGNF_LIDAR-HD_MNH_ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW' }
};

function urlForLayer(key) {
  const def = LAYERS[key];
  if (!def) throw new Error(`Unknown IGN layer: ${key}`);
  return def.fn === 'wmts' ? buildWmtsTileUrl(def.layer, def.opts) : buildWmsTileUrl(def.layer, def.opts);
}

/**
 * Reverse geocoding via API Adresse BAN (data.gouv.fr).
 */
async function reverseGeocode(lon, lat) {
  const r = await fetch(`${ADRESSE}/reverse/?lon=${lon}&lat=${lat}&limit=1`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.features && j.features[0] ? j.features[0].properties.label : null;
}

/**
 * Récupère la parcelle cadastrale couvrant un point (lon, lat) — apicarto IGN.
 */
async function fetchParcelleAtPoint(lon, lat) {
  const geom = encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }));
  const r = await fetch(`${APICARTO}/cadastre/parcelle?geom=${geom}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.features && j.features[0] ? j.features[0] : null;
}

module.exports = {
  WMS_RASTER, WMS_VECTOR, WMTS, APICARTO, ADRESSE,
  LAYERS,
  buildWmsTileUrl,
  buildWmtsTileUrl,
  urlForLayer,
  reverseGeocode,
  fetchParcelleAtPoint
};
