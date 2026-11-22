import { put } from '@vercel/blob';
import { validateCoverDataUrl } from '../server/coverValidation.js';

// Reçoit une image validée en data-URL base64 et la stocke sur Vercel Blob.
// Renvoie { url } — l'URL publique à enregistrer dans cover_image.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { dataUrl, filename } = req.body || {};
    const validated = validateCoverDataUrl(dataUrl);
    if (validated.error) return res.status(validated.status).json({ error: validated.error });
    const { contentType, extension, buffer } = validated;
    const base = String(filename || 'cover')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40) || 'cover';

    const blob = await put(`covers/${base}.${extension}`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
    });
    return res.status(200).json({ url: blob.url });
  } catch (_e) {
    // Avoid returning sensitive upstream details to the browser.
    return res.status(500).json({ error: "Impossible d'enregistrer la couverture" });
  }
}
