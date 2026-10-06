# Terrain as a product: Stripe and sign-in setup

**About 45 minutes, done once.** Release v10.54.0 adds accounts and paid plans to Terrain. **Payments stay switched off on the live
site** until you have tried everything with Stripe's test cards and say "turn it on". Until then every pastor keeps the full version,
exactly as today.

You need: your Stripe login (the **Mura Works** account), your Google account (for Firebase), and your Netlify login.

**Never paste a key or a secret into the chat.** Each one goes straight into Netlify (part D). This guide names where each value
goes; it never needs the value itself.

---

## A. Stripe, in test mode

Everything in this part is done in Stripe's **test mode** (newer screens call it a **sandbox**). Test mode uses pretend money: nothing
is charged.

1. Go to **dashboard.stripe.com** and sign in to the **Mura Works** account.
2. Turn on **Test mode** (a switch near the top right; newer screens: open the account menu, then **Sandboxes**, and open or create
   one called `Terrain test`). The page shows an orange "Test mode" or "Sandbox" bar while you are in it.

### The product and its two prices

3. Open **Product catalog**, then **+ Add product**.
4. Name: `Terrain`. Description: `Ministry planning for pastors: the full version.`
5. Under pricing choose **Recurring**. Amount `150.00` USD. Billing period **Yearly**. Click **Add product** (or **Save**).
6. Open the Terrain product. Under **Pricing** click **+ Add another price**: **Recurring**, `15.00` USD, **Monthly**. Save.
7. For each of the two prices, open the **⋯** menu on its row and choose **Copy price ID** (it starts with `price_`). Keep the yearly
   one for `STRIPE_PRICE_YEAR` and the monthly one for `STRIPE_PRICE_MONTH` (part D). You can change the amounts later in Stripe
   without any change to Terrain: Terrain reads the amounts from Stripe.

### The secret key

8. Open **Developers**, then **API keys**.
9. Next to **Secret key** (it starts with `sk_test_`) click **Reveal test key** and copy it. It goes into Netlify as
   `STRIPE_SECRET_KEY` (part D). **Not into the chat.**

### The webhook (how Stripe tells Terrain about a plan)

10. Open **Developers**, then **Webhooks**, then **+ Add endpoint** (newer screens: **+ Add destination**, then **Webhook endpoint**).
11. If it asks for the payload style, choose **Snapshot** (not "Thin").
12. Endpoint URL: `https://pastorshub.org/.netlify/functions/stripe-webhook`
13. Events to send: choose these four, and only these:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
14. Click **Add endpoint** (or **Create destination**).
15. On the endpoint's page, under **Signing secret**, click **Reveal** and copy it (it starts with `whsec_`). It goes into Netlify as
    `STRIPE_WEBHOOK_SECRET` (part D).

### The Customer Portal (where a pastor sees receipts, changes the card, switches or cancels)

16. Open **Settings** (the gear), then **Billing**, then **Customer portal**.
17. Turn on: **Invoice history**, **Update payment methods**, **Cancel subscriptions** (choose **At the end of the billing period**),
    and **Switch plans** (add the Terrain product, both prices).
18. Business information: the name **Mura Works**, and a link to pastorshub.org. Click **Save** (in test mode it may say **Activate
    test link**: click it).

### Emails Stripe sends for you

19. In **Settings**, **Billing**, **Subscriptions and emails**, turn on:
    - **Send emails about upcoming trial endings** (Stripe reminds the pastor before the 14 days end),
    - **Send finalized invoices** (receipts), and
    - **Send emails about expiring cards**.
20. In **Settings**, **Business**, **Public details**: the public business name **Mura Works** (this is what a card statement shows).

## B. Firebase sign-in (the `terrain-live` project you already have)

21. Go to **console.firebase.google.com** and open **terrain-live**.
22. In the left-hand menu open **Security** (older screens: **Build**), then **Authentication**, then **Get started** if it asks.
23. **Sign-in method** tab:
    - Click **Google**, turn on **Enable**, choose your email as the support email, **Save**.
    - Click **Email/Password**, turn on **Email link (passwordless sign-in)** (the first switch, for passwords, can stay off),
      **Save**.
