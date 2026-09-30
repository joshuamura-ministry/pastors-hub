// present-1.4 (v10.42.0, part 3): the full handout on members' phones, the proposal to vote on for the bodies that vote,
// and the slide shapes of the one focused story (the How slide, the goal, a verse slide's own head) and of the
// "Discover your gifts" Sabbath deck.
// The pastor (SPEC-FOCUS A): "locked until the presentation is complete; then they can scroll whichever slide they want
// and download it as well — a really nice PDF." — "The download on phones is THE SAME FULL HANDOUT the presenter
// downloads… present.mjs gets key-checked upload + public download of that one PDF per room (size limit, PDF magic
// check, expires with the room)." His answer (29 Sep 2026, Q2): "at the end, phones offer 'Download the handout (PDF)'
// (the full handout); for decision bodies (finance committee, church board, business meeting) ALSO 'Download the
// proposal to vote on (PDF)'." So a room keeps up to two PDFs: kind 'handout' (p/<room>, pv) and kind 'vote' (q/<room>, qv).
// Checked against an in-memory store with ETags and a stubbed Firebase, no network:
//  1. putpdf: key, base64, %PDF- / %%EOF, the active-content rule (every blocked name, a #-escaped one, an /OpenAction
//     dictionary), 1,024 bytes at least, 256 KB at most, a body over 128 KB refused for every other op while putpdf takes
//     one of 300 KB, 60 uploads a room an hour, allowed after the end, never in a room's last minute, an expired room.
//  2. versions: uploads in parallel number 1 and 2 and the newer stays; an older write never replaces a newer one.
//  3. GET ?op=pdf: no-pdf before an upload, the exact bytes and every header after, pdf-off when he switches the PDF
//     off, not-found after Remove now, the per-address counter; kind=vote is its own file.
//  4. op deck and op state say pv / pname (and qv / qname); the pointer carries pv (qv).
//  5. dropRoom and present-sweep delete p/<room> and q/<room>; the sweep's header names them.
//  6. no answer holds a key, a key's hash or a file's hash; nothing is logged.
//  7. the slide shapes (NARRATIVE T11, GIFTS §12.1 E 30–33): how (2–6 steps), goal on motion / yes / close only, a verse
//     slide's kicker and headline, part dropped, the gifts deck (congregation only) and its "Take it now" join; every
//     present-1.3 deck stored exactly as before (the same keys, in the same order, the same values).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.SITE_URL; delete process.env.TERRAIN_REG_SECRET;
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', String(JSON.stringify(g)).slice(0, 500)); console.log('    want:', String(JSON.stringify(e)).slice(0, 300)); fail++; } else pass++; };
const tick = () => new Promise(r => setImmediate(r));
function makeStore() {
  const m = new Map(); let n = 0;
  return { m,
    async get(k) { await tick(); const v = m.get(k); return v === undefined ? null : JSON.parse(v.data); },
    async getWithMetadata(k) { await tick(); const v = m.get(k); return v ? { data: JSON.parse(v.data), etag: v.etag, metadata: {} } : null; },
    async setJSON(k, val, o = {}) { await tick(); const cur = m.get(k);
      if (o.onlyIfNew && cur) return { modified: false };
      if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
      const etag = 'e' + (++n); m.set(k, { data: JSON.stringify(val), etag }); return { modified: true, etag }; },
    async delete(k) { await tick(); m.delete(k); },
    async list({ prefix = '' } = {}) { await tick(); return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key, etag: m.get(key).etag })) }; },
    peek(k) { const v = m.get(k); return v ? JSON.parse(v.data) : null; },
    raw(k) { const v = m.get(k); return v ? v.data : null; },
    poke(k, val) { m.set(k, { data: JSON.stringify(val), etag: 'e' + (++n) }); },
    keys(p = '') { return [...m.keys()].filter(k => k.startsWith(p)); } };
}
let S = makeStore(); globalThis.__terrainPresentStore = S;
const FB = 'https://terrain-live-default-rtdb.firebaseio.com', FBS = 'fb-secret/TEST+pdf';
process.env.PRESENT_FB_URL = FB; process.env.PRESENT_FB_SECRET = FBS;
let calls = []; const RT = {};
globalThis.fetch = async (url, o = {}) => {
  const u = String(url), body = o.body === undefined ? undefined : JSON.parse(o.body); calls.push({ u, method: o.method || 'GET', body });
  const m = /\/live\/([A-Za-z0-9_-]{22})\.json/.exec(u);
  if (m && o.method === 'PATCH') RT[m[1]] = { ...(RT[m[1]] || {}), ...body };
  if (m && o.method === 'DELETE') delete RT[m[1]];
  return { ok: true, status: 200, json: async () => (m ? (RT[m[1]] ?? null) : {}) };
};
const fn = (await import(new URL('../netlify/functions/present.mjs', import.meta.url).href)).default;
const logs = [], bodies = [];
const REAL = { log: console.log, error: console.error, warn: console.warn, info: console.info };
const URL0 = 'https://x.test/.netlify/functions/present';
async function call(req, ip = '198.51.100.7') {
  console.log = console.error = console.warn = console.info = (...a) => logs.push(a.map(String).join(' '));
  let r; try { r = await fn(req, { ip, site: { url: 'https://pastorshub.org' } }); } finally { Object.assign(console, REAL); }
  const type = r.headers.get('content-type') || '';
  if (/json/.test(type)) { const t = await r.text(); bodies.push(t); return { status: r.status, j: JSON.parse(t), h: r.headers }; }
  const buf = Buffer.from(await r.arrayBuffer());
  return { status: r.status, j: {}, h: r.headers, buf };
}
const post = (b, raw) => call(new Request(URL0, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw !== undefined ? raw : JSON.stringify(b) }));
const get = (q, ip) => call(new Request(URL0 + '?' + q, { method: 'GET' }), ip);
const clone = v => JSON.parse(JSON.stringify(v));

