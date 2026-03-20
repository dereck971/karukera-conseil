---
title: prospection-annuaire
description: "Automatise la prospection et conversion des pros BTP/Immo pour l'annuaire ImmoServices971 — 5 emails + WhatsApp, scoring intelligent, suivi détaillé. De gratuit à 99€/mois."
author: Dereck Rauzduel
category: growth
tags:
  - prospection
  - email-automation
  - crm
  - conversion
  - btp
  - immobilier
  - guadeloupe
commands:
  - name: launch-campaign
    description: "Lance une campagne de prospection complète pour une liste de pros"
  - name: send-email-sequence
    description: "Envoie la séquence d'emails au jour J approprié"
  - name: send-whatsapp-message
    description: "Envoie un message WhatsApp aux non-répondants"
  - name: calculate-scores
    description: "Calcule le score de prospection pour tous les pros"
  - name: generate-report
    description: "Génère le reporting des conversions et revenue"
dependencies:
  - scraper-artisans-971
---

# Prospection Annuaire ImmoServices971

## Vue d'ensemble

Ce skill automatise l'acquisition et conversion des professionnels BTP/Immobilier pour l'annuaire ImmoServices971. Il orchestre une séquence de 5 emails + 2 messages WhatsApp, calcule un score de prospection intelligent, et assure un suivi détaillé des conversions.

**Objectif:** Transformer les données brutes du scraper en pipeline de vente automatisé, maximisant le taux de conversion à chaque étage (gratuit → Basic → Premium).

---

## 1. Séquence de prospection – 5 emails

### Email 1 — J+0 | "Votre fiche pro gratuite est en ligne"

**De:** Dereck Rauzduel — Fondateur ImmoServices971 | Architecte EPFL
**Objet:** Votre fiche pro ImmoServices971 ✓

```
Bonjour [NOM_PRO],

Bonne nouvelle : j'ai créé votre fiche gratuite sur ImmoServices971, l'annuaire spécialisé BTP/Immobilier de la Guadeloupe.

Vous êtes maintenant référencé dans notre base avec vos informations professionnelles :
👉 [LIEN_VERS_FICHE_GRATUITE]

Votre fiche gratuite comprend :
✓ Présentation de votre métier
✓ Localisation (commune)
✓ Contact direct (email + téléphone)
✓ Note et avis des clients
✓ Visibilité auprès des chercheurs locaux

Les clients de la Guadeloupe vous cherchent déjà. Assurez-vous qu'ils vous trouvent facilement !

Besoin d'aide pour compléter votre profil ? Je suis à votre disposition.

Cordialement,
Dereck Rauzduel
Fondateur ImmoServices971 | Architecte EPFL
```

---

### Email 2 — J+3 | "Professionnels actifs recherchent un [métier] à [commune]"

**De:** Dereck Rauzduel — Fondateur ImmoServices971 | Architecte EPFL
**Objet:** [COMMUNE] : [X] recherches pour un [MÉTIER] cette semaine

```
Bonjour [NOM_PRO],

Chiffres réels de la semaine sur ImmoServices971 :

📍 À [COMMUNE], [X] personnes ont cherché un [MÉTIER]
🔍 [Y] clics sur la catégorie « [MÉTIER] »
📞 [Z] demandes de contact enregistrées

Ces chiffres ne sont que les débuts — notre annuaire gagne en traction chaque semaine.

Votre fiche gratuite est visible, mais elle est en page 3. Si vous étiez en tête de liste avec un badge « Vérifié », vous capteriez ces demandes avant vos concurrents.

C'est justement ce que fait la fiche Premium :
⭐ Badge « Professionnel vérifié »
📌 Position en tête des résultats
📊 Statistiques détaillées (clics, impressions, conversions)
💬 Messagerie intégrée

Intéressé pour essayer pendant 1 mois ? Répondez à ce message — j'ai une offre spéciale pour vous.

Cordialement,
Dereck Rauzduel
Fondateur ImmoServices971 | Architecte EPFL
```

---

### Email 3 — J+7 | "1 mois gratuit sur votre fiche Premium"

**De:** Dereck Rauzduel — Fondateur ImmoServices971 | Architectic EPFL
**Objet:** Essai gratuit Premium 30 jours — Fiche en tête + Badge ⭐

