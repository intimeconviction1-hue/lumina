// api/tags.js
// Gestion des tags depuis l'interface (sans scripting).
// - GET            : liste tous les tags avec le nombre d'œuvres.
// - POST rename    : { from:[tag], to }        -> renomme un tag partout.
// - POST merge     : { from:[t1,t2,...], to }   -> fusionne plusieurs tags en un.
// - POST delete    : { from:[tag] }             -> retire un tag de toutes les œuvres.
// Agit directement sur la base Neon (colonne works.tags text[]).
import { neon } from '@neondatabase/serverless';

// text Postgres '{a,"b c"}' | JSON | tableau -> tableau JS (robuste).
function asTagArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '' || s === '{}') return [];
    if (s.startsWith('{') && s.endsWith('}')) {
      const inner = s.slice(1, -1);
      const out = []; let cur = ''; let q = false;
      for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (c === '"') { q = !q; continue; }
        if (c === ',' && !q) { out.push(cur); cur = ''; continue; }
        cur += c;
      }
      if (cur !== '' || out.length) out.push(cur);
      return out.map(x => x.replace(/\\"/g, '"').replace(/\\\\/g, '\\')).filter(x => x !== '');
    }
    try { const j = JSON.parse(s); if (Array.isArray(j)) return j; } catch { /* */ }
    return [s];
  }
  return [];
}

function toPgArray(arr) {
  return '{' + (arr || []).map(x => '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}

export default async function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ ok: false, error: 'DATABASE_URL manquante.' });
  const sql = neon(dbUrl);

  // --- Lister les tags avec leur nombre d'œuvres ---
  if (req.method === 'GET') {
    try {
      const rows = await sql`select tags from works`;
      const counts = {};
      for (const r of rows) {
        asTagArray(r.tags).forEach(t => {
          const k = String(t).trim();
          if (k) counts[k] = (counts[k] || 0) + 1;
        });
      }
      const tags = Object.entries(counts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => a.tag.localeCompare(b.tag, 'fr'));
      return res.status(200).json({ ok: true, tags, totalWorks: rows.length });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  let body;
  try { body = await readBody(req); } catch { return res.status(400).json({ ok: false, error: 'Corps invalide.' }); }

  const action = body.action;
  const sources = (Array.isArray(body.from) ? body.from : [body.from])
    .map(x => String(x || '').trim()).filter(Boolean);
  let target = (action === 'delete' || body.to == null) ? null : String(body.to).trim();

  if (!['rename', 'merge', 'delete'].includes(action)) return res.status(400).json({ ok: false, error: 'Action inconnue.' });
  if (!sources.length) return res.status(400).json({ ok: false, error: 'Aucun tag source fourni.' });
  if ((action === 'rename' || action === 'merge') && !target) return res.status(400).json({ ok: false, error: 'Tag cible manquant.' });

  const srcLower = new Set(sources.map(s => s.toLowerCase()));

  try {
    const rows = await sql`select id, tags from works`;
    const changes = [];
    for (const w of rows) {
      const old = asTagArray(w.tags).map(t => String(t).trim()).filter(Boolean);
      const hasSource = old.some(t => srcLower.has(t.toLowerCase()));
      if (!hasSource) continue; // œuvre non concernée : on ne la touche pas

      const out = []; const seen = new Set();
      for (const t of old) {
        const nk = srcLower.has(t.toLowerCase()) ? target : t;
        if (!nk) continue; // suppression
        const key = nk.toLowerCase();
        if (seen.has(key)) continue; // dédoublonnage
        seen.add(key); out.push(nk);
      }
      changes.push({ id: w.id, newTags: out });
    }

    let applied = 0;
    for (let i = 0; i < changes.length; i += 50) {
      const batch = changes.slice(i, i + 50);
      await Promise.all(batch.map(c =>
        sql`update works set tags = ${toPgArray(c.newTags)}::text[], updated_date = now() where id = ${c.id}`
      ));
      applied += batch.length;
    }
    return res.status(200).json({ ok: true, action, sources, target, changedWorks: applied });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
