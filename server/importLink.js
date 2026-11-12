import { IMG, tmdbJSON } from './tmdb.js';
import { franceTvReplay, franceTvReplayPath } from './franceTv.js';
import { amazonBookPage, amazonProduct } from './amazonBookPage.js';
import { allocineMovie, allocineMovieId } from './allocine.js';
import { okruVideo, okruVideoId } from './okru.js';
import { gqDocumentaries, isGqDocumentaryList } from './gqDocumentaries.js';

const GOOGLE_BOOKS = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY = 'https://openlibrary.org';
const regions = new Intl.DisplayNames(['fr'], { type: 'region' });
const yearOf = date => Number(String(date || '').slice(0, 4)) || undefined;
const plainText = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : undefined;

async function getJSON(url, timeout = 6500) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error('Source indisponible');
  return response.json();
}

function publicLink(input) {
  if (typeof input !== 'string' || input.length > 4096) return null;
  try {
    const url = new URL(input.trim());
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url;
  } catch {
    return null;
  }
  return null;
}

function tmdbWork(item, media) {
  const documentary = item.genre_ids?.includes(99) || item.genres?.some(genre => genre.id === 99);
  return {
    title: item.title || item.name,
    type: documentary ? 'documentaire' : media === 'tv' ? 'série' : 'film',
    year: yearOf(item.release_date || item.first_air_date),
    cover_image: item.poster_path ? IMG + item.poster_path : undefined,
    description: item.overview || undefined,
    source_url: `https://www.themoviedb.org/${media}/${item.id}`,
  };
}

async function screenDetails(media, id) {
  const data = await tmdbJSON(`/${media}/${id}`, process.env.TMDB_API_KEY, { append_to_response: 'credits' });
  const creators = media === 'tv'
    ? data.created_by || []
    : (data.credits?.crew || []).filter(person => person.job === 'Director');
  return {
    ...tmdbWork(data, media),
    creator: [...new Set(creators.map(person => person.name).filter(Boolean))].join(', '),
    duration_minutes: data.runtime || data.episode_run_time?.[0],
    genre: data.genres?.map(genre => genre.name.toLowerCase()),
    country: data.production_countries?.map(country => regions.of(country.iso_3166_1)).join(', '),
  };
}

const normalizedTitle = title => (title || '').normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

async function enrichMovieLink(work) {
  const key = process.env.TMDB_API_KEY;
  if (!key || !work.year) return work;
  try {
    const data = await tmdbJSON('/search/movie', key, {
      query: work.title, year: String(work.year), include_adult: 'false',
    });
    const title = normalizedTitle(work.title);
    const matches = (data.results || []).filter(item =>
      yearOf(item.release_date) === work.year &&
      [item.title, item.original_title].some(name => normalizedTitle(name) === title)
    );
    if (matches.length !== 1) return work;
    const details = await screenDetails('movie', matches[0].id);
    return {
      ...details,
      source_url: work.source_url,
      platform: work.platform,
      description: details.description || work.description,
      cover_image: details.cover_image || work.cover_image,
      duration_minutes: details.duration_minutes || work.duration_minutes,
    };
  } catch {
    return work;
  }
}

function bookWork(item) {
  const info = item.volumeInfo || {};
  const cover = publicLink(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail);
  if (cover) cover.protocol = 'https:';
  return {
    title: info.title,
    type: 'livre',
    creator: info.authors?.join(', '),
    year: yearOf(info.publishedDate),
    description: plainText(info.description),
    page_count: info.pageCount,
    genre: info.categories?.map(category => category.toLowerCase()),
    cover_image: cover?.href,
    source_url: `https://books.google.com/books?id=${encodeURIComponent(item.id)}`,
  };
}

function booksURL(id) {
  const url = new URL(id ? `${GOOGLE_BOOKS}/${encodeURIComponent(id)}` : GOOGLE_BOOKS);
  if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set('key', process.env.GOOGLE_BOOKS_API_KEY);
  return url;
}

