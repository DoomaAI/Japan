// Hanafuda — 花札, "flower cards". Forty-eight cards, twelve months, four cards a month, and
// the month is the only thing that matters when you are matching: you take a card off the table
// with one from the same month. What the cards are worth is a separate question, and that is
// where the game is.
//
// The game here is こいこい (koi-koi), the two-handed one. It teaches the twelve months and the
// flower that belongs to each, which is worth knowing on a trip where half the place names and
// half the sweets are named after them.
//
// Four kinds of card. Five brights, nine animals, ten ribbons, and twenty-four plains, which is
// forty-eight — a test counts them, because a hanafuda deck with the wrong number of anything
// is a scoring system that quietly lies.
export const HIKARI='hikari',TANE='tane',TAN='tan',KASU='kasu';
export const MONTHS=[
 {m:1,ja:'松',romaji:'matsu',en:'Pine'},{m:2,ja:'梅',romaji:'ume',en:'Plum'},
 {m:3,ja:'桜',romaji:'sakura',en:'Cherry'},{m:4,ja:'藤',romaji:'fuji',en:'Wisteria'},
 {m:5,ja:'菖蒲',romaji:'ayame',en:'Iris'},{m:6,ja:'牡丹',romaji:'botan',en:'Peony'},
 {m:7,ja:'萩',romaji:'hagi',en:'Bush clover'},{m:8,ja:'芒',romaji:'susuki',en:'Pampas grass'},
 {m:9,ja:'菊',romaji:'kiku',en:'Chrysanthemum'},{m:10,ja:'紅葉',romaji:'momiji',en:'Maple'},
 {m:11,ja:'柳',romaji:'yanagi',en:'Willow'},{m:12,ja:'桐',romaji:'kiri',en:'Paulownia'}
];
export const monthOf=m=>MONTHS.find(x=>x.m===m);
// The deck. A card is its month and its kind; the named ones also carry what is painted on
// them, because those are the ones the scoring combinations are made of.
const card=(m,kind,tag,en)=>({id:`${m}-${tag||kind}`,m,kind,tag:tag||null,en:en||null});
const plains=(m,n)=>[...Array(n)].map((_,i)=>({id:`${m}-kasu${i+1}`,m,kind:KASU,tag:null,en:null}));
export const DECK=[
 card(1,HIKARI,'crane','Crane'),card(1,TAN,'poetry','Red poetry ribbon'),...plains(1,2),
 card(2,TANE,'warbler','Bush warbler'),card(2,TAN,'poetry','Red poetry ribbon'),...plains(2,2),
 card(3,HIKARI,'curtain','Curtain'),card(3,TAN,'poetry','Red poetry ribbon'),...plains(3,2),
 card(4,TANE,'cuckoo','Cuckoo'),card(4,TAN,'red','Red ribbon'),...plains(4,2),
 card(5,TANE,'bridge','Eight-plank bridge'),card(5,TAN,'red','Red ribbon'),...plains(5,2),
 card(6,TANE,'butterfly','Butterflies'),card(6,TAN,'blue','Blue ribbon'),...plains(6,2),
 card(7,TANE,'boar','Boar'),card(7,TAN,'red','Red ribbon'),...plains(7,2),
 card(8,HIKARI,'moon','Full moon'),card(8,TANE,'geese','Geese'),...plains(8,2),
 card(9,TANE,'sake','Sake cup'),card(9,TAN,'blue','Blue ribbon'),...plains(9,2),
 card(10,TANE,'deer','Deer'),card(10,TAN,'blue','Blue ribbon'),...plains(10,2),
 card(11,HIKARI,'rainman','The man with the umbrella'),card(11,TANE,'swallow','Swallow'),
  card(11,TAN,'plain','Plain ribbon'),...plains(11,1),
 card(12,HIKARI,'phoenix','Phoenix'),...plains(12,3)
];
export const cardById=id=>DECK.find(c=>c.id===id);
const has=(pile,tag)=>pile.some(c=>c.tag===tag);
const count=(pile,kind)=>pile.filter(c=>c.kind===kind).length;
const brights=pile=>pile.filter(c=>c.kind===HIKARI);
// The scoring combinations. These are the real ones and the real values, including the two that
// everybody gets wrong: four brights is only four brights if the man with the umbrella is not
// one of them, and with him it is worth less.
export const YAKU=[
 {id:'goko',ja:'五光',romaji:'gokō',en:'Five brights',points:10,
  when:p=>brights(p).length===5},
 {id:'shiko',ja:'四光',romaji:'shikō',en:'Four brights',points:8,
  when:p=>brights(p).length===4&&!has(p,'rainman')},
 {id:'ameshiko',ja:'雨四光',romaji:'ame-shikō',en:'Rainy four brights',points:7,
  when:p=>brights(p).length===4&&has(p,'rainman')},
 {id:'sanko',ja:'三光',romaji:'sankō',en:'Three brights',points:5,
  when:p=>brights(p).length===3&&!has(p,'rainman')},
 {id:'inoshikacho',ja:'猪鹿蝶',romaji:'ino-shika-chō',en:'Boar, deer and butterfly',points:5,
  when:p=>has(p,'boar')&&has(p,'deer')&&has(p,'butterfly')},
 {id:'akatan',ja:'赤短',romaji:'akatan',en:'Three poetry ribbons',points:5,
  when:p=>p.filter(c=>c.tag==='poetry').length===3},
 {id:'aotan',ja:'青短',romaji:'aotan',en:'Three blue ribbons',points:5,
  when:p=>p.filter(c=>c.tag==='blue').length===3},
 {id:'hanami',ja:'花見で一杯',romaji:'hanami-zake',en:'A drink under the blossom',points:5,
  when:p=>has(p,'curtain')&&has(p,'sake')},
 {id:'tsukimi',ja:'月見で一杯',romaji:'tsukimi-zake',en:'A drink under the moon',points:5,
  when:p=>has(p,'moon')&&has(p,'sake')},
 {id:'tane',ja:'種',romaji:'tane',en:'Five animals',points:1,extra:p=>count(p,TANE)-5,
  when:p=>count(p,TANE)>=5},
 {id:'tan',ja:'短冊',romaji:'tanzaku',en:'Five ribbons',points:1,extra:p=>count(p,TAN)-5,
  when:p=>count(p,TAN)>=5},
 {id:'kasu',ja:'カス',romaji:'kasu',en:'Ten plains',points:1,extra:p=>count(p,KASU)-10,
  when:p=>count(p,KASU)>=10}
];
// What a pile is worth. The bright combinations do not stack with each other — five brights is
// five brights, not five plus four plus three — so only the best one of those counts.
const BRIGHT_SET=['goko','shiko','ameshiko','sanko'];
export function scoreOf(pile){
 const made=YAKU.filter(y=>y.when(pile)).map(y=>({...y,points:y.points+(y.extra?Math.max(0,y.extra(pile)):0)}));
 const best=made.filter(y=>BRIGHT_SET.includes(y.id)).sort((a,b)=>b.points-a.points)[0];
 const kept=made.filter(y=>!BRIGHT_SET.includes(y.id));
 return {yaku:best?[best,...kept]:kept,points:(best?best.points:0)+kept.reduce((s,y)=>s+y.points,0)};
}
export const shuffle=(list,rand)=>{
 const out=[...list];
 for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
};
export const matches=(card,table)=>table.filter(t=>t.m===card.m);
// こいこい, played two-handed. Eight cards each, eight face up, the rest in the deck.
//
// A turn is always the same two beats: play one from your hand, then turn one off the deck,
// and each of them either takes a card of its own month off the table or joins it. If you have
// finished a new combination by the end of that, you decide — stop and take what it is worth,
// or say koi-koi and keep going for more, which is the whole game and the reason it is named
// after that word.
export const HAND=8,TABLE=8;
export function deal(rand=Math.random){
 const deck=shuffle(DECK,rand);
 return {
  deck:deck.slice(HAND*2+TABLE),
  table:deck.slice(HAND*2,HAND*2+TABLE),
  hands:{me:deck.slice(0,HAND),them:deck.slice(HAND,HAND*2)},
  piles:{me:[],them:[]},claimed:{me:0,them:0},koi:0,
  turn:'me',phase:'hand',pending:null,last:null,over:null
 };
}
export const other=who=>who==='me'?'them':'me';
// Every koi-koi anybody calls doubles what the round finally pays, which is what makes saying
// it a gamble rather than a free go.
export const payout=(points,koi)=>points*Math.pow(2,koi);
const take=(state,who,cards)=>({...state,piles:{...state.piles,[who]:[...state.piles[who],...cards]}});
// Putting one card down: it takes a card of its own month off the table, or it joins the table.
function lay(state,who,card,pickId){
 const opts=matches(card,state.table);
 if(!opts.length)return {...state,table:[...state.table,card],last:{card,took:null}};
 const picked=opts.find(c=>c.id===pickId)||opts[0];
 const next=take({...state,table:state.table.filter(c=>c.id!==picked.id)},who,[card,picked]);
 return {...next,last:{card,took:picked}};
}
// What a card is worth to somebody holding it, used by him for choosing and by nobody else.
const VALUE={[HIKARI]:12,[TANE]:5,[TAN]:4,[KASU]:1};
export const worthOf=card=>VALUE[card.kind]+(['boar','deer','butterfly','sake','poetry','blue'].includes(card.tag)?3:0);
// One whole turn, as far as it can go without asking anybody anything. It stops and asks when
// a card could take either of two on the table, because in a real game that is your choice.
export function step(state,choice){
 if(state.over)return state;
 const who=state.turn;
 if(state.phase==='hand'){
  const card=state.hands[who].find(c=>c.id===choice?.cardId);
  if(!card)return state;
  const opts=matches(card,state.table);
  if(opts.length>1&&!choice?.pickId)
   return {...state,pending:{card,options:opts,from:'hand'}};
  const after=lay({...state,hands:{...state.hands,[who]:state.hands[who].filter(c=>c.id!==card.id)}},
   who,card,choice?.pickId);
  return flip({...after,pending:null});
 }
 if(state.phase==='deck'&&state.pending){
  const after=lay({...state,deck:state.deck.slice(1)},who,state.pending.card,choice?.pickId);
  return settle({...after,pending:null});
 }
 return state;
}
// The second beat: turn one off the deck.
function flip(state){
 const who=state.turn;
 if(!state.deck.length)return settle({...state,phase:'deck'});
 const card=state.deck[0];
 const opts=matches(card,state.table);
 if(opts.length>1)return {...state,phase:'deck',pending:{card,options:opts,from:'deck'}};
 const after=lay({...state,deck:state.deck.slice(1)},who,card,opts[0]?.id);
 return settle(after);
}
// End of the turn: has he finished anything new, and if so does he stop or say koi-koi?
function settle(state){
 const who=state.turn;
 const {points}=scoreOf(state.piles[who]);
 if(points>state.claimed[who])return {...state,phase:'decide',pending:null};
 return pass({...state,phase:'hand',pending:null});
}
const pass=state=>{
 const empty=!state.hands.me.length&&!state.hands.them.length;
 if(empty)return {...state,phase:'over',over:{winner:null,points:0,how:'ranOut'}};
 return {...state,turn:other(state.turn),phase:'hand'};
};
// Stopping takes what your pile is worth, doubled once for every koi-koi called in the round.
export const stop=state=>{
 const who=state.turn;
 const {points,yaku}=scoreOf(state.piles[who]);
 return {...state,phase:'over',over:{winner:who,points:payout(points,state.koi),raw:points,yaku,how:'stopped'}};
};
// Saying it banks nothing, doubles the stakes for whoever does stop, and hands the turn over.
export const koikoi=state=>{
 const who=state.turn;
 const {points}=scoreOf(state.piles[who]);
 return pass({...state,koi:state.koi+1,claimed:{...state.claimed,[who]:points},phase:'hand'});
};
// His turn. He takes the most valuable card he can, prefers one that finishes something, and
// throws away his least useful card when nothing matches.
export function hisMove(state,rand=Math.random){
 const hand=state.hands.them;
 const scored=hand.map(card=>{
  const opts=matches(card,state.table);
  if(!opts.length)return {cardId:card.id,pickId:null,value:-worthOf(card)};
  const best=[...opts].sort((a,b)=>{
   const after=[...state.piles.them,card,b];
   const before=[...state.piles.them,card,a];
   return (scoreOf(after).points-scoreOf(before).points)||(worthOf(b)-worthOf(a));
  })[0];
  const gain=scoreOf([...state.piles.them,card,best]).points-scoreOf(state.piles.them).points;
  return {cardId:card.id,pickId:best.id,value:worthOf(best)+worthOf(card)*0.4+gain*20};
 }).sort((a,b)=>b.value-a.value||(rand()-0.5));
 return scored[0];
}
// Whether he says it. He keeps going while there is plenty of deck left and what he has is
// not worth much, and takes the money once it is.
export const heStops=(state)=>{
 const {points}=scoreOf(state.piles.them);
 const left=state.deck.length;
 return payout(points,state.koi)>=6||left<8||state.koi>=3;
};
