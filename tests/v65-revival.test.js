// v10.65.0 · the Planner's two plans: evangelism meetings (reaching our community) and revival meetings (preparing our church).
// The pastor (9 Oct 2026): "maybe the EVANGELISM planner should also should have two options one for EVANGELISM and one for in reach
// meaning for our members … there should be an option to do something big for our own members", then "We can put revival meetings …
// preparing". The revival plan: about six months counted back from the first night: pray and plan, reconnect with every member who has
// drifted, prepare hearts, invite every member, ten days of prayer, the meetings (a last Sabbath of recommitment and communion), and a
// year after in which every member serves. Written failing-first on v10.64.0.
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const days=(a,b)=>Math.round((new Date(a)-new Date(b))/864e5);

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the form: what are you planning? --');
  const P=page({}); await ready(P); P.E("openTool('planner')"); await sleep(120);
  const types=P.qa('#pl-type button').map(b=>[txt(b.querySelector('b')),txt(b.querySelector('span')),b.getAttribute('aria-checked')]);
  c('two choices at the top: Evangelism meetings (reaching our community), Revival meetings (preparing our church); evangelism first, chosen', [P.txt('#pform .ptype-w .lb'),types], ['What are you planning?',[['Evangelism meetings','Reaching our community','true'],['Revival meetings','Preparing our church','false']]]);
  const shown=()=>P.qa('#pform .pf').filter(e=>P.w.getComputedStyle(e).display!=='none').map(e=>txt(e.querySelector('.lb'))).filter(Boolean);
  P.q('#pl-type [data-pt="revival"]').click(); await sleep(20);
  c('Revival: its own fields (members on the books; no seats, interest names, Bible workers or kind of series), its own words and demo', [shown(),P.txt('#pl-demo'),/^Revival meetings prepare your own members, and ready them for evangelism\. They begin about six months before the first night/.test(P.txt('#pl-lead'))],
    [['What are you planning?','Church or district','Active members','Members on the books','Can lead a team','Willing workers','Opening night','Nights of meetings','Nights per week','Budget ($)'],'Fill in a demo revival',true]);
  P.q('#pl-type [data-pt="evangelism"]').click(); await sleep(20);
  c('Evangelism: the fields as before', [shown().includes('Seats in the hall'),shown().includes('Kind of series'),shown().includes('Members on the books'),P.txt('#pl-demo')], [true,true,false,'Fill in a demo series']);

  console.log('\n-- a demo revival --');
  P.q('#pl-type [data-pt="revival"]').click(); P.q('#pl-demo').click(); await sleep(250);
  const plan=P.J('uChurch().plan'), D=plan.date+'T12:00:00';
  c('saved as a revival: 9 nights, every night, for 150 active members and 220 on the books, $6,000, a demo', [plan.type,plan.nights,plan.perweek,plan.members,plan.books,plan.budget,plan.demo], ['revival',9,7,150,220,6000,true]);
  c('the first night a Friday about seven months out, so the whole six months shows', [new Date(D).getDay(),days(D,new Date())>=200&&days(D,new Date())<=225], [5,true]);
  c('the page: Revival meetings, the countdown, the roster, who comes, getting the word out, the budget; no Track or Forms', [P.qa('#pout > .phead h2').map(h=>h.textContent),P.q('#pmode').hidden], [['Sample church (demo) · Revival meetings','The countdown','The roster','Who comes','Getting the word out','The budget'],true]);
  const bench=P.qa('#pout .pbench .card').map(k=>[txt(k.querySelector('.n')),txt(k.querySelector('.l'))]);
  c('the bench: 220 members to invite, 70 to visit (on the books less active), 50 prayer bands, the roles and leaders', bench.map(b=>b[1]).slice(0,3).concat([bench[0][0],bench[1][0],bench[2][0]]), ['members to invite','members to visit','prayer bands','220','70','50']);
  const ph=P.qa('#pout .rail .pb').map(b=>[txt(b.querySelector('.pt b')),b]);
  c('seven phases: Pray and plan, Reconnect, Prepare hearts, Invite every member, the last two weeks, the meetings, the first year after', ph.map(x=>x[0]), ['Pray and plan','Reconnect','Prepare hearts','Invite every member','The last two weeks','The meetings','After: the first year']);
  const items=n=>[...ph.find(x=>x[0]===n)[1].querySelectorAll('li')].map(txt);
  const pr=P.J(`(()=>{ const r=revPhases(uChurch().plan,planPlace()); return r.phases.map(x=>[x.name,x.start.toISOString(),x.end.toISOString()]); })()`);
  c('the preparation counts back: six months, five, three, six weeks, two weeks', pr.slice(0,5).map(x=>days(x[1],D)).map(d=>Math.round(d/7)), [-26,-22,-13,-6,-2]);
  c('…the meetings Friday to the next Sabbath', [days(pr[5][1],D),days(pr[5][2],D),new Date(pr[5][2]).getDay()], [0,8,6]);
  c('pray and plan: the speaker booked, the prayer bands, the list of every member', [items('Pray and plan').some(t=>/^Book the speaker by/.test(t)),items('Pray and plan').some(t=>/^Prayer bands begin: 50 bands/.test(t)),items('Pray and plan').some(t=>/every member on the books \(220\), who comes, and who has drifted \(about 70\)/.test(t))], [true,true,true]);
  c('reconnect: every member who has drifted visited at home, to listen, never to reproach', /^Every member who has drifted is visited at home \(about 70, by 7 pairs of an elder and a member\): to listen, to pray with them, and to say they are missed\. Never to reproach\.$/.test(items('Reconnect')[0]), true);
  c('prepare hearts: small groups and every member\'s Spiritual Gifts', [items('Prepare hearts').some(t=>/^Small groups begin/.test(t)),items('Prepare hearts').some(t=>/^Every member takes the Spiritual Gifts survey/.test(t))], [true,true]);
  c('the meetings: the last Sabbath of recommitment, communion and baptism; the commissioning', [items('The meetings').some(t=>/^The last Sabbath \(.*\): recommitment, the communion service with the ordinance of humility, and baptism or profession of faith/.test(t)),items('The meetings').some(t=>/^Commissioning/.test(t))], [true,true]);
  c('after: every member serving within three months, a friend for each who came back, and the next evangelism meetings', [/^Every member with a place to serve within three months/.test(items('After: the first year')[0]),items('After: the first year').some(t=>/next evangelism meetings/.test(t))], [true,true]);
  const roles=P.qa('#pout .rrole .rr1 b').map(txt);
  c('its own roster: the reconnection coordinator, the speaker host, Spiritual Gifts, communion, among them', ['Revival coordinator','Prayer coordinator','Reconnection coordinator','Speaker host','Spiritual Gifts coordinator','Communion'].every(n=>roles.includes(n)), true);
  const who=P.qa('#pout .stream').map(s=>[txt(s.querySelector('.sn b')),txt(s.querySelector('.st b'))]);
  c('who comes: the members first, then those who have drifted (70 to visit)', who.slice(0,2), [['Active members','150'],['Members who have drifted','70']]);
  const word=P.qa('#pout .pwo-row').map(r=>[txt(r.querySelector('.pwo-h b')),r.dataset.k]);
  c('getting the word out to the church family: 8 every church can do, 2 if your church can', [P.txt('#pl-word .hint'),word.length,word.filter(w=>w[1]==='can').map(w=>w[0])], ['8 every church can do · 2 if your church can',10,['A video invitation','Printed invitation cards']]);
  c('…the letter to every home and the phone tree among them', [word.some(w=>w[0]==='A letter to every home'),word.some(w=>w[0]==='The phone tree')], [true,true]);
  const W=P.qa('#pout .pword').map(w=>[txt(w.querySelector('b')),txt(w.querySelector('p'))]);
  c('words ready: a text to a member we miss, a bulletin line, the livestream', [W.map(w=>w[0]),/^Hi! We miss you at Sample church \(demo\)\. From Friday, .* we have 9 nights of revival meetings/.test(W[0][1])], [['A text to a member we miss','A line for the bulletin','For the livestream'],true]);
  c('the budget: the speaker, hospitality, the meetings, inviting, after; $6,000 split', P.qa('#pout .bud .bh').map(txt), ['The speaker$2,100','Hospitality$1,200','The meetings$1,200','Inviting$600','After the meetings$900']);
  c('the printed plan: a revival plan', [/— revival plan$/.test(P.txt('#plandoc h1')),P.qa('#plandoc h2').map(txt)], [true,['What we are aiming at','The countdown','Who does what','Who comes','Getting the word out','The budget']]);
  P.q('#pout input.rname[data-role="reconnect"]').value='Sample Elder'; P.q('#pout input.rname[data-role="reconnect"]').dispatchEvent(new P.w.Event('input')); await sleep(20);
  c('a name typed on the roster is kept', P.J('uChurch().plan.roster.reconnect'), 'Sample Elder');
  c('no page errors', P.errs, []);

  console.log('\n-- the plan fits the time left (the pastor: "we only want it in two months away or three months … it has to adjust") --');
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const fri=n=>{ const d=new Date(); d.setDate(d.getDate()+n); while(d.getDay()!==5) d.setDate(d.getDate()+1); return iso(d); };
  const at=(type,n)=>{ const q=type==='revival'?{type,church:'Sample',members:80,books:110,leaders:10,workers:25,nights:7,perweek:7,date:fri(n),budget:3000,v:4}
      :{type,church:'Sample',members:80,leaders:10,workers:25,nights:12,perweek:4,date:fri(n),seats:150,file:40,budget:8000,bw:0,kind:'both',v:3};
    P.E(`uChurch().plan=${JSON.stringify(q)}; uPersist(); PLAN=planGet(); plannerRender(PLAN);`);
    return {ph:P.qa('#pout .rail .pb').map(b=>txt(b.querySelector('.pt b'))),note:P.txt('#pout > p.note'),items:P.qa('#pout .rail li').map(txt),
      dates:P.J(`(${type==='revival'?'revPhases':'planPhases'})(PLAN,planPlace()).phases.map(x=>[x.start.toISOString(),x.end.toISOString()])`),
      word:P.qa('#pout .pwo-row').map(r=>[txt(r.querySelector('.pwo-h b')),txt(r.querySelector('.pwo-when'))])}; };
  let r=at('evangelism',182);
  c('evangelism in six months: three phases of the main things, not six squeezed', [r.ph.slice(0,3),/With less than eight months, the preparation keeps the main things/.test(r.note)], [['Leaders, prayer and names','Reach the names you have','Invite'],true]);
  c('…the names you already have (former Adventists among them), the follow-up chosen first, one bridge event and home groups since there is time', [r.items.some(t=>/^The names you already have, in one list:.*former Adventists/.test(t)),r.items.some(t=>/^The follow-up is chosen now/.test(t)),r.items.some(t=>/^One bridge event/.test(t)),r.items.some(t=>/^Home Bible groups from/.test(t))], [true,true,true,true]);
  c('…and the year after carries more', r.items.some(t=>/^Because the preparation was short, the follow-up carries more/.test(t)), true);
  c('…every phase follows the last, from today to the last two weeks', r.dates.slice(0,4).every((x,i,a)=>i===0||days(x[0],a[i-1][1])===1), true);
  r=at('evangelism',91);
  c('evangelism in three months: the same three phases; no bridge event or home groups to squeeze in', [r.ph.slice(0,3),r.items.some(t=>/^One bridge event/.test(t)),r.items.some(t=>/^Home Bible groups/.test(t))], [['Leaders, prayer and names','Reach the names you have','Invite'],false,false]);
  const orderPh=P.qa('#pout .rail .pb').find(b=>[...b.querySelectorAll('li')].some(l=>/^Order the handbills by/.test(txt(l))));
  const od=P.J(`planPhases(PLAN,planPlace()).phases.map(x=>[x.name,x.start.getTime(),x.end.getTime()])`).find(x=>x[0]===txt(orderPh.querySelector('.pt b')));
  const ordDate=new Date(txt([...orderPh.querySelectorAll('li')].find(l=>/^Order the handbills by/.test(txt(l)))).match(/by (\w+ \d+, \d{4})/)[1]+' 12:00').getTime();
  c('…the handbills ordered inside the phase that holds their date', ordDate>=od[1]-864e5&&ordDate<=od[2]+864e5, true);
  r=at('evangelism',42);
  c('evangelism in six weeks: leaders, prayer and names, then the invitation', r.ph.slice(0,2), ['Leaders, prayer and names','Invite']);
  c('…getting the word out says "As soon as you can" for what is already past (never a date behind us)', [r.word.find(w=>w[0]==='A promo video')[1],P.J(`(()=>{ const t=new Date(); t.setHours(0,0,0,0); return planPromo(PLAN,planTargets(PLAN,planPlace()),planPlace()).rows.every(r=>r.at>=t); })()`)], ['As soon as you can',true]);
  r=at('revival',91);
  c('revival in three months: pray and reconnect, prepare hearts, invite every member', [r.ph.slice(0,3),/With less than six months/.test(r.note)], [['Pray and reconnect','Prepare hearts','Invite every member'],true]);
  c('…the speaker booked now; the visits and the former Adventists in the first phase', [r.items.some(t=>/^The board votes the meetings; book the speaker now/.test(t)),r.items.some(t=>/^A second list: former Adventists/.test(t))], [true,true]);
  const inv=P.J(`revPhases(PLAN,planPlace()).phases[2].start.toISOString()`), letter=r.word.find(w=>w[0]==='A letter to every home')[1];
  c('…the letter home goes out the day the invitation phase begins, in the countdown and in getting the word out', [days(new Date(letter.replace('Mailed ','')+' 12:00'),inv),r.items.some(t=>t.startsWith(new Date(inv).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+': a letter to every home'))], [0,true]);
  r=at('revival',28);
  c('revival in four weeks: pray and reconnect, then invite; the Spiritual Gifts and the community survey come in the first month after', [r.ph.slice(0,2),r.items.some(t=>/^In the first month after: every member takes the Spiritual Gifts survey, a team runs the Community Survey/.test(t)),/With less than six weeks/.test(r.note)], [['Pray and reconnect','Invite every member'],true,true]);
  c('…and the visits go on after', r.items.some(t=>/^Because the preparation was short, the visits go on/.test(t)), true);
  c('no page errors', P.errs, []);

  console.log('\n-- the evangelism plan is as it was; a plan opens as its own kind --');
  P.E('window.confirm=()=>true'); P.q('#pl-clear').click(); await sleep(80); P.q('#pl-type [data-pt="evangelism"]').click(); P.q('#pl-demo').click(); await sleep(250);
  c('evangelism: the demo series, its nine phases, Track and Forms', [P.J('uChurch().plan.type'),P.J('uChurch().plan.nights'),P.qa('#pout .rail .pb').length,P.q('#pmode').hidden], ['evangelism',15,9,false]);
  const Q=page({}); await ready(Q); Q.E("uChurch().plan={type:'revival',church:'Sample',members:80,books:100,leaders:8,workers:20,nights:7,perweek:7,date:'2027-06-04',budget:0,v:4}; uPersist(); openTool('planner')"); await sleep(200);
  c('a saved revival opens as a revival, with the form on Revival', [Q.q('#pform').dataset.pt,Q.qa('#pout > .phead h2')[0]&&txt(Q.qa('#pout > .phead h2')[0]),Q.qa('#pout .pbench .card .n').map(txt).slice(0,2)], ['revival','Sample · Revival meetings',['100','20']]);
  const H=page({}); await ready(H); H.E('showHub()'); await sleep(30);
  c('the main menu\'s tile: evangelism or revival meetings', H.txt('.tool[data-tool="planner"] .td'), 'Evangelism or revival meetings, from planning to follow-up.');
  const S=page({lang:'es'}); await ready(S); S.E('showHub()'); await sleep(30);
  c('…in Spanish', S.txt('.tool[data-tool="planner"] .td'), 'Evangelismo o avivamiento: preparación y seguimiento.');
  c('no page errors', [P.errs,Q.errs,H.errs,S.errs], [[],[],[],[]]);
}); T.done(); })();
