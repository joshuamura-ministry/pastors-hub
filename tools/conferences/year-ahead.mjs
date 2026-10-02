// The year ahead: the next 12 months (from the check month) for every US conference. Called by build.mjs.
// (Ported from the v52 sample's compare/build-year-ahead.mjs, 1 Oct 2026; the logic is unchanged. What changed: the paths
// come from the caller, the dates from src/config.json, the published-to table from src/through.json, and Chesapeake's
// feed is read from src/feeds/chesapeake.json, made from the public .ics by feed.mjs.)
// Inputs (read only, under src/): events/*.json (first pass, to firstPassTo), ahead/*.json (look-ahead after firstPassTo,
// plus first-window items the first pass missed), ahead/above.json (NAD and world-church dates and deadlines),
// feeds/chesapeake.json (Chesapeake's public feed, used to fill the months to firstPassTo, which the first pass left almost empty).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { windowsOf } from './window.mjs';

let EV, AH, SRC;
const rd = p => JSON.parse(readFileSync(p, 'utf8'));

// ---------- fixed definitions (the dates come from src/config.json, set by buildYearAhead) ----------
let TODAY, FROM, TO, MONTHS, FIRST_TO, THROUGH;
const CATS = ['evangelism-outreach', 'pastoral-leadership', 'discipleship-spiritual', 'youth-young-adults', 'pathfinders', 'children', 'family-women-men', 'health', 'community-service', 'education', 'camp-meeting', 'music-worship-arts', 'stewardship-finance', 'multilingual', 'other', 'administration'];
const UNION_FILE = { 'Atlantic Union': 'union-atlantic', 'Columbia Union': 'union-columbia', 'Lake Union': 'union-lake', 'Mid-America Union': 'union-mid-america', 'North Pacific Union': 'union-north-pacific', 'Pacific Union': 'union-pacific', 'Southern Union': 'union-southern', 'Southwestern Union': 'union-southwestern' };
const UNION_NORM = u => { const s = String(u || ''); if (/North Pacific/.test(s)) return 'North Pacific Union'; if (/^Pacific/.test(s)) return 'Pacific Union'; if (/Southwestern/.test(s)) return 'Southwestern Union'; if (/^Southern/.test(s)) return 'Southern Union'; for (const k of Object.keys(UNION_FILE)) if (s.startsWith(k.split(' ')[0])) return k; return s; };

// How far each conference's own calendar is published: src/through.json (department-only calendars, such as youth, clubs,
// schools and camps, do not count). An empty month inside this range means "nothing listed"; a month after it means
// "not published yet". null = the conference publishes no calendar at all. Each line gives the reason (EN and ES).

// Title corrections found in review (1 Oct 2026). Key: slug|title|start in the window.
const TITLE_FIX = {
  // paconference.org/events lists "17 - Hispanic Youth Rally Zone 6"; zones 1-5 met earlier in 2026
  'pennsylvania|Hispanic Youth Rally (zones 1–6)|2026-10-17': 'Hispanic Youth Rally (zone 6)',
};

// Records that list two or three meetings a year apart without a date list (the dates are only in the record's note).
// Without this, the meeting inside the window showed in October as "since <last year>". Key: slug|title|record start.
// Each value is the meeting(s) inside Oct 2026 – Sep 2027, read from the record's own note (GCC dates also match the
// events.gccsda.com data saved by the gatherer in work/sou/raw/gcc-hyd.json).
const DATES_FIX = {
  "arkansas-louisiana|'United Through Discipleship' regional training series (6 sites)|2026-03-28": { start: '2026-12-12' },
  "carolina|Hispanic Children's Ministry zone trainings (pre-semester)|2026-01-24": { start: '2027-01-23' },
  'georgia-cumberland|Church Ministries Training|2025-12-06': { start: '2026-12-05' },
  'georgia-cumberland|Elders Training (preaching workshop)|2025-12-05': { start: '2026-12-11', end: '2026-12-13' },
  'georgia-cumberland|LEADS Leadership Training (Reach Your Neighbor Bible-study leads)|2025-11-09': { start: '2026-11-08' },
  'georgia-cumberland|Pathfinder Junior Event|2025-12-05': { start: '2026-12-04', end: '2026-12-06' },
  'georgia-cumberland|Pathfinder Teen Challenge|2025-10-31': { start: '2026-11-06', end: '2026-11-08' },
  'georgia-cumberland|South Georgia Camp Meeting|2025-11-14': { start: '2026-11-13', end: '2026-11-14' },
  'south-atlantic|Armed Forces / Veterans Emphasis Day|2026-05-02': { start: '2026-11-07', end: '2026-11-14', dates: ['2026-11-07', '2026-11-14'] },
  'south-atlantic|Personal Ministries Day|2026-05-09': { start: '2026-10-31' },
  "south-atlantic|SAC Women's Leadership Training / Meeting|2026-04-23": { start: '2026-10-22' },
  "south-central|African - Haitian - Korean Pastors' Meeting|2026-01-21": { start: '2026-10-19' },
  "south-central|Hispanic / Latino Pastors' Meeting|2026-01-22": { start: '2026-10-20' },
  "texico|Ministers' meetings|2025-12-08": { start: '2026-12-07' },
  'florida|Fundraising Workshops (quarterly)|2026-02-22': { start: '2026-11-08' },
  'arkansas-louisiana|Pastoral development meeting|2025-11-04': { start: '2026-10-13' },
  'rocky-mountain|Conference town hall meetings (constituency preparation; nominating committee selection in 2027)|2026-08-12': { start: '2027-03-14', end: '2027-03-21', dates: ['2027-03-14', '2027-03-21'] },
};

