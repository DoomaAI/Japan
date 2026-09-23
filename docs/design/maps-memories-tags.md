# Design note: tags, memories and the family on a map

Status: built, apart from the options below.

- **Built:**
  - Section 1, the Tracker tags screen.
  - Section 2, the Memory map screen, with Leaflet and OpenStreetMap tiles.
  - Section 3a, "last seen" check-ins with a 3-hour expiry.
- **Not built:**
  - Offline tiles (PMTiles).
  - Static day maps in the diary export.
  - GPS from HEIC photos.
  - The Shortcuts background check-in (3b).
Date: 23 September 2026 (trip day 3 of 16).

## What was asked

- Bluetooth tags (AirTags or similar) on luggage, bags and the boys.
- Fond memories placed on a map: photos, voice notes, ratings, diary lines, shop finds.
- Other members of the travel party shown on a map.

## Constraints that decide the design

| Constraint | Consequence |
| --- | --- |
| iOS Safari and Home Screen web apps have **no Web Bluetooth**, and Apple has no plans to add it. | The app cannot scan for, ring or read a tag. |
| Apple gives no API for Find My item locations. Tile and other Life360 tags have no public API either. | The app cannot place a tag on its own map. The only route in is a link that the owner shares. |
| **Share Item Location** (Find My, iOS 18.2+) makes a link to a tag's location. It expires after 7 days or when the item is found. Airlines such as Qantas take it for lost bags. Recipients may have to sign in. | The app can keep the link and open it with one tap. It cannot embed or read the location. |
| A web app gets no location in the background on iOS. | Any position the app shows comes from a phone that had the app open, and is as old as that moment. |
| The Places screen is a Google My Maps **iframe**. The app cannot draw on it. | Memories and people need a map layer the app owns. |
| `data/map-locations.json` holds 209 places with addresses and **no coordinates**. Only stops pinned by hand (`step.pin`) and shop finds (`find.pin`) have lat/lng. | The places need coordinates before anything can be mapped. |
| Current privacy stance: Nearby rounds the position to about 100 m and never stores it. Stop pins are about 10 m and only when someone taps. | Storing people's live positions is a new kind of data. It needs explicit opt-in, a short retention period and a visible "sharing" indicator. |
| Nate is 5. The boys may not carry phones. | The boys will usually be located by a tag or a parent, not by their own device. |

## Proposal, in order of value for the rest of the trip

### 1. Tag register (small; could ship this week)

A **Tags** section in Tickets, built on the existing documents model (`category: 'tag'`):

- One entry per tag: what it is on (a suitcase, a backpack, a child), whose it is, and which Apple Account owns it.
- Its current **Share Item Location** link, with the date it was pasted. The app shows "expires about <date>" (7 days on) and marks it stale after that.
- One tap opens the link in Find My, or in the browser on a non-Apple phone.
- **Luggage forwarding:** a tag entry links to the takkyubin/hotel-move steps it travels with. The pack-up callout on those days then shows "Suitcase 2 has a tag — open in Find My".
- **Lost-bag card:** a Show-someone card in Japanese and English: "This bag has an Apple AirTag. Here is a link to where it is." It carries the booking reference from the linked ticket and the Qantas report steps.
- **Boys' meeting card:** an optional line "My backpack has a tracker; my parents can find it" in Japanese. It never includes the link, because a printed card can be lost.
- **Setup checklist, in the Help screen:**
  - Share each tag with the other parent in Find My (Share Item). Otherwise the parent without the tag gets "AirTag found moving with you" alerts.
  - Turn on Separation Alerts for the boys' bags.
  - Check the batteries.

This needs no new permission and adds no new data beyond a URL. It works offline in the sense that the link is always to hand, although opening it needs a signal.

### 2. Memory map (medium; worth having during the trip and after it)

An app-owned map, as a new tab or a toggle on Places. It sits beside the My Maps iframe and does not replace it.

**Map library:** MapLibre GL JS, which is open source and needs no Google key.

**Tiles, in order of preference:**

1. A **Protomaps PMTiles** extract of the trip areas (Tokyo, Hakone/Fuji, Kyoto, Osaka) stored in the private Blob store and read with HTTP range requests. It needs no third-party key and can be cached for offline use one area at a time.
2. A hosted tile API such as MapTiler or Stadia. This needs a key.

Bulk-caching openstreetmap.org tiles is not allowed under OpenStreetMap's tile usage policy.

