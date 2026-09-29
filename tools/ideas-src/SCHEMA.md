# Terrain Idea Library: schema

Pastor Joshua Mura asked for "50 different things for prayer that a church can do". The Idea Library has
**42 themes with at least 50 ideas each, in English and Spanish**. Search finds them ("prayer", "prayer ministry",
"oración" each return all 50+). They rank against the census and are checked against the church's capacity like the
97 built-in ministries (`SIGNATURE`), and any of them can be proposed in Make the Case.

Code reference: pristine v10.39.0 `index.html` (line numbers below refer to it).

## Files

| File | What it is |
|---|---|
| `themes.json` | The 42 themes in display order: id, EN/ES names, scope, what belongs elsewhere, search synonyms, related census tags |
| `themes/<themeId>.json` | `{"theme":"<id>","ideas":[…]}`: one file per theme, 50+ ideas |
| `examples.json` | Three finished prayer ideas (tier 1, 2 and 3). The validator runs idea checks only on this file |
| `vocab.json` | A snapshot of the app's real vocabularies: 43 `profile()` tags, 13 skills, 13 facilities, 38 RULES ids, and 97 SIGNATURE ids with EN/ES names. Rebuild it with `node validate.mjs --vocab <index.html>` |
| `validate.mjs` | The validator (see the end of this file) |
| `selftest.mjs` | 63 cases showing each rule fires, and does not misfire, in both languages. Run `node selftest.mjs` |
| `WRITERS.md` | The quality bar, the pastor's own words, and the rules for children, safety and "go where people are" |

## Theme ids (in order)

prayer, hunger, homeless, children, youth, young-adults, seniors, families, marriage, single-parents, health,
mental-health, addiction, grief, immigrants, jobs-money, education, prison, veterans, disability, women, men,
personal-evangelism, public-evangelism, hospitality, neighbors, music-arts, sports-outdoors, clothing-practical,
disaster-relief, creation-care, media, literature, schools, first-responders, foster-care, abuse-survivors,
transport, holidays, small-groups, sabbath-rest, workplaces

These are the 42 themes of the brief, kept as given. Changes, with reasons:
- Ids use US spelling (`neighbors`), because the app's English is American ("neighborhood", "program").
- `disaster-relief`, not `disaster`: `disaster` is already a SIGNATURE ministry id, and the two must not be confused in code.
- The English theme names follow the brief word for word. Only the Spanish names are new.
- Every theme has a `not` list of `[what, themeId]` pairs. It says where an overlapping idea goes, so an idea lives in
  one theme and is cross-listed elsewhere with `also`. For example, prayer for the grieving goes in `grief` with
  `also:["prayer"]`, and prayer ads stay in `prayer` with `also:["media"]`.
- No synonym belongs to two themes (the validator enforces this), so a search word never opens the wrong theme.
  "asilo" means asylum (`immigrants`), not a nursing home. "campamento" means camping (`sports-outdoors`).
  "nextdoor" goes to `neighbors`. "steps to christ" and "camino a cristo" go to `literature`.
- `media` needs 35 digital ideas instead of 12 (`digitalMin`), as the brief asks ("more in Media & online").

`themes.json` shape: `{"version":1,"themes":[{"id","en","es","scope","not":[[what,themeId]…],"syn":{"en":[…],"es":[…]},"tags":[profile tags],"digitalMin"?}]}`.

## One idea

The shape is compact: about 2.2 KB per idea with both languages. That is about 4.6 MB raw for 2,100 ideas, so see
"Loading" below.

```json
{"id":"prayer-door-cards-mile","theme":"prayer","also":["neighbors"],
 "tier":1,"k":"serve","ages":"all","where":"streets","sabbath":true,"minors":false,
 "need":["settled","changing","growing","homeowners","renters"],"boost":["car-dependent","seniors-alone"],
 "ppl":2,"leaders":0,"hrs":3,"cost":60,"costMo":5,"skill":[],"partner":null,
 "en":{"n":"…","d":"…","how":["…","…","…","…"]},
 "es":{"n":"…","d":"…","how":["…","…","…","…"]}}
```

