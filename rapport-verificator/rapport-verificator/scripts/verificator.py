#!/usr/bin/env python3
"""
KCI Rapport Verificator — Contrôle Qualité Post-Production
Analyse un rapport KCI (PDF et/ou HTML source) et produit un diagnostic JSON structuré.

Usage:
    python3 verificator.py --input rapport.pdf [--html source.html] [--offre 49|129|299] [--client NomClient]
"""

import argparse
import json
import re
import sys
import os
from datetime import datetime
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────

VALID_OFFRES = {"Essentielle": "49", "Complete": "129", "Premium": "299"}

# Chaînes résiduelles interdites (données d'anciens rapports de test)
RESIDUAL_STRINGS = [
    "Le Gosier", "Florence", "T10/F10", "1 358 €/m²", "62%",
    "bi-locatif", "327k€", "320–340 k€", "KCI-2026-001",
    "265 m²", "360 000", "1 302 m²", "1990 Rafraîchissement"
]

# Formulations interdites
FORBIDDEN_PHRASES = [
    "seule stratégie viable",
    "effort financier quasi nul",
    "excellent investissement",
    "le projet est rentable",
    "La Soufrière",
    "volcan",
    "volcanique",
    "volcanisme",
]

# Grille score → verdict → couleur
SCORE_VERDICT_MAP = [
    (8.0, 10.1, "TRÈS ATTRACTIF", "g"),
    (7.0, 8.0, "INTÉRESSANT SOUS CONDITIONS", "g"),
    (5.5, 7.0, "SOUS CONDITIONS STRICTES", "o"),
    (5.0, 5.5, "TRÈS RISQUÉ", "ro"),
    (0.0, 5.0, "À ÉVITER EN L'ÉTAT", "r"),
]

# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path):
    """Extrait le texte brut d'un PDF via pdfplumber ou pymupdf."""
    try:
        import pdfplumber
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n--- PAGE BREAK ---\n"
        return text, len(list(pdfplumber.open(pdf_path).pages))
    except ImportError:
        pass
    try:
        import fitz  # pymupdf
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n--- PAGE BREAK ---\n"
        return text, len(doc)
    except ImportError:
        pass
    raise ImportError("Installer pdfplumber ou pymupdf pour extraire le texte PDF")


def parse_filename(filename):
    """Parse un nom de fichier KCI et retourne les métadonnées."""
    # Format standard: KCI_Rapport_[Offre]_[Nom]_[DateAAMMJJ].pdf
    # Format v4: KCI_Rapport_[Offre]_[Nom]_[DateAAMMJJ]_v4.pdf
    patterns = [
        r'^KCI_Rapport_(Essentielle|Complete|Premium)_([A-Za-z]+)_(\d{6})(?:_v\d+)?\.pdf$',
    ]
    for pat in patterns:
        m = re.match(pat, filename)
        if m:
            return {
                "offre_label": m.group(1),
                "client": m.group(2),
                "date_code": m.group(3),
            }
    return None


def get_expected_verdict(score):
    """Retourne le verdict et la classe CSS attendus pour un score donné."""
    for low, high, verdict, css_class in SCORE_VERDICT_MAP:
        if low <= score < high:
            return verdict, css_class
    return None, None


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 1 : NOMENCLATURE & MÉTADONNÉES
# ──────────────────────────────────────────────────────────────────────────────

