// Terrain · server-side proxy for the U.S. Census endpoints.
// Exists because the Census Geocoder does not send CORS headers, so a browser
// cannot call it directly. This runs on Netlify, not in the browser, so CORS
// does not apply. Auto-detected at /.netlify/functions/census — no config file.
//
// Only these two hosts are allowed, so this can never be used as an open proxy.
const ALLOWED = new Set(['geocoding.geo.census.gov', 'api.census.gov']);

export default async (request) => {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' }
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
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' }
    });
  } catch (e) {
    return json({ error: 'Upstream failed: ' + (e && e.message ? e.message : String(e)) }, 502);
  }
};
