import {BOYS,personProfile,packing} from './trip-features.js';
import {forecastFor,describe} from './weather-data.js';
import {japanDate} from './timing.js';
// The packing list. What we actually pack is ours to write, tick and change; what it suggests is
// worked out on the phone from what the trip already knows — where each day is, the forecast
// we last saved (or, before there is one, what that city is usually like that month), what is
// on the days still ahead, and who is coming. Nothing here goes anywhere or asks anybody: a
// suggestion is only a line with its reasons beside it until somebody adds it to the list.
export const PACK_CATEGORIES=[
 ['documents','Documents & money'],['clothes','Clothes & shoes'],['weather','For the weather'],
 ['health','Toiletries & health'],['tech','Phones & tech'],['daybag','Day bag'],
 ['activities','For what we are doing'],['kids','For the boys'],['travel','Flights, trains & moving hotels'],
 ['other','Everything else']
];
export const packCategoryLabel=id=>(PACK_CATEGORIES.find(([key])=>key===id)||PACK_CATEGORIES.at(-1))[1];
// Where a suggestion came from, so each one can say why it is there rather than asking to be
// taken on trust.
export const PACK_SOURCES={japan:'Japan',weather:'Weather',activity:'What we are doing',person:'Who is coming',trip:'The trip'};
export const PACK_PRIORITY=[['essential','Essential'],['recommended','Recommended'],['nice','Nice to have']];
// What each city is usually like, month by month, as a high and a low — the long-run averages,
// rounded. Used only where no forecast has been saved for that day, and it says so.
const NORMALS={
 Tokyo:[[10,1],[11,2],[14,5],[19,10],[23,15],[26,19],[30,23],[31,24],[27,21],[22,15],[17,9],[12,4]],
 Kyoto:[[9,1],[10,1],[14,4],[20,9],[25,14],[28,19],[32,23],[34,24],[29,20],[23,14],[17,8],[12,3]],
 Osaka:[[10,3],[10,3],[14,6],[20,11],[25,16],[28,20],[32,24],[34,25],[29,22],[24,16],[18,10],[12,5]]
};
const normalsFor=city=>/kyoto|nara/i.test(city||'')?'Kyoto':/osaka/i.test(city||'')?'Osaka':'Tokyo';
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const shortDay=date=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(date+'T12:00:00+09:00'));
const listDays=dates=>{const d=[...new Set(dates)].sort();return d.length>3?`${d.slice(0,3).map(shortDay).join(', ')} and ${d.length-3} more`:d.map(shortDay).join(', ');};
// The days a suggestion is worth thinking about: the ones still ahead once the trip is under way,
// all of them before it starts. Packing for a day we have already had is not packing.
// Once the trip is over there is nothing ahead, and the whole trip is the fairer answer.
export function daysAhead(state,today=japanDate()){
 const ahead=state.days.filter(d=>d.date>=today);
 return ahead.length?ahead:state.days;
}
// What the weather will be across those days, from the forecast where one is saved and the
// city's usual month where not, with which of the two each number came from.
export function packingWeather(state,days){
 const each=days.map(d=>{
  const f=forecastFor(state,d.date);
  if(f&&Number.isFinite(f.max)&&Number.isFinite(f.min)){
   const wet=/rain|shower|drizzle|thunder/i.test(describe(f.code)[0])||(f.rain??0)>=50;
   return {date:d.date,city:d.city,max:f.max,min:f.min,rain:f.rain??null,wet,forecast:true};
  }
  const month=Number(d.date.slice(5,7))-1,[max,min]=NORMALS[normalsFor(d.city)][month];
  return {date:d.date,city:d.city,max,min,rain:null,wet:false,forecast:false};
 });
 const forecast=each.filter(e=>e.forecast).length;
 return {each,forecast,usual:each.length-forecast,
  max:each.length?Math.max(...each.map(e=>e.max)):null,min:each.length?Math.min(...each.map(e=>e.min)):null,
  hot:each.filter(e=>e.max>=27),cool:each.filter(e=>e.min<=16),cold:each.filter(e=>e.min<=9),wet:each.filter(e=>e.wet),
  months:[...new Set(days.map(d=>Number(d.date.slice(5,7))-1))]};
}
// What we are doing, read off the stops on the days still ahead. Each rule looks at a stop's
// title and place and names the days it matched, so the reason is the stop itself.
const ACTIVITY_RULES=[
 {test:/disney|universal|usj|minion|hogsmeade/i,items:[
  {id:'ponchos',title:'Rain ponchos',category:'activities',priority:'recommended',qty:'members',why:'Theme parks',
   note:'The parks carry on in the rain and sell ponchos at park prices. They also do for the splash rides.'},
  {id:'lanyard',title:'Lanyard or zip pocket for park tickets and phones',category:'activities',priority:'nice',why:'Theme parks',
   note:'The tickets and priority passes live on a phone all day; a free hand at every gate helps.'},
  {id:'parkbag',title:'Small clear zip bags for phones on water rides',category:'activities',priority:'nice',why:'Theme parks'}]},
 {test:/splash|jurassic|river|cruise|kali/i,items:[
  {id:'spareclothes-rides',title:'Spare T-shirt each in the day bag',category:'daybag',priority:'nice',why:'Rides and boats that get you wet'}]},
 {test:/halloween/i,items:[
  {id:'costume',title:'Halloween costumes for the boys',category:'kids',priority:'nice',why:'Halloween at the park',
   note:'Tokyo Disney lets guests dress up over its Halloween season. Check the current costume rules before packing masks or props.'}]},
 {test:/temple|shrine|jingu|-ji\b|todai|inari|kiyomizu|yasaka|senso/i,items:[
  {id:'coins-offering',title:'¥5 and ¥10 coins for offerings',category:'documents',priority:'nice',why:'Temples and shrines'},
  {id:'goshuin',title:'Goshuin stamp book',category:'activities',priority:'nice',why:'Temples and shrines',
   note:'Temples and shrines write and stamp a page for a few hundred yen. Most sell the book too.'}]},
 {test:/kimono|tea ceremony|ryokan|tatami|temple|shrine/i,items:[
  {id:'slipons',title:'Shoes that slip on and off easily',category:'clothes',priority:'recommended',why:'Shoes off indoors',
   note:'Temples, tea rooms, fitting rooms and some restaurants — laces get old fast.'},
  {id:'socks',title:'Clean socks without holes',category:'clothes',priority:'recommended',why:'Shoes off indoors'}]},
 {test:/kimono/i,items:[
  {id:'kimono-under',title:'Thin singlet and leggings to wear under a kimono',category:'clothes',priority:'nice',why:'Kimono fitting'}]},
 {test:/forest|bamboo|inari|hike|trail|walk|stroll|nara park/i,items:[
  {id:'walkingshoes',title:'Comfortable walking shoes, already broken in',category:'clothes',priority:'essential',qty:'members',why:'Long walking days',
   note:'Fifteen to twenty thousand steps is an ordinary day in Japan.'},
  {id:'blister',title:'Blister plasters',category:'health',priority:'recommended',why:'Long walking days'}]},
 {test:/deer|nara park/i,items:[
  {id:'wipes-deer',title:'Wet wipes and hand sanitiser',category:'daybag',priority:'recommended',why:'Feeding the deer',
   note:'Keep maps and paper bags zipped away — the deer eat paper.'}]},
 {test:/teamlab/i,items:[
  {id:'teamlab',title:'Clothes that are not skirts or dresses for teamLab',category:'clothes',priority:'nice',why:'teamLab',
   note:'Some rooms have mirrored floors, and teamLab Planets has knee-deep water.'}]},
 {test:/sumo|kokugikan|giants|baseball|tokyo dome/i,items:[
  {id:'binoculars',title:'Small binoculars',category:'activities',priority:'nice',why:'Sumo and the baseball',
   note:'Upper seats are a long way from the ring and the field.'}]},
 {test:/giants|baseball|tokyo dome/i,items:[
  {id:'cap',title:'Caps for the ball game',category:'activities',priority:'nice',why:'The baseball'}]},
 {test:/cooking|class|workshop|comme.n kids/i,items:[
  {id:'hairties',title:'Hair ties and clothes that can get floury',category:'clothes',priority:'nice',why:'Hands-on classes'}]},
 {test:/onsen|sento|bathhouse/i,items:[
  {id:'onsen',title:'Small towel for the bath',category:'health',priority:'nice',why:'Onsen',
   note:'Many onsen do not allow visible tattoos; cover patches help where they are accepted.'}]},
 {test:/shinkansen|nozomi|hikari|kodama/i,items:[
  {id:'bigbags',title:'Check our big bags against the Shinkansen size rule',category:'travel',priority:'essential',why:'Shinkansen',
   note:'A bag over 160 cm (length + width + height) needs a seat booked with oversized-baggage space on the Tokaido line, or send it ahead by takkyubin.'},
  {id:'trainsnacks',title:'Something to do on the train for the boys',category:'kids',priority:'nice',why:'Shinkansen'}]},
 {test:/overnight bag|luggage forwarding|takkyubin|forward/i,items:[
  {id:'overnight',title:'Overnight bag while the big cases are forwarded',category:'travel',priority:'essential',why:'Luggage forwarding',
   note:'Two nights of clothes, pyjamas, toothbrushes, chargers and medicines, because the cases go ahead without us.'}]},
 {test:/airport|qantas|flight to|homeward/i,items:[
  {id:'flight-kit',title:'Headphones, neck pillow and a change of clothes in the carry-on',category:'travel',priority:'recommended',why:'Flights'},
  {id:'downloads',title:'Shows and games downloaded for the boys before the flight',category:'kids',priority:'recommended',why:'Flights'},
  {id:'powerbank-cabin',title:'Power banks in the carry-on, not the checked bags',category:'tech',priority:'essential',why:'Flights',
   note:'Airlines do not allow spare lithium batteries in checked luggage.'},
  {id:'biosecurity',title:'Know what to declare coming home to Australia',category:'documents',priority:'essential',why:'Flying home',
   note:'Australian biosecurity: declare all food, wooden souvenirs, plant material and anything with seeds on the Incoming Passenger Card.'}]}
];
// Japan, whatever the plan: what catches visitors out.
const JAPAN=[
 {id:'passports',title:'Passports',category:'documents',priority:'essential',qty:'members',note:'Needed at every hotel check-in, and on you for tax-free shopping.'},
 {id:'insurance',title:'Travel insurance details',category:'documents',priority:'essential'},
 {id:'ic-card',title:'Suica or PASMO card, or one in the phone wallet',category:'documents',priority:'essential',note:'Trains, buses, lockers, vending machines and convenience stores.'},
 {id:'cash',title:'Yen in cash and a coin purse',category:'documents',priority:'essential',note:'Small shops, shrines, food stalls and lockers are often cash only, and the coins pile up.'},
 {id:'adaptor',title:'Travel adaptors for Japanese plugs',category:'tech',priority:'essential',qty:2,note:'Japan uses flat two-pin (Type A) sockets at 100 V; Australian plugs will not fit.'},
 {id:'powerbank',title:'Power banks and charging cables',category:'tech',priority:'essential',note:'Maps, tickets and translation all live on the phones.'},
 {id:'data',title:'eSIM or pocket Wi-Fi',category:'tech',priority:'recommended'},
 {id:'handtowel',title:'Small hand towel or handkerchief each',category:'daybag',priority:'recommended',qty:'members',note:'Plenty of public toilets have no paper towels or dryers.'},
 {id:'rubbish',title:'A small bag for our own rubbish',category:'daybag',priority:'recommended',note:'Public bins are rare; everyone carries theirs home.'},
 {id:'tissues',title:'Pocket tissues',category:'daybag',priority:'nice'},
 {id:'medicines',title:'Prescription medicines, in their boxes, with a doctor’s letter',category:'health',priority:'essential',
  note:'Japan restricts some ordinary Australian medicines — pseudoephedrine and some codeine products especially. Check anything unusual before we go.'},
 {id:'firstaid',title:'Basic first-aid kit: plasters, pain relief, antihistamine',category:'health',priority:'recommended'},
 {id:'laundry',title:'Laundry sheets and a mesh wash bag',category:'clothes',priority:'recommended',note:'Most hotels have coin laundries; pack for a week, not the whole trip.'},
 {id:'spare-bag',title:'Foldable spare bag for bringing souvenirs home',category:'travel',priority:'recommended'}
];
const qtyFor=(qty,state)=>qty==='members'?(state.members||[]).length||1:(qty||1);
// Everything the list would suggest for us right now, before taking away what is already on it
// or what somebody has said we do not need.
export function allSuggestions(state,today=japanDate()){
 const days=daysAhead(state,today),dates=new Set(days.map(d=>d.date)),out=[];
 const add=(s,source,why)=>out.push({person:'Family',priority:'recommended',note:'',...s,qty:qtyFor(s.qty,state),source,why});
 for(const s of JAPAN)add(s,'japan','Japan');
 // How long we are away decides how many clothes, and laundry decides the rest.
 const nights=Math.max(1,days.length);
 add({id:'outfits',title:`${Math.min(nights,7)} days of clothes each`,category:'clothes',priority:'essential',
  note:nights>7?`${nights} days still to go, with a wash in the middle.`:`${nights} day${nights===1?'':'s'} still to go.`},'trip',`${nights} days`);
 add({id:'pyjamas',title:'Pyjamas',category:'clothes',priority:'essential',qty:'members'},'trip',`${nights} days`);
 const hotels=[];for(const d of days)if(d.hotel&&hotels.at(-1)!==d.hotel)hotels.push(d.hotel);
 if(hotels.length>2)add({id:'cubes',title:'Packing cubes, one per person',category:'travel',priority:'recommended',qty:'members',
  note:`${hotels.length} hotels: ${hotels.join(' → ')}.`},'trip',`${hotels.length-1} hotel moves`);
 // The weather, from the forecast where we have one and the usual month where not.
 const w=packingWeather(state,days);
 // Said as what it is: a forecast we saved, or only what the month is usually like.
 const source=list=>list.every(e=>e.forecast)?'Forecast':list.some(e=>e.forecast)?'Forecast and usual weather':'Usually';
 if(w.hot.length){
  const why=`${source(w.hot)} up to ${Math.max(...w.hot.map(e=>e.max))}° · ${listDays(w.hot.map(e=>e.date))}`;
  add({id:'sunscreen',title:'Sunscreen',category:'weather',priority:'essential'},'weather',why);
  add({id:'hats',title:'Sun hats',category:'weather',priority:'recommended',qty:'members'},'weather',why);
  add({id:'bottles',title:'Refillable water bottles',category:'daybag',priority:'recommended',qty:'members'},'weather',why);
  add({id:'lightclothes',title:'Light, breathable clothes',category:'clothes',priority:'recommended'},'weather',why);
  if(Math.max(...w.hot.map(e=>e.max))>=30)add({id:'cooling',title:'Cooling towels or a small fan',category:'weather',priority:'nice',
   note:'Japanese heat is humid; the convenience stores sell both too.'},'weather',why);
 }
 if(w.cool.length){
  const why=`${source(w.cool)} down to ${Math.min(...w.cool.map(e=>e.min))}° · ${listDays(w.cool.map(e=>e.date))}`;
  add({id:'layers',title:'A light jumper or fleece each',category:'weather',priority:'recommended',qty:'members',
   note:'For first thing, after dark, and air-conditioned trains.'},'weather',why);
 }
 if(w.cold.length)add({id:'coats',title:'Warm coats, and a beanie and gloves for the boys',category:'weather',priority:'essential',qty:'members'},
  'weather',`${source(w.cold)} down to ${Math.min(...w.cold.map(e=>e.min))}°`);
 // An umbrella is always worth it here; the reason is what changes.
 const typhoon=w.months.some(m=>m>=7&&m<=9),rainy=w.months.includes(5);
 const wetWhy=w.wet.length?`Rain forecast · ${listDays(w.wet.map(e=>e.date))}`
  :typhoon?`${MONTHS[w.months.find(m=>m>=7&&m<=9)]} is typhoon season`:rainy?'June is the rainy season':'Showers are common all year';
 add({id:'umbrella',title:'Compact umbrellas',category:'weather',priority:w.wet.length||typhoon||rainy?'essential':'recommended',qty:2,
  note:'Every convenience store sells a clear one for a few hundred yen if we are caught out.'},'weather',wetWhy);
 if(w.wet.length>=2)add({id:'rainjackets',title:'Light rain jackets',category:'weather',priority:'recommended',qty:'members'},'weather',wetWhy);
 if(w.wet.length)add({id:'dry-socks',title:'Spare dry socks in the day bag',category:'daybag',priority:'nice'},'weather',wetWhy);
 // What we are doing on the days still ahead.
 const steps=state.steps.filter(s=>s.day&&dates.has(s.day)&&s.status!=='skipped');
 for(const rule of ACTIVITY_RULES){
  const hits=steps.filter(s=>rule.test.test(`${s.title} ${s.place||''}`));
  if(!hits.length)continue;
  for(const s of rule.items)add(s,'activity',`${s.why} · ${listDays(hits.map(h=>h.day))}`);
 }
 // Who is coming. Ages come from the travel party; the boys are the boys even before theirs is filled in.
 for(const name of state.members||[]){
  const me=personProfile(state,name),child=BOYS.includes(name)||(me.age!==null&&me.age<13);
  const age=me.age!==null?`${name}, ${me.age}`:name;
  if(child){
   add({id:`backpack-${name}`,title:'Their own small backpack',person:name,category:'kids',priority:'recommended',
    note:'Water, a snack and their own treasures, carried by them.'},'person',age);
   add({id:`meetingcard-${name}`,title:'The meeting card, printed, in a pocket',person:name,category:'kids',priority:'essential',
    note:'Our hotel and both phone numbers in Japanese, for a staff member if we are separated.'},'person',age);
   add({id:`stampbook-${name}`,title:'A notebook for station stamps',person:name,category:'kids',priority:'nice',
    note:'Most stations have a free rubber stamp to collect.'},'person',age);
  }
  if(child&&(me.age===null?name==='Nate':me.age<=6)){
   add({id:`spareset-${name}`,title:'A full spare set of clothes in the day bag',person:name,category:'daybag',priority:'recommended'},'person',age);
   add({id:`comfort-${name}`,title:'Favourite toy for bedtime',person:name,category:'kids',priority:'recommended'},'person',age);
   add({id:`stroller-${name}`,title:'A light folding stroller',person:name,category:'kids',priority:'nice',
    note:'For the long walking days and the late nights at the parks. The parks also hire them.'},'person',age);
  }
  if(me.dietary)add({id:`foodcard-${name}`,title:'A food card in Japanese',person:name,category:'health',priority:'essential',
   note:`To show at restaurants: ${me.dietary}`},'person',`${name} · ${me.dietary}`);
  if(me.interests.includes('photo'))add({id:`camera-${name}`,title:'Camera, spare battery and memory card',person:name,category:'tech',priority:'recommended'},'person',`${name} likes photo spots`);
  if(me.interests.includes('shopping')||me.interests.includes('anime'))add({id:`shopspace-${name}`,title:'Room in the case for souvenirs',person:name,category:'travel',priority:'nice'},'person',`${name} likes shopping`);
  if(me.interests.includes('onsen'))add({id:`onsen-${name}`,title:'Small towel for the bath',person:name,category:'health',priority:'nice'},'person',`${name} likes onsen`);
 }
 // The same thing suggested twice for two reasons is one suggestion with both reasons.
 const merged=new Map();
 for(const s of out){
  const had=merged.get(s.id);
  if(!had){merged.set(s.id,{...s,why:[s.why],sources:[s.source]});continue;}
  if(!had.why.includes(s.why))had.why.push(s.why);
  if(!had.sources.includes(s.source))had.sources.push(s.source);
  const rank=p=>PACK_PRIORITY.findIndex(([id])=>id===p);
  if(rank(s.priority)<rank(had.priority))had.priority=s.priority;
  if(!had.note&&s.note)had.note=s.note;
 }
 return [...merged.values()];
}
const same=(a,b)=>a.trim().toLowerCase()===b.trim().toLowerCase();
// What is still worth suggesting: not already on the list (added from here, or written in by
// hand under the same name for the same person) and not turned down.
export function packingSuggestions(state,today=japanDate()){
 const {items,dismissed}=packing(state);
 const rank=p=>PACK_PRIORITY.findIndex(([id])=>id===p);
 return allSuggestions(state,today)
  .filter(s=>!dismissed[s.id]&&!items.some(i=>i.suggestionId===s.id||(same(i.title,s.title)&&i.person===s.person)))
  .sort((a,b)=>rank(a.priority)-rank(b.priority));
}
export const dismissedSuggestions=(state,today=japanDate())=>{
 const {dismissed}=packing(state);
 return allSuggestions(state,today).filter(s=>dismissed[s.id]);
};
// The next time the cases have to be closed: the first day still ahead whose hotel is not the
// one before it. Leaving for home is the last one.
export function nextPackUp(state,today=japanDate()){
 const days=state.days;
 for(let i=1;i<days.length;i++)
  if(days[i].date>=today&&days[i].hotel!==days[i-1].hotel)return {date:days[i].date,from:days[i-1].hotel,to:days[i].hotel};
 const last=days.at(-1);
 return last&&last.date>=today?{date:last.date,from:last.hotel,to:'Home',home:true}:null;
}
export function packingProgress(state){
 const {items}=packing(state),packed=items.filter(i=>i.packedAt).length;
 return {packed,total:items.length,left:items.length-packed};
}
