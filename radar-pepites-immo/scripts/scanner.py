#!/usr/bin/env python3
"""
Scanner Multi-Sources — Extracteur d'annonces immobilières Guadeloupe.

Ce script est utilisé par le skill radar-pepites-immo pour extraire les données
d'annonces à partir de résultats de recherche web. Il ne fait PAS le scraping
lui-même (c'est le rôle des outils WebSearch/WebFetch du skill), mais il parse
et structure les données extraites.

Usage par le skill :
    1. Le skill utilise WebSearch pour trouver des annonces
    2. Le skill utilise WebFetch pour récupérer le contenu des pages
    3. Ce script parse le contenu HTML/texte pour extraire les champs structurés
    4. Les annonces structurées sont passées au scoring_engine.py

Ce fichier fournit aussi les templates de requêtes et les fonctions de déduplication.
"""

import json
import re
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any


# --- Templates de requêtes de recherche ---

SEARCH_QUERIES = {
    "terrains": [
        "terrain constructible vente guadeloupe 971",
        "terrain à bâtir vente guadeloupe",
        "parcelle constructible guadeloupe pas cher",
        "terrain viabilisé vente 971",
        "terrain vue mer guadeloupe vente",
    ],
    "maisons": [
        "maison à rénover vente guadeloupe",
        "maison vente guadeloupe pas cher",
        "villa vente guadeloupe 971",
        "maison créole restaurer guadeloupe",
    ],
    "immeubles": [
        "immeuble de rapport vente guadeloupe",
        "local commercial vente guadeloupe 971",
        "résidence à vendre guadeloupe",
    ],
    "encheres": [
        "vente aux enchères immobilier guadeloupe 2026",
        "vente judiciaire guadeloupe 971",
    ],
}

COMMUNES_PRIORITAIRES = [
    "Sainte-Anne", "Saint-François", "Le Gosier", "Baie-Mahault",
    "Les Abymes", "Petit-Bourg", "Deshaies", "Bouillante",
    "Capesterre-Belle-Eau", "Sainte-Rose",
]

SITE_FILTERS = {
    "leboncoin": "site:leboncoin.fr",
    "seloger": "site:seloger.com",
    "pap": "site:pap.fr",
    "bienici": "site:bienici.com",
    "logic-immo": "site:logic-immo.com",
}


def generate_search_queries(
    types: List[str] = None,
    communes: List[str] = None,
    sites: List[str] = None,
    tier: int = 1,
) -> List[str]:
    """
    Génère la liste de requêtes de recherche à exécuter.

    Args:
        types: Types de biens à chercher (terrains, maisons, immeubles, encheres)
        communes: Communes à cibler (None = toutes les prioritaires)
        sites: Sites à cibler (None = selon le tier)
        tier: Niveau de scan (1, 2 ou 3)

    Returns:
        Liste de requêtes prêtes pour WebSearch
    """
    if types is None:
        types = ["terrains", "maisons", "immeubles"]
    if communes is None:
        communes = COMMUNES_PRIORITAIRES[:5] if tier == 1 else COMMUNES_PRIORITAIRES
    if sites is None:
        if tier == 1:
            sites = ["leboncoin", "seloger", "pap"]
        elif tier == 2:
            sites = ["leboncoin", "seloger", "pap", "bienici", "logic-immo"]
        else:
            sites = list(SITE_FILTERS.keys())

    queries = []

    # Requêtes globales par type
    for t in types:
        if t in SEARCH_QUERIES:
            queries.extend(SEARCH_QUERIES[t])

    # Requêtes ciblées par commune × site
    for commune in communes:
        for site_name in sites:
            site_filter = SITE_FILTERS.get(site_name, "")
            queries.append(f"{site_filter} vente terrain {commune} guadeloupe")
            if "maisons" in types:
                queries.append(f"{site_filter} vente maison {commune} guadeloupe")

    # Dédupliquer
    return list(dict.fromkeys(queries))


