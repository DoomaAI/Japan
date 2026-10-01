// People to buy for: the friends and family back home who are owed a souvenir, what each of them
// is into, and ideas for what to get them and where. The ideas here are the ones that need no
// signal: a handful per interest, each tied to the shop or area that sells it and the city it is
// in, so the suggestion can say which day of the trip we are there. The guide can look further
// (server/gift-ideas.mjs) from the same details.
//
// Written October 2026 from what the shops were known to stock; prices are rough yen ranges.
// Customs is Australian: food, wood and plant material are declared, and the allowance for
// alcohol is 2.25 litres a traveller over 18.
import {classify} from './flying-home.js';
import {clamp} from './text.js';

export const AGE_GROUPS=[['','Not said'],['child','Child'],['teen','Teenager'],['adult','Adult'],['older','Older adult']];

// What to write down about someone so the ideas fit. Shown beside the form.
export const DESCRIBE_TIPS=[
 'Specific beats general: "watches Ghibli films with her kids" helps more than "movies".',
 'Say what they already have plenty of, so we do not add to it.',
 'Things that get used up (tea, sweets, skincare) suit people who dislike clutter.',
 'Note allergies, no alcohol, or anything that will not clear Australian customs for them.',
 'A budget per person keeps the total honest when the list gets long.'
];

