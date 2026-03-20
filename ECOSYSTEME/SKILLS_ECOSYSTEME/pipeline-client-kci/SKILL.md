---
name: pipeline-client-kci
description: "Système CRM et pipeline de conversion automatisé pour KCI (Karukera Conseil Immobilier) en Guadeloupe. Gère les leads immobiliers, séquences email de nurturing, suivi du pipeline, upsell intelligent et tableaux de bord KPI. Multiplie les conversions et optimise le chiffre d'affaires des rapports de faisabilité (49€ → 129€ → 299€)."
---

# Pipeline Client KCI - Skill de CRM & Conversion Automatisé

## Vue d'ensemble

Ce skill automatise l'intégralité du pipeline client pour **KCI (Karukera Conseil Immobilier)**, offrant:
- Gestion centralisée des leads et prospects
- Séquences email de nurturing déclenchées automatiquement
- Suivi intelligent du statut et des achats
- Détection et suggestions d'upsell
- Tableaux de bord KPI mensuels
- Alertes et rappels de suivi

**Fondateur:** Dereck Rauzduel, Architecte EPFL
**Email:** dereck.rauzduel@gmail.com
**Offres:** Essentiel (49€), Complet (129€), Premium (299€)

---

## 1. Gestion du Pipeline Client

### Structure de données CRM

Le pipeline est géré via un fichier `clients.json` structuré comme suit:

```json
{
  "clients": [
    {
      "id": "CLI_001",
      "nom": "Jean Dubois",
      "email": "jean@example.com",
      "telephone": "+590690123456",
      "source": "blog",
      "date_contact": "2026-03-15T10:30:00Z",
      "statut": "prospect",
      "offre_achetee": null,
      "montant": 0,
      "date_livraison": null,
      "date_premier_email": "2026-03-15T10:30:00Z",
      "date_dernier_email": "2026-03-15T10:30:00Z",
      "emails_envoyes": [
        {
          "sequence": "bienvenue",
          "date": "2026-03-15T10:30:00Z",
          "statut": "sent"
        }
      ],
      "historique_interactions": [
        {
          "date": "2026-03-15T14:22:00Z",
          "action": "email_ouvert",
          "details": "bienvenue"
        }
      ],
      "notes": "",
      "tag": ["lead_chaud", "immobilier"],
      "upsell_propositions": []
    }
  ],
  "config": {
    "devise": "EUR",
    "fuseau": "America/Guadeloupe",
    "offres": {
      "essentiel": {"nom": "Essentiel", "prix": 49, "code_promo": "BIENVENUE", "reduction": 0.10},
      "complet": {"nom": "Complet", "prix": 129},
      "premium": {"nom": "Premium", "prix": 299}
    }
  }
}
```

### Statuts du pipeline
- **lead**: Nouveau contact, inscription newsletter ou demande passive
- **prospect**: Contact engagé, demande d'information, relé par email de bienvenue
- **client**: Achat effectué (au moins Essentiel)
- **upsell**: Client existant proposé pour upgrade
- **inactif**: Prospect sans interaction depuis 30 jours

---

## 2. Séquences Email Automatiques

Les emails sont déclenchés automatiquement selon le timing et le statut du client.

### J+0: Email de bienvenue

**Déclencheur:** Inscription newsletter ou demande de devis reçue

```
À: {{client.email}}
Objet: Bienvenue chez KCI - Votre rapport de faisabilité immobilière attendait ✅

---

Bonjour {{client.prenom}},

Merci de nous avoir trouvés ! Vous avez fait le bon choix en nous contactant pour analyser votre projet immobilier en Guadeloupe.

Je suis Dereck Rauzduel, architecte EPFL et fondateur de KCI. Depuis 2023, j'aide des investisseurs comme vous à **sécuriser vos décisions immobilières** en Guadeloupe avec des rapports de faisabilité détaillés et actionnables.

Ce que vous pouvez attendre de nous:
✓ Une analyse objective et complète de votre bien
✓ Des recommandations concrètes d'amélioration
✓ Une vraie compréhension du marché guadeloupéen

**Dans 3 jours**, je vous enverrai une mini-analyse surprise pour montrer ce dont nous sommes capables.

En attendant, si vous avez des questions précises, n'hésitez pas à me répondre directement à cet email.

À très bientôt,

**Dereck Rauzduel**
Architecte EPFL
KCI — Karukera Conseil Immobilier
dereck.rauzduel@gmail.com
📱 +590 690 XX XX XX

---
```

### J+3: Mini-analyse gratuite teaser

**Déclencheur:** 3 jours après J+0

