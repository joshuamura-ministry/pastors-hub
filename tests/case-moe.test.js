// Margins of error: the Census handbook's worked examples, edge cases, and a
// cell-for-cell check that metricMoe() follows metrics() in index.html.
// Run: node moe.test.js   → prints "N passed, M failed", exits 1 on any failure.
// Looks for moe.js beside this file; failing that, for the MARGINS OF ERROR block
// inside index.html (so the suite still works once the block is pasted in).
const fs = require('fs'), path = require('path');
const here = __dirname;
const firstFile = list => list.find(f => f && fs.existsSync(f));
const indexPath = firstFile([process.env.TERRAIN_INDEX, path.join(here, '..', 'index.html'), path.join(here, '..', 'proj', 'index.html')]);
if (!indexPath) { console.log('  FAIL  index.html not found (set TERRAIN_INDEX)\n\n0 passed, 1 failed'); process.exit(1); }
const html = fs.readFileSync(indexPath, 'utf8');

/* ---------- load the MOE code ---------- */
let moeSrc;
if (fs.existsSync(path.join(here, 'moe.js'))) moeSrc = fs.readFileSync(path.join(here, 'moe.js'), 'utf8');
else { const m = html.match(/\/\* =+ MARGINS OF ERROR[\s\S]*?\/\* =+ \/MARGINS OF ERROR =+ \*\//); moeSrc = m && m[0]; }
if (!moeSrc) { console.log('  FAIL  MARGINS OF ERROR code not found\n\n0 passed, 1 failed'); process.exit(1); }
const NAMES = ['MOE_Z90', 'MOE_SPEC', 'MOE_COUNTS', 'MOE_VARS', 'MOE_VARS_ALL', 'MOE_TEXT', 'moeCells', 'moeEst', 'moeVal', 'moeToSe', 'moeCv', 'moeRange', 'moeSum',
  'moeProportion', 'moeRatio', 'moeProduct', 'diffZ', 'significantDiff', 'metricEstMoe', 'metricMoe', 'metricMoes', 'compareResult', 'compareText'];
const X = new Function(moeSrc + '\nreturn {' + NAMES.join(',') + '};')();
const { MOE_SPEC, MOE_COUNTS, MOE_VARS, MOE_VARS_ALL, moeEst, moeVal, moeToSe, moeCv, moeRange, moeSum, moeProportion, moeRatio, moeProduct,
  diffZ, significantDiff, metricEstMoe, metricMoe, metricMoes, compareResult, compareText } = X;

/* ---------- load the app's own N, pct, VARS and metrics() ---------- */
const grab = (re, what) => { const m = html.match(re); if (!m) throw new Error('could not find ' + what + ' in index.html'); return m[0]; };
const appSrc = [
  grab(/const N=x=>\{[^\n]*\n/, 'N'),
  grab(/const pct=\(a,b\)=>[^\n]*\n/, 'pct'),
  grab(/const seq=\(t,a,b\)=>[\s\S]*?\nconst VARS=\[[\s\S]*?\n\];/, 'VARS'),
  grab(/const chunk=\(a,n\)=>[^\n]*\n/, 'chunk'),
  grab(/function metrics\(o,past,origins\)\{[\s\S]*?\n\}\n/, 'metrics()')
].join('\n');
// The MOE block goes first, so this still loads if VARS or metrics() come to use it.
const APP = new Function(moeSrc + '\n' + appSrc + '\nreturn {N,pct,VARS,chunk,metrics};')();
const VARS_E = APP.VARS.filter(id => /E$/.test(id));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (got !== undefined ? '   got: ' + JSON.stringify(got) : '')); } };
const R = (x, d = 0) => x == null ? x : Math.round(x * 10 ** d) / 10 ** d;
const eq = (name, got, exp) => ok(name, JSON.stringify(got) === JSON.stringify(exp), got);
const near = (name, got, exp, tol = 1e-9) => ok(name, typeof got === 'number' && Math.abs(got - exp) <= tol, got);
const section = t => console.log('\n' + t);

/* =====================================================================
   1. The handbook's worked examples, to the precision the handbook prints
   ===================================================================== */
section('Handbook 2020 ch. 8, Example 1 — never-married females, three Virginia areas (Table 8.1)');
const ex1 = moeSum([3860, 2642, 1957]);
near('Σ MOE² = 25,709,613', ex1 * ex1, 25709613, 1e-6);
eq('MOE of the sum = ±5,070', R(ex1), 5070);
eq('SEs of the parts = 2,347 · 1,606 · 1,190', [3860, 2642, 1957].map(m => R(moeToSe(m))), [2347, 1606, 1190]);
eq('SE of the sum = 3,082', R(moeToSe(ex1)), 3082);
eq('CV = 1.5%', R(moeCv(135173 + 43104 + 24842, ex1), 1), 1.5);

