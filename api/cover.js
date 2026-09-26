// Recherche de couverture côté serveur : Google Books (clé cachée) puis Open Library.
// Appelé par la page Enrichissement, un livre à la fois.
// Renvoie { image: url|null, limited?: bool, source?: string }.

export default async function handler(req, res) {
  try {
    if (req.query.mode === 'isbn') {
      const isbn = String(req.query.isbn || '').replace(/[^0-9Xx]/g, '');
      if (!/^97[89]\d{10}$/.test(isbn) && !/^\d{9}[0-9Xx]$/.test(isbn)) {
        return res.status(400).json({ error: 'ISBN invalide' });
      }
      const url = new URL('https://www.googleapis.com/books/v1/volumes');
      url.searchParams.set('q', `isbn:${isbn}`);
      url.searchParams.set('maxResults', '5');
      if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set('key', process.env.GOOGLE_BOOKS_API_KEY);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google Books ${response.status}`);
      const data = await response.json();
      const google = (data.items || []).map(item => {
        const info = item.volumeInfo || {};
        const image = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
        return { id: item.id, title: info.title, subtitle: info.subtitle,
          authors: info.authors || [], identifiers: info.industryIdentifiers || [],
          image: image?.replace(/^http:/, 'https:').replace(/&edge=curl/g, '') || null };
      }).filter(item => item.image);
      if (google.length) return res.status(200).json({ source: 'google-isbn', results: google });

      const ol = new URL('https://openlibrary.org/search.json');
      ol.searchParams.set('isbn', isbn);
      ol.searchParams.set('fields', 'key,title,author_name,first_publish_year,cover_i,isbn');
      ol.searchParams.set('limit', '5');
      const olResponse = await fetch(ol);
      if (!olResponse.ok) throw new Error(`Open Library ${olResponse.status}`);
      const olData = await olResponse.json();
      return res.status(200).json({ source: 'openlibrary-isbn', results: (olData.docs || [])
        .filter(item => item.cover_i && (item.isbn || []).includes(isbn))
        .map(item => ({ id: item.key, title: item.title, authors: item.author_name || [],
          image: `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`, isbn })) });
    }
    const title = (req.query.title || '').toString().trim();
    const author = (req.query.author || '').toString().trim();
    if (!title) return res.status(400).json({ image: null, error: 'title requis' });

    if (req.query.mode === 'candidates') {
      const source = req.query.source === 'openlibrary' ? 'openlibrary' : 'google';
      const broad = req.query.broad === '1';
      return res.status(200).json({ source, results: source === 'google'
        ? await googleCandidates(title, author, process.env.GOOGLE_BOOKS_API_KEY, broad)
        : await openLibraryCandidates(title, author) });
    }

    // 1) Google Books (clé serveur si présente → quota élevé)
    const g = await googleBooks(title, author, process.env.GOOGLE_BOOKS_API_KEY);
    if (g.image) return res.status(200).json({ image: g.image, source: 'google' });

    // 2) Open Library (titre+auteur, puis titre seul pour les livres de niche)
    const ol = await openLibrary(title, author);
    if (ol) return res.status(200).json({ image: ol, source: 'openlibrary' });

    // Rien trouvé : on remonte l'info de rate-limit si Google a bloqué
    return res.status(200).json({ image: null, limited: !!g.limited });
  } catch (e) {
    return res.status(200).json({ image: null, error: String(e?.message || e) });
  }
}

async function googleCandidates(title, author, key, broad = false) {
  const q = encodeURIComponent(broad ? `${title} ${author}`.trim() :
    `intitle:${title}${author ? ` inauthor:${author}` : ''}`);
  let url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=20&country=FR`;
  if (key) url += `&key=${encodeURIComponent(key)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Google Books ${r.status}`);
  const data = await r.json();
  return (data.items || []).map(item => {
    const info = item.volumeInfo || {};
    const image = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
    return { title: info.title, subtitle: info.subtitle, authors: info.authors || [],
      year: Number((info.publishedDate || '').slice(0, 4)) || null,
      image: image?.replace(/^http:/, 'https:').replace(/&edge=curl/g, '') || null,
      id: item.id };
  }).filter(item => item.image);
}

async function openLibraryCandidates(title, author) {
  const q = new URL('https://openlibrary.org/search.json');
  q.searchParams.set('title', title);
  if (author) q.searchParams.set('author', author);
  q.searchParams.set('limit', '20');
  q.searchParams.set('fields', 'key,title,author_name,first_publish_year,cover_i');
  const r = await fetch(q);
  if (!r.ok) throw new Error(`Open Library ${r.status}`);
  const data = await r.json();
  return (data.docs || []).filter(item => item.cover_i).map(item => ({
    id: item.key, title: item.title, authors: item.author_name || [],
    year: item.first_publish_year || null,
    image: `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`,
  }));
}

async function googleBooks(title, author, key) {
  const q = encodeURIComponent(`${title} ${author}`.trim());
  let url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&country=FR`;
  if (key) url += `&key=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url);
    if (r.status === 429) return { image: null, limited: true };
    if (!r.ok) return { image: null };
    const data = await r.json();
    const info = data?.items?.[0]?.volumeInfo?.imageLinks;
    const raw = info?.thumbnail || info?.smallThumbnail || null;
    if (!raw) return { image: null };
    return { image: raw.replace(/^http:/, 'https:').replace(/&edge=curl/g, '') };
  } catch {
    return { image: null };
  }
}

async function openLibrary(title, author) {
  const tryUrl = async (u) => {
    try {
      const r = await fetch(u);
      if (!r.ok) return null;
      const d = await r.json();
      const coverId = d?.docs?.[0]?.cover_i;
      return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
    } catch {
      return null;
    }
  };
  let img = await tryUrl(
    `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`
  );
  if (img) return img;
  return tryUrl(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`);
}
