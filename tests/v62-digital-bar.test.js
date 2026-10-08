// v10.62.0 — Digital footprint, the bar raised (DESIGN-DIGITAL-2.md, Terrain-work/v79). The pastor (8 Oct 2026): "when it says like
// current, it doesn't really mean that it's a good website doesn't mean that it's doing its work as a website. A lot of websites are up,
// but they're horrible"; "we need some feedback as to why websites aren't working what we're missing"; "If it's not perfect then don't show
// that it's perfect. It needs to show really the deficiencies and where things can improve"; "I want to set the bar high".
// Part 2: every area judged against a checklist of marks (dfMarks: k, ok true|false|null, w 1|2, say, fix); "Current" only when every heavy
// mark passes and nine in ten of the counted marks pass; the share places the dot on the chart; the chip says the count; Facebook is never
// "Current"; "shows another pastor" from an embedded video. Part 4: the cards' failed lines and one "Good:" line, a fix per failed mark
// (grouped), the In depth block (a review by Claude, server-side, stubbed here), "Review in depth" on any church, the report's "In depth",
// "Website up, but not working", How to fix it's new entries, Spanish, no "AI". Made-up churches and a made-up review (the repository is
// public). Written failing-first on v10.61.0.
const {sleep,until,checker,page,ready}=require('./v45-helpers.js');
const {site62,yt62,G62,ch62,FIND62,REVIEW62,dfFetch62}=require('./v62-digital-helpers.js');
const T=checker(), c=T.c;
const jspdf=require('jspdf'); jspdf.jsPDF.API.save=function(){ return this; };
const FIND=FIND62();
const J=(P,o,own,F)=>P.J(`(()=>{ const F=${JSON.stringify(F||FIND)}; const X=dfContext(F); const c=F.churches.find(x=>x.org===${JSON.stringify(o)}); const j=dfJudge(c,X,'2026-10-08',${own?'true':'false'},'Joshua Mura');
  return Object.fromEntries(Object.entries(j.areas).map(([k,a])=>[k,{s:a.s,head:a.head,lines:a.lines,n:a.n,met:a.met,share:a.share}])); })()`);
const M=(P,o,own,F)=>P.J(`(()=>{ const F=${JSON.stringify(F||FIND)}; const X=dfContext(F); const c=F.churches.find(x=>x.org===${JSON.stringify(o)}); const m=dfMarks(c,X,'2026-10-08',${own?'true':'false'},'Joshua Mura');
  return Object.fromEntries(Object.entries(m).map(([k,a])=>[k,a.map(x=>[x.k,x.ok,x.w])])); })()`);
const okOf=(m)=>Object.fromEntries(m.map(([k,ok])=>[k,ok]));
async function openChc(P){ P.E('openTool("churches")'); await until(()=>P.q('#chc-df .df-own')); await sleep(40); }
const BAD=/\bAI\b|\bIA\b/;

