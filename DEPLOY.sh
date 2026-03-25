#!/bin/bash
# ═══════════════════════════════════════════
# KCI v6 — Script de déploiement automatique
# ═══════════════════════════════════════════
# Ce script remplace le contenu du repo GitHub
# par la v6 et pousse automatiquement.

set -e

echo ""
echo "🚀 KCI v6 — Déploiement automatique"
echo "════════════════════════════════════"
echo ""

# 1. Cloner le repo dans un dossier temporaire
TMPDIR=$(mktemp -d)
echo "📦 Clonage du repo..."
git clone https://github.com/dereck971/analyse-immo.git "$TMPDIR/analyse-immo"
cd "$TMPDIR/analyse-immo"

# 2. Supprimer tous les anciens fichiers (sauf .git)
echo "🗑️  Suppression des anciens fichiers..."
find . -maxdepth 1 -not -name '.git' -not -name '.' -not -name '..' -exec rm -rf {} +
rm -rf api/

# 3. Copier les fichiers v6
echo "📄 Copie des fichiers v6..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/index.html" .
cp "$SCRIPT_DIR/package.json" .
cp "$SCRIPT_DIR/vercel.json" .
mkdir -p api
cp "$SCRIPT_DIR/api/analyse.js" api/
cp "$SCRIPT_DIR/api/create-checkout.js" api/
cp "$SCRIPT_DIR/api/verify-session.js" api/
cp "$SCRIPT_DIR/api/webhook.js" api/
cp "$SCRIPT_DIR/api/validate.js" api/

# 4. Commit et push
echo "📤 Push vers GitHub..."
git add -A
git commit -m "v6: refonte complète landing page KCI — conversion, mobile-first, SEO"
git push origin main

echo ""
echo "✅ Déploiement terminé !"
echo "🌐 Vercel va déployer automatiquement dans ~30 secondes."
echo "👉 Vérifie sur : https://www.karukera-conseil.com"
echo ""

# Nettoyage
cd /
rm -rf "$TMPDIR"
