import { neon } from '@neondatabase/serverless';
const url=process.env.DATABASE_URL;
if(!url) throw new Error('DATABASE_URL absent: migration non effectuée');
const sql=neon(url);
const keep='cd40751707277ce04f969aa6';
const remove='fb2fdaeae7d348d5f23e78e9';
const before=await sql.query('SELECT id, title, type, status, rating, platform FROM works WHERE id = $1 OR id = $2',[keep,remove]);
if(before.length===1 && before[0].id===keep && before[0].platform?.includes('Ciné')){
  console.log('MERGE_ALREADY_COMPLETED',JSON.stringify(before));process.exit(0);
}
if(before.length!==2) throw new Error('Expected exactly two records; found '+before.length);
const main=before.find(w=>w.id===keep),dup=before.find(w=>w.id===remove);
if(!main || !dup || [main,dup].some(w=>w.type!=='film'||w.title?.trim().toLowerCase()!=='the last viking')) throw new Error('Unexpected work identities');
if(main.status!=='Visionné' || Number(main.rating)!==3.5) throw new Error('Main review unexpectedly changed');
const migrated=await sql.query(`DO $$
DECLARE a works%ROWTYPE; b works%ROWTYPE;
BEGIN
 SELECT * INTO a FROM works WHERE id = 'cd40751707277ce04f969aa6' FOR UPDATE;
 SELECT * INTO b FROM works WHERE id = 'fb2fdaeae7d348d5f23e78e9' FOR UPDATE;
 IF a.id IS NULL OR b.id IS NULL OR lower(trim(a.title)) <> 'the last viking' OR lower(trim(b.title)) <> 'the last viking' OR a.type <> 'film' OR b.type <> 'film' OR a.status <> 'Visionné' OR a.rating::numeric <> 3.5 THEN
  RAISE EXCEPTION 'Verification mismatch; no changes applied';
 END IF;
 UPDATE works SET platform = ARRAY(SELECT DISTINCT p FROM unnest(coalesce(a.platform, ARRAY[]::text[]) || coalesce(b.platform, ARRAY[]::text[])) p WHERE p IS NOT NULL AND trim(p) <> ''), updated_date = now() WHERE id=a.id;
 DELETE FROM works WHERE id=b.id;
END $$;`,[]);
const after=await sql.query('SELECT id,title,status,rating,platform FROM works WHERE id = $1 OR id = $2',[keep,remove]);
if(after.length!==1 || after[0].id!==keep || !after[0].platform?.includes('Ciné')) throw new Error('Post-merge verification FAILED: '+JSON.stringify(after));
console.log('MERGE_SUCCESS',JSON.stringify(after));
