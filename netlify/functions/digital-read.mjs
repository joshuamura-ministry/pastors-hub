// Terrain · Digital footprint, the reader (background).                    digital-read-1.0
//
// v10.60.0 (DESIGN-DIGITAL.md, Terrain-work/v77). The pastor (7 Oct 2026): "I would like to see all the churches in the conference
// that you choose … websites, Facebook pages … YouTube … checked to see if they're up-to-date … Where do we show up in Google search
// in maps and ratings"; "this should know the name already of the pastor and it will search whether the pastor's name is actually even
// there"; "make sure we're not missing something so we don't accuse them of something that's not really happening"; "the website is
// huge, Google search and maps are very very important more than Facebook … a little information on Facebook Instagram without
// breaching anything".
//
// What it reads, for one conference (digital.mjs queues the job in Netlify Blobs, store "terrain-digital", key j/<slug>, and wakes this
// function with { slug, worker }):
//  1. the official list: every church, company and group of the conference on eAdventist (the North American Division's church
//     locator) and each one's entry (pastor, staff, website, phone, address, members, the date it was updated). The locator allows a
//     page every few seconds: one page each 3 s, a pause when it says "retry later";
//  2. each church's website as a visitor reads it (the home page and up to 13 pages a visitor looks at, and the words a template site
//     keeps inside its scripts), obeying robots.txt, under its own name (TerrainBot);
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

export const FN = 'digital-read-1.0';
const STORE_NAME = 'terrain-digital';
export const UA = 'Mozilla/5.0 (compatible; TerrainBot/1.0; +https://terrain.church)';
const EAD = 'https://www.eadventist.net/search/organization?locale=en&org=';
export const BUDGET_MS = 12.5 * 60e3;
const RE_SLUG = /^[a-z][a-z-]{1,40}$/, RE_TOKEN = /^[A-Za-z0-9_-]{43}$/, RE_ORG = /^AN[A-Z0-9]{4}$/;
const EAD_GAP = 3000, EAD_WAIT = 30000;

