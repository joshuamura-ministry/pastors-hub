/* v10.43 — THE CARD'S TWO FACES, IN fonts/ (1 Oct 2026, downloaded with the pastor's OK).
 *
 * The printed connection card (jsPDF: addFileToVFS + addFont) and the neighbour's phone page (#connect=, @font-face) draw the
 * heading in Cormorant Garamond SemiBold Italic and the event and "Scan to stay in touch" in Space Grotesk SemiBold. Both are
 * SIL Open Font License 1.1 fonts, served by the site itself (fonts/), never by another site. This suite checks the folder (the
 * two files and OFL.txt, exactly), that index.html's two paths are those two files, that each file is the static TrueType face
 * the page and the paper ask for, unmodified (SHA-256 as downloaded), with every letter the card's English and Spanish need, and
 * that a printed card embeds both, every character it draws in them being in the face; and, where netlify.toml is beside it (the
 * repo), that the site's build copies fonts/. connect-look checks the card's size with them; v43-review-fixes checks that the
 * #connect= page asks no other site.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { HTML, load, lit } = require('./connect-blocks.js');
const { jsPDF } = require('jspdf');
const ROOT = path.resolve(__dirname, '..'), DIR = path.join(ROOT, 'fonts');
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 500)); fail++; } else pass++; };

// The two files as downloaded (fonts/OFL.txt names each one's source). A different file is a decision: change these with it.
const FACES = {
  'CormorantGaramond-SemiBoldItalic.ttf': { family: 'Cormorant Garamond', sub: 'SemiBold Italic', weight: 600, italic: true, version: 'Version 4.002',
    sha256: 'f8050597cc3fd6fd76a9e4f5e6e6c270ad191b7baebd2985e3ef0305e3e2fe62', css: 'Terrain Card Script', key: 'script', pdf: 'CnScript' },
  'SpaceGrotesk-SemiBold.ttf': { family: 'Space Grotesk', sub: 'SemiBold', weight: 600, italic: false, version: 'Version 2.000',
    sha256: '279a5d22b8ab377f41706af566610667db3941b069b50187b98af09ca3b08f91', css: 'Terrain Card Display', key: 'disp', pdf: 'CnDisplay' },
};
// Every letter the card needs in English and Spanish (DESIGN C2.3), the digits of its dates, and its punctuation.
const NEED = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789áéíóúüñÁÉÍÓÚÜÑ¿¡«»—–’‘“”·.,;:!?\'"()-&/@#%+… \u00a0';   // (and the space and the no-break space cnHeadKeep puts in a heading)

// A small TrueType reader: the table directory, name, OS/2, head, post and the Unicode cmap (formats 4 and 12).
function ttf(file) {
  const b = fs.readFileSync(file), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = o => dv.getUint16(o), i16 = o => dv.getInt16(o), u32 = o => dv.getUint32(o), T = {};
  for (let i = 0, n = u16(4); i < n; i++) { const o = 12 + i * 16; T[b.toString('latin1', o, o + 4)] = { off: u32(o + 8), len: u32(o + 12) }; }
  const names = {};
  if (T.name) { const o = T.name.off, so = o + u16(o + 4);
    for (let i = 0, n = u16(o + 2); i < n; i++) { const r = o + 6 + i * 12, pid = u16(r), lid = u16(r + 4), nid = u16(r + 6), len = u16(r + 8), off = u16(r + 10);
      if (pid === 3 && lid === 0x409) { let s = ''; for (let k = 0; k < len; k += 2) s += String.fromCharCode(u16(so + off + k)); names[nid] = s; } } }
  const cmap = new Set();
  if (T.cmap) { const o = T.cmap.off;
    for (let i = 0, n = u16(o + 2); i < n; i++) { const pid = u16(o + 4 + i * 8), eid = u16(o + 6 + i * 8), so = o + u32(o + 8 + i * 8), fmt = u16(so);
      if (!(pid === 0 || (pid === 3 && (eid === 1 || eid === 10)))) continue;
      if (fmt === 4) { const seg = u16(so + 6) / 2, ends = so + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ros = deltas + seg * 2;
        for (let s = 0; s < seg; s++) { const e = u16(ends + s * 2), st = u16(starts + s * 2), d = i16(deltas + s * 2), ro = u16(ros + s * 2);
          for (let ch = st; ch <= e && ch !== 0xFFFF; ch++) { let g = ro === 0 ? (ch + d) & 0xFFFF : u16(ros + s * 2 + ro + (ch - st) * 2); if (ro && g) g = (g + d) & 0xFFFF; if (g) cmap.add(ch); } } }
      if (fmt === 12) for (let k = 0, n2 = u32(so + 12); k < n2; k++) { const st = u32(so + 16 + k * 12), e = u32(so + 20 + k * 12); for (let ch = st; ch <= e; ch++) cmap.add(ch); } } }
  const os2 = T['OS/2'] && { weight: u16(T['OS/2'].off + 4), fsType: u16(T['OS/2'].off + 8), italic: !!(u16(T['OS/2'].off + 62) & 1) };
  return { bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex'), magic: b.slice(0, 4).toString('hex'), tables: Object.keys(T),
    family: names[16] || names[1], sub: names[17] || names[2], version: names[5], copyright: names[0], os2,
    macItalic: T.head ? !!(u16(T.head.off + 44) & 2) : null, italicAngle: T.post ? dv.getInt32(T.post.off + 4) / 65536 : null, cmap };
}

(async () => { try {
  console.log('-- fonts/: the two faces and their licence, exactly --');
  const have = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => !f.startsWith('.')).sort() : null;
  c('fonts/ holds CormorantGaramond-SemiBoldItalic.ttf, OFL.txt and SpaceGrotesk-SemiBold.ttf, nothing else', have, ['CormorantGaramond-SemiBoldItalic.ttf', 'OFL.txt', 'SpaceGrotesk-SemiBold.ttf']);
  if (!have || have.length < 3) throw new Error('fonts/ is missing or incomplete');

  console.log('\n-- index.html asks for exactly these two files, same-origin, on paper and on the phone --');
  const CN_FONTS = lit('CN_FONTS');
  const faces = [...HTML.matchAll(/@font-face\{font-family:'(Terrain Card [A-Za-z]+)';src:url\(([^)]+)\) format\('truetype'\);font-style:(\w+);font-weight:(\d+)/g)].map(m => ({ css: m[1], url: m[2], style: m[3], weight: +m[4] }));
  c('the paper (CN_FONTS) asks for fonts/CormorantGaramond-SemiBoldItalic.ttf and fonts/SpaceGrotesk-SemiBold.ttf', [CN_FONTS.script.file, CN_FONTS.disp.file], ['fonts/CormorantGaramond-SemiBoldItalic.ttf', 'fonts/SpaceGrotesk-SemiBold.ttf']);
  c('the phone (@font-face) asks for the same two paths, relative (same site), in truetype', faces.map(f => [f.css, f.url]), [['Terrain Card Script', CN_FONTS.script.file], ['Terrain Card Display', CN_FONTS.disp.file]]);
  c('both paths are files in fonts/', [CN_FONTS.script.file, CN_FONTS.disp.file].map(f => fs.existsSync(path.join(ROOT, f))), [true, true]);
  c('the code names the licence file (fonts/OFL.txt)', /fonts\/OFL\.txt/.test(HTML), true);

  console.log('\n-- each file: static TrueType, the face asked for, unmodified, every letter of the card --');
  for (const [file, F] of Object.entries(FACES)) {
    const t = ttf(path.join(DIR, file)), css = faces.find(f => f.css === F.css);
    c(`${file}: TrueType (00010000) with glyf outlines (jsPDF embeds these), no variation tables (a static face)`,
      [t.magic, t.tables.includes('glyf'), ['fvar', 'gvar', 'avar', 'HVAR', 'MVAR', 'CFF ', 'CFF2'].filter(x => t.tables.includes(x))], ['00010000', true, []]);
    c(`${file}: ${F.family} ${F.sub}, ${F.version}`, [t.family, t.sub, t.version], [F.family, F.sub, F.version]);
    c(`${file}: weight ${F.weight}${F.italic ? ', italic' : ''}, as its @font-face says (${css && css.style} ${css && css.weight})`,
      [t.os2.weight, t.os2.italic, t.macItalic, t.italicAngle !== 0, css && css.weight, css && css.style], [F.weight, F.italic, F.italic, F.italic, F.weight, F.italic ? 'italic' : 'normal']);
    c(`${file}: may be embedded in a PDF (OS/2 fsType 0, installable)`, t.os2.fsType, 0);
    c(`${file}: under the 2 MB cnPdfFontBytes takes (${t.bytes} bytes)`, t.bytes < 2e6, true);
    c(`${file}: unmodified, the file as downloaded (SHA-256)`, t.sha256, F.sha256);
    c(`${file}: every letter, digit and mark of the card in English and Spanish (á é í ó ú ü ñ ¿ ¡ « » — ’ “ ” ·)`, [...NEED].filter(ch => !t.cmap.has(ch.codePointAt(0))), []);
  }
  { // the words the two faces draw: the card's own (CN_TEXT, both languages) and every event name in the idea library (English and Spanish)
    const T = load(), words = Object.values(T.CN_TEXT).flatMap(v => [v.en, v.es]).filter(x => typeof x === 'string');
    const ix = JSON.parse(fs.readFileSync(path.join(ROOT, 'ideas', 'index.json'), 'utf8')), n = ix.cols.indexOf('n'), ne = ix.cols.indexOf('ne');
    const all = new Set([...words, ...ix.ideas.flatMap(r => [r[n], r[ne]]).filter(Boolean)].join('').replace(/[\s ‑]/g, ''));
    for (const [file] of Object.entries(FACES)) { const t = ttf(path.join(DIR, file));
      c(`${file}: every character of the card's words and of ${ix.ideas.length} library names, EN and ES (${all.size} characters)`, [...all].filter(ch => !t.cmap.has(ch.codePointAt(0))), []); }
  }

  console.log('\n-- fonts/OFL.txt: the licence, with both notices and where each file came from --');
  { const ofl = fs.readFileSync(path.join(DIR, 'OFL.txt'), 'utf8'), top = ofl.slice(0, ofl.indexOf('SIL OPEN FONT LICENSE'));
    c('both copyright notices at the top', [/Copyright 2015 The Cormorant Project Authors \(github\.com\/CatharsisFonts\/Cormorant\)/i.test(top), /Copyright 2020 The Space Grotesk Project Authors \(https:\/\/github\.com\/floriankarsten\/space-grotesk\)/.test(top)], [true, true]);
    for (const file of Object.keys(FACES)) { const t = ttf(path.join(DIR, file));
      c(`${file}: named with its source (an https address), and its own copyright line is the one at the top`, [new RegExp(file.replace('.', '\\.') + '[^\\n]*https://').test(top), top.toLowerCase().includes(t.copyright.toLowerCase())], [true, true]); }
    c('no Reserved Font Name declared ("with Reserved Font Name …" after a notice), so a PDF\'s subset of a face may keep its name', /with Reserved Font Names?/i.test(top), false);
    c('the whole SIL Open Font License 1.1', ['SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007', 'PREAMBLE', 'DEFINITIONS', 'PERMISSION & CONDITIONS', 'TERMINATION', 'DISCLAIMER',
      'Neither the Font Software nor any of its individual components', 'No Modified Version of the Font Software may use the Reserved Font', 'OTHER DEALINGS IN THE FONT SOFTWARE.'].filter(s => !ofl.includes(s)), []); }

  console.log('\n-- a printed card embeds both faces, and every character drawn in them is in the face (EN, ES, both; half and postcard) --');
  // (jsPDF 2.5.1 leaves out a character a face lacks: its utf8 text step drops any character above U+00FF that is not in the face,
  // and pdfEscape16 stops the line at glyph 0 for one below U+0100 that the face lacks (Space Grotesk has every printable Latin-1
  // character; Cormorant lacks only µ, and the script face draws only the card's own heading). So the check is on the words handed
  // to doc.text in each face, against that face's own character map.)
  { const T = load(), B = {}, CMAP = {}; for (const [file, F] of Object.entries(FACES)) { B[F.key] = fs.readFileSync(path.join(DIR, file)).toString('base64'); CMAP[F.pdf] = ttf(path.join(DIR, file)).cmap; }
    const card = JSON.parse(JSON.stringify(T.cnTailor({ id: 'health-expo', builtin: true, themes: ['health'], ages: 'all', minors: false, kids: false, name: { en: 'Full health expo', es: 'Feria de salud completa' }, text: '' },
      { cadence: 'event', next: { name: { en: 'Plant-based cooking school', es: 'Escuela de cocina a base de plantas' } }, church: 'Sampleton SDA (SAMPLE)', day: '2026-10-18', lang: 'both' })));
    const qr = n => Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, k) => ((r * 7 + k * 3) % 5) < 2 ? '1' : '0').join(''));
    const cases = [['health fair', 'half', 'en', {}], ['health fair', 'half', 'es', {}], ['health fair', 'half', 'both', {}], ['health fair', 'post', 'es', {}],
      ['a series', 'half', 'es', { cadence: 'series', look: 'prayer', title: { en: 'Four nights, not four weeks', es: 'Cuatro noches, no cuatro semanas' } }],
      ['grief (gentle)', 'half', 'es', { kind: 'grief', look: 'calm', cadence: 'series', title: { en: 'Grief recovery group', es: 'Grupo de recuperación del duelo' } }]];
    for (const [label, format, lang, over] of cases) {
      const drawn = []; function Spy(o) { const d = new jsPDF(o), t = d.text.bind(d); d.text = (x, ...a) => { drawn.push([d.getFont().fontName, [].concat(x).join('\n')]); return t(x, ...a); }; return d; }
      const d = T.cnPdfDoc(Spy, { ...card, look: 'health', ...over }, { format, lang, url: 'https://pastorshub.org/#connect=HK7QM4RTZP', qrRows: qr(29), fontBytes: B });
      const s = Buffer.from(d.output('arraybuffer')).toString('latin1');
      const inFace = drawn.filter(([f]) => CMAP[f]), missing = inFace.flatMap(([f, t]) => [...t.replace(/\n/g, '')].filter(ch => !CMAP[f].has(ch.codePointAt(0))).map(ch => f + ' ' + ch + ' in "' + t + '"'));
      c(`${label}, ${format}, ${lang}: both faces embedded (FontFile2, /CnScript, /CnDisplay), both drawn, every character in its face`,
        [(s.match(/\/FontFile2 \d+ 0 R/g) || []).length, /\/BaseFont \/CnScript/.test(s), /\/BaseFont \/CnDisplay/.test(s), inFace.some(([f]) => f === 'CnScript'), inFace.some(([f]) => f === 'CnDisplay'), missing], [2, true, true, true, true, []]);
    }
  }

  console.log('\n-- the site publishes fonts/ --');
  { const toml = path.join(ROOT, 'netlify.toml');
    if (fs.existsSync(toml)) c('netlify.toml\'s build copies fonts/ into the published site (cp -R fonts site/)', /command\s*=\s*"[^"\n]*\bcp -R fonts site\//.test(fs.readFileSync(toml, 'utf8')), true);
    else console.log('  NOTE  no netlify.toml here (it is in the repo): its build command must copy fonts/ too (cp -R fonts site/)'); }
} catch (e) { console.log('  FAIL  ' + (e && e.message || e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
