// advise.mjs 2.2, mode 'topic' ("More ideas for {town}" beside the Idea Library, v10.40.0), with a
// stubbed Anthropic API: no real calls, no cost. The pastor: "creative, creative, creative… if I
// say Prayer there should be 50 different things", "with the kids we have to be careful not to be
// asking for praying for kids", "sitting at the porch of your church where nobody walks by is not
// a great idea… make sure we use social media". Six ideas in the library's shape and ONE
// language, every one checked by the library's rules: repaired where the fix is mechanical,
// rejected where it is not. The passphrase lock, the model, the 60-second budget, and no key in
// any log.
import fs from 'node:fs';
const KEYV='sk-ant-test-key-0000000000000000000000000000000000';
process.env.ANTHROPIC_API_KEY=KEYV;
delete process.env.TERRAIN_AI_PASS; delete process.env.ADVISE_MODEL;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,200));fail++}else pass++};
const TI=JSON.parse(fs.readFileSync(new URL('./topic-ideas.json',import.meta.url),'utf8'));
let lastBody=null, lastOpts=null, nextText='', nextStatus=200, nextStop='end_turn', calls=0;
globalThis.fetch=async(url,opts)=>{ calls++; lastOpts=opts; lastBody=JSON.parse(opts.body);
  return {ok:nextStatus===200,status:nextStatus,json:async()=>nextStatus===200
    ?{content:[{type:'thinking',thinking:''},{type:'text',text:nextText}],usage:{input_tokens:10,output_tokens:20},stop_reason:nextStop}
    :{error:{message:'boom'}}}; };
// the key must never reach a log
const logged=[]; for(const k of ['log','info','warn','error','debug']){ const o=console[k].bind(console); console[k]=(...a)=>{ logged.push(a.map(String).join(' ')); if(k==='log') o(...a); }; }
const fn=(await import(new URL('../netlify/functions/advise.mjs',import.meta.url).href)).default;
const summary='GEOGRAPHY: Census Tract 2041.02\nSOURCE: U.S. Census ACS 2020–2024 five-year estimates.\nLOCAL FIGURES:\npoverty | Below the poverty line: 19.4% (table S1701)';
const post=(body,headers={})=>fn(new Request('https://x/.netlify/functions/advise',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}));
const ask=async(ideas,o={})=>{ nextText=typeof ideas==='string'?ideas:JSON.stringify(ideas);
  const r=await post({mode:'topic',topic:'prayer',theme:'prayer',themeName:'Prayer & intercession',lang:'en',count:6,summary,tags:['poor','settled','bogus'],avoid:['Prayer cards on every door within a mile'],...o});
  return {status:r.status,j:await r.json()}; };
const clone=x=>JSON.parse(JSON.stringify(x));
const one=(patch,lang='en')=>{ const x=clone(TI[lang][0]); patch(x); return x; };

console.log('-- GET and the version --');
const g=await (await fn(new Request('https://x/a',{method:'GET'}))).json();
// v56 (stale): advise-2.4 adds Find prices (tests/advise-prices.test.mjs); the topic mode is unchanged
// v10.53.0 (stale): advise-2.5 adds the needs list (tests/needs-function.test.mjs); the topic mode is unchanged
// v10.55.0 (stale, not a regression): the work for each need (ideas / ideas-status / ideas-pick) makes it advise-2.6
// v10.56.0 (stale, not a regression): Claude in Make the Case makes it advise-2.7
c('reports advise-2.7 (Claude in Make the Case; 2.6 the work for each need; 2.5 the needs list; 2.4 Find prices; 2.3 the Sabbath guideline)', g.fn, 'advise-2.7');
c('says the topic mode exists', g.topic, true);
c('model and per-call limit unchanged (Opus by default, six a call)', [g.model,g.maxIdeasPerCall], ['claude-opus-5-5',6]);