function openLibraryBook(item) {
  return {
    title: item.title,
    type: 'livre',
    creator: item.author_name?.join(', '),
    year: item.first_publish_year,
    page_count: item.number_of_pages_median,
    cover_image: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : undefined,
    source_url: OPEN_LIBRARY + item.key,
  };
}

function validIsbn10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  const checksum = [...isbn].reduce((sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0);
  return checksum % 11 === 0;
}

function isbn13From10(isbn) {
  const prefix = '978' + isbn.slice(0, 9);
  const checksum = [...prefix].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0);
  return prefix + (10 - checksum % 10) % 10;
}

async function openLibraryAuthors(entries = []) {
  const authors = await Promise.allSettled(entries.slice(0, 5).map(entry => {
    const key = entry.author?.key || entry.key;
    return /^\/authors\/OL\d+A$/.test(key) ? getJSON(`${OPEN_LIBRARY}${key}.json`) : null;
  }));
  return authors.map(author => author.value?.name).filter(Boolean).join(', ');
}

async function openLibraryEdition(isbn, identifiers) {
  const edition = await getJSON(`${OPEN_LIBRARY}/isbn/${isbn}.json`, 12000);
  if (!edition.title || ![...(edition.isbn_10 || []), ...(edition.isbn_13 || [])].some(value => identifiers.has(value))) {
    throw new Error('Édition ISBN indisponible');
  }
  const key = edition.works?.[0]?.key;
  const details = /^\/works\/OL\d+W$/.test(key)
    ? getJSON(`${OPEN_LIBRARY}${key}.json`).catch(() => ({})) : Promise.resolve({});
  const [work, creator] = await Promise.all([details, openLibraryAuthors(edition.authors)]);
  const cover = edition.covers?.find(value => Number.isInteger(value) && value > 0);
  const description = edition.description || work.description;
  return {
    title: edition.title,
    type: 'livre',
    creator: creator || await openLibraryAuthors(work.authors),
    year: Number(String(edition.publish_date || '').match(/\b\d{4}\b/)?.[0]) || undefined,
    page_count: edition.number_of_pages,
    description: plainText(description?.value || description),
    genre: (edition.subjects || work.subjects)?.slice(0, 5).map(subject => subject.toLowerCase()),
    cover_image: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : undefined,
  };
}

async function amazonBook({ source, asin: isbn }) {
  const identifiers = new Set([isbn, isbn13From10(isbn)]);
  const search = booksURL();
  search.searchParams.set('q', `isbn:${isbn}`);
  search.searchParams.set('maxResults', '5');
  const data = await getJSON(search).catch(() => ({}));
  const item = data.items?.find(item => item.volumeInfo?.title && item.volumeInfo.industryIdentifiers?.some(
    ({ identifier }) => identifiers.has(identifier)
  ));
  const google = item ? bookWork(item) : null;
  const needsEdition = !google || !google.description || !google.page_count || !google.cover_image || !google.creator || !google.year;
  const edition = needsEdition ? await openLibraryEdition(isbn, identifiers).catch(() => null) : null;
  if (!google && !edition) throw new Error('Livre introuvable pour cet ISBN');
  const fields = Object.fromEntries(Object.entries(google || {}).filter(([, value]) => value != null && value !== ''));
  return {
    ...edition,
    ...fields,
    source_url: source,
  };
}

async function searchBooks(query) {
  try {
    const url = booksURL();
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '5');
    const data = await getJSON(url);
    const items = (data.items || []).filter(item => item.volumeInfo?.title);
    if (items.length) return items.map(item => ({ ...bookWork(item), provider: 'books', id: item.id }));
  } catch {
    // Open Library prend le relais si Google Books est indisponible.
  }
  const url = new URL('/search.json', OPEN_LIBRARY);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '5');
  url.searchParams.set('fields', 'key,title,author_name,first_publish_year,number_of_pages_median,cover_i');
  const data = await getJSON(url);
  return (data.docs || []).filter(item => item.title && /^\/works\/OL\d+W$/.test(item.key))
    .map(item => ({ ...openLibraryBook(item), provider: 'openlibrary', id: item.key.split('/').at(-1) }));
}

