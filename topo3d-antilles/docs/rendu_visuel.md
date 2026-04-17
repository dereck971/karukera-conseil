# Rendu visuel premium — Carte 3D Petit-Bourg

**Auteur** : Karukera Conseil Immobilier (KCI)
**Cible** : Démo commerciale aux mairies (Cap Excellence, CANBT, Petit-Bourg, Sainte-Anne, etc.)
**Fichier modifié** : `topo3d-antilles/communes/97118-petit-bourg/index.html`
**Date** : avril 2026

---

## Objectif

Transformer la maquette technique en rendu **cinématique premium** capable de provoquer un "wow effect" devant un maire, et qui se distingue clairement des concurrents (URBIS, PIXYM) qui font du rendu statique ou purement technique.

## Améliorations apportées

### 1. Sky atmosphère

`addSky()` réécrit pour supporter trois niveaux :

- **MapLibre 4.5+** : tente `addLayer({ type: 'sky', paint: { 'sky-type': 'atmosphere' } })` natif.
- **MapLibre 4.1.x (utilisé actuellement)** : fallback sur `background` layer dont la couleur change avec l'heure du jour.
- Le fond ne se voit qu'à très haut zoom-out (zoom < 11) ou en pitch très rasant.

### 2. Bâtiments 3D — palette créole

Couleur d'extrusion remplacée :

```
0  -> #f5f0e8  (creme case basse)
6  -> #e8dcc4  (sable clair)
12 -> #c9b48a  (terre cuite claire)
20 -> #a08660  (ocre R+2)
35 -> #7d6447  (brun-ardoise R+5)
60 -> #4a3a2a  (grands collectifs)
```

Ajouts paint :
- `fill-extrusion-vertical-gradient: true` — assombrissement progressif sur la face descendante (effet de relief).
- `fill-extrusion-opacity: 0.92` (vs 0.82 avant — plus de présence).
- AO (`fill-extrusion-ambient-occlusion-*`) : activé seulement si MapLibre >= 4.5 (détection runtime via `maplibregl.version`). En 4.1.2, l'AO faisait silently échouer `addLayer` — désactivation auto.

### 3. Eau dynamique

Couche `water-areas` (OpenFreeMap) :
- Couleur turquoise caraïbes interpolée sur le zoom : `#4ba0b8` (vue large) -> `#7cc9dd` (zoom).
- `fill-outline-color: #2c7d96`.
- **Animation cyclique** de l'opacité (0.48 -> 0.62) via `requestAnimationFrame` -> effet "vague" subtil sans coût CPU notable.
- L'animation ne s'exécute que si la couche est `visible` (économie GPU).

### 4. Hillshade renforcé

Source `hs-src` (Terrarium AWS) inchangée. Paint :
- `hillshade-exaggeration: 0.7` (vs 0.5 — relief montagneux plus marqué pour la zone interieure de Petit-Bourg).
- `hillshade-shadow-color: '#1a2030'` (bleu nuit doux, plus naturel que noir pur).
- `hillshade-highlight-color: '#fff5e0'` (chaud type soleil tropical).
- `hillshade-accent-color: '#3d4a5e'` pour les pentes intermediaires.

L'exagération est dynamique : modifiée par les presets TOD.

### 5. Heure du jour — 4 presets

Ajout d'une sous-section "Heure du jour" dans le panel "Camera & atmosphere" avec 4 boutons (Aube, Midi, Golden, Crepuscule). Chaque preset applique :

| Preset    | Sun (deg) | Hillshade exag | Shadow color | Background sky |
| --------- | --------- | -------------- | ------------ | -------------- |
| Aube      | 80        | 0.85           | #3d2c1a      | #fce5d4        |
| Midi      | 180       | 0.55           | #000000      | #bcdef5        |
| Golden    | 290       | 0.75           | #3a1f0a      | #ffd9b0        |
| Crepuscule| 320       | 0.9            | #0a0420      | #3a2a6a        |