def check_nomenclature(filename, pdf_text, offre_override=None, client_override=None):
    results = []
    meta = parse_filename(filename)

    if meta is None:
        results.append({
            "id": "N1", "module": "Nomenclature",
            "check": "Format nom de fichier",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": f"Le nom '{filename}' ne respecte pas le format KCI_Rapport_[Offre]_[Nom]_[DateAAMMJJ].pdf"
        })
        # Essayer de deviner l'offre depuis le contenu
        offre = offre_override
        client = client_override
    else:
        results.append({
            "id": "N1", "module": "Nomenclature",
            "check": "Format nom de fichier",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": f"Format valide : offre={meta['offre_label']}, client={meta['client']}, date={meta['date_code']}"
        })

        # N2: Offre valide
        if meta["offre_label"] in VALID_OFFRES:
            results.append({
                "id": "N2", "module": "Nomenclature",
                "check": "Offre valide",
                "status": "PASS", "severity": "BLOQUANT",
                "detail": f"Offre '{meta['offre_label']}' reconnue"
            })
        else:
            results.append({
                "id": "N2", "module": "Nomenclature",
                "check": "Offre valide",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Offre '{meta['offre_label']}' non reconnue (valides: Essentielle, Complete, Premium)"
            })

        # N3: PascalCase
        client_name = meta["client"]
        if client_name[0].isupper() and " " not in client_name:
            results.append({
                "id": "N3", "module": "Nomenclature",
                "check": "NomClient PascalCase",
                "status": "PASS", "severity": "AVERTISSEMENT",
                "detail": f"Client '{client_name}' en PascalCase"
            })
        else:
            results.append({
                "id": "N3", "module": "Nomenclature",
                "check": "NomClient PascalCase",
                "status": "FAIL", "severity": "AVERTISSEMENT",
                "detail": f"Client '{client_name}' non conforme PascalCase"
            })

        # N4: Date valide
        try:
            date_str = meta["date_code"]
            year = 2000 + int(date_str[:2])
            month = int(date_str[2:4])
            day = int(date_str[4:6])
            datetime(year, month, day)
            results.append({
                "id": "N4", "module": "Nomenclature",
                "check": "Date AAMMJJ valide",
                "status": "PASS", "severity": "BLOQUANT",
                "detail": f"Date {date_str} → {year}-{month:02d}-{day:02d}"
            })
        except (ValueError, IndexError):
            results.append({
                "id": "N4", "module": "Nomenclature",
                "check": "Date AAMMJJ valide",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Date '{meta['date_code']}' invalide"
            })

        offre = offre_override or VALID_OFFRES.get(meta["offre_label"])
        client = client_override or meta["client"]

    # N5: Cohérence offre/contenu
    if offre:
        badge_map = {"49": "ESSENTIELLE", "129": "COMPLÈTE", "299": "PREMIUM"}
        expected = badge_map.get(offre, "")
        if expected and expected.lower() in pdf_text.lower():
            results.append({
                "id": "N5", "module": "Nomenclature",
                "check": "Cohérence offre/contenu",
                "status": "PASS", "severity": "BLOQUANT",
                "detail": f"Badge '{expected}' trouvé dans le contenu"
            })
        elif expected:
            results.append({
                "id": "N5", "module": "Nomenclature",
                "check": "Cohérence offre/contenu",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Badge '{expected}' introuvable dans le contenu"
            })

    return results, offre, client


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 2 : DONNÉES RÉSIDUELLES & PLACEHOLDERS
# ──────────────────────────────────────────────────────────────────────────────

def check_residuals(content, client=None, html_content=None):
    """Vérifie les placeholders et données résiduelles."""
    results = []
    text = html_content or content

    # R1: Placeholders
    placeholders = re.findall(r'\{\{[A-Z_]+\}\}', text)
    if placeholders:
        results.append({
            "id": "R1", "module": "Résiduels",
            "check": "Placeholders {{...}}",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": f"{len(placeholders)} placeholders non remplacés : {placeholders[:5]}"
        })
    else:
        results.append({
            "id": "R1", "module": "Résiduels",
            "check": "Placeholders {{...}}",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Aucun placeholder détecté"
        })

    # R2: Données résiduelles
    found_residuals = []
    for rs in RESIDUAL_STRINGS:
        if rs.lower() in text.lower():
            # Vérifier si c'est une donnée du dossier courant
            if client and rs.lower() == client.lower():
                continue
            found_residuals.append(rs)

    if found_residuals:
        results.append({
            "id": "R2", "module": "Résiduels",
            "check": "Données résiduelles",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": f"Chaînes résiduelles détectées : {found_residuals}"
        })
    else:
        results.append({
            "id": "R2", "module": "Résiduels",
            "check": "Données résiduelles",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Aucune donnée résiduelle détectée"
        })

    # R3: Contamination inter-offres (HTML uniquement)
    if html_content:
        contaminations = []
        if "ESSENTIELLE" in html_content and "PREMIUM · 299" in html_content:
            contaminations.append("Premium dans Essentielle")
        if "PREMIUM" in html_content and "ESSENTIELLE · 49" in html_content:
            contaminations.append("Essentielle dans Premium")

        if contaminations:
            results.append({
                "id": "R3", "module": "Résiduels",
                "check": "Contamination inter-offres",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Contamination détectée : {contaminations}"
            })
        else:
            results.append({
                "id": "R3", "module": "Résiduels",
                "check": "Contamination inter-offres",
                "status": "PASS", "severity": "BLOQUANT",
                "detail": "Aucune contamination inter-offres"
            })

    return results


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 3 : COHÉRENCE FINANCIÈRE
# ──────────────────────────────────────────────────────────────────────────────

