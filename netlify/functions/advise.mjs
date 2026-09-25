// Terrain · optional AI ministry planner.                            advise-2.0
//
// The API key lives ONLY in Netlify's encrypted environment variables:
//   Netlify → Project configuration → Environment variables → ANTHROPIC_API_KEY
// It is never in this repository and never reaches the browser.
//
// GET  → { enabled, model, fn, locked }   the page asks this first and only
//                                          shows the button when a key exists
// POST { summary }                         → { text }   a prose plan (unchanged)
// POST { mode:'moves', summary, count, kind, avoid }
//                                          → { ideas:[...] }  fresh ministry
//                                          ideas as structured drafts
//
// WHY 2.0. Version 1.1 had no "moves" handler. The page has been sending
// mode:'moves' since v9.97 and getting a prose plan back, which it could not
// parse, so it silently showed the built-in playbook instead. The AI never
// produced a single idea on the live site. This version answers that request.
//
// MODEL. Defaults to Opus, the strongest available, because the point of this
// feature is ideas the built-in list does not already have. Set ADVISE_MODEL
// in Netlify to override — 'claude-sonnet-5' is faster if Opus ever runs into
// the 60-second function limit.
//
// BATCHES. The page asks for ideas in parallel batches, one per kind of
// ministry (Serve, Equip, Belong, Invite), a few ideas each. That keeps every
// call well inside Netlify's 60-second limit and stops the batches producing
// the same idea twice, because each is told to think in a different direction.

const MODEL = (process.env.ADVISE_MODEL || 'claude-opus-5-5').trim();
const FN_VERSION = 'advise-2.1';
const KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const PASS = (process.env.TERRAIN_AI_PASS || '').trim();
function passOk(given){
  const g = (given || '').trim();
  if (!PASS) return true;
  if (g.length !== PASS.length) return false;
  let diff = 0;
  for (let i = 0; i < PASS.length; i++) diff |= PASS.charCodeAt(i) ^ g.charCodeAt(i);
  return diff === 0;
}
const MAX_BODY = 40000;
// Netlify allows 60s. Leave a margin for the response to be written.
const UPSTREAM_TIMEOUT_MS = 54000;
// Ideas per call. More than this and a call risks the limit on Opus.
const MAX_IDEAS_PER_CALL = 6;

const NO_STORE = 'no-store, max-age=0';
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': NO_STORE }
  });

const SYSTEM = `You are helping a Seventh-day Adventist pastor. He has just run a census report on the neighbourhood around one of his churches and wants practical ministry planning.

You will receive: the geography, the key figures for the neighbourhood with county comparisons, and the prompts an automated rule engine already produced.

Write a plan he could take to a church board on Sabbath afternoon. Requirements:

1. GROUND EVERY CLAIM IN A NUMBER HE GAVE YOU. Quote the figure. If you cannot tie a suggestion to a figure, do not make it.
2. BE CONCRETE AND LOCAL IN SCALE. A district of two congregations with volunteers, not a megachurch with staff. Say who does it, what it costs roughly, what the first step this week is, and how he will know in three months whether it worked.
3. SEQUENCE IT. What to do first, what to do next quarter, what to leave alone for now. A pastor cannot do fifteen things. Name the two or three with the highest ratio of need met to effort spent, and say why those.
4. NAME WHAT WOULD MAKE YOU WRONG. Where might the data mislead? What should he go and verify with a real conversation before spending money?
5. RESPECT THE PEOPLE IN THE DATA. These are neighbours, not targets. Never imply a group is deficient, needy by nature, or a project. Poverty, immigration status, and single parenthood describe circumstances, not character. Do not romanticise hardship either.
6. DO NOT INVENT FACTS. No specific organisation names, addresses, statistics, or programmes unless they were in the input. If you recommend partnering with "the nearest food bank", say that, do not invent its name.
7. Do not assume the congregation's own ethnicity or income matches the neighbourhood's — that gap is often the pastoral issue, and worth naming as a question rather than an assumption.

Format in plain markdown: ## for section headings, - for bullets, **bold** sparingly. No preamble, no sign-off, no offer to help further. Around 600-900 words. Write in British-neutral plain English, warm but unsentimental.`;

// The four things a church does, in the app's own vocabulary. A batch is told
// which one it is thinking about, so four batches cover four different ground.
const KINDS = {
  Serve:  'SERVE — meet a felt, practical need in the neighbourhood, with nothing asked in return. Food, transport, repairs, forms, childcare, the things that make a hard week easier.',
  Equip:  'EQUIP — teach something people actually want to learn: a skill, a language, money, health, parenting, a certificate that leads to a wage.',
  Belong: 'BELONG — create a place people come back to on a schedule and are known by name. Tables, groups, clubs, rhythms, the cure for isolation.',
  Invite: 'INVITE — the open, honest spiritual step, offered once trust is real: a study, a question night, a prayer, a series, a conversation about Jesus.'
};