// A real handout-like PDF from jsPDF (as the page makes it), and bytes made to break one rule each.
function realPdf(lines = 40, pages = 1) {
  const d = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  for (let p = 0; p < pages; p++) { if (p) d.addPage(); for (let i = 0; i < lines; i++) d.text('A food pantry, on a schedule · line ' + (i + 1) + ' of the handout, page ' + (p + 1), 50, 60 + i * 16); }
  return Buffer.from(d.output('arraybuffer'));
}
const GOOD = realPdf();
const b64 = buf => buf.toString('base64');
// the same PDF with text inserted just before the end-of-file marker (the marker kept last)
const withObj = (s, buf = GOOD) => { const t = buf.toString('latin1'), i = t.lastIndexOf('%%EOF'); return Buffer.from(t.slice(0, i) + s + '\n' + t.slice(i), 'latin1'); };
const PDF_BLOCK = ['JavaScript', 'Launch', 'EmbeddedFile', 'EmbeddedFiles', 'RichMedia', 'XFA', 'ObjStm', 'GoToR', 'GoToE', 'SubmitForm', 'ImportData',
  'URI', 'Annots', 'AA', 'Link', 'AcroForm', 'Widget', 'GoTo', 'Named', 'Rendition', 'Sound', 'Movie', 'Image'];

const deck = (o = {}) => clone({ kind: 'tdeck', ver: 1, lang: 'en', title: 'A food pantry', church: 'Bucks County SDA', audience: { type: 'board', group: 'board' }, ministry: { id: 'food-pantry', name: 'A food pantry' },
  slides: [{ type: 'join', note: '' }, { type: 'motion', kicker: 'The motion', headline: 'A trial of six weeks', rows: [['Runs', '17 Oct – 28 Nov']], by: '' }, { type: 'close', headline: 'Thank you', text: 'Speak to the pastor.', quote: null }], ...o });
const open = async (o = {}, extra = {}) => (await post({ op: 'open', deck: deck(o), mode: 'follow', ...extra })).j;
const pput = (A, buf, x = {}) => post({ op: 'putpdf', room: A.room, key: A.key, pdf: typeof buf === 'string' ? buf : b64(buf), name: 'Bucks-County-SDA-food-pantry-board-2026-09-29.pdf', lang: 'en', ...x });

console.log('-- the version --');
{ const r = await get(''); c('status says present-1.4', [r.status, r.j.fn], [200, 'present-1.4']); }

