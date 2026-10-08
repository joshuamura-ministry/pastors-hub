// v10.61.0 — Digital footprint says more: how current a website is (by the dates a visitor sees), the pastor's photo by his name, how fast
// the site opens and what it offers; and a circle chart of the six areas for each church. The pastor (7 Oct 2026), of his own church's card:
// "I thought it was gonna say more … on the website … it doesn't even have my picture on there it's hasn't been updated in a long time …
// once in a while in this box we need some kind of graph … circular graph … show which areas are weak which areas can get better which
// areas are stronger … Pastor's name current yeah it may show my name there, but is it showing my picture?"
// Made-up churches (the repository is public). Written failing-first on v10.60.1.
const {sleep,until,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const site=(o={})=>({listed:'www.x.test',url:'https://www.x.test/',opens:true,https:true,mobile:true,title:'X Seventh-day Adventist Church',pagesRead:['/','/about'],
  pastors:[],pastorNamed:[],serviceTimes:true,phones:['215-555-0100'],bibleStudy:true,prayerRequest:true,giving:true,visitors:true,social:{facebook:null,instagram:null,youtube:null,livestream:null},
  pastDate:'2026-10-03',nextDate:'2026-10-17',ahead:2,ms:600,description:true,events:true,sermons:true,pastorPhoto:null,pastorPhotoOn:null,...o});
const G=(o={})=>({read:true,found:true,name:'X Seventh-day Adventist Church',rating:4.7,reviews:38,status:'OPERATIONAL',website:'https://www.x.test/',phone:'(215) 555-0100',maps:'https://maps.google.com/?cid=1',hours:['Saturday: 9:30 AM – 1:00 PM'],...o});
const ch=(o={})=>({org:'ANBZ01',name:'Sampleton SDA Church',kind:'church',town:'Sampleton',state:'PA',address:'10 Main St Sampleton PA 19000',phone:'215-555-0100',pastor:'Joshua Mura',members:120,
  website:'www.x.test',read:'2026-10-08',site:site(),google:G(),search:{read:true,ownAt:1},dirPastors:[],facebook:{url:'https://www.facebook.com/x',from:'site',followers:null},instagram:null,
  youtube:{url:'https://www.youtube.com/@x',read:true,latest:{t:'Sabbath sermon',d:'2026-10-04',v:80},inFeed:15,last30:4,last90:12,avgViews:90,kinds:{sermon:15,series:0,worship:0,event:0},titles:[]},...o});
const FIND={v:1,fn:'digital-read-1.1',conf:'Pennsylvania',org:'ANBI11',read:'2026-10-08',at:Date.parse('2026-10-08T12:00:00Z'),places:true,search:true,churches:[
  // his: named on the staff page, no photo; no dates on the site
  ch({org:'ANBZ01',name:'Sampleton SDA Church',site:site({pastors:[{name:'Josh Mura',former:false,pages:['/our-staff']}],pastorNamed:['/our-staff'],pastDate:null,nextDate:null,ahead:0,description:false})}),
  // his other: named with a photo, dates ahead
  ch({org:'ANBZ02',name:'Brookfield SDA Church',town:'Brookfield',site:site({url:'https://www.brook.test/',pastors:[{name:'Joshua Mura',former:false,pages:['/pastor'],photo:'near',photoOn:'/pastor'}],pastorNamed:['/pastor'],pastorPhoto:'near',pastorPhotoOn:'/pastor'}),google:G({website:'https://www.brook.test/'})}),
  // another: the newest date long past, nothing ahead, slow
  ch({org:'ANBZ03',name:'Oldtown SDA Church',town:'Oldtown',pastor:'Ann Lee',site:site({url:'https://old.test/',pastors:[{name:'Ann Lee',pages:['/about'],photo:'named',photoOn:'/about'}],pastorNamed:['/about'],pastorPhoto:'named',pastorPhotoOn:'/about',pastDate:'2024-03-10',nextDate:null,ahead:0,ms:6200}),google:G({website:'https://old.test/'})}),
  // read by the older reader (no pastDate): judged as before
  ch({org:'ANBZ04',name:'Elder SDA Church',town:'Elder',pastor:'Carl Day',site:(()=>{ const s=site({pastors:[{name:'Carl Day',pages:['/about']}],pastorNamed:['/about']}); ['pastDate','nextDate','ahead','ms','description','events','sermons','pastorPhoto','pastorPhotoOn'].forEach(k=>delete s[k]); return s; })()}),
  // Google not read: a hollow mark on the chart
  ch({org:'ANBZ05',name:'Nogle SDA Church',town:'Nogle',pastor:'Dee Fox',site:site({pastors:[{name:'Dee Fox',pages:['/about'],photo:'named',photoOn:'/about'}],pastorNamed:['/about'],pastorPhoto:'named',pastorPhotoOn:'/about'}),google:{read:false,why:'nokey'}}),
]};
function dfFetch(P){
  const f0=P.w.fetch;
  P.w.fetch=async(u,o)=>{ u=String(u); if(!/\/\.netlify\/functions\/digital/.test(u)) return f0(u,o);
    return {ok:true,status:200,json:async()=>({ok:true,fn:'digital-1.1',conf:'Pennsylvania',supported:true,enabled:true,places:true,search:true,state:'ready',findings:JSON.parse(JSON.stringify(FIND)),reading:null})}; };
}
const J=(P,o,own)=>P.J(`(()=>{ const F=${JSON.stringify(FIND)}; const X=dfContext(F); const c=F.churches.find(x=>x.org===${JSON.stringify(o)}); const j=dfJudge(c,X,'2026-10-08',${own?'true':'false'},'Joshua Mura');
  return Object.fromEntries(Object.entries(j.areas).map(([k,a])=>[k,{s:a.s,head:a.head,lines:a.lines}])); })()`);

(async()=>{ await T.sec(async()=>{
  const P=page(); await ready(P);
  P.E(`(()=>{ const r=regGet()||{}; localStorage.setItem('terrain-reg',JSON.stringify({...r,name:'Joshua Mura',email:'p@example.org',church:'Sampleton SDA',conf:'Pennsylvania',role:'pastor'})); })()`);

  console.log('\n-- the website: how current, how fast, what it offers --');
  let A=J(P,'ANBZ01',true);
  c('no dates on the pages read: "Needs work", and why (a visitor cannot tell it is current)', [A.website.s,A.website.lines.some(l=>/We found no dates on the pages read/.test(l))], ['work',true]);
  c('…what it offers is said with what is good (v10.62.0: one "Good:" line, last)', /^Good: .*an events calendar, sermons or a live stream, online giving/.test(A.website.lines[A.website.lines.length-1]), true);
  A=J(P,'ANBZ02',true);
  c('dates ahead: current, "Lists dates ahead (the next: Oct 17)."', [A.website.s,A.website.lines.includes('Lists dates ahead (the next: Oct 17).')], ['ok',true]);
  A=J(P,'ANBZ03',false);
  c('the newest date long past, nothing ahead: said as found, never "abandoned"', [A.website.s,A.website.lines.find(l=>/newest date/.test(l))], ['work','The newest date we found on the site is March 2024, and nothing is dated ahead: it may not have been updated since.']);
  c('slow to open: said with the seconds', A.website.lines.includes('It took 6.2 seconds to open for our reader: slow on a phone.'), true);
  A=J(P,'ANBZ04',false);
  // v10.62.0 (the bar raised): judged on the marks it has (no word on dates or speed); this reading's one miss, no live-stream link, is said
  c('a reading by the older reader is judged on the marks it has (no word on dates or speed)', [A.website.s,A.website.lines.some(l=>/date|seconds/.test(l)),A.website.lines.includes('No live-stream link on the site.')], ['work',false,true]);

  console.log('\n-- the pastor: his name, and his photo --');
  A=J(P,'ANBZ01',true);
  c('named on the staff page, no photo found: "Needs work", "Named, no photo"', [A.pastor.s,A.pastor.head,A.pastor.lines[0]], ['work','Named, no photo','Names Joshua Mura (our staff page). We found no photo beside the name.']);
  A=J(P,'ANBZ02',true);
  c('named with a photo: current, "with a photo"', [A.pastor.s,A.pastor.lines[0]], ['ok','Names Joshua Mura (pastor page), with a photo.']);
  A=J(P,'ANBZ04',false);
  c('the older reader: no word on a photo', [A.pastor.s,A.pastor.lines.some(l=>/photo/.test(l))], ['ok',false]);
  const fx=P.J(`(()=>{ const F=${JSON.stringify(FIND)}; const X=dfContext(F); const c=F.churches[0]; return dfFixes(c,dfJudge(c,X,'2026-10-08',true,'Joshua Mura'),'Joshua Mura').map(f=>f.what); })()`);
  c('the fixes: the photo, a current home page each week, a description for search results', [fx.some(f=>/Add Joshua Mura’s photo beside the name/.test(f)),fx.some(f=>/Keep the home page current/.test(f)),fx.some(f=>/short description for search results/.test(f))], [true,true,true]);

  console.log('\n-- the circle chart --');
  dfFetch(P); P.E('openTool("churches")'); await until(()=>P.q('#chc-df .df-own')); await sleep(40);
  // his churches in name order: Brookfield (all current), then Sampleton
  const fig=P.qa('#chc-df .df-own').find(a=>/Sampleton/.test(a.querySelector('h3').textContent)).querySelector('.df-radar');
  c('each of his churches has a chart beside what a visitor sees', [P.qa('#chc-df .df-own .df-radar').length,!!P.q('#chc-df .df-own .df-sum .df-sees')], [2,true]);
  c('six areas round the ring, in the order of the cards', [...fig.querySelectorAll('.df-rl')].map(t=>t.textContent), ['Website','Pastor','Google','Facebook','YouTube','Ways in']);
  // v10.62.0: Facebook is never read, so its mark is hollow; YouTube needs work (no evangelistic series in its feed)
  c('each mark in its state\'s colour: the website, the pastor and YouTube needing work, Google and the ways in current, Facebook hollow', [...fig.querySelectorAll('.df-dot')].map(d=>d.getAttribute('class').replace('df-dot ','')), ['df-dot-work','df-dot-work','df-dot-ok','df-dot-u','df-dot-work','df-dot-ok']);
  const pts=s=>s.trim().split(/\s+/).map(p=>p.split(',').map(Number)), dist=([x,y])=>Math.round(Math.hypot(x-150,y-124));
  // v10.62.0: an area with marks sits by its share of marks met, U·(1+2·share): the website 11 of 15 (69), Google 8 of 8 (84), YouTube 4 of 5
  // (70), the ways in 3 of 3 (84); the pastor by its state (needs work, 56); Facebook hollow in the middle (56)
  c('as far out as it is strong: by the share of marks met; the rim at 84, the middle at 56', pts(fig.querySelector('.df-me-l').getAttribute('points')).map(dist), [69,56,84,56,70,84]);
  c('the conference\'s typical church drawn dashed behind', !!fig.querySelector('.df-typ'), true);
  c('a key: Current, Needs work, Needs help now, Not read, the typical church in Pennsylvania', [...fig.querySelectorAll('figcaption .df-k')].map(k=>k.textContent), ['Current','Needs work','Needs help now','Not read','the typical church in Pennsylvania']);
  c('it says what it shows to a screen reader', fig.querySelector('svg').getAttribute('aria-label'), 'Current: Google & Maps, Reaching out. Needs work: Website, Pastor’s name, YouTube & live stream');   // v10.62.0: Facebook unread, YouTube needs work
  const nog=P.J(`(()=>{ const F=${JSON.stringify(FIND)}; const X=dfContext(F); const c=F.churches.find(x=>x.org==='ANBZ05'); const d=document.createElement('div'); d.innerHTML=dfRadar(dfJudge(c,X,'2026-10-08',false,''),null); return [...d.querySelectorAll('.df-dot')].map(x=>x.getAttribute('class')); })()`);
  c('an area not read (Google, no key) is a hollow mark in the middle, never counted against the church', nog[2], 'df-dot df-dot-u');
  c('side by side: a small chart for each of his churches', P.qa('#chc-df .df-side .df-side-chart .df-radar-s').length, 2);
  P.E(`document.querySelector('#chc-df tr.df-row[data-df-row="ANBZ03"]').click()`); await sleep(30);
  c('a church opened in the list shows its chart too', !!P.q('#chc-df tr.df-detail:not([hidden]) .df-radar'), true);
  P.E(`(()=>{ LANG='es'; dfPaint(); })()`); await sleep(20);
  c('in Spanish', [...P.q('#chc-df .df-own .df-radar').querySelectorAll('.df-rl')].map(t=>t.textContent).concat([P.txt('#chc-df .df-own .df-rim')]),
    ['Sitio web','Pastor','Google','Facebook','YouTube','Puertas','En el borde: al día. En medio: necesita trabajo. Cerca del centro: necesita ayuda ya.']);
  P.E(`(()=>{ LANG='en'; dfPaint(); })()`);
}); T.done(); })();
