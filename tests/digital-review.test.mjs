// v10.62.0 · Digital footprint, the in-depth review: digital.mjs (digital-1.2: the ops review / review-status, the lock, the limits, the
// kept review, the job and the wake) and the background worker digital-review.mjs (review-1.0: one request, no web, the strict tool
// record_review, cleanReview), against an in-memory Netlify Blobs store and a stubbed fetch: no network, no credit spent, never the real
// service. Design: Terrain-work/v79/DESIGN-DIGITAL-2.md, Part 3. The pastor (8 Oct 2026): "Are you able to survey the whole website and see
// its deficiencies as well because this is not enough and when it says like current, it doesn't really mean that it's a good website";
// "It needs to show really the deficiencies and where things can improve"; "I want to set the bar high when it comes to our digital
// footprint". Every church, pastor and page below is made up (Sampleton). Written failing-first on v10.61.1 (the worker did not exist).
import { createHash, createHmac } from 'node:crypto';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', String(JSON.stringify(g)).slice(0, 700)); console.log('    want:', String(JSON.stringify(e)).slice(0, 300)); fail++; } else pass++; };
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
let S = makeStore(); globalThis.__terrainDigitalStore = S;
let T = Date.parse('2026-10-08T12:00:00Z'); globalThis.__terrainDigitalNow = () => T; globalThis.__terrainDigitalSleep = async () => {};
const SECRET = 'x'.repeat(40); process.env.TERRAIN_REG_SECRET = SECRET;
const regTok = (id = 'AbCdEfGhIjKl') => { const iat = Math.floor(T / 1000).toString(36); return `r1.${id}.${iat}.` + createHmac('sha256', SECRET).update(`terrain-reg|r1|${id}|${iat}`, 'utf8').digest('base64url').slice(0, 32); };
const sha = s => createHash('sha256').update(String(s), 'utf8').digest('hex');
const KEYV = 'sk-ant-test-key-0000000000000000000000000000000000', PASSV = 'open-sesame-review';
const env = o => { for (const k of ['ANTHROPIC_API_KEY', 'TERRAIN_AI_PASS', 'REVIEW_DAY_MAX', 'REVIEW_MODEL', 'REVIEW_EFFORT']) delete process.env[k]; Object.assign(process.env, o); };
const ON = { ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV };
const DAY = '2026-10-08', REG = 'AbCdEfGhIjKl';

