---
name: Facturation Automatique KCI/ImmoServices/Topo3D
description: "Générateur de devis et factures professionnels pour l'écosystème - TVA micro-entreprise et SAS, numérotation séquentielle, calculs automatiques, export comptable et relance impayés"
trigger: "facturation|devis|facture|invoice|numérotation|TVA|remise|relance|impayé|export|comptabilité|KCI|ImmoServices|Topo3D|paiement"
skills:
  - PDF generation
  - Financial calculations
  - Accounting
  - Business automation
---

# SKILL: Facturation Automatique Multi-Entités

## Description
Générateur automatique de devis et factures professionnels et conformes pour l'écosystème KCI, ImmoServices971 et Topo3DGuadeloupe. Gère la micro-entreprise (Art. 293B CGI) et la transition vers le régime SAS avec TVA DOM.

## Fonctionnalités Principales

### 1. Génération de Devis PDF
- **Charte graphique KCI**: Vert foncé (#065f46), or (#d4a017)
- **Logo entreprise**: Intégration automatique de la marque
- **Format**: A4 professionnel avec références
- **Validité**: 30 jours (modifiable)
- **Tarification dynamique par entité**:
  - KCI: Essentiel (49€), Complet (129€), Premium (299€)
  - ImmoServices971: Basic (39€/mois), Premium (99€/mois)
  - Topo3D: Simple (79€), Détaillé (149€), Premium (199€)

### 2. Génération de Factures PDF
- **Numérotation séquentielle automatique**:
  - KCI-2026-001, KCI-2026-002...
  - IMMO-2026-001, IMMO-2026-002...
  - TOPO-2026-001, TOPO-2026-002...

- **Mentions obligatoires Micro-Entreprise**:
  - "TVA non applicable, art. 293 B du CGI"
  - SIREN: 102517976
  - Code APE: 6831Z (Activités des architectes)
  - Adresse: Rue de Genève, 74240 Gaillard
  - Email: dereck.rauzduel@gmail.com

- **Mentions obligatoires SAS (Phase 2)**:
  - TVA 8.5% régime DOM
  - Numéro RCS (une fois immatriculé)
  - Capital social
  - Gérant: Dereck Rauzduel — Architecte EPFL

### 3. Calculs Automatiques
- **HT (Montant Hors Taxes)**
- **Remises** (montant fixe ou pourcentage)
- **TVA** (micro-entreprise: 0% / SAS: 8.5% DOM)
- **TTC (Total Toutes Charges)**
- **Arrondi** au centime supérieur
- **Modalités de paiement**: 30 jours date de facturation

### 4. Gestion des Paiements
- **Registre JSON** des paiements:
  ```json
  {
    "factures": [
      {
        "numero": "KCI-2026-001",
        "date": "2026-03-18",
        "client": "Client Name",
        "montant_ttc": 149.99,
        "statut": "impayée|partiellement_payée|payée",
        "date_paiement": null,
        "montant_paye": 0,
        "notes": ""
      }
    ]
  }
  ```

### 5. Relance Automatique des Impayés
- **J+7**: Relance email courtoise
- **J+15**: Deuxième relance plus ferme
- **J+30**: Mise en demeure avec délai de 8 jours
- **Templates** pré-rédigés et personnalisables
- **Historique** de chaque relance enregistré

### 6. Export Comptable
- **Format CSV** des factures pour logiciel comptable:
  - Numéro facture
  - Date
  - Client
  - Montant HT
  - TVA (0% ou 8.5%)
  - Montant TTC
  - Statut paiement
  - Date paiement

## Cas d'Usage

### Génération d'un devis KCI Complet
```
Entrée utilisateur:
- Client: "Architecture Moderne SARL"
- Service: KCI Complet
- Montant: 129€
- Remise: 10% (12,90€)
- Date validité: 30 jours

Résultat:
- Devis PDF: KCI-DEVIS-2026-001.pdf
- Montant HT: 129€
- TVA: 0€ (micro-entreprise)
- TTC: 129€
- Sauvegarde dans registre
```

### Génération d'une facture et suivi de paiement
```
Entrée:
- Conversion du devis KCI-2026-001 en facture
- Date: 2026-03-18
- Client payé J+5: 129€

Processus:
1. Génération facture PDF: KCI-2026-001.pdf
2. Mise à jour registre: statut = "payée"
3. Enregistrement date paiement: 2026-03-23
4. Export CSV pour comptable
```

### Relance automatique
```
Facture KCI-2026-002 impayée J+7:
1. Email de relance courtoise envoyé
2. Enregistrement: tentative de relance
3. Date rappel J+15 programmée automatiquement
```

## Fichiers Générés

### Structure de stockage
```
/facturation/
├── devis/
│   ├── KCI-DEVIS-2026-001.pdf
│   ├── IMMO-DEVIS-2026-001.pdf
│   └── TOPO-DEVIS-2026-001.pdf
├── factures/
│   ├── KCI-2026-001.pdf
│   ├── IMMO-2026-001.pdf
│   └── TOPO-2026-001.pdf
├── registre_paiements.json
├── factures.csv
└── relances/
    ├── KCI-2026-001-relance-j7.html
    ├── KCI-2026-001-relance-j15.html
    └── KCI-2026-001-relance-j30.html
```

## Configuration

### Paramètres Entreprise
- **Nom**: Dereck Rauzduel — Architecte EPFL
- **SIREN**: 102517976
- **Code APE**: 6831Z
- **Adresse**: Rue de Genève, 74240 Gaillard
- **Email**: dereck.rauzduel@gmail.com
- **Téléphone**: (À ajouter)
- **Régime**: Micro-entreprise (évolution SAS)

### Paramètres PDF
- **Couleur primaire**: #065f46 (vert foncé KCI)
- **Couleur accent**: #d4a017 (or)
- **Font**: Helvetica ou similaire sans-serif
- **Format**: A4 (210 x 297 mm)
- **Marges**: 2 cm

## Commandes d'Utilisation

```bash
# Générer un devis
facturation-auto --type devis --entite KCI --service Complet --client "Nom Client" --montant 129

# Générer une facture
facturation-auto --type facture --numero KCI-2026-001 --client "Nom Client" --montant 129 --paiement "date"

# Relancer un impayé
facturation-auto --action relance --numero KCI-2026-002 --jour 7

# Exporter pour comptable
facturation-auto --export csv --format "date|numero|client|ht|tva|ttc|statut"

# Mettre à jour un paiement
facturation-auto --update paiement --numero KCI-2026-001 --montant 129 --date 2026-03-23

# Générer rapport impayés
facturation-auto --rapport impayes --periode "2026-01-01:2026-03-31"
```

## Intégrations

- **Logiciels comptables**: Export CSV compatible avec tous les logiciels (Sage, Ciel, FastGestion)
- **Email**: Envoi automatique des devis, factures et relances
- **Calendrier**: Synchronisation des rappels J+7, J+15, J+30
- **CRM**: Mise à jour automatique du statut client (payeur/impayé)

## Conformité Légale

### Micro-Entreprise (Régime actuel)
- Seuil: CA < 72 600€/an
- TVA: Non applicable, art. 293 B du CGI
- Comptabilité: Registre simple
- Obligation: SIREN visible

### SAS (Phase 2 - Evolution)
- TVA appliquée: 8.5% pour les DOM
- RCS: Enregistrement au tribunal
- Capital social: À définir
- Comptabilité: Régime réel

## Notes de Développement

- Utiliser ReportLab ou WeasyPrint pour PDF Python
- Stocker registre de paiements en JSON
- Implémenter scheduler pour relances automatiques (APScheduler)
- Valider montants avec Decimal (pas float)
- Logs complets des générations et modifications
- Backup automatique des fichiers (weekly)

---

**Dernier update**: 2026-03-18 | **Version**: 1.0 Beta
