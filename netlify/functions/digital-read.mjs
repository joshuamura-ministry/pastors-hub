// Terrain · Digital footprint, the reader (background).                    digital-read-1.2
//
// v10.60.0 (DESIGN-DIGITAL.md, Terrain-work/v77). The pastor (7 Oct 2026): "I would like to see all the churches in the conference
// that you choose … websites, Facebook pages … YouTube … checked to see if they're up-to-date … Where do we show up in Google search
// in maps and ratings"; "this should know the name already of the pastor and it will search whether the pastor's name is actually even
// there"; "make sure we're not missing something so we don't accuse them of something that's not really happening"; "the website is
// huge, Google search and maps are very very important more than Facebook … a little information on Facebook Instagram without
// breaching anything".
//
// v10.62.0 (digital-read-1.2, DESIGN-DIGITAL-2.md, Terrain-work/v79): the reader reads the whole site. The pastor (8 Oct 2026): "on the
// website you say that it looks it's current but what about its content because on the website you see another pastor preaching and not
// myself it's a previous pastor. Are you able to survey the whole website and see its deficiencies as well because this is not enough and
// when it says like current, it doesn't really mean that it's a good website doesn't mean that it's doing its work as a website. A lot of
// websites are up, but they're horrible."; "I want to set the bar high when it comes to our digital footprint." So `website()` follows the
// whole menu (every same-site link in the header, navigation and footer, plus the pages the old list matched; up to 30 pages, the Give page
// among them) and says, per page, its dates, forms, pictures and videos (site.pages[]); the embedded videos with their title, channel, date
// and live stream (oEmbed and the watch page, no key; a person's name in a title; up to six: site.videos[], site.latestVideo); the pages a
// year out of date that announce nothing ahead (site.stale[]); the forms by kind (site.forms: prayer, Bible studies, contact, newsletter);
// the pictures (site.pics: unnamed, generated); the home page for the review (site.home); the name as written and a short list of common
// misspellings (site.words[]: only that list, never a spell-checker); the email's host, never the address (site.email); the listed street on
// the site and a map (site.address, site.map). `youtube()` adds the subscribers, the About text, whether it names the site, what the
// descriptions carry (a link, the address, the times), an upcoming stream, the names in titles, the weak titles ("Worship Service || Oct 10,
// 2026"), and 15 recent videos for the review. `google()` asks for places.photos (Pro tier: inside the Enterprise call already made, no new
// charge; Google's pricing page read 8 Oct 2026; reviews would cost more and carry no owner reply, so they stay out). The pages' texts for
// the in-depth review are kept apart (store key x/<slug>/<org>, written only when the server has ANTHROPIC_API_KEY, swept with the
// findings), never inside a reading or the findings.
//
// What it reads, for one conference (digital.mjs queues the job in Netlify Blobs, store "terrain-digital", key j/<slug>, and wakes this
// function with { slug, worker }):
//  1. the official list: every church, company and group of the conference on eAdventist (the North American Division's church
//     locator) and each one's entry (pastor, staff, website, phone, address, members, the date it was updated). The locator allows a
//     page every few seconds: one page each 3 s, a pause when it says "retry later";
//  2. each church's website as a visitor reads it (the home page and, since v10.62.0, up to 29 more: its whole menu and the pages a
//     visitor looks at, and the words a template site keeps inside its scripts), obeying robots.txt, under its own name (TerrainBot);
//  3. its YouTube channel's public feed (the last 15 videos: dates, titles, views), no key;
//  4. Google's listing for it (Places API (New), Text Search) when GOOGLE_PLACES_KEY is set: found or not, stars, reviews, status,
//     the website and phone Google shows, the Maps link; at most PLACES_MONTH_MAX (900) a month for the whole site;
//  5. when BRAVE_SEARCH_KEY is set, one search for the church's name (the double check: a site, a Facebook page or a YouTube channel the
//     listing does not give; where its own site comes; directories that still name an earlier pastor); at most SEARCH_MONTH_MAX (900).
// Facebook and Instagram are never read: only a link the church's site gives or a search result shows, and the followers that result's
// own line states.
//
// SAFE BY CONSTRUCTION
// - Runs a job only with its own worker token (sha-256 kept), only while 'running'; claims a lease with a conditional write; never
//   throws (Netlify retries a background function that throws). Under 13 minutes an invocation: it saves where it is and wakes itself.
// - Every page is data, never instructions; nothing is executed; only text is kept: names, dates, counts, links (https or http), never a
//   page's text. Personal emails are never kept. The log line carries counts only.
//
// Environment (all optional): GOOGLE_PLACES_KEY, BRAVE_SEARCH_KEY, PLACES_MONTH_MAX (900), SEARCH_MONTH_MAX (900).

import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';

export const config = { background: true };

export const FN = 'digital-read-1.2';
const STORE_NAME = 'terrain-digital';
export const UA = 'Mozilla/5.0 (compatible; TerrainBot/1.0; +https://terrain.church)';
const EAD = 'https://www.eadventist.net/search/organization?locale=en&org=';
export const BUDGET_MS = 12.5 * 60e3;
const RE_SLUG = /^[a-z][a-z-]{1,40}$/, RE_TOKEN = /^[A-Za-z0-9_-]{43}$/, RE_ORG = /^AN[A-Z0-9]{4}$/;
const EAD_GAP = 3000, EAD_WAIT = 30000;

/* the church locator's code of each NAD conference, by the name Terrain registers pastors under (eAdventist, read 7 Oct 2026; Guam-Micronesia
   Mission, attached to the NAD itself, read 7 Oct 2026 for v10.60.1): all 51 that Terrain registers */
export const CONF_ORG = {
  'Greater New York': 'AN4811', 'New York': 'AN4B11', 'Northeastern': 'AN4F11', 'Northern New England': 'AN4I11', 'Southern New England': 'AN4M11',
  'Allegheny East': 'ANB411', 'Allegheny West': 'ANB611', 'Chesapeake': 'ANB811', 'Mountain View': 'ANB911', 'New Jersey': 'ANBB11',
  'Ohio': 'ANBF11', 'Pennsylvania': 'ANBI11', 'Potomac': 'ANBM11', 'Illinois': 'ANF411', 'Indiana': 'ANF811', 'Lake Region': 'ANFB11',
  'Michigan': 'ANFF11', 'Wisconsin': 'ANFI11', 'Central States': 'ANG411', 'Dakota': 'ANG611', 'Iowa-Missouri': 'ANGB11',
  'Kansas-Nebraska': 'ANGF11', 'Minnesota': 'ANGI11', 'Rocky Mountain': 'ANGM11', 'Alaska': 'ANI411', 'Idaho': 'ANI811', 'Montana': 'ANIB11',
  'Oregon': 'ANIF11', 'Upper Columbia': 'ANII11', 'Washington': 'ANIM11', 'Arizona': 'ANP411', 'Central California': 'ANP811',
  'Hawaii': 'ANPB11', 'Nevada-Utah': 'ANPF11', 'Northern California': 'ANPI11', 'Southeastern California': 'ANPM11',
  'Southern California': 'ANPP11', 'Carolina': 'ANT811', 'Florida': 'ANTB11', 'Georgia-Cumberland': 'ANTF11', 'Gulf States': 'ANTG11',
  'Kentucky-Tennessee': 'ANTI11', 'South Atlantic': 'ANTM11', 'South Central': 'ANTP11', 'Southeastern': 'ANTT11',
  'Arkansas-Louisiana': 'ANW411', 'Oklahoma': 'ANW811', 'Southwest Region': 'ANWB11', 'Texas': 'ANWF11', 'Texico': 'ANWI11',
  'Guam-Micronesia Mission': 'ANNG11' };
