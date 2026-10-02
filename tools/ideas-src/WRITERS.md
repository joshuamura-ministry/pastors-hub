# Writing for the Terrain Idea Library

You are writing one theme: `themes/<themeId>.json`, at least 50 ideas in English and Spanish, for small and
medium Seventh-day Adventist churches in the United States. Read `themes.json` for your theme's scope, the list of
what belongs to a neighboring theme instead (`not`), and its related census tags. Read `SCHEMA.md` for the fields.
Finish when `node validate.mjs themes/<themeId>.json` prints `OK themes/<themeId>.json <n> ideas`, and after you
have re-read every REVIEW line.

**Every idea is for God's people, for the community, or for both** (the `reach` field). Read **IN-REACH AND OUTREACH**
below before you start.

**Writing one of the seven themes for the church family?** (`member-care`, `spiritual-care`, `deacons`,
`stewardship`, `involvement`, `sabbath-school`, `fellowship`.) Read **INSIDE THE CHURCH** at the end of this file first.
It says what changes for ideas that serve the church family itself.

**Writing one of the eight Adventist department themes?** (`worship-music`, `childrens-ministries`, `pathfinders`,
`adventurers`, `ay-youth`, `interests`, `religious-liberty`, `global-mission`.) Read **INSIDE THE CHURCH** and then
**ADVENTIST DEPARTMENTS**. Every Adventist name you use must come from the checked facts there, or be checked on an
official Adventist site first.

## Why this exists, in the pastor's words

Pastor Joshua Mura leads a two-church district in Pennsylvania. He said:

> "There aren't enough ministry ideas. I put Prayer and only three came up. We really need a lot more creative ways
> — creative, creative, creative, out of the box. If I say Prayer there should be 50 different things for prayer that
> a church can do. If it's feeding the homeless, you've got to have so many different amazing and unique and new ideas."

## The quality bar

**Creative and specific, not generic.** "Hold a prayer meeting" is not an idea. Neither is waiting at the church
for people to come by, because most churches sit where nobody walks past. These two examples show the bar:

- *Prayer cards on every door within a mile.* Members walk the streets around the church in pairs one afternoon a
  month. They pray quietly for each home as they pass and leave a card in the door: "We prayed for your home today.
  If there is something you would like us to pray about, text us or scan here; it stays private." No knocking,
  nothing asked.
- *Prayer ads.* A $5-a-day Facebook and Instagram ad is shown only to people within three miles of the church:
  "Carrying something heavy? Send us a prayer request. Private, no strings." A named prayer team replies within
  24 hours.

What makes these good: a concrete action, a concrete way neighbors come across it, a real price, and a named
person who answers. Anyone could start one on Monday.

The rules:
- **At least 60% of your ideas should be things most churches have not tried.** A familiar staple (a pantry, a
  health fair, VBS) may appear only with a real twist in *how it reaches people or how it runs*, and never repeat
  one of the 97 built-in ministries (their names are in `vocab.json`; the validator rejects exact copies).
- **Every idea differs in mechanism, not just in wording.** "Prayer walk at the park" and "Prayer walk at the
  school" are one idea. Change the *channel* (door card, ad, text line, market table, mailed postcard, video,
  library display, business counter, event already happening), the *exchange* (we give, we lend, we teach, we
  thank, we ask one question, we pray, we eat together), the *rhythm* (once, seasonal, monthly, standing offer) or
  the *people* (who serves, who is served). The validator rejects near-identical names (normalized-token Jaccard
  above 0.6), but only you can catch a re-skin.
- **Doable by a small-to-medium Adventist church:** 20 to 150 members, few paid staff, a modest budget. Tier 3 may
  be ambitious, but it must still be something such a church could fund or partner for.
- **Neighbors are neighbors, never targets.** Serve without strings, and invite without pressure. Say "neighbors",
  "families", "guests". Never say targets, prospects, "the unchurched", "the lost" or "the needy".
- **Adventist-natural where it fits, and welcoming to people of no faith.** That means the health message
  (NEWSTART, the eight natural remedies, plant-based cooking), Sabbath rest, Pathfinders and Adventurers, Adventist
  Community Services, Dorcas, Steps to Christ, vegetarian food, and the Sabbath School class. A neighbor who has
  never prayed should still find the idea kind and useful.
- **Safe:** screened adults for anything with minors, food safety rules, and professionals for counselling, abuse,
  addiction and medical care. **Legal:** permissions for public places, nothing in mailboxes (only stamped mail
  goes there), ad rules, texting consent. **Dignified:** no photos of the poor for publicity, no queues that shame,
  no proof of need where none is required. **Sustainable:** a real owner and rhythm, and an honest cost.
- **Plain words.** Short sentences. Numbers, not adjectives.
- **Varied:** settings (`where`), ages, seasons, sizes (tiers), kinds (serve/equip/belong/invite), weekday and
  Sabbath, rural, suburban and city.

## Go where people are

In his words first. He said:

> "The ideas have to be more creative. Sitting at the porch of your church at a place where nobody walks by is not a
> great idea… maybe creating a prayer card and walking around the church neighborhood, or prayer walking, or Facebook
> ads for prayer… make sure we use social media and things like that too."

- **Every idea says, in its description or steps, how neighbors will actually come across it.** It must work for a
  church on a road with no foot traffic. Picture a car-dependent suburb like Warminster, PA: people drive past,
  shop at big stores, sit in pickup lines, spend evenings on their phones.
- Take the church out:
  - To the **streets** (walking, praying).
  - To **homes**, with a card and not a knock, unless someone invited you.
  - To **public places people already use**, with the owner's or town's permission: farmers' markets,
    laundromats, libraries, train stations, parks, community events, local businesses.
  - **Online.**
- An idea that only waits at the church building for people to arrive is not acceptable, unless the building is
  already where people come: a pantry day people know about, or a class they signed up for through an ad, a
  library flyer or a partner. Even then, say how they found out.
- **At least 12 ideas in every theme must have a real digital or social-media part** (35 in Media & online), and
  **at least 3 must combine printed cards or walking with a digital follow-up** (a card with a QR code or text
  number, a walk followed by a Nextdoor post, a mailed postcard that points to a Facebook Live). The validator
  counts both.

### Social media and digital tools: practical know-how

Use these as a practitioner would, with real budgets and real settings.

