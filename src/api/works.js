// Façade données — branchée sur les fonctions serverless Neon (/api/works).
// Même interface que l'ancienne version Base44 : list / get / create / update / remove.

const BASE = '/api/works';

async function parse(res) {
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* corps non-JSON */
    }
    throw new Error(msg);
  }
  return res.json();
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const worksApi = {
  list: (sort = '-created_date', limit = 5000) =>
    fetch(`${BASE}?sort=${encodeURIComponent(sort)}&limit=${limit}`).then(parse),

  get: (id) => fetch(`${BASE}/${encodeURIComponent(id)}`).then(parse),

  create: (data) =>
    fetch(BASE, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }).then(parse),

  update: (id, patch) =>
    fetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    }).then(parse),

  remove: (id) =>
    fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(parse),
};