// Each interest: what to find out about the person (`ask`), and ideas with where they are sold.
// `cities` are the trip's own city names; an empty list means it can be bought almost anywhere.
export const GIFT_INTERESTS=[
 {id:'sweets',emoji:'🍡',label:'Sweets & snacks',ask:'Sweet or savoury? Anything they cannot eat?',ideas:[
  {title:'Regional and Japan-only KitKat flavours',where:'Don Quijote, or a station souvenir shop',cities:[],yen:[400,1500]},
  {title:'Tokyo Banana or a Tokyo Station sweets box',where:'Tokyo Station (GranSta, Tokyo Okashi Land)',cities:['Tokyo'],yen:[1000,3000]},
  {title:'Wagashi or senbei in a gift box',where:'A department store food hall (depachika), e.g. Mitsukoshi Ginza',cities:['Tokyo'],yen:[1500,4000]},
  {title:'Yatsuhashi cinnamon sweets',where:'Kyoto Station souvenir hall, or around Kiyomizu-dera',cities:['Kyoto'],yen:[700,1500]}]},
 {id:'tea',emoji:'🍵',label:'Tea & coffee',ask:'Matcha, green tea, or a coffee drinker? Do they have the gear?',ideas:[
  {title:'Matcha or sencha from Ippodo',where:'Ippodo Tea, Teramachi (Kyoto) or Marunouchi (Tokyo)',cities:['Kyoto','Tokyo'],yen:[1500,5000]},
  {title:'Bamboo tea whisk and bowl set',declare:'wood',where:'Kappabashi Kitchen Town, Asakusa',cities:['Tokyo'],yen:[2500,8000]},
  {title:'Drip-bag coffee from a Japanese roaster',where:'Department store food hall, or a Blue Bottle / Sarutahiko café',cities:['Tokyo'],yen:[1000,2500]}]},
 {id:'cooking',emoji:'🔪',label:'Cooking & kitchen',ask:'Do they cook a lot? Room in the kitchen for one more thing?',ideas:[
  {title:'A Japanese kitchen knife, engraved with their name',where:'Kappabashi Kitchen Town (Kamata, Kama-Asa), Asakusa',cities:['Tokyo'],yen:[8000,30000],tip:'Knives go in checked luggage.'},
  {title:'Aritsugu knife or kitchen tool',where:'Aritsugu, Nishiki Market',cities:['Kyoto'],yen:[5000,30000],tip:'Knives go in checked luggage.'},
  {title:'Furikake, yuzu kosho and dashi set',where:'Depachika or a supermarket',cities:[],yen:[1000,3000]}]},
 {id:'stationery',emoji:'✒️',label:'Stationery & art',ask:'Do they journal, draw or write by hand?',ideas:[
  {title:'Fountain pen, washi tape or a Hobonichi diary',where:'Itoya, Ginza',cities:['Tokyo'],yen:[1000,8000]},
  {title:'Japanese pens and notebooks',where:'Loft or Hands (Shibuya, Ginza)',cities:['Tokyo'],yen:[500,3000]}]},
 {id:'anime',emoji:'🎮',label:'Anime, games & Pokémon',ask:'Which series or characters? Collector or casual fan?',ideas:[
  {title:'Pokémon Center exclusive plush or cards',where:'Pokémon Center Shibuya, Shibuya Parco',cities:['Tokyo'],yen:[1500,6000]},
  {title:'Nintendo Tokyo exclusive merchandise',where:'Nintendo Tokyo, Shibuya Parco',cities:['Tokyo'],yen:[1500,6000]},
  {title:'Character goods from their favourite series',where:'Tokyo Character Street, Tokyo Station',cities:['Tokyo'],yen:[1000,5000]},
  {title:'Ghibli goods',where:'Donguri Republic (Tokyo Station, Kyoto, Osaka)',cities:['Tokyo','Kyoto','Osaka'],yen:[1000,5000]}]},
 {id:'beauty',emoji:'🧴',label:'Beauty & skincare',ask:'Skin type, favourite brands, scent or no scent?',ideas:[
  {title:'Japanese sunscreen and sheet masks',where:'Matsumoto Kiyoshi or any drugstore',cities:[],yen:[1000,4000]},
  {title:'Bestsellers chosen from the rankings wall',where:'@cosme Tokyo, Harajuku',cities:['Tokyo'],yen:[1500,6000]}]},
 {id:'fashion',emoji:'🧣',label:'Fashion & textiles',ask:'Their size and style; patterns or plain?',ideas:[
  {title:'Tenugui cotton cloths',where:'Kamawanu (Asakusa, Daikanyama), or a Kyoto craft shop',cities:['Tokyo','Kyoto'],yen:[1000,2500]},
  {title:'Furoshiki wrapping cloth',where:'Department stores, or Takumi in Ginza',cities:['Tokyo'],yen:[1500,5000]},
  {title:'Japan-only Uniqlo UT shirts',where:'Uniqlo Ginza flagship',cities:['Tokyo'],yen:[1500,3000]}]},
 {id:'crafts',emoji:'🏺',label:'Ceramics & crafts',ask:'Do they like things on display, or things they use every day?',ideas:[
  {title:'Kiyomizu-yaki cup or bowl',where:'The pottery shops on Kiyomizu-zaka',cities:['Kyoto'],yen:[2000,10000]},
  {title:'Handmade crafts from across Japan',where:'Takumi, Ginza',cities:['Tokyo'],yen:[2000,15000]},
  {title:'Maneki-neko (lucky cat)',where:'Gotokuji temple, Setagaya',cities:['Tokyo'],yen:[500,3000]}]},
 {id:'drinks',emoji:'🍶',label:'Sake & whisky',ask:'Do they drink? Sake, whisky, or something sweeter like umeshu?',adult:true,ideas:[
  {title:'A bottle of sake or umeshu',where:'A department store food hall, or Hasegawa Saketen',cities:['Tokyo'],yen:[1500,6000],tip:'2.25 L of alcohol a traveller over 18, duty-free into Australia.'},
  {title:'Japanese whisky',where:'Bic Camera or Yodobashi liquor floors, or airport duty-free',cities:['Tokyo'],yen:[4000,15000],tip:'2.25 L of alcohol a traveller over 18, duty-free into Australia.'}]},
 {id:'toys',emoji:'🧸',label:'Toys & kids',ask:'Their age, and what they are into right now?',ideas:[
  {title:'Character toys and plush',where:'Kiddy Land, Harajuku',cities:['Tokyo'],yen:[1000,5000]},
  {title:'Tomica cars or Plarail',where:'Tokyo Character Street, Tokyo Station',cities:['Tokyo'],yen:[600,4000]},
  {title:'Toys over several floors',where:'Hakuhinkan Toy Park, Ginza',cities:['Tokyo'],yen:[1000,5000]},
  {title:'Gachapon capsule toys',where:'Any station or shopping centre; a whole shop of them in Akihabara',cities:[],yen:[300,1500]}]},
 {id:'luck',emoji:'🎐',label:'Good luck & keepsakes',ask:'Anything they are hoping for: health, study, a new home?',ideas:[
  {title:'Omamori charm for what they are hoping for',where:'A temple or shrine we visit, e.g. Meiji Jingu or Senso-ji',cities:['Tokyo','Kyoto'],yen:[500,1500]},
  {title:'Daruma doll to make a wish on',where:'Senso-ji Nakamise, or a temple shop',cities:['Tokyo'],yen:[500,3000]}]},
 {id:'sport',emoji:'⚾',label:'Sport',ask:'Which sport and which team at home?',ideas:[
  {title:'Yomiuri Giants cap or towel',where:'Tokyo Dome shops',cities:['Tokyo'],yen:[1500,5000]},
  {title:'Japan national team shirt or sumo goods',where:'Sports shops in Shibuya, or the Ryogoku sumo hall',cities:['Tokyo'],yen:[2000,10000]}]},
 {id:'garden',emoji:'🌿',label:'Garden & plants',ask:'Do they garden? Keep in mind what customs will not let in.',ideas:[
  {title:'Japanese garden snips or a hori-hori',where:'Hands, or Kappabashi Kitchen Town',cities:['Tokyo'],yen:[2000,8000],tip:'Tools only: no seeds, bulbs, plants or soil into Australia.'}]},
 {id:'tech',emoji:'📷',label:'Gadgets & photos',ask:'What do they use already? Australian plugs and warranties differ.',ideas:[
  {title:'A gadget or camera accessory, tax-free',where:'Bic Camera or Yodobashi Camera',cities:['Tokyo','Osaka','Kyoto'],yen:[2000,30000],tip:'Check it runs on 240 V and the warranty is international.'},
  {title:'Instax film or a disposable camera',where:'Bic Camera or Yodobashi Camera',cities:['Tokyo','Osaka','Kyoto'],yen:[1000,3000]}]}
];
// For someone we know little about: things nearly everyone is glad of.
const ANYONE=[
 {title:'A box of Japan-only sweets',where:'Don Quijote, or a station souvenir shop',cities:[],yen:[500,2500],interest:'sweets'},
 {title:'Tenugui cotton cloth',where:'Kamawanu, or a Kyoto craft shop',cities:['Tokyo','Kyoto'],yen:[1000,2500],interest:'fashion'},
 {title:'Omamori charm',where:'A temple or shrine we visit',cities:['Tokyo','Kyoto'],yen:[500,1500],interest:'luck'}
];
export const findInterest=id=>GIFT_INTERESTS.find(i=>i.id===id)||null;
export const interestLabel=id=>findInterest(id)?.label||id;

