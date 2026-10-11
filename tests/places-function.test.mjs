// v10.69.0 · places.mjs (places-1.0): the church box's suggestions, against an in-memory Netlify Blobs store and a stubbed fetch: no network,
// no Google lookup spent. The pastor (11 Oct 2026): "is there a way to make it so that it actually knows like … when you type in Google? …
// if I say Fairview village seventh day so that I won't have to put in exactly … how every single thing should be before. It actually knows
// what church I'm talking about." The conference's churches below are MADE UP but shaped as the official directory lists them (the name
// "… SDA Church", the address in one line). Written failing-first on v10.68.0 (the file did not exist).
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 700)); console.log('    want:', JSON.stringify(e).slice(0, 500)); fail++; } else pass++; };
const tick = () => new Promise(r => setImmediate(r));
function makeStore() {
  const m = new Map(); let n = 0;
  return { m,
    async get(k) { await tick(); const v = m.get(k); return v === undefined ? null : JSON.parse(v.data); },
    async getWithMetadata(k) { await tick(); const v = m.get(k); return v ? { data: JSON.parse(v.data), etag: v.etag, metadata: {} } : null; },
    async setJSON(k, val, o = {}) { await tick(); const cur = m.get(k);
      if (o.onlyIfNew && cur) return { modified: false };
      if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
      const etag = 'e' + (++n); m.set(k, { data: JSON.stringify(val), etag }); return { modified: true, etag }; },
    peek(k) { const v = m.get(k); return v ? JSON.parse(v.data) : null; },
    poke(k, val) { m.set(k, { data: JSON.stringify(val), etag: 'e' + (++n) }); },
    keys(p = '') { return [...m.keys()].filter(k => k.startsWith(p)).sort(); } };
}
const S = makeStore(); globalThis.__terrainDigitalStore = S;
let T = Date.parse('2026-10-11T12:00:00Z'); globalThis.__terrainPlacesNow = () => T; globalThis.__terrainDigitalNow = () => T;
const SECRET = 'x'.repeat(40); process.env.TERRAIN_REG_SECRET = SECRET;
const regTok = (id = 'AbCdEfGhIjKl') => { const iat = Math.floor(T / 1000).toString(36); return `r1.${id}.${iat}.` + createHmac('sha256', SECRET).update(`terrain-reg|r1|${id}|${iat}`, 'utf8').digest('base64url').slice(0, 32); };
const CH = [
  { org: 'ANBX01', name: 'Fairview Village SDA Church', kind: 'church', address: '1010 Sample Mill Rd Eagleville PA 19403-1047', town: 'Eagleville' },
  { org: 'ANBX02', name: 'Bucks County SDA Church', kind: 'church', address: '10 Greene Rd Warminster PA 18974-4422', town: 'Warminster' },
  { org: 'ANBX03', name: 'Bucks County Hispanic Mission Group', kind: 'group', address: '10 Greene Rd Warminster PA 18974-4422', town: 'Warminster' },
  { org: 'ANBX04', name: 'Allentown SDA Church', kind: 'church', address: '2140 W Sample St Allentown PA 18104', town: 'Allentown' },
  { org: 'ANBX05', name: 'Philadelphia Boulevard SDA Church', kind: 'church', address: '5 Sample Blvd Philadelphia PA 19149', town: 'Philadelphia' },
  { org: 'ANBX06', name: 'No Address SDA Church', kind: 'church', address: null, town: null },
];
S.poke('c/pennsylvania', { v: 1, conf: 'Pennsylvania', churches: CH.map(o => ({ ...o, site: { pagesRead: ['/'] }, pastor: 'Made Up' })) });

let calls = [];
const PRED = (id, main, sec) => ({ placePrediction: { placeId: id, structuredFormat: { mainText: { text: main }, secondaryText: { text: sec } } } });
let G = { ac: { suggestions: [PRED('ChIJsample00001', 'Grace Fellowship Church', 'Main Street, Sampleton, PA, USA'), PRED('ChIJsample00002', '12 Sample Ave', 'Sampleton, PA, USA'),
  PRED('ChIJsample00003', 'Fairview Village Seventh-day Adventist Church', 'Sample Mill Road, Eagleville, PA, USA')] }, acStatus: 200,
  pd: { formattedAddress: '12 Sample Ave, Sampleton, PA 19000, USA', location: { latitude: 40.123456, longitude: -75.654321 } }, pdStatus: 200 };
