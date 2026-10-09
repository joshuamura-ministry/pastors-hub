// v10.63.0 · the mission statements behind the brief and "Mission and calendar": tools/conferences/missions.mjs reads src/missions.json,
// and the build serves each conference's mission in conferences/index.json. The pastor (9 Oct 2026): "mission statements also need to be
// seen and collected from each conference". The rules: a line for every conference (found, or not found with the pages checked), the
// mission as published (no markup), an https link, and an area only when the mission's own words name it (the build finds the words in
// it). Made-up statements here; the real ones are checked in the served data. Written failing-first on v10.62.2.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 400)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
const ROOT = new URL('../', import.meta.url);
let M = null, B = null;
try { M = await import(new URL('tools/conferences/missions.mjs', ROOT).href); } catch (e) { console.log('  FAIL  missions.mjs cannot be imported: ' + String(e && e.message).slice(0, 120)); fail++; }
try { B = await import(new URL('tools/conferences/build.mjs', ROOT).href); } catch (e) { console.log('  FAIL  build.mjs cannot be imported: ' + String(e && e.message).slice(0, 120)); fail++; }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrain-missions-'));
const write = j => fs.writeFileSync(path.join(dir, 'missions.json'), JSON.stringify(j));
const err = f => { try { f(); return ''; } catch (e) { return String(e.message || e); } };
const SLUGS = ['alpha', 'beta'];
const GOOD = () => ({ checked: '2026-10-09', conferences: {
  alpha: { found: true, mission: 'To make disciples of Jesus Christ who share the Three Angels’ Messages with every community.', url: 'https://alpha.example/about',
    areas: [{ lens: 'discipleship', words: 'make disciples' }, { lens: 'evangelism', words: "share the Three Angels' Messages" }] },
  beta: { found: false, checked: ['https://beta.example/', 'https://beta.example/about'] } } });

if (M) {
  console.log('-- src/missions.json, read and checked --');
  fs.rmSync(path.join(dir, 'missions.json'), { force: true });
  c('no file: no missions (the page then shows no mission parts)', M.loadMissions(dir, SLUGS), null);
  write(GOOD());
  const got = M.loadMissions(dir, SLUGS);
  c('found: the words, the link and the areas, in a small shape; not found: null', [got.checked, got.by.alpha, got.by.beta],
    ['2026-10-09', { t: GOOD().conferences.alpha.mission, u: 'https://alpha.example/about', a: [{ l: 'discipleship', w: 'make disciples' }, { l: 'evangelism', w: "share the Three Angels' Messages" }] }, null]);
  c('a straight apostrophe in the words finds the curly one in the mission (and case does not matter)', /make disciples/.test(JSON.stringify(got.by.alpha.a)), true);
  const bad = (name, change, want) => { const j = GOOD(); change(j); write(j); c(name, err(() => M.loadMissions(dir, SLUGS)).includes(want), true); };
  bad('a conference with no line stops the build', j => { delete j.conferences.beta; }, 'no line for beta');
  bad('a conference the comparison does not serve stops it', j => { j.conferences.gamma = j.conferences.beta; }, 'does not serve: gamma');
  bad('words that are not in the mission stop it (no area claimed that the statement does not name)', j => { j.conferences.alpha.areas.push({ lens: 'youth', words: 'young people' }); }, '"young people" is not in the mission');
  bad('an unknown area stops it', j => { j.conferences.alpha.areas[0].lens = 'finance'; }, 'unknown area');
  bad('an area named twice stops it', j => { j.conferences.alpha.areas.push({ lens: 'discipleship', words: 'Jesus Christ' }); }, 'area named twice');
  bad('a link that is not https stops it', j => { j.conferences.alpha.url = 'http://alpha.example/about'; }, 'not an https link');
  bad('markup in a mission stops it', j => { j.conferences.alpha.mission = 'To make <b>disciples</b> of Jesus Christ everywhere.'; }, 'markup');
  bad('not found, with no pages listed as checked, stops it', j => { j.conferences.beta.checked = []; }, 'no pages listed');
  bad('a day that is not a day stops it', j => { j.checked = 'October'; }, '"checked" must be a day');
  bad('"via" is only "union"', j => { j.conferences.alpha.via = 'nad'; }, '"via" may only be "union"');
}

if (B) {
  console.log('\n-- the served data --');
  const { files } = B.buildAll();
  const idx = JSON.parse(files['index.json']);
  const src = JSON.parse(fs.readFileSync(new URL('tools/conferences/src/missions.json', ROOT), 'utf8'));
  c('the index says when the missions were checked', idx.missionChecked, src.checked);
  c('every conference has its mission, or null (none found)', idx.conferences.filter(p => !('mission' in p)).map(p => p.slug), []);
  const found = idx.conferences.filter(p => p.mission);
  c('each one found: its own words, an https link, every area\'s words inside it', found.filter(p => !(p.mission.t.length >= 20 && /^https:\/\//.test(p.mission.u)
    && p.mission.a.every(x => p.mission.t.toLowerCase().replace(/[‘’]/g, "'").includes(x.w.toLowerCase().replace(/[‘’]/g, "'"))))).map(p => p.slug), []);
  c('most conferences have one (the page says plainly where none was found)', found.length >= 35, true);
  c('conferences/ is what src/ makes (byte for byte)', Object.keys(files).filter(k => files[k] !== fs.readFileSync(new URL('conferences/' + k, ROOT), 'utf8')), []);
  c('no "AI" in any mission served', found.filter(p => /\bAI\b|\bIA\b/.test(p.mission.t)).map(p => p.slug), []);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
