# Architecture du module fiscal avancé — Jumeau numérique Petit-Bourg

**Auteur** : Karukera Conseil Immobilier (KCI) — Dereck Rauzduel
**Email officiel** : contact@karukera-conseil.com
**Cible** : Mme Aly, Directrice fiscale, Mairie de Petit-Bourg
**Date** : 2026-04-17
**Statut** : MVP local (pas de déploiement Vercel)

---

## Vue d'ensemble

Le module fiscal avancé enrichit le jumeau numérique de Petit-Bourg (`communes/97118-petit-bourg/index.html`) avec **5 features** orientées DGFIP open data :

| # | Feature | Fichier(s) | Source(s) |
|---|---------|-----------|-----------|
| 1 | Recettes par parcelle (popup) | `lib/fiscal/recettes_parcelle.js` + `popup_recettes.js` | DVF + DGCL + Cerema |
| 2 | Dashboard zones PLU | `lib/fiscal/dashboard_zone_plu.js` | PLU + DGCL |
| 3 | Sous-fiscalisation | `lib/fiscal/sous_fiscalisation.js` | DVF + VL cadastrales |
| 4 | Simulateur requalification | `lib/fiscal/simulateur_requalification.js` | CGI + bareme DOM |
| 5 | Export PDF DOB par quartier | `lib/fiscal/export_dob.js` + `api/generate-pdf-dob.js` | Toutes |

Toutes les données pré-calculées sont dans `data/fiscal/dgfip/` et chaque champ cite explicitement sa **source open data**.

---

## Données pré-calculées

### `data/fiscal/dgfip/petitbourg_recettes.json`

Contient :
- `_meta.sources` : 5 sources DGFIP open data (DVF, DGCL, taux DGFIP, Cerema, SIRENE)
- `commune_recettes_2023` : recettes globales 2023 (TFB ~6,8 M€, TFNB ~145 k€) — **ESTIMATION** à recouper avec compte administratif officiel
- `taux_communaux_2023` : taux 2023 (TFB 22,4%, TFNB 49,5%, CFE 26,8%) — **ESTIMATION** strate DOM
- `sections_cadastrales` : 17 sections (AB, AC, AD, AE, AH, AI, AK, AM, AN, AO, AP, AR, AS, AT, BC, BD, BE) avec pour chacune : nb parcelles, VL moyenne, TFB/TFNB estimées, prix DVF médian/m²

### `data/fiscal/dgfip/petitbourg_zones_plu_aggregat.json`

Agrège par zone PLU (U / AU / A / N) :
- nb parcelles, baties / non baties
- TFB / TFNB / CFE estimées
- nb établissements assujettis CFE
- potentiel de densification estimé

---

## Modules JavaScript (browser + node)

Chaque module expose une API soit via `window.kci<X>` (browser) soit via `module.exports` (Node).

### Feature 1 — `recettes_parcelle.js`

```js
const recettes = await window.kciFiscalRecettes.getRecettesParcelle(
  { reference: 'AB 123', surface_m2: 450, batie: true },
  null
);
// => { tfb, tfnb, cfe, total_estime_eur, sources, disclaimer_global }
```

Le module `popup_recettes.js` câble automatiquement le rendu MapLibre :

```js
window.kciFiscalPopup.attach(map, { layerId: 'parcelles-cadastre' });
```

### Feature 2 — `dashboard_zone_plu.js`

Monte un panel bottom-right :

```js
await window.kciFiscalDashboard.mount({ autoOpen: true });
```

### Feature 3 — `sous_fiscalisation.js`

```js
const aggregat = window.kciFiscalSousFisc.aggregateCommune(recettesData);
// => { par_section: [...], totaux: { recettes_manquees_estimees_eur_par_an } }

// Utilisation dans MapLibre :
const paint = window.kciFiscalSousFisc.buildMapLibrePaintExpr(aggregat);
map.setPaintProperty('parcelles-cadastre-fill', 'fill-color', paint['fill-color']);
```

