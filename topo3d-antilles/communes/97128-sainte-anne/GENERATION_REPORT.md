# GENERATION REPORT — Sainte-Anne (97128)

- **Date** : 2026-04-17 15:50 UTC
- **Commune** : Sainte-Anne
- **INSEE** : 97128
- **EPCI** : CARL
- **Maire 2026** : Francs Baptiste
- **Slug** : `sainte-anne`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97128-sainte-anne`

## Bounding box (WGS84)
- lat_min=16.2, lon_min=-61.42
- lat_max=16.27, lon_max=-61.35
- centre = (16.235, -61.385)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97128.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97128_2024.csv`
  - size_kb : `132.8`
- **defrichement** : OK
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/cadastre/defrichement_sainte-anne.geojson`
  - size_raw_kb : `65577.8`
  - size_simplified_kb : `1127.8`
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
