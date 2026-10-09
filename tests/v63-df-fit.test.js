// v10.63.0 · Digital footprint's "Every church": every column in view. The pastor (9 Oct 2026), with a picture of the table cut off at
// YouTube: "you see how it's cut off in YouTube and all that … there needs to be some kind of way to scroll or something … or it can be
// tighter … we have to be able to see everything there's no scroll button at all here". The table is as wide as its box (a label may
// take two lines); under 900 px each church is a card with its six areas named. The widths themselves are measured in Chrome
// (Terrain-work/v81/shots63df.mjs: 1366, 966, 820, 390: no sideways scroll, every cell inside the box); jsdom checks the markup and the
// rules. Made-up churches (the repository is public). Written failing-first on v10.62.2.
const fs=require('fs'), path=require('path');
const {sleep,until,checker,page,ready}=require('./v45-helpers.js');
const {dfFetch62}=require('./v62-digital-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
(async()=>{ await T.sec(async()=>{
  console.log('\n-- the rules: never wider than its box --');
  c('the table is as wide as its box, its columns fixed; the old minimum width is gone', [/\.df-all\{table-layout:fixed;width:100%\}/.test(HTML),/\.df-all\{min-width:/.test(HTML)], [true,false]);
  c('a label may take two lines (no one-line rule in the table)', [/\.df-all \.df-st\{white-space:nowrap\}/.test(HTML),/\.df-all \.df-st\{white-space:normal;/.test(HTML)], [false,true]);
  c('under 900 px each church is a card: the heading row hidden, the areas in a grid, three a row on a tablet, two on a phone', [/@media \(max-width:900px\)\{[\s\S]{0,400}\.df-all thead\{display:none\}/.test(HTML),/\.df-all tr\.df-row\{display:grid;grid-template-columns:repeat\(2,/.test(HTML),/@media \(min-width:561px\) and \(max-width:900px\)\{\.df-all tr\.df-row\{grid-template-columns:repeat\(3,/.test(HTML)], [true,true,true]);
  c('…each area named on its card (from the cell\'s own label); a hidden row stays hidden', [/\.df-all tr\.df-row>td::before\{content:attr\(data-th\)/.test(HTML),/\.df-all tr\[hidden\]\{display:none\}/.test(HTML)], [true,true]);
  console.log('\n-- the markup: every cell carries its column\'s name --');
  const P=page(); await ready(P); dfFetch62(P,{review:'off'}); P.E('openTool("churches")'); await until(()=>P.q('#chc-df table.df-all tbody tr.df-row')); await sleep(40);
  const heads=P.qa('#chc-df table.df-all thead th').map(t=>t.textContent.trim()).slice(1);
  const rows=P.qa('#chc-df table.df-all tbody tr.df-row');
  c('six areas, each cell named as its column', [heads.length,rows.length>0,rows.every(r=>[...r.querySelectorAll('td')].map(t=>t.getAttribute('data-th')).join('|')===heads.join('|'))], [6,true,true]);
  c('no page errors', P.errs, []);
}); T.done(); })();
