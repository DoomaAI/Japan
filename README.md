# Pasfield family · Japan 2026

A private iPhone Home Screen web app, prepared for a new GitHub repository and Vercel project with Neon Postgres and private Vercel Blob storage. No App Store review is needed.

## Current delivery status

The production frontend builds and the automated model/API checks pass. No GitHub repository, Vercel deployment, Neon database or Blob store has been created or connected yet. Live family sharing and uploads must be checked after those connections are made. The internal browser preview was blocked by the browser environment (`ERR_BLOCKED_BY_CLIENT`), so visual, touch, iPhone installation, calendar import, alarm Shortcut and offline browser checks remain outstanding. Do not treat this as a deployed or fully device-tested release.

## Included

- 16 trip days, 237 editable steps, 6 groups of alternative plans, and all 72 original guide pages.
- Swipe/previous/next navigation, day picker and direct links to days, activities and guide pages.
- Target times in Japan time, original targets, booking times, lock/unlock, completion/start timestamps, skip/reset, notes and participants.
- A rescheduling preview that preserves locked/completed steps and flags booking overlaps. Durations default to editable 30-minute estimates; refine them before relying on rescheduling.
- Parent editing, child completion permissions and per-person private invite links. No email required.
- Neon persistence, optimistic revision checks, an audit history and 15-second foreground refresh. Pending offline progress is kept on the phone and conflicting updates require review.
- Tickets & Reservations: notes, PDF/photo attachments, booking references, luggage tags, search, type/person filters and clickable tags. Associate documents with activities; download critical files explicitly.
- Family gallery: multi-file photo/video uploads, day or activity association, captions, editable tags, day/type/search filters and original-file links. Photos up to 25 MB; videos up to 100 MB. Parent editors upload; the family can view. MP4/MOV/WebM accepted, but playback depends on the phone's codec support. HEIC/HEIF originals are preserved with an open-original link; no conversion or transcoding. Media uses private Blob storage and authenticated byte-range streaming. Uploads require connectivity; gallery videos are not automatically cached offline.
- Untimed Options list for ideas, places and missed activities. Move an unlocked step into Options and schedule it later without losing its attachments. Drag handles and accessible up/down buttons reorder the day's steps without changing target or booking times.
- Per-entry HTTPS website/booking links; entries without a saved URL offer a clearly labelled website search. The original first-page cover is used on the welcome and Days screens.
- Embedded family My Map, Maps direction links, bilingual help cards, Google Translate handoff and official app download/website links for Qantas, Disney and USJ.
- Date-specific calendar export with a 15-minute alert. Optional Clock Shortcut handoff for the current Japan day only.
- Offline app shell, locally saved itinerary, opt-in guide/ticket downloads. Plan editing and file uploads require connectivity; progress can queue offline.
- Read-only WebMCP day lookup, when the browser supports it. No supported browser context was available to validate WebMCP registration.

## Setup in GitHub and Vercel