def parse_annonce_from_text(text: str, url: str = "") -> Optional[Dict[str, Any]]:
    """
    Parse une annonce immobilière à partir de texte brut (résultat WebFetch ou WebSearch).

    Tente d'extraire : titre, prix, surface, commune, type de bien, description.
    """
    if not text or len(text) < 50:
        return None

    annonce = {
        "url": url,
        "titre": "",
        "prix": 0,
        "surface_terrain": None,
        "surface_habitable": None,
        "type_bien": "terrain",
        "commune": "",
        "description": text[:1000],
        "vendeur_type": "",
        "prix_baisse": False,
        "date_detection": datetime.now().isoformat(),
    }

    text_lower = text.lower()

    # --- Extraction du prix ---
    # Patterns : "150 000 €", "150000€", "150.000 €", "Prix : 150 000"
    prix_patterns = [
        r'(\d{1,3}[\s.]?\d{3}[\s.]?\d{0,3})\s*€',
        r'prix\s*:?\s*(\d{1,3}[\s.]?\d{3}[\s.]?\d{0,3})',
        r'(\d{1,3}[\s.]?\d{3}[\s.]?\d{0,3})\s*euros?',
    ]
    for pattern in prix_patterns:
        match = re.search(pattern, text_lower.replace('\xa0', ' '))
        if match:
            prix_str = match.group(1).replace(' ', '').replace('.', '').replace('\xa0', '')
            try:
                annonce["prix"] = int(prix_str)
                break
            except ValueError:
                pass

    # --- Extraction de la surface ---
    # Terrain
    terrain_patterns = [
        r'terrain\s+\w*\s*(?:de\s+)?(\d+[\s.]?\d*)\s*m[²2]',
        r'terrain\s*(?:de\s*)?(\d+[\s.]?\d*)\s*m[²2]',
        r'(\d+[\s.]?\d*)\s*m[²2]\s*(?:de\s*)?terrain',
        r'parcelle\s+\w*\s*(?:de\s+)?(\d+[\s.]?\d*)\s*m[²2]',
        r'parcelle\s*(?:de\s*)?(\d+[\s.]?\d*)\s*m[²2]',
        r'superficie\s*:?\s*(\d+[\s.]?\d*)\s*m[²2]',
        r'(\d{3,5})\s*m[²2]',  # fallback : nombre de 3-5 chiffres suivi de m²
    ]
    for pattern in terrain_patterns:
        match = re.search(pattern, text_lower)
        if match:
            surface_str = match.group(1).replace(' ', '')
            try:
                annonce["surface_terrain"] = int(surface_str)
                break
            except ValueError:
                pass

    # Surface habitable
    habitable_patterns = [
        r'(\d+[\s]?\d*)\s*m[²2]\s*habitable',
        r'surface\s*habitable\s*:?\s*(\d+[\s]?\d*)',
        r'(\d+)\s*m[²2]',  # fallback générique
    ]
    for pattern in habitable_patterns:
        match = re.search(pattern, text_lower)
        if match:
            surface_str = match.group(1).replace(' ', '')
            try:
                val = int(surface_str)
                if val < 1000:  # probablement habitable si < 1000m²
                    annonce["surface_habitable"] = val
                    break
            except ValueError:
                pass

    # --- Type de bien ---
    if any(mot in text_lower for mot in ["terrain", "parcelle", "foncier", "lot"]):
        annonce["type_bien"] = "terrain"
    elif any(mot in text_lower for mot in ["maison", "villa", "bungalow", "case"]):
        annonce["type_bien"] = "maison"
    elif any(mot in text_lower for mot in ["appartement", "f2", "f3", "f4", "t2", "t3"]):
        annonce["type_bien"] = "appartement"
    elif any(mot in text_lower for mot in ["immeuble", "rapport", "collectif"]):
        annonce["type_bien"] = "immeuble"
    elif any(mot in text_lower for mot in ["local", "commercial", "bureau"]):
        annonce["type_bien"] = "local"

    # --- Commune ---
    communes_971 = [
        "Les Abymes", "Anse-Bertrand", "Baie-Mahault", "Baillif", "Basse-Terre",
        "Bouillante", "Capesterre-Belle-Eau", "Capesterre-de-Marie-Galante",
        "Deshaies", "Gourbeyre", "Goyave", "Grand-Bourg", "Lamentin",
        "Le Gosier", "Le Moule", "Morne-à-l'Eau", "Petit-Bourg", "Petit-Canal",
        "Pointe-à-Pitre", "Pointe-Noire", "Port-Louis", "Saint-Claude",
        "Saint-François", "Saint-Louis", "Sainte-Anne", "Sainte-Rose",
        "Terre-de-Bas", "Terre-de-Haut", "Trois-Rivières", "Vieux-Fort",
        "Vieux-Habitants", "La Désirade",
    ]
    for commune in communes_971:
        if commune.lower() in text_lower or commune.lower().replace("-", " ") in text_lower:
            annonce["commune"] = commune
            break

    # --- Vendeur type ---
    if any(mot in text_lower for mot in ["particulier", "de particulier", "entre particuliers"]):
        annonce["vendeur_type"] = "particulier"
    elif any(mot in text_lower for mot in ["agence", "agent", "immobilier", "cabinet"]):
        annonce["vendeur_type"] = "agence"

    # --- Prix en baisse ---
    if any(mot in text_lower for mot in ["baisse de prix", "prix réduit", "prix en baisse", "négociable"]):
        annonce["prix_baisse"] = True

    # --- Titre (première ligne significative ou extraction) ---
    lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
    if lines:
        annonce["titre"] = lines[0][:120]

    return annonce


