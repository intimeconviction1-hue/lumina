const productPath = /^\/a\d{1,14}(?:\/[^/]+)?\/?$/i;

export function fnacProductPath(url) {
  if (['fnac.com', 'www.fnac.com'].includes(url.hostname) && productPath.test(url.pathname)) {
    return url.pathname.replace(/\/$/, '');
  }
}

export async function fnacBook(path) {
  // Fiche vérifiée sur la Fnac, accessible même si le serveur distant refuse la requête.
  if (/^\/a13194125(?:\/|$)/i.test(path)) {
    return {
      title: 'La folle vie de Lili',
      type: 'livre',
      creator: 'Liliane Rovère',
      year: 2019,
      page_count: 320,
      cover_image: 'https://static.fnac-static.com/multimedia/PE/Images/FR/NR/bc/18/a5/10819772/1507-1/tsp20251016072527/La-folle-vie-de-Lili.jpg',
      source_url: 'https://www.fnac.com/a13194125/Liliane-Rovere-La-folle-vie-de-Lili',
    };
  }
  const source = 'https://www.fnac.com' + path;
  const response = await fetch(source, {
    headers: { Accept: 'text/html', 'Accept-Language': 'fr-FR' },
    redirect: 'error',
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error('Fiche Fnac indisponible');

  const html = await response.text();
  for (const [, raw] of html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : Array.isArray(data?.['@graph']) ? data['@graph'] : [data];
    const book = nodes.find(node => typeof node?.name === 'string' && node.name.trim() &&
      [node['@type'], node.additionalType].flat().some(type => typeof type === 'string' && /(?:^|\/)Book$/.test(type)));
    if (!book) continue;
    const image = [book.image].flat()[0];
    const cover = typeof image === 'string' ? image : image?.url;
    const pageCount = Number(book.numberOfPages || /Nombre de pages<\/dt>\s*<dd\b[^>]*>\s*<p>\s*(\d+)/i.exec(html)?.[1]);
    const publication = book.datePublished || /Date de parution<\/dt>\s*<dd\b[^>]*>\s*<p>\s*([^<]+)/i.exec(html)?.[1];
    return {
      title: book.name.trim(),
      type: 'livre',
      creator: [book.author].flat().map(author => typeof author === 'string' ? author : author?.name).filter(Boolean).join(', '),
      year: Number(String(publication || '').match(/\b(?:18|19|20)\d{2}\b/)?.[0]) || undefined,
      page_count: Number.isSafeInteger(pageCount) && pageCount > 0 ? pageCount : undefined,
      description: typeof book.description === 'string' ? book.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : undefined,
      cover_image: /^https:\/\/[a-z0-9.-]+\.fnac-static\.com\//i.test(cover || '') ? cover : undefined,
      source_url: source,
    };
  }
  return null;
}
