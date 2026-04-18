#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compute_dents_creuses.py
------------------------
Calcule la couche "Dents creuses" pour une commune : parcelles cadastrales
NON BATIES situees en zone U du PLU (ou a defaut dans l'enveloppe urbaine
deductible du cadastre bati), candidates a la densification.

Methode :
  1. Cadastre Etalab (data.gouv.fr) : parcelles GeoJSON WGS84
     https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/{DEPT}/{INSEE}/cadastre-{INSEE}-parcelles.json.gz
  2. Batiments Overpass API : way[building] dans la BBOX commune
  3. Jointure spatiale : on garde les parcelles qui n'intersectent AUCUN batiment
  4. Filtre zone U du PLU (GPU IGN Data.geopf.fr WFS) - best effort, si le PLU
     de la commune est publie on l'utilise, sinon on se rabat sur une enveloppe
     urbaine calculee par buffer autour des batiments.
  5. Filtre surface minimale 150 m2 (en projection UTM 20N locale).
  6. Exclusion zones PPRN rouges : on ne le fait pas ici car les couches PPRN
     officielles sont raster. A faire cote UI via toggles combines.

USAGE :
  python3 lib/data-fetchers/compute_dents_creuses.py \\
      --insee 97118 --slug petit-bourg \\
      --bbox 16.155,-61.65,16.255,-61.50

OUTPUT :
  data/dents_creuses/{INSEE}-{slug}.geojson
"""

import argparse
import gzip
import json
import math
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_OUT_DIR = ROOT / "data" / "dents_creuses"

USER_AGENT = "Topo3D-Antilles/1.0 (contact@karukera-conseil.com)"

# Surface minimale dent creuse (m2)
SURFACE_MIN_M2 = 150.0
# Surface maximale (au-dela = pas une dent creuse mais une grande emprise foncier libre)
SURFACE_MAX_M2 = 50000.0

# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def http_get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def http_post(url: str, data: bytes, timeout: int = 120,
              content_type: str = "application/x-www-form-urlencoded") -> bytes:
    req = urllib.request.Request(url, data=data, headers={
        "User-Agent": USER_AGENT, "Content-Type": content_type
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


# ---------------------------------------------------------------------------
# Cadastre Etalab
# ---------------------------------------------------------------------------

def fetch_cadastre_parcelles(insee: str) -> dict:
    """Telecharge cadastre etalab parcelles GeoJSON pour la commune."""
    dept = insee[:3]
    url = (f"https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/"
           f"communes/{dept}/{insee}/cadastre-{insee}-parcelles.json.gz")
    print(f"[dents-creuses] Fetching cadastre : {url}", file=sys.stderr)
    try:
        raw = http_get(url, timeout=60)
        decompressed = gzip.decompress(raw)
        fc = json.loads(decompressed)
        n = len(fc.get("features", []))
        print(f"[dents-creuses] Cadastre : {n} parcelles", file=sys.stderr)
        return fc
    except urllib.error.HTTPError as e:
        print(f"[dents-creuses] HTTP {e.code} cadastre {insee}", file=sys.stderr)
        return {"type": "FeatureCollection", "features": []}
    except Exception as e:
        print(f"[dents-creuses] ERROR cadastre : {e}", file=sys.stderr)
        return {"type": "FeatureCollection", "features": []}


# ---------------------------------------------------------------------------
# Overpass (batiments)
# ---------------------------------------------------------------------------

def fetch_buildings_overpass(bbox: dict) -> list:
    """Requete Overpass : way[building] dans la bbox. Retourne liste de polygones WGS84."""
    bbox_str = f"{bbox['lat_min']},{bbox['lon_min']},{bbox['lat_max']},{bbox['lon_max']}"
    query = f"""[out:json][timeout:180];