```
Bonjour [NOM_PRO],

Je vous propose un essai sans engagement de 30 jours sur la fiche Premium ImmoServices971.

Pendant 1 mois, vous bénéficierez de :

✅ Badge « Professionnel Vérifié » (augmente la confiance des clients)
✅ Position en tête des résultats de recherche (avant vos concurrents)
✅ Statistiques détaillées : clics, impressions, contacts qualifiés
✅ Messagerie directe intégrée
✅ Boost de visibilité dans les communes alentour

Après 30 jours, vous continuerez à bénéficier de la fiche gratuite (aucune charge automatique).

Cet essai est réservé aux 100 premiers inscrits. Êtes-vous intéressé ?

👉 Cliquez ici pour activer votre essai gratuit : [LIEN_ACTIVATION_ESSAI]

Ou répondez directement à ce message — je serai ravi de répondre à vos questions.

Cordialement,
Dereck Rauzduel
Fondateur ImmoServices971 | Architecte EPFL
```

---

### Email 4 — J+14 | "Votre essai Premium expire dans 7 jours"

**De:** Dereck Rauzduel — Fondateur ImmoServices971 | Architecte EPFL
**Objet:** Avant de perdre vos avantages Premium... (expire le J+21)

```
Bonjour [NOM_PRO],

Votre essai Premium ImmoServices971 expire dans 7 jours.

Voici ce que [TÉMOIGNAGE_PRO_SIMILAIRE] a obtenu en restant Premium :
« En 2 mois, j'ai reçu 12 demandes de clients. Ma fiche en tête a vraiment fait la différence. »
— [NOM_TÉMOIGNAGE], [MÉTIER], [COMMUNE]

Résumé de votre essai (J+7 à J+14) :
📊 [X] clics sur votre fiche
📌 [Y] impressions
💬 [Z] demandes de contact

Si vous appréciez ces résultats, voici vos options :

📅 Plan Basic : 39 €/mois (renouvellement automatique, annulable à tout moment)
📅 Plan Annuel : [PRIX_RÉDUIT] /an (soit 20% moins cher)

Vous avez 7 jours pour vous décider. Après, vous revertirez à la fiche gratuite.

👉 Continuer Premium : [LIEN_SOUSCRIPTION_BASIC]
👉 Passer au forfait Annuel (20% de remise) : [LIEN_SOUSCRIPTION_ANNUEL]

Des questions ? Je suis là pour vous aider.

Cordialement,
Dereck Rauzduel
Fondateur ImmoServices971 | Architecte EPFL
```

---

### Email 5 — J+21 | "Dernière chance — offre -20% sur l'annuel"

**De:** Dereck Rauzduel — Fondateur ImmoServices971 | Architecte EPFL
**Objet:** ⚠️ Offre expirante : -20% cette semaine seulement

```
Bonjour [NOM_PRO],

Votre essai gratuit vient de prendre fin. Vous avez maintenant 48 heures pour bénéficier de notre offre spéciale.

Récapitulatif de vos résultats Premium :
✨ Votre fiche a été vue [X] fois
💬 Vous avez reçu [Y] demandes de contact
🎯 Vous aviez la position 1 dans votre catégorie

Cette visibilité disparaît demain. Mais vous pouvez la garder — définitivement.

🎁 Offre spéciale valable 48 heures :
Plan Annuel ImmoServices971 = 799 €/an au lieu de 999 €
(Soit 20% de réduction, et bien moins cher que 12 mois à 39 €)

Cela revient à seulement 66 €/mois avec toutes les fonctionnalités Premium.

👉 Souscrire au forfait Annuel avec -20% : [LIEN_CHECKOUT_ANNUEL_RÉDUIT]

Attention : cette réduction expire dans 48 heures. Passé ce délai, les tarifs reviennent à la normale.

Vous avez des doutes ? Je peux répondre à vos questions directement.

Cordialement,
Dereck Rauzduel
Fondateur ImmoServices971 | Architecte EPFL
```

---

## 2. Séquence WhatsApp

### Message 1 — J+0 (ou J+1 si email réponse négative)

```
Bonjour [PRÉNOM],

Dereck de ImmoServices971 par ici 👋

J'ai créé votre fiche pro gratuite sur notre annuaire spécialisé BTP/Immo en Guadeloupe.
Jetez un œil : [LIEN_FICHE_GRATUITE]

Si vous avez des questions ou besoin d'aide, je suis là 😊

À bientôt,
Dereck
```

