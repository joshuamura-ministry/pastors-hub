/* v10.42 part 3 — Gifts first on the proposals (GIFTS.md §6, §8; §12.1 F 34–38 and 40; DESIGN.md G5). The pastor (SPEC-FOCUS E):
 * "Before, the Spiritual Gifts initiative has to be done for the whole church membership; every member needs to do it."
 * Read on D's average church (tests/average-church: 46 adults; before 0, partial 18, after 40 have taken the assessment).
 * GIFTS §12.1 A 1–9 (gfReadiness) are in tests/v42-core.test.js; B–E are B2's (tests/gifts-first-ui.test.js, present-function).
 *  34 before and partial: "Who is able" says the church-wide initiative comes first, the coverage ("18 of 46 adults…"), the campaign's
 *     link when there is one; no gifts words in the motion, its rows or the timeline
 *  35 after: the whole church counted (fit, free, leaders), "have time" left out when fewer than half of the fit have given times
 *  36 a library prayer idea with no lead need, at half: staffed through its theme's ministries (F2), fit > 0
 *  37 an in-reach deck: its church family slide says the coverage below half, the fit at half
 *  38 no member's name in any deck, handout or gifts box (every built-in × board, team, the whole church; every 50th library idea;
 *     EN, and ES for every third; the three seeds)
 *  40 the private ask list: the partial line below half; "Has time" / "Can lead" at half; 30 rows at most, "and k more"
 */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const FXD=path.join(__dirname,'average-church');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const SEED=v=>JSON.parse(fs.readFileSync(path.join(FXD,`seed-${v}.json`),'utf8'));
const KEY=JSON.parse(fs.readFileSync(path.join(FXD,'gifts-after-key.json'),'utf8')).members;
const NAMES=KEY.map(k=>k.name);
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,400));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=15000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const GIFTWORDS=/\b(spiritual gifts?|gifts?|dones espirituales|dones)\b/i;