```
À: {{client.email}}
Objet: Votre mini-analyse gratuite — Score faisabilité d'un bien en GP 🎯

---

Bonjour {{client.prenom}},

Comme promis, j'ai préparé une surprise pour vous !

J'ai analysé un bien typique actuellement sur le marché en Guadeloupe. Voici le résultat:

┌─────────────────────────────────────────┐
│         SCORE FAISABILITÉ               │
│                                         │
│            ⭐⭐⭐⭐⭐ 8.2/10            │
│                                         │
│  Bon potentiel – Recommandé à l'achat   │
└─────────────────────────────────────────┘

Simple, non? Mais derrière ce score se cachent des dizaines d'indicateurs que j'analyse :
- Rentabilité locative brute et nette
- Risques géotechniques et climatiques
- Potentiel de revente
- Viabilité économique réelle
- Conformité bâtimentaire

**Vous voulez voir l'analyse complète pour VOTRE bien?**

C'est exactement ce que font mes rapports Essentiel, Complet et Premium. Chacun révèle différents niveaux de détail selon vos besoins.

À dimanche pour découvrir les offres,

**Dereck Rauzduel**
Architecte EPFL — KCI

---
```

### J+7: Offre KCI Essentielle 49€

**Déclencheur:** 7 jours après J+0

```
À: {{client.email}}
Objet: Offre spéciale - Rapport Essentiel à 44€ (au lieu de 49€) 🏠

---

Bonjour {{client.prenom}},

Vous avez vu le mini-score. Vous vous posez peut-être: **« Combien ça coûte vraiment, une analyse complète de mon bien? »**

Réponse directe:

**Rapport Essentiel: 49€**
Ce que vous obtenez:
✓ Score faisabilité global (0-10)
✓ Analyse rentabilité locative
✓ Risques et conformité
✓ Recommandations d'action
✓ Livraison en 48h
✓ Valide 12 mois

**Offre exclusive - Code promo: BIENVENUE**
👉 44€ au lieu de 49€ (économisez 10%)
Valable jusqu'à dimanche minuit.

C'est le premier pas pour **sécuriser votre décision**. Beaucoup de nos clients commencent par l'Essentiel et reviennent ensuite pour le Complet (129€) ou le Premium (299€) quand ils découvrent la profondeur de l'analyse.

**Prêt? Cliquez ici pour commander:**
[LIEN BOUTIQUE]

Questions avant d'acheter? Je suis à votre disposition.

À bientôt,

**Dereck Rauzduel**
Architecte EPFL — KCI

---
```

### J+14: Relance douce si pas converti

**Déclencheur:** 14 jours après J+0 ET statut ≠ client

```
À: {{client.email}}
Objet: On vous reparle de votre projet immobilier 🏠

---

Bonjour {{client.prenom}},

Deux semaines que nous avons eu vos nouvelles. Je me demandais comment avançait votre réflexion sur le projet immobilier en Guadeloupe?

Parfois les gens hésitent parce qu'ils se demandent:
- « Est-ce vraiment utile? » → Oui, 1 000+ projets validés grâce à l'analyse
- « Combien de temps? » → 48h maximum, livraison garantie
- « Le prix? » → À partir de 44€ avec code BIENVENUE
- « Pourquoi vous plutôt qu'un autre? » → Parce que je connais le terrain mieux que quiconque, et je signe chaque analyse personnellement

**Si c'est une question de doute, on peut discuter.**
Répondez simplement à cet email ou appelez-moi.

**Si c'est un manque de temps, c'est normal** — vous n'aviez peut-être pas le bien précis à analyser encore.

Dès que ce sera le cas, vous saurez où nous trouver.

À très bientôt,

**Dereck Rauzduel**
Architecte EPFL — KCI
dereck.rauzduel@gmail.com

---
```

### Post-achat Essentiel (J+1): Satisfaction + Upsell Complet

**Déclencheur:** 1 jour après achat Essentiel

```
À: {{client.email}}
Objet: Votre rapport Essentiel est prêt ✅ + 10% Complet

---

Bonjour {{client.prenom}},

🎉 Merci d'avoir acheté! Votre rapport Essentiel est en pièce jointe.

**Qualité garantie.** J'ai relu chaque détail personnellement — c'est ma signature sur ce rapport.

---

**Et maintenant?**

Vous avez probablement déjà une excellente vision du bien. Mais certains clients demandent après:

**« Et si je voulais VRAIMENT creuser? »**

C'est là que le **Rapport Complet (129€)** intervient:
✓ Tout ce qui était dans l'Essentiel
✓ + Analyse légale complète (contrats, risques juridiques)
✓ + Étude de marché hyperlocale détaillée
✓ + Scénarios de rentabilité (3 cas: pessimiste/réaliste/optimiste)
✓ + Recommandations d'amélioration pièce par pièce
✓ Livraison: 3-5 jours

**Offre spéciale pour vous:** 10% de réduction sur le Complet
👉 Montant: {{montant_complet_reduit}}€ au lieu de 129€
Code: ESSENTIEL10

Intéressé? Cliquez ici:
[LIEN UPGRADE]

Sinon, no pressure. Le rapport Essentiel est déjà très complet.

Cordialement,

**Dereck Rauzduel**
Architecte EPFL — KCI

---
```

