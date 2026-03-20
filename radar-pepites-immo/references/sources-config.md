# Configuration des Sources de Scraping

Ce fichier documente les URLs, filtres et stratégies de requête pour chaque source.

---

## Sources Tier 1 — Scanner à chaque exécution

### LeBonCoin
- **URL base** : `https://www.leboncoin.fr/recherche?category=9&locations=r_25`
- **Filtres utiles** :
  - `&real_estate_type=1` → Maison
  - `&real_estate_type=2` → Appartement
  - `&real_estate_type=3` → Terrain
  - `&real_estate_type=4` → Parking
  - `&real_estate_type=5` → Autre (immeuble, local)
  - `&price=min-max` → Fourchette de prix
  - `&square=min-max` → Surface
  - `&owner_type=private` → Particuliers uniquement
- **Requêtes WebSearch** :
  - `site:leboncoin.fr terrain vente guadeloupe 971`
  - `site:leboncoin.fr maison vente guadeloupe`
  - `site:leboncoin.fr immeuble vente guadeloupe`

### SeLoger
- **URL base** : `https://www.seloger.com/list.htm?projects=2&types=2,1&places=[{ci:971}]`
- **Requêtes WebSearch** :
  - `site:seloger.com vente terrain guadeloupe`
  - `site:seloger.com vente maison guadeloupe`

### PAP (De Particulier à Particulier)
- **URL base** : `https://www.pap.fr/annonce/vente-immobiliere-guadeloupe-g43315`
- **Avantage** : 100% particuliers, pas de commission agence
- **Requêtes WebSearch** :
  - `site:pap.fr vente guadeloupe`
  - `site:pap.fr terrain guadeloupe`

---

## Sources Tier 2 — Scanner si volume Tier 1 insuffisant

### Bienici
- **URL** : `https://www.bienici.com/recherche/achat/guadeloupe-971`
- **Requête** : `site:bienici.com achat guadeloupe`

### Logic-Immo
- **URL** : `https://www.logic-immo.com/vente-immobilier-guadeloupe,16_99.html`
- **Requête** : `site:logic-immo.com vente guadeloupe`

### Green-Acres
- **URL** : `https://www.green-acres.fr/fr/properties/guadeloupe`
- **Note** : bon pour terrains atypiques et grandes surfaces

### Figaro Immobilier
- **URL** : `https://immobilier.lefigaro.fr/annonces/immobilier-vente-guadeloupe.html`

---

## Sources Tier 3 — Scanner hebdomadaire

### Notaires de France
- **URL** : `https://immobilier.notaires.fr/fr/annonces-immobilieres?departement=971`
- **Avantage** : ventes directes, souvent en dessous du marché

### Ventes aux enchères
- **Licitor** : `https://www.licitor.com` (recherche département 971)
- **Agorastore** : `https://www.agorastore.fr` (biens publics)
- **Note** : décotes potentielles de 20-40% mais processus complexe

### Facebook / Réseaux sociaux
- **Groupes** :
  - "Immobilier Guadeloupe 971"
  - "Vente terrain Guadeloupe"
  - "BTP Guadeloupe 971"
  - "Achat/Vente Maison Guadeloupe"
- **Requête** : `facebook.com immobilier vente guadeloupe`

---

## Stratégie de requêtes par type de bien

### Terrains (priorité haute — meilleur potentiel de marge)

```
Requête 1 : "terrain constructible vente guadeloupe 971"
Requête 2 : "terrain à bâtir {commune_prioritaire} guadeloupe"
Requête 3 : "parcelle constructible guadeloupe pas cher"
Requête 4 : "terrain viabilisé vente 971"
Requête 5 : "terrain vue mer guadeloupe vente"
```

### Maisons à rénover (bon potentiel de plus-value)

```
Requête 1 : "maison à rénover vente guadeloupe"
Requête 2 : "maison travaux guadeloupe pas cher"
Requête 3 : "villa ancienne vente {commune} guadeloupe"
Requête 4 : "maison créole à restaurer guadeloupe"
```

### Immeubles de rapport (rendement locatif)

```
Requête 1 : "immeuble de rapport vente guadeloupe"
Requête 2 : "immeuble locatif guadeloupe 971"
Requête 3 : "local commercial vente guadeloupe"
Requête 4 : "résidence à vendre guadeloupe"
```

### Ventes spéciales (décotes maximales)

```
Requête 1 : "vente aux enchères immobilier guadeloupe 2026"
Requête 2 : "vente judiciaire guadeloupe"
Requête 3 : "bien immobilier bradé guadeloupe"
Requête 4 : "succession vente urgente guadeloupe"
```

---

## Fréquence de scan recommandée

| Mode | Sources | Fréquence | Temps estimé |
|------|---------|-----------|-------------|
| Quotidien (auto) | Tier 1 | Tous les jours 7h | 5-10 min |
| Hebdomadaire (auto) | Tier 1+2 | Lundi 7h | 15-20 min |
| Mensuel (auto) | Tier 1+2+3 | 1er du mois | 30-45 min |
| Manuel (on-demand) | Selon demande | À la demande | Variable |

---

## Gestion du rate limiting

- Ne pas lancer plus de 10 requêtes WebSearch en parallèle
- Espacer les requêtes WebFetch de 2-3 secondes
- Si une source renvoie une erreur (429, 403), la noter et passer à la suivante
- Prioriser les requêtes WebSearch (plus de résultats, moins de blocage) sur WebFetch direct
