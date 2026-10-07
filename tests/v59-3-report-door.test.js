// v10.59.3 — a way out of a member's Spiritual Gifts page. The pastor (8 Oct 2026), on his own report opened from the share link on
// his own device: "I noticed there's no way out of your spiritual gifts report … no way to get out of it. It's just stuck there."
// On a member's link the header hides every way into the app on purpose (a member is not a pastor). Now there is one door:
// - on a device that holds the pastor's own registration (he is trying the link himself): "← Back to Terrain", in the header and at the
//   end of the report, which drops the link and opens the app;
// - on a member's phone: "Done", once the report is drawn, in the header and at the end of the report: a short thank-you page that keeps
//   "See my report again" (the report stays on the phone; the link opens it again). Nothing sends, saves or deletes.
// Never on the pastor's own pages inside the app, never on the sample report, never on a confirmer's link.
// Written failing-first on v10.59.2.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor',synced:true,tok:TOK};
/* o.url; o.reg (the pastor's own device); o.lang */
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:o.url||'https://terrain.church/#gifts',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      w.__left=0; w.__gfLeave=()=>{ w.__left++; };
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(o.reg) w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async u=>{ u=String(u);
        if(/functions\/census\?check=1/.test(u)) return {ok:true,status:200,json:async()=>({required:false,ok:true,register:true,regRequired:true,regOk:true})};
        if(/functions\/gifts/.test(u)) return {ok:true,status:200,json:async()=>({ok:true,fn:'gifts-1.3',email:false})};
        if(/functions\/register/.test(u)) return {ok:false,status:503,json:async()=>({ok:false})};
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
async function ready(P){ await until(()=>P.E('ACCESS_CHECKED')&&P.q('#giftbody')&&P.q('#giftbody').textContent.length>40); await sleep(40); }
/* a finished result on the phone: the sample report's own answers */
function finish(P,name){ P.E(`(()=>{ GFS.a=JSON.parse(JSON.stringify(GF_SAMPLE.answers)); GFS.h=JSON.parse(JSON.stringify(GF_SAMPLE.heart||{})); GFS.name=${JSON.stringify(name)}; GFS.minor=false; GFS.done=true; gfSave(); gfRender(); })()`); }
const navHidden=P=>{ const bl=P.q('#brandlink'); const nv=bl.closest('nav')||bl; return !!nv.hidden; };

(async()=>{ try{
  console.log('\n-- a member\'s phone: Done, once the report is there --');
  { const P=page(); await ready(P);
    c('the first page: no door yet (nothing to leave), the app\'s own ways still hidden', [!!P.q('#gfdoor'), navHidden(P), P.q('#hub').hidden], [false,true,true]);
    finish(P,'Test Member'); await sleep(60);
    c('the report: Done in the header, where the pastor\'s main-menu button sits', [P.txt('#gfdoor'), P.q('#gfdoor').hidden, P.q('#gfdoor').parentElement===P.q('header.top .in')], ['Done',false,true]);
    c('…and Done at the end of the report, beside Download PDF; no "Back to Terrain" (this is not the pastor\'s device)', [P.txt('#gfactions #gfdone'), !!P.q('#gfactions #gfpdf'), !!P.q('#gfback')], ['Done',true,false]);
    c('…the app\'s own ways still hidden', [navHidden(P), P.q('#hub').hidden], [true,true]);
    P.q('#gfactions #gfdone').click(); await sleep(40);
    c('Done: a short thank-you page, by name', [P.txt('#giftbody h2'), /Your report stays on this phone: open this link again whenever you want to read it\./.test(P.txt('#giftbody'))], ['Thank you, Test.',true]);
    c('…not "gone to your pastor" (this result was never sent)', /gone to your pastor/.test(P.txt('#giftbody')), false);
    c('…the header\'s Done hidden there (nothing more to close); nothing sent, saved or deleted', [P.q('#gfdoor').hidden, P.E('GFS.done&&!GFS.sent&&Object.keys(GFS.a).length>100')], [true,true]);
    P.q('#gfdoneback').click(); await sleep(40);
    c('"See my report again" brings the report back, with its Done', [/Your spiritual gifts|Your gifts/.test(P.txt('#giftbody')), !!P.q('#gfactions #gfdone'), P.q('#gfdoor').hidden], [true,true,false]);
    P.E('GFS.sent=true; gfSave();'); P.q('#gfdoor').click(); await sleep(40);
    c('the header\'s Done does the same; a sent result says it has gone to the pastor', [P.txt('#giftbody h2'), /Your result has gone to your pastor\./.test(P.txt('#giftbody'))], ['Thank you, Test.',true]);
    c('…never a way into the app', [P.E('__left'), P.q('#hub').hidden, navHidden(P)], [0,true,true]);
    c('no page errors', P.errs, []);
  }
  console.log('\n-- the pastor\'s own device: Back to Terrain --');
  { const P=page({reg:true}); await ready(P);
    c('the first page already has the door: "← Back to Terrain" (he can leave at any point)', [P.txt('#gfdoor'), navHidden(P)], ['← Back to Terrain',true]);
    finish(P,'Joshua Mura'); await sleep(60);
    c('the report: "← Back to Terrain" at its end, no Done', [P.txt('#gfactions #gfback'), !!P.q('#gfdone'), P.txt('#gfdoor')], ['← Back to Terrain',false,'← Back to Terrain']);
    P.q('#gfactions #gfback').click(); await sleep(20);
    c('…it drops the link and opens the app afresh (the page reloads with no link)', [P.E('location.hash'), P.E('__left')], ['',1]);
    P.q('#gfdoor').click(); await sleep(20);
    c('…the header\'s does the same', P.E('__left'), 2);
    c('no page errors', P.errs, []);
  }
  console.log('\n-- in Spanish --');
  { const S=page({lang:'es'}); await ready(S); finish(S,'Ana María López'); await sleep(60);
    c('Listo, in the header and at the end', [S.txt('#gfdoor'), S.txt('#gfactions #gfdone')], ['Listo','Listo']);
    S.q('#gfdoor').click(); await sleep(40);
    c('the thank-you page in Spanish', [S.txt('#giftbody h2'), /Su informe queda en este tel/.test(S.txt('#giftbody')), S.txt('#gfdoneback')], ['Gracias, Ana.',true,'Ver mi informe otra vez']);
    const R=page({lang:'es',reg:true}); await ready(R);
    c('← Volver a Terrain', R.txt('#gfdoor'), '← Volver a Terrain');
  }
  console.log('\n-- never where it does not belong --');
  { const C=page({url:'https://terrain.church/#gifts-confirm=pubAAAAAAAAAAAA.ridAAAAAAAAAA.itokAAAAAAAA'}); await until(()=>C.E('ACCESS_CHECKED')); await sleep(300);
    c('a confirmer\'s link: no door', !!C.q('#gfdoor'), false);
    const P=page({url:'https://terrain.church/',reg:true}); await until(()=>P.E('ACCESS_CHECKED')&&P.E('typeof openTool==="function"')); await sleep(60);
    P.E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; uPersist(); gfDemoFill({quiet:true}); gfOpenLanding(); })()`); await sleep(80);
    c('the pastor\'s own Spiritual Gifts page inside the app: no door (the main menu is there)', [!!P.q('#gfdoor'), !!P.q('#brandlink')&&!navHidden(P)], [false,true]);
    P.q('#gf-results .gfrow2').click(); await sleep(80);
    c('a result opened from his list: its own Back and Delete, no Done, no Back to Terrain', [!!P.q('#gifts [data-gf-back]'), !!P.q('#gifts #gfpdel'), !!P.q('#gfdone'), !!P.q('#gfback'), !!P.q('#gfdoor')], [true,true,false,false,false]);
    P.E(`GF_VIEW='sample'; gfRender();`); await sleep(60);
    c('the sample report: no door', [!!P.q('#gfdone'), !!P.q('#gfback'), !!P.q('#gfdoor')], [false,false,false]);
    c('no page errors', [C.errs,P.errs], [[],[]]);
  }
}catch(e){ console.log('  FAIL  crashed: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0); })();