// ---------- text helpers ----------
// two token sets: a broad one for matching a conference's copy of a NAD/world date to above.json, a narrow one for spotting repeats
const STOP = new Set('the and for with from nad gc world global day days sabbath level division union conference final finals annual international event events 2026 2027 meeting meetings church adventist seventh'.split(' '));
const STOP2 = new Set('the and for with from 2026 2027'.split(' '));
const stem = w => w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
function toks2(t) {
  return String(t || '').toLowerCase().replace(/[’'`]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 1 && !STOP2.has(w)).map(stem);
}
// Jaccard overlap: used for repeats inside one lane (a shared generic word such as "camp" is not enough)
function jac(a, b) { const A = new Set(toks2(a)), B = new Set(toks2(b)); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); }
function overlap(a, b) { const A = new Set(toks(a)), B = new Set(toks(b)); let n = 0; for (const x of A) if (B.has(x)) n++; return { n, small: Math.min(A.size, B.size), big: Math.max(A.size, B.size) }; }
function toks(t) {
  return String(t || '').toLowerCase().replace(/\bpbe\b/g, 'pathfinder bible experience').replace(/end ?it ?now/g, 'enditnow').replace(/\b(10|ten) days\b/g, 'tendays').replace(/[’'`]/g, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 2 && !STOP.has(w)).map(stem);
}
function sim(a, b) { const A = new Set(toks(a)), B = new Set(toks(b)); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.min(A.size, B.size); }
const day = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s)) ? s.slice(0, 10) : (typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)) ? s + '-01' : null;
const monthOf = s => (typeof s === 'string' && /^\d{4}-\d{2}/.test(s)) ? s.slice(0, 7) : null;
const dd = (a, b) => Math.abs((new Date(day(a)) - new Date(day(b))) / 864e5);
const addMonths = (m, n) => { let [y, mm] = m.split('-').map(Number); mm += n; while (mm < 1) { mm += 12; y--; } while (mm > 12) { mm -= 12; y++; } return `${y}-${String(mm).padStart(2, '0')}`; };
const clean = t => String(t || '').replace(/\s+/g, ' ').trim();
const bare = t => clean(String(t || '').replace(/\([^)]*\)/g, '')).toLowerCase(); // a title without its notes in brackets

// ---------- what to leave out of the timeline ----------
const INTERNAL_KIND = new Set(['committee', 'logistics', 'camp maintenance', 'staff training', 'deadline']);
const INTERNAL_TITLE = /\b(committee|adcom|advisory|board meeting|team meeting|staff meeting|staff worship|officers'? meeting|employee orientation|executive officers)\b/i;
const ADMIN_TITLE = /\b(board|boards|bot|excom|executive (committee|meeting|session)|presidents[’']? (council|retreat)|presidents of|officers[’']? council|(nad|mauc|union)\b.*year[- ]end|year[- ]end (session|meetings? and)|departmental (meetings?|council)|administrative (meeting|council)|administration and departmental|treasury|month-end|payroll|pay ?day|office (closed|closes|picnic|worship|staff|retreat|week|christmas)|(offices?|schools?) (closed|closes)|audit|accreditation|in-?service|testing|human resources|hr conference|secretariat|principals?[’']? council|principals?[’']?\b.*\bcouncils?|administrators?[’']? council|superintendents[’']? zoom|reports? due|personnel|risk control|staff (retreat|week)|school (resumes|year begins)|first day of school|spring break|daylight)\b/i;
// a training, town hall or celebration stays even when its title names a board or committee (church members attend these)
const KEEP_TITLE = /\b(training|town halls?|summit|seminar|celebration|banquet|dinner|showcase)\b/i;
function leaveOut(e) {
  if (e.status === 'cancelled' || /\bCANCELLED\b/.test(e.note || '')) return 'cancelled';
  if (e.internal === true) return 'internal';
  if (INTERNAL_KIND.has(e.kind)) return 'internal';
  if ((INTERNAL_TITLE.test(e.title || '') || ADMIN_TITLE.test(e.title || '')) && !KEEP_TITLE.test(e.title || '')) return 'internal';
  return null;
}
function laneOf(level) {
  const s = String(level || '').toLowerCase();
  if (s === 'union') return 'union';
  if (['division', 'nad'].includes(s)) return 'nad';
  if (['gc', 'general-conference'].includes(s)) return 'world';
  if (s === 'observance') return 'obs';
  return 'conf';
}
function levelTag(level) {
  const s = String(level || '').toLowerCase();
  if (['conference', 'joint', 'area', 'group'].includes(s)) return 'conference';
  if (['institution', 'school'].includes(s)) return 'school';
  if (['local-church', 'church'].includes(s)) return 'local church';
  if (s === 'union') return 'union';
  if (['division', 'nad'].includes(s)) return 'NAD';
  if (['gc', 'general-conference'].includes(s)) return 'world church';
  if (s === 'observance') return 'observance';
  return 'other';
}
function precOf(e) {
  const p = String(e.datePrecision || '').toLowerCase();
  if (/^season/.test(p) || /season/.test(p) && !/day/.test(p)) return 'season';
  if (/^month/.test(p)) return 'month';
  if (typeof e.start === 'string' && /^\d{4}-\d{2}$/.test(e.start)) return 'month';
  return 'day';
}

// ---------- turn one source record into a timeline item (or null) ----------
function occurrences(e) {
  if (Array.isArray(e.dates) && e.dates.length && typeof e.dates[0] === 'string') return e.dates.map(day).filter(Boolean).sort();
  if (Array.isArray(e.ranges) && e.ranges.length) return e.ranges.map(r => day(String(r).split('/')[0])).filter(Boolean).sort();
  return null;
}
function toItem(e, src, extra = {}) {
  const title = clean(e.title || e.name || e.what);
  if (!title || !e.url) return null;
  const s = day(e.start), en = day(e.end) || s;
  if (!s) return null;
  const occ = occurrences(e);
  const count = e.count || (occ ? occ.length : 1);
  const recurring = !!e.recurring || count > 1;
  let inWin, first, dates = null;
  if (occ && occ.length) {
    dates = occ.filter(d => d >= FROM && d <= TO);
    // a multi-day range that starts before the window can still run into it
    inWin = dates.length > 0 || (s < FROM && en >= FROM && !e.recurring);
    first = dates.length ? dates[0] : (s < FROM ? FROM : s);
  } else {
    inWin = s <= TO && en >= FROM;
    first = s < FROM ? FROM : s;
  }
  if (!inWin) return null;
  // how long the series runs inside the window (a record's own end date is often just its first meeting's end)
  const span = dates && dates.length > 1 ? dd(dates[0], dates[dates.length - 1]) : dd(s, en);
  // an open-ended series (a weekly prayer call with no end date) is a regular meeting too
  const openEnded = recurring && !e.end && count >= 4;
  // a regular meeting: at least 3 of its dates fall in the window (or, without a date list, 4+ meetings), spread over 2+ months
  const regular = recurring && (dates ? dates.length >= 3 : (count >= 4 || openEnded)) && (span >= 60 || openEnded);
  // for a record with several dates, show the dates that fall in the window
  let st = s, enOut = en;
  if (dates && dates.length) {
    st = dates[0];
    if (dates.length === 1) { const len = en >= s ? dd(s, en) : 0; enOut = len <= 14 ? new Date(new Date(st + 'T12:00:00Z').getTime() + len * 864e5).toISOString().slice(0, 10) : st; }
    else enOut = en >= dates[dates.length - 1] ? en : dates[dates.length - 1];
  }
  const it = {
    title, start: st, end: enOut === st ? null : enOut, first, category: CATS.includes(e.category) ? e.category : 'other', category2: e.category2 || null,
    level: levelTag(e.level), lane: laneOf(e.level), url: e.url, place: e.place || null, prec: precOf(e), src,
  };
  if (regular) { it.regular = true; it.count = dates && dates.length ? dates.length : null; if (dates && dates.length) it.dates = dates; if (!occ) it.until = openEnded ? null : en; if (openEnded) it.openEnded = true; }
  else if (count > 1) { it.count = dates && dates.length ? dates.length : count; if (dates && dates.length > 1) it.dates = dates; }
  if (s < FROM && !regular && !(dates && dates.length)) it.since = s;
  if (e.tentative) it.tentative = true;
  if (e.confirmed === false || e.computed) it.unconfirmed = true;
  if (e.projected) it.projected = true;
  if (e.registrationDeadline) it.registrationDeadline = day(e.registrationDeadline) || e.registrationDeadline;
  if (e.registrationOpens) it.registrationOpens = day(e.registrationOpens) || e.registrationOpens;
  if (e.kind) it.kind = e.kind;
  if (e.observance === true || e.kind === 'emphasis-day') it.observance = true;
  Object.assign(it, extra);
  return it;
}

// ---------- the build: one call, everything from src/ ----------
// src: the src/ folder; cfg: src/config.json unless given (the tests move the check date). Returns { out, lines }: out is the year ahead (what year-ahead.json held in the sample), lines the
// builder's report (one line per conference, and any CHECK DATES warning).
export function buildYearAhead(src, cfg) {
SRC = src; EV = join(SRC, 'events'); AH = join(SRC, 'ahead');
const W = windowsOf(cfg || rd(join(SRC, 'config.json')));
TODAY = W.TODAY; FROM = W.FROM; TO = W.TO; MONTHS = W.AHEAD12; FIRST_TO = W.FIRST_TO;
const FIRST_TO_M = FIRST_TO.slice(0, 7);
const TH = rd(join(SRC, 'through.json'));
THROUGH = Object.fromEntries(Object.entries(TH).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, [v.through, v.en, v.es]]));
const lines = [];
const warn = (...a) => lines.push(a.join(' '));
// ---------- above the conference (NAD and world church) ----------
const ABOVE = rd(join(AH, 'above.json'));
const MINOR_KIND = new Set(['emphasis-day', 'emphasis-week', 'emphasis-month', 'offering', 'meeting']);
const shared = { nad: [], world: [] };
for (const e of ABOVE.events) {
  const it = toItem(e, 'above');
  if (!it) continue;
  if (e.kind === 'repeating') { it.regular = true; it.count = 12; it.until = day(e.end); }
  it.lane = e.level === 'division' ? 'nad' : 'world';
  it.level = e.level === 'division' ? 'NAD' : 'world church';
  if (MINOR_KIND.has(e.kind) || (e.kind === 'prayer' && (!e.end || e.end === e.start))) it.minor = true;
  if (e.note) it.note = clean(e.note).slice(0, 220);
  shared[it.lane].push(it);
}
const aboveAll = shared.nad.concat(shared.world);
// the same NAD or world-church date as listed on a conference or union calendar: best candidate by shared words, then by date
function matchAbove(it) {
  let best = null;
  for (const a of aboveAll) {
    const d = dd(a.first || a.start, it.first || it.start), sameMonth = a.prec !== 'day' && monthOf(a.first || a.start) === monthOf(it.first || it.start);
    const s = overlap(a.title, it.title);
    const ok = s.n >= 2 ? (d <= 12 || sameMonth) : (s.n === 1 && s.small === 1 && (d <= 7 || sameMonth));
    if (!ok) continue;
    const j = s.n / (s.small + s.big - s.n);
    if (!best || s.n > best.s.n || (s.n === best.s.n && (j > best.j || (j === best.j && d < best.d)))) best = { a, s, d, j };
  }
  return best ? best.a : null;
}

