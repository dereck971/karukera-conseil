---
name: Moteur Cross-Sell et Upsell Écosystème
description: "Génère automatiquement des propositions cross-sell/upsell entre KCI, ImmoServices et Topo3D basées sur le profil client - emails personnalisés, scoring de conversion, tracking résultats"
trigger: "cross-sell|upsell|écosystème|vente|revenue|additionnelle|client|proposition|email|opportunité|annuaire|archis|newsletter|topo|immo|KCI|augmentation|upgrade"
skills:
  - Sales automation
  - Customer segmentation
  - Email marketing
  - Revenue optimization
---

# SKILL: Moteur Cross-Sell et Upsell Écosystème

## Description
Moteur intelligent qui détecte automatiquement les opportunités de cross-sell et upsell entre les 3 entités (KCI, ImmoServices971, Topo3DGuadeloupe) basées sur le profil client, génère des propositions personnalisées par email et track les résultats avec scoring de probabilité de conversion.

## Scénarios de Cross-Sell

### Scénario 1: Client KCI Essentiel → Upgrade KCI Complet
**Déclencheur**: Client a acheté KCI Essentiel (49€)
**Condition**: Facture depuis 30+ jours
**Proposition**: KCI Complet (+80€, soit 129€ au total)

**Email Template**:
```
Objet: [Nom], améliorez votre présence avec KCI Complet

Bonjour [Nom],

Vous utilisez KCI Essentiel depuis 30 jours maintenant.

Nous avons remarqué que les clients ayant upgrader vers KCI Complet (+80€)
bénéficient en moyenne d'une augmentation de 40% de leurs demandes de devis.

KCI Complet ajoute:
✓ Listing premium avec photos
✓ Vidéo présentation (2 min)
✓ Statistiques détaillées
✓ Support prioritaire

Upgrade maintenant pour seulement +80€
```

**Scoring Conversion**: 35%
- Base: 35% (client déjà convaincu par produit)
- +5% si client a cliqué 2+ fois sur dashboard
- +10% si client a reçu 3+ demandes
- -10% si aucune activité depuis 7 jours

---

### Scénario 2: Client KCI (toute version) → Topo3D Simple
**Déclencheur**: Client KCI, première visite sur site Topo3D
**Condition**: Pas de client Topo3D actuellement
**Proposition**: Topo3D Simple (79€)

**Email Template**:
```
Objet: Gagnez 30% plus de clients avec Topo3D

Bonjour [Nom],

Vous êtes architecte/designer en Guadeloupe et vous maîtrisez déjà
le marketing digital avec KCI.

Les 3D topographiques sont le nouvel incontournable pour gagner
les appels d'offres sur les projets de construction.

Topo3D Simple (79€) inclut:
✓ 5 relevés topographiques/mois
✓ Export DWG automatique
✓ Intégration Google Maps
✓ Accès annuaire pros de Topo3D

Les architectes utilisant Topo3D reçoivent 30% plus d'appels d'offres.

Essayez maintenant
```

**Scoring Conversion**: 42%
- Base: 42% (besoin complémentaire)
- +8% si client est architecte (APE 6831Z)
- +12% si 5+ appels d'offres reçus via KCI
- +5% si client a visité landing Topo3D
- -15% si portefeuille déjà complet

---

### Scénario 3: Client KCI Premium → Bundle KCI Premium + Topo3D Premium
**Déclencheur**: Client a acheté KCI Premium (299€)
**Condition**: Activité élevée (10+ demandes/mois)
**Proposition**: Topo3D Premium (199€) = Bundle 398€ (économie 100€)

**Email Template**:
```
Objet: Offre VIP: KCI Premium + Topo3D Premium en bundle

Bonjour [Nom],

Vous êtes l'un de nos meilleurs clients: 12 demandes de devis le mois dernier!

Nous vous proposons une offre exclusive:
KCI Premium + Topo3D Premium en BUNDLE pour 398€/mois
(Prix normal séparé: 498€)

Économie: 100€/mois = 1 200€/an

Topo3D Premium en plus de KCI Premium vous permet:
✓ 25 relevés 3D par mois (vs 5 en Simple)
✓ Modèles 3D haute résolution
✓ API accès pour intégrations custom
✓ Support VIP 24/48h

Réservé aux clients KCI Premium uniquement.

Acceptez l'offre avant [date +7j]
```

