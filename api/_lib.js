// Utilitaires partagés par les handlers /api/works (works.js et works/[id].js).
// Source unique : le jour où on ajoute une colonne, on ne la déclare qu'ici.
import { neon } from '@neondatabase/serverless';

// Colonnes triables autorisées (anti-injection : on n'interpole jamais une valeur libre).
export const SORT_COLUMNS = new Set([
  'created_date', 'updated_date', 'title', 'year', 'rating',
  'started_at', 'finished_at', 'status', 'type',
]);

// Colonnes que le front a le droit d'écrire (id/dates/created_by sont gérés serveur).
export const WRITABLE = [
  'title', 'type', 'creator', 'creator_name', 'status', 'priority',
  'difficulty_level', 'language', 'mood', 'country', 'year', 'released_year',
  'rating', 'page_count', 'duration_minutes', 'favorite', 'source_url',
  'cover_image', 'recommended_by', 'description', 'personal_note',
  'short_review', 'genre', 'platform', 'tags', 'started_at', 'finished_at',
];

export const ARRAY_COLS = new Set(['genre', 'platform', 'tags']);

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant : Vercel → Settings → Environment Variables → ajoute DATABASE_URL (chaîne Neon), puis redéploie."
    );
  }
  return neon(url);
}

// text[] -> littéral Postgres '{"a","b"}' (robuste, indépendant du driver).
export function toPgArray(v) {
  const arr = Array.isArray(v) ? v : v == null || v === '' ? [] : [v];
  return '{' + arr.map((x) => '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

export function norm(k, v) {
  if (ARRAY_COLS.has(k)) return toPgArray(v);
  return v === '' ? null : v;
}