console.log('\n-- six good ideas, English and Spanish --');
for(const lang of ['en','es']){
  const {status,j}=await ask(TI[lang],{lang});
  c(`${lang}: 200 with six ideas`, [status,j.ideas&&j.ideas.length,j.rejected], [200,6,0]);
  c(`${lang}: each in the library's shape, in ${lang} only`, j.ideas.every(x=>x[lang]&&!x[lang==='en'?'es':'en']&&typeof x[lang].n==='string'&&x[lang].how.length===4
    &&Object.keys(x).every(k=>['theme','tier','k','ages','where','sabbath','minors','need','boost','ppl','leaders','hrs','cost','costMo','skill','partner','dig','st','fac',lang].includes(k))), true);
  c(`${lang}: the theme asked for is the ideas' theme`, [...new Set(j.ideas.map(x=>x.theme))], ['prayer']);
  c(`${lang}: sizes, kinds and places kept`, j.ideas.map(x=>x.tier+x.k[0]+x.where[0]).join(' '), '1sc 2io 1ss 2bw 1io 3sc');
  c(`${lang}: a digital part is flagged (the online filter)`, j.ideas.filter(x=>x.dig===1).length>=4, true);
  c(`${lang}: the request says the language`, new RegExp(lang==='es'?'Spanish|SPANISH':'ENGLISH').test(lastBody.system+lastBody.messages[0].content), true);
}
c('the request names the topic and the theme', /TOPIC: prayer \(library theme: Prayer & intercession\)/.test(lastBody.messages[0].content), true);
c('…the census tags that fire here (unknown ones dropped)', /CENSUS TAGS THAT FIRE HERE: poor, settled\n/.test(lastBody.messages[0].content), true);
c('…and what not to repeat', /DO NOT REPEAT ANY OF THESE.*Prayer cards on every door within a mile/.test(lastBody.messages[0].content), true);
c('the prompt carries the pastor\'s words', ['50 different things for prayer','nobody walks by','praying for kids'].every(w=>lastBody.system.includes(w)), true);
c('…the children rules, the outsider test, go where people are, social media', ['CHILDREN','OUTSIDER TEST','GO WHERE PEOPLE ARE','SOCIAL MEDIA','$5 a day','screened adults'].every(w=>lastBody.system.includes(w)), true);
c('…Adventist food and Sabbath, and no invented organisations', ['Vegetarian food only','never sell raffle tickets','"sabbath": true when it worships','Invent no named organisations'].every(w=>lastBody.system.includes(w)), true);
c('same model, no sampling parameters (current models refuse them)', [lastBody.model,'temperature' in lastBody,'top_p' in lastBody], ['claude-opus-5-5',false,false]);
c('a low effort and room for thinking, inside the 60 s limit', [lastBody.output_config&&lastBody.output_config.effort,lastBody.max_tokens], ['low',2500+6*900]);
c('the upstream call has a timeout signal', !!(lastOpts&&lastOpts.signal), true);

console.log('\n-- repaired, not rejected --');
{
  const x=one(x=>{ x.en.n='Prayer cards at the laundromat folding table.'; x.en.d='  '+x.en.d.replace('A local church','A  local church'); x.en.how.push('Tell the owner thank you at the end of the month with a card.');
    x.skill=['admin','telepathy']; x.leaders=3; x.ppl=2; x.tier=3; x.need=['service-work','nonsense','renters']; });
  const {j}=await ask([x]);
  const y=j.ideas[0];
  c('a final full stop is taken off the name', y.en.n, 'Prayer cards at the laundromat folding table');
  c('double spaces and edges are cleaned', /  |^ /.test(y.en.d), false);
  c('a fifth step is dropped (the first four, in order)', [y.en.how.length,y.en.how[0].startsWith('Ask the laundromat')], [4,true]);
  c('unknown skills and tags are dropped', [y.skill,y.need], [['admin'],['service-work','renters']]);
  c('leaders never above the team, and the size follows the numbers', [y.leaders,y.tier], [2,2]);
}
{
  const x=one(x=>{ x.ages='children'; x.minors=false; x.skill=[]; x.en.how[1]='Every adult is screened with a background check, and two adults are always present.'; });
  const {j}=await ask([x]);
  c('children in the ages: minors on, and the kids skill added', [j.ideas[0].minors,j.ideas[0].skill], [true,['kids']]);
}
{
  const x=one(x=>{ x.sabbath=true; x.en.how[3]='Sell a small bag of cookies at the table to cover the printing.'; });
  const {j}=await ask([x]);
  c('selling on the Sabbath: sabbath off', j.ideas[0].sabbath, false);
}

