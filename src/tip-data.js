// Tips: the practical side of the guide, one line each — getting around, money, phones, the boys,
// food, the parks, keeping comfortable — and the manners from etiquette-data.js alongside them.
// Facts are something worth knowing; a tip is something worth doing, and most of these are the
// guide's own "top tips", "local tips" and "good to know" boxes, tied to the page they came from
// so a day's own tips come round on that day, the way its facts do.
//
// `anytime` marks the tips from the guide's opening pages, which fit any day. `match` is the
// same as a fact's: the words a stop has to say for the tip to belong to it. `boys` is the
// line for a young reader; a tip without one is for the grown-ups and is left out for him.
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
 day:{label:'Today',icon:'💡'},
};
export const TIPS=[
 // The guide's opening pages: before you go (2), family travel and etiquette (4), smart notes (18).
 {id:'suica',group:'around',page:18,anytime:true,match:['station','train','metro','subway','bus'],
  text:'Keep a Suica in Apple Wallet topped up with at least ¥3,000. Tap on and off for trains, metros and buses in Tokyo, Kyoto and Osaka.',
  boys:'Tap the card on the gate going in and again coming out.'},
 {id:'suica-pay',group:'around',page:18,anytime:true,match:['konbini','convenience store','7 eleven','lawson','familymart'],
  text:'The same Suica pays at convenience stores, most vending machines and coin lockers, so small change is rarely needed.'},
 {id:'gate',group:'around',page:4,anytime:true,
  text:'Have the IC card out before you reach the ticket gate. Stopping at the gate to find it holds up everyone behind.'},
 {id:'kyoto-osaka',group:'around',page:43,match:['osaka','kyoto station'],
  text:'Between Kyoto and Osaka, skip the Shinkansen: the JR Kyoto Line Special Rapid is quick and frequent, and Suica covers it.'},
 {id:'board-destination',group:'around',page:32,match:['kyoto station'],
  text:'For Osaka from Kyoto, the board may say Himeji or Kobe. That is fine: Osaka is a stop on the way. Check the platform on the board on the day.'},
 {id:'big-bags',group:'around',page:18,anytime:true,match:['shinkansen','nozomi','hikari'],
  text:'With big bags on the Shinkansen, reserve the rear-row seats that come with the oversized-baggage space.'},
 {id:'forwarding',group:'around',page:18,anytime:true,match:['check out','check-out','hotel move'],
  text:'Send the big bags ahead the night before a hotel move. They arrive the next day, and the journey is with day bags only.'},
 {id:'address',group:'around',page:18,anytime:true,match:['taxi'],
  text:'Keep each hotel’s name and full address in Japanese as a screenshot, ready to show a taxi driver.'},
 {id:'bikes',group:'around',page:4,anytime:true,
  text:'Bikes share the footpath in much of Japan. Keep to one side, cross at the crossings and watch for bells.',
  boys:'Watch for bikes on the footpath, and cross only at the crossing.'},
 {id:'cash',group:'money',page:2,anytime:true,match:['market','stall','shrine','temple'],
  text:'Most places take contactless, but small shops, market stalls and shrine counters can be cash only. Keep some yen on you.'},
 {id:'atm',group:'money',page:2,anytime:true,match:['7 eleven','konbini'],
  text:'7-Eleven ATMs take most international cards and are open all hours. Carry a backup card in a separate place.'},
 {id:'no-tipping',group:'money',anytime:true,match:['restaurant','taxi','hotel'],
  text:'There is no tipping in Japan. Leaving money on the table usually gets it run back to you.'},
 {id:'tax-free',group:'money',page:12,anytime:true,match:['shopping','department store','vintage'],
  text:'Carry the passport when shopping: many stores take tax off for visitors on the spot, and they need to see it.'},
 {id:'offline',group:'phone',page:2,anytime:true,
  text:'Download offline Google Maps for each city and screenshot tickets and hotel addresses, for the moments with no signal.'},
 {id:'shinkansen-wifi',group:'phone',page:18,anytime:true,match:['shinkansen','nozomi','flight'],
  text:'Shinkansen Wi-Fi is unreliable. Download films and games before boarding.',
  boys:'Download your shows before the bullet train: the Wi-Fi on board is patchy.'},
 {id:'kuli-kuli',group:'phone',page:2,anytime:true,match:['restaurant','izakaya','menu'],
  text:'Kuli Kuli translates a menu from a photo, shows the dishes and flags allergens.'},
 {id:'go-taxi',group:'phone',page:2,anytime:true,match:['taxi'],
  text:'GO Taxi books a taxi from the phone when the trains are awkward or legs are tired.'},
 {id:'charger',group:'phone',page:47,anytime:true,
  text:'Carry a charged portable battery. Maps, tickets, park apps and photos all run off the phone.'},
 {id:'meeting-point',group:'boys',page:4,anytime:true,match:['crossing','park','market','station'],
  text:'Agree one meeting point as you arrive anywhere busy, before anyone needs it.',
  boys:'If you lose us, go to the meeting point and wait. We will come to you.'},
 {id:'hotel-name',group:'boys',page:4,anytime:true,
  text:'Make sure the older boys know the hotel’s name and a parent’s phone number, and keep a photo of each boy on your phone that day.',
  boys:'Know the name of our hotel and Mum or Dad’s phone number.'},
 {id:'breaks',group:'boys',page:4,anytime:true,
  text:'Build in snack and toilet breaks. Station toilets, convenience stores and department stores are clean and everywhere.',
  boys:'Need the toilet? Stations and shops have clean ones. Just ask.'},
 {id:'day-bag',group:'boys',page:4,anytime:true,
  text:'One light bag with wipes, tissues, water and chargers covers most of a day.'},
 {id:'lockers',group:'boys',page:4,anytime:true,match:['station'],
  text:'Coin lockers at stations take bags you do not want to carry; most take Suica.'},
 {id:'bins',group:'comfort',page:4,anytime:true,
  text:'Public bins are rare. Carry a small bag for rubbish and empty it at the hotel or a convenience store.',
  boys:'Keep your rubbish with you until you find a bin.'},
 {id:'towel',group:'comfort',page:4,anytime:true,
  text:'Carry a small hand towel and tissues. Plenty of public bathrooms have no paper towels, and it helps on a hot day.'},
 {id:'hydrate',group:'comfort',page:4,anytime:true,
  text:'September can be hot and humid. Drink often; vending machines are on almost every corner.',
  boys:'Drink lots of water. It is hot, even when it does not feel it.'},
 {id:'cooling',group:'comfort',page:18,anytime:true,
  text:'For tired feet and calves, Lion Kyusoku Jikan cooling sheets from any pharmacy. Salonpas is the medicated choice for real aches.'},
 {id:'konbini-backup',group:'food',page:4,anytime:true,match:['dinner','lunch','breakfast'],
  text:'Convenience stores and department-store food halls are the family back-up: good food, fast, at any hour.'},
 {id:'eat-walking',group:'food',page:4,anytime:true,match:['market','street food','snacks','takoyaki'],
  text:'Eating while walking is not really done. Stand by the stall to finish, then take the rubbish back to it.',
  boys:'Eat your snack standing by the shop, not walking.'},
 {id:'reusable-bag',group:'shop',page:2,anytime:true,
  text:'Bring a reusable bag: shops charge for plastic ones.'},
 {id:'compare',group:'shop',page:12,match:['vintage','shinsaibashi','omotesando'],
  text:'For vintage, compare two or three stores before buying. Stock changes daily and prices vary.'},
 // The days' own pages.
 {id:'sumo-food',group:'day',page:26,match:['sumo','kokugikan'],
  text:'No outside food or drink in the sumo arena. Eat before, or buy inside.'},
 {id:'usj-breakfast',group:'day',page:29,
  text:'An early start tomorrow: pick up 7-Eleven breakfast and snacks tonight.'},
 {id:'deer',group:'day',page:38,match:['nara','deer','todai ji','todaiji'],
  text:'Feed the deer one cracker at a time, choose calm ones, keep little ones beside an adult, and show empty hands when you are done.',
  boys:'One cracker at a time. Show the deer your empty hands when they are all gone.'},
 {id:'osaka-graze',group:'day',page:45,match:['dotonbori'],
  text:'Do not over-schedule Osaka. It is a stroll-and-graze city.'},
 {id:'disney-app',group:'parks',page:47,match:['disney','disneysea','disneyland'],
  text:'Use the Tokyo Disney Resort app for wait times, show times and mobile food orders. Link the tickets and the hotel booking to it.'},
 {id:'app-captain',group:'parks',page:51,match:['disney','disneysea','disneyland','universal','usj'],
  text:'Make one adult the app captain for the day: they watch the waits and buy the passes; everyone else enjoys the park.'},
 {id:'dpa',group:'parks',page:54,match:['disney','disneysea','disneyland'],
  text:'Buy the first Premier Access as soon as you are through the gate, then set an alarm for when the next can be bought.'},
 {id:'last-day',group:'day',page:72,
  text:'Keep the tax-free shopping sealed, with the receipts to hand, and keep a little yen for the airport.'},
];
const plain=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
// A tip as a card: its group's label and icon over the line, the boys' line for a young reader.
const card=(t,young)=>({id:t.id,label:TIP_GROUPS[t.group].label,icon:TIP_GROUPS[t.group].icon,text:young?t.boys:t.text});
// The manners, one line each, under where they apply. The escalator goes in as both cities.
const ESCALATOR={id:'escalator',label:'On the escalator',icon:'↕️',
 grown:['Tokyo stands on the left and walks on the right; Osaka the other way round. Kyoto mostly stands left, but follow whoever is in front.'],
 boys:['Stand on one side of the escalator, the same side as everyone in front, and hold the rail.']};
const manners=(rule,young)=>(young?rule.boys:rule.grown).map((text,i)=>({id:`${rule.id}-${i}`,label:rule.label,icon:rule.icon,text}));
const usable=(list,young)=>list.filter(t=>!young||t.boys);
// Every tip, practical first and manners after, taking turns so the deck is not ten money tips
// and then ten shrine ones.
export function allTips(young=false){
 const practical=usable(TIPS.filter(t=>t.anytime),young).map(t=>card(t,young));
 const polite=[...ETIQUETTE,ESCALATOR].flatMap(r=>manners(r,young));
 const out=[];
 for(let i=0;i<Math.max(practical.length,polite.length);i++){if(practical[i])out.push(practical[i]);if(polite[i])out.push(polite[i]);}
 return out;
}
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
