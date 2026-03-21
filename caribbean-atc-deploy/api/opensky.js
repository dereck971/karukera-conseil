/**
 * Caribbean ATC Pro — OpenSky Network Proxy
 * Vercel Serverless Function
 *
 * Proxies OpenSky API with in-memory cache (10s TTL)
 * Bounding box: Caribbean region (lat 8-28°N, lon -90 to -58°W)
 *
 * Endpoints:
 *   GET /api/opensky              → All state vectors in Caribbean bbox
 *   GET /api/opensky?icao24=abc   → Single aircraft by ICAO24 address
 *   GET /api/opensky?airport=TFFR&type=arrival   → Arrivals at airport
 *   GET /api/opensky?airport=TFFR&type=departure → Departures from airport
 */

// In-memory cache (persists across warm invocations)
let statesCache = { data: null, timestamp: 0 };
const CACHE_TTL = 10_000; // 10 seconds

// Caribbean bounding box
const BBOX = {
  lamin: 8,
  lamax: 28,
  lomin: -90,
  lomax: -58
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { icao24, airport, type } = req.query;

  try {
    // --- Single aircraft tracking ---
    if (icao24) {
      const url = `https://opensky-network.org/api/states/all?icao24=${encodeURIComponent(icao24.toLowerCase())}`;
      const data = await fetchOpenSky(url);
      return res.status(200).json(formatStates(data));
    }

    // --- Airport arrivals/departures ---
    if (airport) {
      const now = Math.floor(Date.now() / 1000);
      const begin = now - 7200; // Last 2 hours
      const endpoint = type === 'departure' ? 'departure' : 'arrival';
      const url = `https://opensky-network.org/api/flights/${endpoint}?airport=${encodeURIComponent(airport.toUpperCase())}&begin=${begin}&end=${now}`;
      const data = await fetchOpenSky(url);
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

    const url = `https://opensky-network.org/api/states/all?lamin=${BBOX.lamin}&lomin=${BBOX.lomin}&lamax=${BBOX.lamax}&lomax=${BBOX.lomax}`;
    const data = await fetchOpenSky(url);
    const formatted = formatStates(data);

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

async function fetchOpenSky(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CaribbeanATCPro/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenSky responded ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Transform OpenSky state vectors into a cleaner format
 * OpenSky returns: [icao24, callsign, origin_country, time_position, last_contact,
 *                   longitude, latitude, baro_altitude, on_ground, velocity,
 *                   true_track, vertical_rate, sensors, geo_altitude,
 *                   squawk, spi, position_source, category]
 */
function formatStates(data) {
  if (!data || !data.states) {
    return { time: Math.floor(Date.now() / 1000), flights: [], count: 0 };
  }

  const flights = data.states
    .filter(s => s[6] !== null && s[5] !== null) // Must have lat/lng
    .map(s => ({
      icao24: s[0],
      callsign: (s[1] || '').trim(),
      origin_country: s[2],
      latitude: s[6],
      longitude: s[5],
      altitude: s[7] !== null ? Math.round(s[7] * 3.28084) : null, // meters → feet
      on_ground: s[8],
      speed: s[9] !== null ? Math.round(s[9] * 1.94384) : null, // m/s → knots
      heading: s[10] !== null ? Math.round(s[10]) : null,
      vertical_rate: s[11] !== null ? Math.round(s[11] * 196.85) : null, // m/s → ft/min
      geo_altitude: s[13] !== null ? Math.round(s[13] * 3.28084) : null,
      squawk: s[14],
      category: s[17]
    }));

  return {
    time: data.time,
    flights: flights,
    count: flights.length,
    bbox: BBOX
  };
}
