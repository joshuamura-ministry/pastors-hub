const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const H=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,200));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
let pageScrolls=0;
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};w.scrollBy=()=>{};
    w.Element.prototype.scrollIntoView=function(){pageScrolls++;};}});
const w=dom.window;
setTimeout(()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  // v10.45.0 (stale setup, the checks kept): the church profile left the Community Survey for the Spiritual Gifts landing ("Your church",
  // #gf-church); the pastor, 3–5 Oct 2026: "no more filling in on community survey". Its buttons are opened there.
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave({}); render(); openTool(\'gifts\');');

  console.log('\n-- the stage --');
  const stage=D.querySelector('.u-stage'), track=D.getElementById('u-track');
  c('a track inside the stage', !!track && track.parentElement===stage);
  // v10.49.0 — the pastor: "take the money part out of your church section": three steps now (was four, Money second)
  // v10.56.2 (stale, not a regression): the summary is the slider's fourth page, "At a glance" (the pastor: "it should just scroll to the right and be one full page that shows all the information")
  c('four panels on the track (three steps and At a glance)', track.querySelectorAll('.u-panel').length, 4);
  c('the stage has one fixed height', /\.u-stage\{[^}]*height:clamp\(380px,58vh,600px\)/.test(html));
  c('and hides overflow', /\.u-stage\{[^}]*overflow:hidden/.test(html));
  c('the track is four panels wide', /\.u-track\{[^}]*width:400%/.test(html));
  c('and animates its transform', /\.u-track\{[^}]*transition:transform/.test(html));
  c('each panel scrolls inside itself', /\.u-panel\{[^}]*overflow-y:auto/.test(html));
  c('each panel is a quarter of the track', /\.u-panel\{[^}]*flex:0 0 calc\(100% \/ 4\)/.test(html));
  c('no panel is display:none any more', /\.u-panel\{display:none/.test(html), false);
  c('the old entry animations are gone', /@keyframes uInR/.test(html), false);
  c('reduced motion turns the slide off', /prefers-reduced-motion:reduce\)\{\.u-track\{transition:none\}\}/.test(html));

  console.log('\n-- stepping --');
  const panels=[...track.querySelectorAll('.u-panel')];
  const pos=()=>track.style.transform;
  c('starts on step one', pos(), 'translateX(-0%)');
  c('only step one is live', panels.map(p=>p.hasAttribute('inert')), [false,true,true,true]);
  pageScrolls=0;
  D.querySelector('[name="churchName"]').value='Test Church';
  D.getElementById('u-next').click();
  c('Next slides the track one panel left', pos(), 'translateX(-25%)');
  c('step two is now live, the others inert', panels.map(p=>p.hasAttribute('inert')), [true,false,true,true]);
  c('screen readers see only the live step', panels.map(p=>p.getAttribute('aria-hidden')), ['true','false','true','true']);
  c('the page was NOT scrolled', pageScrolls, 0);
  D.getElementById('u-next').click();
  c('one more Next reaches the last step of the form', pos(), 'translateX(-50%)');
  c('Next is hidden on the last step and Save shown', D.getElementById('u-next').hidden && !D.getElementById('cap-done').hidden);
  D.getElementById('u-back').click();
  // v10.56.2: four pages, a quarter each (At a glance the last)
  c('Back slides right', pos(), 'translateX(-25%)');
  c('still no page scroll after three moves', pageScrolls, 0);
  D.querySelector('#u-steps-nav [data-goto="0"]').click();
  c('the step markers jump directly', pos(), 'translateX(-0%)');

  console.log('\n-- nothing typed is lost between steps --');
  D.querySelector('[name="churchName"]').value='Bucks County SDA';
  D.getElementById('u-next').click();
  const s2in=panels[1].querySelector('input[type="number"]'); s2in.value='40';
  D.getElementById('u-back').click();
  c('step one still holds what was typed', D.querySelector('[name="churchName"]').value, 'Bucks County SDA');
  D.getElementById('u-next').click();
  c('step two too', s2in.value, '40');
  c('every input is still inside the one form', D.querySelectorAll('#u-cap-form .u-panel input').length>20 && D.querySelectorAll('#u-cap-form input').length===D.querySelectorAll('#u-cap-form .u-panel input, #u-cap-form > input').length);

  console.log('\n-- Save from the wrong step --');
  // clear the required church name (step 1; the money boxes that were required on step 2 are gone), go to the last step, press Save
  D.querySelector('[name="churchName"]').value='';
  D.querySelector('#u-steps-nav [data-goto="2"]').click();
  c('on step three', track.style.transform, 'translateX(-50%)');
  let reported=0; w.HTMLFormElement.prototype.reportValidity=function(){reported++;return false;};
  D.getElementById('cap-done').click();
  c('Save slides back to step one, where the empty required field is', track.style.transform, 'translateX(-0%)');
  c('and nothing was saved', w.eval('capGet().confirmed')!==true);

  console.log('\n-- and a valid form still saves --');
  D.querySelector('[name="churchName"]').value='Bucks County SDA';
  w.HTMLFormElement.prototype.reportValidity=function(){return true;};
  D.getElementById('cap-done').click();
  c('Save goes through when every required field is filled', w.eval('capGet().confirmed'), true);
  c('and the church name was taken', w.eval('uChurch().name'), 'Bucks County SDA');

  console.log('\n-- print --');
  c('print unrolls the track', /@media print\{[\s\S]*?\.u-track\{display:block;width:auto;height:auto;transform:none!important\}/.test(html));
  c('and lets the stage grow', /@media print\{[\s\S]*?\.u-stage\{height:auto;overflow:visible/.test(html));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