24. **Settings** tab, then **Authorized domains**, then **Add domain**: `pastorshub.org`. (Leave `localhost` and the
    `firebaseapp.com` one as they are.)
25. Click the gear beside **Project Overview**, then **Project settings**, **General** tab.
26. Note the **Project ID** (for example `terrain-live`, or with a few letters after it). It goes into Netlify as
    `FIREBASE_PROJECT_ID`.
27. Under **Your apps**, if there is no web app yet, click the **</>** (Web) button. Nickname: `Terrain page`. Leave **Firebase
    Hosting** unticked. Click **Register app**.
28. Firebase shows a block of code with `apiKey: "…"`. Copy only what is inside the quotes after `apiKey`. It goes into Netlify as
    `FIREBASE_WEB_API_KEY`. (This one is not a secret: every web page that uses Firebase shows it. It still goes into Netlify, not
    the chat.) Click **Continue to console**.

**Do not turn on App Check.**

## C. Who always has the full version

29. Decide which email addresses should always have the full version without paying (yours, and anyone you choose). They go into
    Netlify as `TERRAIN_COMP_EMAILS`, separated by commas. **Tip:** add them *after* your test run in part E, or test with a different
    Google account: an address on this list already has the full version, so it never reaches Stripe's checkout.

## D. Netlify

30. Go to **app.netlify.com**, open the pastorshub.org project, then **Project configuration**, **Environment variables**.
31. Click **Add a variable** for each of these (scope: at least **Functions**):

| Key | Value from |
|---|---|
| `STRIPE_SECRET_KEY` | step 9 (`sk_test_…`) |
| `STRIPE_PRICE_YEAR` | step 7, the yearly price (`price_…`) |
| `STRIPE_PRICE_MONTH` | step 7, the monthly price (`price_…`) |
| `STRIPE_WEBHOOK_SECRET` | step 15 (`whsec_…`) |
| `FIREBASE_PROJECT_ID` | step 26 |
| `FIREBASE_WEB_API_KEY` | step 28 |
| `TERRAIN_COMP_EMAILS` | step 29 (optional; after the test run) |

32. **Do not add `TERRAIN_BILLING`.** Leaving it out is what keeps payments off for everyone.
33. `TERRAIN_REG_SECRET` is already set (it signs registrations; the sign-in uses it too). Leave it as it is.
34. Open **Deploys**, then **Trigger deploy**, then **Deploy project** (new settings reach the server programs on the next deploy).

## E. Try it with a test card

35. Check the server: open `https://pastorshub.org/.netlify/functions/account`. It should say `"fn":"account-1.0"`, `"auth":true`,
    `"billing":"off"`, `"mode":"test"`, `"checkout":true`, and the two prices (`15000` and `1500`: Stripe counts in cents).
36. On your computer open `https://pastorshub.org/?billing=test`. This turns on the paid version **on this device only**, in test mode.
    An **Account** button appears beside Change, and the paid tools say **Full version**.
37. Open **Make the Case**, then **Start your 14-day free trial**, then **Sign in with Google**.
38. The plans appear: Yearly first. Click **Start free trial** on Yearly. Stripe's own page opens.
39. Card `4242 4242 4242 4242`, any future date (for example `12/34`), any three digits, any name and ZIP code. Pay.
40. You come back to Terrain: "Confirming your plan…", then **Welcome to the full version**. The tools open.
41. **Account**, then **Manage billing**: Stripe's page with the plan. Try **Cancel plan**; come back; Account then says the trial ends
    and nothing is charged.
42. Also try **Email me a sign-in link** (sign out first from Account), and open the email on the same computer.
43. In Stripe, **Developers**, **Webhooks**, your endpoint: every delivery should show **200**.
44. When you are done testing on that device, open `https://pastorshub.org/?billing=off` (or Account, **Stop testing**).

## F. Turning it on

Do not switch anything on yourself yet. When the test run is good, tell Claude **"turn it on"**. The next release first makes the server
check the plan where it costs money, makes a cancelled pastor's work readable (not lost), and adds the Terms, Privacy and Refunds pages
for Mura Works. Then the live keys go in (the same steps in Stripe's live mode) and `TERRAIN_BILLING` is set to `on`.
