---
name: scraper-artisans-971
description: "Recherche et constitution de base de données de professionnels du bâtiment et de l'immobilier en Guadeloupe. Utilise ce skill dès que l'utilisateur veut : trouver des artisans, constituer un annuaire, scraper des pros du BTP, enrichir sa base de données de professionnels, chercher des plombiers/maçons/électriciens/agents immo en Guadeloupe, ou toute demande de collecte de données sur les entreprises du bâtiment et de l'immobilier aux Antilles. S'applique aussi quand l'utilisateur dit 'cherche tous les artisans', 'remplis l'annuaire', 'trouve les pros', 'scrape les pages jaunes', 'base de données BTP 971'. Couvre toutes les communes de Guadeloupe et tous les corps de métier liés au bâtiment et à l'immobilier."
---

# Scraper Artisans & Pros Immo-BTP Guadeloupe

## Objectif

Ce skill recherche systématiquement les professionnels du bâtiment et de l'immobilier en Guadeloupe sur toutes les sources accessibles, puis compile les résultats dans une base de données structurée (CSV + Excel).

Le but est de constituer l'annuaire le plus complet possible des artisans, entreprises BTP, agents immobiliers, notaires, architectes et tous les professionnels liés à l'immobilier et à la construction en Guadeloupe.

## Sources à explorer (par ordre de priorité)

### Tier 1 — Sources principales (les plus riches)
1. **Google Search / Google Maps** — Recherche par "{métier} {commune} Guadeloupe" pour chaque combinaison métier × commune
2. **Pages Jaunes (pagesjaunes.fr)** — Annuaire le plus complet en France, filtrer par département 971
3. **Societe.com** — Données entreprises, SIRET, dirigeants

### Tier 2 — Sources complémentaires
4. **Facebook** — Groupes "BTP Guadeloupe", "Artisans 971", pages pros
5. **Instagram** — Hashtags #btpguadeloupe #artisan971 #constructionguadeloupe
6. **LinkedIn** — Recherche par poste + localisation Guadeloupe
7. **Annuaire CCI Guadeloupe** (cci-iles-guadeloupe.com)
8. **Chambre des Métiers et de l'Artisanat** (cma-guadeloupe.fr)

### Tier 3 — Sources de niche
9. **QualiBlue** — Artisans BTP qualifiés aux Antilles
10. **Ordre des Architectes** — Annuaire officiel
11. **Notaires de France** (notaires.fr) — Annuaire notaires 971
12. **Le Bon Coin** — Annonces services/BTP en Guadeloupe
13. **Kompass / Europages** — Annuaires d'entreprises

## Catégories de professionnels à rechercher

### Bâtiment — Gros œuvre
- Maçons / Maçonnerie générale
- Charpentiers
- Couvreurs / Étanchéité
- Terrassiers
- Béton armé / Ferraillage
- Démolition
- Fondations / Micropieux

### Bâtiment — Second œuvre
- Plombiers
- Électriciens
- Peintres
- Carreleurs
- Menuisiers (bois, aluminium, PVC)
- Plaquistes / Plâtriers
- Serruriers / Métalliers
- Vitriers / Miroitiers
- Sols (parquet, résine, moquette)

### Énergie & Technique
- Climatisation / Froid
- Panneaux solaires / Photovoltaïque
- Chauffe-eau solaire
- Domotique / Alarmes
- Assainissement

### Extérieur & Aménagement
- Paysagistes
- Piscinistes
- Clôtures / Portails
- Terrasses / Pergolas
- VRD (Voirie et Réseaux Divers)

### Architecture & Conception
- Architectes DPLG / HMONP / DE
- Bureaux d'études techniques (BET)
- Bureaux d'études thermiques
- Dessinateurs / Projeteurs
- Décorateurs / Architectes d'intérieur
- Cuisinistes

### Immobilier
- Agents immobiliers
- Mandataires immobiliers
- Promoteurs immobiliers
- Marchands de biens
- Chasseurs immobiliers
- Conciergeries / Gestion locative

### Juridique & Finance
- Notaires
- Géomètres-experts
- Diagnostiqueurs immobiliers
- Courtiers en crédit immobilier
- Assureurs (construction, habitation)
- Experts en bâtiment

## Communes de Guadeloupe (32 communes)

Rechercher dans TOUTES ces communes :
Les Abymes, Anse-Bertrand, Baie-Mahault, Baillif, Basse-Terre, Bouillante, Capesterre-Belle-Eau, Capesterre-de-Marie-Galante, Deshaies, Gourbeyre, Goyave, Grand-Bourg, Lamentin, Le Gosier, Le Moule, Morne-à-l'Eau, Petit-Bourg, Petit-Canal, Pointe-à-Pitre, Pointe-Noire, Port-Louis, Saint-Claude, Saint-François, Saint-Louis, Sainte-Anne, Sainte-Rose, Terre-de-Bas, Terre-de-Haut, Trois-Rivières, Vieux-Fort, Vieux-Habitants, La Désirade

## Champs à collecter pour chaque professionnel

