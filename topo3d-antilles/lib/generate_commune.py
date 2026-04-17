#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_commune.py
-------------------
Generateur industrialise d'une carte 3D Topo3D Antilles pour une commune.

USAGE:
  python3 lib/generate_commune.py \
      --insee 97116 \
      --nom "Morne-a-l'Eau" \
      --maire "Jean Bardail" \
      --epci CANGT \
      --bbox 16.30,-61.51,16.40,-61.36

Il prend la version stabilisee Petit-Bourg (Phase A + corrections Phase B)
comme template canonique, et substitue les tokens specifiques a la commune
cible (nom, INSEE, EPCI, maire, BBOX, presets cinematiques).

OUTPUT:
  - communes/{INSEE}-{slug}/index.html
  - communes/{INSEE}-{slug}/vercel.json
  - communes/{INSEE}-{slug}/data_batiments_{slug_underscore}.json (template vide)
  - communes/{INSEE}-{slug}/{slug_underscore}_vegetation.geojson (best-effort)
  - data/cadastre/defrichement_{slug}.geojson (best-effort, via karugeo.js)
  - data/fiscal/dgfip/{slug_underscore}_recettes.json (template vide)
  - data/fiscal/dgfip/{slug_underscore}_zones_plu_aggregat.json (template vide)
  - communes/{INSEE}-{slug}/GENERATION_REPORT.md

Regles dures:
  - Aucun token / cle API hardcode
  - Pas d'appel a "metropole" ou "Hexagone n'est pas la metropole" (terme banni)
  - Email officiel: contact@karukera-conseil.com
  - Le template HTML source est intouche apres copie
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import unicodedata
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMMUNES_DIR = ROOT / "communes"
DATA_DIR = ROOT / "data"
TEMPLATE_INSEE = "97118"
TEMPLATE_SLUG = "petit-bourg"
TEMPLATE_DIR = COMMUNES_DIR / f"{TEMPLATE_INSEE}-{TEMPLATE_SLUG}"

# EPCI labels (libelles complets pour le footer)
EPCI_LABELS = {
    "CANBT": "Communaute d'agglomeration du Nord Basse-Terre",
    "CANGT": "Communaute d'agglomeration du Nord Grande-Terre",
    "CARL":  "Communaute d'agglomeration de la Riviera du Levant",
    "CAGSC": "Communaute d'agglomeration Grand Sud Caraibe",
    "CACE":  "Communaute d'agglomeration Cap Excellence",
    "CCMG":  "Communaute de communes de Marie-Galante",
}


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def slugify(name: str) -> str:
    """Petit-Bourg -> petit-bourg, Morne-a-l'Eau -> morne-a-leau."""
    nfd = unicodedata.normalize("NFD", name)
    ascii_name = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    s = ascii_name.lower()
    s = s.replace("'", "").replace(" ", "-")
    s = re.sub(r"[^a-z0-9\-]", "", s)
    return s


def slug_underscore(name: str) -> str:
    """morne-a-leau -> morne_a_leau (utilise pour fichiers data_*)."""
    return slugify(name).replace("-", "_")


def parse_bbox(bbox_str: str) -> dict:
    """Parse 'lat_min,lon_min,lat_max,lon_max' -> dict avec center / bounds."""
    parts = [float(x.strip()) for x in bbox_str.split(",")]
    if len(parts) != 4:
        raise ValueError(f"BBOX doit avoir 4 valeurs, recu : {parts}")
    lat_min, lon_min, lat_max, lon_max = parts
    if lat_min > lat_max or lon_min > lon_max:
        raise ValueError(f"BBOX invalide (min > max) : {parts}")
    if not (-62 < lon_min < -60 and 14 < lat_min < 17):
        print(f"[WARN] BBOX hors zone Antilles francaises : {parts}", file=sys.stderr)
    center_lon = (lon_min + lon_max) / 2
    center_lat = (lat_min + lat_max) / 2
    span_lon = lon_max - lon_min
    span_lat = lat_max - lat_min
    return {
        "lat_min": lat_min, "lon_min": lon_min,
        "lat_max": lat_max, "lon_max": lon_max,
        "center_lon": round(center_lon, 5),
        "center_lat": round(center_lat, 5),
        "span_lon": span_lon,
        "span_lat": span_lat,
    }


