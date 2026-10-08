// v10.61.0 · digital-read-1.1: how current a website is (the dates a visitor sees: the newest already past, the next ahead; never a
// sitemap's stamp, which website builders set on their own), a photo by the pastor's name, how fast the site answers, and what it offers
// (events, sermons, a description for search results). The pastor (7 Oct 2026): "it doesn't even have my picture on there it's hasn't been
// updated in a long time … is it showing my picture?". A stubbed fetch, made-up sites; no network. Written failing-first on v10.60.1.
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 500)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
globalThis.__terrainDigitalNow = () => Date.parse('2026-10-08T12:00:00Z'); globalThis.__terrainDigitalSleep = async () => {};
const SITES = {
  'https://www.mine.test/': `<html><head><title>Mineville Seventh-day Adventist Church</title><meta name="viewport" content="width=device-width"><meta name="description" content="A Seventh-day Adventist church in Mineville: Sabbath School 9:30, worship 11:00."></head><body>
    <header><img src="/logo.png" alt="Mineville SDA logo"></header><a href="/our-staff">Staff</a><a href="/events">Events</a><a href="/sermons">Sermons</a>
    Worship 11:00 am. Fall Festival Oct 18, 2026. Last month: Sept 27th, 2026 baptism. <footer>© 2026</footer></body></html>`,
  'https://www.mine.test/our-staff': `<html><body><div class="card"><img src="/uploads/IMG_2231.jpg"><h3>Pastor Josh Mura</h3><p>Lead pastor</p></div>
    <div class="card"><h3>Elder Ann Lee</h3></div></body></html>`,
  'https://www.mine.test/events': '<html><body>Upcoming events: 10/25/2026 community dinner</body></html>',
  'https://www.mine.test/sermons': '<html><body>Sermons</body></html>',
  'https://old.test/': `<html><head><title>Oldtown Seventh-day Adventist Church</title></head><body><a href="/about">About Us</a> Worship 11 am. Christmas program December 20, 2023. © 2021</body></html>`,
  'https://old.test/about': `<html><body><header><img src="/banner-church.jpg"></header><h2>About Us</h2><p>Pastor John LaCamera has served since 2019.</p></body></html>`,
  'https://named.test/': `<html><head><title>Namedton Seventh-day Adventist Church</title></head><body><a href="/pastor">Pastor</a></body></html>`,
  'https://named.test/pastor': `<html><body><img alt="Pastor Dee Fox with her family" src="/a/b/c.jpg"><p>Dee Fox, Pastor</p></body></html>`,
};
globalThis.fetch = async (u, o = {}) => {
  u = String(u); const R = (status, text = '', url = u) => ({ ok: status >= 200 && status < 300, status, url, text: async () => text });
  if (/\/robots\.txt$/.test(u)) return R(404, '');
  const key = Object.keys(SITES).find(k => k.replace(/\/$/, '') === u.replace(/\/$/, '').replace('http://', 'https://'));
  if (key) return R(200, SITES[key], key);
  return R(404, '');
};
const RD = await import('../netlify/functions/digital-read.mjs');
try {
  console.log('\n-- the dates a visitor sees --');
  c('the formats churches write: "Oct 18, 2026", "Sept 27th, 2026", "20 March 2024", "10/25/2026", "12 de octubre de 2025"',
    RD.datesIn('Oct 18, 2026 · Sept 27th, 2026 · 20 March 2024 · 10/25/2026 · 12 de octubre de 2025 · not 13/45/2026'), ['2026-10-18', '2026-09-27', '2024-03-20', '2026-10-25', '2025-10-12']);
  c('the newest already past, the next ahead, how many ahead (within a year)', RD.datesOf('Sept 27, 2026 · Oct 18, 2026 · Dec 25, 2026 · Jan 1, 2029'), { past: '2026-09-27', next: '2026-10-18', ahead: 2 });
  c('no dates: nothing', RD.datesOf('Worship 11 am'), { past: null, next: null, ahead: 0 });

  console.log('\n-- a photo by the pastor\'s name --');
  const re = /\bMura\b/i;
  c('an image named for him (its file or its alt words)', [RD.photoBy('<img src="/x/pastor-josh-mura.jpg">', re), RD.photoBy('<img alt="Pastor Joshua Mura" src="/a.jpg">', re)], ['named', 'named']);
  c('an image in the same card as his name', RD.photoBy('<div><img src="/uploads/IMG_1.jpg"><h3>Josh Mura</h3></div>', re), 'near');
  c('a logo, a banner or an icon never counts', [RD.photoBy('<header><img src="/logo.png"></header><h3>Josh Mura</h3>', re), RD.photoBy('<img src="/banner.jpg"><p>Josh Mura</p>', re)], [null, null]);
  c('a template\'s image inside its scripts counts', RD.photoBy('<script>self.__next_f.push([1,"\\u003cimg src=\\"/p/mura.webp\\"\\u003e"])</script><p>Josh Mura</p>', re), 'named');
  c('his name alone: no photo', RD.photoBy('<h3>Pastor Josh Mura</h3>', re), null);

  console.log('\n-- a site read --');
  let w = await RD.website('www.mine.test', 13, 'Joshua Mura');
  c('the newest date already past, and the next ahead (an event page counts)', [w.pastDate, w.nextDate, w.ahead], ['2026-09-27', '2026-10-18', 2]);
  c('his photo by his name on the staff page; for each pastor named, the page it is on', [w.pastorPhoto, w.pastorPhotoOn, (w.pastors || []).filter(p => p.photo).map(p => [p.name, p.photo, p.photoOn])], ['near', '/our-staff', [['Josh Mura', 'near', '/our-staff']]]);
  c('events, sermons, a description for search results; how long its first page took', [w.events, w.sermons, w.description, typeof w.ms === 'number' && w.ms >= 0], [true, true, true, true]);
  c('no sitemap date is read or kept (website builders stamp it on their own)', 'sitemapDate' in w, false);
  w = await RD.website('old.test', 13, 'John LaCamera');
  c('an old site: its newest date long past, nothing ahead, no description, no events', [w.pastDate, w.nextDate, w.description, w.events], ['2023-12-20', null, false, false]);
  c('a name with a capital inside (LaCamera) is read whole, and "About Us" is no name', (w.pastors || []).map(p => p.name), ['John LaCamera']);
  c('…the banner on his page is not his photo', [w.pastorPhoto, (w.pastors || [])[0] && (w.pastors || [])[0].photo || null], [null, null]);
  w = await RD.website('named.test', 13, 'Dee Fox');
  c('a photo whose words name her (alt): "named"', w.pastorPhoto, 'named');
  // v10.62.0: digital-read-1.2 (the whole site read; the pastor, 8 Oct 2026: "survey the whole website and see its deficiencies as well")
  c('digital-read-1.2 (was 1.1)', RD.FN, 'digital-read-1.2');
} catch (e) { console.log('  FAIL  crashed: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