1. Create a **private** GitHub repository, e.g. `japan-family-companion`. Upload this folder's contents to the repository root. It contains your family guide; do not make the repository public.
2. Import the repository into Vercel as a new project. Framework: Vite. Build command: `npm run build`. Output: `dist`. Use Node.js 22 or newer. The included Vercel functions serve all private data; do not deploy only the `dist` directory as a standalone static site.
3. Connect a new Neon database to the project and configure `DATABASE_URL` as a server environment variable. Use the Neon connection string, including its SSL settings. Never prefix it with `VITE_`.
4. Create a **private** Vercel Blob store and connect it. Configure `BLOB_READ_WRITE_TOKEN` server-side (or the Blob SDK's supported connected-store configuration). Do not use a public store for tickets.
5. Set `APP_ORIGIN` to the exact production HTTPS origin, with no trailing slash. Preview deployments should use isolated resources and their own exact origin.
6. Redeploy after setting environment variables.
7. On a trusted development machine, place the production `DATABASE_URL` and `APP_ORIGIN` in the ignored `.env.local` file and run `npm run create-owner` (Node 22+). This creates the database schema and initial itinerary, then writes the private parent link to `.private/owner-link.txt`. It does not print the link, expose a public setup endpoint or overwrite an existing owner. No setup key is used. Deliver the link privately and keep a recovery copy.
8. Open the private parent link, then the avatar → **Our family** → create a link for each family member. Send links yourself. Damien/Lauren links can edit and upload; Nate/Boston links can view and complete assigned activities. Each person opens their link in Safari before adding the app to the Home Screen.

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection; server only |
| `BLOB_READ_WRITE_TOKEN` | Private Vercel Blob access; server only |
| `APP_ORIGIN` | Exact production HTTPS origin; no trailing slash |

No Google API key is required for the embedded My Map or outbound directions. Google Places/Routes integration and Timeline import are **not implemented in this first build**. App buttons currently use official website/download pages, not undocumented native deep links. Automatic push reminders are also not implemented; Calendar and a user-installed Shortcut are the available reminder methods.

## Family link design

Invites contain 256-bit random tokens in the URL fragment, not query parameters. The browser exchanges the token for a Secure, HttpOnly, SameSite=Strict session cookie and removes the fragment before loading trip data. Neon stores token hashes, not raw invite/session tokens. Role and family identity are checked on the server. Invites/sessions expire after 45 days. Parents can revoke non-owner invites, invalidating their online sessions. The owner recovery link is deliberately protected from in-app revocation; keep it secure.

Offline copies cannot be remotely revoked. **Sign out and clear this phone** removes the local itinerary, progress queue and private downloads on that phone. Only download tickets on family-controlled devices. The API fails closed when production credentials are missing; the local preview mode is explicitly disabled on Vercel and in production.

## Itinerary provenance and review

The attached image-based `Japan Travel Guide.pdf` is the source. Guide pages are served behind authentication. The first-page cover is also a public welcome-screen asset; tickets, travel details and uploaded media remain private. The searchable text was OCR-extracted and can contain recognition errors; the rendered page is the reference. The seeded steps are a working transcription, not confirmed reservations or live timetables.

- **Page 19:** departure/arrival dates conflict with the stated flight duration. Arrival is seeded on 21 September at 20:10 as a flagged item. Check the real Qantas booking before travel.
- **Page 20:** station/line description is inconsistent. The app directs users to live Maps instead of repeating it as verified routing.
- **Pages 40–41:** alternate Kyoto tea/afternoon timings are retained as options. The 27 September weekday typo is corrected to Sunday.
- **Pages 16 and 56–59:** Ueno, Tsukiji and hotel rest are alternative 2 October plans.
- **Pages 16, 46, 47 and 55:** luggage destinations/delivery sequence differ. Confirm with hotels.
- Theme-park passes, height restrictions, opening/show times and transport services have not been independently verified. Booked labels indicate what the guide says, not a check of uploaded confirmations.
- Japanese names are stored for a small set of clearly identified places. Other steps display the English destination and open Maps/Translate to help find the Japanese address. Guide page 3 remains available for additional phrases.

## Offline behaviour

The build script precaches the app shell and versioned CSS/JS. A signed-in itinerary is saved on the device after successful loading. Guide pages and tickets are downloaded only when the user chooses Save. Downloads are network-first while connected; an authentication failure does not fall back to private cached content. With no connection, explicitly cached pages/tickets remain accessible.

Offline progress stores an operation ID, original revision and timestamp. When reconnecting, a changed server revision prompts review. Repeating a successfully submitted operation does not apply it twice. Other edits require connectivity and are never silently merged. Mobile browsers can evict site data: before travel, check that the app and selected tickets reopen in airplane mode. Keep critical tickets available through their official provider too.

## Phone reminders

Calendar export creates an `.ics` event with absolute UTC times derived from Japan local time, a link to the activity, and a 15-minute display alarm. Test importing on your actual iPhone.

For Clock alarms, install a Shortcut named `Japan Alarm` on each phone: receive text → Get Dictionary from Input → get `time` → Create Alarm; use `label` as the alarm label. Enter that Shortcut name under Remind me. The app enables the Shortcut link only on the activity date when the phone uses Asia/Tokyo. Clock alarms are time-of-day alarms, not dated trip reminders. This path still needs physical-device testing. Editing an itinerary **does not update** previously exported Calendar events or Clock alarms.

## Run locally

```bash
npm ci
npm run dev
npm test
npm run build
```

`npm run dev` provides an explicitly labelled, in-memory parent preview. It does not use Neon or support real file uploads/invites. Restarting the development server resets this preview. Production uses only authenticated Neon-backed data.

## Deployment acceptance checks

Before using the app on the trip:

1. Open the deployed root without a cookie: no itinerary, tickets or guide pages should be accessible.
2. Open the provisioned private parent link and create one parent and one child link. Check the child cannot edit times, add uploads or create invites.
3. On two phones, complete an activity and confirm it appears on the other within 15 seconds. Make competing changes and verify the second is asked to review rather than overwriting the first.
4. Upload a QR image, PDF, photo and short MP4/MOV; assign photos to both a day and an activity. Verify search/tags, video play/seek on both phones, private access and removal. Move an activity to Options and back; verify attachments follow. Verify deleting it retains its files under the day. Test interrupted uploads and retry.
5. Download a guide page and ticket, close/reopen the installed app in airplane mode, record progress, then reconnect. Test the conflict-review path if another phone edits meanwhile.
6. Test swipe navigation, small-screen text, the day picker, guide deep links and the embedded My Map. Map visibility still depends on Google's sharing settings.
7. Test Calendar import and the alarm Shortcut. Verify actual alarm time on the physical phone.
8. Check flight, train, theme-park and luggage details against original confirmations. Adjust duration estimates.

## Updating the app

Deploy source updates through GitHub/Vercel. Existing Neon state is seeded only once (`ON CONFLICT DO NOTHING`); subsequent deployments do not replace edits, document associations, completions or history. Future content corrections should use explicit field-level migrations or the app editor. Never reset the database just to publish an app update. The download-backup button exports itinerary JSON; it does not include ticket file bytes.

## Verification completed in this workspace

- Production Vite build with generated offline precache: passed.
- Automated tests cover seed integrity, time locks, role permissions, alternatives, input validation, rescheduling, Japan timezone, API access/conflicts/idempotency, Options and reordering, attachment associations and upload validation.
- Live Neon/Blob integration and iPhone browser checks: pending account setup/deployment.
- Browser preview: unavailable due to environment block, not a verified visual pass.

Source docs: [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [Apple Shortcuts URLs](https://support.apple.com/guide/shortcuts/run-a-shortcut-from-a-url-apd624386f42/ios).

## Family companion additions

- **Home / What's next:** current unfinished activity, next locked booking, related tickets and a leave-by estimate. Parents can edit travel minutes and early-arrival buffer in the activity editor. Estimates are manual; there is no live routing calculation.
- **Offline readiness:** select tomorrow or another day, download relevant guide pages and ticket files, and inspect actual cache entries plus the app shell and itinerary snapshot. External booking links are listed for separate checking in their official apps. The readiness screen does not claim external apps, live maps or videos are downloaded. Physical iPhone airplane-mode checks remain required.
- **Running late:** preview shifted unfinished activities and a list to move into Options. Applying is one revision-checked operation. Locked, started and completed steps stay in place; travel buffers reserve room before bookings. Tight fixed bookings produce warnings. Existing phone alarms/calendar exports are not updated.
- **Meeting card:** per-day place/time, English and optional Japanese location details, hotel details, parent contact numbers, large-text and print/PDF views. Contact numbers are intentionally blank until entered. A standard Japanese help phrase is supplied; addresses are not automatically translated.
- **Quick capture:** short notes, places, links and optional photos; save to Options or a selected day. Text drafts persist locally. Photos require an online upload and are not retained if the panel closes before upload. If the idea saves but the upload fails, retry attaches to that saved idea.
- **Family updates:** important booking/date/place/plan and meeting changes are visible in-app with who changed them and who acknowledged them. Polling remains every 15 seconds while online; no push alerts are sent.
- **Unified search:** itinerary, Options, reservations/tickets, captions/tags, shopping, challenges, meeting cards, diary and guide OCR. Guide OCR can be searched offline after it has been loaded once.
- **Diary:** completed steps, actual times, challenge discoveries, family reflections and associated media form a daily diary. Export selected day or whole trip as HTML, embedding available JPEG/PNG/WebP photos. Video and HEIC originals remain authenticated links; missing photos are explicitly reported. Exported diaries contain family content and should be shared intentionally.
- **Boys' missions:** Boston is **8**, Nate is **5**. Each has **three missions for every trip day** — 48 each, 96 in all — plus six whole-trip quests, with separate completion timestamps and discovery notes. Every day's set is written around what that day actually holds: Haneda signs on arrival, the Shibuya crossing, teamLab and the sumo, the Nozomi to Kyoto, wait times at Universal, the bamboo grove, the Nara deer, Dotonbori's signs, the Disney queues, Tsukiji's supply chain, Harajuku street style, Beyblade physics, and the lucky cats at Gotokuji. Nate's are observational and hands-on; Boston's ask for evidence, estimates and design reasoning. Parents can add/edit/remove missions, including tasks for both boys. Each child can update only his own challenge progress. Challenge completion and discovery notes can queue offline alongside activity completion.
- **Theme park ride checklists:** the three park days (Universal 25 September, Disneyland 30 September, DisneySea 1 October) each carry a ride checklist — 15–16 attractions per park with their area, a one-line note, and the minimum rider height. Tick who has ridden what (each person's own tick; a parent can tick for anyone), star the must-dos, and filter by area, must-do or not-yet-ridden. Rides already booked into that day's plan are marked **in our plan**, matched by name so editing the itinerary keeps them in step. Reachable from the park day itself and from More → Theme park rides. Ticks queue offline.
- **Height check:** record each boy's height once and every ride states it plainly — *Boston is tall enough*, *20cm too short for Nate* — instead of leaving a number to be compared in a queue. **The heights and ride names are a planning aid gathered before the trip, not a confirmed source.** Parks change requirements and rides close; the panel says so and links to the official app. Confirm anything you are planning around, especially for Nate.
- **Park maps:** each park panel links to the official app (live map, wait times, Premier Access/Express Pass) and the park website. The parks' maps are their copyright, so the app links to them rather than shipping a copy. To hold one offline, save a screenshot or the app's PDF under Tickets, tagged `park map` with the park's name in the title; it then downloads with the rest of that day and the panel links straight to it. Every ride also has a **Maps** link that searches Google Maps for that attraction. Note that Google does not route usefully *inside* a park — use it to place things before the day, and the park's own app for live position and wait times. To put ride pins on the family My Map, add them in Google My Maps yourself; the app cannot edit your map.
- **Phone numbers, calling and WhatsApp:** an activity can carry a phone number, shown on its card with **Call** and **WhatsApp** buttons. Call uses a `tel:` link, so the phone dials it. WhatsApp uses an official `wa.me` click-to-chat link, which opens a chat with that number — the other end must have WhatsApp, and this does not place a WhatsApp voice call. A number written the Japanese way (`075-241-0111`) has its leading `0` replaced by `+81`, because that is how a Japanese number is dialled internationally; the app states the number it will dial (`Dialling +81752410111`) both in the editor and on the card, so an Australian mobile written as `04…` is visible as wrongly assumed rather than silently misdialled. Start with `+` and a country code for anything outside Japan. A number too short to be international still gets a Call button but no WhatsApp link. Numbers also appear on Options entries.
- **Window I spy on the Shinkansen:** the two Nozomi legs (Tokyo → Kyoto on 24 September, Kyoto → Tokyo on 29 September) show a **Window I spy** panel with 16 things to find from the train — Mount Fuji, a Shinkansen passing the other way, tunnels, rice fields, golf-range nets, the snack trolley, the cleaning team bowing on the platform. Each boy keeps his own list on each leg, so the two can play the same leg separately and the return trip starts fresh. Mount Fuji's hint follows the direction of travel: on the **right** about 40 minutes out of Tokyo heading west, on the **left** about 40 minutes before reaching Tokyo coming back. Ticks queue offline, which matters through the tunnels. Each boy ticks only his own list; a parent can tick for either.
- **Skipping and new missions:** a boy can skip a mission he does not want with **Not this one**, and it leaves his list without counting against his progress. Skipped missions collect under a **Skipped** section and can be brought back at any time. Skipping clears any tick on that mission. **Give me a different mission** draws a fresh one from a reserve of ten per boy — these are written to work on any day, so they suit whatever is happening. Up to three extra missions per boy per day; each draw is a mission he does not already have that day, and drawing is refused once the limit is reached. Each boy can only skip and draw for himself; a parent can do either for either boy. Skips queue offline alongside completions; drawing a new mission needs connectivity. Nothing is generated by an AI — the reserve missions are written in advance, so this works offline and costs nothing to run.
- **Pictures on missions:** every mission carries an emoji cue, shown large on Nate's cards and smaller on Boston's. Seven of Nate's missions, where the shape is the point, also carry a simple line diagram — the torii gate, the Shibuya crossing, bamboo rings, the bridge arches, a scoreboard, a spinning top and the lucky cat's raised paw. Diagrams are inline SVG, so there are no image files to download and they work offline. A parent adding a mission can give it an emoji of their own.
- **Missions open first for the boys, and read themselves aloud:** Nate and Boston land on the Missions screen when they open the app, rather than the day plan — a link that names a screen (`?tab=`, `?step=`, `?page=`) still wins. Every mission card has a **Read to me** button so Nate can follow his own missions before he can read them. It uses the phone's own speech, so nothing is sent anywhere and it works offline; one mission reads at a time, and tapping the same button stops it. The button is hidden on browsers without speech support, and the voice is whichever en-AU voice the phone has installed.
- **Shopping:** shared list with item, quantity, intended person, optional day, shop, HTTPS link, notes and total yen budget per item. Anyone in the family can add and mark bought/unbought; parent editors can change details or remove entries. Shopping edits currently require connectivity.
- **Daily notes for Lauren:** a private thank-you note from Damien that pops up for Lauren once per trip day. See the section below.

The bottom navigation is Home, Days, Missions, Shopping, Tickets and More. More links to Options, meeting card, diary, updates, search, map, original guide and help; gallery, quick capture and offline preparation also remain available. New main pages have `?tab=...&day=...` URLs, with item links for search destinations.

New state fields are initialized only when absent, preserving existing family edits and challenge completions. No database reset is required. The fuller mission sets are merged into an existing trip once, keyed by `missionSeed`: every completion, discovery note and parent-written challenge is kept, and a superseded single mission is dropped only when nobody completed it. The provided final iframe uses map ID `1mztIuWzTviCEZSLdDxEUqo2WK3HUNfo`; the separate viewer button uses that same ID. The temporary different map ID was replaced with this final supplied embed. Map visibility could not be verified in this environment; Google sharing settings still govern access. [Google's embed and sharing instructions](https://support.google.com/mymaps/answer/3109452?hl=en).

Additional validation: 18 automated test groups passed, including age-correct mission assignment, child permissions, shopping, acknowledgements, delay/backlog handling, offline manifests, unified search and diary dates. All 10 added screen components also rendered successfully in a server-render smoke check. This is not a browser visual or physical iPhone pass. Test actual uploads, map display, offline storage and video playback after deployment.


## Daily thank-you notes (Damien → Lauren)

A private note from Damien appears as a pop-up for Lauren once on each day of the trip.

**What each person sees**

| | Pop-up | The note list | Schedule and read receipts |
| --- | --- | --- | --- |
| Damien | No | Yes — writes, amends, reorders, pins, removes | Yes |
| Lauren | Yes, once per trip day | No | No |
| Nate, Boston | No | No | No |

**How the schedule works.** The notes are a single ordered list, seeded with 20 written suggestions. Each trip day takes the next note in list order, so reordering the list changes which day gets which note. A note can instead be pinned to a specific day; pinned notes always land on their day and the unpinned ones fill the days around them. A day accepts only one pinned note. With 20 notes and 16 trip days, the surplus sits at the bottom of the list as spares until Damien moves one up. Damien can amend any wording, add his own notes, or delete ones he does not want.

**Read receipts.** Damien's page shows whether Lauren has opened each day's pop-up. A tally above the schedule counts the notes opened out of those already delivered and names any she has not opened. Each schedule row and each note card then carries its own state: a green tick and the Japan time she opened it, or `Not opened yet` for today, `Not opened` for a day that has passed, and `Waiting` for a day still to come. A note opened after midnight in Japan shows the date she actually read it (`Read Wed, 23 Sept · 07:05 JST`), so a late read is not mistaken for one on the day. Only days that have arrived and carry a note count towards the tally. Lauren sees her own receipt on the note itself; the tally and the schedule are Damien's alone.

**How Lauren sees it.** The note opens automatically the first time she opens the app on that day, in Japan time. Closing it records that she opened it and it does not reopen. A heart in the top bar reopens the day's note whenever she wants it, with a dot until she has read it. Dismissal is also recorded on the phone itself, so the note does not reappear if she is offline when she closes it.

**Privacy.** This is enforced on the server, not only in the interface. `server/visibility.mjs` redacts the trip state at the response boundary: Damien receives the full list, Lauren receives only the text scheduled for the current Japan day, and Nate and Boston receive neither. The note text is never sent to a phone that is not meant to read it, so it is not in the cached offline snapshot or the itinerary backup download for those family members. The notes are also kept out of Family updates and the "Recent family changes" history, so no one sees that a note was written or read. Damien is the only person who can write or change a note; Lauren is the only person who can mark one read. Both rules are checked server-side by family-member name, not only by parent role.

**Limitations.** The pop-up appears when the app is opened or refreshed — it is not a phone push notification, and nothing is sent if Lauren does not open the app that day. Marking a note read needs connectivity; offline, the phone remembers the dismissal and the read receipt is simply not recorded. Anyone holding Damien's parent invite link can read and edit the list, so treat that link as private.

## Imported map locations and guide directions

The supplied `Japan_2026_Google_Maps_Master_List_SELECTED_ADDITIONS.xlsx` contains 209 location rows in Master List. All are retained in `data/map-locations.json`, with original venue, district, city, type, address, trip notes, source URL and row number. The workbook itself was not modified. The import script is a read-only OOXML extractor, with a reviewed exact-alias table for itinerary wording.

- 72 distinct imported venues match 186 existing activity steps. Matching directions now use venue plus supplied address. Broad areas, unmatched venues and special station entrances keep their original destination text. Explicit location selection is available in the activity editor; changing the free-text place detaches the old link.
- The app's original guide-page viewer has a direction-links panel for relevant locations. This adds navigation beside the original guide images; it does not change or reissue the original PDF.
- Places includes all 209 rows with city/district/type filters and text search, walking/transit/driving links, source websites, guide-page links and the ability to save a location to Options or a day. Unified search includes imported addresses and notes.
- Separate branches and source duplicates are retained. Explicit itinerary aliases resolve the intended listing where reviewed, including TOTARO; broad ambiguous matches are not guessed. The source's reference-only / closed-location warning for Jishu Jinja is preserved. Source confirmation/opening claims have not been independently reverified.
- Locations are served through authenticated trip state, not bundled in the public client. Loaded addresses are included in the locally saved itinerary; live directions still require Google Maps connectivity or its own offline preparation.
- These links use Google Maps universal URLs, requiring no Google API key. No Place IDs were supplied; destination pins and live route/entrance choices should be checked in Maps. [Google Maps URL documentation](https://developers.google.com/maps/documentation/urls/get-started).

Validation now includes 20 automated test groups: all 209 rows retained; URL encoding and mode validated for 627 direction links; exact branch matching, custom destination detachment, guide-page associations and invalid location rejection covered. Both new location components rendered direction links in a server-render smoke check. Live iPhone navigation remains a deployment check.


### Day guide previews and ticket attachments
Each day now shows a swipeable strip of its original guide pages above the activities. The guide reader includes a day selector and return-to-day button.

Tickets & reservations remains the shared central document area. Save a ticket first, then expand Add photos / files to this ticket to select multiple images/PDFs and label each person. Individual attachments support opening, offline saving, person/tag edits and removal. Removing the parent ticket removes all its attachments from the shared itinerary (already downloaded copies remain). Upload retries retain successful registrations. Existing single-file tickets remain supported. Production Blob uploads still require a live deployment check.

Opening any ticket file full-screen reads the whole set: the ticket's own file first, then each file attached to it. Swipe left and right, use the Previous/Next buttons, or press the arrow keys to move between them; Escape closes. A counter shows the position, and navigation is hidden for a ticket holding a single file. Written details and external links carry no file, so they are skipped. Swipe works on photos; a PDF is shown in an embedded viewer that takes its own touches, so use the buttons or arrow keys there.

Saving a ticket now clears the add form, so the next one starts blank. Previously the title, reference, notes, tags and link stayed filled in and the chosen file was still attached to the file input, which risked saving a duplicate on the next entry.


### Guide-inspired visual theme
White paper surfaces, fine rules, black Playfair Display headings and Roboto Condensed labels closely follow the original guide images. Font files and OFL licences are bundled under src/fonts; Vite emits them as versioned assets included in the offline shell. Exact source typefaces could not be identified from the raster guide. Theme styles live in src/guide-theme.css. Original guide pages and cover remain unchanged. Production build checked; live iPhone visual review remains pending.
