// v10.40.0 — accuracy and loose ends, against the whole app in jsdom.
//
//  1. Scripture verbatim everywhere: every Scripture string in index.html (the survey's
//     SCRIPTURE / SCRIPTURE_ES, Make the Case's CASE_QUOTES and CASE_VERSES, the Spiritual
//     Gifts' GF_DEEP / GF_VERSES / GF_VERSE_SET and their Spanish) is held to the passage as
//     Bible Gateway prints it (tests/scripture-bg.json, fetched 29 Sep 2026; KJV and RVA 1909).
//     Words left out are marked with an ellipsis, at either end or inside; the reference is the
//     page's own. A quoted reference anywhere in index.html must be one of the checked texts.
//  2. Ellen White, EGW.faith: Welfare Ministry p. 45 (not The Desire of Ages p. 503), and its
//     published Spanish (El Ministerio de la Bondad p. 49) in Spanish.
//  3. The nine groups' own verses are in the verse library and each group's verse reaches its
//     deck, on the first of its home slides (in order) with room, the same in English and Spanish.
//  4. "Who already serves here": one Overpass request for every category (seniors, clinics,
//     family and social services, newcomers and language, youth, libraries and community
//     centres, as well as food, housing and recovery), 3 miles; never schools, playgrounds,
//     childcare, private or academic libraries, event halls; each place mapped to the needs it
//     serves; the survey lists them; the place slide names the most relevant first, with the
//     distance, and never calls them "our partners".
//  5. A church surveyed with "Use my location" is remembered (its coordinates and the Census's
//     name for the place) and reloads quietly like any other.
//  6. The "I'm in" slide: once a member answers, the answers not picked keep only their names.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
const BG=require('./scripture-bg.json').passages;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }

/* ---- the verbatim rule (the research library's, strict at both ends) ---- */
const ELL='…';
const bgKey=r=>{ r=r.replace(/–/g,'-').replace(/, /g,'-'); return r==='3 John 2'?'3 John 1:2':r; };
// typographic only: the RVA prints a chapter's first word in capitals ("AMADOS")
const opening=p=>{ const m=/^([A-ZÁÉÍÓÚÑ]{2,})(?=[\s,;:.])/.exec(p); return m?m[1].charAt(0)+m[1].slice(1).toLowerCase()+p.slice(m[1].length):p; };
function verbatim(text,printed){
  printed=opening(printed);
  const t=text.replace(/\.\.\./g,ELL), pieces=t.split(ELL).map(s=>s.trim()).filter(Boolean);
  let pos=0, first=null, end=null;
  for(const f of pieces){ const i=printed.indexOf(f,pos); if(i<0) return 'not word for word: "'+f+'"'; if(first===null) first=i; pos=end=i+f.length; }
  const lead=t.startsWith(ELL), trail=t.endsWith(ELL), rest=printed.slice(end).trim();
  if(first>0&&!lead) return 'words left out at the start, no ellipsis';
  if(first===0&&lead) return 'an ellipsis where nothing is left out (start)';
  if(rest&&!trail) return 'words left out at the end, no ellipsis';
  if(!rest&&trail) return 'an ellipsis where nothing is left out (end)';
  return null;
}

/* ---- a page with the fixture survey, as case-verses.test.js sets it up ---- */
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor',synced:true,tok:'r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32)};
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const net={census:[],overpass:[]};
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(o.reg) w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.store) w.localStorage.setItem('terrain-churches-v1',o.store);
      if(o.session) w.sessionStorage.setItem('terrain-tool',o.session);
      if(o.here) Object.defineProperty(w.navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>setTimeout(()=>ok({coords:{latitude:o.here[0],longitude:o.here[1]}}),5)}});
      w.fetch=o.fetch?(u,opt)=>o.fetch(String(u),opt||{},net):async(u)=>{ if(/advise/.test(String(u))) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,net,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body)});
function acs(url){
  const u=new URL(url), get=u.searchParams.get('get')||'';
  const vars=get.startsWith('group(')?['NAME','B05006_001E','B05006_002E']:get.split(',');
  const val=v=>v==='NAME'?'Census Tract 1016.03; Bucks County; Pennsylvania':v==='B01002_001E'?'41.2':v==='B19013_001E'?'72000':v==='B19083_001E'?'0.42':/_001E$/.test(v)?'5000':/M$/.test(v)?'40':'100';
  return [vars,vars.map(val)];
}
// The Census geocoder's answer to a point: geographies only, and the point asked about under input
const GEO_PT=(x,y)=>({result:{input:{location:{x,y}},geographies:{
  'Census Tracts':[{NAME:'Census Tract 1016.03',TRACT:'101603',STATE:'42',COUNTY:'017'}],
  'Counties':[{NAME:'Bucks County',STATE:'42',COUNTY:'017'}],
  'County Subdivisions':[{NAME:'Warminster township',COUSUB:'80952',STATE:'42',COUNTY:'017'}],
  'States':[{NAME:'Pennsylvania',STATE:'42',STUSAB:'PA'}]}}});
