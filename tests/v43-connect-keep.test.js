/* v10.43 — THE PEOPLE STAY ON HIS DEVICE when the server no longer has their card (the integrator's suite).
 *
 * The pastor (30 Sep 2026): "If people come in on a one-day event there has to be a way to collect information, connect with the
 * community, get their information somehow, so that we can build a relationship with the people." SPEC §3: the Connections list
 * lives on his device ("names, contact, choices, notes"), with the follow-up checklist, the CSV and delete-on-request.
 * Found at integration: the server forgets a card once nothing is left on it (answers go 30 days after his device takes them; an
 * unused card 30 days after its day, CONNECT §2), and a pull that heard "no-card" deleted the card from his device too. Its
 * people stayed in storage but nothing pointed at them any more: the event's list, its checklist and what is due vanished, the
 * After slide's "So far" went to nothing, and the Backup still carried names he could no longer see or delete. Now the card goes
 * where a removed card goes (`past`, no key, never pulled again), as "Remove from the server" already did: the people stay listed
 * and counted until the one-year prune, and he is told the card is no longer on the server ("Make it again").
 */
const H = require('./v43-helpers.js');
const { c, sleep, until, page, ready, FX, T } = H;
const F = H.SEED('followup');
const CH = F['terrain-churches-v1'].churches['sample-sampleton-sda'];
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: CH.address } };

(async () => {
  const P = await ready(page('followup', 'en', { data: DATA }));
  const has = P.E('typeof cnPull==="function"&&typeof cnResults==="function"');
  c('the page has the connection cards (v10.43)', has, true);
  const cid = CH.connect.cards['health-expo'].id;
  // the server has forgotten the card: every op on it answers 404 no-card
  const sent = [];
  P.w.fetch = async (u, o) => { u = String(u); const body = o && o.body ? JSON.parse(String(o.body)) : {}; sent.push(body.op || u);
    if (/connect/.test(u)) return { ok: false, status: 404, json: async () => ({ ok: false, error: 'no-card' }) };
    return { ok: true, status: 200, json: async () => ({ enabled: false }) }; };
  const before = P.J(`(r=>[r.connected,r.nextTaken])(cnResults('health-expo'))`);
  c('before: 23 connected, 9 took the next step (the made-up list)', before, [23, 9]);
  const err = await P.E(`(async()=>{ try{ await cnPull('health-expo'); return 'no error'; }catch(e){ return e.code; } })()`);
  c('the pull hears "no-card" and says so (the sheet shows "This card is no longer on the server… Make it again.")', [err, sent.includes('pull'), P.E(`cnErrText({code:'no-card'})`)],
    ['no-card', true, 'This card is no longer on the server (removed, or unused for 30 days). Make it again.']);
  c('the card is forgotten as a current card (a new one can be made), and kept as a past one with no key (never pulled again)',
    [P.J(`!!cnStore().cards['health-expo']`), P.J(`(p=>p?[p.ideaId,p.key,!!p.card,!!p.retired]:null)(cnStore().past.find(p=>p.id===${JSON.stringify(cid)}))`)],
    [false, ['health-expo', null, true, true]]);
  c('its 23 people stay on his device, listed and counted: 23 connected · 9 took the next step; what is due still due',
    [P.J(`cnPeopleOf('health-expo').length`), P.J(`(r=>[r.connected,r.nextTaken])(cnResults('health-expo'))`), P.J(`cnDueFor('health-expo').total`)], [23, [23, 9], 2]);
  sent.length = 0;
  const again = await P.E(`(async()=>{ try{ return await cnPull('health-expo'); }catch(e){ return e.code; } })()`);
  c('a second pull asks the server nothing about it', [again, sent.filter(x => x === 'pull').length], [0, 0]);
  P.E(`cnOpenList(cnItemOf('health-expo')); 1`); await sleep(150);
  const t = P.txt('#cn-sheet') || '';
  c('the Connections list still opens on them, with the counts and what is due (EN), with no current card',
    [/23 connected/.test(t), t.includes('Anita (sample)'), /Due today: 1 thank-you · 1 visit/.test(t), P.J(`!!document.querySelector('#cn-sheet [data-cn-tab="people"]:not([disabled])')`)], [true, true, true, true]);
  c('…the CSV and Delete are there (delete on request still works); "Add a paper card" is not (there is no card to add it to)',
    [!!P.q('#cn-sheet [data-cn-csv]:not([disabled])'), P.qa('#cn-sheet [data-cn-del]').length > 0, !!P.q('#cn-sheet [data-cn-paper]')], [true, true, false]);
  { const del = P.q('#cn-sheet [data-cn-del]'); const id = del.closest('[data-cn-id]').dataset.cnId; del.click(); P.q('#cn-sheet [data-cn-del]').click(); await sleep(200);
    c('…Delete on request takes one person off his device (22 left)', [P.J(`cnPeopleOf('health-expo').length`), P.J(`cnPeopleOf('health-expo').some(p=>p.id===${JSON.stringify(id)})`)], [22, false]); }
  P.E(`(()=>{ const d=document.getElementById('cn-sheet'); if(d) d.remove(); CN_SHEET=null; return 1; })()`);   // (jsdom's dialog has no close())
  { const r = P.J(`(r=>[r.connected,r.nextTaken])(cnResults('health-expo'))`);
    c('the After slide keeps its "So far" row (the counts of the people still on his device)', P.J(`(()=>{ const m=caseModel('health-expo',{type:'board',group:'board'},{timing:'options'}); const s=caseDeck(m).slides.find(s=>s.part==='after'); return s.rows[s.rows.length-1]; })()`),
      ['So far', `${r[0]} connected · ${r[1]} took the next step`]); }
  c('a past card that the server no longer has is dropped from the pulls quietly, its people kept (as before)', P.J(`(()=>{ const C=cnStore(); return C.past.filter(p=>p.key).length; })()`), 0);
  // v10.43 (integration, seen in the samples' phone screens): after a tap, the chosen tile showed a second, heavier ring (the focus
  // ring of the checkbox inside it, :focus-within); the ring is now for the keyboard only (:has(input:focus-visible)), where :has works
  c('the phone form: a tapped tile has no keyboard ring (the ring rule is :has(input:focus-visible))', [/@supports selector\(:has\(\*\)\)\{\.cn-pick:focus-within\{outline:none\}\.cn-pick:has\(input:focus-visible\)\{outline:3px solid var\(--cn-k\)/.test(H.html)], [true]);
  c('no page errors', P.errs.filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
  console.log(`\n${T.pass} passed, ${T.fail} failed`);
  process.exit(T.fail ? 1 : 0);
})();
