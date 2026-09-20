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
- Authenticated PDF/image uploads up to 25 MB through private Vercel Blob, booking links, person/activity assignment, QR image display and explicit offline downloads.
- Embedded family My Map, Maps direction links, bilingual help cards, Google Translate handoff and official app download/website links for Qantas, Disney and USJ.
- Date-specific calendar export with a 15-minute alert. Optional Clock Shortcut handoff for the current Japan day only.
- Offline app shell, locally saved itinerary, opt-in guide/ticket downloads. Plan editing and file uploads require connectivity; progress can queue offline.
- Read-only WebMCP day lookup, when the browser supports it. No supported browser context was available to validate WebMCP registration.

## Setup in GitHub and Vercel

1. Create a **private** GitHub repository, e.g. `japan-family-companion`. Upload this folder's contents to the repository root. It contains your family guide; do not make the repository public.
2. Import the repository into Vercel as a new project. Framework: Vite. Build command: `npm run build`. Output: `dist`. Use Node.js 22 or newer. The included Vercel functions serve all private data; do not deploy only the `dist` directory as a standalone static site.
3. Connect a new Neon database to the project and configure `DATABASE_URL` as a server environment variable. Use the Neon connection string, including its SSL settings. Never prefix it with `VITE_`.
4. Create a **private** Vercel Blob store and connect it. Configure `BLOB_READ_WRITE_TOKEN` server-side (or the Blob SDK's supported connected-store configuration). Do not use a public store for tickets.
5. Generate a setup secret, for example locally with `openssl rand -hex 32`, and set it as `SETUP_SECRET`. Do not paste it in chat or commit it.
6. Set `APP_ORIGIN` to the exact production HTTPS origin, such as the actual `https://your-project.vercel.app` URL, with no trailing slash. This is used for private invite links and origin checks. A custom domain must match this value. Preview deployments should use isolated resources and their own exact origin if they need full write access.
7. Redeploy after setting environment variables.
8. Open the app, expand **Set up the family trip**, select Damien or Lauren and enter the setup secret on that page. Save the returned owner recovery link securely. The first setup automatically creates the three Neon tables and inserts the original itinerary only if it does not already exist.
9. Remove `SETUP_SECRET` from Vercel and redeploy after successful initial setup. Ordinary updates do not require it.
10. Open the avatar → **Our family** → create a link for each family member. Send links yourself. Damien/Lauren links can edit and upload; Nate/Boston links can view and complete assigned activities. Each person opens their link in Safari before adding the app to the Home Screen.

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection; server only |
| `BLOB_READ_WRITE_TOKEN` | Private Vercel Blob access; server only |
| `SETUP_SECRET` | One-time initial setup; at least 32 characters |
| `APP_ORIGIN` | Exact production HTTPS origin; no trailing slash |

No Google API key is required for the embedded My Map or outbound directions. Google Places/Routes integration and Timeline import are **not implemented in this first build**. App buttons currently use official website/download pages, not undocumented native deep links. Automatic push reminders are also not implemented; Calendar and a user-installed Shortcut are the available reminder methods.

## Family link design

Invites contain 256-bit random tokens in the URL fragment, not query parameters. The browser exchanges the token for a Secure, HttpOnly, SameSite=Strict session cookie and removes the fragment before loading trip data. Neon stores token hashes, not raw invite/session tokens. Role and family identity are checked on the server. Invites/sessions expire after 45 days. Parents can revoke non-owner invites, invalidating their online sessions. The owner recovery link is deliberately protected from in-app revocation; keep it secure.

Offline copies cannot be remotely revoked. **Sign out and clear this phone** removes the local itinerary, progress queue and private downloads on that phone. Only download tickets on family-controlled devices. The API fails closed when production credentials are missing; the local preview mode is explicitly disabled on Vercel and in production.

## Itinerary provenance and review

The attached image-based `Japan Travel Guide.pdf` is the source. Guide pages are served behind authentication. The searchable text was OCR-extracted and can contain recognition errors; the rendered page is the reference. The seeded steps are a working transcription, not confirmed reservations or live timetables.

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
2. Complete initial parent setup and create one parent and one child link. Check the child cannot edit times, add uploads or create invites.
3. On two phones, complete an activity and confirm it appears on the other within 15 seconds. Make competing changes and verify the second is asked to review rather than overwriting the first.
4. Upload a test QR image and PDF, assign them to a step and person, and open them on both phones. Verify the private Blob URL is not publicly readable.
5. Download a guide page and ticket, close/reopen the installed app in airplane mode, record progress, then reconnect. Test the conflict-review path if another phone edits meanwhile.
6. Test swipe navigation, small-screen text, the day picker, guide deep links and the embedded My Map. Map visibility still depends on Google's sharing settings.
7. Test Calendar import and the alarm Shortcut. Verify actual alarm time on the physical phone.
8. Check flight, train, theme-park and luggage details against original confirmations. Adjust duration estimates.

## Updating the app

Deploy source updates through GitHub/Vercel. Existing Neon state is seeded only once (`ON CONFLICT DO NOTHING`); subsequent deployments do not replace edits, document associations, completions or history. Future content corrections should use explicit field-level migrations or the app editor. Never reset the database just to publish an app update. The download-backup button exports itinerary JSON; it does not include ticket file bytes.

## Verification completed in this workspace

- Production Vite build with generated offline precache: passed.
- Eight automated test groups: passed (seed integrity, time locks, role permissions, alternatives, input validation, rescheduling conflicts, Japan timezone, API auth/conflict/idempotency/private guide).
- Live Neon/Blob integration and iPhone browser checks: pending account setup/deployment.
- Browser preview: unavailable due to environment block, not a verified visual pass.

Source docs: [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [Apple Shortcuts URLs](https://support.apple.com/guide/shortcuts/run-a-shortcut-from-a-url-apd624386f42/ios).
