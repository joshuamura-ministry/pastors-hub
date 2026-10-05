// v10.45.0 — the church profile leaves the Community Survey for the Spiritual Gifts landing, "Your church" (DESIGN-SURVEY §1.1–§1.2).
// The pastor (3–5 Oct 2026): "There's too much to fill in… we're not gonna fill in your church's information here… no more filling in on
// community survey." The panel moves unchanged inside (the four steps, Demo, Clear all, the summary box); only the words that would
// now be false change; every reader of the profile (capMerged → Make the Case, the Planner, gfReadiness) is untouched. Save and Demo
// land on #gf-church at once; a half-typed profile survives the landing's own redraws; the pointers lead there; and no background
// "fresh ideas" are asked for on Save, Demo or a survey load (Q3). Written failing-first against v10.44.1 (no #gf-church there).
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const {ROOT,HTML,checker,page,ready,survey,sleep,until}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const SEED=JSON.parse(fs.readFileSync(path.join(ROOT,'tests','average-church','seed-after.json'),'utf8'));
const STORE=Object.fromEntries(Object.entries(SEED).filter(([k])=>!k.startsWith('_')));
const CAP_1044='a3ec4448f112adc5949abe62382d8e456d9000df';   // capMerged() of the average church, as v10.44.1 read it
const landing=P=>P.E(`(()=>{ openTool('gifts'); if(GF_VIEW!=='roster'){ GF_VIEW='roster'; gfRender(); } })()`);
const counted=P=>P.E(`(()=>{ window.__auto=0; autoIdeas=function(){ window.__auto++; return Promise.resolve(); }; })()`);

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the survey asks for nothing --');
  let P=page(); await ready(P); survey(P); await sleep(40);
  c('no church form, no turn to the church, no Mobilization, no ministries list in the survey',
    [!!P.q('#capslot'),!!P.q('#hinge'),P.qa('#sections h2').map(h=>h.textContent).filter(t=>/^(Mobilization|Your church|Ministries your church could offer)$/.test(t)),!!P.q('#u-ministry-list'),!!P.q('#u-cap-form')], [false,false,[],false,false]);
  c('the hub tile says what the survey does now', [P.txt('[data-tool="survey"] .td'),P.J(`FEATURES.plan.blurb`)], ['Know your neighbors and what they need most.','Ministry ideas for every need, a one-page sheet for each, where to look and community resources.']);

  console.log('\n-- "Your church" on the Spiritual Gifts landing --');
  P=page({store:STORE}); await ready(P); landing(P); await sleep(30);
  // the review round (#18, the coordinator's decision 6): one framed card near the top (after the Gifts-first card, before the two
  // doors), called only "Your church", saying it moved here
  c('#gf-church near the top of the landing: after the Gifts-first card, before the two doors; a framed card', [!!P.q('#giftbody #gf-church'),P.q('#gf-church').previousElementSibling.matches('[data-gf-first]'),P.q('#gf-church').nextElementSibling.classList.contains('gfdoors'),P.q('#gf-church').classList.contains('card')], [true,true,true,true]);
  c('…its words: "Your church", that it moved here, what it holds and who reads it', [P.txt('#gf-church > summary'),P.txt('#gf-church > p.note')],
    ['Your church Moved here from the Community Survey.','People, rooms, money and skills. Make the Case and the Evangelism Planner read these numbers.']);
  c('…the form calls it by the church\'s name and "What your church has", never "One profile for My church"', [P.txt('#u-cap-form .u-heading h3'),/One profile for|My church/.test(P.txt('#u-cap-form .u-heading')||''),/^For Sampleton SDA/.test(P.txt('#u-cap-form .u-heading p.note')||'')], ['What your church has',false,true]);
  c('…closed when the church has its information (the average church)', P.q('#gf-church').open, false);
  c('…the summary box first (#capsumslot), then the four-step form (#capslot), unchanged inside', [!!P.q('#gf-church #capsumslot .capsum'),!!P.q('#gf-church #capslot #u-cap-form'),P.qa('#gf-church .u-steps-nav li').length], [true,true,4]);
  c('one #capslot on the page (the id stays unique)', P.qa('[id="capslot"]').length, 1);
  c('the Gifts first card is not repeated inside (the landing shows it at its top)', [P.qa('#gf-church [data-gf-first]').length,P.qa('#gifts [data-gf-first="landing"]').length], [0,1]);
  c('capMerged() reads the average church exactly as v10.44.1 did (Make the Case, the Planner, gfReadiness)', crypto.createHash('sha1').update(P.E('JSON.stringify(capMerged())')).digest('hex'), CAP_1044);
  c('the Save button and the status, true now', [P.txt('#cap-done'),P.txt('#u-cap-status')], ['Save church','Saved for this church.']);
  c('the summary\'s foot line (the average church is a sample): Clear all is above it now', P.txt('#capsumslot .capsumfoot'), 'The sample church: press Clear all above when you are done.');
  P.E(`capSave({...capGet(),demo:false}); gfChurchSum();`);
  c('…for his own church: who reads these numbers', P.txt('#capsumslot .capsumfoot'), 'Make the Case and the Evangelism Planner read these numbers.');

  console.log('\n-- Demo and Save land on "Your church", at once --');
  P=page(); await ready(P); survey(P); landing(P); counted(P); await sleep(30);
  c('an empty church: "Finish the four steps to save your church."', P.txt('#u-cap-status'), 'Finish the four steps to save your church.');
  P.w.__scrolled.length=0;
  P.q('#u-demo').click(); await sleep(120);
  c('Demo: the sample church, the fold open, the page jumped to it instantly (never smooth)',
    [P.J('capGet().demo'),P.q('#gf-church').open,P.w.__scrolled.filter(s=>s.id==='gf-church').map(s=>s.how).slice(-1)[0],P.w.__scrolled.every(s=>s.how!=='smooth')], [true,true,'auto',true]);
  c('…the summary box fills in, its foot line for the sample', [!!P.q('#capsumslot .capsum.demo'),P.txt('#capsumslot .capsumfoot')], [true,'The sample church: press Clear all above when you are done.']);
  c('…and nothing is asked of the server: no background ideas', P.E('window.__auto'), 0);
  c('…still the Spiritual Gifts page, with no survey drawn over it', [P.E('TOOL'),P.q('#report').classList.contains('show')], ['gifts',false]);
  P.w.__scrolled.length=0;
  P.q('#u-cap-form [name="churchName"]').value='Bucks County SDA';
  P.q('#u-cap-form').dispatchEvent(new P.w.Event('submit',{cancelable:true}));
  await sleep(120);
  c('Save: saved, the fold open, the jump to it instant, no background ideas', [P.J('capGet().confirmed'),P.q('#gf-church').open,P.w.__scrolled.filter(s=>s.id==='gf-church').map(s=>s.how).slice(-1)[0],P.E('window.__auto')], [true,true,'auto',0]);
  c('goToMobilization is the same jump, by its old name', P.E(`goToMobilization.toString().includes('capShowSaved')`), true);
  survey(P); await sleep(40);
  c('a survey drawn after it asks for no ideas either', P.E('window.__auto'), 0);
  c('the survey\'s load (run) no longer starts them', /setTimeout\(autoIdeas/.test(P.E('run.toString()')), false);
  c('"Review members in Spiritual Gifts" opens the Volunteers fold here', (landing(P),P.q('#u-team-link').click(),P.q('#gfteamslot details').open), true);

  console.log('\n-- a half-typed profile survives the landing\'s own redraws --');
  P=page({store:STORE}); await ready(P); landing(P); await sleep(30);
  P.q('#gf-church').open=true;
  P.E(`U_STEP_I=1; capRender();`);
  const inp=P.q('#u-cap-form [name="startupBudget"]'); inp.value='2345'; inp.dispatchEvent(new P.w.Event('input',{bubbles:true}));
  P.E(`gfRenderRoster(gfHost())`);   // what "Check for new results", the quiet check and a delete do
  c('after a redraw: the same form, the value typed, the step, the fold open', [P.q('#u-cap-form [name="startupBudget"]').value,P.E('U_STEP_I'),P.q('#gf-church').open,P.txt('#u-cap-status')], ['2345',1,true,'Unsaved changes — save to update the plan.']);
  c('…and still one #gf-church, in its place', [P.qa('#gf-church').length,P.q('#gf-church').nextElementSibling.classList.contains('gfdoors')], [1,true]);

  console.log('\n-- every way to the profile leads there --');
  P=page({store:STORE}); await ready(P); survey(P); await sleep(30);
  P.E(`openTool('gifts'); GF_VIEW='roster'; gfRender();`); P.E(`(()=>{ const d=document.querySelector('#gfteamslot details'); if(d) d.open=true; })()`);
  P.w.__scrolled.length=0;
  P.q('#u-resource-profile').click(); await sleep(60);
  c('the volunteers\' "church profile" button: the landing, "Your church" open and in view', [P.E('TOOL'),P.q('#gf-church').open,P.w.__scrolled.some(s=>s.id==='gf-church'&&s.how==='auto')], ['gifts',true,true]);
  P.E(`openTool('case'); const h=document.createElement('details'); h.id='gfr-test'; document.body.appendChild(h); gfReadyPanelMount(h);`);
  const pb=P.q('#gfr-test [data-gfr-profile]');
  c('Make the Case\'s "Your church, ready to serve": its profile button leads there too', pb?(pb.click(),[P.E('TOOL'),P.q('#gf-church').open]):'no button (the profile is saved)', pb?['gifts',true]:'no button (the profile is saved)');
  c('the Planner\'s facilities note names the new place', /Tick them under Your church, on the Spiritual Gifts page/.test(HTML.match(/No facilities recorded yet\.[^']*/)[0]), true);
  c('uRefresh keeps its place by the needs now (else the form)', P.E(`uRefresh.toString().includes("'u-needs'")`), true);

  console.log('\n-- in Spanish --');
  P=page({lang:'es',store:STORE}); await ready(P); landing(P); await sleep(30);
  c('"Su iglesia", that it moved here, what it holds, who reads it', [P.txt('#gf-church > summary'),P.txt('#gf-church > p.note')],
    ['Su iglesia Se trasladó aquí desde la Encuesta Comunitaria.','Personas, salones, dinero y habilidades. Presentar el caso y el Planificador de evangelismo usan estas cifras.']);
  // the review round (#18): the form itself in Spanish ("Fill in a demo church" stood beside "Borrar todo")
  { const t=P.txt('#gf-church')||'';   // (the church's own entries, here the sample's, stay as they were typed)
    const EN=['Members on the books','Attending','Volunteers','Leaders','Hours a month','Free to serve','Congregation','Startup funds','Building','Left to give','The sample church, as filled in',
      'When can the team serve?','Fill in a demo church','Refill the demo church','Church name','Step 1 of 4','Save church','Next step','Nothing to add here','Kitchen / fellowship hall','bilingual members',
      'Tue evening','Mostly older members','Review needed','Not recorded','What your church has','One profile for'];
    c('…and its form and summary in Spanish too: none of their English words left inside "Su iglesia"', EN.filter(w=>t.includes(w)), []); }
  c('…the summary\'s foot lines', [P.txt('#capsumslot .capsumfoot'),(P.E(`capSave({...capGet(),demo:false}); gfChurchSum();`),P.txt('#capsumslot .capsumfoot'))],
    ['La iglesia de ejemplo: toque Borrar todo arriba cuando termine.','Presentar el caso y el Planificador de evangelismo usan estas cifras.']);
  c('…the hub tile', (P.E(`showHub()`),P.txt('[data-tool="survey"] .td')), 'Conozca a sus vecinos y lo que más necesitan.');
  c('no page error along the way', P.errs, []);
}); await T.sec(async()=>{
  console.log('\n-- no information yet: "Your church" opens by itself (the coordinator\'s decision 6) --');
  const P=page(); await ready(P); landing(P); await sleep(30);
  c('a church with nothing saved: the card is open', [P.J('capGet().confirmed||false'),P.q('#gf-church').open], [false,true]);
  // v10.45.1: the survey's note and its link went at the pastor's word ("you don't need the thing that says your church's information is on the spiritual gifts page")
  c('the survey carries no link to it any more', (survey(P),P.qa('#u-needs [data-gf-church]').length), 0);
}); await T.sec(async()=>{
  console.log('\n-- B1: two churches in one district; the form follows the church on screen --');
  const P=page(); await ready(P);
  // Bucks County: its profile saved, the landing drawn
  P.E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; CAP=null; capSave({members:55,volunteers:14,startupBudget:1500,monthlyBudget:200,confirmed:true}); uPersist(); })()`);
  landing(P); await sleep(30);
  const A=P.J('uChurch().id');
  c('the form is Bucks County\'s', [P.q('#u-cap-form [name="churchName"]').value,P.q('#u-cap-form [name="members"]').value], ['Bucks County SDA','55']);
  // a second church becomes the active one (a survey of its address), and the landing is drawn again
  P.E(`(()=>{ const s=uStore(); const id='fairview'; s.churches[id]={id,name:'Fairview Village SDA',capacity:{},selected:[],lib:{}}; s.active=id; uPersist(); })()`);
  landing(P); P.E(`gfRender()`); await sleep(30);
  c('Fairview is active; the form is drawn again for it, never kept from Bucks County', [P.J('uChurch().name'),P.q('#gf-church').dataset.church,P.q('#u-cap-form [name="churchName"]').value,P.q('#u-cap-form [name="members"]').value],
    ['Fairview Village SDA','fairview','Fairview Village SDA','']);
  // belt and braces: a form drawn for Bucks County, the active church switched under it, then Save
  P.E(`(()=>{ const s=uStore(); s.active=${JSON.stringify(A)}; uPersist(); gfRender(); })()`); await sleep(20);
  P.E(`(()=>{ const s=uStore(); s.active='fairview'; uPersist(); })()`);
  P.q('#u-cap-form [name="members"]').value='60'; P.w.HTMLFormElement.prototype.reportValidity=()=>true;
  P.E(`document.getElementById('u-cap-form').dispatchEvent(new Event('submit',{cancelable:true}))`); await sleep(30);
  c('…Save on a form drawn for another church saves nothing into this one, and draws the form again', [P.J(`uStore().churches.fairview.capacity.members??null`),P.J(`uStore().churches[${JSON.stringify(A)}].name`),P.q('#u-cap-form [name="churchName"]').value],
    [null,'Bucks County SDA','Fairview Village SDA']);
  c('no page error', P.errs, []);
}); T.done(); })();