const ADDR='10 GREENE RD, WARMINSTER, PA, 18974';
const GEO_ADDR={result:{addressMatches:[{matchedAddress:ADDR,coordinates:{x:-75.09,y:40.2},geographies:GEO_PT(0,0).result.geographies}]}};

(async()=>{ try{
  const P=page();
  await until(()=>P.E('typeof caseModel==="function"&&typeof uCatalog==="function"'),8000);
  const E=P.E, JE=P.J;
  c('no boot errors', P.errs, []);

  console.log('-- 1. Scripture verbatim, against Bible Gateway (KJV / RVA 1909) --');
  const T=JE(`(()=>{ const o=[]; const add=(table,key,lang,text,ref,enref)=>o.push({table,key,lang,text,ref,enref});
    for(const k in SCRIPTURE){ add('SCRIPTURE',k,'en',SCRIPTURE[k][0],SCRIPTURE[k][1],SCRIPTURE[k][1]); if(SCRIPTURE_ES[k]) add('SCRIPTURE_ES',k,'es',SCRIPTURE_ES[k][0],SCRIPTURE_ES[k][1],SCRIPTURE[k][1]); }
    CASE_QUOTES.filter(q=>q.kind==='kjv').forEach(q=>{ add('CASE_QUOTES',q.id,'en',q.en,q.ref.en,q.ref.en); add('CASE_QUOTES',q.id,'es',q.es,q.ref.es,q.ref.en); });
    CASE_VERSES.forEach(v=>{ add('CASE_VERSES',v.id,'en',v.en.text,v.en.ref,v.en.ref); add('CASE_VERSES',v.id,'es',v.es.text,v.es.ref,v.en.ref); });
    // v56 (the purchase path, 2 Oct 2026): its own verified library, held to the same record (its 13 new passages fetched into scripture-bg.json)
    if(typeof PURCHASE_VERSES!=='undefined') PURCHASE_VERSES.forEach(v=>{ add('PURCHASE_VERSES',v.id,'en',v.en.text,v.en.ref,v.en.ref); add('PURCHASE_VERSES',v.id,'es',v.es.text,v.es.ref,v.en.ref); });
    for(const k in GF_DEEP){ add('GF_DEEP',k,'en',GF_DEEP[k].v[0],GF_DEEP[k].v[1],GF_DEEP[k].v[1]); if(GF_DEEP_ES[k]&&GF_DEEP_ES[k].v) add('GF_DEEP_ES',k,'es',GF_DEEP_ES[k].v[0],GF_DEEP_ES[k].v[1],GF_DEEP[k].v[1]); }
    [['GF_VERSES',GF_VERSES,GF_VERSES_ES],['GF_VERSE_SET',GF_VERSE_SET,GF_VERSE_SET_ES]].forEach(([n,A,B])=>A.forEach((v,i)=>{ add(n,i,'en',v[0],v[1],v[1]); add(n+'_ES',i,'es',B[i][0],B[i][1],v[1]); }));
    return o; })()`);
  const tables=[...new Set(T.map(x=>x.table))];
  // v56 (not a regression): the purchase path's verse library is one more Scripture table, read and checked like the others
  c('every Scripture table is read (English and Spanish)', tables, ['SCRIPTURE','SCRIPTURE_ES','CASE_QUOTES','CASE_VERSES','PURCHASE_VERSES','GF_DEEP','GF_DEEP_ES','GF_VERSES','GF_VERSES_ES','GF_VERSE_SET','GF_VERSE_SET_ES']);
  c(`${T.length} texts, every one's passage in the Bible Gateway record`, T.filter(x=>!BG[bgKey(x.enref)]).map(x=>x.table+'.'+x.key), []);
  c('every text is word for word what Bible Gateway prints, each omission marked', T.map(x=>{ const b=BG[bgKey(x.enref)]; const why=b?verbatim(x.text,b[x.lang==='en'?'KJV':'RVA'].text):'no record'; return why?`${x.table}.${x.key} [${x.lang}] ${why}`:null; }).filter(Boolean), []);
  c('every reference is the page’s own (English KJV, Spanish RVA)', T.filter(x=>{ const b=BG[bgKey(x.enref)]; const h=b[x.lang==='en'?'KJV':'RVA'].heading; const n=s=>s.replace(/–/g,'-').replace(/, /g,'-'); return n(x.ref)!==n(h); }).map(x=>x.table+'.'+x.key+' '+x.ref), []);
  { // a quoted reference anywhere in the page is one of the texts checked above
    const books=[...new Set(Object.values(BG).flatMap(p=>[p.KJV.heading,p.RVA.heading]).map(h=>h.replace(/ \d+(:\d+(-\d+)?)?$/,'')))].sort((a,b)=>b.length-a.length).map(b=>b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    const re=new RegExp(`['"](?:${books.join('|')}) \\d+(?::\\d+(?:(?:\\\\u2013|[–-]|, )\\d+)?)?['"]`,'g');
    const seen=[...new Set((html.match(re)||[]).map(s=>s.slice(1,-1).replace(/\\u2013/g,'–')))];
    const known=new Set(T.map(x=>x.ref));
    c(`every quoted Scripture reference in index.html (${seen.length}) is checked here`, seen.filter(r=>!known.has(r)), []); }
  c('Nehemiah 2:17, 18 reads "Then said I unto them" (KJV), and the Spanish opens "Díjeles pues:"', [JE('SCRIPTURE.case[0]').slice(0,21),JE('SCRIPTURE_ES.case[0]').slice(0,13)], ['Then said I unto them','Díjeles pues:']);
  c('Isaiah 58:7 in Spanish is the whole verse ("metas en casa;" … "de tu carne?")', JE('SCRIPTURE_ES.housing[0]'), '¿No es que partas tu pan con el hambriento, y á los pobres errantes metas en casa; que cuando vieres al desnudo, lo cubras, y no te escondas de tu carne?');
  c('a line that starts inside a verse keeps the verse’s own case after the ellipsis', [JE('GF_DEEP.leader.v[0]'),JE('GF_DEEP_ES.helps.v[0]')], ['...he that ruleth, with diligence...','...ayudas, gobernaciones, géneros de lenguas.']);
  c('the survey’s section verse draws the corrected text', /habitation…/.test(E(`verseHTML('people')`)), true);

  { // v10.40 review: a verse quoted inside an Idea Library idea (tools/ideas-src, the writers' source) is held
    // to the same record. One was in a modern translation ("The Lord bless you and keep you", Numbers 6:24),
    // one lowercased the RVA's "Nuestro" and left the superscription out unmarked (Psalm 46:1).
    const dir=path.resolve(__dirname,'..','tools','ideas-src','themes');
    const ideas=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).ideas);
    const fold=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/^salmo /,'salmos ').replace(/^psalms /,'psalm ');
    const byRef=new Map(); Object.entries(BG).forEach(([k,p])=>{ byRef.set(fold(p.KJV.heading),k); byRef.set(fold(p.RVA.heading),k); byRef.set(fold(k),k); });
    const refRe=/((?:[1-3] )?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+) (\d{1,3}):(\d{1,3})/g;
    const found=[], loose=[];
    ideas.forEach(x=>['en','es'].forEach(L=>{ const T=x[L]; [T.n,T.d,...T.how].forEach(t=>{
      for(const m of t.matchAll(/“([^”]{6,})”|«([^»]{6,})»|"([^"]{6,})"/g)){
        const q=m[1]??m[2]??m[3], near=t.slice(Math.max(0,m.index-80),m.index+m[0].length+80);
        const refs=[...near.matchAll(refRe)].map(r=>byRef.get(fold(r[1]+' '+r[2]+':'+r[3]))).filter(Boolean);
        if(refs.length) found.push({id:x.id,L,q,key:refs[0]});
        else if(/\bLORD\b|Jehová|\b(thee|thou)\b/.test(q)) loose.push(x.id+' '+L+': '+q); } }); }));
    // the RVA prints a chapter's opening word in capitals, after any superscription ("DIOS"); a quotation set
    // inside a sentence drops the verse's own final stop or colon
    const lib=(q,printed)=>{ printed=printed.replace(/\b([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ]{2,})\b(?=[\s,;:.])/,(m,a,b)=>/^(LORD|GOD)$/.test(m)?m:a+b.toLowerCase());
      const t=q.trim().replace(/[,.;:]+$/,'').replace(/\.\.\./g,ELL), pieces=t.split(ELL).map(s=>s.trim()).filter(Boolean);
      let pos=0, first=null, end=null;
      for(const f of pieces){ const i=printed.indexOf(f,pos); if(i<0) return 'not word for word: "'+f+'"'; if(first===null) first=i; pos=end=i+f.length; }
      const rest=printed.slice(end).trim();
      if(first>0&&!t.startsWith(ELL)) return 'words left out at the start, no ellipsis';
      if(first===0&&t.startsWith(ELL)) return 'an ellipsis where nothing is left out';
      if(rest&&!/^[.,;:!?]+$/.test(rest)&&!t.endsWith(ELL)) return 'words left out at the end, no ellipsis';
      return null; };
    c('the Idea Library quotes three verses, each with its reference: Numbers 6:24, Psalm 46:1, Proverbs 17:22', [...new Set(found.map(f=>f.key))].sort(), ['Numbers 6:24','Proverbs 17:22','Psalm 46:1']);
    c('…each word for word from Bible Gateway (KJV / RVA 1909), every omission marked', found.map(f=>{ const why=lib(f.q,BG[f.key][f.L==='en'?'KJV':'RVA'].text); return why?`${f.id} [${f.L}] ${why}`:null; }).filter(Boolean), []);
    c('…and no Scripture-sounding quotation (LORD, Jehová, thee, thou) without a reference to check it against', loose, []); }

  console.log('\n-- 2. Ellen White: EGW.faith is Welfare Ministry, p. 45 --');
  c('the words are unchanged, the credit is Welfare Ministry, p. 45', JE('EGW.faith'), ['Our neighbors are not merely our associates and special friends; they are not simply those who belong to our church, or who think as we do. Our neighbors are the whole human family.','Ellen G. White · Welfare Ministry, p. 45']);
  c('in Spanish: the published El Ministerio de la Bondad, p. 49', JE('EGW_ES.faith[1]'), 'Elena G. de White · El Ministerio de la Bondad, p. 49');
  c('…drawn in Spanish only in Spanish; a quote with no checked Spanish stays in English', [E(`(()=>{ const p=LANG; LANG='es'; try{ return egwHTML('faith'); }finally{ LANG=p; } })()`).includes('Nuestros prójimos son toda la familia humana.'),E(`egwHTML('faith')`).includes('Welfare Ministry, p. 45'),E(`(()=>{ const p=LANG; LANG='es'; try{ return egwHTML('case'); }finally{ LANG=p; } })()`).includes('Open your eyes')], [true,true,true]);
  c('"The Desire of Ages, p. 503" is no longer credited to these words anywhere', /whole human family\.',\s*'Ellen G\. White \\u00b7 The Desire of Ages, p\. 503'/.test(html), false);

  console.log('\n-- 3. every group’s own verse reaches its deck --');
  const NOW=Date.UTC(2026,8,28,15);
  const D0=JSON.parse(JSON.stringify(FX.DATA));
  D0.M.tract.moe=JE('CASE_SAMPLE.M.tract.moe'); D0.M.county.moe=JE('CASE_SAMPLE.M.county.moe');
  Object.assign(D0.M.tract,{age5_9:420,age10_14:395,age15_17:236,famKids:862,employed:2610,seniors:540});
  D0.geo=Object.assign({},D0.geo,{coords:{x:-75.1,y:40.2}});
  E('DATA='+JSON.stringify(D0)+';SCOPE="tract"; HELP=null; HELP_STATE="idle"; ZONES=null; ZONES_STATE="idle";');
  E('uChurch().name="Bucks County SDA"; CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+');');
  E(`(()=>{ const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
    const P=(i,name,b,h)=>({id:'m'+i,name,gifts:mk(b),heart:h,confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual'});
    uChurch().members=[P(0,'Ana Lopez',['teach','shep','creative','helps'],{children:2,families:2}),P(1,'Ben Carter',['teach','shep','encour'],{children:1}),
      P(2,'Cara Diaz',['teach','creative','helps','mercy'],{}),P(3,'Dan Evans',['admin','leader','giving'],{poor:2}),P(4,'Eve Fox',['mercy','helps','serve','hosp'],{poor:2,families:1})];
    uPersist(); })()`);
  const NINE=['1pet5_2','1cor4_2','acts6_3','deut31_12','prov31_20','prov27_17','heb13_2','eccl11_6','rom16_5'];
  c('the nine are in the library, word for word the groups’ own (CASE_QUOTES), and in no plan list', JE(`${JSON.stringify(NINE)}.map(id=>{ const v=CASE_VERSES.find(x=>x.id===id), q=CASE_QUOTES.find(x=>x.id===id);
    return !!v&&v.en.text===q.en&&v.es.text===q.es&&v.en.ref===q.ref.en&&v.es.ref===q.ref.es&&!Object.values(CASE_VERSE_PLAN.byJob).flat().includes(id)&&!Object.values(CASE_VERSE_PLAN.byNeed).flat().includes(id)&&JSON.stringify(v.jobs)===JSON.stringify(CASE_VERSE_HOME[id]); })`), NINE.map(()=>true));
  { const R=JE(`(()=>{ const out=[]; const V={}; CASE_VERSES.forEach(v=>{ V[v.en.text]=v.id; V[v.es.text]=v.id; });
      for(const G of CASE_GROUPS) for(const id of ['food-pantry','pathfinders','lift-rota','interpreter-bank']) for(const lang of ['en','es']){
        const m=caseModel(id,{type:G.type,group:G.id},{lang,now:${NOW},respond:true}); if(!m.ok) continue; const d=caseDeck(m);
        const ids=d.slides.map(s=>s.type==='verse'?V[s.text]:(s.verse?V[s.verse.text]:null));
        // v10.42 part 3 (DESIGN.md N7): How it works draws on Ecclesiastes 11:6 first ("sow thy seed…"), the literature ministry's verse, for every deck
        const own=ids.map((x,k)=>d.slides[k].type==='how'&&x==='eccl11_6'?null:x);
        const at=ids.indexOf(G.verse);
        out.push({g:G.id,id,lang,v:G.verse,at:at>=0?d.slides[at].type:null,dup:ids.filter(Boolean).length!==new Set(ids.filter(Boolean)).size,
          foreign:own.some(x=>${JSON.stringify(NINE)}.includes(x)&&x!==G.verse)}); }
      return out; })()`);
    c(`every group’s own verse is on a slide of its deck (${R.length} decks, EN and ES)`, R.filter(r=>!r.at).map(r=>r.g+'/'+r.id+'/'+r.lang), []);
    c('…never twice in a deck, and one group’s new verse never on another group’s deck', [R.filter(r=>r.dup).length,R.filter(r=>r.foreign).length], [0,0]);
    const at=g=>[...new Set(R.filter(r=>r.g===g&&r.id==='food-pantry').map(r=>r.at))];
    // v10.42 part 3: the opening carries the goal and holds a verse of a line or two beside it (measured in Chrome, the longer language),
    // so a group's own verse too long for it goes on its next home, or the first slide that holds it (who is able, the answers)
    c('…each on its best slide: elders, finance, nominating, men, literature, small groups, hospitality', [at('elders'),at('finance'),at('nominating'),at('mens'),at('literature'),at('smallgroups'),at('hospitality')],
      [['ability'],['capacity'],['ability'],['roles'],['timeline'],['motion'],['yes']]);
    c('…and the two that had lost theirs (family, church school), and the congregation’s "Let us rise up and build" on the "I’m in" slide', [at('family'),at('school'),at('congregation')], [['motion'],['ability'],['yes']]);
    c('…the same slide in English and in Spanish', R.filter(r=>r.lang==='en').every(r=>R.find(x=>x.lang==='es'&&x.g===r.g&&x.id===r.id).at===r.at), true); }

  console.log('\n-- 4. who already serves here --');
  const cat=t=>JE(`helpCatOf(${JSON.stringify(t)})`);
  c('each kind of place in its category', [
      cat({amenity:'food_bank'}),cat({social_facility:'outreach','social_facility:for':'homeless'}),cat({healthcare:'rehabilitation'}),
      cat({social_facility:'outreach','social_facility:for':'migrant;refugee'}),cat({social_facility:'assisted_living','social_facility:for':'senior'}),cat({amenity:'community_centre',community_centre:'senior_centre'}),
      cat({amenity:'community_centre',community_centre:'youth_centre'}),cat({club:'scout'}),cat({leisure:'sports_centre',name:'Central Bucks Family YMCA'}),
      cat({social_facility:'outreach'}),cat({office:'government',government:'social_services'}),cat({amenity:'clinic'}),
      cat({amenity:'library'}),cat({amenity:'community_centre'}),cat({amenity:'townhall'}),cat({amenity:'police'})],
    [{cat:'food'},{cat:'housing'},{cat:'recovery'},{cat:'language'},{cat:'seniors'},{cat:'seniors'},{cat:'youth'},{cat:'youth'},{cat:'youth'},{cat:'family'},{cat:'family'},{cat:'health'},
     {cat:'library',sub:'library'},{cat:'library',sub:'community'},{cat:'civic'},{cat:'honour'}]);
  c('never a school, playground or childcare; never a school’s, college’s or private library; never an events or church hall', [
      cat({amenity:'school'}),cat({leisure:'playground'}),cat({amenity:'kindergarten'}),cat({amenity:'childcare'}),
      cat({amenity:'library',name:'Log College Middle School Library'}),cat({amenity:'library',library:'university'}),cat({amenity:'library',access:'private'}),
      cat({amenity:'community_centre',community_centre:'events_venue'}),cat({amenity:'community_centre',community_centre:'church_hall'}),cat({leisure:'sports_centre',name:'Warminster Tennis Club'})],
    [null,null,null,null,null,null,null,null,null,null]);
  { const el=(id,lat,lon,tags,way)=>way?{type:'way',id,center:{lat,lon},tags}:{type:'node',id,lat,lon,tags};
    const ELS=[el(1,40.205,-75.09,{amenity:'food_bank',name:'Warminster Community Food Bank'}),
      el(2,40.203,-75.1,{amenity:'library',name:'Warminster Township Free Library'},true),
      el(3,40.199,-75.1,{amenity:'library',name:'Log College Middle School Library'}),
      el(4,40.206,-75.1,{amenity:'community_centre',name:'Warminster Community Center'},true),
      el(5,40.21,-75.1,{amenity:'community_centre',community_centre:'events_venue',name:'Grand Ballroom'}),
      el(6,40.208,-75.105,{amenity:'social_facility',social_facility:'outreach','social_facility:for':'senior',name:'Warminster Senior Center'}),
      el(7,40.21,-75.11,{amenity:'clinic',name:'Bucks Community Health Center'}),
      el(8,40.212,-75.1,{amenity:'clinic'}),
      el(9,40.195,-75.095,{office:'government',government:'social_services',name:'Bucks County Children and Youth'}),
      el(10,40.19,-75.1,{amenity:'social_facility',social_facility:'outreach','social_facility:for':'migrant;refugee',name:'Newcomer Welcome Center'}),
      el(11,40.2,-75.12,{amenity:'community_centre',community_centre:'youth_centre',name:'Warminster Youth Center'}),
      el(12,40.21,-75.13,{leisure:'sports_centre',name:'Central Bucks Family YMCA'}),
      el(13,40.2,-75.2,{amenity:'library',name:'Far Away Library'}),
      el(14,40.201,-75.1,{amenity:'townhall',name:'Warminster Township Building'}),
      el(15,40.202,-75.1,{amenity:'fire_station',name:'Warminster Fire Department'}),
      el(16,40.203,-75.1,{amenity:'school',name:'Willow Dale Elementary School'})];
    E(`window.__ov=[]; window.fetch=async(u)=>{ u=String(u); if(/overpass|interpreter/.test(u)){ window.__ov.push(decodeURIComponent(u.split('data=')[1]||'')); return {ok:true,status:200,json:async()=>(${JSON.stringify({elements:ELS})})}; } return new Promise(()=>{}); };`);
    const rows=JSON.parse(JSON.stringify(await P.w.eval(`fetchHelp({lat:40.2,lon:-75.1},3)`)));
    const ov=JE('window.__ov');
    c('one Overpass request, 3 miles (4,827 m) round the church, a 15-second limit', [ov.length,/^\[out:json\]\[timeout:15\];\(/.test(ov[0]),(ov[0].match(/around:4827,40\.2,-75\.1\)/g)||[]).length>=20], [1,true,true]);
    c('…asking for each new kind of place', ['"social_facility:for"~"^(senior|elderly)"','"amenity"="clinic"','"social_facility"~"^(outreach|advice)$"','"social_facility:for"~"migrant|refugee|immigrant"','"community_centre"="youth_centre"','"amenity"="library"','"amenity"="community_centre"'].filter(s=>!ov[0].includes(s)), []);
    c('…and never for a school, playground or childcare', /"amenity"="(school|kindergarten|childcare)"|playground/.test(ov[0]), false);
    const got=JSON.parse(JSON.stringify(rows)).map(r=>[r.cat,r.sub||'',r.name]);
    c('the places listed, nearest first: each in its category, the school’s library, the ballroom, the unnamed clinic, the school and the one beyond 3 miles left out', got.map(r=>r[2]).sort(), ['Bucks Community Health Center','Bucks County Children and Youth','Central Bucks Family YMCA','Newcomer Welcome Center','Warminster Community Center','Warminster Community Food Bank','Warminster Fire Department','Warminster Senior Center','Warminster Township Building','Warminster Township Free Library','Warminster Youth Center']);
    c('…with their categories', Object.fromEntries(got.map(r=>[r[2],r[0]+(r[1]?'/'+r[1]:'')]).sort()), Object.fromEntries(Object.entries({'Warminster Community Food Bank':'food','Warminster Township Free Library':'library/library','Warminster Community Center':'library/community','Warminster Senior Center':'seniors','Bucks Community Health Center':'health','Bucks County Children and Youth':'family','Newcomer Welcome Center':'language','Warminster Youth Center':'youth','Central Bucks Family YMCA':'youth','Warminster Township Building':'civic','Warminster Fire Department':'honour'}).sort()));
    c('…sorted by distance, every one within 3 miles', [rows.every((r,i)=>!i||rows[i-1].dist<=r.dist),rows.every(r=>r.dist<=3.05)], [true,true]);
    // the survey's Community resources: every category, its mapped places with distances
    const host=P.D.createElement('div'); host.id='helpslot'; P.D.body.appendChild(host);
    P.w.__rows=rows; E(`HELP=window.__rows; HELP_STATE='ready'; HELP_LINKCTX={county:'Bucks County',short:'Warminster',state:'Pennsylvania',stateSlug:'pennsylvania'}; drawHelp();`);
    const groups=()=>P.qa('#helpslot details.suggroup').map(d=>[d.querySelector('summary').textContent.replace(/\s+/g,' ').trim(),[...d.querySelectorAll('.helprow b')].map(b=>b.textContent)]);
    const G=groups();
    c('the survey lists twelve kinds of help, the six new ones after housing', G.map(g=>g[0].replace(/\d+ links?( \+ map)?$/,'').replace(/^\S+ /,'').trim()),
      ['Food pantries & banks','Ministerial councils & fellow pastors','Homeless & housing services','Senior centres & services','Clinics & health centres','Social services & family support','Immigrant & language services','Youth & children’s organisations','Libraries & community centres','Township, borough & county offices','Honouring community leaders','Recovery, addiction & crisis']);
    c('…each new one with its mapped places (named, with the distance)', G.slice(3,9).map(g=>g[1]), [['Warminster Senior Center'],['Bucks Community Health Center'],['Bucks County Children and Youth'],['Newcomer Welcome Center'],['Warminster Youth Center','Central Bucks Family YMCA'],['Warminster Township Free Library','Warminster Community Center']]);
    c('…and the township offices and the fire station, fetched before but never listed, now are', [G[9][1],G[10][1]], [['Warminster Township Building'],['Warminster Fire Department']]);
    c('…a mapped row carries its distance in miles', /^\d+\.\d mi/.test(P.q('#helpslot .helprow span').textContent), true);
    c('…every new directory link is a real https address', JE(`HELP_CATS.filter(c=>['seniors','health','family','language','youth','library'].includes(c.id)).flatMap(c=>c.links(HELP_LINKCTX).map(l=>l.u)).filter(u=>!/^https:\\/\\/[a-z0-9.-]+\\.(gov|org|com)\\//.test(u))`), []);
    E(`LANG='es'; drawHelp();`);
    c('in Spanish: the new kinds of help by their Spanish names', groups().slice(3,9).map(g=>g[0].replace(/\d+ enlaces?( \+ mapa)?$/,'').replace(/^\S+ /,'').trim()), ['Centros y servicios para mayores','Clínicas y centros de salud','Servicios sociales y apoyo a familias','Servicios para inmigrantes y de idiomas','Organizaciones para jóvenes y niños','Bibliotecas y centros comunitarios']);
    E(`LANG='en'; HELP_AT={lat:40.2,lon:-75.1};`);
    // the place slide: the most relevant places first, then the nearest
    const partners=(id,type,group,lang)=>JE(`(()=>{ const m=caseModel('${id}',{type:'${type}',group:'${group}'},{lang:'${lang||'en'}',now:${NOW}}); return m.place.partners.map(p=>[p.name,p.kind,p.distText]); })()`);
    // v10.42.0 fix after review ("ALREADY SERVING HERE · WE COME ALONGSIDE Sampleton Township Free Library · Public library… names
    // partners that have nothing to do with a church club"): a children's club lists youth organisations only, nearest first
    c('a children’s club (Pathfinders): youth organisations only, nearest first; never the library, the community centre or the food bank', partners('pathfinders','team','youth'), [['Warminster Youth Center','Youth or children’s group','1.1 mi'],['Central Bucks Family YMCA','Youth or children’s group','1.7 mi']]);
    c('…in Spanish, its kinds in Spanish', partners('pathfinders','team','youth','es').map(p=>p[1]), ['Grupo para jóvenes o niños','Grupo para jóvenes o niños']);
    c('rides for older neighbours (lift rota): the senior centre first', partners('lift-rota','board','board')[0], ['Warminster Senior Center','Senior centre or care','0.6 mi']);
    // v10.42 part 3 (the relevance rule, relevance.json purposes.health.partners: health and recovery): a senior centre is not a health partner
    c('a blood-pressure clinic: the health centre (no senior centre: not a partner of its purpose)', partners('bp-clinic','board','board').map(p=>p[0]).slice(0,2), ['Bucks Community Health Center']);
    c('an interpreter bank: help for newcomers and the library', partners('interpreter-bank','board','board').map(p=>[p[0],p[1]]), [['Warminster Township Free Library','Public library'],['Warminster Community Center','Community centre'],['Newcomer Welcome Center','Help for newcomers']]);
    c('a food pantry names the food bank first, though the children-and-youth office is nearer', partners('food-pantry','board','board').map(p=>p[0]), ['Warminster Community Food Bank','Bucks County Children and Youth']);
    { const strs=JE(`(()=>{ const out=[]; for(const id of ['pathfinders','lift-rota','bp-clinic','interpreter-bank','food-pantry']) for(const t of ['board','team','congregation']) for(const lang of ['en','es']){
        const d=caseDeck(caseModel(id,{type:t,group:t==='team'?'community':t},{lang,now:${NOW}})); const p=d.slides.find(s=>s.type==='place'); out.push(JSON.stringify(p)); } return out; })()`);
      c('the place slide never calls them "our partners" (they already serve; we come alongside)', strs.filter(s=>/our partners|nuestros (socios|aliados)/i.test(s)).length, 0);
      c('…and a place slide with partners names them with their distance (≤ 3)', strs.filter(s=>/"partners":\[\{"name"/.test(s)).length>0&&strs.every(s=>{ const p=JSON.parse(s).partners||[]; return p.length<=3&&p.every(x=>/^\d+(\.\d)? mi$/.test(x.dist)); }), true); }
    E(`HELP=null; HELP_STATE='idle'; HELP_AT=null;`); host.remove(); }

  console.log('\n-- 6. the "I’m in" slide while a member answers --');
  { const S=JE(`(()=>{ const d=caseDeck(caseModel('food-pantry',{type:'congregation',group:'congregation'},{lang:'es',now:${NOW},respond:true})); return d.slides.find(s=>s.type==='yes'); })()`);
    const box=P.D.createElement('div'); P.D.body.appendChild(box);
    P.w.__yes=S; E(`window.__ctl=tdeckRender({lang:'es',slides:[window.__yes]},document.body.lastChild,{mode:'follow',contained:true,keys:false,onRespond:()=>new Promise(()=>{})});`);
    const opts=[...box.querySelectorAll('button.td-opt')];
    c('three answers, each with its words, before anyone answers', opts.map(o=>!!o.querySelector('.td-otx span').textContent), [true,true,true]);
    opts[1].click();
    const css=[...P.D.querySelectorAll('style')].map(s=>s.textContent).join('\n');
    c('once one is picked: the verse foot and the other answers’ words give way (rules in the page’s own CSS)', [box.querySelector('.td-main').classList.contains('td-answering'),css.includes('.td-answering>.td-vfoot{display:none}'),css.includes('.td-answering .td-yes{grid-auto-rows:auto}'),css.includes('.td-answering .td-opt[aria-pressed="false"] .td-otx span{display:none}')], [true,true,true,true]);
    c('…the picked one keeps its words, the others stay tappable by name', [opts.map(o=>o.getAttribute('aria-pressed')),opts.every(o=>!o.disabled&&o.querySelector('.td-otx b').textContent.length>0)], [['false','true','false'],true]);
    c('…and in the presenter’s view nothing changes (no form, no answering)', E(`(()=>{ const h=document.createElement('div'); document.body.appendChild(h); const ctl=tdeckRender({lang:'es',slides:[window.__yes]},h,{mode:'present',contained:true,keys:false}); const r=!h.querySelector('button.td-opt')&&!h.querySelector('.td-answering'); ctl.destroy(); h.remove(); return r; })()`), true);
    E('window.__ctl.destroy()'); box.remove(); }
  c('no errors on the first page', P.errs, []);
  P.w.close();

  console.log('\n-- 5. a church surveyed with "Use my location" is remembered --');
  const censusFetch=(extra)=>async(u,opt,net)=>{
    if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false}),text:async()=>'{"enabled":false}'};
    if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
    if(/functions\/register/.test(u)) return resp(503,'{"ok":false,"error":"server"}');
    if(/overpass|interpreter/.test(u)){ net.overpass.push(decodeURIComponent(u.split('data=')[1]||'')); return resp(200,'{"elements":[]}'); }
    const m=/functions\/census\?cv=2&u=(.*)$/.exec(u);
    if(m){ const inner=decodeURIComponent(m[1]); net.census.push(inner);
      if(/geocoding\.geo\.census\.gov[^?]*\/coordinates\?/.test(inner)){ const q=new URL(inner).searchParams; return resp(200,JSON.stringify(GEO_PT(+q.get('x'),+q.get('y')))); }
      if(/geocoding\.geo\.census\.gov/.test(inner)) return resp(200,JSON.stringify(GEO_ADDR));
      if(/api\.census\.gov\/data\/\d+\/acs\/acs5\?get=/.test(inner)) return resp(200,JSON.stringify(acs(inner)));
      return new Promise(()=>{}); }
    return new Promise(()=>{}); };
  let saved=null;
  { const A=page({reg:true,here:[40.201234567,-75.096612345],fetch:censusFetch()});
    await until(()=>!A.q('#hub').hidden||A.E('typeof openTool==="function"'));
    A.E(`uChurch().name='Bucks County SDA'; uPersist(); openTool('survey'); showAddressForm();`);
    A.q('#loc').click();
    c('the survey runs from the point the phone gave', await until(()=>A.E('!!DATA'),8000), true);
    const pt=A.net.census.filter(u=>/\/coordinates\?/.test(u)).map(u=>{ const q=new URL(u).searchParams; return [q.get('x'),q.get('y')]; });
    c('…asked of the Census at five decimals (about a metre), as the #ll= link carries it', pt, [['-75.09661','40.20123']]);
    c('…the survey keeps that point and the Census’s name for the place', A.J('[DATA.geo.coords,DATA.geo.label]'), [{x:-75.09661,y:40.20123},'Warminster Township, Bucks County, PA']);
    c('the church is remembered on this device: its coordinates and the place’s name', A.J('[uChurch().address,uChurch().label]'), ['Coordinates -75.09661,40.20123','Warminster Township, Bucks County, PA']);
    c('…so who already serves nearby is looked up too (3 miles round that point)', await until(()=>A.net.overpass.some(q=>/around:4827,40\.20123,-75\.09661\)/.test(q))), true);
    c('…and homeChurch() reads it back', A.J('homeChurch()'), {id:A.J('uChurch().id'),name:'Bucks County SDA',address:'Coordinates -75.09661,40.20123',x:-75.09661,y:40.20123,label:'Warminster Township, Bucks County, PA'});
    saved=A.w.localStorage.getItem('terrain-churches-v1');
    c('no errors', A.errs, []);
    A.w.close(); }
  { const B=page({reg:true,store:saved,session:'case',fetch:censusFetch()});
    c('a reload inside Make the Case loads that church quietly, without anything typed', await until(()=>B.E('TOOL')==='case'&&B.E('!!DATA')&&!!B.q('#cs-s1'),8000), true);
    c('…from its coordinates (the point, never an address search)', [B.net.census.some(u=>/\/coordinates\?x=-75\.09661&y=40\.20123&/.test(u)),B.net.census.some(u=>/onelineaddress/.test(u))], [true,false]);
    c('…the church line names it by the place, not by numbers', B.txt('#homeline'), 'Bucks County SDA · Warminster Township, Bucks County, PA · Change church');
    c('…and not the first-time card', !B.q('.home-first'), true);
    c('no errors', B.errs, []);
    B.w.close(); }
  { // a second church, mapped by location on a device that already knows one by its address
    const two=JSON.stringify({active:'church-1',churches:{'church-1':{id:'church-1',name:'Bucks County SDA',address:ADDR,capacity:{},selected:[],overrides:{},members:[],linked:[],drafts:[],share:{}}}});
    const C=page({reg:true,store:two,here:[40.2012,-75.0966],fetch:censusFetch()});
    await until(()=>C.E('typeof openTool==="function"'));
    C.E(`openTool('survey'); showAddressForm();`); C.q('#loc').click();
    await until(()=>C.E('!!DATA'),8000);
    c('…a new church record, named by the place until he names it', C.J(`Object.values(uStore().churches).map(c=>[c.name,c.address,c.label||''])`), [['Bucks County SDA',ADDR,''],['Warminster Township, Bucks County, PA','Coordinates -75.0966,40.2012','Warminster Township, Bucks County, PA']]);
    C.E(`openTool('case')`); await sleep(50);
    c('…and its line in Make the Case says the place once, not twice', C.txt('#homeline'), 'Warminster Township, Bucks County, PA · Change church');
    c('no errors', C.errs, []);
    C.w.close(); }
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