Le slider "Soleil" se synchronise. Si l'utilisateur bouge le slider manuellement, les boutons TOD perdent leur etat actif (affordance visuelle).

API : `window.applyTimeOfDay('aube'|'midi'|'golden'|'crepu', btnEl?)`.

### 6. Vues presentation cinematiques

Nouvelle section dans le panel avec 4 boutons + 1 bouton primaire :

- **Vue d'ensemble** : center=[-61.595, 16.196] zoom 12.5 pitch 55 bearing 25 + TOD midi
- **Centre-bourg** : zoom 16.2 pitch 65 bearing -20 + TOD golden
- **Facade littorale** : zoom 15 pitch 72 bearing -45 + TOD golden
- **Vernou (extension)** : zoom 14.5 pitch 60 bearing 90 + TOD midi
- **Survol cinematique 60s** (bouton dore) : enchaine les 4 presets en boucle (12s par etape) + retour overview en final (8s) + auto-rotation activee.

L'overlay `.cine-context` affiche le titre + sous-titre du preset pendant 2.4s a chaque etape (Playfair Display 22px, fond glassmorphism).

API : `window.applyCinematicView(key)`, `window.startCinematicTour()`, `window.stopCinematicTour()`.

### 7. Mode presentation premium

Bouton "Presentation" deja existant amelioré :
- Tente `requestFullscreen()` (silencieux si refus du browser).
- Cache la search bar.
- Lance automatiquement `startCinematicTour()` apres 800ms.
- Sortie via Echap : detection `fullscreenchange` -> sort du mode + arrete tour + restore search.

### 8. Watermark KCI

