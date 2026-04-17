# Topo3D Antilles — Grille tarifaire 2026

**Émis par** : Karukera Conseil Immobilier — contact@karukera-conseil.com
**Validité** : 17/04/2026 — 31/12/2026

> Tous les prix sont **HT, en euros**. KCI est en micro-entreprise — pas de TVA collectée actuellement (régime franchise en base).

---

## Offres standard

### 1. Démo (7 500 € HT)

**Cible** : commune de <5 000 habitants, ou test d'opportunité avant engagement plus large.

Inclus :
- Carte 3D MapLibre GL JS pour 1 commune
- Couches IGN de base : orthophoto, cadastre, plan IGN, LiDAR HD (MNT/MNS/MNH), zones de risques (PPR), monuments historiques
- Couche défrichement DAAF (KaruGéo)
- Hydrographie IGN
- 5 vues prédéfinies (centre-bourg + 4 quartiers clés)
- 1 visite cinématique automatique
- 1 réunion de présentation (2h, sur site ou en visio)
- Hébergement Vercel (statique, pas de coût récurrent à votre charge)
- Domaine fourni : `topo3d-{commune}.karukera-conseil.com` (ou personnalisé sur demande)

Hors champ :
- Scoring abandon (offre Avancée)
- Module fiscal (offre Standard et plus)
- Données spécifiques communales

**Délai** : 1-2 semaines après commande.

---

### 2. Standard (15 000 € HT)

Inclus tout l'offre Démo + :
- **Module fiscal** : ingestion d'un fichier CSV de votre service fiscal (TFB, TFNB, CFE, valeur locative par parcelle)
- Visualisation au clic : taxes dues, sous-fiscalisation détectée, ratio TFB/VL
- PPRN Lizmap officiel de votre commune (si disponible — sinon PPR IGN générique)
- 8-12 vues prédéfinies (selon la taille de la commune)
- 2 visites cinématiques (vue d'ensemble + tour fiscal)
- Maintenance 12 mois inclus (mises à jour IGN/KaruGéo, support email <48h)
- Formation 2h des agents communaux
- 1 mise à jour des données fiscales annuelle

**Délai** : 2-3 semaines après réception du CSV fiscal.

---

### 3. Avancée (30 000 € HT)

Inclus tout l'offre Standard + :
- **Scoring abandon des bâtiments** : croisement BDTOPO IGN + DVF Cerema → identification automatique des bâtiments dégradés ou abandonnés
- **Détection parcelles vacantes** : potentiel de densification
- **Heatmap d'abandon** par quartier
- **Filtres avancés** : par usage, par score, par zone PLU
- Hébergement dédié (instance VPS dédiée à la commune)
- 4 mises à jour annuelles (trimestrielles)
- Support prioritaire (<24h)
- Tableau de bord public (option) : vue simplifiée des indicateurs clés pour les administrés

**Délai** : 3-4 semaines.

---

### 4. EPCI (60 000 € HT)

Pack pour intercommunalité de 3 à 7 communes du même territoire (ex : Cap Excellence, CANBT, CANGT).

Inclus :
- Pack offre Avancée pour 5 communes (jusqu'à 7 sur devis)
- **Dashboard intercommunal** : agrégation des indicateurs (population, parcelles vacantes, score d'abandon moyen, fiscalité agrégée)
- Comparaison inter-communes
- Vue cartographique unifiée à l'échelle EPCI
- Formation 1 jour des agents EPCI
- 4 mises à jour annuelles
- Hébergement EPCI dédié

**Note** : ce tarif reste **sous le seuil de 60 000 € HT** = procédure adaptée gré à gré possible sans appel d'offres formel (article R2122-8 du Code de la commande publique).

**Délai** : 4-6 semaines.

---

## Options complémentaires (à la carte)

| Option | Prix HT | Description |
|---|---|---|
| Couche personnalisée (GeoJSON fourni par la commune) | 1 500 € / couche | Intégration d'un fichier SIG communal (ex : voies privées, zones de stationnement, projets en cours) |
| Mise à jour ponctuelle des données fiscales | 1 000 € | Hors abonnement annuel |
| Vue prédéfinie supplémentaire | 200 € / vue | Au-delà des vues incluses |
| Visite cinématique sur-mesure | 800 € / tour | Scénario fourni par la commune (ex : tour des projets ANRU, tour des monuments) |
| Présentation en réunion publique | 1 200 € / session | Sur site, avec opérateur KCI |
| Hébergement dédié supplémentaire | 600 € / an | Si vous voulez votre propre domaine |
| Maintenance annuelle (post offre) | 2 500 € / an | Mises à jour IGN/KaruGéo, support |

---

## Modalités

| Item | Détail |
|---|---|
| **Acompte** | 30 % à la commande |
| **Solde** | 70 % à la livraison (carte opérationnelle, recette signée par la mairie) |
| **Délai de paiement** | 30 jours après facture (mandatement public) |
| **Mode de paiement** | Virement SEPA, ou mandat-cash |
| **Devise** | EUR uniquement |
| **Garantie** | 12 mois sur le bon fonctionnement (incluant correctifs et mises à jour des couches IGN/KaruGéo) |
| **Propriété intellectuelle** | KCI conserve la propriété du code source (template Topo3D). La commune est titulaire de ses données, et utilisatrice de la carte sans limite de durée. |

---

*Pour toute demande sur-mesure, contactez : contact@karukera-conseil.com*