// ---------- deadlines ----------
function dlItem(d, scope, src) {
  const date = day(d.date || d.start);
  const title = clean(d.title || d.name || d.what || d.label);
  if (!date || !title || !d.url) return null;
  if (date < TODAY || date > TO) return null;
  const it = { title, date, url: d.url, kind: d.kind || null, level: d.level || scope, src, prec: String(d.datePrecision || '').startsWith('month') ? 'month' : 'day' };
  if (d.confirmed === false || d.computed) it.unconfirmed = true;
  if (d.what) it.what = clean(d.what).slice(0, 200);
  if (d.appliesTo) it.appliesTo = d.appliesTo;
  return it;
}
const deadlinesAll = ABOVE.deadlines.map(d => dlItem(d, d.level, 'above')).filter(Boolean);

// ---------- conferences ----------
const files = readdirSync(EV).filter(f => f.endsWith('.json')).sort();
const unionItems = {}; // union -> items (shared by its conferences)
const unionDeadlines = {};
const unionUndated = {};
const confs = {};
const left = {}; // what was left out, for the notes
const tally = (slug, why, t) => { left[slug] = left[slug] || {}; left[slug][why] = (left[slug][why] || 0) + 1; if (process.env.SHOWLEFT) console.error('LEFT', slug, '|', why, '|', t); };