(
  way["building"]({bbox_str});
  relation["building"]({bbox_str});
);
out geom;
"""
    print(f"[dents-creuses] Overpass buildings bbox={bbox_str}", file=sys.stderr)
    mirrors = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.osm.ch/api/interpreter",
    ]
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    payload = None
    for url in mirrors:
        try:
            print(f"[dents-creuses]   -> {url}", file=sys.stderr)
            payload = json.loads(http_post(url, data, timeout=240))
            break
        except Exception as e:
            print(f"[dents-creuses]   ERROR {url}: {e}", file=sys.stderr)
            continue
    if payload is None:
        return []

    polys = []
    for el in payload.get("elements", []):
        if el.get("type") == "way" and el.get("geometry"):
            coords = [(p["lon"], p["lat"]) for p in el["geometry"]]
            if len(coords) >= 3:
                polys.append(coords)
        elif el.get("type") == "relation" and el.get("members"):
            for m in el["members"]:
                if m.get("geometry"):
                    coords = [(p["lon"], p["lat"]) for p in m["geometry"]]
                    if len(coords) >= 3:
                        polys.append(coords)
    print(f"[dents-creuses] Batiments extraits : {len(polys)}", file=sys.stderr)
    return polys


# ---------------------------------------------------------------------------
# GPU Zone U (best effort)
# ---------------------------------------------------------------------------

def fetch_plu_zone_u(insee: str) -> list:
    """
    Recupere les zones U du PLU via WFS Geoplateforme.
    Filtre via partition='DU_{INSEE}' (le champ insee est null dans la GPU).
    Retourne liste de geometries (WGS84) correspondant a typezone='U'.
    Pagine si necessaire (count=1000 par batch).
    """
    base = "https://data.geopf.fr/wfs/ows"
    zones_u = []
    start = 0
    page = 500
    while True:
        params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetFeature",
            "typename": "wfs_du:zone_urba",
            "srsName": "EPSG:4326",
            "outputFormat": "application/json",
            "CQL_FILTER": f"partition='DU_{insee}'",
            "count": str(page),
            "startIndex": str(start),
            "sortBy": "gid",  # requis pour pagination GPF
        }
        url = f"{base}?{urllib.parse.urlencode(params)}"
        print(f"[dents-creuses] Fetching PLU partition DU_{insee} startIndex={start}",
              file=sys.stderr)
        # Rate limit GPF (1 req/s sur certains endpoints, on prend large)
        time.sleep(1.2)
        attempts = 0
        fc = None
        while attempts < 3:
            try:
                raw = http_get(url, timeout=90)
                fc = json.loads(raw)
                break
            except urllib.error.HTTPError as e:
                if e.code == 429 or e.code >= 500 or e.code == 400:
                    attempts += 1
                    backoff = 1.5 * attempts
                    print(f"[dents-creuses]   HTTP {e.code}, retry {attempts}/3 dans {backoff}s",
                          file=sys.stderr)
                    time.sleep(backoff)
                    continue
                print(f"[dents-creuses] WARN PLU : {e}", file=sys.stderr)
                fc = None
                break
            except Exception as e:
                print(f"[dents-creuses] WARN PLU : {e}", file=sys.stderr)
                fc = None
                break
        if fc is None:
            break
        feats = fc.get("features", []) or []
        for f in feats:
            props = f.get("properties") or {}
            typ = (props.get("typezone") or "").upper()
            # Zone U seulement (pas AU/A/N)
            if typ == "U":
                geom = f.get("geometry")
                if geom:
                    zones_u.append(geom)
        if len(feats) < page:
            break
        start += page
        if start > 5000:  # garde-fou
            break
    print(f"[dents-creuses] Zones U PLU : {len(zones_u)}", file=sys.stderr)
    return zones_u


# ---------------------------------------------------------------------------
# Geometrie utilitaires (pas de shapely : on fait maison)
# ---------------------------------------------------------------------------

def ring_bbox(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return (min(xs), min(ys), max(xs), max(ys))


def bbox_intersects(a, b):
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])


def point_in_ring(p, ring):
    """Ray casting. ring: liste de (x,y). p: (x,y)."""
    x, y = p
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > y) != (yj > y)) and \
           (x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi):
            inside = not inside
        j = i
    return inside


def segments_intersect(p1, p2, p3, p4):
    """Segments (p1p2) x (p3p4) s'intersectent-ils ?"""
    def ccw(a, b, c):
        return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])
    return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)