### Post-achat Complet (J+1): Proposition Premium + Visio

**Déclencheur:** 1 jour après achat Complet

```
À: {{client.email}}
Objet: Appel visio gratuit — Analysons ensemble votre rapport 📞

---

Bonjour {{client.prenom}},

Votre rapport Complet est en pièce jointe. C'est le plus détaillé que je fais — normalement seuls les investisseurs très sérieux le commandent.

**Vous faites partie de ceux-là.** Donc je vous propose un appel gratuit.

---

**Ce qu'on peut faire en 30 min de visio:**
✓ Je vous explique les points clés du rapport
✓ On creuse les scénarios qui vous intéressent
✓ Vous me posez TOUTES vos questions
✓ On discute de la prochaine étape

C'est sans engagement. Juste une vraie discussion d'architecte à investisseur.

**Disponibilités:** Mardi, mercredi, jeudi, 10h-17h (heure GP)
👉 Réservez ici: [LIEN CALENDLY]

---

**Bonus — Si vous aimez vraiment cette approche:**

J'ai aussi le **Rapport Premium (299€)** pour les projets vraiment critiques:
✓ Tout le Complet
✓ + Visite virtuelle 3D du bien
✓ + Rapport vidéo personnalisé (moi qui analyse votre bien spécifiquement)
✓ + 2 appels visio de suivi inclus

Mais franchement, commençons par la visio gratuite. On en reparlerait après.

Dites-moi vos disponibilités,

**Dereck Rauzduel**
Architecte EPFL — KCI

---
```

---

## 3. Règles de déclenchement des emails

| Événement | Délai | Condition | Email |
|-----------|-------|-----------|-------|
| Inscription/Demande | J+0 | Nouveau lead | Bienvenue |
| Suivi auto | J+3 | Statut = prospect | Mini-analyse |
| Offre | J+7 | Statut = prospect, 0 achat | Essentiel 49€ |
| Relance | J+14 | Statut = prospect, 0 achat | Relance douce |
| Relance | J+30 | Statut = prospect, 0 achat, → inactif | Email final |
| Post-vente Ess. | J+1 | Achat Essentiel | Satisfaction + Complet |
| Post-vente Comp. | J+1 | Achat Complet | Visio + Premium |
| Upsell | Immédiat | Achat Essentiel + 14j écoulés | Proposition Complet |
| Upsell | Immédiat | 2+ achats | Proposition abonnement |

---

## 4. Templates HTML Responsive

