// api/add-anticipation-rating.js
// Migration ponctuelle : ajoute la colonne works.anticipation_rating (note d'impatience,
// avant visionnage/lecture), distincte de "rating" (note de satisfaction, après).
// - Ouvrir /api/add-anticipation-rating dans le navigateur, cliquer le bouton.
// - Idempotent (IF NOT EXISTS) : peut être relancé sans risque.
// Variable d'environnement Vercel : DATABASE_URL (déjà présente).

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(PANEL_HTML);
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ ok: false, error: 'DATABASE_URL manquante.' });
  const sql = neon(dbUrl);

  try {
    await sql`alter table works add column if not exists anticipation_rating numeric`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}

const PANEL_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lumina — Ajout colonne anticipation_rating</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0B2040;color:#EEF2F8;margin:0;padding:24px;line-height:1.5}
  .wrap{max-width:640px;margin:0 auto}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#94A3B8;font-size:13px;margin-bottom:20px}
  button{border:0;border-radius:12px;padding:12px 18px;font-weight:700;font-size:14px;cursor:pointer}
  .apply{background:#E56B3A;color:#fff}
  .card{background:#0E274C;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;margin-top:18px}
  .warn{background:#3a1e1e;border:1px solid #EF4444;color:#FCA5A5;padding:10px 12px;border-radius:10px;margin-top:14px;font-size:13px}
  code{background:rgba(255,255,255,.06);padding:1px 5px;border-radius:5px}
</style></head><body><div class="wrap">
<h1>Lumina — Ajout colonne anticipation_rating</h1>
<div class="sub">Exécute une seule fois : <code>ALTER TABLE works ADD COLUMN IF NOT EXISTS anticipation_rating numeric;</code><br>Sans risque pour les données existantes, ne touche à aucune ligne.</div>
<button class="apply" id="applyBtn" onclick="run()">Ajouter la colonne</button>
<div id="out"></div>
</div>
<script>
async function run(){
  if(!confirm('Confirmer l’ajout de la colonne anticipation_rating à la table works ?')) return;
  const out=document.getElementById('out');
  out.innerHTML='<div class="card">⏳ En cours…</div>';
  const r=await fetch('/api/add-anticipation-rating',{method:'POST'});
  const d=await r.json();
  if(!d.ok){ out.innerHTML='<div class="warn">Erreur : '+d.error+'</div>'; return; }
  out.innerHTML='<div class="card">✅ Colonne ajoutée (ou déjà présente). Tu peux fermer cette page.</div>';
  document.getElementById('applyBtn').disabled=true;
}
</script></body></html>`;