section('Handbook 2020 ch. 8, Example 2 — Loudoun County income bands (Tables 8.2, 8.3)');
const T82 = [[2163, 812, 494, 22.8], [1178, 504, 306, 26.0], [1502, 743, 452, 30.1], [1995, 722, 439, 22.0], [1756, 685, 416, 23.7], [1781, 631, 384, 21.5],
  [2708, 1007, 612, 22.6], [1981, 647, 393, 19.9], [2581, 996, 605, 23.5], [6590, 1109, 674, 10.2], [6861, 1288, 783, 11.4], [14391, 1810, 1100, 7.6],
  [14790, 1944, 1182, 8.0], [12735, 1341, 815, 6.4], [18167, 1890, 1149, 6.3], [29380, 2053, 1248, 4.2]];
eq('Table 8.2: SE and CV of all 16 bands', T82.map(([e, m]) => [R(moeToSe(m)), R(moeCv(e, m), 1)]), T82.map(([, , s, c]) => [s, c]));
const sg = [[743, 722], [685, 631], [1007, 647, 996]].map(ms => moeSum(ms));
eq('Σ MOE² = 1,073,333 · 867,386 · 2,424,674', sg.map(m => R(m * m)), [1073333, 867386, 2424674]);
eq('subgroup MOEs = ±1,036 · ±931 · ±1,557', sg.map(m => R(m)), [1036, 931, 1557]);
eq('subgroup SEs = 630 · 566 · 947', sg.map(m => R(moeToSe(m))), [630, 566, 947]);
eq('subgroup CVs = 18.0 · 16.0 · 13.0', [3497, 3537, 7270].map((e, i) => R(moeCv(e, sg[i]), 1)), [18.0, 16.0, 13.0]);

section('Handbook 2020 ch. 8, Example 3 — the proportion never married (Table 8.4, formula 6)');
const ex3den = moeSum([391, 572, 459]);
eq('Σ MOE² of the denominator = 690,746', R(ex3den * ex3den), 690746);
eq('MOE of the denominator = ±831', R(ex3den), 831);
eq('proportion = 0.322', R(203119 / 630498, 3), 0.322);
const ex3 = moeProportion(203119, 630498, ex1, ex3den) * 100;
eq('MOE of the percentage = 0.8%', R(ex3, 1), 0.8);
eq('its SE = 0.488', R(moeToSe(ex3), 3), 0.488);
eq('its CV = 1.5%', R(moeCv(32.2, ex3), 1), 1.5);

section('Handbook 2020 ch. 8, Example 4 — males to females ratio (Table 8.5, formula 7)');
const ex4num = moeSum([4222, 2819, 2259]);
eq('MOE of never-married males = ±5,557', R(ex4num), 5557);
eq('ratio = 1.117', R(226840 / 203119, 3), 1.117);
const ex4 = moeRatio(226840, 203119, ex4num, ex1);
eq('MOE of the ratio = 0.039', R(ex4, 3), 0.039);
eq('its SE = 0.024', R(moeToSe(ex4), 3), 0.024);
eq('its CV = 2.1%', R(moeCv(226840 / 203119, ex4), 1), 2.1);

section('Handbook 2020 ch. 8 — product of two estimates (formula 9)');
const prod = 74506512 * 0.824, prodMoe = moeProduct(74506512, 0.824, 228238, 0.001);
eq('estimate = 61,393,366', R(prod), 61393366);
eq('MOE = 202,289', R(prodMoe), 202289);
eq('90% interval = 61,191,077 to 61,595,655', moeRange(prod, prodMoe, 0, Infinity).map(x => R(x)), [61191077, 61595655]);
eq('SE = 122,972', R(moeToSe(prodMoe)), 122972);
eq('CV = 0.2%', R(moeCv(prod, prodMoe), 1), 0.2);

section('Handbook 2018 ch. 7 — SE, CV and interval (Table 7.1, Colorado one-person households)');
eq('SE = 10,127 / 1.645 = 6,156', R(moeToSe(10127)), 6156);
eq('CV = 1.1%', R(moeCv(564757, 10127), 1), 1.1);
eq('90% interval = 554,630 to 574,884', moeRange(564757, 10127, 0, Infinity), [554630, 574884]);
eq('SE uses 1.645 exactly', moeToSe(1.645), 1);