### Feature 4 — `simulateur_requalification.js`

```js
const sims = window.kciFiscalSimRequalif.simulateAll(
  { reference: 'AB 123', surface_m2: 600, batie: false },
  recettesData,
  recettesData.sections_cadastrales['AB']
);
// => 3 scenarios : maison 100m2, R+2 4 logts, commerce 200m2

const html = window.kciFiscalSimRequalif.buildPopupHTML(parcelle, sims);
```

### Feature 5 — `export_dob.js` + `api/generate-pdf-dob.js`

Côté **client** :

```js
const pdfBytes = await window.kciFiscalExportDOB.generatePDF(
  'AB',
  { recettes, zonesPLU, sousFisc },
  { logoPngBytes }
);
```

Côté **serveur** (Vercel serverless) :

```bash
curl -X POST https://www.karukera-conseil.com/api/generate-pdf-dob \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"section":"AB"}' \
  --output KCI_DOB_PetitBourg_AB.pdf
```

---

## Intégration dans le HTML Petit-Bourg

Ajouter dans `<head>` (avant `</head>`) :

```html
<!-- Modules fiscaux KCI - DGFIP open data -->
<script src="../../lib/fiscal/recettes_parcelle.js"></script>
<script src="../../lib/fiscal/popup_recettes.js"></script>
<script src="../../lib/fiscal/dashboard_zone_plu.js"></script>
<script src="../../lib/fiscal/sous_fiscalisation.js"></script>
<script src="../../lib/fiscal/simulateur_requalification.js"></script>
<!-- pdf-lib (browser) si export PDF cote client -->
<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
<script src="../../lib/fiscal/export_dob.js"></script>
```

Puis dans le bloc d'init de la map (après `map.on('style.load', ...)`):

```js
// Feature 1 : popup recettes parcelle
window.kciFiscalPopup.attach(map, { layerId: 'cadastre-parcelles-fill' });

// Feature 2 : dashboard zones PLU
await window.kciFiscalDashboard.mount({ autoOpen: false });

// Feature 3 : layer sous-fiscalisation (toggle UI)
const recData = await window.kciFiscalRecettes.loadRecettesData();
const sfAgg = window.kciFiscalSousFisc.aggregateCommune(recData);
const paint = window.kciFiscalSousFisc.buildMapLibrePaintExpr(sfAgg);
// Appliquer au layer cadastre quand l'utilisateur active le toggle :
map.setPaintProperty('cadastre-parcelles-fill', 'fill-color', paint['fill-color']);

// Feature 4 : popup simulateur sur dent creuse (zone U)
map.on('click', 'parcelles-non-baties-zoneU', async (e) => {
  const f = e.features[0];
  const parcelle = { reference: f.properties.idu, surface_m2: f.properties.contenance, batie: false };
  const section = window.kciFiscalRecettes.extractSection(parcelle.reference);
  const sims = window.kciFiscalSimRequalif.simulateAll(parcelle, recData, recData.sections_cadastrales[section]);
  new maplibregl.Popup({ offset: 10, maxWidth: '380px' })
    .setLngLat(e.lngLat)
    .setHTML(window.kciFiscalSimRequalif.buildPopupHTML(parcelle, sims))
    .addTo(map);
});

// Feature 5 : bouton export DOB dans la top-bar
document.querySelector('.top-bar').insertAdjacentHTML('beforeend',
  '<button class="top-btn" onclick="downloadDOB()">Export DOB PDF</button>');
window.downloadDOB = async () => {
  const sec = prompt('Quartier (section cadastrale, ex: AB) :', 'AB');
  if (!sec) return;
  const recettes = await window.kciFiscalRecettes.loadRecettesData();
  const zonesPLU = await fetch('../../data/fiscal/dgfip/petitbourg_zones_plu_aggregat.json').then(r => r.json());
  const sousFisc = window.kciFiscalSousFisc.aggregateCommune(recettes);
  const bytes = await window.kciFiscalExportDOB.generatePDF(sec, { recettes, zonesPLU, sousFisc });
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `KCI_DOB_PetitBourg_${sec}.pdf`; a.click();
  URL.revokeObjectURL(url);
};
```

