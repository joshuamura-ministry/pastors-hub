// v10.43.0 · connection cards, the look (DESIGN C2.3, T-L1–T-L6). The pastor: "make sure the connection cards are beautiful
// and attractive, designed well, not just plain text." One design system: per kind of occasion a colour family (CN_LOOK) and a
// drawn motif (CN_MOTIF), drawn the same way on the phone (SVG) and on paper (jsPDF vector paths), the app's two faces on paper
// with a fallback, and nothing said by colour alone (the card still reads when printed in black and white at home).
const fs=require('fs'), path=require('path');
const {load,lit}=require('./connect-blocks.js');
const {jsPDF}=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));fail++}else pass++};
// WCAG contrast; and "printed grey": the colour as a home printer's greyscale renders it (luma of the encoded values)
const lin=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); };
const rgb=h=>Array.isArray(h)?h:[0,2,4].map(i=>parseInt(String(h).replace('#','').slice(i,i+2),16));
const lum=h=>{ const [r,g,b]=rgb(h); return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b); };
const ratio=(a,b)=>{ const x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
const grey=h=>{ const [r,g,b]=rgb(h); const y=Math.round(0.299*r+0.587*g+0.114*b); return [y,y,y]; };
const mixHex=(a,b,t)=>{ const A=rgb(a),B=rgb(b); return A.map((v,i)=>Math.round(v*t+B[i]*(1-t))); };
(async()=>{ try{
  const T=load();
  const themes=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','tools/ideas-src/themes.json'),'utf8')).themes;
  const BT=lit('LIB_BUILTIN_THEMES');
  const I=(themes2,o={})=>({id:o.id||'x',builtin:!!o.builtin,themes:themes2,ages:'all',minors:false,kids:false,name:{en:'',es:''},text:''});

  console.log('-- T-L1: every theme and every built-in has a look; gentle cards are calm --');
  c('all 57 themes map to one of the nine looks', themes.filter(t=>!T.CN_LOOK_IDS.includes(T.cnLook(I([t.id])))).map(t=>t.id), []);
  c('all 103 built-ins map to one of the nine looks', Object.keys(BT).filter(id=>!T.CN_LOOK_IDS.includes(T.cnLook(I(BT[id].split(' '),{id,builtin:true})))), []);
  c('every gentle kind is calm', themes.filter(t=>T.CN_GENTLE.has(T.cnKind(I([t.id])))&&T.cnLook(I([t.id]))!=='calm').map(t=>t.id), []);
  c('each look is used by a theme or a built-in', T.CN_LOOK_IDS.filter(l=>!themes.some(t=>T.cnLook(I([t.id]))===l)&&!Object.keys(BT).some(id=>T.cnLook(I(BT[id].split(' '),{id,builtin:true}))===l)), []);
  c('nine looks, each with line, ink, tint and its dark line', T.CN_LOOK_IDS.filter(l=>!['line','ink','tint','dark'].every(k=>/^#[0-9A-F]{6}$/i.test(T.CN_LOOK[l][k]))), []);
  c('two looks may share a colour, never a motif', new Set(T.CN_LOOK_IDS.map(l=>JSON.stringify(T.CN_MOTIF[l]))).size, 9);

  console.log('\n-- T-L2: contrast --');
  const L2=T.CN_LOOK_IDS.map(l=>{ const k=T.CN_LOOK[l]; return [l,+ratio(k.ink,'#FFFFFF').toFixed(2),+ratio(k.ink,k.tint).toFixed(2),+ratio('#FFFFFF',k.ink).toFixed(2)]; });
  console.log('    ink on white · on tint · white on ink:',JSON.stringify(L2));
  c('each ink ≥ 4.5 : 1 on white and on its tint (the heading, the event, "Scan to stay in touch")', L2.filter(([,w,t])=>w<4.5||t<4.5).map(x=>x[0]), []);
  c('white on each ink ≥ 6 : 1 (the Send and Yes buttons, DESIGN C2.4)', L2.filter(([,,,b])=>b<6).map(x=>x[0]), []);
  c('the body inks on white and on every tint ≥ 4.5 : 1 (#0E1726, #4A5768)', T.CN_LOOK_IDS.filter(l=>['#0E1726','#4A5768'].some(i=>ratio(i,T.CN_LOOK[l].tint)<4.5||ratio(i,'#FFFFFF')<4.5)), []);
  // the phone's dark page: the look's dark line as the heading and the buttons (dark text on it), on the page and on its 13% tint
  const dk=T.CN_LOOK_IDS.map(l=>{ const d=l==='calm'?'#DDE4ED':T.CN_LOOK[l].dark, bg='#06080C', band=mixHex(T.CN_LOOK[l].dark,bg,0.13);
    return [l,+ratio(d,bg).toFixed(2),+ratio(d,band).toFixed(2),+ratio('#06080C',d).toFixed(2)]; });
  c('dark page: each dark ink ≥ 4.5 : 1 on the page and on its band; dark text on the dark-ink buttons ≥ 6 : 1', dk.filter(([,a,b,d])=>a<4.5||b<4.5||d<6).map(x=>x[0]), []);

  console.log('\n-- T-L3: every motif draws, inside its box, in SVG and in jsPDF --');
  for(const l of T.CN_LOOK_IDS){
    const M=T.CN_MOTIF[l]; let ok=true;
    for(const it of M){ const pts=it.p||it.q||(it.c?[[it.c[0]-it.c[2],it.c[1]-it.c[2]],[it.c[0]+it.c[2],it.c[1]+it.c[2]]]:[[it.e[0]-it.e[2],it.e[1]-it.e[3]],[it.e[0]+it.e[2],it.e[1]+it.e[3]]]);
      if(pts.some(([x,y])=>x<0||x>360||y<0||y>96)) ok=false; }
    const svg=T.cnMotifSVG(l,null,null,{});
    const strokesOnly=[...svg.matchAll(/<(polyline|polygon|path|circle|ellipse)\b([^>]*)\/>/g)].every(m=>/fill="none"/.test(m[2])||M.some(it=>it.f));
    const fills=[...svg.matchAll(/fill="currentColor"/g)].length, fItems=M.filter(it=>it.f).length;
    c(`${l}: ${M.length} strokes inside the 360 × 96 box; SVG aria-hidden, strokes only (${fItems} small filled dots or stars)`, [ok,/aria-hidden="true"/.test(svg),/focusable="false"/.test(svg),strokesOnly,fills===fItems,/stroke-width="1\.5"/.test(svg),/opacity="0\.6"/.test(svg)], [true,true,true,true,true,true,true]);
    // jsPDF: every point drawn lies inside the rectangle it was given
    const doc=new jsPDF({unit:'pt',format:'letter'}); const pts=[]; const R={x:200,y:30,w:180,h:60};
    const o1=doc.lines.bind(doc), o2=doc.circle.bind(doc), o3=doc.ellipse.bind(doc);
    doc.lines=(segs,x0,y0,sc,st,cl)=>{ let x=x0,y=y0; pts.push([x,y]); for(const g of segs){ if(g.length===2){ x+=g[0]; y+=g[1]; } else { pts.push([x+g[0],y+g[1]],[x+g[2],y+g[3]]); x+=g[4]; y+=g[5]; } pts.push([x,y]); } return o1(segs,x0,y0,sc,st,cl); };
    doc.circle=(x,y,r,st)=>{ pts.push([x-r,y-r],[x+r,y+r]); return o2(x,y,r,st); };
    doc.ellipse=(x,y,rx,ry,st)=>{ pts.push([x-rx,y-ry],[x+rx,y+ry]); return o3(x,y,rx,ry,st); };
    let threw=false; try{ T.cnMotifPDF(doc,l,R.x,R.y,R.w,R.h,{color:[120,120,120]}); }catch(e){ threw=e.message; }
    const out=pts.filter(([x,y])=>x<R.x-0.5||x>R.x+R.w+0.5||y<R.y-0.5||y>R.y+R.h+0.5);
    c(`${l}: drawn in jsPDF with its lines, circles and ellipses, inside the band it was given`, [threw,pts.length>0,out.length], [false,true,0]);
  }

  console.log('\n-- T-L4: black and white, as a home printer prints it --');
  const card=JSON.parse(JSON.stringify(T.cnTailor({id:'health-expo',builtin:true,themes:['health'],ages:'all',minors:false,kids:false,name:{en:'Community health fair',es:'Feria de salud comunitaria'},text:''},
    {cadence:'event',next:{name:{en:'Plant-based cooking school',es:'Escuela de cocina a base de plantas'}},church:'Sampleton SDA (SAMPLE)',day:'2026-10-18',lang:'both'})));
  const qr=n=>Array.from({length:n},(_,r)=>Array.from({length:n},(_,k)=>((r*7+k*3)%5)<2?'1':'0').join(''));
  for(const l of T.CN_LOOK_IDS){
    for(const lang of ['en','both']){
      const audit=[]; const cd={...card,look:l};
      T.cnPdfDoc(jsPDF,cd,{format:'half',lang,url:'https://pastorshub.org/#connect=HK7QM4RTZP',qrRows:qr(29),audit});
      const low=audit.filter(a=>ratio(grey(a.color),grey(a.bg))<4.5).map(a=>`${a.t.slice(0,30)} ${ratio(grey(a.color),grey(a.bg)).toFixed(2)}`);
      if(lang==='en'||low.length) c(`${l}, ${lang}: every word on the card ≥ 4.5 : 1 printed in grey (${audit.length} lines checked)`, [audit.length>20,low], [true,[]]);
      else pass++;
    }
    const k=T.CN_LOOK[l], tintGrey=grey(k.tint)[0], motifGrey=grey(T.cnMix(k.line,k.tint,0.6))[0];
    c(`${l}: the band prints pale grey, the motif mid-grey (nothing said by colour alone)`, [tintGrey>=215,motifGrey>=95&&motifGrey<=200], [true,true]);
  }

  console.log('\n-- T-L5: an icon for every choice --');
  const keys=['prayer','visit','nothing','next','recipes','results','events','help','study','series','praywith','remind','news','talk','c1','c2'];
  c('every choice key has its icon', keys.filter(kk=>!T.CN_ICON[kk]), []);
  c('icons are aria-hidden stroke drawings in a 24-unit box, coloured by the look (currentColor)', keys.every(kk=>{ const s=T.cnIconSVG(kk); return /viewBox="0 0 24 24"/.test(s)&&/aria-hidden="true"/.test(s)&&/stroke="currentColor"/.test(s)&&/fill="none"/.test(s); }));
  c('no two choices share an icon, except his own two (a star)', new Set(keys.filter(kk=>kk!=='c2').map(kk=>T.CN_ICON[kk])).size, keys.length-1);

  console.log('\n-- T-L6: the app\'s two faces on paper, with a fallback --');
  { // registered when present: the bytes go to addFileToVFS, the faces to addFont, under the names the card then uses
    const calls=[]; const spy={addFileToVFS:(f,b)=>calls.push(['vfs',f,b.length]),addFont:(f,n,s)=>calls.push(['font',f,n,s])};
    const got=await T.cnPdfFonts(spy,{script:'AAAA',disp:'BBBB'});
    c('present: both files registered (addFileToVFS + addFont) and named for the card', [JSON.parse(JSON.stringify(got)),calls.map(x=>x.slice(0,2).join(' '))],
      [{script:'CnScript',disp:'CnDisplay'},['vfs CormorantGaramond-SemiBoldItalic.ttf','font CormorantGaramond-SemiBoldItalic.ttf','vfs SpaceGrotesk-SemiBold.ttf','font SpaceGrotesk-SemiBold.ttf']]); }
  { const T2=load({fetch:async u=>{ if(/fonts\/CormorantGaramond-SemiBoldItalic\.ttf$/.test(u)) return {ok:true,arrayBuffer:async()=>new Uint8Array([0,1,0,0,...Array(3000).fill(7)]).buffer};
      if(/fonts\/SpaceGrotesk-SemiBold\.ttf$/.test(u)) return {ok:true,arrayBuffer:async()=>new TextEncoder().encode('<!doctype html> not a font '.repeat(200)).buffer}; return {ok:false,status:404}; }});
    const b=await T2.cnPdfFontBytes();
    c('fetched same-origin from fonts/, a TrueType file taken, anything else (an HTML error page) refused', [typeof b.script==='string'&&b.script.length>3000,b.disp], [true,null]); }
  { const T3=load({fetch:async()=>{ throw new Error('offline'); }});
    const b=await T3.cnPdfFontBytes();
    const faces=[]; function Spy(o){ const d=new jsPDF(o), sf=d.setFont.bind(d); d.setFont=(f,st)=>{ faces.push(f+':'+(st||'')); return sf(f,st); }; return d; }
    const d=T3.cnPdfDoc(Spy,{...card,look:'health'},{format:'half',lang:'en',url:'https://pastorshub.org/#connect=HK7QM4RTZP',qrRows:qr(29),fontBytes:b});
    const bytes=Buffer.from(d.output('arraybuffer'));
    // v10.43 (review, 1 Oct 2026): the fallback heading is Times Italic (the bold italic printed heavier than the script face the pastor approves on screen)
    c('the fetch fails: the card still prints, in Times Italic and Helvetica Bold', [JSON.parse(JSON.stringify(b)),faces.includes('times:italic'),faces.includes('helvetica:bold'),d.getNumberOfPages()], [{script:null,disp:null},true,true,1]);
    c('the PDF stays under 1.5 MB', bytes.length<1.5*1024*1024); }
  { // the real faces, once they are in fonts/ (SIL Open Font License); until then the card prints with the fallback above
    const dir=path.resolve(__dirname,'..','fonts'), have=f=>fs.existsSync(path.join(dir,f));
    if(have('CormorantGaramond-SemiBoldItalic.ttf')&&have('SpaceGrotesk-SemiBold.ttf')){
      const B={script:fs.readFileSync(path.join(dir,'CormorantGaramond-SemiBoldItalic.ttf')).toString('base64'),disp:fs.readFileSync(path.join(dir,'SpaceGrotesk-SemiBold.ttf')).toString('base64')};
      const d=T.cnPdfDoc(jsPDF,{...card,look:'health'},{format:'half',lang:'both',url:'https://pastorshub.org/#connect=HK7QM4RTZP',qrRows:qr(29),fontBytes:B});
      const bytes=Buffer.from(d.output('arraybuffer')), s=bytes.toString('latin1');
      c('fonts/: both faces embedded in the card, with OFL.txt beside them, the PDF under 1.5 MB', [/\/FontFile2/.test(s),/CnScript/.test(s),/CnDisplay/.test(s),have('OFL.txt'),bytes.length<1.5*1024*1024], [true,true,true,true,true]);
    } else console.log('  NOTE  fonts/ does not hold the two faces yet: cards print with Times Italic and Helvetica Bold (see CLAUDE.md)');
  }
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