console.log('\n-- rejected: the library\'s rules --');
const REJ=[
  ['children\'s names asked for', x=>{ x.en.how[2]='Ask parents to write the names of their children on the card so we can pray.'; }],
  ['prayer requests about their kids', x=>{ x.en.how[2]='Invite neighbors to text us prayer requests for their kids and grandkids.'; }],
  ['praying for their children (the pastor: it sounds weird)', x=>{ x.en.how[2]='Offer to pray for their children by name every week at the table.'; }],
  ['at the school gate', x=>{ x.en.how[1]='Hand out cards at the school gate at pick-up time each Friday.'; }],
  ['"reach kids"', x=>{ x.en.d=x.en.d.replace('Two members restock','A great way to reach kids. Two members restock').replace(/\. Two/,' Two'); }],
  ['pork on the menu', x=>{ x.en.how[3]='Bring pulled pork sandwiches for the owner and staff on the last Tuesday.'; }],
  // the pastor (1 Oct 2026): a free drawing is fine; a raffle that sells chances or raises money is not
  ['a raffle that sells tickets', x=>{ x.en.how[3]='Sell raffle tickets for a gift basket to pay for the printing.'; }],
  ['"target"', x=>{ x.en.how[3]='Target the laundromat regulars with a second card after a month.'; }],
  ['counselling with no professional', x=>{ x.en.how[3]='Offer grief counseling at the folding table on Tuesday evenings.'; }],
  ['minors with no screening in the steps', x=>{ x.ages='youth'; }],
  ['waiting at the church (size 1, no way to find it)', x=>{ x.where='church'; x.en={n:'An open sanctuary hour for quiet prayer',d:'The sanctuary is open on Wednesday afternoons for quiet prayer. A member sits at the back and prays with anyone who asks for it.',how:['Choose a weekday afternoon and keep the same hour every week.','Put a member at the back with a Bible and a box of tissues.','Keep the lights low and the room quiet, with chairs spread apart.','Note how many come and pray for each one by first name.']}; x.need=['settled']; }],
  ['knocking uninvited', x=>{ x.en.how[2]='Knock on each door on the street and offer to pray at the doorstep.'; }],
  ['prayer requests with no private option', x=>{ x.en.d='A small stand of prayer cards sits on the laundromat folding table, with the owner\'s permission. People write prayer requests on the cards and pin them to a board for all to see.'; x.en.how[1]='Print 250 cards with the church text line and put up a pin board for the requests.'; }],
  ['one sentence', x=>{ x.en.d='With the owner\'s permission a small stand of prayer cards sits on the laundromat folding table so that anyone waiting on a load can text the church and ask for prayer.'; }],
  ['four sentences', x=>{ x.en.d='Cards sit on the table. People take them. Members pray. Texts are answered within a day and nothing is ever shared.'; }],
  ['too long', x=>{ x.en.d=x.en.d+' '+x.en.d; }],
  ['a name in capitals of 70 characters', x=>{ x.en.n='Prayer cards at the laundromat folding table and at every other table too'; }],
  ['three steps', x=>{ x.en.how=x.en.how.slice(0,3); }],
  ['an emoji', x=>{ x.en.n='Prayer cards at the laundromat \u{1F64F}'; }],
  ['no census tag it could rest on', x=>{ x.need=['nonsense']; }],
  ['numbers that fit no size', x=>{ x.ppl=1; x.leaders=0; x.hrs=70; }],
  ['a repeat of the library', x=>{ x.en.n='Prayer cards on every door within a mile'; }],
  ['the wrong language only', x=>{ x.es=x.en; delete x.en; }],
];
for(const [label,patch] of REJ){
  const {status,j}=await ask([one(patch),TI.en[2]]);
  c(`rejected: ${label}`, [status,j.ideas.length,j.rejected,j.ideas[0][ 'en'].n], [200,1,1,TI.en[2].en.n]);
}
{
  const x=one(x=>{ x.en.how[2]='We never ask for kids\' names or photos; cards are for adults only.'; });
  const {j}=await ask([x]);
  c('a safeguard sentence ("we never ask for kids\' names") is not punished', j.ideas.length, 1);
}
// v10.40 review: the model may name a passage, never quote one (nor Ellen White). The human writers
// twice quoted a modern or a copyrighted translation (Proverbs 17:22 in RVR 1960, Numbers 6:24).
{
  const es=one(x=>{ x.es.d='Una noche de comedia limpia en la biblioteca, con permiso. «El corazón alegre constituye buen remedio» (Proverbios 17:22), dice la tarjeta de invitación.'; },'es');
  const {status,j}=await ask([es,TI.es[2]],{lang:'es'});
  c('rejected: Proverbs 17:22 quoted in Spanish (the RVR 1960 words)', [status,j.ideas.length,j.rejected,/Scripture/.test((j.reasons||[]).join(' '))], [200,1,1,true]);
}
{
  const {j}=await ask([one(x=>{ x.en.d='Members leave a card in every door on New Year\'s Day with the old blessing: “The Lord bless you and keep you.” No knocking, and a text line for prayer.'; }),TI.en[2]]);
  c('rejected: a verse quoted in a modern translation, the reference not even named ("The Lord bless you…")', [j.ideas.length,j.rejected], [1,1]);
}
{
  const {j}=await ask([one(x=>{ x.en.d='A small card sits on the laundromat folding table with a reading of Psalm 23 and a text number. Two members answer every text within a day, privately.'; })]);
  c('a passage named, not quoted ("a reading of Psalm 23"), is fine', j.ideas.length, 1);
}
{
  const {j}=await ask([one(x=>{ x.en.how[3]='Put the sign “Open for quiet. Come in.” on the laundromat door, with the owner\'s okay.'; })]);
  c('a quotation that is not Scripture (a sign\'s words) is fine', j.ideas.length, 1);
}
{
  nextText=JSON.stringify([{name:'Verse cards at the bus stop',why:'19.4% poverty',what:'A card with “For God so loved the world” (John 3:16) at the bus shelter.',first:['Print cards'],ppl:2,cost:0},{name:'Bus-stop benches',why:'19.4% poverty',what:'Two benches at the stop.',first:['Ask the town'],ppl:2,cost:1}]);
  const r=await post({mode:'moves',summary,count:2}); const j=await r.json();
  c('moves mode: a draft that quotes Scripture is left out; the others are kept', [r.status,j.ideas.map(x=>x.name)], [200,['Bus-stop benches']]);
  const movesSaid=/Never quote Scripture or Ellen White word for word/.test(lastBody.system);
  await ask(TI.en);
  c('…and both prompts say so (moves, topic)', [movesSaid,/Never quote Scripture or Ellen White word for word/.test(lastBody.system)], [true,true]);
}
{
  const {status,j}=await ask([one(x=>{ x.en.how[2]='Knock on each door on the street and offer to pray at the doorstep.'; })]);
  c('nothing passed: 502, the reasons, and no ideas', [status,j.ideas,j.rejected,/knocking/.test(j.reasons[0])], [502,undefined,1,true]);
}
{
  const {j}=await ask([TI.en[0],TI.en[0]]);
  c('the same idea twice in a batch: kept once', [j.ideas.length,j.rejected], [1,1]);
}

