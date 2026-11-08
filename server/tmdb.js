const TMDB = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/w500';

export async function tmdbJSON(path, key, params = {}) {
  const url = new URL(TMDB + path);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', 'fr-FR');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, { signal: AbortSignal.timeout(6500) });
  if (!r.ok) throw new Error('TMDB ' + r.status + ' sur ' + path);
  return r.json();
}
