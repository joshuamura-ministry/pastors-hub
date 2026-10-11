// v10.69.0 · the church box knows the church. The pastor (11 Oct 2026): "is there a way to make it so that it actually knows like … when you
// type in Google? It will actually populate or Google maps it will populate so if I say Fairview village seventh day so that I won't have to
// put in exactly … how every single thing should be before. It actually knows what church I'm talking about." The page's side: the box as a
// list box, what it asks places.mjs (stood in for here), the arrows, Enter and a tap, the address mapped and the church's name kept, and a
// Google place the Census cannot find by its words mapped by its point. The churches and places are MADE UP. Written failing-first on v10.68.0.
const {sleep,until,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const DIR={src:'dir',name:'Fairview Village SDA Church',address:'1010 Sample Mill Rd Eagleville PA 19403-1047',town:'Eagleville'};
const GPL={src:'g',id:'ChIJsample00002',name:'Grace Fellowship Church',place:'Main Street, Sampleton, PA'};
function wire(P,answer){
  P.w.__asked=[]; const orig=P.w.fetch;
  P.w.fetch=async(u,o)=>{ if(String(u)==='/.netlify/functions/places'){ const b=JSON.parse(o.body); P.w.__asked.push({b,h:o.headers});
      const j=answer(b); return {ok:true,status:200,json:async()=>j}; } return orig(u,o); };
  P.E(`window.__runs=[]; run=(f,o)=>{ window.__runs.push(f); return Promise.resolve(true); };`);
}
const type=async(P,v)=>{ const a=P.q('#addr'); a.focus(); a.value=v; a.dispatchEvent(new P.w.Event('input',{bubbles:true})); await sleep(320); };
const key=(P,k)=>P.q('#addr').dispatchEvent(new P.w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
(async()=>{ await T.sec(async()=>{
  console.log('\n-- the box --');
  const P=page({}); await ready(P); P.E("openTool('survey')"); await sleep(60);
  const a=P.q('#addr');
  c('"Church name or address", a list box of its own (the browser\'s own suggestions off)', [a.placeholder,a.getAttribute('aria-label'),a.getAttribute('role'),a.getAttribute('aria-autocomplete'),a.getAttribute('aria-controls'),a.getAttribute('autocomplete'),P.q('#ac-list').getAttribute('role'),P.q('#ac-list').hidden],
    ['Church name or address','Church name or address','combobox','list','ac-list','off','listbox',true]);
  c('the line above it says so', /^Type the church’s name or address\./.test(P.txt('.ask p.lead')), true);

  console.log('\n-- typing asks for churches --');
  wire(P,b=>({ok:true,list:/fair/i.test(b.q)?[DIR]:[GPL,{src:'g',id:'ChIJsample00009',name:'12 Sample Ave',place:'Sampleton, PA'}],google:true}));
  await type(P,'F');
  c('one letter asks nothing', P.J('__asked.length'), 0);
  await type(P,'Fairview village seventh day');
  const ask=P.J('__asked')[0];
  c('then once, a moment after the last letter: the words, his conference, a session, the language', ask&&[ask.b.op,ask.b.q,ask.b.conf,/^[A-Za-z0-9_-]{16,64}$/.test(ask.b.session),ask.b.lang], ['suggest','Fairview village seventh day','Pennsylvania',true,'en']);
  const opts=P.qa('#ac-list .ac-opt');
  c('the church from the directory: its name and its address, a church\'s picture; no Google line for it', [opts.length,txt(opts[0].querySelector('b')),txt(opts[0].querySelector('.ac-t span')),!!opts[0].querySelector('svg.ac-i'),!!P.q('#ac-list .ac-g'),P.q('#ac-list').hidden,a.getAttribute('aria-expanded')],
    [1,'Fairview Village SDA Church','1010 Sample Mill Rd Eagleville PA 19403-1047',true,false,false,'true']);
  key(P,'ArrowDown');
  c('the down arrow lights it for a screen reader too', [P.q('#ac-o-0').getAttribute('aria-selected'),a.getAttribute('aria-activedescendant')], ['true','ac-o-0']);
  key(P,'Enter'); await sleep(40);
  c('Enter takes it: the directory\'s address in the box, the survey started, the list closed', [a.value,P.J('__runs.length'),P.q('#ac-list').hidden,a.getAttribute('aria-expanded')], [DIR.address,1,true,'false']);
  P.E(`geocodeAddress=async x=>({matched:x.toUpperCase(),tract:{},county:{},coords:{x:-75.4,y:40.1}});`);
  const g1=await P.E(`__runs[0]()`);
  c('…mapped by its address, carrying the church\'s name', [g1.matched,g1.pick], [DIR.address.toUpperCase(),{name:'Fairview Village SDA Church'}]);

  console.log('\n-- the church keeps that name --');
  P.E(`(()=>{ const s=uStore(); const ch=uChurch(); ch.address=''; ch.name=''; uPersist(); DATA={geo:{matched:'1010 SAMPLE MILL RD, EAGLEVILLE, PA, 19403',pick:{name:'Fairview Village SDA Church'}}}; uEnsureChurch(); })()`);
  c('a church with no name of its own takes the one picked', P.J('uChurch().name'), 'Fairview Village SDA Church');
  P.E(`(()=>{ uChurch().name='Our own name'; uPersist(); DATA={geo:{matched:'1010 SAMPLE MILL RD, EAGLEVILLE, PA, 19403',pick:{name:'Fairview Village SDA Church'}}}; uEnsureChurch(); })()`);
  c('…a name of its own is never changed', P.J('uChurch().name'), 'Our own name');

  console.log('\n-- a place from Google --');
  P.E('__runs=[]'); P.w.__asked=[];
  await type(P,'grace fellow');
  c('Google\'s places, the Google Maps line under them', [P.qa('#ac-list .ac-opt').map(o=>txt(o.querySelector('b'))),txt(P.q('#ac-list .ac-g'))], [['Grace Fellowship Church','12 Sample Ave'],'Google Maps']);
  key(P,'ArrowDown'); key(P,'ArrowDown'); key(P,'ArrowUp');
  c('the arrows move up and down the list', P.qa('#ac-list .ac-opt').map(o=>o.getAttribute('aria-selected')), ['true','false']);
  key(P,'Escape');
  c('Escape closes it, the words left as typed', [P.q('#ac-list').hidden,a.value], [true,'grace fellow']);
  wire(P,b=>b.op==='pick'?{ok:true,address:'12 Sample Ave, Sampleton, PA 19000',lat:40.12346,lon:-75.65432}:{ok:true,list:[{src:'g',id:'ChIJsample00002',name:'12 Sample Ave',place:'Sampleton, PA'}],google:true});
  await type(P,'12 sample');
  P.q('#ac-o-0').click(); await sleep(80);
  const pk=P.J('__asked').find(x=>x.b.op==='pick');
  c('a tap on a Google place asks for that place in the same session', pk&&[pk.b.id,pk.b.session===P.J('__asked')[0].b.session], ['ChIJsample00002',true]);
  c('…its address in the box, the survey started', [a.value,P.J('__runs.length')], ['12 Sample Ave, Sampleton, PA 19000',1]);
  P.E(`geocodeAddress=async()=>{ throw new Error('No match for that address.'); }; geocodePoint=async(x,y)=>({tract:{},county:{},coords:{x,y},label:'Sampleton, PA'});`);
  const g2=await P.E(`__runs[0]()`);
  c('the Census not finding its words: mapped by its point, the address kept as the church\'s', [g2.coords,g2.matched,g2.label,g2.pick], [{x:-75.65432,y:40.12346},'12 Sample Ave, Sampleton, PA 19000',undefined,{name:'12 Sample Ave'}]);
  await type(P,'12 sample avenue');
  P.E(`window.__err=null; __runs=[]; geocodeAddress=async()=>{ throw new Error('No match for that address.'); };`);
  P.q('#go').click(); await sleep(20);
  const g3=await P.E(`__runs[0]().then(()=>'mapped',e=>e.message)`);
  c('typing again forgets the pick: a typed address the Census cannot find says so, as before', g3, 'No match for that address.');
  c('no page errors', P.errs, []);

  console.log('\n-- in Spanish --');
  const S=page({lang:'es'}); await ready(S); S.E("openTool('survey')"); await sleep(60);
  c('the box and its line', [S.q('#addr').placeholder,/^Escriba el nombre o la dirección de la iglesia\./.test(S.txt('.ask p.lead'))], ['Nombre o dirección de la iglesia',true]);
  wire(S,b=>({ok:true,list:[DIR],google:false}));
  await type(S,'fairview');
  c('it asks in Spanish', S.J('__asked')[0].b.lang, 'es');
  c('no page errors', S.errs, []);
}); T.done(); })();
