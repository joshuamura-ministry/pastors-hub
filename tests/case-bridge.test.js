// Make the Case bridge (v10.39): CASE_BRIDGE joins every catalogue ministry to
// the Spiritual Gifts tables (GF_NEEDS ids, GF_MIN names) with a kind and a
// rhythm; caseBridgeOf() bridges AI drafts by their cited metric; CASE_RANK()
// orders the picker by need, feasibility and gifts.
//
// Part 1 evaluates the real blocks of index.html in a node vm (SIGNATURE,
// GF_NEEDS, GF_MIN, RULES, SPEC, U_WEEKLY, U_CAMPAIGN) so every string is
// held to the runtime one. Part 2 tests CASE_RANK as a pure function. Part 3
// loads the whole app in jsdom with the fixtures and ranks the real catalogue.
//
// Paths: the app is ../index.html (or ../proj/index.html while staged); the
// bridge is taken from index.html when it already contains CASE_BRIDGE, else
// from ./bridge.js (staging).
const vm=require('vm'), fs=require('fs'), path=require('path');
const first=(...ps)=>ps.find(p=>fs.existsSync(p));
const APP=first(path.resolve(__dirname,'..','index.html'),path.resolve(__dirname,'..','proj','index.html'));
const html=fs.readFileSync(APP,'utf8');
const BRIDGE_FILE=path.resolve(__dirname,'bridge.js');
const inApp=/\nconst CASE_BRIDGE=\{/.test(html);
const FXP=first(path.resolve(__dirname,'fixtures.json'),path.resolve(__dirname,'..','proj','tests','fixtures.json'),path.resolve(__dirname,'..','tests','fixtures.json'));
const FX=JSON.parse(fs.readFileSync(FXP,'utf8'));
const jsdomPath=first(path.resolve(__dirname,'..','node_modules','jsdom'),path.resolve(__dirname,'..','proj','node_modules','jsdom'))||'jsdom';

let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,400));fail++}else pass++};

