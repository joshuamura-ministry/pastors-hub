// v10.61.0 — the whole-app audit. The pastor (8 Oct 2026): "can you do a full audit? Make sure everything is solid and symmetrical and
// everything is in its right place." Every screen was measured in Chrome at 1366, 820 and 390, English and Spanish (Terrain-work/v78/
// audit.mjs, audit-measure.js: rows of boxes, lone cards, fields not level, button words that wrap, anything cut off or off the edge,
// page errors) and read by eye (v78/tour.mjs). What jsdom can hold: the one bug it found, the rules and the words. Written failing-first
// on the build before the audit.
const {sleep,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');

(async()=>{ await T.sec(async()=>{
  const P=page({needs:'file'}); await ready(P); survey(P,{}); await sleep(100);

  console.log('\n-- the bug: a tool reached straight from Spiritual Gifts or the Planner left that page open above it --');
  P.E(`openTool('gifts')`); await sleep(30); const g0=P.E(`document.getElementById('gifts').hidden`);
  P.E(`openTool('case')`); await sleep(30); const g1=P.E(`document.getElementById('gifts').hidden`);
  P.E(`openTool('gifts')`); await sleep(30); P.E(`openTool('survey')`); await sleep(30); const g2=P.E(`document.getElementById('gifts').hidden`);
  P.E(`openTool('planner')`); await sleep(30); P.E(`openTool('case')`); await sleep(30); const p1=P.E(`document.getElementById('planner').hidden`);
  c('Gifts open in Gifts; closed when Make the Case or the survey opens; the Planner closed when Make the Case opens', [g0,g1,g2,p1], [false,true,true,true]);

  console.log('\n-- symmetry: no card alone on a row; rows level --');
  c('a grid of cards never leaves one alone: the lone last card takes the row (measured at every width)', [/function tsNoLone\(\)/.test(HTML),/const TS_NOLONE='\.pform,\.cs-agrid,\.cmp-cards,\.cmp-learng,\.cmp-cols,\.cmp-mgroups/.test(HTML)], [true,true]);
  c('step 1\'s five Leadership tiles go five across (never four and one alone)', /\.cs-agrid:has\(> :nth-child\(5\):last-child\)\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)\}/.test(HTML), true);
  c('the survey\'s figure cards: the number at the top of every card, so a row\'s numbers line up', /\.stat\{display:flex;align-items:flex-start;gap:13px\}/.test(HTML), true);
  c('Community resources: a row\'s cards one height', /#helpslot\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:10px 14px;align-items:stretch\}/.test(HTML), true);
  c('the Brief\'s buttons two by two on a phone, the odd last the whole row', /\.brief \.acts button:last-child:nth-child\(odd\)\{grid-column:1\/-1\}/.test(HTML), true);
  c('no button word that wraps on a phone: the tool bar, the slides\' buttons, step 1\'s sections, the footer',
    [/\.backtools\{[^}]*white-space:nowrap/.test(HTML),/@media \(max-width:560px\)\{ \.cs-acts\.cs-acts2\{grid-template-columns:minmax\(0,1fr\)\} \}/.test(HTML),/\.cs-acat\{font-size:\.82rem;padding:10px 6px\}/.test(HTML),/\.joinlink\{[^}]*white-space:nowrap/.test(HTML)], [true,true,true,true]);
  c('the chips fade out under the strip\'s arrows', /\.sn-arrow\.r::before\{right:100%;background:linear-gradient\(to right,transparent,var\(--bg\)\)\}/.test(HTML), true);
  c('Digital footprint: the table wide enough that every pill fits on one line; five churches a "Who needs help most" box', [/\.df-all\{min-width:1180px\}/.test(HTML),/\.df-all \.df-st\{white-space:nowrap\}/.test(HTML),/list\.slice\(0,5\)\.map\(r=>`<li><a href="#df-row-/.test(HTML)], [true,true,true]);
  c('Learn from other conferences: a date never breaks; the typical line drawn first, each number with a halo over it', [/\.cmp \.it \.d,\.cmp-prep \.pi \.d\{white-space:nowrap\}/.test(HTML),/the typical line first[\s\S]{0,400}rows\.forEach\(\(slug,i\)=>/.test(HTML),/paint-order:stroke;stroke:var\(--panel\)/.test(HTML)], [true,true,true]);
  c('a separator never ends a line alone: "· Change church" and "· Sabbath slides" travel with their links', [/<span class="hl-end"><span class="hl-dot"/.test(HTML),/<span class="gff-pair"> · <button type="button" class="gff-l" data-gff-sabbath>/.test(HTML),/\.homeline \.hl-end,\.gff-pair\{white-space:nowrap\}/.test(HTML)], [true,true,true]);
  c('…and "Prepare now" lays every item out alike (its hint above the title and date)', /\.cmp-prep \.pi>\.cmp-hint\{grid-column:1\/-1;justify-self:start\}/.test(HTML), true);

  console.log('\n-- words: one line, one name, plain --');
  c('Spiritual Gifts, step 1: "Invite your members" (not "Spiritual Gifts: invite your members"); members are sent the link, never an address',
    [/L\('Invite your members','Invite a sus miembros'\)/.test(HTML),/Send your members a link\. Each member answers/.test(HTML),/Spiritual Gifts: invite your members/.test(HTML)], [true,true,false]);
  c('the Planner\'s labels one line: "Interest names", "Budget ($)"', [/<span class="lb">Interest names<\/span>/.test(HTML),/<span class="lb">Budget \(\$\)<\/span>/.test(HTML)], [true,true]);
  const ES=P.J(`['Can lead a group or give a study','Nurses or health professionals','A van, or willing drivers','An organiser — forms, lists, a computer','Trained support-group facilitator'].map(k=>ES[k])`);
  c('the skills in Spanish, short enough for one line', [ES,ES.every(t=>t.length<=32)], [['Dirigen un grupo o un estudio','Enfermeras o personal de salud','Camioneta o conductores','Organizador: formularios, listas','Facilitador de grupos de apoyo'],true]);
  c('Community resources in American spelling (as the rest of the survey); the map\'s own tags kept as OpenStreetMap spells them',
    [/name:'Senior centers & services'/.test(HTML),/name:'Honoring community leaders'/.test(HTML),/name:'Youth & children’s organizations'/.test(HTML),/"amenity"="community_centre"/.test(HTML),/"healthcare"="centre"/.test(HTML)], [true,true,true,true,true]);
  c('"Show 1 more", never "Show all 1"', P.E(`cU('moreN',{n:1})`), 'Show 1 more');
  c('one point, two points', /\$\{Math\.abs\(d\)\.toFixed\(0\)==='1'\?'pt':'pts'\}/.test(HTML), true);
  c('"Idle since July 2026" (the month and the year)', P.E(`L('a','b')`)==='a'&&/Idle since \$\{dfMy\(Lv\.d\)\}/.test(HTML), true);
  c('"Who needs help most": one-line headings', ['No working website found','Not on Google Maps, or closed','Different pastors named'].every(t=>HTML.includes(`L('${t}'`)), true);
  c('Compare your churches: a missing figure "—"; a bar only with something to compare it with', [P.E(`chcBar(null,10,'n')`),P.E(`chcBar(5,null,'n')`).includes('chc-bar'),P.E(`chcBar(5,10,'n')`).includes('chc-bar')], ['<span class="chc-v">—</span>',false,true]);
}); T.done(); })();
