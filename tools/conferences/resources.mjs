// "Resources for your church" (v10.58.0): conferences/resources.json, read at the foot of "Learn from other conferences".
// The pastor (7 Oct 2026): "the box or section where I asked you to put all the different resources and grants … a grant I can request from
// the union or from the NAD or from the GC … all of those opportunities and money opportunities support from all those areas … in one
// concentrated area … to see if there's anything a church would like to do and maybe … apply for and get financial support or resources
// free"; and "recognized and in good standing ministries that travel and will come to your church like choirs from academies … speakers …
// the sanctuary … their contact and how to get a hold of them".
// From three sources, all checked by hand and kept in src/:
//   src/initiatives.json        the initiatives list (world church, NAD, unions, conferences): funding, free resources, training, and what
//                               the church is doing now (current or coming up), each with its own links;
//   src/funding.json            (optional) more grants and free help found for this box, in the same shape;
//   src/registry/*.json         each conference's evangelism help (subsidy, grant, budget line, in kind), how to ask and its sources;
//   src/ministries.json         ministries that come to a church, each with how it stands (a church body, an ASI member, or listed by one)
//                               and its own public contact route (optional: no file, no list).
// Words people read stay as the sources wrote them (English); the page labels them. Every link must be https (the build stops otherwise).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const https = (u, where) => {
  if (typeof u !== 'string' || !/^https:\/\/[^\s"'<>]+$/i.test(u)) throw new Error(`not an https link (${where}): ${JSON.stringify(u)}`);
  return u;
};
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[\s,;:]+\S*$/, '') + '…' : s; };
// what an initiative's kind is for a local church
const GROUP = { funding: 'money', resource: 'free', training: 'training' };
const NOW = new Set(['campaign', 'strategy', 'series', 'event', 'prayer', 'ministry', 'calendar-emphasis', 'process', 'literature', 'staffing', 'mission-project', 'offering']);
const HELPS = new Set(['subsidy', 'grant', 'budget-line', 'in-kind']);
export const MIN_CATS = ['sanctuary', 'music-school', 'music-group', 'evangelism', 'health', 'children-youth', 'family', 'other'];
export const MIN_STANDING = ['church-entity', 'asi-member', 'church-listed'];

