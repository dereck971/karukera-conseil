---
name: Dashboard KPI Mensuel Automatisé
description: "Reporting financier et KPI consolidé pour KCI/ImmoServices/Topo3D - CA, MRR, clients, conversion, SEO, commerciaux, alertes objectifs et historique JSON"
trigger: "KPI|reporting|dashboard|CA|chiffre affaires|MRR|revenue|objectif|alert|SEO|leads|prospects|clients|graphique|rapport|PDF|mensuel|commercial|business|performance"
skills:
  - Data analytics
  - PDF reporting
  - Business intelligence
  - Performance tracking
---

# SKILL: Dashboard KPI Mensuel Automatisé

## Description
Dashboard financier et KPI mensuel qui consolide les données de vente des 3 entités (KCI, ImmoServices971, Topo3D), compare avec les objectifs du business plan et génère un rapport PDF avec graphiques, alertes et historique.

## Métriques Financières

### 1. Chiffre d'Affaires (CA)
- **CA mensuel** par entité
- **CA cumulé** (depuis début année)
- **Croissance** (mois/mois et année/année)
- **Comparaison objectif vs réel**:
  - Rouge si -20% vs objectif
  - Orange si -5% à -20%
  - Vert si >= objectif

### 2. Monthly Recurring Revenue (MRR)
- **MRR actif**: Somme des abonnements actifs (ImmoServices Basic 39€, Premium 99€)
- **MRR additionnel**: Newsletter premium (5€/mois), subscriptions Topo3D
- **Churn rate**: % de résiliations mensuelles
- **Growth rate**: Évolution MRR mois sur mois

### 3. Clients
- **Nombre de clients** par entité
- **Nouveaux clients** ce mois-ci
- **Clients actifs** (au moins 1 achat/12 mois)
- **Résiliations** (churn)
- **Taux de rétention**: (Clients fin mois - nouveaux) / Clients début mois

### 4. Panier Moyen
- **Panier moyen KCI**: (CA KCI) / (Nombre de clients KCI)
- **Panier moyen ImmoServices**: (CA ImmoServices) / (Nombre de clients ImmoServices)
- **Panier moyen Topo3D**: (CA Topo3D) / (Nombre de clients Topo3D)
- **Comparaison mois précédent**

### 5. Taux de Conversion
- **Leads → Clients**: (Nouveaux clients) / (Leads qualifiés) %
- **Visiteurs → Clients**: (Nouveaux clients) / (Visites uniques) %
- **Prospects qualifiés**: Nombre de prospects actuellement en pipeline
- **Délai fermeture moyenne**: Jours entre premier contact et achat

## Objectifs Business Plan

### Année 1 (2026)
- **Objectif CA**: 22 000€
- **Objectif MRR fin année**: 2 000€
- **Objectif clients**: 50
- **Objectif CA par entité**:
  - KCI: 10 000€
  - ImmoServices: 8 000€
  - Topo3D: 4 000€

### Année 2 (2027)
- **Objectif CA**: 75 000€
- **Objectif MRR fin année**: 6 500€
- **Objectif clients**: 200

### Trajectoire Mensuelle
```
Mois 1-3 (Q1): 10% de l'objectif annuel → 1 833€
Mois 4-6 (Q2): 20% de l'objectif annuel → 3 667€
Mois 7-9 (Q3): 35% de l'objectif annuel → 6 417€
Mois 10-12 (Q4): 35% de l'objectif annuel → 6 083€
```

## Métriques SEO et Digital

### 1. Trafic Web
- **Visites mensuelles** (Google Analytics)
- **Visiteurs uniques**
- **Pages vues**
- **Taux de rebond**
- **Durée moyenne de session**

### 2. Content
- **Articles publiés ce mois**: Nombre d'articles blog KCI
- **Total articles**: Cumul depuis lancement
- **Mots-clés classés**: Nombre de KW en position 1-10 Google
- **Positions Google** (mots-clés cibles):
  - KCI Guadeloupe: Position actuelle
  - Architecture devis: Position actuelle
  - Immobilier Guadeloupe: Position actuelle

### 3. Engagement
- **Commentaires blog**
- **Partages réseaux sociaux**
- **Email subscribers**
- **Newsletter open rate**

## Métriques Commerciales

