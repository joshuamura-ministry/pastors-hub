// Exercise advise.mjs 2.0 with a stubbed Anthropic API. No real calls, no cost.
process.env.ANTHROPIC_API_KEY='sk-ant-test-key-0000000000000000000000000000000000';
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,200));fail++}else pass++};
let lastBody=null, nextText=null, nextStatus=200;
globalThis.fetch=async(url,opts)=>{ lastBody=JSON.parse(opts.body);
  return { ok:nextStatus===200, status:nextStatus, json:async()=>nextStatus===200
    ? {content:[{type:'text',text:nextText}],usage:{input_tokens:10,output_tokens:20}}
    : {error:{message:'boom'}} }; };
const mod=await import(new URL('../netlify/functions/advise.mjs', import.meta.url).href);
const fn=mod.default;
const post=(body,headers={})=>fn(new Request('https://x/.netlify/functions/advise',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}));
const summary='GEOGRAPHY: Census Tract 2041.02 SOURCE: ACS. LOCAL FIGURES: poverty 19.4%; renters 48%; Spanish 19%';
const idea=(n)=>({name:'Idea '+n,why:'Because 19.4% poverty',metric:'poverty',room:'Kitchen',what:'What happens.',first:['Call','Buy','Say','Write'],week1:'Try it',ppl:2,cost:0,skills:['lang','bogus'],watch:'Nobody shows',unlike:'Not on list'});

console.log('-- GET --');
const g=await (await fn(new Request('https://x/a',{method:'GET'}))).json();
c('reports 2.1', g.fn, 'advise-2.1');
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
c('temperature 1 for variety', lastBody.temperature, 1);
c('max_tokens scales with count', lastBody.max_tokens, 700+5*550);
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

console.log('\n-- the prose plan still works --');
nextText='## Plan\n- do this';
r=await (await post({summary})).json();
c('no mode → prose text', r.text, '## Plan\n- do this');
c('prose uses the original prompt', /600-900 words/.test(lastBody.system));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
