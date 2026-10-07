// v10.58.0 — every drop-down drawn by the app. The pastor (7 Oct 2026), with a picture of the conference list open (its union headings
// in the browser's plain list): "if you can go through all the drop downs and make the drop-down, more beautiful and more aesthetically
// appealing". The page's own <select> stays, unseen, and keeps its value, options and change events; a button in front of it shows the
// choice and opens a list: the groups as headings, a tick on the choice, a search box for a long list, a sheet from the bottom on a phone,
// the keyboard as a list box. jsdom does no layout, so the page leaves it off here and this suite turns it on (tsSelOn).
// Covered: off by default in the test runner; dressing every select (and one drawn later); the button's words; the list (headings,
// options, the tick, disabled rows); search (accents and case); the keyboard (arrows, Home/End, Enter, Escape, Tab, a letter); a pick
// fires input and change once, the same pick none; a value set by code and options replaced show at once; disabled and hidden follow;
// multiple and data-native left alone; a label's words open it (around it, or by for=); outside a tap closes; inside a dialog; the phone's
// sheet; Spanish. Written failing-first on v10.57.1.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor',synced:true,tok:TOK};
const served=p=>{ const f=path.join(ROOT,'conferences',p); return fs.existsSync(f)?fs.readFileSync(f,'utf8'):null; };
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body)});
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.phone) w.matchMedia=q=>({matches:/max-width:\s*600px/.test(q),addEventListener(){},removeEventListener(){}});
      if(w.HTMLDialogElement){ w.HTMLDialogElement.prototype.showModal=function(){ this.setAttribute('open',''); }; }
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u)=>{ u=String(u);
        if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
        if(/functions\/register/.test(u)) return resp(503,'{"ok":false}');
        if(/advise/.test(u)) return resp(200,'{"enabled":false}');
        const m=/^\/conferences\/([a-z/.-]+\.json)(\?v=[0-9a-f]+)?$/.exec(u);
        if(m){ const t=served(m[1]); return t==null?resp(404,'{}'):resp(200,t); }
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
const key=(P,el,k)=>el.dispatchEvent(new P.w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
const shown=P=>P.qa('#ts-pop .ts-opt').filter(o=>!o.hidden).map(o=>o.textContent);
async function openCmp(P){ await until(()=>P.E('ACCESS_CHECKED')); await sleep(60); P.E("openTool('compare')"); await until(()=>P.q('#cmp-mine')); await sleep(30); }

(async()=>{ try{
  console.log('\n-- off in the test runner until asked --');
  const P=page(); await openCmp(P);
  c('jsdom: the page\'s own select, nothing drawn in front of it', [!!P.q('.ts-sel'), P.q('#cmp-mine').classList.contains('ts-native'), P.E('TS_SEL.on')], [false,false,false]);
  P.E('tsSelOn()');

  console.log('\n-- the conference list --');
  const sel=P.q('#cmp-mine'), btn=()=>P.q('#cmp-mine').previousElementSibling;
  c('a button just before the select, which stays (unseen, out of the tab order, hidden from readers)', [btn().tagName, btn().className, sel.classList.contains('ts-native'), sel.tabIndex, sel.getAttribute('aria-hidden')], ['BUTTON','ts-sel',true,-1,'true']);
  c('…it shows the choice, and says what the field is', [btn().getAttribute('data-v'), btn().getAttribute('aria-label'), btn().getAttribute('aria-haspopup'), btn().getAttribute('aria-expanded')], ['Pennsylvania','Your conference: Pennsylvania','listbox','false']);
  c('…its words come from the stylesheet, so the page reads the same', btn().textContent, '');
  btn().click(); await sleep(10);
  const pop=P.q('#ts-pop');
  c('a tap opens the list under it', [!!pop, btn().getAttribute('aria-expanded'), btn().getAttribute('aria-controls'), P.q('#ts-pop .ts-list').getAttribute('role')], [true,'true','ts-pop','listbox']);
  c('the unions as headings, the conferences under them, the same as the select\'s', [P.qa('#ts-pop .ts-gh').map(h=>h.textContent), P.qa('#ts-pop .ts-opt').length],
    [[...sel.querySelectorAll('optgroup')].map(g=>g.label), sel.options.length]);
  c('…each group is a group for a reader, named by its heading', P.qa('#ts-pop .ts-grp').every(g=>g.getAttribute('role')==='group'&&P.q('#'+g.getAttribute('aria-labelledby')).textContent===g.querySelector('.ts-gh').textContent));
  c('a tick on his conference, which is where the list starts', [P.qa('#ts-pop .ts-opt[aria-selected="true"]').map(o=>o.textContent), P.txt('#ts-pop .ts-opt.act')], [['Pennsylvania'],'Pennsylvania']);
  const q=P.q('#ts-pop .ts-q');
  c('a long list has a search box, and it has the focus', [!!q, q&&q.getAttribute('placeholder'), P.D.activeElement===q], [true,'Search',true]);
  q.value='NEVADA'; q.dispatchEvent(new P.w.Event('input',{bubbles:true}));
  c('search: case does not matter; only the matches and their headings show', [shown(P), P.qa('#ts-pop .ts-grp').filter(g=>!g.hidden).map(g=>g.querySelector('.ts-gh').textContent)], [['Nevada-Utah'],['Pacific Union']]);
  q.value='zzz'; q.dispatchEvent(new P.w.Event('input',{bubbles:true}));
  c('…nothing: "Nothing matches"', [shown(P).length, P.q('#ts-pop .ts-none').hidden, P.txt('#ts-pop .ts-none')], [0,false,'Nothing matches']);
  q.value=''; q.dispatchEvent(new P.w.Event('input',{bubbles:true}));
  c('…cleared: every conference again', shown(P).length, sel.options.length);
  key(P,q,'ArrowDown');
  c('arrow down: the next conference (Potomac)', P.txt('#ts-pop .ts-opt.act'), 'Potomac');
  c('…the list says which one is active', P.q('#ts-pop .ts-list').getAttribute('aria-activedescendant'), P.q('#ts-pop .ts-opt.act').id);
  key(P,q,'Enter'); await sleep(40);
  c('Enter chooses it: the select\'s value, the page\'s own change (the comparison redrawn for Potomac), the list closed', [P.J('CMP.st.mine'), P.q('#cmp-mine').value, !!P.q('#ts-pop')], ['potomac','potomac',false]);
  c('…the redrawn select is dressed again, showing Potomac', [btn().className, btn().getAttribute('data-v')], ['ts-sel','Potomac']);
  btn().click(); await sleep(10);
  key(P,P.q('#ts-pop .ts-q'),'Escape');
  c('Escape closes it and gives the button the focus back', [!!P.q('#ts-pop'), P.D.activeElement===btn(), btn().getAttribute('aria-expanded')], [false,true,'false']);
  btn().click(); await sleep(10);
  P.q('#cmp-s1 h3').dispatchEvent(new P.w.Event('pointerdown',{bubbles:true}));
  c('a tap outside closes it', !!P.q('#ts-pop'), false);
  P.E(`document.getElementById('cmp-mine').value='ohio'`);
  c('a value set by code shows on the button at once', btn().getAttribute('data-v'), 'Ohio');
  P.E(`document.getElementById('cmp-mine').selectedIndex=0`);
  c('…by its index too', btn().getAttribute('data-v'), P.q('#cmp-mine').options[0].textContent);
  P.q('label[for="cmp-mine"]').click(); await sleep(10);
  c('the field\'s label (for=) opens it', !!P.q('#ts-pop'));
  P.E('tsSelClose(false)');

  console.log('\n-- any select, drawn later --');
  P.E(`(()=>{ const d=document.createElement('div'); d.id='t-host'; d.innerHTML='<label id="t-lab">Day <select id="t-sel"><option value="">—</option><option value="a">Apple</option><option value="b">Banana</option><option value="c" disabled>Cherry</option><option value="d">Date</option></select></label><select id="t-multi" multiple><option>x</option></select><select id="t-native" data-native><option>y</option></select>';
    document.body.appendChild(d); window.__ev=[]; const s=document.getElementById('t-sel'); s.addEventListener('input',()=>__ev.push('input')); s.onchange=()=>__ev.push('change:'+s.value); })()`);
  await until(()=>P.q('#t-sel').__ts); await sleep(10);
  const tb=()=>P.q('#t-sel').previousElementSibling;
  c('a select drawn later is dressed as it appears', [tb()&&tb().className, tb()&&tb().getAttribute('data-v'), tb()&&tb().getAttribute('aria-label')], ['ts-sel','—','Day: —']);
  c('a list of several and one kept native are left alone', [!!P.q('#t-multi').__ts, P.q('#t-multi').classList.contains('ts-native'), !!P.q('#t-native').__ts], [false,false,false]);
  P.q('#t-lab').click(); await sleep(10);
  c('the words of a label around it open it', !!P.q('#ts-pop'));
  c('a short list: no search box; the list has the focus', [!!P.q('#ts-pop .ts-q'), P.D.activeElement===P.q('#ts-pop .ts-list')], [false,true]);
  c('a row that cannot be chosen says so', P.q('#ts-pop #ts-o3').getAttribute('aria-disabled'), 'true');
  const L=P.q('#ts-pop .ts-list');
  key(P,L,'b'); c('a letter: the first choice that starts with it', P.txt('#ts-pop .ts-opt.act'), 'Banana');
  key(P,L,'ArrowDown'); c('arrow down passes over a row that cannot be chosen', P.txt('#ts-pop .ts-opt.act'), 'Date');
  key(P,L,'Home'); c('Home: the first', P.txt('#ts-pop .ts-opt.act'), '—');
  key(P,L,'End'); c('End: the last', P.txt('#ts-pop .ts-opt.act'), 'Date');
  P.q('#ts-pop #ts-o3').click(); c('a tap on that row does nothing', [!!P.q('#ts-pop'), P.q('#t-sel').value], [true,'']);
  P.q('#ts-pop #ts-o1').click(); await sleep(10);
  c('a tap on a row chooses it: input, then change, once each', [P.q('#t-sel').value, P.J('__ev'), tb().getAttribute('data-v'), !!P.q('#ts-pop')], ['a',['input','change:a'],'Apple',false]);
  tb().click(); await sleep(10); P.q('#ts-pop #ts-o1').click(); await sleep(10);
  c('the same choice again: no change event', P.J('__ev'), ['input','change:a']);
  tb().click(); await sleep(10); key(P,P.q('#ts-pop .ts-list'),'Tab');
  c('Tab closes the list', !!P.q('#ts-pop'), false);
  tb().click(); await sleep(10); key(P,P.q('#ts-pop .ts-list'),' ');
  c('Space chooses the active row (the one chosen)', [!!P.q('#ts-pop'), P.q('#t-sel').value], [false,'a']);
  P.E(`document.getElementById('t-sel').innerHTML='<option value="1">One</option><option value="2" selected>Two</option>'`); await sleep(20);
  c('options replaced by the page: the button follows', tb().getAttribute('data-v'), 'Two');
  P.E(`document.getElementById('t-sel').disabled=true`); await sleep(20);
  c('a disabled select: a disabled button, which does not open', [tb().disabled, (tb().click(), !!P.q('#ts-pop'))], [true,false]);
  P.E(`(()=>{ const s=document.getElementById('t-sel'); s.disabled=false; s.hidden=true; })()`); await sleep(20);
  c('a hidden select: a hidden button', tb().hidden, true);
  P.E(`(()=>{ const d=document.createElement('dialog'); d.id='t-dlg'; d.innerHTML='<label>Time <select id="t-dsel"><option>Morning</option><option>Evening</option></select></label>'; document.body.appendChild(d); d.showModal(); })()`);
  await until(()=>P.q('#t-dsel').__ts); P.q('#t-dsel').previousElementSibling.click(); await sleep(10);
  c('inside an open dialog the list opens inside it (so it can be used)', P.q('#ts-pop').parentElement.id, 't-dlg');
  P.E('tsSelClose(false)');
  c('no page errors', P.errs, []);

  console.log('\n-- on a phone: a sheet from the bottom --');
  { const F=page({phone:true}); await openCmp(F); F.E('tsSelOn()');
    F.q('#cmp-mine').previousElementSibling.click(); await sleep(10);
    c('the list is a sheet, with the field\'s name and a close button', [F.q('#ts-pop').classList.contains('ts-sheet'), F.txt('#ts-pop .ts-head b'), F.q('#ts-pop .ts-x').getAttribute('aria-label')], [true,'Your conference','Close']);
    c('…the search box waits for a tap (no keyboard over the list)', F.D.activeElement===F.q('#ts-pop .ts-list'));
    F.q('#ts-pop .ts-x').click(); await sleep(10);
    c('…× closes it', !!F.q('#ts-pop'), false);
  }

  console.log('\n-- in Spanish --');
  { const S=page({lang:'es'}); await openCmp(S); S.E('tsSelOn()');
    S.q('#cmp-mine').previousElementSibling.click(); await sleep(10);
    c('Buscar; Nada coincide', [S.q('#ts-pop .ts-q').getAttribute('placeholder'), S.txt('#ts-pop .ts-none')], ['Buscar','Nada coincide']);
    c('the button says the field in Spanish', S.q('#cmp-mine').previousElementSibling.getAttribute('aria-label'), 'Su asociación: Pennsylvania');
  }
}catch(e){ console.log('  FAIL  crashed: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0); })();
