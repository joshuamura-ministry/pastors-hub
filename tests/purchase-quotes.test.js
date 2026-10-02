// v56 · Make the Case · projects and purchases: the verse and Ellen White library of the purchase path (DESIGN-PURCHASE.md §8, §10 T1).
// tests/purchase-quotes.json is the design's verified file (Bible Gateway KJV / RVA 1909 and egwwritings.org, fetched 2 Oct 2026, built by
// the design's build-purchase-quotes.mjs, which writes nothing if any check fails). Held here: its shape is case-quotes.json's; every verse
// is word for word what Bible Gateway prints (tests/scripture-bg.json, the repo's own verbatim rule), its reference the page's own; a verse
// it shares with the ministry library is byte-identical there; no Malachi 3:10 (tithe never argues a local project); every plan id exists;
// every Ellen White entry has EN and ES text and reference and an egwwritings.org source, no markup; and index.html's PURCHASE_VERSES /
// PURCHASE_EGW / PURCHASE_VERSE_PLAN / PURCHASE_VERSE_PLANS are the file, as CASE_VERSES is case-quotes.json.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const Q = require('./purchase-quotes.json'), CQ = require('./case-quotes.json'), BG = require('./scripture-bg.json').passages;
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 500)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
/* the verbatim rule (tests/v40-accuracy.test.js's, strict at both ends) */
const ELL = '…';
const opening = p => p;
function verbatim(text, printed) {
  printed = opening(printed);
  const t = text.replace(/\.\.\./g, ELL), pieces = t.split(ELL).map(s => s.trim()).filter(Boolean);
  let pos = 0, first = null, end = null;
  for (const f of pieces) { const i = printed.indexOf(f, pos); if (i < 0) return 'not word for word: "' + f + '"'; if (first === null) first = i; pos = end = i + f.length; }
  const lead = t.startsWith(ELL), trail = t.endsWith(ELL), rest = printed.slice(end).trim();
  if (first > 0 && !lead) return 'words left out at the start, no ellipsis';
  if (first === 0 && lead) return 'an ellipsis where nothing is left out (start)';
  if (rest && !trail) return 'words left out at the end, no ellipsis';
  if (!rest && trail) return 'an ellipsis where nothing is left out (end)';
  return null;
}
const bgKey = ref => Object.keys(BG).find(k => k === ref || BG[k].KJV.heading === ref || BG[k].KJV.heading.replace(/–/g, '-') === ref.replace(/–/g, '-')) || null;

console.log('-- the file: the shape of case-quotes.json --');
c('top-level keys (and the research file\'s _sources)', Object.keys(Q).filter(k => k !== '_sources'), Object.keys(CQ));
c('23 verses and 8 Ellen White entries', [Q.verses.length, Q.egw.length], [23, 8]);
c('every verse: id, en {text, ref}, es {text, ref}, jobs, needs, chars, src', Q.verses.filter(v => !(typeof v.id === 'string' && v.en && v.es && typeof v.en.text === 'string' && typeof v.en.ref === 'string' && typeof v.es.text === 'string' && typeof v.es.ref === 'string'
  && Array.isArray(v.jobs) && Array.isArray(v.needs) && v.chars && v.chars.en === v.en.text.length && v.chars.es === v.es.text.length && v.src && /biblegateway\.com/.test(v.src.en) && /version=RVA/.test(v.src.es))).map(v => v.id), []);
c('ids unique', new Set(Q.verses.map(v => v.id)).size, Q.verses.length);

console.log('\n-- Scripture word for word (KJV · RVA 1909, Bible Gateway) --');
c('every passage is in scripture-bg.json (the 13 new ones added, fetched)', Q.verses.filter(v => !bgKey(v.en.ref.replace(/^…/, ''))).map(v => v.id), []);
c('every text is word for word, each omission marked (EN and ES)', Q.verses.flatMap(v => { const b = BG[bgKey(v.en.ref)]; return ['en', 'es'].map(L => { const why = verbatim(v[L].text, b[L === 'en' ? 'KJV' : 'RVA'].text); return why ? v.id + ' [' + L + '] ' + why : null; }); }).filter(Boolean), []);
c('every reference is the page\'s own heading (EN KJV, ES RVA)', Q.verses.filter(v => { const b = BG[bgKey(v.en.ref)]; const n = s => s.replace(/–/g, '-').replace(/, /g, '-'); return n(v.en.ref) !== n(b.KJV.heading) || n(v.es.ref) !== n(b.RVA.heading); }).map(v => v.id), []);
c('a verse shared with the ministry library is byte-identical there', Q.verses.filter(v => { const o = CQ.verses.find(x => x.id === v.id); return o && JSON.stringify([o.en, o.es]) !== JSON.stringify([v.en, v.es]); }).map(v => v.id), []);
c('…the ten shared ones are those the design lists', Q.verses.filter(v => CQ.verses.some(x => x.id === v.id)).map(v => v.id).sort(), ['1chr29_14', '1cor14_40', '2cor8_21', '2cor9_7', 'acts2_46', 'hab2_2', 'luke14_28', 'mark10_14', 'neh2_18', 'prov15_22'].sort());
c('no Malachi 3:10 anywhere in the purchase library (tithe never argues a local project; the research file names it only as excluded)', [JSON.stringify({...Q,_sources:undefined}).includes('mal3_10'), Q._sources&&Q._sources.excluded&&Q._sources.excluded.mal3_10?'excluded':'not named', Q.verses.some(v => /Malachi|Malaquías/.test(v.en.ref + v.es.ref))], [false, 'excluded', false]);
c('Mark 10:14 serves only the children\'s reason', [Q.verses.find(v => v.id === 'mark10_14').needs, Object.entries(Q.plan.byNeed).filter(([k, ids]) => ids.includes('mark10_14')).map(([k]) => k)], [['children'], ['children']]);
const ids = new Set(Q.verses.map(v => v.id)), eids = new Set(Q.egw.map(g => g.id));
c('every plan id is a verse in the file', [...Object.values(Q.plan.byJob), ...Object.values(Q.plan.byNeed), ...Object.values(Q.plans).flatMap(p => Object.values(p))].flat().filter(id => !ids.has(id)), []);
c('every Ellen White plan id is an entry', Object.values(Q.plan.egwByJob).flat().filter(id => !eids.has(id)), []);

