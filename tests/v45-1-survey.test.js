// v10.45.1 — the pastor's look at the live survey (5 Oct 2026), one check (or a few) per thing he asked for:
//   "it should be right after the community … survey" · "you don't need the thing that says your church's information is on the
//   spiritual gifts page … nothing to fill-in … English only at home, born abroad … don't need to be there either" · "what the
//   community needs … more robust with information and I really like the circular graphs with the colors" · "there's no
//   differentiation between Ministry ideas to meet the need and what the community needs … it's all mush together" · "when I click
//   down below under also here … it jumps to the top" · "the spiritual gifts is always highlighted … nothing stays highlighted".
// Written failing-first against v10.45.0.
const fs=require('fs'), path=require('path');
const {ROOT,sleep,checker,page,ready,survey,openNeed}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the needs follow the report, and nothing above them but the heading and the verse --');
  const P=page({needs:'file'}); await ready(P); survey(P); await sleep(60);
  const n=P.q('#u-needs'), h2=e=>e&&e.querySelector('h2')?e.querySelector('h2').textContent:null;
  // v10.46.1 — the pastor: "should go after community resources should be at the bottom" (v10.45.1 had it after Churches nearby)
  c('in #sections, at the bottom: after Community resources', [n.parentElement.id,h2(n.previousElementSibling)], ['sections','Community resources']);
  c('…and it stays there after a scope change (the same node, moved into its slot)', (P.E('SCOPE="cousub"; render()'),[P.q('#u-needs')===n,n.parentElement.id,h2(n.previousElementSibling)]), [true,'sections','Community resources']);
  c('nothing of the survey\'s own comes after it but What\'s next (Make the Case\'s section is another tool\'s)', [...P.qa('#sections > section.blk')].slice([...P.qa('#sections > section.blk')].indexOf(n)+1).filter(x=>!x.classList.contains('offtab')).map(x=>x.querySelector('h2').textContent).filter(t=>t!=='What’s next'), []);
  P.E('SCOPE="tract"; render()');
  c('no language strip, no note, no Spiritual Gifts link', [P.qa('#u-needs .ns-strip').length,P.qa('#u-needs .ns-nofill').length,P.qa('#u-needs [data-gf-church]').length], [0,0,0]);
  c('the chip bar names it once, in its place', (b=>[b.indexOf('Needs')===b.indexOf('Community resources')+1,b.filter(x=>x==='Needs').length])(P.qa('#secnav button').map(x=>x.textContent)), [true,1]);

  console.log('\n-- an opened need: the figures as rings, what helps, where to begin, the question --');
  await openNeed(P,'rent50');
  const A='#u-needs [data-need="rent50"]';
  c('its figures as the report draws them: a ring each, the value, the words', [P.qa(A+' .ns-figs .stat svg.ring').length,P.qa(A+' .ns-figs .statlab').map(x=>x.textContent)], [3,['Renters paying half or more','Renters paying 30% or more','Households renting']]);
  c('in the kind\'s colour (housing is blue)', P.qa(A+' .ns-figs .stat').map(x=>x.getAttribute('style')), ['--hue:var(--m-housing)','--hue:var(--m-housing)','--hue:var(--m-housing)']);
  c('against the county: a notch on the ring and the words', [P.qa(A+' .ns-figs .ring line.cmp').length,P.qa(A+' .ns-figs .statcmp').every(x=>/vs county|about the county/.test(x.textContent))], [3,true]);
  c('the key says what the ring and the mark are', P.txt(A+' .ns-figs .statkey'), 'Each ring is this neighborhood; the mark on it is the county.');
  c('what helps, for the kind of need', /^What helps Housing stress runs on a clock/.test(P.txt(A+' .ns-help')), true);
  c('then where to begin (the steps) and the question to ask first', [P.txt(A+' .ns-detail h5'),P.qa(A+' .ns-detail li').length>=2,!!P.q(A+' .ns-ask')], ['Where to begin',true,true]);
  c('only the open need draws its rings', P.qa('#u-needs .ns-need:not(.open) .ns-figs').length, 0);
  await openNeed(P,'lang-primary');
  c('a language need: the language and its limited English, then where neighbors born abroad come from',
    [P.qa('#u-needs [data-need="lang-primary"] .ns-figs .statlab').map(x=>x.textContent).slice(0,2),/^Where neighbors born abroad come from: /.test(P.txt('#u-needs [data-need="lang-primary"] .ns-born'))],
    [['Speak Spanish at home','Of them, limited English'],true]);
  c('every rule has its figures named, and every figure exists in the definitions', P.E(`(()=>{ const ids=[...RULES,...RULES_MORE].map(r=>r.id).filter(id=>!['shift-race','growth'].includes(id));
    const miss=ids.filter(id=>!NS_FIGS[id]); const bad=Object.values(NS_FIGS).flat().filter(k=>!['@lang','@langLow'].includes(k)&&!NS_FIG_DEF[k]); return JSON.stringify([miss,bad]); })()`), '[[],[]]');
  c('…each definition in English and Spanish, with a kind of figure', P.E(`Object.values(NS_FIG_DEF).every(d=>d[0]&&d[1]&&['hardship','housing','children','people','language'].includes(d[2]))`), true);
  c('what helps exists in both languages for every kind of need', P.E(`[...new Set([...RULES,...RULES_MORE].map(r=>r.cat))].every(k=>NS_HELP[k]&&NS_HELP[k][0]&&NS_HELP[k][1])`), true);

  console.log('\n-- the ideas: a section of their own --');
  await openNeed(P,'rent50',true);
  c('the button and the list sit in their own framed section, after the need\'s detail', [!!P.q(A+' .ns-ideasec [data-ns-show]'),!!P.q(A+' .ns-ideasec .ns-ideas'),P.q(A+' .ns-ideasec').previousElementSibling.className], [true,true,'ns-detail']);
  c('…in the theme\'s mint, not the need\'s colour', /\.ns-ideasec\{--k:var\(--acc\)/.test(HTML), true);

  console.log('\n-- v10.46.1: the three lifts across the top, one list open at a time --');
  // "light lift moderate lift and heavy lift across the top bar … I click light lift it essentially opens up … if I press moderate lift
  // it makes moderate lift the whole thing … they will all be closed so just those three are seen"
  const I='#ns-i-rent50';
  const tabs=()=>P.qa(I+' .ns-ltab').map(b=>[b.dataset.nsLift,b.getAttribute('aria-expanded')]), shown=()=>P.qa(I+' .ns-lift').filter(x=>!x.hidden).map(x=>x.dataset.lift);
  c('three buttons across the top, each with its count; every list closed at first', [P.qa(I+' .ns-ltabs > .ns-ltab').length,P.qa(I+' .ns-ltab small').every(x=>/^\d+ ideas?$/.test(x.textContent)),tabs().map(x=>x[1]),shown()], [3,true,['false','false','false'],[]]);
  P.q(I+' [data-ns-lift="light"]').click();
  c('Light lift: its list opens, the others stay closed', [tabs().map(x=>x[1]),shown()], [['true','false','false'],['light']]);
  P.q(I+' [data-ns-lift="moderate"]').click();
  c('Moderate lift: the list switches', [tabs().map(x=>x[1]),shown()], [['false','true','false'],['moderate']]);
  P.q(I+' [data-ns-lift="moderate"]').click();
  c('tap the open one again: all closed, the three buttons only', [tabs().map(x=>x[1]),shown()], [['false','false','false'],[]]);
  P.q(I+' [data-ns-lift="heavy"]').click(); P.E('nsIdeasRedraw()');
  c('a redraw keeps the lift he chose', shown(), ['heavy']);
  c('each button names the list it opens', P.qa(I+' .ns-ltab').every(b=>P.q('#'+b.getAttribute('aria-controls'))&&P.q('#'+b.getAttribute('aria-controls')).dataset.lift===b.dataset.nsLift), true);
  P.q(I+' [data-ns-lift="heavy"]').click();

  console.log('\n-- a tap stays under the pointer --');
  c('opening a need keeps its head where it was (scrollBy the shift), and jumps only when asked', P.E(`(f=>f.includes('window.scrollBy(0,after-before)')&&/if\\(o\\.jump\\) a\\.scrollIntoView/.test(f))(nsOpenCard.toString())`), true);
  // a real shift: open the first need, then an "Also here" row below it, with the layout faked (jsdom has none)
  { const W=P.w; const calls=[]; W.scrollBy=(x,y)=>calls.push(y);
    P.qa('#u-needs .ns-need.open .ns-head').forEach(h=>h.click());
    const firstCard=P.q('#u-needs .ns-list .ns-need'); firstCard.querySelector('.ns-head').click();
    const also=P.q('#u-needs .ns-alsorow'), head=also.querySelector('.ns-head');
    // while the first need is open the row sits 300px lower; closing it (which opening the row does) lifts the row by 300
    head.getBoundingClientRect=()=>{ const t=firstCard.classList.contains('open')?500:200; return {top:t,bottom:t+40,left:0,right:0,width:0,height:40}; };
    W.__scrolled.length=0; head.click();
    c('an "Also here" row opened under an open need: the page moves back by the shift, the row is not pulled to the top',
      [also.classList.contains('open'),firstCard.classList.contains('open'),calls.slice(-1)[0],W.__scrolled.length], [true,false,-300,0]); }

  console.log('\n-- Spanish --');
  const S=page({needs:'file',lang:'es'}); await ready(S); survey(S); await sleep(60);
  await openNeed(S,'rent50');
  c('the rings, what helps and where to begin in Spanish', [S.qa('#u-needs [data-need="rent50"] .ns-figs .statlab').map(x=>x.textContent)[0],/^Lo que ayuda La presión de la vivienda/.test(S.txt('#u-needs [data-need="rent50"] .ns-help')),S.txt('#u-needs [data-need="rent50"] .ns-detail h5'),S.txt('#u-needs [data-need="rent50"] .statkey')],
    ['Inquilinos que pagan la mitad o más',true,'Por dónde empezar','Cada anillo es este vecindario; la marca sobre él es el condado.']);
  c('the Brief chip in Spanish', S.txt('#secnav button[data-t="brief"]'), 'Resumen');
  c('no page error along the way', [P.errs,S.errs], [[],[]]);
}); await T.sec(async()=>{
  console.log('\n-- the hub: nothing lit at rest; the card under the pointer lights --');
  const css=HTML.slice(0,HTML.indexOf('</style>'));
  c('no tool\'s halo or icon breathes in turn any more', [/animation:toolBreathe/.test(css),/animation:iconBreathe/.test(css)], [false,false]);
  const rest=(/\.tool::before\{[^}]*\}/.exec(css)||[''])[0];
  c('at rest every halo is the same quiet glow', [/opacity:\.22/.test(rest),/--td/.test(rest)], [true,false]);
  c('"Your path": the next step (Spiritual Gifts, once the church is mapped) is not lit at rest; hover lights a step', [/\.hp-step\.now\{/.test(css),/hpBreathe/.test(css),/\.hp-step:hover\{border-color:var\(--hc\)/.test(css)], [false,false,true]);
  c('hover (on a computer) and keyboard focus light it', [/@media \(hover:hover\)\{[\s\S]*?\.tool:hover::before\{opacity:1/.test(css),/\.tool:focus-visible::before\{opacity:1\}/.test(css)], [true,true]);
}); T.done(); })();
