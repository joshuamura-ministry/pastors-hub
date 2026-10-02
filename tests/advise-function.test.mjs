// Exercise advise.mjs 2.0 with a stubbed Anthropic API. No real calls, no cost.
process.env.ANTHROPIC_API_KEY='sk-ant-test-key-0000000000000000000000000000000000';
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,200));fail++}else pass++};
let lastBody=null, nextText=null, nextStatus=200, nextStop='end_turn';
globalThis.fetch=async(url,opts)=>{ lastBody=JSON.parse(opts.body);
  return { ok:nextStatus===200, status:nextStatus, json:async()=>nextStatus===200
    ? {content:[{type:'text',text:nextText}],stop_reason:nextStop,usage:{input_tokens:10,output_tokens:20}}
    : {error:{message:'boom'}} }; };
const mod=await import(new URL('../netlify/functions/advise.mjs', import.meta.url).href);
const fn=mod.default;
const post=(body,headers={})=>fn(new Request('https://x/.netlify/functions/advise',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}));
const summary='GEOGRAPHY: Census Tract 2041.02 SOURCE: ACS. LOCAL FIGURES: poverty 19.4%; renters 48%; Spanish 19%';
const idea=(n)=>({name:'Idea '+n,why:'Because 19.4% poverty',metric:'poverty',room:'Kitchen',what:'What happens.',first:['Call','Buy','Say','Write'],week1:'Try it',ppl:2,cost:0,skills:['lang','bogus'],watch:'Nobody shows',unlike:'Not on list'});

console.log('-- GET --');
const g=await (await fn(new Request('https://x/a',{method:'GET'}))).json();
// Updated for v10.40.0 (stale, not a regression): the pastor's Idea Library asked for "More ideas
// for {town}", which added the topic mode, so the function is advise-2.2 (tests/advise-topic.test.mjs).
// v56 (stale, not a regression): the pastor's "Find prices" (2 Oct 2026) added the prices modes, so the function is advise-2.4
// (tests/advise-prices.test.mjs); 2.3 was the Sabbath guideline. GET also says prices / pricesFn now.
c('reports 2.4', g.fn, 'advise-2.4');
c('says whether Find prices is on (a key and a passphrase; none set here: off)', [g.prices, g.pricesFn], [false, 'prices-1.0']);
c('defaults to Opus', g.model, 'claude-opus-5-5');
c('advertises the kinds', g.kinds, ['Serve','Equip','Belong','Invite']);

console.log('\n-- moves: routing and shaping --');
nextText=JSON.stringify([idea(1),idea(2),idea(3),idea(4),idea(5),idea(6),idea(7)]);
let r=await (await post({mode:'moves',summary,count:5,kind:'Belong',avoid:['A food pantry','VBS']})).json();
c('answers mode:moves with ideas', Array.isArray(r.ideas));
c('honours the count', r.ideas.length, 5);
c('echoes the kind', r.kind, 'Belong');
c('uses the moves prompt, not the prose one', /FRESH/.test(lastBody.system) && !/600-900 words/.test(lastBody.system));
c('tells the model its lane', /KIND OF MINISTRY FOR THIS BATCH: BELONG/.test(lastBody.messages[0].content));
c('passes the do-not-repeat list', /A food pantry; VBS/.test(lastBody.messages[0].content));
c('asks for exactly that many', /Return exactly 5 ideas/.test(lastBody.messages[0].content));
// Updated for v10.40.0 (stale): 2.2 sends no temperature. Current models (Opus 4.7 and later, the
// default claude-opus-5-5, and Sonnet 5) refuse sampling parameters with a 400, which read as "That
// model name was not accepted". Variety comes from the four batches' own lanes in the prompt.
c('no temperature (current models refuse sampling parameters)', 'temperature' in lastBody, false);
// Updated in the v10.40.0 integration (stale, not a regression): the default model (claude-opus-5-5) always
// thinks and its thinking counts against max_tokens, so the old 700 + 550 per idea could cut the list off; the
// moves mode now leaves room for thinking and runs at a low effort (the default is medium), as the topic mode does.
c('max_tokens scales with count, with room for thinking', lastBody.max_tokens, 2500+5*700);
c('a low effort keeps a batch inside the 60 s limit', lastBody.output_config&&lastBody.output_config.effort, 'low');
c('unknown skills are dropped, known kept', r.ideas[0].skills, ['lang']);
c('steps come through', r.ideas[0].first.length, 4);
c('ppl and cost honoured', [r.ideas[0].ppl,r.ideas[0].cost], [2,0]);
c('metric passed through', r.ideas[0].metric, 'poverty');
c('room lower-cased', r.ideas[0].room, 'kitchen');
c('the schema asks for both', /"metric":/.test(lastBody.system) && /"room":/.test(lastBody.system));

console.log('\n-- guards --');
r=await (await post({mode:'moves',summary,count:99,kind:'Nonsense'})).json();
c('count clamped to the per-call max', lastBody.messages[0].content.includes('Return exactly 6 ideas'));
c('an unknown kind is ignored, not rejected', r.kind, null);
nextText='```json\n'+JSON.stringify([idea(1)])+'\n```';
r=await (await post({mode:'moves',summary,count:1})).json();
c('a fenced reply is still parsed', r.ideas && r.ideas.length, 1);
nextText='Here are your ideas:\n'+JSON.stringify([idea(1),idea(2)])+'\nHope that helps!';
r=await (await post({mode:'moves',summary,count:2})).json();
c('a chatty reply is still parsed', r.ideas && r.ideas.length, 2);
nextText=JSON.stringify([{name:'',why:'x'},{name:'ok',why:''},{name:'fine',why:'ok'}]);
r=await (await post({mode:'moves',summary,count:3})).json();
c('ideas missing a name or a why are dropped', r.ideas.length, 1);
nextText='this is not json at all';
r=await (await post({mode:'moves',summary,count:2})).json();
c('garbage is an error, not a crash', /usable list/.test(r.error));
nextStatus=429; r=await (await post({mode:'moves',summary,count:2})).json(); nextStatus=200;
c('rate limit explained', /Rate limited/.test(r.error));

{ const t=JSON.stringify([idea(1),idea(2),idea(3)]); nextText=t.slice(0,t.length-60); nextStop='max_tokens';
  r=await (await post({mode:'moves',summary,count:3})).json(); nextStop='end_turn';
  c('a list cut off by max_tokens keeps its whole ideas', r.ideas&&r.ideas.length, 2); }
nextText=JSON.stringify([idea(1)]); nextStop='refusal';
r=await (await post({mode:'moves',summary,count:1})).json(); nextStop='end_turn';
c('a refusal is said plainly, not shown as ideas', [r.ideas, /declined/.test(r.error||'')], [undefined, true]);

console.log('\n-- the prose plan still works --');
nextText='## Plan\n- do this';
r=await (await post({summary})).json();
c('no mode → prose text', r.text, '## Plan\n- do this');
c('prose uses the original prompt', /600-900 words/.test(lastBody.system));
c('prose leaves room for thinking, at a low effort', [lastBody.max_tokens, lastBody.output_config&&lastBody.output_config.effort], [6000,'low']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
