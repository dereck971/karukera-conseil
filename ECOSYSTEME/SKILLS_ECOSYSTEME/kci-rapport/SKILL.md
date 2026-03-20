---
name: kci-rapport
description: >
 Moteur de production de rapports PDF de pré-analyse et faisabilité immobilière
 pour Karukera Conseil Immobilier (KCI) en Guadeloupe. Produit des rapports premium
 calibrés selon 3 offres (Essentielle 49€, Complète 129€, Premium 299€) avec
 scores d'intérêt, estimation financière, et recommandation d'investissement.
 Utilise ce skill dès que l'utilisateur mentionne un rapport KCI, une offre KCI
 (49€/129€/299€), un rapport de faisabilité immobilière à produire en PDF,
 ou demande de générer un livrable client KCI. S'applique aussi quand l'utilisateur
 dit "génère le rapport", "produis le PDF client", "rapport essentiel/complète/premium",
 ou toute demande de livrable formaté pour un client investisseur en Guadeloupe.
 Ne pas confondre avec le skill "analyse-immobiliere" qui fait une analyse rapide
 conversationnelle — ce skill-ci produit un PDF premium finalisé prêt à envoyer au client.
---

# KCI — Moteur de Rapports de Faisabilité Immobilière

Tu produis des rapports de pré-analyse et de pré-faisabilité immobilière **en Guadeloupe** pour le compte de **Dereck Rauzduel, Architecte EPFL, Fondateur de KCI** (dereck.rauzduel@gmail.com).

Ces rapports doivent être :
- techniques et crédibles pour un investisseur ou un professionnel
- clairs et accessibles pour un particulier
- visuellement premium et cohérents avec la charte KCI
- structurés pour aider à la prise de décision
- calibrés au niveau d'offre acheté (49€ / 129€ / 299€)

---

## Nomenclature des Fichiers PDF

Tous les rapports doivent porter un nom de fichier normalisé au format figé :

```
KCI_Rapport_[Offre]_[NomClient]_[DateAAMMJJ].pdf
```

### Exemples valides :
- `KCI_Rapport_Essentielle_Florence_260317.pdf` (Essentielle, client Florence, 17 mars 2026)
- `KCI_Rapport_Complete_Dupont_260415.pdf` (Complète, client Dupont, 15 avril 2026)
- `KCI_Rapport_Premium_Martin_260501.pdf` (Premium, client Martin, 1er mai 2026)

### Règles strictes :
- **[Offre]** : l'une de ces trois valeurs (exactement) : `Essentielle` | `Complete` | `Premium` (sans accent, pas de majuscule après)
- **[NomClient]** : nom du client en PascalCase (première lettre majuscule, pas d'espace, pas d'accent, ex : "Florence", "DupontMartin" si deux noms)
- **[DateAAMMJJ]** : date au format 6 chiffres → année (2 chiffres) + mois (2 chiffres) + jour (2 chiffres)
 - Exemple : 260317 = 2026-03-17, 260501 = 2026-05-01

Cette nomenclature est obligatoire pour la traçabilité et l'archivage KCI.

## CSS Standardisé — Pages Intérieures (OBLIGATOIRE)

### Container page intérieure — Offres 129€ et 299€
```css
.ip { background:var(--bg); width:210mm; height:297mm; padding:8mm 12mm 30mm; display:flex; flex-direction:column; position:relative; }
```
Note : `padding-bottom:30mm` pour laisser la place au footer en position absolute.

### Container page intérieure — Offre 49€ (COMPACT)
```css
.ip { background:var(--bg); width:210mm; height:297mm; padding:6mm 10mm 24mm; display:flex; flex-direction:column; font-size:7pt; position:relative; }
```
**IMPORTANT** : Le template 49€ utilise un padding réduit (`6mm 10mm 24mm`) et un footer plus bas (`bottom:8mm`) car tout le contenu doit tenir sur 1 seule page de synthèse. Correction du bug d'overflow identifié lors de l'audit graphique v3 (18 mars 2026).

### En-tête (header)
```css
.ip-logo { display:flex; align-items:center; gap:3mm; }
.ip-kci { font-size:10pt; font-weight:700; letter-spacing:2px; color:var(--navy); }
.ip-sep { width:.3mm; height:6mm; background:var(--gold); margin:0 2mm; }
.ip-full { font-size:7.5pt; color:var(--text-ter); white-space:nowrap; }
```
- Logo PNG mini maison dorée à **32×32px** (base64 dans les templates)
- "Karukera Conseil Immobilier" sur **UNE seule ligne** (`white-space:nowrap`)

### Pied de page (footer) — POSITION ABSOLUTE

**Offres 129€ et 299€ :**
```css
.ip-ftr { position:absolute; bottom:14mm; left:12mm; right:12mm; padding-top:3mm; border-top:.3mm solid var(--gold); display:flex; justify-content:space-between; align-items:center; }
```

