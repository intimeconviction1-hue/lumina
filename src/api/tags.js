// Façade données pour la gestion des tags — branchée sur /api/tags (Neon).
//
// Chaque action existe en deux temps :
//   • preview(...) : calcule l'impact, N'ÉCRIT RIEN → { changedWorks, collision, sample }
//   • l'action elle-même : applique.
// Le serveur utilise le MÊME code de calcul dans les deux cas, donc l'aperçu
// ne peut pas mentir sur ce qui va se passer.

const BASE = '/api/tags';

async function parse(res) {
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try { const data = await res.json(); if (data?.error) msg = data.error; } catch { /* */ }
    throw new Error(msg);
  }
  return res.json();
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const post = (payload) =>
  fetch(BASE, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) }).then(parse);

// Construit le corps d'une action à partir de son nom, de ses sources et de sa cible.
function payloadFor(action, from, to) {
  const body = { action, from: Array.isArray(from) ? from : [from] };
  if (action !== 'delete') body.to = to;
  return body;
}

export const tagsApi = {
  // Liste : { ok, tags: [{ tag, count }], totalWorks }
  list: () => fetch(BASE).then(parse),

  // Aperçu d'une action — aucune écriture en base.
  // Renvoie { changedWorks, collision, collisionCount, target, sample: [titres] }.
  preview: (action, from, to) => post({ ...payloadFor(action, from, to), dryRun: true }),

  // Renomme un tag partout.
  rename: (from, to) => post(payloadFor('rename', from, to)),

  // Fusionne plusieurs tags (tableau) en un seul.
  merge: (fromList, to) => post(payloadFor('merge', fromList, to)),

  // Retire un tag de toutes les œuvres.
  remove: (tag) => post(payloadFor('delete', tag)),
};
