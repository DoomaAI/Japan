// Like a local: the things people who live in Tokyo, Kyoto, Osaka and Nara actually do — the
// neighbourhood bath, the basement food hall, the tram, the family restaurant, the Sunday flea
// market — that visitors walk past on the way to the famous ones. Each one says where, why the
// locals go, how to do it without embarrassment, what it costs, and whether it works with a
// five- and an eight-year-old. Written for this trip, so each one names the base it is for and
// finds its own days in the plan: what is behind us folds away, what is coming up leads, and a
// weekend-only one waits for a weekend we are actually there. Nothing here needs a signal or a
// key. Prices are September 2026 and rounded; the card says "about" for a reason.
import {dayAreas} from './trip-features.js';
export const LOCAL_KINDS=[
 ['eat','Eat where they eat'],['bathe','Bathe'],['wander','Wander'],['ride','Ride'],
 ['play','Play'],['shop','Shop'],['weekend','Weekend mornings']
];
export const LOCAL_KIND_LABEL=id=>LOCAL_KINDS.find(([k])=>k===id)?.[1]||'Other';
export const LOCAL_KIND_ICON={eat:'🍚',bathe:'♨️',wander:'🚶',ride:'🚋',play:'🎈',shop:'🛒',weekend:'🌤️'};
// The board category each kind lands on, so an idea put up from here filters like a typed one.
const CATEGORY={eat:'food',bathe:'activity',wander:'place',ride:'activity',play:'activity',shop:'shopping',weekend:'place'};
// boys: 'yes' is fine for both; 'care' needs a hand (hot broth, a bath, a queue).
export const LOCAL_EXPERIENCES=[
 // ---- Tokyo: the 2 to 6 October base at the Hilton in Shinjuku, and the Disney days count too.
 {id:'sento',area:'Tokyo',kind:'bathe',title:'A neighbourhood bathhouse',ja:'銭湯',say:'sen-toh',
  where:'Any neighbourhood has one; Kōsugi-yu in Kōenji and Daikoku-yu in Oshiage, under the Skytree, are two the locals queue for.',
  why:'Tokyo still has around 450 public baths, and the after-work soak is a neighbourhood habit visitors almost never join. Everyone is there: the grandad, the toddler, the salaryman.',
  how:'Take a small towel each or hire one at the door. Shoes in a locker, pay at the counter, wash sitting down at a tap before getting in, no swimmers. Nate goes in with Dad; boys under about seven can go either side in most Tokyo baths. Most sento are fine with tattoos, unlike onsen resorts.',
  cost:'About ¥550 an adult, set by the city; children about ¥200, under-fives about ¥100.',when:'Late afternoon, before the six o’clock crowd.',
  boys:'care',setting:'indoor',duration:75,tags:['onsen','quiet']},
 {id:'depachika',area:'Tokyo',kind:'eat',title:'Depachika dinner in the hotel room',ja:'デパ地下',say:'de-pa-chi-ka',
  where:'Keio at Shinjuku’s west exit, or Isetan and Takashimaya on the other side of the station.',
  why:'The basement food hall is where Tokyo buys tonight’s dinner: hundreds of counters, everything to take away, nobody sitting down. Visitors photograph it; locals shop it.',
  how:'Go after about 6:30 pm when the discount stickers start appearing. Pick one thing each — a bento, karaage, a fruit sandwich, a tray of sushi, a slice of the cake in the glass case — and eat it all in the room in pyjamas. Point, hold up fingers, and each counter wraps its own.',
  cost:'About ¥1,000 to ¥1,500 a head for dinner.',when:'Evening, from 6:30; the halls close at 8 or 8:30.',
  boys:'yes',setting:'indoor',duration:60,tags:['food','depachika']},
 {id:'togoshi',area:'Tokyo',kind:'wander',title:'Togoshi Ginza shopping street',ja:'戸越銀座商店街',say:'to-go-shi gin-za',
  where:'Togoshi-Ginza station on the Tōkyū Ikegami line, or Togoshi on the Asakusa line, south of Shinagawa.',
  why:'Tokyo’s longest shopping street, 1.3 km of croquette stands, greengrocers and butchers doing their evening trade. The Ginza with department stores is for visitors; this Ginza is where Tokyo lives.',
  how:'Walk the length with a hot croquette in hand — the Togoshi Ginza korokke is the thing to eat here — and let the boys pick a dagashi (penny sweet) shop. Go late afternoon when the schools are out and the shops are busiest.',
  cost:'A croquette is about ¥150; the walk is free.',when:'Late afternoon.',
  boys:'yes',setting:'outdoor',duration:90,tags:['food','shopping','backstreet']},
 {id:'toden',area:'Tokyo',kind:'ride',title:'Ride the last streetcar',ja:'都電荒川線',say:'to-den a-ra-ka-wa sen',
  where:'Board at Ōtsuka on the JR Yamanote line and ride north-east to the end at Minowabashi.',
  why:'The one tram Tokyo kept, one carriage long, running through back gardens and past school gates and allotments. Grandmothers and schoolchildren ride it; the tourist trams are in Hiroshima and Nagasaki.',
  how:'Flat fare, tap Suica as you board, sit right at the front with the driver. Get off at Minowabashi for the Joyful Minowa covered shopping street and a paper bag of old-fashioned sweets. Around 50 minutes end to end; break it at Arakawa Yūen for the little amusement park if the boys need a run.',
  cost:'¥170 an adult, ¥90 a child, however far you go.',when:'Any daytime; quieter mid-morning.',
  boys:'yes',setting:'mixed',duration:120,tags:['trains','tram','quiet']},
 {id:'famiresu',area:'Tokyo',kind:'eat',title:'A family restaurant, robot waiter included',ja:'ファミレス',say:'fa-mi-re-su',
  where:'Gusto or Saizeriya — there is one within a few minutes of almost any station, usually upstairs.',
  why:'Every Tokyo family has a Saturday famiresu. Nobody flies to Japan for one, which is exactly why the boys will remember it: the touch-screen ordering, the drink bar, the cat-faced robot that brings the plates at Gusto.',
  how:'Take a table, order on the tablet, add the drink bar and let the boys refill their own melon soda. Saizeriya is Italian for pocket money — a plate of pasta is about ¥400 — and the kids’ menu comes with a puzzle.',
  cost:'About ¥600 to ¥1,000 a head.',when:'Lunch or an early dinner.',
  boys:'yes',setting:'indoor',duration:60,tags:['food','robot']},
 {id:'kurasushi',area:'Tokyo',kind:'eat',title:'Conveyor-belt sushi with the capsule game',ja:'くら寿司',say:'ku-ra zu-shi',
  where:'Kura Sushi has branches all over the city; Sushirō is the other chain locals use.',
  why:'This is where Tokyo families eat sushi: plates from about ¥115, ordered on a screen and delivered on an express lane. The tourist counters in Ginza and Tsukiji cost ten times more.',
  how:'Post five empty plates through the slot at your table and a gachapon game plays on the screen; win and a capsule drops out. Take a number from the machine at the door, or book a table in the Kura app to skip the wait.',
  cost:'About ¥1,500 a head.',when:'An early dinner, before six, beats the queue.',
  boys:'yes',setting:'indoor',duration:60,tags:['food','sushi','game']},
 {id:'bunkyo',area:'Tokyo',kind:'wander',title:'The free view from a ward office',ja:'文京シビックセンター展望ラウンジ',say:'bun-kyoh shi-bi-ku sen-tah',
  where:'Bunkyō Civic Center, beside Tokyo Dome, at Kōrakuen and Kasuga stations.',
  why:'The 25th floor of a local council building is open to anyone, free, with Shinjuku’s towers in the window and, on a clear evening, Fuji behind them. Locals bring visitors here rather than pay for the Skytree.',
  how:'Take the lift to the 25th floor; it is open 9 am to 8:30 pm. Best in the last hour of light. We are at Tokyo Dome for the Giants anyway, so go up before the game.',
  cost:'Free.',when:'Just before sunset.',
  boys:'yes',setting:'indoor',duration:30,tags:['views','free']},
 {id:'toymuseum',area:'Tokyo',kind:'play',title:'Tokyo Toy Museum, in an old school',ja:'東京おもちゃ美術館',say:'toh-kyoh o-mo-cha bi-ju-tsu-kan',
  where:'Yotsuya-Sanchōme, two stops from Shinjuku on the Marunouchi line.',
  why:'A closed primary school where every classroom is full of wooden toys to play with, run by volunteer “toy curators”. Full of Tokyo families on a weekend; visitors rarely hear of it.',
  how:'Shoes off, hands on. Head for the Wood Toy Forest — a room of wooden balls to wade through — and the games room where a curator will teach the boys a Japanese board game. Closed Thursdays.',
  cost:'About ¥1,100 an adult, ¥800 a child.',when:'Morning, when it opens at ten.',
  boys:'yes',setting:'indoor',duration:120,tags:['kids','toys','crafts']},
 {id:'playpark',area:'Tokyo',kind:'play',title:'An adventure playground',ja:'羽根木プレーパーク',say:'ha-ne-gi pu-reh-pah-ku',
  where:'Hanegi Play Park in Hanegi Park, at Umegaoka on the Odakyū line, four stops from Shinjuku.',
  why:'Setagaya’s play parks let children build, saw, hammer, climb and get filthy under the eye of a play leader; the first one opened in 1979 and Tokyo parents have sworn by them since. There is not a tourist in sight.',
  how:'Turn up in old clothes and let them go. It is free and run by the neighbourhood; check the day’s hours on the gate as they change with the season and it closes one weekday.',
  cost:'Free.',when:'Any afternoon it is open.',
  boys:'yes',setting:'outdoor',duration:120,tags:['kids','playground','park']},
 {id:'inokashira',area:'Tokyo',kind:'wander',title:'Swan boats at Inokashira Park',ja:'井の頭公園',say:'i-no-ka-shi-ra koh-en',
  where:'Kichijōji, about 15 minutes from Shinjuku on the JR Chūō rapid.',
  why:'Kichijōji tops the “where Tokyo people would most like to live” polls year after year: a pond with pedal boats, a small zoo, and Harmonica Yokochō’s alleys behind the station.',
  how:'Pedal a swan boat, then yakitori at Iseya by the park gate, the ¥100-a-skewer institution with a queue of locals. The Ghibli Museum is at the far end of the park but needs tickets months ahead.',
  cost:'A swan boat is about ¥800 for half an hour.',when:'A weekday afternoon.',
  boys:'yes',setting:'outdoor',duration:150,tags:['park','nature','food']},
 {id:'fleamarket',area:'Tokyo',kind:'weekend',title:'A Sunday flea market',ja:'フリーマーケット',say:'fu-ree mah-ket-to',weekdays:[0,6],
  where:'Ōi Racecourse on the Tokyo Monorail, Saturdays and Sundays; or the antique market in Hanazono Shrine’s grounds, Sundays, a short walk from Shinjuku’s east exit.',
  why:'Tokyo’s biggest flea market is families selling out of the boot: second-hand toys, Pokémon cards and Beyblades for pocket money. Hanazono’s is old ceramics and kimono under the trees.',
  how:'Go in the morning with cash in small notes and let the boys haggle with their own spending money. Both are called off in rain.',
  cost:'Free to walk round.',when:'Weekend mornings only.',
  boys:'yes',setting:'outdoor',duration:90,tags:['shopping','market','weekend']},
 {id:'morning',area:'Tokyo',kind:'eat',title:'Morning service at a coffee shop',ja:'モーニング',say:'moh-nin-gu',
  where:'Komeda’s Coffee, near most stations; or any old kissaten with velvet seats and a newspaper rack.',
  why:'Japan’s breakfast habit: order a coffee before 11 and toast and a boiled egg come with it, free. Nobody photographs it, which is rather the point.',
  how:'Order a coffee each and the “morning” arrives without asking. For the boys, a mini Shiro-noir — a warm pastry with soft-serve — counts as breakfast on holiday.',
  cost:'About ¥500 to ¥600 a coffee, the toast free.',when:'Before 11 am.',
  boys:'yes',setting:'indoor',duration:45,tags:['coffee','kissaten','breakfast']},
 {id:'tachigui',area:'Tokyo',kind:'eat',title:'Standing soba at the station',ja:'立ち食いそば',say:'ta-chi-gu-i so-ba',
  where:'Inside or beside almost every big station; look for a counter with a ticket machine at the door and men in suits at it.',
  why:'The salaryman’s breakfast: three minutes from ticket to slurp, and the best cheap meal in Tokyo. Visitors walk past it looking for a restaurant.',
  how:'Put coins in the machine, press kake soba (plain) or kakiage soba (with a vegetable fritter), hand the ticket over, stand at the counter, slurp loudly. Nate’s bowl needs a parent’s hand; the broth is hot.',
  cost:'Under ¥500 a bowl.',when:'Breakfast or a late-morning snack.',
  boys:'care',setting:'indoor',duration:20,tags:['food','soba','cheap']},
 {id:'supermarket',area:'Tokyo',kind:'shop',title:'A real supermarket at seven o’clock',ja:'スーパー',say:'soo-pah',
  where:'Any Life, Seiyu, Itō-Yōkadō, OK or Maruetsu; there is one under or beside most stations.',
  why:'The konbini is for visitors and taxi drivers. Families shop at the sūpā, where the bento and sashimi get 20%, 30% and then half-price stickers from about seven in the evening.',
  how:'Send the boys to find the man with the sticker gun. Buy breakfast for the room — yoghurt drinks, giant grapes, melon pan — and take a bag; a plastic one costs a few yen.',
  cost:'A third less than the konbini.',when:'Evening, from about seven.',
  boys:'yes',setting:'indoor',duration:30,tags:['shopping','food','cheap']},
 {id:'karaoke',area:'Tokyo',kind:'play',title:'A karaoke room on a rainy afternoon',ja:'カラオケ',say:'ka-ra-o-ke',
  where:'Karaoke-kan, Manekineko or Big Echo, on any street near a station.',
  why:'Japanese families take a room for an hour in the daytime, when it costs a fraction of the night rate and the rooms are full of kids. Visitors go at midnight with strangers.',
  how:'Ask for a room for four for an hour, daytime rate, with the drink bar. The machine has English songs, and the Disney and Pokémon songs in Japanese for the boys to shout along to.',
  cost:'Daytime, from a few hundred yen a person an hour; the drink bar extra.',when:'A wet afternoon.',
  boys:'yes',setting:'indoor',duration:60,tags:['music','indoor','rain']},
 // ---- Kyoto: the 24 to 28 September base at Hotel Kanra.
 {id:'masugata',area:'Kyoto',kind:'shop',title:'Demachi Masugata shopping street',ja:'出町桝形商店街',say:'de-ma-chi ma-su-ga-ta',
  where:'Demachiyanagi, at the top of the Kamo river, on the Keihan line or bus 201.',
  why:'Where Kyoto shops for dinner now that Nishiki has become a food court for visitors: a covered street of fishmongers, a tofu shop, a sweet shop with a queue of locals at the entrance.',
  how:'Join the queue at Demachi Futaba for mame-mochi — a warm rice cake with red beans and salted peas — and eat it on the river bank a minute away.',
  cost:'About ¥250 a mochi.',when:'Morning; the mochi sell out.',
  boys:'yes',setting:'mixed',duration:60,tags:['shopping','food','market']},
 {id:'kamodelta',area:'Kyoto',kind:'play',title:'The stepping stones at the Kamo river delta',ja:'鴨川デルタ',say:'ka-mo-ga-wa de-ru-ta',
  where:'Where the Kamo and Takano rivers meet, below Demachiyanagi station.',
  why:'Kyoto students and children hop the turtle- and bird-shaped stepping stones, paddle in the shallows and picnic on the point. The temples are full of tour buses; this is full of Kyoto.',
  how:'Take off shoes, cross on the turtles, and sit on the bank with mame-mochi from Masugata. Ten minutes’ walk from the Shimogamo shrine’s forest if anyone wants a quiet one.',
  cost:'Free.',when:'Any dry afternoon.',
  boys:'yes',setting:'outdoor',duration:60,tags:['river','kids','free','quiet']},
 {id:'funaoka',area:'Kyoto',kind:'bathe',title:'Funaoka Onsen, the 1923 bathhouse',ja:'船岡温泉',say:'fu-na-o-ka on-sen',
  where:'Murasakino, north-west Kyoto, near Daitoku-ji; bus 206 to Senbon Kuramaguchi.',
  why:'A registered cultural property that is still the neighbourhood bath: carved wooden ceilings in the changing room, a majolica-tiled passage and an outdoor tub. Neighbours, not visitors.',
  how:'It opens mid-afternoon. Same rules as any sento: wash first, no swimmers, small towel. Nate goes in with Dad.',
  cost:'About ¥500 an adult.',when:'From 3 pm on weekdays.',
  boys:'care',setting:'indoor',duration:75,tags:['onsen','history']},
 {id:'kissaten',area:'Kyoto',kind:'eat',title:'Breakfast at an old Kyoto coffee house',ja:'喫茶店',say:'kis-sa-ten',
  where:'Inoda Coffee’s main shop on Sakaimachi, or Smart Coffee on Teramachi, both downtown.',
  why:'Kyoto’s morning at the counter since the 1940s: businessmen, aunties, the newspaper, coffee that comes already with milk and sugar unless you say otherwise. Smart Coffee’s hotcakes are what Kyoto children remember.',
  how:'Take a table before nine to miss the queue. For the boys, French toast or hotcakes; for the parents, the “Kyoto morning” set of coffee, egg, ham and salad.',
  cost:'About ¥800 a coffee, ¥900 hotcakes.',when:'Early morning.',
  boys:'yes',setting:'indoor',duration:60,tags:['coffee','kissaten','breakfast']},
 {id:'botanical',area:'Kyoto',kind:'wander',title:'Kyoto Botanical Garden lawns',ja:'京都府立植物園',say:'kyoh-to fu-ri-tsu sho-ku-bu-tsu-en',
  where:'Kitayama station on the Karasuma subway line, beside the Kamo river.',
  why:'Kyoto families’ Sunday: 24 hectares of lawns to run on, a glasshouse, a bamboo garden, and almost nobody from out of town. Children get in free.',
  how:'Take a picnic and a ball. Walk back down the river path to Demachiyanagi afterwards; it is all flat.',
  cost:'¥200 an adult, children free.',when:'A dry morning.',
  boys:'yes',setting:'outdoor',duration:120,tags:['park','nature','free','quiet']},
 // ---- Osaka: the 25 and 28 September days.
 {id:'tenjinbashi',area:'Osaka',kind:'wander',title:'Tenjinbashi-suji, Japan’s longest arcade',ja:'天神橋筋商店街',say:'ten-jin-ba-shi su-ji',
  where:'From Tenjinbashisuji Rokuchōme station south to Osaka Tenmangū shrine; the Tanimachi and Sakaisuji lines.',
  why:'2.6 km of covered shopping street where Osaka actually shops. Kuromon market is where visitors do, at three times the price.',
  how:'Start at the north end and walk south with a takoyaki stop halfway. Kids Plaza Osaka is at the bottom, by Ōgimachi station, if the boys need a run.',
  cost:'Free; takoyaki about ¥600 a tray.',when:'Late morning into the afternoon.',
  boys:'yes',setting:'indoor',duration:120,tags:['shopping','food','market']},
 {id:'kidsplaza',area:'Osaka',kind:'play',title:'Kids Plaza Osaka',ja:'キッズプラザ大阪',say:'kid-zu pu-ra-za oh-sa-ka',
  where:'Ōgimachi station on the Sakaisuji line, at the foot of Tenjinbashi-suji.',
  why:'A five-storey hands-on children’s museum built for Osaka’s own kids: a climbing “Kids Town” designed by Hundertwasser, a pretend shopping street, a TV studio. Visitors are at Universal.',
  how:'Aim for opening at 9:30; Kids Town first, before the school groups. Closed the second and third Mondays of the month.',
  cost:'About ¥1,400 an adult, ¥800 a primary-school child, ¥500 under six.',when:'Morning.',
  boys:'yes',setting:'indoor',duration:150,tags:['kids','museum']},
 {id:'nakazakicho',area:'Osaka',kind:'wander',title:'Nakazakichō’s old lanes',ja:'中崎町',say:'na-ka-za-ki-choh',
  where:'One stop from Umeda on the Tanimachi line, or a 15-minute walk.',
  why:'Wooden houses that survived the war, now tiny cafés, vintage shops and a shaved-ice counter. Young Osakans’ weekend, ten minutes from the department stores.',
  how:'Wander without a plan; the lanes are two blocks deep. A kakigōri (shaved ice) for the boys and a coffee for the parents.',
  cost:'Free to wander.',when:'Afternoon.',
  boys:'yes',setting:'outdoor',duration:75,tags:['backstreet','coffee','quiet']},
 {id:'okonomiyaki',area:'Osaka',kind:'eat',title:'Okonomiyaki at a neighbourhood shop',ja:'お好み焼き',say:'o-ko-no-mi-ya-ki',
  where:'Any side street away from Dōtonbori; look for a hand-written menu, a hot plate on every table and a grandmother at the counter.',
  why:'Osaka’s home cooking, cooked in front of you. The Dōtonbori queues are for the guidebook shops; the good ones have no English sign and no wait.',
  how:'Order a buta-tama (pork) and a modan-yaki (with noodles) to share, let the boys flip with the little spatulas, and cut it into squares with them rather than a knife.',
  cost:'About ¥900 to ¥1,200 each.',when:'Dinner.',
  boys:'care',setting:'indoor',duration:75,tags:['food','okonomiyaki']},
 // ---- Nara: the 27 September day.
 {id:'naramachi',area:'Nara',kind:'wander',title:'Naramachi’s merchant lanes',ja:'ならまち',say:'na-ra-ma-chi',
  where:'South of Sarusawa pond, ten minutes’ walk from Kintetsu Nara station.',
  why:'The old merchant quarter where Nara people live, with red cloth monkeys hanging under the eaves to take bad luck instead of the house. The crowds stop at the deer and Tōdai-ji.',
  how:'Count the migawari-zaru monkeys, look into a machiya house that is open, and buy a red monkey charm for the tree at home. Nara’s mochi-pounding shop is on the way back if the boys want the show.',
  cost:'Free; a charm is a few hundred yen.',when:'Afternoon, after the deer.',
  boys:'yes',setting:'outdoor',duration:60,tags:['backstreet','history','quiet']}
];
const weekdayOf=date=>new Date(`${date}T12:00:00Z`).getUTCDay();
// The bases a trip day is in, the same reading What's on uses: "Nara / Kyoto" is both, and a
// Disney day is in Tokyo's reach.
export const localAreas=(state,date)=>{const d=(state?.days||[]).find(x=>x.date===date);return d?dayAreas(d):[];};
// The trip days an experience could be done on: in its base, on or after `from`, and on a day of
// the week it happens (a Sunday market waits for a Sunday we are there).
export function localDays(state,item,from=''){
 return (state?.days||[]).filter(d=>d.date>=from&&dayAreas(d).includes(item.area)&&(!item.weekdays||item.weekdays.includes(weekdayOf(d.date)))).map(d=>d.date);
}
// Every experience with its days still ahead, the next of them, whether its base is today's, and
// whether it is behind us: a base we have left, or a weekend one with no weekend left there.
export function localExperiences(state,today=''){
 const here=new Set(localAreas(state,today));
 return LOCAL_EXPERIENCES.map(e=>{
  const days=localDays(state,e,today),all=localDays(state,e);
  return {...e,days,next:days[0]||null,here:here.has(e.area),done:all.length>0&&days.length===0,never:all.length===0};
 });
}
// The bases in the order the page reads them: where we are, then the ones still ahead in the
// order we reach them, then the ones behind us.
export function localAreaOrder(state,today=''){
 const days=state?.days||[],here=localAreas(state,today);
 const ahead=[...new Set(days.filter(d=>d.date>=today).flatMap(dayAreas))].filter(a=>!here.includes(a));
 const behind=[...new Set(days.flatMap(dayAreas))].filter(a=>!here.includes(a)&&!ahead.includes(a));
 const listed=new Set(LOCAL_EXPERIENCES.map(e=>e.area));
 return {here:here.filter(a=>listed.has(a)),ahead:ahead.filter(a=>listed.has(a)),behind:behind.filter(a=>listed.has(a))};
}
// A few for Home: what is here and still ahead, a weekend one first in the days it can be done,
// and the rest turned over day by day so the card does not say the same three things all week.
export function localPicks(state,today,limit=3){
 const live=localExperiences(state,today).filter(e=>e.here&&e.next);
 if(!live.length)return [];
 const dated=live.filter(e=>e.weekdays),open=live.filter(e=>!e.weekdays);
 const shift=(state?.days||[]).findIndex(d=>d.date===today);
 const turned=open.length?open.map((_,i)=>open[(i+Math.max(0,shift)*2)%open.length]):[];
 const soon=dated.filter(e=>e.next===today||e.next===addDays(today,1));
 return [...soon,...turned.filter(e=>!soon.includes(e))].slice(0,limit);
}
const addDays=(date,n)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
// Directions, by the Japanese name so Maps lands on the place and not on a translation of it.
export const localMapUrl=e=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.ja||e.title} ${e.area} Japan`)}`;
// What goes on the planning board: the same fields a typed idea has, so it votes, filters and
// schedules like any other, with the why and the how kept in its notes for whoever reads it there.
export function localDraft(e){
 return {title:e.title,place:e.where,japanese:e.ja,mapUrl:localMapUrl(e),
  notes:[e.why,e.how,e.cost?`Cost: ${e.cost}`:'',e.when?`When: ${e.when}`:''].filter(Boolean).join('\n\n').slice(0,4000),
  category:CATEGORY[e.kind]||'place',costNote:e.cost||'',availability:e.when||'',setting:e.setting||'',
  tags:['like a local',LOCAL_KIND_LABEL(e.kind).toLowerCase(),...(e.tags||[])],duration:e.duration||90,source:'suggested'};
}
// An idea already on the board from here, by title, so the button says so instead of adding twice.
export const localOnBoard=(state,e)=>(state?.proposals||[]).find(p=>p.title===e.title&&(p.tags||[]).includes('like a local'))||null;
// Search everything finds these by name, Japanese, base and what they are about.
export function searchLocal(query){
 const q=String(query||'').trim().toLowerCase();if(!q)return [];
 return LOCAL_EXPERIENCES.filter(e=>[e.title,e.ja,e.say,e.area,e.where,e.why,e.how,LOCAL_KIND_LABEL(e.kind),...(e.tags||[])].join(' ').toLowerCase().includes(q))
  .map(e=>({type:'Like a local',id:e.id,title:e.title,detail:`${e.area} · ${e.why}`}));
}
// What a check against the web brings back and the trip keeps, per card, for every phone: is it
// open on our dates, any closure, the price now, whether that differs from the card, two or
// three sentences to read on the day, what still to confirm, and the pages it came from. The
// same cleaning runs on the server (on what the model returned) and on the mutation that saves
// it, so nothing longer or stranger than this shape is ever stored.
export const CHECK_FIELDS=[['summary',1000],['open',300],['closed',300],['price',300],['differences',600],['checkFirst',600]];
const httpsOnly=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href.slice(0,500):'';}catch{return '';}};
export function cleanLocalCheck(check){
 if(!check||typeof check!=='object')return {error:'Nothing to save.'};
 const value={};
 for(const [key,max] of CHECK_FIELDS)value[key]=String(check[key]??'').replace(/\s+/g,' ').trim().slice(0,max);
 if(!value.summary)return {error:'The check said nothing.'};
 value.changed=check.changed===true;
 value.sources=(Array.isArray(check.sources)?check.sources:[]).map(s=>({title:String(s?.title??'').trim().slice(0,200),url:httpsOnly(s?.url)})).filter(s=>s.url).slice(0,8);
 return {value};
}
// One line each for Ask, by base, so a question about a free afternoon can reach for the tram or
// the bathhouse before reaching for the web. A checked card carries what the check found.
// Only the bases this trip visits; a trip that goes nowhere listed here gets nothing, so another
// family's project is not told about Tokyo.
export function localBrief(state){
 const areas=[...new Set(LOCAL_EXPERIENCES.map(e=>e.area))].filter(area=>localDays(state,{area}).length);
 if(!areas.length)return '';
 const count=LOCAL_EXPERIENCES.filter(e=>areas.includes(e.area)).length;
 const out=['# Like a local','',`${count} things locals do more than visitors, by base, that the family can read in the app and put on the board.`];
 for(const area of areas){
  const dates=localDays(state,{area});
  out.push('',`## ${area} (${dates[0]} to ${dates.at(-1)})`);
  for(const e of LOCAL_EXPERIENCES.filter(e=>e.area===area)){
   const c=state?.localChecks?.[e.id];
   out.push(`- ${e.title} (${e.ja}) — ${LOCAL_KIND_LABEL(e.kind)} · ${e.cost}${e.when?` · ${e.when}`:''}${e.weekdays?' · weekends only':''}${e.boys==='care'?' · the boys need a hand':''}${c?` · checked on the web ${String(c.at||'').slice(0,10)}: ${c.summary}${c.changed&&c.differences?` Differs from the card: ${c.differences}`:''}`:''}`);
  }
 }
 return out.join('\n');
}