(async()=>{ await T.sec(async()=>{
  const P=page(); await ready(P);

  console.log('\n-- the marks: every one with its key, its weight, true, false or null --');
  const KEYS={website:['opens','https','mobile','fast','desc','name','words','address','phone','times','named','photo','other','stale','current','events','sermons','latest','giving','form','pics','own','links','live'],
    reach:['visitors','expect','bible','bibleForm','prayer','contact','news','map'],youtube:['recent','four','views','titles','desc','live','series','pastor','subs','about'],google:['found','open','website','phone','hours','reviews','stars','photos']};
  const HEAVY=['opens','https','mobile','address','times','named','other','current','visitors','bible','prayer','recent','views','found','open','website','hours'];
  let m=M(P,'ANBZ02',true);
  c('the four areas with marks, each mark in the design\'s order', Object.fromEntries(Object.entries(m).map(([k,a])=>[k,a.map(x=>x[0])])), KEYS);
  c('the heavy marks (w 2) are the design\'s; every other mark w 1', Object.values(m).flat().map(x=>[x[0],x[2]]).filter(x=>x[1]===2).map(x=>x[0]), HEAVY);
  c('his church that does its work: every mark true', Object.values(m).flat().filter(x=>x[1]!==true).map(x=>x[0]), []);
  m=M(P,'ANBZ03',false);
  c('a site that opens and fails everything: every website mark false but "opens" (the pastor\'s photo null: nobody is named to find a photo beside)',
    m.website.filter(x=>x[1]!==false).map(x=>x[0]+':'+x[1]), ['opens:true','photo:null']);
  c('…every way in false, every YouTube mark false, Google found and open but nothing else', [m.reach.map(x=>x[1]),m.youtube.map(x=>x[1]),okOf(m.google)],
    [Array(8).fill(false),Array(10).fill(false),{found:true,open:true,website:false,phone:false,hours:false,reviews:false,stars:false,photos:false}]);
  m=M(P,'ANBZ04',false);
  c('a reading by the older reader (no pages, dates, forms, pictures, words…): each mark it has no data for is null, never counted',
    Object.fromEntries(Object.entries(m).map(([k,a])=>[k,a.filter(x=>x[1]===null).map(x=>x[0])])),
    {website:['fast','desc','name','words','address','photo','stale','current','events','sermons','latest','form','pics','own','links'],reach:['expect','bibleForm','contact','news','map'],youtube:['titles','desc','live','pastor','subs','about'],google:['photos']});
  c('…and the marks it has data for are judged', [okOf(m.website).opens,okOf(m.website).named,okOf(m.youtube).series,okOf(m.google).hours], [true,true,true,true]);
  m=M(P,'ANBZ05',false);
  c('no website anywhere: "opens" false, every other website and ways-in mark null; no channel: every YouTube mark null; not on Google: "found" false, the rest null',
    [okOf(m.website).opens,m.website.slice(1).every(x=>x[1]===null),m.reach.every(x=>x[1]===null),m.youtube.every(x=>x[1]===null),okOf(m.google).found,m.google.slice(1).every(x=>x[1]===null)], [false,true,true,true,false,true]);
  c('views and subscribers are null without a member count', (()=>{ const F=FIND62(); F.churches[1].members=null; const mm=M(P,'ANBZ02',true,F); return [okOf(mm.youtube).views,okOf(mm.youtube).subs]; })(), [null,null]);
  const sm=P.J(`(()=>{ const F=${JSON.stringify(FIND)}; const X=dfContext(F); const c=F.churches[0]; return dfMarks(c,X,'2026-10-08',true,'Joshua Mura').website.filter(x=>x.ok===false).map(x=>[x.k,x.say]); })()`);
  c('each failed mark says what a visitor meets (Sampleton)', Object.fromEntries(sm), {
    desc:'No description for search results: Google shows the first words it finds.',
    name:'The name is written “Seventh-Day Adventist” on the home page; the denomination writes “Seventh-day Adventist”.',
    words:'Misspelled where a visitor reads: “All Rights Served” (home page).',
    photo:'No photo beside the pastor’s name.',
    other:'Another pastor is shown (see Pastor’s name).',
    stale:'A page a year out of date is still up: newsletter page (July 2023).',
    current:'The newest date we found on the site is July 2023, and nothing is dated ahead: it may not have been updated since.',
    events:'No events page with dates ahead.',
    sermons:'No sermons or watch page.',
    latest:'The newest sermon on the site is from June 2023.',
    form:'No form a visitor can send from the site: every door is a link out or an email address.',
    pics:'6 of 7 pictures have no description (a file name, or none): a screen reader and Google see nothing.',
    own:'1 picture looks generated or stock-named: visitors look for real people.',
    links:'A menu link leads nowhere: calendar page.'});

  console.log('\n-- the states: every heavy mark, and nine in ten --');
  let a=J(P,'ANBZ02',true);
  c('every mark met: Current, 24 of 24; the ways in 8 of 8; YouTube 10 of 10; Google 8 of 8', [a.website.s,a.website.met,a.website.n,a.reach.s,a.reach.met,a.reach.n,a.youtube.s,a.youtube.met,a.youtube.n,a.google.s,a.google.met,a.google.n], ['ok',24,24,'ok',8,8,'ok',10,10,'ok',8,8]);
  a=J(P,'ANBZ01',true);
  c('Sampleton: the site opens, is secure, fits a phone, shows the times: "Needs work · 10 of 24", never "Current"', [a.website.s,a.website.met,a.website.n,a.website.head], ['work',10,24,'Opens, with things to fix']);
  c('…the ways in 1 of 8 (needs work: Bible studies are offered); YouTube 9 of 10 is Current (no heavy mark failed); Google 6 of 8 needs work (no hours, a heavy mark)',
    [a.reach.s,a.reach.met,a.reach.n,a.youtube.s,a.youtube.met,a.youtube.n,a.google.s,a.google.met,a.google.n], ['work',1,8,'ok',9,10,'work',6,8]);
  const custom=(mod)=>{ const F=FIND62(); const ch=F.churches[1]; mod(ch); return J(P,'ANBZ02',true,F); };
  c('two light marks failed of 24 (92%): still Current', custom(ch=>{ ch.site.description=false; ch.site.events=false; }).website.s, 'ok');
  c('three light marks failed of 24 (88%): Needs work', custom(ch=>{ ch.site.description=false; ch.site.events=false; ch.site.map=false; ch.site.giving=false; }).website.s, 'work');
  c('one heavy mark failed (the address), 23 of 24: Needs work', (()=>{ const r=custom(ch=>{ ch.site.address=false; }); return [r.website.s,r.website.met]; })(), ['work',23]);
  c('a fatal mark: the site does not open → Needs help now; not on Google Maps → Needs help now', (()=>{ const r=J(P,'ANBZ05',false); return [r.website.s,r.google.s,r.reach.s]; })(), ['help','help','na']);
  c('no way in at all (0 of 8): Needs help now, "No way in for a neighbor"', (()=>{ const r=J(P,'ANBZ03',false); return [r.reach.s,r.reach.met,r.reach.head]; })(), ['help',0,'No way in for a neighbor']);
  c('a reading by the older reader: judged on the marks it has (9 of 9 website marks met: Current)', (()=>{ const r=J(P,'ANBZ04',false); return [r.website.s,r.website.met,r.website.n,r.website.lines.some(l=>/date|seconds/.test(l))]; })(), ['ok',9,9,false]);
  c('the share is met over counted', [a.website.share,J(P,'ANBZ04',false).website.share], [10/24,1]);

  console.log('\n-- the chips and the lines --');
  const chip=(o,k)=>P.J(`(()=>{ const F=${JSON.stringify(FIND)}; const X=dfContext(F); const c=F.churches.find(x=>x.org===${JSON.stringify(o)}); const d=document.createElement('div'); d.innerHTML=dfChip(dfJudge(c,X,'2026-10-08',true,'Joshua Mura').areas[${JSON.stringify(k)}]); return d.textContent; })()`);
  c('the chip says the state and the count: "Needs work · 10 of 24", "Current · 24 of 24"', [chip('ANBZ01','website'),chip('ANBZ02','website'),chip('ANBZ01','youtube')], ['Needs work · 10 of 24','Current · 24 of 24','Current · 9 of 10']);
  c('the pastor\'s chip keeps its three states, no count; Facebook\'s says Not read', [chip('ANBZ01','pastor'),chip('ANBZ01','social')], ['Needs work','Not read']);
  c('the card\'s lines: the failed marks, then one "Good:" line of the passed ones, last', [a.website.lines.includes('No events page with dates ahead.'),a.website.lines[a.website.lines.length-1]],
    [true,'Good: secure, fits a phone, opens quickly, the address, the phone, shows service times, names the pastor, online giving, a live-stream link.']);
  c('…the ways in: the failed doors, then what is there', a.reach.lines, ['No page for first-time visitors (Plan your visit).','Nothing on what to expect: parking, children, how long, what to wear.','No form to ask for Bible studies on the site: a neighbor must write an email or go to another site.','No way to ask for prayer.','No contact form: only a gmail.com email address.','No newsletter or text-message sign-up.','No directions or map.','Good: Bible studies offered.']);
  c('…YouTube: the one mark failed, and what is good', [a.youtube.lines.includes('No evangelistic series in the last 90 days.'),a.youtube.lines[a.youtube.lines.length-1]], [true,'Good: a video this week, four or more a month, views past half the members, titles that say the topic, descriptions that invite, a live stream scheduled, names the pastor, subscribers past half the members, the website in About.']);
  c('…Google: no hours, two photos', [a.google.lines.includes('No hours on Google: add the service times.'),a.google.lines.includes('Only 2 photos on Google: add a few of the building and the people.')], [true,true]);
  const b=J(P,'ANBZ03',false);
  c('a site that fails everything says each thing (never "we could not find a website")', [b.website.lines.includes('The site is not secure (its address starts with http, not https): browsers warn visitors.'),b.website.lines.includes('The site does not fit a phone: a visitor must pinch and scroll sideways.'),b.website.lines.includes('The church’s street address is not on the pages read.'),b.website.lines.includes('Misspelled where a visitor reads: “recieve” (home page).'),b.website.lines.includes('It took 7.2 seconds to open for our reader: slow on a phone.'),b.website.lines.some(l=>/could not find a website/.test(l))], [true,true,true,true,true,false]);
  c('…YouTube: each mark said', [b.youtube.lines.includes('0 videos in the last 30 days (four or more keeps a channel alive).'),b.youtube.lines.includes('About 12 views a video, with 80 members: fewer than half the members watch.'),b.youtube.lines.includes('15 of 15 titles are only a service word and a date (“Worship Service || Jan 10, 2026”).'),b.youtube.lines.includes('Only 0 of 15 descriptions carry a link, the address or the service times.'),b.youtube.lines.includes('Ann Lee is not named in the titles or descriptions.'),b.youtube.lines.includes('20 subscribers, with 80 members.'),b.youtube.lines.includes('The channel’s About page does not name the website.')], [true,true,true,true,true,true,true]);

  console.log('\n-- "shows another pastor", from an embedded video --');
  c('Sampleton: named on the staff page, no photo, and the home page video names a previous pastor (its title and date quoted)', [a.pastor.s,a.pastor.head,a.pastor.lines],
    ['work','Another pastor in a video',['Names Joshua Mura (our staff page). We found no photo beside the name.','A video on the home page names Sample Previous, not the pastor of record: “Sabbath Worship with Pastor Sample Previous” (3 Jun 2023).']]);
  c('…not named at all and a video names another: Needs help now, "Shows another pastor"', (()=>{ const F=FIND62(); F.churches[0].site.pastors=[]; F.churches[0].site.pastorNamed=[]; const r=J(P,'ANBZ01',true,F); return [r.pastor.s,r.pastor.head]; })(), ['help','Shows another pastor']);
  c('a video naming the pastor of record, or a staff member, shows no other pastor', (()=>{ const F=FIND62(); F.churches[0].site.videos[0].names=['Pastor Joshua Mura']; F.churches[0].staff='Robert Banks · Lay Pastor'; F.churches[0].site.videos.push({id:'v2',on:'/',title:'Youth day',by:'Sampleton',date:'2026-09-01',names:['Robert Banks']}); const mm=M(P,'ANBZ01',true,F); return okOf(mm.website).other; })(), true);

  console.log('\n-- Facebook is never "Current" --');
  c('linked from the website, with followers: "Not read", "Linked, not read" (we cannot see it)', [a.social.s,a.social.head,a.social.lines[0]], ['unread','Linked, not read','Facebook page: facebook.com/sampleton, 900 followers.']);
  c('found by a search, not linked: Not read too; none after a search: Needs help now; no search run: "Not linked"', (()=>{ const F=FIND62(); F.churches[1].facebook={url:'https://www.facebook.com/p/Brook',from:'search',followers:12}; const r1=J(P,'ANBZ02',true,F);
    const r2=J(P,'ANBZ03',false); const F3=FIND62(); F3.search=false; F3.churches.forEach(x=>{ x.search={read:false}; x.facebook=null; }); const r3=J(P,'ANBZ04',false,F3); return [r1.social.s,r1.social.head,r2.social.s,r2.social.head,r3.social.s,r3.social.head]; })(),
    ['unread','Not linked from the website','help','No Facebook page found','unread','Not linked']);

  console.log('\n-- the fixes: one per failed mark, grouped, heavy first --');
  const fx=P.J(`(()=>{ const F=${JSON.stringify(FIND)}; const X=dfContext(F); const c=F.churches[0]; return dfFixes(c,dfJudge(c,X,'2026-10-08',true,'Joshua Mura'),'Joshua Mura').map(f=>[f.k,f.w,f.what,f.who,f.when]); })()`);
  c('one fix for the forms, one for the pictures, one for the stale pages, one for the words', ['forms','pics','stale','words'].map(g=>fx.filter(f=>f[0]===g).length), [1,1,1,1]);
  c('sorted heavy first: the pastor, something current, the forms, the visitors\' page, Google; then the rest', [fx.slice(0,5).map(f=>f[0]),fx.slice(0,5).every(f=>f[1]===2),fx.slice(5).every(f=>f[1]===1)], [['pastor','fresh','forms','visit','google'],true,true]);
  c('each with who and when', fx.map(f=>!!f[3]&&!!f[4]).every(Boolean), true);
  c('the forms fix names the doors; the words fix names the spelling; the pictures fix asks for real, described photographs; the stale fix names the page',
    [fx.find(f=>f[0]==='forms')[2],fx.find(f=>f[0]==='words')[2],fx.find(f=>f[0]==='pics')[2],fx.find(f=>f[0]==='stale')[2]],
    ['Add forms a visitor can send from the site, each a door: Ask for prayer, Request Bible studies, Contact us, and a newsletter sign-up (the site builder’s own form, Google Forms or Jotform, free). Someone answers within a day.',
     'Write the church’s name as the denomination does, “Seventh-day Adventist”, and fix the words with errors (“All Rights Served”); read every page aloud once a quarter.',
     'Use real photographs of the church’s own people, each described in a few words (the alt text); take down the 1 generated or stock picture.',
     'Take down the page a year out of date (newsletter page, July 2023), or bring it up to date.']);
  const fxb=P.J(`(()=>{ const F=${JSON.stringify(FIND)}; const X=dfContext(F); const c=F.churches[1]; return dfFixes(c,dfJudge(c,X,'2026-10-08',true,'Joshua Mura'),'Joshua Mura'); })()`);
  c('a church that does its work: no fix', fxb, []);

  console.log('\n-- the page: the chart by share --');
  let calls=dfFetch62(P,{review:'off'}); await openChc(P);
  const figs=Object.fromEntries(P.qa('#chc-df .df-own').map(a=>[a.querySelector('h3').textContent,a.querySelector('.df-radar')]));
  const pts=s=>s.trim().split(/\s+/).map(p=>p.split(',').map(Number)), dist=([x,y])=>Math.round(Math.hypot(x-150,y-124));
  c('each dot as far out as the share of marks met: U·(1+2·share); Sampleton 10 of 24 → 51, the ways in 1 of 8 → 35, YouTube 9 of 10 → 78, Google 6 of 8 → 70; the pastor by its state; Facebook hollow in the middle',
    pts(figs.Sampleton.querySelector('.df-me-l').getAttribute('points')).map(dist), [51,56,70,56,78,35]);
  c('…every mark met: at the rim', pts(figs.Brookfield.querySelector('.df-me-l').getAttribute('points')).map(dist), [84,84,84,56,84,84]);
  c('Facebook\'s mark is hollow, never coloured, even linked with followers', [...figs.Brookfield.querySelectorAll('.df-dot')].map(d=>d.getAttribute('class')), ['df-dot df-dot-ok','df-dot df-dot-ok','df-dot df-dot-ok','df-dot df-dot-u','df-dot df-dot-ok','df-dot df-dot-ok']);
  c('the chips on the cards carry the counts', P.qa('#chc-df .df-own')[1].querySelector('.df-area .df-st').textContent, 'Needs work · 10 of 24');
  c('no "In depth" block when the server has no review', P.qa('#chc-df .df-deep').length, 0);
  c('"Who needs help most" gains "Website up, but not working": a site that opens with three or more heavy marks failed, and what they are',
    [P.qa('#chc-df .df-needs h4').map(h=>h.textContent.replace(/\s*\d+$/,'')).includes('Website up, but not working'),(()=>{ const s=P.qa('#chc-df .df-needs section').find(s=>/Website up/.test(s.textContent)); return s?[[...s.querySelectorAll('li a')].map(a=>a.textContent),s.querySelector('.df-why').textContent]:null; })()],
    [true,[['Allfail'],'Not secure, does not fit a phone, no address, no service times, the pastor not named, another pastor shown, nothing current.']]);
  c('How to fix it gains the forms, the pictures and the words (nine boxes, three by three)', P.qa('#chc-df .df-hows article h4').map(h=>h.textContent),
    ['No website, or one that does not open','Not on Google Maps, out of date, or few reviews','The pastor’s name is missing or out of date','No form a visitor can send','Pictures undescribed, or generated','The name misspelled, or words with errors','No Facebook page, or one the website does not link','YouTube and the live stream','A way in for a neighbor']);
  c('…and YouTube\'s box says what a title and a description should carry', /title that says the topic/.test(P.qa('#chc-df .df-hows article')[7].textContent)&&/description/.test(P.qa('#chc-df .df-hows article')[7].textContent), true);
  c('no page errors', P.errs, []);

  console.log('\n-- In depth: the review, by itself for his churches on an unlocked device --');
  const TOK='r1.AbCdEfGhIjKl.1abc2.'+'x'.repeat(32);   // a registration token in the server's form (made up)
  const U=page({store:{'terrain-ai-pass':'x'}}); await ready(U); U.E(`(()=>{ const r=regGet()||{}; localStorage.setItem('terrain-reg',JSON.stringify({...r,tok:${JSON.stringify(TOK)}})); })()`); let uc=dfFetch62(U,{review:'kept'}); await openChc(U);
  await until(()=>U.qa('#chc-df .df-own .df-deep .df-deep-done').length===2);
  const rv=uc.filter(x=>x.method==='POST'&&x.body.op==='review').map(x=>x.body).sort((p,q)=>p.org<q.org?-1:1);
  c('one review asked for each of his churches, with the key, the language, his name and that it is his', rv, [{op:'review',conf:'Pennsylvania',org:'ANBZ01',key:'x',lang:'en',own:true,myName:'Joshua Mura',fresh:false},{op:'review',conf:'Pennsylvania',org:'ANBZ02',key:'x',lang:'en',own:true,myName:'Joshua Mura',fresh:false}]);
  c('…with the registration token', uc.filter(x=>x.body&&x.body.op==='review').every(x=>x.reg===TOK), true);
  const deep=U.qa('#chc-df .df-own').find(a=>/Sampleton/.test(a.querySelector('h3').textContent)).querySelector('.df-deep');
  c('the block: its heading, and the sections in order', [deep.querySelector('.df-deep-h').textContent,[...deep.querySelectorAll('h5')].map(h=>h.textContent)],
    ['In depth',['What a first-time visitor experiences','Strengths','What keeps a neighbor out','Would help','Polish','The pictures','Does it make an appeal?','The pastor a visitor meets','Words ready to paste']]);
  c('what a first-time visitor experiences, in the review\'s words', deep.querySelector('.df-deep-sees').textContent, REVIEW62().sees);
  c('the strengths, each with where', [...deep.querySelectorAll('.df-deep-str li')].map(l=>l.textContent), ['Service times on the first screen (home page)','The channel posts every week with the address in each description (YouTube)','Bible studies are offered (bible-studies page)']);
  c('the gaps by priority: two keep a neighbor out, two would help, one to polish; each its title, what, why, fix, who · effort', [[...deep.querySelectorAll('.df-gap')].map(g=>g.dataset.p),(()=>{ const g=deep.querySelector('.df-gap'); return [g.querySelector('b').textContent,g.querySelector('.df-gap-what').textContent,g.querySelector('.df-gap-why').textContent,g.querySelector('.df-gap-fix').textContent,g.querySelector('.df-gap-who').textContent]; })()],
    [['1','1','2','2','3'],['A previous pastor on the home page','The home page video is “Sabbath Worship with Pastor Sample Previous”, from June 2023.','A visitor meets someone who is no longer here.','Replace the video with this month’s sermon and add a short welcome from the pastor, with a recent photo.','Media team · a day']]);
  c('the pictures: what each shows, never who', [...deep.querySelectorAll('.df-deep-pics li')].map(l=>l.textContent), ['home page: A slideshow of worship photographs and one drawn picture of a church building. The drawn picture looks generated; the photographs are real but undescribed.']);
  c('the appeal, as words; the pastor a visitor meets', [deep.querySelector('.df-deep-appeal').textContent,deep.querySelector('.df-deep-pastor').textContent], ['A hint. A welcome line on the staff page; no invitation to a visit, a study or prayer.','No. The pastor of record is named on the staff page without a photo; the home page video shows another.']);
  c('the words ready to paste, each labelled, with Copy', [[...deep.querySelectorAll('.df-deep-words .df-wfor')].map(l=>l.textContent),deep.querySelectorAll('.df-deep-words pre').length,[...deep.querySelectorAll('.df-deep-words [data-df-copyw]')].map(b=>b.textContent)], [['A welcome for the home page','Plan your visit','The prayer request page'],3,['Copy','Copy','Copy']]);
  U.w.navigator.clipboard={writeText:async t=>{ U.w.__copied=t; }};
  deep.querySelector('.df-deep-words [data-df-copyw]').click(); await sleep(20);
  c('…Copy puts that text on the clipboard', [U.w.__copied,deep.querySelector('.df-deep-words [data-df-copyw]').textContent], [REVIEW62().words[0].text,'Copied']);
  c('"Reviewed {date} · Review again"', [deep.querySelector('.df-deep-foot span').textContent,deep.querySelector('[data-df-deepagain]').textContent], ['Reviewed 8 Oct 2026','Review again']);
  const n0=uc.length; deep.querySelector('[data-df-deepagain]').click(); await sleep(30);
  c('Review again asks for a fresh review (counted on the server)', uc.slice(n0).filter(x=>x.body&&x.body.op==='review').map(x=>[x.body.org,x.body.fresh]), [['ANBZ01',true]]);
  await until(()=>U.qa('#chc-df .df-own .df-deep .df-deep-done').length===2);
  c('no "AI" anywhere on the page with the review', BAD.test(U.txt('#chc-df')), false);

  console.log('-- the report gains "In depth" --');
  U.q('#chc-df [data-df-rep="ANBZ01"]').click(); await sleep(30);
  const hs=U.qa('#chc-df .df-doc h4').map(h=>h.textContent);
  c('after "Fix first": In depth', [hs.indexOf('In depth')>hs.indexOf('Fix first'),hs.indexOf('In depth')>0], [true,true]);
  const rep=U.q('#chc-df .df-doc .df-rep-deep');
  c('the sees line, the priority-1 and 2 gaps as rows (what · fix · who · effort), and the words', [rep.querySelector('p').textContent,[...rep.querySelectorAll('li')].map(l=>l.textContent),rep.querySelectorAll('pre').length],
    [REVIEW62().sees,['The home page video is “Sabbath Worship with Pastor Sample Previous”, from June 2023. Fix: Replace the video with this month’s sermon and add a short welcome from the pastor, with a recent photo. Media team · a day',
      '“Bible studies” is three links to other sites; there is no prayer request. Fix: Add two short forms: Ask for prayer, and Request Bible studies (name, phone or email, what you would like). Webmaster · about an hour',
      'The newsletter page’s last issue is dated “July 2, 2023”. Fix: Take the page down, or post this quarter’s issue. Webmaster · about an hour',
      'Google shows the church with no hours. Fix: Add the Sabbath hours in the Google Business Profile. Communication leader · about an hour'],3]);
  const R=U.J(`(()=>{ const F=DF.data, X=dfContext(F), c=F.churches[0]; const J=dfJudge(c,X,F.read,true,'Joshua Mura'); const r=dfReportText(c,J,'Joshua Mura',F); return {deep:!!r.deep,rows:r.deep?r.deep.rows.length:0,words:r.deep?r.deep.words.length:0}; })()`);
  c('dfReportText carries it (deep: sees, 4 rows, 3 words)', R, {deep:true,rows:4,words:3});
  U.w.jspdf=jspdf;
  const pdf=U.E(`(()=>{ try{ const F=DF.data, X=dfContext(F), c=F.churches[0]; const J=dfJudge(c,X,F.read,true,'Joshua Mura'); return dfPdfDoc(window.jspdf.jsPDF,c,J,'Joshua Mura',F).__dfLog.join(' | '); }catch(e){ return 'ERR '+e.message; } })()`);
  c('the PDF the same: In depth, the sees line, the rows, the words', [/^ERR/.test(pdf),/In depth/.test(pdf),/A visitor lands on a slideshow/.test(pdf),/Media team · a day/.test(pdf),/Welcome to Sampleton Seventh-day Adventist Church/.test(pdf),BAD.test(pdf)], [false,true,true,true,true,false]);
  U.q('#chc-df [data-df-prop]').click(); await sleep(60);
  c('"Make it a proposal" carries the top three gaps with it', [U.E('TOOL'),JSON.parse(U.w.sessionStorage.getItem('terrain-df-gaps')||'null')], ['case',{org:'ANBZ01',name:'Sampleton',gaps:[{title:'A previous pastor on the home page',fix:'Replace the video with this month’s sermon and add a short welcome from the pastor, with a recent photo.',who:'Media team'},{title:'No way to ask on the site',fix:'Add two short forms: Ask for prayer, and Request Bible studies (name, phone or email, what you would like).',who:'Webmaster'},{title:'A newsletter from 2023',fix:'Take the page down, or post this quarter’s issue.',who:'Webmaster'}]}]);

  console.log('-- a job, then done; failed; locked; without the lock; the day\'s limit; busy --');
  const V=page({store:{'terrain-ai-pass':'x'}}); await ready(V); V.E('DF_DEEP.poll=250'); let vc=dfFetch62(V,{review:'job'}); await openChc(V);
  await until(()=>V.q('#chc-df .df-own .df-deep .df-deep-work'));
  c('while it studies: "Reviewing {church}’s digital front door… a minute or two."', V.qa('#chc-df .df-own .df-deep .df-deep-work').map(e=>e.textContent).sort(), ['Reviewing Brookfield’s digital front door… a minute or two.','Reviewing Sampleton’s digital front door… a minute or two.']);
  await until(()=>V.qa('#chc-df .df-own .df-deep .df-deep-done').length===2,5000);
  c('…polled with review-status until done, then drawn', [vc.filter(x=>x.body&&x.body.op==='review-status').length>=2,V.qa('#chc-df .df-own .df-deep .df-deep-done').length], [true,2]);
  const W=page({store:{'terrain-ai-pass':'x'}}); await ready(W); W.E('DF_DEEP.poll=15'); let wc=dfFetch62(W,{review:'failed'}); await openChc(W);
  await until(()=>W.qa('#chc-df .df-own .df-deep .df-deep-fail').length===2,5000);
  c('failed: "The review could not be made just now." and Review again', [W.q('#chc-df .df-own .df-deep .df-deep-fail').textContent,!!W.q('#chc-df .df-own .df-deep [data-df-deepagain]')], ['The review could not be made just now.',true]);
  const X=page({store:{'terrain-ai-pass':'x'}}); await ready(X); dfFetch62(X,{review:'locked'}); await openChc(X);
  await until(()=>X.qa('#chc-df .df-own .df-deep .df-deep-lock').length===2,5000);
  c('the server says the device is locked: one line, never "AI"', [X.q('#chc-df .df-own .df-deep .df-deep-lock').textContent,BAD.test(X.txt('#chc-df'))], ['An in-depth review by Terrain is available on an unlocked device.',false]);
  const Y=page(); await ready(Y); const yc=dfFetch62(Y,{review:'kept'}); await openChc(Y);
  c('without the lock on this device: the same one line, and nothing asked of the server', [Y.qa('#chc-df .df-own .df-deep .df-deep-lock').length,yc.filter(x=>x.body&&/review/.test(x.body.op)).length], [2,0]);
  c('…and no "Review in depth" on another church\'s row', (()=>{ Y.E(`document.querySelector('#chc-df tr.df-row[data-df-row="ANBZ03"]').click()`); return !!Y.q('#chc-df tr.df-detail:not([hidden]) [data-df-deepgo]'); })(), false);

  console.log('-- Every church: "Review in depth" on his tap --');
  const Z=page({store:{'terrain-ai-pass':'x'}}); await ready(Z); const zc=dfFetch62(Z,{review:'kept'}); await openChc(Z);
  await until(()=>Z.qa('#chc-df .df-own .df-deep .df-deep-done').length===2);
  Z.E(`document.querySelector('#chc-df tr.df-row[data-df-row="ANBZ03"]').click()`); await sleep(30);
  const row=Z.q('#chc-df tr.df-detail:not([hidden])');
  c('a tapped row shows its areas with counts (23: nobody is named, so no photo to look for), and a "Review in depth" button', [row.querySelector('.df-area .df-st').textContent,row.querySelector('[data-df-deepgo]').textContent], ['Needs work · 1 of 23','Review in depth']);
  const z0=zc.length; row.querySelector('[data-df-deepgo]').click(); await until(()=>Z.q('#chc-df tr.df-detail:not([hidden]) .df-deep-done'),5000);
  c('the tap asks for that church (not his: own false), and the block is drawn in the row', [zc.slice(z0).filter(x=>x.body&&x.body.op==='review').map(x=>[x.body.org,x.body.own,x.body.myName]),!!Z.q('#chc-df tr.df-detail:not([hidden]) .df-deep-done .df-deep-sees')], [[['ANBZ03',false,'Joshua Mura']],true]);
  const L2=page({store:{'terrain-ai-pass':'x'}}); await ready(L2); dfFetch62(L2,{review:'limit'}); await openChc(L2);
  await until(()=>L2.qa('#chc-df .df-own .df-deep .df-deep-fail').length===2,5000);
  c('the day\'s limit: said so', L2.q('#chc-df .df-own .df-deep .df-deep-fail').textContent, 'Three in-depth reviews a day: try again tomorrow.');
  const B2=page({store:{'terrain-ai-pass':'x'}}); await ready(B2); B2.E('DF_DEEP.poll=15'); dfFetch62(B2,{review:'busy'}); await openChc(B2);
  await until(()=>B2.qa('#chc-df .df-own .df-deep .df-deep-done').length===2,5000);
  c('a review already being made for the church: waited for, then shown', B2.qa('#chc-df .df-own .df-deep .df-deep-done').length, 2);
  c('no page errors', [U.errs,V.errs,W.errs,X.errs,Y.errs,Z.errs,L2.errs,B2.errs], [[],[],[],[],[],[],[],[]]);

  console.log('\n-- Spanish --');
  const S=page({lang:'es',store:{'terrain-ai-pass':'x'}}); await ready(S); const sc=dfFetch62(S,{review:'kept'}); await openChc(S);
  await until(()=>S.qa('#chc-df .df-own .df-deep .df-deep-done').length===2);
  const sd=S.qa('#chc-df .df-own').find(a=>/Sampleton/.test(a.querySelector('h3').textContent));
  c('the chips, the lines and the block in Spanish', [sd.querySelector('.df-area .df-st').textContent,sd.querySelector('.df-deep-h').textContent,[...sd.querySelectorAll('.df-deep h5')].map(h=>h.textContent),sd.querySelector('.df-deep-foot span').textContent,sd.querySelector('[data-df-deepagain]').textContent],
    ['Necesita trabajo · 10 de 24','A fondo',['Lo que vive un visitante la primera vez','Fortalezas','Lo que deja fuera al vecino','Ayudaría','Pulir','Las fotos','¿Hace un llamado?','El pastor que encuentra un visitante','Texto listo para pegar'],'Revisado el 8 oct 2026','Revisar de nuevo']);
  c('…the review asked for in Spanish', sc.filter(x=>x.body&&x.body.op==='review').every(x=>x.body.lang==='es'), true);
  const se=J(S,'ANBZ01',true);
  c('…the judge\'s words', [se.website.lines[se.website.lines.length-1].slice(0,6),se.reach.lines[0],se.social.head,se.pastor.head], ['Bien: ','Sin página para quienes visitan por primera vez (Planee su visita).','Enlazada, no leída','Otro pastor en un video']);
  c('…"Website up, but not working", the new How-to-fix boxes, the lock line', [S.qa('#chc-df .df-needs h4').map(h=>h.textContent.replace(/\s*\d+$/,'')).includes('Sitio web en línea, pero no funciona'),S.qa('#chc-df .df-hows article h4').map(h=>h.textContent).slice(3,6),S.E(`dfT('deepLock')`)],
    [true,['Ningún formulario para el visitante','Fotos sin descripción, o generadas','El nombre mal escrito, o palabras con errores'],'Una revisión a fondo por Terrain está disponible en un dispositivo desbloqueado.']);
  c('every word of DF_T has Spanish', S.J(`Object.entries(DF_T).filter(([k,v])=>!v||typeof v.en!=='string'||typeof v.es!=='string').map(([k])=>k)`), []);
  c('no "AI" in Spanish either; no page errors', [BAD.test(S.txt('#chc-df')),S.errs], [false,[]]);
}); T.done(); })();
