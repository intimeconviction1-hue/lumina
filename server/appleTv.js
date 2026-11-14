const origin = 'https://tv.apple.com';

export function appleTvMoviePath(url) {
  if (url.hostname !== 'tv.apple.com') return null;
  return /^\/[a-z]{2}\/movie\/(?:[\w%-]+\/)?umc\.cmc\.[a-z0-9]+\/?$/i.test(url.pathname) ? url.pathname : null;
}

export async function appleTvMovie(path) {
  const source = origin + path;
  const response = await fetch(source, {
    headers: { Accept: 'text/html' },
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Film Apple TV indisponible.');

  const html = await response.text();
  for (const [, content] of html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let movie;
    try {
      movie = JSON.parse(content);
    } catch {
      continue;
    }
    if (movie?.['@type'] !== 'Movie' || !movie.name?.trim()) continue;

    const directors = [movie.director].flat().map(person => person?.name).filter(Boolean);
    const seconds = Number(html.match(/<meta\s+property="og:video:duration"\s+content="(\d+)"/i)?.[1]);
    const genre = html.match(/<meta\s+name="apple:description"\s+content="([^"&]+)"/i)?.[1]?.trim();
    return {
      title: movie.name.trim(),
      type: 'film',
      creator: directors.join(', ') || undefined,
      year: Number(movie.datePublished?.slice(0, 4)) || undefined,
      description: movie.description,
      cover_image: /^https:\/\/[^/]+\.mzstatic\.com\//i.test(movie.image) ? movie.image : undefined,
      duration_minutes: seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : undefined,
      genre: genre ? [genre.toLowerCase()] : [],
      source_url: source,
    };
  }
  throw new Error('Métadonnées du film Apple TV indisponibles.');
}
