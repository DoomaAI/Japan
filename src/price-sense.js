// Price sense: what the same thing costs at home, beside what it costs here. The converter
// says ¥1,200 is $12; this says a bowl of ramen at home is about $20, which is what a boy
// learning money can actually use. Home prices are a rough Sydney table, in dollars, matched
// by words in the thing's name; anything the words cannot place gets no line rather than a
// wrong one.
import {yenToAud} from './trip-features.js';
export const HOME_PRICES=[
 [20,'a bowl of ramen',['ramen']],[18,'a bowl of udon or soba',['udon','soba']],[6,'a plate of sushi',['sushi']],[16,'a curry',['curry','katsu']],
 [5.5,'a coffee',['coffee','latte']],[8,'a bubble tea',['bubble tea','boba','tapioca']],[6,'an ice cream',['ice cream','soft serve','gelato','ice-cream']],
 [4,'a drink from a machine',['vending','soft drink','coke','juice','pocari','ramune','can of','bottle of water']],[4.5,'an onigiri',['onigiri','rice ball']],
 [3,'a KitKat',['kitkat','kit kat']],[4,'a chocolate bar',['chocolate','choc']],[5,'a packet of lollies',['lolly','lollies','candy','sweets','pocky','gummies']],
 [8,'a pack of Pokémon cards',['pokemon card','pokémon card','booster','card pack','trading card']],[30,'a plush toy',['plush','soft toy','stuffed']],
 [60,'a Lego set',['lego']],[15,'a manga volume',['manga']],[5,'a capsule toy',['gacha','gachapon','capsule']],[2,'a go on an arcade machine',['arcade','claw','crane game','ufo catcher']],
 [40,'a t-shirt',['t-shirt','tshirt','tee']],[35,'a cap',['cap','hat']],[20,'an umbrella',['umbrella']],[25,'a keyring or a badge',['keyring','key ring','badge','pin','charm']],
 [5,'a sticker sheet',['sticker']],[12,'a magnet or a postcard set',['magnet','postcard']]
];
export function priceSense(title,yen,rate){
 const t=String(title||'').toLowerCase();
 if(!t||!Number.isFinite(yen)||yen<=0||!rate)return null;
 const hit=HOME_PRICES.find(([,,words])=>words.some(w=>t.includes(w)));
 if(!hit)return null;
 const [home,what]=hit,here=yenToAud(yen,rate);
 const ratio=here/home,verdict=ratio<=0.7?'cheaper here':ratio>=1.4?'dearer here':'about the same';
 return {home,here,what,verdict,line:`About $${here.toFixed(0)} here; at home ${what} is about $${home} — ${verdict}.`};
}
