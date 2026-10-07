// v10.55.1 — "Your church" stands out. The pastor (6 Oct 2026): "the where they fill in your church and spiritual gifts, this section needs
// to be glowing or pulsating or something slow pulsate and glowing to really emphasize the importance that this is what you need to do in
// order to tap into the full potential of this app … right now it just looks like blended into all the other stuff … all green mint color …
// a colored [line] go around the edge all the way around like it's moving all the way around … and also the spiritual gifts should be a
// very important button". Written failing-first on v10.55.1's first commit (77f44ef). jsdom does no layout or animation: the rules are
// read from the page's own style sheet; the motion itself was checked in Chrome.
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const fs=require('fs'), path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const css=(HTML.match(/<style[^>]*>([\s\S]*?)<\/style>/g)||[]).join('\n');

(async()=>{ await T.sec(async()=>{
  console.log('-- the rules: a light running round the edge, a slow glow, still for reduced motion and print --');
  c('the angle is a typed property, so the edge can turn', /@property --uca\{syntax:'<angle>'/.test(css), true);
  c('the frame: a conic gradient from that angle, violet and gold, round the whole edge', /section\.blk\.u-churchsec\{[^}]*border:4px solid transparent[^}]*conic-gradient\(from var\(--uca\)[^}]*var\(--gfv\)[^}]*var\(--m-hardship\)/.test(css), true);
  c('while something is left to do: it turns (9 s) and breathes (6 s), slowly', /section\.blk\.u-churchsec\.u-todo\{animation:ucSpin 9s linear infinite,ucGlow 6s ease-in-out infinite\}/.test(css), true);
  c('…the turn and the glow', [/@keyframes ucSpin\{to\{--uca:360deg\}\}/.test(css),/@keyframes ucGlow\{/.test(css)], [true,true]);
  c('reduced motion: no animation, a steady glow', /@media \(prefers-reduced-motion:reduce\)\{section\.blk\.u-churchsec\.u-todo\{animation:none;box-shadow:/.test(css), true);
  c('print: still, a plain line', /@media print\{section\.blk\.u-churchsec,section\.blk\.u-churchsec\.u-todo\{animation:none/.test(css), true);
  c('the Spiritual Gifts button: solid violet, bold, larger, with a glow', /\.btn\.u-gfgo\{background:var\(--gfv\);color:var\(--gfv-ink\);[^}]*font-weight:700;font-size:1rem;[^}]*box-shadow:/.test(css), true);

  console.log('\n-- the survey: an empty church, no results: "Start here", the moving edge, the violet button --');
  const P=page({needs:'file'}); await ready(P);
  survey(P); await sleep(200);
  const s=P.q('#sections #u-church');
  c('the section is framed and moving while there is something to do', [!!s,s&&s.classList.contains('u-churchsec'),s&&s.classList.contains('u-todo')], [true,true,true]);
  c('"Start here" above "Your church"', [P.q('#u-church .u-chstart').hidden,P.txt('#u-church .u-chstart'),P.q('#u-church .u-chstart').nextElementSibling.tagName], [false,'Start here','H2']);
  const b=P.q('#u-gfnote [data-u-gifts]');
  c('the Spiritual Gifts button is the violet one, not a ghost', [b.classList.contains('u-gfgo'),b.classList.contains('ghost'),b.textContent], [true,false,'Send the Spiritual Gifts survey']);
  b.click(); await sleep(150);
  // v10.56.2 (stale, not a regression): the pastor, "if there's a button that points to spiritual gifts, just send the person to the main page for spiritual gifts. Don't send them to like any other spot"
  c('…and it opens the Spiritual Gifts main page', [P.E('TOOL'),P.E('GF_VIEW')], ['gifts','roster']);
  P.E(`openTool('survey')`); await sleep(150);

  console.log('\n-- the church filled in, still no results: still something to do (the Spiritual Gifts survey) --');
  P.E(`capSave(${JSON.stringify(FX.MEDIUM)})`); await sleep(80);
  c('the frame keeps moving, "Start here" stays', [P.q('#u-church').classList.contains('u-todo'),P.q('#u-church .u-chstart').hidden], [true,false]);

  console.log('\n-- both done (the church, and enough results): the frame stays, still --');
  P.E(`(()=>{ window.__gfr=gfReadiness; gfReadiness=()=>({...window.__gfr(),n:30,state:'half'}); gfFirstRefresh(); })()`); await sleep(80);
  c('no animation, no "Start here", without drawing the survey again', [P.q('#u-church').classList.contains('u-churchsec'),P.q('#u-church').classList.contains('u-todo'),P.q('#u-church .u-chstart').hidden,!!P.q('#u-church #gf-church')], [true,false,true,true]);
  c('…the count follows the results (the church’s adults in worship as the denominator)', P.txt('#u-gfnote .u-gfcount'), '30 of 135 adults have answered.');
  c('…and the button still works after the redraw', (P.q('#u-gfnote [data-u-gifts]').click(),await sleep(120),P.E('TOOL')), 'gifts');
  P.E(`(()=>{ gfReadiness=window.__gfr; openTool('survey'); })()`); await sleep(120);

  console.log('\n-- Spanish --');
  const S=page({needs:'file',lang:'es'}); await ready(S); survey(S); await sleep(200);
  c('"Empiece aquí" and the violet button', [S.txt('#u-church .u-chstart'),S.q('#u-gfnote [data-u-gifts]').classList.contains('u-gfgo')], ['Empiece aquí',true]);

  console.log('\n-- the Proposal page\'s reminder: its Spiritual Gifts button is violet too --');
  c('the nudge\'s Spiritual Gifts button carries u-gfgo', /data-cs-gifts>\$\{esc\(L\('Send the Spiritual Gifts survey'/.test(HTML)&&/class="btn gfsm u-gfgo" data-cs-gifts/.test(HTML), true);
  c('no page errors', [P.errs,S.errs], [[],[]]);
}); T.done(); })();
