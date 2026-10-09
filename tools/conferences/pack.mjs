// The served data: conferences/ as the page loads it, from the profiles and the year ahead. Called by build.mjs.
// (The shape follows the approved v52 sample's data block, compare/build-sample.mjs, split so the first view loads quickly.)
//   conferences/index.json        everything the chooser and the comparison frames need, for all 50 conferences
//   conferences/ahead.json        the year ahead above the conference: North American Division, world church, each union
//   conferences/c/<slug>.json     one conference's details: example events, initiatives, sources, its own year ahead
// The page loads index.json when "Learn from other conferences" opens, then ahead.json and the files of the conferences
// chosen. Text that a person reads is built by the page in English or Spanish from codes and numbers; event titles, places
// and initiative names stay as published. Every link must be https (the build stops otherwise).
import { createHash } from 'node:crypto';

// Short names for narrow charts (from the sample).
export const CODES = {
  'alaska': 'AK', 'allegheny-east': 'AEC', 'allegheny-west': 'AWC', 'arizona': 'AZ', 'arkansas-louisiana': 'Ark-La', 'carolina': 'Carolina',
  'central-california': 'CCC', 'central-states': 'C.States', 'chesapeake': 'Ches.', 'dakota': 'Dakota', 'florida': 'Florida', 'georgia-cumberland': 'GCC',
  'greater-new-york': 'GNYC', 'gulf-states': 'Gulf St.', 'hawaii': 'Hawaii', 'idaho': 'Idaho', 'illinois': 'Illinois', 'indiana': 'Indiana', 'iowa-missouri': 'Iowa-Mo',
  'kansas-nebraska': 'KS-NE', 'kentucky-tennessee': 'KY-TN', 'lake-region': 'LRC', 'michigan': 'Michigan', 'minnesota': 'Minn.', 'montana': 'Montana',
  'mountain-view': 'Mtn View', 'nevada-utah': 'NUC', 'new-jersey': 'NJ', 'new-york': 'NY', 'northeastern': 'NEC', 'northern-california': 'NCC',
  'northern-new-england': 'NNEC', 'ohio': 'Ohio', 'oklahoma': 'Okla.', 'oregon': 'Oregon', 'pennsylvania': 'PA', 'potomac': 'Potomac', 'rocky-mountain': 'RMC',
  'south-atlantic': 'SAC', 'south-central': 'S.Central', 'southeastern-california': 'SECC', 'southeastern': 'SEC', 'southern-california': 'SoCal',
  'southern-new-england': 'SNEC', 'southwest-region': 'SW Region', 'texas': 'Texas', 'texico': 'Texico', 'upper-columbia': 'UCC', 'washington': 'Wash.', 'wisconsin': 'Wisc.',
};
const HELP_KINDS = new Set(['subsidy', 'grant', 'budget-line', 'in-kind', 'none-found', 'unknown']);
const STATUSES = new Set(['on-calendar', 'area-active', 'not-found', 'not-an-event', 'coming-up', 'later']);
const AREAS = ['East', 'Midwest', 'South', 'West', 'East Coast', 'California'];