**Scoring Conversion**: 58%
- Base: 58% (client premium, haute activité)
- +15% si MRR actuels KCI > 100€
- +10% si taux conversion > 25%
- +8% si client a téléchargé 3D samples
- -5% par jours d'inactivité récente

---

### Scénario 4: Pro Annuaire Gratuit → ImmoServices Basic
**Déclencheur**: Pro inscrit gratuitement sur annuaire Topo3D
**Condition**: Inscrit depuis 30+ jours, 50+ visites profil
**Proposition**: ImmoServices Basic (39€/mois)

**Email Template**:
```
Objet: [Nom], 50+ clients ont vu votre profil ce mois - Passez Premium

Bonjour [Nom],

Excellente nouvelle: votre fiche sur l'annuaire Topo3D attire beaucoup
d'attention (50 visites ce mois).

Vous êtes prêt pour ImmoServices Basic pour:
✓ Accès aux leads immobiliers Guadeloupe (39€/mois)
✓ 5 projets par mois
✓ Support professionnel

3 mois = 117€. Rentabilisé par 1 seul projet!

Démarrez votre abonnement
```

**Scoring Conversion**: 28%
- Base: 28% (transition freemium)
- +15% si visites profil > 50
- +12% si taux clics > 5%
- +8% si profil complété à 100%
- +10% si d'autres archis du même secteur payent
- -20% si zéro interactions depuis 14 jours

---

### Scénario 5: Client ImmoServices Basic → Premium
**Déclencheur**: Abonnement ImmoServices Basic actif
**Condition**: 3+ mois d'abonnement, 3+ projets clôturés
**Proposition**: ImmoServices Premium (99€/mois, +60€)

**Email Template**:
```
Objet: Vous avez clôturé 4 projets - Passez Premium

Bonjour [Nom],

Vous êtes dans les top 10% des utilisateurs Basic.
4 projets clôturés en 3 mois: félicitations!

ImmoServices Premium vous offre:
✓ 20 projets/mois (vs 5)
✓ Accès immédiat sans file d'attente
✓ Premium support 24h
✓ Statistiques détaillées

Premium = +60€/mois = 2€ par projet supplémentaire.

Upgrade maintenant
```

**Scoring Conversion**: 45%
- Base: 45% (client engagé)
- +25% si fermé 3+ projets
- +15% si taux conversion > 30%
- +10% si temps moyen réponse < 2h
- +8% si note client > 4.5/5
- -10% si utilisation < 40% quota

---

### Scénario 6: Client Fiche Populaire Annuaire → Newsletter Premium
**Déclencheur**: Fiche Topo3D a 100+ vues/mois
**Condition**: Top 15% des archis populaires
**Proposition**: Newsletter Premium Topo3D (5€/mois)

**Email Template**:
```
Objet: Vous êtes Top Pro Topo3D - Accès newsletter exclusive

Bonjour [Nom],

Seuls 15% des archis ont une fiche aussi populaire que la vôtre.

Newsletter Premium Topo3D (5€/mois):
✓ Leads hebdo avant les autres
✓ Tendances marché en avant-première
✓ Webinaire exclusifs
✓ Boost de visibilité (+30%)

Pour vous seulement: 5€/mois (gratuit 1er mois)

Confirmer maintenant
```

**Scoring Conversion**: 22%
- Base: 22% (niche audience)
- +18% si classement Top 10
- +10% si note client > 4.8/5
- +8% si newsletter déjà lue (bounce < 10%)
- -5% par mois depuis inscription

---

### Scénario 7: Architecte Annuaire → Topo3D Abonnement Mensuel
**Déclencheur**: Architecte inscrit annuaire, domaine "topographie"
**Condition**: Plus de 3 projets/mois en moyenne
**Proposition**: Topo3D Abonnement (149€/mois pour 5 topo/mois)

**Email Template**:
```
Objet: Archis actifs: Topo3D à 149€/mois (lieu de payer par projet)

Bonjour [Nom],

Vous generez 5+ projets topographiques par mois.

Au lieu de payer par projet, Topo3D Mensuel:
✓ 5 relevés 3D inclus (149€/mois)
✓ Relevés illimités après les 5
✓ 0€/relevé additionnel
✓ Priorité processing (24h)

Calcul: 5 relevés × 35€ = 175€ en à la carte
Abonnement: 149€ = Économie de 26€/mois

Passer à l'abonnement
```

