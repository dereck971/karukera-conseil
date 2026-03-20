#!/usr/bin/env python3
"""
Script de conversion du faux-billet KCI en PNG (recto + verso séparés).
Nécessite: pip install playwright && python -m playwright install chromium
Ou alternativement: utiliser un service en ligne comme html2image.

Usage:
  python3 KCI_FauxBillet_convert.py
"""

import subprocess
import sys
import os

def convert_with_playwright():
    """Convertir le HTML en images PNG avec Playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Installation de Playwright...")
        subprocess.run([sys.executable, "-m", "pip", "install", "playwright"], check=True)
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
        from playwright.sync_api import sync_playwright

    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "KCI_FauxBillet_50euros.html")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 800, "height": 1200})
        page.goto(f"file://{html_path}")
        page.wait_for_load_state("networkidle")

        # Capture le recto
        recto = page.locator(".card.recto")
        recto.screenshot(path="KCI_FauxBillet_RECTO.png")
        print("✅ Recto sauvegardé: KCI_FauxBillet_RECTO.png")

        # Capture le verso
        verso = page.locator(".card.verso")
        verso.screenshot(path="KCI_FauxBillet_VERSO.png")
        print("✅ Verso sauvegardé: KCI_FauxBillet_VERSO.png")

        # Capture la page entière pour le PDF
        page.pdf(
            path="KCI_FauxBillet_Impression.pdf",
            format="A4",
            print_background=True,
            margin={"top": "20mm", "bottom": "20mm", "left": "20mm", "right": "20mm"}
        )
        print("✅ PDF sauvegardé: KCI_FauxBillet_Impression.pdf")

        browser.close()

if __name__ == "__main__":
    convert_with_playwright()
    print("\n🎉 Conversion terminée!")
    print("Fichiers générés:")
    print("  - KCI_FauxBillet_RECTO.png (face billet)")
    print("  - KCI_FauxBillet_VERSO.png (face carte de visite)")
    print("  - KCI_FauxBillet_Impression.pdf (recto-verso pour imprimeur)")
