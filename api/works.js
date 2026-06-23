import { neon } from '@neondatabase/serverless';

// Colonnes triables autorisées (anti-injection : on n'interpole jamais une valeur libre)
const SORT_COLUMNS = new Set([
  'created_date', 'updated_date', 'title', 'year', 'rating',
  'started_at', 'finished_at', 'status', 'type',
]);

// Colonnes que le front a le droit d'écrire (id/dates/created_by sont gérés serveur)
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

// text[] -> littéral Postgres '{"a","b"}' (robuste, indépendant du driver)
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

    if (req.method === 'GET') {
      let sort = (req.query.sort || '-created_date').toString();
      let dir = 'ASC';
      if (sort.startsWith('-')) { dir = 'DESC'; sort = sort.slice(1); }
      if (!SORT_COLUMNS.has(sort)) sort = 'created_date';
      let limit = parseInt(req.query.limit, 10);
      if (!Number.isFinite(limit) || limit <= 0 || limit > 10000) limit = 5000;
      const rows = await sql.query(
        `select * from works order by ${sort} ${dir} nulls last limit $1`,
        [limit]
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const cols = ['id'];
      const ph = ['$1'];
      const id = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
      const vals = [id];
      for (const k of WRITABLE) {
        if (k in body) {
          vals.push(norm(k, body[k]));
          cols.push(k);
          ph.push(`$${vals.length}${ARRAY_COLS.has(k) ? '::text[]' : ''}`);
        }
      }
      const now = new Date().toISOString();
      vals.push(now); cols.push('created_date'); ph.push(`$${vals.length}`);
      vals.push(now); cols.push('updated_date'); ph.push(`$${vals.length}`);
      const text = `insert into works (${cols.join(',')}) values (${ph.join(',')}) returning *`;
      const rows = await sql.query(text, vals);
      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
