// v10.38: pastor asked for coloured sections. The five families of the
// Spiritual Gifts assessment each carry their own colour, the same as the
// gifts report, so a member can see themselves moving through the sections:
//   - the progress bar is five segments in family order, each as wide as its
//     share of the statements (25, 25, 20, 20, 15), done / current / to come,
//     with role=progressbar and aria values; the five dots take the colours;
//   - the section opener is one centred column: eyebrow, title, rule, verse
//     (reference beneath), the family's description on its own, then the
//     count and the instruction set apart, then the button;
//   - each statement card carries its family (data-gff, and the family's name
//     in the label line); answering, Back and the heart page move the segments.
// jsdom does no layout: the look itself was checked in Chrome at 390 and 1280.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=4000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const allErrs=[];
function page(lang){
  const errs=[]; allErrs.push(errs); const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/#gifts',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(lang) w.localStorage.setItem('terrain-lang',lang);
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
        return {ok:false,status:404,json:async()=>{ throw new Error('none'); }}; }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s)};
}
// Place the member at statement index i, every earlier statement answered.
const AT=(i,sect)=>`(()=>{ GF_VIEW='take'; const a={}; for(let n=0;n<Math.min(${i},GF_TOTAL);n++){ const p=GF_ORDER[n]; a[gfKeyOf(p[0],p[1])]=2; }
  GFS={name:'Ana',a,h:{},i:${i},sect:${sect},done:false,sent:false,ov:GF_TOTAL}; GF_RESUMED=true; gfRenderPage(gfHost()); })()`;
const segs=D=>[...D.querySelectorAll('#giftbody .gfsegs .gfseg')];
const state=D=>segs(D).map(s=>(s.classList.contains('done')?'done':s.classList.contains('now')?'now':'-')+':'+s.querySelector('.gfbarfill').style.width);
const dots=D=>[...D.querySelectorAll('#giftbody .gfdots i')].map(i=>(i.className||'-')+':'+i.dataset.gff);