export const giftPeople=state=>state.giftPeople||[];
export const findGiftPerson=(state,id)=>id?giftPeople(state).find(p=>p.id===id)||null:null;
export const ageLabel=id=>(AGE_GROUPS.find(([k])=>k===id)||AGE_GROUPS[0])[1];

// A person as the server keeps them, from whatever was typed.
export function cleanGiftPerson(input){
 const interests=[...new Set((Array.isArray(input?.interests)?input.interests:[]).filter(id=>findInterest(id)))];
 const budget=input?.budget===''||input?.budget==null?null:Number(input.budget);
 return {name:clamp(input?.name,80),relation:clamp(input?.relation,80),age:AGE_GROUPS.some(([k])=>k===input?.age)?input.age:'',
  interests,likes:clamp(input?.likes,500),avoid:clamp(input?.avoid,300),budget,notes:clamp(input?.notes,1000)};
}
export function giftPersonProblem(p){
 if(!p.name)return 'Write their name.';
 if(p.budget!==null&&(!Number.isInteger(p.budget)||p.budget<0||p.budget>1000000))return 'Enter a budget in whole yen.';
 return '';
}

// The shopping list against the people: what is down for each, and whether any of it is bought.
export function giftProgress(state,person){
 const items=(state.shopping||[]).filter(s=>s.giftPersonId===person.id);
 const bought=items.filter(s=>s.boughtAt);
 const spent=items.reduce((n,s)=>n+(Number.isFinite(s.budget)?s.budget:0),0);
 return {items,bought:bought.length,planned:items.length,spent,done:bought.length>0,over:person.budget!=null&&spent>person.budget};
}

