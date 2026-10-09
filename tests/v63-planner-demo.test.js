// v10.63.0 · the Evangelism Planner: a demo series, the nursery and mothers' room, Bible workers, and the follow-up built before opening night.
// The pastor (9 Oct 2026): "we need a demo also button for EVANGELISM planner on a … midsize evangelistic meeting series maybe 15 nights three
// weeks say $25,000 … with sufficient members to help … children's care or also infant care would be great too … a separate room for
// mothers with children so the babies don't scream in the middle of the service … it has to also add all the different benchmarks that need
// to be met prior to leading up to it … the opportunity to have a Bible worker or Bible workers can add a lot of support … the follow up is
// vital and has to be established even before … in with the planning … to continue the relationships with the new members, the newly
// baptized members, and also those who want to continue to study and aren't ready yet". Written failing-first on v10.62.2.
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const open=async P=>{ await ready(P); P.E("openTool('planner')"); await sleep(120); };
const phase=(P,name)=>P.qa('#pout .rail .pb').find(b=>txt(b.querySelector('.pt b'))===name);
const items=(b)=>b?[...b.querySelectorAll('li')].map(txt):[];

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the demo button: a midsize series, in one tap --');
  const P=page({}); await open(P);
  const demo=P.q('#pl-demo');
  c('beside "Build the countdown": "Fill in a demo series"', demo?[txt(demo),demo.hidden]:null, ['Fill in a demo series',false]);
  demo.click(); await sleep(150);
  const plan=P.J('uChurch().plan');
  c('the series: 15 nights, 5 a week (3 weeks), $25,000, a midsize church with a leader for every team, 2 Bible workers, marked a demo',
    [plan.nights,plan.perweek,plan.budget,plan.members,plan.workers,plan.leaders,plan.seats,plan.bw,plan.kind,plan.demo,plan.church],
    [15,5,25000,150,50,25,200,2,'both',true,'Sample church (demo)']);
  const days=Math.round((new Date(plan.date+'T12:00:00')-new Date())/864e5);
  c('opening night on a Friday about eighteen months out, so every phase of the countdown shows', [new Date(plan.date+'T12:00:00').getDay(),days>=540&&days<=560,P.qa('#pout .rail .pb').length], [5,true,9]);
  c('the page says plainly it is a demo, with a way to clear it', [/Demo series\. Sample numbers, to show how the Planner works: a midsize series of 15 nights over 3 weeks, \$25,000\./.test(P.txt('#pout .pdemo')),!!P.q('#pl-undemo')], [true,true]);
  c('the form shows the numbers, Bible workers among them', [P.q('#pl-members').value,P.q('#pl-nights').value,P.q('#pl-perweek').value,P.q('#pl-budget').value,P.q('#pl-bw').value], ['150','15','5','25000','2']);
  c('every phase has its benchmark', P.qa('#pout .rail .pb').every(b=>/^Benchmark: \S/.test(txt(b.querySelector('.bm')))), true);

  console.log('\n-- the teams: children, babies, Bible workers, the follow-up --');
  const roles=P.qa('#pout .rrole .rr1 b').map(txt);
  c('a children\'s meetings team and a nursery & mothers\' room of its own', [roles.includes('Children’s meetings'),roles.includes('Nursery & mothers’ room')], [true,true]);
  const nur=P.qa('#pout .rrole').find(r=>txt(r.querySelector('.rr1 b'))==='Nursery & mothers’ room');
  c('…the nursery: a room close to the hall, the meeting\'s sound brought in, so babies do not disturb the meeting; two screened adults', /close to the hall.*sound or picture brought in.*nobody in the hall is distracted.*two screened adults/.test(txt(nur)), true);
  c('the Bible workers, their own team, in place six months before', [roles.includes('Bible workers (2)'),/In place six months before opening night/.test(txt(P.qa('#pout .rrole').find(r=>txt(r.querySelector('.rr1 b'))==='Bible workers (2)')))], [true,true]);
  c('a nurture & follow-up coordinator chosen with the other coordinators (core)', !!P.qa('#pout .rrole.core').find(r=>txt(r.querySelector('.rr1 b'))==='Nurture & follow-up coordinator'), true);
  c('Bible workers are placed or hired: never counted as a leader the church must find', P.J(`(()=>{ const r=planLeaderRoles(PLAN,null); const f=planLeaderFit(r,99); return [r.some(x=>x.id==='bibleworker'),f.full===r.filter(x=>x.id!=='treasurer'&&x.id!=='bibleworker').length]; })()`), [true,true]);

  console.log('\n-- the groundwork before, the follow-up built before opening night --');
  const seminars=items(phase(P,'Seminars and Bible studies'));
  c('the Bible workers on the countdown: in place by six months out', seminars.some(t=>/^The Bible workers in place by .+, six months before opening night/.test(t)), true);
  const groups=phase(P,'Home Bible groups and committees');
  c('before opening night: a spiritual friend for everyone expected to decide, the new members\' class and the Bible class set', items(groups).some(t=>/The follow-up is built now, before opening night\..*spiritual friend.*new members’ class.*Bible class/.test(t)), true);
  c('…and its benchmark counts the follow-up team', /the follow-up team named/.test(txt(groups.querySelector('.bm'))), true);
  const last=items(phase(P,'The last two weeks'));
  c('the last two weeks: the follow-up ready; the children\'s room and the nursery set up with screened adults', [last.some(t=>/^The follow-up is ready:/.test(t)),last.some(t=>/children’s room and the nursery with its sound set up; two screened adults/.test(t))], [true,true]);
  c('during the meetings: the decision cards each night, studies within the week, a friend before the baptism', items(phase(P,'The meetings')).some(t=>/Each night the visitation team and the Bible workers take the decision cards.*meets their spiritual friend before the baptism/.test(t)), true);
  const after=phase(P,'Follow-up: the first year');
  c('after: a year of follow-up, not three months', after?[!!after, /^\S+ \d+, \d{4} – \S+ \d+, \d{4}$/.test(txt(after.querySelector('.dates')))]:null, [true,true]);
  const a=items(after);
  c('three groups kept close: the newly baptized, those still studying, those who came', [a.some(t=>/^The newly baptized: a spiritual friend.*new members’ class each week for thirteen weeks.*place to serve within three months.*one, three, six and twelve months/.test(t)),
    a.some(t=>/^Still studying, not yet decided: the Bible workers and the lay Bible instructors keep a weekly study/.test(t)),a.some(t=>/^Came, but have not asked for more:/.test(t))], [true,true,true]);
  const close=P.J('planSchedule(PLAN).close'), end=P.J('planPhases(PLAN,null).phases.slice(-1)[0].end');
  c('…its year ends twelve months after closing night', Math.round((new Date(end)-new Date(close))/864e5/30.44), 12);
  c('the rail says +12 months for it', P.qa('#pout .rail .mo').map(txt).slice(-1)[0], '+12months');
  const bud=P.qa('#pout .bud li').map(txt);
  c('the budget: the Bible workers, the nursery, the new members\' class', [bud.some(t=>/^Bible workers: stipend and housing, if the church pays/.test(t)),bud.includes('Nursery & mothers’ room: the sound or picture brought in, supplies'),bud.includes('New members’ class: lessons and a Bible for each')], [true,true,true]);
  c('no page errors', P.errs, []);

  console.log('\n-- clearing the demo, a plan of his own, no Bible workers --');
  P.q('#pl-undemo').click(); await sleep(120);
  c('Clear the demo empties the plan and the form, without asking', [P.J('uChurch().plan'),P.q('#pl-members').value,P.q('#pl-bw').value,P.q('#pl-demo').hidden], [null,'','',false]);
  P.E(`(()=>{ const set=(id,v)=>{ document.getElementById(id).value=v; }; set('pl-members','60'); set('pl-leaders','8'); set('pl-workers','20'); set('pl-date','2027-10-01'); set('pl-nights','20'); set('pl-seats','150'); set('pl-bw',''); })()`);
  P.q('#pl-build').click(); await sleep(150);
  c('his own plan: not a demo, no demo note, the demo button gone (it never replaces his plan)', [P.J('!!uChurch().plan.demo'),!!P.q('#pout .pdemo'),P.q('#pl-demo').hidden,P.J('uChurch().plan.bw')], [false,false,true,0]);
  c('no Bible workers: no Bible worker team; ask the conference for one, early', [P.qa('#pout .rrole .rr1 b').map(txt).some(t=>/^Bible worker/.test(t)),P.qa('#pout .rail li').map(txt).some(t=>/^Ask the conference about a Bible worker for the six months before opening night and the three after/.test(t))], [false,true]);
  c('a plan saved before this release (no bw) still builds', P.J(`(()=>{ const p={...PLAN}; delete p.bw; const r=planPhases(p,null); return [r.phases.length, r.fit.list.some(x=>x.id==='bibleworker')]; })()`), [9,false]);
  { const Q=page({store:{'terrain-churches-v1':JSON.stringify(P.J('uStore()'))}}); await open(Q);
    c('a device with his plan saved: no demo button', Q.q('#pl-demo').hidden, true); }
}); T.done(); })();
