# Learn from other conferences: the data and its monthly refresh

The hub tile **Learn from other conferences** shows what each US conference's published calendar holds (the past 12 months,
side by side) and **the year ahead** (the next 12 months, for planning). Its data is built here, from files kept in `src/`,
into the served folder `conferences/` at the repo root. Nothing is read live from the web: the page says
**"Checked <date> · updated monthly"**, and the date is `src/config.json`'s `checked`.

```
tools/conferences/
  build.mjs          the one command: src/ → conferences/ (and MATCH-REVIEW.txt)
  year-ahead.mjs     the next 12 months for every conference: five lanes, hints, "not published yet", last year
  profiles.mjs       one comparable profile per conference: shares, typical, strengths, said vs shown, suggestions
  pack.mjs           the served files: conferences/index.json, ahead.json, c/<slug>.json
  resources.mjs      (v10.58.0) conferences/resources.json: "Resources for your church" and "Ministries that come to your church"
  window.mjs         the months, from the check date
  feed.mjs, ics.cjs  Chesapeake's public .ics feed → src/feeds/chesapeake.json (title, start, end, status only)
  MATCH-REVIEW.txt   every stated initiative checked against the calendars (made by build.mjs; read it in the pull request)
  src/               the source data (never served)
    config.json      checked (the day the calendars were re-read) and firstPassTo (the last day events/ covers)
    through.json     how far each conference's own calendar is published, with the reason in English and Spanish
    events/*.json    the first pass: every event of each conference's calendar, each with its source link
    ahead/*.json     the look-ahead: each conference, each union (union-*.json), and above.json (NAD, world church, deadlines)
    feeds/chesapeake.json   Chesapeake's feed for the year ahead (see feed.mjs)
    stats.json       the official Annual Statistical Report figures, 2019–2024, with edition, table and PDF page
    registry/*.json  the conference registry (evangelism help and its sources), by union
    initiatives.json the stated initiatives of conferences and unions, each with where it is stated
    funding.json     (v10.58.0, optional) more grants and free help for the resources box, in initiatives.json's shape (kept apart:
                     the calendars' matching never reads it)
    ministries.json  (v10.58.0, optional) ministries that come to a church: kind, standing (a church entity, an ASI member, or listed
                     by a church body) and where that is shown, the ministry's own site, invite page, email and phone, cost, notes
    missions.json    (v10.63.0, optional) each conference's mission statement as published, its page, and the ministry areas its own
                     words name (missions.mjs checks it; see below)
  missions.mjs       (v10.63.0) reads src/missions.json for the brief and "Mission and calendar"
```