async function page(variant,lang){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const seed=SEED(variant);
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      for(const [k,v] of Object.entries(seed)) if(!k.startsWith('_')) w.localStorage.setItem(k,JSON.stringify(v));
      if(lang) w.localStorage.setItem('terrain-lang',lang);
      w.fetch=async(u)=>{ u=String(u); const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null}; const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window, P={w,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`))};
  await until(()=>P.E('typeof caseModel==="function"&&typeof uCatalog==="function"'));
  P.E(`DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; CAP=null; U_PEOPLE_CACHE=null;`);
  return P;
}
const slide=(P,id,t,g,o)=>P.J(`(()=>{ const m=caseModel(${JSON.stringify(id)},{type:${JSON.stringify(t)},group:${JSON.stringify(g)}},${JSON.stringify(o||{})}); const d=caseDeck(m);
  const a=d.slides.find(s=>s.type==='ability'); const mo=d.slides.find(s=>s.type==='motion'); const tl=d.slides.find(s=>s.type==='timeline');
  return {R:m.gifts.church,g:{has:m.gifts.has,fit:m.gifts.fit,free:m.gifts.free,leaders:m.gifts.leaders,freeKnown:m.gifts.freeKnown,rule:m.gifts.rule,ready:m.gifts.ready},
    a:a&&{headline:a.headline,value:a.value,label:a.label,lead:a.lead,source:a.source},motion:JSON.stringify([mo.headline,mo.rows,m.motion.rows]),timeline:JSON.stringify(m.timeline.steps),
    fam:(d.slides.find(s=>s.type==='place'&&s.facts&&s.facts.some(f=>/gifts|dones/i.test(f.label)))||{}).facts||null}; })()`);

(async()=>{
  console.log('\n-- 34: below half, the church-wide initiative first --');
  for(const v of ['before','partial']){ const P=await page(v);
    const s=slide(P,'food-pantry','board','board');
    const n=v==='before'?0:18;
    c(`${v}: "The church-wide Spiritual Gifts initiative comes first", ${n} of 46 adults`, [s.R.state,s.a.headline,s.a.value,s.a.label], [v==='before'?'none':'low','The church-wide Spiritual Gifts initiative comes first',String(n),'of 46 adults have discovered their gifts so far']);
    c(`${v}: …with no campaign, "Counts only, no names"; the invitation`, [s.a.source,s.a.lead], ['Counts only, no names','Every member is invited: about 15 minutes on their phone.']);
    P.E(`uChurch().share={...(uChurch().share||{}),pub:'AbCdEfGhIjKlMnOpQrStUv'}; uPersist();`);
    const s2=slide(P,'food-pantry','board','board');
    c(`${v}: …with a campaign, its short link`, [/^Take it at /.test(s2.a.source),s2.a.source.includes(P.J('gfShortLink("en")')||'#')], [true,true]);
    const es=slide(P,'food-pantry','board','board',{lang:'es'});
    c(`${v}: …Spanish`, [es.a.headline,es.a.label,/^Hágala en /.test(es.a.source)], ['Primero, la iniciativa de dones espirituales para toda la iglesia','de 46 adultos han descubierto sus dones hasta ahora',true]);
    c(`${v}: no gifts in the motion, its rows or the timeline`, [GIFTWORDS.test(s.motion),GIFTWORDS.test(s.timeline)], [false,false]);
    P.w.close(); }

  console.log('\n-- 35: at half, the whole church counted --');
  { const P=await page('after');
    const s=slide(P,'food-pantry','board','board');
    // v10.42.0 fix after review: one denominator, the results counted ("8 Members whose gifts fit this work, of 40 who have taken
    // the assessment" beside "Spiritual Gifts results from 39 members": one who answered alike throughout is left out)
    c('after (40 of 46): "God has already put people for this in our church", the fit counted, of the 39 results counted', [s.R.state,s.a.headline,s.a.value===String(s.g.fit)&&s.g.fit>0,s.a.label], ['half','God has already put people for this in our church',true,'Members whose gifts fit this work, of 39 results counted']);
    c('…never more fit than counted, never more with time or able to lead than fit', [s.g.fit<=s.R.counted,s.g.free<=s.g.fit,s.g.leaders<=s.g.fit,s.g.ready<=s.g.fit], [true,true,true,true]);
    // the fit set, counted independently of the slide: the members the model counts, their times and their leading
    const ind=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{}); const ppl=gfEveryone().filter(p=>p.minor!==true&&!(p.flags&&p.flags.allHigh));
      return {counted:ppl.length,key:${JSON.stringify(KEY.length)}}; })()`);
    c('…the counted adults are the key file’s, less the one who answered high everywhere', [ind.counted,s.R.counted], [ind.key-1,ind.key-1]);
    c('…fewer than half of the fit have given times, so "have time" is left out of the lead', [s.g.freeKnown,/have time|tienen tiempo/.test(s.a.lead)], [false,false]);
    const H=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{}); const d=caseDeck(m); return caseHandout(m,d,{}).gifts; })()`);
    c('…the handout’s box says the same count', H&&new RegExp('\\b'+s.g.fit+'\\b').test(H.text||''), true);
    P.w.close(); }

  console.log('\n-- 36: a prayer idea with no lead need, at half (F2) --');
  { const P=await page('after');
    P.E(`window.__lib=false; (async()=>{ await libLoadIndex(); await libLoadTheme('prayer'); window.__lib=true; })();`); await until(()=>P.E('window.__lib'),30000);
    const r=P.J(`(()=>{ const raw=libFull('prayer-town-prayer-calendar'); uChurch().lib={[raw.id]:raw}; const m=caseModel(raw.id,{type:'board',group:'board'},{}); return {lead:m.need.lead,rule:m.gifts.rule,fit:m.gifts.fit,min:m.ministry.min,theme:CASE_THEME_MIN.prayer}; })()`);
    c('the town prayer calendar: no lead need, staffed by its theme’s ministries (F2), someone fits', [r.lead,r.rule,JSON.stringify(r.min)===JSON.stringify(r.theme),r.fit>0], [null,'F2',true,true]);
    P.w.close(); }

  console.log('\n-- 37: an in-reach deck’s church family --');
  for(const v of ['partial','after']){ const P=await page(v);
    P.E(`window.__lib=false; (async()=>{ await libLoadIndex(); await libLoadTheme('member-care'); window.__lib=true; })();`); await until(()=>P.E('window.__lib'),30000);
    const id=P.J(`LIB.rows.find(r=>r.theme==='member-care'&&r.reach==='in').id`);
    const r=P.J(`(()=>{ const raw=libFull(${JSON.stringify(id)}); uChurch().lib={[raw.id]:raw}; const m=caseModel(raw.id,{type:'board',group:'deacons'},{}); const d=caseDeck(m);
      const f=d.slides.find(s=>s.type==='place'); return {inreach:m.inreach,items:f?f.facts.map(x=>[x.value,x.label]):null}; })()`);
    const gi=(r.items||[]).find(x=>/gifts|dones/i.test(x[1]));
    c(`${v}: the church family slide’s gifts item: ${v==='partial'?'the coverage (18 of 46 adults)':'the fit, at half'}`, [r.inreach,gi&&(v==='partial'?gi[0]==='18'&&/of 46 adults have discovered their gifts/.test(gi[1]):/^Members whose gifts fit this work/.test(gi[1]))], [true,true]);
    P.w.close(); }

  console.log('\n-- 38: no member’s name anywhere --');
  { const found=[]; let n=0;
    for(const v of ['before','partial','after']){ const P=await page(v);
      P.E(`window.__lib=false; (async()=>{ await libLoadIndex(); await Promise.all(LIB.idx.themes.map(t=>libLoadTheme(t.id))); window.__lib=true; })();`); await until(()=>P.E('window.__lib'),60000);
      const r=P.J(`(()=>{ const names=${JSON.stringify(NAMES)}, hits=[]; let n=0; const ch=uChurch(), keep=ch.lib;
        const ids=[...SIGNATURE.map(x=>[x.id,false]),...LIB.rows.filter((r,i)=>i%50===0).map(r=>[r.id,true])];
        ids.forEach(([id,lib],k)=>{ if(lib){ const raw=libFull(id); ch.lib={[raw.id]:raw}; } else ch.lib=keep;
          for(const lang of (k%3===0?['en','es']:['en'])) for(const [t,g] of [['board','board'],['team','community'],['congregation','congregation']]){
            const m=caseModel(id,{type:t,group:g},{lang}); if(!m.ok) continue; n++; const d=caseDeck(m); const H=caseHandout(m,d,{}); const bx=caseGiftsBoxLines(m);
            const s=JSON.stringify(d)+JSON.stringify({...H,askList:undefined})+JSON.stringify(bx||{});
            names.forEach(nm=>{ if(s.includes(nm)) hits.push(${JSON.stringify(v)}+'/'+lang+'/'+g+'/'+id+': '+nm); }); } });
        ch.lib=keep; return {n,hits:hits.slice(0,5)}; })()`);
      n+=r.n; found.push(...r.hits); P.w.close(); }
    c(`${n} decks, handouts and gifts boxes over the three seeds: no member’s name`, found, []); }

  console.log('\n-- 40: the private ask list --');
  { const P=await page('partial');
    const h=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{}); return caseAskHTML(m); })()`);
    c('partial (18 of 46): "Only 18 of 46 adults have taken the assessment so far, so this list is partial." and "Invite the whole church"', [/Only 18 of 46 adults have taken the assessment so far, so this list is partial\./.test(h),/data-cs-invite[^>]*>Invite the whole church</.test(h)], [true,true]);
    P.w.close(); }
  { const P=await page('after');
    const r=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{}); const h=caseAskHTML(m);
      const ord={ready:0,drawn:1,could:2}; const sorted=m.askList.every((a,i,A)=>!i||ord[A[i-1].status]<ord[a.status]||(A[i-1].status===a.status&&(A[i-1].lead>a.lead||(A[i-1].lead===a.lead&&A[i-1].time>=a.time))));
      return {n:m.askList.length,more:m.askMore,time:/>Has time</.test(h),lead:/>Can lead</.test(h),partial:/so this list is partial/.test(h),sorted}; })()`);
    c('after (at half): "Has time" and "Can lead"; no partial line; within a status, who can lead first, then who has time', [r.time,r.lead,r.partial,r.sorted], [true,true,false,true]);
    const cap=P.J(`(()=>{ const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
      for(let i=0;i<40;i++) uChurch().members.push({id:'x'+i,name:'Extra '+i,gifts:mk(['mercy','helps','serve','hosp','giving']),heart:{poor:2},confirmed:true,willing:true,hours:6,skills:[],source:'manual',leader:i%3===0});
      uPersist(); U_PEOPLE_CACHE=null; const m=caseModel('food-pantry',{type:'board',group:'board'},{}); const h=caseAskHTML(m); const k=(h.match(/and (\\d+) more whose gifts fit/)||[])[1];
      return {n:m.askList.length,more:m.askMore,k:k?+k:null}; })()`);
    c('…30 rows at most, then "and k more whose gifts fit"', [cap.n,cap.more>0,cap.k===cap.more], [30,true,true]);
    const es=P.J(`(()=>{ LANG='es'; try{ const m=caseModel('food-pantry',{type:'board',group:'board'},{lang:'es'}); return caseAskHTML(m); } finally{ LANG='en'; } })()`);
    c('…Spanish: "Tiene tiempo", "Puede dirigir", "y k más cuyos dones encajan"', [/>Tiene tiempo</.test(es),/>Puede dirigir</.test(es),/y \d+ más cuyos dones encajan/.test(es)], [true,true,true]);
    c('no page errors', P.errs.slice(0,3), []);
    P.w.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
