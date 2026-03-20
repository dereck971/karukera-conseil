#!/usr/bin/env python3
"""
KCI Scoring Engine — Moteur de scoring automatique pour le Radar Pépites Immo.

Ce script calcule le score KCI d'une annonce immobilière sur 10
en pondérant 6 critères selon la méthodologie KCI.

Usage:
    from scoring_engine import score_annonce, ScoreResult

    result = score_annonce({
        "prix": 150000,
        "surface_terrain": 800,
        "surface_habitable": None,
        "type_bien": "terrain",
        "commune": "sainte-anne",
        "description": "Terrain constructible vue mer...",
        "vendeur_type": "particulier",
        "prix_baisse": False,
    })

    print(result.score_final)  # 8.3
    print(result.verdict)      # "⭐ TRÈS ATTRACTIF"
"""

import json
import os
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

# --- Prix de référence (fallback si base KCI indisponible) ---

PRIX_MEDIAN_TERRAIN = {
    "saint-francois": 180, "sainte-anne": 160, "le-gosier": 200, "deshaies": 150,
    "baie-mahault": 140, "petit-bourg": 100, "les-abymes": 120, "le-moule": 90,
    "sainte-rose": 80, "capesterre-belle-eau": 85, "pointe-a-pitre": 150,
    "gourbeyre": 90, "saint-claude": 110, "basse-terre": 95, "trois-rivieres": 80,
    "bouillante": 70, "morne-a-leau": 60, "petit-canal": 50, "port-louis": 55,
    "anse-bertrand": 65, "lamentin": 70, "goyave": 75, "baillif": 60,
    "vieux-habitants": 55, "pointe-noire": 65, "grand-bourg": 40,
    "capesterre-de-marie-galante": 35, "saint-louis": 35, "terre-de-haut": 300,
    "terre-de-bas": 120, "la-desirade": 50, "vieux-fort": 60,
}

PRIX_MEDIAN_BATI = {
    "saint-francois": 2800, "sainte-anne": 2600, "le-gosier": 2900, "deshaies": 2500,
    "baie-mahault": 2400, "petit-bourg": 1800, "les-abymes": 2000, "le-moule": 1600,
    "sainte-rose": 1500, "capesterre-belle-eau": 1500, "pointe-a-pitre": 1800,
    "gourbeyre": 1400, "saint-claude": 2000, "basse-terre": 1600, "trois-rivieres": 1400,
    "bouillante": 1400, "morne-a-leau": 1200, "petit-canal": 1000, "port-louis": 1100,
    "anse-bertrand": 1200, "lamentin": 1300, "goyave": 1300, "baillif": 1100,
    "vieux-habitants": 1100, "pointe-noire": 1200,
}

LIQUIDITE_COMMUNE = {
    "le-gosier": 9, "sainte-anne": 9, "saint-francois": 8, "baie-mahault": 8,
    "les-abymes": 7, "deshaies": 7, "petit-bourg": 6, "le-moule": 6,
    "sainte-rose": 5, "capesterre-belle-eau": 5, "basse-terre": 4, "bouillante": 5,
    "pointe-a-pitre": 5, "saint-claude": 5, "trois-rivieres": 4, "gourbeyre": 4,
    "morne-a-leau": 3, "petit-canal": 3, "port-louis": 3, "anse-bertrand": 4,
    "lamentin": 3, "goyave": 4, "grand-bourg": 3, "terre-de-haut": 4,
}

COMMUNES_TOURISTIQUES = {"sainte-anne", "saint-francois", "le-gosier", "deshaies", "terre-de-haut", "bouillante"}
COMMUNES_DYNAMIQUES = {"baie-mahault", "les-abymes", "petit-bourg", "le-moule", "pointe-a-pitre"}
COMMUNES_EMERGENTES = {"sainte-rose", "capesterre-belle-eau", "anse-bertrand", "le-moule"}

