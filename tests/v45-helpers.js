// v10.45.0 — shared by the v45 suites (not a suite itself): a page on index.html in jsdom with the library served from ideas/,
// a curated map of the suite's choosing (or a 404), the fixture's survey drawn, and a check helper.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
const IDX=(()=>{ try{ return JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8')); }catch(e){ return null; } })();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
function checker(){
  const T={pass:0,fail:0};
  T.c=(n,g,e=true)=>{ const ok=JSON.stringify(g)===JSON.stringify(e); console.log((ok?'  PASS  ':'  FAIL  ')+n);
    if(!ok){ console.log('    got:',JSON.stringify(g).slice(0,800)); console.log('    want:',JSON.stringify(e).slice(0,500)); T.fail++; } else T.pass++; };
  T.sec=async f=>{ try{ await f(); }catch(e){ console.log('  FAIL  crashed: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); T.fail++; } };
  T.done=()=>{ console.log(`\n${T.pass} passed, ${T.fail} failed`); process.exit(T.fail?1:0); };
  return T;
}
/* o: {lang, tier, needs: a map object | 'file' (ideas/needs.json) | null (404), idx404, theme404:[themes], html, store:{k:v} (localStorage),
   session:{k:v} (sessionStorage)} */
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(o.html||HTML,{runScripts:'dangerously',url:'https://pastorshub.org/'+(o.tier?'?tier='+o.tier:''),pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.__scrolled=[];
      w.Element.prototype.scrollIntoView=function(a){ w.__scrolled.push({id:this.id||'',need:(this.dataset&&this.dataset.need)||'',lib:(this.dataset&&this.dataset.libId)||'',how:a&&typeof a==='object'?a.behavior||'':''}); };
      if(w.HTMLDialogElement){ w.HTMLDialogElement.prototype.showModal=function(){ this.setAttribute('open',''); };
        w.HTMLDialogElement.prototype.close=function(){ this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); }; }
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      for(const [k,v] of Object.entries(o.store||{})) w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
      for(const [k,v] of Object.entries(o.session||{})) w.sessionStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
      w.__fetched=[];
      w.fetch=async(u)=>{ u=String(u); w.__fetched.push(u);
        if(/^\/ideas\/needs\.json/.test(u)){ const m=o.needs==='file'?(fs.existsSync(path.join(ROOT,'ideas','needs.json'))?JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','needs.json'),'utf8')):null):o.needs;
          return m?{ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(m))}:{ok:false,status:404,json:async()=>null}; }
        if(/^\/ideas\/index\.json/.test(u)&&o.idx404) return {ok:false,status:404,json:async()=>null};
        const m=/^\/ideas\/([a-z-]+)\.json/.exec(u);
        if(m){ if((o.theme404||[]).includes(m[1])) return {ok:false,status:404,json:async()=>null};
          const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/^fonts\/[A-Za-z-]+\.ttf$/.test(u)&&fs.existsSync(path.join(ROOT,u))){ const b=fs.readFileSync(path.join(ROOT,u)); return {ok:true,status:200,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
const ready=async P=>{ await until(()=>P.E('typeof uChurch==="function"&&typeof openTool==="function"')); await sleep(200); };
/* the survey on the fixture's tract (or a changed copy: mod is a function body run on a copy of DATA, `D`) */
function survey(P,o){
  o=o||{};
  P.E(`(()=>{ const D=${JSON.stringify(FX.DATA)}; ${o.mod||''}; DATA=D; SCOPE=${JSON.stringify(o.scope||'tract')}; CAP=null; const ch=uChurch(); ch.name=${JSON.stringify(o.church||'Bucks County SDA')};
    ch.capacity={}; ch.selected=[]; ch.lib={}; uPersist(); openTool('survey'); render(); })()`);
}
async function openNeed(P,need,ideas){
  await until(()=>P.q(`#u-needs [data-need="${need}"] .ns-head`));
  const h=P.q(`#u-needs [data-need="${need}"] .ns-head`); if(h.getAttribute('aria-expanded')!=='true') h.click();
  if(ideas){ const s=P.q(`[data-ns-show="${need}"]`); if(s&&s.getAttribute('aria-expanded')!=='true') s.click();
    await until(()=>P.q(`#ns-i-${need} .ns-row`)||P.q(`#ns-i-${need} .lock`)||P.q(`#ns-i-${need} .ns-fail`)); }
}
async function openSheet(P,need,idea){
  await openNeed(P,need,true);
  await until(()=>P.q(`#ns-i-${need} .ns-row[data-idea="${idea}"]`));
  P.q(`#ns-i-${need} .ns-row[data-idea="${idea}"]`).click();
  await until(()=>P.q('#ns-sheet[open]')&&P.q('#ns-sheet').dataset.idea===idea);
}
module.exports={ROOT,HTML,FX,IDX,REG,sleep,until,checker,page,ready,survey,openNeed,openSheet};