// ---------------------------------------------------------------- the source
// A block is sliced from its declaration to its closing marker; a miss is fatal.
function slice(start,end){
  const i=html.indexOf(start); if(i<0) throw new Error('missing '+start);
  const j=html.indexOf(end,i); if(j<0) throw new Error('missing end of '+start);
  return html.slice(i,j+end.length);
}
const line=re=>{ const m=html.match(re); if(!m) throw new Error('missing '+re); return m[0]; };
const src=[
  line(/^const KIND=.*$/m), line(/^const EFFORT=.*$/m),
  'const MOVE_REQ={},MOVE_LOAD={},HOW={};',                // only fill defaults; not needed here
  slice('const SPEC=[','\n];'),
  slice('const SIGNATURE=[','SIGNATURE.push(...SMALL_GROUPS);'),
  slice('const RULES=[','\n];'),
  slice('const GF_MIN=[','\n];'),
  slice('const GF_YOUTH_MIN=[','\n];'),
  slice('const GF_NEEDS=(()=>{','\n})();'),
  line(/^const U_WEEKLY=.*$/m), line(/^const U_CAMPAIGN=.*$/m), line(/^const U_FAC_REQ=\{[\s\S]*?\n\};/m),
  inApp?slice('const CASE_KINDS=','\nfunction caseRankCtx(').replace(/\nfunction caseRankCtx\($/,'\n'):fs.readFileSync(BRIDGE_FILE,'utf8').replace(/\nif\(typeof module[\s\S]*$/,''),
  `;globalThis.__T={SPEC,SIGNATURE,RULES,GF_MIN,GF_YOUTH_MIN,GF_NEEDS,U_WEEKLY,U_CAMPAIGN,U_FAC_REQ,
    CASE_KINDS,CASE_BRIDGE,CASE_TAG_NEEDS,CASE_METRIC_NEEDS,CASE_NEED_MIN,CASE_KIND_MIN,CASE_NEED_CMP,
    CASE_W,caseBridgeOf,caseDraftKind,caseDraftOngoing,caseLift,caseReading,CASE_RANK,caseRankAll};`
].join('\n');
const ctxVM={console}; vm.createContext(ctxVM); vm.runInContext(src,ctxVM,{filename:'case-bridge-blocks.js'});
const T=ctxVM.__T;
const J=x=>JSON.parse(JSON.stringify(x));
const NEED_IDS=Object.keys(T.GF_NEEDS), MIN_NAMES=T.GF_MIN.map(m=>m.n), SIG=T.SIGNATURE, B=T.CASE_BRIDGE;
const byId={}; SIG.forEach(x=>byId[x.id]=x);

console.log('-- the runtime tables, as evaluated from index.html --');
c('SIGNATURE loaded (103 at v10.37: 97 + 6 small groups)', SIG.length>=103, true);
c('GF_NEEDS: 38 needs, the same ids as RULES', [NEED_IDS.length, J(T.RULES.map(r=>r.id)).sort().join()===J(NEED_IDS).sort().join()], [38,true]);
c('GF_MIN: 40 names', MIN_NAMES.length, 40);

console.log('-- full coverage --');
c('every catalogue id has an entry', SIG.filter(x=>!B[x.id]).map(x=>x.id), []);
c('no entry for an id the catalogue does not have', Object.keys(B).filter(id=>!byId[id]), []);
c('entries are exactly {needs,min,kind,ongoing}', Object.keys(B).filter(id=>Object.keys(B[id]).sort().join()!=='kind,min,needs,ongoing'), []);

console.log('-- exact names --');
c('every need is a GF_NEEDS id, exactly', Object.entries(B).flatMap(([id,b])=>b.needs.filter(n=>!NEED_IDS.includes(n)).map(n=>id+':'+n)), []);
c('every min is a GF_MIN name, exactly (curly apostrophes included)', Object.entries(B).flatMap(([id,b])=>b.min.filter(n=>!MIN_NAMES.includes(n)).map(n=>id+':'+n)), []);
c('1–4 needs, 1–3 min, no repeats', Object.entries(B).filter(([id,b])=>!(b.needs.length>=1&&b.needs.length<=4&&b.min.length>=1&&b.min.length<=3&&new Set(b.needs).size===b.needs.length&&new Set(b.min).size===b.min.length)).map(([id])=>id), []);
c('kind is one of the eight', Object.entries(B).filter(([id,b])=>!T.CASE_KINDS.includes(b.kind)).map(([id])=>id), []);
c('ongoing is a boolean', Object.entries(B).filter(([id,b])=>typeof b.ongoing!=='boolean').map(([id])=>id), []);
c('CASE_NEED_MIN covers all 38 needs with real GF_MIN names', [NEED_IDS.filter(n=>!T.CASE_NEED_MIN[n]), Object.values(T.CASE_NEED_MIN).flat().filter(n=>!MIN_NAMES.includes(n))], [[],[]]);
c('CASE_KIND_MIN covers every kind with real GF_MIN names', [T.CASE_KINDS.filter(k=>!T.CASE_KIND_MIN[k]), Object.values(T.CASE_KIND_MIN).flat().filter(n=>!MIN_NAMES.includes(n))], [[],[]]);
c('CASE_NEED_CMP covers all 38 needs', NEED_IDS.filter(n=>!T.CASE_NEED_CMP[n]), []);
c('CASE_METRIC_NEEDS: every SPEC key, and only SPEC keys', [T.SPEC.map(s=>s[0]).filter(k=>!T.CASE_METRIC_NEEDS[k]), Object.keys(T.CASE_METRIC_NEEDS).filter(k=>!T.SPEC.some(s=>s[0]===k))], [[],[]]);
c('CASE_METRIC_NEEDS names only GF_NEEDS ids', Object.values(T.CASE_METRIC_NEEDS).flat().filter(n=>!NEED_IDS.includes(n)), []);
const allTags=[...new Set(SIG.flatMap(x=>[...(x.need||[]),...(x.boost||[])]))];
c('CASE_TAG_NEEDS covers every tag the catalogue uses, with GF_NEEDS ids', [allTags.filter(t=>!(t in T.CASE_TAG_NEEDS)), Object.values(T.CASE_TAG_NEEDS).flat().filter(n=>!NEED_IDS.includes(n))], [[],[]]);

console.log('-- the bridge agrees with each ministry\'s own tags --');
const reach=x=>new Set([...(x.need||[]),...(x.boost||[])].flatMap(t=>T.CASE_TAG_NEEDS[t]||[]));
c('the lead need of every ministry rests on one of its own tags', SIG.filter(x=>!reach(x).has(B[x.id].needs[0])).map(x=>x.id), []);
// Needs added beyond the tags, on purpose. A new one must be added here with a reason.
const EXTRA={
  'welcome-table':['lang-primary'],'newcomer-circle':['lang-primary'],'esl-center':['lang-primary'],   // the community's own language
  'community-dinner':['snap','divided'],       // GF role for snap IS "host a monthly community meal"; divided: "a table where both halves meet"
  'kids-health':['schools'],'lot-sport':['schools'],                                                  // school-age children
  'walking-club':['seniors-alone'],'proph-news':['growth'],'welcome-newcomers':['growth'],
  'family-life-series':['newborn'],'parents-study':['newborn'],'sg-parents':['newborn'],             // young families
  'lot-market':['foodaccess'],                 // a produce market
  'money-course':['rent50','rent30'],          // rent burden is the debt letter
  'mens-breakfast':['veterans'],               // GF role: "host a monthly veterans' breakfast"
  'doorstep-prayer':['gini']                   // GF role: "prayer-walk the neighbourhood"
};
c('every other need rests on a tag, or is a listed deliberate extra', SIG.map(x=>[x.id,B[x.id].needs.filter(n=>!reach(x).has(n))]).filter(([id,un])=>un.length&&JSON.stringify(un)!==JSON.stringify(EXTRA[id]||[])), []);

console.log('-- sensible kinds: rules --');
const K=id=>B[id].kind;
c('a ministry needing a nurse (not an Invite follow-on) is health', SIG.filter(x=>(x.skill||[]).includes('medical')&&x.k!=='Invite'&&K(x.id)!=='health').map(x=>x.id), []);
c('a ministry that needs a nursery room is children', Object.keys(T.U_FAC_REQ).filter(id=>T.U_FAC_REQ[id].flat().includes('nursery')&&K(id)!=='children'), []);
c('children ⇒ answers kids or schools', Object.keys(B).filter(id=>K(id)==='children'&&!B[id].needs.some(n=>n==='kids'||n==='schools')), []);
c('health ⇒ staffed by Health ministry', Object.keys(B).filter(id=>K(id)==='health'&&!B[id].min.includes('Health ministry')), []);
c('transport ⇒ staffed by Transportation ministry', Object.keys(B).filter(id=>K(id)==='transport'&&!B[id].min.includes('Transportation ministry')), []);
c('money ⇒ answers unemployment or debt', Object.keys(B).filter(id=>K(id)==='money'&&!B[id].needs.some(n=>n==='unemp'||n==='debt')), []);
c('food ⇒ the name is about food', Object.keys(B).filter(id=>K(id)==='food'&&!/food|pantry|dinner|meal|garden|cooking|tea/i.test(byId[id].n)), []);
c('a campaign in uBase (U_CAMPAIGN) is never ongoing', [...T.U_CAMPAIGN].filter(id=>B[id].ongoing), []);
c('weekly in uBase (U_WEEKLY) is ongoing, except fixed-length courses', [...T.U_WEEKLY].filter(id=>!B[id].ongoing).sort(), ['chip','grief','mental-health','money-course']);
c('ongoing events are only the standing ones (monthly market, venue, quarterly)', Object.keys(B).filter(id=>K(id)==='events'&&B[id].ongoing).sort(), ['blood-drive','come-and-see','lot-market','sanctuary-music','toy-swap']);
c('every kind is used', T.CASE_KINDS.filter(k=>!Object.values(B).some(b=>b.kind===k)), []);

console.log('-- sensible kinds: twenty checked by hand --');
const HAND={
  'pathfinders':['children',true],'vbs':['children',false],'homework-club':['children',true],'sports-camp':['children',false],
  'food-pantry':['food',true],'community-dinner':['food',true],'cooking-school':['food',false],
  'bp-clinic':['health',true],'stop-smoking':['health',false],'kids-health':['health',false],
  'lift-rota':['transport',true],'car-care':['transport',false],'senior-day':['transport',true],
  'money-course':['money',false],'job-club':['money',true],
  'bereavement-visits':['visits',true],'interpreter-bank':['visits',true],'sg-inhome':['visits',true],
  'fall-festival':['events',false],'proph-news':['events',false],'backpack-giveaway':['events',false],
  'kids-books':['general',false]
};
Object.entries(HAND).forEach(([id,[k,o]])=>c(`${id}: ${k}, ${o?'ongoing':'one run'}`, [B[id].kind,B[id].ongoing], [k,o]));
console.log('-- and the staffing that must be there --');
c('pathfinders staffed by Pathfinders', B['pathfinders'].min[0], 'Pathfinders');
c('VBS staffed by Vacation Bible School', B['vbs'].min[0], 'Vacation Bible School');
c('food pantry answers SNAP first, staffed by community services', [B['food-pantry'].needs[0],B['food-pantry'].min[0]], ['snap','Community services and food distribution']);
c('interpreter bank answers limited English first', B['interpreter-bank'].needs[0], 'limeng');
c('men’s breakfast staffed by Men’s ministry (curly apostrophe)', B['mens-breakfast'].min[0], 'Men’s ministry');
c('story corner staffed by Children’s Sabbath School', B['story-corner'].min, ['Children’s Sabbath School']);
c('bereavement visits answer grief first', B['bereavement-visits'].needs[0], 'grief');
c('the free room and the step group lead with poverty, as their own evidence does', [B['free-venue'].needs[0],B['recovery-study'].needs[0]], ['poverty','poverty']);
c('blessing bags and the break-room study are for people in work: not unemployment', [B['blessing-bags'].needs.includes('unemp'),B['workplace-study'].needs.includes('unemp')], [false,false]);
c('a bench by the bus stop leads with households without a car', B['bench'].needs[0], 'nocar');

console.log('-- caseBridgeOf: built-ins and AI drafts --');
c('a built-in returns its entry, as a copy', (()=>{ const b=T.caseBridgeOf(byId['vbs']); b.needs.push('x'); return J(T.caseBridgeOf(byId['vbs'])); })(), J(B['vbs']));
const draft=(o)=>({id:'draft-t1',generated:true,n:'x',d:'',skill:[],need:[],load:1,metric:null,...o});
c('a draft citing childPoverty answers child-poverty, staffed as that need', J(T.caseBridgeOf(draft({metric:'childPoverty',n:'Saturday snack table'}))), {needs:['child-poverty'],min:J(T.CASE_NEED_MIN['child-poverty']),kind:'food',ongoing:true});
c('an after-school table is about children first', T.caseDraftKind(draft({n:'After-school snack table'})), 'children');
c('a draft citing noCar: three needs, min from the first two, max 3', J(T.caseBridgeOf(draft({metric:'noCar'}))).needs, ['nocar','seniors-nocar','foodaccess']);
c('a draft citing medAge maps to the four age needs', J(T.caseBridgeOf(draft({metric:'medAge'}))).needs, ['older-area','newborn','isolationyoung','grief']);
c('a draft with no verified metric: no needs, staffed by its kind', J(T.caseBridgeOf(draft({metric:null,n:'Rides to the pharmacy'}))), {needs:[],min:J(T.CASE_KIND_MIN.transport),kind:'transport',ongoing:true});
c('a metric that is not a SPEC key bridges to nothing', J(T.caseBridgeOf(draft({metric:'__proto__'}))).needs, []);
c('draft kind: the model’s skills decide first', [T.caseDraftKind(draft({skill:['kids'],n:'Monthly supper'})),T.caseDraftKind(draft({skill:['medical'],n:'Rides to clinic'})),T.caseDraftKind(draft({skill:['vehicle']}))], ['children','health','transport']);
c('draft kind from words: rides to a clinic are transport, not health', T.caseDraftKind(draft({n:'Rides to clinic appointments'})), 'transport');
c('draft kind from words', ['Teen study hall','Blood pressure table','Soup night','Debt letter help','Care home hymn visits','Street festival','Coffee on the corner'].map(n=>T.caseDraftKind(draft({n}))), ['children','health','food','money','visits','events','general']);
c('draft kind: a food or coat drive, a drive-in, a legal or tax clinic, an open-doors café, a kitchen-table study', ['Canned food drive','Winter coat drive','Drive-in movie night','Know-your-rights legal clinic','Tax help clinic','Open doors café','Kitchen table Bible study'].map(n=>T.caseDraftKind(draft({n}))), ['food','general','events','general','money','general','general']);
c('draft kind: drivers, a blood pressure clinic, a soup kitchen, door-to-door, a doorstep', ['Volunteer drivers for seniors','Free blood pressure clinic','Soup kitchen','Door-to-door survey','Doorstep prayer'].map(n=>T.caseDraftKind(draft({n}))), ['transport','health','food','visits','visits']);
c('a count that is a rate is not a length: two evenings a week goes on', ['Meets two evenings a week.','3 nights a week, all year.','Two sessions per month.','Four nights in October.'].map(d=>T.caseDraftOngoing(draft({d}))), [true,true,true,false]);
c('draft rhythm from words', [T.caseDraftOngoing(draft({d:'Meets one evening a week in the hall.'})),T.caseDraftOngoing(draft({d:'A one-off Saturday clean-up.',load:2})),T.caseDraftOngoing(draft({d:'A six-week course.'})),T.caseDraftOngoing(draft({d:'',load:0})),T.caseDraftOngoing(draft({d:'',load:2}))], [true,false,false,false,true]);
c('a fixed length wins over a weekly rhythm', [T.caseDraftOngoing(draft({d:'Every Tuesday for a 6-week course.'})),T.caseDraftOngoing(draft({d:'Four nights in October.'})),T.caseDraftOngoing(draft({d:'An on-call list, every week of the year.'}))], [false,false,true]);
c('an unknown non-draft falls back to its tags', J(T.caseBridgeOf({id:'x-new',n:'New thing',need:['many-kids','snap'],skill:[]})).needs, ['kids','snap','foodaccess']);
c('nonsense in, empty bridge out', J(T.caseBridgeOf(null)), {needs:[],min:[],kind:'general',ongoing:false});

// ================================================================ CASE_RANK
console.log('-- CASE_RANK: the formula, pinned --');
const R=(x,ctx)=>J(T.CASE_RANK(x,ctx));
const PF=byId['pathfinders'], FP=byId['food-pantry'];
const okc={pathfinders:{ok:true,gaps:0},'food-pantry':{ok:true,gaps:0}};
const h1={kids:{here:27,county:20,sig:true}};
const near=(a,b)=>Math.abs(a-b)<1e-9;
const s1=0.5+0.5*(7/20)/2;                                   // kids 27 against 20: 35% above, lift 0.175
c('one need 35% above the county: N = 0.75·(0.5 + 0.5·0.175) → 44 (ok, no gifts)', [R(PF,{hits:h1,check:okc}).score,near(R(PF,{hits:h1,check:okc}).value,0.75*s1)], [44,true]);
const h2={kids:{here:27,county:20,sig:true},schools:{here:18,county:15.5,sig:true}};
const s2=(0.5+0.5*(2.5/15.5)/2)*0.9;                         // schools, second in the list: position 0.9
c('a second fired need adds 0.15 of its position-weighted strength → 51', [R(PF,{hits:h2,check:okc}).score,near(R(PF,{hits:h2,check:okc}).value,0.75*s1+0.15*s2)], [51,true]);
c('three times the county: full lift; one need alone gives 75', R(PF,{hits:{kids:{here:60,county:20}},check:okc}).score, 75);
c('three needs, all at full lift: 0.75 + 0.15·0.9 + 0.10·0.8 → 97', R(FP,{hits:{snap:{here:30,county:10},foodaccess:{here:30,county:10},poverty:{here:30,county:10}},check:{'food-pantry':{ok:true,gaps:0}}}).score, Math.round(100*(0.75+0.15*0.9+0.10*0.8)));
c('not significant (sig false) reads "similar to the county": lift 0 → 38', R(PF,{hits:{kids:{here:40,county:20,sig:false}},check:okc}).score, 38);
c('no county (county scope): lift 0 → 38', R(PF,{hits:{kids:{here:40,county:null}},check:okc}).score, 38);
c('below the county but fired: lift 0 → 38', R(PF,{hits:{kids:{here:25,county:30}},check:okc}).score, 38);
c('need is the gate: nothing fired, no tags → 0', R(PF,{hits:{},check:okc}).score, 0);
c('nothing fired but one of its tags is present → 8', R(PF,{hits:{},tags:['many-kids'],check:okc}).score, 8);
c('any fired need, however weak and however hard to staff, outranks a tag alone', (()=>{
  const weakest=R(byId['homework-club'],{hits:{'child-poverty':{here:1,county:9,sig:false}},check:{'homework-club':{ok:false,gaps:9}},gifts:{members:3,needs:{},staff:{}}}).value;  // 4th need, no lift, no staff
  const bestTag=Math.max(R(PF,{hits:{},tags:['many-kids'],check:okc}).value,R(PF,{hits:{},tags:['many-kids'],check:okc,gifts:{members:3,needs:{kids:{drawn:5,could:0}},staff:{Pathfinders:{ready:3,could:0}}}}).value);
  return [Math.round(weakest*100),Math.round(bestTag*100),weakest>bestTag]; })(), [10,8,true]);
c('lead is the strongest fired need', R(FP,{hits:{poverty:{here:19,county:7},snap:{here:17,county:15}},check:okc}).lead, 'poverty');
c('position: the ministry’s own first need counts more than its third', R(FP,{hits:{snap:{here:20,county:20}},check:okc}).value>R(FP,{hits:{poverty:{here:20,county:20}},check:okc}).value, true);
console.log('-- feasibility --');
const F=g=>R(PF,{hits:h1,check:{pathfinders:{ok:g===0,gaps:g}}}).feas;
c('ok 1 · 1 gap 0.6 · 2 → 0.45 · 3 → 0.3 · 4 → 0.15 · 5+ → 0', [0,1,2,3,4,5,9].map(F), [1,0.6,0.45,0.3,0.15,0,0]);
c('a list of gaps counts like a number', R(PF,{hits:h1,check:{pathfinders:{ok:false,gaps:['a','b']}}}).feas, 0.45);
c('check as a function equals check as a map', R(PF,{hits:h1,check:x=>okc[x.id]}), R(PF,{hits:h1,check:okc}));
c('no check supplied → 0.5', R(PF,{hits:h1}).feas, 0.5);
c('a strong need with five gaps keeps 40/85 of its need (in view, not buried)', R(PF,{hits:{kids:{here:60,county:20}},check:{pathfinders:{ok:false,gaps:5}}}).score, Math.round(100*0.75*0.40/0.85));
c('the weights are 0.40 need floor, 0.45 feasibility, 0.15 gifts', J(T.CASE_W), {base:0.4,feas:0.45,gifts:0.15});
console.log('-- gifts --');
const gifts=(needs,staff)=>({members:6,needs,staff});
c('reading follows gfChurchNeeds: well 3+ drawn, gap none, one, else thin', [T.caseReading(3,0),T.caseReading(0,0),T.caseReading(0,1),T.caseReading(1,1),T.caseReading(2,0),T.caseReading(0,4)], ['well','gap','one','thin','thin','thin']);
const G=(n,s)=>R(PF,{hits:h1,check:okc,gifts:gifts(n,s)}).gifts;
c('well covered and 2 ready → 1', G({kids:{drawn:3,could:0}},{'Pathfinders':{ready:2,could:0}}), 1);
c('a gap and nobody ready → 0', G({kids:{drawn:0,could:0}},{'Pathfinders':{ready:0,could:0}}), 0);
c('one person, one ready → ½·0.3 + ½·0.7 = 0.5', G({kids:{drawn:0,could:1}},{'Pathfinders':{ready:1,could:0}}), 0.5);
c('the best of its needs and of its GF_MIN names counts', G({kids:{drawn:0,could:0},schools:{drawn:3,could:0}},{'Pathfinders':{ready:0,could:0},'Youth ministry':{ready:2,could:0}}), 1);
c('score with gifts: 100·N·(0.40 + 0.45·F + 0.15·G); N 0.44, F 1, G 0.5 → 41', R(PF,{hits:h1,check:okc,gifts:gifts({kids:{drawn:0,could:1}},{'Pathfinders':{ready:1,could:0}})}).score, Math.round(100*0.75*s1*(0.40+0.45+0.15*0.5)));
c('gifts with no members counted are ignored (weights renormalise)', R(PF,{hits:h1,check:okc,gifts:{members:0,needs:{},staff:{}}}).gifts, null);
c('well staffed beats a gap, all else equal', R(PF,{hits:h1,check:okc,gifts:gifts({kids:{drawn:3,could:0}},{})}).value>R(PF,{hits:h1,check:okc,gifts:gifts({kids:{drawn:0,could:0}},{})}).value, true);
console.log('-- units --');
const L=(id,here,county)=>T.caseLift(id,{here,county,sig:null});
c('median age: ten years older is full lift; younger is none', [L('older-area',50,40),L('older-area',45,40),L('older-area',35,40)], [1,0.5,0]);
c('young-family needs read median age the other way', [L('newborn',30,40),L('isolationyoung',32,37)], [1,0.5]);
c('Gini: +25% is full lift', [L('gini',50,40),L('gini',45,40)], [1,0.5]);
c('ten-year changes have no county lift', [L('growth',900,100),L('shift-race',12,1),L('foreign-shift',8,1)], [0,0,0]);
c('a county of zero: ten points here is full lift, five is half', [L('snap',5,0),L('snap',12,0)], [0.5,1]);
c('% lift is the smaller of the ratio (full at 3×) and the points (full at +10)', [L('poverty',30,15),L('kids',27,20),L('overcrowd',5,1.2),L('limeng',11.2,3.1),L('child-poverty',26.1,8.4)].map(v=>Math.round(v*1000)/1000), [0.5,0.175,0.38,0.81,1]);
c('the points only bind when the county is under 5%', [L('renters',48,26)===Math.min(1,(48-26)/26/2), L('snap',16.8,6.2)===Math.min(1,(16.8-6.2)/6.2/2)], [true,true]);
c('non-numbers never lift', [L('kids','27',20),L('kids',NaN,20),L('kids',27,undefined)], [0,0,0]);
console.log('-- pure, bounded, total --');
const ctxP={hits:h2,tags:['many-kids'],check:okc,gifts:gifts({kids:{drawn:1,could:2}},{'Pathfinders':{ready:1,could:1}})};
const before=JSON.stringify(ctxP), r1=R(PF,ctxP), r2=R(PF,ctxP);
c('same input, same output; ctx and x untouched', [JSON.stringify(r1)===JSON.stringify(r2), JSON.stringify(ctxP)===before, !('rank' in PF)], [true,true,true]);
let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
const pickN=(a,k)=>a.filter(()=>rnd()<k/a.length);
let bad=[];
for(let t=0;t<400;t++){
  const hits={}; pickN(NEED_IDS,6).forEach(id=>hits[id]={here:rnd()<0.1?null:Math.round(rnd()*60),county:rnd()<0.1?null:Math.round(rnd()*40),sig:[true,false,null][t%3]});
  const ng={}; NEED_IDS.forEach(id=>ng[id]={drawn:Math.floor(rnd()*4),could:Math.floor(rnd()*4)});
  const st={}; MIN_NAMES.forEach(n=>st[n]={ready:Math.floor(rnd()*3),could:Math.floor(rnd()*3)});
  const ctx={hits,tags:pickN(allTags,5),check:x=>({ok:rnd()<0.4,gaps:Math.floor(rnd()*7)}),gifts:rnd()<0.5?null:{members:1+Math.floor(rnd()*20),needs:ng,staff:st}};
  const x=SIG[Math.floor(rnd()*SIG.length)];
  const r=T.CASE_RANK(x,ctx);
  if(!(Number.isInteger(r.score)&&r.score>=0&&r.score<=100&&r.need>=0&&r.need<=1&&r.feas>=0&&r.feas<=1&&(r.gifts===null||(r.gifts>=0&&r.gifts<=1))&&r.hits.every(h=>h in hits))) bad.push(x.id);
}
c('400 random contexts: score an integer 0–100, parts 0–1, hits only from ctx', bad, []);
c('every catalogue ministry and a draft rank without throwing', (()=>{ try{ SIG.forEach(x=>T.CASE_RANK(x,ctxP)); T.CASE_RANK(draft({metric:'snap'}),ctxP); T.CASE_RANK(null,null); return true; }catch(e){ return e.message; } })(), true);
const ranked=J(T.caseRankAll([byId['vbs'],PF,FP,byId['fall-festival']],{hits:{kids:{here:27,county:20},snap:{here:17,county:6}},check:{},tags:[]}).map(o=>o.x.id));
c('caseRankAll: SNAP three times the county puts the pantry first; ties fall to the name', ranked, ['food-pantry','fall-festival','pathfinders','vbs']);
console.log('-- perverse results the formula must not give --');
const leadOf=(ctx,k=1)=>J(T.caseRankAll(SIG,ctx).slice(0,k).map(o=>o.r.lead));
const allOk=()=>({ok:true,gaps:0});
c('a tiny need does not rank first: 5% of homes overcrowded (1.2% in the county) against poverty 30% (15%)',
  leadOf({hits:{overcrowd:{here:5,county:1.2},poverty:{here:30,county:15}},check:allOk},5), ['poverty','poverty','poverty','poverty','poverty']);
c('nor a second language at 5.5% (1%) or veterans at 8.2% (2.5%) against SNAP 24% (12%)',
  leadOf({hits:{veterans:{here:8.2,county:2.5},'lang-second':{here:5.5,county:1},snap:{here:24,county:12}},check:allOk},3), ['snap','snap','snap']);
const MED=new Set(['bp-clinic','health-expo','chip','kids-health','health-to-why','cooking-school','mental-health','stop-smoking']);
const ctxT2={hits:{uninsured:{here:19,county:4.8},poverty:{here:18.5,county:12}},check:x=>MED.has(x.id)?{ok:false,gaps:5}:{ok:true,gaps:0}};
const rT2=J(T.caseRankAll(SIG,ctxT2).map(o=>({id:o.x.id,F:o.r.feas,lead:o.r.lead,v:o.r.value})));
c('an infeasible ministry (5 gaps) never outranks a workable one whose first need is poverty at 1.5 times the county',
  (()=>{ const worstOk=Math.min(...rT2.filter(t=>t.F===1&&B[t.id].needs[0]==='poverty').map(t=>t.v)); return rT2.filter(t=>t.F===0&&t.v>=worstOk).map(t=>t.id); })(), []);
c('… but it stays in view, above every ministry answering nothing', (()=>{ const bestNone=Math.max(0,...rT2.filter(t=>!t.lead).map(t=>t.v)); return rT2.filter(t=>t.F===0&&t.lead&&t.v<=bestNone).map(t=>t.id); })(), []);
const val=(N,F,G)=>G==null?N*(T.CASE_W.base+T.CASE_W.feas*F)/(T.CASE_W.base+T.CASE_W.feas):N*(T.CASE_W.base+T.CASE_W.feas*F+T.CASE_W.gifts*G);
c('bounds: blocked at the strongest possible need loses to workable at N 0.46 (no gifts) and N 0.63 (blocked fully gifted, workable not)',
  [val(0.965,0,null)<val(0.46,1,null), val(0.965,0,1)<val(0.63,1,0)], [true,true]);
console.log('-- a ministry with no gifts data --');
const gEmpty={members:4,needs:{},staff:{}};
c('gifts results in, but no row for its needs or ministries: G is 0, no throw, score ≤ its need', (()=>{ const r=R(FP,{hits:{snap:{here:18,county:6}},check:okc,gifts:gEmpty}); return [r.gifts,r.score<=Math.round(100*r.need)]; })(), [0,true]);
c('gifts object with no maps at all: G is 0, no throw', R(FP,{hits:{snap:{here:18,county:6}},check:okc,gifts:{members:2}}).gifts, 0);
c('a draft with no verified figure and gifts in: staffed by its kind only, G at most ½', (()=>{ const r=R(draft({n:'Rides to the pharmacy'}),{hits:{},check:()=>({ok:true,gaps:0}),gifts:{members:3,needs:{},staff:{'Transportation ministry':{ready:2,could:0}}}}); return [r.gifts,r.need,r.score]; })(), [0.5,0,0]);
c('no gifts results: the same ministry scores its need exactly when workable (weights renormalise)', (()=>{ const r=R(FP,{hits:{snap:{here:18,county:6}},check:okc}); return [r.gifts,r.score===Math.round(100*r.value),Math.abs(r.value-r.need)<0.006]; })(), [null,true,true]);

// ================================================================ the real app
console.log('-- in the app: fixtures, the demo church, six members --');
(async()=>{
  const {JSDOM,VirtualConsole}=require(jsdomPath);
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window; const E=s=>w.eval(s);
  const t0=Date.now(); while(Date.now()-t0<8000){ try{ if(E('typeof uCatalog==="function"&&typeof gfStaffing==="function"')) break; }catch(e){} await new Promise(r=>setTimeout(r,25)); }
  if(!inApp) E(fs.readFileSync(BRIDGE_FILE,'utf8').replace(/\nif\(typeof module[\s\S]*$/,'').replace(/^const /gm,'var ').replace(/^function (\w+)/gm,'var $1=function $1'));
  const D=J(FX.DATA);
  Object.assign(D.M.tract,{veterans:9.1,grandKids:5.2,collegeShare:3.8,k12Share:17.5});
  Object.assign(D.M.cousub,{veterans:7,grandKids:2,collegeShare:5,k12Share:15});
  Object.assign(D.M.county,{veterans:6.5,grandKids:1.8,collegeShare:5.5,k12Share:15.5});
  E('DATA='+JSON.stringify(D)+';SCOPE="tract";');
  E('uChurch().name="Warminster SDA Church"; CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+');');
  E(`(()=>{ const mk=(seed,bias)=>{ let s=seed; const r=()=>{ s=(s*9301+49297)%233280; return s/233280; }; const a={};
      GIFTS.forEach(g=>{ for(let k=0;k<5;k++){ let v=Math.floor(r()*3)+(bias.includes(g.id)?2:0); a[g.id+'.'+k]=Math.min(4,v);} }); return a; };
    const ids=GIFTS.map(g=>g.id);
    const ppl=[['Ana Lopez',1,[ids[0],ids[3],ids[7]],{children:2,families:2}],['Ben Carter',2,[ids[1],ids[5]],{seniors:2}],['Cara Diaz',3,[ids[2],ids[9],ids[12]],{newcomers:2}],
      ['Dan Evans',4,[ids[4],ids[10]],{}],['Eve Fox',5,[ids[6],ids[13],ids[15]],{poor:2}],['Gus Hill',6,[ids[8],ids[11]],{teens:2}]];
    uChurch().members=ppl.map(([n,seed,b,h],i)=>({id:'m'+i,name:n,gifts:gfScores(mk(seed,b)),heart:h,confirmed:true,willing:true,hours:6,skills:i%2?['lead']:['cook'],source:'manual'}));
    uPersist(); })()`);
  c('no boot errors', errs, []);
  const ctx=JSON.parse(E('JSON.stringify(caseRankCtx())'));
  c('ctx: the fired needs are GF_NEEDS ids', Object.keys(ctx.hits).filter(id=>!NEED_IDS.includes(id)), []);
  c('ctx: poverty 19.4% here against 7.1% in the county', [ctx.hits.poverty.here,ctx.hits.poverty.county], [19.4,7.1]);
  c('ctx: the Spanish figure is compared with Spanish in the county', !!ctx.hits['lang-primary']&&ctx.hits['lang-primary'].here===ctx.hits['lang-primary'].county, true);
  c('ctx: every catalogue item was checked', Object.keys(ctx.check).length, E('uCatalog().length'));
  c('ctx: six members counted, 38 needs, 40 GF_MIN rows', [ctx.gifts.members,Object.keys(ctx.gifts.needs).length,Object.keys(ctx.gifts.staff).length], [6,38,40]);
  c('ctx carries counts only: no member name anywhere', ['Ana','Lopez','Carter','Diaz','Evans','Fox','Hill'].filter(n=>JSON.stringify(ctx).includes(n)), []);
  // An under-18 and an all-high answerer, with Ana's gifts and heart: never counted.
  E(`(()=>{ const a=uChurch().members[0]; uChurch().members.push({...a,id:'m7',name:'Young Kid',minor:true},{...a,id:'m8',name:'High Everywhere',flags:{allHigh:true}}); uPersist(); })()`);
  const ctx2=JSON.parse(E('JSON.stringify(caseRankCtx())'));
  c('an under-18 and an all-high answerer are never counted', [ctx2.gifts.members,JSON.stringify(ctx2.gifts.needs)===JSON.stringify(ctx.gifts.needs)], [6,true]);
  c('staffing counts leave them out too', JSON.stringify(ctx2.gifts.staff)===JSON.stringify(ctx.gifts.staff), true);
  const top=JSON.parse(E(`JSON.stringify(caseRankAll(uCatalog().filter(x=>uEvidence(x).valid),caseRankCtx()).map(o=>({id:o.x.id,n:o.x.n,s:o.r.score,N:o.r.need,F:o.r.feas,G:o.r.gifts,lead:o.r.lead,kind:o.r.kind})))`));
  console.log('    top 12 of '+top.length+' (score · need/feas/gifts · lead · kind):');
  top.slice(0,12).forEach((t,i)=>console.log(`      ${String(i+1).padStart(2)}. ${String(t.s).padStart(3)} · ${t.N}/${t.F}/${t.G} · ${t.lead} · ${t.kind} · ${t.n}`));
  c('the picker covers every valid ministry', top.length, E('uCatalog().filter(x=>uEvidence(x).valid).length'));
  c('scores are ordered', top.every((t,i)=>i===0||top[i-1].s>=t.s), true);
  console.log('    … and the last 5:'); top.slice(-5).forEach(t=>console.log(`      ${String(t.s).padStart(3)} · ${t.N}/${t.F}/${t.G} · ${t.lead} · ${t.kind} · ${t.n}`));
  const top10=top.slice(0,10), at=id=>top.findIndex(t=>t.id===id);
  c('the top ten all answer a need that fired', top10.every(t=>t.lead), true);
  c('and each leads with a need at least twice the county’s', top10.filter(t=>!(ctx.hits[t.lead].here/ctx.hits[t.lead].county>=2)).map(t=>t.id), []);
  c('SNAP at 2.7 times the county puts the pantry above the fall festival (children, 1.3 times)', at('food-pantry')<at('fall-festival'), true);
  c('service work no higher than the county: the late-shift group sits in the lower half', at('sg-work')>top.length/2, true);
  c('a ministry whose needs did not fire ranks below every one whose needs did', (()=>{ const i=top.findIndex(t=>!t.lead); return i<0||top.slice(i).every(t=>!t.lead); })(), true);
  const pfA=top.find(t=>t.id==='pathfinders');
  const pfB=JSON.parse(E(`JSON.stringify(CASE_RANK(uCatalog().find(x=>x.id==='pathfinders'),caseRankCtx({sig:()=>false})))`));
  c('with the margin-of-error test saying "not significant", the same ministry’s need drops', pfB.need<pfA.N, true);
  const sigSeen=JSON.parse(E(`(()=>{ const seen=[]; caseRankCtx({sig:(k,id)=>{ seen.push(k); return null; }}); return JSON.stringify(seen); })()`));
  c('the MOE hook is asked by figure key (poverty, snap, lang:Spanish …)', ['poverty','snap','lang:Spanish'].every(k=>sigSeen.includes(k)), true);
  // The Census test from the margins, when they are loaded (moe.js: compareResult, M[l].moe).
  E(`if(typeof compareResult!=='function'){ var compareResult=function(h,hm,c,cm){ if(![h,hm,c,cm].every(v=>typeof v==='number'&&isFinite(v))) return null;
       const se=Math.sqrt((hm/1.645)**2+(cm/1.645)**2); if(!se) return null; const z=(h-c)/se; return {dir:Math.abs(z)>1.645?(z>0?'higher':'lower'):'similar',sig:Math.abs(z)>1.645,z}; }; }
     DATA.M.tract.moe={poverty:14,snap:1.5}; DATA.M.county.moe={poverty:0.3,snap:0.2};`);
  const ctxM=JSON.parse(E('JSON.stringify(caseRankCtx())'));
  c('margins loaded: poverty 19.4 ± 14 is not significantly above 7.1; SNAP 16.8 ± 1.5 is; no margin → null', [ctxM.hits.poverty.sig,ctxM.hits.snap.sig,ctxM.hits.kids.sig], [false,true,null]);
  c('an explicit hook wins over the margins, and is asked with the figures', JSON.parse(E(`JSON.stringify((()=>{ let got=null; const x=caseRankCtx({sig:(k,id,h,cn)=>{ if(k==='snap') got=[id,h,cn]; return true; }}); return [x.hits.poverty.sig,got]; })())`)), [true,['snap',16.8,6.2]]);
  E('delete DATA.M.tract.moe; delete DATA.M.county.moe;');
  c('a draft on the church ranks like a built-in', (()=>{ E(`uChurch().drafts=[{id:'draft-z1',generated:true,n:'Saturday soup supper',why:'x',d:'Every month, a hot soup supper.',how:[],k:'Belong',evidenceArea:DATA.levels[SCOPE].name,metric:'snap',reviewedEvidence:true,load:1,st:'trust',ppl:3,cost:1,skill:['cook'],need:[]}]; uPersist();`);
    return JSON.parse(E(`JSON.stringify((({kind,ongoing,lead})=>({kind,ongoing,lead}))(CASE_RANK(uCatalog().find(x=>x.id==='draft-z1'),caseRankCtx())))`)); })(), {kind:'food',ongoing:true,lead:'snap'});
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+e.stack); fail++; console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); });