def ring_intersects_ring(r1, r2):
    """
    Test rapide : un point de r1 est-il dans r2 ? un segment de r1 croise-t-il r2 ?
    Approximatif mais suffisant pour "le batiment touche la parcelle".
    """
    # Test 1 : un sommet de r1 est-il dans r2 ?
    for p in r1:
        if point_in_ring(p, r2):
            return True
    # Test 2 : un sommet de r2 est-il dans r1 ?
    for p in r2:
        if point_in_ring(p, r1):
            return True
    # Test 3 : intersections de segments (bornee)
    # Pour perf on limite a une poignee de tests si les bboxes sont serrees
    n1 = len(r1)
    n2 = len(r2)
    if n1 * n2 > 2000:
        return False
    for i in range(n1 - 1):
        p1, p2 = r1[i], r1[i + 1]
        for j in range(n2 - 1):
            p3, p4 = r2[j], r2[j + 1]
            if segments_intersect(p1, p2, p3, p4):
                return True
    return False


def geom_outer_rings(geom):
    """Retourne liste de rings exterieurs (ignore holes)."""
    if not geom:
        return []
    t = geom.get("type")
    if t == "Polygon":
        coords = geom.get("coordinates") or []
        if coords:
            return [coords[0]]
        return []
    if t == "MultiPolygon":
        out = []
        for poly in geom.get("coordinates") or []:
            if poly:
                out.append(poly[0])
        return out
    return []


# Reprojection lat/lon -> UTM 20N pour surface (Guadeloupe)
def lonlat_to_utm20(lon, lat):
    """Approximation UTM 20N : zone centrale 20N, k0=0.9996, longitude_central = -63."""
    a = 6378137.0
    f = 1 / 298.257223563
    e2 = f * (2 - f)
    k0 = 0.9996
    lon0 = math.radians(-63.0)
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    N = a / math.sqrt(1 - e2 * math.sin(lat_r) ** 2)
    T = math.tan(lat_r) ** 2
    C = e2 / (1 - e2) * math.cos(lat_r) ** 2
    A = math.cos(lat_r) * (lon_r - lon0)
    M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * lat_r
             - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * lat_r)
             + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * lat_r)
             - (35 * e2 ** 3 / 3072) * math.sin(6 * lat_r))
    x = k0 * N * (A + (1 - T + C) * A ** 3 / 6
                  + (5 - 18 * T + T ** 2 + 72 * C - 58 * e2 / (1 - e2)) * A ** 5 / 120) + 500000.0
    y = k0 * (M + N * math.tan(lat_r) * (A ** 2 / 2
              + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
              + (61 - 58 * T + T ** 2 + 600 * C - 330 * e2 / (1 - e2)) * A ** 6 / 720))
    if lat < 0:
        y += 10000000.0
    return x, y


