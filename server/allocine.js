const moviePath = /^\/film\/fichefilm_gen_cfilm(?:=|%3D)(\d{1,12})\.html$/i;

export function allocineMovieId(url) {
  if (['allocine.fr', 'www.allocine.fr', 'm.allocine.fr'].includes(url.hostname)) {
    return moviePath.exec(url.pathname)?.[1];
  }
}

function findMovie(html) {
  const scripts = html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, content] of scripts) {
    try {
      const data = JSON.parse(content);
      const nodes = data?.['@graph'] || (Array.isArray(data) ? data : [data]);
      const movie = nodes.find(item => [item?.['@type']].flat().includes('Movie') && item.name);
      if (movie) return movie;
    } catch {
      // Une balise JSON-LD invalide ne doit pas masquer les suivantes.
    }
  }
  throw new Error('Métadonnées Allociné indisponibles');
}

export async function allocineMovie(id) {
  const source = `https://www.allocine.fr/film/fichefilm_gen_cfilm=${id}.html`;
  const response = await fetch(source, {
    headers: { Accept: 'text/html', 'Accept-Language': 'fr-FR' },
    redirect: 'error',
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error('Fiche Allociné indisponible');
  const html = await response.text();
  const movie = findMovie(html);
  const year = html.match(/Année de production\s*<\/span>\s*<span class="that">\s*(\d{4})\s*<\/span>/i)?.[1]
    || html.match(/<title>[^<]*\bFilm\s+(\d{4})\s+-\s+AlloCiné<\/title>/i)?.[1];
  const countries = [...html.matchAll(/<span\s+class="[^"]*\bnationality\b[^"]*"[^>]*>\s*([^<]+)<\/span>/gi)]
    .map(([, name]) => name.trim()).filter(Boolean);
  const duration = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(movie.duration);
  const minutes = duration && (Number(duration[1] || 0) * 60 + Number(duration[2] || 0) + Math.round(Number(duration[3] || 0) / 60));
  const genres = [movie.genre].flat().filter(genre => typeof genre === 'string');
  const directors = [movie.director].flat().map(person => person?.name).filter(Boolean);
  const image = [movie.image].flat()[0];
  const cover = typeof image === 'string' ? image : image?.url;
  return {
    title: movie.name,
    type: genres.some(genre => /^documentaire$/i.test(genre)) ? 'documentaire' : 'film',
    creator: [...new Set(directors)].join(', '),
    year: year ? Number(year) : undefined,
    description: typeof movie.description === 'string' ? movie.description.trim() : undefined,
    genre: genres.map(genre => genre.toLowerCase()),
    country: [...new Set(countries)].join(', '),
    duration_minutes: minutes || undefined,
    cover_image: /^https:\/\//i.test(cover || '') ? cover : undefined,
    source_url: source,
  };
}
