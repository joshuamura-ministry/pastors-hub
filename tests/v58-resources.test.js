// v10.58.0 — "Resources for your church" and "Ministries that come to your church", at the foot of Learn from other conferences.
// The pastor (7 Oct 2026): "did you put the box or section where I asked you to put all the different resources and grants and all that
// good stuff in a box somewhere where Pastor can … see there's a grant I can … request from the union or from the NAD or from the GC …
// money opportunities support from all those areas and put it into one concentrated area … so that we can go through and see if there's
// anything a church would like to do and maybe … apply for and get financial support or resources free"; "and maybe even … recognized and
// in good standing ministries that travel and will come to your church like choirs from academies … Speakers … the sanctuary … it will
// show their contact and how to get a hold of them … across the conferences across the NAD across the United States"; "and these could go
// at the bottom of the compare conferences page"; and of the pill: "what is every number has a source does that have to be there?" (gone
// in v10.57.1; the page's top now carries one way down to the resources).
// Covered: the data (conferences/resources.json: shape, https only, contacts checked, nothing "AI"), the way down from the top, the box
// (his conference's evangelism help first, then his union's, the NAD's and the world church's, by kind), two across with none alone,
// "Show all", the ministries (kinds, near him first, contact as mailto:/tel:), Spanish, no conference chosen, escaping, a failed load.
// Written failing-first on v10.57.1.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REG=conf=>({name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf,role:'pastor',synced:true,tok:TOK});
const served=p=>{ const f=path.join(ROOT,'conferences',p); return fs.existsSync(f)?fs.readFileSync(f,'utf8'):null; };
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body)});
/* o.reg: a conference name, or false; o.lang; o.tamper(path,json); o.res404 (resources.json missing) */
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const net=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.__into=[]; w.Element.prototype.scrollIntoView=function(){ w.__into.push(this.id||''); };
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(o.reg!==false) w.localStorage.setItem('terrain-reg',JSON.stringify(REG(o.reg||'Pennsylvania')));
      w.fetch=async(u)=>{ u=String(u); net.push(u);
        if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
        if(/functions\/register/.test(u)) return resp(503,'{"ok":false}');
        if(/advise/.test(u)) return resp(200,'{"enabled":false}');
        const m=/^\/conferences\/([a-z/.-]+\.json)(\?v=[0-9a-f]+)?$/.exec(u);
        if(m){ if(o.res404&&m[1]==='resources.json') return resp(404,'{}');
          let t=served(m[1]); if(t==null) return resp(404,'{}'); if(o.tamper){ const j=o.tamper(m[1],JSON.parse(t)); if(j) t=JSON.stringify(j); } return resp(200,t); }
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,net,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
async function openRes(P){ await until(()=>P.E('ACCESS_CHECKED')); await sleep(60); P.E("openTool('compare')");
  await until(()=>P.q('#cmp-resg .cmp-rcard')&&(P.q('#cmp-ming .cmp-rcard')||!P.q('#cmp-min'))); await sleep(30); }
const cards=(P,sel)=>P.qa(sel+' .cmp-rcard');

(async()=>{ try{
  console.log('\n-- the data: conferences/resources.json --');
  const R=JSON.parse(served('resources.json')||'null');
  c('built beside the comparison', !!R&&Array.isArray(R.world)&&Array.isArray(R.nad)&&!!R.unions&&!!R.conferences&&!!R.help&&Array.isArray(R.ministries));
  const items=[...R.world,...R.nad,...Object.values(R.unions).flat(),...Object.values(R.conferences).flat()];
  c('every item is money, free, training or now, from a level, with a name and a link', items.every(x=>['money','free','training','now'].includes(x.g)&&['world','nad','union','conference'].includes(x.lv)&&x.n&&x.l&&x.l.length));
  const links=[...items.flatMap(x=>x.l),...Object.values(R.help).flatMap(h=>h.l)].map(l=>l.u).concat(R.ministries.flatMap(m=>[m.site,m.su,m.inv].filter(Boolean)));
  c('every link https, no quote or space in it', links.length>200&&links.every(u=>/^https:\/\/[^\s"'<>]+$/.test(u)));
  c('Pennsylvania\'s evangelism help: a subsidy, up to 50%, by 30 September, with how to ask and its conditions', [R.help.pennsylvania.help,R.help.pennsylvania.share,R.help.pennsylvania.deadline,/Evangelistic Request Form/.test(R.help.pennsylvania.how),R.help.pennsylvania.cond.length], ['subsidy','up to 50%','30 September',true,4]);
  c('…its two links are two pages (no link twice)', new Set(R.help.pennsylvania.l.map(l=>l.u)).size, 2);
  c('the Columbia Union\'s funding is there', R.unions['Columbia Union'].some(x=>x.g==='money'&&/Homeland Missions/.test(x.n)));
  c('a mission outside the comparison is left out (Guam-Micronesia)', [!!R.unions['Guam-Micronesia Mission'],!R.help['guam-micronesia-mission']], [false,true]);
  c('67 ministries, each of a known kind and standing', [R.ministries.length, R.ministries.every(m=>['sanctuary','music-school','music-group','evangelism','health','children-youth','family','other'].includes(m.c)&&['church-entity','asi-member','church-listed'].includes(m.st))], [67,true]);
  c('…each with what it is in English and Spanish, its own site and where its standing is shown', R.ministries.every(m=>m.n&&m.w&&m.we&&m.site&&m.su));
  c('…emails are addresses, phones dial as digits (a word number and an extension too)', [R.ministries.every(m=>!m.em||/^[^\s@<>"?#&=%/]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(m.em)), R.ministries.every(m=>!m.ph||/^\+?[0-9]{7,15}(,[0-9]{1,6})?$/.test(m.tel)),
    R.ministries.find(m=>m.ph==='855-336-FREE').tel, R.ministries.find(m=>/ext/.test(m.ph||'')).tel], [true,true,'8553363733','13348554764,7029']);
  c('the life-size sanctuary is in it', R.ministries.some(m=>m.c==='sanctuary'&&/Messiah/.test(m.n)));
  c('nothing says "AI"', /\bAI\b|\bIA\b/.test(JSON.stringify(R).replace(/https?:[^"]+/g,'')), false);

  console.log('\n-- the page: one way down from the top --');
  const P=page(); await openRes(P);
  const go=P.q('#cmp .cmp-top [data-cmp-resgo]');
  c('under the title: "Resources for your church ↓", a button', go?[go.tagName,go.textContent]:null, ['BUTTON','Resources for your church ↓']);
  P.E('window.__into=[]'); go.click();
  c('…it brings the box into view', P.J('window.__into'), ['cmp-res']);
  c('at the foot of the page, after Month by month and before How to read this', P.qa('#cmp .cmp-step').map(s=>s.id).slice(-4), ['cmp-months','cmp-res','cmp-min','cmp-read']);
  c('numbered 14 and 15', [P.txt('#cmp-res .cmp-num'),P.txt('#cmp-min .cmp-num')], ['14','15']);
  c('the box names where it is from: his conference, his union, the NAD and the world church', [P.txt('#cmp-res h3'), /the Pennsylvania Conference, the Columbia Union, the North American Division and the world church/.test(P.txt('#cmp-res .cmp-sh .note'))], ['Resources for your church',true]);
  console.log('\n-- the box: money first, his conference first --');
  const tabs=P.qa('[data-cmp-rtab]');
  c('four kinds, each with its count', tabs.map(b=>b.firstChild.textContent), ['Money you can ask for','Free materials','Training','What the church is doing now']);
  c('…money open', tabs.map(b=>b.getAttribute('aria-pressed')), ['true','false','false','false']);
  const money=cards(P,'#cmp-resg');
  c('first his conference\'s evangelism help, the width of the box', [money[0].querySelector('h4').textContent, money[0].classList.contains('cmp-help'), money[0].querySelector('.cmp-lv').textContent], ['Evangelism help from the Pennsylvania Conference',true,'Your conference']);
  c('…its share, its deadline, how to ask, its conditions, its links', [[...money[0].querySelectorAll('.cmp-facts span')].map(s=>s.textContent), money[0].querySelectorAll('li').length, money[0].querySelectorAll('.cmp-rlinks a').length], [['Share: up to 50%','Deadline: 30 September'],4,2]);
  c('then the Columbia Union\'s funding, labelled with the union', [money[1].querySelector('.cmp-lv').textContent, /Homeland Missions/.test(money[1].querySelector('h4').textContent), money[1].querySelectorAll('h5').length>0], ['Columbia Union',true,true]);
  c('the count on the tab is the cards in it', +tabs[0].querySelector('.n').textContent, money.length);
  c('…no other conference\'s or union\'s items', money.every(x=>['conference','nad','world'].includes(x.dataset.lv)||(x.dataset.lv==='union'&&/^Columbia Union/.test(x.querySelector('.cmp-lv').textContent))));
  const seed=money.find(x=>/ACS Seed Grant/.test(x.querySelector('h4').textContent));
  c('a grant run by a church body other than the division itself names that body (Adventist Community Services)', seed?[seed.dataset.lv,seed.querySelector('.cmp-lv').textContent]:null, ['nad','Adventist Community Services']);
  c('two across, never one alone on a row: an odd last card spans the row', (()=>{ const reg=money.filter(x=>!x.classList.contains('cmp-help')); return reg.length%2?reg[reg.length-1].classList.contains('wide'):!reg.some(x=>x.classList.contains('wide')); })());
  c('every link opens apart', P.qa('#cmp-resg a').every(a=>a.target==='_blank'&&a.rel==='noopener'&&/^https:\/\//.test(a.getAttribute('href'))));
  tabs[1].click(); await sleep(20);
  const free=cards(P,'#cmp-resg');
  c('Free materials: the NAD\'s (Frame websites among them)', [P.qa('[data-cmp-rtab]')[1].getAttribute('aria-pressed'), free.some(x=>/Frame website/.test(x.textContent)), free.every(x=>!x.classList.contains('cmp-help'))], ['true',true,true]);
  P.q('[data-cmp-rtab="now"]').click(); await sleep(20);
  const nowN=+P.q('[data-cmp-rtab="now"] .n').textContent;
  c('What the church is doing now: 12 at first, then "Show all"', [cards(P,'#cmp-resg').length, P.txt('[data-cmp-rall]')], [Math.min(12,nowN),'Show all '+nowN]);
  P.q('[data-cmp-rall]').click(); await sleep(20);
  c('…all of them', [cards(P,'#cmp-resg').length, !!P.q('[data-cmp-rall]')], [nowN,false]);
  c('the foot: checked, and confirm before applying', /^Checked 1 Oct 2026\. Amounts and deadlines change/.test(P.txt('#cmp-resg .cmp-rfoot')));

  console.log('\n-- ministries that come to your church --');
  c('its words, and the care to take', [P.txt('#cmp-min h3'), /Ask your conference about a ministry before you invite it/.test(P.txt('#cmp-min .cmp-minwarn'))], ['Ministries that come to your church',true]);
  const cats=P.qa('[data-cmp-mcat]');
  c('All, then each kind with its count', cats.map(b=>b.firstChild.textContent), ['All','The sanctuary','School choirs and bands','Music groups','Evangelism and speakers','Health','Children and youth','Family','Other']);
  c('…All: 67', [+cats[0].querySelector('.n').textContent, cards(P,'#cmp-ming').length], [67,67]);
  const first=cards(P,'#cmp-ming').slice(0,2);
  c('near him first: the ministries whose own words name Pennsylvania or the Columbia Union, marked "Near you"', first.map(x=>[x.querySelector('h4').textContent,!!x.querySelector('.cmp-near')]), [['Blue Mountain Academy tour groups',true],['Pine Forge Academy Choir',true]]);
  c('…the others are not marked', cards(P,'#cmp-ming').slice(2).every(x=>!x.querySelector('.cmp-near')));
  P.q('[data-cmp-mcat="sanctuary"]').click(); await sleep(20);
  const mm=cards(P,'#cmp-ming');
  c('The sanctuary: Messiah\'s Mansion, the width of the box', [mm.length, mm[0].querySelector('h4').textContent, mm[0].classList.contains('wide')], [1,'Messiah’s Mansion'.replace('’',"'"),true]);
  c('…its kind and its standing (a link to where it is shown)', [mm[0].querySelector('.cmp-lv').textContent, mm[0].querySelector('a.cmp-stand').textContent, /^https:/.test(mm[0].querySelector('a.cmp-stand').getAttribute('href'))], ['The sanctuary','Listed by the church',true]);
  c('…who runs it, where it travels, the cost and what to know', [/Run by: Mosaic Sanctuary/.test(mm[0].textContent), /Travels: National/.test(mm[0].textContent), /Cost: Tours are free/.test(mm[0].textContent), /Good to know: Plan about a year ahead/.test(mm[0].textContent)], [true,true,true,true]);
  c('…how to reach it: its website, how to invite it, its email and its phone', [[...mm[0].querySelectorAll('.cmp-rlinks a')].map(a=>a.textContent.replace(/\s*↗/,'').trim()), [...mm[0].querySelectorAll('.cmp-contact a')].map(a=>a.getAttribute('href'))],
    [['Website','How to invite them'],['mailto:messiahsmansion@hotmail.com','tel:4054543590']]);
  c('no page errors', P.errs, []);

  console.log('\n-- in Spanish --');
  { const S=page({lang:'es'}); await openRes(S);
    c('the way down, the titles, the kinds', [S.txt('[data-cmp-resgo]'), S.txt('#cmp-res h3'), S.txt('#cmp-min h3'), S.qa('[data-cmp-rtab]').map(b=>b.firstChild.textContent)],
      ['Recursos para su iglesia ↓','Recursos para su iglesia','Ministerios que visitan su iglesia',['Dinero que puede solicitar','Materiales gratuitos','Capacitación','Lo que la iglesia está haciendo ahora']]);
    c('the help card in Spanish; the published words say they are English', [S.txt('#cmp-resg .cmp-help h4'), /Parte: up to 50%/.test(S.txt('#cmp-resg .cmp-help')), /están en inglés, como se publicaron/.test(S.txt('#cmp-resg'))], ['Ayuda para evangelismo de la Asociación de Pennsylvania',true,true]);
    S.q('[data-cmp-mcat="sanctuary"]').click(); await sleep(20);
    c('a ministry says what it is in Spanish', /Una réplica del santuario de Moisés a tamaño real/.test(S.txt('#cmp-ming .cmp-rcard')));
    c('…its standing in Spanish, "Cerca de usted" for near ones', [S.txt('#cmp-ming .cmp-stand'), (S.q('[data-cmp-mcat="all"]').click(), S.txt('#cmp-ming .cmp-near'))], ['Reconocido por la iglesia','Cerca de usted']);
    c('no page errors', S.errs, []);
  }

  console.log('\n-- no conference chosen --');
  { const Q=page({reg:'Bermuda'}); await until(()=>Q.E('ACCESS_CHECKED')); await sleep(60); Q.E("openTool('compare')");
    await until(()=>Q.q('#cmp-resg .cmp-rcard')); await sleep(30);
    c('the box still shows: the NAD\'s and the world church\'s, numbered 2 and 3', [Q.txt('#cmp-res .cmp-num'), Q.txt('#cmp-min .cmp-num'), /the North American Division and the world church \(choose your conference above/.test(Q.txt('#cmp-res .cmp-sh .note'))], ['2','3',true]);
    c('…no conference\'s help, nobody marked near', [!!Q.q('#cmp-resg .cmp-help'), cards(Q,'#cmp-resg').every(x=>['nad','world'].includes(x.dataset.lv)), !!Q.q('#cmp-ming .cmp-near')], [false,true,false]);
  }

  console.log('\n-- words from the web stay words --');
  { const T=page({tamper:(p,j)=>{ if(p!=='resources.json') return null;
      j.unions['Columbia Union'][0].n='<img src=x onerror="window.__x=1">Funding'; j.unions['Columbia Union'][0].l=[{t:'bad',u:'javascript:alert(1)'},{t:'ok',u:'https://ok.example.org/x'}];
      j.help.pennsylvania.how='<b onclick="window.__x=1">ask</b>';
      const m=j.ministries.find(x=>x.c==='sanctuary'); m.n='<script>window.__x=1</script>Mansion'; m.em='x@y.org?bcc=evil@z.org'; m.tel='javascript:1'; m.site='http://plain.example.org'; return j; }});
    await openRes(T);
    const res=T.q('#cmp-res'), min=T.q('#cmp-min');
    c('nothing made from the data runs or becomes an element', [res.querySelectorAll('img,script,b[onclick]').length, min.querySelectorAll('img,script').length, T.E('window.__x===undefined')], [0,0,true]);
    c('…the names shown as words', [/<img src=x onerror="window.__x=1">Funding/.test(res.textContent), /<b onclick="window.__x=1">ask<\/b>/.test(res.textContent)], [true,true]);
    c('a link that is not https is dropped; the https one stays', [[...res.querySelectorAll('a')].some(a=>/^javascript:/i.test(a.getAttribute('href'))), [...res.querySelectorAll('a')].some(a=>a.getAttribute('href')==='https://ok.example.org/x')], [false,true]);
    T.q('[data-cmp-mcat="sanctuary"]').click(); await sleep(20);
    const m=T.q('#cmp-ming .cmp-rcard');
    c('a bad email, a bad phone and a plain-http site are not linked', [!!m.querySelector('.cmp-contact'), [...m.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>!/^https:\/\//.test(h))], [false,[]]);
  }

  console.log('\n-- the file does not load --');
  { const F=page({res404:true}); await until(()=>F.E('ACCESS_CHECKED')); await sleep(60); F.E("openTool('compare')");
    await until(()=>F.q('#cmp-resg [data-cmp-retry]')); await sleep(20);
    c('both frames say so, with Try again', [!!F.q('#cmp-resg [data-cmp-retry]'), !!F.q('#cmp-ming [data-cmp-retry]')], [true,true]);
    c('…and the rest of the page is drawn', !!F.q('#cmp-months'));
  }
}catch(e){ console.log('  FAIL  crashed: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0); })();