---

### Message 2 — J+7 (si pas d'ouverture Email 2)

```
Salut [PRÉNOM] 👋

Juste pour te dire : [X] personnes ont visité ton profil cette semaine sur ImmoServices971 !

Si tu veux vraiment booster ta visibilité, j'ai une offre spéciale pour toi. On en parle ?

Dereck 🚀
```

---

## 3. Système de Scoring des Prospects

### Calcul du Score (échelle 1–10)

| Critère | Points | Notes |
|---------|--------|-------|
| **Note Google > 4.0** | +3 | Si Google Business Profile existe et est bien noté |
| **Site web existant** | +2 | Indique une numérisation minimale, compréhension de la valeur |
| **Email valide** | +2 | Possibilité de contact direct |
| **Présence réseaux sociaux** | +1 | Facebook OU Instagram professionnel actif |
| **Commune top 10** | +2 | Pointe-à-Pitre, Abymes, Baie-Mahault, Saint-François, Gosier, Trois-Rivières, Moule, Capesterre, Le Moule, Basse-Terre |
| **Base de scoring minimale** | 1 | Tous les pros démarrent avec 1 point |

### Catégorisation par Score

- **Score 7–10 = Prospect "Chaud"** → Priorité 1 — Contact immédiat, full email sequence
- **Score 4–6 = Prospect "Tiède"** → Priorité 2 — Email 1 + 2, attendre engagement
- **Score 1–3 = Prospect "Froid"** → Priorité 3 — Email 1 seulement, considérer comme nurture long terme

### Exemple de Scoring

```
Pro: Jean Dupont, Plombier, Pointe-à-Pitre
- Base: 1 point
- Google 4.8 ⭐: +3 (total: 4)
- Site web: +2 (total: 6)
- Email valide: +2 (total: 8)
- Facebook actif: +1 (total: 9)
- Commune top 10 (Pointe-à-Pitre): +2 (total: 11 → plafond 10)
✅ SCORE FINAL: 10 — Prospect CHAUD, contact immédiat
```

---

## 4. Suivi de la Prospection — Structure du fichier

### Format CSV (recommandé)

```csv
id,nom_pro,email,telephone,metier,commune,date_scrape,score_initial,priorite,date_email_1,statut_email_1,date_email_2,statut_email_2,date_email_3,statut_email_3,date_email_4,statut_email_4,date_email_5,statut_email_5,whatsapp_message_1,whatsapp_date_1,whatsapp_message_2,whatsapp_date_2,derniere_interaction,statut_conversion,offre_souscrite,date_conversion,montant_mois_1,montant_annuel,notes
1,Jean Dupont,jean@dupont.com,+590-690-123456,Plombier,Pointe-à-Pitre,2026-02-15,10,Chaud,2026-02-16,ouvert,2026-02-19,cliqué,2026-02-23,cliqué,2026-03-02,non_ouvert,2026-03-09,non_ouvert,oui,2026-02-16,oui,2026-02-23,2026-02-23,conversion_premium,Premium,2026-02-23,99,1188,"Très réactif, a converti en 8 jours"
2,Marie Isidore,contact@isidore-btp.com,+590-690-456789,Électricien,Abymes,2026-02-17,8,Chaud,2026-02-18,non_ouvert,2026-02-21,non_ouvert,2026-02-25,non_ouvert,2026-03-04,non_ouvert,2026-03-11,cliqué,non,2026-03-11,non,null,2026-03-11,prospect_chaud_nurture,null,null,null,null,"À relancer via WhatsApp"
```

### Format JSON (alternative)

```json
{
  "prospection": [
    {
      "id": 1,
      "nom_pro": "Jean Dupont",
      "email": "jean@dupont.com",
      "telephone": "+590-690-123456",
      "metier": "Plombier",
      "commune": "Pointe-à-Pitre",
      "date_scrape": "2026-02-15",
      "score_initial": 10,
      "priorite": "Chaud",
      "emails": {
        "email_1": {
          "date_envoi": "2026-02-16",
          "statut": "ouvert",
          "clics": 1
        },
        "email_2": {
          "date_envoi": "2026-02-19",
          "statut": "cliqué",
          "clics": 2
        }
      },
      "whatsapp": [
        {
          "message": 1,
          "date": "2026-02-16",
          "statut": "reçu"
        }
      ],
      "conversion": {
        "statut": "conversion_premium",
        "offre": "Premium",
        "date_conversion": "2026-02-23",
        "montant_mois": 99,
        "montant_annuel": 1188
      },
      "notes": "Très réactif, a converti en 8 jours"
    }
  ]
}
```