console.log('\n-- Ellen G. White (egwwritings.org, the site\'s published Spanish) --');
c('every entry: EN and ES text and reference, an m.egwwritings.org/en/book/ source, no markup', Q.egw.filter(g => !(g.en && g.es && g.en.text && g.es.text && /^Ellen G\. White · /.test(g.en.ref) && /^Elena G\. de White · /.test(g.es.ref)
  && typeof g.src === 'string' && /^https:\/\/m\.egwwritings\.org\/en\/book\//.test(g.src) && !/<[A-Za-z!/?]/.test(g.en.text + g.es.text))).map(g => g.id), []);
c('the eight the design verified', Q.egw.map(g => g.id), ['pp343_3', 'pp344_5', 'pp344_5d', 'pp376_1', '5t491_1', '6t101_4', '9t144_1', 'aa342_1']);
// v10.44 review (finding 22): a reference names every page its quoted words are on (egwwritings.org's page marks, read 2 Oct 2026, kept
// in the file's _sources.egwPages): PP 344.5 runs onto p. 347, 5TPI 463.2 onto p. 464, 6T 101.4 onto p. 102, 6TPI 106.4 onto p. 107
const pagesOf = ref => { const m = /, pp?\. ([\d, ]+)$/.exec(ref); return m ? m[1].split(/,\s*/).map(Number) : null; };
c('every Ellen White reference names every page its words are on (EN and ES)', Q.egw.flatMap(g => ['en', 'es'].map(L => { const w = Q._sources && Q._sources.egwPages && Q._sources.egwPages[g.id] && Q._sources.egwPages[g.id][L];
  return w && JSON.stringify(pagesOf(g[L].ref)) === JSON.stringify(w) ? null : g.id + ' [' + L + '] ' + g[L].ref + (w ? ' (pages ' + w.join(', ') + ')' : ' (no pages on file)'); })).filter(Boolean), []);
c('…"pp." for two pages, "p." for one', Q.egw.flatMap(g => ['en', 'es'].map(L => /, pp\. \d+, \d+$/.test(g[L].ref) === (pagesOf(g[L].ref) || []).length > 1)).every(Boolean), true);
c('the four that run onto a later page', ['pp344_5d|en', '5t491_1|es', '6t101_4|en', '6t101_4|es'].map(k => { const [id, L] = k.split('|'); return Q.egw.find(g => g.id === id)[L].ref.replace(/^.* · /, ''); }),
  ['Patriarchs and Prophets, pp. 344, 347', 'Testimonios para la Iglesia, tomo 5, pp. 463, 464', 'Testimonies for the Church, vol. 6, pp. 101, 102', 'Testimonios para la Iglesia, tomo 6, pp. 106, 107']);
c('Patriarchs and Prophets p. 344 says the house "should not be left in debt" (the debt entry)', /should not be left in debt/.test(Q.egw.find(g => g.id === 'pp344_5d').en.text), true);

console.log('\n-- index.html carries the file, byte for byte (as CASE_VERSES carries case-quotes.json) --');
const grab = n => { const m = new RegExp('\\nconst ' + n + '=(.*?);\\n').exec(html); return m ? JSON.parse(m[1]) : null; };
c('PURCHASE_VERSES is the file\'s verses', JSON.stringify(grab('PURCHASE_VERSES')), JSON.stringify(Q.verses));
c('PURCHASE_EGW is the file\'s Ellen White', JSON.stringify(grab('PURCHASE_EGW')), JSON.stringify(Q.egw));
c('PURCHASE_VERSE_PLAN is the file\'s plan', JSON.stringify(grab('PURCHASE_VERSE_PLAN')), JSON.stringify(Q.plan));
c('PURCHASE_VERSE_PLANS is the file\'s audience plans', JSON.stringify(grab('PURCHASE_VERSE_PLANS')), JSON.stringify(Q.plans));
c('no Malachi 3:10 among the purchase verses in index.html', JSON.stringify([grab('PURCHASE_VERSES'), grab('PURCHASE_VERSE_PLAN'), grab('PURCHASE_VERSE_PLANS')]).includes('mal3_10'), false);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
