// v10.59.3 — the survey's section chips slide. The pastor (8 Oct 2026), of the chip bar on a computer: "the tabs on top one of them or a
// couple of them are hidden behind and I don't want them to be necessarily two lines … maybe if you bring your cursor or you can just
// swipe and it will scroll left." One line, as before; on a phone a swipe (as before); with a mouse the wheel over the bar slides it, a
// drag slides it (without opening the chip under the mouse), and a small arrow at an end where chips are off that edge slides a
// screenful. jsdom does no layout: the bar's widths are stood in here. Written failing-first on v10.59.2.
const {sleep,until,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const ADDR="D.geo={...D.geo,matched:'118 Bristol Rd, Warminster, PA, 18974'}";
/* the bar as a computer would lay it out: more chips than a 900 px bar holds (the survey's eleven do not fit one screen) */
function layout(P,width,client){ const nav=P.q('#secnav'); let left=0;
  Object.defineProperty(nav,'scrollWidth',{get:()=>width,configurable:true}); Object.defineProperty(nav,'clientWidth',{get:()=>client,configurable:true});
  Object.defineProperty(nav,'scrollLeft',{get:()=>left,set:v=>{ left=Math.max(0,Math.min(width-client,v)); nav.dispatchEvent(new P.w.Event('scroll')); },configurable:true});
  nav.scrollBy=o=>{ nav.scrollLeft=left+(o&&o.left||0); nav.__by=(nav.__by||[]).concat([o]); };
  P.E('snArrows(document.getElementById("secnav"))'); return nav; }
const arrows=P=>[P.q('#secnav .sn-arrow.l').hidden,P.q('#secnav .sn-arrow.r').hidden];

(async()=>{ await T.sec(async()=>{
  const P=page({needs:'file'}); await ready(P); survey(P,{mod:ADDR}); await sleep(200);
  const nav=P.q('#secnav');
  c('the bar is one line of chips, each a button, the arrows apart from them (not buttons, so nothing counts them as sections)', [nav.hidden, P.qa('#secnav button').every(b=>b.dataset.t), P.qa('#secnav .sn-arrow').map(a=>[a.tagName,a.getAttribute('role'),a.classList.contains('l')?'l':'r'])], [false,true,[['SPAN','button','l'],['SPAN','button','r']]]);
  c('…the first chip is still Brief, the arrows named for a reader', [P.q('#secnav button').textContent, P.qa('#secnav .sn-arrow').map(a=>a.getAttribute('aria-label'))], ['Brief',['Earlier sections','More sections']]);
  c('when every chip fits, no arrow shows', (layout(P,800,900), arrows(P)), [true,true]);
  layout(P,2800,900);   // three screenfuls of chips
  c('chips off the right edge: the right arrow shows, not the left (the bar starts at the first chip)', arrows(P), [true,false]);
  P.q('#secnav .sn-arrow.r').click(); await sleep(10);
  c('the right arrow slides a screenful, smoothly', [nav.__by[0].left>=120&&nav.__by[0].left<=820, nav.__by[0].behavior, nav.scrollLeft>0], [true,'smooth',true]);
  c('…now both arrows show (chips off both edges)', arrows(P), [false,false]);
  nav.scrollLeft=1900;
  c('at the end, only the left arrow', arrows(P), [false,true]);
  P.q('#secnav .sn-arrow.l').dispatchEvent(new P.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})); await sleep(10);
  c('the keyboard works an arrow (Enter)', nav.__by.length, 2);
  nav.scrollLeft=0;
  const wh=new P.w.WheelEvent('wheel',{deltaY:120,deltaX:0,bubbles:true,cancelable:true}); nav.dispatchEvent(wh);
  c('the mouse wheel over the bar slides it sideways (and the page does not scroll)', [nav.scrollLeft, wh.defaultPrevented], [120,true]);
  nav.scrollLeft=0; layout(P,800,900);
  const wh2=new P.w.WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true}); nav.dispatchEvent(wh2);
  c('…but not when every chip fits (the page scrolls as usual)', [nav.scrollLeft, wh2.defaultPrevented], [0,false]);
  layout(P,1400,900);
  const chip=P.qa('#secnav button')[3]; let opened=0; chip.addEventListener('click',()=>{ opened++; });
  const pe=(type,x,extra)=>{ const e=new P.w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,button:0}); Object.defineProperty(e,'pointerType',{value:(extra||{}).touch?'touch':'mouse'}); Object.defineProperty(e,'pointerId',{value:1}); return e; };
  chip.dispatchEvent(pe('pointerdown',300)); chip.dispatchEvent(pe('pointermove',250)); chip.dispatchEvent(pe('pointermove',200)); chip.dispatchEvent(pe('pointerup',200)); chip.dispatchEvent(new P.w.MouseEvent('click',{bubbles:true,cancelable:true}));
  c('a mouse drag slides the bar and does not open the chip under the mouse', [nav.scrollLeft, opened], [100,0]);
  chip.dispatchEvent(pe('pointerdown',300)); chip.dispatchEvent(pe('pointermove',298)); chip.dispatchEvent(pe('pointerup',298)); chip.dispatchEvent(new P.w.MouseEvent('click',{bubbles:true,cancelable:true}));
  c('…a plain click (no real movement) still opens it', [nav.scrollLeft, opened], [100,1]);
  nav.scrollLeft=0; chip.dispatchEvent(pe('pointerdown',300,{touch:true})); chip.dispatchEvent(pe('pointermove',200,{touch:true})); chip.dispatchEvent(pe('pointerup',200,{touch:true}));
  c('a finger is left to the browser\'s own swipe', nav.scrollLeft, 0);
  c('no page errors', P.errs, []);
  const S=page({needs:'file',lang:'es'}); await ready(S); survey(S,{mod:ADDR}); await sleep(200);
  c('in Spanish', S.qa('#secnav .sn-arrow').map(a=>a.getAttribute('aria-label')), ['Secciones anteriores','Más secciones']);
}); T.done(); })();
