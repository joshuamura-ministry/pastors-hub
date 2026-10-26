// v10.70.1 · the full audit's fixes in the Evangelism Planner and its revival plan. The pastor (26 Oct 2026): "can you do a thourogh audit of
// the app, from the operation making sure everything works and functions properly. everything is synmetrical and looks amazing". The
// reviewers read pictures of the demo series (15 nights, 5 a week, 200 seats, opening night 18 months out) and the demo revival, and found:
// (P1) "The meetings" promised "a Bible at 18 nights, a large picture at 24" to a 15-night series; (P2) the 3-month phase "Advertise and
// pre-register" listed handbills, Sabbaths, the fourth letter and door to door dated after it ends, and "Order the handbills by" sat one day
// past its phase (every dated item must sit in the phase that holds its date, every tier, revival too); (P3) the revival card said "12/25"
// roles while the roster said "0 of 13 named"; (P4) "293 pre-registrations · half the hall (100 of 200 seats), raised for churn" (more than
// the seats, unexplained, jargon); (P5) "and the Bible workers's own" (a wrong possessive, an unfinished phrase); (P6) "Give Terrain five
// numbers and a date" on a form that asks for more; (P7) on a phone a "·" left alone at the end of a line in the stat cards; (P8) "Door to
// door, three weekends running (Apr 7 to Apr 20)", a Friday to a Thursday, two weekends; (P9) "25/25 roles to lead · leaders you have /
// every role has a leader · 0 named" read like "25 of 25 done". Written failing-first on v10.70.0.
const {sleep,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const MONS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DATE=/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d+), (\d{4})/g;
const dates=s=>{ const out=[]; let m; DATE.lastIndex=0; while((m=DATE.exec(s))) out.push(new Date(+m[3],MONS.indexOf(m[1]),+m[2],12)); return out; };
const dayN=d=>{ const x=new Date(d); x.setHours(12,0,0,0); return Math.round(x.getTime()/864e5); };
const open=async P=>{ await ready(P); P.E("openTool('planner')"); await sleep(120); };
const phases=P=>P.qa('#pout .rail .pb').map(b=>({name:txt(b.querySelector('.pt b')),dates:dates(txt(b.querySelector('.pt .dates'))),items:[...b.querySelectorAll(':scope > ul > li')].map(txt)}));
const card=(P,i)=>{ const k=P.qa('#pout .pbench .card')[i]; return k?{n:txt(k.querySelector('.n')),l:txt(k.querySelector('.l')),sub:txt(k.querySelector('.sub')),raw:k.querySelector('.sub').textContent+'|'+k.querySelector('.l').textContent}:null; };
const rosterHint=P=>{ const h=P.qa('#pout .phead').find(x=>x.querySelector('h2')&&x.querySelector('h2').textContent==='The roster'); return h?txt(h.querySelector('.hint')):null; };

