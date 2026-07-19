import { randomBytes } from 'crypto';
import { getSql, WRITABLE, ARRAY_COLS, SORT_COLUMNS, norm } from './_lib.js';

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
      // Convention Lumina : IDs 24 caractères hex (comme les imports Neon existants),
      // pas des UUID — sinon les nouvelles lignes créées ici détonnent avec le reste de la table.
      const id = randomBytes(12).toString('hex');
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
