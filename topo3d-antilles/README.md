# Topo3D Antilles

Plateforme de jumeaux numériques 3D interactifs pour les collectivités de Guadeloupe et Martinique.

## Positionnement

Topo3D Antilles est la marque produit B2G (vente aux mairies) de l'écosystème Karukera Conseil Immobilier.

- **Produit** : carte 3D MapLibre GL JS, navigable, avec couches SIG officielles (BDTOPO, cadastre, PLU, PPRN, défrichement DAAF, hydrographie IGN, monuments historiques) et données urbanistiques enrichies (scoring abandon, parcelles vacantes, fiscalité communale).
- **Cible** : 32 communes 971 + 34 communes 972, démarrage 13 mai 2026.
- **Tarification** : 7 500 € à 60 000 € selon volume de données et accompagnement.

## Lien avec KCI

Topo3D Antilles est opéré par **Karukera Conseil Immobilier (KCI)** — Dereck Rauzduel, architecte EPFL.

- Site KCI : https://karukera-conseil.com
- Email officiel : contact@karukera-conseil.com
- Domaine produit (à venir) : topo3d-antilles.fr (ou sous-domaine `topo3d.karukera-conseil.com`)

## Structure du dépôt

```
topo3d-antilles/
├── communes/                  # Une carte 3D par commune
│   ├── 97118-petit-bourg/     # MVP opérationnel (couches PLU, PPRN, défrichement, hydro, monuments)
│   ├── 97120-pap/             # Démo Pointe-à-Pitre
│   └── _template/             # Squelette pour générer une nouvelle commune
├── lib/
│   ├── generate_commune.py    # Générateur Python (squelette à compléter)
│   ├── wfs2geojson.js         # Conversion GML WFS → GeoJSON (sans GDAL)
│   └── data-fetchers/         # Helpers WMS/WFS (KaruGéo, IGN, INSEE)
├── data/
│   ├── plu/                   # GeoJSON PLU par commune
│   ├── pprn/                  # GeoJSON PPRN
│   ├── cadastre/              # GeoJSON cadastre + défrichement
│   └── fiscal/                # JSON fiscalité (TFB, TFNB, CFE, valeur locative)
├── api/
│   ├── ingest-fiscal.js       # Endpoint admin upload CSV/Excel fiscalité
│   └── _lib/security.js       # Module sécurité partagé (HMAC, rate-limit, etc.)
└── docs/
    ├── pitch-mairies.md       # Argumentaire vente B2G
    ├── grille-tarifaire.md    # Tarifs détaillés
    ├── donnees-fiscales-mairie.md  # Doc à transmettre aux mairies (Mme Aly)
    └── couches-sig-disponibles.md  # Référence WMS/WFS Karugéo + IGN
```

## Sources de données

Toutes les couches sont issues de portails publics officiels :

- **IGN Géoplateforme** (https://data.geopf.fr) : BDTOPO, orthophotos, cadastre, PLU, monuments historiques, hydrographie, LiDAR HD.
- **KaruGéo / DEAL Guadeloupe** (https://datacarto.karugeo.fr) : couches Guadeloupe spécifiques (défrichement DAAF, occupation forêt, etc.).
- **Géoplateforme Lizmap PPRN 971** (https://pprn971guadeloupe.fr) : Plans de Prévention des Risques Naturels par commune (zonages inondation, mouvement de terrain, houle, sismique).
- **OpenStreetMap / OpenFreeMap / Overpass API** : POI, base cartographique alternative.
- **API Adresse data.gouv.fr** : reverse geocoding adresses.
- **Cerema DVF** : mutations foncières.
- **AWS Terrarium DEM** : modèle numérique de terrain global.

## Contact

Karukera Conseil Immobilier — Dereck Rauzduel
contact@karukera-conseil.com