### 1. Leads
- **Leads totaux** (source: formulaires, email, appels)
- **Leads qualifiés** (ont demandé devis ou info détaillée)
- **Leads par source**:
  - Organique (SEO/blog)
  - Annuaire pros
  - Réseaux sociaux
  - Recommandations
  - Campagnes payantes

### 2. Prospects et Pipeline
- **Prospects actifs** (en négociation)
- **Valeur pipeline** (somme des devis en attente)
- **Probabilité de fermeture** par prospect
- **Délai moyen de conversion**

### 3. Clients
- **Nombre de clients** cumulé
- **Clients nouveaux** ce mois
- **Clients récurrents** (2+ achats)
- **VIP clients** (> 500€ lifetime value)

### 4. Annuaire Pros (Topo3D)
- **Listings actifs**
- **Archis inscrites**
- **Populaires** (>100 vues/mois)
- **Churns** (désabonnements)

## Rapport PDF Mensuel

### Structure du Rapport
1. **En-tête**: Logo KCI, titre "KPI Mensuel - Mars 2026", date d'édition
2. **Executive Summary**:
   - CA mensuel vs objectif
   - MRR tendance
   - Alerte KPI en rouge
3. **Section Financière**:
   - Tableau CA détaillé
   - Graphique barres CA par entité
   - Courbe MRR avec tendance
   - Pie chart répartition CA
4. **Section Clients**:
   - Nombre clients par entité
   - Nouveaux vs résiliations
   - Panier moyen évolution
5. **Section Conversion**:
   - Leads → Clients (taux%)
   - Pipeline valeur
   - Délai moyen fermeture
6. **Section SEO/Digital**:
   - Visites mensuelles (graphique ligne)
   - Articles publiés
   - Positions Google (tableau)
7. **Section Alertes**:
   - KPIs rouges: Détail et action recommandée
   - KPIs orange: À surveiller
8. **Comparaison Historique**:
   - Tableau derniers 12 mois
   - Évolution CA par entité
   - Trend MRR

### Alertes Automatiques
```
ROUGE (< 80% objectif mensuel):
- CA < 1 467€ ce mois (objectif 1 833€ Q1)
- MRR < 250€
- Conversion < 5%
→ Recommandation: Relancer leads, lancer campaign marketing

ORANGE (80-100% objectif):
- CA entre 1 467€ et 1 833€
- MRR entre 250€ et 400€
→ Recommandation: Réajuster stratégie légèrement

VERT (> 100% objectif):
- CA > 1 833€
- MRR > 400€
→ Recommandation: Analyser succès et reproduire
```

## Historique et Comparaison

### Fichier d'Historique JSON
```json
{
  "periodes": [
    {
      "mois": "2026-01",
      "date_generation": "2026-02-01",
      "ca_mensuel": 1250.50,
      "ca_cumule": 1250.50,
      "ca_par_entite": {
        "KCI": 650,
        "ImmoServices": 450,
        "Topo3D": 150
      },
      "mrr": 185.00,
      "clients_total": 12,
      "clients_nouveaux": 5,
      "clients_resiles": 0,
      "panier_moyen": 104.21,
      "taux_conversion": 8.5,
      "leads": 59,
      "leads_qualifies": 9,
      "visites_mensuelles": 245,
      "articles_publies": 2,
      "positions_google": {
        "kci_guadeloupe": 15,
        "architecture_devis": 28,
        "immobilier_guadeloupe": 45
      },
      "objectives_vs_real": {
        "ca_objectif": 1833,
        "ca_real": 1250.50,
        "statut": "rouge"
      }
    }
  ]
}
```

### Comparaison Mois par Mois
- **CA YoY**: (CA mois N - CA mois N-12) / CA mois N-12 %
- **MRR évolution**: Graphique courbe MRR derniers 12 mois
- **Client retention**: Graphique ligne nombre clients
- **Taux conversion trend**: Évolution mois sur mois

## Cas d'Usage

