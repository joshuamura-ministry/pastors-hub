// v10.70.1 · the audit's third look (26 Oct 2026): the last faults the reviewers saw in the pictures taken after the second round. The
// pastor: "everything is synmetrical and looks amazing". (1) The Planner's own sentences split a number from its word or a date on a
// phone ("28 / roles", "Dec 28, / 2027") and its heading left a "·" at a line end; (2) a few title lines that are not headings left one
// word alone (a phase's name, the fold-out titles, "Ver una presentación de / ejemplo", the kinds of ministry); (3) an opened ministry
// left the next one alone at half width; (4) one Digital footprint area had two names ("Ways in" on the chart, "Reaching out" on the
// card), the Good list said "the phone", and two different buttons were both "Revisar de nuevo" in Spanish; (5) "Consulte … y acuerden"
// mixed usted and ustedes; (6) the directory's Save and Load did not fill the row on a phone; (7) the report's heading broke
// "Seventh-/day". jsdom has no layout: the words and rules that make these right. Written failing first on the second round's commit.
const fs=require('fs'), path=require('path');
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const H=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const css=H.slice(H.indexOf('<style'),H.indexOf('</style>'));
const MON='(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
(async()=>{ await T.sec(async()=>{
  console.log('\n-- (1) the Planner’s sentences keep a number with its word and a date whole --');
  const P=page({}); await ready(P); P.E("openTool('planner')"); await sleep(120); P.q('#pl-demo').click(); await sleep(250);
  const items=P.qa('#pout .rail li').map(li=>li.textContent);
  c('the countdown has its items', items.length>20, true);
  // a number followed straight by its word ("28 roles"); a clause after a comma ("Dec 28, 2027, four months out") may start a line
  const numWord=items.filter(t=>/\d%? [A-Za-z]/.test(t));
  c('no item splits a number from the word after it ("28 roles", "293 pre-registrations")', numWord.slice(0,3), []);
  const monDay=items.filter(t=>new RegExp('\\b'+MON+' \\d').test(t));
  c('no item splits a month from its day ("Dec 28")', monDay.slice(0,3), []);
  const heads=P.qa('#pout .phead h2').slice(0,1).map(h=>h.textContent);
  c('the plan’s heading keeps its "·" with the words after it', heads.length>0&&heads.every(t=>!/ · /.test(t)&&/ · /.test(t)), true);
  c('…and still reads the same', heads.map(t=>t.replace(/\s+/g,' ')), ['Sample church (demo) · Prophecy and health series']);
  c('no page errors in the Planner', P.errs, []);

  console.log('\n-- (2) title lines that are not headings balance too --');
  c('a phase’s name', /\.phase \.pt b\{[^}]*text-wrap:balance/.test(css), true);
  c('every fold-out title (Community resources, …)', /(^|[\s,}])summary\{text-wrap:balance\}/.test(css), true);
  c('"See a sample slideshow" / "Ver una presentación de ejemplo"', /\.cs-samplel\{text-wrap:balance\}/.test(css), true);
  c('the kinds of ministry', /\.cmp-mghead\{text-wrap:balance\}/.test(css), true);

  console.log('\n-- (3) an opened ministry never leaves the next one alone at half width --');
  c('the ministries’ lists are watched for a lone last card', /const TS_NOLONE='[^']*\.cmp-mglist/.test(H), true);
  c('…and opening or closing one checks again (a class change adds no element)', /const flip=\(b,on,panel\)=>\{[^}]*tsNoLoneSoon\(\)/.test(H), true);

  console.log('\n-- (4) Digital footprint: one name for one area; plain words --');
  c('the circle chart names the area as its card does', P.J('DF_RSHORT.reach'), ['Reaching out','Alcance']);
  // seen in the pictures after: "Reaching out" ran off the chart's left edge ("eaching out"); a long label at a side takes two lines
  c('the chart draws a long side label in two lines, read as one name', /two=an!=='middle'&&w\.length>9&&w\.includes\(' '\)/.test(H), true);
  c('the Good list says "the phone number"', [/L\('the phone number','el número de teléfono'\)/.test(H), /L\('the phone','el teléfono'\)/.test(H)], [true,false]);
  c('Check again and Review again are two names in Spanish too', P.J('[DF_T.checkAgain.es!==DF_T.deepAgain.es, DF_T.checkAgain.es, DF_T.deepAgain.es]'), [true,'Leer de nuevo','Revisar a fondo otra vez']);
  c('the report’s heading never breaks "Seventh-day"', /<h3>\$\{esc\(String\(R\.title\)\.replace\(\/Seventh-day\/g,'Seventh\\u2011day'\)\)\}<\/h3>/.test(H), true);

  console.log('\n-- (5) usted, never usted and ustedes in one sentence --');
  c('"Consulte … y acuerde"', [/Consulte con su asociación antes de invitarlo y acuerde por escrito/.test(H), /Consulte con su asociación antes de invitarlo y acuerden/.test(H)], [true,false]);

  console.log('\n-- (6) the directory’s Save and Load fill the row on a phone --');
  c('two equal columns at 520 px and below', /@media \(max-width:520px\)\{\s*\.dir-foot\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/.test(css), true);
}); T.done(); })();
