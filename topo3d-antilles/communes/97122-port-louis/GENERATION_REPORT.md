# GENERATION REPORT — Port-Louis (97122)

- **Date** : 2026-04-17 15:49 UTC
- **Commune** : Port-Louis
- **INSEE** : 97122
- **EPCI** : CANGT
- **Maire 2026** : Victor Arthein
- **Slug** : `port-louis`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97122-port-louis`

## Bounding box (WGS84)
- lat_min=16.41, lon_min=-61.55
- lat_max=16.46, lon_max=-61.49
- centre = (16.435, -61.52)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97122.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97122_2024.csv`
  - size_kb : `8.5`
- **defrichement** : KO
  - stderr : `Commune inconnue : port-louis. Ajouter dans COMMUNE_BBOX_WGS84.
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
