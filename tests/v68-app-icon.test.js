// v10.68.0 · the app icon, and the main menu's two new tiles. The pastor (11 Oct 2026): "Now I need a beautiful app icon for my phone when I
// wanna add it to my home screen and also I need to add it here on my Mac as well as an app icon please embed that in"; and, of the wide
// directory tile, "it doesn't look good the church create your church directory I just think it should be another icon just like the others
// and then the other open space would be more apps coming soon or more new features coming with a beautiful two beautiful tab so the church
// directory and it will look symmetrical but again the the the icon needs to really look good like the others". The icon files are drawn by
// tools/icons/make-icons.mjs from its two drawings. Written failing-first on v10.67.1.
const fs=require('fs'), path=require('path');
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const ROOT=path.resolve(__dirname,'..'), F=f=>path.join(ROOT,f), has=f=>fs.existsSync(F(f)), rd=f=>fs.readFileSync(F(f));
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const png=f=>{ if(!has(f)) return null; const b=rd(f); return b.slice(1,4).toString()==='PNG'?[b.readUInt32BE(16),b.readUInt32BE(20)]:null; };
const HTML=rd('index.html').toString(), head=HTML.slice(0,HTML.indexOf('</head>'));
const LINKS=h=>[/<link rel="icon" href="\/favicon\.ico" sizes="16x16 32x32 48x48">/.test(h),/<link rel="icon" href="\/icons\/favicon\.svg" type="image\/svg\+xml">/.test(h),
  /<link rel="icon" href="\/icons\/favicon-32\.png" type="image\/png" sizes="32x32">/.test(h),/<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/.test(h)];
