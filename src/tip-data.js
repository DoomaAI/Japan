// Tips: the practical side of the guide, one card each — getting around, money, phones, the boys,
// food, the parks, keeping comfortable — with the manners from etiquette-data.js alongside them.
// Facts are something worth knowing; a tip is something worth doing, and nearly all of these are
// the guide's own "top tips", "local tips", "good to know" and "Lauren's notes" boxes, tied to the
// page they came from so a day's own tips come round on that day, the way its facts do.
//
// `anytime` marks the tips from the guide's opening pages, which fit any day. `match` is the
// same as a fact's: the words a stop has to say for the tip to belong to it. `boys` is the
// line for a young reader; a tip without one is for the grown-ups and is left out for him.
// Order is priority, as with facts: within a day the tips are written best-first.
import {ETIQUETTE,etiquetteFor} from './etiquette-data.js';
export const TIP_GROUPS={
 around:{label:'Getting around',icon:'🚃'},
 money:{label:'Money',icon:'💴'},
 phone:{label:'Phones and apps',icon:'📱'},
 boys:{label:'With the boys',icon:'🧒'},
 food:{label:'Food',icon:'🍙'},
 comfort:{label:'Staying comfortable',icon:'🌡️'},
 shop:{label:'Shopping',icon:'🛍️'},
 parks:{label:'At the parks',icon:'🎢'},
 bookings:{label:'Bookings',icon:'🎟️'},
 manners:{label:'Manners',icon:'🙇'},
};
export const TIPS=[
 // ---- The guide's opening pages: before you go (2), family travel (4), smart notes (18).
 {id:'suica',group:'around',page:18,anytime:true,match:['station','train','metro','subway','bus'],title:'One card for every train',
  text:'Keep a Suica in Apple Wallet with at least ¥3,000 on it. Tap on and tap off for trains, metros and buses in Tokyo, Kyoto and Osaka.',
  boys:'Tap the card on the gate going in, and again coming out.'},
 {id:'suica-pay',group:'around',page:18,anytime:true,match:['konbini','convenience store','7 eleven','lawson','familymart'],title:'Suica pays for snacks too',
  text:'The same Suica pays at convenience stores, most vending machines and coin lockers, so small change is rarely needed.'},
 {id:'gate',group:'around',page:4,anytime:true,title:'Card out before the gate',
  text:'Have the IC card in hand before you reach the ticket gate. Stopping at the gate to find it holds up everyone behind.',
  boys:'Get your card ready before the gate, not at it.'},
 {id:'forwarding',group:'around',page:18,anytime:true,match:['check out','hotel move'],title:'Send the big bags ahead',
  text:'Arrange luggage forwarding at the front desk the night before a hotel move. The cases arrive the next day; the journey is day bags only.'},
 {id:'address',group:'around',page:18,anytime:true,match:['taxi'],title:'The hotel, in Japanese',
  text:'Keep each hotel’s name and full address in Japanese as a screenshot, ready to show a taxi driver.'},
 {id:'big-bags',group:'around',page:18,anytime:true,match:['shinkansen','nozomi','hikari'],title:'Big bags on the Shinkansen',
  text:'With a large case, reserve the rear-row seats that come with the oversized-baggage space behind them.'},
 {id:'bikes',group:'around',page:4,anytime:true,title:'Bikes on the footpath',
  text:'Bikes share the footpath in much of Japan. Keep to one side, cross at the crossings and listen for bells.',
  boys:'Watch for bikes on the footpath, and cross only at the crossing.'},
 {id:'cash',group:'money',page:2,anytime:true,match:['market','stall','shrine','temple'],title:'Keep some yen on you',
  text:'Most places take contactless, but small shops, market stalls and shrine counters can be cash only.'},
 {id:'atm',group:'money',page:2,anytime:true,match:['7 eleven','konbini'],title:'7-Eleven for cash',
  text:'7-Eleven ATMs take most international cards and are open all hours. Keep a backup card somewhere separate.'},
 {id:'no-tipping',group:'money',anytime:true,match:['restaurant','taxi'],title:'No tipping',
  text:'Tipping is not part of life in Japan. Money left on the table usually gets run back to you.'},
 {id:'tax-free',group:'money',page:12,anytime:true,match:['shopping','department store','vintage'],title:'Passport for tax-free',
  text:'Carry the passport when shopping. Many stores take the tax off for visitors on the spot, and they need to see it.'},
 {id:'offline',group:'phone',page:2,anytime:true,title:'Ready for no signal',
  text:'Download offline Google Maps for each city, and screenshot tickets and hotel addresses.'},
 {id:'shinkansen-wifi',group:'phone',page:18,anytime:true,match:['shinkansen','nozomi'],title:'Download before the train',
  text:'Shinkansen Wi-Fi is unreliable. Download films and games before boarding.',
  boys:'Download your shows before the bullet train. The Wi-Fi on board is patchy.'},
 {id:'kuli-kuli',group:'phone',page:2,anytime:true,match:['restaurant','izakaya','menu'],title:'Read any menu',
  text:'Kuli Kuli translates a menu from a photo, shows what each dish looks like and flags allergens.'},
 {id:'go-taxi',group:'phone',page:2,anytime:true,match:['taxi'],title:'A taxi from the phone',
  text:'GO Taxi books a taxi to wherever you are, for when the trains are awkward or legs are done.'},
 {id:'charger',group:'phone',page:47,anytime:true,title:'Carry a battery',
  text:'Maps, tickets, park apps and photos all run off the phone. A charged portable battery saves the afternoon.'},
 {id:'meeting-point',group:'boys',page:4,anytime:true,match:['crossing','park','market','station'],title:'Pick a meeting point',
  text:'Agree one meeting point as you arrive anywhere busy, before anyone needs it.',
  boys:'If you lose us, go to the meeting point and stay there. We will come to you.'},
 {id:'hotel-name',group:'boys',page:4,anytime:true,title:'Hotel name and a number',
  text:'Make sure the older boys know the hotel’s name and a parent’s phone number, and take a photo of each boy each morning.',
  boys:'Know the name of our hotel, and Mum or Dad’s phone number.'},
 {id:'breaks',group:'boys',page:4,anytime:true,title:'Plan the breaks',
  text:'Build in snack and toilet breaks. Station toilets, convenience stores and department stores are clean and everywhere.',
  boys:'Need the toilet? Stations and shops have clean ones. Just ask.'},
 {id:'day-bag',group:'boys',page:4,anytime:true,title:'One bag for the day',
  text:'One light bag with wipes, tissues, water and chargers covers most days.'},
 {id:'lockers',group:'boys',page:4,anytime:true,match:['station'],title:'Coin lockers',
  text:'Big stations have coin lockers for bags you do not want to carry, and most take Suica.'},
 {id:'bins',group:'comfort',page:4,anytime:true,title:'Take your rubbish with you',
  text:'Public bins are rare. Carry a small bag for rubbish and empty it at the hotel or a convenience store.',
  boys:'Keep your rubbish with you until you find a bin.'},
 {id:'towel',group:'comfort',page:4,anytime:true,title:'A small hand towel',
  text:'Many public bathrooms have no paper towels or dryers. A small towel and tissues in the bag fixes both, and helps on a hot day.'},
 {id:'hydrate',group:'comfort',page:4,anytime:true,title:'Drink before you are thirsty',
  text:'September and October can be warm and humid. Drink often; there are vending machines on almost every corner.',
  boys:'Drink lots of water. It is hot, even when it does not feel it.'},
 {id:'cooling',group:'comfort',page:18,anytime:true,title:'For tired legs',
  text:'Lion Kyusoku Jikan cooling sheets from any pharmacy for tired feet and calves. Salonpas is the medicated choice for real aches.'},
 {id:'konbini-backup',group:'food',page:4,anytime:true,match:['dinner','lunch','breakfast'],title:'The family back-up',
  text:'Convenience stores and department-store food halls are good, fast and open late. Nobody goes hungry near one.'},
 {id:'eat-walking',group:'food',page:4,anytime:true,match:['market','street food','snacks','takoyaki'],title:'Stand still to snack',
  text:'Eating while walking is not really done. Finish by the stall, then hand the rubbish back.',
  boys:'Eat your snack standing by the shop, not walking along.'},
 {id:'reusable-bag',group:'shop',page:2,anytime:true,title:'Bring a bag',
  text:'Shops charge for plastic bags. A folding bag in the day bag covers the convenience-store runs.'},
 // ---- Mon 21 Sept: the flight (19).
 {id:'flight-bag',group:'comfort',page:19,match:['qf59'],title:'Landing bag',
  text:'Keep wipes, a light jumper, medications, a change of clothes and the Visit Japan Web QR codes in the carry-on, ready for landing.'},
 // ---- Tue 22 Sept: Meiji Jingu, Omotesando, Shibuya (20–23).
 {id:'holiday-lunch',group:'food',page:21,match:['maisen'],title:'A public holiday lunch',
  text:'22 September is a national holiday, so aim early for the walk-in lunch at Tonkatsu Maisen.'},
 {id:'omotesando-pace',group:'shop',page:21,match:['omotesando'],title:'Leave white space',
  text:'Omotesando is for architecture and window-shopping. Browse selectively rather than trying to see it all.'},
 {id:'sky-locker',group:'bookings',page:22,match:['shibuya sky'],title:'Before Shibuya Sky',
  text:'Buy Boston’s ticket at the counter, then put bags in a locker in Scramble Square (B1–B2): they are not allowed on the roof.'},
 {id:'ginza-line',group:'around',page:23,title:'One train home',
  text:'From Shibuya, any Ginza Line train goes the right way. Five stops to Tameike-sanno, then Exit 12b straight into 1 Hotel Tokyo.'},
 // ---- Wed 23 Sept: teamLab, Azabudai Hills, sumo (24–27).
 {id:'teamlab-early',group:'bookings',page:25,match:['teamlab'],title:'No way back in',
  text:'teamLab has no re-entry. Do EN TEA HOUSE before you leave, and allow time for photos.'},
 {id:'bakery-slot',group:'boys',page:24,match:['comme n kids','azabudai'],title:'The children’s bakery',
  text:'COMME’N KIDS gives out same-day slots first come, first served. Sign up as soon as you are there; parents wait outside.',
  boys:'At the kids’ bakery, you choose your own bread and pay for it yourself.'},
 {id:'sumo-food',group:'food',page:26,match:['sumo','kokugikan'],title:'Eat before the sumo',
  text:'No outside food or drink in the arena. Eat before, or buy inside.'},
 // ---- Thu 24 Sept: Shinkansen to Kyoto, Gion, Yasaka, Pontocho (28–31).
 {id:'taxi-yaesu',group:'around',page:28,match:['tokyo station'],title:'Say Yaesu',
  text:'In the taxi, ask for Tokyo Station, Yaesu side, Tokaido Shinkansen. Leave time to choose food and snacks before boarding.'},
 {id:'pontocho',group:'bookings',page:30,match:['pontocho'],title:'Pontocho is tiny',
  text:'Many Pontocho restaurants seat only a handful. Reserve dinner ahead.'},
 {id:'yasaka-dusk',group:'around',page:30,match:['yasaka'],title:'Yasaka at dusk',
  text:'The best window at Yasaka Shrine is about 5:45 to 6:30, as the lanterns come on.'},
 {id:'usj-breakfast',group:'food',page:29,title:'Breakfast tonight',
  text:'Tomorrow starts early at Universal. Pick up 7-Eleven breakfast and snacks tonight.'},
 // ---- Fri 25 Sept: Universal Studios Japan (32–35).
 {id:'board-destination',group:'around',page:32,title:'Himeji is fine',
  text:'For Osaka from Kyoto, the board may say Himeji or Kobe. Osaka is a stop on the way. Check the platform on the board on the day.'},
 {id:'express',group:'parks',page:33,match:['universal','usj','nintendo world'],title:'Express Pass times',
  text:'Have the Express Pass tickets ready and be at each ride a few minutes before its slot.'},
 {id:'child-switch',group:'parks',page:35,match:['universal','usj','forbidden journey'],title:'Child Switch',
  text:'If Nate would rather not ride, Child Switch lets one adult wait with him and the other ride, then swap without queuing again.'},
 {id:'usj-exit',group:'parks',page:35,match:['universal','usj'],title:'Beat the exit rush',
  text:'Start for Universal City Station before the park empties. The trains fill up fast at closing.'},
 // ---- Sat 26 Sept: Arashiyama and a quiet afternoon (36–37).
 {id:'bamboo-early',group:'around',page:36,match:['arashiyama','bamboo'],title:'The quiet window',
  text:'The bamboo grove is calmest around 8. Go slowly and take the photos then; the crowds arrive by mid-morning.'},
 {id:'karasuma-rock',group:'bookings',page:37,match:['karasuma rock'],title:'Book the yakiniku',
  text:'Karasuma Rock takes reservations and is worth booking ahead rather than queuing.'},
 // ---- Sun 27 Sept: Nara, then kimono and tea in Higashiyama (38–41).
 {id:'deer',group:'manners',page:38,match:['nara','deer','todai ji','todaiji'],title:'Feeding the deer',
  text:'One cracker at a time, choose calm deer, keep little ones beside an adult, and show empty hands when you are done.',
  boys:'One cracker at a time. Show the deer your empty hands when they are all gone.'},
 {id:'kimono',group:'comfort',page:41,match:['kimono'],title:'Kimono, then change',
  text:'Wear normal underwear underneath, keep bags light, and return the kimono straight after the photos for an easier afternoon.'},
 {id:'tea-ceremony',group:'bookings',page:40,match:['tea ceremony'],title:'Book the tea ceremony',
  text:'Tea ceremonies near Ninenzaka book out. Reserve online, or ask the Hotel Kanra concierge.'},
 // ---- Mon 28 Sept: Osaka (42–45).
 {id:'kyoto-osaka',group:'around',page:43,match:['osaka'],title:'No Shinkansen to Osaka',
  text:'Between Kyoto and Osaka, the JR Kyoto Line Special Rapid is quick and frequent, and Suica covers it.'},
 {id:'osaka-graze',group:'food',page:45,match:['dotonbori'],title:'Stroll and graze',
  text:'Do not over-schedule Osaka. Share one serve of takoyaki and keep room for the next thing.'},
 {id:'rikuro',group:'food',page:44,match:['rikuro'],title:'Cheesecake, warm',
  text:'Rikuro’s cheesecake is best eaten warm, as soon as it comes out.'},
 {id:'compare',group:'shop',page:12,match:['vintage','shinsaibashi','amerikamura'],title:'Compare before you buy',
  text:'For vintage, look at two or three stores first. Stock changes daily and prices vary; most open around 11.'},
 // ---- Tue 29 Sept: Kyoto to Disney (46–47).
 {id:'platform-early',group:'around',page:46,match:['nozomi','shinkansen'],title:'On the platform early',
  text:'Be on the Shinkansen platform 10 to 15 minutes before departure. It does not wait long at Kyoto.'},
 {id:'disney-app',group:'parks',page:47,match:['disney','disneysea','disneyland'],title:'The Disney app',
  text:'Link the tickets and the hotel booking in the Tokyo Disney Resort app, then use it for waits, show times and mobile food orders.'},
 // ---- Wed 30 Sept: Tokyo Disneyland (48–51).
 {id:'dpa-skip',group:'parks',page:49,match:['disneyland'],title:'Passes you already have',
  text:'Do not buy Premier Access for Beauty and the Beast, Baymax or Splash Mountain: the package already covers them.'},
 {id:'ears-early',group:'shop',page:50,match:['disneyland','world bazaar'],title:'Ears first',
  text:'Buy Minnie ears early in World Bazaar while the best styles are there, and mobile-order snacks early.'},
 {id:'app-captain',group:'parks',page:51,match:['disney','disneysea','disneyland','universal','usj'],title:'One app captain',
  text:'Make one adult the app captain for the day: they watch the waits and buy the passes, and everyone else enjoys the park.'},
 // ---- Thu 1 Oct: DisneySea, then to the Hilton (52–55).
 {id:'dpa',group:'parks',page:53,match:['disneysea'],title:'Premier Access order',
  text:'Buy Soaring as soon as you are through the gate, then Journey to the Center of the Earth once eligible. Set an alarm for the gap.'},
 {id:'park-bags',group:'around',page:55,title:'Park bags only',
  text:'The cases have gone ahead, so the trip back to the Hilton is backpacks only. No need to rush the last look at the harbour.'},
 // ---- Fri 2 Oct: Tsukiji and Akihabara (56–59).
 {id:'tsukiji-light',group:'food',page:57,match:['tsukiji'],title:'Light breakfast',
  text:'Keep breakfast light: the eating at Tsukiji is the meal. The market is best in the morning.'},
 {id:'akihabara-lead',group:'boys',page:58,match:['akihabara'],title:'Let the boys lead',
  text:'Keep Akihabara loose and let the boys set the pace. Head back before anyone is overtired.',
  boys:'In Akihabara, you choose where we go next.'},
 // ---- Sat 3 Oct: Harajuku and the Giants (60–65).
 {id:'harajuku-book',group:'bookings',page:61,match:['mipig','harry','kawaii monster'],title:'Book the animal cafés',
  text:'mipig and HARRY need booking ahead. Two Kawaii Monster Land family packs cover two adults and two children.'},
 {id:'dome-early',group:'parks',page:64,match:['tokyo dome','giants','baseball'],title:'Early to the Dome',
  text:'Arrive 45 to 60 minutes before first pitch for food, photos, the team store and a bathroom stop.'},
 {id:'dome-pay',group:'money',page:63,match:['tokyo dome','giants','baseball'],title:'Mostly cashless',
  text:'Most Dome vendors are cashless-friendly, but keep a Suica and a little cash handy.'},
 {id:'dome-cheer',group:'manners',page:65,match:['tokyo dome','giants','baseball'],title:'Join the clapping',
  text:'You do not need the words. Watch the fans nearby and clap along; keep the aisles clear during play and no flash.',
  boys:'Clap along with the fans around you, and stay in your seat while they play.'},
 // ---- Sun 4 Oct: Ginza and Tokyo Station (66–67).
 {id:'ginza-sunday',group:'around',page:66,match:['ginza','chuo dori'],title:'Ginza’s Sunday street',
  text:'Chuo-dori closes to cars from noon on weekends. Shop the side streets first, then walk the middle of the road.'},
 {id:'ginza-walk',group:'around',page:67,match:['tokyo station'],title:'Walk it',
  text:'Ginza to Tokyo Station is a 15 to 20 minute walk past good architecture, if legs allow. Otherwise it is one stop on the Marunouchi Line.'},
 // ---- Mon 5 Oct: Shibuya again (68–71).
 {id:'edw',group:'food',page:70,match:['edw yellow','omurice'],title:'Ask before you queue',
  text:'EDW yellow is walk-in only. Ask staff if the double cheese hamburger omurice is still available — “mada arimasu ka?” — before joining the queue.'},
 {id:'edw-timing',group:'food',page:70,match:['edw yellow'],title:'Between lunch and dinner',
  text:'Arriving around 3:30, between lunch and dinner, is the best chance of a short wait.'},
 // ---- Tue 6 Oct: home (72).
 {id:'last-day',group:'money',page:72,title:'The last day',
  text:'Keep tax-free purchases sealed with the receipts to hand, and keep a little yen for the airport.'},
];
const plain=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
// A tip as a card: the group over a headline and the line, in the boys' words for a young reader.
const card=(t,young)=>({id:t.id,group:TIP_GROUPS[t.group].label,icon:TIP_GROUPS[t.group].icon,title:t.title,text:young?t.boys:t.text});
// The manners, one card each, headed by where they apply. The escalator goes in as both cities.
const ESCALATOR={id:'escalator',label:'On the escalator',icon:'↕️',
 grown:['Tokyo stands on the left and walks on the right; Osaka the other way round. Kyoto mostly stands left, but follow whoever is in front.'],
 boys:['Stand on one side of the escalator, the same side as everyone in front, and hold the rail.']};