section('Handbook 2018 ch. 7 — significance at 90% (formula 3) and overlapping periods (formula 4)');
eq('Florida 12.6±0.2 vs Arizona 10.5±0.3: Z = 9.581', R(diffZ(12.6, 0.2, 10.5, 0.3), 3), 9.581);
eq('… statistically significant', significantDiff(12.6, 0.2, 10.5, 0.3), true);
eq('Indiana 10.8±0.2 vs Arizona 10.5±0.3: Z = 1.369', R(diffZ(10.8, 0.2, 10.5, 0.3), 3), 1.369);
eq('… not significant', significantDiff(10.8, 0.2, 10.5, 0.3), false);
eq('Holmes County 13.1±2.3 vs 13.6±2.3, C = 0.2: |Z| = 0.283', R(Math.abs(diffZ(13.1, 2.3, 13.6, 2.3, 0.2)), 3), 0.283);
eq('… not significant', significantDiff(13.1, 2.3, 13.6, 2.3, 0.2), false);
eq('Z is signed (est1 lower → negative)', diffZ(10.5, 0.3, 12.6, 0.2) < 0, true);

section('Census MOE webinar (2016), p. 12 — summing zero estimates');
eq('36+0+0+0 with MOEs 56, 27, 29, 29 → ±63 (largest zero MOE once)', R(moeSum([56, 27, 29, 29], [36, 0, 0, 0])), 63);
eq('… and ±74 if every zero MOE were used', R(moeSum([56, 27, 29, 29])), 74);

/* =====================================================================
   2. Formula edge cases
   ===================================================================== */
section('Proportion: the negative-radicand fallback');
near('ordinary case keeps the minus: √(10² − 0.5²·4²)/100', moeProportion(50, 100, 10, 4), Math.sqrt(100 - 0.25 * 16) / 100);
near('radicand < 0 → plus sign: √(10² + 1²·20²)/100', moeProportion(100, 100, 10, 20), Math.sqrt(100 + 400) / 100);
near('… which is exactly the ratio formula', moeProportion(100, 100, 10, 20), moeRatio(100, 100, 10, 20));
eq('radicand exactly 0 stays 0 (no fallback)', moeProportion(100, 100, 10, 10), 0);
near('numerator 0 → MOE(X)/Y', moeProportion(0, 400, 13, 50), 13 / 400);

section('Nothing to compute → null, never NaN or a made-up 0');
eq('zero denominator (proportion)', moeProportion(5, 0, 1, 1), null);
eq('negative denominator (proportion)', moeProportion(5, -3, 1, 1), null);
eq('zero denominator (ratio)', moeRatio(5, 0, 1, 1), null);
eq('suppressed numerator (null)', moeProportion(null, 10, 1, 1), null);
eq('suppressed MOE (null)', moeProportion(5, 10, null, 1), null);
eq('NaN input', moeProportion(NaN, 10, 1, 1), null);
eq('string input is not coerced', moeProportion('5', 10, 1, 1), null);
eq('negative MOE', moeProportion(5, 10, -1, 1), null);
eq('empty sum', moeSum([]), null);
eq('sum with a missing MOE', moeSum([3, null, 4]), null);
eq('sum with a negative MOE (an unread annotation code)', moeSum([3, -222222222]), null);
eq('sum of a non-array', moeSum('3,4'), null);
eq('sum of 3 and 4 = 5', moeSum([3, 4]), 5);
eq('SE of null / negative', [moeToSe(null), moeToSe(-1)], [null, null]);
eq('CV of an estimate of 0', moeCv(0, 5), null);
eq('product with a null', moeProduct(5, null, 1, 1), null);
eq('interval with a null MOE', moeRange(5, null), null);
eq('interval clipped at 0 and 100', [moeRange(2, 5), moeRange(98, 5)], [[0, 7], [93, 100]]);

section('Significance edge cases');
eq('missing estimate → null', significantDiff(null, 1, 5, 1), null);
eq('missing MOE → null', significantDiff(10, null, 5, 1), null);
eq('overlap C = 1 is undefined → null', diffZ(10, 1, 5, 1, 1), null);
ok('two controlled figures (MOE 0) that differ → Z = +∞, significant', diffZ(10.1, 0, 10, 0) === Infinity && diffZ(10, 0, 10.1, 0) === -Infinity && significantDiff(10.1, 0, 10, 0) === true);
eq('two controlled figures that are equal → Z = 0, not different', [diffZ(10, 0, 10, 0), significantDiff(10, 0, 10, 0)], [0, false]);
ok('SE 1 and a gap of 1.645 gives Z = 1.645 exactly', diffZ(1.645, 1.645, 0, 0) === 1.645, diffZ(1.645, 1.645, 0, 0));
eq('… which is not significant (the test is strictly greater)', significantDiff(1.645, 1.645, 0, 0), false);
eq('… and just over it is', significantDiff(1.646, 1.645, 0, 0), true);

