// v10.56.0 · Claude in Make the Case, the servers: advise.mjs advise-2.7 (mode 'ideas' with a group; modes 'case' / 'case-status'), the
// workers advise-ideas.mjs (ideas-1.1, a group's study) and advise-case.mjs (case-1.0, the proposal's words), and needs-sweep.mjs
// (needs-sweep-1.2), against injected in-memory Netlify Blobs stores and a stubbed fetch. No real storage, no network, no credit spent.
// Design: Terrain-work/v73/DESIGN-CASE-CLAUDE.md. The pastor (6 Oct 2026), after the needs and their ideas became Claude's: "And this also
// carries into make the case right and the proposal creation because [it] shouldn't be Claude. Also work on that as well."
// Written failing-first on v10.55.1.
import { createHash } from 'node:crypto';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 700)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
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
    peek(k) { const v = m.get(k); return v ? JSON.parse(v.data) : null; },
    poke(k, val) { m.set(k, { data: JSON.stringify(val), etag: 'e' + (++n) }); },
    keys(p = '') { return [...m.keys()].filter(k => k.startsWith(p)).sort(); } };
}
let S = makeStore(), CS = makeStore(); globalThis.__terrainIdeasStore = S; globalThis.__terrainCaseStore = CS;
const KEYV = 'sk-ant-test-key-0000000000000000000000000000000000', PASSV = 'open-sesame-case';
const sha = s => createHash('sha256').update(String(s), 'utf8').digest('hex');
let wakes = [], api = [], script = [];
globalThis.fetch = async (u, o) => {
  u = String(u);
  if (/\/\.netlify\/functions\/advise-(ideas|case)$/.test(u)) { wakes.push({ url: u, body: JSON.parse(o.body) }); return { status: 202, ok: true, json: async () => ({}) }; }
  if (/api\.anthropic\.com/.test(u)) {
    const body = JSON.parse(o.body); api.push(body);
    let next = script.shift();
    if (typeof next === 'function') next = next(body);
    if (!next) return { ok: false, status: 500, json: async () => ({ error: { message: 'no script' } }) };
    if (next.status && next.status !== 200) return { ok: false, status: next.status, json: async () => next.data || { error: { message: 'boom' } } };
    return { ok: true, status: 200, json: async () => next };
  }
  throw new Error('unexpected fetch ' + u);
};
const logs = [];
const REAL = { log: console.log, error: console.error, warn: console.warn };
const cap = (...a) => logs.push(a.map(String).join(' '));
const quiet = async f => { console.log = cap; console.error = cap; console.warn = cap; try { return await f(); } finally { Object.assign(console, REAL); } };
let ver = 0;
async function advise(env) {
  for (const k of ['ANTHROPIC_API_KEY', 'TERRAIN_AI_PASS', 'TERRAIN_REG_SECRET', 'IDEAS_DAY_MAX', 'NEEDS_DAY_MAX', 'PRICES_DAY_MAX', 'CASE_DAY_MAX']) delete process.env[k];
  Object.assign(process.env, env);
  return (await import(new URL('../netlify/functions/advise.mjs?v=' + (++ver), import.meta.url).href)).default;
}
const W = await import(new URL('../netlify/functions/advise-ideas.mjs', import.meta.url).href);
const WC = await import(new URL('../netlify/functions/advise-case.mjs', import.meta.url).href);
const SW = await import(new URL('../netlify/functions/needs-sweep.mjs', import.meta.url).href);
const dev = n => ('dev' + String(n).padStart(4, '0') + 'AAAAAAAAAAAAAAAAAAAA').slice(0, 22);
const req = (fn, body, h = {}) => quiet(() => fn(new Request('https://pastorshub.org/.netlify/functions/advise', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) }), { ip: h['x-ip'] || '198.51.100.9' }));
const J = async r => ({ status: r.status, ...(await r.json()) });
const FN_ON = { ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV };

console.log('-- GET: advise-2.7, the proposal\'s words on with a key AND a passphrase; ideas-1.1 --');
{ let fn = await advise(FN_ON);
  let g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  c('advise-2.7 · case true · caseFn case-1.0 · ideasFn ideas-1.1', [g.fn, g.case, g.caseFn, g.ideasFn, g.ideas], ['advise-2.7', true, 'case-1.0', 'ideas-1.1', true]);
  fn = await advise({ ANTHROPIC_API_KEY: KEYV }); g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  c('a key but no passphrase: case false', g.case, false);
  fn = await advise({ ...FN_ON, CASE_DAY_MAX: '0' }); g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  c('CASE_DAY_MAX=0 turns the words off (the ideas stay on)', [g.case, g.ideas], [false, true]); }