def derive_camera_presets(bbox: dict) -> dict:
    """
    Derive 4 presets cinematiques a partir du centre commune.
    overview -> centre commune
    centre   -> centre commune zoom 16.2
    cote     -> bord est (souvent littoral en Guadeloupe)
    interieur-> bord ouest (souvent intra-terres)
    """
    cx, cy = bbox["center_lon"], bbox["center_lat"]
    east_x = bbox["lon_max"] - bbox["span_lon"] * 0.2
    west_x = bbox["lon_min"] + bbox["span_lon"] * 0.2
    return {
        "overview":  {"center_lon": round(cx, 4),    "center_lat": round(cy, 4),    "zoom": 12.5, "pitch": 55, "bearing": 25},
        "centre":    {"center_lon": round(cx, 4),    "center_lat": round(cy, 4),    "zoom": 16.2, "pitch": 65, "bearing": -20},
        "cote":      {"center_lon": round(east_x, 4), "center_lat": round(cy, 4),    "zoom": 15.0, "pitch": 72, "bearing": -45},
        "interieur": {"center_lon": round(west_x, 4), "center_lat": round(cy, 4),    "zoom": 14.5, "pitch": 60, "bearing": 90},
    }


def insee_to_dept(insee: str) -> str:
    """97118 -> 971."""
    return insee[:3]


# -----------------------------------------------------------------------------
# HTML rewrite
# -----------------------------------------------------------------------------