| Field | Type / values | Rule | Meaning |
|---|---|---|---|
| `id` | `<theme>-<slug>` | lowercase a-z 0-9 and hyphens, ≤ 64 characters, unique across the library; **never a SIGNATURE id** and never starting with `draft-` or `sg-` | Stable key. The app keys `CASE_BRIDGE`, `MOVE_REQ`, `HOW`, `MOVE_LOAD`, `U_FAC_REQ` and `U_OUTDOOR` by id, so a collision (for example `prayer-box`) would silently borrow a built-in's data |
| `theme` | theme id | must equal the file's theme | Home theme |
| `also` | 1–3 theme ids | optional; leave it out when empty | Cross-listing for search and browsing |
| `tier` | 1, 2 or 3 | see the tier limits below | Size: 1 = one person or a few, this week, little or no money; 2 = a small team, about a month; 3 = a programme with a budget line or a partner |
| `k` | serve, equip, belong, invite | each theme needs all four, none above 45% | The Serve → Equip → Belong → Invite arc (`KIND`, line 3256) |
| `ages` | all, children, youth, adults, seniors, families | children or youth ⇒ `minors:true` | Who it is for |
| `where` | church, streets, homes, online, schools, parks, community, workplaces | each theme needs ≥ 4 different values | Where neighbors meet it. `homes` = at people's doors or in homes (a member's or a neighbor's). `community` = public places used with the owner's or town's permission (library, market, laundromat, station, local events) |
| `sabbath` | boolean | | Fits Sabbath hours by Adventist practice. Yes: worship, prayer, visiting, nature, mercy. No: buying and selling, fundraising, secular work, sports competition |
| `minors` | boolean | true ⇒ `skill` includes `kids`, and both `how` lists mention screening | Involves under-18s. Needs screened adults and the two-adult rule |
| `need` | 1–6 `profile()` tags | at least one is required | The census tags that make this idea fit a place (`signatureMoves` gate, line 16769). **Order matters:** the first tag found in the tract writes the "Why here" sentence. Put the most specific tag first |
| `boost` | 0–4 `profile()` tags | | Tags that raise its rank in the library view. The app stores `boost` on SIGNATURE but does not read it; the library ranking below does |
| `ppl` | integer 1–40 | | The smallest team that can honestly run it (`uReq` people) |
| `leaders` | integer 0–6, ≤ ppl | | People who must own it (`uCheck` checks this against the church's free leaders) |
| `hrs` | integer 1–80 | | Hours per volunteer per month |
| `cost` | integer USD 0–50,000 | | Start-up cost |
| `costMo` | integer USD 0–10,000 | | Monthly running cost |
| `skill` | 0–4 of: lead, medical, teach, kids, cook, music, lang, trade, vehicle, weekday, admin, av, support | `U_SKILLS` (line 16604) = `CAP_SKILLS` plus `av` and `support` | Skills the church must have. `uCheck` reports a gap for each one missing |
| `partner` | `null` or `{"en","es"}` (3–120 characters each) | tier 3 needs a partner, or `cost` ≥ 300, or `costMo` ≥ 100 | The outside partner (becomes `p`) |
| `st` | open, trust, deeper, decide | **optional** (added, see below) | The four-stage arc (`STAGE`, line 3560) |
| `fac` | 1–3 strings such as `"kitchen"` or `"classrooms\|center"` | **optional** (added, see below). Keys: kitchen, classrooms, gym, field, center, parking, stage, av, nursery, library, vehicle, grounds, home | Facilities the idea needs; `\|` separates alternatives |
| `en`, `es` | `{"n","d","how"}` | `n` 6–60 characters, no final full stop. `d` 100–420 characters, 2–3 sentences. `how` exactly 4 steps of 20–140 characters. The ES text must be translated, not copied | Name, what it is and why it works, and the first four steps. Spanish is natural Latin-American Spanish and addresses the reader as usted |

Tier limits (they keep sizes honest, and the capacity check depends on these numbers):

| Tier | ppl | leaders | hrs | cost | costMo |
|---|---|---|---|---|---|
| 1 | 1–4 | 0–1 | 1–10 | ≤ $150 | ≤ $50 |
| 2 | 2–12 | 1–3 | 1–24 | ≤ $1,500 | ≤ $300 |
| 3 | 3–40 | 1–6 | 1–60 | ≤ $50,000 | ≤ $10,000, and a partner or cost ≥ $300 or costMo ≥ $100 |

### Changes from the brief that the code requires

1. **`tier` means size here, but in SIGNATURE it means shelf.** SIGNATURE's `tier` is 1 for "The proven playbook"
   and 2 for "Creative extras" (`tierOf`, line 3615). The field is still called `tier` in these files, as briefed,
   but **the loader must not copy it across.** It is stored as `size` (below), and every library idea goes on the
   "Creative extras" shelf (`tier:2`).
2. **`need` must have at least one tag.** `signatureMoves` shows only ideas whose `need` meets a tract tag, and
   `uEvidence` treats an idea as backed by evidence only when a need tag is present *and* the reason contains a
   figure. With an empty `need`, an idea could never pass `uCheck`. For ideas that fit anywhere (most prayer ideas),
   use `settled`, `changing` and `growing` together: whenever trend data exists, `profile()` always emits exactly
   one of the three. Add an ordinary tag or two as well, for places without trend data.
3. **`minors:true` needs the `kids` skill.** Make the Case chooses its risk table with `caseDraftKind()` (line 19705),
   which reads skills first: `kids` selects the `children` table (screening, two-adult rule, consent).
4. **Optional `fac`.** `uCheck` checks each facility group against the church profile. Without `fac`, the loader
   guesses from `where` (below). That guess cannot see that a cooking class needs a kitchen or a van ride needs a
   vehicle.
5. **Optional `st`.** `signatureMoves` sets `stage: x.st||'trust'`. The loader derives it from `k`; use `st` only
   when that guess is wrong (for example an Invite idea that is `decide`).
6. **Money and hours are whole numbers, and there are no extra fields.** `uReq` scales these numbers, and unknown
   fields fail validation so typos cannot slip through.
7. **Ids must not collide with built-in ids** (see `id` above).

## How a library idea becomes a first-class ministry

The app already treats `uCatalog()` items (SIGNATURE plus AI drafts) as ministries. A library idea joins through
one adapter. **Do not put all 2,100 in `uCatalog()`.** Make the Case runs `uCheck` on every catalogue item
(line 19910), and its picker lists them all. Instead:
- The **library view** searches and ranks the whole library itself.
- When the pastor presses "Add to our list" or "Build proposal" on an idea, its raw JSON is saved with the church
  (`uChurch().lib = {id: rawIdea}`, about 2 KB each). The snapshot keeps working offline and across library updates.
- `uCatalog()` becomes `[...SIGNATURE, ...drafts, ...Object.values(uChurch().lib||{}).map(libToCatalog)]` (memoize by id).

### Field mapping (library → SIGNATURE shape)

| SIGNATURE field | From the library | Why |
|---|---|---|
| `id` | `id` | |
| `lib` | `true` | Marks it as a library idea for renderers and `caseMinName` |
| `tier` | `2` | "Creative extras" shelf (`tierOf`) |
| `size` | library `tier` | Keeps 1/2/3 for filters |
| `k` | `KIND[k]` (for example `'Serve'`) | `U_CAT` filter and Make the Case compare with `KIND` values |
| `st` | `st` ?? {serve:'open', equip:'trust', belong:'trust', invite:'deeper'}[k] | `signatureMoves` stage |
| `n`, `d`, `how` | `en.n`, `en.d`, `en.how` | Keep English as the key, as SIGNATURE does. Spanish is supplied as below |
| `nEs`, `dEs`, `howEs` | `es.n`, `es.d`, `es.how` | Make the Case (`caseMinName`) and Spanish rendering |
| `need`, `boost` | same | `signatureMoves`, `caseBridgeOf` → `CASE_TAG_NEEDS` |
| `w` | `6 + {1:2, 2:1, 3:0}[tier]` | `fit = w + hits·2 + (fits ? 10 : 0)`. Built-ins use 8–12, so proven ministries stay ahead in the shared list |
| `load` | `{1:0, 2:1, 3:2}[tier]` | `BANDS`: light, moderate or heavy lift (`bandOf`) |
| `ppl`, `cost`, `skill` | `ppl`; `cost` as 0/1/2 = `cost===0&&costMo===0 ? 0 : tier<3 ? 1 : 2`; `skill` | Only for code that reads them directly. `requirements` below is what `uReq` uses |
| `c` | tier 1 `EFFORT.solo`; tier 2 `EFFORT.team`; tier 3 `partner ? EFFORT.partner : EFFORT.budget` | Card line |
| `p` | `partner ? partner[LANG] : 'None needed'` | Card line |
| `why` | `libWhy(x)` (below) | `uEvidence` requires `why(m,tags)` to return a sentence with a figure |
| `requirements` | built below | `uReq` uses `x.requirements` whenever it is present, so `uBase`'s id regexes never run on library ids (for example `grief-…` would otherwise gain `support`, and `…-meal` would gain `cook` and a kitchen) |
| `sabbath`, `minors`, `ages`, `where`, `theme`, `also` | same | Filters and badges |

```js
const LIB_FAC_BY_WHERE={church:[['classrooms','center','stage','kitchen','library']],streets:[],homes:[],online:[],
  schools:[],parks:[],community:[],workplaces:[]};
function libToCatalog(L){
  const lang=(typeof LANG==='string'&&LANG==='es')?'es':'en';
  const x={id:L.id,lib:true,tier:2,size:L.tier,k:KIND[L.k],st:L.st||{serve:'open',equip:'trust',belong:'trust',invite:'deeper'}[L.k],
    n:L.en.n,d:L.en.d,how:L.en.how,nEs:L.es.n,dEs:L.es.d,howEs:L.es.how,
    need:L.need,boost:L.boost,w:6+({1:2,2:1,3:0})[L.tier],load:({1:0,2:1,3:2})[L.tier],
    ppl:L.ppl,cost:(L.cost===0&&L.costMo===0)?0:L.tier<3?1:2,skill:L.skill,
    c:L.tier===1?EFFORT.solo:L.tier===2?EFFORT.team:(L.partner?EFFORT.partner:EFFORT.budget),
    p:L.partner?L.partner[lang]:'None needed',partner:L.partner,
    theme:L.theme,also:L.also||[],ages:L.ages,where:L.where,sabbath:L.sabbath,minors:L.minors};
  x.why=libWhy(x);
  const facilities=L.fac?L.fac.map(g=>g.split('|')):LIB_FAC_BY_WHERE[L.where];
  const sessions=L.tier===1?1:2, sessionHours=Math.max(.5,Math.round(L.hrs/sessions*2)/2);
  const participants=L.tier===1?8:L.tier===2?16:40;
  x.requirements={people:L.ppl,leaders:L.leaders,skills:[...L.skill],facilities,participants,sessions,sessionHours,
    setupHours:L.ppl*L.tier,followupHours:L.leaders||1,weeks:L.tier===3?8:6,slot:'',start:'',owner:'',
    lines:[{name:'Start-up (library estimate)',startup:L.cost,monthly:0},{name:'Running costs (library estimate)',startup:0,monthly:L.costMo}]
      .filter(l=>l.startup||l.monthly),
    campaign:false,reviewed:true,source:'Idea Library planning estimate; replace with local quotes.'};
  if(!x.requirements.lines.length) x.requirements.lines=[{name:'Supplies already on hand, confirm locally',startup:0,monthly:0}];
  return x;
}
```

`uReq` then works out `hours = people × sessions × sessionHours + followupHours`, which is roughly `ppl × hrs`. It
reports `startup = cost` and `monthly = costMo`, scaled when the pastor changes the number of people served in
"Adjust scope & costs".

### "Why here" without a hand-written function

`uEvidence` is valid when a need tag is present and `why(m,tags)` returns text containing a digit. `libWhy` takes
the first need tag present in the tract, in the order the writer gave them. It uses that tag's RULES evidence where
the rule fires (the same sentence the report shows, in English or Spanish). Otherwise it uses a one-line figure for
the tag, so every one of the 43 tags yields a sentence with a number:

```js
function libWhy(x){ return (m,tags)=>{
  const es=LANG==='es';
  for(const t of x.need||[]){ if(!tags||!tags.has(t)) continue;
    for(const id of CASE_TAG_NEEDS[t]||[]){ const r=RULES.find(r=>r.id===id);
      try{ if(r&&r.on(m)){ const ev=(es&&RULES_ES[id]?RULES_ES[id].ev:r.ev)(m); if(/\d/.test(ev)&&!ev.includes('—')) return ev; } }catch(e){} }
    try{ const f=LIB_TAG_EV[t]; if(f){ const s=f[es?1:0](m); if(/\d/.test(s)&&!s.includes('—')) return s; } }catch(e){}   // '—' = fmtPct of a missing figure
  }
  return ''; }; }
const P=fmtPct, yrs=v=>Math.round(v);
const LIB_TAG_EV={
 'families':[m=>`${P(m.kidsShare)} of residents here are children.`,m=>`El ${P(m.kidsShare)} de los residentes son niños.`],
 'many-kids':[m=>`${P(m.kidsShare)} of residents here are children.`,m=>`El ${P(m.kidsShare)} de los residentes son niños.`],
 'family-heavy':[m=>`${P(m.famWithKids)} of families here are raising children.`,m=>`El ${P(m.famWithKids)} de las familias está criando hijos.`],
 'single-parents':[m=>`${P(m.singleParent)} of families with children have one parent at home.`,m=>`El ${P(m.singleParent)} de las familias con hijos tiene un solo padre o madre en casa.`],
 'young':[m=>`The median age here is ${yrs(m.medAge)}.`,m=>`La edad mediana aquí es de ${yrs(m.medAge)} años.`],
 'older':[m=>`The median age here is ${yrs(m.medAge)}.`,m=>`La edad mediana aquí es de ${yrs(m.medAge)} años.`],
 'very-old':[m=>`The median age here is ${yrs(m.medAge)}.`,m=>`La edad mediana aquí es de ${yrs(m.medAge)} años.`],
 'seniors-alone':[m=>`${P(m.seniorsAlone)} of households are an older person living alone.`,m=>`En el ${P(m.seniorsAlone)} de los hogares vive una persona mayor sola.`],
 'students':[m=>`${P(m.collegeShare)} of residents are enrolled in college.`,m=>`El ${P(m.collegeShare)} de los residentes estudia en la universidad.`],
 'schools-near':[m=>`${P(m.k12Share)} of residents are in school, kindergarten to 12th grade.`,m=>`El ${P(m.k12Share)} de los residentes está en la escuela, de kínder a 12.º grado.`],
 'k12':[m=>`${P(m.k12Share)} of residents are in school, kindergarten to 12th grade.`,m=>`El ${P(m.k12Share)} de los residentes está en la escuela, de kínder a 12.º grado.`],
 'immigrant':[m=>`${P(m.foreign)} of residents were born outside the U.S.`,m=>`El ${P(m.foreign)} de los residentes nació fuera de EE. UU.`],
 'very-immigrant':[m=>`${P(m.foreign)} of residents were born outside the U.S.`,m=>`El ${P(m.foreign)} de los residentes nació fuera de EE. UU.`],
 'newcomers':[m=>`${P(m.recentOfForeign)} of residents born abroad arrived in 2010 or later.`,m=>`El ${P(m.recentOfForeign)} de quienes nacieron en el extranjero llegó en 2010 o después.`],
 'recent-arrivals':[m=>`${P(m.recentOfForeign)} of residents born abroad arrived in 2010 or later.`,m=>`El ${P(m.recentOfForeign)} de quienes nacieron en el extranjero llegó en 2010 o después.`],
 'spanish':[m=>`${P(m.langs[0].share)} of residents speak Spanish at home.`,m=>`El ${P(m.langs[0].share)} de los residentes habla español en casa.`],
 'multilingual':[m=>`${m.langs.filter(x=>x.share>=4).length} languages are each spoken at home by 4% or more of residents.`,m=>`${m.langs.filter(x=>x.share>=4).length} idiomas se hablan en casa, cada uno por el 4% o más de los residentes.`],
 'limited-english':[m=>`${P(m.limEng)} of households have limited English.`,m=>`El ${P(m.limEng)} de los hogares tiene un dominio limitado del inglés.`],
 'poor':[m=>`${P(m.poverty)} of residents live below the poverty line.`,m=>`El ${P(m.poverty)} de los residentes vive bajo la línea de pobreza.`],
 'very-poor':[m=>`${P(m.poverty)} of residents live below the poverty line.`,m=>`El ${P(m.poverty)} de los residentes vive bajo la línea de pobreza.`],
 'child-poverty':[m=>`${P(m.childPoverty)} of children here live below the poverty line.`,m=>`El ${P(m.childPoverty)} de los niños vive bajo la línea de pobreza.`],
 'food-insecure':[m=>`${P(m.snap)} of households receive SNAP food assistance.`,m=>`El ${P(m.snap)} de los hogares recibe ayuda alimentaria SNAP.`],
 'snap':[m=>`${P(m.snap)} of households receive SNAP food assistance.`,m=>`El ${P(m.snap)} de los hogares recibe ayuda alimentaria SNAP.`],
 'uninsured':[m=>`${P(m.uninsured)} of residents have no health insurance.`,m=>`El ${P(m.uninsured)} de los residentes no tiene seguro médico.`],
 'very-uninsured':[m=>`${P(m.uninsured)} of residents have no health insurance.`,m=>`El ${P(m.uninsured)} de los residentes no tiene seguro médico.`],
 'jobless':[m=>`${P(m.unemp,1)} of the labor force is unemployed.`,m=>`El ${P(m.unemp,1)} de la población activa está desempleada.`],
 'unemp':[m=>`${P(m.unemp,1)} of the labor force is unemployed.`,m=>`El ${P(m.unemp,1)} de la población activa está desempleada.`],
 'affluent':[m=>`${P(m.incHigh)} of households earn over $150,000 a year.`,m=>`El ${P(m.incHigh)} de los hogares gana más de 150.000 dólares al año.`],
 'low-income':[m=>`${P(m.incLow)} of households earn under $35,000 a year.`,m=>`El ${P(m.incLow)} de los hogares gana menos de 35.000 dólares al año.`],
 'divided':[m=>`${P(m.incLow)} of households earn under $35,000 and ${P(m.incHigh)} over $150,000.`,m=>`El ${P(m.incLow)} de los hogares gana menos de 35.000 dólares y el ${P(m.incHigh)}, más de 150.000.`],
 'professional':[m=>`${P(m.occ[0][1])} of workers are in management and professional jobs.`,m=>`El ${P(m.occ[0][1])} de los trabajadores tiene empleos profesionales o de gestión.`],
 'service-work':[m=>`${P(m.occ[1][1])} of workers have service jobs, often on evening and weekend shifts.`,m=>`El ${P(m.occ[1][1])} de los trabajadores tiene empleos de servicios, a menudo con turnos de noche y fin de semana.`],
 'renters':[m=>`${P(m.renters)} of households rent their home.`,m=>`El ${P(m.renters)} de los hogares alquila su vivienda.`],
 'homeowners':[m=>`${P(100-m.renters)} of households own their home.`,m=>`El ${P(100-m.renters)} de los hogares es dueño de su vivienda.`],
 'rent-burdened':[m=>`${P(m.rent50)} of renters pay half their income or more in rent.`,m=>`El ${P(m.rent50)} de los inquilinos paga la mitad o más de sus ingresos en alquiler.`],
 'crowded':[m=>`${P(m.overcrowd)} of homes are overcrowded.`,m=>`El ${P(m.overcrowd)} de las viviendas está sobrepoblada.`],
 'no-car':[m=>`${P(m.noCar)} of households have no car.`,m=>`El ${P(m.noCar)} de los hogares no tiene carro.`],
 'car-dependent':[m=>`Only ${P(m.noCar)} of households are without a car, so neighbors drive past rather than walk past.`,m=>`Solo el ${P(m.noCar)} de los hogares no tiene carro: los vecinos pasan en auto, no a pie.`],
 'dense':[m=>`${P(m.renters)} of households rent and ${P(m.noCar)} have no car.`,m=>`El ${P(m.renters)} de los hogares alquila y el ${P(m.noCar)} no tiene carro.`],
 'veterans':[m=>`${P(m.veterans)} of adults here are veterans.`,m=>`El ${P(m.veterans)} de los adultos son veteranos.`],
 'changing':[m=>`The share of residents born abroad went from ${P(m.past.foreign)} to ${P(m.foreign)} in about ten years.`,m=>`La proporción de residentes nacidos en el extranjero pasó del ${P(m.past.foreign)} al ${P(m.foreign)} en unos diez años.`],
 'growing':[m=>`The population grew ${P((m.pop-m.past.pop)/m.past.pop*100)} in about ten years, to ${fmtNum(m.pop)}.`,m=>`La población creció un ${P((m.pop-m.past.pop)/m.past.pop*100)} en unos diez años, hasta ${fmtNum(m.pop)}.`],
 'settled':[m=>`About ${fmtNum(m.pop)} people live here, a population that has held steady for ten years.`,m=>`Aquí viven unas ${fmtNum(m.pop)} personas, una población estable desde hace diez años.`]
};
```

**v10.40 review:** the ten-year tags (`settled`, `changing`, `growing`) mean "fits any town" in the library. They never
borrow the survey's RULES evidence: `changing` says "About N people live here, and who lives here has changed over the last
ten years", never who moved in (a Hispanic-share shift was offered as the reason for prayer ideas). Only the `immigrants` theme
keeps the RULES and foreign-born sentences for `changing`. Make the Case likewise ignores `changing` outside that theme, and a
library idea's deck is argued only from its own figures (no group emphasis, no children's share when it has none), with its
theme's verse first (`CASE_LIB_THEME_VERSE`). Put the most specific tag first so the card's reason is the idea's own.

