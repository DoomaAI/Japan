# UX review against apps outside travel — logged 30 September 2026

The last review ([roadmap.md](roadmap.md#ux-review-against-hotel-and-event-apps--logged-30-september-2026)) measured the app against the hotel and event apps it most resembles. This one looks the other way: at apps nobody would compare a family trip app to, for the one mechanic each does better than anyone, and asks whether it would earn its place here. Written on day 9 of 16, with the Disney days next and then Tokyo to 6 October, so what helps in the next seven days is put first.

Reviewed: Domino's Pizza Tracker and Uber Eats (order stages), iMessage Check In and Find My (arrival), Strava and Relive (kudos, segments, the flyover), Duolingo (the daily lesson, streak freezes), Spotify Wrapped and Blend (the shareable recap, taste in common), Up and Monzo (spending pulse, runway), Apple Fitness (rings), Kitchen Stories and Paprika (cook mode), BeReal, Locket and Dispo (the shared moment, the photo that develops later), Wordle and NYT Games (one daily puzzle, the emoji grid), Kahoot and Jackbox (phones as buzzers), Waze (one-tap reports), WHOOP and Oura (readiness), Raycast and Superhuman (the command palette), Apple Music (synced lyrics), Kindle (time left), Cash App (the number pad).

## Where a wow lands in this app

Three audiences, three moments. An idea was kept only if it serves one of them.

- **The boys**, on a train, in a queue, at the end of the day. They respond to stages, rings, buzzers and grids, not to text.
- **The grandparents** on the follow-along link, who can look but cannot say anything back.
- **A parent under pressure**: the transfer at Shinagawa, a family split in two at DisneySea, the gate at Haneda. What helps here is fewer words on a bigger screen, and knowing where the other half is.

## The ideas

| # | Idea | Borrowed from | What it does here | Build | When |
|---|---|---|---|---|---|
| 01 | Stage tracker for the next fixed time | Domino's, Uber Eats | The leave-by line becomes five stages: Packed · Left the hotel · On the train · Walking · At the gate. Stages tick from the phone's position where it can (the route card already watches it) and by a tap where it cannot | M | Done 30 Sept: five dots under the next fixed booking |
| 02 | Check In when the family splits | iMessage Check In, Find My | One tap: "Back at the hotel by 4:30". The other parent's phone shows the ETA, is told on arrival, and is told again if arrival is late and the phone has gone quiet | M | Done 30 Sept: Check in on the dashboard, a card on the others' Home |
| 03 | Queue and toilet reports | Waze | A one-tap report pinned to where the phone is: queue 40 min, toilets clean, sold out. Shows on the other phones' Today for two hours, then goes into the diary | S | Done 30 Sept: Report button under the stop, From the family on Home |
| 04 | Kudos from home | Strava | A tap on a photo or a ticked stop from the follow-along link: a clap, a heart, a "wow". Nothing to type. The boys see who clapped at breakfast | S | Done 30 Sept: on the follow-along link, tallied on the photo and the day |
| 05 | Daily grid puzzle with a shareable result | Wordle, NYT Games | One puzzle a day for the whole family, same for everyone: today's kana, today's place from a cropped photo, the price of the ramen. The result is an emoji grid that copies to Messages without giving the answer away | S | Done 30 Sept: on Home and first in Games |
| 06 | Big-step mode for a transfer | Kitchen Stories, Paprika | A route card opened as one step per screen: the platform, the car number, the exit. Tap the right half for the next step, the screen stays awake, and Read aloud says it while the phone is in a pocket | S | Done 30 Sept: Big steps on every route card |
| 07 | Readiness at breakfast | WHOOP, Oura | Everyone taps 1 to 5 at breakfast: feet, sleep, mood. Under 3 for anyone and the day in brief offers the shorter version of the day and the "We're tired" options before they are needed | S | Done 30 Sept: five faces on the day in brief |
| 08 | Halfway Wrapped, then Blend | Spotify | A midway card now (the numbers so far, each person's top stop) and a Blend at the end: what Nate and Boston both gave five stars, and the one thing they disagreed about most. A square image for the share sheet | M | This trip, then after |
| 09 | Runway on the Yen tab | Up, Monzo | "At this pace the cash lasts until Saturday." One line under the ledger, from the daily budget already in the party profile, with the biggest category by emoji. Round-ups from the boys' purses into a keepsake fund | S | Done 30 Sept: on the Yen page and the ledger; round-ups on the purses |
| 10 | Three rings for the day | Apple Fitness | Stops, photos, phrases said, as three rings that close through the day. Closed rings give the leaderboard its day score. No steps: the browser cannot read them | S | This trip |
| 11 | Dinner quiz, phones as buzzers | Kahoot, Jackbox | A parent's phone hosts five questions from the trip's fun facts and today's stops; the boys' phones are the buzzers; speed scores. Answers travel on the fifteen-second refresh every phone already runs, so each question gets a twenty-second window | M | This trip |
| 12 | The photo that develops tomorrow | Dispo, BeReal | A "film" mode on quick capture: photos taken in it are hidden until the morning briefing, where they are unwrapped as a roll. One BeReal moment a day, the same minute on every phone, goes straight into the photo-of-the-day vote | S | This trip |
| 13 | Flyover replay | Relive | The memory map replay as a camera flight along the route, day by day, the photos rising from the map as it passes them, recorded to MP4 on the phone. It reuses the highlights render plan | L | After |
| 14 | Type anything | Raycast, Superhuman | One search box on Home, offline and instant: stops, hotels, tickets, phrases, shopping items, settings. Ask stays for questions; this is for names | M | After |
| 15 | Phrases with synced words | Apple Music lyrics | The phrase of the day lit up word by word as it is spoken, so the boys can say it along with the phone | S | After |
| 16 | Time left in today | Kindle | "About two hours of plan left at this pace" on the next-up tile, from the durations and ticks already recorded | S | After |
| 17 | Streak freeze | Duolingo | The morning-checklist streak survives a hotel-move day or a rain day without a tick, once a week, and says so | S | After |
| 18 | The number pad | Cash App | The yen converter as a full-height pad with digits that roll, and one tap to flip the direction | S | After |

Build: S is under half a day, M is a day, L is several days and needs a phone to test on.

## How each lands in what is already built

**01 Stage tracker.** The next-up tile already has the leave-by time, the estimate and a directions link. The stages sit under it as five dots joined by a line, and replace the "leave now, 12 min behind" wording with a position on the line. A tap on a dot ticks it; the route card's position watch ticks "Left the hotel" and "At the gate" when the phone is within about 150 metres of each end. A hotel move gets its own set: Packed · Checked out · Bags at the desk · On the Shinkansen · Checked in. The boys can watch it, which is the point.

**02 Check In.** Two phones, one line each way. Sender: a destination (any stop or hotel from today, or "the meeting point") and a time. Receiver: a small card on Home with the ETA and the sender's last known distance, and a plain line at arrival. If the time passes without an arrival and the phone has not reported for ten minutes, the card turns amber and offers the meeting card and the "I am lost" card. It needs the position posted to the server every few minutes while a check-in is live, which the route card's watch can do, and a push to the receiver, which waits on the push work in the backlog; until then the card is refreshed with the rest of the state every fifteen seconds while the app is open. Location is shared only for the life of the check-in and only with the named phone.

**03 Reports.** One button on the step we are on: Queue · Toilets · Sold out · Rain cover · Tip. It takes the phone's position and the current stop, and asks for nothing else. The report shows on the other phones as a line on the same stop for two hours, then is folded into the day's diary as a discovery. At a park with the family in two groups, this is the fastest way to say "don't bother with Soaring, 90 minutes".

**04 Kudos.** The follow-along link is read-only by design and stays so; a reaction is not a message. Three emoji, one tap, tied to the photo or stop, kept with the viewer's first name. On the family's phones the tally sits on the photo and on the day's tally widget ("Grandma clapped 6 times today"). The leaderboard can count claps received.

**05 Daily grid puzzle.** The games page has puzzles the boys play alone. This is the one everyone does and compares. Three kinds rotate: five kana from today's phrase (Wordle rules on the kana), which stop from a 60-pixel crop of yesterday's photo (three guesses, the crop widens), and the price of something bought yesterday from the ledger (higher or lower). The result copies as a grid of green and grey squares with the day number, so it can go to Messages or to the grandparents without spoiling the answer.

**06 Big-step mode.** Route cards already carry the legs. Big-step mode is a different rendering of the same card: one leg per screen in 28-point type, the Japanese for the station large enough to show a guard, tap right for next, left for back, with the screen-wake lock the ticket code viewer already asks for, and Read aloud on each step. Meant for 6 October: Hilton to Haneda with the cases and two boys.

**07 Readiness.** Five faces per person on the morning briefing, tapped once. The day in brief reads them: under 3 for anyone and it says "Boston is at 2, so today's shorter version is ready", which the existing "We're tired" and split-day tools already know how to produce. Nothing else changes. The recap can graph it later.

**08 Halfway Wrapped and Blend.** The recap story is built for after the trip. A halfway card is the same code with a shorter list: days done, stops ticked, photos, phrases said, the highest-rated stop so far, and everyone's most-photographed thing. The Blend is a pairwise card at the end: for any two of the four, what they both starred, and the stop with the widest gap between their ratings. Both render to a square image for the share sheet, which the code sender already does.

**09 Runway.** The ledger has every yen and the profile has a daily budget. Runway is one arithmetic line: cash left divided by the spend rate over the last three days, said as a day of the week. The category line uses the ledger's categories with an emoji each. Round-ups are a purse setting: each purchase rounds up to the next ¥100 and the difference goes to a keepsake fund shown on the trip shop.

**10 Rings.** Three targets a day, set by the day: the number of stops planned, five photos, one phrase said. Each ring closes as the ticks come in; the day-score on the leaderboard is the number of rings closed. Steps are left out honestly: Safari does not give a web app the pedometer.

**11 Dinner quiz.** Kahoot's shape exactly: the host phone shows the question, four coloured answers on the boys' phones, points for right and for fast. Questions come from the fun facts already read this trip and from today's stops ("What time was the sumo?"). There is no live channel between the phones: shared state is refreshed every fifteen seconds. So each question runs for twenty seconds on a shared clock, the answers land on the next refresh, and the host shows the scores when the window closes. Fast enough for a table, not for a millisecond buzzer, and the copy should say so. It is a table game for a restaurant wait.

**12 Film mode and the moment.** Quick capture gets a Film switch: a photo taken with it on is stored as usual but marked, and the gallery hides it until 7 am the next day, when the morning briefing shows the roll. The daily moment is a random time between 10 am and 8 pm, the same on every phone from the day's seed, with a two-minute window and a small buzz; the four photos go into tonight's photo-of-the-day vote as a set.

**13 Flyover.** Relive's product is a camera flying over a map along a recorded route, with photos popping up. The memory map already has the route and the photos by position. A flyover is the replay drawn with a moving perspective on a canvas and recorded through the same phone-side MP4 path the highlights design describes, so nothing leaves the private store. Several days of work and it needs an iPhone to test on; after the trip.

**14 Type anything.** More has grown to the point that a parent scrolls to find things. A search field at the top of Home, working on the state already on the phone, returning stops, hotels, tickets, phrases, shopping items, people and settings pages in one list, opening on a tap. No network, no AI. Ask keeps the questions.

**15 Synced words.** Speech synthesis reports word boundaries; the phrase card lights each romaji word as it is said, with a tap to slow it down. Small, and makes the phrase something the boys join in with rather than listen to.

**16, 17, 18** are the small ones: a time-left line from data already there; a streak rule that forgives one missed morning a week; and a converter that feels like a payment app rather than a form.

## Order

- **Now, in the next seven days, in this order:** 03 Reports and 02 Check In (the Disney days are the case for both), 06 Big-step mode (Haneda), 05 the daily puzzle, 04 kudos, 07 readiness, 09 runway, 01 the stage tracker, 08 the halfway card. Each is a pull request on its own.
- **After the trip:** 08 Blend, 13 the flyover, 14 type anything, and the small ones.
- **Commercial version only:** the kudos and the puzzle need a viewer identity and consent handling for a family that is not ours, logged in [commercialisation.md](commercialisation.md) terms.

## Considered and left out

- **AR (Pokémon Go, IKEA Place).** Impressive in a demo, unused on day three, and heavy on a web app.
- **Live voice between phones (Discord, walkie-talkie apps).** Voice notes already cover it; live audio in a browser on iPhone is fragile, and Messages does it better.
- **Loot boxes, chests and timed rewards (Clash Royale, Temu).** They work by making children anxious. The stamp book rewards things the boys did.
- **Always-on family location (Life360).** Location is shared here only for the life of a check-in, to a named phone, and it says so. Nothing runs when the app is closed.
- **Generated imagery and video.** The recap is our pictures; the highlights design already rules this out.
- **Streak pressure on the boys.** The only streak is the parents' morning checklist, and the freeze (17) is there to keep it kind.
