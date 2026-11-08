const videoPath = /^\/(?:video|videoembed)\/(\d{1,20})\/?$/;

export function okruVideoId(url) {
  if (['ok.ru', 'www.ok.ru', 'm.ok.ru'].includes(url.hostname)) {
    return videoPath.exec(url.pathname)?.[1];
  }
}

function decodeEntities(value) {
  const names = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ' };
  return value?.replace(/&(#x[\da-f]+|#\d+|amp|apos|quot|lt|gt|nbsp);/gi, (entity, key) => {
    if (key[0] !== '#') return names[key.toLowerCase()] || entity;
    const hexadecimal = key[1].toLowerCase() === 'x';
    const code = parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  }).trim();
}

export async function okruVideo(id) {
  const source = `https://ok.ru/video/${id}`;
  const response = await fetch(source, {
    headers: { Accept: 'text/html' },
    redirect: 'error',
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error('Vidéo OK.ru indisponible');
  const head = (await response.text()).split(/<\/head\s*>/i, 1)[0];
  const metadata = new Map();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = /\bproperty\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const value = /\bcontent\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2];
    if (key && value && !metadata.has(key)) metadata.set(key, decodeEntities(value));
  }
  const rawTitle = metadata.get('og:title');
  if (!rawTitle || !metadata.get('og:type')?.startsWith('video.')) {
    throw new Error('Métadonnées vidéo OK.ru indisponibles');
  }
  const title = rawTitle.replace(/^(?:https?:\/\/)?[\w.-]+\.[a-z]{2,}\s*[-–—]\s*/i, '').trim() || rawTitle;
  const year = /\s+\(?(19\d{2}|20\d{2})\)?$/.exec(title);
  const description = metadata.get('og:description');
  const cover = metadata.get('og:image:secure_url') || metadata.get('og:image');
  const seconds = Number(metadata.get('og:video:duration'));
  return {
    title: year ? title.slice(0, year.index) : title,
    year: year ? Number(year[1]) : undefined,
    type: 'vidéo',
    platform: ['OKRU'],
    description: description && description !== rawTitle ? description : undefined,
    duration_minutes: seconds > 0 && Number.isFinite(seconds) ? Math.max(1, Math.round(seconds / 60)) : undefined,
    cover_image: /^https:\/\//i.test(cover || '') ? cover : undefined,
    source_url: source,
  };
}