def check_financial(content):
    """Vérifie la cohérence des données financières."""
    results = []

    # F11: NaN/None
    nan_matches = re.findall(r'(?:NaN|None|undefined|inf)\s*[€%]', content)
    if nan_matches:
        results.append({
            "id": "F11", "module": "Financier",
            "check": "Pas de NaN/None",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": f"Valeurs corrompues détectées : {nan_matches}"
        })
    else:
        results.append({
            "id": "F11", "module": "Financier",
            "check": "Pas de NaN/None",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Aucune valeur NaN/None/undefined/inf"
        })

    # F12: Format montants
    # Chercher des montants sans espace milliers (ex: 360000€ au lieu de 360 000 €)
    bad_amounts = re.findall(r'\b\d{4,}\s*€', content)
    # Filtrer ceux qui ont des espaces milliers
    really_bad = [a for a in bad_amounts if not re.match(r'\d{1,3}(\s\d{3})+\s*€', a)]
    if really_bad:
        results.append({
            "id": "F12", "module": "Financier",
            "check": "Format montants",
            "status": "FAIL", "severity": "AVERTISSEMENT",
            "detail": f"Montants mal formatés (espaces milliers manquants) : {really_bad[:3]}"
        })
    else:
        results.append({
            "id": "F12", "module": "Financier",
            "check": "Format montants",
            "status": "PASS", "severity": "AVERTISSEMENT",
            "detail": "Montants correctement formatés"
        })

    # F1-F10: Vérifications arithmétiques avancées
    # Ces vérifications nécessitent d'extraire les valeurs spécifiques du rapport.
    # On les signale comme "MANUAL" si on ne peut pas les vérifier automatiquement.

    # Tenter d'extraire prix, rendements, etc.
    prix_match = re.findall(r'[Pp]rix\s*(?:demand[eé]|d[\'\u2019]acquisition)?\s*[:=]?\s*([\d\s]+)\s*€', content)
    rendement_brut = re.findall(r'[Rr]endement\s+brut\s*[:=]?\s*([\d,\.]+)\s*%', content)
    rendement_net = re.findall(r'[Rr]endement\s+net\s*[:=]?\s*([\d,\.]+)\s*%', content)

    if rendement_brut:
        for rb in rendement_brut:
            val = float(rb.replace(',', '.'))
            if val > 20:
                results.append({
                    "id": "F8", "module": "Financier",
                    "check": "Rendement brut plausible",
                    "status": "FAIL", "severity": "BLOQUANT",
                    "detail": f"Rendement brut de {val}% anormalement élevé (>20%)"
                })
            elif val < 0:
                results.append({
                    "id": "F8", "module": "Financier",
                    "check": "Rendement brut plausible",
                    "status": "FAIL", "severity": "BLOQUANT",
                    "detail": f"Rendement brut négatif ({val}%)"
                })
            else:
                results.append({
                    "id": "F8", "module": "Financier",
                    "check": "Rendement brut plausible",
                    "status": "PASS", "severity": "BLOQUANT",
                    "detail": f"Rendement brut {val}% dans la plage attendue"
                })

    if rendement_net:
        for rn in rendement_net:
            val = float(rn.replace(',', '.'))
            if val > 15:
                results.append({
                    "id": "F9", "module": "Financier",
                    "check": "Rendement net plausible",
                    "status": "FAIL", "severity": "BLOQUANT",
                    "detail": f"Rendement net de {val}% anormalement élevé (>15%)"
                })
            else:
                results.append({
                    "id": "F9", "module": "Financier",
                    "check": "Rendement net plausible",
                    "status": "PASS", "severity": "BLOQUANT",
                    "detail": f"Rendement net {val}% dans la plage attendue"
                })

    # Note: les checks F1-F7, F10 nécessitent une extraction structurée
    # qui dépend du format exact du rapport. On les marque comme INFO.
    for fid, desc in [
        ("F1", "Prix d'acquisition = prix annonce"),
        ("F2", "Frais de notaire cohérents"),
        ("F3", "Travaux = taux × surface"),
        ("F4", "MOE = % × travaux"),
        ("F5", "Total investissement = somme postes"),
        ("F6", "Revenus bruts = loyer × 12"),
        ("F7", "Revenu net = bruts − charges"),
    ]:
        results.append({
            "id": fid, "module": "Financier",
            "check": desc,
            "status": "MANUAL", "severity": "BLOQUANT",
            "detail": "Vérification manuelle requise — extraction automatique non disponible pour ce rapport"
        })

    return results


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 4 : SCORES, VERDICTS & COULEURS
# ──────────────────────────────────────────────────────────────────────────────