# --- Loyers mensuels de référence (T3, en €) pour calcul rendement ---
LOYER_REF_T3 = {
    "le-gosier": 900, "sainte-anne": 850, "saint-francois": 850, "baie-mahault": 800,
    "les-abymes": 700, "petit-bourg": 650, "le-moule": 600, "sainte-rose": 550,
    "capesterre-belle-eau": 550, "basse-terre": 600, "saint-claude": 650,
    "bouillante": 500, "pointe-a-pitre": 650,
}


@dataclass
class SousScore:
    """Un sous-score individuel avec sa justification."""
    critere: str
    note: float
    coefficient: float
    commentaire: str


@dataclass
class ScoreResult:
    """Résultat complet du scoring d'une annonce."""
    score_final: float
    verdict: str
    couleur: str
    sous_scores: list = field(default_factory=list)
    alertes: list = field(default_factory=list)
    action_recommandee: str = ""
    confiance: str = "Moyenne"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score_final": self.score_final,
            "verdict": self.verdict,
            "couleur": self.couleur,
            "sous_scores": [
                {"critere": s.critere, "note": s.note, "coefficient": s.coefficient, "commentaire": s.commentaire}
                for s in self.sous_scores
            ],
            "alertes": self.alertes,
            "action_recommandee": self.action_recommandee,
            "confiance": self.confiance,
        }


def slugify_commune(commune: str) -> str:
    """Convertit un nom de commune en slug."""
    import unicodedata
    slug = commune.lower().strip()
    # Remplacer les accents
    slug = unicodedata.normalize("NFD", slug)
    slug = "".join(c for c in slug if unicodedata.category(c) != "Mn")
    # Remplacer espaces et apostrophes par des tirets
    for char in [" ", "'", "'"]:
        slug = slug.replace(char, "-")
    # Nettoyer les tirets multiples
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def _score_prix(annonce: dict, commune_slug: str) -> SousScore:
    """Critère 1 : Attractivité du prix (coeff 2.5)."""
    prix = annonce.get("prix", 0)
    surface = annonce.get("surface_terrain") or annonce.get("surface_habitable") or 0
    type_bien = annonce.get("type_bien", "terrain").lower()

    if prix <= 0 or surface <= 0:
        return SousScore("Prix", 5.0, 2.5, "Données insuffisantes pour évaluer le prix")

    prix_m2 = prix / surface

    # Choisir la référence selon le type de bien
    if type_bien == "terrain":
        ref = PRIX_MEDIAN_TERRAIN.get(commune_slug, 100)
    else:
        ref = PRIX_MEDIAN_BATI.get(commune_slug, 1800)

    if ref <= 0:
        return SousScore("Prix", 5.0, 2.5, "Pas de référence de prix pour cette commune")

    decote_pct = ((ref - prix_m2) / ref) * 100

    if decote_pct >= 30:
        note = 10.0
        comm = f"Décote exceptionnelle de {decote_pct:.0f}% ({prix_m2:.0f}€/m² vs {ref}€/m² médian)"
    elif decote_pct >= 20:
        note = 9.0
        comm = f"Forte décote de {decote_pct:.0f}% ({prix_m2:.0f}€/m² vs {ref}€/m²)"
    elif decote_pct >= 10:
        note = 8.0
        comm = f"Bonne décote de {decote_pct:.0f}% ({prix_m2:.0f}€/m² vs {ref}€/m²)"
    elif decote_pct >= 5:
        note = 7.0
        comm = f"Légère décote de {decote_pct:.0f}% ({prix_m2:.0f}€/m² vs {ref}€/m²)"
    elif decote_pct >= -5:
        note = 5.5
        comm = f"Prix dans la moyenne du marché ({prix_m2:.0f}€/m² vs {ref}€/m²)"
    elif decote_pct >= -15:
        note = 3.5
        comm = f"Surcote de {abs(decote_pct):.0f}% ({prix_m2:.0f}€/m² vs {ref}€/m²)"
    else:
        note = 1.5
        comm = f"Forte surcote de {abs(decote_pct):.0f}% ({prix_m2:.0f}€/m² vs {ref}€/m²)"

    return SousScore("Prix", note, 2.5, comm)


