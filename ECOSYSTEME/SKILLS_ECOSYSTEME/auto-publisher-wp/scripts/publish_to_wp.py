#!/usr/bin/env python3
"""
publish_to_wp.py - Automatiser la publication d'articles sur WordPress
Prend un article Markdown produit par redacteur-seo-971 et le publie sur ImmoServices971.

Usage:
    python publish_to_wp.py --markdown article.md --image image.jpg --status publish
    python publish_to_wp.py --markdown article.md --status draft
    python publish_to_wp.py --markdown article.md --status future --schedule "2026-03-25 09:00"
    python publish_to_wp.py --batch articles_batch.json
"""

import os
import sys
import json
import argparse
import requests
import frontmatter
import base64
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List
import markdown2


class WordPressPublisher:
    """Gestionnaire de publication WordPress via API REST"""

    def __init__(self, wp_url: str, username: str, app_password: str):
        """
        Initialiser le publisher WordPress.

        Args:
            wp_url: URL du site WordPress (ex: https://immoservices971.com)
            username: Nom d'utilisateur WordPress
            app_password: Application Password (ex: "abcd efgh ijkl mnop qrst uvwx yz12")
        """
        self.wp_url = wp_url.rstrip("/")
        self.username = username
        self.app_password = app_password
        self.api_base = f"{self.wp_url}/wp-json/wp/v2"
        self.yoast_api = f"{self.wp_url}/wp-json/yoast/v1"

        # Créer l'en-tête d'authentification Basic Auth
        credentials = f"{username}:{app_password}"
        self.auth_header = {
            "Authorization": f"Basic {base64.b64encode(credentials.encode()).decode()}"
        }

        # Log des publications
        self.log_file = "publication_logs.json"
        self._ensure_log_file()

    def _ensure_log_file(self):
        """S'assurer que le fichier log existe"""
        if not os.path.exists(self.log_file):
            with open(self.log_file, "w") as f:
                json.dump({"publications": []}, f, indent=2)

    def test_connection(self) -> bool:
        """Tester la connexion à l'API WordPress"""
        try:
            response = requests.get(
                f"{self.api_base}/posts",
                headers=self.auth_header,
                timeout=5,
            )
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Erreur de connexion: {e}")
            return False

    def parse_markdown(self, markdown_path: str) -> Dict:
        """
        Parser un article Markdown avec frontmatter.

        Format attendu:
        ---
        title: "Titre de l'article"
        meta_description: "Description pour SEO"
        keyword: "mot-clé principal"
        keywords: ["mot-clé", "autres"]
        category: "Construction"
        ---

        # Titre H1
        Contenu...

        Args:
            markdown_path: Chemin du fichier .md

        Returns:
            Dict avec: title, meta_desc, keyword, keywords, category, content_html, content_md
        """
        if not os.path.exists(markdown_path):
            raise FileNotFoundError(f"Fichier non trouvé: {markdown_path}")

        with open(markdown_path, "r", encoding="utf-8") as f:
            post = frontmatter.load(f)

        # Extraire les métadonnées
        metadata = post.metadata or {}
        content_md = post.content

        # Convertir Markdown en HTML
        content_html = markdown2.markdown(
            content_md,
            extensions=["tables", "fenced-code-blocks", "extra"],
        )

        return {
            "title": metadata.get("title", ""),
            "meta_desc": metadata.get("meta_description", ""),
            "keyword": metadata.get("keyword", ""),
            "keywords": metadata.get("keywords", []),
            "category": metadata.get("category", ""),
            "content_html": content_html,
            "content_md": content_md,
            "all_metadata": metadata,
        }

    def upload_image(self, image_path: str) -> int:
        """
        Uploader une image vers la media library WordPress.

        Args:
            image_path: Chemin de l'image

        Returns:
            ID de l'image uploadée
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image non trouvée: {image_path}")

        # Lire l'image
        with open(image_path, "rb") as f:
            image_data = f.read()

        # Préparer le fichier pour upload
        filename = os.path.basename(image_path)
        files = {"file": (filename, image_data)}

        # Uploader via l'API Media
        response = requests.post(
            f"{self.api_base}/media",
            files=files,
            headers=self.auth_header,
            timeout=30,
        )

        if response.status_code not in [200, 201]:
            raise Exception(
                f"Erreur upload image: {response.status_code} - {response.text}"
            )

        media = response.json()
        return media["id"]

    def get_category_id(self, category_name: str) -> int:
        """
        Obtenir l'ID d'une catégorie par son nom.

        Args:
            category_name: Nom de la catégorie (ex: "Construction")

        Returns:
            ID de la catégorie
        """
        response = requests.get(
            f"{self.api_base}/categories",
            params={"search": category_name},
            headers=self.auth_header,
            timeout=10,
        )

        if response.status_code != 200:
            print(
                f"⚠️  Catégorie '{category_name}' non trouvée, utilisation de 'Uncategorized'"
            )
            return 1  # ID par défaut 'Uncategorized'

        categories = response.json()
        if categories:
            return categories[0]["id"]

        return 1

    def create_post(
        self,
        article_data: Dict,
        status: str = "draft",
        featured_image_id: Optional[int] = None,
        schedule: Optional[str] = None,
    ) -> Dict:
        """
        Créer un post WordPress.

        Args:
            article_data: Dict retourné par parse_markdown()
            status: "draft", "publish", ou "future"
            featured_image_id: ID de l'image à la une (optionnel)
            schedule: Date/heure de publication "2026-03-25 09:00" si status=="future"

        Returns:
            Dict avec infos du post créé
        """
        # Préparer les données du post
        post_data = {
            "title": article_data["title"],
            "content": article_data["content_html"],
            "status": status,
        }

        # Ajouter la catégorie si présente
        if article_data.get("category"):
            category_id = self.get_category_id(article_data["category"])
            post_data["categories"] = [category_id]

        # Ajouter les tags (mots-clés secondaires)
        if article_data.get("keywords"):
            # Les tags seront créés au besoin
            post_data["tags"] = []
            for keyword in article_data["keywords"]:
                # Fetch tag ID ou créer
                tag_response = requests.get(
                    f"{self.api_base}/tags",
                    params={"search": keyword},
                    headers=self.auth_header,
                    timeout=10,
                )
                if tag_response.status_code == 200:
                    tags = tag_response.json()
                    if tags:
                        post_data["tags"].append(tags[0]["id"])

        # Ajouter l'image à la une
        if featured_image_id:
            post_data["featured_media"] = featured_image_id

        # Gérer la planification
        if status == "future" and schedule:
            try:
                # Parser "2026-03-25 09:00" en ISO format
                scheduled_dt = datetime.strptime(schedule, "%Y-%m-%d %H:%M")
                post_data["scheduled"] = scheduled_dt.isoformat()
            except ValueError:
                raise ValueError(f"Format de date invalide: {schedule}. Utilisez YYYY-MM-DD HH:MM")

        # Créer le post
        response = requests.post(
            f"{self.api_base}/posts",
            json=post_data,
            headers=self.auth_header,
            timeout=30,
        )

        if response.status_code not in [200, 201]:
            raise Exception(
                f"Erreur création post: {response.status_code} - {response.text}"
            )

        post = response.json()
        return {
            "post_id": post["id"],
            "post_url": post["link"],
            "status": post["status"],
            "title": post["title"]["rendered"],
        }

    def set_yoast_meta(self, post_id: int, article_data: Dict) -> None:
        """
        Configurer les métadonnées Yoast SEO.

        Args:
            post_id: ID du post
            article_data: Dict avec meta_desc, keyword, etc.
        """
        yoast_meta = {
            "title": f"{article_data['title']} - ImmoServices971",  # Title tag
            "metadesc": article_data.get("meta_desc", ""),  # Meta description
            "focuskw": article_data.get("keyword", ""),  # Focus keyphrase
        }

        # Ajouter le canonical (il sera calculé par Yoast)
        # On le set manuellement si nécessaire

        payload = {"yoast_meta": yoast_meta}

        response = requests.put(
            f"{self.yoast_api}/posts/{post_id}",
            json=payload,
            headers=self.auth_header,
            timeout=30,
        )

        if response.status_code not in [200, 201]:
            print(f"⚠️  Attention: Yoast meta non mis à jour: {response.text}")

    def log_publication(self, post_data: Dict, article_data: Dict) -> None:
        """Enregistrer la publication dans le log"""
        with open(self.log_file, "r") as f:
            logs = json.load(f)

        logs["publications"].append({
            "date": datetime.now().isoformat(),
            "titre": article_data["title"],
            "post_id": post_data["post_id"],
            "url": post_data["post_url"],
            "status": post_data["status"],
            "keyword": article_data.get("keyword", ""),
        })

        with open(self.log_file, "w") as f:
            json.dump(logs, f, indent=2, ensure_ascii=False)

    def publish_article(
        self,
        markdown_path: str,
        image_path: Optional[str] = None,
        status: str = "draft",
        schedule: Optional[str] = None,
    ) -> Dict:
        """
        Pipeline complet: parser Markdown → uploader image → créer post → configurer Yoast.

        Args:
            markdown_path: Chemin du fichier .md
            image_path: Chemin de l'image à la une (optionnel)
            status: "draft", "publish", ou "future"
            schedule: Date/heure si status=="future"

        Returns:
            Dict avec infos du post créé
        """
        print(f"📄 Parsing Markdown: {markdown_path}")
        article_data = self.parse_markdown(markdown_path)
        print(f"✓ Titre: {article_data['title']}")

        featured_image_id = None
        if image_path:
            print(f"🖼️  Uploading image: {image_path}")
            featured_image_id = self.upload_image(image_path)
            print(f"✓ Image ID: {featured_image_id}")

        print(f"📝 Création du post (status: {status})...")
        post_data = self.create_post(
            article_data,
            status=status,
            featured_image_id=featured_image_id,
            schedule=schedule,
        )
        print(f"✓ Post ID: {post_data['post_id']}")

        print(f"🔍 Configuration Yoast SEO...")
        self.set_yoast_meta(post_data["post_id"], article_data)
        print(f"✓ Métadonnées Yoast configurées")

        # Enregistrer dans les logs
        self.log_publication(post_data, article_data)

        # Résumé final
        result = {
            "success": True,
            "post_id": post_data["post_id"],
            "post_url": post_data["post_url"],
            "status": post_data["status"],
            "title": article_data["title"],
            "featured_image_id": featured_image_id,
            "keyword": article_data.get("keyword", ""),
            "published_at": datetime.now().isoformat(),
        }

        print("\n" + "="*60)
        print("✅ Article publié avec succès!")
        print(f"  URL: {post_data['post_url']}")
        print(f"  Status: {post_data['status']}")
        if schedule:
            print(f"  Planifié pour: {schedule}")
        print("="*60)

        return result

    def publish_batch(self, batch_file: str) -> List[Dict]:
        """
        Publier plusieurs articles depuis un fichier JSON.

        Format du fichier:
        {
          "articles": [
            {"markdown": "art1.md", "image": "img1.jpg", "status": "publish"},
            {"markdown": "art2.md", "image": null, "status": "draft"}
          ]
        }

        Args:
            batch_file: Chemin du fichier JSON batch

        Returns:
            Liste des résultats de publication
        """
        with open(batch_file, "r") as f:
            batch = json.load(f)

        results = []
        for i, article in enumerate(batch.get("articles", []), 1):
            print(f"\n📦 Article {i}/{len(batch['articles'])}")
            try:
                result = self.publish_article(
                    markdown_path=article["markdown"],
                    image_path=article.get("image"),
                    status=article.get("status", "draft"),
                    schedule=article.get("schedule"),
                )
                results.append(result)
            except Exception as e:
                print(f"❌ Erreur: {e}")
                results.append({"success": False, "error": str(e)})

        # Résumé batch
        successful = [r for r in results if r.get("success")]
        print(f"\n📊 Résumé batch: {len(successful)}/{len(results)} articles publiés")

        return results


def main():
    """Interface CLI"""
    parser = argparse.ArgumentParser(
        description="Publier des articles Markdown sur WordPress (ImmoServices971)"
    )

    # Paramètres WordPress
    parser.add_argument(
        "--wp-url",
        default=os.getenv("WP_URL", "https://immoservices971.com"),
        help="URL du site WordPress",
    )
    parser.add_argument(
        "--username",
        default=os.getenv("WP_USERNAME", "admin"),
        help="Nom d'utilisateur WordPress",
    )
    parser.add_argument(
        "--app-password",
        default=os.getenv("WP_APP_PASSWORD", ""),
        help="Application Password WordPress",
    )

    # Mode publication
    parser.add_argument(
        "--markdown",
        help="Chemin du fichier Markdown",
    )
    parser.add_argument(
        "--image",
        help="Chemin de l'image à la une (optionnel)",
    )
    parser.add_argument(
        "--status",
        choices=["draft", "publish", "future"],
        default="draft",
        help="Statut du post",
    )
    parser.add_argument(
        "--schedule",
        help="Date/heure de planification: YYYY-MM-DD HH:MM (si status=future)",
    )

    # Mode batch
    parser.add_argument(
        "--batch",
        help="Chemin du fichier JSON batch",
    )

    # Utilitaires
    parser.add_argument(
        "--test",
        action="store_true",
        help="Tester la connexion à l'API",
    )

    args = parser.parse_args()

    # Vérifier l'app password
    if not args.app_password:
        print("❌ Erreur: App password manquant")
        print("   Fournissez via --app-password ou variable WP_APP_PASSWORD")
        sys.exit(1)

    # Initialiser le publisher
    publisher = WordPressPublisher(
        wp_url=args.wp_url,
        username=args.username,
        app_password=args.app_password,
    )

    # Test de connexion
    if args.test or (not args.markdown and not args.batch):
        print("🔗 Test de connexion à l'API WordPress...")
        if publisher.test_connection():
            print("✅ Connexion réussie")
        else:
            print("❌ Connexion échouée")
            sys.exit(1)
        return

    # Publier un article
    if args.markdown:
        try:
            result = publisher.publish_article(
                markdown_path=args.markdown,
                image_path=args.image,
                status=args.status,
                schedule=args.schedule,
            )
            print(json.dumps(result, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"❌ Erreur: {e}")
            sys.exit(1)

    # Publier en batch
    if args.batch:
        try:
            results = publisher.publish_batch(args.batch)
            print(json.dumps(results, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"❌ Erreur: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