### Colonnes clés du suivi

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | INT | Identifiant unique du prospect |
| `nom_pro` | TEXT | Nom du professionnel |
| `email` | TEXT | Adresse email |
| `telephone` | TEXT | Numéro de téléphone |
| `metier` | TEXT | Métier / domaine d'activité |
| `commune` | TEXT | Localisation |
| `score_initial` | INT | Score de prospection (1–10) |
| `priorite` | ENUM | Chaud / Tiède / Froid |
| `statut_email_X` | ENUM | envoyé / ouvert / cliqué / non_ouvert / non_envoyé |
| `date_email_X` | DATE | Date d'envoi |
| `statut_conversion` | ENUM | non_converti / conversion_gratuit / conversion_basic / conversion_premium / conversion_annuel |
| `offre_souscrite` | TEXT | Gratuit / Basic / Premium / Annuel |
| `montant_mois_1` | FLOAT | Revenu du premier mois |
| `montant_annuel` | FLOAT | Revenu annualisé |
| `date_conversion` | DATE | Date de conversion |
| `derniere_interaction` | DATE | Dernière interaction enregistrée |
| `notes` | TEXT | Commentaires libres |

---

## 5. Reporting — Tableau de Bord

### KPIs Principaux

#### Prospection
```
📊 Prospects total: [N]
- Chauds (score 7+): [X] ([X/N]%)
- Tièdes (score 4–6): [Y] ([Y/N]%)
- Froids (score 1–3): [Z] ([Z/N]%)

📧 Emails envoyés:
- Email 1: [A] envoyés, [B] ouverts ([B/A]% taux d'ouverture)
- Email 2: [C] cliqués ([C/A]% taux de clic)
- Email 3: [D] essais activés ([D/A]%)
- Email 4–5: [stats...]

💬 WhatsApp: [X] messages envoyés, [Y]% de taux de livraison
```

#### Conversion
```
💰 Taux de conversion global: [X]%
- Conversion gratuit → Basic: [Y]%
- Conversion Basic → Premium: [Z]%
- Conversion Premium → Annuel: [W]%

👥 Conversions par semaine (courbe de progression)
```

#### Revenue
```
💵 MRR Annuaire: [XXX €/mois]
- Abonnements Basic: [X] × 39 € = [montant]
- Abonnements Premium: [Y] × 99 € = [montant]
- Abonnements Annuels: [Z] × [prix annuel] = [montant]

📈 Prévision 12 mois: [MRR × 12] €
```

### Rapport mensuel type

```markdown
# Rapport Prospection — Février 2026

## Résumé exécutif
- 150 pros contactés (100 chauds, 40 tièdes, 10 froids)
- 35% de taux d'ouverture email 1
- 12% de conversion (18 conversions)
- MRR généré: 1,287 €

## Détail par segment
[Tableau des conversions par métier/commune]

## Tendances
- Les métiers BTP (plomberie, électricité) convertissent 15% vs 8% pour l'immobilier
- La commune Pointe-à-Pitre a le meilleur taux de conversion (18%)

## Actions à prendre
- Accélérer Email 2 pour les tièdes (score 4–6)
- Tester variation d'objet Email 3 (versioning A/B)
- Relancer 25 prospects qui n'ont pas répondu à Email 1
```

---

## 6. Exemples d'utilisation

### Cas 1: Lancer une campagne complète

```bash
$ claude run prospection-annuaire launch-campaign

Input:
- Fichier CSV source (ex: scraper-artisans-971/output/pros_guadeloupe_2026-02.csv)
- Date de lancement (ex: 2026-02-15)
- Segmentation (ex: tous / par commune / par métier)

Process:
1. Charger la base de pros
2. Calculer le score de chaque pro
3. Filtrer par priorité (facultatif)
4. Créer le fichier de suivi (prospection-suivi.csv)
5. Envoyer Email 1 aux prospects "Chauds"
6. Scheduler Email 2 (J+3), Email 3 (J+7), etc.
7. Envoyer WhatsApp Message 1 en parallèle
8. Générer le rapport initial

Output:
- prospection-suivi.csv (tous les pros + leurs scores)
- prospection-logs.json (détail de chaque envoi)
```

