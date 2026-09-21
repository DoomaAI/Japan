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