(Before v10.40's review:) `changing` can also fire on a racial shift (`raceShifts`). In that case the foreign-born sentence may show a small
change. That is acceptable as a fallback, because RULES `shift-race` / `foreign-shift` is tried first.

### Make the Case

- `caseCtx().item(id)` finds the idea through `uCatalog()` once it has been added (above).
- `caseBridgeOf(x)` already handles non-SIGNATURE, non-draft items: `x.need` gives the survey needs through
  `CASE_TAG_NEEDS`, and those give the staffing ministries through `CASE_NEED_MIN`. `kind` comes from skills first
  (kids → children, medical → health, vehicle → transport, cook → food), then from the English words. `ongoing`
  comes from the words, then from `load ≥ 1`. **No table changes are needed.**
- **One code change:** `caseMinName` (line 20511) uses `nEs` only for `x.generated`. Change the condition to
  `(x.generated||x.lib)`, so Spanish decks say the library's Spanish name.
- `uCheck` and `uEvidence` work unchanged, through `requirements` and `why`.

### Spanish rendering

`uCard`/`uRow` print `x.n`, `x.d` and `x.how` as they are, and `translateDOM()` (line 7032) swaps whole leaf texts
through the `ES` dictionary. The simplest route, which changes no renderer: when a theme file loads, add its pairs
to `ES` (`ES[en.n]=es.n; ES[en.d]=es.d; ES[en.how[i]]=es.how[i]; ES[partner.en]=partner.es`). A renderer that
prefers `LANG==='es' ? x.nEs : x.n` works as well.

### Loading

The whole library is about 4.6 MB of raw JSON. Ship `themes.json` (about 50 KB, about 12 KB gzipped) with the app. Load
`themes/<id>.json` (about 110 KB raw each) when a theme is opened or searched. For full-text search across
everything, generate a small index at build time: `[id, theme, also, tier, k, en.n, es.n, need]`, about 270 bytes
per idea, or about 570 KB for 2,100.

## Search

1. Normalize the query: lowercase; fold accents (NFD, strip marks); `’` → `'`; possessives off ("children's" → "children",
   "parents'" → "parents"); collapse spaces. Drop filler words (the app's `LIB_FILLER`, a longer list than this one):
   ministry, ministries, ideas, idea, outreach, program, programs, programme, for, church, ministerio, ministerios,
   ideas para, ideas de, de, para, iglesia, programa, programas.
2. If what remains equals any theme's `syn.en` or `syn.es` entry, or its `id`, `en` or `es` name (all folded), return
   **every idea of that theme plus every idea whose `also` includes it**. Show home-theme ideas first, then
   cross-listed ones. Both languages are always searched, whatever the UI language.
   Examples: "prayer", "Prayer ministry", "pray", "praying", "oración", "oracion", "ministerio de oración" → prayer;
   "feeding the homeless" → the filler "the" goes, but "feeding homeless" matches no synonym, so step 3 applies.
   **Synonyms are folded exactly as the query is** (v10.40 review: 139 multi-word synonyms such as "children's ministry",
   "dar de comer" or "Signs of the Times" never found their own theme). The query as written is tried first, then without
   its filler; a synonym that needed no folding wins a tie ("street" is `neighbors`', "street outreach" is `homeless`'s).
   `npm test` (tests/v40-review-lib.test.js) types every synonym as a query and requires its own theme, and only it.
3. Otherwise match theme synonyms as whole words inside the query ("feeding homeless" contains the `homeless`
   synonym "homeless" and the `hunger` synonym "feeding"). Return those themes' ideas, ordered by how many query
   words each idea's name and description contain.
   A one-word synonym that only filler made short ("new year" → "year") does not count here, and a synonym found inside a
   longer one found too gives way ("calle" inside "situación de calle"). The ranking in this step (v10.40 review): the
   number of the named themes an idea covers (its theme, its `also`, or the theme's own words in its text), then the query's
   words in its name and description, then the census score below.
4. Otherwise run a full-text match over `en.n`, `es.n`, `en.d` and `es.d` (all query words must appear).

Ranking inside the results (the library view, not `signatureMoves`):
`score = 2·(need tags present) + 1·(boost tags present) + (uCheck(x).ok ? 10 : 0) + {1:2, 2:1, 3:0}[tier]`.
Run `uCheck` only on the page being shown (for example the top 30); for the rest, sort by tags and tier. Useful
filters: tier, kind, where, ages, sabbath, "has a digital part", minors.

## Validator

```
node validate.mjs themes/prayer.json [more…]   # every idea, plus the theme quotas; prints "OK <file> <n> ideas"
node validate.mjs examples.json                # idea checks only (also: --ideas-only <file>)
node validate.mjs --all                        # themes.json + all 42 files + cross-theme checks + a count table
node validate.mjs --vocab <index.html>         # rebuild vocab.json from the app source
node selftest.mjs                              # 63 cases: every rule fires and none misfires
```
`ERROR` lines fail the file (exit 1). `REVIEW` lines never fail; they tell the writer to re-read the idea.
Add `--no-review` to hide them. `--all` reports `MISSING themes/<id>.json` for themes not yet written and fails
until all 42 exist.

**Per idea (ERROR):**
- JSON shape; no unknown fields; every field, enum and limit in the table above; tier limits.
- Tags, skills and facilities only from `vocab.json`. Ids prefixed, unique, not a SIGNATURE id, and without the
  reserved `draft-`/`sg-` prefixes.
- Names differ from SIGNATURE names (EN and ES), and ES differs from EN.
- 2–3 sentences in `d`: a quotation counts as one word, and common abbreviations are ignored.
- No emoji, no double spaces.
- Banned content, in both languages: pork or unclean meat ("veggie dogs" and "ham radio" pass); alcohol; raffles,
  lotteries, casinos, door prizes and 50/50s; gambling (except recovery from it); "target/targeting" (and in
  Spanish "público objetivo", "segmentar"); bait, lure or hook framing; "convert them" and soul-counting; door-to-door
  gathering of personal information; counselling or therapy words with no partner and no referral cue
  (refer, licensed, professional, hotline, 988, "not counseling"); abuse-survivors ideas without a professional
  partner or a hotline, shelter or advocate.
- Children, in both languages: collecting or asking for children's or students' names, photos, birthdays, addresses
  or phone numbers ("names of the children", "kids' names", "nombres de los niños/hijos/alumnos"); "add a name" near
  a child word; asking for prayer requests about people's children ("send us/text us/prayer requests … their kids"); school gate, drop-off or pick-up lines, playgrounds,
  school bus stops, skate parks and youth hang-outs ("puerta de la escuela", "parque infantil", "parada del autobús
  escolar"); "reach kids", "get kids in", "atraer/captar niños"; approaching children directly; lists of children.
  `ages` children or youth ⇒ `minors:true`. `minors:true` ⇒ the `kids` skill, and screening named in both `how` lists.

**Per theme file (ERROR):** at least 50 ideas; at least 15 tier-1, 15 tier-2 and 8 tier-3 ideas; all four kinds,
none above 45%; at least 4 `where` values; at least 12 ideas with a digital or social component (35 for `media`),
found by the brief's regex over the English text (facebook, instagram, social media, online, website, text
message, texting, whatsapp, nextdoor, youtube, tiktok, reels, livestream, qr, ad(s), video, podcast, email, google;
plus plurals, "text line", "text us", zoom, canva, messenger); at least 3 ideas that combine printed cards or
walking with a digital follow-up; no two names in the file (EN, or ES) with a normalized-token Jaccard above 0.6.

**`--all` (ERROR):** themes.json is valid (unique ids; `not` entries point at real themes; synonyms lowercase and
unambiguous; tags real); every theme has a file and every file has a theme; ids are unique across the library;
no cross-theme near-duplicate names (same Jaccard rule, EN and ES). It then prints the count table.

**REVIEW (never fails):** a banned or children phrase that sits inside a negation ("we never ask for student
names", "no raffles"), so a safeguard sentence is not punished; praying about "their children" without a request
(fine for members praying for their own children); any idea with `ages` children or youth, or `minors:true` (re-read it with the outsider
test); tier-1 and tier-2 `where:"church"` ideas with no reach words (walk, door, card, street, neighbo…, market,
library, park, online, social, post, ad, invite, flyer, text, event, partner, business, school's invitation…);
meat on the menu; bingo; "bar" that may be a drinking venue; photos with no consent or "no photos" wording;
dignity words ("the needy", "the less fortunate", "the lost"); knocking with no invitation or "no knock" wording;
prayer requests with no private or anonymous option; `sabbath:true` alongside selling, buying, fundraising,
tournaments or tickets; `tú` forms in Spanish; English programme names in Spanish; British spelling in English;
a name close to a built-in ministry's; a `d` that reads as one sentence; more than 35% of a theme at the church
building; fewer than 3 age groups in a theme; addiction and mental-health tier 2/3 Equip or Belong ideas with no
partner.

Name similarity: lowercase, fold accents, split on non-letters, drop stop words (a, the, of, for, and, your, our…;
el, la, los, de, del, para, por, y, en, con, su…), strip a final "s" from words longer than 3 letters, then
Jaccard = |A∩B| / |A∪B|, and above 0.6 fails. "Prayer cards on every door within a mile" and "Prayer cards for every door"
score 0.67, which fails. "Prayer walk around the school" and "Prayer walk around the park" score exactly 0.6, which
passes the validator but still needs a real difference in mechanism, not just a new place.
