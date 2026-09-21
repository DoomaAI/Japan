// Shiritori — しりとり, "taking the bottom". The word game every Japanese family plays on a
// train: your word has to start with the last sound of theirs, you may not say a word twice,
// and if you say one ending in ん you have lost, because nothing starts with ん. That last rule
// is the whole game, and it is the reason this is worth putting in front of a child who is
// learning kana: it makes him look at the end of a word rather than the start.
//
// Everything here works on the sound, not the spelling, which is what makes the rules fiddly
// and worth writing down once.
const SMALL={'ゃ':'や','ゅ':'ゆ','ょ':'よ','っ':'つ','ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','ゎ':'わ'};
// か and が are the same letter for this purpose. Strict players disagree; every child plays it
// this way, and a five-year-old told that が is nearly か but not quite has stopped playing.
const PLAIN={'が':'か','ぎ':'き','ぐ':'く','げ':'け','ご':'こ','ざ':'さ','じ':'し','ず':'す','ぜ':'せ','ぞ':'そ',
 'だ':'た','ぢ':'ち','づ':'つ','で':'て','ど':'と','ば':'は','び':'ひ','ぶ':'ふ','べ':'へ','ぼ':'ほ',
 'ぱ':'は','ぴ':'ひ','ぷ':'ふ','ぺ':'へ','ぽ':'ほ','ヴ':'う'};
