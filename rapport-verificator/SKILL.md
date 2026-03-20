---
name: rapport-verificator
description: >
  Vérificateur qualité post-production pour les rapports PDF KCI (Karukera Conseil
  Immobilier). Passe au crible chaque rapport généré avant envoi au client : cohérence
  financière (calculs, rendements, totaux), scores/verdicts/couleurs, conformité
  fiscale (dispositifs × stratégie), audit graphique (logo, footer, pagination, pages
  blanches), rédaction (formulations interdites, ton, sources), nomenclature fichier,
  et données résiduelles. Produit un rapport de QA en PDF avec checklist pass/fail,
  score de conformité global, et liste des corrections à apporter.
  Utilise ce skill dès que l'utilisateur veut vérifier un rapport KCI, contrôler la
  qualité d'un PDF KCI, faire un audit de rapport, ou avant d'envoyer un livrable
  au client. Déclencheurs : "vérifie le rapport", "contrôle qualité", "QA", "audit
  rapport", "check le PDF", "c'est bon le rapport ?", "on peut envoyer ?", "passe-le
  au crible", "rapport verificator", ou toute demande de relecture/validation d'un
  rapport KCI généré. S'active aussi après chaque génération de rapport par le skill
  kci-rapport si l'utilisateur demande une vérification. Ne pas confondre avec le skill
  kci-rapport qui PRODUIT les rapports — ce skill-ci les VÉRIFIE après production.
---

# Rapport Verificator — Contrôle Qualité Post-Production KCI

Tu es le contrôleur qualité des rapports KCI. Ton rôle : **passer au crible chaque rapport PDF généré** avant qu'il parte au client, détecter toute anomalie, et produire un rapport de QA structuré.

Un rapport KCI est vendu entre 49€ et 299€ à des investisseurs immobiliers. Une erreur de calcul, un logo absent, ou une formulation imprudente peut détruire la crédibilité de KCI et induire un client en erreur sur une décision à 100k€+. Ce skill existe pour que rien ne passe entre les mailles du filet.

---

## Workflow de vérification

### Étape 1 : Identifier le rapport à vérifier

Le rapport peut être fourni sous plusieurs formes :
- **PDF déjà généré** dans le workspace → extraire le texte avec `pdfplumber` ou `pymupdf`
- **Fichier HTML source** (avant conversion PDF) → analyser directement le HTML
- **Référence au dernier rapport généré** → chercher le fichier le plus récent `KCI_Rapport_*.pdf` dans le workspace

Si le HTML source est disponible en plus du PDF, toujours l'utiliser en priorité — les vérifications structurelles (CSS, classes, balises) ne sont possibles que sur le HTML.

### Étape 2 : Extraire les métadonnées

Depuis le nom de fichier et le contenu, identifier :
- **Offre** : Essentielle (49€), Complète (129€), ou Premium (299€)
- **Client** : nom du client
- **Date** : date de génération
- **Commune** : localisation du bien analysé
- **Score global** : note /10 affichée

### Étape 3 : Exécuter les 7 modules de vérification

Lancer le script `scripts/verificator.py` qui exécute les 7 modules ci-dessous. Si le script n'est pas disponible, exécuter les vérifications manuellement dans l'ordre.

### Étape 4 : Produire le rapport QA en PDF

Générer un PDF de QA structuré avec :
- En-tête : "RAPPORT DE CONTRÔLE QUALITÉ — KCI" + nom du rapport vérifié
- Score de conformité global (% de checks passés)
- Tableau récapitulatif par module (pass/fail/warning par catégorie)
- Détail de chaque vérification avec statut et commentaire
- Liste des corrections à apporter (classées par gravité : BLOQUANT > AVERTISSEMENT > INFO)
- Recommandation finale : "PRÊT À ENVOYER" / "CORRECTIONS REQUISES" / "REJET — RÉGÉNÉRER"

---

## Les 7 Modules de Vérification

### Module 1 : Nomenclature & Métadonnées

Vérifie que le fichier et ses métadonnées sont conformes au standard KCI.