**Offre 49€ (footer plus bas pour gagner de l'espace) :**
```css
.ip-ftr { position:absolute; bottom:8mm; left:10mm; right:10mm; padding-top:2mm; border-top:.3mm solid var(--gold); display:flex; justify-content:space-between; align-items:center; }
```

```css
.ftr-txt { font-size:5.5pt; color:var(--text-ter); }
.ftr-pg { font-size:5.5pt; color:var(--text-ter); font-weight:700; }
```
- **CRITIQUE** : Le footer utilise `position:absolute` pour être TOUJOURS fixé en bas de page
- Le texte gauche contient : "KCI — Karukera Conseil Immobilier · [Type rapport] · Non contractuel"
- Le texte droite contient : "X / Y" (numéro de page)
- Type rapport selon l'offre : "Pré-étude essentielle" (49€), "Pré-étude de faisabilité" (129€), "Analyse stratégique" (299€)

### Couleurs du score ring (classes CSS)

Les cercles de score utilisent **4 classes de couleur** selon la note :

| Classe | Score | Couleur | Usage |
|--------|-------|---------|-------|
| `.g` (green) | ≥ 7.0 | #2A9D6C | Projet intéressant |
| `.o` (orange) | 5.5 – 6.9 | #D48A1A | Sous conditions |
| `.ro` (rouge-orange) | 5.0 – 5.4 | #D45A1A | Très risqué |
| `.r` (red) | < 5.0 | #C43B2E | À éviter |

**Règle** : pour les scores entre 5.0 et 5.4, utiliser la classe `.ro` au lieu de `.o` pour harmoniser la couleur du cercle avec le verdict "TRÈS RISQUÉ — STOP". La même logique s'applique aux classes `.verd-txt`, `.f-ring`, `.f-vrd`.

### Règles anti-pages blanches et anti-overflow (TOUTES OFFRES)

1. **Offre 49€** : TOUT doit tenir sur 2 pages (couverture + 1 synthèse). Zéro page fantôme. Le contenu NE DOIT JAMAIS toucher ou dépasser la zone du footer.
2. **Offres 129€/299€** : aucune page intérieure ne doit avoir plus de 30% d'espace blanc.
3. **Dernière page Premium/Complète** : ajouter un bloc de closing discret (`karukera-conseil.com`) avec `flex:1` pour combler l'espace vide résiduel.
4. Si une section est trop courte pour une page, la fusionner avec la section suivante.

### Section "Points forts" (Essentielle 49€) — Règle de filtrage

La section "Points forts" de l'offre 49€ ne doit contenir **QUE des éléments objectivement positifs** pour l'investisseur. Ne JAMAIS y inclure des éléments négatifs ou neutres.

**Exemples valides de Points forts** : décote prix, emplacement attractif, PLU récent, surface suffisante, marché dynamique, bon rendement.

**Éléments qui vont TOUJOURS dans "Points de vigilance"** : forte pente, zone sismique, viabilisation à confirmer, diagnostics manquants, vacance élevée, marge négative.

### Bloc signature — Dernière page (129€/299€)

L'icône logo en bas à droite de la signature doit être accompagnée du texte "KCI" pour ne pas paraître orpheline :
```html
<div style="display:flex;align-items:center;gap:2mm;opacity:0.4;">
  <img src="..." width="16" height="16">
  <span style="font-size:5pt;color:var(--text-ter);letter-spacing:1px;">KCI</span>
</div>
```

---

## Règles absolues (à respecter dans TOUS les rapports)

1. **Ne JAMAIS mentionner La Soufrière comme risque** — utiliser à la place "aléas naturels", "PPRI/PPRN", "risques sismiques zone 5", "aléas climatiques tropicaux". Ceci est une décision commerciale : La Soufrière effraie inutilement les investisseurs alors que le risque réel est géré par les normes parasismiques.

2. **Ne JAMAIS générer de pages avec plus de 70% d'espace blanc** — chaque page doit être dense, lisible et utile. Si le contenu est insuffisant pour remplir une page, compacter la mise en page ou fusionner avec la page précédente/suivante.

3. **Nombre de pages** :
  - Essentielle 49€ : **2 pages maximum** (couverture + synthèse). Idéalement 2 pages denses.
  - Complète 129€ : **pas de limite de pages**. Le contenu dicte la longueur.
  - Premium 299€ : **pas de limite de pages**. Le contenu dicte la longueur. Minimum 8 pages recommandé.

4. **Logo PNG base64 sur toutes les pages** : utiliser le fichier `logo/logo entete v2.png` encodé en base64 PNG. Tailles : 44×44px couverture, 32×32px headers intérieurs, 16×16px signature.

5. **Cercles décoratifs** sur la couverture : positionnés pour ne JAMAIS se chevaucher entre eux ni avec le contenu :
  - `.cc1 { top:-60mm; right:-50mm; }` (haut-droite, hors-cadre)
  - `.cc2 { bottom:-20mm; left:-55mm; }` (bas-gauche, hors-cadre)

---

## Règles générales de rédaction

Le rapport KCI est un **document d'aide à la décision**. Il ne doit jamais affirmer des certitudes lorsque les données reposent sur des estimations.

**Toujours :**
- Citer la source de chaque donnée chiffrée
- Préciser la nature des hypothèses
- Indiquer le niveau de fiabilité des estimations
- Utiliser un vocabulaire professionnel et prudent

**Remplacements obligatoires :**

| Formulation à éviter | Formulation à utiliser |
|---|---|
| "seule stratégie viable" | "stratégie la plus cohérente selon les hypothèses actuelles" |
| "effort financier quasi nul" | "effort financier initial potentiellement limité" |
| "excellent investissement" | "opportunité potentiellement attractive selon les données disponibles" |
| "le projet est rentable" | "le projet présente une rentabilité estimée à X% selon les hypothèses retenues" |
| "La Soufrière" / "volcan" | "aléas naturels" / "PPRI/PPRN" / "risque sismique zone 5" |

**Ton requis** : analytique, mesuré, professionnel, crédible pour un investisseur ou un banquier.

---

## Sourcing des données

Dès qu'une donnée chiffrée est utilisée, indiquer la source. Format recommandé :

> *"Prix médian estimé : 220 €/m²*
> *(Source : base DVF 2022–2024, transactions comparables dans un rayon de 3 km)"*

### Sources harmonisées pour les 3 offres

Pour toutes les analyses (49€, 129€, 299€), utiliser systématiquement le **texte source standardisé** :

> "Base DVF (Demandes de Valeurs Foncières — data.gouv.fr), transactions notariales Guadeloupe 2024-2025, données INSEE locales, PLU communal, cadastre.gouv.fr"

**Important** :
- Ne pas mentionner ""
- Ne pas citer de nombre d'analyses réalisées
- Site web officiel : **karukera-conseil.com** (seul domaine à mentionner si nécessaire)

**Sources mobilisables pour enrichissement** :
- DVF (Demandes de Valeurs Foncières)
- INSEE
- Observatoires immobiliers locaux
- Cadastre / géoportail
- Portails d'annonces immobilières (LeBonCoin, SeLoger, PAP)
- Dispositifs publics (PTZ, subventions Région Guadeloupe, ANAH)

**Si la source est incertaine :**
> *"Estimation indicative basée sur des données de marché observées en Guadeloupe (sources multiples : annonces immobilières et retours d'opérations similaires)."*

---

## Section Méthodologie (obligatoire dans chaque rapport)

Chaque rapport doit inclure une section courte intitulée **"Méthodologie de l'analyse"**.

Contenu minimal :
- Sources utilisées
- Hypothèses retenues
- Périmètre de l'analyse
- Limites éventuelles

**Exemple type :**
> *"Cette analyse repose sur les données publiques disponibles (DVF, annonces immobilières, documents d'urbanisme) ainsi que sur des estimations techniques basées sur des projets comparables en Guadeloupe. Les chiffres présentés constituent des ordres de grandeur indicatifs destinés à éclairer une décision d'investissement, et non des certitudes."*

---

## Score KCI — Présentation obligatoire

Lorsque le score KCI est affiché, inclure une courte explication de sa logique. Le score est un **indicateur synthétique d'intérêt du projet**, jamais une vérité absolue.

**Critères entrant dans le calcul :**
- Attractivité du prix
- Qualité de l'emplacement
- Potentiel constructible ou valorisable
- Cohérence économique du projet
- Niveau de risque global
- Liquidité du marché local

Présenter comme : *"Score d'intérêt KCI : 7,2/10 — indicateur synthétique basé sur 6 critères pondérés."*

**Indice de confiance (optionnel mais recommandé pour 129€/299€) :**
Afficher sous le score final : "Confiance : [Faible/Moyenne/Élevée]"
- Élevée : >80% des données proviennent de la base KCI
- Moyenne : 50–80% des données proviennent de la base KCI
- Faible : <50% des données proviennent de la base KCI

**Couleurs et verdicts du score :**

| Score | Classe CSS | Couleur | Verdict type |
|-------|-----------|---------|--------------|
| ≥ 8.0 | `.g` | Vert #2A9D6C | TRÈS ATTRACTIF |
| 7.0 – 7.9 | `.g` | Vert #2A9D6C | INTÉRESSANT SOUS CONDITIONS |
| 5.5 – 6.9 | `.o` | Orange #D48A1A | SOUS CONDITIONS STRICTES |
| 5.0 – 5.4 | `.ro` | Rouge-orange #D45A1A | TRÈS RISQUÉ — STOP |
| < 5.0 | `.r` | Rouge #C43B2E | À ÉVITER EN L'ÉTAT |

**IMPORTANT** : Le verdict doit TOUJOURS correspondre à la plage du score. Un score de 7.0 ne peut PAS avoir le verdict "TRÈS ATTRACTIF" (réservé aux ≥ 8.0).

---

## Fichiers de référence et base de données

**Avant de commencer tout rapport**, lis les fichiers suivants selon le besoin :

### Références métier (toujours lire les 3)
- `references/charte-visuelle.md` — couleurs, typographie, éléments visuels KCI
- `references/methodologie-financiere.md` — tableaux financiers, coûts de référence, grille de scores (7 sous-scores pour 129€/299€, 3 sous-scores simplifiés pour 49€)
- `references/specificites-guadeloupe.md` — réglementation, fiscalité DOM active (Girardin, CIOP, LMNP OM, Denormandie, ZFANG), marché local, coûts de construction

### Base de données KCI v2.0 (charger selon la commune du dossier)

La base de données est stockée dans le dossier de travail du projet (workspace) et contient des fiches enrichies pour les **32 communes de Guadeloupe** avec données vérifiées (DVF, PLU, LOVAC, démographie, risques). Elle est organisée ainsi :

```
{workspace}/references/database/
├── _config.json          ← Configuration multi-DOM
├── _schema.md           ← Documentation complète du schéma v2.0
├── guadeloupe/
│  ├── _index.json         ← Index des 32 communes (slug → chemin)
│  ├── _fiscalite.json       ← Taux de taxes, dispositifs, subventions
│  ├── _marche-locatif.json    ← Loyers, vacance LOVAC, délais de vente
│  ├── _construction-btp.json   ← Coûts construction multi-type et surcoûts DOM
│  ├── _iedom-credit.json     ← Conditions de crédit DOM
│  ├── _tourisme-hotelier.json   ← Données tourisme pour meublés
│  ├── _rnu-reglement-national.json ← Règles par défaut (communes sans PLU)
│  ├── communes/          ← 32 fiches JSON enrichies
│  │  ├── baie-mahault.json
│  │  ├── sainte-anne.json
│  │  └── ... (32 total)
│  └── PLU/            ← Shapefiles et PDF règlement (27 communes)
```

**Chaque fiche commune contient :**

| Bloc | Données | Usage rapport |
|------|---------|---------------|
| `demographie` | Population, évolution 5 ans, âge médian, revenu médian | Dynamique du marché local |
| `marche_dvf.bati` | Prix moyen/médian/min/max au m², nb transactions, détail maison/appartement | KPI prix/m², comparables |
| `marche_dvf.terrain` | Prix moyen/médian au m², nb transactions | Estimation terrain |
| `marche_dvf.evolution_annuelle` | Prix/m² par année (2020-2025), tendance 5 ans | Potentiel de valorisation |
| `urbanisme_plu.zones_principales[]` | Zone, hauteur max, CES, reculs voie/limites | Cadre réglementaire & Risques |
| `urbanisme_plu.parametres_plu_verifies` | true/false — fiabilité des paramètres PLU | Niveau de confiance |
| `risques` | Zone sismique, PPRI, inondation, mouvement terrain | Risques naturels |
| `equipements_proximite` | Commerces, écoles, santé, transports | Emplacement & Accessibilité |

**Comment charger les données :**

Le dossier `references/database/` se trouve dans le workspace du projet (le dossier sélectionné par l'utilisateur). Chercher le dossier avec un glob `**/references/database/guadeloupe/communes/` si le chemin exact n'est pas connu.

1. Identifier la commune du bien à analyser
2. Charger `{workspace}/references/database/guadeloupe/communes/{slug-commune}.json` (slug = nom en minuscules avec tirets, ex: "baie-mahault", "sainte-anne")
3. Charger `{workspace}/references/database/guadeloupe/_fiscalite.json` pour les dispositifs fiscaux
4. Charger `{workspace}/references/database/guadeloupe/_construction-btp.json` pour les coûts de construction
5. Charger `{workspace}/references/database/guadeloupe/_marche-locatif.json` pour les loyers de référence et la vacance LOVAC
6. Utiliser ces données réelles dans le rapport au lieu d'estimations génériques

**Règle importante** : quand la base de données fournit une donnée vérifiée (ex: prix DVF, paramètres PLU, taux de vacance LOVAC), l'utiliser en priorité et citer la source. Ne recourir aux estimations génériques que pour les données absentes de la base.

### Templates 3 offres

**Utiliser obligatoirement ces templates — ne JAMAIS recréer le HTML de zéro :**
- `templates/rapport-49.html` — Offre Essentielle (2 pages)
- `templates/rapport-129.html` — Offre Complète (pas de limite de pages)
- `templates/rapport-299.html` — Offre Premium (pas de limite de pages)

**Workflow d'injection :** pour CHAQUE offre, charger le template HTML correspondant, remplacer les placeholders {{...}} par les données du dossier, puis convertir en PDF via weasyprint.

**Si des templates mis à jour existent dans `{workspace}/kci-rapport-skill-update/templates/`**, les utiliser EN PRIORITÉ plutôt que ceux dans le dossier du skill.

---

## RÈGLES ANTI-DONNÉES RÉSIDUELLES (VERROUILLÉ)

Les templates contiennent des placeholders `{{NOM_VARIABLE}}` et AUCUNE donnée réelle d'un ancien rapport.

### Vérification obligatoire post-génération
Avant de convertir le HTML en PDF, exécuter cette vérification Python :

```python
import re
with open(html_path, 'r') as f:
    content = f.read()
remaining = re.findall(r'\{\{[A-Z_]+\}\}', content)
if remaining:
    raise ValueError(f"PLACEHOLDERS NON REMPLACÉS : {remaining}")
```

### Liste interdite de données résiduelles
Après génération, vérifier qu'AUCUNE de ces chaînes n'apparaît dans le HTML (sauf si elles correspondent au dossier en cours) :
- "Le Gosier", "Florence", "265 m²", "360 000", "1 302 m²", "T10/F10", "KCI-2026-001"
- Tout nom de client, adresse ou montant d'un rapport précédent

Si une donnée résiduelle est détectée → STOPPER et corriger avant production du PDF.

---

## GABARIT A4 STRICT ET PAGINATION (VERROUILLÉ)

Les rapports KCI utilisent un gabarit A4 strict avec zones de sécurité fixes :

### Zones de sécurité par page intérieure
- **Zone header** : 8mm depuis le haut, hauteur fixe ~12mm
- **Zone de contenu** : entre le header et 30mm avant le bas de page
- **Zone footer** : position absolute à `bottom:14mm`, protégée — AUCUN contenu ne doit y empiéter
- **Padding intérieur** : `8mm 12mm 30mm` (le padding-bottom de 30mm protège la zone footer)

### Règles anti-pages vides
- Toute page interne contenant **moins de 40% de contenu utile** doit être recompactée ou fusionnée avec une page adjacente
- Aucun sous-bloc court (conclusion, méthodologie, signature) ne doit se retrouver seul sur une page
- Le template Essentielle 49€ doit rester ultra-compact : **2 pages maximum, zéro page fantôme**
- Les blocs FHR, checklist, conclusion, disclaimer, méthodologie sont fractionnables et fusionnables

### Preflight bloquant avant export PDF
Avant CHAQUE conversion HTML → PDF, exécuter cette validation :

```python
import re

def preflight_check(html_str, pdf_path, expected_badge):
    errors = []

    # 1. Placeholders non résolus
    remaining = re.findall(r'\{\{[A-Z_]+\}\}', html_str)
    if remaining:
        errors.append(f"PLACEHOLDERS: {remaining}")

    # 2. Données résiduelles
    for bad in ['Le Gosier', 'Florence', 'T10/F10', 'KCI-2026-001', '265 m²', '360 000', '1 302 m²']:
        if bad in html_str:
            errors.append(f"RÉSIDUEL: '{bad}'")

    # 3. Contamination inter-templates
    if 'ESSENTIELLE' in expected_badge and 'PREMIUM · 299' in html_str:
        errors.append("CONTAMINATION: Premium dans Essentielle")
    if 'PREMIUM' in expected_badge and 'ESSENTIELLE · 49' in html_str:
        errors.append("CONTAMINATION: Essentielle dans Premium")

    if errors:
        raise ValueError(f"PREFLIGHT ÉCHOUÉ: {errors}")
```

**REJETER l'export si** : placeholder `{{...}}` détecté, donnée résiduelle, label d'offre incohérent, contenu sous le footer, page quasi vide, header/footer manquant sur page interne.

### Isolation stricte des 3 templates
Chaque offre (Essentielle, Complète, Premium) doit utiliser un template **strictement isolé**. Il est interdit qu'un rapport Premium contienne un libellé Essentielle, ou qu'un rapport reprenne des variables, blocs ou conclusions d'un autre dossier.

---

## Script de Génération Python — kci_generator_v2.py (VERSION PRODUCTION)

Le script **`kci_generator_v2.py`** (dans `{workspace}/kci-rapport-skill-update/`) est le moteur de production des rapports PDF. Version v2 validée par audit visuel sur 12 rapports (4 clients × 3 offres) le 18 mars 2026.

**IMPORTANT** : Utiliser `kci_generator_v2.py` et NON `kci_generator.py` (version obsolète avec bugs connus).

### Utilisation
```bash
cd {workspace}/kci-rapport-skill-update/
python3 kci_generator_v2.py
```

### Architecture du script v2
1. **Dictionnaires de données** : un par client, avec TOUTES les informations (identification, scores, KPIs, tableaux financiers, 3 scénarios, FHR, checklist, conclusion, résumé, méthodologie, dispositifs fiscaux, plan d'action)
2. **Fonctions de génération HTML** :
   - `build_scores_html_7()` : 7 sous-scores avec barres colorées (classes `sc-row`, `bar-t`, `bar-f`, `sc-v`) + descriptions
   - `build_scenario_col_html()` : colonne de scénario (Prudent/Médian/Optimiste) avec investissement, revenus, rendement, plus-value
   - `build_fhr_items()` : items Faits/Hypothèses/Risques
   - `build_checklist_items()` : checklist 8 items avec badges OK/WARN/STOP
   - `build_dispositifs_html()` : dispositifs fiscaux avec catégories fa/hy
   - `build_plan_action_html()` : plan d'action 5 étapes numérotées
3. **`generate_all_offers(client)`** : génère les 3 PDF (49/129/299) pour un client avec le bon template et le bon badge par offre
4. **`fix_pagination(html, total_pages)`** : remplace `{{PAGE_NUM}}/{{PAGE_TOTAL}}` page par page (pas globalement)
5. **Preflight** : vérifie 0 placeholder restant avant export PDF

### Règles critiques d'injection v2 (TOUTES VALIDÉES PAR AUDIT)

| Règle | Description | Statut |
|-------|-------------|--------|
| Badge par offre | "OFFRE ESSENTIELLE · 49 €" / "OFFRE COMPLÈTE · 129 €" / "OFFRE PREMIUM · 299€" | ✅ |
| Pagination par page | Chaque page a son propre numéro (2/4, 3/4, etc.) | ✅ |
| Score ring class | `g` ≥7.0, `o` 5.5-6.9, `ro` 5.0-5.4, `r` <5.0 | ✅ |
| Sous-scores avec barres | Classes CSS `sc-row`/`bar-t`/`bar-f`/`sc-v` + description | ✅ |
| Scénarios dynamiques | 3 colonnes générées par `build_scenario_col_html()` | ✅ |
| Localisation format | "Commune (Code Postal)" — pas juste le code postal | ✅ |
| Conclusion personnalisée | Texte spécifique au dossier, jamais le texte par défaut | ✅ |
| Points forts filtrés | 49€ : uniquement éléments positifs, négatifs dans "vigilance" | ✅ |
| Frais notaire | 8% (ancien) ou 3% (neuf) selon bien | ✅ |

### Structure du dictionnaire client (obligatoire)

Chaque client doit contenir ces clés :
```python
{
    "nom": str,                    # Nom complet
    "nom_fichier": str,            # PascalCase sans accent (ex: "Gibrien")
    "dossier": str,                # Nom du dossier de sortie
    "date_code": str,              # "260318" (AAMMJJ)
    "type_bien": str,              # Ex: "Maison T10/F10 · 2 logements"
    "surface_hab": str,            # Ex: "265 m²"
    "surface_terrain": str,        # Ex: "1 302 m²"
    "commune": str,                # Ex: "Le Gosier"
    "code_postal": str,            # Ex: "97190"
    "prix_demande": str,           # Ex: "360 000 €"
    "programme": str,              # Ex: "Bi-locatif (T4 RDC + T5 étage)"
    "annee": str,                  # Ex: "1990 · Rafraîchissement"
    "pieces": str,                 # Ex: "10 pièces / 7 chambres"
    "zone_plu": str,               # Ex: "Zone UD (résidentiel diffus)"
    "etages": str,                 # Ex: "3 niveaux · 2 terrasses 100 m²"
    "score_global": str,           # Ex: "7.0"
    "verdict": str,                # Ex: "INTÉRESSANT SOUS CONDITIONS"
    "verdict_desc": str,           # Description courte du verdict
    "scores_7": list[tuple],       # 7 tuples (label, val, description)
    "kpi_prix_m2": str,            # KPI 1
    "kpi_rendement_brut": str,     # KPI 2
    "kpi_3": str,                  # KPI 3
    "kpi_4": str,                  # KPI 4
    "kpi_label_1..4": str,         # Labels des KPIs
    "faits": list[str],            # Faits confirmés
    "vigilance": list[str],        # Points de vigilance
    "tableau_financier_49": list,   # Lignes tableau express
    "tableau_financier_129": list,  # Lignes tableau détaillé
    "conclusion": str,             # HTML avec <strong>
    "resume_executif": str,        # HTML avec <strong>
    "checklist": list[tuple],      # (type, texte) — type: ok/warn/stop
    "dispositifs_fiscaux": list,   # (cat, nom, description)
    "plan_action": list[tuple],    # (titre, description)
    "scenarios": dict,             # {prudent, median, optimiste}
}
```

### Données résiduelles interdites
Le preflight doit détecter et rejeter ces chaînes (sauf si elles correspondent au dossier en cours) :
"Le Gosier", "Florence", "T10/F10", "1 358 €/m²", "62%", "bi-locatif", "327k€", "320–340 k€", "KCI-2026-001", "265 m²", "360 000", "1 302 m²"

---

## Workflow de production

À chaque nouveau dossier :

1. **Identifier l'offre achetée** (49 / 129 / 299€) — si non précisé, demander
2. **Extraire toutes les données** des documents fournis (annonce, PLU, cadastre, photos, PDF)
3. **Lire les 3 fichiers de référence** dans `references/`
4. **Charger la fiche commune** depuis `{workspace}/references/database/guadeloupe/communes/{slug}.json`
5. **Charger les fichiers transversaux** depuis `{workspace}/references/database/guadeloupe/` : `_fiscalite.json`, `_construction-btp.json`, `_marche-locatif.json`
6. **Analyse topographique et satellite conditionnelles** : voir section dédiée ci-dessous
7. **Charger le template** correspondant à l'offre (`rapport-49.html`, `rapport-129.html`, ou `rapport-299.html`)
8. **Croiser données fournies + base de données + topographie** : utiliser les données vérifiées de la base en priorité, compléter avec les documents fournis
9. **Remplir la grille de scores** de manière cohérente (voir `references/methodologie-financiere.md`). Le sous-score "Risque global" doit tenir compte de la pente si elle est forte.
10. **Séparer faits / hypothèses / risques** rigoureusement
11. **Vérifier la cohérence des données financières** (voir section dédiée ci-dessous)
12. **Pour le 299€ : produire les 3 scénarios** (Prudent / Médian / Optimiste) avec les garde-fous dédiés
13. **Intégrer les photos** selon le workflow réaliste (voir section dédiée ci-dessous)
14. **Rédiger la conclusion** — claire, non ambiguë, orientée décision
15. **Effectuer la relecture automatique** (checklist en fin de document)
16. **Produire le PDF final** : convertir le HTML via weasyprint

---

## Analyse Topographique & Photo Satellite — Mode Conditionnel

L'analyse topographique et la photo satellite ne doivent être exécutées **que si l'utilisateur a fourni au moins l'une des informations suivantes :**

- Référence cadastrale complète (code INSEE + section + numéro)
- Coordonnées GPS précises (longitude/latitude)
- Adresse exacte du bien

### Scénario 1 : Données disponibles
Exécuter les deux scripts :
- `scripts/topographie_parcelle.py` avec la référence cadastrale ou les coordonnées
- `scripts/photo_satellite_parcelle.py` pour la vue comparative satellite + cadastre

Intégrer les résultats dans le rapport :
- Encadré "Topographie estimée" dans la section identification du bien
- Vue comparative dans la galerie photos (offres 129€ et 299€)

### Scénario 2 : Données indisponibles
**Ne PAS exécuter les scripts.** Ajouter dans le rapport sous le titre du bien :
> "Topographie : non évaluée — adresse exacte non communiquée par l'agence."
> "Photo satellite : non disponible — géolocalisation insuffisante."

Cela s'applique couramment aux annonces en ligne sans adresse détaillée. C'est normal et n'est pas un manquement.

### Impact sur le scoring
Si la topographie n'a pas pu être évaluée, le sous-score "Risque global" reste basé sur les autres critères (zone sismique, PPRI/PPRN, servitudes, etc.). Ne pas inventer de données de relief.

### Données produites (si exécution)

Le script `scripts/topographie_parcelle.py` retourne un JSON structuré contenant :

| Champ | Description | Exemple |
|-------|-------------|---------|
| `altitude_moyenne_m` | Altitude moyenne de la parcelle | 135.2 |
| `denivele_m` | Différence entre point haut et point bas | 4.3 |
| `pente_moyenne_pct` | Pente estimée en % | 8.1 |
| `qualification_pente` | plat / pente douce / modérée / forte / très forte | "pente douce" |
| `orientation_pente` | Direction de la descente (nord, sud-est, etc.) | "sud-ouest" |
| `impact_terrassement` | Surcoût estimé sur le gros œuvre | {"surcout_gros_oeuvre_pct": "5-10%", "qualification": "modéré"} |
| `texte_rapport` | Texte prêt à injecter dans le rapport | "Altitude moyenne : ~135 m — Dénivelé..." |

### Impact sur le scoring
- **plat** (≤3%) → neutre sur le score
- **pente douce** (3-8%) → -0.2 sur sous-score "Risque global"
- **pente modérée** (8-15%) → -0.5 sur sous-score "Risque global"
- **pente forte** (15-30%) → -1.0 sur sous-score "Risque global" + mention dans Risques
- **pente très forte** (>30%) → -1.5 sur sous-score "Risque global" + risque bloquant potentiel

### Impact sur l'estimation financière
Ajouter le surcoût de terrassement (issu de `impact_terrassement.surcout_gros_oeuvre_pct`) au poste gros œuvre dans le tableau financier.

### APIs utilisées

- **API Carto Cadastre IGN** (`apicarto.ign.fr`) — géométrie de la parcelle en GeoJSON
- **API Altimétrie Géoplateforme IGN** (`data.geopf.fr`) — altitude MNT RGE ALTI (résolution ~5m en DOM)
- **API Adresse data.gouv.fr** — géocodage d'adresse (mode adresse uniquement)

### Précision et limites

La résolution du MNT en Guadeloupe est d'environ 5 mètres. L'estimation est indicative et suffisante pour une pré-faisabilité, mais ne remplace pas un relevé topographique professionnel. Toujours préciser dans le rapport : *"Estimation topographique indicative (source : MNT IGN ~5m) — à confirmer par relevé topographique."*

---

## Photos — Workflow Réaliste

### Scenario 1 : Fichiers locaux fournis
Si des photos sont fournies comme fichiers locaux (JPG/PNG) :
1. Encoder chaque photo en base64
2. Injecter dans les slots du template HTML : `<img src="data:image/jpeg;base64,{b64}" alt="...">`
3. Respecter les placements prévus : slot 1 (grande) + slots 2-3 (vignettes)

### Scenario 2 : Provenance en ligne (annonce immobilière)
Si les photos proviennent d'une annonce en ligne (le plus courant) :
- Les images sont souvent protégées par CDN et non accessibles en base64
- **Utiliser des placeholders professionnels** avec descriptions textuelles claires
- Slots :
 - **Slot 1** : "VUE PRINCIPALE DU BIEN"
 - **Slot 2** : "VUE INTÉRIEURE"
 - **Slot 3** : "ENVIRONNEMENT / QUARTIER"
- Les placeholders utilisent le style SVG du template (icône photo + label texte gris)

### Scenario 3 : Intégration manuelle après génération
Si l'utilisateur fournit les photos après la génération du premier PDF :
1. Régénérer rapidement le rapport via le template
2. Remplacer les placeholders par les images en base64
3. Reconvertir en PDF

**Règle globale** : chaque slot doit être rempli, soit par une vraie photo, soit par un placeholder cohérent. Jamais de slot vide.

---

## Données Financières — Garde-Fou de Cohérence

Avant de finaliser le rapport, vérifier programmatiquement que les données financières sont cohérentes. **Cette vérification est obligatoire pour les 3 offres.**

Checklist de cohérence :

1. **Prix d'acquisition** = le prix de l'annonce (JAMAIS un autre montant)
2. **Frais de notaire** = 8% du prix (ancien) OU 3% (neuf) — cohérent selon l'ancienneté
3. **Travaux × surface** = montant affiché (ex : 250€/m² × 80m² = 20 000€)
4. **MOE** = % × travaux = montant affiché (ex : 12% × 20 000€ = 2 400€)
5. **Somme investissement total** = somme vérifiée (prix + frais notaire + travaux + MOE + autres = total)
6. **Loyers × 12** = revenus bruts annuels (ex : 650€/mois × 12 = 7 800€/an)
7. **Revenus bruts − charges** = revenu net (ex : 7 800€ − 1 560€ = 6 240€)
8. **Rendement brut** = revenus bruts / coût total (ex : 7 800€ / 120 000€ = 6,5%)
9. **Rendement net** = revenu net / coût total (ex : 6 240€ / 120 000€ = 5,2%)
10. **Cohérence 3 rapports** : si le dossier produit les 3 offres (49€ + 129€ + 299€), vérifier que les mêmes données de base (prix, surface, loyer de référence) sont utilisées dans tous les rapports.

**Si une incohérence est détectée** : corriger avant rendu. Ne jamais laisser passer un montant qui ne colle pas.

---

## Garde-Fous Premium 299€

Le rapport Premium comporte des règles spécifiques en raison de sa complexité et de son coût.

### Scénarios obligatoires
Les 3 scénarios (Prudent / Médian / Optimiste) **ne sont PAS des profils d'investisseur — ce sont des variantes financières du MÊME projet.**

Chaque scénario doit inclure :
- Un tableau financier COMPLET : investissement + revenus + rendement brut + rendement net
- Hypothèses de travaux différentes : haute fourchette (Prudent) / médiane (Médian) / basse fourchette (Optimiste)
- Loyers différents : loyer conservateur (Prudent) / loyer marché (Médian) / loyer optimiste (Optimiste)
- Taux de vacance différents : 20% (Prudent) / 15% (Médian) / 10% (Optimiste)
- Le rendement brut ET net affiché clairement (avec étiquettes)
- La plus-value latente estimée

### 7 sous-scores obligatoires
Le rapport Premium doit afficher **les 7 sous-scores détaillés** (pas les 3 simplifiés du 49€). Chaque sous-score doit avoir une **justification d'1-2 lignes** expliquant le calcul ou les critères.

Exemple :
> "Score Emplacement : 7.5/10"
> "*Localisation en zone résidentielle établie avec commerces de proximité. Pas d'accès direct à l'emploi principal — nécessite véhicule.*"

### Anti-pages blanches Premium
Le Premium n'a pas de limite de pages (minimum 8 recommandé). **Chaque page doit être remplie à 70% minimum.** Si un scénario ne remplit pas la page, le fusionner avec le suivant :
- Page 1 : Couverture
- Page 2 : Résumé exécutif + Identification du bien
- Pages 3-5 : Scénario Prudent + début Scénario Médian
- Pages 6-8 : Continuation Scénario Médian + Scénario Optimiste
- Pages 9-10 : Synthèse comparative + Recommandation + Méthodologie + Signature

**Ne jamais laisser une page vide ou à 50%** — compacter, fusionner, ou étendre selon le besoin.

---

## Logos — Encodage PNG Base64

Tu dois remplacer TOUTE référence aux SVG maison par l'utilisation du **logo entete v2.png** encodé en base64 PNG. Cela garantit que le rapport PDF est autonome et ne dépend d'aucun fichier externe.

### Tailles et usage :
- **Couverture** : 44×44px, **PAS de border-radius** (fond transparent)
- **Headers pages intérieures** : 32×32px
- **Signature** : 16×16px

### Workflow d'encodage Python :

```python
from PIL import Image
import io, base64

# Charger le logo source
logo = Image.open('{workspace}/logo/logo entete v2.png')

# Redimensionner et encoder pour chaque usage
for name, size in [("cover", 44), ("header", 32), ("sig", 16)]:
  img = logo.copy()
  img.thumbnail((size, size), Image.LANCZOS)

  buf = io.BytesIO()
  img.save(buf, format='PNG')
  b64 = base64.b64encode(buf.getvalue()).decode()

  # Utiliser dans le HTML :
  # <img src="data:image/png;base64,{b64}" width="{size}" height="{size}">
  print(f"Logo {name}: data:image/png;base64,{b64}")
```

### Intégration dans le HTML :

```html
<!-- Couverture : 44×44, pas de border-radius -->
<img src="data:image/png;base64,{LOGO_COVER_B64}" width="44" height="44" alt="KCI Logo">

<!-- En-tête page intérieure : 32×32, pas de border-radius -->
<img src="data:image/png;base64,{LOGO_HEADER_B64}" width="32" height="32" alt="KCI">

<!-- Signature : 16×16, pas de border-radius -->
<img src="data:image/png;base64,{LOGO_SIG_B64}" width="16" height="16" alt="KCI">
```

---

## Architecture HTML / CSS commune

Voir la section **"CSS Standardisé — Pages Intérieures"** ci-dessus pour le CSS à jour appliqué à TOUS les rapports.

Cette section établit les règles pour :
- Container page intérieure (`.ip`)
- En-tête (`.ip-logo`, `.ip-kci`, `.ip-sep`, `.ip-full`)
- Pied de page (`.ip-ftr`, `.ftr-txt`, `.ftr-pg`)
- Cercles décoratifs (couverture uniquement : `.cc1`, `.cc2`)

**Remarque importante** : Le CSS `padding:8mm 12mm 30mm` et `footer bottom:14mm` s'appliquent aux offres 129€ et 299€ uniquement. L'offre 49€ utilise `padding:6mm 10mm 24mm` et `footer bottom:8mm` pour gagner de l'espace (correction audit v3, mars 2026).

---

## Trame par offre

### Offre Essentielle — 49€

**Objectif** : premier filtre rapide. Outil de tri premium.

**Contrainte** : le rapport DOIT tenir sur **2 pages A4 maximum** (couverture + 1 page de synthèse). Format ultra-synthétique, lecture < 2 min. Dense, lisible, élégant — pas un rapport incomplet, un outil de tri premium.

**Page 1 — Couverture** : fond navy (#0B1526), logo PNG 44×44 en haut à gauche, badge "Offre Essentielle · 49€", titre du bien, fiche 6 champs, cercle score /10 + verdict, pied de page avec "Rapport établi pour [NomClient]" (texte gris clair, aligné bas).

**Page 2 — Synthèse** :
1. En-tête KCI avec logo PNG 32×32
2. 4 KPIs en grille (prix/m², rendement brut, rendement net, potentiel valorisation)
3. 3 sous-scores simplifiés : Potentiel du bien · Emplacement · Risque global
4. Points forts (3–4 bullets max)
5. Points de vigilance (3–4 bullets max)
6. Estimation financière rapide
7. Note finale /10 + verdict en anneau coloré
8. Conclusion courte (2–3 phrases max)
9. Upsell discret : *"Pour une analyse complète avec estimation financière détaillée et 7 sous-scores → Offre Complète 129€"*
10. Footer avec numéro de page

**CSS compact pour tenir en 2 pages** :
```css
.ip { padding:6mm 10mm 24mm; }
.ip-ftr { bottom:8mm; left:10mm; right:10mm; padding-top:2mm; }
.mb3 { margin-bottom:2mm; }
```

**Règle anti-overflow** : le contenu de la page 2 (KPIs + scores + points forts/vigilance + tableau + conclusion + upsell + méthodologie + signature) ne doit JAMAIS toucher la zone du footer. Le padding-bottom de 24mm et le footer à bottom:8mm garantissent un espace de sécurité suffisant.

---

### Offre Complète — 129€

**Objectif** : vraie pré-étude de faisabilité exploitable.

**Contrainte** : **pas de limite de pages**. Le contenu dicte la longueur. Template HTML de base : `templates/rapport-129.html`.

**RÈGLE ABSOLUE** : utiliser UNIQUEMENT le template `templates/rapport-129.html`. Ne pas recréer la mise en page de zéro. Injecter les données du dossier dans le template, puis convertir en PDF via weasyprint.

**Structure type (extensible selon le contenu du dossier) :**

**Page 1 — Couverture** : fond navy (#0B1526), logo PNG 44×44 en or en haut à gauche, badge "Offre Complète · 129€", titre du bien (type + localisation), fiche 6 champs, cercle score /10 + verdict + description courte, pied de page avec "Rapport établi pour [NomClient]" (texte gris clair, aligné bas).

**Page 2 — Photos · KPIs · Identification · 7 Sous-scores** : en-tête PNG avec logo 32×32, galerie photos (1 grande + 2 vignettes ou placeholders), 4 KPIs en grille (prix/m², rendement brut, rendement net, coût total), fiche identification complète (9 lignes), 7 sous-scores avec barres colorées + brèves justifications.

**Page 3 — Résumé exécutif · Tableau financier · Faits/Hypothèses/Risques** : en-tête PNG avec logo 32×32, bloc résumé exécutif sur fond navy, tableau financier en 3 blocs (investissement / revenus / rendement brut + net), 3 colonnes FHR colorées.

**Page 4 — Checklist · Conclusion · Note finale · Disclaimer · Méthodologie · Signature** : en-tête PNG avec logo 32×32, checklist 8 items (badges OK/ATT./STOP), bloc conclusion sur fond navy avec filet doré, note finale + upsell 299€ en 2 colonnes, encadré "Méthodologie de l'analyse", disclaimer juridique, signature Dereck Rauzduel, footer.

**Injection des données dans le template :**
- Remplacer toutes les données fictives (bien, scores, montants, commune, dates) par les vraies données du dossier
- **Utiliser les données de la base KCI v2.0** en priorité (DVF pour prix/m², PLU pour zones, LOVAC pour vacance)
- Insérer les photos fournies : remplacer `<div class="photo-placeholder">...</div>` par `<img src="data:image/jpeg;base64,..." alt="...">`
- Adapter les couleurs des barres de score : `green` si ≥7, `orange` si 5–6.9, `red` si <5
- Mettre à jour le numéro de dossier, la date, et la référence partout dans le document
- Ne jamais modifier le CSS ni la structure HTML — uniquement les données

---

### Offre Premium — 299€

**Objectif** : analyse stratégique détaillée avec arbitrage et scénarios.

**Contrainte** : rapport approfondi, **pas de limite de pages** (minimum 8 recommandé). Utiliser le template `templates/rapport-299.html`.

**Structure globale** :
- Page 1 : Couverture premium (logo PNG 44×44) — fond navy, pied de page avec "Rapport établi pour [NomClient]" (texte gris clair, aligné bas)
- Page 2 : Résumé exécutif global + Identification du bien
- Page 3 : Indicateurs clés + 7 sous-scores détaillés + Note finale
- Pages 4–6 : Scénario Prudent (tableau financier complet + analyse)
- Pages 7–8 : Scénario Médian (tableau financier complet + analyse)
- Pages 9–10 : Scénario Optimiste (tableau financier complet + analyse)
- Page 11 : Synthèse comparative des 3 scénarios (tableau récapitulatif)
- Page 12 : Recommandation stratégique finale + Méthodologie + Signature

**Chaque page intérieure** utilise le système `.ip` / `.ip-hdr` avec logo PNG 32×32 en en-tête et footer.

---

## Règles de Signature et Identité Client

### Couverture : Identité client obligatoire
Le **nom du client doit apparaître dans le footer de couverture (c-ftr)** sous la forme exacte :
> "Rapport établi pour [NomClient]"

### Informations d'entreprise du fondateur
KCI est en **phase beta**. Tant que l'entreprise n'est pas immatriculée :
- **Ne pas inclure** de SIRET, numéro de TVA, ou coordonnées d'entreprise
- **Utiliser uniquement** le nom et l'email du fondateur : "Dereck Rauzduel" et "dereck.rauzduel@gmail.com"
- Une fois immatriculée, mettre à jour avec les coordonnées officielles

---

## Séparation Faits / Hypothèses / Risques

Toujours clairement distinguer ces trois catégories. Ne jamais présenter une hypothèse comme un fait.

**Faits** = données confirmées ou documentées (surface cadastrale, prix affiché, zone PLU déclarée, documents fournis, données DVF de la base KCI, paramètres PLU vérifiés)

**Hypothèses** = estimations et projections (surface constructible estimée, coût travaux projeté, loyers estimés, taux de vacance supposé, valorisation future)

**Risques** = points de vigilance (pente, PPRI/PPRN, servitudes, ABF, zone sismique 5, réseaux partiels, diagnostics manquants, marché local étroit). **Ne JAMAIS citer La Soufrière ou le volcanisme** — utiliser "aléas naturels" ou "PPRI/PPRN".

**Présentation** : faits en texte standard, hypothèses en italique gris, risques avec indicateurs colorés (vert OK / orange Attention / rouge Bloquant).

---

## Résumé Exécutif

### Pour 129€ et 299€
5-8 lignes qui répondent à : Quel est le bien ? Quel est le projet ? Quel est le potentiel global ? Quel est le principal risque ? Quelle est la recommandation ?

Compréhensible par un non-expert.

### Pour 49€
Pas de résumé séparé — le bloc "Résumé du bien" contient l'équivalent en 2-3 lignes.

---

## Conclusion d'Aide à la Décision

Répond à : **Que doit faire le client maintenant ?**

Types autorisés :
- Approfondir rapidement — le projet a du potentiel
- Demander des vérifications avant engagement (lister lesquelles)
- Négocier fortement le prix (justifier le delta)
- Revoir le projet / programme (expliquer pourquoi)
- Éviter le dossier en l'état (raison principale)

**Longueur** : 3–5 phrases pour 129€/299€, 1–2 phrases pour 49€. Claire, non ambiguë, alignée avec les scores. Le client paie pour une recommandation, pas pour du "ça dépend".

---

## Double Niveau de Langage

Quand un terme technique est utilisé, le reformuler immédiatement en langage courant :

**Exemple 1** : "Le terrain est situé en zone UAb (zone urbaine à constructibilité encadrée, avec protections patrimoniales)."

**Exemple 2** : "Le projet nécessite l'avis de l'ABF (Architecte des Bâtiments de France), ce qui peut allonger les délais de 6 à 12 mois."

**Exemple 3** : "Rendement net estimé à 3,6% — correct pour un investissement patrimonial, mais en dessous du seuil locatif classique (5-7%)."

Style : professionnel, pédagogique sans condescendance, synthétique, orienté décision.

---

## Checklist de Relecture (obligatoire avant rendu)

Avant de finaliser, vérifie chaque point :

- [ ] Le nom du fichier PDF suit le format : `KCI_Rapport_[Offre]_[NomClient]_[DateAAMMJJ].pdf`
- [ ] La section "Méthodologie de l'analyse" est présente et complète
- [ ] Chaque donnée chiffrée est accompagnée de sa source (ou d'une mention "estimation indicative")
- [ ] Les données de la base KCI v2.0 ont été utilisées quand disponibles (DVF, PLU, LOVAC)
- [ ] L'analyse topographique a été exécutée OU justifiée comme "non évaluée" si données insuffisantes
- [ ] L'encadré "Topographie estimée" est présent (ou note "non évaluée" si applicable)
- [ ] La vue comparative satellite + cadastre est générée et intégrée (offres 129€ et 299€)
- [ ] Aucune formulation absolue ou promotionnelle n'a été utilisée
- [ ] **Aucune mention de La Soufrière ou du volcanisme** dans tout le rapport
- [ ] Le score KCI est présenté comme indicateur synthétique, pas comme certitude
- [ ] L'indice de confiance est affiché (si 129€ ou 299€)
- [ ] La structure correspond à l'offre achetée (49/129/299€)
- [ ] Le 49€ tient sur 2 pages A4 max / le 129€ et le 299€ n'ont pas de limite de pages (contenu dicte la longueur)
- [ ] **Aucune page ne contient plus de 70% d'espace blanc**
- [ ] Pour le 129€ : le template `templates/rapport-129.html` a été utilisé sans modifier le CSS ni la structure
- [ ] Pour le 299€ : le template `templates/rapport-299.html` a été utilisé
- [ ] Le logo PNG est présent en haut à gauche de CHAQUE page (couverture : 44×44, intérieures : 32×32)
- [ ] Les cercles décoratifs de couverture ne se chevauchent pas (cc1: top:-60mm right:-50mm, cc2: bottom:-20mm left:-55mm)
- [ ] Les sous-scores sont cohérents entre eux
- [ ] La note finale est cohérente avec la moyenne des sous-scores (écart ≤ 1 point)
- [ ] Pour le Premium : les 7 sous-scores sont affichés avec justifications
- [ ] Pour le Premium : les 3 scénarios contiennent tableaux financiers COMPLETS (investissement + revenus + rendement)
- [ ] Pour le Premium : les 3 scénarios ont hypothèses de travaux / loyers / vacance différentes
- [ ] Le verdict correspond à la plage de la note finale
- [ ] Les hypothèses sont clairement distinguées des faits
- [ ] Les risques sont explicitement listés
- [ ] La conclusion est alignée avec le score et le verdict
- [ ] Le rapport est compréhensible par un non-expert
- [ ] Aucune contradiction interne
- [ ] Les montants sont cohérents — vérification complète de la checklist financière (voir section dédiée)
- [ ] Les unités sont homogènes (€, €/m², €/mois, €/an, %)
- [ ] La mise en page reste lisible et premium
- [ ] Les spécificités Guadeloupe sont prises en compte (fiscalité DOM, zone sismique 5, coûts majorés)
- [ ] Les dispositifs fiscaux mentionnés sont à jour (Pinel OM expiré 31/12/2024, Girardin actif → 2029)
- [ ] Footer informatif présent sur chaque page intérieure (KCI · Type rapport · Non contractuel · X / Y)
- [ ] Logo PNG présent aux bonnes dimensions : 44×44 couverture, 32×32 headers pages intérieures, 16×16 signature
- [ ] Pied de page couverture contient "Rapport établi pour [NomClient]"
- [ ] Aucune mention de " analyses" ni chiffre d'analyses réalisées
- [ ] Site web : karukera-conseil.com (seul domaine autorisé)
- [ ] Source utilisée pour toutes les offres : "Base DVF (Demandes de Valeurs Foncières — data.gouv.fr), transactions notariales Guadeloupe 2024-2025, données INSEE locales, PLU communal, cadastre.gouv.fr"
- [ ] Pas de SIRET, TVA, ou coordonnées entreprise (utiliser uniquement nom fondateur + email jusqu'à immatriculation)
- [ ] Le script kci_generator.py a été exécuté (pas de génération manuelle)
- [ ] Le preflight a été exécuté et a retourné 0 erreur
- [ ] Les noms de fichiers suivent le format v4 : `KCI_Rapport_[Offre]_[Nom]_[DateAAMMJJ]_v4.pdf`
- [ ] La classe de couleur du score correspond au seuil : g (≥7.0), o (5.5-6.9), ro (5.0-5.4), r (<5.0)
- [ ] AUCUNE donnée résiduelle d'un ancien dossier (T10, Gosier, Florence, 1990 Rafraîchissement)
- [ ] Les 3 scénarios Premium ont des tableaux DYNAMIQUES (pas de valeurs en dur du template)

Si un point échoue, corriger avant rendu. Le rapport n'est pas complet tant que la checklist n'est pas 100%.