// ============================================================ PART A: a group's ideas
console.log('\n-- Part A · step 2\'s ideas for one group: the same study, the target g-<group>-<in|out> --');
const FIGS = [
  { k: 'pop', label: 'Population', unit: 'n', t: 5480, w: 32000, c: 646000 },
  { k: 'poverty', label: 'People below poverty line', unit: 'p', t: 19.4, w: 9.8, c: 7.1 },
  { k: 'snap', label: 'Households receiving SNAP', unit: 'p', t: 16.8, w: 8.2, c: 6.2 },
  { k: 'noCar', label: 'Households without a vehicle', unit: 'p', t: 13.5, w: 6, c: 4.9 },
  { k: 'medInc', label: 'Median household income', unit: '$', t: 52000, w: 81000, c: 98000 }];
const GROUP = { id: 'hospitality', name: 'Greeters & hospitality', reach: 'in', themes: ['member-care', 'hospitality'] };
const HAVE = [{ id: 'member-care-two-sabbath-card', name: 'A handwritten card when a member misses two Sabbaths', lift: 1 }];
const GBODY = (o = {}) => ({ mode: 'ideas', lang: 'en', device: o.device || dev(1), fresh: !!o.fresh,
  place: { tract: 'Census Tract 2041.02', town: 'Warminster Township', county: 'Bucks County', state: 'PA' },
  figs: FIGS, langs: [], origins: [], group: o.group || GROUP, tags: ['snap', 'settled'], have: HAVE, ...(o.extra || {}) });
const gask = (fn, o = {}) => req(fn, GBODY(o), { 'x-terrain-pass': PASSV, ...(o.ip ? { 'x-ip': o.ip } : {}) });
{ const fn = await advise(FN_ON);
  const bad = async o => (await J(await gask(fn, o))).field;
  c('a need AND a group: refused', await bad({ extra: { need: { id: 'snap', title: 'Food', cat: 'Hardship', why: '', themes: ['hunger'] } } }), 'target');
  c('a group id in capitals', await bad({ group: { ...GROUP, id: 'Hospitality' } }), 'group.id');
  c('a reach that is not in or out', await bad({ group: { ...GROUP, reach: 'both' } }), 'group.reach');
  c('a theme that is not the library\'s', await bad({ group: { ...GROUP, themes: ['made-up'] } }), 'group.themes');
  c('markup in the group\'s name', await bad({ group: { ...GROUP, name: '<b>Greeters</b>' } }), 'group.name');
  c('nothing stored, nothing woken', [S.keys(), wakes.length], [[], 0]); }