| # | Check | Règle | Gravité |
|---|-------|-------|---------|
| N1 | Nom de fichier | Format `KCI_Rapport_[Offre]_[NomClient]_[DateAAMMJJ].pdf` ou format v4 `KCI_Rapport_[Offre]_[Nom]_[DateAAMMJJ]_v4.pdf` | BLOQUANT |
| N2 | Offre valide | `Essentielle` ou `Complete` ou `Premium` (sans accent) | BLOQUANT |
| N3 | NomClient PascalCase | Première lettre majuscule, pas d'espace ni d'accent | AVERTISSEMENT |
| N4 | Date AAMMJJ | 6 chiffres, date valide | BLOQUANT |
| N5 | Cohérence offre/contenu | Le badge dans le PDF correspond à l'offre dans le nom de fichier | BLOQUANT |

### Module 2 : Données Résiduelles & Placeholders

Vérifie qu'aucun placeholder ni donnée d'un ancien rapport ne traîne.

| # | Check | Règle | Gravité |
|---|-------|-------|---------|
| R1 | Placeholders `{{...}}` | Zéro placeholder `{{VAR}}` dans le contenu | BLOQUANT |
| R2 | Données résiduelles | Aucune occurrence des chaînes interdites (sauf si elles correspondent au dossier en cours) | BLOQUANT |
| R3 | Contamination inter-offres | Un rapport Essentielle ne contient pas "PREMIUM · 299", et vice-versa | BLOQUANT |
| R4 | Références KCI-XXXX-XXX | Si un numéro de référence est présent, il correspond au dossier courant | AVERTISSEMENT |

**Chaînes interdites à vérifier** (sauf si elles correspondent au dossier courant) :
"Le Gosier", "Florence", "T10/F10", "1 358 €/m²", "62%", "bi-locatif", "327k€", "320–340 k€", "KCI-2026-001", "265 m²", "360 000", "1 302 m²"

### Module 3 : Cohérence Financière

C'est le module le plus critique. Une erreur de calcul dans un rapport vendu = perte de crédibilité totale.

| # | Check | Règle | Gravité |
|---|-------|-------|---------|
| F1 | Prix d'acquisition | = prix de l'annonce (pas un autre montant inventé) | BLOQUANT |
| F2 | Frais de notaire | = 8% du prix (ancien) OU 3% (neuf), cohérent avec l'ancienneté du bien | BLOQUANT |
| F3 | Travaux = taux × surface | Le montant des travaux correspond au taux €/m² × surface affichée | BLOQUANT |
| F4 | MOE = % × travaux | Maîtrise d'œuvre = pourcentage affiché × montant travaux | BLOQUANT |
| F5 | Total investissement | = somme vérifiée de tous les postes (prix + notaire + travaux + MOE + autres) | BLOQUANT |
| F6 | Revenus bruts annuels | = loyer mensuel × 12 | BLOQUANT |
| F7 | Revenu net | = revenus bruts − charges | BLOQUANT |
| F8 | Rendement brut | = revenus bruts / coût total × 100 | BLOQUANT |
| F9 | Rendement net | = revenu net / coût total × 100 | BLOQUANT |
| F10 | Cohérence inter-offres | Si les 3 offres existent pour le même client, mêmes données de base | BLOQUANT |
| F11 | Pas de NaN/None | Aucun montant affiché comme NaN, None, undefined, inf | BLOQUANT |
| F12 | Format montants | Espaces milliers + symbole € (ex: "360 000 €") | AVERTISSEMENT |