**Mission statements** (v10.63.0, `missions.mjs` → each conference's `mission` in `index.json`, and `missionChecked`): every
conference the comparison serves has a line, `found: true` with the mission copied word for word from its own website (its line breaks
kept; `via: "union"` only when the union's site gives it), or `found: false` with every page checked (the page then says "We could not
find a mission statement on its website", never that it has none). An area (evangelism, pastoral, discipleship, family, youth, clubs,
education, health, gatherings) is listed only with words of the mission that name it, and the build finds those words in the mission or
stops. Checked 9 Oct 2026 (the research and the hand review: `~/Ministry Work/Terrain-work/v80/missions/`, `v81/assemble-missions.mjs`,
which also fetches each page again and finds the statement on it). Missions change seldom: re-check them once a year, or when a
conference's site changes, not with each monthly refresh.

**Resources for your church** (v10.58.0, `resources.mjs`): from `initiatives.json` and `funding.json` the items a local church can use
(funding → money, resource → free, training, and what is current or coming up → now; ended ones left out), each conference's
evangelism help from `registry/*.json` (subsidy, grant, budget line, help in kind: share, cap, deadline, how to ask, up to four
conditions), and `ministries.json`. The page shows his conference's, his union's, the NAD's and the world church's, by kind. Every link
https (an apostrophe written %27), an email an address, a phone dialled as digits (a word number on the keypad; an extension after a
pause): anything else stops the build. A conference or union the comparison does not serve is left out with a line in the report.
Ministries: only organisational contact details printed on the ministry's own pages; never a staff member's own email; notes are
practical (when to book, what the church provides), never a person's name. Re-check the ministries' links when the calendars are
refreshed (a link that no longer opens: mend or drop the entry).

The builders were moved here from the approved sample (`Terrain-work/v52/compare`, 1 Oct 2026) with their logic unchanged;
on the same inputs they make exactly the sample's data.

## The monthly refresh (re-gather → rebuild → pull request)

Once a month, early in the month:

1. **Re-gather.** Re-read the conference calendars and the pages above the conference, and update the files in `src/`:
   - `src/ahead/<slug>.json` for any conference whose calendar has moved forward (and any whose published-to month is less
     than 12 months ahead), the union files `src/ahead/union-*.json`, and `src/ahead/above.json`;
   - `src/events/<slug>.json` when a calendar has changed what it showed for past months;
   - Chesapeake: save its public feed and run `node tools/conferences/feed.mjs <path-to-the-saved.ics>`;
   - `src/through.json`: the new published-to month for each conference that moved, with the reason in both languages;
   - `src/config.json`: `checked` = the day the calendars were re-read (the past 12 months and the year ahead move with it).
     When the look-ahead files begin to cover months the first pass did, move `firstPassTo` to match.
   Every event keeps its source link (https only), and no person's name is ever recorded.
2. **Rebuild.** From the repo root: `node tools/conferences/build.mjs`. It writes `conferences/` and `MATCH-REVIEW.txt`,
   or nothing if a step fails (it names the conference and the reason: a missing `through.json` line, a link that is not
   https, an unknown status or suggestion). Lines starting `CHECK DATES` name a record with two or three meetings and no
   date list: give it its dates (see `DATES_FIX` in `year-ahead.mjs`). `--verbose` prints the builder's report.
3. **Test.** `npm test` (the suite `conferences-data.test.mjs` rebuilds from `src/` and fails if `conferences/` differs by
   one byte; it also checks that `netlify.toml` copies `conferences/` into the site).
4. **Pull request.** One branch, one pull request, titled like `Conference calendars checked <date>`. Say in it which
   conferences changed and anything new in `MATCH-REVIEW.txt`. The tests must pass before merging; the merge publishes.

Only data changes in a refresh, so the page's version stamps do not change. The served files are fetched fresh (the page
asks for them with the data's version, `index.json`'s `v`).

**Once a year**, when the next Annual Statistical Report appears, add its year to `src/stats.json` and move the three
statistics years in `profiles.mjs` (`2022`–`2024`, the "joining per 1,000" window). **In January and July**, re-read the
hand-read calendars (PDF, image and news-based ones), as the design notes say.

## Rules the data follows (the pastor's)

- Comparisons use the past 12 months only; the year ahead is for planning and is never scored or ranked.
- Boards and committees are not ministry events (v10.44 review, 2 Oct 2026): a board of education, a school board, a board meeting or a
  constituency meeting, an audience that is the board itself, or an administration record held for a board, a committee, delegates,
  officers or the office staff is left out of the shares and of "What we could learn" (`profiles.mjs` `boardOrSession`; kept: a
  training, a town hall or a celebration that names a board, and a Pathfinder or Adventurer council weekend). The year ahead already
  left boards out (`year-ahead.mjs` `ADMIN_TITLE`).
- Shares, never a league table; rows keep the pastor's own order; thin calendars are marked and left out of "typical".
- Official joining figures are shown per 1,000 members with the caution beside them, never ranked.
- Terrain does not tell conferences their calendars are thin.
- No "AI" anywhere; English and Spanish on the page; event titles stay as published, except a standalone "IA" (Spanish for "AI"),
  written out where the source makes it plain (`pack.mjs` `WRITE_OUT`: Iowa-Missouri's "IA" is Iowa, Indiana's "IA" Indiana
  Academy). Any other "AI" / "IA" / "artificial intelligence" in a served word **stops the build** and names the file and the words: add
  a line to `WRITE_OUT`, or leave the record out in `src/`. (`conferences-data.test.mjs` scans every served word too.)
- The suggested set's reasons: same union, similar size, "the other side of the country" (East and West only), "another part of the
  country" (a Midwest–South pick: neighbours, not the other side), strong where this calendar is thinnest.
- The page is for registered pastors only (behind the same registration as the rest of Terrain). The files in
  `conferences/` are plain static files, like `ideas/`: anyone who knows their address can fetch them. Everything in them
  comes from public pages.
