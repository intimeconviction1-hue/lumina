import { put } from '@vercel/blob';

// Reçoit une image en data-URL base64 (JSON) et la stocke sur Vercel Blob.
// Renvoie { url } — l'URL publique à enregistrer dans cover_image.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { dataUrl, filename } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'dataUrl requis' });
    }
    const m = /^data:(.+?);base64,(.*)$/s.exec(dataUrl);
    if (!m) return res.status(400).json({ error: 'format image invalide' });

    const contentType = m[1];
    const buffer = Buffer.from(m[2], 'base64');
    const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace('+xml', '');
    const base =
      (filename || 'cover')
        .toString()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40) || 'cover';

    const blob = await put(`covers/${base}.${ext}`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
    });

    return res.status(200).json({ url: blob.url });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