const MOVES_SYSTEM = `You are inventing ministry ideas for a Seventh-day Adventist pastor of a small church, from a census report on the neighbourhood around it and an honest inventory of what his church can field.

These must be FRESH. He already has a list of nearly a hundred standard ministries — food pantries, VBS, health expos, homework clubs, grief groups — and a list of those will be given to you as "do not repeat". Anything on that list, or a thin variation of it, is worthless to him. He is asking you because he wants what is NOT on the list: the idea that fits THIS street and THIS church and that nobody has suggested to him before.

Rules, in order of importance:

1. FIT THE FIGURES. Every idea must name the specific figure from the report that makes it right for this neighbourhood, quoted. An idea that would fit any neighbourhood is not an idea.
2. FIT THE CHURCH. Use only the volunteers, hours, skills, rooms and money in the inventory. If they have no kitchen, nothing needs a kitchen. If they have three bilingual members, lean on that. A church of forty is not staffing a clinic. Respect zero.
3. MATCH THE COMMITMENT LEVEL you are given. A light lift is one or two people, no budget, could start before next Sabbath. A heavy lift is weekly with someone always present, or a campaign. Do not hand a light-lift request a weekly programme.
4. STAY IN YOUR LANE. You are given one kind of ministry to think about. Every idea in your batch belongs to that kind.
5. BE GENUINELY DIFFERENT FROM EACH OTHER AND FROM THE LIST. No two ideas in a batch should share a mechanism. Not "a coat drive" when "a clothing closet" is on the list. Not "a Saturday breakfast" when "a men's breakfast" is. Think about what THIS church, with THESE rooms and THESE people, could do that the standard list assumes a bigger church for — or never thought of.
6. SAY HOW TO ACTUALLY DO IT. Steps a member who has never organised anything could follow on Monday morning, in order. Who to phone, what to buy, what to say, what to write down. Four to six steps. This is the part he specifically asked for.
7. RESPECT THE PEOPLE IN THE DATA. Neighbours, not targets. Nobody is a project. Poverty, immigration status and single parenthood are circumstances, not character.
8. INVENT NOTHING. No named organisations, addresses, or statistics beyond what you were given. "The nearest school" is fine; a made-up school name is not. Do not attribute quotations to anyone.
9. ADVENTIST CONTEXT is assumed: Sabbath (Saturday) worship, a health emphasis, a literature tradition, Pathfinders, a conference structure. Use it where it helps; do not lecture on it.

Return ONLY a JSON array, nothing else, no markdown fence, no preamble. Each item:
{
  "name":   "short, concrete, distinctive — five words or fewer",
  "why":    "one or two sentences naming the exact figure(s) from the report that make this right HERE",
  "metric": "the key, from before the bar in the LOCAL FIGURES lines, of the ONE figure this idea most rests on, e.g. poverty, renters, limEng, kidsShare, seniorsAlone",
  "room":   "the ONE space it needs: none, outdoor, kitchen, classrooms, gym, field, center, parking, stage, av, nursery, library, vehicle, grounds, home, or any",
  "what":   "two or three sentences describing what actually happens, plainly",
  "first":  ["step one on Monday", "step two", "step three", "step four"],
  "week1":  "the single thing to do this week to find out if it will work",
  "ppl":    <integer, the smallest number of people who could honestly run it>,
  "cost":   <0 nothing beyond what they own, 1 a modest outlay, 2 a budget line>,
  "skills": ["any of: lead, medical, teach, kids, cook, music, lang, trade, vehicle, weekday, admin — only if genuinely required"],
  "watch":  "the one thing most likely to kill it, and the counter to it",
  "unlike": "in one sentence, why this is not already on his list"
}`;

