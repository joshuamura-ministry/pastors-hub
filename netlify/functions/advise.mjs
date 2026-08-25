// Terrain · optional AI ministry planner.
//
// The API key lives ONLY in Netlify's encrypted environment variables:
//   Netlify → Project configuration → Environment variables → ANTHROPIC_API_KEY
// It is never in this repository and never reaches the browser.
//
// GET  → { enabled: true|false }   the page asks this first, and only shows the
//                                  button when a key is actually configured, so
//                                  there is never a dead control on screen.
// POST → { text }                  a ministry plan written from the numbers.

const MODEL = process.env.ADVISE_MODEL || 'claude-sonnet-5';
const MAX_BODY = 24000;

const NO_STORE = 'no-store, max-age=0';
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': NO_STORE }
  });

const SYSTEM = `You are helping a Seventh-day Adventist pastor in Pennsylvania who serves a two-church district. He has just run a census report on the neighbourhood around one of his churches and wants practical ministry planning.

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

export default async (request) => {
  if (request.method === 'GET') {
    return reply({ enabled: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
  }
  if (request.method !== 'POST') return reply({ error: 'Use GET or POST.' }, 405);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return reply({ error: 'No API key is configured on the server, so AI planning is switched off.' }, 503);
  }

  let payload;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply({ error: 'That report is too large to send.' }, 413);
    payload = JSON.parse(raw);
  } catch {
    return reply({ error: 'Could not read the report data.' }, 400);
  }
  if (!payload || typeof payload.summary !== 'string' || payload.summary.length < 40) {
    return reply({ error: 'No report data was included.' }, 400);
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: payload.summary }]
      }),
      signal: AbortSignal.timeout(60000)
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = data && data.error && data.error.message ? data.error.message : 'HTTP ' + res.status;
      return reply({ error: 'The AI service refused the request: ' + detail }, 502);
    }
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();
    if (!text) return reply({ error: 'The AI service returned an empty response.' }, 502);

    const u = data.usage || {};
    return reply({ text, model: MODEL, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0 } });
  } catch (e) {
    return reply({ error: 'Could not reach the AI service: ' + (e && e.message ? e.message : String(e)) }, 502);
  }
};
