# Design note: any gathering, not only a trip

Status: a brainstorm and a first specification for the commercial version, being built in the order at the end. Nothing here changes what the family trip shows.

- **Built:**
  - Step 1, the plan type and plan context: `src/plan-context.js` (types, the record, module switches, the checks), the plan record on every state through `ensureFeatures`, the `planSettings` operation, the clock in `src/timing.js` reading the plan's time zone and the calendar computing instants from it, the menu in `src/nav-data.js` dropping a type's modules, the look reading the plan's country, and **This plan** under Settings for a parent. The second fixture, a dinner for six in Sydney, is `tests/fixtures/dinner.json`, run by `tests/plan-context.test.mjs`.
  - Step 2, people and open membership: `src/people.js` (a record per member with a role, a household, when and how they joined; the checks on a name; joining; changing a role or household, never removing the last organiser), the records on every state through `ensureFeatures` with the family upgraded in place, every membership check on the server reading the plan rather than a constant, `memberAdd`, `memberRole` and `memberHousehold` operations, **links anyone can join with** (an open grant with a role, an optional household and a use limit; a joiner names themselves on the join screen, goes on the plan, and gets a personal link of their own, so revoking the open link stops new joins and nobody already in), and the Family screen showing each person's role in the plan's own words (parent editor and family member on a trip, organiser and guest elsewhere). Check-in visibility reads the plan's parents.
  - Step 3, the invitation page and RSVP: `src/rsvp-data.js` (the invitation record and its checks, the when and where read off the plan's first fixed stop or a chosen one, the answer record and its checks, closing on the reply day, the caterer's counts, a CSV, the public allow-list view and what a guest may see of the others), `invitationEdit` and `rsvpSet` operations, a public link minted and withdrawn by a parent like the follow-along link (`invite-link`, `GET invitation`, `POST rsvp`), a guest answering by name from the link and joining the plan as a guest with a session of their own, **Who's coming** for everyone (own answer, counts, names when shared; for a parent the list, the caterer's heads and dietary needs, answering for anyone, the CSV) and **Invitation** for a parent (the words, the switches, up to eight questions, save the date, publish, the link). Both pages are on for every kind of plan but a trip.
- **Not built:** steps 4 to 10 below. Nudges by push, a cover image, per-event answers within a plan (ceremony and reception), and households as records of their own come with the wedding step; removing a person with the sign-ups step. The two role names on the wire stay `parent` and `child`; only their labels follow the plan type. Removing a person, and households as records of their own, come with RSVP in step 3.
- **Still written in after steps 1 and 2:** the yen helpers and `¥` formatting (the record carries the currency; nothing reads it yet), `en-AU` dates on the phone, the `+09:00` offsets in about twenty files outside `timing.js`, the family's names in `BOYS`, the thank-you notes, the parents' contact numbers and the AI modules' schemas (family-private content, and the prompts of layer 4), and the destination content (layer 5).

Date: 30 September 2026 (trip day 10 of 16).

## What was asked

- Make the app usable for everyday group plans, not only trips: a dinner, a day out, a party.
- Invitations and RSVP, and registrations where places are limited.
- Weddings and events of that size, with the ideas and specifications that follow from them.

## The one-line design

A trip is already a **plan**: days holding timed steps, with people, roles, votes, documents, money and photos attached. Every gathering below is a plan with a **type**, and the type decides which modules are on. What the trip app lacks is around the plan, not inside it: people join by link rather than by a fixed name list, there is a public **invitation** a stranger can land on, and an **RSVP** record exists per guest. Everything else on this page is a module that reads those three things.

## Plan types

