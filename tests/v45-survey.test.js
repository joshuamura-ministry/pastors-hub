// v10.45.0 — the integrator's checks (DESIGN-SURVEY §3.6, §7.1, §7.2, §8): the six stamps; nothing Pennsylvania-only where the page
// shows it nationwide (the rules' own ideas, the five built-ins and their steps, Community resources) or in the Idea Library (the 14
// ideas that named Pennsylvania, CareerLink or a "PA"); the writers' validator says so (an error; township and borough a REVIEW line);
// and the golden outputs: the keys of the five built-ins that changed differ ONLY because of those words (the old words put back in a
// copy of the page give v10.44.1's hashes again), every other key is v43-ongoing-golden's, unchanged.
// Written failing-first against v10.44.1.
const fs=require('fs'), path=require('path'), os=require('os'), crypto=require('crypto');
const {spawnSync}=require('child_process');
const {JSDOM,VirtualConsole}=require('jsdom');
const {ROOT,HTML,FX,checker,sleep}=require('./v45-helpers.js');
const T=checker(), c=T.c;
// as the validator reads them: "PA" and "COMPASS" in capitals only ("a moral compass", Spanish "pa" are fine)
const PAX=[/\b(PA|COMPASS)\b/,/\b(pennsylvania|pensilvania|careerlink|penn state|pa 211)\b/i], PA={test:t=>PAX.some(r=>r.test(t))}, TB=/\b(townships?|boroughs?)\b/i;
const PAS=`(t=>/\\b(PA|COMPASS)\\b/.test(t)||/\\b(pennsylvania|pensilvania|careerlink|penn state|pa 211)\\b/i.test(t))`;
// the golden keys of the five built-ins as v10.44.1 hashed them (tests/v43-ongoing-golden.json at v10.44.1)
const GOLD_1044={"lot-market|board|options|en":"13e0ba9b0b34e039ac8bf26eaa573ac565223dc0","lot-market|finance|options|en":"ae93f2eef6182220dd4d05da4f46784c52d8566d","lot-market|community|options|en":"c79337fd8dfa6b2527e930faa9a4d7f2af154107","lot-market|congregation|options|en":"eb7d752da3e49e68ff397d7c635600f04b3c4bbd","lot-market|board|fixed|en":"73d34bc46c0d25f79330a3deac837d393d2644d4","lot-market|congregation|fixed|en":"e810ba65c24a7ffa7eceb85fa3e87eb64302a6b0","garden|board|options|en":"72aff999e89376865683aa6d3b0c9e24bb03eca9","garden|finance|options|en":"e98ccc007d726d968c3c949e94997721d6046e5d","garden|community|options|en":"a85c701ec1eb133452f36375696fd990de554bfe","garden|congregation|options|en":"299a4330fd69bf17c8d03f96c543017a6cf68ef4","garden|board|fixed|en":"1581557f3cb459cab04f12743f408ddbac28c733","garden|congregation|fixed|en":"7b140d31c24a7639f5ad6406de9166242701ed35","skills-center|board|options|en":"a8fe4ff85d4415720a43a0e6dc5bd2c02c8829ae","skills-center|finance|options|en":"1cee2e75c08b049e4f9cb9feb6feba4e0bd2b704","skills-center|community|options|en":"21d762d49217cc17218136ea43c8bd33c0793663","skills-center|congregation|options|en":"96031d32764372a2f4e538ae910b7f7e9b30e1ae","skills-center|board|fixed|en":"038b0a973aa40ee356e50041a59346873a0ded49","skills-center|congregation|fixed|en":"5a3416810aec28a0f916917add452c05b3fd35c5","noticeboard|board|options|en":"1a3c207914695b5152d2cab2c8afeed08dab3f34","noticeboard|finance|options|en":"b92fc748b7e23a47b8f6d67cf03258097f201c9d","noticeboard|community|options|en":"68cdfb178c2ffb98f03f9c56b2527088de269aa7","noticeboard|congregation|options|en":"7547afac806200dcf54844130cd6fb822b4238d3","noticeboard|board|fixed|en":"a3c65e04a488b6c8206f33c736979360ef52f99f","noticeboard|congregation|fixed|en":"a2cefc2f7d0cfd15b60826dad2174a478c6e2e03","bench|board|options|en":"c1c23115f3a93fa64fe2a895640f1dfd42a60986","bench|finance|options|en":"f32e8253bd0b5610ecce0e4528e711d0fef49b29","bench|community|options|en":"c03b0855b97f304d9abc93e80f3aa0aa5d9facbd","bench|congregation|options|en":"42e496a9baa360949108d53f13513c4f4f5d1329","bench|board|fixed|en":"0fc493f709550f37eca01f0f3099843af0c62196","bench|congregation|fixed|en":"e345ef8b65ac5064952356f956426b7e30153486","noticeboard|board|options|es":"d71a3c90320975290cad1addce2536f8c2945de6","noticeboard|community|options|es":"d2ca0a7265040b1730b456e96ff6a2e8e2199af0"};
// the words v10.45.0 replaced, put back (§3.6): the built-ins' partners and description, and their steps
const OLD_WORDS=`(()=>{ const S=id=>SIGNATURE.find(x=>x.id===id);
  S('garden').p='Penn State Extension master gardeners'; S('skills-center').p='Community college workforce division; PA CareerLink';
  S('lot-market').p='Township for permits; local growers and food trucks'; S('bench').p='The township, if it faces public sidewalk';
  S('noticeboard').d=S('noticeboard').d.replace('the town meeting nobody heard about','the township meeting nobody heard about');
  const fix=(id,i,a,b)=>{ HOW[id][i]=HOW[id][i].replace(a,b); if(S(id).how&&S(id).how!==HOW[id]) S(id).how[i]=S(id).how[i].replace(a,b); };
  fix('lot-market',0,'Check local rules on vending','Check township rules on vending'); fix('noticeboard',1,'Seed it: town meeting dates','Seed it: township meeting dates');
  fix('bench',1,'Check with the town or city if any part','Check with the township if any part');
  // the review round (5 Oct): three of the five are also priced now, and garden's watering "rota" is a "schedule": put back as well
  delete U_LINES_OWN['garden']; delete U_LINES_OWN['skills-center']; delete U_LINES_OWN['lot-market'];
  S('garden').d=S('garden').d.replace('a watering schedule','a watering rota'); })()`;
