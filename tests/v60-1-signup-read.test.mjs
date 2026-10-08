// v10.60.1 · Digital footprint: a conference is read as soon as one of its pastors registers (register-1.3, digital-1.1), so no pastor
// waits the first hour when opening Compare your churches. The pastor (7 Oct 2026), asked whether Terrain should read a conference ahead
// of time: "yes as soon as they sign up for sure". Also Guam-Micronesia Mission's locator code (the one conference Terrain registers that
// the reader had no code for). Against in-memory stores and a stubbed fetch: no network, no Google lookup spent.
// Written failing-first on v10.60.0.
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 400)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
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
    async delete(k) { await tick(); m.delete(k); },
    async list({ prefix = '' } = {}) { await tick(); return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).sort().map(key => ({ key, etag: m.get(key).etag })) }; },
    peek(k) { const v = m.get(k); return v ? JSON.parse(v.data) : null; },
    poke(k, val) { m.set(k, { data: JSON.stringify(val), etag: 'e' + (++n) }); },
    keys(p = '') { return [...m.keys()].filter(k => k.startsWith(p)).sort(); } };
}
delete process.env.TERRAIN_ADMIN_KEY; delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.DIGITAL_CONFS;
const SECRET = 'y'.repeat(40); process.env.TERRAIN_REG_SECRET = SECRET;
let R = makeStore(), D = makeStore();
globalThis.__terrainRegStore = R; globalThis.__terrainDigitalStore = D;
let T = Date.parse('2026-10-08T12:00:00Z'); globalThis.__terrainDigitalNow = () => T;
let wakes = [], hang = false;
globalThis.fetch = async (u, o = {}) => {
  u = String(u);
  if (/\/\.netlify\/functions\/digital-read$/.test(u)) { if (hang) return new Promise(() => {}); wakes.push({ u, ...JSON.parse(o.body) }); return { ok: true, status: 202, text: async () => '' }; }
  throw new Error('no other network in tests: ' + u);
};
const logs = [];
const REAL = { log: console.log, error: console.error, warn: console.warn, info: console.info };
const REG = await import('../netlify/functions/register.mjs');
const DG = await import('../netlify/functions/digital.mjs');
const RD = await import('../netlify/functions/digital-read.mjs');
const URL0 = 'https://terrain.church/.netlify/functions/register';
const base = { op: 'register', name: 'Joshua Mura', email: 'pastor.josh@example.org', church: 'Bucks County SDA', role: 'pastor', conf: 'Pennsylvania', union: 'Columbia Union', news: false, lang: 'en' };
async function post(body, ctx = {}) {
  console.error = console.warn = console.info = (...a) => logs.push(a.map(String).join(' '));
  try {
    const res = await REG.default(new Request(URL0, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), ctx);
    return { status: res.status, j: JSON.parse(await res.text()) };
  } finally { Object.assign(console, { error: REAL.error, warn: REAL.warn, info: REAL.info }); }
}
const reg = (over = {}, ctx = {}) => post({ ...base, ...over }, ctx);
const fresh = () => { R = makeStore(); D = makeStore(); globalThis.__terrainRegStore = R; globalThis.__terrainDigitalStore = D; wakes = []; hang = false; };

