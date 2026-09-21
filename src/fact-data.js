// A fun fact a day, taken out of the guide Lauren wrote and tied to the page it came from.
// The page is the whole linkage: every day in the trip already names its guide pages, so a
// fact lands on the day whose pages it belongs to — the sumo facts on sumo day, Hachiko on
// the Shibuya afternoon, the lucky cats on the morning we go and find them. Nothing here is
// generated, so it works with no signal and costs nothing to run.
//
// Order is priority. Within a day the facts are written best-first, so the one that pops up
// on open is the one worth knowing before that day happens; the rest are there to swipe on
// through. `anytime` marks the facts that belong to the guide's opening pages rather than to
// a single day — etiquette, food, matcha, money — and they fill in behind the day's own.
export const FACTS=[
 // Mon 21 Sept — the flight in, and landing at Haneda. Guide page 19.
 {id:'flight',page:19,icon:'✈️',title:'Nearly ten hours in the air',
  text:'QF59 leaves Sydney at 11:15 in the morning and lands at Haneda at 8:10 that night — 9 hours 55 minutes, and about 7,800 km north.'},
 {id:'clocks',page:19,icon:'🕘',title:'Japan has one clock, all year',
  text:'The whole country keeps a single time zone and has never used daylight saving. Japan is an hour behind Sydney when we land — and two behind once Sydney’s clocks go forward on 4 October, while ours in Japan do not move at all.'},
 {id:'haneda',page:19,icon:'🛬',title:'The close airport',
  text:'Tokyo has two big airports. Haneda sits right on Tokyo Bay, which is why the drive to the hotel is about eighteen minutes rather than the hour and a half from Narita.'},
 // Tue 22 Sept — Meiji Jingu, Shibuya Crossing, Hachiko, Shibuya Sky. Guide pages 20 and 22.
 {id:'hachiko',page:22,icon:'🐕',title:'Hachikō waited for ten years',
  text:'Hachikō met his owner, Professor Ueno, at Shibuya Station every evening. The professor died in 1925 and never came — so Hachikō came back to the same spot almost every day until his own death in 1935. The statue stands where he waited.'},
 {id:'meiji-forest',page:20,icon:'🌳',title:'The forest was planted by hand',
  text:'Meiji Jingu’s woods look ancient but are younger than the shrine’s neighbours. Around 100,000 trees were donated from every part of Japan and planted when the shrine opened in 1920, to grow into a forest in the middle of Tokyo.'},
 {id:'crossing',page:22,icon:'🚦',title:'The busiest crossing on earth',
  text:'When the lights go red in every direction at Shibuya, up to about 3,000 people cross at once. It is the most photographed pedestrian crossing in the world, and best watched twice: once from the middle, once from above.'},
 {id:'torii',page:20,icon:'⛩️',title:'A gate with nothing behind it',
  text:'A torii marks the boundary between the everyday world and the shrine’s. There is no door and no wall — you show you have noticed it by bowing once before you walk through, and by keeping out of the very centre, which is left for the gods.'},
 {id:'sake-barrels',page:20,icon:'🍶',title:'The barrels are empty',
  text:'The wall of decorated sake barrels at Meiji Jingu is a wall of gifts. Brewers all over Japan send them to the shrine each year as an offering. They are beautifully painted, stacked several high — and completely hollow.'},
 {id:'omikuji',page:20,icon:'🎴',title:'You can leave a bad fortune behind',
  text:'An omikuji is a paper fortune drawn at random, and Meiji Jingu’s come translated into English. A good one goes in your pocket. A bad one gets tied to the rack by the path, so the bad luck stays at the shrine instead of coming with you.'},
 // Wed 23 Sept — teamLab Borderless in the morning, sumo at Ryōgoku. Guide pages 25 and 27.
 {id:'sumo-old',page:27,icon:'🤼',title:'Older than almost any other sport',
  text:'Sumo has been going for more than 1,500 years. It began as a Shinto ritual — a bout wrestled to pray for a good harvest, for health, and for protection from evil spirits — and only later became a professional sport. The rituals stayed.'},
 {id:'sumo-ring',page:27,icon:'⭕',title:'A clay circle 4.55 metres across',
  text:'The dohyō is raised clay with straw bales pressed into the edge. There are only two ways to lose: step or be pushed outside the circle, or touch the ground inside it with anything other than the soles of your feet — a hand, a knee, even a fingertip.'},
 {id:'sumo-salt',page:27,icon:'🧂',title:'The salt is not for show',
  text:'Wrestlers throw salt to purify the ring, and stomp their feet to drive evil spirits out of it. A top-division wrestler can throw a few handfuls before a single bout — and one bout is often over in a few seconds.'},
 {id:'sumo-topknot',page:27,icon:'💈',title:'The topknot comes from the samurai',
  text:'The chonmage is a samurai hairstyle kept alive by sumo alone. It is oiled and tied so tightly it will not come loose mid-bout, and a wrestler’s hairdresser is a full-time professional. Cutting it off is how a wrestler retires.'},
 {id:'sumo-tournament',page:27,icon:'📋',title:'Fifteen days, fifteen bouts',
  text:'A grand tournament — a basho — runs fifteen days, and each top-division wrestler fights exactly once a day. Win more than you lose and you move up the banzuke ranking sheet; lose more than you win and you go down it.'},
 {id:'borderless',page:25,icon:'🎨',title:'The artwork walks out of the room',
  text:'teamLab Borderless has no set route and no map, because the works do not stay put — they wander between rooms, run into each other and change when you touch them. Two people walking through it never see the same thing.'},
 // Thu 24 Sept — Nozomi to Kyoto, Gion after dark, Yasaka Shrine. Guide pages 28 and 31.
 {id:'shinkansen',page:28,icon:'🚄',title:'Late is measured in seconds',
  text:'The Tōkaidō Shinkansen has run since 1964 and its average delay across a whole year is under a minute — counted in seconds, including typhoons and earthquakes. The cleaning crews turn a whole train around in about seven minutes.'},
 {id:'ekiben',page:28,icon:'🍱',title:'A lunchbox built for a train',
  text:'Ekiben — eki, station, plus bentō — is a travel tradition more than a century old. Each region sells its own, designed to be eaten cold at a seat-back tray table, and choosing yours at Tokyo Station is half the point of the journey.'},
 {id:'yasaka',page:28,icon:'🏮',title:'Thirteen hundred years of lanterns',
  text:'Yasaka Shrine has stood at the end of Shijō-dōri for more than 1,300 years, dedicated to protection from disease and misfortune. Its festival, the Gion Matsuri, is one of Japan’s biggest — and the hundreds of lanterns are lit by donors whose names are painted on them.'},
 {id:'gion',page:31,icon:'🌸',title:'Geiko, not geisha',
  text:'In Kyoto the word is geiko, and an apprentice is a maiko. Hanamikōji is the street they have walked to evening appointments for generations. They are working, not performing, so the rule is simple: photograph the street, never follow anyone down it.'},
 // Fri 25 Sept — Universal Studios Japan and Super Nintendo World. Guide page 33.
 {id:'nintendo-world',page:33,icon:'🍄',title:'The first one in the world',
  text:'Super Nintendo World opened in Osaka in 2021, before the ones in Hollywood or Orlando. The question blocks really do make the sound when you punch them, and the whole land was designed with Shigeru Miyamoto, who made Mario in the first place.'},
 {id:'flying-dinosaur',page:33,icon:'🦖',title:'Face-down, under the track',
  text:'The Flying Dinosaur hangs riders below the rail and tips them face-down, as if a pteranodon had picked them up. It holds records for its length and for its drop — and the queue is at its shortest in the first half hour the park is open.'},
 {id:'popcorn',page:33,icon:'🍿',title:'Popcorn is a flavour hunt',
  text:'Japanese theme parks treat popcorn as a collectable. Each cart sells a different flavour — caramel, salt, curry, soy sauce and butter, seasonal specials — and people carry the buckets around on a strap all day.'},
 // Sat 26 Sept — an early Arashiyama morning. Guide page 36.
 {id:'bamboo',page:36,icon:'🎋',title:'It can grow a metre in a day',
  text:'Moso bamboo is a grass, not a tree, and in spring a new shoot can put on close to a metre in twenty-four hours. A stem reaches its full height in a couple of months and then never grows taller — it only hardens.'},
 {id:'bamboo-sound',page:36,icon:'🎐',title:'A sound worth protecting',
  text:'The creak and rattle of the Arashiyama grove in the wind is on Japan’s official list of 100 soundscapes to be preserved. That is the reason to be there at eight in the morning: at eleven, all you can hear is people.'},
 {id:'togetsukyo',page:36,icon:'🌉',title:'The moon-crossing bridge',
  text:'Togetsukyō means “moon crossing bridge”. An emperor watching the moon travel over it about 800 years ago said it looked like the moon was walking across — and the name stuck.'},
 // Sun 27 Sept — Nara in the morning, old Kyoto in the afternoon. Guide page 38.
 {id:'deer-bow',page:38,icon:'🦌',title:'The deer bow back',
  text:'Nara’s deer are wild, and about 1,200 of them live in the park. They are treated as messengers of the gods of Kasuga Taisha and have been protected for centuries. Bow to one holding a cracker and it will very often bow back — it has learnt that bowing works.'},
 {id:'deer-crackers',page:38,icon:'🍘',title:'The crackers are deer food, not treats',
  text:'Shika senbei are made of rice bran and flour with no sugar in them at all, so they are safe for the deer. They are sold only by licensed stalls, and the money goes back to looking after the herd. One at a time, and show empty hands when you are done.'},
 {id:'daibutsu',page:38,icon:'🛕',title:'As tall as a five-storey building',
  text:'Tōdai-ji’s Great Buddha was cast in the 8th century and is one of the largest bronze statues in the world — nearly 15 metres sitting down. The hall it sits in is one of the biggest wooden buildings anywhere, and it is only two-thirds the size of the original.'},
 {id:'mochi',page:38,icon:'🍡',title:'Mochi pounded faster than you can watch',
  text:'At Nakatanidō two men work one mortar: one swings the mallet, the other turns and wets the rice between blows, at well over a strike a second. They do it in the street, on the hour, and the mochi is still warm when it reaches you.'},
 // Mon 28 Sept — Osaka: Shinsaibashi, Dōtonbori, takoyaki and neon. Guide page 45.
 {id:'glico',page:45,icon:'🏃',title:'The runner has been running since 1935',
  text:'The Glico Running Man has stood over the Dōtonbori canal since 1935. The sign has been rebuilt six times — the current one is LED and changes its background through the night — but he has never stopped, or changed his pose.'},
 {id:'kuidaore',page:45,icon:'🍢',title:'Osaka has a word for eating too much',
  text:'Kuidaore means roughly “eat yourself bankrupt”, and Osaka claims it as a compliment. The city was Japan’s trading centre for centuries and was nicknamed tenka no daidokoro — the nation’s kitchen.'},
 {id:'takoyaki',page:45,icon:'🐙',title:'Invented here in the 1930s',
  text:'Takoyaki was invented in Osaka in 1935 and is still cooked the same way: batter poured into a hot iron plate of half-spheres, a piece of octopus dropped in, then each ball turned with a pick until it is crisp outside and molten in the middle.'},
 {id:'escalator',page:45,icon:'🛗',title:'Osaka stands on the other side',
  text:'In Tokyo everyone stands on the left of the escalator and walks up the right. In Osaka it is the other way round — stand on the right. Nobody agrees on why, and the border between the two runs somewhere around Kyoto.'},
 // Tue 29 Sept — the transfer to Tokyo Disney Resort. Guide page 47.
 {id:'disney-first',page:47,icon:'🏰',title:'The first Disney park outside America',
  text:'Tokyo Disneyland opened in 1983, the first Disney park built anywhere outside the United States. It is also the only one Disney does not own — it is run under licence by a Japanese company, the Oriental Land Company.'},
 {id:'disneysea-only',page:47,icon:'🌊',title:'There is only one DisneySea',
  text:'Tokyo DisneySea has no equivalent anywhere else in the world. Fantasy Springs, where we are staying, opened in 2024 as its eighth port of call — and the hotel rooms look straight into the land.'},
 {id:'luggage',page:47,icon:'🧳',title:'Suitcases travel on their own',
  text:'Takkyūbin luggage forwarding is so normal in Japan that hotels send your suitcases ahead overnight as a matter of course. Ours left Hotel Kanra on 28 September and will be at the Disney hotel before we are — so you travel with one small bag.'},
 // Wed 30 Sept — Tokyo Disneyland. Guide pages 48 and 50.
 {id:'pooh',page:48,icon:'🍯',title:'A ride with no track',
  text:'Pooh’s Hunny Hunt uses honey pots that steer themselves — no rails under the floor at all. They split up, spin, chase each other and take a slightly different route each time, which is why it is still one of the hardest rides in the park to get on.'},
 {id:'disney-popcorn',page:50,icon:'🍿',title:'The buckets are the souvenir',
  text:'Tokyo Disney’s popcorn buckets are shaped, strapped and collected. Each cart sells one flavour and one design, people plan routes around them, and the flavours change with the season.'},
 {id:'halloween',page:48,icon:'🎃',title:'Halloween runs for six weeks',
  text:'Tokyo Disneyland’s Halloween season fills most of September and October, with the Villains’ parade in the afternoon and the fireworks at night. It is the one time of year adults are allowed to come in full costume.'},
 // Thu 1 Oct — DisneySea, then back into Tokyo. Guide page 52.
 {id:'prometheus',page:52,icon:'🌋',title:'The volcano erupts on a timer',
  text:'Mount Prometheus is the tallest thing at DisneySea and it is hollow: Journey to the Center of the Earth runs through the inside of it. It smokes all day and erupts properly every so often, which is worth watching from the harbour.'},
 {id:'ports',page:52,icon:'⚓',title:'Lands are called ports',
  text:'DisneySea is built around water, so it does not have lands — it has ports of call: Mediterranean Harbour, Mermaid Lagoon, Arabian Coast, Mysterious Island and the rest. You can travel between some of them by boat.'},
 {id:'dumplings',page:52,icon:'🍡',title:'Little Green Dumplings',
  text:'The three green mochi on a stick are modelled on the Toy Story aliens, and each one is a different flavour. They are one of the park’s most-photographed snacks and they sell out — which is why they are on the plan for quarter to one.'},
 // Fri 2 Oct — Tsukiji Outer Market, then Akihabara. Guide pages 57 and 58.
 {id:'tsukiji-moved',page:57,icon:'🐟',title:'The market that stayed behind',
  text:'The famous tuna auctions left Tsukiji for Toyosu in 2018 — but only the wholesale side moved. The Outer Market, with the knife shops, the egg stalls and the snack counters, stayed exactly where it was.'},
 {id:'tamagoyaki',page:57,icon:'🍳',title:'An omelette built in layers',
  text:'Tamagoyaki is cooked in a rectangular pan, a thin layer at a time, each one rolled onto the last until it becomes a block. Slightly sweet, eaten warm on a stick at the market, and a job chefs spend years getting right.'},
 {id:'gachapon',page:58,icon:'🎰',title:'Named after the noise it makes',
  text:'Gachapon is onomatopoeia: gacha is the crank turning, pon is the capsule dropping. Akihabara has shops with thousands of machines in rows, and you cannot choose what you get — that is the whole idea.'},
 {id:'akihabara',page:58,icon:'💡',title:'Why it is called Electric Town',
  text:'Akihabara grew out of a post-war street market selling radio parts and vacuum tubes. The electronics came first, the games and anime came later — and the nickname Electric Town stuck from the radio days.'},
 // Sat 3 Oct — Harajuku in the morning, the Giants at Tokyo Dome at night. Guide pages 60 and 65.
 {id:'cheer-songs',page:65,icon:'⚾',title:'Every batter has his own song',
  text:'Japanese baseball crowds sing. Each Giants player has a personal cheer song, led by trumpets and drums from the support section, and the whole stand knows all of them. You do not need the words — join the clapping.'},
 {id:'oendan',page:65,icon:'🥁',title:'Only one side cheers at a time',
  text:'The rule that makes a Japanese game sound so different: you cheer while your team is batting and go quiet when they are fielding. So the noise swaps ends every half-inning, and both sets of fans get a clean turn.'},
 {id:'tidy-fans',page:65,icon:'🧹',title:'The crowd tidies up',
  text:'Japanese supporters are known for clearing their own rows before they leave, and plenty bring a bag for it. The atmosphere is loud and organised rather than rowdy — which is what makes the Dome easy with children.'},
 {id:'takeshita',page:60,icon:'🌈',title:'Where street fashion started',
  text:'Takeshita Street is only about 350 metres long and is where Harajuku style was born in the 1970s and 80s. It is also where rainbow fairy floss bigger than your head became a thing — and it is directly opposite the station exit.'},
 // Sun 4 Oct — Ginza and Tokyo Station. Guide pages 66 and 67.
 {id:'hokoten',page:66,icon:'🚶',title:'Sunday, and the road belongs to you',
  text:'On Sunday afternoons Ginza’s Chūō-dōri closes to cars and people walk down the middle of it. It is called hokōsha tengoku — pedestrian paradise — and Ginza has been doing it since 1970. Tables get put out in the road.'},
 {id:'ginza-name',page:66,icon:'🥈',title:'Ginza means silver mint',
  text:'A silver coin mint stood on this spot in the Edo period: gin is silver, za is a guild or workshop. The coins went long ago, the name did not — and the district is still where Tokyo keeps its most expensive shopfronts.'},
 {id:'depachika',page:66,icon:'🍰',title:'The best food is in the basement',
  text:'Depachika — depāto plus chika, department store basement — is a food hall the size of a supermarket, full of counters handing out samples. It is the cheapest way to eat extremely well in Ginza, and the sweets are wrapped like presents.'},
 {id:'tokyo-station',page:67,icon:'🧱',title:'The red brick front was rebuilt twice',
  text:'Tokyo Station’s Marunouchi building opened in 1914, lost its domes to bombing in 1945, and spent five years being restored to the original design — reopening in 2012 with the domes back. It is the photo everyone takes.'},
 // Mon 5 Oct — one more Shibuya day. Guide pages 68 and 70.
 {id:'omurice',page:70,icon:'🍳',title:'Western food, invented in Japan',
  text:'Omurice belongs to yōshoku — Western-style dishes invented in Japan around a century ago. Fried rice inside an omelette, cut open at the table so it falls across the plate. The cut is the point.'},
 {id:'souffle-pancakes',page:68,icon:'🥞',title:'The wobble is meringue',
  text:'Soufflé pancakes get their height from egg whites whipped to a meringue and folded through the batter, then cooked slowly under a lid. They keep wobbling as they arrive, and they deflate — so eat them straight away.'},
 {id:'yamanote',page:68,icon:'🚃',title:'A train line that goes in a circle',
  text:'The Yamanote Line is a loop, so you cannot miss your stop for long — a full lap of Tokyo takes about an hour. Every station plays its own short jingle as the doors close, and regulars know where they are without looking up.'},
 {id:'miyashita',page:68,icon:'🏞️',title:'A park on a roof',
  text:'Miyashita Park is built on top of the shops: lawn, skate park, climbing wall and beach volleyball court, a storey above the street. From the deck you look straight down the road towards Shibuya.'},
 // Tue 6 Oct — Gōtokuji and home. Guide page 72.
 {id:'maneki-neko',page:72,icon:'🐱',title:'The lucky cat was born here',
  text:'Gōtokuji claims the first maneki-neko. The story goes that a lord sheltering from a storm saw the temple cat beckoning him in from under a tree — he followed it, and lightning struck the spot where he had been standing.'},
 {id:'which-paw',page:72,icon:'🐾',title:'Which paw is up matters',
  text:'A cat with its left paw raised is beckoning people in; a right paw is beckoning money. Gōtokuji’s are all plain white and hold no coin at all — they are for wishes, not wealth.'},
 {id:'cat-shelves',page:72,icon:'🎐',title:'Nobody takes their cat home',
  text:'The rows of cats in the temple grounds were all left there. You buy one, make a wish, take it away — and bring it back to join the shelves when the wish comes true. Some of them have been there for decades.'},
 // The guide's opening pages: things that are true on any day of the trip.
 {id:'bins',page:4,icon:'🗑️',anytime:true,title:'Almost no bins, and no litter either',
  text:'Public bins are genuinely rare in Japan, and the streets are still spotless. Everybody carries their rubbish until they get home or find a convenience store — which is why a small plastic bag lives in the day bag.'},
 {id:'slurp',page:4,icon:'🍜',anytime:true,title:'Slurping is allowed',
  text:'Pulling noodles in noisily cools them on the way to your mouth and is taken as a sign you are enjoying them. It is one of the very few places where a loud noise at the table is good manners.'},
 {id:'chopsticks',page:5,icon:'🥢',anytime:true,title:'Two things never to do with chopsticks',
  text:'Never stand them upright in a bowl of rice, and never pass food from chopstick to chopstick. Both belong to a funeral, so both feel shocking at a dinner table. Lay them across the rest instead.'},
 {id:'shoes',page:4,icon:'👟',anytime:true,title:'Watch for the step',
  text:'Shoes come off wherever the floor changes level or material — a raised entryway, a tatami room, a temple hall, sometimes a fitting room. If there are slippers waiting, that is the signal. Socks without holes are a real consideration.'},
 {id:'quiet-trains',page:4,icon:'🤫',anytime:true,title:'Phones go on manner mode',
  text:'Nobody takes a call on a Japanese train. Phones go silent, conversations drop to a murmur, and a whole packed carriage can be close to quiet. It is the single habit that makes travelling with children feel different here.'},
 {id:'queue',page:4,icon:'🚉',anytime:true,title:'The queue is painted on the floor',
  text:'Platforms have marks showing exactly where the doors will stop, and people line up on them in twos, standing aside to let everybody off first. The train stops within centimetres of the mark, every time.'},
 {id:'no-tipping',page:4,icon:'💴',anytime:true,title:'Nobody takes a tip',
  text:'There is no tipping in Japan — not in restaurants, taxis or hotels. Leaving money behind causes confusion and someone may chase you down the street to give it back. Good service is simply the standard.'},
 {id:'sumimasen',page:3,icon:'🙇',anytime:true,title:'One word does three jobs',
  text:'Sumimasen means excuse me, sorry, and thank you, depending on how you use it. Say it to get attention, to apologise for squeezing past, and to thank someone who has gone out of their way. It is the most useful word you will learn.'},
 {id:'itadakimasu',page:6,icon:'🙏',anytime:true,title:'Grace, for the food itself',
  text:'Everyone says itadakimasu before the first bite and gochisōsama deshita at the end. It thanks whoever grew, caught, cooked and served the meal rather than anyone at the table — and staff notice when visitors say it.'},
 {id:'konbini',page:2,icon:'🏪',anytime:true,title:'The convenience store does everything',
  text:'A Japanese konbini sells hot food worth eating, but it will also print your documents, post a parcel, sell concert tickets, take a bill payment and lend you a clean toilet. There is one on nearly every corner, open all night.'},
 {id:'seven-atm',page:2,icon:'🏧',anytime:true,title:'The cash machine to look for',
  text:'Plenty of Japanese bank machines refuse foreign cards. The ones inside 7-Eleven almost always take them, work in English and are open twenty-four hours — which is why a 7-Eleven counts as a cash plan.'},
 {id:'voltage',page:2,icon:'🔌',anytime:true,title:'The lowest voltage in the world',
  text:'Japan runs on 100 volts, lower than anywhere else. Modern chargers handle it without noticing; older appliances charge slowly. The plug is two flat pins, so an adaptor still has to come out of the bag.'},
 {id:'taxi-doors',page:2,icon:'🚕',anytime:true,title:'The taxi door opens itself',
  text:'The rear kerbside door of a Japanese taxi is worked by the driver from the front seat. It swings open as the taxi stops and closes behind you — so stand back, and do not reach for the handle.'},
 {id:'vending',page:18,icon:'🥤',anytime:true,title:'A vending machine on every street',
  text:'Japan has around four million vending machines — more per person than almost anywhere. The same machine sells cold drinks and hot ones: a blue label is cold, a red label is hot, including corn soup in a can.'},
 {id:'suica',page:4,icon:'🐧',anytime:true,title:'One card, tapped for everything',
  text:'A Suica or IC card gets you through the ticket gate, onto the bus, and pays at the convenience store, the vending machine and plenty of lockers. Tap in, tap out, and never work out a fare.'},
 {id:'scripts',page:3,icon:'🈁',anytime:true,title:'Three alphabets at once',
  text:'Japanese writing mixes kanji, hiragana and katakana in the same sentence. Katakana is the one used for words borrowed from other languages — so it is the set to learn first, because ホテル really does say “hoteru”.'},
 {id:'temizuya',page:4,icon:'⛲',anytime:true,title:'There is an order at the water basin',
  text:'At the temizuya you fill the ladle once and make it last: rinse the left hand, then the right, then pour into your cupped left hand to rinse your mouth, then stand the ladle up to run the last of the water down the handle.'},
 {id:'matcha',page:7,icon:'🍵',anytime:true,title:'You drink the leaf, not the water',
  text:'Matcha is the whole tea leaf, shade-grown and stone-ground to a powder, then whisked into hot water rather than steeped and thrown away. That is why the colour is so intense — and why a good tin is worth carrying home.'},
 {id:'uji',page:7,icon:'🌱',anytime:true,title:'Kyoto is the place to buy it',
  text:'Uji, just south of Kyoto, has grown Japan’s most prized tea for around 800 years. The best shops limit powdered matcha to one tin per person, they sell out early in the day, and 20–40 gram tins are the sweet spot.'},
 {id:'wagashi',page:7,icon:'🍡',anytime:true,title:'The sweet is part of the tea',
  text:'Wagashi are served with matcha for a reason: the sweetness is calculated against the tea’s bitterness, and you eat it first. They are shaped and coloured to match the season, so the same shop sells something different in autumn.'},
 {id:'onigiri',page:6,icon:'🍙',anytime:true,title:'The wrapper is engineering',
  text:'A convenience-store onigiri keeps its seaweed in a separate plastic layer so it stays crisp against the rice. Pull tab 1, then 2, then 3 in order and the film slides out and the nori wraps itself around the rice.'},
 {id:'lost-property',page:4,icon:'🎒',anytime:true,title:'Lost things come back',
  text:'Japan is extraordinary at returning lost property. A wallet left on a train is handed in, logged and waiting at the station office. If you lose something, ask at the nearest station window or kōban rather than giving up on it.'}
];
export const ALL_FACTS=()=>FACTS;
export const findFact=id=>FACTS.find(f=>f.id===id)||null;
// The facts that belong to no single day — the guide's etiquette, food and money pages.
export const ANYTIME_FACTS=()=>FACTS.filter(f=>f.anytime);
// A day already names its guide pages, so the day's facts are the facts from those pages,
// in the order they are written above — best first.
export function factsForDay(days,day){
 const pages=(days||[]).find(d=>d.date===day)?.pages;
 if(!pages?.length)return [];
 const on=new Set(pages);
 return FACTS.filter(f=>!f.anytime&&on.has(f.page));
}
// What pops up on open: the first of the day's own facts, tied to what is actually coming up.
export const factForDay=(days,day)=>factsForDay(days,day)[0]||null;
// The order "one more" works through: today's facts first because they are the prioritised
// ones, then the facts that fit any day, then the rest of the book.
export function orderedFacts(days,day){
 const todays=factsForDay(days,day),have=new Set(todays.map(f=>f.id));
 const anytime=ANYTIME_FACTS().filter(f=>!have.has(f.id));
 for(const f of anytime)have.add(f.id);
 return [...todays,...anytime,...FACTS.filter(f=>!have.has(f.id))];
}
