# Native apps log: iPhone App Store and Google Play

Logged 29 September 2026, day 9 of 16. What it would take to ship the app to the App Store and Google Play, not a plan to do it during the trip. Today the app is a Home Screen web app on Vercel with no store review; that stays the family's version until a store build is needed, most likely for the [commercial version](commercialisation.md).

## Recommendation

Wrap the existing React/Vite build with **Capacitor**, not a rewrite in React Native, Flutter or Swift/Kotlin.

- The app is about 21,700 lines of web UI plus a Node API (`server/`). Capacitor reuses all of it; a rewrite repeats it twice.
- Capacitor produces real `ios/` and `android/` projects, so any screen that needs to be native later can be replaced one at a time.
- The API stays on Vercel unchanged apart from auth and push (below).

## Distribution options

| Route | Who can install | Review | Fit |
|---|---|---|---|
| Keep the web app (today) | Anyone with a family link | None | Enough for the family |
| iOS TestFlight | Up to 100 internal testers (App Store Connect users) with no review; up to 10,000 external by link, first build reviewed; each build lasts 90 days | Light | Best private iPhone route |
| iOS Unlisted App | Anyone with the direct link; hidden from search | Full App Store review | Private but permanent |
| iOS public App Store | Everyone | Full review | Commercial version |
| Play internal testing | Up to 100 testers by email | None | Best private Android route |
| Play closed testing, then production | Everyone | Full review | Commercial version |
| Android APK sideload | Anyone sent the file | None | Quickest for one Android phone |

## Accounts and fixed costs

| Item | Cost | Notes |
|---|---|---|
| Apple Developer Program | US$99 a year | Enrol as an organisation (needs a D-U-N-S number) if the app will be sold under a company; personal otherwise |
| Google Play Console | US$25 once | A **personal** account created after 13 Nov 2023 must run a closed test with at least 12 testers opted in for 14 consecutive days before production access. An **organisation** account is exempt |
| A Mac with Xcode | Existing or hosted | Needed to build and sign iOS; or a cloud build service (Codemagic, Ionic Appflow, GitHub Actions macOS runners) |
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
- **Sign-in for reviewers:** the app is private behind family links. Both stores need a working demo login in the review notes; the existing local demo mode (`LOCAL_DEMO`) is the starting point for a reviewer account with sample data, not the family's.
- **Account deletion (Apple 5.1.1(v); Google Play data deletion policy):** if people can get an account in the app, they must be able to delete it in the app, and Google also needs a web link to request deletion. Today grants are made by a parent; a "delete me and my data" action in Settings would satisfy both.
- **Privacy:** a public privacy policy URL; Apple's privacy "nutrition label" and privacy manifest; Google's Data safety form. Declare location, photos, audio, family names and ages, allergy details (health-adjacent) and receipts. For a commercial version, the Privacy Act 1988 and the APPs apply.
- **AI features:** the app sends photos, menus, documents and questions to Claude through the server. Disclose third-party AI processing in the privacy policy and the review notes.
- **Children:** family members under 13 use the app. For the family build this is private; a public version must not be listed in the Kids category unless it meets those rules, and any child data collection needs care under both stores' policies.
- **Payments:** none today. If the commercial version sells subscriptions, digital features must use Apple/Google in-app purchase (outside the US storefront rules); booking travel and paying deposits for real-world services is exempt.

## Work plan and estimate

| # | Step | Effort |
|---|---|---|
| 1 | Accounts: Apple (organisation or personal), Google Play (organisation avoids the 12-tester test) | 1–3 weeks elapsed for D-U-N-S/verification; little effort |
| 2 | Add Capacitor, API base address, CORS, build scripts | 1–2 days |
| 3 | Bearer-token sessions, secure storage, universal/app links for family links | 2–3 days |
| 4 | Native push (APNs + FCM) alongside Web Push | 2–3 days |
| 5 | Native plugins: geolocation, camera, speech recognition, haptics, share; permission strings | 2–3 days |
| 6 | Offline check without the service worker; tickets and documents | 1–2 days |
| 7 | Icons, splash screens, safe areas, back gesture on Android (the back stack from #222 helps) | 1–2 days |
| 8 | Reviewer demo account, in-app delete, privacy policy, store listings and screenshots | 2–3 days |
| 9 | TestFlight and Play internal testing on the family's phones | 1 week elapsed |
| 10 | Store submission and fixes after review | 1–2 weeks elapsed |

Roughly **3–4 weeks of development** plus account and review lead time. The private route (steps 1–7 and 9) is about two weeks and needs no public listing.

## Ongoing

- Two more releases to keep: each change ships to the web at once, but store builds need a new version and review. Capacitor live-update services (Capgo, Appflow) can push web-layer changes without review within the stores' rules; native code changes still need review.
- Yearly Apple fee; TestFlight builds expire after 90 days; yearly Android target-level bumps; APNs key and Firebase project to maintain.

## Open questions

- Is a store build needed for the family at all, or only for the commercial version?
- Personal or organisation developer accounts (and which entity owns the apps)?
- Mac available for iOS builds, or a cloud build service?
- Keep one codebase for the family and commercial versions, or fork at the point of commercialisation?

## Next step when picked up

A spike on a branch: add Capacitor, bundle `dist/`, switch sessions to bearer tokens behind a flag, and get the app running on one iPhone through TestFlight and one Android phone through Play internal testing. That proves the auth, offline and push changes before any store listing work.

Sources: [Google Play target API levels](https://support.google.com/googleplay/android-developer/answer/11926878), [Play testing for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465), [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Capacitor](https://capacitorjs.com/docs).