### Cas 2: Relancer les non-répondants

```bash
$ claude run prospection-annuaire send-whatsapp-message

Input:
- Fichier prospection-suivi.csv
- Date (ex: 2026-02-23, soit J+8 après Email 1)
- Filtre: email_1.statut = "non_ouvert" ET score >= 7

Process:
1. Identifier les prospects qualifiés non-répondants
2. Envoyer Message WhatsApp 1 personnalisé
3. Mettre à jour prospection-suivi.csv
4. Logger les livraisons

Output:
- prospection-suivi.csv (colonnes whatsapp_message_1 mises à jour)
- whatsapp-logs.json (timestamps + statuts de livraison)
```

### Cas 3: Générer un rapport hebdomadaire

```bash
$ claude run prospection-annuaire generate-report

Input:
- Fichier prospection-suivi.csv
- Période (ex: semaine du 17–23 février)

Output:
- rapport-hebdo-2026-w08.md (Markdown formaté)
- rapport-hebdo-2026-w08.json (données structurées)

Contenu:
- Nombre de contactés / convertis / revenue
- Graphiques (courbes de progression)
- Analyse par segment (métier, commune, score)
- Recommandations d'optimisation
```

---

## 7. Configuration & Prérequis

### Variables d'environnement (fichier `.env`)

```bash
# ImmoServices971 API
IMMOSERVICES_API_URL=https://api.immoservices971.gd
IMMOSERVICES_API_KEY=***

# Email (SendGrid / AWS SES)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=***
EMAIL_FROM=dereck@immoservices971.gd

# WhatsApp (Twilio / Meta)
WHATSAPP_PROVIDER=twilio
TWILIO_SID=***
TWILIO_TOKEN=***
WHATSAPP_FROM_NUMBER=+590-###-###-###

# CRM (optionnel: Pipedrive, HubSpot)
CRM_PROVIDER=pipedrive
CRM_API_KEY=***

# Signatures
SIGNATURE_NAME=Dereck Rauzduel
SIGNATURE_TITLE=Fondateur ImmoServices971 | Architecte EPFL
```

### Dépendances

- **Skill:** `scraper-artisans-971` (fournit les données brutes)
- **APIs:** SendGrid / Twilio / Pipedrive (optionnel)
- **Python packages:** `pandas`, `requests`, `email-validator`, `python-dateutil`

---

## 8. Notes de mise en œuvre

### Optimisations possibles

1. **A/B Testing:** Tester 2 variantes d'Email 2 (approche "social proof" vs "FOMO") sur 50% des prospects
2. **Personnalisation avancée:** Utiliser le scraper pour identifier les concurrents du pro et les mentionner dans Email 2
3. **Intégration CRM:** Pousser chaque prospect dans Pipedrive automatiquement, syncer les conversions
4. **SMS Backup:** Si WhatsApp échoue, envoyer SMS avec le même message
5. **Attribution landing page:** Créer une LP dédiée par pro (email unique du pro dans URL) pour mesurer le trafic exact

### Métriques à suivre

- Taux d'ouverture (Email 1–5)
- Taux de clic
- Taux de conversion (essai → abonnement)
- CAC (Coût d'Acquisition Client) — 0 € si tout automatisé
- LTV (Lifetime Value) = abonnement moyen × durée moyenne
- Churn rate (% d'annulations par mois)

---

## 9. Évolutions futures

- [ ] Intégration Stripe (paiement direct dans l'email)
- [ ] Système d'avis clients (demander avis après 30j)
- [ ] Webinaire auto-programmé (Email 3 propose un créneau de démo live)
- [ ] Parrainage (pro Premium peut parrainer un ami, tous deux gagnent 1 mois gratuit)
- [ ] Dynamique de tarification (prix ajusté par commune selon la demande)

---

**Signature standard de tous les emails:**

```
Cordialement,
Dereck Rauzduel
Fondateur ImmoServices971 | Architecte EPFL
```

**Contact:** dereck@immoservices971.gd | +590-690-123456

---

*Dernière mise à jour: 2026-02-15*
*Prochaine révision: 2026-03-15 (analyse des premières conversions)*