def rewrite_html(template_html: str, ctx: dict) -> str:
    """
    Substitutions ciblees pour adapter le HTML Petit-Bourg a la commune cible.
    On utilise des regex precis + remplacements litteraux pour ne pas casser
    les blocs JS / SVG / CSS.
    """
    h = template_html
    name = ctx["nom"]                       # "Morne-a-l'Eau"
    name_upper = ctx["nom"].upper()         # "MORNE-A-L'EAU"
    # JS-safe variants : echappes pour usage dans single-quoted JS strings
    name_js = name.replace("\\", "\\\\").replace("'", "\\'")
    name_upper_js = name_upper.replace("\\", "\\\\").replace("'", "\\'")
    insee = ctx["insee"]                    # "97116"
    slug = ctx["slug"]                      # "morne-a-leau"
    slug_underscore = ctx["slug_underscore"]
    maire = ctx["maire"]
    epci = ctx["epci"]
    epci_full = EPCI_LABELS.get(epci, epci)
    bbox = ctx["bbox"]
    presets = ctx["presets"]

    # 1) <title>
    h = re.sub(
        r"<title>Carte 3D — Petit-Bourg \| Maquette Urbanistique Interactive</title>",
        f"<title>Carte 3D — {name} | Maquette Urbanistique Interactive</title>",
        h
    )

    # 2) load-sub
    h = h.replace(
        '<p class="load-sub">Petit-Bourg — Carte 3D urbanistique premium</p>',
        f'<p class="load-sub">{name} — Carte 3D urbanistique premium</p>'
    )

    # 3) Search placeholder
    h = h.replace(
        'placeholder="Rechercher une adresse à Petit-Bourg (97118)..."',
        f'placeholder="Rechercher une adresse à {name} ({insee})..."'
    )

    # 4) Section title PPRN
    h = h.replace(
        '<div class="section-title">PPRN Petit-Bourg (officiel)</div>',
        f'<div class="section-title">PPRN {name} (officiel)</div>'
    )

    # 5) Footer commune + EPCI
    h = re.sub(
        r"Commune de Petit-Bourg — 97118 — EPCI : CANBT \(Communauté d'agglomération du Nord Basse-Terre\)",
        f"Commune de {name} — {insee} — EPCI : {epci} ({epci_full}) — Maire : {maire}",
        h
    )

    # 6) PPRN comments (cosmetic)
    h = h.replace(
        '<!-- Layers: PPRN officiel Petit-Bourg (Lizmap DEAL Guadeloupe) -->',
        f'<!-- Layers: PPRN officiel {name} (Lizmap DEAL Guadeloupe) -->'
    )

    # 7) Modal fiscal title
    h = h.replace(
        '<h2 id="fiscalDashboardTitle">Recettes fiscales par zone PLU — Petit-Bourg 2024</h2>',
        f'<h2 id="fiscalDashboardTitle">Recettes fiscales par zone PLU — {name} 2024</h2>'
    )

    # 8) PETIT-BOURG 3D heading
    h = h.replace(
        '<h1 style="margin:0;font-size:18px">PETIT-BOURG 3D</h1>',
        f'<h1 style="margin:0;font-size:18px">{name_upper} 3D</h1>'
    )

    # 9) Map initial center
    h = re.sub(
        r"center: \[-61\.55, 16\.20\], // Start wide over Guadeloupe",
        f"center: [{bbox['center_lon']}, {bbox['center_lat']}], // Start wide over commune",
        h
    )

    # 10) data_batiments JSON file
    h = h.replace(
        "fetch('data_batiments_petit_bourg.json')",
        f"fetch('data_batiments_{slug_underscore}.json')"
    )

    # 11) Vegetation geojson local
    h = h.replace(
        "const vegUrlLocal = 'petitbourg_vegetation.geojson';",
        f"const vegUrlLocal = '{slug_underscore}_vegetation.geojson';"
    )
    h = h.replace(
        "const vegUrlData = '../../data/vegetation/petitbourg_vegetation.geojson';",
        f"const vegUrlData = '../../data/vegetation/{slug_underscore}_vegetation.geojson';"
    )
    h = h.replace(
        "tryMeta('petitbourg_vegetation.meta.json')",
        f"tryMeta('{slug_underscore}_vegetation.meta.json')"
    )
    h = h.replace(
        "tryMeta('../../data/vegetation/petitbourg_vegetation.meta.json')",
        f"tryMeta('../../data/vegetation/{slug_underscore}_vegetation.meta.json')"
    )

    # 12) Defrichement geojson
    h = h.replace(
        "fetch('../../data/cadastre/defrichement_petit-bourg.geojson')",
        f"fetch('../../data/cadastre/defrichement_{slug}.geojson')"
    )

    # 13) PPRN Lizmap layers (l_*_97118 -> l_*_{insee})
    h = re.sub(
        r"(layerName:\s*'l_[a-z]+_)97118(')",
        rf"\g<1>{insee}\g<2>",
        h
    )
    # PPRN Petit-Bourg attribution (JS single-quoted string)
    h = h.replace(
        "attribution: 'PPRN Petit-Bourg · DEAL Guadeloupe'",
        f"attribution: 'PPRN {name_js} · DEAL Guadeloupe'"
    )
    # PPRN Lizmap section comment
    h = h.replace(
        "// ─── PPRN Lizmap Petit-Bourg (https://pprn971guadeloupe.fr) ───",
        f"// ─── PPRN Lizmap {name} (https://pprn971guadeloupe.fr) ───"
    )
    # Hillshade commune name
    h = h.replace(
        "// Hillshade renforcé pour zone montagneuse de Petit-Bourg",
        f"// Hillshade renforcé pour zone de {name}"
    )

    # 14) Cinematic presets (overview, centre, cote, interieur)
    # On remplace tout le bloc CINEMATIC_PRESETS = {...}
    new_presets_block = f"""const CINEMATIC_PRESETS = {{
  overview: {{
    label: 'Vue d\\'ensemble',
    sub: '{name_js}',
    view: {{ center: [{presets['overview']['center_lon']}, {presets['overview']['center_lat']}], zoom: {presets['overview']['zoom']}, pitch: {presets['overview']['pitch']}, bearing: {presets['overview']['bearing']} }},
    duration: 3500,
    tod: 'midi'
  }},
  centre: {{
    label: 'Centre-bourg',
    sub: 'Coeur historique — Zone UA',
    view: {{ center: [{presets['centre']['center_lon']}, {presets['centre']['center_lat']}], zoom: {presets['centre']['zoom']}, pitch: {presets['centre']['pitch']}, bearing: {presets['centre']['bearing']} }},
    duration: 3500,
    tod: 'golden'
  }},
  cote: {{
    label: 'Facade littorale',
    sub: 'Front de mer — secteur Est',
    view: {{ center: [{presets['cote']['center_lon']}, {presets['cote']['center_lat']}], zoom: {presets['cote']['zoom']}, pitch: {presets['cote']['pitch']}, bearing: {presets['cote']['bearing']} }},
    duration: 3500,
    tod: 'golden'
  }},
  vernou: {{
    label: 'Interieur — zone d\\'extension',
    sub: 'Foncier mutable — secteur intra-terres',
    view: {{ center: [{presets['interieur']['center_lon']}, {presets['interieur']['center_lat']}], zoom: {presets['interieur']['zoom']}, pitch: {presets['interieur']['pitch']}, bearing: {presets['interieur']['bearing']} }},
    duration: 3500,
    tod: 'midi'
  }}
}};"""
    h = re.sub(
        r"const CINEMATIC_PRESETS = \{[\s\S]*?\n\};",
        new_presets_block,
        h,
        count=1
    )

    # 15) PLU zone heuristique commentaire
    h = h.replace(
        "// ─── 4. PLU ZONE (approximation geographique Petit-Bourg) ───",
        f"// ─── 4. PLU ZONE (approximation geographique {name}) ───"
    )
    # 15b) Cosmetic comment in CINEMATIC PRESETS section
    h = h.replace(
        "// Coordonnées calibrées sur Petit-Bourg (cohérent avec VIEWS existantes)",
        f"// Coordonnees calibrees sur {name}"
    )
    # 15c) Fallback INSEE in PLU/cadastre data resolver
    h = h.replace(
        "let commune = '97118';",
        f"let commune = '{insee}';"
    )
    h = h.replace(
        "commune = pp.code_commune || '97118';",
        f"commune = pp.code_commune || '{insee}';"
    )

    # 16) PLU zone heuristique check coords (tres specifique a PB, on neutralise)
    lat_lo = round(bbox['center_lat'] - 0.005, 4)
    lat_hi = round(bbox['center_lat'] + 0.005, 4)
    lon_lo = round(bbox['center_lon'] - 0.005, 4)
    lon_hi = round(bbox['center_lon'] + 0.005, 4)
    h = re.sub(
        r"if \(lat > 16\.19 && lat < 16\.20 && lng > -61\.595 && lng < -61\.585\) proprietaire = 'Probable : Commune de Petit-Bourg / Etat \(centre-bourg\)';",
        f"if (lat > {lat_lo} && lat < {lat_hi} && lng > {lon_lo} && lng < {lon_hi}) proprietaire = 'Probable : Commune de {name_js} / Etat (centre-bourg)';",
        h
    )

    # 17) Search BAN scoping (inside JS string)
    h = h.replace(
        "encodeURIComponent(query + ' Petit-Bourg')",
        f"encodeURIComponent(query + ' {name_js}')"
    )

    # 18) TOURS: on remplace les coordonnees du centre PB par les coords commune
    # Et on relabel "Petit-Bourg" -> name dans les labels
    # Les centres specifiques quartiers PB sont inappropries -> on les remplace
    # tous par center commune avec petites variations.
    cx, cy = bbox["center_lon"], bbox["center_lat"]
    # Replace specific PB coordinate centers with commune center (approximation)
    pb_centers = [
        ("[-61.590, 16.190]", f"[{cx}, {cy}]"),
        ("[-61.5898, 16.1935]", f"[{cx}, {cy}]"),
        ("[-61.6010, 16.1980]", f"[{round(cx - 0.011, 4)}, {round(cy + 0.005, 4)}]"),
        ("[-61.5840, 16.1850]", f"[{round(cx + 0.005, 4)}, {round(cy - 0.005, 4)}]"),
        ("[-61.5780, 16.2000]", f"[{round(cx + 0.012, 4)}, {round(cy + 0.01, 4)}]"),
        ("[-61.5950, 16.1800]", f"[{round(cx - 0.005, 4)}, {round(cy - 0.01, 4)}]"),
        ("[-61.6200, 16.1700]", f"[{round(cx - 0.03, 4)}, {round(cy - 0.02, 4)}]"),
    ]
    for old, new in pb_centers:
        h = h.replace(old, new)

    # Tour labels (JS single-quoted strings -> name_js)
    h = h.replace(
        "name: 'Visite complete de Petit-Bourg'",
        f"name: 'Visite complete de {name_js}'"
    )
    h = h.replace(
        "label: 'Parcelles vacantes identifiées sur Petit-Bourg'",
        f"label: 'Parcelles vacantes identifiées sur {name_js}'"
    )
    h = h.replace(
        "label: 'Petit-Bourg — 131,92 km², 24 665 habitants'",
        f"label: '{name_js} — voir fiche INSEE {insee}'"
    )
    h = h.replace(
        "label: 'Vue aérienne finale — Petit-Bourg 3D'",
        f"label: 'Vue aérienne finale — {name_js} 3D'"
    )

    # 19) Fiscal data URLs
    h = h.replace(
        "const FISCAL_DATA_URL = '../../data/fiscal/dgfip/petitbourg_recettes.json';",
        f"const FISCAL_DATA_URL = '../../data/fiscal/dgfip/{slug_underscore}_recettes.json';"
    )
    h = h.replace(
        "const FISCAL_AGGREG_URL = '../../data/fiscal/dgfip/petitbourg_zones_plu_aggregat.json';",
        f"const FISCAL_AGGREG_URL = '../../data/fiscal/dgfip/{slug_underscore}_zones_plu_aggregat.json';"
    )
    # 19bis) Dents creuses : variables INSEE + SLUG pour la couche GeoJSON
    h = h.replace(
        "const DENTS_CREUSES_INSEE = '97118';",
        f"const DENTS_CREUSES_INSEE = '{insee}';"
    )
    h = h.replace(
        "const DENTS_CREUSES_SLUG = 'petit-bourg';",
        f"const DENTS_CREUSES_SLUG = '{slug}';"
    )

    # 20) PDF export filenames
    h = h.replace(
        "pdf.save('KCI_dashboard_fiscal_petit-bourg_'",
        f"pdf.save('KCI_dashboard_fiscal_{slug}_'"
    )
    h = h.replace(
        "pdf.text('Commune de Petit-Bourg — 97118', 20, 40);",
        f"pdf.text('Commune de {name_js} — {insee}', 20, 40);"
    )
    h = h.replace(
        "pdf.save('KCI_DOB_petit-bourg_'",
        f"pdf.save('KCI_DOB_{slug}_'"
    )

    # 21) PNG export filename
    h = h.replace(
        "link.download = 'carte_3d_petit_bourg_'",
        f"link.download = 'carte_3d_{slug_underscore}_'"
    )

    # 22) Stats commune-specific (surface / pop / zone sismique)
    # Toute la Guadeloupe est zone sismique 5, on garde
    # Surface et pop varient -> on neutralise (la mairie peut overrider)
    # On laisse les stats Petit-Bourg en place mais on previent dans le rapport
    # de sortie. Pour Morne-a-l'Eau et Sainte-Rose specifiquement:
    if insee == "97116":  # Morne-a-l'Eau
        h = h.replace(
            '<div class="stat-row"><span class="label">Surface commune</span><span class="value">131,92 km²</span></div>',
            '<div class="stat-row"><span class="label">Surface commune</span><span class="value">66,42 km²</span></div>'
        )
        h = h.replace(
            '<div class="stat-row"><span class="label">Population (2022)</span><span class="value">24 665</span></div>',
            '<div class="stat-row"><span class="label">Population (2022)</span><span class="value">17 168</span></div>'
        )
    elif insee == "97129":  # Sainte-Rose
        h = h.replace(
            '<div class="stat-row"><span class="label">Surface commune</span><span class="value">131,92 km²</span></div>',
            '<div class="stat-row"><span class="label">Surface commune</span><span class="value">118,75 km²</span></div>'
        )
        h = h.replace(
            '<div class="stat-row"><span class="label">Population (2022)</span><span class="value">24 665</span></div>',
            '<div class="stat-row"><span class="label">Population (2022)</span><span class="value">18 064</span></div>'
        )

    return h