globalThis.fetch = async (u, o = {}) => {
  u = String(u); calls.push({ u, o });
  if (u === 'https://places.googleapis.com/v1/places:autocomplete') return { ok: G.acStatus === 200, status: G.acStatus, json: async () => G.ac };
  if (u.startsWith('https://places.googleapis.com/v1/places/')) return { ok: G.pdStatus === 200, status: G.pdStatus, json: async () => G.pd };
  throw new Error('unexpected fetch ' + u);
};
const logs = []; const log0 = console.log;
const { default: handler, FN, matchDir, queryWords } = await import('../netlify/functions/places.mjs');
const call = async (body, o = {}) => { const r = await handler(new Request('https://terrain.church/.netlify/functions/places', { method: o.method || 'POST',
  headers: { 'content-type': 'application/json', ...(o.tok === false ? {} : { 'x-terrain-reg': o.tok || regTok() }) }, body: o.method === 'GET' ? undefined : JSON.stringify(body) }));
  return { s: r.status, j: await r.json() }; };
const names = j => (j.list || []).map(x => x.src + ':' + x.name);

log0('\n-- the stamp, and who may ask --');
delete process.env.GOOGLE_PLACES_KEY;
let r = await call(null, { method: 'GET', tok: false });
c('GET: places-1.0, Google said yes or no (no key here)', [r.s, r.j.fn, FN, r.j.google], [200, 'places-1.0', 'places-1.0', false]);
r = await call({ op: 'suggest', q: 'fairview' }, { tok: false });
c('a POST without the registration is refused', [r.s, r.j.code], [401, 'noreg']);
r = await call({ op: 'suggest', q: 'fairview' }, { tok: 'r1.AbCdEfGhIjKl.' + Math.floor(T / 1000).toString(36) + '.' + 'A'.repeat(32) });
c('…and one with a damaged token', r.s, 401);
for (const [b, why] of [[{ op: 'suggest', q: 'f' }, 'one letter'], [{ op: 'suggest', q: 'x'.repeat(81) }, 'over 80'], [{ op: 'suggest', q: 'fair', conf: 'Narnia' }, 'a conference Terrain does not know'],
  [{ op: 'suggest', q: 'fair', session: 'short' }, 'a session token of the wrong shape'], [{ op: 'suggest', q: 'fair', near: { lat: 'x', lon: 1 } }, 'a point that is not one'],
  [{ op: 'pick', id: 'a/b' }, 'a place id of the wrong shape'], [{ op: 'other' }, 'another op'], [[], 'not an object']])
  c('refused (400): ' + why, (await call(b)).s, 400);

log0('\n-- the conference\'s Adventist directory first --');
c('the denomination\'s words say nothing (every church is Adventist): "Fairview village seventh day" asks for fairview, village', queryWords('Fairview village seventh day'), ['fairview', 'village']);
r = await call({ op: 'suggest', q: 'Fairview village seventh day', conf: 'Pennsylvania', session: 'S'.repeat(22) });
c('"Fairview village seventh day" finds Fairview Village SDA Church, its address the directory\'s', [r.s, r.j.list[0]], [200, { src: 'dir', name: 'Fairview Village SDA Church', address: '1010 Sample Mill Rd Eagleville PA 19403-1047', town: 'Eagleville' }]);
const q = async t => names((await call({ op: 'suggest', q: t, conf: 'Pennsylvania' })).j);
c('…and so do "fairview", the whole name with "Seventh-day Adventist", the Spanish, the street and the town', [await q('fairview'), await q('Fairview Village Seventh-day Adventist Church'), await q('iglesia adventista fairview'), await q('sample mill'), await q('eaglev')],
  [['dir:Fairview Village SDA Church'], ['dir:Fairview Village SDA Church'], ['dir:Fairview Village SDA Church'], ['dir:Fairview Village SDA Church'], ['dir:Fairview Village SDA Church']]);
c('two with the name: both, the church before the mission group', await q('bucks'), ['dir:Bucks County SDA Church', 'dir:Bucks County Hispanic Mission Group']);
c('the denomination alone matches nothing (it would be every church)', await q('seventh day adventist'), []);
c('a church with no address is never offered', matchDir([{ name: 'No Address SDA Church', address: '', town: '' }].filter(x => x.address), 'no address'), []);
c('no conference: the directory is not asked', names((await call({ op: 'suggest', q: 'fairview' })).j), []);

