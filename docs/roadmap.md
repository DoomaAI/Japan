# Roadmap: gaps against commercial travel apps

**The pipeline is GitHub Issues labelled `pipeline`** ([issues](https://github.com/DoomaAI/Japan/issues?q=is%3Aissue+is%3Aopen+label%3Apipeline)), one per item, opened 30 September 2026 from the items left after #279 and #282: the Vercel provisioning failure (#284), the on-phone checks (#285), sound postcards on the replay (#286), the postcard provider (#287), a key per frame and email-to-frame (#288), the ledger on Flying home (#289), the stamp-book line on Show and tell (#290), gentle facts and the suggested dial bump (#291). This file stays the record of what was decided and why; the issues are what is next.

Compared against TripIt Pro, Wanderlog, Google Maps/Travel, Polarsteps, the Japan Official Travel App (JNTO), NAVITIME Japan Travel, Japan Transit Planner, Safety tips, Splitwise, Trail Wallet and TravelSpend. Written on 27 September 2026, day 7 of 16, so the order puts what helps during the rest of the trip first.


## UX review against hotel and event apps — logged 30 September 2026

Benchmarked against Marriott Bonvoy, Hilton Honors, World of Hyatt, IHG One Rewards, Accor ALL, Whova, Cvent Attendee Hub, Sched, Swapcard and Apple Developer / WWDC, on the app running at iPhone size in light and dark.

| # | Finding | Status |
|---|---|---|
| 01 | Launch blocked by the phrase and fact pop-ups | Done (#244): rows on the day in brief, marked New |
| 02 | Seven buttons along the bottom | Done (#259): Home · Plan · Wallet · Yen · More (boys: Missions, Food) |
| 03 | No stay card; tickets not pass-first | Done (#255, #256): Tonight's stay; Tickets becomes the Wallet, next passes first |
| 04 | Text down to 8px | Done (#245): 12px floor, boards aside, held by a test |
| 05 | No dark mode; status bar mismatched | Done (#250, #254, #258): Appearance choice, hand-set tokens, one-offs filled at build time |
| 06 | Delete and lock on the step card's top edge | Done (#238): into the ⋯ sheet |
| 07 | Explanation before the tool | Done (#253): Yen, Food, Tickets lead with the tool; switched-off features left off |
| 08 | No push reminders | Done separately (#214) |
| 09 | Meeting card overflow; weather from 21 Sept | Done (#235, #238) |
| — | Apple Wallet passes for stays and tickets | Not built: needs an Apple Developer pass-type certificate and a server-side `.pkpass` signer. What it is for, what it needs and why not this trip: [commercialisation.md](commercialisation.md#apple-wallet-and-google-wallet-passes) |
| — | First-run onboarding for a new family | Not built: the app is set up for one family. Logged for the commercial version in commercialisation.md terms |

## UX review against apps outside travel — logged 30 September 2026

The other direction from the review above: eighteen mechanics borrowed from apps nobody compares a trip app to (Domino's, iMessage Check In, Strava, Duolingo, Spotify, Up, Apple Fitness, Kitchen Stories, BeReal, Wordle, Kahoot, Waze, WHOOP, Raycast and others), each judged on whether it serves the boys, the grandparents on the follow-along link, or a parent under pressure. Nine are for the seven days left, starting with queue reports and Check In for the Disney days and a big-step mode for Haneda; the rest wait for after the trip. The full list, how each lands in what is built, and what was left out and why: [ux-adjacent-apps.md](ux-adjacent-apps.md).

## What a Japan specialist would still add — logged 30 September 2026

The app already holds most of a specialist agent's knowledge: route cards to the platform and exit, booking windows, tax-free rules, card fees, safety, the phrasebook and the menu reader. What it does not yet do is behave like one — watch the trip overnight, call before a problem lands, act on our behalf with our say-so, and adjust the rest of the trip from how each day went. Written on day 10 of 16 (Disney today, Tokyo from 1 October), so the first table is what still pays off this trip and the second is for the next trip or the commercial version. Actual booking stays outside the app by design; everything here stops at drafting and handing off.

### This trip

| # | Item | What it is | Builds on |
|---|---|---|---|
| 1 | Tomorrow's check — Built (`claude/specialist-tomorrow-planb-drafts`), not yet on a phone | A nightly pass, run by a Vercel cron in Japan time, that reads tomorrow's stops and searches for what would derail them: closing days, national holidays, last-entry times, rail works, typhoon and heavy-rain warnings, a forecast-driven swap. Writes sourced notes onto the day for a parent to accept or dismiss. 5 October is a Monday, when many Tokyo museums close; early October is still typhoon season | `server/research.mjs` search budget and prompt shape; `src/push-data.js` for the moment |
| 2 | Advice that becomes a draft change — Built (same branch), not yet on a phone | Ask about our trip reads and cannot act. It should be able to return a proposed reschedule that a parent applies in one tap | The reschedule preview and its overlap checks; `server/ask.mjs` |
| 3 | Dinner tonight | A 4 pm card near the evening stop: places that suit a family (kids welcome, non-smoking, no reservation needed, picture or English menu, cash-only flagged), a drafted Japanese reservation message, which channel the venue uses (TableCheck, Tabelog, phone only) and its cancellation rule | `server/nearby.mjs`, travel party food notes, the ticket translation |
| 4 | Plan B per day — Built (same branch), not yet on a phone | A fallback generated the night before and cached for no signal: the nearest indoor alternative to each stop for rain or a closed venue, and rest spots for a five-year-old's meltdown (department-store kids' floors, indoor playgrounds) | Suggestions, the day map, alternatives groups |
| 5 | Hotel-move concierge — Built (same branch), not yet on a phone | A card the day before and the morning of each move: checkout time, luggage-forwarding cutoff and counter, how to fill the label in Japanese, what goes in the overnight bag, bag-drop and early check-in at the next hotel. 1 October: Fantasy Springs to the Hilton | The pack-up reminder, Tonight's stay, tracker forwarding flag |
| 6 | Live door-to-door timing | Route cards are hand-written and leave-by pushes use a fixed travel estimate. A live transit timetable would name the actual departure, and add a last-train warning for the Giants night on 3 October | `src/route-data.js`, the leave-by push kind; needs a transit API decision |

### Next trip or commercial

| # | Item | What it is |
|---|---|---|
| 7 | Insider notes per stop — Built, not yet on a phone | Structured operational fields beyond fun facts: how the queue works (ticket machine first), payment accepted, stroller and toilet access, lockers, best hour to arrive, the common mistake. Researched once, reviewed by a parent, held offline |
| 8 | Crowd and timing intelligence | Best-time-to-go per stop and, on park days, live wait times. The official Disney and USJ apps hold these; decide whether to integrate or keep linking out |
| 9 | Etiquette keyed to stop type — Built, not yet on a phone | Shrine, temple, onsen, train, restaurant and the Osaka-versus-Tokyo escalator side, on the stop card, with a boys' version wired into missions |
| 10 | A guide that learns — Built, not yet on a phone | Ratings, hunts and noticings feed back into the travel-party profile so suggestions weight what actually landed. Today the profile is static and each AI call is stateless beyond a four-exchange thread |
| 11 | One persona across Ask, Nearby, Suggest and Tonight | A named guide with one voice and shared memory of what was rated, skipped and eaten. Prompt and context-pack work on the existing server modules |
| 12 | Human escalation — Built, not yet on a phone | A per-stay concierge card with drafted Japanese requests (restaurant booking, taxi, lost item), so the hotel books what a tourist cannot |

How 1, 2 and 4 were built: a Vercel cron (`vercel.json`, 19:30 Japan time) calls `/api/tomorrow-check` with `CRON_SECRET`; `server/tomorrow.mjs` runs the check and Plan B as two calls side by side, each saved as it lands, so one running long does not lose the other. Notes need a source whose site came back in the search, sit on the Plan tab under *Checked the night before*, and a parent accepts one (it goes into the stop's notes) or dismisses it; the day in brief names the first open one, and parents get a push when one needs action before morning. Plan B folds under the notes and on the stop card, kept in the trip for no signal. A parent can run either by hand for any day. Ask now carries step ids for the days it details and can return a draft (move, skip, or back to Options) for unbooked, unstarted stops; parents see it with the fixed times it would run into and apply it in one tap (`askDraftApply`), which rechecks everything and applies all of it or none. Plan B also reaches for our own list: board ideas no day has taken, stops in Options, and stops skipped or not done on earlier days; one near the route comes back tagged with where it came from and a parent adds it to the day in one tap. Item 5, the hotel-move concierge, is a Home card (next to Tonight's stay) the evening before and the morning of each move: bags to the desk by the cut-off, the forwarding label box by box in Japanese, the overnight bag with the forecast's additions, check-out and check-in, and tracked bags; the nightly run looks both hotels up the night before a move (forwarding cut-off, bag drop, early check-in), and a parent can look again. Logic in `src/day-check.js`, tests in `tests/specialist.test.mjs`. To switch on: `CRON_SECRET` (16+ characters) and `ANTHROPIC_API_KEY` in Vercel.

How 7, 9, 10 and 12 were built (1 October): **insider notes** (`src/insider-data.js`) are drafted the night before for the day's stops worth one — how the queue works, paying, stroller and toilets, lockers, best time to arrive, the common mistake — by the same nightly run, sourced, and shown on the stop card; a parent passes, corrects or dismisses each draft, and the boys see only what was passed. **Etiquette** (`src/etiquette-data.js`) is matched to the stop — shrine, temple, onsen, train, Shinkansen, eating out, snacks on the go, shops, park queues, taxis, and the escalator side by city — with a boys' version and a button that makes the stop's mission a boy's for the day. **The guide learns** (`src/taste-data.js`): stars on stops by theme, foods rated, themes skipped more than once and things noticed become a few lines per person, shown on each profile and sent with every suggestion, near-here search and question, weighted ahead of what the profiles guessed. **Ask the front desk** (`src/concierge-data.js`, on Tonight's stay) writes a restaurant booking, a taxi, something left behind, a doctor or a late check-out in polite Japanese, filled in with the party, ages and allergies, to show full screen or copy into the hotel's chat.

Nothing here reaches a phone until the Vercel provisioning failure logged below is fixed.

## Before, during and after — logged 29 September 2026

The trip has a before, a during and an after, and each should give the family a reason to open the app. Built in this order, one pull request each: the trip is under way, so the in-trip items come first, then the recap, then the before-the-trip items that pay off on the next trip.

| # | Item | Stage | What it is |
|---|---|---|---|
| 0 | Opening countdown — Done (#191) | All | Days to go, or which day of the trip it is, on the screen shown while the trip loads |
| 1 | Morning briefing — Done (#194) | During | A Home card: which day of the trip, how many stops, the fixed booking, the weather and the day's phrase |
| 2 | Tonight wrap-up — Done (#196) | During | An evening Home card: rate today's stops, vote for the photo of the day, leave a voice note |
| 3 | Stamp book — Done (#198) | During | Stamps for cities, temples and shrines, trains, foods and rides, earned from what the family has already ticked |
| 4 | Family leaderboard — Done (#199) | During | Who has tried the most foods, taken the most photos, found the most hunts and finished the most missions |
| 5 | Trip recap story — Done (#200) | After | Full-screen swipeable cards: the totals, each day's winning photo, everyone's top moment |
| 6 | Replay the trip — Done (#201) | After | The memory map played day by day, the route drawn as it goes |
| 7 | Photobook — Done (#202) | After | One printable page per day: the winning photo, the stars and the diary |
| 8 | One year ago today — Done (#203) | After | On each day's anniversary, Home shows that day's photo and what we did |
| 9 | Follow-along link — Done (#204) | After | A view-only link for family at home: diary and photos, no tickets, places or money |
| 10 | Countdown milestones — Done (#205) | Before | At 100, 50, 30, 14 and 7 days, a family task unlocks on the countdown |
| 11 | A little Japan each day — Done (#206) | Before | One fact and one phrase a day in the run-up to the trip |
| 12 | Sealed predictions — Done (#207) | Before | Everyone predicts the trip; the answers stay sealed until the recap reveals them |
| 13 | Ready to go — Done (#208) | Before | One progress bar for tickets, packing, profiles, votes and phrases |
| 14 | Hunt picks — Done | Before | The boys choose the hunts they want to do before they land |
| 15 | Trip shop — Done | Before and after | The essentials pack (adapters, cash, eSIMs, IC cards) by lead time, and keepsakes made from the trip; commercial seams logged in [commercialisation.md](commercialisation.md) |

## Printable travel guide — logged 29 September 2026

The original 72-page guide was designed once, from the plan as it stood before we flew. The plan has moved on since. This rebuilds the guide from the plan as it stands, in the original's structure and design, so an edited day prints as it now is.

| Original pages | Rebuilt as | From |
|---|---|---|
| 1 Cover | The original cover, with an edition line (days, nights, dates, printed on) | Cover image, trip dates |
| 13 Where we're staying | Our journey strip; a card per hotel with nights, dates, English and Japanese names and addresses, and its photograph cut from page 13 | Days' hotels, map locations |
| 14–17 Trip summary | The trip at a glance: every day, where, the day's title, what is booked to a time, the hotel | Days and fixed steps |
| 2–3 Before you go, phrases | Check before relying on it (plan notices and review steps); if you only remember six phrases | Notices, phrasebook |
| 19–72 Day chapters | Banner cut from the day's first original page; the day at a glance (up to five times, bookings always kept); numbered steps with times, places in Japanese, Booked / If time / Check flags and short notes; a sketch map numbered as the steps; a tip from our notes; the day's bookings; tonight's hotel; our photos from the day, or thumbnails of the original pages | Active steps (choices applied, skipped left out), documents, day map, photos |
| — | Keep this page: emergency and consular numbers, every hotel in Japanese to show a driver | Safety data, map locations |

Status: Done. Whole trip, from today on, or one day; toggles for original artwork, sketch maps and the front/back pages. Checked in headless Chromium: 20 sheets, 38 A4 pages for the whole trip.

Not yet done, for a later pass: per-day banner crops that avoid the original's baked-in titles; editorial pages (food, matcha, shopping, etiquette) generated from the hunts, food list and shortlist; page numbers in a running footer (browser print support for these is uneven, Safari especially); a server-side PDF so the file can be sent without a browser print dialog.
## Any gathering, not only a trip — logged 30 September 2026

The design note [docs/design/events-and-rsvp.md](design/events-and-rsvp.md) (#293) sets out plan types, invitations, RSVP by household, sign-ups, seating, vendors and run sheets, and a ten-step build order that brings tenancy forward. Step 1, the plan type and plan context, is built: every state now carries a plan record (type, time zone, country, currencies, languages, module switches) that the clock, the calendar, the menu and the look read, with a second test fixture that is a dinner in Sydney. The family trip is type Trip and switches off nothing. Step 2, people and open membership, is built: a record per member with a role and a household, every server check reading the plan rather than the four names, and links anyone can join with by saying their name. Step 3, the invitation and RSVP, is built: a public invitation link with the when and where read off the plan, answers by name that join the plan, and Who's coming and Invitation pages for gatherings. Added to the build order on 1 October 2026 (step 11): a dress code on the plan and invitation, and a what-to-wear line for the day from the forecast for the venue and hours, reused in the trip's day in brief. The trip half is built (`src/wear-data.js`, *What to wear* in the day in brief): how the temperature moves across the hours we are out (cool start, warm afternoon, cold by the end), rain hours, shoes for the walking load (theme-park days the most), and dress rules for the day's stops (temples, shoes-off, onsen, teamLab's water, rooftops, park costumes, counter dining, the deer, boats, a night game), plus any dress rule the night-before check finds on a venue's own page.

## Outstanding after the 29 September session — logged 30 September 2026

Nineteen PRs merged on 29 September (#211–#261, this session's share). Four things could not be finished from the cloud session and are yours to do; none is code.

- [ ] **Vercel.** Every deploy since #181 fails with "BUILD_FAILED · Resource provisioning failed". It is on the account or project side (Storage or integration settings), not in the build: `npm run build` passes on every branch. Until a deploy lands, nothing merged since #181 has reached a phone. Once one does, open the app on each phone so the six-month link renewal takes effect.
- [ ] **Neon link expiry.** The SQL to extend links already in the database to six months is parked. Only needed if a phone has been logged out before a deploy lands; the sliding renewal handles the rest.
- [ ] **Branch clean-up.** `git push --delete` is refused by the session's egress proxy (HTTP 403, organisation policy). The script `delete-merged-branches.sh` handed over in the session lists 125 remote branches whose tips are the head commits of merged PRs; run it from a clone with push rights. It keeps `claude/party-likes-recommendations`, `claude/list-save-card-condense-ohew3p` and five stale branches that conflict with main.
- [x] **Stray commit.** "What's on: dated events near where we stay" from `claude/party-likes-recommendations` was cherry-picked onto main on 30 September (its five conflicts resolved in main's favour, the events flag and route kept). The branch itself can go with the others.
- [ ] **On a real phone, once deployed:** Back and the edge swipe (#222), Appearance → Dark in Settings (#254), a first open of Games with no signal (#257, the offline shell must hold every chunk), and the Just say it box on the To-do list with dictation (#211).

## To come back to — logged 30 September 2026

**Passports & visas (#230)** is merged but switched off until the key is set, and has not been tried on a real phone.

- [ ] Run `openssl rand -hex 32`, add the result in Vercel as `VAULT_KEY` (Production), and redeploy.
- [ ] Keep a copy of `VAULT_KEY` somewhere safe, away from the app (a password manager). Lose it or change it and nothing stored can be opened.
- [ ] On Damien's phone: add a passport, photograph the photo page, check the number is masked until the eye is pressed, and that it hides again on leaving the app.
- [ ] On Lauren's phone: open the same passport and its photo.
- [ ] On Nate's or Boston's link: check Passports & visas is not in More, and that opening `?tab=vault` shows nothing.
- [ ] Add every passport (all four), and any visa and the travel insurance policy.
- [ ] Decide per phone whether to keep an offline copy (only on a phone with a passcode only that parent uses), then check it opens in airplane mode.
- [ ] After the trip: consider whether to keep the documents for the next trip or delete them.

**Built on `claude/road-features`, 30 September 2026, none tried on a phone:** hand this phone to a boy, held-back widgets out of Customise, the youngest purse in words; Home while we're away and the clocks-change note; Flying home (the card, the allowance, the scales); Lost something; the checkout sweep, the nightstand and price sense; Next time; the frame; Open next year, Show and tell, sound postcards and the postcard seam. Left from that pass:

- [x] Sound postcards on the memory map replay and in the highlights render plan (#286): each replay frame knows its stops, so the postcard recorded there plays as the replay or flyover reaches it, and a recorded flyover carries the sound.
- [ ] The postcard's print-and-post provider: TouchNote and Australia Post are linked as places to assess; nothing is integrated, the share sheet does the sending.
- [x] Show and tell's stamp-book line (#290): `stampsFor()` lists a boy's stamps, and the count is on the screen and in the spoken part.
- [x] Flying home counts the family ledger's shopping (#289): a ledger line that matches nothing on a list is added to the allowance, and a parent can mark one as already on a list.
- [ ] On a phone: the frame on an iPad and a TV browser (wake lock, dimming, the clap), the nightstand's wake lock, the sound postcard's twelve-second stop, the checkout sweep on a move day, and the hand-over strip.

**The frame** (the follow link in frame mode) uses the follow key itself. A key per frame, so one frame can be withdrawn without breaking a grandparent's phone link, and email-to-frame delivery for Aura, Nixplay and Skylight frames, are logged for the commercial version in [commercialisation.md](commercialisation.md) terms; the latter needs outbound email, which the inbound forwarding module does not provide.

**What the boys are ready for** is built on `claude/child-levels` (the reading and awareness dials in Settings, read by the facts, the notes, the phrasebook, the missions, Home's widgets, the menus and the model's brief) and not yet tried on a phone. Left for a later pass:

- [x] The purse for a boy at *With a grown-up*: a money box and "enough for a snack" rather than a yen balance. Built in #282 (`purseInWords`, Spending).
- [x] Fun facts kept gentle at *With a grown-up*: the three grim ones (Hachikō, the 1945 bombing, the funeral chopsticks) carry `gentle:false` and are left out of his queue, the Fun facts page and every card. Built for #291.
- [x] Customise Home no longer offers a held-back widget. Built in #282 (`heldBack`, Personalise).
- [x] "Nate's turn": a parent's phone handed to a boy until a passcode takes it back. Built in #282 (`hand-over.js`, HandOver).
- [x] The suggested bump: three katakana puzzles solved in a row put one line on a parent's day in brief offering his next reading step; Move it up goes through `childLevels`, Not yet is remembered on that phone (`src/level-nudge.js`). Built for #291.
- [ ] On a phone: a boy's link with each dial, the Settings section in dark mode, and that moving a dial reaches his phone on the next refresh.

## Backlog — logged 27 September 2026, to pick up later

| Item | When | What it needs first |
|---|---|---|
| 4. Web push notifications | At a computer | VAPID keys as Vercel environment variables, a subscriptions table in Neon, a Vercel cron job, and testing on each iPhone (Home Screen app, iOS 16.4+) |
| 6. Offline day maps | Done | A sketch map of each day on Today, drawn on the phone, so it needs no signal and no map tiles |
| 7b. Tax-free flag per shopping item | Done | A flag on shopping and shortlist items, and a per-shop total against ¥5,000 |
| 8. Visit Japan Web card | Done | Arrival paperwork page, with the Australia Travel Declaration for the flight home |
| 9. Trip highlights video | Built 1 October 2026; not tried on a phone | Rendered on the phone. Claude picks the shots and writes the captions; the page draws them on a canvas with the sound postcards and records the video. Details under After the trip |
| 10. Trip recap and photobook | Done (#200, #202) | Our trip story and the Photobook |
| 11. Follow-along link for family at home | Done (#204) | Built as a keyed read-only link rather than an invite role; see the plan above |
| 12. App Store and Google Play apps (commercial) | Parked 29 September 2026; after the trip | Decided: commercial, published by I'm In Ventures Pty Ltd on organisation accounts, cloud builds. First action: D-U-N-S number, company domain and email. Full log in [native-apps.md](native-apps.md) |
| 13. Choose your own look, or dress the trip by country | Queued 30 September 2026; after the trip, with the commercial build | Seam built: `LOOKS`, `COUNTRY_LOOKS` and `applyLook()` in `src/theme.js`, default *Match the destination*, Settings picker hidden until a second look exists. Next: design a second look (a CSS block under `:root[data-look=…]`), then read the country from the trip context (layer 1) instead of `TRIP_COUNTRY`. Log in [commercialisation.md](commercialisation.md#looks-chosen-by-the-person-or-by-the-destination) |

**Built but not yet checked on a real phone or with the live API:** the card fee lookup (needs `ANTHROPIC_API_KEY`), and every screen added in #149–#152, which has only been tried in a desktop browser at phone width.

## During the trip

1. **Done (#150).** **Safety and emergency page (offline).** 110 police, 119 ambulance and fire, Australian Embassy Tokyo and Consulate-General Osaka, the insurer's emergency line and policy number, the nearest hospital to each hotel, phrases for asking for help, and what to do in an earthquake or typhoon. Links to the Safety tips app.
2. **Done (#150).** **"I am lost" card for each boy.** His name, both parents' phone numbers and tonight's hotel in Japanese, in large type, to show a station attendant or a kōban officer.
3. **Done (#151).** **Family spending ledger.** Parents' spending alongside the boys' purses: amount in yen, category, cash or card, who paid, and an AUD total using the shared rate. Tracks against the daily budget in the travel party profile. Receipts can go through the existing document reader.
4. **Deferred.** **Web push notifications.** iPhone Home Screen apps have supported web push since iOS 16.4. Covers leave-by times, bookings coming up and "the plan changed". Needs VAPID keys set as Vercel environment variables, a subscriptions table and a Vercel cron — deferred until that can be done from a computer.
5. **Done.** **Train disruption and flight status.** To start with, one panel of links to JR East, JR West, Tokyo Metro and the Qantas flight status for that day's legs. Built as the **Is everything running?** Home widget: one status link per operator on the day's route cards, and Qantas and Haneda links on flight days. Live data can come later.
6. **Offline day maps.** A static map for each day, saved with the guide pages, for when there is no signal.
7. **Explainer done (on the shopping list); per-item flag not built.** **Tax-free shopping.** A short explainer (passport, stores with the tax-free sign, the minimum spend, keep the goods sealed) and a tax-free flag on the shopping list and purchase shortlist.
8. **Visit Japan Web.** A card with the official link and the steps: register everyone, enter each trip, and have the immigration and customs QR codes ready before landing. It only covers entering Japan, so for this trip it matters only if the app is used again. Put the Australian arrival paperwork for the flight home on the same card.

8a. **Done.** **Which card should we use?** Cards and their overseas fees, ranked for a shop payment or an ATM withdrawal, with fees looked up on the web.

## After the trip

9. **Built (1 October 2026).** **Trip highlights video.** It is on Looking back → Highlights video. `src/highlights-data.js` defines the shots, the edit list and its checks. `server/highlights.mjs` asks Claude for the edit list, using metadata plus up to 16 pictures, with a strict tool schema; the result is checked with `cleanEditList`. The automatic plan is used when there is no key. `src/Highlights.jsx` renders it at 1080×1920: Ken Burns on photos, clips playing, a card for each day and captions. The sound postcards and the clips' own sound go through the shared mixer into the recording. A parent can reorder, trim and re-caption the plan, and save the finished video to the family gallery. Not yet tried: recording on an iPhone (MP4) and the live planning call.
10. **Trip recap.** Totals for days, cities, stops, photos and top-rated moments, plus a printable photobook layout for the diary.
11. **Follow-along link for family at home.** A view-only link to the diary and photos, with no tickets, locations or invite rights.

## Not planned

- Booking, price alerts and deals. They are outside what a private family app is for. A commercial version with fare, condition and event watches is logged separately in [commercialisation.md](commercialisation.md).
- Route optimisation. The trip is already fixed, and the reschedule tool covers what is left.

## Highlights video design

The Claude API does not make video. It can look at images and read text, so its job is choosing and writing. Putting the video together happens elsewhere.

| Stage | Where | What happens |
|---|---|---|
| 1. Gather | Server | Collect each day's photo of the day, top-rated activities (4+), gallery photos and videos, and per-person thoughts and voice notes. `highlightsMaterial()` in `src/recap-data.js` already does the counting. |
| 2. Choose and script | Claude API, vision | Send thumbnails and metadata. Get back an edit list as structured JSON: ordered shots (document id, in/out seconds for video clips, duration), a caption for each, and title cards for each day. Existing images only, nothing generated. |
| 3. Render | Phone (recommended) | The browser draws each shot onto a canvas with a slow pan and zoom, adds the captions and records it to MP4. It needs no server, no cost and no size limit, and the original files never leave the private store. It runs on the phone that makes the video, with the app open, in about real time. |
| 3. Render (alternative) | Hosted render API (Shotstack, Creatomate or Remotion Lambda) | The same edit list is posted as a render job. It gives better transitions and music and works in the background, but costs per minute rendered and means signed URLs to private photos go to a third party. |
| 4. Save and share | Blob store | The finished MP4 is uploaded as a `memory` document, so it shows in the gallery and the diary like any other video. |

Constraints to check before building:

- HEIC photos and HEVC `.mov` videos decode in Safari but not in every browser, so render on an iPhone.
- The 60-second Vercel function limit rules out rendering on the server. The Claude call in stage 2 should fit.
- Music: use only tracks you own a licence for, or none. Voice notes make a good alternative soundtrack.
- AI-generated footage (Veo, Sora, Runway) is deliberately left out. The point is our own pictures.
