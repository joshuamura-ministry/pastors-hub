/* v10.43 — A SLIDE SHOWS EVERY WORD ITS DECK WROTE (the integrator's suite; found in the samples).
 *
 * The pastor's rule since v10.42 part 3: "everything has to line up with what was chosen", and every slide fits 360 × 640 EN + ES.
 * The samples of the average church showed the Spanish "Quiénes pueden" slide ending mid-word: "…todavía ninguno entre quienes
 * tienen dones para esta obra: a" — the deck's sentence is "…para esta obra: acompañe y capacite." (139 characters), and the
 * renderer kept only the first 120 of a slide's "lead" line (tdS(s.lead,120)); v10.42.1 cut it the same way ("…esta obra:").
 * English (105 characters) was whole. Now the line keeps up to 200 (the slide fits: the Chrome sweep, 360 × 640, EN + ES).
 * Held here for the decks of the average church: every headline, kicker, label, lead, row and item the deck writes is on its
 * rendered slide, whole.
 */
const H = require('./v43-helpers.js');
const { c, page, ready, T } = H;
const IDS = [...H.BUILTIN_EVENTS, ...Object.keys(H.BUILTIN_SERIES), 'food-pantry', 'homework-club', 'bp-clinic', 'walking-club'];

(async () => {
  for (const lang of ['en', 'es']) {
    const P = await ready(page('followup', lang));
    if (lang === 'es') {
      const r = P.J(`(()=>{ const m=caseModel('health-expo',{type:'board',group:'board'},{timing:'options'}); const d=caseDeck(m); const i=d.slides.findIndex(s=>s.type==='ability');
        const h=document.createElement('div'); document.body.appendChild(h); const ctl=tdeckRender(d,h,{mode:'browse'});
        const b=h.querySelectorAll('.td-slide')[i].querySelector('.td-note b'); const t=b?b.textContent:''; ctl.destroy(); h.remove(); return [d.slides[i].lead,t]; })()`);
      c('the Spanish "Quiénes pueden" slide of the health fair (the board) shows its whole sentence: "…para esta obra: acompañe y capacite."',
        [/acompañe y capacite\.$/.test(r[0]), r[1].replace(/\s+/g, ' ').trim() === r[0].charAt(0).toUpperCase() + r[0].slice(1)], [true, true]);
    }
    const miss = [];
    for (const id of IDS) for (const g of ['board', 'community', 'congregation']) {
      miss.push(...P.J(`(()=>{ const G=CASE_GROUPS.find(x=>x.id===${JSON.stringify(g)}); const m=caseModel(${JSON.stringify(id)},{type:G.type,group:G.id},{timing:'options'}); if(!m.ok) return [];
        const d=caseDeck(m); const h=document.createElement('div'); document.body.appendChild(h); const ctl=tdeckRender(d,h,{mode:'browse'}); const secs=[...h.querySelectorAll('.td-slide')];
        const norm=s=>String(s).replace(/\\s+/g,' ').trim().toLowerCase(); const out=[];
        d.slides.forEach((s,i)=>{ const txt=norm(secs[i]?secs[i].textContent:'');
          const f=[s.lead,s.label,s.headline,s.kicker,...(s.rows||[]).flatMap(r=>Array.isArray(r)?r:[]),...(s.items||[]).filter(t=>typeof t==='string')];
          f.forEach(v=>{ if(typeof v==='string'&&v.trim()&&!txt.includes(norm(v))) out.push(${JSON.stringify(id + '/' + g + '/' + lang)}+' '+s.type+': '+v.slice(0,80)); }); });
        ctl.destroy(); h.remove(); return out; })()`));
    }
    c(`${lang}: every word the decks write is on their slides, whole (${IDS.length} ideas × board, Community Services, the whole church)`, miss.slice(0, 5), []);
    // v10.43 (integration, seen in the samples): step 3's next-step picker read "Before it fits: 1 volunteers needed" and "Antes de que
    // quepa: Se necesitan 1 voluntarios"; one is said as one, and Spanish goes on in lower case after the colon
    { const gaps = P.J(`[...fuPickerHTML(cnItemOf('health-expo')).matchAll(/class="cs-fugap">([^<]*)</g)].map(m=>m[1])`);
      c(`${lang}: the picker's "Before it fits" lines: "1 volunteer needed" / "se necesita 1 voluntario", never "1 volunteers"`,
        [gaps.length > 0, gaps.filter(g => /\b1 (volunteers|leaders)\b|necesitan 1 |: Se /.test(g)), gaps.some(g => lang === 'en' ? /: 1 volunteer needed$/.test(g) : /: se necesita 1 voluntario$/.test(g))], [true, [], true]); }
    c(`${lang}: no page errors`, P.errs.filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
    P.w.close();
  }
  console.log(`\n${T.pass} passed, ${T.fail} failed`);
  process.exit(T.fail ? 1 : 0);
})();
