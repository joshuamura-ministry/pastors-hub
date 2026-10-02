// v10.42.0 — the pastor (30 Sep 2026), asked about five older built-ins that set ordinary work or events on Saturday
// (the Sabbath): "yes move them". They now happen on Sunday, in English and Spanish, and the Saturday-night supper
// says "after sundown". Reads the page's source text only.
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g));fail++}else pass++};
const has=t=>html.includes(t);

console.log('\n-- moved to Sunday --');
// v51 (the Sabbath guideline, 1 Oct 2026): respite childcare fits the Sabbath, so a worn-out parent can rest
c('respite: "Respite afternoon", one Sabbath or Sunday afternoon a month', has("n:'Respite afternoon',d:'One Sabbath or Sunday afternoon a month the church takes the children for four hours, so a worn-out parent can sleep, rest, or do nothing at all.'"));
c('fall festival: the last Sunday of October (EN)', has('Book the last Sunday of October'));
c('fall festival: el último domingo de octubre (ES)', has('Reserve el último domingo de octubre'));
c('car care: a spring and a fall Sunday (EN)', has('pick a spring and a fall Sunday.'));
c('car care: un domingo de primavera y otro de otoño (ES)', has('escoja un domingo de primavera y otro de otoño.'));
c('repair day: "Fix-it Sunday", one Sunday a month (EN)', [has("n:'Fix-it Sunday',"),has('One Sunday a month the practical members'),has('Pick one Sunday a month and set out tables')], [true,true,true]);
c('repair day: Domingo de reparaciones, un domingo al mes (ES)', [has("'repair-cafe':'Domingo de reparaciones',"),has('Escoja un domingo al mes y ponga mesas')], [true,true]);
// v51: a breakfast cannot move to an afternoon: an early Sabbath morning before Sabbath School, or a Sunday
c('men’s breakfast: a Sabbath morning before Sabbath School, or a Sunday, seven o’clock (EN, description, why and step)', [has("d:'A Sabbath morning before Sabbath School, or a Sunday: seven o\\u2019clock, cooked breakfast, one chapter, done by nine."),has('an early Sabbath or Sunday morning is often the one free slot'),has("'Pick a Sabbath morning before Sabbath School, or a Sunday, at seven o\\u2019clock, and cook")], [true,true,true]);
c('men’s breakfast: un sábado temprano o un domingo, a las siete (ES)', has('Escoja un sábado temprano, antes de la Escuela Sabática, o un domingo, a las siete, y cocine'));

console.log('\n-- nothing left on the Sabbath --');
const gone=['Respite Saturday','last Saturday of October','a spring and a fall Saturday','Fix-it Saturday','One Saturday a month','Pick one Saturday a month',
  "d:'Saturday, seven o","a Saturday morning is often the one free slot","Pick a Saturday, seven o",
  'último sábado de octubre','un sábado de primavera','Escoja un sábado al mes','Sábado de reparaciones','Escoja un sábado a las siete'];
c('none of the old Saturday wording remains', gone.filter(has), []);

console.log('\n-- the Saturday-night supper is after the Sabbath --');
c('EN: after sundown', has('Pick one Saturday evening next month, after sundown, and invite three neighbours to supper.'));
c('ES: después de la puesta del sol', has('Elija un sábado por la noche del próximo mes, después de la puesta del sol, e invite a cenar a tres vecinos.'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
