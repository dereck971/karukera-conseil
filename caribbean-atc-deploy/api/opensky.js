/**
 * Caribbean ATC Pro — OpenSky Network Proxy
 * Vercel Serverless Function
 *
 * Proxies OpenSky API with in-memory cache (15s TTL)
 * Bounding box: Caribbean region (lat 10-26°N, lon -86 to -59°W)
 * Fallback: smaller Antilles-only bbox if full bbox times out
 */

// In-memory cache (persists across warm invocations)
let statesCache = { data: null, timestamp: 0 };
const CACHE_TTL = 15_000; // 15 seconds

// Caribbean bounding box (tightened to reduce response size)
const BBOX = {
  lamin: 10,
  lamax: 26,
  lomin: -86,
  lomax: -59
};

// Smaller fallback: just the Antilles arc
const BBOX_SMALL = {
  lamin: 12,
  lamax: 20,
  lomin: -68,
  lomax: -59
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=10');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { icao24, airport, type } = req.query;

  try {
    // --- Single aircraft tracking ---
    if (icao24) {
      const url = `https://opensky-network.org/api/states/all?icao24=${encodeURIComponent(icao24.toLowerCase())}`;
      const data = await fetchOpenSky(url, 8000);
      return res.status(200).json(formatStates(data, BBOX));
    }

    // --- Airport arrivals/departures ---
    if (airport) {
      const now = Math.floor(Date.now() / 1000);
      const begin = now - 7200;
      const endpoint = type === 'departure' ? 'departure' : 'arrival';
      const url = `https://opensky-network.org/api/flights/${endpoint}?airport=${encodeURIComponent(airport.toUpperCase())}&begin=${begin}&end=${now}`;
      const data = await fetchOpenSky(url, 8000);
      return res.status(200).json(data || []);
    }

    // --- All states in Caribbean bbox (cached) ---
    const now = Date.now();
    if (statesCache.data && (now - statesCache.timestamp) < CACHE_TTL) {
      return res.status(200).json({
        ...statesCache.data,
        cached: true,
        cache_age_ms: now - statesCache.timestamp
      });
    }

    // Use small bbox (Antilles) as primary — full Caribbean bbox too slow
    let data;
    let usedBbox = BBOX_SMALL;
    const url = bboxUrl(BBOX_SMALL);
    data = await fetchOpenSky(url, 8000);

    const formatted = formatStates(data, usedBbox);
    statesCache = { data: formatted, timestamp: now };

    return res.status(200).json({ ...formatted, cached: false });

  } catch (error) {
    console.error('OpenSky API error:', error.message);

    // Serve stale cache if available
    if (statesCache.data) {
      return res.status(200).json({
        ...statesCache.data,
        cached: true,
        stale: true,
        error: error.message
      });
    }

    return res.status(502).json({
      error: 'OpenSky API unavailable',
      message: error.message,
      fallback: true
    });
  }
}

function bboxUrl(bbox) {
  return `https://opensky-network.org/api/states/all?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;
}

async function fetchOpenSky(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CaribbeanATCPro/1.0' }
    });

    if (!response.ok) {
      throw new Error(`OpenSky ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Transform OpenSky state vectors into a cleaner format
 * [icao24, callsign, origin_country, time_position, last_contact,
 *  longitude, latitude, baro_altitude, on_ground, velocity,
 *  true_track, vertical_rate, sensors, geo_altitude,
 *  squawk, spi, position_source, category]
 */
function formatStates(data, bbox) {
  if (!data || !data.states) {
    return { time: Math.floor(Date.now() / 1000), flights: [], count: 0 };
  }

  const flights = data.states
    .filter(s => s[6] !== null && s[5] !== null)
    .map(s => ({
      icao24: s[0],
      callsign: (s[1] || '').trim(),
      origin_country: s[2],
      latitude: s[6],
      longitude: s[5],
      altitude: s[7] !== null ? Math.round(s[7] * 3.28084) : null,
      on_ground: s[8],
      speed: s[9] !== null ? Math.round(s[9] * 1.94384) : null,
      heading: s[10] !== null ? Math.round(s[10]) : null,
      vertical_rate: s[11] !== null ? Math.round(s[11] * 196.85) : null,
      geo_altitude: s[13] !== null ? Math.round(s[13] * 3.28084) : null,
      squawk: s[14],
      category: s[17]
    }));

  return {
    time: data.time,
    flights,
    count: flights.length,
    bbox
  };
}
