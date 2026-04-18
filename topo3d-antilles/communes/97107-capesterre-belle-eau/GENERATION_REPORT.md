# GENERATION REPORT — Capesterre-Belle-Eau (97107)

- **Date** : 2026-04-17 15:48 UTC
- **Commune** : Capesterre-Belle-Eau
- **INSEE** : 97107
- **EPCI** : CAGSC
- **Maire 2026** : Jean-Philippe Courtois
- **Slug** : `capesterre-belle-eau`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97107-capesterre-belle-eau`

## Bounding box (WGS84)
- lat_min=16.0, lon_min=-61.63
- lat_max=16.08, lon_max=-61.5
- centre = (16.04, -61.565)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97107.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97107_2024.csv`
  - size_kb : `48.6`
- **defrichement** : KO
  - stderr : `Commune inconnue : capesterre-belle-eau. Ajouter dans COMMUNE_BBOX_WGS84.
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