function pushUnion(u, it) {
  const list = unionItems[u] = unionItems[u] || [];
  if ((it.level === 'other' || it.level === 'school') && matchAbove(it)) return;
  // union business meetings are left out; a constituency session or convention stays (churches send delegates)
  if (it.category === 'administration' && !/constituency|session|town hall|convention|convocation/i.test(it.title)) return;
  if (it.regular) { const same = list.find(x => x.regular && clean(x.title).toLowerCase() === clean(it.title).toLowerCase()); if (same) { same.dates = [...new Set((same.dates || []).concat(it.dates || []))].sort(); same.count = same.dates.length || same.count; if (same.dates.length) { same.first = same.dates[0]; same.start = same.dates[0]; same.end = same.dates[same.dates.length - 1]; } if (it.openEnded) same.openEnded = true; return; } }
  const dup = list.find(x => { const s = overlap(x.title, it.title); return (s.n >= 2 && s.n / s.small >= 0.6 && dd(x.start, it.start) <= 3) || (s.n >= 1 && s.n === s.big && dd(x.start, it.start) <= 3) || (clean(x.title).toLowerCase() === clean(it.title).toLowerCase() && dd(x.start, it.start) <= 31); });
  if (dup) { if (!dup.alsoUrl && dup.url !== it.url) dup.alsoUrl = it.url; return; }
  it.lane = 'union';
  list.push(it);
}

