# GENERATION REPORT — Morne-à-l'Eau (97116)

- **Date** : 2026-04-17 07:23 UTC
- **Commune** : Morne-à-l'Eau
- **INSEE** : 97116
- **EPCI** : CANGT
- **Maire 2026** : Jean Bardail
- **Slug** : `morne-a-leau`
- **Sortie** : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/communes/97116-morne-a-leau`

## Bounding box (WGS84)
- lat_min=16.3, lon_min=-61.51
- lat_max=16.4, lon_max=-61.36
- centre = (16.35, -61.435)

## Fetchers
- **dvf** : OK
  - url : `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/971/97116.csv`
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/fiscal/dvf/dvf_97116_2024.csv`
  - size_kb : `14.8`
- **defrichement** : OK
  - path : `/Users/dereck/Desktop/SYNTHESE ECOSYSTEME/.claude/worktrees/loving-herschel-7810a7/topo3d-antilles/data/cadastre/defrichement_morne-a-leau.geojson`
  - size_raw_kb : `70899.1`
  - size_simplified_kb : `4379.7`
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
