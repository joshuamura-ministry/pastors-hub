// v10.70.1 · the full audit's fixes. The pastor (26 Oct 2026): "can you do a thourogh audit of the app, from the operation making sure
// everything works and functions properly. everything is synmetrical and looks amazing". Found by measuring every screen in Chrome
// (AUDIT.md; ~/Ministry Work/Terrain-work/v85/audit): (1) the survey's section buttons showed a slice of the next button past the arrow at
// each end of the strip (the arrow stops inside the strip's padding); (2) on a tablet an opened need's four figure circles sat three and
// one; (3) on a phone the idea sheet's "Create a proposal for this ministry" broke onto two lines beside the PDF button; (4) on a phone in
// Spanish "Enviar la encuesta de Dones Espirituales" was wider than its box and pushed the page one pixel sideways. The pixels themselves are
// measured in Chrome (jsdom has no layout); here the rules and words that make them right. Written failing-first on v10.70.0.
const fs=require('fs'), path=require('path');
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const H=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const css=H.slice(H.indexOf('<style'),H.indexOf('</style>'));
(async()=>{ await T.sec(async()=>{
  console.log('\n-- (1) the section strip: nothing shows past an arrow --');
  c('past the right arrow, the strip is covered to its edge in the page’s own color', /\.sn-arrow\.r::after\{[^}]*left:100%[^}]*background:var\(--bg\)/.test(css), true);
  c('…and before the left arrow', /\.sn-arrow\.l::after\{[^}]*right:100%[^}]*background:var\(--bg\)/.test(css), true);
  // seen in the pictures after the fix: the arrow itself was a little see-through, so a chip's letters showed faintly inside the circle
  c('the arrow is solid: no letters show through it', /\.sn-arrow\{[^}]*background:var\(--bg\);/.test(css), true);
  c('the cover is as wide as the strip’s padding, on a computer and on a phone', [/--snpad:18px/.test(css),/--snpad:14px/.test(css),/::after\{[^}]*width:calc\(var\(--snpad\)/.test(css)], [true,true,true]);

  console.log('\n-- (2) an opened need’s figure circles: four never sit three and one --');
  // measured by the box the circles sit in (a container query), not the screen: the box is narrower than the screen by the card's padding
  c('the circles are measured by their own box', /\.ns-figs\{container-type:inline-size\}/.test(css), true);
  c('four circles sit two by two where four do not fit across (4 × 210 px and the gaps: 876 px)', /@container \(min-width:432px\) and \(max-width:875\.98px\)\{\s*\.ns-figs \.stats:has\(>\.stat:nth-child\(4\):last-child\)\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/.test(css), true);
  c('three circles never sit two and one', /@container \(min-width:432px\) and \(max-width:653\.98px\)\{\s*\.ns-figs \.stats:has\(>\.stat:nth-child\(3\):last-child\)\{grid-template-columns:minmax\(0,1fr\)\}/.test(css), true);

  console.log('\n-- (3) the idea sheet on a phone: each button on its own line, whole --');
  c('on a phone the sheet’s buttons take the full width, one under the other', /@media \(max-width:520px\)\{\s*\.ns-sheet \.ns-acts \.btn\{flex:1 1 100%\}/.test(css), true);

  console.log('\n-- (4) the Spiritual Gifts button in Spanish fits a phone --');
  const S=page({lang:'es'}); await ready(S); await sleep(60);
  const note=S.E('uGiftsNoteInner()');
  c('the survey’s button: "Enviar la encuesta de dones"', [/>Enviar la encuesta de dones</.test(note),/Enviar la encuesta de Dones Espirituales/.test(note)], [true,false]);
  c('the Proposal page’s reminder says the same', [/Enviar la encuesta de dones'/.test(H),/'Enviar la encuesta de Dones Espirituales'/.test(H)], [true,false]);
  const E=page({}); await ready(E); await sleep(60);
  c('English unchanged: "Send the Spiritual Gifts survey"', />Send the Spiritual Gifts survey</.test(E.E('uGiftsNoteInner()')), true);
  c('no page errors', [S.errs,E.errs], [[],[]]);

  console.log('\n-- (5) the Planner’s Track tab and printed tracker keep "Bible" capitalized --');
  // found while fixing the Planner's gift line: the tier names were lowercased whole ("gift bible at 11 nights")
  const G=page({}); await ready(G); G.E("openTool('planner')"); await sleep(120); G.q('#pl-demo').click(); await sleep(250);
  G.E('recsLoad(PLAN)'); const gv=G.E('viewGifts(PLAN,giftMarks(PLAN))');
  c('the Track tab says "gift Bible", never "gift bible"', [/gift Bible at/.test(gv),/gift bible/.test(gv)], [true,false]);
  c('no tier name is lowercased whole', /t\.n\.toLowerCase\(\)/.test(H), false);
  c('no page errors in the Planner', G.errs, []);
}); T.done(); })();