def check_scores(content, offre=None):
    """Vérifie la cohérence scores/verdicts/couleurs."""
    results = []

    # Extraire le score global
    score_match = re.search(r'(\d[,\.]\d)\s*/\s*10', content)
    if score_match:
        score_str = score_match.group(1).replace(',', '.')
        score = float(score_str)

        # S1: Score dans [0, 10]
        if 0 <= score <= 10:
            results.append({
                "id": "S1", "module": "Scores",
                "check": "Score dans [0, 10]",
                "status": "PASS", "severity": "BLOQUANT",
                "detail": f"Score global : {score}/10"
            })
        else:
            results.append({
                "id": "S1", "module": "Scores",
                "check": "Score dans [0, 10]",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Score {score} hors limites [0, 10]"
            })

        # S2: Verdict ↔ score
        expected_verdict, expected_class = get_expected_verdict(score)
        if expected_verdict:
            # Chercher le verdict dans le contenu
            verdict_found = expected_verdict.lower() in content.lower()
            # Aussi chercher des variantes
            if not verdict_found and "STOP" in expected_verdict:
                verdict_found = "risqué" in content.lower() and "stop" in content.lower()

            results.append({
                "id": "S2", "module": "Scores",
                "check": "Verdict ↔ score",
                "status": "PASS" if verdict_found else "FAIL",
                "severity": "BLOQUANT",
                "detail": f"Score {score} → verdict attendu '{expected_verdict}' {'trouvé' if verdict_found else 'NON TROUVÉ'}"
            })
    else:
        results.append({
            "id": "S1", "module": "Scores",
            "check": "Score dans [0, 10]",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "Score global non détecté dans le rapport"
        })

    # S4/S5: Sous-scores selon l'offre
    if offre == "49":
        # 3 sous-scores attendus
        sous_scores = re.findall(r'(\d[,\.]\d)\s*/\s*10', content)
        count = len(sous_scores) - 1  # -1 pour le score global
        if count >= 3:
            results.append({
                "id": "S5", "module": "Scores",
                "check": "3 sous-scores (49€)",
                "status": "PASS", "severity": "BLOQUANT",
                "detail": f"{count} sous-scores détectés (≥3 attendus)"
            })
        else:
            results.append({
                "id": "S5", "module": "Scores",
                "check": "3 sous-scores (49€)",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Seulement {count} sous-scores détectés (3 attendus)"
            })
    elif offre in ("129", "299"):
        sous_scores = re.findall(r'(\d[,\.]\d)\s*/\s*10', content)
        count = len(sous_scores) - 1
        if count >= 7:
            results.append({
                "id": "S4", "module": "Scores",
                "check": "7 sous-scores (129€/299€)",
                "status": "PASS", "severity": "BLOQUANT",
                "detail": f"{count} sous-scores détectés (≥7 attendus)"
            })
        else:
            results.append({
                "id": "S4", "module": "Scores",
                "check": "7 sous-scores (129€/299€)",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Seulement {count} sous-scores détectés (7 attendus)"
            })

    return results


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 5 : CONFORMITÉ FISCALE
# ──────────────────────────────────────────────────────────────────────────────

