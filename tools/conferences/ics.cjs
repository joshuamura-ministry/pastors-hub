// Minimal ICS reader with RRULE expansion (enough for Google/Outlook public feeds).
// Usage: const {readIcs} = require('./ics.cjs'); readIcs(path, {limitTo}) -> {events, occ}. Used by feed.mjs (Chesapeake's public feed).
const fs = require('fs');

function unfold(txt) {
  return txt.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}
function unesc(s) {
  return (s || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}
const fmtNY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function parseDT(prop) {
  // prop: {params, value}
  if (!prop) return null;
  const v = prop.value.trim();
  if (/^\d{8}$/.test(v) || (prop.params.VALUE === 'DATE')) {
    return { date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, allDay: true, time: null };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  if (m[7] === 'Z') {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
    const parts = Object.fromEntries(fmtNY.formatToParts(d).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, allDay: false, time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}` };
  }
  // local time with TZID (assume Eastern or near enough for date purposes)
  return { date: `${m[1]}-${m[2]}-${m[3]}`, allDay: false, time: `${m[4]}:${m[5]}` };
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function dayDiff(a, b) {
  return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
}
const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function parseFile(path) {
  const txt = unfold(fs.readFileSync(path, 'utf8'));
  const lines = txt.split('\n');
  const events = [];
  let cur = null, depth = 0;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = { props: {} }; continue; }
    if (line === 'END:VEVENT') { events.push(cur); cur = null; continue; }
    if (!cur) continue;
    if (line.startsWith('BEGIN:')) { depth++; continue; }
    if (line.startsWith('END:')) { depth--; continue; }
    if (depth > 0) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const head = line.slice(0, i), value = line.slice(i + 1);
    const [name, ...ps] = head.split(';');
    const params = {};
    for (const p of ps) { const [k, v] = p.split('='); params[k] = v; }
    (cur.props[name] = cur.props[name] || []).push({ params, value });
  }
  return events.map(e => {
    const g = n => (e.props[n] || [])[0];
    const start = parseDT(g('DTSTART'));
    let end = parseDT(g('DTEND'));
    if (end && end.allDay) end = { ...end, date: addDays(end.date, -1) };
    if (end && start && end.date < start.date) end = { ...start };
    const rr = g('RRULE') ? Object.fromEntries(g('RRULE').value.split(';').map(x => x.split('='))) : null;
    const exdates = [];
    for (const x of (e.props.EXDATE || [])) for (const v of x.value.split(',')) { const d = parseDT({ params: x.params, value: v }); if (d) exdates.push(d.date); }
    return {
      uid: g('UID') && g('UID').value,
      summary: unesc(g('SUMMARY') && g('SUMMARY').value).trim(),
      location: unesc(g('LOCATION') && g('LOCATION').value).trim(),
      description: unesc(g('DESCRIPTION') && g('DESCRIPTION').value).trim(),
      status: g('STATUS') && g('STATUS').value,
      start, end, rrule: rr, exdates,
      recurrenceId: g('RECURRENCE-ID') ? parseDT(g('RECURRENCE-ID')).date : null,
      transp: g('TRANSP') && g('TRANSP').value,
    };
  }).filter(e => e.start);
}

function matchesRule(rr, dtstart, d) {
  const interval = +(rr.INTERVAL || 1);
  const freq = rr.FREQ;
  const sd = new Date(dtstart + 'T12:00:00Z'), dd = new Date(d + 'T12:00:00Z');
  const wd = dd.getUTCDay();
  const dom = dd.getUTCDate();
  const month = dd.getUTCMonth() + 1;
  const byday = rr.BYDAY ? rr.BYDAY.split(',').map(x => { const m = x.match(/^([+-]?\d+)?([A-Z]{2})$/); return { n: m[1] ? +m[1] : null, wd: WD.indexOf(m[2]) }; }) : null;
  const bymonthday = rr.BYMONTHDAY ? rr.BYMONTHDAY.split(',').map(Number) : null;
  const bymonth = rr.BYMONTH ? rr.BYMONTH.split(',').map(Number) : null;
  const daysInMonth = new Date(Date.UTC(dd.getUTCFullYear(), month, 0)).getUTCDate();
  const nthOk = (b) => {
    if (b.wd !== wd) return false;
    if (b.n == null) return true;
    if (b.n > 0) return Math.ceil(dom / 7) === b.n;
    return Math.ceil((daysInMonth - dom + 1) / 7) === -b.n;
  };
  if (freq === 'DAILY') {
    if (dayDiff(dtstart, d) % interval) return false;
    if (byday && !byday.some(b => b.wd === wd)) return false;
    if (bymonth && !bymonth.includes(month)) return false;
    return true;
  }
  if (freq === 'WEEKLY') {
    // week index from start (weeks starting on the start's weekday is fine for interval 1; use Sunday-based)
    const sw = addDays(dtstart, -sd.getUTCDay());
    const cw = addDays(d, -wd);
    const weeks = dayDiff(sw, cw) / 7;
    if (weeks % interval) return false;
    if (byday) return byday.some(b => b.wd === wd);
    return wd === sd.getUTCDay();
  }
  if (freq === 'MONTHLY') {
    const months = (dd.getUTCFullYear() - sd.getUTCFullYear()) * 12 + (month - (sd.getUTCMonth() + 1));
    if (months % interval) return false;
    if (bymonth && !bymonth.includes(month)) return false;
    if (byday) {
      if (rr.BYSETPOS) {
        // all days in month matching byday, choose setpos
        const all = [];
        for (let k = 1; k <= daysInMonth; k++) {
          const x = new Date(Date.UTC(dd.getUTCFullYear(), month - 1, k)).getUTCDay();
          if (byday.some(b => b.wd === x)) all.push(k);
        }
        const pos = +rr.BYSETPOS;
        const pick = pos > 0 ? all[pos - 1] : all[all.length + pos];
        return pick === dom;
      }
      return byday.some(nthOk);
    }
    if (bymonthday) return bymonthday.some(x => (x > 0 ? x : daysInMonth + 1 + x) === dom);
    return dom === sd.getUTCDate();
  }
  if (freq === 'YEARLY') {
    const years = dd.getUTCFullYear() - sd.getUTCFullYear();
    if (years % interval) return false;
    const months = bymonth || [sd.getUTCMonth() + 1];
    if (!months.includes(month)) return false;
    if (byday) return byday.some(nthOk);
    if (bymonthday) return bymonthday.includes(dom);
    return dom === sd.getUTCDate();
  }
  return false;
}

function expand(ev, limitTo) {
  if (!ev.rrule) return [ev.start.date];
  const rr = ev.rrule;
  let until = limitTo;
  if (rr.UNTIL) { const u = parseDT({ params: {}, value: rr.UNTIL }); if (u && u.date < until) until = u.date; }
  const count = rr.COUNT ? +rr.COUNT : Infinity;
  const out = [];
  let n = 0;
  for (let d = ev.start.date; d <= until && n < count; d = addDays(d, 1)) {
    if (d === ev.start.date || matchesRule(rr, ev.start.date, d)) {
      n++;
      if (!ev.exdates.includes(d)) out.push(d);
    }
  }
  return out;
}

function readIcs(path, opts = {}) {
  const limitTo = opts.limitTo || '2029-12-31';
  const evs = parseFile(path);
  const overrides = new Map();
  for (const e of evs) if (e.recurrenceId) {
    if (!overrides.has(e.uid)) overrides.set(e.uid, new Set());
    overrides.get(e.uid).add(e.recurrenceId);
  }
  const occ = [];
  for (const e of evs) {
    const len = e.end ? dayDiff(e.start.date, e.end.date) : 0;
    let dates = expand(e, limitTo);
    if (e.rrule && overrides.has(e.uid)) dates = dates.filter(d => !overrides.get(e.uid).has(d));
    for (const d of dates) occ.push({ uid: e.uid, summary: e.summary, location: e.location, description: e.description, status: e.status, start: d, end: addDays(d, Math.max(0, len)), time: e.start.time, allDay: e.start.allDay, recurring: !!e.rrule, rrule: e.rrule, seriesStart: e.start.date, isOverride: !!e.recurrenceId });
  }
  occ.sort((a, b) => a.start.localeCompare(b.start) || a.summary.localeCompare(b.summary));
  return { events: evs, occ };
}

module.exports = { readIcs, parseFile, addDays, dayDiff };
