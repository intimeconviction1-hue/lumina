// Recherche prudente d'affiches TMDB pour les films et documentaires sans image.
// GET = aperçu en lecture seule ; POST = applique uniquement cover_image.
import { neon } from '@neondatabase/serverless';

const SEARCH_URL = 'https://api.themoviedb.org/3/search/';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';
const TYPES = ['film', 'documentaire'];

function normalize(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, ' ').trim();
}

async function candidates(title, type, key) {
  const kinds = type === 'film' ? ['movie'] : ['movie', 'tv'];
  const all = [];
  for (const kind of kinds) {
    const url = new URL(SEARCH_URL + kind);
    url.searchParams.set('api_key', key);
    url.searchParams.set('language', 'fr-FR');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('query', title);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB ${response.status}`);
    const result = await response.json();
    for (const hit of result.results || []) {
      if (hit.poster_path) all.push({
        id: `${kind}:${hit.id}`,
        title: hit.title || hit.name,
        originalTitle: hit.original_title || hit.original_name,
        year: Number((hit.release_date || hit.first_air_date || '').slice(0, 4)),
        poster: POSTER_URL + hit.poster_path,
      });
    }
  }
  return all;
}

function exactMatch(work, hits) {
  const year = Number(work.year || work.released_year);
  if (!year) return { reason: 'année absente' };
  const title = normalize(work.title);
  const matches = hits.filter(hit =>
    hit.year === year &&
    (normalize(hit.title) === title || normalize(hit.originalTitle) === title)
  );
  const distinct = [...new Map(matches.map(hit => [hit.id, hit])).values()];
  return distinct.length === 1 ? { hit: distinct[0] } :
    { reason: distinct.length ? 'plusieurs correspondances' : 'titre ou année différents' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!process.env.DATABASE_URL || !process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'Configuration base de données ou TMDB manquante' });
  }
  const sql = neon(process.env.DATABASE_URL);
  const after = String(req.method === 'POST' ? req.body?.after || '' : req.query.after || '');
  const requested = Number(req.method === 'POST' ? req.body?.limit : req.query.limit);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 10) : 5;
  try {
    const rows = await sql.query(
      `SELECT id, title, type, year, released_year FROM works
       WHERE type = ANY($1::text[]) AND (cover_image IS NULL OR cover_image = '')
         AND id > $2 ORDER BY id LIMIT $3`, [TYPES, after, limit]
    );
    const details = [];
    let updated = 0;
    for (const work of rows) {
      if (!work.year && !work.released_year) {
        details.push({ id: work.id, title: work.title, status: 'ignoré', reason: 'année absente' });
        continue;
      }
      try {
        const match = exactMatch(work, await candidates(work.title, work.type, process.env.TMDB_API_KEY));
        if (!match.hit) {
          details.push({ id: work.id, title: work.title, status: 'ignoré', reason: match.reason });
          continue;
        }
        if (req.method === 'POST') {
          const changed = await sql.query(
            `UPDATE works SET cover_image = $1, updated_date = now()
             WHERE id = $2 AND (cover_image IS NULL OR cover_image = '') RETURNING id`,
            [match.hit.poster, work.id]
          );
          updated += changed.length;
        }
        details.push({ id: work.id, title: work.title, year: Number(work.year || work.released_year),
          status: req.method === 'POST' ? 'appliqué' : 'proposé', match: match.hit.title,
          poster: match.hit.poster });
      } catch (error) {
        details.push({ id: work.id, title: work.title, status: 'erreur', reason: String(error.message || error) });
      }
    }
    return res.status(200).json({ mode: req.method === 'POST' ? 'apply' : 'preview',
      processed: rows.length, updated, cursor: rows.at(-1)?.id || null,
      done: rows.length < limit, details });
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
}
