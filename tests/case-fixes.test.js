// v10.39 fixes approved with the Make the Case rebuild:
//  · money in real amounts everywhere ($75, $450, $2,500, $12k) — ministry cards,
//    the capacity check's gap sentences, the proposal — while every survey figure
//    (income, $10,000 and over) reads exactly as before;
//  · the survey's #hinge banner ("That is the neighborhood. Now your church.")
//    stays in the survey and never shows inside Make the Case;
//  · the old proposal is no longer contenteditable, and "Save wording" is gone;
//  · EGW.mobilize is DA 141.3 word for word and comma for comma;
//  · the report's lowest-two sentence reads when a gift's name has its own "and";
//  · the gifts "Welcome back" screen has the intro's "Back to results".
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function page(lang){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(lang) w.localStorage.setItem('terrain-lang',lang);
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs};
}

(async()=>{
  const P=page(); await sleep(1500);
  c('no boot errors', P.errs, []);

  console.log('\n-- money in real amounts --');
  c('fmtMoney: dollars below $10,000, thousands from there', P.J(`[null,0,75,125,450,2500,9999.4,10000,12400,52000,98000,-40].map(fmtMoney)`),
    ['—','$0','$75','$125','$450','$2,500','$9,999','$10k','$12k','$52k','$98k','-$40']);
  P.E('DATA='+JSON.stringify(FX.DATA)+';SCOPE="tract"; CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+'); openTool("survey"); render();');
  const txt=()=>P.D.getElementById('sections').textContent.replace(/\s+/g,' ');
  c('the survey still says the incomes as before: $52k here, $98k in the county', /Median household income is \$52k — far below the county's \$98k/.test(P.D.getElementById('brief').textContent.replace(/\s+/g,' ')), true);
  c('…and the income card still reads $52k', /\$52k/.test(txt()), true);
  c('no "$0k" anywhere in the survey and the action plan', /\$0k/.test(txt()), false);
  // v10.45.0: the survey no longer draws its ministries list (DESIGN-SURVEY §1.1); its rows are read from the kept function, as it drew them
  { const rows=JSON.parse(P.E(`(()=>{ const d=document.createElement('div'); d.innerHTML=uMinistriesHTML(suggestions(DATA.M,SCOPE)); return JSON.stringify([...d.querySelectorAll('.u-rowmeta')].map(e=>e.textContent.replace(/\\s+/g,' ').trim())); })()`));
    c('the ministry rows say their cost to the dollar ('+rows.length+' rows)', [rows.length>10,rows.some(t=>/\$0k|· \$0$/.test(t)),rows.filter(t=>/· \$75$/.test(t)).length>0], [true,false,true]);
    // v10.45.0 review round (stale, the new intent): the built-ins the needs show are priced at their source (U_LINES_OWN, review #6): the rows' monthly-only example is the meal schedule ($100 a month), read from its own row
    { const mt=P.E(`(()=>{ const d=document.createElement('div'); d.innerHTML=uRow(uCatalog().find(z=>z.id==='meal-train')); return d.querySelector('.u-rowmeta').textContent.replace(/\\s+/g,' ').trim(); })()`);
      c('…and a ministry with only a monthly cost says that sum, a month ("$100/mo"), not "$0"', /· \$100\/mo$/.test(mt), true); } }
  // v10.45.0 review round (stale, the new intent): the built-ins the needs show are priced at their source (U_LINES_OWN, review #6)
  c('a ministry card’s requirements show the start-up and monthly sums to the dollar', P.E(`uReqHTML(uReq(uCatalog().find(x=>x.id==='pathfinders')))`).includes('<dd>$1,500 / $100</dd>'), true);
  { P.E('CAP=null; capSave('+JSON.stringify(FX.SMALL)+');');
    const g=P.J(`uCheck(uCatalog().find(x=>x.id==='community-dinner')).gaps.filter(t=>/funding/.test(t))`);
    // v10.45.0 review round (stale, the new intent): the built-ins the needs show are priced at their source (U_LINES_OWN, review #6): the community dinner is $350 a month
    c('the capacity check’s gap sentence names real amounts', g, ['$350 monthly funding needed; $60 remains.']);
    P.E('CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+');'); }
  /* Updated when the Make the Case screens replaced the old proposal memo
     (v10.39.0, approved blueprint): the money now reaches the pastor through the
     slides (the capacity and ask slides) rather than the memo's table, and the
     memo's Copy / Download text / Print row became Present live · Share link &
     QR · Download PDF handout. The intent of each check is unchanged. */
  { P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'board',group:'board'}; openTool('case'); render();`);
    const body=()=>P.D.getElementById('casebody');
    const slides=()=>[...body().querySelectorAll('.td-slide')];
    // v10.42: with "Suggest options" (the default; the pastor: "a proposal should give them options") "Let's decide together" is
    // an ask slide just before the ask, so the ask is the last one
    const ask=()=>slides().filter(s=>s.classList.contains('td-t-ask')).pop(), cap=()=>slides().find(s=>s.classList.contains('td-t-capacity'));
    // v10.42.0 fix after review: the Pathfinder club runs by term ("offer 'the first term' instead of a 6-week or 4-week trial"):
    // 13 weeks, so its ceiling is $75 + 4 × $25 = $175
    // v10.45.0 review round (stale, the new intent): the built-ins the needs show are priced at their source (U_LINES_OWN, review #6): Pathfinders $1,500 to start and $100 a month, the term's ceiling $1,500 + 4 × $100
    c('the ask slide’s money in dollars: $1,500 to start, $1,900 ceiling (the first term), never $0k or $3k', [/\$1,500/.test(ask().textContent),/Ceiling\s*\$1,900/.test(ask().textContent),/\$0k|\$3k/.test(body().textContent)], [true,true,false]);
    // v10.41 final review: capacity reads what we have first, then what is needed ("$75 of $2,500" read backwards to the
    // conference's administrators as "$12,000 of $2,500"): "$2,500 free · $75 needed". The intent is unchanged: to the dollar.
    c('…and what is available, to the dollar ($2,500 start-up; $1,000 and $350 a month left)', [/\$2,500\s*free · \$1,500\s*needed/.test(cap().textContent.replace(/\u00a0/g,' ')),/\$1,000\s·\s\$350\sa\smonth/.test(ask().textContent)], [true,true]);

    console.log('\n-- the old proposal is not editable --');
    c('nothing in Make the Case is contenteditable (tapping it opened the phone keyboard)', [body().querySelectorAll('[contenteditable]').length,[...body().querySelectorAll('*')].some(e=>e.isContentEditable===true)], [0,false]);
    c('no "Save wording" button, and no line saying the wording can be edited', [!!P.D.getElementById('u-prop-save'),/edit the wording/.test(body().textContent)], [false,false]);
    // v10.42 part 3 (the pastor asked for a proposal to vote on, PROPOSAL.md): a board's actions add "Proposal to vote on (PDF)"
    c('the actions: Present live, Share link & QR, Download PDF handout, the Proposal to vote on (and the ask list and the sample)', [...body().querySelectorAll('[data-cs-act]')].map(b=>b.textContent), ['Present live','Share link & QR','Download PDF handout','Proposal to vote on (PDF)','Your private ask list','See a sample slideshow']);
    c('wording saved by an older version is no longer pasted over the slides as plain text',
      (()=>{ P.E(`uChurch().proposalText={'pathfinders|board':{signature:'x',text:'OLD WORDING'}}; caseMount(true);`); return [/OLD WORDING/.test(body().textContent),slides().length>=8]; })(), [false,true]);

    // v10.45.0 (stale): the survey asks nothing of the church now (DESIGN-SURVEY §1.1): the "That is the neighborhood. Now your church."
    // banner (#hinge) is gone from every tool
    console.log('\n-- no "Now your church" banner anywhere --');
    c('Make the Case: none', !P.D.getElementById('hinge'), true);
    P.E(`openTool('survey'); applyTool();`);
    c('the Community Survey: none', !P.D.getElementById('hinge'), true);
    P.E(`currentTier=()=>'free'; openTool('survey'); render();`);
    c('the free survey: none', !P.D.getElementById('hinge'), true);
  }

  console.log('\n-- DA 141.3, exactly --');
  c('EGW.mobilize matches The Desire of Ages 141.3, commas included', P.J('EGW.mobilize'), ['Many have gone down to ruin who might have been saved if their neighbors, common men and women, had put forth personal effort for them. Many are waiting to be personally addressed. In the very family, the neighborhood, the town, where we live, there is work for us to do as missionaries for Christ.','Ellen G. White · The Desire of Ages, p. 141']);
  c('…and it is the same text as the verified DA 141.3 in the Make the Case quotes', P.E(`EGW.mobilize[0].endsWith(CASE_QUOTES.find(q=>q.id==='da141_3').en)`), true);

  console.log('\n-- the report’s lowest two --');
  for(const lang of ['en','es']){
    const G=page(lang); await sleep(1500);
    G.E(`openTool('gifts'); GF_VIEW='sample'; gfRender();`);
    const t=G.D.getElementById('giftbody').textContent.replace(/\s+/g,' ');
    if(lang==='en'){
      c('EN: "Administration came back lowest, and so did creative communication and craftsmanship."', /Administration came back lowest, and so did creative communication and craftsmanship\. That is not a fault/.test(t), true);
      c('EN: never "Administration, and creative communication…"', /Administration, and creative/.test(t), false);
      c('EN: two names without an "and" of their own still read "Teaching and mercy came back lowest."', G.E(`(()=>{ const s=gfScores(GF_SAMPLE.answers); return typeof gfAnd==='function'; })()`)&&G.E(`gfCap(gfDones(['teach','mercy']))`)==='Teaching and mercy', true);
    }else{
      c('ES: "El don de administración resultó más bajo, y también el de comunicación creativa y oficios."', /El don de administración resultó más bajo, y también el de comunicación creativa y oficios\. No es un defecto/.test(t), true);
      c('ES: never "los dones de administración, y comunicación…"', /administración, y comunicación/.test(t), false);
    }
    c(`${lang.toUpperCase()}: no errors`, G.errs, []);
  }

  console.log('\n-- "Welcome back" has "Back to results" --');
  { const G=page(); await sleep(1500);
    G.E(`openTool('gifts'); GFS={name:'Joshua Mura',a:{},i:12,sect:-1,done:false,sent:false,h:{},ov:GF_TOTAL,self:true};
      GF_ORDER.slice(0,12).forEach((p,j)=>{ GFS.a[gfKeyOf(p[0],p[1])]=j%5; }); gfSave(); GF_RESUMED=false; GF_VIEW='take'; gfRender();`);
    let h=G.D.getElementById('giftbody');
    c('the pastor part-way through his own: "Welcome back" with "← Back to results" above it, as on the intro', [/Welcome back, Joshua/.test(h.textContent),!!h.querySelector('#gfbackr'),(h.querySelector('#gfbackr')||{}).textContent], [true,true,'← Back to results']);
    c('…first on the screen, like the intro’s', h.firstElementChild&&h.firstElementChild.id, 'gfbackr');
    h.querySelector('#gfbackr').click(); h=G.D.getElementById('giftbody');
    c('…and it goes back to his results (the landing), keeping his answers', [G.E('GF_VIEW'),G.E('Object.keys(GFS.a).length')], ['roster',12]);
    G.E(`LANG='es'; GF_RESUMED=false; GF_VIEW='take'; gfRender();`);
    c('…in Spanish: "Volver a los resultados"', (G.D.querySelector('#giftbody #gfbackr')||{}).textContent, '← Volver a los resultados');
    G.E(`LANG='en'; GIFTS_LINK.on=true; GF_RESUMED=false; gfRender();`);
    c('a member on the church’s link has no results to go back to: no button', [/Welcome back/.test(G.D.getElementById('giftbody').textContent),!!G.D.querySelector('#giftbody #gfbackr')], [true,false]);
    c('no errors', G.errs, []); }

  c('no errors on the survey / case page', P.errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