**Scoring Conversion**: 52%
- Base: 52% (économies tangibles)
- +18% si historique 5+ projets
- +12% si taux d'utilisation > 80%
- +8% si premier relevé > 48h processing
- -15% si équipe faible (< 2 personnes)

---

### Scénario 8: Client Multi-Entité → Programme Fidélité
**Déclencheur**: Client actif dans 2+ entités
**Condition**: CA cumulé KCI + Immo + Topo3D > 500€
**Proposition**: Programme VIP (5% réduction récurrente)

**Email Template**:
```
Objet: [Nom], merci! Vous êtes Partner VIP

Bonjour [Nom],

Vous nous faites confiance pour KCI, ImmoServices ET Topo3D.
CA cumulé: 650€ en 3 mois.

Nous vous accordons le statut Partner VIP:
✓ 5% réduction permanente tous produits
✓ Support prioritaire 24h/48h
✓ Accès features bêta
✓ Invitation événements exclusifs

Merci de votre confiance!
```

**Scoring Conversion**: 95%
- Acceptance automatique pour clients existants

---

## Moteur de Scoring

### Algorithme Base
```
Score = (Base Score × [Facteurs Contexte]) + [Bonus Activité]

Base Score par scénario:
1. Essentiel → Complet: 35%
2. KCI → Topo3D Simple: 42%
3. KCI Premium → Bundle: 58%
4. Annuaire Gratuit → Basic: 28%
5. Basic → Premium: 45%
6. Fiche Populaire → Newsletter: 22%
7. Architecte Actif → Topo3D Abo: 52%
8. Multi-Entité → VIP: 95%
```

### Facteurs Ajustement
**Positifs** (+):
- Utilisateur actif (dernière action < 7 jours): +5%
- Taux engagement > 50%: +10%
- Revenu déjà généré > 100€: +15%
- Profil complet à 100%: +8%
- Note client > 4.5/5: +10%
- Comportement d'upsell positif passé: +20%

**Négatifs** (-):
- Inactivité > 30 jours: -15%
- Taux engagement < 20%: -10%
- Refus précédent même offre: -30%
- Problème support signalé: -20%
- Résiliation imminente (churn signal): -25%

### Exemples de Calcul
```
Exemple 1: KCI Essentiel → Complet
Base: 35%
Facteurs: Utilisateur actif (+5%), Taux engagement 60% (+10%), Revenu 49€ (+5%)
Score final: 35 × (1 + 0.05 + 0.10 + 0.05) = 35 × 1.20 = 42%

Exemple 2: Annuaire Gratuit → Basic
Base: 28%
Facteurs: Inactivité 15j (-10%), Visites 50 (+15%), Profil 90% (+7%)
Score final: 28 × (1 - 0.10 + 0.15 + 0.07) = 28 × 1.12 = 31.4%
```

---

## Pipeline et Tracking

### Étapes du Cross-Sell

1. **Détection** (Auto):
   - Profil client analysé
   - Scénario identifié
   - Score calculé

2. **Création Proposition**:
   - Template sélectionné
   - Variables personnalisées
   - Email rédigé

3. **Envoi Email**:
   - Timestamp: 2026-03-18 09:00
   - A: client@email.com
   - Objet: [Personnalisé]
   - ID tracking: upsell_KCI_2026_001

4. **Tracking Engagement**:
   - Email ouvert?: OUI/NON + timestamp
   - Lien cliqué?: OUI/NON + timestamp
   - Temps avant clic: XX minutes
   - Conversion?: OUI/NON + montant

5. **Suivi Résultat**:
   - Acceptée (client a acheté)
   - Refusée (client a dit non)
   - Ignorée (pas de réponse après 7j)

### Fichier de Tracking JSON
```json
{
  "propositions": [
    {
      "id": "upsell_KCI_2026_001",
      "date_creation": "2026-03-18",
      "client_id": "C_12345",
      "client_email": "client@email.com",
      "scénario": "Essentiel → Complet",
      "produit_source": "KCI Essentiel",
      "produit_cible": "KCI Complet",
      "montant_upsell": 80,
      "score_conversion": 42,
      "email_sent": "2026-03-18T09:00:00",
      "email_open": {
        "ouvert": true,
        "date": "2026-03-18T10:30:00",
        "device": "mobile"
      },
      "email_click": {
        "clique": true,
        "lien": "http://kci.com/upgrade",
        "date": "2026-03-18T10:35:00",
        "temps_avant_clic_sec": 300
      },
      "conversion": {
        "convertie": true,
        "date_achat": "2026-03-18T11:00:00",
        "montant_reel": 80,
        "statut": "payée"
      },
      "resultat_final": "SUCCESS",
      "notes": "Client a acheté peu après clic"
    }
  ]
}
```

