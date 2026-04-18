# GENERATION REPORT — Les Abymes (97101)

- **Date** : 2026-04-17 15:47 UTC
- **Commune** : Les Abymes
- **INSEE** : 97101
- **EPCI** : CAPEX
- **Maire 2026** : Eric Jalton
- **Slug** : `les-abymes`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97101-les-abymes`

## Bounding box (WGS84)
- lat_min=16.24, lon_min=-61.53
- lat_max=16.37, lon_max=-61.48
- centre = (16.305, -61.505)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97101.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97101_2024.csv`
  - size_kb : `77.2`
- **defrichement** : KO
  - stderr : `Commune inconnue : les-abymes. Ajouter dans COMMUNE_BBOX_WGS84.
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
