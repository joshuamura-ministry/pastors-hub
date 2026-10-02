// v10.43.0 · connection cards: loads index.html's two blocks ("CONNECTION CARDS · shared" and "· page") into a VM, so the
// pure suites (connect-tailor, connect-pastor, connect-look, connect-pdf) test exactly the code that ships. Not a suite.
const fs=require('fs'), path=require('path'), vm=require('vm');
const HTML=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
function block(name){
  const a=`/* ==== CONNECTION CARDS · ${name} ==== */`, b=`/* ==== END CONNECTION CARDS · ${name} ==== */`;
  const i=HTML.indexOf(a), j=HTML.indexOf(b);
  if(i<0||j<0||HTML.indexOf(a,i+1)>=0) throw new Error('index.html: the block "CONNECTION CARDS · '+name+'" is missing or doubled');
  return HTML.slice(i,j+b.length);
}
// A table from the app, read out of index.html (never copied by hand).
function lit(name){
  const i=HTML.indexOf('const '+name+'='); if(i<0) throw new Error('no '+name);
  const s=HTML.slice(i+('const '+name+'=').length), open=s[0], close=open==='{'?'}':']';
  let d=0,q=null; for(let k=0;k<s.length;k++){ const ch=s[k];
    if(q){ if(ch==='\\'){ k++; continue; } if(ch===q) q=null; continue; }
    if(ch==="'"||ch==='"'||ch==='`'){ q=ch; continue; }
    if(ch===open) d++; else if(ch===close&&--d===0) return Function('return '+s.slice(0,k+1))(); }
  throw new Error('unclosed '+name);
}
// The built-ins' ids and English names (SIGNATURE), by pattern.
function signature(){
  const sl=n=>{ const i=HTML.indexOf('const '+n+'=['); return HTML.slice(i,HTML.indexOf('\n];',i)); };
  const S=sl('SIGNATURE')+'\n'+sl('SMALL_GROUPS'), out=[];   // SIGNATURE.push(...SMALL_GROUPS)
  const parts=S.split(/\n ?\{id:'/).slice(1);
  const str=(p,key)=>{ const m=new RegExp('[{,\\s]'+key+":(['\"])((?:\\\\.|(?!\\1).)*)\\1").exec(p); return m?m[2].replace(/\\\\(['"])/g,'$1').replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16))):''; };
  for(const p of parts){ const id=/^([a-z0-9-]+)'/.exec(p); if(id) out.push({id:id[1],n:str(p,'n'),d:str(p,'d')}); }
  return out;
}
function load(o){
  o=o||{};
  const ctx={console,Buffer:o.noBuffer?undefined:Buffer,setTimeout,clearTimeout,Promise,URL,TextEncoder,Uint8Array,
    btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),
    esc:s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
    LANG:o.lang||'en',L:(en,es)=>(o.lang==='es'?es:en),memberLink:()=>false,
    document:{addEventListener(){},querySelectorAll:()=>[]},fetch:o.fetch||(async()=>({ok:false,status:404}))};
  vm.createContext(ctx);
  vm.runInContext(block('shared')+'\n'+(o.page===false?'':block('page')),ctx,{filename:'index.html#connect-blocks'});
  const get=n=>vm.runInContext(n,ctx);
  return new Proxy({},{get:(_,k)=>k==='__ctx'?ctx:get(k)});
}
module.exports={HTML,block,lit,signature,load};
