# Terrain — handover for Claude Code

This file is read automatically when Claude Code opens the repo. It is the
working memory of the project: what it is, how it is built, what has been
decided, and what is still open. Keep it current — update it in the same
commit as any change that alters something written here.

**This repository is public.** Nothing secret goes in this file, in code, or
in commit messages. See [Security](#security--this-repo-is-public).

---

## Read this first

1. **One file.** The whole app is `index.html` (~2.4 MB). No build step, no
   framework, no bundler. Two `<script>` blocks. Edit it in place. The one
   exception is data: the Idea Library's `ideas/` is **generated** from
   `tools/ideas-src/` by `tools/build-ideas.mjs` — never edit `ideas/` by hand
   (see [Adding or changing ideas](#adding-or-changing-ideas)).
2. **Deploy = commit to `main`.** Netlify is wired to this repo and publishes
   every push in about a minute. There is no separate server to upgrade.
3. **Run the tests before and after every change:** `npm install` once, then
   `npm test`. 71 suites, 5588 assertions, all green at v10.41.1 (about 6 minutes).
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
netlify/functions/advise.mjs   the model behind the prose plan, new ministry ideas and "More ideas for {town}" (advise-2.2; never called "AI" on screen)
ideas/                         the Idea Library as the page loads it: index.json, words.json, <theme>.json (GENERATED, never edit)
tools/build-ideas.mjs          packs tools/ideas-src into ideas/ after the writers' validator passes (see "Adding or changing ideas")
tools/ideas-src/               the library's SOURCE: themes/<theme>.json (the ideas, EN + ES), themes.json (57 themes, synonyms),
                               reach.json (in / out / both for the 2,249 ideas written before `reach` existed),
                               vocab.json, validate.mjs, selftest.mjs, examples.json, SCHEMA.md (fields, search), WRITERS.md (quality bar)
netlify/functions/gifts.mjs    Spiritual Gifts results server + email (gifts-1.2, Netlify Blobs)
netlify/functions/gifts-sweep.mjs  daily scheduled purge of expired gifts results
netlify/functions/register.mjs  first-page registration (name, email, church, role), register-1.1
netlify/functions/present.mjs   Make the Case live slideshows: decks in Blobs, slide pointer via Firebase, "I'm in" answers (present-1.2: the `conference` audience; 1.1: a verse on every slide, the "place" slide)
netlify/functions/present-sweep.mjs  daily purge of expired presentation rooms
FIREBASE-RULES-TERRAIN.txt     rules for the separate Firebase project `terrain-live` (no client writes)
FIREBASE-SETUP.md              click-by-click setup of that project for the pastor
README.md                      (in the GitHub repo; not part of this hand-over folder)
CLAUDE.md                      this file
package.json                   @netlify/blobs (functions); jsdom + jspdf (tests)
tests/                         71 suites + runner + fixtures (case-quotes.json: the verified verse/EGW library; reach-builtins.json: the built-ins' reach; scripture-bg.json: Bible Gateway's
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
| `TERRAIN_AI_PASS` | advise.mjs | Optional passphrase. The pastor unlocks a device once with `?ideas=PASSPHRASE` (v10.41; the old `?ai=` still works, and the page shows only `?ideas=`). |
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

| | Live on pastorshub.org (29 Sep 2026) | Handed over |
|---|---|---|
| `index.html` | **v10.40.0** (commit 43306de) | **v10.41.1** (v10.41.0 and three follow-ups) — commit the whole folder (see Open work 1) |
| `present.mjs` | **present-1.1** (with v10.40.0) | **present-1.2** (`conference` audience type; no new slide type; every limit and every older deck unchanged) |
| `register.mjs` / `gifts.mjs` | **register-1.1** / **gifts-1.2**, census registration gate on | same |
| `advise.mjs` | **advise-2.2** | same (its error strings still say "AI", but the page never shows them) |
| `ideas/` | **2,249 ideas in 42 themes** (`e677d04959f8`) | **3,050 ideas in 57 themes**, every one with a reach (634 in · 2,163 out · 253 both), EN + ES (build hash `f2cc1121c190`), from `tools/ideas-src` |

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

**v10.41.0 — Make the Case in three clear steps, ideas tailored to each group, in-reach and outreach, the Adventist
departments and the conference, no "AI" wording.** The pastor, after using v10.40.0 live (voice-to-text, 29 Sep 2026):
*"I don't want AI to be seen anywhere, because people are scared of it sometimes… When I choose, say, Prayer Ministry or
another ministry, the answer should be tailored to that ministry's focus… the greeters have their own ideas. Greeters can
keep names and information so that when people are missing… they send a card or call… The page is hard to take in: a lot of
words, almost overwhelming. 'Who are you making the case to?' should be first. The three steps must be definable… Board &
officers should be a different colour… Why do I type Prayer under 'What are you proposing?' and get four things, then 84
things underneath? Out of order."* He approved a clickable mockup, then added: *"we can separate ministry ideas by in-reach
or outreach for each one, so they can see: what can I do for God's people, but also what can I do for the community?"*,
*"worship and music for sure, children's Sabbath School, Pathfinders, Adventurers… all the things we would have as a
denomination. We also have an evangelism team"*, and *"we can appeal to the conference leaders for an EVANGELISM proposal.
This has to be done differently, because these are the administrators of the conference, who oversee all the pastors."*
Built by two builders in parallel (page side U, deck side D) and merged; the ideas by a separate writers' workflow;
integration notes in the build session's scratchpad `v42/INTEGRATION.md`.
- *Three framed steps* (`caseMount`): a step bar (`#cs-bar`, `caseStepBar`: done / now / next, a tap jumps) over
  **1 Who is it for?** (`caseDraw1`) → **2 What will you propose?** (`caseDraw2`) → **3 Your slides** (`caseDraw3`); each
  frame a big number, a title and ONE short line (`CASE_STEP_UI`). The lead paragraph, the ranked built-in cards, the
  department link and the "All / Can staff now" toggle are gone; step 3's notes fold under "About these slides".
- *Step 1, the groups in coloured sections* (`CASE_AUD_LAYOUT`, `CASE_AUD_SECTIONS`, `CASE_AUD_SUBS`, `CASE_AUD_NOTE`,
  `caseAudSections`): **Decide** (gold) · **Ministry teams** (violet: Worship & learning · Children & youth · Outreach &
  evangelism · Care & family) · **On Sabbath** (mint) · **The conference** (blue). Tiles are a coloured dot and the name
  (no icons any more), 4 a row / 2 on a phone, equal heights, never hyphenated. A group not in the layout is placed by its
  type ("More teams" for a team). 34 groups (table below).
- *Step 2, one list tailored to the group* (`CASE_GROUP_THEMES` → `caseGroupList` → `libMount('case')` group mode): the
  Idea Library's cards (built-ins as the same cards, `libSigCardHTML`, filed by `LIB_BUILTIN_THEMES`) in two sections,
  **For God's people** / **For our community** ("Para la familia de la iglesia" / "Para la comunidad"), by each idea's reach
  ("both" in both); theme chips; a search box above that still reaches every idea; "Show more"; "More ideas for {town}" per
  section; the card's first button "Choose this". Integration additions: an idea that also belongs to the group's themes on
  the other side ranks first in its section (+100 a theme; +10 for a second theme on its own side; review pass: +50 for the
  group's first-listed theme, and none of it on an "every theme" side; final review: replaced by a fixed order, below), so Prayer ministry opens
  with "Anointing before surgery" and "A phone prayer the night before a member's surgery", and Pathfinder Club with
  Pathfinder ideas on both sides; and where one side is "every theme" (Nominating committee, The whole church) the other
  side keeps to the group's own themes (`G.limit`), not every in-reach idea in the library. (Review pass, below: one
  section at a time behind a two-part switch, lighter cards, church-fit ranking on the board's in-reach side.)
- *In-reach and outreach on every idea:* `reach` = "in" (for God's people: members, the church family, its officers and
  services), "out" (for the community, guests included) or "both". Per idea in the source, else
  `tools/ideas-src/reach.json` (the classifier's file for the 2,249 older ideas: 8 in, 158 both, 2,083 out), else the
  theme's default (an `inside: true` theme → "in", else "out"); `tools/build-ideas.mjs` resolves it and ships it in the
  index for every idea (a bad value stops the build). The page reads it with `libReach` (lists) and `caseReachOf`
  (decks) — tested to agree on every idea and built-in. Built-ins: `LIB_BUILTIN_REACH` / `CASE_REACH_BUILTIN` — all "out"
  but the Pathfinder club ("both"). The survey's library and theme browse are split the same way (a theme tile under its
  own side, and under the other when 10 or more of its ideas face that way).
- *15 new library themes* (writers' workflow, 50+ ideas each, EN + ES): seven inside the church (member-care,
  spiritual-care, deacons, stewardship, involvement, sabbath-school, fellowship) and eight for the Adventist departments
  (worship-music, childrens-ministries, pathfinders, adventurers, ay-youth, interests "Evangelism follow-up & new
  believers", religious-liberty, global-mission) — 57 themes, 3,050 ideas; tile colours by kind in `build-ideas.mjs` `HUE`.
- *In-reach decks argue from the church family* (reach "in", any group but the conference): no Census slide or word; an
  **"Our church family"** slide (drawn as a `place` slide: members from the confirmed profile, volunteers and hours still
  free, gifts that fit — counts only, adults only, anything missing left out); in-reach Scripture on every content slide
  (`CASE_VERSE_PLANS.inreach`); risks led by care-list privacy, consent and confidentiality (`CASE_RISKS.care`); in-reach
  words for groups whose own words speak of neighbours (`CASE_GROUP_IN`); Ellen White MH 470 on the congregation's close,
  DA 678 in the board handout (`CASE_EGW_IN`). "both" and "out" keep the community deck. Handout: "Our church family"
  instead of the need and the place.
- *New groups* (D; Church Manual 2022 pages from research): business (board, "the whole church votes"), worship, childrens,
  adventurers, pathfinders, evangelism, prison, liberty, possibility, stewardship (teams), conference (type `conference`);
  `youth` renamed "Youth ministries (AY)" / "Ministerio Juvenil (JA)"; `congregation` now reads "The whole church" / "Toda la
  iglesia" (the mockup's name). Each with its own cares, fears, frame, role, ask, win, close, questions and verse, EN + ES.
  `CASE_YOUTH_GROUPS` and present.mjs `YOUTH_GROUPS` unchanged and equal (no "I'm in" for under-18 groups). A saved
  Pathfinder choice under `youth` moves to the Pathfinder Club once, with its slide edits and live link (`caseMigrateYouth`).
- *The conference evangelism proposal* (`caseConfBuild`, `CASE_CONF`, `CASE_CONF_SRC`): up to 12 slides — the proposal ·
  "The churches we serve" (only with 2+ churches on the device; members from confirmed profiles) · the need · "Here in
  {town}" · capacity · who is able · the plan and its dates · what we ask · reporting back · the aims it serves · the close
  ("Will you partner with us?", Isaiah 52:7). Scripture on every slide but the join; the 9T 116 line to leaders in the
  handout only. Step 2 for Conference leaders shows evangelism themes only and, when the Evangelism Planner has a plan, **his
  series first** ("Your evangelism series: opening night {date}"). Choosing it chooses the ministry `plan-series`
  (`CASE_PLAN_ID`, `casePlanItem()`: the planner's opening night, nights, workers, leaders, seats, budget; `caseItemOf(id)`
  resolves it), so the timeline is the planner's own 18-month countdown; "Adjust" then opens the Planner. The ask shows only
  what he ticks, amounts only as he types them (edit panel of the ask slide, `uChurch().confAsk`). Aims: only verified ones
  (OneVoice27, All Things New, I Will Go goal 4.1, Church Manual pp. 137–138), each cited in full in the handout;
  Pennsylvania-only facts (faith goal, subsidy policy, report form, "How the subsidy works") only when his registration's
  conference is the Pennsylvania Conference (never guessed from the address). Handout up to 3 pages.
- *Scripture and Ellen White:* `CASE_VERSES` 113 (+53, generated from the verified research file, KJV / RVA 1909 word for
  word, all in `tests/scripture-bg.json`), `CASE_EGW` 11 (+ MH 470 / MC 373, DA 678 / DTG 632, 9T 117 / 9TPI 95); every older
  community deck is byte-for-byte unchanged (`CASE_VERSE_BASE` 60; checked on 9,476 decks). 9T 116 credited pp. 116–117.
- *No "AI" or "IA" anywhere a person can see:* every visible string, tooltip, aria-label, placeholder and PDF text, EN and
  ES — "New idea" / "Idea nueva", "Draft idea", "More ideas for {town}", "More ideas are not available just now…"; the
  server's error words (which name "the AI service") are never shown (`ideasServerNote` logs them). `?ideas=PASSPHRASE`
  unlocks (the old `?ai=` still works). `tests/no-ai-words.test.js` renders every tool in EN and ES and scans the page's code
  outside comments; the only exemption is Iowa's "IA" on the conference map. Code identifiers may keep "ai".
- *The church line* names the church: the profile's name, else the registration's church, only while the device holds one church.
- *Spanish:* the Evangelism Planner is "Plan de evangelismo" everywhere (the hub's name).
- *Integration:* the two plan models were joined on D's (`plan-series`, not U's `proph-news` + flag); U's stand-in counts in
  tests updated to the real 34 groups and 57 themes, each with a comment quoting the pastor; `tests/v41-integration.test.js`
  joins everything against the real library (every idea has a reach and it is its own / reach.json's / its theme's; every
  group's step 2 has a full first page on both sides; the two reach readers agree; a real in-reach deck; the conference
  flow). Checked in headless Chrome (390×844 and 1280×800, EN, ES once): no sideways overflow, no clipped text, no "AI",
  every slide fits (0.9 or better). **Not checked on a real iPhone, nor in the light theme.**

**v10.41.0 (review pass, 29 Sep 2026) — what the independent reviewers found, fixed before delivery.** Record: the build
session's scratchpad `v42/FIXES.md`. Pinned by `tests/v41-review.test.js` (51 checks; it fails on the pre-review page) and the
updated `v41-decks`, `case-steps`, `no-ai-words`.
- *Child safeguarding on the slide (the blocker):* in-reach decks put the care-list rows first and the slide's room cut
  Adventist Screening Verification and the two-adult rule from the children's, Pathfinder, Adventurer and AY decks. Now an
  in-reach idea with children (its kinds, `minors`, or a youth group's deck: `kidsFirst` in `caseBuild`) leads with them
  (board risks and team support), a care-list row after if room remains. Held for all 142 in-reach ideas with minors.
- *Step 2 where he looks first:* the focus bonus never applies on an "every theme" side, and the group's first-listed theme
  gets +50 (final review: it now leads outright, below) (Greeters' page 1: the card after two missed Sabbaths, the greeters' notebook, "Welcome back without a
  spotlight"; Deacons: rides, communion at home). An "every theme" side leads with the themes that face its way (inside
  themes for God's people, outward for the community: the whole church's community list no longer opens with members'
  meals). The board's and business meeting's "For God's people" is ranked by church fit (`libRankIn`: inside themes, "in"
  before "both", `uCheck`, size; the best of each theme first), not the Census. No card sits on page 1 of both sections
  (it keeps the side its theme faces). The meal train and the bereavement rota ("out") are filed under families / grief /
  seniors, no longer wearing "Caring for our members". In Spanish, built-ins (no Spanish description yet) rank after the
  library's cards.
- *Step 2 lighter* (phone: 1,900 px, was 6,300–7,600): a two-part switch (`.cs-tabs`, `data-lib-tab`, `LIB_UI.case.tab`,
  `caseDefaultTab` / `CASE_TAB_OUT`), both sections drawn, one shown; cards in Make the Case clamp the description to three
  lines, fold "Why here", the fit, partner and steps under "More about this idea" (`.lib-more`), and have one button,
  "Choose this" ("Add to our plan" stays in the survey); four cards a page on a phone (`CASE_LIST_PAGE_PHONE`).
- *In-reach decks speak of the church family:* an in-reach library idea with no class, meal or group in its name and no
  rooms of its own seats nobody and books no room (`libBuild`: `x.seats=false`, facilities `[]`), so no "Places", "When",
  room row or host; the first step is "Start · The team begins, as planned", the check-in "What was done, and hours against
  plan", support "Training before it starts"; `CASE_GROUP_IN` gained hospitality, deacons, small groups, prayer, literature,
  worship, health, community, personal, school, nominating and adventurers, and men's / media were rewritten (no "every
  session of", no visitors); success lines count totals, never who came back. "Our church family" says "{n} in worship on an
  average Sabbath" (the profile's field is attendance) and the conference's churches "average Sabbath attendance". The
  in-reach motion verse no longer opens with Hebrews 10:24–25 ("as the manner of some is"), and a group's outward verse
  (Hebrews 13:2, Jeremiah 29:7…: `CASE_VERSE_OUTWARD`) is left off in-reach decks.
- *The business meeting* is a "Church vote" (`CASE_BUSINESS`): its handout kicker, "Review · business meeting", "Business
  meeting review".
- *The conference:* the ask ticks only counsel by default, plus a share of the cost when his Planner series has a budget or
  the church is short of money (`ask.defaults` resolved in `caseConfBuild`, used by the edit panel too); a proposal that is
  not his series reports "after the trial" (no Evangelistic Report Form, no follow-up of new believers); in Pennsylvania the
  third timeline step is the report form at the close of the meetings (a follow-up report three months later in its text).
  Spanish says "evangelismo" throughout (the step-1 tile, the plan card, the Planner, now the deck and handout too).
- *Found in review:* the board's and the deacons' ask vanished for any idea with no room or no leader (a street or online
  idea): `{room}` / `{leaders}` left empty. Now the group's room-free words, then plain ones (`CASE_ASK_PLAIN`).
- *Spanish:* a name that opens with an article is lowered mid-sentence ("Aprobar una prueba de 6 semanas: una tarjeta…");
  the background ideas' notice (`U_GEN_NOTICE`) is Spanish on a Spanish page.
- *Data:* the Thirteenth Sabbath jar (global-mission) no longer calls the offering "overflow"; a quarter of it goes to the
  quarter's projects (re-packaged, hash `f2cc1121c190`).
- *Tests:* `tests/reach-builtins.json` (the classifier's file) is always checked; `no-ai-words` also scans the presenter's
  setup, the presenter view, the share panel, the conference step 2 and the conference proposal's slides and handout.
- *Checked in headless Chrome* (390×844 EN and ES, 1280×800): step 2 for Greeters and the board, the switch, a card's fold;
  the Greeters, business meeting, Pathfinder and children's in-reach decks and the conference deck: every slide fits (0.9 or
  better, 0 overflow), no sideways overflow, no "AI". **Not checked on a real iPhone, nor in the light theme.**

**v10.41.0 (final review, 29 Sep 2026) — four things the last critic found would disappoint the pastor, fixed before
delivery.** Record: the build session's scratchpad `v42/FIXES-2.md` (with a table of page 1 of both sections for all 34
groups). Pinned by the new `tests/v41-final.test.js` (38 checks; 26 fail on the page before this pass) and the updated `v41-review`,
`v41-integration`, `v41-decks`, `v40-review-lib`, `case-slides`, `case-fixes` and `home-church`, each with a comment.
- *Step 2 opens where he looks* (`libDrawList`). The Greeters' "For God's people" opened with "A Sunday picnic where every
  household brings a neighbor" (reach "both": two themes shared with the community side, +200, beat +50 for the first
  theme), and his own example came third (*"send a card if they're missing, or if they don't come one Sabbath… call and say
  we missed you"*). Now every side of every group is ordered: ideas that face only that way ("in" for God's people, "out"
  for the community) before "both" ones; then the group's first-listed theme for that side (filed under it, then
  cross-listed to it); then the earlier tie-breaks; and only then +100 for each theme shared with the other side and +10
  for a second theme of its own side, so a shared theme never outranks the first theme. Greeters: the two-Sabbath card,
  the door notebook, "Welcome back without a spotlight". Because the first theme now leads outright, six groups whose own
  focus is a community theme list it first for God's people too (`CASE_GROUP_THEMES`, every SPEC theme kept): Prayer
  ministry (prayer: anointing before surgery, a phone prayer the night before), Possibility ministries (disability: braille
  hymnals, a ramp to the platform), Personal ministries (personal-evangelism), Young adults, Media, Literature. No "both"
  idea is on page 1 of any of the 68 sides on a phone. In Spanish, built-ins still rank after the library's cards.
- *Children only when the idea is about children* (`caseChildOk(x,gid)`, `CASE_CHILD_THEMES`): its ages children or youth,
  `minors`, a children's or youth theme of its own or cross-listed (children, youth, childrens-ministries, adventurers,
  pathfinders, ay-youth, education, schools, foster-care), or a children's or youth group's deck (`CASE_YOUTH_GROUPS` and
  `childrens`). A census tag never counts, nor ages "families": the picnic's "families" tag gave it "About 1 in 4 people
  around us is a child" beside Mark 10:14, which he called weird. Such an idea also drops the children's needs its tags lend
  (`kids`, `schools`, `child-poverty`) from its lead need, its "where to look first" and the ministries whose gifts fit
  (the picnic was counted against Children's Sabbath School, Adventurers and Pathfinders). Proved on all 3,050 ideas, a
  board and a congregation deck each (EN): the 581 about children keep the children's share; the other 2,469 show no
  children's figure, no children dots and no child verse.
- *Capacity reads what we have first, then what is needed* (`tdCapWords`, `TD_STR` `capShort` / `capOk`; the handout the
  same). It read "Leaders 17 of 7" and "Series budget $12,000 of $2,500" to the conference's administrators. Now each row is
  the label with what we have in bold, then the meter with the words beside it: "Leaders **7** · of the 17 needed",
  "Volunteers **35** · free · 6 needed"; Spanish "de los 17 necesarios", hours feminine ("de las 50 h necesarias"). The meter
  fills with what we have against what is needed; the words share one column (a CSS subgrid), so the meters are equal. On a
  single line the words pushed labels into three or four lines ("Presup/uesto") and Spanish board slides overflowed; the
  two-line row measures fit 0.9 or better with 0 overflow on every board and conference capacity slide, EN and ES (before
  this pass eight Spanish ones drew at 0.85). In the handout the figure shrinks to fit its line, never the row.
- *The conference is asked, not told:* when the gifts results show nobody ready to lead, the conference's ability slide says
  "A coordinator will be named and trained." / "Se nombrará y capacitará a un coordinador." (`CASE_COPY.ability.ready0Conf`),
  not "pair and train"; the other decks keep their words to the pastor.
- *Spanish articles:* after "para" every group takes its article, common nouns in lower case (`CASE_GROUP_ES_FOR`,
  `caseGroupFor`): "Ideas para el Club de Conquistadores", "para los ancianos", "para toda la iglesia"; also "Elegida para…"
  and step 3's "… diapositivas para …". English lowers only a leading "The" ("Ideas for the whole church").
- *Checked in headless Chrome* (390×844 EN and ES, 1280×800): the Greeters' step 2, the picnic's board and congregation
  decks, the conference's capacity and ability slides in both languages, the Spanish step-2 line for all 34 groups; no
  sideways overflow, no page errors. **Not checked on a real iPhone, nor in the light theme.**

**v10.41.1 (29 Sep 2026) — three follow-ups after v10.41.0 was handed over.** Record: the build session's scratchpad
`v42/FIXES-3.md` (with the full 103-row table). Pinned by the new `tests/v41-1.test.js` (37 checks; 14 fail on v10.41.0, and 6 of the 11 that fix 4 added fail without it) and
the updated `case-review39`, `case-steps`, `home-church`, `v41-final`, each with a comment.
- *Children only when the idea is about children, the built-ins too* (`caseIsBuiltin`, `caseBuiltinKids`, `CASE_CHILD_TAGS`,
  `CASE_CHILD_BUILTINS`). The pastor: children framing on ideas that are not about children "sounds a little bit weird".
  v10.41.0 applied the rule to the library only, so every built-in's congregation deck showed "27 in every 100 are children"
  (a grief group, a blood drive, a senior day program); small groups in homes, the recital hall, come-and-see and the film
  night opened with "More than 1 in 4 people around us is a child" beside Mark 10:14, and the meal schedule and the lot market
  carried John 6:9 or Proverbs 22:6. A built-in is about children when it
  is a children's or youth ministry by id, has the kids skill or the CASE_BRIDGE kind "children", or two or more of its own
  need tags count children (many-kids, family-heavy, child-poverty, k12, schools-near; "families" never counts); a children's
  or youth group's deck still may. Such a built-in also drops the children's needs (`kids`, `schools`, `child-poverty`) and
  never falls back to the child share for its need slide; it keeps its own staffing. Proved on all 103 × board, team and
  congregation decks (EN): the 84 not about children show no children's figure, dots or child verse; the 19 keep them.
  | about children (19) | why |
  |---|---|
  | vbs, pathfinders, sports-camp, kids-books, homework-club, story-corner | by id, the kids skill, and children's needs |
  | backpack-giveaway, kids-health, school-supplies, exam-packs | by id, and children's needs |
  | moms-group, parents-study | the kids skill (childcare; parenting), and children's needs |
  | lot-sport, music-academy, sg-parents | kind "children" (a court for the neighbourhood's children; lessons; a crèche next door) |
  | fall-festival, christmas-store, toy-swap, family-life-series | two or more children's needs (a children's evening; toys and uniforms for their children; a parenting series) |

  | not about children (84) | why |
  |---|---|
  | clothing-closet, drive-in, meal-train, sg-homes | one children's tag only (`child-poverty`, `many-kids`, `family-heavy`), each drops it from its needs |
  | lot-market, sanctuary-music, come-and-see (drop `kids`), cooking-school, walking-club, kitchen-study, neighbor-table, open-baptism-class, decision-visit, jar-of-prayer | "families" only |
  | food-pantry, pantry-box (drop `child-poverty`), money-course | child poverty only as a ranking boost |
  | the other 67 | no children's need, skill or kind |
- *A capacity row that needs nothing is left out* (`caseBuild` capRows; the slide, the handout and present.mjs follow): it read
  "$2,500 free · $0 needed". A deck saved before says only what is free (`TD_STR` `capFree`: "$2,500 free" / "$2,500
  disponibles"). Of 3,256 decks checked (the built-ins' board and congregation decks, every library idea's board deck) 659
  carried such a row; now none, and every deck keeps two or more rows.
- *English takes its article too* (`CASE_GROUP_EN_FOR`, `caseGroupFor`): "Ideas for the Pathfinder Club", "for the elders",
  "for the church board", "for the deacons and deaconesses", "for the worship and music team"…; "Community Services (Dorcas)"
  and "Possibility Ministries" keep their own names. Also "Chosen for…" and step 3's "… slides for …".
- *Fix 4: the "Here in" slide beside a figure* (`CASE_PLACE_MAX.nameLineFact` 28, `caseDeck`'s `placeSlide`; record:
  `v42/FIXES-4.md`). The independent check found that dropping the children's figure let a longer one in: 20 of the
  Nominating committee's Spanish "Aquí en Warminster" slides (car-care, glow-racks, lot-market, study-hall, garden,
  skills-center, noticeboard, job-club, meal-train, supper-study, late-room, mens-breakfast, neighbor-table, four-nights,
  open-baptism-class, bench, funeral-teas, noticeboard-jobs, lending-shelf, welcome-newcomers) put "1 de cada 9 hogares …
  tiene un dominio limitado del inglés. Condado: 1 de cada 32." (five lines) beside two food-bank partners, Jeremiah 29:7
  and the sources, and ran 10 px past 360 × 640 at the smallest type (the meal schedule's already did on v10.41.0). Beside a
  figure the partner's name column holds about 28 characters at every type size (its type never goes below 15 px), so there
  a longer name counts as two rows: two partners only when both names fit on one line; the first partner still shows when
  its name is 40 or less, as before. In the survey's data (food bank 30 characters, pantry 39) every board and conference
  "Here in" slide with a figure now names one partner (1,366 decks in each language; the handout lists them all) and draws
  at fit 0.9 or better (0.95 for the 20); nothing else on any place slide changed, and English and Spanish name the same
  partners. Jeremiah 29:7 stays.
- *Checked in headless Chrome* (390×844, EN and ES): small groups in homes (board) and the grief group (congregation) with no
  children's words, VBS keeping its dots, the grief group's capacity slide EN and ES, the English step-2 line for all 34. Every
  slide of 1,410 decks measured at 360×640 (all 103 built-ins × board / team / congregation, all 33 groups × three built-ins,
  the conference series, every 10th library idea's board deck; EN and ES): 0 overflow. Fix 4 then measured every slide of
  25,306 decks at 360×640 (216,972 slides: all 103 built-ins × all 34 groups, the Planner's series for the conference, all
  3,050 library ideas × board / Community Services / congregation; EN and ES): **0 overflow** (v10.41.0: 1; before fix 4:
  20). Fit EN 1 ×82,131 · 0.95 ×20,389 · 0.9 ×5,903 · 0.85 ×4 · 0.8 ×59; ES 1 ×61,356 · 0.95 ×30,482 · 0.9 ×11,521 ·
  0.85 ×4,763 · 0.8 ×212 · 0.75 ×152. The 152 below 0.8 are Spanish and older than this release: 148 dense capacity slides
  (two gap lines: 30 in five built-ins' board and conference decks, 118 in library ideas' board decks) and the motion slides
  of 4 long-named fellowship ideas (v10.41.0: 160, the same kinds and that place slide). Every "Here in" slide draws at 0.8
  or better. **Not checked on a real iPhone, nor in the light theme.**

Groups, sections and their themes (**For God's people** · **For our community**; `*` = every theme, best fit first):

| id | kind | step 1 section | EN · ES | CM 2022 | themes |
|---|---|---|---|---|---|
| board | board | Decide | Church board · Junta directiva de la iglesia | pp. 134–138 | * · * |
| business | board | Decide | Business meeting · Reunión administrativa | pp. 134, 145 | * · * |
| elders | board | Decide | Elders · Ancianos | pp. 77–79 | spiritual-care, member-care, sabbath-school · prayer, personal-evangelism, grief, small-groups |
| deacons | board | Decide | Deacons & deaconesses · Diáconos y diaconisas | pp. 84–86 | deacons, member-care, fellowship · hunger, clothing-practical, seniors, disaster-relief, transport |
| finance | board | Decide | Treasurer & finance committee · Tesorería y comisión de finanzas | pp. 89–90, 138–145 | stewardship, involvement · jobs-money |
| nominating | board | Decide | Nominating committee · Comisión de nombramientos | pp. 116–120 | involvement, spiritual-care, member-care · * |
| worship | team | Worship & learning | Worship & music · Adoración y música | pp. 101, 124, 127–128 | worship-music, fellowship · music-arts |
| sabbathschool | team | Worship & learning | Sabbath School council · Consejo de Escuela Sabática | p. 103 | sabbath-school, member-care, fellowship, global-mission · small-groups, personal-evangelism |
| childrens | team | Worship & learning | Children's Sabbath School & children's ministries · Escuela Sabática de Niños y Ministerios Infantiles | pp. 93–95, 103–105 | childrens-ministries, sabbath-school · children, families |
| school | team | Worship & learning | Church school & education · Escuela de iglesia y educación | pp. 96–97 | sabbath-school · education, schools, children |
| adventurers | team | Children & youth | Adventurer Club · Club de Aventureros | pp. 114, 140 | adventurers · children, families |
| pathfinders | team | Children & youth | Pathfinder Club · Club de Conquistadores | pp. 113, 140 | pathfinders · youth, sports-outdoors, creation-care |
| youth | team | Children & youth | Youth ministries (AY) · Ministerio Juvenil (JA) | pp. 110–115 | ay-youth, fellowship · youth |
| youngadults | team | Children & youth | Young adults · Jóvenes adultos | p. 110 | young-adults, fellowship, involvement · young-adults |
| personal | team | Outreach & evangelism | Personal ministries council · Consejo de Ministerios Personales | pp. 106–107 | personal-evangelism, involvement, spiritual-care, interests · personal-evangelism, public-evangelism, literature, neighbors |
| evangelism | team | Outreach & evangelism | Evangelism team · Equipo de evangelismo | pp. 91, 106–107, 137–138 | interests, spiritual-care · public-evangelism, personal-evangelism, media |
| bibleworkers | team | Outreach & evangelism | Bible workers · Instructores bíblicos | p. 107 | spiritual-care · personal-evangelism, public-evangelism |
| literature | team | Outreach & evangelism | Literature ministry · Ministerio de Publicaciones | p. 102 | literature, involvement · literature |
| community | team | Outreach & evangelism | Community Services (Dorcas) · Servicios Comunitarios Adventistas (Dorcas) | pp. 107–108 | member-care, deacons · hunger, clothing-practical, homeless, disaster-relief |
| health | team | Outreach & evangelism | Health ministries · Ministerios de Salud | p. 100 | member-care · health, mental-health, addiction |
| media | team | Outreach & evangelism | Media & communication · Comunicación y medios | pp. 95–96 | media, fellowship, member-care · media |
| prison | team | Outreach & evangelism | Prison ministry · Ministerio carcelario | p. 107 | member-care · prison |
| liberty | team | Outreach & evangelism | Religious liberty · Libertad religiosa | pp. 101–102 | religious-liberty · religious-liberty |
| possibility | team | Outreach & evangelism | Possibility ministries · Ministerio de las Posibilidades | pp. 92–93 | disability, member-care, worship-music · disability |
| prayer | team | Care & family | Prayer ministry · Ministerio de Oración | p. 79 | prayer, member-care, spiritual-care · prayer |
| hospitality | team | Care & family | Greeters & hospitality · Recepción y hospitalidad | p. 123 | member-care, fellowship · hospitality, neighbors |
| family | team | Care & family | Family ministries · Ministerio de la Familia | p. 98 | fellowship, member-care · families, marriage, single-parents, foster-care |
| womens | team | Care & family | Women's ministries · Ministerio de la Mujer | p. 109 | member-care, fellowship · women, single-parents, abuse-survivors |
| mens | team | Care & family | Men's ministries · Ministerio del Hombre | p. 107 | fellowship, involvement · men, veterans, workplaces |
| seniors | team | Care & family | Senior members · Adultos mayores | — | member-care, fellowship · seniors, grief |
| smallgroups | team | Care & family | Small group leaders · Líderes de grupos pequeños | p. 107 | fellowship, spiritual-care · small-groups, neighbors |
| stewardship | team | Care & family | Stewardship ministries · Ministerio de Mayordomía | pp. 108–109, 142–143 | stewardship · jobs-money |
| congregation | congregation | On Sabbath | The whole church · Toda la iglesia | pp. 127–128 | member-care, fellowship, involvement · * (size "This week" first) |
| conference | conference | The conference | Conference leaders · Dirigentes de la asociación | pp. 32–35, 120–121, 134 | interests, involvement · public-evangelism, personal-evangelism, health, media (evangelism only; his Planner series first) |

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
blocks and every function first, then runs all 71 suites.

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

`tests/` holds 71 suites and `run-all.js`. They load `../index.html`
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

**Fresh ideas (the model; shown as "New idea" / "Draft idea", never "AI")**
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
- `caseModel(ministry,{type,group})` → `caseDeck(model)` (typed slide JSON) → `tdeckRender(deck,host,{mode})` (present / follow / browse; sideways row); capacity rows `tdCapWords` (have, then need; final review; v10.41.1: a row that needs nothing is left out, `capFree` for older decks)
- Screens (v10.41): `caseMount` → step bar `caseStepBar` + `caseStepHead`; `caseDraw1` (who: `CASE_GROUPS` placed by `CASE_AUD_LAYOUT` / `CASE_AUD_SECTIONS` / `CASE_AUD_SUBS` / `CASE_AUD_NOTE`, `caseAudSections`, `caseChooseGroup`, `caseAudEqual`), `caseDraw2` (what: `CASE_GROUP_THEMES` → `caseGroupList` (`limit`, `focus`) → `libMount('case')` group mode; the chosen card `caseChosenCardHTML`; the conference's series `casePlanOffer` / `casePlanCardHTML` / `caseChoosePlan`), `caseDraw3` (preview + edit + actions), `caseChoose(id,{plan})`, `caseItemOf(id)`, `caseMigrateYouth`, `casePvMount`, `caseAct`
- Groups: `CASE_GROUPS` (34: 6 board, 26 team, 1 congregation, 1 conference; see the table in the v10.41.0 notes), `CASE_YOUTH_GROUPS` (= present.mjs `YOUTH_GROUPS`)
- In-reach decks (v10.41): `caseReachOf(x)`, `CASE_THEME_REACH`, `CASE_REACH_BUILTIN`, `CASE_THEME_MIN` (the gifts an in-reach theme needs), `CASE_GROUP_IN`, `CASE_RISKS.care`, `CASE_EGW_IN`; the "Our church family" slide is a `place` slide (`CASE_FAMILY`: its words, the neutral start and check-in); review pass: `kidsFirst` (children's safeguarding first), `CASE_VERSE_OUTWARD`, `CASE_ASK_PLAIN` (an ask with no room or leader), `CASE_BUSINESS` (the church vote)
- Step 2's switch and page (v10.41 review): the group after "para" / "for" `caseGroupFor` / `CASE_GROUP_ES_FOR` (final review) / `CASE_GROUP_EN_FOR` (v10.41.1), `caseDefaultTab` / `CASE_TAB_OUT`, `LIB_UI.case.tab`, `CASE_LIST_PAGE` (6) / `CASE_LIST_PAGE_PHONE` (4), `libNarrow`; `caseGroupList().star` (the every-theme sides)
- The conference (v10.41): `caseConfBuild`, `CASE_CONF`, `CASE_CONF_SRC`, `caseDistrict()`, `caseConfOf()` (registration's conference; `pa`), `CASE_PLAN_ID` / `casePlanItem()`, the ask fields `caseConfAskHTML` / `caseConfAskWire` / `caseConfRebuild`
- The church remembered: `homeEnsure()` → `run(getGeo,{quiet:true})` → `homeAfterRun()`; `homeLine()`, `HOME_ST`
- Scripture and the place: `CASE_VERSES` (113; `CASE_VERSE_BASE` 60 = the v10.40 set every community deck still draws on, `CASE_VERSE_SETS`) / `CASE_EGW` (11) / `CASE_VERSE_PLAN` + `CASE_VERSE_PLANS` {inreach, conference} (= `tests/case-quotes.json`), `CASE_VERSE_HOME` (each group's slides, in order of preference), `caseVersePlan()`, `casePlaceBuild()` (partners: `CASE_PLACE_CAT`, `CASE_PLACE_KIND`, relevance then distance), the slide's budget `CASE_PLACE_LAYOUTS` / `CASE_PLACE_ORDER` / `CASE_PLACE_MAX` (v10.41.1 fix 4: `nameLineFact`), `casePlaceArrived()`
- Who already serves (survey + place slide): `HELP_CATS` / `HELP_ES` (12 groups), `helpCatOf(tags)` (one classifier, most specific first), `fetchHelp()` (one Overpass request, 3 miles, 15 s); Ellen White outside the slides: `EGW` / `EGW_ES` / `egwHTML(k)`
- Leave-behind: `caseHandout()` → `casePdfDoc()`; live: `caseOpenPresenter`, `#watch=` (`watchRender`), `present.mjs`

**Idea Library** (v10.40.0; block "THE IDEA LIBRARY" beside `uCatalog`)
- Data: `LIB` (`libLoadIndex`, `libLoadTheme`, `libLoadWords`; `/ideas/`, generated from `tools/ideas-src`), `libAdopt` (index rows → objects)
- `libFold` / `libCore` (the query and every synonym folded alike), `libSearch(q)` (SCHEMA.md "Search"), `libThemeQuery` + `libQueryMatch` (built-ins by name for a theme query), `libRank` (words mode: themes covered, then words, then score; home first, variety), `libRankIn` (v10.41 review: an every-theme "For God's people" side by church fit), `libFilter`, `libJump` (the line under the box), `libRenew` (a kept index from an earlier deploy)
- `libToCatalog(raw)` / `libLite(row)` / `libCatalog(ch)` / `libSave(raw)`; `libWhyText` + `LIB_TAG_EV` ("Why here"; the ten-year tags never use RULES, `changing-any`); `x.seats` (`LIB_SEAT_WORDS`)
- In Make the Case: `caseChildOk(x,gid)` (final review: `CASE_CHILD_THEMES`, no census tag; v10.41.1: the built-ins by `caseBuiltinKids`, `CASE_CHILD_TAGS`, `CASE_CHILD_BUILTINS`), `CASE_CHILD_VERSES`, `CASE_LIB_THEME_VERSE` (a library idea's theme verses, tag `lib:<theme>` in `caseVersePlan`)
- Screens: `libMount('survey'|'case')` into `#u-lib` / `#cs-lib`, `libDrawTiles` (grouped under the two headings), `libDrawList` (every list in two sections, `.lib-sec`), `libCardHTML`, `libSigCardHTML` (a built-in as a library card), `libWire`; `LIB_UI`
- Reach (v10.41): `libReach` / `libThemeReach` (the index's `reach`; a theme's `inside` / `reach`), `libIn` / `libOut`, `LIB_BUILTIN_THEMES`, `LIB_BUILTIN_REACH`, `libBuiltinsFor`, `libOrder`
- "More ideas for {town}" (never labelled AI on screen): `libAiMore` → advise.mjs `mode:'topic'` (`libCheckIdea`, `TOPIC_SYSTEM` there), `libFreshAccept`, `uChurch().fresh[topic]`; in Make the Case one per section (topic `group:<id>:in|out`); `ideasServerNote` logs the server's words, the page shows its own sentence; unlock `aiClaimPass` (`?ideas=` / `?ai=`)

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
   also needs an entry in `themes.json` (id, EN/ES names, scope, `not`, synonyms, tags; `inside: true` for a theme about
   the church's own life), 50+ ideas, and a colour of its kind in `tools/build-ideas.mjs` `HUE`.
   **Reach (v10.41):** every idea is "in" (for God's people), "out" (for the community, guests included) or "both" — its
   own `reach` field, else its line in `tools/ideas-src/reach.json`, else its theme's default (inside → "in"). The build
   ships the resolved value for every idea; `tests/v41-integration.test.js` holds every row to that rule. A new idea in an
   outward theme that is really for the church family must say `"reach": "in"` (or "both").
2. `cd tools/ideas-src && node validate.mjs themes/<theme>.json` (read the REVIEW lines too), then
   `node validate.mjs --all` (unique ids, no near-duplicate names across themes, unambiguous synonyms).
   (The review pass kept the writers' working copy in the build session's scratchpad `ideas/` and packaged it with
   `v41/fix-work/package.sh`: vocab refresh, selftest, `--all`, copy into `tools/ideas-src`, build. Editing
   `tools/ideas-src` directly and running steps 2-4 is the same thing.)
3. From the repo root: `node tools/build-ideas.mjs --src tools/ideas-src` — it writes nothing if anything fails.
4. `npm test`: `idea-library-build.test.mjs` rebuilds from `tools/ideas-src` and fails if `ideas/` differs by one byte
   (and holds `ideas/index.json` under 900 KB: it is 892 KB at 57 themes, so the next themes need the index slimmed or the
   limit reconsidered);
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
  children's figures or children's verses when the idea is not about children ("with the kids… it sounds weird"). v10.41.1: the
  103 built-ins by the same rule (their own needs, skills and kind; "families" never counts).
- **Make the Case is three framed steps** (his request, v10.41, the approved mockup): Who is it for? → What will you
  propose? → Your slides; a step bar; one short line per step; nothing else to read unless he opens it.
- **Step 1's sections each have their own colour** (his request, v10.41: "Board & officers should be a different colour"):
  Decide gold, Ministry teams violet (four sub-headings), On Sabbath mint, The conference blue — another exception to
  "headings stay mint", like the hub tiles and the gifts sections.
- **No "AI" (or "IA") anywhere a person can see** (his request, v10.41: "people are scared of it"): "New idea", "Draft
  idea", "More ideas for {town}"; `?ideas=` to unlock; `tests/no-ai-words.test.js` fails on any hit (code identifiers may
  keep "ai"; Iowa's "IA" on the map is the only exemption).
- **Every idea is for God's people, for the community, or both** (his request, v10.41), and every list shows the two apart;
  an in-reach idea argues from the church family (counts only, adults only), never the Census.
- **Step 2 is tailored to the group** (his request, v10.41: "the prayer ministry focuses on prayer"): one list from the
  group's themes (the table in the v10.41.0 notes), the group's own cross-over ideas first, its first-listed theme next; an
  "every theme" side leads with the themes that face its way; the two sections never open with the same card.
- **Step 2 shows one section at a time** (v10.41 review, his "a lot of words, almost overwhelming"): a two-part switch
  ("For God's people 153 | For our community 227"), cards of kind, title, a three-line description, facts and one "Choose
  this"; "Why here", the fit and the steps under one small "More about this idea". The children's safeguarding line stays
  visible on a card.
- **Many ideas, creative and specific** (his request, v10.40): a search for a topic shows 50+ ideas, never a thin list.
  Ideas go where people are (not the church porch), use social media as a neighbour, never ask for or pray about
  people's children by name, and are data in `tools/ideas-src`, not code.

---

## Open work, prioritised

1. **Commit v10.41.1 — the whole folder, not just index.html** (v10.41.0 was handed over but not deployed; v10.41.1 replaces it) (`index.html`, `netlify/functions/present.mjs`,
   `FIREBASE-SETUP.md`, `ideas/`, `tools/` with `ideas-src/` and `reach.json`, `tests/` including `case-quotes.json` and
   `scripture-bg.json`, `CLAUDE.md`; never `node_modules/`). The folder is **218 files**; GitHub's web upload takes at
   most 100 at a time, so upload `ideas/` (59) first, `tools/` (66) second and the rest (93) third, or use GitHub Desktop.
   Delete from the repo any `ideas/*.json` the new build no longer makes (none expected: all 42 older files are rebuilt).
   Then confirm the badge **v10.41.1**, `/.netlify/functions/present` → `"fn":"present-1.2"`, `"live":true`, `"fb":"ok"`,
   and that `https://pastorshub.org/ideas/index.json` says `"hash":"f2cc1121c190"` and 3,050 ideas. On his phone: Make the
   Case shows the three steps; tap Greeters & hospitality (both sections), Prayer ministry, Pathfinder Club; choose an idea;
   the slides appear in step 3. Conference leaders with a Planner plan: his series first; its slides and handout. Nothing
   says "AI" anywhere (unlock with `?ideas=`). **Not yet checked on a real iPhone, nor in the light theme.**
   Earlier (v10.40.0) checks still worth doing live: "Use my location" then reload inside Make the Case; a deck's "Here in
   {town}" slide with the live Census and Overpass; the sideways swipe on a real iPhone (iOS has no `scrollend`).
   **Pennsylvania Conference evangelism subsidy requests are due 30 September** (the research found the March 2026
   policy: up to half the cost, board support, the online form) — tell him on 29 Sep 2026.
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
    it). On the place slide a partner whose name is over 40 characters (over 28 beside a figure, v10.41.1 fix 4) takes two
    rows, so a nearer long-named partner can give way to a farther one (the handout lists both). Partners are ranked by relevance before distance, so the
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
13. **v10.41 follow-ups (the pastor decides).** Church Manual: the app cites the 2022 edition (the SPEC's choice); the
    21st edition (2025) is current and its pages shift by up to 7 (the research file `CHURCH-AND-CONFERENCE.md` in the build
    session has both). Spanish slides give English Manual pages. Spanish names to confirm: "Ministerio Juvenil (JA)" (the
    2015 Manual's term) or "Ministerio Joven"; "Ministerio de las Posibilidades" (unverified for the current edition).
    advise.mjs error strings still say "AI" (never shown; reword with the next advise bump). The 103 built-in ministries have
    no Spanish description: in Spanish step 2 they rank after the library's cards until they are translated. In English a
    library idea's name keeps its capital mid-sentence ("…: Tear-off prayer flyers…"); only "A"/"An" are lowered (Spanish:
    un/una/el/la/los/las…). Which section step 2 opens on is a table (`CASE_TAB_OUT`: the board, the business meeting, the
    outreach and evangelism teams, the conference open on the community); he may want it otherwise. Media and Music & the arts have no in-reach ideas of their own;
    their groups' "For God's people" come from fellowship / member-care. The `index.json` size limit (item 4 of "Adding
    or changing ideas"). Pathfinder motto: not confirmed that it is 2 Corinthians 5:14 — no slide calls it the motto.
14. **v10.41.1 follow-ups (the pastor decides).** Which built-ins are about children is a judgement per ministry (the table in
    the v10.41.1 notes; one id in `CASE_CHILD_BUILTINS` or one tag changes it): the fall festival, the toy swap, the Christmas
    toy store, the parenting series and the music academy count; the film night, the meal schedule, the clothing closet and
    small groups in homes do not. A built-in whose own needs do not fire here still borrows the group's emphasis for its need
    slide, as built-ins always did (the film night's board deck now leads with poverty, small groups in homes with "The median
    age around us is 34.8"); library ideas have no need slide then. A ministry that costs nothing still shows "To start $0" and
    "Ceiling $0" on the ask slide. English group words: five take "team" to read naturally ("the worship and music team"…),
    two keep their names with no article ("Community Services (Dorcas)", "Possibility Ministries"). Fix 4: beside a figure
    the "Here in" slide now names one partner whenever the first name is over 28 characters (every such board deck in the
    survey's data); if he misses the second, one wrapped name beside a one-line one also fits (fit 0.8, measured). Character
    counts only estimate width: two names of 28 characters or less that still wrap (in capitals, or wide letters) beside the
    longest Spanish figure and Jeremiah 29:7 would run 10–29 px over (made-up names, measured; none in the survey's data).
    152 Spanish slides (148 capacity, 4 motion) draw at fit 0.75, as before this release.

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
