// v10.54.2 — the member's Spiritual Gifts report, simpler. The pastor (6 Oct 2026), of the report's end: "the first 90 days, I don't
// know what that is. The main thing is just a very simple steps on how to get involved go to your pastor go to a church leader ask to
// serve in … that specific area of your strength … pray about how much you can commit … then ask to … get integrated into … the
// lifeblood of the church and then assess … it says the Ministry leader will follow up. Don't wait for a ministry to follow up … you go …
// and make the connection … do we really need your skills and availability down below and available times because the person who takes
// this is gonna know … and send your results to the Pastor doesn't need to be there cause … it's gonna go to the pastor anyway".
// Runs the real gifts.mjs. Written failing-first on v10.54.1.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }
function makeStore(){
  const m=new Map();
  return { m, async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); }, async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; } };
}

(async()=>{ try{
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.RESEND_API_KEY; delete process.env.GIFTS_FROM;
  globalThis.__terrainGiftsStore=makeStore();
  globalThis.fetch=async()=>{ throw new Error('no network in tests'); };
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','gifts.mjs'))).default;
  const calls=[], allErrs=[];
  function page(url,{lang,failSubmit=false,store}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message)); allErrs.push(errs);
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        for(const [k,v] of Object.entries(store||{})) w.localStorage.setItem(k,v);
        w.fetch=async(u,o={})=>{
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/gifts/.test(u)){
            const body=o.body?JSON.parse(o.body):{}; calls.push(body);
            if(failSubmit&&body.op==='submit') throw new TypeError('Failed to fetch');
            const res=await handler(new Request('https://pastorshub.org'+u,{method:o.method||'GET',headers:o.headers,body:o.body}),{});
            const t=await res.text(); return {ok:res.ok,status:res.status,json:async()=>JSON.parse(t)};
          }
          return new Promise(()=>{});
        }; }});
    return {w:dom.window,D:dom.window.document,E:s=>dom.window.eval(s),txt:s=>{ const e=dom.window.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():''; }};
  }
  const finish=(M,o={})=>M.E(`GFS.name=${JSON.stringify(o.name||'Maria Lopez')}; GFS.minor=${o.minor?'true':'false'}; GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=g.id==='teach'?4:${o.v||2};}); GF_HEART.forEach(q=>GFS.h[q.k]=1); GFS.i=GF_TOTAL; GFS.done=true; gfSave(); gfRender();`);
  const submits=()=>calls.filter(x=>x.op==='submit').length;

  // the pastor's link
  const P=page('https://pastorshub.org/');
  await until(()=>P.E('typeof gfMemberLink==="function"'));
  P.E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; ch.share={church:'Bucks County SDA',min:{'Children\\'s Sabbath School':'r'}}; uPersist(); openTool('gifts'); GF_VIEW='setup'; gfRender(); })()`);
  P.D.getElementById('gflink2').click();
  await until(()=>P.D.getElementById('gflinkbox2').value);
  const link=P.D.getElementById('gflinkbox2').value;

  console.log('-- the first screen: no skills form; the consent says the answers and the name go to the pastor --');
  const M=page(link);
  await until(()=>M.D.getElementById('gfstart')&&M.E('GF_SERVER&&GF_SERVER.ok'));
  M.D.querySelector('.gfchip[data-age="adult"]').click(); await sleep(40);
  c('no "Your skills and availability (optional)" on the first screen', [!!M.D.getElementById('u-member-resources'),/skills and availability/i.test(M.txt('#gifts'))], [false,false]);
  c('the consent: "your answers and your name go to the person who sent you this link"', [/When you finish, your answers and your name go to the person who sent you this link/.test(M.txt('#gfconsent')),/skills/.test(M.txt('#gfconsent'))], [true,false]);

  console.log('\n-- finishing: the result goes by itself --');
  const n0=submits();
  finish(M);
  c('the box says it is on its way (no Send button)', [/Sending to your pastor…/.test(M.txt('#gfsendbox')),!!M.D.getElementById('gfsend')], [true,false]);
  await until(()=>M.E('GFS.sent===true'));
  c('sent, without a tap: one submit', [M.E('GFS.sent'),submits()-n0], [true,1]);
  c('…"Sent to your pastor"', /Sent to your pastor/.test(M.txt('#gfsendbox')));

  console.log('\n-- the report: four steps, no follow-up promise, no skills form --');
  const body=M.txt('#giftbody');
  c('"How to get involved", not "Your first ninety days"', [/How to get involved/.test(body),/first ninety days|ninety days alongside/i.test(body)], [true,false]);
  c('four steps in his order', [...M.D.querySelectorAll('.gfr-90>div')].map(d=>[d.querySelector('small').textContent,d.querySelector('b').textContent]),
    [['Step 1','Pray about it'],['Step 2','Talk to your pastor'],['Step 3','Start serving'],['Step 4','Look back']]);
  c('"Don’t wait to be asked: you make the first move."', /Don’t wait to be asked: you make the first move\./.test(body));
  c('step 1: pray about how much you can commit', /Pray about how much time you can commit to serving the church each week, and where God is leading you\./.test(body));
  c('step 2: set up a time with your pastor, bring the report, ask to serve where the gifts are strongest', /Set up a time with your pastor[^.]*, and bring this report\. (Ask to serve|Ask where)/.test(body));
  c('step 4: look back after a few months', /After a few months, talk it over with your pastor or ministry leader: keep going, change roles, or step back\./.test(body));
  c('no "A ministry leader will follow up", no "What happens next"', [/ministry leader will follow up/i.test(body),/What happens next/.test(body)], [false,false]);
  c('no "Your skills and availability" form, no "Save details"', [!!M.D.getElementById('u-member-resource-result'),/Save details/.test(M.D.getElementById('gifts').textContent)], [false,false]);
  c('the steps are four across on a computer, two on a tablet, one on a phone', [/\.gfr-90\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(html),/@media \(max-width:900px\)\{ \.gfr-90\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\} \}/.test(html)], [true,true]);

  console.log('\n-- never sent twice by itself --');
  M.E('gfRender()'); await sleep(200);
  c('drawn again: no second send', submits()-n0, 1);
  const R=page(link,{store:{}}); await until(()=>R.E('typeof gfRender==="function"'));
  M.E(`GFS.sent=false; gfSave(); gfRenderSend(document.getElementById('gfsendbox'));`); await sleep(200);
  c('after a delete (sent=false), the same answers wait for the button', [submits()-n0,!!M.D.getElementById('gfsend')], [1,true]);
  const u0=calls.filter(x=>x.op==='update').length;
  M.D.getElementById('gfsend').click(); await until(()=>M.E('GFS.sent===true'));
  c('…and the button still sends them (into the same record)', [submits()-n0,calls.filter(x=>x.op==='update').length-u0], [1,1]);

  console.log('\n-- not sent: the button and the same sentence as before --');
  const F=page(link,{failSubmit:true});
  await until(()=>F.D.getElementById('gfstart')&&F.E('GF_SERVER&&GF_SERVER.ok'));
  finish(F,{name:'Rosa Diaz',v:3});
  await until(()=>F.D.getElementById('gfsend')&&/Nothing is lost/.test(F.txt('#gfsendnote')));
  c('"Nothing is lost … Tap Send my result again", with the button', [/saved on this phone\. Tap Send my result again/.test(F.txt('#gfsendnote')),!!F.D.getElementById('gfsend'),F.D.getElementById('gfsend').disabled], [true,true,false]);

  console.log('\n-- under 18 --');
  const Y=page(link);
  await until(()=>Y.D.getElementById('gfstart')&&Y.E('GF_SERVER&&GF_SERVER.ok'));
  Y.D.querySelector('.gfchip[data-age="minor"]').click(); await sleep(40);
  c('the first screen: not shared, and can be deleted (no skills sentence)', [/not shared with anyone else/.test(Y.txt('#gfconsent')),/skills/.test(Y.txt('#gfconsent'))], [true,false]);
  finish(Y,{name:'Sam Youth',minor:true}); await until(()=>Y.E('GFS.sent===true'));
  c('the steps say: a parent or guardian, a youth leader, and who keeps the answers for a year',
    /If you are under 18, do it with a parent or guardian’s knowledge and a youth leader alongside\. Your answers go to the person who sent you the link and are kept for one year\./.test(Y.txt('#giftbody')));

  console.log('\n-- the model: the member\'s copy and the pastor\'s --');
  const own=JSON.parse(M.E(`JSON.stringify((()=>{ const S=gfScores(GFS.a); return gfReportModel(S,null,{own:true}); })())`));
  const pas=JSON.parse(M.E(`JSON.stringify((()=>{ const S=gfScores(GFS.a); return gfReportModel(S,null,{own:false}); })())`));
  c('the member\'s copy: no "what happens next"', own.next, []);
  c('the pastor\'s copy keeps its two lines', [pas.next.length,/within two weeks/.test(pas.next[0])], [2,true]);

  console.log('\n-- Spanish --');
  const S=page(link,{lang:'es'});
  await until(()=>S.D.getElementById('gfstart')&&S.E('GF_SERVER&&GF_SERVER.ok'));
  finish(S,{name:'Ana Ruiz'}); await until(()=>S.E('GFS.sent===true'));
  c('"Cómo involucrarse" and the four steps', [/Cómo involucrarse/.test(S.txt('#giftbody')),[...S.D.querySelectorAll('.gfr-90 b')].map(b=>b.textContent)],
    [true,['Ore al respecto','Hable con su pastor','Empiece a servir','Evalúe']]);
  c('"No espere a que le busquen: dé usted el primer paso."', /No espere a que le busquen: dé usted el primer paso\./.test(S.txt('#giftbody')));

  c('no page errors', allErrs.flat(), []);
  }catch(e){ console.log('  FAIL  crashed: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
