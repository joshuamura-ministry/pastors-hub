// Terrain · the needs list and the work for each need, the daily sweep.   needs-sweep-1.2
//
// Runs once a day on Netlify's scheduler (the `config` export below). No URL reaches it in production. In the store
// "terrain-needs" (advise.mjs mode 'needs' and advise-needs.mjs, v10.53.0) it deletes:
//   j/<job>                 a study's job and its result, 7 days after it was made (the page keeps the list with the church);
//   n/<place>/<lang>        a neighborhood's kept list, 60 days after it was made (a new study then makes it again);
//   c/dev|reg|site/<day>/…  the daily counters, 2 days after their UTC day;
//   c/ip|ipsalt/<hour>…     the hourly counters and the hour's salt, 2 days after their hour.
// v10.55.0 (needs-sweep-1.1): the same in the store "terrain-ideas" (advise.mjs mode 'ideas' and advise-ideas.mjs): jobs after 7 days,
//   i/<place>/<lang> kept sets after 60, the counters (and the picks' c/pkd, c/pk1) after 2. The pool p/<need>/<id> (ideas pastors
//   picked, for the library's monthly batch) is NEVER deleted here.
// v10.56.0 (needs-sweep-1.2): the same in the store "terrain-case" (advise.mjs mode 'case' and advise-case.mjs, the proposal's words):
//   jobs after 7 days, w/<input>/<lang> kept words after 60, the counters after 2.
// Nothing is read or logged beyond the keys, a job's `created` time and the counts of what was deleted.

import { getStore } from '@netlify/blobs';

export const config = { schedule: '@daily' };

const STORE_NAME = 'terrain-needs', IDEAS_STORE = 'terrain-ideas', CASE_STORE = 'terrain-case';
const JOB_DAYS = 7, COUNTER_DAYS = 2, CACHE_DAYS = 60;
const RE_CACHE = /^[niw]\/[0-9a-f]{32}\/(?:en|es)$/;
const BUDGET_MS = 20000;   // scheduled functions get 30 s; the rest waits for tomorrow
const RE_JOB = /^j\/[A-Za-z0-9_-]{22}$/;
const RE_DAYC = /^c\/(?:dev|reg|site|pkd|pk1)\/(\d{4}-\d{2}-\d{2})(?:\/[A-Za-z0-9_-]{1,64})?$/;
const RE_HOURC = /^c\/(?:ip|ipsalt)\/(\d{4}-\d{2}-\d{2})T(\d{2})(?:\/[0-9a-f]{16})?$/;

function theStore() {
  if (globalThis.__terrainNeedsStore) return globalThis.__terrainNeedsStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
function ideasStore() {
  if (globalThis.__terrainIdeasStore) return globalThis.__terrainIdeasStore;
  return getStore({ name: IDEAS_STORE, consistency: 'strong' });
}
function caseStore() {
  if (globalThis.__terrainCaseStore) return globalThis.__terrainCaseStore;
  return getStore({ name: CASE_STORE, consistency: 'strong' });
}
async function keysUnder(store, prefix) {
  const l = await store.list({ prefix });
  return ((l && l.blobs) || []).map(b => b.key);
}

export async function sweep(store, now = Date.now(), started = Date.now()) {
  const out = { jobs: 0, counters: 0, lists: 0, kept: 0, left: false };
  const late = () => Date.now() - started > BUDGET_MS;
  for (const k of await keysUnder(store, 'c/')) {
    if (late()) { out.left = true; break; }
    let t = null, m;
    if ((m = RE_DAYC.exec(k))) t = Date.parse(m[1] + 'T00:00:00Z') + 864e5;
    else if ((m = RE_HOURC.exec(k))) t = Date.parse(m[1] + 'T' + m[2] + ':00:00Z') + 3600e3;
    if (t == null || !Number.isFinite(t)) { out.kept++; continue; }   // not ours: never touched
    if (now - t > COUNTER_DAYS * 864e5) { await store.delete(k); out.counters++; } else out.kept++;
  }
  for (const k of await keysUnder(store, 'j/')) {
    if (late()) { out.left = true; break; }
    if (!RE_JOB.test(k)) { out.kept++; continue; }
    let rec = null; try { rec = await store.get(k, { type: 'json' }); } catch { rec = null; }
    const created = rec && typeof rec.created === 'number' ? rec.created : 0;
    if (!created || now - created > JOB_DAYS * 864e5) { await store.delete(k); out.jobs++; } else out.kept++;
  }
  for (const k of [...await keysUnder(store, 'n/'), ...await keysUnder(store, 'i/'), ...await keysUnder(store, 'w/')]) {
    if (late()) { out.left = true; break; }
    if (!RE_CACHE.test(k)) { out.kept++; continue; }
    let rec = null; try { rec = await store.get(k, { type: 'json' }); } catch { rec = null; }
    const at = rec && typeof rec.at === 'number' ? rec.at : 0;
    if (!at || now - at > CACHE_DAYS * 864e5) { await store.delete(k); out.lists++; } else out.kept++;
  }
  return out;
}

export default async () => {
  try {
    const started = Date.now();
    const r = await sweep(theStore(), Date.now(), started);
    const i = await sweep(ideasStore(), Date.now(), started);
    const w = await sweep(caseStore(), Date.now(), started);
    console.log('[needs-sweep] ' + JSON.stringify({ fn: 'needs-sweep-1.2', ...r, ideas: i, case: w }));
  } catch (e) {
    console.log('[needs-sweep] ' + JSON.stringify({ fn: 'needs-sweep-1.2', ok: false }));
  }
  return new Response(null, { status: 204 });
};
