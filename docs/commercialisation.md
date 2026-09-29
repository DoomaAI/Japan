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
| `from` and `provider` per keepsake, `keepsakeMaterial()` | `src/shop-data.js` | Names the trip material a keepsake is made from and the print provider (none chosen), so ordering can become a server call that sends the family's own images. |

### Candidate partners to assess

| Category | Candidates | Notes |
|---|---|---|
| eSIM | Airalo, Ubigi, Holafly; Telstra and Optus roaming | Most eSIM sellers run affiliate programmes; check terms and payout. |
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

- A per-item "sorted" tick and a "worth it?" note for the next trip, kept in the trip state (needs a new server mutation).
- The pack on the run-up countdown and in push reminders.
- Ordering a keepsake from the app.

## Open questions

- Scope: Japan only at first, or any destination?
- Revenue: subscription, affiliate commission on bookings, or both? Affiliate terms decide which fare feed to use.
- Licensing: can each feed be stored, re-displayed and used to trigger alerts commercially? Run the external-source licence check on each before committing.
- Australian consumer law and privacy: price alerts must not mislead (ACL s 18, s 29 on price representations); alert and party data falls under the Privacy Act 1988 and the APPs.
- Polling cost: how often each watch is checked, and the cost per watch per month.
- Pricing for groups: charge the organiser, each member, or a fee per trip?
- Group size: design for a family of four to a group of about 20, or also for larger events such as weddings or company trips?

## Next step when picked up

A short design note (like `docs/design/maps-memories-tags.md`) covering the watch data model, the rating formula, the polling job, and the group and poll model. Then build a prototype with one fare feed, Open-Meteo, the sumo calendar, and open polls built on the existing planning board votes.
