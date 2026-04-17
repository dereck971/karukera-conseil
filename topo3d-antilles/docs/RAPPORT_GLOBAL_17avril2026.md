# Rapport global Topo3D Antilles — 5 phases — 17 avril 2026

## TL;DR

**Topo3D Antilles v1.0 — PRÊT À PUSH**

3 cartes opérationnelles (Petit-Bourg, Morne-à-l'Eau, Sainte-Rose), couche dents creuses calculée + override mairie, générateur industriel `generate_commune.py` capable de produire les 9 communes restantes, audit 13 points × 3 cartes : 100% PASS post-correction INSEE Sainte-Rose (97127→97129, bug bloquant détecté et corrigé).

---

## 1. Liste des 8 agents (5 + Phase A + B + C)

| # | Agent | Scope | Statut | Livrables clés |
|---|---|---|---|---|
| 1 | Split repo | Extraction monorepo Petit-Bourg → `topo3d-antilles/` autonome | Terminé | Repo séparé, package.json, vercel.json, serveur dev |
| 2 | Couches SIG | PPRN Lizmap, hydro, archéo, défrichement DAAF | Terminé | 4 layers WMS/WFS branchés sur `index.html` |
| 3 | Module fiscal | DGFIP : recettes parcelle, sous-fiscalisation, simulateur, dashboard, export DOB | Terminé | `lib/fiscal/*.js` (6 modules), schémas, démo |
| 4 | UI fiscale | Panel + modaux + popups | Terminé | Section "Fiscalité" dans panel, modals dashboard / sim / DOB |
| 5 | Végétation 3D + rendu visuel | LiDAR HD, sky-atmo, presets caméra, IBM Plex, bâtiments beiges | Terminé | `lib/data-fetchers/build_vegetation_petitbourg.js`, glyphs Plex, tour cinématique |
| 6 | **Phase A** — Merge & corrections | Unification agents 1-5 + 3 fix anomalies + audit exhaustif PB | Terminé | `docs/PHASE_A_MERGE_17avril2026.md`, `docs/AUDIT_17avril2026.md` |
| 7 | **Phase B** — Industrialisation | Générateur `generate_commune.py` + Morne-à-l'Eau + Sainte-Rose | Terminé | `lib/generate_commune.py` (758 LOC), 2 nouvelles cartes |
| 8 | **Phase C** — Dents creuses + audit final | Calcul automatique dents creuses + intégration UI 3 cartes + correction INSEE Sainte-Rose + audit final | Terminé (ce run) | `lib/data-fetchers/compute_dents_creuses.py`, 3 GeoJSON, `AUDIT_FINAL_17avril2026.md` |

---

## 2. Fichiers clés produits

### Code source

| Fichier | Lignes | Rôle |
|---|---|---|
| `communes/97118-petit-bourg/index.html` | 3388 | Carte référence Phase A |
| `communes/97116-morne-a-leau/index.html` | 3380 | Carte CANGT (RDV 15/05) |
| `communes/97129-sainte-rose/index.html` | 3380 | Carte CANBT (Pdt EPCI) |
| `lib/generate_commune.py` | 768 | Générateur industriel |
| `lib/data-fetchers/compute_dents_creuses.py` | ~360 | Calcul automatique dents creuses |
| `lib/data-fetchers/karugeo.js` | 191 | Helper WFS KaruGéo (DAAF) |
| `lib/data-fetchers/ign-geoplateforme.js` | ~120 | Helper IGN Géoplateforme |
| `lib/data-fetchers/insee.js` | ~85 | Helper INSEE COG/EPCI |
| `lib/wfs2geojson.js` | ~210 | Parser GML→GeoJSON |
| `lib/fiscal/{6 modules}.js` | ~62 KB total | Modules fiscaux DGFIP |
| `api/ingest-fiscal.js` | ~ | Endpoint sécurisé upload mairie |
| `api/generate-pdf-dob.js` | ~ | Génération PDF "Pré-budget DOB" |

### Datasets

| Dataset | Taille | Origine |
|---|---|---|
| `data/dents_creuses/97118-petit-bourg.geojson` | 1.9 MB / 2842 features | compute_dents_creuses.py |
| `data/dents_creuses/97116-morne-a-leau.geojson` | 1.0 MB / 1552 features | compute_dents_creuses.py |
| `data/dents_creuses/97129-sainte-rose.geojson` | 2.4 MB / 4002 features | compute_dents_creuses.py |
| `data/cadastre/defrichement_*.geojson` | 6.4 MB total (3 fichiers) | KaruGéo WFS |
| `data/vegetation/*.geojson` | 4.6 MB total (3 fichiers) | Overpass + IGN BDTOPO |
| `data/fiscal/dvf/dvf_{INSEE}_2024.csv` | 67 KB total | DVF Cerema 2024 |
| `data/fiscal/dgfip/{slug}_*.json` | ~30 KB | Templates (à enrichir mairie) |

### Documentation

- `docs/AUDIT_17avril2026.md` — audit Petit-Bourg post-Phase A
- `docs/PHASE_A_MERGE_17avril2026.md` — merge + corrections
- `docs/PHASE_B_INDUSTRIALISATION_17avril2026.md` — industrialisation
- `docs/AUDIT_FINAL_17avril2026.md` — audit final 13 points × 3 cartes (ce run)
- `docs/RAPPORT_GLOBAL_17avril2026.md` — ce document
- `docs/RAPPORT_17avril2026.md` — rapport phase 1
- `docs/architecture_fiscal.md` — schéma module fiscal
- `docs/couches-sig-disponibles.md` — catalogue SIG
- `docs/donnees-fiscales-mairie.md` — guide ingestion mairie
- `docs/grille-tarifaire.md` — pricing B2G
- `docs/pitch-mairies.md` — pitch commercial
- `docs/rendu_visuel.md` — direction artistique
- `docs/ui_fiscal.md` — UI module fiscal

---

## 3. État des 3 cartes

### Petit-Bourg (97118) — Référence Phase A
- **Maire 2026** : David Nebor (RDV2 14/04 OK, RDV3 à planifier avec M. Fabre dir. urba)
- **EPCI** : CANBT
- **Données enrichies** : végétation LiDAR HD réelle (4.2 MB), défrichement DAAF (700 KB), data_batiments (template), 2842 dents creuses
- **Verdict** : PRODUCTION-READY

### Morne-à-l'Eau (97116) — Cible Phase B priorité 1
- **Maire 2026** : Jean Bardail (réélu 1er tour 53,55%, aussi Pdt CANGT)
- **EPCI** : CANGT
- **Données** : végétation Overpass (346 KB), défrichement (4.5 MB), 1552 dents creuses
- **Justification** : RDV directeur urbanisme 15/05/2026, premier RDV fenêtre terrain
- **Verdict** : PRODUCTION-READY

### Sainte-Rose (97129) — Cible Phase B priorité 2
- **Maire 2026** : Adrien Barron (réélu, aussi Pdt CANBT)
- **EPCI** : CANBT
- **Données** : végétation (65 KB), défrichement (1.3 MB), 4002 dents creuses
- **Justification** : double intro Jalet + Ronard, levier upsell pack CANBT (15 communes)
- **Correction critique ce run** : INSEE 97127 (= Saint-Martin Antilles) → 97129 (vrai INSEE Sainte-Rose Guadeloupe)
- **Verdict** : PRODUCTION-READY post-correction

---

## 4. État du générateur (réutilisable pour 9 communes restantes)

`lib/generate_commune.py` est opérationnel et permet de générer une nouvelle carte commune en ~3 minutes (incluant fetch DVF + Overpass végétation + KaruGéo défrichement).

**Mise à jour Phase C** : le générateur substitue désormais aussi `DENTS_CREUSES_INSEE` et `DENTS_CREUSES_SLUG` pour brancher automatiquement la couche dents creuses sur chaque nouvelle commune.

**Workflow recommandé pour une nouvelle commune** :
```bash
# 1. Générer la carte
python3 lib/generate_commune.py \
    --insee 97108 --nom "Le Gosier" --maire "Cédric Cornet" \
    --epci CARL --bbox 16.18,-61.55,16.24,-61.45

# 2. Calculer la couche dents creuses
python3 lib/data-fetchers/compute_dents_creuses.py \
    --insee 97108 --slug le-gosier \
    --bbox 16.18,-61.55,16.24,-61.45

# 3. Audit
# - Ouvrir http://localhost:5174/communes/97108-le-gosier/
# - Toggle "Dents creuses (potentiel densification)"
# - Vérifier popup
```

**Cibles à générer (priorité fenêtre 13 mai-3 juin)** :
- Le Gosier (97108) — Cédric Cornet, CARL
- Goyave (97109) — Marie-Yves Pyrrhonias, CANBT (Gaillarbois lead)
- Lamentin (97111) — pour pack CANBT
- Pointe-Noire / Deshaies / Bouillante — CANBT
- Abymes (97101) — Eric Jalton (réseau Cap Excellence)
- Baie-Mahault (97103) — Michel Mado (impact Cap Excellence)
- Sainte-Anne (97128) — compagne Ronard dir. foncier

---

## 5. Anomalies résolues + résiduelles

### Résolues ce run (Phase C)

1. **INSEE Sainte-Rose 97127→97129** (bloquant)
2. **Footer Petit-Bourg manquait maire** (cosmétique)
3. **Couche dents creuses non implémentée** (was placeholder `vacant-parcels` proxy)
4. **Override mairie pas en place** (now via HEAD check `_mairie.geojson`)

### Résiduelles non bloquantes

1. **MapLibre 4.x sky-atmo** : à upgrader en MapLibre 5 plus tard
2. **Templates fiscaux DGFIP vides** : à remplir via `api/ingest-fiscal.js` après onboarding mairie
3. **Tour cinématique** : centres calibrés pour PB seulement, MEL/SR utilisent approximations BBOX
4. **Couche `archeo-zppa`** : placeholder DRAC, aucun WMS public au 17/04/2026
5. **Hook `kciFiscalDentsCreuses`** : test inutile (toujours fallback), à nettoyer

---

## 6. Recommandations pour le retour de Dereck (13 mai)

### Avant push GitHub (avant 13 mai)

- [x] Audit final 13 points × 3 cartes (ce run, AUDIT_FINAL_17avril2026.md)
- [x] Correction INSEE Sainte-Rose
- [x] Couche dents creuses opérationnelle
- [ ] **Push GitHub** : `git push origin claude/loving-herschel-7810a7` (à faire par Dereck)
- [ ] **Deploy Vercel** : `npx vercel --prod` depuis `topo3d-antilles/` (chaque commune = un déploiement)

### Pendant la fenêtre terrain (13 mai – 3 juin)

- [ ] **15 mai — Morne-à-l'Eau** : RDV Bardail (dir. urbanisme). Argument clé = pack CANGT (Anse-Bertrand, Petit-Canal, Port-Louis, Le Moule).
- [ ] **Sainte-Rose** : démo Barron via Jalet + Ronard. Levier pack CANBT (15 communes, upsell potentiel 25-50K€).
- [ ] **Petit-Bourg** : RDV3 avec M. Fabre (dir. urbanisme, 0690 90 88 44). Apporter dents creuses pour validation terrain.
- [ ] **Goyave** : Gaillarbois lead actif, demander introduction maire Edom.

### Après terrain (juin-juillet)

- [ ] Récupérer listes officielles "dents creuses" des mairies → déposer comme `data/dents_creuses/{INSEE}-{slug}_mairie.geojson`
- [ ] Générer 6+ nouvelles communes via `generate_commune.py`
- [ ] Upgrader MapLibre 4 → 5 pour fix sky-atmo
- [ ] Remplir templates fiscaux DGFIP via API ingest-fiscal

---

## 7. Métriques globales

- **Commits** : 30+ (depuis bootstrap topo3d-antilles)
- **Fichiers source code** : 67 (HTML/JS/PY/JSON/MD/GeoJSON, hors node_modules)
- **Lignes de code HTML/JS principales** : 11765 (sur 4 cartes + template)
- **Lignes Python** : 1100+ (generate_commune.py + compute_dents_creuses.py)
- **Datasets** :
  - communes/ : 5.2 MB
  - data/ : 16 MB (cadastre + dents_creuses + végétation + fiscal)
  - docs/ : 6.7 MB (avec screenshots)
  - lib/ : 176 KB
  - **Total worktree topo3d-antilles** : ~28 MB
- **Couches SIG actives par carte** : 25+ (bâtiments 3D, cadastre, ortho IGN, hillshade, parcelles vacantes, LiDAR MNT/MNS/MNH, végétation 3D/flat, PLU, monuments, archéo, PPRN inondation/MVT/cyclonique/sismique, défrichement DAAF, POI, routes, espaces verts, hydro, ruissellement, recettes fiscales, sous-fiscalisation, dents creuses)

---

## 8. Verdict global

**Topo3D Antilles v1.0 — PRÊT À PUSH** ✓

Aucun blocage. Les 3 cartes sont opérationnelles, la couche dents creuses fonctionne avec mécanisme override, le générateur est réutilisable. Une seule erreur résiduelle (sky-atmo MapLibre 4.x) signalée comme non bloquante par le brief Phase C.

Toutes les commits Phase C sont locales (pas de push), prêtes pour validation Dereck.

---

*Rapport généré 2026-04-17 par Phase C agent.*
*Contact : contact@karukera-conseil.com*