---

## Sécurité

- L'endpoint `api/generate-pdf-dob.js` exige le header `Authorization: Bearer $ADMIN_SECRET`.
- Rate limit : **5 PDF / minute / IP** (anti-DoS).
- CORS restreint à `karukera-conseil.com` par défaut.
- Aucune donnée nominative DGFIP n'est exposée — uniquement des **agrégats par section**.

---

## Limites & points d'attention

1. **Recettes réelles 2023** : valeurs ESTIMÉES à partir de la strate DOM. À recouper avec le compte administratif officiel de la mairie.
2. **VL cadastrales** : les VL exactes par parcelle ne sont **pas open data** (respect vie privée). Estimation à partir de la moyenne par section publiée par Cerema.
3. **Mapping section -> zone PLU** : approximation (certaines sections croisent plusieurs zones). À affiner avec une couche SIG croisée par l'autre agent.
4. **CFE** : estimation basée sur la VL — la base réelle dépend du CA et du régime. À confirmer via SIRENE.
5. **Taxe d'aménagement** : estimation 5% du coût construction (réel 4-7% selon zonage). Source : code de l'urbanisme.

Tous les disclaimers sont visibles **dans les popups + dans le PDF DOB** pour transparence Mme Aly.

---

## Sources DGFIP open data utilisées

| Source | URL | Licence |
|--------|-----|---------|
| DVF Petit-Bourg | https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/97/97118.csv | Etalab 2.0 |
| Comptes individuels DGCL | https://www.data.gouv.fr/fr/datasets/comptes-individuels-des-communes-fichier-global-a-compter-de-2000/ | Etalab 2.0 |
| Taux taxes locales DGFIP | https://www.data.gouv.fr/fr/datasets/impots-locaux/ | Etalab 2.0 |
| Fichiers fonciers Cerema (stats) | https://datafoncier.cerema.fr/ | Convention |
| Base SIRENE INSEE | https://api.insee.fr/entreprises/sirene/ | Etalab 2.0 |
| GPU PLU Petit-Bourg | https://www.geoportail-urbanisme.gouv.fr/document/document/97118_PLU_20220318/ | Etalab 2.0 |

---

## Coordination avec l'autre agent

Cet agent (KCI fiscal avancé) ne touche PAS :
- `topo3d-antilles/api/ingest-fiscal.js` (autre agent)
- `topo3d-antilles/data/fiscal/schema.json` (autre agent)
- `topo3d-antilles/data/fiscal/demo_petitbourg.json` (autre agent)
- `topo3d-antilles/docs/donnees-fiscales-mairie.md` (autre agent)
- Le HTML Petit-Bourg (modifications faites par l'autre agent ou par Dereck — voir snippet d'intégration ci-dessus)

Cet agent crée :
- `topo3d-antilles/lib/fiscal/recettes_parcelle.js`
- `topo3d-antilles/lib/fiscal/popup_recettes.js`
- `topo3d-antilles/lib/fiscal/dashboard_zone_plu.js`
- `topo3d-antilles/lib/fiscal/sous_fiscalisation.js`
- `topo3d-antilles/lib/fiscal/simulateur_requalification.js`
- `topo3d-antilles/lib/fiscal/export_dob.js`
- `topo3d-antilles/api/generate-pdf-dob.js`
- `topo3d-antilles/data/fiscal/dgfip/petitbourg_recettes.json`
- `topo3d-antilles/data/fiscal/dgfip/petitbourg_zones_plu_aggregat.json`
- `topo3d-antilles/docs/architecture_fiscal.md` (ce document)
