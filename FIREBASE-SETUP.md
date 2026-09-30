# Phones follow the presenter: Firebase setup

**About 20 minutes, done once.** When you present a Make the Case slideshow, the phones in the room follow your slides. Terrain keeps the slides themselves in Netlify. Firebase only carries one small fact: which slide you are on.

You need your Google account (the one you use for Firebase), your Netlify login, and the file `FIREBASE-RULES-TERRAIN.txt` (it sits next to this guide, in the Terrain folder).

Until this is done, everything else in Make the Case still works: the slides open on phones from the QR code or the six-letter code, members swipe through them, and "I'm in" answers still reach you. Only the following (phones moving with you) waits for Firebase.

This is a **new, separate** Firebase project. Do not use `voice-preach` or `joshuamura`.

---

## A. Create the project

1. Go to **console.firebase.google.com** and sign in.
2. Click **Create a new Firebase project** (older screens: **Add project**).
3. Project name: type `terrain-live`.
   Underneath, Firebase shows the project ID. If it adds letters (for example `terrain-live-4f2a1`), that is fine. Carry on.
4. If there is a terms box, tick it. Click **Continue**.
5. If it offers **Gemini in Firebase** (AI assistance), you do not need it. Turn it off and click **Continue**.
6. **Google Analytics:** turn off **Enable Google Analytics for this project**. Click **Create project**.
7. When it says the project is ready, click **Continue**.

## B. Create the database

8. In the left-hand menu open **Databases & Storage** (older screens: **Build**), then **Realtime Database**, then **Create Database**.
9. A small window asks two questions. The order can differ; click **Next** between them.
   - Location: **United States (us-central1)**.
   - Security rules: **Start in locked mode**.
10. Click **Enable** (some screens say **Done**).

## C. Paste the rules

11. Click the **Rules** tab.
12. Click inside the editor, press **Cmd+A**, then **Delete**.
13. Copy the block below, from the first `{` to the last `}`, and paste it. (If you can see lines of three back-ticks above and below it, leave those out.) It is the same as part 1 of `FIREBASE-RULES-TERRAIN.txt`.

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "live": {
      "$room": {
        ".read": "$room.length === 22",
        ".write": false
      }
    }
  }
}
```

14. Click **Publish**.

## D. Check the rules in the Rules Playground

15. Still on the **Rules** tab, click **Rules Playground**.
16. Run these six checks. For each one, choose the **Simulation type**, type the **Location**, type the **Data** if there is one, set **Authenticated**, then press **Run**. The result appears in a banner at the top.

| | Simulation type | Location | Data | Authenticated | You want |
|---|---|---|---|---|---|
| a | read | `/live/AAAAAAAAAAAAAAAAAAAAAA` | – | off | **Allowed** |
| b | read | `/live/AAAAAAAAAAAAAAAAAAAAA` | – | off | **Denied** |
| c | read | `/live` | – | off | **Denied** |
| d | read | `/` | – | off | **Denied** |
| e | set | `/live/AAAAAAAAAAAAAAAAAAAAAA/i` | `3` | off | **Denied** |
| f | set | `/live/AAAAAAAAAAAAAAAAAAAAAA/i` | `3` | on: any Provider, UID `test-user` | **Denied** |

Copy the locations from this page; do not count the A's. Check a has 22 A's, and check b has 21.

17. If any result is different: **stop.** Repeat steps 12 to 14, then run the checks again. If it is still different, send Claude a screenshot of that check.

## E. Copy the address and the key

18. Click the **Data** tab. At the top is the database address, for example `https://terrain-live-default-rtdb.firebaseio.com/`.
    Copy it and **remove the `/` at the very end**. This is your **PRESENT_FB_URL**. It should end in `.firebaseio.com`.
    (If it ends in `.firebasedatabase.app` instead, a different location was chosen in step 9. That still works; carry on.)
19. Click the gear icon beside **Project Overview** (top left), then **Project settings**, then the **Service accounts** tab.
20. Under **Legacy credentials**, click **Database secrets**. Point at the row of dots, click **Show**, and copy the secret (about 40 letters and numbers). This is your **PRESENT_FB_SECRET**.
    Firebase labels these secrets "deprecated". Ignore that: they still work, and Slide Preach uses one the same way.

**If there is no Database secrets entry**, use the key file instead (Terrain accepts either; with the key file it asks Google for a short-lived pass each hour, by itself):

- In the same **Service accounts** tab, with **Firebase Admin SDK** selected, click **Generate new private key**, then **Generate key**. A file ending in `.json` downloads.
- Right-click the file, then choose **Open With** and **TextEdit**. Press **Cmd+A**, then **Cmd+C**. That whole text, from `{` to `}`, is your **PRESENT_FB_SECRET**.
- Never move this file into the Terrain folder (that folder goes to GitHub).
- After step 23, delete the file for good: drag it to the Trash, open the Trash, right-click the file and choose **Delete Immediately**. It is a master key.

## F. Put both into Netlify

21. Go to **app.netlify.com** and open the project that serves **pastorshub.org** (the one Terrain deploys to). Click **Project configuration** (older screens: **Site configuration**), then **Environment variables**.
22. Click **Add a variable**, then **Add a single variable**. The address is not a secret, so this one needs no special box:
    - **Key:** `PRESENT_FB_URL`
    - **Scopes:** leave **All scopes** (it must include Functions)
    - **Values:** leave **Same value for all deploy contexts**, and paste the address from step 18
    - Click **Create variable**.
