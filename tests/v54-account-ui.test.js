// v10.54.0 — accounts and plans on the page (DESIGN-PRODUCT.md, Terrain-work/v69). The pastor (6 Oct 2026): "Now we need to make
// sure we connect this to the stripe and build this to be of the product", and on the trial: "what's going to entice them to stay";
// agreed: a card at sign-up, 14 days, the yearly plan first, the work readable after cancelling (the next release), "yes, it sound
// good". Payments stay OFF on the live site until he says "turn it on": while account.mjs says billing "off" everyone has the full
// version; one device tries it against Stripe's test mode with ?billing=test. The server's side is account-function.test.mjs; this
// suite is the page, with account.mjs and Firebase both stood in (nothing real is called). Written failing-first on v10.53.0.
const {JSDOM,VirtualConsole}=require('jsdom');
const {HTML,REG,sleep,until,checker}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const FB={apiKey:'AIzaSyTESTtestTESTtestTESTtest12345',authDomain:'terrain-live.firebaseapp.com',projectId:'terrain-live'};
const SESS='s1.dWlkLTE.zzzzzz.'+'A'.repeat(43);
const DAY=864e5, NOW=Date.now();
const INFO=(o)=>Object.assign({fn:'account-1.0',auth:true,fb:FB,billing:'off',mode:'test',checkout:true,trialDays:14,
  prices:{year:{amount:15000,currency:'usd'},month:{amount:1500,currency:'usd'}}},o||{});