// Chesapeake: the first pass could not read its calendar, so the months to firstPassTo come from the same public feed the look-ahead used.
function chesapeakeFeed() {
  const occ = rd(join(SRC, 'feeds', 'chesapeake.json')).occ.filter(o => o.start >= FROM && o.start <= FIRST_TO && o.status !== 'CANCELLED');
  const URL = 'https://ccosda.org/calendar/';
  const M = {
    "Women's Ministries Retreat": ['family-women-men', 'conference'], 'Ministerial Evangelistic Campaign - Spanish': ['evangelism-outreach', 'conference', 'multilingual'],
    'Peacemaker Training': ['pastoral-leadership', 'conference'], 'Preventing Conflict & Peacemaking 4-5': ['pastoral-leadership', 'conference'], 'Preventing Conflict & Peacemaking 6-7': ['pastoral-leadership', 'conference'],
    'Master Guide Camporee': ['pathfinders', 'conference'], 'Columbia Union Small Schools Workshop': ['education', 'union'], 'Eastern Shore Convocation': ['discipleship-spiritual', 'conference'],
    'STEM Festival (Spencerville)': ['education', 'institution'], 'Couples Retreat with NJ Conference - Spanish (Tentative)': ['family-women-men', 'conference', 'multilingual', true],
    'Stewardship Week - Spanish': ['stewardship-finance', 'conference', 'multilingual'], 'Next Step Training Retreat - 4': ['pastoral-leadership', 'conference'],
    'Create and Connect Retreat': ['youth-young-adults', 'conference'], "Hispanic Pastors' Meeting": ['pastoral-leadership', 'conference', 'multilingual'],
    'Leaders Training - By District - Spanish': ['discipleship-spiritual', 'conference', 'multilingual'], 'Pastors and Teachers Meeting': ['pastoral-leadership', 'conference'],
    'ACTS - Module 4': ['evangelism-outreach', 'conference'], 'Proclaim - Module 4': ['evangelism-outreach', 'conference'],
    'Certification of Elders and Small Group Leaders - Spanish': ['discipleship-spiritual', 'conference', 'multilingual'], 'Deacons / Deaconess Training': ['discipleship-spiritual', 'conference'],
    'Mission and Church Growth Council': ['evangelism-outreach', 'conference'], 'Gratitude Day - Spanish': ['stewardship-finance', 'conference', 'multilingual'],
    '10 Days of Prayer': ['discipleship-spiritual', 'observance'], 'Hispanic Youth Retreat': ['youth-young-adults', 'conference', 'multilingual'],
    "Pastors' Zoom Prayer Call": ['pastoral-leadership', 'conference'], 'Create & Connect Retreat': ['youth-young-adults', 'conference'],
    'Pathfinder Area Level PBE': ['pathfinders', 'conference'], "Pastors' Meeting": ['pastoral-leadership', 'conference'], 'TLT Lab': ['pathfinders', 'conference'],
    'Elders Certification': ['discipleship-spiritual', 'conference'], 'Pathfinder Conference Level PBE': ['pathfinders', 'conference'], 'Next Step Training': ['pastoral-leadership', 'conference'],
    'Generation NOW - High School Retreat': ['youth-young-adults', 'conference'], 'Eastern Shore Ministerium': ['pastoral-leadership', 'conference'],
    'Music Festival (HVA)': ['music-worship-arts', 'institution'], 'Children’s & Youth Leaders Enrichment Day': ['children', 'conference'],
    "Women's Day of Prayer": ['family-women-men', 'observance'], 'Southern Ministerium': ['pastoral-leadership', 'conference'], 'Pathfinder Union Level PBE': ['pathfinders', 'union'],
    'Global Youth Day (local church)': ['youth-young-adults', 'observance'], 'Western Ministerium': ['pastoral-leadership', 'conference'],
  };
  // the first pass already has the women's retreat and the Eastern Shore gathering (from news, with better links)
  const SKIP = /^(Women's Ministries Retreat|Eastern Shore Convocation|ADCOM|Board of Education|Indigenous Peoples Day|Curriculum Committee|Columbia Union Early Childhood Education Committee|Columbia Union School Administrators Council|Executive Committee|Personnel Committee|Camp Meeting Committee|HVA Board|Association Board|Education Staff Development|Office|In-House|Thanksgiving|Principal|Christmas|New Year|\*\*TENTATIVE|School Resumes|MAP Testing|MLK|Staff Dev|Dover School|Children’s & Youth Pastor’s Advisory|Baltimore White Marsh|President's Day|CU |WAU Board|3rd Quarter|Spring Break|Full Day Professional|Joint EXCOM|Good Friday|Easter|Deadline for Evangelism Subsidy|Pastors' Meeting \(alternate date\))/;
  const out = [], unknown = [];
  const byTitle = {};
  for (const o of occ) {
    const t = o.summary.trim();
    if (SKIP.test(t)) continue;
    const m = M[t]; if (!m) { unknown.push(t); continue; }
    (byTitle[t] = byTitle[t] || []).push(o);
  }
  if (unknown.length) throw new Error('Chesapeake feed: unsorted titles ' + [...new Set(unknown)].join(' | '));
  for (const [t, list] of Object.entries(byTitle)) {
    const [cat, level, cat2, tent] = M[t];
    const e = { title: t.replace(/ \(Tentative\)$/, ''), start: list[0].start, end: list[list.length - 1].end, category: cat, category2: cat2 && cat2 !== true ? cat2 : null, level, url: URL, tentative: tent === true || cat2 === true || list[0].start >= '2027-01-01' || undefined };
    // the union's own education calendar puts this workshop on 21-22 Feb 2027 (both dates are shown, both to be confirmed)
    if (t === 'Columbia Union Small Schools Workshop') e.confirmed = false;
    if (list.length > 1) { e.count = list.length; e.dates = list.map(o => o.start); e.recurring = true; }
    out.push(e);
  }
  return out;
}

for (const f of files) {
  const slug = f.replace(/\.json$/, '');
  const v = rd(join(EV, f));
  const a = rd(join(AH, f));
  const union = UNION_NORM(v.union);
  const name = String(v.conf).replace(/ Conference$/, '');
  const conf = [], nadOwn = [], worldOwn = [];
  const add = (it, why) => {
    if (!it) return;
    const fix = TITLE_FIX[slug + '|' + it.title + '|' + it.start]; if (fix) it.title = fix;
    if (it.lane === 'union') { pushUnion(union, it); return; }
    if (it.lane === 'nad' || it.lane === 'world' || it.lane === 'obs') {
      const m = matchAbove(it);
      if (m) { tally(slug, 'same as a NAD or world-church date', it.title + ' ' + it.start + ' => ' + m.title + ' ' + m.start); if (dd(m.start, it.start) > 0) (m.otherDates = m.otherDates || []).push({ slug, start: it.start, url: it.url }); return; }
      it.minor = it.lane === 'obs' || it.observance || undefined;
      (it.lane === 'nad' ? nadOwn : worldOwn).push(Object.assign(it, { lane: it.lane === 'nad' ? 'nad' : 'world', listedBy: slug }));
      return;
    }
    // a NAD or world date that a conference lists under "other" or "external" (ASI, a division convention)
    if (it.level === 'other' && matchAbove(it)) { tally(slug, 'same as a NAD or world-church date', it.title + ' ' + it.first); return; }
    // the same repeating meeting from the first pass (Oct – Mar) and the look-ahead (Apr – Sep): one entry, all its dates
    if (it.regular) {
      const same = conf.find(x => x.regular && (clean(x.title).toLowerCase() === clean(it.title).toLowerCase() || bare(x.title) === bare(it.title)));
      if (same) {
        same.dates = [...new Set((same.dates || []).concat(it.dates || []))].sort();
        if (same.dates.length) { same.count = same.dates.length; same.first = same.dates[0]; same.start = same.dates[0]; same.end = same.dates[same.dates.length - 1]; delete same.until; }
        if (it.openEnded) same.openEnded = true; if (it.projected) same.projected = true;
        tally(slug, 'repeat of the same event', it.title + ' (dates merged)'); return;
      }
    }
    // conference lane: drop exact repeats (the first pass and the look-ahead overlap at the edges)
    const dup = conf.find(x => (jac(x.title, it.title) >= 0.75 && dd(x.start, it.start) <= 3) || (clean(x.title).toLowerCase() === clean(it.title).toLowerCase() && dd(x.start, it.start) <= 3));
    if (dup) { tally(slug, 'repeat of the same event', it.title + ' ' + it.start + ' => ' + dup.title + ' ' + dup.start); return; }
    conf.push(it);
  };
  const take = (e, src) => {
    const dfx = DATES_FIX[slug + '|' + clean(e.title) + '|' + e.start];
    if (dfx) { e = { ...e, start: dfx.start, end: dfx.end || dfx.start, count: dfx.dates ? dfx.dates.length : 1, recurring: !!dfx.dates }; if (dfx.dates) e.dates = dfx.dates; else delete e.dates; }
    // a record with several meetings, no date list, and a start before the window would show as "since ..." (see DATES_FIX)
    else if ((e.count || 0) > 1 && (e.count || 0) < 4 && !Array.isArray(e.dates) && !e.ranges && day(e.start) < FROM && day(e.end || e.start) >= FROM && !leaveOut(e) && e.category !== 'administration') warn('CHECK DATES', slug, '|', e.title, '|', e.start, e.end, '|', e.note || '');
    let why = leaveOut(e);
    // repeating office business (category administration) is left out; one-off items such as a constituency session stay
    if (!why && e.category === 'administration' && (e.recurring || (e.count || 0) > 2 || (Array.isArray(e.dates) && e.dates.length > 2)) && !/constituency|session|town hall|convention|convocation/i.test(e.title || '')) why = 'internal';
    if (why) { if (!e.start || day(e.end || e.start) >= FROM) tally(slug, why, e.title + ' ' + e.start); return; }
    add(toItem(e, src));
  };
  // 1. first pass (the part of its window to firstPassTo, plus anything still running)
  for (const e of v.events) if (!e.start || day(e.start) <= FIRST_TO || day(e.end) <= FIRST_TO) take(e, 'first pass');
  // 2. Chesapeake's feed for the same months
  if (slug === 'chesapeake') for (const e of chesapeakeFeed()) take(e, 'calendar feed');
  // 3. look-ahead (the months after firstPassTo, plus a few that start earlier)
  for (const e of a.events || []) { if (e.deadline) continue; take(e, 'look-ahead'); }
  // 4. first-window items the first pass missed
  for (const k of ['alsoOct26toMar27', 'outsideWindow']) for (const e of a[k] || []) {
    if (/registration (2027 )?closes|deadline/i.test(e.title || '')) continue; // these are deadlines, handled below
    take(e, 'look-ahead (missed by the first pass)');
  }

  // ---- deadlines for this conference ----
  const dls = [];
  const addDl = it => { if (!it) return; if (dls.find(x => x.date === it.date && (sim(x.title, it.title) >= 0.4 || (x.kind && x.kind === it.kind)))) return; dls.push(it); };
  for (const d of deadlinesAll) if (d.appliesTo === 'all' || (Array.isArray(d.appliesTo) && d.appliesTo.includes(slug))) addDl({ ...d });
  for (const d of a.prepDeadlines || []) addDl(dlItem(d, 'conference', 'look-ahead'));
  for (const k of ['alsoOct26toMar27', 'outsideWindow']) for (const e of a[k] || []) if (/registration (2027 )?closes|deadline/i.test(e.title || '')) addDl(dlItem({ ...e, date: e.start }, 'conference', 'look-ahead'));

  // ---- expected in the year ahead, no date yet (only items that carry a source link) ----
  const undated = [];
  for (const e of a.events || []) if (!e.start && e.url) undated.push({ title: clean(e.title), url: e.url, note: clean(e.note || '').slice(0, 160) || null });
  for (const e of a.undatedAhead || []) if (e.url) undated.push({ title: clean(e.title), url: e.url, note: clean(e.expected || '').slice(0, 160) || null });
  for (const e of a.plannedUndated || []) if (e.url && String(e.year) === TO.slice(0, 4)) undated.push({ title: clean(e.title), url: e.url, note: clean(e.what || '').slice(0, 160) || null });
  for (const e of a.notYetPublished || []) if (e.url && typeof e === 'object') undated.push({ title: clean(e.what), url: e.url, note: clean(e.usual || '').slice(0, 160) || null });

  const [through, throughNote, throughNoteEs] = THROUGH[slug] || (() => { throw new Error('src/through.json has no line for ' + slug); })();
  confs[slug] = { slug, name, union, through, throughNote, throughNoteEs, conf, nadOwn, worldOwn, deadlines: dls, undated, aheadFile: `tools/conferences/src/ahead/${f}`, aheadSummary: clean(a.aheadSummary || a.furthestNote || '').slice(0, 600), gathererFurthest: a.furthestPublished || null };
}

// ---- union files: union lane, union deadlines, first-window union items ----
for (const [u, file] of Object.entries(UNION_FILE)) {
  const x = rd(join(AH, file + '.json'));
  for (const e of x.events || []) {
    if (e.deadline) { (unionDeadlines[u] = unionDeadlines[u] || []).push(dlItem({ ...e, date: e.start, kind: /camporee/i.test(e.title) ? 'camporee' : e.kind }, 'union', 'look-ahead')); continue; }
    if (leaveOut(e)) continue;
    const it = toItem(e, 'look-ahead'); if (!it) continue;
    if (it.lane === 'nad' || it.lane === 'world') {
      if (matchAbove(it)) continue;
      // a NAD or world date seen only on this union's calendar: shown to its conferences in the NAD lane
      for (const c of Object.values(confs)) if (c.union === u) c.nadOwn.push({ ...it, lane: it.lane, listedBy: file, minor: it.minor });
      continue;
    }
    if (it.lane === 'obs') continue;
    pushUnion(u, { ...it, level: it.level === 'conference' ? 'union' : it.level });
  }
  for (const k of ['outsideWindow', 'alsoOct26toMar27', 'earlierUnionEvents']) for (const e of x[k] || []) {
    if (leaveOut(e) || /deadline/i.test(e.title || '')) continue;
    const it = toItem(e, 'look-ahead (missed by the first pass)'); if (!it) continue;
    pushUnion(u, { ...it, level: it.level === 'conference' ? 'union' : it.level, lane: 'union' });
  }
  for (const d of (x.prepDeadlines || []).concat(x.deadlines || [])) { const it = dlItem(d, 'union', 'look-ahead'); if (it) (unionDeadlines[u] = unionDeadlines[u] || []).push(it); }
  for (const e of x.undatedAhead || []) if (e.url) (unionUndated[u] = unionUndated[u] || []).push({ title: clean(e.title), url: e.url, note: clean(e.expected || '').slice(0, 160) || null });
  for (const e of x.plannedUndated || []) if (e.url && String(e.year) === TO.slice(0, 4)) (unionUndated[u] = unionUndated[u] || []).push({ title: clean(e.title), url: e.url, note: clean(e.what || '').slice(0, 160) || null });
  for (const e of x.notYetPublished || []) if (e.url && typeof e === 'object') (unionUndated[u] = unionUndated[u] || []).push({ title: clean(e.what), url: e.url, note: clean(e.usual || '').slice(0, 160) || null });
}
// ---- one entry per event across lanes (review fix) ----
// A conference's copy of a union, NAD or world-church event (same link and day, or the same words within a day) is dropped,
// and so is a conference's own copy of a shared NAD or world date. Repeating meetings are not touched.
{
  const NUMW = { ten: '10', thirteenth: '13th' };
  const GENERIC_W = new Set(['ministry', 'day', 'week', 'sabbath', 'hispanic', 'spanish', 'conference', 'union', 'church', 'meeting', 'of', 'in', 'at', 'on', 'to', 'by', 'adventist', 'seventh', 'sda', 'event', 'program']);
  const wset = t => new Set(toks2(String(t).replace(/\([^)]*\)/g, ' ').replace(/\bPBE\b/g, 'Pathfinder Bible Experience')).map(w => NUMW[w] || w));
  const sameEvent = (a, b) => {
    if (a.regular || b.regular) return false;
    const d = dd(a.first || a.start, b.first || b.start);
    if (d > 1) return false;
    const o = overlap(a.title, b.title);
    if (a.url === b.url && o.n >= 2 && o.n / o.small >= 0.6 && o.n / o.big >= 0.5) return true;
    const A = wset(a.title), B = wset(b.title), [S, L] = A.size <= B.size ? [A, B] : [B, A];
    // the shorter title must have 2+ words, at least one of them specific, and all of them in the longer title
    if (S.size < 2 || ![...S].some(w => !GENERIC_W.has(w))) return false;
    for (const w of S) if (!L.has(w)) return false;
    return true;
  };
  for (const c of Object.values(confs)) {
    const higher = (unionItems[c.union] || []).concat(shared.nad, shared.world, c.nadOwn, c.worldOwn);
    c.conf = c.conf.filter(it => { const m = higher.find(x => sameEvent(it, x)); if (m) { tally(c.slug, 'same as a union, NAD or world-church date', it.title + ' ' + it.start + ' => ' + m.title); return false; } return true; });
    for (const k of ['nadOwn', 'worldOwn']) c[k] = c[k].filter(it => { const m = shared.nad.concat(shared.world).find(x => sameEvent(it, x)); if (m) { tally(c.slug, 'same as a NAD or world-church date', it.title + ' ' + it.start + ' => ' + m.title); return false; } return true; });
  }
}
// union deadlines go to each conference of the union (no repeats)
for (const c of Object.values(confs)) {
  for (const d of unionDeadlines[c.union] || []) { if (!d) continue; if (c.deadlines.find(x => x.date === d.date && sim(x.title, d.title) >= 0.4)) continue; c.deadlines.push({ ...d }); }
  c.deadlines.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- "Start preparing" hints ----------
const SERIES_RE = /\b(week of meetings|series|campaign|campaña|campana|evangelistic|evangelism week|reaping|harvest|proclamation|una voz|onevoice|one voice|caravan|crusade|revival|impact|simultaneous|public events|share jesus)\b/i;
const NOT_SERIES_RE = /\b(day|training|symposium|summit|retreat|convention|conference|council|module|school of|bootcamp|boot ?camp|workshop|seminar|certification|planning|reading|prayer|fund|offering|deadline|toronto|ontario|blitz|canvass\w*)\b/i;
const isSeries = it => (it.category === 'evangelism-outreach' || it.category2 === 'evangelism-outreach' || /evangel/i.test(it.title)) && SERIES_RE.test(it.title) && !NOT_SERIES_RE.test(it.title);
const isCampMeeting = it => it.category === 'camp-meeting' || /camp ?meeting|campestre|convocation/i.test(it.title);
const isCamporee = it => /camporee/i.test(it.title);
const thisMonth = TODAY.slice(0, 7);
function startHint(it) {
  // the Evangelism Planner counts back from opening night: start at least 12 months before
  const m = monthOf(it.first || it.start);
  if (!m || m < addMonths(thisMonth, 2)) return null; // already running or about to: too late for a planning hint
  const by = addMonths(m, -12);
  return by <= thisMonth ? { k: 'start-now', by } : { k: 'start-by', by };
}
function dlLabel(d) {
  const t = d.title.toLowerCase();
  if (/early[- ]bird|lower (ticket )?price|early (ticket )?price/.test(t)) return 'early';
  if (/\bopens?\b|links open|registration opens/.test(t)) return 'opens';
  if (/payment|balance/.test(t)) return 'pay';
  if (/transfer/.test(t)) return 'transfer';
  if (d.kind === 'evangelism-fund' || d.kind === 'grant' || d.kind === 'scholarship' || /fund|subsid|grant|scholarship|budget|appropriation|request|application|plan\b|plans\b/.test(t)) return 'apply';
  if (/regist|reservation|ticket|book|closes|deadline|screening|transfer/.test(t)) return 'register';
  return 'due';
}
function regHints(it, dls) {
  // a union deadline belongs to a union event, a conference deadline to a conference event, and both come before the event
  const ownLevel = d => (it.lane === 'union' ? d.level === 'union' : d.level !== 'union' && d.level !== 'division');
  const near = d => d.date <= (it.start || TO) && dd(d.date, it.start) <= 365;
  const out = [];
  if (it.registrationOpens && it.registrationOpens >= TODAY) out.push({ k: 'opens', d: it.registrationOpens });
  if (it.registrationDeadline && it.registrationDeadline >= TODAY) out.push({ k: 'register', d: it.registrationDeadline });
  const kind = isCamporee(it) ? 'camporee' : isCampMeeting(it) ? 'camp' : null;
  if (kind) {
    const rel = dls.filter(d => ownLevel(d) && near(d) && d.date >= TODAY && (kind === 'camporee' ? /camporee/i.test(d.title) : /camp ?meeting|campestre|campsite|tent/i.test(d.title)));
    // a union camporee deadline belongs to that union's camporee only
    // when several camp deadlines fit, keep the ones that name this camp (Hispanic, United, ...)
    const GENERIC = new Set(['camp', 'meeting', 'campsite', 'tent', 'reservation', 'close', 'closes', 'registration', 'open', 'opens', 'camporee', 'pathfinder', 'union', 'conference']);
    const spec = t => toks2(t).filter(w => !GENERIC.has(w) && !/^\d+$/.test(w));
    const mine = new Set(spec(it.title));
    const named = rel.filter(d => spec(d.title).some(w => mine.has(w)));
    const use = named.length ? named : rel;
    for (const d of use) { const k = dlLabel(d); if (out.find(h => h.k === k && monthOf(h.d) === monthOf(d.date))) continue; out.push({ k, d: d.date, prec: d.prec, from: d.title, url: d.url, unconfirmed: d.unconfirmed }); if (out.length >= 2) break; }
  }
  return out.length ? out : null;
}
function hintFor(it, dls) {
  if (isSeries(it)) { const h = startHint(it); if (h) return [h]; }
  return regHints(it, dls);
}
for (const L of ['nad', 'world']) for (const it of shared[L]) { const h = isSeries(it) ? startHint(it) : null; if (h) it.hints = [h]; }
for (const c of Object.values(confs)) {
  for (const it of c.conf.concat(c.nadOwn, c.worldOwn)) { const h = hintFor(it, c.deadlines); if (h) it.hints = h; }
  for (const d of c.deadlines) d.hint = { k: dlLabel(d), d: d.date, prec: d.prec };
}
for (const [u, list] of Object.entries(unionItems)) for (const it of list) {
  const dls = (unionDeadlines[u] || []).filter(Boolean).concat(deadlinesAll.filter(d => Array.isArray(d.appliesTo) && d.level === 'union' && Object.values(confs).some(c => c.union === u && d.appliesTo.includes(c.slug))));
  const h = hintFor(it, dls); if (h) it.hints = h;
}

// ---------- per conference: months, counts, "last year" for unpublished months ----------
const isBasis = it => it.lane === 'conf' && it.level === 'conference' && !it.observance && it.category !== 'administration';
for (const c of Object.values(confs)) {
  const v = rd(join(EV, c.slug + '.json'));
  c.conf.sort((a, b) => a.first.localeCompare(b.first) || a.title.localeCompare(b.title));
  const months = {};
  for (const m of MONTHS) months[m] = { published: c.through ? m <= c.through : false, conf: 0, confBasis: 0, union: 0, nad: 0, world: 0, deadlines: 0 };
  for (const it of c.conf) { if (it.regular) continue; const m = monthOf(it.first); if (!months[m]) continue; months[m].conf++; if (isBasis(it)) months[m].confBasis++; }
  for (const it of unionItems[c.union] || []) { if (it.regular) continue; const m = monthOf(it.first); if (months[m]) months[m].union++; }
  for (const it of shared.nad.concat(c.nadOwn)) { if (it.regular) continue; const m = monthOf(it.first); if (months[m]) months[m].nad++; }
  for (const it of shared.world.concat(c.worldOwn)) { if (it.regular) continue; const m = monthOf(it.first); if (months[m]) months[m].world++; }
  for (const d of c.deadlines) { const m = monthOf(d.date); if (months[m]) months[m].deadlines++; }
  // last year, same month: the main conference events (for months not published yet)
  const PRI = ['camp-meeting', 'evangelism-outreach', 'pathfinders', 'youth-young-adults', 'family-women-men', 'children', 'pastoral-leadership', 'discipleship-spiritual', 'health', 'community-service', 'music-worship-arts', 'multilingual', 'stewardship-finance', 'education', 'other'];
  for (const m of MONTHS) {
    if (months[m].published) continue;
    const lm = addMonths(m, -12);
    const cands = v.events.filter(e => monthOf(e.start) === lm && ['conference', 'joint', 'area', 'group'].includes(e.level) && !leaveOut(e) && e.category !== 'administration' && !(e.count > 3) && e.url)
      .map(e => ({ e, p: PRI.indexOf(e.category) < 0 ? 99 : PRI.indexOf(e.category), len: dd(e.start, e.end || e.start) }))
      .sort((x, y) => x.p - y.p || y.len - x.len || String(x.e.start).localeCompare(String(y.e.start)));
    const seen = new Set(), pick = [];
    for (const { e } of cands) { const k = toks(e.title).slice(0, 3).join(' '); if (seen.has(k)) continue; seen.add(k); pick.push({ title: clean(e.title), start: day(e.start), end: day(e.end) && day(e.end) !== day(e.start) ? day(e.end) : null, url: e.url, prec: precOf(e) }); if (pick.length >= 3) break; }
    if (pick.length) months[m].lastYear = pick;
  }
  c.months = months;
  const after = it => monthOf(it.first) > FIRST_TO_M;
  c.counts = {
    conference: c.conf.length, conferenceRegular: c.conf.filter(x => x.regular).length,
    conferenceAfterFirstPass: c.conf.filter(x => !x.regular && after(x)).length,
    conferenceRunAfterFirstPass: c.conf.filter(x => !x.regular && after(x) && x.level === 'conference').length,
    union: (unionItems[c.union] || []).length, nadOwn: c.nadOwn.length, worldOwn: c.worldOwn.length, deadlines: c.deadlines.length,
    monthsPublished: MONTHS.filter(m => months[m].published).length,
    lastDated: c.conf.filter(x => !x.regular).map(x => x.end || x.start).sort().pop() || null,
  };
  c.publishesPastFirstPass = !!(c.through && c.through > FIRST_TO_M);
  c.anyDateAfterFirstPass = c.conf.some(x => !x.regular && after(x));
  c.leftOut = left[c.slug] || {};
  c.undated = c.undated.concat(unionUndated[c.union] ? [] : []);
}
for (const list of Object.values(unionItems)) list.sort((a, b) => a.first.localeCompare(b.first) || a.title.localeCompare(b.title));
for (const L of ['nad', 'world']) shared[L].sort((a, b) => a.first.localeCompare(b.first) || a.title.localeCompare(b.title));

// ---------- checks ----------
const all = [].concat(...Object.values(confs).map(c => c.conf.concat(c.nadOwn, c.worldOwn)), ...Object.values(unionItems), shared.nad, shared.world);
for (const it of all) {
  if (!it.url) throw new Error('no url: ' + it.title);
  if (!(it.first >= FROM && it.first <= TO)) throw new Error('outside window: ' + it.title + ' ' + it.first);
}
for (const c of Object.values(confs)) for (const d of c.deadlines) { if (!d.url) throw new Error('deadline without url ' + d.title); if (d.date < TODAY || d.date > TO) throw new Error('deadline outside window ' + d.title); }

const out = {
  name: 'Terrain year ahead',
  version: TODAY,
  retrieved: TODAY,
  today: TODAY,
  window: { from: FROM, to: TO, months: MONTHS },
  about: [
    'The next 12 months for each US conference: its own published dates, its union, the North American Division, the world church, and the deadlines a local church must meet.',
    `The months to ${FIRST_TO_M} come from the first pass (tools/conferences/src/events); the months after it from the look-ahead (tools/conferences/src/ahead), gathered ${TODAY}. NAD and world-church dates and deadlines come from tools/conferences/src/ahead/above.json. Every item carries its source URL.`,
    'through = the last month of the conference\'s own calendar (department-only calendars do not count). Months after it are "not published yet"; dates known from other pages are still shown there.',
    'Repeating meetings are listed once (regular: true) with the dates that fall in the window. Committees, boards, office closures, pay days, testing windows and similar items are left out.',
    'Start-preparing hints: an evangelism series or campaign starts 12 months before opening night (the Evangelism Planner counts back 12 to 18 months); camp meetings and camporees show a registration date when one is published; funding deadlines say "apply by".',
  ],
  lanes: [{ id: 'conf', label: 'Your conference' }, { id: 'union', label: 'Your union' }, { id: 'nad', label: 'North American Division' }, { id: 'world', label: 'World church' }, { id: 'dl', label: 'Deadlines' }],
  shared: { nad: shared.nad, world: shared.world, unions: unionItems, unionUndated },
  notPublishedAbove: ABOVE.notPublishedYet,
  conferences: confs,
};
lines.push('year-ahead: ' + JSON.stringify(out).length + ' bytes; nad ' + shared.nad.length + ', world ' + shared.world.length + ', unions ' + Object.entries(unionItems).map(([u, l]) => u.split(' ')[0] + ' ' + l.length).join(', '));
for (const c of Object.values(confs)) lines.push([c.slug.padEnd(24), String(c.through).padEnd(8), 'conf', String(c.counts.conference).padStart(3), 'reg', String(c.counts.conferenceRegular).padStart(2), 'after first pass', String(c.counts.conferenceAfterFirstPass).padStart(3), 'nadOwn', c.nadOwn.length, 'worldOwn', c.worldOwn.length, 'dl', c.deadlines.length, 'undated', c.undated.length].join(' '));
lines.push('publish past ' + FIRST_TO_M + ': ' + Object.values(confs).filter(c => c.publishesPastFirstPass).map(c => c.slug).join(', '));
return { out, lines };
}
