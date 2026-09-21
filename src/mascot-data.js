// Each of us designs a Japanese character to carry through the trip: a spirit out of the old
// stories, or something out of modern Japan, built from a handful of parts. Everything a
// character is made of lives here as plain ids, so the picture is drawn from words rather
// than a file, it works with no signal, and it is small enough to sit beside a name anywhere
// in the app. Mascot.jsx turns these ids into the drawing; nothing else needs to know how.

// The old stories first, then the ones the boys already know from television and toy shops.
// `vibe` is only there to help somebody who does not know where to start.
export const THEMES=[
 {id:'kitsune',name:'Fox spirit',ja:'狐',romaji:'kitsune',vibe:'trickster',
  lore:'A fox in the service of Inari, the rice god. The stories say it grows another tail every hundred years, so the oldest are nine-tailed.',
  known:'Fox-fire, borrowed faces, and the thousand orange gates at Fushimi Inari in Kyoto.',
  suggest:{shape:'fox',palette:'kitsune',eyes:'sparkle',mouth:'grin',marking:'whiskers',headwear:'flame',item:'bell',pattern:'asahi'},
  powers:['Fox-fire that lights a dark lane','Can wear anybody’s face for one minute','Hears a whisper three streets away'],
  names:[{name:'コン',romaji:'Kon',meaning:'the sound a fox makes'},{name:'金狐',romaji:'Kinko',meaning:'golden fox'},{name:'ホムラ',romaji:'Homura',meaning:'flame'},{name:'ナナオ',romaji:'Nanao',meaning:'seven tails'}]},
 {id:'tanuki',name:'Raccoon dog',ja:'狸',romaji:'tanuki',vibe:'trickster',
  lore:'A round, cheerful shape-shifter. Its statue stands outside restaurants with a straw hat and a flask, promising you will be fed well.',
  known:'Turning leaves into money, drumming on its own belly, and never quite getting away with it.',
  suggest:{shape:'tanuki',palette:'sumi',eyes:'bright',mouth:'smile',marking:'mask',headwear:'kasa',item:'lantern',pattern:'kumo'},
  powers:['Turns a leaf into a train ticket','Belly-drums loud enough to stop traffic','Can look exactly like a vending machine'],
  names:[{name:'ポンタ',romaji:'Ponta',meaning:'from pon, the belly-drum sound'},{name:'マメ',romaji:'Mame',meaning:'bean'},{name:'月丸',romaji:'Tsukimaru',meaning:'moon circle'},{name:'ハチ',romaji:'Hachi',meaning:'eight'}]},
 {id:'kappa',name:'River imp',ja:'河童',romaji:'kappa',vibe:'trickster',
  lore:'A green river-dweller the size of a child, with a dish of water on its head. Spill the water and it loses its strength, so it is very careful when it bows.',
  known:'Sumo in the shallows, cucumbers, and being unfailingly polite — bow to it and it must bow back.',
  suggest:{shape:'kappa',palette:'matcha',eyes:'bright',mouth:'beak',marking:'scales',headwear:'dish',item:'cucumber',pattern:'seigaiha'},
  powers:['Swims faster than the ferry','Wins any wrestling match in water','Always knows where the nearest river is'],
  names:[{name:'キュウ',romaji:'Kyū',meaning:'short for cucumber, kyūri'},{name:'カワ',romaji:'Kawa',meaning:'river'},{name:'ミズキ',romaji:'Mizuki',meaning:'water moon'},{name:'サラ',romaji:'Sara',meaning:'the dish on its head'}]},
 {id:'oni',name:'Ogre',ja:'鬼',romaji:'oni',vibe:'fighter',
  lore:'A horned giant with a tiger-skin belt and an iron club. Every February families throw roasted beans at the door and shout "Oni out, luck in!".',
  known:'Being loud, being strong, and losing to a handful of beans once a year.',
  suggest:{shape:'oni',palette:'beniaka',eyes:'fierce',mouth:'roar',marking:'scar',headwear:'horns',item:'katana',pattern:'kumo'},
  powers:['Lifts a whole ramen shop','A shout that shakes the roof tiles','Never, ever gets cold'],
  names:[{name:'ライ',romaji:'Rai',meaning:'thunder'},{name:'トラ',romaji:'Tora',meaning:'tiger'},{name:'アカネ',romaji:'Akane',meaning:'deep red'},{name:'豆太',romaji:'Mameta',meaning:'bean boy, after the beans it fears'}]},
 {id:'ryu',name:'Dragon',ja:'龍',romaji:'ryū',vibe:'guardian',
  lore:'A long, serpent-bodied dragon with four claws and whiskers. It lives in rivers, lakes and clouds, and it is the one you ask for rain.',
  known:'Weather, water, and being painted across the ceiling of temple halls.',
  suggest:{shape:'dragon',palette:'ai',eyes:'fierce',mouth:'roar',marking:'scales',headwear:'horns',item:'umbrella',pattern:'kumo'},
  powers:['Calls rain to end a hot afternoon','Rides a cloud between cities','Breathes out a whole morning of mist'],
  names:[{name:'リュウ',romaji:'Ryū',meaning:'dragon'},{name:'アマ',romaji:'Ama',meaning:'rain, sky'},{name:'ソラ',romaji:'Sora',meaning:'the sky'},{name:'銀龍',romaji:'Ginryū',meaning:'silver dragon'}]},
 {id:'tengu',name:'Mountain goblin',ja:'天狗',romaji:'tengu',vibe:'fighter',
  lore:'A red-faced, long-nosed spirit of the deep mountains, half man and half crow. It taught swordsmanship to warriors who were brave enough to climb up and ask.',
  known:'A feather fan that raises a gale, flight, and a very low opinion of show-offs.',
  suggest:{shape:'tengu',palette:'beniaka',eyes:'fierce',mouth:'calm',marking:'none',headwear:'hachimaki',item:'fan',pattern:'asanoha'},
  powers:['One wave of the fan and the wind changes','Jumps from one mountain to the next','Spots a lie before it is finished'],
  names:[{name:'カラス',romaji:'Karasu',meaning:'crow'},{name:'ヤマ',romaji:'Yama',meaning:'mountain'},{name:'ハネ',romaji:'Hane',meaning:'feather'},{name:'テング',romaji:'Tengu',meaning:'the goblin itself'}]},
 {id:'maneki',name:'Beckoning cat',ja:'招き猫',romaji:'maneki-neko',vibe:'lucky',
  lore:'The cat in every shop window with one paw raised. The raised left paw calls in customers; the right one calls in money.',
  known:'Luck, a gold coin round its neck, and sitting perfectly still for years.',
  suggest:{shape:'cat',palette:'yuki',eyes:'bright',mouth:'smile',marking:'blush',headwear:'none',item:'bell',pattern:'sakura'},
  powers:['Waves the right train onto our platform','Finds the shop that is still open','Turns a bad queue into a short one'],
  names:[{name:'タマ',romaji:'Tama',meaning:'jewel, and the oldest cat name in Japan'},{name:'フク',romaji:'Fuku',meaning:'good luck'},{name:'ミケ',romaji:'Mike',meaning:'three-fur, a calico cat'},{name:'コバン',romaji:'Koban',meaning:'the gold coin it holds'}]},
 {id:'shisa',name:'Lion dog',ja:'シーサー',romaji:'shīsā',vibe:'guardian',
  lore:'Okinawan roof guardians, always in a pair. The open mouth lets the good in; the closed one keeps the good from leaving.',
  known:'Sitting on rooftops and gateposts, staring down anything that means the house harm.',
  suggest:{shape:'lion',palette:'kin',eyes:'fierce',mouth:'roar',marking:'swirl',headwear:'none',item:'none',pattern:'asanoha'},
  powers:['Nothing unpleasant gets past the front door','A roar that clears a crowded crossing','Remembers every way back to the hotel'],
  names:[{name:'シーサー',romaji:'Shīsā',meaning:'the guardian itself'},{name:'カゼ',romaji:'Kaze',meaning:'wind'},{name:'シマ',romaji:'Shima',meaning:'island'},{name:'イシ',romaji:'Ishi',meaning:'stone'}]},
 {id:'daruma',name:'Wish doll',ja:'達磨',romaji:'daruma',vibe:'lucky',
  lore:'A round red doll with no arms or legs, weighted so it always rocks back upright. You paint in one eye when you make a wish and the other when it comes true.',
  known:'Falling down seven times and getting up eight.',
  suggest:{shape:'round',palette:'beniaka',eyes:'wink',mouth:'calm',marking:'none',headwear:'none',item:'none',pattern:'asahi'},
  powers:['Cannot be knocked over','Keeps one wish safe all trip','Gets back up before anybody notices it fell'],
  names:[{name:'ダル',romaji:'Daru',meaning:'short for daruma'},{name:'ネガイ',romaji:'Negai',meaning:'a wish'},{name:'アカ',romaji:'Aka',meaning:'red'},{name:'オキ',romaji:'Oki',meaning:'from okiagari, to get back up'}]},
 {id:'koi',name:'Carp',ja:'鯉',romaji:'koi',vibe:'guardian',
  lore:'The carp that swims up the waterfall and turns into a dragon at the top. Families fly carp streamers in May, one for every child in the house.',
  known:'Swimming against the current for as long as it takes.',
  suggest:{shape:'round',palette:'beniaka',eyes:'bright',mouth:'calm',marking:'scales',headwear:'none',item:'none',pattern:'seigaiha'},
  powers:['Swims up anything, including stairs','Never gives up on a queue','Turns into a dragon on the last day'],
  names:[{name:'コイ',romaji:'Koi',meaning:'carp'},{name:'ニシキ',romaji:'Nishiki',meaning:'brocade, from the patterned nishikigoi'},{name:'タキ',romaji:'Taki',meaning:'waterfall'},{name:'ミナモ',romaji:'Minamo',meaning:'the surface of the water'}]},
 {id:'ninja',name:'Ninja',ja:'忍者',romaji:'ninja',vibe:'fighter',
  lore:'The quiet ones from Iga and Kōga, hired to go where an army could not. The name means the person who endures, and the hiding came second.',
  known:'Rooftops, disguises, and leaving before anyone knows they arrived.',
  suggest:{shape:'human',palette:'sumi',eyes:'fierce',mouth:'calm',marking:'none',headwear:'hood',item:'katana',pattern:'plain'},
  powers:['Crosses a room without one floorboard squeaking','Climbs anything with a wall','Is already outside when you look'],
  names:[{name:'カゲ',romaji:'Kage',meaning:'shadow'},{name:'シノビ',romaji:'Shinobi',meaning:'one who endures, the older word for ninja'},{name:'ハヤテ',romaji:'Hayate',meaning:'a sudden gust'},{name:'クロ',romaji:'Kuro',meaning:'black'}]},
 {id:'robot',name:'Robot',ja:'ロボット',romaji:'robotto',vibe:'modern',
  lore:'Japan has been drawing friendly robots since the 1950s, and building them since. Some serve ramen; some greet you at the hotel desk.',
  known:'Being helpful, being polite, and running out of battery at the worst moment.',
  suggest:{shape:'robot',palette:'mizu',eyes:'visor',mouth:'calm',marking:'stars',headwear:'none',item:'lantern',pattern:'asanoha'},
  powers:['Translates a menu by looking at it','Never loses the hotel address','Charges off a vending machine'],
  names:[{name:'ハガネ',romaji:'Hagane',meaning:'steel'},{name:'デンキ',romaji:'Denki',meaning:'electricity'},{name:'イナズマ',romaji:'Inazuma',meaning:'lightning'},{name:'ゼロ',romaji:'Zero',meaning:'zero'}]},
 {id:'kaiju',name:'Monster',ja:'怪獣',romaji:'kaijū',vibe:'modern',
  lore:'The strange beasts of Japanese film, from the 1954 original onwards. They come out of the sea, flatten a city, and are somehow on our side by the sequel.',
  known:'Being enormous, roaring, and standing in front of a very small train.',
  suggest:{shape:'kaiju',palette:'matcha',eyes:'fierce',mouth:'roar',marking:'scales',headwear:'none',item:'none',pattern:'kumo'},
  powers:['Steps over a river without looking','A roar you can hear from Osaka','Fears nothing except the sequel'],
  names:[{name:'ガオ',romaji:'Gao',meaning:'a roar'},{name:'イワ',romaji:'Iwa',meaning:'rock'},{name:'カミナリ',romaji:'Kaminari',meaning:'thunder'},{name:'ダイ',romaji:'Dai',meaning:'big'}]}
];
export const VIBES=[['trickster','Clever and cheeky'],['guardian','Protects everybody'],['fighter','Brave and loud'],['lucky','Brings good luck'],['modern','Out of a film or a toy shop']];
export const SHAPES=[
 {id:'fox',label:'Fox',note:'Pointed ears, narrow snout'},
 {id:'cat',label:'Cat',note:'Round face, small ears'},
 {id:'tanuki',label:'Raccoon dog',note:'Round and stocky'},
 {id:'dragon',label:'Dragon',note:'Horns and whiskers'},
 {id:'kappa',label:'River imp',note:'Beak and a bowl cut'},
 {id:'oni',label:'Ogre',note:'Broad, square and heavy'},
 {id:'tengu',label:'Long-nose',note:'A famously long nose'},
 {id:'lion',label:'Lion dog',note:'A mane all the way round'},
 {id:'round',label:'Round one',note:'Daruma, carp or rice ball'},
 {id:'human',label:'Person',note:'A ninja, a sumo, or you'},
 {id:'robot',label:'Robot',note:'Bolts and an antenna'},
 {id:'kaiju',label:'Monster',note:'Spiked crest, big snout'}
];
// Each palette is a body colour, a lighter one for ears and belly, and a darker one for the
// shading — picked from colours that actually turn up in Japan rather than from a colour wheel.
export const PALETTES=[
 {id:'kitsune',label:'Fox orange',base:'#e8873c',trim:'#fbe3c6',dark:'#b45f26'},
 {id:'beniaka',label:'Sunrise red',base:'#d9503f',trim:'#f8d8cd',dark:'#a3322a'},
 {id:'sumi',label:'Ink black',base:'#414c55',trim:'#d3dbe0',dark:'#242d35'},
 {id:'matcha',label:'Matcha green',base:'#6f9a55',trim:'#e2eccf',dark:'#4c7038'},
 {id:'ai',label:'Indigo blue',base:'#37568c',trim:'#cfdaee',dark:'#233962'},
 {id:'sakura',label:'Blossom pink',base:'#e28aa8',trim:'#fbe3ec',dark:'#b25f7d'},
 {id:'kin',label:'Temple gold',base:'#d7a63c',trim:'#f7e7bc',dark:'#a57a1e'},
 {id:'yuki',label:'Snow white',base:'#f0efe9',trim:'#ffffff',dark:'#c3c9c4'},
 {id:'murasaki',label:'Royal purple',base:'#7a5aa6',trim:'#e4d9f1',dark:'#553b77'},
 {id:'mizu',label:'Water teal',base:'#3fa3a3',trim:'#d0eae8',dark:'#2a7574'}
];
export const EYES=[
 {id:'bright',label:'Bright',note:'Wide open'},
 {id:'sparkle',label:'Sparkling',note:'Stars in them'},
 {id:'sleepy',label:'Happy',note:'Smiling shut'},
 {id:'fierce',label:'Fierce',note:'Brows down'},
 {id:'wink',label:'Winking',note:'One eye shut'},
 {id:'visor',label:'Visor',note:'One glowing bar'}
];
export const MOUTHS=[
 {id:'smile',label:'Smile',note:''},
 {id:'grin',label:'Toothy grin',note:'Two small fangs'},
 {id:'calm',label:'Calm',note:'Saying nothing'},
 {id:'tongue',label:'Cheeky',note:'Tongue out'},
 {id:'beak',label:'Beak',note:''},
 {id:'roar',label:'Roar',note:'Wide open'}
];
export const MARKINGS=[
 {id:'none',label:'None',note:''},
 {id:'blush',label:'Rosy cheeks',note:''},
 {id:'whiskers',label:'Whiskers',note:''},
 {id:'mask',label:'Bandit mask',note:'Like a tanuki'},
 {id:'swirl',label:'Cheek swirls',note:''},
 {id:'scar',label:'Old scar',note:'One brave line'},
 {id:'stars',label:'Stars',note:''},
 {id:'scales',label:'Scales',note:''}
];
export const HEADWEAR=[
 {id:'none',label:'Nothing',note:''},
 {id:'hachimaki',label:'Headband',note:'A festival hachimaki'},
 {id:'kasa',label:'Straw hat',note:'A traveller’s kasa'},
 {id:'kabuto',label:'Samurai helmet',note:'With a gold crescent'},
 {id:'dish',label:'Water dish',note:'A kappa keeps it full'},
 {id:'horns',label:'Horns',note:''},
 {id:'flame',label:'Spirit flame',note:'Fox-fire, floating'},
 {id:'hood',label:'Ninja hood',note:''}
];
export const ITEMS=[
 {id:'none',label:'Empty hands',note:''},
 {id:'fan',label:'Paper fan',note:'An uchiwa'},
 {id:'katana',label:'Sword',note:''},
 {id:'lantern',label:'Lantern',note:'A paper chōchin'},
 {id:'onigiri',label:'Rice ball',note:'An onigiri'},
 {id:'bell',label:'Shrine bell',note:'A gold suzu'},
 {id:'cucumber',label:'Cucumber',note:'A kappa’s favourite'},
 {id:'umbrella',label:'Umbrella',note:'A paper wagasa'}
];
export const PATTERNS=[
 {id:'plain',label:'Plain',note:''},
 {id:'seigaiha',label:'Waves',note:'Seigaiha, the blue ocean wave'},
 {id:'asanoha',label:'Hemp leaf',note:'Asanoha, for growing up strong'},
 {id:'sakura',label:'Blossom',note:''},
 {id:'asahi',label:'Rising sun',note:''},
 {id:'kumo',label:'Clouds',note:''}
];
// Things a character can shout. Kept short, because they end up on a card beside a name.
export const SAYINGS=[
 {ja:'いくぞ！',romaji:'Ikuzo',en:'Let’s go!'},
 {ja:'まかせて！',romaji:'Makasete',en:'Leave it to me!'},
 {ja:'やった！',romaji:'Yatta',en:'We did it!'},
 {ja:'がんばれ！',romaji:'Ganbare',en:'Keep going!'},
 {ja:'だいじょうぶ！',romaji:'Daijōbu',en:'It’s all right!'},
 {ja:'すごい！',romaji:'Sugoi',en:'Amazing!'},
 {ja:'おなかすいた！',romaji:'Onaka suita',en:'I’m starving!'},
 {ja:'もういっかい！',romaji:'Mō ikkai',en:'One more time!'},
 {ja:'よろしく！',romaji:'Yoroshiku',en:'Nice to meet you!'},
 {ja:'いただきます！',romaji:'Itadakimasu',en:'Thanks for the food!'},
 {ja:'たのしい！',romaji:'Tanoshii',en:'This is fun!'},
 {ja:'つぎはどこ？',romaji:'Tsugi wa doko?',en:'Where to next?'}
];
// The fields the picture is drawn from. One list, used by the maker to lay out its steps and
// by the server to check that a saved character only ever holds ids this app knows how to draw.
export const CHOICES={theme:THEMES,shape:SHAPES,palette:PALETTES,eyes:EYES,mouth:MOUTHS,marking:MARKINGS,headwear:HEADWEAR,item:ITEMS,pattern:PATTERNS};
export const CHOICE_FIELDS=Object.keys(CHOICES);
export const TEXT_FIELDS={name:40,romaji:40,meaning:140,saying:120,power:140};
export const validChoice=(field,id)=>(CHOICES[field]||[]).some(o=>o.id===id);
export const optionFor=(field,id)=>(CHOICES[field]||[]).find(o=>o.id===id)||CHOICES[field]?.[0];
export const themeFor=id=>THEMES.find(t=>t.id===id)||THEMES[0];
export const paletteFor=id=>PALETTES.find(p=>p.id===id)||PALETTES[0];
export const DEFAULT_MASCOT={theme:'kitsune',...THEMES[0].suggest,name:'',romaji:'',meaning:'',saying:'',power:''};
export const mascotFor=(state,person)=>state?.mascots?.[person]||null;
export const hasMascot=(state,person)=>!!mascotFor(state,person);
// A character is only shown around the app once it has a name, so a half-finished one does
// not quietly replace somebody's initial everywhere.
export const mascotReady=m=>!!m&&!!String(m.name||'').trim();
export const mascotLabel=m=>mascotReady(m)?`${m.name}${m.romaji&&m.romaji!==m.name?` (${m.romaji})`:''}`:'';
const pick=(list,rand)=>list[Math.floor(rand()*list.length)];
// A whole character at once, built around one theme so the parts still belong together. It
// is the "surprise me" button, and it is also what a first visit starts from.
export function randomMascot(themeId,rand=Math.random){
 const theme=themeId?themeFor(themeId):pick(THEMES,rand),name=pick(theme.names,rand),saying=pick(SAYINGS,rand);
 const spread=rand()<0.5;
 return {theme:theme.id,...theme.suggest,
  ...(spread?{palette:pick(PALETTES,rand).id,eyes:pick(EYES,rand).id,mouth:pick(MOUTHS,rand).id,marking:pick(MARKINGS,rand).id,item:pick(ITEMS,rand).id,pattern:pick(PATTERNS,rand).id}:{}),
  name:name.name,romaji:name.romaji,meaning:name.meaning,saying:`${saying.ja} ${saying.romaji} — ${saying.en}`,power:pick(theme.powers,rand)};
}
// One line for a card or a screen reader: who this is, without repeating the picture.
export function describeMascot(m){
 if(!m)return '';
 const theme=themeFor(m.theme),palette=paletteFor(m.palette);
 return `${mascotLabel(m)||'An unnamed character'} · ${theme.name} (${theme.romaji}) in ${palette.label.toLowerCase()}`;
}