`<div class="kci-watermark">` fixe en bottom-right :
- Logo KCI (Playfair Display, 18px, couleur or #d4af37)
- Tagline "Karukera Conseil Immobilier - Urbanisme 3D"
- URL "karukera-conseil.com"
- Glassmorphism (backdrop-filter blur)
- En mode presentation, opacity 0.4 (presence discrete)
- Sur mobile, repositionne en top-left avec tagline cachee
- ID `kciWatermark` exposé pour toggle eventuel via classe `no-watermark` sur body

### 9. Loading screen premium

Remplace l'ancien loader basique :
- Logo SVG KCI anime (cercle + "KCI" + "GUADELOUPE" + "URBANISME 3D")
- Titre "Initialisation du jumeau numerique"
- Sous-titre "Petit-Bourg - Carte 3D urbanistique premium"
- Progress bar avec gradient or anime (shimmer 2s)
- 5 etapes : Relief / Bati 3D / Vegetation / PLU/DVF / Pret
- Animations stagger fadeIn (200ms decalage)

API : `updateLoadProgress(stepId, pct)` pendant l'init.

### 10. Micro-interactions

- Tous les boutons (`.flyto-btn`, `.top-btn`, `.filter-btn`) : `transition: all .2s ease`.
- Hover : `translateY(-1px)` + box-shadow doree subtile.
- Boutons TOD : couleur de bordure + dot colore selon le preset (visuel rapide).
- Boutons cinematiques : style premium (border or, hover lift).

## Limites connues

| Limite | Cause | Mitigation |
| ------ | ----- | ---------- |
| Pas de vrai sky atmosphere | MapLibre 4.1.2 ne supporte pas `type:'sky'` | Fallback background layer ; upgrade MapLibre -> 4.5+ pour activer. |
| Pas d'ambient occlusion | MapLibre 4.1.2 silently fail sur `fill-extrusion-ambient-occlusion-*` | Detection runtime `maplibregl.version` ; AO active auto si upgrade. |
| Animation eau coute ~1ms / frame | `setPaintProperty` provoque re-render | Active uniquement si layer visible. |
| Cadastre IGN 429 (rate limit) | API IGN gratuit limite | Hors scope visuel, problem reseau. |

## Recommandations demo commerciale

### Script pas-a-pas pour Dereck devant un maire (15 min)

1. **Ouverture (30s)** : page chargee, panneau ferme. Laisser le maire absorber le visuel.
2. **Activation panel (10s)** : clic chevron. Stats animees commencent a defiler. Pointer "Surface 131,92 km²" et "24 665 habitants".
3. **Vue d'ensemble (45s)** : clic "Vue d'ensemble" en TOD midi. Panoramique large. Mention "voici votre commune en 3D, sur cadastre IGN reel".
4. **Centre-bourg golden (1 min)** : clic "Centre-bourg" - le preset enclenche golden hour automatiquement. La carte plonge sur le centre, lumiere doree. Effet "wow" garanti.
5. **Couches metier (3 min)** :
   - Activer "Bati abandonnés" -> stats rouges en pulsation.
   - Activer "PLU Zonage" -> pointer les zones U/AU/A/N.
   - Slider "Score abandon ≥" -> reglage en temps reel.
6. **Fiscalite (3 min)** : ouvrir "Dashboard recettes par zone PLU" - chiffres concrets en € pour chaque zone. Insister sur "potentiel densification".
7. **Visite cinematique (1 min 15s pour le coupon)** : clic "Survol cinematique 60s". Auto-rotation + 5 vues + golden hour. Le maire regarde sa commune comme dans un docu Arte.
8. **Mode presentation (1 min)** : clic "Presentation" - fullscreen + tour automatique. Idéal pour adjoint qui rentre en cours de RDV.
9. **Q&R + closing**.

### Presets a privilegier selon le contexte

- **RDV en bureau, ecran 24"** : "Centre-bourg golden" en demo statique, puis "Survol cinematique 60s" en clore.
- **Présentation conseil municipal, vidéoprojecteur** : "Mode présentation" direct.
- **Visioconference Zoom** : éviter le tour automatique (lag), preferer les presets manuels que tu controles.
- **Adjoint technique tatillon** : "Vue 2D" + couches PLU + zones risque + LiDAR MNT pour montrer le serieux des données.

### Reutilisation pour autres communes

Pour cloner le rendu sur Sainte-Anne, Petit-Bourg, Goyave, etc :

1. Copier `index.html` dans `communes/<INSEE>-<nom>/`.
2. Modifier `PAP_CENTER`, `PAP_BBOX`, `VIEWS`, `CINEMATIC_PRESETS` (coordonnees specifiques a la commune).
3. Adapter `loadVacantParcels`, `loadPOIs` et le path de la couche vegetation.
4. Mettre a jour les stats hardcodees (population, surface, zone sismique).
5. Tester chaque preset sur le terrain (golden hour donne un meilleur rendu sur les communes côtières).

## Fichiers modifies

| Fichier | Lignes | Type |
| ------- | ------ | ---- |
| `topo3d-antilles/communes/97118-petit-bourg/index.html` | +295 / -25 | CSS + HTML + JS |
| `topo3d-antilles/docs/rendu_visuel.md` | +180 (nouveau) | Documentation |

## API JS exposees (nouvelles)

```
window.applyTimeOfDay(key, btnEl?)    // 'aube'|'midi'|'golden'|'crepu'
window.applyCinematicView(key)         // 'overview'|'centre'|'cote'|'vernou'
window.startCinematicTour()            // Lance survol 60s
window.stopCinematicTour()             // Arrete survol
```

Constantes globales :
```
TOD_PRESETS         // Mapping heure du jour -> {sun, sky, halo, bg, shadow, hsExag, sunIntensity}
CINEMATIC_PRESETS   // Mapping preset -> {label, sub, view, duration, tod}
BUILDING_COLOR_DEFAULT  // Palette creole sable -> ardoise
```

## Statut

**PREMIUM PRET** pour utilisation en demo commerciale.

Tests valides :
- 4 presets TOD : OK
- 4 presets cinematiques : OK
- Tour cinematique start/stop : OK
- Mode presentation toggle : OK
- Watermark visible : OK
- Loading premium : OK
- Eau turquoise + animation : OK
- Bati creole : OK
- Hillshade exagere 0.7 : OK
