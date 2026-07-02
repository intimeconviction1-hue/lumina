// api/import-book-tags.js
// Importe les étiquettes Babelio (livres) dans Lumina.
// - Colle la liste "Mes livres" de Babelio (colonne Étiquettes visible) dans la zone.
// - "preview" : parse + apparie par titre(+auteur), N'ÉCRIT RIEN.
// - "update"  : met à jour les livres retrouvés (tags + priorité + statut).
// - "create"  : crée les livres présents chez Babelio mais absents de Lumina.
// Variable d'env Vercel : DATABASE_URL.

import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';

/* ---------- Vocabulaire des étagères (pour découper la colonne Étiquettes) ---------- */
const VOCAB = ["droits à acheter","cadeaux sandlov","cadeaux tolé","les princes fauchés",
"histoire réflexion","israël à traduire","polars par non polardiens","procès fr true",
"polar usa true","rentrée sept 2023","intime conviction","urgences juives","polar am sud",
"série compa","olivier kaki","polar france","polar israel","polar europe","polar monde",
"polar history","polar asie","polar urgent","procès europe","procès asie","procès usa",
"litt. europe","david castel","david france","chroniques j","true crime","mes scenars",
"ma collection","polar ok","polar fr","polar us","polar usa","procès fr","litt fr",
"litt. fr","litt. us","litt. usa","livretok","scénarisme","bibliotik","biopics","capitalisme",
"occupation","politique","remakable","voyages","hébreu","israël","juifs","justice","écrire",
"lenny","gad","sasha","sandra","annema","laetitia","cadeaux","biopic","cinema","decoin",
"escoire","georgie","procès","prison","ravel","rares","droit","échecs","écrans","bédé",
"avocats","histoire","librairie","politique","reflexion","truffaut","viet nam","polartik",
"kobo","2023","docu fr","en cours","lire","ok","urgent"];
const VOCAB_SORTED = [...new Set(VOCAB)].sort((a, b) => b.length - a.length);

/* ---------- Règles de nettoyage (table validée) ---------- */
const RENAME = {
  'avocats':'avocats','biopic':'biopics','cinema':'cinéma','docu fr':'documentaire','georgie':'géorgie',
  'kobo':'ma collection','litt fr':'litt. fr','litt. usa':'litt. us','ok':'samson kaki','olivier kaki':'samson kaki',
  'polar am sud':'polar am. sud','polar fr':'polar france','polar israel':'polar israël','polar us':'polar usa',
  'princes fauchés':'les princes fauchés','procès':'procès fr','reflexion':'réflexion','truffaut':'truffaut',
  'viet nam':'vietnam','chroniques j':'intime conviction','mes scenars':'samson kaki','2023':'tikbook',
  'rentrée sept 2023':'tikbook','série compa':'adaptation série tv',
  'cadeaux':'offrir','cadeaux sandlov':'offrir: sandlov','cadeaux tolé':'offrir: tolé','gad':'offrir: gad',
  'lenny':'offrir: lenny','sasha':'offrir: sasha','sandra':'offrir: sandra','david castel':'offrir: david castel',
  'annema':'offrir: annema','laetitia':'offrir: laetitia',
};
const SPLIT = {
  'israël à traduire':['israël à traduire','israël'],'polartik':['art du polar','tikbook'],
  'polar usa true':['polar usa','histoire vraie'],'procès fr true':['procès fr','histoire vraie'],
};
const TO_FIELD = {
  'urgent':{field:'priority',value:'urgent'},'polar urgent':{field:'priority',value:'urgent',extraTags:['art du polar']},
  'en cours':{field:'status',value:'En cours'},'lire':{field:'status',value:'Envie de lire'},
};
const UMBRELLA = [
  { tag:'art du polar', test:t=>t.startsWith('polar') },
  { tag:'samson kaki',  test:t=>t.startsWith('procès')||t==='true crime'||t==='histoire vraie'||t==='justice'||t==='droit'||t==='avocats'||t==='polar ok'||t==='samson kaki' },
  { tag:'tikbook',      test:t=>t.startsWith('litt.')||t==='tikbook'||t==='livretok'||t==='bibliotik' },
];

