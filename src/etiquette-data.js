// How to do it here. Japan has a right way to do most ordinary things — at a shrine, on a
// train, at a counter, on an escalator — and the polite version is easy once somebody says it.
// Each kind of stop has a few lines for the grown-ups and a shorter, plainer set for the boys,
// and one small mission a boy can take on there, so the manners become something to do rather
// than something to be told off about.
//
// Matched from the stop itself (its title, place and sort), and, for the escalator, from the
// city: Osaka stands on the right, Tokyo and most of the country on the left.
import {entryType} from './entry-types.js';
const text=s=>`${s?.title||''} ${s?.place||''}`;
export const ETIQUETTE=[
 {id:'shrine',label:'At a shrine',icon:'⛩️',test:s=>/\b(shrine|jingu|jinja|taisha|inari|torii)\b/i.test(text(s)),
  grown:['Bow once at the torii gate on the way in, and walk to the side of the path: the middle is for the gods.',
   'At the water basin: rinse the left hand, then the right, pour a little into the cupped left hand to rinse your mouth, then let the rest run down the handle. Do not drink from the ladle.',
   'At the hall: coin in the box, two bows, two claps, a moment, one bow.'],
  boys:['Bow at the big gate.','Walk at the side — the middle is for the gods.','Two bows, two claps, one bow.'],
  mission:['Shrine manners','At the shrine, bow at the gate, wash your hands at the water basin the right way, and do two bows, two claps, one bow at the hall.','⛩️']},
 {id:'temple',label:'At a temple',icon:'🛕',test:s=>/\b(temple|-ji\b|dera|todai|senso|kiyomizu|kinkaku|ginkaku|buddha|pagoda)\b/i.test(text(s)),
  grown:['No clapping at a temple: put the hands together, bow and pray quietly.',
   'Waft the incense smoke over yourself if there is a burner; it is said to be good for whatever it touches.',
   'Shoes off where there is a step up and slippers, hats off inside, and no photos where the sign says so.'],
  boys:['No clapping at a temple — hands together and a quiet bow.','Shoes off at the step.','Wave the smoke onto your head for luck.'],
  mission:['Temple quiet','At the temple, put your hands together and bow without clapping, and spot a sign that says no photos.','🛕']},
 {id:'onsen',label:'At an onsen or bath',icon:'♨️',test:s=>/\b(onsen|sento|hot spring|bathhouse|public bath)\b/i.test(text(s)),
  grown:['Wash and rinse completely at the seated showers before getting in.',
   'No swimwear; the small towel stays out of the water (on your head is fine).',
   'Hair tied up, no splashing or swimming, and quiet voices.'],
  boys:['Wash all over before you get in.','The little towel never goes in the water.','No swimming or splashing.'],
  mission:['Onsen expert','Wash all over at the showers first and keep your little towel out of the water the whole time.','♨️']},
 {id:'train',label:'On the train',icon:'🚆',test:s=>['transport'].includes(entryType(s).id)&&/\b(train|line|subway|metro|shinkansen|nozomi|jr|station|platform|railway)\b/i.test(text(s)),
  grown:['Queue at the marked lines on the platform and let everyone off before getting on.',
   'Phones on silent and no calls; talk quietly.',
   'Backpacks off and in front of you or on the rack; priority seats are for those who need them.'],
  boys:['Wait at the lines on the floor.','Let people off first.','Whisper voices on the train.'],
  mission:['Train ninja','Wait at the platform lines, let everyone off first, and use a whisper voice for the whole ride.','🚆']},
 {id:'shinkansen',label:'On the Shinkansen',icon:'🚄',test:s=>/\b(shinkansen|nozomi|hikari|kodama)\b/i.test(text(s)),
  grown:['Eating a bento on board is normal; take the rubbish with you or to the bins at the car ends.',
   'Ask the person behind before reclining, and turn the seats to face each other as a family if the row is yours.',
   'Big cases go in the reserved oversized-luggage seats or overhead.'],
  boys:['Ask before you put the seat back.','Take your rubbish with you.'],
  mission:['Bullet train manners','On the Shinkansen, ask the person behind before putting a seat back and take all our rubbish off the train.','🚄']},
 {id:'food',label:'Eating out',icon:'🍜',test:s=>['food'].includes(entryType(s).id),
  grown:['Say "itadakimasu" before eating and "gochisōsama deshita" when you leave.',
   'No tipping; pay at the till by the door, and put money on the little tray rather than in a hand.',
   'Chopsticks never stand upright in rice or pass food chopstick to chopstick. Slurping noodles is fine.'],
  boys:['Say "itadakimasu" before you eat.','Never stand chopsticks up in your rice.','Slurping noodles is allowed!'],
  mission:['Itadakimasu','Say "itadakimasu" before you eat and "gochisōsama deshita" as we leave — and slurp your noodles.','🍜']},
 {id:'street-food',label:'Snacks on the go',icon:'🍡',test:s=>/\b(market|takoyaki|street food|yokocho|nishiki|ameyoko|snacks?|food stall|dango|taiyaki)\b/i.test(text(s)),
  grown:['Eat standing near the stall that sold it rather than walking along; it is how it is done and the bin is there.',
   'Rubbish bins are rare: carry a bag for wrappers.'],
  boys:['Eat it next to the shop, not walking.','Keep your rubbish till you find a bin.'],
  mission:['Stand and snack','Eat your snack standing next to the stall that sold it, and carry your rubbish until you find a bin.','🍡']},
 {id:'shop',label:'In the shops',icon:'🛍️',test:s=>entryType(s).id==='shopping',
  grown:['Money goes on the tray at the till, and change comes back on it.',
   'No haggling. Tax-free counters need the passport, for spends over ¥5,000 in one shop.',
   'Ask before photographing inside a small shop.'],
  boys:['Put the money on the little tray.','Ask before taking photos inside.'],
  mission:['Tray money','Pay for something yourself by putting the money on the tray, and say "arigatō gozaimasu".','🛍️']},
 {id:'park-queue',label:'In the park queues',icon:'🎢',test:s=>/\b(disney|universal|usj|nintendo world)\b/i.test(text(s)),
  grown:['Whole party in the queue: holding a place for people elsewhere is not done.',
   'Sitting on the ground in queues and parade spots is normal, on a mat if you have one.'],
  boys:['Everyone stays in the queue together.','Sit on the ground for the parade.'],
  mission:['Queue champion','Stay in the queue with the family all the way to the ride without asking how long.','🎢']},
 {id:'taxi',label:'In a taxi',icon:'🚕',test:s=>/\b(taxi|cab)\b/i.test(text(s)),
  grown:['The back door opens and closes by itself: hands off it.',
   'Show the address in Japanese, or the phone number for the satnav. No tip.'],
  boys:['Don’t touch the taxi door — it opens by magic.'],
  mission:['Magic door','Let the taxi door open and close all by itself, and say "arigatō gozaimasu" to the driver.','🚕']}
];
// The escalator, which turns on the city rather than the stop.
export function escalatorSide(city){
 return /osaka|kobe|nara/i.test(city||'')?{side:'right',walk:'left',where:'In Osaka, stand on the right and walk on the left.'}
  :{side:'left',walk:'right',where:'In Tokyo, stand on the left and walk on the right.'};
}
// The etiquette for one stop: every kind it matches, most particular first. A Shinkansen stop is
// both a train and the Shinkansen, and both sets are worth reading.
export function etiquetteFor(step,city=''){
 if(!step)return [];
 const found=ETIQUETTE.filter(e=>e.test(step));
 const out=[...found.filter(e=>e.id==='shinkansen'),...found.filter(e=>e.id!=='shinkansen')];
 if(out.some(e=>e.id==='train')){
  const e=escalatorSide(city);
  out.push({id:'escalator',label:'On the escalator',icon:'↕️',grown:[`${e.where} Kyoto mostly stands on the left, but follow whoever is in front.`],boys:[`Stand on the ${e.side} of the escalator, hold the rail.`],mission:null});
 }
 return out;
}
export const findEtiquette=id=>ETIQUETTE.find(e=>e.id===id)||null;
// The same manners as single tips, one card each, for the opening screen, Home and the run-up:
// the grown-up lines, or the boys' shorter ones for a young reader. Each keeps where it applies
// as its label, so a card reads "At a shrine" over the line itself. The escalator goes in as
// both cities, since a tip read over breakfast is not tied to one stop.
const ESCALATOR={id:'escalator',label:'On the escalator',icon:'↕️',
 grown:['Tokyo stands on the left and walks on the right; Osaka the other way round. Kyoto mostly stands left, but follow whoever is in front.'],
 boys:['Stand on one side of the escalator, the same side as everyone in front, and hold the rail.']};
const tipsOf=(rule,young)=>(young?rule.boys:rule.grown).map((text,i)=>({id:`${rule.id}-${i}`,label:rule.label,icon:rule.icon,text}));
export const ALL_ETIQUETTE=(young=false)=>[...ETIQUETTE,ESCALATOR].flatMap(r=>tipsOf(r,young));
// The tips for a day: what its own stops call for first, in the order of the stops, then every
// other tip, so the day's shrine or onsen comes round before the taxi door.
export function etiquetteForDay(steps=[],city='',young=false){
 const today=[...new Map(steps.flatMap(s=>etiquetteFor(s,city)).map(r=>[r.id,r])).values()].flatMap(r=>tipsOf(r,young));
 const ids=new Set(today.map(t=>t.id));
 return [...today,...ALL_ETIQUETTE(young).filter(t=>!ids.has(t.id))];
}