| Type | Length | People | Modules on by default | Modules off |
|---|---|---|---|---|
| Outing (dinner, drinks, a day out) | Hours to a day | 2–20, known to each other | RSVP, date poll, meeting point, leave-by, bill split, photos | Invitation page, seating, registry, packing |
| Party (birthday, housewarming, farewell, kids' party) | Hours | 10–80 | Invitation page, RSVP with headcount and dietary, bring list, gift list, photo wall, thank-yous | Seating, run sheet, accommodation |
| Registration (class, tour, tee time, team dinner, club night) | Hours | Members of a group | Sign-ups with places, waitlist, deposit, reminders | Invitation page, seating |
| Wedding (and engagement, milestone anniversary, big birthday) | A day, often three | 40–250, in households | Save the date, invitation, household RSVP, meal choice, seating, run sheet, vendors, accommodation and transport, registry, photo wall, thank-yous, one year on | Games, missions, packing |
| Multi-day event (offsite, reunion, conference, sports carnival) | 2–5 days | 20–500 | Registration, sessions with places, accommodation, run sheet, name badges, follow-along | Seating by table, registry |
| Trip | Days to weeks | A family or a group | Everything built today | Invitation page, seating |

A **destination wedding** is a Wedding plan with a Trip plan around it: the trip carries flights, stays and days out for the travelling guests, the wedding carries the day. A plan can therefore hold child plans, which also covers a conference with an evening dinner and a school camp with an excursion.

## The three new records

### Membership by link

Today `MEMBERS` is four names and a grant is minted for one of them. For any gathering:

- The organiser mints an **invite link** per household (weddings) or one open link per plan (parties, outings). Tokens, hashes, cookies and expiry work as the family link does now.
- A person **joins by naming themselves** on first open; membership is created then, not seeded. A guest can add the people they answer for (partner, children, a plus-one placeholder).
- Roles by type, never by name: **organiser** (one or more; a couple, a parent, a club secretary), **helper** (a bridesmaid, a co-host: edits some modules, reads the guest list, cannot delete the plan), **guest**, **vendor** (reads the run sheet and their own items only), **viewer** (the follow-along link, unchanged).
- `server/visibility.mjs` filters by role. The parent and child split becomes organiser and guest, and the boys' phones become the minor role.

### Invitation

A plan has one invitation, published or not, at a public URL that needs no sign-in.

| Field | Notes |
|---|---|
| Title, hosts, cover image or short video | The cover is the one public asset, as the guide cover is today |
| Date and time; end time; time zone | Add to calendar (`.ics`) from the existing calendar import in reverse |
| Place, address, map pin, parking, public transport | The route card and the "show the driver" card, in the plan's language |
| Dress, what to bring, children welcome or not, gifts note | Free text with the organiser's tone |
| Save the date | A first version with the date only; the full invitation replaces it later, same link |
| RSVP by | The deadline; answers close after it unless the organiser reopens |
| Questions | Per plan: meal choice, dietary needs, song request, transport needed, staying where, arriving when. Each question is per guest or per household |
| Visibility | Anyone with the link; or invited households only (the link carries the household token) |
| Language | The invitation renders in the plan's language and each guest's app language where strings exist |

Design decides the invitation. Partiful and Luma are the benchmarks for a party page; a wedding needs a quieter page with the couple's typography and a print-matching look. The looks seam in `src/theme.js` (`LOOKS`, `applyLook`) is the hook: a look per plan, chosen by the organiser, with a second look designed for weddings before any other.

### RSVP

One record per **guest**, grouped by **household**.

| Field | Values |
|---|---|
| Status | invited, opened, in, maybe, out, no answer by deadline |
| Answered by, answered at | The household member who answered for this guest |
| Count | Adults, children with ages, a plus-one not yet named |
| Answers | To the invitation's questions: meal, dietary, transport, accommodation, arrival |
| Events within the plan | For a wedding: ceremony, reception, recovery brunch; in or out per event |
| Note to the hosts | Private to organisers |

Rules:

- A household answers for its own people only. The organiser can answer for anyone (the phone call from an aunt).
- A guest can change an answer until the deadline; after it, only the organiser can.
- Headcounts are computed on the server from confirmed guests, never on the phone, so caterer numbers are one query.
- Plus-ones: the organiser sets per household whether a plus-one is allowed; the guest names them on answering; an unnamed plus-one counts for catering but not for seating until named.
- Children: the organiser sets whether children are invited per household, so "adults only" is enforced by the form, not by an awkward message.

## Module ideas, by gathering

### Everyday outings

- **Date poll** with a deadline and quorum, from the poll settings already logged; the evening with the most "in" wins, ties to the organiser.
- **Where shall we eat** from the Nearby module with the party's food notes, one tap to make it the place.
- **Meeting point and leave-by** pushes from the existing leave-by kind, with "running late" as a one-tap check-in.
- **Bill split** on the ledger: even, by item, or "I've got this"; settles with a PayID or Beem link out; nothing held by the app.
- **A photo wall** from the gallery, shared to everyone in the plan the night after.
- **Repeat this** duplicates a plan with the same people for next month; a plan can be marked recurring.

### Parties, including kids' parties

- **Bring list**: claimable items ("a salad", "ice"), with counts, visible to all guests.
- **Gift list or no gifts**: a list of links or a "wishing well" note; nothing purchased in the app.
- **Kids' party specifics**: drop-off and pick-up times, a parent's phone per child, allergies on the RSVP feeding a single allergy sheet for the host (the allergy card already exists in reverse), party bag count, a "who is staying" toggle for parents.
- **Text blast**: a message from the host to everyone who is in, by push and email; each guest chooses their channel.
- **Games and hunts**, already built for the boys, offered as a party module with a host-set list.
- **Thank-yous**: the thank-you notes module generalised: after the party, one note per guest, with their photo of the night, sent from the host.

### Registrations

The sign-ups design in [commercialisation.md](../commercialisation.md#sign-ups-with-limited-places) applies as written: options, places, first come or organiser selects or ballot, waitlist, deposits, row locks, the audit trail. Additions for everyday use:

- A **standing group** (a club, a class, a team) with its members kept between plans, so a new sign-up goes to the same people.
- **Sessions** for a multi-day event: a registration per session, clashes refused, a personal timetable per attendee, which the day timeline already draws.
- **Check-in at the door** by QR code on the guest's phone, scanned by a helper's phone, which marks arrived; the wallet pass seam applies here later.
- **Name badges** printed from the guest list, in the printable guide's style.

### Weddings

Before the day:

- **Save the date**, then the invitation, at the same link, per household.
- **Household RSVP** with meal choice per guest and events per guest.
- **Wedding party** roles: the helper role, with tasks assigned (speeches, rings, the run sheet for the morning).
- **Accommodation**: the block booking at a hotel with the code, and who is staying where; the accommodation parameters already logged apply for travelling guests.
- **Transport**: shuttle times, who is on which bus, from the sign-ups module with places.
- **Registry**: a list of links, or a wishing well note. Money is not collected in the app.
- **Seating**: tables with capacity, guests dragged to seats, rules (households together, these two apart, children with parents, dietary counts per table for the caterer), a printable seating chart and place cards, and a guest's "your table" on their phone on the day.
- **Vendors**: a record per vendor (celebrant, photographer, caterer, band, florist, cars) with contact, arrival time, what they need, deposit paid and balance due; a vendor link shows them their items only.
- **Run sheet**: the day as steps, exactly the trip's step model: getting ready, ceremony, photos, drinks, entrance, speeches, first dance, cake, last dance, the cars. Each step has a who, a where and a note; the wedding party and vendors see the steps they are in.
- **Budget**: the ledger with categories for a wedding, deposits and balances by vendor, paid by whom.
- **A shared to-do list** for the couple with the existing to-do and "just say it" dictation.
- **Questions from guests** answered once on the invitation (parking, children, dress, gifts), from the FAQ pattern in Ask.

On the day:

- **The guest's phone**: your table, the order of the day, the bar's hours, the shuttle times, where the photos go, "we're here" check-in for the couple's helpers.
- **Photo wall**: every guest uploads to the gallery by the plan's link with no sign-in beyond their guest token; the couple's chosen photos as a slideshow on a venue screen using the frame mode already built for the grandparents.
- **Speeches and readings** as steps with a text the reader can open on their phone, large type, the reading dial already built.
- **Live stream** link for those who cannot come, on the invitation and pushed at the ceremony time.
- **Lost and found**, and the safety card with the venue's number and the nearest hospital.

After the day:

- **Thank-you notes** per household, with the household's photo from the day, drafted in the couple's words and sent by them.
- **Recap**: the story cards and the photobook, already built.
- **One year on**: the sealed notes module, opened on the first anniversary, from each guest to the couple.
- **The guest list as a keepsake** exported as a spreadsheet and a printable book.

### Multi-day events, offsites and reunions

- Registration and sessions as above, a personal timetable, a follow-along link for those at home.
- **Shared accommodation** with room allocations from the sign-ups module (twin or single, who with whom).
- **Split the day** already places part of the party on one activity, which is a breakout stream.
- **Expenses** per attendee, exported for reimbursement.

### Ideas that cut across every type

- **Group memory**: once a plan is done, its people and places stay available for the next one; "same as last time" is one tap.
- **Ask about our plan** answers a guest's questions from the invitation, the run sheet and the FAQ, so the host stops answering the same text message.
- **Organiser's brief** each morning of a plan, from the morning briefing: who has not answered, what is due, the weather, what today needs.
- **Nudges** to guests who have not answered, sent by the organiser with one tap, capped at two.
- **Printables** from the printable guide's pipeline: invitations, place cards, seating charts, run sheets, name badges, a thank-you card.
- **Wallet passes** for tickets and tables once the pass signer exists, per the note in commercialisation.md.
- **Calendar out and in**: `.ics` for every step a guest is in; an emailed booking (the venue's confirmation) filed by the inbox reader into the plan.

## Data model

New tables alongside the trip's JSON state. Sign-ups, RSVPs and seating need rows and locks, as already noted for sign-ups.

| Table | Columns (main ones) |
|---|---|
| plans | id, type, parent_plan_id, title, language, time zone, currency, look, state jsonb (days, steps, documents as today), created_by |
| memberships | plan_id, person_id, household_id, role, joined_at, invited_by |
| people | id, display name, contact (email, phone, both optional), app language, channels (push, email, SMS) |
| households | plan_id, id, name ("The Nguyens"), invite token hash, plus_one_allowed, children_invited, notes |
| invitations | plan_id, published_at, fields above, questions jsonb, rsvp_by, visibility |
| rsvps | plan_id, guest_id, household_id, status, answered_by, answered_at, adults, children jsonb, answers jsonb, events jsonb, note |
| signups, signup_options, allocations | as specified for sign-ups |
| tables, seats | plan_id, table id, name, capacity, rules jsonb; seat: table_id, guest_id, position |
| vendors | plan_id, id, kind, name, contact, arrival, needs, deposit, balance, due, link token hash |
| gifts | plan_id, id, title, link, claimed_by (optional), note |
| messages | plan_id, from, to (all, in, no answer, a household), body, sent_at, channel |
| audit | plan_id, who, what, when, before and after; sign-ups and seating write here |

Steps stay in the plan's JSON as today so the run sheet, the timeline, the day map and the leave-by pushes need no change.

## Screens

| Screen | Who | What it shows |
|---|---|---|
| Invitation | Anyone with the link | The page above; the RSVP form; add to calendar; directions |
| RSVP | A guest | Their household, each person's answer and the questions; change until the deadline |
| Guest list | Organiser, helper | Counts by status and event, meals and dietary totals, filters, nudge, export, answer for someone |
| Seating | Organiser, helper | Tables, drag to seat, rule warnings, dietary per table, print |
| Run sheet | Organiser, helper, vendor (own items) | The day as steps, the existing timeline, who and where per step |
| Vendors | Organiser | The vendor list, money due, a link per vendor |
| Sign-ups | Everyone in the plan | Options, places left, my status, waitlist position |
| My plans | Everyone | Plans I organise and plans I am in, upcoming and past; new plan; repeat this |
| Plan home | Everyone in the plan | The trip's Home collapsed to one day for an event: what's next, where, who is in, the bill, photos |

## Notifications

- Invitation sent and reminders before the RSVP deadline (organiser-triggered, capped).
- An answer changed after the deadline (to the organiser).
- Offered a place from a waitlist; place held until a time.
- Leave-by and "the plan changed" as today.
- The day's brief to the organiser each morning of the plan.
- Channels per person: push (Home Screen app), email (needs outbound email, which the inbound module does not provide), SMS (a provider to choose; consent under the Spam Act).

## Privacy, money and law

- **Guest lists are personal information** under the Australian Privacy Principles: a guest sees their household and the headcount, names of others only if the organiser allows; dietary and medical notes reach organisers and, per table, the caterer; nothing reaches vendors beyond their items.
- **Invitations by email or SMS** are commercial electronic messages only if the app sends them for its own ends; sent by the organiser to their guests they are personal, but the app's own follow-ups need consent (Spam Act 2003).
- **Money**: the app records who owes and who paid, and links out to PayID, Beem or a Stripe Connect page. It never holds funds for a wishing well or deposits, which would raise financial services licensing. Paid registrations with refunds need stated terms (Australian Consumer Law).
- **Photos of children** at a party: uploads visible to the plan only; the follow-along link stays view-only; a guest can remove their own photos.
- **Deletion**: a plan and its people can be deleted by the organiser after the event, with an export first; guest tokens expire with the plan.

## What exists to build on

| Need | Built today |
|---|---|
| Tokens, sessions, revocation | Family link design; `japan_grants`, `japan_sessions` |
| Steps, timeline, day map, leave-by | The trip's step model, `src/timing.js`, push kinds |
| Votes, must-do, choose together | The planning board and `decide-data.js` |
| One pick per person with places | The Express Pass panel |
| Ledger and shared rate | The family ledger |
| Gallery, photo of the day, recap, photobook, frame mode | Photos and memories modules |
| Thank-you notes, sealed notes, on this day | The family modules, generalised to host and guest |
| Printable pages | The printable guide pipeline |
| Inbox reading of confirmations | `server/email.mjs` and the inbox destinations |
| Allergy card, safety card, lost card | Family safety modules |
| Looks per plan | `LOOKS` and `applyLook` in `src/theme.js` |

## Dress code and what to wear

Added 1 October 2026. A gathering has a dress code; a day out has weather. The two answer one question a guest asks the night before, *what do I wear?*, so they are one module. The dress code is the organiser's: a choice from a short list and a free note ("garden party, flat shoes for the lawn"). The clothing line is worked out, not written: the forecast for the venue at the event's hours (`src/weather-data.js`), whether the plan says it is outdoors, and the walking the run sheet implies, turned into one or two lines ("Light rain from 18:00 and 14°C by the end: bring a jacket and an umbrella; the ceremony is on grass"). It reads the dress code, so a black-tie evening in the rain gets an umbrella, not a raincoat. For the family trip the same line goes in each morning's day in brief, reading each person's profile for the boys. Step 11 below.

## Build order

Sits inside the modular build order in commercialisation.md, and brings tenancy and open membership forward.

| # | Step | Depends on | Delivers |
|---|---|---|---|
| 1 | Plan type and plan context (the trip context of layer 1, plus type) | Nothing | Modules can switch on the type; the trip is type Trip |
| 2 | People, households, memberships; join by link; roles by type | 1 | Anyone can be in a plan; the family becomes tenant one |
| 3 | Invitation page and RSVP | 2 | A dinner and a party work end to end |
| 4 | My plans; repeat this; plan home collapsed for one day | 2 | Everyday use |
| 5 | Date poll and bring list | 3 | The outing and party modules complete |
| 6 | Sign-ups with places (as specified) | 2, real tables | Registrations |
| 7 | Seating, vendors, run sheet views, wedding look | 3 | Weddings |
| 8 | Messages, nudges, outbound email and SMS | 3 | Organiser communication |
| 9 | Printables, wallet passes, door check-in | 3, 6 | The day itself |
| 10 | Child plans (a wedding inside a trip) | 1, 2 | Destination weddings, conferences |
| 11 | Dress code and what to wear | 1, 3 | A dress code on the plan and the invitation (casual, smart casual, cocktail, black tie, themed, plus the organiser's note), and a what-to-wear line for the day read off the forecast for the venue's place and hours: rain, heat, cold, indoors or out, a walk from the car park. Shown on the invitation, in the RSVP confirmation and on the morning of the event; for a trip, the same line in each day's brief |

The second fixture for testing is a **dinner for six in Sydney**, then a **wedding of 120 in three households' worth of test data**; each step must pass with the family trip and both.

## Monetisation seams

- Free for an outing; a per-plan pass for a party or a wedding; a subscription for a standing group or a planner who runs many.
- Printables and stationery (invitations, place cards, thank-you cards) through a print partner, with the same compliance checks as the trip shop.
- White label for wedding planners, venues and event agencies through the per-client configuration layer.
- Never advertising on an invitation.

## Open questions

- Whether guests without the Home Screen app get push at all; email and SMS decide the notification design.
- Whether seating is worth building or linking out to a specialist tool for the first weddings.
- The wedding look: designed once, or a small set the couple chooses from and tints.
- Whether a person is an account (email and password, passkeys) or stays a link holder; weddings with 120 households argue for accounts for organisers only.
- Outbound email and SMS providers, and their cost per plan, measured before pricing.