section('Reading raw API values');
eq('MOE "-555555555" (controlled, *****) → 0', moeVal('-555555555'), 0);
eq('MOE −222222222 (**), −333333333 (***), −666666666, −888888888, −999999999 → null',
  [-222222222, '-333333333', -666666666, -888888888, -999999999].map(moeVal), [null, null, null, null, null]);
eq('MOE "" / null / undefined / "abc" → null', ['', null, undefined, 'abc'].map(moeVal), [null, null, null, null]);
eq('MOE "12" → 12, 0 → 0', [moeVal('12'), moeVal(0)], [12, 0]);
eq('estimates are read exactly as the app\'s N() reads them',
  ['12', '0', '', null, undefined, '-666666666', -222222222, '-5', 'x', '3.5'].map(moeEst),
  ['12', '0', '', null, undefined, '-666666666', -222222222, '-5', 'x', '3.5'].map(APP.N));

/* =====================================================================
   3. MOE_VARS: exactly the cells metrics() reads, as _M ids
   ===================================================================== */
section('MOE_VARS against metrics() in ' + path.relative(process.cwd(), indexPath));
const HEADLINE = ['kidsShare', 'poverty', 'childPoverty', 'snap', 'uninsured', 'renters', 'rent50', 'rent30', 'overcrowd', 'noCar', 'singleParent',
  'seniorsAlone', 'foreign', 'limEng', 'unemp', 'incLow', 'incHigh', 'veterans', 'grandKids'];
const COUNTS = ['pop', 'kids', 'hh', 'famKids', 'seniorsAloneN', 'foreignN'];
eq('MOE_VARS covers the 19 headline metrics, in order', Object.keys(MOE_VARS), HEADLINE);
eq('MOE_COUNTS covers the 6 counts', Object.keys(MOE_COUNTS), COUNTS);
ok('every id is a _M id', MOE_VARS_ALL.every(id => /^[BC]\d{5}_\d{3}M$/.test(id)));
eq('MOE_VARS_ALL = 79 distinct ids', [MOE_VARS_ALL.length, new Set(MOE_VARS_ALL).size], [79, 79]);
eq('MOE_VARS_ALL is the union of MOE_VARS', [...new Set(Object.values(MOE_VARS).flat())].sort(), [...MOE_VARS_ALL].sort());
{ const n = MOE_VARS_ALL.filter(id => APP.VARS.includes(id)).length;
  ok(`VARS holds none of the _M ids yet, or all 79 once appended (now ${n})`, n === 0 || n === 79, n);
  eq('VARS holds no other _M ids', APP.VARS.filter(id => /M$/.test(id) && !MOE_VARS_ALL.includes(id)), []); }
eq('every _M id has its _E twin in VARS', MOE_VARS_ALL.filter(id => !APP.VARS.includes(id.replace(/M$/, 'E'))), []);
ok('every count cell is already in MOE_VARS_ALL (no extra variables)', Object.values(MOE_COUNTS).flat().every(c => MOE_VARS_ALL.includes(c + 'M')));
{
  const f = path.join(here, 'acs2024-moe-vars.json');
  if (fs.existsSync(f)) {
    const meta = JSON.parse(fs.readFileSync(f, 'utf8')).variables;
    eq('all 79 ids are published for the 2020–2024 ACS 5-year (api.census.gov metadata)', MOE_VARS_ALL.filter(id => !(meta[id] && meta[id].label)), []);
  } else console.log('  skip  acs2024-moe-vars.json not beside the test');
}
{ const all = [...new Set([...APP.VARS, ...MOE_VARS_ALL])], parts = APP.chunk(all, 48);
  console.log(`  info  ${VARS_E.length} _E + ${MOE_VARS_ALL.length} _M = ${all.length} variables → fetchACS makes ${parts.length} calls per level (was ${Math.ceil(VARS_E.length / 48)})`);
  ok('fetchACS chunks stay within the API\'s 50-variable limit (48 + NAME)', parts.every(c => c.length + 1 <= 50)); }