try {
  console.log('\n-- registering starts the conference\'s reading --');
  let r = await reg();
  const j = D.peek('j/pennsylvania');
  c('the registration itself is answered as before (ok and a token)', [r.status, r.j.ok, typeof r.j.tok], [200, true, 'string']);
  c('…and a reading of Pennsylvania is queued: a running job from the start, its start time noted', [j && j.status, j && j.phase, j && j.conf, j && j.org, !!D.peek('t/pennsylvania')], ['running', 'list', 'Pennsylvania', 'ANBI11', true]);
  c('…the background reader is woken once, on this site, with a worker token that only the job\'s hash knows',
    [wakes.length, wakes[0] && new URL(wakes[0].u).origin, wakes[0] && wakes[0].slug, wakes[0] && /^[A-Za-z0-9_-]{40,}$/.test(wakes[0].worker), JSON.stringify(j).includes(wakes[0] && wakes[0].worker)],
    [1, 'https://terrain.church', 'pennsylvania', true, false]);
  c('…the conference counts as opened today, so the monthly refresh keeps it (and forgets it after 180 days unused)', D.peek('o/pennsylvania'), { at: '2026-10-08' });
  c('…the pastor\'s name, email and church never reach the digital store', /Mura|example\.org|Bucks County SDA/.test(JSON.stringify([...D.m.values()])), false);

  console.log('\n-- never twice, never too soon --');
  r = await reg({ email: 'second.pastor@example.org', name: 'Ann Lee', church: 'Willow Grove SDA' });
  c('a second pastor of the same conference while it reads: no second job, no second wake', [r.j.ok, wakes.length, D.peek('j/pennsylvania').created === j.created], [true, 1, true]);
  D.poke('c/pennsylvania', { at: T - 3 * 864e5, churches: [] }); D.poke('j/pennsylvania', { status: 'done' }); wakes = [];
  r = await reg({ email: 'third.pastor@example.org', name: 'Ben Ode', church: 'Shy SDA' });
  c('findings under 25 days old: nothing is read again', [r.j.ok, wakes.length, D.peek('j/pennsylvania').status], [true, 0, 'done']);
  D.poke('c/pennsylvania', { at: T - 30 * 864e5, churches: [] }); D.poke('j/pennsylvania', { status: 'failed' }); D.poke('t/pennsylvania', { at: T - 3600e3 });
  r = await reg({ email: 'fourth.pastor@example.org', name: 'Dee Fox', church: 'Robots SDA' });
  c('a reading that failed within 6 hours is not started again (never a loop of failures)', [r.j.ok, wakes.length, D.peek('j/pennsylvania').status], [true, 0, 'failed']);
  D.poke('t/pennsylvania', { at: T - 7 * 3600e3 });
  r = await reg({ email: 'fifth.pastor@example.org', name: 'Eve Hart', church: 'Erie SDA' });
  c('…after 6 hours it is', [r.j.ok, wakes.length, D.peek('j/pennsylvania').status], [true, 1, 'running']);

  console.log('\n-- only conferences that may be read --');
  fresh();
  r = await reg({ conf: 'Ohio', union: 'Columbia Union' });
  c('a conference not in DIGITAL_CONFS (default Pennsylvania): registered, nothing read, nothing noted', [r.j.ok, wakes.length, D.keys().length], [true, 0, 0]);
  r = await reg({ email: 'x@example.org', conf: 'Narnia' });
  c('a conference the reader does not know: registered, nothing read', [r.j.ok, wakes.length, D.keys().length], [true, 0, 0]);
  process.env.DIGITAL_CONFS = '*';
  r = await reg({ email: 'hawaii.pastor@example.org', conf: 'Hawaii', union: 'Pacific Union' });
  c('DIGITAL_CONFS "*": any NAD conference (Hawaii) is read at sign-up', [r.j.ok, wakes.length, D.peek('j/hawaii') && D.peek('j/hawaii').org], [true, 1, 'ANPB11']);
  r = await reg({ email: 'guam.pastor@example.org', conf: 'Guam-Micronesia Mission', union: '' });
  c('…and Guam-Micronesia Mission, by its locator code', [r.j.ok, D.peek('j/guam-micronesia-mission') && D.peek('j/guam-micronesia-mission').org], [true, 'ANNG11']);
  delete process.env.DIGITAL_CONFS;

  console.log('\n-- signing in on another device --');
  fresh(); await reg(); D.m.clear(); wakes = [];
  r = await post({ op: 'signin', email: base.email });
  c('signing in also starts the reading when there are no findings (a conference forgotten after 180 days)', [r.status, r.j.ok, wakes.length, !!D.peek('j/pennsylvania')], [200, true, 1, true]);
  wakes = [];
  r = await post({ op: 'signin', email: 'nobody@example.org' });
  c('…an address not on file: 404 as before, nothing read', [r.status, wakes.length], [404, 0]);

  console.log('\n-- registration never waits on it, never fails for it --');
  fresh();
  const later = [];
  r = await reg({}, { waitUntil: p => later.push(p) });
  c('with the platform\'s waitUntil, the answer comes first and the reading is handed to it', [r.status, r.j.ok, later.length], [200, true, 1]);
  await Promise.all(later);
  c('…and it still happens', [wakes.length, !!D.peek('j/pennsylvania')], [1, true]);
  fresh(); hang = true;
  const t0 = Date.now(); r = await reg();
  c('without waitUntil and a wake that never answers: registered within 4 seconds all the same', [r.status, r.j.ok, Date.now() - t0 < 4000], [200, true, true]);
  fresh();
  globalThis.__terrainDigitalStore = { async get() { throw new Error('blob down pastor.josh@example.org'); }, async getWithMetadata() { throw new Error('x'); }, async setJSON() { throw new Error('x'); }, async list() { throw new Error('x'); } };
  logs.length = 0;
  r = await reg();
  c('the digital store down: the registration is still made and answered', [r.status, r.j.ok, !!R.peek(R.keys('e/')[0])], [200, true, true]);
  c('…and nothing is logged (no address, no error text)', logs, []);
  globalThis.__terrainDigitalStore = D;

  console.log('\n-- the pieces --');
  // v10.62.0: digital-1.2 (the in-depth review's ops; digital-review.test.mjs); warm() and the sign-up's reading are unchanged
  c('register-1.3, digital-1.2', [(await (await REG.default(new Request(URL0))).json()).fn, DG.FN], ['register-1.3', 'digital-1.2']);
  c('warm is exported for the sign-up', typeof DG.warm, 'function');
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const confs = Object.keys(eval('(' + html.match(/const CONF_STATES\s*=\s*(\{[\s\S]*?\});/)[1] + ')'));
  c('every conference Terrain registers has a locator code (51: the 50 US conferences and Guam-Micronesia Mission)', [confs.length, confs.filter(n => !RD.CONF_ORG[n])], [51, []]);
} catch (e) { console.log('  FAIL  crashed: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
