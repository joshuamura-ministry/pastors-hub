// v10.62.1 — the rest of the writing a finished product needs. The pastor (8 Oct 2026): "Yes all the terms of service refund still need
// writing. Let's get it done. Let's do every all the writing that needs to be done and placed on a product a finished product." The Terms
// of Service (/terms), the Refund and Cancellation Policy (/refunds) and About Terrain with its plans (/about: the public page a payment
// provider expects), beside the privacy policy; all four in English and Spanish, one look, one footer; the app links them (the footer, the
// first page, registration, checkout). Their facts are held to the code (the trial's days, the prices' words, where to cancel). Written
// failing-first on the privacy policy's commit (v80/logs/ff-v62-1-legal.log).
const fs=require('fs'), path=require('path');
const {sleep,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const ROOT=path.join(__dirname,'..'), F=f=>{ try{ return fs.readFileSync(path.join(ROOT,f),'utf8'); }catch(e){ return ''; } };
const HTML=F('index.html'), TOML=F('netlify.toml'), ACC=F('netlify/functions/account.mjs');
const PAGES={privacy:F('privacy.html'),terms:F('terms.html'),refunds:F('refunds.html'),about:F('about.html')};
const text=s=>s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ');
const art=(h,l)=>{ const m=new RegExp(`<article lang="${l}"[^>]*>([\\s\\S]*?)</article>`).exec(h); return m?m[1]:''; };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the four pages --');
  c('terms.html, refunds.html and about.html exist beside privacy.html', Object.values(PAGES).map(h=>h.length>2000), [true,true,true,true]);
  c('the build publishes all four, each at its short address (terrain.church/terms, /refunds, /about, /privacy)',
    [/command\s*=\s*"[^"\n]*\bcp privacy\.html terms\.html refunds\.html about\.html site\//.test(TOML),...['privacy','terms','refunds','about'].map(k=>new RegExp(`from = "/${k}"\\s*\\n\\s*to = "/${k}\\.html"\\s*\\n\\s*status = 200`).test(TOML))], [true,true,true,true,true]);
  for(const [k,h] of Object.entries(PAGES)){
    c(`${k}: no outside script, stylesheet, font or picture; English and Spanish with the same sections; the footer of the four pages in each`,
      [/<script[^>]+src=/i.test(h)||/<link[^>]+stylesheet/i.test(h)||/@import|url\(\s*['"]?https?:/i.test(h)||/<img/i.test(h),(art(h,'en').match(/<h2 /g)||[]).length===(art(h,'es').match(/<h2 /g)||[]).length&&(art(h,'en').match(/<h2 /g)||[]).length>=5,
       ['about','privacy','terms','refunds'].every(x=>art(h,'en').includes(`href="/${x}"`)&&art(h,'es').includes(`href="/${x}"`)),(art(h,'en')+art(h,'es')).match(/<a [^>]*aria-current="page"/g).length],
      [false,true,true,2]);
    c(`${k}: Muraworks, a business based in Pennsylvania, never a person; no "AI" (his rule)`, [/Muraworks/.test(h),/Ryen|Joshua/.test(text(h)),/\bAI\b|\bIA\b|artificial/.test(text(h))], [true,false,false]);
  }
  c('the terms, refunds and about pages give support@terrain.church; the privacy policy privacy@terrain.church',
    [['terms','refunds','about'].every(k=>/mailto:support@terrain\.church/.test(PAGES[k])&&!/mailto:(?!support@terrain\.church)/.test(PAGES[k])),/mailto:privacy@terrain\.church/.test(PAGES.privacy)], [true,true]);

  console.log('\n-- what they say is what Terrain does --');
  const trial=+((/export const TRIAL_DAYS = (\d+);/.exec(ACC)||[])[1]||0);
  c('the free trial is 14 days in the code, the terms, the refund policy and about', [trial,/a trial lasts 14 days/.test(PAGES.terms),/A free trial lasts 14 days/.test(PAGES.refunds),/14 days free first/.test(PAGES.about)], [14,true,true,true]);
  c('one free trial for each account (the account\'s trialUsed, not more)', [/a\.rec\.trialUsed/.test(ACC),/one free trial for each account/.test(PAGES.terms)], [true,true]);
  c('the prices as Terrain states them ($150 a year, $15 a month), the yearly plan "Best for a church budget" as in the plan sheet',
    [/\$150 a year or \$15 a month/.test(PAGES.terms),/\$150 <small>a year/.test(PAGES.about)&&/\$15 <small>a month/.test(PAGES.about),/Best for a church budget/.test(PAGES.about)&&/'Best for a church budget'/.test(HTML)], [true,true,true]);
  c('where to cancel: Account › Manage billing, the plan sheet\'s own words', [/'Manage billing','Administrar pagos'/.test(HTML),['terms','refunds','about'].every(k=>/Account › Manage billing/.test(PAGES[k])),/Cuenta › Administrar pagos/.test(PAGES.refunds)], [true,true,true]);
  c('the refund rules (the defaults, his to change): a trial never charged; the first payment and each yearly renewal within 14 days; monthly renewals not; mistakes always',
    [/Cancel a free trial before it ends and you are never charged/.test(PAGES.refunds),/Your first payment, and each yearly renewal, is refunded in full if you ask within 14 days/.test(PAGES.refunds),/A monthly renewal<\/td><td>Not refunded/.test(PAGES.refunds),/A charge made by mistake is always refunded in full/.test(PAGES.refunds)], [true,true,true,true]);
  c('early access is said the same way everywhere (the full version free until paid plans begin; 30 days\' notice)',
    [/every registered pastor has the full version at no charge/.test(PAGES.terms),/every registered pastor has the full version of Terrain at no charge/.test(PAGES.refunds),/every registered pastor has the full version at no charge/.test(PAGES.about),['terms','refunds','about'].every(k=>/at least 30 days before paid plans begin/.test(PAGES[k]))], [true,true,true,true]);
  c('the six tools on About are the main menu\'s six, in its order, in its words', ['Community Survey','Spiritual Gifts','Make the Case','Evangelism Planner','Learn from other conferences','Compare your churches'].map(t=>art(PAGES.about,'en').indexOf(`<h3>${t}</h3>`)).every((v,i,a)=>v>0&&(i===0||v>a[i-1])), true);
  c('the terms keep the rules Terrain already keeps: Spiritual Gifts 13 and older, connection cards adults only; neighbors never targets', [/Spiritual Gifts is for those 13 and older/.test(PAGES.terms),/connection cards are for adults only/.test(PAGES.terms),/Neighbors are neighbors, never targets/.test(PAGES.terms)], [true,true,true]);

  console.log('\n-- the app links them --');
  const P=page({}); await ready(P); await sleep(50);
  c('the footer: Terms · Privacy', [P.txt('#termslink'),P.q('#termslink').getAttribute('href'),P.txt('#privlink')], ['Terms','/terms','Privacy']);
  c('the first page: About Terrain · Privacy · Terms, before anyone registers', [/<a href="\/about" id="gateabout">About Terrain<\/a> · <a href="\/privacy" id="gatepriv">Privacy<\/a> · <a href="\/terms" id="gateterms">Terms<\/a>/.test(HTML)], [true]);
  c('registration: "By registering, you agree to Terrain’s Terms of Service and Privacy Policy" (each a new tab: what was typed stays)', /By registering, you agree to Terrain’s <a href="\/terms" target="_blank" rel="noopener">Terms of Service<\/a> and <a href="\/privacy" target="_blank" rel="noopener">Privacy Policy<\/a>\./.test(HTML), true);
  c('checkout: starting a trial or a plan means agreeing to the Terms; the Refund Policy beside it', /Starting a trial or a plan means you agree to the <a href="\/terms" target="_blank" rel="noopener">Terms of Service<\/a>\. When a payment is refunded: the <a href="\/refunds" target="_blank" rel="noopener">Refund Policy<\/a>\./.test(HTML), true);
  { const S=page({lang:'es'}); await ready(S); await sleep(50); c('in Spanish: Términos · Privacidad', [S.txt('#termslink'),S.txt('#privlink')], ['Términos','Privacidad']); }
}); T.done(); })();
