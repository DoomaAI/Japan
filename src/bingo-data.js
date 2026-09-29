// Japan bingo. The old window I spy was a list for two train rides; this is a card for the whole
// trip, and spotting is only one of the six things on it. Every card has four of each — spot,
// taste, buy, hear, say and collect — so a card cannot be won from a train seat alone, and the
// square in the middle is free because that is how bingo works.
export const BINGO_KINDS=[
 {id:'spot',label:'Spot it',icon:'👀'},
 {id:'taste',label:'Taste it',icon:'😋'},
 {id:'buy',label:'Buy it',icon:'🛍️'},
 {id:'hear',label:'Hear it',icon:'👂'},
 {id:'say',label:'Say it',icon:'🗣️'},
 {id:'collect',label:'Collect it',icon:'🪙'}
];
// `short` is what fits in a square on a phone; the full title is shown when it is opened.
// `parts` are for a square that is really a set: it is only done when every part is ticked, and
// each part can be ticked on a different day. `ja` and `romaji` are what to say, for a say square.
// The window squares keep the old I spy ids, so anything already spotted from the train counts.
export const BINGO_SQUARES=[
 {id:'fuji',kind:'spot',icon:'🗻',title:'Mount Fuji',hint:'From the Shinkansen, about 40 minutes from Tokyo, if the sky is clear.'},
 {id:'passing',kind:'spot',icon:'🚅',title:'A Shinkansen going the other way',short:'Shinkansen passing',hint:'Gone in a blink. Listen for the bang as it passes.'},
 {id:'paddies',kind:'spot',icon:'🌾',title:'Rice fields in neat squares',short:'Rice fields',hint:'Out of the train window. Flat, green and fitted together like tiles.'},
 {id:'torii',kind:'spot',icon:'⛩️',title:'An orange shrine gate',hint:'At a shrine, or out of a train window.'},
 {id:'bow',kind:'spot',icon:'🧹',title:'The Shinkansen cleaners bowing',short:'Cleaners bowing',hint:'They bow to the train before and after they clean it.'},
 {id:'manhole',kind:'spot',icon:'🎨',title:'A manhole cover with a picture on it',short:'Picture manhole',hint:'Every town has its own. Look down.'},
 {id:'mascot',kind:'spot',icon:'🐻',title:'A mascot in a big costume',hint:'Towns, shops and railways all have one.'},
 {id:'wand',kind:'spot',icon:'🚦',title:'A worker waving a light-up wand',short:'Light-up wand',hint:'Road works and car parks. They bow at the cars, too.'},
 {id:'yellowhat',kind:'spot',icon:'🎒',title:'A child in a yellow school hat',short:'Yellow school hat',hint:'Little ones walk to school on their own here.'},
 {id:'deer',kind:'spot',icon:'🦌',title:'A deer bowing',hint:'In Nara. Bow first and some bow back.'},
 {id:'ramen',kind:'taste',icon:'🍜',title:'A bowl of ramen',hint:'Slurping is polite here. Really.'},
 {id:'onigiri',kind:'taste',icon:'🍙',title:'An onigiri from a konbini',hint:'Pull tab 1, then the two sides. The seaweed stays crunchy.'},
 {id:'takoyaki',kind:'taste',icon:'🐙',title:'Takoyaki',hint:'Octopus balls. Very hot in the middle, so wait.'},
 {id:'sushi',kind:'taste',icon:'🍣',title:'Sushi off a moving belt',hint:'The colour of the plate is the price.'},
 {id:'mochi',kind:'taste',icon:'🍡',title:'Mochi or dango',hint:'Soft and chewy rice cake. Small bites.'},
 {id:'melonpan',kind:'taste',icon:'🍈',title:'Melon pan',hint:'A sweet bun with a crackly top. No melon in it, usually.'},
 {id:'matcha',kind:'taste',icon:'🍵',title:'Something matcha',hint:'Green tea ice cream, a Kit Kat, a latte — anything green.'},
 {id:'taiyaki',kind:'taste',icon:'🐟',title:'Taiyaki',hint:'A fish-shaped cake with sweet filling. Head or tail first?'},
 {id:'softserve',kind:'taste',icon:'🍦',title:'A soft serve in a strange flavour',short:'Odd soft serve',hint:'Sweet potato, black sesame, soy sauce…'},
 {id:'newdrink',kind:'taste',icon:'🥤',title:'A drink you have never seen before',short:'A brand new drink',hint:'Ramune with the marble, Calpis, or something from a machine.'},
 {id:'vending',kind:'buy',icon:'🥫',title:'A drink from a vending machine',short:'Vending machine drink',hint:'Blue labels are cold, red labels are hot.'},
 {id:'gachapon',kind:'buy',icon:'🎰',title:'A gachapon capsule toy',hint:'Coins in, turn the handle, see what comes out.'},
 {id:'konbini',kind:'buy',icon:'🏪',title:'Pay at a konbini all by yourself',short:'Pay at a konbini',hint:'Put the money in the little tray, not in their hand.'},
 {id:'iccard',kind:'buy',icon:'💳',title:'Tap your own IC card on a gate',short:'Tap your IC card',hint:'Tap and keep walking. It beeps.'},
 {id:'keyring',kind:'buy',icon:'🔑',title:'A keyring to take home',hint:'Every station and temple sells one.'},
 {id:'snackforhome',kind:'buy',icon:'🍘',title:'A snack to share at home',hint:'Something nobody in Australia has tried.'},
 {id:'ticket',kind:'buy',icon:'🎫',title:'A ticket from a machine',hint:'Press the English button first.'},
 {id:'ekiben',kind:'buy',icon:'🍱',title:'A bento for the train',hint:'Station bento shops. Eat it on board.'},
 {id:'irasshaimase',kind:'hear',icon:'🙌',title:'“Irasshaimase!” as you walk in',short:'“Irasshaimase!”',hint:'Welcome! Shouted by everyone in the shop at once.'},
 {id:'jingle',kind:'hear',icon:'🎶',title:'A station’s own departure tune',short:'Station tune',hint:'Each station plays its own little song before the doors close.'},
 {id:'templebell',kind:'hear',icon:'🔔',title:'A big temple bell',hint:'Deep, slow and you feel it in your chest.'},
 {id:'crossing',kind:'hear',icon:'🚸',title:'A level crossing going kan-kan',short:'Crossing kan‑kan',hint:'The crossing bell. Stand back behind the bar.'},
 {id:'toilet',kind:'hear',icon:'🚽',title:'A toilet that plays a sound',short:'Musical toilet',hint:'Look for the button with a musical note.'},
 {id:'fryer',kind:'hear',icon:'🍤',title:'Tempura sizzling in a kitchen',short:'Tempura sizzle',hint:'Sit at a counter and listen.'},
 {id:'announce',kind:'hear',icon:'📢',title:'A train announcement in English',short:'English announcement',hint:'Listen for “The next station is…”.'},
 {id:'clap',kind:'hear',icon:'👏',title:'Two claps at a shrine',hint:'Bow twice, clap twice, bow once.'},
 {id:'konnichiwa',kind:'say',icon:'👋',title:'Say hello',ja:'こんにちは',romaji:'kon-nee-chee-wa',hint:'To anyone who helps you.'},
 {id:'arigato',kind:'say',icon:'🙏',title:'Say thank you',ja:'ありがとうございます',romaji:'a-ree-ga-toh go-zai-mas',hint:'To a shop assistant or a waiter.'},
 {id:'itadakimasu',kind:'say',icon:'🥢',title:'Say it before you eat',ja:'いただきます',romaji:'ee-ta-da-kee-mas',hint:'Hands together first.'},
 {id:'gochisousama',kind:'say',icon:'😋',title:'Say it after you eat',ja:'ごちそうさまでした',romaji:'go-chee-soh-sa-ma de-shta',hint:'To the cook, on the way out.'},
 {id:'sumimasen',kind:'say',icon:'🙋',title:'Say excuse me',ja:'すみません',romaji:'soo-mee-ma-sen',hint:'To get past, or to call a waiter.'},
 {id:'kore',kind:'say',icon:'👉',title:'Order by pointing: “This one, please”',short:'“This one, please”',ja:'これをください',romaji:'ko-reh oh koo-da-sai',hint:'Point at the picture as you say it.'},
 {id:'oishii',kind:'say',icon:'🤤',title:'Tell someone it is delicious',short:'Say it is delicious',ja:'おいしい',romaji:'oy-shee',hint:'The cook will be very pleased.'},
 {id:'ohayo',kind:'say',icon:'🌅',title:'Say good morning',ja:'おはようございます',romaji:'oh-ha-yoh go-zai-mas',hint:'At the hotel, at breakfast.'},
 {id:'coins',kind:'collect',icon:'🪙',title:'Every coin',hint:'Six of them. The ¥5 and ¥50 have holes in the middle.',
  parts:[{id:'1',label:'¥1'},{id:'5',label:'¥5'},{id:'10',label:'¥10'},{id:'50',label:'¥50'},{id:'100',label:'¥100'},{id:'500',label:'¥500'}]},
 {id:'notes',kind:'collect',icon:'💴',title:'Every note',hint:'Hold one up to the light to see the hidden face.',
  parts:[{id:'1000',label:'¥1,000'},{id:'5000',label:'¥5,000'},{id:'10000',label:'¥10,000'}]},
 {id:'stationstamp',kind:'collect',icon:'🖋️',title:'Three station stamps',hint:'Stamp stands sit near the ticket gates.',
  parts:[{id:'1',label:'One'},{id:'2',label:'Two'},{id:'3',label:'Three'}]},
 {id:'omikuji',kind:'collect',icon:'📜',title:'A fortune from a shrine',hint:'Bad luck? Tie it to the rack and leave it behind.'},
 {id:'goshuin',kind:'collect',icon:'⛩️',title:'A temple or shrine seal',hint:'Written by hand in a little book. Ask at the office.'},
 {id:'oldticket',kind:'collect',icon:'🎟️',title:'A used ticket to keep',hint:'Ask at the gate. They will stamp it for you.'},
 {id:'receipt',kind:'collect',icon:'🧾',title:'A receipt in Japanese',hint:'Find one word you can read on it.'},
 {id:'leaf',kind:'collect',icon:'🍁',title:'A leaf from a temple garden',short:'A temple leaf',hint:'One that has already fallen. Press it in a book.'}
];
export const FREE='free';
export const CARD_SIZE=5,CARD_SQUARES=CARD_SIZE*CARD_SIZE-1,PER_KIND=CARD_SQUARES/BINGO_KINDS.length;
export const findSquare=id=>BINGO_SQUARES.find(s=>s.id===id)||null;
export const kindOf=id=>BINGO_KINDS.find(k=>k.id===id)||BINGO_KINDS[0];
// The same seed always deals the same card, so a card a phone worked out on its own with no
// signal is the same one the other phones see.
function shuffled(list,seed){
 let n=(seed>>>0)||1;const next=()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};
 const out=[...list];
 for(let i=out.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}
