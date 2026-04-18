# GENERATION REPORT — Baie-Mahault (97103)

- **Date** : 2026-04-17 15:48 UTC
- **Commune** : Baie-Mahault
- **INSEE** : 97103
- **EPCI** : CAPEX
- **Maire 2026** : Michel Mado
- **Slug** : `baie-mahault`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97103-baie-mahault`

## Bounding box (WGS84)
- lat_min=16.24, lon_min=-61.62
- lat_max=16.32, lon_max=-61.55
- centre = (16.28, -61.585)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97103.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97103_2024.csv`
  - size_kb : `101.4`
- **defrichement** : OK
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/cadastre/defrichement_baie-mahault.geojson`
  - size_raw_kb : `61162.9`
  - size_simplified_kb : `822.3`
- **vegetation** : KO
  - error : `HTTP Error 504: Gateway Timeout`
  - fallback_empty : `True`

## QA Checklist (a valider via Preview)
- [ ] Code INSEE correct dans le footer + search placeholder
- [ ] Maire 2026 affiche dans le footer
- [ ] EPCI rattache correct (ne pas confondre CANBT vs CANGT)
- [ ] BBOX coherente avec la geographie (carte zoom sur la bonne zone)
- [ ] Toggles couches fonctionnent
- [ ] Modaux fiscaux ouvrent
- [ ] Presets cinematiques pertinents
- [ ] Pas d'erreurs console
- [ ] Branding KCI : contact@karukera-conseil.com, karukera-conseil.com, pas 'metropole'