def check_fiscal(content):
    """Vérifie la conformité fiscale."""
    results = []

    # FI4: Pinel expiré
    if re.search(r'pinel', content, re.IGNORECASE):
        results.append({
            "id": "FI4", "module": "Fiscal",
            "check": "Pinel expiré",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "Mention de 'Pinel' détectée — Pinel OM expiré le 31/12/2024"
        })
    else:
        results.append({
            "id": "FI4", "module": "Fiscal",
            "check": "Pinel expiré",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Aucune mention de Pinel (dispositif expiré)"
        })

    # FI1-FI3: Vérifications croisées dispositif × stratégie
    # Nécessite identification de la stratégie — marqué comme MANUAL
    has_anah = bool(re.search(r'ANAH|MaPrimeR[ée]nov', content, re.IGNORECASE))
    has_flip = bool(re.search(r'flip|revente\s*rapide|moins\s*de\s*2\s*ans', content, re.IGNORECASE))
    has_saisonnier = bool(re.search(r'saisonni[eè]re?|meublé\s*touristique|airbnb', content, re.IGNORECASE))
    has_denormandie = bool(re.search(r'denormandie', content, re.IGNORECASE))
    has_malraux = bool(re.search(r'malraux', content, re.IGNORECASE))

    if has_anah and has_flip:
        results.append({
            "id": "FI1", "module": "Fiscal",
            "check": "Pas d'ANAH en flip",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "ANAH mentionné dans un contexte de flip — incompatible (3 ans min.)"
        })

    if has_denormandie and has_saisonnier:
        results.append({
            "id": "FI2", "module": "Fiscal",
            "check": "Pas de Denormandie en saisonnier",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "Denormandie mentionné avec location saisonnière — incompatible"
        })

    if has_malraux and has_saisonnier:
        results.append({
            "id": "FI3", "module": "Fiscal",
            "check": "Pas de Malraux en saisonnier",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "Malraux mentionné avec location saisonnière — incompatible (9 ans nue)"
        })

    return results


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 6 : AUDIT GRAPHIQUE & STRUCTUREL
# ──────────────────────────────────────────────────────────────────────────────

