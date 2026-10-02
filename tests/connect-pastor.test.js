// v10.43.0 · connection cards, the pastor's Connections as rules (CONNECT §6, moved here from the design's cn-pastor.test.mjs,
// 36 checks) + DESIGN D4 (an invitation only to who ticked something about what comes next), D5 (a visit due in 7 days),
// D11 (a first name alone: picks [] is not "asked for more"), D20 (an invitation without a next step on the card), the CSV
// warning (C2.2) and the list drawn from those rules. On the average church's health fair, with made-up responses.
// The pastor: "a thank-you within 48 hours; an invitation to the next step within two weeks; a visit only if they asked".
const {load}=require('./connect-blocks.js');
const T=load(), P=T;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));fail++}else pass++};
try{
const I=(id,n,es,themes)=>({id,builtin:true,themes,ages:'all',minors:false,kids:false,name:{en:n,es},text:n});
const card=JSON.parse(JSON.stringify(T.cnTailor(I('health-expo','Community health fair','Feria de salud comunitaria',['health']),{cadence:'event',next:{name:{en:'Plant-based cooking school',es:'Escuela de cocina a base de plantas'}},church:'Sampleton SDA (SAMPLE)',day:'2026-10-18',lang:'both'})));
card.past={results:{en:'Send me my screening results',es:'Envíenme los resultados de mis pruebas'}};
const at=(day,h=15)=>{ const [y,m,d]=day.split('-').map(Number); return new Date(y,m-1,d,h).getTime(); };
let n=0; const rid=()=>('R'+String(++n).padStart(11,'0'));
const item=(name,picks,reach,o={})=>({rid:rid(),ts:at(o.day||'2026-10-18'),lang:o.lang||'en',name,picks,reach,consent:reach?at('2026-10-18'):null,safe:null,note:o.note||'',cv:1,taken:null});
const ITEMS=[
  item('Ana',['next','recipes'],{t:'phone',v:'(215) 555-0134'},{lang:'es',note:'Mi esposo también quiere venir.'}),
  item('Bill',['prayer'],null,{note:'My knee surgery on the 30th.'}),
  item('Carmen',['next','visit'],{t:'email',v:'carmen@example.org'},{lang:'es'}),
  item('Dee',['recipes'],{t:'email',v:'=HYPERLINK("x")@example.org'}),
  item('Eli',['nothing'],null),
  item('Faye',['results','prayer'],{t:'phone',v:'+1 610 555 0199'},{day:'2026-10-20'}),
  item('Gus',['next'],{t:'phone',v:'215.555.0177'}),
  item('Hana',['visit'],{t:'phone',v:'215-555-0123'})];
let {list,added}=JSON.parse(JSON.stringify(P.cnMerge([],ITEMS,[],[])));
c('eight responses come in, oldest first', [added,list.length,list.map(p=>p.name).join(',')], [8,8,'Ana,Bill,Carmen,Dee,Eli,Gus,Hana,Faye']);
c('each kept a year on this device, with an empty checklist in section 2\'s names', [list.every(p=>p.keep-p.ts===365*864e5),list[0].fu], [true,{thanks:0,invite:0,visit:0,next:0}]);
let again=P.cnMerge(list,ITEMS,[],[]);
c('pulled again: nothing doubled', [again.added,again.list.length], [0,8]);
list[0].fu.thanks=at('2026-10-19');
again=P.cnMerge(list,ITEMS,[ITEMS[1].rid],[ITEMS[2].rid]);
c('a withdrawn response leaves; one this device deleted is not brought back; the checklist stays', [again.removed,again.list.map(p=>p.name).includes('Bill'),again.list.map(p=>p.name).includes('Carmen'),again.list[0].fu.thanks>0], [1,false,true,true]);

console.log('\n-- the checklist and what is due --');
const ck=(name,today,cd)=>P.cnChecklist(list.find(p=>p.name===name),cd||card,today).map(i=>i.k+':'+i.state+(i.due?'@'+i.due:''));
c('Ana (next, recipes; a phone): thank-you by the 20th, invitation by 1 November, came', ck('Ana','2026-10-19'), ['thanks:done@2026-10-20','invite:soon@2026-11-01','next:open']);
c('Bill (prayer only, no contact): nothing to send; "took the next step" still counts', ck('Bill','2026-10-19'), ['next:open']);
c('D5: Hana (a visit): a thank-you and a visit by the 25th (7 days); no invitation (she asked for nothing coming)', ck('Hana','2026-10-25'), ['thanks:late@2026-10-20','visit:today@2026-10-25','next:open']);
c('Faye answered two days after the fair: her thank-you counts from her day', ck('Faye','2026-10-21'), ['thanks:soon@2026-10-22','next:open']);
c('Eli ("Nothing more"): nothing to do', ck('Eli','2026-10-19'), ['next:open']);
c('due on the 20th: four thank-yous (Ana\'s is done; Faye\'s is due on the 22nd)', P.cnDueToday(list,card,'2026-10-20'), {thanks:4,invite:0,visit:0,late:0,total:4});
c('due on 1 November: the three invitations, and the late ones counted', P.cnDueToday(list,card,'2026-11-01'), {thanks:5,invite:3,visit:2,late:7,total:10});
{ const noNext={...card,opts:card.opts.filter(o=>o.k!=='next')};
  c('D20: a card with no next step: no "took the next step", but an invitation is still due to who asked about what comes next', P.cnChecklist(list[0],noNext,'2026-10-19').map(i=>i.k), ['thanks','invite']);
  const p={...list.find(x=>x.name==='Dee'),picks:['news']};
  c('D20: "Tell me about other events" with contact opens an invitation on a card without a next step', P.cnChecklist(p,noNext,'2026-10-19').map(i=>i.k+'@'+i.due), ['thanks@2026-10-20','invite@2026-11-01']);
  c('D20: the invitation without a next step, his to fill in, in both languages', [P.cnMsg('invite',list[0],noNext,'en'),P.cnMsg('invite',list[0],noNext,'es')],
    ['Hello Ana, we’d love to see you at [what] on [day] at [place]. — Sampleton SDA (SAMPLE)','Hola, Ana: nos encantaría verle en [qué] el [día] en [lugar]. — Sampleton SDA (SAMPLE)']); }
c('D4: who asked only for the recipe booklet gets a thank-you and the booklet, never an invitation', ck('Dee','2026-10-19'), ['thanks:soon@2026-10-20','next:open']);

console.log('\n-- counts only --');
list.find(p=>p.name==='Gus').fu.next=at('2026-11-05'); list.find(p=>p.name==='Ana').fu.invite=at('2026-10-25'); list.find(p=>p.name==='Ana').fu.next=at('2026-11-05');
const k=P.cnCounts(list);
c('counts, in the names section 2\'s fuCounts reads', JSON.parse(JSON.stringify(k)), {connected:8,reached:6,askedMore:7,askedNext:3,prayer:2,visitAsked:2,thanked:1,invited:1,visited:0,nextTaken:2});
c('never a name in the counts', /Ana|Bill|Carmen|Gus/.test(JSON.stringify(k)), false);
{ const nia={...list[1],id:'Rnia',name:'Nia',picks:[]};
  c('D11: a first name alone (picks []) is connected, not "asked for more"', [P.cnCounts([nia]).connected,P.cnCounts([nia]).askedMore], [1,0]); }

console.log('\n-- the CSV for the interest coordinator --');
const csv=P.cnCsv(list,card,'en');
const lines=csv.slice(1).split('\r\n');
c('starts with a byte-order mark, CRLF lines, a header and eight rows', [csv.charCodeAt(0),lines.length-1,lines[0].split('","').length], [0xfeff,9,12]);
c('Ana\'s row: event, day, name, phone, language, what she asked (in English), her checklist', lines[1],
  '"Community health fair","2026-10-18","Ana","(215) 555-0134","","Español","Tell me about the plant-based cooking school; Send me the recipe booklet","2026-10-19","2026-10-25","","2026-11-05",""');
c('never the private note', /esposo|knee/.test(csv), false);
c('a cell that could be a formula is made plain text', csv.includes(`"'=HYPERLINK(""x"")@example.org"`));
c('a phone keeps its + (digits only, never a formula)', csv.includes('"+1 610 555 0199"'));
{ const evil=[{...list[0],name:'@SUM(A1)',reach:{t:'phone',v:'-1+2'}},{...list[0],name:'+cmd',reach:null},{...list[0],name:'\tTab',reach:null}];
  const x=P.cnCsv(evil,card,'en');
  c('S17: = + - @ tab: every cell that could start a formula gets an apostrophe, the phone column too unless it reads as a phone number', [x.includes(`"'@SUM(A1)"`),x.includes(`"'+cmd"`),x.includes(`"'\tTab"`),x.includes(`"'-1+2"`)], [true,true,true,true]); }
c('a choice since removed keeps its words', csv.includes('Send me my screening results; I’d like prayer'));
c('Spanish headings when he works in Spanish', P.cnCsv(list,card,'es').includes('"Actividad","Respondió","Nombre"'));
c('file name', P.cnCsvName(card,'2026-10-21'), 'Connections-Community-health-fair-2026-10-21.csv');
c('an abuse card\'s file and rows never name its event', [P.cnCsvName({...card,kind:'abuse'},'2026-10-21'),P.cnCsv(list.slice(0,1),{...card,kind:'abuse'},'en').includes('Community health fair')], ['Connections-2026-10-21.csv',false]);
c('C2.2 / D17: the warning before the download, both languages', [T.CN_UI.en.csvNote,T.CN_UI.es.csvNote],
  ['This file has names and contact details. Give it only to your interest coordinator, and delete it when the follow-up is done.',
   'Este archivo tiene nombres y datos de contacto. Déselo solo a la persona coordinadora de interesados y bórrelo cuando termine el seguimiento.']);

console.log('\n-- messages --');
const ana=list.find(p=>p.name==='Ana'), hana=list.find(p=>p.name==='Hana');
c('the thank-you, in her language', P.cnMsg('thanks',ana,card,'es'), 'Hola, Ana: gracias por venir a Feria de salud comunitaria. Fue un gusto conocerle. Pronto nos comunicaremos con usted sobre lo que pidió. — Sampleton SDA (SAMPLE)');
c('the invitation names the next step', [P.cnMsg('invite',hana,card,'en'),P.cnMsg('invite',ana,card,'es')],
  ['Hello Hana, The plant-based cooking school meets [day and time] at [place]. We’d love to see you there. — Sampleton SDA (SAMPLE)',
   'Hola, Ana: La escuela de cocina a base de plantas se reúne el [día y hora] en [lugar]. Nos encantaría verle allí. — Sampleton SDA (SAMPLE)']);
const h=P.cnHrefs(ana,card,'Hola',"es");
c('call and text links', [h.call,h.text], ['tel:2155550134','sms:2155550134?&body=Hola']);
{ const ab={...card,kind:'abuse',title:{en:'',es:''}};
  const unsafe={...hana,safe:false}, safe={...hana,safe:true};
  c('abuse card, not safe to leave a message: no message at all, call only', [P.cnMsg('thanks',unsafe,ab,'en'),P.cnMsg('invite',unsafe,ab,'en'),Object.keys(P.cnHrefs(unsafe,ab,'x','en'))], ['','',['call']]);
  c('abuse card, safe: a message that never names the event', P.cnMsg('thanks',safe,ab,'en'), 'Hello Hana, this is Sampleton SDA (SAMPLE). Thank you for your card. When would be a good time to talk?'); }

console.log('\n-- a paper card --');
const pc=o=>P.cnPaper({adult:true,name:'Ivy',picks:['next'],reach:'215 555 0100',consent:true,...o},card,at('2026-10-19'));
c('typed in: kept on this device, marked paper', [pc({}).ok,pc({}).person.src,JSON.parse(JSON.stringify(pc({}).person.reach))], [true,'paper',{t:'phone',v:'215 555 0100'}]);
c('the 18+ box not ticked: not entered', pc({adult:false}).err, 'notAdult');
c('no contact for a choice that needs it', pc({reach:''}).err, 'needReach');
c('no consent tick', pc({consent:false}).err, 'needConsent');
c('an email is read as an email', JSON.parse(JSON.stringify(pc({reach:'ivy@example.org'}).person.reach)), {t:'email',v:'ivy@example.org'});
c('prayer only: no contact kept even if written', pc({picks:['prayer'],reach:'215 555 0100'}).person.reach, null);
c('"Nothing more" with something else: he is asked to leave one', pc({picks:['nothing','prayer']}).err, 'bothTicked');
c('D11: a paper card with a first name and nothing ticked is entered', [pc({picks:[],reach:''}).ok,JSON.parse(JSON.stringify(pc({picks:[],reach:''}).person.picks))], [true,[]]);

console.log('\n-- a year on --');
c('a person leaves the device a year after they answered', P.cnPrune(list,at('2027-10-21')).length, 0);
c('…and not before', P.cnPrune(list,at('2027-10-17')).length, 8);

console.log('\n-- the list, drawn from the rules (names stay on his device) --');
{ const html=P.cnListHTML(card,list,'2026-10-20','en');
  const txt=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  c('the strip: counts, then what is due today in amber words', [/8 connected · 1 thanked · 1 invited · 2 took the next step/.test(txt),/Due today: 4 thank-yous/.test(txt)], [true,true]);
  c('each checkbox says whose it is', [...html.matchAll(/aria-label="([^"]*· Ana)"/g)].map(m=>m[1]), ['Thank-you sent · Ana','Invited to the next step · Ana','Took the next step · Ana']);
  c('the private note is folded', /<details class="cn-pnote"><summary>Private note<\/summary><p>Mi esposo también quiere venir\.<\/p><\/details>/.test(html));
  c('tap to call, text or email', [html.includes('href="tel:2155550134"'),html.includes('href="sms:2155550134?&amp;body=')||html.includes('href="sms:2155550134?&body='),html.includes('href="mailto:')], [true,true,true]);
  c('the CSV button with its warning line', html.includes(T.CN_UI.en.csv)&&html.includes(T.CN_UI.en.csvNote));
  c('filters: All · Due · Asked for a visit · Prayer', [...html.matchAll(/data-cn-filter="(\w+)"/g)].map(m=>m[1]), ['all','due','visit','prayer']);
  const due=P.cnListHTML(card,list,'2026-10-20','en',{filter:'visit'});
  c('the "Asked for a visit" filter shows only Carmen and Hana', [...due.matchAll(/<h4>([^<]+)<\/h4>/g)].map(m=>m[1]).sort(), ['Carmen','Hana']);
  const es=P.cnListHTML(card,list,'2026-10-20','es').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  c('in Spanish: "8 en contacto", "dieron el siguiente paso", "Para hoy"', [/8 en contacto/.test(es),/2 dieron el siguiente paso/.test(es),/Para hoy:/.test(es)], [true,true,true]);
  const xss=P.cnListHTML(card,[{...list[0],name:'<img src=x onerror=alert(1)>'}],'2026-10-20','en');
  c('S16: a name with markup is drawn as text', [xss.includes('<img src=x'),xss.includes('&lt;img src=x onerror=alert(1)&gt;')], [false,true]);
  c('no one yet: one plain line', /No one yet\./.test(P.cnListHTML(card,[],'2026-10-20','en')));
  // v10.43 (review, 1 Oct 2026): the contact link is encoded like the Email button, so an address can never add a Bcc or a body
  const bent=P.cnListHTML(card,[{...list[0],reach:{t:'email',v:'a@b.co?bcc=x%40evil.example&body=hi'}}],'2026-10-20','en');
  const hrefs=[...bent.matchAll(/href="(mailto:[^"]*)"/g)].map(m=>m[1].replace(/&amp;/g,'&'));
  c('every mailto: link encodes the address (no bare ? & or = before the subject)', hrefs.length>0&&hrefs.every(h=>/^mailto:[^?&=]*(\?subject=|$)/.test(h)), true); }
c('the paper card refuses an email shaped like a link', ['a@b.co?bcc=x','a@b.co#f','a@b.co/x','a&b@b.co'].map(v=>pc({reach:v}).err), ['badEmail','badEmail','badEmail','badEmail']);
c('…and keeps an ordinary one', pc({reach:'ana.maria+fair@correo-ejemplo.org'}).ok, true);
c('the phone form\'s check (CN_RE_EMAIL) refuses the same shapes and keeps ordinary ones', ['a@b.co?bcc=x','a@b.co#f','a@b.co/x','a&b@b.co','a@b_c.co','ana@example.org','ana.maria+fair@correo-ejemplo.org'].map(v=>T.CN_RE_EMAIL.test(v)), [false,false,false,false,false,true,true]);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
