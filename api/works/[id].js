import { getSql, WRITABLE, ARRAY_COLS, norm } from '../_lib.js';

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
