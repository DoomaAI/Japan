// Hiragana and katakana, and the loanwords that make katakana worth learning first: a
// Japanese menu writes every foreign word in it, so a child who can read カレー can order.
export const HIRAGANA=[
 ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],
 ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],
 ['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so'],
 ['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to'],
 ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],
 ['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho'],
 ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],
 ['や','ya'],['ゆ','yu'],['よ','yo'],
 ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
 ['わ','wa'],['を','wo'],['ん','n']
].map(([kana,romaji])=>({kana,romaji,set:'hiragana'}));
export const KATAKANA=[
 ['ア','a'],['イ','i'],['ウ','u'],['エ','e'],['オ','o'],
 ['カ','ka'],['キ','ki'],['ク','ku'],['ケ','ke'],['コ','ko'],
 ['サ','sa'],['シ','shi'],['ス','su'],['セ','se'],['ソ','so'],
 ['タ','ta'],['チ','chi'],['ツ','tsu'],['テ','te'],['ト','to'],
 ['ナ','na'],['ニ','ni'],['ヌ','nu'],['ネ','ne'],['ノ','no'],
 ['ハ','ha'],['ヒ','hi'],['フ','fu'],['ヘ','he'],['ホ','ho'],
 ['マ','ma'],['ミ','mi'],['ム','mu'],['メ','me'],['モ','mo'],
 ['ヤ','ya'],['ユ','yu'],['ヨ','yo'],
 ['ラ','ra'],['リ','ri'],['ル','ru'],['レ','re'],['ロ','ro'],
 ['ワ','wa'],['ヲ','wo'],['ン','n']
].map(([kana,romaji])=>({kana,romaji,set:'katakana'}));
export const KANA=[...HIRAGANA,...KATAKANA];
// Real words off real menus, signs and vending machines. Every one of these is a foreign
// word written in katakana, which is why it can be sounded out rather than learned.
export const LOANWORDS=[
 {ja:'コーヒー',romaji:'kōhii',en:'Coffee',where:'Every café and vending machine.'},
 {ja:'ジュース',romaji:'jūsu',en:'Juice',where:''},
 {ja:'ミルク',romaji:'miruku',en:'Milk',where:''},
 {ja:'コーラ',romaji:'kōra',en:'Cola',where:'Vending machines everywhere.'},
 {ja:'アイス',romaji:'aisu',en:'Ice cream',where:'Short for アイスクリーム.'},
 {ja:'アイスクリーム',romaji:'aisukurīmu',en:'Ice cream',where:''},
 {ja:'チョコレート',romaji:'chokorēto',en:'Chocolate',where:''},
 {ja:'ケーキ',romaji:'kēki',en:'Cake',where:''},
 {ja:'パン',romaji:'pan',en:'Bread',where:'A bakery is a パン屋.'},
 {ja:'カレー',romaji:'karē',en:'Curry',where:'On nearly every family menu.'},
 {ja:'ラーメン',romaji:'rāmen',en:'Ramen',where:''},
 {ja:'ハンバーガー',romaji:'hanbāgā',en:'Hamburger',where:''},
 {ja:'ピザ',romaji:'piza',en:'Pizza',where:''},
 {ja:'サンドイッチ',romaji:'sandoitchi',en:'Sandwich',where:'Convenience stores.'},
 {ja:'サラダ',romaji:'sarada',en:'Salad',where:''},
 {ja:'スープ',romaji:'sūpu',en:'Soup',where:''},
 {ja:'パスタ',romaji:'pasuta',en:'Pasta',where:''},
 {ja:'ステーキ',romaji:'sutēki',en:'Steak',where:''},
 {ja:'チキン',romaji:'chikin',en:'Chicken',where:''},
 {ja:'ポテト',romaji:'poteto',en:'Chips / potato',where:'フライドポテト is hot chips.'},
 {ja:'チーズ',romaji:'chīzu',en:'Cheese',where:''},
 {ja:'ヨーグルト',romaji:'yōguruto',en:'Yoghurt',where:''},
 {ja:'バナナ',romaji:'banana',en:'Banana',where:''},
 {ja:'オレンジ',romaji:'orenji',en:'Orange',where:''},
 {ja:'メロン',romaji:'meron',en:'Melon',where:''},
 {ja:'トマト',romaji:'tomato',en:'Tomato',where:''},
 {ja:'トイレ',romaji:'toire',en:'Toilet',where:'The most useful word on this list.'},
 {ja:'ホテル',romaji:'hoteru',en:'Hotel',where:''},
 {ja:'バス',romaji:'basu',en:'Bus',where:''},
 {ja:'タクシー',romaji:'takushii',en:'Taxi',where:''},
 {ja:'エレベーター',romaji:'erebētā',en:'Lift',where:'On the button panel.'},
 {ja:'エスカレーター',romaji:'esukarētā',en:'Escalator',where:''},
 {ja:'レストラン',romaji:'resutoran',en:'Restaurant',where:''},
 {ja:'スーパー',romaji:'sūpā',en:'Supermarket',where:''},
 {ja:'コンビニ',romaji:'konbini',en:'Convenience store',where:'7-Eleven, Lawson, FamilyMart.'},
 {ja:'カメラ',romaji:'kamera',en:'Camera',where:''},
 {ja:'ゲーム',romaji:'gēmu',en:'Game',where:'Game arcades are ゲームセンター.'},
 {ja:'アニメ',romaji:'anime',en:'Anime',where:''},
 {ja:'ポケモン',romaji:'pokemon',en:'Pokémon',where:''},
 {ja:'チケット',romaji:'chiketto',en:'Ticket',where:''}
];
// A round of the match game: a handful of pairs, shuffled, from a seed so every phone that
// opens the same round sees the same board.
export function shuffled(list,seed){
 const out=[...list];
 let n=seed>>>0||1;
 const next=()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};
 for(let i=out.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}
