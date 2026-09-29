# Native apps log: iPhone App Store and Google Play

**Status: parked 29 September 2026, to come back to after the trip.** Decisions are made (below); nothing is built. Pick up at "Next step when picked up".

Logged 29 September 2026, day 9 of 16. What it would take to ship the app to the App Store and Google Play, not a plan to do it during the trip. Today the app is a Home Screen web app on Vercel with no store review; that stays the family's version. The store apps are for the [commercial version](commercialisation.md), published by I'm In Ventures Pty Ltd.

## Decisions — logged 29 September 2026

| Question | Decision | What follows |
|---|---|---|
| Family or commercial? | **Commercial.** The family keeps the web app; the store apps are the commercial product | Public listings and full review on both stores; the app must hold many trips for many groups (see "Commercial product work" below) |
| Which developer accounts? | **Organisation: I'm In Ventures Pty Ltd** | The company is the seller shown on both stores. Needs a D-U-N-S number matching the ASIC record; Google's 12-tester closed test does not apply |
| How are iPhone builds made? | **Cloud build, no Mac** | Capawesome Cloud (Ionic's recommended successor to Appflow, which takes no new customers and closes on 31 Dec 2027) for builds, signing, store upload and live updates; Codemagic as the fallback |

## Recommendation

Wrap the existing React/Vite build with **Capacitor**, not a rewrite in React Native, Flutter or Swift/Kotlin.

- The app is about 21,700 lines of web UI plus a Node API (`server/`). Capacitor reuses all of it; a rewrite repeats it twice.
- Capacitor produces real `ios/` and `android/` projects, so any screen that needs to be native later can be replaced one at a time.
- The API stays on Vercel unchanged apart from auth and push (below).

## Distribution options

| Route | Who can install | Review | Fit |
|---|---|---|---|
| Keep the web app (today) | Anyone with a family link | None | Enough for the family |
| iOS TestFlight | Up to 100 internal testers (App Store Connect users) with no review; up to 10,000 external by link, first build reviewed; each build lasts 90 days | Light | Beta before launch |
| iOS Unlisted App | Anyone with the direct link; hidden from search | Full App Store review | Private but permanent |
| iOS public App Store | Everyone | Full review | **Chosen: commercial launch** |
| Play internal testing | Up to 100 testers by email | None | Team builds during development |
| Play closed testing, then production | Everyone | Full review | **Chosen: beta, then commercial launch** |
| Android APK sideload | Anyone sent the file | None | Quickest for one Android phone |

## Accounts and fixed costs

| Item | Cost | Notes |
|---|---|---|
| D-U-N-S number for I'm In Ventures Pty Ltd | Free | From Dun & Bradstreet (Apple has a lookup/request form). Legal name and address must match ASIC exactly; allow up to 2 weeks |
| Apple Developer Program (organisation) | US$99 a year | Enrolled by someone with authority to bind the company; needs the D-U-N-S number, a company website on its own domain and a company email address. Apple phones to verify |
| Google Play Console (organisation) | US$25 once | Needs the D-U-N-S number; the Google payments profile name and address must match Dun & Bradstreet. No 12-tester closed test for organisation accounts |
| Cloud build (Capawesome Cloud or Codemagic) | Free tier to start, then a monthly plan | Builds and signs iOS on hosted Macs; no Mac needed. Signing certificates and the Android upload key are stored in the service |
| Paid-apps agreements and tax | Nil | Apple Paid Apps Agreement and Google payments profile: ABN, bank account, US tax form (W-8BEN-E). Both stores collect and remit Australian GST on sales to Australians |
| EU trader status (if sold in the EU) | Nil | The Digital Services Act requires the company's address, phone and email to be shown on the listing |
| Developer time | Estimate below | |

## What has to change in the code

### 1. Where the app loads from

- **Option A — bundled (recommended):** ship `dist/` inside the app, call the API at the full Vercel address. Opens with no signal, which matters in Japan.
- **Option B — remote URL:** point the app at the live site. Simpler, but reads to Apple as a website in a frame (Guideline 4.2 risk) and fails with no signal.
- Option A means every `fetch('/api/…')` needs an API base address, and CORS on the API for the app's origins (`capacitor://localhost` on iOS, `https://localhost` on Android).

### 2. Sign-in and sessions

- Today: a family link sets an `HttpOnly; SameSite=Strict` cookie (`server/store.mjs`). A bundled app calls the API cross-origin, so that cookie will not be sent.
- Change: the family link returns a session token the app keeps in the iOS Keychain / Android Keystore (e.g. `@capacitor/preferences` plus a secure-storage plugin) and sends as a bearer header. The server accepts either cookie or bearer, so the web app keeps working.
- Family links open the app, not Safari: **universal links** (iOS, `apple-app-site-association` on the Vercel domain) and **app links** (Android, `assetlinks.json`).

### 3. Offline

- iOS WKWebView does not run service workers for bundled content, so `public/sw.js` does nothing in the iPhone app. With Option A the app shell is already on the phone; trip data caching must move from the service worker to app storage (the IndexedDB and `localStorage` stores already used largely cover it; check tickets and documents).

### 4. Push notifications

- Web Push (`web-push`, VAPID, `server/push.mjs`) does not work inside a native app.
- Add `@capacitor/push-notifications`: APNs on iOS (a `.p8` key from the Apple account), Firebase Cloud Messaging on Android.
- Server: store the device token alongside web subscriptions and send through APNs/FCM for those. The tick, kinds and de-duplication in `server/push.mjs` stay as they are; only the sender changes.

### 5. Device features

| Feature today | In the web app | In the native app |
|---|---|---|
| Location (Nearby, leave-by, day map) | `navigator.geolocation` | Works; add `@capacitor/geolocation` for proper permission prompts and usage strings |
| Camera and photo upload (`capture=`) | File input | Works; `@capacitor/camera` gives a better picker |
| Voice notes (`MediaRecorder`) | Works | Works in WKWebView (iOS 14.5+); needs microphone usage string |
| Dictation (`SpeechRecognition`) | Safari only | **Not available in WKWebView** — needs a native speech plugin |
| Spoken phrases (`speechSynthesis`) | Works | Works; a native TTS plugin gives Japanese voices more reliably |
| Share, clipboard, vibrate | Web APIs | `@capacitor/share`, `clipboard`, `haptics` |
| Calendar feed (`.ics`) | Subscribed URL | Unchanged |
| Shortcuts / Siri deep links (`src/deep-links.js`) | Web addresses | Map to a custom URL scheme or universal links; later, App Intents and Home Screen widgets become possible (the web app cannot do these) |
| Maps (Leaflet, Google/Apple Maps links) | Works | Works; external map links open the Maps app |

- `vercel.json` sets `Permissions-Policy: camera=(), microphone=()`; irrelevant inside the app, but note it if the remote-URL option is chosen.
- iOS `Info.plist` needs a plain-English reason for each of location, camera, photo library, microphone and speech recognition. Android needs the matching manifest permissions.

### 6. Android build level

- From 31 August 2026, new apps and updates on Google Play must target **Android 16 (API 36)**. Use a current Capacitor release that targets it.

## Store review points

- **Apple 4.2 Minimum functionality:** a bare website wrapper is a common rejection. This app passes on substance if it shows native push, offline use, location, camera and deep links working.
- **Sign-in for reviewers:** both stores need a working demo login in the review notes, on a sample trip, not the family's. The existing local demo mode (`LOCAL_DEMO`) is the starting point.
- **Account deletion (Apple 5.1.1(v); Google Play data deletion policy):** people who sign up in the app must be able to delete their account in the app, and Google also needs a web link to request deletion.
- **Privacy:** a public privacy policy URL; Apple's privacy "nutrition label" and privacy manifest; Google's Data safety form. Declare location, photos, audio, names and ages, allergy details (health information) and receipts.
- **AI features:** the app sends photos, menus, documents and questions to Claude through the server. Disclose third-party AI processing in the privacy policy and the review notes.
- **Children:** covered under "Commercial product work" below.
- **Payments:** covered under "Commercial product work" below.

## Commercial product work

Wrapping the app is the smaller part. Today the app holds **one trip for one family**: a single `japan_trip` row, the itinerary seeded from `data/seed.json`, Japan-specific guides and data in `data/`, grants and check-ins keyed by name, and "Pasfield" in the title and manifest. A product sold to the public needs:

- **Many trips, many groups:** every table keyed by trip; each person can belong to several trips; roles per trip (organiser, member, view-only), as in the group model in [commercialisation.md](commercialisation.md).
- **Sign-up and sign-in:** email magic link or passcode, plus **Sign in with Apple** if Google or other third-party sign-in is offered (Apple 4.8). Family links stay as trip invitations.
- **Creating a trip:** onboarding that builds an itinerary from nothing, from forwarded booking emails (the email inbox already reads them) or from a template, instead of a hand-made seed file.
- **Content per destination:** Japan first (the guides, phrasebook, stamps and games already fit); decide whether other destinations are in scope.
- **Branding:** a product name, icon and listing for I'm In Ventures, with the family's names and photos out of the build.
- **Children:** the app is built for families with children; decide whether under-13s get their own sign-in (parent-approved, minimal data) or appear only as members of a parent's trip. Stay out of the Kids category unless its rules are met.
- **Paying:** subscriptions for digital features go through Apple and Google in-app purchase (RevenueCat or similar keeps one server-side view of entitlements); affiliate booking links and real-world deposits sit outside in-app purchase.
- **Cost control:** Claude, Blob storage and push are paid per use; limits per trip or per plan, and abuse protection on the upload and AI routes.
- **Legal:** terms of use and a privacy policy for I'm In Ventures Pty Ltd; Privacy Act 1988 and the APPs (allergy details are health information, which is sensitive information); Australian Consumer Law for subscriptions and auto-renewal; a check of each data feed's commercial licence.

## Work plan and estimate

| # | Step | Effort |
|---|---|---|
| 1 | D-U-N-S number, then Apple and Google organisation accounts for I'm In Ventures Pty Ltd; company domain, email and website | 2–4 weeks elapsed; little effort. Start now |
| 2 | Cloud build account (Capawesome Cloud); upload signing certificates, APNs key and Android upload key | 1 day |
| 3 | Add Capacitor, API base address, CORS, build pipeline to TestFlight and Play internal testing | 2–3 days |
| 4 | Bearer-token sessions, secure storage, universal/app links for invitations | 2–3 days |
| 5 | Native push (APNs + FCM) alongside Web Push | 2–3 days |
| 6 | Native plugins: geolocation, camera, speech recognition, haptics, share; permission strings | 2–3 days |
| 7 | Offline check without the service worker; tickets and documents | 1–2 days |
| 8 | Icons, splash screens, safe areas, Android back gesture (the back stack from #222 helps) | 1–2 days |
| 9 | Many trips and groups: data model, migration of the family's trip, roles | 2–3 weeks |
| 10 | Sign-up, Sign in with Apple, in-app account and data deletion | 1 week |
| 11 | Trip creation and onboarding | 2–3 weeks |
| 12 | Subscriptions through in-app purchase, plan limits, cost controls | 1–2 weeks |
| 13 | Rebrand, reviewer demo account, terms, privacy policy, privacy labels, Data safety form, listings and screenshots | 1 week |
| 14 | Beta through TestFlight external testing and Play closed testing | 2–4 weeks elapsed |
| 15 | Store submission and fixes after review | 1–2 weeks elapsed |

- **Store wrapper (steps 2–8):** about 2–3 weeks.
- **Commercial product (steps 9–13):** about 7–10 weeks.
- **In all:** roughly 3 months of development, with accounts (step 1) and beta and review (steps 14–15) running alongside or after.

## Ongoing

- Store builds need a new version and review; each web change still ships to the family's web app at once. Capawesome Cloud live updates can push web-layer changes to installed apps without review within the stores' rules; native code changes still need review.
- Yearly Apple fee; yearly Android target-level bumps (API 36 from 31 August 2026); APNs key, Firebase project and signing keys to keep safe; cloud build plan.

## Open questions

- Product name, and whether the domain and trade mark are free.
- Japan only at launch, or any destination?
- Revenue: subscription, per-trip purchase, affiliate commission, or a mix?
- One codebase serving both the family's web app and the commercial apps, or fork once the family's trip is over? A single multi-trip codebase with the family's trip migrated in is the cleaner end state.
- Who in I'm In Ventures holds the Apple Account Holder role (the only role that can accept agreements)?

## Next step when picked up

1. Now: request the D-U-N-S number for I'm In Ventures Pty Ltd and set up the company domain and email, since the store accounts wait on them.
2. A spike on a branch: add Capacitor, bundle `dist/`, bearer-token sessions behind a flag, a Capawesome Cloud pipeline, and the current app running on one iPhone through TestFlight and one Android phone through Play internal testing.
3. A design note (like `docs/design/maps-memories-tags.md`) for the many-trips data model and sign-up, shared with the commercialisation design.

Sources: [Google Play target API levels](https://support.google.com/googleplay/android-developer/answer/11926878), [Play testing for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465), [Play organisation accounts and D-U-N-S](https://support.google.com/googleplay/android-developer/answer/13628312), [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple organisation enrolment](https://developer.apple.com/programs/enroll/), [Appflow shutdown and alternatives](https://capawesome.io/alternatives/ionic-appflow/), [Capacitor](https://capacitorjs.com/docs).