console.log('\n-- 1. putpdf: who may, and what it takes --');
let A;
{ A = await open();
  c('(a room)', typeof A.room, 'string');
  let r = await post({ op: 'putpdf', room: A.room, pdf: b64(GOOD) });
  c('no key: 403 bad-key', [r.status, r.j.error], [403, 'bad-key']);
  r = await pput({ ...A, key: 'Z'.repeat(43) }, GOOD);
  c('a wrong key: 403 bad-key', [r.status, r.j.error], [403, 'bad-key']);
  r = await pput({ room: 'Q'.repeat(22), key: A.key }, GOOD);
  c('no such room: 404 not-found', [r.status, r.j.error], [404, 'not-found']);
  r = await pput({ room: 'bad', key: A.key }, GOOD);
  c('a malformed room: 400 bad-room', [r.status, r.j.error], [400, 'bad-room']);
  r = await get('op=putpdf&room=' + A.room);
  c('GET op putpdf: 405 (only POST writes)', [r.status, r.j.error], [405, 'method']);
  r = await pput(A, 'not base64 at all!');
  c('text that is not base64: 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  r = await pput(A, '');
  c('an empty PDF: 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  r = await post({ op: 'putpdf', room: A.room, key: A.key, pdf: 12345 });
  c('a PDF that is not a string: 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  r = await pput(A, Buffer.concat([Buffer.from('%PDX-'), GOOD.subarray(5)]));
  c('bytes that do not start %PDF-: 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  const noEof = Buffer.from(GOOD.toString('latin1').replace(/%%EOF\s*$/, '%%END\n'), 'latin1');
  r = await pput(A, noEof);
  c('bytes that do not end %%EOF: 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  r = await pput(A, Buffer.concat([GOOD, Buffer.from('\n'.repeat(80))]));
  c('%%EOF followed by more than 64 bytes: 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  r = await pput(A, Buffer.concat([GOOD, Buffer.from(' \r\n')]));
  c('%%EOF with trailing white space: taken', [r.status, r.j.pv], [200, 1]);
  const blocked = [];
  for (const n of PDF_BLOCK) { const x = await pput(A, withObj(`99 0 obj << /S /${n} >> endobj`)); if (!(x.status === 400 && x.j.error === 'bad-pdf')) blocked.push(n); }
  c('every blocked name (JavaScript, Launch, URI, Annots, Link, AcroForm, Image…): 400 bad-pdf', blocked, []);
  r = await pput(A, withObj('99 0 obj << /S /Java#53cript >> endobj'));
  c('a #-escaped name (/Java#53cript): 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  r = await pput(A, withObj('99 0 obj << /OpenAction << /S /Thread >> >> endobj'));
  c('an /OpenAction dictionary (not jsPDF’s page view): 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  const tiny = Buffer.from('%PDF-1.3\n' + 'x'.repeat(1023 - 16) + '\n%%EOF\n', 'latin1');
  c('(a 1,023-byte file)', tiny.length, 1023);
  r = await pput(A, tiny);
  c('under 1,024 bytes: 400 bad-pdf', [r.status, r.j.error], [400, 'bad-pdf']);
  const big = Buffer.from('%PDF-1.3\n' + 'x'.repeat(256 * 1024 + 1 - 16) + '\n%%EOF\n', 'latin1');
  c('(a file of 256 KB + 1 byte)', big.length, 256 * 1024 + 1);
  r = await pput(A, big);
  c('over 256 KB: 413 too-large', [r.status, r.j.error], [413, 'too-large']);
  const bigOk = Buffer.from('%PDF-1.3\n' + 'x'.repeat(220 * 1024) + '\n%%EOF\n', 'latin1');
  const body = JSON.stringify({ op: 'putpdf', room: A.room, key: A.key, pdf: b64(bigOk) });
  c('(a putpdf body of about 300 KB)', body.length > 290 * 1024 && body.length < 400 * 1024, true);
  r = await post(null, body);
  c('…is taken (putpdf has its own body limit, 400 KB)', [r.status, r.j.ok], [200, true]);
  r = await post({ op: 'update', room: A.room, key: A.key, deck: deck(), pad: 'x'.repeat(130 * 1024) });
  c('op update with a body over 128 KB: still 413 (every other op keeps its limit)', [r.status, r.j.error], [413, 'too-large']);
  r = await post({ op: 'open', deck: deck(), pad: 'x'.repeat(200 * 1024) });
  c('op open with a body of 200 KB: 413', [r.status, r.j.error], [413, 'too-large']);
  r = await post(null, JSON.stringify({ op: 'putpdf', room: A.room, key: A.key, pdf: 'A'.repeat(410 * 1024) }));
  c('a putpdf body over 400 KB: 413', [r.status, r.j.error], [413, 'too-large']);
  r = await post(null, '{' + ' '.repeat(200 * 1024) + '"op":"status"');
  c('a broken body over 128 KB: 413, not read as anything', [r.status, r.j.error], [413, 'too-large']);
  r = await pput(A, GOOD, { kind: 'poster' });
  c('a kind that is not handout or vote: 400 bad-kind', [r.status, r.j.error], [400, 'bad-kind']);
  r = await pput(A, GOOD, { name: '../../etc/passwd' });
  c('a file name that is not Terrain’s shape becomes Terrain-proposal.pdf', [r.status, S.peek('p/' + A.room).name], [200, 'Terrain-proposal.pdf']);
  r = await pput(A, GOOD, { lang: 'fr' });
  c('a language other than es is kept as en', S.peek('p/' + A.room).lang, 'en');
}

console.log('\n-- 1b. the limits of time --');
{ const Z = await open(); let n = 0, last = null;
  for (let i = 0; i < 61; i++) { last = await pput(Z, GOOD, { kind: i % 2 ? 'vote' : 'handout' }); if (last.status === 200) n++; }
  c('60 uploads a room an hour (both documents together), then 429 slow-down', [n, last.status, last.j.error], [60, 429, 'slow-down']);
  const E = await open();
  await post({ op: 'end', room: E.room, key: E.key });
  let r = await pput(E, GOOD);
  c('after op end: taken (a decision recorded after the end reaches the phones)', [r.status, r.j.pv], [200, 1]);
  const Y = await open();
  const rec = S.peek('r/' + Y.room); rec.expires = Date.now() + 30 * 1000; S.poke('r/' + Y.room, rec);
  r = await pput(Y, GOOD);
  c('a room in its last minute takes no PDF (the sweep could miss it)', [r.status, r.j.error, S.peek('p/' + Y.room)], [404, 'not-found', null]);
  rec.expires = Date.now() - 1000; S.poke('r/' + Y.room, rec);
  r = await pput(Y, GOOD);
  c('an expired room: 404, and it is deleted on sight', [r.status, S.peek('r/' + Y.room)], [404, null]);
}

console.log('\n-- 2. versions --');
{ const V = await open();
  const [x, y] = await Promise.all([pput(V, GOOD, { name: 'first.pdf' }), pput(V, realPdf(30), { name: 'second.pdf' })]);
  c('two uploads in parallel: numbered 1 and 2', [x.status, y.status, [x.j.pv, y.j.pv].sort()], [200, 200, [1, 2]]);
  c('…the room says 2, and the file kept is number 2', [S.peek('r/' + V.room).pv, S.peek('p/' + V.room).v], [2, 2]);
  const newer = { ...S.peek('p/' + V.room), v: 9, name: 'Newer.pdf' }; S.poke('p/' + V.room, newer);
  const z = await pput(V, GOOD, { name: 'Late.pdf' });
  c('an older write arriving late (room says 3, the file is 9) never replaces the newer file', [z.j.pv, S.peek('p/' + V.room).v, S.peek('p/' + V.room).name], [3, 9, 'Newer.pdf']);
  c('the stored file: its number, name, language, size, a SHA-256, a time, the bytes', Object.keys(S.peek('p/' + V.room)).sort(), ['at', 'b64', 'lang', 'name', 'sha', 'size', 'v']);
}

console.log('\n-- 3. GET ?op=pdf --');
{ const G = await open();
  let r = await get('op=pdf&room=' + G.room);
  c('before any upload: 404 no-pdf (JSON)', [r.status, r.j.error], [404, 'no-pdf']);
  r = await get('op=pdf&room=bad');
  c('a malformed room: 400 bad-room', [r.status, r.j.error], [400, 'bad-room']);
  r = await get('op=pdf&room=' + 'Q'.repeat(22));
  c('no such room: 404 not-found', [r.status, r.j.error], [404, 'not-found']);
  calls = [];
  const up = await pput(G, GOOD, { name: 'Bucks-County-SDA-food-pantry-board-2026-09-29.pdf' });
  c('upload: {ok, kind, pv, size, pointer}', [up.j.ok, up.j.kind, up.j.pv, up.j.size, up.j.pointer], [true, 'handout', 1, GOOD.length, true]);
  const pat = calls.filter(x => x.method === 'PATCH');
  // fix after review: an upload is not the presenter's move (a decision recorded in step 3 days later must not lock the phones
  // on that room again), so it writes the new number alone, no time
  c('the pointer gets the new number, nothing else (no time)', [pat.length, pat[0] && Object.keys(pat[0].body).sort(), RT[G.room].pv], [1, ['pv'], 1]);
  r = await get('op=pdf&room=' + G.room + '&v=1');
  c('then: 200 with the exact bytes', [r.status, !!r.buf && Buffer.compare(r.buf, GOOD) === 0], [200, true]);
  const H = k => r.h.get(k);
  c('headers: application/pdf, attachment with the file name, the length', [H('content-type'), H('content-disposition'), H('content-length')],
    ['application/pdf', 'attachment; filename="Bucks-County-SDA-food-pantry-board-2026-09-29.pdf"', String(GOOD.length)]);
  c('headers: no-store, nosniff, a sandbox, same-origin, no referrer', [H('cache-control'), H('x-content-type-options'), H('content-security-policy'), H('cross-origin-resource-policy'), H('referrer-policy')],
    ['no-store, max-age=0', 'nosniff', "default-src 'none'; sandbox", 'same-origin', 'no-referrer']);
  r = await post({ op: 'pdf', room: G.room });
  c('POST op pdf: 405 (a download is a GET)', [r.status, r.j.error], [405, 'method']);
  r = await get('op=pdf&room=' + G.room + '&kind=vote');
  c('kind=vote before a vote proposal is sent: 404 no-pdf', [r.status, r.j.error], [404, 'no-pdf']);
  const vote = realPdf(12);
  const up2 = await pput(G, vote, { kind: 'vote', name: 'Bucks-County-SDA-food-pantry-proposal-board-2026-09-29.pdf' });
  c('the proposal to vote on: its own number (qv) and its own file (q/<room>)', [up2.status, up2.j.kind, up2.j.qv, S.peek('r/' + G.room).qv, !!S.peek('q/' + G.room), S.peek('r/' + G.room).pv], [200, 'vote', 1, 1, true, 1]);
  r = await get('op=pdf&room=' + G.room + '&kind=vote');
  c('kind=vote: its bytes, its name', [r.status, Buffer.compare(r.buf, vote) === 0, r.h.get('content-disposition')], [200, true, 'attachment; filename="Bucks-County-SDA-food-pantry-proposal-board-2026-09-29.pdf"']);
  r = await get('op=pdf&room=' + G.room + '&kind=other');
  c('another kind: 400 bad-kind', [r.status, r.j.error], [400, 'bad-kind']);
  await post({ op: 'mode', room: G.room, key: G.key, pdf: false });
  r = await get('op=pdf&room=' + G.room);
  const rv = await get('op=pdf&room=' + G.room + '&kind=vote');
  c('he switches "Offer the PDF on phones" off: 403 pdf-off, both documents', [r.status, r.j.error, rv.status, rv.j.error], [403, 'pdf-off', 403, 'pdf-off']);
  await post({ op: 'mode', room: G.room, key: G.key, pdf: true });
  r = await get('op=pdf&room=' + G.room);
  c('…and on again: 200', r.status, 200);
  // the counter, per address AND room (fix after review: "On one church Wi-Fi address this uses up the limit of 120 downloads
  // an hour quickly… one address serves at most 60 phones for a vote deck"): 600 an hour, a whole church on one Wi-Fi
  let ok = 0, lastR = null;
  for (let i = 0; i < 601; i++) { lastR = await get('op=pdf&room=' + G.room + (i % 2 ? '&kind=vote' : ''), '203.0.113.50'); if (lastR.status === 200) ok++; }
  c('600 downloads an hour from one address for one room (the two documents together), then 429 slow-down', [ok, lastR.status, lastR.j.error], [600, 429, 'slow-down']);
  r = await get('op=pdf&room=' + G.room, '203.0.113.51');
  c('…another address is not held up', r.status, 200);
  { const G2 = await open(); await pput(G2, GOOD);
    r = await get('op=pdf&room=' + G2.room, '203.0.113.50');
    c('…nor the same address in another room', r.status, 200); }
  // the finding's case: 70 phones on one address, a vote deck, and one decision recorded afterwards. Each phone takes the handout
  // and the proposal to vote on, then both again (their numbers went up): 280 downloads, every one served
  { const V = await open(); await pput(V, GOOD); await pput(V, realPdf(12), { kind: 'vote' });
    let served = 0;
    for (let round = 0; round < 2; round++) {
      if (round) { await pput(V, GOOD); await pput(V, realPdf(12), { kind: 'vote' }); }
      for (let p = 0; p < 70; p++) for (const q of ['', '&kind=vote']) { const x = await get('op=pdf&room=' + V.room + q, '198.51.100.7'); if (x.status === 200) served++; } }
    c('70 phones on one church Wi-Fi, a vote deck and a decision afterwards: all 280 downloads served', served, 280); }
  await post({ op: 'remove', room: G.room, key: G.key });
  r = await get('op=pdf&room=' + G.room);
  c('after Remove now: 404 not-found, and both files are gone', [r.status, r.j.error, S.peek('p/' + G.room), S.peek('q/' + G.room)], [404, 'not-found', null, null]);
}

console.log('\n-- 4. op deck and op state say pv / pname; the pointer carries pv --');
{ const D = await open();
  let d = await get('op=deck&room=' + D.room), s = await get('op=state&room=' + D.room);
  c('before an upload: pv 0, pname empty (and qv 0)', [d.j.pv, d.j.pname, d.j.qv, d.j.qname, s.j.pv, s.j.pname, s.j.qv], [0, '', 0, '', 0, '', 0]);
  await pput(D, GOOD, { name: 'Handout.pdf' }); await pput(D, GOOD, { name: 'Handout-2.pdf' }); await pput(D, GOOD, { kind: 'vote', name: 'Vote.pdf' });
  d = await get('op=deck&room=' + D.room); s = await get('op=state&room=' + D.room);
  c('after: op deck says pv 2, pname, qv 1, qname', [d.j.pv, d.j.pname, d.j.qv, d.j.qname], [2, 'Handout-2.pdf', 1, 'Vote.pdf']);
  c('…op state says the same (and the pointer’s own copy)', [s.j.pv, s.j.pname, s.j.qv, s.j.qname, s.j.state && s.j.state.pv, s.j.state && s.j.state.qv], [2, 'Handout-2.pdf', 1, 'Vote.pdf', 2, 1]);
  // fix after review ("A phone that opens the link later, or reloads, takes the pointer's old time as 'just heard from the
  // presenter'"): op deck and op state say the server's clock (now), and op state how old the pointer's time is (age)
  { const t0 = Date.now(); RT[D.room] = { ...(RT[D.room] || {}), at: t0 - 31 * 60 * 1000 };
    d = await get('op=deck&room=' + D.room); s = await get('op=state&room=' + D.room);
    c('op deck and op state answer now (the server’s clock)', [typeof d.j.now, Math.abs(d.j.now - Date.now()) < 5000, typeof s.j.now, Math.abs(s.j.now - Date.now()) < 5000], ['number', true, 'number', true]);
    c('…op state: the pointer’s age (31 minutes here)', [s.j.state.at, s.j.state.age >= 31 * 60 * 1000, s.j.state.age < 31 * 60 * 1000 + 5000], [t0 - 31 * 60 * 1000, true, true]); }
  delete process.env.PRESENT_FB_URL;
  s = await get('op=state&room=' + D.room);
  c('…and without live follow set up (no pointer), the room’s own', [s.j.state, s.j.pv, s.j.qv], [null, 2, 1]);
  c('…still with now', typeof s.j.now, 'number');
  process.env.PRESENT_FB_URL = FB;
  const rec = S.peek('r/' + D.room); rec.pv = 'x'; rec.pname = 5; S.poke('r/' + D.room, rec);
  await new Promise(r => setTimeout(r, 10));
  d = await get('op=deck&room=' + D.room);
  c('a room record with a bad number reads as 0 and an empty name', [d.j.pv, d.j.pname], [0, '']);
}

console.log('\n-- 5. retention: the room’s files go with it --');
{ const R = await open(); await pput(R, GOOD); await pput(R, GOOD, { kind: 'vote' });
  c('(p/ and q/ written)', [!!S.peek('p/' + R.room), !!S.peek('q/' + R.room)], [true, true]);
  const rec = S.peek('r/' + R.room); rec.expires = Date.now() - 1000; S.poke('r/' + R.room, rec);
  await get('op=deck&room=' + R.room);
  c('a room expired on sight: its PDFs are deleted with it', [S.peek('p/' + R.room), S.peek('q/' + R.room), S.peek('r/' + R.room)], [null, null, null]);
  const sweepSrc = (await import('node:fs')).readFileSync(new URL('../netlify/functions/present-sweep.mjs', import.meta.url), 'utf8');
  c('present-sweep-1.1, and its header names the PDFs', [/present-sweep-1\.1/.test(sweepSrc.split('\n')[0]), /p\/<room>/.test(sweepSrc), /q\/<room>/.test(sweepSrc)], [true, true, true]);
  const sweepMod = await import(new URL('../netlify/functions/present-sweep.mjs', import.meta.url).href);
  const st = makeStore(); globalThis.__terrainPresentStore = st; S = st;
  const now = Date.now(), day = t => new Date(t).toISOString().slice(0, 10);
  const Q = await open(); await pput(Q, GOOD); await pput(Q, GOOD, { kind: 'vote' });
  const L = await open(); await pput(L, GOOD);
  const rr = st.peek('r/' + Q.room); st.m.delete(`x/${day(rr.expires)}/${Q.room}`); rr.expires = now - 2 * 864e5; st.poke('r/' + Q.room, rr); st.poke(`x/${day(rr.expires)}/${Q.room}`, {});
  const out = await (await sweepMod.default(new Request('https://x/', { method: 'POST', body: '{}' }))).json();
  c('the sweep deletes an expired room’s handout and proposal', [out.ok, st.peek('p/' + Q.room), st.peek('q/' + Q.room), st.peek('r/' + Q.room)], [true, null, null, null]);
  c('…and keeps a live room’s', !!st.peek('p/' + L.room), true);
  // the sweep also catches a PDF written after a room was removed (an upload in flight)
  const W = await open(); await post({ op: 'remove', room: W.room, key: W.key });
  st.poke('p/' + W.room, { v: 1, b64: 'late' }); st.poke('q/' + W.room, { v: 1, b64: 'late' });
  const mk = st.keys('x/').find(k => k.endsWith('/' + W.room)); st.m.delete(mk); st.poke(`x/${day(now - 864e5)}/${W.room}`, {});
  await sweepMod.default(new Request('https://x/', { method: 'POST', body: '{}' }));
  c('…and a late write after Remove now', [st.peek('p/' + W.room), st.peek('q/' + W.room)], [null, null]);
}

console.log('\n-- 6. nothing secret in any answer; nothing logged --');
{ const K = await open(); await pput(K, GOOD);
  const rec = S.peek('r/' + K.room), p = S.peek('p/' + K.room);
  await get('op=deck&room=' + K.room); await get('op=state&room=' + K.room);
  c('no answer carries a room key (but the open that made it), its hash, a file’s hash or the Firebase secret',
    bodies.some(t => (t.includes(K.key) && !t.includes('"key":"' + K.key + '"')) || t.includes(rec.keyHash) || t.includes(p.sha) || t.includes(FBS)), false);
  c('nothing is logged', logs, []);
}

console.log('\n-- 7. the slide shapes: present-1.4 --');
const SL = {
  motion: { type: 'motion', kicker: 'The motion', headline: 'A trial of six weeks', rows: [['Runs', '17 Oct – 28 Nov']], by: 'Prepared by the pastor' },
  how: { type: 'how', kicker: 'How it works', headline: 'Four steps to carry our neighbours in prayer', steps: ['Print the calendar.', 'Deliver it by hand.', 'Pray for each street on its day.', 'Invite requests by the card.'], source: 'Idea Library', verse: { text: 'Commit thy works unto the LORD…', ref: 'Proverbs 16:3 · KJV' } },
  verse: { type: 'verse', text: 'Seek the peace of the city…', ref: 'Jeremiah 29:7', version: 'KJV' },
  yes: { type: 'yes', kicker: 'Three sizes of yes', headline: 'Will you join us?', options: [{ k: 'pray', label: 'Pray', text: 'Pray' }, { k: 'help', label: 'Help', text: 'Help' }, { k: 'lead', label: 'Lead', text: 'Lead' }], respond: true },
  close: { type: 'close', headline: 'Will you approve it?', text: 'Thank you.', quote: null }
};
const T11 = (slides, o = {}) => deck({ slides: [{ type: 'join', note: '' }, ...slides], ...o });
let ipN = 0;   // many rooms: each from its own address (20 opens an hour per address)
const stored = async d => { const r = await call(new Request(URL0, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'open', deck: d }) }), '192.0.2.' + (++ipN % 250)); return r.status === 200 ? { r, d: S.peek('d/' + r.j.room).deck } : { r, d: null }; };
{ let x = await stored(T11([SL.how]));
  c('how: kept with its kicker, headline, steps, source and foot verse', x.d && x.d.slides[1], SL.how);
  for (const n of [2, 6]) { x = await stored(T11([{ ...SL.how, steps: Array.from({ length: n }, (_, i) => 'Step ' + (i + 1) + '.') }]));
    c(`how with ${n} steps: taken`, [x.r.status, x.d && x.d.slides[1].steps.length], [200, n]); }
  for (const n of [0, 1, 7]) { x = await stored(T11([{ ...SL.how, steps: Array.from({ length: n }, (_, i) => 'Step ' + (i + 1)) }]));
    c(`how with ${n} step(s): 400 bad-deck where slides[1].steps`, [x.r.status, x.r.j.error, x.r.j.where], [400, 'bad-deck', 'slides[1].steps']); }
  x = await stored(T11([{ ...SL.how, steps: undefined }]));
  c('how without steps: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'slides[1].steps']);
  x = await stored(T11([{ ...SL.how, steps: ['One.', 'x'.repeat(401)] }]));
  c('a step over 400 characters: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'slides[1].steps[1]']);
  x = await stored(T11([{ ...SL.how, steps: ['One.', '<b>Two</b>'] }]));
  c('a step with markup: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'slides[1].steps[1]']);
  x = await stored(T11([{ ...SL.how, steps: ['One.', 7] }]));
  c('a step that is not text: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'slides[1].steps[1]']);
  const G = 'Our neighbours know this church prays for them, and feel free to ask us for prayer.';
  x = await stored(T11([{ ...SL.motion, goal: G }, { ...SL.yes, goal: G }, { ...SL.close, goal: G }]));
  c('goal: kept on motion, yes and close', [x.r.status, x.d && x.d.slides.slice(1).map(s => s.goal)], [200, [G, G, G]]);
  x = await stored(T11([{ ...SL.how, goal: G }, { ...SL.verse, goal: G }, { type: 'risks', kicker: 'k', headline: 'h', items: ['a'], source: '', goal: G }]));
  c('goal: dropped elsewhere (how, verse, risks)', [x.r.status, x.d && x.d.slides.slice(1).map(s => 'goal' in s)], [200, [false, false, false]]);
  x = await stored(T11([{ ...SL.motion, goal: 'x'.repeat(401) }]));
  c('a goal over 400 characters: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'slides[1].goal']);
  x = await stored(T11([{ ...SL.close, goal: 'Our <script> goal' }]));
  c('a goal with markup: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'slides[1].goal']);
  x = await stored(T11([{ ...SL.verse, kicker: 'Why carry our neighbours in prayer?', headline: 'Why carry our neighbours in prayer?' }]));
  c('a verse slide’s kicker and headline: kept', x.d && [x.d.slides[1].kicker, x.d.slides[1].headline], ['Why carry our neighbours in prayer?', 'Why carry our neighbours in prayer?']);
  x = await stored(T11([{ ...SL.verse, headline: 7 }]));
  c('a verse headline that is not text: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'slides[1].headline']);
  x = await stored(T11([{ ...SL.motion, part: 'agreed' }, { type: 'ask', part: 'decide', kicker: 'k', headline: 'Let’s decide together', rows: [['Option 1', 'Tue evening']], verse: null }]));
  c('part (agreed, decide) is dropped, as any unknown field', [x.r.status, x.d && x.d.slides.slice(1).map(s => 'part' in s)], [200, [false, false]]);
  // the Sabbath deck: gifts {pub}, and the "Take it now" join (GIFTS §10.1, §12.1 E 30–33)
  const PUB = 'QLvn7p0Tqzd5';
  const gd = (o = {}) => deck({ audience: { type: 'congregation', group: 'congregation' }, ministry: { id: 'gifts-first', name: 'Discover your gifts' }, gifts: { pub: PUB },
    slides: [{ type: 'join', note: '' }, { type: 'motion', kicker: 'This Sabbath', headline: 'Every member discovers their gifts', rows: [], by: '' }, { type: 'join', gifts: true, note: 'Already following on your phone? Tap Begin there.' }, { type: 'close', headline: 'Will you discover where God has gifted you?', text: 'Fifteen minutes today.', quote: null }], ...o });
  x = await stored(gd());
  c('gifts {pub} kept for the whole church', [x.r.status, x.d && x.d.gifts], [200, { pub: PUB }]);
  c('…slide 1 is the room’s own link and code', x.d && [x.d.slides[0].qrUrl, x.d.slides[0].code6 === x.r.j.code, 'gifts' in x.d.slides[0]], ['https://pastorshub.org/#watch=' + x.r.j.room, true, false]);
  c('…the "Take it now" join: the assessment’s link (built here, never the page’s), no code, gifts:true', x.d && [x.d.slides[2].qrUrl, x.d.slides[2].code6, x.d.slides[2].gifts], ['https://pastorshub.org/#gifts=' + PUB, '', true]);
  x = await stored(gd({ lang: 'es' }));
  c('…in Spanish the link ends ~es', x.d && x.d.slides[2].qrUrl, 'https://pastorshub.org/#gifts=' + PUB + '~es');
  for (const [type, group] of [['board', 'board'], ['team', 'prayer'], ['conference', 'conference'], ['congregation', 'youth'], ['congregation', 'pathfinders']]) {
    x = await stored(gd({ audience: { type, group } }));
    c(`gifts dropped for ${type}/${group}; its gifts join is an ordinary join`, [x.r.status, x.d && 'gifts' in x.d, x.d && x.d.slides[2].qrUrl === 'https://pastorshub.org/#watch=' + x.r.j.room, x.d && 'gifts' in x.d.slides[2]], [200, false, true, false]); }
  for (const bad of ['short', 'QLvn7p0Tqzd5X', 'QLvn7p0Tqz/5', 12, null]) {
    x = await stored(gd({ gifts: { pub: bad } }));
    c(`a pub of ${JSON.stringify(bad)}: 400 bad-deck where gifts.pub`, [x.r.status, x.r.j.error, x.r.j.where], [400, 'bad-deck', 'gifts.pub']); }
  x = await stored(gd({ gifts: 'QLvn7p0Tqzd5' }));
  c('gifts that is not an object: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'gifts']);
  x = await stored(gd({ gifts: undefined }));
  c('a gifts join without deck.gifts: an ordinary join (room link and code)', [x.r.status, x.d && x.d.slides[2].qrUrl === 'https://pastorshub.org/#watch=' + x.r.j.room, x.d && x.d.slides[2].code6 === x.r.j.code, x.d && 'gifts' in x.d.slides[2]], [200, true, true, false]);
  x = await stored(gd({ slides: [{ type: 'join', note: '' }, { type: 'join', gifts: 'yes', note: '' }] }));
  c('a join whose gifts is not true or false: 400 bad-deck', [x.r.status, x.r.j.where], [400, 'slides[1].gifts']);
  x = await stored(gd({ slides: [{ type: 'join', note: '', qrUrl: 'https://evil.example/#gifts=' + PUB }, { type: 'join', gifts: true, qrUrl: 'https://evil.example/', code6: 'ZZZZZZ', note: '' }] }));
  c('a link the page sent is never kept', x.d && x.d.slides.map(s => s.qrUrl.startsWith('https://pastorshub.org/')), [true, true]);
}

console.log('\n-- 7b. every present-1.3 deck is stored exactly as before --');
{ // the key order of every slide type as present-1.3 stored it (the renderer and the phones read these)
  const K13 = { join: ['type', 'note', 'qrUrl', 'code6'], motion: ['type', 'kicker', 'headline', 'rows', 'by'], stat: ['type', 'kicker', 'headline', 'value', 'unit', 'hue', 'freq', 'count', 'dots', 'compare', 'source'],
    trio: ['type', 'kicker', 'headline', 'items', 'source'], place: ['type', 'kicker', 'headline', 'where', 'facts', 'partners', 'bring', 'source'], capacity: ['type', 'kicker', 'headline', 'rows', 'gaps', 'source'],
    ability: ['type', 'kicker', 'headline', 'value', 'label', 'gifts', 'lead', 'source'], ask: ['type', 'kicker', 'headline', 'rows', 'verse'], risks: ['type', 'kicker', 'headline', 'items', 'source'],
    timeline: ['type', 'kicker', 'headline', 'steps', 'quote'], roles: ['type', 'kicker', 'headline', 'roles'], yes: ['type', 'kicker', 'headline', 'options', 'respond'], verse: ['type', 'text', 'ref', 'version'],
    close: ['type', 'headline', 'text', 'quote'] };
  const foot = { text: 'Let us not be weary in well doing…', ref: 'Galatians 6:9 · KJV' };
  const ALL = [
    { type: 'join', note: 'Scan' }, { ...SL.motion }, { ...SL.motion, verse: foot },
    { type: 'stat', kicker: 'k', headline: 'About 1 in 4', value: 27, unit: '%', hue: 'children', freq: 'about 1 in 4', count: 'about 1,490', dots: { n: 100, on: 27, hue: 'children' }, compare: { here: 27.1, county: 18.2, label: 'Bucks County', sig: true, moe: 3.4 }, source: 'ACS', verse: foot },
    { type: 'trio', kicker: 'k', headline: 'h', items: [{ value: 1, label: 'a', hue: 'acc' }, { value: '1 in 3', label: 'b', hue: 'people' }, { value: 0.5, label: 'c', hue: 'language' }], source: 's' },
    { type: 'place', kicker: 'k', headline: 'Here in Warminster', where: 'East of the church', facts: [{ value: 1200, label: 'homes', hue: 'housing' }], partners: [{ name: 'Food Bank', kind: 'food', dist: '0.4 mi' }], bring: ['Prayer'], source: 's', verse: foot },
    { type: 'capacity', kicker: 'k', headline: 'h', rows: [{ label: 'Volunteers', need: 5, have: 7, unit: 'people' }], gaps: ['A driver'], source: 's' },
    { type: 'ability', kicker: 'k', headline: 'h', value: 9, label: 'members', gifts: ['Teaching'], lead: 'one is ready', source: 's' },
    { type: 'ask', kicker: 'k', headline: 'h', rows: [['People', '1 coordinator']], verse: null }, { type: 'risks', kicker: 'k', headline: 'h', items: ['a'], source: 's' }
  ];
  const ALL2 = [{ type: 'join', note: '' },
    { type: 'timeline', kicker: 'k', headline: 'h', steps: [{ date: 'Week 1', title: 'Start', text: 't' }, { date: 'Week 3', title: 'Mid', text: 't' }, { date: 'Week 6', title: 'Review', text: 't' }], quote: null, verse: foot },
    { type: 'roles', kicker: 'k', headline: 'h', roles: [{ title: 'Coordinator', hours: '2 a week', text: 't' }] }, { ...SL.yes }, { ...SL.yes, verse: foot }, { ...SL.verse }, { ...SL.close }, { ...SL.close, quote: { text: 'q', ref: 'r' } }];
  const bad = [];
  for (const slides of [ALL, ALL2]) {
    for (const au of [{ type: 'board', group: 'board' }, { type: 'congregation', group: 'congregation' }, { type: 'conference', group: 'conference' }]) {
      const d0 = deck({ slides, audience: au, created: 1790000000000 });
      const x = await stored(d0);
      if (!x.d) { bad.push(['refused', x.r.j]); continue; }
      const dk = Object.keys(x.d).join();
      if (dk !== 'kind,ver,lang,title,church,audience,ministry,created,slides') bad.push(['deck keys', dk]);
      x.d.slides.forEach((s, i) => { const want = K13[s.type].concat('verse' in d0.slides[i] && s.type !== 'ask' ? ['verse'] : []);
        if (Object.keys(s).join() !== want.join()) bad.push([i, s.type, Object.keys(s).join()]);
        for (const k of Object.keys(d0.slides[i])) if (k !== 'qrUrl' && k !== 'code6' && JSON.stringify(s[k]) !== JSON.stringify(d0.slides[i][k])) bad.push([i, s.type, k]); });
      // op update stores the same
      const u = await post({ op: 'update', room: x.r.j.room, key: x.r.j.key, deck: d0 });
      if (u.status !== 200 || S.raw('d/' + x.r.j.room) !== JSON.stringify({ v: 2, deck: x.d })) bad.push(['update differs', u.j]);
    } }
  c('every slide type, with and without its foot verse, three audiences: the same keys in the same order, the same values, open and update', bad, []);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