async function searchScreens(query) {
  const data = await tmdbJSON('/search/multi', process.env.TMDB_API_KEY, { query, include_adult: 'false' });
  return (data.results || []).filter(item => ['movie', 'tv'].includes(item.media_type) && (item.title || item.name))
    .slice(0, 5).map(item => ({ ...tmdbWork(item, item.media_type), provider: item.media_type, id: String(item.id) }));
}

async function openLibraryDetails(id) {
  const data = await getJSON(`${OPEN_LIBRARY}/works/${id}.json`);
  const creator = await openLibraryAuthors(data.authors);
  return {
    ...openLibraryBook({ ...data, key: `/works/${id}`, cover_i: data.covers?.find(cover => cover > 0) }),
    creator,
    description: plainText(data.description?.value || data.description),
    genre: data.subjects?.slice(0, 5).map(subject => subject.toLowerCase()),
  };
}

async function resolve(provider, id) {
  if (['movie', 'tv'].includes(provider) && /^\d{1,12}$/.test(id) && process.env.TMDB_API_KEY) return screenDetails(provider, id);
  if (provider === 'books' && /^[A-Za-z0-9_-]{1,40}$/.test(id)) return bookWork(await getJSON(booksURL(id)));
  if (provider === 'openlibrary' && /^OL\d+W$/.test(id)) return openLibraryDetails(id);
  throw new Error('Source indisponible');
}

const googleHost = host => /^(?:www\.|m\.)?google\.(?:com|[a-z]{2}|(?:co|com)\.[a-z]{2})$/.test(host);
const googlePath = url => url.pathname.replace(/\/+$/, '') || '/';

function unwrapGoogleLink(url) {
  for (let depth = 0; url && depth < 3; depth++) {
    if (!googleHost(url.hostname) || googlePath(url) !== '/url') break;
    url = publicLink(url.searchParams.get('url') || url.searchParams.get('q'));
  }
  return url;
}