const manners=(rule,young)=>(young?rule.boys:rule.grown).map((text,i)=>({id:`${rule.id}-${i}`,group:TIP_GROUPS.manners.label,icon:rule.icon,title:rule.label,text}));
const usable=(list,young)=>list.filter(t=>!young||t.boys);
// Every tip that fits any day, practical and manners taking turns, so the deck is never ten money
// tips in a row and then ten shrine ones.
export function allTips(young=false){
 const practical=usable(TIPS.filter(t=>t.anytime),young).map(t=>card(t,young));
 const polite=[...ETIQUETTE,ESCALATOR].flatMap(r=>manners(r,young));
 const out=[];
 for(let i=0;i<Math.max(practical.length,polite.length);i++){if(practical[i])out.push(practical[i]);if(polite[i])out.push(polite[i]);}
 return out;
}
export const findTip=id=>TIPS.find(t=>t.id===id)||null;
// The tips for a day: its own pages' tips, then what its stops call for (the tips whose words
// they say and the manners for the kind of place), then everything else.
export function tipsForDay(days=[],date='',steps=[],young=false){
 const day=days.find(d=>d.date===date),pages=new Set(day?.pages||[]);
 const said=` ${plain(steps.map(s=>`${s.title||''} ${s.place||''}`).join(' '))} `;
 const own=usable(TIPS.filter(t=>pages.has(t.page)&&!t.anytime||(t.match||[]).some(w=>said.includes(` ${plain(w)} `))),young).map(t=>card(t,young));
 const polite=[...new Map(steps.flatMap(s=>etiquetteFor(s,day?.city||'')).map(r=>[r.id,r])).values()].flatMap(r=>manners(r,young));
 const first=[...own,...polite],ids=new Set(first.map(t=>t.id));
 return [...first,...allTips(young).filter(t=>!ids.has(t.id))];
}
