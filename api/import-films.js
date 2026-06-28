// api/import-films.js
// Import d'une liste de titres (copier-coller depuis AlloCiné "envie de voir")
// vers la table works de Neon.
// - AUCUNE PERTE : tous les titres sont importés, doublons inclus.
//   (Le collage AlloCiné n'a ni année ni réalisateur : impossible de distinguer
//    deux films homonymes, donc on n'en supprime aucun.)
// - Deux étapes : "preview" (aperçu, n'écrit rien) et "import" (insère).
// - Piloté depuis le navigateur : ouvrir /api/import-films pour le panneau.
// - À LANCER UNE SEULE FOIS (relancer ré-insère tout en double).
//
// Variables d'environnement Vercel : DATABASE_URL (déjà présente).

import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';

const DROP_EXACT = new Set(['thumbnail', 'mes envies de voir', 'films', 'séries', 'series']);
function isAvailability(s) {
  return /^(en salle|en streaming|disponible en )/i.test(s) || /^en salle le /i.test(s);
}

// Transforme le bloc collé en liste de titres. On retire seulement le bruit ;
// on ne dédoublonne PAS (chaque occurrence est conservée).
function parseTitles(raw) {
  const lines = (raw || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const all = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    if (DROP_EXACT.has(low)) continue;     // entêtes / "thumbnail"
    if (/^\d{1,3}$/.test(line)) continue;  // badges de note (ex: 42, 60)
    if (isAvailability(line)) continue;    // "En salle", "Disponible en VOD"...
    all.push(line);
  }
  // Comptage des doublons internes, pour info uniquement.
  const counts = new Map();
  for (const t of all) { const k = t.toLowerCase(); counts.set(k, (counts.get(k) || 0) + 1); }
  let dupCount = 0;
  for (const n of counts.values()) if (n > 1) dupCount += n - 1;
  return { all, dupCount };
}

function genId() { return randomBytes(12).toString('hex'); }

