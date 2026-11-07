// v10.70.0 · tester codes made in Terrain (the server). The pastor (14 Oct 2026), after a guest code written in Netlify did not work for
// his leader: "Why is this so difficult when say if anybody registers they set it up for free and they just put in a code but does it have
// to be tied to their email?", then "yes build those codes". guest-pass.mjs (guest-pass-1.2): on his own device (his passphrase) he makes
// a code, easy to read aloud ("cedar-river-4821"), with a note of who it is for; the first registration that uses it keeps it; he sees who
// used each, turns one off, and deletes one that is off. No Netlify, no redeploy, no email typed ahead. Codes are matched in any capitals,
// with spaces or hyphens. TERRAIN_AI_GUESTS still works, now in any capitals too. In-memory stores, a stubbed fetch: nothing real is
// stored, no network, no credit. Every name and code here is made up. Written failing-first on v10.69.1.
import { createHash, createHmac } from 'node:crypto';
import fs from 'node:fs';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', String(JSON.stringify(g)).slice(0, 600)); console.log('    want:', String(JSON.stringify(e)).slice(0, 400)); fail++; } else pass++; };
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
    async list({ prefix = '' } = {}) { await tick(); return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
    poke(k, val) { m.set(k, { data: JSON.stringify(val), etag: 'e' + (++n) }); } };
}
const ROOT = new URL('../', import.meta.url);
const read = f => { try { return fs.readFileSync(new URL(f, ROOT), 'utf8'); } catch { return ''; } };
const sha = s => createHash('sha256').update(String(s), 'utf8').digest('hex');
const SECRET = 'q'.repeat(44);
let T = Date.now();
globalThis.__terrainGuestNow = () => T;
const tokFor = (id, at = T) => { const iat = Math.floor(at / 1000).toString(36); return `r1.${id}.${iat}.` + createHmac('sha256', SECRET).update(`terrain-reg|r1|${id}|${iat}`, 'utf8').digest('base64url').slice(0, 32); };
const TESTER = 'TesterIdAb01', OTHER = 'OtherIdAb099', PASSV = 'open-sesame-sample', KEYV = 'sk-ant-test-key-0000000000000000000000000000000000';
const R = makeStore(); globalThis.__terrainRegStore = R;
const ENV = { ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV, TERRAIN_REG_SECRET: SECRET, TERRAIN_AI_GUESTS: '' };
const setEnv = o => { for (const k of ['ANTHROPIC_API_KEY', 'TERRAIN_AI_PASS', 'TERRAIN_AI_GUESTS', 'TERRAIN_REG_SECRET']) delete process.env[k]; Object.assign(process.env, o); };
setEnv(ENV);
globalThis.fetch = async u => { u = String(u);
  if (/\/\.netlify\/functions\//.test(u)) return { status: 202, ok: true, json: async () => ({}) };
  if (/api\.anthropic\.com/.test(u)) return { ok: false, status: 500, json: async () => ({ error: { message: 'stub' } }) };
  throw new Error('unexpected fetch ' + u); };
const REAL = { log: console.log, error: console.error, warn: console.warn }, logs = [];
const quiet = async f => { const cap = (...a) => logs.push(a.map(String).join(' ')); console.log = cap; console.error = cap; console.warn = cap; try { return await f(); } finally { Object.assign(console, REAL); } };

let G = null;
try { G = await import('../netlify/functions/guest-pass.mjs'); } catch (e) { console.log('  FAIL  guest-pass.mjs cannot be imported: ' + String(e && e.message).slice(0, 120)); fail++; }
let ipN = 0; const freshIp = () => '198.51.100.' + (++ipN);
const post = async (body, { pw, tok, ip } = {}) => { const r = await quiet(() => G.default(new Request('https://terrain.church/.netlify/functions/guest-pass', { method: 'POST',
  headers: { 'content-type': 'application/json', ...(pw ? { 'x-terrain-pass': pw } : {}), ...(tok ? { 'x-terrain-reg': tok } : {}) }, body: JSON.stringify(body) }), { ip: ip || freshIp() }));
  let j = null; try { j = await r.json(); } catch {} return { status: r.status, j: j || {} }; };
const admin = (body, o = {}) => post(body, { pw: PASSV, ...o });

if (G) {
  console.log('-- its GET --');
  const g = await (await G.default(new Request('https://terrain.church/.netlify/functions/guest-pass'))).json();
  c('guest-pass-1.2, and still only its version', [g.fn, Object.keys(g).sort()], ['guest-pass-1.2', ['fn', 'ok']]);

  console.log('\n-- making a code: only with the passphrase --');
  c('no passphrase given: locked', [(await post({ op: 'make', note: 'Sample' })).status, (await post({ op: 'make', note: 'Sample' })).j.code], [401, 'locked']);
  c('a wrong one: locked, and nothing made', [(await post({ op: 'make' }, { pw: 'not-the-passphrase' })).status, R.m.size === 0 || ![...R.m.keys()].some(k => k.startsWith('t/'))], [401, true]);
  const mk = await admin({ op: 'make', note: '  Elder <b>Sample</b>\u0007 Tester  ' });
  const it = mk.j.item || {};
  c('with the passphrase: a code of two words and four digits, easy to read aloud', [mk.status, /^[a-z]{3,8}-[a-z]{3,8}-\d{4}$/.test(it.code || ''), it.code && it.code.split('-')[0] !== it.code.split('-')[1]], [200, true, true]);
  c('the note kept as plain words (no markup, no control characters, trimmed)', it.note, 'Elder bSample/b Tester');
  c('a new code: on, not used, nobody', [it.on, it.used, it.who], [true, null, null]);
  c('kept in terrain-registrations under t/<sha256 of its letters and digits>, never with a registration id yet', (() => { const k = 't/' + sha(it.code.replace(/-/g, '')); const v = R.m.get(k); return v ? [JSON.parse(v.data).code, JSON.parse(v.data).reg] : null; })(), [it.code, null]);
  c('its id is that key\'s hash (64 hex), so it can be turned off without sending the code', /^[0-9a-f]{64}$/.test(it.id || ''), true);
  const codes = []; for (let i = 0; i < 4; i++) { T += 1000; codes.push((await admin({ op: 'make', note: 'Batch ' + i })).j.item.code); }   // a second apart, as he would make them
  c('every code different', new Set([it.code, ...codes]).size, 5);

  console.log('\n-- the list --');
  const L1 = await admin({ op: 'list' });
  c('the list: every code, newest first, with its note; the limit said', [L1.status, L1.j.items.length, L1.j.items[L1.j.items.length - 1].code, L1.j.max], [200, 5, it.code, 50]);
  c('the list never carries a registration id', JSON.stringify(L1.j).includes('"reg"'), false);
  c('the list with a wrong passphrase: locked', (await post({ op: 'list' }, { pw: 'wrong-wrong-wrong' })).status, 401);

  console.log('\n-- the first registration to use it keeps it --');
  const who = { name: 'Sample Tester', church: 'Sample <i>Church</i>' };
  const k1 = await post({ code: it.code, who }, { tok: tokFor(TESTER) });
  c('typed by a registered person: unlocked, a guest, the code to keep on the device', [k1.status, k1.j.unlocked, k1.j.kind, k1.j.keep], [200, true, 'guest', it.code]);
  const L2 = (await admin({ op: 'list' })).j.items.find(x => x.code === it.code);
  c('the list now says who used it and when (their name and church as plain words)', [!!L2.used, L2.who], [true, { name: 'Sample Tester', church: 'Sample iChurch/i' }]);
  const k2 = await post({ code: it.code, who: { name: 'Someone Else', church: 'Elsewhere' } }, { tok: tokFor(OTHER) });
  c('the same code from another registration: not unlocked, and told it is taken', [k2.j.unlocked, k2.j.why], [false, 'taken']);
  const k3 = await post({ code: it.code.toUpperCase().replace(/-/g, ' ') }, { tok: tokFor(TESTER) });
  c('typed in capitals with spaces by the one who keeps it: still unlocked', [k3.j.unlocked, k3.j.keep], [true, it.code]);
  c('unlockOf: "guest" for the one who keeps it, locked for anyone else, in any capitals', [await G.unlockOf(it.code, tokFor(TESTER), PASSV), await G.unlockOf(it.code.toUpperCase(), tokFor(TESTER), PASSV),
    await G.unlockOf(it.code, tokFor(OTHER), PASSV), await G.unlockOf(it.code, '', PASSV)], ['guest', 'guest', '', '']);
  c('passCheck agrees', [await G.passCheck(it.code, tokFor(TESTER), PASSV), await G.passCheck(it.code, tokFor(OTHER), PASSV)], [true, false]);
  const k4 = await post({ code: codes[0] });
  c('an unused code with no registration token: not unlocked, and not taken by nobody', [k4.j.unlocked, (await admin({ op: 'list' })).j.items.find(x => x.code === codes[0]).used], [false, null]);
  c('unlockOf never claims a code (only the check does): an unused code is locked for a feature call', await G.unlockOf(codes[1], tokFor(OTHER), PASSV), '');
  const k5 = await post({ code: 'cedar-river-0000' }, { tok: tokFor(OTHER) });
  c('a code that does not exist: not unlocked, and nothing said about why', [k5.j.unlocked, 'why' in k5.j], [false, false]);

  console.log('\n-- off, on, delete --');
  const off = await admin({ op: 'off', id: it.id });
  c('turned off: off in the answer', [off.status, off.j.item && off.j.item.on], [200, false]);
  const k6 = await post({ code: it.code }, { tok: tokFor(TESTER) });
  c('…the one who kept it is locked at once, and told it is off', [k6.j.unlocked, k6.j.why, await G.unlockOf(it.code, tokFor(TESTER), PASSV)], [false, 'off', '']);
  await admin({ op: 'on', id: it.id });
  c('turned on again: unlocked again for the same person', (await post({ code: it.code }, { tok: tokFor(TESTER) })).j.unlocked, true);
  const del1 = await admin({ op: 'delete', id: it.id });
  c('a code that is on cannot be deleted (turn it off first)', [del1.status, del1.j.code], [409, 'on']);
  await admin({ op: 'off', id: it.id });
  const del2 = await admin({ op: 'delete', id: it.id });
  c('off, then deleted: gone from the list and from the store; it unlocks nothing', [del2.status, (await admin({ op: 'list' })).j.items.some(x => x.code === it.code),
    [...R.m.keys()].includes('t/' + it.id), (await post({ code: it.code }, { tok: tokFor(TESTER) })).j.unlocked], [200, false, false, false]);
  c('an id that is not a code: unknown', [(await admin({ op: 'off', id: 'f'.repeat(64) })).status, (await admin({ op: 'off', id: 'nope' })).status], [404, 400]);

  console.log('\n-- limits --');
  for (let i = 0; i < 46; i++) await admin({ op: 'make', note: 'Many ' + i });   // the four left on, and 46 more: 50 on
  const full = await admin({ op: 'make', note: 'One too many' });
  c('50 codes that are on at most: the next is refused as full', [full.status, full.j.code, (await admin({ op: 'list' })).j.items.filter(x => x.on).length], [409, 'full', 50]);
  const badIp = '203.0.113.77';
  for (let i = 0; i < 12; i++) await post({ op: 'list' }, { pw: 'guess-' + i, ip: badIp });
  c('12 wrong passphrases from one connection in an hour: then held back, even the right one; another connection is not', [(await post({ op: 'list' }, { pw: PASSV, ip: badIp })).status,
    (await post({ op: 'list' }, { pw: PASSV, ip: '203.0.113.78' })).status], [429, 200]);
  const okIp = '203.0.113.90'; for (let i = 0; i < 20; i++) await post({ op: 'list' }, { pw: PASSV, ip: okIp });
  c('the right passphrase is never counted (he can open his codes as often as he likes)', (await post({ op: 'list' }, { pw: PASSV, ip: okIp })).status, 200);
  c('the check op still counts every try: 12 an hour from one connection', await (async () => { const ip = '203.0.113.99'; let s = 0; for (let i = 0; i < 13; i++) s = (await post({ code: 'wrong-code-' + i }, { ip })).status; return s; })(), 429);
  c('every counter is an hourly g/code/ key the daily sweep already removes', [...R.m.keys()].filter(k => k.startsWith('g/')).every(k => /^g\/code\/\d{4}-\d{2}-\d{2}T\d{2}\/[A-Za-z0-9_-]{22}$/.test(k)), true);
  c('…and the sweep never lists t/ (codes stay until he deletes them)', /prefix: 't\//.test(read('netlify/functions/gifts-sweep.mjs')), false);

  console.log('\n-- the check op --');
  c('the passphrase typed in the box: unlocked, kind "pass" (the device knows it is his)', await (async () => { const r = await post({ code: PASSV }); return [r.j.unlocked, r.j.kind]; })(), [true, 'pass']);
  c('a code with spaces inside is checked now (read aloud and typed as words); markup or nothing is still refused', [(await post({ code: 'a code typed as words' })).status, (await post({ code: 'a<b' })).status, (await post({ code: '' })).status], [200, 400, 400]);
  setEnv({ ...ENV, TERRAIN_AI_PASS: '' }); G.forget();
  c('no passphrase on the server: the box says open; making codes says disabled', [(await post({ code: 'anything' })).j.open, (await admin({ op: 'make' })).j.code], [true, 'disabled']);
  setEnv(ENV); G.forget();

  console.log('\n-- TERRAIN_AI_GUESTS still works, in any capitals --');
  R.poke('e/' + sha('leader.sample@example.org'), { email: 'leader.sample@example.org', id: 'LeaderIdAb01' });
  setEnv({ ...ENV, TERRAIN_AI_GUESTS: 'leader.sample@example.org=Sample-Leader-Code' }); G.forget();
  c('the code as written, in small letters, in capitals: "guest" on its own registration; another registration still locked',
    [await G.unlockOf('Sample-Leader-Code', tokFor('LeaderIdAb01'), PASSV), await G.unlockOf('sample-leader-code', tokFor('LeaderIdAb01'), PASSV), await G.unlockOf('SAMPLE-LEADER-CODE', tokFor('LeaderIdAb01'), PASSV),
     await G.unlockOf('sample-leader-code', tokFor(OTHER), PASSV)], ['guest', 'guest', 'guest', '']);
  c('a guest code equal to the passphrase in other capitals is still left out', G.guestsOf('a.one@example.org=' + PASSV.toUpperCase(), PASSV).length, 0);
  setEnv(ENV); G.forget();
  c('nothing it does is logged (no code, note, name or id)', logs.filter(l => /Sample Tester|Elder|TesterId|cedar|-\d{4}\b/i.test(l)).length, 0);
}

console.log('\n-- advise.mjs: a code he made passes the lock for the one who keeps it --');
if (G) { setEnv(ENV); G.forget();
  await admin({ op: 'off', id: (await admin({ op: 'list' })).j.items.find(x => x.note === 'Many 0').id });   // room for one more
  const made = (await admin({ op: 'make', note: 'For advise' })).j.item;
  const keep = (await post({ code: made.code }, { tok: tokFor(TESTER) })).j.unlocked;
  const fn = (await import(new URL('../netlify/functions/advise.mjs?v70=1', import.meta.url).href)).default;
  const ask = async (pw, tok) => { const r = await quiet(() => fn(new Request('https://terrain.church/.netlify/functions/advise', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-terrain-pass': pw, ...(tok ? { 'x-terrain-reg': tok } : {}) }, body: JSON.stringify({ mode: 'needs' }) }), { ip: '198.51.100.250' }));
    let j = {}; try { j = await r.json(); } catch {} return j.code || ''; };
  c('kept by the tester: past the lock (on to the request\'s own checks); from another registration: locked', [keep, (await ask(made.code, tokFor(TESTER))) !== 'locked', await ask(made.code, tokFor(OTHER))], [true, true, 'locked']);
}

console.log('\n-- the code itself --');
{ const S = read('netlify/functions/guest-pass.mjs');
  c('codes are made with the system\'s random numbers (crypto), never Math.random', [/randomInt/.test(S), /Math\.random/.test(S)], [true, false]);
  c('CLAUDE.md says where the codes are made', /Tester codes/.test(read('CLAUDE.md')) && /guest-pass-1\.2/.test(read('CLAUDE.md')), true); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
