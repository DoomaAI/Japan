# Commercialisation log: trip watches

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

## Open questions

- Scope: Japan only at first, or any destination?
- Revenue: subscription, affiliate commission on bookings, or both? Affiliate terms decide which fare feed to use.
- Licensing: can each feed be stored, re-displayed and used to trigger alerts commercially? Run the external-source licence check on each before committing.
- Australian consumer law and privacy: price alerts must not mislead (ACL s 18, s 29 on price representations); alert and party data falls under the Privacy Act 1988 and the APPs.
- Polling cost: how often each watch is checked, and the cost per watch per month.

## Next step when picked up

A short design note (like `docs/design/maps-memories-tags.md`) covering the watch data model, the rating formula and the polling job, then a prototype with one fare feed, Open-Meteo, and the sumo calendar.
