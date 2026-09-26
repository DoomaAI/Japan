// Route details the guide left out of the travel stops: how long the walk, taxi or train takes,
// what the train or bus costs for an adult and a child, and for the trickier ones where we are
// coming from, the line, every station in between and which exit to take. Fares are per person,
// paid by IC card; a child fare is for ages 6–11 and under-6s ride free. Taxi fares are per car.
// Written once onto a stop the family has not renamed or re-noted: `was` is the guide's note,
// which is kept underneath.
import {NOTES_V1} from './stop-notes-v1.js';
// 2: fares, loop directions and exits checked against the operators' own pages.
export const NOTES_SEED=2;
const PLANS={
 '2026-09-26-01':{title:'Leave Kanra for Arashiyama',was:'Gojo → Kyoto → JR Sagano Line. Check Maps for departures.',lines:[
  'Travel: about 40 min. 1 min walk to Gojo Exit 8, subway 2 min (Gojo K10 → Kyoto K11), about 10 min to change at Kyoto, then about 16 min on the JR Sagano Line to Saga-Arashiyama (JR-E08).',
  'Fare: adult ¥460 · child ¥230 each (subway ¥220/¥110 + JR ¥240/¥120).',
 ]},
 '2026-09-26-07':{title:'Return towards Kyoto Station',lines:[
  'Travel: about 35 min. 15 min on foot, then about 16 min on the train.',
  'Fare: adult ¥240 · child ¥120 each (JR, Saga-Arashiyama → Kyoto).',
  'From: % Arabica by Togetsukyo Bridge. Walk north up the main street (Nagatsuji-dori), about 15 minutes, to JR Saga-Arashiyama Station (嵯峨嵐山 · JR-E08).',
  'Line: JR Sagano Line (San\'in Line), platform for Kyoto (京都方面). Every train ends at Kyoto, so ride to the last stop. Let Limited Express (特急) trains go; they need an extra ticket.',
  'Stops: 7 stops, about 15–20 minutes on a Local (普通). A Rapid (快速) skips some of them.',
  'Uzumasa JR-E07 · Hanazono JR-E06 · Emmachi JR-E05 · Nijo JR-E04 · Tambaguchi JR-E03 · Umekoji-Kyotonishi JR-E02 · Kyoto JR-E01',
  'Exit: Sagano Line trains arrive at platforms 31–33, at the west end of Kyoto Station. Go out through the Central Gate (中央口) on the Kyoto Tower side and follow signs for JR Kyoto Isetan (ジェイアール京都伊勢丹), on the west side of the concourse. The food hall is on B1.',
 ]},
 '2026-09-26-09':{title:'Subway home',lines:[
  'Travel: about 15 min. About 5 min from Isetan to the subway gates, 2 min on the train, 1 min walk.',
  'Line: Karasuma Line northbound (towards Kokusaikaikan), 1 stop: Kyoto K11 → Gojo K10.',
  'Exit: Gojo Exit 8. Hotel Kanra is about 1 minute from it.',
  'Fare: adult ¥220 · child ¥110 each.',
 ]},
 '2026-09-26-12':{title:'Walk to dinner',lines:[
  'Travel: about 5 min on foot. Karasuma Rock is on the same block of Karasuma-dori as Hotel Kanra.',
 ]},
 '2026-09-27-02':{title:'Walk to Kyoto Station',lines:[
  'Travel: about 12–15 min on foot. The Kintetsu gates are on the south (Hachijo) side of the station.',
 ]},
 '2026-09-27-03':{title:'Train to Nara',was:'Check current Kintetsu service.',lines:[
  'Travel: about 45 min on an Express (急行) to Kintetsu-Nara; about 35 min on a Limited Express (特急), which needs an extra reserved-seat ticket.',
  'Fare: adult ¥760 · child ¥380 each (Kintetsu, Kyoto → Kintetsu-Nara). A Limited Express adds ¥520 / ¥260.',
 ]},
 '2026-09-27-04':{title:'Bus towards Nara Park',was:'Use live directions and bus signs; guide suggests eastbound bus stop 1.',lines:[
  'Travel: about 10 min. West Gate (西改札), Exit 5, then back along the street to Bus Stop No. 1 by the 7-Eleven; 4–5 min on bus 2, 77 or 97 to Todai-ji Daibutsuden / Kasugataisha-mae. Walking instead is 15–20 min.',
  'Fare: adult ¥250 · child ¥130 each.',
 ]},
 '2026-09-27-08':{title:'Train back to Kyoto',lines:[
  'Travel: about 55 min. About 5 min on foot from Nakatanidou to Kintetsu-Nara, then about 45 min on an Express to Kyoto.',
  'Fare: adult ¥760 · child ¥380 each (Kintetsu, Kintetsu-Nara → Kyoto).',
 ]},
 '2026-09-27-10':{title:'Head to Gion',lines:[
  'Travel: about 15 min by taxi, about ¥1,200–1,500 per car.',
 ]},
 '2026-09-27-13':{title:'Return kimono and change',lines:[
  'Travel: about 15 min on foot, downhill from Yasaka Pagoda past Yasaka Shrine to Shijo-dori. Allow longer walking in kimono.',
 ]},
 '2026-09-27-20':{title:'Return to Kanra',lines:[
  'Travel: about 10–15 min by taxi, about ¥1,500 per car. Taxis are easiest to find on Shijo-dori.',
 ]},
 '2026-09-28-02-2':{title:'Train to Osaka',was:'JR Kyoto Line, then metro towards Shinsaibashi. Timing flexible.',lines:[
  'Travel: about 60 min door to door. 12–15 min walk to Kyoto Station, 28–30 min on a JR Special Rapid (新快速) to Osaka, 5–10 min walk to Umeda, then about 6 min on the Midosuji Line to Shinsaibashi (Umeda M16 → Yodoyabashi M17 → Hommachi M18 → Shinsaibashi M19).',
  'Fare: adult ¥820 · child ¥410 each (JR ¥580/¥290 + Metro ¥240/¥120).',
 ]},
 '2026-09-28-14':{title:'Return to Kyoto',lines:[
  'Travel: about 70 min door to door. About 8 min on the Midosuji Line from Namba to Umeda, 5–10 min walk to JR Osaka, 28–30 min on a Special Rapid (新快速) to Kyoto, then 12–15 min on foot or 5–10 min by taxi.',
  'Fare: adult ¥820 · child ¥410 each (Metro ¥240/¥120 + JR ¥580/¥290), plus about ¥1,000 per car if we taxi from Kyoto Station.',
 ]},
 '2026-09-29-02':{title:'Walk to Totaro',lines:[
  'Travel: about 5 min on foot from Hotel Kanra.',
 ]},
 '2026-09-29-05':{title:'Walk to Kyoto Station',lines:[
  'Travel: about 12–15 min on foot. Follow signs for the Shinkansen (新幹線) gates.',
 ]},
 '2026-09-29-06':{title:'Nozomi 250 to Tokyo',was:'Green Car 8, seats 6-C, 6-D, 7-C, 7-D. Arrival 13:45 per guide.',lines:[
  'Travel: 2 h 15 min, 11:30 → 13:45. Tickets are booked.',
 ]},
 '2026-09-29-07':{title:'Tokyo Station: transfer to Keiyo Line',lines:[
  'Travel: allow 15–20 min on foot. The Keiyo Line platforms are deep underground at the south end of the station, along long moving walkways.',
 ]},
 '2026-09-29-08':{title:'Train to Maihama',lines:[
  'Travel: about 15 min, direct. Every Keiyo train stops at Maihama.',
  'Fare: adult ¥260 · child ¥130 each (JR, Tokyo → Maihama).',
 ]},
 '2026-09-29-09':{title:'Resort Line to Bayside',lines:[
  'Travel: about 15 min. 5 min on foot from Maihama to Resort Gateway, then about 10 min on the monorail, 2 stops (Tokyo Disneyland Station, Bayside); the hotel is 2–3 min from Bayside.',
  'Fare: adult ¥300 · child ¥150 each. Hotel guests do not get free passes; a 1-day Free Ticket is ¥700 / ¥350.',
 ]},
 '2026-09-29-11':{title:'Leave for Chef Mickey',lines:[
  'Travel: about 25 min. About 5 min on foot to Bayside, Resort Line 2 stops (Tokyo DisneySea, Resort Gateway) about 8 min, then about 5 min on foot to the Disney Ambassador Hotel.',
  'Fare: adult ¥300 · child ¥150 each. Hotel guests do not get free passes; a 1-day Free Ticket is ¥700 / ¥350.',
 ]},
 '2026-09-30-02':{title:'Leave hotel for Disneyland',lines:[
  'Travel: about 25 min. About 5 min on foot to Bayside, Resort Line 3 stops (Tokyo DisneySea, Resort Gateway, Tokyo Disneyland Station) about 13 min, then about 5 min on foot to the gates.',
  'Fare: adult ¥300 · child ¥150 each. Hotel guests do not get free passes; a 1-day Free Ticket is ¥700 / ¥350.',
 ]},
 '2026-09-30-19':{title:'Return to Fantasy Springs',lines:[
  'Travel: about 25 min, plus queues after the night show. Resort Line from Tokyo Disneyland Station to Bayside, 1 stop, about 4 min, then about 5 min on foot.',
  'Fare: adult ¥300 · child ¥150 each. Hotel guests do not get free passes; a 1-day Free Ticket is ¥700 / ¥350.',
 ]},
 '2026-10-01-14':{title:'Begin exit and journey to Hilton',was:'Resort Line → Maihama → Tokyo → Nishi-shinjuku. Check live routing.',lines:[
  'Travel: about 75–90 min. Resort Line to Resort Gateway (about 5 min), 5 min on foot to JR Maihama, Keiyo Line to Tokyo (about 15 min), 15–20 min on foot to the Marunouchi Line, Marunouchi Line towards Ogikubo to Nishi-shinjuku M07 (about 20 min), then Exit C8 into Hiltopia, about 2 min.',
  'Fare: adult ¥770 · child ¥390 each (Resort Line ¥300/¥150 + JR ¥260/¥130 + Metro ¥210/¥110).',
 ]},
 '2026-10-02-02':{title:'Head to Tsukiji',lines:[
  'Travel: about 35 min. About 5 min underground via Exit C8 to Tochomae (E28), Toei Oedo Line towards Roppongi, 10 stops, about 21 min to Tsukijishijo (E18), then about 3 min on foot.',
  'Fare: adult ¥280 · child ¥140 each.',
 ]},
 '2026-10-02-04':{title:'Train to Akihabara',lines:[
  'Travel: about 20–25 min. About 5 min on foot to Tsukiji Station, then the Hibiya Line towards Kita-senju, 5 stops, about 11 min to Akihabara; Exit 3 for Electric Town.',
  'Fare: adult ¥180 · child ¥90 each.',
 ]},
 '2026-10-02-09':{title:'Return to Hilton',lines:[
  'Travel: about 55 min. JR Chuo-Sobu Local westbound from Akihabara to Shinjuku, about 20 min, then the Hilton shuttle from the West Exit or the Marunouchi Line 1 stop to Nishi-shinjuku.',
  'Fare: adult ¥210 · child ¥100 each (JR), plus ¥180/¥90 if we take the Marunouchi Line instead of the shuttle.',
 ]},
 '2026-10-03-02':{title:'Shuttle and train to Harajuku',was:'JR Yamanote Line; use Takeshita Exit.',lines:[
  'Travel: about 30 min. Hilton shuttle to Shinjuku Station West Exit, about 10 min (free), then the JR Yamanote Line 2 stops (Yoyogi, Harajuku), about 4 min. The shuttle runs fewer trips since 2026; check the timetable at the desk.',
  'Fare: adult ¥160 · child ¥80 each.',
 ]},
 '2026-10-03-12':{title:'Hard stop: return to Hilton',was:'Planning lock to protect the hotel rest and game transfer. Not a reservation.',lines:[
  'Travel: about 35 min. About 10 min on foot to JR Harajuku, Yamanote Line 2 stops to Shinjuku, about 4 min, then the Hilton shuttle or a 15 min walk.',
  'Fare: adult ¥160 · child ¥80 each.',
 ]},
 '2026-10-03-14':{title:'Leave for Tokyo Dome',was:'Guide route: Marunouchi Line to Korakuen, Exit 2. Check live route.',lines:[
  'Travel: about 35 min. 5 min through Hiltopia to Nishi-shinjuku (M07), Exit C8, Marunouchi Line towards Ikebukuro, direct to Korakuen (M22), about 25 min, then Exit 2 to Tokyo Dome City.',
  'Fare: adult ¥260 · child ¥130 each.',
 ]},
 '2026-10-03-18':{title:'Return after the game',was:'Finish time is an estimate.',lines:[
  'Travel: about 40 min, plus crowds at Korakuen. Marunouchi Line towards Ogikubo, direct from Korakuen (M22) to Nishi-shinjuku (M07), then the Hiltopia passage.',
  'Fare: adult ¥260 · child ¥130 each.',
 ]},
 '2026-10-04-02':{title:'Head to Ginza',lines:[
  'Travel: about 30 min. 5 min through Hiltopia to Nishi-shinjuku (M07), Exit C8, then the Marunouchi Line towards Ikebukuro, 9 stops, about 20 min to Ginza (M16).',
  'Fare: adult ¥210 · child ¥110 each.',
 ]},
 '2026-10-04-06':{title:'Head to Tokyo Station',lines:[
  'Travel: about 15–20 min on foot from Chuo-dori, or the Marunouchi Line 1 stop from Ginza (adult ¥180 · child ¥90 each).',
 ]},
 '2026-10-04-11':{title:'Travel to Shimokitazawa',was:'The guide\'s 15-minute transfer target needs checking in Maps.',lines:[
  'Travel: about 40 min. Marunouchi Line from Tokyo (M17) to Shinjuku (M08), about 17 min, 5 min on foot to the Odakyu Line, then 7–10 min to Shimokitazawa.',
  'Fare: adult ¥380 · child ¥200 each (Metro ¥210/¥110 + Odakyu ¥170/¥90). A child on an IC card pays a flat ¥50 on Odakyu.',
 ]},
 '2026-10-04-13':{title:'Travel to Shinjuku',lines:[
  'Travel: about 25 min. Odakyu Line towards Shinjuku, 8–10 min, then about 10 min on foot to dinner.',
  'Fare: adult ¥170 · child ¥90 each. A child on an IC card pays a flat ¥50 on Odakyu.',
 ]},
 '2026-10-04-15':{title:'Return to Hilton',lines:[
  'Travel: about 20 min. Hilton shuttle from Shinjuku West Exit, or about 15 min on foot; a taxi is about 5 min and about ¥800 per car.',
 ]},
 '2026-10-05-06':{title:'Walk towards EDW yellow',lines:[
  'Travel: about 5–10 min on foot within Shibuya (Udagawacho).',
 ]},
 '2026-10-05-10':{title:'Browse or head home',lines:[
  'Travel: about 35 min. 5–10 min on foot to Shibuya Station, JR Yamanote Line 3 stops (Harajuku, Yoyogi, Shinjuku), about 7 min, then the Hilton shuttle or a 15 min walk. A taxi is about 20 min and about ¥2,000–2,500 per car.',
  'Fare: adult ¥200 · child ¥100 each.',
 ]},
 '2026-10-06-03':{title:'Head to Gotokuji',lines:[
  'Travel: about 45 min. Shuttle or 15 min on foot to Shinjuku, Odakyu Line Local (各駅停車, the only trains that stop there) about 15 min to Gotokuji, then about 10 min on foot to the temple.',
  'Fare: adult ¥200 · child ¥100 each. A child on an IC card pays a flat ¥50 on Odakyu.',
 ]},
 '2026-10-06-05':{title:'Return to Hilton',lines:[
  'Travel: about 45 min. 10 min on foot to Gotokuji Station, Odakyu Line towards Shinjuku about 15 min, then the Hilton shuttle or a 15 min walk.',
  'Fare: adult ¥200 · child ¥100 each. A child on an IC card pays a flat ¥50 on Odakyu.',
 ]},
 '2026-10-06-09':{title:'Chauffeur pickup',was:'Confirm pickup with provider. Keep airport buffer.',lines:[
  'Travel: about 30–45 min by car to Haneda Terminal 3, longer in evening traffic. Prebooked.',
 ]},
};
export const STOP_NOTES=Object.fromEntries(Object.entries(PLANS).map(([id,{title,was='',lines}])=>[id,{title,was,notes:[...lines,was].filter(Boolean).join('\n')}]));
export function notesSeeded(state){
 if((state.notesSeed||0)>=NOTES_SEED)return state;
 const steps=(state.steps||[]).map(s=>{
  const plan=STOP_NOTES[s.id];
  const from=(state.notesSeed||0)<1?plan?.was:NOTES_V1[s.id];
  return plan&&from!==undefined&&s.title===plan.title&&(s.notes||'')===from?{...s,notes:plan.notes}:s;
 });
 return {...state,steps,notesSeed:NOTES_SEED};
}