let GJOB = null, GKEY = null, GREC = null;
{ const fn = await advise(FN_ON);
  const r = await J(await gask(fn, { device: dev(2), extra: { church: 'Bucks County SDA' } }));
  c('202: a job for the group', [r.status, r.fn], [202, 'advise-2.7']);
  GJOB = r.job; GKEY = r.key; GREC = S.peek('j/' + r.job);
  c('its target: the group, and a need of its own (g-hospitality-in) for the kept set and the pool', [GREC.input.target, GREC.input.group, GREC.input.need.id, GREC.input.need.title, GREC.input.need.themes],
    ['group', { id: 'hospitality', name: 'Greeters & hospitality', reach: 'in' }, 'g-hospitality-in', 'Greeters & hospitality · for the church family', ['member-care', 'hospitality']]);
  c('…nothing of the church in it', JSON.stringify(GREC).includes('Bucks County SDA'), false);
  const U = W.IDEAS_USER(GREC.input, []), Sy = W.IDEAS_SYSTEM('en', GREC.input);
  c('the request names the group, for the church family, and its ideas already listed', [/THE GROUP:\nGreeters & hospitality · ideas for the church family \(in-reach\)/.test(U),
    /THE GROUP'S IDEAS ALREADY LISTED .*\nmember-care-two-sabbath-card · size 1/.test(U), /THE NEED:/.test(U), /design the 12/.test(U)], [true, true, false, true]);
  c('the system prompt: twelve, four a size, nothing kept, reach every member', [/Write 12 ideas: 4 of each size/.test(Sy), /Leave "keep" empty/.test(Sy), /REACH EVERY MEMBER/.test(Sy),
    /GO WHERE PEOPLE ARE/.test(Sy), /settled, changing and growing/.test(Sy), /no numbers/.test(Sy)], [true, true, true, false, true, true]);
  const So = W.IDEAS_SYSTEM('en', { ...GREC.input, group: { ...GREC.input.group, reach: 'out' } });
  c('…a group\'s outreach keeps "go where people are"', [/GO WHERE PEOPLE ARE/.test(So), /for the community around the church/.test(So)], [true, true]); }
const NUMS = { 1: { ppl: 2, leaders: 0, hrs: 3, cost: 40, costMo: 0, partner: '' }, 2: { ppl: 6, leaders: 1, hrs: 12, cost: 400, costMo: 60, partner: '' },
  3: { ppl: 12, leaders: 2, hrs: 30, cost: 2000, costMo: 300, partner: 'the conference health ministries' } };
const GN = { 1: ['A welcome card in the pew rack', 'A text after a missed Sabbath', 'A greeter at the side door', 'A name tag table for regulars', 'A coffee-free fellowship tea'],
  2: ['A monthly newcomers lunch', 'A ride team for members', 'A birthday card team', 'A shut-in visit rota'],
  3: ['A welcome ministry training day', 'A hospitality team for funerals', 'A members care directory', 'A quarterly family supper'] };
const GIDEA = (t, i, o = {}) => { const name = GN[t][i];
  return { tier: t, k: ['serve', 'belong', 'equip', 'invite'][i % 4], ages: 'adults', where: 'church', sabbath: true, minors: false, cad: 'ongoing', sessions: 0,
    need: ['settled', 'changing', 'growing'], ...NUMS[t], skill: [], fac: [], name,
    d: `${name} gives the greeters one simple way to care for every member by name. Two greeters keep it going and the pastor hears what they learn each month.`,
    how: [`Ask the elders to bless the start of ${name.toLowerCase()} this quarter.`, 'Choose two greeters who will keep it going for three months.',
      'Keep any list private, only with the consent of those on it.', 'Review together each month what worked and what to change.'],
    why: 'Greeters see every member each Sabbath and notice first when someone is missing.', seen: [], ...o }; };
const DONE = rec => ({ stop_reason: 'tool_use', usage: { input_tokens: 9000, output_tokens: 5000, server_tool_use: { web_search_requests: 2, web_fetch_requests: 0 } },
  content: [{ type: 'tool_use', id: 't1', name: 'record_ideas', input: rec }] });
{ script = [DONE({ keep: ['member-care-two-sabbath-card'], ideas: [
    GIDEA(1, 0), GIDEA(1, 1), GIDEA(1, 2), GIDEA(1, 3), GIDEA(1, 4),
    GIDEA(2, 0), GIDEA(2, 1), GIDEA(2, 2, { why: 'About 16.8% of households here receive SNAP.' }), GIDEA(2, 3),
    GIDEA(3, 0), GIDEA(3, 1), GIDEA(3, 2), GIDEA(3, 3)] })]; api = [];
  const out = await quiet(() => W.runJob(GJOB, wakes[wakes.length - 1].body.worker));
  c('the job is done', out, 'done');
  const rec = S.peek('j/' + GJOB), I = rec.ideas;
  c('four a size (a fifth light idea dropped), nothing kept by id', [[1, 2, 3].map(t => I.filter(x => x.tier === t).length), rec.keep], [[4, 4, 4], []]);
  c('ideas for the church family: reach "in", at church allowed (not "waits at the church building"), the group\'s first theme', [I.every(x => x.reach === 'in' && x.where === 'church' && x.theme === 'member-care'),
    rec.reasons.includes('waits at the church building')], [true, false]);
  c('an in-reach "why" keeps no number (a Census figure has no place there); a "why" with none stays', [I.find(x => x.en.n === GN[2][2]).why, I.find(x => x.en.n === GN[1][0]).why],
    [undefined, 'Greeters see every member each Sabbath and notice first when someone is missing.']);
  c('ids from the group\'s own need, the set kept with the group', [I.every(x => /^cl-[0-9a-f]{14}$/.test(x.id)), S.peek(GREC.cacheKey).need.id, S.peek(GREC.cacheKey).group], [true, 'g-hospitality-in', { id: 'hospitality', name: 'Greeters & hospitality', reach: 'in' }]);
  const st = await J(await req(await advise(FN_ON), { mode: 'ideas-status', job: GJOB, key: GKEY }));
  c('ideas-status gives the twelve and the set', [st.status, st.ideas.length, st.set === GREC.cacheKey.slice(2)], ['done', 12, true]);
  const pick = await J(await req(await advise(FN_ON), { mode: 'ideas-pick', device: dev(3), set: GREC.cacheKey.slice(2), id: I[0].id }, { 'x-terrain-pass': PASSV }));
  c('a picked group idea goes to the group\'s pool', [pick.counted, !!S.peek('p/g-hospitality-in/' + I[0].id)], [true, true]); }
{ // outreach for a group: the church rule holds; too few
  const fn = await advise(FN_ON); wakes = [];
  const r = await J(await gask(fn, { device: dev(4), group: { id: 'community', name: 'Community Services (Dorcas)', reach: 'out', themes: ['hunger'] } }));
  script = [DONE({ keep: [], ideas: [GIDEA(1, 0, { why: 'Around the church 16.8% of households receive SNAP.' }), GIDEA(1, 1), GIDEA(2, 0), GIDEA(2, 1), GIDEA(3, 0), GIDEA(3, 1)] })];
  c('a group\'s outreach: an idea that only waits at the church is refused, so five is too few: failed', [await quiet(() => W.runJob(r.job, wakes[0].body.worker)), S.peek('j/' + r.job).code,
    S.peek('j/' + r.job).reasons.filter(x => x === 'waits at the church building').length], ['failed', 'no-result', 2]); }

// ============================================================ PART B: the proposal's words
console.log('\n-- Part B · the proposal\'s words: the lock, before anything is read or spent --');
const SLIDES = [
  { slot: 'join:0', type: 'join', kicker: '', head: '', lines: ['No app, no sign-in'], verse: '' },
  { slot: 'motion:0', type: 'motion', kicker: 'The motion', head: 'Approve a trial of 6 weeks: Put the pantry on Google Maps, 211 and findhelp',
    lines: ['When: 3 options · from October, after a calendar check', 'Spending ceiling: $0 · local budget, not tithe', 'To: Church board · Prepared by {pastor} · October 2026'], verse: 'Proverbs 16:3 · KJV' },
  { slot: 'stat:0', type: 'stat', kicker: 'Why', head: 'About 1 in 6 households around us receives SNAP food assistance', lines: ['17%', 'about 330 households', 'Bucks County 6.2%'], verse: 'Proverbs 31:9 · KJV' },
  { slot: 'how:0', type: 'how', kicker: 'How it works', head: 'Four steps to feed neighbours who are hungry', lines: ['Search “food pantry near me” from three nearby addresses.', 'Update the church\'s Google Business Profile.'], verse: '' },
  { slot: 'capacity:0', type: 'capacity', kicker: 'What it takes', head: 'We have the people and hours to feed neighbours who are hungry', lines: ['Volunteers: 35 free · 1 needed', 'Hours in the first month: 250 h free · 5 h needed'], verse: '' },
  { slot: 'risks:0', type: 'risks', kicker: 'Safeguards', head: 'The questions you would ask, already answered', lines: ['Food received under the food bank’s rules', 'Plans approved by the board first'], verse: '' },
  { slot: 'ask:0', type: 'ask', kicker: 'The ask', head: 'Exactly what we are asking the board for', lines: ['People: 1 volunteer', 'To start: $0', 'Source: Local budget, not tithe'], verse: 'Luke 14:28 · KJV' },
  { slot: 'close:0', type: 'close', kicker: '', head: 'Will you approve it?', lines: ['Approve, approve it smaller, or set a date to decide.'], verse: 'Nehemiah 2:18 · KJV' }];
const CBODY = (o = {}) => ({ mode: 'case', lang: o.lang || 'en', device: o.device || dev(20), fresh: !!o.fresh,
  group: o.group || { id: 'board', name: 'Church board', type: 'board' },
  idea: o.idea || { name: 'Put the pantry on Google Maps, 211 and findhelp', d: 'Make the pantry easy to find where neighbors already search.', how: ['Search from three addresses.', 'Update the profile.'], runs: 'Ongoing', size: 1 },
  goal: o.goal === undefined ? 'Put the pantry on Google Maps, 211 and findhelp, so that neighbours who struggle to afford food eat well.' : o.goal,
  place: { town: 'Warminster', state: 'PA' }, slides: o.slides || SLIDES, questions: o.questions || ['What will it cost, and where does the money come from?'], ...(o.extra || {}) });
const cask = (fn, o = {}) => req(fn, CBODY(o), { 'x-terrain-pass': o.pass === undefined ? PASSV : o.pass, ...(o.ip ? { 'x-ip': o.ip } : {}) });
wakes = []; api = [];
{ let fn = await advise({ TERRAIN_AI_PASS: PASSV });
  c('no key: 503 nokey', await J(await cask(fn)), { status: 503, ok: false, code: 'nokey' });
  fn = await advise({ ANTHROPIC_API_KEY: KEYV });
  c('no passphrase set: 403 disabled', await J(await cask(fn, { pass: '' })), { status: 403, ok: false, code: 'disabled' });
  fn = await advise({ ...FN_ON, CASE_DAY_MAX: '0' });
  c('CASE_DAY_MAX=0: 403 disabled', (await J(await cask(fn))).code, 'disabled');
  fn = await advise(FN_ON);
  c('wrong passphrase: 401 locked', await J(await cask(fn, { pass: 'nope' })), { status: 401, ok: false, code: 'locked' });
  fn = await advise({ ...FN_ON, TERRAIN_REG_SECRET: 'x'.repeat(40) });
  c('registration on, no token: 401 noreg', await J(await cask(fn)), { status: 401, ok: false, code: 'noreg' });
  c('nothing stored, nobody woken, nothing spent', [CS.keys(), wakes.length, api.length], [[], 0, 0]); }

console.log('\n-- the input, field by field: the group, the idea, the slides; names only as the three placeholders --');
{ const fn = await advise(FN_ON);
  const bad = async o => (await J(await cask(fn, o))).field;
  c('a device of the wrong shape', (await J(await req(fn, { ...CBODY(), device: 'x' }, { 'x-terrain-pass': PASSV }))).field, 'device');
  c('a group kind that is not one', await bad({ group: { id: 'board', name: 'Church board', type: 'committee' } }), 'group.type');
  c('a group id of the wrong shape', await bad({ group: { id: 'Board!', name: 'Church board', type: 'board' } }), 'group.id');
  c('an idea with no name', await bad({ idea: { name: '', d: '', how: [], runs: '', size: 1 } }), 'idea.name');
  c('a size that is not 1-3', await bad({ idea: { name: 'An idea here', d: '', how: [], runs: '', size: 5 } }), 'idea.size');
  c('two slides only', await bad({ slides: SLIDES.slice(0, 2) }), 'slides');
  c('a slot of the wrong shape', await bad({ slides: [{ ...SLIDES[1], slot: 'motion' }, ...SLIDES.slice(2)] }), 'slides.slot');
  c('the same slot twice', await bad({ slides: [SLIDES[1], SLIDES[1], ...SLIDES.slice(2)] }), 'slides.slot');
  c('markup on a slide', await bad({ slides: [{ ...SLIDES[1], head: '<img src=x>' }, ...SLIDES.slice(2)] }), 'slides.text');
  c('a brace that is not one of the three names', await bad({ slides: [{ ...SLIDES[1], lines: ['Prepared by {member}'] }, ...SLIDES.slice(2)] }), 'slides.lines');
  c('a goal with a stray brace', await bad({ goal: 'To serve {everyone}' }), 'goal');
  c('nine questions', await bad({ questions: Array.from({ length: 9 }, (_, i) => 'Question number ' + i) }), 'questions');
  c('nothing stored, nothing woken', [CS.keys(), wakes.length], [[], 0]); }

console.log('\n-- 202: the job, hashes only, the input cleaned; the worker woken at advise-case --');
let CJOB = null, CKEY = null, CREC = null;
{ const fn = await advise(FN_ON);
  const r = await J(await cask(fn, { device: dev(21), ip: '203.0.113.7', extra: { church: 'Bucks County SDA', pastor: 'Joshua Mura', address: '10 Greene Rd' } }));
  c('202 {ok, fn, job, key, poll}', [r.status, r.ok, r.fn, /^[A-Za-z0-9_-]{22}$/.test(r.job), /^[A-Za-z0-9_-]{43}$/.test(r.key), r.poll], [202, true, 'advise-2.7', true, true, 4000]);
  CJOB = r.job; CKEY = r.key; CREC = CS.peek('j/' + r.job);
  c('the record: queued, the key a hash, kept by its whole input (w/<32 hex>/en)', [CREC.status, CREC.keyHash === sha(r.key), /^w\/[0-9a-f]{32}\/en$/.test(CREC.cacheKey)], ['queued', true, true]);
  const txt = JSON.stringify(CREC);
  c('…nothing of the church, the pastor, the device or the address in it', ['Bucks County SDA', 'Joshua Mura', '10 Greene Rd', dev(21), '203.0.113.7'].map(w => txt.includes(w)), [false, false, false, false, false]);
  c('…its input: the cleaned fields only, and which names the slides use', [Object.keys(CREC.input).sort(), CREC.input.names], [['goal', 'group', 'idea', 'lang', 'names', 'place', 'questions', 'slides'], ['pastor']]);
  c('the worker was woken once, at advise-case, with its own token', [wakes.length, wakes[0].url, sha(wakes[0].body.worker) === CREC.workerHash], [1, 'https://pastorshub.org/.netlify/functions/advise-case', true]);
  const U = WC.CASE_USER(CREC.input);
  c('what goes to the model: the group\'s concerns, the place, the slides by id with EDIT where a headline may change; never a real name',
    [/GROUP: Church board · a deciding body/.test(U), /PLACE: Warminster, PA/.test(U), /\[motion:0\] · motion · EDIT/.test(U), /\[join:0\] · join\n/.test(U), /Prepared by \{pastor\}/.test(U), /Joshua|Bucks County SDA/.test(U)],
    [true, true, true, true, true, false]); }

console.log('\n-- the study: one request, no web, one strict tool; every word checked --');
const WORDS = { heads: [
    { slot: 'motion:0', text: 'Approve a 6-week trial: make our pantry easy to find online' },
    { slot: 'stat:0', text: '1 in 6 homes near {church} relies on SNAP to eat' },
    { slot: 'how:0', text: 'Four simple steps put us where neighbors already search' },
    { slot: 'capacity:0', text: 'We already have the 35 volunteers this needs' },
    { slot: 'risks:0', text: 'Safe, simple, and approved by this board first' },
    { slot: 'ask:0', text: 'Our ask: 1 volunteer, $0 to start, local budget' },
    { slot: 'close:0', text: 'Will you approve the trial tonight?' },
    { slot: 'join:0', text: 'Scan to follow along' },                                                   // the join slide's headline is the ministry's name
    { slot: 'place:0', text: 'A slide that is not there' },
    { slot: 'motion:0', text: 'A second headline for the motion' },                                      // one a slide
    { slot: 'stat:0', text: 'About 42% of homes here go hungry' }                                        // repeated slot, and a number not on the slides
  ], say: [
    { slot: 'motion:0', text: 'We are asking for six weeks to make our pantry easy to find, at no cost to the budget.' },
    { slot: 'stat:0', text: 'That is about 330 households within reach of our doors, more than twice the county.' },
    { slot: 'capacity:0', text: 'One volunteer and 5 hours in the first month is all it takes.' },
    { slot: 'ask:0', text: 'AI can help us write the listings in an evening.' },                         // "AI"
    { slot: 'risks:0', text: 'As the Bible says, “Open thy mouth, judge righteously” (Proverbs 31:9).' }, // a quotation
    { slot: 'close:0', text: 'Let us decide tonight, together, as {church}.' }
  ], qa: [
    { q: 'What will it cost?', a: 'Nothing to start: $0, from the local budget, never tithe.' },
    { q: 'Who will do the work?', a: 'One volunteer, about 5 hours in the first month; {coordinator} will lead it.' },   // a name the slides do not use
    { q: 'How will we know it worked?', a: 'At the review after the 6 weeks we will look at what changed in how neighbors find us.' },
    { q: 'Is anyone at risk?', a: 'No one: the food is handled under the food bank’s rules and the board approves first.' },
    { q: 'What will it cost?', a: 'A repeated question.' },
    { q: 'Will it bring 50 new families?', a: 'We expect 50 new families in a month.' }                   // an invented number
  ] };
const CDONE = rec => ({ stop_reason: 'tool_use', usage: { input_tokens: 4000, output_tokens: 3000 }, content: [{ type: 'tool_use', id: 't1', name: 'record_words', input: rec }] });
{ script = [CDONE(WORDS)]; api = [];
  const out = await quiet(() => WC.runJob(CJOB, wakes[0].body.worker));
  c('the job runs once and is done', out, 'done');
  const call = api[0];
  c('one request: the model, no web tools, the strict record_words', [call.model, call.tools.map(t => t.name), call.tools[0].strict, call.output_config.effort], ['claude-opus-5-5', ['record_words'], true, 'medium']);
  c('…the system prompt: facts only from the slides, never longer, the names, neighbors, no quoting, never "AI"', [/FACTS ONLY FROM THE SLIDES/.test(call.system), /NEVER LONGER than the slide's current headline/.test(call.system),
    /\{church\}, \{pastor\} or \{coordinator\}/.test(call.system), /never "targets"/.test(call.system), /Never quote Scripture or Ellen White word for word/.test(call.system), /Never use the words "AI"/.test(call.system)],
    [true, true, true, true, true, true]);
  const rec = CS.peek('j/' + CJOB), Wd = rec.words;
  c('headlines kept: one a slide it may reword, numbers the slides say; {church} refused (these slides never say it)', [Object.keys(Wd.heads).sort(), rec.reasons.includes('head: a name')], [['ask:0', 'capacity:0', 'close:0', 'how:0', 'motion:0', 'risks:0'], true]);
  c('…the first one for a slide wins', Wd.heads['motion:0'], 'Approve a 6-week trial: make our pantry easy to find online');
  c('refused: the join slide, a slide not sent, a second motion, a repeated slot', ['head: not a headline to reword', 'head: no such slide', 'head: repeated'].map(x => rec.reasons.includes(x)), [true, true, true]);
  c('what to say: kept where clean; "AI", a quotation and {church} (never sent) refused', [Object.keys(Wd.say).sort(), rec.reasons.filter(x => /^say: /.test(x))],
    [['capacity:0', 'motion:0', 'stat:0'], ['say: text', 'say: quotes Scripture', 'say: a name']]);
  c('questions: kept where clean; {coordinator} (never sent), a repeat and an invented number refused', [Wd.qa.map(x => x.q), rec.reasons.filter(x => /^(q|a|qa): /.test(x))],
    [['What will it cost?', 'How will we know it worked?', 'Is anyone at risk?'], ['a: a name', 'qa: repeated', 'q: a number not on the slides']]);
  const cache = CS.peek(CREC.cacheKey);
  c('the words are kept (60 days) for exactly this input', [cache.v, Object.keys(cache.words.heads).length, cache.lang], [1, 6, 'en']);
  const st = await J(await req(await advise(FN_ON), { mode: 'case-status', job: CJOB, key: CKEY }));
  c('case-status gives the words', [st.status, Object.keys(st.words.heads).length, Object.keys(st.words.say).length, st.words.qa.length], ['done', 6, 3, 3]);
  c('…a wrong key: 403', (await J(await req(await advise(FN_ON), { mode: 'case-status', job: CJOB, key: 'x'.repeat(43) }))).status, 403);
  c('the log lines carry codes and counts only', logs.some(l => /Warminster|pantry|SNAP|Church board|330/.test(l)), false);
  c('a second wake does nothing', await quiet(() => WC.runJob(CJOB, wakes[0].body.worker)), 'skip'); }

console.log('\n-- kept words: the same input again costs nothing; other slides, or "Write them again", are a study --');
{ const fn = await advise(FN_ON);
  wakes = []; const before = CS.keys('c/');
  const r = await J(await cask(fn, { device: dev(22) }));
  c('the same slides: 200 cached, nobody woken, no count spent', [r.status, r.cached, Object.keys(r.words.heads).length, wakes.length, JSON.stringify(CS.keys('c/')) === JSON.stringify(before)], [200, true, 6, 0, true]);
  c('…one slide changed: its own study', (await J(await cask(fn, { device: dev(22), slides: [{ ...SLIDES[1], head: 'Approve a trial of 4 weeks' }, ...SLIDES.slice(2)] }))).status, 202);
  c('…fresh: a new study even with kept words', (await J(await cask(fn, { device: dev(22), fresh: true }))).status, 202); }

console.log('\n-- too few good words: no result; the device count given back --');
{ CS = makeStore(); globalThis.__terrainCaseStore = CS; wakes = [];
  const fn = await advise(FN_ON);
  const r = await J(await cask(fn, { device: dev(30), fresh: true }));
  script = [CDONE({ heads: [{ slot: 'motion:0', text: 'Approve it' }, { slot: 'ask:0', text: 'Our ask: 99 volunteers' }], say: [], qa: [{ q: 'Cost?', a: 'Nothing.' }] })];
  const devKey = CS.peek('j/' + r.job).counts.dev;
  c('fewer than three of each: failed no-result, the count given back', [await quiet(() => WC.runJob(r.job, wakes[0].body.worker)), CS.peek('j/' + r.job).code, CS.peek(devKey).n], ['failed', 'no-result', 0]);
  const r2 = await J(await cask(fn, { device: dev(30), fresh: true }));
  script = [{ stop_reason: 'refusal', usage: { input_tokens: 10, output_tokens: 1 }, content: [] }];
  c('a refusal: failed refusal', [await quiet(() => WC.runJob(r2.job, wakes[1].body.worker)), CS.peek('j/' + r2.job).code], ['failed', 'refusal']);
  const r3 = await J(await cask(fn, { device: dev(31), fresh: true }));
  script = [{ stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 }, content: [{ type: 'text', text: 'Here are some thoughts.' }] }, CDONE(WORDS)]; api = [];
  c('no tool call: one nudge, then done', [await quiet(() => WC.runJob(r3.job, wakes[2].body.worker)), api.length, /Call record_words now/.test(JSON.stringify(api[1].messages))], ['done', 2, true]); }

console.log('\n-- cleanWords on its own: the headline that runs longer than the slide\'s --');
{ const input = { ...CREC.input, names: ['pastor', 'church'] };
  const r = WC.cleanWords({ heads: [{ slot: 'close:0', text: 'Will you, the church board of our church, approve this trial tonight please?' }, { slot: 'close:0', text: 'Will you approve it tonight?' }], say: [], qa: [] }, input);
  c('a close of 4 words may not become 14; the same slot then takes the next', [r.none, r.reasons], [true, ["head: longer than the slide's"]]); }

console.log('\n-- the library\'s themes, all 57, on the server too (v10.41 added fifteen the server did not know) --');
{ const fs = await import('node:fs');
  const t = JSON.parse(fs.readFileSync(new URL('../tools/ideas-src/themes.json', import.meta.url), 'utf8')), ids = (Array.isArray(t) ? t : t.themes).map(x => x.id).sort();
  const src = fs.readFileSync(new URL('../netlify/functions/advise.mjs', import.meta.url), 'utf8');
  const m = /const LIB_THEMES = new Set\(\[([\s\S]*?)\]\);/.exec(src), have = [...m[1].matchAll(/'([a-z-]+)'/g)].map(x => x[1]).sort();
  c('advise.mjs LIB_THEMES = tools/ideas-src/themes.json', [have.length, JSON.stringify(have) === JSON.stringify(ids)], [ids.length, true]); }

console.log('\n-- the limits --');
{ CS = makeStore(); globalThis.__terrainCaseStore = CS;
  const fn = await advise(FN_ON); const codes = [];
  for (let i = 0; i < 21; i++) codes.push((await J(await cask(fn, { device: dev(40), fresh: true, ip: '192.0.2.' + i }))).status);
  c('twenty studies a device a day, the twenty-first refused', [codes.slice(0, 20).every(s => s === 202), codes[20]], [true, 429]);
  CS = makeStore(); globalThis.__terrainCaseStore = CS;
  const fn2 = await advise({ ...FN_ON, CASE_DAY_MAX: '2' }); const site = [];
  for (let i = 0; i < 3; i++) site.push((await J(await cask(fn2, { device: dev(50 + i), fresh: true, ip: '192.0.2.' + (60 + i) }))).code || 'ok');
  c('CASE_DAY_MAX for the whole site', site, ['ok', 'ok', 'limit-site']); }

console.log('\n-- the sweep (needs-sweep-1.2): kept words after 60 days, jobs after 7, counters after 2 --');
{ const St = makeStore(), now = Date.parse('2026-12-10T12:00:00Z');
  St.poke('w/' + 'a'.repeat(32) + '/en', { v: 1, at: now - 61 * 864e5, words: {} });
  St.poke('w/' + 'b'.repeat(32) + '/es', { v: 1, at: now - 5 * 864e5, words: {} });
  St.poke('j/' + 'A'.repeat(22), { created: now - 8 * 864e5 });
  St.poke('c/dev/2026-12-01/' + 'f'.repeat(16), { n: 1 });
  const r = await SW.sweep(St, now, now);
  c('the old words, the old job and the old counter go; fresh words stay', [r.lists, r.jobs, r.counters, St.keys()], [1, 1, 1, ['w/' + 'b'.repeat(32) + '/es']]);
  const src = (await import('node:fs')).readFileSync(new URL('../netlify/functions/needs-sweep.mjs', import.meta.url), 'utf8');
  c('the daily run sweeps the store "terrain-case" too', [/needs-sweep-1\.2/.test(src), /CASE_STORE = 'terrain-case'/.test(src), /sweep\(caseStore\(\)/.test(src)], [true, true, true]); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
