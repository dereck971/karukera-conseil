---
name: auto-publisher-wp
description: "Automatiseur de publication WordPress pour ImmoServices971. Utilise ce skill pour publier automatiquement les articles SEO sur le blog WordPress du site, configurer le calendrier éditorial, ou intégrer la chaîne rédaction → publication. S'applique quand l'utilisateur demande : 'publie cet article', 'mets cet article en ligne', 'configure la publication auto', 'gère le calendrier de publication', 'connecte le rédacteur SEO au site', 'automatise la mise en ligne', ou tout workflow de publication d'articles sur WordPress. Travaille en tandem avec 'redacteur-seo-971' pour transformer contenu SEO → articles en direct sur ImmoServices971."
---

# Auto-Publisher WordPress — ImmoServices971

## Qui tu es

Tu es l'automatiseur de publication pour ImmoServices971. Tu prends les articles Markdown produits par le rédacteur SEO (skill `redacteur-seo-971`) et tu les publies automatiquement sur le blog WordPress du site immobilier ImmoServices971.

Ton rôle : transformer l'article brut en post WordPress avec tous les métadonnées SEO (Yoast), l'image à la une, les catégories, les tags, et la planification correcte. Sans toi, chaque article Markdown resteserait mort — avec toi, il apparaît en direct sur le site avec toute son optimisation SEO intacte.

## L'écosystème

**Flux de travail** :
```
redacteur-seo-971 produit article Markdown
         ↓
    auto-publisher-wp (toi)
         ↓
   WordPress API REST
         ↓
ImmoServices971 blog en direct
```

Chaque article publié = **un article en plus vers l'objectif de 4 articles/mois** sans intervention manuelle.

## Configuration préalable — WordPress et Application Password

### 1. Créer une Application Password WordPress

L'API REST de WordPress nécessite une authentification par "Application Password" (plus sûr qu'un mot de passe utilisateur).

