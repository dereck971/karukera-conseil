// insee.js
// -----------------------------------------------------------------------------
// Référentiel INSEE des communes Guadeloupe (971) et Martinique (972).
// CRITIQUE : toujours valider commune ↔ code INSEE avant tout appel API
// (cf. memoire `feedback_code_insee_critical.md`).
//
// Source : COG officiel INSEE 1er janvier 2025 (croisé avec Wikipedia).
// -----------------------------------------------------------------------------

const COMMUNES_971 = {
  '97101': 'Les Abymes',
  '97102': 'Anse-Bertrand',
  '97103': 'Baie-Mahault',
  '97104': 'Baillif',
  '97105': 'Basse-Terre',
  '97106': 'Bouillante',
  '97107': 'Capesterre-Belle-Eau',
  '97108': 'Capesterre-de-Marie-Galante',
  '97109': 'Gourbeyre',
  '97110': 'La Désirade',
  '97111': 'Deshaies',
  '97112': 'Grand-Bourg',
  '97113': 'Le Gosier',
  '97114': 'Goyave',
  '97115': 'Lamentin',
  '97116': 'Morne-à-l\u2019Eau',
  '97117': 'Le Moule',
  '97118': 'Petit-Bourg',
  '97119': 'Petit-Canal',
  '97120': 'Pointe-à-Pitre',
  '97121': 'Pointe-Noire',
  '97122': 'Port-Louis',
  '97124': 'Saint-Claude',
  '97125': 'Saint-François',
  '97126': 'Saint-Louis',
  '97128': 'Sainte-Anne',
  '97129': 'Sainte-Rose',
  '97130': 'Terre-de-Bas',
  '97131': 'Terre-de-Haut',
  '97132': 'Trois-Rivières',
  '97133': 'Vieux-Fort',
  '97134': 'Vieux-Habitants'
};

const COMMUNES_972 = {
  '97201': "L'Ajoupa-Bouillon",
  '97202': 'Les Anses-d\u2019Arlet',
  '97203': 'Basse-Pointe',
  '97204': 'Le Carbet',
  '97205': 'Case-Pilote',
  '97206': 'Le Diamant',
  '97207': 'Ducos',
  '97208': 'Fonds-Saint-Denis',
  '97209': 'Fort-de-France',
  '97210': 'Le François',
  '97211': 'Grand\u2019Rivière',
  '97212': 'Gros-Morne',
  '97213': 'Le Lamentin',
  '97214': 'Le Lorrain',
  '97215': 'Macouba',
  '97216': 'Le Marigot',
  '97217': 'Le Marin',
  '97218': 'Le Morne-Rouge',
  '97219': 'Le Morne-Vert',
  '97220': 'Le Prêcheur',
  '97221': 'Rivière-Pilote',
  '97222': 'Rivière-Salée',
  '97223': 'Le Robert',
  '97224': 'Saint-Esprit',
  '97225': 'Saint-Joseph',
  '97226': 'Saint-Pierre',
  '97227': 'Sainte-Anne',
  '97228': 'Sainte-Luce',
  '97229': 'Sainte-Marie',
  '97230': 'Schoelcher',
  '97231': 'La Trinité',
  '97232': 'Les Trois-Îlets',
  '97233': 'Le Vauclin',
  '97234': 'Bellefontaine'
};

// CRITIQUE — codes notables :
//   97103 = Baie-Mahault    (PAS Petit-Bourg)
//   97105 = Basse-Terre     (PAS Baie-Mahault)
//   97118 = Petit-Bourg     (vérifié 17/04/2026 vs Wikipedia COG)
//   97120 = Pointe-à-Pitre  (vérifié 17/04/2026 vs Wikipedia COG)

function nameForCode(code) {
  return COMMUNES_971[code] || COMMUNES_972[code] || null;
}

function codeForName(name) {
  const norm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [code, n] of Object.entries({ ...COMMUNES_971, ...COMMUNES_972 })) {
    if (n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === norm) return code;
  }
  return null;
}

function isGuadeloupe(code) { return COMMUNES_971[code] !== undefined; }
function isMartinique(code) { return COMMUNES_972[code] !== undefined; }

module.exports = {
  COMMUNES_971, COMMUNES_972,
  nameForCode, codeForName,
  isGuadeloupe, isMartinique
};
