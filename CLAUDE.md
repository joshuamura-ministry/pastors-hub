# Terrain — handover for Claude Code

This file is read automatically when Claude Code opens the repo. It is the
working memory of the project: what it is, how it is built, what has been
decided, and what is still open. Keep it current — update it in the same
commit as any change that alters something written here.

**This repository is public.** Nothing secret goes in this file, in code, or
in commit messages. See [Security](#security--this-repo-is-public).

---

## Read this first

1. **One file.** The whole app is `index.html` (~2.2 MB). No build step, no
   framework, no bundler. Two `<script>` blocks. Edit it in place. The one
   exception is data: the Idea Library's `ideas/` is **generated** from
   `tools/ideas-src/` by `tools/build-ideas.mjs` — never edit `ideas/` by hand
   (see [Adding or changing ideas](#adding-or-changing-ideas)).
2. **Deploy = commit to `main`.** Netlify is wired to this repo and publishes
   every push in about a minute. There is no separate server to upgrade.
3. **Run the tests before and after every change:** `npm install` once, then
   `npm test`. 64 suites, 5191 assertions, all green at v10.40.0 (after the review pass and the final check).
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
netlify/functions/advise.mjs   AI: prose plan + fresh ministry ideas + "More ideas for {town}" on one topic (advise-2.2)
ideas/                         the Idea Library as the page loads it: index.json, words.json, <theme>.json (GENERATED, never edit)
tools/build-ideas.mjs          packs tools/ideas-src into ideas/ after the writers' validator passes (see "Adding or changing ideas")
tools/ideas-src/               the library's SOURCE: themes/<theme>.json (the ideas, EN + ES), themes.json (42 themes, synonyms),
                               vocab.json, validate.mjs, selftest.mjs, examples.json, SCHEMA.md (fields, search), WRITERS.md (quality bar)
netlify/functions/gifts.mjs    Spiritual Gifts results server + email (gifts-1.2, Netlify Blobs)
netlify/functions/gifts-sweep.mjs  daily scheduled purge of expired gifts results
netlify/functions/register.mjs  first-page registration (name, email, church, role), register-1.1
netlify/functions/present.mjs   Make the Case live slideshows: decks in Blobs, slide pointer via Firebase, "I'm in" answers (present-1.1: a verse on every slide, the "place" slide)
netlify/functions/present-sweep.mjs  daily purge of expired presentation rooms
FIREBASE-RULES-TERRAIN.txt     rules for the separate Firebase project `terrain-live` (no client writes)
FIREBASE-SETUP.md              click-by-click setup of that project for the pastor
README.md                      (in the GitHub repo; not part of this hand-over folder)
CLAUDE.md                      this file
package.json                   @netlify/blobs (functions); jsdom + jspdf (tests)
tests/                         64 suites + runner + fixtures (case-quotes.json: the verified verse/EGW library; scripture-bg.json: Bible Gateway's
                               KJV + RVA 1909 text of every passage the app quotes; topic-ideas.json: a stubbed AI answer)
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

## Current state (29 Sep 2026)

| | Live on pastorshub.org (verified 29 Sep 2026) | Handed over |
|---|---|---|
| `index.html` | **v10.39.0** | **v10.40.0** — commit the whole folder (see Open work 1) |
| `present.mjs` | **present-1.0**, `live:true`, `fb:ok` | **present-1.1** (optional verse on every slide, the new `place` slide; a v10.39 deck is stored exactly as before) |
| `register.mjs` / `gifts.mjs` | **register-1.1** / **gifts-1.2**, census registration gate on | same |
| `advise.mjs` | **advise-2.1** ✓ | **advise-2.2** (topic mode for the Idea Library; no `temperature`; every mode leaves room for thinking and asks for effort `low`) |
| `ideas/` | — | **2,249 ideas in 42 themes**, EN + ES (build hash `e677d04959f8`), from `tools/ideas-src` |

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

**v10.40.0 — Make the Case: remembers the church, shows the departments, swipes sideways, persuades with Scripture and the place.**
The pastor (voice-to-text, 29 Sep 2026), after presenting the v10.39 sample with live follow working on his phone:
*"On Make the Case, I remember before it had all the different departments and now I don't see any departments…
It's even asking for the address. Shouldn't it already have it…? Why would there be two places to put your address?
… I would prefer having the slides swipe left, because that's more natural and easier to control. I really like the
look. It's great to have eight slides, but the slides need to be more persuasive by using Scripture, as well as
making sure it's really giving the unique application to the community that the church is in."*
Built by three builders in parallel and merged (integration notes in the build session's scratchpad `v40/INTEGRATION.md`):
- *One place to type an address.* The survey result lived in memory only, so after any reload every tool showed the
  survey's address box again. Now the church in the church store (`uChurch().address`, already saved by every
  survey) is re-surveyed quietly when Make the Case, the Planner or Spiritual Gifts opens with no survey on screen:
  `run(getGeo,{quiet:true})` (no status text, no scroll, no focus change, Map it never locked, **never `autoIdeas`**,
  so a reload generates and bills nothing); lookups numbered (`RUN_SEQ`), newest wins. Block "THE CHURCH,
  REMEMBERED": `HOME_UI`, `HOME_ST`, `homeEnsure()`, `homeAfterRun()`, `homeLine()` ("{church} · {address} · Change
  church" under the tool bar), `homeFirstHTML()` ("First, map your church's neighbourhood" + Recent chips when never
  mapped), failure = one sentence + Try again + Change church (own sentence for a refused registration). A reload
  inside Make the Case (also the ES/EN button) reopens it. "Use my location" surveys are remembered too since part 2
  (their coordinates and the Census's name for the place; see below).
- *Departments visible.* Step 2 "Who are you making the case to?" shows all 23 `CASE_GROUPS` at once as icon tiles
  (`CASE_AUD_UI`, `CASE_AUD_ICONS`, `caseAudIcon()`) under Board & officers (5) · Ministry teams & departments (17) ·
  The whole church (1), even before a ministry is chosen; one tap = group and kind (`caseSetPrefs`). Desktop 4
  columns, phone 2 (icon above the name), equal heights in EN and ES.
- *Slides move sideways* (every view: presenter, members following, browse, sample, builder preview). `.td-scroller`
  is one row (`scroll-snap-type:x mandatory`); swipe left = next. `tdeckRender` owns the moves: `jump()` sets
  `scrollLeft`; `settle()` on `scrollend` or 140 ms idle (iOS); nothing decided while a finger is down (a presenter's
  move is held, `st.defer`); a deliberate swipe that would spring back on a wide screen is finished
  (`TD_TOUCH_PX` 48 px / 18 %); mouse drag and wheel move one slide; keys → PageDown ↓ Space / ← PageUp ↑
  Shift+Space, Home, End (clickers). Position dots `.td-pager` at the top (current = mint bar; the presenter's slide
  gets a ring when a member is away). Follow / "Back to live" / op go unchanged.
- *Scripture on every content slide* (a verse foot, `tdVerseFoot`, between body and source): `CASE_VERSES` (51, KJV /
  RVA 1909), `CASE_EGW` (8), `CASE_VERSE_PLAN`, byte-identical to `tests/case-quotes.json` (verified research
  file). `caseVersePlan()` chooses by the slide's job and the ministry's need, never twice in a deck, the same verses
  in EN and ES, a verse passed over (never cut) when it does not fit. Ellen White: at most one on the slides (the
  congregation's close, MH 143 "Christ's method alone…" / MC 102); board and team lines go to the handout.
- *The place:* a "Here in {town}" slide (`type:'place'`) in every deck (`casePlaceSnap`, `casePlaceBuild`,
  `TD_BUILD.place`): headline naming the town, where to look first (ZONES; direction + distance only), figures no
  other slide shows (town vs county, "clearly higher" only when significant), who already serves nearby (HELP, named,
  with distance — "we come alongside"), what only this church brings (counts only). Anything missing is left out;
  a HELP / ZONES load for another church is ignored. With no place data the old "why here" trio comes back.
  Board: join · motion · need · place · capacity · ability · ask · risks · timeline (9); congregation now 9.
  HELP and ZONES arrive after the survey: `casePlaceArrived()` rebuilds the slides (not while he types in the edit
  panel — then on leaving the box or before Present / Share / PDF); `caseAct` waits at most 4 s for them.
- *Handout (`casePdf`):* a "Here in {town}" section on the front, "Scripture in this case" + the EGW line on the back.
- *Server:* `present.mjs` → **present-1.1**: optional `verse:{text,ref}` on every content slide, the `place` slide
  (where, facts ≤ 3, partners ≤ 3, bring ≤ 3); every limit kept (≤ 12 slides, ≤ 64 KB, strings ≤ 400, no markup).
- *Integration fixes:* the densest place slide (where + two figures + verse, Spanish board decks) ran 7 px past
  the frame: its where-to-look source is now named in the short form; a flaky present-function test (a "tampered"
  token that was sometimes unchanged) made deterministic; `tests/v40-integration.test.js` joins the three parts
  end to end.
- *Checked in headless Chrome:* 1058 decks + 506 with realistic places at 360×640, 0 overflow (a few dense Spanish
  slides draw at fit 0.75–0.8); screens at 390×844 and 1280×800, EN and ES. **Not yet checked on a real iPhone.**

**v10.40.0 (part 2) — the Idea Library, "More ideas for {town}", and accuracy.** Built by two builders in parallel
and merged (integration notes in the build session's scratchpad `v41/INTEGRATION.md`). The pastor: *"There aren't enough ministry
ideas… I put Prayer and only three came up… if I say Prayer there should be 50 different things for prayer a church can
do… feeding the homeless, so many amazing, unique and new ideas"*, *"with the kids we have to be careful not to be asking
for praying for kids"*, *"sitting at the porch of your church where nobody walks by is not a great idea… make sure we use
social media"*.
- *The library:* 2,234 ideas in 42 themes (50–56 each, EN + ES; 2,249 after the review pass, homeless 71), written by agents against the pastor's words and a
  strict validator, kept in `tools/ideas-src/` (SCHEMA.md, WRITERS.md, themes.json, validate.mjs, themes/*.json).
  `node tools/build-ideas.mjs --src tools/ideas-src` runs their validator and writes `ideas/`; it writes nothing if the
  validator fails (`--skip-invalid` ships only the ideas that pass) and refuses ids/tags that clash with this app.
- *Loading:* nothing until the pastor searches or browses (members on `#gifts=` / `#watch=` never fetch it); the index
  (~640 KB raw) once per session (sessionStorage), a theme's text when its ideas are shown, words.json only for a search
  that names no theme. Offline or missing: one sentence + Try again.
- *Search* in the survey's ministries ("Find a ministry") and Make the Case step 1: theme names and synonyms, EN and ES,
  accents/case/filler folded ("prayer ministry", "oración", "feeding the homeless" → hunger + homeless), then words.
  Built-ins are matched by their names too. *Ranking:* the theme's own ideas first, then cross-listed; 2·need +
  boost (profile tags) + 10 if `uCheck` fits + size bonus; sizes and kinds take turns. Pages of 12; filters size, kind,
  ages, "Fits the Sabbath", "Online or social media". *Browse:* "Idea library" → 42 theme tiles with counts.
- *Cards:* name, description, size/people/cost/where/Sabbath, the four steps, "Why here" only from real figures when a
  need tag fires (the survey's own rule sentence, else one figure), the children's safeguarding line, capacity line;
  "Add to our plan" (same capacity check as built-ins) and "Make the case for this". A chosen idea is saved with the
  church (`uChurch().lib[id]`) and joins `uCatalog()` through `libToCatalog()` (requirements, why, nEs), so uReq /
  uCheck / caseModel / caseDeck / casePdf / Spanish slides all work. Its theme sets Make the Case's kind (`LIB_CASE_KIND`).
- *"More ideas for {town}" (AI):* six at a time from `advise.mjs` mode `topic` in the library's shape and the page's
  language, checked by the library's rules on the server (repaired or rejected), saved once per church + topic
  (`uChurch().fresh`), guarded like `AUTO_RUNNING` (`LIB_AI_RUNNING`), at most 30 per topic, marked "Fresh idea (AI)".
  Locked device: one line on `?ai=`. advise-2.2 also stops sending `temperature` in the moves mode (current models
  refuse sampling parameters with a 400 that read as "model name not accepted").
- *Scripture word for word.* All 90 passages the app quotes were fetched again from Bible Gateway (KJV, RVA 1909) into
  `tests/scripture-bg.json`; every Scripture string in `index.html` (10 tables, 248 texts: `SCRIPTURE` / `_ES`,
  `CASE_QUOTES`, `CASE_VERSES`, `GF_DEEP` / `_ES`, `GF_VERSES` / `_ES`, `GF_VERSE_SET` / `_ES`) is now verbatim with every
  omission marked "…" (the gifts tables' own "..."). 54 were not, e.g. Nehemiah 2:18 "Then said I unto them", the
  Spanish Isaiah 58:7 now the whole verse. `tests/v40-accuracy.test.js` holds each one to the fetched text.
- *Ellen White:* `EGW.faith` ("Our neighbors are not merely our associates…") is **Welfare Ministry, p. 45** (from the
  Review and Herald, 1 Jan 1895), not The Desire of Ages (exact-phrase search on egwwritings.org, 29 Sep 2026); the
  words are unchanged. Spanish: *El Ministerio de la Bondad*, p. 49 (`EGW_ES`, `egwHTML()`).
- *The nine groups' own verses are back* (1 Pet 5:2, 1 Cor 4:2, Acts 6:3, Deut 31:12, Prov 31:20, Prov 27:17, Heb 13:2,
  Eccl 11:6, Rom 16:5): `CASE_VERSES` has 60 (= `tests/case-quotes.json`), and `CASE_VERSE_HOME` lists each group's
  slides in order of preference (the congregation's Nehemiah 2:18 moved to the "I'm in" slide).
- *Who already serves here:* six more `HELP_CATS` (senior centres & care, clinics, social & family services, immigrant &
  language help, youth organisations, libraries & community centres), EN + ES, each with three checked directory links;
  one classifier `helpCatOf()`; still **one** Overpass request at 3 miles (timeout 12 → 15 s). Schools, playgrounds,
  childcare, private or academic libraries and event halls are never listed. Township offices and fire / police
  stations were fetched but dropped before; now they are listed. The place slide ranks partners by relevance, then
  distance (`CASE_PLACE_CAT`, `CASE_PLACE_KIND`), labelled by kind ("Senior centre or care", "Public library"…), with the
  same "Already serving here · we come alongside" wording. Library ideas reach the right partners through their theme.
- *"Use my location" remembered:* the Census coordinates answer carries no point of its own, so `geo.coords` was
  undefined, the church was never remembered and HELP / ZONES never loaded. `geocodePoint()` now keeps the point (5
  decimals, as `#ll=`) and the Census's place name (`label`, "Warminster Township, Bucks County, PA"), used by the church
  line and the quiet reload.
- *The "I'm in" slide:* once a member picks, the two other answers show only their names (still tappable), so the note
  row fits (it clipped by up to 27 px, English and Spanish).
- *Integration (part 2):* one library idea quoted Proverbs 17:22 in Spanish in the Reina-Valera 1960 wording — the source
  now has the RVA 1909 text and the English marks the words left out; the writers' source moved into the repo
  (`tools/ideas-src`) and `idea-library-build.test.mjs` rebuilds from it and compares every shipped file byte for byte;
  advise.mjs moves and prose modes now leave room for thinking (the default model always thinks, and thinking counts
  against `max_tokens` — the old 700 + 550 per idea could cut a list off), ask for effort `low`, keep the whole ideas of
  a list cut off anyway, and say a refusal in one sentence; the survey's "Idea library" button sits on the search box's
  line; the section chips (`#secnav`) no longer make phone pages 4 px wider than the screen.
- *Checked in headless Chrome* (390×844 and 1280×800, EN and ES): "prayer" / "oración" in the survey and Make the Case
  (84 ideas: 55 own + 29 cross-listed), the 42 theme tiles, a theme's list, a card opened, a library idea's whole deck
  (9 slides, 0 overflow), the AI button locked / no key / unlocked (stubbed), place slides with the new partner kinds
  (built-ins and library ideas), the Spanish "I'm in" slide with the note open. **Not yet checked on a real iPhone.**

**v10.40.0 (review pass, 29 Sep 2026) — what three independent reviewers found, fixed before delivery.** Record: the build
session's scratchpad `v41/FIXES.md`. Pinned by `tests/v40-review-lib.test.js` and `tests/v40-review-app.test.js` (each
fix was also undone once to see the suite fail).
- *Library decks led with children and the wrong verse* (the blocker): many library ideas carry only "fits anywhere" tags, so
  `caseBuild` borrowed the group's emphasis or the children's share and `caseVersePlan` followed it ("Suffer the little
  children" for teaching members to pray with a stranger, Isaiah 58:7 for tear-off prayer flyers). Now a library idea or an AI
  draft is argued only from its own figures (else no need slide); an idea not about children (`caseChildOk`) never shows a
  children's figure, the neighbours slide's children dots, Mark 10:14, John 6:9 or Proverbs 22:6 (`CASE_CHILD_VERSES`); its
  deck opens with its theme's verse (`CASE_LIB_THEME_VERSE`, verified verses only: prayer Jeremiah 29:7, literature Habakkuk 2:2,
  small groups Romans 16:5…); `changing` is a need only for the immigrants theme; with no need, "where to look" shows where
  many neighbours live.
- *Search:* synonyms are folded like the query (filler, possessives): all 1,507 now open their own theme (139 did not:
  "children's ministry", "dar de comer", "Signs of the Times"…); "visitation" joins seniors. A theme query matches built-ins by
  name only (the backpack giveaway no longer answers "prayer"); a line under the box, "84 ideas in the Idea Library for
  “prayer” ↓" (`libJump`), jumps to them; the counts beside Make the Case's box are the matches. "Feeding the homeless" ranks
  ideas covering both themes first (`libRank` `rel`), and the homeless theme has 15 new ideas that feed people where they
  are (outreach sack lunches, Code Blue suppers, diner meal cards, Sabbath lunch on the park benches…), cross-listed to hunger.
- *"Why here"* for the ten-year tags never quotes the survey's race-shift sentence (it was on 49 of 84 prayer cards).
- *Place slide:* "the need is greatest right around our church" became "the need runs higher right around our church", and
  only when where-to-look agrees (`zone.home`); "1 member whose gifts fit" (not "1 members").
- *Handout and slides:* library budget lines in Spanish ("estimación de la Biblioteca de ideas"); no made-up "Places 8" for
  ideas nobody sits at (`x.seats`, `LIB_SEAT_WORDS`; the team and youth asks have seat-free wording); file names carry the
  audience and keep hyphens ("…-Tear-off-prayer-flyers-on-community-boards-board-2026-09-29.pdf"); "1 teléfono".
- *Library content (source, re-packaged):* Numbers 6:24 and Psalm 46:1 word for word (KJV / RVA 1909, fetched into
  `scripture-bg.json`; `v40-accuracy` now checks every quoted verse in `tools/ideas-src`); no church-hosted dancing (two
  "prom" ideas); four ideas that waited for passers-by moved to where people are; a crisis line and the reporting policy on the
  anonymous teen questions; two adults and parents' consent in three youth ideas; nothing bought in Sabbath hours; a Part 15
  FM micro-transmitter; two self-contradictions. The built-in "prayer box" now sits where people wait (laundromat, library).
- *AI (advise-2.2):* both prompts forbid quoting Scripture or Ellen White; `quotesScripture` refuses such an idea in the
  topic and the moves modes.
- *Code:* `loadZones` has a request token and a 25 s limit (church A's late blocks were drawn under church B, and a silent
  TIGERweb stalled every Present); a hub reload's own #a= prefill is not "typing another address" (`ADDR_PREFILL`); a kept
  index from an earlier deploy is renewed by a word search too (`libRenew`), and the build hash covers the index and words;
  the Planner's church is the church's name (`planChurchName`); the department tiles share one height (`caseAudEqual`);
  "neighborhood" on the Make the Case screen as in the library below it.
- *Final check (29 Sep 2026):* two prayer ideas for everyone (a street prayer walk, a quiet tent at the county fair) still
  carried the need tag `families`, so `caseChildOk` counted them as about children and their board decks read "About 1 in 4
  people around us is a child" beside Mark 10:14. `families` moved to `boost` in the source (ranking only), re-packaged
  (hash `e677d04959f8`), pinned in `v40-review-lib`. The `present.mjs` header comment now says present-1.1.
- *Last two changes before hand-over:* a library or fresh idea (`x.lib`) no longer needs a census figure to pass `uCheck`
  (he must be able to add a prayer idea he likes; figures still rank it and argue its case; built-ins keep the rule), and
  step 1 of Make the Case links down to the 23 department tiles (`deptJump`, `[data-cs-deptjump]`) until a ministry is
  chosen, because on a phone the tiles sit about three screens down. Tests in `idea-library` and `case-screens`.

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
advise-2.2 (v10.40.0) found one more reason it may never have worked: the moves
mode sent `temperature: 1`, which the default model refuses with a 400 (shown as
"That model name was not accepted"). It is removed, and every mode now asks for
effort `low` with room for thinking inside `max_tokens`. Still unobserved live.

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
blocks and every function first, then runs all 64 suites.

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

`tests/` holds 64 suites and `run-all.js`. They load `../index.html`
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

**Make the Case** (v10.39–v10.40)
- `caseModel(ministry,{type,group})` → `caseDeck(model)` (typed slide JSON) → `tdeckRender(deck,host,{mode})` (present / follow / browse; sideways row)
- Screens: `caseMount`, `caseDraw1` (ministry), `caseDraw2` (the 23 group tiles), `caseDraw3` (preview + edit + actions), `casePvMount`, `caseAct`
- The church remembered: `homeEnsure()` → `run(getGeo,{quiet:true})` → `homeAfterRun()`; `homeLine()`, `HOME_ST`
- Scripture and the place: `CASE_VERSES` (60) / `CASE_EGW` / `CASE_VERSE_PLAN` (= `tests/case-quotes.json`), `CASE_VERSE_HOME` (each group's slides, in order of preference), `caseVersePlan()`, `casePlaceBuild()` (partners: `CASE_PLACE_CAT`, `CASE_PLACE_KIND`, relevance then distance), `casePlaceArrived()`
- Who already serves (survey + place slide): `HELP_CATS` / `HELP_ES` (12 groups), `helpCatOf(tags)` (one classifier, most specific first), `fetchHelp()` (one Overpass request, 3 miles, 15 s); Ellen White outside the slides: `EGW` / `EGW_ES` / `egwHTML(k)`
- Leave-behind: `caseHandout()` → `casePdfDoc()`; live: `caseOpenPresenter`, `#watch=` (`watchRender`), `present.mjs`

**Idea Library** (v10.40.0; block "THE IDEA LIBRARY" beside `uCatalog`)
- Data: `LIB` (`libLoadIndex`, `libLoadTheme`, `libLoadWords`; `/ideas/`, generated from `tools/ideas-src`), `libAdopt` (index rows → objects)
- `libFold` / `libCore` (the query and every synonym folded alike), `libSearch(q)` (SCHEMA.md "Search"), `libThemeQuery` + `libQueryMatch` (built-ins by name for a theme query), `libRank` (words mode: themes covered, then words, then score; home first, variety), `libFilter`, `libJump` (the line under the box), `libRenew` (a kept index from an earlier deploy)
- `libToCatalog(raw)` / `libLite(row)` / `libCatalog(ch)` / `libSave(raw)`; `libWhyText` + `LIB_TAG_EV` ("Why here"; the ten-year tags never use RULES, `changing-any`); `x.seats` (`LIB_SEAT_WORDS`)
- In Make the Case: `caseChildOk(x)`, `CASE_CHILD_VERSES`, `CASE_LIB_THEME_VERSE` (a library idea's theme verses, tag `lib:<theme>` in `caseVersePlan`)
- Screens: `libMount('survey'|'case')` into `#u-lib` / `#cs-lib`, `libDrawTiles`, `libDrawList`, `libCardHTML`, `libWire`; `LIB_UI`
- AI: `libAiMore` → advise.mjs `mode:'topic'` (`libCheckIdea`, `TOPIC_SYSTEM` there), `libFreshAccept`, `uChurch().fresh[topic]`

**Spiritual Gifts**
- `GIFTS` (21, 5 statements each; ES in `GIFTS_ES`), `GF_ORDER` (105 interleaved statements), `gfScores(a, obs)`, `gfProfile()`, `gfFlags()`
- `GF_HEART` (12), `GF_NEEDS` (38 survey needs → gifts/heart/role), `GF_NEEDS_YOUTH`, `GF_YOUTH_MIN`, `GF_TRY` / `GF_TRY_YOUTH`
- `gfReportModel()` → `gfReportHTML()` / `gfReportPDF()`; `gfChurchNeeds()` + `gfRenderChurch()` for the congregation grid
- Server client: `gfStatus`, `gfCampaign`, `gfSubmit`, `gfSync`/`gfPull`, `gfInvite`/`gfPeek`/`gfConfirm`, `gfGet`, `gfEmailReport`, `gfMailPdf`; routes `#gifts=`, `#gifts-confirm=`, `#gifts-report=`
- `gfRenderRoster()` — the pastor's landing: two doors, results, folded back-office
- `gfEncode()` / `gfDecode()` — the `TG1-` result code members can paste
- `GF_FN` = `/.netlify/functions/gifts` — exists from v10.37.0; without it everything falls back to pasted `TG1-` codes (v1–v4 all decode)

---

## Adding or changing ideas

Never edit `ideas/`. The source is `tools/ideas-src/`; its `SCHEMA.md` gives every field and limit (and the search
rules), `WRITERS.md` the quality bar, the pastor's own words, the children's rules ("never ask for or pray about named
children", no school gates or playgrounds, screened adults and the two-adult rule) and "go where people are" (not the
church porch; cards, prayer walking, social media done as a neighbour).
1. Edit or add ideas in `tools/ideas-src/themes/<theme>.json` (ids `<theme>-<slug>`, never a built-in id). A new theme
   also needs an entry in `themes.json` (id, EN/ES names, scope, `not`, synonyms, tags) and 50+ ideas.
2. `cd tools/ideas-src && node validate.mjs themes/<theme>.json` (read the REVIEW lines too), then
   `node validate.mjs --all` (unique ids, no near-duplicate names across themes, unambiguous synonyms).
   (The review pass kept the writers' working copy in the build session's scratchpad `ideas/` and packaged it with
   `v41/fix-work/package.sh`: vocab refresh, selftest, `--all`, copy into `tools/ideas-src`, build. Editing
   `tools/ideas-src` directly and running steps 2-4 is the same thing.)
3. From the repo root: `node tools/build-ideas.mjs --src tools/ideas-src` — it writes nothing if anything fails.
4. `npm test`: `idea-library-build.test.mjs` rebuilds from `tools/ideas-src` and fails if `ideas/` differs by one byte;
   `v40-review-lib.test.js` types every synonym as a query (each must open its own theme, and only it); `v40-accuracy` holds
   every quoted verse near a reference to `scripture-bg.json` (add the passage there, fetched, before quoting it).
5. If `profile()` tags, `U_SKILLS` or `U_FAC` change in `index.html`, refresh the validator's copy:
   `node validate.mjs --vocab ../../index.html`.

Scripture inside an idea follows the house rule: KJV / RVA 1909, word for word, omissions marked "…", with the reference
beside it. No church-hosted dancing (Church Manual 2022, p. 155), nothing bought or sold in Sabbath hours, nothing that waits
for passers-by at the building.

**Search** (SCHEMA.md "Search"): the query is folded (case, accents, filler such as "ministry", "ideas para"); a theme
name or synonym in either language opens that theme plus the ideas cross-listed to it (`also`); synonyms are folded the
same way (filler, possessives); synonyms found inside the query open several themes ("feeding the homeless" → hunger +
homeless, ranked by how much of the query each idea covers); otherwise every word must appear in a name or description
(`ideas/words.json`, loaded only then). The build hash covers the theme files, the index and the words.

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
- **Slides move sideways** (his request, v10.40): swipe left = next, right = previous; portrait 360×640 frame,
  one idea per slide, nothing scrolls inside a slide, nothing moves on its own.
- **One place to type an address: the Community Survey** (his request, v10.40). Other tools reload the remembered
  church quietly and show a slim "{church} · {address} · Change church" line, never a second address box.
- **Every content slide carries one verse** (KJV / RVA 1909, verbatim, from the verified library only), and every
  deck has a "Here in {town}" slide built only from real data (his request, v10.40).
- **Scripture verbatim everywhere** (v10.40): KJV / RVA 1909 exactly as Bible Gateway prints them, every omission marked
  "…" ("..." in the gifts tables), held by `tests/v40-accuracy.test.js` against `tests/scripture-bg.json`. Add a new
  passage to that file (fetched, never typed) before quoting it.
- **A library idea's deck speaks to its own theme** (v10.40 review): its own figures only, its theme's verse first, and never
  children's figures or children's verses when the idea is not about children ("with the kids… it sounds weird").
- **Many ideas, creative and specific** (his request, v10.40): a search for a topic shows 50+ ideas, never a thin list.
  Ideas go where people are (not the church porch), use social media as a neighbour, never ask for or pray about
  people's children by name, and are data in `tools/ideas-src`, not code.

---

## Open work, prioritised

1. **Commit v10.40.0 — the whole folder, not just index.html** (`index.html`, `netlify/functions/present.mjs` and
   `advise.mjs`, `FIREBASE-SETUP.md`, `ideas/`, `tools/` with `ideas-src/`, `tests/` including `case-quotes.json` and
   `scripture-bg.json`, `CLAUDE.md`; never `node_modules/`). The folder is **179 files**; GitHub's web upload takes at
   most 100 at a time, so upload `ideas/` + `tools/` (94) first and the rest (85) second, or use GitHub Desktop. Then
   confirm the badge **v10.40.0**, `/.netlify/functions/present` → `"fn":"present-1.1"`, `"live":true`, `"fb":"ok"`,
   `/.netlify/functions/advise` → `"fn":"advise-2.2"`, and that `https://pastorshub.org/ideas/index.json` loads. Type
   "prayer" in the survey's "Find a ministry" (84 ideas) and open one theme. Map a church with "Use my location", reload
   inside Make the Case (the church line names the township). Look at the survey's Community resources and a deck's
   "Here in {town}" slide with the live Overpass (the query is larger now; time it once). On his phone: open Make the Case
   after a reload (the church line, no address box; the departments grid), present the sample and swipe left /
   right on a real iPhone (iOS has no `scrollend`; settle relies on touchend + 140 ms — only checked in headless
   Chrome), and look at a real deck's "Here in {town}" slide with the live Census and Overpass.
   Done and verified live on 29 Sep 2026: v10.39.0, present-1.0 with Firebase (`live:true fb:ok`, phones follow),
   register-1.1, gifts-1.2, `TERRAIN_REG_SECRET` set (census gate on). Spark plan caps Firebase at 100
   simultaneous phones across all churches; move to Blaze with a budget alert before wider use. Email stays OFF by the pastor's choice (`GF_EMAIL_ENABLED`);
   when he wants it: Resend account → verify pastorshub.org DNS → `RESEND_API_KEY`, `GIFTS_FROM` → flip the flag.
   **Resolved (29 Sep 2026):** the EGW quote in `EGW.faith` ("Our neighbors are not merely…") was credited to DA 503;
   an exact-phrase search on egwwritings.org finds it in Welfare Ministry p. 45 (also Christian Service, My Life Today
   232, Reflecting Christ 229, RH 1 Jan 1895), not in The Desire of Ages. The credit now reads Welfare Ministry, p. 45
   (Spanish: El Ministerio de la Bondad, p. 49). He may still check it against his own books.
2. **Watch the first real AI run.** Save a profile on the live site with a key
   set; confirm ~60 ideas arrive, each with steps, and that the timing is
   inside Netlify's 60 s per call. If calls time out on Opus, set
   `ADVISE_MODEL=claude-sonnet-5`. advise-2.2 is the first version that sends no
   `temperature` and asks for effort `low`; both the background ideas and "More
   ideas for {town}" (six on one topic; how many the rules reject is unknown)
   are unmeasured with a real key. No server-side refusal fallback is set (it
   would change model routing and billing); a refusal shows one sentence.
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
10. **Make the Case follow-ups (v10.40).** Done in part 2: the nine groups' verses, more kinds of partner, the yes
    slide's note row. Still open: no Ellen White line on board / team slides (no room beside a verse; the handout has
    it). On the place slide a partner whose name is over 40 characters takes two rows, so a nearer long-named partner
    can give way to a farther one (the handout lists both). Partners are ranked by relevance before distance, so the
    rows do not always read nearest first (deliberate). Nursing homes and assisted living count as "Senior centre or
    care"; he may want centres only. Only `EGW.faith` has Spanish in the old `EGW` table.
11. **Idea Library follow-ups (v10.40).** Watch the first real "More ideas for {town}" run (item 2). The survey's gap
    sentences are Spanish on library cards only (uRow and the plan are still English). A Spanish fresh AI idea shown in
    an English deck keeps its Spanish name with no note. Where a search spans several themes, fresh AI ideas are filed
    under the first. (The "changing community" reason on generic cards was fixed in the review pass.) Still open from the
    review pass: a library idea with no figure of its own now has no need slide (8 slides, not 9), and its ability slide
    counts gifts by its first census need, which for generic ideas is often "growth"; a theme → gifts map could do better.
    The Scripture on a slide cannot be changed in the edit panel (by design: only verified verses); if he wants a choice,
    offer other verified verses for that slide's job, never free text. The survey's built-in rows still squeeze long names
    on a phone (item 12). Seen in the final check: an idea whose need tags fire nowhere in this survey shows "this survey
    shows no figure behind it here" and a greyed "Add to our plan" whose tooltip blames the church profile (10 of the 84
    "prayer" ideas in the test survey, e.g. the county-fair tent); Make the case still works. On a phone, step 2 (the 23
    department tiles) sits about three screens down, below step 1's ministry list. The library check for quoted
    Scripture needs a reference within 80 characters or an archaic word (LORD, thee, Jehová): a modern-English
    quotation with no reference nearby would still pass unnoticed.
12. **Seen during the v10.40 integration, older than it:** on a phone the built-in ministry rows squeeze the name into
    a narrow column (a long name wraps to five or six lines); the ministerial-councils note in Community resources
    draws "Churches nearby" as a heading in mid-sentence; Spanish pages still show the built-in ministry names in
    English in the survey's list (item 8).

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
- Wants files he downloads named with the version (`index-v10.40.0.html`); for
  commits, the version goes in the message.
- Prefers big coherent changes over many small ones, but wants to see them
  work. Report what changed, what was tested, and what couldn't be.
- Say plainly when something is broken, including your own mistakes.
