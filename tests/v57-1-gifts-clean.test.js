// v10.57.1 — Spiritual Gifts' main page without the clutter; the main menu's second row reordered. The pastor (7 Oct 2026), with
// screenshots of "See the results" and "Across the congregation":
// - "at the top you don't need what that check for new results that should just populate whenever someone finishes. We don't need across
//   the church button at the top and instead of having Open And delete I would prefer having that circular graph to the right and smaller
//   ones … between the name and Open And delete should have … the most highest gift … three … right in the middle";
// - "we don't need the sample report anymore because if you push open all those are sample reports";
// - "in the fill positions … it should just show across the congregation or it should be opened anyway so it will just continue to
//   populate … take it myself doesn't need to be there results tab doesn't need to be there. [Share link] can be at the bottom and across
//   the church button doesn't need to be there either … we need to clear out the clutter";
// - "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right and
//   underneath … there are resources available … for your church and find resources".
// Written failing-first on v10.57.0.
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const ADDR="D.geo={...D.geo,matched:'118 Bristol Rd, Warminster, PA, 18974'}";
const btnTexts=P=>P.qa('#gifts button').map(b=>b.textContent.replace(/\s+/g,' ').trim());

(async()=>{ await T.sec(async()=>{
  const P=page({needs:'file'}); await ready(P);
  // v10.58.0 (stale): the next release moved the stamps; what this suite holds is that they agree
  { const v=P.E('VERSION'); c('the stamps agree', [P.q('meta[name="terrain-version"]').content,P.q('html').dataset.version,P.txt('#ver')], [v,v,v]); }
  survey(P,{mod:ADDR}); await sleep(150);
  P.E(`(()=>{ capSave(${JSON.stringify(FX.MEDIUM)}); gfDemoFill({quiet:true}); gfOpenLanding(); })()`); await sleep(150);

  console.log('\n-- the main page: no tabs, no "Check for new results", no "Across the church", no "Take it yourself", no sample report --');
  c('on the main page', [P.E('TOOL'),P.E('GF_VIEW'),!!P.q('#gf-results'),!!P.q('#gf-positions')], ['gifts','roster',true,true]);
  const bt=btnTexts(P);
  c('no tab bar', !!P.q('#gifts .gftabs'), false);
  c('no "Check for new results"', [!!P.q('#gfpull'),bt.some(t=>/Check for new results/.test(t))], [false,false]);
  c('no "Across the church" button', bt.some(t=>/Across the church/.test(t)), false);
  // v10.63.2 (stale, not a regression): the pastor (9 Oct 2026), "I don't need it to be buttons clickable it's just shows that you invite your members you can see the results and then you fill the positions … What I want is a beautiful two big buttons … Send spiritual gifts to your members and then take it yourself": the steps are a picture, then two big buttons
  c('"Take it yourself" is back, as the second big button', [!!P.q('#gifts [data-gv="take"]'),bt.some(t=>/Take it yourself/.test(t))], [true,true]);
  c('no "See a sample report" (every result opens as a report)', [!!P.q('#gfsample'),bt.some(t=>/sample report/i.test(t))], [false,false]);
  // v10.63.3 (stale, not a regression): The pastor (9 Oct 2026), "Too many words we need to make it simple like the one on the right it doesn't look symmetrical at all"
  c('step 1: two big buttons, Send to members and Take it yourself', P.qa('#gf-invite .gfbigb b').map(b=>b.textContent), ['Send to members','Take it yourself']);

  console.log('\n-- each result: the name, the three strongest gifts in their colours, a small wheel; the row opens the report --');
  c('24 rows, each one button, no Open or Delete beside it', [P.qa('#gf-results .gfrow2').length,P.qa('#gf-results .gfrow2').every(r=>r.tagName==='BUTTON'),P.qa('#gf-results .gfopen, #gf-results .gfdel').length], [24,true,0]);
  const want=P.J(`gfProfile(gfScores(gfDecode(gfRoster()[0].code).a)).ranked.slice(0,3).map(s=>gfShort(s.id))`);
  c('Alex Rivera: his three strongest gifts in the middle, Teaching first', [P.txt('#gf-results .gfrow2 .gfrw b'),P.qa('#gf-results .gfrow2:first-of-type .gftg').map(x=>x.textContent),want[0]], ['Alex Rivera (sample)',want,'Teaching']);
  c('…each in its family\'s colour (Teaching: Scripture and truth)', P.q('#gf-results .gfrow2 .gftg').getAttribute('style'), '--k:var(--m-language)');
  c('every row has three gifts and a wheel', P.qa('#gf-results .gfrow2').every(r=>r.querySelectorAll('.gftg').length===3&&r.querySelector('.gfmw svg')), true);
  c('the wheel: the 21 gifts, the three strongest in full colour', [P.qa('#gf-results .gfrow2:first-of-type .gfmw-b').length,P.qa('#gf-results .gfrow2:first-of-type .gfmw-b:not(.lo)').length], [21,3]);
  c('…a picture only (the row says the gifts in words)', P.q('#gf-results .gfrow2 .gfmw svg').getAttribute('aria-hidden'), 'true');
  // v10.59.3: the pastor, "put like teaching and whatever in tiny words … just the 3 main ones": the three strongest named beside their wedges
  c('…with the three strongest named in tiny words beside their wedges, the same three as the chips', P.qa('#gf-results .gfrow2:first-of-type .gfmw text').map(t=>t.textContent).sort(), want.slice().sort());   // in the wheel's own order round the ring
  c('…in their families\' colours, and no label collides with another on its side', [P.qa('#gf-results .gfrow2:first-of-type .gfmw text').every(t=>/--k|--m-|--acc|--gfv/.test(t.getAttribute('style')||'')),
    P.qa('#gf-results .gfrow2').every(r=>{ const L=[...r.querySelectorAll('.gfmw text')].map(t=>({s:t.getAttribute('text-anchor'),y:+t.getAttribute('y')})); return ['start','end'].every(s=>{ const ys=L.filter(l=>l.s===s).map(l=>l.y).sort((a,b)=>a-b); return ys.every((y,i)=>!i||y-ys[i-1]>=8); }); })], [true,true]);
  P.q('#gf-results .gfrow2').click(); await sleep(80);
  c('tapping the row opens the report, with the way back above it and its own Delete', [/Alex Rivera/.test(P.txt('#gifts')),!!P.q('#gifts [data-gf-back]'),!!P.q('#gifts #gfpdel')], [true,true,true]);
  P.q('#gifts #gfpdel').click(); await sleep(20);
  c('Delete asks for a second tap', [P.txt('#gifts #gfpdel'),/removes Alex Rivera \(sample\)’s result from this device/.test(P.txt('#gifts'))], ['Tap again to delete it',true]);
  P.q('#gifts #gfpdel').click(); await sleep(60);
  c('…the second deletes it and goes back to the list', [P.E('gfRoster().length'),!!P.q('#gf-results'),P.txt('#gflinknote')], [23,true,'Deleted.']);
  P.q('#gf-results .gfrow2').click(); await sleep(60); P.q('#gifts [data-gf-back]').click(); await sleep(60);
  c('Back to all results', [!!P.q('#gf-results'),P.qa('#gf-results .gfrow2').length], [true,23]);

  console.log('\n-- step 3: Across the congregation, always open, on the page --');
  c('Fill the positions holds Across the congregation', [P.txt('#gf-positions .gfcong h4'),/23 members so far/.test(P.txt('#gf-positions .gfcong'))], ['Across the congregation',true]);
  c('…with what the church is strong in and who could staff what', [/What this church is strong in/.test(P.txt('#gf-positions')),/Who could staff what/.test(P.txt('#gf-positions'))], [true,true]);
  c('…no Print button, no "Using this with the rest of Terrain"', [!!P.q('#gfprintchurch'),/Using this with the rest of Terrain/.test(P.txt('#gifts'))], [false,false]);
  c('…"Who to ask, in Make the Case" and the Volunteers fold stay', [!!P.q('#gf-positions [data-gf-tocase]'),!!P.q('#gf-positions #gfteamslot details')], [true,true]);
  P.E(`GF_VIEW='church'; gfRender();`); await sleep(60);
  c('an old way to "Across the church" lands on the main page', [P.E('GF_VIEW'),!!P.q('#gf-positions .gfcong')], ['roster',true]);

  console.log('\n-- the share page: one way back, no tabs --');
  P.q('#gf-invite [data-gv="setup"]').click(); await sleep(80);   // v10.63.2: the first big button
  c('the share page has one button back and no tabs', [P.E('GF_VIEW'),P.qa('#gifts .gftabs button').map(b=>b.textContent.trim())], ['setup',['← Back to Spiritual Gifts']]);
  P.q('#gifts .gftabs button').click(); await sleep(80);
  c('…back to the main page', [P.E('GF_VIEW'),!!P.q('#gf-results')], ['roster',true]);

  console.log('\n-- results come in by themselves --');
  P.E(`(()=>{ uChurch().share={...(uChurch().share||{}),pub:'pubtest1',key:'keytest1'}; uPersist(); GF_LAST_SYNC={}; })()`);
  const f0=P.w.__fetched.length;
  P.E('gfRender()'); await sleep(60);
  c('opening the page asks the results server, with no button', P.w.__fetched.slice(f0).some(u=>/functions\/gifts/.test(u)), true);
  c('…and keeps asking while the page is on screen (every 90 seconds)', [P.E('GF_POLL_MS'),P.E('!!GF_POLL_T')], [90000,true]);
  P.E(`gfSync=async()=>({added:1,updated:0,confirmed:0,removed:0,held:0,gone:false}); GF_LAST_SYNC={};`);
  P.E('gfPollTick(0)'); await sleep(60);
  c('a new result redraws the page and says so', [!!P.q('#gf-results'),P.txt('#gflinknote')&&P.txt('#gflinknote').length>0], [true,true]);
  P.E(`openTool('survey')`); await sleep(20); P.E('gfPollTick(0)');
  c('leaving the page stops it', P.E('GF_POLL_T'), null);
  c('no page errors', P.errs, []);
});

await T.sec(async()=>{
  console.log('\n-- the main menu: Compare your churches · Evangelism Planner · Learn from other conferences --');
  const P=page(); await ready(P); P.E('showHub()'); await sleep(40);
  c('the order', P.qa('#hub .tools .tool').map(t=>t.dataset.tool), ['survey','gifts','case','planner','compare','churches']);   // v10.59.2: Compare your churches last (the pastor: "put compare your churches to the very bottom right instead because it's the weakest one")
  c('Learn from other conferences: resources for your church', [P.txt('#hub .tool[data-tool="compare"] b'),P.txt('#hub .tool[data-tool="compare"] .td'),P.txt('#hub .tool[data-tool="compare"] .tgo')],
    ['Learn from other conferences','Ideas and resources from other conferences, for your church.','Find resources']);
  const S=page({lang:'es'}); await ready(S); S.E('showHub()'); await sleep(40);
  c('…in Spanish', [S.txt('#hub .tool[data-tool="compare"] .td'),S.txt('#hub .tool[data-tool="compare"] .tgo')], ['Ideas y recursos de otras asociaciones, para su iglesia.','Buscar recursos']);
  c('no page errors', [P.errs,S.errs], [[],[]]);
}); T.done(); })();