23. Click **Add a variable** → **Add a single variable** again, and first tick **Contains secret values** (if you do not see it, fill this in as in step 22):
    - **Key:** `PRESENT_FB_SECRET`
    - **Scopes:** if it asks you to choose, pick **Specific scopes** and tick **Functions**. Leave **Post processing** off.
    - **Values:** it asks for one value per deploy context. Paste the secret from step 20 (or the whole key file) into **Production**. Leave the others empty; if it insists, paste the same value into them, **except Local development**. Leave that one empty: it is the one place Netlify would show the value in plain view.
    - Click **Create variable**. Netlify will never show this value again. That is normal.

Type both names exactly: capital letters, with underscores.

## G. Redeploy

24. Click **Deploys**, then **Trigger deploy**, then **Deploy project without cache** (if that is not in the list, choose **Clear cache and deploy project**). Wait until it says **Published**.
    If you are about to commit v10.39.0 anyway, skip this step: that commit's deploy picks up the new settings.

## H. Confirm it works

25. Open **pastorshub.org/.netlify/functions/present**. You want to see **present-1.4**, `"live":true` and `"fb":"ok"`. Terrain has just read the database with your key (it checks at most once a minute), so this proves the address and the key are both right.
    - `"fb":"unset"`: Netlify is not passing both settings on, or the address is not a Firebase database address. Check both names letter by letter, check the address from step 18, and check that the scopes include Functions. Then repeat step 24.
    - `"fb":"bad-key"`: Firebase refused the key. Copy it again (steps 19 and 20). In Netlify, click that variable and choose **Edit**, paste the new value, save, and repeat step 24.
    - `"fb":"unreachable"`: Firebase did not answer just then. Wait a minute and reload the page.
    - "Page not found": v10.39.0 is not live yet. Check the version badge.
26. Now a real test (2 minutes). On the laptop, present a Make the Case slideshow. On your phone, scan the QR code. Move a few slides on the laptop. The phone should follow within about a second.
27. While presenting, open Firebase → **Realtime Database** → **Data** tab. You should see `live`, then a room with a 22-character name, and `i` changing as you move the slides.
    If the phone shows the slides but does not follow, and the Data tab stays empty, look at step 25 again: it says which part is wrong.
    **If step 25 keeps saying `"fb":"unset"`** and both names are spelled right: in August 2026 one Netlify user reported that a value marked **Contains secret values** did not reach their function, while the same value without the mark did. As a last resort, delete `PRESENT_FB_SECRET` in Netlify, add it again as in step 22 (no **Contains secret values**, same value for all deploy contexts), and repeat step 24. It is still private: only people on your Netlify team can see it. Tell Claude if you had to do this.

---

## Keep the key safe

- The secret opens all of `terrain-live` and skips the rules. It belongs **only** in Netlify. Never put it in GitHub (the repository is public), an email, a chat message or a screenshot. Do not send it to Claude either.
- **If it leaks:** Firebase → **Project settings** → **Service accounts** → **Database secrets** → **Add secret**. Put the new secret in Netlify, redeploy, then delete the old secret.
- **If you used the key file and it leaks:** delete that key in Google Cloud, under **IAM & Admin** → **Service accounts** → the `firebase-adminsdk` account → **Keys**. Then make a new key (step 20, key-file route) and put it in Netlify.
- **The plan.** The free **Spark** plan allows 100 phones following at once, counted across every room of every church presenting with Terrain at that moment. A phone past that cannot open the live stream: it asks Terrain for the slide instead, a few seconds behind you. Once more than one church may present in the same hour, move `terrain-live` to the **Blaze** plan (the **Upgrade** button beside **Spark** in Firebase's left-hand menu) and set a budget alert of about $5 (Google Cloud → **Billing** → **Budgets & alerts**). At this size it costs cents a month and lifts the limit to 200,000 phones. It needs a payment card on the Google account, so it is your decision; until then stay on Spark with billing off.
- Before anyone changes the rules, read part 3 of `FIREBASE-RULES-TERRAIN.txt` (the cascade warning).

## What was checked for this guide (28 Sep 2026)

- **Confirmed in Firebase's documentation:** the menu **Databases & Storage → Realtime Database** and **Create database**; locked mode and test mode; the us-central1 address ending `.firebaseio.com`; Database secrets under **Service accounts**, marked deprecated (Firebase recommends the key file instead; the secret still works for Slide Preach today); **Rules Playground** on the Rules tab; the project steps (name, terms, optional Gemini, optional Analytics, **Create project**).
- **Confirmed in Firebase's rules reference:** room names in the rules are always text, text has a length, and `===` is allowed, so `$room.length === 22` is valid.
- **Confirmed in Netlify's documentation:** **Project configuration → Environment variables**; **Add a variable**; **Contains secret values**; scopes; **Same value for all deploy contexts**; **Create variable**; that changes need a new deploy; **Trigger deploy**. Also: a secret value must be set per deploy context, cannot use **Post processing**, and cannot be read back once saved; a value in **Local development** is never hidden.
- **Checked in Terrain's own tests** (`tests/present-function.test.mjs`, with a stand-in for Firebase and Google): the status check and its four answers; that the key goes only to the database address (and, for the key file, a signed request only to Google's token address), never to any other address and never after a redirect; that no answer and no log line ever holds the key.
- **Not confirmed**, because no live console was available:
  - the order of the two questions in the Create Database window, and whether its last button says **Enable** or **Done** (Firebase's own instructions say **Done**);
  - the exact button text on the Firebase project screens;
  - the **Show** link beside the secret;
  - the Playground field names and banner wording;
  - the exact layout of the Netlify form once **Contains secret values** is ticked;
  - the exact names in the **Trigger deploy** menu;
  - whether a brand-new project still offers Database secrets;
  - the **Upgrade** button and the **Budgets & alerts** path for the Blaze plan.

  If any label differs, look for the nearest match. The key-file route covers a missing secrets tab.
