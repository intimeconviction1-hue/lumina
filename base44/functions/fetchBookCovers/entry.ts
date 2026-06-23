import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_BOOKS_API_KEY = Deno.env.get("GOOGLE_BOOKS_API_KEY");

async function getCoverFromGoogleBooks(title, creator) {
  const clean = (s) => (s || '').trim().replace(/[^\w\s\u00C0-\u024F]/g, ' ').replace(/\s+/g, ' ').trim();
  const t = clean(title).substring(0, 60);
  const a = clean(creator).substring(0, 40);
  if (!t) return null;

  try {
    const query = encodeURIComponent(`intitle:${t}${a ? ` inauthor:${a}` : ''}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&key=${GOOGLE_BOOKS_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const imageLinks = data.items?.[0]?.volumeInfo?.imageLinks;
    if (imageLinks) {
      // Prefer larger image, upgrade to https
      const raw = imageLinks.thumbnail || imageLinks.smallThumbnail;
      return raw ? raw.replace('http://', 'https://') : null;
    }
  } catch (_e) {}
  return null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const batchSize = body.batchSize || 50;
  const skip = body.skip || 0;

  const allWorks = await base44.asServiceRole.entities.Works.filter({ type: 'livre' }, 'created_date', 1200);
  const withoutCover = allWorks.filter(w => !w.cover_image || w.cover_image === '');
  const batch = withoutCover.slice(skip, skip + batchSize);

  let updated = 0;
  let notFound = 0;

  for (const work of batch) {
    try {
      const coverUrl = await getCoverFromGoogleBooks(work.title, work.creator || work.creator_name || '');
      if (coverUrl) {
        await base44.asServiceRole.entities.Works.update(work.id, { cover_image: coverUrl });
        updated++;
      } else {
        notFound++;
      }
      // Petit délai pour éviter le rate limit Google Books (1000 req/100s)
      await new Promise(r => setTimeout(r, 120));
    } catch (_e) {
      notFound++;
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return Response.json({
    message: `Batch ${skip}→${skip + batch.length} — ✅ ${updated} couvertures, ❌ ${notFound} non trouvées`,
    updated,
    notFound,
    processed: batch.length,
    nextSkip: skip + batchSize,
    totalWithoutCover: withoutCover.length,
    done: skip + batchSize >= withoutCover.length
  });
});