// v10.39.0: the reviewed checker from the Make the Case staging (check-rules.mjs),
// now reading the two files shipped at the repo root (the guide as FIREBASE-SETUP.md),
// plus, at the end, the promises the guide makes about netlify/functions/present.mjs.
// Checks FIREBASE-RULES-TERRAIN.txt and FIREBASE-SETUP.md against the spec and against
// Realtime Database rule semantics (no Java here, so no emulator):
//  - .read/.write are granted if ANY rule on the path root -> target allows it; a deeper
//    rule can add access, never remove it (docs: "Read and Write Rules Cascade").
//  - Rules are not filters: reading a parent needs a grant at that parent or above.
//  - Path keys are strings; `$room.length` is the string length.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: a folder named "terrain v10.39.0" (or "… copy") stays readable.
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const txt = fs.readFileSync(path.join(dir, 'FIREBASE-RULES-TERRAIN.txt'), 'utf8');
const md = fs.readFileSync(path.join(dir, 'FIREBASE-SETUP.md'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log('FAIL', label); } };

// --- the pasted block, exactly as the pastor will copy it ---
function block(t, startRe) {
  const i = t.search(startRe); if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < t.length; j++) {
    if (t[j] === '{') depth++;
    else if (t[j] === '}') { depth--; if (depth === 0) return t.slice(i, j + 1); }
  }
  return null;
}
const txtBlock = block(txt, /^\{\n  "rules"/m);
const mdBlock = block(md, /^\{\n  "rules"/m);
ok(txtBlock, 'rules block found in txt');
ok(mdBlock, 'rules block found in guide');
ok(txtBlock === mdBlock, 'guide and txt rules are character-identical');
const SPEC = {"rules":{".read":false,".write":false,"live":{"$room":{".read":"$room.length === 22",".write":false}}}};
const parsed = JSON.parse(txtBlock);  // throws if not valid JSON
ok(JSON.stringify(parsed) === JSON.stringify(SPEC), 'rules equal the spec JSON');
ok(!/\/\/|\/\*/.test(txtBlock), 'no comments inside the pasted JSON');
ok(!/[^\x00-\x7f]/.test(txtBlock), 'pasted JSON is plain ASCII (no smart quotes)');
ok(!/[^\x00-\x7f]/.test(txt), 'whole rules .txt is plain ASCII (safe in TextEdit)');
const rules = parsed.rules;

// --- a small evaluator for these rules ---
function ev(expr, vars, auth) {
  if (expr === true || expr === false) return expr;
  const js = String(expr).replace(/\$([A-Za-z_]\w*)/g, (m, n) => JSON.stringify(vars['$' + n]));
  return !!Function('auth', `return (${js});`)(auth);
}
function can(op, p, auth, R = rules) {
  const segs = p.split('/').filter(Boolean);
  let node = R, vars = {};
  if (node['.' + op] !== undefined && ev(node['.' + op], vars, auth)) return true;
  for (const s of segs) {
    if (!node || typeof node !== 'object') return false;
    let nxt = node[s];
    if (nxt === undefined) { const w = Object.keys(node).find(k => k.startsWith('$')); if (w) { nxt = node[w]; vars = { ...vars, [w]: s }; } }
    node = nxt;
    if (!node) return false;
    if (node['.' + op] !== undefined && ev(node['.' + op], vars, auth)) return true;
  }
  return false;
}

// --- the six Playground checks, as printed in both files ---
const A22 = 'A'.repeat(22), A21 = 'A'.repeat(21);
const PLAY = [
  ['a', 'read',  `/live/${A22}`,   null,              true],
  ['b', 'read',  `/live/${A21}`,   null,              false],
  ['c', 'read',  '/live',          null,              false],
  ['d', 'read',  '/',              null,              false],
  ['e', 'write', `/live/${A22}/i`, null,              false],
  ['f', 'write', `/live/${A22}/i`, { uid: 'test-user', provider: 'google' }, false],
];
for (const [k, op, p, auth, want] of PLAY) ok(can(op, p, auth) === want, `playground ${k} ${op} ${p}`);

// the printed locations really have 22 / 21 A's, and the expected words match
const txtLines = txt.split('\n');
for (const [k, , p, , want] of PLAY) {
  const word = want ? '[Allowed]' : '[Denied]';
  const line = txtLines.find(l => new RegExp(`^  ${k}\\) `).test(l));
  ok(line && line.includes(p + ' ') && line.includes(word), `txt check ${k} prints ${p} ${word}`);
  const row = md.split('\n').find(l => l.startsWith(`| ${k} |`));
  ok(row && row.includes('`' + p + '`') && row.includes(want ? '**Allowed**' : '**Denied**'), `guide row ${k} prints ${p}`);
}
ok(!txt.includes('A'.repeat(23)) && !md.includes('A'.repeat(23)), 'no 23-A ids anywhere');

// --- wider properties ---
for (let n = 0; n < 200; n++) {                       // real room ids: 16 random bytes, base64url
  const id = crypto.randomBytes(16).toString('base64url');
  ok(id.length === 22 && can('read', `/live/${id}`, null), 'random room id readable');
  ok(can('read', `/live/${id}/i`, null), 'room child readable (cascade)');
  ok(!can('write', `/live/${id}`, null) && !can('write', `/live/${id}/i`, { uid: 'x' }), 'room never writable');
}
for (let len = 0; len <= 40; len++) if (len !== 22 && len > 0) ok(!can('read', `/live/${'b'.repeat(len)}`, null), `length ${len} denied`);
for (const p of ['/', '/live', '/other', '/other/x', '/k', '/a/b/c'])
  for (const auth of [null, { uid: 'u' }]) { ok(!can('read', p, auth), 'read ' + p); ok(!can('write', p, auth), 'write ' + p); }

// --- the checks above really catch mistakes: each broken rule set must fail at least one ---
function spoils(R) {
  const id = crypto.randomBytes(16).toString('base64url');
  const bad = [];
  if (!can('read', `/live/${id}`, null, R)) bad.push('room unreadable');
  if (can('read', '/live', null, R) || can('read', '/', null, R)) bad.push('list/root readable');
  for (const len of [1, 21, 23, 40]) if (can('read', `/live/${'b'.repeat(len)}`, null, R)) bad.push('len ' + len);
  for (const auth of [null, { uid: 'u' }]) for (const p of ['/', '/live', `/live/${id}`, `/live/${id}/i`, '/x'])
    if (can('write', p, auth, R)) bad.push('write ' + p);
  return bad.length > 0;
}
const clone = () => JSON.parse(JSON.stringify(rules));
const BROKEN = {
  'read true at live':           r => { r.live['.read'] = true; },
  'write true at live':          r => { r.live['.write'] = true; },
  'write for signed-in at room': r => { r.live.$room['.write'] = 'auth != null'; },
  'length >= 22':                r => { r.live.$room['.read'] = '$room.length >= 22'; },
  'room read true':              r => { r.live.$room['.read'] = true; },
  'root read true':              r => { r['.read'] = true; },
  'room read removed':           r => { delete r.live.$room['.read']; },
};
ok(!spoils(rules), 'the real rules pass every property');
for (const [name, mut] of Object.entries(BROKEN)) { const r = clone(); mut(r); ok(spoils(r), 'catches broken rules: ' + name); }

// --- nothing secret-looking in either file; both env names spelled the same ---
for (const [name, t] of [['txt', txt], ['guide', md]]) {
  ok(!/[A-Za-z0-9]{40}/.test(t.replace(/A{21,22}/g, '')), `${name}: no 40-char secret-looking string`);
  ok(!/-----BEGIN|private_key"/.test(t), `${name}: no key material`);
}
ok(md.includes('`PRESENT_FB_URL`') && md.includes('`PRESENT_FB_SECRET`'), 'guide names both variables exactly');
ok(txt.includes('PRESENT_FB_SECRET'), 'txt names the secret variable');
ok(!/\.env\b|netlify\.toml|index\.html|CLAUDE\.md/.test(md + txt), 'neither file sends a setting to a repo file (.env, netlify.toml, index.html, CLAUDE.md)');

// --- what the guide says about the function is what the function does ---
const fn = fs.readFileSync(path.join(dir, 'netlify', 'functions', 'present.mjs'), 'utf8');
const sweep = fs.readFileSync(path.join(dir, 'netlify', 'functions', 'present-sweep.mjs'), 'utf8');
ok((fn.match(/process\.env\.PRESENT_FB_(URL|SECRET)/g) || []).sort().join() === 'process.env.PRESENT_FB_SECRET,process.env.PRESENT_FB_URL', 'present.mjs reads exactly the two names the guide gives');
ok(/process\.env\.PRESENT_FB_URL/.test(sweep) && /process\.env\.PRESENT_FB_SECRET/.test(sweep), 'the sweep reads the same two names');
// v10.40: present-1.1 (a verse at the foot of every content slide, the place slide)
// v10.41: present-1.2 (the pastor: "we can appeal to the conference leaders for an EVANGELISM proposal"): the conference audience
// v10.42: present-1.3 (the pastor: "I want only the presenter to have the ability to control the slides"): phone mode and PDF
// v10.42 part 3: present-1.4 (SPEC-FOCUS A: "present.mjs gets key-checked upload + public download of that one PDF per room")
ok(md.includes("present-1.4") && /FN_VERSION = 'present-1\.4'/.test(fn), 'the guide and the function agree on present-1.4');
// fix after review: present-1.4 writes two numbers, pv (the handout) and qv (the proposal to vote on); the words said one
ok(/version\s+numbers\s+of\s+the\s+handout\s+and\s+of\s+the\s+proposal\s+to\s+vote\s+on\s+\(two\s+numbers\)/.test(txt) && !/the\s+version\s+of\s+the\s+proposal\s+PDF\s+\(a\s+number\)/.test(txt),
  'the rules file says the pointer carries the version numbers of the handout and of the proposal to vote on (two numbers)');
ok(/whether phones follow/.test(txt), 'the rules file says the pointer now also says whether phones follow');
for (const st of ['ok', 'bad-key', 'unreachable', 'unset']) ok(md.includes(`"fb":"${st}"`) && fn.includes(`'${st}'`), `status answer fb:${st} is in the guide and the function`);
ok(/\/live\/\$\{room\}\.json/.test(fn) && /RE_ROOM = \/\^\[A-Za-z0-9_-\]\{22\}\$\//.test(fn), 'the function writes only live/<22-character room>, the path the rules open');
ok(/firebaseio\\\.com\|firebasedatabase\\\.app/.test(fn) && md.includes('.firebasedatabase.app'), 'both database hosts the guide allows are accepted');
ok(/secret\[0\] !== '\{'/.test(fn) && /oauth2\.googleapis\.com\/token/.test(fn), 'the key-file route in the guide is built (a key starting with "{" is traded at Google)');
ok(/replace\(\/\\\/\+\$\/, ''\)/.test(fn), 'a trailing "/" on the address (as the Data tab shows it) is removed');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
