# Terrain — handover for Claude Code

This file is read automatically when Claude Code opens the repo. It is the
working memory of the project: what it is, how it is built, what has been
decided, and what is still open. Keep it current — update it in the same
commit as any change that alters something written here.

**This repository is public.** Nothing secret goes in this file, in code, or
in commit messages. See [Security](#security--this-repo-is-public).

---

## Read this first

1. **One file.** The whole app is `index.html` (~1.4 MB). No build step, no
   framework, no bundler. Two `<script>` blocks. Edit it in place.
2. **Deploy = commit to `main`.** Netlify is wired to this repo and publishes
   every push in about a minute. There is no separate server to upgrade.
3. **Run the tests before and after every change:** `npm install` once, then
   `npm test`. 54 suites, 4476 assertions, all green at v10.39.0.
4. **Every version change updates six stamps** — see [Versioning](#versioning).
   The app warns in the console at boot if they disagree.
5. **The pastor is not a developer.** He tests on the live site, often on his
   phone, and reports by screenshot and voice-to-text (expect typos). Verify
   against the live site and the repo, not against his description alone.

---

## Who and what

**Pastor Joshua Mura** — Seventh-day Adventist, two-church district in
Pennsylvania (Bucks County SDA, Warminster; Fairview Village SDA). Brand:
*Joshua Mura*. Company name for the eventual product: **Mura Works**
(muraworks.com, registered at Porkbun).

**Terrain** (this repo, live at **pastorshub.org**) is a ministry-planning tool
for pastors. A pastor types a church address; Terrain reads the U.S. Census
for the tract, town and county, explains the neighborhood in plain English,
takes an honest inventory of what the church can field, and matches ministries
to both — checked against real volunteers, hours, rooms and money.

Four tools on the hub:

| Tool | What it does | Tier |
|---|---|---|
| **Community Survey** | Census report + the action plan (where to look, community resources, church profile, mobilization, ministries) | survey free · plan full |
| **Spiritual Gifts** | Members take a 105-statement assessment plus 12 heart questions via a short link or QR code; results come back to the pastor through `gifts.mjs`; members get a report tied to the Community Survey, as a PDF and by email | full |
| **Make the Case** | Turns the findings into a proposal for a named board or ministry | full |
| **Evangelism Planner** | 18-month countdown to opening night, with a benchmark per phase | full |

**Mission, in his words:** everything points to Christ; features are frames,
the gospel is the picture. Neighbours are neighbours, never targets.

---

## The repo & deploy

```
index.html                     the entire app
netlify/functions/census.mjs   Census API proxy + conference access-code gate
netlify/functions/advise.mjs   AI: prose plan + fresh ministry ideas (v2.1)
netlify/functions/gifts.mjs    Spiritual Gifts results server + email (gifts-1.1, Netlify Blobs)
netlify/functions/gifts-sweep.mjs  daily scheduled purge of expired gifts results
netlify/functions/register.mjs  first-page registration (name, email, church, role), register-1.1
netlify/functions/present.mjs   Make the Case live slideshows: decks in Blobs, slide pointer via Firebase, "I'm in" answers (present-1.0)
netlify/functions/present-sweep.mjs  daily purge of expired presentation rooms
FIREBASE-RULES-TERRAIN.txt     rules for the separate Firebase project `terrain-live` (no client writes)
FIREBASE-SETUP.md              click-by-click setup of that project for the pastor
README.md
CLAUDE.md                      this file
package.json                   @netlify/blobs (functions); jsdom + jspdf (tests)
tests/                         54 suites + runner + fixtures
```

There is **no `netlify.toml`** — Netlify uses its defaults (functions in
`netlify/functions/`, publish the repo root).

**Deploy:** commit to `main` → Netlify builds → *Published* in the Deploys tab.
Verify both halves after any deploy:

- page: the badge beside TERRAIN, or `<meta name="terrain-version">`
- function: `https://pastorshub.org/.netlify/functions/advise` → `"fn"` field

**Server settings** (Netlify → Project configuration → Environment variables;
values are never in the repo):

| Variable | Used by | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | advise.mjs | Anthropic **platform** key (console.anthropic.com), billed per use. Not a claude.ai subscription. |
| `TERRAIN_AI_PASS` | advise.mjs | Optional passphrase. The pastor unlocks a device once with `?ai=PASSPHRASE`. |
| `ADVISE_MODEL` | advise.mjs | Optional. Defaults to `claude-opus-5-5`. Set `claude-sonnet-5` if Opus hits the 60 s function limit. |
| `TERRAIN_CODES` | census.mjs, gifts.mjs | Conference access codes. **Only enforced when `TERRAIN_REQUIRE_CODE` is on** (v10.38: registration replaced codes on the first page). |
| `TERRAIN_REQUIRE_CODE` | census.mjs, gifts.mjs | `1`/`true`/`yes`/`on` brings the old access-code gate back. Unset = registration only. |
| `TERRAIN_REG_SECRET` | register.mjs, census.mjs, gifts.mjs | 32+ random characters. **Set it**: registration then issues a signed token and census/gifts refuse calls without one (401 `noreg`). Unset, registration is collected but keeps nobody out (fail-open). |
| `PRESENT_FB_URL` | present.mjs | Firebase Realtime Database address of the separate `terrain-live` project (see FIREBASE-SETUP.md). Without it slides still open and swipe; phones just don't follow the presenter. |
| `PRESENT_FB_SECRET` | present.mjs | That database's secret (or service-account JSON). Server only; never in the page. |
| `TERRAIN_ADMIN_KEY` | register.mjs | 32+ characters. Enables the admin list of registrations (header `x-terrain-admin`). Unset = no list endpoint. Registrations can also be browsed in Netlify → Blobs → `terrain-registrations`. |
| `RESEND_API_KEY` | gifts.mjs | Resend API key. With `GIFTS_FROM`, switches on "Email me my report". Also keys the hashed per-inbox send counter. |
| `GIFTS_FROM` | gifts.mjs | Sender, e.g. `Terrain <reports@pastorshub.org>`. The domain must be verified in Resend (DNS records on pastorshub.org). |
| `SITE_URL` | gifts.mjs | Optional. Base of the private report link in emails; defaults to the Netlify site URL. |

---

## Current state (28 Sep 2026)

| | In the repo | Handed over |
|---|---|---|
| `index.html` | **v10.34.0** | **v10.39.0** — commit it first (it contains v10.35.0–v10.38.0) |
| `advise.mjs` | **advise-2.1** ✓ | same |
| `gifts.mjs` + `gifts-sweep.mjs` | **do not exist** | **gifts-1.1** — new; needs `@netlify/blobs` (in package.json) |

The session that produced this handover took Terrain from **v10.11.1 to
v10.35.0**. Highlights, so you recognise them in the code:

- Colour by *kind of figure* throughout (`KIND_OF`), mint theme retained
- Headline rings with county notch; up to three glow when they stand out
- Ten-year chart: largest population in mint, others coloured by size
- Hub rebuilt to the pastor's mockup, with his SVG icons and a verified quote
- Church profile as a fixed-height four-step slider (no page jolt)
- Demo church, guarded Clear all, and a summary box above the action plan
- Entitlement seam (`FEATURES` / `currentTier()` / `entitled()`)
- Fresh ideas generated in the background — 20 per level, saved once
- Ministries shown as three levels, twenty prioritised, fresh interleaved
- Spiritual Gifts landing rebuilt: two doors, results beneath

**v10.36.0 — Community Survey audit.** A full audit of the survey found and
fixed these, each pinned by `tests/survey-audit.test.js`:

- *Wrong figures:* origins listed Census regional totals (Caribbean, Central
  and South America) as countries; the proposal age donut invented seniors as
  16% of population (now B01001 65+); the occupation donut centre showed total
  population (now employed, C24010_001); "— of households own their home"
  (`homeowners` now computed); suppressed cells summed to 0% (`S()` now null).
- *Silent misfires:* ten rules used a `when/steps` shape `suggestions()` never
  read — eight converted, two dropped as duplicates (night-shift, disability);
  "A changing community" never fired at tract scope — `trendOf()` now supplies
  the town's trend and the evidence says "across {town}"; count thresholds
  (college, K-12, "dense") fired at every town and county — now shares.
  New ACS: B01001 65+, B21001 veterans, B10002 grandparents raising children.
- *Race shift:* `raceShifts()` / `SHIFT_GROUPS` use Hispanic, Black and Asian
  only for the brief, tags and rules — the 2020 Census recoding moved people out
  of "White alone" into "Two or more". Charts still show every group, with a
  caveat in the caption.
- *Layout:* an orphaned `.tick{display:flex}` rule had collapsed the
  comparison strip on every card to 0px; ring key was headline-size (`.brief p`
  outranked `.statkey`); rings are now 4 + 4; `balanceGrids()` splits card runs
  evenly (5 → 3 + 2, 6 → 3 + 3, 2 → halves); charts draw at their real width
  (`chartW()`) so text is ~14px on desktop and phone alike.
- *County scope* no longer compares the county with itself.
- *Spanish:* `RULES_ES` (every need), `HELP_ES` (Community resources),
  `SCRIPTURE_ES` (Reina-Valera Antigua 1909, public domain, text from Bible
  Gateway "RVA"), `briefES()` rewritten to mirror `brief()`, `L(en,es)` for
  strings with figures in them, ~125 new `ES` keys, 18 dead keys removed.

**v10.39.0 — Make the Case rebuilt as live phone slideshows** (approved blueprint; the pastor said yes to all five decisions):
- *Build:* pick a ministry (ranked by need, capacity and gifts: `CASE_RANK`, `caseRankAll`, `CASE_BRIDGE`), pick the audience
  (three kinds: board, ministry team, congregation; 23 groups in `CASE_GROUPS`), preview and edit headlines (never
  contenteditable). `caseModel()` → `caseDeck()` (typed slide JSON) → `tdeckRender()` (portrait, one idea per slide).
  Figures against the county with ACS margins of error (`metricMoes`, `compareResult`): "clearly higher" only when
  significant, else "similar"; "about 1 in N"; counts only, never names; minors never counted.
- *Present:* `caseOpenPresenter` → `present.mjs` stores the deck (Blobs) and returns a room; slide 0 has a QR + 6-letter
  code; phones open `#watch=<room|CODE6>`, follow the presenter through a Firebase REST stream (EventSource), can swipe
  back ("Back to live"); fallback polling when no stream. "I'm in" answers (Lead/Help/Pray + first name), minors get a
  kind message; names show on the presenter's screen only after "Show names" (never projected by accident).
- *Leave behind:* PDF handout (`casePdf`, front/back, every figure with MOE and source), private ask list (device only).
- *Sample slideshow* (`caseSample`) for demonstrations: SAMPLE on every slide, 1-day room, writes nothing.
- *Also fixed:* money shows real amounts (no more "$0k"), the survey's hinge banner no longer leaks into Make the Case,
  EGW DA 141 punctuation matches the source, the gifts "lowest two" sentence, "Back to results" on Welcome back.
- *Needs one-time setup for live follow:* FIREBASE-SETUP.md (new project `terrain-live`, paste rules, two Netlify variables).

**v10.38.0 — registration, colour, clearer statements** (all at the pastor's request):
- *Registration instead of access codes.* First page: find your conference (map/search, unchanged), then register
  with name, **email (required)**, church and role, optional news opt-in; no password, no code, no email sent.
  Stored on the device (`terrain-reg`) and on the server (`register.mjs`, Blobs `terrain-registrations`, one
  record per email, email never echoed except to the admin list). Header chip "name · conference · Change".
  The church name fills the church profile when it is still the placeholder. Codes come back only with
  `TERRAIN_REQUIRE_CODE`. With `TERRAIN_REG_SECRET` set, census/gifts require the registration token.
- *Email sending is off* for now: `GF_EMAIL_ENABLED=false` (next to `GF_FN`) hides every email part of the
  gifts tool even if Resend is configured. Download PDF remains.
- *Hub tiles* each have their own colour (survey mint, gifts violet, case amber, planner rose; `--tc`,
  `--tglow`, gradients `ink-*`) and their halos breathe slowly, a beat apart (`toolBreathe`, 6 s);
  reduced motion and print stop it. The pastor asked for this, overriding "nothing animates".
- *Gifts sections coloured by family* (Scripture mint, people pink, leading amber, reaching purple, hands blue;
  `data-gff`, `gfSetBar`): a five-segment progress bar, coloured dots, a calmer section opener (centred verse,
  spaced description), and the colour carried through each section's cards.
- *46 of the 105 statements rewritten* in plainer words, EN and ES, each verified to measure the same gift and
  kind of evidence (`scratchpad` record: statement_changes.json in the build session).
- *Sample report* ("See a sample report" on the gifts landing): a fictional member, clearly marked, screen + PDF,
  no storage or server side effects — for demonstrations.

**v10.37.0 — Spiritual Gifts rebuild** (the pastor approved every item of the
blueprint; spec kept in this file's section below). Built by orchestrated agents
with independent review, adversarial security passes and a completeness critic.
- *Fixes he asked for:* the badge that called answered-but-low gifts "untested"
  (now demonstrated / emerging / untested only after a "no opportunity" answer /
  "less evident"); repeated sentences (a sentence tracker, pinned by a property
  test over hundreds of random profiles, EN and ES).
- *Assessment:* 105 statements (a second fruit statement per gift, key `.4`;
  fruit = mean of keys 2 and 4), 12 heart questions (`GF_HEART`), age question
  (under-18s: parent line, no email, 1-year retention, youth-only ministries
  `GF_YOUTH_MIN` and youth steps `GF_TRY_YOUTH`, youth neighbourhood roles),
  optional email consent for adults, all-high answering flag (`gfFlags`).
- *Confirmation by others:* members invite 2–3 people (`#gifts-confirm=`);
  observer ratings blend into confirmation as (self + 2·others)/3.
- *Report:* one model (`gfReportModel`) → screen (`gfReportHTML`) and PDF
  (`gfReportPDF`, jsPDF 2.5.1 lazy from cdnjs with SRI, US Letter, usually 5
  pages). Gift wheel, evidence bars, family shape, gifts to try, where your
  gifts meet your neighbourhood (`GF_NEEDS` — all 38 survey needs mapped to
  gifts, heart and a one-person role), at your church (heart lifts the order,
  never the %), ministries worth starting, deep readings, growth, all 21,
  first ninety days, "For the pastor" on his copy.
- *Delivery:* `gifts.mjs` (Netlify Blobs): campaigns with a secret key, short
  link `#gifts=<pub>` with the church + survey context stored on the campaign
  (`op ctx`), QR code (qrcode-generator 1.4.4, SRI) and a ready message on the
  setup screen, results pulled with no codes (members' deletions and expiries
  sync to the pastor's device), member delete, retention 2y / 1y minors (daily
  `gifts-sweep.mjs`). Email: a link email first (no attachment); opening it
  verifies the address (`op verify`, token `vtok`); only then can the member
  tap "Email me a PDF copy" (`op emailpdf`, needs the vtok). Limits per record,
  per inbox (hashed), per client, per campaign and site-wide; PDFs with active
  content refused. The long self-contained link and the copy-a-code flow remain
  as the fallback when the server is absent.
- *Congregation view:* "Your congregation against your neighbourhood" grid.
- *Spanish:* the whole gifts tool, member and pastor sides; Scripture in RVA
  1909 verbatim from Bible Gateway, KJV in English.

**Important history:** until v10.26/advise-2.0, the live function had no idea-
generating mode at all. Every "fresh ideas" press silently fell back to the
built-in list. The AI had never produced an idea on the live site. As of
advise-2.1 in the repo, it can — **this has not yet been observed working
end-to-end on the live site with a real key.** Watch the first real run.

---

## Working rules

### How changes are made

Every change in this project has been made with an **asserting patch**: a
script that replaces exact text, asserts each replacement matched exactly the
expected number of times, and writes the file **only after every replacement
succeeds**. If any anchor misses, nothing is written. This caught real errors
twice in the last session (an anchor off by two spaces of indentation) — a
half-applied patch to a 990 KB single file looks fine and is not.

Claude Code's own edit tool gives the same guarantee for single edits. For
multi-part changes, keep the all-or-nothing discipline.

After editing, always run `npm test`. It syntax-checks both inline script
blocks and every function first, then runs all 54 suites.

### Versioning

Six places, always together, in the same commit:

1. banner comment, line 3 — `TERRAIN  vX.Y.Z`
2. `<html ... data-version="vX.Y.Z">`
3. `<meta name="terrain-version" content="vX.Y.Z">`
4. `<title>Community Map — Terrain vX.Y.Z</title>`
5. footer `<span id="ver">vX.Y.Z</span>`
6. `const VERSION = 'vX.Y.Z';`

Minor bump for any user-visible change. Commit message starts with the
version: `v10.36.0 — what changed`.

### Tests

`tests/` holds 54 suites and `run-all.js`. They load `../index.html`
and `../netlify/functions/*.mjs` directly, stub `fetch`, and never call a
real API or spend credit. `fixtures.json` is a fabricated high-need tract plus
a small and a medium church.

- A test that fails because the pastor **changed his mind** is stale — update
  it to the new intent and say so in a comment. Several were updated this way
  in the last session (e.g. the quote moved back under the welcome).
- A test that fails because of **your change** is a regression. Fix the code.
- jsdom does no layout. Anything about pixels (alignment, wrapping, overflow)
  must be checked on the live site or in a real browser.

---

## Architecture map

Search for these by name in `index.html`.

**Census & report**
- `run(getGeo)` — geocode, fetch ACS for tract/town/county, compute metrics, render
- `metrics(o,past,origins)` — raw ACS → the figures everything else reads
- `SPEC` — metric key, label, table, format; also drives CSV export and the AI summary
- `render()` — builds the whole report into `#sections`
- `ringsHTML()`, `statRing()`, `standsOut()` — headline rings; at most 3 glow
- `KIND_OF`, `kindHue()` — label → colour family; add a label here and it is coloured everywhere
- `donut()`, `donutOf()`, `chartSlope()`, `chartLollipop()`, `chartGrouped()`, `bars()` — SVG charts sized by `chartW()`
- `balanceGrids()` — runs after `render()`; sets `--sd` / `--sp` spans on survey cards
- Spanish: `ES` (whole-string lookup by `translateDOM()`), `tr()`, `L(en,es)` for built strings, `briefES()`, `HELP_ES`, `SCRIPTURE_ES`

**Tags, rules, ministries — the engine**
- `profile(m,c,trend)` — census figures → ~40 threshold tags (`poor`, `many-kids`, `no-car`…)
- `trendOf(M,scope)` — the geography carrying ten-year data (the town, at tract scope); `raceShifts()`
- `RULES`, `suggestions()` — needs that fire, with the figure that fired them. Every rule is `{id,cat,w,on,ev,t,do,ask}`; `on/ev` get `(m,c,x)` with `x.tr` the trend and `x.where` / `x.whereEs`
- `RULES_ES` — Spanish words for every rule, keyed by id (tests fail if one is missing)
- `SIGNATURE` — the ~110 built-in ministries, each with `need`/`boost` tags
- `uBase(x)` — a ministry's default requirements (people, leaders, sessions, rooms, cost lines)
- `uReq(x)` — requirements after the pastor's scope edits
- `uCheck(x)` — **the capacity check**: requirements vs `capMerged()` minus what the selected plan already reserves. Returns `{ok, gaps[]}`
- `signatureMoves()` — tag match + fit score + feasibility
- `uCardsHTML()` — one level, priority order, twenty open; fresh ideas **interleaved** with built-ins (a score bonus alone never gets them into the twenty)

**The church**
- `U_STORE` / `uStore()` / `uChurch()` / `uPersist()` — all church data, per church, on the device. When accounts arrive, this store is what syncs.
- `capGet()` / `capSave()` / `capMerged()` — the profile; `capMerged()` is what every check reads
- `capRender()` — the four-step slider (`.u-stage` fixed height, `.u-track` slides)
- `DEMO_CHURCH`, `capFillDemo()`, `capClearAll()`, `armThen()` — demo and two-tap clear
- `capSummaryHTML()` — the itemised box above the action plan
- `goToMobilization()` — instant jump after Save/Demo (never `smooth` — it animated from the bottom)

**Fresh ideas (AI)**
- `GEN_PLAN` — 20 per level, four parallel batches (Serve / Equip / Belong / Invite)
- `autoIdeas()` — background run after a profile save or survey completes; **synchronous `AUTO_RUNNING` guard before any await** (without it, two triggers generated and billed twice)
- `genBand()`, `draftFrom()`, `roomReq()` — one level; a draft's cited `metric` is verified against the tract before it counts as evidence
- `autoKey()` — once-only per church + neighborhood + profile

**Paid tier seam**
- `FEATURES` — which tier each feature is in
- `currentTier()` — **the one line that changes when auth arrives**; today returns `'full'`
- `entitled(f)` — every paid feature asks this; `lockHTML(f)` draws the lock
- `?tier=free` on the address previews the free experience

**Spiritual Gifts**
- `GIFTS` (21, 5 statements each; ES in `GIFTS_ES`), `GF_ORDER` (105 interleaved statements), `gfScores(a, obs)`, `gfProfile()`, `gfFlags()`
- `GF_HEART` (12), `GF_NEEDS` (38 survey needs → gifts/heart/role), `GF_NEEDS_YOUTH`, `GF_YOUTH_MIN`, `GF_TRY` / `GF_TRY_YOUTH`
- `gfReportModel()` → `gfReportHTML()` / `gfReportPDF()`; `gfChurchNeeds()` + `gfRenderChurch()` for the congregation grid
- Server client: `gfStatus`, `gfCampaign`, `gfSubmit`, `gfSync`/`gfPull`, `gfInvite`/`gfPeek`/`gfConfirm`, `gfGet`, `gfEmailReport`, `gfMailPdf`; routes `#gifts=`, `#gifts-confirm=`, `#gifts-report=`
- `gfRenderRoster()` — the pastor's landing: two doors, results, folded back-office
- `gfEncode()` / `gfDecode()` — the `TG1-` result code members can paste
- `GF_FN` = `/.netlify/functions/gifts` — exists from v10.37.0; without it everything falls back to pasted `TG1-` codes (v1–v4 all decode)

---

## Design decisions already made

These were reached with the pastor, sometimes after trying the alternative.
Don't relitigate them without a reason he'd accept.

- **Mint is the theme.** Colour is a signal, not decoration.
- **Colour by kind of figure, everywhere:** amber = money & hardship, blue =
  housing, purple = children & families, pink = people, mint = language and the
  theme. Colouring whole *sections* was tried (v10.13) and rejected; all-mint
  was tried (v10.14) and rejected.
- **Headings stay mint;** the data carries the colour. (Exception by his request, v10.38: the hub tiles and the
  Spiritual Gifts sections each carry their own colour.)
- **Nothing animates on its own** except the breathing button on the church
  profile — the one control that needs the pastor — and (v10.38, his request) the slow breathing glow of the
  four hub tiles. Reduced motion stops both.
- **Symmetry matters to him.** Equal-height cards, one-line links, two-line
  blurbs. Check wrapping in Spanish too; every string is longer.
- **Twenty ministries per level**, three levels. Not a ten-rung slider.
- **Fresh ideas must be visible**, not buried under built-ins.
- **Instant scroll after Save/Demo**, never smooth.
- **Ellen White quotes are verified against the White Estate before use.** One
  attributed from memory (to *Christ's Object Lessons*) was wrong; it is
  *Testimonies* vol. 4, p. 67. KJV for Scripture.
- **Free tier = the survey only.** Full tier = everything that turns it into a plan.

---

## Open work, prioritised

1. **Commit v10.39.0** (Make the Case live slideshows; see above) and confirm the badge,
   `/.netlify/functions/present` → `"fn":"present-1.0"`; then the pastor follows FIREBASE-SETUP.md once so phones
   follow live. **Watch the first real presentation**: stream delay, late joiners, "I'm in", End. Spark plan caps
   Firebase at 100 simultaneous phones across all churches; move to Blaze with a budget alert before wider use.
   Also from v10.38.0: `/.netlify/functions/gifts` → `"fn":"gifts-1.2"` and
   `/.netlify/functions/register` → `"fn":"register-1.1"`. Set `TERRAIN_REG_SECRET` (32+ random chars) so
   registration actually gates Census/gifts. Email stays OFF by the pastor's choice (`GF_EMAIL_ENABLED`);
   when he wants it: Resend account → verify pastorshub.org DNS → `RESEND_API_KEY`, `GIFTS_FROM` → flip the flag.
   **Pending the pastor:** the EGW quote in `EGW.faith` ("Our neighbors are not merely…") is credited to DA 503, but an
   exact-phrase search on egwwritings.org found it in Welfare Ministry 45, Christian Service, My Life Today 232,
   Reflecting Christ 229, RH 1 Jan 1895 and the 1895 GC Bulletin, not DA. He was asked to check his sources.
2. **Watch the first real AI run.** Save a profile on the live site with a key
   set; confirm ~60 ideas arrive, each with steps, and that the timing is
   inside Netlify's 60 s per call. If calls time out on Opus, set
   `ADVISE_MODEL=claude-sonnet-5`.
3. **A systematic QA pass before going public** — the pastor asked for this.
   Every section, every tool, every button, desktop and phone, with a real
   address and a real profile. Two bugs last session (silent form
   validation; the AI never running) were found only by accident.
4. **~~Spiritual Gifts results function~~ — built in v10.37.0.** Still open around it: a real
   end-to-end run on the live site with Resend; whether under-18s should appear in the
   congregation grid under adult roles (they do, marked and not counted); Community
   Survey "possible team members" only match GF_YOUTH_MIN by exact name. Originally: write `netlify/functions/gifts.mjs`
   (`op: id | submit | list`, matching `gfPubId` / `gfSubmit` / `gfPull`) with
   durable storage, so results arrive without pasted codes. Minors take this
   assessment through youth ministry — decide what is stored and for how long.
5. **Accounts and the paid tier.** Firebase auth + per-user plan, ported from
   the pastor's Slide Preach app. Replace `currentTier()`; sync `U_STORE` to
   the account. Billing through Stripe. **Before any of this handles money,
   fix the Firebase rules issue below** — it is the same pattern.
6. **Metering.** Every AI call spends his credit. There is no per-user quota yet.
7. **Web-grounded ideas.** Give the moves prompt Anthropic's web search tool so
   each idea can cite a church that has actually done it. The engine does not
   currently search anything; its ideas come from the model's general knowledge.
8. **~~Spanish for Spiritual Gifts~~** — done in v10.37.0.
   **Spanish for the action plan** — the survey report and the needs list are
   done (v10.36.0); the church profile form, the Mobilization numbers panel
   and the ministry cards below the hinge are still largely English.
9. **Smaller:** ten-year chart legibility when five series converge between
   1–11% (left-hand labels carry no series name); OpenStreetMap church lookups
   occasionally fail (retry UX exists); a real Census run of v10.36.0 has not
   been seen yet — the audit was rendered from fixtures because the live site
   needs an access code.

---

## Security — this repo is public

- **Never commit secrets.** Keys, passphrases, access codes, PINs and Firebase
  write keys belong in Netlify environment variables, never in this repo.
- **Known exposure:** `CENSUS_KEY` is hard-coded in `index.html`. It is a free
  Census API key and low-harm, but it is scraped. Move it behind `census.mjs`.
- **Slide Preach (project `voice-preach`) — rules.** The old `meta/$uid` cascade issue was fixed in
  FIREBASE-RULES v59.7 (per ~/slidepreach/START-HERE.md). **Open issue found 28 Sep 2026:** the
  `rooms/$room` write rule starts `!data.child('owner').exists() ||`, and no code ever writes `owner`, so any
  signed-in account can rewrite any church's live room (current slide, slides, title) mid-service. Viewers also
  download every other viewer's presence heartbeat, and `live/$viewer` is open-write without a cap. Fix in
  Slide Preach separately. Terrain's own live follow (v10.39) uses a separate project with no client writes.

---

## Related project: the treasure-map hub

**joshuamura.netlify.app** — the pastor's personal ministry site (Mine, Spring,
Altar, Watchfire, Trail, Guide's Tent, Treasury), Firebase project `joshuamura`.
Separate codebase. Findings from a review, still open:

- `prayerteam` path is **publicly readable** — returns `null`, not *Permission
  denied*. Anyone with the URL could read prayer requests shared with the team.
- Watchfire "LIVE" invitation left on after a presentation ended.
- Twelve `think:` reflection prompts in the youth studies, never rendered.
- Youth studies collect home addresses from minors without a parent line.
- A PIN and a write key sit in client source.

---

## The pastor

- Voice-to-text; expect typos and run-on sentences. Read for intent.
- Sends screenshots of the live site. **Check the version badge in the
  screenshot** — more than once last session he was looking at an older deploy.
- Wants files he downloads named with the version (`index-v10.39.0.html`); for
  commits, the version goes in the message.
- Prefers big coherent changes over many small ones, but wants to see them
  work. Report what changed, what was tested, and what couldn't be.
- Say plainly when something is broken, including your own mistakes.
