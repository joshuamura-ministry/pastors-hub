// The profiles: one comparable profile per US conference, plus its year ahead. Called by build.mjs after buildYearAhead.
// (Ported from the v52 sample's compare/build-profiles.mjs, 1 Oct 2026; the logic is unchanged. What changed: the paths and
// the year ahead come from the caller, and the months from src/config.json.)
// Inputs (read only, under src/): events/*.json, stats.json, registry/*.json (the conference evangelism registry, v47),
// initiatives.json (the initiatives registry, v49), and the year ahead (buildYearAhead's out).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { windowsOf } from './window.mjs';

let EV;
const rd = p => JSON.parse(readFileSync(p, 'utf8'));

// ---------- fixed definitions ----------
// The months shown run from the past 12 (what happened) to the next 12 (what is published so far).
// Every comparison (shares, heat table, strengths, per-1,000 figures, typical) uses the past 12 months only,
// so a conference is never judged on months it has not published yet. Set from src/config.json by buildProfiles.
let WINDOW, MONTHS, PAST12, AHEAD12, COMPARE, W, YA, PAST_LABEL, AHEAD_LABEL;
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monLabel = m => MON_EN[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
// calendar confidence, on the past 12 months (v50 used 40 events / 12 of 18 months / 20 events / 9 of 18 months over 18 months)
const CONF_RULE = { highEvents: 30, highMonths: 10, lowEvents: 15, lowMonths: 6 };

const CATS = ['evangelism-outreach', 'pastoral-leadership', 'discipleship-spiritual', 'youth-young-adults', 'pathfinders', 'children', 'family-women-men', 'health', 'community-service', 'education', 'camp-meeting', 'music-worship-arts', 'stewardship-finance', 'multilingual', 'other', 'administration'];
const LENSES = [
  { id: 'evangelism', label: 'Evangelism & outreach', es: 'Evangelismo y alcance', cats: ['evangelism-outreach'], group: 'out', core: true },
  { id: 'pastoral', label: 'Pastors & leaders', es: 'Pastores y líderes', cats: ['pastoral-leadership'], group: 'care', core: true },
  { id: 'discipleship', label: 'Prayer & discipleship', es: 'Oración y discipulado', cats: ['discipleship-spiritual'], group: 'care', core: true },
  { id: 'family', label: 'Family, women & men', es: 'Familia, damas y caballeros', cats: ['family-women-men'], group: 'care', core: true },
  { id: 'youth', label: 'Youth & young adults', es: 'Jóvenes y jóvenes adultos', cats: ['youth-young-adults'], group: 'next', core: true },
  { id: 'clubs', label: 'Pathfinders & children', es: 'Conquistadores y niños', cats: ['pathfinders', 'children'], group: 'next', core: true },
  { id: 'education', label: 'Schools', es: 'Escuelas', cats: ['education'], group: 'next', core: false },
  { id: 'health', label: 'Health & community service', es: 'Salud y servicio a la comunidad', cats: ['health', 'community-service'], group: 'out', core: true },
  { id: 'gatherings', label: 'Camp meeting & worship', es: 'Campestre y adoración', cats: ['camp-meeting', 'music-worship-arts'], group: 'other', core: false },
  { id: 'other', label: 'Other ministries', es: 'Otros ministerios', cats: ['stewardship-finance', 'other', 'multilingual'], group: 'other', core: false },
];
const LENS_OF = {}; for (const L of LENSES) for (const c of L.cats) LENS_OF[c] = L.id;
const GROUPS = [
  { id: 'care', label: 'Caring & equipping', es: 'Cuidar y capacitar', lenses: ['pastoral', 'discipleship', 'family'] },
  { id: 'out', label: 'Reaching out', es: 'Alcanzar a otros', lenses: ['evangelism', 'health'] },
  { id: 'next', label: 'Next generation', es: 'Nueva generación', lenses: ['youth', 'clubs', 'education'] },
  { id: 'other', label: 'Gatherings & other', es: 'Reuniones y otros', lenses: ['gatherings', 'other'] },
];

const UNION_REGION = {
  'Atlantic Union': ['East', 'Northeast'], 'Columbia Union': ['East', 'Mid-Atlantic'],
  'Lake Union': ['Midwest', 'Great Lakes'], 'Mid-America Union': ['Midwest', 'Plains & Mountains'],
  'Southern Union': ['South', 'Southeast'], 'Southwestern Union': ['South', 'Southwest'],
  'North Pacific Union': ['West', 'Northwest'], 'Pacific Union': ['West', 'Pacific'],
};
const UNION_NORM = u => {
  const s = String(u || '');
  for (const k of Object.keys(UNION_REGION)) if (s.startsWith(k.split(' ')[0]) && (k !== 'North Pacific Union' || /North/.test(s)) && (k !== 'Pacific Union' || !/North/.test(s)) && (k !== 'Southern Union' || !/western/.test(s))) return k;
  return s;
};
// Regional conferences (an official NAD structure; their territory overlaps state conferences)
const REGIONAL = new Set(['allegheny-east', 'allegheny-west', 'central-states', 'lake-region', 'northeastern', 'south-atlantic', 'south-central', 'southeastern', 'southwest-region']);
const ATLANTIC_COAST = new Set(['ME', 'NH', 'MA', 'RI', 'CT', 'NY', 'NJ', 'DE', 'MD', 'VA', 'NC', 'SC', 'GA', 'FL', 'DC']);
const PACIFIC_COAST = new Set(['CA', 'OR', 'WA', 'AK', 'HI']);

// Calendar grades for files that carry no letter grade: taken from the union summary written by the same researcher.
const GRADE_FROM_SUMMARY = {
  'alaska': ['B-', 'north-pacific-SUMMARY.md: "Fair–good: kept current into 2027 but empty Oct–mid-Nov 2025"'],
  'idaho': ['B', 'north-pacific-SUMMARY.md: "Good and detailed … empty Jan 1–Feb 15, 2026; nothing yet for 2027"'],
  'montana': ['D+', 'north-pacific-SUMMARY.md: "Weak: about 20 conference events in 18 months"'],
  'oregon': ['C+', 'north-pacific-SUMMARY.md: "Fair: … a Church Ministries calendar; Hispanic, ministerial, evangelism and admin events mostly missing"'],
  'upper-columbia': ['A-', 'north-pacific-SUMMARY.md: "Very good: broadest coverage in the union"'],
  'washington': ['D+', 'north-pacific-SUMMARY.md: "Poor for 2026: main calendar abandoned after Dec 2025"'],
  'arizona': ['B+', 'pacific-SUMMARY.md: "B+ (rich, but PDF only, one year at a time)"'],
  'central-california': ['B', 'pacific-SUMMARY.md: "B (public events only; no office calendar)"'],
  'hawaii': ['D', 'pacific-SUMMARY.md: "D (no calendar)"'],
  'nevada-utah': ['A-', 'pacific-SUMMARY.md: "A- (complete office calendar, terse titles, some acronyms)"'],
  'northern-california': ['C', 'pacific-SUMMARY.md: "C (sparse; 20 of about 45 dated calendar entries are two monthly webinar series)"'],
  'southeastern-california': ['D+', 'pacific-SUMMARY.md: "D+ (no conference calendar)"'],
  'southern-california': ['A', 'pacific-SUMMARY.md: "A (two calendars, public and internal)"'],
  'arkansas-louisiana': ['A', 'southwestern-SUMMARY.md: "Excellent: full, live, shows routine meetings"'],
  'oklahoma': ['D-', 'southwestern-SUMMARY.md: "None: news only; routine meetings mostly invisible"'],
  'southwest-region': ['D', 'southwestern-SUMMARY.md: "Poor: thin page, no feed, no past"'],
  'texas': ['C', 'southwestern-SUMMARY.md: "Fair: structured, but half the window is missing"'],
  'texico': ['B', 'southwestern-SUMMARY.md: "Good feed, but mostly administration and school items"'],
};
const GRADE_SCORE = { 'A+': 4.3, 'A': 4, 'A-': 3.7, 'B+': 3.3, 'B': 3, 'B-': 2.7, 'C+': 2.3, 'C': 2, 'C-': 1.7, 'D+': 1.3, 'D': 1, 'D-': 0.7, 'F': 0 };

const INTERNAL_KIND = new Set(['committee', 'logistics', 'camp maintenance', 'staff training', 'deadline']);
const INTERNAL_TITLE = /\b(committee|adcom|advisory|board meeting|team meeting|staff meeting|staff worship|officers'? meeting|employee orientation|executive officers)\b/i;
// v10.44 review (2 Oct 2026): a board, a school board or a constituency meeting is the church's business, not a ministry event
// (DESIGN §4.1): "From Ohio: Board of Education" was offered as an idea to learn from, and counted in the Schools share. (The year
// ahead already leaves boards out: year-ahead.mjs ADMIN_TITLE.) A title that names such a meeting; an audience that is the board
// itself; or an administration record held for a board, a committee, delegates, officers or the office staff. Kept: a training, a
// town hall or a celebration that names a board (church members attend these), and a Pathfinder or Adventurer council weekend.
const BOARD_TITLE = /\b(board of (education|directors|trustees)|education board|school board|operating board|board meetings?|bot|constituency (meetings?|sessions?))\b/i;
const BOARD_ONLY = /^(?:(?:the|school|church)\s+)?boards?(?:\s+members?)?(?:\s*(?:\/|and|&)\s*committee members?)?$/i;
const BOARD_AUD = /\b(boards?|board members?|committee members?|delegates?|officers?|office staff|administrators?)\b/i;
const BOARD_KEEP = /\b(training|town halls?|summit|seminar|celebration|banquet|dinner|showcase|boot-?camp)\b|\b(pathfinders?|adventurers?)\b.*\bcouncil weekend\b/i;
export function boardOrSession(e) {
  const t = String(e.title || ''), aud = String(e.audience || '').trim();
  if (BOARD_KEEP.test(t)) return false;
  return BOARD_TITLE.test(t) || BOARD_ONLY.test(aud) || ((e.category2 === 'administration' || e.category === 'administration') && BOARD_AUD.test(aud));
}

function normLevel(l) {
  const s = String(l || '').toLowerCase();
  if (['conference', 'joint', 'area', 'group'].includes(s)) return 'conference';
  if (['institution', 'school'].includes(s)) return 'institution';
  if (['local-church', 'church'].includes(s)) return 'local-church';
  if (s === 'union') return 'union';
  if (['division', 'nad'].includes(s)) return 'division';
  if (['gc', 'general-conference'].includes(s)) return 'world';
  if (s === 'observance') return 'observance';
  return 'other';
}
const monthOf = s => (typeof s === 'string' && /^\d{4}-\d{2}/.test(s)) ? s.slice(0, 7) : null;
const pct = (n, d) => d ? Math.round(1000 * n / d) / 10 : 0;
const r1 = x => Math.round(x * 10) / 10;
const median = a => { const b = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

function gradeOf(slug, j) {
  let raw = j.calendarGrade || (j.calendarQuality && typeof j.calendarQuality === 'object' ? j.calendarQuality.grade : null);
  let reason = null, source = 'research file';
  if (!raw && typeof j.calendarQuality === 'string') { const m = j.calendarQuality.match(/^\s*([A-F][+\-–−]?)\s*:/); if (m) raw = m[1]; }
  if (typeof j.calendarQuality === 'string') reason = j.calendarQuality.replace(/^\s*[A-F][+\-–−]?\s*:\s*/, '');
  else if (j.calendarQuality && typeof j.calendarQuality === 'object') reason = j.calendarQuality.summary || j.calendarQuality.reason || null;
  if (!raw && GRADE_FROM_SUMMARY[slug]) { raw = GRADE_FROM_SUMMARY[slug][0]; reason = GRADE_FROM_SUMMARY[slug][1]; source = 'union summary'; }
  const g = String(raw || '').replace(/[–−]/g, '-').trim();
  return { grade: g || null, score: GRADE_SCORE[g] ?? null, reason, gradeSource: source };
}

function sentences(t, max) { if (t.length <= max) return t; const parts = t.match(/[^.;!?]+[.;!?]+(\s|$)/g) || [t]; let out = ''; for (const p of parts) { if ((out + p).length > max) break; out += p; } return (out || t.slice(0, max)).trim().replace(/[;,]$/, '.'); }
function cleanTitle(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
function attendanceShort(a) { if (!a) return null; return String(a).replace(/\s*\(https?:[^)]*\)/g, '').replace(/https?:\S+/g, '').trim().slice(0, 90) || null; }

// ---------- the year ahead, per conference (all five lanes, month by month) ----------
function slimItem(it, lane) {
  const o = { lane, title: it.title, start: it.start, end: it.end || null, category: it.category, level: it.level, url: it.url };
  for (const k of ['first', 'prec', 'place', 'count', 'dates', 'until', 'since', 'tentative', 'unconfirmed', 'projected', 'minor', 'hints', 'note', 'listedBy', 'regular', 'openEnded', 'alsoUrl']) if (it[k] != null && it[k] !== false) o[k] = it[k];
  return o;
}
function yearAheadFor(slug, union) {
  const c = YA.conferences[slug];
  const months = {};
  for (const m of AHEAD12) months[m] = { published: c.months[m].published, events: [] };
  const regular = [];
  const put = (it, lane) => { const o = slimItem(it, lane); if (it.regular) { regular.push(o); return; } const m = (it.first || it.start).slice(0, 7); if (months[m]) months[m].events.push(o); };
  for (const it of c.conf) put(it, 'conference');
  for (const it of YA.shared.unions[union] || []) put(it, 'union');
  for (const it of YA.shared.nad.concat(c.nadOwn)) put(it, 'nad');
  for (const it of YA.shared.world.concat(c.worldOwn)) put(it, 'world');
  for (const d of c.deadlines) { const m = d.date.slice(0, 7); if (months[m]) months[m].events.push({ lane: 'deadline', title: d.title, start: d.date, end: null, category: null, level: d.level, url: d.url, kind: d.kind, hint: d.hint, unconfirmed: d.unconfirmed || undefined, prec: d.prec }); }
  for (const m of AHEAD12) { months[m].events.sort((a, b) => (a.first || a.start).localeCompare(b.first || b.start)); if (c.months[m].lastYear) months[m].lastYear = c.months[m].lastYear; }
  return {
    window: { from: YA.window.from, to: YA.window.to },
    publishedThrough: c.through, publishedNote: c.throughNote, publishedNoteEs: c.throughNoteEs,
    publishesPastFirstPass: c.publishesPastFirstPass, anyDateAfterFirstPass: c.anyDateAfterFirstPass,
    counts: c.counts, months, regular, undated: c.undated.concat(YA.shared.unionUndated[union] || []), leftOut: c.leftOut,
    aheadSummary: c.aheadSummary,
  };
}

// ---------- the build ----------
// src: the src/ folder; ya: buildYearAhead(src, cfg).out; cfg: src/config.json unless given. Returns { out, review, lines }: out is what profiles.json held in the
// sample; review the said-vs-shown check of every initiative (MATCH-REVIEW.txt); lines the builder's report.
export function buildProfiles(src, ya, cfg) {
W = windowsOf(cfg || rd(join(src, 'config.json')));
WINDOW = { from: W.PAST12[0], to: W.AHEAD12[11] }; MONTHS = W.MONTHS; PAST12 = W.PAST12; AHEAD12 = W.AHEAD12;
COMPARE = { from: PAST12[0], to: PAST12[11] };
PAST_LABEL = monLabel(PAST12[0]) + ' – ' + monLabel(PAST12[11]); AHEAD_LABEL = monLabel(AHEAD12[0]) + ' – ' + monLabel(AHEAD12[11]);
EV = join(src, 'events'); YA = ya;
const lines = [];
// ---------- load ----------
const stats = rd(join(src, 'stats.json'));
const v47 = {}; for (const f of readdirSync(join(src, 'registry')).filter(f => f.endsWith('.json') && !f.includes('-union'))) for (const c of Object.values(rd(join(src, 'registry', f)))) v47[c.conf] = c;
const INI = rd(join(src, 'initiatives.json'));

const files = readdirSync(EV).filter(f => f.endsWith('.json')).sort();
const profiles = [];

for (const f of files) {
  const slug = f.replace(/\.json$/, '');
  const j = rd(join(EV, f));
  const name = String(j.conf).replace(/ Conference$/, '');
  const union = UNION_NORM(j.union);
  const [region, subregion] = UNION_REGION[union] || ['?', '?'];
  const reg = v47[name] || {};
  const states = reg.states || [];
  const st = stats[name];
  if (!st) throw new Error('no stats for ' + name);

  // ---- classify every event ----
  const evs = [];
  for (const e of j.events) {
    const level = normLevel(e.level);
    const cancelled = e.status === 'cancelled' || /\bCANCELLED\b/.test(e.note || '');
    const observance = level === 'observance' || e.observance === true || e.kind === 'emphasis-day';
    const internal = e.internal === true || INTERNAL_KIND.has(e.kind) || INTERNAL_TITLE.test(e.title || '') || boardOrSession(e);
    let cat = e.category;
    if (cat === 'multilingual' && e.category2 && e.category2 !== 'multilingual' && e.category2 !== 'administration') cat = e.category2;
    if (!CATS.includes(cat)) cat = 'other';
    const lang = e.category === 'multilingual' || e.category2 === 'multilingual' || !!e.lang;
    const occ = e.count || (Array.isArray(e.dates) ? e.dates.length : 1) || 1;
    const month = monthOf(e.start);
    const inWindow = month ? (month >= COMPARE.from && month <= COMPARE.to) : null; // v52: the past 12 months only
    // does any date of this record fall in the past 12 months? (a repeating meeting counts once, whichever months it covers)
    const occMonths = Array.isArray(e.dates) && e.dates.length ? e.dates.map(monthOf).filter(Boolean) : null;
    const pastHit = occMonths ? occMonths.some(m => m >= COMPARE.from && m <= COMPARE.to) : (month ? (month <= COMPARE.to && (monthOf(e.end) || month) >= COMPARE.from) : false);
    const ministry = level === 'conference' && !observance && !internal && !cancelled && cat !== 'administration';
    const basis = ministry && pastHit;
    evs.push({ e, level, cancelled, observance, internal, cat, cat2: e.category2 || null, lang, occ, month, inWindow, basis, ministry, pastHit });
  }
  const basis = evs.filter(x => x.basis);
  const confRun = evs.filter(x => x.level === 'conference' && !x.cancelled);

  // ---- category and lens counts (records; a repeating meeting counts once) ----
  const catN = Object.fromEntries(CATS.map(c => [c, 0])), catOcc = Object.fromEntries(CATS.map(c => [c, 0]));
  for (const x of basis) { catN[x.cat]++; catOcc[x.cat] += x.occ; }
  const B = basis.length;
  const lensN = {}, lensTouch = {};
  for (const L of LENSES) { lensN[L.id] = L.cats.reduce((s, c) => s + catN[c], 0); lensTouch[L.id] = basis.filter(x => L.cats.includes(x.cat) || L.cats.includes(x.cat2)).length; }

  // ---- examples per lens ----
  function pickExamples(list, k = 4) {
    const scored = list.map(x => {
      const e = x.e; let s = 0;
      if (e.attendance) s += 2; if (!x.month) s -= 2.5; if (/\b(staff|employees?)\b/i.test(e.title || '')) s -= 3; if (e.source === 'calendar') s += 1.5; if (e.place) s += 1; if ((e.count || 0) >= 3) s += 1;
      if (x.month) s += 1; if (cleanTitle(e.title).length < 10) s -= 2; if (/\b(TBD|TBA)\b/.test(e.title)) s -= 1;
      if (x.e.datePrecision) s -= 0.5;
      return { x, s };
    }).sort((a, b) => b.s - a.s || String(b.x.e.start).localeCompare(String(a.x.e.start)));
    const seen = new Set(), out = [];
    for (const { x } of scored) {
      const key = cleanTitle(x.e.title).toLowerCase().replace(/[^a-z]/g, '').slice(0, 18);
      if (seen.has(key)) continue; seen.add(key);
      const e = x.e;
      out.push({ title: cleanTitle(e.title), start: e.start || null, end: e.end || null, place: e.place || null, url: e.url, source: e.source || null, count: e.count || null, attendance: attendanceShort(e.attendance), approx: e.datePrecision ? String(e.datePrecision).slice(0, 60) : null, lang: x.lang || undefined });
      if (out.length >= k) break;
    }
    return out;
  }

  // ---- months ----
  const monthsBasis = Object.fromEntries(MONTHS.map(m => [m, 0]));
  const monthsAny = new Set();
  for (const x of evs) if (x.month && x.inWindow && !x.cancelled) {
    if (x.basis) monthsBasis[x.month]++;
    if (x.level === 'conference') monthsAny.add(x.month);
    // repeating meetings also cover the months of their dates
    if (x.level === 'conference' && Array.isArray(x.e.dates)) for (const d of x.e.dates) { const m = monthOf(d); if (m && m >= COMPARE.from && m <= COMPARE.to) monthsAny.add(m); }
  }
  // the year ahead: conference ministry events by month, from year-ahead.json (a repeating meeting counts once, in its first month)
  const ya = YA.conferences[slug];
  if (!ya) throw new Error('no year-ahead data for ' + slug);
  for (const m of AHEAD12) monthsBasis[m] = ya.months[m].confBasis;
  const monthsCovered = monthsAny.size, monthsCoveredPast12 = monthsCovered;
  const datedBasis = basis.length;
  const undated = evs.filter(x => x.ministry && !x.month).length;

  // ---- calendar quality and confidence ----
  const g = gradeOf(slug, j);
  let confidence = 'medium';
  if (g.score != null && g.score >= 3 && B >= CONF_RULE.highEvents && monthsCovered >= CONF_RULE.highMonths) confidence = 'high';
  else if ((g.score != null && g.score < 1.7) || B < CONF_RULE.lowEvents || monthsCovered < CONF_RULE.lowMonths) confidence = 'low';
  const confWhy = `Calendar grade ${g.grade || 'not given'}; ${B} conference ministry events in the past 12 months; ${monthsCovered} of those 12 months show conference items.`;

  // ---- official statistics ----
  const Y = st.years;
  const yrs = ['2022', '2023', '2024'].filter(y => Y[y]);
  const sum = (k) => yrs.reduce((s, y) => s + (Y[y][k] || 0), 0);
  const memSum = sum('members');
  const y24 = Y['2024'];
  const auditYears = Object.entries(Y).filter(([, v]) => v.derived && v.derived.flag).map(([y, v]) => ({ year: +y, flag: v.derived.flag }));
  const official = {
    year: 2024,
    members: y24.members, congregations: y24.congregations, churches: y24.churches, companies: y24.companies,
    ministerialWorkforce: y24.ministerialWorkforce ?? null, membersPerCongregation: y24.derived?.membersPerCongregation ?? null,
    baptisms2024: y24.baptisms, professions2024: y24.professionsOfFaith, accessions2024: y24.accessions,
    joinedPer1000_3yr: r1(1000 * sum('baptismsAndProfessions') / memSum),
    accessionsPer1000_3yr: r1(1000 * sum('accessions') / memSum),
    joinedPer1000_2024: r1(1000 * y24.baptismsAndProfessions / y24.members),
    netGrowthPct_3yr: r1(100 * (Y['2024'].members - Y['2022'].membersBegin) / Y['2022'].membersBegin),
    years: yrs.map(Number),
    flags: auditYears,
    method: 'joinedPer1000_3yr = (baptisms + professions of faith, 2022–2024) ÷ (sum of year-end membership 2022–2024) × 1,000. accessionsPer1000_3yr uses the official ASR accessions (which also include "adjustments added").',
    sources: (st.source || []).filter(s => [2022, 2023, 2024].includes(s.year) && /membership/.test(s.data)).map(s => ({ year: s.year, edition: s.id, table: s.table, pdfPage: s.pdfPage, url: s.url, archivedCopy: s.archivedCopy })),
  };

  // events per 1,000 members per year: conference ministry events dated in the window, annualised over the months the calendar shows
  const perYear = monthsCovered ? datedBasis / monthsCovered * 12 : null;
  const eventsPer1000 = perYear != null ? Math.round(100 * perYear / (y24.members / 1000)) / 100 : null;

  // ---- stated initiatives (v49) and evangelism help (v47) ----
  const myIni = INI.initiatives.filter(i => i.level === 'conference' && i.conference === name);

  profiles.push({
    slug, name, union, region, subregion, states, regional: REGIONAL.has(slug),
    coast: states.some(s => ATLANTIC_COAST.has(s)) ? 'East Coast' : states.some(s => PACIFIC_COAST.has(s)) ? 'West Coast' : null,
    california: states.includes('CA'),
    site: j.site || reg.site || null,
    calendarUrls: (j.calendarUrls || []).map(u => typeof u === 'string' ? u : (u.url || JSON.stringify(u))).slice(0, 6),
    retrieved: j.retrieved || j.checked || W.TODAY,
    researchFile: `tools/conferences/src/events/${f}`,
    aheadFile: ya.aheadFile,
    calendar: { grade: g.grade, gradeScore: g.score, gradeSource: g.gradeSource, reason: g.reason ? sentences(String(g.reason), 420) : null, window: typeof j.window === 'string' ? j.window.slice(0, 400) : j.window, monthsCovered, monthsCoveredPast12, monthsOf: PAST12.length, comparedMonths: { from: COMPARE.from, to: COMPARE.to }, publishedThrough: ya.through, publishedNote: ya.throughNote, publishedNoteEs: ya.throughNoteEs, confidence, confidenceWhy: confWhy },
    counts: {
      records: evs.length, conferenceRun: confRun.length, ministryEvents: B,
      ministryOccurrences: basis.reduce((s, x) => s + x.occ, 0),
      adminAndInternal: confRun.filter(x => !x.basis && !x.observance && (x.internal || x.cat === 'administration')).length,
      observances: evs.filter(x => x.observance).length,
      localChurch: evs.filter(x => x.level === 'local-church').length,
      institution: evs.filter(x => x.level === 'institution').length,
      widerChurch: evs.filter(x => ['union', 'division', 'world'].includes(x.level)).length,
      cancelledLeftOut: evs.filter(x => x.cancelled).length,
      undatedMinistryEvents: undated,
      datedMinistryEventsInWindow: datedBasis,
      ministryEventsAllDates: evs.filter(x => x.ministry).length,
    },
    categories: Object.fromEntries(CATS.filter(c => c !== 'administration').map(c => [c, { n: catN[c], share: pct(catN[c], B), occurrences: catOcc[c] }])),
    lenses: Object.fromEntries(LENSES.map(L => [L.id, { n: lensN[L.id], share: pct(lensN[L.id], B), touch: lensTouch[L.id], touchShare: pct(lensTouch[L.id], B), examples: pickExamples(basis.filter(x => L.cats.includes(x.cat))) }])),
    groups: Object.fromEntries(GROUPS.map(G => { const n = G.lenses.reduce((s, l) => s + lensN[l], 0); return [G.id, { n, share: pct(n, B) }]; })),
    language: { n: basis.filter(x => x.lang).length, share: pct(basis.filter(x => x.lang).length, B), examples: pickExamples(basis.filter(x => x.lang), 3) },
    months: monthsBasis,
    monthsPublished: Object.fromEntries(MONTHS.map(m => [m, PAST12.includes(m) ? null : ya.months[m].published])),
    perMembers: { ministryEventsPerYear: perYear != null ? r1(perYear) : null, eventsPer1000MembersPerYear: eventsPer1000, method: 'conference ministry events in the past 12 months (' + PAST_LABEL + ') ÷ the months of those 12 that show any conference item × 12 ÷ (2024 members ÷ 1,000)' },
    yearAhead: yearAheadFor(slug, union),
    official,
    stated: {
      initiatives: myIni.map(i => ({ id: i.id, name: i.name, status: i.status, kind: i.kind, fits: i.fits || [], years: i.years || null, firstDate: (i.dates || []).map(d => d.start).filter(Boolean).sort()[0] || null, localChurch: (i.localChurch || [])[0] || null, source: i.sources && i.sources[0] ? { title: i.sources[0].title, publisher: i.sources[0].publisher, date: i.sources[0].date, url: i.sources[0].url } : null })),
      evangelismHelp: reg.evangelism ? { help: reg.evangelism.help, share: reg.evangelism.share, cap: reg.evangelism.cap, deadline: reg.evangelism.deadline, programmes: reg.evangelism.programmes || [], url: (reg.evangelism.sources || [])[0]?.url || null, checked: reg.checked || null } : null,
    },
    researchNotes: (Array.isArray(j.notes) ? j.notes : [j.notes]).filter(Boolean).map(n => String(n).slice(0, 600)).slice(0, 8),
    _basis: basis, // removed before writing
    _all: evs.filter(x => !x.cancelled).concat(ya.conf.filter(it => it.src !== 'first pass').map(it => ({ e: { title: it.title, start: it.start, url: it.url }, level: it.level === 'conference' ? 'conference' : 'other' }))),
  });
}

// ---------- national baselines (conferences with medium or high confidence) ----------
const solid = profiles.filter(p => p.calendar.confidence !== 'low');
const baseline = { basedOn: solid.length, conferences: solid.map(p => p.slug), lens: {}, group: {}, category: {}, joinedPer1000_3yr: {}, eventsPer1000: {} };
for (const L of LENSES) {
  const shares = solid.map(p => p.lenses[L.id].share);
  const pooledN = solid.reduce((s, p) => s + p.lenses[L.id].n, 0), pooledD = solid.reduce((s, p) => s + p.counts.ministryEvents, 0);
  baseline.lens[L.id] = { median: r1(median(shares)), pooled: pct(pooledN, pooledD), p25: r1(median(shares.filter(s => s <= median(shares)))), p75: r1(median(shares.filter(s => s >= median(shares)))) };
}
for (const G of GROUPS) baseline.group[G.id] = { median: r1(median(solid.map(p => p.groups[G.id].share))) };
for (const c of CATS.filter(c => c !== 'administration')) baseline.category[c] = { median: r1(median(solid.map(p => p.categories[c].share))) };
baseline.joinedPer1000_3yr = { median: r1(median(profiles.map(p => p.official.joinedPer1000_3yr))), us50: (() => { const u = stats._US50?.years; if (!u) return null; const yrs = ['2022', '2023', '2024']; const n = yrs.reduce((s, y) => s + u[y].baptismsAndProfessions, 0), d = yrs.reduce((s, y) => s + u[y].members, 0); return r1(1000 * n / d); })() };
const AREAS = { East: p => p.region === 'East', Midwest: p => p.region === 'Midwest', South: p => p.region === 'South', West: p => p.region === 'West', 'East Coast': p => p.coast === 'East Coast', California: p => p.california };
baseline.byArea = {};
for (const [a, fn] of Object.entries(AREAS)) {
  const list = solid.filter(fn);
  baseline.byArea[a] = { n: list.length, conferences: list.map(p => p.slug), lens: Object.fromEntries(LENSES.map(L => [L.id, r1(median(list.map(p => p.lenses[L.id].share)))])), joinedPer1000_3yr: r1(median(list.map(p => p.official.joinedPer1000_3yr))) };
}
baseline.byArea._note = 'Median share among the conferences with usable calendars in each area. East Coast = conferences with territory in an Atlantic-seaboard state; California = conferences with territory in California (Nevada-Utah includes eastern California).';
baseline.eventsPer1000 = { median: r1(median(solid.map(p => p.perMembers.eventsPer1000MembersPerYear)) * 100) / 100 };

// ---------- character, strengths, room to grow ----------
const LBL = Object.fromEntries(LENSES.map(L => [L.id, L.label]));
const lc = t => t.toLowerCase().replace('pathfinders', 'Pathfinders');
for (const p of profiles) {
  const idx = {};
  for (const L of LENSES) { const m = baseline.lens[L.id].median; p.lenses[L.id].vsMedian = m ? Math.round(100 * p.lenses[L.id].share / m) / 100 : null; p.lenses[L.id].median = m; idx[L.id] = p.lenses[L.id].vsMedian; }
  const core = LENSES.filter(L => L.core).map(L => L.id);
  const isLean = id => p.lenses[id].n >= 4 && idx[id] != null && idx[id] >= 1.25 && p.lenses[id].share >= p.lenses[id].median + 3;
  const leans = core.concat(['education']).filter(isLean).sort((a, b) => idx[b] - idx[a]);
  const lean = leans.filter(id => id !== 'education').slice(0, 2);
  p.character = {
    lenses: lean,
    text: lean.length ? `Leans toward ${lean.map(id => lc(LBL[id])).join(' and ')}` : 'A broad, even calendar',
    basis: 'A lens is a lean when it has 4+ events and its share of the calendar is at least 1.25 × the median of conferences with usable calendars and at least 3 points above it.',
  };
  const thin = p.calendar.confidence === 'low';
  p.strengths = leans.map(id => ({
    lens: id, n: p.lenses[id].n, share: p.lenses[id].share, median: p.lenses[id].median,
    text: `${LBL[id]}: ${p.lenses[id].n} events, ${p.lenses[id].share}% of the calendar (most conferences: ${p.lenses[id].median}%)`,
  }));
  p.roomToGrow = core.filter(id => p.lenses[id].median >= 5 && p.lenses[id].share <= 0.5 * p.lenses[id].median).map(id => ({
    lens: id, n: p.lenses[id].n, share: p.lenses[id].share, median: p.lenses[id].median,
    text: `${LBL[id]}: ${p.lenses[id].n === 0 ? 'none' : p.lenses[id].n} on the published calendar, ${p.lenses[id].share}% (most conferences: ${p.lenses[id].median}%)` + (thin ? '. The calendar is thin, so this may reflect the website more than the work.' : ''),
  }));
}

// ---------- said vs seen: stated initiatives against the calendar ----------
const FIT_LENS = { evangelism: 'evangelism', 'church-planting': 'evangelism', 'bible-study': 'evangelism', literature: 'evangelism', media: 'evangelism', urban: 'evangelism', hispanic: null, training: 'pastoral', revitalization: 'pastoral', discipleship: 'discipleship', prayer: 'discipleship', reclamation: 'discipleship', 'small-groups': 'discipleship', youth: 'youth', children: 'clubs', family: 'family', health: 'health', 'community-service': 'health', stewardship: 'other', funding: null, mission: 'evangelism', other: null };
const NOT_EVENT_KINDS = new Set(['funding', 'offering', 'process', 'strategy', 'resource', 'staffing', 'ministry', 'mission-project']);
// Distinctive words that identify an initiative on a calendar. Reviewed by hand (see MATCH-REVIEW.txt).
const MATCH = {
  'Impact Philly 2026': ['impact philly'], 'AEC School of Evangelism': ['school of evangelism'],
  '2026 “Year of Health”': ['year of health'], 'Hispanic Evangelism in Small Groups by District': ['small groups by district', 'evangelism in small groups'],
  'Temporary Bible Worker': ['bible worker'], 'GROW Carolina 2027 Evangelism Plan': ['grow carolina'], 'ShareHim boot camp': ['sharehim', 'share him', 'bible worker training'],
  'HopeNOW evangelism movement': ['hopenow', 'hope now'], 'Partners in Mission': ['partners in mission'], 'Proclaim Evangelism Modules': ['proclaim'],
  'Bible worker initiative': ['bible worker'], 'Called to Serve: Dakota Leadership Summit': ['called to serve', 'leadership summit'],
  'Florida Conference Lay Institute for Evangelism': ['fc-life', 'fclife', 'lay institute'], 'Impacto Miami Dade': ['impacto', 'jesús vive', 'jesus vive'], 'Lessons of Hope': ['lessons of hope'],
  'Reach Your Neighbor LEADS Program': ['=LEADS', 'reach your neighbor'], 'Revive 2026 Collegedale': ['revive'], 'Share Hope 2026': ['share hope', 'revelation today'], "Reach Your Neighbor Evangelism Retreat '27": ['reach your neighbor'],
  'GNYC School of Evangelism': ['school of evangelism'], 'The Year of Reaping (2026)': ['reaping', 'impact ny', 'mega campaign'],
  'Five-year strategic evangelism plan': [], 'Literature evangelism and GLOW tract outreach training': ['=GLOW', 'literature evangelism'],
  'GROW (Go Reach Our World) evangelism fund': [], 'Johnny Appleseed Project': ['johnny appleseed'],
  '7 for Souls': ['7 for souls'], 'IM Called: School of Evangelism and Discipleship': ['im called', 'school of evangelism'],
  'Evangelism boot camps and training weekends': ['boot camp', 'evangelism training'], 'GROW Your Church cycle': ['grow your church'], 'Hispanic Evangelistic Caravan 2027': ['caravan'],
  'Discipleship Plans': ['discipleship plan'], 'Emmanuel Institute': ['emmanuel institute', 'emmanuel training'], 'Keys to Revelation': ['keys to revelation'], 'MAP Pooled Resource Funds': ['map funds', 'map pooled'],
  'Literature evangelism: Minnesota Youth Rush and GLOW': ['youth rush', '=GLOW'], 'Each One Reach One': ['each one reach one'], 'Montana Mission Projects': ['wall of mission'], 'Renew & Restore': ['renew & restore', 'renew and restore'],
  'Growth Ministry': ['church plant', 'growth ministry'], 'Kayenta Navajo Mission': ['kayenta', 'navajo'], 'Volunteer Bible Workers': ['bible worker'],
  'Regional Ministries Training': ['regional ministries training', 'regional training'], 'Each One Reach One School of Evangelism': ['each one reach one', 'school of evangelism'],
  'Church growth initiatives': ['revitalization', 'church planting'], 'Fill the Baptistry Sabbath': ['fill the baptistry'], 'Revival in the East': ['revival in the east'],
  'Ignite Ohio 2026': ['ignite ohio'], 'Oklahoma Reconnect': ['reconnect'], 'Oregon Conference Evangelism Offering': [], 'Outreach Ministries: church-planting goal': ['church plant', 'coaching'],
  'OneVoice27 in the Pennsylvania Conference': ['onevoice', 'one voice'], 'LEAD groups for pastors': ['=LEAD'],
  'Annual planning and evaluation process': ['planning and evaluation'], 'M.A.P.S. Strategic Plan': ['m.a.p.s', '=MAPS'], '3-Year Strategic Plan': ['strategic plan'], 'Back to Church Training': ['back to church'],
  'Mission Driven': ['mission driven'], 'All Things New in the Southeastern California Conference': ['all things new'], 'Center for Discipleship & Evangelism': ['center for discipleship', '=CDE'],
  'Hispanic Region Lay Evangelism School': ['lay evangelism school', 'escuela de evangelismo', 'lay evangelism'],
  'Focused outreach to four large cities': [], '“Together in Mission” evangelism offering': ['together in mission'], 'Church Evangelism training course': ['church evangelism training', 'evangelism training'],
  'UNA VOZ 27': ['una voz'], 'MÁS esperanza': ['más esperanza', 'mas esperanza', 'más austin', 'mas austin', '=MAS', '=MÁS'], 'Together As One Convocations 2026': ['together as one'],
  'Equipping Texico': ['equipping', 'elder training', 'elders training'], 'Serve One More': ['serve one more'], 'Hispanic evangelistic caravan 2027': ['caravan'],
  'PLAN IT. FUND IT.': ['plan it'], 'Revangelism': ['revangelism'], 'Seeds: church-planting and disciple-making weekend': ['=SEEDS', '=Seeds'],
  'Reach Wisconsin': ['reach wisconsin'],
  'Digital evangelism pilot for remote areas': ['digital evangelism'], 'Evangelism 360 & ACTS evangelism training': ['evangelism 360', '=ACTS'], 'Fall Evangelism Training and 2027 evangelism planning session': ['evangelism training', 'evangelism planning'],
  'Broadcast ministry leading to a conference-wide evangelistic thrust': ['broadcast'], 'Conference-wide evangelistic thrust with “One Voice”': ['one voice', 'onevoice'],
  'Child and youth evangelism series': ['youth evangelism', 'children evangelism', "children's evangelism"],
};
const keyFor = name => Object.keys(MATCH).filter(k => name.startsWith(k) || name.includes(k)).sort((a, b) => b.length - a.length)[0];
const review = [];
for (const p of profiles) {
  for (const ini of p.stated.initiatives) {
    const k = keyFor(ini.name);
    const words = k ? MATCH[k] : [];
    // words starting with "=" are matched exactly as written (case-sensitive acronyms such as =LEAD, =ACTS), as whole words
    const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const acr = words.filter(w => w.startsWith('='));
    const plain = words.filter(w => !acr.includes(w));
    const reP = plain.length ? new RegExp(plain.map(esc).join('|'), 'i') : null;
    const reA = acr.length ? new RegExp('(^|[^A-Za-zÀ-ÿ])(' + acr.map(w => esc(w.slice(1))).join('|') + ')(?![A-Za-zÀ-ÿ])') : null;
    const hits = p._all.filter(x => { const t = x.e.title || ''; return (reP && reP.test(t)) || (reA && reA.test(t)); })
      .map(x => { const t = x.e.title || ''; const m = (reP && t.match(reP)) || (reA && t.match(reA)); return { x, pos: m ? m.index : 99 }; })
      .sort((a, b) => (a.x.level !== 'conference') - (b.x.level !== 'conference') || (a.pos > 40) - (b.pos > 40) || (!a.x.e.start) - (!b.x.e.start) || String(a.x.e.start || '').localeCompare(String(b.x.e.start || ''))).map(o => o.x);
    let lensIds = [...new Set(ini.fits.map(fi => FIT_LENS[fi]).filter(Boolean))];
    // an initiative about evangelism is measured against evangelism even when its tags say "training"
    if (/evangel|bible work|caravan|church[- ]plant/i.test(ini.name)) lensIds = ['evangelism'].concat(lensIds.filter(l => l !== 'evangelism' && l !== 'pastoral'));
    const lensCount = lensIds.reduce((s, id) => s + p.lenses[id].n, 0);
    let status;
    if (ini.firstDate && ini.firstDate.slice(0, 7) > WINDOW.to && !NOT_EVENT_KINDS.has(ini.kind)) status = 'later';
    else if (ini.status === 'planned') status = 'coming-up';
    else if (hits.length) status = 'on-calendar';
    else if (NOT_EVENT_KINDS.has(ini.kind)) status = 'not-an-event';
    else if (lensCount >= 3) status = 'area-active';
    else status = 'not-found';
    ini.calendar = {
      status,
      matches: hits.slice(0, 3).map(x => ({ title: cleanTitle(x.e.title), start: x.e.start || null, url: x.e.url })),
      matchCount: hits.length,
      lenses: lensIds, lensCount,
      words: words,
    };
    review.push(`${p.name} | ${ini.name} | ${ini.kind}/${ini.status} | ${status} | words=${JSON.stringify(words)} | ${hits.map(x => x.e.title + ' ' + (x.e.start || '')).slice(0, 4).join(' ;; ')}`);
  }
}


// ---------- default comparison set ----------
const conf = Object.fromEntries(profiles.map(p => [p.slug, p]));
const sizeGap = (a, b) => Math.abs(Math.log(a.official.members / b.official.members));
const usable = p => p.calendar.confidence !== 'low';
for (const p of profiles) {
  const picks = [];
  const add = (q, why) => { if (q && !picks.find(x => x.slug === q.slug) && q.slug !== p.slug) picks.push({ slug: q.slug, why }); };
  const others = profiles.filter(q => q.slug !== p.slug);
  const best = (list) => list.sort((a, b) => (b.calendar.confidence === 'high') - (a.calendar.confidence === 'high') || sizeGap(a, p) - sizeGap(b, p))[0];
  add(best(others.filter(q => q.union === p.union && usable(q))), 'Same union');
  add(best(others.filter(q => q.union !== p.union && usable(q) && sizeGap(q, p) < Math.log(1.6))), 'Similar size');
  const OPP = { East: 'West', West: 'East', Midwest: 'South', South: 'Midwest' };
  // v10.44 review: only East and West are "the other side of the country"; the Midwest and the South are neighbours ("another part")
  add(best(others.filter(q => q.region === OPP[p.region] && q.calendar.confidence === 'high' && !picks.find(x => x.slug === q.slug))), p.region === 'East' || p.region === 'West' ? 'Other side of the country' : 'Another part of the country');
  // strong where this calendar is thinnest
  const weakest = LENSES.filter(L => L.core).map(L => L.id).sort((a, b) => (p.lenses[b].median - p.lenses[b].share) - (p.lenses[a].median - p.lenses[a].share))[0];
  const strong = others.filter(q => q.calendar.confidence === 'high' && !picks.find(x => x.slug === q.slug)).sort((a, b) => b.lenses[weakest].share - a.lenses[weakest].share)[0];
  add(strong, `Strong in ${lc(LBL[weakest])}`);
  p.biggestGap = weakest;
  p.defaultCompare = picks.slice(0, 4);
}

// ---------- unions (context) ----------
const unions = {};
for (const [u, list] of Object.entries(INI.territory.unions)) {
  if (!UNION_REGION[u]) continue;
  unions[u] = { region: UNION_REGION[u][0], subregion: UNION_REGION[u][1], conferences: list, initiatives: INI.initiatives.filter(i => i.level === 'union' && i.union === u).map(i => ({ id: i.id, name: i.name, status: i.status, kind: i.kind, fits: i.fits || [], url: i.sources?.[0]?.url || null })) };
}

for (const p of profiles) { delete p._basis; delete p._all; }
const out = {
  name: 'Terrain conference comparison profiles',
  version: W.TODAY,
  lastChecked: W.TODAY,
  window: { from: W.PAST_FROM, to: W.TO, months: MONTHS, past12: PAST12, ahead12: AHEAD12, compared: { from: W.PAST_FROM, to: W.PAST_TO, note: 'All comparisons use these 12 months only.' }, today: YA.today },
  yearAhead: { window: YA.window, lanes: YA.lanes, about: YA.about, notPublishedAbove: YA.notPublishedAbove },
  about: [
    'One profile per US local conference (50). Built from the published event calendars (tools/conferences/src/events), the look-ahead to ' + monLabel(AHEAD12[11]) + ' (tools/conferences/src/ahead, via the year ahead), the official Annual Statistical Report figures (src/stats.json), the conference evangelism registry (src/registry) and the initiatives registry (src/initiatives.json).',
    'Comparisons (shares, typical, strengths, per-1,000 figures, confidence) use only the past 12 months, ' + PAST_LABEL + '. The year ahead (' + AHEAD_LABEL + ') is shown for planning and is never scored.',
    'A published calendar is not everything a conference does. Thin calendars are marked with calendar.confidence = low; read their shares as a picture of the website, not of the work.',
    'Shares compare what each calendar gives room to; they are not scores. Correlation is not causation: nothing here shows that a type of event causes growth.',
  ],
  definitions: {
    ministryEvents: 'Records run by the conference itself (level conference, joint, area or group), not internal meetings or committees, not observance days, not cancelled, and not administration, with a date in the past 12 months (' + PAST_LABEL + '). A repeating meeting counts once.',
    share: 'Events in a lens ÷ all conference ministry events, as a percentage.',
    touch: 'Events whose main OR second category falls in the lens.',
    vsMedian: 'Share ÷ the median share among conferences with usable (medium or high confidence) calendars. 1.0 = typical.',
    confidence: `On the past 12 months. high: grade B or better, ${CONF_RULE.highEvents}+ ministry events and ${CONF_RULE.highMonths}+ of the 12 months with conference items. low: grade below C-, fewer than ${CONF_RULE.lowEvents} ministry events, or fewer than ${CONF_RULE.lowMonths} of the 12 months. medium: everything else.`,
    yearAhead: 'Per month, ' + AHEAD_LABEL + ': published (the conference calendar reaches that month) and events in five lanes (conference, union, NAD, world church, deadlines). A month that is not published shows what is known from other pages and what happened in the same month last year.',
    multilingualCategory: 'When an event\'s main category is "multilingual", its second category is used for the lens; the language flag is kept separately (language).',
    internalTitles: INTERNAL_TITLE.source,
    eventsPer1000: 'Conference ministry events in the past 12 months ÷ the months of those 12 showing any conference item × 12 ÷ (2024 members ÷ 1,000). Small conferences score higher because camp meeting, camporee and retreats happen whatever the size.',
    joinedPer1000: '(Baptisms + professions of faith) per 1,000 members per year, 2022–2024 (ASR). Transfers are not counted: they are moves, not new believers.',
  },
  lenses: LENSES.map(({ id, label, es, cats, group, core }) => ({ id, label, es, categories: cats, group, core })),
  groups: GROUPS,
  baseline,
  unions,
  caveats: [
    'Calendars differ in how much they publish: office calendars show every meeting; news-based rebuilds show only what was reported. Compare shares, and read the confidence badge.',
    'Categories come from event titles (and department tags where given). Some titles are ambiguous; each research file notes its judgement calls.',
    'Evangelism often happens in local churches and is reported in news rather than placed on conference calendars (Hispanic caravans are a common example). Local-church events are counted separately, not in the conference share.',
    'Official statistics end in 2024 (ASR 2025). Membership audits (one-time roll clean-ups) distort growth for Allegheny East 2019, Southwest Region 2021, and South Atlantic, Southeastern, South Central and Allegheny West 2022.',
    'Correlation is not causation. A conference with more evangelism events and more baptisms does not prove one caused the other; size, migration, language groups and local culture all play a part.',
    'Never rank people. These figures describe published calendars and church records, not the faithfulness of pastors or members.',
  ],
  sources: {
    calendars: 'tools/conferences/src/events/*.json (first pass) and src/ahead/*.json (look-ahead to ' + monLabel(AHEAD12[11]) + ') — every event carries its source URL; retrieved ' + W.TODAY + '.',
    aboveTheConference: 'tools/conferences/src/ahead/above.json — NAD and world-church dates and deadlines, each with its source URL; retrieved ' + W.TODAY + '.',
    statistics: 'General Conference Office of Archives, Statistics, and Research — Annual Statistical Report, editions 2023–2025 (data years 2022–2024). URLs and PDF pages per conference in official.sources.',
    initiatives: 'tools/conferences/src/initiatives.json (the v49 initiatives registry, checked 1 Oct 2026) — each initiative has its own source URL.',
    evangelismHelp: 'tools/conferences/src/registry/*.json (the v47 registry) — conference evangelism funding rules with sources (checked 30 Sep – 1 Oct 2026).',
  },
  conferences: profiles,
};
lines.push('profiles: ' + profiles.length + ', ' + JSON.stringify(out).length + ' bytes');
lines.push('baseline lens medians ' + JSON.stringify(Object.fromEntries(Object.entries(baseline.lens).map(([k, v]) => [k, v.median]))));
lines.push('joined median ' + JSON.stringify(baseline.joinedPer1000_3yr) + ' events/1000 median ' + JSON.stringify(baseline.eventsPer1000) + ' solid ' + solid.length);
for (const p of profiles) lines.push([p.name.padEnd(24), (p.calendar.grade || '-').padEnd(3), p.calendar.confidence.padEnd(6), 'B=' + String(p.counts.ministryEvents).padEnd(4), 'mo=' + p.calendar.monthsCovered, 'ev/1k=' + p.perMembers.eventsPer1000MembersPerYear, 'join/1k=' + p.official.joinedPer1000_3yr, '|', p.character.text, '| +', p.strengths.map(s => s.lens).join(','), '| -', p.roomToGrow.map(s => s.lens).join(','), '| cmp', p.defaultCompare.map(x => x.slug).join(',')].join(' '));
return { out, review, lines };
}
