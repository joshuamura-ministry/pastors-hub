# Terrain: how a full audit is done

The pastor (8 Oct 2026): *"can you do a full audit? Make sure everything is solid and symmetrical and everything is in its right
place"*, then *"Give me the steps … every detail of what you focus on when you audit"*. This is the checklist the v10.61.0 audit
followed. The next audit follows it too, and adds anything he has asked for since.

## 1. Set up

- Run the working copy on this Mac, never the live site. Nothing real is read or changed.
- Fill it with the made-up average church (Sampleton SDA (SAMPLE), `tests/average-church/`) and the test neighborhood, so every
  screen has something on it: the needs, the church, Spiritual Gifts results, a plan, two churches to compare.
- Open every screen of every tool: the main menu; the Community Survey (each section, an opened need, an idea's sheet, "Your
  church" steps 1–3 and At a glance); Spiritual Gifts (main page, a member's report); Make the Case (a ministry, a group chosen,
  an idea chosen, a project or purchase, the Proposal); the Evangelism Planner; Learn from other conferences; Compare your
  churches with Digital footprint.
- Each screen at three widths: computer (1366), tablet (820) and phone (390). Computer and phone again in Spanish.

## 2. Measured by script, on every screen

The script (`Terrain-work/v78/audit-measure.js`) measures the page in Chrome. It does not guess from the code.

1. The page wider than the screen (it scrolls sideways).
2. Anything past the left or right edge.
3. Boxes side by side in one row whose heights differ by more than 4 pixels.
4. A box left alone on the last row of a grid when the rows above hold two or more.
5. Input boxes in one row that do not line up (a longer label pushes its box lower).
6. Button words that wrap onto two lines, counted from the lines the browser actually draws.
7. A field's label that takes two lines beside labels that take one.
8. Text cut off by its box with no "…".
9. Page errors (anything the browser reports as broken).

## 3. Read by eye, every screen top to bottom

Pictures of each screen, scrolled from top to bottom, read by four reviewers who look for:

- **Symmetry:** the same height for cards in a row, the same edges and spacing, cards that balance (never one alone), circles and
  charts the same size, numbers lined up.
- **Alignment:** headings, keys and switches lined up with what is under them.
- **One line:** a label, button or heading that fits on one line stays on one line, in English and in Spanish.
- **Words:** plain and short; nothing that sounds wrong (as "against" did); American spelling; one and many ("1 more", "1 point");
  Spanish as good as the English; nothing written as a placeholder.
- **One name per thing:** the same figure, place or button called the same everywhere.
- **No redundancy:** no two buttons doing the same job; no title shown twice; no figures repeated beside each other.
- **The right place:** each thing where he would look for it, in the step it belongs to; nothing from another tool showing
  through.
- **Charts:** every number readable, no line crossing a number, no label cut off, dates never broken over two lines.
- **Missing data shown honestly:** "—" for a figure that is missing (never 0); "Not filled in yet" said once, not on every row.
- **Separators:** a "·" never left alone at the end of a line.
- **Colors:** each kind of figure keeps its color everywhere; each lift its color; the sections' colors as agreed.

## 4. Solid: does it work

- Every button does what it says, and every way into a tool works: from the main menu, and from a button inside another tool.
  (This is how the v10.61.0 bug was found: Spiritual Gifts stayed on screen above a tool opened from inside it.)
- Switching churches, languages and tools leaves nothing behind from the one before.
- Figures add up; a missing figure is never shown as zero; a sample is always marked as a sample.

## 5. Fix, then prove it

- Each fix gets a test written first. It must fail on the build before the fix and pass after.
- The whole test suite runs before anything goes up (165 test files and about 10,900 checks at v10.61.0); none may fail.
- Pictures after the fix, at the same widths and in both languages, to show it is right on screen.

## 6. Report

- What was found and fixed, in plain words.
- What was found but left for him to decide, with a recommendation for each.
- What the audit cannot see (below).

## What it does not cover

- Real phones: Chrome sets itself to a phone's size, but it is not an iPhone or an Android phone. Some things (the slides
  following the presenter, saving a PDF on the phone) need a real phone to be sure.
- Printing, and printed cards scanned from paper.
- Every possible address: the audit uses one test neighborhood (other addresses have been checked in earlier releases).
- Speed on a slow connection, and the live services (the Census, Google, Stripe), which tests stand in for.