---

## Dashboard de Performance

### Métriques Globales
```
Propositions envoyées ce mois: 47
Emails ouverts: 23 (48.9% open rate)
Emails cliqués: 12 (25.5% click rate)
Conversions: 5 (10.6% conversion rate)
Revenue additionnel: 385€
```

### Par Scénario
```
Scénario 1 (Essentiel → Complet):
  Envoyées: 12 | Conversions: 4 | Taux: 33% | Revenue: 320€

Scénario 2 (KCI → Topo3D Simple):
  Envoyées: 18 | Conversions: 1 | Taux: 5.6% | Revenue: 79€

Scénario 3 (KCI Premium → Bundle):
  Envoyées: 3 | Conversions: 2 | Taux: 66% | Revenue: 796€

Scénario 4 (Annuaire → Basic):
  Envoyées: 8 | Conversions: 0 | Taux: 0% | Revenue: 0€
```

### A/B Testing Emails
```
Variante A (Objet actuel): Open 48%, Click 25%
Variante B (Test nouveau): Open 52%, Click 28%
→ Variante B gagnante, passer à 100%
```

---

## Automations et Scheduling

### Email Timing
- **Délai après achat**: 30 jours (permet maturation)
- **Jour de la semaine**: Mercredi (meilleur open rate)
- **Heure**: 09:00 (fuseau horaire client)
- **Fréquence**: Max 1 email/client/semaine

### Re-engagement
```
1ère envoi → Pas réponse 3j → Email rappel
"Vous avez oublié de cliquer?"

2e envoi → Pas réponse 7j → Arrêter
Ne pas spammer
```

### Archivage
- Propositions converties: Archiver immédiatement
- Propositions refusées: Archiver après 30j
- Propositions ignorées: Réanalyser après 60j

---

## Intégrations

### Sources Données
- **CRM**: Liste clients + historique d'achat
- **Factures**: Système facturation-auto
- **Analytics**: Comportement utilisateur
- **Email Service**: SendGrid/Brevo pour envoi
- **Payment**: Gateway pour paiement direct depuis email

### Actions Post-Conversion
```
Client clique → Conversion:
1. Créer facture automatique
2. Envoyer confirmation email
3. Mettre à jour CRM (nouveau produit)
4. Déclencher onboarding produit
5. Notification Slack à Dereck
```

---

## Commandes d'Utilisation

```bash
# Analyser client pour cross-sell
cross-sell-ecosystem --analyze-client C_12345

# Générer propositions pour tous clients
cross-sell-ecosystem --generate-all --batch

# Envoyer proposition spécifique
cross-sell-ecosystem --send-proposal upsell_KCI_2026_001

# Afficher dashboard performance
cross-sell-ecosystem --dashboard --period "2026-03"

# Tester scoring pour client
cross-sell-ecosystem --test-scoring C_12345

# Générer A/B test emails
cross-sell-ecosystem --ab-test scenario=1 variants=3

# Rapport mensuel cross-sell
cross-sell-ecosystem --report monthly --format pdf

# Afficher leads à haut scoring
cross-sell-ecosystem --show-high-scoring --threshold 70
```

---

## ROI et Objectifs

### Cible M1 (Mars 2026)
- Propositions: 40+
- Conversion rate: 15%+ (vs baseline 10%)
- Revenue additionnel: 300€+

### Cible M3 (Mai 2026)
- Propositions: 150+
- Conversion rate: 18%+
- Revenue additionnel: 500€+

### Cible Annuelle (2026)
- Revenue cross-sell: 3 000€+ (≈ 15% CA additionnel)
- Améliorer LTV clients de 20%
- Réduire churn de 5% (clients multi-produits plus stables)

---

## Notes de Développement

- Utiliser ML pour améliorer scoring (logistic regression)
- Intégration Twilio pour SMS follow-up optionnel
- Dashboard Grafana pour monitoring temps réel
- Webhook pour real-time event tracking
- Cache client profile (Redis 24h)
- Email templates dans CMS (Strapi ou similar)
- A/B testing framework (multi-armed bandit)
- GDPR compliance: Opt-out easy access

---

**Dernier update**: 2026-03-18 | **Version**: 1.0 Beta
