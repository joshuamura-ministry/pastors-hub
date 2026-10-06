// Spiritual Gifts report on paper (v10.37): gfReportPDF builds a US Letter
// PDF from the same model the screen draws, with jsPDF's own primitives. Run
// here with the jspdf devDependency injected as window.jspdf (the page loads
// the same 2.5.1 build from cdnjs on first use). Checked: a rich report with
// the neighbourhood, the church and observers (English and Spanish), a sparse
// one (no context, many untested), an under-18 pastor's copy, and the widest
// report the model can produce: %PDF-, three to six pages, a running head and
// foot on every page, no undefined / NaN in the text, every line inside its
// box and the page, Spanish accents kept, family inks used, no active content
// (the real gifts function accepts it for email). Then the page: Download PDF
// (and its print fallback), the lazy loader, Email me my report through the
// real function in every state, and the emailed #gifts-report link.
// Updated for gifts-1.1 (the pastor's decision on SEC-1 part 3): "Email me my
// report" sends a private link with nothing attached; opening that link
// confirms the address. Updated again (one tap): nothing is emailed on open,
// because corporate mail scanners open links in a real browser; the page
// offers "Email me a PDF copy" and the copy goes only when that is tapped.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }

// ---- an in-memory Netlify Blobs store, the subset gifts.mjs uses ----------
function makeStore(){
  const m=new Map();
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; } };
}