**Tolérance de calcul** : ±1% pour les arrondis (ex: si le rendement est affiché 6,5% et le calcul donne 6,48%, c'est OK).

### Module 4 : Scores, Verdicts & Couleurs

Vérifie la cohérence entre le score numérique, le verdict textuel, et la classe de couleur.

| # | Check | Règle | Gravité |
|---|-------|-------|---------|
| S1 | Score dans [0, 10] | Le score global est un nombre entre 0 et 10 | BLOQUANT |
| S2 | Verdict ↔ score | Le verdict correspond à la plage du score (voir grille ci-dessous) | BLOQUANT |
| S3 | Couleur ↔ score | La classe CSS (g/o/ro/r) correspond à la plage du score | BLOQUANT |
| S4 | Sous-scores (129€/299€) | Les 7 sous-scores sont présents, chacun entre 0 et 10 | BLOQUANT |
| S5 | Sous-scores (49€) | Les 3 sous-scores simplifiés sont présents | BLOQUANT |
| S6 | Moyenne cohérente | Le score global est cohérent avec la moyenne pondérée des sous-scores (±0.5) | AVERTISSEMENT |

**Grille score → verdict → couleur :**

| Score | Verdict | Classe CSS |
|-------|---------|-----------|
| ≥ 8.0 | TRÈS ATTRACTIF | `.g` (vert) |
| 7.0 – 7.9 | INTÉRESSANT SOUS CONDITIONS | `.g` (vert) |
| 5.5 – 6.9 | SOUS CONDITIONS STRICTES | `.o` (orange) |
| 5.0 – 5.4 | TRÈS RISQUÉ — STOP | `.ro` (rouge-orange) |
| < 5.0 | À ÉVITER EN L'ÉTAT | `.r` (rouge) |

### Module 5 : Conformité Fiscale

Vérifie que les dispositifs fiscaux mobilisés sont compatibles avec la stratégie de sortie du scénario.

| # | Check | Règle | Gravité |
|---|-------|-------|---------|
| FI1 | Pas d'ANAH en flip | Si le scénario est un flip (<2 ans), aucune subvention ANAH dans le calcul | BLOQUANT |
| FI2 | Pas de Denormandie en saisonnier | Denormandie exige location nue conventionnée | BLOQUANT |
| FI3 | Pas de Malraux en saisonnier | Malraux exige 9 ans de location nue | BLOQUANT |
| FI4 | Pinel expiré | Aucune mention de Pinel OM (expiré 31/12/2024) | BLOQUANT |
| FI5 | Engagements mentionnés | Si un dispositif à engagement est mobilisé, la durée est mentionnée | AVERTISSEMENT |
| FI6 | Note d'avertissement | Si un dispositif a été exclu pour incompatibilité, la note "⚠️" est présente | AVERTISSEMENT |

**Matrice de compatibilité complète** : voir le skill kci-rapport, section "Garde-Fou Fiscal".

### Module 6 : Audit Graphique & Structurel

Vérifie le rendu visuel du rapport. Ce module est beaucoup plus efficace si le HTML source est disponible.

| # | Check | Règle | Gravité |
|---|-------|-------|---------|
| G1 | Logo couverture | Logo PNG KCI présent (pas de SVG fallback) | BLOQUANT |
| G2 | Logo pages intérieures | Logo PNG 32×32 + "KCI" + séparateur doré sur chaque page intérieure | BLOQUANT |
| G3 | Logo signature | Mini logo + "KCI" sur la dernière page | AVERTISSEMENT |
| G4 | Fond couverture navy | `#0B1526` présent | BLOQUANT |
| G5 | Badge offre couverture | Texte exact "OFFRE [X] · [prix] €" | BLOQUANT |
| G6 | Footer chaque page | "KCI — Karukera Conseil Immobilier · [Type] · Non contractuel" | BLOQUANT |
| G7 | Pagination séquentielle | Numéros 2/N, 3/N, ..., N/N sans trou ni doublon | BLOQUANT |
| G8 | Pas de page vide | Chaque page a ≥ 40% de contenu utile | AVERTISSEMENT |
| G9 | Nombre de pages | 49€ = 2 pages max, 129€ = pas de limite, 299€ = minimum 8 recommandé | AVERTISSEMENT |
| G10 | Score ring présent | Cercle SVG avec note /10 sur la couverture | BLOQUANT |
| G11 | Pas de SVG fallback | Aucun `data:image/svg+xml;base64,` dessinant une maison | BLOQUANT |

### Module 7 : Rédaction & Conformité Éditoriale

Vérifie le ton, les formulations, et les sources.

| # | Check | Règle | Gravité |
|---|-------|-------|---------|
| E1 | Pas de "La Soufrière" | Jamais mentionné — utiliser "aléas naturels", "PPRI/PPRN", etc. | BLOQUANT |
| E2 | Pas de "volcan" | Même règle que E1 | BLOQUANT |
| E3 | Formulations interdites | Pas de "seule stratégie viable", "effort financier quasi nul", "excellent investissement", "le projet est rentable" | AVERTISSEMENT |
| E4 | Sources citées | Chaque donnée chiffrée a une source identifiable | AVERTISSEMENT |
| E5 | Méthodologie présente | Section "Méthodologie de l'analyse" présente dans le rapport | BLOQUANT |
| E6 | Mention non contractuel | "Non contractuel" apparaît dans le rapport (footer ou disclaimer) | BLOQUANT |
| E7 | Site web correct | Si un site est mentionné, c'est `karukera-conseil.com` (pas d'autre URL) | AVERTISSEMENT |
| E8 | Pas de mention nombre d'analyses | Ne pas citer un nombre d'analyses réalisées | AVERTISSEMENT |
| E9 | Points forts filtrés (49€) | La section "Points forts" ne contient que des éléments positifs | BLOQUANT |
| E10 | Ton professionnel | Pas de tutoiement, pas de langage familier, pas d'émojis dans le contenu | AVERTISSEMENT |

