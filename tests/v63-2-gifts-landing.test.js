// v10.63.2 · Spiritual Gifts' main page: a verse and Ellen White's line, the three steps as a picture, two big glowing buttons.
// The pastor (9 Oct 2026): "it would be nice to have a Bible verse about spiritual gifts … maybe a quote from Ellen White … I don't
// need it to be buttons clickable it's just shows that you invite your members you can see the results and then you fill the
// positions … What I want is a beautiful two big buttons … Send spiritual gifts to your members and then take it yourself …
// side-by-side on a computer … and then a phone will be different … pulsating, glowing". The words come from the verified library
// (tests/case-quotes.json) only. Written failing-first on v10.63.1.
const fs=require('fs'), path=require('path');
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const Q=require('./case-quotes.json');
const find=id=>{ let r=null; (function walk(o){ if(r) return; if(Array.isArray(o)) o.forEach(walk); else if(o&&typeof o==='object'){ if(o.id===id&&o.en&&o.es) r=o; else Object.values(o).forEach(walk); } })(Q); return r; };
const V=find('1pet4_10'), E=find('mh148_4');
(async()=>{ await T.sec(async()=>{
  console.log('\n-- the page, top to bottom --');
  const P=page({}); await ready(P); P.E("openTool('gifts')"); await sleep(80);
  const kids=P.qa('#giftbody > *').map(e=>e.id||e.className.split(' ')[0]);
  c('the heading, the verse, the three steps, the two buttons, then the results', kids.slice(0,4), ['gfhead','gfword','gfflow','gf-invite']);
  c('…the results come in below the buttons', !!(P.q('#gf-invite').compareDocumentPosition(P.q('#gf-results'))&4), true);

  console.log('\n-- the verse and Ellen White, word for word from the verified library --');
  c('1 Peter 4:10 (KJV), its reference and version under it', [P.txt('.gfword blockquote'),P.txt('.gfword figcaption')], ['“'+V.en.text+'”',V.en.ref+' · KJV']);
  c('Ellen White, The Ministry of Healing, p. 148', [P.txt('.gfword .gfword-egw').startsWith('“'+E.en.text+'”'),P.txt('.gfword .gfword-egw span')], [true,E.en.ref]);

  console.log('\n-- the steps: a picture, not buttons --');
  const steps=P.qa('.gfflow .gfflow-s');
  c('three steps in order, each with its number', steps.map(s=>[s.querySelector('b').textContent,s.querySelector('strong').textContent]), [['1','Invite your members'],['2','See the results'],['3','Fill the positions']]);
  c('…each with one line saying what happens', steps.map(s=>s.querySelector('small').textContent.length>20), [true,true,true]);
  c('…each in its own colour', steps.map(s=>s.getAttribute('style')), P.J("['invite','results','positions'].map(k=>'--k:'+GF_STEP_K[k])"));
  c('…nothing in them can be tapped (no button, link, tab stop or role)', P.qa('.gfflow button,.gfflow a,.gfflow [tabindex],.gfflow [role=button],.gfflow [data-gf-step],.gfflow [data-gv]').length, 0);
  c('…a list with a name for a screen reader', [P.q('.gfflow').tagName,P.q('.gfflow').getAttribute('aria-label')], ['OL','How it works, in three steps']);

  console.log('\n-- the two big buttons --');
  const bb=P.qa('#gf-invite .gfbigb');
  c('two buttons: Send Spiritual Gifts to your members · Take it yourself', bb.map(b=>[b.tagName,b.querySelector('b').textContent]), [['BUTTON','Send Spiritual Gifts to your members'],['BUTTON','Take it yourself']]);
  c('…each with a line and a picture', bb.map(b=>[b.querySelector('span').textContent,!!b.querySelector('svg[aria-hidden="true"]')]), [['A link and a QR code for your church',true],['About 15 minutes',true]]);
  c('…pink and violet', bb.map(b=>b.getAttribute('style')), ['--k:var(--m-people)','--k:var(--gfv,var(--m-children))']);
  const css=(HTML.match(/<style[^>]*>([\s\S]*?)<\/style>/g)||[]).join('\n');
  c('side by side on a computer, one under the other on a phone', [/\.gfpair\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css),/@media \(max-width:640px\)\{\.gfpair\{grid-template-columns:minmax\(0,1fr\)\}\}/.test(css)], [true,true]);
  c('they glow, slowly, a beat apart; still under reduced motion and on paper', [/\.gfbigb\{[^}]*animation:gfBigGlow 5s ease-in-out infinite/.test(css),/\.gfbigb\+\.gfbigb\{animation-delay:-2\.5s\}/.test(css),/@keyframes gfBigGlow\{/.test(css),/prefers-reduced-motion:reduce\)\{\.gfbigb\{animation:none\}\}/.test(css),/@media print\{\.gfbigb\{animation:none;box-shadow:none\}\}/.test(css)], [true,true,true,true,true]);
  c('the steps: three across; on a phone titles only, so the two buttons come into the first screen', [/\.gfflow\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(css),/@media \(max-width:640px\)\{\.gfflow\{gap:8px\}[^\n]*\.gfflow-s small\{display:none\}/.test(css)], [true,true]);
  c('Ellen White\'s page number never stands alone on a line', P.q('.gfword .gfword-egw span').textContent.includes('p.\u00a0148'), true);

  console.log('\n-- what the buttons do --');
  bb[0].click(); await sleep(40);
  c('Send Spiritual Gifts to your members opens the link and the QR code', P.E('GF_VIEW'), 'setup');
  P.E("GF_VIEW='roster'; gfRender()"); await sleep(40);
  P.q('#gf-invite [data-gv="take"]').click(); await sleep(40);
  c('Take it yourself starts the assessment, as his own', [P.E('GF_VIEW'),P.E('!!GFS.self')], ['take',true]);
  c('no page errors', P.errs, []);

  console.log('\n-- in Spanish --');
  const S=page({lang:'es'}); await ready(S); S.E("openTool('gifts')"); await sleep(80);
  c('1 Pedro 4:10 (RVA 1909) and El Ministerio de Curación, p. 107', [S.txt('.gfword blockquote'),S.txt('.gfword figcaption'),S.txt('.gfword .gfword-egw span')], ['“'+V.es.text+'”',V.es.ref+' · RVA',E.es.ref]);
  c('the steps', S.qa('.gfflow .gfflow-s strong').map(x=>x.textContent), ['Invite a sus miembros','Vea los resultados','Llene los puestos']);
  c('the buttons', S.qa('#gf-invite .gfbigb b').map(x=>x.textContent), ['Envíe Dones espirituales a sus miembros','Hágala usted mismo']);
  c('no page errors', S.errs, []);
}); T.done(); })();
