# Writing for the Terrain Idea Library

You are writing one theme: `themes/<themeId>.json`, at least 50 ideas in English and Spanish, for small and
medium Seventh-day Adventist churches in the United States. Read `themes.json` for your theme's scope, the list of
what belongs to a neighboring theme instead (`not`), and its related census tags. Read `SCHEMA.md` for the fields.
Finish when `node validate.mjs themes/<themeId>.json` prints `OK themes/<themeId>.json <n> ideas`, and after you
have re-read every REVIEW line.

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
- **Church-run programmes use screened adults**: background checks through your conference's program
  (Shield the Vulnerable in the North American Division; state law may add more, for example Pennsylvania's
  clearances for volunteers who work with children), **the two-adult rule**, and parental consent.
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
- **sabbath:** true only when the activity fits Sabbath hours by Adventist practice (worship, prayer, visiting,
  nature, mercy). False for buying and selling, fundraising, secular work, or sports competition.
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
| raffle, door prize, 50/50, lottery, bingo (flagged) | a free drawing is still a raffle: give everyone the thing |
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
