#!/usr/bin/env python3
"""
Génère le rapport QA en PDF à partir du JSON de diagnostic du verificator.

Usage:
    python3 generate_qa_pdf.py --input diagnostic.json --output QA_Report.pdf
"""

import argparse
import json
import os
import sys
from datetime import datetime

QA_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
@page {{ size: A4; margin: 12mm 15mm 20mm; }}
:root {{
    --navy: #0B1526;
    --gold: #C9A84C;
    --green: #2A9D6C;
    --orange: #D48A1A;
    --red: #C43B2E;
    --bg: #FAFAFA;
    --text: #1A1A2E;
    --text-sec: #555;
    --text-ter: #888;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size:9pt; color:var(--text); background:white; }}
.page {{ width:210mm; min-height:297mm; padding:10mm 15mm 20mm; position:relative; page-break-after:always; }}
.page:last-child {{ page-break-after:avoid; }}

/* Header */
.qa-header {{ display:flex; justify-content:space-between; align-items:center; padding-bottom:4mm; border-bottom:.4mm solid var(--gold); margin-bottom:6mm; }}
.qa-title {{ font-size:14pt; font-weight:700; color:var(--navy); letter-spacing:1px; }}
.qa-subtitle {{ font-size:8pt; color:var(--text-ter); }}

/* Score circle */
.score-circle {{ width:35mm; height:35mm; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; margin:4mm auto; }}
.score-circle.green {{ background:linear-gradient(135deg, #2A9D6C22, #2A9D6C44); border:1mm solid var(--green); }}
.score-circle.orange {{ background:linear-gradient(135deg, #D48A1A22, #D48A1A44); border:1mm solid var(--orange); }}
.score-circle.red {{ background:linear-gradient(135deg, #C43B2E22, #C43B2E44); border:1mm solid var(--red); }}
.score-val {{ font-size:20pt; font-weight:800; }}
.score-label {{ font-size:7pt; color:var(--text-sec); margin-top:1mm; }}

/* Recommendation badge */
.rec-badge {{ display:inline-block; padding:2mm 5mm; border-radius:2mm; font-weight:700; font-size:10pt; text-align:center; margin:3mm auto; }}
.rec-badge.green {{ background:#2A9D6C22; color:var(--green); border:0.3mm solid var(--green); }}
.rec-badge.orange {{ background:#D48A1A22; color:var(--orange); border:0.3mm solid var(--orange); }}
.rec-badge.red {{ background:#C43B2E22; color:var(--red); border:0.3mm solid var(--red); }}

/* Info box */
.info-box {{ background:var(--navy); color:white; padding:4mm; border-radius:2mm; margin:4mm 0; }}
.info-row {{ display:flex; justify-content:space-between; padding:1mm 0; font-size:8pt; }}
.info-label {{ color:var(--gold); font-weight:600; }}

/* Module summary */
.mod-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:3mm; margin:4mm 0; }}
.mod-card {{ padding:3mm; border:0.3mm solid #ddd; border-radius:2mm; background:white; }}
.mod-name {{ font-weight:700; font-size:9pt; color:var(--navy); margin-bottom:2mm; }}
.mod-stats {{ display:flex; gap:3mm; font-size:7.5pt; }}
.stat {{ padding:1mm 2mm; border-radius:1mm; }}
.stat-pass {{ background:#2A9D6C22; color:var(--green); }}
.stat-fail {{ background:#C43B2E22; color:var(--red); }}
.stat-warn {{ background:#D48A1A22; color:var(--orange); }}
.stat-skip {{ background:#eee; color:#888; }}

/* Check table */
.check-table {{ width:100%; border-collapse:collapse; font-size:8pt; margin:3mm 0; }}
.check-table th {{ background:var(--navy); color:white; padding:2mm 3mm; text-align:left; font-size:7.5pt; }}
.check-table td {{ padding:2mm 3mm; border-bottom:0.2mm solid #eee; }}
.check-table tr.fail td {{ background:#C43B2E08; }}
.check-table tr.warn td {{ background:#D48A1A08; }}
.badge {{ display:inline-block; padding:0.5mm 2mm; border-radius:1mm; font-size:6.5pt; font-weight:700; }}
.badge-pass {{ background:#2A9D6C; color:white; }}
.badge-fail {{ background:#C43B2E; color:white; }}
.badge-warn {{ background:#D48A1A; color:white; }}
.badge-skip {{ background:#888; color:white; }}
.badge-manual {{ background:#6B7280; color:white; }}

/* Corrections section */
.correction {{ padding:3mm; margin:2mm 0; border-left:1mm solid var(--red); background:#C43B2E06; border-radius:0 2mm 2mm 0; }}
.correction.warn {{ border-left-color:var(--orange); background:#D48A1A06; }}
.correction-id {{ font-weight:700; color:var(--red); font-size:8pt; }}
.correction.warn .correction-id {{ color:var(--orange); }}
.correction-text {{ font-size:8pt; color:var(--text-sec); margin-top:1mm; }}

/* Footer */
.qa-footer {{ position:absolute; bottom:8mm; left:15mm; right:15mm; padding-top:2mm; border-top:0.3mm solid var(--gold); display:flex; justify-content:space-between; font-size:6pt; color:var(--text-ter); }}
</style>
</head>
<body>
{pages}
</body>
</html>"""


def get_score_color(score):
    if score >= 90:
        return "green"
    elif score >= 70:
        return "orange"
    return "red"


def get_rec_color(status):
    if "PRÊT" in status:
        return "green"
    elif "MINEURES" in status:
        return "orange"
    return "red"


def badge_html(status):
    cls = {
        "PASS": "badge-pass", "FAIL": "badge-fail",
        "SKIP": "badge-skip", "MANUAL": "badge-manual"
    }.get(status, "badge-warn")
    label = {
        "PASS": "OK", "FAIL": "ÉCHEC",
        "SKIP": "N/A", "MANUAL": "MANUEL"
    }.get(status, status)
    return f'<span class="badge {cls}">{label}</span>'


def generate_page1(data):
    score = data["score_conformite"]
    rec = data["recommendation"]
    sc = get_score_color(score)
    rc = get_rec_color(rec["status"])

    # Module summary cards
    mod_cards = ""
    for mod_name, stats in data["resume_modules"].items():
        total = stats["pass"] + stats["fail"] + stats["warn"]
        mod_cards += f"""<div class="mod-card">
            <div class="mod-name">{mod_name}</div>
            <div class="mod-stats">
                <span class="stat stat-pass">{stats['pass']} OK</span>
                <span class="stat stat-fail">{stats['fail']} échec</span>
                <span class="stat stat-warn">{stats['warn']} avert.</span>
                {"<span class='stat stat-skip'>" + str(stats['manual']) + " manuel</span>" if stats.get('manual') else ""}
            </div>
        </div>"""

    checks_pass = sum(1 for r in data["checks"] if r["status"] == "PASS")
    checks_fail = sum(1 for r in data["checks"] if r["status"] == "FAIL")
    checks_total = len(data["checks"])
    bloquants = sum(1 for r in data["checks"] if r["status"] == "FAIL" and r["severity"] == "BLOQUANT")
    avertissements = sum(1 for r in data["checks"] if r["status"] == "FAIL" and r["severity"] != "BLOQUANT")

    return f"""<div class="page">
        <div class="qa-header">
            <div>
                <div class="qa-title">CONTRÔLE QUALITÉ — RAPPORT KCI</div>
                <div class="qa-subtitle">Rapport Verificator · {data.get('date_verification', '')[:10]}</div>
            </div>
        </div>

        <div class="info-box">
            <div class="info-row"><span class="info-label">Rapport vérifié</span><span>{data['rapport_verifie']}</span></div>
            <div class="info-row"><span class="info-label">Offre</span><span>{data.get('offre', 'N/A')}€</span></div>
            <div class="info-row"><span class="info-label">Client</span><span>{data.get('client', 'N/A')}</span></div>
            <div class="info-row"><span class="info-label">Pages PDF</span><span>{data.get('num_pages_pdf', 'N/A')}</span></div>
            <div class="info-row"><span class="info-label">HTML source</span><span>{'Oui' if data.get('html_source_disponible') else 'Non'}</span></div>
        </div>

        <div style="text-align:center; margin:6mm 0;">
            <div class="score-circle {sc}">
                <div class="score-val" style="color:var(--{sc})">{score}%</div>
                <div class="score-label">CONFORMITÉ</div>
            </div>
            <div class="rec-badge {rc}">{rec['status']}</div>
            <div style="font-size:8pt; color:var(--text-sec); margin-top:2mm;">{rec['detail']}</div>
            <div style="font-size:7.5pt; color:var(--text-ter); margin-top:3mm;">
                {checks_pass} passés / {checks_total} total — {bloquants} bloquant(s), {avertissements} avertissement(s)
            </div>
        </div>

        <div style="margin-top:5mm;">
            <div style="font-size:11pt; font-weight:700; color:var(--navy); margin-bottom:3mm;">Résumé par module</div>
            <div class="mod-grid">
                {mod_cards}
            </div>
        </div>

        <div class="qa-footer">
            <span>KCI Verificator — Contrôle Qualité Post-Production</span>
            <span>1 / {2 + (1 if data['corrections'] else 0)}</span>
        </div>
    </div>"""


def generate_detail_pages(data):
    """Génère les pages de détail par module."""
    pages = []
    current_module = None
    rows = ""
    page_num = 2
    total_pages = 2 + (1 if data['corrections'] else 0)

    for i, check in enumerate(data["checks"]):
        if check["module"] != current_module:
            if current_module is not None:
                rows += "</table>"
            current_module = check["module"]
            rows += f"""<div style="font-size:10pt; font-weight:700; color:var(--navy); margin:4mm 0 2mm;">Module : {current_module}</div>
            <table class="check-table">
            <tr><th style="width:8%">ID</th><th style="width:30%">Check</th><th style="width:8%">Statut</th><th style="width:8%">Gravité</th><th>Détail</th></tr>"""

        row_class = ""
        if check["status"] == "FAIL":
            row_class = "fail" if check["severity"] == "BLOQUANT" else "warn"

        rows += f"""<tr class="{row_class}">
            <td><strong>{check['id']}</strong></td>
            <td>{check['check']}</td>
            <td>{badge_html(check['status'])}</td>
            <td style="font-size:6.5pt;">{check['severity']}</td>
            <td style="font-size:7pt; color:var(--text-sec);">{check['detail'][:120]}</td>
        </tr>"""

    rows += "</table>"

    pages.append(f"""<div class="page">
        <div class="qa-header">
            <div>
                <div class="qa-title" style="font-size:11pt;">DÉTAIL DES VÉRIFICATIONS</div>
                <div class="qa-subtitle">{data['rapport_verifie']}</div>
            </div>
        </div>
        {rows}
        <div class="qa-footer">
            <span>KCI Verificator — Contrôle Qualité Post-Production</span>
            <span>{page_num} / {total_pages}</span>
        </div>
    </div>""")

    return pages


def generate_corrections_page(data):
    """Génère la page des corrections à apporter."""
    if not data["corrections"]:
        return ""

    corrections_html = ""
    # Trier par gravité (BLOQUANT en premier)
    sorted_corrections = sorted(data["corrections"], key=lambda x: (0 if x["severity"] == "BLOQUANT" else 1, x["id"]))

    for c in sorted_corrections:
        cls = "" if c["severity"] == "BLOQUANT" else "warn"
        corrections_html += f"""<div class="correction {cls}">
            <div class="correction-id">[{c['id']}] {c['check']}</div>
            <div class="correction-text">{c['detail']}</div>
        </div>"""

    total_pages = 2 + (1 if data['corrections'] else 0)

    return f"""<div class="page">
        <div class="qa-header">
            <div>
                <div class="qa-title" style="font-size:11pt;">ACTIONS CORRECTIVES</div>
                <div class="qa-subtitle">{len(data['corrections'])} correction(s) à apporter</div>
            </div>
        </div>
        {corrections_html}
        <div class="qa-footer">
            <span>KCI Verificator — Contrôle Qualité Post-Production</span>
            <span>{total_pages} / {total_pages}</span>
        </div>
    </div>"""


def generate_qa_pdf(data, output_path):
    """Génère le PDF de QA complet."""
    pages = [generate_page1(data)]
    pages.extend(generate_detail_pages(data))
    corrections = generate_corrections_page(data)
    if corrections:
        pages.append(corrections)

    html = QA_HTML_TEMPLATE.format(pages="\n".join(pages))

    # Sauvegarder le HTML intermédiaire
    html_path = output_path.replace('.pdf', '.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # Convertir en PDF
    try:
        from weasyprint import HTML
        HTML(string=html).write_pdf(output_path)
        print(f"✅ Rapport QA généré : {output_path}")
        return output_path
    except ImportError:
        print(f"⚠️ weasyprint non disponible — HTML sauvegardé : {html_path}")
        return html_path


def main():
    parser = argparse.ArgumentParser(description="Génération du rapport QA PDF")
    parser.add_argument("--input", required=True, help="Fichier JSON du diagnostic")
    parser.add_argument("--output", required=True, help="Chemin de sortie du PDF")

    args = parser.parse_args()

    with open(args.input, 'r', encoding='utf-8') as f:
        data = json.load(f)

    generate_qa_pdf(data, args.output)


if __name__ == "__main__":
    main()