### Génération Rapport Mensuel Mars 2026
```
Entrée:
- Date: 2026-03-31 (fin de mois)

Processus:
1. Récupération données:
   - Factures KCI, ImmoServices, Topo3D payées
   - Abonnements actifs ImmoServices
   - Clients nouveaux vs actuels
   - Leads qualifiés
   - Analytics Google

2. Calcul KPIs:
   - CA total mars: 1 850€
   - CA cumulé Q1: 4 200€
   - MRR: 320€
   - Clients: 15
   - Conversion: 9%

3. Comparaison objectifs:
   - CA march vs objectif: 101% ✓ (VERT)
   - MRR vs objectif: 80% (ORANGE)

4. Génération PDF:
   - 8-10 pages avec graphiques
   - Alertes en rouge pour MRR
   - Tableaux comparatifs

5. Stockage historique:
   - Mise à jour reporting-historique.json
   - Archive PDF: reporting-2026-03.pdf
```

### Alerte KPI en Temps Réel
```
Si MRR < 250€ (seuil critique):
1. Email d'alerte à dereck@gmail.com
2. Notification slack (si connecté)
3. Enregistrement dans journal d'alertes
4. Recommandation: "Newsletter premium non assez promue"
```

### Comparaison Annuelle
```
Dashboard montre:
- 2026 vs 2025 (si données existantes)
- Trend de croissance
- Identification des mois faibles
- Saison vs non-saison
```

## Intégrations

### Sources de Données
- **Factures**: Système facturation-auto (JSON)
- **Abonnements**: CRM (liste ImmoServices actifs)
- **Google Analytics**: API Analytics (trafic, visites)
- **Google Search Console**: API Search Console (positions)
- **Leads**: Formulaires web (JSON ou CSV)

### Exports
- **PDF**: Rapport mensuel pour archive
- **CSV**: Données complètes pour Excel
- **JSON**: Historique pour tendances
- **Email**: Rapport auto-envoyé le 1er du mois
- **Dashboard web**: Vue live des KPIs (optionnel)

## Commandes d'Utilisation

```bash
# Générer rapport mensuel
reporting-kpi --generate-monthly --month 2026-03

# Comparer avec objectifs
reporting-kpi --compare-targets --month 2026-03

# Afficher alertes
reporting-kpi --show-alerts --severity all

# Exporter historique
reporting-kpi --export json --format complete

# Générer graphiques
reporting-kpi --graph ca_by_entity --period "2026-01:2026-03"

# Comparer année sur année
reporting-kpi --compare yoy --year 2026

# Projection annuelle
reporting-kpi --forecast --year 2026
```

## Graphiques et Visualisations

### Graphique 1: CA par Entité (Barres)
```
KCI:     [==========] 650€
Immo:    [========] 450€
Topo3D:  [===] 150€
```

### Graphique 2: Évolution MRR (Courbe)
```
Mois 1: 150€ → Mois 2: 185€ → Mois 3: 320€ (↑73% croissance)
```

### Graphique 3: Répartition CA (Pie Chart)
```
KCI: 52% (650€)
ImmoServices: 36% (450€)
Topo3D: 12% (150€)
```

### Graphique 4: Positions Google (Barres)
```
KCI Guadeloupe:      [====] Position 15
Architecture devis:   [============] Position 28
Immobilier Guadeloupe: [====================] Position 45
```

## Configuration

### Seuils d'Alerte
- CA mensuel < 80% objectif → ROUGE
- MRR < 250€ → ORANGE
- Conversion < 5% → ROUGE
- Churn > 10% → ORANGE

### Paramètres Calcul
- **Périodes**: Mois calendaires
- **Décalage paiement**: Considérer paiement J+7
- **Arrondi**: Cent inférieur pour conservatisme
- **MRR**: Somme abonnements actifs début mois

### Paramètres Rapport
- **Format**: A4 paysage (pour graphiques)
- **Couleurs**: Vert KCI (#065f46), or (#d4a017)
- **Font**: Sans-serif (Helvetica)
- **Logos**: KCI, ImmoServices, Topo3D en en-tête

## Notes de Développement

- Utiliser matplotlib ou plotly pour graphiques
- Stocker historique en JSON (append-only)
- Scheduler cron pour génération auto 1er du mois
- APScheduler pour alertes temps réel
- Intégration Google Analytics via API
- Validation données avec Pandas
- Cache pour requêtes API (24h)
- Logs détaillés de chaque génération

---

**Dernier update**: 2026-03-18 | **Version**: 1.0 Beta