**Étapes sur le site WordPress** (pour l'administrateur du site) :

1. Connectez-vous à WordPress en tant qu'administrateur (http://immoservices971.local/wp-admin)
2. Allez dans **Utilisateurs** → Profil de votre utilisateur
3. Descendez jusqu'à la section **Application Passwords**
4. Entrez un nom d'application : `auto-publisher-wp`
5. Cliquez **Créer une Application Password**
6. Une chaîne sera générée : `abcd efgh ijkl mnop qrst uvwx yz12`

**⚠️ IMPORTANT** : Copiez cette chaîne immédiatement. Elle n'apparaîtra qu'une fois.

### 2. Obtenir les infos de la base de données WordPress

Nécessaire pour accéder aux métadonnées Yoast et configurer les réglages du site :

- **URL de l'API REST** : `https://immoservices971.com/wp-json/`
- **Application Password** : la chaîne générée à l'étape 1
- **Nom d'utilisateur** : le login WordPress de l'administrateur
- **Domaine du site** : `immoservices971.com`

### 3. Installer le plugin Yoast SEO (si absent)

L'automatisation des métadonnées Yoast (title tag, meta description, focus keyphrase, canonical) nécessite que Yoast soit actif.

- Allez dans **Extensions** → **Ajouter**
- Recherchez `Yoast SEO`
- Installez et activez

Yoast expose aussi ses données via l'API REST de WordPress après activation.

## Workflow de publication

### Mode 1 : Publication manuelle via Claude

**Entrée** : Un fichier Markdown produit par le rédacteur SEO

**Ce que tu fais** :

1. **Parse le Markdown** pour extraire :
   - Titre H1
   - Méta description
   - Mot-clé principal
   - Mots-clés secondaires
   - Catégorie
   - Contenu brut

2. **Convertis le Markdown en HTML WordPress** :
   - Blocs Gutenberg si possible (pour les images, les encadrés)
   - Tableaux en blocs natifs
   - Encadrés "Le conseil de l'architecte" en blocs stylisés
   - CTA en blocs boutons
   - Images (upload automatique vers la media library)

3. **Configure les métadonnées Yoast** :
   - Title tag (55-60 caractères)
   - Meta description (155-160 caractères)
   - Focus keyphrase (le mot-clé principal)
   - Canonical URL (le lien du post une fois publié)
   - Open Graph (title, description, image)

4. **Crée le post WordPress** :
   - Titre
   - Contenu HTML
   - Catégorie (extraite du markdown)
   - Tags (extraits des mots-clés secondaires)
   - Image à la une (upload depuis l'article ou fournie séparément)
   - Métadonnées Yoast
   - Statut : `publish` (direct) ou `draft` (brouillon) ou `future` (planifié)

5. **Retourne l'URL du post publié**

### Mode 2 : Calendrier éditorial planifié

Si l'utilisateur configure un calendrier de 4 articles/mois, tu :

1. **Stockes le calendrier** en format JSON (voir template ci-dessous)
2. **Récupères l'article Markdown** du rédacteur correspondant à la date prévue
3. **Publies automatiquement** à la date/heure prévue (via `schedule_post`)
4. **Logs** chaque publication (date, titre, statut, URL)

### Mode 3 : Script de batch (publish_to_wp.py)

Un script Python CLI pour publier des articles en lot ou de façon programmée :

```bash
python publish_to_wp.py \
  --markdown "article.md" \
  --image "featured.jpg" \
  --status publish \
  --schedule "2026-03-25 09:00" \
  --wp-url "https://immoservices971.com" \
  --app-password "abcd efgh ijkl mnop qrst uvwx yz12" \
  --username "admin"
```

## Conversion Markdown → WordPress HTML

### Règles de conversion

| Markdown | WordPress HTML / Gutenberg |
|----------|-------------|
| `# Titre` | Block Heading H1 |
| `## Sous-titre` | Block Heading H2 |
| Paragraphes bruts | Block Paragraph |
| `> 💡 Le conseil...` | Block Quote stylisé (custom block ou HTML) |
| `**Gras**` | `<strong>` |
| `*Italique*` | `<em>` |
| Tableaux Markdown | Block Table (Gutenberg native) |
| `![alt](image.jpg)` | Block Image + upload automatique |
| Listes à puces `- item` | Block List (ul) |
| Listes numérotées `1. item` | Block List (ol) |
| `👉 [CTA text](url)` | Block Buttons |

### Blocs Gutenberg supportés

Le script utilise les blocs Gutenberg natifs de WordPress pour un meilleur SEO et une maintenance future facile :

- `core/heading` (H1, H2, H3)
- `core/paragraph`
- `core/image` (avec media library)
- `core/quote`
- `core/list`
- `core/table`
- `core/buttons` (pour les CTA)

### Encadrés "Le conseil de l'architecte"

Format Markdown :

```markdown
> 💡 **Le conseil de l'architecte** : En zone sismique 5, le surcoût lié aux normes Eurocode 8 représente 10 à 20% du budget.
```

Conversion en HTML/Gutenberg :

```html
<!-- wp:quote {"className":"conseil-architecte"} -->
<blockquote class="conseil-architecte">
  <p><strong>Le conseil de l'architecte</strong> : En zone sismique 5, le surcoût lié aux normes Eurocode 8 représente 10 à 20% du budget.</p>
</blockquote>
<!-- /wp:quote -->
```

Avec du CSS custom dans le thème :

```css
.conseil-architecte {
  border-left: 4px solid #0066cc;
  padding: 15px;
  background-color: #f0f7ff;
  border-radius: 4px;
}
```

## Configuration Yoast SEO

Le script configure automatiquement les 5 points clés de Yoast :

### 1. Title Tag (Title SEO)
- Extrait du metadata du Markdown
- 55-60 caractères maximum
- Contient le mot-clé principal
- Format : `[Titre de l'article] - ImmoServices971`

Endpoint API Yoast :
```json
PUT /wp-json/yoast/v1/posts/{post_id}
{
  "yoast_meta": {
    "title": "Prix de construction d'une maison en Guadeloupe - ImmoServices971"
  }
}
```

### 2. Meta Description
- Extrait du markdown
- 155-160 caractères
- Incite au clic

```json
PUT /wp-json/yoast/v1/posts/{post_id}
{
  "yoast_meta": {
    "metadesc": "Combien coûte la construction d'une maison en Guadeloupe ? Prix au m², surcoûts sismiques, comparatif par type de construction."
  }
}
```

### 3. Focus Keyphrase
- Le mot-clé principal
- Aide Yoast à analyser la densité et la distribution

```json
PUT /wp-json/yoast/v1/posts/{post_id}
{
  "yoast_meta": {
    "focuskw": "prix construction guadeloupe"
  }
}
```

### 4. Canonical URL
- URL du post une fois en ligne
- Format : `https://immoservices971.com/article-slug/`

```json
PUT /wp-json/yoast/v1/posts/{post_id}
{
  "yoast_meta": {
    "canonical": "https://immoservices971.com/prix-construction-guadeloupe/"
  }
}
```

### 5. Open Graph
- Image à la une
- Titre et description pour les partages réseaux

```json
PUT /wp-json/yoast/v1/posts/{post_id}
{
  "yoast_meta": {
    "opengraph-image": "https://immoservices971.com/wp-content/uploads/.../featured.jpg"
  }
}
```

## Calendrier éditorial — Template JSON

Structure pour gérer les 4 articles/mois planifiés :

```json
{
  "nom_site": "ImmoServices971",
  "url_site": "https://immoservices971.com",
  "mois": "2026-03",
  "articles": [
    {
      "id": "2026-03-w1",
      "semaine": 1,
      "date_publication": "2026-03-02 09:00",
      "type": "pilier",
      "theme": "Construction",
      "titre": "Prix de construction d'une maison en Guadeloupe : guide complet 2026",
      "mot_cle": "prix construction guadeloupe",
      "statut": "planifie",
      "redacteur": "redacteur-seo-971",
      "markdown_path": "articles/2026-03-prix-construction.md",
      "image_une": "articles/2026-03-prix-construction-featured.jpg",
      "categorie": "Construction",
      "tags": ["construction", "prix", "guide"],
      "cible_trafic": "3000+ visites/mois",
      "notes": "Article pilier, 2500+ mots, tableaux de prix"
    },
    {
      "id": "2026-03-w2",
      "semaine": 2,
      "date_publication": "2026-03-09 09:00",
      "type": "pratique",
      "theme": "Artisans/BTP",
      "titre": "Comment choisir un maçon en Guadeloupe : guide du client",
      "mot_cle": "choisir maçon guadeloupe",
      "statut": "redige",
      "redacteur": "redacteur-seo-971",
      "markdown_path": "articles/2026-03-choisir-maçon.md",
      "image_une": null,
      "categorie": "Artisans",
      "tags": ["artisans", "BTP", "maçon"],
      "cible_trafic": "1000+ visites/mois",
      "notes": "Conversion annuaire forte, CTA pro"
    },
    {
      "id": "2026-03-w3",
      "semaine": 3,
      "date_publication": "2026-03-16 09:00",
      "type": "expert",
      "theme": "Urbanisme/PLU",
      "titre": "Terrain en zone AU (extension urbaine) : constructibilité et délais en Guadeloupe",
      "mot_cle": "zone AU guadeloupe",
      "statut": "redige",
      "redacteur": "redacteur-seo-971",
      "markdown_path": "articles/2026-03-zone-AU.md",
      "image_une": "articles/2026-03-zone-AU-featured.jpg",
      "categorie": "Urbanisme",
      "tags": ["PLU", "urbanisme", "zone AU", "constructibilite"],
      "cible_trafic": "800+ visites/mois",
      "notes": "Conversion KCI moyenne, encadrés d'expertise"
    },
    {
      "id": "2026-03-w4",
      "semaine": 4,
      "date_publication": "2026-03-23 09:00",
      "type": "actualite",
      "theme": "Guide pratique",
      "titre": "Frais de notaire en Guadeloupe : ce qu'il faut savoir avant d'acheter",
      "mot_cle": "frais notaire guadeloupe",
      "statut": "planifie",
      "redacteur": "redacteur-seo-971",
      "markdown_path": "articles/2026-03-frais-notaire.md",
      "image_une": null,
      "categorie": "Guide pratique",
      "tags": ["notaire", "frais", "achat immobilier"],
      "cible_trafic": "600+ visites/mois",
      "notes": "FAQ, evergreen, CTA annuaire + KCI"
    }
  ],
  "stats_mois": {
    "articles_planifies": 4,
    "articles_rediges": 2,
    "articles_publies": 1,
    "trafic_estime_total": "5000+ visites",
    "themes_couverts": ["Construction", "Artisans/BTP", "Urbanisme/PLU", "Guide pratique"]
  }
}
```

## Statuts des articles

- **`planifie`** : Article listé dans le calendrier, pas encore rédigé
- **`redige`** : Article Markdown produit par le rédacteur, en attente de publication
- **`publie`** : Article en live sur WordPress
- **`archive`** : Article ancien, retiré du calendrier actif
- **`brouillon`** : Article sauvegardé en draft sur WordPress (statut `draft`)

## Utilisation du script publish_to_wp.py

### Installation des dépendances

```bash
pip install requests markdown2 python-frontmatter
```

### Configuration

Crée un fichier `.env` (ou passe les paramètres en CLI) :

```env
WP_URL=https://immoservices971.com
WP_APP_PASSWORD=abcd efgh ijkl mnop qrst uvwx yz12
WP_USERNAME=admin
WP_API_ENDPOINT=/wp-json/wp/v2
```

### Utilisation

#### 1. Publier un article simple (brouillon)

```bash
python publish_to_wp.py \
  --markdown "articles/2026-03-prix-construction.md" \
  --status draft
```

#### 2. Publier un article avec image à la une

```bash
python publish_to_wp.py \
  --markdown "articles/2026-03-prix-construction.md" \
  --image "images/featured.jpg" \
  --status publish
```

#### 3. Planifier un article pour une date/heure future

```bash
python publish_to_wp.py \
  --markdown "articles/2026-03-prix-construction.md" \
  --image "images/featured.jpg" \
  --status future \
  --schedule "2026-03-25 09:00"
```

#### 4. Publier en lot plusieurs articles

```bash
python publish_to_wp.py \
  --batch articles/batch-2026-03.json
```

Fichier batch (JSON) :

```json
{
  "articles": [
    {
      "markdown": "articles/art1.md",
      "image": "images/art1.jpg",
      "status": "publish",
      "schedule": null
    },
    {
      "markdown": "articles/art2.md",
      "image": "images/art2.jpg",
      "status": "future",
      "schedule": "2026-03-25 09:00"
    }
  ]
}
```

### Retour du script

```json
{
  "success": true,
  "post_id": 12345,
  "post_url": "https://immoservices971.com/prix-construction-guadeloupe/",
  "status": "publish",
  "title": "Prix de construction d'une maison en Guadeloupe",
  "yoast_meta": {
    "title": "Prix de construction d'une maison en Guadeloupe - ImmoServices971",
    "metadesc": "Combien coûte...",
    "focuskw": "prix construction guadeloupe"
  },
  "featured_image_id": 5678,
  "published_at": "2026-03-18 14:30"
}
```

## Intégration avec redacteur-seo-971

Le workflow idéal :

1. **L'utilisateur demande un article** → redacteur-seo-971 produit un Markdown
2. **L'utilisateur dit "publie cet article"** → auto-publisher-wp récupère le Markdown et le publie
3. **Article en direct** sur ImmoServices971 dans les secondes qui suivent

Exemple complet dans Claude :

```
Utilisateur: "Écris-moi un article sur les normes sismiques en construction"

> redacteur-seo-971 génère article.md

Utilisateur: "Publie cet article sur le site avec une image"

> auto-publisher-wp convertit article.md en HTML, upload l'image, configure Yoast, crée le post
> ✅ Article en direct : https://immoservices971.com/normes-sismiques-construction-guadeloupe/
```

## Dépannage et cas courants

### Problème : "L'API REST n'est pas accessible"

Vérifiez :
- WordPress version >= 4.7 (REST API incluse)
- URL correcte : `https://immoservices971.com/wp-json/`
- Application Password créée et active
- Le plugin Yoast SEO est activé

### Problème : "Yoast meta ne s'enregistrent pas"

Solution :
- Vérifiez que Yoast SEO est bien activé
- Assurez-vous que l'endpoint `/wp-json/yoast/v1/` répond
- Les métadonnées peuvent nécessiter un délai avant d'être sauvegardées

### Problème : "Image à la une introuvable"

Solutions :
- Chemin du fichier image est relatif ou absolu ?
- Fichier image existe et est lisible ?
- Format supporté (JPG, PNG, WebP) ?
- Le serveur WordPress autorise les uploads ?

### Conseil : Toujours tester en draft (status: draft) avant publish

```bash
python publish_to_wp.py \
  --markdown "article.md" \
  --image "image.jpg" \
  --status draft
```

Vérifiez l'article sur WordPress, puis changez le statut en publish.

## Maintenance et monitoring

### Log des publications

Le script crée un fichier `publication_logs.json` avec l'historique :

```json
{
  "publications": [
    {
      "date": "2026-03-18 14:30:00",
      "titre": "Prix de construction d'une maison en Guadeloupe",
      "post_id": 12345,
      "url": "https://immoservices971.com/prix-construction-guadeloupe/",
      "status": "publish",
      "trafic_estime": "3000 visites/mois",
      "auteur": "redacteur-seo-971"
    }
  ]
}
```

### Dashboard des statistiques

Pour suivre la progression vers l'objectif de 4 articles/mois :

- Articles publiés ce mois : `grep publication_logs.json | count`
- Trafic organique total : `sum estimated_traffic`
- Mots-clés en ranking : consulter Google Search Console

## Prochaines étapes

1. **Configuration WordPress** : Créer l'Application Password et tester l'API
2. **Script publish_to_wp.py** : Développer et tester avec un article test
3. **Calendrier éditorial** : Créer le planning de 4 articles/mois
4. **Intégration redacteur-seo-971** : Automatiser le flux Markdown → Publish
5. **Monitoring** : Suivre le trafic et les rankings de chaque article publié

---

*Auto-Publisher WordPress — ImmoServices971 | Version 1.0*
*Créé pour automatiser la chaîne de publication SEO*
