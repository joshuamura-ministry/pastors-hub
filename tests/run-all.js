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
const files=fs.readdirSync(dir).filter(f=>/\.test\.(js|mjs)$/.test(f)).sort();
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
