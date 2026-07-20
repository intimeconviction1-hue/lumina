// Façade données pour la gestion des tags — branchée sur /api/tags (Neon).
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

export const tagsApi = {
  // Liste : { ok, tags: [{ tag, count }], totalWorks }
  list: () => fetch(BASE).then(parse),

  // Renomme un tag partout.
  rename: (from, to) =>
    fetch(BASE, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'rename', from: [from], to }) }).then(parse),

  // Fusionne plusieurs tags (tableau) en un seul.
  merge: (fromList, to) =>
    fetch(BASE, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'merge', from: fromList, to }) }).then(parse),

  // Retire un tag de toutes les œuvres.
  remove: (tag) =>
    fetch(BASE, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'delete', from: [tag] }) }).then(parse),
};
