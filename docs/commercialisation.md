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

## Open questions

- Scope: Japan only at first, or any destination?
- Revenue: answered in part under [Monetisation](#monetisation) below — a paid trip pass first, affiliate links second, no advertising. Affiliate terms still decide which fare feed to use.
- Licensing: can each feed be stored, re-displayed and used to trigger alerts commercially? Run the external-source licence check on each before committing.
- Australian consumer law and privacy: price alerts must not mislead (ACL s 18, s 29 on price representations); alert and party data falls under the Privacy Act 1988 and the APPs.
- Polling cost: how often each watch is checked, and the cost per watch per month.
- Pricing for groups: charge the organiser, each member, or a fee per trip?
- Group size: design for a family of four to a group of about 20, or also for larger events such as weddings or company trips?

## Monetisation

Added 29 September 2026. How a commercial version would make money, what one trip costs to run, and white-label options. Figures are planning estimates, not quotes; check them before any pricing decision. Currency is converted at A$1 = US$0.66.

### What one trip costs to run

A trip here means one family of four using the app from about three months before departure to a month after they get home.

**AI calls** are most of the cost. They are priced at September 2026 API rates:
- Opus 5: US$5 input / US$25 output per million tokens. This is the model the server uses today.
- Opus 5.5: US$4 / US$20.
- Sonnet 5.5: US$2 / US$10.
- Web search: US$10 per 1,000 searches.

Per-call figures are estimated from each call's `max_tokens` and search limits in `server/*.mjs`. The app does not yet keep a record of its usage.

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
| **Affiliate links** | See the breakdown below: **A$50–150** if a fair share of bookings goes through the app | **Recommended as the second income stream.** Links sit where the app already sends people: stop websites, booking windows (#210), the eSIM and arrival checklists, rail passes |
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

## Next step when picked up

A short design note (like `docs/design/maps-memories-tags.md`) covering the watch data model, the rating formula, the polling job, and the group and poll model. Then build a prototype with one fare feed, Open-Meteo, the sumo calendar, and open polls built on the existing planning board votes. Before either, add a record of AI usage per call (tokens and searches) so the cost-per-trip figures above can be replaced with measured ones.
