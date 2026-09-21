// The actual money, both sides of it. A boy standing at a gachapon machine with a handful of
// coins cannot read 百円, and the number he can read is on the OTHER side of the coin — so
// every piece here is drawn front and back, said out loud, and named by what is painted on it
// rather than by its denomination alone.
//
// Nothing here is traced from real money and nothing is drawn to scale against it: these are
// our own simple pictures of what is on each piece, the way the flower cards are our own
// drawing of the twelve plants. What is true is what is ON them, because that is the thing a
// child uses to tell a ¥10 from a ¥100 at arm's length in a shop.
//
// `front` is the side with the picture and the amount written in kanji. `back` is the side
// with the year and, on everything except the five, the amount in numbers we can read.

// A coin, in the order they come out of a pocket.
export const COINS=[
 {id:'coin-1',yen:1,name:'One yen',ja:'一円',say:'ichi en',
  metal:'aluminium',colour:'#dfe3e6',rim:'#b9c0c5',mm:20,hole:false,
  front:{shows:'A young tree',why:'A little tree with three leaves, drawn by somebody who entered a competition to design it. It means a country still growing.'},
  back:{shows:'A big 1',why:'The number, and the year it was made counted from the start of the Emperor’s reign rather than from 2026.'},
  spot:'The lightest thing in your pocket. It is aluminium, and it is so light it will sit on top of water without sinking.',
  worth:'Almost nothing on its own. You get them as change and they add up.'},
 {id:'coin-5',yen:5,name:'Five yen',ja:'五円',say:'go en',
  metal:'brass',colour:'#c9a340',rim:'#a8862c',mm:22,hole:true,
  front:{shows:'Rice, a cog and water',why:'An ear of rice growing out of the hole for the farms, a cog wheel around it for the factories, and wavy lines underneath for the fishing boats. The three ways the country fed itself.'},
  back:{shows:'Two little shoots',why:'Two young sprouts and the year. No number anywhere.'},
  spot:'Gold coloured with a hole through the middle, and the only coin in Japan with no number on it at all. If you cannot read it and it has a hole, it is a five.',
  worth:'The lucky one. Five yen said out loud sounds like “a good tie between people”, so this is the coin you throw into the box at a shrine.'},
 {id:'coin-10',yen:10,name:'Ten yen',ja:'十円',say:'juu en',
  metal:'bronze',colour:'#b4703c',rim:'#8d5228',mm:23.5,hole:false,
  front:{shows:'A temple hall',why:'The Phoenix Hall at a temple called Byodo-in, just outside Kyoto. It is a real building and it is still standing — long and low, sitting on its own pond.'},
  back:{shows:'An evergreen tree and a 10',why:'A tree that keeps its leaves all winter, and the number.'},
  spot:'The only brown one. Copper coloured, a bit bigger than the gold five, and no hole.',
  worth:'What the little gachapon toys used to cost. Now it is change.'},
 {id:'coin-50',yen:50,name:'Fifty yen',ja:'五十円',say:'go juu en',
  metal:'nickel',colour:'#c8ced4',rim:'#a4abb2',mm:21,hole:true,
  front:{shows:'Chrysanthemum flowers',why:'Three chrysanthemums, which is the flower of the Emperor’s family. The hole goes straight through the middle of them.'},
  back:{shows:'A big 50',why:'The number and the year.'},
  spot:'Silver with a hole. If it has a hole and it is silver it is fifty; if it has a hole and it is gold it is five.',
  worth:'Half of a hundred, and easy to mix up with a hundred in a hurry. The hole is the giveaway.'},
 {id:'coin-100',yen:100,name:'One hundred yen',ja:'百円',say:'hyaku en',
  metal:'nickel',colour:'#c8ced4',rim:'#a4abb2',mm:22.6,hole:false,
  front:{shows:'Cherry blossom',why:'Three cherry blossoms in a row. The flower everybody goes to look at in spring.'},
  back:{shows:'A big 100',why:'The number and the year.'},
  spot:'Silver, no hole, and slightly bigger than the fifty. This is the one you will use most.',
  worth:'The whole-vending-machine coin. Most drinks, most gachapon and a lot of the hundred-yen shop are one or two of these.'},
 {id:'coin-500',yen:500,name:'Five hundred yen',ja:'五百円',say:'go hyaku en',
  metal:'two metals',colour:'#cfd4d8',rim:'#c9a340',mm:26.5,hole:false,
  front:{shows:'Paulownia leaves',why:'A paulownia plant — big leaves and little flowers standing up like candles. It is the badge the government uses.'},
  back:{shows:'Bamboo, orange leaves and a 500',why:'Bamboo down one side, a mandarin orange tree down the other, and the number in the middle. Tip it in the light and there is writing hidden inside the zeros.'},
  spot:'The big one, and the only coin made of two different metals — a gold ring around a silver middle. It is the heaviest and worth the most.',
  worth:'One of the most valuable coins anybody uses anywhere in the world. Losing one is losing a drink and a snack.'}
];

