#!/usr/bin/env node
// Runs every suite in this folder against ../index.html and ../netlify/functions.
// Usage (from the repo root):   npm test      or      node tests/run-all.js
// Each suite prints "N passed, M failed"; this totals them and exits non-zero on any failure.
const {spawnSync}=require('child_process'), fs=require('fs'), path=require('path');
const dir=__dirname;
// Syntax first: extract both inline script blocks and node --check them.
{ const os=require('os'); const html=fs.readFileSync(path.join(dir,'..','index.html'),'utf8');
  const blocks=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  let okSyntax=true;
  blocks.forEach((b,i)=>{ const f=path.join(os.tmpdir(),'terrain-block-'+i+'.js'); fs.writeFileSync(f,b);
    const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});
    if(r.status!==0){ okSyntax=false; console.log('  SYNTAX ERROR in script block '+i+'\n'+r.stderr); } });
  for(const f of fs.readdirSync(path.join(dir,'..','netlify','functions')).filter(f=>/\.m?js$/.test(f))){
    const r=spawnSync(process.execPath,['--check',path.join(dir,'..','netlify','functions',f)],{encoding:'utf8'});
    if(r.status!==0){ okSyntax=false; console.log('  SYNTAX ERROR in '+f+'\n'+r.stderr); } }
  console.log(okSyntax?`  ok    syntax: ${blocks.length} script blocks + functions`:'  FAIL  syntax');
  if(!okSyntax) process.exit(1); }
const allFiles=fs.readdirSync(dir).filter(f=>/\.test\.(js|mjs)$/.test(f)).sort();
// GitHub runs the suites in parallel shards: SHARD="k/n" runs only shard k of n. The split balances by each suite's
// measured time (tests/durations.json; a suite not listed counts as the median), longest first onto the lightest shard,
// so every suite runs in exactly one shard. Without SHARD (npm test on a computer) every suite runs, as before.
let files=allFiles;
if(process.env.SHARD){ const m=/^(\d+)\/(\d+)$/.exec(process.env.SHARD), k=m&&+m[1], n=m&&+m[2];
  if(!m||k<1||k>n){ console.log('  FAIL  SHARD must look like 2/6, got '+process.env.SHARD); process.exit(1); }
  let dur={}; try{ dur=JSON.parse(fs.readFileSync(path.join(dir,'durations.json'),'utf8')); }catch(e){ dur={}; }
  const known=Object.values(dur).filter(v=>v>0).sort((a,b)=>a-b), med=known.length?known[Math.floor(known.length/2)]:1000;
  const cost=f=>dur[f]>0?dur[f]:med, load=Array(n).fill(0), pick=Array.from({length:n},()=>[]);
  [...allFiles].sort((a,b)=>cost(b)-cost(a)||a.localeCompare(b)).forEach(f=>{ let j=0; for(let i=1;i<n;i++) if(load[i]<load[j]) j=i; load[j]+=cost(f); pick[j].push(f); });
  files=pick[k-1].sort(); console.log('  shard '+k+'/'+n+': '+files.length+' of '+allFiles.length+' suites (about '+Math.round(load[k-1]/1000)+' s measured)'); }
// v10.42.0 (DESIGN §9.4 step 2): the average church counts every v10.42 check (relevance, the arc, gifts first) — none may be PENDING.
// v10.43.0 (DESIGN §8): the follow-up plan and the connection cards on the average church (v43-average-church) — none PENDING either.
const env={...process.env,REQUIRE_V42:'1',REQUIRE_V43:'1'};
let P=0,F=0; const bad=[];
for(const f of files){
  const r=spawnSync(process.execPath,[path.join(dir,f)],{encoding:'utf8',timeout:+process.env.SUITE_TIMEOUT_MS||300000,env});
  const out=(r.stdout||'')+(r.stderr||'');
  const m=out.match(/(\d+) passed, (\d+) failed/);
  if(!m){ bad.push([f,'crashed or no total']); console.log('  CRASH  '+f); continue; }
  P+=+m[1]; F+=+m[2];
  console.log((+m[2]?'  FAIL  ':'  ok    ')+f.padEnd(34)+m[1]+' passed'+(+m[2]?', '+m[2]+' FAILED':''));
  if(+m[2]) bad.push([f,out.split('\n').filter(l=>/FAIL/.test(l)).join('\n')]);
}
console.log(`\n${files.length} suites · ${P} passed · ${F} failed`);
for(const [f,why] of bad) console.log(`\n--- ${f}\n${why}`);
process.exit(F||bad.length?1:0);
