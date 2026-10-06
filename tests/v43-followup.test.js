/* v10.43.0 — every outreach event and series comes with a follow-up plan (DESIGN.md C1.7 – C1.13, FOLLOWUP.md §3; §8.1 T-F1 – T-F10).
 * The pastor (30 Sep 2026): "after one day there needs to be some kind of follow-up if we connect with the community… so that we can
 * build a relationship with the people." SPEC §2: the next step (an ongoing ministry the event feeds, suggested from the same theme
 * or need, the pastor can pick another, saved per church + idea); a set timeline (a thank-you within 48 hours; an invitation within
 * two weeks, if they asked; a visit only if they ask; the interest coordinator keeps the list, Church Manual p. 91); success =
 * relationships, "how many took the next step", counts only, never names; the "After the day" slide, the handout's and the
 * Proposal's "Follow-up plan", the motion's clause. Ongoing ministries don't get it.
 *  T-F1 fuApplies          T-F2 storage            T-F3 the suggestion        T-F4 the picker          T-F5 the After slide
 *  T-F6 a member's copy    T-F7 the handout        T-F8 the Proposal          T-F9 the counts, no names  T-F10 step 3's card
 */
const H = require('./v43-helpers.js');
const { c, sleep, until, page, ready, build, slide, BUILTIN_EVENTS, BUILTIN_SERIES, NOCARD_BUILTIN } = H;
const NAMES = ['Abigail Sample', 'Bartholomew Sample', 'Cordelia Sample'];
// a made-up Connections list (C2's shape: CONNECT.md §6.7): 23 adults for the health expo, 9 took the next step, 14 thanked, 2 visits asked
const PEOPLE = Array.from({ length: 23 }, (_, i) => ({ id: 'p' + i, src: 'phone', ts: Date.parse('2026-09-20T15:00:00') + i * 6e5, lang: i % 4 ? 'en' : 'es', name: NAMES[i % 3] + ' ' + i,
  picks: i < 2 ? ['visit', 'prayer'] : i < 12 ? ['next', 'prayer'] : i < 20 ? ['next'] : ['nothing'], reach: i < 20 ? { t: 'phone', v: '215-555-01' + String(i).padStart(2, '0') } : null,
  consent: i < 20 ? 1 : null, safe: null, note: i === 3 ? 'Please pray for my mother, Ruth Sample' : '', cv: 1, keep: Date.parse('2027-09-20'),
  fu: { thanks: i < 14 ? 1 : 0, invite: i < 12 ? 1 : 0, visit: 0, next: i < 9 ? 1 : 0 } }));
// v10.43 (integration): with C2 in the page, cnResults / cnDueFor are its function declarations (delete cannot remove them), so the
// stub keeps the real ones and UNSTUB puts them back.
const STUB = `if(!window.__cnSaved) window.__cnSaved=[window.cnResults,window.cnDueFor]; uChurch().connect={cards:{'health-expo':{id:'CARDTEST1',opts:[{k:'next'},{k:'prayer'},{k:'visit'},{k:'nothing'}]}},past:[],people:{CARDTEST1:${JSON.stringify(PEOPLE)}},gone:{}};
  window.cnResults=id=>{ const c=uChurch().connect, cd=c&&c.cards&&c.cards[id]; return cnCounts(cd&&c.people[cd.id]||[]); };
  window.cnDueFor=id=>{ const c=uChurch().connect, cd=c&&c.cards&&c.cards[id]; return cnDueToday(cd&&c.people[cd.id]||[],cd,'2026-10-01'); };`;