(async()=>{ await T.sec(async()=>{
  const P=page({}); await open(P); P.q('#pl-demo').click(); await sleep(250);
  const plan=P.J('uChurch().plan'), D=new Date(plan.date+'T12:00:00');

  console.log('\n-- (P1) the attendance gifts fit the series\' own nights --');
  const meet=phases(P).find(x=>x.name==='The meetings').items.find(t=>/^Attendance gifts/.test(t))||'';
  const gm=P.J('giftMarks(PLAN).tiers.map(t=>[t.k,t.at])');
  c('the demo is 15 nights; the Track tab\'s marks for it (a gift book, a gift Bible, a large picture, each before the last night)', [plan.nights,gm.map(x=>x[0]),gm.every(x=>x[1]<15)], [15,['book','bible','picture'],true]);
  c('"The meetings" names the same marks: never "a Bible at 18 nights, a large picture at 24"', [/at 18 nights|at 24\b/.test(meet),meet.includes('a gift book at '+gm[0][1]+' nights, a gift Bible at '+gm[1][1]+' nights, a large picture at '+gm[2][1]+' nights')], [false,true]);
  c('every mark it names is reachable in 15 nights', (meet.match(/at (\d+) nights?/g)||[]).map(s=>+s.match(/\d+/)[0]).every(n=>n<15), true);
  { const r=P.J(`(()=>{ const p={...PLAN,nights:6,perweek:3}; const t=planPhases(p,null).phases.find(x=>x.tag==='series').items.find(i=>/^Attendance gifts/.test(i.t)).t; return [t,giftMarks(p).tiers.map(x=>x.at)]; })()`);
    c('…a 6-night series carries two marks, both inside its nights', [r[1].length,(r[0].match(/at (\d+) nights?/g)||[]).map(s=>+s.match(/\d+/)[0])], [2,r[1]]); }
  c('the printed plan says the same', /a gift book at \d+ nights, a gift Bible at \d+ nights, a large picture at \d+ nights/.test(P.txt('#plandoc')), true);

  console.log('\n-- (P2) every dated item sits in the phase that holds its date --');
  const ph=phases(P), adv=ph.find(x=>x.name==='Advertise and pre-register'), last=ph.find(x=>x.name==='The last two weeks'), grp=ph.find(x=>x.name==='Home Bible groups and committees');
  const out=(p,skip)=>p.items.filter(t=>!(skip&&skip.test(t))).flatMap(t=>dates(t).filter(d=>dayN(d)<dayN(p.dates[0])||dayN(d)>dayN(p.dates[1])).map(d=>t.slice(0,48)+' … '+d.toDateString()));
  c('"Advertise and pre-register" names no day after it ends (the day before the last two weeks)', [dayN(adv.dates[1])===dayN(D)-15,out(adv)], [true,[]]);
  const fmt=d=>MONS[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear(), at=n=>fmt(new Date(D.getTime()+n*864e5));
  c('the last two weeks hold what happens in them: every member\'s handbills (14 days out) and the fourth letter (10 days out)', [last.items.some(t=>t.startsWith(at(-14)+': every member receives handbills')),last.items.some(t=>t.startsWith(at(-10)+': the fourth letter'))], [true,true]);
  c('…the second and third of the three Sabbaths, and door to door those weekends', [last.items.some(t=>/^Handbills and pre-registration forms passed out in church: .* \(the second and third of three Sabbaths running\)\.$/.test(t)),last.items.some(t=>/^Door to door, the weekends of .* \(the second and third of three weekends running\)\.$/.test(t))], [true,true]);
  c('…the first Sabbath and the first weekend open in "Advertise and pre-register"', [adv.items.some(t=>/^Handbills and pre-registration forms passed out in church: \w+ \d+, \d{4} \(the first of three Sabbaths running\)\.$/.test(t)),adv.items.some(t=>/^Door to door, three weekends running, from the weekend of /.test(t))], [true,true]);
  { const o=grp.items.find(t=>/^Order the handbills by/.test(t)), b=ph.find(x=>x.name==='Seminars and Bible studies').items.find(t=>/^The Bible workers in place by/.test(t));
    c('"Order the handbills by" falls inside its phase (it said the first day of the next)', o?dayN(dates(o)[0])<=dayN(grp.dates[1]):null, true);
    c('…and "The Bible workers in place by" inside "Seminars and Bible studies"', b?dayN(dates(b)[0])<=dayN(ph.find(x=>x.name==='Seminars and Bible studies').dates[1]):null, true); }
  c('the demo\'s whole countdown: no day outside its phase (the opening night line, the speaker\'s booking and the leaders\' note aside)', ph.flatMap(p=>out(p,/^(Opening night fixed|Book the evangelist|Campaign coordinator)/)), []);
  // every tier, both plans: weekly from one week to 82 weeks out, every opening-night weekday
  const scan=P.J(`(()=>{
    const MONS=${JSON.stringify(MONS)}, strip=h=>String(h||'').replace(/<[^>]+>/g,''), dk=d=>{ const x=new Date(d); x.setHours(12,0,0,0); return Math.round(x.getTime()/864e5); };
    const SPEAK=/^(Opening night fixed|Book the|Ask the conference for|Decide who will speak|Our pastor preaches)/;
    const bad=[], tiers={};
    const base={church:'X',members:150,leaders:25,workers:50,nights:15,perweek:5,seats:200,file:150,budget:25000,bw:2,kind:'both',speaker:'guest',books:220};
    for(const type of ['evangelism','revival']) for(let w=1; w<=82; w++){
      const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+w*7+(w%7));
      const p={...base,type,date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}; if(type==='revival'){ p.nights=9; p.perweek=7; }
      const tier=(type==='revival'?revSchedule(p):planSchedule(p)).tier; tiers[type+' '+tier]=(tiers[type+' '+tier]||0)+1;
      (type==='revival'?revPhases(p,null):planPhases(p,null)).phases.forEach(ph=>{ if(dk(ph.end)<dk(ph.start)) return;
        ph.items.forEach(it=>{ if(it.plain) return; const t=strip(it.t); if(SPEAK.test(t)) return;
          const re=/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\\d+), (\\d{4})/g; let m;
          while((m=re.exec(t))){ const x=new Date(+m[3],MONS.indexOf(m[1]),+m[2],12); if(dk(x)<dk(ph.start)||dk(x)>dk(ph.end)) bad.push(type+' '+tier+' '+p.date+' · '+ph.name+' · '+t.slice(0,50)+' … '+m[0]); } }); });
    }
    return {bad,tiers}; })()`);
  c('every tier was tried, evangelism (18 months, a year, 2–8 months, under 2) and revival (6 months, 6 weeks–6 months, under 6 weeks)', ['evangelism full','evangelism year','evangelism short','evangelism quick','revival full','revival short','revival quick'].every(k=>scan.tiers[k]>0), true);
  c('…and in every one, every dated item sits inside its phase', [scan.bad.length,scan.bad.slice(0,6)], [0,[]]);
  c('no page errors', P.errs, []);

  console.log('\n-- (P8) door to door covers three weekends --');
  const dtd=P.J(`(()=>{ const r=planPromo(PLAN,planTargets(PLAN,planPlace()),planPlace()).rows.find(x=>x.n==='Door to door'); return r.when; })()`);
  const [d1,d2]=dates(dtd), wkd=[]; for(let x=new Date(d1); x<=d2; x.setDate(x.getDate()+1)) wkd.push(x.getDay());
  c('Getting the word out: from the Friday three weekends out to the Sunday before opening night', [dayN(d1)-dayN(D),d1.getDay(),d2.getDay(),dayN(d2)-dayN(D)], [-21,5,0,-5]);
  c('…three Saturdays and three Sundays inside it', [wkd.filter(x=>x===6).length,wkd.filter(x=>x===0).length], [3,3]);
  { const r=P.J(`(()=>{ const out=[]; for(const add of [0,1,2,3,4,5,6]){ const d=new Date(PLAN.date+'T12:00:00'); d.setDate(d.getDate()+add); const p={...PLAN,date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
      const w=planPromo(p,planTargets(p,null),null).rows.find(x=>x.n==='Door to door').when; out.push([d.getDay(),w]); } return out; })()`);
    c('…whatever the weekday of opening night: three Saturdays before it, the range ending before it', r.map(([wd,w])=>{ const [a,b]=dates(w); let s=0; for(let x=new Date(a); x<=b; x.setDate(x.getDate()+1)) if(x.getDay()===6) s++; return s; }), [3,3,3,3,3,3,3]); }
  c('the countdown names the same three weekends: the first in "Advertise and pre-register", the second and third in the last two weeks', (()=>{ const a=adv.items.find(t=>/^Door to door, three weekends running/.test(t))||'', b=last.items.find(t=>/^Door to door, the weekends of/.test(t))||''; return [...dates(a),...dates(b)].map(d=>d.getDay()); })(), [6,6,6]);

  console.log('\n-- (P4) the pre-registration goal says what it is made of --');
  const pre=card(P,1);
  c('without a survey: 225, one and a half for each of the 150 members (more than half the hall)', [pre.n,pre.sub], ['225','1½ for each of the 150 members']);
  { const Q=page({}); await ready(Q); survey(Q); await sleep(250); Q.E("openTool('planner')"); await sleep(150); Q.q('#pl-demo').click(); await sleep(300);
    const k=card(Q,1);
    c('with the survey (people here move often): 293 = 225 and 30% more, said so; never "churn"', [k.n,k.sub,Math.round(150*1.5*1.3),/churn/i.test(Q.txt('#pout'))], ['293','1½ for each of the 150 members, and 30% more as people here move often',293,false]);
    c('…the printed plan says the same, never "half the 200 seats filled"', [/293<\/b> pre-registrations in hand before a single advertisement is counted: 1½ for each of the 150 members, and 30% more as people here move often\./.test(Q.q('#plandoc').innerHTML),/half the 200 seats/.test(Q.txt('#plandoc'))], [true,false]);
    c('no page errors', Q.errs, []); }
  c('a big hall: half the hall is the goal, and it says so', P.J(`typeof planPreregWhy==="function"?planPreregWhy({...PLAN,members:60,seats:600},planTargets({...PLAN,members:60,seats:600},null)):null`), 'half the hall (300 of 600 seats)');

  console.log('\n-- (P5) the Bible workers\' own studies --');
  const sem=ph.find(x=>x.name==='Seminars and Bible studies');
  const bm=txt(P.qa('#pout .rail .pb').find(b=>txt(b.querySelector('.pt b'))==='Seminars and Bible studies').querySelector('.bm'));
  c('two Bible workers: "plus the Bible workers’ own studies", never "workers’s own ·"', [/plus the Bible workers’ own studies ·/.test(bm),/workers’s|’s own ·/.test(bm)], [true,false]);
  c('one Bible worker: "plus the Bible worker’s own studies"', /plus the Bible worker’s own studies/.test(P.J(`planPhases({...PLAN,bw:1},null).phases[3].bench`)), true);
  c('none: nothing about them', /Bible worker/.test(P.J(`planPhases({...PLAN,bw:0},null).phases[3].bench`)), false);

  console.log('\n-- (P6) the intro says what the form asks --');
  c('evangelism: "Give Terrain a few numbers and a date", on the page and when the form switches back', [/Give Terrain a few numbers and a date;/.test(P.txt('#pl-lead')),(P.E("planTypeSet('revival'); planTypeSet('evangelism'); document.getElementById('pl-lead').textContent")).includes('a few numbers and a date'),/five numbers/.test(require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8'))], [true,true,false]);

  console.log('\n-- (P9, P3) the roles card says what its two numbers are; the roster agrees --');
  const rc=card(P,0);
  c('evangelism: 25 roles to lead, 25 leaders, said plainly on one line; no "named" beside "every role has a leader"', [rc.n,rc.l,rc.sub], ['25/25','roles to lead · leaders you have','25 roles to lead, 25 leaders: one for each role']);
  c('…the roster counts every name box and says which they are: the 25 roles to lead, the treasurer and the Bible workers', [rosterHint(P),P.qa('#pout input.rname').length], ['0 of 27 named: 25 roles to lead, the treasurer and the Bible workers',27]);
  { const r=P.J(`(()=>{ const p={...PLAN,leaders:6}; const f=planLeaderFit(planLeaderRoles(p,null),6); return [typeof planRolesSub==="function"?planRolesSub(f,6):null,f.gap,f.need]; })()`);
    c('…leaders short: the gap said as more to find', r[0], r[2]+' roles to lead, 6 leaders: '+r[1]+' more to find'); }
  P.E('window.confirm=()=>true'); P.q('#pl-clear').click(); await sleep(80); P.q('#pl-type [data-pt="revival"]').click(); P.q('#pl-demo').click(); await sleep(250);
  const rr=card(P,3);
  c('revival: 12 roles to lead, 25 leaders; the roster: 13 boxes, 12 roles to lead and the treasurer (the counts agree)', [rr.n,rr.sub,rosterHint(P),P.qa('#pout input.rname').length], ['12/25','12 roles to lead, 25 leaders: one for each role','0 of 13 named: 12 roles to lead and the treasurer',13]);
  P.q('#pout input.rname[data-role="prayer"]').value='Sample Name'; P.q('#pout input.rname[data-role="prayer"]').dispatchEvent(new P.w.Event('input')); await sleep(20);
  c('…a name typed: the roster counts it, in the same words', rosterHint(P), '1 of 13 named: 12 roles to lead and the treasurer');

  console.log('\n-- (P7) a "·" in a stat card never ends a line alone: it travels with the words after it --');
  const sepOk=k=>!/·[ \n]/.test(k)&&!/·$/.test(k);
  c('revival: "every home on the books · 150 active", "two to four members each · 10 small groups"', [card(P,0).raw.split('|')[0],card(P,2).raw.split('|')[0]], ['every home on the books · 150 active','two to four members each · 10 small groups']);
  c('…every card, every line', P.qa('#pout .pbench .card').map(k=>k.textContent).every(sepOk), true);
  P.q('#pl-clear').click(); await sleep(80); P.q('#pl-type [data-pt="evangelism"]').click(); P.q('#pl-demo').click(); await sleep(250);
  c('evangelism: every card, every line', [P.qa('#pout .pbench .card').map(k=>k.textContent).every(sepOk),card(P,2).raw.split('|')[0]], [true,'three times the membership · 25 Bible studies running']);
  c('no page errors', P.errs, []);
}); T.done(); })();
