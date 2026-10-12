// v10.69.1 · Compare your churches without the neighborhoods. The pastor (12 Oct 2026): "I'm just wondering in compare churches why the
// neighborhood survey is there? What stands out may be a comparison of churches is OK and spiritual gifts comparison and I guess you can keep
// the plans, but I don't think we need the neighborhoods what stands out just the churches, spiritual gifts plans digital footprint".
// The two churches are the test fixtures' (MADE UP). Written failing-first on v10.69.0.
const {sleep,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const B_ADDR='3 Ridge Pike, Fairview Village, PA 19409';
async function twoChurches(P){
  survey(P); await sleep(60);
  P.E(`(()=>{ capSave(${JSON.stringify(FX.MEDIUM)}); uChurch().selected=['food-pantry']; uPersist(); })()`);
  P.E(`(()=>{ const s=uStore(); s.churches['ch-b']={id:'ch-b',name:${JSON.stringify(B_ADDR)},address:${JSON.stringify(B_ADDR)},capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist(); uSwitch('ch-b'); })()`);
  await sleep(40);
  survey(P,{church:'Fairview Village SDA',mod:`D.geo={matched:${JSON.stringify(B_ADDR)}}; D.M.tract.poverty=31.4; D.M.tract.noCar=4.2;`});
  await sleep(60);
  P.E(`capSave(${JSON.stringify(FX.SMALL)})`);
  P.E(`uSwitch(Object.keys(uStore().churches).find(k=>k!=='ch-b'))`); await sleep(40);
}
const F=(name,o)=>Object.assign({id:name,name,town:'',snap:null,ready:true,membership:null,members:null,adults:null,volunteers:null,leaders:null,hours:null,rooms:0,skills:[],slots:[],gifts:{n:0,pct:null,d:null,strongest:[]},plan:0,dec:0},o);
(async()=>{ await T.sec(async()=>{
  console.log('\n-- the page: what stands out, the churches, Spiritual Gifts, the plans, then Digital footprint --');
  const P=page(); await ready(P); await twoChurches(P);
  P.E(`openTool('churches')`); await sleep(80);
  c('four parts in his order, then Digital footprint at the foot', [P.qa('#chc .chc-sec h2').map(h=>h.textContent),!!P.q('#chc > #chc-df'),(x=>x&&x.nextElementSibling&&x.nextElementSibling.id)(P.qa('#chc > .chc-sec').pop())],
    [['What stands out','The churches','Spiritual Gifts','The plans'],true,'chc-df']);
  const page1=P.qa('#chc > :not(#chc-df)').map(e=>e.textContent).join(' ');
  c('no neighborhood anywhere above Digital footprint: no part, no figure, no "Open its survey"', [!!P.q('#chc-hood'),/neighborhood|poverty|without a car|household income|Population|Open its survey|Top needs/i.test(page1)], [false,false]);
  c('the line under the title says what is compared', P.txt('#chc .chc-top .sub'), 'Your churches side by side: their people, their gifts, their plans and how they are found online. Differences, never a ranking.');
  const so=P.qa('#chc .chc-so li').map(l=>l.textContent);
  c('what stands out: the churches\' own counts and their Spiritual Gifts, never a neighborhood\'s figure', [so.length>0,so.every(t=>/^(Members on the books|Attending|Volunteers|Leaders|Ministries in the plan|Spiritual Gifts|No church|Your churches)/.test(t)),so.some(t=>/31\.4%|4\.2%/.test(t))], [true,true,false]);
  c('no page errors', P.errs, []);

  console.log('\n-- what stands out, sentence by sentence --');
  const so2=fs=>P.J(`chStandOut(${JSON.stringify(fs)})`);
  c('two churches much alike: said so, and the gifts', so2([F('A',{volunteers:10,leaders:4,members:60}),F('B',{volunteers:12,leaders:5,members:70})]), ['Your churches look much alike on these counts.','No church has Spiritual Gifts results yet.']);
  c('one with twice the volunteers and three more: said, the larger first', so2([F('A',{volunteers:6}),F('B',{volunteers:20})])[0], 'Volunteers: B 20, A 6.');
  c('ministries in the plan: two more is enough to say', so2([F('A',{plan:3}),F('B',{plan:1})])[0], 'Ministries in the plan: A 3, B 1.');
  c('Spiritual Gifts at both, far apart: each church\'s results of its count', so2([F('A',{gifts:{n:24,pct:52,d:46,strongest:[]}}),F('B',{gifts:{n:3,pct:5,d:55,strongest:[]}})]).pop(), 'Spiritual Gifts results in: A 24 of 46, B 3 of 55.');
  c('…close together: nothing to say about them', so2([F('A',{gifts:{n:20,pct:40,d:50,strongest:[]}}),F('B',{gifts:{n:22,pct:44,d:50,strongest:[]}})]).some(t=>/Spiritual Gifts/.test(t)), false);
  c('a church not filled in: no "much alike" for it', so2([F('A',{ready:false}),F('B',{ready:false})]), ['No church has Spiritual Gifts results yet.']);

  console.log('\n-- the main menu\'s tile --');
  P.E('showHub()'); await sleep(30);
  c('its line', P.txt('#hub .tool[data-tool="churches"] .td'), 'Your churches side by side: people, gifts and plans.');

  console.log('\n-- in Spanish --');
  const S=page({lang:'es'}); await ready(S); await twoChurches(S);
  S.E(`openTool('churches')`); await sleep(80);
  c('the parts and the line', [S.qa('#chc .chc-sec h2').map(h=>h.textContent),S.txt('#chc .chc-top .sub')], [['Lo que se destaca','Las iglesias','Dones espirituales','Los planes'],'Sus iglesias lado a lado: su gente, sus dones, sus planes y cómo se las encuentra en internet. Diferencias, nunca una clasificación.']);
  c('"much alike" in Spanish', S.J(`chStandOut(${JSON.stringify([F('A',{volunteers:10}),F('B',{volunteers:11})])})`)[0], 'Sus iglesias se parecen mucho en estas cifras.');
  S.E('showHub()'); await sleep(30);
  c('the tile', S.txt('#hub .tool[data-tool="churches"] .td'), 'Sus iglesias lado a lado: gente, dones y planes.');
  c('no page errors', S.errs, []);
}); T.done(); })();
