# Intégration Notion — Radar Pépites KCI

## Database "🔍 Radar Pépites KCI"

### Recherche / Création

Au premier scan, le skill doit :
1. Chercher la database avec `notion-search` : query "Radar Pépites KCI"
2. Si elle n'existe pas, la créer avec `notion-create-database` dans le workspace Notion de Dereck

### Schéma de la database

| Propriété | Type Notion | Description |
|-----------|------------|-------------|
| Titre annonce | `title` | Titre de l'annonce (champ principal) |
| Score KCI | `number` | Score final /10 (format: nombre, 1 décimale) |
| Verdict | `select` | Options: "🔥 PÉPITE EXCEPTIONNELLE", "⭐ TRÈS ATTRACTIF", "✅ INTÉRESSANT" |
| Commune | `select` | Les 32 communes de Guadeloupe |
| Prix | `number` | Prix en € (format: number avec €) |
| Surface | `number` | Surface en m² |
| Prix/m² | `number` | Prix au m² calculé |
| Type bien | `select` | Options: "Terrain", "Maison", "Immeuble", "Local", "Appartement" |
| URL annonce | `url` | Lien direct vers l'annonce |
| Date détection | `date` | Date à laquelle le radar a trouvé l'annonce |
| Statut | `select` | Options: "🆕 Nouveau", "📋 En étude", "📄 Rapport commandé", "🏠 Visité", "❌ Écarté", "✅ Acquis" |
| Notes | `rich_text` | Commentaires libres, raison du score, alertes |
| Scores détaillés | `rich_text` | Format: "Prix: X/10 | Emplacement: X/10 | Potentiel: X/10 | Économie: X/10 | Risque: X/10 | Liquidité: X/10" |
| Source | `select` | Options: "LeBonCoin", "SeLoger", "PAP", "Bienici", "Notaires", "Enchères", "Facebook", "Autre" |
| Vendeur | `select` | Options: "Particulier", "Agence", "Inconnu" |
| Action recommandée | `rich_text` | Texte de recommandation du scoring engine |
| Confiance | `select` | Options: "Élevée", "Moyenne", "Faible" |

### Workflow Notion

#### À chaque scan :
1. Récupérer les entrées existantes (pour éviter les doublons)
2. Pour chaque pépite ≥ 8/10 :
   - Vérifier si l'URL existe déjà dans la database
   - Si oui : mettre à jour le score si changement de prix
   - Si non : créer une nouvelle entrée avec statut "🆕 Nouveau"

#### Vues suggérées (à créer avec `notion-create-view`) :

| Vue | Type | Filtre | Tri |
|-----|------|--------|-----|
| "Pépites du jour" | Table | Date = aujourd'hui | Score décroissant |
| "Top pépites" | Table | Score ≥ 9.0 | Score décroissant |
| "En cours d'étude" | Table | Statut = "En étude" | Date détection |
| "Par commune" | Board | Groupé par Commune | Score décroissant |
| "Galerie" | Gallery | Score ≥ 8.0 | Date décroissant |

---

## Lien avec la page Journal Écosystème

Quand une pépite 9+/10 est détectée, ajouter une entrée dans la page journal de l'écosystème KCI :

**Page Notion** : `3286ce17-1d41-815f-bc85-e36225c7b1fd` (📔 Journal Écosystème KCI)

Format de l'entrée :
```
### [date] — 🔥 Pépite détectée par le Radar
- **Entité** : KCI
- **Bien** : [titre annonce] — [commune]
- **Score** : [X]/10
- **Prix** : [X] €
- **Action** : [recommandation]
- **Lien** : [URL annonce]
```

---

## Lien avec le Snapshot Écosystème

Inclure dans le snapshot écosystème (page `3286ce17-1d41-81f4-a963-e70736d2678a`) une section :

```
### 🔍 Radar Pépites
- Dernier scan : [date]
- Pépites actives (non écartées) : [N]
- Top pépite : [titre] — [score]/10 — [commune]
- En étude : [N]
```

---

## Alerte Gmail pour les 9+/10

Utiliser `gmail_create_draft` pour créer un brouillon d'alerte :

- **To** : dereck.rauzduel@gmail.com
- **Subject** : `🔥 PÉPITE KCI {score}/10 — {commune} — {prix}€`
- **Body** (HTML) :
```html
<h2>🔥 Pépite détectée par le Radar KCI</h2>
<p><strong>Score :</strong> {score}/10 — {verdict}</p>
<p><strong>Bien :</strong> {titre}</p>
<p><strong>Commune :</strong> {commune}, Guadeloupe</p>
<p><strong>Prix :</strong> {prix} €</p>
<p><strong>Surface :</strong> {surface} m²</p>
<p><strong>Prix/m² :</strong> {prix_m2} € (médiane commune : {median} €)</p>
<hr>
<h3>Pourquoi c'est une pépite :</h3>
<ul>
{scores_details_html}
</ul>
<hr>
<p><strong>👉 Action :</strong> {action_recommandee}</p>
<p><a href="{url_annonce}">Voir l'annonce →</a></p>
<hr>
<p style="color:gray;font-size:12px;">
Détecté automatiquement par le Radar Pépites KCI<br>
Karukera Conseil Immobilier — karukera-conseil.com
</p>
```