// A deterministic random row holding every E and M value.
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function randomRow(seed) {
  const r = rng(seed), o = { NAME: 'Test tract' };
  VARS_E.forEach(id => { o[id] = String(50 + Math.floor(r() * 5000)); });
  MOE_VARS_ALL.forEach(id => { o[id] = String(5 + Math.floor(r() * 300)); });
  return o;
}
// Which VARS cells does metrics()[key] actually depend on? Nudge each one and watch.
{
  const base = randomRow(7), m0 = APP.metrics(base), dep = {};
  const keys = [...HEADLINE, ...COUNTS];
  keys.forEach(k => dep[k] = []);
  VARS_E.forEach(id => {
    const o = { ...base, [id]: String(+base[id] + 17) }, m1 = APP.metrics(o);
    keys.forEach(k => { if (m1[k] !== m0[k]) dep[k].push(id); });
  });
  HEADLINE.forEach(k => eq(`${k}: MOE_VARS = the cells metrics() reads (${dep[k].length})`,
    [...MOE_VARS[k]].map(id => id.replace(/M$/, 'E')).sort(), dep[k].sort()));
  COUNTS.forEach(k => eq(`${k} (count): MOE_COUNTS = the cells metrics() reads`, MOE_COUNTS[k].map(c => c + 'E').sort(), dep[k].sort()));
}
// Estimates agree with metrics() to the last bit, across many random rows.
{
  const bad = [];
  for (let s = 1; s <= 200; s++) {
    const o = randomRow(s), m = APP.metrics(o);
    [...HEADLINE, ...COUNTS, 'homeowners'].forEach(k => { if (metricEstMoe(o, k).est !== m[k]) bad.push([s, k, metricEstMoe(o, k).est, m[k]]); });
  }
  eq('metricEstMoe().est === metrics()[key] for 26 keys × 200 random rows', bad.slice(0, 3), []);
  // and when cells are suppressed or zero
  const bad2 = [];
  for (let s = 1; s <= 200; s++) {
    const o = randomRow(1000 + s), r = rng(s);
    VARS_E.forEach(id => { const x = r(); if (x < 0.08) o[id] = '-666666666'; else if (x < 0.16) o[id] = '0'; else if (x < 0.18) delete o[id]; });
    const m = APP.metrics(o);
    [...HEADLINE, ...COUNTS, 'homeowners'].forEach(k => { const e = metricEstMoe(o, k).est; if (!(e === m[k] || (Number.isNaN(e) && Number.isNaN(m[k])))) bad2.push([s, k, e, m[k]]); });
  }
  eq('… and with suppressed, zero and missing cells mixed in', bad2.slice(0, 3), []);
}

/* =====================================================================
   4. metricMoe on rows worked by hand
   ===================================================================== */
section('metricMoe(o, key) — hand-worked rows');
const row = cells => { const o = {}; Object.entries(cells).forEach(([c, [e, m]]) => { o[c + 'E'] = e; if (m !== undefined) o[c + 'M'] = m; }); return o; };
near('poverty 200/1000, MOEs 50/100: √(50² − 0.2²·100²)/1000 ×100',
  metricMoe(row({ B17001_001: ['1000', '100'], B17001_002: ['200', '50'] }), 'poverty'), Math.sqrt(2500 - 0.04 * 10000) / 1000 * 100);
near('poverty 900/1000, MOEs 100/300: negative radicand → √(100² + 0.9²·300²)/1000 ×100',
  metricMoe(row({ B17001_001: ['1000', '300'], B17001_002: ['900', '100'] }), 'poverty'), Math.sqrt(10000 + 0.81 * 90000) / 1000 * 100);
{
  // childPoverty: 30 poor children (one non-zero cell), 250 children in all; zero cells carry MOEs 13 or 17.
  const c = {};
  [4, 5, 6, 7, 8, 9, 18, 19, 20, 21, 22, 23, 33, 34, 35, 36, 37, 38, 47, 48, 49, 50, 51, 52].forEach(n => c['B17001_' + String(n).padStart(3, '0')] = ['0', '13']);
  c.B17001_004 = ['30', '20']; c.B17001_006 = ['0', '17']; c.B17001_033 = ['100', '30']; c.B17001_047 = ['120', '35'];
  const o = row(c), got = metricEstMoe(o, 'childPoverty');
  eq('childPoverty estimate = 30 / 250 = 12%', got.est, 12);
  // numerator Σ = 20² + 17² (largest zero once) = 689; denominator Σ = 20² + 30² + 35² + 17² = 2814
  // Child poverty uses the ratio formula (7): a plus under the root, not a minus.
  near('childPoverty MOE = √(689 + 0.12²·2814)/250 ×100 (formula 7; zero cells: largest MOE once)', got.moe, Math.sqrt(689 + 0.0144 * 2814) / 250 * 100);
  ok('… smaller than if every zero MOE were counted', got.moe < Math.sqrt((400 + 289 + 10 * 169) + 0.0144 * (400 + 900 + 1225 + 289 + 19 * 169)) / 250 * 100);
  ok('… and clearly larger than formula (6) would give', got.moe > Math.sqrt(689 - 0.0144 * 2814) / 250 * 100 + 0.5, got.moe);
}
near('a 100% figure whose two MOEs cancel under (6) is not given MOE 0: ratio formula √(60² + 1²·60²)/500',
  metricMoe(row({ B25003_001: ['500', '60'], B25003_003: ['500', '60'] }), 'renters'), Math.sqrt(3600 + 3600) / 500 * 100);