console.log('\n-- the answer\'s wrapping --');
{ let {j}=await ask('```json\n'+JSON.stringify(TI.en.slice(0,2))+'\n```'); c('a fenced reply is read', j.ideas.length, 2); }
{ const t=JSON.stringify(TI.en.slice(0,3)); let {j}=await ask(t.slice(0,t.length-200)); c('a reply cut off by max_tokens keeps the whole ideas before the cut', j.ideas.length, 2); }
{ let {status,j}=await ask('no json here'); c('nothing usable: 502', [status,/usable list/.test(j.error)], [502,true]); }
{ nextStop='refusal'; let {status,j}=await ask(TI.en); nextStop='end_turn'; c('a refusal is said plainly', [status,/declined/.test(j.error)], [502,true]); }
{ nextStatus=429; let {status,j}=await ask(TI.en); nextStatus=200; c('rate limit explained as before', [status,/Rate limited/.test(j.error)], [429,true]); }

console.log('\n-- guards --');
{ const before=calls; const r=await post({mode:'topic',topic:'',summary,lang:'en'}); c('no topic: 400, no call', [r.status,calls-before], [400,0]); }
{ const before=calls; const r=await post({mode:'topic',topic:'prayer'}); c('no report data: 400, no call', [r.status,calls-before], [400,0]); }
{ await ask(TI.en,{count:40}); c('count clamped to six a call', /Return exactly 6 ideas/.test(lastBody.messages[0].content), true); }
{ await ask(TI.en,{theme:'not-a-theme',lang:'fr'}); c('an unknown theme is ignored and the language falls back to English', [/library theme/.test(lastBody.messages[0].content),/ENGLISH/.test(lastBody.system)], [false,true]); }
{ await ask(TI.en,{topic:'<script>alert(1)</script> prayer'}); c('markup is taken out of the topic', /<script>/.test(lastBody.messages[0].content), false); }
c('moves mode: no temperature any more (current models refuse it with a 400)', await (async()=>{ nextText=JSON.stringify([{name:'x',why:'19.4% poverty'}]); await post({mode:'moves',summary,count:1}); return 'temperature' in lastBody; })(), false);

console.log('\n-- the passphrase lock --');
process.env.TERRAIN_AI_PASS='open sesame';
const locked=(await import(new URL('../netlify/functions/advise.mjs?locked',import.meta.url).href)).default;
{ const before=calls; const r=await locked(new Request('https://x/a',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'topic',topic:'prayer',summary,lang:'en'})}));
  const j=await r.json(); c('locked: 401 code locked, and no call is made', [r.status,j.code,calls-before], [401,'locked',0]); }
{ nextText=JSON.stringify(TI.en); const r=await locked(new Request('https://x/a',{method:'POST',headers:{'content-type':'application/json','x-terrain-pass':'open sesame'},body:JSON.stringify({mode:'topic',topic:'prayer',summary,lang:'en'})}));
  c('with the passphrase: ideas', [r.status,(await r.json()).ideas.length], [200,6]); }
{ const g2=await (await locked(new Request('https://x/a',{method:'GET'}))).json(); c('GET says locked, never the passphrase or the key', [g2.locked,JSON.stringify(g2).includes('sesame'),JSON.stringify(g2).includes(KEYV)], [true,false,false]); }
c('the key never reached a log', logged.some(l=>l.includes(KEYV)||l.includes('sk-ant-test')), false);
c('the key is sent only in the x-api-key header', !!(lastOpts&&lastOpts.headers&&lastOpts.headers['x-api-key']===KEYV&&!JSON.stringify(lastBody).includes(KEYV)), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
