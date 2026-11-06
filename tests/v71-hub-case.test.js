// v10.71.0 · two things the working-order audit found (6 Nov 2026; the pastor: "a full audit of this app making sure everything works
// solidly"). (1) After "Create a proposal for this ministry" from a need, the main menu's Make the Case tile still opened the Proposal view
// (NS.back is kept in sessionStorage), so "A ministry | A project or purchase" was hidden until "← Back to the need": the main menu now
// opens the full Make the Case (nsLeaveProp); arriving from a need, and a reload inside the Proposal view, keep it. (2) Compare your
// churches: when no church had a plan, "The plans" showed its headers and no row: one line, "No plan yet". (3) After a connection
// card was made, step 3's "After the day" card did not redraw (cnAfterSheet fires terrain:connect; nothing listened), so "Open the list"
// only appeared after a redraw: the card now listens. Written failing first.
const {sleep,until,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const B='3 Ridge Pike, Fairview Village, PA 19409';
(async()=>{ await T.sec(async()=>{
  console.log('\n-- (1) the main menu opens the full Make the Case --');
  const P=page(); await ready(P); await survey(P);   // the switch is drawn only once a survey is on the page
  // the state "Create a proposal" leaves: the way back to the need, and that idea chosen
  P.E(`(()=>{ NS.back={need:'kids',idea:'vbs',plan:'vbs'}; try{ sessionStorage.setItem('terrain-ns-back',JSON.stringify(NS.back)); }catch(e){} caseSetPrefs({ministry:'vbs',plan:false,path:'ministry'}); })()`);
  P.E("openTool('case')"); await sleep(80);
  c('arriving from a need: the Proposal view', P.E('casePropMode()'), true);
  P.E('showHub()'); await sleep(40);
  P.q('.tool[data-tool="case"]').click(); await sleep(120);
  c('from the main menu: the full Make the Case, not the Proposal view', [P.E('casePropMode()'), P.E('NS.back'), P.E("sessionStorage.getItem('terrain-ns-back')")], [false,null,null]);
  c('…with the path switch "A ministry | A project or purchase" on screen', (()=>{ const s=P.q('#cs-switch'); return !!s&&!s.hidden; })(), true);
  c('no page errors', P.errs, []);

  console.log('\n-- (2) The plans: one line when no church has a plan --');
  for(const lang of ['en','es']){
    const Q=page(lang==='es'?{lang:'es'}:{}); await ready(Q);
    Q.E(`(()=>{ const s=uStore(); const a=uChurch(); a.address='10 Greene Rd, Warminster, PA 18974'; s.churches['ch-b']={id:'ch-b',name:${JSON.stringify(B)},address:${JSON.stringify(B)},capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist(); })()`);
    Q.E("openTool('churches')"); await sleep(150);
    const sec=Q.q('#chc-plan') && Q.q('#chc-plan').closest('section');
    c(lang+': the plans section has a row, and it says so plainly', [!!sec, sec?sec.querySelectorAll('tbody tr').length:0, sec?/No plan yet|Todavía sin plan/.test(sec.textContent):false, sec?new RegExp(lang==='es'?'Todavía sin plan':'No plan yet').test(sec.textContent):false], [true,1,true,true]);
    c(lang+': no page errors', Q.errs, []);
  }

  console.log('\n-- (3) the "After the day" card redraws when a connection card is made --');
  const R=page(); await ready(R); await survey(R);
  R.E("openTool('case'); caseMount(true); caseChooseGroup('board'); caseChoose('health-expo');");
  await until(()=>R.q('#cs-fu:not([hidden])')); await sleep(40);
  R.E("window.__fuN=0; const o=fuCardHTML; fuCardHTML=function(){ window.__fuN++; return o.apply(null,arguments); };");
  R.E("document.querySelector('#cs-fu').insertAdjacentHTML('beforeend','<i id=\"fu-probe\"></i>')");
  R.E("document.dispatchEvent(new CustomEvent('terrain:connect',{detail:{id:'health-expo'}}))"); await sleep(40);
  c('the card is drawn again on terrain:connect', [R.E('window.__fuN'), !!R.q('#fu-probe'), !!R.q('#cs-fu [data-fu-make], #cs-fu [data-fu-list]')], [1,false,true]);
  c('no page errors', R.errs, []);
}); T.done(); })();