def check_graphical(html_content, offre, num_pages=None):
    """Vérifie le rendu graphique (nécessite le HTML source)."""
    results = []

    if not html_content:
        results.append({
            "id": "G0", "module": "Graphique",
            "check": "HTML source disponible",
            "status": "SKIP", "severity": "INFO",
            "detail": "HTML source non fourni — vérifications graphiques limitées au texte PDF"
        })
        return results

    # G1: Logo couverture
    cover_section = html_content.split('class="ip"')[0] if 'class="ip"' in html_content else html_content[:5000]
    if 'data:image/png;base64,' in cover_section:
        results.append({
            "id": "G1", "module": "Graphique",
            "check": "Logo couverture PNG",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Logo PNG base64 détecté sur la couverture"
        })
    else:
        results.append({
            "id": "G1", "module": "Graphique",
            "check": "Logo couverture PNG",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "Logo PNG absent de la couverture"
        })

    # G4: Fond navy
    if '#0B1526' in html_content or '0B1526' in html_content:
        results.append({
            "id": "G4", "module": "Graphique",
            "check": "Fond couverture navy",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Couleur navy #0B1526 détectée"
        })
    else:
        results.append({
            "id": "G4", "module": "Graphique",
            "check": "Fond couverture navy",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "Couleur navy #0B1526 absente"
        })

    # G5: Badge offre
    badge_map = {"49": "ESSENTIELLE", "129": "COMPLÈTE", "299": "PREMIUM"}
    expected_badge = badge_map.get(offre, "")
    if expected_badge and expected_badge in html_content.upper():
        results.append({
            "id": "G5", "module": "Graphique",
            "check": "Badge offre couverture",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": f"Badge '{expected_badge}' trouvé"
        })
    elif expected_badge:
        results.append({
            "id": "G5", "module": "Graphique",
            "check": "Badge offre couverture",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": f"Badge '{expected_badge}' introuvable"
        })

    # G6: Footer
    footer_count = html_content.count('ip-ftr')
    page_count = html_content.count('class="ip"') + html_content.count("class='ip'")
    if page_count > 0 and footer_count >= page_count:
        results.append({
            "id": "G6", "module": "Graphique",
            "check": "Footer chaque page",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": f"{footer_count} footers pour {page_count} pages intérieures"
        })
    elif page_count > 0:
        results.append({
            "id": "G6", "module": "Graphique",
            "check": "Footer chaque page",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": f"Seulement {footer_count} footers pour {page_count} pages intérieures"
        })

    # G7: Pagination séquentielle
    page_numbers = re.findall(r'(\d+)\s*/\s*(\d+)', html_content)
    if page_numbers:
        totals = set(t for _, t in page_numbers)
        pages_seen = sorted(int(p) for p, _ in page_numbers)
        if len(totals) > 1:
            results.append({
                "id": "G7", "module": "Graphique",
                "check": "Pagination séquentielle",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Totaux de pages incohérents : {totals}"
            })
        else:
            expected = list(range(pages_seen[0], pages_seen[-1] + 1))
            if pages_seen == expected:
                results.append({
                    "id": "G7", "module": "Graphique",
                    "check": "Pagination séquentielle",
                    "status": "PASS", "severity": "BLOQUANT",
                    "detail": f"Pages {pages_seen[0]}-{pages_seen[-1]}/{list(totals)[0]} séquentielles"
                })
            else:
                results.append({
                    "id": "G7", "module": "Graphique",
                    "check": "Pagination séquentielle",
                    "status": "FAIL", "severity": "BLOQUANT",
                    "detail": f"Séquence cassée : {pages_seen} vs attendu {expected}"
                })

    # G9: Nombre de pages
    if num_pages and offre == "49" and num_pages > 2:
        results.append({
            "id": "G9", "module": "Graphique",
            "check": "Nombre de pages (49€)",
            "status": "FAIL", "severity": "AVERTISSEMENT",
            "detail": f"{num_pages} pages détectées — max 2 pour l'offre 49€"
        })
    elif num_pages and offre == "299" and num_pages < 8:
        results.append({
            "id": "G9", "module": "Graphique",
            "check": "Nombre de pages (299€)",
            "status": "FAIL", "severity": "AVERTISSEMENT",
            "detail": f"{num_pages} pages détectées — minimum 8 recommandé pour Premium"
        })
    elif num_pages:
        results.append({
            "id": "G9", "module": "Graphique",
            "check": "Nombre de pages",
            "status": "PASS", "severity": "AVERTISSEMENT",
            "detail": f"{num_pages} pages — conforme pour l'offre {offre}€"
        })

    # G10: Score ring
    if re.search(r'f-ring', html_content):
        results.append({
            "id": "G10", "module": "Graphique",
            "check": "Score ring présent",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Score ring (.f-ring) détecté"
        })
    else:
        results.append({
            "id": "G10", "module": "Graphique",
            "check": "Score ring présent",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "Score ring (.f-ring) absent"
        })

    # G11: SVG fallback
    if 'data:image/svg+xml;base64,' in html_content:
        results.append({
            "id": "G11", "module": "Graphique",
            "check": "Pas de SVG fallback",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "SVG fallback détecté — utiliser le logo PNG KCI"
        })
    else:
        results.append({
            "id": "G11", "module": "Graphique",
            "check": "Pas de SVG fallback",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Aucun SVG fallback détecté"
        })

    # Vérifications d'alignement (de la mise à jour du skill)
    ip_inline = re.findall(r'class="ip"[^>]*style="([^"]*)"', html_content)
    if ip_inline:
        results.append({
            "id": "G12", "module": "Graphique",
            "check": "Pas de style inline sur .ip",
            "status": "FAIL", "severity": "AVERTISSEMENT",
            "detail": f"{len(ip_inline)} page(s) avec style inline — risque de décalage"
        })

    # Vérification cercles décoratifs
    cc1_match = re.search(r'\.cc1\s*\{([^}]+)\}', html_content)
    if cc1_match:
        cc1_css = cc1_match.group(1)
        if 'top:-' not in cc1_css or 'right:-' not in cc1_css:
            results.append({
                "id": "G13", "module": "Graphique",
                "check": "Cercles décoratifs hors-cadre",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": ".cc1 pas en position hors-cadre (top/right négatifs requis)"
            })

    return results


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 7 : RÉDACTION & CONFORMITÉ ÉDITORIALE
# ──────────────────────────────────────────────────────────────────────────────

