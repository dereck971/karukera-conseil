# GENERATION REPORT — Pointe-à-Pitre (97120)

- **Date** : 2026-04-17 15:49 UTC
- **Commune** : Pointe-à-Pitre
- **INSEE** : 97120
- **EPCI** : CAPEX
- **Maire 2026** : Harry Durimel
- **Slug** : `pointe-a-pitre`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97120-pointe-a-pitre`

## Bounding box (WGS84)
- lat_min=16.23, lon_min=-61.55
- lat_max=16.26, lon_max=-61.52
- centre = (16.245, -61.535)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97120.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97120_2024.csv`
  - size_kb : `38.6`
- **defrichement** : KO
  - stderr : `Commune inconnue : pointe-a-pitre. Ajouter dans COMMUNE_BBOX_WGS84.
`
  - stdout : ``
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
