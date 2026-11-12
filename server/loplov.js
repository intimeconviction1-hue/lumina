const filmPath = /^\/([a-f\d]{7})\/b\/loplov\/(\d{1,20})\/?$/i;
const entities = { amp: '&', apos: "'", quot: '"', nbsp: ' ' };

export function loplovFilmPath(url) {
  if (!['loplov.com', 'www.loplov.com'].includes(url.hostname)) return;
  const match = filmPath.exec(url.pathname);
  if (match) return '/' + match[1] + '/b/loplov/' + match[2];
}

function pageText(value) {
  return value?.replace(/<[^>]*>/g, ' ').replace(/&(#x[\da-f]+|#\d+|amp|apos|quot|nbsp);/gi, (entity, key) => {
    if (key[0] !== '#') return entities[key.toLowerCase()];
    const hex = key[1].toLowerCase() === 'x';
    const code = parseInt(key.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  }).replace(/\s+/g, ' ').trim();
}

export async function loplovFilm(path) {
  const source = 'https://loplov.com' + path;
  const response = await fetch(source, {
    headers: { Accept: 'text/html' },
    redirect: 'error',
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error('Fiche Loplov indisponible');
  const html = await response.text();
  const rawTitle = pageText(/<title>\s*Loplov\s*[-–—]\s*([^<]+)<\/title>/i.exec(html)?.[1]);
  if (!rawTitle) throw new Error('Titre Loplov indisponible');
  const year = /\s+\(((?:19|20)\d{2})\)$/.exec(rawTitle);
  const cover = /<a\b[^>]*class="film-detail-poster"[^>]*>\s*<img\b[^>]*src="(https:\/\/image\.tmdb\.org\/t\/p\/[\w/.-]+)"/i.exec(html)?.[1];
  const description = pageText(/<div\b[^>]*id="film-synopsis-text"[^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1]);
  return {
    title: year ? rawTitle.slice(0, year.index) : rawTitle,
    type: 'film',
    year: year ? Number(year[1]) : undefined,
    cover_image: cover,
    description,
    source_url: source,
  };
}
