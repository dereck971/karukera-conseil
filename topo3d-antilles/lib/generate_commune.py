#!/usr/bin/env python3
"""
generate_commune.py
-------------------
Générateur d'une carte 3D Topo3D Antilles pour une commune donnée.

ÉTAT : SQUELETTE — à compléter au cours du sprint des 12 communes
(fenêtre commerciale 13/05 - 03/06/2026). Le template HTML existe déjà
dans communes/_template/index.html — ce script doit l'adapter par commune
en remplaçant les placeholders.

INPUT :
  - code INSEE (ex : 97118)
  - nom de la commune (ex : "Petit-Bourg")
  - bbox WGS84 (lon_min, lat_min, lon_max, lat_max)
  - centre WGS84 (lon, lat)
  - liste de POI / vues prédéfinies (JSON)

OUTPUT :
  - communes/{INSEE}-{slug}/index.html  (carte 3D prête à servir)
  - communes/{INSEE}-{slug}/vercel.json (config déploiement)
  - data/cadastre/defrichement_{slug}.geojson  (via lib/data-fetchers/karugeo.js)
  - éventuellement data/plu/{slug}.geojson, data/pprn/{slug}.geojson

USAGE :
  python3 lib/generate_commune.py --insee 97118 --name "Petit-Bourg" \\
      --bbox -61.65,16.155,-61.50,16.255 --center -61.5898,16.1935

À FAIRE PAR DERECK / ÉQUIPE :
  - [ ] Extraire les placeholders {{COMMUNE_NAME}}, {{INSEE_CODE}}, etc. dans _template/
  - [ ] Implémenter `render_template()` (remplacement Jinja2 ou str.replace())
  - [ ] Implémenter `fetch_pprn_lizmap()` : tester si PPRN Lizmap existe pour la commune
  - [ ] Implémenter `auto_views()` : générer 6-8 vues prédéfinies depuis les POI principaux
  - [ ] Connecter à `lib/data-fetchers/karugeo.js` via subprocess pour le défrichement
  - [ ] QA : vérifier le HTML généré (no console errors, layers OK) avant de marquer "prêt"
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = ROOT / "communes" / "_template"
COMMUNES_DIR = ROOT / "communes"
DATA_DIR = ROOT / "data"


def slugify(name: str) -> str:
    """Petit-Bourg → petit-bourg, Pointe-à-Pitre → pointe-a-pitre."""
    import unicodedata
    nfd = unicodedata.normalize("NFD", name)
    ascii_name = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return ascii_name.lower().replace("'", "").replace(" ", "-")


def render_template(template_path: Path, ctx: dict) -> str:
    """
    Remplace les placeholders {{KEY}} dans le template par les valeurs du contexte.
    À FAIRE : valider que tous les placeholders requis sont bien fournis.
    """
    text = template_path.read_text(encoding="utf-8")
    for key, val in ctx.items():
        text = text.replace("{{" + key + "}}", str(val))
    # Détecter les placeholders restants pour avertir
    import re
    leftover = re.findall(r"\{\{([A-Z_]+)\}\}", text)
    if leftover:
        print(f"[WARN] Placeholders non résolus : {sorted(set(leftover))}", file=sys.stderr)
    return text


def fetch_defrichement(slug: str) -> Path:
    """
    Appelle lib/data-fetchers/karugeo.js pour télécharger le GeoJSON défrichement.
    Renvoie le chemin du fichier produit.
    """
    import subprocess
    cmd = ["node", str(ROOT / "lib" / "data-fetchers" / "karugeo.js"), "fetch-defrichement", slug]
    print(f"[generate] Lancement : {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[ERROR] karugeo.js : {res.stderr}", file=sys.stderr)
        return None
    return DATA_DIR / "cadastre" / f"defrichement_{slug}.geojson"


def fetch_pprn_lizmap(insee_code: str) -> dict | None:
    """
    Vérifie si un PPRN Lizmap existe pour cette commune.
    URL pattern : https://pprn971guadeloupe.fr/index.php/lizmap/service?
                   repository=pprn971&project={NOM_PROJET}&SERVICE=WMS&...
    À FAIRE : mapping insee → nom_projet Lizmap (souvent en MAJUSCULE sans accents).
    """
    pprn_mapping = {
        "97118": "PETITBOURG",
        # À enrichir : auditer https://pprn971guadeloupe.fr/ pour la liste complète des projets
    }
    project = pprn_mapping.get(insee_code)
    if not project:
        return None
    return {
        "wms_base": f"https://pprn971guadeloupe.fr/index.php/lizmap/service?repository=pprn971&project={project}",
        "project": project
    }


def generate_commune(insee: str, name: str, bbox: list, center: list, output_dir: Path = None):
    """Pipeline principal : génère une carte 3D pour la commune."""
    slug = slugify(name)
    out = output_dir or (COMMUNES_DIR / f"{insee}-{slug}")
    out.mkdir(parents=True, exist_ok=True)

    ctx = {
        "COMMUNE_NAME": name,
        "INSEE_CODE": insee,
        "SLUG": slug,
        "BBOX_S": bbox[1], "BBOX_W": bbox[0], "BBOX_N": bbox[3], "BBOX_E": bbox[2],
        "CENTER_LON": center[0], "CENTER_LAT": center[1],
        "PPRN_PROJECT": "",  # rempli par fetch_pprn_lizmap si dispo
    }

    pprn = fetch_pprn_lizmap(insee)
    if pprn:
        ctx["PPRN_PROJECT"] = pprn["project"]

    template_html = TEMPLATE_DIR / "index.html"
    if not template_html.exists():
        print(f"[ERROR] Template absent : {template_html}", file=sys.stderr)
        sys.exit(1)

    rendered = render_template(template_html, ctx)
    (out / "index.html").write_text(rendered, encoding="utf-8")

    # vercel.json minimal
    (out / "vercel.json").write_text(json.dumps({
        "buildCommand": None,
        "outputDirectory": ".",
        "framework": None,
        "routes": [{"handle": "filesystem"}, {"src": "/(.*)", "dest": "/index.html"}],
        "headers": [{"source": "/(.*)", "headers": [{"key": "Content-Type", "value": "text/html; charset=utf-8"}]}]
    }, indent=2), encoding="utf-8")

    print(f"[generate] Commune {name} ({insee}) → {out}")

    # Optionnel : pré-télécharger les données défrichement
    fetch_defrichement(slug)


def main():
    parser = argparse.ArgumentParser(description="Générateur Topo3D Antilles")
    parser.add_argument("--insee", required=True, help="Code INSEE (ex: 97118)")
    parser.add_argument("--name", required=True, help="Nom de la commune")
    parser.add_argument("--bbox", required=True, help="lon_min,lat_min,lon_max,lat_max")
    parser.add_argument("--center", required=True, help="lon,lat")
    args = parser.parse_args()

    bbox = list(map(float, args.bbox.split(",")))
    center = list(map(float, args.center.split(",")))
    generate_commune(args.insee, args.name, bbox, center)


if __name__ == "__main__":
    main()