function httpsOnly(u, where) {
  if (typeof u !== 'string' || !/^https:\/\/[^\s"'<>]+$/i.test(u)) throw new Error(`not an https link (${where}): ${JSON.stringify(u)}`);
  return u;
}
const day = s => (typeof s === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(s)) ? s : null;

// one year-ahead item, compact (the sample's ci(), with the link inline)
const LV = { conference: 'c', school: 's', 'local church': 'l', union: 'u', NAD: 'n', 'world church': 'w', observance: 'o', other: 'x' };
function ci(it, where) {
  const o = { t: it.title, s: it.start, m: (it.first || it.start).slice(0, 7), u: httpsOnly(it.url, where + ': ' + it.title) };
  if (it.end) o.e = it.end;
  if (it.category) o.c = it.category;
  if (it.level && LV[it.level] && LV[it.level] !== 'c') o.l = LV[it.level];
  if (it.prec && it.prec !== 'day') o.p = it.prec === 'month' ? 'm' : 's';
  if (it.count > 1) o.n = it.count;
  if (it.since) o.since = it.since;
  if (it.until) o.until = it.until;
  if (it.dates && it.regular) { o.d0 = it.dates[0]; o.d1 = it.dates[it.dates.length - 1]; }
  let f = ''; if (it.tentative) f += 't'; if (it.unconfirmed) f += 'u'; if (it.projected) f += 'p'; if (it.minor) f += 'm'; if (it.regular) f += 'r'; if (it.openEnded) f += 'o'; if (f) o.f = f;
  if (it.hints) o.h = it.hints.map(h => { const x = { k: h.k }; if (h.by) x.by = h.by; if (h.d) x.d = h.d; if (h.prec === 'month') x.p = 'm'; if (h.from) x.from = h.from; if (h.unconfirmed) x.unc = 1; return x; });
  if (it.place && it.place.length < 60) o.pl = it.place;
  return o;
}
function cd(d, where) {
  const o = { t: d.title, s: d.date, u: httpsOnly(d.url, where + ' deadline: ' + d.title), k: d.hint ? d.hint.k : 'due' };
  if (d.prec === 'month') o.p = 'm'; if (d.unconfirmed) o.f = 'u'; if (d.level) o.l = d.level === 'division' ? 'n' : d.level === 'union' ? 'u' : 'c';
  return o;
}
function suggestOf(p, d) {
  const why = String(d.why || '');
  if (why === 'Same union') return { slug: d.slug, k: 'union' };
  if (why === 'Similar size') return { slug: d.slug, k: 'size' };
  if (why === 'Other side of the country') return { slug: d.slug, k: 'side' };
  if (why === 'Another part of the country') return { slug: d.slug, k: 'other' };
  if (/^Strong in /.test(why) && p.biggestGap) return { slug: d.slug, k: 'strong', lens: p.biggestGap };
  throw new Error('unknown suggestion reason for ' + p.slug + ': ' + why);
}

// v10.44 review (2 Oct 2026): never "AI" anywhere a person reads, and "IA" is Spanish for it (the pastor's rule; README "Rules").
// Event titles stay as published, except a standalone "IA" whose meaning the source makes plain, written out here by conference.
// Any other "AI" / "IA" stops the build (name the conference and the words; add a line here, or leave the record out in src/).
export const AI_WORDS = /\bAI\b|\bIA\b|artificial intelligence|inteligencia artificial/i;
const WRITE_OUT = { 'iowa-missouri': [[/\bIA\b/g, 'Iowa']], indiana: [[/\bIA\b/g, 'Indiana Academy']] };
const LINK_KEYS = new Set(['u', 'url', 'calendarUrls']);
function writeOut(v, slug, k) {
  if (typeof v === 'string') { if (LINK_KEYS.has(k)) return v; let s = v; for (const [re, to] of WRITE_OUT[slug] || []) s = s.replace(re, to); return s; }
  if (Array.isArray(v)) return v.map(x => writeOut(x, slug, k));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, writeOut(x, slug, kk)]));
  return v;
}
function noAiWords(name, v, k = '') {
  if (typeof v === 'string') { if (!LINK_KEYS.has(k) && !/^https?:/.test(v) && AI_WORDS.test(v)) throw new Error('"AI" / "IA" in ' + name + ' (' + k + '): ' + JSON.stringify(v) + ' (write it out in pack.mjs WRITE_OUT)'); return; }
  if (Array.isArray(v)) { v.forEach(x => noAiWords(name, x, k)); return; }
  if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) noAiWords(name, x, kk);
}
// extra: more served files made beside the comparison (v10.58.0: resources.json), checked for "AI" words and hashed into the version
// v10.63.0: missions (missions.mjs): each conference's mission statement and the areas its words name; null = none found on its site
export function packServed(P, YA, extra = {}, missions = null) {
  const months = P.window.months, ahead12 = P.window.ahead12;
  if (months.length !== 24 || ahead12.length !== 12) throw new Error('window must be 24 months (12 past, 12 ahead)');
  const lensIds = P.lenses.map(l => l.id);
  const confs = [], details = {};
  for (const p of P.conferences) {
    const ya = YA.conferences[p.slug];
    if (!ya) throw new Error('no year ahead for ' + p.slug);
    const W = p.slug;
    confs.push({
      slug: p.slug, name: p.name, code: CODES[p.slug] || p.name, union: p.union, region: p.region, regional: !!p.regional, coast: p.coast || null, california: !!p.california,
      calendar: { grade: p.calendar.grade || null, confidence: p.calendar.confidence, monthsCovered: p.calendar.monthsCovered },
      counts: { ministryEvents: p.counts.ministryEvents, localChurch: p.counts.localChurch, adminAndInternal: p.counts.adminAndInternal },
      lenses: Object.fromEntries(lensIds.map(id => [id, { n: p.lenses[id].n, share: p.lenses[id].share }])),
      groups: Object.fromEntries(Object.entries(p.groups).map(([k, v]) => [k, { n: v.n, share: v.share }])),
      categories: Object.fromEntries(['youth-young-adults', 'pathfinders', 'children'].map(c => [c, { n: p.categories[c].n, share: p.categories[c].share }])),
      language: { n: p.language.n, share: p.language.share },
      months: months.map(m => p.months[m] || 0),
      published: ahead12.map(m => !!p.monthsPublished[m]),
      through: ya.through || null,
      datesAhead: ya.conf.filter(x => !x.regular).length,
      perMembers: { eventsPer1000MembersPerYear: p.perMembers.eventsPer1000MembersPerYear, ministryEventsPerYear: p.perMembers.ministryEventsPerYear },
      official: { members: p.official.members, congregations: p.official.congregations, joinedPer1000_3yr: p.official.joinedPer1000_3yr, accessionsPer1000_3yr: p.official.accessionsPer1000_3yr, baptisms2024: p.official.baptisms2024, professions2024: p.official.professions2024, flags: p.official.flags.map(f => f.year) },
      character: p.character.lenses.slice(),
      strengths: p.strengths.map(s => ({ lens: s.lens, n: s.n, share: s.share, median: s.median })),
      roomToGrow: p.roomToGrow.map(s => ({ lens: s.lens, n: s.n, share: s.share, median: s.median })),
      suggest: p.defaultCompare.map(d => suggestOf(p, d)),
      ...(missions ? { mission: missions.by[p.slug] } : {}),
    });
    const ly = {};
    for (const [m, v] of Object.entries(ya.months)) if (v.lastYear) ly[m] = v.lastYear.map(x => { const o = { t: x.title, s: x.start, u: httpsOnly(x.url, W + ' last year') }; if (x.end) o.e = x.end; return o; });
    const eh = p.stated.evangelismHelp;
    if (eh && !HELP_KINDS.has(eh.help)) throw new Error('unknown evangelism help kind for ' + p.slug + ': ' + eh.help);
    details[p.slug] = {
      slug: p.slug,
      examples: Object.fromEntries(lensIds.map(id => [id, p.lenses[id].examples.slice(0, 2).map(e => {
        const o = { title: e.title, start: day(e.start), end: day(e.end), place: e.place || null, url: httpsOnly(e.url, W + ' example') };
        if (e.count > 1) o.count = e.count; if (e.attendance) o.attendance = e.attendance; if (e.approx) o.approx = 1; return o; })])),
      initiatives: p.stated.initiatives.map(i => {
        if (!STATUSES.has(i.calendar.status)) throw new Error('unknown initiative status ' + i.calendar.status);
        const m = i.calendar.matches[0];
        return { name: i.name, firstDate: i.firstDate || null, source: i.source && i.source.url ? { url: httpsOnly(i.source.url, W + ' initiative'), publisher: i.source.publisher || '' } : null,
          status: i.calendar.status, matchCount: i.calendar.matchCount, match: m ? { title: m.title, start: day(m.start), url: m.url ? httpsOnly(m.url, W + ' initiative match') : null } : null,
          lenses: i.calendar.lenses.slice(), lensCount: i.calendar.lensCount };
      }),
      evangelismHelp: eh ? { help: eh.help, share: eh.share || null, deadline: eh.deadline || null, url: eh.url ? httpsOnly(eh.url, W + ' evangelism help') : null } : null,
      // a researcher's note after a link (one today: Rocky Mountain's plugin endpoint) is not a page to show
      calendarUrls: p.calendarUrls.filter(u => /^https:\/\/[^\s"'<>]+$/i.test(u)).slice(0, 3),
      retrieved: p.retrieved,
      // the researcher's words, without the name of the summary file some grades were taken from ("pacific-SUMMARY.md: …")
      gradeReason: p.calendar.reason ? String(p.calendar.reason).replace(/^[\w-]*SUMMARY\.md:\s*/, '').replace(/^"(.*)"$/, '$1') : null,
      statsSources: p.official.sources.map(s => ({ year: s.year, edition: s.edition, table: s.table, pdfPage: s.pdfPage, url: httpsOnly(s.url, W + ' statistics') })),
      ahead: {
        through: ya.through || null, note: { en: ya.throughNote, es: ya.throughNoteEs },
        conf: ya.conf.map(x => ci(x, W)),
        own: ya.nadOwn.map(x => Object.assign(ci(x, W), { lane: 'nad' })).concat(ya.worldOwn.map(x => Object.assign(ci(x, W), { lane: 'world' }))),
        dl: ya.deadlines.map(d => cd(d, W)),
        undated: ya.undated.map(x => { const o = { t: x.title, u: httpsOnly(x.url, W + ' undated') }; if (x.note) o.note = x.note; return o; }),
        ly,
      },
    };
  }
  const bl = P.baseline;
  const yrs = P.conferences[0].official.years;
  const index = {
    checked: P.lastChecked,
    months, past: P.window.past12.length,
    stats: { year: P.conferences[0].official.year, from: yrs[0], to: yrs[yrs.length - 1] },
    lenses: P.lenses.map(l => ({ id: l.id, en: l.label, es: l.es, group: l.group, core: !!l.core })),
    groups: P.groups.map(g => ({ id: g.id, en: g.label, es: g.es, lenses: g.lenses.slice() })),
    baseline: {
      basedOn: bl.basedOn, total: P.conferences.length,
      lens: Object.fromEntries(Object.entries(bl.lens).map(([k, v]) => [k, v.median])),
      byArea: Object.fromEntries(AREAS.map(a => [a, { n: bl.byArea[a].n, lens: bl.byArea[a].lens }])),
      joined: bl.joinedPer1000_3yr.median, eventsPer1000: bl.eventsPer1000.median,
    },
    unions: Object.fromEntries(Object.entries(P.unions).map(([u, v]) => [u, v.initiatives.filter(i => i.status !== 'ended').map(i => ({ name: i.name, url: i.url ? httpsOnly(i.url, u + ' initiative') : null }))])),
    ...(missions ? { missionChecked: missions.checked } : {}),
    conferences: confs,
  };
  const ahead = {
    window: { from: YA.window.from, to: YA.window.to }, today: YA.today,
    nad: YA.shared.nad.map(x => ci(x, 'NAD')), world: YA.shared.world.map(x => ci(x, 'world')),
    unions: Object.fromEntries(Object.entries(YA.shared.unions).map(([u, l]) => [u, l.map(x => ci(x, u))])),
  };
  // every suggested conference exists
  for (const c of confs) for (const s of c.suggest) if (!details[s.slug]) throw new Error('suggested conference missing: ' + s.slug);
  // the files, then the version: a hash of everything served (the page asks for the others with ?v=<version>)
  const files = {};
  files['ahead.json'] = JSON.stringify(ahead);
  for (const [slug, d] of Object.entries(details)) { details[slug] = writeOut(d, slug); noAiWords('c/' + slug + '.json', details[slug]); }
  noAiWords('ahead.json', ahead);
  for (const [k, v] of Object.entries(extra)) { noAiWords(k, v); files[k] = JSON.stringify(v); }
  for (const [slug, d] of Object.entries(details)) files[`c/${slug}.json`] = JSON.stringify(d);
  const h = createHash('sha256');
  for (const k of Object.keys(files).sort()) h.update(k + '\n' + files[k] + '\n');
  h.update('index\n' + JSON.stringify(index));
  index.v = h.digest('hex').slice(0, 12);
  noAiWords('index.json', index);
  files['index.json'] = JSON.stringify(index);
  return files;
}