const UNSTUB = `window.cnResults=window.__cnSaved&&window.__cnSaved[0]; window.cnDueFor=window.__cnSaved&&window.__cnSaved[1]; window.__cnSaved=null; delete uChurch().connect;`;
(async () => {
  const P = await ready(page('after', 'en')), Pes = await ready(page('after', 'es'));
  const has = P.E('typeof fuApplies==="function"&&typeof fuNextOf==="function"');
  c('the page has the follow-up plan (v10.43)', has, true);
  if (!has) return H.done();
  // library ideas for the rows below, found by their data: an in-reach event, an event made and handed out, a no-card event
  const pick = P.J(`(()=>{ const ev=LIB.rows.filter(r=>r.cad===1);
    return {inR:ev.find(r=>libReach(r)==='in').id, made:ev.find(r=>libReach(r)!=='in'&&libMadeName(r.n)).id, out:ev.find(r=>libReach(r)==='out'&&!libMadeName(r.n)&&r.theme==='neighbors').id}; })()`);
  pick.nocard = 'prayer-library-hope-tree';
  for (const id of Object.values(pick)) await P.E(`(async()=>{ const r=LIB.byId.get(${JSON.stringify(id)}); await libLoadTheme(r.theme); libSave(libFull(${JSON.stringify(id)})); })()`);
  await sleep(30);
  const X = id => `(uCatalog().find(z=>z.id===${JSON.stringify(id)})||(id=>{ const r=LIB.byId.get(id); return r?libLite(r):null; })(${JSON.stringify(id)}))`;

  console.log('\n-- T-F1 when the follow-up plan applies (C1.7) --');
  c('ongoing (the food pantry): no', P.E(`fuApplies(${X('food-pantry')})`), false);
  c('for God\'s people (an in-reach event): no (D8: members are already known)', P.E(`fuApplies(${X(pick.inR)})`), false);
  c('made and handed out: no', P.E(`fuApplies(${X(pick.made)})`), false);
  c('the built-ins that hand something out and leave: no (D7)', NOCARD_BUILTIN.map(id => P.E(`fuApplies(${X(id)})`)), NOCARD_BUILTIN.map(() => false));
  c('an idea whose own words promise no names (nocard): no', [P.E(`${X(pick.nocard)}.nocard`), P.E(`fuApplies(${X(pick.nocard)})`)], [true, false]);
  c('his Evangelism Planner series: yes (no counts row, D9)', P.E(`fuApplies({id:CASE_PLAN_ID,plan:true,planRaw:{nights:12,perweek:4},reach:'out'})`), true);
  c('any other event or series: yes (the health expo, VBS, an outreach library event)', ['health-expo', 'vbs', pick.out].map(id => P.E(`fuApplies(${X(id)})`)), [true, true, true]);
  c('"Runs as" ongoing takes it away', P.E(`(()=>{ uChurch().cadence={'health-expo':{cad:0}}; const a=fuApplies(${X('health-expo')}); delete uChurch().cadence; return a; })()`), false);

  console.log('\n-- T-F2 storage: his pick, per church + idea --');
  P.E(`fuSet('health-expo',{id:'cooking-school',n:'',ne:''})`);
  c('saved as {v:1, next:{id,n,ne}, at}', P.J(`(()=>{ const e=uChurch().followUp['health-expo']; return [e.v,e.next,/^\\d{4}-\\d{2}-\\d{2}$/.test(e.at)]; })()`), [1, { id: 'cooking-school', n: '', ne: '' }, true]);
  c('read back: his own, not suggested, a series ("Or a series"), named in both languages',
    P.J(`(()=>{ const n=fuNextOf(${X('health-expo')}); return [n.id,n.own,n.suggested,n.cad,n.name.en,n.name.es.length>0]; })()`), ['cooking-school', false, false, 'series', P.E(`caseMinName(SIGNATURE.find(z=>z.id==='cooking-school'))`), true]);
  P.E(`fuSet('backpack-giveaway',{own:'Our monthly family night'})`);
  c('his own words: {own}', P.J(`fuNextOf(${X('backpack-giveaway')})`), { id: null, own: true, suggested: false, why: null, gap: null, name: { en: 'Our monthly family night', es: 'Our monthly family night' }, cad: 'ongoing' });
  c('fuClean refuses markup, a link, an @, 61 characters, a bad id', P.J(`[{own:'<b>x</b>'},{own:'see https://x.org'},{own:'me@x.org'},{own:'x'.repeat(61)},{id:'Bad Id!'},{own:'   '}].map(fuClean)`), [null, null, null, null, null, null]);
  c('…and keeps 60 characters, an id, names cut to 60', P.J(`[fuClean({own:'y'.repeat(60)}).own.length,fuClean({id:'health-home-supper-club',n:'z'.repeat(80),ne:'w'}).n.length]`), [60, 60]);
  P.E(`fuSet('backpack-giveaway',null)`);
  c('"Use the suggestion" (null) deletes it', P.J(`uChurch().followUp['backpack-giveaway']===undefined`), true);
  c('per church: another church has none', P.J(`(()=>{ const s=uStore(), a=s.active; s.churches.zz={id:'zz',name:'Other'}; s.active='zz'; const r=fuGet('health-expo'); s.active=a; delete s.churches.zz; return r; })()`), null);
  P.E(`capClearAll()`);
  c('Clear all clears his next steps (followUp)', P.J(`uChurch().followUp===undefined`), true);
  const P2 = await ready(page('after', 'en'));   // a fresh page: Clear all wiped this one's profile

  console.log('\n-- T-F3 the suggestion (C1.8): plan › curated › theme › related --');
  for (const id of Object.values(pick)) await P2.E(`(async()=>{ const r=LIB.byId.get(${JSON.stringify(id)}); await libLoadTheme(r.theme); libSave(libFull(${JSON.stringify(id)})); })()`);
  const all = [...BUILTIN_EVENTS, ...Object.keys(BUILTIN_SERIES)];
  const sug = P2.J(`${JSON.stringify(all)}.map(id=>{ const x=SIGNATURE.find(z=>z.id===id); const n=fuNextOf(x); const y=n&&n.id?fuItem(n.id):null;
    return [id,n&&n.id,n&&n.why,y?[caseCadenceOf(y).c,caseReachOf(y),!!y.made,caseKidsOf(y),y.id===id]:null,x.ages||'',caseKidsOf(x)]; })`);
  c('every built-in event and series has a suggestion', sug.filter(s => !s[1]).map(s => s[0]), []);
  c('…never itself, always ongoing, never "in", never made', sug.filter(s => s[3] && (s[3][4] || s[3][0] !== 'ongoing' || s[3][1] === 'in' || s[3][2])).map(s => s[0]), []);
  c('…the first candidate (plan › curated › theme › related) the church can staff, else the first',
    P2.E(`(()=>{ const bad=[]; ${JSON.stringify(all)}.forEach(id=>{ const x=SIGNATURE.find(z=>z.id===id), c=fuCandidates(x), want=c.find(k=>k.why==='plan'||fuStaff(k.x).ok)||c[0], n=fuNextOf(x); if(!want||!n||n.id!==want.id) bad.push(id); }); return bad.join(); })()`), '');
  c('…the curated pair is a candidate for every one, right after his plan', P2.E(`(()=>{ const bad=[]; ${JSON.stringify(all)}.forEach(id=>{ const c=fuCandidates(SIGNATURE.find(z=>z.id===id)), i=c.findIndex(k=>k.why==='fit'); if(i<0||c.slice(0,i).some(k=>k.why!=='plan')) bad.push(id); }); return bad.join(); })()`), '');
  c('SPEC\'s own examples: back-to-school → the weekly homework club; the health fair → the blood pressure check; four nights → one study at a kitchen table',
    ['backpack-giveaway', 'health-expo', 'four-nights'].map(id => sug.find(s => s[0] === id)[1]), ['homework-club', 'bp-clinic', 'kitchen-study']);
  c('every candidate passes the rule (fuOk), and an adults\' idea never gets a children\'s club',
    P2.E(`(()=>{ const bad=[]; ${JSON.stringify(all)}.forEach(id=>{ const x=SIGNATURE.find(z=>z.id===id); fuCandidates(x).forEach(k=>{ if(!fuOk(x,k.x)) bad.push(id+'>'+k.id); if(fuAdults(x)&&caseKidsOf(k.x)&&!caseKidsOf(x)) bad.push(id+' kids '+k.id); }); }); return bad.length; })()`), 0);
  c('his plan comes first when it shares a theme (the walking club for the health expo)', P2.J(`(()=>{ const sel=uChurch().selected; uChurch().selected=['walking-club']; const n=fuNextOf(SIGNATURE.find(z=>z.id==='health-expo')); uChurch().selected=sel; return [n.id,n.why]; })()`), ['walking-club', 'plan']);
  c('a library idea whose curated first is "for God\'s people" takes its alternative (next-reach.txt: the neighbor families\' pageant)',
    await P2.E(`(async()=>{ const id='children-neighbor-family-pageant'; const r=LIB.byId.get(id); await libLoadTheme(r.theme); const x=libToCatalog(libFull(id)); const c=fuCandidates(x,{sample:true});
      return JSON.stringify([c.some(k=>k.id==='childrens-ministries-childrens-choir-no-auditions'), (c.find(k=>k.why==='fit')||{}).id]); })()`).then(JSON.parse),
    [false, 'children-apartment-clubhouse-club']);
  c('his Planner series: from public evangelism and interests (an ongoing, joinable idea)', P2.J(`(()=>{ const n=fuNextOf({id:CASE_PLAN_ID,plan:true,planRaw:{nights:12,perweek:4},reach:'out',n:'Series'}); const y=n&&fuItem(n.id); return [!!n, y?caseCadenceOf(y).c:null, y?fuThemesOf(y).some(t=>['public-evangelism','interests','personal-evangelism','small-groups'].includes(t)):null]; })()`), [true, 'ongoing', true]);
  c('a staffable candidate before one the church cannot staff yet: the suggestion is staffable when any candidate is',
    P2.E(`(()=>{ let bad=0; ${JSON.stringify(all)}.forEach(id=>{ const x=SIGNATURE.find(z=>z.id===id), c=fuCandidates(x), s=fuSuggest(x); if(c.some(k=>fuStaff(k.x).ok)&&!fuStaff(s.x).ok) bad++; }); return bad; })()`), 0);

  console.log('\n-- T-F5 the After slide (FOLLOWUP.md §3.6, C1.11) --');
  const order = R => R.d.slides.map(s => s.part === 'after' ? 'after' : s.part === 'decide' ? 'decide' : s.type);
  const at = (R, k) => order(R).indexOf(k);
  const B = await build(P2, 'health-expo', 'board'), F = await build(P2, 'health-expo', 'finance'), TM = await build(P2, 'backpack-giveaway', 'community'),
    CG = await build(P2, 'four-nights', 'congregation'), CF = await build(P2, 'health-expo', 'conference'), BU = await build(P2, 'vbs', 'business');
  c('a board deck: … safeguards · timing · AFTER · the ask · the appeal', order(B).slice(-5), ['risks', 'decide', 'after', 'ask', 'close']);
  c('the finance committee: … timing · AFTER · the appeal (no closing ask)', order(F).slice(-3), ['decide', 'after', 'close']);
  c('a team: … timing · AFTER · will you join?', order(TM).slice(-3), ['decide', 'after', 'yes']);
  c('the whole church: how it works · AFTER · in this room', [order(CG)[at(CG, 'after') - 1], order(CG)[at(CG, 'after') + 1]], ['how', 'ability']);
  c('the conference: the plan and its dates · AFTER · the ask', [order(CF)[at(CF, 'after') - 1], order(CF)[at(CF, 'after') + 1]], ['timeline', 'ask']);
  c('the business meeting too; never more than 12 slides', [at(BU, 'after') > 0, ...[B, F, TM, CG, CF, BU].map(R => R.d.slides.length <= 12)], [true, true, true, true, true, true, true]);
  const A = slide(B, 'after');
  c('its words: After the day · How we\'ll stay connected · five rows (next, 48 hours, 2 weeks, a visit, the list)',
    [A.type, A.kicker, A.headline, A.rows], ['ask', 'After the day', 'How we’ll stay connected', [['Next step', 'Monthly blood pressure and wellness check'], ['Within 48 hours', 'A thank-you'], ['Within 2 weeks', 'An invitation, if they asked'], ['A visit', 'Only if they ask'], ['The list', 'Private, with the interest coordinator']]]);
  c('a series says "After the series"', slide(CG, 'after').kicker, 'After the series');
  const Bes = await build(Pes, 'health-expo', 'board');
  c('Spanish: Después del evento · Cómo seguiremos en contacto · Antes de 48 horas · Una invitación, si la pidieron',
    [slide(Bes, 'after').kicker, slide(Bes, 'after').headline, slide(Bes, 'after').rows.map(r => r[0]), slide(Bes, 'after').rows[2][1]],
    ['Después del evento', 'Cómo seguiremos en contacto', ['Siguiente paso', 'Antes de 48 horas', 'Antes de 2 semanas', 'Una visita', 'La lista'], 'Una invitación, si la pidieron']);
  c('its verse is one of CASE_VERSE_AFTER, within its room (92), never twice in the deck', (() => { const v = A.verse; const refs = B.d.slides.map(s => s.verse && s.verse.ref).filter(Boolean);
    return [!!v, P2.J(`CASE_VERSE_AFTER.map(id=>caseVerseOf(id,'en').ref)`).some(r => v && v.ref.startsWith(r)), new Set(refs).size === refs.length]; })(), [true, true, true]);
  c('keyed after:0 (his words on it stay), present.mjs drops "part" as for decide', P2.J(`caseSlotKeys(${JSON.stringify(B.d)}).filter(k=>/^after/.test(k))`), ['after:0']);
  const GE = await build(P2, 'grief', 'board');
  c('a gentle idea (grief): "Only what each person asked for"', slide(GE, 'after').rows[1], ['Within 48 hours', 'Only what each person asked for']);
  for (const [id, g, why] of [['food-pantry', 'board', 'ongoing'], [pick.inR, 'board', 'in-reach'], [pick.made, 'board', 'made'], ['school-supplies', 'board', 'no card'], [pick.nocard, 'community', 'its words promise no names']]) {
    const R = await build(P2, id, g); c(`no After slide on an ${why} deck (${id})`, [R.d.slides.some(s => s.part === 'after' || (s.rows && s.rows[0] && s.rows[0][0] === 'Next step')), !!R.m.followup], [false, false]); }
  // the results row: with a list, "So far · 23 connected · 9 took the next step", the visit row gives way, the verse room 50
  P2.E(STUB);
  const BR = await build(P2, 'health-expo', 'board');
  const AR = slide(BR, 'after');
  c('with the Connections list: "So far · 23 connected · 9 took the next step"; the visit row gives way', [AR.rows.map(r => r[0]), AR.rows[AR.rows.length - 1]], [['Next step', 'Within 48 hours', 'Within 2 weeks', 'The list', 'So far'], ['So far', '23 connected · 9 took the next step']]);
  c('…its verse (if any) within 50 characters', !AR.verse || P2.E(`(()=>{ const id=CASE_VERSE_AFTER.find(i=>${JSON.stringify(AR.verse ? AR.verse.ref : '')}.startsWith(caseVerseOf(i,'en').ref)); return Math.max(caseVerseOf(id,'en').text.length,caseVerseOf(id,'es').text.length)<=50; })()`), true);
  const edited = P2.J(`(()=>{ const d=${JSON.stringify(BR.d)}; const k=caseSlotKeys(d).indexOf('after:0'); const E={'after:0':{headline:'H'.repeat(70)}}; const o=caseApplyEdits(d,E); const s=o.slides[k];
    const d2=${JSON.stringify(B.d)}; const o2=caseApplyEdits(d2,{'after:0':{headline:'H'.repeat(120)}}); const s2=o2.slides[caseSlotKeys(d2).indexOf('after:0')];
    const o3=caseApplyEdits(d,{'after:0':{headline:'H'.repeat(60)}}), s3=o3.slides[k]; const o4=caseApplyEdits(d,{'after:0':{headline:'H'.repeat(56)}}), s4=o4.slides[k];
    return [s.headline.length, s.rows.map(r=>r[0]), s.verse, s2.headline.length, s2.rows.some(r=>r[0]==='A visit'), !!s2.verse, s3.verse, !!s4.verse]; })()`);
  // (Chrome at 360 × 640: beside the results row a Spanish headline of 60 wide letters ran 6 px over with its verse; 56 fits)
  c('his own headline: at most 90 characters; over 64 the visit row gives way; beside the results row, over 56, the verse too', edited,
    [70, ['Next step', 'Within 48 hours', 'Within 2 weeks', 'The list', 'So far'], null, 90, false, true, null, true]);
  const PL = await build(P2, '@plan', 'conference', { pre: `uChurch().plan={date:'2027-04-03',nights:12,perweek:4,kind:'both',workers:20,leaders:6,seats:120,budget:6000};` });
  c('his Planner series: the After slide, no counts row (D9)', slide(PL, 'after') && [slide(PL, 'after').rows.some(r => r[0] === 'So far'), PL.m.followup.results], [false, null]);

  console.log('\n-- T-F9 the counts, and no names anywhere shared --');
  c('fuCounts reads the list through C2\'s cnResults / cnDueFor: numbers only', P2.J(`(()=>{ const n=fuCounts('health-expo'); return [n.connected,n.nextTaken,n.thanked,n.invited,n.visitAsked,n.askedMore,Object.values(n).every(v=>Number.isInteger(v))]; })()`), [23, 9, 14, 12, 2, 20, true]);
  const BRp = await build(P2, 'health-expo', 'board', { pdf: true });
  c('the two counts on the handout\'s and the Proposal\'s results line', [BRp.H.followup.rows.length >= 5, (BRp.hl || []).join(' ').includes('23 connected'), BRp.Pz.followup.rows.some(r => r[0] === 'Results' && r[1] === '23 connected · 9 took the next step.')], [true, true, true]);
  const shared = JSON.stringify([BRp.d, BRp.H, BRp.Pz, BRp.hl, BRp.pl]);
  c('no made-up name, phone or note in the deck, the handout, the Proposal or what their PDFs draw', [...NAMES, '215-555', 'Ruth Sample'].filter(n => shared.includes(n)), []);
  P2.E(UNSTUB);
  c('without the Connections list (C2 absent): zeros, no results row', [P2.J(`fuCounts('health-expo').connected`), (await build(P2, 'health-expo', 'board')).d.slides.find(s => s.part === 'after').rows.some(r => r[0] === 'So far')], [0, false]);

  console.log('\n-- T-F6 a member\'s copy (the deck as present.mjs keeps it: no "part") --');
  const strip = R => ({ ...R.d, slides: R.d.slides.map(s => { const { part, ...o } = s; return o; }) });
  const mc = (Q, d) => Q.J(`caseHandout(null,${JSON.stringify(d)},{})`);
  const Hf = mc(P2, strip(F)), costRows = F.d.slides.find(s => s.type === 'ask' && !s.part).rows;
  c('the finance deck: the budget rows are its cost slide\'s, never the After slide\'s', Hf.budgetRows, costRows.map(r => r.map(String)));
  c('…and the After slide is the Follow-up plan (every row, the headline)', [Hf.followup.title, Hf.followup.head, Hf.followup.rows], [slide(F, 'after').kicker, slide(F, 'after').headline, slide(F, 'after').rows]);
  const Hc = mc(P2, strip(CG));
  c('the whole church: the After slide is not its ask', [Hc.budgetRows || null, Hc.askText, !!Hc.followup], [null, '', true]);
  const TF = await build(P2, 'backpack-giveaway', 'community', { timing: 'fixed' });
  const Ht = mc(P2, strip(TF));
  c('a team deck with fixed dates: no decide slide is read from it', [Ht.timing || null, Ht.followup.rows[0][0]], [null, 'Next step']);

  console.log('\n-- T-F7 the handout\'s Follow-up plan --');
  const Bp = await build(P2, 'health-expo', 'board', { pdf: true });
  c('the pastor\'s handout: title, next step with its label, the timeline, the list (Church Manual p. 91), the promise',
    [Bp.H.followup.title, Bp.H.followup.rows.map(r => r[0]), Bp.H.followup.rows[0][1], /\(Church Manual p\. 91\)/.test(Bp.H.followup.rows[4][1]), /Names stay private/.test(Bp.H.followup.note)],
    ['Follow-up plan', ['Next step', 'Within 48 hours', 'Within 2 weeks', 'A visit', 'The list'], 'Monthly blood pressure and wellness check (ongoing)', true, true]);   // v10.43 (review, 1 Oct 2026): "(ongoing)", lower case
  c('the invitation names the next step: "An invitation to the monthly blood pressure and wellness check, for those who asked."', Bp.H.followup.rows[2][1], 'An invitation to the monthly blood pressure and wellness check, for those who asked.');
  const up = s => s.toUpperCase();
  const iT = Bp.hl.findIndex(l => l === up('The date')), iF = Bp.hl.findIndex(l => l === up('Follow-up plan')), iA = Bp.hl.findIndex(l => l === up('The appeal'));
  c('drawn after the timing and before the appeal', [iT >= 0, iF > iT, iA > iF], [true, true, true]);
  c('two pages', Bp.hp, 2);
  const tight = P2.J(`(()=>{ const m=caseModel('health-expo',{type:'board',group:'board'},{timing:'options'}), d=caseDeck(m), H=caseHandout(m,d,{}); const doc=casePdfDocAt(H,{jsPDF:window.jspdf.jsPDF},2); return (doc.__caseLog||[]).map(l=>l.t).join(' '); })()`);
  c('at the tighter levels: three lines ("Follow-up: a thank-you within 48 hours · …", "The list: private…")', [/Follow-up: a thank-you within 48 hours/.test(tight), /The list: private, with the interest coordinator/.test(tight)], [true, true]);
  const Ees = await build(Pes, 'backpack-giveaway', 'board', { pdf: true });
  c('Spanish, a children\'s idea: "Plan de seguimiento", "Una invitación al club…", "Nunca guardamos nombres de niños."',
    [Ees.H.followup.title, /^Una invitación al /.test(Ees.H.followup.rows[2][1]), /Nunca guardamos nombres de niños\./.test(Ees.H.followup.note), Ees.hp], ['Plan de seguimiento', true, true, 2]);
  const twoPages = [];
  for (const id of all) { if (NOCARD_BUILTIN.includes(id)) continue; for (const [Q, g] of [[P2, 'board'], [Pes, 'community']]) { const R = await build(Q, id, g, { pdf: true }); if (R.hp > 2) twoPages.push(id + '/' + g + ':' + R.hp); } }
  c('every event and series handout stays two pages (30 built-ins × the board EN, Community Services ES)', twoPages, []);

  console.log('\n-- T-F8 the Proposal\'s Follow-up plan and the motion\'s clause --');
  c('the section after THE PLAN: next step, timeline, the list, privacy', [Bp.Pz.followup.head, Bp.Pz.followup.rows.map(r => r[0])], ['Follow-up plan', ['Next step', 'Timeline', 'The list', 'Privacy']]);
  const pj = Bp.pl.join(' ');
  c('drawn right after THE PLAN, before the budget', [pj.indexOf('THE PLAN') < pj.indexOf('FOLLOW-UP PLAN'), pj.indexOf('FOLLOW-UP PLAN') < pj.indexOf('BUDGET')], [true, true]);
  c('one or two pages', Bp.pp <= 2, true);
  c('the motion: "…the team sets the date …; with the follow-up plan: an invitation to the monthly blood pressure and wellness check within two weeks, for those who ask; with a written report at the review."',
    / reports it to the board; with the follow-up plan \(an invitation to the monthly blood pressure and wellness check within two weeks, for those who ask\); with a written report at the review\.$/.test(Bp.Pz.motion), true);
  c('…drawn twice (the motion, and beside Action taken)', (pj.replace(/\s+/g, ' ').match(/with the follow-up plan/g) || []).length, 2);
  P2.E(`fuSet('health-expo',{id:'cooking-school',n:'',ne:''})`);
  const Bk = await build(P2, 'health-expo', 'board');
  // v10.43 (review, 1 Oct 2026): the clause in brackets ("…with the follow-up plan (an invitation to … within two weeks, for those who ask)")
  c('his pick names the cooking school: "an invitation to the plant-based cooking school"', /with the follow-up plan \(an invitation to the [a-z-]+ cooking school within two weeks/i.test(Bk.Pz.motion), true);
  const Tm = await build(P2, 'backpack-giveaway', 'community'), Fi = await build(P2, 'health-expo', 'finance');
  // v10.43 (review, 1 Oct 2026): a team's reads "with a named coordinator and the follow-up plan (…)" (it read "…, with a named coordinator, with the follow-up plan: …")
  c('a team: "…with a named coordinator and the follow-up plan (…), and …"; the finance committee after a comma', [/, with a named coordinator and the follow-up plan \(an invitation to the weekly homework club within two weeks, for those who ask\), and /.test(Tm.Pz.motion), /, with the follow-up plan \(an invitation to /.test(Fi.Pz.motion)], [true, true]);
  const Ees2 = await build(Pes, 'backpack-giveaway', 'board');
  c('Spanish: "; con el plan de seguimiento: una invitación al club … en un plazo de dos semanas, para quienes la pidan" (never "a el")',
    [/; con el plan de seguimiento \(una invitación al club .* en un plazo de dos semanas, para quienes la pidan\);/.test(Ees2.Pz.motion), / a el /.test(Ees2.Pz.motion)], [true, false]);
  const In = await build(P2, pick.inR, 'board'), On = await build(P2, 'food-pantry', 'board');
  c('no clause where there is no follow-up plan (in-reach, ongoing)', [/follow-up plan/.test(In.Pz.motion), /follow-up plan/.test(On.Pz.motion), !!In.Pz.followup, !!On.Pz.followup], [false, false, false, false]);
  P2.E(`fuSet('health-expo',null)`);

  console.log('\n-- T-F10 step 3: one "After the day" card (C1.9, D6) --');
  P2.E(`openTool('survey'); render(); openTool('case'); caseMount(true); caseChooseGroup('board'); caseChoose('health-expo');`);
  await until(() => P2.q('#cs-fu:not([hidden])')); await sleep(40);
  // v10.51.0: the Proposal to vote on now sits after the room (#cs-pz), and step 3 has no "How it is being decided" (the pastor: "I don't
  // think that even needs to be there"): the card comes after the proposal, before What to say
  c('one card #cs-fu, after the proposal, before What to say', [P2.qa('#cs-fu').length, P2.q('#cs-fu').previousElementSibling.id, P2.q('#cs-fu').nextElementSibling.matches('details.cs-say')], [1, 'cs-pz', true]);
  // v10.43 (integration): C2 is in the page now, so the card row is there ("it should host the connection cards"); hiding its
  // cnOpenMaker shows the row is drawn only with C2.
  c('"After the day", the next step and why, the timeline; the card row with C2 in the page', [P2.txt('#cs-fu h4'), P2.txt('#cs-fu [data-fu-name]'), P2.txt('#cs-fu .cs-fuwhy'), P2.txt('#cs-fu .cs-futl'), !!P2.q('#cs-fu [data-fu-card]'), P2.txt('#cs-fu [data-fu-make]')],
    ['After the day', 'Monthly blood pressure and wellness check', 'Suggested: it fits this idea, and your church can staff it.', 'A thank-you within 48 hours · an invitation within 2 weeks, if they asked · a visit only if they ask', true, 'Make the connection card']);
  P2.E(`window.__cnOM=window.cnOpenMaker; window.cnOpenMaker=undefined; caseDraw3();`); await sleep(30);
  c('…no card row without C2', !!P2.q('#cs-fu [data-fu-card]'), false);
  P2.E(`window.cnOpenMaker=window.__cnOM; caseDraw3();`); await sleep(30);
  P2.E(`window.cnOpenMaker=x=>{ window.__made=x.id; }; window.cnOpenList=x=>{ window.__list=x.id; }; window.cnEligible=x=>fuApplies(x)&&!x.plan&&entitled('connect'); caseDraw3();`); await sleep(30);
  c('with C2: "Make the connection card" and its line; it calls cnOpenMaker(x)', [P2.txt('#cs-fu [data-fu-make]'), P2.txt('#cs-fu [data-fu-card] .note')], ['Make the connection card', 'People scan it on the day and tell you what they’d like.']);
  P2.q('#cs-fu [data-fu-make]').click(); c('…', P2.E('window.__made'), 'health-expo');
  P2.E(STUB + ' caseDraw3();'); await sleep(30);
  c('once made: "Connection card", "So far: 23 connected · 9 took the next step · 2 due today", "Open the list"',
    [P2.txt('#cs-fu [data-fu-make]'), P2.txt('#cs-fu .cs-fuso'), P2.txt('#cs-fu [data-fu-list]'), !!P2.q('#cs-fu .cs-fudue')], ['Connection card', P2.txt('#cs-fu .cs-fuso'), 'Open the list', P2.J(`fuCounts('health-expo').due`) > 0]);
  c('…the So far line counts (23, 9)', /^So far: 23 connected · 9 took the next step/.test(P2.txt('#cs-fu .cs-fuso')), true);
  P2.q('#cs-fu [data-fu-list]').click(); c('"Open the list" calls cnOpenList(x)', P2.E('window.__list'), 'health-expo');
  P2.E(`window.__fc=FEATURES.connect; FEATURES.connect={tier:'full',name:'connection cards',blurb:'A card for your event.'}; window.__ct=currentTier; currentTier=()=>'free'; caseDraw3();`); await sleep(30);
  c('not entitled: the lock in place of the card row', !!P2.q('#cs-fu [data-fu-card] .lock'), true);
  P2.E(`currentTier=window.__ct; if(window.__fc) FEATURES.connect=window.__fc; else delete FEATURES.connect; ${UNSTUB} caseDraw3();`);

  console.log('\n-- T-F4 the picker --');
  P2.q('#cs-fu [data-fu-change]').click(); await sleep(30);
  const radios = P2.qa('#cs-fu input[name="fu-pick"]').map(r => r.value);
  c('up to five candidates, "Or a series" (up to two), "Name your own"', [radios.filter(v => v !== 'own').length >= 3, radios.includes('own'), !!P2.q('#cs-fu .cs-fuor'), radios.includes('cooking-school')], [true, true, true, true]);
  c('the first is the suggestion, checked, with its reason chip', [radios[0], P2.q('#cs-fu input[name="fu-pick"]').checked, P2.txt('#cs-fu .cs-fuchip')], ['bp-clinic', true, 'Fits this idea']);
  P2.q('#cs-fu input[value="cooking-school"]').checked = true; P2.q('#cs-fu [data-fu-save]').click(); await sleep(40);
  c('Save: his pick saved, the card and the slides follow (the After slide names it)', [P2.J(`fuGet('health-expo').next.id`), P2.txt('#cs-fu [data-fu-name]'), P2.J(`CASE_ST.deck.slides.find(s=>s.part==='after').rows[0][1]`)],
    ['cooking-school', P2.E(`caseMinName(SIGNATURE.find(z=>z.id==='cooking-school'))`), P2.E(`caseMinName(SIGNATURE.find(z=>z.id==='cooking-school'))`)]);
  c('his own choice: no "Suggested" line', P2.q('#cs-fu .cs-fuwhy'), null);
  P2.q('#cs-fu [data-fu-change]').click(); await sleep(30);
  P2.q('#cs-fu input[value="own"]').checked = true; P2.q('#cs-fu [data-fu-own]').value = 'see https://x.org'; P2.q('#cs-fu [data-fu-save]').click(); await sleep(20);
  c('his own words with a link are refused, and it says so', [P2.J(`fuGet('health-expo').next.id`), P2.txt('#cs-fu [data-fu-msg]')], ['cooking-school', 'Please write a name of 60 characters or fewer, with no web address.']);
  P2.q('#cs-fu [data-fu-own]').value = 'Our monthly family night'; P2.q('#cs-fu [data-fu-save]').click(); await sleep(40);
  c('…his own words saved', P2.J(`fuGet('health-expo').next`), { own: 'Our monthly family night' });
  P2.q('#cs-fu [data-fu-change]').click(); await sleep(30);
  P2.q('#cs-fu [data-fu-reset]').click(); await sleep(40);
  c('"Use the suggestion": back to the suggestion, nothing stored', [P2.J(`fuGet('health-expo')`), P2.txt('#cs-fu [data-fu-name]')], [null, 'Monthly blood pressure and wellness check']);
  P2.q('#cs-fu [data-fu-change]').click(); await sleep(20); P2.q('#cs-fu [data-fu-cancel]').click(); await sleep(20);
  c('Cancel closes it', P2.q('#cs-fu [data-fu-pick]').hidden, true);
  P2.E(`caseChoose('food-pantry')`); await sleep(40);
  c('an ongoing idea: no card', P2.q('#cs-fu').hidden, true);
  P2.E(`uChurch().plan={date:'2027-04-03',nights:12,perweek:4,kind:'both',workers:20,leaders:6,seats:120,budget:6000}; caseChooseGroup('conference'); caseChoose(CASE_PLAN_ID,{plan:true});`); await until(() => P2.q('#cs-fu:not([hidden])')); await sleep(30);
  c('his Planner series: "Your record book keeps this series\' people." with its button', [P2.txt('#cs-fu [data-fu-card] .note'), P2.txt('#cs-fu [data-fu-book]')], ['Your record book keeps this series’ people.', 'Open the record book']);
  c('no page errors', [...P.errs, ...P2.errs, ...Pes.errs].filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
  H.done();
})();