- **Facebook and Instagram ads** (Meta Business Suite): set a location radius around the church, or a ZIP code, and
  a budget. $5 to $10 a day is about $150 to $300 a month; $3 a day works for a small test. Meta no longer lets
  anyone target by religion or interests like "prayer", so location and age are what you have.
  - **Ads about jobs, housing, or credit and loans** must use a Special Ad Category. That means no age or ZIP
    narrowing and at least a 15-mile radius, so write "shown across the county".
  - **Meta rejects ad copy that says or implies the viewer has a condition** ("Are you depressed?", "Behind on
    rent?"). Talk about the offer instead: "Free stress-and-sleep evenings at the library, Thursdays in March."
  - Always put the church's real name on the ad.
- **Facebook community groups and Nextdoor:** post *as a neighbor*, and follow each group's and the platform's
  rules (many groups want admin approval for events). Share useful things: a free class, a coat swap, a "we can
  help" offer. Never preach in the feed. On Nextdoor, members post in their own neighborhoods.
- **Google Business Profile:** free. Keep hours, photos and the "what to expect" description current. Post each
  event and offer as an update, and thank people who leave reviews. Many neighbors find a church here first.
  Features change, so check what the profile offers today.
- **Short video** (Instagram and Facebook Reels, YouTube Shorts, TikTok): vertical, 15 to 60 seconds, captions
  burned in (most people watch muted), one idea per video, posted on a steady rhythm. Phone footage is fine.
- **Livestreams** (Facebook Live, YouTube Live): short and regular beats long and rare. Get consent from anyone on
  camera. Never show children without written parental consent.
- **WhatsApp:** a Channel for one-way updates, and a Community or group for two-way talk. Opt-in only; the
  Spanish-speaking community often prefers WhatsApp to Facebook.
- **A text line:** a free Google Voice number is enough for replies by hand. Services that send to many people
  cost about $25 to $50 a month and handle carrier registration. Text only people who texted first or opted in,
  and honor STOP.
- **QR codes on printed cards:** make a *static* code (free, for example in Canva) that points to a link you
  control. Free "dynamic QR" trials expire and break every printed card. Link to a short private form (Google Forms
  works): ask only what you need, make name and phone optional, limit who can see answers, and delete old requests
  on a schedule.
- **Printed cards and mail:** 500 business cards cost about $20 to $60; 500 door hangers about $60 to $100.
  USPS Every Door Direct Mail (EDDM) reaches every home on chosen carrier routes with no mailing list. It needs
  large postcards; postage is about 25 to 30 cents each, plus printing. **Nothing goes in mailboxes except stamped
  mail**: cards go in the door or on the handle.
- **Email newsletters:** a free tier of Mailchimp or MailerLite, with double opt-in and a monthly rhythm.
- **Podcasts:** free hosting (for example Spotify for Creators). Ten to twenty minutes, one guest, on a regular
  schedule.
- **Free design:** Canva, for cards, posters, social images and video captions.
- **Always:** handle requests privately, and never publish one without consent. Ads are honest. No dark patterns:
  no fake urgency, no auto-enrolment, and unsubscribing is easy.

## Children and young people: care, and how it looks

In his words first. He said:

> "With the kids and stuff we have to be careful not to be asking for praying for kids. It just sounds a little bit weird."

- **Never ask strangers, or parents who do not know the church, for children's names, photos, schools, ages or
  prayer requests about their children.**
- **No ideas stationed at school gates, bus stops for students, playgrounds or youth hang-outs** aimed at children
  or their parents.
- **Never approach children directly** outside a church-run programme their parents chose.
- **No lists, cards, boxes or online forms that collect children's names or details.**
- **Anything with children goes through their parents or guardians,** or through a school or organization that
  invites the church, with permission.
- **Church-run programmes use screened adults**: background checks and child-protection training through your
  conference's program (in the North American Division this is Adventist Screening Verification, through Sterling
  Volunteers, renewed every three years; it replaced Shield the Vulnerable. State law may add more, for example
  Pennsylvania's clearances for volunteers who work with children), **the two-adult rule**, and parental consent.
- The church may **pray for its local schools, teachers and students in general terms, among its own members**. It
  prays for a particular child only when a parent in a real relationship asks.
- **Serve families by meeting the needs parents themselves name.** Give school supplies through the school or an
  agency, not hand to hand to children.
- **No photos of children in publicity without written parental consent, and never with names.**
- **No wording that sounds like the church wants access to children** ("reach kids", "get kids in", "kids' names").

**The outsider test, for every idea in every theme:** would a neighbor who has never heard of our church find this
kind and natural, and not strange, pushy or intrusive? If there is any doubt, cut it.

**The same care applies to other vulnerable people** (women alone, seniors, people in crisis): no collecting
personal details without clear consent, anonymous options for prayer requests, and no door-to-door gathering of
information.

In the file this means:
- `ages:"children"` or `"youth"` requires `minors:true`.
- `minors:true` requires the `kids` skill, and both `how` lists must name the screening (for example
  "Every adult is screened with a background check, and two adults are always present." / "Cada adulto pasa la
  verificación de antecedentes y siempre hay dos adultos presentes.").
- The validator fails the wording above in both languages, and flags every children or youth idea for a second read.

## Filling the fields well

- **tier:**
  - 1 = one person or a few, this week, little or no money (≤ $150 start-up, ≤ $50 a month, ≤ 4 people).
  - 2 = a small team, about a month to set up (2 to 12 people, ≤ $1,500, at least 1 leader).
  - 3 = a programme with a budget line or a partner.
  - Aim for about 20 / 20 / 10. The minimum is 15 / 15 / 8.
- **k:** serve = meet the felt need with no strings; equip = teach the skill the need exposes; belong = an ongoing
  group people come back to; invite = the spiritual step, offered openly. Use all four, with none above 45%.
  Invite ideas are honest about what they are.
- **ages / where:** vary them, with at least 4 `where` values. Keep `church` for the few ideas where the building is
  already where people come.
- **sabbath:** true when the idea does good, the things Christ did on the Sabbath (SABBATH-GUIDELINE.md beside this
  file, the pastor's rule of 1 Oct 2026: "we are not legalistic"): worship, prayer, Bible study and seminars, health
  talks and screenings, visiting the sick and lonely, preparing, serving and delivering free meals, a free pantry, kits
  for people in crisis (bought beforehand), comforting, mercy for someone in need now (even real work), childcare so a
  worn-out parent can rest, life-saving and care training, hospitality and friendship, nature walks. An ordinary
  offering in worship is fine. False for buying and selling, prices, fees, fundraising, offerings for a project, markets
  and swaps, a café or diner where buying the food is the point (unless the text also names a home, church, library or
  park), fairs and festivals with games, films and parties for fun, sport, exercise classes and competition, routine
  work (repairs, building, gardening, crafts, printing and mailing, filming, admin and committee business), and anything
  that can only happen while offices, courts or schools are open. A mixed idea is true when its heart fits; say in the
  steps which part waits for another day. Free drawings and giveaways are fine; never sell a raffle ticket or a chance.
- **need:** 1 to 6 census tags from `vocab.json`, **most specific first**. The first tag present in a tract writes
  the card's "Why here" line. For ideas that fit anywhere, add `settled`, `changing` and `growing`: one of the three
  is present wherever the census has ten-year trend data. Add one or two ordinary tags as well (for example
  `homeowners`, `renters`, `car-dependent`), for places without trend data. **boost:** tags where it fits especially well.
- **ppl / leaders / hrs / cost / costMo:** honest, whole numbers, in 2026 US prices. `hrs` is hours per volunteer
  per month. Money is in dollars: start-up, then monthly.
- **skill:** only what is truly required (lead, medical, teach, kids, cook, music, lang, trade, vehicle, weekday,
  admin, av, support). Each one is a gap in the capacity check if the church lacks it.
- **fac** (optional): facilities the idea needs, for example `["kitchen"]`, `["parking"]`, `["vehicle"]`, or
  `["classrooms|center"]`. Leave it out when it meets outside.
- **partner:** name the kind of partner, not a real local business ("the county food bank", "a licensed family
  therapist", "the library"), in both languages.
- **also:** up to 3 other themes where this idea should also show up in search.

## Writing style

- **English:** US spelling (neighbor, program, center, counseling), plain words, active voice.
  - `n` ≤ 60 characters, no final full stop. Say what it is, not a slogan.
  - `d`: 2 or 3 sentences, ≤ 420 characters: what it is, how neighbors come across it, and why it works. Keep
    English to about 360 characters so the Spanish fits.
  - `how`: exactly 4 steps, each ≤ 140 characters, each starting with a verb. The order is what someone does on
    Monday.
- **Spanish:** natural Latin-American Spanish. Address the reader as **usted** (Diseñe, Pida, Invite) and write
  neighbor-facing card text in usted too.
  - Use Hispanic Adventist vocabulary: Escuela Sabática, sábado, Dorcas, Conquistadores, Aventureros, Servicios
    Comunitarios Adventistas, El camino a Cristo, obra misionera, hermanos. Say carro, dólares, código postal,
    mensaje de texto.
  - Brand names stay as they are (Facebook, Canva, Google Voice, WhatsApp).
  - Same limits as English. Translate the meaning, not word for word.
- **No emoji,** no invented statistics, no real local names or businesses, no copyrighted text (a one-line card
  message you wrote yourself is fine).

### Words that fail the validator, and what to write instead

| Fails | Write instead |
|---|---|
| target, targeting, targeted (público objetivo, segmentar) | "shown to people within 3 miles", "for", "with" |
| bait, lure, hook them, foot in the door | say what you offer and leave it there |
| convert them, win them, prospects, soul-winning (convertirlos, ganarlos) | "invite", "study with", "those who ask" |
| selling raffle tickets, 50/50, lottery, bingo (flagged) | a FREE drawing or giveaway is fine (a Bible drawn at a seminar, a door prize, a community giveaway); never sell a ticket or a chance |
| pork, bacon, ham, sausage, shrimp, hot dogs | vegetarian food: veggie dogs, bean chili, haystacks |
| beer, wine, brewery, pub, happy hour | coffee shop, café, juice |
| counseling, therapy, diagnose (with no partner) | "not counseling: we listen and refer to …" plus a named professional partner |
| children's names or photos, school gate, playground, school bus stop, reach kids | through parents, through the school's invitation, general prayer among members |
| door-to-door survey, collect names at the doors | a card in the door with a private QR or text line |

## Three finished examples (also in `examples.json`, which the validator passes)

**Tier 1, serve, streets:** *Prayer cards on every door within a mile.* It shows the bar: walking + card + QR/text
follow-up, private, no knock, a real price ($60), and two named people who answer.

```json
{"id":"prayer-door-cards-mile","theme":"prayer","also":["neighbors"],"tier":1,"k":"serve","ages":"all","where":"streets","sabbath":true,"minors":false,
 "need":["settled","changing","growing","homeowners","renters"],"boost":["car-dependent","seniors-alone"],
 "ppl":2,"leaders":0,"hrs":3,"cost":60,"costMo":5,"skill":[],"partner":null,
 "en":{"n":"Prayer cards on every door within a mile",
  "d":"Members walk the streets around the church in pairs one afternoon a month, praying quietly for each home as they pass and leaving a card in the door. The card says: “We prayed for your home today. If there is something you would like us to pray about, text us or scan here; it stays private.” No knocking and nothing asked, so it works even where nobody ever walks past the church.",
  "how":["Design 500 business-size cards in Canva with the message, a free Google Voice number for texts, and a QR code.",
   "Link the QR code to a short private form: the request, plus a first name or phone only if they want a reply.",
   "Walk in pairs, one street at a time, praying quietly for each home; tuck the card in the door, never in the mailbox.",
   "Mark covered streets on a paper map; two named members answer every text or form within 24 hours, and pray."]},
 "es":{"n":"Tarjetas de oración en cada puerta a una milla a la redonda",
  "d":"Una tarde al mes, los miembros recorren en parejas las calles alrededor de la iglesia, orando en silencio por cada hogar y dejando una tarjeta en la puerta. La tarjeta dice: «Hoy oramos por su hogar. Si desea que oremos por algo, envíenos un mensaje o escanee aquí; es privado». Sin tocar a la puerta y sin pedir nada, funciona aunque nadie pase caminando frente a la iglesia.",
  "how":["Diseñe en Canva 500 tarjetas con el mensaje, un número gratuito de Google Voice para mensajes y un código QR.",
   "Enlace el código QR a un formulario privado: el pedido, y un nombre o teléfono solo si desean respuesta.",
   "Caminen en parejas, calle por calle, orando en silencio por cada hogar; dejen la tarjeta en la puerta, nunca en el buzón.",
   "Marquen en un mapa las calles recorridas; dos miembros designados responden cada mensaje en 24 horas y oran."]}}
```

**Tier 2, invite, online:** *Prayer ads for everyone within three miles.* It shows real ad know-how: radius, daily
budget, copy that states no personal condition, a named team, and a privacy and deletion rule.

```json
{"id":"prayer-local-ads","theme":"prayer","also":["media"],"tier":2,"k":"invite","ages":"adults","where":"online","sabbath":true,"minors":false,
 "need":["settled","changing","growing","car-dependent","young","professional"],"boost":["seniors-alone","jobless"],
 "ppl":4,"leaders":1,"hrs":4,"cost":0,"costMo":150,"skill":["admin"],"partner":null,
 "en":{"n":"Prayer ads for everyone within three miles",
  "d":"A $5-a-day Facebook and Instagram ad, shown only to people within three miles of the church: “Carrying something heavy? Send us a prayer request. Private, no strings.” A named prayer team of four replies to every message within 24 hours, prays, and asks nothing back. It meets neighbors on the phone in their hand, which is where a car-dependent suburb spends its evenings.",
  "how":["In Meta Business Suite, set the church page's ad to a 3-mile radius around the church at $5 a day.",
   "Make one square image in Canva with the words and the church's name; link it to Messenger or a short private form.",
   "Four people each take set days; reply personally within 24 hours, pray, and never add anyone to a list.",
   "Keep requests in one locked place, delete them after 90 days, and change the image each month so it stays fresh."]},
 "es":{"n":"Anuncios de oración para los vecinos a tres millas",
  "d":"Un anuncio de 5 dólares al día en Facebook e Instagram, que solo ven las personas a tres millas de la iglesia: «¿Lleva una carga pesada? Envíenos su pedido de oración. Es privado y sin compromiso». Un equipo de oración de cuatro personas responde cada mensaje en 24 horas, ora y no pide nada a cambio. Llega a los vecinos en el teléfono que tienen en la mano, allí donde pasan la tarde.",
  "how":["En Meta Business Suite, configure el anuncio de la página de la iglesia a 3 millas a la redonda, con 5 dólares al día.",
   "Haga en Canva una imagen cuadrada con el mensaje y el nombre de la iglesia; enlácela a Messenger o a un formulario privado.",
   "Cuatro personas se reparten los días; responden en persona en 24 horas, oran y nunca agregan a nadie a una lista.",
   "Guarde los pedidos en un solo lugar protegido, bórrelos a los 90 días y cambie la imagen cada mes para que no envejezca."]}}
```

**Tier 3, belong, homes:** *Forty days of prayer for every home in our zip code.* It shows a budget line
($1,400 of EDDM postcards), print that leads to digital (text, QR, weekly Facebook Live), and an ongoing group at
the end, offered only to people who asked for a reply.

```json
{"id":"prayer-zip-code-postcards","theme":"prayer","also":["neighbors"],"tier":3,"k":"belong","ages":"adults","where":"homes","sabbath":false,"minors":false,
 "need":["settled","changing","growing","homeowners","car-dependent","older"],"boost":["seniors-alone"],
 "ppl":8,"leaders":2,"hrs":5,"cost":1400,"costMo":30,"skill":["admin","av"],"partner":null,
 "en":{"n":"Forty days of prayer for every home in our zip code",
  "d":"One large postcard, sent by the Post Office's Every Door Direct Mail to every home in the church's zip code, says: “For 40 days we are praying for this zip code. Tell us what to pray for: text, scan or call. Private, no strings.” A team of eight prays each day for the requests and for each street by name, and a 15-minute Facebook Live on Wednesday evenings lets anyone pray along.",
  "how":["Budget about $1,400 for 3,000 large postcards printed and mailed by EDDM, which needs no addresses or mailing list.",
   "Set up a free text line and a QR form, and name eight people who each take five days to reply and pray.",
   "Go live on Facebook each Wednesday at 7 p.m. for 15 minutes: pray for the town, read one psalm, welcome requests.",
   "On day 40, mail a thank-you card to the same routes and invite anyone who asked for a reply to a monthly online prayer circle."]},
 "es":{"n":"Cuarenta días orando por cada hogar del código postal",
  "d":"Una postal grande, enviada por el correo Every Door Direct Mail a cada hogar del código postal de la iglesia, dice: «Durante 40 días oramos por este código postal. Díganos por qué orar: envíe un mensaje, escanee o llame. Es privado y sin compromiso». Ocho personas oran cada día por los pedidos y por cada calle por su nombre, y un Facebook Live de 15 minutos los miércoles por la noche permite a cualquiera unirse.",
  "how":["Presupueste unos 1.400 dólares para 3.000 postales grandes impresas y enviadas por EDDM, sin direcciones ni listas.",
   "Prepare una línea gratuita para mensajes y un formulario con código QR; nombre a ocho personas que tomen cinco días cada una.",
   "Transmita en vivo por Facebook cada miércoles a las 7 p. m. durante 15 minutos: oren por la ciudad, lean un salmo, reciban pedidos.",
   "El día 40, envíe una tarjeta de gratitud a las mismas rutas e invite a quien pidió respuesta a un círculo de oración mensual en línea."]}}
```

## A palette for breadth (so 50 ideas are 50 mechanisms)

Before writing, sketch 50 rows that each combine one **channel** + one **exchange** + one **rhythm**, and check
the spread. Most rows should involve something your theme's churches have not done before.

- **Channels:**
  - On foot: door card (no knock), door hanger, walk in pairs.
  - By mail: an EDDM postcard, a handwritten note.
  - In print: a flyer on a business counter, a library display, a laundromat board, a bookmark in library books
    (with the library's OK), a rack where people wait.
  - At a table: the farmers' market, the town fair, a train-station coffee hour, a county event, a table at
    someone else's event.
  - Through partners: a local business, the school's invitation, an agency's referral.
  - Online: Facebook or Instagram ad, town Facebook group, Nextdoor, Google Business Profile post, Reel or Short or
    TikTok, a Live, a podcast, a WhatsApp channel, a text line, an email newsletter, a QR code on something useful,
    Zoom.
- **Exchanges:** give, lend, fix, teach, thank, pray, listen, ask one question, eat together, walk together,
  make something together, celebrate, remember, drive, accompany, connect to a partner.
- **Rhythms:** once; a season or holiday; monthly; weekly; a standing offer ("text us any time"); a 40-day or
  6-week run; triggered (a new baby, a cold snap, a job loss, a move-in).
- **People:** members alone or in pairs, families together, seniors, youth serving (screened adults present),
  a partner organization, neighbors serving neighbors.

## Before you hand in

1. `node validate.mjs themes/<themeId>.json` prints OK.
2. You re-read every REVIEW line, especially children and youth ideas (the outsider test), `where:"church"` ideas
   (how will anyone know?), and every idea that mentions photos, knocking or prayer requests.
3. Count your own "most churches haven't tried this" ideas: at least 30 of 50.
4. Read the 50 names aloud. If two sound like the same thing in different places, replace one.
5. `node validate.mjs --all` also catches near-duplicates with other themes. When one appears, the idea belongs to
   whichever theme's scope fits better; keep it there and cross-list with `also`.

## IN-REACH AND OUTREACH

In his words first. He said:

> "Also we can separate ministry ideas by in-reach or outreach for each one, so they can see: what can I do for God's
> people, but also what can I do for the community?"

So the library shows every idea under **For God's people** (in-reach) or **For our community** (outreach), or under
both. The optional `reach` field says which:

| `reach` | Means | Examples |
|---|---|---|
| `"in"` | For God's people: the members, the church family, its officers, classes and services | a card when a member misses two Sabbaths; training deacons; a children's Sabbath School division; the Thirteenth Sabbath mission story |
| `"out"` | For the community, including guests who visit | prayer cards on every door; a coat swap; an Adventurer patch afternoon at the county park |
| `"both"` | Members and neighbors meet in it on purpose | a Pathfinder club night that neighbors' children join through their parents; a class for seekers alongside members |

- **Leave `reach` out when the theme's default is right.** The default is `"in"` in a theme marked `"inside": true`
  and `"out"` everywhere else. Set it only when the idea differs: a `sabbath-school` class for seekers is `"both"`;
  a `pathfinders` idea for the club's own staff is `"in"`.
- **Only `"in"`, `"out"` and `"both"` pass.** Anything else fails the validator.
- **The 2,249 ideas written before the field existed** get their reach from `reach.json` (one line per idea id),
  which is kept separately. Never give an idea a `reach` that disagrees with its line in `reach.json`; the validator
  fails that.
- **Where it changes the rules:** an in-reach idea is rightly at the church building, so the two "waits at the
  building" REVIEWs skip it. Every idea with reach `"out"` or `"both"` must still say how neighbors come across it,
  in any theme. The outsider test applies to anything a neighbor will see or hear; the member test (INSIDE THE
  CHURCH) applies to anything a member will.
- **In the four both-ways department themes** (`pathfinders`, `adventurers`, `interests`, `religious-liberty`) the
  default is `"out"`, so decide each idea on purpose, and aim for a real mix. The `--all` table shows in/out/both
  for every theme.

## INSIDE THE CHURCH

Seven themes are for the church family itself: its members, officers and classes. `themes.json` marks them
`"inside": true`. Four of the Adventist department themes (`worship-music`, `childrens-ministries`, `ay-youth`,
`global-mission`) are marked `"inside": true` too; they follow this section as well as ADVENTIST DEPARTMENTS.
Everything above still applies unless this section says otherwise.

| id | Theme | Usually carried by (Church Manual roles) |
|---|---|---|
| `member-care` | Caring for our members | greeters and the hospitality team, deaconesses and deacons, a care coordinator the board names, the interest coordinator for former members |
| `spiritual-care` | Spiritual care & discipleship | the elders (and the head elder), the pastor, a Bible worker |
| `deacons` | Deacons & deaconesses at work | the head deacon and head deaconess, the deacons and deaconesses |
| `stewardship` | Stewardship & generosity | the treasurer, the stewardship leader, the finance committee, the church board |
| `involvement` | Every member serving | the nominating committee, the pastor, the church board, department leaders |
| `sabbath-school` | Sabbath School & Bible classes | the Sabbath School superintendent and secretary, teachers, division leaders, the Sabbath School council |
| `fellowship` | Church family & fellowship | the social committee, the hospitality team, families, and the elders when there is conflict |

### In his words first

Pastor Mura said:

> "Greeters can also do things like keeping names and information so that when people come to church they can send
> a card if they're missing, or if they don't come one Sabbath they can give them a call and say we missed you and
> hope to see you again… keeping logs… also ministry ideas for the church as well, because that is a great way to
> keep people coming and show them that we love them. The foundation of all these ministries has to be love, has to
> be altruistic."

He also said that each ministry has its own focus. A prayer ministry focuses on prayer, the deacons and deaconesses
have their own work, and the greeters have their own ideas about what they can do. So every idea names who carries it
and fits that group's real work.

### The rules

- **Love first, and altruistic.** Every idea exists to show people they are loved. It never exists to hit numbers.
  "Keep people coming" is the fruit, not the aim, so do not write attendance goals, growth targets or "retention
  rates" into an idea.
- **Never guilt or pressure.** Say "We missed you, and we hope you're well." Never say "Why weren't you here?" Nothing
  keeps score, and nobody is told they owe the church their presence, their money or their time. Recruiting never
  sounds like "if you don't do it, no one will".
- **A member who asks for space gets it.** When someone says "please don't contact me", write it down, stop, and
  send only what they ask for. Taking someone off a list is immediate and needs no explanation.
- **Care lists and contact details are private.** A small, named, trusted team keeps them (two or three people), and
  only with each member's consent. They are never shown on a screen, printed in the bulletin or shared in a group
  chat, and anyone is removed the moment they ask. Keep them on paper or in one locked file, and start fresh each
  year. Never pass one member's address or phone number to another member without asking first. This also protects
  someone who is hiding from an abusive partner. The care list is separate from the clerk's membership records.
- **No public lists of attendance, giving or sins.** There are no attendance boards, perfect-attendance awards,
  lists of who gave, top givers, donor walls, or public confessions or rebukes. Reports give totals.
- **Spiritual care is confidential.** What a member tells an elder, teacher or care friend stays with that person
  (and with the pastor, if the member agrees). The only exception is where the law requires a report: suspected abuse
  of a child or a vulnerable adult is reported, as state law and the conference require. Elders listen and pray; they
  do not counsel beyond their competence. The counseling rule above still applies, so name a professional partner or
  say how people are referred.
- **The children's rules still apply**, to children's Sabbath School divisions, family events and everything else.
  That means screened adults, the two-adult rule, check-in and check-out to parents, no photos without written
  parental consent, and nothing that collects children's details. A card for a child goes to the family, addressed to
  the parents. The validator still fails wording such as "children's birthdays" or "kids' names".
- **Practical, specific, creative.** "Have a potluck" is not an idea. An idea is a mechanism with a twist: who does
  what, when, with what, for how much, and what makes it different from what the church already does. The rule that
  60% of ideas are things most churches have not tried still holds.
- **Digital where it helps**, and at least 10 ideas per theme (`digitalMin` 10). Good uses are opt-in text messages
  and WhatsApp groups, Zoom with a phone dial-in number so shut-ins can join a class, online giving, shared Google
  Calendars for meal trains, rides and deacon rotas, Google Forms for a gifts inventory, a short video of the mission
  story, and email for officer training. The validator counts only real digital words, so write "text message",
  "texting", "WhatsApp", "Zoom", "online", "Google", "email" or "video". "A text" or "a call" does not count.
- **Adventist-natural, in plain words.** Use Church Manual roles (elders, deacons and deaconesses, the treasurer, the
  clerk, the nominating committee, the Sabbath School superintendent), communion with the ordinance of humility
  (foot-washing), Sabbath School and its mission emphasis, Pathfinders and Adventurers, vegetarian food, and Sabbath
  keeping. In Spanish, use Santa Cena, rito de humildad (lavamiento de los pies), ancianos de iglesia, diáconos y
  diaconisas, tesorero, comisión de nombramientos, Escuela Sabática, unidades de acción, hermanos y hermanas.

**The member test replaces the outsider test in these themes:** would a member who has been away for months feel
loved and free, not chased or watched? If there is any doubt, cut the idea. The outsider test still applies to
anything a guest will see or hear.

### What changes in the file

- **`where:"church"` is right for many of these ideas.** Their reach is `"in"` unless you set it, and the validator
  skips the two "waits at the building" REVIEWs for in-reach ideas. Still use at least 4 `where` values: `homes` (visits by appointment or invitation), `online`,
  `community` (a hospital, a café, a member's lunch break) and `parks` (a picnic or a nature Sabbath).
- **The four kinds, inside the church:**
  - `serve`: practical care for members (a card, a meal, a ride, a repaired step, a communion table prepared with care).
  - `equip`: training the people who serve (greeters, deacons, teachers, elders, treasurers, new officers), or
    teaching members a skill (family worship, a budget).
  - `belong`: an ongoing group or rhythm people come back to (a class care group, a supper rotation, a monthly family night).
  - `invite`: the spiritual step, offered openly and without pressure: Bible study, baptism, coming home, a place
    to serve, a reconciliation conversation.
- **`need`:** use `settled`, `changing` and `growing` to mean "fits any church", then a real tag where the fit is
  real. For example, use `older` or `seniors-alone` for shut-in care, `no-car` for rides, `families` or `many-kids`
  for children's divisions, and `spanish` for a bilingual class.
- **`also` carries search.** Some search words already open a neighboring theme, and the 42 outward themes stay as
  they are. Cross-list so those searches still find your ideas:
  - A greeters' idea in `member-care`, or an ushering idea in `deacons`: `also:["hospitality"]`. "greeters",
    "ujieres" and "diaconado" open hospitality.
  - Visits to sick or shut-in members: `also:["seniors"]`. "visitation" and "shut-ins" open seniors.
  - Bible study with new believers, or baptism preparation: `also:["personal-evangelism"]`. "discipleship", "bible
    study" and "baptism class" open personal-evangelism.
  - Family worship: `also:["families"]`.
  - A budget or debt help for members: `also:["jobs-money"]`.
  - Potluck and fellowship-meal ideas: `also:["hospitality"]`. "potluck" and "comida compartida" open hospitality.
  - Camping and nature days: `also:["sports-outdoors"]`.
  - An idea mostly about prayer (prayer partners, elders praying with members): file it where the action lives and
    add `also:["prayer"]`.
  - A children's division idea (it lives in `childrens-ministries`): `also:["children"]`. "children's ministry" and
    "vbs" open children.
  - Church music and choirs: `also:["music-arts"]` only when neighbors are part of it. "music" and "choir" open
    music-arts; "church choir", "music ministry" and "worship" open worship-music.
  - The church's own teens (in `ay-youth`): `also:["youth"]`. "youth ministry" and "youth group" open youth.
  - An interest or new-believer idea (in `interests`): `also:["personal-evangelism"]` or `["spiritual-care"]`.
    "evangelism", "bible study" and "baptism class" open personal-evangelism; "baptism" and "new believers" open
    spiritual-care.
- **Search words that moved** when the department themes arrived (so one word opens one theme): "pathfinders",
  "pathfinder club", "conquistadores" and "club de conquistadores" now open `pathfinders`; "adventurers" and
  "aventureros" open `adventurers`; "sociedad de jóvenes" opens `ay-youth`; "sabbath school for kids", "escuela
  sabática de niños", "cradle roll", "children's divisions" and "divisiones infantiles" open `childrens-ministries`;
  "mission story", "mission emphasis" and "informe misionero" open `global-mission`; "reclaiming", "reclamation" and
  "rescate de miembros" open `interests`. The six older ideas about the clubs are cross-listed with `also` so those
  searches still find them.
- **The same bar and quotas apply:** 50+ ideas; 15 / 15 / 8 by tier; all four kinds, none above 45%; at least 3
  ideas that combine a printed card or a visit with a digital follow-up; no near-duplicate names in the file or
  across the library.

### Theme by theme: what to watch

- **member-care.**
  - The greeters' care list is the pastor's own example. Build many different mechanisms around noticing and
    following up: the channel (card, call, text message, visit), the trigger (two missed Sabbaths, a new baby, a
    hospital stay, a move) and the people (greeters, a deaconess, a class, a child's drawing sent through the family).
  - Birthdays and anniversaries only with the member's permission.
  - Hospital and home visits are short, by appointment, and only after asking the family.
  - With former members, keep up a kindness that asks for nothing: a yearly card, an invitation to a homecoming
    Sabbath, a meal. Never a campaign. When a former member asks for a way back (Bible studies, a return class,
    rebaptism), that idea belongs in `interests`.
- **spiritual-care.**
  - Each elder cares for a short list of households (8 to 12) and visits by appointment.
  - Anointing of the sick is at the member's request (James 5).
  - A mentor walks with each new believer through the first year after baptism.
  - The hand-over: before baptism, a person who asked for studies belongs to `interests` (the interest coordinator,
    Bible workers, the way to baptism); from baptism day on, the elders' nurture is here, and the practical care
    friend is in `member-care`. An elder visiting and praying with a baptismal candidate belongs here.
  - Family worship ideas should be easy enough for a tired parent to use tonight.
  - Never spiritual pressure: no "you must be rebaptized", no checklists of someone's devotions.
- **deacons.**
  - Communion uses unleavened bread and unfermented grape juice. Never write "wine": the validator fails the word.
    Write "grape juice" / "jugo de uva sin fermentar".
  - The ordinance of humility needs warm water, clean towels, chairs for people who cannot kneel, and quiet dignity.
  - Baptism day: warm water, robes and towels, and a helper for each candidate.
  - The safety team is trained in first aid, CPR and AED, de-escalation, evacuation and child check-in. Keep armed
    security out of the ideas; that is a decision for the board and the conference's risk management.
  - The benevolence fund is decided by two or three people, confidentially. It pays the bill directly when it can
    and never asks for more proof than the need.
- **stewardship.**
  - Tithe goes in full to the conference through the treasurer, as the Church Manual directs. It never pays local
    bills or projects; offerings fund those.
  - Individual giving records are seen only by the treasurer (and the auditors). Reports show totals. Two unrelated
    people count every offering.
  - Online giving goes through Adventist Giving, the North American Division's online giving service, or the
    conference's approved option.
  - A thank-you never names an amount.
  - Budgeting and debt help for members is one to one and confidential. Classes open to the community belong in
    `jobs-money`.
  - Nothing is sold and no fundraising happens on Sabbath (`sabbath:false`).
- **involvement.**
  - Nominating committee discussions are confidential. Ask a member before nominating them. A "no" is respected and
    never announced.
  - Use the Spiritual Gifts results only with the member's consent.
  - Let people shadow a role for a month before they take it.
  - Rotate roles before people burn out.
  - Offer new members a place to serve within three months, if they want one.
  - Any role with children requires screening.
- **sabbath-school.**
  - Each class cares for its own members (in Spanish, *unidades de acción*): a small group of 4 to 6 follows up an
    absence with a call, never with a roll call read aloud.
  - Other good subjects: teacher training, better discussion questions, a class for seekers (reach `"both"`), a
    class in Spanish or another heart language, and a Zoom class with a phone dial-in for shut-ins.
  - The secretary's records stay private.
  - This theme is the adult classes. The children's divisions (Babies to Teen) are `childrens-ministries`, the youth
    class and AY are `ay-youth`, and the mission story and mission offerings are `global-mission`.
- **fellowship.**
  - Potlucks need a real twist: table hosts who mix generations, recipe cards, a "bring nothing" Sabbath for tired
    families.
  - Pair a family with an older member, with the parents always present.
  - Other good subjects: milestones celebrated together, church family nights, nature Sabbaths, and supper
    rotations that weave new members into friendships.
  - Food is vegetarian, with allergens labeled.
  - Reconciliation follows Matthew 18: privately first, then with one or two others, and with a trained mediator for
    serious conflict. **Never ask someone who was abused to reconcile with the person who hurt them.** Abuse goes to
    the pastor, the authorities and professional help (`abuse-survivors`).
  - No competitive sports on Sabbath.

### Words that fail the validator in every theme

These checks run on every theme, in both languages. A sentence that clearly forbids the phrase ("Never ask 'why
weren't you here?'", "Nunca publique la asistencia") becomes a REVIEW instead. Even so, it is better to write the
kind version and leave the bad phrase out.

| Fails | Write instead |
|---|---|
| "why weren't you here", "where have you been?", "you've been missing", "no excuses", "make them feel guilty" (¿por qué no vino?, ha estado faltando, sin excusas, hacerlos sentir culpables) | "We missed you, and we hope you're well." / «Lo extrañamos y esperamos que esté bien.» |
| post / announce / display the attendance, attendance board or chart, perfect-attendance award (publicar la asistencia, asistencia perfecta) | a private care list kept by two or three people; reports give totals only |
| list of who gave, who gave what, top givers, donor wall, donors named from the pulpit or in the bulletin (lista de quienes diezmaron, mayores donantes) | thank everyone together; the treasurer keeps giving records confidential |
| public confession, rebuke in front of the church, lists of sins (confesión pública, reprender en público) | confidential care; the elders and the pastor, privately |
| backsliders, apostates, delinquent members (REVIEW, not a fail) | "members we miss", "former members", "hermanos que extrañamos" |

### A finished example

**Tier 1, serve, church:** *A handwritten card when a member misses two Sabbaths.* This is the pastor's greeters idea
at the bar. It has a consent list, a small named team, a real trigger, a card with an optional text-message follow-up,
nothing asked back, and a way off the list. It is cross-listed with `hospitality` so a search for "greeters" finds it.

```json
{"id":"member-care-two-sabbath-card","theme":"member-care","also":["hospitality"],"tier":1,"k":"serve","ages":"all","where":"church","sabbath":true,"minors":false,
 "need":["settled","changing","growing","older","seniors-alone"],"boost":["seniors-alone","no-car"],
 "ppl":3,"leaders":1,"hrs":2,"cost":40,"costMo":15,"skill":[],"partner":null,
 "en":{"n":"A handwritten card when a member misses two Sabbaths",
  "d":"Two greeters and a deaconess keep a private care list of the members who said yes to it. When someone on it misses two Sabbaths in a row, one of them writes that week: “We missed you and hope you are well. No need to reply; we are praying for you.” A text message follows only for those who chose texts, and it asks for nothing.",
  "how":["Ask each member once, in private, whether they would like a card or a call when they are away; list only those who say yes.",
   "Keep the list on paper or in one locked file that only the three see; never on a screen and never in a group chat.",
   "After a second missed Sabbath, mail a stamped card within three days; send a text message only to those who chose it.",
   "Take anyone off the moment they ask, and each January delete the list and start again with fresh consent."]},
 "es":{"n":"Una tarjeta a mano cuando un miembro falta dos sábados",
  "d":"Dos personas del equipo de bienvenida y una diaconisa llevan una lista privada de cuidado con los miembros que aceptaron estar en ella. Cuando alguien de la lista falta dos sábados seguidos, uno de ellos le escribe esa semana: «Lo extrañamos y esperamos que esté bien. No necesita responder; oramos por usted». Solo quienes eligieron mensajes de texto reciben uno, y no se les pide nada.",
  "how":["Pregunte a cada miembro, en privado, si desea una tarjeta o una llamada cuando falte; anote solo a quienes digan que sí.",
   "Guarde la lista en papel o en un archivo protegido que solo vean los tres; nunca en una pantalla ni en un grupo de chat.",
   "Tras el segundo sábado de ausencia, envíe por correo una tarjeta con estampilla en tres días; escriba solo a quien lo eligió.",
   "Quite a quien lo pida en ese mismo momento; cada enero borre la lista y comience de nuevo con un nuevo consentimiento."]}}
```

### Before you hand in (inside themes)

1. `node validate.mjs themes/<themeId>.json` prints OK. The pressure and public-list checks are ERRORs, not REVIEWs.
2. Read every idea with the member test: loved and free, not chased or watched.
3. Every idea names who carries it (greeters, deacons, elders, the treasurer, a class) and fits that group's real
   work. Every idea that holds anyone's details says who keeps them, how consent is given, and how someone is taken off.
4. Check `also` so the search words in "What changes in the file" still find your ideas.
5. At least 30 of your 50 are things most churches have not tried.

## ADVENTIST DEPARTMENTS

Eight themes follow the departments an Adventist church actually has. Read INSIDE THE CHURCH first: its rules (love
first, never guilt, private lists, confidentiality, the member test) apply here too.

| id | Theme | `inside` | Default reach | Usually carried by (Church Manual roles) |
|---|---|---|---|---|
| `worship-music` | Worship & music | true | in | the pastor and elders, the music leaders (who work under the pastor or elders), choirs, musicians, platform participants |
| `childrens-ministries` | Children's Sabbath School & children's ministries | true | in | the children's ministries coordinator and committee, Sabbath School division leaders and teachers, the VBS director |
| `pathfinders` | Pathfinder Club | false | out (set in/both) | the Pathfinder director and deputy directors, counselors (each with a unit of 6 to 8 Pathfinders), instructors, Master Guides |
| `adventurers` | Adventurer Club | false | out (set in/both) | the Adventurer director and associates, club staff, and the children's parents |
| `ay-youth` | Youth ministries (AY) | true | in | the Adventist Youth Ministries (AYM) committee, the youth leader, the Ambassador leader, the youth Sabbath School leader |
| `interests` | Evangelism follow-up & new believers | false | out (set in/both) | the interest coordinator, the personal ministries leader and council, the Bible school coordinator, Bible workers, the pastor |
| `religious-liberty` | Religious liberty & public affairs | false | out (set in/both) | the religious liberty leader (with the conference or union PARL department); the pastor or an elder chairs the church's religious liberty association |
| `global-mission` | Mission awareness & Global Mission | true | in | the Sabbath School superintendent, the Investment secretary, mission-story tellers, the personal ministries leader |

### In his words first

Pastor Mura said:

> "There are more things to add. I like worship and music for sure, children's Sabbath School, Pathfinders,
> Adventurers — think about Adventists, because this is an Adventist app: all the things we would have as a
> denomination. We also have an evangelism team."

So these ideas must read as if a seasoned Adventist leader wrote them: the real offices, the real programmes, the
real calendar, in the church's own words, and with the same love and care as every other theme.

### Check before you name

- **Never guess an Adventist name, number or date.** Every class, level, award, curriculum, offering, office, event
  and magazine you name must be in "Checked facts" below, or be checked first on an official Adventist site: the
  Church Manual, the North American Division (nadadventist.org), Club Ministries (clubministries.org), NAD Children's
  Ministries (childmin.org), NAD Public Affairs and Religious Liberty (religiousliberty.info), Adventist Mission
  (adventistmission.org) or General Conference Youth Ministries (gcyouthministries.org). Add what you checked to the
  table with its source.
- **Names change.** GraceLink is giving way to Alive in Jesus; Adventist Screening Verification replaced Shield the
  Vulnerable; Pathfinder "classes" are now "Investiture Achievement" levels. Use today's name.
- **When it varies by conference or division, say so** ("your conference's child-protection training", "the
  conference youth department"), and do not name it.
- **No future dates.** Say "the third Sabbath of September", not a year's date; never a camporee's date or place.
- **Do not copy texts** such as the Pathfinder Pledge and Law or the Adventurer club's own pledge and law; name
  them only.
- **Spanish:** use the Spanish names in the table. Where no Spanish name is listed, describe it in Spanish rather
  than inventing one (the validator flags English programme names in Spanish text).

### Checked facts (29 September 2026)

| Subject | Fact | Source |
|---|---|---|
| Children's ministries | Serves children from birth through age 14; a coordinator and committee (division leaders, the VBS leader, junior youth leaders); VBS, branch Sabbath Schools, Neighborhood Bible Clubs and Story Hours come under it when the church has the department; everyone working with children meets church and legal standards such as background checks | Church Manual 2022, pp. 93–95 |
| Children's Sabbath School | NAD divisions in the new curriculum: Babies (birth–12 months), Beginner (1–3), Kindergarten (4–6), Primary (7–9), Junior (10–12), Teen (13–14); the Youth division comes after Teen and belongs with `ay-youth` | childmin.org/aliveinjesus |
| Curriculum | Alive in Jesus replaces GraceLink (and Junior PowerPoints, Real-Time Faith, Cornerstone Connections) division by division: Babies and Beginner from January 2025, Kindergarten and Primary in 2026, Junior and Teen later (dates differ between NAD pages, so do not state one) | nadadventist.org news; childmin.org |
| Child protection (NAD) | Adventist Screening Verification: a criminal background check and child-protection training through Sterling Volunteers, every three years, for adults 18 and over who are voted to serve or employed and work with children and youth | nadadventist.org/asv |
| Pathfinder Club | For ages 10 to 15 (Church Manual); in the NAD, grades 5 to 8, with Teen Leadership Training (TLT) for grades 9 to 12; outdoor living, nature, crafts, hobbies and vocations in the context of spiritual growth; a director and deputy directors (one man and one woman if two); counselors each responsible for a unit of 6 to 8 | Church Manual 2022, p. 113; clubministries.org/pathfinders |
| Pathfinder levels | Investiture Achievement levels: Friend, Companion, Explorer, Ranger, Voyager, Guide. NAD Spanish: Amigo, Compañero, Explorador, Orientador, Viajero, Guía ("Logros para la Investidura") | clubministries.org and its Spanish record journals |
| Pathfinder extras | Pathfinder honors (Spanish: especialidades); the Pathfinder Pledge and Law (Spanish: el voto y la ley del Conquistador); Pathfinder Bible Experience (nadpbe.org); the International Camporee (camporee.org); Master Guide is the highest level of invested leadership in the Adventurer and Pathfinder programmes (Spanish: Guía Mayor) | clubministries.org |
| World Pathfinder Day | The third Sabbath of September | GC Youth Ministries |
| Adventurer Club | Home and church programmes for parents with 4- to 9-year-old children (Church Manual); in the NAD, pre-kindergarten to grade 4 | Church Manual 2022, p. 114; clubministries.org |
| Adventurer levels | Little Lamb (pre-K), Eager Beaver (K), Busy Bee (grade 1), Sunbeam (2), Builder (3), Helping Hand (4); patches are stars for Little Lambs, chips for Eager Beavers, awards from Busy Bee up. NAD Spanish: Corderitos, Castorcitos, Abejitas Industriosas, Rayitos de Sol, Constructores, Manos Ayudadoras; awards are especialidades | clubministries.org; NAD "Elementos básicos del Club de Aventureros" |
| Adventurer curriculum | Four areas: My God, My Self, My Family, My World (Spanish: Mi Dios, Yo Mismo, Mi Familia, Mi Mundo); the Family Network (Spanish: Red familiar) supports parents and guardians from the church and the community | clubministries.org |
| Youth ministries | Adventist Youth Ministries (AYM) with an AYM committee; Ambassadors for ages 16 to 21; Young Adults and Public Campus Ministries (these belong in `young-adults`) | Church Manual 2022, pp. 110–113 |
| Youth events | Global Youth Day is the third Sabbath of March; the Youth Week of Prayer follows it | GC Youth Ministries |
| Interests | The interest coordinator keeps an organized list of all interests, helps recruit members for follow-up, gives the board a monthly report of how many were received and followed up, and shares an interest with the pastor when it is ready; the Bible school coordinator works with the interest coordinator and the personal ministries leader; the conference may assign Bible instructors to a church | Church Manual 2022, pp. 34, 91, 106–107 |
| Baptism | The baptismal vow, rebaptism and profession of faith are set out in the Church Manual; use those words | Church Manual 2022, pp. 51–56 |
| Religious liberty | The Public Affairs and Religious Liberty (PARL) department; each church is an informal religious liberty association and every member belongs; the religious liberty leader works with the pastor and the conference or union PARL department | Church Manual 2022, pp. 101–102 |
| Religious Liberty Sabbath | The second Sabbath of January starts the NAD Religious Liberty campaign (to the end of March); its offering supports Liberty magazine and legal help for members with religious-liberty problems at work | religiousliberty.info |
| Liberty magazine | Published since 1906 by the NAD; sent to lawmakers, judges, attorneys and community leaders | religiousliberty.info |
| Mission offerings | All Sabbath School offerings except the Sabbath School expense fund go in full through the treasurer to the conference: the weekly Sabbath School offering, the Thirteenth Sabbath Offering, Sabbath School Investment and the Birthday-Thank Offering; the Investment secretary promotes Investment | Church Manual 2022, pp. 103–106 |
| Thirteenth Sabbath Offering | Taken each quarter; a portion goes to projects in the world division featured that quarter | Adventist Mission |
| Global Mission | Global Mission pioneers are volunteers who work where there is no Adventist presence, usually in their own country; Mission Spotlight is a series of mission videos; the Mission Quarterlies carry the weekly mission stories for adults and children. Spanish: Misión Global | adventistmission.org |
| Music | Music leaders are chosen with care, work under the pastor or elders and plan with them; a children's choir is nurture, belonging and outreach | Church Manual 2022, p. 101 |
| Accessible worship | Christian Record Services offers the Seventh-day Adventist Hymnal in braille and large print for members who are blind or have low vision | christianrecord.org (October 2025) |
| Interest follow-up (board) | The board encourages the interest coordinator to see that every interest is personally and promptly followed up by assigned laypersons; once each quarter a whole board meeting is given to evangelism plans; the personal ministries leader may assign an assistant to coordinate the Bible correspondence school | Church Manual 2022, pp. 106–107, 137–138 |
| Baptism (details) | Candidates are taught individually or in a baptismal class; the pastor or an elder may visit the class to meet them; the vow has 13 questions, with a 3-question alternative vow; the church votes to accept candidates subject to baptism; the Certificate of Baptism and Commitment is presented after baptism; a short welcoming ceremony follows; the 28 Fundamental Beliefs with the vow and certificate form the baptismal covenant | Church Manual 2022, pp. 50–54 |
| Rebaptism, profession of faith, return | Rebaptism for someone already immersed is their own choice: “There is to be no urging”; profession of faith has four circumstances (including a former member whose membership was misplaced or withdrawn as missing but who stayed faithful); readmission after removal normally comes with rebaptism; the clerk handles letters of transfer | Church Manual 2022, pp. 55–57, 72–73 |
| Voice of Prophecy | An NAD media ministry (Adventist Media Ministries); its Discover Bible School offers free Discover guides by mail and online at bibleschools.com, where a local Discover Bible School representative contacts people in North America who ask; it supports more than 2,000 local church Bible schools | voiceofprophecy.com; bibleschools.com; nadadventist.org (Adventist Media Ministries; VOP news) |
| La Voz de la Esperanza | The NAD's Spanish radio and television media ministry; free Bible courses by mail and online, including Descubra (12 lessons) | nadadventist.org (Adventist Media Ministries); lavoz.org/cursos |
| Christian Record Services (studies) | An Adventist ministry for people who are blind; free Bible study guides and correspondence courses in braille, large print and audio | nadadventist.org (Christian Record Services); christianrecord.org |
| Quitline (not Adventist) | 1-800-QUIT-NOW, or 1-855-DÉJELO-YA in Spanish, connects the caller to their free state quitline | cdc.gov |
| Pathfinder Club (Church Manual) | The church elects the director and deputy directors (one man and one woman if two); one deputy may also be club secretary and treasurer; the Pathfinder and Adventurer directors are members of the AYM committee; resources come from the conference youth ministries director | Church Manual 2022, pp. 110–114 |
| Pathfinder staff training | Basic Staff, Counselor, Instructor, Secretary/Treasurer and Director Certifications; each TLT has an adult TLT Mentor and a TLT Record Book | clubministries.org (Pathfinder training and certification; TLT) |
| Investiture Achievement | Tracks: Personal Growth, Spiritual Discovery, Serving Others, Making Friends, Health and Fitness, Nature Study, Outdoor Living, plus an Honor Enrichment track for the Advanced level; the IA Director's Guide is in English and Spanish | clubministries.org/investiture-achievement |
| Pathfinder uniform | The NAD defines the Class A uniform; the black sash over the right shoulder is "the personal club history of the Pathfinder" (honors, camporees); AdventSource is the NAD's official supplier | clubministries.org (NAD uniform standards) |
| Pathfinder honors named in `pathfinders` | Over 400 honors in eight categories. Used: First Aid, CPR, Knot Tying, Birds, Stars, Woodworking, Baking, Cooking, Dutch Oven Cooking, Drilling & Marching, Genealogy, Hymns, Sanctuary, Bible Marking, Christian Visitation, Household Budgeting, Accounting, Cultural Diversity Appreciation, Sign Language, Robotics, Photography, Flags, Christian Citizenship, Disaster Ministries, Feeding Ministries, Refugee Assistance, Adventist Pioneer Heritage | clubministries.org/pathfinders/pathfinder-honors |
| Pathfinder Bible Experience | The NAD's Pathfinder Bible study program: teams learn set books and meet at area, conference, union and division levels. Spanish: la Experiencia Bíblica de los Conquistadores | Adventist News Network; Columbia Union |
| World Pathfinder Day (Spanish) | Día Mundial del Conquistador | Adventist News Network (Spanish); Inter-American Division |
| ACS hygiene kits | Adventist Community Services had Pathfinders pack hygiene kits (for shelters and disaster response) at the 2024 International Camporee | nadadventist.org news |
| Adventist Heritage Ministries | Runs the William Miller Farm (Whitehall, NY), the Hiram Edson Farm (Clifton Springs, NY), the Joseph Bates Home (Fairhaven, MA) and the Historic Adventist Village (Battle Creek, MI) | adventistheritage.org |
| Adventurer awards named in `adventurers` | Patches are worn on the sash: stars (Little Lamb), chips (Eager Beaver), awards (Busy Bee up), plus multi-level and special awards. Used: Healthy Food, Healthy Me, Sharing (stars); Birds, God's World, Fire Safety, Pets, Animals, Toys, Crayons and Markers (chips); Reading I, Flowers, Health Specialist, Friend of Animals, Music Maker, Potato, Butterfly (awards); Bible Storytelling, Bread of Life, Delightful Sabbath, Dogs, Parables of Jesus, Universe (multi-level and special) | clubministries.org/adventurers/adventurer-awards |
| Adventurer staff and resources | Basic Staff, Instructor, Secretary/Treasurer and Director Certifications; Director's Guide (English and Spanish); Adventurer Club Starter Kit; Pledge, Law and Song; activity books and record cards for each level; the church elects the director and associates | clubministries.org/adventurers; Church Manual 2022, p. 114 |
| World Adventurer Day | The third Sabbath of May (a club or conference may choose its own date). Spanish: Día Mundial de los Aventureros | TED and GC Youth Ministries; clubministries.org; Inter-American Division |
| Worship (Church Manual) | No set order of worship; a short order usually suits worship best and long preliminaries are avoided; printed bulletins reduce oral announcements; two suggested orders (longer and shorter), with a hymn of consecration in the longer; the one leading the pastoral prayer customarily kneels facing the congregation; a "worshipful hush" as participants enter and kneel; the first Sabbath of each month is the Church Outreach (Missionary) Sabbath; musicians should be members of the church, the Sabbath School or AYM | Church Manual 2022, pp. 101, 127–128, 186–187 |
| Communion and children | Communion is customarily quarterly: foot-washing, then the Lord's Supper; open communion for all who have committed their lives to the Savior; children learn its meaning by watching until they are baptized | Church Manual 2022, pp. 129–132 |
| Sabbath School council and divisions | The council may appoint division pianists and organists and a Sabbath School music director; children's division teachers are chosen with the division leaders; the VBS director (or the children's ministries coordinator) leads the annual VBS; materials come from the Adventist Book Center or the conference | Church Manual 2022, pp. 103–105 |
| Hymnals | Seventh-day Adventist Hymnal (695 hymns): Christian Record Services has braille lyrics, responsive readings, piano and four-part harmony, and large-print lyrics and readings. Spanish: Himnario Adventista para el culto de adoración (IADPA, 614 hymns), with a large-print edition and CD/DVD instrumental tracks for churches without instruments | christianrecord.org (October 2025); iadpa.org |
| Alive in Jesus (Spanish, parents) | Spanish name: Vivos en Jesús; the Baby Steps Parent Book for the Babies division, in English or Spanish, $9.99 in print or free online | childmin.org/aliveinjesus |
| NAD Children's Ministries resources | Kids Ministry Ideas (quarterly magazine); the Children's Ministries Retreat; Children's Sabbath program materials each year; Certification in six tracks (Understanding Children, Teaching Children, Child Evangelism, Creative Arts, Leadership, Ministering to Families; 7 of 10 courses per track), also online through the Adventist Learning Community; VBS resources at adventistvbs.org | childmin.org; nadadventist.org (Children's Ministries); adventistlearningcommunity.com |
| NAD child-safety documents | Starting Your Child Protection Plan; Child Check-In/Check-Out Policy; Appropriate Touch and Discipline; How to Supervise Children; Working with Kids Online; The Bully-Free Zone; 10 Tips for Planning Your First Missing Child Drill | childmin.org/childrens-safety |
| Children's Sabbath; children's Week of Prayer | The GC Children's Ministries calendar has a yearly Children's Sabbath (the date varies, so do not state one) and publishes children's Week of Prayer readings | children.adventist.org (search listing; the pages refused direct download); nadadventist.org |
| Children's papers | Our Little Friend (birth to 5), Primary Treasure (6 to 9) and Guide (juniors and teens), weekly from Pacific Press, with free PDF editions online | nadadventist.org news; pacificpress.com |
| Week of Prayer | The world church's Week of Prayer readings are published each November (Adventist World, Adventist Review) | adventistreview.org; adventistworld.org |
| AYM (details, used in `ay-youth`) | The AYM committee includes the Ambassador, Pathfinder and Adventurer leaders, the youth Sabbath School division leader and an AYM advisor (an elder or board member) who attends conference youth training institutes; youth serve "as young elders, deacons, and deaconesses" beside experienced officers; the name "Adventist Youth" is always used; Ambassador officers are a leader, associate, secretary-treasurer and music director | Church Manual 2022, pp. 110–115, 184 |
| Youth Alive | Listed among health ministries resources as "a program to build resiliency in our youth" | Church Manual 2022, p. 182 (Notes 12) |
| Youth events (details and Spanish) | Global Youth Day's motto is "Be the Sermon"; Spanish: Día Mundial del Joven Adventista (South American Division) or Día Mundial de la Juventud (Inter-American Division); Youth Week of Prayer in Spanish: Semana de Oración de los Jóvenes (IAD) or Semana de Oración Joven (SAD); Ambassadors in Spanish: Ministerio de Embajadores (16 to 21) | gcyouthministries.org (search listing); adventistas.org; interamerica.org; adventist.news |
| William Miller Farm (details) | Low Hampton, New York, run by Adventist Heritage Ministries; includes Miller's 1815 house and Ascension Rock, where local Millerites are reported to have waited on October 22, 1844; tours are pre-registered on adventistheritage.org, with a Sabbath afternoon tour | adventistheritage.org (search listing) |
| NAD PARL resources | Liberty magazine: bimonthly, $10 a year for 6 issues, gift subscriptions for lawmakers and thought leaders, circulation just under 200,000; the Liberty Podcast; Faith & Politics (a TV program on Hope Channel North America); the NAD PARL newsletter; campaign brochures, posters and social images in English and Spanish; a religious employment rights intake form that connects members with their union PARL office | religiousliberty.info; libertymagazine.org |
| Local Church Religious Liberty Manual (NAD) | Tips for pastors: judge urgency, call the union PARL director at once if urgent, keep written records, observe deadlines, assign a fellow member as "spiritual guardian and encourager", court is the last resort, the member decides; the leader attends city and county meetings, sees that council members receive Liberty, writes letters to the editor as a private citizen, recognizes civic leaders with the union PARL director, holds religious liberty rallies (Sabbath afternoons are best), verifies rumors with the union PARL director; sections on Sabbath accommodation in employment and labor union membership exemption; issues include literature-distribution ordinances, Sabbath exams and elections held on Sabbath | religiousliberty.info (local-church-religious-liberty-manual.pdf) |
| PARL history | John N. Andrews's article on religious freedom (1851); members prosecuted under state Sunday laws from the 1880s; the National Religious Liberty Association (Battle Creek, 1889); Sherbert v. Verner (1963), an Adventist member denied unemployment benefits after being fired for not working on the Sabbath | religiousliberty.info/history; religiousliberty.info/in-the-courts |
| IRLA | The International Religious Liberty Association: an official site of the world church, "the world's oldest association dedicated to the freedom of conscience for all people"; journal Fides et Libertas | irla.org; Church Manual 2022, Notes 13 |
| Public facts used in `religious-liberty` (not Adventist) | Sunday SAT for religious reasons needs a signed letter from a religious leader on the organization's stationery (College Board); the ACT has non-Saturday test centers (act.org); EEOC charges: 180 days, 300 where a state or local agency enforces a similar law (eeoc.gov); Religious Freedom Day, January 16, marks Virginia's 1786 statute (presidential proclamations); RLUIPA (2000) protects houses of worship in zoning (justice.gov); Constitution Day and Citizenship Day, September 17 (36 U.S.C. 106) | satsuite.collegeboard.org; act.org; eeoc.gov; justice.gov; law.cornell.edu |

### Keeping children and teens safe in club and youth work

Everything in "Children and young people" above applies. In club and youth work it also means:

- **Screened adults only**, as the conference's child-protection policy requires (in the NAD, Adventist Screening
  Verification). A new helper is not alone with children until the screening is done.
- **The two-adult rule, always**: at meetings, in cars, on campouts and online. No adult is alone with one child.
- **Parental consent in writing** to join, for each trip and overnight, with a medical release; parents know where
  their child is and who is with them.
- **No one-to-one online contact.** Adults do not send private messages to a minor: messages go to the club's
  group, with a second adult in it, or to the parent. Video calls have two adults and the parents' OK.
- **Photos only with written parental consent**, never with names, and never of a child whose parent said no.
- **Neighbors' children join only through their parents**, who fill in the forms themselves. The club secretary
  keeps the forms privately and destroys old ones on a schedule.
- **Overnights** follow the conference's rules: separate sleeping for boys and girls, adults never share a tent or
  room with a child who is not their own, and check-out only to a parent or someone the parent named.
- In the file: `minors:true`, the `kids` skill, and screening named in both `how` lists, as the validator requires.

### The Sabbath in club and department work

- **Fits the Sabbath** (`sabbath:true`): worship, Investiture, nature walks and nature honors, Bible study and
  Pathfinder Bible Experience, visiting care homes and shut-ins, acts of mercy, community service done free, feeding
  people, mission stories.
- **Best on another day** (`sabbath:false`): drill competitions and parade practice, fundraising and sales (fruit,
  pies, car washes), buying uniforms or supplies, craft and vocational honors that are work, sports and
  competitions, setting up camp and travel that can be done before sunset on Friday.
- At a camporee or campout, Sabbath is kept as Sabbath: worship, nature and rest, no trading or games of competition.
- A Sabbath idea that mentions selling, tickets or tournaments is flagged by the validator; re-read it.

### Theme by theme: what to watch

- **worship-music.**
  - Worship belongs to the whole church. Music is chosen with the pastor or elders to fit the sermon (Church Manual);
    never a performance contest.
  - The children's story is short and true to Scripture, children come forward only if they want to, and no child is
    ever the joke. No photos of children without written parental consent.
  - Testimony time is prepared with the member beforehand. It is never a public confession.
  - Worship every member can join: large-print bulletins, braille and large-print hymnals, hearing help, seating for
    people who cannot stand long, and a quiet room.
  - Projected lyrics and streamed music need the church's copyright licenses (for example CCLI's).
  - Preparing communion, foot-washing and baptism day is `deacons`; the livestream for neighbors is `media`.
- **childrens-ministries.**
  - Every idea involves minors: `minors:true`, the `kids` skill, screening in both `how` lists, the two-adult rule
    in every room, and check-in and check-out to parents.
  - Name the division ("the Primary division"), and say "the lesson for their division" unless the idea is about the
    curriculum itself.
  - Cards and gifts for a child go to the family, addressed to the parents. No list of children's birthdays.
  - The church's own VBS planning and teachers belong here with `also:["children"]`; inviting neighbors' children
    belongs in `children`.
- **pathfinders.**
  - The built-in ministry "Pathfinder & Adventurer club, open to the neighborhood" already exists; your ideas are
    specific mechanisms inside club life, never that idea again.
  - Good subjects: staff and counselor training, honors taught by members with the skill, Investiture as a real
    celebration, drill and marching done well, campouts, Pathfinder Bible Experience teams, TLT, service the club
    gives the town (with `reach:"out"`), and neighbors' children who join through their parents (`reach:"both"`).
  - Uniforms and camporee fees cost money: offer help quietly, and never announce who needed it.
- **adventurers.**
  - Parents are part of the club: most ideas include a parent or guardian with each child, or say how parents are
    involved (the Family Network).
  - Use the level names and patch words exactly as in Checked facts.
  - Neighbor families join through the parents (`reach:"both"`); a parenting evening open to the town is
    `reach:"out"` and may belong in `families`.
- **ay-youth.**
  - Teens lead: youth-led Sabbaths, a youth council with a real voice, teens on the platform with an adult mentor.
  - Mentoring happens in public places or in groups, with parental consent, and never one to one online.
  - Mission trips follow the conference's travel and insurance rules, with written consent and screened adults; see
    also `global-mission`.
  - Young adults (18 and over) and college students belong in `young-adults`.
- **interests.**
  - An interest list holds only people who asked (a card, a request, a sign-up), and only what they asked for. The
    interest coordinator and the pastor keep it, never a group chat, and anyone is taken off the moment they ask.
  - To their face they are friends and guests, never "interests", and never "prospects" (the validator fails
    "prospects"). The board hears counts, not names.
  - Studies go at the person's pace. Baptism, rebaptism or profession of faith is offered, never pushed, and follows
    the Church Manual.
  - Reclaiming is only for former members who say they would welcome it. No lists of "backsliders" (flagged).
  - Default reach is `"out"`: training the team or members' part in follow-up is `"in"`; a class where members and
    interests study together is `"both"`.
- **religious-liberty.**
  - Freedom of conscience for everyone, not only for Adventists: forums, letters and friendships with neighbors of
    other faiths and none, never an attack on another church.
  - Never partisan: no endorsing candidates or parties, and no politics from the pulpit.
  - Sabbath problems at work: help members know their rights and ask for a religious accommodation early and
    politely, and connect them with the conference PARL director. The church does not give legal advice; name the
    PARL department or an attorney as the partner.
  - A forum or letter-writing evening is usually `sabbath:false`; a Religious Liberty Sabbath service is `true`.
- **global-mission.**
  - Mission offerings go in full to the conference through the treasurer; nothing is kept locally, and nobody is
    thanked by amount or named as a giver.
  - Mission stories are told well: short, true, with the storyteller's own preparation, never a guilt appeal.
  - Short-term mission trips go where the church there invited them, work under local leaders, cost honestly, and
    never make a show of poverty. No photos of children without their parents' consent.
  - No selling on the Sabbath (`sabbath:false` for any fundraiser).

### Before you hand in (department themes)

1. `node validate.mjs themes/<themeId>.json` prints OK, and you re-read every REVIEW line.
2. Every Adventist name, number and day in your ideas is in Checked facts, or you checked it on an official site and
   added it there with its source.
3. `reach` is set on purpose wherever the theme's default does not fit, and a both-ways theme has a real mix.
4. Every idea with children or teens follows the safety rules above, and every Sabbath idea fits the Sabbath.
5. At least 30 of your 50 are things most churches have not tried.