function extractTags(str) {
  let s = ' ' + String(str || '').toLowerCase().replace(/\s+/g, ' ').trim() + ' ';
  const found = [];
  for (const tag of VOCAB_SORTED) {
    const p = ' ' + tag.toLowerCase() + ' ';
    if (s.includes(p)) { found.push(tag.toLowerCase()); s = s.replace(p, ' '); }
  }
  return found;
}
function cleanTags(rawTags) {
  const out = new Set(); const patch = {};
  for (const key of rawTags) {
    if (TO_FIELD[key]) { const { field, value, extraTags } = TO_FIELD[key]; patch[field] = value; (extraTags||[]).forEach(t=>out.add(t)); continue; }
    if (SPLIT[key]) { SPLIT[key].forEach(t=>out.add(t.toLowerCase())); continue; }
    out.add((RENAME[key]||key).toLowerCase());
  }
  let changed = true;
  while (changed) { changed = false;
    for (const u of UMBRELLA) { if (out.has(u.tag)) continue; for (const t of out) { if (u.test(t)) { out.add(u.tag); changed = true; break; } } }
  }
  return { tags: [...out].sort((a,b)=>a.localeCompare(b,'fr')), patch };
}

/* ---------- Parsing du collage Babelio ---------- */
const NOISE = new Set(['+','modifier','voir la critique','ajouter des informations','pense-bête','fin lecture :','fin lecture:']);
function isNoise(l){ const x=l.trim().toLowerCase(); return NOISE.has(x)||/^\d+$/.test(x)||/^\d{2}\/\d{2}\/\d{4}$/.test(x)||x.includes('titreparu en')||x==='etiquettes'||/^\d{4,8}$/.test(x); }
const STAT = { 'lu':'Visionné', 'à lire':'Envie de lire', 'a lire':'Envie de lire', 'en cours':'En cours' };

export function parseBabelio(text) {
  const lines = String(text||'').split(/\r?\n/);
  const books = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('ajouter des informations')) continue;
    // Auteur + étiquettes : tab-split si possible, sinon découpe par vocabulaire
    const rest = lines[i].replace(/^ajouter des informations\s*/, '');
    const parts = rest.split('\t').map(s=>s.trim()).filter((s,idx)=> s!=='' || idx>0);
    let author = '', etiqStr = '';
    if (rest.includes('\t')) {
      const tp = rest.split('\t');
      author = (tp[0]||'').trim(); etiqStr = tp.slice(1).join(' ').trim();
    } else {
      // fallback : la 1ère étiquette du vocabulaire marque la fin de l'auteur
      const low = ' '+rest.toLowerCase()+' '; let cut = rest.length;
      for (const tag of VOCAB_SORTED){ const idx = low.indexOf(' '+tag.toLowerCase()+' '); if (idx>=0 && idx<cut) cut = idx; }
      author = rest.slice(0,cut).trim(); etiqStr = rest.slice(cut).trim();
    }
    // Titre : ligne au-dessus (en sautant une éventuelle année 4 chiffres)
    let j = i-1; while (j>=0 && lines[j].trim()==='') j--;
    let year = null;
    if (j>=0 && /^\d{4}$/.test(lines[j].trim())) { year = lines[j].trim(); j--; }
    while (j>=0 && (lines[j].trim()==='' || isNoise(lines[j]))) j--;
    const title = j>=0 ? lines[j].trim() : '';
    // Statut : quelques lignes après "ajouter"
    let status = null;
    for (let k=i+1;k<Math.min(i+5,lines.length);k++){ const s=lines[k].trim().toLowerCase(); if (STAT[s]){ status=STAT[s]; break; } }
    if (!title) continue;
    const raw = extractTags(etiqStr);
    const { tags, patch } = cleanTags(raw);
    // priorité peut venir de "urgent"; statut Babelio prime sinon patch (en cours/lire)
    const finalStatus = status || patch.status || null;
    books.push({ title, author, year, rawEtiq: etiqStr, tags, priority: patch.priority || null, status: finalStatus });
  }
  return books;
}

/* ---------- Normalisation pour l'appariement ---------- */
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function lastName(a){ const p = norm(a).split(' ').filter(Boolean); return p.length?p[p.length-1]:''; }

