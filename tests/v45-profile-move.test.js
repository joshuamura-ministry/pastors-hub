// v10.45.0 — the church profile leaves the Community Survey for the Spiritual Gifts landing, "Your church" (DESIGN-SURVEY §1.1–§1.2).
// The pastor (3–5 Oct 2026): "There's too much to fill in… we're not gonna fill in your church's information here… no more filling in on
// community survey." The panel moves unchanged inside (the four steps, Demo, Clear all, the summary box); only the words that would
// now be false change; every reader of the profile (capMerged → Make the Case, the Planner, gfReadiness) is untouched. Save and Demo
// land on #gf-church at once; a half-typed profile survives the landing's own redraws; the pointers lead there; and no background
// "fresh ideas" are asked for on Save, Demo or a survey load (Q3). Written failing-first against v10.44.1 (no #gf-church there).
// v10.55.0 — the pastor (6 Oct 2026) moved it back, to its own place: "the people when they see spiritual gifts they're not gonna know that
// that's where you put in the information for your church … right after the community resources maybe a section because that's gonna come
// right before the community needs … a very clear section that allows the Pastor to fill out that part"; and "you can remove the … fill-in
// information in the spiritual gifts … that's all it's gonna be about just spiritual gifts". So "Your church" is the survey's section
// #u-church, after Community resources and before the needs; the Spiritual Gifts landing has no church card. Every check below follows
// the card to its new home; what it holds, how it saves and who reads it are unchanged.
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const {ROOT,HTML,checker,page,ready,survey,sleep,until}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const SEED=JSON.parse(fs.readFileSync(path.join(ROOT,'tests','average-church','seed-after.json'),'utf8'));
const STORE=Object.fromEntries(Object.entries(SEED).filter(([k])=>!k.startsWith('_')));
const CAP_1044='a3ec4448f112adc5949abe62382d8e456d9000df';   // capMerged() of the average church, as v10.44.1 read it
const CAP_1049='b8716e88d1305e3dc09c8d256e4526f5851bd437';   // …and from v10.49.0: the same, with startup and monthly null (checked: the only difference)
const landing=P=>P.E(`(()=>{ openTool('gifts'); if(GF_VIEW!=='roster'){ GF_VIEW='roster'; gfRender(); } })()`);
// v10.55.0: the card's home, the survey's "Your church" (the survey drawn for the church's own address, its data untouched)
const {FX}=require('./v45-helpers.js');
const home=P=>P.E(`(()=>{ if(!DATA){ const D=${JSON.stringify(FX.DATA)}; const a=uChurch().address; if(a) D.geo={...D.geo,matched:a}; DATA=D; SCOPE='tract'; CAP=null; }
  openTool('survey'); render(); })()`);
