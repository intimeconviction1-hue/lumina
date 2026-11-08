const amazonHost = /^(?:www\.|m\.)?amazon\.(?:fr|com|ca|de|es|it|co\.uk|com\.be)$/;

export function amazonProduct(url) {
  if (!amazonHost.test(url.hostname)) return null;
  const asin = /\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:\/|$)/i.exec(url.pathname)?.[1]?.toUpperCase();
  if (!asin) return null;
  const host = url.hostname.replace(/^(?:www\.|m\.)/, '');
  return { asin, source: `https://www.${host}/dp/${asin}` };
}

function decode(value) {
  const named = { amp: '&', apos: "'", quot: '"', nbsp: ' ', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' };
  return String(value || '').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key) => {
    if (!key.startsWith('#')) return named[key.toLowerCase()] || entity;
    const hex = key[1].toLowerCase() === 'x';
    const code = parseInt(key.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

const plain = value => decode(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const isBookCategory = value => /\b(?:livres?|books?|ebooks?|kindle store|boutique kindle|bücher|libros|libri)\b/i.test(value);

function structuredBook(html) {
  for (const [, content] of html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(content);
      const nodes = Array.isArray(data) ? data : [data, ...(Array.isArray(data?.['@graph']) ? data['@graph'] : [])];
      const book = nodes.find(node => node?.name && (
        [node['@type']].flat().includes('Book')
        || ([node['@type']].flat().includes('Product') && isBookCategory(String(node.category || '')))
      ));
      if (book) return book;
    } catch {
      // Les autres données de la page peuvent rester utilisables.
    }
  }
  return null;
}

export function parseAmazonBookPage(html, source) {
  const data = structuredBook(html);
  const breadcrumb = html.match(/\bid=["']wayfinding-breadcrumbs_feature_div["'][\s\S]{0,5000}?<\/ul>/i)?.[0];
  if (!data && !isBookCategory(plain(breadcrumb))) return null;

  const title = plain(data?.name || html.match(/\bid=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]);
  if (!title) return null;
  const authors = [data?.author].flat().map(person => plain(typeof person === 'string' ? person : person?.name)).filter(Boolean);
  if (!authors.length) {
    const byline = html.match(/\bid=["']bylineInfo["'][\s\S]{0,5500}?(?=<\/div>)/i)?.[0] || '';
    for (const [, author] of byline.matchAll(/<a\b[^>]*href=["'][^"']*\/(?:e|author)\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      if (plain(author)) authors.push(plain(author));
    }
  }
  const image = [data?.image].flat()[0];
  const rawCover = typeof image === 'string' ? image : image?.url;
  const cover = decode(rawCover || html.match(/<img\b(?=[^>]*\bid=["']landingImage["'])[^>]*\b(?:data-old-hires|src)=["'](https:\/\/[^"']+)["']/i)?.[1]);
  const pages = Number(data?.numberOfPages || plain(html.match(/(?:Nombre de pages de l['’]édition imprimée|Longueur d['’]impression|Print length|Print Length)\s*<\/span>[\s\S]{0,240}?(\d+)\s+pages?/i)?.[1]));
  return {
    title,
    type: 'livre',
    creator: [...new Set(authors)].join(', ') || undefined,
    year: Number(String(data?.datePublished || '').match(/^\d{4}/)?.[0]) || undefined,
    description: plain(data?.description) || undefined,
    page_count: Number.isInteger(pages) && pages > 0 ? pages : undefined,
    cover_image: /^https:\/\//i.test(cover) ? cover : undefined,
    source_url: source,
  };
}

export async function amazonBookPage(product) {
  const response = await fetch(product.source, {
    headers: { Accept: 'text/html', 'Accept-Language': 'fr-FR,fr;q=0.9' },
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Fiche Amazon inaccessible.');
  return parseAmazonBookPage(await response.text(), product.source);
}