(async()=>{ await T.sec(async()=>{
  console.log('\n-- the page names its icons (same site only) --');
  c('the tab icon (.ico, .svg, a 32 PNG) and the phone\'s icon, in the head', LINKS(head), [true,true,true,true]);
  c('…the manifest, and the name under the icon: Terrain', [/<link rel="manifest" href="\/manifest\.webmanifest">/.test(head),/<meta name="apple-mobile-web-app-title" content="Terrain">/.test(head),/<meta name="application-name" content="Terrain">/.test(head)], [true,true,true]);
  c('…every icon link on this site, never another', [...head.matchAll(/<link rel="(?:icon|apple-touch-icon|manifest)" href="([^"]+)"/g)].map(m=>m[1]).every(u=>/^\/[a-z]/.test(u)), true);
  c('the four public pages carry the same icons', ['privacy','terms','refunds','about'].map(k=>LINKS(rd(k+'.html').toString()).every(Boolean)), [true,true,true,true]);

  console.log('\n-- the files, each its size --');
  c('the phone\'s icon 180 × 180, the whole square (the phone rounds it)', png('apple-touch-icon.png'), [180,180]);
  c('the tab: an SVG and a 32 × 32 PNG', [has('icons/favicon.svg')&&/<svg[^>]+viewBox="0 0 64 64"/.test(rd('icons/favicon.svg').toString()),png('icons/favicon-32.png')], [true,[32,32]]);
  c('…the SVG is the drawing in tools/icons, unchanged', rd('icons/favicon.svg').equals(rd('tools/icons/favicon.svg')), true);
  c('an installed app\'s icons: 192, 512, and 512 for Android to cut its own shape', ['icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'].map(png), [[192,192],[512,512],[512,512]]);
  const ico=rd('favicon.ico'), n=ico.readUInt16LE(4), sizes=[...Array(n)].map((_,i)=>{ const o=ico.readUInt32LE(6+16*i+12), s=ico.readUInt32LE(6+16*i+8), p=ico.slice(o,o+s);
    return [ico[6+16*i],p.slice(1,4).toString(),p.readUInt32BE(16)]; });
  c('favicon.ico: three PNG pictures, 16, 32 and 48', [ico.readUInt16LE(0),ico.readUInt16LE(2),sizes], [0,1,[[16,'PNG',16],[32,'PNG',32],[48,'PNG',48]]]);
  c('the drawings and the script that makes every file', ['tools/icons/terrain-icon.svg','tools/icons/favicon.svg','tools/icons/make-icons.mjs'].map(has), [true,true,true]);
  c('…the icon: the church on its hill, the cross, the map\'s lines (no rings round a point: neighbors are never targets)', (s=>[/<svg[^>]+viewBox="0 0 1024 1024"/.test(s),(s.match(/stroke="url\(#r[ABC]\)"/g)||[]).length,/<circle[^>]+r="(?:[2-9]\d|\d{3})"/.test(s)])(rd('tools/icons/terrain-icon.svg').toString()), [true,3,false]);

  console.log('\n-- the manifest --');
  const M=JSON.parse(rd('manifest.webmanifest').toString());
  c('Terrain, opening at the start of the site, as an app of its own where the device allows', [M.name,M.short_name,M.id,M.start_url,M.scope,M.display], ['Terrain','Terrain','/','/','/','standalone']);
  c('…in the app\'s dark colors', [M.background_color,M.theme_color], ['#06080C','#06080C']);
  c('…its icons, each file there and the size it says', M.icons.map(i=>[i.src,i.sizes,i.purpose||'',(s=>s&&s.join('x'))(png(i.src.slice(1)))]),
    [['/icons/icon-192.png','192x192','any','192x192'],['/icons/icon-512.png','512x512','any','512x512'],['/icons/icon-maskable-512.png','512x512','maskable','512x512'],['/apple-touch-icon.png','180x180','','180x180']]);
  c('…its words say no "AI"', /\bA\.?I\b/.test(M.name+' '+M.description), false);

  console.log('\n-- the site\'s build copies them --');
  const toml=rd('netlify.toml').toString(), cmd=(toml.match(/^\s*command\s*=\s*"([^"]*)"/m)||[])[1]||'';
  c('icons/, the manifest, favicon.ico and apple-touch-icon.png go into the site', [/&& cp -R icons site\/(\s|$)/.test(cmd),/cp manifest\.webmanifest favicon\.ico apple-touch-icon\.png site\//.test(cmd)], [true,true]);
  c('…the manifest served as a manifest (the site says nosniff)', /for = "\/manifest\.webmanifest"\s*\n\s*\[headers\.values\]\s*\n\s*Content-Type = "application\/manifest\+json/.test(toml), true);

  console.log('\n-- the main menu: the directory a tile like the others, and More tools beside it --');
  const P=page({}); await ready(P); P.E('showHub()'); await sleep(40);
  const more=P.q('#hubmore'), D=P.q('#hubdir'), S=P.q('#hubsoon');
  c('a row of its own right after the six tools, the six still the six', [more&&more.previousElementSibling&&more.previousElementSibling.className,P.qa('.tool').length,P.qa('#hubmore .tool').length,P.qa('#hubmore > .htile').map(e=>e.id)], ['tools',6,0,['hubdir','hubsoon']]);
  c('the directory: a button drawn as the tools are (its own picture, its own colour and glow)', [D.tagName,!!D.querySelector('.tico svg.tsvg linearGradient#ink-directory'),!!D.querySelector('svg filter#glow-directory'),D.querySelector('svg g').getAttribute('stroke-width'),/--tc:#FF9F8A/.test(D.getAttribute('style'))], ['BUTTON',true,true,'4.5',true]);
  c('…"Church Directory", what it is, and its way in', [txt(D.querySelector('b')),txt(D.querySelector('.td')),txt(D.querySelector('.tgo')),!!D.querySelector('.tgo i')], ['Church Directory','Photos, names and numbers, printed for your members.','Build the directory',true]);
  c('More tools: a picture, not a button (nothing to tap, never a tab stop)', [S.tagName,S.hasAttribute('tabindex'),S.getAttribute('role'),P.qa('#hubsoon a,#hubsoon button').length,!!S.querySelector('svg.tsvg linearGradient#ink-soon')], ['DIV',false,null,0,true]);
  c('…"More tools", the line, "Coming soon"', [txt(S.querySelector('b')),txt(S.querySelector('.td')),txt(S.querySelector('.tsoon'))], ['More tools','New tools for your church are on the way.','Coming soon']);
  c('every picture\'s parts have their own names on the page', (ids=>ids.length===new Set(ids).size)(P.qa('svg [id]').map(e=>e.id)), true);
  const css=P.qa('style').map(x=>x.textContent).join('\n');
  c('two across, each as wide as one of the three, centred (one column on a phone, two where the tools are two)', [/\.hub \.tools2\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(230px,1fr\)\);gap:20px;margin-top:20px\}/.test(css),/@media \(min-width:760px\)\{ \.hub \.tools2\{grid-template-columns:repeat\(2,calc\(\(100% - 40px\) \/ 3\)\);justify-content:center\} \}/.test(css)], [true,true]);
  c('…the old wide tile\'s rules gone', /\.hubdir-|\.hub \.tools \.hubdir/.test(css), false);
  D.click(); await sleep(60);
  c('a tap on the directory opens its builder', [P.q('#dir-sheet').hasAttribute('open'),P.txt('#dir-h')], [true,'Your church directory']);
  c('no page errors', P.errs, []);

  console.log('\n-- in Spanish --');
  const E=page({lang:'es'}); await ready(E); E.E('showHub()'); await sleep(40);
  c('the two tiles', [txt(E.q('#hubdir b')),txt(E.q('#hubdir .tgo')),txt(E.q('#hubsoon b')),txt(E.q('#hubsoon .td')),txt(E.q('#hubsoon .tsoon'))], ['Directorio de la iglesia','Hacer el directorio','Más herramientas','Nuevas herramientas para su iglesia, en camino.','Próximamente']);
  c('no page errors', E.errs, []);
}); T.done(); })();