// A note. The newest ones came out in 2024, so the boys will be handed both these and the
// older set below — both are good money and both get spent the same way.
export const NOTES=[
 {id:'note-1000',yen:1000,name:'One thousand yen',ja:'千円',say:'sen en',
  colour:'#dfe7f0',ink:'#2f4d7a',mm:150,
  front:{shows:'A man called Kitasato Shibasaburo',why:'A doctor who worked out how some of the worst illnesses in the world spread, and started Japan’s first place for studying them. Tip the note and his face turns to look the other way — it is a hologram, not a picture.'},
  back:{shows:'The great wave',why:'The most famous picture ever made in Japan: a huge curling wave with little boats under it and Mount Fuji tiny in the distance. It was printed from carved wood about two hundred years ago.'},
  spot:'The smallest note and the bluest. If a note looks blue, it is a thousand.',
  worth:'Lunch, near enough. Or ten gachapon.'},
 {id:'note-2000',yen:2000,name:'Two thousand yen',ja:'二千円',say:'ni sen en',
  colour:'#dfeee2',ink:'#3a6b46',mm:154,
  front:{shows:'A gate in Okinawa',why:'Shureimon, the red gate of a castle on the island of Okinawa, right down the bottom of Japan.'},
  back:{shows:'A thousand-year-old story',why:'A scene from the Tale of Genji, which some people call the first novel anybody ever wrote, and a picture of the woman who wrote it.'},
  spot:'Green, and rare. Most Japanese people go months without seeing one. If you get one, keep it.',
  worth:'The same as two thousand-yen notes, but much more interesting.'},
 {id:'note-5000',yen:5000,name:'Five thousand yen',ja:'五千円',say:'go sen en',
  colour:'#ece1f0',ink:'#6a4a86',mm:156,
  front:{shows:'A woman called Tsuda Umeko',why:'She was sent to America to study when she was six — younger than Nate — and came back and built a college so that women in Japan could go too.'},
  back:{shows:'Wisteria',why:'Wisteria flowers hanging down in long purple bunches, the way they do over a walkway in spring.'},
  spot:'Purple, and a bit longer than the thousand. Notes get longer as they get worth more.',
  worth:'A good day out. This is the one a parent hands over and expects change from.'},
 {id:'note-10000',yen:10000,name:'Ten thousand yen',ja:'一万円',say:'ichi man en',
  colour:'#f0e6da',ink:'#7a5530',mm:160,
  front:{shows:'A man called Shibusawa Eiichi',why:'He started about five hundred companies and a lot of the banks, and then spent the rest of his life giving the money away. People call him the grandfather of Japanese business.'},
  back:{shows:'Tokyo Station',why:'The red brick front of Tokyo Station with its two domes. We walk past it — the building on the note is the building in front of you.'},
  spot:'The longest note, and brown. If it is the biggest one in the wallet, it is worth the most.',
  worth:'A lot. This is not pocket money — it is the note a grown-up pays a hotel with.'}
];

