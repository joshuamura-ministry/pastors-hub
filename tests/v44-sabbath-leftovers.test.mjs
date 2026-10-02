// v10.44.0 — the Sabbath work left over from v51b (CODE-SABBATH.md §5–§6), and the pastor's offering line of 2 Oct 2026.
// The pastor (1 Oct 2026, tools/ideas-src/SABBATH-GUIDELINE.md): "we are not legalistic… We're going to be doing the things that
// Christ would do." And (2 Oct 2026): "a special offering taken during Sabbath worship for a church project (for example new sound
// equipment) is fine: it is part of worship. Sales, fundraising events and selling tickets stay off the Sabbath."
//  1 the writers' validator reads the guideline in English and Spanish (v51b patch-validate), and its selftest is all right
//  2 vocab.json is rebuilt from this app (it still said "Fix-it Saturday" / "Sábado de reparaciones")
//  3 the library under the 2 Oct line: the one idea "best on another day" only for a project offering now fits, and ships so
//  4 the writers' notes say the same (the guideline beside them, WRITERS.md's sabbath field)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'tools', 'ideas-src');
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 600)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const txt = f => fs.readFileSync(f, 'utf8');
const html = txt(path.join(ROOT, 'index.html'));

console.log('-- 1. the validator reads the guideline, English and Spanish --');
const V = txt(path.join(SRC, 'validate.mjs'));
c('SABBATH_REVIEW has an English and a Spanish list (fees, prices, festivals; vendan, cuotas, precios…)',
  [/const SABBATH_REVIEW = \{\s*en: \//.test(V), /\bes: \/\\b\(vend\(a\|an\|e\|en/.test(V), /festivals\?/.test(V), /cuotas\?/.test(V)], [true, true, true, true]);
c('bought beforehand is not a REVIEW; a café or diner is, unless a home, church, library or park is named',
  [/ahead: \{en: /.test(V), /const SABBATH_CAFE = /.test(V)], [true, true]);
c('a raffle that raises money is refused like a sold ticket; a free drawing passes',
  /raffl\(e\|es\|ing\)\\b\[\^\.!\?\]\{0,60\}\\b\(to \(pay\|raise\|fund\|cover\)/.test(V), true);
const NOT = (V.match(/const SABBATH_NOT = \/([^\n]*)\/;/) || [])[1] || '';
c('the reverse check\'s "keeps it off the Sabbath" words no longer include an offering (2 Oct: an offering in worship is fine)',
  [NOT.length > 100, /\boffering\b/.test(NOT), /fundrais/.test(NOT), /auction/.test(NOT)], [true, false, true, true]);
const st = spawnSync(process.execPath, ['selftest.mjs'], {cwd: SRC, encoding: 'utf8', timeout: 240000});
const m = /all (\d+) cases right/.exec(st.stdout || '');
c('selftest.mjs: every case right (128 or more: the sold raffle, the free drawing, a festival, Spanish selling, "vendrán", bought beforehand, a diner)',
  [st.status, !!m && +m[1] >= 128], [0, true]);
c('…and it leaves nothing behind in tools/ideas-src', fs.existsSync(path.join(SRC, '.selftest')), false);

console.log('\n-- 2. vocab.json is this app\'s --');
const VOC = read(path.join(SRC, 'vocab.json'));
const VER = (html.match(/const VERSION = '([^']+)';/) || [])[1];
c('rebuilt from this release (node validate.mjs --vocab ../../index.html)', VOC.version, VER);
const sigStart = html.indexOf('const SIGNATURE=['), sigEnd = html.indexOf('\n];', sigStart);
const appSig = [...html.slice(sigStart, sigEnd).matchAll(/\{id:'([a-z0-9-]+)',[^\n]*?\bn:'((?:[^'\\]|\\.)*)'/g)].map(x => [x[1], JSON.parse('"' + x[2].replace(/\\'/g, "'").replace(/"/g, '\\"') + '"')]);   // the literal's own escapes (\u2019) read as the app reads them
c('the built-ins it knows are the app\'s, by id and name (SIGNATURE\'s 97; the six small groups are pushed after it)', [VOC.signature.length, JSON.stringify(VOC.signature.map(s => [s.id, s.n])) === JSON.stringify(appSig)], [appSig.length, true]);
const rc = VOC.signature.find(s => s.id === 'repair-cafe') || {};
c('"Fix-it Sunday" / "Domingo de reparaciones" (never "Fix-it Saturday" / "Sábado de reparaciones")', [rc.n, rc.es], ['Fix-it Sunday', 'Domingo de reparaciones']);
c('no built-in name in it puts ordinary work on Saturday', VOC.signature.filter(s => /Saturday/.test(s.n) || /Sábado de reparaciones/i.test(s.es || '')).map(s => s.id), []);

console.log('\n-- 3. the library under the 2 Oct offering line --');
const stew = read(path.join(SRC, 'themes', 'stewardship.json')).ideas;
const bw = stew.find(x => x.id === 'stewardship-building-without-pressure');
c('"A building project funded without pressure" fits the Sabbath now (its only reason was a project offering; its question evening stays on a weeknight, no sales on the Sabbath)',
  [bw.sabbath, /weeknight question evening/.test(bw.en.how.join(' ')), /no auctions, dinners or events that sell on the Sabbath/.test(bw.en.how.join(' '))], [true, true, true]);
const fc = read(path.join(SRC, 'themes', 'foster-care.json')).ideas.find(x => x.id === 'foster-care-school-clothing-cards');
c('…the back-to-school clothing cards stay "best on another day" (store gift cards are a money programme, as in every other idea)', fc.sabbath, false);
const I = read(path.join(ROOT, 'ideas', 'index.json')), sc = I.cols.indexOf('sab');
const row = I.ideas.find(r => r[0] === 'stewardship-building-without-pressure');
c('it ships so: the index\'s Sabbath column and its theme file (ideas/ rebuilt, one hash everywhere)',
  [row[sc], read(path.join(ROOT, 'ideas', 'stewardship.json')).ideas.find(x => x.id === row[0]).sabbath, read(path.join(ROOT, 'ideas', 'stewardship.json')).hash === I.hash], [1, true, true]);
c('1,481 of the 3,050 ideas fit the Sabbath (1,480 before the offering line)', [I.ideas.filter(r => r[sc] === 1).length, I.count], [1481, 3050]);

console.log('\n-- 4. the writers\' notes --');
const G = txt(path.join(SRC, 'SABBATH-GUIDELINE.md'));
c('SABBATH-GUIDELINE.md beside the library carries his 2 Oct offering line', /\*\*Offerings \(the pastor, 2 Oct 2026\):\*\* a special offering taken during Sabbath worship for a church project/.test(G), true);
const W = txt(path.join(SRC, 'WRITERS.md'));
const field = W.slice(W.indexOf('- **sabbath:**'), W.indexOf('- **need:**'));
c('WRITERS.md: a special offering in Sabbath worship for a church project is fine; fundraising events and sales are not; "offerings for a project" is no longer a reason',
  [/special offering in Sabbath worship for a church project/.test(field.replace(/\s+/g, ' ')), /fundraising events and sales/.test(field.replace(/\s+/g, ' ')), /offerings for a project/.test(field.replace(/\s+/g, ' '))], [true, true, false]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
