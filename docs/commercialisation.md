# Commercialisation log: trip watches and group coordination

Logged 29 September 2026, day 9 of 16. An idea for a commercial version of the app, not for this trip. It reverses the "Not planned: price alerts" line in the [roadmap](roadmap.md), which applies to the private family app only.

## The idea

A traveller sets the parameters of a trip they have not booked yet. The app watches fares, forecasts and event calendars, rates each possible travel window against those parameters, and alerts when a window meets or matches them.

## Parameters a traveller sets

| Parameter | Examples | Hard or soft |
|---|---|---|
| Fare watch | Return fare SYD–HND at or under a target price; cabin; carrier or alliance; max stops | Hard (price ceiling) or soft (scored) |
| Trip length | Min and max nights, e.g. 12–16 | Hard |
| Date range | Departure between two dates; blackout dates (school terms, work) | Hard |
| Conditions | Weather (temperature band, rain probability, no typhoon warning); swell (height, period, direction, wind offshore); snow depth | Soft, weighted |
| Must-have availability | A sumo basho in session, with tickets on sale; a festival; cherry blossom or autumn leaves forecast; a named restaurant or ryokan with a free night | Hard or soft |
| Party | Adults and children, ages (fares, under-6 free rides, ticket rules) | Input to pricing |

## How a window is rated

- A **window** is one candidate departure date plus trip length.
- Hard parameters filter windows out.
- Soft parameters each give a 0–10 score; the traveller's weights combine them into one rating (the app already rates in tenths of a star, #173).
- Alert levels:
  - **Matched:** every hard parameter met and the rating over the traveller's threshold.
  - **Close:** one soft parameter short, or the fare within a set margin of target.
  - **Changed:** a previously matched window dropped out (fare rose, forecast turned).
- Each alert explains why: which parameters were met, which missed and by how much.

## Forecast confidence

Weather and swell forecasts are only useful about 10–16 days out. Beyond that, the rating uses climatology (historical averages for that place and week) and is marked as such. The rating firms up as the window approaches, which should be shown, not hidden.

## Data sources to assess

| Feed | Candidates | Notes |
|---|---|---|
| Fares | Duffel, Amadeus Self-Service, Kiwi Tequila, Skyscanner partner API | Commercial terms, caching rules and rate limits vary; check before building |
| Weather | Open-Meteo (forecast and historical), JMA | The app already reads forecasts (`src/weather-data.js`) |
| Swell and surf | Open-Meteo Marine, Stormglass, Surfline (licensed) | Surfline is licensed data; Open-Meteo Marine is the low-cost start |
| Sumo | Nihon Sumo Kyokai schedule (six basho a year: Jan, Mar, May, Jul, Sep, Nov); ticket on-sale dates and sell-out | Existing sumo card reader (`server/sumo.mjs`) reads the official site; ticket availability has no public API |
| Other events | Festival calendars, JNTO, sakura and koyo forecasts (Japan Meteorological Corporation, weathernews) | Seasonal forecasts are published a few months ahead |

## What exists in this app to build on

