// v10.60.0 · Digital footprint, the server: digital.mjs (digital-1.0), the background reader digital-read.mjs (digital-read-1.0) and the
// monthly digital-sweep.mjs (digital-sweep-1.0), against an in-memory Netlify Blobs store and a stubbed fetch: no network, no Google
// lookup spent. The pastor (7 Oct 2026): "make sure we're not missing something so we don't accuse them"; "the website is huge, Google
// search and maps are very very important … a little information on Facebook Instagram without breaching anything". Every case below is
// one the Pennsylvania sample met (Terrain-work/v77): a template site's service times inside its scripts (Lansdale), a phone only on the
// "join us" page (Bucks County), a refused site is not a dead one, robots.txt, Google's listing matched by address, Facebook never read.
// Written failing-first on v10.59.3 (the files did not exist).
import { createHash, createHmac } from 'node:crypto';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 600)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
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

// ---- the made-up web
const EAD = 'https://www.eadventist.net/search/organization?locale=en&org=';
const entryHtml = o => `<html><body>eAdventist Login myEadventist App login PERSONNEL Retirement login <h1>${o.name}</h1> Address: ${o.addr} Map: Google Maps
 ${o.web ? 'Website: ' + o.web : ''} Phone: ${o.phone} Email: secret@example.org Pastor: ${o.pastor}${o.staff ? ' Staff: ' + o.staff : ''} Services : Sabbath school: 9:30 am
 Members: ${o.members} Type: Church OrgCode: ${o.org} Parent: Pennsylvania Conference Updated: 09/23/2025 m/d/yyyy Request changes What's nearby?</body></html>`;
