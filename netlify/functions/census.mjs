// Terrain · server-side proxy for the U.S. Census endpoints.
// Exists because the Census Geocoder does not send CORS headers, so a browser
// cannot call it directly. This runs on Netlify, not in the browser, so CORS
// does not apply. Auto-detected at /.netlify/functions/census — no config file.
//
// Only these two hosts are allowed, so this can never be used as an open proxy.
const ALLOWED = new Set(['geocoding.geo.census.gov', 'api.census.gov']);

export default async (request) => {
  // Errors are NEVER cached. Caching an error response poisons the CDN: every
  // later request for the same URL gets the stale failure back, even after the
  // underlying problem is fixed. Only clean successes get a cache lifetime.
  const NO_STORE = 'no-store, max-age=0';
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', 'cache-control': NO_STORE }
    });

  let target;
  try {
    target = new URL(new URL(request.url).searchParams.get('u'));
  } catch {
    return json({ error: 'Bad or missing "u" parameter.' }, 400);
  }
  if (target.protocol !== 'https:' || !ALLOWED.has(target.hostname)) {
    return json({ error: 'Host not allowed: ' + target.hostname }, 403);
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { accept: 'application/json', 'user-agent': 'terrain-community-map' },
      signal: AbortSignal.timeout(9000)
    });
    const text = await upstream.text();
    // The Census returns HTML (e.g. an "Invalid Key" page) instead of an HTTP
    // error code when something is wrong, so sniff the body rather than trusting
    // the status. Anything that is not clean JSON is treated as a failure.
    const looksJson = text.trimStart().startsWith('[') || text.trimStart().startsWith('{');
    const ok = upstream.ok && looksJson;
    if (!ok) {
      const title = /<title>([^<]{0,120})<\/title>/i.exec(text);
      return json(
        { error: title ? 'Census says: ' + title[1].trim() : 'Census returned an unexpected response.',
          status: upstream.status },
        502
      );
    }
    return new Response(text, {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' }
    });
  } catch (e) {
    return json({ error: 'Upstream failed: ' + (e && e.message ? e.message : String(e)) }, 502);
  }
};
