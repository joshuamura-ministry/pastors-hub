// v10.62.0 · digital-read-1.2: the reader reads the whole site (DESIGN-DIGITAL-2.md, Part 1). The pastor (8 Oct 2026): "Are you able to
// survey the whole website and see its deficiencies as well because this is not enough and when it says like current, it doesn't really
// mean that it's a good website doesn't mean that it's doing its work as a website"; "I want to set the bar high when it comes to our
// digital footprint". A stubbed fetch, made-up sites and channels (the repository is public), an in-memory store; no network, no Google
// lookup spent, never the real oEmbed or a watch page. Written failing-first on v10.61.1 (Terrain-work/v79/logs/ff-digital-read-2.log).
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 700)); console.log('    want:', JSON.stringify(e).slice(0, 400)); fail++; } else pass++; };
const sec = async (name, fn) => { console.log('\n-- ' + name + ' --'); try { await fn(); } catch (e) { console.log('  FAIL  crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); fail++; } };
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
const S = makeStore(); globalThis.__terrainDigitalStore = S;
const T = Date.parse('2026-10-08T12:00:00Z'); globalThis.__terrainDigitalNow = () => T;
const sleeps = []; globalThis.__terrainDigitalSleep = async ms => { sleeps.push(ms); };

// ---- the made-up web: one church site read whole (www.whole.test), its channel, and two bare sites
const CHID = 'UCwhole1234567890abcdefg', OTHER = 'UCother1234567890abcdefg';
const NAV = ['about', 'give', 'newsletter', 'prayer', 'bible-studies', 'old-page', 'huge', 'blog', 'sermons', ...Array.from({ length: 30 }, (_, i) => 'p' + (i + 1))];
const page = (title, body) => `<html><head><title>${title}</title></head><body>${body}</body></html>`;
const SITES = {
  'https://www.whole.test/': `<html><head><title>Wholeton Seventh-Day Adventist Church</title><meta name="viewport" content="width=device-width"><meta name="description" content="A Seventh-day Adventist church in Wholeton: worship every Sabbath at 11:00 am."></head><body>
<header><img src="/logo.png" alt="Wholeton SDA logo"><nav><a href="/">Home</a>${NAV.map(p => `<a href="/${p}">${p}</a>`).join('')}</nav></header>
<main><h1>Welcome home</h1>
<img src="/uploads/ChatGPT-Image-Jun-11-2026.png" alt="ChatGPT Image Jun 11, 2026, 10_22_01 AM"><img src="/uploads/gallery1.jpg" alt="gallery1.jpg"><img src="/uploads/IMG_2231.jpg"><img src="/uploads/potluck.jpg" alt="Our members at the potluck">
<p>Join us this Sabbath. Sabbath School 10:00 am, worship 11:00 am. Harvest dinner Oct 24, 2026.</p>
<a href="/plan-your-visit" class="btn">Plan your visit</a> <button>Watch live</button> <a href="/give" class="btn">Give online</a>
<iframe src="https://www.youtube.com/embed/vidAAAAAAAA?rel=0" title="Worship"></iframe>
<p><a href="/our-staff-1">Our staff</a> · <a href="/blog/2020/x">An old post</a></p>
<div class="main-menu"><a href="/contact">Contact</a></div>
<a href="https://www.youtube.com/@WholeSDA">YouTube</a><p>Questions? Call 215-555-0123 or write to pastor.jm@gmail.com.</p></main>
<footer><a href="/give">Give</a><a href="/events">Events</a><a href="mailto:wholeton.office@gmail.com?subject=Hello">Email us</a><a href="https://www.google.com/maps/place/10+Greene+Rd+Wholeton">Map</a>
<form class="newsletter" action="/subscribe"><input type="email" name="EMAIL" placeholder="Your email"><button>Subscribe</button></form>
<form role="search" action="/search"><input type="search" name="q"><button>Search</button></form>
<p>© 2026 Wholeton SDA Church. All Rights Served.</p></footer></body></html>`,
  'https://www.whole.test/contact': page('Contact us', `<h1>Contact</h1><p>10 Greene Road, Wholeton PA 18974. You will recieve a reply within a week, which is quick.</p>
<form id="contact-form"><input type="text" name="name"><input type="email" name="email"><textarea name="message"></textarea><button>Send</button></form><a href="mailto:wholeton.office@gmail.com">Email</a>`),
  'https://www.whole.test/our-staff-1': page('Our staff', `<h1>Our staff</h1><div class="card"><img src="/uploads/pastor-mura.jpg" alt="Pastor Joshua Mura"><h3>Pastor Joshua Mura</h3></div>
<p>We are a Seventh-day Adventist church, which welcomes all. A sandwich lunch follows.</p>`),
  'https://www.whole.test/plan-your-visit': page('Plan your visit', `<h1>New here?</h1><p>What to expect: parking behind the church, children welcome.</p><img src="/uploads/stock-photo-family.jpg" alt="A family at church">
<h2>Let us know you're coming</h2><iframe src="https://docs.google.com/forms/d/e/1FAIpQL-sample/viewform?embedded=true"></iframe>`),
  'https://www.whole.test/about': page('About', `<h1>About us</h1><p>Founded March 3, 2001. Anniversary service Nov 7, 2026.</p><img src="/uploads/potluck.jpg" alt="Our members at the potluck">`),
  'https://www.whole.test/give': page('Give', `<h1>Give</h1><p>Give online through Adventist Giving.</p><a href="https://adventistgiving.org/donate/ANBIW1">Give online</a>`),
  'https://www.whole.test/newsletter': page('Newsletter', `<h1>Our newsletter</h1><p>Latest issue: July 2, 2023.</p>`),
  'https://www.whole.test/prayer': page('Prayer', `<h2>Prayer Request</h2><p>Every Sabath we pray for you.</p><form action="/prayer" method="post"><input type="text" name="your-name"><textarea name="request"></textarea><button>Send</button></form>`),
  'https://www.whole.test/bible-studies': page('Bible studies', `<h1>Free Bible Studies</h1><p>Request Bible studies below.</p><form><input name="name"><input type="email" name="email"><input type="submit" value="Request"></form>`),
  'https://www.whole.test/old-page': null,   // 404: a broken menu link
  'https://www.whole.test/huge': page('Huge', '<p>' + 'x '.repeat(800000) + '</p>'),   // 1.6 MB: skipped
  'https://www.whole.test/blog': page('Blog', `<h1>Blog</h1><p>Posted Sept 1, 2024. Posted Aug 2, 2024.</p>`),
  'https://www.whole.test/sermons': page('Sermons', `<h1>Sermons</h1><script>var cfg = {"video":"https:\\/\\/www.youtube.com\\/embed\\/vidBBBBBBBB"};</script>
<a href="https://youtu.be/vidCCCCCCCC">Last week</a> <a href="https://www.youtube.com/watch?v=vidDDDDDDDD&t=10">Two weeks ago</a>
<iframe src="https://player.vimeo.com/video/123456789"></iframe><iframe src="https://www.youtube-nocookie.com/embed/vidFFFFFFFF"></iframe>
<iframe src="https://www.youtube.com/embed/vidGGGGGGGG"></iframe><iframe src="https://www.youtube.com/embed/videoseries?list=PL1"></iframe>`),
  'https://www.whole.test/p1': page('P1', `<h1>Page one</h1><p>${'word '.repeat(900)}</p>`),
  'https://plain.test/': page('Plain Seventh-day Adventist Church', `<p>Worship 11 am.</p><a href="mailto:office@plainsda.org">Email</a>`),
  'https://bare.test/': page('Bare SDA', `Hello`),
};
for (let i = 2; i <= 30; i++) SITES['https://www.whole.test/p' + i] = page('P' + i, `Page ${i}`);
const OEMBED = {
  vidAAAAAAAA: { title: 'Worship Service || Pastor Sample Previous', author_name: 'Wholeton SDA Church' },
  vidBBBBBBBB: { title: 'Unity in Diversity || Pastor Joshua Mura', author_name: 'Wholeton SDA Church' },
  vidCCCCCCCC: { title: 'Prophecy Night 3 with Elder Sample Guest', author_name: 'Other Channel' },
  vidDDDDDDDD: { title: 'Sabbath Service 10/3', author_name: 'Wholeton SDA Church' },
};
const watchHtml = (id, date, ch, live, desc) => `<html><head><meta itemprop="datePublished" content="${date}T10:00:00-07:00"></head><body><script>var ytInitialPlayerResponse = {"videoDetails":{"videoId":"${id}","channelId":"${ch}","shortDescription":"${desc}","isLiveContent":${live}}};</script></body></html>`;
const WATCH = {
  vidAAAAAAAA: watchHtml('vidAAAAAAAA', '2023-05-06', CHID, false, 'Worship with Pastor Sample Previous'),
  vidBBBBBBBB: watchHtml('vidBBBBBBBB', '2026-09-26', CHID, true, 'Sabbath worship. 10 Greene Rd, Wholeton. 11:00 AM'),
  vidCCCCCCCC: watchHtml('vidCCCCCCCC', '2026-09-12', OTHER, false, ''),
  vidDDDDDDDD: watchHtml('vidDDDDDDDD', '2026-10-03', CHID, true, ''),
};
const entry = (t, d, v, desc) => `<entry><title>${t}</title><published>${d}T10:00:00Z</published><media:group>${desc == null ? '' : `<media:description>${desc}</media:description>`}<media:statistics views="${v}"/></media:group></entry>`;
const FEED = `<feed><title>Wholeton SDA Church</title>` + [
  entry('Worship Service || Oct 10, 2026', '2026-10-01', 0, ''),
  entry('Unity in Diversity || Pastor Joshua Mura', '2026-10-06', 67, 'Sabbath worship with Pastor Joshua Mura. Join us at 10 Greene Rd, Wholeton. Service 11:00 AM. https://www.whole.test'),
  entry('Sabbath Service 10/3', '2026-10-03', 120, null),
  entry('13 - Signs of the Second Coming', '2026-09-26', 171, 'Pastor Joshua Mura continues the series. Wholeton PA 18974'),
  entry('Prayer Meeting | Pr. Sample Guest', '2026-09-23', 40, 'Every Wednesday at 7 pm.'),
  ...Array.from({ length: 12 }, (_, i) => entry('Faith that works, part ' + (12 - i), '2026-0' + (9 - Math.floor(i / 4)) + '-' + String(20 - (i % 4) * 5).padStart(2, '0'), 50, null)),
].join('') + '</feed>';
const PLACES = {
  'Wholeton Seventh-day Adventist Church, 10 Greene Rd Wholeton PA 18974': [
    { displayName: { text: 'Wholeton Seventh-day Adventist Church' }, formattedAddress: '10 Greene Rd, Wholeton, PA 18974, USA', types: ['church', 'place_of_worship'],
      rating: 4.6, userRatingCount: 21, websiteUri: 'https://www.whole.test/', nationalPhoneNumber: '(215) 555-0199', businessStatus: 'OPERATIONAL',
      googleMapsUri: 'https://maps.google.com/?cid=777', photos: Array.from({ length: 12 }, (_, i) => ({ name: 'places/x/photos/' + i, widthPx: 1200, heightPx: 800 })) }],
  'Bare Seventh-day Adventist Church, 5 Elm St Plain PA 19000': [{ displayName: { text: 'Bare SDA Church' }, formattedAddress: '5 Elm St, Plain, PA 19000, USA', types: ['church'] }],
};
const fetched = []; const placesCalls = [];
globalThis.fetch = async (u, o = {}) => {
  u = String(u); fetched.push({ u, ua: o.headers && o.headers['user-agent'] });
  const R = (status, text = '', url = u) => ({ ok: status >= 200 && status < 300, status, url, text: async () => text });
  if (/\/\.netlify\/functions\/digital-read$/.test(u)) return R(202);
  if (/places\.googleapis\.com/.test(u)) { const b = JSON.parse(o.body); placesCalls.push({ q: b.textQuery, mask: o.headers['X-Goog-FieldMask'] }); return R(200, JSON.stringify({ places: PLACES[b.textQuery] || [] })); }
  if (/youtube\.com\/oembed\?/.test(u)) { const id = (decodeURIComponent(u).match(/v=([\w-]{11})/) || [])[1]; return OEMBED[id] ? R(200, JSON.stringify(OEMBED[id])) : R(404, 'Not Found'); }
  if (/youtube\.com\/watch\?v=/.test(u)) { const id = (u.match(/v=([\w-]{11})/) || [])[1]; return WATCH[id] ? R(200, WATCH[id]) : R(404, ''); }
  if (/youtube\.com\/@WholeSDA/.test(u)) return R(200, `<html><head><meta property="og:description" content="Wholeton Seventh-day Adventist Church: worship every Sabbath at 11:00 am. Find us at www.whole.test"></head><body>"externalId":"${CHID}" "subscriberCountText":{"simpleText":"1.13K subscribers"}</body></html>`);
  if (/youtube\.com\/@NoneSDA/.test(u)) return R(200, '<html>"externalId":"UCnone12345678901abcdefg"</html>');
  if (/feeds\/videos\.xml\?channel_id=UCwhole/.test(u)) return R(200, FEED);
  if (/feeds\/videos\.xml\?channel_id=UCnone/.test(u)) return R(200, '<feed><title>None SDA</title>' + entry('Faith that works, part 1', '2026-05-01', 10, null) + '</feed>');
  if (/facebook\.com|instagram\.com/.test(u)) return R(200, '<html>should never be read</html>');
  if (/\/robots\.txt$/.test(u)) return R(404, '<html>not found</html>');
  const key = Object.keys(SITES).find(k => k.replace(/\/$/, '') === u.replace(/\/$/, '').replace('http://', 'https://'));
  if (key && SITES[key]) return R(200, SITES[key], key);
  return R(404, '');
};
const RD = await import('../netlify/functions/digital-read.mjs');
const SW = await import('../netlify/functions/digital-sweep.mjs');
const ADDR = '10 Greene Rd Wholeton PA 18974';
let W = null;   // the whole site, read once

await sec('the whole menu, read whole', async () => {
  const f0 = fetched.length; sleeps.length = 0;
  W = await RD.website('www.whole.test', 30, 'Joshua Mura', { address: ADDR });
  const paths = W.pages.map(p => p.path);
  c('every same-site link in the header\'s nav, the main-menu div and the footer is read, plus the old list\'s pages; the dated post is not', [paths.includes('/give'), paths.includes('/newsletter'), paths.includes('/blog'), paths.includes('/contact'), paths.includes('/our-staff-1'), paths.includes('/plan-your-visit'), paths.includes('/blog/2020/x')], [true, true, true, true, true, true, false]);
  c('the Give page is read (giving found on it, through Adventist Giving)', [paths.includes('/give'), W.giving], [true, true]);
  c('at most 30 pages (the home page one of them): the 43 links are cut, pastor/staff/contact/visit/join first', [W.pages.length <= 30, paths.slice(0, 4).sort(), paths.includes('/p17'), paths.includes('/p18'), paths.includes('/events')], [true, ['/', '/contact', '/our-staff-1', '/plan-your-visit'], true, false, false]);
  c('de-duplicated: a link in the nav and the footer is read once', paths.filter(p => p === '/give').length, 1);
  c('the same 150 ms pause after each page', [sleeps.length, sleeps.every(ms => ms === 150)], [29, true]);
  c('a page over 1.5 MB is skipped (fetched, never kept)', [paths.includes('/huge'), fetched.some(x => /\/huge$/.test(x.u))], [false, true]);
  c('pagesRead lists every page read, in order, the home page first', [W.pagesRead[0], W.pagesRead.length, W.pagesRead.includes('/sermons')], ['/', 28, true]);
  c('our reader says who it is on every page', fetched.slice(f0).filter(x => /whole\.test/.test(x.u)).every(x => /TerrainBot/.test(x.ua || '')), true);
  c('what was there before is still read: title, phone-less, service times, visitors, Bible studies and prayer (the words), the pastor named with his photo',
    [W.title, W.serviceTimes, W.visitors, W.bibleStudy, W.prayerRequest, W.pastorNamed, W.pastorPhoto], ['Wholeton Seventh-Day Adventist Church', true, true, true, true, ['/our-staff-1'], 'named']);
});

await sec('per page: dates, a broken link, a stale page', async () => {
  const by = p => W.pages.find(x => x.path === p);
  c('each page: its path, status, title, h1, word count, newest and next date, forms, videos, pictures', Object.keys(by('/about')).sort(), ['forms', 'h1', 'imgs', 'newest', 'next', 'path', 'status', 'title', 'videos', 'words']);
  c('the about page: founded 2001 (its newest date past), an anniversary ahead', [by('/about').title, by('/about').h1, by('/about').newest, by('/about').next, by('/about').words > 5], ['About', 'About us', '2001-03-03', '2026-11-07', true]);
  c('the home page: nothing dated past, the harvest dinner ahead, status 200', [by('/').status, by('/').newest, by('/').next, by('/').h1], [200, null, '2026-10-24', 'Welcome home']);
  c('a menu link that fails keeps its status (a broken link), and nothing else', by('/old-page'), { path: '/old-page', status: 404 });
  c('stale pages: the newsletter\'s "July 2, 2023" and a blog last posted in 2024, each over a year old with nothing ahead; the about page (2001, an anniversary ahead) is not', W.stale, [{ path: '/newsletter', date: '2023-07-02' }, { path: '/blog', date: '2024-09-01' }]);
});

await sec('embedded videos', async () => {
  c('videosIn: an iframe, an escaped-JSON embed, youtu.be, watch?v=, a nocookie embed, Vimeo; never a playlist\'s "videoseries"; each once',
    RD.videosIn(SITES['https://www.whole.test/sermons'] + SITES['https://www.whole.test/']).map(v => v.on + ':' + v.id),
    ['youtube:vidBBBBBBBB', 'youtube:vidCCCCCCCC', 'youtube:vidDDDDDDDD', 'vimeo:123456789', 'youtube:vidFFFFFFFF', 'youtube:vidGGGGGGGG', 'youtube:vidAAAAAAAA']);
  // integration (v10.62.0): `kind` is the provider; `on` is the page the video sits on (the page judges a video on the home, about, pastor or
  // staff pages: DF_MAIN), as the design's `on` meant
  c('the site keeps six, the home page\'s first; each with its title and channel from oEmbed, its date and live stream from the watch page',
    W.videos.map(v => [v.id, v.kind, v.title, v.by, v.date, v.live]),
    [['vidAAAAAAAA', 'youtube', 'Worship Service || Pastor Sample Previous', 'Wholeton SDA Church', '2023-05-06', false],
     ['vidBBBBBBBB', 'youtube', 'Unity in Diversity || Pastor Joshua Mura', 'Wholeton SDA Church', '2026-09-26', true],
     ['vidCCCCCCCC', 'youtube', 'Prophecy Night 3 with Elder Sample Guest', 'Other Channel', '2026-09-12', false],
     ['vidDDDDDDDD', 'youtube', 'Sabbath Service 10/3', 'Wholeton SDA Church', '2026-10-03', true],
     ['123456789', 'vimeo', null, null, null, false],
     ['vidFFFFFFFF', 'youtube', null, null, null, false]]);
  c('a person\'s name in a title or description: Pastor X, Elder X, "with X" (the name reader\'s own rules), never a service word', W.videos.map(v => v.names), [['Sample Previous'], ['Joshua Mura'], ['Sample Guest'], [], [], []]);
  c('the latest sermon on the site: the newest embedded video\'s date', W.latestVideo, '2026-10-03');
  c('each video says the page it sits on (the home page\'s first, then the sermons page\'s)', W.videos.map(v => v.on), ['/', '/sermons', '/sermons', '/sermons', '/sermons', '/sermons']);
  c('what to expect on a first visit (parking, children, how long, what to wear) is read as its own field', [typeof W.expect, W.expect], ['boolean', /what to expect|parking|nursery|dress code|how long (is|does|will)/i.test(Object.values(SITES).filter(x => typeof x === 'string').join(' '))]);
  c('per page: the home page one video, the sermons page six', [W.pages.find(p => p.path === '/').videos, W.pages.find(p => p.path === '/sermons').videos], [1, 6]);
  c('oEmbed and the watch page are fetched as TerrainBot (never a key); a video oEmbed cannot name gets no watch page: at most 12 fetches a church',
    [fetched.filter(x => /oembed/.test(x.u)).length, fetched.filter(x => /youtube\.com\/watch\?v=/.test(x.u)).length, fetched.filter(x => /oembed|watch\?v=/.test(x.u)).every(x => /TerrainBot/.test(x.ua || ''))], [5, 4, true]);
  c('read on its own, a video is not yet known as the church\'s own (readChurch says, below)', W.videos.every(v => v.mine === false), true);
});

await sec('forms, by kind', async () => {
  c('formsIn: a prayer form (the words around it), a Bible-study form, a contact form (its fields), a newsletter sign-up; a search box is no form',
    [RD.formsIn(SITES['https://www.whole.test/prayer']), RD.formsIn(SITES['https://www.whole.test/bible-studies']), RD.formsIn(SITES['https://www.whole.test/contact']), RD.formsIn(SITES['https://www.whole.test/'])],
    [{ n: 1, prayer: true, bible: false, contact: false, news: false }, { n: 1, prayer: false, bible: true, contact: false, news: false }, { n: 1, prayer: false, bible: false, contact: true, news: false }, { n: 1, prayer: false, bible: false, contact: false, news: true }]);
  c('an embedded Google Form counts as a form (its kind from the words around it)', RD.formsIn(SITES['https://www.whole.test/plan-your-visit']).n, 1);
  c('the site: five forms, one of each kind', W.forms, { n: 5, prayer: true, bible: true, contact: true, news: true });
  c('bibleStudy and prayerRequest stay "the words"; forms.bible / forms.prayer say one can ask on the site', [W.bibleStudy, W.prayerRequest, W.forms.bible, W.forms.prayer], [true, true, true, true]);
});

await sec('pictures', async () => {
  const p = RD.picsIn(SITES['https://www.whole.test/'], 'https://www.whole.test/');
  c('picsIn on the home page: the logo left out; unnamed = no alt or a file name (gallery1.jpg, IMG_2231, the ChatGPT file name); generated = ChatGPT in its name', [p.n, p.unnamed, p.generated], [4, 3, 1]);
  c('over the site: the pastor\'s photo and the potluck (once, though on two pages) named; a stock-named file counts as generated', W.pics, { n: 6, unnamed: 3, generated: 2 });
  c('per page', W.pages.find(x => x.path === '/our-staff-1').imgs, { n: 1, unnamed: 0, generated: 0 });
});

await sec('the home page for the review', async () => {
  c('its h1, the first words after the menu (never the nav\'s links), the first link or button texts, the main pictures with their alt (absolute addresses, no logo)',
    [W.home.h1, W.home.first.slice(0, 45), /about give newsletter/.test(W.home.first), W.home.first.length <= 700, W.home.ctas.slice(0, 3), W.home.ctas.length <= 8, W.home.pics],
    ['Welcome home', 'Welcome home Join us this Sabbath. Sabbath Sc', false, true, ['Plan your visit', 'Watch live', 'Give online'], true,
     [{ url: 'https://www.whole.test/uploads/ChatGPT-Image-Jun-11-2026.png', alt: 'ChatGPT Image Jun 11, 2026, 10_22_01 AM' }, { url: 'https://www.whole.test/uploads/gallery1.jpg', alt: 'gallery1.jpg' }, { url: 'https://www.whole.test/uploads/IMG_2231.jpg', alt: '' }, { url: 'https://www.whole.test/uploads/potluck.jpg', alt: 'Our members at the potluck' }]]);
  c('a phone number or an email address printed on the page is never kept in its words (a person\'s own may be there): a token instead', [/\[phone\]/.test(W.home.first), /\[email\]/.test(W.home.first), /215-555-0123|pastor\.jm/.test(W.home.first)], [true, true, false]);
});

await sec('the words', async () => {
  c('the name as written ("Seventh-Day") on the home page, "All Rights Served", "recieve", "Sabath": each once, with the page; "which", "sandwich" and "Seventh-day Adventist" never',
    W.words.map(w => w.t + ' @ ' + w.on).sort(), ['All Rights Served @ /', 'Sabath @ /prayer', 'Seventh-Day Adventist @ /', 'recieve @ /contact']);
  c('wordsIn: only the list, never a spell-checker; "Seventh Day Adventist" (no hyphen) is the other spelling caught; at most 6',
    [RD.wordsIn([{ path: '/', title: 'X Seventh Day Adventist Church', t: 'definately seperate calender wich untill adress comittee begining' }]).length,
     RD.wordsIn([{ path: '/', title: 'Seventh-day Adventist Church', t: 'Which sandwich we receive separately. Chruch' }])],
    [6, [{ t: 'Chruch', on: '/' }]]);
});

await sec('email, address and map', async () => {
  c('the email\'s host and whether it is a personal mailbox (gmail): never the address', [W.email, JSON.stringify(W).includes('wholeton.office'), JSON.stringify(W).includes('@gmail')], [{ host: 'gmail.com', generic: true }, false, false]);
  c('the listed street (number and first word) found on the contact page; a Google Maps link in the footer', [W.address, W.map], [true, true]);
  const P = await RD.website('plain.test', 30, '', { address: '5 Elm St Plain PA 19000' });
  c('a plain site: the church\'s own domain is not generic; its street not on the site; no map; nothing else found', [P.email, P.address, P.map, P.videos, P.stale, P.forms, P.pics, P.words, P.latestVideo, P.pages.length], [{ host: 'plainsda.org', generic: false }, false, false, [], [], { n: 0, prayer: false, bible: false, contact: false, news: false }, { n: 0, unnamed: 0, generated: 0 }, [], null, 1]);
  const B = await RD.website('bare.test', 30, '');
  c('a bare site: no email, no listed address given (null), no map, an empty home for the review', [B.email, B.address, B.map, B.home], [null, null, false, { h1: null, first: 'Hello', ctas: [], pics: [] }]);
});

await sec('the texts for the review: a key only, clipped, never in the findings', async () => {
  const e = { org: 'ANBIW1', name: 'Wholeton SDA Church', address: ADDR, zip: '18974', town: 'Wholeton', state: 'PA', website: 'www.whole.test', pastor: 'Joshua Mura', members: 120 };
  delete process.env.ANTHROPIC_API_KEY; delete process.env.GOOGLE_PLACES_KEY; delete process.env.BRAVE_SEARCH_KEY;
  let r = await RD.readChurch(e, S, 'pennsylvania');
  c('no key on the server: no texts written', S.keys('x/'), []);
  c('the reading itself never carries the pages\' text (the review\'s texts are kept apart)', [JSON.stringify(r).includes('"texts"'), JSON.stringify(r).includes('word word word'), Object.keys(r.site).includes('texts')], [false, false, false]);
  c('…but the videos are now known as the church\'s own: by the channel id in its feed, else by the channel\'s name; another channel\'s is not', r.site.videos.map(v => v.mine), [true, true, false, true, false, false]);
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-not-real';
  r = await RD.readChurch(e, S, 'pennsylvania');
  const x = S.peek('x/pennsylvania/ANBIW1');
  c('with a key: x/<slug>/<org> = {at, pages:[{path, title, text}]}, the home page first, up to 14 pages, each text clipped to 2,500, 22,000 in all',
    [x && x.at, x && x.pages.length, x && x.pages[0].path, x && x.pages[0].title, x && x.pages.every(p => p.text.length <= 2500 && typeof p.title === 'string'), x && x.pages.find(p => p.path === '/p1').text.length, x && x.pages.reduce((a, p) => a + p.text.length, 0) <= 22000],
    [T, 14, '/', 'Wholeton Seventh-Day Adventist Church', true, 2500, true]);
  c('…still never in the reading', [JSON.stringify(r).includes('"texts"'), JSON.stringify(r).includes('word word word')], [false, false]);
  c('…and the texts carry no email address or phone number either', [/\[phone\]/.test(x.pages[0].text), /\[email\]/.test(x.pages[0].text), /215-555-0123|pastor\.jm|@gmail/.test(JSON.stringify(x))], [true, true, false]);
  S.m.delete('x/pennsylvania/ANBIW1'); await RD.readChurch(e, S);
  c('no slug (a reading outside a job): nothing written', S.keys('x/'), []);
  delete process.env.ANTHROPIC_API_KEY;
});

await sec('the sweep forgets the texts with the findings', async () => {
  S.poke('o/ohio', { at: '2026-01-01' }); S.poke('c/ohio', { at: 1 }); S.poke('r/ohio/ANBF99', {}); S.poke('x/ohio/ANBF99', { at: 1, pages: [] });
  S.poke('o/pennsylvania', { at: '2026-10-08' }); S.poke('c/pennsylvania', { at: T }); S.poke('x/pennsylvania/ANBIW1', { at: T, pages: [] });
  const sw = await SW.sweep('https://terrain.church');
  c('a conference unopened for 180 days: its findings, readings and texts gone; an opened one keeps its texts', [sw.forgotten, S.keys('x/ohio/'), S.keys('x/pennsylvania/')], [1, [], ['x/pennsylvania/ANBIW1']]);
});

await sec('YouTube: subscribers, About, descriptions, upcoming, names, weak titles', async () => {
  const y = await RD.youtube('https://www.youtube.com/@WholeSDA', { siteHost: 'whole.test', address: ADDR, zip: '18974' });
  c('what was read before, unchanged', [y.read, y.id, y.inFeed, y.latest.d, y.kinds.series, y.titles.length], [true, CHID, 17, '2026-10-01', 1, 3]);
  c('subscribers from the channel page ("1.13K subscribers" → 1130); its About (og:description, clipped to 300); it names the church\'s site; the channel\'s name',
    [y.subscribers, y.about, y.aboutSite, y.name], [1130, 'Wholeton Seventh-day Adventist Church: worship every Sabbath at 11:00 am. Find us at www.whole.test', true, 'Wholeton SDA Church']);
  c('descriptions: three videos have one; one gives a web address, two the street or ZIP, two a time of day', y.desc, { n: 3, link: 1, address: 2, times: 2 });
  c('upcoming: a video titled with a date ahead ("Oct 10, 2026") and 0 views', y.upcoming, true);
  c('names in titles and descriptions, with counts, up to 5', y.names, [{ name: 'Joshua Mura', n: 2 }, { name: 'Sample Guest', n: 1 }]);
  c('weak titles: "Worship Service || Oct 10, 2026" and "Sabbath Service 10/3"; "13 - Signs of the Second Coming" and "Faith that works, part 3" are not', y.weak, 2);
  c('recent keeps 15 {t,d,v} for the review', [y.recent.length, y.recent[0], y.recent.every(v => Object.keys(v).sort().join() === 'd,t,v')], [15, { t: 'Worship Service || Oct 10, 2026', d: '2026-10-01', v: 0 }, true]);
  c('weakTitle: a service word and a date, in English or Spanish; a topic is never weak', ['Worship Service || Oct 10, 2026', 'Sabbath Service 10/3', 'Culto Divino 10/10/2026', 'Divine Hour 11:00 AM', 'Grace that keeps us || Oct 10, 2026', 'Sabbath Worship — Hope for the anxious'].map(RD.weakTitle), [true, true, true, true, false, false]);
  const n = await RD.youtube('https://www.youtube.com/@NoneSDA');
  c('a channel with none of it: subscribers and About null, aboutSite null without a site, no descriptions, nothing upcoming, no names, no weak titles', [n.subscribers, n.about, n.aboutSite, n.desc, n.upcoming, n.names, n.weak, n.recent.length], [null, null, null, { n: 0, link: 0, address: 0, times: 0 }, false, [], 0, 1]);
});

await sec('Google: photos in the field mask', async () => {
  process.env.GOOGLE_PLACES_KEY = 'places-test-key';
  const g = await RD.google({ name: 'Wholeton SDA Church', address: ADDR, zip: '18974' }, S);
  // Google's pricing page, read 8 Oct 2026: places.photos is the Pro tier, inside the Enterprise call Text Search already makes, no new charge;
  // reviews would need Enterprise + Atmosphere ($40 per 1,000 after the free 1,000) and carry no owner reply, so they stay out.
  c('the mask asks for places.photos (Pro, within the Enterprise call already made) and still never for reviews', [/places\.photos/.test(placesCalls[0].mask), /\breviews\b/.test(placesCalls[0].mask), /places\.rating/.test(placesCalls[0].mask)], [true, false, true]);
  c('photos: a count, at most 10 (Google gives up to 10 a place); the rest as before', [g.photos, g.found, g.rating, g.reviews, g.website], [10, true, 4.6, 21, 'https://www.whole.test/']);
  const b = await RD.google({ name: 'Bare SDA Church', address: '5 Elm St Plain PA 19000', zip: '19000' }, S);
  c('a listing with no photos: 0', b.photos, 0);
  c('no key or API value in the findings', JSON.stringify(g).includes('places-test-key'), false);
  delete process.env.GOOGLE_PLACES_KEY;
});

await sec('the reader\'s version', async () => {
  c('digital-read-1.2; a reading by 1.1 or 1.0 is judged as before on the page ("pages" in site)', [RD.FN, 'pages' in W], ['digital-read-1.2', true]);
  c('Facebook and Instagram are never read', fetched.some(x => /facebook\.com|instagram\.com/.test(x.u)), false);
});

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
