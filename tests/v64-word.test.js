// v10.64.0 · the Evangelism Planner: where the handbills go (the areas with the most people, a handbill for each kind of neighbor),
// getting the word out (every way, dated back from opening night, "Every church" or "If your church can", the words ready to share),
// and Slide Preach (a button in the Planner, a small link on the main menu). The pastor (9 Oct 2026): "marketing … sending out hand bills
// going door-to-door using Facebook ads … banners in concentrated areas like in the most populated areas where people are walking around
// the most … promoted strongly on all social media outlets from the church … live streaming … creating a video … a promo video with me
// speaking on it … there should be these options out there if the church can"; then "the same map that's in terrain … making sure the
// most concentrated amount of people so that the mail outs are being sent to the right areas not just random and wasting money … hand
// bills can be tailored to different people groups … young families or older people … In this app put a little button that will link
// them to slide Preach". The census areas below are MADE UP. Written failing-first on v10.63.3.
const {sleep,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const CH={lat:40.2048,lon:-75.0996};
const sq=(lat,lon,d)=>[[[lon-d,lat-d],[lon+d,lat-d],[lon+d,lat+d],[lon-d,lat+d],[lon-d,lat-d]]];
const mk=(i,dlat,dlon,dens,m)=>({geoid:'4201710'+i,name:'10'+i+'.0'+i,lat:CH.lat+dlat,lon:CH.lon+dlon,rings:sq(CH.lat+dlat,CH.lon+dlon,0.006),density:dens,dist:Math.hypot(dlat*69,dlon*53),home:i===1,score:10-i,need:5+i,m});
const Z=[
  mk(1,0,0,4200,{pop:5200,hh:2000,kidsShare:18,medAge:41,seniorsAlone:8,limEng:3,foreign:9}),
  mk(2,0.010,0.012,7800,{pop:6100,hh:2300,kidsShare:29,medAge:34,seniorsAlone:6,limEng:4,foreign:12}),
  mk(3,-0.012,0.006,6900,{pop:4800,hh:2100,kidsShare:14,medAge:52,seniorsAlone:15,limEng:2,foreign:6}),
  mk(4,0.006,-0.014,8800,{pop:7300,hh:2700,kidsShare:22,medAge:38,seniorsAlone:9,limEng:12,foreign:24}),
  mk(5,-0.016,-0.010,3100,{pop:3900,hh:1500,kidsShare:20,medAge:44,seniorsAlone:10,limEng:2,foreign:5}),
  mk(6,0.018,0.002,2500,{pop:3300,hh:1300,kidsShare:25,medAge:39,seniorsAlone:7,limEng:1,foreign:4})];
const days=(a,b)=>Math.round((new Date(a)-new Date(b))/864e5);

(async()=>{ await T.sec(async()=>{
  console.log('\n-- getting the word out: every way, dated back from opening night --');
  const P=page({}); await ready(P); P.E("openTool('planner')"); await sleep(120); P.q('#pl-demo').click(); await sleep(200);
  const plan=P.J('uChurch().plan'), D=plan.date+'T12:00:00';
  const rows=P.qa('#pout .pwo-row').map(r=>({n:txt(r.querySelector('.pwo-h b')),tag:txt(r.querySelector('.pwo-tag')),k:r.dataset.k,when:txt(r.querySelector('.pwo-when'))}));
  c('a part of its own after "Where the hall fills from": 9 every church can do, 3 if your church can', [P.txt('#pl-word h2'),P.txt('#pl-word .hint'),rows.length], ['Getting the word out','9 every church can do · 3 if your church can',12]);
  c('…in date order, from the promo video to the series itself', rows.map(r=>r.n), ['A promo video','A Facebook event','Instagram','The church website','The screens and the bulletin','The church’s Google listing','The livestream and YouTube','Banners where people walk','Door to door','Facebook and Instagram ads','A text from every member','During the series']);
  c('…"If your church can": the video, the banners, the ads; the rest every church', rows.filter(r=>r.k==='can').map(r=>r.n), ['A promo video','Banners where people walk','Facebook and Instagram ads']);
  const PR=P.J(`planPromo(uChurch().plan,planTargets(uChurch().plan,planPlace()),planPlace()).rows.map(r=>[r.n,r.at.toISOString()])`);
  const at=n=>days(PR.find(r=>r[0]===n)[1],D);
  c('the dates count back from opening night: the video 10 weeks, the posts 8, the Google listing 4, banners and door to door 3, ads 2, the text 10 days', ['A promo video','A Facebook event','The church’s Google listing','Banners where people walk','Door to door','Facebook and Instagram ads','A text from every member','During the series'].map(at), [-70,-56,-28,-21,-21,-14,-10,0]);
  const live=P.J(`(()=>{ const r=planPromo(uChurch().plan,planTargets(uChurch().plan,planPlace()),planPlace()).rows; const s=r.find(x=>x.n==='The screens and the bulletin'); return [s.at.getDay(),r.find(x=>x.n==='The livestream and YouTube').when]; })()`);
  c('the screens start on a Sabbath; the livestream names the four Sabbaths before opening night', [live[0],live[1].split(', ').length], [6,4]);
  const sabs=live[1].split(', ').map(x=>new Date(x+', '+new Date(D).getFullYear()+' 12:00'));
  c('…each of them a Saturday, the last the day before opening night', [sabs.every(d=>d.getDay()===6),days(sabs[3],D)], [true,-6]);
  c('the video: the pastor or the speaker, 60 to 90 seconds, captions, a short cut for ads', /60 to 90 seconds[\s\S]*captions[\s\S]*15-second version/.test(txt(P.qa('#pout .pwo-row')[0])), true);
  c('door to door: on the door, never in the mailbox; young people only with two adults', /never in the mailbox\.[\s\S]*Young people go only with two adults/.test(txt(P.qa('#pout .pwo-row').find(r=>/Door to door/.test(r.textContent)))), true);

  console.log('\n-- the words ready to share --');
  const W=P.qa('#pout .pword').map(w=>[txt(w.querySelector('b')),txt(w.querySelector('p'))]);
  const day=new Date(D).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  c('three: a post, a text, the livestream announcement', W.map(w=>w[0]), ['A post for Facebook and Instagram','A text from a member','For the livestream']);
  c('…each with the church, the nights, the day spelled out, and the sign-up page to fill in', W.map(w=>[w[1].includes('15 nights')||w[1].includes(', 15 nights'),w[1].includes(day),w[1].includes('[your sign-up page]')||/description below/.test(w[1])]), [[true,true,true],[true,true,true],[true,true,true]]);
  let copied=null; P.E("navigator.clipboard={writeText:async t=>{ window.__copied=t; }}"); P.q('#pout [data-pl-copy="1"]').click(); await sleep(30); copied=P.E('window.__copied');
  c('Copy puts the words on the clipboard and says so', [copied===W[1][1],P.txt('#pout [data-pl-copy="1"]')], [true,'Copied']);

  console.log('\n-- the countdown, the roster, the budget, the printed plan --');
  const items=P.qa('#pout .rail li').map(txt);
  c('the countdown: the series goes up online, the video if you can, door to door three weekends, the ads the last two weeks', [items.some(t=>/the series goes up online/.test(t)&&/the promo video is filmed by/.test(t)),items.some(t=>/^Door to door, three weekends running/.test(t)),items.some(t=>/^If your church can: Facebook and Instagram ads with the promo video/.test(t))], [true,true,true]);
  const role=P.qa('#pout .rrole').find(r=>txt(r.querySelector('b'))==='Media & publicity');
  c('a Media & publicity person on the roster (not a core role: a small church may combine it)', [!!role,role&&role.classList.contains('core')], [true,false]);
  c('the budget names the banners, the video and the ads', P.qa('#pout .bud li').map(txt).some(t=>/banners and yard signs, and the promo video and social ads, if the church can/.test(t)), true);
  c('the printed plan has Getting the word out', /<h2 class="pg">Getting the word out<\/h2>/.test(P.q('#pout').innerHTML), true);
  c('without a survey, Where the handbills go asks for the church to be mapped first', [P.txt('#pl-mail h2'),/Map your church in the Community Survey/.test(P.txt('#pout'))], ['Where the handbills go',true]);
  c('no page errors', P.errs, []);

  console.log('\n-- where the handbills go: the areas with the most people, a handbill for each --');
  const Q=page({}); await ready(Q); survey(Q); await sleep(150);
  Q.E(`ZONES={all:${JSON.stringify(Z)},scored:${JSON.stringify(Z)},church:${JSON.stringify(CH)},radius:1.8}; ZONES_STATE='ready';`);
  Q.E("openTool('planner')"); await sleep(150); Q.q('#pl-demo').click(); await sleep(250);
  const areas=Q.qa('#pout .pmz').map(a=>[txt(a.querySelector('.pmz-h b')),txt(a.querySelector('.pmz-c b')),Q.w.Array.from(a.querySelectorAll('.pmz-tag')).map(t=>t.dataset.g)]);
  c('the four areas with the most people per square mile, densest first (not the four by need)', areas.map(a=>a[0]), ['Tract 104.04','Tract 102.02','Tract 103.03','Tract 101.01']);
  c('…each with its handbills, one a household', areas.map(a=>a[1]), ['2,700','2,300','2,100','2,000']);
  c('…the total is the territory the whole plan counts', [Q.txt('#pl-mail .hint'),/9,100/.test(Q.txt('#pout .pbench'))], ['9,100 households in 4 areas',true]);
  c('…each area\'s version by its own figures: young families (many children), older neighbors (older, seniors alone), everyone; the language too where it is spoken', areas.map(a=>a[2]), [['everyone','lang'],['families'],['older'],['everyone']]);
  c('the map: the survey\'s, on "Most people", with the four areas numbered', [!!Q.q('#pl-mapbox svg.mapsvg'),Q.qa('#pl-mapbox svg text').filter(t=>/^[1-4]$/.test(t.textContent)).length], [true,4]);
  c('a handbill for each kind of neighbor, with its areas and handbills', Q.qa('#pout .phb').map(v=>[txt(v.querySelector('b')),txt(v.querySelector('.phb-a'))]), [['Young families','Area 2 · 2,300 handbills'],['Older neighbors','Area 3 · 2,100 handbills'],['Everyone','Areas 1, 4 · 4,700 handbills'],['In Spanish','Area 1 · 2,700 handbills']]);
  const sp=Q.q('#pout .psp a');
  c('Slide Preach builds the tracts: a button that opens it in a new tab', [txt(sp),sp.getAttribute('href'),sp.getAttribute('target'),sp.getAttribute('rel')], ['Build a tract in Slide Preach','https://slidepreach.com/','_blank','noopener']);
  c('door to door goes to the four areas on the map', /every door in the four areas on the map above \(9,100 households/.test(txt(Q.qa('#pout .pwo-row').find(r=>/Door to door/.test(r.textContent)))), true);
  c('the printed plan lists the areas and their versions', /<h2 class="pg">Where the handbills go<\/h2>/.test(Q.q('#pout').innerHTML), true);
  c('no page errors', Q.errs, []);

  console.log('\n-- the main menu: a small link to Slide Preach --');
  const H=page({}); await ready(H); H.E('showHub()'); await sleep(40);
  const a=H.q('#hubabout .hubmw a');
  c('under "What Terrain is for": Also from Muraworks, Slide Preach, in a new tab', [H.txt('#hubabout .hubmw'),a.getAttribute('href'),a.getAttribute('target'),a.getAttribute('rel')], ['Also from Muraworks: Slide Preach Sermon slides, Bible studies and tracts.','https://slidepreach.com/','_blank','noopener']);
  const S=page({lang:'es'}); await ready(S); S.E('showHub()'); await sleep(40);
  c('…in Spanish', S.txt('#hubabout .hubmw'), 'También de Muraworks: Slide Preach Diapositivas para sermones, estudios bíblicos y folletos.');
  c('no page errors', [H.errs,S.errs], [[],[]]);
}); T.done(); })();
