// Terrain · server-side proxy for the U.S. Census endpoints.
// Exists because the Census Geocoder does not send CORS headers, so a browser
// cannot call it directly. This runs on Netlify, not in the browser, so CORS
// does not apply. Auto-detected at /.netlify/functions/census — no config file.
import { createHmac, timingSafeEqual } from 'node:crypto';

// Only these hosts are allowed, so this can never be used as an open proxy.
const ALLOWED = new Set([
  'geocoding.geo.census.gov', 'api.census.gov', 'tigerweb.geo.census.gov',
  // OpenStreetMap's query service, for congregations near the church
  'overpass-api.de', 'overpass.kumi.systems'
]);

// Access codes. Set TERRAIN_CODES in Netlify as a comma-separated list. Each entry
// is either CODE or CODE:Name, e.g.  PA-JMURA:Joshua Mura, PA-WEST:Bill Carter
// Leave the variable unset and the tool stays open to everyone.
// Enforced here, on the server: the page itself is public HTML, so a check in the
// browser would stop nobody. Without a valid code no Census data is returned at all.
// Format:  CODE:Name@Conference   (the @Conference part is optional)
//   PA-2026-K7M2:Pennsylvania Conference@Pennsylvania   -> tied to one conference
//   NAD-2026-R8QM:National@*                            -> works for any conference
//   OH-2026-M5RK:Ohio Conference                        -> no @ means any, same as *
//
// SWITCHED OFF BY DEFAULT (v10.38.0). Pastors now register with their name and
// email on the first page instead (register.mjs), so codes are enforced ONLY
// while TERRAIN_REQUIRE_CODE is on: 1, true, yes or on, in any case. Any other
// value leaves codes off, and a value that is not one of those nor 0, false, no
// or off is reported once in the function log. TERRAIN_CODES can stay set:
// nothing reads it until the switch is turned back on, and then every rule
// below applies exactly as before. With the switch off the check answers
// {required:false, ok:true, register:true} and the page asks for registration.
// Parsed per request, memoised on the raw value, so a changed variable is seen.
const warned = new Set();
function envOn(name) {
  const v = (process.env[name] || '').trim();
  if (/^(1|true|yes|on)$/i.test(v)) return true;
  if (v && !/^(0|false|no|off)$/i.test(v) && !warned.has(name)) {
    warned.add(name);
    console.error(`census: ${name} is set, but not to 1, true, yes or on, so it is treated as off`);
  }
  return false;
}
const requireCode = () => envOn('TERRAIN_REQUIRE_CODE');

// REGISTRATION (v10.38.0). While TERRAIN_REG_SECRET is set (32 characters or
// more) and codes are off, Census data needs the token register.mjs hands out
// when a pastor registers, in an x-terrain-reg header (401 noreg without a
// current one), and the check says {regRequired:true, regOk} so the page
// sends every Census call through here. The same check is in gifts.mjs.
// Without the secret nothing here asks about registration.
const TOKEN_DAYS = 180;
const RE_REGTOK = /^r1\.([A-Za-z0-9_-]{12})\.([0-9a-z]{1,9})\.([A-Za-z0-9_-]{32})$/;
function regSecret() {
  const v = (process.env.TERRAIN_REG_SECRET || '').trim();
  if (v && v.length < 32 && !warned.has('secret')) {
    warned.add('secret');
    console.error('census: TERRAIN_REG_SECRET is shorter than 32 characters, so it is ignored');
  }
  return v.length >= 32 ? v : '';
}
function regTokenOk(tok, secret, now = Date.now()) {
  const m = RE_REGTOK.exec(String(tok || '').trim());
  if (!m || !secret) return false;
  const iat = parseInt(m[2], 36) * 1000;
  if (!Number.isFinite(iat) || iat > now + 5 * 60 * 1000 || now - iat > TOKEN_DAYS * 864e5) return false;
  const want = createHmac('sha256', secret).update(`terrain-reg|r1|${m[1]}|${m[2]}`, 'utf8').digest('base64url').slice(0, 32);
  return timingSafeEqual(Buffer.from(want), Buffer.from(m[3]));
}
const regRequired = () => !requireCode() && !!regSecret();
let codesRaw = null, codesMap = new Map();
function codes() {
  const raw = process.env.TERRAIN_CODES || '';
  if (raw === codesRaw) return codesMap;
  const m = new Map();
  raw.split(',').forEach(pair => {
    const r = pair.trim(); if (!r) return;
    const at = r.lastIndexOf('@');
    const scope = at === -1 ? '*' : r.slice(at + 1).trim();
    const head = at === -1 ? r : r.slice(0, at);
    const i = head.indexOf(':');
    const code = (i === -1 ? head : head.slice(0, i)).trim();
    const who = (i === -1 ? '' : head.slice(i + 1)).trim();
    if (code) m.set(code.toLowerCase(), { name: who || 'Verified', conf: scope || '*' });
  });
  codesRaw = raw; codesMap = m;
  return m;
}
const lookup = given => {
  const g = (given || '').trim().toLowerCase();
  const CODES = codes();
  return g && CODES.has(g) ? CODES.get(g) : null;
};
const codeName = given => { const e = lookup(given); return e ? e.name : null; };

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

  // Access check. Runs before anything else, so no code means no data.
  const url0 = new URL(request.url);
  const given = request.headers.get('x-terrain-code') || url0.searchParams.get('code') || '';
  const who = codeName(given);
  if (url0.searchParams.get('check')) {
    // Codes switched off: nothing to check, the page registers the pastor.
    // With registration enforced, say so, and whether the token sent is good.
    if (!requireCode()) {
      if (!regRequired()) return json({ required: false, ok: true, register: true });
      return json({ required: false, ok: true, register: true, regRequired: true,
        regOk: regTokenOk(request.headers.get('x-terrain-reg'), regSecret()) });
    }
    const CODES = codes();
    const entry = lookup(given);
    return json({
      required: CODES.size > 0,
      ok: CODES.size === 0 || !!entry,
      name: entry ? entry.name : '',
      // Which conference this code belongs to. '*' means it works anywhere.
      conf: entry ? entry.conf : '',
      picked: url0.searchParams.get('conf') || ''
    });
  }
  if (requireCode() && codes().size > 0 && !who) {
    return json({ error: 'This tool is limited to invited pastors. Enter your access code to continue.', code: 'nocode' }, 401);
  }
  if (regRequired() && !regTokenOk(request.headers.get('x-terrain-reg'), regSecret())) {
    return json({ error: 'Register on the first page to use Terrain.', code: 'noreg' }, 401);
  }
  // Behind a gate, a success is cached by the browser only: a shared cache
  // would hand it to the next caller for the same address, token or not.
  const gated = (requireCode() && codes().size > 0) || regRequired();

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
      // A Netlify function is terminated around ten seconds, so give up first and
      // return a readable error rather than being killed mid-flight.
      signal: AbortSignal.timeout(8500)
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
      headers: { 'content-type': 'application/json', 'cache-control': gated ? 'private, max-age=86400' : 'public, max-age=86400' }
    });
  } catch (e) {
    return json({ error: 'Upstream failed: ' + (e && e.message ? e.message : String(e)) }, 502);
  }
};