def check_editorial(content, offre=None):
    """Vérifie le ton et les formulations."""
    results = []

    # E1/E2: La Soufrière / volcan
    for eid, term in [("E1", "La Soufrière"), ("E2", "volcan")]:
        if term.lower() in content.lower():
            results.append({
                "id": eid, "module": "Éditorial",
                "check": f"Pas de '{term}'",
                "status": "FAIL", "severity": "BLOQUANT",
                "detail": f"Mention de '{term}' détectée — utiliser 'aléas naturels' ou 'PPRI/PPRN'"
            })
        else:
            results.append({
                "id": eid, "module": "Éditorial",
                "check": f"Pas de '{term}'",
                "status": "PASS", "severity": "BLOQUANT",
                "detail": f"Aucune mention de '{term}'"
            })

    # E3: Formulations interdites
    found_forbidden = []
    for phrase in FORBIDDEN_PHRASES[4:]:  # Skip Soufrière/volcan already checked
        if phrase.lower() in content.lower():
            found_forbidden.append(phrase)
    for phrase in FORBIDDEN_PHRASES[:4]:  # Les 4 formulations commerciales
        if phrase.lower() in content.lower():
            found_forbidden.append(phrase)

    if found_forbidden:
        results.append({
            "id": "E3", "module": "Éditorial",
            "check": "Formulations interdites",
            "status": "FAIL", "severity": "AVERTISSEMENT",
            "detail": f"Formulations interdites détectées : {found_forbidden}"
        })
    else:
        results.append({
            "id": "E3", "module": "Éditorial",
            "check": "Formulations interdites",
            "status": "PASS", "severity": "AVERTISSEMENT",
            "detail": "Aucune formulation interdite détectée"
        })

    # E5: Méthodologie
    if re.search(r'm[ée]thodologie', content, re.IGNORECASE):
        results.append({
            "id": "E5", "module": "Éditorial",
            "check": "Méthodologie présente",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "Section méthodologie détectée"
        })
    else:
        results.append({
            "id": "E5", "module": "Éditorial",
            "check": "Méthodologie présente",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "Section 'Méthodologie' absente du rapport"
        })

    # E6: Non contractuel
    if "non contractuel" in content.lower():
        results.append({
            "id": "E6", "module": "Éditorial",
            "check": "Mention non contractuel",
            "status": "PASS", "severity": "BLOQUANT",
            "detail": "'Non contractuel' trouvé dans le rapport"
        })
    else:
        results.append({
            "id": "E6", "module": "Éditorial",
            "check": "Mention non contractuel",
            "status": "FAIL", "severity": "BLOQUANT",
            "detail": "'Non contractuel' absent — obligatoire dans chaque rapport"
        })

    # E7: Site web correct
    urls = re.findall(r'https?://[\w\.-]+\.\w+', content)
    bad_urls = [u for u in urls if 'karukera-conseil.com' not in u
                and 'data.gouv.fr' not in u and 'insee.fr' not in u
                and 'cadastre.gouv.fr' not in u and 'geopf.fr' not in u
                and 'ign.fr' not in u]
    if bad_urls:
        results.append({
            "id": "E7", "module": "Éditorial",
            "check": "Site web correct",
            "status": "FAIL", "severity": "AVERTISSEMENT",
            "detail": f"URLs non autorisées détectées : {bad_urls[:3]}"
        })
    else:
        results.append({
            "id": "E7", "module": "Éditorial",
            "check": "Site web correct",
            "status": "PASS", "severity": "AVERTISSEMENT",
            "detail": "Seules des URLs autorisées détectées"
        })

    # E8: Pas de mention nombre d'analyses
    if re.search(r'\d+\s*analyses?\s*r[ée]alis[ée]es', content, re.IGNORECASE):
        results.append({
            "id": "E8", "module": "Éditorial",
            "check": "Pas de nombre d'analyses",
            "status": "FAIL", "severity": "AVERTISSEMENT",
            "detail": "Mention du nombre d'analyses réalisées détectée"
        })
    else:
        results.append({
            "id": "E8", "module": "Éditorial",
            "check": "Pas de nombre d'analyses",
            "status": "PASS", "severity": "AVERTISSEMENT",
            "detail": "Aucune mention de nombre d'analyses"
        })

    return results


# ──────────────────────────────────────────────────────────────────────────────
# AGRÉGATION & SCORING
# ──────────────────────────────────────────────────────────────────────────────