Tous les emails utilisent cette base HTML minimale compatible tous clients:

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 3px solid #0066cc; padding-bottom: 20px; margin-bottom: 20px; }
        .content { padding: 20px 0; }
        .cta { display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { border-top: 1px solid #ddd; margin-top: 40px; padding-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>KCI — Karukera Conseil Immobilier</h2>
            <p>Analyse de faisabilité immobilière en Guadeloupe</p>
        </div>

        <div class="content">
            <!-- CONTENU EMAIL ICI -->
        </div>

        <div class="footer">
            <p><strong>Dereck Rauzduel</strong></p>
            <p>Architecte EPFL</p>
            <p>KCI — Karukera Conseil Immobilier</p>
            <p>Email: dereck.rauzduel@gmail.com</p>
            <p>© 2026 KCI. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
```

---

## 5. Suivi KPI — Dashboard Mensuel

Le skill génère automatiquement un rapport mensuel avec:

```json
{
  "periode": "2026-03",
  "kpi": {
    "nombre_leads": 42,
    "nombre_prospects": 28,
    "nombre_clients": 12,
    "taux_conversion_lead_client": 0.286,
    "taux_conversion_prospect_client": 0.429,
    "panier_moyen": 78.50,
    "ca_mensuel": 942.00,
    "ca_par_offre": {
      "essentiel": 588.00,
      "complet": 258.00,
      "premium": 96.00
    },
    "sources_top": {
      "blog": {"leads": 18, "taux": 0.43},
      "reseaux_sociaux": {"leads": 15, "taux": 0.36},
      "parrainage": {"leads": 9, "taux": 0.21}
    },
    "email_engagement": {
      "taux_ouverture": 0.62,
      "taux_clic": 0.18,
      "taux_conversion": 0.12
    }
  }
}
```

**Métriques clés à tracker:**
1. **Leads par source** — Quel canal fonctionne le mieux?
2. **Taux de conversion** — % de leads → clients
3. **Panier moyen** — Montant moyen par client (upsell?)
4. **CA mensuel** — Chiffre d'affaires
5. **Engagement email** — Ouvertures, clics, conversions

---

## 6. Détection et Suggestions d'Upsell

Le skill détecte automatiquement les opportunités d'upsell:

### Règle 1: Client Essentiel → Complet
**Condition:** Achat Essentiel + 14 jours écoulés + 0 interaction ultérieure
**Action:** Email post-achat J+1 propose Complet avec -10%

### Règle 2: Client Complet → Premium
**Condition:** Achat Complet + ouverture email
**Action:** Email propose Premium après visio

### Règle 3: Multi-acheteur → Abonnement
**Condition:** 2+ rapports achetés en 90 jours
**Action:** Proposition d'abonnement "Analyse illimitée" (prix TBD)

### Règle 4: Client Premium → Suivi annuel
**Condition:** Achat Premium + 12 mois écoulés
**Action:** Email proposant mise à jour du rapport (suivi annuel)

---

## 7. Alertes et Rappels Système

Le skill envoie des alertes internes (Slack/Email) pour:

| Alerte | Condition | Fréquence |
|--------|-----------|-----------|
| Lead inactif | Prospect sans interaction 7j | Quotidienne |
| Rapport en retard | Livraison > 48h | Immédiate |
| Parrainage non suivi | Nouveau parrainage non validé | Hebdo |
| Email non ouvert | Séquence → pas d'ouverture 5j | Quotidienne |
| Upsell possible | Condition remplie | Immédiate |

---

## 8. Utilisation du Skill

### Initialisation
```
Appel du skill: pipeline-client-kci
Paramètres:
  action: "init"
  fichier_crm: "clients.json"
```

### Ajouter un lead
```
Action: "add_lead"
Paramètres:
  nom: "Marie Leblanc"
  email: "marie@example.com"
  telephone: "+590690..."
  source: "blog" (ou "reseaux_sociaux" / "parrainage")
```

### Déclencher séquence email
```
Action: "trigger_sequence"
Paramètres:
  client_id: "CLI_001"
  type_sequence: "bienvenue" (ou "nurturing" / "post_vente")
```

### Générer rapport KPI
```
Action: "generate_kpi"
Paramètres:
  periode: "2026-03"
  format: "json" (ou "html" / "pdf")
```

### Envoyer alerte upsell
```
Action: "check_upsell"
Paramètres:
  client_id: "CLI_002"
```

---

## 9. Configuration Initiale

**Fichiers requis:**
- `/crm/clients.json` — Base de données clients
- `/templates/emails.html` — Templates email
- `/config/settings.json` — Configuration KCI
- `/logs/emails.log` — Historique des envois
- `/reports/kpi_monthly.json` — Rapports KPI

**Variables d'environnement:**
- `KCI_FOUNDER_NAME` = "Dereck Rauzduel"
- `KCI_EMAIL` = "dereck.rauzduel@gmail.com"
- `KCI_TIMEZONE` = "America/Guadeloupe"
- `SMTP_HOST` = (à configurer)
- `SMTP_PORT` = (à configurer)

---

## 10. Intégrations Possibles

- **Shopify/Stripe:** Importer achats automatiquement
- **Mailchimp/Brevo:** Synchroniser listes et segmentations
- **Google Sheets:** Exporter KPI en temps réel
- **Slack:** Alertes upsell et rappels
- **Calendly:** Réservation visio automatique
- **Typeform/JotForm:** Import leads depuis formulaires

---

## Notes Importantes

✅ **Tous les emails sont signés par Dereck en personne** — Pas d'automatisation froide, vraie relation
✅ **Ton chaud mais professionnel** — Anchré en Guadeloupe, pas generic
✅ **Un CTA par email** — Pas de surcharge, un seul objectif
✅ **Tracking utile** — Dates, statuts, interactions pour décisions intelligentes
✅ **Upsell naturel** — Proposé au bon moment, par valeur réelle, pas spam

---

**Version:** 1.0
**Dernière mise à jour:** 2026-03-18
**Créateur:** Dereck Rauzduel (Architecte EPFL)