eq('… so 100% renters against a county at 97% ±0.5 is not "clearly higher"',
  compareText(100, metricMoe(row({ B25003_001: ['500', '60'], B25003_003: ['500', '60'] }), 'renters'), 97, 0.5, 'en'), 'similar to the county');
{
  // The two departures from formula (6) can only widen an MOE, never narrow it.
  const f6 = (o, k) => {
    const s = MOE_SPEC[k], E = c => moeEst(o[c + 'E']), M = c => moeVal(o[c + 'M']);
    const sum = cs => cs.reduce((a, c) => a + (E(c) || 0), 0), dc = [...s.den, ...(s.less || [])];
    const den = sum(s.den) - (s.less ? sum(s.less) : 0);
    const p = moeProportion(sum(s.num), den, moeSum(s.num.map(M), s.num.map(E)), moeSum(dc.map(M), dc.map(E)));
    return p == null ? null : p * 100;
  };
  const narrower = []; let compared = 0;
  for (let sd = 1; sd <= 200; sd++) {
    const o = randomRow(5000 + sd);
    HEADLINE.forEach(k => { const a = metricMoe(o, k), b = f6(o, k);
      if ((a == null) !== (b == null) || (a != null && a < b - 1e-12)) narrower.push([sd, k, a, b]); else if (a != null) compared++; });
  }
  eq('every headline MOE ≥ the plain formula-(6) MOE (200 random rows × 19 metrics)', narrower.slice(0, 3), []);
  ok(`… on enough rows to mean something (${compared} of 3,800 had an MOE)`, compared > 3000, compared);
}
near('rent50: 100 of (500 − 20 not computed); MOE of the difference √(60² + 15²)',
  metricMoe(row({ B25070_001: ['500', '60'], B25070_011: ['20', '15'], B25070_010: ['100', '40'] }), 'rent50'),
  Math.sqrt(1600 - (100 / 480) ** 2 * (3600 + 225)) / 480 * 100);
near('rent30: four cells over the same denominator',
  metricMoe(row({ B25070_001: ['500', '60'], B25070_011: ['20', '15'], B25070_007: ['40', '20'], B25070_008: ['30', '20'], B25070_009: ['20', '15'], B25070_010: ['10', '10'] }), 'rent30'),
  Math.sqrt((400 + 400 + 225 + 100) - (100 / 480) ** 2 * 3825) / 480 * 100);
near('singleParent: (10 + 16) over (3 + 10 + 16)',
  metricMoe(row({ B11003_003: ['300', '50'], B11003_010: ['20', '15'], B11003_016: ['80', '30'] }), 'singleParent'),
  Math.sqrt((225 + 900) - (100 / 400) ** 2 * (2500 + 225 + 900)) / 400 * 100);
near('seniorsAlone: over households (B25003_001)',
  metricMoe(row({ B25003_001: ['2000', '90'], B11010_005: ['60', '25'], B11010_012: ['140', '40'] }), 'seniorsAlone'),
  Math.sqrt((625 + 1600) - 0.01 * 8100) / 2000 * 100);
near('grandKids: over children (B09001_001)',
  metricMoe(row({ B09001_001: ['1500', '120'], B10002_002: ['45', '30'] }), 'grandKids'),
  Math.sqrt(900 - 0.03 ** 2 * 14400) / 1500 * 100);
near('county kidsShare: population controlled ("-555555555" → 0) → MOE(kids)/pop',
  metricMoe(row({ B01003_001: ['646000', '-555555555'], B09001_001: ['131800', '37'] }), 'kidsShare'), 37 / 646000 * 100);