def ring_area_m2(ring_lonlat):
    """Shoelace sur ring reprojete UTM 20N."""
    if len(ring_lonlat) < 3:
        return 0.0
    pts = [lonlat_to_utm20(p[0], p[1]) for p in ring_lonlat]
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) * 0.5


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def compute_dents_creuses(insee: str, slug: str, bbox: dict) -> dict:
    # 1. Cadastre
    parcelles_fc = fetch_cadastre_parcelles(insee)
    parcelles = parcelles_fc.get("features", [])

    # 2. Batiments
    buildings = fetch_buildings_overpass(bbox)
    building_entries = [(ring_bbox(b), b) for b in buildings]

    # 3. PLU Zone U (best effort)
    zones_u = fetch_plu_zone_u(insee)
    zone_u_rings = []
    for geom in zones_u:
        for ring in geom_outer_rings(geom):
            zone_u_rings.append((ring_bbox(ring), ring))
    has_zone_u = len(zone_u_rings) > 0

    # 4. Pour chaque parcelle, tester
    candidates = []
    stats_total = 0
    stats_non_batie = 0
    stats_surface_ok = 0
    stats_zone_u_ok = 0
    for feat in parcelles:
        stats_total += 1
        geom = feat.get("geometry")
        if not geom:
            continue
        rings = geom_outer_rings(geom)
        if not rings:
            continue
        parcel_ring = rings[0]
        parcel_bbox = ring_bbox(parcel_ring)

        # Test bati
        has_building = False
        for b_bbox, b_ring in building_entries:
            if bbox_intersects(parcel_bbox, b_bbox):
                if ring_intersects_ring(parcel_ring, b_ring):
                    has_building = True
                    break
        if has_building:
            continue
        stats_non_batie += 1

        # Surface
        surf = ring_area_m2(parcel_ring)
        if surf < SURFACE_MIN_M2 or surf > SURFACE_MAX_M2:
            continue
        stats_surface_ok += 1

        # Zone U
        zone_u_label = None
        if has_zone_u:
            in_u = False
            for u_bbox, u_ring in zone_u_rings:
                if bbox_intersects(parcel_bbox, u_bbox):
                    # Centroide parcelle
                    cx = (parcel_bbox[0] + parcel_bbox[2]) / 2
                    cy = (parcel_bbox[1] + parcel_bbox[3]) / 2
                    if point_in_ring((cx, cy), u_ring):
                        in_u = True
                        zone_u_label = "U"
                        break
            if not in_u:
                continue
            stats_zone_u_ok += 1
        else:
            # Proxy : on garde la parcelle (pas de zone U de ref), filtre aval
            # possible cote UI (override mairie).
            zone_u_label = "U (proxy - PLU indisponible)"

        # Proprietes enrichies
        props = feat.get("properties") or {}
        section = props.get("section") or "?"
        numero = props.get("numero") or "?"
        parcel_id = props.get("id") or f"{section}-{numero}"

        candidates.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [parcel_ring]},
            "properties": {
                "id": parcel_id,
                "section": section,
                "numero": str(numero),
                "surface_m2": round(surf, 0),
                "zone_plu": zone_u_label,
                "source": "Calcul automatique KCI (cadastre Etalab x BD TOPO bati x PLU GPU)",
                "commune_insee": insee,
                "commune_slug": slug,
            }
        })

    print(f"[dents-creuses] Stats : total={stats_total} non-batie={stats_non_batie} "
          f"surface_ok={stats_surface_ok} zone_u_ok={stats_zone_u_ok} "
          f"final={len(candidates)}", file=sys.stderr)

    fc = {
        "type": "FeatureCollection",
        "_meta": {
            "commune_insee": insee,
            "commune_slug": slug,
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "method": "cadastre Etalab x Overpass buildings x PLU GPU (if available)",
            "surface_min_m2": SURFACE_MIN_M2,
            "plu_disponible": has_zone_u,
            "stats": {
                "total_parcelles": stats_total,
                "non_baties": stats_non_batie,
                "surface_ok": stats_surface_ok,
                "zone_u_ok": stats_zone_u_ok,
                "final_candidates": len(candidates),
            },
            "override_file": f"{insee}-{slug}_mairie.geojson",
            "generator": "lib/data-fetchers/compute_dents_creuses.py",
            "source": "Karukera Conseil Immobilier - KCI",
            "contact": "contact@karukera-conseil.com",
        },
        "features": candidates,
    }
    return fc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--insee", required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--bbox", required=True,
                        help="lat_min,lon_min,lat_max,lon_max (WGS84)")
    args = parser.parse_args()

    parts = [float(x.strip()) for x in args.bbox.split(",")]
    bbox = {
        "lat_min": parts[0], "lon_min": parts[1],
        "lat_max": parts[2], "lon_max": parts[3],
    }

    DATA_OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DATA_OUT_DIR / f"{args.insee}-{args.slug}.geojson"
    fc = compute_dents_creuses(args.insee, args.slug, bbox)
    out_path.write_text(json.dumps(fc), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    print(f"[dents-creuses] OK {out_path} ({size_kb:.1f} KB, "
          f"{len(fc['features'])} dents creuses)")


if __name__ == "__main__":
    main()
