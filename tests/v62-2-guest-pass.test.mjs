// v10.62.2 · a guest code: the unlock for the parts Claude writes, good only on the one registration it is written beside.
// The pastor (9 Oct 2026), of his conference's ministerial director trying the app: "Just give him the unlock link but have him add like a
// secret code that only he can use". guest-pass.mjs (guest-pass-1.0) reads TERRAIN_AI_GUESTS (`email=code`); advise.mjs (every mode
// behind the lock: Find prices, the needs list, the ideas, the proposal's words, "More ideas") and digital.mjs (the in-depth review) ask
// it instead of comparing the passphrase alone. Injected in-memory stores, a stubbed fetch: no real storage, no network, no credit spent.
// Every code and email here is made up. Written failing-first on v10.62.2's stamp commit.
import { createHash, createHmac } from 'node:crypto';
import fs from 'node:fs';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 500)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
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
const SECRET = 'q'.repeat(44), OTHER_SECRET = 'z'.repeat(44);
let T = Date.now();   // the functions under test read the real clock for their own token checks
globalThis.__terrainGuestNow = () => T;
const tokFor = (id, at = T, secret = SECRET) => { const iat = Math.floor(at / 1000).toString(36); return `r1.${id}.${iat}.` + createHmac('sha256', secret).update(`terrain-reg|r1|${id}|${iat}`, 'utf8').digest('base64url').slice(0, 32); };
// the made-up people: the pastor, the director (the guest), and someone the link was passed on to
const PASTOR = 'PastorIdAb12', DIRECTOR = 'DirectorId01', STRANGER = 'StrangerId99';
const D_EMAIL = 'director.sample@example.org', D_CODE = 'Sample-Guest-Code-2026';
const PASSV = 'open-sesame-guest', KEYV = 'sk-ant-test-key-0000000000000000000000000000000000';
const R = makeStore(); globalThis.__terrainRegStore = R;
R.poke('e/' + sha('pastor.sample@example.org'), { email: 'pastor.sample@example.org', id: PASTOR });
R.poke('e/' + sha(D_EMAIL), { email: D_EMAIL, id: DIRECTOR });
R.poke('e/' + sha('passed.on@example.org'), { email: 'passed.on@example.org', id: STRANGER });
const setEnv = o => { for (const k of ['ANTHROPIC_API_KEY', 'TERRAIN_AI_PASS', 'TERRAIN_AI_GUESTS', 'TERRAIN_REG_SECRET', 'IDEAS_DAY_MAX', 'NEEDS_DAY_MAX', 'PRICES_DAY_MAX', 'CASE_DAY_MAX', 'REVIEW_DAY_MAX']) delete process.env[k]; Object.assign(process.env, o); };
const ON = { ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV, TERRAIN_REG_SECRET: SECRET, TERRAIN_AI_GUESTS: `${D_EMAIL}=${D_CODE}` };
// the network: the workers' wakes answer 202, the Anthropic API an error (nothing here should get that far but "More ideas")
globalThis.fetch = async u => { u = String(u);
  if (/\/\.netlify\/functions\//.test(u)) return { status: 202, ok: true, json: async () => ({}) };
  if (/api\.anthropic\.com/.test(u)) return { ok: false, status: 500, json: async () => ({ error: { message: 'stub' } }) };
  throw new Error('unexpected fetch ' + u); };
const REAL = { log: console.log, error: console.error, warn: console.warn }, logs = [];
const quiet = async f => { const cap = (...a) => logs.push(a.map(String).join(' ')); console.log = cap; console.error = cap; console.warn = cap; try { return await f(); } finally { Object.assign(console, REAL); } };

let G = null;
try { G = await import('../netlify/functions/guest-pass.mjs'); } catch (e) { console.log('  FAIL  guest-pass.mjs cannot be imported: ' + String(e && e.message).slice(0, 120)); fail++; }
if (G) {
  console.log('-- the guests in TERRAIN_AI_GUESTS --');
  const list = raw => G.guestsOf(raw, PASSV).map(g => g.email + '=' + g.code);
  c('one a line, or commas or semicolons between them; spaces around "=" are fine', list(`a.one@example.org=Code-Number-One-1\nb.two@example.org = Code-Number-Two-2, c.three@example.org=Code-Number-Three-3; d.four@example.org=Code-Number-Four-4`),
    ['a.one@example.org=Code-Number-One-1', 'b.two@example.org=Code-Number-Two-2', 'c.three@example.org=Code-Number-Three-3', 'd.four@example.org=Code-Number-Four-4']);
  c('the email kept as registration keeps it: lower case, an invisible character dropped', list('Director.SAMPLE​@Example.ORG=Sample-Guest-Code-2026'), [D_EMAIL + '=' + D_CODE]);
  c('a code under 12 characters is left out (too easy to guess)', list('a.one@example.org=short-code\nb.two@example.org=long-enough-code'), ['b.two@example.org=long-enough-code']);
  c('a code equal to the passphrase is left out (it is not a guest\'s)', list(`a.one@example.org=${PASSV}`), []);
  c('a code written beside two emails belongs to neither', list('a.one@example.org=Shared-Code-Twice\nb.two@example.org=Shared-Code-Twice'), []);
  c('a line without "=", or not an email, is left out', list('just-a-code-with-no-email\nnot an email=Some-Long-Code-Here\n=Nothing-Before-It'), []);
  c('nothing set: no guests', [G.guestsOf('', PASSV).length, G.guestsOf(undefined, PASSV).length], [0, 0]);

  console.log('\n-- unlockOf: the passphrase anywhere, a guest code only on its own registration --');
  setEnv(ON); G.forget();
  const U = (given, tok) => G.unlockOf(given, tok, PASSV);
  c('the passphrase: "pass", with or without a registration', [await U(PASSV, tokFor(PASTOR)), await U(PASSV, '')], ['pass', 'pass']);
  c('the guest code on the director\'s own registration: "guest"', await U(D_CODE, tokFor(DIRECTOR)), 'guest');
  c('the same code on another registration (the link passed on): locked', [await U(D_CODE, tokFor(STRANGER)), await U(D_CODE, tokFor(PASTOR))], ['', '']);
  c('the code with no registration token: locked', [await U(D_CODE, ''), await U(D_CODE, null)], ['', '']);
  c('a token signed with another secret, or a damaged one: locked', [await U(D_CODE, tokFor(DIRECTOR, T, OTHER_SECRET)), await U(D_CODE, tokFor(DIRECTOR).slice(0, -1) + 'A')], ['', '']);
  c('a token older than 180 days: locked', await U(D_CODE, tokFor(DIRECTOR, T - 181 * 864e5)), '');
  c('part of the code, or the code with more after it: locked', [await U(D_CODE.slice(0, -1), tokFor(DIRECTOR)), await U(D_CODE + 'x', tokFor(DIRECTOR))], ['', '']);
  c('the code with spaces around it (as typed): still "guest"', await U('  ' + D_CODE + ' ', tokFor(DIRECTOR)), 'guest');
  c('nothing given, or a wrong code: locked', [await U('', tokFor(DIRECTOR)), await U('Wrong-Code-Entirely-1', tokFor(DIRECTOR))], ['', '']);
  c('no passphrase set at all: open, as before (nothing is locked)', await G.unlockOf('', '', ''), 'open');
  setEnv({ ...ON, TERRAIN_REG_SECRET: '' }); G.forget();
  c('no registration secret on the server: a guest code unlocks nothing (fails closed); the passphrase still does', [await U(D_CODE, tokFor(DIRECTOR)), await U(PASSV, '')], ['', 'pass']);
  setEnv({ ...ON, TERRAIN_AI_GUESTS: '' }); G.forget();
  c('the line taken away (revoked): the code is locked again', await U(D_CODE, tokFor(DIRECTOR)), '');
  setEnv({ ...ON, TERRAIN_AI_GUESTS: `New.Guest@Example.org=Not-Yet-Registered-1` }); G.forget();
  const NEW_ID = 'NewGuestId77';
  c('a guest who has not registered yet: locked', await U('Not-Yet-Registered-1', tokFor(NEW_ID)), '');
  R.poke('e/' + sha('new.guest@example.org'), { email: 'new.guest@example.org', id: NEW_ID });
  T += 61e3;
  c('a minute after registering (the email written in capitals in Netlify): "guest"', await U('Not-Yet-Registered-1', tokFor(NEW_ID)), 'guest');
  c('passCheck says yes or no', [await G.passCheck(D_CODE, tokFor(DIRECTOR), PASSV), await G.passCheck('Not-Yet-Registered-1', tokFor(STRANGER), PASSV)], [false, false]);
  setEnv(ON); G.forget();
  c('passCheck: the director yes, the stranger no', [await G.passCheck(D_CODE, tokFor(DIRECTOR), PASSV), await G.passCheck(D_CODE, tokFor(STRANGER), PASSV)], [true, false]);
  c('nothing it does is logged (no code, email or id ever in a log)', logs.filter(l => /Sample-Guest|director|DirectorId/i.test(l)).length, 0);
  const res = await G.default(new Request('https://terrain.church/.netlify/functions/guest-pass'));
  const gj = await res.json();
  c('its GET says only which version it is (never whether a guest is set)', [res.status, Object.keys(gj).sort(), gj.fn], [200, ['fn', 'ok'], 'guest-pass-1.0']);
}

console.log('\n-- advise.mjs: every mode behind the lock asks guest-pass --');
let ver = 0;
const advise = async env => { setEnv(env); if (G) G.forget(); return (await import(new URL('../netlify/functions/advise.mjs?gv=' + (++ver), import.meta.url).href)).default; };
const ask = async (fn, body, pw, tok) => { const r = await quiet(() => fn(new Request('https://terrain.church/.netlify/functions/advise', { method: 'POST',
  headers: { 'content-type': 'application/json', ...(pw ? { 'x-terrain-pass': pw } : {}), ...(tok ? { 'x-terrain-reg': tok } : {}) }, body: JSON.stringify(body) }), { ip: '198.51.100.9' }));
  let j = {}; try { j = await r.json(); } catch {} return { status: r.status, code: j.code || '' }; };
{ const fn = await advise(ON);
  for (const mode of ['prices', 'needs', 'ideas', 'case']) {
    const own = await ask(fn, { mode }, D_CODE, tokFor(DIRECTOR)), other = await ask(fn, { mode }, D_CODE, tokFor(STRANGER)), none = await ask(fn, { mode }, D_CODE, '');
    const pw = await ask(fn, { mode }, PASSV, tokFor(STRANGER));
    c(`${mode}: the director's code on his own registration passes the lock (on to the request's own checks); passed on, or with no registration, it is locked; the passphrase passes`,
      [own.status === 401, other.code, none.code, pw.status === 401], [false, 'locked', 'locked', false]);
  }
  const mOwn = await ask(fn, { mode: 'moves', summary: 'TOWN: Sampleton', count: 1, kind: 'Serve', avoid: [] }, D_CODE, tokFor(DIRECTOR));
  const mOther = await ask(fn, { mode: 'moves', summary: 'TOWN: Sampleton', count: 1, kind: 'Serve', avoid: [] }, D_CODE, tokFor(STRANGER));
  c('"More ideas" (the main route): the director passes, the link passed on is locked', [mOwn.code === 'locked', mOther.code], [false, 'locked']);
  const fn2 = await advise({ ...ON, ANTHROPIC_API_KEY: '' });
  c('the refusals keep their order: with no key it is still "nokey" first, even for a guest', (await ask(fn2, { mode: 'needs' }, D_CODE, tokFor(DIRECTOR))).code, 'nokey');
  const fn3 = await advise({ ...ON, TERRAIN_AI_PASS: '' });
  c('no passphrase: "disabled", guest or not (a guest code never turns the features on by itself)', (await ask(fn3, { mode: 'needs' }, D_CODE, tokFor(DIRECTOR))).code, 'disabled'); }

console.log('\n-- digital.mjs: the in-depth review asks guest-pass too --');
{ setEnv({ ...ON }); if (G) G.forget();
  globalThis.__terrainDigitalStore = makeStore(); globalThis.__terrainDigitalNow = () => T; globalThis.__terrainDigitalSleep = async () => {};
  const Dg = await import('../netlify/functions/digital.mjs');
  const review = async (key, tok) => { const r = await quiet(() => Dg.default(new Request('https://terrain.church/.netlify/functions/digital', { method: 'POST',
    headers: { 'content-type': 'application/json', ...(tok ? { 'x-terrain-reg': tok } : {}) }, body: JSON.stringify({ op: 'review', key }) })));
    let j = {}; try { j = await r.json(); } catch {} return { status: r.status, code: j.code || '' }; };
  const own = await review(D_CODE, tokFor(DIRECTOR)), other = await review(D_CODE, tokFor(STRANGER)), pw = await review(PASSV, tokFor(STRANGER));
  c('the director\'s code on his registration passes the lock; passed on it is locked; the passphrase passes', [own.code === 'locked', other.code, pw.code === 'locked'], [false, 'locked', false]); }

console.log('\n-- the code itself --');
{ const A = read('netlify/functions/advise.mjs'), DG = read('netlify/functions/digital.mjs'), H = read('index.html');
  c('advise.mjs: passOk is gone; guest-pass\'s passCheck at all five lock sites, with the module\'s own passphrase',
    [/function passOk/.test(A), /import \{ passCheck \} from '\.\/guest-pass\.mjs'/.test(A), (A.match(/await passCheck\(request\.headers\.get\('x-terrain-pass'\), request\.headers\.get\('x-terrain-reg'\), PASS\)/g) || []).length], [false, true, 5]);
  c('digital.mjs: the review asks passCheck with the registration token', [/function passOk/.test(DG), /import \{ passCheck \} from '\.\/guest-pass\.mjs'/.test(DG),
    /await passCheck\(typeof b\.key === 'string' \? b\.key : request\.headers\.get\('x-terrain-pass'\), request\.headers\.get\('x-terrain-reg'\), PASS\(\)\)/.test(DG)], [false, true, true]);
  const more = H.slice(H.indexOf('async function libAiMore'), H.indexOf('async function libAiMore') + 6000);
  c('the page: "More ideas" now sends the registration token with the code (so a guest\'s works)', /'x-terrain-pass':aiPass\(\),\.\.\.\(typeof regTok==='function'&&regTok\(\)\?\{'x-terrain-reg':regTok\(\)\}:\{\}\)\},body:JSON\.stringify\(body\)/.test(more), true);
  c('no code or guest email in the repository (made-up ones in this test only)', [/TERRAIN_AI_GUESTS\s*=/.test(read('netlify.toml')), /=\S{12,}@|@\S+=\S{12,}/.test(read('CLAUDE.md').split('TERRAIN_AI_GUESTS').slice(1).join(' ').slice(0, 2000))], [false, false]);
  c('CLAUDE.md names the variable and how to take a guest away', /\| `TERRAIN_AI_GUESTS` \|[^\n]*guest-pass\.mjs[^\n]*Remov/.test(read('CLAUDE.md')), true); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