def _score_emplacement(annonce: dict, commune_slug: str) -> SousScore:
    """Critère 2 : Qualité de l'emplacement (coeff 2.0)."""
    desc = (annonce.get("description", "") + " " + annonce.get("titre", "")).lower()
    note = 5.0
    raisons = []

    # Tier de commune
    if commune_slug in COMMUNES_TOURISTIQUES:
        note = 8.0
        raisons.append("commune touristique premium")
    elif commune_slug in COMMUNES_DYNAMIQUES:
        note = 7.0
        raisons.append("commune dynamique")
    elif commune_slug in COMMUNES_EMERGENTES:
        note = 6.0
        raisons.append("commune émergente")
    else:
        note = 4.5
        raisons.append("commune secondaire/rurale")

    # Bonus textuels
    if any(mot in desc for mot in ["vue mer", "bord de mer", "front de mer", "pieds dans l'eau", "ocean"]):
        note = min(10.0, note + 1.5)
        raisons.append("vue/accès mer")
    if any(mot in desc for mot in ["plage", "datcha", "bourg", "centre"]):
        note = min(10.0, note + 0.5)
        raisons.append("proximité commodités/plage")
    if any(mot in desc for mot in ["vue montagne", "vue dégagée", "panoramique"]):
        note = min(10.0, note + 0.5)
        raisons.append("vue dégagée")
    if any(mot in desc for mot in ["isolé", "enclavé", "difficile d'accès", "piste", "chemin de terre"]):
        note = max(1.0, note - 2.0)
        raisons.append("⚠️ accès difficile")

    return SousScore("Emplacement", round(note, 1), 2.0, ", ".join(raisons).capitalize())


def _score_potentiel(annonce: dict, commune_slug: str) -> SousScore:
    """Critère 3 : Potentiel constructible / valorisable (coeff 2.0)."""
    desc = (annonce.get("description", "") + " " + annonce.get("titre", "")).lower()
    type_bien = annonce.get("type_bien", "terrain").lower()
    surface = annonce.get("surface_terrain") or 0
    note = 5.0
    raisons = []

    if type_bien == "terrain":
        # Plus le terrain est grand, plus il est divisible
        if surface >= 2000:
            note = 9.0
            raisons.append(f"grand terrain {surface}m² — divisible en 3+ lots")
        elif surface >= 1000:
            note = 8.0
            raisons.append(f"terrain {surface}m² — divisible en 2 lots")
        elif surface >= 500:
            note = 6.5
            raisons.append(f"terrain {surface}m² — construction classique")
        else:
            note = 4.0
            raisons.append(f"petit terrain {surface}m² — potentiel limité")

        # Bonus constructibilité
        if any(mot in desc for mot in ["constructible", "viabilisé", "cu positif", "permis obtenu"]):
            note = min(10.0, note + 1.0)
            raisons.append("constructible confirmé")
        if any(mot in desc for mot in ["r+2", "r+1", "collectif", "immeuble possible"]):
            note = min(10.0, note + 1.0)
            raisons.append("densification possible")

    elif type_bien in ["maison", "villa"]:
        if any(mot in desc for mot in ["à rénover", "travaux", "à rafraîchir", "potentiel"]):
            note = 7.5
            raisons.append("rénovation = plus-value")
        elif any(mot in desc for mot in ["ruine", "inhabitable", "démolir"]):
            note = 6.0
            raisons.append("reconstruction potentielle")
        else:
            note = 5.0
            raisons.append("état standard")

        # Terrain associé
        terrain = annonce.get("surface_terrain", 0)
        if terrain and terrain >= 1000:
            note = min(10.0, note + 1.5)
            raisons.append(f"grand terrain {terrain}m² — extension/division possible")

    elif type_bien in ["immeuble", "local"]:
        note = 7.5
        raisons.append("immeuble de rapport — rendement locatif")
        if "commercial" in desc:
            note = 7.0
            raisons.append("usage commercial")

    # Malus
    if any(mot in desc for mot in ["non constructible", "zone agricole", "zone naturelle", "zone n"]):
        note = max(1.0, note - 4.0)
        raisons.append("⚠️ non constructible ou zone restrictive")

    return SousScore("Potentiel", round(note, 1), 2.0, ", ".join(raisons).capitalize())


