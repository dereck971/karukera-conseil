#!/bin/bash
# ═══════════════════════════════════════════════
# Caribbean ATC Pro — Script de déploiement Vercel
# Exécuter depuis le Terminal Mac :
#   cd "chemin/vers/SYNTHESE ECOSYSTEME/caribbean-atc-deploy"
#   chmod +x DEPLOY.sh && ./DEPLOY.sh
# ═══════════════════════════════════════════════

echo "🛫 Caribbean ATC Pro — Déploiement Vercel"
echo "==========================================="
echo ""

# Vérifier si Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "📦 Installation de Vercel CLI..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        echo "⚠️  npm non trouvé. Installation via brew..."
        brew install node
        npm install -g vercel
    fi
fi

echo ""
echo "🚀 Lancement du déploiement..."
echo "   (Un navigateur va s'ouvrir pour l'authentification si c'est la première fois)"
echo ""

vercel --yes --prod

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "📍 Pages disponibles :"
echo "   / .............. App principale (Beta + codes d'accès)"
echo "   /search.html ... Recherche publique de vol"
echo "   /hurricane.html  Mode Ouragan"
echo "   /explore.html .. Hub SEO (200+ pages)"
echo "   /pricing.html .. Freemium + Pricing"
echo "   /assistant.html  Chatbot IA"
echo "   /widget.html ... Widget KCI"
echo "   /pro.html ...... Version Pro complète"