function links(x, where) {
  const out = [], seen = new Set();
  for (const r of (x.resources || []).concat(x.sources || [])) {
    if (!r || typeof r.url !== 'string' || !/^https:\/\//i.test(r.url) || seen.has(r.url)) continue;
    // an apostrophe in a published address ("A Leader's Guide") is the same address written %27
    seen.add(r.url); out.push({ t: cut(r.title || r.publisher || r.url, 90), u: https(r.url.replace(/'/g, '%27'), where) });
    if (out.length === 3) break;
  }
  return out;
}

// slugOf(name) → the served conference's slug, or null; unions: the unions the comparison serves. Returns { data, lines }.
export function packResources(src, slugOf, unions) {
  const I = JSON.parse(readFileSync(join(src, 'initiatives.json'), 'utf8'));
  const lines = [];
  const R = { checked: I.lastChecked, world: [], nad: [], unions: {}, conferences: {}, help: {}, ministries: [] };
  // src/funding.json (optional): more grants and free help, in the initiatives' own shape, kept apart so the calendars' matching never reads them
  const ff = join(src, 'funding.json');
  const more = existsSync(ff) ? JSON.parse(readFileSync(ff, 'utf8')).items : [];
  const ids = new Set();
  for (const x of I.initiatives.concat(more)) {
    if (ids.has(x.id)) throw new Error('resources: the id ' + x.id + ' twice'); ids.add(x.id);
    if (x.status === 'ended') continue;
    const g = GROUP[x.kind] || (NOW.has(x.kind) ? 'now' : null);
    if (!g) continue;
    const where = 'resources: ' + x.id;
    const it = { id: x.id, g, k: x.kind, lv: x.level, o: x.owner || null, st: x.status, n: cut(x.name, 160) };
    if (x.years) it.y = cut(x.years, 90);
    if (g !== 'now') {
      const aim = (x.aims || [])[0];
      if (aim && aim.text) it.w = cut(aim.text, 300);
      const h = (x.localChurch || []).slice(0, 3).map(t => cut(t, 360)).filter(Boolean);
      if (h.length) it.h = h;
    }
    const l = links(x, where);
    if (!l.length) continue;   // nothing to open: not a resource a pastor can use
    it.l = g === 'now' ? l.slice(0, 1) : l;
    if (x.level === 'world') R.world.push(it);
    else if (x.level === 'nad') R.nad.push(it);
    else if (x.level === 'union') {
      if (!unions.has(x.union)) { lines.push('resources: ' + x.union + ' is not among the conferences served; left out: ' + x.id); continue; }
      (R.unions[x.union] = R.unions[x.union] || []).push(it);
    }
    else if (x.level === 'conference') {
      const slug = slugOf(x.conference);
      if (!slug) throw new Error('resources: no conference called ' + JSON.stringify(x.conference));
      (R.conferences[slug] = R.conferences[slug] || []).push(it);
    }
  }
  // each conference's evangelism help, when there is some
  for (const f of readdirSync(join(src, 'registry')).filter(f => f.endsWith('.json')).sort()) {
    for (const c of JSON.parse(readFileSync(join(src, 'registry', f), 'utf8'))) {
      const e = c.evangelism; if (!e || !HELPS.has(e.help)) continue;
      const slug = slugOf(c.conf); if (!slug) { lines.push('resources: ' + c.conf + ' is not among the conferences served; its evangelism help left out'); continue; }
      const l = (e.sources || []).filter((s, i, a) => s && typeof s.url === 'string' && /^https:\/\//i.test(s.url) && a.findIndex(o => o && o.url === s.url) === i).slice(0, 2)
        .map(s => ({ t: cut(s.title || s.publisher || s.url, 90), u: https(s.url.replace(/'/g, '%27'), 'resources: ' + slug + ' evangelism help') }));
      if (!l.length) continue;
      const h = { help: e.help, l };
      if (e.share) h.share = cut(e.share, 60);
      if (e.cap) h.cap = cut(e.cap, 80);
      if (e.deadline) h.deadline = cut(e.deadline, 60);
      if (e.how) h.how = cut(e.how, 420);
      const cond = (e.conditions || []).slice(0, 4).map(t => cut(t, 260)).filter(Boolean);
      if (cond.length) h.cond = cond;
      R.help[slug] = h;
    }
  }
  // ministries that come to a church (checked by hand; see src/ministries.json's "how")
  const mf = join(src, 'ministries.json');
  if (existsSync(mf)) {
    const M = JSON.parse(readFileSync(mf, 'utf8'));
    R.ministriesChecked = M.checked;
    for (const m of M.entries) {
      const where = 'ministries: ' + m.id;
      if (!/^[a-z0-9-]+$/.test(m.id || '')) throw new Error(where + ': bad id');
      if (!MIN_CATS.includes(m.category)) throw new Error(where + ': unknown category ' + m.category);
      if (!MIN_STANDING.includes(m.standing)) throw new Error(where + ': unknown standing ' + m.standing);
      if (!m.name || !m.what || !m.whatEs) throw new Error(where + ': name and what (EN + ES) are required');
      const o = { id: m.id, n: cut(m.name, 120), c: m.category, w: cut(m.what, 200), we: cut(m.whatEs, 220), st: m.standing, su: https(m.standingUrl, where + ' standing'), site: https(m.site, where + ' site') };
      if (m.who) o.who = cut(m.who, 120);
      if (m.region) o.r = cut(m.region, 120);
      if (m.invite) o.inv = https(m.invite, where + ' invite');
      if (m.email) { if (!/^[^\s@<>"]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(m.email)) throw new Error(where + ': bad email'); o.em = m.email; }
      if (m.phone) {   // shown as printed ("855-336-FREE", "… ext. 7029"); dialled as digits (letters on the keypad, an extension after a pause)
        const ph = m.phone.trim(), x = ph.match(/^([0-9A-Z+().\s-]{7,24}?)(?:\s*ext\.?\s*(\d{1,6}))?$/);
        if (!x) throw new Error(where + ': bad phone');
        const KEY = { A: 2, B: 2, C: 2, D: 3, E: 3, F: 3, G: 4, H: 4, I: 4, J: 5, K: 5, L: 5, M: 6, N: 6, O: 6, P: 7, Q: 7, R: 7, S: 7, T: 8, U: 8, V: 8, W: 9, X: 9, Y: 9, Z: 9 };
        const tel = x[1].replace(/[A-Z]/g, c => KEY[c]).replace(/[^0-9+]/g, '');
        if (tel.replace(/\D/g, '').length < 7) throw new Error(where + ': bad phone');
        o.ph = ph; o.tel = tel + (x[2] ? ',' + x[2] : '');
      }
      if (m.cost) o.cost = cut(m.cost, 240);
      if (m.notes) o.note = cut(m.notes, 240);
      R.ministries.push(o);
    }
    R.ministries.sort((a, b) => MIN_CATS.indexOf(a.c) - MIN_CATS.indexOf(b.c) || a.n.localeCompare(b.n));
  }
  return { data: R, lines };
}
