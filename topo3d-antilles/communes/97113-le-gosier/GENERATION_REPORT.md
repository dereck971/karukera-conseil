# GENERATION REPORT — Le Gosier (97113)

- **Date** : 2026-04-17 15:48 UTC
- **Commune** : Le Gosier
- **INSEE** : 97113
- **EPCI** : CARL
- **Maire 2026** : Michel Hotin
- **Slug** : `le-gosier`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97113-le-gosier`

## Bounding box (WGS84)
- lat_min=16.2, lon_min=-61.55
- lat_max=16.24, lon_max=-61.48
- centre = (16.22, -61.515)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97113.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97113_2024.csv`
  - size_kb : `63.1`
- **defrichement** : KO
  - stderr : `Commune inconnue : le-gosier. Ajouter dans COMMUNE_BBOX_WGS84.
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
