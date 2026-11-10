// v10.74.0 — Neighborhood needs: one card per family. The pastor (10 Nov 2026, his survey on a computer): "seniors and isolation
// seniors and isolation seniors and isolation … if these are prioritizing that neighborhood needs … didn't they just be one line
// seniors and isolation why is it three different lines". The findings stay (nsModel's needs and also); the page shows one card per
// family (nsGroups → S.cards): the family's first finding leads (its id is the card's), the others fold under it, an "Also here"
// row with its tag. Design: ~/Ministry Work/Terrain-work/v89/DESIGN-NEEDS-GROUPED.md. Written failing-first against v10.73.0.
const fs=require('fs'), path=require('path');
const {FX,checker,page,ready,survey,until,sleep}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const model=(P,mod,scope)=>P.J(`(()=>{ const D=${JSON.stringify(FX.DATA)}; ${mod||''}; const prev=DATA; DATA=D; const S=nsModel(D.M,${JSON.stringify(scope||'tract')}); DATA=prev; return S; })()`);
const cat=P=>P.qa('#u-needs .ns-list > .ns-need .ns-cat').map(x=>[...x.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim());
async function open(P,id,ideas){
  await until(()=>P.q(`#u-needs [data-need="${id}"] .ns-head`));
  const h=P.q(`#u-needs [data-need="${id}"] .ns-head`); if(h.getAttribute('aria-expanded')!=='true') h.click();
  if(ideas){ const s=P.q(`#u-needs [data-need="${id}"] [data-ns-show]`); if(s&&s.getAttribute('aria-expanded')!=='true') s.click();
    await until(()=>P.qa(`#ns-i-${id} .ns-row`).length>0,12000); await sleep(100); }
}

(async()=>{ await T.sec(async()=>{
  const P=page({needs:'file'}); await ready(P);
  console.log('\n-- the model: one card per family, the findings kept --');
  const S=model(P);
  c('nsGroups exists; nsModel gives cards beside needs and also (the findings untouched: 23 needs, 2 also rows)', [P.E('typeof nsGroups'),Array.isArray(S.cards),S.needs.length,S.also.length], ['function',true,23,2]);
  c('seven cards on the fixture, in the order the families first appear: the family\'s first finding leads',
    S.cards.map(g=>g.id), ['lang-primary','child-poverty','rent50','kids','shiftwork','shift-race','seniors-alone']);
  c('…their families, each once', S.cards.map(g=>g.catLabel||g.cat), ['Language & newcomers','Hardship & work','Housing pressure','Families with children','Work & schedules','A changing community','Seniors & isolation']);
  c('…the findings under each: 5 · 7 · 4 · 3 · 1 · 3 · 2 (every need and also row placed once)', [S.cards.map(g=>g.finds.length),S.cards.reduce((a,g)=>a+g.finds.length,0)], [[5,7,4,3,1,3,2],25]);
  c('the Language card holds its five findings in list order', S.cards[0].finds.map(f=>f.id), ['lang-primary','limeng','foreign','recent','family-english']);
  c('a card is its lead: id, title, sentence, kind, category; its lines are every finding\'s sentence', [S.cards[1].id===S.cards[1].finds[0].id,S.cards[1].title===S.needs.find(n=>n.id==='child-poverty').title,S.cards[1].evidence===S.cards[1].finds[0].evidence,S.cards[1].kind,S.cards[1].lines.length], [true,true,true,'hardship',7]);
  c('the two "Also here" rows fold into a Seniors card of their own: the near row leads with its tag, the town row under it', [S.cards[6].tag,S.cards[6].finds.map(f=>[f.id,f.tag])], ['near',[['seniors-alone','near'],['seniors-nocar','town']]]);
  c('the badge goes with its finding: one card, the Language one', [S.cards.filter(g=>g.top).map(g=>g.id),S.cards[1].top], [['lang-primary'],false]);
  { const ES=page({lang:'es',needs:'file'}); await ready(ES); const Se=model(ES);
    c('…in Spanish the badge is on the Hardship card (never a Spanish-language need)', Se.cards.filter(g=>g.top).map(g=>g.id), ['child-poverty']); }
  c('nsGroups on its own: nothing → no cards; two findings of one family → one card with two; a finding placed once even if listed twice',
    P.J(`[nsGroups([],[]).length, nsGroups([{id:'a',cat:'X',catLabel:'X',evidence:'one'},{id:'b',cat:'X',catLabel:'X',evidence:'two'}],[{id:'b',cat:'X',catLabel:'X',evidence:'two'}]).map(g=>[g.id,g.finds.map(f=>f.id),g.lines])]`), [0,[['a',['a','b'],['one','two']]]]);

  console.log('\n-- the page: one card per family --');
  survey(P); await until(()=>P.qa('#u-needs .ns-list > .ns-need').length>0);
  c('seven cards, all showing, numbered 1 to 7, no "Show all"', [P.qa('#u-needs .ns-list > .ns-need').length,P.qa('#u-needs .ns-list > .ns-need:not([hidden])').length,P.qa('#u-needs .ns-rank').map(x=>x.textContent),!!P.q('[data-ns-more]')], [7,7,['1','2','3','4','5','6','7'],false]);
  c('no family label twice', [new Set(cat(P)).size,cat(P)[0]], [7,'Language & newcomers']);
  c('the first card: the family and the badge, the lead\'s title and sentence, the other four findings by topic on one quiet line',
    [P.txt('#ns-h-lang-primary .ns-cat'),P.txt('#ns-h-lang-primary h3'),/^19% speak Spanish/.test(P.txt('#ns-h-lang-primary .ns-ev')||''),P.txt('#ns-h-lang-primary .ns-with'),P.q('[data-need="lang-primary"]').dataset.finds],
    ['Language & newcomers Greatest need','Materials and welcome in Spanish',true,'+ Limited English · Born abroad · Recent arrivals · Families learning English','5']);
  c('a card of one finding: no "+" line', [!!P.q('[data-need="shiftwork"] .ns-with'),P.q('[data-need="shiftwork"]').dataset.finds,P.txt('#ns-h-shiftwork .ns-cat')], [false,'1','Work & schedules']);
  c('the Seniors card: its tag, the town row named with its tag in brackets', [P.q('[data-need="seniors-alone"]').dataset.also,P.txt('#ns-h-seniors-alone .ns-tag'),P.txt('#ns-h-seniors-alone .ns-with')], ['near','Almost a need here','+ Seniors without a car (across Warminster)']);
  c('the cards carry the lead\'s category for Focus; only the Seniors card is an also row', [P.qa('#u-needs .ns-need').map(a=>a.dataset.cat),P.qa('#u-needs .ns-need[data-also]').map(a=>a.dataset.need)],
    [['Language & newcomers','Hardship & work','Housing pressure','Families with children','Hardship & work','A changing community','Seniors & isolation'],['seniors-alone']]);
  c('no card opened by itself', P.qa('#u-needs .ns-need.open').length, 0);

  console.log('\n-- a card open: every finding\'s figures, then each finding under its topic --');
  await open(P,'child-poverty'); await sleep(100);
  const H='#u-needs [data-need="child-poverty"]';
  c('the Hardship card open: six rings (the seven findings\' figures in turn, no key twice)', [P.q(H).classList.contains('open'),P.qa(H+' .ns-figs .stat').length,P.qa(H+' .ns-figs .statlab').map(x=>x.textContent)],
    [true,6,['Children in poverty','Below the poverty line','Single-parent families','Households on SNAP','Households on cash assistance','Households under $35k']]);
  c('What helps once, then seven blocks, one per finding, under its topic', [P.qa(H+' .ns-help').length,P.qa(H+' .ns-find').map(d=>d.dataset.find),P.qa(H+' .ns-find h5').map(h=>h.textContent)],
    [1,['child-poverty','snap','poverty','working-poor','uninsured','foodaccess','unemp'],['Children in poverty','Food assistance (SNAP)','Poverty','Low-wage work','No health insurance','Getting to food','Unemployment']]);
  c('each block: the finding\'s sentence, its steps, its question; no "Where to begin" heading', [P.qa(H+' .ns-find .ns-fev').length,P.qa(H+' .ns-find ul').length,P.qa(H+' .ns-find .ns-ask').length,P.qa(H+' .ns-detail > h5').length,/^Ask first:/.test(P.txt(H+' .ns-find[data-find="child-poverty"] .ns-ask')||'')], [7,7,7,0,true]);
  c('…the first block\'s sentence is the card\'s own', P.txt(H+' .ns-find[data-find="child-poverty"] .ns-fev')===P.txt('#ns-h-child-poverty .ns-ev'), true);
  await open(P,'shiftwork');
  c('a card of one finding opens as before: Where to begin, one question, no blocks', [P.qa('#u-needs [data-need="shiftwork"] .ns-detail h5').map(h=>h.textContent),P.qa('#u-needs [data-need="shiftwork"] .ns-ask').length,P.qa('#u-needs [data-need="shiftwork"] .ns-find').length,P.qa('#u-needs [data-need="shiftwork"] .ns-figs .stat').length<=4], [['Where to begin'],1,0,true]);
  await open(P,'seniors-alone');
  c('the Seniors card open: the town row\'s block wears its tag', [P.qa('#u-needs [data-need="seniors-alone"] .ns-find').length,P.txt('#u-needs [data-need="seniors-alone"] .ns-find:last-child h5')], [2,'Seniors without a car Across Warminster']);

  console.log('\n-- the ideas of a card: the findings\' lists in turn --');
  await open(P,'child-poverty',true);
  const rows=P.qa('#ns-i-child-poverty .ns-row').map(r=>r.dataset.idea);
  c('more ideas than one finding\'s (over 15), at most 12 a lift, no idea twice', [rows.length>15,rows.length<=36,new Set(rows).size===rows.length,P.qa('#ns-i-child-poverty .ns-lcol').length], [true,true,true,3]);
  c('every row belongs to the card', P.qa('#ns-i-child-poverty .ns-row').every(r=>r.dataset.need==='child-poverty'), true);
  c('the ideas of the single-finding card are its own list as before (at most 8 a lift)', P.J(`(()=>{ const n=nsNeedById('shiftwork'), l=nsIdeasFor(n); return [l.length<=24, l.length===nsIdeasLib(n).length]; })()`), [true,true]);
  c('the count on the button says the union', /^\d+ ideas ›$/.test(P.txt('#u-needs [data-need="rent50"] .ns-show small')||'')&&parseInt(P.txt('#u-needs [data-need="rent50"] .ns-show small'))>10, true);
  { P.q('#ns-i-child-poverty .ns-row').click(); await sleep(150);
    c('an idea\'s sheet names the card: "For the need: Children are carrying more of the hardship"', [P.q('#ns-sheet').hasAttribute('open'),P.txt('#ns-sheet .ns-shneed')], [true,'For the need: Children are carrying more of the hardship']);
    P.E(`nsSheetClose()`); await sleep(50); }

  console.log('\n-- a finding\'s id lands on its card; the way back; Compare your churches; Focus --');
  c('nsNeedById("limeng") is the Language card', P.J(`[nsNeedById('limeng').id, nsNeedById('seniors-nocar').id, nsNeedById('no-such')]`), ['lang-primary','seniors-alone',null]);
  P.E(`nsBackTo({need:'foreign',idea:'none-such'})`); await sleep(100);
  c('the way back from a finding opens its card', [P.E(`NS.open`),P.q('[data-need="lang-primary"]').classList.contains('open')], ['lang-primary',true]);
  P.E(`chSnapSave()`);
  c('the church\'s snapshot (Compare your churches) keeps the first five cards\' titles, one per family', P.J(`uChurch().snap.needs`), ['Materials and welcome in Spanish','Children are carrying more of the hardship','Households one setback from losing housing','This is a children\'s neighborhood','Sabbath morning may be their working hour']);
  P.E(`FOCUS=new Set(['hardship']); renderFocus(); applyFocus();`);
  c('Focus on Hardship & work keeps the two cards of that category (Hardship, Work & schedules)', P.qa('#u-needs .ns-list > .ns-need:not(.hidden)').map(a=>a.dataset.need), ['child-poverty','shiftwork']);
  P.E(`FOCUS.clear(); renderFocus(); applyFocus();`);
  c('the sentence sent for Claude\'s ideas is every finding\'s (nsClInput): the card\'s seven lines, 400 characters at most', P.J(`(()=>{ DATA.geo={...(DATA.geo||{}),matched:'10 Sample Rd, Warminster, PA 18974'}; const I=nsClInput(nsNeedById('child-poverty')); return I?[I.need.id,I.need.why.length<=400,I.need.why.length>120,/17% of households/.test(I.need.why)||/poverty/.test(I.need.why)]:null; })()`), ['child-poverty',true,true,true]);

  console.log('\n-- Claude\'s list is grouped the same way --');
  c('nsAiApply: Claude\'s order, a new need in its family, the also rows folded', P.J(`(()=>{ const D=${JSON.stringify(FX.DATA)}; const prev=DATA; DATA=D; const S=nsModel(D.M,'tract');
    const A=nsAiApply(S,[{id:'snap',title:'Food first',why:'Why snap'},{id:'kids',title:'',why:''},{id:'new',title:'Neighbors over 65 alone',why:'Many seniors live alone here.',cat:'Seniors & isolation',figures:[],local:[],churches:[],themes:[]},{id:'rent50',title:'',why:''},{id:'lang-primary',title:'',why:''}]);
    DATA=prev; return [A.ai,A.cards.map(g=>g.id),A.cards.map(g=>g.finds.length),A.cards[2].finds.map(f=>f.id),A.cards[0].title]; })()`),
    [true,['snap','kids','ai-3','rent50','lang-primary'],[1,1,3,1,1],['ai-3','seniors-alone','seniors-nocar'],'Food first']);

  console.log('\n-- two languages in one card: every row remembers its finding --');
  { const Q=page({needs:'file'}); await ready(Q);
    survey(Q,{mod:`D.M.tract.langs=[{name:'Spanish',share:20,count:1100,ltvw:400},{name:'Vietnamese',share:12,count:650,ltvw:143}]`}); await until(()=>Q.qa('#u-needs .ns-list > .ns-need').length>0);
    c('the second language is a finding of the Language card', Q.J(`(nsNeedById('lang-primary').finds||[]).map(f=>f.id).includes('lang-also')`), true);
    await open(Q,'lang-primary',true); await until(()=>Q.qa('#ns-i-lang-primary .ns-row[data-idea="immigrants-welcome-card-in-lang"]').length>=2,12000);
    const W=Q.qa('#ns-i-lang-primary .ns-row[data-idea="immigrants-welcome-card-in-lang"]');
    c('the welcome card is one row per language, each from its finding, each in its language', [W.map(r=>r.dataset.find),W.map(r=>/Vietnamese/.test(r.querySelector('.ns-in').textContent))], [['lang-primary','lang-also'],[false,true]]);
    c('every row carries its finding; an idea shown twice is one that says the language, once per language, named differently', [Q.qa('#ns-i-lang-primary .ns-row').every(r=>!!r.dataset.find),
      (()=>{ const R=Q.qa('#ns-i-lang-primary .ns-row'), pairs=R.map(r=>r.dataset.idea+'|'+r.dataset.find); if(new Set(pairs).size!==pairs.length) return 'a pair twice';
        const by={}; R.forEach(r=>{ (by[r.dataset.idea]=by[r.dataset.idea]||[]).push(r.querySelector('.ns-in').textContent); });
        const twice=Object.entries(by).filter(([,a])=>a.length>1); return twice.every(([id,a])=>new Set(a).size===a.length&&Q.J(`!!(nsView(${JSON.stringify(id)})||{}).langful`))?'ok':JSON.stringify(twice); })()], [true,'ok']);
    W[1].click(); await until(()=>Q.q('#ns-sheet[open]')); await until(()=>Q.qa('#ns-sheet .ns-steps li').length===4,12000);
    c('the Vietnamese row\'s sheet: for its own finding, in its language', [Q.q('#ns-sheet').dataset.find,Q.txt('#ns-sheet .ns-shneed'),/Vietnamese/.test(Q.txt('#ns-s-t')||''),/Vietnamese/.test(Q.txt('#ns-sheet .ns-why')||'')], ['lang-also','For the need: Materials and welcome in Vietnamese',true,true]);
    Q.q('#ns-sheet [data-ns-propose]').click(); await until(()=>Q.E('TOOL')==='case',12000); await sleep(150);
    c('Create a proposal from it: the plan entry in Vietnamese, "Why here" its finding\'s own sentence, the way back to that finding', [Q.J('uSelected()'),Q.J(`uChurch().whyFrom['immigrants-welcome-card-in-lang--vietnamese'].need`),/Vietnamese/.test(Q.J(`nsWhyOf('immigrants-welcome-card-in-lang--vietnamese')`)),Q.J('NS.back.need'),Q.J('NS.back.find')],
      [['immigrants-welcome-card-in-lang--vietnamese'],'lang-also',true,'lang-primary','lang-also']);
    c('…the Proposal page names that finding', Q.txt('#cs-prop .cs-pneed'), 'For the need: Materials and welcome in Vietnamese');
    Q.E(`openTool('survey')`); await sleep(80); Q.E(`nsBackTo(NS.back)`); await until(()=>Q.q('#ns-sheet[open]'));
    c('…and the way back reopens the Vietnamese sheet on the Language card', [Q.J('NS.open'),Q.q('#ns-sheet').dataset.find,/Vietnamese/.test(Q.txt('#ns-s-t')||'')], ['lang-primary','lang-also',true]);
    c('no page errors (two languages)', Q.errs, []); }

  console.log('\n-- Spanish --');
  { const E=page({lang:'es',needs:'file'}); await ready(E); survey(E); await until(()=>E.qa('#u-needs .ns-list > .ns-need').length>0);
    c('the cards in Spanish: the families once, the topics line, the town row\'s tag', [E.qa('#u-needs .ns-list > .ns-need').length,E.txt('#ns-h-lang-primary .ns-with'),E.txt('#ns-h-seniors-alone .ns-with'),E.txt('#ns-h-child-poverty .ns-cat')],
      [7,'+ Inglés limitado · Nacidos en el extranjero · Recién llegados · Familias que aprenden inglés','+ Mayores sin auto (en todo Warminster)','Necesidad y trabajo Mayor necesidad']);
    await open(E,'child-poverty');
    c('…the blocks under their Spanish topics, "Pregunte primero:"', [E.qa('#u-needs [data-need="child-poverty"] .ns-find h5').slice(0,3).map(h=>h.textContent),/^Pregunte primero:/.test(E.txt('#u-needs [data-need="child-poverty"] .ns-find[data-find="child-poverty"] .ns-ask')||'')], [['Niños en pobreza','Ayuda para alimentos (SNAP)','Pobreza'],true]);
    c('no page errors (ES)', E.errs, []); }

  console.log('\n-- the words, the style, the stamps --');
  c('the new CSS: the "+" line and the finding blocks', [/\.ns-with\{display:block;color:var\(--ink3\)/.test(HTML),/\.ns-find\{display:grid;/.test(HTML),/\.ns-fev\{/.test(HTML)], [true,true,true]);
  c('six rings sit three and three, five three and two (from 654 px); in two columns a fifth takes its row', [/@container \(min-width:654px\)\{ \.ns-figs \.stats:has\(>\.stat:nth-child\(5\):last-child\),\.ns-figs \.stats:has\(>\.stat:nth-child\(6\):last-child\)\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/.test(HTML),
    /\(max-width:653\.98px\)\{ \.ns-figs \.stats:has\(>\.stat:nth-child\(5\):last-child\)>\.stat:last-child\{grid-column:1\/-1\}/.test(HTML)], [true,true]);
  c('never the word AI on these cards', P.qa('#u-needs .ns-need').every(a=>!/\bAI\b/.test(a.textContent)), true);
  c('the six stamps say v10.74.0', [(HTML.match(/v10\.74\.0/g)||[]).length>=6, /const VERSION = 'v10\.74\.0'/.test(HTML)], [true,true]);
  c('no page errors', P.errs, []);
}); T.done(); })();