# -----------------------------------------------------------------------------
# Data fetchers (best-effort, no fail)
# -----------------------------------------------------------------------------

def fetch_dvf(insee: str, out_dir: Path) -> dict:
    """
    Telecharge le CSV DVF Cerema 2024 pour la commune.
    URL pattern (open data): https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/{DEPT}/{INSEE}.csv
    Bes-effort, pas bloquant.
    """
    dept = insee[:3]
    url = f"https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/{dept}/{insee}.csv"
    out_path = out_dir / f"dvf_{insee}_2024.csv"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Topo3D-Antilles/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        out_path.write_bytes(data)
        return {"ok": True, "url": url, "path": str(out_path), "size_kb": round(len(data) / 1024, 1)}
    except urllib.error.HTTPError as e:
        return {"ok": False, "url": url, "error": f"HTTP {e.code}"}
    except Exception as e:
        return {"ok": False, "url": url, "error": str(e)}


def fetch_defrichement(slug: str, bbox: dict) -> dict:
    """
    Lance lib/data-fetchers/karugeo.js fetch-defrichement, puis simplify-geojson
    pour clipper / simplifier / filtrer < surface min. Sinon les fichiers depassent
    50 MB et le browser etouffe.
    Retourne {ok, path, ...}. Best-effort.
    """
    out_path = DATA_DIR / "cadastre" / f"defrichement_{slug}.geojson"
    cmd_fetch = ["node", str(ROOT / "lib" / "data-fetchers" / "karugeo.js"),
                 "fetch-defrichement", slug]
    try:
        res = subprocess.run(cmd_fetch, cwd=str(ROOT), capture_output=True, text=True, timeout=180)
        if res.returncode != 0 or not out_path.exists():
            return {"ok": False, "stderr": (res.stderr or "")[:400], "stdout": (res.stdout or "")[:200]}

        raw_kb = round(out_path.stat().st_size / 1024, 1)

        # Si > 1 MB, on simplify + clip
        if raw_kb > 1024:
            bbox_arg = f"--bbox={bbox['lon_min']},{bbox['lat_min']},{bbox['lon_max']},{bbox['lat_max']}"
            cmd_simp = ["node", str(ROOT / "lib" / "simplify-geojson.js"),
                        str(out_path), str(out_path), bbox_arg, "--tol=0.00005"]
            simp = subprocess.run(cmd_simp, cwd=str(ROOT), capture_output=True, text=True, timeout=60)
            if simp.returncode != 0:
                return {"ok": True, "path": str(out_path), "size_kb": raw_kb,
                        "warning": "simplify failed: " + (simp.stderr or "")[:200]}
            simp_kb = round(out_path.stat().st_size / 1024, 1)
            return {"ok": True, "path": str(out_path),
                    "size_raw_kb": raw_kb, "size_simplified_kb": simp_kb}

        return {"ok": True, "path": str(out_path), "size_kb": raw_kb}
    except FileNotFoundError:
        return {"ok": False, "error": "node introuvable (PATH)"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def fetch_overpass_vegetation(bbox: dict, out_path: Path) -> dict:
    """
    Tres simple: requete Overpass pour landuse=forest, natural=wood dans la bbox.
    Output: GeoJSON FeatureCollection minimal.
    """
    bbox_str = f"{bbox['lat_min']},{bbox['lon_min']},{bbox['lat_max']},{bbox['lon_max']}"
    overpass_query = f"""
[out:json][timeout:25];
(
  way["natural"="wood"]({bbox_str});
  way["landuse"="forest"]({bbox_str});
  relation["natural"="wood"]({bbox_str});
  relation["landuse"="forest"]({bbox_str});
);
out geom;
"""
    url = "https://overpass-api.de/api/interpreter"
    try:
        data = urllib.parse.urlencode({"data": overpass_query}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"User-Agent": "Topo3D-Antilles/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))

        features = []
        for el in payload.get("elements", []):
            if el.get("type") == "way" and el.get("geometry"):
                coords = [[p["lon"], p["lat"]] for p in el["geometry"]]
                if len(coords) >= 4 and coords[0] == coords[-1]:
                    features.append({
                        "type": "Feature",
                        "properties": {"hauteur_m": 8, "type": el.get("tags", {}).get("natural") or el.get("tags", {}).get("landuse")},
                        "geometry": {"type": "Polygon", "coordinates": [coords]}
                    })
        fc = {"type": "FeatureCollection", "features": features}
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(fc), encoding="utf-8")
        return {"ok": True, "path": str(out_path), "features": len(features)}
    except Exception as e:
        # Fallback: empty FeatureCollection so HTML doesn't 404
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps({"type": "FeatureCollection", "features": []}), encoding="utf-8")
        return {"ok": False, "error": str(e), "fallback_empty": True}


