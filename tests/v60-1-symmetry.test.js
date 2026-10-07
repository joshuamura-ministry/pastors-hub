// v10.60.1 — symmetry. The pastor (7 Oct 2026), with a picture of the Spiritual Gifts results: "This looks a little jumbled here …
// make everything one line and the circle charts even all the way up and down … symmetry is important"; and with a picture of "Your
// church": "symmetry throughout the whole app … compact the wording because when it's two lines … the boxes [are] off. You can see it
// here." What jsdom can hold (no layout): the words and the markup; the layout itself was measured in Chrome (v78/shots61.mjs: every
// label one line and every row of boxes level at 1366 and 820; the gifts on one line, starting together, the wheels in one column, at
// 1366, 820 and 390, EN + ES). Written failing-first on v10.60.0 + the sign-up reading.
const {sleep,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const ADDR="D.geo={...D.geo,matched:'118 Bristol Rd, Warminster, PA, 18974'}";

(async()=>{ await T.sec(async()=>{
  const P=page({needs:'file'}); await ready(P);
  survey(P,{mod:ADDR}); await sleep(150);

  console.log('\n-- "Your church": short labels, three by three --');
  const F=P.J('U_FIELDS.filter(([k])=>!/Budget|pending|funds/i.test(k)).map(x=>x[1])');
  c('the nine labels, short (what the long ones said is in the step\'s line)', F,
    ['Members on the books','Average Sabbath attendance','Adults (18+) attending','Willing volunteers','Available leaders','Volunteer hours a month',
     'Volunteers serving elsewhere','Leaders serving elsewhere','Hours given elsewhere']);
  c('…none over 28 letters, in English or in Spanish', [F.every(t=>t.length<=28),F.map(t=>P.J(`ES[${JSON.stringify(t)}]||''`)).every(t=>t&&t.length<=30)], [true,true]);
  c('…every Spanish word there', F.map(t=>P.J(`ES[${JSON.stringify(t)}]||null`)),
    ['Miembros en los libros','Asistencia promedio del sábado','Adultos (18+) que asisten','Voluntarios dispuestos','Líderes disponibles','Horas de voluntariado al mes',
     'Voluntarios ya ocupados','Líderes ya ocupados','Horas ya ocupadas']);
  P.E(`gfChurchOpen&&gfChurchOpen()`); await sleep(120);
  const step=P.q('#u-cap-form .u-panel[data-panel="0"]');
  c('the step\'s line keeps what the labels no longer say', step&&/members on your Spiritual Gifts list included.*hours are a month/.test(step.textContent.replace(/\s+/g,' ')), true);
  c('the nine boxes are a grid of three (never two and two with one left alone)', !!P.q('#u-cap-form .u-panel[data-panel="0"] .u-grid.u-grid3'), true);
  c('a box sits at the foot of its label, so a row of boxes stays level when a label wraps', /\.u-grid>\.u-field\{justify-content:flex-end\}/.test(HTML), true);

  console.log('\n-- the serving times: a week, one box each --');
  const wk=P.q('#u-cap-form .u-panel[data-panel="0"] .u-week');
  const vals=wk?[...wk.querySelectorAll('input[name="teamSlot"]')].map(i=>i.value):[];
  c('fourteen boxes, in the order the form has always read them', vals, P.J('U_SLOTS'));
  c('…each says its own time to a screen reader', wk?[...wk.querySelectorAll('input')].slice(0,3).map(i=>i.getAttribute('aria-label')):[], ['Mon daytime','Mon evening','Tue daytime']);
  c('…the days across, Day and Evening down, Saturday\'s daytime box its afternoon (said under it)',
    [wk?[...wk.querySelectorAll('.u-wd')].map(x=>x.textContent):[], wk?[...wk.querySelectorAll('.u-wr')].map(x=>x.textContent):[], P.txt('#u-cap-form .u-panel[data-panel="0"] .u-wnote')],
    [['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],['Day','Evening'],'Saturday’s daytime box is the afternoon.']);
  c('…each cell placed both ways (the week across; the days down in a narrow box)', wk?wk.querySelector('input[value="Sat afternoon"]').parentElement.getAttribute('style'):'', '--cw:7;--rw:2;--cn:2;--rn:7');
  P.E(`(()=>{ const f=document.getElementById('u-cap-form'); f.querySelector('input[value="Tue evening"]').checked=true; f.querySelector('input[value="Sat afternoon"]').checked=true; })()`);
  c('…and the form reads the ticked ones as before', P.J(`uValues(document.getElementById('u-cap-form'),'teamSlot')`), ['Tue evening','Sat afternoon']);
  c('the same week for each room and in a member\'s details', [/uWeek\(v\.slots,'slot-'\+f\.k\)/.test(HTML),/uWeek\(r\.slots,'memberSlot'\)/.test(HTML),/uChecks\(U_SLOTS/.test(HTML)], [true,true,false]);

  console.log('\n-- the Spiritual Gifts results: one line each --');
  P.E(`(()=>{ capSave(${JSON.stringify(FX.MEDIUM)}); gfDemoFill({quiet:true}); gfOpenLanding(); })()`); await sleep(150);
  const row=P.q('#gf-results .gfrow2');
  c('a row: the name, then the date (the list is this church\'s: no church line, never the address)',
    [row.querySelector('.gfrw b').textContent, row.querySelector('.gfrw .note').textContent.trim(), /TILGHMAN|Warminster|church not recorded/i.test(row.textContent)],
    ['Alex Rivera (sample)', P.E(`gfDateText(gfRoster()[0].date)`), false]);
  c('the name and the date never wrap (one line each, "…" at the end if ever too long)', /\.gfrow2 \.gfrw>b,\.gfrow2 \.gfrw>\.note\{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\}/.test(HTML), true);
  c('the three gifts on one line, starting at the same place in every row (a column of their own on a wide card)',
    [/\.gfrow2 \.gftop3\{grid-area:t;flex-wrap:nowrap;justify-content:flex-start/.test(HTML), /grid-template-columns:minmax\(0,1fr\) 384px 192px/.test(HTML)], [true,true]);
}); T.done(); })();
