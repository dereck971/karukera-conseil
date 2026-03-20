# SargaWatch Antilles — Architecture Technique
## Application de suivi en temps réel des sargasses (Guadeloupe & Martinique)
### Intégrée à l'écosystème Topo3D-Antilles

**Version** : 1.0 — 20 mars 2026
**Auteur** : Dereck Rauzduel / Écosystème KCI
**Statut** : Plan d'architecture — pré-développement

---

## 1. Vision produit

SargaWatch Antilles est une plateforme web qui combine la surveillance satellite des sargasses en temps réel avec la visualisation 3D du littoral guadeloupéen et martiniquais. L'application offre trois niveaux d'usage selon le profil utilisateur : investisseur immobilier (risque côtier), collectivité locale (anticipation des échouages), et grand public (état des plages).

L'intégration native avec le moteur Topo3D-Antilles existant permet une vue immersive 3D des zones côtières touchées, créant un avantage concurrentiel unique sur le marché caribéen.

### Proposition de valeur

Pour les **investisseurs KCI** : un score de risque sargasses intégré aux rapports de faisabilité, permettant d'évaluer l'impact sur la valorisation d'un terrain côtier avant d'investir.

Pour les **collectivités** : un tableau de bord prédictif avec alertes J+4 à J+7, permettant de planifier le ramassage et d'informer les populations.

Pour le **grand public** : une consultation simple de l'état des plages avec prévisions à court terme, accessible sur mobile.

---

## 2. Sources de données — Cartographie complète

### 2.1 Données satellite (temps réel / quasi-quotidien)

| Source | Capteur | Résolution | Fréquence | Format | Accès | Fiabilité |
|--------|---------|------------|-----------|--------|-------|-----------|
| **CLS / SAMtool** (via CMEMS) | OLCI Sentinel-3 + MODIS | 300m (large) / 20m (côtier) | Quotidien | NetCDF, GeoTIFF | Copernicus Marine Data Store (gratuit, inscription) | ★★★★★ |
| **SeSaM** (SCO / CLS + IRD) | OLCI + MODIS + MSI Sentinel-2 + Landsat-8/9 | 300m à 20m | Quotidien | Plateforme web + AVISO/ODATIS | Gratuit via plateforme SeSaM | ★★★★★ |
| **USF SaWS** (Univ. South Florida) | MODIS Aqua/Terra | ~1km | Quotidien + bulletin mensuel | Images PNG, données traitées | Site web USF (gratuit) | ★★★★☆ |
| **CARICOOS Sargassum Tracker** | OLCI Sentinel-3 (MCI + AFAI) | ~300m | Quotidien | GeoTIFF, GeoJSON, PNG | Site CARICOOS (gratuit, téléchargement) | ★★★★☆ |
| **NASA MODIS** (données brutes) | MODIS Aqua/Terra | 250m-1km | Quotidien | HDF, NetCDF | NASA OB.DAAC (gratuit) | ★★★★☆ |

**Algorithmes de détection utilisés par ces sources :**
- **AFAI** (Alternative Floating Algae Index) : le plus robuste, tolérant aux aérosols et au sun glint, utilise les bandes NIR. Standard de référence.
- **FAI** (Floating Algae Index) : utilisé depuis 2009, performant pour le monitoring large échelle.
- **MCI** (Maximum Chlorophyll Index) : utilisé par CARICOOS, bon contraste sargasses/eau.
- **NDVI** : sensible aux conditions environnementales, moins fiable pour l'automatisation.

**Recommandation** : Utiliser **CLS/SAMtool via CMEMS** comme source primaire (meilleure résolution côtière 20m, mise à jour quotidienne, accès API structuré via Copernicus) + **CARICOOS** en source secondaire (GeoJSON téléchargeable directement).

### 2.2 Modèles de prévision (drift & échouage)