async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(PANEL_HTML);
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ ok: false, error: 'DATABASE_URL manquante.' });

  let body;
  try { body = await readBody(req); }
  catch (e) { return res.status(400).json({ ok: false, error: 'Corps de requête illisible.' }); }

  const action = (body.action || 'preview').toString();
  const type = (body.type || 'film').toString().trim() || 'film';
  const status = (body.status || 'À voir').toString().trim() || 'À voir';
  const createdBy = (body.createdBy || 'davidcastel@hotmail.fr').toString().trim();
  const createdById = (body.createdById || '69ac16220af10fe6daf15ab3').toString().trim();

  const { all, dupCount } = parseTitles(body.text || '');
  if (!all.length) return res.status(200).json({ ok: true, action, parsed: 0, duplicates: 0, alreadyInDbCount: 0, toInsertCount: 0, sample: [] });

  const sql = neon(dbUrl);

  try {
    // Information seulement : combien de ces titres existent déjà ? (on n'en retire aucun)
    let alreadyInDbCount = null;
    try {
      const lowers = [...new Set(all.map((t) => t.toLowerCase()))];
      const existingRows = await sql.query(
        'SELECT count(*)::int AS n FROM works WHERE lower(title) = ANY($1::text[])',
        [lowers]
      );
      alreadyInDbCount = existingRows[0] ? existingRows[0].n : 0;
    } catch (e) { alreadyInDbCount = null; }

    if (action === 'preview') {
      return res.status(200).json({
        ok: true, action: 'preview',
        parsed: all.length,
        duplicates: dupCount,
        alreadyInDbCount,
        toInsertCount: all.length,
        sample: all.slice(0, 40),
      });
    }

    // action === 'import' : on insère TOUT, sans exception.
    const ids = all.map(() => genId());
    await sql.query(
      `INSERT INTO works (id, title, type, status, created_by, created_by_id, created_date, updated_date)
       SELECT x.id, x.t, $3, $4, $5, $6, now(), now()
       FROM unnest($1::text[], $2::text[]) AS x(id, t)`,
      [ids, all, type, status, createdBy, createdById]
    );

    return res.status(200).json({
      ok: true, action: 'import',
      inserted: all.length,
      duplicatesIncluded: dupCount,
      alreadyInDbCount,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}

// ---------------------------------------------------------------------------
const PANEL_HTML = [
'<!doctype html><html lang="fr"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>Lumina — Import de films</title>',
'<style>',
':root{color-scheme:dark}',
'body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0e1116;color:#e6e9ef}',
'.wrap{max-width:820px;margin:0 auto;padding:32px 20px 64px}',
'h1{font-size:20px;margin:0 0 4px}.sub{color:#9aa4b2;margin:0 0 20px;font-size:13px}',
'textarea{width:100%;min-height:200px;box-sizing:border-box;background:#161b22;color:#e6e9ef;border:1px solid #2a3340;border-radius:10px;padding:12px;font:13px/1.4 ui-monospace,monospace;resize:vertical}',
'.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:12px 0}',
'label{font-size:12px;color:#9aa4b2;display:flex;flex-direction:column;gap:4px}',
'input,select{background:#161b22;color:#e6e9ef;border:1px solid #2a3340;border-radius:8px;padding:7px 9px;font-size:13px}',
'.btns{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 16px}',
'button{cursor:pointer;border:0;border-radius:10px;padding:11px 16px;font-size:14px;font-weight:600}',
'button:disabled{opacity:.5;cursor:default}',
'.test{background:#1f2937;color:#e6e9ef}.go{background:#6d5efc;color:#fff}',
'.stat{font-size:13px;color:#cdd3db;margin:10px 0;white-space:pre-wrap}',
'.box{background:#11161d;border:1px solid #1b2230;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:12px;color:#9aa4b2}',
'.box b{color:#e6e9ef}',
'.warn{color:#ffce6b}',
'</style></head><body><div class="wrap">',
'<h1>Lumina — Import de films <span style="font-size:12px;color:#6d5efc">v2</span></h1>',
'<p class="sub">Colle le contenu copié de ta page AlloCiné « envie de voir ». Le bruit (thumbnail, notes, badges) est retiré, mais <b>tous les titres sont importés, doublons inclus</b> : aucune perte. <span class="warn">À lancer une seule fois.</span></p>',
'<textarea id="txt" placeholder="Colle ici le bloc copié depuis AlloCiné…"></textarea>',
'<div class="row">',
'<label>Type<select id="type"><option value="film">film</option><option value="série">série</option><option value="documentaire">documentaire</option></select></label>',
'<label>Statut<input id="status" value="À voir" size="10"></label>',
'<label>created_by<input id="cb" value="davidcastel@hotmail.fr" size="26"></label>',
'</div>',
'<div class="btns">',
'<button class="test" id="bPrev">Analyser (n\'écrit rien)</button>',
'<button class="go" id="bImp" disabled>Importer tout</button>',
'</div>',
'<div class="stat" id="stat">Prêt.</div>',
'<div id="out"></div>',
'<script>',
'var txt=document.getElementById("txt"),stat=document.getElementById("stat"),out=document.getElementById("out");',
'var bPrev=document.getElementById("bPrev"),bImp=document.getElementById("bImp");',
'function esc(s){return (s==null?"":String(s)).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}',
'function body(action){return {action:action,text:txt.value,type:document.getElementById("type").value,status:document.getElementById("status").value,createdBy:document.getElementById("cb").value};}',
'function post(action){return fetch("",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body(action))}).then(function(r){return r.json();});}',
'function dis(v){bPrev.disabled=v;bImp.disabled=v;}',
'bPrev.onclick=function(){dis(true);out.innerHTML="";stat.textContent="Analyse…";post("preview").then(function(j){if(!j.ok){stat.textContent="Erreur : "+j.error;dis(false);return;}var dbinfo=(j.alreadyInDbCount==null?"?":j.alreadyInDbCount);stat.textContent=j.toInsertCount+" titres seront importés (dont "+j.duplicates+" doublons internes). Info : "+dbinfo+" portent un titre déjà présent en base (importés quand même).";var h="";if(j.sample&&j.sample.length){h+="<div class=\\"box\\"><b>Aperçu ("+j.toInsertCount+" au total) :</b><br>"+j.sample.map(esc).join(" · ")+(j.toInsertCount>j.sample.length?" …":"")+"</div>";}out.innerHTML=h;bImp.disabled=(j.toInsertCount===0);bPrev.disabled=false;}).catch(function(e){stat.textContent="Erreur réseau : "+e;dis(false);});};',
'bImp.onclick=function(){if(!confirm("Importer TOUS les titres (doublons inclus) ? À ne faire qu\'une fois."))return;dis(true);stat.textContent="Import en cours…";post("import").then(function(j){if(!j.ok){stat.textContent="Erreur : "+j.error;dis(false);return;}stat.textContent="Importé : "+j.inserted+" films ajoutés (dont "+j.duplicatesIncluded+" doublons internes conservés).";out.innerHTML="";bPrev.disabled=false;bImp.disabled=true;}).catch(function(e){stat.textContent="Erreur réseau : "+e;dis(false);});};',
'</script>',
'</div></body></html>',
].join('\n');