def compute_conformity_score(all_results):
    """Calcule le score de conformité global."""
    total_weight = 0
    passed_weight = 0

    for r in all_results:
        if r["status"] in ("SKIP", "MANUAL"):
            continue
        weight = 2 if r["severity"] == "BLOQUANT" else 1
        total_weight += weight
        if r["status"] == "PASS":
            passed_weight += weight

    if total_weight == 0:
        return 100.0

    return round((passed_weight / total_weight) * 100, 1)


def get_recommendation(score, has_bloquant):
    """Retourne la recommandation finale."""
    if has_bloquant:
        if score < 70:
            return "REJET", "Trop d'erreurs bloquantes — régénérer le rapport"
        else:
            return "CORRECTIONS REQUISES", "Corrections bloquantes à apporter avant envoi"
    elif score < 100:
        return "CORRECTIONS MINEURES", "Corriger les avertissements avant envoi"
    else:
        return "PRÊT À ENVOYER", "Aucune correction nécessaire"


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def run_verification(pdf_path, html_path=None, offre_override=None, client_override=None):
    """Exécute toutes les vérifications et retourne le diagnostic complet."""

    filename = os.path.basename(pdf_path)

    # Extraire le texte du PDF
    pdf_text, num_pages = extract_text_from_pdf(pdf_path)

    # Charger le HTML si disponible
    html_content = None
    if html_path and os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

    # Contenu principal pour les vérifications textuelles
    content = html_content or pdf_text

    all_results = []

    # Module 1: Nomenclature
    nom_results, offre, client = check_nomenclature(filename, pdf_text, offre_override, client_override)
    all_results.extend(nom_results)

    # Module 2: Résiduels
    all_results.extend(check_residuals(pdf_text, client, html_content))

    # Module 3: Financier
    all_results.extend(check_financial(content))

    # Module 4: Scores
    all_results.extend(check_scores(content, offre))

    # Module 5: Fiscal
    all_results.extend(check_fiscal(content))

    # Module 6: Graphique
    all_results.extend(check_graphical(html_content, offre, num_pages))

    # Module 7: Éditorial
    all_results.extend(check_editorial(content, offre))

    # Calculer le score
    score = compute_conformity_score(all_results)
    has_bloquant = any(r["status"] == "FAIL" and r["severity"] == "BLOQUANT" for r in all_results)
    rec_status, rec_detail = get_recommendation(score, has_bloquant)

    # Résumé par module
    modules = {}
    for r in all_results:
        mod = r["module"]
        if mod not in modules:
            modules[mod] = {"pass": 0, "fail": 0, "warn": 0, "skip": 0, "manual": 0}
        if r["status"] == "PASS":
            modules[mod]["pass"] += 1
        elif r["status"] == "FAIL":
            if r["severity"] == "BLOQUANT":
                modules[mod]["fail"] += 1
            else:
                modules[mod]["warn"] += 1
        elif r["status"] == "SKIP":
            modules[mod]["skip"] += 1
        elif r["status"] == "MANUAL":
            modules[mod]["manual"] += 1

    return {
        "rapport_verifie": filename,
        "offre": offre,
        "client": client,
        "date_verification": datetime.now().isoformat(),
        "num_pages_pdf": num_pages,
        "html_source_disponible": html_content is not None,
        "score_conformite": score,
        "recommendation": {
            "status": rec_status,
            "detail": rec_detail
        },
        "resume_modules": modules,
        "checks": all_results,
        "corrections": [r for r in all_results if r["status"] == "FAIL"]
    }


def main():
    parser = argparse.ArgumentParser(description="KCI Rapport Verificator")
    parser.add_argument("--input", required=True, help="Chemin du PDF à vérifier")
    parser.add_argument("--html", help="Chemin du HTML source (optionnel)")
    parser.add_argument("--offre", choices=["49", "129", "299"], help="Offre du rapport")
    parser.add_argument("--client", help="Nom du client")
    parser.add_argument("--output", help="Chemin de sortie JSON (défaut: stdout)")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"ERREUR: Fichier '{args.input}' introuvable", file=sys.stderr)
        sys.exit(1)

    result = run_verification(args.input, args.html, args.offre, args.client)

    output = json.dumps(result, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"Résultats sauvegardés dans {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