/* the church locator's code of each NAD conference, by the name Terrain registers pastors under (eAdventist, read 7 Oct 2026) */
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
  'Arkansas-Louisiana': 'ANW411', 'Oklahoma': 'ANW811', 'Southwest Region': 'ANWB11', 'Texas': 'ANWF11', 'Texico': 'ANWI11' };
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
function newestDate(t) {
  const out = [];
  for (const m of t.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d\d)\b/gi)) out.push(`${m[3]}-${String(MON[m[1].toLowerCase().slice(0, 3)]).padStart(2, '0')}-${m[2].padStart(2, '0')}`);
  const lim = daysAgo(-366);
  return out.filter(d => /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d) && d <= lim).sort().pop() || null;
}
const surname = n => { const w = String(n || '').replace(/\b(Jr|Sr|II|III|IV)\.?$/i, '').replace(/[.,]/g, ' ').trim().split(/\s+/).filter(Boolean); return w.length ? w[w.length - 1] : ''; };
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const NW = "(?:[A-Z][a-zà-ÿ'’\\-]+|[A-Z]\\.)";
const STOP = /^(Our|Meet|The|Welcome|Contact|Your|From|With|About|Senior|Lead|District|Local|Associate|Youth|Head|Former|Dear|Message|Corner|Page|Appreciation|Search|Pastors?|Church|Sabbath|Elder|Bible|Women|Men|Ministry|Ministries|Prayer|Team|Home|Staff|Leaders?|Online|Join|Visit|Resources|Services|Phone|Email|Office|Mobile|Location|Website|Site|Address)$/;
/* people called pastor on a page, and the pages they are named on */
export function pastorsIn(per) {
  const found = new Map();
  const add = (n, former, path) => {
    let w = n.replace(/\s+/g, ' ').trim().split(' ');
    while (w.length && STOP.test(w[w.length - 1])) w.pop();
    if (w.length < 2 || w.some(x => STOP.test(x)) || w.every(x => /^[A-Z]\.$/.test(x))) return;
    const name = w.slice(0, 3).join(' '), k = fold(surname(name)).toLowerCase(), o = found.get(k) || { name, former: false, pages: new Set() };
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
const PAGES = /(about|pastor|staff|leader|team|who-we-are|our-church|meet|contact|visit|new-here|welcome|live|watch|online|join|location|directions|find-us|connect|info|prayer|bible|services|worship|times|beliefs?)/i;
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
export async function website(listed, maxPages = 13, pastorName = '') {
  let r = null; const tried = [];
  for (const u of variants(listed)) { tried.push(u); r = await get(u); if (r.ok && r.text.trim().length > 20) break; }   // any page with words opens
  if (!r || !r.ok || r.text.trim().length <= 20) {
    const refused = r && [401, 403, 429, 503].includes(r.status);
    return { listed: clip(listed, 200), opens: false, refused, status: r ? r.status : 0, err: r && r.err ? clip(r.err, 30) : null };
  }
  const base = r.url, rules = await robotsFor(base);
  if (!robotsAllow(rules, '/')) return { listed: clip(listed, 200), url: base, opens: true, blocked: true };
  const pages = [{ path: new URL(base).pathname || '/', h: r.text }];
  const links = [...new Set([...r.text.matchAll(/href="([^"#]+)"/gi)].map(m => safeUrl(m[1], base)).filter(Boolean).map(u => u.replace(/\/+$/, ''))
    .filter(u => hostOf(u) === hostOf(base) && PAGES.test(new URL(u).pathname) && !/\.(css|js|png|jpe?g|gif|svg|webp|xml|json|php|pdf|ico)$|wp-json|feed|xmlrpc/i.test(u)
      && !/\/(20\d\d|blog|news|post|posts|tag|category|author|page|feed|wp-|events?\/\d)/.test(new URL(u).pathname) && robotsAllow(rules, new URL(u).pathname)))]
    .sort((a, b) => (/pastor|staff|leader|team|contact|join|visit/.test(b) ? 1 : 0) - (/pastor|staff|leader|team|contact|join|visit/.test(a) ? 1 : 0)).slice(0, maxPages);
  for (const u of links) { const p = await get(u, { max: 1.5e6 }); if (p.ok) pages.push({ path: new URL(p.url).pathname, h: p.text }); await pause(150); }
  const per = pages.map(p => ({ path: p.path.replace(/\/+$/, '') || '/', t: textOf(p.h) })), txt = per.map(p => p.t).join(' \n '), all = pages.map(p => p.h).join('\n');
  const vis = pages.map(p => visOf(p.h)).join(' \n ') + ' ' + [...all.matchAll(/href="tel:([^"]+)"/gi)].map(m => ' ' + decodeURIComponent(m[1]).replace(/^\+?1/, '') + ' ').join(' ');
  const phones = [...new Set([...vis.matchAll(/\(?\b(\d{3})\)?[\s.-](\d{3})[\s.-](\d{4})\b/g)].map(m => `${m[1]}-${m[2]}-${m[3]}`))].slice(0, 6);
  const snw = fold(surname(pastorName)).replace(/[^A-Za-z'’-]/g, ''), sn = snw.length > 1 ? new RegExp('\\b' + snw + '\\b', 'i') : null;
  const years = [...new Set([...txt.matchAll(/(?:©|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)/gi)].map(m => m[1]))].sort();
  return {
    listed: clip(listed, 200), url: base, opens: true, https: base.startsWith('https:'), mobile: /name=["']viewport["']/i.test(r.text),
    title: clip(ent((r.text.match(/<title[^>]*>([^<]*)/i) || [])[1] || ''), 160), template: /\/_next\//.test(r.text) ? 'scripts' : /acc-themes/.test(r.text) ? 'frame' : null,
    pagesRead: per.map(p => p.path).slice(0, 14), pastors: pastorsIn(per), newestDate: newestDate(txt), copyright: years.pop() || null,
    serviceTimes: /\b(8|9|10|11|12):\d\d\s*(a\.?\s?m)/i.test(txt) || /\b(9|10|11)\s*(a\.?\s?m)\b/i.test(txt), phones,
    bibleStudy: /bible (study|studies|class|school|info)|free bible|request (a )?bible|discover (the )?bible|bible guide|bible lessons/i.test(txt),
    prayerRequest: /prayer request|request (a )?prayer|how can we pray|need prayer/i.test(txt),
    giving: /adventistgiving|give online|online giving|tithe|donate/i.test(all), visitors: /plan (a|your) (first )?visit|new here|first time|visitor|what to expect/i.test(txt),
    social: social(all, base),
    // the pages that name the listing's pastor (his surname); the page checks a registered pastor's own name against "pastors"
    pastorNamed: sn ? per.filter(p => sn.test(fold(p.t))).map(p => p.path).slice(0, 8) : null
  };
}

// ---------------------------------------------------------------- YouTube (the public feed: no key)
const KIND = [['series', /revelation|daniel|prophec|second coming|seminar|bible study|discover|series|evangelis|night \d|\b\d{1,2}\s*-\s/i],
  ['worship', /praise|worship|divine (hour|service)|sabbath (service|worship)|livestream|live stream|\blive\b|song service|hymn/i],
  ['event', /festival|baptism|wedding|funeral|memorial|concert|graduation|pathfinder|vbs|camp|day\b/i]];
export async function youtube(u) {
  const r = await get(u); if (!r.ok) return { url: u, read: false };
  const id = (r.text.match(/"externalId":"(UC[\w-]{22})"/) || r.text.match(/channel\/(UC[\w-]{22})/) || [])[1]; if (!id) return { url: u, read: false };
  const f = await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + id); if (!f.ok) return { url: u, read: false, id };
  const vids = [...f.text.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(m => ({ t: clip(ent((m[0].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''), 140),
    d: ((m[0].match(/<published>([^<]+)/) || [])[1] || '').slice(0, 10), v: +((m[0].match(/views="(\d+)"/) || [])[1] || 0) }));
  const kinds = { sermon: 0, series: 0, worship: 0, event: 0 }; for (const v of vids) kinds[(KIND.find(([, re]) => re.test(v.t)) || ['sermon'])[0]]++;
  return { url: u, read: true, id, latest: vids[0] || null, inFeed: vids.length, last30: vids.filter(x => x.d >= daysAgo(30)).length,
    last90: vids.filter(x => x.d >= daysAgo(90)).length, avgViews: vids.length ? Math.round(vids.reduce((a, x) => a + x.v, 0) / vids.length) : null, kinds,
    titles: vids.slice(0, 3) };
}

// ---------------------------------------------------------------- Google's listing (Places API (New), Text Search)
const PLACES_FIELDS = 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.businessStatus,places.googleMapsUri,places.regularOpeningHours.weekdayDescriptions';
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
    hours: Array.isArray(p.regularOpeningHours && p.regularOpeningHours.weekdayDescriptions) ? p.regularOpeningHours.weekdayDescriptions.slice(0, 7).map(x => clip(x, 60)) : null };
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
export async function readChurch(e, store) {
  const res = { org: e.org, read: today() };
  res.site = e.website ? await website(e.website, 13, e.pastor || '') : null;
  const siteHost = res.site && res.site.opens && res.site.url ? hostOf(res.site.url) : null;
  const sr = await search(e, store); res.search = sr.read ? { read: true } : { read: false, why: sr.why };
  const f = sift(sr, e, siteHost); res.search.ownAt = f.ownAt; res.dirPastors = f.dirPastors;
  if (f.website && hostOf(f.website) !== siteHost) { const w = await website(f.website, 2); if (w.opens && !w.blocked) res.otherSite = { url: w.url, title: w.title, phones: w.phones, pastors: w.pastors, social: w.social }; }
  const s = (res.site && res.site.opens && res.site.social) || (res.otherSite && res.otherSite.social) || {};
  res.facebook = s.facebook ? { url: s.facebook, from: 'site', followers: f.facebook && hostOf(f.facebook.url) === hostOf(s.facebook) ? f.facebook.followers : null } : f.facebook ? { ...f.facebook, from: 'search' } : null;
  res.instagram = s.instagram ? { url: s.instagram, from: 'site' } : f.instagram ? { ...f.instagram, from: 'search' } : null;
  const yt = s.youtube || f.youtube; res.youtube = yt ? { ...(await youtube(yt)), from: s.youtube ? 'site' : 'search' } : null;
  res.google = await google(e, store);
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
        if (e && !e.missing) await store.setJSON(`r/${slug}/${o.org}`, await readChurch(e, store));
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