- Forecast lookup per city and stop (`src/weather-data.js`, Weather page).
- Sumo schedule and day-card reading (`server/sumo.mjs`, `src/trip-features.js`).
- Fares on route cards (#176) and child fare rules.
- Star ratings in tenths (#173).
- Web push is designed but not built (roadmap item 4); alerts depend on it or on email.

## Group coordination

Added 29 September 2026. The same parameters, set by several people, with the group deciding between the options that come back.

### Accommodation parameters

| Parameter | Examples | Set by |
|---|---|---|
| Spend | Minimum and maximum per night, per room or per person; total cap for the stay | Each member (private) and the group |
| Stars | Minimum hotel class, e.g. 3★+ | Group |
| Guest rating | Minimum review score and review count, e.g. 8.5+ from 200+ reviews | Group |
| Location | Distance from an anchor (a station, venue, beach, another member's hotel); max minutes walking to a station | Group |
| Room set-up | Beds per room, family or connecting rooms, how many rooms, everyone under one roof or not | Organiser |
| Amenities | Onsen, laundry, kitchen, breakfast included, parking, lift, step-free access | Soft, weighted |
| Cancellation | Free cancellation until a set number of days before arrival; pay later or pay now | Group |
| Type | Hotel, ryokan, apartment, capsule, villa | Group |

### Each member's constraints

- **Dates:** each person marks when they can travel. The app shows the overlap, and any members who join late or leave early.
- **Budget:** each person sets their own ceiling, kept private. An option over someone's ceiling is marked "outside someone's budget" without naming them.
- **Needs:** dietary, access and medical notes; children's ages (fares and room rules).
- **Departure city:** fare watches are per person, since members may fly from different places.

### Voting and polls

| Tool | How it works | When to use |
|---|---|---|
| Thumbs up / down | One vote each, changeable, shown with names | Quick read on any option (already built for the family board, with must-do stars) |
| Must-do | Stars an option as a personal priority | Protects the one thing each person cares about |
| Veto | A limited number per person, e.g. one per trip | Rules out an option someone genuinely cannot do |
| Ranked choice | Order three to five shortlisted options | Choosing one hotel or one window from several |
| Open poll | Anyone asks a question with options or free-text answers | "Which night for the group dinner?", "Split the cost of a car?" |

Poll settings:

- **Deadline** and **quorum:** closes at a time or once enough people have voted.
- **Visibility:** named or anonymous; results hidden until you have voted, to stop people following the crowd.
- **Decision rule:** set up front. The organiser decides, a simple majority wins, or everyone must agree.
- **Ties:** reported as ties, left for the organiser to break (as the photo-of-the-day vote already does).
- **Nudges:** reminders to members who have not voted before the deadline.
- **Holds:** when a fare or room is only held until a set time, the poll closes before the hold expires.

### Linking watches to polls

- A matched window or accommodation option can be sent straight to the group as a poll option.
- Each option shows its rating, why it matched, and who it suits or excludes.
- Once a poll is decided, the result becomes the group's new watch, e.g. the chosen hotel is watched for price drops.

### Commitment and money

- **RSVP status** per member: in, maybe, out. The organiser sees who has committed before booking.
- **Deposits:** who has paid their share, and by when.
- **Splitting costs:** shared costs split evenly, by room or by person, with a running balance (like Splitwise). The family spending ledger (#151) is a starting point.
- **Roles:** organiser, member, view-only (as in roadmap item 11).

### Sign-ups with limited places

Added 29 September 2026. The organiser offers options that each member selects for themselves, sets how many places each option has, and chooses how places are given out. Examples: a cooking class for 8, two dinner sittings, a day tour with 12 seats, rooms of different sizes, a golf tee time for 4.

#### What the organiser sets

| Setting | Examples | Notes |
|---|---|---|
| Options | Tour A or tour B; 18:00 or 20:30 sitting; twin or triple room | Each option has a title, time, cost per place and notes |
| Places per option | 8 places; unlimited; a minimum to run (e.g. 4) | An option below its minimum at the deadline is cancelled or merged, as the organiser chooses |
| Choice type | Pick one; pick any; pick up to N; rank in order of preference | Ranking lets places be given out by preference when options fill |
| Allocation method | First come, first served; organiser selects; ballot | Fixed before sign-ups open and shown to everyone |
| Opening and closing | Opens 19:00 Friday; closes 48 hours before the activity | A set opening time gives everyone a fair start |
| Who counts | Adults, children, guests of a member | A child's place can require an adult on the same option |
| Reserved places | Places held for the organiser or a guide | Shown as held, not as free |
| Waitlist | On or off; how long an offered place is held (e.g. 12 hours) | Applies to all methods |

#### Allocation methods

| Method | How it works | Suits |
|---|---|---|
| **First come, first served** (default) | Places are confirmed in the order the server receives them. When an option is full, later sign-ups join its waitlist in order. | Casual activities; groups where speed is fair |
| **Organiser selects** | Members register interest, optionally ranked, with a short note. The organiser picks who gets each place before a set date; everyone else is waitlisted or told they were not selected. | Scarce or costly places; balancing across the group; skill or age limits |
| **Ballot** (optional third) | Registrations close, then places are drawn at random, honouring rankings where given. | High demand where neither speed nor judgement is fair |

For **organiser selects**, the selection screen shows each member's other allocations and how many first choices they have had, so places can be spread fairly. Selection notes stay with the organiser.

#### Initial policy

Decided 29 September 2026. These are the defaults a new sign-up starts with; the organiser can change any of them before sign-ups open.

| Setting | Default | Why |
|---|---|---|
| Allocation method | First come, first served | Simplest to understand and run; no work for the organiser after opening |
| Choice type | Pick one | Keeps places spread across the group |
| Places per option | Set by the organiser; no default | Must match what is actually held with the supplier |
| Minimum to run | None | |
| Opening | When the organiser publishes, or at a set time if one is given | A set time is recommended when demand is likely to exceed places |
| Closing | 48 hours before the activity | Leaves time to confirm numbers with the supplier |
| Waitlist | On; an offered place is held for 12 hours | Offers stop at closing; after that the organiser fills gaps by hand |
| Reserved places | None | |
| Children | Need an adult confirmed on the same option | |
| Deposit | Not required | Payment holds apply only when the organiser adds a deposit |
| Names | Shown to members of the group | Waitlist positions stay private to each member |
| Member cancellation | Allowed until closing; after closing, only through the organiser | |
| Switching method | Not allowed once the first place is confirmed | Changing the rules mid-way is unfair to those who signed up under them. To change method, the organiser closes the sign-up and opens a new one, and everyone is told. |
| Transfers | Not allowed | A released place goes through the waitlist, so the order stays fair |

#### Member status

Each member's status on each option is one of: **interested**, **confirmed**, **waitlisted** (with position), **offered** (a freed place, held until a set time), **declined**, **not selected**, or **cancelled**. The option shows places taken, places left and the waitlist length; names are shown or hidden as the organiser chooses.

#### Rules the system enforces

- **No overselling:** places are counted on the server in one transaction (a row lock in Postgres), never on the phone. A sign-up made offline is queued as a request, not a place, until the server confirms it; the phone says so. The app's pending-change queue already works this way for edits.
- **Clashes:** a member cannot hold two options at the same time; picking the second asks which to keep.
- **Waitlist promotion:** when a place frees up, the next person is offered it by push (#214) and email, with the hold time. An offer not taken in time passes down the list. Under organiser selects, the organiser can promote by hand instead.
- **Payment holds:** where a deposit is required, a place is confirmed only once paid; an unpaid place is released after a set time and offered to the waitlist.
- **Changes after opening:** the allocation method is locked once the first place is confirmed. Place numbers can be raised at any time, which promotes from the waitlist automatically; lowering them never removes a confirmed place and needs notice to everyone affected.
- **No transfers:** a member cannot hand their place to someone else. A released place goes to the waitlist, or back to open if the waitlist is empty.
- **Audit trail:** every sign-up, offer, selection and cancellation is timestamped, so any dispute over order or fairness can be answered.

#### What exists in this app to build on

- **Per-person choices and slots:** the Universal Express Pass panel already has one pick per person per ☆ choice, time windows, and a parent adding slots.
- **Individual picks:** hunt picks (#209) and the planning board's votes and must-do stars.
- **Split lanes:** Split the day (#197) already puts part of the party on one activity and the rest on another, meeting back up; an allocated option could land on each member's day the same way.
- **Notifications:** push (#214) for offers, reminders before closing and changes to an option.
- **Offline queue and roles:** the pending-change queue and the parent/child split in what each phone receives.

#### Considerations

- **Fairness and transparency:** the method, opening time and any reserved places must be visible before sign-ups open. First come, first served favours whoever has signal at the opening time; a ballot window (e.g. the first hour counts as simultaneous) is a middle path.
- **Paid places and refunds:** if a member pays and is not selected, or an option is cancelled for falling below its minimum, the refund terms must be stated up front (ACL consumer guarantees and unfair contract terms rules apply to standard-form terms).
- **Privacy:** selection notes, members' ranked preferences and waitlist positions of others are personal information under the APPs; show members only their own.
- **Supplier limits:** places often mirror a supplier's booking (a class of 8, a table of 10). The organiser's place count should match what is actually held with the supplier, and the hold's expiry should close sign-ups first (as for poll holds above).

### Group-specific considerations

- **Holding money for others:** collecting deposits and paying suppliers for the group may need an Australian financial services licence or an exemption. Use a payment platform that holds the funds (e.g. Stripe Connect) rather than the app holding them.
- **Privacy:** private budgets and needs must not reach other members' devices. The server already strips parent-only data from the boys' copies of the trip; the same approach applies.
- **Booking:** group rates and blocks of rooms (usually 8–10+ rooms) go through different channels from single bookings.

## Trip shop: the essentials pack and keepsakes

Added 29 September 2026. A first version is live in the family app under More → The plan → **Trip shop** (`src/TripShop.jsx`, `src/shop-data.js`). It sells nothing and earns nothing yet; the seams below are what a commercial version would build on.

### What it covers

| Part | When | Items |
|---|---|---|
| Essentials pack | Before, by lead time | Insurance (60 days), rail passes and big tickets (45), core cash (14), eSIM (7), plug adapters (7), IC cards (3), power banks (3), luggage forwarding (on the trip) |
| Keepsakes before | Before | Family shirts with each person's own character; bag tags and sticker sheets |
| Keepsakes after | After | Printed photobook, a photo-of-the-day calendar, the route as a wall print, a stamp book poster |

Each essential links to the shop or the official page and to the screen in the app that already covers part of it (Which card?, Packing, Booking windows, Safety). Each keepsake says whether the trip has given it enough material yet (characters, photos of the day, days, stops done).

### Seams built

| Seam | Where | What it allows later |
|---|---|---|
| `shopLink(url)` and `PARTNERS` | `src/shop-data.js` | Every outbound link goes through one function. A referral or affiliate tag is added per host in `PARTNERS`, and every link to that host picks it up. |
| `partnered(url)` | `src/shop-data.js` | Drives a plain disclosure line on the page and `rel="sponsored"` on the link as soon as any link carries a tag. |
| `lead` per essential, `essentialDue()` | `src/shop-data.js` | Days-before-flight for each item, so the pack can join the run-up milestones (#205), booking windows (#210) and push reminders (#214). |
| `shopLog` in the trip state, `shopLogged()` | `src/shop-data.js`, `server/features.mjs` | A parent's sorted or ordered tick, worth it or not, and a line for next time on every item. It is kept with the trip, so a later trip, or a commercial version's "what other families said", starts from it. |
| `from` and `provider` per keepsake, `keepsakeMaterial()` | `src/shop-data.js` | Names the trip material a keepsake is made from and the print provider (none chosen), so ordering can become a server call that sends the family's own images. |

### Candidate partners to assess

| Category | Candidates | Notes |
|---|---|---|
| eSIM | Airalo, Ubigi, Holafly, Saily; Telstra and Optus roaming | Affiliate at about 10% (Saily 15%), or white label through a reseller API; assessed under [eSIMs](#esims-logging-them-and-selling-them). |
| Cash and cards | Wise, Travelex; Seven Bank ATMs (information only) | Financial product referral: check whether it is general advice under the Corporations Act (s 766B) and whether an AFSL or authorised representative arrangement is needed. |
| Insurance | Direct insurers or a comparison service | Arranging or recommending insurance is a financial service; link to Smartraveller guidance only unless licensed. |
| Adapters, power banks | JB Hi-Fi, Officeworks, Amazon AU | Retail affiliate programmes vary by retailer. |
| Print on demand | Gelato (prints in Australia), Printful, Redbubble, Momento (photobooks) | Gelato and Printful have order APIs; Momento is Australian and print-only. Private photos would be sent to the provider: needs consent and a Privacy Act (APP 8) check on overseas disclosure. |
| Rail and tickets | Official JR Pass site, Klook, KKday | Resellers pay commission; official sites mostly do not. |

### Compliance to check before any link earns

- **Disclosure:** the ACCC expects paid or referral relationships to be disclosed clearly and up front (ACL s 18, s 29). The page already shows a line when any link is partnered.
- **Financial services:** anything recommending cards, currency or insurance may be a financial service under Chapter 7 of the Corporations Act.
- **Images of children:** keepsakes use the boys' photos and characters; a commercial version needs a parent's consent before any image leaves the private store.

### Not built yet

- The pack on the run-up countdown and in push reminders.
- Ordering a keepsake from the app.

## Looks: chosen by the person or by the destination

Queued 30 September 2026 (roadmap backlog item 13). Light and dark is already a per-phone choice; this is the other half: which palette and type the trip is dressed in. Today there is one look, the printed guide's, which suits Japan and nothing else.

### Seam built

| Seam | Where | What it allows later |
|---|---|---|
| `LOOKS` | `src/theme.js` | The list of looks. A new look is one line here and one CSS block under `:root[data-look=<id>]` redefining the palette names already declared in `style.css` and `guide-theme.css`. |
| `COUNTRY_LOOKS`, `TRIP_COUNTRY` | `src/theme.js` | Country (ISO 3166) to its look. The default choice is *Match the destination*, so a trip to Italy opens in Italy's look; a country with none of its own gets the first look. `TRIP_COUNTRY` is a constant until the trip context (build order layer 1) supplies it. |
| `readLook()`, `saveLook()`, `resolveLook()`, `applyLook()` | `src/theme.js`, `src/main.jsx` | The person's own choice, kept on the phone like light and dark, wins over the destination's. Applied as `data-look` on the page before the first paint. A retired look falls back rather than leaving the page bare. |
| Look picker | `src/Settings.jsx` | Under Appearance, hidden while `LOOKS` has one entry; it appears by itself once there is a second. |

### Not built yet

- A second look, and its night values alongside the existing `data-theme=dark` block.
- The country from the trip context, and per leg once a trip spans several countries (layer 8).
- A per-client look (logo, colours, fonts) for white label (layer 6); the same `data-look` hook carries it, set by the client rather than the person.
- Whether the choice follows the person across phones (kept with their profile) rather than staying on one phone.

## eSIMs: logging them, and selling them

Queued 1 October 2026 (roadmap backlog item 15). Today the eSIM is one line in the [Trip shop](#trip-shop-the-essentials-pack-and-keepsakes) essentials pack, with plain links to Airalo, Ubigi and Telstra roaming and a `shopLog` tick and note. This section logs two things: a record of each phone's eSIM, and whether a commercial version should sell eSIMs itself (white label) or send people to the seller's website (affiliate).

### Logging each phone's eSIM

Not built. The essentials pack records whether the family sorted an eSIM, not which phone has what. A record per phone would hold:

| Field | Why |
|---|---|
| Person and phone | Who it is on; a boy's phone may have none |
| Seller and plan | e.g. Airalo *Moshi Moshi* 10 GB, 15 days |
| Data allowance and valid from / to | Days left and a warning before it runs out on a long trip |
| Installed, switched on | Install at home on wi-fi; switch on at landing (arrival checklist) |
| Install code (LPA string or QR) | Kept in Passports & visas (`VAULT_KEY`), parent-only, not in the plan |
| Top-up link, support contact | One tap when data runs low or the line drops |
| Worth it, note | Already in `shopLog`; moves onto the record |

A sold eSIM (white label, below) would fill the record itself from the order; a bought-elsewhere eSIM is typed in or read from the seller's confirmation email by the existing document reader.

### Two ways to earn from it

| | Affiliate link to the seller's website | White label through a reseller API |
|---|---|---|
| How it works | The existing link carries a tracking tag; the person buys on Airalo's, Saily's or Holafly's site | The app shows plans, takes payment and installs the eSIM; a wholesaler (Airalo Partners, eSIM Access, Telna, 1GLOBAL) supplies it at a net price |
| Income per sale | About **10%** (Airalo and Ubigi 10%; Holafly 10%, up to 20% at volume; Saily 15% on new customers). One-off, 30-day cookie | The margin between our price and the net price. Airalo sets a minimum selling price; the net price is not published, so get a quote |
| Family of four, Japan, ~15 days | About A$140 of eSIMs → **about A$14** | Illustrative only: at a 25–35% margin, **about A$35–50** |
| Who is the seller | The eSIM company: payment, refunds, support, GST | **Us**: payment, refunds, chargebacks, first-line support (Airalo offers 24/7 support behind partners), GST on the full price once registered |
| Experience | Leaves the app; the plan is not recorded unless typed in | Bought, installed and recorded in the app; can be bundled into the trip pass |
| Install | The seller's QR or app | In app: from iOS 17.4 an install link can open the iPhone's own eSIM setup (verify with the wholesaler); Android has an equivalent carrier-app flow |
| Branding | Seller's | Ours. Some phones still show the wholesaler (e.g. "Airalo") as the network name |
| Build effort | One line per host in `PARTNERS` (`src/shop-data.js`); the disclosure line already appears | Order, payment (Stripe), webhook, refund and support flows; per-trip records; reconciliation |
| Upfront cost | None | None at Airalo (no sign-up or subscription fee); others vary |

Airalo Partners offers three tiers that sit between these: **Trusted Reseller** (Airalo-branded eSIMs through a dashboard, no developer), **white label** (our brand and price on Airalo's platform) and **API or SDK** (the store embedded in the app). The Airalo-branded tiers keep more of the telecommunications duties with Airalo.

### Australian rules to check before selling eSIMs ourselves

- **Telecommunications:** supplying a carriage service to the public may make the business a carriage service provider under the Telecommunications Act 1997. Eligible providers serving residential or small-business customers must join the **TIO scheme** (TCPSS Act 1999 ss 128 and 132) and follow the Telecommunications Consumer Protections Code. Whether a reseller of overseas data-only eSIMs is caught, or exempt, needs advice from ACMA guidance or a telecoms lawyer. Affiliate links avoid the question.
- **App stores:** data used outside the app is a service consumed outside the app, so Apple likely allows card or Apple Pay payment rather than in-app purchase (guideline 3.1.3(e)); confirm before building. Bundling an eSIM into the trip pass mixes a digital service (in-app purchase) with a physical-world one; price them separately.
- **Consumer law:** the seller carries ACL consumer guarantees (a line that does not work is a refund). Under affiliate, that is the eSIM company's; under white label, ours.
- **GST:** as the seller, GST is on the full sale price; as an affiliate, only on the commission.
- **Disclosure:** as for every partnered link (ACL s 18, s 29); recommendations of which eSIM to buy must not be ranked by commission.

### Recommendation

1. **Now (this trip):** nothing to sell. Optionally log each phone's eSIM by hand in the essentials note.
2. **First commercial step:** affiliate links. Add Airalo (Impact network), Saily and Holafly to `PARTNERS`; no build beyond that, no telecoms or refund exposure. About A$14 a family trip.
3. **With the multi-tenant build and the trip pass:** pilot white label through the Airalo Partner API (or eSIM Access as a comparison quote), starting on the Airalo-branded tier to keep telecoms duties with Airalo. Take the TIO and carriage-service advice first. This also builds the per-phone eSIM record above from each order, and is a natural extra for white-label agency clients.
4. **Decide on numbers:** get Airalo's net prices for Japan and compare margin against affiliate income at the expected volume; white label only pays once support and refunds are costed.

Sources consulted:
- [Airalo Partners: guide to becoming an eSIM reseller in 2026](https://blog.partners.airalo.com/blog/guide-to-becoming-an-esim-reseller-in-2026)
- [Airalo Partner API FAQ](https://developers.partners.airalo.com/faq-752238m0)
- [Can I build a complete white label experience using the Airalo Partner API?](https://airalopartners.zendesk.com/hc/en-us/articles/21068014955293-Can-I-build-a-complete-white-label-experience-using-the-Airalo-Partner-API)
- [Airalo affiliate programme FAQs](https://www.airalo.com/blog/airalo-affiliate-program-faqs)
- [Holafly affiliate programme](https://esim.holafly.com/affiliate-program/)
- [Ubigi affiliate programme](https://cellulardata.ubigi.com/pro/what-is-the-ubigi-affiliate-program/)
- [eSIM affiliate programmes compared, 2026 (Roamzy)](https://roamzy.io/blog/best-esim-affiliate-programs)
- [eSIM Access reseller platform](https://esimaccess.com/)
- [Telna: how to sell eSIMs for travelling](https://www.telna.com/how-to-sell-esims-for-travelling)
- [ACMA: TIO scheme requirements and exemptions](https://www.acma.gov.au/tio-scheme-requirements-and-exemptions)

## Open questions

- Scope: Japan only at first, or any destination?
- Revenue: answered in part under [Monetisation](#monetisation) below — a paid trip pass first, affiliate links second, no advertising. Affiliate terms still decide which fare feed to use.
- Licensing: can each feed be stored, re-displayed and used to trigger alerts commercially? Run the external-source licence check on each before committing.
- Australian consumer law and privacy: price alerts must not mislead (ACL s 18, s 29 on price representations); alert and party data falls under the Privacy Act 1988 and the APPs.
- Polling cost: how often each watch is checked, and the cost per watch per month.
- Pricing for groups: charge the organiser, each member, or a fee per trip?
- Group size: design for a family of four to a group of about 20, or also for larger events such as weddings or company trips?

## Store apps

The commercial version will ship as App Store and Google Play apps published by I'm In Ventures Pty Ltd (organisation accounts, cloud builds). What that takes is logged in [native-apps.md](native-apps.md).

## Apple Wallet and Google Wallet passes

Logged 30 September 2026, from the UX review against hotel and event apps. Not built.

### What it is for

A pass in the phone's own wallet, outside our app: tonight's hotel (dates, confirmation number, address) and each ticket or booking with its QR code. What it adds over the in-app Wallet:

- It appears on the lock screen at the right time and place (the hotel's address on arrival, a park ticket on the morning of the visit) without anybody opening the app.
- It opens with a double-press of the side button, with no signal and no app loading, at a hotel desk or a gate.
- The pass can be updated after it is added (a changed time or gate) and the change shows on the phone.
- Airlines, hotel chains and event platforms all do this, so travellers expect it.

### Why not for this trip

- Most of the family's scannable tickets are issued by other apps (Tokyo Disney Resort, USJ, smartEX, Qantas), and the QR has to come from them. A pass we made could only hold a copy of a screenshot, which the gate may not accept.
- The in-app Wallet (#256) already puts the next pass first and opens it full screen offline.
- It needs an Apple developer certificate we do not have (below).

### What it needs

| Need | Detail |
|---|---|
| Apple Developer Program membership | US$99 a year. The organisation account planned for the store apps ([native-apps.md](native-apps.md)) covers it |
| A Pass Type ID and its signing certificate | Created in the developer account; the certificate and its private key are kept as server secrets, never in the repository |
| A signer on the server | Builds `pass.json` and the images, and signs the bundle into a `.pkpass` file. An existing library can do this, or it can be written directly with Node's crypto |
| A download route | Serves the `.pkpass` with the `application/vnd.apple.pkpass` type; on an iPhone, Safari offers **Add to Apple Wallet** |
| Updates (optional) | An Apple push certificate and a small web service, so a changed time or reference reaches passes already added |
| Google Wallet (Android) | A Google Wallet issuer account and a service account; passes are created through Google's API and added with a signed "Save to Google Wallet" link |

### Where it would sit

An **Add to Apple Wallet** button on the stay card and on each booking we issue ourselves: the stay, a restaurant reservation, a meeting point. A ticket that belongs to another app links to that app instead. About a day's build once the certificate exists, plus testing on each iPhone.

## Monetisation

Added 29 September 2026. How a commercial version would make money, what one trip costs to run, and white-label options. Figures are planning estimates, not quotes; check them before any pricing decision. Currency is converted at A$1 = US$0.66.

### What one trip costs to run

A trip here means one family of four using the app from about three months before departure to a month after they get home.

**AI calls** are most of the cost. They are priced at September 2026 API rates:
- Opus 5: US$5 input / US$25 output per million tokens. The figures below are at this rate.
- Opus 5.5: US$4 / US$20. Every call has used this since 1 October 2026 (one setting, `OPUS` in `server/usage.mjs`), which takes about a fifth off the Opus 5 column.
- Sonnet 5.5: US$2 / US$10.
- Web search: US$10 per 1,000 searches.

Per-call figures are estimated from each call's `max_tokens` and search limits in `server/*.mjs`. Since 1 October 2026 every call is recorded by feature in `japan_usage` (tokens in and out, cache reads and writes, searches; nothing of the question or answer), and a parent can read the last 30 days at `GET /api/usage`. Replace these estimates with those figures once a trip's worth has built up.

| Feature | US$ per call (Opus 5) | Calls per trip (typical) | US$ per trip (Opus 5) | US$ per trip (Sonnet 5.5) |
|---|---|---|---|---|
| Ask, with web search | 0.29 | 40 | 11.70 | 5.40 |
| Nearby, with web search | 0.26 | 30 | 7.65 | 3.60 |
| Research a place, with web search | 0.38 | 25 | 9.38 | 4.50 |
| Suggestions | 0.28 | 10 | 2.75 | 1.10 |
| Read a booking PDF or forwarded email | 0.16 | 40 | 6.40 | 2.56 |
| Menu photo | 0.10 | 20 | 1.90 | 0.76 |
| Translate a ticket or sign | 0.04 | 60 | 2.70 | 1.08 |
| Photo coach | 0.04 | 60 | 2.40 | 0.96 |
| Quick capture and dictation (Opus 5.5) | 0.02 | 80 | 1.76 | 0.88 |
| Pay research, with web search | 0.35 | 5 | 1.75 | 0.85 |
| Sumo card | 0.17 | 10 | 1.75 | 0.70 |
| **Total** | | | **≈ 50 (A$76)** | **≈ 22 (A$34)** |

- **Range:** a light trip costs about a third of the typical figure and a heavy one about three times it. Usage per trip has to be capped, or a few heavy users will wipe out the margin.
- **Reducing it:**
  - Send lookups, translation and the photo coach to Sonnet 5.5, and keep document reading and suggestions on Opus 5.5.
  - Cache the trip context and system prompts that each call resends.
  - Together, these bring a typical trip to about **US$18–25 (A$27–38)**.
- **Planning-only watches** (fares, weather, events) add polling cost for each watch on top of this; that cost is still an open question below.

**Other running costs, per trip at scale**

| Item | Estimate | Notes |
|---|---|---|
| File storage and transfer (photos, tickets, voice notes, receipts) | US$1–3 | Assumes about 5 GB kept for 12 months on Vercel Blob |
| Database (Neon) | US$0.20–0.50 | |
| Map tiles | US$0.50–2 | Commercial use of the OpenStreetMap public tiles is not allowed, so a paid provider is needed (MapTiler, Stadia, Mapbox) |
| Inbound email, push notifications | < US$0.20 | Web push is free |
| Payment processing | 1.7% + A$0.30 (Stripe, domestic cards) | Or the app-store fee instead, below |
| **Total excluding AI** | **≈ US$3–6 (A$5–9)** | |

**Fixed monthly costs**, whatever the number of trips:
- Vercel Pro and Neon: about US$40–60.
- Commercial Open-Meteo plan: about €29+.
- Map tile plan: about US$25+.
- Email provider, monitoring and domain: about US$30.
- Apple Developer (US$99 a year) and Google Play (US$25 once).
- Legal work: privacy policy and terms.
- Total: roughly **A$250–450 a month before anyone's time.**

**All-in:** about **A$35–50 a trip** once model routing is in place, or A$80+ on today's all-Opus 5 setup. Any price for a trip has to clear this after store fees and GST.

### Ways to charge the traveller

| Model | How it would work | For | Against |
|---|---|---|---|
| Paid download | One price up front | Simple | Hard to sell an app nobody has tried; a one-off payment does not cover AI costs that grow with use |
| Subscription | Monthly or yearly | Recurring revenue | People travel once or twice a year, so they cancel between trips and resent paying the rest of the time |
| **Trip pass (in-app purchase)** | Free to plan one trip lightly; then **A$49–79 per trip**, covering the family, 12 months' storage and a set amount of AI use | Matches how travel happens; pays for the AI on each trip | Needs a meter for AI use and a clear message when the allowance runs low |
| Top-ups | Extra AI allowance, e.g. A$9.99 | Heavy users pay for what they use | Nickel-and-diming if the base allowance is too small |
| Keepsake extras | Printed trip book, video recap, photo-book export (#191 Trip Replay, the trip story) | High margin, bought after the trip when people are happiest | Printing needs a fulfilment partner |

**App-store fees.**
- Apple and Google take 15% under their small-business programmes (first US$1M a year) and 30% above that.
- Apple collects and remits Australian GST on app-store sales.
- A web app (PWA) sold through Stripe avoids the store fee. It loses store discovery, and some iPhone features are weaker.
- Selling direct, the business registers for GST once turnover reaches A$75,000.
- The trip pass is a digital service used in the app, so on iOS it must be sold through Apple's in-app purchase.
- Hotels, tours and other travel booked through links is a service consumed outside the app, which Apple exempts from in-app purchase (guideline 3.1.3(e)). Affiliate links are therefore allowed.

### Advertising, affiliate links, discounts and cashback

| Option | Likely revenue per family trip | Assessment |
|---|---|---|
| Display advertising | About A$1–3 (a short active period, a small audience, low rates for a utility app) | **Not recommended.** It clutters a calm, offline-first app, needs tracking consent, and for a family app with children as users it creates Privacy Act and app-store children's-category problems. Earns almost nothing |
| Sponsored placements (a tourism board or venue pays to be featured) | Negotiated; zero until there is scale | Later only, and clearly labelled. It conflicts with ratings and suggestions the family trusts |
| **Affiliate links** | See the breakdown below: **A$50–150** if a fair share of bookings goes through the app | **Recommended as the second income stream.** Links sit where the app already sends people: stop websites, booking windows (#210), the eSIM and arrival checklists, rail passes. The [Trip shop](#trip-shop-the-essentials-pack-and-keepsakes) seams (`shopLink`, `PARTNERS`, `partnered`) are where the tags and disclosure go |
| Discount codes (partner codes for Klook, eSIMs, luggage forwarding) | Small | Worth doing for the traveller's benefit; better to negotiate them through the affiliate programmes than chase them separately |
| Cashback (passing part of the commission back) | Cuts affiliate income by 30–70% | **Not at first.** Commissions are confirmed 30–90 days after the stay and clawed back on cancellation, so a payout system, reconciliation and fraud controls are needed. ShopBack and Cashrewards already own this in Australia. Revisit once there is volume |

**Affiliate income for a family Japan trip** (a family of four spending about A$20,000). Rates are from published 2026 affiliate rate cards and vary by programme and volume.

| Spend | Typical spend | Affiliate rate | Commission if all booked through the app |
|---|---|---|---|
| Hotels (Booking.com, Agoda, Expedia) | A$6,000 | About 3–5% of booking value: a 25–40% share of the site's own 10–15% commission | A$180–300 |
| Tours, activities, tickets (GetYourGuide ~8%, Viator ~8%, Klook 2–5%) | A$2,000 | 2–8% | A$40–160 |
| Rail passes, eSIM, transfers | A$1,000 | 5–10% | A$50–100 |
| Flights | A$8,000 | Close to nil; paid per click, or a markup through a booking API such as Duffel | A$0–40 |
| **Total** | | | **A$270–600 at 100%; A$50–150 at a realistic 20–30%** |

**Catches**
- **Timing:** most booking happens months before departure. Affiliate income only comes if the app is in use at the planning stage, which is where the watches and group planning above come in.
- **Cookie windows** are 24 hours to 31 days. If a booking isn't completed in that window, the commission is lost.
- **Honest recommendations:** ratings, suggestions and "Nearby" must never be ranked by commission. Say so in the app, and disclose affiliate links under ACL s 18 and s 29 and in line with the ACCC's guidance on disclosing paid relationships.
- **Travel insurance** is a financial product. Earning referral fees for it needs an AFSL, authorised-representative status or a referral exemption under the Corporations Act, and also brings in design and distribution obligations. Leave it out until advice is taken.

### White-label and business-to-business

The app's strongest parts are the day-by-day itinerary, reading forwarded confirmations into it, offline tickets, the family roles, and the follow-along link. These are what a travel business would otherwise have to build for its own clients.

| Buyer | What they get | Pricing model | Fit |
|---|---|---|---|
| **Japan-specialist travel agents and tour operators** | Their branding; the agent loads or forwards the itinerary; the client gets the app for the trip | A$25–60 per client trip, or A$300–1,500 a month per agency | **Best first market.** The agency finds and keeps the customers, the app replaces PDF itineraries, and one agency brings many trips |
| School, sports and group tours | The group coordination above, parent follow-along, roles, safety check-ins | Per traveller per tour, e.g. A$10–20 | Strong fit with existing features; child-safety and privacy duties are heavier |
| Wedding, events and corporate travel planners | Group polls, RSVPs, costs and deposits | Per event | Needs the payment-holding design flagged above (Stripe Connect) |
| Credit-card, bank and insurer travel perks | Bundled as a cardholder benefit | Yearly licence or per activated user | Large volumes, long sales cycles, heavy security reviews |
| Tourism boards and destination bodies | A destination edition with official content | Sponsorship or licence | Brings content and marketing, but makes the app less neutral |
| Licensing the engine (API) | Itinerary reading, day planning, translation | Per call with a markup on AI cost | Later; competes with the buyers above |

**Work needed before any white label or public release.** The app is built for one family today.
- **One family is written in.** The four family members are hard-coded (`MEMBERS` in `server/model.mjs`, and names in about 40 source files). The trip comes from `data/seed.json`. Multi-tenant accounts, trips, roles and data isolation are the largest single piece of work.
- **Guidebook rights.** The 72 guide pages are a scanned third-party guide. They cannot go into a commercial product without a licence; run the external-source licence check. Other data feeds (weather, sumo, maps) need the same check.
- **Branding and settings per client:** themes, logo, domain, and which features are switched on (the feature flags in `server/features.mjs` are a start).
- **AI limits:** a budget and meter for each client and each trip, and a record of usage (none is kept today).
- **Privacy and contracts:**
  - A privacy policy under APP 1.
  - Disclosure of cross-border transfers to US processors (Anthropic, Vercel) under APP 8.
  - A data processing agreement for business clients.
  - Retention and deletion rules.
- **An admin console** where agents can load and edit their clients' trips.

### Recommendation

1. **Sell a trip pass, not ads.** A free planning tier, then A$49–79 per family trip with an AI allowance. Route models to keep AI at about A$30 a trip or less.
2. **Add affiliate links where the app already points people.** Disclose them, and keep them out of ratings and suggestions. Expect about A$50–150 a trip once planning features bring people in months before they fly.
3. **Test white label with two or three Japan-specialist agencies** before building a consumer launch. This tests willingness to pay without consumer marketing costs, and forces the multi-tenant work that both routes need anyway.
4. **Defer** advertising, cashback, insurance referrals and the API licence.

Sources consulted for the rates above:
- [Web search tool pricing](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- [Tours and activities affiliate programs, 2026 (Track360)](https://track360.io/blog/tours-activities-experiences-affiliate-programs-operator-guide-2026)
- [Travel affiliate rate-card benchmark, 2026 (Track360)](https://track360.io/blog/best-travel-affiliate-programs-2026-operator-rate-card-benchmark)

### Cutting the AI bill: the traveller's own AI, and plain web services

Logged 1 October 2026, day 11 of 16. To pick up after the trip. The aim is a hard ceiling on what one trip can cost us, which the current all-in-house model does not have.

**What we cannot do.** Have people sign in with their Claude Free, Pro or Max account so the app uses their plan. Anthropic's terms limit those logins and their tokens to Claude.ai and Claude Code; a product must use API keys, and Anthropic has blocked third-party apps using subscription logins since January 2026.

**Three ways to move the cost, in the order to build them:**

1. **Plain web services and the phone itself, instead of the model, wherever no reasoning is needed.** Probably takes a typical trip from about US$50 to US$5–10 of AI; the usage log (`GET /api/usage`) will say how close.

| Feature | Instead of the model | Cost |
|---|---|---|
| Translate a phrase or ticket | DeepL API (free tier), Google Cloud Translation (free monthly allowance, then cents a page), or the browser's own translator | Free to cents |
| Menu or sign from a photo | Hand off to Google Translate's camera or Google Lens: live, and offline once the Japanese pack is downloaded. Keep our reader for allergies and dish notes | Free |
| Dictation and capture | The phone's speech-to-text (`src/dictation.js` already uses it); a plain parser for the common shapes, the model only when it fails | Free |
| Nearby | Google Maps search links (already the chips in `MAPS_NEARBY`) and OpenStreetMap search; Google Places only if ratings are needed (paid past its free tier) | Free |
| Research a place | Wikipedia and Wikivoyage, the official site and a Maps link | Free |
| Booking emails | Read the structured booking data many airline and hotel emails carry (schema.org reservations) first; the model only for the rest | Free |
| Pay research, etiquette, like a local | Written once per destination, not searched per question | Writing time |

   Left on the model: Ask, Suggestions, booking emails with no structured data, and the photo coach, routed to Sonnet 5.5 or Haiku 4.5 where quality holds.

2. **"Ask in your own AI" hand-off buttons.** A button opens Claude or ChatGPT with a prompt already written from the trip; the person sends it from their own account, Free included. Nothing to sign in to or build server-side, but nothing comes back into the app and the boys cannot use it. The pre-filled link is documented for Claude Desktop (`?q=`, about 14,000 characters); reports on the web and mobile apps conflict, so test on an iPhone and an Android before relying on it. ([Open Claude Desktop with a link](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link))

3. **A Claude connector (remote MCP server)** for parents who already use Claude. They add the app under Customize → Connectors, sign in to it with OAuth, and Claude reads the trip and adds ideas on their plan. Works on every plan, but a Free account is limited to one custom connector and runs out of messages quickly; realistically Pro and up. Adults only. Needs the access-control fixes first (per-household scopes, a real guest role) and an OAuth server of our own. Being listed in Anthropic's connector directory would make it one tap. ([Custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp))

**Bring your own API key** is allowed but left out: almost no family has an Anthropic Console account, and holding their keys adds risk and support calls.

**Tiers this suggests:** a free or cheap base app with no AI (plan, offline tickets, family sync) plus the hand-off buttons; the connector for Claude users at no AI cost to us; and a paid trip pass on our own AI, capped per trip. For the agency route none of this applies: the agency's clients will not have AI accounts, so the AI goes into the agency's price.

## Any group, any trip, any language: modular build order

Added 29 September 2026. What it would take to make the app work for any group, any trip (several places or countries) and any language, and the order to build it in so each part is modular and reusable. It expands the "Work needed before any white label or public release" list under [White-label and business-to-business](#white-label-and-business-to-business).

### What is written in today

| Assumption | Where |
|---|---|
| One family | `MEMBERS` in `server/model.mjs`; `BOYS` and the thank-you names in `src/trip-features.js`; the owner link is made as Damien (`scripts/create-owner-link.mjs`); about 360 name references in 69 files |
| One trip | A single row, `japan_trip` with id `family`, seeded from `data/seed.json` and the 209 hand-curated places in `data/map-locations.json` |
| One country | "Japan" in about 150 files; `Asia/Tokyo` in 21; yen in 38; the `japanese` field on steps and places; `81` as the default dialling code |
| One home country | Australia and AUD in about 50 files: consulates, the Australia Travel Declaration, Qantas, card fees, `en-AU` dates |
| One language | English UI with no string layer; all 16 AI server modules name Japan in their prompts |
| Japan-only content | Sumo, hanafuda, karuta, shogi, kana, Express Pass, IC cards, Visit Japan Web, tax-free, the phrasebook |
| Hand-wired features | Each feature is wired into `server/features.mjs`, `src/trip-features.js` and `src/main.jsx` by hand |

### Language is three settings, not one

| Setting | Belongs to | Drives |
|---|---|---|
| App language | Each member | UI strings, date and number formats |
| Destination language | Each leg of the trip | Phrasebook, speech, "show the driver" cards, ticket and menu translation |
| AI answer language | Each member | The language Ask, Nearby, research and the readers answer in |

### Principles

- **Seams before features.** Nothing is built for the commercial version until what it depends on can be swapped.
- **A second-trip test.** Keep a fixture trip that is not this family and not Japan (e.g. six adults in Italy). Every step must pass with both.
- **This family is tenant one.** The family trip stays on the same code throughout, so it keeps testing each change.
- **Only generalise what exists.** Build the module contract from the features already here, not imagined ones.

### Build order

| # | Layer | What it is | Why here |
|---|---|---|---|
| 0 | Guardrails | The second-trip fixture; AI usage recorded per call; no new family-only features | Cheap; shows what breaks at every later step and replaces the cost estimates with measured ones |
| 1 | Trip context | One object for members, roles, time zone, currency, country, languages and home country; every hard-coded value reads from it | Mechanical and low-risk; everything later depends on it |
| 2 | Tenancy | Accounts, trips and memberships; `trip_id` on everything; roles by type (organiser, adult, minor, viewer); `server/visibility.mjs` filters by role, never by name | Needed by every commercial route. Each trip can keep its JSON state for now |
| 3 | Module contract | Each feature declares its id, the state it owns, its server operations and checks, what each role sees, its screens, Home widgets, menu entry, and what it needs (AI, push, a destination pack). A registry replaces the hand wiring | Only now can features be switched on per client, priced or reused |
| 4 | AI gateway | One path for every AI call: prompts built from the trip context, model routing, prompt caching, a meter and a budget per trip | Can run alongside 2 and 3; needed before any price per trip can be relied on |
| 5 | Destination packs | Japan content extracted as the first pack (phrases, safety, arrival, transport, tax, facts); modules declare the pack content they need; a generic fallback pack | Needs 1 and 3 |
| 6 | Per-client configuration | Theme tokens, logo, domain, feature toggles, plan tier | White label rests on 2 and 3 |
| 7 | Admin console | Agents create, load and edit client trips and reissue links | What an agency buys |
| 8 | Several countries per trip | Legs, each with its own time zone, currency and languages; home currency and home country per member | When the market needs it |
| 9 | App translation | UI strings extracted, locale formatting, right-to-left layouts, fonts per script | Last; least value while the first buyers are English-speaking agencies |

### Feature tiers for the module contract

| Tier | Examples | Reuse |
|---|---|---|
| Core, always on | Itinerary, steps and choices, documents and tickets, sync and the offline queue, roles, inbox reading | Every client |
| Standard modules | Ledger, packing, weather, photos and diary, recap, follow-along, voting, safety | Toggled per client |
| Destination-bound | Sumo, Express Pass, IC cards, tax-free, Visit Japan Web | Only with their pack |
| Family and fun | Games, stamps, bingo, mascots, leaderboard | A family bundle, possibly a paid extra |
| Private to this family | Thank-you notes; Passports & visas as currently set up | Stay private; not sold |

### Commercial milestones

| Milestone | Layers | Not needed yet |
|---|---|---|
| M1: pilot with two or three Japan-specialist agencies | 0–4, 6, a basic 7 | Other countries, other UI languages |
| M2: consumer trip pass | Adds 5 with a second destination, and a trip-setup wizard | Several countries per trip |
| M3: any destination, any language | Adds 8 and 9 | |

### Risks to settle early

- **One JSON document per trip** is fine for tenancy. Sign-ups, polls and deposits need real tables with row locks, as set out under [Sign-ups with limited places](#sign-ups-with-limited-places); move them when they are built.
- **The scanned guide** stays out of every module except this family's trip until it is licensed.
- **Safety content drafted by AI** (emergency numbers, visa rules) for a new pack is reviewed by a person before it is shown.

## Launch requirements: name, domain, legal and compliance

Parked 1 October 2026; after the trip, with the commercial build. Nothing here is decided or bought. It gathers what a public launch by I'm In Ventures Pty Ltd normally needs, so none of it is found late. Store-specific items (D-U-N-S, developer accounts, privacy labels) are in [native-apps.md](native-apps.md); this section covers the rest and points there rather than repeating it.

### Product name

One name for the web app, both store listings and the trade mark. Not chosen.

| Check | Where | Note |
|---|---|---|
| Trade mark clearance | IP Australia trade mark search; WIPO Global Brand Database for overseas markets | Classes 9 (apps), 39 (travel arranging), 42 (software as a service). A purely descriptive name ("Trip Planner") is hard to register and defend |
| Business name | ASIC business names register | Register it as a business name of I'm In Ventures Pty Ltd if it differs from the company name |
| Store listings | App Store (30 characters) and Google Play | Name must be free on both and match the trade mark |
| Domain and handles | See below; Instagram, TikTok, X, LinkedIn | Secure at the same time as the domain |
| Meaning in target markets | Japanese and any later destination languages | Check the name does not read badly in translation |
| Open question | | Whether the product carries the company's "I'm In" name or has its own |

Once chosen: file an Australian trade mark application (about A$330 per class online), and consider a Madrid Protocol extension to Japan, the US and the UK before launching there.

### Domain names

| Item | Note |
|---|---|
| Primary | `.com` and `.com.au` for the chosen name; `.com.au` needs an Australian presence, which the company's ACN gives |
| Defensive | The `.au` direct name (auDA gives `.com.au` holders priority), `.app`, and common misspellings, redirected to the primary |
| Company domain | Needed first, before the name is settled: Apple organisation enrolment requires a company website on its own domain and a company email ([native-apps.md](native-apps.md)) |
| Set-up | Registrar with auto-renew and registry lock; DNS on Vercel; email on the domain with SPF, DKIM and DMARC; `apple-app-site-association` and `assetlinks.json` for app links |
| Hosts | Marketing site on the root; the app on `app.` (or the root if there is no separate site); `api.` only if the API is licensed |

### Legal documents

| Document | What it covers | Basis |
|---|---|---|
| Privacy policy | What is collected (names, ages, photos, location, allergies, receipts), why, who it goes to, overseas recipients, access and correction, complaints | APP 1; App Store and Play require a public URL |
| Collection notices | Shown at sign-up and when photos, location or allergy details are first collected | APP 5 |
| Terms of use | Licence to use, accounts, acceptable use, user content, AI output not to be relied on for safety, visa or medical decisions, liability limits that survive consumer guarantees | ACL; unfair contract terms rules (penalties since November 2023) |
| Subscription and refund terms | Trip pass price, renewal, cancellation and refunds; store-purchase refunds go through Apple and Google | ACL consumer guarantees and price representations |
| End-user licence for the store apps | Apple's standard licence or our own | App Store Review Guidelines |
| Affiliate and advertising disclosure | Where links earn commission; kept out of ratings and suggestions | ACL s 18 and s 29 |
| AI disclosure | Which features use AI, that content goes to Anthropic for processing, and any automated decisions (such as sign-up allocation) | APP 8; the APP 1 automated-decision disclosure in force from 10 December 2026 |
| Children | Accounts for minors only through a parent; what a child sees; consent | APPs; OAIC Children's Online Privacy Code (in development); Apple and Google family policies |
| Cookie and analytics notice | Only if analytics or tracking is added | APPs; ePrivacy and GDPR if offered in Europe |
| Business clients (white label) | Master services agreement, data processing agreement, service levels, acceptable use | Contract; clients' own privacy duties |
| Marketing email | Consent, sender identity and unsubscribe | Spam Act 2003 |

Have the documents drafted or reviewed by a lawyer before launch; generator templates miss the health-information and children's points.

### Privacy and data protection

- **Privacy Act 1988 and the APPs apply in practice.** The small-business exemption (turnover under A$3 million) should not be relied on: allergy details are health information, and business clients and the app stores expect compliance regardless.
- **Notifiable Data Breaches scheme:** a written breach response plan, with assessment within 30 days and notice to the OAIC and those affected.
- **Statutory tort for serious invasions of privacy** (in force since June 2025): another reason to keep location and photos tightly scoped.
- **Overseas disclosure (APP 8):** Anthropic, Vercel and any US processor named in the policy; prefer Sydney regions (Vercel and Neon both offer them) for stored data.
- **Retention and deletion:** a rule per data type, and an account-deletion path in the app (Apple and Google require one).
- **Other jurisdictions:** GDPR and UK GDPR if sold to European or UK travellers (EU representative, lawful basis, data subject rights); Japan's APPI if Japanese users or agencies are signed.
- **Privacy impact assessment** before launch, and again before sign-ups, payments or location sharing ship.

### Security and ISO standards

| Standard | What it is | When |
|---|---|---|
| ACSC Essential Eight | Australian baseline controls (patching, MFA, backups, admin privileges) | Before launch; low cost |
| ISO/IEC 27001 | Certified information security management system | When a business client or tender asks for it. Allow 6–12 months and roughly A$30–80k for a first certification with an auditor |
| ISO/IEC 27701 | Privacy extension to 27001 | With 27001; maps to the APPs and GDPR |
| ISO/IEC 27017 and 27018 | Cloud security and personal data in public cloud | Added to the 27001 scope at little extra cost |
| ISO/IEC 42001 | AI management system | Optional; useful for agencies and enterprise buyers asking how AI is governed |
| SOC 2 Type II | US attestation, often accepted in place of 27001 | Only if selling to US businesses |
| PCI DSS | Card data | Kept out of scope by taking payment only through Stripe or the app stores (self-assessment SAQ A) |
| WCAG 2.2 AA | Accessibility | Before launch; Disability Discrimination Act 1992 and business clients' procurement |

Before any certification, the groundwork is the same: an information security policy, risk register, access control, logging and monitoring, backups with restore tests, vendor assessments (Anthropic, Vercel, Neon, Stripe), incident response and a penetration test.

### Company, tax and insurance

- **IP ownership:** all code, designs and content assigned to I'm In Ventures Pty Ltd, including work by contractors and by this repository's contributors.
- **Third-party rights:** the scanned guide and every data feed need a licence (already logged above); an open-source licence audit of dependencies.
- **AI provider terms:** Anthropic's commercial terms and usage policy cover the intended use, including children as end users.
- **GST:** register once turnover will pass A$75,000; prices shown GST-inclusive. Apple and Google collect GST on store sales; web sales are ours to report.
- **Insurance:** professional indemnity, cyber, and public and product liability.
- **Support and complaints:** a support address on the domain, a complaints process (APP 1 and ACL), and a contact for the stores' listings.

### Order when picked up

1. Shortlist names; run the trade mark, business name, domain and store checks together.
2. Register the company domain and email first (the store accounts wait on them); the product domain once the name is cleared; file the trade mark.
3. Lawyer drafts the privacy policy, terms, subscription terms and children's terms; privacy impact assessment alongside.
4. Essential Eight controls, breach response plan, retention rules and account deletion before launch.
5. ISO 27001 (with 27701 and 27017/27018) when the first business client asks.

## Next step when picked up

A short design note (like `docs/design/maps-memories-tags.md`) covering the watch data model, the rating formula, the polling job, the group and poll model, and the sign-up model (options, places, allocation method, statuses and waitlist). Then build a prototype with one fare feed, Open-Meteo, the sumo calendar, and open polls built on the existing planning board votes. Before either, add a record of AI usage per call (tokens and searches) so the cost-per-trip figures above can be replaced with measured ones.
