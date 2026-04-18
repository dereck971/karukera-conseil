# GENERATION REPORT — Goyave (97114)

- **Date** : 2026-04-17 15:49 UTC
- **Commune** : Goyave
- **INSEE** : 97114
- **EPCI** : CANBT
- **Maire 2026** : Jean-Luc Edom
- **Slug** : `goyave`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97114-goyave`

## Bounding box (WGS84)
- lat_min=16.1, lon_min=-61.6
- lat_max=16.16, lon_max=-61.53
- centre = (16.13, -61.565)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97114.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97114_2024.csv`
  - size_kb : `16.1`
- **defrichement** : KO
  - stderr : `Commune inconnue : goyave. Ajouter dans COMMUNE_BBOX_WGS84.
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
