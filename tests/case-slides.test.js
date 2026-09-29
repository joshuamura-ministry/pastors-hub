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

  // ---- the CSS ----------------------------------------------------------------------------------------
  {
    const flat=CSS.replace(/\/\*[\s\S]*?\*\//g,'');
    const rm=flat.split('@media (prefers-reduced-motion: reduce)');
    c('css: y mandatory snap, stop always, instant scroll', [/scroll-snap-type:y mandatory/.test(flat),/scroll-snap-stop:always/.test(flat),/scroll-behavior:auto/.test(flat)], [true,true,true]);
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