**Coordinates for the 209 places:** export KML from the family My Map, which has coordinates for every pin, and extend `scripts/import-map-locations.py` to join them by name. Places with no match fall back to one-off geocoding, which a person then checks. The result is written into `map-locations.json` as `lat`/`lng`.

**What goes on the map:**

| Layer | Where its position comes from |
| --- | --- |
| The day's route | Stops in order: `step.pin`, otherwise the stop's resolved location. The line runs between them, and completed stops are solid. |
| Photos and videos | EXIF GPS where the upload kept it; otherwise the attached stop. A marker that uses the stop's position is drawn as "at this stop", not as an exact spot. |
| Voice notes, ratings, reviews, mission discoveries | The stop they belong to. |
| Shop finds | `find.pin`, then the stop. |
| Diary line | The stop. |

- Markers cluster by stop. Tapping one opens a sheet with the stop's photos, voice notes, stars and what each person said. That content comes from components that already exist (MediaGallery, VoiceNotes, StepReview).
- Filters: day, city, person ("Boston's memories") and kind.
- **Diary export:** add a static map image per day to the existing HTML diary export, so the map outlasts the app.

**Open question on EXIF:** Safari's photo picker may strip location from uploads, depending on the iOS version and the sharing options. Test this on the family's phones before relying on it. The fallback to the stop's position keeps the feature useful either way.

**Server change:** read GPS from EXIF when a photo is uploaded, round it to 4 decimal places (about 10 m), and store it on the media item. Do this server-side, because the original file is already there.

### 3. Party on the map (medium; needs a privacy decision)

This is two parts, and neither is a live tracker:

**3a. "Last seen" check-ins in the app**

- A person taps **Share where I am**. The position is stored rounded to about 100 m, with a timestamp.
- Only the latest position per person is kept, and it is deleted after a set period (suggested: 3 hours).
- The map shows each person's character avatar at that point, labelled "12 min ago". It fades with age and is gone once the period ends.
- Optional: while it is switched on, the position refreshes during the existing 15-second foreground sync, and a banner says "Sharing your position with the family".
- It switches itself off at the end of the day.
- The boys' check-ins, if they ever carry a device, are visible to parents only.

**3b. Background positions through Shortcuts (optional)**

- An iOS Shortcuts personal automation (on a timer, or on arriving at or leaving a place) can run **Get Current Location** and then **Get Contents of URL**. That posts to `/api/checkin` with the person's own invite token.
- iOS does this without the app being open. It is the only way a web app gets background positions on iOS.
- The app already hands off to Shortcuts for alarms, so this follows an existing pattern.
- Costs: some battery, and each person has to set it up once.

**Recommendation:** for real-time "where is Mum right now", keep using Apple's own **Find My → Share My Location** between the parents. It is more reliable than anything a web app can do. The app's party layer is for context: "Lauren and Boston were at the aquarium 20 minutes ago", next to the plan and the memories.

## Data model sketch

```
state.tags[]        { id, label, carriedBy, owner, shareUrl, shareUrlAt, stepIds[], notes }
media[].gps         { lat, lng }                  // rounded, from EXIF, optional
locations[].lat/lng                               // from My Maps KML import
checkins[]          { memberId, lat, lng, at }    // server-side, latest per member, TTL-purged
```

- `tags` follows the documents pattern (parents edit; everyone can view).
- `checkins` sits outside `state`, so it is not in audit history or offline snapshots. That keeps positions out of the permanent record.

## Security and permissions

- `Permissions-Policy` already allows `geolocation=(self)`. It stays as it is.
- Tiles through MapLibre need a `connect-src` and `img-src` entry only if a CSP is added later. There is none today.
- Share Item Location URLs are sensitive for as long as they are live. Only parents see the full URL; everyone else sees an "Open in Find My" button. They are never put on printed or shown cards.
- Check-ins are left out of the diary export, the WebMCP lookup and anything sent to the Claude API: AskTrip, Nearby and suggestions.

## What not to build

- Web Bluetooth scanning. It cannot work on the family's iPhones.
- Scraping or automating icloud.com/find. This breaks Apple's terms and would stop working without warning.
- A continuous background tracker for the children. The platform cannot do it reliably, and Find My already does it properly.

## Suggested sequence

1. Tag register, lost-bag card and setup checklist. Build this week, while the tags matter most, especially for luggage forwarding.
2. KML coordinate import, then the memory map with the route, stop memories and shop finds.
3. EXIF GPS on upload, after the device test.
4. "Last seen" check-ins, after the parents agree the retention period.
5. The Shortcuts background check-in, only if 4 proves useful.
