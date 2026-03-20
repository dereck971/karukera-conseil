# Template Prompt Gemini — Rendu Esquisse Architecturale

## Prompt Gagnant (Prompt 1 — validé par Dereck le 19/03/2026)

### Template paramétrique

```
Generate an architectural sketch render of a small tropical {type_batiment} ({surface_habitable} square meters) on a {type_terrain} plot in {commune}, Guadeloupe, Caribbean. Style: pencil sketch on white paper, monochrome graphite, no colors. The {type_batiment} has a {forme_description} with a {toiture_description}, a covered wooden terrace with pergola facing {orientation}, and tropical vegetation ({vegetation_description}). The terrain shows {terrain_description}. Include construction setback lines (dashed). {vue_description}. Professional architectural presentation quality, clean minimalist lines, white background. The render should look like a hand-drawn architect's concept sketch.
```

### Paramètres variables

| Paramètre | Source | Exemple |
|-----------|--------|---------|
| `{type_batiment}` | Input utilisateur | "bungalow T2", "villa T4", "petit collectif R+1" |
| `{surface_habitable}` | Input utilisateur | "40", "150", "20" |
| `{type_terrain}` | Fiche commune JSON → topographie | "hillside", "flat coastal", "gently sloping" |
| `{commune}` | Fiche commune JSON → commune | "Sainte-Anne", "Basse-Terre", "Le Gosier" |
| `{forme_description}` | Dérivé du programme | "simple rectangular shape", "L-shaped layout" |
| `{toiture_description}` | PLU → toiture | "two-slope corrugated roof", "four-slope hip roof" |
| `{orientation}` | Dérivé vent dominant / soleil | "south", "south-west" |
| `{vegetation_description}` | Contexte géographique | "palm trees, shrubs", "dense tropical forest, banana trees" |
| `{terrain_description}` | Topo réel / contexte | "gentle slopes with contour lines visible", "flat terrain near the coast with sea visible in background" |
| `{vue_description}` | Fixe ou variable | "Bird's eye perspective view at 45 degrees" |

### Variantes par type de projet

**Bungalow 20m² (gîte):**
- forme: "simple compact rectangular shape"
- toiture: "two-slope corrugated metal roof with wide overhangs"
- ajout: "raised on short stilts with wooden stairs"

**Bungalow 30-40m² (T2 tourisme):**
- forme: "simple rectangular shape with covered terrace"
- toiture: "two-slope corrugated roof"
- ajout: "a small plunge pool nearby"

**Villa 150m² (T4 familiale):**
- forme: "L-shaped two-story layout"
- toiture: "four-slope hip roof with red corrugated metal"
- ajout: "a carport for 2 vehicles and a garden wall"

### Variantes terrain par zone géographique

**Littoral sud (Sainte-Anne, Le Gosier, Saint-François):**
- terrain: "flat to gently sloping coastal terrain with sea visible in background, sandy soil"
- végétation: "coconut palm trees, sea grape shrubs, bougainvillea"

**Plaine (Baie-Mahault, Les Abymes, Morne-à-l'Eau):**
- terrain: "flat terrain with drainage canals, mangrove visible in distance"
- végétation: "royal palm trees, mango trees, tropical shrubs"

**Relief Basse-Terre (Basse-Terre, Gourbeyre, Saint-Claude, Trois-Rivières):**
- terrain: "steep volcanic hillside with dense vegetation, mountain visible in background"
- végétation: "dense tropical forest, tree ferns, banana trees, breadfruit trees"

### Style Rendering — Paramètres fixes

- Style: pencil sketch on white paper
- Palette: monochrome graphite, no colors
- Qualité: professional architectural presentation
- Lignes: clean minimalist
- Fond: white background
- Apparence: hand-drawn architect's concept sketch
- Vue: Bird's eye perspective at 45 degrees
- Éléments techniques: construction setback lines (dashed), contour lines on terrain

### Intégration dans le pipeline KCI

Ce prompt est appelé par le skill `masse-batiment-3d` qui :
1. Lit la fiche commune JSON (PLU, topographie, marché)
2. Compose le prompt paramétrique avec les données réelles
3. Appelle l'API Gemini (gemini-2.0-flash ou imagen-3)
4. Récupère l'image PNG
5. L'intègre dans le rapport KCI via le skill `kci-rapport`