const seedOf=text=>{let h=2166136261>>>0;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;};
// Four of each kind, laid out at random. Squares already done are dealt last, so a second card
// is a new card and not the old one shuffled: they are only used when a kind has run out.
export function dealCard(person,round=1,done=new Set()){
 const seed=seedOf(`${person}|${round}`);
 const picks=BINGO_KINDS.flatMap((k,i)=>{
  const pool=shuffled(BINGO_SQUARES.filter(s=>s.kind===k.id),seed+i);
  return [...pool.filter(s=>!done.has(s.id)),...pool.filter(s=>done.has(s.id))].slice(0,PER_KIND).map(s=>s.id);
 });
 const ids=shuffled(picks,seed+99),mid=Math.floor(CARD_SQUARES/2);
 return [...ids.slice(0,mid),FREE,...ids.slice(mid)];
}
export const validCard=ids=>Array.isArray(ids)&&ids.length===CARD_SQUARES&&new Set(ids).size===ids.length&&ids.every(id=>findSquare(id));
// Everything one person has ticked, whichever card it was on. A square stays done on a new card
// because the ramen was still eaten; the new card is dealt from the squares not done yet.
export const bingoOf=(state,person)=>state.bingo?.[person]||{round:1,card:null,done:{}};
const partKey=(id,part)=>`${id}:${part}`;
export function partDone(state,person,id,part){return !!bingoOf(state,person).done?.[partKey(id,part)];}
export function squareDone(state,person,id){
 if(id===FREE)return true;
 const s=findSquare(id);if(!s)return false;
 const done=bingoOf(state,person).done||{};
 if(s.parts)return s.parts.every(p=>done[partKey(id,p.id)]);
 if(done[id])return true;
 // Spotted from the train before this card existed: any leg counts.
 return Object.entries(state.eyeSpy||{}).some(([key,who])=>key.endsWith(`|${id}`)&&who?.[person]);
}
export const partsDone=(state,person,s)=>s.parts?s.parts.filter(p=>partDone(state,person,s.id,p.id)).length:0;
export function cardFor(state,person){
 const b=bingoOf(state,person);
 if(b.card&&b.card.length===CARD_SQUARES)return [...b.card.slice(0,CARD_SQUARES/2),FREE,...b.card.slice(CARD_SQUARES/2)];
 return dealCard(person,b.round||1);
}
// Five rows, five columns and the two diagonals.
export const LINES=[
 ...Array.from({length:CARD_SIZE},(_,r)=>Array.from({length:CARD_SIZE},(_,c)=>r*CARD_SIZE+c)),
 ...Array.from({length:CARD_SIZE},(_,c)=>Array.from({length:CARD_SIZE},(_,r)=>r*CARD_SIZE+c)),
 Array.from({length:CARD_SIZE},(_,i)=>i*CARD_SIZE+i),
 Array.from({length:CARD_SIZE},(_,i)=>i*CARD_SIZE+(CARD_SIZE-1-i))
];
export function cardScore(state,person){
 const card=cardFor(state,person),ticked=card.map(id=>squareDone(state,person,id));
 const lines=LINES.filter(line=>line.every(i=>ticked[i]));
 return {card,ticked,lines,count:ticked.filter(Boolean).length-1,full:ticked.every(Boolean),
  inLine:new Set(lines.flat())};
}
// For the stamp book: how many squares a person has done, on any card.
export const bingoCount=(state,person)=>BINGO_SQUARES.filter(s=>squareDone(state,person,s.id)).length;
// The next card for a person, from the squares they have not done yet.
export function nextCard(state,person){
 const b=bingoOf(state,person),round=(b.round||1)+1;
 const done=new Set(BINGO_SQUARES.filter(s=>squareDone(state,person,s.id)).map(s=>s.id));
 return {round,card:dealCard(person,round,done).filter(id=>id!==FREE)};
}
