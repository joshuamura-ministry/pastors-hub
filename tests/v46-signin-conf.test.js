// v10.46.0 — the conference a pastor chose now bounds the churches Terrain maps. The pastor (5 Oct 2026): "if you press Pennsylvania
// and your pastor there shouldn't you have to click a California or another conference in order to check those areas … what's the use
// of clicking Pennsylvania when you can still put any Church in". (Signing in is tested in registration.test.js and
// register-function.test.mjs.) Written failing-first against v10.45.1.
const fs=require('fs'), path=require('path');
const {ROOT,sleep,until,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const REGDIR=path.join(ROOT,'tools','conferences','src','registry');
const geo=(fips)=>({tract:{NAME:'Census Tract 1',STATE:fips,COUNTY:'001',TRACT:'000100'},county:{NAME:'Some County',STATE:fips,COUNTY:'001'},cousub:null,place:null,matched:'1 Main St'});

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the table is the registry\'s --');
  const reg={}; for(const f of fs.readdirSync(REGDIR).sort()) for(const x of JSON.parse(fs.readFileSync(path.join(REGDIR,f),'utf8'))) reg[x.conf]=x.states;
  const P=page(); await ready(P);
  c('CONF_STATES is the registry\'s "states", conference by conference', JSON.stringify(P.J('CONF_STATES')), JSON.stringify(reg));
  c('every US conference on the first page has its states (Bermuda and Canada are not checked)', P.J(`UNIONS.filter(u=>u.states.length).flatMap(u=>u.confs).filter(c=>c!=='Bermuda'&&!(CONF_STATES[c]||[]).length)`), []);
  c('…and every state a conference names is a state the app knows', P.J(`Object.entries(CONF_STATES).filter(([c])=>c!=='Guam-Micronesia Mission').flatMap(([,s])=>s).filter(a=>!STATE_NAMES[a])`), []);

  console.log('\n-- a church outside the conference is not mapped --');
  // the page's own Census calls are stubbed: a count of them, then a stop
  P.E(`window.__acs=0; fetchACS=async()=>{ window.__acs++; throw new Error('stop here'); }; fetchOrigins=async()=>null;`);
  c('signed in under Pennsylvania', P.E('myConf()'), 'Pennsylvania');
  P.E(`openTool('survey'); DATA=null;`);
  let ok=await P.w.eval(`run(()=>Promise.resolve(${JSON.stringify(geo('06'))}))`);
  c('a California address: refused before any Census call, and said why', [ok,P.E('window.__acs'),P.txt('#status')],
    [false,0,'This church is in California, outside the Pennsylvania Conference. Terrain looks at churches in your own conference: Pennsylvania. Wrong conference? Tap Change at the top.']);
  c('…nothing mapped', P.E('DATA'), null);
  ok=await P.w.eval(`run(()=>Promise.resolve(${JSON.stringify(geo('42'))}))`);
  c('a Pennsylvania address goes on to the Census', [ok,P.E('window.__acs')>0], [false,true]);
  P.E(`window.__acs=0`);
  ok=await P.w.eval(`run(()=>Promise.resolve(${JSON.stringify(geo('06'))}),{quiet:true})`);
  c('a quiet reload of a church already saved is left alone (no refusal, the Census is called)', P.E('window.__acs')>0, true);

  console.log('\n-- several states, regional conferences, no list --');
  P.w.localStorage.setItem('terrain-reg',JSON.stringify({name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Allegheny West',role:'pastor'}));
  P.E(`window.__acs=0`);
  await P.w.eval(`run(()=>Promise.resolve(${JSON.stringify(geo('42'))}))`);
  c('Allegheny West reaches into Pennsylvania: mapped', P.E('window.__acs')>0, true);
  P.E(`window.__acs=0`);
  await P.w.eval(`run(()=>Promise.resolve(${JSON.stringify(geo('36'))}))`);
  c('…but not New York: the message names its four states', [P.E('window.__acs'),/your own conference: Ohio, West Virginia, Virginia or Pennsylvania\./.test(P.txt('#status'))], [0,true]);
  P.w.localStorage.setItem('terrain-reg',JSON.stringify({name:'Joshua Mura',email:'jm@example.org',church:'Hamilton SDA',conf:'Bermuda',role:'pastor'}));
  P.E(`window.__acs=0`);
  await P.w.eval(`run(()=>Promise.resolve(${JSON.stringify(geo('06'))}))`);
  c('a conference with no list (Bermuda) is not checked', P.E('window.__acs')>0, true);

  console.log('\n-- Spanish --');
  const S=page({lang:'es'}); await ready(S);
  S.E(`window.__acs=0; fetchACS=async()=>{ window.__acs++; throw new Error('stop here'); }; fetchOrigins=async()=>null; openTool('survey'); DATA=null;`);
  await S.w.eval(`run(()=>Promise.resolve(${JSON.stringify(geo('06'))}))`);
  c('the refusal in Spanish', S.txt('#status'), 'Esta iglesia está en California, fuera de la Asociación de Pennsylvania. Terrain analiza iglesias de su propia asociación: Pennsylvania. ¿No es su asociación? Toque Cambiar arriba.');
  c('no page error along the way', [P.errs,S.errs], [[],[]]);
}); T.done(); })();
