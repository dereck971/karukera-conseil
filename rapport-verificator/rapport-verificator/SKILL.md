---
name: rapport-verificator
description: >
  Vérificateur qualité post-production des rapports PDF KCI. Contrôle 7 modules : finance (calculs, rendements), scores/verdicts/couleurs, fiscal (dispositifs × stratégie), graphique (logo, footer, pagination), rédaction (formulations interdites, sources), nomenclature, données résiduelles. Produit un PDF de QA avec checklist pass/fail et score de conformité. Déclencheurs : "vérifie le rapport", "contrôle qualité", "QA", "audit rapport", "check le PDF", "c'est bon ?", "on peut envoyer ?", "passe-le au crible", "rapport verificator", ou toute demande de relecture/validation d'un rapport KCI. S'active aussi quand l'utilisateur demande si un rapport est prêt à envoyer au client. Ne produit PAS de rapports — il les VÉRIFIE.
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

## Orchestration Auto-Correction (Étape 5)

Après le diagnostic QA (étape 4), si des erreurs sont détectées, tu dois **enchaîner automatiquement** avec la correction et la régénération du rapport. C'est toi (Claude) qui orchestre la liaison entre le verificator et le skill kci-rapport — les deux skills ne se parlent pas directement, mais le workflow est conçu pour être continu.

### Règle d'enchaînement

| Résultat QA | Action automatique |
|-------------|-------------------|
| **100% — PRÊT À ENVOYER** | Aucune action. Confirmer à l'utilisateur que le rapport est bon. |
| **90-99% — CORRECTIONS MINEURES** | Lister les avertissements. Demander à l'utilisateur s'il veut corriger avant envoi, ou envoyer tel quel. |
| **70-89% — CORRECTIONS REQUISES** | **Corriger et régénérer automatiquement** (voir procédure ci-dessous). |
| **< 70% — REJET** | **Régénérer intégralement** via le skill kci-rapport avec les données corrigées. |

### Procédure de correction automatique

Quand le score QA est < 90% OU qu'il y a au moins 1 erreur BLOQUANT, exécuter cette séquence :

**1. Analyser le diagnostic JSON**

Lire le fichier `diagnostic.json` produit par le verificator. Pour chaque erreur dans `corrections[]`, identifier le type de correction nécessaire :

| Type d'erreur | Correction à appliquer |
|---------------|----------------------|
| **R1 — Placeholders** | Identifier les `{{VAR}}` restants → relancer l'injection de données dans le template HTML |
| **R2 — Données résiduelles** | Identifier les chaînes polluantes → chercher/remplacer dans le HTML source |
| **R3 — Contamination inter-offres** | Le mauvais template a été utilisé → régénérer avec le bon template |
| **F8/F9 — Rendements aberrants** | Recalculer les rendements à partir des données brutes du dossier |
| **F11 — NaN/None** | Identifier les variables manquantes → les renseigner puis réinjecter |
| **S2 — Verdict ↔ score** | Recalculer le verdict correct selon la grille score→verdict |
| **S3 — Couleur ↔ score** | Corriger la classe CSS (g/o/ro/r) selon la plage du score |
| **S4/S5 — Sous-scores manquants** | Régénérer la section scores avec les 7 (ou 3) sous-scores |
| **FI4 — Pinel expiré** | Supprimer toute mention de Pinel OM du rapport |
| **FI1/FI2/FI3 — Incompatibilité fiscale** | Retirer le dispositif incompatible du calcul ROI + ajouter note ⚠️ |
| **G1/G2/G11 — Logo absent/SVG** | Réinjecter le logo PNG base64 depuis la constante du skill kci-rapport |
| **G4 — Fond navy manquant** | Réinjecter `#0B1526` dans le CSS de couverture |
| **G7 — Pagination cassée** | Renuméroter les pages séquentiellement |
| **E1/E2 — Soufrière/volcan** | Remplacer par "aléas naturels" / "PPRI/PPRN" / "risque sismique zone 5" |
| **E3 — Formulations interdites** | Remplacer par les formulations autorisées (voir table du skill kci-rapport) |
| **E5 — Méthodologie absente** | Injecter la section méthodologie standard |
| **E6 — Non contractuel absent** | Vérifier que le footer contient "Non contractuel" |

**2. Appliquer les corrections sur le HTML source**

