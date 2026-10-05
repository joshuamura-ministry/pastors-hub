/* v56 · Make the Case · projects and purchases: the store and its rules (DESIGN-PURCHASE.md §2, §1.2 ③ ④, §10 T2).
 * The pastor (1 Oct 2026): "how to fundraise, and how much money; proposals to the finance committee, then the board, then the church".
 * His answers (2 Oct 2026): a special offering in Sabbath worship is fine; tithe is never a source; never sell tickets or chances (a FREE
 * drawing is fine); sales and work days stay off the Sabbath (SABBATH-GUIDELINE.md). Held here, on the average church
 * (tests/average-church/seed-purchase.json): buyClean (every field of the model, lengths, markup refused, unknown category refused, ids
 * buy- + six), the totals and the meter, the money rules, the dates, who decides (the business meeting only above HIS amount; Build or a
 * loan brings the conference and the union), the decisions saved under caseDecisions[buyId], Clear all, and that the sample writes nothing.
 */
const H = require('./v43-helpers.js');
const { c, page, ready, done, FX, SEED } = H;
// the survey's tract with the made-up church's own address, so a render keeps this church (uEnsureChurch), as v43-average-church
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: SEED('purchase')['terrain-churches-v1'].churches['sample-sampleton-sda'].address } };
(async () => {
  const P = await ready(page('purchase', 'en', { data: DATA }));
  c('no page errors', P.errs, []);
  const has = P.E('typeof buyClean==="function"&&typeof buyTotal==="function"&&typeof buyPathOf==="function"');
  c('the page has the purchase path (v56)', has);
  if (!has) return done();
  const J = P.J, E = P.E;
  const ID = 'buy-avs001';

  console.log('\n-- the store: uChurch().caseBuys, cleaned on every read --');
  c('the sample is read back whole', J(`(()=>{ const it=buyGet('${ID}'); return [it.cat,it.kind,it.team,it.name.en,it.options.length,it.fund.lines.length,it.path,buyRules().businessAt]; })()`),
    ['stream', 'buy', 'media', 'Sound board and camera', 3, 5, ['finance', 'board'], 10000]);
  c('an unknown category, a bad id, an array: refused (null)', J(`[buyItemClean({...buyGet('${ID}'),cat:'yacht'}),buyItemClean({...buyGet('${ID}'),id:'buy-avs01'}),buyItemClean({...buyGet('${ID}'),id:'../x'}),buyItemClean([])]`), [null, null, null, null]);
  c('markup in a name: that field dropped, the item kept', J(`(()=>{ const it=buyItemClean({...buyGet('${ID}'),name:{en:'<b>Sound</b>',es:'Consola'}}); return it.name; })()`), { es: 'Consola' });
  c('lengths: a 61-character name, a 121-character need, a 201-character goal are refused', J(`(()=>{ const it=buyItemClean({...buyGet('${ID}'),name:{en:'x'.repeat(61)},need:{en:'x'.repeat(121)},goal:{en:'x'.repeat(201)}}); return [it.name,it.need,it.goal]; })()`), [{}, {}, {}]);
  c('reasons: known keys only, once each, at most three; a count only where the reason counts', J(`buyItemClean({...buyGet('${ID}'),why:[{k:'shutins',n:9},{k:'shutins'},{k:'guests',n:4},{k:'bogus'},{k:'music'},{k:'safety'}]}).why`), [{ k: 'shutins', n: 9 }, { k: 'guests' }, { k: 'music' }]);
  c('an option: an http link, an IP host, a user and password are dropped (the option kept); a price of 0 or over $500,000 drops the option',
    J(`['http://shop.example.com/x','https://10.0.0.1/x','https://u:p@shop.example.com/x','https://www.shop.example.com/x#y'].map(u=>buyOptClean({...buyGet('${ID}').options[0],url:u},'a').url).concat([buyOptClean({...buyGet('${ID}').options[0],price:0},'a'),buyOptClean({...buyGet('${ID}').options[0],price:500001},'a')])`),
    ['', '', '', 'https://www.shop.example.com/x', null, null]);
  c('an option\'s host is the link\'s, never typed', J(`buyOptClean({...buyGet('${ID}').options[0],url:'https://www.sweetwater.com/store/x',host:'evil.example'},'a').host`), 'sweetwater.com');
  c('three options at most, one a tier; "Also found" at most six', J(`(()=>{ const o=buyGet('${ID}').options; const it=buyItemClean({...buyGet('${ID}'),options:[...o,o[0]],also:Array(9).fill(o[1])}); return [it.options.length,it.also.length]; })()`), [3, 6]);
  c('at most 30 items a church', J(`(()=>{ const items={}; for(let i=0;i<35;i++){ const id='buy-x'+String(i).padStart(5,'0'); items[id]={...buyGet('${ID}'),id}; } return Object.keys(buyClean({items}).items).length; })()`), 30);

  console.log('\n-- totals and the meter --');
  c('the sample: the recommended option, total $3,400 = price $3,150 + installation $250; planned $3,400', J(`(()=>{ const it=buyGet('${ID}'); return [buyPickId(it),buyTotal(it),buyFundSum(it),buyMeter(it).state]; })()`), ['b', 3400, 3400, 'planned']);
  c('$300 short; $200 over (allowed, and said)', J(`(()=>{ const it=buyGet('${ID}'); it.fund.lines[0].amount=700; const a=buyMeter(it); it.fund.lines[0].amount=1200; const b=buyMeter(it); return [a.state,a.diff,b.state,b.diff]; })()`), ['short', 300, 'over', 200]);
  c('phase 2 lowers what is to be raised now', J(`(()=>{ const it=buyGet('${ID}'); it.fund.phases={amount:1000}; return buyMeter(it).target; })()`), 2400);
  c('before he chooses: "better" when it is within the money planned, else the cheapest', J(`(()=>{ const it=buyGet('${ID}'); it.pick=null; const a=buySuggestPick(it); it.fund.lines=[{k:'budget',amount:500}]; const b=buySuggestPick(it); it.fund.lines=[]; const c2=buySuggestPick(it); return [a,b,c2]; })()`), ['b', 'a', 'b']);
  c('"Why this one", from the numbers: $5,450 less than Best', J(`buyWhySuggest(buyGet('${ID}'),'en')`), 'Meets our needs; $5,450 less than Best.');

  console.log('\n-- money rules: never tithe, never a game of chance, a free drawing is fine --');
  c('tithe / diezmo in a note: refused with the Church Manual sentence', J(`['Use the tithe','Del diezmo','tithing'].map(buyNoteBad)`), ['titheNo', 'titheNo', 'titheNo']);
  c('raffle tickets, a rifa, a lotería, bingo, a 50/50: refused ("We never sell tickets or chances. A free drawing is fine.")', J(`['Sell raffle tickets','Una rifa','Una lotería','Bingo night','A 50/50'].map(buyNoteBad)`), ['raffleNo', 'raffleNo', 'raffleNo', 'raffleNo', 'raffleNo']);
  c('a free drawing, a door prize, un sorteo gratuito: fine', J(`['A free drawing for a Bible','A door prize','Un sorteo gratuito'].map(buyNoteBad)`), [null, null, null]);
  c('the words', J(`[buyU('titheNo'),buyU('raffleNo')]`), ['Tithe is never used for local projects (Church Manual).', 'We never sell tickets or chances. A free drawing is fine.']);
  c('"Something else: from the tithe" is no source at all (the line is dropped); a matching gift\'s raffle note is dropped, the gift kept',
    J(`[buyLineClean({k:'other',amount:500,note:{en:'from the tithe'}}),buyLineClean({k:'match',amount:400,note:{en:'raffle tickets'}})]`), [null, { k: 'match', amount: 400 }]);
  c('there is no tithe source to choose (a closed list)', J(`[BUY_FUND_ORDER,'tithe' in BUY_FUND]`), [['budget', 'offering', 'designated', 'match', 'sell', 'grant', 'other'], false]);
  c('every line says its rule once: the offering "Ask the treasurer which Sabbath.", gifts "Used only for this.", the sale "Not on the Sabbath.", a grant "Ask the conference before applying."',
    J(`['offering','designated','sell','grant'].map(k=>buyU(BUY_FUND[k].rule))`), ['Ask the treasurer which Sabbath.', 'Used only for this.', 'Not on the Sabbath.', 'Ask the conference before applying.']);

  console.log('\n-- dates: the offering on a Sabbath; work and committee days never on it --');
  c('the sample: the offering Sat 7 Nov 2026 (a Saturday); install Sun 22 Nov (not)', J(`[buyIsSat('2026-11-07'),buyIsSat('2026-11-22')]`), [true, false]);
  c('an offering date that is not a Saturday is dropped', J(`[buyLineClean({k:'offering',amount:100,date:'2026-11-08'}),buyLineClean({k:'offering',amount:100,date:'2026-11-07'})]`), [{ k: 'offering', amount: 100 }, { k: 'offering', amount: 100, date: '2026-11-07' }]);
  c('install, finance, board and business never on a Saturday; first use may be (a Sabbath livestream)',
    J(`buyItemClean({...buyGet('${ID}'),dates:{install:'2026-11-21',finance:'2026-10-17',board:'2026-10-24',business:'2026-10-31',firstUse:'2026-11-28',report:'2026-12-15'}}).dates`), { firstUse: '2026-11-28', report: '2026-12-15' });

  console.log('\n-- who decides --');
  c('the church\'s path without the team: Finance committee › Church board; no business meeting under $10,000', J(`buyPathOf(buyGet('${ID}'))`), { path: ['finance', 'board'], conf: false, bizAuto: false });
  c('no amount typed: the business meeting is never added (no invented threshold)', J(`(()=>{ buyRulesSet({businessAt:null}); const it=buyGet('${ID}'); it.options[1].price=11750; return buyPathOf(it); })()`), { path: ['finance', 'board'], conf: false, bizAuto: false });
  c('his $10,000 and a $12,000 total: the business meeting is added', J(`(()=>{ buyRulesSet({businessAt:10000}); const it=buyGet('${ID}'); it.options[1].price=11750; return buyPathOf(it); })()`), { path: ['finance', 'board', 'business'], conf: false, bizAuto: true });
  c('Build or add on: the conference and union row, which no path change removes', J(`(()=>{ const it=buyGet('${ID}'); it.cat='building'; it.kind='build'; it.path=['board']; return buyPathOf(it); })()`), { path: ['board'], conf: true, bizAuto: false });
  c('a loan ("Something else": a loan) brings the conference in (Church Manual p. 153: "incurring debt of any kind")', J(`(()=>{ const it=buyGet('${ID}'); it.fund.lines.push({k:'other',amount:1000,note:{en:'A short loan from a member'}}); return [buyDebt(it),buyNeedsConf(it)]; })()`), [true, true]);
  c('Repair or install of a building: his conference\'s review amount, when typed', J(`(()=>{ const it=buyGet('${ID}'); it.cat='building'; it.kind='repair'; const a=buyNeedsConf(it); buyRulesSet({confAt:3000}); const b=buyNeedsConf(it); buyRulesSet({confAt:null}); return [a,b]; })()`), [false, true]);
  c('the audiences: the bodies on the path, the team that runs it, the whole church (the conference only when needed)', J(`buyAudiences(buyGet('${ID}'))`), ['finance', 'board', 'team', 'congregation']);

  console.log('\n-- the records: decisions under caseDecisions[buyId], as a ministry\'s --');
  c('caseDecSave keeps a finance decision for the purchase', J(`(()=>{ const r=caseDecSave('${ID}',{v:1,body:'finance',date:'2026-10-01',outcome:'recommended',vote:{for:5,against:0}}); return [r.body,r.outcome,!!uChurch().caseDecisions['${ID}'].finance,caseDecAll('${ID}').finance.outcome]; })()`), ['finance', 'recommended', true, 'recommended']);
  c('the board\'s deck says it ("Recommended by the finance committee on 1 Oct 2026")', J(`buyModel(buyGet('${ID}'),'board').status`), 'Recommended by the finance committee on 1 Oct 2026');
  E(`caseDecDrop('${ID}','finance')`);

  console.log('\n-- the goal, the name, the facts --');
  c('the goal suggestion: "{name}, so that {outcome}"', J(`(()=>{ const it=buyGet('${ID}'); it.goal={}; return buyGoalSuggest(it,'en'); })()`), 'Sound board and camera, so that members who cannot come can worship with us every Sabbath.');
  c('…Spanish: "para que" and the subjunctive (his Q1 rule)', J(`(()=>{ const it=buyGet('${ID}'); it.goal={}; return buyGoalSuggest(it,'es'); })()`), 'Consola de sonido y cámara, para que los miembros que no pueden venir adoren con nosotros cada sábado.');
  c('the short name from "In a few words"', J(`[buyNameSuggest('A new sound board and a camera so shut-ins can join the service'),buyNameSuggest('Una nueva estufa para la cocina')]`), ['Sound board and a camera', 'Estufa']);
  c('the facts: his count for a reason he ticked, the plan\'s ministries that need sound and video (computed), who can run it (counts only)',
    J(`(()=>{ const F=buyFacts(buyGet('${ID}'),{lang:'en'}); return [F.facts.map(f=>[f.value,f.label,f.src]),F.plan.map(p=>p.id),F.crew&&[F.crew.value,F.crew.label],F.census]; })()`),
    [[['9', 'members who watch from home', 'count'], ['2', 'ministries in our plan need sound and video', 'plan']], ['health-expo', 'four-nights'], ['1', 'member with sound or video skill; we’ll train 2 more'], []]);
  c('a count with no ticked reason is never a fact; census figures only for rides, neighbours and language', J(`(()=>{ const it=buyGet('${ID}'); it.why=[{k:'guests'},{k:'rides',n:6}]; const F=buyFacts(it,{lang:'en'}); return [F.facts.map(f=>[f.value,f.src]),F.census.map(c=>c.metric)]; })()`),
    [[['6', 'count'], ['14%', 'census']], ['noCar']]);

  // v56 look (2 Oct 2026): the motion read "the purchase of 16-channel digital mixer" / "la compra de Consola digital"; DESIGN §11 has
  // "a 16-channel digital mixer, a PTZ camera and …" / "una consola digital de 16 canales, una cámara PTZ y …". buyArt adds the article
  // only where it is sure (a singular head noun; in Spanish a noun it knows the gender of), never to a count or a plural
  c('the motion\'s articles, English (a / an by the sound, none for a count, a plural or a mass noun)', J(`['16-channel digital mixer','8-channel mixer','HD camera','USB interface','LED stage lights','Two PTZ cameras','2 wireless microphones','upgraded amplifier','used van','Wiring','Yamaha MG16XU','Allen & Heath SQ-5','11-passenger van','Chairs (60)'].map(p=>buyArt(p,'en'))`),
    ['a 16-channel digital mixer', 'an 8-channel mixer', 'an HD camera', 'a USB interface', 'LED stage lights', 'Two PTZ cameras', '2 wireless microphones', 'an upgraded amplifier', 'a used van', 'Wiring', 'a Yamaha MG16XU', 'an Allen & Heath SQ-5', 'an 11-passenger van', 'Chairs (60)']);
  c('…Spanish (un / una by the noun it knows, lower case mid-sentence; a brand or a plural as typed)', J(`['Consola de 12 canales (USB)','cámara 1080p','Micrófono inalámbrico','codificador','dos cámaras PTZ 4K','Luces LED','Yamaha MG16XU','Estufa comercial'].map(p=>buyArt(p,'es'))`),
    ['una consola de 12 canales (USB)', 'una cámara 1080p', 'un micrófono inalámbrico', 'un codificador', 'dos cámaras PTZ 4K', 'luces LED', 'Yamaha MG16XU', 'una estufa comercial']);
  c('…and in the motion\'s list (buyPlain with articles)', J(`[buyPlain('16-channel digital mixer + PTZ camera + encoder','en',true),buyPlain('Consola de 24 canales + dos cámaras PTZ 4K + mezclador de video','es',true),buyPlain('Consola de 24 canales + dos cámaras PTZ 4K','es')]`),
    ['a 16-channel digital mixer, a PTZ camera and an encoder', 'una consola de 24 canales, dos cámaras PTZ 4K y un mezclador de video', 'consola de 24 canales y dos cámaras PTZ 4K']);

  console.log('\n-- Clear all, and the sample --');
  c('the sample slideshow (caseSampleCtx) writes nothing to caseBuys', J(`(()=>{ const before=JSON.stringify(uChurch().caseBuys); try{ caseSample({ministry:'pathfinders',audience:{type:'board',group:'board'},timing:CASE_TIMING_DEFAULT}); }catch(e){} return JSON.stringify(uChurch().caseBuys)===before; })()`), true);
  // v10.44 review (finding 19): its second tap's warning says the projects go too (it said "profile, plan and drafts")
  // v10.45.0 (stale setup): Clear all is in "Your church" on the Spiritual Gifts landing
  const armed = Q => Q.J(`(()=>{ try{ render(); openTool('gifts'); }catch(e){} const b=document.getElementById('u-clear'); if(!b) return null; const before=b.textContent; b.click(); const t=b.textContent; b.dataset.armed=''; b.textContent=before; return [before,t]; })()`);
  c('Clear all\'s warning names the projects (EN)', armed(P), ['Clear all', 'Tap again to clear this church’s profile, plan, drafts and projects']);
  const PS = await ready(page('purchase', 'es', { data: DATA }));
  c('…and in Spanish', armed(PS), ['Borrar todo', 'Toque otra vez para borrar el perfil, el plan, los borradores y los proyectos de esta iglesia']);
  c('Clear all empties his projects', J(`(()=>{ capClearAll(); return [JSON.stringify(uChurch().caseBuys),buyList().length]; })()`), ['{}', 0]);
  done();
})();
