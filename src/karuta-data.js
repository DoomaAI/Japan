// Karuta: the reader calls, and the first hand on the card keeps it. Played at New Year since
// the Edo period, which is the whole reason it is in here — most of the games on this phone
// are games about Japan, and this one is a Japanese game.
//
// Two ways in, because the boys are five and eight. A letter deck calls a sound and you take
// the letter that makes it, which is the same skill as Match the letters against a clock. The
// proverb deck is the real thing: the reader reads a kotowaza, and you take the picture card
// it belongs to — the card is found by its opening letter, which is how iroha karuta works.
import {HIRAGANA,KATAKANA,shuffled} from './kana-data.js';
// Proverbs a child can picture, each filed under the letter it opens with, which is the letter
// you are listening for. Most are off the Edo iroha deck; the rest are the ones every Japanese
// child knows anyway. The English is what it means, not a word-for-word translation.
export const KOTOWAZA=[
 {kana:'い',ja:'犬も歩けば棒に当たる',romaji:'inu mo arukeba bō ni ataru',icon:'🐕',
  literal:'A dog that goes walking runs into a stick.',en:'Go out, and something will happen to you.'},
 {kana:'は',ja:'花より団子',romaji:'hana yori dango',icon:'🍡',
  literal:'Dumplings rather than blossom.',en:'Something you can eat beats something you can only look at.'},
 {kana:'ち',ja:'塵も積もれば山となる',romaji:'chiri mo tsumoreba yama to naru',icon:'⛰️',
  literal:'Even dust, piled up, becomes a mountain.',en:'Small things done often add up to something big.'},
 {kana:'た',ja:'旅は道連れ世は情け',romaji:'tabi wa michizure yo wa nasake',icon:'🧳',
  literal:'On a journey, a companion; in life, kindness.',en:'A trip is better with someone beside you.'},
 {kana:'か',ja:'蛙の面に水',romaji:'kaeru no tsura ni mizu',icon:'🐸',
  literal:'Water on a frog’s face.',en:'It does not bother him in the slightest.'},
 {kana:'お',ja:'鬼に金棒',romaji:'oni ni kanabō',icon:'👹',
  literal:'An iron club for the demon.',en:'Already strong, and now stronger still.'},
 {kana:'ま',ja:'負けるが勝ち',romaji:'makeru ga kachi',icon:'🤝',
  literal:'Losing is winning.',en:'Sometimes giving way is how you come out ahead.'},
 {kana:'あ',ja:'頭隠して尻隠さず',romaji:'atama kakushite shiri kakusazu',icon:'🙈',
  literal:'Hides his head and leaves his bottom showing.',en:'He thinks he is hidden. He is not.'},
 {kana:'な',ja:'泣きっ面に蜂',romaji:'nakittsura ni hachi',icon:'🐝',
  literal:'A bee for a crying face.',en:'Bad luck landing on top of bad luck.'},
 {kana:'る',ja:'類は友を呼ぶ',romaji:'rui wa tomo o yobu',icon:'👬',
  literal:'Like calls to like.',en:'People end up with the ones they are similar to.'},
 {kana:'ね',ja:'念には念を入れよ',romaji:'nen ni wa nen o ireyo',icon:'🔍',
  literal:'Put care into your care.',en:'Check it, then check it again.'},
 {kana:'ゆ',ja:'油断大敵',romaji:'yudan taiteki',icon:'⚠️',
  literal:'Carelessness is the great enemy.',en:'Most things go wrong the moment you stop paying attention.'},
 {kana:'し',ja:'知らぬが仏',romaji:'shiranu ga hotoke',icon:'🧘',
  literal:'Not knowing is a Buddha.',en:'What you have not heard cannot worry you.'},
 {kana:'も',ja:'門前の小僧習わぬ経を読む',romaji:'monzen no kozō narawanu kyō o yomu',icon:'⛩️',
  literal:'The boy at the temple gate recites sutras nobody taught him.',en:'You pick things up just by being somewhere.'},
 {kana:'ら',ja:'楽あれば苦あり',romaji:'raku areba ku ari',icon:'⚖️',
  literal:'Where there is ease, there is hardship.',en:'The easy part and the hard part come together.'},
 {kana:'や',ja:'安物買いの銭失い',romaji:'yasumonogai no zeni ushinai',icon:'🪙',
  literal:'Buying cheap is losing money.',en:'The cheap one breaks, and you buy it twice.'},
 {kana:'け',ja:'芸は身を助ける',romaji:'gei wa mi o tasukeru',icon:'🎨',
  literal:'A skill will keep you.',en:'Something you are good at will get you out of trouble one day.'},
 {kana:'さ',ja:'猿も木から落ちる',romaji:'saru mo ki kara ochiru',icon:'🐒',
  literal:'Even monkeys fall out of trees.',en:'Everybody gets it wrong sometimes, even the good ones.'},
 {kana:'ふ',ja:'覆水盆に返らず',romaji:'fukusui bon ni kaerazu',icon:'💦',
  literal:'Spilled water does not go back on the tray.',en:'Some things cannot be undone, so mind them the first time.'},
 {kana:'う',ja:'馬の耳に念仏',romaji:'uma no mimi ni nenbutsu',icon:'🐴',
  literal:'A prayer in a horse’s ear.',en:'He is not listening to a word of it.'},
 {kana:'こ',ja:'転ばぬ先の杖',romaji:'korobanu saki no tsue',icon:'🦯',
  literal:'A walking stick before you fall.',en:'Get ready before it goes wrong, not after.'},
 {kana:'に',ja:'二階から目薬',romaji:'nikai kara megusuri',icon:'💧',
  literal:'Eye drops from the first floor.',en:'A way of helping that has no chance of working.'},
 {kana:'き',ja:'木を見て森を見ず',romaji:'ki o mite mori o mizu',icon:'🌲',
  literal:'Looking at the tree and missing the forest.',en:'So close up on one thing that you miss the whole of it.'}
];
// Three decks. The letter ones are a race over what Match the letters teaches slowly; the
// proverb one is iroha karuta, where the card is found by the letter the reading opens with.
export const KARUTA_DECKS=[
 {id:'hiragana',ja:'ひらがな',en:'Hiragana',how:'The reader calls a sound. Take the letter that makes it.'},
 {id:'katakana',ja:'カタカナ',en:'Katakana',how:'The reader calls a sound. Take the letter that makes it — these are the ones on signs.'},
 {id:'kotowaza',ja:'ことわざ',en:'Proverbs',how:'The reader reads a saying. Take the card it belongs to — it is the letter the saying starts with.'}
];
export const KARUTA_SIZES=[6,10,16];
export const deckById=id=>KARUTA_DECKS.find(d=>d.id===id)||KARUTA_DECKS[0];
// A card is what is on the floor; a call is what the reader says. They are separated because
// the whole game is that the call does not show you the card — you have to know it.
const kanaCard=k=>({id:k.kana,face:k.kana,ja:k.kana,say:k.kana,call:k.romaji,under:null,meaning:null});
const kotowazaCard=p=>({id:p.kana,face:p.icon,ja:p.ja,say:p.ja,call:p.romaji,romaji:p.romaji,under:p.kana,meaning:p.en,literal:p.literal});
// The cards on the floor and the order they are called in, both fixed by the seed, so two
// phones on the same seed are playing the same round and a brother cannot claim an easier one.
export function karutaRound(deckId,size,seed){
 const deck=deckById(deckId);
 const source=deck.id==='kotowaza'?KOTOWAZA.map(kotowazaCard)
  :(deck.id==='katakana'?KATAKANA:HIRAGANA).map(kanaCard);
 const cards=shuffled(source,seed).slice(0,Math.min(size,source.length));
 return {deck,cards:shuffled(cards,seed+13),calls:shuffled(cards,seed+29).map(c=>c.id)};
}
// Otetsuki — a hand on the wrong card. In a real game it costs you a card you had already won;
// here it costs seconds, because a five-year-old who loses a card he has in front of him stops
// playing. A round is worth what is left of a perfect one, so it is always worth hurrying.
export const KARUTA_PAR=8,OTETSUKI=4;
export const karutaScore=(taken,seconds,wrong)=>
 Math.max(1,Math.min(9999,Math.round(taken*KARUTA_PAR-seconds-wrong*OTETSUKI)));
