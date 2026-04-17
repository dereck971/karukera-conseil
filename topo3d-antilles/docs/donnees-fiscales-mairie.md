# Données fiscales communales — Format attendu par Topo3D Antilles

**Destinataire** : Services fiscaux / urbanisme des mairies partenaires (Petit-Bourg, Sainte-Anne, Goyave, etc.)
**Émetteur** : Karukera Conseil Immobilier (KCI) — contact@karukera-conseil.com
**Version** : 1.0.0 — 17/04/2026

---

## Pourquoi ce document

Topo3D Antilles est la carte 3D interactive déployée pour votre commune. Pour visualiser le potentiel de recouvrement fiscal sur les parcelles cadastrales (Taxe Foncière Bâti, TFNB, CFE, valeur locative), nous avons besoin du fichier de données fiscales de votre commune dans le format décrit ci-dessous.

Le fichier reste **stocké localement** (serveur KCI dédié à votre commune), n'est jamais partagé avec des tiers, et respecte le RGPD : aucune donnée nominative n'est demandée — seul le **type juridique** du propriétaire est requis (particulier / SCI / SAS / commune / etc.), pas de nom ni d'adresse.

---

## Format recommandé : CSV UTF-8

- **Séparateur** : point-virgule `;`
- **Décimale** : point `.`
- **Encodage** : UTF-8
- **En-têtes** : ligne 1 obligatoire, noms exacts (voir ci-dessous)
- **Excel xlsx toléré** : 1 onglet, en-têtes en ligne 1, sera converti à l'ingestion

## Colonnes obligatoires (6)

| Nom de colonne | Type | Description | Exemple |
|---|---|---|---|
| `ref_cadastrale` | texte | Référence cadastrale complète format `INSEE5 préfixe3 section numéro4` | `97118 000 AB 0123` |
| `valeur_locative_eur` | nombre | Valeur locative cadastrale annuelle (€) | `4250` |
| `tfb_eur` | nombre | Taxe Foncière Bâti due (€/an) | `1832` |
| `tfnb_eur` | nombre | Taxe Foncière Non Bâti (€/an) — `0` si bâti | `0` |
| `cfe_eur` | nombre | Cotisation Foncière des Entreprises (€/an) — `0` si pas d'activité | `0` |
| `annee_revision_vl` | entier | Année de la dernière révision de valeur locative | `2017` |

## Colonnes optionnelles (mais utiles)

| Nom de colonne | Type | Valeurs autorisées | Description |
|---|---|---|---|
| `proprietaire_type` | texte | `particulier`, `sci`, `sarl`, `sas`, `etat`, `commune`, `indivision`, `autre` | Type juridique du propriétaire (anonyme) |
| `usage` | texte | `residentiel`, `commercial`, `industriel`, `agricole`, `religieux`, `sportif`, `annexe`, `indetermine` | Usage principal du bâti |
| `categorie_fiscale` | texte | M, U, MA, etc. (nomenclature DGFiP) | Catégorie fiscale officielle |
| `annee_construction` | entier | Année (1900-2026) | Date de construction (utile pour détecter sous-fiscalisation) |

## Exemple complet (CSV)

```csv
ref_cadastrale;valeur_locative_eur;tfb_eur;tfnb_eur;cfe_eur;annee_revision_vl;proprietaire_type;usage;categorie_fiscale
97118 000 AB 0123;4250;1832;0;0;2017;particulier;residentiel;M
97118 000 AB 0124;0;0;215;0;1995;commune;agricole;
97118 000 BC 0042;12500;5400;0;3200;2017;sas;commercial;U
97118 000 DE 0089;8200;1100;0;0;2002;sci;residentiel;M
```

---

## Ce que Topo3D Antilles fait avec ces données

Une fois les données ingérées, votre carte 3D affichera, au clic sur une parcelle :

- **Valeur locative cadastrale** courante
- **TFB / TFNB / CFE** dues
- **Année de la dernière révision** (alerte si > 15 ans)
- **Indicateur sous-fiscalisation** : parcelle marquée si `TFB / valeur_locative < 0.30` OU `annee_revision_vl < 2010`
- **Vue d'ensemble** : nombre de parcelles potentiellement sous-fiscalisées sur la commune

Cela permet aux services communaux d'identifier les marges de manœuvre fiscales **sans accès direct aux données nominatives** (qui restent à la DGFiP).

---

## Sécurité et RGPD

| Garantie | Détail |
|---|---|
| **Pas de données nominatives** | Seul le type juridique (particulier/SCI/...) est demandé. Aucun nom, aucune adresse de propriétaire. |
| **Stockage local** | Données stockées sur serveur dédié à votre commune. Pas de cloud public. Accès par token uniquement. |
| **Pas de partage tiers** | Données utilisées exclusivement pour l'affichage sur votre carte 3D. Aucun envoi à des partenaires commerciaux. |
| **Suppression sur demande** | À tout moment, vous pouvez demander la suppression complète des données. Effacement sous 7 jours. |
| **Audit trail** | Chaque ingestion est loggée (date, IP partielle, nb de lignes). Trace consultable sur demande. |
| **Conformité** | Module sécurité partagé KCI (`api/_lib/security.js`) : token Bearer admin, rate-limit 5 req/min/IP, validation stricte des entrées (anti-injection), pas d'exécution de code utilisateur. |

---

## Comment transmettre votre fichier

1. **Préparation** : exportez les données fiscales communales depuis votre logiciel SIG / fiscal interne (Microbe, Vega, ou export DGFiP) au format CSV.
2. **Vérification** : ouvrez le fichier dans un éditeur (Excel, LibreOffice). Vérifiez les en-têtes ligne 1 et l'absence de cellules vides dans les colonnes obligatoires.
3. **Envoi** : par email à **contact@karukera-conseil.com** OU via l'interface admin Topo3D Antilles (lien fourni séparément avec votre token d'accès).
4. **Confirmation** : KCI valide la structure dans les 24h, vous renvoie un rapport (nb de lignes acceptées, lignes rejetées avec motif), et active la couche fiscale sur votre carte 3D.

## Questions fréquentes

**Q. Est-ce que je dois fournir TOUTES les parcelles ?**
R. Idéalement oui (couverture exhaustive de la commune). Mais nous pouvons commencer avec un sous-ensemble (ex : centre-bourg, ou parcelles bâties uniquement) et compléter progressivement.

**Q. Que se passe-t-il si j'ai des données erronées ou manquantes ?**
R. L'ingestion détecte les lignes incohérentes et les rejette automatiquement. Tolérance : 5% d'erreurs maximum, sinon le fichier est refusé en entier (vous recevez un rapport d'erreur détaillé).

**Q. À quelle fréquence dois-je mettre à jour ?**
R. Une mise à jour annuelle suffit (par exemple en mars après les avis de TFB). Vous pouvez aussi pousser des MAJ ponctuelles (ex : après une révision de valeur locative).

**Q. Quels sont mes droits sur les données après transmission ?**
R. Les données restent votre propriété. KCI agit comme sous-traitant au sens du RGPD. Vous pouvez demander à tout moment l'extraction, la rectification, ou la suppression.

---

## Contact

**Karukera Conseil Immobilier**
Dereck Rauzduel — Architecte EPFL
Email : contact@karukera-conseil.com
Téléphone : (à fournir lors du premier RDV)

— *Document à transmettre à Mme Aly et tout autre référent fiscal communal.*