const counted=P=>P.E(`(()=>{ window.__auto=0; autoIdeas=function(){ window.__auto++; return Promise.resolve(); }; })()`);

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the survey: "Your church", before the needs (v10.55.0) --');
  let P=page(); await ready(P); survey(P); await sleep(40);
  c('the form in its own section, once, before the needs; no turn to the church, no Mobilization, no ministries list',
    [!!P.q('#u-church #capslot'),!!P.q('#hinge'),P.qa('#sections h2').map(h=>h.textContent).filter(t=>/^(Mobilization|Your church|Ministries your church could offer)$/.test(t)),!!P.q('#u-ministry-list'),P.q('#u-church').nextElementSibling.id],
    [true,false,['Your church'],false,'u-needs']);
  c('…after Community resources', P.q('#u-church').previousElementSibling.querySelector('h2').textContent, 'Community resources');
  c('the Spiritual Gifts landing holds no church card any more', (landing(P),!!P.q('#gifts #gf-church')), false);
  c('the hub tile says what the survey does now', [P.txt('[data-tool="survey"] .td'),P.J(`FEATURES.plan.blurb`)], ['Know your neighbors and what they need most.','Ministry ideas for every need, a one-page sheet for each, where to look and community resources.']);

  console.log('\n-- "Your church" in the survey (was: on the Spiritual Gifts landing) --');
  P=page({store:STORE}); await ready(P); home(P); await sleep(30);
  // the review round (#18, the coordinator's decision 6): one framed card near the top (after the Gifts-first card, before the two
  // doors), called only "Your church", saying it moved here
  // v10.50.0 — the pastor (6 Oct 2026): the three steps at the top, then Your church (step 1), then the invitation (step 2); no Gifts-first card
  c('#gf-church in the survey\'s "Your church": under its line, above the Spiritual Gifts line; a framed card', [!!P.q('#u-church #gf-church'),P.q('#u-churchslot').previousElementSibling.classList.contains('note'),P.q('#u-churchslot').nextElementSibling.id,P.q('#gf-church').classList.contains('card')], [true,true,'u-gfnote',true]);
  c('…its words: what it holds, and that the money is on the proposal', P.txt('#gf-church > summary'), 'People, rooms and skills The money for a ministry is on its proposal.');   // v10.49.0: money moved to the proposal
  c('…the form calls it by the church\'s name and "What your church has", never "One profile for My church"', [P.txt('#u-cap-form .u-heading h3'),/One profile for|My church/.test(P.txt('#u-cap-form .u-heading')||''),/^For Sampleton SDA/.test(P.txt('#u-cap-form .u-heading p.note')||'')], ['What your church has',false,true]);
  c('…closed when the church has its information (the average church)', P.q('#gf-church').open, false);
  // v10.56.2 (stale, not a regression): the summary is the slider's fourth page, "At a glance" (#u-sumbody), and Demo and Save slide to it
  // without moving the page (the pastor: "when I finished it jumped to the top, which is very jolting … it should just scroll to the right")
  c('…the form (#capslot) with its three steps and At a glance, the summary its last page (no box above it)', [!!P.q('#gf-church #capsumslot'),!!P.q('#gf-church #capslot #u-cap-form #u-sumbody .capsum'),P.qa('#gf-church .u-steps-nav li').length], [false,true,4]);
  c('one #capslot on the page (the id stays unique)', P.qa('[id="capslot"]').length, 1);
  c('no Gifts first card inside (the section\'s own Spiritual Gifts line says it), and none on the landing (v10.50.0: "take that box away")', [P.qa('#gf-church [data-gf-first]').length,P.qa('#gifts [data-gf-first="landing"]').length,!!P.q('#u-gfnote [data-u-gifts]')], [0,0,true]);
  // v10.49.0: as v10.44.1 did, but for money (startup and monthly are null: a proposal states what its ministry needs)
  c('capMerged() reads the average church as v10.44.1 did, without the money (Make the Case, the Planner, gfReadiness)', crypto.createHash('sha1').update(P.E('JSON.stringify(capMerged())')).digest('hex'), CAP_1049);
  c('the Save button and the status, true now', [P.txt('#cap-done'),P.txt('#u-cap-status')], ['Save church','Saved for this church.']);
  c('the summary\'s foot line (the average church is a sample): Clear all is above it now', P.txt('#u-sumbody .capsumfoot'), 'The sample church: press Clear all above when you are done.');
  P.E(`capSave({...capGet(),demo:false}); gfChurchSum();`);
  c('…for his own church: who reads these numbers', P.txt('#u-sumbody .capsumfoot'), 'Make the Case and the Evangelism Planner read these numbers.');

  console.log('\n-- Demo and Save land on "Your church", at once --');
  P=page(); await ready(P); survey(P); home(P); counted(P); await sleep(30);
  c('an empty church: "Finish the three steps to save your church." (v10.50.0: three steps since v10.49.0)', P.txt('#u-cap-status'), 'Finish the three steps to save your church.');
  P.w.__scrolled.length=0;
  P.q('#u-demo').click(); await until(()=>P.E('U_STEP_I')===3,3000); await sleep(80);
  // v10.56.2 (stale): Demo slides the card to "At a glance"; the page does not move (was: the page jumped to the card, instantly)
  c('Demo: the sample church, the fold open, the page not moved, nothing smooth',
    [P.J('capGet().demo'),P.q('#gf-church').open,P.w.__scrolled.filter(s=>s.id==='gf-church').length,P.w.__scrolled.filter(s=>s.id).every(s=>s.how!=='smooth')], [true,true,0,true]);
  c('…the summary (At a glance) fills in, its foot line for the sample', [!!P.q('#u-sumbody .capsum.demo'),P.txt('#u-sumbody .capsumfoot'),P.E('U_STEP_I')], [true,'The sample church: press Clear all above when you are done.',3]);
  c('…and nothing is asked of the server: no background ideas', P.E('window.__auto'), 0);
  c('…still the survey', [P.E('TOOL'),P.q('#report').classList.contains('show')], ['survey',true]);
  P.w.__scrolled.length=0;
  P.q('#u-cap-form [name="churchName"]').value='Bucks County SDA';
  P.q('#u-cap-form').dispatchEvent(new P.w.Event('submit',{cancelable:true}));
  // the slide to At a glance runs two animation frames after Save: wait for it (a fixed 120 ms failed once under the full suite's load)
  await until(()=>P.E('U_STEP_I')===3,3000); await sleep(40);
  c('Save: saved, the fold open, the page not moved, on At a glance, no background ideas (v10.56.2)', [P.J('capGet().confirmed'),P.q('#gf-church').open,P.w.__scrolled.filter(s=>s.id==='gf-church').length,P.E('U_STEP_I'),P.E('window.__auto')], [true,true,0,3,0]);
  c('goToMobilization is the same jump, by its old name', P.E(`goToMobilization.toString().includes('capShowSaved')`), true);
  survey(P); await sleep(40);
  c('a survey drawn after it asks for no ideas either', P.E('window.__auto'), 0);
  c('the survey\'s load (run) no longer starts them', /setTimeout\(autoIdeas/.test(P.E('run.toString()')), false);
  // v10.56.2 (stale, not a regression): the pastor, "if there's a button that points to spiritual gifts, just send the person to the main page for spiritual gifts. Don't send them to like any other spot"
  c('"Review members in Spiritual Gifts" opens the Spiritual Gifts main page (the members are its step 3)', (home(P),P.q('#u-team-link').click(),[P.E('TOOL'),P.E('GF_VIEW'),!!P.q('#gf-positions #gfteamslot details')]), ['gifts','roster',true]);

  console.log('\n-- a half-typed profile survives the survey\'s own redraws, and a trip to another tool --');
  P=page({store:STORE}); await ready(P); home(P); await sleep(30);
  P.q('#gf-church').open=true;
  P.E(`U_STEP_I=1; capRender();`);
  const inp=P.q('#u-cap-form [data-panel="1"] input[type="number"]'); inp.value='2345'; inp.dispatchEvent(new P.w.Event('input',{bubbles:true}));   // v10.49.0: a step-2 box (Building; Money left)
  P.E(`render()`);   // what a scope change, a saved church or a new survey does
  c('after a redraw: the same form, the value typed, the step, the fold open', [P.q('#u-cap-form [data-panel="1"] input[type="number"]').value,P.E('U_STEP_I'),P.q('#gf-church').open,P.txt('#u-cap-status')], ['2345',1,true,'Unsaved changes — save to update the plan.']);
  c('…and still one #gf-church, in its place', [P.qa('#gf-church').length,P.q('#gf-church').parentNode.id], [1,'u-churchslot']);
  P.E(`openTool('gifts'); openTool('survey');`);
  c('…and after a trip to Spiritual Gifts and back', [P.q('#u-cap-form [data-panel="1"] input[type="number"]').value,P.q('#gf-church').parentNode.id], ['2345','u-churchslot']);

  console.log('\n-- every way to the profile leads there --');
  P=page({store:STORE}); await ready(P); survey(P); await sleep(30);
  P.E(`openTool('gifts'); GF_VIEW='roster'; gfRender();`); P.E(`(()=>{ const d=document.querySelector('#gfteamslot details'); if(d) d.open=true; })()`);
  P.w.__scrolled.length=0;
  P.q('#u-resource-profile').click(); await sleep(60);
  c('the volunteers\' "church profile" button: the survey, "Your church" open and in view', [P.E('TOOL'),P.q('#gf-church').open,P.w.__scrolled.some(s=>s.id==='u-church'&&s.how==='auto')], ['survey',true,true]);
  // v10.51.0: "Your church, ready to serve" is a small card with one button, "Open Spiritual Gifts" (the pastor: "a button that will …
  // send the Pastor to the spiritual gifts page"): it leads to the landing, where "Your church" is
  P.E(`openTool('case'); const h=document.createElement('section'); h.id='gfr-test'; document.body.appendChild(h); gfReadyPanelMount(h);`);
  P.q('#gfr-test [data-gfr-gifts]').click(); await sleep(40);
  c('Make the Case\'s "Your church, ready to serve": its button leads to the Spiritual Gifts page (gifts only now)', [P.E('TOOL'),!!P.q('#gifts #gf-church')], ['gifts',false]);
  c('the Planner\'s facilities note names the new place', /Tick them under Your church, in the Community Survey/.test(HTML.match(/No facilities recorded yet\.[^']*/)[0]), true);
  c('uRefresh keeps its place by the needs now (else the form)', P.E(`uRefresh.toString().includes("'u-needs'")`), true);

  console.log('\n-- in Spanish --');
  P=page({lang:'es',store:STORE}); await ready(P); home(P); await sleep(30);
  c('"Su iglesia" in Spanish: the section and the card', [P.txt('#u-church h2'),P.txt('#gf-church > summary')],
    ['Su iglesia','Personas, salones y habilidades El dinero de cada ministerio está en su propuesta.']);
  // the review round (#18): the form itself in Spanish ("Fill in a demo church" stood beside "Borrar todo")
  { const t=P.txt('#gf-church')||'';   // (the church's own entries, here the sample's, stay as they were typed)
    const EN=['Members on the books','Attending','Volunteers','Leaders','Hours a month','Free to serve','Congregation','Startup funds','Building','Left to give','The sample church, as filled in',
      'When can the team serve?','Fill in a demo church','Refill the demo church','Church name','Step 1 of 4','Save church','Next step','Nothing to add here','Kitchen / fellowship hall','bilingual members',
      'Tue evening','Mostly older members','Review needed','Not recorded','What your church has','One profile for'];
    c('…and its form and summary in Spanish too: none of their English words left inside "Su iglesia"', EN.filter(w=>t.includes(w)), []); }
  c('…the summary\'s foot lines', [P.txt('#u-sumbody .capsumfoot'),(P.E(`capSave({...capGet(),demo:false}); gfChurchSum();`),P.txt('#u-sumbody .capsumfoot'))],
    ['La iglesia de ejemplo: toque Borrar todo arriba cuando termine.','Presentar el caso y el Planificador de evangelismo usan estas cifras.']);
  c('…the hub tile', (P.E(`showHub()`),P.txt('[data-tool="survey"] .td')), 'Conozca a sus vecinos y lo que más necesitan.');
  c('no page error along the way', P.errs, []);
}); await T.sec(async()=>{
  console.log('\n-- no information yet: "Your church" opens by itself (the coordinator\'s decision 6) --');
  const P=page(); await ready(P); home(P); await sleep(30);
  c('a church with nothing saved: the card is open', [P.J('capGet().confirmed||false'),P.q('#gf-church').open], [false,true]);
  // v10.45.1: the survey's note and its link went at the pastor's word ("you don't need the thing that says your church's information is on the spiritual gifts page")
  c('the survey carries no link to it any more', (survey(P),P.qa('#u-needs [data-gf-church]').length), 0);
}); await T.sec(async()=>{
  console.log('\n-- B1: two churches in one district; the form follows the church on screen --');
  const P=page(); await ready(P); home(P); await sleep(20);
  // Bucks County: its profile saved, the survey drawn
  P.E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; CAP=null; capSave({members:55,volunteers:14,startupBudget:1500,monthlyBudget:200,confirmed:true}); uPersist(); capRender(); render(); })()`);   // v10.55.0: the survey keeps a live card across its redraws, so a profile saved behind its back is drawn by capRender (as Save, Demo and Clear all do)
  await sleep(30);
  const A=P.J('uChurch().id');
  c('the form is Bucks County\'s', [P.q('#u-cap-form [name="churchName"]').value,P.q('#u-cap-form [name="members"]').value], ['Bucks County SDA','55']);
  // a second church becomes the active one, and the survey is drawn again
  P.E(`(()=>{ const s=uStore(); const id='fairview'; s.churches[id]={id,name:'Fairview Village SDA',capacity:{},selected:[],lib:{}}; s.active=id; uPersist(); gfChurchHome($('u-churchslot')); })()`); await sleep(30);
  c('Fairview is active; the form is drawn again for it, never kept from Bucks County', [P.J('uChurch().name'),P.q('#gf-church').dataset.church,P.q('#u-cap-form [name="churchName"]').value,P.q('#u-cap-form [name="members"]').value],
    ['Fairview Village SDA','fairview','Fairview Village SDA','']);
  // belt and braces: a form drawn for Bucks County, the active church switched under it, then Save
  P.E(`(()=>{ const s=uStore(); s.active=${JSON.stringify(A)}; uPersist(); gfChurchHome($('u-churchslot')); })()`); await sleep(20);
  P.E(`(()=>{ const s=uStore(); s.active='fairview'; uPersist(); })()`);
  P.q('#u-cap-form [name="members"]').value='60'; P.w.HTMLFormElement.prototype.reportValidity=()=>true;
  P.E(`document.getElementById('u-cap-form').dispatchEvent(new Event('submit',{cancelable:true}))`); await sleep(30);
  c('…Save on a form drawn for another church saves nothing into this one, and draws the form again', [P.J(`uStore().churches.fairview.capacity.members??null`),P.J(`uStore().churches[${JSON.stringify(A)}].name`),P.q('#u-cap-form [name="churchName"]').value],
    [null,'Bucks County SDA','Fairview Village SDA']);
  c('no page error', P.errs, []);
}); T.done(); })();
