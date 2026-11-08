import { createHash, randomBytes } from 'crypto';
import { getSql, WRITABLE, ARRAY_COLS, SORT_COLUMNS, norm } from './_lib.js';
import { gqDocumentaries } from '../server/gqDocumentaries.js';
import { enrichMovieLink } from '../server/importLink.js';

async function addGqSelection(sql, ids, res) {
  const selected = gqDocumentaries.filter(work => ids.includes(work.id));
  if (!selected.length || selected.length !== new Set(ids).size) {
    return res.status(400).json({ error: 'Sélection de documentaires invalide.' });
  }
  const movies = await Promise.all(selected.map(async work => {
    const enriched = await enrichMovieLink(work);
    return {
      ...work,
      cover_image: enriched.cover_image,
      country: enriched.country,
      duration_minutes: enriched.duration_minutes,
      genre: enriched.genre,
      description: enriched.description || work.description,
    };
  }));
  const results = await sql.transaction(tx => movies.map(work => {
    const id = createHash('sha256').update(`lumina:gq-documentaries:${work.id}`).digest('hex').slice(0, 24);
    return tx`
      insert into works (id, title, type, status, year, creator, creator_name, description, cover_image,
                         source_url, country, duration_minutes, genre, created_date, updated_date)
      select ${id}, ${work.title}, ${work.type}, ${work.status}, ${work.year}, ${work.creator}, ${work.creator},
             ${work.description}, ${work.cover_image ?? null}, ${work.source_url}, ${work.country ?? null},
             ${work.duration_minutes ?? null}, ${norm('genre', work.genre)}::text[], now(), now()
      where not exists (
        select 1 from works where lower(trim(title)) = lower(${work.title})
          and coalesce(year, released_year) = ${work.year}
          and type in ('film', 'documentaire', 'vidéo')
      )
      on conflict (id) do nothing
      returning id
    `;
  }));
  const added = results.reduce((count, rows) => count + rows.length, 0);
  return res.status(201).json({ added, skipped: selected.length - added });
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
      if (Array.isArray(body.gqDocumentaries)) return await addGqSelection(sql, body.gqDocumentaries, res);
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
