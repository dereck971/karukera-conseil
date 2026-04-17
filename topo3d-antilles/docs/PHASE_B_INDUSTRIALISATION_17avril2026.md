# PHASE B — Industrialisation Carte 3D Topo3D Antilles

**Date** : 17 avril 2026
**Cible commerciale** : RDV Morne-a-l'Eau 15/05/2026 (Dereck × dir. urba, intro Ronard)
**Levier** : Sainte-Rose -> upsell pack CANBT 6 communes (Adrien Barron pdt CANBT)

---

## Resume du generateur

Script unique `lib/generate_commune.py`. Il prend la version stabilisee de Petit-Bourg
comme template canonique (apres correction des 3 anomalies Phase A) et substitue
les tokens specifiques a la commune cible :

- code INSEE
- nom commune (avec gestion correcte de l'apostrophe pour les JS strings,
  ex Morne-a-l'Eau)
- maire 2026 + EPCI rattache (libelle complet auto via mapping `EPCI_LABELS`)
- BBOX WGS84 + presets cinematiques derives (overview / centre / cote / interieur)
- noms de fichiers data_*, vegetation_*, defrichement_*

Pipeline en sortie pour chaque commune :

1. Reecriture HTML (~22 substitutions ciblees, apostrophes JS-escapees)
2. Fichier `vercel.json` static
3. Template `data_batiments_{slug}.json` vide structure (avec schema)
4. Templates fiscaux DGFIP (`recettes`, `zones_plu_aggregat`)
5. Best-effort fetchers :
   - DVF Cerema 2024 (CSV `files.data.gouv.fr/geo-dvf/.../{INSEE}.csv`)
   - Defrichement DAAF KaruGeo (WFS `ms:couche_unifiees_defrichement_2024`)
     + simplify-geojson auto (>1 MB -> clip + Douglas-Peucker tol 5e-5)
   - Vegetation Overpass (`landuse=forest`, `natural=wood`)
6. `GENERATION_REPORT.md` avec checklist QA

### Usage

```bash
cd topo3d-antilles
python3 lib/generate_commune.py \
    --insee 97116 \
    --nom "Morne-a-l'Eau" \
    --maire "Jean Bardail" \
    --epci CANGT \
    --bbox 16.30,-61.51,16.40,-61.36
```

Options :
- `--skip-fetch` : ne pas telecharger DVF/defrichement/vegetation (dev rapide)
- `--force` : ecraser le dossier de sortie

---

## Anomalies Phase A corrigees

### 1. Mismatch noms `lib/fiscal/*.js` vs `<script src>`

| Avant (script src)             | Apres (script src)             | Fichier reel             |
| ------------------------------ | ------------------------------ | ------------------------ |
| `dashboard_zones_plu.js`       | `dashboard_zone_plu.js`        | `dashboard_zone_plu.js`  |
| `simulateur_requalif.js`       | `simulateur_requalification.js`| `simulateur_requalification.js` |
| `export_dob_pdf.js`            | `export_dob.js`                | `export_dob.js`          |

`sous_fiscalisation.js` etait deja correct.

### 2. `data_batiments_petit_bourg.json` absent

Cree avec un schema documente (commune, insee, schema_version, instructions).
`features: []` jusqu'a alimentation par ETL ou export mairie. Les couches
`abandoned-markers` / `heatmap-abandon` sont neutralisees mais ne crashent plus.

Patch additionnel dans `animateStats()` : la stat `sb-taux` est protegee
contre la division par zero (`total === 0` -> affiche "—" au lieu de "NaN%").

### 3. `glyphs` manquant dans le style raster MapLibre

Ajoute dans `makeStyle()` :

```js
glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
```

Et `text-font` `poi-labels` change en `['Noto Sans Regular']` (police fournie
par les demotiles, evite le fallback "Open Sans" qui crashait).

Verification preview : l'erreur `use of "text-field" requires a style "glyphs" property`
ne reapparait plus.

### Anomalie residuelle (PRE-EXISTANTE Phase A, non bloquante)

`sky-atmo` : MapLibre 4.1.2 ne supporte pas le type `sky` -> erreurs console
mais pas d'impact visuel (le sky est decoratif). A traiter en Phase C.

---

## Statut Morne-a-l'Eau (97116)

**FAIT** -- pret pour le RDV 15/05/2026.

| Element                | Etat                                                           |
| ---------------------- | -------------------------------------------------------------- |
| Code INSEE             | 97116 (verifie footer + search + cadastre fallback)            |
| Maire 2026             | Jean Bardail (footer + report)                                 |
| EPCI                   | CANGT (Communaute d'agglomeration du Nord Grande-Terre)        |
| BBOX WGS84             | lat 16.30-16.40, lon -61.51 a -61.36                           |
| Centre carte           | (-61.435, 16.35)                                               |
| Title / H1             | "Carte 3D — Morne-à-l'Eau" / "MORNE-À-L'EAU 3D"               |
| Surface affichee       | 66,42 km^2                                                     |
| Population (2022)      | 17 168                                                         |
| Layers initialises     | 25 (toutes couches Phase A actives)                            |
| CINEMATIC_PRESETS      | overview/centre/cote/interieur, sub = "Morne-à-l'Eau" (escape) |
| TOURS                  | abandon / potentiel / complet, label = "Morne-à-l'Eau"         |
| JS syntax              | OK (vm.Script() parse)                                         |
| DVF 2024               | OK 14.8 KB (data/fiscal/dvf/dvf_97116_2024.csv)                |
| Defrichement DAAF      | OK 4.4 MB (clip + simplify auto, depuis 70 MB raw)             |
| Vegetation Overpass    | OK 292 features (~340 KB)                                      |
| Branding               | contact@karukera-conseil.com, karukera-conseil.com OK          |

Visuel verifie : carte aerienne Morne-a-l'Eau, panneau lateral KCI premium,
stats correctes, pas d'erreur poi-labels.

## Statut Sainte-Rose (97127)

**FAIT** -- pret pour demo.

| Element                | Etat                                                           |
| ---------------------- | -------------------------------------------------------------- |
| Code INSEE             | 97127                                                          |
| Maire 2026             | Adrien Barron (egalement pdt CANBT)                            |
| EPCI                   | CANBT (Communaute d'agglomeration du Nord Basse-Terre)         |
| BBOX WGS84             | lat 16.27-16.36, lon -61.74 a -61.65                           |
| Centre carte           | (-61.695, 16.315)                                              |
| Title / H1             | "Carte 3D — Sainte-Rose" / "SAINTE-ROSE 3D"                    |
| Surface affichee       | 118,75 km^2                                                    |
| Population (2022)      | 18 064                                                         |
| Layers initialises     | 24                                                             |
| CINEMATIC_PRESETS      | overview/centre/cote/interieur, sub = "Sainte-Rose"            |
| TOURS                  | abandon / potentiel / complet, label = "Sainte-Rose"           |
| JS syntax              | OK                                                             |
| DVF 2024               | OK 132.6 KB                                                    |
| Defrichement DAAF      | OK 1.2 MB (clip + simplify auto, depuis 64 MB raw)             |
| Vegetation Overpass    | OK 26 features (foret tropicale dense -> peu d'objets discrets) |
| Branding               | contact@karukera-conseil.com OK                                |

Visuel verifie : carte aerienne avec littoral Nord Basse-Terre + bourg Sainte-Rose
+ plantations bananieres. **Levier upsell CANBT 6 communes a relancer post-demo.**

---

## Anomalies detectees pendant Phase B + corrections

1. **JS strings cassees par l'apostrophe** : `Morne-à-l'Eau` injecte dans des
   single-quoted JS strings (`sub: '...'`, `label: '...'`, `attribution: '...'`,
   etc.) cassait la syntaxe. Resolu via `name_js = name.replace("'", "\\'")`
   applique dans rewrite_html partout ou la cible est un literal JS.

2. **Float precision** : `bbox['center_lat'] - 0.005` -> `16.345000000000002`
   dans la heuristique PLU. Resolu via `round(..., 4)`.

3. **Defrichement WFS volumineux** : 70 MB raw pour Morne, 64 MB pour Sainte-Rose
   (le WFS KaruGeo ne respecte pas toujours strictement la BBOX EPSG:32620 et
   renvoie une partie de la Guadeloupe). Pipeline post-fetch automatique :
   `simplify-geojson.js` avec `--bbox` + `--tol=0.00005` -> 4.4 MB / 1.2 MB.
   Si `> 1 MB` apres fetch -> simplify auto integre dans `fetch_defrichement()`.

4. **Overpass 504** : rate-limit / timeout aleatoire. Le generateur fallback
   sur un FeatureCollection vide (le HTML ne 404 pas). Retry manuel possible
   via `python3 -c "from generate_commune import fetch_overpass_vegetation..."`.

5. **karugeo.js** : la BBOX WGS84 de `morne-a-leau` etait imprecise et il
   manquait `sainte-rose`. Mises a jour dans `COMMUNE_BBOX_WGS84`.

---

## Fichiers crees / modifies

### Modifies
- `topo3d-antilles/communes/97118-petit-bourg/index.html` (3 fixes Phase A)
- `topo3d-antilles/lib/generate_commune.py` (squelette -> industrialise)
- `topo3d-antilles/lib/data-fetchers/karugeo.js` (BBOX corrigee + ajout SR)

### Crees
- `topo3d-antilles/communes/97118-petit-bourg/data_batiments_petit_bourg.json`
- `topo3d-antilles/communes/97116-morne-a-leau/index.html`
- `topo3d-antilles/communes/97116-morne-a-leau/vercel.json`
- `topo3d-antilles/communes/97116-morne-a-leau/data_batiments_morne_a_leau.json`
- `topo3d-antilles/communes/97116-morne-a-leau/morne_a_leau_vegetation.geojson`
- `topo3d-antilles/communes/97116-morne-a-leau/GENERATION_REPORT.md`
- `topo3d-antilles/communes/97127-sainte-rose/index.html`
- `topo3d-antilles/communes/97127-sainte-rose/vercel.json`
- `topo3d-antilles/communes/97127-sainte-rose/data_batiments_sainte_rose.json`
- `topo3d-antilles/communes/97127-sainte-rose/sainte_rose_vegetation.geojson`
- `topo3d-antilles/communes/97127-sainte-rose/GENERATION_REPORT.md`
- `topo3d-antilles/data/cadastre/defrichement_morne-a-leau.geojson` (4.4 MB)
- `topo3d-antilles/data/cadastre/defrichement_sainte-rose.geojson` (1.2 MB)
- `topo3d-antilles/data/fiscal/dvf/dvf_97116_2024.csv`
- `topo3d-antilles/data/fiscal/dvf/dvf_97127_2024.csv`
- `topo3d-antilles/data/fiscal/dgfip/morne_a_leau_recettes.json` (template vide)
- `topo3d-antilles/data/fiscal/dgfip/morne_a_leau_zones_plu_aggregat.json`
- `topo3d-antilles/data/fiscal/dgfip/sainte_rose_recettes.json`
- `topo3d-antilles/data/fiscal/dgfip/sainte_rose_zones_plu_aggregat.json`
- `topo3d-antilles/data/vegetation/morne_a_leau_vegetation.geojson`
- `topo3d-antilles/data/vegetation/sainte_rose_vegetation.geojson`
- `topo3d-antilles/docs/PHASE_B_INDUSTRIALISATION_17avril2026.md` (ce fichier)

---

## Verdict

**PRET POUR PHASE C**

3 cartes operationnelles :
- Petit-Bourg (97118, Nebor, CANBT) -- product complet, fixes appliquees
- Morne-a-l'Eau (97116, Bardail, CANGT) -- pret RDV 15/05
- Sainte-Rose (97127, Barron, CANBT) -- pret pour demo + upsell CANBT

Generateur reutilisable pour les ~10 communes restantes du pipeline (Sainte-Anne,
Abymes, Edom, Port-Louis, Lamentin, etc.). Cout marginal estime : ~5 min/commune
en mode auto + ~10 min de QA Preview.

### Pistes Phase C suggerees (hors scope B)
- Fix `sky-atmo` MapLibre 4.x (mode background-color ou sky natif v5)
- ETL `build_batiments_commune.js` pour alimenter `data_batiments_*.json`
  (croisement BDTOPO IGN + DVF Cerema)
- Couche dents creuses (cf. memoire `project_harmonisation_cartes_dents_creuses`)
- PPRN Lizmap mapping INSEE -> projet pour communes non-PB
