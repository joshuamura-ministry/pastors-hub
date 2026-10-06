// v10.54.1 — the pastor (6 Oct 2026), of the survey's three columns of ministry ideas: "Can the light lift moderate lift heavy lift be
// maybe slightly different colors". One colour per lift, the same everywhere a lift is shown: Light mint, Moderate blue, Heavy violet.
// jsdom draws no colour, so this suite holds the rules and the hooks they need; the look itself was checked in Chrome
// (Terrain-work/v70/shots15.mjs). Written failing-first on v10.54.0.
const {page,ready,survey,openNeed,checker,HTML}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const css=(HTML.match(/<style[^>]*>([\s\S]*?)<\/style>/g)||[]).join('\n');
const rule=sel=>{ const i=css.indexOf(sel+'{'); if(i<0) return null; return css.slice(i+sel.length+1, css.indexOf('}',i)); };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- one colour per lift --');
  c('three colours, both themes (each a colour the page already has in both)', rule(':root'+'') !== null && /--lift1:var\(--m-language\);--lift2:var\(--m-housing\);--lift3:var\(--m-children\)/.test(css));
  c('each lift names its colour, wherever it is drawn', [
    /\.lift\.l1,\.ns-lcol\[data-lift="light"\],[^{]*\.cs-szb\[data-cs-lift="1"\]\{--lc:var\(--lift1\)\}/.test(css),
    /\.lift\.l2,\.ns-lcol\[data-lift="moderate"\],[^{]*\.cs-szb\[data-cs-lift="2"\]\{--lc:var\(--lift2\)\}/.test(css),
    /\.lift\.l3,\.ns-lcol\[data-lift="heavy"\],[^{]*\.cs-szb\[data-cs-lift="3"\]\{--lc:var\(--lift3\)\}/.test(css)], [true,true,true]);
  const fills=[...css.matchAll(/([^{}]*\.lift\.l1 b:nth-child\(-n\+1\)[^{]*)\{background:([^}]*)\}/g)].map(m=>m[2]);
  c('every filled bar takes its lift\'s colour (the survey, the sheet, Size, the Proposal page)', [fills.length>=5, fills.every(f=>f==='var(--lc)')], [true,true]);
  c('the column\'s name, its line and its ideas carry the colour', [/\.ns-lcol \.ns-lh>span\{color:var\(--lc\)\}/.test(css), /\.ns-lcol \.ns-gl\{[^}]*var\(--lc\)/.test(css), /\.ns-lcol \.ns-row\{border-left:3px solid var\(--lc\)/.test(css)], [true,true,true]);
  c('Make the Case\'s Size: the chosen size in its own colour', /\.cs-szb\.on\{border-color:var\(--lc\)/.test(css));

  console.log('\n-- the hooks on the page --');
  const P=page({needs:'file'}); await ready(P); survey(P);
  const first=P.E("(document.querySelector('#u-needs .ns-need')||{}).dataset.need");
  await openNeed(P,first,true);
  const cols=P.qa(`#ns-i-${first} .ns-lcol`).map(e=>[e.dataset.lift, e.querySelector('.ns-lh .lift').className]);
  c('the columns are light, moderate, heavy, in that order, each with its bars', cols.filter(x=>x[0]).every(([L,cl])=>cl===`lift l${['light','moderate','heavy'].indexOf(L)+1}`) && cols.length>=2, true);
  c('…every idea sits inside its lift\'s column', P.qa(`#ns-i-${first} .ns-row`).every(r=>!!r.closest('.ns-lcol[data-lift]')));
  c('no page errors', P.errs, []);
}); T.done(); })();
