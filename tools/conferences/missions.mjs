// v10.63.0: each conference's mission statement as published, for the brief and "Mission and calendar" in "Learn from other conferences".
// The pastor (9 Oct 2026): "mission statements also need to be seen and collected from each conference because then you can come also
// come have a section where it compares your mission statement and what the calendar is actually saying to see if either the mission
// statement needs to or the calendar needs to change".
//
// src/missions.json (optional: no file, no mission parts on the page):
//   { "checked": "YYYY-MM-DD",
//     "conferences": { "<slug>": { "found": true, "mission": "…word for word…", "url": "https://…", "via": "union" (only when the
//                                  union's site gives it), "areas": [ { "lens": "evangelism", "words": "…words of the mission…" } ] }
//                    | { "found": false, "checked": ["https://… every page looked at"] } } }
// Every served conference must have a line (found or not). The rules, or nothing is built:
//   - the mission is the conference's own words, copied from the page: 20 to 1,600 characters, no markup; its own line breaks kept (a
//     mission printed as numbered parts, Georgia-Cumberland's), spaces within a line made single;
//   - the link is https;
//   - an area is one of the ministry lenses below, named once, and its words are words OF the mission (the build finds them in it), so
//     no area is claimed that the statement does not name.
const LENSES = new Set(['evangelism', 'pastoral', 'discipleship', 'family', 'youth', 'clubs', 'education', 'health', 'gatherings']);
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const fold = s => String(s || '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();

export function loadMissions(src, slugs) {
  const f = join(src, 'missions.json');
  if (!existsSync(f)) return null;
  const M = JSON.parse(readFileSync(f, 'utf8'));
  const bad = m => { throw new Error('missions.json: ' + m); };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(M.checked || '')) bad('"checked" must be a day (YYYY-MM-DD)');
  const C = M.conferences || {}, want = new Set(slugs), by = {}, lines = [];
  for (const k of Object.keys(C)) if (!want.has(k)) bad('a conference the comparison does not serve: ' + k);
  for (const slug of slugs) {
    const c = C[slug];
    if (!c) bad('no line for ' + slug + ' (found: true with the mission, or found: false with the pages checked)');
    if (c.found === false) {
      if (!Array.isArray(c.checked) || !c.checked.length) bad(slug + ': not found, but no pages listed as checked');
      by[slug] = null; lines.push('MISSION ' + slug + ': none found (' + c.checked.length + ' pages checked)'); continue;
    }
    if (c.found !== true) bad(slug + ': "found" must be true or false');
    const t = String(c.mission || '').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
    if (t.length < 20 || t.length > 1600) bad(slug + ': the mission must be 20 to 1,600 characters');
    if (/[<>]/.test(t)) bad(slug + ': markup in the mission');
    if (typeof c.url !== 'string' || !/^https:\/\/[^\s"'<>]+$/i.test(c.url)) bad(slug + ': not an https link: ' + JSON.stringify(c.url));
    if (c.via != null && c.via !== 'union') bad(slug + ': "via" may only be "union"');
    const seen = new Set(), a = [];
    for (const x of c.areas || []) {
      if (!LENSES.has(x.lens)) bad(slug + ': unknown area ' + JSON.stringify(x.lens));
      if (seen.has(x.lens)) bad(slug + ': area named twice: ' + x.lens);
      const w = String(x.words || '').replace(/\s+/g, ' ').trim();
      if (!w || w.length > 60) bad(slug + ': the words for ' + x.lens + ' must be 1 to 60 characters');
      if (!fold(t).includes(fold(w))) bad(slug + ': "' + w + '" is not in the mission (' + x.lens + ')');
      seen.add(x.lens); a.push({ l: x.lens, w });
    }
    by[slug] = Object.assign({ t, u: c.url, a }, c.via ? { via: 'union' } : {});
    lines.push('MISSION ' + slug + ': ' + (a.length ? a.map(x => x.l).join(', ') : 'names no area'));
  }
  return { checked: M.checked, by, lines };
}