| Champ | Type | Obligatoire | Source |
|-------|------|-------------|--------|
| nom_entreprise | texte | Oui | Toutes |
| nom_dirigeant | texte | Non | Societe.com, LinkedIn |
| categorie_principale | texte | Oui | Déduit du métier |
| sous_categorie | texte | Oui | Déduit de la recherche |
| adresse | texte | Non | Google, Pages Jaunes |
| commune | texte | Oui | Déduit de l'adresse |
| code_postal | texte | Non | Pages Jaunes |
| telephone | texte | Oui (si dispo) | Google, Pages Jaunes |
| email | texte | Non | Site web, Pages Jaunes |
| site_web | URL | Non | Google |
| facebook | URL | Non | Facebook |
| instagram | URL | Non | Instagram |
| google_maps_url | URL | Non | Google Maps |
| note_google | nombre | Non | Google Maps |
| nb_avis_google | nombre | Non | Google Maps |
| siret | texte | Non | Societe.com |
| source | texte | Oui | D'où vient la donnée |
| date_collecte | date | Oui | Automatique |
| statut_verification | texte | Oui | "non vérifié" par défaut |

## Méthode de travail

### Étape 1 — Recherche systématique

Pour chaque combinaison **catégorie × commune**, effectuer une recherche web. La requête type est :
```
"{sous_categorie} {commune} Guadeloupe"
```

Exemples :
- "plombier Les Abymes Guadeloupe"
- "architecte Saint-François Guadeloupe"
- "agent immobilier Le Gosier Guadeloupe"

**Prioriser les communes les plus peuplées d'abord** : Les Abymes, Baie-Mahault, Le Gosier, Sainte-Anne, Pointe-à-Pitre, Petit-Bourg, Saint-François, Le Moule, Capesterre-Belle-Eau, Sainte-Rose.

Pour les annuaires (Pages Jaunes, CCI), utiliser les URL directes avec filtre département 971.

### Étape 2 — Extraction des données

Pour chaque résultat trouvé :
1. Extraire les champs disponibles (nom, adresse, téléphone, etc.)
2. Dédupliquer : vérifier que le professionnel n'est pas déjà dans la base (même nom + même commune = probable doublon)
3. Catégoriser : assigner la catégorie principale et sous-catégorie
4. Noter la source

### Étape 3 — Enrichissement

Pour les professionnels trouvés, essayer d'enrichir avec :
- Recherche du site web (si pas trouvé)
- Recherche de la page Facebook/Instagram
- Vérification du SIRET sur societe.com (si le nom est trouvé)
- Récupération de la note Google si disponible

### Étape 4 — Compilation

Produire deux fichiers :

**1. CSV brut** (`artisans_guadeloupe_971.csv`)
- Toutes les colonnes, séparateur virgule, encodage UTF-8
- Une ligne par professionnel
- Trié par catégorie puis commune

**2. Excel formaté** (`artisans_guadeloupe_971.xlsx`)
- **Onglet "Tous les pros"** : base complète avec filtres auto
- **Un onglet par catégorie principale** : sous-ensemble filtré
- **Onglet "Statistiques"** : nombre de pros par catégorie, par commune, taux de complétude des champs
- Mise en forme : en-têtes en gras, colonnes ajustées, couleurs alternées
- Congeler la première ligne (en-têtes)

### Étape 5 — Rapport de collecte

Produire un résumé en fin de tâche :
- Nombre total de professionnels trouvés
- Répartition par catégorie
- Répartition par commune (top 10)
- Taux de complétude par champ (% avec téléphone, % avec email, etc.)
- Sources utilisées et nombre de résultats par source
- Doublons éliminés

## Stratégie de recherche efficace

Comme la recherche exhaustive de toutes les combinaisons prendrait énormément de temps, adopter cette approche pragmatique :

1. **Phase 1 — Annuaires globaux** : commencer par les Pages Jaunes et Google avec des requêtes larges par catégorie + "Guadeloupe 971" (pas par commune). Ça donne le gros du volume rapidement.

2. **Phase 2 — Communes principales** : pour les 10 communes les plus peuplées, faire des recherches spécifiques par métier pour attraper les artisans locaux qui n'apparaissent pas dans les résultats globaux.

3. **Phase 3 — Sources de niche** : parcourir les annuaires spécialisés (CCI, Chambre des Métiers, ordres professionnels) pour les catégories qui s'y prêtent.

4. **Phase 4 — Réseaux sociaux** : rechercher les hashtags et groupes Facebook pour trouver les artisans qui ne sont que sur les réseaux sociaux (fréquent en Guadeloupe).

## Limites et précautions

- **RGPD** : ne collecter que des données professionnelles publiques (pas de données personnelles privées)
- **Respect des CGU** : ne pas surcharger les sites avec trop de requêtes automatisées
- **Qualité > quantité** : mieux vaut 500 fiches complètes que 2 000 fiches avec juste un nom
- **Dédoublonnage** : une même entreprise peut apparaître sur Google, Pages Jaunes et Facebook — la compter une seule fois
- **Données périmées** : certaines entreprises trouvées peuvent avoir fermé — le champ "statut_verification" reste à "non vérifié" jusqu'à confirmation manuelle

## Exemple d'utilisation

L'utilisateur dit : "Cherche tous les plombiers de Guadeloupe"

→ Le skill lance une recherche sur Google, Pages Jaunes, Facebook pour "plombier" dans chaque commune majeure de Guadeloupe, compile les résultats, déduplique, et produit un CSV + Excel avec tous les plombiers trouvés.

L'utilisateur dit : "Remplis ma base avec tous les artisans BTP de Baie-Mahault"

→ Le skill lance une recherche ciblée sur Baie-Mahault pour toutes les catégories BTP (gros œuvre + second œuvre), compile et produit les fichiers.

L'utilisateur dit : "Trouve tous les pros immo et BTP de Guadeloupe pour mon annuaire"

→ Le skill lance la recherche complète sur toutes les catégories et toutes les communes, en suivant la stratégie par phases (annuaires globaux → communes principales → sources de niche → réseaux sociaux).
