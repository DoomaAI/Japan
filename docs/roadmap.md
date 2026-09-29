# Roadmap: gaps against commercial travel apps

Compared against TripIt Pro, Wanderlog, Google Maps/Travel, Polarsteps, the Japan Official Travel App (JNTO), NAVITIME Japan Travel, Japan Transit Planner, Safety tips, Splitwise, Trail Wallet and TravelSpend. Written on 27 September 2026, day 7 of 16, so the order puts what helps during the rest of the trip first.

## Backlog — logged 27 September 2026, to pick up later

| Item | When | What it needs first |
|---|---|---|
| 4. Web push notifications | At a computer | VAPID keys as Vercel environment variables, a subscriptions table in Neon, a Vercel cron job, and testing on each iPhone (Home Screen app, iOS 16.4+) |
| 6. Offline day maps | Only if signal proves patchy | A map image per day, saved alongside the guide pages for offline use |
| 7b. Tax-free flag per shopping item | Optional | A field on shopping and shortlist items, and a filter |
| 8. Visit Japan Web card | Before a future trip | Nothing; content only |
| 9. Trip highlights video | After the trip | Decide how the video is put together: on the phone, or a paid service. Then the Claude selection call. Placeholder page already live |
| 10. Trip recap and photobook | After the trip | Nothing; builds on the diary and ratings |
| 11. Follow-along link for family at home | Any time | A new view-only invite role, with tickets, locations and money removed from the trip data it receives |

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

9. **Trip highlights video.** Placeholder live now under More → Looking back → **Trip highlights**. See the design below.
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