// The three throws of janken, with what you actually call out as you throw.
export const THROWS=[
 {id:'rock',ja:'グー',romaji:'gū',say:'goo',icon:'✊',beats:'scissors'},
 {id:'scissors',ja:'チョキ',romaji:'choki',say:'cho-kee',icon:'✌️',beats:'paper'},
 {id:'paper',ja:'パー',romaji:'pā',say:'pah',icon:'✋',beats:'rock'}
];
export const findThrow=id=>THROWS.find(t=>t.id===id)||null;
// Who won, given two throws. Null means a draw — in Japan you throw again, calling あいこでしょ.
export function jankenWinner(a,b){
 if(!findThrow(a)||!findThrow(b))return undefined;
 if(a===b)return null;
 return findThrow(a).beats===b?'a':'b';
}
// The merge ladder: two of the same become the next one up. It climbs from a rice ball to
// Fuji, so a boy who gets to the top has built the whole trip out of snacks.
export const MERGE_LADDER=[
 {value:2,icon:'🍙',en:'Onigiri',ja:'おにぎり'},
 {value:4,icon:'🍡',en:'Dango',ja:'だんご'},
 {value:8,icon:'🍜',en:'Ramen',ja:'ラーメン'},
 {value:16,icon:'🍣',en:'Sushi',ja:'すし'},
 {value:32,icon:'🍁',en:'Maple leaf',ja:'もみじ'},
 {value:64,icon:'🌸',en:'Cherry blossom',ja:'さくら'},
 {value:128,icon:'⛩️',en:'Torii gate',ja:'とりい'},
 {value:256,icon:'🦌',en:'Nara deer',ja:'しか'},
 {value:512,icon:'🏯',en:'Castle',ja:'しろ'},
 {value:1024,icon:'🚅',en:'Shinkansen',ja:'しんかんせん'},
 {value:2048,icon:'🗻',en:'Mount Fuji',ja:'ふじさん'}
];
export const mergeTile=value=>MERGE_LADDER.find(t=>t.value===value)||null;
export const MERGE_SIZE=4;
export const emptyBoard=()=>Array(MERGE_SIZE*MERGE_SIZE).fill(0);
const rows=board=>Array.from({length:MERGE_SIZE},(_,r)=>board.slice(r*MERGE_SIZE,r*MERGE_SIZE+MERGE_SIZE));
const flat=rows_=>rows_.flat();
// Slide one line towards the start, merging each pair once. Returns the line and what it scored.
export function slideLine(line){
 const kept=line.filter(Boolean);
 const out=[];let gained=0;
 for(let i=0;i<kept.length;i++){
  if(kept[i]===kept[i+1]&&kept[i]*2<=2048){out.push(kept[i]*2);gained+=kept[i]*2;i++;}
  else out.push(kept[i]);
 }
 while(out.length<MERGE_SIZE)out.push(0);
 return {line:out,gained};
}
const turn=board=>{const r=rows(board);return flat(r[0].map((_,c)=>r.map(row=>row[c])));};
const mirror=board=>flat(rows(board).map(row=>[...row].reverse()));
// Left, right, up and down all become "slide every row left" on a turned or mirrored board.
export function slide(board,direction){
 let work=board,gained=0;
 if(direction==='right')work=mirror(work);
 else if(direction==='up')work=turn(work);
 else if(direction==='down')work=mirror(turn(work));
 const moved=rows(work).map(row=>{const {line,gained:g}=slideLine(row);gained+=g;return line;});
 work=flat(moved);
 if(direction==='right')work=mirror(work);
 else if(direction==='up')work=turn(work);
 else if(direction==='down')work=turn(mirror(work));
 return {board:work,gained,changed:work.some((v,i)=>v!==board[i])};
}
// A new tile lands on a free square, chosen from the seed so a board can be replayed.
export function addTile(board,seed){
 const free=board.map((v,i)=>v?-1:i).filter(i=>i>=0);
 if(!free.length)return board;
 const n=(seed>>>0)||1,pick=free[n%free.length];
 const next=[...board];next[pick]=n%10===0?4:2;
 return next;
}
export const canMove=board=>board.some(v=>!v)||['left','up'].some(d=>slide(board,d).changed);
export const bestTile=board=>Math.max(0,...board);
// Things you actually see in Japan, for a picture memory game. Emoji rather than image files,
// so the whole thing works with no signal and adds nothing to download.
export const SIGHTS=[
 {id:'torii',icon:'⛩️',en:'Torii gate',ja:'とりい'},
 {id:'fuji',icon:'🗻',en:'Mount Fuji',ja:'ふじさん'},
 {id:'shinkansen',icon:'🚅',en:'Shinkansen',ja:'しんかんせん'},
 {id:'sushi',icon:'🍣',en:'Sushi',ja:'すし'},
 {id:'ramen',icon:'🍜',en:'Ramen',ja:'ラーメン'},
 {id:'onigiri',icon:'🍙',en:'Rice ball',ja:'おにぎり'},
 {id:'deer',icon:'🦌',en:'Nara deer',ja:'しか'},
 {id:'cat',icon:'🐱',en:'Lucky cat',ja:'まねきねこ'},
 {id:'lantern',icon:'🏮',en:'Paper lantern',ja:'ちょうちん'},
 {id:'blossom',icon:'🌸',en:'Cherry blossom',ja:'さくら'},
 {id:'castle',icon:'🏯',en:'Castle',ja:'しろ'},
 {id:'kimono',icon:'👘',en:'Kimono',ja:'きもの'},
 {id:'bamboo',icon:'🎋',en:'Bamboo',ja:'たけ'},
 {id:'tea',icon:'🍵',en:'Green tea',ja:'おちゃ'},
 {id:'dango',icon:'🍡',en:'Dango',ja:'だんご'},
 {id:'fan',icon:'🎏',en:'Carp streamer',ja:'こいのぼり'},
 {id:'octopus',icon:'🐙',en:'Takoyaki octopus',ja:'たこ'},
 {id:'bath',icon:'♨️',en:'Hot spring',ja:'おんせん'}
];
// Two things make a third. A recipe book rather than a physics engine, so it works offline
// and a five-year-old can be told what he has just made.
export const ELEMENTS=[
 {id:'rice',icon:'🌾',en:'Rice',ja:'こめ',start:true},
 {id:'water',icon:'💧',en:'Water',ja:'みず',start:true},
 {id:'fire',icon:'🔥',en:'Fire',ja:'ひ',start:true},
 {id:'fish',icon:'🐟',en:'Fish',ja:'さかな',start:true},
 {id:'bean',icon:'🫘',en:'Soy bean',ja:'だいず',start:true},
 {id:'wheat',icon:'🌾',en:'Wheat',ja:'むぎ',start:true},
 {id:'leaf',icon:'🍃',en:'Tea leaf',ja:'ちゃば',start:true},
 {id:'seaweed',icon:'🌿',en:'Seaweed',ja:'のり',start:true},
 {id:'cookedrice',icon:'🍚',en:'Cooked rice',ja:'ごはん'},
 {id:'onigiri',icon:'🍙',en:'Rice ball',ja:'おにぎり'},
 {id:'sushi',icon:'🍣',en:'Sushi',ja:'すし'},
 {id:'sake',icon:'🍶',en:'Sake',ja:'さけ'},
 {id:'mochi',icon:'🍡',en:'Mochi',ja:'もち'},
 {id:'tofu',icon:'🧊',en:'Tofu',ja:'とうふ'},
 {id:'miso',icon:'🟤',en:'Miso',ja:'みそ'},
 {id:'misosoup',icon:'🥣',en:'Miso soup',ja:'みそしる'},
 {id:'noodle',icon:'🍝',en:'Noodles',ja:'めん'},
 {id:'ramen',icon:'🍜',en:'Ramen',ja:'ラーメン'},
 {id:'udon',icon:'🥢',en:'Udon',ja:'うどん'},
 {id:'tempura',icon:'🍤',en:'Tempura',ja:'てんぷら'},
 {id:'steam',icon:'💨',en:'Steam',ja:'ゆげ'},
 {id:'onsen',icon:'♨️',en:'Hot spring',ja:'おんせん'},
 {id:'tea',icon:'🍵',en:'Green tea',ja:'おちゃ'},
 {id:'bento',icon:'🍱',en:'Bento box',ja:'べんとう'}
];
// Each one is something a child could be told and would believe: rice and water make rice,
// cooked rice and seaweed make an onigiri, noodles and miso soup make ramen.
export const RECIPES=[
 ['rice','water','cookedrice'],
 ['cookedrice','seaweed','onigiri'],
 ['cookedrice','fish','sushi'],
 ['cookedrice','water','sake'],
 ['cookedrice','fire','mochi'],
 ['bean','water','tofu'],
 ['bean','fire','miso'],
 ['miso','water','misosoup'],
 ['wheat','water','noodle'],
 ['noodle','misosoup','ramen'],
 ['noodle','fire','udon'],
 ['wheat','fish','tempura'],
 ['water','fire','steam'],
 ['steam','water','onsen'],
 ['leaf','water','tea'],
 ['onigiri','fish','bento']
];
export const elementById=id=>ELEMENTS.find(e=>e.id===id)||null;
export const startingElements=()=>ELEMENTS.filter(e=>e.start).map(e=>e.id);
// Order does not matter — rice and water is the same as water and rice.
export function combine(a,b){
 const hit=RECIPES.find(([x,y])=>(x===a&&y===b)||(x===b&&y===a));
 return hit?hit[2]:null;
}
export const discoverable=()=>[...new Set(RECIPES.map(r=>r[2]))];
// The real sumo ladder, bottom to top. Merge two of the same rank and the wrestler is
// promoted — which is roughly how it works, and it teaches the names on the way up.
export const SUMO_RANKS=[
 {level:1,icon:'🥋',en:'Beginner',ja:'序ノ口',romaji:'jonokuchi'},
 {level:2,icon:'🤼',en:'Second tier',ja:'序二段',romaji:'jonidan'},
 {level:3,icon:'🤼‍♂️',en:'Third tier',ja:'三段目',romaji:'sandanme'},
 {level:4,icon:'💪',en:'Makushita',ja:'幕下',romaji:'makushita'},
 {level:5,icon:'🎽',en:'Juryo — now paid',ja:'十両',romaji:'jūryō'},
 {level:6,icon:'🏅',en:'Maegashira',ja:'前頭',romaji:'maegashira'},
 {level:7,icon:'🎖️',en:'Komusubi',ja:'小結',romaji:'komusubi'},
 {level:8,icon:'🏆',en:'Sekiwake',ja:'関脇',romaji:'sekiwake'},
 {level:9,icon:'👑',en:'Ozeki',ja:'大関',romaji:'ōzeki'},
 {level:10,icon:'🌅',en:'Yokozuna',ja:'横綱',romaji:'yokozuna'}
];
export const rankAt=level=>SUMO_RANKS.find(r=>r.level===level)||null;
// 'Juryo — now paid' does not fit on a tile the size of a thumbnail. The full name is in the
// list of ranks underneath, which is where you go to read them anyway.
export const shortRank=rank=>String(rank?.en||'').replace(/\s+—.*$/,'');
export const TOP_RANK=SUMO_RANKS.length;
export const STABLE_SIZE=16;
export const emptyStable=()=>Array(STABLE_SIZE).fill(0);
// A new recruit always arrives at the bottom, sometimes with a little help.
export function recruit(stable,seed){
 const free=stable.map((v,i)=>v?-1:i).filter(i=>i>=0);
 if(!free.length)return null;
 const n=(seed>>>0)||1;
 const next=[...stable];
 next[free[n%free.length]]=n%7===0?2:1;
 return next;
}
// Two of the same rank become one of the next. Anything else is not a merge.
export function promote(stable,a,b){
 if(a===b||!stable[a]||!stable[b]||stable[a]!==stable[b]||stable[a]>=TOP_RANK)return null;
 const next=[...stable];
 next[b]=stable[b]+1;next[a]=0;
 return {stable:next,level:next[b]};
}
export const bestRank=stable=>Math.max(0,...stable);
export const stableFull=stable=>stable.every(Boolean);
// A bout is decided by rank, with enough luck that a lower rank can still pull one off —
// which is the whole reason an upset is worth watching.
export const oddsOf=(mine,theirs)=>Math.max(0.05,Math.min(0.95,0.5+(mine-theirs)*0.12));
export function bout(mine,theirs,roll){
 if(!rankAt(mine)||!rankAt(theirs))return null;
 const odds=oddsOf(mine,theirs);
 const won=roll<odds;
 return {won,odds,reward:won?theirs*10:0};
}
// Who the next challenger is: near your best, and never below the bottom rung.
export const challengerFor=(best,cleared)=>Math.max(1,Math.min(TOP_RANK,Math.max(1,best-1)+(cleared%2)));
