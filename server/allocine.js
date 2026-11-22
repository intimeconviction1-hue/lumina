const moviePath = /^\/film\/fichefilm_gen_cfilm(?:=|%3D)(\d{1,12})\.html$/i;

const articlePath = /^\/article\/fichearticle_gen_carticle(?:=|%3D)(\d{1,12})\.html$/i;
const isAllocine = url => ['allocine.fr', 'www.allocine.fr', 'm.allocine.fr'].includes(url.hostname);

export function allocineMovieId(url) {
  if (isAllocine(url)) {
    return moviePath.exec(url.pathname)?.[1];
  }
}

export function allocineArticleId(url) {
  if (isAllocine(url)) return articlePath.exec(url.pathname)?.[1];
}

const hasType = (node, type) => [node?.['@type']].flat().includes(type);

function* structuredData(html) {
  const scripts = html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, content] of scripts) {
    try {
      const data = JSON.parse(content);
      const nodes = data?.['@graph'] || (Array.isArray(data) ? data : [data]);
      yield* nodes;
    } catch {
      // Une balise JSON-LD invalide ne doit pas masquer les suivantes.
    }
  }
}

async function allocineHtml(source) {
  const response = await fetch(source, {
    headers: { Accept: 'text/html', 'Accept-Language': 'fr-FR' },
    redirect: 'error',
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error('Page Allociné indisponible');
  return response.text();
}

export async function allocineArticleMovie(id) {
  const source = `https://www.allocine.fr/article/fichearticle_gen_carticle=${id}.html`;
  const html = await allocineHtml(source);
  const ids = new Set();
  for (const node of structuredData(html)) {
    if (!hasType(node, 'NewsArticle') && !hasType(node, 'Article')) continue;
    for (const movie of [node.mentions, node.about, node.mainEntity].flat()) {
      if (!hasType(movie, 'Movie') || typeof movie.url !== 'string') continue;
      const url = URL.parse(movie.url, source);
      const movieId = url?.protocol === 'https:' && allocineMovieId(url);
      if (movieId) ids.add(movieId);
    }
  }
  if (ids.size !== 1) return null;
  const [movieId] = ids;
  return allocineMovie(movieId);
}

export async function allocineMovie(id) {
  const source = `https://www.allocine.fr/film/fichefilm_gen_cfilm=${id}.html`;
  const html = await allocineHtml(source);
  const movie = [...structuredData(html)].find(node => hasType(node, 'Movie') && node.name);
  if (!movie) throw new Error('Métadonnées Allociné indisponibles');
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
    cover_image: /^https:\/\//i.test(cover || '') && !/\/empty\/empty_[^/]+$/i.test(cover) ? cover : undefined,
    source_url: source,
  };
}


const seriesPath = /^\/series\/ficheserie_gen_cserie(?:=|%3D)(\d{1,12})\.html$/i;
export function allocineSeriesId(url) {
  if (isAllocine(url)) return seriesPath.exec(url.pathname)?.[1];
}
function decodeSeriesText(value) {
  return String(value || '').replace(/&(?:amp|quot|apos|#39|lt|gt);/gi, entity => ({
    '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>'
  })[entity.toLowerCase()] || entity).trim();
}
function seriesMeta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
      .map(([, name, , value]) => [name.toLowerCase(), value]));
    if (attrs.property === key || attrs.name === key) return decodeSeriesText(attrs.content);
  }
}
export async function allocineSeries(id) {
  const source = 'https://www.allocine.fr/series/ficheserie_gen_cserie=' + id + '.html';
  const html = await allocineHtml(source);
  const data = [...structuredData(html)].find(node =>
    (hasType(node, 'TVSeries') || hasType(node, 'CreativeWorkSeries')) && node.name);
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title = decodeSeriesText(data?.name || seriesMeta(html, 'og:title') ||
    titleTag?.replace(/\s*[-–|]\s*(?:Série TV.*)?AlloCiné.*$/i, ''));
  if (!title || /^allocin[eé]$/i.test(title)) throw new Error('Métadonnées série AlloCiné indisponibles');
  const description = decodeSeriesText(data?.description || seriesMeta(html, 'og:description') ||
    seriesMeta(html, 'description'));
  const dateText = data?.datePublished || data?.startDate || data?.dateCreated ||
    /Depuis\s+((?:19|20)\d{2})/i.exec(html)?.[1] ||
    /\bSérie TV\s+((?:19|20)\d{2})\b/i.exec(titleTag || '')?.[1];
  const yearMatch = String(dateText || '').match(/\b(?:19|20)\d{2}\b/);
  const creator = [data?.creator || data?.author].flat().map(person =>
    typeof person === 'string' ? person : person?.name).filter(Boolean);
  const image = [data?.image].flat()[0];
  const cover = (typeof image === 'string' ? image : image?.url) || seriesMeta(html, 'og:image');
  const duration = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(String(data?.timeRequired || data?.duration || ''));
  const minutes = duration && (Number(duration[1] || 0) * 60 +
    Number(duration[2] || 0) + Math.round(Number(duration[3] || 0) / 60));
  return {
    title, type: 'série',
    creator: [...new Set(creator)].join(', '),
    year: yearMatch ? Number(yearMatch[0]) : undefined,
    description: description || undefined,
    genre: [data?.genre].flat().filter(g => typeof g === 'string').map(g => g.toLowerCase()),
    duration_minutes: minutes || undefined,
    cover_image: /^https:\/\//i.test(cover || '') ? cover : undefined,
    source_url: source,
  };
}