log0('\n-- then Google, only when the directory has fewer than three --');
process.env.GOOGLE_PLACES_KEY = 'test-key-not-real'; calls = [];
r = await call({ op: 'suggest', q: 'fairview', conf: 'Pennsylvania', session: 'S'.repeat(22), near: { lat: 40.1234567, lon: -75.4567891 } });
const ac = calls.find(x => x.u.endsWith('places:autocomplete')), body = ac && JSON.parse(ac.o.body);
c('one autocomplete: the words, the United States, the session, a 50 km bias round his church', body && [body.input, body.includedRegionCodes, body.sessionToken, body.locationBias.circle.center, body.locationBias.circle.radius, body.languageCode], ['fairview', ['us'], 'S'.repeat(22), { latitude: 40.123, longitude: -75.457 }, 50000, 'en']);
c('…the key in its header, only the fields used asked for', [ac.o.headers['X-Goog-Api-Key'], ac.o.headers['X-Goog-FieldMask']], ['test-key-not-real', 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat']);
c('the directory\'s church first, then Google\'s, the same church from Google left out, ", USA" dropped', [names(r.j), r.j.list[1], r.j.google], [['dir:Fairview Village SDA Church', 'g:Grace Fellowship Church', 'g:12 Sample Ave'], { src: 'g', id: 'ChIJsample00001', name: 'Grace Fellowship Church', place: 'Main Street, Sampleton, PA' }, true]);
calls = []; r = await call({ op: 'suggest', q: 'phil', conf: 'Pennsylvania' }); calls = [];
r = await call({ op: 'suggest', q: 'bucks', conf: 'Pennsylvania' });
c('two in the directory: Google still asked (fewer than three)', calls.filter(x => x.u.endsWith('places:autocomplete')).length, 1);
S.poke('c/pennsylvania', { v: 1, conf: 'Pennsylvania', churches: [...CH, { org: 'ANBX07', name: 'Bucks Hill SDA Church', kind: 'church', address: '1 Hill Rd Sampleton PA 19000', town: 'Sampleton' }] });
T += 11 * 60e3; calls = [];
r = await call({ op: 'suggest', q: 'bucks', conf: 'Pennsylvania' });
c('three in the directory (read again after ten minutes): Google not asked at all', [names(r.j).length, calls.length], [3, 0]);
c('the month\'s count of Google\'s suggestions kept, nothing typed kept', [S.peek('m/2026-10/ac').n, S.keys().filter(k => !/^(c\/pennsylvania|m\/2026-10\/ac)$/.test(k))], [3, []]);
process.env.AC_MONTH_MAX = '3'; calls = [];
r = await call({ op: 'suggest', q: 'grace', conf: 'Pennsylvania' });
c('past the month\'s cap: the directory alone, Google never asked', [r.s, calls.length, names(r.j)], [200, 0, []]);
delete process.env.AC_MONTH_MAX; G.acStatus = 500; calls = [];
r = await call({ op: 'suggest', q: 'grace', conf: 'Pennsylvania' });
c('Google failing: still an answer (the directory\'s), never the key in it', [r.s, names(r.j), JSON.stringify(r.j).includes('test-key')], [200, [], false]);
G.acStatus = 200;

log0('\n-- the one he picks from Google --');
calls = [];
r = await call({ op: 'pick', id: 'ChIJsample00002', session: 'S'.repeat(22) });
const pd = calls.find(x => x.u.includes('/v1/places/ChIJsample00002'));
c('Place Details for that place, in the same session, the two Essentials fields only', pd && [new URL(pd.u).searchParams.get('sessionToken'), pd.o.headers['X-Goog-FieldMask']], ['S'.repeat(22), 'formattedAddress,location']);
c('…its address (", USA" dropped) and its point (five decimals)', [r.s, r.j], [200, { ok: true, address: '12 Sample Ave, Sampleton, PA 19000', lat: 40.12346, lon: -75.65432 }]);
G.pd = { formattedAddress: 'x' }; r = await call({ op: 'pick', id: 'ChIJsample00002' });
c('a place with no point: refused, not guessed', [r.s, r.j.code], [502, 'google']);
delete process.env.GOOGLE_PLACES_KEY; r = await call({ op: 'pick', id: 'ChIJsample00002' });
c('no key: pick says so', [r.s, r.j.code], [503, 'off']);

log0('\n-- typing quickly is fine, a script is not --');
let n429 = 0; for (let i = 0; i < 95; i++) if ((await call({ op: 'suggest', q: 'fairview', conf: 'Pennsylvania' }, { tok: regTok('ZyXwVuTsRqPo') })).s === 429) n429++;
c('ninety a minute from one registration, then 429', n429, 5);
T += 60e3;
c('…the next minute it answers again', (await call({ op: 'suggest', q: 'fairview', conf: 'Pennsylvania' }, { tok: regTok('ZyXwVuTsRqPo') })).s, 200);

log0(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
