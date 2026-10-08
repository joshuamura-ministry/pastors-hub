// v10.62.1 — the privacy policy. The pastor (8 Oct 2026): "We need the definitely privacy policy. Please write that now." (Meta's App
// Review asks for a public privacy policy address, and paid plans need one.) A page anyone can open without registering
// (terrain.church/privacy → privacy.html), in English and Spanish, linked from the app's footer, the first page and a neighbor's
// connection card, asking no other website, and saying what the code does (each fact below is held to the code it describes).
// The contact, his choice: privacy@terrain.church. Written failing-first on v10.62.0 (v79/logs/ff-v62-1-privacy.log).
const fs=require('fs'), path=require('path');
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const ROOT=path.join(__dirname,'..'), F=f=>{ try{ return fs.readFileSync(path.join(ROOT,f),'utf8'); }catch(e){ return ''; } };
const PV=F('privacy.html'), HTML=F('index.html'), TOML=F('netlify.toml');
const text=s=>s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ');
const art=l=>{ const m=new RegExp(`<article lang="${l}"[^>]*>([\\s\\S]*?)</article>`).exec(PV); return m?m[1]:''; };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the page --');
  c('privacy.html exists, a page of its own (no registration), its own title', [!!PV,/<title>Privacy Policy · Terrain<\/title>/.test(PV)], [true,true]);
  c('the site\'s build publishes it, and terrain.church/privacy opens it', [/command\s*=\s*"[^"\n]*\bcp privacy\.html site\//.test(TOML),/\[\[redirects\]\]\s*\n\s*from = "\/privacy"\s*\n\s*to = "\/privacy\.html"\s*\n\s*status = 200/.test(TOML)], [true,true]);
  c('it asks no other website: no outside script, stylesheet, font or picture', [/<script[^>]+src=/i.test(PV),/<link[^>]+stylesheet/i.test(PV),/@import|url\(\s*['"]?https?:/i.test(PV),/<img/i.test(PV)], [false,false,false,false]);
  c('English and Spanish, each with the same fourteen sections and the short version', [(art('en').match(/<h2 id=/g)||[]).length,(art('es').match(/<h2 id=/g)||[]).length,/class="short"/.test(art('en'))&&/class="short"/.test(art('es'))], [14,14,true]);
  c('Muraworks, a business based in Pennsylvania (never a person)', [/<b>Muraworks<\/b>, a business based in Pennsylvania/.test(PV),/<b>Muraworks<\/b>, una empresa con sede en Pensilvania/.test(PV),/Ryen|Joshua/.test(text(PV))], [true,true,false]);
  c('the contact everywhere is privacy@terrain.church, a mailto link', [(PV.match(/href="mailto:privacy@terrain\.church"/g)||[]).length>=6,(PV.match(/mailto:/g)||[]).length===(PV.match(/mailto:privacy@terrain\.church/g)||[]).length], [true,true]);
  c('a deletion section anyone can be sent to (#delete, #borrar), and the effective date', [/<h2 id="delete">/.test(PV),/<h2 id="borrar">/.test(PV),/Effective 8 October 2026/.test(PV),/Vigente desde el 8 de octubre de 2026/.test(PV)], [true,true,true,true]);
  c('no "AI" or "IA" anywhere a person reads it (his rule)', /\bAI\b|\bIA\b|artificial/.test(text(PV)), false);

  console.log('\n-- what it says is what the code does --');
  const G=F('netlify/functions/gifts.mjs'), CN=F('netlify/functions/connect.mjs'), CNS=F('netlify/functions/connect-sweep.mjs'), GS=F('netlify/functions/gifts-sweep.mjs');
  c('Spiritual Gifts: two years for adults, one year under 18; a link nobody used, 30 days', [/RETENTION\. Adults two years, under-18s one year/.test(G),/const UNUSED_DAYS = 30;/.test(GS),/Two years for adults, one year for those under 18/.test(PV)], [true,true,true]);
  c('connection cards: 30 days after the pastor\'s device collects them; unused cards 30 days; adults only', [/const TAKEN_KEEP_DAYS = 30;/.test(CN),/const UNUSED_DAYS = 30;/.test(CNS),/Only adults may send a card/.test(PV)], [true,true,true]);
  c('the writing jobs 7 days, their answers 60', [/const JOB_KEEP_MS = 7 \* 864e5/.test(F('netlify/functions/advise.mjs')),/const JOB_DAYS = 7, COUNTER_DAYS = 2, CACHE_DAYS = 60;/.test(F('netlify/functions/needs-sweep.mjs')),/Requests 7 days; answers 60 days/.test(PV)], [true,true,true]);
  c('Digital footprint forgotten 180 days after last opened; payment events 30 days', [/if \(o\.at < day\(180\)\)/.test(F('netlify/functions/digital-sweep.mjs')),/const EVENT_DAYS = 30/.test(F('netlify/functions/account-sweep.mjs')),/opened it for 180 days/.test(PV),/payment events 30 days/.test(PV)], [true,true,true,true]);
  c('the buttons it names are the app\'s own words, in both languages', [/Delete my result/.test(HTML)&&/Delete my result/.test(PV),/Eliminar mi resultado/.test(HTML)&&/Eliminar mi resultado/.test(PV),/Remove what I sent/.test(HTML)&&/Remove what I sent/.test(PV),/Borrar lo que envié/.test(HTML)&&/Borrar lo que envié/.test(PV),/'Clear all','Borrar todo'/.test(HTML),/es:'Cuenten conmigo'/.test(HTML)&&/Cuenten conmigo/.test(PV)], [true,true,true,true,true,true]);
  c('Facebook and Instagram are not read today (Digital footprint shows a link only)', [/Terrain does not read Facebook or Instagram today/.test(PV),/Hoy Terrain no lee Facebook ni Instagram/.test(PV)], [true,true]);

  console.log('\n-- the app links it --');
  const P=page({}); await ready(P); await sleep(50);
  c('the footer: "Privacy", same site', [P.txt('#privlink'),P.q('#privlink').getAttribute('href')], ['Privacy','/privacy']);
  c('the first page: "How Terrain handles your information", for anyone before registering', [/<a href="\/privacy" id="gatepriv">How Terrain handles your information<\/a>/.test(HTML),/gp\.textContent=L\('How Terrain handles your information','Cómo maneja Terrain su información'\)/.test(HTML)], [true,true]);
  c('a neighbor\'s card: the promise line links the policy in the card\'s language, same site, a new tab', [P.E(`cnPromiseHTML(cnWords({kind:'general',church:'Sampleton SDA',title:{en:'x'}},'es'))`).includes('<a class="cn-plink" href="/privacy?lang=es" target="_blank" rel="noopener">Política de privacidad</a>'),P.E(`cnPromiseHTML(cnWords({kind:'general',church:'Sampleton SDA',title:{en:'x'}},'en'))`).includes('href="/privacy?lang=en"')], [true,true]);
  { const S=page({lang:'es'}); await ready(S); await sleep(50); c('in Spanish the footer says "Privacidad"', S.txt('#privlink'), 'Privacidad'); }
  c('the six stamps say v10.62.1', (HTML.match(/v10\.62\.1/g)||[]).length>=6, true);
}); T.done(); })();