/* a page on index.html: url, localStorage, an account.mjs stand-in (S) and, unless noFirebase, a Firebase stand-in (A) */
function pg(o){
  o=o||{};
  const S={calls:[], info:o.info||INFO(), plan:o.plan||(()=>({full:false,status:'none',trialUsed:false})), email:'jm@example.org',
    checkout:o.checkout||(()=>({status:200,json:{ok:true,url:'https://checkout.stripe.com/c/pay/cs_test_1'}})),
    portal:o.portal||(()=>({status:200,json:{ok:true,url:'https://billing.stripe.com/p/session/test_1'}})),
    session:o.session||(()=>({status:200,json:{ok:true,session:SESS,email:'jm@example.org',plan:{full:false,status:'none',trialUsed:false}}}))};
  const A={popups:0, out:0, sent:null, linkIn:null, inits:[]};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(HTML,{runScripts:'dangerously',url:o.url||'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(w.HTMLDialogElement){ w.HTMLDialogElement.prototype.showModal=function(){ this.setAttribute('open',''); };
        w.HTMLDialogElement.prototype.close=function(){ this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); }; }
      if(o.reg!==false) w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      for(const [k,v] of Object.entries(o.store||{})) w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
      w.__fetched=[];
      w.fetch=async(u,f)=>{ u=String(u); w.__fetched.push(u);
        if(/\/\.netlify\/functions\/account$/.test(u)){
          if(o.down) return new Promise(()=>{});
          if(!f||!f.method||f.method==='GET'){ if(o.info404) return {ok:false,status:404,json:async()=>null}; return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(S.info))}; }
          const b=JSON.parse(f.body); S.calls.push(b);
          const r=b.op==='plan'?(()=>{ const p=S.plan(b); return p&&p.status>=400?p:{status:200,json:{ok:true,email:S.email,plan:p}}; })()
            :b.op==='checkout'?S.checkout(b):b.op==='portal'?S.portal(b):b.op==='session'?S.session(b):{status:400,json:{ok:false,code:'bad-op'}};
          return {ok:r.status<300,status:r.status,json:async()=>r.json}; }
        if(/functions\/census\?check=1/.test(u)) return {ok:true,status:200,json:async()=>({required:false,ok:true,name:''})};   // the registration check answers
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); };
      if(!o.noFirebase){
        const AUTH={
          signInWithPopup:async()=>{ A.popups++; if(o.popupErr) throw Object.assign(new Error('x'),{code:o.popupErr}); return {user:{getIdToken:async()=>'ID.TOKEN.GOOGLE'}}; },
          signInWithRedirect:async()=>{ A.redirect=(A.redirect||0)+1; },
          getRedirectResult:async()=>null,
          signOut:async()=>{ A.out++; },
          sendSignInLinkToEmail:async(email,acs)=>{ A.sent={email,acs}; },
          isSignInWithEmailLink:h=>/oobCode=/.test(String(h)),
          signInWithEmailLink:async(email,h)=>{ A.linkIn={email,h}; return {user:{getIdToken:async()=>'ID.TOKEN.LINK'}}; }};
        const auth=function(){ return AUTH; };
        auth.GoogleAuthProvider=function(){ this.setCustomParameters=()=>{}; };
        w.firebase={apps:[], auth, initializeApp(cfg,name){ A.inits.push({cfg,name}); const app={name,auth:()=>AUTH}; this.apps.push(app); return app; }};
      } }});
  const w=dom.window;
  w.__went=[];
  return {w,S,A,errs,E:s=>w.eval(s),q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
const ready=async P=>{ await until(()=>P.E('typeof acctBoot==="function"&&ACCT.booted')); await sleep(250); P.E('acctGo=u=>{ window.__went.push(u); }'); };
const sheet=P=>P.q('#acct-sheet[open]')?P.txt('#acct-sheet'):'';
const click=async(P,s)=>{ const b=P.q(s); if(!b) throw new Error('no '+s); b.click(); await sleep(80); };
const ON={store:{'terrain-billing-test':'1'}};

(async()=>{ await T.sec(async()=>{
  console.log('\n-- payments off (the live site today): everyone has the full version, nothing new to see --');
  { const P=pg(); await ready(P);
    c('the version stamps agree', P.E('VERSION'), (HTML.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
    c('no boot errors', P.errs, []);
    c('the page asked account.mjs once (GET)', P.E('window.__fetched.filter(u=>/functions\\/account$/.test(u)).length'), 1);
    c('the tier is full', P.E('currentTier()'), 'full');
    c('no Account button', !!P.q('#acctbtn'), false);
    c('no "Full version" tag on the hub', P.qa('.tool .tlock').length, 0);
    P.E('openTool("case")');
    c('Make the Case opens, no lock', !P.q('#locked')||P.q('#locked').hidden);
    c('Firebase is not loaded', P.qa('script[src*="gstatic.com/firebasejs"]').length, 0);
    c('the answer is kept on the device', P.E("JSON.parse(localStorage.getItem('terrain-acct-info')).billing"), 'off'); }
  { const P=pg({info404:true}); await ready(P);
    c('account.mjs missing (404): full, no Account button', [P.E('currentTier()'), !!P.q('#acctbtn')], ['full',false]); }
  { const P=pg({info:INFO({mode:'test'})}); await ready(P);
    c('a test key without ?billing=test on this device: still full', P.E('currentTier()'), 'full'); }

  console.log('\n-- ?billing=test: this device tries the paid version against Stripe\'s test mode --');
  { const P=pg({url:'https://pastorshub.org/?billing=test'}); await ready(P);
    c('the device remembers it', P.E("localStorage.getItem('terrain-billing-test')"), '1');
    c('the address is cleaned', P.E('location.search'), '');
    c('the tier is free (no plan)', P.E('currentTier()'), 'free');
    c('the survey stays free', P.E("entitled('survey')"));
    c('the paid tools are tagged on the hub', P.qa('.tool .tlock').length>=4);
    c('the header has an Account button', P.txt('#whoami #acctbtn'), 'Account');
    P.E('openTool("case")');
    c('Make the Case shows the lock', !!P.q('#locked:not([hidden]) .lock'));
    c('…with one button: the 14-day free trial', P.qa('#locked .lock button').map(b=>b.textContent), ['Start your 14-day free trial']);
    await click(P,'#locked [data-acct-trial]');
    c('signed out, the trial opens sign-in first', /Sign in first, so your plan stays with you/.test(sheet(P)));
    c('…Google, or an emailed link', [!!P.q('#acct-sheet [data-acct-google]'), !!P.q('#acct-sheet [data-acct-mailform]')], [true,true]);
    c('…the registration\'s email filled in', P.E("document.getElementById('acct-mail').value"), REG.email);
    c('…"No password"; the church\'s information stays on the device', /No password\. Your church’s information stays on this device\./.test(sheet(P)));
    await sleep(50);
    c('Firebase is started for the sign-in, on terrain-live, as its own app', P.A.inits.map(i=>[i.name,i.cfg.projectId,i.cfg.authDomain]), [['terrain-acct','terrain-live','terrain-live.firebaseapp.com']]);

    await click(P,'#acct-sheet [data-acct-google]'); await until(()=>/Best for a church budget/.test(sheet(P)));
    const ses=P.S.calls.find(b=>b.op==='session');
    c('Google\'s token goes to account.mjs, nothing else', ses&&Object.keys(ses).sort(), ['idToken','op']);
    c('…the token itself', ses&&ses.idToken, 'ID.TOKEN.GOOGLE');
    c('Firebase is signed out at once (Terrain keeps its own session)', P.A.out, 1);
    c('the session is kept on the device', P.E("localStorage.getItem('terrain-session')"), SESS);
    const plans=sheet(P);
    c('the plans: yearly first, "best for a church budget"', P.qa('#acct-sheet .acct-plan').map(p=>p.querySelector('b').textContent), ['Yearly','Monthly']);
    c('…$150 a year · 2 months free', /\$150 a year · 2 months free/.test(plans));
    c('…$15 a month', /\$15 a month/.test(plans));
    c('…14 days free, nothing charged if cancelled before', /14 days free, then the plan you choose\. Cancel before the trial ends and nothing is charged\./.test(plans));
    c('…test mode says the card to use', /Test mode: card 4242 4242 4242 4242/.test(plans));
    c('…Stripe takes the card, Terrain never sees it', /Stripe takes the card on its own page\. Terrain never sees it\./.test(plans));
    c('…each button "Start free trial"', P.qa('#acct-sheet [data-acct-buy]').map(b=>[b.dataset.acctBuy,b.textContent]), [['year','Start free trial'],['month','Start free trial']]);

    await click(P,'#acct-sheet [data-acct-buy="year"]'); await until(()=>P.E('window.__went.length'));
    const chk=P.S.calls.find(b=>b.op==='checkout');
    c('the yearly plan asks account.mjs for Checkout, with the session', chk&&[chk.interval,chk.session], ['year',SESS]);
    c('…and goes to Stripe\'s page', P.E('window.__went'), ['https://checkout.stripe.com/c/pay/cs_test_1']);
    c('…the buttons wait meanwhile', P.qa('#acct-sheet [data-acct-buy]').every(b=>b.disabled)); }

  console.log('\n-- Checkout refused, or an address that is not Stripe\'s --');
  { const P=pg({...ON, store:{...ON.store,'terrain-session':SESS}, checkout:()=>({status:200,json:{ok:true,url:'https://evil.example.org/pay'}})}); await ready(P);
    P.E("acctShow('plans')"); await click(P,'#acct-sheet [data-acct-buy="month"]'); await sleep(100);
    c('a page that is not checkout.stripe.com is never opened', P.E('window.__went'), []);
    c('…a sentence instead', /That did not work just now/.test(sheet(P)));
    c('…the buttons work again', P.qa('#acct-sheet [data-acct-buy]').some(b=>!b.disabled)); }
  { let n=0; const P=pg({...ON, store:{...ON.store,'terrain-session':SESS}, checkout:()=>({status:409,json:{ok:false,code:'already'}}),
      plan:()=>(++n>1?{full:true,status:'trialing',interval:'year',trialEnd:NOW+13*DAY,end:NOW+13*DAY,trialUsed:true,billing:true}:{full:false,status:'none'})}); await ready(P);
    P.E("acctShow('plans')"); await click(P,'#acct-sheet [data-acct-buy="year"]'); await until(()=>/Account/.test(sheet(P)));
    c('a plan already running ("already"): the account, with its trial', /Free trial until .*, then the yearly plan\./.test(sheet(P))); }
  { const P=pg({...ON, store:{...ON.store,'terrain-session':SESS}, checkout:()=>({status:401,json:{ok:false,code:'bad-session'}})}); await ready(P);
    P.E("acctShow('plans')"); await click(P,'#acct-sheet [data-acct-buy="year"]'); await sleep(100);
    c('a session that ran out: forgotten, sign in again', [P.E("localStorage.getItem('terrain-session')"), /Please sign in again\./.test(sheet(P)), !!P.q('#acct-sheet [data-acct-google]')], [null,true,true]); }

  console.log('\n-- back from Stripe (?plan=done): the plan is asked for until it arrives --');
  { let n=0; const P=pg({url:'https://pastorshub.org/?plan=done', ...ON, store:{...ON.store,'terrain-session':SESS},
      plan:()=>(++n>=3?{full:true,status:'trialing',interval:'year',trialEnd:NOW+14*DAY,end:NOW+14*DAY,trialUsed:true,billing:true}:{full:false,status:'none'})});
    await until(()=>P.E('typeof ACCT==="object"&&ACCT.view==="wait"'),6000);
    c('"Confirming your plan…" while Stripe tells Terrain', /Confirming your plan…/.test(sheet(P)));
    c('the address is cleaned', P.E('location.search'), '');
    await until(()=>/Welcome to the full version/.test(sheet(P)),8000);
    c('then "Welcome to the full version"', /Welcome to the full version/.test(sheet(P)));
    c('…with the trial\'s last day and how to cancel', /Your free trial runs until .*\. You can cancel anytime under Account, Manage billing\./.test(sheet(P)));
    c('the tier is full now', P.E('currentTier()'), 'full');
    c('…the hub\'s "Full version" tags are gone', P.qa('.tool .tlock').length, 0);
    P.E('openTool("planner")');
    c('…a paid tool opens', !P.q('#locked')||P.q('#locked').hidden);
    await click(P,'#acct-sheet .acct-acts [data-acct-x]');
    c('"Start" closes it', !!P.q('#acct-sheet[open]'), false); }
  { const P=pg({...ON, store:{...ON.store,'terrain-session':SESS}}); await ready(P);
    P.E('ACCT_POLL.ms=15; ACCT_POLL.n=3; acctAwaitPlan()'); await until(()=>/Almost there/.test(sheet(P)),3000);
    c('no plan after the tries: "Almost there", and Check again', [/Your plan is not confirmed yet\. Stripe can take a minute\./.test(sheet(P)), !!P.q('#acct-sheet [data-acct-check]')], [true,true]);
    c('…asked once per try (and once on load)', P.S.calls.filter(b=>b.op==='plan').length, 4); }

  console.log('\n-- the Account sheet --');
  const acct=async(plan,extra)=>{ const P=pg({...ON, store:{...ON.store,'terrain-session':SESS,...(extra||{})}, plan:()=>plan}); await ready(P);
    await click(P,'#acctbtn'); await sleep(120); return P; };
  { const P=await acct({full:true,status:'active',interval:'year',end:Date.UTC(2027,9,6,16),cancelAtEnd:false,trialUsed:true,billing:true});
    c('the email and the plan', [/jm@example\.org/.test(sheet(P)), /Yearly plan · renews Oct 6, 2027/.test(sheet(P))], [true,true]);
    c('…Manage billing and Sign out (no trial button on a full plan)', P.qa('#acct-sheet .acct-acts button').map(b=>b.textContent), ['Manage billing','Sign out']);
    c('…test payments said, with Stop testing', /Test payments on this device\.Stop testing/.test(sheet(P)));
    await click(P,'#acct-sheet [data-acct-portal]'); await until(()=>P.E('window.__went.length'));
    c('Manage billing: Stripe\'s Customer Portal', [P.S.calls.some(b=>b.op==='portal'&&b.session===SESS), P.E('window.__went')], [true,['https://billing.stripe.com/p/session/test_1']]); }
  { const P=await acct({full:true,status:'active',interval:'month',end:Date.UTC(2026,10,6,16),cancelAtEnd:true,trialUsed:true,billing:true});
    c('cancelled at the period\'s end: "ends"', /Monthly plan · ends Nov 6, 2026/.test(sheet(P))); }
  { const P=await acct({full:true,status:'past_due',interval:'year',trialUsed:true,billing:true});
    c('past due: still full, the card needs attention', [P.E('currentTier()'), /Payment needs attention: update the card in Manage billing\./.test(sheet(P))], ['full',true]); }
  { const P=await acct({full:true,status:'comp',trialUsed:false});
    c('a given address (TERRAIN_COMP_EMAILS): complimentary, no billing button', [/Full version · complimentary/.test(sheet(P)), !!P.q('#acct-sheet [data-acct-portal]')], [true,false]); }
  { const P=await acct({full:false,status:'canceled',interval:'year',trialUsed:true,billing:true});
    c('cancelled: the free version; "Choose a plan" (no second trial)', [/Free version/.test(sheet(P)), P.qa('#acct-sheet .acct-acts button').map(b=>b.textContent)], [true,['Manage billing','Choose a plan','Sign out']]);
    c('…the lock says "Choose a plan" too', (P.E('openTool("case")'), P.qa('#locked .lock button').map(b=>b.textContent)), ['Choose a plan']);
    await click(P,'#acctbtn'); await click(P,'#acct-sheet [data-acct-plans]');
    c('…and its plans say "Choose", with no trial line', [P.qa('#acct-sheet [data-acct-buy]').map(b=>b.textContent), /days free/.test(sheet(P)), /Cancel anytime in Manage billing\./.test(sheet(P))], [['Choose','Choose'],false,true]);
    await click(P,'#acctbtn'); await click(P,'#acct-sheet [data-acct-out]');
    c('Sign out: the session goes, the sheet closes, the Account button stays (payments on here)', [P.E("localStorage.getItem('terrain-session')"), !!P.q('#acct-sheet[open]'), !!P.q('#acctbtn')], [null,false,true]); }
  { const P=await acct({full:true,status:'active',interval:'year',end:NOW+300*DAY,trialUsed:true,billing:true});
    c('signed in with a plan, on the hub: no tags', (P.E('showHub()'), P.qa('.tool .tlock').length), 0);
    await click(P,'#acct-sheet [data-acct-out]');
    c('signed out: the hub is tagged again, at once', P.qa('.tool .tlock').length>=4); }
  { const P=await acct({full:true,status:'active',interval:'year',end:NOW+300*DAY,trialUsed:true,billing:true});
    await click(P,'#acct-sheet [data-acct-endtest]');
    c('Stop testing: the flag goes, everyone full again (payments off)', [P.E("localStorage.getItem('terrain-billing-test')"), P.E('currentTier()')], [null,'full']); }
  { const P=pg({...ON, store:{...ON.store,'terrain-session':SESS}, plan:()=>({status:401,json:{ok:false,code:'bad-session'}})}); await ready(P);
    c('a session the server no longer knows is forgotten on load', P.E("localStorage.getItem('terrain-session')"), null); }

  console.log('\n-- an emailed link --');
  { const P=pg(ON); await ready(P);
    await click(P,'#acctbtn');
    c('the Account button, signed out: sign-in ("to see your plan")', /Sign in to see your plan\./.test(sheet(P)));
    P.E("document.getElementById('acct-mail').value='not-an-email'"); P.q('#acct-sheet [data-acct-mailform]').dispatchEvent(new P.w.Event('submit',{cancelable:true,bubbles:true})); await sleep(80);
    c('a wrong address: "Check the email address.", nothing sent', [/Check the email address\./.test(sheet(P)), P.A.sent], [true,null]);
    P.E("document.getElementById('acct-mail').value='pastor@church.org'"); P.q('#acct-sheet [data-acct-mailform]').dispatchEvent(new P.w.Event('submit',{cancelable:true,bubbles:true})); await sleep(120);
    c('the link is sent by Firebase, back to this site', P.A.sent, {email:'pastor@church.org',acs:{url:'https://pastorshub.org/?signin=link',handleCodeInApp:true}});
    c('…the address kept for when it is opened', P.E("localStorage.getItem('terrain-signin-email')"), 'pastor@church.org');
    c('…"We sent a sign-in link to …"', /We sent a sign-in link to pastor@church\.org\. Open it on this device\./.test(sheet(P))); }
  { const P=pg({url:'https://pastorshub.org/?signin=link&apiKey=AIzaX&oobCode=CODE123&mode=signIn&lang=en&tier=free', ...ON, store:{...ON.store,'terrain-signin-email':'pastor@church.org'}});
    await until(()=>P.E('typeof ACCT==="object"&&!!localStorage.getItem("terrain-session")'),6000); await sleep(150);
    c('opened: signed in with the kept address and the link', P.A.linkIn&&[P.A.linkIn.email,/oobCode=CODE123/.test(P.A.linkIn.h)], ['pastor@church.org',true]);
    c('…the token goes to account.mjs', P.S.calls.find(b=>b.op==='session').idToken, 'ID.TOKEN.LINK');
    c('…the kept address is cleared', P.E("localStorage.getItem('terrain-signin-email')"), null);
    c('…Firebase\'s parts leave the address (others stay)', P.E('location.search'), '?tier=free');
    c('…then the plans', /Best for a church budget/.test(sheet(P))); }
  { const P=pg({url:'https://pastorshub.org/?signin=link&oobCode=CODE9&mode=signIn', ...ON});
    await until(()=>P.E('typeof ACCT==="object"&&ACCT.view==="confirm"'),6000);
    c('opened on another device: asks which address', /Type the email the link was sent to\./.test(sheet(P)));
    P.E("document.getElementById('acct-mail2').value='other@church.org'"); P.q('#acct-sheet [data-acct-confirmform]').dispatchEvent(new P.w.Event('submit',{cancelable:true,bubbles:true}));
    await until(()=>P.E('!!localStorage.getItem("terrain-session")'),3000);
    c('…then signs in with it', P.A.linkIn&&P.A.linkIn.email, 'other@church.org'); }

  console.log('\n-- a popup the browser blocks; sign-in refused --');
  { const P=pg({...ON, popupErr:'auth/popup-blocked'}); await ready(P);
    await click(P,'#acctbtn'); await sleep(40); await click(P,'#acct-sheet [data-acct-google]'); await sleep(80);
    c('blocked: Google\'s page in this tab instead (and remembered for the return)', [P.A.redirect, P.E("localStorage.getItem('terrain-signin-redirect')")], [1,'1']); }
  { const P=pg({...ON, popupErr:'auth/popup-closed-by-user'}); await ready(P);
    await click(P,'#acctbtn'); await sleep(40); await click(P,'#acct-sheet [data-acct-google]'); await sleep(80);
    c('closed by the pastor: nothing said, the buttons work', [P.q('#acct-sheet .acct-err'), P.q('#acct-sheet [data-acct-google]').disabled], [null,false]); }
  { const P=pg({...ON, session:()=>({status:429,json:{ok:false,code:'limit'}})}); await ready(P);
    await click(P,'#acctbtn'); await sleep(40); await click(P,'#acct-sheet [data-acct-google]'); await sleep(120);
    c('too many sign-ins: said plainly, no session kept', [/Too many tries\. Wait a few minutes and try again\./.test(sheet(P)), P.E("localStorage.getItem('terrain-session')")], [true,null]); }
  { const P=pg({...ON, info:INFO({fb:null})}); await ready(P);
    await click(P,'#acctbtn');
    c('sign-in not set up (no Firebase settings): one sentence, no buttons', [/Sign-in is not set up yet\./.test(sheet(P)), !!P.q('#acct-sheet [data-acct-google]')], [true,false]); }

  console.log('\n-- Firebase is loaded only for a sign-in, pinned --');
  { const P=pg({...ON, noFirebase:true}); await ready(P);
    c('not on load', P.qa('script[src*="gstatic.com/firebasejs"]').length, 0);
    await click(P,'#acctbtn'); await sleep(60);
    const s=P.qa('script[src*="gstatic.com/firebasejs"]');
    c('opening sign-in loads the app script (then the sign-in one), version 10.12.2', s.map(x=>x.getAttribute('src')), ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js']);
    c('…with its SRI hash, anonymous, no referrer', s.map(x=>[x.getAttribute('integrity'),x.getAttribute('crossorigin'),x.getAttribute('referrerpolicy')]),
      [['sha384-AQ3POAMqIhwS81FrUH95ekxqBZHeP5tG2JfEL3+7GuTtfRLWnrRh32UxwzM+//A9','anonymous','no-referrer']]); }
  { const P=pg({url:'https://pastorshub.org/#watch', ...ON, store:{...ON.store,'terrain-acct-info':INFO({billing:'on'})}}); await sleep(900);
    c('a member\'s page: always full, account.mjs never asked, no Account button',
      [P.E('currentTier()'), P.E('window.__fetched.filter(u=>/functions\\/account/.test(u)).length'), !!P.q('#acctbtn')], ['full',0,false]); }

  console.log('\n-- the plan known last is kept: the page knows at once, even offline --');
  { const P=pg({...ON, down:true, store:{...ON.store,'terrain-acct-info':INFO()}}); await until(()=>P.E('typeof ACCT==="object"')); await sleep(300);
    c('account.mjs silent: the kept answer counts (test mode on this device: free)', P.E('currentTier()'), 'free'); }
  { const P=pg({down:true, store:{'terrain-acct-info':INFO({billing:'on'}),'terrain-session':SESS,'terrain-plan':{email:'jm@example.org',plan:{full:true,status:'active',interval:'year'},at:NOW}}}); await until(()=>P.E('typeof ACCT==="object"')); await sleep(300);
    c('payments on, a kept full plan: full', P.E('currentTier()'), 'full'); }
  { const P=pg({info:INFO({billing:'on'}), store:{'terrain-acct-info':INFO({billing:'on'}),'terrain-session':'s1.forged','terrain-plan':{email:'x@y.org',plan:{full:true,status:'active'}}}, plan:()=>({full:true,status:'active'})}); await ready(P);
    c('a kept plan without a well-formed session counts for nothing', P.E('currentTier()'), 'free'); }

  console.log('\n-- Spanish --');
  { const P=pg({lang:'es', ...ON, store:{...ON.store,'terrain-session':SESS}}); await ready(P);
    c('the Account button', P.txt('#acctbtn'), 'Cuenta');
    P.E('openTool("case")');
    c('the lock\'s button', P.qa('#locked .lock button').map(b=>b.textContent), ['Empiece su prueba gratis de 14 días']);
    P.E("acctShow('plans')");
    const t=sheet(P);
    c('the plans', [/Lo mejor para el presupuesto de la iglesia/.test(t), /\$150 al año · 2 meses gratis/.test(t), /\$15 al mes/.test(t), /14 días gratis/.test(t), /Modo de prueba: tarjeta 4242/.test(t)], [true,true,true,true,true]);
    c('no "AI" / "IA" in the sheet', /\b(AI|IA)\b/.test(t), false); }
  { const P=pg(ON); await ready(P);
    const words=['signin','plans','account','wait','slow','welcome','confirm'].map(v=>{ P.E(`acctShow('${v}')`); return sheet(P); }).join(' ');
    c('no "AI" in any English sheet', /\b(AI|IA)\b/.test(words), false); }
}); T.done(); })();