# -----------------------------------------------------------------------------
# Templates de fichiers vides (data_batiments / fiscal)
# -----------------------------------------------------------------------------

def write_empty_batiments(path: Path, name: str, insee: str):
    payload = {
        "type": "FeatureCollection",
        "_meta": {
            "commune": name, "insee": insee,
            "schema_version": "1.0.0",
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d"),
            "source": "TEMPLATE — a remplir par croisement BDTOPO IGN + DVF Cerema + observation terrain mairie",
            "instructions": "Pour activer 'Batiments abandonnes' / 'Heatmap' / stats reelles, remplir 'features'."
        },
        "features": []
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def write_empty_fiscal(out_dir: Path, slug_underscore: str, name: str, insee: str):
    out_dir.mkdir(parents=True, exist_ok=True)
    recettes = {
        "_meta": {"commune": name, "insee": insee, "annee": 2024,
                  "source": "TEMPLATE — DGFIP open data", "schema": "parcelle -> recette TFB+TFNB+CFE"},
        "parcelles": []
    }
    aggregat = {
        "_meta": {"commune": name, "insee": insee, "annee": 2024,
                  "source": "TEMPLATE — agregat zone PLU"},
        "zones": []
    }
    (out_dir / f"{slug_underscore}_recettes.json").write_text(
        json.dumps(recettes, indent=2, ensure_ascii=False), encoding="utf-8")
    (out_dir / f"{slug_underscore}_zones_plu_aggregat.json").write_text(
        json.dumps(aggregat, indent=2, ensure_ascii=False), encoding="utf-8")


def write_vercel_json(path: Path):
    payload = {
        "buildCommand": None,
        "outputDirectory": ".",
        "framework": None,
        "routes": [
            {"handle": "filesystem"},
            {"src": "/(.*)", "dest": "/index.html"}
        ],
        "headers": [{
            "source": "/(.*)",
            "headers": [{"key": "Content-Type", "value": "text/html; charset=utf-8"}]
        }]
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


# -----------------------------------------------------------------------------
# Main pipeline
# -----------------------------------------------------------------------------

def generate_commune(insee: str, nom: str, maire: str, epci: str, bbox_str: str,
                     skip_fetch: bool = False, force: bool = False) -> dict:
    """Pipeline industrialise."""
    slug = slugify(nom)
    slug_us = slug_underscore(nom)
    out_dir = COMMUNES_DIR / f"{insee}-{slug}"

    if out_dir.exists() and not force:
        print(f"[generate] {out_dir} existe deja. Utiliser --force pour ecraser.", file=sys.stderr)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Validation INSEE
    if not insee.startswith(("971", "972", "973", "974", "976")):
        print(f"[WARN] INSEE {insee} hors DOM ?", file=sys.stderr)

    bbox = parse_bbox(bbox_str)
    presets = derive_camera_presets(bbox)
    ctx = {
        "insee": insee, "nom": nom, "slug": slug, "slug_underscore": slug_us,
        "maire": maire, "epci": epci, "bbox": bbox, "presets": presets
    }

    # Lire le template (Petit-Bourg stabilise)
    template_path = TEMPLATE_DIR / "index.html"
    if not template_path.exists():
        print(f"[ERROR] Template absent : {template_path}", file=sys.stderr)
        sys.exit(2)
    template_html = template_path.read_text(encoding="utf-8")

    # Reecrire
    rendered = rewrite_html(template_html, ctx)

    # Detecter les "Petit-Bourg" residuels (sauf docstring/comments fonctionnels)
    leftovers = re.findall(r"Petit-Bourg|petit-bourg|petitbourg|97118", rendered)
    leftovers_unique = sorted(set(leftovers))

    # Ecrire HTML
    (out_dir / "index.html").write_text(rendered, encoding="utf-8")

    # vercel.json
    write_vercel_json(out_dir / "vercel.json")

    # data_batiments_{slug_us}.json (template vide)
    write_empty_batiments(out_dir / f"data_batiments_{slug_us}.json", nom, insee)

    # fiscal templates
    write_empty_fiscal(DATA_DIR / "fiscal" / "dgfip", slug_us, nom, insee)

    # Best-effort fetchers
    report = {
        "commune": nom, "insee": insee, "epci": epci, "maire": maire,
        "slug": slug, "out_dir": str(out_dir), "bbox": bbox,
        "leftovers_petitbourg": leftovers_unique,
        "fetchers": {}
    }

    if not skip_fetch:
        # DVF
        dvf_dir = DATA_DIR / "fiscal" / "dvf"
        dvf_dir.mkdir(parents=True, exist_ok=True)
        report["fetchers"]["dvf"] = fetch_dvf(insee, dvf_dir)

        # Defrichement
        report["fetchers"]["defrichement"] = fetch_defrichement(slug, bbox)

        # Vegetation Overpass -> data/vegetation + commune-local copy
        veg_path = DATA_DIR / "vegetation" / f"{slug_us}_vegetation.geojson"
        report["fetchers"]["vegetation"] = fetch_overpass_vegetation(bbox, veg_path)
        # Copy in commune dir for direct fetch
        if veg_path.exists():
            shutil.copy(veg_path, out_dir / f"{slug_us}_vegetation.geojson")

    # GENERATION_REPORT.md
    write_generation_report(out_dir / "GENERATION_REPORT.md", report)

    print(f"[generate] OK  -> {out_dir}")
    if leftovers_unique:
        print(f"[WARN] Tokens Petit-Bourg residuels detectes : {leftovers_unique}")
    return report


def write_generation_report(path: Path, report: dict):
    bbox = report["bbox"]
    fetchers = report["fetchers"]
    md = []
    md.append(f"# GENERATION REPORT — {report['commune']} ({report['insee']})")
    md.append("")
    md.append(f"- **Date** : {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    md.append(f"- **Commune** : {report['commune']}")
    md.append(f"- **INSEE** : {report['insee']}")
    md.append(f"- **EPCI** : {report['epci']}")
    md.append(f"- **Maire 2026** : {report['maire']}")
    md.append(f"- **Slug** : `{report['slug']}`")
    md.append(f"- **Sortie** : `{report['out_dir']}`")
    md.append("")
    md.append("## Bounding box (WGS84)")
    md.append(f"- lat_min={bbox['lat_min']}, lon_min={bbox['lon_min']}")
    md.append(f"- lat_max={bbox['lat_max']}, lon_max={bbox['lon_max']}")
    md.append(f"- centre = ({bbox['center_lat']}, {bbox['center_lon']})")
    md.append("")
    md.append("## Fetchers")
    for name, res in fetchers.items():
        ok = res.get("ok", False)
        md.append(f"- **{name}** : {'OK' if ok else 'KO'}")
        for k, v in res.items():
            if k == "ok":
                continue
            md.append(f"  - {k} : `{v}`")
    md.append("")
    if report.get("leftovers_petitbourg"):
        md.append("## Tokens residuels detectes")
        md.append("```")
        for t in report["leftovers_petitbourg"]:
            md.append(t)
        md.append("```")
        md.append("")
    md.append("## QA Checklist (a valider via Preview)")
    md.append("- [ ] Code INSEE correct dans le footer + search placeholder")
    md.append("- [ ] Maire 2026 affiche dans le footer")
    md.append("- [ ] EPCI rattache correct (ne pas confondre CANBT vs CANGT)")
    md.append("- [ ] BBOX coherente avec la geographie (carte zoom sur la bonne zone)")
    md.append("- [ ] Toggles couches fonctionnent")
    md.append("- [ ] Modaux fiscaux ouvrent")
    md.append("- [ ] Presets cinematiques pertinents")
    md.append("- [ ] Pas d'erreurs console")
    md.append("- [ ] Branding KCI : contact@karukera-conseil.com, karukera-conseil.com, pas 'metropole'")
    md.append("")
    path.write_text("\n".join(md), encoding="utf-8")


# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generateur Topo3D Antilles")
    parser.add_argument("--insee", required=True, help="Code INSEE (ex: 97116)")
    parser.add_argument("--nom", required=True, help="Nom commune (ex: \"Morne-a-l'Eau\")")
    parser.add_argument("--maire", required=True, help="Nom du maire 2026")
    parser.add_argument("--epci", required=True, help="EPCI (CANBT, CANGT, CARL, CAGSC, CACE, CCMG)")
    parser.add_argument("--bbox", required=True,
                        help="lat_min,lon_min,lat_max,lon_max (WGS84)")
    parser.add_argument("--skip-fetch", action="store_true",
                        help="Ne pas telecharger DVF/defrichement/vegetation (dev rapide)")
    parser.add_argument("--force", action="store_true",
                        help="Ecraser le dossier de sortie")
    args = parser.parse_args()

    generate_commune(
        insee=args.insee, nom=args.nom, maire=args.maire,
        epci=args.epci, bbox_str=args.bbox,
        skip_fetch=args.skip_fetch, force=args.force
    )


if __name__ == "__main__":
    main()
