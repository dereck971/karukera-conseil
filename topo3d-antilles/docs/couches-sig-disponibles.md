# Topo3D Antilles — Catalogue des couches SIG disponibles

**Mise à jour** : 17/04/2026
**Référence** : Documentation interne KCI / Topo3D Antilles

Toutes les couches listées sont issues de portails publics officiels avec licence ouverte (Etalab 2.0, Licence ouverte d'utilisation des données publiques, ou équivalent). KCI ne stocke localement que les couches qui exigent une transformation (ex : GML défrichement → GeoJSON).

---

## 1. IGN Géoplateforme — `https://data.geopf.fr`

### Couches WMS raster

| Nom de couche | Endpoint | Usage Topo3D |
|---|---|---|
| `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` | wms-r/wms | Cadastre IGN, parcelles |
| `GEOGRAPHICALGRIDSYSTEMS.1702_PPR` | wms-r/wms | Plans de prévention des risques (PPR — fallback générique) |
| `PROTECTEDSITES.MNHN.MONUMENTS_HISTORIQUES.PERIMETRES` | wms-r/wms | Monuments historiques (MNHN/Mérimée) |
| `HYDROGRAPHY.HYDROGRAPHY` | wms-r/wms | Hydrographie IGN (cours d'eau, lacs) |

### Couches WMTS (tuiles)

| Nom de couche | Format | Usage Topo3D |
|---|---|---|
| `ORTHOIMAGERY.ORTHOPHOTOS` | image/jpeg | Orthophoto haute résolution |
| `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` | image/png | Plan IGN v2 |
| `IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW` | image/png | LiDAR HD MNT (sol nu) |
| `IGNF_LIDAR-HD_MNS_ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW` | image/png | LiDAR HD MNS (sursol) |
| `IGNF_LIDAR-HD_MNH_ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW` | image/png | LiDAR HD MNH (hauteurs) |

### Couches WMS vector (PLU)

| Nom de couche | Endpoint | Usage |
|---|---|---|
| `zone_urba` | wms-v/ows | PLU — zonage |
| `prescription_surf` | wms-v/ows | PLU — prescriptions surfaciques |

### APIs REST

| API | Endpoint | Usage |
|---|---|---|
| **Apicarto Cadastre** | `https://apicarto.ign.fr/api/cadastre/parcelle?geom=...` | Récupère la parcelle au point cliqué |
| **API Adresse BAN** | `https://api-adresse.data.gouv.fr/{search,reverse}` | Geocoding et reverse geocoding |
| **Cerema DVF** | `https://apidf-preprod.cerema.fr/dvf_opendata/mutations` | Mutations foncières DVF (5 ans) |

---

## 2. KaruGéo — `https://datacarto.karugeo.fr`

Portail SIG officiel Guadeloupe (DEAL/DAAF) — technologie Prodige + MapServer 7.0.7.
**Projection native** : EPSG:32620 (UTM 20N).

### Endpoints

| Service | URL | Notes |
|---|---|---|
| WMS | `https://datacarto.karugeo.fr/wms?service=WMS&request=GetCapabilities&version=1.3.0` | 50+ couches publiques |
| WFS | `https://datacarto.karugeo.fr/wfs?service=WFS&request=GetCapabilities` | Requis pour les couches sans WMS (ex : défrichement) |
| CSW | `https://www.karugeo.fr/geonetwork/srv/fre/csw-INSPIRE` | Catalogue de métadonnées |

### Couches identifiées (utiles Topo3D)

| Nom couche | WMS | WFS | Usage |
|---|---|---|---|
| `ms:couche_unifiees_defrichement_2024` | NON | OUI | **Défrichement DAAF — couche officielle 2024** (zones soumises à autorisation Art. L.341/L.342-1 Code forestier). Format GML, à convertir en GeoJSON via `lib/wfs2geojson.js`. |
| `ms:ocs_foret_2013` | OUI | OUI | Occupation du sol forêt 2013 (proxy défrichement historique) |
| `ms:forestier_hr_clc_2012` | OUI | OUI | Espaces forestiers CLC 2012 |
| `ms:mh_202_merimee` | OUI | OUI | Monuments historiques Mérimée Guadeloupe |

### Procédure WFS → GeoJSON pour MapLibre

1. Calculer la bbox de la commune en EPSG:32620 via `proj4` (helper : `lib/data-fetchers/karugeo.js`).
2. Requête WFS GetFeature : `?srsName=EPSG:32620&bbox={minx,miny,maxx,maxy},EPSG:32620&count=500`
3. Récupération du GML (potentiellement plusieurs pages).
4. Conversion en GeoJSON via `lib/wfs2geojson.js` (parser maison sans GDAL).
5. Clip côté client sur la bbox WGS84 commune.
6. Stockage dans `data/cadastre/defrichement_{commune}.geojson`.
7. Chargement comme source GeoJSON MapLibre, style fill avec popup au clic.

> **Note** : la couche défrichement est globale Guadeloupe (~50 MB GML brut) — le clip par commune ramène à 1-5 MB selon la commune.

---

## 3. PPRN Lizmap Guadeloupe — `https://pprn971guadeloupe.fr`

Plans de Prévention des Risques Naturels par commune. Plateforme Lizmap (instance dédiée).

### Endpoint type

```
https://pprn971guadeloupe.fr/index.php/lizmap/service?
   repository=pprn971&project={NOM_PROJET}&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
```

### Mapping projet par commune (vérifié 17/04/2026)

| Commune | Code INSEE | Nom du projet Lizmap |
|---|---|---|
| Petit-Bourg | 97118 | `PETITBOURG` |
| Autres communes | — | À auditer une par une (URL https://pprn971guadeloupe.fr/) |

### Couches typiques par PPRN commune

- Zonage inondation
- Zonage mouvement de terrain
- Zonage houle/submersion marine
- Zonage sismique (rare — souvent au niveau Guadeloupe entière, zone 5)

> Toutes ces sous-couches sont accessibles en WMS via le même endpoint, ID layer fourni par GetCapabilities du projet.

---

## 4. Sources tierces complémentaires

| Source | URL | Usage |
|---|---|---|
| **OpenFreeMap** | `https://tiles.openfreemap.org/planet` | Tuiles vectorielles MVT (bâtiments, routes, eau, espaces verts) — fond OSM enrichi |
| **OpenStreetMap** | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Fond plan OSM standard |
| **Overpass API** | `https://overpass-api.de/api/interpreter` | POI (écoles, hôpitaux, mairies, etc.) |
| **AWS Terrarium DEM** | `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Modèle numérique de terrain global pour le terrain 3D MapLibre |

---

## 5. Couches en attente / à explorer

| Couche | Source pressentie | Statut |
|---|---|---|
| Atlas des patrimoines (zones de présomption archéologique) | `https://atlas.patrimoines.culture.fr/` | À auditer — endpoint WMS public à valider, sinon fallback couche MH IGN |
| BD Topage IGN (cours d'eau vectoriels) | IGN Géoplateforme | À tester pour remplacer la couche raster `HYDROGRAPHY.HYDROGRAPHY` par du vectoriel stylé |
| Couches Fabre (Petit-Bourg) | Direction urbanisme Petit-Bourg | En attente — format à confirmer (GeoJSON / Shapefile / WMS custom) |
| RNNL Saint-Martin / Saint-Barth | DEAL îles du Nord | Hors périmètre Guadeloupe — à reconsidérer si onboarding |

---

## Mentions de licence à respecter

Toute carte Topo3D Antilles publiée doit afficher dans son footer :

> Sources : IGN Géoplateforme · KaruGéo (DEAL/DAAF Guadeloupe) · OpenStreetMap contributeurs · Cerema DVF · AWS Terrarium DEM. Données sous licence Etalab 2.0 / Licence ouverte 2.0 / ODbL.

Vérifier chaque mise en ligne via le footer du HTML.
