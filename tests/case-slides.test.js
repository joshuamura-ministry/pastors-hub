// Phone slide renderer (tdeck) — jsdom suite. Structure, escaping, the QR
// sanitiser, the follow / present / browse state machines, the "I'm in"
// form, limits, Spanish, and static checks on the CSS (snap, floors, no
// motion, contrast). jsdom does no layout: fitting and scrolling are checked
// in Chrome by behave.mjs.
// v10.39.0: moved here from the staged slides.test.js; the renderer and its CSS
// are now read from index.html (between their MAKE THE CASE markers), and the
// staged demo decks travel as case-slides-decks.js. One addition at the end of
// "limits": a comparison with no margin of error gets no verdict (the one change
// made to the renderer when it was pasted in).
const path=require('path'), fs=require('fs');
const {JSDOM}=require('jsdom');
const APP=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const between=(a,b)=>{ const i=APP.indexOf(a), j=APP.indexOf(b,i+1); if(i<0||j<0) throw new Error('marker missing: '+a); return APP.slice(i,j); };
const JS=between('/* ================= MAKE THE CASE: THE PHONE SLIDES (v10.39.0)','/* ================= /MAKE THE CASE: THE PHONE SLIDES');
const CSS=between('/* ===== MAKE THE CASE · PHONE SLIDES (tdeck renderer, v10.39.0)','/* ===== MAKE THE CASE · THE SCREENS');
const DEMO=fs.readFileSync(path.join(__dirname,'case-slides-decks.js'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const dom=new JSDOM('<!doctype html><html><body><div id="h"></div></body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://pastorshub.org/'});
const w=dom.window, d=w.document;
w.eval(JS); w.eval(DEMO);
const E=s=>w.eval(s);
const host=()=>{ const h=d.createElement('div'); d.body.appendChild(h); return h; };
const key=(k,o={})=>w.dispatchEvent(new w.KeyboardEvent('keydown',Object.assign({key:k,bubbles:true,cancelable:true},o)));
const txt=el=>el?el.textContent.replace(/ /g,' '):null;

(async()=>{
  // ---- source rules -----------------------------------------------------------
  c('no innerHTML / outerHTML / insertAdjacentHTML / document.write in slides.js',
    /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(JS.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'')), false);
  c('no import/export (pasteable into index.html)', /^\s*(import|export)\s/m.test(JS), false);
  c('entry points are globals', E('[typeof tdeckRender,typeof tdeckMeasure,typeof tdQRNode]'), ['function','function','function']);

  // ---- every demo deck renders, EN and ES -----------------------------------
  const decks=E('demoDecks()');
  for(const k of ['board','team','congregation']) for(const lang of ['en','es']){
    const deck=decks[k][lang], h=host();
    let ctl=null, err=null; try{ ctl=w.tdeckRender(deck,h,{mode:'browse',keys:false}); }catch(e){ err=e.message; }
    c(`${k}/${lang}: renders without error`, err, null);
    const secs=[...h.querySelectorAll('section.td-slide')];
    c(`${k}/${lang}: one section per slide`, secs.length, deck.slides.length);
    c(`${k}/${lang}: every slide has frame, main and footer "i / n"`, secs.every((s,i)=>s.querySelector('.td-frame>.td-main')&&txt(s.querySelector('.td-fn'))===`${i+1} / ${secs.length}`), true);
    c(`${k}/${lang}: root lang`, h.firstChild.lang, lang);
    c(`${k}/${lang}: no "undefined", "NaN", "null" or "[object" in the text`, /undefined|NaN|\bnull\b|\[object/.test(h.textContent), false);
    c(`${k}/${lang}: ≤ 12 slides (spec)`, deck.slides.length<=12, true);
    c(`${k}/${lang}: deck JSON ≤ 64 KB, strings ≤ 400`, JSON.stringify(deck).length<=65536 && (function walk(v){ return typeof v==='string'?v.length<=400:v&&typeof v==='object'?Object.values(v).every(walk):true; })(deck), true);
    ctl.destroy();
    c(`${k}/${lang}: destroy removes the deck`, h.children.length, 0);
  }

  // ---- hostile deck: markup stays text -----------------------------------------
  {
    const h=host(), deck=E('demoHostileDeck()');
    const ctl=w.tdeckRender(deck,h,{mode:'follow',presenter:0,keys:false,onRespond:()=>Promise.resolve(),
      qrSvg:'<svg viewBox="0 0 10 10" onload="window.__pwned=3"><script>window.__pwned=4</script><rect width="10" height="10" fill="#fff"/></svg>'});
    const tags=[...new Set([...h.querySelectorAll('*')].map(e=>e.localName))].sort();
    c('hostile: no img / script / iframe / foreignObject / a / image elements', tags.filter(t=>/^(img|script|iframe|foreignobject|a|image|object|embed|style|link)$/i.test(t)), []);
    c('hostile: no on* attributes anywhere', [...h.querySelectorAll('*')].some(e=>[...e.attributes].some(a=>/^on/i.test(a.name))), false);
    c('hostile: no javascript: anywhere in attributes', [...h.querySelectorAll('*')].some(e=>[...e.attributes].some(a=>/javascript:/i.test(a.value))), false);
    c('hostile: the markup shows as text', h.textContent.includes('<img src=x onerror="window.__pwned=1">'), true);
    c('hostile: no canary fired', w.__pwned||0, 0);
    c('hostile: bad hue falls back to mint', h.querySelectorAll('section')[1].style.getPropertyValue('--hue'), 'var(--td-acc)');
    c('hostile: unknown types render a placeholder, keeping the index', [...h.querySelectorAll('section')].slice(8,10).map(s=>s.textContent.includes('newer version of Terrain')), [true,true]);
    c('hostile: "__proto__" / "constructor" option keys become "help"', [...h.querySelectorAll('section')[7].querySelectorAll('.td-opt')].map(b=>b.dataset.k), ['help','help']);
    c('hostile: NaN / Infinity never printed', /NaN|Infinity/.test(h.textContent), false);
    // On a member's phone (follow) the join slide welcomes and passes the code on (v10.39 review E2E-10).
    c('hostile: code6 reduced to A–Z 0–9 (a member’s join slide passes it on)', txt(h.querySelector('.td-codeshare')), 'Code B · share it with a neighbour');
    c('…and a member’s join slide has no QR code and no "scan" prompt', [h.querySelectorAll('.td-qrtile').length,/Scan to follow/.test(h.textContent)], [0,false]);
    c('hostile: dots capped at 100', h.querySelectorAll('section')[1].querySelectorAll('.td-dots circle').length, 100);
    ctl.destroy();
    // The same deck and the same hostile QR drawing on the presenter's screen (present mode).
    const hp=host(), cp=w.tdeckRender(deck,hp,{mode:'present',keys:false,
      qrSvg:'<svg viewBox="0 0 10 10" onload="window.__pwned=3"><script>window.__pwned=4</script><rect width="10" height="10" fill="#fff"/></svg>'});
    const tagsP=[...new Set([...hp.querySelectorAll('*')].map(e=>e.localName))].sort();
    c('hostile (presenter): no img / script / iframe / foreignObject / a / image elements', tagsP.filter(t=>/^(img|script|iframe|foreignobject|a|image|object|embed|style|link)$/i.test(t)), []);
    c('hostile (presenter): no on* attributes, no javascript:, no canary', [[...hp.querySelectorAll('*')].some(e=>[...e.attributes].some(a=>/^on/i.test(a.name)||/javascript:/i.test(a.value))),w.__pwned||0], [false,0]);
    c('hostile (presenter): code6 reduced to A–Z 0–9', txt(hp.querySelector('.td-code')), 'B');
    c('hostile (presenter): javascript: qrUrl gives no host', txt(hp.querySelector('.td-codelab')), 'Or enter this code');
    cp.destroy();
  }

  // ---- the QR code --------------------------------------------------------------
  {
    const evil='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" onload="x()"><script>alert(1)</script>'+
      '<rect width="29" height="29" fill="#ffffff" onclick="x()"/><path d="M4 4h7v1h-7z" fill="#000000" style="fill:red"/>'+
      '<path d="javascript:alert(1)" fill="#000"/><rect width="1" height="1" fill="url(javascript:1)"/>'+
      '<a href="javascript:1"><rect x="5" y="5" width="1" height="1" fill="#000"/></a><image href="x.png"/><foreignObject><div>x</div></foreignObject></svg>';
    const n=E(`tdQRNode(${JSON.stringify(evil)},null,'QR')`);
    c('QR: sanitised to svg + rect + path only', [...n.querySelectorAll('*')].map(e=>e.localName), ['rect','path','rect']);
    c('QR: only allow-listed attributes survive', [...n.querySelectorAll('*')].every(e=>[...e.attributes].every(a=>/^(x|y|width|height|fill|d)$/.test(a.name))), true);
    c('QR: viewBox kept, role img, label', [n.getAttribute('viewBox'),n.getAttribute('role'),n.getAttribute('aria-label')], ['0 0 29 29','img','QR']);
    c('QR: bad viewBox refused', E(`tdQRNode('<svg viewBox="0 0 x 10"><rect width="1" height="1"/></svg>')`), null);
    c('QR: not SVG refused', E(`tdQRNode('<html><rect/></html>')`), null);
    c('QR: broken XML refused', E(`tdQRNode('<svg viewBox="0 0 1 1"><img src=x onerror=alert(1)></svg>')`), null);
    // the app's own gfQRSvg output (index.html 10690) passes through intact
    const rows=['1110111','1010101','1110111','0001000','1110111','1010101','1110111'];
    const gf=(()=>{ const n=rows.length,q=4,size=n+2*q; let dd=''; rows.forEach((row,r)=>{ for(let x=0;x<n;){ if(row[x]!=='1'){x++;continue;} let e=x; while(e<n&&row[e]==='1') e++; dd+=`M${x+q} ${r+q}h${e-x}v1h${x-e}z`; x=e; } });
      return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR &amp; code"><rect width="${size}" height="${size}" fill="#ffffff"/><path d="${dd}" fill="#000000"/></svg>`,d:dd}; })();
    const g=E(`tdQRNode(${JSON.stringify(gf.svg)})`);
    c('QR: gfQRSvg output keeps its path', g&&g.querySelector('path').getAttribute('d'), gf.d);
    const r=E(`tdQRNode(null,${JSON.stringify(rows)})`);
    c('QR: rows draw the same path', r&&r.querySelector('path').getAttribute('d'), gf.d);
    c('QR: ragged rows refused', E(`tdQRNode(null,['101','10'])`), null);
    const h=host(); w.tdeckRender({lang:'en',slides:[{type:'join',qrUrl:'https://pastorshub.org/#watch=AAAAAAAAAAAAAAAAAAAAAA',code6:'k7m2qx'}]},h,{keys:false});
    c('join without a QR: code still shown, big', [txt(h.querySelector('.td-code')),h.querySelector('.td-noqr')!=null,txt(h.querySelector('.td-codelab'))], ['K7M2QX',true,'Or enter this code at pastorshub.org']);
  }

  // ---- follow: the member's phone ----------------------------------------------------
  {
    const h=host(), deck=decks.board.en;
    const ctl=w.tdeckRender(deck,h,{mode:'follow',presenter:3,keys:false});
    const pill=h.querySelector('.td-pill'), root=h.firstChild;
    c('follow: a late joiner lands on the presenter’s slide', [ctl.index(),ctl.following(),pill.hidden,root.classList.contains('td-on')], [3,true,true,true]);
    ctl.go(1);
    c('follow: member moves away → pill "You: 2 · Presenter: 4 · Back to live"', [ctl.following(),pill.hidden,txt(pill.querySelector('.td-ptx')),txt(pill.querySelector('.td-pback'))], [false,false,'You: 2 · Presenter: 4','Back to live']);
    c('follow: while away the Live mark is off', root.classList.contains('td-on'), false);
    ctl.setIndex(5);
    c('follow: presenter moves while member is away → member stays, pill updates', [ctl.index(),txt(pill.querySelector('.td-ptx'))], [1,'You: 2 · Presenter: 6']);
    ctl.go(5);
    c('follow: landing on the presenter’s slide re-joins', [ctl.following(),pill.hidden], [true,true]);
    ctl.setIndex(7);
    c('follow: then the presenter’s next move is applied instantly', ctl.index(), 7);
    ctl.go(0); pill.querySelector('.td-pback').click();
    c('follow: Back to live jumps to the presenter and follows', [ctl.index(),ctl.following(),pill.hidden], [7,true,true]);
    ctl.go(2); ctl.setIndex(2);
    c('follow: presenter arriving on the member’s slide re-joins', [ctl.following(),pill.hidden], [true,true]);
    ctl.setIndex(99);
    c('follow: out-of-range index is clamped', ctl.index(), deck.slides.length-1);
    ctl.setIndex('4'); ctl.setIndex(NaN);
    c('follow: non-numbers ignored', ctl.presenter(), deck.slides.length-1);
    ctl.setEnded(true);
    c('follow: ended → no pill, no Live mark', [pill.hidden,root.classList.contains('td-on'),root.classList.contains('td-ended')], [true,false,true]);
    ctl.destroy();
    const h2=host(), c2=w.tdeckRender(decks.team.es,h2,{mode:'follow',presenter:6,start:1,keys:false});
    c('follow ES: "Usted: 2 · Presentador: 7" and "Seguir en vivo" (v10.39 review V11: "Volver" alone read as "back a slide")', [txt(h2.querySelector('.td-ptx')),txt(h2.querySelector('.td-pback'))], ['Usted: 2 · Presentador: 7','Seguir en vivo']);
    c2.destroy();
    const h3=host(), c3=w.tdeckRender(deck,h3,{mode:'follow',keys:false});
    c('follow: before the presenter starts, free browsing, no pill', [c3.index(),h3.querySelector('.td-pill').hidden], [0,true]);
    c3.go(4); c3.setIndex(2);
    c('follow: first presenter index pulls a browsing member in', c3.index(), 2);
    c3.destroy();
  }

  // ---- present: the presenter ---------------------------------------------------------
  {
    const h=host(), seen=[]; let ended=0;
    const ctl=w.tdeckRender(decks.board.en,h,{mode:'present',opened:23,onIndex:i=>seen.push(i),onEnd:()=>ended++});
    const bar=h.querySelector('.td-bar');
    c('present: bar reads "Live · 1 of 10 · 23 opened · End"', [txt(bar.querySelector('.td-blive')),txt(bar.querySelector('.td-bpos')),txt(bar.querySelector('.td-bopen')),txt(bar.querySelector('.td-bend'))], ['Live','1 of 10','23 opened','End']);
    c('present: reports the start index', seen, [0]);
    key('ArrowDown'); key('PageDown'); key(' '); key('ArrowRight'); key('ArrowUp'); key(' ',{shiftKey:true}); key('End'); key('Home'); key('PageUp');
    c('present: arrows, Space, Page Up/Down, Home/End move one slide at a time and report', seen, [0,1,2,3,4,3,2,9,0]);
    c('present: bar follows', txt(bar.querySelector('.td-bpos')), '1 of 10');
    key('ArrowDown',{metaKey:true}); key('x');
    c('present: modified keys and other keys ignored', seen.length, 9);
    const inp=d.createElement('input'); d.body.appendChild(inp); inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
    c('present: keys typed in a field are ignored', seen.length, 9); inp.remove();
    ctl.setOpened(24); ctl.setLive(false);
    c('present: opened count and live state update', [txt(bar.querySelector('.td-bopen')),txt(bar.querySelector('.td-blive'))], ['24 opened','Not live']);
    c('present: "Not live" greys the dot as well as the word (class off)', bar.querySelector('.td-blive').classList.contains('off'), true);
    ctl.setLive(true);
    c('present: live again → class off removed', bar.querySelector('.td-blive').classList.contains('off'), false);
    ctl.setLive(false);
    const end=bar.querySelector('.td-bend'); end.click();
    c('present: End needs a second tap', [ended,txt(end)], [0,'Tap again to end']);
    c('present: while armed the bar is marked td-armed (the opened count steps aside for the longer label)', bar.classList.contains('td-armed'), true);
    end.click();
    c('present: second tap ends', [ended,txt(end),bar.classList.contains('td-armed')], [1,'End',false]);
    c('present: yes slide is not a form for the presenter', [h.querySelectorAll('button.td-opt').length,h.querySelector('.td-name')], [0,null]);
    ctl.destroy(); key('ArrowDown');
    c('present: no keys after destroy', seen.length, 9);
    const h2=host(), c2=w.tdeckRender(decks.team.es,h2,{mode:'present',keys:false});
    c('present ES: "En vivo · 1 de 9", unknown opened hidden, "Terminar"', [txt(h2.querySelector('.td-blive')),txt(h2.querySelector('.td-bpos')),h2.querySelector('.td-bopen').hidden,txt(h2.querySelector('.td-bend'))], ['En vivo','1 de 9',true,'Terminar']);
    c('present ES: yes slide tells members to answer on their phones', h2.textContent.includes('Los miembros responden en sus propios teléfonos.'), true);
    c2.setLive(false);
    c('present ES: not live reads "No en vivo" (the deck is still reachable; it is not offline)', txt(h2.querySelector('.td-blive')), 'No en vivo');
    c('slides are a named region (aria-roledescription has a role to describe)', [h2.querySelector('.td-scroller').getAttribute('role'),!!h2.querySelector('.td-scroller').getAttribute('aria-label')], ['region',true]);
    c('the Live mark sits in each footer beside the number, never beside the kicker', [h2.querySelectorAll('.td-top .td-live').length,h2.querySelectorAll('.td-foot .td-fr .td-live').length], [0,9]);
    c2.destroy();
    const h5=host(), c5=w.tdeckRender(decks.team.es,h5,{mode:'browse',contained:true});
    c('contained (no window keys): the scroller is a Tab stop so the keyboard can still move', h5.querySelector('.td-scroller').tabIndex, 0);
    c5.destroy();
  }

  // ---- browse ---------------------------------------------------------------------------------
  {
    const h=host(), ctl=w.tdeckRender(decks.congregation.en,h,{mode:'browse',start:3,keys:false});
    c('browse: no bar, no pill, starts where asked', [h.querySelector('.td-bar'),h.querySelector('.td-pill'),ctl.index()], [null,null,3]);
    ctl.destroy();
  }

  // ---- "I'm in" ----------------------------------------------------------------------------------
  // v10.39.0, the presenting step (design change): the "I am 18 or older" tick became a
  // question asked once an answer is picked ("Are you 18 or older?" Yes / No). Under 18:
  // a kind word instead of the form, and nothing is sent. Then the first name and, if
  // wanted, a note; onRespond gets {k,name,note,adult}. A refusal's own words (e.tdMsg)
  // are shown. Updated here to that design.
  {
    const h=host(), got=[];
    const ctl=w.tdeckRender(decks.team.en,h,{mode:'follow',presenter:8,keys:false,onRespond:x=>{ got.push(x); return Promise.resolve(); }});
    const sec=h.querySelectorAll('section')[8], opts=[...sec.querySelectorAll('button.td-opt')], name=sec.querySelector('.td-name:not(.td-note)'), send=sec.querySelector('.td-send'), age=sec.querySelector('.td-age');
    const frow=name.closest('.td-frow'), addNote=sec.querySelector('.td-addnote');
    c('yes: three option buttons, lead / help / pray', opts.map(b=>b.dataset.k), ['lead','help','pray']);
    c('yes: options are a named group', [sec.querySelector('.td-yes').getAttribute('role'),sec.querySelector('.td-yes').getAttribute('aria-label')], ['group','Choose one']);
    c('yes: colours follow the gifts families (Leadership amber, Helps blue, Intercession purple)', opts.map(b=>b.style.getPropertyValue('--hue')), ['var(--td-hardship)','var(--td-housing)','var(--td-children)']);
    c('yes: first name limited to 40, send disabled at first', [name.maxLength,send.disabled], [40,true]);
    c('yes: before an answer is picked, only the privacy line shows', [age.hidden,frow.hidden,addNote.hidden,txt(sec.querySelector('.td-yesmsg'))], [true,true,true,'Only the pastor sees your answer.']);
    opts[1].click();
    c('yes: picking asks the age first', [age.hidden,txt(sec.querySelector('.td-agq')),[...age.querySelectorAll('button')].map(b=>b.textContent),frow.hidden,age.getAttribute('role')], [false,'Are you 18 or older?',['Yes','No'],true,'group']);
    age.querySelectorAll('button')[0].click();
    c('yes: 18 or older → the name row and "Add a note"; send still waits for a name', [age.hidden,frow.hidden,addNote.hidden,send.disabled], [true,false,false,true]);
    name.value='Ana'; name.dispatchEvent(new w.Event('input'));
    c('yes: pressed state and send enabled', [opts[1].getAttribute('aria-pressed'),opts[0].getAttribute('aria-pressed'),send.disabled], ['true','false',false]);
    addNote.click(); const note=sec.querySelector('.td-note');
    c('yes: "Add a note" opens a note of up to 200 characters', [note.closest('.td-nrow').hidden,note.maxLength,addNote.hidden], [false,200,true]);
    note.value='  Tuesdays only ';
    send.click(); await new Promise(r=>setTimeout(r,10));
    c('yes: onRespond gets {k,name,note,adult}', got, [{k:'help',name:'Ana',note:'Tuesdays only',adult:true}]);
    c('yes: thank-you, privately', txt(sec.querySelector('.td-yesdone')), 'Thank you, Ana. Only the pastor sees this.');
    c('yes: options locked after sending', opts.every(b=>b.disabled), true);
    ctl.destroy();
    { const hm=host(), sent=[]; const cm=w.tdeckRender(decks.team.en,hm,{mode:'follow',presenter:8,keys:false,onRespond:x=>{ sent.push(x); return Promise.resolve(); }});
      const sm=hm.querySelectorAll('section')[8]; sm.querySelector('button.td-opt').click(); sm.querySelector('.td-age').querySelectorAll('button')[1].click();
      c('yes: under 18 → a kind word, no form, options locked, nothing sent', [!!sm.querySelector('.td-minor'),sm.querySelector('.td-name'),[...sm.querySelectorAll('button.td-opt')].every(b=>b.disabled),sent.length], [true,null,true,0]);
      c('…in plain words', txt(sm.querySelector('.td-minor')), 'Thank you for wanting to help. These answers are for adults, so please tell your youth leader or the pastor in person.');
      cm.destroy(); }
    { const hs=host(); const cs=w.tdeckRender(decks.team.es,hs,{mode:'follow',presenter:8,keys:false,onRespond:()=>Promise.resolve()});
      const ss=hs.querySelectorAll('section')[8]; ss.querySelector('button.td-opt').click();
      c('yes (es): the age question in Spanish', [txt(ss.querySelector('.td-agq')),[...ss.querySelectorAll('.td-agebtn')].map(b=>b.textContent),ss.querySelector('.td-addnote').textContent], ['¿Tiene 18 años o más?',['Sí','No'],'Añadir una nota']);
      cs.destroy(); }
    const h2=host(), c2=w.tdeckRender(decks.team.en,h2,{mode:'follow',keys:false,ageGate:false,onRespond:()=>Promise.reject(new Error('x'))});
    const s2=h2.querySelectorAll('section')[8];
    s2.querySelector('button.td-opt').click();
    c('yes: ageGate:false asks no age: the name row follows the pick', [s2.querySelector('.td-age').hidden,s2.querySelector('.td-frow').hidden], [true,false]);
    const n2=s2.querySelector('.td-name'); n2.value='<b>Jo</b>'; n2.dispatchEvent(new w.Event('input'));
    s2.querySelector('.td-send').click(); await new Promise(r=>setTimeout(r,10));
    c('yes: a failed send says so and can be retried', [txt(s2.querySelector('.td-yesmsg')),s2.querySelector('.td-send').disabled], ['It could not be sent. Please try again.',false]);
    c2.destroy();
    { const h5=host(), c5=w.tdeckRender(decks.team.en,h5,{mode:'follow',keys:false,ageGate:false,onRespond:()=>{ const e=new Error('bad-name'); e.tdMsg='Please write just your first name, in letters.'; return Promise.reject(e); }});
      const s5=h5.querySelectorAll('section')[8]; s5.querySelector('button.td-opt').click();
      const n5=s5.querySelector('.td-name'); n5.value='12'; n5.dispatchEvent(new w.Event('input')); s5.querySelector('.td-send').click(); await new Promise(r=>setTimeout(r,10));
      c('yes: a refusal with its own words says them', txt(s5.querySelector('.td-yesmsg')), 'Please write just your first name, in letters.');
      c5.destroy(); }
    const h3=host(), c3=w.tdeckRender(decks.team.en,h3,{mode:'follow',keys:false});
    c('yes: no handler → no form', [h3.querySelectorAll('button.td-opt').length,h3.querySelector('.td-name')], [0,null]);
    c3.destroy();
    const h4=host(), dk=JSON.parse(JSON.stringify(decks.team.en)); dk.slides[8].respond=false;
    const c4=w.tdeckRender(dk,h4,{mode:'follow',keys:false,onRespond:()=>Promise.resolve()});
    c('yes: respond:false (e.g. under-18 audience) → no form', [h4.querySelectorAll('button.td-opt').length,h4.querySelector('.td-name')], [0,null]);
    c4.destroy();
  }

  // ---- limits, formats, words --------------------------------------------------------------------
  {
    const h=host(), many=n=>Array.from({length:n},(_,i)=>['L'+i,'V'+i]);
    const deck={lang:'en',church:'X',slides:[
      {type:'motion',headline:'m',rows:many(9)},{type:'ask',headline:'a',rows:many(9)},{type:'risks',headline:'r',items:Array(9).fill('x')},
      {type:'trio',headline:'t',items:Array(5).fill({value:'1',label:'x',hue:'people'})},{type:'roles',headline:'r',roles:Array(6).fill({title:'t',hours:'1 h',text:'x'})},
      {type:'capacity',headline:'c',rows:[{label:'Money',need:125,have:2500,unit:'$'},{label:'Hours',need:50,have:250,unit:'h'},{label:'People',need:8,have:5,unit:''},{label:'x',need:1,have:2},{label:'y',need:1,have:2}],gaps:['Short by 3 volunteers']},
      {type:'stat',headline:'s',value:'19',unit:'%',hue:'hardship',compare:{here:19.4,county:7.1,label:'Bucks County',sig:false,moe:4}},
      {type:'stat',headline:'s',value:'4',unit:'%',compare:{here:4,county:9,sig:true}},
      {type:'timeline',headline:'t',steps:Array(5).fill({date:'1 Oct',title:'x',text:'y'})},
      {type:'headline-less'},{type:'verse',text:'In the beginning',ref:'Genesis 1:1',version:'KJV'},
      {type:'close',headline:'x'.repeat(900),text:'y'}]};
    w.tdeckRender(deck,h,{keys:false});
    const S=[...h.querySelectorAll('section')];
    c('limits: motion ≤ 5 rows, ask ≤ 7, risks ≤ 6, trio 3, roles ≤ 4, capacity ≤ 4, timeline 3',
      [S[0].querySelectorAll('.td-lrow').length,S[1].querySelectorAll('.td-lrow').length,S[2].querySelectorAll('li').length,S[3].querySelectorAll('.td-tcard').length,S[4].querySelectorAll('.td-role').length,S[5].querySelectorAll('.td-crow').length,S[8].querySelectorAll('li').length],[5,7,6,3,4,4,3]);
    c('capacity: "$125 of $2,500", "50 h of 250 h", short row amber', [txt(S[5].querySelectorAll('.td-cfig')[0]),txt(S[5].querySelectorAll('.td-cfig')[1]),S[5].querySelectorAll('.td-crow')[2].classList.contains('gap')], ['$125 of $2,500','50 h of 250 h',true]);
    c('capacity: gaps listed under "Still to settle"', txt(S[5].querySelector('.td-note.warn')), 'Still to settleShort by 3 volunteers');
    c('stat: not significant → "Similar to the county", with the margin', [txt(S[6].querySelector('.td-vchip')),txt(S[6].querySelector('.td-moe')),S[6].querySelector('.td-verdict.sig')], ['Similar to the county','±4 pts',null]);
    c('stat: significant and lower → "Lower than the county"', txt(S[7].querySelector('.td-vchip')), 'Lower than the county');
    { const u=host(); w.tdeckRender({slides:[{type:'stat',value:'27',unit:'%',compare:{here:27,county:20,sig:false,moe:null}},{type:'stat',value:'27',unit:'%',compare:{here:27,county:20,sig:false}}]},u,{keys:false});
      c('stat: no margin of error and not significant → untested: the two bars, no verdict (not "Similar")', [...u.querySelectorAll('section')].map(s=>[s.querySelectorAll('.td-cmp').length,s.querySelector('.td-verdict')]), [[2,null],[2,null]]); }
    c('stat: bars scaled to the larger value (86%)', [S[6].querySelector('.here .td-track i').style.width,S[6].querySelector('.cty .td-track i').style.width].map(parseFloat), [86,31.5]);
    c('strings capped at 400', S[11].querySelector('.td-head').textContent.length, 400);
    c('verse: "Genesis 1:1 · KJV"', txt(S[10].querySelector('.td-vref')), 'Genesis 1:1 · KJV');
    const empty=host(); w.tdeckRender({slides:[]},empty,{keys:false});
    c('empty deck: one "no slides yet" slide', [empty.querySelectorAll('section').length,empty.textContent.includes('There are no slides yet.')], [1,true]);
    const big=host(); w.tdeckRender({slides:Array(60).fill({type:'verse',text:'x',ref:'y'})},big,{keys:false});
    c('at most 40 slides drawn', big.querySelectorAll('section').length, 40);
    const es=host(); w.tdeckRender({lang:'es',slides:[{type:'stat',value:'27',unit:'%',compare:{here:27,county:20,sig:true,moe:3}}]},es,{keys:false});
    c('ES: "Más alto que en el condado", "±3 puntos", "Nuestro entorno" / "Condado" (the headlines’ word, v10.39 review V17)', [txt(es.querySelector('.td-vchip')),txt(es.querySelector('.td-moe')),[...es.querySelectorAll('.td-cmpl span')].map(txt)], ['Más alto que en el condado','±3 puntos',['Nuestro entorno','Condado']]);
    c('words: "1 in 14", "6:30 pm", "18 Nov", "4 helpers" never split', E(`[tdNb('County: 1 in 14.'),tdNb('Tue 6:30 pm'),tdNb('7 Oct – 18 Nov'),tdNb('1 de cada 4'),tdNb('4 helpers')]`).map(s=>s.replace(/ /g,'_')),
      ['County: 1_in_14.','Tue 6:30_pm','7_Oct – 18_Nov','1_de_cada_4','4_helpers']);
    c('words: headlines only keep the "1 in 4" kind together', E(`tdNb('More than 1 in 4 people',true)`).replace(/ /g,'_'), 'More than 1_in_4 people');
    c('gift chips take the gifts report’s family colours', (()=>{ const g=host(); w.tdeckRender({slides:[{type:'ability',value:'9',gifts:['Teaching','Shepherding and pastoral care','Hospitality','Helps','Administración','Unknown gift']}]},g,{keys:false});
      return [...g.querySelectorAll('.td-chip')].map(x=>x.style.getPropertyValue('--hue')); })(),
      ['var(--td-language)','var(--td-people)','var(--td-children)','var(--td-housing)','var(--td-hardship)','var(--td-language)']);
    c('report() shape', Object.keys(w.tdeckRender(decks.board.en,host(),{keys:false}).report()).sort(), ['fit','following','h','index','k','n','overflow','presenter','slides','w']);
  }

  // ---- sideways (v10.40.0) ------------------------------------------------------------------------
  // The pastor: "I would prefer having the slides swipe left, that's more natural and easier to
  // control." The slides sit in one row: swipe left = next, right = previous. jsdom does no layout,
  // so the row is given a width here (360) and each slide its place (i × 360); Chrome checks the
  // real swipe (scratchpad v40/B/shots).
  {
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const sized=(h,W=360)=>{ const sc=h.querySelector('.td-scroller');
      Object.defineProperty(sc,'clientWidth',{value:W,configurable:true});
      [...h.querySelectorAll('section.td-slide')].forEach((s,i)=>Object.defineProperty(s,'offsetLeft',{value:i*W,configurable:true}));
      return sc; };
    const ev=(el,type,o={})=>{ const e=new w.Event(type,{bubbles:true,cancelable:true}); Object.assign(e,o); el.dispatchEvent(e); return e; };
    const ptr=(el,type,x,y,pt='mouse')=>{ const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}); Object.defineProperty(e,'pointerType',{value:pt}); el.dispatchEvent(e); return e; };
    const wheel=(el,o)=>{ const e=new w.WheelEvent('wheel',Object.assign({bubbles:true,cancelable:true},o)); el.dispatchEvent(e); return e; };
    const pips=h=>[...h.querySelectorAll('.td-pager i')];
    const onAt=h=>pips(h).map((d,k)=>d.classList.contains('on')?k:-1).filter(k=>k>=0);
    const ringAt=h=>pips(h).map((d,k)=>d.classList.contains('p')?k:-1).filter(k=>k>=0);

    // a move is a sideways scroll to the slide's place, instant
    { const h=host(), seen=[], ctl=w.tdeckRender(decks.board.en,h,{mode:'present',keys:false,onIndex:i=>seen.push(i)}), sc=sized(h);
      ctl.go(3);
      c('sideways: going to slide 4 puts the row at 4 slide-widths (scrollLeft), never scrollTop', [sc.scrollLeft,sc.scrollTop,ctl.index()], [1080,0,3]);
      ctl.next(); ctl.prev(); ctl.prev();
      c('sideways: next / prev move one slide-width each', [sc.scrollLeft,ctl.index()], [720,2]);
      // a swipe: the browser scrolls the row and snaps; the slide is read from scrollLeft
      sc.scrollLeft=1440; ev(sc,'scrollend');
      c('sideways: a swipe that settles at 4 slide-widths is slide 5 (scrollend), and the presenter’s phones are told', [ctl.index(),seen.slice(-1)[0]], [4,4]);
      sc.scrollLeft=1800; ev(sc,'scroll'); await wait(60);
      c('…without scrollend (iOS), not while it is still moving', ctl.index(), 4);
      await wait(140);
      c('…but once it has been still for 140 ms', ctl.index(), 5);
      sc.scrollLeft=1082; ev(sc,'scrollend');
      c('sideways: a row a pixel or two off still reads the nearest slide', ctl.index(), 3);
      // a finger held on the slides: nothing is decided until it lets go
      const before=seen.length;
      ev(sc,'touchstart'); sc.scrollLeft=1300; ev(sc,'scroll'); await wait(200);
      c('presenter’s finger still on a half-swiped slide: the phones are not told anything', [seen.length-before,ctl.index()], [0,3]);
      sc.scrollLeft=1440; ev(sc,'touchend'); await wait(200);
      c('…it lets go and the row settles on slide 5: the phones are told once', [seen.slice(before),ctl.index()], [[4],4]);
      ctl.destroy(); }

    // a short deliberate swipe is finished to the next slide: a slide is as wide as the screen, and on a
    // tablet or a phone on its side the snap alone sent a thumb's swipe back (Chrome, 1280 x 800 and 844 x 390)
    { const h=host(), ctl=w.tdeckRender(decks.board.en,h,{mode:'browse',keys:false,start:2}), sc=sized(h), calls=[];
      sc.scrollTo=o=>{ calls.push(o); sc.scrollLeft=o.left; };
      ctl.go(2);
      const swipe=async(x0,y0,x1,y1,o={})=>{ calls.length=0;
        ev(sc,'touchstart',{touches:o.two?[{clientX:x0,clientY:y0},{clientX:x0+80,clientY:y0}]:[{clientX:x0,clientY:y0}]});
        if(o.moved!=null) sc.scrollLeft=o.moved;
        ev(sc,'touchend',{touches:[],changedTouches:[{clientX:x1,clientY:y1}]}); await wait(200); return calls.slice(); };
      let got=await swipe(300,400,220,408,{moved:760});
      c('swipe: an 80 px swipe to the left that the snap would send back is finished to the next slide, gliding like the swipe', [got,ctl.index(),sc.scrollLeft], [[{left:1080,behavior:'smooth'}],3,1080]);
      got=await swipe(120,400,210,395,{moved:1060});
      c('swipe: …and to the right, to the previous one', [got.map(o=>o.left),ctl.index()], [[720],2]);
      got=await swipe(300,400,270,400,{moved:735});
      c('swipe: a 30 px nudge springs back (nothing finished)', [got,ctl.index(),sc.scrollLeft], [[],2,720]);
      got=await swipe(300,400,220,560,{moved:740});
      c('swipe: mostly up and down: not a swipe', [got,ctl.index()], [[],2]);
      got=await swipe(300,400,200,400,{two:true,moved:740});
      c('swipe: two fingers (a pinch): not a swipe', [got,ctl.index()], [[],2]);
      got=await swipe(300,400,120,400,{moved:900});
      c('swipe: past half a slide the snap itself goes on; nothing added (no double move)', [got,ctl.index()], [[],3]);
      ctl.go(decks.board.en.slides.length-1); got=await swipe(300,400,200,400,{moved:ctl.index()*360+20});
      c('swipe: at the last slide there is no next', [got,ctl.index()], [[],decks.board.en.slides.length-1]);
      sc.scrollLeft=1000; ev(sc,'scrollend');
      c('settle: a row left part-way is put exactly on the slide it reads (never half of two slides)', [ctl.index(),sc.scrollLeft], [3,1080]);
      ctl.destroy(); }

    // keys: → ← PageDown PageUp Space Shift+Space (a clicker), on the window (present)
    { const h=host(), seen=[], ctl=w.tdeckRender(decks.board.en,h,{mode:'present',onIndex:i=>seen.push(i)});
      key('ArrowRight'); key('ArrowRight'); key('ArrowLeft'); key('PageDown'); key('PageDown'); key('PageUp'); key(' '); key(' ',{shiftKey:true});
      c('present keys: → → ← PageDown PageDown PageUp Space Shift+Space', seen, [0,1,2,1,2,3,2,3,2]);
      const e=new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}); w.dispatchEvent(e);
      c('…a handled key is taken (defaultPrevented), so the page itself never scrolls', e.defaultPrevented, true);
      ctl.destroy(); }
    // keys with no window keys (the builder's preview, the sample): while focus is inside the slides
    { const h=host(), ctl=w.tdeckRender(decks.board.en,h,{mode:'browse',contained:true}), sc=h.querySelector('.td-scroller');
      const k2=(k,o={})=>{ const e=new w.KeyboardEvent('keydown',Object.assign({key:k,bubbles:true,cancelable:true},o)); sc.dispatchEvent(e); return e; };
      c('contained: the row is a Tab stop', sc.tabIndex, 0);
      const e1=k2('ArrowRight'); k2('PageDown'); k2(' ');
      c('contained: → PageDown Space move on while focus is in the slides, and the key is taken (no double move by the page)', [ctl.index(),e1.defaultPrevented], [3,true]);
      k2('ArrowLeft'); k2('PageUp');
      c('contained: ← PageUp move back', ctl.index(), 1);
      key('ArrowRight');
      c('contained: a key elsewhere on the page does not move the preview', ctl.index(), 1);
      k2('End'); c('contained: End → the last slide', ctl.index(), decks.board.en.slides.length-1);
      k2('Home'); c('contained: Home → the first', ctl.index(), 0);
      ctl.destroy(); }

    // the position dots
    { const h=host(), deck=decks.board.en, ctl=w.tdeckRender(deck,h,{mode:'browse',keys:false,start:2});
      c('dots: one per slide, in a row at the top, hidden from screen readers (the "3 / 10" speaks)', [pips(h).length,h.querySelector('.td-pager').getAttribute('aria-hidden'),h.querySelector('.td-pager').hidden], [deck.slides.length,'true',false]);
      c('dots: the slide on screen is marked', onAt(h), [2]);
      ctl.go(6); c('dots: follow every move', onAt(h), [6]);
      c('dots: sit outside the slides (a slide’s words are unchanged)', h.querySelectorAll('.td-slide .td-pager').length, 0);
      ctl.destroy();
      const one=host(); w.tdeckRender({slides:[{type:'verse',text:'x',ref:'y'}]},one,{keys:false});
      const many=host(); w.tdeckRender({slides:Array(25).fill({type:'verse',text:'x',ref:'y'})},many,{keys:false});
      c('dots: none for a single slide, none past 20 slides (the numbers alone)', [one.querySelector('.td-pager').hidden,pips(one).length,many.querySelector('.td-pager').hidden,pips(many).length], [true,0,true,0]); }

    // follow: a member swipes away, the presenter moves, Back to live
    { const h=host(), deck=decks.board.en, ctl=w.tdeckRender(deck,h,{mode:'follow',presenter:3,keys:false}), sc=sized(h), pill=h.querySelector('.td-pill');
      ctl.go(3);
      c('follow: on the presenter’s slide, dots on 4, no ring, no pill', [ctl.index(),onAt(h),ringAt(h),pill.hidden], [3,[3],[],true]);
      sc.scrollLeft=360; ev(sc,'scrollend');
      c('follow: the member swipes right twice (to slide 2): browsing, "Back to live", the presenter’s dot ringed', [ctl.index(),ctl.following(),pill.hidden,h.querySelector('.td-ptx').textContent,onAt(h),ringAt(h)], [1,false,false,'You: 2 · Presenter: 4',[1],[3]]);
      ctl.setIndex(5);
      c('…the presenter moves on: the member stays, the pill and the ring move', [ctl.index(),h.querySelector('.td-ptx').textContent,ringAt(h)], [1,'You: 2 · Presenter: 6',[5]]);
      pill.querySelector('.td-pback').click();
      c('…Back to live: the row goes to the presenter’s slide, following again', [ctl.index(),sc.scrollLeft,ctl.following(),pill.hidden,ringAt(h)], [5,1800,true,true,[]]);
      // the presenter moves while the member's finger rests on the slides
      ev(sc,'touchstart'); ctl.setIndex(6);
      c('follow: the presenter moves while a finger rests on the slides: nothing moves under it', [ctl.index(),sc.scrollLeft,ctl.following()], [5,1800,true]);
      ev(sc,'touchend'); await wait(200);
      c('…the finger lifts without swiping: still following, so on to the presenter’s slide', [ctl.index(),sc.scrollLeft,ctl.following(),pill.hidden], [6,2160,true,true]);
      ev(sc,'touchstart'); ctl.setIndex(7); sc.scrollLeft=1800; ev(sc,'scroll'); ev(sc,'touchend'); await wait(200);
      c('…but a finger that swipes away while the presenter moves stays where it swiped, with the pill', [ctl.index(),ctl.following(),pill.hidden,h.querySelector('.td-ptx').textContent], [5,false,false,'You: 6 · Presenter: 8']);
      ctl.setEnded(true);
      c('follow: ended → no ring, no pill', [ringAt(h),pill.hidden], [[],true]);
      ctl.destroy(); }

    // a mouse drag sideways (a laptop has no swipe)
    { const h=host(), ctl=w.tdeckRender(decks.team.en,h,{mode:'browse',keys:false,start:3}), sc=h.querySelector('.td-scroller'), sec=h.querySelectorAll('section')[3];
      ptr(sec,'pointerdown',300,300); ptr(sec,'pointerup',200,310);
      c('mouse: a drag to the left = next', ctl.index(), 4);
      ptr(sc,'pointerdown',100,300); ptr(sc,'pointerup',220,290);
      c('mouse: a drag to the right = previous', ctl.index(), 3);
      ptr(sc,'pointerdown',100,300); ptr(sc,'pointerup',130,300);
      ptr(sc,'pointerdown',100,300); ptr(sc,'pointerup',160,360);
      c('mouse: a short or mostly up-and-down drag moves nothing (a click stays a click)', ctl.index(), 3);
      ptr(sc,'pointerdown',300,300,'touch'); ptr(sc,'pointerup',100,300,'touch');
      c('touch: left to the browser’s own swipe (no double move)', ctl.index(), 3);
      ctl.destroy();
      const hy=host(), cy=w.tdeckRender(decks.team.en,hy,{mode:'follow',presenter:8,keys:false,onRespond:()=>Promise.resolve()});
      const ys=hy.querySelectorAll('section')[8]; ys.querySelector('button.td-opt').click(); ys.querySelectorAll('.td-agebtn')[0].click();
      const nm=ys.querySelector('.td-name'); ptr(nm,'pointerdown',300,300); ptr(nm,'pointerup',100,300);
      c('mouse: selecting text in the name field never moves the slide', cy.index(), 8);
      cy.destroy(); }

    // a mouse wheel or trackpad on the presenter's screen and a member's phone: one slide per turn
    { const h=host(), seen=[], ctl=w.tdeckRender(decks.board.en,h,{mode:'present',keys:false,onIndex:i=>seen.push(i)}), sc=h.querySelector('.td-scroller');
      const e1=wheel(sc,{deltaY:100});
      c('wheel (present): a turn down = next, and the page does not scroll', [ctl.index(),e1.defaultPrevented], [1,true]);
      wheel(sc,{deltaY:100}); wheel(sc,{deltaY:60});
      c('…the rest of the same turn (or a trackpad’s glide) moves nothing more', ctl.index(), 1);
      await wait(280); wheel(sc,{deltaY:-120});
      c('…once it has rested, a turn up = previous', ctl.index(), 0);
      await wait(280); wheel(sc,{deltaY:10}); wheel(sc,{deltaY:12}); wheel(sc,{deltaY:25});
      c('…small trackpad steps add up to one move', ctl.index(), 1);
      await wait(280); const e2=wheel(sc,{deltaX:120,deltaY:8});
      c('…two fingers to the left on a trackpad (sideways) = next, one slide however wide the screen (Chrome: half a laptop stage was too far to push)', [ctl.index(),e2.defaultPrevented], [2,true]);
      wheel(sc,{deltaX:90}); wheel(sc,{deltaX:70});
      c('…its glide moves nothing more', ctl.index(), 2);
      await wait(280); wheel(sc,{deltaX:-80,deltaY:5});
      c('…two fingers to the right = previous', ctl.index(), 1);
      await wait(280); const e3=wheel(sc,{deltaY:100,ctrlKey:true});
      c('…ctrl + wheel (a pinch) is zoom, not a move', [ctl.index(),e3.defaultPrevented], [1,false]);
      ctl.destroy();
      const hb=host(), cb=w.tdeckRender(decks.board.en,hb,{mode:'browse',keys:false}), sb=hb.querySelector('.td-scroller'), eb=wheel(sb,{deltaY:100});
      c('wheel (browse, on a page): up and down scrolls the page; the slides stay', [cb.index(),eb.defaultPrevented], [0,false]);
      const es=wheel(sb,{deltaX:100});
      c('wheel (browse): sideways moves one slide', [cb.index(),es.defaultPrevented], [1,true]);
      cb.destroy();
      const hf=host(), cf=w.tdeckRender(decks.board.en,hf,{mode:'follow',presenter:2,keys:false}); wheel(hf.querySelector('.td-scroller'),{deltaY:100});
      c('wheel (a member): moves them, and they are then away from the presenter', [cf.index(),cf.following()], [3,false]);
      cf.destroy(); }
  }

  // ---- v10.40: the place slide and the verse foot, from the renderer block alone ----------------------
  {
    const V={text:'And seek the peace of the city… and pray unto the LORD for it: for in the peace thereof shall ye have peace.',ref:'Jeremiah 29:7 · KJV'};
    const deck={lang:'es',church:'X',slides:[
      {type:'place',kicker:'Aquí en Warminster',headline:'En Warminster, otros ya sirven, y podemos sumarnos a ellos',where:'Vecinos con dificultades: busque primero a 0.9 mi al noreste de la iglesia',
       facts:[{value:'1 de cada 5',label:'personas de nuestro entorno vive por debajo del umbral de pobreza. Condado: 1 de cada 14.',hue:'hardship'}],
       partners:[{name:'Warminster Community Food Bank',kind:'Banco o despensa de alimentos',dist:'0.6 mi'},{name:'<img src=x onerror="window.__pwned=9">',kind:'x',dist:'1 mi'}],
       bring:['Aulas para 45 · martes por la noche'],source:'Censo de EE. UU. ACS 2020–2024 · lugares: OpenStreetMap',verse:V},
      {type:'place',headline:'x',facts:'nope',partners:[null,7,{name:''}],bring:[{}],where:{}},
      {type:'motion',headline:'m',rows:[['a','b']],by:'x',verse:{text:'',ref:'y'}},
      {type:'close',headline:'c',text:'t',verse:V},{type:'join',verse:V},{type:'verse',text:'v',ref:'r',version:'KJV',verse:V}]};
    const h=host(); w.tdeckRender(deck,h,{keys:false}); const S=[...h.querySelectorAll('section')];
    c('place (renderer alone): where, one figure, two names under the Spanish heading, what we bring', [txt(S[0].querySelector('.td-where')),S[0].querySelectorAll('.td-tcard').length,txt(S[0].querySelector('.td-plh')),S[0].querySelectorAll('.td-prow').length,txt(S[0].querySelector('.td-pbring .td-plh')),S[0].querySelectorAll('.td-brow').length],
      ['Vecinos con dificultades: busque primero a 0.9 mi al noreste de la iglesia',1,'Ya sirven aquí · nos sumamos, no competimos',2,'Lo que solo nosotros aportamos',1]);
    c('place: a name that is markup stays text, and nothing fires', [S[0].textContent.includes('<img src=x onerror="window.__pwned=9">'),S[0].querySelectorAll('img').length,w.__pwned||0], [true,0,0]);
    c('place: a slide with broken groups draws what it can and never throws', [S[1].classList.contains('td-t-place'),S[1].querySelectorAll('.td-tcard,.td-prow,.td-brow,.td-where').length], [true,0]);
    c('the verse foot sits after the body and before the source, in the pin’s place of no other', (()=>{ const k=[...S[0].querySelector('.td-main').children].map(e=>e.className.split(' ')[0]); return [k.indexOf('td-vfoot')-k.indexOf('td-body'),k.indexOf('td-src')-k.indexOf('td-vfoot')]; })(), [1,1]);
    c('a verse with no words draws no foot; join, verse and close never draw one', [S[2].querySelector('.td-vfoot'),S[3].querySelector('.td-vfoot'),S[4].querySelector('.td-vfoot'),S[5].querySelector('.td-vfoot')], [null,null,null,null]);
    c('the foot’s words and reference', [txt(S[0].querySelector('.td-vft')),txt(S[0].querySelector('.td-vfr'))], [V.text,V.ref]);
  }

  // ---- the CSS ----------------------------------------------------------------------------------------
  {
    const flat=CSS.replace(/\/\*[\s\S]*?\*\//g,'');
    const rm=flat.split('@media (prefers-reduced-motion: reduce)');
    // v10.40.0, the pastor's request ("I would prefer having the slides swipe left, that's more natural
    // and easier to control"): the slides moved from an upright (y) snap to a sideways (x) one. This test
    // said "y mandatory" and is updated to the new intent.
    c('css: x mandatory snap (sideways, v10.40), stop always, instant scroll', [/scroll-snap-type:x mandatory/.test(flat),/scroll-snap-type:y/.test(flat),/scroll-snap-stop:always/.test(flat),/scroll-behavior:auto/.test(flat)], [true,false,true,true]);
    const scr=(flat.match(/\.td-scroller\{[^}]*\}/)||[''])[0], sl=(flat.match(/\.td-slide\{[^}]*\}/)||[''])[0];
    c('css: the row: one line of slides (flex), sideways only, never up or down', [/display:flex/.test(scr),/overflow-x:auto/.test(scr),/overflow-y:hidden/.test(scr),/overflow-y:auto|overflow:auto/.test(scr)], [true,true,true,false]);
    c('css: each slide is exactly one view wide, and snaps at its start', [/flex:0 0 100%/.test(sl),/width:100%/.test(sl),/scroll-snap-align:start/.test(sl)], [true,true,true]);
    c('css: on a page an up-and-down drag still scrolls the page; the presenter’s screen and a member’s phone take sideways moves only (no pull-to-refresh), pinch-zoom kept',
      [/touch-action:pan-x pan-y pinch-zoom/.test(scr),/\.td-m-present \.td-scroller,\.td-m-follow \.td-scroller\{touch-action:pan-x pinch-zoom;overscroll-behavior:contain\}/.test(flat),/overscroll-behavior-x:contain/.test(scr)], [true,true,true]);
    c('css: the position dots: a row at the top, for the eye only (no taps), the current one a longer mint bar',
      [/\.td-pager\{[^}]*top:0[^}]*display:flex[^}]*pointer-events:none/.test(flat),/\.td-pager i\.on\{[^}]*background:var\(--td-acc\)/.test(flat)], [true,true]);
    c('css: slides are one screen tall (100dvh root, 100% sections)', [/height:100dvh/.test(flat),/\.td-slide\{[^}]*height:100%/.test(flat)], [true,true]);
    c('css: nothing animates (no keyframes, animation or transition outside the reduced-motion reset)', /@keyframes|animation:|transition:/.test(rm[0]), false);
    c('css: reduced-motion block present', rm.length, 2);
    c('css: floors — headline 26, hero 64, source 13', [/\.td-head\{[^}]*max\(26,/.test(flat),/\.td-hero\{[^}]*max\(64,/.test(flat),/\.td-src\{[^}]*max\(13,/.test(flat)], [true,true,true]);
    c('css: no text smaller than 13 logical px', [...flat.matchAll(/font-size:calc\(var\(--p\) \* (?:max\((\d+(?:\.\d+)?),|(\d+(?:\.\d+)?)\))/g)].map(m=>+(m[1]||m[2])).filter(v=>v<13), []);
    c('css: kind hues match the app’s dark theme', ['hardship:#FBBF77','housing:#6FB4FF','children:#A78BFA','people:#F09AB8','language:#5EE9B5'].every(x=>flat.includes('--td-'+x)), true);
    // WCAG AA on the dark theme
    const L=h=>{ const v=h.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(u=>u<=0.03928?u/12.92:Math.pow((u+0.055)/1.055,2.4)); return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]; };
    const cr=(a,b)=>{ const x=L(a),y=L(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
    const tok=n=>(flat.match(new RegExp('--td-'+n+':(#[0-9A-Fa-f]{6})'))||[])[1];
    const bgs=['bg','panel','panel2'].map(tok).concat(['#101A1F','#131A22','#0B0F14']);   // slide, cards, glow top, pill, bar
    const texts=['ink','ink2','ink3','acc','hardship','housing','children','people','language'];
    const worst=texts.map(t=>[t,Math.min(...bgs.map(b=>cr(tok(t),b)))]).filter(([,v])=>v<4.5);
    c('contrast: every text colour ≥ 4.5:1 on every dark surface', worst, []);
    c('contrast: mint button ink ≥ 4.5:1', cr(tok('acc'),tok('acc-ink'))>=4.5, true);
    c('contrast: county bar ≥ 3:1 (graphics)', cr(tok('county'),tok('panel2'))>=3, true);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+e.stack); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