eq('both controlled → MOE 0', metricMoe(row({ B05002_001: ['646000', '-555555555'], B05002_013: ['64600', '-555555555'] }), 'foreign'), 0);
eq('MOE "**" (−222222222) on a cell → null', metricMoe(row({ B17001_001: ['1000', '100'], B17001_002: ['200', '-222222222'] }), 'poverty'), null);
eq('suppressed estimate (−666666666) → est and MOE null', metricEstMoe(row({ B17001_001: ['1000', '100'], B17001_002: ['-666666666', '50'] }), 'poverty'), { est: null, moe: null });
eq('zero denominator → est and MOE null', metricEstMoe(row({ B22010_001: ['0', '11'], B22010_002: ['0', '11'] }), 'snap'), { est: null, moe: null });
eq('rent50 with the total suppressed → MOE null (metrics() would divide by a negative)',
  metricMoe(row({ B25070_001: ['-666666666', '60'], B25070_011: ['20', '15'], B25070_010: ['100', '40'] }), 'rent50'), null);
{
  const noM = row({ B17001_001: ['1000'], B17001_002: ['200'] });
  eq('a row fetched before _M was added: estimate still there, MOE null', metricEstMoe(noM, 'poverty'), { est: 20, moe: null });
  eq('… and so no comparison words', compareText(20, metricMoe(noM, 'poverty'), 7, 0.4, 'en'), null);
}
{
  const o = row({ B25003_001: ['2000', '90'], B25003_003: ['960', '80'] });
  eq('homeowners: 100 − renters, same MOE', [metricEstMoe(o, 'homeowners').est, metricMoe(o, 'homeowners')], [100 - 48, metricMoe(o, 'renters')]);
}
near('count: kids MOE is the published MOE', metricMoe(row({ B09001_001: ['1490', '212'] }), 'kids'), 212);
near('count: seniorsAloneN = √(25² + 40²)', metricMoe(row({ B11010_005: ['60', '25'], B11010_012: ['140', '40'] }), 'seniorsAloneN'), Math.sqrt(625 + 1600));
eq('unknown key → {est:null, moe:null}', metricEstMoe(row({ B17001_001: ['1000', '100'] }), 'nope'), { est: null, moe: null });
eq('no row → null', [metricMoe(null, 'poverty'), metricMoe(undefined, 'kids')], [null, null]);
{
  const all = metricMoes(randomRow(3));
  eq('metricMoes() returns 26 keys', Object.keys(all).length, 26);
  ok('… every one a finite number ≥ 0 on a complete row', Object.values(all).every(v => typeof v === 'number' && isFinite(v) && v >= 0), all);
}

/* =====================================================================
   5. The words
   ===================================================================== */
section('compareText(here, hereMoe, county, countyMoe, lang)');
eq('19.4±3.0 vs 7.1±0.4 → higher', compareText(19.4, 3.0, 7.1, 0.4, 'en'), 'clearly higher than the county');
eq('22.0±5.1 vs 20.4±0.1 → similar', compareText(22.0, 5.1, 20.4, 0.1, 'en'), 'similar to the county');
eq('3.0±1.0 vs 7.1±0.3 → lower', compareText(3.0, 1.0, 7.1, 0.3, 'en'), 'clearly lower than the county');
eq('Spanish', [compareText(19.4, 3.0, 7.1, 0.4, 'es'), compareText(22.0, 5.1, 20.4, 0.1, 'es'), compareText(3.0, 1.0, 7.1, 0.3, 'es')],
  ['claramente por encima del condado', 'similar al condado', 'claramente por debajo del condado']);
eq('"es-US" and "ES" are Spanish; anything else, or nothing, is English',
  [compareText(19.4, 3, 7.1, 0.4, 'es-US'), compareText(19.4, 3, 7.1, 0.4, 'ES'), compareText(19.4, 3, 7.1, 0.4, 'fr'), compareText(19.4, 3, 7.1, 0.4)],
  ['claramente por encima del condado', 'claramente por encima del condado', 'clearly higher than the county', 'clearly higher than the county']);
eq('handbook: Florida vs Arizona reads "clearly higher"', compareText(12.6, 0.2, 10.5, 0.3, 'en'), 'clearly higher than the county');
eq('handbook: Indiana vs Arizona reads "similar" (a 0.3-point gap)', compareText(10.8, 0.2, 10.5, 0.3, 'en'), 'similar to the county');
eq('a big gap with a big MOE is still only "similar"', compareText(27.2, 9.0, 20.4, 0.1, 'en'), 'similar to the county');
eq('missing figure or missing MOE → null (say nothing comparative)',
  [compareText(null, 1, 7, 0.4), compareText(19, 1, null, 0.4), compareText(19, null, 7, 0.4), compareText(19, 1, 7, undefined)], [null, null, null, null]);
{ const z = diffZ(20.4, 0.5, 19.6, 0.2);
  ok('20.4±0.5 vs 19.6±0.2 is statistically different (Z ≈ 2.44)', z > 1.645, z);
  eq('… but both print as 20%, so the words stay "similar"', [compareText(20.4, 0.5, 19.6, 0.2, 'en'), compareResult(20.4, 0.5, 19.6, 0.2).sig], ['similar to the county', true]);
  eq('… and at one decimal place (20.4% vs 19.6%) it is "clearly higher"', compareText(20.4, 0.5, 19.6, 0.2, 'en', 1), 'clearly higher than the county'); }
eq('compareResult carries direction, sig and Z', (r => [r.dir, r.sig, R(r.z, 3)])(compareResult(10.8, 0.2, 10.5, 0.3)), ['similar', false, 1.369]);