const toHira=ch=>{const c=ch.codePointAt(0);return c>=0x30a1&&c<=0x30f6?String.fromCodePoint(c-0x60):ch;};
// A word reduced to the letters that count. Katakana and hiragana are the same sound, so they
// become one; the long mark ー is not a letter at all but a held vowel, so it goes, and コーヒー
// ends on ひ rather than on a dash.
// A word here is either the string or the entry it came from, because the difference has
// already caught one caller out and there is nothing to be gained by insisting on one.
const textOf=word=>typeof word==='string'?word:word?.ja||'';
export function letters(word){
 const out=[];
 for(const ch of textOf(word)){
  const h=toHira(ch);
  if(h==='ー'||h==='・'||h===' ')continue;
  out.push(SMALL[h]||PLAIN[h]||h);
 }
 return out;
}
export const headOf=word=>letters(word)[0]||'';
export const tailOf=word=>letters(word).at(-1)||'';
export const DEAD='ん';
export const losesOn=word=>tailOf(word)===DEAD;
export const follows=(word,after)=>!after||headOf(word)===tailOf(after);
// Words a child on this trip actually meets — on a menu, out of a train window, on a sign or
// in a shop. Every one is a thing rather than an idea, because the picture is how Nate plays.
export const WORDS=[
 {ja:'すし',romaji:'sushi',en:'Sushi',icon:'🍣'},{ja:'ラーメン',romaji:'rāmen',en:'Ramen',icon:'🍜'},
 {ja:'うどん',romaji:'udon',en:'Udon',icon:'🍲'},{ja:'そば',romaji:'soba',en:'Soba',icon:'🥢'},
 {ja:'たまご',romaji:'tamago',en:'Egg',icon:'🥚'},{ja:'さかな',romaji:'sakana',en:'Fish',icon:'🐟'},
 {ja:'にく',romaji:'niku',en:'Meat',icon:'🍖'},{ja:'パン',romaji:'pan',en:'Bread',icon:'🍞'},
 {ja:'ケーキ',romaji:'kēki',en:'Cake',icon:'🍰'},{ja:'アイス',romaji:'aisu',en:'Ice cream',icon:'🍦'},
 {ja:'みず',romaji:'mizu',en:'Water',icon:'💧'},{ja:'おちゃ',romaji:'ocha',en:'Tea',icon:'🍵'},
 {ja:'りんご',romaji:'ringo',en:'Apple',icon:'🍎'},{ja:'バナナ',romaji:'banana',en:'Banana',icon:'🍌'},
 {ja:'いちご',romaji:'ichigo',en:'Strawberry',icon:'🍓'},{ja:'みかん',romaji:'mikan',en:'Mandarin',icon:'🍊'},
 {ja:'メロン',romaji:'meron',en:'Melon',icon:'🍈'},{ja:'トマト',romaji:'tomato',en:'Tomato',icon:'🍅'},
 {ja:'カレー',romaji:'karē',en:'Curry',icon:'🍛'},{ja:'たこやき',romaji:'takoyaki',en:'Takoyaki',icon:'🐙'},
 {ja:'やきとり',romaji:'yakitori',en:'Yakitori',icon:'🍢'},{ja:'てんぷら',romaji:'tenpura',en:'Tempura',icon:'🍤'},
 {ja:'おにぎり',romaji:'onigiri',en:'Rice ball',icon:'🍙'},{ja:'だんご',romaji:'dango',en:'Dango',icon:'🍡'},
 {ja:'ジュース',romaji:'jūsu',en:'Juice',icon:'🧃'},{ja:'こおり',romaji:'kōri',en:'Ice',icon:'🧊'},
 {ja:'しお',romaji:'shio',en:'Salt',icon:'🧂'},{ja:'ぎゅうにゅう',romaji:'gyūnyū',en:'Milk',icon:'🥛'},
 {ja:'ねこ',romaji:'neko',en:'Cat',icon:'🐱'},{ja:'いぬ',romaji:'inu',en:'Dog',icon:'🐶'},
 {ja:'とり',romaji:'tori',en:'Bird',icon:'🐦'},{ja:'さる',romaji:'saru',en:'Monkey',icon:'🐵'},
 {ja:'しか',romaji:'shika',en:'Deer',icon:'🦌'},{ja:'くま',romaji:'kuma',en:'Bear',icon:'🐻'},
 {ja:'うさぎ',romaji:'usagi',en:'Rabbit',icon:'🐰'},{ja:'かめ',romaji:'kame',en:'Turtle',icon:'🐢'},
 {ja:'へび',romaji:'hebi',en:'Snake',icon:'🐍'},{ja:'かえる',romaji:'kaeru',en:'Frog',icon:'🐸'},
 {ja:'ぞう',romaji:'zō',en:'Elephant',icon:'🐘'},{ja:'きつね',romaji:'kitsune',en:'Fox',icon:'🦊'},
 {ja:'たぬき',romaji:'tanuki',en:'Raccoon dog',icon:'🦝'},{ja:'くじら',romaji:'kujira',en:'Whale',icon:'🐳'},
 {ja:'いるか',romaji:'iruka',en:'Dolphin',icon:'🐬'},{ja:'たこ',romaji:'tako',en:'Octopus',icon:'🐙'},
 {ja:'えび',romaji:'ebi',en:'Prawn',icon:'🦐'},{ja:'かに',romaji:'kani',en:'Crab',icon:'🦀'},
 {ja:'ちょう',romaji:'chō',en:'Butterfly',icon:'🦋'},{ja:'はち',romaji:'hachi',en:'Bee',icon:'🐝'},
 {ja:'ねずみ',romaji:'nezumi',en:'Mouse',icon:'🐭'},{ja:'うま',romaji:'uma',en:'Horse',icon:'🐴'},
 {ja:'ぶた',romaji:'buta',en:'Pig',icon:'🐷'},{ja:'ひつじ',romaji:'hitsuji',en:'Sheep',icon:'🐑'},
 {ja:'とら',romaji:'tora',en:'Tiger',icon:'🐯'},{ja:'ライオン',romaji:'raion',en:'Lion',icon:'🦁'},
 {ja:'パンダ',romaji:'panda',en:'Panda',icon:'🐼'},{ja:'でんしゃ',romaji:'densha',en:'Train',icon:'🚃'},
 {ja:'しんかんせん',romaji:'shinkansen',en:'Bullet train',icon:'🚄'},{ja:'バス',romaji:'basu',en:'Bus',icon:'🚌'},
 {ja:'タクシー',romaji:'takushii',en:'Taxi',icon:'🚕'},{ja:'ひこうき',romaji:'hikōki',en:'Aeroplane',icon:'✈️'},
 {ja:'じてんしゃ',romaji:'jitensha',en:'Bicycle',icon:'🚲'},{ja:'ふね',romaji:'fune',en:'Boat',icon:'⛵'},
 {ja:'えき',romaji:'eki',en:'Station',icon:'🚉'},{ja:'みち',romaji:'michi',en:'Road',icon:'🛣️'},
 {ja:'はし',romaji:'hashi',en:'Bridge',icon:'🌉'},{ja:'やま',romaji:'yama',en:'Mountain',icon:'⛰️'},
 {ja:'ふじさん',romaji:'fujisan',en:'Mount Fuji',icon:'🗻'},{ja:'うみ',romaji:'umi',en:'Sea',icon:'🌊'},
 {ja:'かわ',romaji:'kawa',en:'River',icon:'🏞️'},{ja:'もり',romaji:'mori',en:'Forest',icon:'🌲'},
 {ja:'はな',romaji:'hana',en:'Flower',icon:'🌸'},{ja:'さくら',romaji:'sakura',en:'Cherry blossom',icon:'🌸'},
 {ja:'もみじ',romaji:'momiji',en:'Maple leaf',icon:'🍁'},{ja:'たけ',romaji:'take',en:'Bamboo',icon:'🎋'},
 {ja:'いし',romaji:'ishi',en:'Stone',icon:'🪨'},{ja:'そら',romaji:'sora',en:'Sky',icon:'🌌'},
 {ja:'つき',romaji:'tsuki',en:'Moon',icon:'🌙'},{ja:'ほし',romaji:'hoshi',en:'Star',icon:'⭐'},
 {ja:'あめ',romaji:'ame',en:'Rain',icon:'🌧️'},{ja:'ゆき',romaji:'yuki',en:'Snow',icon:'❄️'},
 {ja:'かぜ',romaji:'kaze',en:'Wind',icon:'💨'},{ja:'くも',romaji:'kumo',en:'Cloud',icon:'☁️'},
 {ja:'にじ',romaji:'niji',en:'Rainbow',icon:'🌈'},{ja:'おてら',romaji:'otera',en:'Temple',icon:'🛕'},
 {ja:'じんじゃ',romaji:'jinja',en:'Shrine',icon:'⛩️'},{ja:'とりい',romaji:'torii',en:'Torii gate',icon:'⛩️'},
 {ja:'おしろ',romaji:'oshiro',en:'Castle',icon:'🏯'},{ja:'ホテル',romaji:'hoteru',en:'Hotel',icon:'🏨'},
 {ja:'みせ',romaji:'mise',en:'Shop',icon:'🏪'},{ja:'こうえん',romaji:'kōen',en:'Park',icon:'🏞️'},
 {ja:'おんせん',romaji:'onsen',en:'Hot spring',icon:'♨️'},{ja:'トイレ',romaji:'toire',en:'Toilet',icon:'🚻'},
 {ja:'ほん',romaji:'hon',en:'Book',icon:'📖'},{ja:'かさ',romaji:'kasa',en:'Umbrella',icon:'☂️'},
 {ja:'くつ',romaji:'kutsu',en:'Shoes',icon:'👟'},{ja:'ぼうし',romaji:'bōshi',en:'Hat',icon:'🧢'},
 {ja:'かばん',romaji:'kaban',en:'Bag',icon:'🎒'},{ja:'とけい',romaji:'tokei',en:'Watch',icon:'⌚'},
 {ja:'カメラ',romaji:'kamera',en:'Camera',icon:'📷'},{ja:'でんわ',romaji:'denwa',en:'Telephone',icon:'📞'},
 {ja:'おかね',romaji:'okane',en:'Money',icon:'💴'},{ja:'きっぷ',romaji:'kippu',en:'Ticket',icon:'🎫'},
 {ja:'ちず',romaji:'chizu',en:'Map',icon:'🗺️'},{ja:'てがみ',romaji:'tegami',en:'Letter',icon:'✉️'},
 {ja:'ともだち',romaji:'tomodachi',en:'Friend',icon:'👫'},{ja:'かぞく',romaji:'kazoku',en:'Family',icon:'👨‍👩‍👦'},
 {ja:'こども',romaji:'kodomo',en:'Child',icon:'🧒'},{ja:'せんせい',romaji:'sensei',en:'Teacher',icon:'🧑‍🏫'},
 {ja:'にんじゃ',romaji:'ninja',en:'Ninja',icon:'🥷'},{ja:'さむらい',romaji:'samurai',en:'Samurai',icon:'⚔️'},
 {ja:'すもう',romaji:'sumō',en:'Sumo',icon:'🤼'},{ja:'おりがみ',romaji:'origami',en:'Origami',icon:'📄'},
 {ja:'はなび',romaji:'hanabi',en:'Fireworks',icon:'🎆'},{ja:'まつり',romaji:'matsuri',en:'Festival',icon:'🎊'},
 {ja:'おみやげ',romaji:'omiyage',en:'Souvenir',icon:'🎁'},{ja:'ゆかた',romaji:'yukata',en:'Yukata',icon:'👘'},
 {ja:'きもの',romaji:'kimono',en:'Kimono',icon:'👘'},{ja:'たいこ',romaji:'taiko',en:'Drum',icon:'🥁'},
 // Added on purpose, because without them な, れ, ぬ, る, わ, ろ and の are letters the chain
 // walks into and dies in. る is the famously hard one in a real game and still nearly is.
 {ja:'なす',romaji:'nasu',en:'Aubergine',icon:'🍆'},{ja:'レモン',romaji:'remon',en:'Lemon',icon:'🍋'},
 {ja:'れっしゃ',romaji:'ressha',en:'Train carriage',icon:'🚆'},{ja:'ぬいぐるみ',romaji:'nuigurumi',en:'Soft toy',icon:'🧸'},
 {ja:'ルビー',romaji:'rubii',en:'Ruby',icon:'💎'},{ja:'わたあめ',romaji:'wataame',en:'Candy floss',icon:'🍬'},
 {ja:'ロボット',romaji:'robotto',en:'Robot',icon:'🤖'},{ja:'のり',romaji:'nori',en:'Seaweed',icon:'🍘'},
 // And these are here to keep the chain alive rather than because a child needs to know them
 // first. The list was measured before they were added: seven words led into り and exactly
 // one led back out, so every game strangled on the same letter within four turns.
 {ja:'りす',romaji:'risu',en:'Squirrel',icon:'🐿️'},{ja:'りゅう',romaji:'ryū',en:'Dragon',icon:'🐉'},
 {ja:'リボン',romaji:'ribon',en:'Ribbon',icon:'🎀'},{ja:'きゅうり',romaji:'kyūri',en:'Cucumber',icon:'🥒'},
 {ja:'ひかり',romaji:'hikari',en:'Light',icon:'💡'},{ja:'らくだ',romaji:'rakuda',en:'Camel',icon:'🐫'},
 {ja:'こま',romaji:'koma',en:'Spinning top',icon:'🪀'},{ja:'コアラ',romaji:'koara',en:'Koala',icon:'🐨'},
 {ja:'きって',romaji:'kitte',en:'Stamp',icon:'📮'},{ja:'きのこ',romaji:'kinoko',en:'Mushroom',icon:'🍄'},
 {ja:'すいか',romaji:'suika',en:'Watermelon',icon:'🍉'},{ja:'すな',romaji:'suna',en:'Sand',icon:'🏖️'},
 {ja:'すずめ',romaji:'suzume',en:'Sparrow',icon:'🐦'},{ja:'やさい',romaji:'yasai',en:'Vegetables',icon:'🥬'},
 {ja:'やね',romaji:'yane',en:'Roof',icon:'🏠'},{ja:'しま',romaji:'shima',en:'Island',icon:'🏝️'},
 {ja:'しっぽ',romaji:'shippo',en:'Tail',icon:'🐕'},{ja:'なつ',romaji:'natsu',en:'Summer',icon:'☀️'},
 {ja:'なみ',romaji:'nami',en:'Wave',icon:'🌊'},{ja:'まど',romaji:'mado',en:'Window',icon:'🪟'},
 {ja:'まめ',romaji:'mame',en:'Bean',icon:'🫘'},{ja:'めがね',romaji:'megane',en:'Glasses',icon:'👓'},
 {ja:'めだか',romaji:'medaka',en:'Rice fish',icon:'🐠'},{ja:'わに',romaji:'wani',en:'Crocodile',icon:'🐊'},
 {ja:'けいと',romaji:'keito',en:'Wool',icon:'🧶'},{ja:'けむり',romaji:'kemuri',en:'Smoke',icon:'💨'},
 {ja:'せかい',romaji:'sekai',en:'World',icon:'🌏'},{ja:'せみ',romaji:'semi',en:'Cicada',icon:'🦗'},
 {ja:'ろうそく',romaji:'rōsoku',en:'Candle',icon:'🕯️'},{ja:'つくえ',romaji:'tsukue',en:'Desk',icon:'🪑'},
 // Letters that had exactly one safe word left, so using it turned the letter into a trap and
 // nothing else. る is still down to one, and that is fair: it is the hard letter in a real game.
 {ja:'らっぱ',romaji:'rappa',en:'Trumpet',icon:'🎺'},{ja:'へや',romaji:'heya',en:'Room',icon:'🚪'},
 {ja:'レタス',romaji:'retasu',en:'Lettuce',icon:'🥬'},{ja:'ぬの',romaji:'nuno',en:'Cloth',icon:'🧵'},
 {ja:'ノート',romaji:'nōto',en:'Notebook',icon:'📓'},{ja:'ふくろ',romaji:'fukuro',en:'Bag',icon:'👜'}
].map(w=>({...w,id:w.ja,head:headOf(w.ja),tail:tailOf(w.ja),dead:losesOn(w.ja)}));
export const wordById=id=>WORDS.find(w=>w.id===id);
export const startingWith=letter=>WORDS.filter(w=>w.head===letter);
// The chain opens on the word しりとり itself, which is how it is really started and which
// leaves り as the first letter anybody has to answer.
export const OPENER={id:'しりとり',ja:'しりとり',romaji:'shiritori',en:'Shiritori',icon:'🔗',
 head:headOf('しりとり'),tail:tailOf('しりとり'),dead:false,opener:true};