(async()=>{ try{
  delete process.env.TERRAIN_CODES;
  process.env.RESEND_API_KEY='re_test'; process.env.GIFTS_FROM='Terrain <reports@example.org>';
  globalThis.__terrainGiftsStore=makeStore();
  // Resend, as the function sees it: every send is recorded, none leaves the machine.
  const sent=[]; let resendOk=true;
  globalThis.fetch=async(u,o={})=>{ if(/api\.resend\.com/.test(String(u))){ sent.push(JSON.parse(o.body)); return {ok:resendOk,status:resendOk?200:500,json:async()=>({})}; }
    throw new Error('no network in tests'); };
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','gifts.mjs'))).default;
  const call=async body=>{ const r=await handler(new Request('https://pastorshub.org/.netlify/functions/gifts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{}); return {status:r.status,j:JSON.parse(await r.text())}; };

  const calls=[]; let override=null;
  function page(url,{lang,noJspdf}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.print=()=>{ w.__printed=(w.__printed||0)+1; };
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        if(!noJspdf) w.jspdf=jspdf;
        w.fetch=async(u,o={})=>{
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/gifts/.test(u)){
            const body=o.body?JSON.parse(o.body):{};
            calls.push(body);
            if(override){ const r=await override(body); if(r) return r; }
            const res=await handler(new Request('https://pastorshub.org'+u,{method:o.method||'GET',headers:o.headers,body:o.body}),{});
            const t=await res.text();
            return {ok:res.ok,status:res.status,json:async()=>JSON.parse(t)};
          }
          return new Promise(()=>{});
        };
      }});
    // v10.38.0: the app sends no email for now (GF_EMAIL_ENABLED=false, see
    // tests/email-off.test.js). These journeys keep the email paths covered by
    // switching it on, exactly as a later release will.
    dom.window.eval('GF_EMAIL_ENABLED=true');
    return {w:dom.window,errs};
  }

  const P=page('https://pastorshub.org/');
  const w=P.w, E=s=>w.eval(s), J=s=>JSON.parse(E(`JSON.stringify(${s})`));
  await until(()=>E('typeof gfReportPDF==="function"&&typeof GIFTS_ES==="object"'));
  E(String.raw`
  window.__T={};
  __T.PROFILES={
    teacher:{teach:[4,4,3,3,4],shep:[4,3,3,3,3],encour:[3,3,3,2,2],hosp:[4,3,2,-1,-1],wisdom:[3,3,2,2,2],mercy:[3,2,2,1,2],inter:[3,2,-1,-1,-1]}};
  __T.answers=function(kind){ const a={};
    GIFTS.forEach((g,gi)=>{ let v;
      if(kind==='allhigh') v=[4,4,3,4,4].map((x,k)=>(gi+k)%9===0?3:x);
      else if(kind==='untested') v=[3,3,-1,-1,-1].map((x,k)=>(gi%3===0&&k<2)?2:x);
      else { const hi=__T.PROFILES[kind]; v=(hi&&hi[g.id])||[1+gi%3,1+(gi*7)%3,gi%2,(gi*5)%3,gi%3]; }
      v.forEach((x,k)=>a[g.id+'.'+k]=x); });
    return a; };
  __T.RICH={church:'Bucks County SDA',fac:['kitchen','classrooms'],churchId:'cid',
    min:{'Small groups':'s','Greeting and hospitality':'r','Adult Sabbath School teaching':'r','Community services and food distribution':'r','Children’s Sabbath School':'r','Sound, livestream and video':'r','Prayer ministry':'s'},
    needs:[{id:'kids',v:27,x:null},{id:'single-parent',v:35,x:null},{id:'lang-primary',v:19,x:'Spanish'},{id:'rent50',v:24,x:null},
      {id:'seniors-alone',v:9,x:null},{id:'shift-race',v:9,x:'Hispanic / Latino'},{id:'growth',v:470,x:null},{id:'older-area',v:41,x:null},
      {id:'gini',v:48,x:null},{id:'grief',v:9,x:'alone'},{id:'snap',v:17,x:null},{id:'college',v:22,x:null}],
    area:'Census Tract 2041.02',year:2024};
  __T.model=function(kind,o){ o=o||{}; const a=__T.answers(kind); const S=gfScores(a,o.obs||null);
    return gfReportModel(S,null,{own:o.own!==false,name:o.name||'María José López-Hernández',church:o.church,date:'2026-09-28',heart:o.heart||{},
      minor:!!o.minor,observers:o.observers||null,flags:gfFlags(a),ctx:o.ctx===undefined?null:o.ctx}); };
  __T.SC={
    rich:()=>__T.model('teacher',{ctx:__T.RICH,heart:{children:2,families:1,newcomers:1},observers:[{name:'Pat Leader',ratings:{teach:4,shep:3}},{name:'Ana Ruiz',ratings:{teach:3,shep:4}}],obs:{teach:[4,3],shep:[3,4]}}),
    sparse:()=>__T.model('untested',{ctx:null,name:'Sam Ortiz'}),
    minor:()=>__T.model('teacher',{minor:true,own:false,ctx:__T.RICH,heart:{teens:2,children:2},name:'Sam Youth'}),
    widest:()=>__T.model('allhigh',{minor:true,own:false,ctx:__T.RICH,heart:{teens:2,children:2,seekers:1},name:'Sam Youthful-Longname Rodriguez-Hernandez'})
  };
  // Build one PDF and report on it: bytes, pages, the logged lines, the text in the page streams.
  __T.pdf=function(sc,compress){ const M=__T.SC[sc](); const d=gfReportPDF(M,{compress:compress!==false});
    const n=d.getNumberOfPages(), pages=[]; for(let i=1;i<=n;i++) pages.push(d.internal.pages[i].join('\n'));
    const bytes=d.output(); const log=d.__gfLog;
    const out=log.filter(l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5||l.x0<53.5||l.x1>558.5||(!l.hf&&(l.y<70||l.y>734.5))).map(l=>l.t.slice(0,40)+' @'+l.p);
    const heads=[]; for(let i=1;i<=n;i++){ const h=log.filter(l=>l.p===i&&l.hf).map(l=>l.t); heads.push(h); }
    return {n,name:M.name,first:M.first,lang:M.lang,start:bytes.slice(0,5),size:bytes.length,b64:d.output('datauristring').split(',')[1],
      text:log.map(l=>l.t).join('\n'),streams:pages.join('\n'),out,heads,lines:log.length,file:gfPdfName(M),raw:compress===false?bytes:''}; };
  `);

  console.log('-- the PDF, built in the browser model --');
  const R={};
  for(const [sc,lang] of [['rich','en'],['rich','es'],['sparse','en'],['minor','en'],['minor','es'],['widest','es']]){
    E(`LANG='${lang}'`);
    const k=sc+'-'+lang, r=J(`__T.pdf('${sc}')`); R[k]=r;
    c(`${k}: a PDF of 3 to 6 pages`, [r.start,r.n>=3&&r.n<=6], ['%PDF-',true]);
    c(`${k}: no undefined / NaN / null / [object in what is drawn or in the page streams`, [/\b(undefined|NaN|null)\b|\[object/.test(r.text),/\b(undefined|NaN)\b|\[object/.test(r.streams)], [false,false]);
    c(`${k}: every line inside its box, the margins and the page`, r.out, []);
    const H=lang==='es'?'Informe de dones espirituales':'Spiritual Gifts Report';
    c(`${k}: "${H} · name" and "Page n of N" on every page`, r.heads.every((h,i)=>h.includes(`${H} · ${r.name.normalize('NFC')}`)&&h.includes(lang==='es'?`Página ${i+1} de ${r.n}`:`Page ${i+1} of ${r.n}`)), true);
    c(`${k}: never "Sample"`, /\bSample\b|\bMuestra\b/i.test(r.text), false);
  }
  E(`LANG='en'`);
  c('rich report: every section is on paper', ['YOUR GIFTS, AND THE EVIDENCE BEHIND EACH','POTENTIAL GIFTS TO TRY','WHERE YOUR GIFTS MEET YOUR NEIGHBORHOOD','WHERE YOU COULD SERVE AT BUCKS COUNTY SDA',
    'HOW TO GET INVOLVED','ALL TWENTY-ONE, STRONGEST FIRST','YOUR LEADING GIFTS, READ CLOSELY','AREAS TO GROW'].filter(h=>!R['rich-en'].text.includes(h)), []);
  // v10.54.2: "Your first ninety days" is "How to get involved", and a member's own copy has no "What happens next" (the pastor: "the
  // first 90 days, I don't know what that is … just a very simple steps on how to get involved", "Don't wait for a ministry [leader] to follow up")
  c('rich report: the neighbourhood figures, their source and the confirmations', [/27%/.test(R['rich-en'].text),R['rich-en'].text.includes('Community Survey · Census Tract 2041.02 · ACS 2020–2024'),/Confirmed by 2 people who know you \(P\., A\.\)\./.test(R['rich-en'].text)], [true,true,true]);
  c('rich report in Spanish: accents and Spanish quotation marks kept', ['Enseñanza','Sección censal 2041.02','Página 1 de','«','dones espirituales'].filter(x=>!R['rich-es'].text.includes(x)), []);
  c('no English report headings left in the Spanish PDF', /Your gifts|Why you|First step|What the work is|Potential gifts|NEIGHBORHOOD|All twenty-one|For the pastor|Page \d/i.test(R['rich-es'].text), false);
  c('sparse report: no neighbourhood or church sections, the untested key is drawn', [/NEIGHBORHOOD/.test(R['sparse-en'].text),/SERVE AT/.test(R['sparse-en'].text),/Striped: untested/.test(R['sparse-en'].text)], [false,false,true]);
  // The "Striped: untested" key is there only when a bar is striped: a report whose
  // note says every gift was answered no longer carries a key for nothing.
  const keyRows=['rich','sparse','minor','widest'].map(sc=>J(`(()=>{ const M=__T.SC['${sc}'](); const t=gfReportPDF(M).__gfLog.map(l=>l.t).join(' ');
    const d=document.createElement('div'); d.innerHTML=gfReportHTML(M,M.own);
    return {sc:'${sc}',unt:M.flags.untested,paper:/Striped: untested/.test(t),screen:!!d.querySelector('.gfr-key')}; })()`));
  c('the striped key is drawn exactly when a gift is striped, on paper and on screen', keyRows.filter(r=>r.paper!==(r.unt>0)||r.screen!==(r.unt>0)), []);
  c('both cases occur among these reports', [keyRows.some(r=>r.unt>0),keyRows.some(r=>r.unt===0)], [true,true]);
  c('under-18 pastor\'s copy: For the pastor, Under 18, kept for one year', [/FOR THE PASTOR/.test(R['minor-en'].text),/UNDER 18/.test(R['minor-en'].text),/kept for one year/.test(R['minor-en'].text)], [true,true,true]);
  c('the widest report the model makes still fits in six pages', R['widest-es'].n<=6, true);
  // An under-18's "Try this" steps are the youth ones (GF_TRY_YOUTH) on paper
  // too: each of the 21 gifts made the one potential gift of a minor's report.
  E(String.raw`__T.potFor=function(id,minor){ const a={}; const strong=GIFTS.map(g=>g.id).filter(x=>x!==id).slice(0,3);
    GIFTS.forEach(g=>{ const v=strong.includes(g.id)?[4,4,4,4,4]:g.id===id?[4,3,1,1,1]:[0,0,0,0,0]; v.forEach((x,k)=>a[g.id+'.'+k]=x); });
    return gfReportModel(gfScores(a),null,{own:false,name:'Sam Youth',date:'2026-09-28',minor:!!minor,heart:{teens:2},flags:gfFlags(a),ctx:__T.RICH}); };
  __T.flat=t=>gfPdfClean(t).replace(/\s+/g,' ').trim();`);
  for(const lang of ['en','es']){
    E(`LANG='${lang}'`);
    const li=lang==='es'?1:0;
    const bad=J(`GIFTS.map(g=>{ const M=__T.potFor(g.id,true); const d=gfReportPDF(M); const t=__T.flat(d.__gfLog.filter(l=>!l.hf).map(l=>l.t).join(' '));
      const ok=M.potential.some(p=>p.id===g.id&&p.youth)&&t.includes(__T.flat(GF_TRY_YOUTH[g.id][${li}]))&&!t.includes(__T.flat(GF_TRY[g.id][${li}]));
      return ok?null:g.id; }).filter(Boolean)`);
    c(`${lang}: a minor's PDF carries the youth "Try this" step for each of the 21 gifts, never the adult one`, bad, []);
  }
  c('the sample minor report (Spanish) has youth steps, all of them on paper', J(`(()=>{ const M=__T.SC.minor(); const t=__T.flat(gfReportPDF(M).__gfLog.filter(l=>!l.hf).map(l=>l.t).join(' '));
    return [M.potential.length>0,M.potential.every(p=>p.youth&&p.step===GF_TRY_YOUTH[p.id][1]&&t.includes(__T.flat(p.step)))]; })()`), [true,true]);
  E(`LANG='en'`);
  c('…and in English', J(`(()=>{ const M=__T.SC.minor(); const t=__T.flat(gfReportPDF(M).__gfLog.filter(l=>!l.hf).map(l=>l.t).join(' '));
    return [M.potential.length>0,M.potential.every(p=>p.youth&&p.step===GF_TRY_YOUTH[p.id][0]&&t.includes(__T.flat(p.step)))]; })()`), [true,true]);
  // No two lines on one page print over each other. The "every line inside its box"
  // check above is horizontal only; this one is vertical. Leading gifts are drawn in
  // bold in the all-twenty-one chart, and four names fit one line in regular weight
  // but wrap in bold (Encouragement and exhortation, Mission and pioneering ministry,
  // Proclamación bíblica y profecía, Comunicación creativa y oficios).
  E(String.raw`__T.clash=function(M){ const d=gfReportPDF(M); const L=d.__gfLog.filter(l=>!l.hf); const out=[];
    for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++){ const a=L[i],b=L[j];
      if(a.p===b.p&&Math.abs(a.y-b.y)<4.5&&Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>1) out.push(a.t.slice(0,24)+' / '+b.t.slice(0,24)+' @'+a.p); }
    return out; };
  __T.lead=function(ids){ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=ids.includes(g.id)?4:(g.id==='teach'?3:1); });
    const S=gfScores(a); return gfReportModel(S,null,{own:true,name:'Ana López',date:'2026-09-28',ctx:null,flags:gfFlags(a)}); };`);
  for(const [lang,ids] of [['en',['encour']],['en',['mission']],['en',['encour','mission']],['es',['proclaim']],['es',['creative']],['es',['creative','proclaim']]]){
    E(`LANG='${lang}'`);
    c(`${lang}, ${ids.join(' + ')} leading: no two lines overprint (bold names measured in bold)`, J(`__T.clash(__T.lead(${JSON.stringify(ids)}))`), []);
  }
  for(const [sc,lang] of [['rich','en'],['rich','es'],['sparse','en'],['minor','es'],['widest','es']]){
    E(`LANG='${lang}'`);
    c(`${sc}-${lang}: no two lines overprint`, J(`__T.clash(__T.SC['${sc}']())`), []);
  }
  E(`LANG='en'`);
  const raw=J(`__T.pdf('rich',false)`), rawEs=(E(`LANG='es'`),J(`__T.pdf('rich',false)`)); E(`LANG='en'`);
  c('Spanish letters travel as WinAnsi bytes (ñ is F1, é is E9)', [rawEs.raw.includes('Enseñanza'),rawEs.raw.includes('María José')], [true,true]);
  // jsPDF writes a fill to two decimals and a text colour to three.
  const rg=(hex,d)=>{ const n=parseInt(hex.slice(1),16); return [n>>16&255,n>>8&255,n&255].map(v=>(v/255).toFixed(d).replace(/0+$/,'')).join(' ')+' rg'; };
  c('the five family inks are on the page', ['#0E8F6E','#BE3E68','#C2760B','#7C3AED','#2563EB'].filter(h=>!raw.raw.includes(rg(h,2))&&!raw.raw.includes(rg(h,3))), []);
  c('no scripts, forms, attachments or embedded files', /\/(JavaScript|JS|AcroForm|EmbeddedFile|EmbeddedFiles|Launch|RichMedia|XFA|ObjStm|SubmitForm|FileAttachment|URI|GoToR)\b/.test(raw.raw), false);
  c('the only open action is jsPDF\'s page view, not a script', (raw.raw.match(/\/OpenAction[^\n]*/g)||[]).every(a=>/^\/OpenAction \[\d+ 0 R \/Fit\w* ?(null)?\]$/.test(a)), true);
  c('the member\'s name in the file name, ASCII only', R['rich-en'].file, 'Maria-LopezHernandez-Spiritual-Gifts-2026-09-28.pdf');
  c('a one-word name and a blank one', [E(`gfPdfName({name:'Lee',date:'2026-01-02'})`),E(`gfPdfName({name:'',date:'2026-01-02'})`)], ['Lee-Spiritual-Gifts-2026-01-02.pdf','Spiritual-Gifts-2026-01-02.pdf']);
  c('the compressed file is small enough to email (under 3 MB)', R['rich-en'].size<3*1024*1024, true);

  const odd=J(`(()=>{ const d=gfReportPDF(gfReportModel(gfScores(__T.answers('teacher')),null,{own:false,name:'王小明 🙏',church:'Iglesia «Central» – Norte 🙂',date:'2026-09-28',ctx:null}));
    const L=d.__gfLog; return {n:d.getNumberOfPages(),title:L.filter(l=>!l.hf)[1].t,head:L.find(l=>l.hf).t,foot:L.filter(l=>l.hf)[2].t,out:L.filter(l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5).length}; })()`);
  c('a name the fonts cannot print: a plain title and head, nothing garbled', [odd.title,odd.head,odd.foot,odd.out,odd.n>=3], ['This member','Spiritual Gifts Report','Iglesia «Central» – Norte',0,true]);

  console.log('-- text made safe for the built-in fonts --');
  c('minus, ellipsis and arrow mapped; curly quotes, dashes and accents kept; emoji dropped',
    E(`gfPdfClean('−3 … a→b “¿Qué?” – José’s — niño 🙏 ok')`), '-3 ... a->b “¿Qué?” – José’s — niño ok');
  c('a letter the fonts lack keeps its base letter; invisible characters go', E(`gfPdfClean('Łódź Ő\u200bx\u00a0y')`), 'Lódz Ox y');
  c('undefined and null become empty', [E(`gfPdfClean(undefined)`),E(`gfPdfClean(null)`)], ['','']);

  console.log('-- the function accepts it for email, once the address is confirmed --');
  const camp=await call({op:'id',church:'Bucks County SDA'});
  const code=E(`(()=>{ GF_CTX={church:'Bucks County SDA',churchId:'cid',fac:[],min:{}}; GFS={name:'Ana Ruiz',a:__T.answers('teacher'),h:{},minor:false,memberId:'m1',i:GF_TOTAL,done:true}; const c=gfEncode(); GF_CTX=null; return c; })()`);
  const sub=await call({op:'submit',pub:camp.j.pub,code,name:'Ana Ruiz',email:'ana@example.org',emailOk:true,minor:false,lang:'en'});
  const vtokOf=m=>{ const x=/#gifts-report=[^.\s]+\.[^.\s]+\.[^.\s]+\.([A-Za-z0-9_-]{32})/.exec(m&&m.text||''); return x?x[1]:null; };
  const lk=await call({op:'email',pub:camp.j.pub,rid:sub.j.rid,token:sub.j.token,pdf:R['rich-en'].b64,lang:'en'});
  c('op email sends the private link, with nothing attached (a PDF sent with it is ignored)', [lk.status,lk.j.ok,'attachments' in sent[sent.length-1],!!vtokOf(sent[sent.length-1])], [200,true,false,true]);
  // Updated in the security review of gifts-1.1: emailpdf carries the link's VTOK.
  const V=vtokOf(sent[sent.length-1]);
  const pre=await call({op:'emailpdf',pub:camp.j.pub,rid:sub.j.rid,token:sub.j.token,vtok:V,pdf:R['rich-en'].b64,lang:'en'});
  c('the PDF copy before the link is opened → 403 not-verified', [pre.status,pre.j.error], [403,'not-verified']);
  await call({op:'verify',pub:camp.j.pub,rid:sub.j.rid,token:sub.j.token,vtok:V});
  const em=await call({op:'emailpdf',pub:camp.j.pub,rid:sub.j.rid,token:sub.j.token,vtok:V,pdf:R['rich-en'].b64,lang:'en'});
  c('op emailpdf takes the PDF once the link was opened: 200 ok', [em.status,em.j.ok], [200,true]);
  const last=sent[sent.length-1]||{};
  c('Resend is given the same PDF as an attachment', [last.to&&last.to[0],!!(last.attachments&&Buffer.from(last.attachments[0].content,'base64').toString('latin1').startsWith('%PDF-')),last.attachments&&/\.pdf$/.test(last.attachments[0].filename)], ['ana@example.org',true,true]);
  const emU=await call({op:'emailpdf',pub:camp.j.pub,rid:sub.j.rid,token:sub.j.token,vtok:V,pdf:Buffer.from(raw.raw,'latin1').toString('base64'),lang:'en'});
  c('the uncompressed build passes the active-content check too', [emU.status,emU.j.ok], [200,true]);

  // The page's own result, with its own address (each result may be emailed three times).
  const sub2=await call({op:'submit',pub:camp.j.pub,code,name:'Ana Ruiz',email:'ann@example.org',emailOk:true,minor:false,lang:'en'});

  console.log('-- Download PDF on the page --');
  const saves=[]; jspdf.jsPDF.API.save=function(n){ saves.push({n,pages:this.getNumberOfPages()}); return this; };
  E(`openTool('gifts'); GF_SERVER={ok:true,email:true}; GF_PUB_TARGET='${camp.j.pub}'; GF_CTX=__T.RICH;
     GFS={name:'Ana Ruiz',a:__T.answers('teacher'),h:{children:2},i:GF_TOTAL,done:true,sent:true,minor:false,email:'ann@example.org',emailOk:true,hasEmail:true,
       pub:'${camp.j.pub}',rid:'${sub2.j.rid}',token:'${sub2.j.token}',ov:GF_TOTAL}; GF_VIEW='take'; gfRender();`);
  const D=w.document;
  D.getElementById('gfpdf').click();
  await until(()=>saves.length===1);
  c('Download PDF saves <First>-<Last>-Spiritual-Gifts-<date>.pdf, built from the report on screen', [saves.length,/^Ana-Ruiz-Spiritual-Gifts-\d{4}-\d{2}-\d{2}\.pdf$/.test(saves[0]&&saves[0].n),saves[0]&&saves[0].pages>=3], [1,true,true]);
  c('the button is ready again afterwards', [D.getElementById('gfpdf').disabled,D.getElementById('gfpdf').textContent], [false,'Download PDF']);
  // the PDF maker cannot load: the print sheet instead, and a word about it
  E(`window.__jl=gfLoadJsPDF; gfLoadJsPDF=()=>Promise.reject(new Error('offline'));`);
  const pr=w.__printed||0;
  D.getElementById('gfpdf').click();
  await until(()=>(w.__printed||0)>pr);
  c('offline: the print view opens, with a note saying so', [(w.__printed||0)-pr,/Save as PDF/.test(D.getElementById('gfactnote').textContent)], [1,true]);
  E(`gfLoadJsPDF=window.__jl;`);
  c('the print sheet is light, without buttons or forms, cards kept whole', ['@media print{\n  .gfrep{--bg:#fff','.gfrep .gfr-actions,.gfrep>div.gfcard{display:none}','break-inside:avoid'].every(x=>html.includes(x)), true);

  console.log('-- the loader --');
  const L0=page('https://pastorshub.org/',{noJspdf:true});
  await until(()=>L0.w.eval('typeof gfLoadJsPDF==="function"'));
  const lp=L0.w.eval('window.__lp=gfLoadJsPDF(); window.__lp.then(()=>"ok",e=>"failed:"+e.message).then(v=>window.__lr=v); 1');
  const s0=L0.w.document.querySelector('script[src*="jspdf"]');
  c('first use adds jsPDF 2.5.1 from cdnjs, pinned by SRI', [s0&&s0.src,s0&&s0.getAttribute('integrity'),s0&&s0.getAttribute('crossorigin')],
    ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==','anonymous']);
  c('a second tap waits on the same load', L0.w.eval('gfLoadJsPDF()===window.__lp'), true);
  s0.dispatchEvent(new L0.w.Event('error'));
  await until(()=>L0.w.__lr);
  c('a failed load rejects, and the next tap may try again', [L0.w.__lr,L0.w.document.querySelectorAll('script[src*="jspdf"]').length,L0.w.eval('GF_JSPDF_P')], ['failed:load',0,null]);
  L0.w.eval('gfLoadJsPDF().then(J=>window.__lr2=typeof J,()=>window.__lr2="failed")');
  const s1=L0.w.document.querySelector('script[src*="jspdf"]');
  L0.w.jspdf=jspdf; s1.dispatchEvent(new L0.w.Event('load'));
  await until(()=>L0.w.__lr2);
  c('a load that succeeds hands back window.jspdf.jsPDF', L0.w.__lr2, 'function');

  console.log('-- Email me my report --');
  c('offered to the adult who consented, whose result is on the server with an address', !!D.getElementById('gfemail'), true);
  sent.length=0;
  D.getElementById('gfemail').click();
  c('sending: the button says so and is off', [D.getElementById('gfemail').disabled,/Sending/.test(D.getElementById('gfemail').textContent)], [true,true]);
  await until(()=>/Check your inbox/.test(D.getElementById('gfactnote').textContent));
  const req=calls.filter(x=>x.op==='email').pop();
  c('op email: pub, rid, token and the language — no PDF is built or sent', [req.pub===camp.j.pub,req.rid===sub2.j.rid,req.token===sub2.j.token,'pdf' in req,req.lang], [true,true,true,false,'en']);
  c('sent: "Check your inbox" with the masked address, the button done', [D.getElementById('gfactnote').textContent,D.getElementById('gfemail').textContent,D.getElementById('gfemail').disabled,sent.length],
    ['Check your inbox: we sent a link to a•••@example.org. Open it on this phone or any device to see your report; from there you can have a PDF copy emailed to you.','Sent',true,1]);
  c('the email that went is the link, with nothing attached', ['attachments' in sent[0],!!vtokOf(sent[0])], [false,true]);
  c('Download PDF stays on the page', [!!D.getElementById('gfpdf'),D.getElementById('gfpdf').disabled], [true,false]);
  c('the address is never shown in full', D.getElementById('giftbody').textContent.includes('ann@example.org'), false);
  c('masking', [E(`gfMaskEmail('maria@gmail.com')`),E(`gfMaskEmail('x')`),E(`gfMaskEmail('')`)], ['m•••@gmail.com','','']);
  // the day's limit
  override=b=>b.op==='email'?{ok:false,status:429,json:async()=>({ok:false,error:'daily-limit'})}:null;
  E(`gfRender();`); D.getElementById('gfemail').click();
  await until(()=>/tomorrow/.test(D.getElementById('gfactnote').textContent));
  c('daily limit: "try again tomorrow", and the button stays off', [/Please try again tomorrow\./.test(D.getElementById('gfactnote').textContent),D.getElementById('gfemail').disabled], [true,true]);
  // a network failure
  override=b=>{ if(b.op==='email') throw new Error('network'); return null; };
  E(`gfRender();`); D.getElementById('gfemail').click();
  await until(()=>D.querySelector('#gfactnote .gfemdl'));
  c('offline: says so, offers the PDF instead, and lets them try again', [/offline/.test(D.getElementById('gfactnote').textContent),!!D.querySelector('#gfactnote .gfemdl'),D.getElementById('gfemail').disabled], [true,true,false]);
  const before=saves.length; D.querySelector('#gfactnote .gfemdl').click();
  await until(()=>saves.length>before);
  c('the offered PDF downloads', saves.length, before+1);
  // email switched off on the server
  override=null; delete process.env.RESEND_API_KEY;
  E(`gfRender();`); D.getElementById('gfemail').click();
  await until(()=>/not available/.test(D.getElementById('gfactnote').textContent));
  c('email off: the button goes, the PDF is offered', [D.getElementById('gfemail').hidden,!!D.querySelector('#gfactnote .gfemdl')], [true,true]);
  process.env.RESEND_API_KEY='re_test';
  // Spanish
  E(`LANG='es'; gfRender();`); D.getElementById('gfemail').click();
  await until(()=>/Revise su correo/.test(D.getElementById('gfactnote').textContent));
  c('in Spanish: "Revise su correo: le enviamos un enlace a a•••@example.org…"', D.getElementById('gfactnote').textContent,
    'Revise su correo: le enviamos un enlace a a•••@example.org. Ábralo en este teléfono o en cualquier otro dispositivo para ver su informe; desde allí puede pedir que le enviemos una copia en PDF.');
  c('the Spanish request asks for the Spanish email', calls.filter(x=>x.op==='email').pop().lang, 'es');
  E(`LANG='en'`);
  // eligibility
  E(`GFS.minor=true; gfRender();`); c('never for an under-18', !!D.getElementById('gfemail'), false);
  E(`GFS.minor=false; GFS.hasEmail=false; gfRender();`); c('not when the server kept no address', !!D.getElementById('gfemail'), false);
  E(`GFS.hasEmail=true; GFS.emailOk=false; gfRender();`); c('not without consent', !!D.getElementById('gfemail'), false);
  E(`GFS.emailOk=true; GF_SERVER={ok:true,email:false}; gfRender();`); c('not when the server cannot send', !!D.getElementById('gfemail'), false);
  // appears once the result is sent, without redrawing the page
  E(`GF_SERVER={ok:true,email:true}; GFS.sent=false; delete GFS.rid; delete GFS.token; delete GFS.hasEmail; gfRender();`);
  c('before the result is sent: no email button yet', !!D.getElementById('gfemail'), false);
  // v10.54.2: the result goes by itself when the report is drawn (the button only when it did not go through)
  if(D.getElementById('gfsend')) D.getElementById('gfsend').click();
  await until(()=>D.getElementById('gfemail'));
  c('once it is sent: "Email me my report" appears beside Download PDF', [!!D.getElementById('gfemail'),D.getElementById('gfpdf').nextElementSibling===D.getElementById('gfemail')], [true,true]);

  console.log('-- the emailed link: #gifts-report --');
  const rid=E('GFS.rid'), token=E('GFS.token');
  const Rp=page(`https://pastorshub.org/#gifts-report=${camp.j.pub}.${rid}.${token}`);
  await until(()=>Rp.w.document.getElementById('gfdelmine'));
  const RD=Rp.w.document, has=id=>!!RD.getElementById(id);
  c('read-only: Download PDF and Delete my result, nothing else', [has('gfpdf'),has('gfdelmine'),has('gfemail'),has('gfinvite'),has('gfsendbox'),has('gfredo')], [true,true,false,false,false,false]);
  const sv=saves.length; RD.getElementById('gfpdf').click();
  await until(()=>saves.length>sv);
  c('its Download PDF works', /^Ana-Ruiz-Spiritual-Gifts-/.test(saves[saves.length-1].n), true);
  const dels=()=>calls.filter(x=>x.op==='delete').length, d0=dels();
  RD.getElementById('gfdelmine').click();
  c('delete: the first tap only asks (no dialog, nothing sent), and says what it will do', [/Tap again/.test(RD.getElementById('gfdelmine').textContent),dels(),/cannot be undone/.test(RD.getElementById('gfdelnote').textContent)], [true,d0,true]);
  RD.getElementById('gfdelmine').click();
  await until(()=>/has been deleted/.test(RD.getElementById('giftbody').textContent));
  const dl=calls.filter(x=>x.op==='delete').pop();
  c('the second tap deletes it with the member\'s token', [dl.pub,dl.rid,dl.token,'key' in dl], [camp.j.pub,rid,token,false]);
  c('gone from the server', [...globalThis.__terrainGiftsStore.m.keys()].includes(`r/${camp.j.pub}/${rid}`), false);

  // Updated (one tap): opening the link only confirms the address. A mail
  // scanner (Safe Links, Proofpoint, Mimecast) opens links in a real browser,
  // so the PDF copy waits for the member's tap on "Email me a PDF copy".
  console.log('-- the link email opened: the address confirmed, the PDF copy only on a tap (gifts-1.1) --');
  const sub3=await call({op:'submit',pub:camp.j.pub,code,name:'Ana Ruiz',email:'open@example.org',emailOk:true,minor:false,lang:'en'});
  await call({op:'email',pub:camp.j.pub,rid:sub3.j.rid,token:sub3.j.token,lang:'en'});
  const url3=(/https:\/\/pastorshub\.org\/#gifts-report=\S+/.exec(sent[sent.length-1].text)||[''])[0];
  c('the link email carries pub.rid.token.vtok', new RegExp(`#gifts-report=${camp.j.pub}\\.${sub3.j.rid}\\.${sub3.j.token}\\.[A-Za-z0-9_-]{32}$`).test(url3), true);
  const V3=url3.slice(-32);
  const rec3=()=>JSON.parse(globalThis.__terrainGiftsStore.m.get(`r/${camp.j.pub}/${sub3.j.rid}`));
  const pdfCalls=rid=>calls.filter(x=>x.op==='emailpdf'&&x.rid===rid).length;
  const n3=sent.length;
  const Rv=page(url3), RvD=Rv.w.document;
  await until(()=>RvD.getElementById('gfmailpdf')&&RvD.getElementById('gfpdf'),8000);
  await sleep(500);   // time for anything that would have gone on its own
  c('first open (as a mail scanner would): verify is called with the link\'s token, and no emailpdf call, nothing emailed',
    [calls.some(x=>x.op==='verify'&&x.rid===sub3.j.rid&&x.vtok===V3),pdfCalls(sub3.j.rid),sent.length-n3,rec3().pdfs,rec3().emailVerified], [true,0,0,0,true]);
  c('the line above the report says the address is confirmed and offers the copy, one tap',
    [RvD.getElementById('gfmailnote').dataset.state,RvD.querySelector('#gfmailnote .note').textContent,RvD.getElementById('gfmailpdf').textContent,RvD.getElementById('gfmailpdf').disabled,RvD.querySelector('.gfrep').firstElementChild.id],
    ['ready','Your email address is confirmed.','Email me a PDF copy',false,'gfmailnote']);
  c('after verify, the verification token is gone from the address bar; pub.rid.token stay',
    [Rv.w.location.hash,Rv.w.location.href.includes(V3)], [`#gifts-report=${camp.j.pub}.${sub3.j.rid}.${sub3.j.token}`,false]);
  c('…and it is kept in memory for the button, and in this tab only (sessionStorage), for a reload', [Rv.w.eval('GIFTS_LINK.vtok'),Rv.w.sessionStorage.getItem(`terrain-gifts-vtok:${camp.j.pub}.${sub3.j.rid}`),Rv.w.localStorage.getItem(`terrain-gifts-vtok:${camp.j.pub}.${sub3.j.rid}`)], [V3,V3,null]);
  { const Rx=page(url3); await until(()=>Rx.w.document.getElementById('gfmailpdf'),8000); await sleep(300);
    c('opened a second time before any tap (the scanner, then the member): still nothing emailed, the button again', [pdfCalls(sub3.j.rid),sent.length-n3,Rx.w.document.getElementById('gfmailnote').dataset.state], [0,0,'ready']);
    c('no page errors there', Rx.errs, []); }
  override=async b=>{ if(b.op==='emailpdf') await sleep(400); return null; };   // hold the send so its state can be seen
  const tapBtn=RvD.getElementById('gfmailpdf');
  tapBtn.click(); tapBtn.click();   // a double tap
  await until(()=>RvD.getElementById('gfmailnote').dataset.state==='sending',8000);
  c('tapped: the line says the PDF copy is being prepared, and the button is gone', [RvD.getElementById('gfmailnote').dataset.state,RvD.querySelector('#gfmailnote .note').textContent,!!RvD.getElementById('gfmailpdf')], ['sending','Preparing a PDF copy for your inbox…',false]);
  await until(()=>RvD.getElementById('gfmailnote').dataset.state==='sent',8000);
  override=null;
  c('…then that it is on its way', RvD.getElementById('gfmailnote').textContent.trim(), 'A PDF copy is on its way to your inbox.');
  await sleep(300);
  const pdfMail=sent[sent.length-1];
  c('the tap sends exactly once: one emailpdf call, one email, the PDF attached, to the member', [pdfCalls(sub3.j.rid),sent.length-n3,pdfMail.to[0],!!(pdfMail.attachments&&Buffer.from(pdfMail.attachments[0].content,'base64').toString('latin1').startsWith('%PDF-')),pdfMail.subject], [1,1,'open@example.org',true,'Your spiritual gifts report (PDF)']);
  c('the record is confirmed, with one PDF copy sent', [rec3().emailVerified,rec3().pdfs], [true,1]);
  // Security review of gifts-1.1: the server sends a PDF copy only with the
  // emailed VTOK (the result's token alone is what a submitter holds).
  { const ep=calls.filter(x=>x.op==='emailpdf'&&x.rid===sub3.j.rid).pop()||{};
    c('the page sends the PDF copy with the link\'s own VTOK (from memory, not the address bar)', ep.vtok, V3); }
  c('the report is there, read-only, with Download PDF', [!!RvD.getElementById('gfpdf'),!!RvD.getElementById('gfdelmine'),!!RvD.getElementById('gfemail'),!!RvD.getElementById('gfsendbox')], [true,true,false,false]);
  const Rv2=page(url3);
  await until(()=>Rv2.w.document.getElementById('gfmailpdf'),8000); await sleep(300);
  c('opened again: nothing emailed; it says a copy has already gone, and offers another', [sent.length-n3,Rv2.w.document.getElementById('gfmailnote').dataset.state,Rv2.w.document.querySelector('#gfmailnote .note').textContent,Rv2.w.document.getElementById('gfmailpdf').textContent,rec3().pdfs],
    [1,'already','Your email address is confirmed. A PDF copy has already been emailed to you.','Email me another copy',1]);
  const Rw=page(url3.replace(/\.[A-Za-z0-9_-]{32}$/,'.'+'W'.repeat(32)));
  await until(()=>Rw.w.document.getElementById('gfmailnote'),8000);
  c('a link whose verification token is wrong: the report opens, no PDF is sent or offered, and it says why', [!!Rw.w.document.getElementById('gfpdf'),sent.length-n3,Rw.w.document.getElementById('gfmailnote').dataset.state,/could not confirm your email address/.test(Rw.w.document.getElementById('gfmailnote').textContent),!!Rw.w.document.getElementById('gfmailpdf')], [true,1,'warn',true,false]);

  console.log('-- the same, in Spanish, with a failed send and Try again --');
  const sub4=await call({op:'submit',pub:camp.j.pub,code,name:'Ana Ruiz',email:'esp@example.org',emailOk:true,minor:false,lang:'es'});
  await call({op:'email',pub:camp.j.pub,rid:sub4.j.rid,token:sub4.j.token,lang:'es'});
  const url4=(/https:\/\/pastorshub\.org\/#gifts-report=\S+/.exec(sent[sent.length-1].text)||[''])[0];
  const V4=(/\.([A-Za-z0-9_-]{32})~es$/.exec(url4)||[])[1];
  c('the Spanish link email carries pub.rid.token.vtok~es', !!V4, true);
  c('…and says a PDF copy can be asked for once it is open (not that one comes on open)', [/Cuando lo abra, también podrá pedir que le enviemos una copia del informe en PDF\./.test(sent[sent.length-1].text),/a menos que alguien abra el enlace y lo pida\./.test(sent[sent.length-1].text)], [true,true]);
  const n4=sent.length;
  const Re=page(url4), ReD=Re.w.document;
  await until(()=>ReD.getElementById('gfmailpdf'),8000); await sleep(300);
  c('Spanish: the page opens in Spanish, nothing is emailed, and the one-tap offer is in Spanish',
    [ReD.documentElement.lang,pdfCalls(sub4.j.rid),sent.length-n4,ReD.getElementById('gfmailnote').dataset.state,ReD.querySelector('#gfmailnote .note').textContent,ReD.getElementById('gfmailpdf').textContent],
    ['es',0,0,'ready','Su dirección de correo está confirmada.','Enviarme una copia en PDF']);
  c('Spanish: the verification token leaves the address bar, the ~es marker stays', Re.w.location.hash, `#gifts-report=${camp.j.pub}.${sub4.j.rid}.${sub4.j.token}~es`);
  override=async b=>{ if(b.op==='emailpdf'){ await sleep(300); return {ok:false,status:502,json:async()=>({ok:false,error:'send-failed'})}; } return null; };
  ReD.getElementById('gfmailpdf').click();
  await until(()=>ReD.getElementById('gfmailnote').dataset.state==='sending',8000);
  c('Spanish: preparing', ReD.querySelector('#gfmailnote .note').textContent, 'Preparando una copia en PDF para su correo…');
  await until(()=>ReD.getElementById('gfmailnote').dataset.state==='warn',8000);
  c('a failed send says so in Spanish and offers "Intentar de nuevo"', [/No se pudo enviar el correo/.test(ReD.getElementById('gfmailnote').textContent),(ReD.getElementById('gfmailretry')||{}).textContent,sent.length-n4], [true,'Intentar de nuevo',0]);
  override=null;
  ReD.getElementById('gfmailretry').click();
  await until(()=>ReD.getElementById('gfmailnote').dataset.state==='sent',8000);
  c('Try again sends it: "Una copia en PDF va en camino a su correo.", one email, in Spanish, with the link\'s VTOK',
    [ReD.getElementById('gfmailnote').textContent.trim(),sent.length-n4,sent[sent.length-1].subject,pdfCalls(sub4.j.rid),(calls.filter(x=>x.op==='emailpdf'&&x.rid===sub4.j.rid).pop()||{}).vtok,(calls.filter(x=>x.op==='emailpdf'&&x.rid===sub4.j.rid).pop()||{}).lang],
    ['Una copia en PDF va en camino a su correo.',1,'Su informe de dones espirituales (PDF)',2,V4,'es']);
  // A reload in the same tab (the language button reloads the page): the
  // address bar no longer has the token, and the tab's copy brings the button back.
  { const v0=calls.filter(x=>x.op==='verify').length;
    Re.w.eval('GIFTS_LINK.vtok=null; gfRenderReportLink(gfHost())');
    await until(()=>ReD.getElementById('gfmailpdf'),8000);
    c('reloaded in the same tab: verified again from the tab\'s copy, the offer is back, the address bar still without the token, nothing sent',
      [calls.filter(x=>x.op==='verify').length-v0,(calls.filter(x=>x.op==='verify').pop()||{}).vtok,ReD.getElementById('gfmailnote').dataset.state,ReD.getElementById('gfmailpdf').textContent,Re.w.location.hash.includes(V4),sent.length-n4],
      [1,V4,'already','Enviarme otra copia',false,1]);
    Re.w.sessionStorage.setItem(`terrain-gifts-vtok:${camp.j.pub}.${sub4.j.rid}`,'Z'.repeat(32));
    Re.w.eval('GIFTS_LINK.vtok=null; gfRenderReportLink(gfHost())');
    await until(()=>ReD.getElementById('gfpdf'),8000); await sleep(200);
    c('a token the tab kept that the server refuses is forgotten quietly: no offer, no warning', [!!ReD.getElementById('gfmailnote'),Re.w.sessionStorage.getItem(`terrain-gifts-vtok:${camp.j.pub}.${sub4.j.rid}`),Re.w.eval('GIFTS_LINK.vtok')], [false,null,null]); }
  { const Re2=page(url4); await until(()=>Re2.w.document.getElementById('gfmailpdf'),8000);
    c('Spanish, opened again: "Enviarme otra copia"', [Re2.w.document.getElementById('gfmailnote').dataset.state,Re2.w.document.querySelector('#gfmailnote .note').textContent,Re2.w.document.getElementById('gfmailpdf').textContent],
      ['already','Su dirección de correo está confirmada. Ya se le envió por correo una copia en PDF.','Enviarme otra copia']);
    c('no page errors there', [...Re.errs,...Re2.errs], []); }
  const Rs=page(url3.replace(/(\.[A-Za-z0-9_-]{32})$/,'$1~es'));
  await until(()=>Rs.w.document.getElementById('gfpdf'),8000);
  c('the same link in Spanish opens in Spanish', [Rs.w.document.documentElement.lang,/Sus dones espirituales/.test(Rs.w.document.getElementById('giftbody').textContent)], ['es',true]);

  c('no page errors', [...P.errs,...L0.errs,...Rp.errs,...Rv.errs,...Rv2.errs,...Rw.errs,...Rs.errs], []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