const CH = [
  { org: 'ANBICG', name: 'Bucks County SDA Church', addr: '10 Greene Rd Warminster PA 18974-4422', web: 'www.bucks.test/', phone: '215-672-3011', pastor: 'Joshua Mura', members: 240 },
  { org: 'ANBIHL', name: 'Lansdale SDA Church', addr: '887 Troxel Rd Lansdale PA 19446-1234', web: 'lansdale.tmpl.test/', phone: '215-855-9380', pastor: 'Paul R. Rivers', members: 172 },
  { org: 'ANBIK1', name: 'Willow Grove SDA Church', addr: '1576 Fairview Ave Willow Grove PA 19090-1111', web: 'willowgrove.dead.test', phone: '215-555-0101', pastor: 'Ann Lee', members: 60 },
  { org: 'ANBIK2', name: 'Shy SDA Church', addr: '5645 Sr 309 Harveys Lake PA 18618', web: 'shy.test', phone: '570-555-0102', pastor: 'Ben Ode', members: 30, staff: 'Carl Day · Lay Pastor' },
  { org: 'ANBIK3', name: 'Robots SDA Church', addr: '1 Main St Erie PA 16501', web: 'robots.test', phone: '814-555-0103', pastor: 'Dee Fox', members: 90 },
];
const listHtml = t => t === '5' ? CH.map(o => `<a href="/search/organization?locale=en&amp;org=${o.org}">${o.name}</a>`).join('') + '<a href="?org=ANBI11">Pennsylvania Conference</a>' : '';
const SITES = {
  'https://www.bucks.test/': `<html><head><title>Bucks County Seventh-Day Adventist Church</title><meta name="viewport" content="width=device-width"></head><body>
    <a href="/our-staff-1">Our staff</a><a href="/join-us">Join us</a><a href="/blog/2020/x">old</a><a href="https://www.facebook.com/BucksSDA">fb</a>
    <a href="https://www.youtube.com/@BucksSDA">yt</a> Sabbath School 10:00 am Worship 11:30 am. Bible studies offered.</body></html>`,
  'https://www.bucks.test/our-staff-1': '<html><body>Our Staff Pastor Josh Mura VERNON BRAMBLE (LEAD ELDER)</body></html>',
  'https://www.bucks.test/join-us': '<html><body>10 Greene Road Warminster, PA 18974 215-672-3011 bucksoffice@example.org</body></html>',
  'https://lansdale.tmpl.test/': `<html><head><title>Lansdale Seventh-day Adventist Church</title><script src="/_next/static/x.js"></script></head><body>NEW HERE? PLAN YOUR VISIT
    <a href="/about">About</a><script>self.__next_f.push([1,"\\u003cp\\u003eOur Sabbath school starts at 9:30 am; followed by worship at 11:00 a.m.\\u003c/p\\u003e"])</script></body></html>`,
  'https://lansdale.tmpl.test/about': '<html><body>About us. SUBMIT PRAYER REQUEST</body></html>',
  'https://shy.test/': null,   // refuses: 403
  'https://robots.test/': '<html><body>Pastor Dee Fox</body></html>',
  'https://robots.test/robots.txt': 'User-agent: *\nDisallow: /\n',
};
const fetched = []; let wakes = [], placesCalls = [], braveCalls = [];
const PLACES = {
  'Bucks County Seventh-day Adventist Church, 10 Greene Rd Warminster PA 18974-4422': [
    { displayName: { text: 'Warminster Community Center' }, formattedAddress: '300 Elm St, Warminster, PA 18974', types: ['community_center'] },
    { displayName: { text: 'Bucks County Seventh-day Adventist Church' }, formattedAddress: '10 Greene Rd, Warminster, PA 18974, USA', types: ['church', 'place_of_worship'],
      rating: 4.7, userRatingCount: 38, websiteUri: 'http://www.bcadventistchurch.org/', nationalPhoneNumber: '(215) 672-3011', businessStatus: 'OPERATIONAL',
      googleMapsUri: 'https://maps.google.com/?cid=123', regularOpeningHours: { weekdayDescriptions: ['Saturday: 9:30 AM – 1:00 PM'] } }],
};
globalThis.fetch = async (u, o = {}) => {
  u = String(u); fetched.push({ u, ua: o.headers && o.headers['user-agent'] });
  const R = (status, text = '', url = u) => ({ ok: status >= 200 && status < 300, status, url, text: async () => text, json: async () => JSON.parse(text) });
  if (/\/\.netlify\/functions\/digital-read$/.test(u)) { wakes.push(JSON.parse(o.body)); return R(202); }
  if (u.startsWith(EAD)) {
    const m = u.match(/org=(\w+)(?:&orgtype=(\d+))?/); if (m[2]) return R(200, listHtml(m[2]));
    const o2 = CH.find(x => x.org === m[1]); return o2 ? R(200, entryHtml(o2)) : R(404);
  }
  if (/places\.googleapis\.com/.test(u)) { const b = JSON.parse(o.body); placesCalls.push({ q: b.textQuery, key: o.headers['X-Goog-Api-Key'], mask: o.headers['X-Goog-FieldMask'] }); return R(200, JSON.stringify({ places: PLACES[b.textQuery] || [] })); }
  if (/api\.search\.brave\.com/.test(u)) { braveCalls.push({ u, tok: o.headers['X-Subscription-Token'] });
    const q = decodeURIComponent(u.split('q=')[1] || '');
    if (/Willow Grove/.test(q)) return R(200, JSON.stringify({ web: { results: [
      { url: 'https://www.facebook.com/p/Willow-Grove-SDA-Church-100069126146154/', title: 'Willow Grove SDA Church | Abington PA - Facebook', description: 'Willow Grove Seventh-day Adventist Church. 306 followers · 7 talking about this · 10 were here.' },
      { url: 'https://www.churchfinder.com/churches/pa/willow-grove/x', title: 'Willow Grove SDA Church', description: 'This Seventh Day Adventist church serves Willow Grove PA - Pastor Mark Gold.' },
      { url: 'https://www.chamberofcommerce.com/x', title: 'Willow Grove Seventh-day Adventist Church', description: 'Willow Grove Seventh-day Adventist Church in Willow Grove' }] } }));
    return R(200, JSON.stringify({ web: { results: [] } })); }
  if (/youtube\.com\/@BucksSDA/.test(u)) return R(200, '<html>"externalId":"UCtJthUmfnEmQyFkxEwZbS-w"</html>');
  if (/feeds\/videos\.xml/.test(u)) return R(200, `<feed><title>BucksSDA</title><entry><title>Unity in Diversity || Pastor Joshua Mura</title><published>2026-10-06T10:00:00Z</published><media:statistics views="67"/></entry>
    <entry><title>13 - Signs of the Second Coming</title><published>2026-09-20T10:00:00Z</published><media:statistics views="171"/></entry></feed>`);
  if (/facebook\.com|instagram\.com/.test(u)) return R(200, '<html>should never be read</html>');
  if (/dead\.test/.test(u)) throw Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } });
  if (/shy\.test/.test(u)) return R(403, 'Forbidden');
  if (/\/robots\.txt$/.test(u)) return SITES[u] != null ? R(200, SITES[u]) : R(404, '<html>not found</html>');
  const key = Object.keys(SITES).find(k => k.replace(/\/$/, '') === u.replace(/\/$/, '').replace('http://', 'https://'));
  if (key && SITES[key]) return R(200, SITES[key], key);
  return R(404, '');
};

