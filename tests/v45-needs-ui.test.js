// v10.45.0 — the Community Survey's needs on the page (DESIGN-SURVEY §2.1, §2.4–§2.6, §2.9, §2.11–§2.12). The pastor (3–5 Oct 2026):
// "in each need there's going to be a place to click and a drop-down with ideas… around 10… light lift, moderate lift and heavy lift…
// it will say what it will need from our church, and if we don't have it, then we don't have it… If you click one of those ministry
// ideas it will open up, give you how to start, what it would need, and you can print the PDF." And: "clean and clear and easy to
// understand". The cards, one open at a time, Show all, Focus, the chips, the ideas (lift order, the curated order, the shipped map's
// rules), the rows, the sheet (EN + ES, a built-in in Spanish, children, the Sabbath, one primary button, Esc, Remove from plan), the
// curation's {lang} and its Diwali gate, the free tier, and no "AI" word. Written failing-first against v10.44.1 (no #u-needs there).
const {FX,IDX,checker,page,ready,survey,openNeed,openSheet,sleep,until}=require('./v45-helpers.js');
const T=checker(), c=T.c;
// A curated map of this suite's own (the build's shape): rent50's twelve in the curator's order, snap with one built-in (the
// fallback tops it up to ten), kids with a children's idea, and a Spanish list
const STUB={v:1,hash:IDX&&IDX.hash,
  needs:{rent50:['homeless-fund-tenant-lawyer-court-day','homeless-rent-help-page','homeless-eviction-court-companions','jobs-money-read-before-you-sign-table',
    'homeless-volunteer-mediators','homeless-eviction-notice-photo-line','homeless-rent-bridge-fund','clothing-practical-renters-repair-request-evening',
    'homeless-eviction-moving-crew','homeless-rent-help-night','homeless-parsonage-bridge-housing','jobs-money-no-interest-emergency-loans'],
    snap:['pantry-box'],
    kids:['children-free-fun-calendar','education-after-school-english-help','education-library-summer-reading-volunteers','children-home-alone-safety-class',
      'adventurers-fall-festival-craft-table','children-mobile-play-van','vbs','sports-camp','pathfinders','homework-club']},
  lang:{spanish:['immigrants-spanish-web-whatsapp']},d1:{'homeless-rent-help-page':['A first sentence from the map.','Una primera frase del mapa.']}};