function toPgArray(arr){ return '{'+(arr||[]).map(x=>'"'+String(x).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"').join(',')+'}'; }
async function readBody(req){ if(req.body) return typeof req.body==='string'?JSON.parse(req.body):req.body; let d='';for await(const c of req)d+=c;return d?JSON.parse(d):{}; }
function genId(){ return randomBytes(12).toString('hex'); }

export default async function handler(req, res) {
  if (req.method === 'GET') { res.setHeader('Content-Type','text/html; charset=utf-8'); res.setHeader('Cache-Control','no-store'); return res.status(200).send(PANEL_HTML); }
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Méthode non autorisée' });
  const dbUrl = process.env.DATABASE_URL; if (!dbUrl) return res.status(500).json({ ok:false, error:'DATABASE_URL manquante.' });
  const sql = neon(dbUrl);
  let body; try { body = await readBody(req); } catch { return res.status(400).json({ ok:false, error:'Corps invalide.' }); }
  const action = ['update','create'].includes(body.action) ? body.action : 'preview';
  const books = parseBabelio(body.text || '');
  if (!books.length) return res.status(200).json({ ok:true, mode:action, parsed:0, note:"Aucun livre détecté dans le collage." });

  try {
    const rows = await sql`select id, title, creator, creator_name, type, tags, status, priority from works`;
    const byTitle = new Map();
    for (const w of rows) { const k = norm(w.title); if (!byTitle.has(k)) byTitle.set(k, []); byTitle.get(k).push(w); }

    const matched = [], unmatched = [];
    for (const b of books) {
      const cand = byTitle.get(norm(b.title)) || [];
      let work = null;
      if (cand.length === 1) work = cand[0];
      else if (cand.length > 1) { const ln = lastName(b.author); work = cand.find(w => lastName(w.creator||w.creator_name).includes(ln) || ln && lastName(w.creator||w.creator_name)===ln) || cand[0]; }
      if (work) matched.push({ b, work }); else unmatched.push(b);
    }

    if (action === 'preview') {
      return res.status(200).json({
        ok:true, mode:'preview', parsed:books.length, totalWorks:rows.length,
        matchedCount:matched.length, unmatchedCount:unmatched.length,
        sampleMatched: matched.slice(0,40).map(({b,work})=>({title:b.title, tags:b.tags, status:b.status, priority:b.priority, workTitle:work.title})),
        sampleUnmatched: unmatched.slice(0,40).map(b=>({title:b.title, author:b.author, tags:b.tags})),
      });
    }

    if (action === 'update') {
      let n=0;
      for (let i=0;i<matched.length;i+=40){ const batch=matched.slice(i,i+40);
        await Promise.all(batch.map(({b,work})=>{
          const merged = [...new Set([...(Array.isArray(work.tags)?work.tags:[]), ...b.tags])];
          const pr = b.priority || null; const st = b.status || null;
          return sql`update works set tags=${toPgArray(merged)}::text[], priority=coalesce(${pr},priority), status=coalesce(${st},status), updated_date=now() where id=${work.id}`;
        }));
        n+=batch.length;
      }
      return res.status(200).json({ ok:true, mode:'update', updated:n });
    }

    // create — insère les livres absents
    let n=0; const now=new Date().toISOString();
    for (let i=0;i<unmatched.length;i+=40){ const batch=unmatched.slice(i,i+40);
      await Promise.all(batch.map(b=>{
        const id=genId(); const y=b.year?Number(b.year):null;
        return sql`insert into works (id,title,type,creator,creator_name,status,priority,tags,year,created_by,created_by_id,created_date,updated_date)
          values (${id},${b.title},'livre',${b.author||null},${b.author||null},${b.status||'Envie de lire'},${b.priority||'normal'},${toPgArray(b.tags)}::text[],${y},'davidcastel@hotmail.fr','69ac16220af10fe6daf15ab3',${now},${now})`;
      }));
      n+=batch.length;
    }
    return res.status(200).json({ ok:true, mode:'create', created:n });
  } catch (err) { return res.status(500).json({ ok:false, error:String(err&&err.message||err) }); }
}

const PANEL_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lumina — Import tags livres (Babelio)</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0B2040;color:#EEF2F8;margin:0;padding:24px;line-height:1.5}
 .wrap{max-width:960px;margin:0 auto} h1{font-size:20px;margin:0 0 4px} .sub{color:#94A3B8;font-size:13px;margin-bottom:16px}
 textarea{width:100%;height:180px;background:#0E274C;color:#EEF2F8;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;font-size:12px}
 button{border:0;border-radius:12px;padding:11px 16px;font-weight:700;font-size:13.5px;cursor:pointer;margin:10px 8px 0 0}
 .prev{background:#2AA6A0;color:#fff} .upd{background:#E56B3A;color:#fff} .crea{background:#6366F1;color:#fff} button:disabled{opacity:.4;cursor:not-allowed}
 .card{background:#0E274C;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;margin-top:16px}
 table{width:100%;border-collapse:collapse;font-size:12px} td,th{padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;vertical-align:top}
 .new{color:#8FD8C4} .muted{color:#94A3B8} .badge{display:inline-block;background:#163a6b;border-radius:20px;padding:1px 7px;margin:1px;font-size:11px}
 .warn{background:#3a1e1e;border:1px solid #EF4444;color:#FCA5A5;padding:10px 12px;border-radius:10px;margin-top:12px;font-size:13px}
</style></head><body><div class="wrap">
<h1>Import des tags livres (Babelio)</h1>
<div class="sub">Colle ta liste « Mes livres » (colonne Étiquettes visible). ① Aperçu d'abord — rien n'est écrit. Puis mise à jour et/ou création.</div>
<textarea id="txt" placeholder="Colle ici le contenu de ta page Babelio…"></textarea>
<div>
 <button class="prev" onclick="run('preview')">① Aperçu</button>
 <button class="upd" id="updBtn" disabled onclick="run('update')">② Mettre à jour les livres retrouvés</button>
 <button class="crea" id="creaBtn" disabled onclick="run('create')">③ Créer les livres absents</button>
</div>
<div id="out"></div></div>
<script>
async function run(action){
 const out=document.getElementById('out'); const text=document.getElementById('txt').value;
 if(!text.trim()){out.innerHTML='<div class="warn">Colle d’abord ta liste Babelio.</div>';return;}
 if((action==='update'||action==='create') && !confirm('Confirmer l’écriture en base ?')){return;}
 out.innerHTML='<div class="card">⏳ …</div>';
 const r=await fetch('/api/import-book-tags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,text})});
 const d=await r.json();
 if(!d.ok){out.innerHTML='<div class="warn">Erreur : '+d.error+'</div>';return;}
 if(d.mode==='preview'){
  document.getElementById('updBtn').disabled=false; document.getElementById('creaBtn').disabled=false;
  let h='<div class="card"><b>'+d.parsed+'</b> livres lus dans le collage. Retrouvés dans Lumina : <b>'+d.matchedCount+'</b> — absents : <b>'+d.unmatchedCount+'</b> (sur '+d.totalWorks+' œuvres).</div>';
  h+='<div class="card"><b>Retrouvés → seront mis à jour</b> (échantillon)<table><tr><th>Livre</th><th>Tags → Lumina</th><th>Statut/Prio</th></tr>';
  for(const m of d.sampleMatched){h+='<tr><td>'+esc(m.title)+'</td><td class="new">'+m.tags.join(', ')+'</td><td>'+(m.status||'')+(m.priority?' · '+m.priority:'')+'</td></tr>';}
  h+='</table></div>';
  h+='<div class="card"><b>Absents de Lumina → à créer si tu cliques ③</b> (échantillon)<table><tr><th>Livre</th><th>Auteur</th><th>Tags</th></tr>';
  for(const u of d.sampleUnmatched){h+='<tr><td>'+esc(u.title)+'</td><td class="muted">'+esc(u.author||'')+'</td><td class="new">'+u.tags.join(', ')+'</td></tr>';}
  h+='</table></div>'; out.innerHTML=h;
 } else if(d.mode==='update'){ out.innerHTML='<div class="card">✅ '+d.updated+' livres mis à jour.</div>'; }
 else { out.innerHTML='<div class="card">✅ '+d.created+' livres créés.</div>'; }
}
function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
</script></body></html>`;