const D = await import('../netlify/functions/digital.mjs');
const RD = await import('../netlify/functions/digital-read.mjs');
const SW = await import('../netlify/functions/digital-sweep.mjs');
const call = async (method, q, body, tok = regTok()) => {
  const req = new Request('https://terrain.church/.netlify/functions/digital' + (q || ''), { method, headers: { ...(tok ? { 'x-terrain-reg': tok } : {}), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const res = await D.default(req); return { status: res.status, cc: res.headers.get('cache-control'), j: JSON.parse(await res.text()) };
};
const runAll = async () => { for (let k = 0; k < 6 && wakes.length; k++) { const w = wakes.shift(); await RD.runJob(w.slug, w.worker, 'https://terrain.church/.netlify/functions/digital-read'); } };

try {
  console.log('\n-- the door: registered pastors only --');
  let r = await call('GET', '?conf=Pennsylvania', null, '');
  c('no registration: 401 noreg (the findings name real churches)', [r.status, r.j.code], [401, 'noreg']);
  r = await call('GET', '?conf=Pennsylvania', null, 'r1.AbCdEfGhIjKl.zz.' + 'A'.repeat(32));
  c('a forged token: 401', r.status, 401);
  r = await call('GET', '');
  // v10.60.1: digital-1.1 (warm(), the reading started at sign-up: the pastor's "yes as soon as they sign up for sure"); the bare GET is unchanged
  // v10.61.0: digital-read-1.1 (how current a site is, the pastor's photo, how fast it opens: the pastor, "it doesn't even have my picture")
  c('the bare GET says which keys are set, never their values', [r.j.fn, r.j.readFn, r.j.places, r.j.search], ['digital-1.1', 'digital-read-1.1', false, false]);
  r = await call('GET', '?conf=Atlantis');
  c('a conference the locator does not have: supported false', [r.status, r.j.supported], [200, false]);
  r = await call('GET', '?conf=Pennsylvania');
  c('Pennsylvania: supported, on by default, nothing read yet; private, never cached by a shared cache', [r.j.supported, r.j.enabled, r.j.state, r.cc], [true, true, 'none', 'private, no-store']);
  r = await call('POST', '', { op: 'read', conf: 'Ohio' });
  c('a conference not switched on (DIGITAL_CONFS): 403 not-yet', [r.status, r.j.code], [403, 'not-yet']);

  console.log('\n-- a reading --');
  r = await call('POST', '', { op: 'read', conf: 'Pennsylvania' });
  const job0 = S.peek('j/pennsylvania');
  c('read: 202, a job with a hashed worker token, the reader woken with it', [r.status, r.j.state, job0.status, job0.phase, wakes.length, /^[0-9a-f]{64}$/.test(job0.workerHash), wakes[0].slug], [202, 'reading', 'running', 'list', 1, true, 'pennsylvania']);
  c('…the worker token itself is never stored', JSON.stringify(S.peek('j/pennsylvania')).includes(wakes[0].worker), false);
  c('a wrong worker token is refused', await RD.runJob('pennsylvania', 'A'.repeat(43), 'https://terrain.church/x'), 'refused');
  r = await call('POST', '', { op: 'read', conf: 'Pennsylvania' });
  c('asking again while it reads starts nothing new', [r.status, wakes.length], [202, 1]);
  r = await call('GET', '?conf=Pennsylvania');
  c('GET while reading: state reading, its phase', [r.j.state, r.j.reading.phase], ['reading', 'list']);
  process.env.BRAVE_SEARCH_KEY = 'brave-test-key'; process.env.GOOGLE_PLACES_KEY = 'places-test-key';
  await runAll();
  const F = S.peek('c/pennsylvania'), by = o => F.churches.find(x => x.org === o);
  c('the reading finished: five churches, today, with the keys said yes', [S.peek('j/pennsylvania').status, F.churches.length, F.read, F.places, F.search], ['done', 5, '2026-10-08', true, true]);
  c('every entry from the official list: pastor, staff apart, members, town (also on a state route), no email kept',
    [by('ANBICG').pastor, by('ANBIK2').staff, by('ANBIK2').pastor, by('ANBICG').members, by('ANBIK2').town, by('ANBICG').town, JSON.stringify(F).includes('secret@example.org')],
    ['Joshua Mura', 'Carl Day · Lay Pastor', 'Ben Ode', 240, 'Harveys Lake', 'Warminster', false]);
  const bk = by('ANBICG').site;
  c('Bucks County: the phone found on its "join us" page; its staff page names the pastor', [bk.phones, bk.pastorNamed, bk.pastors.map(p => p.name)], [['215-672-3011'], ['/our-staff-1'], ['Josh Mura']]);
  c('…a dated blog page is not read; the pages read are the ones a visitor looks at', [bk.pagesRead.includes('/blog/2020/x'), bk.pagesRead], [false, ['/', '/our-staff-1', '/join-us']]);
  const ln = by('ANBIHL').site;
  c('Lansdale: service times read from inside its scripts (never "no service times"); a prayer request found', [ln.serviceTimes, ln.prayerRequest, ln.template], [true, true, 'scripts']);
  c('Willow Grove: the listed address does not open at all (no name answers)', [by('ANBIK1').site.opens, by('ANBIK1').site.refused], [false, false]);
  c('Shy: a site that refuses our reader is "not let in", never "does not open"', [by('ANBIK2').site.opens, by('ANBIK2').site.refused, by('ANBIK2').site.status], [false, true, 403]);
  c('Robots: robots.txt asks programs not to read it, so it is not read', [by('ANBIK3').site.opens, by('ANBIK3').site.blocked, by('ANBIK3').site.pastors], [true, true, undefined]);
  c('our reader says who it is on every church site', fetched.filter(x => /\.test\//.test(x.u)).every(x => /TerrainBot/.test(x.ua || '')), true);
  c('Facebook and Instagram are never read', fetched.some(x => /facebook\.com|instagram\.com/.test(x.u)), false);
  const wg = by('ANBIK1');
  c('the double check (search): Willow Grove\'s Facebook page and its followers from the result\'s own line', [wg.facebook && wg.facebook.from, wg.facebook && wg.facebook.followers], ['search', 306]);
  c('…a directory that still names a pastor is noted; a business listing is never taken for the church\'s site', [wg.dirPastors, !!wg.otherSite], [[{ where: 'ChurchFinder', name: 'Mark Gold', url: 'https://www.churchfinder.com/churches/pa/willow-grove/x' }], false]);
  c('YouTube from the site\'s own link: the public feed (dates, views, what the videos are)', [by('ANBICG').youtube.read, by('ANBICG').youtube.latest.d, by('ANBICG').youtube.avgViews, by('ANBICG').youtube.kinds.series], [true, '2026-10-06', 119, 1]);
  const g = by('ANBICG').google;
  c('Google\'s listing: matched by its street number and ZIP (not the first answer), with stars, reviews, website, phone, Maps link, hours',
    [g.found, g.name, g.rating, g.reviews, g.website, g.phone, g.maps, g.hours], [true, 'Bucks County Seventh-day Adventist Church', 4.7, 38, 'http://www.bcadventistchurch.org/', '(215) 672-3011', 'https://maps.google.com/?cid=123', ['Saturday: 9:30 AM – 1:00 PM']]);
  c('…asked once a church with the key in a header, and only the fields named', [placesCalls.length, placesCalls.every(x => x.key === 'places-test-key'), /places\.rating/.test(placesCalls[0].mask), /reviews\b|photos/.test(placesCalls[0].mask)], [5, true, true, false]);
  c('…no listing at the church\'s address: found false (said carefully on the page)', by('ANBIHL').google, { read: true, found: false });
  c('the month\'s paid lookups are counted', [S.peek('m/2026-10/places').n, S.peek('m/2026-10/search').n], [5, 5]);
  c('no key, no API value in the findings', JSON.stringify(F).includes('places-test-key') || JSON.stringify(F).includes('brave-test-key'), false);
  r = await call('GET', '?conf=Pennsylvania');
  c('GET now: ready, with the findings', [r.j.state, r.j.findings.churches.length], ['ready', 5]);
  r = await call('POST', '', { op: 'read', conf: 'Pennsylvania' });
  c('a fresh reading (under 25 days) is not read again', [r.status, r.j.state, wakes.length], [200, 'ready', 0]);

  console.log('\n-- the month\'s cap on Google\'s listing --');
  process.env.PLACES_MONTH_MAX = '5';
  const one = await RD.google({ name: 'Bucks County SDA Church', address: '10 Greene Rd Warminster PA 18974-4422', zip: '18974' }, S);
  c('past PLACES_MONTH_MAX nothing more is asked of Google this month', [one, placesCalls.length], [{ read: false, why: 'cap' }, 5]);
  delete process.env.PLACES_MONTH_MAX;

  console.log('\n-- Check again (one church) --');
  r = await call('POST', '', { op: 'again', conf: 'Pennsylvania', org: 'ZZZ' });
  c('an unknown church: 404', r.status, 404);
  const before = placesCalls.length;
  r = await call('POST', '', { op: 'again', conf: 'Pennsylvania', org: 'ANBICG' });
  c('again: 202, a job for that one church', [r.status, S.peek('j/pennsylvania').only, S.peek('j/pennsylvania').phase], [202, 'ANBICG', 'read']);
  r = await call('GET', '?conf=Pennsylvania');
  c('…the page still shows the findings while it reads one church', [r.j.state, r.j.reading.only], ['ready', 'ANBICG']);
  await runAll();
  c('…only that church was read again', placesCalls.length - before, 1);
  for (let k = 0; k < 2; k++) { await call('POST', '', { op: 'again', conf: 'Pennsylvania', org: 'ANBIHL' }); await runAll(); }
  r = await call('POST', '', { op: 'again', conf: 'Pennsylvania', org: 'ANBIHL' });
  c('three a registration a day, then 429', [r.status, r.j.code], [429, 'limit']);

  console.log('\n-- a reading that stopped is woken again --');
  S.poke('c/pennsylvania', { ...S.peek('c/pennsylvania'), at: T - 30 * 864e5 });
  r = await call('POST', '', { op: 'read', conf: 'Pennsylvania' });
  wakes = [];   // the wake is lost
  T += 5 * 60e3;
  r = await call('GET', '?conf=Pennsylvania');
  c('GET finds it stalled (no lease, nothing for 4 minutes) and wakes it with a new worker token', [wakes.length, S.peek('j/pennsylvania').rescued === T], [1, true]);
  await runAll();
  c('…and it finishes', S.peek('j/pennsylvania').status, 'done');

  console.log('\n-- the time budget --');
  S.poke('c/pennsylvania', { ...S.peek('c/pennsylvania'), at: T - 30 * 864e5 }); S.poke('t/pennsylvania', { at: 0 });
  await call('POST', '', { op: 'read', conf: 'Pennsylvania' });
  const w0 = wakes.shift(); let ticks = 0; const realNow = globalThis.__terrainDigitalNow;
  globalThis.__terrainDigitalNow = () => (ticks++ > 40 ? T + RD.BUDGET_MS + 1 : T);
  const out = await RD.runJob(w0.slug, w0.worker, 'https://terrain.church/.netlify/functions/digital-read');
  globalThis.__terrainDigitalNow = realNow;
  c('past its 12.5 minutes it saves where it is and wakes itself', [out, wakes.length, S.peek('j/pennsylvania').lease, S.peek('j/pennsylvania').status], ['continued', 1, 0, 'running']);
  await runAll();

  console.log('\n-- the monthly refresh --');
  S.poke('o/pennsylvania', { at: '2026-10-01' }); S.poke('c/pennsylvania', { ...S.peek('c/pennsylvania'), at: T - 40 * 864e5 }); S.poke('j/pennsylvania', { status: 'done' });
  S.poke('o/ohio', { at: '2026-01-01' }); S.poke('c/ohio', { at: 1 }); S.poke('r/ohio/ANBF99', {});
  S.poke('m/2026-06/places', { n: 3 }); S.poke('a/2026-09-01/AbCd', { n: 1 });
  wakes = [];
  const sw = await SW.sweep('https://terrain.church');
  c('opened lately and old findings: read again; unopened for 180 days: forgotten; old counters gone',
    [sw.started, sw.forgotten, S.peek('c/ohio'), S.keys('r/ohio/').length, S.peek('m/2026-06/places'), S.peek('a/2026-09-01/AbCd'), wakes.length], [1, 1, null, 0, null, null, 1]);
  c('the sweep runs on the 1st of each month', SW.config.schedule, '0 7 1 * *');
  c('the reader is a background function', RD.config.background, true);

  console.log('\n-- the pieces --');
  c('robots.txt: our own group, else "*"; the longest rule wins', [RD.robotsAllow(RD.robotsRules('User-agent: *\nDisallow: /private\nAllow: /private/ok\n'), '/private/ok/x'), RD.robotsAllow(RD.robotsRules('User-agent: *\nDisallow: /private\n'), '/private/x'), RD.robotsAllow(RD.robotsRules('User-agent: TerrainBot\nDisallow: /\nUser-agent: *\nDisallow:\n'), '/')], [true, false, false]);
  c('Google: a place at another address with the church\'s name is not taken', RD.pickPlace([{ displayName: { text: 'Lansdale Seventh-day Adventist Church' }, formattedAddress: '9 Other St, Ambler, PA 19002' }], { name: 'Lansdale SDA Church', address: '887 Troxel Rd Lansdale PA 19446', zip: '19446' }), null);
  c('every NAD conference Terrain registers has its locator code', ['Pennsylvania', 'Allegheny East', 'Texico', 'Southern California', 'Greater New York'].map(n => RD.CONF_ORG[n]), ['ANBI11', 'ANB411', 'ANWI11', 'ANPP11', 'AN4811']);
} catch (e) { console.log('  FAIL  crashed: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
