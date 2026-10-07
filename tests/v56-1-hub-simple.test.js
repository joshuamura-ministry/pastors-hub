// v10.56.1 — the main menu, very simple. The pastor (7 Oct 2026), of the hub: "I just want this page to be very simple. The 1234 is nice but
// … it doesn't look good there. I'd say the community survey should just be right under the quote from Ellen White … erase the gifts
// first nobody has taken it yet that whole section so the only thing that should be here is welcome to terrain choose a tool to begin the
// Ellen White quote and then the icons the five icons … under welcome to terrain just something that says your journey begins … maybe
// underneath the icons there can be an explanation of … what this app actually is for." Written failing-first on v10.56.0.
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;

(async()=>{ await T.sec(async()=>{
  const P=page({needs:'file'}); await ready(P);
  await until(()=>!P.q('#hub').hidden,6000);
  const kids=[...P.q('#hub').children].map(e=>e.className.split(' ')[0]);
  c('the hub holds the welcome, the quote, its rule, the five tools and what Terrain is for: nothing else', kids, ['hubwelcome','egw','rule','tools','hubabout']);
  c('no "Your path", no "Gifts first" card', [!!P.q('#hubpath'),!!P.q('#hubgifts'),/Your path|Gifts first|Nobody has taken it yet/.test(P.txt('#hub'))], [false,false,false]);
  c('"Welcome to Terrain", then "Your journey begins here."', [P.txt('.hubwelcome h2'),P.txt('.hubwelcome .sub')], ['Welcome to Terrain','Your journey begins here. Choose a tool to begin.']);
  c('the Community Survey is the first thing under the quote', [P.q('#hub .egw').nextElementSibling.className,P.q('#hub .tools .tool').dataset.tool], ['rule','survey']);
// v10.57.0 (stale, not a regression): six tiles. The pastor (7 Oct 2026): "maybe we could also have a comparison between churches … kinda like how conferences compare each other"
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right"
  c('the six tools', P.qa('#hub .tools .tool').map(b=>b.dataset.tool), ['survey','gifts','case','planner','compare','churches']);   // v10.59.2: Compare your churches last (the pastor: "put compare your churches to the very bottom right instead because it's the weakest one")
  c('under them: what Terrain is for', [P.txt('#hubabout h3'),/^Terrain helps a pastor see the neighborhood God has placed the church in/.test(P.qa('#hubabout p')[0].textContent),P.qa('#hubabout p')[1].textContent],
    ['What Terrain is for',true,'Neighbors are neighbors, never targets: every tool points to Christ.']);

  console.log('\n-- with a church mapped and a plan (where "Your path" and "Gifts first" used to show) --');
  survey(P); await sleep(150); P.E(`capSave(${JSON.stringify(FX.MEDIUM)})`); P.E('showHub()'); await sleep(150);
  c('still only the five tools and the explanation; nothing drawn in their place', [[...P.q('#hub').children].map(e=>e.className.split(' ')[0]),/Your path|Gifts first/.test(P.txt('#hub'))],
    [['hubwelcome','egw','rule','tools','hubabout'],false]);
  c('…the gifts card still works where it lives (the Spiritual Gifts landing, Make the Case)', typeof P.E('gfFirstCardHTML'), 'function');

  console.log('\n-- Spanish --');
  const S=page({needs:'file',lang:'es'}); await ready(S); await until(()=>!S.q('#hub').hidden,6000); await sleep(100);
  c('the welcome line and what Terrain is for, in Spanish', [S.txt('.hubwelcome .sub'),S.txt('#hubabout h3'),/^Terrain ayuda al pastor a ver el vecindario/.test(S.qa('#hubabout p')[0].textContent),S.qa('#hubabout p')[1].textContent],
    ['Su camino comienza aquí. Elija una herramienta para comenzar.','Para qué sirve Terrain',true,'Los vecinos son nuestros vecinos, nunca un objetivo: cada herramienta apunta a Cristo.']);
  c('no page errors', [P.errs,S.errs], [[],[]]);
}); T.done(); })();
