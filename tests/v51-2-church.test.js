// v10.51.2 (quick lane) — the pastor (6 Oct 2026), on "Your church" (the Spiritual Gifts landing): "review members in spiritual gifts
// that should be a bright button. It shouldn't look so dull. I can barely even notice it's there and this box here where you check I don't
// think you even need that … current commitments and limits does it need to be there either … cut the fat and only keep that which is
// going to be loadbearing to the process". Written failing-first on v10.51.1.
const fs=require('fs'), path=require('path');
const {ROOT,sleep,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

(async()=>{ await T.sec(async()=>{
  const P=page(); await ready(P); survey(P);
  P.E(`gfChurchOpen()`); await sleep(60);
  const b=P.q('#u-team-link');
  c('"Review members in Spiritual Gifts" is a bright button (the Spiritual Gifts violet), not a ghost', [!!b,b&&b.textContent,b&&b.classList.contains('ghost'),b&&b.classList.contains('u-teamgo')], [true,'Review members in Spiritual Gifts',false,true]);
  c('…its violet is set for both themes', (HTML.match(/--gfv:#[0-9A-F]{6}; --gfv-ink:#[0-9A-F]{6};/g)||[]).length, 2);
  c('…it still opens the members, where it always did', P.E(`(()=>{ document.getElementById('u-team-link').click(); return TOOL; })()`), 'gifts');
  c('no congregation boxes (mixed, one ethnic group, older members…) in the form', P.qa('#u-cap-form [name="who"]').length, 0);
  c('no "Current commitments and limits"', [P.qa('#u-cap-form [name="commitments"]').length,/Current commitments and limits/.test(P.txt('#u-cap-form')||'')], [0,false]);
  P.E(`(()=>{ const ch=uChurch(); ch.capacity={...(ch.capacity||{}),who:{older:true},commitments:'Wednesday prayer meeting'}; uPersist(); CAP=null; capRender(); })()`);   // the form drawn again with them, as a reload would
  P.E(`(()=>{ const f=document.getElementById('u-cap-form'); if(f) f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); })()`); await sleep(40);
  c('a save keeps a church\'s earlier answers stored (unread), as v10.49.0 keeps money', [P.J('uChurch().capacity.who||null'),P.J('uChurch().capacity.commitments||null')], [{older:true},'Wednesday prayer meeting']);
  c('…and the summary no longer shows them', [/Congregation/.test(P.txt('#gf-church')||''),/Already carrying/.test(P.txt('#gf-church')||'')], [false,false]);
}); T.done(); })();