// ---- the stubbed network: the wake of the worker, and the Anthropic API answering from a script. Anything else is a fault.
let wakes = [], api = [], script = [], wakeStatus = 202;
globalThis.fetch = async (u, o = {}) => {
  u = String(u);
  if (/\/\.netlify\/functions\/digital-review$/.test(u)) { wakes.push({ url: u, body: JSON.parse(o.body) }); return { status: wakeStatus, ok: wakeStatus === 202, json: async () => ({}) }; }
  if (/api\.anthropic\.com/.test(u)) {
    const body = JSON.parse(o.body); api.push({ body, headers: o.headers });
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

const D = await import('../netlify/functions/digital.mjs');
let RV = null;
try { RV = await import('../netlify/functions/digital-review.mjs'); } catch (e) { console.log('  FAIL  digital-review.mjs cannot be imported: ' + String(e && e.message).slice(0, 120)); fail++; }
const call = async (method, q, body, tok = regTok()) => {
  const req = new Request('https://terrain.church/.netlify/functions/digital' + (q || ''), { method, headers: { ...(tok ? { 'x-terrain-reg': tok } : {}), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const res = await quiet(() => D.default(req)); return { status: res.status, cc: res.headers.get('cache-control'), j: JSON.parse(await res.text()) };
};
const ask = (o = {}, tok) => call('POST', '', { op: 'review', conf: 'Pennsylvania', org: 'ANBICG', key: PASSV, ...o }, tok);
const status = (o = {}, tok) => call('POST', '', { op: 'review-status', conf: 'Pennsylvania', org: 'ANBICG', ...o }, tok);

// ---- the made-up conference: five churches as the reader (digital-read-1.2) leaves them, and Sampleton's page texts
const SAMPLETON = {
  org: 'ANBICG', name: 'Sampleton SDA Church', kind: 'church', town: 'Sampleton', state: 'PA', zip: '18900', address: '10 Sample Rd Sampleton PA 18900',
  pastor: 'Dana Reyes', staff: 'Carl Day · Lay Pastor', phone: '215-555-0199', members: 80, type: 'Church', parent: 'Pennsylvania Conference', read: DAY,
  site: {
    listed: 'www.sampleton.test/', url: 'https://www.sampleton.test/', opens: true, https: true, mobile: true, ms: 900, title: 'Sampleton Seventh-Day Adventist Church',
    template: null, description: false, serviceTimes: true, events: false, sermons: true, giving: true, visitors: false, bibleStudy: true, prayerRequest: false,
    pastDate: '2023-07-02', nextDate: null, ahead: 0, copyright: '2024', phones: ['215-555-0199'], pagesRead: ['/', '/newsletter', '/give'],
    pastors: [{ name: 'Dana Reyes', former: false, pages: ['/newsletter'] }], pastorNamed: ['/newsletter'], pastorPhoto: null, pastorPhotoOn: null,
    social: { facebook: 'https://www.facebook.com/SampletonSDA', instagram: null, youtube: 'https://www.youtube.com/@SampletonSDA', livestream: null },
    // digital-read-1.2
    pages: [
      { path: '/', title: 'Sampleton Seventh-Day Adventist Church', words: 240, h1: 'Welcome to Sampleton', newest: null, next: null, forms: { n: 0, prayer: false, bible: false, contact: false, news: false }, videos: 1, imgs: { n: 6, unnamed: 5, generated: 1 }, status: 200 },
      { path: '/newsletter', title: 'Newsletter', words: 90, h1: 'Newsletter', newest: '2023-07-02', next: null, forms: { n: 0 }, videos: 0, imgs: { n: 2, unnamed: 2, generated: 0 }, status: 200 },
      { path: '/calendar', title: null, words: 0, h1: null, newest: null, next: null, forms: { n: 0 }, videos: 0, imgs: { n: 0, unnamed: 0, generated: 0 }, status: 404 }],
    videos: [{ id: 'abc123def45', on: '/', title: 'Sabbath Sermon || Pastor Sample Previous', by: 'Sampleton SDA', date: '2023-05-06', live: false, mine: true, names: ['Sample Previous'] }],
    stale: [{ path: '/newsletter', date: '2023-07-02' }], forms: { n: 0, prayer: false, bible: false, contact: false, news: false }, pics: { n: 9, unnamed: 7, generated: 1 },
    home: { h1: 'Welcome to Sampleton', first: 'Welcome to Sampleton Seventh-Day Adventist Church. Join us this Sabbath. Call 215-555-0199 or email office@sampleton.test for directions.',
      ctas: ['Watch Live', 'Give', 'Bible Studies'],
      pics: [{ url: 'https://www.sampleton.test/img/hero.jpg', alt: 'ChatGPT Image Jun 11, 2026' }, { url: 'http://www.sampleton.test/img/gallery1.jpg', alt: 'gallery1.jpg' },
        { url: 'https://cdn.sampleton.test/img/choir.jpg', alt: '' }, { url: 'https://user:pw@evil.test/x.jpg', alt: '' }, { url: 'https://www.sampleton.test/img/p5.jpg', alt: 'p5' },
        { url: 'https://www.sampleton.test/img/p6.jpg', alt: 'p6' }, { url: 'https://www.sampleton.test/img/p7.jpg', alt: 'p7' }, { url: 'https://www.sampleton.test/img/p8.jpg', alt: 'p8' }] },
    words: [{ t: 'Seventh-Day Adventist', on: '/' }, { t: 'All Rights Served', on: '/' }], email: { host: 'gmail.com', generic: true }, address: true, map: false, latestVideo: '2023-05-06' },
  youtube: { url: 'https://www.youtube.com/@SampletonSDA', read: true, id: 'UCtJthUmfnEmQyFkxEwZbS-w', from: 'site', latest: { t: 'Unity in Diversity || Pastor Dana Reyes', d: '2026-10-06', v: 67 },
    inFeed: 15, last30: 15, last90: 40, avgViews: 119, kinds: { sermon: 12, series: 1, worship: 2, event: 0 }, titles: [{ t: 'Unity in Diversity || Pastor Dana Reyes', d: '2026-10-06', v: 67 }],
    subscribers: 1130, about: 'Sampleton SDA Church, 10 Sample Rd. Join us Sabbath 11 am. Call 215-555-0199 or write sampletonsda@example.org.', aboutSite: true,
    desc: { n: 15, link: 12, address: 10, times: 9 }, upcoming: true, names: [{ n: 'Dana Reyes', c: 14 }], weak: 2,
    recent: [{ t: 'Unity in Diversity || Pastor Dana Reyes', d: '2026-10-06', v: 67 }, { t: '13 - Signs of the Second Coming', d: '2026-09-20', v: 171 }, { t: 'Worship Service || Oct 3, 2026', d: '2026-10-03', v: 52 }] },
  google: { read: true, found: true, name: 'Sampleton Seventh-day Adventist Church', address: '10 Sample Rd, Sampleton, PA 18900, USA', rating: 4.7, reviews: 38, status: 'OPERATIONAL',
    website: 'http://www.sampleton.test/', phone: '(215) 555-0199', maps: 'https://maps.google.com/?cid=123', hours: null, photos: 4 },
  facebook: { url: 'https://www.facebook.com/SampletonSDA', from: 'site', followers: null }, instagram: null, search: { read: true, ownAt: 1 },
  dirPastors: [{ where: 'ChurchFinder', name: 'Mark Gold', url: 'https://www.churchfinder.com/churches/pa/sampleton/x' }]
};
const OTHERS = [
  { org: 'ANBIHL', name: 'Lansdale SDA Church', kind: 'church', town: 'Lansdale', state: 'PA', pastor: 'Paul R. Rivers', phone: '215-555-0102', members: 172, read: DAY, site: { listed: 'lansdale.tmpl.test/', opens: true, https: true, mobile: true }, youtube: null, google: { read: true, found: false } },
  { org: 'ANBIK1', name: 'Willow Grove SDA Church', kind: 'church', town: 'Willow Grove', state: 'PA', pastor: 'Ann Lee', phone: '215-555-0101', members: 60, read: DAY, site: { listed: 'willowgrove.dead.test', opens: false, refused: false, status: 0 }, youtube: null, google: { read: true, found: false } },
  { org: 'ANBIK2', name: 'Shy SDA Church', kind: 'church', town: 'Harveys Lake', state: 'PA', pastor: 'Ben Ode', staff: 'Carl Day · Lay Pastor', phone: '570-555-0102', members: 30, read: DAY, site: { listed: 'shy.test', opens: false, refused: true, status: 403 }, youtube: null, google: { read: false, why: 'nokey' } },
  { org: 'ANBIK3', name: 'Robots SDA Church', kind: 'church', town: 'Erie', state: 'PA', pastor: 'Dee Fox', phone: '814-555-0103', members: 90, read: DAY, site: { listed: 'robots.test', opens: true, blocked: true }, youtube: null, google: { read: true, found: false } }];
const FINDINGS = (at = T) => ({ v: 1, fn: 'digital-read-1.2', conf: 'Pennsylvania', org: 'ANBI11', read: DAY, at, churches: [SAMPLETON, ...OTHERS], places: true, search: true });
const TEXTS = (at = T) => ({ at, pages: [
  { path: '/', title: 'Sampleton Seventh-Day Adventist Church', text: 'Welcome to Sampleton Seventh-Day Adventist Church. Sabbath School 9:30 am. Worship 11:00 am. Bible studies offered: see the links. Join us this Sabbath. Call 215-555-0199 or write office@sampleton.test. All Rights Served.' },
  { path: '/newsletter', title: 'Newsletter', text: 'Our newsletter. Latest issue: July 2, 2023. Pastor Dana Reyes writes: come and see what God is doing in Sampleton.' },
  { path: '/give', title: 'Give', text: 'Give online through Adventist Giving. Thank you for your faithfulness. ' + 'Lorem ipsum dolor sit amet. '.repeat(120) }] });
const seed = (o = {}) => { S = makeStore(); globalThis.__terrainDigitalStore = S; wakes = []; api = []; script = []; wakeStatus = 202;
  if (!o.empty) { S.poke('c/pennsylvania', FINDINGS(o.at)); if (!o.noTexts) S.poke('x/pennsylvania/ANBICG', TEXTS(o.at)); } };

// ---- the stubbed answer: a review as Claude might record it, with the faults cleanReview must catch
const G = (o) => ({ area: 'website', title: 'A gap', what: 'We found no such page on the site.', why: 'A neighbor looks for it first.', fix: 'Add the page.', who: 'Communication team', effort: 'day', priority: 2, ...o });
const RECORD = {
  sees: 'A visitor lands on a slideshow of photographs with no words of welcome; the service times are there, but nothing says what to expect on a first visit, and the newest words on the site are from 2023.',
  strengths: [
    { what: 'Service times on the home page: “Sabbath School 9:30 am”.', where: 'home page' },
    { what: 'Online giving through Adventist Giving.', where: 'Give page' },
    { what: 'A strong channel: 15 videos in 30 days, 1,130 subscribers.', where: 'YouTube' },
    { what: 'The site says “Everyone is welcome here”.', where: 'home page' },                                 // a quote not on the pages
    { what: 'Rated 4.7 by 38 reviews.', where: 'Google' },
    { what: 'A sixth strength, past the five kept.', where: 'anywhere' }],
  gaps: [
    G({ title: 'No page for first-time visitors', what: 'We found no page that tells a first-time visitor what to expect: parking, children, how long the service runs.', why: 'A neighbor deciding whether to come looks for this first.', fix: 'Add a Plan your visit page: service times, parking, children, what to wear, how long.', who: 'Communication team', effort: 'day', priority: 1 }),
    G({ area: 'pastor', title: 'A previous pastor on the home page', what: 'The home page video is titled “Sabbath Sermon || Pastor Sample Previous” (2023); the pastor of record, Dana Reyes, is named only on the newsletter page.', why: 'A visitor meets the wrong face first.', fix: 'Replace the video with a recent sermon by Pastor Dana Reyes and add a welcome with a recent photo.', who: 'Pastor', effort: 'hour', priority: 1 }),
    G({ title: 'The newsletter is from 2023', what: 'The newsletter page’s latest issue is dated July 2, 2023.', why: 'An old page says the church may be inactive.', fix: 'Take the page down or post the current issue.', who: 'Church clerk', effort: 'hour', priority: 2 }),
    G({ area: 'reach', title: 'No way to ask for Bible studies on the site', what: 'Bible studies are offered, but the links go elsewhere; we found no form on the site.', why: 'A neighbor ready to ask has nowhere to ask.', fix: 'Add a short form: name, email or phone, and one line asking for Bible studies.', who: 'Personal ministries', effort: 'day', priority: 1 }),
    G({ area: 'google', title: 'No hours on Google', what: 'Google shows no hours for the listing.', why: 'Google answers whether the church is open before the site does.', fix: 'Add the hours in the Business Profile.', effort: 'hour', priority: 2 }),
    G({ title: 'The name misspelled', what: 'The name is written “Seventh-Day Adventist” where the denomination writes Seventh-day.', why: 'Small, but a visitor notices.', fix: 'Correct the title and the footer.', effort: 'hour', priority: 3 }),
    G({ area: 'youtube', title: 'Descriptions could invite more', what: 'About 120 views each video, but the descriptions could add the service time.', priority: 2 }),   // 120: not in the input (119)
    G({ title: 'A directory names another pastor', what: 'A directory still names Pastor Mark Gold.', priority: 2 }),                                               // a name not in the input
    G({ title: 'Another church does it better', what: 'Lansdale SDA Church has a clearer site.', priority: 3 }),                                                     // another church
    G({ title: 'A tool could help', what: 'AI could write the welcome page in an evening.', priority: 3 }),                                                          // "AI"
    G({ title: 'No page for first-time visitors', what: 'The same gap, said again.', priority: 2 }),                                                                 // repeated
    G({ title: 'Priority out of range', priority: 4 }),
    G({ area: 'social', title: 'Facebook unread' }),                                                                                                                 // not an area
    G({ title: 'An effort that is not one', effort: 'month' }),
    G({ title: 'Too long', what: 'A visitor meets this. '.repeat(13) }),                                                                                           // over 240
    G({ title: 'Markup', what: '<b>Bold</b> words on the page.' }),
    G({ title: 'A web address', what: 'See https://example.test/page for it.' }),
    G({ title: 'A quote not on the pages', what: 'The footer says “All Rights Reserved”.', priority: 3 })],                                                         // the page says "All Rights Served"
  pictures: [
    { on: 'home page, first', shows: 'A slideshow photograph of the sanctuary with the choir.', note: 'Its description is a file name.' },
    { on: 'home page, second', shows: 'Pastor Dana Reyes at the pulpit.', note: 'A recent photo, but it names who.' },                                             // never who
    { on: 'home page, third', shows: 'The Sampleton church building from the road.', note: 'Good: a real place.' },
    { on: 'home page, fourth', shows: 'A Pastor Mark Gold at the door.', note: 'x' }],                                                                             // a name not in the input
  appeal: { level: 1, note: 'A hint: “Join us this Sabbath” on the home page, and no appeal beyond it.' },
  pastor: { shown: 'no', note: 'The pastor a visitor meets is the one in the 2023 video, not Dana Reyes.' },
  words: [
    { for: 'welcome', text: 'Welcome to Sampleton Seventh-day Adventist Church. We are a church family in Sampleton that gathers each Sabbath at 11:00 am. Come as you are: there is a seat for you, and someone will greet you at the door.' },
    { for: 'visit', text: 'Planning your first visit? Sabbath School begins at 9:30 am and worship at 11:00 am. Parking is beside the building, children are welcome in every service, and most families stay about two hours.' },
    { for: 'prayer', text: 'As Jesus said, “For where two or three are gathered together in my name, there am I in the midst of them” (Matthew 18:20). Send us your request and we will pray.' },   // quotes Scripture
    { for: 'google', text: 'Sampleton Seventh-day Adventist Church: a warm church family in Sampleton. Sabbath School 9:30 am, worship 11:00 am. Everyone is welcome.' },
    { for: 'x', text: 'Words for a place that is not one of the five.' },
    { for: 'channel', text: 'Sampleton SDA Church: sermons each Sabbath, Bible studies you can ask for, and a live stream at 11:00 am.' }]
};
const DONE = rec => ({ stop_reason: 'tool_use', usage: { input_tokens: 31000, output_tokens: 2600 }, content: [{ type: 'tool_use', id: 't1', name: 'record_review', input: rec }] });
const CONTACT = /[\w.+-]+@[\w-]+(\.[\w-]+)+|\d{3}[\s.-]\d{3}[\s.-]\d{4}|\(\d{3}\)\s*\d{3}[\s.-]\d{4}/;

try {
  console.log('\n-- the bare GET says whether the review is on (the key AND the passphrase set, REVIEW_DAY_MAX not 0) --');
  seed({ empty: true });
  env({});
  let r = await call('GET', '');
  c('digital-1.2, reviewFn review-1.0; nothing set: review false; the rest as before (readFn is the reader\'s own)', [r.j.fn, r.j.reviewFn, r.j.review, typeof r.j.readFn, r.j.places, r.j.search], ['digital-1.2', 'review-1.0', false, 'string', false, false]);
  env({ ANTHROPIC_API_KEY: KEYV }); r = await call('GET', '');
  c('a key but no passphrase: review false', r.j.review, false);
  env(ON); r = await call('GET', '');
  c('the key and the passphrase: review true', r.j.review, true);
  env({ ...ON, REVIEW_DAY_MAX: '0' }); r = await call('GET', '');
  c('REVIEW_DAY_MAX=0 turns it off: review false', r.j.review, false);
  c('the worker: review-1.0, a background function', [RV && RV.FN, RV && RV.config && RV.config.background], ['review-1.0', true]);

  console.log('\n-- the gate, in the needs\' order: nokey 503 → disabled 403 → locked 401 → noreg 401 → bad 400 → not-yet 403 → unknown 404 → limits 429 → busy 409 --');
  seed({ empty: true });
  env({ TERRAIN_AI_PASS: PASSV });
  c('no key: 503 nokey, before the registration is even looked at', (({ status, j }) => [status, j.code])(await ask({}, '')), [503, 'nokey']);
  env({ ANTHROPIC_API_KEY: KEYV });
  c('no passphrase set: 403 disabled', (({ status, j }) => [status, j.code])(await ask({ key: '' }, '')), [403, 'disabled']);
  env({ ...ON, REVIEW_DAY_MAX: '0' });
  c('REVIEW_DAY_MAX=0: 403 disabled', (({ status, j }) => [status, j.code])(await ask({}, '')), [403, 'disabled']);
  env(ON);
  c('a wrong passphrase: 401 locked, before the registration', (({ status, j }) => [status, j.code])(await ask({ key: 'nope' }, '')), [401, 'locked']);
  c('a passphrase of the right length but other letters: 401 locked', (({ status, j }) => [status, j.code])(await ask({ key: PASSV.replace(/./g, 'q') }, '')), [401, 'locked']);
  c('the passphrase, no registration token: 401 noreg', (({ status, j }) => [status, j.code])(await ask({}, '')), [401, 'noreg']);
  c('a forged token: 401 noreg', (({ status, j }) => [status, j.code])(await ask({}, 'r1.AbCdEfGhIjKl.zz.' + 'A'.repeat(32))), [401, 'noreg']);
  const bad = async o => { const x = await ask(o); return [x.status, x.j.code, x.j.field]; };
  c('an org of the wrong shape: 400 bad', await bad({ org: 'zzz' }), [400, 'bad', 'org']);
  c('a conference Terrain does not register: 400 bad', await bad({ conf: 'Atlantis' }), [400, 'bad', 'conf']);
  c('a language that is not en or es', await bad({ lang: 'fr' }), [400, 'bad', 'lang']);
  c('own that is not a boolean', await bad({ own: 'yes' }), [400, 'bad', 'own']);
  c('own without the pastor\'s own name', await bad({ own: true }), [400, 'bad', 'myName']);
  c('a name with digits or markup', await bad({ own: true, myName: 'Dana <b>Reyes</b> 2' }), [400, 'bad', 'myName']);
  c('a name of 81 letters', await bad({ own: true, myName: 'D'.repeat(81) }), [400, 'bad', 'myName']);
  c('fresh that is not a boolean', await bad({ fresh: 1 }), [400, 'bad', 'fresh']);
  c('a body over 400 bytes: 400 bad', (await ask({ myName: 'x'.repeat(400) })).status, 400);
  c('a conference not switched on (DIGITAL_CONFS): 403 not-yet', await bad({ conf: 'Ohio' }), [403, 'not-yet', undefined]);
  c('Pennsylvania with nothing read yet: 404 unknown', await bad({}), [404, 'unknown', undefined]);
  seed({});
  c('a church that is not in the findings: 404 unknown', await bad({ org: 'ANZZZZ' }), [404, 'unknown', undefined]);
  c('nothing stored, nobody woken, nothing spent', [S.keys('q/'), S.keys('c/site'), S.keys('c/reg'), wakes.length, api.length], [[], [], [], 0, 0]);

  console.log('\n-- the limits: REVIEW_DAY_MAX for the site, 3 a registration a day; a refusal spends nothing --');
  seed({}); env({ ...ON, REVIEW_DAY_MAX: '2' });
  let a = await ask({ org: 'ANBIHL' }), b = await ask({ org: 'ANBIK1' }), d = await ask({ org: 'ANBIK2' });
  c('two reviews, then limit-site 429 with retryAfter', [a.status, b.status, d.status, d.j.code, d.j.retryAfter > 0], [202, 202, 429, 'limit-site', true]);
  c('the site counter at 2, the registration\'s at 2; the refused one took nothing', [S.peek(`c/site/${DAY}`).n, S.peek(`c/reg/${DAY}/${REG}`).n, wakes.length], [2, 2, 2]);
  seed({}); env(ON);
  const codes = [];
  for (const org of ['ANBIHL', 'ANBIK1', 'ANBIK2', 'ANBIK3']) { const x = await ask({ org }); codes.push(x.j.code || x.status); }
  c('three other churches a registration a day; the fourth: limit-reg', codes, [202, 202, 202, 'limit-reg']);
  c('…his own church (own, his name) is not one of the three: 202', (await ask({ own: true, myName: 'Dana Reyes' })).status, 202);
  c('…the site counter counts it; the registration\'s stays at 3', [S.peek(`c/site/${DAY}`).n, S.peek(`c/reg/${DAY}/${REG}`).n], [4, 3]);
  c('another registration has its own three', (await ask({ org: 'ANBIHL' }, regTok('ZzYyXxWwVvUu'))).status, 409);   // busy: that church's job is queued (below)
  c('…and a church no job holds: 202', (await ask({ org: 'ANBIK3' }, regTok('ZzYyXxWwVvUu'))).status, 202);
  T += 864e5;
  r = await ask({ org: 'ANBIHL' });
  c('the next UTC day the counts start again (yesterday\'s queued job, over ten minutes old, no longer holds the church)', [r.status, S.peek(`c/reg/2026-10-09/${REG}`).n], [202, 1]);
  T -= 864e5;

  console.log('\n-- the job: queued with hashes only, the input built on the server, the worker woken at digital-review; the lock --');
  seed({}); env(ON);
  r = await ask({ own: true, myName: 'Dana Reyes' });
  c('202 {ok, fn, job, poll}', [r.status, r.j.ok, r.j.fn, /^[A-Za-z0-9_-]{22}$/.test(r.j.job), r.j.poll, r.cc], [202, true, 'digital-1.2', true, 4000, 'private, no-store']);
  const JOB = r.j.job, rec = S.peek('q/' + JOB), wake = wakes[0];
  c('the record: queued, the worker token a hash, kept at v/<slug>/<org>/<lang>, the church and the day', [rec.status, /^[0-9a-f]{64}$/.test(rec.workerHash), rec.cacheKey, rec.slug, rec.org, rec.lang, rec.own, rec.readAt === T, rec.counts],
    ['queued', true, 'v/pennsylvania/ANBICG/en', 'pennsylvania', 'ANBICG', 'en', true, true, { reg: null, site: `c/site/${DAY}` }]);
  c('the worker woken once, at digital-review, with {job, worker}; the token itself never stored', [wakes.length, wake.url, wake.body.job === JOB, sha(wake.body.worker) === rec.workerHash, JSON.stringify(S.m.get('q/' + JOB)).includes(wake.body.worker)],
    [1, 'https://terrain.church/.netlify/functions/digital-review', true, true, false]);
  c('the lock: l/<slug>/<org> names the job', [S.peek('l/pennsylvania/ANBICG').job, S.peek('l/pennsylvania/ANBICG').lang], [JOB, 'en']);
  c('the same church again while it runs: 409 busy', (({ status, j }) => [status, j.code])(await ask({ own: true, myName: 'Dana Reyes' })), [409, 'busy']);
  c('…in Spanish too (one job a church)', (await ask({ lang: 'es' })).status, 409);
  c('review-status: queued', (await status()).j, { ok: true, status: 'queued', lang: 'en' });
  c('review-status without a registration: 401 noreg', (await status({}, '')).status, 401);
  const I = rec.input, txt = JSON.stringify(I);
  c('the input: the church\'s name and town, his own name as the pastor of record (own), the staff from the listing', [I.church.name, I.church.town, I.pastor, I.pastorFrom, I.staff], ['Sampleton SDA Church', 'Sampleton', 'Dana Reyes', 'registration', ['Carl Day']]);
  c('…the texts the reader kept (x/<slug>/<org>): three pages, each clipped to 2,500 characters', [I.texts.length, I.texts.map(p => p.path), I.texts.every(p => p.text.length <= 2500)], [3, ['/', '/newsletter', '/give'], true]);
  c('…the home page: h1, the first words, the buttons; the pictures as https addresses only, at most 6 (http and one with a password dropped)', [I.home.h1, I.home.ctas, I.pictures.map(p => p.url)],
    ['Welcome to Sampleton', ['Watch Live', 'Give', 'Bible Studies'], ['https://www.sampleton.test/img/hero.jpg', 'https://cdn.sampleton.test/img/choir.jpg', 'https://www.sampleton.test/img/p5.jpg', 'https://www.sampleton.test/img/p6.jpg', 'https://www.sampleton.test/img/p7.jpg', 'https://www.sampleton.test/img/p8.jpg']]);
  c('…the facts in words (the marks found and not found), the YouTube facts, Google\'s facts', [I.facts.length > 12, I.facts.some(f => /first-time visitors/i.test(f)), I.youtube.subscribers, I.youtube.recent.length, I.youtube.avgViews, I.google.rating, I.google.reviews, I.google.hours, I.google.photos],
    [true, true, 1130, 3, 119, 4.7, 38, null, 4]);
  c('…never an email, never a phone (the church\'s own, in its pages, on YouTube, on Google), never another church', [CONTACT.test(txt), /Lansdale|Willow Grove|ANBIHL|Mark Gold|churchfinder/i.test(txt), 'phone' in I.google, I.google.phoneMatches], [false, false, false, true]);
  c('…never the key', txt.includes(KEYV) || JSON.stringify(rec).includes(KEYV), false);
  c('a wrong worker token: skip', RV ? await quiet(() => RV.runJob(JOB, 'A'.repeat(43))) : null, 'skip');
  c('…the job still queued', S.peek('q/' + JOB).status, 'queued');

  console.log('\n-- the study: one request, no web, the strict tool record_review; every word checked; the review kept --');
  script = [DONE(RECORD)]; api = []; logs.length = 0;
  const out = RV ? await quiet(() => RV.runJob(JOB, wake.body.worker)) : null;
  c('the job runs once and is done', out, 'done');
  const call0 = api[0] && api[0].body;
  c('one request: the model, effort medium, the strict record_review and no web tool, the key in a header', [call0 && call0.model, call0 && call0.output_config.effort, call0 && call0.tools.map(t => t.name), call0 && call0.tools[0].strict, api[0] && api[0].headers['x-api-key'] === KEYV],
    ['claude-opus-5-5', 'medium', ['record_review'], true, true]);
  const sys = (call0 && call0.system) || '';
  c('the system prompt: a communication director, the bar, "we found no", every quote word for word, every number from the input, no name not given, never who is in a picture, no other church, never "AI", no markup',
    [/communication director/i.test(sys), /first screen|plan your visit/i.test(sys), /we found no/i.test(sys), /word for word/i.test(sys), /every number/i.test(sys), /never say who/i.test(sys), /no other church|never name another church/i.test(sys), /Never use the words "AI"/.test(sys), /no markup/i.test(sys)],
    [true, true, true, true, true, true, true, true, true]);
  const content = call0 && call0.messages[0].content, imgs = Array.isArray(content) ? content.filter(b => b.type === 'image') : [];
  c('the user message: text and the pictures as image URL blocks (https only)', [Array.isArray(content), imgs.length, imgs.every(b => b.source.type === 'url' && /^https:\/\//.test(b.source.url))], [true, 6, true]);
  const sent = JSON.stringify(call0 && call0.messages);
  c('…it carries the church, the pastor of record, the page texts, the titles; never another church, never an email or a phone', [/Sampleton SDA Church/.test(sent), /Dana Reyes/.test(sent), /All Rights Served/.test(sent), /Signs of the Second Coming/.test(sent), /Lansdale|Mark Gold/.test(sent), CONTACT.test(sent)],
    [true, true, true, true, false, false]);
  const done = S.peek('q/' + JOB), R = done.review, full = RV.cleanReview(RECORD, I);
  c('the record: done, tokens, ms, the model, the rejections counted with their first twelve reasons; never the raw reply', [done.status, done.tokens, done.model, done.rejected > 0, done.reasons.length <= 12, JSON.stringify(done).includes('Everyone is welcome here')],
    ['done', { in: 31000, out: 2600 }, 'claude-opus-5-5', true, true, false]);
  c('what a visitor sees, kept', R.sees.slice(0, 40), 'A visitor lands on a slideshow of photog');
  c('strengths: the quote that is not on the pages refused; five kept at most', [R.strengths.map(s => s.where), full.reasons.includes('strength: a quote not on the pages')], [['home page', 'Give page', 'YouTube', 'Google', 'anywhere'], true]);
  c('gaps kept: the six honest ones, the pastor\'s name and the video\'s "Pastor Sample Previous" (in the input) allowed', R.gaps.map(g => g.title),
    ['No page for first-time visitors', 'A previous pastor on the home page', 'The newsletter is from 2023', 'No way to ask for Bible studies on the site', 'No hours on Google', 'The name misspelled']);
  c('…refused: a number not in the input (120), a name not in the input, another church, "AI", a repeat, priority 4, an area, an effort, a length, markup, a web address, a quote not on the pages',
    ['gap: a number not in the input', 'gap: a name not in the input', 'gap: text', 'gap: repeated', 'gap: priority', 'gap: area', 'gap: effort', 'gap: a quote not on the pages'].map(x => full.reasons.includes(x)).concat(full.reasons.filter(x => x === 'gap: a name not in the input').length),
    [true, true, true, true, true, true, true, true, 2]);
  c('…the reasons count every refusal (12 gaps, 1 strength, 2 pictures, 2 words); the record keeps the first twelve', [done.rejected, full.reasons.length, done.reasons.length, done.reasons], [17, 17, 12, full.reasons.slice(0, 12)]);
  c('pictures: what they show, never who (the pastor\'s own name refused, a stranger\'s too); the building allowed', [R.pictures.map(p => p.on), full.reasons.filter(x => x === 'picture: shows a name').length], [['home page, first', 'home page, third'], 2]);
  c('the appeal and the pastor a visitor meets', [R.appeal, R.pastor.shown], [{ level: 1, note: 'A hint: “Join us this Sabbath” on the home page, and no appeal beyond it.' }, 'no']);
  c('words ready to paste: four kept at most; one quoting Scripture and one for no known place refused', [R.words.map(w => w.for), full.reasons.includes('words: quotes Scripture'), full.reasons.includes('words: for')], [['welcome', 'visit', 'google', 'channel'], true, true]);
  c('the review the page receives has exactly these parts', Object.keys(R).sort(), ['appeal', 'gaps', 'pastor', 'pictures', 'sees', 'strengths', 'words']);
  c('…each gap these fields', Object.keys(R.gaps[0]).sort(), ['area', 'effort', 'fix', 'priority', 'title', 'what', 'who', 'why']);
  const kept = S.peek('v/pennsylvania/ANBICG/en');
  c('the review kept: {v, made, at, readAt, model, review}, readAt the findings\' at', [kept.v, kept.made, kept.at === T, kept.readAt === T, kept.model, kept.review.gaps.length, Object.keys(kept).sort()], [1, DAY, true, true, 'claude-opus-5-5', 6, ['at', 'made', 'model', 'readAt', 'review', 'v']]);
  c('the log line carries counts only, never a page\'s words', [logs.some(l => /\[review\]/.test(l)), logs.some(l => /Sampleton|All Rights|Dana|slideshow|newsletter/.test(l))], [true, false]);
  c('a second wake does nothing', RV ? await quiet(() => RV.runJob(JOB, wake.body.worker)) : null, 'skip');
  r = await status();
  c('review-status: done, with the review and the day it was made', [r.j.status, r.j.made, r.j.review.gaps.length, r.j.lang], ['done', DAY, 6, 'en']);
  const before = [S.peek(`c/site/${DAY}`).n, wakes.length];
  r = await ask({ own: true, myName: 'Dana Reyes' });
  c('the same church again: 200 the kept review, nobody woken, no count spent (the conference\'s other pastors get it too)', [r.status, r.j.cached, r.j.made, r.j.review.gaps.length, [S.peek(`c/site/${DAY}`).n, wakes.length]], [200, true, DAY, 6, before]);
  c('…another registered pastor of the conference, without own: the kept review', (await ask({}, regTok('ZzYyXxWwVvUu'))).j.cached, true);
  c('…in Spanish: its own study (202, kept at v/…/es)', [(await ask({ lang: 'es' })).status, S.peek('q/' + S.peek('l/pennsylvania/ANBICG').job).cacheKey], [202, 'v/pennsylvania/ANBICG/es']);
  const sysEs = RV ? RV.REVIEW_SYSTEM('es') : '';
  c('the Spanish prompt: in Spanish, "IA" forbidden too', [/español/i.test(sysEs), /"IA"/.test(sysEs)], [true, true]);
  await quiet(() => RV.runJob(S.peek('l/pennsylvania/ANBICG').job, wakes[wakes.length - 1].body.worker));   // no script: unavailable; the lock is free again
  c('"Review again" (fresh): a new study even with a kept review, counted', [(await ask({ own: true, myName: 'Dana Reyes', fresh: true })).status, S.peek(`c/reg/${DAY}/${REG}`).n], [202, 1]);
  await quiet(() => RV.runJob(S.peek('l/pennsylvania/ANBICG').job, wakes[wakes.length - 1].body.worker));
  S.poke('c/pennsylvania', FINDINGS(T + 60e3)); S.poke('x/pennsylvania/ANBICG', TEXTS(T + 60e3));
  c('the church read again (the findings\' at moved): the kept review is stale, a new study', (await ask({ own: true, myName: 'Dana Reyes' })).status, 202);
  c('…review-status for a language with no job and no kept review: none', (await status({ org: 'ANBIK3', lang: 'es' })).j.status, 'none');

  console.log('\n-- cleanReview on its own: every refusal, and the whole answer refused with fewer than three gaps --');
  if (RV) {
    const base = { sees: RECORD.sees, strengths: RECORD.strengths.slice(0, 2), pictures: [], appeal: RECORD.appeal, pastor: RECORD.pastor, words: RECORD.words.slice(0, 2) };
    const good = RECORD.gaps.slice(0, 6);
    const run = o => RV.cleanReview({ ...base, ...o }, I);
    c('six honest gaps: a review', [run({ gaps: good }).none, run({ gaps: good }).review.gaps.length], [undefined, 6]);
    c('two gaps: no result, the reasons kept', [run({ gaps: good.slice(0, 2) }).none, run({ gaps: good.slice(0, 2) }).reasons], [true, ['gaps: fewer than 3']]);
    c('three gaps are enough', run({ gaps: good.slice(0, 3) }).review.gaps.length, 3);
    c('a gap whose quote is on the pages in other capitals or quotes: allowed (folded)', run({ gaps: [...good.slice(0, 2), G({ title: 'Quoted', what: 'The footer reads "all rights served" on every page.' })] }).review.gaps.length, 3);
    c('a quote across a page boundary is not on the pages (so two gaps are left: no result)', run({ gaps: [...good.slice(0, 2), G({ title: 'Quoted', what: 'The site says “All Rights Served. Our newsletter”.' })] }).none, true);
    c('a capitalized name of the pastor, the staff, the church or the town is allowed', run({ gaps: [...good.slice(0, 2), G({ title: 'Known', what: 'Carl Day is listed as lay pastor; Sampleton SDA Church is the name.' })] }).review.gaps.length, 3);
    c('a name in the page texts is allowed; one that is not refuses the gap', [run({ gaps: [...good.slice(0, 2), G({ title: 'In texts', what: 'The video names Pastor Sample Previous.' })] }).review.gaps.length, run({ gaps: [...good.slice(0, 2), G({ title: 'Not', what: 'The video names Pastor Sample Other.' })] }).none], [3, true]);
    c('common capitalized words are not names (Plan Your Visit, Bible Studies, Google Maps, Adventist Giving)', run({ gaps: [...good.slice(0, 2), G({ title: 'Words', what: 'Add Plan Your Visit near Bible Studies; Google Maps and Adventist Giving are fine.' })] }).review.gaps.length, 3);
    c('a name in the fix, the why or the title refuses the gap too', [run({ gaps: [...good.slice(0, 2), G({ title: 'Ask Mark Gold', what: 'A thing a visitor meets.' })] }).none, run({ gaps: [...good.slice(0, 2), G({ title: 'Fix', fix: 'Ask Pastor Mark Gold to write it.' })] }).none], [true, true]);
    c('sees: cleaned (markup, "AI", a quote not on the pages, a number not in the input refuse it) and the whole answer with it', [run({ gaps: good, sees: 'AI sees nothing.' }).none, run({ gaps: good, sees: 'About 250 members attend each Sabbath, we read.' }).none, run({ gaps: good, sees: 'The site says “we love you” to everyone.' }).none], [true, true, true]);
    c('…the input\'s own numbers may be said: 80 members, 4.7 stars, 38 reviews, 15 videos, 2023, 9:30', run({ gaps: good, sees: 'A church of 80 members with 4.7 stars from 38 reviews, 15 videos, and a site whose newest words are from 2023 beside the 9:30 service time.' }).review.sees.length > 0, true);
    c('priority must be 1, 2 or 3 as an integer', [run({ gaps: [...good.slice(0, 2), G({ title: 'Priority gap', priority: '1' })] }).none, run({ gaps: [...good.slice(0, 2), G({ title: 'Priority gap', priority: 0 })] }).none], [true, true]);
    c('the areas: website, reach, youtube, google, pastor', ['website', 'reach', 'youtube', 'google', 'pastor'].map(area => run({ gaps: [...good.slice(0, 2), G({ title: 'Area gap', area })] }).review.gaps.length), [3, 3, 3, 3, 3]);
    c('the lengths: title 60, what 240, why 200, fix 320, who 40; sees 600; a strength 160/60; a picture 40/120/160; a note 240/200; words 700',
      [run({ gaps: [...good.slice(0, 2), G({ title: 'T'.repeat(61) })] }).none, run({ gaps: [...good.slice(0, 2), G({ why: 'w '.repeat(101) })] }).none, run({ gaps: [...good.slice(0, 2), G({ fix: 'f '.repeat(161) })] }).none,
        run({ gaps: [...good.slice(0, 2), G({ who: 'w'.repeat(41) })] }).none, run({ gaps: good, sees: 's '.repeat(301) }).none, run({ gaps: good, strengths: [{ what: 'w '.repeat(81), where: 'x' }, RECORD.strengths[1]] }).review.strengths.length,
        run({ gaps: good, pictures: [{ on: 'o'.repeat(41), shows: 'a door', note: 'n' }] }).review.pictures.length, run({ gaps: good, appeal: { level: 2, note: 'n '.repeat(121) } }).review.appeal, run({ gaps: good, pastor: { shown: 'yes', note: 'n '.repeat(101) } }).review.pastor,
        run({ gaps: good, words: [{ for: 'welcome', text: 'w '.repeat(351) }] }).review.words.length],
      [true, true, true, true, true, 1, 0, null, null, 0]);
    c('twelve gaps at most, six pictures, five strengths, four words', (({ review: v }) => [v.gaps.length, v.pictures.length, v.strengths.length, v.words.length])(run({
      gaps: Array.from({ length: 15 }, (_, i) => G({ title: 'Gap number ' + i })), pictures: Array.from({ length: 8 }, (_, i) => ({ on: 'page ' + i, shows: 'a door', note: 'n' })),
      strengths: Array.from({ length: 7 }, (_, i) => ({ what: 'Strength number ' + i, where: 'x' })), words: Array.from({ length: 5 }, () => ({ for: 'welcome', text: 'Welcome, come and see us this Sabbath.' })) })), [12, 6, 5, 4]);
    c('appeal level 0–3; the pastor shown yes/no/unclear; a wrong value leaves that part null, the review stands', (({ review: v }) => [v.appeal, v.pastor])(run({ gaps: good, appeal: { level: 5, note: 'x y z' }, pastor: { shown: 'maybe', note: 'x y z' } })), [null, null]);
    c('"shows" refuses any name, known or not; the church and the town are places, allowed', [run({ gaps: good, pictures: [{ on: 'home', shows: 'Dana Reyes smiling.', note: 'n' }] }).review.pictures.length, run({ gaps: good, pictures: [{ on: 'home', shows: 'Carl Day at the door.', note: 'n' }] }).review.pictures.length, run({ gaps: good, pictures: [{ on: 'home', shows: 'The Sampleton SDA Church sign.', note: 'n' }] }).review.pictures.length], [0, 0, 1]);
    c('"targets" and "the unchurched" are refused as everywhere', run({ gaps: good, sees: 'The site targets the unchurched well.' }).none, true);
    c('a record that is not an object: no result', [RV.cleanReview(null, I).none, RV.cleanReview('x', I).none, RV.cleanReview({ gaps: 'x' }, I).none], [true, true, true]);
  }

  console.log('\n-- the input, built on the server from the findings and the texts: defensively, never from the page --');
  if (RV) {
    const inp = RV.reviewInput(SAMPLETON, TEXTS().pages, { own: false, lang: 'en' });
    c('not his own church: the listing\'s pastor of record', [inp.pastor, inp.pastorFrom], ['Dana Reyes', 'listing']);
    const old = RV.reviewInput({ org: 'ANBIK9', name: 'Old Reading SDA Church', town: 'Oldtown', pastor: null, site: { listed: 'old.test', opens: true, https: false, mobile: false }, youtube: null, google: { read: false } }, null, { own: false, lang: 'en' });
    c('a reading by digital-read-1.1 (no pages, videos, forms, home, texts): the fields it has, the rest left out, no crash', [old.church.name, old.pastor, old.texts, old.pictures, old.home, old.youtube.linked, old.google.read, old.facts.some(f => /not secure|https/i.test(f))], ['Old Reading SDA Church', null, [], [], null, false, false, true]);
    const big = RV.reviewInput({ ...SAMPLETON, site: { ...SAMPLETON.site, home: { ...SAMPLETON.site.home, pics: Array.from({ length: 10 }, (_, i) => ({ url: `https://www.sampleton.test/i${i}.jpg`, alt: '' })) } } },
      Array.from({ length: 20 }, (_, i) => ({ path: '/p' + i, title: 'P' + i, text: 'word '.repeat(1000) })), { own: false, lang: 'en' });
    c('at most 6 pictures, 14 pages, 22,000 characters of text in all (long pages: fewer than fourteen fit)', [big.pictures.length, big.texts.length <= 14, big.texts.length >= 8, big.texts.reduce((n, p) => n + p.text.length, 0) <= 22000], [6, true, true, true]);
    c('…twenty short pages: the first fourteen', RV.reviewInput(SAMPLETON, Array.from({ length: 20 }, (_, i) => ({ path: '/p' + i, title: 'P' + i, text: 'Short words here.' })), { own: false, lang: 'en' }).texts.length, 14);
    c('a picture address that is not https, or carries a password, is never sent', RV.reviewInput({ ...SAMPLETON, site: { ...SAMPLETON.site, home: { ...SAMPLETON.site.home, pics: [{ url: 'http://a.test/x.jpg' }, { url: 'https://u:p@a.test/x.jpg' }, { url: 'https://10.0.0.1/x.jpg' }, { url: 'javascript:alert(1)' }, { url: 'https://a.test/ok.jpg' }] } } }, null, { own: false, lang: 'en' }).pictures.map(p => p.url), ['https://a.test/ok.jpg']);
    c('the listing\'s staff: names only, roles and emails left out', RV.reviewInput({ ...SAMPLETON, staff: 'Carl Day · Lay Pastor, Eve Short · Clerk (eve@example.org) 215-555-0100' }, null, { own: false, lang: 'en' }).staff, ['Carl Day', 'Eve Short']);
    const u = RV.REVIEW_USER(inp), ut = JSON.stringify(u);
    c('the user message names the data as data, not instructions; the texts are marked as the pages\' words', [/not instructions/i.test(ut), /THE PAGES/.test(ut), CONTACT.test(ut)], [true, true, false]);
  }

  console.log('\n-- failures: a refusal, too few gaps (the registration\'s count given back), the service down, no key, one nudge --');
  seed({}); env(ON);
  r = await ask({}); let j1 = r.j.job, w1 = wakes[0].body.worker;
  script = [{ stop_reason: 'refusal', usage: { input_tokens: 10, output_tokens: 1 }, content: [] }];
  c('a refusal: failed refusal; the registration\'s count given back', [await quiet(() => RV.runJob(j1, w1)), S.peek('q/' + j1).code, S.peek(`c/reg/${DAY}/${REG}`).n], ['failed', 'refusal', 0]);
  c('…review-status says failed', (await status()).j, { ok: true, status: 'failed', code: 'refusal', lang: 'en' });
  c('…the church may be asked again (not busy)', (r = await ask({})).status, 202);
  j1 = r.j.job; w1 = wakes[1].body.worker;
  script = [DONE({ ...RECORD, gaps: RECORD.gaps.slice(0, 2) })];
  c('two good gaps: failed no-result, the rejections counted, nothing kept', [await quiet(() => RV.runJob(j1, w1)), S.peek('q/' + j1).code, S.peek('q/' + j1).reasons.includes('gaps: fewer than 3'), S.peek('v/pennsylvania/ANBICG/en')], ['failed', 'no-result', true, null]);
  r = await ask({}); j1 = r.j.job; w1 = wakes[2].body.worker;
  script = [{ status: 529 }];
  c('the service answers 529: failed unavailable, the status kept', [await quiet(() => RV.runJob(j1, w1)), S.peek('q/' + j1).code, S.peek('q/' + j1).httpStatus], ['failed', 'unavailable', 529]);
  r = await ask({ org: 'ANBIHL' }); j1 = r.j.job; w1 = wakes[3].body.worker;
  script = [{ stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 }, content: [{ type: 'text', text: 'Here are some thoughts.' }] }, DONE(RECORD)]; api = [];
  c('no tool call: one nudge, then done', [await quiet(() => RV.runJob(j1, w1)), api.length, /Call record_review now/.test(JSON.stringify(api[1].body.messages))], ['done', 2, true]);
  r = await ask({ org: 'ANBIK1' }); j1 = r.j.job; w1 = wakes[4].body.worker;
  script = [{ stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 }, content: [] }];
  c('nothing said at all: no-result', [await quiet(() => RV.runJob(j1, w1)), S.peek('q/' + j1).code], ['failed', 'no-result']);
  r = await ask({ org: 'ANBIK2' }); j1 = r.j.job; w1 = wakes[5].body.worker;
  env({ TERRAIN_AI_PASS: PASSV }); api = [];
  c('the key gone by the time it runs: unavailable, nothing asked', [await quiet(() => RV.runJob(j1, w1)), S.peek('q/' + j1).code, api.length], ['failed', 'unavailable', 0]);
  env(ON);
  c('a job that is not there: skip', await quiet(() => RV.runJob('A'.repeat(22), 'B'.repeat(43))), 'skip');

  console.log('\n-- a wake that fails, and a job that stalls --');
  seed({}); env(ON); wakeStatus = 500;
  r = await ask({});
  c('the worker not woken: 502 unavailable, the job failed, the counts given back', [r.status, r.j.code, S.peek('q/' + S.peek('l/pennsylvania/ANBICG').job).status, S.peek(`c/site/${DAY}`).n, S.peek(`c/reg/${DAY}/${REG}`).n], [502, 'unavailable', 'failed', 0, 0]);
  wakeStatus = 202;
  r = await ask({});
  c('…then it may be asked again', r.status, 202);
  T += 11 * 60e3;
  r = await status();
  c('queued for over ten minutes: review-status marks it failed (unavailable) and gives the count back', [r.j.status, r.j.code, S.peek(`c/reg/${DAY}/${REG}`).n], ['failed', 'unavailable', 0]);
  c('…and the church is free to ask again', (await ask({})).status, 202);
  const stuck = S.peek('l/pennsylvania/ANBICG').job;
  S.poke('q/' + stuck, { ...S.peek('q/' + stuck), status: 'running', started: T });
  T += 11 * 60e3;
  c('running for over ten minutes: timeout', (await status()).j.code, 'timeout');
  T -= 22 * 60e3;

  console.log('\n-- the worker\'s door --');
  if (RV) {
    const post = async (body, method = 'POST') => (await quiet(() => RV.default(new Request('https://terrain.church/.netlify/functions/digital-review', { method, headers: { 'content-type': 'application/json' }, body })))).status;
    c('GET: 405', await post(undefined, 'GET'), 405);
    c('a body that is not JSON, or of the wrong shape, or too long: 400', [await post('nope'), await post(JSON.stringify({ job: 'x', worker: 'y' })), await post(JSON.stringify({ job: 'A'.repeat(22), worker: 'B'.repeat(43), pad: 'p'.repeat(400) }))], [400, 400, 400]);
    c('a well-formed wake: 202 (a job that is not there is skipped)', await post(JSON.stringify({ job: 'A'.repeat(22), worker: 'B'.repeat(43) })), 202);
  }

  console.log('\n-- the other ops and the GET are as they were --');
  seed({}); env(ON);
  r = await call('GET', '?conf=Pennsylvania');
  c('GET ?conf: ready with the findings', [r.j.state, r.j.findings.churches.length], ['ready', 5]);
  c('an op that is not one: 400 bad', (await call('POST', '', { op: 'nope', conf: 'Pennsylvania' })).status, 400);
  c('warm still exported for register.mjs', typeof D.warm, 'function');
} catch (e) { console.log('  FAIL  crashed: ' + String(e && e.stack || e).split('\n').slice(0, 5).join(' | ')); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