const NOW='2026-10-01T15:00:00', SEED=JSON.parse(fs.readFileSync(path.join(ROOT,'tests','average-church','seed-after.json'),'utf8'));
function gpage(lang){ const dom=new JSDOM(HTML,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),
  beforeParse(w){ const RD=w.Date, FIX=+new RD(NOW); class FD extends RD{ constructor(...a){ super(...(a.length?a:[FIX])); } static now(){ return FIX; } } w.Date=FD;
    w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
    for(const [k,v] of Object.entries(SEED)) if(!k.startsWith('_')) w.localStorage.setItem(k,JSON.stringify(v));
    if(lang) w.localStorage.setItem('terrain-lang',lang); w.fetch=()=>new Promise(()=>{}); }});
  const w=dom.window; w.eval(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; CAP=null; })()`); return w; }
const build=(w,id,group,timing)=>w.eval(`(()=>{ const G=CASE_GROUPS.find(z=>z.id===${JSON.stringify(group)}); const m=caseModel(${JSON.stringify(id)},{type:G.type,group:G.id},{timing:${JSON.stringify(timing)}});
  const d=caseDeck(m); return JSON.stringify({d,H:caseHandout(m,d,{}),Pz:caseProposal(m,d,{})}); })()`);
const sha=s=>crypto.createHash('sha1').update(s).digest('hex');

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the six stamps --');
  const v=(HTML.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1];
  // v10.45.1: the six must agree, whatever the release (was pinned to v10.45.0)
  c('one version in all six places', [v,(HTML.match(/TERRAIN {2}(v[\d.]+)/)||[])[1],(HTML.match(/data-version="([^"]+)"/)||[])[1],(HTML.match(/<title>Community Map — Terrain (v[\d.]+)<\/title>/)||[])[1],(HTML.match(/<span id="ver">([^<]+)<\/span>/)||[])[1],(HTML.match(/const VERSION = '([^']+)'/)||[])[1]],
    Array(6).fill(v));

  console.log('\n-- nothing Pennsylvania-only where the page shows it in every state --');
  const P=gpage('en'); await sleep(300);
  c('the rules\' own ideas (IDEAS): no Pennsylvania word, township or borough', P.eval(`JSON.stringify(Object.values(IDEAS).flat().map(i=>[i.n,i.d,i.p].join(' ')).filter(t=>${PAS}(t)||${TB}.test(t)))`), '[]');
  c('…their new words (an eviction notice in your state, the county extension office, the American Job Center, the town or county)',
    P.eval(`JSON.stringify([IDEAS.rent50.find(i=>/tenant/.test(i.n)).d.slice(0,58),IDEAS.snap.find(i=>/garden/i.test(i.n)).p,IDEAS.unemp.find(i=>/Job club/.test(i.n)).p,IDEAS.growth.find(i=>/developments/.test(i.n)).p])`),
    JSON.stringify(['One evening on what an eviction notice in your state looks','Your county extension office’s master gardeners','Your local American Job Center','The town or county planning office lists approved developments']));
  c('the five built-ins and their steps (garden, skills-center, lot-market, noticeboard, bench)', P.eval(`JSON.stringify(['garden','skills-center','lot-market','noticeboard','bench'].map(id=>{ const x=SIGNATURE.find(s=>s.id===id); return [x.n,x.d,x.p,...(HOW[id]||[])].join(' '); }).filter(t=>${PAS}(t)||${TB}.test(t)))`), '[]');
  c('…every built-in, every step', P.eval(`JSON.stringify(SIGNATURE.filter(x=>${PAS}([x.n,x.d,x.p,...(HOW[x.id]||[])].join(' '))||${TB}.test([x.n,x.d,x.p,...(HOW[x.id]||[])].join(' '))).map(x=>x.id))`), '[]');
  c('Community resources: the town, city and county offices; centers; the mayor or town manager', [/Town, city & county offices/.test(HTML),/Search: \$\{esc\(c\.short\)\} town or city hall/.test(HTML),/Town and county senior centers/.test(HTML),/fire chief, police chief and mayor or town manager/.test(HTML),/Township, borough & county offices|township manager|Township and (county|community) centres/.test(HTML)], [true,true,true,true,false]);
  { const m=/levels\.cousub=\{kind:'Town',name:nm,short:nm\.replace\((\/.+?\/i),''\)/.exec(HTML), re=m?new Function('return '+m[1])():null;
    c('the town\'s short name loses the Census\'s "CCD" (Florida, California, Texas…) as a township loses "Township": "Across Immokalee"',
      re?['Immokalee Ccd','San Jose Ccd','Warminster Township','Doylestown Borough','Bethel Park'].map(s=>s.replace(re,'')):null, ['Immokalee','San Jose','Warminster','Doylestown','Bethel Park']); }
  c('…its search still finds every kind of municipal office (city hall, town hall, township, borough)',/' "city hall" OR "town hall" OR township OR borough municipal office phone'/.test(HTML), true);

  console.log('\n-- nothing Pennsylvania-only in the Idea Library --');
  const SRC=path.join(ROOT,'tools','ideas-src');
  const lib=fs.readdirSync(path.join(SRC,'themes')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(SRC,'themes',f),'utf8')).ideas);
  const words=x=>[x.en.n,x.en.d,...x.en.how,x.es.n,x.es.d,...x.es.how,x.partner?x.partner.en+' '+x.partner.es:''].join(' \n ');
  c('no idea names Pennsylvania, Pensilvania, CareerLink, Penn State, PA 211, COMPASS or a "PA" (EN + ES)', lib.filter(x=>PA.test(words(x))).map(x=>x.id), []);
  const FOURTEEN=['creation-care-state-spring-cleanup','creation-care-street-trees','education-tutor-training-safe','fellowship-heritage-lunch-each-quarter','health-radon-test-kits','schools-clearances-night',
    'transport-teen-driving-hours-parents','education-ged-study-nights','education-digital-basics-working-age','education-math-for-the-trades','education-laptop-lending-semester',
    'education-returning-adult-scholarship','education-clep-study-nights','music-arts-cafe-open-mic'];
  c('…the fourteen that did are written for any state, and still ship', FOURTEEN.filter(id=>{ const x=lib.find(y=>y.id===id); return !x||PA.test(words(x)); }), []);
  c('…"your state\'s clearances", "the local American Job Center", "a small speaker system"', [/your state's clearances/.test(words(lib.find(x=>x.id==='education-tutor-training-safe'))),/the local American Job Center/.test(words(lib.find(x=>x.id==='education-ged-study-nights'))),/a small speaker system/.test(words(lib.find(x=>x.id==='music-arts-cafe-open-mic')))], [true,true,true]);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'terrain-pa-'));
  try{
    const ex=JSON.parse(fs.readFileSync(path.join(SRC,'examples.json'),'utf8')).ideas[0];
    const one=(name,f)=>{ const x=JSON.parse(JSON.stringify(ex)); f(x); const file=path.join(tmp,name+'.json'); fs.writeFileSync(file,JSON.stringify({theme:x.theme,ideas:[x]}));
      const r=spawnSync(process.execPath,[path.join(SRC,'validate.mjs'),'--ideas-only',file],{encoding:'utf8'}); return {code:r.status,out:r.stdout||''}; };
    let r=one('pa',x=>{ x.en.how[2]='Learn the clearances Pennsylvania asks of every school volunteer before the first visit.'; });
    c('the validator: "Pennsylvania" is an error', [r.code,/ERROR .*Pennsylvania-only word "Pennsylvania"/.test(r.out)], [1,true]);
    r=one('careerlink',x=>{ x.es.how[2]='Deje tarjetas en CareerLink y en la biblioteca cada mes, con el horario del grupo.'; });
    c('…"CareerLink" in the Spanish too', [r.code,/Pennsylvania-only word "CareerLink"/.test(r.out)], [1,true]);
    r=one('township',x=>{ x.en.how[2]='Ask the township office where the cards may be left, and leave them only there.'; });
    c('…"township" a REVIEW line (the file still passes)', [r.code,/REVIEW .*"township" is a Pennsylvania word for a town/.test(r.out)], [0,true]);
  }finally{ fs.rmSync(tmp,{recursive:true,force:true}); }

  console.log('\n-- the golden outputs: changed only by these words --');
  const G=JSON.parse(fs.readFileSync(path.join(ROOT,'tests','v43-ongoing-golden.json'),'utf8')).hash;
  const pages={en:gpage('en'),es:gpage('es')}; await sleep(400);
  const VER=pages.en.eval('VERSION'), asBase=s=>s.split(`"version":"${VER}"`).join('"version":"v10.42.1"');
  const now={}, changed=[];
  for(const k of Object.keys(GOLD_1044)){ const [id,g,t,l]=k.split('|'); now[k]=sha(asBase(build(pages[l],id,g,t))); if(now[k]!==GOLD_1044[k]) changed.push(k); }
  c('the golden file holds today\'s outputs for these keys (re-written for them only)', Object.keys(GOLD_1044).filter(k=>G[k]!==now[k]), []);
  // the review round: garden, skills-center and lot-market are priced at their source now (U_LINES_OWN), so their slides change too
  c(`${changed.length} keys changed, all five ideas (their Pennsylvania words; three of them priced since the review round)`, [...new Set(changed.map(k=>k.split('|')[0]))].sort(), ['bench','garden','lot-market','noticeboard','skills-center']);
  for(const w of Object.values(pages)) w.eval(OLD_WORDS);
  c('…put the old words (and the old allowance) back in a copy of the page, and every one of the 32 is v10.44.1\'s hash again', Object.keys(GOLD_1044).filter(k=>{ const [id,g,t,l]=k.split('|'); return sha(asBase(build(pages[l],id,g,t)))!==GOLD_1044[k]; }), []);
  c('the golden file keeps its 535 keys; v43-ongoing-golden holds every one, and its header lists each re-written on purpose', [Object.keys(G).length,/the golden keys re-written on purpose/.test(fs.readFileSync(path.join(ROOT,'tests','v43-ongoing-golden.test.js'),'utf8'))], [535,true]);
}); T.done(); })();
