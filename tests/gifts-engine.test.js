// Spiritual Gifts engine and intake (v10.37): five statements per gift, fruit
// as a mean, observer blending, the four labels, the 105-statement order, v4
// result codes, v3 link context with the neighborhood needs, the heart page,
// the under-18 path, the observer page, Spanish, and one full round trip
// through the real netlify/functions/gifts.mjs against an in-memory store.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=JSON.parse(fs.readFileSync(path.resolve(__dirname,'fixtures.json'),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,300));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=4000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }

// ---- an in-memory Netlify Blobs store, the subset gifts.mjs uses ----------
function makeStore(){
  const m=new Map();
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; } };
}

(async()=>{
  delete process.env.TERRAIN_CODES; delete process.env.RESEND_API_KEY; delete process.env.GIFTS_FROM;
  globalThis.__terrainGiftsStore=makeStore();
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','gifts.mjs'))).default;
  const calls=[];
  function page(url,{lang,server=true,peek}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        w.fetch=async(u,o={})=>{
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/gifts/.test(u)){
            const body=o.body?JSON.parse(o.body):{};
            calls.push(body);
            if(!server) return {ok:false,status:404,json:async()=>{ throw new Error('html'); }};
            if(peek&&body.op==='peek') return {ok:true,status:200,json:async()=>peek};
            if(peek&&body.op==='confirm') return {ok:true,status:200,json:async()=>({ok:true})};
            const res=await handler(new Request('https://pastorshub.org'+u,{method:o.method||'GET',headers:o.headers,body:o.body}),{});
            const t=await res.text();
            return {ok:res.ok,status:res.status,json:async()=>JSON.parse(t)};
          }
          return new Promise(()=>{});
        };
      }});
    // v10.38.0: the app sends no email for now (GF_EMAIL_ENABLED=false, see
    // tests/email-off.test.js). These journeys keep the email paths covered by
    // switching it on, exactly as a later release will.
    dom.window.eval('GF_EMAIL_ENABLED=true');
    return {w:dom.window,errs};
  }

  // ======================================================= the engine
  const P=page('https://pastorshub.org/');
  const w=P.w;
  await until(()=>w.eval('typeof gfScores==="function"&&typeof GIFTS_ES==="object"'));
  const E=s=>w.eval(s);
  const S=(a,obs)=>E(`JSON.stringify(gfScores(${JSON.stringify(a)},${JSON.stringify(obs||null)}))`);
  const one=(a,obs,id='teach')=>JSON.parse(S(a,obs)).find(x=>x.id===id);

  console.log('-- scoring --');
  c('every gift has five statements', E('GIFTS.every(g=>g.s.length===5&&g.s[4]===GF_FRUIT2[g.id])'), true);
  c('fruit is the mean of keys 2 and 4', one({'teach.2':4,'teach.4':2}).ev.fruit, 3);
  c('one fruit answered -1: the other stands', one({'teach.2':-1,'teach.4':3}).ev.fruit, 3);
  c('both fruit answers -1: fruit is -1', one({'teach.2':-1,'teach.4':-1}).ev.fruit, -1);
  c('fruit unanswered: null', one({'teach.0':2}).ev.fruit, null);
  c('a v3 result (no key 4) still scores fruit from key 2', one({'teach.0':3,'teach.1':3,'teach.2':4,'teach.3':3}).ev.fruit, 4);
  c('weights unchanged: all 4s score 100', one({'teach.0':4,'teach.1':4,'teach.2':4,'teach.3':4,'teach.4':4}).score, 100);
  c('score renormalises around -1', one({'teach.0':4,'teach.1':4,'teach.2':-1,'teach.3':-1,'teach.4':-1}).score, 100);
  c('demonstrated: fruit ≥3 and conf ≥3', one({'teach.0':2,'teach.1':2,'teach.2':3,'teach.3':3,'teach.4':3}).label, 'demonstrated');
  c('emerging: desire ≥3', one({'teach.0':3,'teach.1':1,'teach.2':1,'teach.3':1,'teach.4':1}).label, 'emerging');
  c('emerging wins over a -1', one({'teach.0':1,'teach.1':4,'teach.2':-1,'teach.3':-1,'teach.4':1}).label, 'emerging');
  c('answered and low is QUIET, not untested (the badge bug)', one({'teach.0':1,'teach.1':1,'teach.2':0,'teach.3':1,'teach.4':1}).label, 'quiet');
  c('low with a -1 given is untested', one({'teach.0':1,'teach.1':1,'teach.2':-1,'teach.3':1,'teach.4':1}).label, 'untested');
  c('nothing answered is quiet, with no score', [one({}).label,one({}).score], ['quiet',null]);
  c('unt counts every -1 statement', one({'teach.2':-1,'teach.3':-1,'teach.4':-1}).unt, 3);
  console.log('-- observer blending --');
  c('self 1, observers 4 and 4: conf (1+2·4)/3 = 3', one({'teach.3':1},{teach:[4,4]}).ev.conf, 3);
  c('self -1: observers alone', one({'teach.3':-1},{teach:[3,2]}).ev.conf, 2.5);
  c('self unanswered: observers alone', one({},{teach:[4]}).ev.conf, 4);
  c('"haven\'t seen enough" (-1) is ignored', one({'teach.3':2},{teach:[-1,-1]}).ev.conf, 2);
  c('observers can make a gift demonstrated', one({'teach.0':2,'teach.1':2,'teach.2':3,'teach.3':1,'teach.4':3},{teach:[4,4]}).label, 'demonstrated');
  c('obsN counts the people who rated it', one({},{teach:[3,-1,4]}).obsN, 2);
  c('gfObsFrom turns server observers into ratings per gift',
    E(`JSON.stringify(gfObsFrom([{name:'A',ratings:{teach:3,shep:-1}},{name:'B',ratings:{teach:4,bogus:2}}]))`), JSON.stringify({teach:[3,4],shep:[-1]}));
  console.log('-- badges --');
  c('badge words', E(`['demonstrated','emerging','untested','quiet'].map(l=>gfBadge(l).replace(/<[^>]+>/g,'')).join('|')`), 'demonstrated|emerging|untested|less evident');
  c('badge words in Spanish', E(`(()=>{LANG='es';const t=['demonstrated','emerging','untested','quiet'].map(l=>gfBadge(l).replace(/<[^>]+>/g,'')).join('|');LANG='en';return t;})()`), 'demostrado|en desarrollo|sin probar|menos evidente');
  c('no consumer still asks for "latent"', /['"]latent['"]/.test(html), false);
  console.log('-- all-high flag --');
  c('all 4s: flagged', E(`(()=>{const a={};GIFTS.forEach(g=>{for(let k=0;k<5;k++)a[g.id+'.'+k]=4;});return gfFlags(a).allHigh;})()`), true);
  c('85% at 3-4: flagged', E(`(()=>{const a={};GIFTS.forEach((g,i)=>{for(let k=0;k<5;k++)a[g.id+'.'+k]=(i*5+k)%20<17?3:1;});return gfFlags(a).allHigh;})()`), true);
  c('80% at 3-4: not flagged', E(`(()=>{const a={};GIFTS.forEach((g,i)=>{for(let k=0;k<5;k++)a[g.id+'.'+k]=(i*5+k)%5<4?3:1;});return gfFlags(a).allHigh;})()`), false);
  c('-1 is not a rating', E(`(()=>{const a={};GIFTS.forEach(g=>{for(let k=0;k<5;k++)a[g.id+'.'+k]=k===2?-1:4;});const f=gfFlags(a);return [f.answered,f.allHigh];})()`), [84,true]);
  c('too few answers to say', E(`gfFlags({'teach.0':4,'teach.1':4}).allHigh`), false);

  console.log('-- the 105-statement order --');
  const ord=JSON.parse(E('JSON.stringify({o:GF_ORDER.map(x=>[x[0],x[1]]),s:GF_SECT_STARTS,e:GF_SECT_ENDS,fam:GIFTS.map(g=>g.fam),fams:GF_FAMS.map(f=>f.id),T:GF_TOTAL})'));
  c('105 statements', [ord.T,ord.o.length], [105,105]);
  const pairs=new Set(ord.o.map(x=>x[0]+'.'+x[1]));
  c('each gift is asked each of the five kinds exactly once', pairs.size===105&&[...Array(21).keys()].every(g=>[0,1,2,3,4].every(k=>pairs.has(g+'.'+k))), true);
  c('no two neighbouring statements measure the same gift', ord.o.every((x,i)=>i===0||ord.o[i-1][0]!==x[0]), true);
  c('five sections, one per family, in family order', ord.s.map((st,k)=>ord.o.slice(st,ord.e[k]+1).every(x=>ord.fam[x[0]]===ord.fams[k])), [true,true,true,true,true]);
  c('sections cover every statement', [ord.s[0],ord.e[4]], [0,104]);
  c('each kind rotates: a gift never meets the same kind twice in a row across passes',
    ord.o.every((x,i)=>ord.o.findIndex(y=>y[0]===x[0]&&y[1]===x[1])===i), true);

  console.log('-- result codes --');
  E(`GFS={name:'Ana María López',a:{},h:{},i:0,sect:-1,done:true,sent:false,minor:true,email:'ana@example.org',emailOk:true};
     GIFTS.forEach((g,gi)=>{for(let k=0;k<5;k++){const v=(gi+k)%7; if(v<5) GFS.a[g.id+'.'+k]=v; else if(v===5) GFS.a[g.id+'.'+k]=-1;}});
     GF_HEART.forEach((q,i)=>{ if(i%4!==3) GFS.h[q.k]=i%3; });`);
  const code=E('gfEncode()');
  const raw=Buffer.from(code.slice(4).replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');
  const j=JSON.parse(raw);
  c('v4 code shape', [j.v,j.chars.length,j.heart.length,j.minor], [4,105,12,true]);
  c('an email address never goes in a code', /example\.org|email/i.test(raw), false);
  const d=JSON.parse(E(`JSON.stringify(gfDecode(${JSON.stringify(code)}))`));
  c('v4 round trip: answers', JSON.stringify(d.a)===E('JSON.stringify(GFS.a)')||Object.keys(d.a).every(k=>d.a[k]===E(`GFS.a[${JSON.stringify(k)}]`))&&Object.keys(d.a).length===E('Object.keys(GFS.a).length'), true);
  c('v4 round trip: heart, minor, name, version', [JSON.stringify(Object.entries(d.h).sort()),d.minor,d.name,d.v], [JSON.stringify(Object.entries(E('JSON.stringify(GFS.h)')&&JSON.parse(E('JSON.stringify(GFS.h)'))).sort()),true,'Ana María López',4]);
  const v3=(()=>{ const chars=E(`GIFTS.map((g,gi)=>[0,1,2,3].map(k=>['4','x','.','2'][(gi+k)%4]).join('')).join('')`);
    return 'TG1-'+Buffer.from(JSON.stringify({v:3,date:'2026-01-01',chars,church:'Old',churchId:'c1',name:'Old Member',memberId:'m1',resources:{}})).toString('base64url'); })();
  const d3=JSON.parse(E(`JSON.stringify(gfDecode(${JSON.stringify(v3)}))`));
  c('v3 still decodes: four keys per gift, no key 4', [d3.v,d3.name,d3.a['admin.0'],d3.a['admin.1'],'admin.2' in d3.a,d3.a['admin.3'],'admin.4' in d3.a,d3.minor], [3,'Old Member',4,-1,false,2,false,false]);
  const v1='TG1-'+Buffer.from('1~2025-01-01~'+'3'.repeat(84)+'~Legacy Name').toString('base64');
  c('v1 still decodes', JSON.parse(E(`JSON.stringify(gfDecode(${JSON.stringify(v1)}))`)).name, 'Legacy Name');
  c('a v4 code with the wrong length is refused', E(`gfDecode('TG1-'+btoa(JSON.stringify({v:4,chars:'4'.repeat(84)})))`), null);

  console.log('-- link context v3 --');
  E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; ch.share={...(ch.share||{}),church:'Bucks County SDA',min:{'Small groups':'r','Adventurers':'s'},
     needs:{list:[{id:'kids',v:27,x:null},{id:'lang-primary',v:19,x:'Spanish'},{id:'shift-race',v:-4,x:'Hispanic / Latino'},{id:'gini',v:48,x:null},{id:'bogus',v:1,x:null}],area:'Census Tract 2041.02',year:2024,date:'2026-09-28'}}; })()`);
  const ctx=E('gfCtxEncode()');
  c('ctx is url-safe', /^[A-Za-z0-9_-]+$/.test(ctx), true);
  const cd=JSON.parse(E(`JSON.stringify(gfCtxDecode(${JSON.stringify(ctx)}))`));
  c('v3 round trip: church, ministries, area, year', [cd.church,cd.min['Small groups'],cd.min['Adventurers'],cd.area,cd.year], ['Bucks County SDA','r','s','Census Tract 2041.02',2024]);
  c('v3 round trip: needs with values and extras (unknown ids dropped)', cd.needs, [{id:'kids',v:27,x:null},{id:'lang-primary',v:19,x:'Spanish'},{id:'shift-race',v:-4,x:'Hispanic / Latino'},{id:'gini',v:48,x:null}]);
  c('churchId travels', cd.churchId, E('uChurch().id'));
  const v2=Buffer.from(['2','Old Church','kitchen','.'.repeat(E('GF_MIN.length')),'cid'].join('|')).toString('base64').replace(/=+$/,'');
  c('v2 context still decodes, with no needs', JSON.parse(E(`JSON.stringify(gfCtxDecode(${JSON.stringify(v2)}))`)), {church:'Old Church',fac:['kitchen'],min:{},churchId:'cid',needs:[],area:'',year:null});
  // the snapshot is taken from the survey only when it is THIS church's address
  E(`DATA=${JSON.stringify(FX.DATA)}; uChurch().address='somewhere else';`);
  c('a survey for another address is not attached', E('gfSurveyNeeds()'), null);
  E(`uChurch().address=${JSON.stringify(FX.DATA.geo.matched)};`);
  const sn=JSON.parse(E('JSON.stringify(gfSurveyNeeds())'));
  c('the church\'s own survey gives a snapshot', [sn.area,sn.year,sn.list.length>3], ['Census Tract 2041.02',2024,true]);
  c('every snapshot need has a GF_NEEDS entry and a whole-number figure', sn.list.every(n=>E(`!!GF_NEEDS[${JSON.stringify(n.id)}]`)&&Number.isInteger(n.v)), true);
  const lp=sn.list.find(n=>n.id==='lang-primary');
  c('entries with xOf carry their extra (language name)', lp&&lp.x, 'Spanish');
  const withX=sn.list.filter(n=>E(`typeof GF_NEEDS[${JSON.stringify(n.id)}].xOf==='function'`));
  c('every entry that has xOf was given its x (or null when the census had none)', withX.every(n=>'x' in n), true);
  E('gfNeedsRefresh()');
  const cd2=JSON.parse(E('JSON.stringify(gfCtxDecode(gfCtxEncode()))'));
  c('the refreshed snapshot rides in the link, with figures that still read', cd2.needs.length===sn.list.length&&cd2.needs.every(n=>{ const s=E(`GF_NEEDS[${JSON.stringify(n.id)}].figEn(${n.v},${JSON.stringify(n.x)})`); return s===null||(typeof s==='string'&&!/NaN|undefined/.test(s)); }), true);
  E('GF_VIEW="setup"; gfRender();');
  c('setup names the attached survey', /Community Survey attached/.test(w.document.getElementById('giftbody').textContent)&&/Census Tract 2041\.02/.test(w.document.getElementById('giftbody').textContent), true);
  E(`uChurch().share={church:'X',min:{}}; DATA=null; gfRender();`);
  c('without one, setup says to run the survey first', /Run the Community Survey for/.test(w.document.getElementById('giftbody').textContent), true);

  console.log('-- the heart page --');
  // v10.51.3 — the pastor: "Part two … shouldn't be like a next part … the sixth in line": section 6 opens with its own card first
  E(`GF_VIEW='take'; GFS={name:'Ana',a:{},h:{},i:GF_TOTAL,sect:4,done:false,sent:false,ov:GF_TOTAL}; GFS.a['teach.0']=3; GF_RESUMED=true; gfRender();`);
  const D=w.document, hb=()=>D.getElementById('giftbody');
  c('v10.51.3: section 6 opens with its card, like the other five', [!!D.getElementById('gfgo'),hb().querySelector('.gfsect')&&hb().querySelector('.gfsect').dataset.gff,hb().querySelector('.gfsecn')&&hb().querySelector('.gfsecn').textContent,hb().querySelectorAll('.gfhq').length], [true,'heart','Section 6 of 6',0]);
  D.getElementById('gfgo').click(); await until(()=>hb().querySelectorAll('.gfhq').length===12,2000);
  c('twelve questions on one screen', hb().querySelectorAll('.gfhq').length, 12);
  c('three answers each', [...hb().querySelectorAll('.gfhq')].every(q=>q.querySelectorAll('.gfhchip').length===3), true);
  c('the questions are GF_HEART in order', [...hb().querySelectorAll('.gfhq')].map(q=>q.dataset.k).join(','), E('GF_HEART.map(q=>q.k).join(",")'));
  c('Back and See my results', [!!D.getElementById('gfhback'),D.getElementById('gfhdone').textContent], [true,'See my results']);
  hb().querySelector('.gfhq[data-k="children"] .gfhchip[data-v="2"]').click();
  c('a tap records the answer', E('GFS.h.children'), 2);
  D.getElementById('gfhdone').click();
  c('unanswered questions are pointed out first', [E('GFS.done'),hb().querySelectorAll('.gfhq.gfmiss').length], [false,11]);
  D.getElementById('gfhdone').click();
  c('a second tap goes on to the result', E('GFS.done'), true);
  E(`GFS.done=false; GFS.i=GF_TOTAL; GF_RESUMED=false; gfRender();`);
  c('resume knows about the heart page (section 6)', D.getElementById('gfresume')&&D.getElementById('gfresume').textContent, 'Carry on with section 6');
  D.getElementById('gfresume').click();
  c('and carries on there', hb().querySelectorAll('.gfhq').length, 12);
  D.getElementById('gfhback').click();
  c('Back goes to the last statement', [E('GFS.i'),!!hb().querySelector('.gfcardq')], [104,true]);
  E(`GFS.a[gfKeyOf(GF_ORDER[104][0],GF_ORDER[104][1])]=undefined; delete GFS.a[gfKeyOf(GF_ORDER[104][0],GF_ORDER[104][1])];`);
  hb().querySelector('.gfcardq .gfopt').click();
  await until(()=>D.getElementById('gfgo'),3000);
  // v10.51.3: Back from section 6 then the last statement again: its opener once more (as crossing into any section), then its questions
  c('answering the last statement opens section 6 (its card), not the result', [hb().querySelector('.gfsecn')&&hb().querySelector('.gfsecn').textContent,E('GFS.done')], ['Section 6 of 6',false]);
  D.getElementById('gfgo').click(); await until(()=>hb().querySelectorAll('.gfhq').length===12,3000);
  c('…Carry on: the twelve questions', hb().querySelectorAll('.gfhq').length, 12);
  E(`GFS={name:'Old',a:{'teach.0':3,'teach.1':2},i:40,sect:1,done:false,sent:false}; localStorage.setItem(uGiftSessionKey(),JSON.stringify(GFS)); gfLoad();`);
  c('an 84-order session resumes at its first unanswered statement', E('GFS.i'), E('GF_ORDER.findIndex(p=>GFS.a[gfKeyOf(p[0],p[1])]===undefined)'));
  // A member 83 of the way through the old 84 statements: the 21 new second-fruit
  // statements are spread through every section. Fill mode walks only the blanks,
  // so exactly 22 answers reach the heart page, and nothing answered before changes.
  E(`window.__mm=window.matchMedia; window.matchMedia=()=>({matches:true});
     (()=>{ const a={}; GIFTS.forEach((g,gi)=>{ for(let k=0;k<4;k++) a[g.id+'.'+k]=((gi+k)%6)-1; }); delete a['teach.2'];
       window.__old=a; GFS={name:'Old',a:{...a},i:83,sect:4,done:false,sent:false}; localStorage.setItem(uGiftSessionKey(),JSON.stringify(GFS)); gfLoad();
       GF_VIEW='take'; GF_RESUMED=true; gfRender(); })()`);
  c('the carried-over session is in fill mode, at its first blank', [E('!!GFS.fill'),E('GFS.i'),E('gfNextOpen(0)')], [true,E('gfNextOpen(0)'),E('GF_ORDER.findIndex(p=>GFS.a[gfKeyOf(p[0],p[1])]===undefined)')]);
  let taps=0, guard=0;
  while(guard++<80&&!hb().querySelector('.gfhq')){
    const go=D.getElementById('gfgo');
    if(go){ go.click(); await sleep(5); continue; }
    const cq=hb().querySelector('.gfcardq');
    const at=cq&&+cq.dataset.i;
    const lit=cq&&cq.querySelector('.gfopt.on');
    if(lit){ c('fill mode never shows an already-answered card', at, -1); break; }
    const opt=cq&&cq.querySelector('.gfopt[data-v="2"]');
    if(!opt) break;
    opt.click(); taps++;
    await until(()=>{ const n=hb().querySelector('.gfcardq'); return hb().querySelector('.gfhq')||D.getElementById('gfgo')||(n&&+n.dataset.i!==at); },2000);
  }
  c('22 answers reach the heart page', [taps,hb().querySelectorAll('.gfhq').length,E('gfAnswered()')], [22,12,105]);
  c('the 83 earlier answers are unchanged, fill mode is over', [E('Object.keys(__old).every(k=>GFS.a[k]===__old[k])'),E('Object.keys(__old).length'),E('!!GFS.fill')], [true,83,false]);
  E(`window.matchMedia=window.__mm; delete window.__old;`);

  console.log('-- Spanish --');
  const PS=page('https://pastorshub.org/',{lang:'es'});
  await until(()=>PS.w.eval('typeof gfCardHTML==="function"'));
  const es=s=>PS.w.eval(s);
  es(`GFS={name:'',a:{},h:{},i:0,sect:-1,done:false,sent:false,ov:GF_TOTAL}; GF_VIEW='take';`);
  const card=es('gfCardHTML(1)');
  const gi1=es('GF_ORDER[1][0]'), k1=es('GF_ORDER[1][1]');
  c('statements come from GIFTS_ES', card.includes(es(`esc(GIFTS_ES[GIFTS[${gi1}].id].s[${k1}])`))&&!card.includes(es(`esc(GIFTS[${gi1}].s[${k1}])`)), true);
  c('every Spanish gift has five statements', es('Object.keys(GIFTS_ES).length===21&&GIFTS.every(g=>GIFTS_ES[g.id].s.length===5)'), true);
  c('the scale is Spanish', card.includes('No he tenido oportunidad de saberlo')&&!card.includes('Not true of me'), true);
  es('gfRenderSection(gfHost(),0)');
  const secT=PS.w.document.getElementById('giftbody').textContent;
  c('section title, lead and verse are Spanish, cited RVA', /Las Escrituras y la verdad/.test(secT)&&/repartimiento de dones/.test(secT)&&/RVA/.test(secT)&&!/KJV/.test(secT), true);
  es(`GFS.i=GF_TOTAL; GFS.hseen=true; gfRenderHeart(gfHost());`);   // v10.51.3: past section 6's opener
  const heT=PS.w.document.getElementById('giftbody').textContent;
  c('the heart page is Spanish', /Mi corazón se inclina hacia los niños/.test(heT)&&/Ver mis resultados/.test(heT)&&/No mucho/.test(heT)&&!/See my results/.test(heT), true);
  es(`GFS={name:'',a:{},h:{},i:0,sect:-1,done:false,sent:false,ov:GF_TOTAL}; gfRenderIntro(gfHost());`);
  const inT=PS.w.document.getElementById('giftbody').textContent;
  // v10.42 part 3 (the pastor, SPEC-FOCUS E: "ready announcement text EN + ES for the bulletin, text message, WhatsApp and the pulpit"; the approved spec: "about 15 minutes", the design X17): "unos 15 minutos"
  c('the first screen is Spanish', /Descubra sus dones espirituales/.test(inT)&&/Antes de comenzar/.test(inT)&&/unos 15 minutos/.test(inT)&&!/Before you begin/.test(inT), true);
  c('Romans 12:6–7 in both languages marks the omitted clause', [es('GF_VERSES[3][0].includes("given to us... let us wait")'),es('GF_VERSE_SET[3][1]'),es('GF_VERSE_SET_ES[3][1]')], [true,'Romans 12:6–7','Romanos 12:6–7']);
  c('RVA chapter-opening capitals set in sentence case', [es('GF_DEEP_ES.discern.v[0].slice(0,6)'),es('GF_DEEP_ES.faith.v[0].slice(0,7)'),es('GF_DEEP_ES.inter.v[0].slice(0,13)')], ['Amados','Es pues','Amonesto pues']);

  // ======================================================= a full round trip through the real server
  console.log('-- pastor, member, observer: one round trip --');
  process.env.RESEND_API_KEY='re_test'; process.env.GIFTS_FROM='Terrain <reports@example.org>';
  E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; ch.share={church:'Bucks County SDA',min:{'Small groups':'r'}}; })()`);
  const pub=await w.eval('gfPubId()');
  c('one campaign per church, kept on the church', [/^[A-Za-z0-9_-]{12}$/.test(pub),E('uChurch().share.pub')===pub,/^[A-Za-z0-9_-]{32}$/.test(E('uChurch().share.key'))], [true,true,true]);
  c('asking again reuses it', await w.eval('gfPubId()'), pub);
  const link=E('gfCtxEncode()');

  // the member, under 18
  const M=page(`https://pastorshub.org/#gifts=${pub}.${link}`);
  await until(()=>M.w.document.getElementById('gfstart'));
  await until(()=>M.w.eval('GF_SERVER&&GF_SERVER.ok'));
  const MD=M.w.document;
  c('the member link skips the access gate and opens the intro', [M.w.eval('ACCESS.ok'),!!MD.getElementById('gfstart')], [true,true]);
  c('the first screen asks for age', MD.querySelectorAll('.gfchip[data-age]').length, 2);
  MD.getElementById('gfstart').click();
  c('age is required', [/18 or older/.test(MD.getElementById('gfintroerr').textContent),M.w.eval('GFS.i')], [true,0]);
  MD.querySelector('.gfchip[data-age="adult"]').click();
  await until(()=>MD.getElementById('gfemail'));
  c('an adult with email on the server is offered the email field and consent', [!!MD.getElementById('gfemail'),!!MD.getElementById('gfemailok')], [true,true]);
  MD.querySelector('.gfchip[data-age="minor"]').click();
  c('under 18: no email field', MD.getElementById('gfemail'), null);
  c('under 18: the parent or guardian line', [MD.getElementById('gfminornote').hidden,/parent or guardian/.test(MD.getElementById('gfminornote').textContent),/kept for one year/.test(MD.getElementById('gfminornote').textContent)], [false,true,true]);
  MD.getElementById('gfname').value='Sam Youth';
  MD.getElementById('gfstart').click();
  c('Begin starts the statements', !!MD.querySelector('.gfcardq'), true);
  M.w.eval(`GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=(g.id==='teach'||g.id==='shep')?4:1;}); GF_HEART.forEach(q=>GFS.h[q.k]=1); GFS.i=GF_TOTAL; GFS.done=true; gfSave(); gfRender();`);
  // v10.54.2 — the pastor: "send your results to the Pastor doesn't need to be there cause … it's gonna go to the pastor anyway": the result goes by itself when the report opens
  await until(()=>M.w.eval('GFS.sent===true'));
  const sub=calls.filter(x=>x.op==='submit').pop();
  c('submit sends minor as a real boolean and no email for a minor', [sub.minor,'email' in sub,'emailOk' in sub,sub.lang], [true,false,false,'en']);
  c('the server returned rid and token, kept in GFS', [/^[A-Za-z0-9_-]{12}$/.test(M.w.eval('GFS.rid')),/^[A-Za-z0-9_-]{32}$/.test(M.w.eval('GFS.token'))], [true,true]);
  await until(()=>MD.getElementById('gfaskmake'));
  c('after sending: "Ask two or three people who know you"', [!MD.getElementById('gfaskbox').hidden,/Ask two or three people/.test(MD.getElementById('gfaskbox').textContent)], [true,true]);
  MD.getElementById('gfaskmake').click();
  await until(()=>MD.querySelectorAll('.gfaskrow input').length===1);
  const inviteURL=MD.querySelector('.gfaskrow input').value;
  c('an invite link to copy', /#gifts-confirm=[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{24}$/.test(inviteURL), true);
  const inv=calls.filter(x=>x.op==='invite').pop();
  c('it asks about the member\'s leading gifts (≤8)', inv.gifts.length>=2&&inv.gifts.length<=8&&inv.gifts.includes('teach')&&inv.gifts.includes('shep'), true);

  // the observer
  const O=page('https://pastorshub.org/'+inviteURL.slice(inviteURL.indexOf('#')));
  await until(()=>O.w.document.getElementById('gfobsend'));
  const OD=O.w.document;
  c('the observer page skips the gate and names the member by first name', [O.w.eval('ACCESS.ok'),/Sam asked you to say honestly/.test(OD.getElementById('giftbody').textContent)], [true,true]);
  c('one row per gift asked, with the name and one line, six answers each', [OD.querySelectorAll('.gfobq').length,[...OD.querySelectorAll('.gfobq')].every(q=>q.querySelectorAll('.gfhchip').length===6)], [inv.gifts.length,true]);
  c('the member\'s own answers are not shown', /Consistently true|Often true/.test(OD.getElementById('giftbody').textContent), false);
  OD.getElementById('gfobsend').click();
  c('every gift must be answered', /answer for every gift/.test(OD.getElementById('gfoberr').textContent), true);
  OD.querySelectorAll('.gfobq').forEach(q=>q.querySelector(q.dataset.g==='teach'?'[data-v="4"]':'[data-v="-1"]').click());
  OD.getElementById('gfobsend').click();
  c('and a name', /add your name/.test(OD.getElementById('gfoberr').textContent), true);
  OD.getElementById('gfobname').value='Pat Leader';
  OD.getElementById('gfobnote').value='Sam teaches the juniors well.';
  OD.getElementById('gfobsend').click();
  await until(()=>/Thank you/.test(OD.getElementById('giftbody').textContent));
  c('thanks after sending', /Your answers have gone to Sam/.test(OD.getElementById('giftbody').textContent), true);
  const conf=calls.filter(x=>x.op==='confirm').pop();
  c('ratings go as integers, -1 for "haven\'t seen enough"', [conf.ratings.teach,Object.values(conf.ratings).filter(v=>v===-1).length,conf.name], [4,inv.gifts.length-1,'Pat Leader']);

  // the pastor pulls
  E('GF_VIEW="roster"; gfRender();');
  w.document.getElementById('gfpull').click();
  await until(()=>w.document.querySelectorAll('.gfrosterrow').length===1);
  const row=w.document.querySelector('.gfrosterrow');
  c('the result arrives without a pasted code', row&&/Sam Youth/.test(row.textContent), true);
  c('the row says Under 18 and Confirmed by 1', [/Under 18/.test(row.textContent),/Confirmed by 1/.test(row.textContent)], [true,true]);
  c('list is called with the key', calls.filter(x=>x.op==='list').pop().key, E('uChurch().share.key'));
  const people=JSON.parse(E('JSON.stringify(uPeople().map(p=>({n:p.name,minor:p.minor,obs:p.gifts.find(g=>g.id==="teach").obsN,h:p.heart.children})))'));
  c('the congregation reads confirmations, heart answers and the minor flag', people, [{n:'Sam Youth',minor:true,obs:1,h:1}]);
  E('GF_VIEW="church"; gfRender();');
  c('"Across the church" still reads the new labels', [/Across the congregation/.test(w.document.getElementById('giftbody').textContent),/undefined|NaN/.test(w.document.getElementById('giftbody').textContent)], [true,false]);
  E('GF_VIEW="roster"; gfRender();');
  w.document.querySelector('.gfrosterrow .gfopen').click();
  c('opening it shows "Confirmed by 1 person" on teaching', /Confirmed by 1 person/.test(w.document.getElementById('giftbody').textContent), true);
  // the member sees the confirmation too
  M.w.eval('gfHost().dataset.obsChecked=""; gfRender();');
  await until(()=>M.w.eval('GFS.obsCount')===1);
  c('the member\'s page picks up the confirmation', [M.w.eval('GFS.obsCount'),M.w.eval('GFS.observers.teach[0]')], [1,4]);

  // the report link, read-only
  const R=page(`https://pastorshub.org/#gifts-report=${pub}.${M.w.eval('GFS.rid')}.${M.w.eval('GFS.token')}`);
  await until(()=>R.w.document.getElementById('gfdelmine'));
  const RT=R.w.document.getElementById('giftbody').textContent;
  c('#gifts-report opens the result read-only, skipping the gate', [R.w.eval('ACCESS.ok'),/Your spiritual gifts/.test(RT),!!R.w.document.getElementById('gfsend'),!!R.w.document.getElementById('gfredo')], [true,true,false,false]);
  // the pastor deletes
  E('GF_VIEW="roster"; gfRender();');
  const del=w.document.querySelector('.gfdel');
  del.click(); del.click();
  await until(()=>w.document.querySelectorAll('.gfrosterrow').length===0);
  c('the pastor can delete a result: gone here and on the server', [w.document.querySelectorAll('.gfrosterrow').length,calls.filter(x=>x.op==='delete').pop().key===E('uChurch().share.key'),[...globalThis.__terrainGiftsStore.m.keys()].filter(k=>k.startsWith('r/')).length], [0,true,0]);

  console.log('-- an adult with email, and the observer page from a stubbed peek --');
  const A=page(`https://pastorshub.org/#gifts=${pub}.${link}`);
  await until(()=>A.w.document.getElementById('gfstart')&&A.w.eval('GF_SERVER&&GF_SERVER.ok'));
  const AD=A.w.document;
  AD.querySelector('.gfchip[data-age="adult"]').click();
  await until(()=>AD.getElementById('gfemail'));
  AD.getElementById('gfemail').value='not an address'; AD.getElementById('gfemailok').checked=true;
  AD.getElementById('gfstart').click();
  c('a ticked box needs a real address', [/email address/.test(AD.getElementById('gfintroerr').textContent),!!AD.querySelector('.gfcardq')], [true,false]);
  AD.getElementById('gfemail').value='ana@example.org';
  AD.getElementById('gfstart').click();
  c('adult email and consent kept on the device', [A.w.eval('GFS.email'),A.w.eval('GFS.emailOk'),A.w.eval('GFS.minor')], ['ana@example.org',true,false]);
  A.w.eval(`GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=2;}); GFS.done=true; GFS.i=GF_TOTAL; gfSave(); gfRender();`);
  await until(()=>A.w.eval('GFS.sent===true'));   // v10.54.2: sent by itself
  const sub2=calls.filter(x=>x.op==='submit').pop();
  c('submit carries email, emailOk, minor:false', [sub2.email,sub2.emailOk,sub2.minor], ['ana@example.org',true,false]);
  // v10.50.0 — the pastor (6 Oct 2026): "why would a member send me a code? Don't need that": no code to copy; the answers wait on the phone.
  c('no server: no code to copy, no Send; the note says the answers are saved and to open the link again', await (async()=>{ const N=page(`https://pastorshub.org/#gifts=.${link}`,{server:false});
    await until(()=>N.w.document.getElementById('gfstart'));
    const member=N.w.eval('GF_VIEW')==='take'&&!N.w.document.getElementById('gfbackr');
    N.w.eval(`GFS.minor=false; GIFTS.forEach(g=>{GFS.a[g.id+'.0']=3;}); GFS.done=true; GFS.i=GF_TOTAL; gfRender();`);
    return member&&!N.w.document.getElementById('gfcopy')&&!N.w.document.getElementById('gfcodebox')&&!N.w.document.getElementById('gfsend')&&/saved on this phone\. Open your church’s link again/.test(N.w.document.getElementById('gfsendnote').textContent)&&N.w.document.getElementById('gfemail')===null; })(), true);

  const Q=page('https://pastorshub.org/#gifts-confirm=AAAAAAAAAAAA.BBBBBBBBBBBB.CCCCCCCCCCCCCCCCCCCCCCCC',{lang:'es',peek:{ok:true,first:'María',gifts:['mercy','hosp','nope'],church:'Iglesia Central',lang:'es'}});
  await until(()=>Q.w.document.getElementById('gfobsend'));
  const QT=Q.w.document.getElementById('giftbody').textContent;
  c('observer page from a stubbed peek, in Spanish', [/María le pide que diga con sinceridad/.test(QT),/Misericordia/.test(QT),/Hospitalidad/.test(QT),/No he visto lo suficiente/.test(QT),Q.w.document.querySelectorAll('.gfobq').length], [true,true,true,true,2]);
  c('the church is named', /Iglesia Central/.test(QT), true);

  const errsAll=[...P.errs,...PS.errs,...M.errs,...O.errs,...R.errs,...A.errs,...Q.errs];
  c('no page errors anywhere', errsAll, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