// Still everywhere, still spendable, and the faces are different — worth knowing before
// somebody decides the note they were handed is a fake.
export const OLD_NOTES=[
 {id:'old-1000',yen:1000,name:'One thousand yen, the older one',ja:'千円',say:'sen en',
  colour:'#dfe7f0',ink:'#2f4d7a',mm:150,
  front:{shows:'A man called Noguchi Hideyo',why:'Another doctor who chased diseases, and who burnt his hand badly as a baby — the operation that fixed it is why he decided to become a doctor.'},
  back:{shows:'Mount Fuji and cherry blossom',why:'Fuji seen across a lake with its reflection in the water, and cherry blossom in front of it.'},
  spot:'Blue like the new one, different face.',worth:'Exactly the same as the new thousand. Spend it the same way.'},
 {id:'old-5000',yen:5000,name:'Five thousand yen, the older one',ja:'五千円',say:'go sen en',
  colour:'#ece1f0',ink:'#6a4a86',mm:156,
  front:{shows:'A writer called Higuchi Ichiyo',why:'A writer who wrote about ordinary people and poor people, and died at twenty four. She was the first woman on a Japanese note.'},
  back:{shows:'Irises',why:'A painted screen of irises — tall purple flowers on a gold background.'},
  spot:'Purple like the new one, different face.',worth:'Exactly the same as the new five thousand.'},
 {id:'old-10000',yen:10000,name:'Ten thousand yen, the older one',ja:'一万円',say:'ichi man en',
  colour:'#f0e6da',ink:'#7a5530',mm:160,
  front:{shows:'A man called Fukuzawa Yukichi',why:'He started a university and wrote the books that told Japan what the rest of the world was doing. He was on this note for forty years.'},
  back:{shows:'A golden phoenix',why:'The phoenix statue from the roof of the Phoenix Hall — the same temple that is on the ten yen coin.'},
  spot:'Brown and the longest, different face.',worth:'Exactly the same as the new ten thousand.'}
];

export const MONEY=[...COINS,...NOTES,...OLD_NOTES];
export const kindOf=item=>String(item?.id||'').startsWith('coin')?'coin':'note';
// Dollars for a listener rather than for a reader. A phone reading "$4.66" aloud is a lottery,
// so the dollars are handed to it already in words, rounded the way you would say them to a
// five-year-old standing in a shop.
export function audAloud(yen,rate){
 const value=yen/(rate>0?rate:98);
 if(value<0.05)return 'less than five cents';
 if(value<1)return `about ${Math.round(value*10)*10} cents`;
 if(value<10){
  const dollars=Math.floor(value),cents=Math.round((value-dollars)*10)*10;
  if(cents>=100)return `about ${dollars+1} dollars`;
  if(!cents)return `about ${dollars} ${dollars===1?'dollar':'dollars'}`;
  return `about ${dollars} ${dollars===1?'dollar':'dollars'} ${cents}`;
 }
 return `about ${Math.round(value)} dollars`;
}
// What the phone says when Nate presses the speaker on one piece of money. Both sides, what is
// on them, and how much it is — in that order, because he is holding the thing while it talks.
// No Japanese script: an Australian voice reading 百円 says nothing a child can use.
export function moneyAloud(item,rate){
 if(!item)return '';
 return spoken([`${item.name}. Say it, ${item.say}.`,
  `It is worth ${item.yen.toLocaleString('en-AU')} yen, ${audAloud(item.yen,rate)}.`,
  `On one side, ${item.front.shows}.`,
  `Turn it over, and ${item.back.shows}.`,
  item.spot].join(' '));
}
// The writing on the page is for whoever can read it. A dash is a pause to a reader and
// nothing at all to a phone, so on the way to the speaker it becomes a comma.
const spoken=text=>String(text).replace(/\s*[\u2014\u2013]\s*/g,', ').replace(/\s+/g,' ').trim();
// The whole lesson in one press, for a boy who cannot read a word of the page it is on.
export const MONEY_ALOUD='Japanese money. There are six coins and there are notes. The coins are the money you will actually spend. Two of the coins have a hole right through the middle, and the one with a hole that is gold coloured is worth five. The silver one with a hole is worth fifty. The big heavy one with a gold ring around the outside is worth five hundred, and that is the most any coin is worth. Every coin has a picture on one side and a number on the other side, so if you cannot read it, turn it over. The notes are worth much more than the coins, and the longer the note is, the more it is worth.';