const LIFTS=['light','moderate','heavy'];
const AI=/\b(AI|IA)\b|\bgenerated\b|\bassistant\b|\bgenerad[oa]s?\b|\basistente\b/i;
const rows=(P,need)=>P.qa(`#ns-i-${need} .ns-row`).map(r=>r.dataset.idea);
const tierOf=id=>{ const c=IDX.cols, r=IDX.ideas.find(x=>x[0]===id); return r?r[c.indexOf('tier')]:null; };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the section: first under the focus note, with its chip --');
  let P=page({needs:STUB}); await ready(P); survey(P); await sleep(50);
  // v10.45.1 — the pastor changed his mind (5 Oct 2026): "go through all the things about what the community is like and then it
  // will show what this neighborhood needs". Was: #u-needs between #focusnote and #brief.
  c('#u-needs at the bottom of the survey, after Community resources (v10.46.1: "should go after community resources")', (P=>{ const n=P.q('#u-needs'), h=e=>e&&e.querySelector('h2')?e.querySelector('h2').textContent:(e&&e.id); return [!!n,!!n&&n.parentElement.id,h(n&&n.previousElementSibling)]; })(P),[true,'sections','Community resources']);   // v10.46.1: at the bottom, after Community resources
  c('its heading and John 4:35 under it', [P.txt('#u-needs .ns-hero > h2'),/John 4:35/.test(P.txt('#u-needs .verse')||'')], ['Neighborhood needs',true]);   // v10.50.0 — the pastor (6 Oct 2026): "the title could be neighborhood needs"
  // the review round (#27f): on a phone the preamble pushed the first need off the screen: a short note, the church link on its own
  // line, and the lifts said where the ideas are (each opened list names its lifts)
  // v10.45.1 — the pastor (5 Oct 2026): "you don't need the thing that says your church's information is on the spiritual gifts page …
  // nothing to fill-in … erase that, they will understand". Was: the short note and the link.
  c('no "nothing to fill in" line and no Spiritual Gifts link above the needs', [P.qa('#u-needs .ns-nofill').length,P.qa('#u-needs [data-gf-church]').length], [0,0]);
  c('no lift legend above the needs', P.qa('#u-needs .ns-legend').length, 0);
  // v10.45.1: was '"Needs" first, then "Brief"'
  c('the chip bar: "Brief" first; "Needs" once, right after the report\'s last section', (b=>[b[0],b.filter(x=>x==='Needs').length,b[b.indexOf('Needs')-1]])(P.qa('#secnav button').map(b=>b.textContent)), ['Brief',1,'Community resources']);   // v10.46.1: right after Community resources
  c('no church form, Mobilization or ministries list in the survey', [!!P.q('#capslot'),!!P.q('#hinge'),!!P.q('#u-ministry-list'),P.qa('#sections h2').map(h=>h.textContent).filter(t=>/Mobilization|Your church|Ministries your church/.test(t))], [false,false,false,[]]);

  console.log('\n-- the cards --');
  const cards=P.qa('#u-needs .ns-list > .ns-need');
  c('a card per need, numbered, greatest first; the first wears "Greatest need"', [cards.length,P.txt('#u-needs .ns-need .ns-rank'),P.qa('#u-needs .ns-top').length,P.txt('#u-needs .ns-need .ns-top')], [25,'1',1,'Greatest need']);   // v10.50.0 — the pastor (6 Oct 2026): the two also cards numbered on (23 + 2)   // the review round (#7): debt and grief join other needs here
  c('each card: its category, its title as the h3, its evidence, the kind colour', [P.txt('#ns-h-rent50 .ns-cat'),P.txt('#ns-h-rent50 h3'),/^24% of renters pay more than half/.test(P.txt('#ns-h-rent50 .ns-ev')||''),P.q('[data-need="rent50"]').dataset.kind,P.q('[data-need="rent50"]').getAttribute('style')],
    ['Housing pressure','Households one setback from losing housing',true,'housing','--k:var(--m-housing)']);
  c('every control is a button; each toggle names what it opens; the body is a region named by its header',
    [P.qa('#u-needs .ns-head, #u-needs .ns-show').every(b=>b.tagName==='BUTTON'),P.qa('#u-needs .ns-head').every(b=>!!P.q('#'+b.getAttribute('aria-controls'))),P.q('#ns-b-rent50').getAttribute('role'),P.q('#ns-b-rent50').getAttribute('aria-labelledby')],
    [true,true,'region','ns-h-rent50']);
  c('more than 15 needs: the first 12 show, then "Show all 23 needs"', [P.qa('#u-needs .ns-list > .ns-need:not([hidden])').length,P.txt('[data-ns-more]')], [12,'Show all 25 needs']);
  P.q('[data-ns-more]').click();
  c('…which shows them all, numbers kept', [P.qa('#u-needs .ns-list > .ns-need:not([hidden])').length,!!P.q('[data-ns-more]'),P.qa('#u-needs .ns-list .ns-rank').pop().textContent], [25,false,'25']);
  await openNeed(P,'rent50');
  c('a card opens in place: what the community needs and "Ask first"', [P.q('#ns-h-rent50').getAttribute('aria-expanded'),P.q('#ns-b-rent50').hidden,P.qa('#ns-b-rent50 .ns-detail li').length>=2,/^Ask first: /.test(P.txt('#ns-b-rent50 .ns-ask')||'')], ['true',false,true,true]);
  await openNeed(P,'snap');
  c('one card open at a time', [P.q('#ns-h-rent50').getAttribute('aria-expanded'),P.q('#ns-b-rent50').hidden,P.q('#ns-h-snap').getAttribute('aria-expanded')], ['false',true,'true']);
  P.q('#ns-h-snap').click();
  c('…and a second tap closes it', [P.q('#ns-h-snap').getAttribute('aria-expanded'),P.q('#ns-b-snap').hidden], ['false',true]);
  // v10.50.0 — the pastor (6 Oct 2026): "where it says also here make it a continuation … until they're all done" — the also cards are needs cards, numbered on, each with its tag
  c('the also cards continue the list: numbered on, each with its tag', [P.qa('#u-needs .ns-list .ns-need[data-also]').map(a=>[a.dataset.need,a.dataset.also]),P.qa('#u-needs .ns-need[data-also] .ns-rank').map(x=>x.textContent),P.txt('#ns-h-seniors-alone .ns-tag'),P.qa('#u-needs .ns-alsob').length],
    [[['seniors-alone','near'],['seniors-nocar','town']],['24','25'],'Almost a need here',0]);   // the review round (#9): plain words
  await openNeed(P,'seniors-nocar',true);
  c('…an also row opens into the same body: its detail and its ideas', [!!P.q('#ns-b-seniors-nocar .ns-detail'),rows(P,'seniors-nocar').length>=10], [true,true]);

  console.log('\n-- Focus narrows the needs too --');
  P.E(`FOCUS.clear(); FOCUS.add('housing'); renderFocus(); applyFocus();`);
  c('Housing: only the housing cards stay, the section stays', [P.qa('#u-needs .ns-list > .ns-need:not(.hidden)').map(a=>a.dataset.cat).every(x=>x==='Housing pressure'),P.qa('#u-needs .ns-list > .ns-need:not(.hidden)').length,P.q('#u-needs').classList.contains('hidden')], [true,4,false]);
  P.E(`FOCUS.clear(); renderFocus(); applyFocus();`);
  c('the focus note counts the needs here, and "Also here" apart (the review round, #23 and M5)', P.txt('#focusnote'), 'Showing everything: 23 needs here, and 2 more under Also here. Use Focus to narrow it.');

  console.log('\n-- the ideas: Light, Moderate, Heavy; the curated order inside each --');
  await openNeed(P,'rent50',true);
  const r50=rows(P,'rent50');
  // v10.46.1: each lift's name is on its button across the top (was a heading over each list)
  // v10.50.0 — the pastor (6 Oct 2026): "underneath it will have the columns showing of all the ideas instead of having to click every single thing"
  c('the twelve, grouped Light → Moderate → Heavy, three columns all open, a heading and a line for each', [r50.length,P.qa('#ns-i-rent50 .ns-lift').map(g=>g.dataset.lift),P.qa('#ns-i-rent50 .ns-lcol .ns-lh > span:not(.lift)').map(h=>h.textContent),P.qa('#ns-i-rent50 .ns-lift .ns-gl').length],
    [12,LIFTS,['Light lift','Moderate lift','Heavy lift'],3]);
  c('…inside each lift, the curator\'s order (most effective first)', r50, [1,2,3].flatMap(t=>STUB.needs.rent50.filter(id=>tierOf(id)===t)));
  c('the button says how many, then "Hide ideas ⌃"', [P.txt('[data-ns-show="rent50"] small'),P.q('[data-ns-show="rent50"]').getAttribute('aria-expanded')], ['Hide ideas ⌃','true']);
  c('a row: the name, one line from the map (d1), people and money', [P.txt('#ns-i-rent50 [data-idea="homeless-rent-help-page"] .ns-id'),P.qa('#ns-i-rent50 [data-idea="homeless-rent-help-page"] .ns-if span').map(s=>s.textContent)],
    ['A first sentence from the map.',[P.J(`LIB.byId.get('homeless-rent-help-page').ppl`)+' people',P.J(`nsMoney(nsView('homeless-rent-help-page'))`)]]);
  await openNeed(P,'snap',true);
  c('a short list (one built-in) is topped up to ten from the library, three a lift where they exist', [rows(P,'snap').length,rows(P,'snap').includes('pantry-box'),LIFTS.map(L=>P.qa(`#ns-i-snap [data-lift="${L}"] .ns-row`).length>=3)], [10,true,[true,true,true]]);
  c('…the built-in\'s money is the planning allowance, said with "About"', /^About \$/.test(P.txt('#ns-i-snap [data-idea="pantry-box"] .ns-if span:last-child')||''), true);
  c('…the map\'s idea first in its lift', P.qa('#ns-i-snap [data-lift="moderate"] .ns-row')[0].dataset.idea, 'pantry-box');

  console.log('\n-- the idea sheet --');
  await openSheet(P,'rent50','homeless-rent-help-page');
  await until(()=>P.qa('#ns-sheet .ns-steps li').length===4);
  const raw=P.J(`libFull('homeless-rent-help-page')`);
  c('opened as a dialog over the page, focus on its title', [P.q('#ns-sheet').hasAttribute('open'),P.w.document.activeElement&&P.w.document.activeElement.id], [true,'ns-s-t']);
  c('"For the need: …", the name, the lift and the Sabbath, what it is', [P.txt('#ns-sheet .ns-shneed'),P.txt('#ns-s-t'),P.txt('#ns-sheet .ns-liftline'),P.txt('#ns-sheet .ns-shd')],
    ['For the need: Households one setback from losing housing',raw.en.n,`Light lift · A few people, this week, little or no money · ${raw.sabbath?'Fits the Sabbath':'Best on another day'}`,raw.en.d]);
  c('Why here (the need\'s own evidence), How to get started (four steps)', [P.qa('#ns-sheet .ns-block h3').map(h=>h.textContent),P.txt('#ns-sheet .ns-why')===P.txt('#ns-h-rent50 .ns-ev'),P.qa('#ns-sheet .ns-steps li').map(l=>l.textContent)],
    [['Why here','How to get started','What it needs from our church'],true,raw.en.how]);
  c('what it needs from our church: general words, no check against the church', P.qa('#ns-sheet .ns-gi dt').map(d=>d.textContent).filter(t=>['People','Time','To start','Each month','Where'].includes(t)), ['People','Time','To start','Each month','Where']);
  c('…and the line that says a gap is what to ask the church for (the review round, #27c)', P.txt('#ns-sheet .ns-askfor'), 'If our church does not have all of this yet, that is fine: this list shows what to ask the church for.');
  c('one primary button, "Create a proposal for this ministry"; the PDF beside it', [P.qa('#ns-sheet .primary').map(b=>b.textContent),P.txt('#ns-sheet [data-ns-pdf]'),P.q('#ns-sheet [data-ns-pdf]').classList.contains('primary')],
    [['Create a proposal for this ministry'],'One-page PDF',false]);
  c('a 44-pixel close button named "Close"', [P.q('#ns-sheet [data-ns-close]').getAttribute('aria-label')], ['Close']);
  const row=P.q('#ns-i-rent50 [data-idea="homeless-rent-help-page"]');
  P.q('#ns-sheet').close();
  c('Esc (the dialog\'s close) puts the focus back on the row it came from, marked', [P.q('#ns-sheet').hasAttribute('open'),P.w.document.activeElement===row,row.classList.contains('ns-last')], [false,true,true]);
  await openSheet(P,'rent50','homeless-rent-help-page'); P.q('#ns-sheet [data-ns-close]').click();
  c('…and so does ✕', [P.q('#ns-sheet').hasAttribute('open'),P.w.document.activeElement===row], [false,true]);
  P.E(`uChurch().selected=['homeless-rent-help-page']; uPersist();`);
  await openSheet(P,'rent50','homeless-rent-help-page');
  c('in the plan: "In your plan ✓ · Remove from plan"', P.txt('#ns-sheet .ns-inplan'), 'In your plan ✓ · Remove from plan');
  P.q('#ns-sheet [data-ns-remove]').click(); await sleep(20);
  c('…Remove from plan takes it out, the sheet and What\'s next say so', [P.J('uSelected()'),!!P.q('#ns-sheet [data-ns-remove]'),!!P.q('#u-whatsnext [data-u-next-case="homeless-rent-help-page"]')], [[],false,false]);
  P.q('#ns-sheet [data-ns-close]').click();
  await openSheet(P,'kids','education-after-school-english-help');
  c('an idea with children: the line on screened adults, two adults and parents\' consent', P.txt('#ns-sheet .ns-kids'), P.E(`libT('kids')`));
  c('…and the sheet never asks for a child\'s name or photo (it asks for nothing)', P.qa('#ns-sheet input, #ns-sheet textarea, #ns-sheet select').length, 0);
  P.q('#ns-sheet [data-ns-close]').click();
  await openSheet(P,'snap','pantry-box');
  c('a built-in: its steps, its allowance with "About", its partner', [P.qa('#ns-sheet .ns-steps li').length,/^About \$/.test(P.qa('#ns-sheet .ns-gi dd')[2].textContent),P.qa('#ns-sheet .ns-gi dt').map(d=>d.textContent).includes('Partner')], [4,true,true]);
  c('no "AI", "generated" or "assistant" on the section or the sheet (EN)', [AI.test(P.txt('#u-needs')),AI.test(P.txt('#ns-sheet'))], [false,false]);
  P.q('#ns-sheet [data-ns-close]').click();
  c('no page error along the way', P.errs, []);

  console.log('\n-- in Spanish --');
  P=page({needs:STUB,lang:'es'}); await ready(P); survey(P); await sleep(50);
  // (the badge in Spanish: the first need here is Spanish at home, which a Spanish-speaking pastor's church very likely meets: review #12)
  // v10.45.1: the short note is gone
  c('the heading, the chip, the badge on the first need that is not Spanish', [P.txt('#u-needs .ns-hero > h2'),P.txt('#secnav button[data-t="u-needs"]'),P.txt('#u-needs .ns-top'),P.q('#u-needs .ns-top').closest('.ns-need').dataset.need],
    ['Necesidades del vecindario','Necesidades','Mayor necesidad','child-poverty']);   // v10.50.0 — the pastor (6 Oct 2026)
  c('the category in Spanish (the filter keeps the English one)', [P.txt('#ns-h-rent50 .ns-cat'),P.q('[data-need="rent50"]').dataset.cat], ['Presión de vivienda','Housing pressure']);
  await openSheet(P,'rent50','homeless-rent-help-page'); await until(()=>P.qa('#ns-sheet .ns-steps li').length===4);
  const rawEs=P.J(`libFull('homeless-rent-help-page')`).es;
  c('the sheet in Spanish: its words and the idea\'s own Spanish', [/^Para la necesidad: /.test(P.txt('#ns-sheet .ns-shneed')),P.txt('#ns-s-t'),P.qa('#ns-sheet .ns-block h3').map(h=>h.textContent),P.qa('#ns-sheet .ns-steps li').map(l=>l.textContent),P.qa('#ns-sheet .ns-acts button').map(b=>b.textContent)],
    [true,rawEs.n,['Por qué aquí','Cómo empezar','Lo que necesita de nuestra iglesia'],rawEs.how,['PDF de una página','Crear una propuesta para este ministerio']]);
  P.q('#ns-sheet [data-ns-close]').click();
  await openSheet(P,'snap','pantry-box');
  const pb=P.J(`SIGNATURE.find(x=>x.id==='pantry-box')`);
  // the review round (#20): the built-ins the needs show have their Spanish description and partner now
  c('a built-in in Spanish shows no English: its Spanish name, description, steps and partner',
    [P.txt('#ns-s-t'),P.txt('#ns-sheet .ns-shd'),P.qa('#ns-sheet .ns-steps li').map(l=>l.textContent),(P.txt('#ns-sheet')||'').includes(pb.n),(P.txt('#ns-sheet')||'').includes(pb.d.slice(0,40)),P.txt('#ns-sheet .ns-gi.wide:last-child dd')],
    [P.E(`gfCap(caseMinName(SIGNATURE.find(x=>x.id==='pantry-box')))`),P.E(`tr(SIGNATURE.find(x=>x.id==='pantry-box').d)`),P.J(`CASE_HOW_BUILTIN['pantry-box'].es`),false,false,'Un banco de alimentos local para surtir al por mayor']);
  c('no "IA", "generado" or "asistente" (ES)', [AI.test(P.txt('#u-needs')),AI.test(P.txt('#ns-sheet'))], [false,false]);
  P.q('#ns-sheet [data-ns-close]').click();

  console.log('\n-- the shipped map (ideas/needs.json): every need on the fixture --');
  P=page({needs:'file'}); await ready(P); survey(P); await sleep(50);
  const NEEDS=P.J(`NSM.needs.concat(NSM.also).map(n=>n.id)`);
  const bad=[];
  for(const id of NEEDS){ await openNeed(P,id,true); const ids=rows(P,id);
    const lifts=LIFTS.map(L=>P.qa(`#ns-i-${id} [data-lift="${L}"] .ns-row`).length);
    if(ids.length<10||ids.length>24||lifts.some(n=>n>8)) bad.push(id+': '+ids.length+' '+lifts.join('/'));
    const ins=P.J(`${JSON.stringify(ids)}.filter(i=>LIB.byId.has(i)&&LIB.byId.get(i).reach==='in')`); if(ins.length) bad.push(id+' reach in: '+ins.join(','));
    const own=P.J(`(()=>{ const n=nsNeedById(${JSON.stringify(id)}); return n.lang&&['lang-primary','lang-also','lang-third'].includes(n.id)?(NS_LANG[n.lang]||{}).key:''; })()`);
    const named=P.J(`${JSON.stringify(ids)}.filter(i=>{ const v=nsView(i,null); return nsNamedOther(v.n+' '+(v.ne||''),${JSON.stringify(own)}); })`); if(named.length) bad.push(id+' names another language: '+named.join(','));
    if(P.qa(`#ns-i-${id} .ns-row`).some(r=>/\{lang\}/.test(r.textContent))) bad.push(id+': {lang} on screen'); }
  c(`every need on the fixture (${NEEDS.length}): 10–24 ideas, at most 8 a lift, none for God's people, none naming another language, no {lang} left`, bad, []);

  console.log('\n-- the curation\'s {lang}: the need\'s own language --');
  await openNeed(P,'lang-primary',true);
  c('a Spanish neighborhood\'s welcome card: "A welcome card in Spanish and English"', P.txt('#ns-i-lang-primary [data-idea="immigrants-welcome-card-in-lang"] .ns-in'), 'A welcome card in Spanish and English');
  c('…the need\'s own list first, the language\'s own ideas after it', [rows(P,'lang-primary').indexOf('immigrants-welcome-card-in-lang')<rows(P,'lang-primary').indexOf('hospitality-whatsapp-spanish-welcome'),rows(P,'lang-primary').includes('hospitality-whatsapp-spanish-welcome')], [true,true]);
  const VI=`D.M.tract.langs=[{name:'Chinese',share:24,count:1400,ltvw:600},{name:'Vietnamese',share:13,count:730,ltvw:160},{name:'Tagalog',share:10,count:565,ltvw:200}]`;
  survey(P,{mod:VI}); await sleep(30);
  await openNeed(P,'lang-also',true);
  c('lang-also speaks the second language ("…in Vietnamese and English"), and its sheet too',
    [P.txt('#ns-i-lang-also [data-idea="immigrants-welcome-card-in-lang"] .ns-in'),(P.q('#ns-i-lang-also [data-idea="immigrants-welcome-card-in-lang"]').click(),await until(()=>P.q('#ns-sheet[open]')),P.txt('#ns-s-t'))],
    ['A welcome card in Vietnamese and English','A welcome card in Vietnamese and English']);
  c('…Vietnamese neighbors get the Lunar New Year and Mid-Autumn ideas; a Spanish one never shows there', [rows(P,'lang-also').includes('holidays-lunar-new-year-red-cards'),rows(P,'lang-also').some(i=>/spanish/.test(i))], [true,false]);
  P.q('#ns-sheet [data-ns-propose]').click();
  await until(()=>P.E('TOOL')==='case');
  // (the review round, S1: a {lang} idea is its own plan entry for each language, "…--vietnamese")
  c('…proposed from that need, Make the Case speaks of Vietnamese (the idea is saved in its language)', [P.J(`caseItemOf('immigrants-welcome-card-in-lang--vietnamese').n`),P.J(`uChurch().lib['immigrants-welcome-card-in-lang--vietnamese'].langFilled`)], ['A welcome card in Vietnamese and English','Vietnamese']);
  P.E(`openTool('survey')`);
  survey(P,{mod:`D.M.tract.langs=[{name:'Other European',share:9,count:500,ltvw:100}]; D.M.tract.origins=[{name:'India',n:300,share:40},{name:'Portugal',n:100,share:13}]`}); await sleep(30);
  await openNeed(P,'lang-primary',true);
  // the review round (#10): a group's {lang} is "our neighbors’ language" ("their" had nothing to point to on a printed card)
  // (the coordinator, after the samples: India among the origins names the group's members, joined by "or")
  c('a Census group: its members as the origins name them; the Diwali greeting where India is among the commonest origins', [P.txt('#ns-i-lang-primary [data-idea="immigrants-welcome-card-in-lang"] .ns-in'),rows(P,'lang-primary').includes('holidays-diwali-sweets-greeting')], ['A welcome card in Hindi, Gujarati or Urdu and English',true]);
  survey(P,{mod:`D.M.tract.langs=[{name:'Other European',share:9,count:500,ltvw:100}]; D.M.tract.origins=[{name:'Portugal',n:300,share:40},{name:'Iran',n:100,share:13}]`}); await sleep(30);
  await openNeed(P,'lang-primary',true);
  c('…and not in a Portuguese- or Persian-speaking area (no India among the origins)', rows(P,'lang-primary').includes('holidays-diwali-sweets-greeting'), false);
  c('the Idea Library and Make the Case fill {lang} too (the first language at home, 4% or more)', P.J(`(()=>{ const r=LIB.byId.get('immigrants-welcome-card-in-lang'); return [libLite(r).n,libFill('en {lang}','es',null)]; })()`), ['A welcome card in Portuguese or Persian and English','en el idioma de nuestros vecinos']);   // (Portugal and Iran name the group's members here; no language at all: the neighbors')
  c('no page error along the way', P.errs, []);

  console.log('\n-- the free version: the needs, not the ideas --');
  P=page({needs:STUB,tier:'free'}); await ready(P); survey(P); await sleep(50);
  await openNeed(P,'rent50',true);
  c('the needs and their detail show; the ideas show the lock, no rows, no sheet', [P.qa('#u-needs .ns-list > .ns-need').length>0,!!P.q('#ns-b-rent50 .ns-detail'),!!P.q('#ns-i-rent50 .lock[data-lock="plan"]'),rows(P,'rent50').length,P.qa('[data-ns-propose]').length],
    [true,true,true,0,0]);
  c('…and the lock says what it opens', /Ministry ideas for every need/.test(P.txt('#ns-i-rent50 .lock')||''), true);
  c('…nothing of the library or the map is fetched', P.w.__fetched.filter(u=>/^\/ideas\//.test(u)), []);
}); T.done(); })();