(async()=>{ try{
  const P=page(); const {w,D,E}=P;
  await until(()=>E('typeof gfRenderSection==="function"&&typeof gfSetBar==="function"'));
  const hb=()=>D.getElementById('giftbody');
  const FAMS=['word','people','lead','out','hands'];

  console.log('-- colours --');
  // The same family → token map as the gifts report (GF_FAM_VAR), in the CSS.
  c('each family takes the report colour', E('JSON.stringify(Object.keys(GF_FAM_VAR))'), JSON.stringify(FAMS));
  c('the stylesheet maps every family to its report token', FAMS.every(f=>html.includes(`[data-gff="${f}"]{--k:var(${E(`GF_FAM_VAR[${JSON.stringify(f)}]`)})}`)), true);
  c('mint, pink, amber, purple, blue', FAMS.map(f=>E(`GF_FAM_VAR[${JSON.stringify(f)}]`)), ['--m-language','--m-people','--m-hardship','--m-children','--m-housing']);
  c('bar width transitions stop under reduced motion', /@media \(prefers-reduced-motion: reduce\)\{\s*\.gfseg \.gfbarfill\{transition:none\}/.test(html), true);

  // v10.51.3 — the pastor (6 Oct 2026): "Part two … shouldn't be like a next part. It should just be at the last section of the entire
  // survey … right now 1 2 3 4 5 and this will be the sixth in line": six sections, the sixth "Who you are drawn to" (red, its 12 questions)
  console.log('-- the section 3 opener, 51 of 105 --');
  E(AT(50,1));
  c('it is the section 3 opener', [!!D.getElementById('gfgo'),hb().querySelector('.gfsect').dataset.gff], [true,'lead']);
  c('six segments: the five families in order, then section 6', segs(D).map(s=>s.dataset.gff), [...FAMS,'heart']);
  c('each as wide as its share (statements; section 6 its 12 questions)', segs(D).map(s=>s.style.flex.split(' ')[0]), ['25','25','20','20','15','12']);
  c('two done, the third current and empty, three to come', state(D), ['done:100%','done:100%','now:0%','-:0%','-:0%','-:0%']);
  const bar=hb().querySelector('.gfsegs');
  c('a progressbar with values', [bar.getAttribute('role'),bar.getAttribute('aria-valuemin'),bar.getAttribute('aria-valuemax'),bar.getAttribute('aria-valuenow')], ['progressbar','0','105','50']);
  c('its text names the count and the section', bar.getAttribute('aria-valuetext'), '51 of 105 · Section 3 of 6: Leading and organising');
  c('"51 of 105" as before', hb().querySelector('.gfcount').textContent, '51 of 105');
  c('six dots in their colours', dots(D), ['done:word','done:people','now:lead','-:out','-:hands','-:heart']);
  c('the dots are decoration to a screen reader', hb().querySelector('.gfdots').getAttribute('aria-hidden'), 'true');
  const O=hb().querySelector('.gfsect');
  c('opener order: eyebrow, title, rule, verse, description, count and instruction, button',
    [...O.children].map(e=>e.className.split(' ').filter(k=>/^gf/.test(k)&&k!=='gfverse'&&k!=='btn').join('.')||e.tagName),
    ['gfsecn','gfsect-t','gfso-rule','gfso-v','gfso-l','gfso-f','gfbig']);
  c('eyebrow and title', [O.querySelector('.gfsecn').textContent,O.querySelector('h2').textContent], ['Section 3 of 6','Leading and organising']);
  c('the verse, with its reference beneath, KJV', [O.querySelector('.gfso-v q').textContent,O.querySelector('.gfso-v cite').textContent], [E('GF_VERSE_SET[2][0]'),'1 Corinthians 12:18 · KJV']);
  c('the description is its own paragraph', O.querySelector('.gfso-l').textContent.replace(/\u00a0/g,' '), E('GF_FAMS[2].l'));
  c('its dash is kept to the word before, so no line starts with one', [/\u00a0\u2014/.test(O.querySelector('.gfso-l').textContent),/ \u2014/.test(O.querySelector('.gfso-l').textContent)], [true,false]);
  c('the count and the instruction, set apart', [O.querySelector('.gfso-n').textContent,O.querySelector('.gfso-a').textContent],
    ['20 statements','Answer what is true of you, not what a Christian is supposed to say. Nobody is marking this.']);
  c('Carry on', D.getElementById('gfgo').textContent, 'Carry on');
  c('the rule is decoration', O.querySelector('.gfso-rule').getAttribute('aria-hidden'), 'true');

  console.log('-- section 1 opener --');
  E(AT(0,-1));
  c('Start, in the Scripture family, nothing done yet', [D.getElementById('gfgo').textContent,hb().querySelector('.gfsect').dataset.gff,state(D).join(' ')], ['Start','word','now:0% -:0% -:0% -:0% -:0% -:0%']);
  c('25 statements', hb().querySelector('.gfso-n').textContent, '25 statements');

  console.log('-- a statement card in section 4 --');
  E(AT(74,3));
  const card=()=>hb().querySelector('.gfcardq');
  c('the card carries its family', [card().dataset.gff,card().dataset.i], ['out','74']);
  c('the label names the family and the statement', [card().querySelector('.gfqf').textContent,card().querySelector('.gfqn').textContent], ['Reaching beyond the church','Reaching beyond the churchStatement 75']);
  c('the fourth segment filled to its progress (4 of 20)', state(D), ['done:100%','done:100%','done:100%','now:20%','-:0%','-:0%']);
  card().querySelector('.gfopt[data-v="3"]').click();
  c('a tap fills the segment one statement further', state(D)[3], 'now:25%');
  c('the chosen answer is lit', card().querySelector('.gfopt.on').dataset.v, '3');
  c('aria moves with it', [hb().querySelector('.gfsegs').getAttribute('aria-valuenow'),hb().querySelector('.gfsegs').getAttribute('aria-valuetext')], ['75','76 of 105 · Section 4 of 6: Reaching beyond the church']);
  await until(()=>card()&&card().dataset.i==='75',2000);
  c('the next card, same family', [card().dataset.i,card().dataset.gff], ['75','out']);
  D.getElementById('gfback').click();
  c('Back retreats the segment', state(D)[3], 'now:20%');
  await until(()=>card()&&card().dataset.i==='74',2000);

  console.log('-- crossing into the next section --');
  E(AT(89,3));
  card().querySelector('.gfopt[data-v="2"]').click();
  c('the last statement of section 4 completes its segment', [state(D)[3],state(D)[4]], ['done:100%','now:0%']);
  c('and the dots move on', dots(D).map(d=>d.split(':')[0]), ['done','done','done','done','now','-']);
  await until(()=>D.getElementById('gfgo'),2000);
  c('the section 5 opener, blue family', [hb().querySelector('.gfsect').dataset.gff,hb().querySelector('.gfsecn').textContent], ['hands','Section 5 of 6']);
  D.getElementById('gfgo').click();
  await until(()=>card()&&card().dataset.i==='90',2000);
  c('its first card carries the family', [card().dataset.gff,card().querySelector('.gfqf').textContent], ['hands','Hands and craft']);

  console.log('-- section 6: who you are drawn to, and the welcome back --');
  E(`GFS={name:'Ana',a:{},h:{},i:GF_TOTAL,sect:4,done:false,sent:false,ov:GF_TOTAL}; GFS.a['teach.0']=3; GF_RESUMED=true; gfRender();`);
  { const O6=hb().querySelector('.gfsect');
    c('section 6 opens like the others: its card, red, eyebrow, title, a verse, what it is, 12 questions, Carry on',
      [O6&&O6.dataset.gff,O6&&[...O6.children].map(e=>e.className.split(' ').filter(k=>/^gf/.test(k)&&k!=='gfverse'&&k!=='btn').join('.')||e.tagName),O6&&O6.querySelector('.gfsecn').textContent,O6&&O6.querySelector('h2').textContent,O6&&O6.querySelector('.gfso-v cite').textContent,O6&&O6.querySelector('.gfso-n').textContent,D.getElementById('gfgo').textContent],
      ['heart',['gfsecn','gfsect-t','gfso-rule','gfso-v','gfso-l','gfso-f','gfbig'],'Section 6 of 6','Who you are drawn to','Matthew 9:36 · KJV','12 questions','Carry on']);
    c('…its verse word for word from the verified library (Matthew 9:36)', O6&&O6.querySelector('.gfso-v q').textContent, E(`CASE_VERSES.find(v=>v.id==='matt9_36').en.text`));
    c('…the bar: five done, the sixth current', [state(D).join(' '),dots(D).map(d=>d.split(':')[0])], ['done:100% done:100% done:100% done:100% done:100% now:0%',['done','done','done','done','done','now']]);
    c('…and says so to a screen reader', hb().querySelector('.gfsegs').getAttribute('aria-valuetext'), 'Section 6 of 6: Who you are drawn to'); }
  c('the red is its own (the five families keep the report colours)', [/\[data-gff="heart"\]\{--k:var\(--m-veterans\)\}/.test(html),E('Object.keys(GF_FAM_VAR).length')], [true,5]);
  D.getElementById('gfgo').click(); await until(()=>hb().querySelectorAll('.gfhq').length===12,2000);
  c('Carry on: the twelve questions on one screen, under "Section 6 of 6", never "Part two"', [hb().querySelectorAll('.gfhq').length,hb().querySelector('.gfhearthead .gfsecn').textContent,/Part two/.test(hb().textContent),hb().querySelector('.gfcount').textContent], [12,'Section 6 of 6',false,'12 questions']);
  hb().querySelector('.gfhq[data-k="children"] .gfhchip[data-v="2"]').click();
  hb().querySelector('.gfhq[data-k="seniors"] .gfhchip[data-v="1"]').click();
  c('each answer fills the sixth segment (2 of 12)', state(D)[5], 'now:16.7%');
  c('…the page in section 6\'s red, as each section\'s cards are in theirs', [hb().querySelector('.gfhearthead').dataset.gff,hb().querySelector('.gfheart').dataset.gff,/\.gfheart\[data-gff\] \.gfhchip\.on\{background:var\(--kf\)/.test(html)], ['heart','heart',true]);
  E(`(()=>{ const a={}; for(let n=0;n<10;n++){ const p=GF_ORDER[n]; a[gfKeyOf(p[0],p[1])]=1; } GFS={name:'Ana',a,h:{},i:10,sect:0,done:false,sent:false,ov:GF_TOTAL}; GF_RESUMED=false; gfRender(); })()`);
  c('welcome back shows answers per family', [!!D.getElementById('gfresume'),state(D).join(' ')], [true,'now:40% -:0% -:0% -:0% -:0% -:0%']);
  c('as a progressbar of answers', [hb().querySelector('.gfsegs').getAttribute('aria-valuenow'),hb().querySelector('.gfsegs').getAttribute('aria-valuetext')], ['10','10 of 105 answered']);

  console.log('-- Spanish --');
  const S=page('es');
  await until(()=>S.E('typeof gfRenderSection==="function"'));
  S.E(AT(50,1));
  const SO=S.D.querySelector('#giftbody .gfsect');
  c('opener in Spanish, cited RVA', [SO.querySelector('.gfsecn').textContent,SO.querySelector('h2').textContent,SO.querySelector('.gfso-v cite').textContent,SO.querySelector('.gfso-n').textContent,S.D.getElementById('gfgo').textContent],
    ['Sección 3 de 6','Liderar y organizar','1 Corintios 12:18 · RVA','20 afirmaciones','Continuar']);
  c('the instruction in usted form', SO.querySelector('.gfso-a').textContent, 'Responda lo que es cierto de usted, no lo que se supone que un cristiano debe decir. Nadie está calificando esto.');
  c('the progressbar in Spanish', [S.D.querySelector('#giftbody .gfsegs').getAttribute('aria-label'),S.D.querySelector('#giftbody .gfsegs').getAttribute('aria-valuetext')], ['Progreso','51 de 105 · Sección 3 de 6: Liderar y organizar']);
  S.E(`GFS={name:'Ana',a:{},h:{},i:GF_TOTAL,sect:4,done:false,sent:false,ov:GF_TOTAL}; GF_RESUMED=true; gfRender();`);   // v10.51.3
  { const O6=S.D.querySelector('#giftbody .gfsect');
    c('section 6 in Spanish, cited RVA', O6&&[O6.querySelector('.gfsecn').textContent,O6.querySelector('h2').textContent,O6.querySelector('.gfso-v cite').textContent,O6.querySelector('.gfso-n').textContent,S.D.getElementById('gfgo').textContent],
      ['Sección 6 de 6','Hacia quién se inclina su corazón','Mateo 9:36 · RVA','12 preguntas','Continuar']); }
  S.E(AT(74,3));
  c('the card label in Spanish', S.D.querySelector('#giftbody .gfqn').textContent, 'Llegar más allá de la iglesiaAfirmación 75');

  c('no page errors', allErrs.flat(), []);
  }catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
