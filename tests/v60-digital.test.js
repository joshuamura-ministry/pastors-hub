// v10.60.0 — Digital footprint at the foot of Compare your churches: the findings digital.mjs gives a registered pastor, judged on the
// page (dfJudge) and drawn in six parts. The pastor (7 Oct 2026): "I would like to see all the churches in the conference … our own
// churches will be prioritized on the top … comparing the digital footprint … which churches are in great need of … a new website";
// "Google search and maps are very very important"; "no feeling no fill-in … a proposal to the communications person"; "make sure we're
// not missing something so we don't accuse them"; labels and who sees what: "yes"; the "take me there, with the words ready" buttons:
// "okay please proceed". Every judge case below is one the Pennsylvania sample met (Terrain-work/v77), on made-up churches.
// Written failing-first on v10.59.3.
const {sleep,until,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const site=(o={})=>({listed:'www.x.test',url:'https://www.x.test/',opens:true,https:true,mobile:true,title:'X Seventh-day Adventist Church',pagesRead:['/','/about'],
  pastors:[],pastorNamed:[],serviceTimes:true,phones:['215-555-0100'],bibleStudy:true,prayerRequest:true,giving:true,visitors:true,social:{facebook:null,instagram:null,youtube:null,livestream:null},...o});
const G=(o={})=>({read:true,found:true,name:'X Seventh-day Adventist Church',rating:4.7,reviews:38,status:'OPERATIONAL',website:'https://www.x.test/',phone:'(215) 555-0100',maps:'https://maps.google.com/?cid=1',hours:['Saturday: 9:30 AM – 1:00 PM'],...o});
const ch=(o={})=>({org:'ANBZ01',name:'Sampleton SDA Church',kind:'church',town:'Sampleton',state:'PA',address:'10 Main St Sampleton PA 19000',phone:'215-555-0100',pastor:'Ann Lee',members:120,
  website:'www.x.test',read:'2026-10-08',site:site(),google:G(),search:{read:true,ownAt:1},dirPastors:[],facebook:{url:'https://www.facebook.com/x',from:'site',followers:null},instagram:null,
  youtube:{url:'https://www.youtube.com/@x',read:true,latest:{t:'Sabbath sermon',d:'2026-10-04',v:80},inFeed:15,last30:4,last90:12,avgViews:90,kinds:{sermon:15,series:0,worship:0,event:0},titles:[]},...o});
const FIND={v:1,fn:'digital-read-1.0',conf:'Pennsylvania',org:'ANBI11',read:'2026-10-08',at:Date.parse('2026-10-08T12:00:00Z'),places:true,search:true,churches:[
  ch({org:'ANBZ01',name:'Sampleton SDA Church',pastor:'Joshua Mura',site:site({pastors:[{name:'Josh Mura',former:false,pages:['/our-staff-1']}],pastorNamed:['/our-staff-1']}),
    dirPastors:[{where:'ChurchFinder',name:'Mark Gold',url:'https://www.churchfinder.com/churches/pa/x'},{where:'JoinMyChurch',name:'Kevin E Irwin',url:'https://www.joinmychurch.com/x'}]}),
  ch({org:'ANBZ02',name:'Brookfield SDA Church',town:'Brookfield',pastor:'Joshua Mura',staff:'Robert Banks · Lay Pastor',
    site:site({url:'https://www.brook.test/',pastors:[{name:'Tomás Ríos',former:false,pages:['/pastor','/leaders']},{name:'Robert Banks',former:false,pages:['/leaders']},{name:'Joshua Mura',former:false,pages:['/livestream']}],pastorNamed:['/livestream']}),
    google:G({website:'https://www.brook.test/'}),facebook:{url:'https://www.facebook.com/brook',from:'site',followers:2462}}),
  ch({org:'ANBZ03',name:'Willowby SDA Church',town:'Willowby',website:'willowby.test',site:{listed:'willowby.test',opens:false,refused:false,status:0},google:G({website:'https://willowby.org/',name:'Willowby SDA Church',rating:4.9,reviews:12}),
    facebook:{url:'https://www.facebook.com/p/Willowby-SDA',from:'search',followers:306},youtube:null}),
  ch({org:'ANBZ04',name:'Shyton SDA Church',town:'Shyton',website:'shy.test',site:{listed:'shy.test',opens:false,refused:true,status:403},google:G({found:false,name:null}),facebook:null,youtube:null}),
  ch({org:'ANBZ05',name:'Robbins SDA Church',town:'Robbins',site:{listed:'robots.test',url:'https://robots.test/',opens:true,blocked:true}}),
  ch({org:'ANBZ06',name:'Lonely SDA Company',kind:'company',town:'Lonely',website:'lonely.test',site:{listed:'lonely.test',opens:false,refused:false,status:0},google:G({found:false}),facebook:null,youtube:null,search:{read:true,ownAt:null}}),
  ch({org:'ANBZ07',name:'Ridge SDA Church',town:'Ridge',pastor:'Carl Day',site:site({pastors:[{name:'Mission Statement',pages:['/']},{name:'Doug Batchelor',pages:['/']},{name:'Ed Olsen',pages:['/about']}],pastorNamed:[]}),
    google:G({status:'CLOSED_PERMANENTLY'})}),
  ch({org:'ANBZ08',name:'Phoneby SDA Church',town:'Phoneby',phone:'610-555-0001 or 484-555-0002',site:site({phones:['530-649-2940']}),google:G({phone:'(610) 555-0001'})}),
  ch({org:'ANBZ09',name:'Phoneby2 SDA Church',town:'Phoneby',site:site({phones:['530-649-2940']}),google:G({website:null,reviews:3})}),
  ch({org:'ANBZ10',name:'Phoneby3 SDA Church',town:'Phoneby',site:site({phones:['530-649-2940']})}),
  ch({org:'ANBZ11',name:'Lancaster Hispanic SDA Church',town:'Lancaster',otherSite:{url:'https://lancasterhispaniciipa.adventistchurch.org/',title:'Lancaster Hispanic II SDA Church',phones:[]}}),
  ch({org:'ANBZ16',name:'Lancaster Hispanic II SDA Church',town:'Lancaster',otherSite:{url:'https://lancasterhispanicpa.adventistchurch.org/',title:'Lancaster Hispanic SDA Church',phones:[]}}),
  ch({org:'ANBZ12',name:'York SDA Church',town:'York',otherSite:{url:'https://www.sdachurchyorksc.org/',title:'York Seventh Day Adventist Church',phones:[]}}),
  ch({org:'ANBZ13',name:'Pottsby SDA Church',town:'Pottsby',otherSite:{url:'https://pottsbysda.org/',title:'Welcome to the Pottsby SDA',phones:['610-555-0100'],pastors:[{name:'Evan Bell',pages:['/']}]}}),
  ch({org:'ANBZ14',name:'Stroud SDA Church',town:'Stroud',site:site({url:'https://stroudsdachurch.org/'}),otherSite:{url:'https://news.stroudsdachurch.org/',title:'Stroud Seventh-day Adventist Church | Digital Bulletin',phones:[]}}),
  ch({org:'ANBZ15',name:'Nogle SDA Church',town:'Nogle',google:{read:false,why:'nokey'}}),
]};
function dfFetch(P,opts){
  const f0=P.w.fetch, calls=[]; let state=opts.state||'ready';
  P.w.fetch=async(u,o)=>{ u=String(u); if(!/\/\.netlify\/functions\/digital/.test(u)) return f0(u,o);
    calls.push({u,method:(o&&o.method)||'GET',body:o&&o.body?JSON.parse(o.body):null,reg:o&&o.headers&&o.headers['x-terrain-reg']});
    if(opts.status) return {ok:false,status:opts.status,json:async()=>({ok:false,code:'noreg'})};
    if(o&&o.method==='POST'){ const b=JSON.parse(o.body); if(b.op==='read') state='reading'; return {ok:true,status:b.op==='again'&&opts.limit?429:202,json:async()=>({ok:true,state:'reading'})}; }
    const body={ok:true,fn:'digital-1.0',conf:'Pennsylvania',supported:true,enabled:opts.enabled!==false,places:true,search:true};
    if(state==='ready') Object.assign(body,{state:'ready',findings:JSON.parse(JSON.stringify(opts.findings||FIND)),reading:null});
    else if(state==='reading') Object.assign(body,{state:'reading',findings:null,reading:{phase:'read',done:40,total:129}});
    else Object.assign(body,{state:'none',findings:null,reading:null});
    return {ok:true,status:200,json:async()=>body}; };
  return calls;
}
async function openChc(P){ P.E('openTool("churches")'); await until(()=>P.q('#chc-df')&&!/Loading/.test(P.txt('#chc-df'))); await sleep(30); }
const J=(P,o,own)=>P.J(`(()=>{ const F=${JSON.stringify(FIND)}; const X=dfContext(F); const c=F.churches.find(x=>x.org===${JSON.stringify(o)}); const j=dfJudge(c,X,'2026-10-08',${own?'true':'false'},'Joshua Mura');
  return Object.fromEntries(Object.entries(j.areas).map(([k,a])=>[k,{s:a.s,head:a.head,lines:a.lines}])); })()`);

(async()=>{ await T.sec(async()=>{
  const P=page(); await ready(P);
  c('the six stamps say v10.60.0', [P.q('meta[name="terrain-version"]').content,P.q('html').dataset.version,P.txt('#ver'),P.E('VERSION')], ['v10.60.0','v10.60.0','v10.60.0','v10.60.0']);

  console.log('\n-- the judge: never accuse --');
  let a=J(P,'ANBZ03');
  c('a listed site that does not open, but Google lists a website: "Only on Google", never "no website"', [a.website.s,a.website.head], ['work','Only on Google']);
  a=J(P,'ANBZ06');
  c('nothing anywhere: "Website does not open", with exactly what was checked', [a.website.s,a.website.head,a.website.lines[1]], ['help','Website does not open','Checked: the official church listing (lonely.test); Google’s listing; a web search for its name.']);
  a=J(P,'ANBZ04');
  c('a site that refuses our reader: "Not read", never "does not open"', [a.website.s,/did not let our reader in/.test(a.website.lines[0]),/does not open/.test(a.website.lines.join(' '))], ['unread',true,false]);
  a=J(P,'ANBZ05');
  c('a site whose robots.txt asks programs not to read it: "Not read", said so', [a.website.s,/asks programs not to read it/.test(a.website.lines[0])], ['unread',true]);
  a=J(P,'ANBZ01');
  c('the template site\'s service times (read inside its scripts by the server) count: Current', [a.website.s,a.website.head], ['ok','Current']);

  console.log('\n-- the pastor\'s name --');
  a=J(P,'ANBZ01',true);
  c('his church: his staff page names "Josh Mura" = Joshua Mura; a directory still names an earlier pastor', [a.pastor.s,a.pastor.lines], ['work',['Names Joshua Mura (our staff page).','ChurchFinder still names Pastor Mark Gold.','JoinMyChurch still names Pastor Kevin E Irwin.']]);
  a=J(P,'ANBZ02',true);
  c('his church whose pastor page names another: "Shows another pastor"; his name only in a video title; the lay pastor on staff is no earlier pastor',
    [a.pastor.s,a.pastor.head,a.pastor.lines], ['help','Shows another pastor',['Names Joshua Mura only on the livestream page (in a sermon or video title), not where a visitor looks for the pastor.','Also names Robert Banks, listed as staff in the official directory.','It names Pastor Tomás Ríos (pastor page, leaders page).']]);
  a=J(P,'ANBZ07');
  c('another church: "Site and listing disagree" (either may be out of date); "Mission Statement" and "Doug Batchelor" are never pastors', [a.pastor.s,a.pastor.head,a.pastor.lines.slice(1)], ['help','Site and listing disagree',['It names Pastor Ed Olsen (about page): either the site or the official listing is out of date.']]);

  console.log('\n-- Google & Maps: the weight --');
  a=J(P,'ANBZ01');
  c('on Google with stars, reviews, website, phone and hours: Current, "★ 4.7 · 38 reviews"', [a.google.s,a.google.head], ['ok','★ 4.7 · 38 reviews']);
  a=J(P,'ANBZ04');
  c('no listing at its address: Needs help now, with what was checked', [a.google.s,a.google.head,a.google.lines[1]], ['help','Not found on Google Maps','Checked: Google Maps, by the church’s name and address.']);
  a=J(P,'ANBZ07');
  c('marked permanently closed on Google: Needs help now', [a.google.s,a.google.head], ['help','Marked closed on Google']);
  a=J(P,'ANBZ09');
  c('no website on Google and 3 reviews: Needs work, each said with what to do', [a.google.s,a.google.lines.slice(1,3)], ['work',['Google shows no website. Add x.test.','Only 3 reviews on Google: invite members to leave an honest one.']]);
  a=J(P,'ANBZ15');
  c('Google not connected: "Not read yet", never counted against the church', [a.google.s,a.google.head], ['unread','Not read yet']);

  console.log('\n-- Facebook & Instagram: light, never read --');
  a=J(P,'ANBZ03');
  c('found by the search, not linked from the site: its followers from the result\'s own line', [a.social.s,a.social.lines[0],a.social.lines[1]], ['work','Facebook page: facebook.com/p/Willowby-SDA, 306 followers.','The church’s website does not link to it: we found it by searching.']);
  a=J(P,'ANBZ06');
  c('none after the search: Needs help now', [a.social.s,a.social.head], ['help','No Facebook page found']);
  const noSearch=P.J(`(()=>{ const F=${JSON.stringify({...FIND,search:false})}; F.churches.forEach(c=>c.search={read:false}); const c=F.churches.find(x=>x.org==='ANBZ04'); return dfJudge(c,dfContext(F),'2026-10-08',false,'').areas.social; })()`);
  c('no search set: never "no Facebook page" (none was looked for), a grey "Not linked"', [noSearch.s,noSearch.head], ['none','Not linked from the website']);

  console.log('\n-- second sites and phones --');
  c('"Lancaster Hispanic II" is not Lancaster Hispanic\'s second site, nor the other way round; York, South Carolina is not York\'s', [J(P,'ANBZ11').website.s,J(P,'ANBZ16').website.s,J(P,'ANBZ12').website.s], ['ok','ok','ok']);
  a=J(P,'ANBZ13');
  c('a real second site (its title and address carry the church\'s name, a phone of the conference) is said, with the pastor it names', [a.website.head,a.website.lines[1]], ['Two websites','A second website is also online: pottsbysda.org, naming Pastor Evan Bell. Visitors may find either one.']);
  c('the church\'s own bulletin under its own address is no second website', J(P,'ANBZ14').website.head, 'Current');
  a=J(P,'ANBZ08');
  c('a number printed on three sites with another area code is the website maker\'s: said so, with the listing\'s', a.website.lines.includes('The only phone on the site is 530-649-2940, a number printed on many church sites, not the church’s own (the official listing has 610-555-0001 or 484-555-0002).'), true);
  c('…a listing with two phones ("or") matches Google\'s first', J(P,'ANBZ08').google.lines.some(l=>/Google shows the phone/.test(l)), false);

  console.log('\n-- the page --');
  let calls=dfFetch(P,{state:'none'});
  await openChc(P);
  c('Compare your churches asks for his conference\'s findings', calls.length>=1&&calls[0].u, '/.netlify/functions/digital?conf=Pennsylvania');
  await until(()=>calls.some(x=>x.method==='POST'));
  c('nothing read yet: one reading asked for, and the page says what is happening', [calls.filter(x=>x.method==='POST').map(x=>x.body), /Reading the churches of the Pennsylvania Conference/.test(P.txt('#chc-df'))], [[{op:'read',conf:'Pennsylvania'}],true]);
  P.E('DF.state="";DF.data=null;DF.tries=0;'); calls=dfFetch(P,{state:'ready'}); P.E('dfLoad(true)'); await until(()=>P.q('#chc-df .df-own'));
  const T0=P.txt('#chc-df');
  c('six parts: your churches, side by side, who needs help most, every church, how to fix it, the report; and what it can and cannot see',
    P.qa('#chc-df .df-h').map(h=>h.textContent.replace(/^\d/,'')), ['Your churches','Side by side','Who needs help most','Every church in the Pennsylvania Conference','How to fix it','The report for your communication team','What this can and cannot see']);
  c('his two churches first (by his registration\'s name), each with six areas', [P.qa('#chc-df .df-own h3').map(h=>h.textContent),P.qa('#chc-df .df-own:first-of-type .df-area').length], [['Brookfield','Sampleton'],6]);
  c('every church in the list, his first, marked Yours', [P.qa('#chc-df tr.df-row').length,P.qa('#chc-df tr.df-row.mine').length,P.txt('#chc-df tr.df-row .df-you')], [16,2,'Yours']);
  c('who needs help most: the church with no website found (never the refused or blocked ones), Google, the pastor', [P.qa('#chc-df .df-needs h4').map(h=>h.textContent.replace(/\s*\d+$/,'')), P.qa('#chc-df .df-needs section:first-child li a').map(a=>a.textContent)],
    [['We could not find a working website','Not found on Google Maps, or marked closed','The site and the listing name different pastors','Two websites online'],['Lonely']]);
  c('the "take me there" buttons: Google Maps, the directory\'s own correction page', [P.qa('#chc-df .df-own:nth-of-type(2) .df-go a').map(a=>[a.textContent.replace(/ ↗$/,''),a.href]).filter(x=>/ChurchFinder/.test(x[0]))], [[['Correct it on ChurchFinder','https://www.churchfinder.com/churches/pa/x']]]);
  c('no "AI" anywhere in it', /\bAI\b|\bIA\b|artificial intelligence/.test(T0), false);

  console.log('\n-- the report --');
  P.q('#chc-df [data-df-rep="ANBZ01"]').click(); await sleep(20);
  const fx=P.qa('#chc-df .df-doc ol li').map(li=>li.querySelector('div').textContent);
  c('Sampleton\'s report: the fix that was found (the directory), not "put his name on the site" (it is there)', [fx.some(t=>/ChurchFinder and JoinMyChurch to correct the pastor’s name/.test(t)),fx.some(t=>/Put Joshua Mura’s name/.test(t))], [true,false]);
  P.q('#chc-df [data-df-rep="ANBZ02"]').click(); await sleep(20);
  const fx2=P.qa('#chc-df .df-doc ol li').map(li=>li.querySelector('div').textContent);
  c('Brookfield\'s report: his name and photo on the pastor page, the other pastor off', fx2[0], 'Put Joshua Mura’s name and photo on the pastor or staff page and take Tomás Ríos off.');
  c('…the words, ready to paste, with a Copy button', [/Pastor: Joshua Mura/.test(P.txt('#chc-df .df-words pre')),P.txt('#chc-df [data-df-copy]')], [true,'Copy the words']);
  P.w.navigator.clipboard={writeText:async t=>{ P.w.__copied=t; }};
  P.q('#chc-df [data-df-copy]').click(); await sleep(20);
  c('…Copy puts them on the clipboard', [/Brookfield/.test(P.w.__copied||''),P.txt('#chc-df [data-df-copy]')], [true,'Copied']);
  P.q('#chc-df [data-df-prop]').click(); await sleep(60);
  c('"Make it a proposal" opens Make the Case for Media & communication', [P.E('TOOL'),P.E('casePrefs().group')], ['case','media']);

  console.log('\n-- the list: filters, search, details, check again --');
  P.E('openTool("churches")'); await until(()=>P.q('#chc-df tr.df-row'));
  P.q('#chc-df [data-df-f="site"]').click(); await sleep(10);
  c('"No website found" shows only that church', P.qa('#chc-df tr.df-row:not([hidden]) th span:first-child').map(s=>s.textContent), ['Lonely']);
  P.q('#chc-df [data-df-f="all"]').click(); const qi=P.q('#df-q'); qi.value='york'; qi.dispatchEvent(new P.w.Event('input')); await sleep(10);
  c('the search box finds by name or town', P.qa('#chc-df tr.df-row:not([hidden]) th span:first-child').map(s=>s.textContent), ['York']);
  const row=P.q('#chc-df tr.df-row:not([hidden])'); row.click(); await sleep(10);
  c('a tap opens the church\'s findings', [row.getAttribute('aria-expanded'),row.nextElementSibling.hidden,row.nextElementSibling.querySelectorAll('.df-area').length], ['true',false,6]);
  P.q('#chc-df [data-df-again="ANBZ01"]').click(); await sleep(30);
  c('"Check again" asks for that one church', calls.filter(x=>x.method==='POST').map(x=>x.body).pop(), {op:'again',conf:'Pennsylvania',org:'ANBZ01'});
  c('no page errors', P.errs, []);

  console.log('\n-- other states --');
  const Q=page(); await ready(Q); dfFetch(Q,{status:401}); await openChc(Q);
  c('not registered with the server: says so, nothing else', /Register on the first page/.test(Q.txt('#chc-df')), true);
  const R=page(); await ready(R); dfFetch(R,{state:'none',enabled:false}); await openChc(R);
  c('a conference not read yet: says the Pennsylvania Conference comes first', /reads the Pennsylvania Conference first/.test(R.txt('#chc-df')), true);
  const S=page({lang:'es'}); await ready(S); dfFetch(S,{state:'ready'}); await openChc(S); await until(()=>S.q('#chc-df .df-own'));
  c('in Spanish: the parts and the judge\'s words', [S.qa('#chc-df .df-h').slice(0,2).map(h=>h.textContent.replace(/^\d/,'')),S.txt('#chc-df .df-own:first-of-type .df-area:nth-child(3) .df-ahead')], [['Sus iglesias','Lado a lado'],'★ 4.7 · 38 reseñas']);
  c('no page errors (other states, Spanish)', [Q.errs,R.errs,S.errs], [[],[],[]]);
}); T.done(); })();