| Source | Modèle | Horizon | Résolution | Forçage | Accès |
|--------|--------|---------|------------|---------|-------|
| **Météo-France Antilles** | MOTHY (drift) | J+4 + tendance J+14 | Communale | GLO12 (Mercator) + vents GFS | Bulletins web (pas d'API publique) |
| **CMEMS GLO12** | Mercator global | J+10 | 1/12° (~9km) | Assimilation multi-sources | API Copernicus (gratuit) |
| **CAR36** (Mercator/CMEMS) | Régional Caraïbes | J+10 | 1/36° (~3km) | Marées + forcing atmo horaire | CMEMS Data Store |
| **NEMO-Sarg1.0** (IRD/SeSaM) | Biologique + dérive | 3-6 mois (saisonnier) | Bassin Atlantique | ECMWF SEAS5 | Plateforme SeSaM |
| **CARICOOS coastal model** | Circulation côtière | J+7 | Haute résolution locale | Courants + vents | Site CARICOOS |

**Recommandation** : Combiner **CAR36** (courants haute résolution Caraïbes) + **données de vent GFS/ECMWF** pour un modèle de dérive propre, avec validation croisée contre les bulletins Météo-France. Pour les prévisions saisonnières, intégrer les sorties **NEMO-Sarg1.0**.

### 2.3 Données collaboratives (crowdsourcing)

Aucune plateforme de signalement citoyen n'existe actuellement pour la Guadeloupe/Martinique. C'est une opportunité à saisir.

**Architecture proposée :**
- Application mobile progressive (PWA) permettant de signaler un échouage avec photo géolocalisée
- Validation par IA (classification image) + modération communautaire
- API REST pour recevoir les signalements et les intégrer à la carte
- Partenariat potentiel avec les communes, offices de tourisme, et associations environnementales

### 2.4 Données contextuelles complémentaires

| Donnée | Source | Usage |
|--------|--------|-------|
| Trait de côte | IGN BD TOPO + Shom | Modéliser la ligne côtière en 3D |
| Bathymétrie côtière | Shom (données gratuites) | Profondeur littorale pour modèle de dérive |
| Élévation terrain | IGN RGE ALTI (via Topo3D) | Relief côtier en 3D |
| Parcelles cadastrales | IGN Apicarto (via Topo3D) | Identifier les terrains à risque |
| Zonage PLU | GPU (via Topo3D) | Croiser risque sargasses + constructibilité |
| Plages référencées | OpenStreetMap + données tourisme | Nommer et référencer les plages |

---

## 3. Architecture technique

### 3.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Dashboard 2D │  │  Vue 3D      │  │  PWA Mobile              │  │
│  │ (Mapbox GL)  │  │ (Three.js)   │  │  (signalements)          │  │
│  │              │  │ Moteur Topo3D│  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │               │
│         └─────────────────┼────────────────────────┘               │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ API REST / WebSocket
┌───────────────────────────┼─────────────────────────────────────────┐
│                      BACKEND (Node.js / Python)                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ API Gateway  │  │ Data Pipeline│  │  Drift Engine            │  │
│  │ (Express/    │  │ (Python)     │  │  (Python - CAR36 +       │  │
│  │  Fastify)    │  │              │  │   particules lagrangien) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Auth & Rôles │  │ Alert Engine │  │  ML Image Classifier     │  │
│  │ (NextAuth)   │  │ (cron + push)│  │  (validation photos)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────┐
│                      DATA LAYER                                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ PostgreSQL   │  │ Redis        │  │  S3/MinIO                │  │
│  │ + PostGIS    │  │ (cache +     │  │  (tuiles satellite,      │  │
│  │ (géo-données)│  │  temps réel) │  │   photos crowdsource)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────┐
│                 SOURCES EXTERNES (ingestion)                        │
│                                                                     │
│  CMEMS/CLS ──── CARICOOS ──── NASA ──── Météo-France ──── IGN     │
│  (satellite)    (GeoJSON)     (MODIS)   (bulletins)      (Topo3D) │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Stack technologique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Frontend web** | Next.js 15 + React 19 | SSR, routing, API routes intégrées |
| **Carte 2D** | Mapbox GL JS | Tuiles vectorielles, styles custom, performances mobiles |
| **Vue 3D** | Three.js r128 (moteur Topo3D) | Réutilisation directe du code Topo3D existant |
| **API backend** | Node.js (Fastify) + Python (FastAPI) | Node pour l'API temps réel, Python pour le traitement satellite |
| **Pipeline données** | Python (xarray, netCDF4, rasterio) | Standard pour traitement données océanographiques |
| **Modèle de dérive** | Python (OceanParcels / Parcels) | Framework lagrangien open-source de référence |
| **Base de données** | PostgreSQL 16 + PostGIS 3.4 | Requêtes géospatiales natives, ST_Within, ST_Intersects |
| **Cache temps réel** | Redis 7 | Pub/sub pour les mises à jour live, cache tuiles |
| **Stockage objets** | Cloudflare R2 (compatible S3) | Tuiles satellite, photos crowdsource, pas d'egress fees |
| **Auth** | NextAuth.js v5 | Multi-profil (investisseur, commune, citoyen) |
| **Hébergement** | Vercel (frontend) + Railway/Fly.io (backend Python) | Déploiement simple, scaling auto |
| **Mobile** | PWA (Progressive Web App) | Pas besoin de store, notifications push, offline |

### 3.3 Intégration avec Topo3D-Antilles

Le skill Topo3D produit déjà des previews HTML interactives en Three.js avec le littoral en 3D. L'intégration se fait à trois niveaux :

**Niveau 1 — Réutilisation du moteur 3D :**
Le code Three.js de Topo3D (contrôles orbitaux, mesh terrain, extraction contours, calques toggleables) est extrait en module réutilisable. Le terrain côtier est chargé via les mêmes APIs IGN (altimétrie RGE ALTI + BD TOPO) avec un buffer élargi vers la mer.

**Niveau 2 — Nouveau calque "Sargasses" :**
Un calque dédié est ajouté au système de calques toggleables de la maquette :
- Affichage des radeaux de sargasses détectés par satellite comme des surfaces flottantes semi-transparentes (vert-brun, opacity 0.6)
- Particules animées montrant la direction de dérive prévue
- Code couleur par densité (vert clair → jaune → orange → rouge)
- Mise à jour automatique toutes les heures via WebSocket

**Niveau 3 — Score de risque pour KCI :**
Calcul automatique d'un "Score Risque Sargasses" (0-10) pour toute parcelle côtière analysée par KCI :
- Distance à la côte exposée
- Historique d'échouages sur la zone (5 dernières années)
- Exposition aux courants dominants
- Prévision à 3 mois (saisonnière)

Ce score s'intègre directement dans les rapports de faisabilité KCI (skill `kci-rapport`).

---

## 4. Architecture des données

### 4.1 Pipeline d'ingestion satellite

```
CMEMS API ──────┐
                 │     ┌──────────────┐     ┌─────────────┐
CARICOOS ────────┼────→│  Ingester    │────→│  PostGIS    │
                 │     │  (Python)    │     │  + Redis    │
NASA OB.DAAC ───┘     │              │     │             │
                       │  • xarray    │     │  • Rasters  │
Météo-France ──────────│  • rasterio  │     │  • Vecteurs │
(scraping bulletins)   │  • netCDF4   │     │  • Cache    │
                       └──────────────┘     └─────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Tile Server │
                       │  (Titiler /  │
                       │   pg_tileserv)│
                       └──────────────┘
                              │
                              ▼
                       Tuiles XYZ → Mapbox GL + Three.js
```

**Processus quotidien (cron 06:00 UTC) :**

1. Télécharger les produits sargasses CMEMS du jour (NetCDF via API Copernicus)
2. Télécharger les GeoTIFF/GeoJSON CARICOOS
3. Scraper le bulletin Météo-France Guadeloupe + Martinique (HTML → données structurées)
4. Fusionner les sources avec pondération par fiabilité
5. Générer les tuiles raster (Cloud Optimized GeoTIFF) pour Mapbox
6. Mettre à jour PostGIS (polygones de concentration, historique)
7. Recalculer les prévisions de dérive J+4
8. Publier via Redis pub/sub vers les clients WebSocket
9. Déclencher les alertes si seuil dépassé

### 4.2 Schéma base de données (PostGIS)

```sql
-- Détections satellite (polygones de sargasses)
CREATE TABLE sargassum_detections (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50),           -- 'cmems', 'caricoos', 'usf', 'crowdsource'
    detected_at TIMESTAMPTZ,
    geom GEOMETRY(MultiPolygon, 4326),
    density_index FLOAT,          -- 0.0 à 1.0
    area_km2 FLOAT,
    confidence FLOAT,             -- 0.0 à 1.0
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_detect_geom ON sargassum_detections USING GIST(geom);
CREATE INDEX idx_detect_time ON sargassum_detections(detected_at DESC);

-- Prévisions de dérive
CREATE TABLE drift_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_date DATE,
    target_date DATE,             -- date d'échouage prévue
    horizon_hours INT,
    geom GEOMETRY(MultiPolygon, 4326),  -- zone d'impact prévue
    probability FLOAT,            -- 0.0 à 1.0
    model_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signalements crowdsource
CREATE TABLE crowd_reports (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    reported_at TIMESTAMPTZ,
    geom GEOMETRY(Point, 4326),
    photo_url TEXT,
    severity INT CHECK (severity BETWEEN 1 AND 5),
    beach_name VARCHAR(200),
    commune VARCHAR(100),
    validated BOOLEAN DEFAULT FALSE,
    ml_score FLOAT,               -- score IA de validation
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plages et zones côtières référencées
CREATE TABLE coastal_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    commune VARCHAR(100),
    department VARCHAR(3),        -- '971' ou '972'
    zone_type VARCHAR(50),        -- 'plage', 'port', 'mangrove', 'falaise'
    geom GEOMETRY(MultiLineString, 4326),  -- trait de côte
    exposure_score FLOAT,         -- 0-10 exposition aux sargasses
    historical_avg_events INT,    -- moyenne annuelle d'échouages
    tourism_index FLOAT           -- fréquentation touristique relative
);

-- Score risque sargasses par parcelle (intégration KCI)
CREATE TABLE parcel_sargassum_risk (
    id SERIAL PRIMARY KEY,
    parcelle_ref VARCHAR(50),     -- ex: '971 AB 0045'
    commune VARCHAR(100),
    distance_coast_m FLOAT,
    exposure_score FLOAT,         -- 0-10
    historical_score FLOAT,       -- 0-10 (basé sur 5 ans d'historique)
    seasonal_forecast FLOAT,      -- 0-10 (prévision NEMO-Sarg)
    global_risk_score FLOAT,      -- 0-10 (score composite)
    computed_at TIMESTAMPTZ,
    valid_until TIMESTAMPTZ
);

-- Utilisateurs multi-profils
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(200),
    role VARCHAR(20),             -- 'investor', 'municipality', 'public', 'admin'
    commune VARCHAR(100),         -- pour les élus
    notifications JSONB,          -- préférences d'alertes
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Interfaces utilisateur

### 5.1 Dashboard 2D — Vue d'ensemble (tous profils)

**Carte Mapbox GL plein écran :**
- Fond satellite ou clair, centré sur l'arc antillais
- Couches superposées : détections satellite (heatmap), prévisions de dérive (flèches animées), signalements citoyens (marqueurs)
- Timeline glissante en bas : naviguer dans l'historique jour par jour
- Panneau latéral : sélection zone (Guadeloupe / Martinique / Saint-Martin), filtres par source, légende

**Panneau d'alertes :**
- Alertes actives par commune
- Niveau de risque (vert/jaune/orange/rouge)
- Prévision J+1 à J+4
- Tendance J+14 (inspirée Météo-France)

### 5.2 Vue 3D immersive — Zoom côtier (Topo3D)

Quand l'utilisateur clique sur une zone côtière, transition fluide vers la vue 3D :
- Terrain littoral en 3D (mesh IGN RGE ALTI, résolution 2-5m)
- Surface de l'eau avec shader réaliste (reflets, vagues légères)
- Radeaux de sargasses flottants (géométrie plate avec texture animée)
- Flèches de courant animées montrant la direction de dérive
- Bâtiments existants (BD TOPO) visibles en contexte
- Calques toggleables identiques au système Topo3D existant

**Calques spécifiques sargasses :**
| Calque | Contenu | Couleur |
|--------|---------|---------|
| Sargasses détectées | Radeaux satellite du jour | Gradient vert→rouge |
| Dérive prévue J+1 | Trajectoires particules | Flèches orange |
| Dérive prévue J+4 | Zone d'impact élargie | Halo rouge transparent |
| Historique 30j | Cumul des détections | Heatmap bleu→rouge |
| Signalements | Photos citoyens géolocalisées | Marqueurs jaunes |

### 5.3 Vue investisseur KCI

Accessible depuis un rapport KCI ou en mode standalone :
- Fiche parcelle avec score risque sargasses (0-10) décomposé
- Carte de la parcelle avec distance à la côte visualisée
- Historique 5 ans d'échouages sur le secteur (graphique)
- Prévision saisonnière (3-6 mois) avec tendance
- Impact estimé sur la valorisation du bien (% de décote suggérée)
- Recommandation : « Risque sargasses : faible / modéré / élevé — impact sur l'investissement »

### 5.4 Vue collectivité / mairie

Dashboard dédié avec :
- Carte communale avec les plages à risque identifiées
- Planning prévisionnel de ramassage (suggestion IA basée sur prévisions)
- Historique des interventions (saisie manuelle ou API)
- Coût estimé du ramassage par épisode
- Export PDF des bulletins pour communication
- Système d'alerte configurable (email, SMS, push)

### 5.5 PWA grand public

Interface mobile simplifiée :
- Carte avec état des plages (pastilles vert/jaune/orange/rouge)
- Prévision à 4 jours par plage
- Bouton "Signaler" avec photo + géolocalisation auto
- Notifications push par plage favorite
- Mode hors-ligne (dernières données en cache)

---

## 6. Modèle de dérive — Moteur de prévision

### 6.1 Approche lagrangienne (OceanParcels)

Le moteur de prévision utilise une simulation lagrangienne de particules virtuelles représentant les radeaux de sargasses :

```python
# Pseudo-code du moteur de dérive
from parcels import FieldSet, ParticleSet, JITParticle

# 1. Charger les champs de courant CAR36 (CMEMS)
fieldset = FieldSet.from_netcdf(
    filenames={'U': 'car36_u.nc', 'V': 'car36_v.nc'},
    variables={'U': 'uo', 'V': 'vo'},
    dimensions={'lon': 'longitude', 'lat': 'latitude', 'time': 'time'}
)

# 2. Ajouter le forçage vent (GFS) — windage 1-3%
fieldset.add_field(wind_u * 0.02)  # 2% du vent
fieldset.add_field(wind_v * 0.02)

# 3. Initialiser les particules aux positions satellite
pset = ParticleSet(
    fieldset=fieldset,
    pclass=JITParticle,
    lon=detection_lons,
    lat=detection_lats
)

# 4. Simuler la dérive sur 4-7 jours
pset.execute(
    AdvectionRK4,
    runtime=timedelta(days=7),
    dt=timedelta(minutes=30),
    output_file=output
)

# 5. Identifier les particules qui touchent la côte
# → zones d'échouage prévues avec probabilité
```

### 6.2 Calibration locale

Le modèle est calibré spécifiquement pour la Guadeloupe et la Martinique :
- Courant Nord Équatorial (direction dominante E→W)
- Alizés (NE→SW, 15-25 nœuds)
- Effets de côte : contournement des îles, accumulation dans les baies orientées à l'est
- Côte au vent vs sous le vent : exposition très différente
- Validation contre les observations historiques Météo-France (bulletins 2018-2025)

---

## 7. Système d'alertes

### 7.1 Niveaux d'alerte

| Niveau | Couleur | Critère | Action |
|--------|---------|---------|--------|
| 0 - Aucun | Vert | Aucune détection dans un rayon de 200km | — |
| 1 - Veille | Jaune | Radeaux détectés à 100-200km, dérive possible | Information |
| 2 - Pré-alerte | Orange | Radeaux à < 100km, échouage probable J+2-4 | Mobilisation |
| 3 - Alerte | Rouge | Échouage en cours ou imminent (< 24h) | Intervention |
| 4 - Crise | Violet | Échouage massif confirmé (> seuil communal) | Urgence |

### 7.2 Canaux de notification

- **Email** : tous profils, digest quotidien ou alerte instantanée
- **Push notification** : PWA mobile, par plage favorite
- **SMS** : collectivités uniquement (via Twilio / OVH SMS)
- **Webhook** : intégration systèmes tiers (mairies, SDIS)
- **API** : pour les développeurs tiers

---

## 8. Intégration écosystème KCI

### 8.1 Score Risque Sargasses dans les rapports

Le score (0-10) est calculé automatiquement pour toute parcelle côtière (< 2km de la mer) et intégré dans le rapport de faisabilité KCI :

```
Score Risque Sargasses =
  0.30 × distance_score     // distance à la côte exposée
+ 0.25 × historical_score   // fréquence échouages 5 ans
+ 0.20 × exposure_score     // orientation côte / courants
+ 0.15 × seasonal_score     // prévision NEMO-Sarg 3 mois
+ 0.10 × density_score      // densité actuelle satellite
```

**Grille d'interprétation :**
| Score | Risque | Impact valorisation |
|-------|--------|---------------------|
| 0-2 | Négligeable | Aucun |
| 3-4 | Faible | -2 à -5% en saison |
| 5-6 | Modéré | -5 à -10% en saison |
| 7-8 | Élevé | -10 à -20% permanent |
| 9-10 | Critique | Déconseillé investissement locatif |

### 8.2 Enrichissement du skill Topo3D

Le skill `topo-3d-parcelle` est enrichi d'une étape supplémentaire dans son workflow :

```
Étape 3ter — Évaluer le risque sargasses (si parcelle < 2km côte)
  → Interroger SargaWatch API
  → Ajouter score + historique dans terrain_data.js
  → Afficher calque "Zone sargasses" dans la preview maquette
  → Inclure dans le rapport récapitulatif
```

### 8.3 Nouveau skill potentiel : `sargawatch-report`

Un skill dédié pourrait produire un rapport PDF de risque sargasses pour un client KCI :
- Carte de la zone avec historique d'échouages
- Score détaillé avec décomposition
- Prévisions saisonnières
- Recommandation d'investissement ajustée
- Prix : intégré dans l'offre Premium (299€) ou en add-on (49€)

---

## 9. Modèle économique

### 9.1 Revenus

| Canal | Cible | Modèle | Prix estimé |
|-------|-------|--------|-------------|
| **Freemium grand public** | Touristes, résidents | Gratuit (limité) / 2.99€/mois (premium) | MRR potentiel si volume |
| **Score KCI intégré** | Investisseurs | Inclus dans offre Premium 299€ | Déjà dans le prix |
| **Add-on rapport sargasses** | Investisseurs | 49€/rapport standalone | Marge haute |
| **Abonnement collectivités** | Mairies, EPCI | 99-499€/mois selon taille | Récurrent B2G |
| **API data** | Développeurs, assureurs | 0.01€/requête ou forfait | Volume |
| **Subvention** | État, ADEME, FEDER | Financement projet | One-shot |

### 9.2 Coûts estimés

| Poste | Mensuel | Annuel | Détail |
|-------|---------|--------|--------|
| Hébergement (Vercel + Railway) | 50-150€ | 600-1800€ | Scaling auto |
| Stockage (Cloudflare R2) | 10-30€ | 120-360€ | Tuiles + photos |
| Base de données (Supabase/Neon) | 25-75€ | 300-900€ | PostGIS managed |
| SMS alertes (Twilio) | 20-100€ | 240-1200€ | Selon volume |
| Mapbox (tuiles carte) | 0-50€ | 0-600€ | Gratuit jusqu'à 50k vues |
| Copernicus CMEMS | Gratuit | Gratuit | Open data |
| NASA / CARICOOS | Gratuit | Gratuit | Open data |
| **Total infra** | **105-405€** | **1260-4860€** | |

**Note** : Les données satellite sont toutes gratuites (open data). Le coût principal est l'infrastructure de traitement et d'hébergement.

---

## 10. Roadmap de développement

### Phase 1 — MVP (4-6 semaines)
**Objectif** : Dashboard 2D fonctionnel avec données satellite en temps réel

- [ ] Setup projet Next.js + PostGIS + déploiement Vercel
- [ ] Pipeline d'ingestion CMEMS (cron quotidien Python)
- [ ] Carte Mapbox avec couche sargasses (heatmap)
- [ ] Ingestion données CARICOOS (GeoJSON)
- [ ] Timeline historique (slider jour par jour)
- [ ] Landing page + auth basique (NextAuth)
- [ ] PWA mobile basique (consultation)

**Livrable** : App web consultable montrant les sargasses détectées J-0 à J-30

### Phase 2 — Prévisions + 3D (6-8 semaines)
**Objectif** : Moteur de dérive + intégration Topo3D

- [ ] Intégration courants CAR36 (CMEMS)
- [ ] Moteur de dérive lagrangien (OceanParcels)
- [ ] Prévisions J+4 affichées sur la carte
- [ ] Vue 3D côtière (portage Topo3D → composant React)
- [ ] Calque sargasses 3D (radeaux flottants animés)
- [ ] Transition fluide carte 2D → vue 3D
- [ ] Système d'alertes basique (email)

**Livrable** : App avec prévisions + vue 3D immersive du littoral

### Phase 3 — Crowdsourcing + KCI (4-6 semaines)
**Objectif** : Signalements citoyens + intégration écosystème KCI

- [ ] Module de signalement (photo + géoloc)
- [ ] Classification IA des photos (sargasses oui/non + gravité)
- [ ] Score Risque Sargasses par parcelle
- [ ] Intégration dans le skill `kci-rapport`
- [ ] Enrichissement du skill `topo-3d-parcelle`
- [ ] Dashboard collectivités (vue mairie)

**Livrable** : Plateforme complète multi-cibles

### Phase 4 — Scale & Monétisation (ongoing)
**Objectif** : Monétisation + partenariats

- [ ] Prévision saisonnière (NEMO-Sarg1.0)
- [ ] Abonnements collectivités (Stripe)
- [ ] API publique pour développeurs tiers
- [ ] Partenariat Météo-France / DEAL
- [ ] Candidature subventions (FEDER, ADEME, Chèque TIC)
- [ ] Expansion vers Saint-Martin, Saint-Barth, Guyane

---

## 11. Risques et mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| APIs CMEMS indisponibles | Pas de données fraîches | Faible | Multi-sources, cache 48h, fallback CARICOOS |
| Précision du modèle de dérive | Prévisions incorrectes | Moyen | Calibration continue, disclaimers, validation Météo-France |
| Faible adoption crowdsource | Peu de signalements | Moyen | Gamification, partenariat offices tourisme |
| Concurrence (howisthesargassum.com) | Part de marché | Faible | Différenciation 3D + KCI + local Antilles |
| Coûts serveur si forte charge | Dépassement budget | Faible | Architecture serverless, CDN, cache agressif |
| Changement APIs sources | Rupture pipeline | Moyen | Abstraction couche data, monitoring, alertes |

---

## 12. Avantages concurrentiels

Par rapport aux solutions existantes (CARICOOS, SeSaM, howisthesargassum.com) :

1. **Vue 3D immersive** : Aucun concurrent ne propose une visualisation 3D du littoral avec les sargasses. Le moteur Topo3D est un asset unique.

2. **Focus Antilles françaises** : Les plateformes existantes couvrent toute la Caraïbe sans granularité locale. SargaWatch est calibré sur la Guadeloupe et la Martinique.

3. **Intégration investissement immobilier** : Le score risque sargasses intégré aux rapports KCI est une innovation produit inédite.

4. **Crowdsourcing local** : Aucune plateforme de signalement citoyen n'existe pour les Antilles françaises.

5. **Multi-cibles** : La combinaison B2C (touristes) + B2B (investisseurs) + B2G (collectivités) crée un écosystème vertueux.

---

## 13. Références et sources de données

**Plateformes de monitoring :**
- SeSaM (CLS/IRD) : https://www.spaceclimateobservatory.org/sesam
- CARICOOS Sargassum Tracker : https://www.caricoos.org/sargassum
- USF SaWS : https://optics.marine.usf.edu/projects/saws.html
- Sargassum Information Hub : https://sargassumhub.org/monitoring/

**Prévisions :**
- Météo-France Guadeloupe : https://meteofrance.gp/fr/sargasses
- Météo-France Martinique : https://meteofrance.mq/fr/sargasses
- CMEMS Copernicus : https://marine.copernicus.eu/
- CAR36 regional model : https://gmd.copernicus.org/articles/17/3157/2024/

**Données ouvertes :**
- Copernicus Marine Data Store : https://data.marine.copernicus.eu/
- NASA OB.DAAC (MODIS) : https://oceancolor.gsfc.nasa.gov/
- IGN APIs (Topo3D) : https://apicarto.ign.fr/

**Publications scientifiques :**
- "Continuous Sargassum monitoring across the Caribbean Sea" (2024) — Remote Sensing of Environment
- "Towards enhanced Sargassum monitoring in the Caribbean Sea" (2025) — Scientific Reports / Nature
- "CAR36, a regional high-resolution ocean forecasting system" (2024) — Geoscientific Model Development

---

*Document généré le 20 mars 2026 — SargaWatch Antilles v1.0 Architecture*
*Écosystème KCI / Topo3D-Antilles*