def _score_economie(annonce: dict, commune_slug: str) -> SousScore:
    """Critère 4 : Cohérence économique (coeff 1.5)."""
    prix = annonce.get("prix", 0)
    surface_t = annonce.get("surface_terrain") or 0
    surface_h = annonce.get("surface_habitable") or 0
    type_bien = annonce.get("type_bien", "terrain").lower()
    note = 5.0
    raison = ""

    if prix <= 0:
        return SousScore("Économie", 5.0, 1.5, "Prix non disponible")

    if type_bien == "terrain" and surface_t > 0:
        # Estimation : division parcellaire
        nb_lots = max(1, surface_t // 500)
        prix_revente_lot = PRIX_MEDIAN_TERRAIN.get(commune_slug, 100) * 500 * 1.15  # +15% marge après viabilisation
        revente_total = prix_revente_lot * nb_lots
        frais = prix * 0.08  # notaire
        viabilisation = nb_lots * 25000  # 25K€/lot estimé
        cout_total = prix + frais + viabilisation
        marge_pct = ((revente_total - cout_total) / cout_total) * 100 if cout_total > 0 else 0

        if marge_pct > 40:
            note = 9.5
        elif marge_pct > 25:
            note = 8.0
        elif marge_pct > 15:
            note = 6.0
        elif marge_pct > 5:
            note = 4.0
        else:
            note = 2.0
        raison = f"Division en {nb_lots} lots — marge estimée {marge_pct:.0f}%"

    elif type_bien in ["maison", "villa"] and surface_h > 0:
        # Estimation rendement locatif
        loyer_mensuel = LOYER_REF_T3.get(commune_slug, 600)
        # Ajuster selon la surface
        if surface_h < 40:
            loyer_mensuel *= 0.65
        elif surface_h > 100:
            loyer_mensuel *= 1.3
        rendement_brut = (loyer_mensuel * 12 / prix) * 100 if prix > 0 else 0

        if rendement_brut > 10:
            note = 9.5
        elif rendement_brut > 8:
            note = 8.5
        elif rendement_brut > 6:
            note = 6.5
        elif rendement_brut > 4:
            note = 4.5
        else:
            note = 2.5
        raison = f"Rendement brut estimé {rendement_brut:.1f}% (loyer ~{loyer_mensuel:.0f}€/mois)"

    elif type_bien in ["immeuble", "local"]:
        # Pour les immeubles, estimer un rendement plus élevé
        loyer_base = LOYER_REF_T3.get(commune_slug, 600) * 1.5  # plusieurs unités
        rendement = (loyer_base * 12 / prix) * 100 if prix > 0 else 0
        if rendement > 8:
            note = 9.0
        elif rendement > 6:
            note = 7.5
        else:
            note = 5.0
        raison = f"Immeuble — rendement estimé {rendement:.1f}%"
    else:
        raison = "Type de bien ou données insuffisantes pour estimation financière"

    return SousScore("Économie", round(note, 1), 1.5, raison)


def _score_risque(annonce: dict, commune_slug: str) -> SousScore:
    """Critère 5 : Niveau de risque global (coeff 1.0, inversé : bas risque = haut score)."""
    desc = (annonce.get("description", "") + " " + annonce.get("titre", "")).lower()
    note = 7.0  # Par défaut risque modéré en Guadeloupe (zone sismique 5)
    risques = []

    # Toute la Guadeloupe est zone sismique 5 — c'est un baseline
    risques.append("zone sismique 5 (standard Guadeloupe)")

    # Bonus sécurité
    if any(mot in desc for mot in ["viabilisé", "plat", "sans risque", "hors ppri"]):
        note = min(10.0, note + 1.5)
        risques.append("terrain sécurisé (plat/viabilisé/hors PPRI)")
    if any(mot in desc for mot in ["constructible", "cu obtenu", "permis délivré"]):
        note = min(10.0, note + 1.0)
        risques.append("constructibilité confirmée")

    # Malus risques
    if any(mot in desc for mot in ["zone inondable", "ppri", "inondation"]):
        note = max(1.0, note - 3.0)
        risques.append("⚠️ zone inondable / PPRI")
    if any(mot in desc for mot in ["forte pente", "ravin", "ravine", "talus"]):
        note = max(1.0, note - 2.0)
        risques.append("⚠️ pente forte / ravin")
    if any(mot in desc for mot in ["indivision", "succession", "litige", "contentieux"]):
        note = max(1.0, note - 3.0)
        risques.append("⚠️ problème juridique (indivision/litige)")
    if any(mot in desc for mot in ["non viabilisé", "pas d'accès", "enclavé"]):
        note = max(1.0, note - 2.0)
        risques.append("⚠️ non viabilisé / enclavé")
    if any(mot in desc for mot in ["zone naturelle", "zone agricole", "non constructible"]):
        note = max(1.0, note - 4.0)
        risques.append("⚠️ NON CONSTRUCTIBLE")

    return SousScore("Risque", round(note, 1), 1.0, "; ".join(risques))


def _score_liquidite(annonce: dict, commune_slug: str) -> SousScore:
    """Critère 6 : Liquidité du marché local (coeff 1.0)."""
    note = LIQUIDITE_COMMUNE.get(commune_slug, 4.0)
    type_bien = annonce.get("type_bien", "terrain").lower()

    # Ajustement par type de bien
    if type_bien == "terrain":
        note = min(10.0, note + 0.5)  # terrains se vendent mieux que bâti en Guadeloupe
        comm = f"Liquidité commune {note:.0f}/10 — terrains en bonne demande"
    elif type_bien in ["maison", "villa"]:
        comm = f"Liquidité commune {note:.0f}/10"
    elif type_bien in ["immeuble", "local"]:
        note = max(1.0, note - 1.0)  # immeubles plus longs à vendre
        comm = f"Liquidité commune {note:.0f}/10 — immeubles/locaux plus lents"
    else:
        comm = f"Liquidité commune {note:.0f}/10"

    return SousScore("Liquidité", float(note), 1.0, comm)


def score_annonce(annonce: dict) -> ScoreResult:
    """
    Calcul complet du score KCI pour une annonce.

    Args:
        annonce: dict avec les clés : prix, surface_terrain, surface_habitable,
                 type_bien, commune, description, vendeur_type, prix_baisse

    Returns:
        ScoreResult avec le score final, verdict, et détails
    """
    commune_slug = slugify_commune(annonce.get("commune", ""))

    # Calculer les 6 sous-scores
    ss_prix = _score_prix(annonce, commune_slug)
    ss_emplacement = _score_emplacement(annonce, commune_slug)
    ss_potentiel = _score_potentiel(annonce, commune_slug)
    ss_economie = _score_economie(annonce, commune_slug)
    ss_risque = _score_risque(annonce, commune_slug)
    ss_liquidite = _score_liquidite(annonce, commune_slug)

    sous_scores = [ss_prix, ss_emplacement, ss_potentiel, ss_economie, ss_risque, ss_liquidite]

    # Calcul pondéré
    somme_ponderee = sum(s.note * s.coefficient for s in sous_scores)
    somme_coeffs = sum(s.coefficient for s in sous_scores)  # = 10.0
    score_brut = somme_ponderee / somme_coeffs

    # Bonus vendeur particulier
    alertes = []
    if annonce.get("vendeur_type", "").lower() == "particulier":
        score_brut += 0.3
        alertes.append("Bonus +0.3 : vendeur particulier (pas de commission)")

    # Bonus prix en baisse
    if annonce.get("prix_baisse"):
        score_brut += 0.5
        alertes.append("Bonus +0.5 : prix en baisse (vendeur motivé)")

    # Alerte décote anormale
    prix = annonce.get("prix", 0)
    surface = annonce.get("surface_terrain") or annonce.get("surface_habitable") or 0
    if prix > 0 and surface > 0:
        prix_m2 = prix / surface
        type_bien = annonce.get("type_bien", "terrain").lower()
        ref = PRIX_MEDIAN_TERRAIN.get(commune_slug, 100) if type_bien == "terrain" else PRIX_MEDIAN_BATI.get(commune_slug, 1800)
        if ref > 0:
            decote = ((ref - prix_m2) / ref) * 100
            if decote > 40:
                alertes.append(f"⚠️ Décote anormale ({decote:.0f}%) — vérifier vice caché ou problème juridique")

    # Plafonner à 10
    score_final = round(min(10.0, max(0.0, score_brut)), 1)

    # Verdict
    if score_final >= 9.0:
        verdict = "🔥 PÉPITE EXCEPTIONNELLE"
        couleur = "#2A9D6C"
        action = "Alerte immédiate — contacter le vendeur AUJOURD'HUI + commander rapport KCI Premium 299€"
    elif score_final >= 8.0:
        verdict = "⭐ TRÈS ATTRACTIF"
        couleur = "#2A9D6C"
        action = "Prioritaire — commander rapport KCI Complète 129€ + programmer visite"
    elif score_final >= 7.0:
        verdict = "✅ INTÉRESSANT"
        couleur = "#D48A1A"
        action = "À suivre — commander rapport KCI Essentielle 49€ si le bien reste disponible"
    elif score_final >= 5.5:
        verdict = "⚠️ SOUS CONDITIONS"
        couleur = "#D48A1A"
        action = "Pas d'action immédiate — surveiller si le prix baisse"
    else:
        verdict = "❌ À ÉVITER"
        couleur = "#C43B2E"
        action = "Passer — le projet ne présente pas un profil d'investissement favorable"

    # Confiance
    criteres_evalues = sum(1 for s in sous_scores if "insuffisant" not in s.commentaire.lower())
    if criteres_evalues >= 5:
        confiance = "Élevée"
    elif criteres_evalues >= 3:
        confiance = "Moyenne"
    else:
        confiance = "Faible"

    return ScoreResult(
        score_final=score_final,
        verdict=verdict,
        couleur=couleur,
        sous_scores=sous_scores,
        alertes=alertes,
        action_recommandee=action,
        confiance=confiance,
    )


def format_score_markdown(annonce: dict, result: ScoreResult) -> str:
    """Formate le résultat du scoring en Markdown lisible."""
    titre = annonce.get("titre", "Annonce sans titre")
    commune = annonce.get("commune", "?")
    prix = annonce.get("prix", 0)
    surface = annonce.get("surface_terrain") or annonce.get("surface_habitable") or 0
    url = annonce.get("url", "")

    output = f"""### {result.verdict} — {result.score_final}/10 — {titre}
📍 {commune}, Guadeloupe | 💰 {prix:,.0f} € | 📐 {surface:,.0f} m²
🔗 {url}

**Confiance** : {result.confiance}

| Critère | Note | Coeff | Commentaire |
|---------|------|-------|-------------|
"""
    for s in result.sous_scores:
        output += f"| {s.critere} | {s.note}/10 | ×{s.coefficient} | {s.commentaire} |\n"

    if result.alertes:
        output += "\n**Alertes** :\n"
        for a in result.alertes:
            output += f"- {a}\n"

    output += f"\n**👉 Action recommandée** : {result.action_recommandee}\n"

    return output


# --- Exécution standalone pour tests ---
if __name__ == "__main__":
    # Test avec une annonce fictive
    test_annonce = {
        "titre": "Terrain constructible 1200m² vue mer - Sainte-Anne",
        "url": "https://www.leboncoin.fr/ventes_immobilieres/12345.htm",
        "prix": 120000,
        "type_bien": "terrain",
        "surface_terrain": 1200,
        "surface_habitable": None,
        "commune": "Sainte-Anne",
        "description": "Magnifique terrain constructible de 1200m² avec vue mer, plat, viabilisé, proche plage du bourg. CU positif.",
        "vendeur_type": "particulier",
        "prix_baisse": False,
    }

    result = score_annonce(test_annonce)
    print(format_score_markdown(test_annonce, result))
    print(f"\n--- Score final : {result.score_final}/10 ---")
    print(f"--- Verdict : {result.verdict} ---")
