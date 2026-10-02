// v51 (proposed): advise-2.3 keeps the pastor's Sabbath guideline (SABBATH-GUIDELINE.md, 1 Oct 2026) on fresh ideas. Stubbed API.
// v56: and his 2 Oct line: a special offering taken during Sabbath worship for a church project is fine (part of worship);
// sales, fundraising events and selling tickets stay off the Sabbath; never tithe for projects.
import fs from 'node:fs';
process.env.ANTHROPIC_API_KEY='sk-ant-test-key-0000000000000000000000000000000000';
delete process.env.TERRAIN_AI_PASS; delete process.env.ADVISE_MODEL;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,300));fail++}else pass++};
const TI=JSON.parse(fs.readFileSync(new URL('./topic-ideas.json',import.meta.url),'utf8'));
let nextText='';
let lastBody=null;
globalThis.fetch=async(u,o)=>{ try{ lastBody=JSON.parse(o&&o.body||'null'); }catch(e){ lastBody=null; } return {ok:true,status:200,json:async()=>({content:[{type:'text',text:nextText}],usage:{input_tokens:1,output_tokens:1},stop_reason:'end_turn'})}; };
const fn=(await import(new URL('../netlify/functions/advise.mjs',import.meta.url).href)).default;
const summary='GEOGRAPHY: Census Tract 2041.02\nSOURCE: U.S. Census ACS 2020–2024 five-year estimates.\nLOCAL FIGURES:\npoverty | Below the poverty line: 19.4% (table S1701)';
const ask=async(ideas,lang='en')=>{ nextText=JSON.stringify(ideas); const r=await fn(new Request('https://x/a',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({mode:'topic',topic:'prayer',theme:'prayer',themeName:'Prayer',lang,count:6,summary,tags:['poor','settled'],avoid:[]})})); return r.json(); };
const one=(patch,lang='en')=>{ const x=JSON.parse(JSON.stringify(TI[lang][0])); x.sabbath=true; patch(x); return x; };
const sab=async(patch,lang='en')=>{ const j=await ask([one(patch,lang)],lang); return (j.ideas||[]).length?j.ideas[0].sabbath:'rejected:'+(j.reasons||[]).join(';'); };
console.log('-- fits: kept true --');
c('a free drawing for a Bible among the guests (allowed, and still the Sabbath)', await sab(x=>{ x.en.how[3]='Hold a free prize draw for a Bible among the guests, with a door prize too; nobody pays to enter.'; }), true);
c('"buy the cards beforehand" is not buying on the Sabbath', await sab(x=>{ x.en.how[3]='Buy the cards and pens beforehand so nothing is bought on the day.'; }), true);
c('"no sales" is a negation, not a sale', await sab(x=>{ x.en.how[3]='No sales and no fees: the cards are free and the form stays private.'; }), true);
c('ES "vendrán" (they will come) is not selling', await sab(x=>{ x.es.how[3]='Los vecinos vendrán a la mesa cuando vean las tarjetas gratuitas cada semana.'; },'es'), true);
c('a cafe that names a home or the church as the Sabbath place stays true', await sab(x=>{ x.en.how[3]='Meet at the cafe on weekdays; on a Sabbath meet at church instead, where nothing is bought.'; }), true);
console.log('-- does not fit: turned off --');
c('selling cookies', await sab(x=>{ x.en.how[3]='Sell a small bag of cookies at the table to cover the printing.'; }), false);
c('a festival with game booths', await sab(x=>{ x.en.how[3]='Add a festival with game booths and a bounce house on the lawn.'; }), false);
c('a diner where buying breakfast is the point', await sab(x=>{ x.en.how[3]='Meet at the diner on Main Street every week and pray over the cards.'; }), false);
c('ES: vendan galletas', await sab(x=>{ x.es.how[3]='Vendan galletas en la mesa para cubrir la impresión de las tarjetas.'; },'es'), false);
console.log('-- offerings (the pastor, 2 Oct 2026) --');
c('a special offering taken in Sabbath worship stays true (it is part of worship)', await sab(x=>{ x.en.how[3]='Take a special offering during Sabbath worship to cover the printing of the cards.'; }), true);
c('ES: una ofrenda especial en el culto del sábado stays true', await sab(x=>{ x.es.how[3]='Recojan una ofrenda especial en el culto del sábado para cubrir la impresión de las tarjetas.'; },'es'), true);
c('a bake sale for the project is off the Sabbath', await sab(x=>{ x.en.how[3]='Hold a bake sale after church to pay for the printing of the cards.'; }), false);
c('the prompt says a special offering in Sabbath worship is fine, and never tithe for a project', [/a special offering taken during Sabbath worship is part of worship and is fine/.test(lastBody&&lastBody.system||''), /never tithe for a project/.test(lastBody&&lastBody.system||''), /sales or fundraising events for a project/.test(lastBody&&lastBody.system||'')], [true,true,true]);
console.log('-- banned on any day --');
{ const j=await ask([one(x=>{ x.en.how[3]='Sell raffle tickets for a gift basket to pay for the printing.'; }),TI.en[2]]);
  c('selling raffle tickets is rejected (the other idea is kept)', [j.ideas.length,j.rejected], [1,1]); }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
