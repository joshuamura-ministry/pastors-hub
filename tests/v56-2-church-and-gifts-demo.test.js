// v10.56.2 — "Your church" ends on its summary; a demo of Spiritual Gifts, one demonstration with the demo church; every way into Spiritual
// Gifts opens its main page, in three coloured steps. The pastor (7 Oct 2026):
// - of the summary box above the form: "should be at the bottom as like the results of filling it in it shouldn't jump to the top … it
//   should just scroll to the right and be one full page that shows all the information … that's gonna save some space too";
// - "it would be good to have a demo spiritual gifts. It'll say test a tester … so when I am or someone else is showing them the app … I
//   don't have to go through the whole thing in order to show them the results and how it fits into everything", and "so that the demo
//   CHURCH can also be connected with the demo spiritual gift … the sample report shouldn't just be there … if you click complete a demo
//   … then the sample report will show";
// - "if there's a button that points to spiritual gifts, just send the person to the main page for spiritual gifts … a three invite your
//   members see the results and then one more step like fill the position and make those steps like maybe different colors".
// Written failing-first on v10.56.1.
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const ADDR="D.geo={...D.geo,matched:'118 Bristol Rd, Warminster, PA, 18974'}";

(async()=>{ await T.sec(async()=>{
  console.log('-- "Your church": four pages, the last its summary ("At a glance"); no box above the form --');
  const P=page({needs:'file'}); await ready(P);
  survey(P,{mod:ADDR}); await sleep(200);
  c('the steps: Your church, Your building, Skills, At a glance', P.qa('#u-church .u-steps-nav li span').map(x=>x.textContent), ['Your church','Your building','Skills','At a glance']);
  c('no summary box above the form any more', [!!P.q('#capsumslot'),!!P.q('#u-church .u-sumpanel #u-sumbody')], [false,true]);
  c('an empty church: its summary page says how it fills', P.txt('#u-sumbody'), 'Save your church, and everything you entered shows here, on one page.');
  c('an empty church opens on step 1', P.E('U_STEP_I'), 0);

  console.log('\n-- Demo: the church and its members\' results, one demonstration; the card slides to its summary; the page never moves --');
  P.w.__scrolled.length=0;
  P.q('#u-demo').click(); await sleep(120);
  c('the demo church saved, the card on "At a glance", the page not moved', [P.J('capGet().demo'),P.E('U_STEP_I'),P.q('#u-church .u-sumpanel').classList.contains('on'),P.w.__scrolled.filter(s=>s.id).map(s=>s.id)], [true,3,true,[]]);
  c('…its summary on that page', [!!P.q('#u-sumbody .capsum.demo'),P.txt('#u-sumbody .capsumk')], [true,'The sample church, as filled in']);
  c('…and the members\' demo results came with it: 24 of this church, every one "(sample)", the first the sample report\'s', [P.E('gfRoster().length'),P.E('gfRoster().every(r=>/ \\(sample\\)$/.test(gfDecode(r.code).name))'),P.E('gfRoster().some(r=>gfDecode(r.code).name==="Alex Rivera (sample)")')], [24,true,true]);
  c('…they count as this church\'s: 24 of its 46 adults; the church is ready for proposals', [P.txt('#u-gfnote .u-gfcount'),P.J('gfReadiness().state'),P.E('uPeople().length')], ['24 of 46 adults have answered.','half',24]);
  c('…so "Start here" and the moving frame rest', [P.q('#u-church').classList.contains('u-todo'),P.q('#u-church .u-chstart').hidden], [false,true]);
  c('the Spiritual Gifts line offers to clear the demo results', P.txt('#u-gfnote [data-u-gfdemo]'), 'Clear demo results');

  console.log('\n-- a church saved earlier opens on its summary; Back goes to Skills, where Save is --');
  P.E('U_STEP_I=null; capRender();'); await sleep(30);
  c('opens on "At a glance"', [P.E('U_STEP_I'),P.q('#cap-done').hidden,P.q('#u-next').hidden,P.q('#u-skip').hidden], [3,true,true,true]);
  P.q('#u-back').click(); await sleep(30);
  c('Back: Skills, with Save', [P.E('U_STEP_I'),P.q('#cap-done').hidden], [2,false]);
  P.w.__scrolled.length=0; P.w.HTMLFormElement.prototype.reportValidity=()=>true;
  P.q('#cap-done').click(); await sleep(120);
  c('Save: back on "At a glance", the page not moved', [P.E('U_STEP_I'),P.w.__scrolled.filter(s=>s.id).length], [3,0]);

  console.log('\n-- Clear demo results: only the demo goes --');
  P.E(`(()=>{ const ch=uChurch(), raw=JSON.stringify({v:4,date:new Date().toISOString().slice(0,10),chars:GIFTS.map(()=>'33333').join(''),heart:GF_HEART.map(()=>'1').join(''),minor:false,church:ch.name,churchId:ch.id,name:'Real Member',memberId:'m-real-1',resources:{}});
    gfRosterAdd('TG1-'+btoa(raw).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''),{}); uChurchSecMark(); })()`);
  c('a real member besides the demo: 25', P.E('gfRoster().length'), 25);
  P.q('#u-gfnote [data-u-gfdemo]').click(); await sleep(60);
  c('cleared: the real member stays, the button offers the demo again', [P.E('gfRoster().map(r=>gfDecode(r.code).name)'),P.txt('#u-gfnote [data-u-gfdemo]')], [['Real Member'],'Fill in demo results']);
  P.q('#u-gfnote [data-u-gfdemo]').click(); await sleep(60);
  c('Fill in demo results again: 24 more beside him', P.E('gfRoster().length'), 25);
  P.E(`capClearAll()`); await sleep(60);
  c('Clear all takes the demo results with the demo church; the real member stays', P.E('gfRoster().map(r=>gfDecode(r.code).name)'), ['Real Member']);

  console.log('\n-- "Fill in demo results" on an empty church fills the demo church too --');
  const Q=page({needs:'file'}); await ready(Q); survey(Q,{mod:ADDR}); await sleep(200);
  Q.q('#u-gfnote [data-u-gfdemo="fill"]').click(); await sleep(150);
  c('both demos in; the card on its summary', [Q.J('capGet().demo'),Q.E('gfRoster().length'),Q.E('U_STEP_I')], [true,24,3]);

  console.log('\n-- every way into Spiritual Gifts: its main page, at the top --');
  Q.q('#u-gfnote [data-u-gifts]').click(); await sleep(120);
  c('"Send the Spiritual Gifts survey": the main page', [Q.E('TOOL'),Q.E('GF_VIEW')], ['gifts','roster']);
  c('three steps, each its own colour: Invite your members, See the results, Fill the positions', Q.qa('#giftbody .gfsteps .gfstep').map(b=>[b.querySelector('span').textContent,b.style.getPropertyValue('--k')]),
    [['Invite your members','var(--m-people)'],['See the results','var(--acc)'],['Fill the positions','var(--m-hardship)']]);
  c('…their parts numbered in the same colours', ['gf-invite','gf-results','gf-positions'].map(id=>Q.q('#'+id).style.getPropertyValue('--k')), ['var(--m-people)','var(--acc)','var(--m-hardship)']);
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "you don't need … check for new results that should just populate whenever someone finishes … instead of having Open And delete … that circular graph … we don't need the sample report anymore … take it myself doesn't need to be there … we need to clear out the clutter"
  c('step 3: who fits where, Across the congregation itself, Who to ask, and the members (Volunteers, skills and availability)', [/See who fits where/.test(Q.txt('#gf-positions')),!!Q.q('#gf-positions .gfcong'),!!Q.q('#gf-positions [data-gf-tocase]'),!!Q.q('#gf-positions #gfteamslot details')], [true,true,true,true]);
  c('no sample report on the page (every result opens as one); the demo can be cleared', [!!Q.q('#gfsample'),Q.txt('#gf-results [data-gf-demo]')], [false,'Clear demo results']);
  Q.q('#gf-results [data-gf-demo]').click(); await sleep(60);
  c('cleared on the main page: no sample report, the demo offered', [!!Q.q('#gfsample'),Q.txt('#gf-results [data-gf-demo]'),Q.E('gfRoster().length')], [false,'Fill in demo results',0]);
  Q.E(`openTool('case')`); await sleep(80); Q.E(`gfOpenLanding()`); await sleep(60);
  c('from Make the Case: the main page too', [Q.E('TOOL'),Q.E('GF_VIEW')], ['gifts','roster']);

  console.log('\n-- Spanish --');
  const S=page({needs:'file',lang:'es'}); await ready(S); survey(S,{mod:ADDR}); await sleep(200);
  c('"De un vistazo", "Llenar resultados de ejemplo"', [S.qa('#u-church .u-steps-nav li span').map(x=>x.textContent)[3],S.txt('#u-gfnote [data-u-gfdemo]')], ['De un vistazo','Llenar resultados de ejemplo']);
  c('no page errors', [P.errs,Q.errs,S.errs], [[],[],[]]);
}); T.done(); })();
