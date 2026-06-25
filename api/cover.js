// Recherche de couverture côté serveur : Google Books (clé cachée) puis Open Library.
// Appelé par la page Enrichissement, un livre à la fois.
// Renvoie { image: url|null, limited?: bool, source?: string }.

export default async function handler(req, res) {
  try {
    const title = (req.query.title || '').toString().trim();
    const author = (req.query.author || '').toString().trim();
    if (!title) return res.status(400).json({ image: null, error: 'title requis' });

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
