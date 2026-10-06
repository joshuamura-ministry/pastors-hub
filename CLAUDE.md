# Terrain — handover for Claude Code

This file is read automatically when Claude Code opens the repo. It is the
working memory of the project: what it is, how it is built, what has been
decided, and what is still open. Keep it current — update it in the same
commit as any change that alters something written here.

**This repository is public.** Nothing secret goes in this file, in code, or
in commit messages. See [Security](#security--this-repo-is-public).

---

## Read this first

1. **One file.** The whole app is `index.html` (~3.6 MB). No build step, no
   framework, no bundler. Two `<script>` blocks (and a five-line one in the head that loads the web fonts except on a
   neighbour's `#connect=` page, v10.43). Edit it in place. The one
   exception is data: the Idea Library's `ideas/` is **generated** from
   `tools/ideas-src/` by `tools/build-ideas.mjs` — never edit `ideas/` by hand
   (see [Adding or changing ideas](#adding-or-changing-ideas)).
2. **Deploy = commit to `main`.** Netlify is wired to this repo and publishes
   every push in about a minute. There is no separate server to upgrade.
3. **Run the tests before and after every change:** `npm install` once, then
   `npm test`. 131 suites, 9,759 assertions, all green at v10.45.0 (5 Oct 2026: the Community Survey says what the neighborhood needs, and its review round; v10.44.1 had 123 · 9,403; v10.44: Make the Case for a project or purchase, "Find prices", Learn from other conferences, the Sabbath leftovers; before it v10.43: ongoing · series · one-day events, the follow-up plan, connection cards, "What's next" and "Your path"; about 20 minutes).
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

Five tools on the hub (the fifth, **Learn from other conferences**, since v10.44.0, 2 Oct 2026):

| Tool | What it does | Tier |
|---|---|---|
| **Community Survey** | Census report + the action plan (where to look, community resources, church profile, mobilization, ministries) | survey free · plan full |
| **Spiritual Gifts** | Members take a 105-statement assessment plus 12 heart questions via a short link or QR code; results come back to the pastor through `gifts.mjs`; members get a report tied to the Community Survey, as a PDF and by email | full |
| **Make the Case** | Turns the findings into a proposal for a named board or ministry; since v10.44, also for **a project or purchase** (sound, a camera, a roof, a van…: three options, how we'll pay without tithe, who decides) | full |
| **Evangelism Planner** | 18-month countdown to opening night, with a benchmark per phase | full |
| **Learn from other conferences** | What each US conference's published calendar holds, side by side (the past 12 months), and the year ahead for his conference, union, the NAD and the world church (next 12 months, for planning) | full |

**Mission, in his words:** everything points to Christ; features are frames,
the gospel is the picture. Neighbours are neighbours, never targets.

---

## The repo & deploy

```
index.html                     the entire app
netlify/functions/census.mjs   Census API proxy + conference access-code gate
netlify/functions/advise.mjs   the model behind the prose plan, new ministry ideas and "More ideas for {town}" (advise-2.4; never called "AI" on screen;
                               v10.44: advise-2.3 the Sabbath guideline in its prompts, advise-2.4 modes `prices` / `prices-status` for "Find prices")
netlify/functions/advise-prices.mjs  (v10.44, prices-1.0) the background worker behind "Find prices" (Make the Case · a project or purchase): web search
                               and web fetch, three options recorded by a strict tool, every link cleaned; Netlify Blobs store `terrain-prices`
netlify/functions/prices-sweep.mjs   (v10.44, prices-sweep-1.0) daily purge of price-search jobs (7 days) and their counters (2 days)
ideas/                         the Idea Library as the page loads it: index.json, words.json, <theme>.json (GENERATED, never edit)
tools/build-ideas.mjs          packs tools/ideas-src into ideas/ after the writers' validator passes (see "Adding or changing ideas")
conferences/                   (v10.44) "Learn from other conferences" as the page loads it: index.json (the chooser and every comparison, 50
                               conferences), ahead.json (NAD, world church, each union), c/<slug>.json (one conference's examples, initiatives,
                               sources, its year ahead). GENERATED by tools/conferences/build.mjs: never edit by hand; must be in the site's copy
tools/conferences/             its builders (year-ahead.mjs, profiles.mjs, pack.mjs, window.mjs; build.mjs runs them), src/ (the gathered
                               calendars, look-ahead files, statistics, registry, initiatives; config.json = the check date; through.json),
                               feed.mjs + ics.cjs (Chesapeake's .ics → src/feeds), MATCH-REVIEW.txt, README.md (the monthly refresh)
tools/ideas-src/               the library's SOURCE: themes/<theme>.json (the ideas, EN + ES), themes.json (57 themes, synonyms),
                               reach.json (in / out / both for the 2,249 ideas written before `reach` existed),
                               cadence.json (v10.43: ongoing / event / series-N for every idea), next.json (an event's or series' two ongoing next steps),
                               nocard.json (68 ideas whose own words promise no names: no follow-up plan, no card),
                               vocab.json, validate.mjs, selftest.mjs, examples.json, SCHEMA.md (fields, search), WRITERS.md (quality bar)
netlify/functions/gifts.mjs    Spiritual Gifts results server + email (gifts-1.3: 200 results an hour from one address; Netlify Blobs)
netlify/functions/gifts-sweep.mjs  daily scheduled purge of expired gifts results
netlify/functions/register.mjs  first-page registration (name, email, church, role), register-1.1
netlify/functions/present.mjs   Make the Case live slideshows: decks in Blobs, slide pointer via Firebase, "I'm in" answers (present-1.4: his handout and the proposal to vote on as PDFs for phones, op putpdf / GET op=pdf, the `how` slide, the gifts deck; 1.3: how phones move, `mode` follow|free, and `pdf`; 1.2: the `conference` audience; 1.1: a verse on every slide, the "place" slide)
netlify/functions/present-sweep.mjs  daily purge of expired presentation rooms and their PDFs (present-sweep-1.1)
netlify/functions/connect.mjs   connection cards (v10.43, connect-1.0): a card per event or series (secret key for the pastor, public id), the phone's answers
                               (adults only, no markup), pulled by his device only; Netlify Blobs store `terrain-connect`
netlify/functions/connect-sweep.mjs  daily purge of expired answers, tombstones and unused cards (connect-sweep-1.0)
fonts/                         (added 1 Oct 2026, with his OK) CormorantGaramond-SemiBoldItalic.ttf (Cormorant v4.002, CatharsisFonts/Cormorant),
                               SpaceGrotesk-SemiBold.ttf (Space Grotesk 2.000, Google Fonts' static instance: the designer's repo has no static
                               SemiBold), OFL.txt (both notices, each file's source URL, the SIL OFL 1.1; no Reserved Font Name): static TrueType,
                               unmodified (SHA-256 pinned in v43-fonts), for the printed card and the neighbour's phone page: fetched same-origin by
                               cnPdfFontBytes when a card is printed, and by the card page's @font-face rules ("Terrain Card Script" / "Display");
                               it must be in the site's publish copy (below)
FIREBASE-RULES-TERRAIN.txt     rules for the separate Firebase project `terrain-live` (no client writes)
FIREBASE-SETUP.md              click-by-click setup of that project for the pastor
README.md                      (in the GitHub repo; not part of this hand-over folder)
CLAUDE.md                      this file
package.json                   @netlify/blobs (functions); jsdom + jspdf (tests)
tests/                         131 suites + runner + fixtures (case-quotes.json: the verified verse/EGW library; reach-builtins.json: the built-ins' reach; scripture-bg.json: Bible Gateway's
                               KJV + RVA 1909 text of every passage the app quotes; topic-ideas.json: a stubbed AI answer)
```

(v10.44: the copy command also has `cp -R conferences site/`, for Learn from other conferences; `conferences-data.test.mjs` checks it. Simulated
for v10.44.0 by the integrator: the command run in a copy makes `site/` = index.html, ideas/, fonts/, conferences/, and the comparison and the
purchase path opened from it ask for no file that is missing and no other site than v10.43.0 already asked: Google Fonts and cdnjs.)
`netlify.toml` (added 1 Oct 2026, PR #2) builds a `site/` folder holding only `index.html` and `ideas/`, so notes, tests,
tools and function source are no longer served. Functions stay in `netlify/functions/`. **A new file the page must
load has to be added to the copy command in `netlify.toml`.** Live deploys skip changes that touch only tests, tools,
`.github/` or `.md` notes (the `ignore` rule; previews always build). Safe headers are set there too (no script CSP).
v10.43.0 needs one other same-site static folder: `fonts/` (the card's two faces, added 1 Oct 2026). The phone form is
`index.html#connect=`, and everything else is a function. **The copy command must include `fonts/`** (`cp -R fonts site/`),
or the printed card quietly prints in Times and Helvetica and the neighbour's phone page in the phone's own faces (each falls back
by itself: a missing file is a same-origin 404, never a request to another site).

**Deploy:** one release = one branch = one pull request = one Merge → Netlify builds → *Published* in the Deploys tab.
Never upload to `main` directly: each commit there is a separate live deploy (15 credits on a credit plan), and a
release split over several commits goes live half-done for minutes. `.github/workflows/test.yml` runs `npm test` on
every pull request (free on a public repo).
Verify both halves after any deploy:

- page: the badge beside TERRAIN, or `<meta name="terrain-version">`
- function: `https://pastorshub.org/.netlify/functions/advise` → `"fn"` field
- connection cards (v10.43): `https://pastorshub.org/.netlify/functions/connect` → `"fn":"connect-1.0"`
- v10.44: `/.netlify/functions/advise` → `"fn":"advise-2.4"`, `"pricesFn":"prices-1.0"` (and `"prices":true` only when the key **and** the
  passphrase are set, and `PRICES_DAY_MAX` is not 0); `https://pastorshub.org/conferences/index.json` → `"v":"0c46f5b3c1db"`, `"checked":"2026-10-01"`;
  `https://pastorshub.org/ideas/index.json` → `"hash":"f7b32cd68d45"`

**Server settings** (Netlify → Project configuration → Environment variables;
values are never in the repo):

| Variable | Used by | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | advise.mjs | Anthropic **platform** key (console.anthropic.com), billed per use. Not a claude.ai subscription. |
| `TERRAIN_AI_PASS` | advise.mjs | Optional passphrase. The pastor unlocks a device once with `?ideas=PASSPHRASE` (v10.41; the old `?ai=` still works, and the page shows only `?ideas=`). |
| `ADVISE_MODEL` | advise.mjs | Optional. Defaults to `claude-opus-5-5`. Set `claude-sonnet-5` if Opus hits the 60 s function limit. |
| `PRICES_DAY_MAX` | advise.mjs | Optional (v10.44). Price searches a day for the whole site, default 40 (0 turns Find prices off: the GET then says `prices:false`, so the page shows no button). Also 5 a device, 10 a registration and 8 an address an hour, fixed in code. |
| `PRICES_MODEL` / `PRICES_EFFORT` | advise.mjs, advise-prices.mjs | Optional (v10.44). Default `claude-opus-5-5` at effort `low`. Find prices needs `ANTHROPIC_API_KEY` **and** `TERRAIN_AI_PASS`; without the passphrase the page never shows it. |
| `TERRAIN_CODES` | census.mjs, gifts.mjs | Conference access codes. **Only enforced when `TERRAIN_REQUIRE_CODE` is on** (v10.38: registration replaced codes on the first page). |
| `TERRAIN_REQUIRE_CODE` | census.mjs, gifts.mjs | `1`/`true`/`yes`/`on` brings the old access-code gate back. Unset = registration only. |
| `TERRAIN_REG_SECRET` | register.mjs, census.mjs, gifts.mjs | 32+ random characters. **Set it**: registration then issues a signed token and census/gifts refuse calls without one (401 `noreg`). Unset, registration is collected but keeps nobody out (fail-open). |
| `PRESENT_FB_URL` | present.mjs | Firebase Realtime Database address of the separate `terrain-live` project (see FIREBASE-SETUP.md). Without it slides still open and swipe; phones just don't follow the presenter. |
| `PRESENT_FB_SECRET` | present.mjs | That database's secret (or service-account JSON). Server only; never in the page. |
| `TERRAIN_ADMIN_KEY` | register.mjs | 32+ characters. Enables the admin list of registrations (header `x-terrain-admin`). Unset = no list endpoint. Registrations can also be browsed in Netlify → Blobs → `terrain-registrations`. |
| `RESEND_API_KEY` | gifts.mjs | Resend API key. With `GIFTS_FROM`, switches on "Email me my report". Also keys the hashed per-inbox send counter. |
| `GIFTS_FROM` | gifts.mjs | Sender, e.g. `Terrain <reports@pastorshub.org>`. The domain must be verified in Resend (DNS records on pastorshub.org). |
| `SITE_URL` | gifts.mjs | Optional. Base of the private report link in emails; defaults to the Netlify site URL. |

v10.43.0 (connect.mjs) adds **no** environment variable: it uses the registration token like gifts and present, and Netlify Blobs.

---

## Current state

**v10.51.3 (6 Oct 2026, quick lane) — Spiritual Gifts: "Who you are drawn to" is Section 6 of 6.** The pastor: *"Part two for the
spiritual gift survey. It shouldn't be like a next part. It should just be at the last section of the entire survey … right now 1 2 3 4 5
and this will be the sixth in line … so that it doesn't feel like an extra step they have to take it just gonna continue to the end"*.
The twelve heart questions keep their page, now under "Section 6 of 6" (never "Part two"), after an opener like the other five
(`gfRenderHeartOpen`: eyebrow, "Who you are drawn to", the rule, Matthew 9:36 from the verified library via `gfdVerse('case:matt9_36')`,
what it is, "12 questions", Carry on; seen once, `GFS.hseen`; Back clears it, as crossing back out of any section). The bar has a sixth
segment and dot (`data-gff="heart"`, red `--m-veterans`, as wide as its twelve, filled as they are answered: `gfHeartFill`, `gfSetBar` on
each tap); every section reads "of 6" (`GF_SECT_SHOWN`, `gfSectWord`); the welcome back counts it; "Carry on with section 6"; the intro
says six sections. The heart page's eyebrow and chosen answers are in its red. The five gift families (`GF_FAMS`, `GF_FAM_VAR`, the
report's colours) are unchanged. Tests: gifts-sections and gifts-engine updated to the new intent with comments, section 6 checked EN + ES
(failing first on v10.51.2: `Terrain-work/v66/logs/ff-v51-3-*.log`). Samples: `~/Downloads/Terrain-v10.51.3-samples/` (`shots11.mjs`).

**v10.51.2 (6 Oct 2026, quick lane) — "Your church": cut the fat.** The pastor: *"review members in spiritual gifts that should be a
bright button. It shouldn't look so dull … this box here where you check I don't think you even need that … current commitments and
limits does it need to be there either … cut the fat and only keep that which is going to be loadbearing to the process"*. Step 3
(Skills): "Review members in Spiritual Gifts" is a solid Spiritual Gifts violet button (`#u-team-link.u-teamgo`, `--gfv` / `--gfv-ink`
in both themes). The congregation boxes (`CAP_WHO`: mixed, one ethnic group, international, another language, older, young adults,
families, newcomers) and "Current commitments and limits" are no longer asked: nothing read them but the summary box (`isWho` was
never called), so the summary drops "Congregation" and "Already carrying"; a save keeps a church's earlier answers stored, unread
(`next={...c,…}` no longer resets `who`). Tests: `v51-2-church` (new, 7; failing first on v10.51.1: `Terrain-work/v66/logs/ff-v51-2.log`);
church-summary-box and background-ideas (typed into the languages field instead) updated with comments.
**His picture of the tools (6 Oct 2026):** the Community Survey finds what to do and hands a proposal to Make the Case; Make the Case
also stands alone (browse ideas there and make a proposal), and choosing Light / Moderate / Heavy lift sizes the people and money
(from the survey the lift is already chosen); the Evangelism Planner is for the bigger events (a 16-meeting series, a one-day health
event), drawing on the survey and the Spiritual Gifts results. **Next he asked for:** Make the Case standalone with the lift choice;
then the Claude-made needs list. Open: where the church's finances live (his question; my recommendation in the conversation: one
"Church budget" page in the Evangelism Planner, the yearly budget and each ministry's line; proposals still only state what they need).

**v10.51.1 (6 Oct 2026, quick lane) — Learn from other conferences: a better "Add".** The pastor: *"Can the drop-down look better …
the east Midwest South West East Coast, California regional conferences … as headings … more across and not just straight down … you
can click multiple ones so you don't have to … click one and then find it again and open it … up to nine … when you['re] done, it will
close everything"*. The long `<select id="cmp-add">` is gone: **Add conferences** (`#cmp-addbtn`, `aria-expanded`) opens a panel
(`cmpAddPanelHTML`, `#cmp-addp`, `CMP.addOpen`, closed whenever the tool opens): the area buttons across its top (moved into it); under
All a heading for each part of the country (East, Midwest, South, West), else the one area; the conferences in rows (`.cmp-tiles`, two
across on a phone), each a tick (`data-cmp-pick`, `aria-pressed`); his own is not in it; at nine besides his the rest are disabled; a bar
that stays in view with "{n} of 9 chosen", the ◌ thin-calendar key and **Done** (Escape too). A tap updates `CMP.st.others`, saves and
redraws the picker; Done closes it and draws the comparison again (`cmpRender`). `conferences-view` updated (the old list's checks
replaced, the panel's added, EN + ES; failing first on v10.51.0: `Terrain-work/v66/logs/ff-v51-1.log`). Samples:
`~/Downloads/Terrain-v10.51.1-samples/` (`Terrain-work/v66/shots8.mjs`).
- **The main menu** (same release): *"learn from other conferences should be kind of similar to the other icons … 1 2 3 on the top …
  Evangelism Planner and then next would be learn from other conferences the same format as the others and then maybe we can add one more
  later and have six"*. The compare tile is a tile like the others (no `.tool-wide`, no `.twt`); `.hub .tools` is three across from
  760 px (Survey, Gifts, Make the Case; the Planner, Learn from other conferences, a spot left open), one column on a phone
  (`shots9.mjs`: 1366, 1600, 820, 390). Pinned in `conferences-view`.

**v10.51.0 (6 Oct 2026) — the proposal on the page, editable; the bottom of step 3 cleaned up.** The pastor: *"the proposal to
vote on PDF … should show underneath … and it should be editable … a place you can tap edit and every line you can change it"*; *"I
don't know if we really need the how it is being decided"*; *"there's a verse and … a quote from Ellen White so just keep the quote from
Ellen White … Let's clean everything up"*; *"the your church ready to serve probably needs to be at the end and it should have the
spiritual gifts icon, and smaller one with a button that will … send the Pastor to the spiritual gifts page"*; then, of the slide panel
and the buttons: *"Dates … suggest options … I already know the dates what does this actually change? … what's the difference between
ongoing and a series? … restore the original. What is that? … present live should probably be a different color and highlighted and
glowing … see a sample slideshow … keep that just in case … what is your private ask list … how it is to be decided I don't think that
even needs to be there"*.
- **The Proposal to vote on, on the page** (`#cs-pz`, right after `#cs-room`, every view but the whole church and the sample):
  `casePzDraw` draws `caseProposal(model, deck)` line for line in the PDF's order (`casePzHTML`: kicker, title, memo, status, path, the
  motion box, why, the plan, the follow-up plan, the budget (amounts read-only: Adjust sets them), safeguards, review, Action taken with
  its boxes, the small print). **Edit** turns every line into a box; each change is saved as it is typed in `uChurch().propEdits[caseEditKey()]`
  (per church, ministry, group, language), keyed by what the line is (`casePzMap`: kicker, title, memo:<label>, status, path, motion,
  why:<k>, plan:<k>:<i>, fu:<label>, line:<i>, bud:<label>, bnote, safe:<i>, rev:<i>); an emptied line goes back to the app's words;
  **Done**; **Undo my changes** clears them all. `casePzApply` puts them on the Proposal: the page, **Download PDF** (beside Edit;
  `caseProposalPdf`) and the phones' copy (`prPdfSend`), only for the model chosen now (`casePzEditsFor`). `caseProposal` itself is
  unchanged (the goldens). The goal and the slides' words redraw it (`casePzSoon`), never while he edits it.
- **The buttons under the slides** (`caseActsHTML(false)`, `.cs-acts2`): Present live alone on the first row, gold (`--m-hardship`) and
  glowing (`.cs-live`); Share link & QR and Download PDF handout under it; "See a sample slideshow" a quiet link (`.cs-samplel`). The
  Proposal's PDF moved beside its Edit; the private ask list is "Who to ask" / "A quién invitar" (`caseU('askList')`) inside "Your church,
  ready to serve", shown once some results are in. The sample slideshow keeps its own row.
- **The slide panel** (`caseDrawEdit`): only the slide's own words. Dates (`caseTimingHTML`) and Runs as (`caseRunsHTML`) are no longer
  drawn (a choice saved before still counts; the functions stay); "Restore the original" is "Undo my changes" / "Deshacer mis cambios",
  shown only once the slide has his words; no "Saved on this device…" line.
- **Step 3's end:** no "How it is being decided" (`#cs-dec`) in step 3 at all (a decision is still recorded in the presenter view: its
  Decision button and end card); What to say, Questions, then **"Your church, ready to serve"** (`#cs-ready`, a `section`, last):
  `gfReadyPanelMount` draws a small card — the Spiritual Gifts icon (the main menu's own SVG, its ids suffixed: `toolIconSVG`), the name,
  one line (how many have discovered their gifts; the strongest as counts when there are enough), **Open Spiritual Gifts** (`gfU('openGifts')`,
  the landing) and, in Make the Case, "Who to ask" (opens `#cs-ask` under the card). The people / volunteers / leaders rows and the
  Sabbath-slides link are gone from it (the landing has them).
- **The close** (`.cs-close`, all three places): the Ellen White quote only; the Nehemiah verse is gone.
- Tests: `v51-proposal-page` (new, 43; failing-first on v10.50.0: `Terrain-work/v66/logs/ff-v51.log`); updated with comments: case-fixes,
  case-steps, case-screens (the buttons, "Who to ask"), timing-options (the Dates switch mounted by the test), v43-followup (#cs-fu after
  #cs-pz), gifts-first-ui and v45-profile-move (the small card). Samples: `~/Downloads/Terrain-v10.51.0-samples/` (`Terrain-work/v66/shots7.mjs`).

**v10.50.0 (6 Oct 2026) — the needs, clearer; Spiritual Gifts in three steps.** The pastor, from his computer: *"the title could be
neighborhood needs … tap the need and plant the seed"*; *"the categories should be much bolder … same color as the 1 2 3 … glowing"*;
*"instead of having it all shades of … pink use some shades of different colors"*; *"when you click it Ministry ideas … the columns showing
of all the ideas instead of having to click every single thing"*; *"also here make it a continuation 7 8 9 10"*; *"community resources …
two columns"*; and on Spiritual Gifts: *"on the top … steps so people know … fill in your church's information … send out spiritual
gifts survey … analyze the report … take that box away … it has to start with your church … this next part is the spiritual gifts part …
sample report should be below results … why would a member send me a code? Don't need that."*
- Needs: `nsU('h2')` "Neighborhood needs" / "Necesidades del vecindario"; `nsU('lead')` "Tap a need and plant the seed." The also
  cards are needs cards numbered on (`nsHTML` renders `[...needs,...also]` in one `.ns-list`; `nsCardHTML` adds the tag and
  `data-also`; `nsAlsoHTML` unused; show-all counts both). The category line (`.ns-need .ns-cat`) is bold, in the card's colour, glowing.
  Colours by category (`NS_CAT_HUE`, `nsHue`): the five kinds of figure keep theirs; Seniors, Veterans, Work & schedules, Young adults,
  Income, A divided neighborhood have their own (`--m-seniors` … `--m-divided`, both themes).
- Ideas: `nsIdeasHTML` draws `.ns-lcols`, three `.ns-lcol` columns (Light, Moderate, Heavy; heading, count, line, every row), one
  under another below 900 px. v10.46.1's lift buttons are gone (`NS.lift`/`nsLiftOpen` stay, unused).
- Community resources: `#helpslot` two columns from 760 px.
- Spiritual Gifts landing (`gfRenderRoster`): `gfStepsHTML()` (1 Your church → 2 Invite your members → 3 See the results; each scrolls
  to its part, the first opens Your church), Your church (1), `#gf-invite` (2, the two doors), `#gf-results` (3, the results, then
  "See a sample report"). No Gifts-first card on the landing (the hub and the profile keep theirs). No paste-a-code box; a member is
  never asked to send a code: a failed send says the answers are saved on the phone and to tap Send again; with no link, to open the
  church's link again (`gfcopy`/`gfcodebox` gone). "Finish the three steps to save your church."
- Tests: `v47-clean` gains these; updated with comments: v45-needs-ui, v45-review, v45-1-survey (columns), v42-plan-first, gifts-engine,
  email-off, gifts-first-ui, gifts-sample, gifts-landing, gifts-shortlink (paste checks retired), v45-profile-move.
- **Next (asked for):** "Generate new community needs" — Claude studies the tract's figures and proposes more needs, each tied to a
  real number, with ways to meet them checked against what other churches have done (a paid feature; a small cost per use is fine).

**v10.49.0 (5 Oct 2026) — money is stated, not checked; "Your church" in three steps.** The pastor: *"take the money part out
of your church section on the spiritual gifts and add it in the proposal section"*, then *"we don't wanna add a place to fill in
anything there. We just want the proposal to mention how much money they will need not versus available funds — we're gonna save all
that in inputting information into the evangelism planner"*; and *"the boxes for clicking … I don't think it's in the right spot"*.
- "Your church" (`capRender`): three steps (`U_WIZ`: Your church, Your building, Skills; `.u-track` 300%, panels a third, the
  slide `100/panels.length` per step); the Money panel and the summary's Money group are gone; a save keeps fields the form no
  longer has (so an older profile's money stays stored, unread). The description: "People, rooms and skills. The money for a
  ministry is on its proposal."
- Money is not part of what the church has: `capMerged()` and `caseCapFrom()` return `startup:null, monthly:null`; `uCheck` and
  `caseCheckWith` make no money gaps. So no "Left after this", no "Already over budget", no budget row on the capacity slide, no
  "Short by $…". The ask still states To start · Each month, the Ceiling and the Source; the cost answers have a version with no
  budget beside it (`board.cost`/`finance.afford` `aEn3`/`aEs3`); Luke 14:28 is homed on the ask first (`CASE_VERSE_HOME`).
  The conference proposal's budget table has no "From the church budget" row until the Evangelism Planner holds the church's funds.
- The Proposal page states the money in its "What it needs from our church" box; Make the Case itself shows a Money box
  (`caseMoneyHTML`, `#cs-money` at the foot of step 2, only with a ministry chosen): To start, Each month, nothing to fill in.
- Handout PDF: on a full last page the small print drops the Church Manual edition line before the under-18 note.
- "Your building": each room's checkbox, name and + sit inside its box (`.u-facilities>fieldset>legend` floats inside).
- Golden: all 535 keys re-written; `Terrain-work/v64/golden/golden-money.js check index-money-back.html` (the five money changes put
  back) reproduces v10.48.0's file 535/535. v45-survey proves its 32 keys the same way (`MONEY_BACK`). Tests updated with comments:
  case-model, case-fixes, case-review39 (F4 retired), case-pdf, v42-fixes, v42-average-church, v42-core, v41-decks,
  profile-slider, scroll-to-church, church-summary-box, v45-profile-move; `v47-clean` gains the money and room-box checks.

**v10.48.0 (5 Oct 2026) — the Proposal page.** The pastor: *"I don't like make the case I just want it to [say] proposal … this
beautiful thing [the idea's sheet] should be what you see when you press create a proposal for this ministry at the top … big letters
above that says proposal … then … who are you proposing to … the church board … the business session … the finance committee …
do we need all the others"*; the elders: *"keep"*; the schools: *"just take away the schools … we're focusing on the churches"*.
- In the proposal view (`casePropMode()`), the tool bar says "Proposal" / "Propuesta" (`caseMount` sets `#toolname`; Make the Case
  again when another ministry is chosen). `casePropHTML`: "Proposal" in large letters (`.cs-pbig`), then `.cs-pcard` with the idea
  as the sheet shows it (for the need, the name, the lift line, what it is, Why here, How to get started, What it needs from our
  church, the children's line), the One-page PDF (`data-cs-pdf` → `nsPdf`; `nsStatus` writes to the card too), the way back and
  "Choose a different ministry".
- Step 1 there is "Who are you proposing to?": `CASE_PROP_GROUPS` = board, finance, business, elders, one row, no kinds; a
  previously chosen group outside the four is cleared on arrival. "Choose a different ministry" brings back the full view.
- Tests: `v47-clean` gains the Proposal page (failing-first on v10.47.1: `Terrain-work/v64/logs/ff-v48.log`); v45-handoff reads
  the card's new parts.

**v10.47.1 (5 Oct 2026) — the needs a place of their own; "Main menu" at the bottom.** The pastor: *"This is a whole new kind of a
section so I don't want it to look like every other section. There's gotta be a title there … that will let people know that this is
a clickable area"*; of What's next, *"Does that even have to be there?"*; *"I like the top … at the bottom … keep that and then also
… main menu which will bring you to the main menu"*.
- `nsHTML` opens with `.ns-hero`: the label "From survey to ministry" (`nsU('eyebrow')`), the heading (no dot or rule), one line
  (`nsU('lead')`), John 4:35; the panel is framed in mint, set apart from the report.
- What's next is no longer drawn in the survey (`render()`; `uNextHTML` stays, unused there; `uNextRefresh` finds nothing).
- `#tomenu` ("⌂ Main menu", `floatMenu()`): beside "↑ Top", shown with it inside a tool (never on the hub, the first page or a
  member's link); it opens the hub. Its `right` follows Top's measured width (`--totopW`).
- Tests: `v47-clean` gains the panel, What's next and Main menu checks; What's next's UI checks retired in v43-path (with a
  comment); v45-handoff uses `uOpenProposal` directly; connect-client counts twelve `memberLink()` guard sites.

**v10.47.0 (5 Oct 2026) — the proposal first in Make the Case; a clean top to the survey.** The pastor: *"when I click make a
proposal from the community survey, it goes to the middle … this proposal will be front and center at the top and then below …
who it's for … as simple as possible … right now it's really messy"*; *"decide … should be leadership … then Ministry departments …
the three main places to propose … the board, the finance, the business meeting … the elders, not the nominating committee … let's
keep the Deacon and Deaconesses"*; and on the survey: *"focus everything show everything … erase all that and then the census track
area … we just need to know which church … neighborhood town and County … right above the brief … nice and clean"*.
- **The proposal view** (`casePropMode()`: Make the Case, `NS.back` set, its idea still the chosen one, not the buy path):
  `caseMount` draws `#cs-prop` (`casePropHTML`: "Your proposal", the name, one line, lift · people · money chips, "For the need:"
  with its figure, "← Back to the need", "Choose a different ministry" ⇄ "Keep this ministry" via `CASE_ST.propList`), then step 1,
  step 2 (the list, hidden unless asked), step 3 numbered 2 (`caseStepNo`). No path switch (`#cs-switch` hidden), no Gifts-first
  line, no step bar here. `nsLand` opens it at the top, focused; `caseChooseGroup` then scrolls to the slides.
- **Who is it for?** (`caseDraw1`, every view): the four sections as buttons across the top (`.cs-acats`, `data-cs-asec`,
  `CASE_ST.audSec`), the one holding the chosen group open, else Leadership. `CASE_AUD_SECTIONS`: Leadership / Liderazgo,
  Ministry departments / Departamentos de ministerio. `CASE_AUD_LAYOUT`: board, finance, business, elders, deacons; nominating under
  Ministry departments › Other committees (`CASE_AUD_SUBS.other`).
- **The survey's top:** `#place` is the church (`placeChurchHTML`: pin, name, address); Neighborhood · Town · County below it sit
  on the Brief; `#focusbar` and `#focusnote` are not shown (CSS), so with nothing chosen everything shows.
- Tests: `v47-clean` (new, failing-first on v10.46.1); updated with comments: v45-handoff (the proposal view), case-screens,
  case-steps, home-church (the new names and order).

**v10.46.1 (5 Oct 2026) — the needs at the bottom.** The pastor: *"what this neighborhood needs from your church should go after
community resources should be at the bottom"* (v10.45.1 had put it after Churches nearby). `render()` pushes `#ns-slot` after
`SEC_HELP` (with the plan; What's next follows it) and, in the free tier, before the "Beyond the survey" lock. Also: v10.46.0 had
committed a `node_modules` symlink (a worktree's, made in `Terrain-work/v65`; `.gitignore`'s `node_modules/` matches only a
directory); it is untracked again and `.gitignore` says `node_modules`. **Never symlink node_modules inside a worktree that is
committed with `git add -A`.**
- The lifts across the top (same release): *"light lift moderate lift and heavy lift across the top bar … I click light lift it
  essentially opens up … they will all be closed so just those three are seen … more compact"*. `nsIdeasHTML` draws `.ns-ltabs`
  (three `.ns-ltab` buttons, `data-ns-lift`, `aria-expanded`, the count) and one `.ns-lift` panel per lift, hidden unless open;
  `NS.lift={need,L}` holds his choice ('' after closing); `nsLiftOpen()` falls back to the lift of the idea he came back to
  (`nsBack` clears `NS.lift`). One list open at a time; tapping the open one closes it.

**v10.46.0 (5 Oct 2026) — signing in, and the conference bounds the churches mapped.** The pastor: *"every time I try to
sign in it makes me register again. There's no like sign in place"*; *"if you press Pennsylvania … shouldn't you have to click a
California or another conference in order to check those areas … what's the use of clicking Pennsylvania when you can still put any
Church in"*.
- **Signing in:** register.mjs is **register-1.2**: op `signin {email}` → what the first registration said (name, church, role,
  conf, union, news, lang) and, with `TERRAIN_REG_SECRET`, a token; 404 `not-found` otherwise. So signin says whether an address
  is on file (register still never does). It never returns the address, the id (only inside the token), claims or counts, writes
  nothing to the record, and counts every try: 20 an hour per client (`g/sin/<hour>/<tag>`, swept daily by gifts-sweep). The page:
  "Already registered? Sign in" under the first page's sub-line (`#gsignin`, `#signform`, `wireSignIn`, `regSignIn`,
  `regSignInPost`), one field; the record it gets back is kept as this device's registration (`synced:true`), then "Welcome
  back, {first}." and the hub. Hidden while conference codes are on. The help note says to sign in on another device.
  Church information still lives on each device (accounts and sync are later work).
- **The conference bounds addresses:** `CONF_STATES` (the conference registry's "states", embedded; `tests/v46-signin-conf`
  keeps it equal to `tools/conferences/src/registry/*.json`), `myConf()`, `confStatesText()`. `run()` refuses a typed or located
  church outside the signed-in conference's states (`OUTCONF`, before any Census call) with "This church is in {state}, outside
  the {conf} Conference … Wrong conference? Tap Change at the top." A quiet reload of a saved church is not checked; a conference
  with no list (Bermuda, Canada) is not checked; regional conferences use their several states.
- Tests: `v46-signin-conf` (13), sign-in sections in `registration.test.js` and `register-function.test.mjs`, the sweep's
  counters in `gifts-function.test.mjs`; all failing-first on v10.45.1 (`Terrain-work/v65-logs/ff-*.log`).

**v10.45.1 (5 Oct 2026) — the needs follow the report; each need opens on its figures.** The pastor, looking at v10.45.0 live on
his computer: *"it should be right after the community … survey"*; *"you don't need the thing that says your church's information
is on the spiritual gifts page … nothing to fill-in … English only at home, born abroad … don't need to be there either"*; *"what
the community needs is essentially needs to be more robust with information and I really like the circular graphs with the
colors"*; *"there's no differentiation between Ministry ideas to meet the need and what the community needs … it's all mush
together"*; *"when I click down below under also here … it jumps to the top"*; *"the spiritual gifts is always highlighted … nothing
stays highlighted"*; *"I really want the computer to be solid."*
- `#u-needs` moves into `#sections` on each `render()` (a `#ns-slot` after Churches nearby, before Where to look / the free tier's
  lock); the node is kept, so an open need stays open. The chip bar lists it in place (`buildSecNavInner`, `markSection` no longer
  special-case it); the Brief chip is "Resumen" in Spanish.
- Above the needs: the heading and John 4:35 only (`nsStripHTML`, the note and the Gifts link no longer drawn; their `NS_UI`
  strings stay unused). Where people were born sits in the language and newcomer needs (`.ns-born`).
- An opened need: `nsFigsHTML(n)` — up to four of the report's rings (`statRing`, `.stats/.stat`, kind colours, the county as the
  notch, "+9% vs county"), from `NS_FIGS` (rule id → figure keys) and `NS_FIG_DEF` (key → EN, ES, kind; `@lang`, `@langLow`,
  `@teens`, `@occ:<group>`); then "What helps" (`NS_HELP`, the old `STRATEGY` by category, US spelling, with Spanish); then "Where
  to begin" (the steps) and "Ask first". Rings are drawn only for the open need.
- The ideas are their own framed mint section (`.ns-ideasec`, `--k:var(--acc)`), the show button its header.
- `nsOpenCard`: closing the open need above no longer pulls the tapped row to the top (Safari has no scroll anchoring):
  `window.scrollBy(0,after-before)`; `scrollIntoView` only with `o.jump`.
- Hub: the halos and icons no longer breathe in turn (v10.38); all rest at `opacity:.22`; hover or keyboard focus lights one.
  "Your path": `.hp-step.now` no longer glows or breathes (it outlined Spiritual Gifts on every visit once a church was mapped);
  hover lights a step.
- Tests: new `v45-1-survey` (26, failing-first on v10.45.0: `Terrain-work/v64/logs/ff-v45-1-survey.log`); updated with comments:
  v45-handoff, v45-needs, v45-needs-ui, v45-review, v45-profile-move, v43-path, hub-glow, v41-1 and v45-survey (the version checks
  now read "the six agree" instead of a pinned release). `tools/ideas-src/vocab.json` rebuilt for the version.

**v10.45.0 (5 Oct 2026) — the Community Survey says what the neighborhood needs.** His words (3–5 Oct 2026, voice-to-text): *"There's
too much to fill in… no more filling in on community survey."* *"It's gonna give the things the community needs, the top priorities and the
greatest opportunities… in each need there's going to be a place to click and a drop-down with ideas… around 10… light lift, moderate lift
and heavy lift…"* *"…you can print the PDF… a clean and beautiful one-page PDF… then it can say create a proposal for this ministry."* (5 Oct)
*"One thing I really want to make sure is that it's clean and clear and easy to understand."* Design `~/Downloads/Terrain-work/v63/design/DESIGN-SURVEY.md`
(its §9 questions were built on their defaults), mockup `v63/terrain-survey-mockup.html`, the curated map `v63/curation/` (NOTES.md), the
build record `v63/build-work/` (patches, logs, gates); samples `~/Downloads/Terrain-v10.45-samples/` (README.txt there).
- *What it is:* the survey asks nothing. First under the address: **What this neighborhood needs from our church** (`#u-needs`): the
  needs, greatest first, each a card that opens in place (what the community needs, "Ask first") with **Ministry ideas to meet this need**:
  10–24 curated ideas in Light · Moderate · Heavy lift (8 at most a lift). An idea opens a sheet: what it is, why here, how to get started,
  what it needs from our church (general words, no check, no church data), the children's line where children take part; **One-page PDF**
  and **Create a proposal for this ministry** (Make the Case, path "A ministry", the idea chosen; "← Back to the need" reopens the need and
  the sheet). Below: **Also here**, near the line (4 at most) and across the town (4 at most, by score at the town), 8 in all. More than 15
  needs: 12, then "Show all {n} needs". THE BRIEF and every report section follow, unchanged. The church profile moved to the Spiritual
  Gifts landing, **Your church** (`#gf-church`); the hinge, Mobilization and the ministries list left `render()` (their functions stay,
  unreferenced, until the next phase). No background "fresh ideas" on Save, Demo or a survey (Q3: `autoIdeas` is no longer called).
- *Six decisions* (DESIGN-SURVEY §0): (1) `RULES` unchanged, so Make the Case, the gifts reports and every golden read what they read; the
  survey adds `RULES_MORE` (9 needs), `RULES_SAY` (its own words where a rule overstates), `NS_GATE` (debt: the rent half needs renters
  ≥ 15), `NS_RANK`; (2) the needs first, above THE BRIEF; (3) the curated map ships as `ideas/needs.json`, built from
  `tools/ideas-src/needs.json`; (4) lift = the library's `tier`, a built-in's `bandOf(load)` (`nsLift`); (5) the hand-off (`nsPropose`)
  saves the idea, adds it to the plan with no capacity check, opens Make the Case on the ministry path and lands on the card; (6) the old
  list code stays in the file, unreferenced by the page.
- *Calibration* (53,140 tracts in 18 states, `design/work/calib*.mjs`): a tract fires 6 · 9 · 11 · 15 · 19 needs (p10 · p25 · median ·
  p75 · p90) against 6 · 8 · 11 · 14 · 17 before; the debt gate takes debt away in 8.0% of tracts (where few rent). Score = w × strength
  (1–2) × 0.75 for a lens; within half a point the more effective need goes first.
- *The curated map* (curation/NOTES.md): 47 needs, 10–13 ideas each; 50 new library ideas, 41 reworded (84 fixes); `@lang` lists for six
  language groups (Spanish 22, the others 1–2), shown after the need's own list for the three language needs. `{lang}` in an idea's words
  is the neighbors' language (`libFill`): a language need's own; every other need's, and the Idea Library's, the tract's first at 4% or
  more; an "Across {town}" row's, the tract's first at 8% or more, else the town's at 4%. A Census group is filled with the members its
  title names, joined by "or" ("Hindi, Gujarati or Urdu" / "hindi, guyaratí o urdu", `nsLangMembers`, saved as `…--indo-european`);
  "our neighbors’ language" / "el idioma de nuestros vecinos" when the origins name no member, for Slavic and "Other", no survey, or no
  language that clears its line. It is filled on the cards, sheets, PDFs and in
  Make the Case (the library's search text drops the token: a search never sees the language). A {lang} idea is saved filled, under its
  own id for that language (`…--chinese`, `libFillRaw`), whether proposed from a need or chosen in Make the Case (`libSave`), and
  keeps it. The Diwali greeting shows only where India is among the top five places of birth of the need's own geography
  (`NS_ORIGIN_GATE`).
- *Nothing Pennsylvania-only* (§3.6): the rules' IDEAS (rent50, snap, unemp, growth), five built-ins and their steps (garden,
  skills-center, lot-market, noticeboard, bench), Community resources (town, city & county offices; centers; the mayor or town manager),
  14 library ideas (32 phrases; "the local American Job Center", "your state's clearances"); the validator's PA check (error;
  township/borough a REVIEW line; 90 library ideas still say township or borough, none of them reached by a need). The town's short name also drops the
  Census's "CCD" (Florida, California, Texas…: "Across Immokalee", not "Immokalee Ccd").
- *Changed files:* `index.html` (six stamps v10.45.0), `ideas/` (hash **`720b5d961b8d`**, 3,100 ideas, `needs.json` new),
  `tools/build-ideas.mjs` (the needs map and its checks), `tools/ideas-src/` (the curation: needs.json, themes, next.json and the rest;
  validate.mjs with the PA check, selftest.mjs 135 cases, vocab.json), `tests/`, this file. **Functions unchanged.** Verify after
  deploy: the badge **v10.45.0**; `https://pastorshub.org/ideas/needs.json` → `"v":1`, `"hash":"720b5d961b8d"`; `ideas/index.json`
  → the same hash.
- *Gates* (headless Chrome, `v63/build-work/gates/`, checked by `scripts/gate-check.mjs`): 1500 Berryessa Rd San José, 10 Greene Rd
  Warminster, 417 N 1st St Immokalee, at 390 and 1280, EN and ES: **345 checks, 0 failed**: the needs in Appendix A's order (13 · 8 · 26,
  "Show all 26 needs"), a need with 12–24 ideas in three lifts, a sheet per lift with one primary button, the PDF saved and one page with
  its fonts, the hand-off landing below the header with focus and "← Back", What's next (each row's × removes it), Demo and Save landing
  at "Your church", no sideways scroll, no console error, no new host; Warminster EN also the keyboard walk (Tab past the sheet's last
  button goes to the browser, never to the page behind: a native modal), reduced motion, print.
- *The review round (5 Oct 2026; `v63/review/`: CODE-REVIEW.md B1, S1–S5, M1–M7; PASTOR-REVIEW.md 1–28; COORD-NOTES.md 1–4, and the
  coordinator's ten decisions), patches `build-work/patches/p7-review.mjs` (the app), `p8-library-review.mjs` (the library),
  `p9-tests-review.mjs` (the suites); notes `build-work/NOTES.md`.* What changed:
  - **Money said truly** (#6): the 54 built-ins the needs show are priced at their source (`U_LINES_OWN`, US church, 2026,
    rounded; four truly free, `U_FREE_OK`), so the sheet, the PDF and Make the Case agree; an event or a series is one sum "in all"
    (before, and on the day or for the series); any other built-in says "Cost varies: ask your conference", never the $75/$25
    allowance on a sheet. Heavy-lift library ideas at "No cost" got figures unless truly free (NOTES.md). Make the Case's ceilings
    changed with them (248 golden keys of 38 ongoing built-ins re-written on purpose, listed in v43-ongoing-golden's header).
  - **The needs**: greatest first by score (a tie to the larger figure, then effectiveness); a language need's strength counts how many
    of its speakers have limited English (under a quarter: 1); on the Spanish page the badge never sits on a Spanish need, and that
    need says a church worshiping in Spanish has met it; no need on a share of a handful (`NS_MIN`: families with children 50,
    children 100, renter households 50, people born abroad 100; the badge only on a count of 50 or more); one figure, one row (debt's
    ideas join rent burden's or SNAP's list, grief's join "seniors living alone"; "Also here" never repeats a figure); the town of a
    census county division is "the Immokalee area"; "Also here" in plain words ("Almost a need here", "across Warminster"); Gini in
    plain words; the Census groups named by the members the origins point to, never two titles alike; "French or Haitian Creole" is
    Haitian Creole where Haiti is among the origins, else French; love-first wording and US spelling (`NS_SAY_FIX`, `NS_US`); the
    categories (`NS_CAT_SAY`: Work & schedules, Income, Young adults, Veterans); grief's verse Psalm 34:18, single parents' Galatians 6:2.
  - **The ideas**: the Spanish need 15 ideas at most, 5 a lift, no near-twins; no snow ideas in Florida, Hawaii, the territories or
    south of latitude 30; three built-ins and the Lunar New Year card in the need's language; VBS, the cold-snap check-in (only those who
    say yes), the court (two screened adults), Pathfinders and the sports camp reworded; the 54 built-ins' Spanish descriptions and
    partners; the Sabbath notes; the Diwali card's gentler words; the children's line "a parent's or guardian's consent".
  - **The sheet and the PDF**: the sheet centred on a computer; the short phone preamble (the lifts said inside an opened list); the
    PDF's labels as wide as the language needs, its foot in Spanish, its write-in lines, the verse above the foot, one type floor
    (9 pt read, 8–8.5 pt only for small labels, step numbers and the foot), a long church name ending "…", one in letters the page cannot print (Korean, Chinese) "Our church" / "Nuestra iglesia".
  - **The hand-off and Make the Case**: one plan entry per language (S1), kept in its language (S2); a proposal closed while it loads
    adds nothing (M2); "Why here" is the need's own figure (`nsWhyOf`); above the chosen card, what comes next and the way back;
    "Create the proposal for …" in lists; "Open the Community Survey" lands on the needs (M1).
  - **"Your church"**: a framed card near the top of the Spiritual Gifts landing, "Moved here from the Community Survey" a small note
    on its own line under the heading, open by
    itself while the church has no information, in Spanish (the form and its summary box), named for the church; kept across a redraw
    only for the church it was drawn for, and never saved into another (B1).
  - **The rest of the code review**: a deploy under an open tab reloads the index (S4); the PDF's type test reads the real sizes (S5);
    the focus note counts needs and "Also here" apart (M5); a new address starts closed (M6).
- *Gates after the review round* (`build-work/gates/`, `scripts/gate-check.mjs`): the three addresses and Atlanta West End and
  Edison NJ, at 390 and 1280, EN and ES: **743 checks, 0 failed** (the sheet centred, the landing's line in view, every button's words
  inside it, "Why here" the need's own figure, no badge on a handful, no twin group titles, no "Ccd").
- **Full suite: 131 suites · 9,759 passed · 0 failed.** (Before the review round: 130 · 9,647.)
- *Version clash:* the paused Evangelism Planner rebuild (`Terrain-work/v60/INTEGRATION.md`) was stamped v10.45.0 but never shipped;
  it becomes v10.46.0 when it resumes (re-stamp and merge on top of this).

**v10.44.1 (2 Oct 2026, quick lane) — the Hotspots map frames the reach.** The pastor, on his old Bay Area church: *"this is the
view that shows on the map from a very, very far distance. It's not just the immediate community under hotspots."* `basemap` sized
the frame to every nearby block's full outline, so one huge rural tract (centre a mile away, edge 30 miles off) pulled a map that
says "about 1.8 miles" out to the whole Bay Area. Now the frame is the reach (`ZONES.radius`, passed through `zoneMap` →
`basemap(church,zones,all,radiusMi)`) plus the numbered blocks' centres, with a 20 px pad (`pickZoom(bbox,church,pad)`); a block that
reaches past the edge is cut off there. Zoom 13 at 1.8 miles, 11 at 4.5, 10 at 10 (San José, Warminster, Miami). Pinned by
`tests/v44-map-zoom.test.js` (5 checks; 2 fail on v10.44.0).
 (2 Oct 2026)

**Handed over now: v10.44.0** (`~/Downloads/terrain-v10.44.0`; samples `~/Downloads/Terrain-v10.44-samples/`, README.txt there; the
integration record `~/Downloads/Terrain-work/v56/INTEGRATION.md`). The pastor (2 Oct 2026): *"we need to do the projects and purchases and the conference
comparison the year ahead first and then EVANGELISM planner will work on later"*. And, on offerings (2 Oct 2026, in
`tools/ideas-src/SABBATH-GUIDELINE.md`): *"a special offering taken during Sabbath worship for a church project (for example new sound
equipment) is fine: it is part of worship. Sales, fundraising events and selling tickets stay off the Sabbath."*
- *What it adds:* **Make the Case for a project or purchase** (builder B1, below: the switch "A ministry | A project or purchase", five
  framed steps, "Find prices", slides, the handout and the Proposal to vote on, never from tithe) and **Learn from other conferences**
  (builder B2, below: a fifth hub tile, the comparison of the past 12 months and the year ahead, checked monthly). The Evangelism Planner
  work comes later, as he said.
- *Changed files:* `index.html` (six stamps v10.44.0), `netlify/functions/advise.mjs` (**advise-2.4**: 2.3 the Sabbath guideline in its
  prompts with his 2 Oct offering line, 2.4 the modes `prices` / `prices-status`), the new `netlify/functions/advise-prices.mjs`
  (**prices-1.0**, a background function) and `prices-sweep.mjs` (**prices-sweep-1.0**, daily), the new served folder `conferences/`
  and its builders `tools/conferences/`, `netlify.toml` (`&& cp -R conferences site/`), `ideas/` (hash **`f7b32cd68d45`**, one idea's
  Sabbath flag), `tools/ideas-src/` (validator, selftest, vocab.json, WRITERS.md, SABBATH-GUIDELINE.md, one theme file), `tests/`, this
  file. present.mjs, connect.mjs, gifts.mjs, register.mjs and census.mjs are unchanged. **Deploy the page and the functions together.**
- *Merged* by the integrator with `git merge-file --diff3` per file against v10.43.0 (B1, then B2): `index.html` merged clean (the two
  builders' changes are far apart); one conflict in this file (both blocks of the architecture map kept). Merged and unchanged:
  **119 suites · 9,226 passed · 0 failed** (= 8,710 + B1's 380 + B2's 136).
- *The Sabbath leftovers of v51b* (`Terrain-work/v51b/CODE-SABBATH.md` §5–§6): the writers' validator reads the guideline in English and
  Spanish (fees, prices, festivals, game booths, film nights; "vendan", "cuotas", "precios"; "vendrán" is not selling; bought
  beforehand is fine; a café or diner unless a home, church, library or park is named; a raffle that raises money is refused like a
  sold ticket, a free drawing passes; a `false` idea that reads as worship, mercy, feeding or healing is a REVIEW line), selftest 128 of
  128 (`~/Downloads/Terrain-work/v56/integ/patches/patch-validate-v56.mjs`: v51b's patch, but "offering" is no longer a word that keeps an idea off the
  Sabbath); `vocab.json` rebuilt from this app ("Fix-it Sunday" / "Domingo de reparaciones"); the docs below (§6). Under his 2 Oct line
  every library idea "best on another day" was re-checked against v51b's reasons (`sabbath-detail.json`): one had a project offering as
  its only reason, **"A building project funded without pressure"** (a quiet giving season through the envelope and Adventist Giving;
  its question evening on a weeknight; no auctions, dinners or sales on the Sabbath): it now fits (1,481 of 3,050). "Back-to-school
  clothing cards" (gift cards *and* a special offering) stays: store gift cards are a money programme in every other idea too.
- *Found by looking at the samples, fixed (each failing first, `tests/v44-integration.test.js`):* (1) the goal box (both paths) cut a
  Spanish goal's fourth line on a phone (`rows="3"`): it now grows to its words (`goalFit`); (2) the request-for-quote letter said
  "please call pastor@example.org" when no phone was typed: an email is now written to ("please write to …" / "por favor escriba a …";
  `BUY_RFQ.visitMail`); (3) the Proposal's "Action taken" boxes touched the motion's last line (at the Spanish finance committee's
  tightest level they overlapped it): 4 pt lower inside the same box, every Proposal still one page; (4) on a phone in Spanish the
  comparison's heat tables ran "Conquistadores" under the first figure: a word of 13 letters or more gets one soft hyphen where a
  syllable splits (`cmpShy`: "Conquista-dores"), and a label may break as a last resort (CSS `hyphens:auto` was tried and hyphenated
  every label: not used).
- *Gates (headless Chrome, `~/Downloads/Terrain-work/v56/integ/gates/`):* the purchase decks at 360 × 640, EN + ES: 27 decks a language (the sample × six
  audiences, before and after a recorded decision, and three stress items), 538 slides, **0 over the frame**, none below fit 0.8; the
  existing decks: the 36 event and series built-ins × 34 groups × both timings and the Planner's series (2,516 decks, 26,846 slides a
  language), every library event and series × three groups (3,339 decks, 32,468 slides a language), the ongoing built-ins × five groups
  (335 decks): **0 over the frame** (5 English and 24 Spanish library slides at fit 0.75, as at v10.43.0); the relevance rule on 20,398
  ministry decks (0 breaks of any kind) and on 468 purchase decks (every kind of need × buy / repair / build × reasons × audience × EN +
  ES: 12,968 numbers, 0 not tied to the ask, 0 "%" without a census reason ticked); connect.mjs's security list (`connect-function`) and
  advise.mjs's (`advise-prices` 107, `advise-function`, `advise-topic`, `advise-sabbath`) in the full suite; the live phones scenario
  with the real present.mjs, purchase 17 of 17 and a ministry 15 of 15; the comparison at 390 and 1280, EN + ES, for four conference sets
  (no sideways scroll, no console errors); the purchase screens at 390 and 1280, EN + ES, before, during and after Find prices; the
  Netlify build simulated and opened (no 404 for any file of the site; the only other hosts Google Fonts and cdnjs, as v10.43.0).
- **Full suite: 121 suites · 9,260 passed · 0 failed.** New in v10.44: `v44-sabbath-leftovers` (16) and `v44-integration` (the
  integrator's), with B1's and B2's suites below; `v41-1` pins the six stamps at v10.44.0.
- **Review fixes, still v10.44.0 (2 Oct 2026; record `~/Downloads/Terrain-work/v56/FIXES.md`, each failing first on the integrated tree:
  `v56/fix/logs/failing-first.log`).** Purchases: (1) the handout prints Ellen White under her own heading, **Spirit of Prophecy** /
  **Espíritu de Profecía**, never under "Scripture"; (2) **one Ellen White line on every deciding body's deck**, at its close: the
  finance committee, the board, the business meeting and the conference quote *Testimonies* vol. 5 p. 491 ("the words spoken by Christ’s
  representatives", cut to that sentence so it fits at 360 × 640; the whole church keeps PP 344), and the Proposal's Why carries the same
  line (its words to fit level 1, its reference from level 2): his "biblical foundation and the Spirit of Prophecy", and Christ named;
  this changes DESIGN-PURCHASE §4.2, his to keep (`buyEgwFor`); (3) **a repair, an installation or a building project speaks of the
  work** (`buyIsWork`): the motion "To approve the work, a new shingle roof (Better) by Roofer B, … including materials and labor … with
  the deacons overseeing the work … when it is finished", "Approve the work" / "Today the church votes on the work", "Company" /
  "Empresa", "Work days", "Ready for use", the why slide says the reason he ticked, and Psalm 33:3 only for sound, music and the stream;
  (4) undated timeline steps in the order they happen (Bought → Installed → First use); (5) the hub tile: "Proposals for ministries,
  projects and purchases." / "Propuestas para ministerios, proyectos y compras." (Q10's default); (6) "Something else" naming a sale or an
  event: "Not on the Sabbath." under it and the safeguard "Sales and events never on the Sabbath"; one put on the Sabbath is refused
  (`sabbathNo`; Saturday night after sunset is fine); (9) the opening never cuts what is voted on ("Better · $3,400"; the whole church
  "What: 16-channel digital mixer, PTZ camera and encoder", never a price), the three options' labels whole; (10) "Why this one" is a box
  that grows to its whole suggestion (`buyBoxFit`); (11) no heading names a body twice ("PROPOSAL TO VOTE ON · CHURCH BOARD");
  (19) Clear all's warning names the projects, EN + ES; (20) **Church Manual 2025 p. 153 said as it is** (`buyConfWhy`): a loan or any
  debt → counsel with the conference officers; building or adding on → the conference and union committees approve; a repair over his
  conference's amount → "Our conference reviews building work over $X (our conference’s rule)", no Church Manual page; the conference's
  deck asks counsel unless it is building; (21) the Spanish pages are the English 2025 edition's and say so ("Manual de la Iglesia 2025,
  edición en inglés, p. 148"; the slide "(inglés)"); (22) an Ellen White reference names every page its words are on (PP 344, 347;
  tomo 5, 463, 464; vol. 6, 101, 102; tomo 6, 106, 107: `_sources.egwPages`); (23) p. 152 is "a strong stand against questionable ways
  of raising money, such as lotteries"; "No raffles or games of chance" is "our rule"; (25) the van rule by model year and modified vans
  (NAD working policy S 60 31). The safeguards slide keeps the six that matter most (`buyRiskSix`) and gives up its verse when its words
  run long. Find prices: (12) **one tap's searches are capped across every request of the job** (each follow-up asks only what is left;
  spent → one nudge, no more continuing: at most 6 searches a tap); (13) a search still running when the page comes back is asked again
  until done, the button waiting (`buyPricesResume`), never a second paid search; (14) a wake-up that times out fails the job only while
  it is still queued (a worker that took it keeps its result and the counts; the page gets the job); a worker whose result nobody kept
  logs `lost`; (15) a searched store's host always shows, and the server refuses brackets in a searched store's name; (16) the request
  carries a budget only when the plan is planned (≤ $500,000), and a need of 3 letters at least; (17) `PRICES_DAY_MAX=0` hides the
  button. Conferences (data `"v":"0c46f5b3c1db"`, rebuilt): (7) boards, school boards and constituency meetings are not ministry
  events (`boardOrSession`: "From Ohio: Board of Education" is gone, and the Schools shares and "typical" move: Ohio 9.4 → 6.5%, Lake
  Region 10.7 → 5.1%, the education median 5.2 → 4.1%); (8) a Midwest–South pick is "another part of the country" / "otra región del
  país" (`why_other`); (18) a standalone "IA" is written out (Iowa; Indiana Academy) and any other "AI" / "IA" stops the build. Left for
  him: the two Spanish verses (finding 24, below). Gates: the purchase decks at 360 × 640 EN + ES, 51 decks a language with seven stress
  items (a roof, a van, a loan and a sale, a kitchen over the conference's amount), 507 slides, **0 over, none below fit 0.8**; the
  purchase relevance rule on 468 decks, 13,032 numbers, 0 breaks; the screens at 390 and 1280, EN + ES; the comparison (Texico,
  Iowa-Missouri, Pennsylvania with Ohio) at 390 and 1280, EN + ES. **Full suite after the fixes: 121 suites · 9,344 passed · 0 failed** (before them 9,260).

**v10.44.0, part 1 — builder B1 (2 Oct 2026; built in `~/Downloads/Terrain-work/v56/B1/proj`) —
Make the Case for a project or purchase, "Find prices", and the Sabbath guideline in advise.mjs.** The pastor: *"we need to do the
projects and purchases and the conference comparison the year ahead first"*. Design: `~/Downloads/Terrain-work/v56/design/DESIGN-PURCHASE.md`
(+ `purchase-quotes.json`, the verified verses and Ellen White lines); builder notes `~/Downloads/Terrain-work/v56/B1/NOTES.md`.
- *The switch* above Make the Case: "Make the case for: A ministry | A project or purchase" (`#cs-switch`, `buySwitchHTML`; kept in
  `uChurch().proposalPrefs.path` / `.buy`; `casePrefs()` and the ministry path's steps unchanged).
- *Five framed steps, each its own colour* (`buyMount`, `buyDraw1`…`buyDraw5`, `buyStepBar`): ① What do you need? (nine kinds; buy · repair
  or install · build; the reasons of the kind with his counts; the team that cares for it; the goal, suggested from the reasons) ②
  Three options (Good · Better · Best; **Find prices** only on an unlocked device whose server says `prices`, else "Type your three
  quotes."; found prices never overwrite a slot he typed, they wait under "Also found"; Why this one; the quote letter to three local
  companies, EN + ES, as text and PDF) ③ How we'll pay (the meter; church budget, designated gifts, a special offering **in Sabbath
  worship, on a Sabbath**, a matching gift, a community grant, sale of old equipment, something else; **never tithe**, never raffles;
  dates with work days off the Sabbath) ④ Who decides (his church's path, a business meeting over his church's own amount, three
  written quotes over an amount, the conference when asked; audiences; Record what we decided with no day or length) ⑤ Present and
  vote (the slides, Present live / Share, the handout, the Proposal to vote on).
- *Slides* (`buyModel` → `buyDeck`, present-1.4's types only, at most 12): one arc from the goal to the ask, each audience its own order;
  the motion slide three rows; numbers only that bear on the ask (`buyFacts`); a verse on every content slide from `PURCHASE_VERSES`
  (KJV / RVA 1909, verified in `tests/scripture-bg.json`), placed scarcest room first (`buyVersePlan`).
- *Paper* (`buyHandout` → `buyPdfDoc`, two pages at most; `buyProposal` → `buyProposalDoc`, one page for the sample, two at most): the
  comparison chart, the funding table (= `buyTotal`), "Never from tithe" with the Church Manual 2025 pages, the motion, the trail,
  Action taken; on phones through `prPdfSend` → `buyPdfSend`.
- *Find prices* (advise-2.4 → `advise-prices.mjs`, a background function of up to 15 minutes): the order of refusals nokey 503 →
  disabled 403 (no passphrase) → locked 401 → noreg 401 → bad input 400 → limits 429 (device, registration, address, site; given
  back on a refusal or a failure) → a job, polled with `prices-status`. Web pages are information, never instructions; only URLs the
  searches returned; links cleaned (https, no tracking or referral codes, no affiliate hosts, Amazon as `/dp/ASIN`); logs carry a
  code and counts only. Tests stub `fetch` and never spend credit.
- *The average church* (`tests/average-church/seed-purchase.json`, made by `make-seed-purchase.mjs`, never by hand): seed-followup plus
  a sound board and a camera for the livestream at sample prices from Store A/B/C (sample).
- Pinned by the new `purchase-quotes`, `buy-core`, `buy-deck`, `buy-ui`, `buy-docs`, `buy-average-church`, `advise-prices` and
  `advise-sabbath`, and the updated `no-ai-words`, `v40-accuracy`, `advise-function`, `advise-topic`. **Full suite in B1's copy: 117 suites · 9,090 passed · 0 failed** (base 109 · 8,710). Gates (headless Chrome): 520 slides at 360 × 640 EN + ES, 0 over, fit ≥ 0.8; the screens at 390 and 1280, EN + ES; live with the real present.mjs, two phones, 17 of 17; 24 PDFs opened with PDFKit.

**Before it: v10.43.0** (`~/Downloads/terrain-v10.43.0`; the section "v10.43.0" below). The table is as it was at v10.42.0;
since then v10.42.0 and v10.42.1 went live (30 Sep 2026). v10.43.0 adds `connect.mjs` (connect-1.0) and `connect-sweep.mjs`
(connect-sweep-1.0), changes `index.html`, `ideas/` (build hash `13dfaf05d4e1`: every idea now carries `cad`, events and series
`nx` / `nocard`), `tools/` and `tests/`; present.mjs, gifts.mjs, register.mjs and advise.mjs are unchanged.

| | Live on pastorshub.org (29 Sep 2026) | Handed over |
|---|---|---|
| `index.html` | **v10.41.1** (29 Sep 2026) | **v10.42.0** (phones locked while he presents; his handout and the proposal to vote on on phones; timing options instead of dictated dates, a ministry team choosing the length too; part 3: the focus — a goal, one arc, the relevance rule, the Proposal to vote on, Record what we decided, Gifts first; section F: the survey chooses, Make the Case wins support) — commit the folder (see Open work 1) |
| `present.mjs` | **present-1.2** (with v10.41.1) | **present-1.4** (the handout and proposal PDFs for phones: op putpdf, GET op=pdf, `pv` / `qv`; the `how` slide; the gifts deck; 1.3: a room's `mode` and `pdf`; every older deck and room unchanged) |
| `register.mjs` / `gifts.mjs` | **register-1.1** / **gifts-1.2**, census registration gate on | register-1.1 / **gifts-1.3** (200 results an hour from one address) |
| `advise.mjs` | **advise-2.2** | same (its error strings still say "AI", but the page never shows them) |
| `ideas/` | **2,249 ideas in 42 themes** (`e677d04959f8`) | **3,050 ideas in 57 themes**, every one with a reach (634 in · 2,163 out · 253 both), EN + ES (build hash `f2cc1121c190`), from `tools/ideas-src` |

**v10.43.0 (1 Oct 2026) — ongoing · a series · one-day events, a follow-up plan for every outreach event and series, and
connection cards hosted by Terrain; "What's next" at the end of the survey and "Your path" on the hub.** The pastor (30 Sep
2026, voice-to-text): *"For 'ministries our church could offer', we should separate the things that are weekly or monthly —
ongoing ministry — and events, which are one-time, one day. A lot of our churches do a one-day thing, and after one day there
needs to be some kind of follow-up if we connect with the community. If people come in on a one-day event there has to be a way
to collect information, connect with the community, get their information somehow, so that we can build a relationship with
the people."* He approved: *"yes. it should host the connection cards tailored to the situations. and yes, the three-way split is
good."* And: *"make sure the connection cards are beautiful and attractive, designed well, not just plain text."* Then (§5):
*"At the end of the Community Survey, at the very bottom, there should be a Make the Case button for this specific ministry…
right now they can click it and then there's no next… They could skip the Spiritual Gifts and go straight to Make the Case, but
eventually the Spiritual Gifts need to be done so they know about their membership."* Spec: the build session's scratchpad
`v45/SPEC.md`; design `v45/design/DESIGN.md` (with `FOLLOWUP.md`, `CONNECT.md`, the data in `design/data/`). Built by three
builders in parallel (C1 cadence + follow-up plan, C2 connection cards, C3 §5) and merged by the integrator with
`git merge-file --diff3`; an app restart on 1 Oct 2026 (15:25) wiped that scratchpad (`v48/`: the builders' copies, the integrator's
fixtures and every harness), and the integration was finished from this folder (record: `~/Downloads/Terrain-work/v53/INTEGRATION.md`;
the builders' reports: `~/Downloads/Terrain-work/v53/builders.json`; the rebuilt Chrome harness: `~/Downloads/Terrain-work/v53/h/`).
- *Three kinds of ministry, everywhere* (C1): every idea has a cadence — **ongoing** (weekly or monthly), **a series** (a set number
  of sessions that ends) or **a one-day event**. Data: `tools/ideas-src/cadence.json` (3,050 ids: 1,937 ongoing · 829 events · 284
  series, 97 of them with no count stated), shipped as the integer `cad` (0 ongoing · 1 event · 3–26 a weekly series of n ·
  103–126 n on days in a row · 100 a series whose idea states no count) in the index's last column and each theme record. The
  103 built-ins: `CASE_CADENCE_BUILTIN` (18 events, 18 series). `caseCadenceOf(x)` reads his "Runs as" › the plan › the data ›
  the built-ins › a guess. A small label on every card ("One-day event", "Series · 6 sessions", "4 nights in a row") and a filter
  **All · Ongoing · A series · One-day events** (ES "Todos · Continuos · Una serie · Eventos de un día") in the survey's list,
  the Idea Library and Make the Case step 2. "Runs as" (step 3's edit panel) corrects a wrong label for his church.
- *Timing by cadence:* an event has a date to choose (no weekday rhythm, no length), a series its number of sessions (weekly, or
  nights in a row), ongoing keeps v10.42.1's words **byte for byte** (`tests/v43-ongoing-golden.test.js`, 535 outputs; the
  builder's full sweep 5,655). Deck, handout, Proposal, motion, the calendar line and Record what we decided all follow.
- *The follow-up plan* (C1): every outreach event and series (`fuApplies`: not ongoing, not in-reach, not made and handed out, not a
  no-card idea) names its **next step** — the ongoing ministry it feeds (health fair → cooking school, back-to-school → homework
  club, block party → monthly family night). Suggested from the plan, then the hand-reviewed pair (`tools/ideas-src/next.json`,
  1,113 series/events × 2 ongoing targets; `CASE_NEXT_BUILTIN`), then the theme; staffable first; he picks another or names his
  own (step 3's **"After the day"** card `#cs-fu` and its picker; saved per church + idea, `uChurch().followUp`). The timeline:
  a thank-you within 48 hours to everyone who left a phone or email; an invitation within 2 weeks **only to those who ticked
  something about what comes next**; a visit only if they asked (7 days); the interest coordinator keeps the list (Church
  Manual p. 91). Every event/series deck gets an **"After the day"** slide (series: "After the series"), the handout and the
  Proposal a **Follow-up plan** section, the motion "…; with the follow-up plan: an invitation to {next} within two weeks, for
  those who ask". Results are **counts only** ("23 connected · 9 took the next step"), never a name. His Planner series has the
  plan without counts and no card (its record book keeps its people).
- *Connection cards hosted by Terrain* (C2): from the idea card or step 3, he makes a card: a short link
  `https://pastorshub.org/#connect=<ID>` (always the live site, never a deploy preview), a QR code, a printable card (half
  letter, two per page, or a 4 × 6 postcard; English, Spanish or both) with write-in lines for people without a phone, and the
  phone form. **Tailored** to the occasion (theme, event or series, next step): a health fair offers the cooking school, the
  recipe booklet and screening results; back-to-school speaks to parents ("please don't write children's names"); grief,
  care, recovery and abuse cards are gentle with the professional line (988, SAMHSA 1-800-662-4357, the National Domestic
  Violence Hotline 1-800-799-7233: checked on the official sites 1 Oct 2026); the abuse card names no event and has a quick exit.
  Always "I'd like prayer", "I'd like a visit" (never on an abuse card), "Nothing more, thank you". Asked: a first name; a phone
  or an email only when a ticked choice needs it, with the consent line "The church may contact me about what I ticked. I can
  ask to be removed at any time."; "Are you 18 or older?" — under 18: a kind message, **nothing sent or kept**. Nothing required
  beyond the first name. The phone keeps nothing (no storage, no cookie). **Beautiful, not plain:** one design system with nine
  looks (health, food, family, youth, music, prayer, seasons, calm, general), each a colour family of Terrain's and a drawn
  motif (data, drawn the same in SVG and in the PDF), the app's display and script faces, a framed QR with "Scan to stay in
  touch", tiles with small icons, a thank-you that names the next step and when it starts; it prints well in black and white.
- *The server* `netlify/functions/connect.mjs` (**connect-1.0**, Netlify Blobs store `terrain-connect`) and the daily
  `connect-sweep.mjs` (**connect-sweep-1.0**): a card with a secret key for him and a public id; op create / update / card /
  submit (public; honeypot, too-fast, limits per address, per card and site-wide, strict validation, no markup) / pull / ack /
  delete / withdraw / close / remove; answers readable only with the key, never logged; the registration token as gifts and
  present use. Kept at most a year; once his device has taken an answer the server keeps it **30 days** more
  (`TAKEN_KEEP_DAYS`: DESIGN's Q1, the recommended answer, as he did not choose; one constant and one line of the privacy note).
  **No new environment variables.**
- *His side* (on his device only, `uChurch().connect`): the **Connections** list per event — names, contact, choices, private
  notes; the checklist per person (thank-you sent · invited · visit arranged · took the next step) with what is **due today**;
  copy a thank-you or an invitation, or text / email / call from his own phone (Terrain sends nothing); a CSV for the interest
  coordinator (never the note; a warning line); delete on request (device and server); a paper card typed in. Clear all keeps
  the Connections (people are not plans); the Backup line says the file holds names.
- *"What's next"* (C3) at the very bottom of the Community Survey (`#u-whatsnext`): one **"Make the case for {the ministry}"**
  button per ministry in the plan, opening Make the Case at step 1 with it chosen; a **Connection card** button beside each event
  or series; an empty plan points up to the list; then the Gifts first card with "Proposals are stronger when your members know
  their gifts. You can make the case first and do this alongside." The survey card's "Build proposal" is "Make the case for this".
- *"Your path"* (C3) on the hub above the tools (`#hubpath`): ① Map your neighborhood (Done ✓) · ② Discover your members' gifts
  ("40 of 46"; "So every proposal knows who is gifted and ready.") · ③ Make the case ("3 ministries in your plan") · ④ Plan an
  evangelism series (Optional / Done ✓). The first step not done breathes gently (reduced motion stops it); none blocks another.
- *The average church* (`tests/average-church/seed-followup.json`, from the part-3 design's `build-fixture.mjs`): seed-after plus
  the plan of three (the health fair, back-to-school, the 4-night series), his next step for the health fair (the cooking
  school), and three cards with made-up adult answers (23 for the health fair: 14 thanked, 12 invited, 2 visits asked, 9 took the
  next step, 2 due on 1 October; 6 for back-to-school; none yet for the series). `tests/v43-average-church.test.js` holds it.
- *Integration fixes:* the shared block between the markers is C2's (C1 had pasted an earlier copy); `showHub` runs both the quiet
  pull and "Your path"; section 5's page check reads `memberLink()` (a tenth guard site); four tests that simulated a missing
  builder by deleting a function declaration (which cannot be deleted) now hide it by assignment; `connect-function`'s leak scan
  matches the short made-up names as whole words (a random key once contained "Fay"); the ongoing golden says the version field
  back as v10.42.1 before hashing (it is the only byte that moved).
- *Finishing the integration (1 Oct 2026, after the scratchpad was lost; each fix failing-first, `v53/INTEGRATION.md`):*
  (1) **the Proposal's pages**: the Follow-up plan section and the motion's clause pushed every ministry team's (and the whole
  church's) Proposal of an event or series onto a second page at every level (the average church: 360 of 360; the event and series
  built-ins × six team groups: 360 of 432 English ones, up to 54 pt over). A team's Proposal *with a follow-up plan* now has
  a fifth level (`caseProposalDoc`: `top` 5, level 4 at 0.84): no WHAT row (tight, it is only the name the title and motion
  say), two steps, one safeguard, the review row, the follow-up timeline in the step-3 card's short words (`Pz.followup.tight4`).
  English: one page for all 1,944 (v10.42.1: 1,890); Spanish: 1,755 (v10.42.1: 1,053), none worse; the library's events and series
  (every 12th, 744): English all one page, Spanish 336 of 372 (v10.42.1: 206), none worse. Every other Proposal unchanged (an
  ongoing one never reaches level 4). (2) **fixed dates** said the trial's window: an event "on 20 Oct" had WHEN "20 Oct – 3 Nov"
  (the review day), the handout's ask "Approve a one-day event, from 20 Oct to 3 Nov", the conference's "Runs" row the same, and
  the handout's review "continue, change or stop". Now `V.last` + `CASE_CAD_LEAF` ("from {start} to {review}" → "on {start}" /
  "from {start} to {last}"), WHEN and Runs from `CASE_CAD_T.runs`, the review from `CASE_CAD_T.pdfReview`. (3) **the people
  stay** when the server forgets a card (`no-card`: answers go 30 days after his device takes them, an unused card 30 days after its
  day): `cnPull` moved the card off his device and its 23 people were orphaned (gone from the list, the counts, "due today" and
  the After slide, yet still in the Backup). Now it goes to `past` with no key, like Remove, and the list opens on people with no
  current card (no paper-card form then). (4) **a slide cut its own sentence**: the renderer kept 120 characters of the ability
  slide's line (`tdS(s.lead,120)`), so the Spanish "…para esta obra: acompañe y capacite." ended "…esta obra: a"; now 200, a line
  over 120 a size smaller (`.td-notelong`). (5) **words of a one-day event**: "Serves on the day…", "Training before the day"
  (`RC.member.textEvent`, `support.startEvent`), and the whole church's Help "Give a few hours on the day." / "Give one evening
  of the series." (`yes.help.textCongEvent` / `textCongSeries`). (6) the next-step picker's "1 volunteers needed" / "Se necesitan
  1 voluntarios" → "1 volunteer needed" / "se necesita 1 voluntario". (7) the phone form's tapped tile drew a second ring (the
  checkbox's focus): the ring is for the keyboard only (`:has(input:focus-visible)`). (8) `present-client`'s "closing the ask
  list takes the names off the page" read `body.textContent`, which includes the page's own script, and v10.43's list of words that
  keep their capitals names the book of Ruth: the check now reads what the page shows (a measuring fault, not a change of mind).
- *Fixes after review (1 Oct 2026; record `~/Downloads/Terrain-work/v53/FIXES.md`, patches `v53/fix/patches/`)*: a design review and a
  security review of the integrated build found 20 things (7 major, 1 major in security, 12 minor); all are fixed, each failing-first:
  (1) **the privacy promise** was missing from every team and whole-church Proposal (their tight levels kept two rows) and from about
  half the handouts (the note was left out from level 3), and 27 children's documents never said "We never keep children's names":
  every form of the Proposal's Follow-up plan now ends with a Privacy row (`Pz.followup.tight` / `tight4`), and the handout draws the
  note at every level (at level 3 joined to the list row). Room for it on a team's one page (level 4): FROM and DATE share one row,
  the budget's one line leaves "Left after this" to the board's Proposal (`Pz.budget.rows4`), a little less air under the heading.
  Measured on every event/series built-in × 34 groups × both timings (2,040 a language): the promise in all of them; the pages none
  worse than before (English team Proposals 1,800 of 1,800 on one page, Spanish 1,740 of 1,800, as before; no handout over two).
  (2) **timing words follow the cadence** (SPEC §1): an event's roles "3 h in all", a series' "2 h a session"; the help line "Give 2
  hours on the day" / "at each session"; WHO "about 4 hours each, in the weeks before and on the day" / "over the series"; the cost
  "To start · on the day" / "the series" (an event's monthly cost is its cost on the day; a series' for its months: `ask.run`,
  `ask.runF`), the motion's "($500 to start and $100 on the day)", the church's own budget "$50 monthly"; the whole church's "give
  one evening a month" through `CASE_CAD_LEAF` (`CASE_CAD_T.mw`, `caseCadHoursEach`, `caseCadMW`, `ask.cad`). Ongoing ideas stay
  byte-identical (the golden).
  (3) **the printed card, redrawn** (`cnPdfCard` with `opt.part` full / front / back, `cnPdfLayout`, `cnPdfSides`, `CN_PDF_FLOOR`):
  type floors (fine print 7.5 pt, choices and labels 9 pt; bilingual cards went down to 4.4 pt); one language a side ("Both": English
  on page 1, Spanish on page 2, the same ink and size, each side saying where the other is: "En español al reverso"); a card that does
  not fit one side loses note lines, then goes two-sided (the QR on the front, the form on the back; the postcard always, a gentle
  card's helpline on the front when it fits); the choices on a pale panel in the look's tint, each with its box in the look's ink and
  the phone's own icon in the look's line colour (`cnSvgPath` → `cnIconPDF`: the SVG icons, arcs and all, as vector paths), two
  columns on the half card; the QR framed at about 2 in, "Scan to stay in touch" as a display line beside it (never past the
  margin), the printed link without `~en`; the fallback heading face Times Italic (was Times Bold Italic, heavier than the script
  face the pastor approves on screen); the sheet's preview in the faces the card prints in until `fonts/` holds the two
  (`CN_FONTS_OK`, `.cn-prev-fb`); "Print on both sides of the paper." when a card is two-sided. `cnPdfFit` is gone.
  (4) **the Spanish title cut where the English is** (`cnCutPair`, `cnTitles`; `cnNextNoun(name, lang, enName)` for "What's next" and
  the next step): "Full health expo" / "Feria de salud completa" (the Spanish kept ", con pruebas y una ruta de derivación" on the
  card, the phone, the sheet and "Lo que sigue"); a Spanish name with no place to cut keeps the English whole too; three built-ins
  carry a short Spanish card name (`CN_TITLE_ES`: drive-in, lit-doors, toy-swap).
  (5) **the phone's band**: the church line ends before the motif (`.cn-church` max-width `calc(100% - min(40%,220px) - 24px)`; it ran
  16–17 px into it), "Seventh‑day" never breaks at its hyphen (`cnNoBreak`, U+2011), headings keep "Thank you" together and never
  strand a word (`cnHeadKeep`: no-break spaces, the same words).
  (6) **security**: a withdrawal always writes its tombstone (op withdraw; someone who withdrew between his device's pull and its ack
  stayed on his device for a year while their phone said "Removed"); an email may not carry ? # & = % /, and only letters, digits,
  dots and hyphens after the @ (`RE_EMAIL` in connect.mjs, `CN_RE_EMAIL`, `cnPaper`); the list's contact link encodes the address (a
  submitted "email" could add a Bcc and a body to his mailto:). **The neighbour's page asks no other site** (DESIGN S22; it fetched
  Google Fonts, telling Google the time and address of everyone who opened a card): a five-line script in the head loads Google
  Fonts only off `#connect=`; the card page uses its own same-origin faces (`@font-face` "Terrain Card Script" / "Terrain Card
  Display" from `fonts/`, the files the printed card embeds) or the phone's own serif italic and sans (`html.cn-nofonts`).
  (7) smaller: three motifs (general: open contour lines running off the edge, not target rings — "neighbours are never targets";
  seasons: a leaf garland, no Christmas stars on a November festival; family: five linked rings, no stray dots); two icons (prayer:
  hands together, not a votive candle; the next step: a signpost, not the "sign in" door), his to change; "For parents and
  guardians." not on the fall festival and the car care day (`CN_NOT_PARENT`; the Christmas toy store "for parents" keeps it); the
  thank-you adds "We will pray for you." when prayer was ticked with something else (`CN_TEXT.prayLine`); the health fair's step 4
  "Offer the connection card at every station; follow up within two weeks, only on what people ask for." (was "…the expo is
  worthless without this"); "Weekly homework club (ongoing)"; the motion's clause in brackets ("…with a named coordinator and the
  follow-up plan (an invitation to the weekly homework club within two weeks, for those who ask), and to bring it to the finance
  committee"; `clause.followupA` for a team).
  (8) the fixture `seed-followup.json`, by the asserting script `v53/fix/patches/p9-fixture.mjs` (never by hand): the cooking school
  starts on 13 October; the health fair's Spanish card title is cut. The samples (only) give their church the people for its plan.
  (9) *final review* (`v53/final/patches/p1`, pinned in `v43-review-fixes`): five built-ins' own step 4 said "visit everyone who
  attended" or "keep the registration list and invite those families" (health-to-why, proph-news, four-nights, vbs,
  backpack-giveaway) while their After slide, handout and Proposal say "a visit only if they ask" / "an invitation, if they asked"
  (SPEC §2, D4): the same deck said both. Now "Visit those who ask, within two weeks…" / "Invite only the families who ask…"
  (EN + ES, each no longer than before), as the health fair's step 4.
- *Pinned by* the new `v43-cadence-data`, `v43-cadence`, `v43-timing-cadence`, `v43-ongoing-golden`, `v43-followup` (C1),
  `connect-function` (CONNECT's checks and the DESIGN §9 security list S1–S23), `connect-tailor`, `connect-pastor`, `connect-look`,
  `connect-pdf`, `connect-client` (C2), `v43-path` (C3) and `v43-average-church`, `v43-proposal-pages`, `v43-fixed-dates`,
  `v43-connect-keep`, `v43-slide-words` (integrator), each failing on v10.42.1 (the last four also on the merged build before
  their fix), and the updated suites each builder lists, each changed assertion with a comment quoting him; after the review
  `v43-privacy-docs`, `v43-cadence-words`, `v43-review-fixes` (each failing on the build before the fixes) and the updated
  `connect-function`, `connect-pastor`, `connect-tailor`, `connect-pdf`, `connect-look`, `v43-average-church`, `v43-followup`,
  `v43-proposal-pages`, `v42-fixes`, each changed assertion with a comment. **Full suite: 107 suites · 8,656 passed · 0 failed** (after the final review's fix (9); 8,653 before it).
- *Gates (Chrome, headless), re-run on the final build after the scratchpad was lost* (`~/Downloads/Terrain-work/v53/gates/`):
  every slide at 360 × 640, EN + ES, on the average church: the 36 event and series built-ins × all 34 groups × both timings and
  the Planner series (2,516 decks, 26,846 slides a language), the average church's plan with its answers (204 decks), every library
  event and series × board / Community Services / the whole church (3,339 decks, 32,468 slides a language) and the 67 ongoing
  built-ins × five groups (335 decks): **0 over the frame; every After slide (4,868 a language) at 0.9 or better**. At the
  smallest type (0.75), 0 over: six English library motion slides (two of them so on v10.42.1) and 23 Spanish "Quiénes pueden"
  slides whose whole sentence now shows (fix 4 above). The relevance rule: 20,398 decks (every built-in × 34 groups × both timings
  EN, every 3rd ES; every library idea × 3 groups EN, every 5th ES; 3,298 of them events or series): 0 figures a purpose does not
  allow, 0 design facts, 0 views or partners out of purpose, 0 "Here in" out of purpose, 0 figures on a quiet purpose, 0 figures
  on an After slide. The live phones scenario with the real present.mjs and a streaming Firebase stand-in (presenter 1280, two
  phones 390 EN + ES, the health fair to the board): 15 of 15. The connect.mjs security list S1–S23: `connect-function` (210).
  The first integration run reported about 730 Spanish slides of v10.42.1 past the frame (team "I'm in" 2 px, "Here in" 7–24 px,
  whole-church closes 11 px, conference motions 17–21 px), measured with its own harness, now lost; this re-run (seed-after, an
  ongoing sample) found none: re-measure the ongoing decks over all 34 groups before trusting either (open work).
  *After the review's fixes* (`~/Downloads/Terrain-work/v53/fix/gates/`): the same slide sets again, EN + ES: EN 6,394 decks, 64,777 slides, 0 over the frame, 5 at fit 0.75, 0 errors, every After slide at 1 or better; ES 6,394 decks, 64,777 slides, 0 over the frame, 24 at fit 0.75, 0 errors, every After slide at 0.9 or better; the
  neighbour's phone with a 45-character church name ("Fairview Village Seventh-day Adventist Church") in every look and the abuse
  card, 360 / 375 / 390 wide, light and dark (60 pages): 0 where the church line or heading touches the motif, 0 "SEVENTH-/DAY" breaks, 0 sideways scrolls, 0 requests to another site (before the fixes: 14, 20, 0, 60); the documents (every event/series built-in × 34 groups ×
  both timings, 2,040 a language): the privacy promise (and, for children's events, the children's line) in 2040 of 2040 English Proposals and 2040 handouts, 2040 of 2040 Spanish Proposals and 2040 handouts (before: Proposals 240 / 300, handouts 1079 / 1063); team Proposals on one page 1800 of 1800 English, 1740 of 1800 Spanish (before 1800, 1740); 0 documents with more pages than before; 0 handouts over two pages; 0 lines out of their box.
- *Not checked on real phones* (printed QR from paper on an iPhone and an Android phone; `sms:` with a body; the abuse exit on
  iOS Safari; `tel:` / `mailto:`; the form outdoors on a weak signal; a home black-and-white print). The card's two faces are in
  `fonts/` (1 Oct 2026, with his OK): every printed card embeds both (jsPDF subsets them: about 70 KB a PDF), and the phone page
  draws its heading, event line and buttons in them, same-origin (793,680 bytes more on a phone's first load, uncompressed; `font-display: swap`).

**v10.44.0, part 2 — Learn from other conferences (builder B2, 2 Oct 2026; built on v10.43.0).** The pastor approved the sample (`~/Downloads/Terrain-work/v52/conference-compare-sample.html`; design
`Terrain-design-notes/v50/DESIGN-COMPARE.md`, `Terrain-work/v52/DESIGN-YEAR-AHEAD.md`) and its defaults: a hub tile of its own
(also reached from the conference's step 2 in Make the Case, "Ideas from other conferences →"); official joining figures per
1,000 members with the caution always beside them, never ranked; registered pastors only (the same gate as every tool, never a
public page); Terrain never tells a conference its calendar is thin. His 2 Oct answer: the data is checked again **monthly** and
sent to him as a pull request, so the page says "Checked 1 Oct 2026 · updated monthly" (ES "Revisado el 1 oct 2026 · se actualiza
cada mes") and never claims live reading; after 45 days it adds "Some calendars may have changed since {date}."
- *The tile:* the fifth `.tool` (`data-tool="compare"`, blue `#8CC4FF`, `ink-compare` / `glow-compare`); since v10.51.1 a tile like
  the others, three across from 760 px (it was a full row of its own, `.tool-wide`). `TOOLS.compare` (standalone,
  panel `cmp`), `FEATURES.compare` (full). `openTool` closes it for any other tool; `showHub` closes it; it loads no church.
- *The page* (block "LEARN FROM OTHER CONFERENCES" before `boot`; `#cmp` has `data-notr`, which `translateDOM` now skips: the tool
  writes its own Spanish and titles stay as published): `CMP_UI` / `cU` (every word EN + ES), `CMP` (state), `cmpLoadIndex` →
  `cmpState` (his registration's conference, else "Choose your conference"; his choices kept per device in `terrain-compare`
  under his registration) → `cmpRender`: 1 Choose (chips, areas, Suggested set) · 2 At a glance · 3 The year ahead (`cmpAhead`:
  one conference at a time, Prepare now `cmpPrepList` against the device's day, five lanes, "not published yet" / "no calendar",
  last year, Start now / Start by `cmpHintText`, regular meetings, planned without a date) · 4 energy · 5 ministry by ministry ·
  6 by part of the country · 7 evangelism and pastoral care · 8 young people · 9 size and growth (the caution) · 10 what we could
  learn (`cmpLearnCards`) · 11 strengths and room to grow · 12 said vs shown · 13 month by month (Today) · How to read this
  (caveats, the table, sources). Charts are the sample's own SVG helpers (`cmpStacked`, `cmpGrouped`, `cmpSingle`, `cmpHeat`,
  `cmpArea`, `cmpMonths`), drawn at the frame's width; tooltips text-only. Every title and link escaped (`esc`), links only when
  https (`cmpLink`, `rel=noopener`). index.json loads when the tool opens; ahead.json and the chosen conferences' files after.
- *The data* (`tools/conferences/README.md`): the v52 builders moved into the repo with their logic unchanged (on the same inputs
  they make exactly the sample's profiles.json, year-ahead.json and MATCH-REVIEW.txt); the dates come from `src/config.json`
  (`checked`; the past 12 months and the year ahead move with it), the published-to months and reasons (EN + ES) from
  `src/through.json`. `node tools/conferences/build.mjs` writes `conferences/` (742 KB raw; index 92 KB, about 14 KB gzipped; a
  conference about 3 KB gzipped) or nothing if a step fails (an http link stops it).
- *Pinned by* `tests/conferences-data.test.mjs` (the netlify copy, the build reproduces conferences/ byte for byte, every fetched
  file exists, https only, the past-12-months rule and a moved check date) and `tests/conferences-view.test.js` (the tile, the
  gate, loading, defaults and kept choices, every frame EN + ES, escaping, the year ahead, the stale line, the door from Make the
  Case), both failing on v10.43.0; the hub suites (`hub-glow`, `hub-icons`, `hub-layout`, `hub-alignment`, `hub-copy-and-quote`,
  `header-nav-collision`, `entitlement-tiers`, `registration`) now count five tiles and `connect-client` eleven `memberLink()` guard
  sites (`cmpOpen`), each change commented. Notes: `~/Downloads/Terrain-work/v56/B2/NOTES.md`.

**Fix on v10.43.0 (2 Oct 2026, not stamped: the six version stamps still say v10.43.0) — "there's a detach somewhere".** The pastor,
on the live v10.43.0, his church in Worcester PA: *"Do you notice that in the PDF it says six week trial but I chose a one day event so
there's a detach somewhere."* In Make the Case → Church board → step 2 he set the filter to "One-day events"; the one card left under
"From your plan" was his chosen draft idea "Saturday afternoon board games" (ongoing; "After Sabbath lunch, one member opens a
classroom…"), and its PDF said "Approve a trial of 6 weeks", timing options Tuesday, Wednesday, Thursday evening. Record:
`~/Downloads/Terrain-work/v57/NOTES.md`; pinned by `tests/v43-detach.test.js` (54 checks; 43 fail on v10.43.0).
- *The filter* (`casePlanHTML`, `caseNowHTML`, `CASE_NOW`): step 2 kept the chosen idea in the filtered grid ("the idea already chosen
  is never hidden"). Now a chosen idea that runs another way is never in it: one line above the grid, "Your choice now: Saturday
  afternoon board games · **Ongoing** (a 6-week trial) · Show it" ("Su elección ahora: … · Continuo (una prueba de 6 semanas) ·
  Mostrarla"), its card under the line on "Show it"; picking a one-day event replaces it as usual (a ministry team and the whole
  church choose the length together with "Suggest options", so there the line names no length: verifier, 2 Oct 2026). The chosen card's kind chip is
  first and coloured (Make the Case's colour, never the filter's mint) wherever it shows (`caseCadTag(x,o,now)`, `.lib-cad.now`).
  The survey's own filter never had an exception (checked). `v43-cadence`'s T-C5 updated to his new intent, with a comment.
- *The idea's own day and time* (`caseNamedTime`, `caseNtFind`, `CASE_NT_*`, `CASE_NT`): an idea not marked "Fits the Sabbath" lost
  every Sabbath hour silently, so its own name and its timing disagreed. Now the day and time an idea names (its name, then its
  description; EN, else ES: "Saturday afternoon", "after Sabbath lunch", "Tuesday evenings", "sábado por la tarde", "después del
  almuerzo del sábado"…; a description's mention only when it reads as the idea's schedule, measured on all 3,050 library ideas: 264
  name one, no built-in does) is offered first when it may be (`caseTimingOptions` `named`, the fixed time in `caseBuild`, a dated
  idea's Day). When it names Sabbath hours and is not marked as fitting, step 3 (`caseNamedHTML`) and the documents say so: "This idea
  names Saturday afternoon, but it is not marked “Fits the Sabbath”, so these times are on other days." (the handout's Timing options,
  the Proposal's WHEN, the decide slide's row "The idea says"; with a fixed day "…so it is set on another day."), and one button,
  "Choose Saturday afternoon anyway", records his decision as the idea's own time (`uChurch().overrides[id].slot`, Adjust → Time slot;
  "Undo" takes back only the slot), after which every document offers it first. Also said when the church profile has no room or
  team free at the named time. Said where the options are shown: the board, finance, business meeting and a team (decide slide,
  handout, Proposal), and the whole church's Proposal, which lists the times too (verifier, 2 Oct 2026; its slides only announce the
  day, so no row, and its handout has no timing section).
  A team's one-page Proposal with the sentence has two more levels (level 5: level 4 without it; `Pz.namedNote`): 0 documents with
  more pages than v10.43.0 over every library idea that names a time; a team's six-row decide slide swaps only its own verse for a
  short decide verse no other slide uses (0 slides over the frame, 1,584 decks). `model.timing.named` {slot, state first|own|his|sab|profile, note, row}. His own time is never dropped
  for the Sabbath in "Suggest options" any more (it was in "I already know the dates" already). The golden: two library ideas whose
  description names their time re-hashed with a note (hospitality-monthly-zoom-hangout, music-arts-park-bluegrass-jam; the jam's
  whole-church key again after the verifier's fix); every
  built-in output and every library idea that names no time unchanged (compared with v10.43.0, NOTES.md).

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

**v10.42.0 (29 Sep 2026) — the presenter controls the phones, and the proposal on phones.** The pastor, after presenting
v10.41.1 live (voice-to-text): *"It's pretty good, but I'm able to change the slides on my phone and I don't want that. I
want only the presenter to have the ability to control the slides. We could do both: the presenter can choose — do I want
them to be able to do the slides whenever they want, or do they have to follow my slides. And at the end, on the phone or
whatever device, they should be able to download the proposal right there."* Record: the build session's scratchpad
`v43/BUILD.md`. Pinned by the new `tests/v42-phones.test.js` (86), `tests/v42-handout.test.js` (282) and
`tests/present-phones.test.mjs` (49), and the updated `present-client`, `present-function`, `present-review39`,
`firebase-rules` and `v41-1`, each with a comment.
- *His choice, in the setup* (Present live and Share link & QR share one setup, `prSetup`): **On phones** · "Phones follow my
  slides" (the default) / "Members can swipe through the slides", and "Offer the PDF on phones" (on); Spanish "Los teléfonos
  siguen mis diapositivas" / "Los miembros pueden pasar las diapositivas" / "Ofrecer el PDF en los teléfonos" (`PR_UI`
  `ph*`, `prPhonesHTML`). Kept per church as his last choice (`uChurch().casePhones`, `prPhonesGet` / `prPhonesSave`; the
  sample and a control device never write it). A link already open shows its own way; one opened before v10.42 shows his
  choice and is brought to it on Start (`prPhonesSync` → op mode).
- *Changeable without restarting:* a **Phones** button in the presenter view's strip (a phone icon; the word hides under
  480 px) opens a sheet with the same choice; each change goes at once (op mode, with the key), becomes his last choice, and
  says "Saved. Phones change within a few seconds." (`prPhonesInto`, `prPhonesMark`); the same choice sits on the link
  panel. After the end the sheet keeps the PDF switch alone, and closing it brings the end card back.
- *Follow mode on a phone* (`tdeckRender` `lock` / `ctl.setLock` / `ctl.locked`, `watchLocked`, `watchPhonesApply`): the
  phone shows exactly the presenter's slide; a touch swipe, a drag, the wheel, keys, `ctl.go` and the dots do nothing (the
  row is `overflow-x:hidden` while locked, and the renderer refuses every own move); no pill, no "Back to live". The
  footer says quietly where the church's name was: "Following the presenter" / "Siguiendo al presentador" ("Waiting for the
  presenter" before he starts). Late joiners land on his slide; a failed stream falls back to op state and stays in step; a
  stream silent for 75 s is left for op state (`watchWatchdog`, follow only); 20 s of failed asks unlocks the phone with
  "No connection. Swipe to move through the slides." until it is in touch again. An "I'm in" answer being written holds its
  slide (`holdHere`) until it is sent, then the phone goes to his slide; while held the phone shows "You: 8 · Presenter: 9 |
  Back to live" in place of the footer line, and a hold with nothing touched for a minute lets go by itself (fix after
  verification, below). End lifts the lock: members may look back.
- *Swipe mode* is the behaviour before v10.42, unchanged (swipe away, the pill, "Back to live"). A room with no mode (older)
  is swipe with the PDF on. Without live follow set up, phones swipe whatever the choice (nothing to follow).
- *The proposal on phones* ("Download the proposal (PDF)" / "Descargar la propuesta (PDF)", `CASE_COPY.viewer.downloadPdf`,
  was "the handout"): at the presenter's last slide (it stays once seen) and after End, in both ways, unless he switched it
  off (after End too; a phone hears that on its once-a-minute check). Made ahead as a link to tap (`watchPdfPrep` →
  `casePdfMake` → a blob link with `download`: iPhone Safari, Android Chrome and a desktop all save from a tapped link); if a
  browser cannot make one, the button makes it on the tap (`casePdf`), as before. Always in the deck's own language
  (`casePdfDoc` now draws with `LANG` set to the handout's: a Spanish phone following an English presentation read
  "Preparado el…" and "margen de error" in an English proposal).
- *A member's copy is the whole proposal* (`caseHandout` from the deck alone): it now also has who it is for ("For the
  whole church", `caseGroupFor`) and the ministry, the roles with their hours, the closing words ("To close"), every place
  slide with its figures (the church family, a conference proposal's churches, "Here in {town}"), every risks slide (a
  conference proposal's aims), the capacity, ability, risks and timeline slides' own headlines, the ask's sentence and the
  older "why here" trio. Checked on six decks × EN/ES: every slide's kicker, headline and words and every verse are in it,
  two pages, every line in its box, SAMPLE / MUESTRA on every page of the sample, never a member's name, no key, no answer.
  The pastor's own handout (from the case model) gains none of these parts.
- *Fixed after verification (same version):* (1) **a phone stuck on "I'm in"**: in follow mode a member who tapped an answer
  ("Pray") and went no further stayed on that slide for the rest of the talk, still labelled "Following the presenter", with
  no way back but sending a name or answering "No" to the age question. Now an answer holds the phone only while the member
  is at it (touched within `TD_HOLD_IDLE_MS` = 60 s: a tap, a key, a letter, a field focused, heard by the yes slide's `act`
  and the renderer's `holdOn`); a held phone shows the pill "You: 8 · Presenter: 9 | Back to live" (Spanish "Usted: 8 ·
  Presentador: 9 | Seguir en vivo") and no "Following the presenter"; "Back to live" or a minute untouched takes it to his
  slide (`unhold`, which puts a field's keyboard down only when leaving the slide), and an answer left untouched since then
  never holds it again. The lock itself is unchanged (swipes, keys, wheel and drags still do nothing while held). Swipe mode
  is unchanged. (2) **the phone's PDF left out lines the slides show**: the "who is able" slide's coordinator line
  ("Coordinator: one member is ready. Names stay with the pastor."), a figure slide's count and frequency lines beside its
  headline in the table of figures (the sample's "27 in every 100 are children"), a unit said in words ("34.8" / "years"
  under the number; "5,480 neighbours" in the table), and the capacity slide's "Every need is covered". The "who is able"
  line no longer reads "6 the church profile lists 6 members…" (a label that says its number is not led by it).
  `tests/v42-handout.test.js` now renders each deck's slides and checks that every text a member's slide shows is in the
  PDF (the slide's short "±4.1 pts" is "±4.1" and "margin of error ±4.1 points" there), with and without Spiritual Gifts
  results (39 fails on the page before the fix); `tests/v42-phones.test.js` covers the held phone, "Back to live" and the
  minute (7 fails before). Checked in Chrome too: the verifier's case (Pray tapped, left; presenter to 9, 3, 9), a Spanish
  member writing a name, the minute, a keyboard up at "Back to live", and every slide's text in the PDF of six decks × EN/ES.
- *Server, present-1.3:* the room keeps `mode` ('follow' | 'free') and `pdf` (boolean), set by op open (absent: free, PDF
  on, what an older page gets) and changed by the new **op mode** `{room, key, mode?, pdf?}` (key-checked, POST only, 60 an
  hour per room, not in a room's last minute, allowed after the end); op deck and op state return them (op state the
  room's own, beside the pointer's copy); the pointer carries `{mode, pdf}` so stream phones switch at once. Phones can
  never set them (no op a phone sends reads them). Every limit, every older deck and room unchanged.
  `FIREBASE-SETUP.md` says present-1.3; `FIREBASE-RULES-TERRAIN.txt`'s plain words mention the two new pointer fields (the
  rules themselves are unchanged: no client writes).
- *Checked in headless Chrome* (the harness with the real present.mjs and a Firebase stream stand-in; presenter 1280×800,
  two phones 390×844 as separate devices, EN and ES): follow by default; a late joiner on slide 4; eleven real attempts to
  move the English phone (touch gestures both ways, a finger drag, → PageDown Space End Home, the wheel sideways and down, a
  mouse drag) left it on slide 4, the Spanish phone likewise; switching to swipe mid-presentation (a swipe then showed "You:
  4 · Presenter: 5 · Back to live") and back (both phones snapped to his slide); the last slide showed the proposal link on
  both; both downloads captured and opened with pdf.js (2 pages, English throughout, the church, "for the whole church", the
  verses, no name, no key); End lifted the lock (a swipe and ← moved back); a second presentation in swipe mode from the
  start; the presenter at 390×844 in Spanish (setup, strip, sheet: no sideways overflow, nothing clipped). **Not checked on
  a real iPhone or Android phone** (the lock uses `overflow-x:hidden` and `touch-action:pinch-zoom`; the download is a
  tapped blob link), **nor in the light theme.**

**v10.42.0 (timing part, 29 Sep 2026; merged with the presenter part above into the one v10.42.0) — Make the Case: firm on the what, flexible on the when.** The pastor, of the slides'
"Runs 6 Oct – 18 Nov" and "Review 18 Nov · board meeting": *"it's mandating the dates, which we still have to figure out… a proposal
should give them options; we'll have some discussion about when… they'll come back with 'I don't know if Tuesday evening is good, we
have this going on'… I don't know how long we want to run it, but there has to be a level of authority and a solid plan… instead of
dictating dates which might be conflicting with other things the church does."* No church calendar in Terrain (*"I don't want it to get
too complicated"*). Built beside the presenter part (another builder) and merged; record: the build session's scratchpad `v43/T/NOTES.md`.
Pinned by the new `tests/timing-options.test.js` (94 checks; fails on v10.41.1) and the updated `case-screens`, `case-fixes`,
`idea-library`, `v40-integration` (the board's deck is ten slides by default), each with a comment.
- *The setting* (`CASE_TIMING_DEFAULT`, `caseTimingOf` / `caseTimingSet` / `caseTimingKey`, `caseTimingHTML` / `caseTimingWire`): at the
  top of step 3's edit panel, "Dates: **Suggest options** | I already know the dates" ("Fechas: Sugerir opciones | Ya sé las fechas"),
  saved per church, ministry and group (`uChurch().caseTiming`, only "fixed" stored; not per language). The screens build with it
  (`caseDraw3`, `caseConfRebuild`; the sample slideshow shows the default). `caseModel(…,{timing})`: 'options', or 'fixed'/none =
  today's decks exactly (25,306 decks, their models and handouts compared with v10.41.1 byte for byte).
- *With options* (`caseBuild`: `OPT` / `FLEX` / `PROP`, `timingM` → `model.timing`): no slide names a day of the month. The motion's rows
  (`timingM.motionRows`): When "3 options · to agree together", Starts "{month}, after a calendar check" (`caseMonth`, the year when not
  this year), Length "A {weeks}-week trial or a 4-week pilot" (the pilot only when longer than four weeks; not on the Sabbath deck),
  places, ceiling and funds as before, Review "First board meeting after the trial" (team: team meeting; business meeting: business
  meeting). A board's motion holds five rows (present.mjs): ceiling and funds share one, then When and Starts (also beside a headline
  over 80 characters), with a short verse (`CASE_VERSE_ROOM.motionOpt` / `motionOptLong`, job `motionOpt`: `CASE_VERSE_MOTION_OPT`
  Proverbs 16:3, 1 Corinthians 14:40). The first steps count weeks ("Week 1 · start", "After week 6 · review"); the ask slide's room
  says "day to be agreed"; "Here in {town}" names the room without a day (`CASE_TIMING.bringRoom`); the Sabbath deck's When is
  "Starting soon; we'll announce the day" and its close "We will report back after the trial"; "Prepared by … · September 2026".
  Every template with {start}, {mid} or {review} has date-free words (`CASE_TIMING_ALT`, `caseTimingAlt`: risks, the treasurer's ask,
  the questions, the wins and closes); one that has none is left out (its dates are empty), never shown with a date.
- *"Let's decide together"* (`caseTimingOptions`, `caseDeck` `decideSlide`): an **ask** slide (rows; `part:'decide'`, which
  `caseSlotKeys` keys as "decide:0" so the pastor's words stay on their slide; present.mjs drops the field like any unknown one) before
  the ask on board, business-meeting and officers' decks and before "Will you try it?" on every team's; never the Sabbath deck or the
  conference. Up to three times from the church profile (`cap.slots` in its order, a room of each needed kind free then and big enough,
  the skilled people as `caseCheckWith`): his own time first, then those with no clash, a different weekday each; never Friday evening
  or Saturday afternoon for an idea that does not fit the Sabbath, in either timing mode (`caseSabFits`: library `sabbath`,
  `CASE_SAB_BUILTINS`, 62 built-ins by SABBATH-GUIDELINE.md; `CASE_SAB_SLOTS`), Saturday evening said "after sunset"; with no other
  time, "to be confirmed". A clash only when Terrain knows it: a ministry of the plan
  (`uSelected`) set to that time (Adjust → Time slot), or an evening of his Evangelism Planner series in the weeks this could run (the
  start to a full season after). Rows: "Option 1…3" (the room when the options differ; a long name gives way to "another ministry",
  then the room, within `CASE_TIMING_ROW_MAX` / `ROWS_MAX`), Length "4-week pilot · 6-week trial · a full season", "Check first:
  communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks"; Proverbs 15:22 at its foot (`CASE_VERSE_DECIDE`; Acts
  15:28 when two or more times clash, `CASE_VERSE_ROOM.decide` / `decideClash`; `caseVersePlan`'s `opt.more`).
- *The ask* (`motion.ask`): the board "Tonight we approve the plan, {coordinator} and a ceiling of {ceiling}. The team sets the day and
  start date with the church calendar within two weeks and reports them to the board." (the coordinator he typed under Adjust, else
  "a named coordinator"); the business meeting "Today the church votes on the plan…"; the officers their own ask and that sentence; a
  team its own and "We'll choose the day together tonight."
- *The handout* (`caseHandout` `H.timing`, `casePdfDocAt`): "Timing options" in the first steps' place on the front (both pages were
  full): a box per time with its room and any clash in full ("no known clash"), "Length: …", the calendar sentence, "Agreed day and
  start: ______", then the review ("Review at the first board meeting after the trial: continue, change or stop."). Every options
  handout stays two pages (1,030: every built-in's board, business-meeting, two teams' and Sabbath handouts, EN and ES; about a level tighter than before). A phone's handout (the deck
  alone) takes the ask from the last ask slide and the timing from the one before it (a team's only ask slide is the decide slide).
- *The conference* (`caseConfBuild` `a.timing`): his Planner's dates stay, each labelled proposed ("An evangelism series in {town}:
  proposed opening night {date}", "Proposed {date}, open to adjustment · {nights} nights", "Proposed opening night…: {months} to
  prepare", steps "Now" / "Proposed {date}"); an idea's trial for the conference: Starts and Length, no date. His series on a board's
  deck: "11 Sep – 16 Oct (proposed)".
- *Checked in headless Chrome*, 360 × 640, EN and ES: every slide of 25,306 decks with options (235,764 slides: all 103 built-ins × all
  34 groups, the Planner's series, all 3,050 library ideas × board / Community Services / congregation), with an empty plan, one
  ministry at a time of its own, and three ministries on the weekday evenings with his series on the others: **0 overflow** of any
  motion or decide slide (decide fit 0.8 or better; 208 motion slides draw at 0.75, most Spanish with long library names). The
  only slides naming a day of the month are the conference's proposed dates and eight library ideas named for an observance ("…on
  August 31", "el 4 de julio"). Screens at 390 × 844. **Not checked on a real iPhone, nor in the light theme.** Older and not changed:
  a church with ministries already in its plan draws some Spanish capacity slides 15–34 px past the frame (the gap lines; the
  same in both modes; the v10.41.1 sweep had an empty plan).

**v10.42.0 (the two parts merged, 29 Sep 2026).** The presenter part (this folder) and the timing part were merged file by file
(`git merge-file --diff3` against v10.41.1; record: the build session's scratchpad `v44/MERGE0.md`). Two conflicts, both in the
member's copy of the proposal (`caseHandout`'s deck path and `casePdfDocAt`'s first-steps block); both intents kept. With "Suggest
options" a board's or team's deck has "Let's decide together" *and* its dates slide, and the member's copy (a phone's PDF, the deck
alone) must still hold every slide's words (the presenter part's rule), so:
- the options take the steps' place on the front (the timing part's rule) under the decide slide's own headline (`H.timing.head`);
  the dates slide's headline and steps go on the back, before the risks (only a member's copy has `stepsHead`);
- a member's copy has no "Agreed day and start: ____" line (`H.timing.agreed` empty; `casePdfDocAt` draws the line only when set):
  with it, and the QR code a live deck's join slide gives, copies with Spiritual Gifts results reached the tightest level, where
  the verses lose their words (measured); the pastor's own handout keeps the line;
- when the front is drawn tighter (level 2 and up) and leaves out the ask slide's headline, it is said on the back above the ask's
  rows (`H.askHead`, deck path only; this also closes the same gap for Spanish board decks without options).
The pastor's own handout (the model path) is unchanged by the merge. Pinned by `tests/v42-handout.test.js` (+328: six decks with
options × EN/ES × both fixtures, as present.mjs stores them, with the QR code; fails 82 times on the plain conflict resolution).
Checked in headless Chrome with the real present.mjs: the food pantry to the board with options, two phones (EN, ES) locked on
every slide incl. "Let's decide together" (fit 1, no overflow), both downloaded the two-page proposal (options, calendar check,
the steps, the ask), End frees them, "I already know the dates" drops the decide slide; no page errors. Also added:
`tests/v42-average-church.test.js` + `tests/average-church/` (the made-up average church for part 3; its 170 v10.42 checks print
PENDING until part 3 sets `REQUIRE_V42=1` for it in `run-all.js`). Full suite after the merge: **76 suites · 6,754 passed · 0
failed** (presenter part 74 · 6,008; timing part +1 suite · 94; average church +1 · 324; the member's copy with options +328).

**v10.42.0 (part 3, builder B2, 29 Sep 2026) — phones locked while he presents, his handout on their phones, "Record what we decided", Gifts first.**
The pastor (SPEC-FOCUS A): *"Maybe just have it where it's locked until the presentation is complete; then they can scroll whichever
slide they want and download it as well — a really nice PDF. Will they be able to decide dates and times and have it in the download
as well?"* (E): *"Before, the Spiritual Gifts initiative has to be done for the whole church membership; every member needs to do
it… Easy to understand, easy to work through."* His answers (29 Sep 2026): Q2 phones offer "Download the handout (PDF)" and, for the
finance committee, the church board and the business meeting, also "Download the proposal to vote on (PDF)"; Q5 phones unlock after
30 minutes with no word from the presenter. Design: the build session's scratchpad `v43/design/DESIGN.md` (+ `PROPOSAL.md`,
`GIFTS.md`); builder notes `v44/B2/NOTES.md`. Section A's records (`caseDecisions`, `caseApproval`, `gfReadiness`: B1's core) are
used here, never redefined.
- *No swipe choice any more* (`prPhonesHTML` / `prPhonesGet` / `prPhonesSave` / `prSetup` / `prPhonesInto` / `prPhonesMark`):
  **Present live** always follows (`mode:'follow'`), **Share link & QR** always browses (`free`); a link first shared and then
  presented (its panel's Present live, or his control link) is brought to follow before the first slide change (`prPresent`). The
  setup and the Phones sheet keep only "Offer the PDF on phones" under one line ("Phones follow your slides until you end." /
  "Members look through the slides at their own pace." / after the end "Phones may look through the slides."). Only the PDF switch
  is kept per church (`uChurch().casePhones = {pdf}`; an old `{mode:'free'}` is not read).
- *Exit while phones follow* asks (`prExitAsk`): "Phones are still following your slides." — **End the presentation** (op end, then
  close) · **Leave it running** (as Exit always did; Escape). Not for the sample or a control device.
- *Heartbeat* (`prBeat`, `PR_BEAT_MS` 5 min): with no slide change for five minutes the same slide goes again, straight to op go.
  *Release* on phones (`watchStale`, `WA_STALE_MS` 30 min, `WA.atSeen`: when the pointer's `at` was set, on the phone's clock, from
  the server's `now` (fix after review: before, the phone's own clock when it first saw `at`, so a late phone was locked a fresh 30
  minutes); the 5-second watchdog applies it): unlocked with "The presenter has paused. You may look through the slides." and locked
  again at his next move.
- *His handout on phones* (`prPdfSync` → `prPdfSend` → `prPdfPut`): made as "Download PDF handout" makes it (`caseHandout` of his
  model, counts only), sent in the background with op putpdf when he presents or shares and again when it changes (a copy with the
  same words, `prHash`, is not sent again); for the three bodies that vote also the proposal to vote on (`caseProposal` /
  `caseProposalDoc`, section B's; kind `vote`). Tried again after 5 s and 30 s; a room gone or an older function stops. Never from a
  control device, never for the gifts deck. The Link sheet and link panel say "Handout on phones: ready (N KB)." (`prPdfLine`).
  Phones (`watchPdfPrep`, `watchVotePrep`, `watchPdfGet`): the server's bytes when `WA.pv > 0` (GET op=pdf), else the copy made from
  the slides (the fallback); "Download the handout (PDF)" · "Updated" when a newer one arrives after the member saw it; "Download
  the proposal to vote on (PDF)" beside it when `WA.qv > 0`.
- *Record what we decided* (`CASE_DEC_UI`, `caseDecFormHTML` / `caseDecFormWire`): who decided (the path's bodies, the deck's, any
  recorded; the conference for a conference deck), the date (today, never ahead), the outcome chips of that body (section A's
  `caseDecOutcomes`), the vote (optional), and for a yes the day and start agreed (Not settled yet · the timing builder's options ·
  Something else: day, time, start, length). No note field (the design, X8). "Amended" shows "If the amount changed, change it with
  “Adjust scope and budget”." In the presenter view: the strip's **Decision** button and the end card's first row (never the
  sample, a control device or the gifts deck); saving there rebuilds his slides for the room (op update, then op putpdf), on the slide
  he is on, and every other open link of the ministry (`caseDecPush`: this ministry's rooms only, never the sample's, at most six,
  each in its own audience and language). In step 3 (`caseDecCardMount` into section C's `#cs-dec`): "How it is being decided", the
  path ("In {church}: Ministry team › Finance committee › Church board" · Change), a row per body (check, dot or ring; the deck's
  own row bold, "these slides"), one hint with at most one button ("In {church}, the finance committee sees it first." · Make it for
  …; or "{status}. Next: the church board."), Record what we decided; a recorded row opens its record (Remove, two taps). The path
  editor (`casePathEdit`): the four bodies, always in order, at least one; "The Proposal to vote on opens with" Motion first /
  Explanation first.
- *Gifts first* (`GF_FIRST_UI`, `GF_MINUTES` 15, `gfFirstCardHTML` / `gfFirstWire` / `gfFirstHub` / `gfFirstRefresh`): one card,
  one number ("18 of 46 adults have discovered their gifts", the denominator said on the line under it), one button (**Invite the
  whole church**, `gfInviteChurch`: the setup's share panel, the church's one campaign made only when there is none). On the hub
  below the four tools (`#hubgifts`, once the church is his), on the Spiritual Gifts landing and first in the church profile. A
  quiet sync brings results in when a card is drawn (at most every ten minutes; `gfSync` is now one at a time, `GF_SYNC_P`). Make
  the Case: one line above the step bar below half of the adults (`caseGiftsBanner`, `#cs-gff`; × hides it for two weeks,
  `uChurch().giftsFirst.hideUntil`). Step 3: "Your church, ready to serve" (`gfReadyPanelMount` into section C's folded
  `#cs-ready`). The share panel: "Ready-made announcements" for the bulletin, a text message, WhatsApp and the pulpit, EN + ES
  (`gfAnnounce`; the kind kept per church in `giftsFirst.kind`; `gfInviteMsg` is the WhatsApp one); "about 15 minutes" everywhere.
- *"Discover your gifts"* (`gfdDeck`, `gfdVerse`, `gfRenderSabbath` (`GF_VIEW='sabbath'`), `gfdEnsure`, `gfOpenSabbath`): nine slides
  for the whole church, every verse from the verified tables by id or reference (1 Corinthians 12:27, 1 Peter 4:10, 1 Corinthians
  12:18, Romans 12:6, 1 Peter 5:2, Proverbs 11:13; the close Ellen White's "The church of Christ is organized for service"); slide 8
  "Take it now" (`join` + `gifts:true`) shows the assessment's own QR on the big screen and a **Begin · about 15 minutes** link on
  phones (a new tab; the slides stay locked); phones offer Begin at the end instead of a PDF. No handout, no decision.
- *Server:* **present-1.4** (op putpdf, GET ?op=pdf, `pv`/`pname`/`qv`/`qname` in op deck and op state and `pv`/`qv` in the pointer,
  256 KB a PDF, 400 KB a putpdf body, 60 uploads a room an hour, 600 downloads an address and room an hour (fix after review: was
  120 an address), the server's `now` in op deck and op state and the pointer's `age` in op state, the gifts active-content rule,
  `p/<room>` and `q/<room>` deleted with the room; the `how` slide, `goal` on motion / yes / close, a verse slide's kicker and headline,
  the gifts deck's `gifts {pub}` and its "Take it now" join; every present-1.3 deck stored exactly as before). **present-sweep-1.1**
  deletes the PDFs. **gifts-1.3**: 200 results an hour from one address (one church on one Wi-Fi taking it together).
- Pinned by the new `tests/present-pdf.test.mjs`, `v42-lock.test.js`, `v42-decide-ui.test.js`, `gifts-first-ui.test.js` (each fails
  on the start folder), and the updated `present-function`, `present-phones`, `firebase-rules`, `gifts-function`, `present-client`,
  `present-review39`, `v42-phones`, `gifts-shortlink`, `gifts-engine`, `gifts-journeys`, `hub-alignment`, `hub-copy-and-quote`,
  `case-steps`, `email-off`, each changed assertion with a comment quoting him. Full suite in B2's own copy: 80 suites · 7,059 passed (merged: below).

**v10.42.0 (part 3, builder B1, 29 Sep 2026) — the focus: a goal, one arc from the goal to the appeal, only the facts that
serve it, and a Proposal to vote on.** The pastor (SPEC-FOCUS C): *"What does that have to do with why we want to do a prayer
ministry — a prayer calendar? It's detached from what's going on. The main focus is the specific ministry, and everything should
tie into that, not random analytics… From the beginning to the end it has to have a focus, a beginning and an appeal at the end,
and everything has to line up with what was chosen and what the leader or the pastor would like to see accomplished."* (B):
*"There needs to be a clear proposal that is submitted to the board or the church business meeting. It says exactly what they
want — the motion first and then the explanation, or the explanation first and then the motion… In some churches it has to be
presented to the finance committee first, and then to the board."* His answers (29 Sep 2026): Q1 the suggested goal names the
idea — "{Idea name}, so that {outcome}" (ES "…, para que" + subjunctive); Q3 "Fill in a demo church" is the average church; Q4
keep Acuerdo tomado, Con enmiendas, Remitido, No aprobado, Secretario(a) de la iglesia, Salvaguardas. Design: the build
session's scratchpad `v43/design/DESIGN.md` (+ `NARRATIVE.md`, `relevance.json`, `PROPOSAL.md`, `GIFTS.md`); builder notes
`v44/B1/NOTES.md`.
- *The records* ("THE RECORDS" block, handed to B2 first): `caseDecisions` (one record per body: team, finance, board, business,
  conference; body, date, outcome, vote, agreed timing; no note), `caseApproval` (the path he ticks, "Motion first" /
  "Explanation first"), `caseGoals` (his own words per ministry + group, per language), `gfReadiness`; the profile's two new
  fields (members on the books, adults in worship; "adults > attendance" is refused). Clear all clears the three records.
- *The goal* (step 3's `#cs-goal`, "What would you like this to accomplish?"): suggested from the idea (`CASE_GOAL_THEME`, 58
  themes), editable, saved 600 ms after typing and before every action; a group with none takes the words saved for the same
  ministry for another group (X5). "Our goal" opens and closes every deck, the handout, the Proposal and "What to say".
- *One arc for every audience* (`caseDeck`): opening (the proposal and the goal) → why (a figure only where the purpose allows it,
  else the verse slide "Why {aim}?") → [where, only when place is part of the idea] → **How it works** (the idea's own steps; the
  built-ins' Spanish steps are `CASE_HOW_BUILTIN`, written for this build, 97 built-ins + both languages for the six small groups)
  → who and what it takes → safeguards → exactly one timing slide (Agreed › decide › dates; X3) → the ask → an appeal back to the
  goal ("Will you approve…", "Will you join us to…", "Will you partner with us…"; after the deck's own body said yes: "Approved on
  {date}", X10). The finance committee's deck is finance-first ("The cost" second). 8–11 slides, never padded.
- *The relevance rule* (`CASE_PURPOSES`, `casePurposeOf` → `model.purpose.allowed`, from `relevance.json`): a census figure, a
  "where to look" direction or a partner appears only when it bears on the idea's own purpose; prayer, worship, fellowship and
  other devotional ideas get none. Audit: 0 of 9,459 decks break it (v10.41.1: 7,292).
- *The handout* follows the slides' order (N8), with the status line under "Prepared by", the trail "How it is being decided" and
  the Gifts first box. *The Proposal to vote on (PDF)* (`caseProposal` → `caseProposalDoc`): heading (church, to, from, date,
  subject, the earlier body's status line, the path), THE MOTION in a box, WHY (our goal, the deck's own facts, capacity,
  Scripture), THE PLAN (how it works, who, where, when), BUDGET (never tithe), SAFEGUARDS, REVIEW, the motion again beside **Action
  taken** (filled once his body's decision is recorded). Finance: budget first, "Finance committee recommendation". 1–2 pages.
- *Gifts on proposals* (`caseGiftsSlide`): below half of the adults "The church-wide Spiritual Gifts initiative comes first" (with
  the coverage and the link); at half the whole church counted (fit, free time, leaders; counts only). The private ask list shows
  "Has time" / "Can lead", 30 rows at most.
- *The slide fit* (`caseFitDeck`, `CASE_FIT`, measured in Chrome): the goal-bearing slides, What it takes, How it works and Roles
  are sized for 360 × 640 in both languages together.
- Pinned by `case-focus`, `v42-core`, `v42-proposal`, `gifts-first-decks` (new) and twenty updated suites, each changed
  assertion with a comment quoting him or the design.

**v10.42.0 (section F, builder B3, 29 Sep 2026) — one flow from the survey to Make the Case.** The pastor: *"On the Community
Survey it gives you ideas — ministries your church could offer. Why is there another section in Make the Case giving us another
option for more ministries to do? Is this redundant or necessary?"* (He approved the answer: "YES".) The survey's ministries are
for the neighbourhood (first line "For our community. This is where your church chooses what to do."). An in-reach idea never
shows there (`uForCommunity`; the index loads once when the church keeps library ideas, `uMinistriesAgain`). Make the Case
step 2's line: "This is where you win support for what your church will do." It opens with **From your plan** (the plan, and the
idea already chosen, that fit the group: `casePlanItems` / `casePlanFits`; board, business meeting and finance committee take
all of it: `CASE_PLAN_ANY`; the conference's Planner series first). Then **More ideas for {group}** (the v10.41 list without
what the plan shows). An empty plan: "Choose what your church will do in the Community Survey first, or pick an idea below." +
Open the Community Survey. The board and business meeting's list opens on God's people. Builder notes `v44/B3/NOTES.md`. Pinned
by `tests/v42-plan-first.test.js` (59).

**v10.42.0 (part 3 integrated, 30 Sep 2026).** B1, then B2, then B3 merged into this folder with `git merge-file --diff3` against
the start folder (record: the build session's scratchpad `v44/INTEGRATION.md`). One conflict in `index.html` (`caseDecStatusFor`:
B1's later version kept, as both builders asked), one in `tests/present-client.test.js` (both kept: Present live follows, and the
whole church's close may give up its line of text) and one row of this file. B1's exchange patch (the records) and B2's (the
present-1.4 slide shapes) were already in both copies; `present.mjs` is B2's; the writer's `builtin-how.json` is
`CASE_HOW_BUILTIN` byte for byte. `run-all.js` now runs every suite with `REQUIRE_V42=1`. **Full suite (at integration): 85 suites · 7,486
passed · 0 failed** (after the fixes below and the final check: 86 suites · 7,596 passed · 0 failed). Merge gate: the relevance audit 0 of 9,459 decks; the 360 × 640 sweep of every built-in and every library idea
× board, finance, prayer team, the whole church, the conference × EN + ES, with an empty plan and with three ministries and his
series in the plan: 603,864 slides, 0 over the frame, none below fit 0.8 (and a 200-character goal, the average church's two
seeds, the Agreed slide: 0); the gifts deck 12 × 9 slides, 0 over; live with the real present.mjs: phones locked through eight
attempts to move, both downloads (handout and the proposal to vote on) the server's exact bytes, End frees them, the dates switch
gives one timing slide either way, a recorded decision gives the Agreed slide and "Approved on …", a team deck offers the handout
only; no page errors. Samples for the pastor: `~/Downloads/Terrain-v10.42-samples/` (before and after gifts, one set in Spanish;
the audits 520 pass, 0 fail).

**v10.42.1 (30 Sep 2026).** v10.42.0 plus the team length (a ministry team chooses the length together, as it chooses the day; section "the length" below) and the Sabbath wording (below), joined in one build; the six stamps say v10.42.1.

**v10.42.0 (Sabbath wording, 30 Sep 2026).** Five older built-ins set ordinary work or events on Saturday, the Sabbath (the fall festival, the car care clinic, "Fix-it Saturday", the men's breakfast, "Respite Saturday"). The pastor: "yes move them" — all five now say Sunday, EN + ES ("Fix-it Sunday" / "Domingo de reparaciones"), and the Saturday-night supper says "after sundown". The check is `v42-sunday.test.js` (12). It went live with v10.42.0 (page only, 30 Sep 2026), built from the reviewed samples build; the test file comes into the repo with v10.42.1.

**v10.42.0 (fixes after review, 30 Sep 2026).** Reviewers read the integrated build's samples against his rule (*"everything
has to line up with what was chosen"*) and the phones' code: 25 findings (1 blocker, 11 major, 13 minor), each verified, all
fixed (record: the build session's scratchpad `v44/FIXES.md`).
- *A library idea that is made and handed out* (a calendar, cards, flyers, a newsletter, letters: `LIB_MADE_WORDS` / `libMadeName`,
  never a name that also says an event, `LIB_MADE_EVENT`; `x.made`, set in `libBuild`): timed by its own
  milestones (`caseMilestones`, from its own description and steps, "October · December · Each Monday" under "When each step
  happens"); no places, sessions, host, trial of weeks or pilot; the opening says Starts and Review; its own ask (`CASE_ASK_OWN`:
  "Run … as a team: 5 volunteers, each taking a share of its steps…"); roles without "serves at each session" or Host
  (`RC.member.textMade`); "Training before it starts"; the appeal's Help "Give a few hours to one of its steps." (`textMade`); the
  handout's timing boxes are its milestones ("Agreed start:"); the Proposal "starting in October", WHERE "No room needed". The
  prayer calendar was the case he raised.
- *A group supporting another ministry* keeps the ask written for that ("carry in prayer the team of…"); the group's own idea
  (`caseOwnIdea`: the idea's first theme is the group's) gets its own ask.
- *The finance committee, the board and the business meeting choose the day, never the length:* "Choose the day together" / "Elijamos
  juntos el día", three days and Check first; the Length on the opening and the handout is the motion's own.
- *Steps that named another schedule are reworded:* the food pantry "Set fixed hours and never miss them." (no "first and third
  Sunday", no "every other week"), the Pathfinder club "Set the club's meeting times with the church calendar…". A club that runs by
  term (`CASE_TERM_BUILTINS`: the Pathfinder club) is proposed for "The first term" (13 weeks), unless he set the weeks in Adjust.
- *After the vote* the Proposal prints the motion as moved, word for word (`m.moved`: the model built without this body's record),
  THE PLAN as moved too (WHERE never names the agreed day beside WHEN's options), and the agreed timing on its own line under Action
  taken ("Timing agreed: …" / "Horario acordado: jueves por la noche · …"; `action.timing`; in running Spanish the weekday and the
  length are lower case, `caseDecTimingText(...).line`, the table rows keep their capitals). The run is from the first to the last session; the review is "First
  board meeting after {last session}". `CASE_HOLIDAYS` / `caseHolidays(year)`: six US holidays a church seldom meets on (New Year's
  Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas); an option or an agreed run with a session on one says so
  (a Note row; the slide names no date; an option is never dropped for it).
- *The finance committee's handout* is headed "Finance committee recommendation · To: Treasurer & finance committee"
  (`CASE_FIN_KIND`); one status line ("To: … · Agreed by Community Services (Dorcas) on … (6 for · 0 against)"); on paper the trail
  says "· this meeting" / "· esta reunión" (never "these slides"), and nothing "still to come" before the body deciding now.
- *The conference:* the motion names the amount ("by granting up to $3,000 (half of the $6,000 cost), with training and counsel");
  the budget is a table that adds up (Total cost · From the church budget · Asked of the conference · Meeting offerings, or still to
  raise; then one "Also asked" row; `CASE_CONF_BUDGET`); "Still to settle" is no longer a reason under WHY; the trail shows the board
  ("Supported") then "Conference · this proposal". The conference's counsel appears only for a series, a proposal to the conference
  or a cost of $2,500 or more (`CASE_CONF_COUNSEL_MIN`), worded as what we will do.
- *After the gifts results:* one denominator (the results counted); the church family's item says "can lead", as the handout's box
  does; none who fit can lead yet is said with the profile's leaders ("3 leaders in the church; none yet among those whose gifts
  fit: pair and train."). Before any result the church family's slide says "0 of 46 adults have discovered their gifts".
- *The food pantry hands out groceries* (`caseGrocery`, `CASE_RISKS.grocery`): the food bank's partner-agency rules, dates checked,
  dignity at sign-in, never a kitchen; its budget says where the food comes from ("Food: from the food bank at partner prices; the
  coordinator costs it before the finance meeting", no invented figure; the $125 ceiling unchanged). "Help never depends on
  attending church" only for ideas that give material help (`CASE_HELP_PURPOSES`). The calendar safeguard says what we do: "Checked
  against the church calendar before a date is set" (it said "with no clash" before any day was chosen).
- *Figures:* the Pathfinder club's handout leads with its own ages, as its deck does (and the Proposal says it once, without
  "(815)"); the "Here in" slide never repeats the lead figure at the town's level; a club's partners are youth organisations only.
- *Smaller:* WHEN "One of: … (chosen together)"; the one-page Proposal keeps CHURCH and the path; "Short by 13 leaders"; "a separate
  budget line" / "una partida aparte"; "Opening night, proposed for …"; the sources "Map: OpenStreetMap", "Census blocks: U.S.
  Census"; Spanish "o un piloto de 4 semanas", "en un plazo de dos semanas", "buscar primero", no time broken across lines.
- *Phones:* the 30-minute release is measured by the server's clock (present-1.4 sends `now` in op deck and op state, and `age` of
  the pointer in op state; `watchSkew` / `watchAtLocal`), so a phone that opens the link late, or reloads, is free at once when he
  has been gone 30 minutes. **Share link & QR** on a link left following frees its phones (op mode free; `prShareStale` /
  `prShareStaleNow`) and says "own pace". PDF downloads are counted per address **and room**, 600 an hour (`MAX_IP_PDFS`; one
  church's Wi-Fi is one address); the phone's copy of a document is keyed by its number only (`room|s<pv>`), so a new deck version
  fetches nothing again; a refused download (429) is tried again after 20 s, 1, 3 and 5 minutes (`WA_PDF_WAIT`, `watchPdfLater`),
  the button waits under the document's own name, and the copy made from the slides is used only when the server has none.
  "· Updated" on the proposal to vote on as on the handout. The sample presented live ends its room at Exit (no question), so a
  phone that joined the demo is freed. `FIREBASE-RULES-TERRAIN.txt`: the pointer's `pv` and `qv` described as two numbers (words
  only; nothing to republish).
- *Final check (30 Sep 2026):* an outreach idea nobody sits at (`x.seats` false: prayer walking every street, an online idea)
  had the session words the made idea lost: "Team member: Serves at each session and welcomes people by name", "Host: Sits with
  anyone who arrives alone", "Training before the first session" (the samples' prayer walking deck). Now it gets the made idea's
  words (`RC.member.textMade`, no Host, "Training before it starts"); an idea people sit at keeps its Host. Measured in Chrome:
  every such library idea (739) × four team groups × EN + ES, 55,290 slides, 0 over the frame, none below fit 0.8.
- Samples regenerated with the same runner (`~/Downloads/Terrain-v10.42-samples/`): now with "0 Discover your gifts", the prayer
  calendar's v10.41.1 slides beside the new ones, prayer walking, and a church with its Spiritual Gifts campaign (the short link and
  QR on the "Gifts first" slides, reading pastorshub.org; the sample's link is made up and opens nothing on the live site).
- Pinned by the new `tests/v42-fixes.test.js` (84) and the updated `present-function`, `present-pdf`, `firebase-rules`,
  `v42-lock`, `v42-phones`, `timing-options`, `v42-proposal`, `case-model`, `case-fixes`, `case-verses`, `gifts-first-decks`,
  `v41-decks`, `v40-accuracy`, `v40-integration` (each changed assertion commented "v10.42.0 fix after review"). **Full suite: 86
  suites · 7,596 passed · 0 failed.** Gates: the relevance audit 0 of 9,459 decks; the 360 × 640 sweep of every built-in (empty plan,
  both average-church seeds, a 200-character goal: 10,322 slides each) and every library idea (291,610 slides): 0 over the frame,
  none below fit 0.8; live with the real present.mjs: the fixes' scenario 12 of 12 (a late phone free at once, Share frees the
  room, "· Updated" on both documents, four 429s then the server's own copies, the sample's Exit), the integration scenario 16 of 16.

**v10.42.0 (fix after review: the length, 30 Sep 2026).** The pastor, reading the samples (a ministry team's motion said "a trial of 6
weeks" while its slide offered "4-week pilot · 6-week trial · a full season"): *"yes, they should be able to choose length."* With
Suggest options a ministry team's deck (`caseBuild`'s `LENC`: a team group, not an idea made and handed out, not a club that runs by
term; `timingM.lenChoose`, `timingM.lengthsRun`; words in `CASE_TIMING_LEN`, `caseLenFree`) names no length as settled. Record: the
build session's scratchpad `v44/FIX-LENGTH.md`.
- *The slides:* the opening's Length is the three lengths, as the decide slide has them ("4-week pilot · 6-week trial · a full
  season"); the decide slide "We'll choose the day and the length tonight" (under its kicker "Let's decide together"; "together" once:
  the longer headline drew 236 English slides with three clashing options at fit 0.75, measured) / "Elegiremos juntos el día y la
  duración esta noche"; an in-reach idea nobody sits at (the greeters' card): "the start and the length".
- *The ask:* "Throughout the trial, …" / "Durante la prueba, …" (Personal Ministries: "Adopt a trial of the length we choose together
  under this council"), then "We'll choose the day and the length together tonight." ("the start and the length").
- *The Proposal:* "To agree to a trial of the length we choose together (a 4-week pilot, a 6-week trial or a full season), on a day and
  start we agree together: …" / "Acordar una prueba de la duración que elijamos juntos (un piloto de 4 semanas, una prueba de 6 semanas
  o una temporada), en el día y con la fecha de inicio que acordemos juntos: …" (the greeters' card: "starting on a date we agree
  together" / "con la fecha de inicio que acordemos juntos"; `CASE_PROP_FIX.m.teamLen` / `teamLenNoDay`); the subject "…: a trial of
  the length we choose together"; WHEN keeps "Length: 4-week pilot · …", left to the motion on a page drawn tight (`lenInMotion`:
  with it, 78 English and 546 Spanish team Proposals of the built-ins went to a second page; now every English one keeps one page, and
  858 Spanish take two, 884 before this fix).
- *The handout:* "Length: 4-week pilot · 6-week trial · a full season." as before; the line to write in "Agreed day, start and length:"
  / "Día, inicio y duración acordados:" ("Agreed start and length:").
- *The Sabbath deck:* "A trial: {ministry}", When "Starting soon; we'll announce the day and the length" (no Length row), "Throughout
  the trial: pray…", its first steps "Week 1 · start" · "Halfway through" · "After the trial · review".
- *A recorded length* (Record what we decided: 4-week pilot, the trial, a full season or other weeks) fills in everywhere, as the day
  does: the Agreed slide, the handout, a phone's copy, the team's ask ("For 4 weeks, …"), a later body's motion ("To approve a trial of
  4 weeks, from …"), and under Action taken "Timing agreed: … · 4-week pilot" (the team's own motion printed as moved).
- *Unchanged, byte for byte* (deck, handout, Proposal and a phone's copy, against the build before this fix): every built-in × all 34
  groups × both modes × EN/ES (8,500 unchanged, 5,508 team and Sabbath decks with options changed) and every second library idea the
  same way (128,560 unchanged, 78,840 changed): "I already know the dates", the finance committee, the board, the business meeting,
  the officers, the conference, every idea made and handed out, the Pathfinder club's term; the samples' finance → board path with
  and without its decisions, EN and ES.
- *Measured at 360 × 640 in headless Chrome:* every built-in × the 26 team groups and the whole church × EN/ES (empty plan, three
  ministries and his series in the plan, the average church after gifts) and every library idea × its own team group (empty plan and
  the clashes) and the whole church: 314,840 slides, 0 over the frame, none below fit 0.8. Every built-in's team handout and phone copy
  two pages, no line outside its box.
- Pinned by `v42-fixes` §13 (28 checks; 21 fail on the build before this fix) and the updated `v42-fixes` §2 §5,
  `timing-options`, `v42-proposal`, `v42-handout`, each commented "fix after review (the length)". **Full suite: 86 suites · 7,625 passed · 0 failed.**
- Samples: the greeters' card, food pantry (Community Services) and prayer walking, before and after gifts, made again with the same
  runner and settings (the same made-up campaign link); README.txt's list has one more line. The other samples are unchanged.

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
- *Cards:* name, description, size/people/cost/where/"Fits the Sabbath" or "Best on another day" (a built-in's card: "Fits the Sabbath"
  when it fits), the four steps, "Why here" only from real figures when a
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
blocks and every function first, then runs all 131 suites.

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

`tests/` holds 131 suites and `run-all.js`. They load `../index.html`
and `../netlify/functions/*.mjs` directly, stub `fetch`, and never call a
real API or spend credit. `fixtures.json` is a fabricated high-need tract plus
a small and a medium church. `average-church/` (v10.42) is a made-up average
church (Sampleton SDA (SAMPLE): 80 members, 55 attending, no / 18 / 40 Spiritual
Gifts results) as the app keeps it in localStorage, read by
`v42-average-church.test.js`; it is generated by the part-3 design's
`build-fixture.mjs` (never edit it by hand). `run-all.js` runs every suite with
`REQUIRE_V42=1` (v10.42.0), so none of that suite's part-3 checks may be PENDING: they all count.

- v10.45 added `v45-needs` (61: `nsModel` on the fixture, `RULES` untouched, `NS_GATE`, the ranking, "Also here", the strip),
  `v45-needs-ui` (59: the section, one card open, the lifts, the sheet, focus and keys, Spanish), `v45-needs-data` (35: `needs.json`
  from the build and its checks, `{lang}`, `@lang`, the Diwali gate), `v45-pdf` (27: `nsPdfDoc` in node, one page always, both faces,
  EN + ES), `v45-handoff` (41, the design's own: Create a proposal → Make the Case → Back), `v45-profile-move` (31: the profile on the
  gifts landing, `capMerged()` unchanged) and `v45-survey` (18: the stamps, the Pennsylvania words, the validator's PA check, the golden
  keys changed only by those words, "CCD"); `scroll-to-mobilization` became `scroll-to-church`. Updated to the new intent, each with a
  comment: background-ideas, buy-core, case-fixes, case-steps, church-summary-box, connect-tailor, demo-and-clear, entitlement-tiers,
  gifts-first-ui, home-church, idea-fresh, idea-library-build (the index under 1,000 KB raw and 300 KB gzipped), idea-library,
  near-miss-ordering, no-ai-words, profile-slider, v40-accuracy, v40-review-app, v40-review-lib, v41-1, v42-core, v42-plan-first,
  v43-cadence-data, v43-cadence, v43-path, v44-sabbath-leftovers (the library tests now search Make the Case's library, where the
  survey's went). `v43-ongoing-golden.json`: 18 keys of lot-market, noticeboard and bench re-written (the Pennsylvania words; v45-survey
  puts the old words back and gets v10.44.1's hashes), every other key unchanged.
- v10.45's review round added `v45-review` (92: one or more checks per finding of review/PASTOR-REVIEW.md and CODE-REVIEW.md, EN + ES)
  and grew v45-needs (62), v45-needs-ui (59), v45-pdf (37: the real type sizes, uncompressed; the Spanish labels; the foot; the
  write-in lines; the church's name), v45-profile-move (40: the card near the top, open when empty, in Spanish; B1, two churches) and
  v45-survey (18). Updated to the new intent (`patches/p9-tests-review.mjs`): the prices in case-fixes, case-model, case-review39,
  timing-options, v42-fixes, v42-proposal, v43-cadence-words and v43-timing-cadence; "Create the proposal for …" in v43-path and
  v43-average-church; "Your church" in case-screens and gifts-first-ui; the focus note in rings-and-donuts; the empty plan in
  v42-plan-first; Psalm 34:18 in v40-accuracy (and `scripture-bg.json`). The golden file's 248 re-written keys (38 ongoing built-ins,
  priced at their source and given their Spanish) are listed in v43-ongoing-golden.test.js's header; every other key is v10.44.1's.
- v10.42 part 3 added `case-focus.test.js` (the goal, the arc, the relevance rule: NARRATIVE T1–T10, T12),
  `v42-core.test.js` (the decision records, the approval path, the goal store, `gfReadiness`, the profile's two new
  fields, the average demo church), `v42-proposal.test.js` (the Proposal to vote on) and `gifts-first-decks.test.js`
  (Gifts first on the decks and the ask list, on `average-church/`). The slide fit itself (0 overflow, fit ≥ 0.8) is a
  Chrome check, not a jsdom one: see `caseFitDeck` below.
- v10.42 part 3 also added `present-pdf.test.mjs` (present-1.4: op putpdf / GET op=pdf, the `how` slide, the gifts deck),
  `v42-lock.test.js` (phones locked while he presents), `v42-decide-ui.test.js` (Record what we decided, the step-3 card, the
  path editor), `gifts-first-ui.test.js` (the Gifts first card, announcements, the Sabbath deck) and, for section F,
  `v42-plan-first.test.js` (the survey's list is for the community; step 2 opens with "From your plan").
- v10.43.0 added, for C1, `v43-cadence-data.test.mjs` (the three source files, the index's `cad` column, the theme records' `cad` /
  `nx` / `nocard`, a broken source stops the build), `v43-cadence.test.js` (the reader, labels, the three filters, "Runs as"),
  `v43-timing-cadence.test.js` (an event, a weekly series, nights in a row, a series with no count), `v43-ongoing-golden.test.js` +
  `v43-ongoing-golden.json` (535 ongoing outputs hashed from v10.42.1; the version field is said back as v10.42.1 before hashing)
  and `v43-followup.test.js` (applies, the next step, the picker, the After slide, handout, Proposal, motion, counts, step 3's
  card), with the helper `v43-helpers.js` (not a suite); for C2 `connect-function.test.mjs` (the server and the security list
  S1–S23 of DESIGN §9), `connect-tailor`, `connect-pastor`, `connect-look`, `connect-pdf`, `connect-client` (+ the helper
  `connect-blocks.js`, which loads the two CONNECTION CARDS blocks out of index.html into a VM); for C3 `v43-path.test.js`; and
  the integrator's `v43-average-church.test.js` on `average-church/seed-followup.json`, `v43-proposal-pages` (a team's Proposal keeps
  one page with the follow-up plan: level 4), `v43-fixed-dates` (an event's or a series' own dates and words with dates set, and the
  one-day words), `v43-connect-keep` (the people stay when the server forgets a card; the tile's ring) and `v43-slide-words` (every
  word a deck writes is on its slide; the picker's "1 volunteer"). `run-all.js` sets `REQUIRE_V43=1` too.
  `connect-look` checks the faces in `fonts/` (a NOTE, not a failure, if they are missing); `v43-fonts` (1 Oct 2026, with the fonts)
  checks the folder (exactly the two files and OFL.txt), that index.html's two paths are those files, each file static TrueType, the
  right face and weight, embeddable, unmodified (SHA-256), every character of the card's words and of the library's names in both
  languages, OFL.txt, and that a printed card embeds both faces with every character it draws in them in the face (jsPDF 2.5.1
  leaves out a character its face lacks: an emoji, or a letter outside the face's alphabets, in a typed event name prints as nothing and the rest of the
  line still prints; only a character below U+0100 missing from the face would cut the line short, and Space Grotesk has every
  printable Latin-1 character).
- The review of v10.43 (1 Oct 2026) added `v43-privacy-docs` (the privacy promise and the children's line in every event/series Proposal
  and handout), `v43-cadence-words` (no monthly rhythm in an event's or a series' deck, handout or Proposal; ongoing keeps its words)
  and `v43-review-fixes` (S22's head script, the phone's band, the thank-you's prayer, the parents' line, the icons, the health fair's
  step, the motifs). `gifts-first-decks` takes about 105 s of the runner's 120 s per suite: run the suite on a quiet machine.
- v10.44.0 added, for B1, `purchase-quotes`, `buy-core`, `buy-ui`, `buy-deck`, `buy-docs`, `buy-average-church` (on
  `average-church/seed-purchase.json`, made by `make-seed-purchase.mjs`), `advise-prices` and `advise-sabbath`; for B2
  `conferences-data` (the build reproduces `conferences/` byte for byte; the netlify copy) and `conferences-view`; the integrator's
  `v44-sabbath-leftovers` (the validator EN + ES and its selftest, vocab.json, the offering line in the library and the writers' notes)
  and `v44-integration` (the goal box, the quote letter's contact, the Action taken spacing, the heat tables' long words, both paths
  side by side). The fit of the purchase decks at 360 × 640 is a Chrome check: `~/Downloads/Terrain-work/v56/integ/gates/buyslides.mjs`
  (the review's copy, with seven more stress items: `~/Downloads/Terrain-work/v56/fix/gates/buyslides.mjs`).
- The review of v10.44 (2 Oct 2026) added its checks to the suites they belong to, each failing first: `buy-deck` (one Ellen White line a
  deciding deck, Christ named, the timeline's order, never cut, the roof's words, the Sabbath safeguard, the conference's three cases,
  the van rule), `buy-docs` (Spirit of Prophecy, the Proposal's Ellen White line, the kickers, the Spanish edition, the chance line, the
  roof's motion, p. 153's three cases), `buy-ui` (the "Why this one" box, the sale's rule and `sabbathNo`, step 4's lines, the searched
  host, the request's budget and need, the search picked up again), `buy-core` (Clear all's words), `purchase-quotes` (every page an
  Ellen White line is on), `advise-prices` (the cap across a job's requests, the brackets, `PRICES_DAY_MAX=0`, the late wake-up, `lost`),
  `conferences-data` / `conferences-view` (boards, the Midwest–South words, no "AI" / "IA" in any served word), and the hub suites.
- The fixes after review (30 Sep 2026) added `v42-fixes.test.js` (on `average-church/`: an idea made and handed out, a group's
  own ask, the day but never the length for the bodies that vote, the motion as moved after the vote, the finance handout, the
  conference's amount and budget, one denominator after the gifts results, the club's term and lead figure, smaller words; §13: a
  ministry team chooses the length together, the Sabbath deck announces it, a recorded length fills in).
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

**Community Survey · the needs** (v10.45, DESIGN-SURVEY.md; the block after `RULES_ES`, the page code before `render()`)
- Data: `RULES_MORE` (lang-also, lang-third, teens, near-poor, working-poor, pubassist, family-english, aging-owners, seniors-many) +
  `RULES_MORE_ES`; `RULES_SAY` (the survey's words: grief, debt, seniors-nocar, isolationyoung, lang-primary, lang-second); `NS_GATE`
  (debt); `NS_RANK` {lens, eff, s}; `NS_NEAR` (near the line); `NS_TOPIC`, `NS_CAT_ES`, `NS_KIND_MORE`; `NS_LANG` (the Census's 12
  language names in EN/ES, the two groups and their members); `NS_FALLBACK` (tags/themes topping a short list up to 10), `NS_LANG_NEED`
- `nsModel(M,scope)` → {needs (ranked), also, langs, born, groups, town}; `nsSay`, `nsOn`, `nsScore`, `nsNeedOf`
- The section `#u-needs` (static, under `#focusnote`): `NS` (state), `NSM` (the model drawn), `nsHTML` / `nsDraw` / `nsCardHTML` /
  `nsBodyHTML` / `nsIdeasHTML`; `nsLoad` (the index + `ideas/needs.json`, sessionStorage `terrain-lib-needs`, a new hash renews it);
  `nsIdeasFor(need)` (the curated list, a merged need's four, then `@lang` for lang-primary/also/third; `NS_ORIGIN_GATE` on the need's
  own geography, `NS_SNOW` / `nsSnowless`, `NS_TWINS`; 8 a lift, 5 for the long Spanish list; topped up from `NS_FALLBACK`);
  `nsLift`; `nsView(id)` (one shape for library and built-in ideas; `NS_BUILTIN_LANG`; `priced`); `nsOnce` / `nsTotal` (an event's
  or a series' money and hours "in all", as Make the Case sums them); `{lang}`: `libFill`, `libLangCtx`, `nsLangFill`, `nsNeedLang`,
  `nsLangKey`, `libFillRaw` (a filled copy, its own id); `nsRenewed` (a deploy under an open tab)
- The review round's model parts: `NS_MIN` (the small-group gate), `nsLangS` (a language by limited English), `NS_SAY_FIX` /
  `NS_US` / `nsFixWords` (love first, US spelling), `NS_CAT_SAY` / `NS_KIND_SAY`, `NS_COUNT` (the badge's 50), `nsFigKey` and
  `merged` (one figure, one row), `nsTownWords` (a CCD is "the X area"; `placeTown` on the place line), `NS_GROUP_BY_ORIGIN` /
  `nsGroupMembers` (a group named by its members here), `nsOrigins` / `NS_CTX`
- The sheet `#ns-sheet` (a dialog, `showModal`): `nsSheetOpen` / `nsSheetDraw` / `nsSheetClose`; `nsPropose` (the hand-off) →
  `nsLand`; `nsFromHTML` / `nsChosenNextHTML` / `nsBack` / `nsBackTo` (sessionStorage `terrain-ns-back`); `nsPlanId` (one plan
  entry per language); `nsWhyOf` (`uChurch().whyFrom`: Make the Case's "Why here" for an idea proposed from a need, read by
  `libWhyText` and `uEvidence`); `casePrefs().path` (not enumerable, so the saved choice reads as before)
- The PDF: `nsPdf` → `nsPdfDoc(jsPDF, idea, need, o)` (pure; `v45-pdf` runs it in node) → `nsPdfFit` (levels `NS_PDF_LV`) →
  `nsPdfLayout` (its audit: every string with its size and role); `nsPdfName`; `nsPlaceIn` (the foot in Spanish); `nsVerse` (the
  verified library only; `NS_VERSE_OWN` / `NS_VERSE_NEED`: grief Psalm 34:18, single parents Galatians 6:2)
- The built-ins' prices: `U_LINES_OWN` (the 54 the needs show; an event's two lines, before and on the day) and `U_FREE_OK`; the
  library's {lang} copies found in the index by `libRowOf`; the profile's name `capName`; `gfChurchEmpty` (the card opens by itself)

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
- `capRender()` — the four-step slider (`.u-stage` fixed height, `.u-track` slides); since v10.45 on the Spiritual Gifts landing, "Your church"
  (`#gf-church` → `#capslot`), never in the survey: `gfChurchOpen()` opens the fold, `gfChurchSum()` is its one-line summary
- `DEMO_CHURCH`, `capFillDemo()`, `capClearAll()`, `armThen()` — demo and two-tap clear
- `capSummaryHTML()` — the itemised box, now under the profile in "Your church" (v10.45)
- `capShowSaved()` (the old name `goToMobilization()` is kept as its alias) — instant jump after Save/Demo to "Your church" (never `smooth` — it animated from the bottom)

**Fresh ideas (the model; shown as "New idea" / "Draft idea", never "AI")**
- `GEN_PLAN` — 20 per level, four parallel batches (Serve / Equip / Belong / Invite)
- `autoIdeas()` — no longer called by the page (v10.45, Q3: it fed the survey's ministries list, which is gone, and each run spends credit; "More ideas for {group}" in Make the Case stays). It was the background run after a profile save or survey; **synchronous `AUTO_RUNNING` guard before any await** (without it, two triggers generated and billed twice)
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
- Step 2 from the plan (v10.42 section F): `#cs-plan` "From your plan" (`casePlanItems`, `casePlanFits`, `CASE_PLAN_ANY`, `casePlanHTML` /
  `casePlanDraw` / `casePlanWire`, `caseToSurvey`), then `#cs-more` "More ideas for {group}" (`libDrawList` leaves out `casePlanShownIds`);
  the survey's list: `uForCommunity`, `uMinistriesAgain`, the first line `.u-choose`
- The conference (v10.41): `caseConfBuild`, `CASE_CONF`, `CASE_CONF_SRC`, `caseDistrict()`, `caseConfOf()` (registration's conference; `pa`), `CASE_PLAN_ID` / `casePlanItem()`, the ask fields `caseConfAskHTML` / `caseConfAskWire` / `caseConfRebuild`
- The church remembered: `homeEnsure()` → `run(getGeo,{quiet:true})` → `homeAfterRun()`; `homeLine()`, `HOME_ST`
- Scripture and the place: `CASE_VERSES` (113; `CASE_VERSE_BASE` 60 = the v10.40 set every community deck still draws on, `CASE_VERSE_SETS`) / `CASE_EGW` (11) / `CASE_VERSE_PLAN` + `CASE_VERSE_PLANS` {inreach, conference} (= `tests/case-quotes.json`), `CASE_VERSE_HOME` (each group's slides, in order of preference), `caseVersePlan()`, `casePlaceBuild()` (partners: `CASE_PLACE_CAT`, `CASE_PLACE_KIND`, relevance then distance), the slide's budget `CASE_PLACE_LAYOUTS` / `CASE_PLACE_ORDER` / `CASE_PLACE_MAX` (v10.41.1 fix 4: `nameLineFact`), `casePlaceArrived()`
- Who already serves (survey + place slide): `HELP_CATS` / `HELP_ES` (12 groups), `helpCatOf(tags)` (one classifier, most specific first), `fetchHelp()` (one Overpass request, 3 miles, 15 s); Ellen White outside the slides: `EGW` / `EGW_ES` / `egwHTML(k)`
- Leave-behind: `caseHandout()` → `casePdfDoc()` (`casePdfMake` makes it, `casePdf` saves it); live: `caseOpenPresenter`, `#watch=` (`watchRender`), `present.mjs`
- How phones move (v10.42, present-1.3): `prPhonesGet` / `prPhonesSave` (`uChurch().casePhones`), `prRoomPhones`, `prPhonesHTML` / `prPhonesWire`, `prPhonesSync` (open link → op mode), `prPhonesInto` (the Phones sheet, the link panel), `prPhonesMark`; on a phone `WA.pmode` / `WA.pdf`, `watchLocked`, `watchPhonesFrom`, `watchPhonesApply`, `watchWatchdog`, `watchBannerPaint`, `watchPdfPrep` / `watchPdfBtn`; the renderer's `lock`, `setLock`, `locked`, `holdHere` / `holdOn` / `unhold` (`TD_HOLD_IDLE_MS`, the yes slide's `act`); a member's copy of the proposal: `caseHandout(null, deck)` (the deck path: `unitW`, `gifts.lead`, `capacity.okLine`; with options `H.timing` from the decide slide, `timing.head`, no write-in line, the dates slide's steps on the back, `askHead`)
- Phones locked, his handout on phones (v10.42 part 3, present-1.4): `prPhonesLine`, `prExitAsk`, `prBeat` (`PR_BEAT_MS`), `prPdfSync` → `prPdfSend` → `prPdfPut` (`PR_PDF_ST`, `PR_VOTE_GROUPS`, `prVoteDeck`, `prGiftsDeck`), `prPdfLine`; on a phone `watchStale` (`WA_STALE_MS`, `WA.atSeen`), `watchPdfGet`, `watchPdfPrep` / `watchVotePrep` / `watchPdfBtns` (`WA.pv` / `WA.qv`), `watchGiftsBtn`, `tdGiftsHref`
- Record what we decided (v10.42 part 3; the records are section A's `caseDecisions` / `caseApproval`): `CASE_DEC_UI` / `cdU`, `caseDecFormHTML` / `caseDecFormWire`, `caseDecCardMount` (step 3's `#cs-dec`), `casePathEdit`, `prDecideOk` / `prDecideInto` / `prDecideSaved`, `caseDecPush`
- Gifts first (v10.42 part 3): `GF_FIRST_UI` / `gfU`, `GF_MINUTES`, `gfFirstCardHTML` / `gfFirstWire` / `gfFirstHub` / `gfFirstRefresh` / `gfFirstQuietSync`, `gfInviteChurch`, `gfAnnounce` (`GF_ANN_KINDS`), `gfFirstPrefs` (`uChurch().giftsFirst`), `caseGiftsBanner` (`#cs-gff`), `gfReadyPanelMount` (`#cs-ready`), `gfSync` one at a time (`GF_SYNC_P`); the Sabbath deck `gfdDeck` / `gfdVerse` / `gfdEnsure` / `gfOpenSabbath` / `gfRenderSabbath` (`GF_VIEW='sabbath'`), `gfdLink`
- Timing (v10.42): `CASE_TIMING` (every word, EN + ES), `CASE_TIMING_ALT` / `caseTimingAlt`, `caseTimingOf` / `caseTimingSet` (per church,
  ministry, group), `caseTimingOptions` (the three times), `caseBuild`'s `OPT` / `FLEX` / `PROP` and `timingM` (`model.timing`), the
  decide slide in `caseDeck` (an ask slide, `part:'decide'`), `caseMonth`, `CASE_SAB_SLOTS` / `CASE_SAB_BUILTINS` / `caseSabFits`, `CASE_VERSE_DECIDE` /
  `CASE_VERSE_MOTION_OPT`; `caseCtx().series` (his Planner series, for its evenings); the length a team chooses (fix after review):
  `CASE_TIMING_LEN`, `caseLenFree`, `caseBuild`'s `LENC` / `TAL` / `TLN`, `timingM.lenChoose` / `lengthsRun`, `CASE_PROP_FIX.subjectLen`
  and `.m.teamLen` / `.m.teamLenNoDay`, the Proposal's WHEN `lenInMotion`

- The focus (v10.42 part 3; the pastor: "everything should tie into that… a focus, a beginning and an appeal at the end"):
  the records block "THE RECORDS" (`CASE_BODIES`, `CASE_DEC`, `caseDecClean` / `caseDecSave` / `caseDecDrop` / `caseDecTrail` /
  `caseDecAgreed` / `caseDecStatus…`, `caseApproval` / `caseApprovalSet`, the goal: `CASE_GOAL`, `CASE_GOAL_THEME`,
  `caseGoalSuggest` / `caseGoalOf` / `caseGoalSet`, `gfReadiness`, `gfShortLink`); the relevance rule (`CASE_PURPOSES`,
  `CASE_THEME_PURPOSE`, `CASE_PURPOSE_BUILTIN`, `casePurposeOf` → `model.purpose.allowed`: a figure, a direction or a partner
  appears only when the idea's purpose allows it); the arc (`CASE_ARC`, `caseHowOf` + `CASE_HOW_BUILTIN` (Spanish steps of the
  built-ins), `caseAppealOf`, `caseGiftsSlide`, the `how` slide, the goal callout `tdGoal`); step 3's goal box `#cs-goal`
  (`caseGoalHTML` / `caseGoalWire`); the Proposal (`caseProposal` → `caseProposalDoc` / `caseProposalPdf`, `caseProposalName`)
- The slide fit (v10.42 part 3): `caseFitDeck(slides, jobs, twin, lang, {g0, g1})` sizes the slides that carry the goal (the
  opening's rows, the answers' words, the close's line), What it takes (the headline without the aim, the shared-room gap's
  short form), How it works and the roles, from `CASE_FIT` (heights and line widths measured in Chrome at 360 × 640, --fit .8;
  `caseWrapN` / `caseWrapW`). It estimates both languages (`model.twin()`, the other language's model) so an English and a
  Spanish deck keep the same rows and verses, and the verse rooms follow the suggested goal, so a goal he types changes the
  opening and the appeal only. After any change to slide copy or the renderer's type, re-run the Chrome sweep (every slide of
  every built-in and every 4th library idea, EN and ES, with a 200-character goal and with ministries in the plan) before
  touching `CASE_FIT`.

**v10.43.0 — cadence, the follow-up plan, connection cards, the path** (blocks just before "THE RECORDS": `/* ==== CONNECTION
CARDS · shared ==== */` (pure: tailoring, looks, the pastor's rules), `/* ==== CONNECTION CARDS · page ==== */` (form, card, sheet,
list), then `v10.43 (C1)`; and `v10.43 (C3, SPEC §5)` after `gfFirstPrefsSave`)
- Cadence: `CASE_CADENCE_BUILTIN`, `caseCadDecode` / `caseCadEncode`, `caseCadGuess` (+ `caseSeriesCount`, drafts only), **`caseCadenceOf(x,o)`**
  → `{c:'ongoing'|'series'|'event', n, row, dated, src}`, `caseCadLabel` / `caseCadTag`, `cadSegHTML` / `cadSegPaint`, `U_CAD` /
  `uCadCounts` (the survey's filter `#u-cadseg`), `libFilter`'s `f.cad`, step 2's `#cs-cad`; "Runs as" `caseRunsHTML` / `caseRunsWire` /
  `caseRunsSet` (`uChurch().cadence`); in `caseBuild` `KC` / `DT`, `caseCadLeaf`, `caseCadMonth`; `caseKidsOf`
- The follow-up plan: `fuApplies`, `fuGet` / `fuSet` / `fuClean` (`uChurch().followUp`), `fuOk`, `fuCandidates` / `fuSuggest` / `fuNextOf`,
  `CASE_NEXT_BUILTIN`, `CASE_NOCARD_BUILTIN`, `fuCounts` (C2's `cnResults` + `cnDueFor`), `fuModel` → `model.followup`, the After slide
  (`part:'after'`, `CASE_VERSE_AFTER`, `CASE_FU_HEAD_RES`), step 3's `#cs-fu` (`fuCardRowHTML`, the picker), `fuIdeaOf`
- Connection cards, pure: `cnKind`, `CN_GENTLE`, `cnParent`, `cnIdea`, `cnTailor`, `cnNextLabel` / `cnNextNoun` / `cnNextAbout` / `cnAboutNp`,
  `CN_TEXT`, `CN_OPT`, `CN_LINES` (helplines), `cnPromise`, `cnThanks`, the looks `CN_LOOK`, `CN_THEME_LOOK`, `CN_BUILTIN_LOOK`, `cnLook`;
  the pastor's rules `CN_KEEP_MS`, `CN_DUE_DAYS`, `CN_INVITE_PICKS`, `cnPersonOf`, `cnMerge`, `cnPrune`, `cnChecklist`, `cnDueToday`,
  `cnCounts`, `cnMsg` / `cnHrefs`, `cnCsv` / `cnCsvName`, `cnPaper`
- Connection cards, page: `CN_SITE` (`https://pastorshub.org`), `CN_FN`, `CONNECT_LINK` + `memberLink()` (every member-link guard),
  `FEATURES.connect`; motifs `CN_MOTIF` / `cnMotifSVG` / `cnMotifPDF`, icons `CN_ICON`, fonts `CN_FONTS` / `cnPdfFontBytes` /
  `cnPdfFonts`; the printed card `cnPdfDoc` / `cnPdfCard` / `cnPdfFit(s)` / `cnPdfName`; the phone form `cnBoot` / `cnFormHTML` /
  `cnFormMount` (`#cnp`); his side `cnStore` (`uChurch().connect`), `cnEligible`, `cnItemOf`, `cnResults`, `cnDueFor`, `cnMake` /
  `cnSave` / `cnClose` / `cnRetire` / `cnRemove` / `cnPull` / `cnQuietPull` / `cnDelete` / `cnPaperAdd` / `cnCsvSave` / `cnPdfSave`,
  the sheet `cnSheetOpen` (`#cn-sheet`; `cnOpenMaker` / `cnOpenList`), `cnIdeaBtnHTML` (the idea card's button via `libActsHTML`),
  `cnBackupNote`; the sheet fires `terrain:connect` on `document` when it closes
- Review fixes (v53 fix): the printed card `cnPdfCard` (`opt.part`), `cnPdfLayout`, `cnPdfSides`, `CN_PDF_FLOOR`, `cnSvgPath` / `cnIconPDF`,
  `CN_TEXT.noPhoneBack` / `otherSide` / `prayLine`; titles `cnCutPair` / `cnTitles` / `CN_TITLE_ES`; `cnHeadKeep`, `cnNoBreak`, `CN_NOT_PARENT`,
  `CN_FONTS_OK`; the head script and `html.cn-nofonts` (S22); `CASE_CAD_T.mw`, `caseCadHoursEach`, `caseCadMW`, `m.ask.cad` / `run` / `runF`,
  `Pz.budget.rows4`, the Proposal's `memoRows` at level 4, the handout's `join3`; `clause.followupA`
- Integration (v53): `caseProposalDoc`'s fifth level (`top`, `Pz.followup.tight4`, level 4 at D 0.84); `V.last` and the fixed-date
  patterns in `CASE_CAD_LEAF`; `RC.member.textEvent`, `CASE_COPY.support.startEvent`, `CASE_COPY.yes.help.textCongEvent` /
  `textCongSeries`; `cnPull`'s `no-card` → `past` (`gone:true`, no key); the sheet's `listOk` and `cnListHTML(…,{noPaper})`;
  `.td-notelong`; the picker's `gapOne`
- Section 5: `NEXT_UI` / `nxU`, `nxPageOk`, `nxPlanItems`, `uNextHTML` / `uNextWire` / `uNextEqual` / `uNextRefresh` (`#u-whatsnext`, the
  survey's last block; `uOpenProposal(id,{at:'s1'})`), `hubPathSteps` / `hubPathHTML` / `hubPath` (`#hubpath`; the hub's children are now
  hubwelcome, egw, rule, hubpath, tools, hubgifts; `@keyframes hpBreathe`)

**Make the Case · projects and purchases** (v10.44; block "MAKE THE CASE · PROJECTS AND PURCHASES" before "MAKE THE CASE: PRESENTING, SHARING, FOLLOWING")
- Words and data: `BUY_UI` / `buyU`, `BUY_CATS`, `BUY_WHY`, `BUY_FUND`, `BUY_TIERS`, `BUY_HOW`, `BUY_RISKS`, `BUY_CM` (Church Manual 2025 pages), `BUY_SL`
  (slides), `BUY_P` (paper), `BUY_RFQ`; `PURCHASE_VERSES` / `PURCHASE_EGW` / `PURCHASE_VERSE_PLAN(S)` (= `tests/purchase-quotes.json`)
- The store `uChurch().caseBuys` (`buyClean` on every read and save: `buyStore`, `buyGet`, `buySave`, `buyDrop`, `buyNew`, `buyRules`), sums
  `buyTotal` / `buyFundSum` / `buyMeter`, the path `buyPathOf`, the facts `buyFacts`, the goal `buyGoalSuggest` / `buyGoal`
- Slides `buyModel` → `buyDeck` (`buyVersePlan`, `buyMotionRoom`, `BUY_VERSE_ROOM`), `buyBuilt` (decisions and live rooms); paper `buyHandout` →
  `buyPdfDoc`, `buyProposal` → `buyProposalDoc`, `buyRfq` / `buyRfqPdf`, `buyPdfSave`, `buyPdfSend`
- Find prices `BUY_PRICES`, `buyPricesProbe`, `buyPricesOn`, `buyPricesFind`, `buyPricesWait`, `buyPricesAccept`, `buyPricesSay`
- Screens `buyMount`, `buySwitchHTML` / `buySwitchWire`, `buyStepBar`, `buyDraw1`…`buyDraw5`, `buyDecOpts` (Record what we decided), `BUY_ST`
- Integration (v10.44): `goalFit` (both paths' goal boxes grow to their words), `BUY_RFQ.visitMail` (an email is written to, a phone called)
- Review (v10.44): `buyEgwFor` (one Ellen White line a deck, at its close), `buyIsWork` (repair / install / build: "the work"), `buyConfWhy`
  (build · debt · review, Church Manual p. 153) and `buyConfAsk`, `buyRiskSix` (a slide's six safeguards), `buyEventNote` / `buyLineRule`
  (a sale or an event under "Something else"), `buyPricesResume`, `buyBoxFit`, `BUY_CM.editionSlide`, `BUY_P.heads.sop`, `BUY_SL.askWork`

**Learn from other conferences** (v10.44; block "LEARN FROM OTHER CONFERENCES" before `boot`; `cmpShy`: a soft hyphen in a heat table's long word)
- Data: `conferences/` (generated by `tools/conferences/build.mjs` from `tools/conferences/src`; README there), `CMP_DIR`, `cmpLoadIndex` / `cmpLoadDetail` / `cmpLoadAhead` (`?v=` the index's version)
- `CMP_UI` / `cU`, `CMP`, `cmpReg` / `cmpState` / `cmpSave` (`terrain-compare`), `cmpOpen` / `cmpClose` / `cmpRender` / `cmpDetails`, `cmpPicker`, `cmpCards`, `cmpCharts`,
  `cmpAhead` (`cmpPrepList`, `cmpHintText`, `cmpWhen`, `CMP_LANES`), `cmpLearn` (`cmpLearnCards`), `cmpSW`, `cmpSaid`, `cmpTable`, `cmpSources`, `cmpCaveats`;
  `cmpLink` / `cmpHttps` (https only), `cmpToday` (never before the check date), `CMP_STALE_DAYS`; Make the Case's door `caseCmpDoorHTML` / `caseCmpDoorWire`
- Review (v10.44): `CMP_UI.why_other` ("another part of the country"); in the builders `profiles.mjs` `boardOrSession` and `pack.mjs` `WRITE_OUT` / `noAiWords`

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
   **Cadence (v10.43):** every idea is `ongoing`, `event`, `series-N` (n weekly sessions, 3–26), `series-N-row` (n days in a row)
   or `series` / `series-row` (no count stated) — its own `cad` field, else its line in `tools/ideas-src/cadence.json` (which must
   name every shipped id). A new event or series needs two ongoing next steps in `next.json` (each a shipped ongoing idea, not
   itself), or a line in `nocard.json` with the reason when its own words promise no names. Any fault in the three files stops
   the build with nothing written. The index is 0.94 MB raw (238 KB gzipped) under the test's 1,000 KB raw and 300 KB gzipped limits (v10.45).
   **The needs map (v10.45):** `tools/ideas-src/needs.json` = {ruleId: [ids…], "@lang": {group: [ids…]}}, every list in display order
   (light, moderate, heavy; most effective first). The build checks it and writes `ideas/needs.json` (with each idea's one line, `d1`;
   the hash covers it): keys are `RULES` / `RULES_MORE` ids (vocab.json) or `@lang` groups; a need's list 10–24 ids (an `@lang` list
   has no count); every id shipped (library or built-in), none `reach: "in"`; an idea whose name names a language or culture only under
   its own `@lang` (a description doing so is a REVIEW line); no Pennsylvania word (error), and no township or borough in any idea a need
   reaches. `{lang}` in an idea's words is filled with the neighbors' language on the page (the validator counts it as 6 characters).
2. `cd tools/ideas-src && node validate.mjs themes/<theme>.json` (read the REVIEW lines too), then
   `node validate.mjs --all` (unique ids, no near-duplicate names across themes, unambiguous synonyms).
   (The review pass kept the writers' working copy in the build session's scratchpad `ideas/` and packaged it with
   `v41/fix-work/package.sh`: vocab refresh, selftest, `--all`, copy into `tools/ideas-src`, build. Editing
   `tools/ideas-src` directly and running steps 2-4 is the same thing.)
3. From the repo root: `node tools/build-ideas.mjs --src tools/ideas-src` — it writes nothing if anything fails.
4. `npm test`: `idea-library-build.test.mjs` rebuilds from `tools/ideas-src` and fails if `ideas/` differs by one byte
   (and holds `ideas/index.json` under 1,000 KB raw and 300 KB gzipped, v10.45: 0.94 MB at 57 themes and 3,100 ideas, so the next themes
   still need the index slimmed or the limit reconsidered);
   `v40-review-lib.test.js` types every synonym as a query (each must open its own theme, and only it); `v40-accuracy` holds
   every quoted verse near a reference to `scripture-bg.json` (add the passage there, fetched, before quoting it).
5. If `profile()` tags, `U_SKILLS` or `U_FAC` change in `index.html` (or a built-in's name), refresh the validator's copy:
   `node validate.mjs --vocab ../../index.html` (a full path makes vocab.json's `source` name the folder; v10.44 rebuilt it: "Fix-it Sunday").
   The validator reads the Sabbath guideline in English and Spanish (v10.44; REVIEW lines never fail a file).

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
- **The presenter moves the phones** (his request, v10.42: "I want only the presenter to have the ability to control the
  slides"; part 3: "Maybe just have it where it's locked until the presentation is complete"): Present live always locks the
  phones to his slide, with no swipe choice; Share link & QR always lets members look through at their own pace. Phones are
  free after the end, and after 30 minutes with no word from him (locked again at his next move). His handout (and, for the
  finance committee, the church board and the business meeting, the proposal to vote on) is offered on phones at the last
  slide and after the end unless he switches it off.
- **Firm on the what, flexible on the when** (his request, v10.42): a proposal gives options for the day, the start and the length
  ("Suggest options", the default); places, coordinator, ceiling and funds are decided; the team reports the day and start within
  two weeks. The bodies that vote (finance, board, business meeting) choose the day only: the length is the motion's (fix after
  review). A ministry team chooses the length together, as it chooses the day ("yes, they should be able to choose length"); the
  Sabbath deck announces both. An idea that is made and handed out is timed by its own milestones; a club that runs by term, by "the first term". No church calendar in Terrain; the slides say what to check ("communion Sabbath, Week of Prayer, camp meeting, holidays,
  school breaks"). A clash is shown only when Terrain knows it, never invented. "I already know the dates" keeps the dates.
- **The survey chooses, Make the Case wins support** (his approval, v10.42 section F): the survey's list is for our community;
  step 2 opens with the plan, then more ideas for the group; a card is never shown twice.
- **Three kinds of ministry, everywhere** (his request, v10.43: "separate the things that are weekly or monthly — ongoing ministry —
  and events"): ongoing · a series · one-day events, a label on every card and a filter in the survey, the library and step 2;
  timing follows the kind; ongoing ideas say exactly what they said in v10.42. A filter never shows a card that runs another way, the
  chosen one included ("there's a detach somewhere", 2 Oct 2026): it is named in one line above the list, its kind coloured.
- **The idea's own day and time come first** (2 Oct 2026): the timing never silently contradicts a day or time the idea names; Sabbath
  hours only for ideas that fit, and when one names them and does not fit, the documents say so and he decides ("always lets the
  pastor decide for his church").
- **Every outreach event and series has a follow-up plan; counts only** (his request, v10.43: "after one day there needs to be some
  kind of follow-up"): the next step (an ongoing ministry), a thank-you in 48 hours, an invitation in two weeks only to those who
  asked about what comes next (the consent is "about what I ticked"), a visit only if asked; the After slide, the handout, the
  Proposal and the motion say it; shared things carry two numbers (connected, took the next step), never a name. Ongoing, in-reach,
  made-and-handed-out ideas and the 68 + 6 "no names" ideas get none; his Planner series gets the plan and no card.
- **Connection cards: adults only, nothing kept on the phone, contact only for what was ticked, messages from his own phone**
  (v10.43, "it should host the connection cards tailored to the situations"): nothing required beyond a first name; under 18:
  nothing sent or kept; never children's names; no raffles or "enter to win" on a card; Terrain sends no email or text.
- **One look per kind of occasion** (his words: "beautiful and attractive, designed well, not just plain text"): nine looks, each
  a Terrain colour family and a drawn motif; the same card on the phone and on paper; good in black and white. The neighbour's
  phone page follows the phone's own light or dark setting (the app itself stays dark).
- **A printed card is readable and balanced** (review of v10.43: "a bilingual layout option that stays balanced"): never under 7.5 pt
  (choices 9 pt); one language a side, at the same size and ink; a card too full for one side goes two-sided, never smaller.
- **The neighbour's page asks no other website** (DESIGN S22): no web fonts, scripts or images from elsewhere on `#connect=`.
- **Clear next steps** (his request, v10.43 §5): "What's next" at the very bottom of the survey (Make the case for each ministry in
  the plan, a connection card for events and series, Gifts first beside it) and "Your path" on the hub; the gifts never block
  making the case. The path's next step breathes gently: one more exception to "nothing animates on its own" (reduced motion
  stops it).
- **The Sabbath guideline** (the pastor, 1 Oct 2026, `tools/ideas-src/SABBATH-GUIDELINE.md`): "we are not legalistic". Mercy, healing,
  feeding, teaching, worship, visiting and hospitality fit even with real work. Commerce, fundraising events, fairs with games,
  entertainment, sport and routine work go to another day, which a card says as "Best on another day", never as a ban. Free drawings
  and giveaways are fine; a sold raffle is out on every day. (2 Oct 2026) A special offering taken during Sabbath worship for a church
  project is fine (it is part of worship); sales, fundraising events and selling tickets stay off the Sabbath; tithe is never used for
  projects; work days for a purchase are never on the Sabbath.
- **A project or purchase is argued like a ministry** (v10.44): from his goal, with his own counts, three options with where each price
  came from, how we'll pay (never tithe), who decides in his church, and the motion; numbers on a slide only when they bear on the ask.
  Find prices only on his tap, on an unlocked device; Terrain sends nothing to a company (the quote letter is his to send).
- **The Spirit of Prophecy on the deciding bodies' decks** (v10.44 review; his "biblical foundation and the Spirit of Prophecy"): one
  verified Ellen White line a deck, at its close, never beside a verse; Scripture first everywhere (on the Proposal her words give way to
  her reference before a verse's words do).
- **The Church Manual said as it says** (v10.44 review, 2025 p. 153): counsel with the conference officers for any debt; the conference
  and union committees approve buying or building church property; a conference's own review amount is its rule, never the Church
  Manual's. A page number in a Spanish document says which edition it is from.
- **Learn from other conferences, never a league table** (his accepted defaults, v10.44): shares of the past 12 months only, rows in his
  own order, thin calendars marked ◌ and left out of "typical", joining figures per 1,000 with the caution always visible, the year
  ahead for planning and never scored; checked monthly by pull request and said so ("updated monthly"), never "live".
- **Many ideas, creative and specific** (his request, v10.40): a search for a topic shows 50+ ideas, never a thin list.
  Ideas go where people are (not the church porch), use social media as a neighbour, never ask for or pray about
  people's children by name, and are data in `tools/ideas-src`, not code.
- **The Community Survey asks nothing** (v10.45, his words: "no more filling in on community survey"). It shows what the neighborhood
  needs, first, above THE BRIEF; the church's numbers live on the Spiritual Gifts landing ("Your church").
- **Lift = the library's tier** (a built-in's `bandOf(load)`), Light · Moderate · Heavy, one rule everywhere (`nsLift`). An idea sheet
  says what the idea needs from our church in general words, with no capacity check: "if we don't have it, then we don't have it."
- **One page, always,** for an idea's PDF (`nsPdfFit` steps the type down, then shows the verse as a reference only).
- **The hand-off:** "Create a proposal for this ministry" is the sheet's only primary button; it lands on the chosen idea in Make the Case
  (path "A ministry"), and "← Back to the need" returns. Make the Case is otherwise unchanged.
- **`RULES` is frozen** until the Make the Case phase: the survey's words and its nine new needs live in `RULES_SAY` / `RULES_MORE`.

---

## Open work, prioritised

0000. **v10.45.0 is built** (5 Oct 2026; `~/Downloads/Terrain-work/v63/build`, record `v63/build-work/`). Before any upload: his look at
   `~/Downloads/Terrain-v10.45-samples/` (README.txt there). Then, the next phase, in order:
   - **Make the Case, lift and money:** choosing Light / Moderate / Heavy there (the mockup's toast, Q9); the 43 built-ins the needs do
     not show still carry the planning allowance in Make the Case (a sheet would say "Cost varies"): price them at their source too;
     then delete the survey's old list code (`uMinistriesHTML`, `uCardsHTML`, `uRow`… and their suites, decision 6).
   - Make the Case names the three language built-ins (small group, prophecy seminar, literature) in their general words; the survey's
     sheet names them in the need's language (`NS_BUILTIN_LANG`): carry that over when Make the Case is reworked.
   - Make the Case's slides still say "church profile" in a few places (their words are held by the golden file): "Your church" there too.
   - **Spiritual Gifts, "Your church":** the profile's own redesign (moved as is in v10.45).
   - Fold `RULES_MORE` / `RULES_SAY` into `RULES` (with Make the Case's words and goldens moving together).
   - The library's remaining township / borough sweep (Q6: 90 ideas, none reached by a need; the validator lists them as REVIEW).
   - `GF_NEEDS` `LN`'s "another European language" (the survey now says "another Indo-European language", `NS_LANG`).

000. **v10.44.0 is integrated** (2 Oct 2026; record `~/Downloads/Terrain-work/v56/INTEGRATION.md`). Before any upload: his look at
   `~/Downloads/Terrain-v10.44-samples/` (README.txt there). One release, one pull request: the page, `conferences/`, `ideas/` and the
   three functions together (advise.mjs advise-2.4, advise-prices.mjs, prices-sweep.mjs); verify the badge **v10.44.0**,
   `/.netlify/functions/advise` → `"fn":"advise-2.4"`, `https://pastorshub.org/conferences/index.json` → `"v":"0c46f5b3c1db"`,
   `https://pastorshub.org/ideas/index.json` → `"hash":"f7b32cd68d45"`. Find prices needs `ANTHROPIC_API_KEY` and `TERRAIN_AI_PASS`
   (optional: `PRICES_DAY_MAX`, `PRICES_MODEL`, `PRICES_EFFORT`). Still open:
   - **His 15 questions on purchases** (`~/Downloads/Terrain-work/v56/design/DESIGN-PURCHASE.md` §13): the Church Manual edition (this path cites 2025, the
     ministry path 2022), the business-meeting amount, the Spanish *Patriarcas y Profetas* edition, the model and limits (Opus 5.5 at low
     effort, about $0.15–$0.50 a search estimated, worst day about $20 at the default limits), the refusal fallback (off), the sample's
     store names ("Store B (sample)" also in Spanish), the whole church's tone, fundraising events under "something else", grants, the
     hub tile's line, the three-quotes rule, naming CCLI, blocked sites, the 15-passenger van rule, the rollout to every conference.
     The Spanish Proposals (now all four bodies) and the English one past level 1 stay on one page by showing the verses or Ellen White's
     line as references only (one page, or two with the words?). Answered by the review's defaults, his to change: the hub tile's line
     (Q10's), events under "something else" (kept, off the Sabbath, with the safeguard), the van rule (reworded to NAD working policy).
   - **Review (2 Oct 2026), his to decide** (`~/Downloads/Terrain-work/v56/FIXES.md`): (a) the Ellen White line on the deciding bodies'
     decks changes the agreed §4.2 (keep, move, or take out: `buyEgwFor`); (b) **two Spanish verses** (finding 24): Bible Gateway's RVA
     and Wikisource print "Empero hagáse todo decentemente…" (1 Cor 14:40) and "pondré en ella, mi voluntad" (Hag 1:8); eBible.org's
     spaRV1909 and Blue Letter Bible's RVR09 print "hágase" and "en ella mi voluntad" ("hagáse" is a misplaced accent). Which text is the
     authority? (unchanged: the app, `scripture-bg.json`, `case-quotes.json` and the comment at `GF_DEEP_ES` still follow Bible Gateway);
     (c) which Spanish Church Manual edition (IADPA's or ACES', whose pages are 174, 107, 106, 180, 181), and the ministry path's 2022
     citations; (d) the church profile panel ("Your church’s working capacity", Clear all's note) is English in Spanish (pre-existing).
   - **Find prices has never run against the real service** (every test stubs it): watch the first real searches on his unlocked device
     (time, tokens, searches, how many options survive the link rules; each job record keeps them). The tool versions asked are
     `web_search_20260318` / `web_fetch_20260318`, with one retry on `_20260209` if the API refuses them.
   - **The comparison's data files are public by address** (like `ideas/`): the page is for registered pastors, the JSON is not
     (everything in it is from public pages). Gating the files would need a function that checks the registration token.
   - **The monthly refresh** of the calendars still needs someone to read them and update `tools/conferences/src` (the rebuild is one
     command; README there); "Some calendars may have changed" after 45 days (the design said 120). Prepare now / Start now are judged
     against the device's day. Spanish: the registry's evangelism-help wording and the grade notes stay English, marked "(en inglés)".
     Pennsylvania's suggested set is the v52 data's (Ohio, Arkansas-Louisiana, Nevada-Utah, Central California).
   - **Not built:** "See all events" for one conference; copying an example event into a plan; a "Send an update" flow; the Evangelism
     Planner's next work (his "later").
   - **The Sabbath:** "Back-to-school clothing cards" keeps "best on another day" (gift cards); the college choir's and the Thanksgiving
     service's offerings were reworded away by v51b before the 2 Oct line (a gift to the school, food for the pantry): he may want the
     offering back. The library still lists "offerings for a project" in the guideline's own "does not fit" list beside his 2 Oct line
     (his document: the 2 Oct line governs). The guideline's 2 Oct line on Bible board games is built by the separate v57 fix
     (`~/Downloads/Terrain-work/v57/`, "there's a detach somewhere"), which is **not** in this release: merge it next.
   - **Real phones and the light theme** were not checked (headless Chrome only), nor printing the comparison.
00. **v10.43.0 is integrated and the review's 20 findings are fixed** (1 Oct 2026; records `~/Downloads/Terrain-work/v53/INTEGRATION.md`,
   `v53/FIXES.md`). Before any upload: his look at
   `~/Downloads/Terrain-v10.43-samples/` (README.txt there). Then deploy the page and the two new functions together; verify the
   badge **v10.43.0**, `/.netlify/functions/connect` → `"fn":"connect-1.0"`, and `https://pastorshub.org/ideas/index.json` →
   `"hash":"13dfaf05d4e1"`. Still open:
   - **Fonts for the card (paper and phone): done 1 Oct 2026** with his OK (`fonts/`: Cormorant Garamond SemiBold Italic v4.002 from
     the Cormorant project, Space Grotesk SemiBold 2.000 from Google Fonts' download of the family, OFL.txt; records in
     `~/Downloads/Terrain-work/v55/`). The samples' cards, phone pictures and card sheet were made again with them. Still to do:
     `fonts/` in PR #2's copy command (below).
   - **After the review (his to decide):** the two new icons (prayer: hands together; the next step: a signpost); the Christmas toy
     store keeps "For parents and guardians." (its name says "for parents"); the printed link is not grouped for reading (it would
     change the link's form); a one-day event's capacity row still says "Hours in the first month"; the samples' church has more
     helpers than the test fixture's (30 volunteers: so its plan can be staffed), and its 4-night series' next step is saved as his
     pick (with more helpers the staffable-first rule would suggest the walk-and-talk study: the kitchen-table study shares the hall).
   - **Real phones** (not possible here): scan a printed QR from paper on an iPhone and an Android phone; `sms:` with a body; the
     abuse card's exit on iOS Safari (Back must not return); `tel:` / `mailto:`; the form outdoors on a weak signal; one card
     printed at home in black and white.
   - **His choices:** Q1 (the server keeps a taken answer 30 days, the recommendation, or a year: `TAKEN_KEEP_DAYS` and one line
     of the privacy note); screening results on by default only for the health expo and the blood-pressure clinic; a second
     device for the list (the key stays on the device that made the card); step ③ of "Your path" done once a decision is
     recorded, step ② at half the adults; "Planifique una serie de evangelismo" (not "evangelización"); the hub tile's "Build a
     proposal →" and the plan's "Proposal" button were left as they are; a brand-new pastor sees no "Your path" (a one-line
     change in `hubPath()`); the neighbour's page follows the phone's light/dark setting. His newer word on drawings (1 Oct 2026,
     `Terrain-design-notes/SABBATH-GUIDELINE.md`: "a connection card may offer a free drawing") is not built: cards still have
     no drawing; the idea validator already allows free drawings (a change made beside this build and kept by the merge).
   - **The index** `ideas/index.json` is 920,093 bytes: 1,507 under the test's 900 KB limit. The next library batch needs the
     limit raised or a column trimmed.
   - **The church Backup button** is drawn only into `#churchbar`, which nothing creates (older than v10.43); the D15 line is wired
     to it and is also the last line of the card sheet's privacy note.
   - **Older Spanish slides past the frame (unconfirmed):** the first integration run reported about 730 Spanish slides of v10.42.1
     itself past 360 × 640 at the smallest type (team "I'm in" 2 px, "Here in" 7–24 px, three whole-church closes 11 px, two
     conference motions 17–21 px); its harness was lost, and the v53 re-run (seed-after, events and series, an ongoing sample) found
     none. Re-measure every ongoing deck × 34 groups with `v53/gates/slides.mjs` before a fit pass (ongoing decks must stay
     byte-identical: a fit pass needs a new golden).
   - **Deploy (PR #2's `netlify.toml`):** `fonts/` must join `index.html` and `ideas/` in the build's copy command (`cp -R fonts site/`).
   - A library idea saved before v10.43 has no `cad` / `nx` / `nocard` of its own: its cadence is guessed until the index loads.
   - With the survey in Spanish, "Show", "Within reach" and "Area of ministry" around the new filter are still English (as before).
   - The fixture generator `build-fixture.mjs` lived in the build session's scratchpad and was **lost** in the 1 Oct restart:
     `tests/average-church/seed-followup.json` is now the only copy (do not edit it by hand; `v43-average-church` checks its story:
     the ticks agree with the timeline, adults only, every name "(sample)").
   - The samples' black-and-white cards are the same PDF drawn with every colour turned to its grey (as a home printer prints it);
     one real home print is still to do.
0. **v10.42 part 3 is integrated and the review's 25 findings are fixed** (B1 the focus, B2 phones / decisions / Gifts first, B3
   section F; 30 Sep 2026; gates passed, see Current state and "fixes after review"). Waiting on the pastor: his look at the
   regenerated `~/Downloads/Terrain-v10.42-samples/` (README.txt there). Things he may want to decide: in the build session's
   `v44/INTEGRATION.md` (Saturday wording in three built-ins, coffee in some built-ins, the Spanish survey list's English lines)
   and `v44/FIXES.md` (the six holidays, US only; "the first term" as 13 weeks; the pantry's food cost left to the coordinator;
   which idea names count as "made"). His answer on the length (a team chooses it) is built (`v44/FIX-LENGTH.md`); still open
   from it: an idea with no room (prayer walking) has no days' line under the Proposal's WHEN, for any body (older: `caseF`
   leaves the line out without a room).

1. **Commit v10.42.0** (v10.41.1 is live). Changed since v10.41.1: `index.html`, `netlify/functions/present.mjs`
   (present-1.4), `netlify/functions/present-sweep.mjs` (present-sweep-1.1), `netlify/functions/gifts.mjs` (gifts-1.3), `FIREBASE-SETUP.md`, `FIREBASE-RULES-TERRAIN.txt` (words only; the rules to paste are unchanged, nothing to
   republish in Firebase), `CLAUDE.md`, and `tests/` (fifteen new suites, with `v42-fixes`, and `tests/average-church/`, `run-all.js` with
   `REQUIRE_V42=1`, and the suites each part updated); `ideas/` and `tools/` are unchanged.
   Deploy the page and the functions together (a v10.42 page against an older present.mjs still presents, but phones swipe and
   no handout is uploaded; phones then make their copy from the slides). Then confirm the badge **v10.42.0**,
   `/.netlify/functions/present` → `"fn":"present-1.4"`, `"live":true`, `"fb":"ok"`, and `/.netlify/functions/gifts` →
   `gifts-1.3`. On his phone and a second phone: Present live (the setup shows "On phones": "Phones follow your slides until you
   end."); the second phone cannot be swiped and says "Following the presenter"; the Link sheet says "Handout on phones: ready
   (N KB)"; on "I'm in" the second phone taps Pray and stops while he moves on: it shows "Back to live"; at the last slide the
   phone offers "Download the handout (PDF)" (a board deck also "Download the proposal to vote on (PDF)"); Exit asks "End the
   presentation" or "Leave it running"; End lets it look through. Record a decision from the strip's Decision button: the
   phone's slides and PDF say it. The hub's Gifts first card and "Invite the whole church"; the Sabbath slides' "Take it now"
   opens the assessment on the phone. After the fixes: leave a presentation running for over 30 minutes, then open its link
   on a phone: it is free at once ("The presenter has paused…"); Share link & QR on that deck: phones browse.
   **Check the lock and the download on a real iPhone (Safari) and an Android phone** (not done: headless Chrome only).
   Earlier, for v10.41.1 (live since 29 Sep 2026): `https://pastorshub.org/ideas/index.json` says `"hash":"f2cc1121c190"` and 3,050 ideas. On his phone: Make the
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
15. **v10.42.0 follow-ups (the pastor decides, or a real phone shows).** A link shared ahead in follow mode (Share link &
    QR, then never presented) keeps members on slide 1 ("Waiting for the presenter") until he presents or ends; he can pick
    swipe for such a link. The proposal button stays on a phone once the presenter has reached the last slide, even if he
    steps back. A phone shows the PDF in the presentation's language (a Spanish phone following an English presentation gets
    the English proposal, as its slides are English). A following phone that hears nothing from the stream for 75 s asks the
    server every 3–6 s instead (this assumes Firebase's stream sends a keep-alive well inside 75 s; its REST streaming sends
    keep-alive events, but the interval was not measured here: if they are rarer, following phones poll more, and still
    follow). The lock and the tapped download link are proven in headless Chrome only. A following phone waits on an "I'm
    in" answer for up to a minute after the member last touched it (`TD_HOLD_IDLE_MS`); if members find that too short
    (a slow typist) or too long, that one number changes it.
16. **v10.42 timing follow-ups (the pastor decides).** Which built-ins fit the Sabbath follows SABBATH-GUIDELINE.md (`CASE_SAB_BUILTINS`:
    62 of 103; 27 judgement calls in `Terrain-work/v51b/builtins-sabbath.json` for his yes or no; the library's ideas carry their own). Saturday evening is offered "after sunset" to
    ideas that do not fit the Sabbath. A ministry of the plan clashes only when it has a time of its own (Adjust → Time slot); the
    series' evenings only in the weeks the trial could run (to a full season). "A full season" is not given in weeks. In options mode
    the handout's first steps give way to the timing options, and the handouts run about one level tighter (10 Spanish youth-team
    handouts reach the tightest level: verse references only). The Spanish words ("Santa Cena", "campestre", "choca con") are the
    builder's; he may prefer others.

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