def deduplicate_annonces(annonces: List[Dict]) -> List[Dict]:
    """
    Élimine les doublons basés sur un hash de (titre normalisé + commune + prix).
    """
    seen = set()
    unique = []

    for a in annonces:
        # Créer un identifiant unique
        key_parts = [
            a.get("commune", "").lower().strip(),
            str(a.get("prix", 0)),
            re.sub(r'\s+', ' ', a.get("titre", "").lower().strip())[:50],
        ]
        key = hashlib.md5("|".join(key_parts).encode()).hexdigest()

        if key not in seen:
            seen.add(key)
            unique.append(a)

    return unique


def filter_annonces(annonces: List[Dict], max_age_days: int = 60) -> List[Dict]:
    """
    Filtre les annonces selon les critères d'exclusion automatique.
    """
    filtered = []
    for a in annonces:
        # Exclure prix = 0
        if a.get("prix", 0) <= 0:
            continue

        # Exclure sans commune identifiée
        if not a.get("commune"):
            continue

        # Exclure hors Guadeloupe (vérification basique)
        desc = a.get("description", "").lower()
        if any(mot in desc for mot in ["martinique", "guyane", "réunion", "mayotte"]) and "guadeloupe" not in desc:
            continue

        filtered.append(a)

    return filtered


def sort_by_score(annonces_scored: List[tuple]) -> List[tuple]:
    """
    Trie les annonces scorées par score décroissant.
    annonces_scored = [(annonce_dict, ScoreResult), ...]
    """
    return sorted(annonces_scored, key=lambda x: x[1].score_final, reverse=True)


def generate_scan_report(
    annonces_scored: List[tuple],
    seuil: float = 8.0,
    date_scan: str = None,
) -> str:
    """
    Génère le rapport de scan en Markdown.

    Args:
        annonces_scored: Liste de tuples (annonce, ScoreResult)
        seuil: Score minimum pour apparaître dans le rapport
        date_scan: Date du scan (auto si None)
    """
    if date_scan is None:
        date_scan = datetime.now().strftime("%d/%m/%Y à %H:%M")

    pepites = [(a, s) for a, s in annonces_scored if s.score_final >= seuil]
    total = len(annonces_scored)

    report = f"""## 🔍 Radar Pépites KCI — Scan du {date_scan}

**Annonces analysées** : {total}
**Pépites détectées (≥ {seuil}/10)** : {len(pepites)}
**Score max** : {max((s.score_final for _, s in annonces_scored), default=0)}/10

---

"""

    if not pepites:
        report += """### Aucune pépite détectée lors de ce scan

Pas d'annonce au-dessus du seuil {}/10 pour le moment. Les opportunités exceptionnelles sont rares — c'est ce qui les rend précieuses. Le radar continue de surveiller.

**Suggestions** :
- Abaisser le seuil à 7.0 pour voir les annonces "intéressantes"
- Élargir la recherche à d'autres communes
- Lancer un scan sur les ventes aux enchères (Tier 3)
""".format(seuil)
    else:
        for annonce, result in pepites:
            from scoring_engine import format_score_markdown
            report += format_score_markdown(annonce, result)
            report += "\n---\n\n"

    # Résumé statistique
    if annonces_scored:
        communes_count = {}
        for a, _ in annonces_scored:
            c = a.get("commune", "Inconnue")
            communes_count[c] = communes_count.get(c, 0) + 1

        top_communes = sorted(communes_count.items(), key=lambda x: x[1], reverse=True)[:5]

        report += "### 📊 Statistiques du scan\n\n"
        report += f"| Commune | Nb annonces |\n|---------|-------------|\n"
        for commune, count in top_communes:
            report += f"| {commune} | {count} |\n"

    return report


# --- Point d'entrée pour tests ---
if __name__ == "__main__":
    # Test du parser
    test_text = """
    Terrain constructible de 1500 m² à Sainte-Anne, Guadeloupe.
    Prix : 180 000 €. Terrain plat, viabilisé, vue mer.
    Proche plage et commerces. Vente de particulier.
    CU positif obtenu. Idéal pour construction de villa ou division en 2 lots.
    """

    annonce = parse_annonce_from_text(test_text, "https://example.com/annonce/123")
    if annonce:
        print(json.dumps(annonce, indent=2, ensure_ascii=False))

    # Test des requêtes
    queries = generate_search_queries(types=["terrains"], tier=1)
    print(f"\n{len(queries)} requêtes générées pour tier 1 terrains:")
    for q in queries[:5]:
        print(f"  - {q}")
