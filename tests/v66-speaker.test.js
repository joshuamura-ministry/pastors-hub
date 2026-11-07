// v10.66.0 · the Planner: who will speak. The pastor (11 Oct 2026): "A lot of times the local Pastor will be the speaker for these
// events safe to church a lot of money, but not all pastors. Have the ability to really draw and keep people … whether they wanna put all
// this effort in and have a mediocre speaker or if they want to bring in a really dynamic speaker who can retain people … a lot of people
// fall off … the option … who will speak the pastor of the church a conference leader … or paid evangelist … big difference with the
// budget". For both plans: the form's choice changes the countdown, the roster, the budget, the printed plan, and a comparison to choose by.
// Written failing-first on v10.65.0.
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const fri=n=>{ const d=new Date(); d.setDate(d.getDate()+n); while(d.getDay()!==5) d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the form: who will speak? --');
  const P=page({}); await ready(P); P.E("openTool('planner')"); await sleep(120);
  const opts=P.qa('#pl-speak button').map(b=>[txt(b.querySelector('b')),txt(b.querySelector('span')),b.getAttribute('aria-checked')]);
  c('three choices, none chosen until he chooses: our pastor (saves the most), a conference leader or evangelist (the conference often helps), a paid evangelist (costs the most)', [P.txt('#pform .pf-speak .lb'),opts],
    ['Who will speak?',[['Our pastor','Saves the most','false'],['A conference leader or evangelist','The conference often helps','false'],['A paid evangelist','Costs the most','false']]]);
  P.q('#pl-type [data-pt="revival"]').click(); await sleep(20);
  c('…for revival meetings too', P.w.getComputedStyle(P.q('#pform .pf-speak')).display!=='none', true);
  P.q('#pl-type [data-pt="evangelism"]').click(); P.q('#pl-speak [data-sp="pastor"]').click(); await sleep(10);
  c('a tap chooses one', P.qa('#pl-speak button').map(b=>b.getAttribute('aria-checked')), ['true','false','false']);

  console.log('\n-- the evangelism plan --');
  P.q('#pl-demo').click(); await sleep(250);
  const plan=()=>P.J('uChurch().plan'), set=sp=>{ P.E(`PLAN.speaker=${JSON.stringify(sp)}; planSave(PLAN); plannerRender(PLAN);`); };
  c('the demo series has a paid evangelist (its $25,000 budget), saved with the plan', plan().speaker, 'guest');
  const first=()=>[...P.qa('#pout .rail .pb')[0].querySelectorAll(':scope > ul > li')].map(txt);
  const D=plan().date+'T12:00:00', mo=s=>{ const m=s.match(/by (\w+ \d+, \d{4})/); return m?Math.round((new Date(D)-new Date(m[1]+' 12:00'))/864e5/30.44):null; };
  // v10.70.1 (the audit, second look): 18 months out the first phase ends long before the booking's deadline, so the line says the work begins now: "Begin booking the evangelist now: confirm by …, a year before opening night" (the year ahead kept)
  let L=first().find(t=>/^Begin booking the evangelist now: confirm by/.test(t));
  c('a paid evangelist: booked a year before opening night, with references and a written agreement', [!!L,L&&mo(L),/whether attendance held to the last night and the new members stayed/.test(L||''),/a written agreement: the honorarium, travel, housing and meals, who keeps the names, and the follow-up/.test(L||'')], [true,12,true,true]);
  const roles=()=>P.qa('#pout .rrole .rr1 b').map(txt);
  c('…a speaker host on the roster (combined with the platform when leaders are few)', roles().some(r=>/^Speaker host/.test(r)), true);
  c('…the budget names the speaker\'s cost', P.qa('#pout .bud li').map(txt)[ P.qa('#pout .bud li').map(txt).findIndex(t=>/^The speaker:/.test(t)) ], 'The speaker: a paid evangelist’s honorarium, travel, housing and meals for every night (a written quote)');
  c('…and the follow-up says the evangelist leaves', /^The evangelist leaves after closing night: the pastor and the elders carry the follow-up/.test(txt(P.qa('#pout .rail .pb').slice(-1)[0].querySelector('li'))), true);
  const cards=P.qa('#pout .pspk-c').map(k=>[txt(k.querySelector('.pspk-h b')),k.classList.contains('on'),[...k.querySelectorAll('.pspk-r span')].map(txt)]);
  c('Who will speak: the three side by side, cost, drawing and keeping people, after the meetings; his choice marked', [P.txt('#pl-speakw h2'),P.txt('#pl-speakw .hint'),cards], ['Who will speak','A paid evangelist',[['Our pastor',false,['Cost','Drawing and keeping people','After the meetings']],['A conference leader or evangelist',false,['Cost','Drawing and keeping people','After the meetings']],['A paid evangelist',true,['Cost','Drawing and keeping people','After the meetings']]]]);
  c('…in his words: a lot of people fall off when the speaker cannot hold them; and a middle way', [/a lot of people fall off when the speaker cannot hold them night after night/.test(P.txt('#pout')),/A middle way: the pastor preaches, with a guest for the opening weekend/.test(P.txt('#pout'))], [true,true]);
  set('pastor'); await sleep(40);
  L=first().find(t=>/^Our pastor preaches/.test(t));
  c('our pastor: the series planned a year ahead, a coach, the visiting shared; no host; no honorarium', [!!L,L&&mo(L),roles().some(r=>/^Speaker host/.test(r)),P.qa('#pout .bud li').map(txt).includes('The speaker: our pastor (no honorarium)'),/^The evangelist leaves/.test(txt(P.qa('#pout .rail .pb').slice(-1)[0].querySelector('li')))], [true,12,false,true,false]);
  set('conference'); await sleep(40);
  // v10.70.1 (the audit, second look): asked now, confirmed by the date a year ahead ("Ask the conference for an evangelist now: … so confirm by …")
  c('a conference leader or evangelist: asked for early; what the conference covers', first().some(t=>/^Ask the conference for an evangelist now: the ministerial department books a year or more ahead, so confirm by \w+ \d+, \d{4}\. Ask what it covers/.test(t)), true);
  set(''); await sleep(40);
  // v10.70.1 (the audit, second look): decided now, the speaker booked by the date a year ahead ("Decide who will speak now: …, booked by …")
  c('not decided: deciding is the first step, pointing to the comparison', [first().some(t=>/^Decide who will speak now: our pastor, a conference leader or evangelist, or a paid evangelist, booked by \w+ \d+, \d{4}/.test(t)),P.txt('#pl-speakw .hint')], [true,'not decided yet']);
  P.E(`PLAN.date=${JSON.stringify(fri(91))}; PLAN.speaker='guest'; planSave(PLAN); plannerRender(PLAN);`); await sleep(40);
  L=first().find(t=>/^Book the evangelist by/.test(t));
  c('three months out: booked this week, inside the first phase', L?Math.round((new Date(L.match(/by (\w+ \d+, \d{4})/)[1]+' 12:00')-new Date())/864e5):null, 7);
  c('the printed plan names the speaker', /the speaker: a paid evangelist/.test(P.txt('#plandoc .dsub')), true);
  c('no page errors', P.errs, []);

  console.log('\n-- the revival plan --');
  P.E('window.confirm=()=>true'); P.q('#pl-clear').click(); await sleep(60);
  c('Start over clears the choice', P.qa('#pl-speak button').every(b=>b.getAttribute('aria-checked')==='false'), true);
  P.q('#pl-type [data-pt="revival"]').click(); P.q('#pl-demo').click(); await sleep(250);
  c('the demo revival has a paid speaker (its $6,000 budget)', [plan().type,plan().speaker,P.qa('#pout .bud .bh').map(txt)[0]], ['revival','guest','The speaker$2,100']);
  set('pastor'); await sleep(40);
  c('our pastor: the messages planned first; no speaker host; the speaker\'s share goes to hospitality, the meetings, inviting and after', [P.qa('#pout .rail .pb')[0].querySelectorAll('li')[1]&&/^Our pastor preaches: the theme and the messages planned by/.test(txt(P.qa('#pout .rail .pb')[0].querySelectorAll('li')[1])),roles().includes('Speaker host'),P.qa('#pout .bud .bh').map(txt),P.txt('#pout .phead:has(+ .note + .budget) .hint')||P.qa('#pout .phead h2').map(h=>h.parentNode).find(h=>txt(h.querySelector('h2'))==='The budget').querySelector('.hint').textContent],
    [true,false,['Hospitality$1,800','The meetings$1,800','Inviting$900','After the meetings$1,500'],'$6,000']);
  c('…and no "the speaker arrives"', P.qa('#pout .rail li').map(txt).some(t=>/The speaker arrives/.test(t)), false);
  set('conference'); await sleep(40);
  c('a conference leader or evangelist: asked of the conference', P.qa('#pout .rail li').map(txt).some(t=>/^Ask the conference for a speaker by/.test(t)), true);
  P.E(`PLAN.date=${JSON.stringify(fri(91))}; PLAN.speaker=''; planSave(PLAN); plannerRender(PLAN);`); await sleep(40);
  c('three months out, not decided: "Decide who will speak now", after the board\'s vote', [txt(P.qa('#pout .rail .pb')[0].querySelectorAll('li')[0]),/^Decide who will speak now/.test(txt(P.qa('#pout .rail .pb')[0].querySelectorAll('li')[1]))], ['The board votes the meetings; the theme chosen, the coordinators named.',true]);
  c('the printed revival plan names the speaker', /the speaker: not decided yet/.test(P.txt('#plandoc .dsub')), true);
  c('no page errors', P.errs, []);
}); T.done(); })();
