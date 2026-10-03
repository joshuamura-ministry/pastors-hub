/* v10.44.1 — THE HOTSPOTS MAP FRAMES THE REACH, NOT THE OUTLINES (2 Oct 2026).
 *
 * The pastor, on his old Bay Area church: "this is the view that shows on the map from a very, very far distance. It's not just
 * the immediate community under hotspots." The frame was sized to every nearby block's full outline, so one huge rural tract
 * (its centre near the church, its edge 30 miles away) pulled the whole Bay Area into a map that says "about 1.8 miles". Now
 * the frame is the reach itself (the radius around the church) plus the numbered blocks' centres; a block that reaches past
 * the edge is simply cut off at the edge, like streets are.
 */
const vm = require('vm');
const { HTML } = require('./connect-blocks.js');
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g)); console.log('    want:', JSON.stringify(e)); fail++; } else pass++; };
// the map's own code, lifted: constants, the projection, pickZoom and basemap
const lift = (from, to) => { const i = HTML.indexOf(from), j = HTML.indexOf(to, i); if (i < 0 || j < 0) throw new Error('anchor ' + from); return HTML.slice(i, j); };
const src = lift('const MAPW=640, MAPH=470, TS=256;', '\nfunction zoneMap(');
const ctx = { Math, TILE: { url: () => 'x' } };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.basemap=basemap; this.pickZoom=pickZoom; this.merc=merc;', ctx);
const { basemap, merc } = ctx;

const church = { lat: 37.3382, lon: -121.8863 };                           // San José
const ring = (lat, lon, mi) => { const dl = mi / 69, dn = dl / Math.cos(lat * Math.PI / 180); return [[lon - dn, lat - dl], [lon + dn, lat - dl], [lon + dn, lat + dl], [lon - dn, lat + dl]]; };
const small = (lat, lon) => ({ geoid: 's' + lat + lon, lat, lon, rings: [ring(lat, lon, 0.4)] });
const near = [small(37.34, -121.89), small(37.33, -121.88), small(37.35, -121.9), small(37.32, -121.87)];
// one rural tract: its centre 1.2 miles from the church, its outline 30 miles across (to Gilroy and the hills)
const giant = { geoid: 'giant', lat: 37.33, lon: -121.86, rings: [[[-121.9, 37.4], [-121.3, 37.4], [-121.3, 36.9], [-121.9, 36.9]]] };
const top = near.slice(0, 4);

const z0 = basemap(church, top, near, 1.8).z;
const z1 = basemap(church, top, near.concat([giant]), 1.8).z;
c('the frame at 1.8 miles is a neighbourhood zoom (14 or closer)', z0 >= 13, true);
c('a huge outline next door does not zoom the map out', z1, z0);
c('a wider reach zooms out, as the blurb promises (10 miles < 4.5 < 1.8)', [basemap(church, top, near, 4.5).z < z0, basemap(church, top, near, 10).z < basemap(church, top, near, 4.5).z], [true, true]);
// a numbered block that is a drive away stays in the frame (hotspots ignore distance)
const far = small(37.45, -121.95);                                         // about 8 miles
const zf = basemap(church, top.concat([far]), near.concat([far]), 1.8);
const q = zf.P(far.lon, far.lat);
c('a numbered block 8 miles out is still inside the frame', q[0] > 0 && q[0] < 640 && q[1] > 0 && q[1] < 470, true);
// the church stays centred
const ch = basemap(church, top, near.concat([giant]), 1.8).P(church.lon, church.lat);
c('the church sits in the middle', [Math.round(ch[0]), Math.round(ch[1])], [320, 235]);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