export const slugOf = name => String(name || '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

// ---------------------------------------------------------------- helpers
export function theStore() {
  if (globalThis.__terrainDigitalStore) return globalThis.__terrainDigitalStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
export const sha = s => createHash('sha256').update(String(s), 'utf8').digest('hex');
function sameHash(given, storedHex) {
  if (typeof given !== 'string' || typeof storedHex !== 'string' || !/^[0-9a-f]{64}$/.test(storedHex)) return false;
  return timingSafeEqual(Buffer.from(sha(given), 'hex'), Buffer.from(storedHex, 'hex'));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => (globalThis.__terrainDigitalNow ? globalThis.__terrainDigitalNow() : Date.now());
const pause = ms => (globalThis.__terrainDigitalSleep ? globalThis.__terrainDigitalSleep(ms) : sleep(ms));
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const today = () => new Date(now()).toISOString().slice(0, 10);
const month = () => new Date(now()).toISOString().slice(0, 7);
const daysAgo = d => new Date(now() - d * 864e5).toISOString().slice(0, 10);
function logLine(o) { try { console.log(JSON.stringify({ fn: FN, ...o })); } catch { /* never */ } }
export const ent = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;|&rsquo;|&#8217;/g, "'")
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8211;|&ndash;/g, '–').replace(/&middot;/g, '·')
  .replace(/&#(\d+);/g, (m, n) => { const c = +n; return c > 31 && c < 0x10000 ? String.fromCharCode(c) : ' '; });
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
export const hostOf = u => { try { return new URL(u).host.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
function safeUrl(u, base) {
  try { const x = new URL(ent(String(u)).trim(), base); return /^https?:$/.test(x.protocol) && !x.username && !x.password ? x.href : null; } catch { return null; }
}
async function get(url, o = {}) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': o.ua || UA, 'accept-language': 'en-US,en;q=0.9', ...(o.headers || {}) }, method: o.method || 'GET',
      body: o.body, redirect: 'follow', signal: AbortSignal.timeout(o.ms || 20000) });
    const text = o.noBody ? '' : (await r.text()).slice(0, o.max || 3e6);
    return { ok: r.ok, status: r.status, url: r.url || url, text };
  } catch (e) { return { ok: false, status: 0, url, text: '', err: String((e && e.cause && e.cause.code) || (e && e.name) || 'error') }; }
}

// ---------------------------------------------------------------- the official list (eAdventist)
const LAB = ['aka', 'Previously', 'Address', 'Mail', 'Map', 'Website', 'Phone', 'Email', 'Pastor', 'Staff', 'Services', 'Language', 'Comments',
  'Members', 'Type', 'OrgCode', 'Parent', 'Updated', 'Request changes'];
const SUF = 'St|Street|Rd|Road|Ave|Avenue|Pike|Blvd|Boulevard|Ln|Lane|Dr|Drive|Hwy|Highway|Way|Ct|Court|Pl|Place|Pkwy|Parkway|Cir|Circle|Ter|Terrace|Trl|Trail|Tpke|Turnpike|Sq|Square|Row|Run|Hl|Hill|Xing';
export function listOrgs(html, parent) {
  return [...String(html).matchAll(/org=(AN[A-Z0-9]{4})[^"]*"[^>]*>([^<]+)<\/a>/g)].map(m => ({ org: m[1], name: clip(ent(m[2]), 120) }))
    .filter(o => o.org !== parent && !/^AN.111$/.test(o.org));
}
export function parseEntry(html, org) {
  const t = ent(String(html).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const i = t.lastIndexOf('login'), body = t.slice(i > 0 ? i : 0), f = {};
  for (const k of LAB) {
    const m = body.match(new RegExp('\\b' + k + '\\s*:\\s*(.*?)\\s*(?=(?:' + LAB.join('|') + ')\\s*:|Request changes|What.s nearby|$)'));
    if (m) f[k] = m[1].trim();
  }
  if (!f.Parent) return null;
  const addr = f.Address ? clip(f.Address.replace(/\s*Google Maps\s*$/, ''), 160) : null;
  const z = addr && addr.match(new RegExp('\\b(?:(?:' + SUF + ')|(?:Route|Rte|Sr|Hwy)\\s+\\d+(?:\\s+(?:N|S|E|W|North|South|East|West))?)\\.?\\s+(?:(?:Apt|Ste|Suite|Unit)\\s*\\S+\\s+)?([A-Z][A-Za-z .\'-]+?)\\s+([A-Z]{2})\\s+(\\d{5})'));
  const web = f.Website ? clip(f.Website, 200).replace(/\s.*$/, '') : null;
  return { org, aka: f.aka ? clip(f.aka, 120) : null, address: addr, town: z ? z[1].trim() : null, state: z ? z[2] : null, zip: z ? z[3] : null,
    website: web && /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(web.replace(/^https?:\/\//i, '')) ? web : null,
    phone: f.Phone ? clip(f.Phone, 60) : null, pastor: f.Pastor ? clip(f.Pastor.replace(/\s*Staff\s*:.*$/, ''), 80) : null,
    staff: f.Staff ? clip(f.Staff, 200) : null, language: f.Language ? clip(f.Language, 60) : null,
    members: f.Members ? +f.Members.replace(/\D/g, '') || null : null, type: f.Type ? clip(f.Type, 30) : null,
    parent: clip(f.Parent, 80), updated: f.Updated ? clip(f.Updated.replace(/\s*m\/d\/yyyy.*/, ''), 12) : null };
}

// ---------------------------------------------------------------- a church's website, as a visitor reads it
function visOf(h) { return ent(h.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); }
/* the visible words, and the words a template site keeps inside its scripts (Lansdale's service times are only there) */
export function textOf(h) {
  const scripts = [...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => /\\u003c|self\.__next_f|__NEXT_DATA__/.test(s))
    .map(s => s.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&').replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\\\/g, '\\'))
    .map(s => s.replace(/<[^>]+>/g, ' ').replace(/"\]?,?\[?"\$"?,?"[a-z]+"|\{"className":"[^"]*"\}|"children":|null,|\$L\w+/g, ' '));
  return (visOf(h) + ' \n ' + ent(scripts.join(' \n '))).replace(/\s+/g, ' ').trim();
}
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/* v10.61.0: the dates a site's words carry ("Oct 12, 2025", "12 October 2025", "10/12/2025", "12 de octubre de 2025") */
const MES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export function datesIn(t) {
  const out = [], M = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?';
  for (const m of t.matchAll(new RegExp(`\\b${M}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)\\b`, 'gi'))) out.push(iso(m[3], MON[m[1].toLowerCase().slice(0, 3)], m[2]));
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${M},?\\s+(20\\d\\d)\\b`, 'gi'))) out.push(iso(m[3], MON[m[2].toLowerCase().slice(0, 3)], m[1]));
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/g)) out.push(iso(m[3], m[1], m[2]));
  for (const m of t.matchAll(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de)?\s+(20\d\d)\b/gi)) out.push(iso(m[3], MES[m[2].toLowerCase()], m[1]));
  return out.filter(d => /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d));
}
function newestDate(t) { const lim = daysAgo(-366); return datesIn(t).filter(d => d <= lim).sort().pop() || null; }
/* the newest date already past, and what is still ahead (within a year: events, a series) */
export function datesOf(t) {
  const today = daysAgo(0), lim = daysAgo(-366), all = [...new Set(datesIn(t))].sort();
  const past = all.filter(d => d <= today), ahead = all.filter(d => d > today && d <= lim);
  return { past: past.pop() || null, next: ahead[0] || null, ahead: ahead.length };
}
const surname = n => { const w = String(n || '').replace(/\b(Jr|Sr|II|III|IV)\.?$/i, '').replace(/[.,]/g, ' ').trim().split(/\s+/).filter(Boolean); return w.length ? w[w.length - 1] : ''; };
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const NW = "(?:[A-Z][a-zà-ÿ'’\\-]+(?:[A-Z][a-zà-ÿ'’\\-]+)?|[A-Z]\\.)";   // v10.61.0: LaCamera, McDonald
const STOP = /^(Our|Us|Meet|The|Welcome|Contact|Your|From|With|About|Senior|Lead|District|Local|Associate|Youth|Head|Former|Dear|Message|Corner|Page|Appreciation|Search|Pastors?|Church|Sabbath|Elder|Bible|Women|Men|Ministry|Ministries|Prayer|Team|Home|Staff|Leaders?|Online|Join|Visit|Resources|Services|Phone|Email|Office|Mobile|Location|Website|Site|Address)$/;
/* a name as the reader keeps it (two or three words, no title or stop word), or null: shared by the pastor reader and, since v10.62.0, the
   video-title reader (namesIn) */
const cleanName = n => {
  const w = String(n || '').replace(/\s+/g, ' ').trim().split(' ');
  while (w.length && STOP.test(w[w.length - 1])) w.pop();
  if (w.length < 2 || w.some(x => STOP.test(x)) || w.every(x => /^[A-Z]\.$/.test(x))) return null;
  return w.slice(0, 3).join(' ');
};
/* people called pastor on a page, and the pages they are named on */
export function pastorsIn(per) {
  const found = new Map();
  const add = (n, former, path) => {
    const name = cleanName(n); if (!name) return;
    const k = fold(surname(name)).toLowerCase(), o = found.get(k) || { name, former: false, pages: new Set() };
    if (name.length > o.name.length && name.split(' ').length <= 3) o.name = name;
    o.former = o.former || !!former; o.pages.add(path); found.set(k, o);
  };
  for (const { path, t } of per) {
    for (const m of t.matchAll(new RegExp(`(Former\\s+|Retired\\s+)?\\b(?:Senior |Lead |Associate |District |Youth |Head )?(?:Pastor|Pr\\.)\\s*:?\\s+(${NW}(?:\\s+${NW}){1,3})`, 'g'))) add(m[2], m[1], path);
    for (const m of t.matchAll(new RegExp(`(${NW}(?:\\s+${NW}){1,2})\\s*[,–-]?\\s*(?:Senior |Lead |Associate |District |Head )?Pastor\\b`, 'g'))) add(m[1], /former/i.test(t.slice(Math.max(0, m.index - 12), m.index)), path);
  }
  return [...found.values()].slice(0, 8).map(p => ({ name: clip(p.name, 60), former: p.former, pages: [...p.pages].slice(0, 6) }));
}
export function social(h, base) {
  const out = { facebook: null, instagram: null, youtube: null, livestream: null };
  for (const m of h.matchAll(/https?:\\?\/\\?\/(?:www\.|m\.)?(facebook\.com|instagram\.com|youtube\.com|youtu\.be)\\?\/[^\s"'<>)\\]+/gi)) {
    const u = ent(m[0].replace(/\\\//g, '/')).replace(/[?#].*$/, '').replace(/\/+$/, '');
    if (/facebook/.test(m[1]) && !out.facebook && !/\/(sharer|tr|plugins|dialog|events|2008|share|watch|groups|photo|media)\b/.test(u) && !/facebook\.com\/?$/.test(u)) out.facebook = u;
    if (/instagram/.test(m[1]) && !out.instagram && !/\/(p|reel|explore|accounts)\//.test(u) && !/instagram\.com\/?$/.test(u)) out.instagram = u;
    if (/youtu/.test(m[1]) && !out.youtube && /\/(channel\/|@|c\/|user\/)/.test(u)) out.youtube = u;
  }
  const live = h.match(/href="([^"]*(?:livestream|live-stream|\/live\b|\/watch\b|online-worship|online-church)[^"]*)"/i);
  if (live) out.livestream = safeUrl(live[1], base);
  return out;
}
/* robots.txt: the paths our reader may not open (its own group, else "*") */
export function robotsRules(txt) {
  const groups = []; let cur = null;
  for (const raw of String(txt || '').split(/\r?\n/)) {
    const l = raw.replace(/#.*$/, '').trim(); if (!l) continue;
    const m = l.match(/^([A-Za-z-]+)\s*:\s*(.*)$/); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); }
    else if (cur && (k === 'disallow' || k === 'allow')) cur.rules.push({ allow: k === 'allow', path: v });
  }
  const mine = groups.find(g => g.agents.some(a => a.includes('terrainbot'))) || groups.find(g => g.agents.includes('*'));
  return mine ? mine.rules.filter(r => r.path) : [];
}
export function robotsAllow(rules, path) {
  let best = null;
  for (const r of rules) { const p = r.path.replace(/\*$/, ''); if (path.startsWith(p) && (!best || p.length > best.p.length)) best = { p, allow: r.allow }; }
  return !best || best.allow;
}
const PAGES = /(about|pastor|staff|leader|team|who-we-are|our-church|meet|contact|visit|new-here|welcome|live|watch|online|join|location|directions|find-us|connect|info|prayer|bible|services|worship|times|beliefs?|events?|calendar|bulletin|sermons?)/i;   // v10.61.0: and where dates live
function variants(w) {
  const bare = String(w || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, ''); if (!bare) return [];
  const host = bare.split('/')[0], path = bare.slice(host.length);
  const hosts = [host, host.startsWith('www.') ? host.slice(4) : 'www.' + host];
  return [...new Set(hosts.flatMap(x => ['https://' + x + path, 'http://' + x + path]))];
}
const robotsCache = new Map();
async function robotsFor(base) {
  const origin = new URL(base).origin; if (robotsCache.has(origin)) return robotsCache.get(origin);
  const r = await get(origin + '/robots.txt', { ms: 10000, max: 100000 });
  const rules = r.ok && !/<html/i.test(r.text.slice(0, 300)) ? robotsRules(r.text) : [];
  robotsCache.set(origin, rules); return rules;
}
/* what a visitor finds; "does not open" only when no address variant answers at all (never for a refusal: that is "not let in") */
/* v10.61.0 (the pastor: "it doesn't even have my picture on there … hasn't been updated in a long time"): a photo by a pastor's name, in
   the page's markup or in a template's scripts: an image named for him (alt, title, file name), else one in the same card (an <img> or a
   background image just before or after his name). Logos, icons and banners never count. null: none found. */
const rawOf = h => h + ' ' + [...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(x => /\\u003c/.test(x))
  .map(x => x.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\"/g, '"').replace(/\\\//g, '/')).join(' ');
const NOT_PHOTO = /logo|icon|favicon|sprite|banner|header|footer|badge|button|arrow|placeholder|spacer|pixel|blank|\.svg\b/i;
export function photoBy(html, sn) {
  if (!sn) return null;
  const body = rawOf(String(html || '')).replace(/<(style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const attr = (tag, a) => (tag.match(new RegExp('\\b' + a + '\\s*=\\s*["\']([^"\']*)', 'i')) || [])[1] || '';
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const src = attr(m[0], 'src') || attr(m[0], 'data-src') || attr(m[0], 'srcset'), alt = ent(attr(m[0], 'alt') + ' ' + attr(m[0], 'title'));
    if (NOT_PHOTO.test(src + ' ' + alt)) continue;
    let file = src; try { file = decodeURIComponent(src); } catch { /* as is */ }
    if (sn.test(fold(alt)) || sn.test(fold(file.split('/').pop()).replace(/[-_.]+/g, ' '))) return 'named';
  }
  const text = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, m => /\\u003c/.test(m) ? m : ' ');
  for (const m of text.matchAll(new RegExp(sn.source, 'gi'))) {
    const near = text.slice(Math.max(0, m.index - 700), m.index + 400);
    const imgs = [...near.matchAll(/<img\b[^>]*>|background-image\s*:\s*url\(([^)]*)\)/gi)].filter(x => !NOT_PHOTO.test(x[0]));
    if (imgs.length) return 'near';
  }
  return null;
}
// ---------------------------------------------------------------- v10.62.0 (digital-read-1.2): the whole site, as a visitor reads it
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* no email address and no phone number in any words kept from a page (a person's own may be printed there): each becomes a token */
const scrub = s => String(s || '').replace(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, '[email]').replace(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, '[phone]');
const titleOf = h => scrub(clip(ent((String(h).match(/<title[^>]*>([^<]*)/i) || [])[1] || ''), 160));
const h1Of = h => scrub(clip(ent(((String(h).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, ' ')), 160)) || null;
const noMenu = h => String(h).replace(/<(header|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
const TIME_RE = /\b\d{1,2}(?::\d\d)?\s*(?:a\.?m|p\.?m)\b/i;
const MAP_RE = /maps\.google\.|google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|maps\.apple\.com|openstreetmap\.org|bing\.com\/maps|waze\.com\/|mapbox|leaflet/i;
const PRI = /pastor|staff|leader|team|contact|join|visit/;
const RE_RES = /\.(css|js|png|jpe?g|gif|svg|webp|avif|xml|json|pdf|ico|mp3|mp4|m4a|zip|docx?|pptx?|xlsx?)(\?|$)|\/(wp-json|xmlrpc\.php|wp-login\.php|wp-admin|feed)(\/|$)/i;
const VID_MAX = 6;
/* the listed street as a visitor would write it: its number and first word ("10 Greene"; a direction letter skipped: "1234 N Main") */
export function streetRe(address) {
  const w = fold(String(address || '')).replace(/[.,#]/g, ' ').trim().split(/\s+/).filter(Boolean); if (w.length < 2) return null;
  const i = /^(N|S|E|W|NE|NW|SE|SW|North|South|East|West)$/i.test(w[1]) && w.length > 2 ? 2 : 1;
  return new RegExp('\\b' + esc(w[0]) + (i === 2 ? '(?:\\s+\\S+)?' : '') + '\\s+' + esc(w[i]) + '\\b', 'i');
}
/* every link inside the page's header, navigation and footer (<nav>, <header>, <footer>, or any element whose class, id or role says nav /
   menu / header / footer): the menu as a visitor sees it. A small tag walk, tolerant of unclosed tags; scripts, styles and comments skipped. */
const VOID_TAG = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/, MENU_TAG = /^(nav|header|footer)$/, MENU_WORD = /nav|menu|header|footer/i;
export function menuLinks(html, base) {
  const h = String(html || '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const out = [], stack = []; let depth = 0;
  for (const m of h.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g)) {
    const close = !!m[1], tag = m[2].toLowerCase(), attrs = m[3];
    if (close) { let i = stack.length - 1; while (i >= 0 && stack[i].tag !== tag) i--; if (i >= 0) { for (let k = stack.length - 1; k >= i; k--) if (stack[k].menu) depth--; stack.length = i; } continue; }
    if (tag === 'a' && depth > 0) { const href = (attrs.match(/\bhref\s*=\s*["']?([^"'\s#>]+)/i) || [])[1]; if (href) out.push(href); }
    if (VOID_TAG.test(tag) || /\/\s*$/.test(attrs)) continue;
    const menu = MENU_TAG.test(tag) || MENU_WORD.test([...attrs.matchAll(/\b(?:class|id|role)\s*=\s*["']([^"']*)/gi)].map(x => x[1]).join(' '));
    stack.push({ tag, menu }); if (menu) depth++;
  }
  return [...new Set(out.map(u => safeUrl(u, base)).filter(Boolean))];
}
/* the videos a page embeds: a YouTube id in an iframe, an embed/, watch?v=, youtu.be/, live/ or shorts/ address in any attribute or in
   escaped JSON (\/ unescaped first), or a Vimeo id; each once, in the order found; never a playlist's "videoseries" */
const VID_RES = [[/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})(?![\w-])/g, 'youtube'], [/youtube\.com\/watch\?(?:[^"'\s<>&]*&)*v=([\w-]{11})(?![\w-])/g, 'youtube'],
  [/youtu\.be\/([\w-]{11})(?![\w-])/g, 'youtube'], [/youtube\.com\/(?:live|shorts)\/([\w-]{11})(?![\w-])/g, 'youtube'], [/(?:player\.vimeo\.com\/video|vimeo\.com)\/(\d{6,12})(?!\d)/g, 'vimeo']];
export function videosIn(html) {
  const h = String(html || '').replace(/\\\//g, '/').replace(/\\u002[fF]/g, '/').replace(/&amp;/g, '&'), found = [];
  for (const [re, on] of VID_RES) for (const m of h.matchAll(re)) if (m[1] !== 'videoseries') found.push({ id: m[1], on, i: m.index });
  found.sort((a, b) => a.i - b.i);
  const out = []; for (const f of found) if (!out.some(x => x.id === f.id)) out.push({ id: f.id, on: f.on });
  return out;
}
/* a YouTube video's title and channel (oEmbed, no key) and, from the watch page, its date, whether it is a live stream, its channel's id
   and its description; a video oEmbed cannot name (private, removed) gets no second fetch */
async function videoInfo(id) {
  const out = { title: null, by: null, date: null, live: false, ch: null, desc: '' };
  const o = await get('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json', { ms: 10000, max: 20000 });
  let j = null; if (o.ok) { try { j = JSON.parse(o.text); } catch { j = null; } }
  if (!isPlain(j)) return out;
  out.title = j.title ? scrub(clip(ent(String(j.title)), 140)) || null : null; out.by = j.author_name ? clip(ent(String(j.author_name)), 80) || null : null;
  const w = await get('https://www.youtube.com/watch?v=' + id, { ms: 15000, max: 1.2e6 });
  if (w.ok) {
    const d = ((w.text.match(/itemprop="datePublished"\s+content="([^"]+)"/) || w.text.match(/"publishDate":"([^"]+)"/) || [])[1] || '').slice(0, 10);
    out.date = /^20\d\d-\d\d-\d\d$/.test(d) ? d : null;
    out.live = /"isLiveContent":\s*true/.test(w.text);
    out.ch = (w.text.match(/"channelId":"(UC[\w-]{22})"/) || [])[1] || null;
    out.desc = scrub(clip(ent(((w.text.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/) || [])[1] || '').replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u0026/g, '&')), 500));
  }
  return out;
}
/* the people a video's title or description names ("Pastor X", "Pr. X", "Elder X", "with X", "by X"): the pastor reader's own rules (NW,
   STOP, cleanName), plus the words a title carries that are no name ("with Special Guest") */
const TITLE_STOP = /^(Special|Music|Praise|Worship|Service|Services|Live|Stream|Livestream|Full|Sermon|Message|Part|Week|Night|Program|Divine|Hour|Communion|Baptism|Series|Study|Speaker|Friends|Family|Us|Choir|Band|Quartet|Singers|Youth|Children|Kids|Jesus|Christ|God|Lord|Holy|Spirit|Prophecy|Saturday|Sunday|Wednesday|Friday|Vespers|Online|Video|Audio|Podcast|Dr|Mr|Mrs|Ms)$/;
const TITLES = '(?:Senior |Lead |Associate |District |Youth |Head )?(?:Pastor|Pastora|Pr\\.|Ptr\\.|Ps\\.|Elder|Dr\\.?)';
export function namesIn(t) {
  const out = [], s = String(t || '');
  const add = n => { const name = cleanName(n); if (!name || name.split(' ').some(w => TITLE_STOP.test(w))) return; const k = fold(name).toLowerCase(); if (!out.some(x => fold(x).toLowerCase() === k)) out.push(name); };
  for (const m of s.matchAll(new RegExp('\\b' + TITLES + '\\s*:?\\s+(?:Dr\\.?\\s+)?(' + NW + '(?:\\s+' + NW + '){1,3})', 'g'))) add(m[1]);
  for (const m of s.matchAll(new RegExp('\\b(?:[Ww]ith|[Bb]y)\\s+(?!' + TITLES + '(?:\\s|:))(' + NW + '(?:\\s+' + NW + '){1,3})', 'g'))) add(m[1]);
  for (const m of s.matchAll(new RegExp('(' + NW + '(?:\\s+' + NW + '){1,2})\\s*[,–-]?\\s*(?:Senior |Lead |Associate |District |Head )?Pastor\\b', 'g'))) add(m[1]);
  return out.slice(0, 5);
}
/* the forms a page holds, by kind: a <form> with a text or email field (never a search box), its kind from its own words and field names and
   the words just before it (prayer; Bible / study / lesson; newsletter / subscribe; contact / message); an embedded form service counts too */
const FORM_HOSTS = /docs\.google\.com\/forms|forms\.gle|jotform|forms\.office|typeform|formstack|wufoo|cognitoforms|churchcenter\.com|planningcenteronline|formspree|123formbuilder|surveymonkey|tfaforms|hsforms|list-manage|constantcontact/i;
const NO_FIELD = /type\s*=\s*["']?(?:hidden|submit|button|checkbox|radio|search|password|file|image|reset)/i;
function formKind(words) {
  const f = fold(words).toLowerCase();
  if (/\bpray(?:er|ers|ing)?\b|oraci[oó]n/.test(f)) return 'prayer';
  if (/\bbible\b|\bbiblia\b|\bstud(?:y|ies)\b|\blessons?\b|\bestudio/.test(f)) return 'bible';
  if (/newsletter|subscribe|suscrib|mailing list|sign up for|text (?:updates|messages?|alerts)|bolet[ií]n/.test(f)) return 'news';
  if (/\bcontact\b|\bmessage\b|\bmensaje\b|contacto|reach us|get in touch/.test(f)) return 'contact';
  return 'other';
}
export function formsIn(html) {
  const body = rawOf(String(html || '')).replace(/<(style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const out = { n: 0, prayer: false, bible: false, contact: false, news: false };
  const take = k => { out.n++; if (k !== 'other') out[k] = true; };
  const around = i => body.slice(Math.max(0, i - 400), i).replace(/<[^>]+>/g, ' ');
  for (const m of body.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attrs = m[1], inner = m[2];
    if (/search/i.test(attrs) || /type\s*=\s*["']?search/i.test(inner)) continue;
    const fields = [...inner.matchAll(/<input\b[^>]*>|<textarea\b/gi)].map(x => x[0]).filter(x => !NO_FIELD.test(x));
    if (!fields.length) continue;
    const names = [...inner.matchAll(/\b(?:name|id|placeholder|aria-label)\s*=\s*["']([^"']*)/gi)].map(x => x[1]).join(' ');
    take(formKind(attrs + ' ' + inner.replace(/<[^>]+>/g, ' ') + ' ' + names + ' ' + around(m.index)));
  }
  for (const m of body.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']*)/gi)) if (FORM_HOSTS.test(m[1])) take(formKind(m[1] + ' ' + around(m.index)));
  return out;
}
/* the pictures a page shows (logos, icons, banners and pixels left out, as NOT_PHOTO says; each once): unnamed = no alt, or an alt that is a
   file name; generated = a file name or alt naming ChatGPT, DALL·E, Midjourney, "generated" or a stock-photo site */
const UNNAMED = /\.(?:jpe?g|png|gif|webp|avif|svg)$|^IMG[_-]?\d|^DSC|^\d{8}|^ChatGPT Image|^(?:image|photo|picture|img|untitled|screenshot)[\s\d_-]*$/i;
const GENERATED = /chatgpt|dall[·.\- ]?e|midjourney|\bgenerated\b|\bstock\b|shutterstock|istock|unsplash|pexels|freepik/i;
export function picsIn(html, base) {
  const body = rawOf(String(html || '')).replace(/<(style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const pics = [], seen = new Set();
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0], attr = a => ent((tag.match(new RegExp('\\b' + a + '\\s*=\\s*["\']([^"\']*)', 'i')) || [])[1] || '');
    let src = attr('src'); if (!src || /^data:/i.test(src)) src = attr('data-src') || attr('data-lazy-src') || (attr('srcset') || attr('data-srcset')).split(',')[0].trim().split(/\s+/)[0] || '';
    if (!src || /^data:/i.test(src) || seen.has(src)) continue;
    const alt = attr('alt').trim(), w = parseInt(attr('width'), 10) || 0, hh = parseInt(attr('height'), 10) || 0;
    let file = src.split(/[?#]/)[0].split('/').pop() || ''; try { file = decodeURIComponent(file); } catch { /* as is */ }
    if (NOT_PHOTO.test(src + ' ' + alt) || (w && w <= 2) || (hh && hh <= 2)) continue;
    seen.add(src);
    pics.push({ key: src, url: safeUrl(src, base), alt: clip(alt, 160), unnamed: !alt || UNNAMED.test(alt), generated: GENERATED.test(file + ' ' + alt), small: (w > 0 && w < 120) || (hh > 0 && hh < 120) });
  }
  return { n: pics.length, unnamed: pics.filter(p => p.unnamed).length, generated: pics.filter(p => p.generated).length, pics };
}
/* the home page for the in-depth review: its h1, the first 700 characters after the menu, the first eight link or button texts, up to six
   main pictures (in order; no logo, nothing small) as addresses with their alt */
export function homeOf(html, base) {
  const h = String(html || ''), body = (h.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || [, h])[1], main = noMenu(body), ctas = [];
  for (const m of main.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = scrub(clip(ent(m[2].replace(/<[^>]+>/g, ' ')), 60)); if (t && !ctas.includes(t)) ctas.push(t); if (ctas.length >= 8) break;
  }
  // the pictures from the whole body: a hero picture often sits inside <header> (logos, icons and banners are left out by name)
  return { h1: h1Of(h), first: scrub(visOf(main)).slice(0, 700), ctas, pics: picsIn(body, base).pics.filter(p => p.url && !p.small).slice(0, 6).map(p => ({ url: p.url, alt: p.alt })) };
}
/* the name as written where the denomination writes "Seventh-day Adventist" (the home page's title or body), and this short list of common
   misspellings in the visible text: never a spell-checker, only the list; each once, with the page it is on; up to six */
const NAME_WRONG = /\bSeventh[-\s]Day Adventist\b|\bSeventh day Adventist\b/;
const MISSPELT = /\bAll Rights Served\b|\brecieve\b|\bseperate\b|\boccassion\b|\baccomodate\b|\bcalender\b|\bwich\b|\buntill\b|\badress\b|\bcomittee\b|\bbegining\b|\bdefinately\b|\bneccessary\b|\bSabath\b|\bAdvenitst\b|\bChruch\b/gi;
export function wordsIn(pages) {
  const out = [], seen = new Set(), home = pages[0];
  if (home) { const m = ((home.title || '') + ' ' + (home.t || '')).match(NAME_WRONG); if (m) out.push({ t: m[0], on: home.path }); }
  for (const p of pages) for (const m of String(p.t || '').matchAll(MISSPELT)) {
    const k = m[0].toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push({ t: m[0], on: p.path }); if (out.length >= 6) return out;
  }
  return out;
}
/* the email's host (a mailto: link, else an address in the visible text) and whether it is a personal mailbox; never the address itself */
const GENERIC_MAIL = /^(?:gmail|googlemail|yahoo|ymail|hotmail|live|msn|outlook|aol|icloud|me|mac|comcast|verizon|protonmail|proton)\.(?:com|net|me)$/i;
export function emailOf(html, vis) {
  let m = String(html || '').match(/href\s*=\s*["']\s*mailto:([^"'?&\s]+)/i), addr = m ? ent(m[1]).trim() : '';
  if (!addr) { m = String(vis || '').match(/\b[\w.+-]+@([\w-]+(?:\.[\w-]+)+)\b/); addr = m ? m[0] : ''; }
  if (!addr || !addr.includes('@')) return null;
  const host = addr.split('@').pop().toLowerCase().replace(/[.,;:]+$/, ''); if (!host.includes('.')) return null;
  return { host: clip(host, 80), generic: GENERIC_MAIL.test(host) };
}
/* a title that is only a service word and a date ("Worship Service || Oct 10, 2026", "Sabbath Service 10/10", "Culto Divino 10/10/2026") */
const MON_RE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Abr|Ago|Dic)[a-z]*\\.?';
const SERVICE_WORD = /^(?:\d+|sabbath|worship|service|services|divine|hour|church|live|stream|livestream|streaming|morning|program|programme|sermon|message|school|online|weekly|saturday|sat|the|and|of|for|at|am|pm|sda|adventist|seventh|day|full|replay|recording|video|&|culto|divino|servicio|adoraci[oó]n|s[aá]bado|iglesia|en|vivo|de|el|la|los|las|y|programa|serm[oó]n|mensaje|escuela|sab[aá]tica|transmisi[oó]n|directo)$/i;
export function weakTitle(t) {
  const s = String(t || '')
    .replace(new RegExp('\\b' + MON_RE + '\\s+\\d{1,2}(?:st|nd|rd|th)?,?(?:\\s+\\d{4})?\\b', 'gi'), ' ')
    .replace(new RegExp('\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:de\\s+)?' + MON_RE + '(?:\\s+de)?(?:,?\\s+\\d{4})?\\b', 'gi'), ' ')
    .replace(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g, ' ').replace(/\b(?:19|20)\d\d\b/g, ' ').replace(new RegExp(TIME_RE.source, 'gi'), ' ')
    .replace(new RegExp('\\b' + MON_RE + '\\b', 'gi'), ' ').replace(/[|–—\-:·•,.()[\]"'“”¡!¿?#]+/g, ' ').replace(/\s+/g, ' ').trim();
  const w = s.split(' ').filter(Boolean);
  return w.length > 0 && w.every(x => SERVICE_WORD.test(x));
}
/* what a visitor finds; "does not open" only when no address variant answers at all (never for a refusal: that is "not let in").
   v10.62.0 (digital-read-1.2; the pastor: "Are you able to survey the whole website and see its deficiencies as well … when it says like
   current, it doesn't really mean that it's a good website"): the whole menu (every same-site link in the home page's header, navigation and
   footer) plus the pages the old list matched, de-duplicated, pastor/staff/contact/visit/join first, up to `maxPages` pages (the home page
   one of them), each with the same 150 ms pause; a page over 1.5 MB skipped; a menu link that fails keeps its code (a broken link).
   `opts.address` is the listed street, looked for in the visible text. */
export async function website(listed, maxPages = 30, pastorName = '', opts = {}) {
  let r = null, ms = null; const tried = [];
  for (const u of variants(listed)) { tried.push(u); const t0 = Date.now(); r = await get(u); ms = Date.now() - t0; if (r.ok && r.text.trim().length > 20) break; }   // any page with words opens
  if (!r || !r.ok || r.text.trim().length <= 20) {
    const refused = r && [401, 403, 429, 503].includes(r.status);
    return { listed: clip(listed, 200), opens: false, refused, status: r ? r.status : 0, err: r && r.err ? clip(r.err, 30) : null };
  }
  const base = r.url, rules = await robotsFor(base);
  if (!robotsAllow(rules, '/')) return { listed: clip(listed, 200), url: base, opens: true, blocked: true };
  const home0 = base.replace(/\/+$/, ''), pathOf = u => ((new URL(u).pathname || '/').replace(/\/+$/, '') || '/');
  const pages = [{ path: pathOf(base), h: r.text, status: r.status }];
  // the pages a visitor looks at (v10.60.0's list), and since v10.62.0 every link in the menu (header, navigation, footer)
  const oldList = [...r.text.matchAll(/href="([^"#]+)"/gi)].map(m => safeUrl(m[1], base)).filter(Boolean).map(u => u.replace(/\/+$/, ''))
    .filter(u => hostOf(u) === hostOf(base) && PAGES.test(new URL(u).pathname) && !/\.(css|js|png|jpe?g|gif|svg|webp|xml|json|php|pdf|ico)$|wp-json|feed|xmlrpc/i.test(u)
      && !/\/(20\d\d|blog|news|post|posts|tag|category|author|page|feed|wp-|events?\/\d)/.test(new URL(u).pathname));
  const menu = menuLinks(r.text, base).map(u => u.replace(/\/+$/, '')).filter(u => hostOf(u) === hostOf(base) && !RE_RES.test(u) && !/^\/(index\.(html?|php)|home)$/i.test(new URL(u).pathname));
  const links = [...new Set([...menu, ...oldList])].filter(u => u !== home0 && robotsAllow(rules, new URL(u).pathname))
    .sort((a, b) => (PRI.test(b) ? 1 : 0) - (PRI.test(a) ? 1 : 0)).slice(0, Math.max(0, maxPages - 1));
  for (const u of links) {
    const p = await get(u, { max: 1.5e6 + 1 }); await pause(150);
    const path = pathOf(u);
    if (p.ok && p.text.length > 1.5e6) continue;                                                                 // over 1.5 MB: skipped
    if (!p.ok) { pages.push({ path, status: p.status }); continue; }                                              // a broken menu link (404, 410), or a refusal: its code kept
    if (hostOf(p.url) !== hostOf(base)) { pages.push({ path, status: p.status, to: hostOf(p.url) }); continue; }  // sent to another site (a giving site)
    const fin = pathOf(p.url); if (pages.some(x => x.h && x.path === fin)) continue;
    pages.push({ path: fin, h: p.text, status: p.status });
  }
  // per page: the words, the dates, the forms, the pictures, the videos (v10.62.0)
  const per = [], recs = [], vidsAll = [], picsAll = new Map(), forms = { n: 0, prayer: false, bible: false, contact: false, news: false };
  for (const p of pages) {
    if (!p.h) { recs.push(p.to ? { path: p.path, status: p.status, to: p.to } : { path: p.path, status: p.status }); continue; }
    const t = textOf(p.h), v = visOf(p.h), dt = datesOf(t), f = formsIn(p.h), im = picsIn(p.h, base), vids = videosIn(p.h);
    per.push({ path: p.path, t, v, title: titleOf(p.h) });
    recs.push({ path: p.path, status: p.status, title: titleOf(p.h), h1: h1Of(p.h), words: v ? v.split(' ').length : 0, newest: dt.past, next: dt.next,
      forms: f, videos: vids.length, imgs: { n: im.n, unnamed: im.unnamed, generated: im.generated } });
    forms.n += f.n; for (const k of ['prayer', 'bible', 'contact', 'news']) forms[k] = forms[k] || f[k];
    for (const x of im.pics) if (!picsAll.has(x.key)) picsAll.set(x.key, x);
    for (const x of vids) if (!vidsAll.some(y => y.id === x.id)) vidsAll.push(x);
  }
  const txt = per.map(p => p.t).join(' \n '), all = pages.filter(p => p.h).map(p => p.h).join('\n');
  const vis = per.map(p => p.v).join(' \n ') + ' ' + [...all.matchAll(/href="tel:([^"]+)"/gi)].map(m => ' ' + decodeURIComponent(m[1]).replace(/^\+?1/, '') + ' ').join(' ');
  const phones = [...new Set([...vis.matchAll(/\(?\b(\d{3})\)?[\s.-](\d{3})[\s.-](\d{4})\b/g)].map(m => `${m[1]}-${m[2]}-${m[3]}`))].slice(0, 6);
  const snw = fold(surname(pastorName)).replace(/[^A-Za-z'’-]/g, ''), sn = snw.length > 1 ? new RegExp('\\b' + snw + '\\b', 'i') : null;
  const years = [...new Set([...txt.matchAll(/(?:©|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)/gi)].map(m => m[1]))].sort();
  // v10.61.0: a photo by each pastor's name (the pages he is named on), and by the listing's pastor's
  const byPath = new Map(pages.filter(p => p.h).map(p => [p.path, p.h]));
  const snOf = n => { const w = fold(surname(n)).replace(/[^A-Za-z'’-]/g, ''); return w.length > 1 ? new RegExp('\\b' + w + '\\b', 'i') : null; };
  const photoOf = (n, paths) => { const re = snOf(n); for (const pa of paths || []) { const ph = photoBy(byPath.get(pa) || '', re); if (ph) return { photo: ph, on: pa }; } return null; };
  const pastors = pastorsIn(per).map(p => { const ph = photoOf(p.name, p.pages); return ph ? { ...p, photo: ph.photo, photoOn: ph.on } : p; });
  const named = sn ? per.filter(p => sn.test(fold(p.t))).map(p => p.path).slice(0, 8) : null;
  const lp = named && named.length ? photoOf(pastorName, named) : null;
  const when = datesOf(txt);
  const home = r.text, hrefs = [...all.matchAll(/href="([^"#]+)"/gi)].map(m => m[1]).join(' ');
  // v10.62.0: the embedded videos (oEmbed and the watch page, at most six), the stale pages, the words, the email's host, the address and map,
  // and the pages' texts for the review (kept apart from the reading: never in the findings)
  const videos = [];
  for (const x of vidsAll.slice(0, VID_MAX)) {
    const i = x.on === 'youtube' ? await videoInfo(x.id) : { title: null, by: null, date: null, live: false, ch: null, desc: '' };
    videos.push({ id: x.id, on: x.on, title: i.title, by: i.by, date: i.date, live: i.live, mine: false, ch: i.ch, names: namesIn((i.title || '') + ' · ' + i.desc) });
  }
  const oldest = daysAgo(365), stale = recs.filter(p => 'newest' in p && p.newest && p.newest < oldest && !p.next).slice(0, 5).map(p => ({ path: p.path, date: p.newest }));
  const picList = [...picsAll.values()], st = streetRe(opts.address);
  const texts = { at: now(), pages: [] }; let total = 0;
  for (const p of per.slice(0, 14)) { const room = Math.min(2500, 22000 - total); if (room <= 0) break; const text = scrub(p.t).slice(0, room); total += text.length; texts.pages.push({ path: p.path, title: p.title, text }); }
  const site = {
    listed: clip(listed, 200), url: base, opens: true, https: base.startsWith('https:'), mobile: /name=["']viewport["']/i.test(r.text),
    title: clip(ent((r.text.match(/<title[^>]*>([^<]*)/i) || [])[1] || ''), 160), template: /\/_next\//.test(r.text) ? 'scripts' : /acc-themes/.test(r.text) ? 'frame' : null,
    pagesRead: per.map(p => p.path).slice(0, 30), pastors, newestDate: newestDate(txt), copyright: years.pop() || null,
    // v10.61.0: how current (the newest date in its words already past, the next one ahead; never a sitemap's "lastmod", which website
    // builders stamp on their own) and how fast its first page answered
    pastDate: when.past, nextDate: when.next, ahead: when.ahead, ms: Number.isFinite(ms) ? ms : null,
    description: /<meta[^>]+name=["']description["'][^>]*content=["'][^"']{20,}/i.test(home) || /<meta[^>]+content=["'][^"']{20,}["'][^>]*name=["']description["']/i.test(home),
    events: /\/(events?|calendar)\b/i.test(hrefs) || /upcoming events|events calendar|church calendar/i.test(txt),
    sermons: /sermon|\/messages?\b|\/watch\b|livestream|live-stream|\/media\b|youtube\.com|vimeo\.com/i.test(hrefs),
    serviceTimes: /\b(8|9|10|11|12):\d\d\s*(a\.?\s?m)/i.test(txt) || /\b(9|10|11)\s*(a\.?\s?m)\b/i.test(txt), phones,
    bibleStudy: /bible (study|studies|class|school|info)|free bible|request (a )?bible|discover (the )?bible|bible guide|bible lessons/i.test(txt),
    prayerRequest: /prayer request|request (a )?prayer|how can we pray|need prayer/i.test(txt),
    giving: /adventistgiving|give online|online giving|tithe|donate/i.test(all) || pages.some(p => /adventistgiving/i.test(p.to || '')),
    visitors: /plan (a|your) (first )?visit|new here|first time|visitor|what to expect/i.test(txt),
    social: social(all, base),
    // the pages that name the listing's pastor (his surname); the page checks a registered pastor's own name against "pastors"
    pastorNamed: named, pastorPhoto: lp ? lp.photo : null, pastorPhotoOn: lp ? lp.on : null,
    // v10.62.0 (digital-read-1.2): the whole site; a reading without `pages` is one by an older reader, judged as before
    pages: recs.slice(0, 30), videos, latestVideo: videos.map(v => v.date).filter(Boolean).sort().pop() || null, stale, forms,
    pics: { n: picList.length, unnamed: picList.filter(x => x.unnamed).length, generated: picList.filter(x => x.generated).length },
    home: homeOf(r.text, base), words: wordsIn(per.map(p => ({ path: p.path, title: p.title, t: p.v }))), email: emailOf(all, vis),
    address: st ? st.test(fold(vis)) : null, map: MAP_RE.test(all)
  };
  Object.defineProperty(site, 'texts', { value: texts, enumerable: false, configurable: true });   // for the review (x/<slug>/<org>); never stored with the reading
  return site;
}

// ---------------------------------------------------------------- YouTube (the public feed: no key)
const KIND = [['series', /revelation|daniel|prophec|second coming|seminar|bible study|discover|series|evangelis|night \d|\b\d{1,2}\s*-\s/i],
  ['worship', /praise|worship|divine (hour|service)|sabbath (service|worship)|livestream|live stream|\blive\b|song service|hymn/i],
  ['event', /festival|baptism|wedding|funeral|memorial|concert|graduation|pathfinder|vbs|camp|day\b/i]];
/* v10.62.0 (digital-read-1.2): the channel page already fetched gives the subscribers, the About text and whether it names the church's site
   (`o.siteHost`); the feed's descriptions say whether each carries a web address, the listed street or ZIP (`o.address`, `o.zip`) and a time of
   day; an upcoming stream; the names in titles and descriptions; the weak titles; 15 recent videos for the review. The pastor (8 Oct 2026):
   "Website should actually make appeals and be evangelistic in nature, same with YouTube, same with Google." */
export async function youtube(u, o = {}) {
  const r = await get(u); if (!r.ok) return { url: u, read: false };
  const id = (r.text.match(/"externalId":"(UC[\w-]{22})"/) || r.text.match(/channel\/(UC[\w-]{22})/) || [])[1]; if (!id) return { url: u, read: false };
  const f = await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + id); if (!f.ok) return { url: u, read: false, id };
  const vids = [...f.text.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(m => ({ t: scrub(clip(ent((m[0].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''), 140)),
    d: ((m[0].match(/<published>([^<]+)/) || [])[1] || '').slice(0, 10), v: +((m[0].match(/views="(\d+)"/) || [])[1] || 0),
    desc: clip(ent((m[0].match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || ''), 600) }));   // desc: counted, never kept
  const kinds = { sermon: 0, series: 0, worship: 0, event: 0 }; for (const v of vids) kinds[(KIND.find(([, re]) => re.test(v.t)) || ['sermon'])[0]]++;
  const tdv = ({ t, d, v }) => ({ t, d, v });
  const sm = r.text.match(/\b([\d.,]+)\s*(K|M|thousand|million)?\s+(?:subscribers|suscriptores)\b/i);
  const subscribers = sm ? Math.round(parseFloat(sm[1].replace(/,/g, '')) * (/^(K|thousand)$/i.test(sm[2] || '') ? 1000 : /^(M|million)$/i.test(sm[2] || '') ? 1e6 : 1)) || null : null;
  const about = scrub(clip(ent((r.text.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)/i) || r.text.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)/i) || [])[1] || ''), 300)) || null;
  const aboutSite = o.siteHost ? new RegExp(esc(o.siteHost), 'i').test(r.text) : null;
  const name = clip(ent((f.text.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''), 120) || null;
  const st = streetRe(o.address), zip = o.zip ? new RegExp('\\b' + esc(String(o.zip)) + '\\b') : null, desc = { n: 0, link: 0, address: 0, times: 0 };
  for (const v of vids) {
    if (!v.desc) continue; desc.n++;
    if (/https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|org|net|church|info|us|tv)\b/i.test(v.desc)) desc.link++;
    if ((st && st.test(fold(v.desc))) || (zip && zip.test(v.desc))) desc.address++;
    if (TIME_RE.test(v.desc)) desc.times++;
  }
  const td = today(), upcoming = vids.some(v => v.d >= td || (v.v === 0 && datesIn(v.t).some(d => d > td)));
  const counts = new Map(); for (const v of vids) for (const n of namesIn(v.t + ' · ' + v.desc)) counts.set(n, (counts.get(n) || 0) + 1);
  const names = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nm, n]) => ({ name: nm, n }));
  return { url: u, read: true, id, name, latest: vids[0] ? tdv(vids[0]) : null, inFeed: vids.length, last30: vids.filter(x => x.d >= daysAgo(30)).length,
    last90: vids.filter(x => x.d >= daysAgo(90)).length, avgViews: vids.length ? Math.round(vids.reduce((a, x) => a + x.v, 0) / vids.length) : null, kinds,
    titles: vids.slice(0, 3).map(tdv), subscribers, about, aboutSite, desc, upcoming, names, weak: vids.filter(v => weakTitle(v.t)).length, recent: vids.slice(0, 15).map(tdv) };
}

// ---------------------------------------------------------------- Google's listing (Places API (New), Text Search)
// v10.62.0: places.photos added (Pro tier, inside the Enterprise call Text Search already makes: no new charge; Google's pricing page read 8 Oct
// 2026: Text Search Enterprise 1,000 free a month, $35 per 1,000 after; reviews would need Enterprise + Atmosphere, $40, and carry no owner reply)
const PLACES_FIELDS = 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.businessStatus,places.googleMapsUri,places.regularOpeningHours.weekdayDescriptions,places.photos';
const PLACES_KEY = () => (process.env.GOOGLE_PLACES_KEY || '').trim();
const SEARCH_KEY = () => (process.env.BRAVE_SEARCH_KEY || '').trim();
const capOf = (name, d) => { const n = parseInt(process.env[name] || '', 10); return Number.isFinite(n) && n >= 0 ? n : d; };
async function bump(store, key, max) {
  for (let i = 0; i < 4; i++) {
    const cur = typeof store.getWithMetadata === 'function' ? await store.getWithMetadata(key, { type: 'json' }) : null;
    const n = cur && cur.data && cur.data.n || 0; if (n >= max) return false;
    const w = cur ? await store.setJSON(key, { n: n + 1 }, { onlyIfMatch: cur.etag }) : await store.setJSON(key, { n: 1 }, { onlyIfNew: true });
    if (!w || w.modified !== false) return true;
  }
  return false;
}
const words = s => fold(s).toLowerCase().replace(/seventh-day/g, ' ').split(/[^a-z0-9]+/).filter(w => w.length > 2 && !/^(church|seventh|day|adventist|adventists|sda|company|group|mission|the|and|iglesia)$/.test(w));
export function pickPlace(places, e) {
  const num = (String(e.address || '').match(/^\d+/) || [])[0], zip = e.zip, want = words(e.name);
  let best = null;
  for (const p of places || []) {
    const name = p.displayName && p.displayName.text || '', addr = p.formattedAddress || '';
    let score = 0;
    if (num && new RegExp('^' + num + '\\b').test(addr)) score += 2;
    if (zip && addr.includes(zip)) score += 2;
    const nw = words(name); score += want.filter(w => nw.includes(w)).length;
    if ((p.types || []).some(t => /church|place_of_worship/.test(t))) score += 1;
    if (!best || score > best.score) best = { p, score };
  }
  return best && best.score >= 3 ? best.p : null;
}
export async function google(e, store) {
  const key = PLACES_KEY(); if (!key) return { read: false, why: 'nokey' };
  if (!(await bump(store, `m/${month()}/places`, capOf('PLACES_MONTH_MAX', 900)))) return { read: false, why: 'cap' };
  const q = `${e.name.replace(/\bSDA\b/, 'Seventh-day Adventist')}, ${e.address || e.town || ''}`;
  const r = await get('https://places.googleapis.com/v1/places:searchText', { method: 'POST', ua: UA,
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': PLACES_FIELDS },
    body: JSON.stringify({ textQuery: q, pageSize: 5, languageCode: 'en', regionCode: 'us' }) });
  if (!r.ok) return { read: false, why: 'error', status: r.status };
  let j; try { j = JSON.parse(r.text); } catch { return { read: false, why: 'error' }; }
  const p = pickPlace(j.places, e);
  if (!p) return { read: true, found: false };
  return { read: true, found: true, name: clip(p.displayName && p.displayName.text, 120), address: clip(p.formattedAddress, 160),
    rating: typeof p.rating === 'number' ? p.rating : null, reviews: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
    status: clip(p.businessStatus || '', 30), website: p.websiteUri ? clip(p.websiteUri, 300) : null, phone: p.nationalPhoneNumber ? clip(p.nationalPhoneNumber, 30) : null,
    maps: p.googleMapsUri && /^https:\/\/(www\.|maps\.)?google\.[a-z.]+\//.test(p.googleMapsUri) ? clip(p.googleMapsUri, 300) : null,
    hours: Array.isArray(p.regularOpeningHours && p.regularOpeningHours.weekdayDescriptions) ? p.regularOpeningHours.weekdayDescriptions.slice(0, 7).map(x => clip(x, 60)) : null,
    photos: Array.isArray(p.photos) ? Math.min(10, p.photos.length) : 0 };   // v10.62.0: how many pictures the listing shows (Google gives up to 10)
}

// ---------------------------------------------------------------- the double check (a search for the church's name), when a key is set
const DIRHOSTS = { 'churchfinder.com': 'ChurchFinder', 'faithstreet.com': 'FaithStreet', 'adventistguide.com': 'Adventist Guide', 'joinmychurch.com': 'JoinMyChurch',
  'unitedstateschurches.com': 'United States Churches', 'adventistdirectory.org': 'Adventist Directory', 'eadventist.net': 'eAdventist' };
const AGG = /(thechurchmap|churchmap|findachurchnearme|churchdirectoryusa|churchdirectory|nearfaith|faithalarm|psalmlog|alluschurches|chamberofcommerce|superpages|yellowpages|gospelchannel|churchfinder|faithstreet|joinmychurch|unitedstateschurches|adventistguide|adventistdirectory|eadventist|yelp|mapquest|manta|bbb\.org|nextdoor|usachurches|churchangel|findachurch|dexknows|cylex|hotfrog|brownbook|citysquares|ezlocal|opendi|birdeye|buzzfile|dnb\.com|zoominfo|opencorporates|guidestar|causeiq|charitynavigator|propublica|legacy\.com|wikipedia|google\.|bing\.|apple\.com|waze|tripadvisor|foursquare|churchstaffing|allbiz|seventhdayadventistchurches|mychurchevents|sermonaudio|sermonview|eventbrite|patch\.com|meetup)/i;
export async function search(e, store) {
  const key = SEARCH_KEY(); if (!key) return { read: false, why: 'nokey' };
  if (!(await bump(store, `m/${month()}/search`, capOf('SEARCH_MONTH_MAX', 900)))) return { read: false, why: 'cap' };
  const q = `${e.name.replace(/\bSDA\b/, 'Seventh-day Adventist')} ${e.town || ''} ${e.state || ''}`.trim();
  const r = await get('https://api.search.brave.com/res/v1/web/search?count=10&q=' + encodeURIComponent(q), { ua: UA, headers: { accept: 'application/json', 'X-Subscription-Token': key } });
  if (!r.ok) return { read: false, why: 'error', status: r.status };
  let j; try { j = JSON.parse(r.text); } catch { return { read: false, why: 'error' }; }
  const res = ((j.web && j.web.results) || []).slice(0, 10).map(x => ({ u: safeUrl(x.url), t: clip(ent(String(x.title || '').replace(/<[^>]+>/g, '')), 160), s: clip(ent(String(x.description || '').replace(/<[^>]+>/g, '')), 300) })).filter(x => x.u);
  return { read: true, q: clip(q, 160), results: res };
}
const followersIn = s => { const m = String(s).match(/([\d.,]+)\s*(K)?\s+followers/i); return m ? Math.round(parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1)) : null; };
/* what the search found: a site, Facebook, Instagram, YouTube (each only when its line names the church and says Adventist), directories' pastors */
export function sift(sr, e, siteHost) {
  const out = { ownAt: null, website: null, facebook: null, instagram: null, youtube: null, dirPastors: [] }; if (!sr || !sr.read) return out;
  const want = words(e.name);
  sr.results.forEach((x, i) => {
    const h = hostOf(x.u), about = fold(x.t + ' ' + x.s + ' ' + x.u).toLowerCase(), mine = want.length && want.every(w => about.includes(w)) && /adventist|sda|iglesia|adventista|eglise|igreja/.test(about);
    if (siteHost && h === siteHost) { if (out.ownAt == null) out.ownAt = i + 1; return; }
    if (/facebook\.com$/.test(h)) { if (mine && !out.facebook && !/\/(posts|events|groups|photos?|videos|reel|watch|media)\b|photo\.php|story\.php/.test(x.u)) out.facebook = { url: x.u, followers: followersIn(x.s) }; return; }
    if (/instagram\.com$/.test(h)) { if (mine && !out.instagram && !/\/(p|reel)\//.test(x.u)) out.instagram = { url: x.u, followers: followersIn(x.s) }; return; }
    if (/youtube\.com$/.test(h)) { if (mine && !out.youtube && /\/(@|channel\/|c\/)/.test(x.u)) out.youtube = x.u; return; }
    const where = DIRHOSTS[h];
    if (where) { for (const m of (x.t + ' · ' + x.s).matchAll(/\bPastor\s*:?\s+([A-Z][a-z'’\-]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z'’]+)/g)) out.dirPastors.push({ where, name: m[1].replace(/-$/, ''), url: x.u }); return; }
    if (AGG.test(h)) return;
    if (mine && !out.website) out.website = x.u;
  });
  out.dirPastors = out.dirPastors.filter((p, i, a) => a.findIndex(q => q.where === p.where && surname(q.name) === surname(p.name)) === i).slice(0, 6);
  return out;
}

// ---------------------------------------------------------------- one church
/* v10.62.0: `slug` names the job's conference; with it, and only when the server has ANTHROPIC_API_KEY (the in-depth review may run), the
   pages' texts go to x/<slug>/<org>, never into the reading itself. An embedded video is the church's own when its channel is the one in the
   feed (by id), else when the channel's name is the same. */
export async function readChurch(e, store, slug = '') {
  const res = { org: e.org, read: today() };
  res.site = e.website ? await website(e.website, 30, e.pastor || '', { address: e.address }) : null;
  const siteHost = res.site && res.site.opens && res.site.url ? hostOf(res.site.url) : null;
  const sr = await search(e, store); res.search = sr.read ? { read: true } : { read: false, why: sr.why };
  const f = sift(sr, e, siteHost); res.search.ownAt = f.ownAt; res.dirPastors = f.dirPastors;
  if (f.website && hostOf(f.website) !== siteHost) { const w = await website(f.website, 2); if (w.opens && !w.blocked) res.otherSite = { url: w.url, title: w.title, phones: w.phones, pastors: w.pastors, social: w.social }; }
  const s = (res.site && res.site.opens && res.site.social) || (res.otherSite && res.otherSite.social) || {};
  res.facebook = s.facebook ? { url: s.facebook, from: 'site', followers: f.facebook && hostOf(f.facebook.url) === hostOf(s.facebook) ? f.facebook.followers : null } : f.facebook ? { ...f.facebook, from: 'search' } : null;
  res.instagram = s.instagram ? { url: s.instagram, from: 'site' } : f.instagram ? { ...f.instagram, from: 'search' } : null;
  const yt = s.youtube || f.youtube; res.youtube = yt ? { ...(await youtube(yt, { siteHost, address: e.address, zip: e.zip })), from: s.youtube ? 'site' : 'search' } : null;
  if (res.site && Array.isArray(res.site.videos) && res.youtube && res.youtube.read) {
    const y = res.youtube, nm = fold(y.name || '').toLowerCase();
    for (const v of res.site.videos) v.mine = !!((v.ch && y.id && v.ch === y.id) || (nm && v.by && fold(v.by).toLowerCase() === nm));
  }
  res.google = await google(e, store);
  if (slug && res.site && res.site.texts && (process.env.ANTHROPIC_API_KEY || '').trim()) await store.setJSON('x/' + slug + '/' + e.org, res.site.texts);
  return res;
}

// ---------------------------------------------------------------- the job
const LEASE_MS = 15 * 60e3;
async function wakeSelf(base, slug, worker) {
  try {
    const r = await fetch(new URL('/.netlify/functions/digital-read', base), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, worker }), signal: AbortSignal.timeout(5000) });
    return r && r.status === 202;
  } catch { return false; }
}
async function save(store, key, job, etag) {
  const w = await store.setJSON(key, job, etag ? { onlyIfMatch: etag } : {});
  return w && w.modified === false ? null : (w && w.etag) || 'x';
}
export async function runJob(slug, worker, base) {
  const store = theStore(), key = 'j/' + slug, t0 = now();
  const got = typeof store.getWithMetadata === 'function' ? await store.getWithMetadata(key, { type: 'json' }) : null;
  if (!got || !isPlain(got.data)) return 'gone';
  let job = got.data, etag = got.etag;
  if (job.status !== 'running' || !sameHash(worker, job.workerHash)) return 'refused';
  if (job.lease && job.lease > t0) return 'busy';
  job.lease = t0 + LEASE_MS; job.wakes = (job.wakes || 0) + 1;
  etag = await save(store, key, job, etag); if (!etag) return 'busy';
  const counts = { entries: 0, churches: 0, waits: 0 };
  const keep = async () => { job.touched = now(); const e2 = await save(store, key, job, etag); if (!e2) throw new Error('lost'); etag = e2; };
  try {
    while (now() - t0 < BUDGET_MS) {
      if (job.phase === 'list') {
        const list = [];
        for (const t of [5, 6, 15]) {
          let r = null;
          for (let k = 0; k < 4; k++) { r = await get(`${EAD}${job.org}&orgtype=${t}&type=l`); await pause(EAD_GAP); if (r.ok) break; counts.waits++; await pause(EAD_WAIT); }
          if (!r.ok) throw new Error('list');
          for (const o of listOrgs(r.text, job.org)) list.push({ ...o, kind: t === 5 ? 'church' : t === 6 ? 'company' : 'group' });
        }
        if (!list.length) throw new Error('empty');
        job.list = list.slice(0, 600); job.phase = 'entries'; job.i = 0; await keep(); continue;
      }
      if (job.phase === 'entries') {
        if (job.i >= job.list.length) { job.phase = 'read'; job.i = 0; await keep(); continue; }
        const o = job.list[job.i], cached = await store.get('e/' + o.org, { type: 'json' });
        if (!(cached && cached.at && now() - cached.at < 20 * 864e5)) {
          const r = await get(EAD + o.org); await pause(EAD_GAP);
          if (r.status === 429) { counts.waits++; await pause(EAD_WAIT); continue; }
          const e = r.ok ? parseEntry(r.text, o.org) : null;
          await store.setJSON('e/' + o.org, { ...(e || { org: o.org, missing: true }), name: o.name, kind: o.kind, at: now() });
          counts.entries++;
        }
        job.i++; await keep(); continue;
      }
      if (job.phase === 'read') {
        const todo = job.only ? job.list.filter(o => o.org === job.only) : job.list;
        if (job.i >= todo.length) { job.phase = 'pack'; await keep(); continue; }
        const o = todo[job.i], e = await store.get('e/' + o.org, { type: 'json' });
        if (e && !e.missing) await store.setJSON(`r/${slug}/${o.org}`, await readChurch(e, store, slug));
        counts.churches++; job.i++; await keep(); continue;
      }
      if (job.phase === 'pack') {
        const churches = [];
        for (const o of job.list) {
          const e = await store.get('e/' + o.org, { type: 'json' }), r = await store.get(`r/${slug}/${o.org}`, { type: 'json' });
          if (!e || e.missing) continue;
          const { at, ...entry } = e; churches.push({ ...entry, ...(r || { read: null }) });
        }
        await store.setJSON('c/' + slug, { v: 1, fn: FN, conf: job.conf, org: job.org, read: today(), at: now(), churches,
          places: !!PLACES_KEY(), search: !!SEARCH_KEY() });
        job.status = 'done'; job.phase = 'done'; job.finished = now(); job.lease = 0; await keep();
        logLine({ ok: true, slug, code: 'done', churches: churches.length, ...counts });
        return 'done';
      }
      throw new Error('phase');
    }
    job.lease = 0; await keep();
    const woke = await wakeSelf(base, slug, worker);
    logLine({ ok: true, slug, code: woke ? 'continued' : 'stalled', phase: job.phase, i: job.i, ...counts });
    return woke ? 'continued' : 'stalled';
  } catch (e) {
    const code = String(e && e.message || 'error').slice(0, 20);
    if (code !== 'lost') { try { job.lease = 0; job.errors = (job.errors || 0) + 1; if (job.errors >= 5) job.status = 'failed'; await save(store, key, job, etag); } catch { /* the front rescues it */ } }
    logLine({ ok: false, slug, code, phase: job.phase, ...counts });
    return 'error';
  }
}

export default async (request) => {
  try {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    const raw = await request.text();
    if (raw.length > 300) return new Response(null, { status: 400 });
    let b; try { b = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
    if (!isPlain(b) || !RE_SLUG.test(String(b.slug || '')) || !RE_TOKEN.test(String(b.worker || ''))) return new Response(null, { status: 400 });
    await runJob(b.slug, b.worker, request.url);
  } catch {
    logLine({ ok: false, code: 'worker-error' });
  }
  return new Response(null, { status: 202 });
};
export { RE_ORG };