/* =====================================================================
   6. Real rows: two Bucks County tracts against the county (2020–2024 ACS)
   ===================================================================== */
{
  const f = path.join(here, 'moe-real-bucks.json');
  if (!fs.existsSync(f)) console.log('\n  skip  moe-real-bucks.json not beside the test');
  else {
    const real = JSON.parse(fs.readFileSync(f, 'utf8'));
    section('Real rows — ' + real.tractHigh.NAME.split(';')[0] + ' and ' + real.tractMid.NAME.split(';')[0] + ' against ' + real.county.NAME);
    const rows = { high: real.tractHigh, mid: real.tractMid, county: real.county };
    const M = {}, E = {};
    Object.entries(rows).forEach(([k, o]) => { M[k] = metricMoes(o); E[k] = APP.metrics(o); });
    Object.entries(rows).forEach(([k, o]) => {
      const bad = [...HEADLINE, ...COUNTS].filter(key => metricEstMoe(o, key).est !== E[k][key]);
      eq(`${k}: estimates match metrics() for all 25 keys`, bad, []);
      const miss = HEADLINE.filter(key => !(typeof M[k][key] === 'number' && isFinite(M[k][key])));
      eq(`${k}: every headline MOE is known`, miss, []);
    });
    eq('county population is controlled (MOE 0)', M.county.pop, 0);
    eq('every county MOE is smaller than the tract MOE', HEADLINE.filter(k => !(M.county[k] < M.high[k] && M.county[k] < M.mid[k])), []);
    const fmt = (e, m) => e == null ? '—' : e.toFixed(1) + ' ±' + (m == null ? '?' : m.toFixed(1));
    console.log('\n    metric          ' + 'tract 1002.08'.padEnd(15) + 'verdict'.padEnd(16) + 'tract 1014.04'.padEnd(15) + 'verdict'.padEnd(16) + 'county');
    HEADLINE.forEach(k => {
      const v = t => (compareResult(E[t][k], M[t][k], E.county[k], M.county[k]) || {}).dir || '—';
      console.log('    ' + k.padEnd(16) + fmt(E.high[k], M.high[k]).padEnd(15) + v('high').padEnd(16) + fmt(E.mid[k], M.mid[k]).padEnd(15) + v('mid').padEnd(16) + fmt(E.county[k], M.county[k]));
    });
    console.log('');
    const verdict = (t, k) => (compareResult(E[t][k], M[t][k], E.county[k], M.county[k]) || {}).dir;
    eq('tract 1002.08 poverty (the county\'s highest) is "higher"', verdict('high', 'poverty'), 'higher');
    eq('tract 1002.08: every "higher"/"lower" verdict really has |Z| > 1.645',
      HEADLINE.filter(k => { const r = compareResult(E.high[k], M.high[k], E.county[k], M.county[k]); return r && r.dir !== 'similar' && !(Math.abs(r.z) > 1.645); }), []);
    const sigCount = t => HEADLINE.filter(k => verdict(t, k) !== 'similar').length;
    ok('the median tract earns fewer "clearly" verdicts than the highest-poverty tract', sigCount('mid') < sigCount('high'), [sigCount('mid'), sigCount('high')]);
    // Against the Census Bureau's own published percentages (direct MOEs, covariance included).
    if (real.published) {
      const P = real.published, keys = ['poverty', 'childPoverty', 'renters', 'foreign'], geo = { high: 'tractHigh', mid: 'tractMid', county: 'county' };
      console.log('\n    derived MOE vs the Census Bureau\'s published MOE (S1701, DP04, DP02)');
      Object.entries(geo).forEach(([t, g]) => console.log('    ' + t.padEnd(8) + keys.map(k => k + ' ' + M[t][k].toFixed(1) + ' / ' + P[g][k][1]).join('   ')));
      eq('same estimates as the published percentages (to 0.1)', ['high', 'mid', 'county'].flatMap(t => keys.filter(k => R(E[t][k], 1) !== P[geo[t]][k][0]).map(k => t + '.' + k)), []);
      ok('each derived MOE is within a factor of 2 of the published one (the handbook approximation)',
        ['high', 'mid', 'county'].every(t => keys.every(k => { const q = M[t][k] / P[geo[t]][k][1]; return q > 0.5 && q < 2; })));
      ok('childPoverty, tract 1002.08: formula (7) gives ±22.3, within 10% of the published ±24.4 (formula 6 gave ±15.9)',
        R(M.high.childPoverty, 1) === 22.3 && Math.abs(M.high.childPoverty / P.tractHigh.childPoverty[1] - 1) < 0.1, M.high.childPoverty);
      const pubVerdict = (t, k) => compareResult(P[geo[t]][k][0], P[geo[t]][k][1], P.county[k][0], P.county[k][1]).dir;
      eq('all 8 tract-vs-county verdicts match the verdicts from the published MOEs',
        ['high', 'mid'].flatMap(t => keys.filter(k => verdict(t, k) !== pubVerdict(t, k)).map(k => t + '.' + k)), []);
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