Si le HTML source est disponible :
- Charger le fichier HTML
- Appliquer chaque correction programmatiquement (chercher/remplacer, recalcul, réinjection)
- Sauvegarder le HTML corrigé sous un nouveau nom : `{nom_original}_corrected.html`

Si le HTML source N'EST PAS disponible (seulement le PDF) :
- **Régénérer intégralement** le rapport via le skill kci-rapport avec les données du dossier, en tenant compte des erreurs identifiées comme contraintes supplémentaires.
- Consulter le skill kci-rapport pour lancer la régénération.

**3. Reconvertir en PDF**

```python
from weasyprint import HTML
HTML(filename=corrected_html_path).write_pdf(corrected_pdf_path)
```

Nommer le PDF corrigé avec le même format que l'original (écraser ou ajouter `_v2` selon la préférence utilisateur).

**4. Relancer la vérification (boucle QA)**

Après correction, relancer le verificator sur le nouveau PDF pour confirmer que toutes les erreurs sont résolues. C'est une boucle :

```
verificator → diagnostic → corrections → régénération → verificator → OK
```

**Limite de boucle** : maximum **3 itérations**. Si après 3 passes le rapport n'est toujours pas à 100%, présenter le diagnostic final à l'utilisateur et demander une intervention manuelle. Ça évite les boucles infinies sur des erreurs que le script ne sait pas corriger.

**5. Livrer le rapport final**

Une fois le rapport à 100% (ou validé par l'utilisateur après corrections mineures) :
- Sauvegarder le PDF final dans le workspace
- Supprimer les fichiers intermédiaires (`_corrected.html`, diagnostics temporaires)
- Confirmer à l'utilisateur : "Rapport corrigé et vérifié — prêt à envoyer au client."
- Fournir le lien `computer://` vers le PDF final

### Exemple de workflow complet

```
Utilisateur : "vérifie le rapport BasDuBourg"

→ verificator analyse KCI_Rapport_Premium_BasDuBourg_260320.pdf
→ Score QA : 82% — 3 erreurs bloquantes (Pinel expiré, sous-scores manquants, format montants)
→ Diagnostic QA produit

→ Auto-correction :
  1. Suppression de la mention Pinel dans le HTML
  2. Régénération des 7 sous-scores avec barres colorées
  3. Reformatage des montants avec espaces milliers
  4. Reconversion HTML → PDF

→ Re-vérification du PDF corrigé
→ Score QA : 100% — PRÊT À ENVOYER

→ "Rapport corrigé et vérifié — prêt à envoyer."
```

### Cas où la correction automatique n'est pas possible

Certaines erreurs ne peuvent pas être corrigées automatiquement et nécessitent une régénération complète via le skill kci-rapport :

- **Données financières incohérentes (F1-F7)** : le verificator détecte l'incohérence mais ne connaît pas les données sources (prix annonce, surface, loyer). Il faut relancer kci-rapport avec les bonnes données.
- **Structure HTML cassée** : si le template est corrompu au-delà du simple chercher/remplacer.
- **Contamination inter-offres (R3)** : le mauvais template a été chargé — il faut régénérer avec le bon.
- **Pages blanches / overflow (G8/G9)** : problèmes de mise en page qui nécessitent un recalibrage complet du contenu.

Dans ces cas, indiquer clairement à l'utilisateur : "Cette erreur nécessite une régénération complète — je vais relancer le skill kci-rapport." Puis utiliser le skill kci-rapport pour produire un nouveau rapport en intégrant les corrections identifiées comme contraintes.

---

## Notes importantes

1. **Le verificator ne modifie jamais le rapport original sans correction.** Il produit d'abord le diagnostic, puis corrige dans un fichier séparé (`_corrected` ou `_v2`).

2. **Vérification croisée** : si plusieurs rapports existent pour le même client (49€ + 129€ + 299€), lancer la vérification sur les 3 et activer le check F10 (cohérence inter-offres).

3. **HTML source** : le HTML source est conservé temporairement après la génération d'un rapport KCI. Si disponible, toujours le fournir en plus du PDF — cela permet des vérifications beaucoup plus fines (classes CSS, balises, structure) ET des corrections directes sans régénération.

4. **Seuils de tolérance** : les calculs financiers tolèrent ±1% d'écart pour les arrondis. Les scores tolèrent ±0.5 pour la cohérence avec la moyenne des sous-scores.

5. **Boucle QA max 3 itérations** : après 3 passes de correction sans atteindre 100%, demander l'intervention de l'utilisateur.