// The days of the trip still ahead in a city. "Nara / Kyoto" and "DisneySea / Tokyo" count for both.
export function daysIn(state,city,today){
 const c=city.toLowerCase();
 return (state.days||[]).filter(d=>(!today||d.date>=today)&&String(d.city||'').toLowerCase().split('/').map(s=>s.trim()).some(s=>s===c||s.startsWith(c))).map(d=>d.date);
}

// Ideas for one person, offline. From their interests (or the safe few when none are chosen),
// without alcohol for a child or for someone who would rather not, inside their budget where
// one is set, and only from cities still ahead of us. Each carries when we are there and what
// customs will ask about it.
const NO_ALCOHOL=/alcohol|drink|sober|sake|whisk/i;
export function giftIdeas(state,person,today){
 const young=['child','teen'].includes(person.age);
 const pool=person.interests.length
  ?person.interests.flatMap(id=>{const i=findInterest(id);return i?i.ideas.map(x=>({...x,interest:id,adult:!!i.adult})):[];})
  :young?findInterest('toys').ideas.map(x=>({...x,interest:'toys'})):ANYONE;
 const taken=new Set((state.shopping||[]).filter(s=>s.giftPersonId===person.id).map(s=>s.title.toLowerCase()));
 return pool
  .filter(x=>!(x.adult&&(young||NO_ALCOHOL.test(person.avoid||''))))
  .filter(x=>person.budget==null||x.yen[0]<=person.budget)
  .filter(x=>!taken.has(x.title.toLowerCase()))
  .map(x=>{
   const days=x.cities.length?[...new Set(x.cities.flatMap(c=>daysIn(state,c,today)))].sort():[];
   return {...x,days,anywhere:!x.cities.length,declare:x.declare||classify(x.title)};
  })
  .filter(x=>x.anywhere||x.days.length)
  .sort((a,b)=>(a.anywhere-b.anywhere)||String(a.days[0]||'').localeCompare(String(b.days[0]||'')));
}

// What the guide is told about someone, when asked to look further.
export function giftBrief(person){
 return [`${person.name}${person.relation?` (${person.relation})`:''}${person.age?`, ${ageLabel(person.age).toLowerCase()}`:''}`,
  person.interests.length&&`Into: ${person.interests.map(interestLabel).join(', ')}`,
  person.likes&&`Likes: ${person.likes}`,person.avoid&&`Avoid: ${person.avoid}`,
  person.budget!=null&&`Budget: about ¥${person.budget.toLocaleString('en-AU')}`,person.notes&&`Notes: ${person.notes}`].filter(Boolean).join('\n');
}
// One idea from the guide, checked before it is kept.
export function cleanGuideIdea(o,link=u=>u){
 const title=clamp(o?.title,120);if(!title)return null;
 const yen=Number.isFinite(o?.yen)&&o.yen>=0&&o.yen<=1000000?Math.round(o.yen):null;
 return {title,why:clamp(o?.why,240),where:clamp(o?.where,160),area:clamp(o?.area,80),day:/^\d{4}-\d{2}-\d{2}$/.test(o?.day||'')?o.day:'',yen,website:link(String(o?.website||'')),declare:classify(title)};
}