// Two ways in, and the difference is not how many buttons there are. Nate is matching a letter
// and nothing else, so nothing he can legally pick loses. Boston is playing the actual game,
// where one of the right answers ends in ん and taking it is how you lose.
export const LEVELS=[
 {id:'pictures',ja:'え',romaji:'e',en:'Pictures',choices:4,traps:false,pays:6,
  how:'Four to choose from, every one with a picture, and none of the right ones is a trap. Find the letter.'},
 {id:'words',ja:'ことば',romaji:'kotoba',en:'Words',choices:8,traps:true,pays:11,
  how:'Eight to choose from and no pictures. One of the right ones ends in ん. Take it and you have lost.'}
];
export const levelById=id=>LEVELS.find(l=>l.id===id)||LEVELS[0];
const pick=(list,rand)=>list[Math.floor(rand()*list.length)];
// What is on offer. Always at least one word that really does follow, then a trap if the level
// has them and one exists, then wrong-letter words to fill the rest — and shuffled, so the
// right answer is not the first card every time.
export function optionsFor({used,letter,level,rand}){
 const spec=levelById(level);
 const free=WORDS.filter(w=>!used.includes(w.id));
 const right=free.filter(w=>w.head===letter);
 const safe=right.filter(w=>!w.dead),traps=right.filter(w=>w.dead);
 if(!right.length)return [];
 // On the level without traps, a trap is never offered at all — not even when it is the only
 // word left that fits. Nate is matching a letter; handing him a position whose only legal
 // card loses the game is not a harder puzzle, it is a punishment for playing correctly. When
 // there is nothing safe, the chain runs dry instead, and nobody has lost.
 if(!safe.length&&!spec.traps)return [];
 const out=[];
 if(safe.length)out.push(pick(safe,rand));
 if(spec.traps&&traps.length)out.push(pick(traps,rand));
 else if(!safe.length)out.push(pick(traps,rand));
 const wrong=free.filter(w=>w.head!==letter&&!out.includes(w));
 while(out.length<spec.choices&&wrong.length){
  const one=pick(wrong,rand);
  wrong.splice(wrong.indexOf(one),1);
  out.push(one);
 }
 for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}
// His answer. He never takes a word ending in ん, because he is playing to win; when there is
// nothing left he says so, and saying so is how you beat him.
export function phoneReply({used,letter,rand}){
 const pool=WORDS.filter(w=>!used.includes(w.id)&&w.head===letter&&!w.dead);
 return pool.length?pick(pool,rand):null;
}
// The chain is the score. A longer one is worth more on the harder level, because on the
// harder level every turn was a chance to lose.
export const shiritoriScore=(level,chain)=>Math.max(1,Math.min(9999,chain*levelById(level).pays));
