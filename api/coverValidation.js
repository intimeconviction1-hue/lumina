// Keep JSON payloads comfortably below the Vercel Functions request limit.
export const MAX_COVER_BYTES = 2 * 1024 * 1024;

const SIGNATURES = {
  'image/jpeg': { ext: 'jpg', matches: b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', matches: b => b.length >= 8 && Buffer.from([137,80,78,71,13,10,26,10]).equals(b.subarray(0,8)) },
  'image/gif': { ext: 'gif', matches: b => b.length >= 6 && ['GIF87a','GIF89a'].includes(b.toString('ascii',0,6)) },
  'image/webp': { ext: 'webp', matches: b => b.length >= 12 && b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP' },
};

export function validateCoverDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return { error: 'Image manquante', status: 400 };
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return { error: 'Format non pris en charge : JPG, PNG, WEBP ou GIF uniquement', status: 415 };
  const [, contentType, encoded] = match;
  if (encoded.length > Math.ceil(MAX_COVER_BYTES / 3) * 4) {
    return { error: 'Image trop volumineuse (maximum 2 Mo)', status: 413 };
  }
  if (encoded.length % 4 !== 0) return { error: 'Données image invalides', status: 400 };
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length > MAX_COVER_BYTES) {
    return { error: 'Image vide ou trop volumineuse (maximum 2 Mo)', status: 413 };
  }
  // Buffer.from accepts invalid base64 silently, so verify canonical encoding.
  if (buffer.toString('base64') !== encoded) return { error: 'Données image invalides', status: 400 };
  if (!SIGNATURES[contentType].matches(buffer)) {
    return { error: 'Le contenu du fichier ne correspond pas au format annoncé', status: 415 };
  }
  return { buffer, contentType, extension: SIGNATURES[contentType].ext };
}