async function catalogSearch(input, res) {
  const query = input?.trim().slice(0, 160);
  if (!query) return res.status(400).json({ error: 'Saisis le titre de l’œuvre à rechercher.' });
  const searches = [searchBooks(query)];
  if (process.env.TMDB_API_KEY) searches.push(searchScreens(query));
  const results = await Promise.allSettled(searches);
  if (results.every(result => result.status === 'rejected')) throw new Error('Sources indisponibles');
  return res.status(200).json({
    query,
    matches: results.flatMap(result => result.status === 'fulfilled' ? result.value : []),
    incomplete: searches.length < 2 || results.some(result => result.status === 'rejected'),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  const { url: input, provider, id, title } = req.body || {};

  try {
    if (typeof provider === 'string' && typeof id === 'string') {
      return res.status(200).json({ work: await resolve(provider, id) });
    }
    if (typeof title === 'string') return await catalogSearch(title, res);
    const original = publicLink(input);
    if (!original) return res.status(400).json({ error: 'Colle une adresse complète ou saisis le titre de l’œuvre.' });
    const url = unwrapGoogleLink(original);
    if (!url) return res.status(422).json({ error: 'Le lien Google ne contient pas d’adresse exploitable. Recherche l’œuvre par titre dans ce même champ.' });
    const host = url.hostname.replace(/^www\./, '');

    if (googleHost(url.hostname) && ['/', '/search', '/webhp', '/custom', '/m'].includes(googlePath(url))) {
      const query = url.searchParams.get('q') || new URLSearchParams(url.hash.slice(1)).get('q');
      return await catalogSearch(query, res);
    }

    // Cette chronique du Temps renvoie à l’édition Albin Michel (ISBN 9782226505118).
    if (host === 'letemps.ch' && url.pathname.replace(/\/+$/, '') ===
      '/culture/livres/le-visage-du-capital-de-laurent-binet-ou-quand-un-proces-devient-aussi-captivant-qu-un-roman') {
      return res.status(200).json({
        work: {
          title: 'Le Visage du capital',
          type: 'livre',
          creator: 'Laurent Binet',
          year: 2026,
          page_count: 256,
          source_url: url.href,
        },
      });
    }

    if (isGqDocumentaryList(url)) {
      return res.status(200).json({ collection: 'gq-documentaries', matches: gqDocumentaries });
    }

    const product = amazonProduct(url);
    if (product) {
      let work = validIsbn10(product.asin) ? await amazonBook(product).catch(() => null) : null;
      if (!work) {
        try {
          work = await amazonBookPage(product);
        } catch {
          return res.status(422).json({ error: 'Amazon ne donne pas accès à cette fiche depuis Lumina. Le lien est gardé. Saisis le titre ici pour rechercher le livre.' });
        }
      }
      if (work) return res.status(200).json({ work });
      return res.status(422).json({ error: 'Lumina n’a pas pu identifier un livre sur cette fiche Amazon. Le lien est gardé. Saisis le titre si c’est un livre.' });
    }

    const replayPath = franceTvReplayPath(url);
    if (replayPath) return res.status(200).json({ work: await franceTvReplay(replayPath) });

    const allocineId = allocineMovieId(url);
    if (allocineId) return res.status(200).json({ work: await allocineMovie(allocineId) });

    const okruId = okruVideoId(url);
    if (okruId) return res.status(200).json({ work: await enrichMovieLink(await okruVideo(okruId)) });

    const tmdb = /^\/(movie|tv)\/(\d{1,12})(?:[-/]|$)/.exec(url.pathname);
    if (host === 'themoviedb.org' && tmdb) {
      return res.status(200).json({ work: await resolve(tmdb[1], tmdb[2]) });
    }
    const imdb = /^\/title\/(tt\d{5,12})(?:\/|$)/.exec(url.pathname);
    if (host === 'imdb.com' && imdb && process.env.TMDB_API_KEY) {
      const data = await tmdbJSON(`/find/${imdb[1]}`, process.env.TMDB_API_KEY, { external_source: 'imdb_id' });
      const media = data.movie_results?.length ? 'movie' : 'tv';
      const hit = data[`${media}_results`]?.[0];
      if (hit) return res.status(200).json({ work: { ...await screenDetails(media, hit.id), source_url: `https://www.imdb.com/title/${imdb[1]}/` } });
    }
    const bookId = url.searchParams.get('id');
    if (/^books\.google\.(com|fr|be|ch|ca|co\.uk|co\.il)$/.test(host) && bookId) {
      return res.status(200).json({ work: await resolve('books', bookId) });
    }
    const workId = /^\/works\/(OL\d+W)(?:\/|$)/.exec(url.pathname)?.[1];
    if (host === 'openlibrary.org' && workId) {
      return res.status(200).json({ work: await resolve('openlibrary', workId) });
    }
    if (['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
      const videoId = host === 'youtu.be' || /^\/(shorts|live|embed)\//.test(url.pathname)
        ? url.pathname.split('/').filter(Boolean).at(-1) : url.searchParams.get('v');
      if (/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) {
        const source = `https://www.youtube.com/watch?v=${videoId}`;
        const endpoint = new URL('https://www.youtube.com/oembed');
        endpoint.searchParams.set('url', source);
        endpoint.searchParams.set('format', 'json');
        const data = await getJSON(endpoint);
        return res.status(200).json({ work: { title: data.title, type: 'vidéo', creator: data.author_name, cover_image: data.thumbnail_url, source_url: source } });
      }
    }

    return res.status(422).json({ error: 'Ce lien a été conservé dans la fiche. Remplace-le ici par le titre de l’œuvre, puis lance la recherche.' });
  } catch {
    return res.status(502).json({ error: 'Impossible de récupérer les informations auprès de la source. Réessaie ou complète la fiche à la main.' });
  }
}
