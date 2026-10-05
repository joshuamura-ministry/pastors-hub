// v10.47.0 — the pastor (5 Oct 2026), two screens made simple:
//   Make the Case: "who is it for … decide … should be leadership … then Ministry departments … the three main places to propose …
//   the board, the finance, the business meeting … the elders … not the nominating committee … let's keep the Deacon and
//   Deaconesses … the top row … like the first page". (The proposal card on arrival from the survey is in v45-handoff.)
//   Community Survey: "focus everything show everything … erase all that and then the census track area … we just need to know
//   which church … neighborhood town and County … right above the brief … nice and clean". Written failing-first on v10.46.1.
const fs=require('fs'), path=require('path');
const {ROOT,sleep,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

(async()=>{ await T.sec(async()=>{
  console.log('\n-- Make the Case · Who is it for? --');
  const P=page(); await ready(P); survey(P); P.E(`openTool('case')`); await sleep(80);
  const cats=()=>P.qa('#cs-s1 .cs-acat').map(b=>[b.textContent,b.getAttribute('aria-expanded')]), shown=()=>P.qa('#cs-s1 .cs-aud').filter(x=>!x.hidden).map(x=>x.dataset.csSec);
  c('four buttons across the top: Leadership, Ministry departments, On Sabbath, The conference; Leadership open', [cats(),shown()],
    [[['Leadership','true'],['Ministry departments','false'],['On Sabbath','false'],['The conference','false']],['decide']]);
  c('Leadership: the church board, finance, the business meeting, the elders, the deacons', P.qa('#cs-asec-decide [data-cs-group]').map(b=>b.dataset.csGroup), ['board','finance','business','elders','deacons']);
  c('the nominating committee is no longer under Leadership (Ministry departments › Other committees)', [P.qa('#cs-asec-decide [data-cs-group="nominating"]').length,P.qa('#cs-asec-teams [data-cs-group="nominating"]').length], [0,1]);
  P.q('#cs-s1 [data-cs-asec="teams"]').click();
  c('Ministry departments: its groups show, the others are put away', [cats().map(x=>x[1]),shown()], [['false','true','false','false'],['teams']]);
  P.q('#cs-s1 [data-cs-group="pathfinders"]').click(); await sleep(30); P.E('caseDraw1()');
  c('with a group chosen, its section is the one open when drawn again', shown(), ['teams']);
  P.E(`CASE_ST.audSec=null; caseSetPrefs({group:'congregation',type:'congregation'}); caseDraw1()`);
  c('…the whole church: On Sabbath open', shown(), ['sabbath']);
  c('each button names the section it opens; each section keeps its colour', P.qa('#cs-s1 .cs-acat').every(b=>{ const s=P.q('#'+b.getAttribute('aria-controls')); return s&&s.dataset.csSec===b.dataset.csAsec&&b.getAttribute('style')===s.getAttribute('style'); }), true);
  const S=page({lang:'es'}); await ready(S); survey(S); S.E(`openTool('case')`); await sleep(80);
  c('in Spanish', S.qa('#cs-s1 .cs-acat').map(b=>b.textContent), ['Liderazgo','Departamentos de ministerio','En sábado','La asociación']);

  console.log('\n-- the Community Survey\'s top: the church, then Neighborhood · Town · County on the Brief --');
  const Q=page(); await ready(Q); survey(Q); await sleep(60);
  c('the first line is the church: its name and its address, no census tract', [Q.txt('#place'),/Census Tract|Tract /.test(Q.txt('#place'))], ['Bucks County SDA · '+Q.E('homeAddr(DATA.geo.matched)'),false]);
  c('then Neighborhood · Town · County, then the Brief', [Q.q('#place').nextElementSibling.id,Q.qa('#scope button').length,!!Q.q('#brief .k')], ['scope',3,true]);
  c('Focus and its "Showing everything" line are not shown', /#focusbar,#focusnote\{display:none!important\}/.test(HTML), true);
  c('…and with nothing chosen everything shows (no section hidden by Focus)', Q.qa('#sections section.blk.hidden').length, 0);
  c('no page error', [P.errs,S.errs,Q.errs], [[],[],[]]);
}); T.done(); })();