async function callClaude(key, body){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

function apiError(res, data){
  const detail = data && data.error && data.error.message ? data.error.message : 'HTTP ' + res.status;
  if (res.status === 401 || /api-key|authentication/i.test(detail)) {
    return reply({ error: 'Anthropic rejected the API key. Copy it again from console.anthropic.com (it begins sk-ant-), ' +
      'paste it into Netlify as ANTHROPIC_API_KEY with no spaces or line breaks, and redeploy.' }, 401);
  }
  if (res.status === 400 && /model/i.test(detail)) {
    return reply({ error: 'That model name was not accepted: "' + MODEL + '". Check the ADVISE_MODEL variable, or remove it to use the default.' }, 400);
  }
  if (res.status === 429) {
    return reply({ error: 'Rate limited by Anthropic, or the account has no credit. Check billing at console.anthropic.com, then try again.' }, 429);
  }
  return reply({ error: 'The AI service refused the request: ' + detail }, 502);
}

// The model is asked for bare JSON. Occasionally it fences it anyway, or
// prefaces it. Strip the fence and find the outermost array before giving up.
function extractArray(text){
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { const j = JSON.parse(t); if (Array.isArray(j)) return j; if (j && Array.isArray(j.ideas)) return j.ideas; } catch {}
  const a = t.indexOf('['), b = t.lastIndexOf(']');
  if (a >= 0 && b > a) { try { const j = JSON.parse(t.slice(a, b + 1)); if (Array.isArray(j)) return j; } catch {} }
  return null;
}

const SKILL_KEYS = ['lead','medical','teach','kids','cook','music','lang','trade','vehicle','weekday','admin'];
function cleanIdea(x){
  if (!x || typeof x !== 'object') return null;
  const s = v => (typeof v === 'string' ? v.trim() : '');
  const name = s(x.name).slice(0, 80);
  const why = s(x.why).slice(0, 600);
  if (!name || !why) return null;
  const steps = Array.isArray(x.first) ? x.first.map(s).filter(Boolean).slice(0, 6) : [];
  const ppl = Number.isInteger(x.ppl) && x.ppl >= 1 && x.ppl <= 40 ? x.ppl : 2;
  const cost = [0,1,2].includes(x.cost) ? x.cost : 1;
  const skills = Array.isArray(x.skills) ? x.skills.map(s).filter(k => SKILL_KEYS.includes(k)) : [];
  const metric = /^[a-zA-Z0-9]{2,32}$/.test(s(x.metric)) ? s(x.metric) : '';
  const room = /^[a-z]{2,16}$/.test(s(x.room).toLowerCase()) ? s(x.room).toLowerCase() : '';
  return {
    name, why, metric, room,
    what:   s(x.what).slice(0, 800),
    first:  steps,
    week1:  s(x.week1).slice(0, 400),
    ppl, cost, skills,
    watch:  s(x.watch).slice(0, 400),
    unlike: s(x.unlike).slice(0, 300)
  };
}

export default async (request) => {
  if (request.method === 'GET') {
    return reply({
      enabled: !!KEY, model: MODEL, fn: FN_VERSION, locked: !!PASS,
      keyLooksRight: KEY.startsWith('sk-ant-') && KEY.length > 40, keyLength: KEY.length,
      maxIdeasPerCall: MAX_IDEAS_PER_CALL, kinds: Object.keys(KINDS)
    });
  }
  if (request.method !== 'POST') return reply({ error: 'Use GET or POST.' }, 405);
  if (!passOk(request.headers.get('x-terrain-pass'))) {
    return reply({ error: 'This ministry planner is private to the pastor who set it up.', code: 'locked' }, 401);
  }
  if (!KEY) return reply({ error: 'No API key is configured on the server, so AI planning is switched off.' }, 503);

  let payload;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply({ error: 'That report is too large to send.' }, 413);
    payload = JSON.parse(raw);
  } catch { return reply({ error: 'Could not read the report data.' }, 400); }
  if (!payload || typeof payload.summary !== 'string' || payload.summary.length < 40) {
    return reply({ error: 'No report data was included.' }, 400);
  }

  // ---------------------------------------------------------- fresh ideas
  if (payload.mode === 'moves') {
    const count = Math.max(1, Math.min(MAX_IDEAS_PER_CALL, parseInt(payload.count, 10) || 4));
    const kind = KINDS[payload.kind] ? payload.kind : null;
    const avoid = Array.isArray(payload.avoid) ? payload.avoid.filter(x => typeof x === 'string').slice(0, 300) : [];
    const user = [
      payload.summary,
      kind ? 'KIND OF MINISTRY FOR THIS BATCH: ' + KINDS[kind] : '',
      'DO NOT REPEAT ANY OF THESE, OR THIN VARIATIONS OF THEM: ' + (avoid.join('; ') || '(none given)'),
      'Return exactly ' + count + ' ideas.'
    ].filter(Boolean).join('\n\n');
    try {
      const { res, data } = await callClaude(KEY, {
        model: MODEL,
        // roughly 450 tokens per fully-specified idea, with headroom
        max_tokens: Math.min(8000, 700 + count * 550),
        temperature: 1,
        system: MOVES_SYSTEM,
        messages: [{ role: 'user', content: user }]
      });
      if (!res.ok) return apiError(res, data);
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      const arr = extractArray(text);
      if (!arr) return reply({ error: 'The AI service did not return a usable list of ideas.' }, 502);
      const ideas = arr.map(cleanIdea).filter(Boolean).slice(0, count);
      if (!ideas.length) return reply({ error: 'The AI service returned no usable ideas.' }, 502);
      const u = data.usage || {};
      return reply({ ideas, kind, model: MODEL, fn: FN_VERSION, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0 } });
    } catch (e) {
      const msg = e && e.name === 'TimeoutError'
        ? 'The AI service took too long. Try a smaller batch, or set ADVISE_MODEL to claude-sonnet-5 in Netlify for a faster model.'
        : 'Could not reach the AI service: ' + (e && e.message ? e.message : String(e));
      return reply({ error: msg }, 502);
    }
  }

  // ---------------------------------------------------------- the prose plan
  try {
    const { res, data } = await callClaude(KEY, {
      model: MODEL, max_tokens: 2000, system: SYSTEM,
      messages: [{ role: 'user', content: payload.summary }]
    });
    if (!res.ok) return apiError(res, data);
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) return reply({ error: 'The AI service returned an empty response.' }, 502);
    const u = data.usage || {};
    return reply({ text, model: MODEL, fn: FN_VERSION, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0 } });
  } catch (e) {
    return reply({ error: 'Could not reach the AI service: ' + (e && e.message ? e.message : String(e)) }, 502);
  }
};
