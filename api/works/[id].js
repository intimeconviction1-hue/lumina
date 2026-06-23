import { neon } from '@neondatabase/serverless';

const WRITABLE = [
  'title', 'type', 'creator', 'creator_name', 'status', 'priority',
  'difficulty_level', 'language', 'mood', 'country', 'year', 'released_year',
  'rating', 'page_count', 'duration_minutes', 'favorite', 'source_url',
  'cover_image', 'recommended_by', 'description', 'personal_note',
  'short_review', 'genre', 'platform', 'tags', 'started_at', 'finished_at',
];

const ARRAY_COLS = new Set(['genre', 'platform', 'tags']);

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant : Vercel → Settings → Environment Variables → ajoute DATABASE_URL (chaîne Neon), puis redéploie."
    );
  }
  return neon(url);
}

function toPgArray(v) {
  const arr = Array.isArray(v) ? v : v == null || v === '' ? [] : [v];
  return '{' + arr.map((x) => '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

function norm(k, v) {
  if (ARRAY_COLS.has(k)) return toPgArray(v);
  return v === '' ? null : v;
}

export default async function handler(req, res) {
  try {
    const sql = getSql();
    const { id } = req.query;

    if (req.method === 'GET') {
      const rows = await sql.query('select * from works where id = $1', [id]);
      if (!rows.length) return res.status(404).json({ error: 'not found' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = req.body || {};
      const sets = [];
      const vals = [];
      for (const k of WRITABLE) {
        if (k in body) {
          vals.push(norm(k, body[k]));
          sets.push(`${k} = $${vals.length}${ARRAY_COLS.has(k) ? '::text[]' : ''}`);
        }
      }
      vals.push(new Date().toISOString());
      sets.push(`updated_date = $${vals.length}`);
      vals.push(id);
      const text = `update works set ${sets.join(', ')} where id = $${vals.length} returning *`;
      const rows = await sql.query(text, vals);
      if (!rows.length) return res.status(404).json({ error: 'not found' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      await sql.query('delete from works where id = $1', [id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