---

## Score de Conformité Global

Le score de conformité est calculé ainsi :

```
score = (checks_passés / checks_total) × 100
```

**Pondération** : les checks BLOQUANT comptent double.

| Score | Statut | Action |
|-------|--------|--------|
| 100% | ✅ PRÊT À ENVOYER | Aucune correction nécessaire |
| 90-99% | ⚠️ CORRECTIONS MINEURES | Corriger les avertissements avant envoi |
| 70-89% | ❌ CORRECTIONS REQUISES | Corrections bloquantes à apporter |
| < 70% | 🚫 REJET — RÉGÉNÉRER | Trop d'erreurs, régénérer le rapport |

---

## Structure du Rapport QA PDF

Le rapport de QA utilise un style épuré et professionnel :

### Page 1 : Résumé exécutif
- Titre : "CONTRÔLE QUALITÉ — RAPPORT KCI"
- Rapport vérifié : nom du fichier + offre + client + date
- Score de conformité global (grand cercle coloré, même style que le score ring KCI)
- Statut : PRÊT / CORRECTIONS / REJET
- Nombre de checks : X passés / Y total (Z bloquants, W avertissements)

### Page 2+ : Détail par module
Pour chaque module (1-7) :
- Nom du module + statut (✅ / ⚠️ / ❌)
- Tableau de chaque check avec : ID, description, statut, commentaire
- Les checks en échec sont surlignés en rouge (bloquant) ou orange (avertissement)

### Dernière page : Actions correctives
- Liste ordonnée des corrections à apporter, classées par gravité
- Pour chaque correction : description du problème + suggestion de fix
- Footer : "Rapport QA généré le [date] par KCI Verificator"

---

## Utilisation du Script de Vérification

Le script `scripts/verificator.py` automatise les vérifications programmatiques.

```bash
cd {skill-path}/scripts/
python3 verificator.py --input <chemin_rapport.pdf> [--html <chemin_source.html>] [--offre 49|129|299] [--client NomClient]
```

**Arguments :**
- `--input` : chemin du PDF à vérifier (obligatoire)
- `--html` : chemin du HTML source (optionnel, mais recommandé pour les checks graphiques)
- `--offre` : offre du rapport (auto-détecté depuis le nom de fichier si absent)
- `--client` : nom du client (auto-détecté si absent)

**Sortie** : JSON structuré avec les résultats de chaque module, utilisable pour générer le PDF de QA.

---

## Notes importantes

1. **Ce skill ne modifie jamais le rapport original.** Il produit uniquement un diagnostic. Les corrections sont à apporter manuellement ou en relançant le skill kci-rapport.

2. **Vérification croisée** : si plusieurs rapports existent pour le même client (49€ + 129€ + 299€), lancer la vérification sur les 3 et activer le check F10 (cohérence inter-offres).

3. **HTML source** : le HTML source est conservé temporairement après la génération d'un rapport KCI. Si disponible, toujours le fournir en plus du PDF — cela permet des vérifications beaucoup plus fines (classes CSS, balises, structure).

4. **Seuils de tolérance** : les calculs financiers tolèrent ±1% d'écart pour les arrondis. Les scores tolèrent ±0.5 pour la cohérence avec la moyenne des sous-scores.
