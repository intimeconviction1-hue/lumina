const origin = 'https://www.france.tv';

export function franceTvReplayPath(url) {
  if (!['www.france.tv', 'france.tv'].includes(url.hostname)) return null;
  return /^\/(?:[a-z0-9-]+\/)*\d{1,12}-[a-z0-9-]+\.html$/i.test(url.pathname) ? url.pathname : null;
}

function metadata(html) {
  const nodes = [];
  for (const [, content] of html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(content);
      nodes.push(...(Array.isArray(data) ? data : [data, ...(Array.isArray(data?.['@graph']) ? data['@graph'] : [])]));
    } catch {
      // Une balise JSON-LD invalide ne doit pas masquer les suivantes.
    }
  }
  return nodes;
}

function minutesOf(duration) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(duration);
  if (!match) return undefined;
  const seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  return seconds > 0 ? Math.max(1, Math.floor(seconds / 60)) : undefined;
}

function credits(people) {
  return [...new Set([people].flat().map(person => typeof person === 'string' ? person : person?.name).filter(Boolean))].join(', ');
}

export async function franceTvReplay(path) {
  const source = origin + path;
  const response = await fetch(source, {
    headers: { Accept: 'text/html', 'Accept-Language': 'fr-FR' },
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Replay France TV indisponible.');
  const nodes = metadata(await response.text());
  const hasType = (node, type) => [node?.['@type']].flat().includes(type);
  const videos = nodes.filter(node => ['VideoObject', 'TVEpisode', 'Movie'].some(type => hasType(node, type)) && node.name);
  const video = videos.find(node => node.url === source || node.embedUrl === source)
    || (videos.length === 1 && !videos[0].url ? videos[0] : null);
  if (!video) throw new Error('Métadonnées du replay France TV indisponibles.');

  const category = nodes.find(node => hasType(node, 'BreadcrumbList'))?.itemListElement?.at(-1)?.name;
  const genre = [video.genre, category].flat().filter(value => typeof value === 'string' && value.trim());
  const type = genre.some(value => /documentaire/i.test(value)) || /^\/documentaires(?:-|\/)/i.test(path) ? 'documentaire'
    : hasType(video, 'Movie') ? 'film' : hasType(video, 'TVEpisode') ? 'série' : 'vidéo';
  const actors = credits(video.actor);
  const description = [video.description?.trim(), actors && `Avec ${actors}.`].filter(Boolean).join('\n\n');
  const thumbnails = [video.thumbnailUrl, video.image].flat().map(image => typeof image === 'string' ? image : image?.url);
  const cover = thumbnails.find(image => typeof image === 'string' && /^https:\/\/[^/]+\//i.test(image));
  return {
    title: video.name,
    type,
    creator: credits(video.director || video.creator || video.author) || undefined,
    year: Number(String(video.dateCreated || '').match(/^\d{4}/)?.[0]) || undefined,
    duration_minutes: minutesOf(video.duration),
    genre: [...new Set(genre.map(value => value.trim().toLowerCase()))],
    description: description || undefined,
    cover_image: cover,
    platform: ['FranceTV'],
    source_url: source,
  };
}
