// What sort of stop each one is — a meal, a train, a ride — so the day at a glance and the card
// can say it with an icon before a word is read. Nobody typed a type in for the plan as it came,
// so it is read from the stop's own name: the first word in the title that says what it is
// wins ("games and snacks" is games, "shopping and snacks" is shopping), then the place
// ("Universal Studios Japan" is a ride, "Hilton Tokyo" is the hotel). A parent can set it by
// hand on the edit form, and that choice is kept over the guess. A stop that is something to
// do rather than somewhere to be ("Buy DPA for Pooh's Hunny Hunt") is Tickets & prep, not the ride.
export const ENTRY_TYPES=[
 {id:'transport',label:'Getting there',words:/^(head|leave|travel|begin exit|arrive)\b|\b(train|taxi|shinkansen|nozomi|subway|bus|shuttle|chauffeur|flight(?! of)|immigration|platform|resort line|transfer|return to|return towards|return after|return for|back to|walk to|walk towards|home|haneda)\b/},
 {id:'food',label:'Food',words:/\b(breakfast|lunch|dinner|supper|bites|snacks?|bakery|pizza|donut|takoyaki|okonomiyaki|sukiyaki|tonkatsu|cheesecake|mochi|dumplings|butterbeer|omurice|pancake|food hall|drinks|eat|edw yellow)\b/},
 {id:'cafe',label:'Matcha & coffee',words:/\b(matcha|coffee\w*|caf[eé]|arabica|tea)(?![a-z])/},
 {id:'shopping',label:'Shopping',words:/\b(shopping|shops?|browse|browsing|souvenirs?|gachapon|3coins|kiddy land|okashi land|character street|ameyoko|tsutaya|ginza six|omotesando hills|takeshita|cat street|tamagotchi)\b/},
 {id:'entertainment',label:'Fun & rides',words:/\b(ride|rides|games?|sumo|makuuchi|ceremonial entrance|bow-twirling|teamlab|parade|show|mario kart|yoshi|mine cart|minion|jurassic|flying dinosaur|hollywood dream|jaws|hippogriff|forbidden journey|pooh|peter pan|small world|beauty and the beast|baymax|monsters|thunder mountain|splash mountain|haunted mansion|frozen|rapunzel|soaring|toy story|journey to the center|beyblade|giants|kawaii monster|cruise|kimono|night high|wonderland|arabian coast|mermaid lagoon)\b/},
 {id:'sightseeing',label:'Sightseeing',words:/\b(shrine|temple|jingu|todai-ji|buddha|bridge|crossing|statue|grove|stroll|wander|explore|photos|sky|rooftop|pagoda|museum|sign|yokocho|alley|pontocho|walk through|gion|hanamikoji|shirakawa|deer|terrace|after dark|at dusk|jinnan|koen-dori|dotonbori|gotokuji)\b/},
 {id:'hotel',label:'Hotel & rest',words:/\b(check in|check-in|check out|settle|reset|rest|early night|relax|unstructured|free time near|quiet|pool)\b/},
 {id:'admin',label:'Tickets & prep',words:/^(buy|book|get|reserve|pre-?book)\b[^.]*\b(dpa|premier access|tickets?|passes)\b|\b(tickets?|lockers?|luggage|forward|confirm|security|pass check|check passes|dpa availability|queue|bag drop|bags|pack|packing|room check|supplies|gates)\b/},
 {id:'other',label:'Other',words:null}
];
const BY_ID=new Map(ENTRY_TYPES.map(t=>[t.id,t]));
export const ENTRY_TYPE_IDS=ENTRY_TYPES.map(t=>t.id);
// Where a title says nothing, the place usually does.
const PLACES=[
 [/universal studios|nintendo world|minion park|disneyland|disneysea|kokugikan|ryogoku|tokyo dome|teamlab/,'entertainment'],
 [/station|airport/,'transport'],
 [/hotel|hilton|kanra/,'hotel'],
 [/market|food hall/,'food'],
 [/shrine|temple|park|bridge|street|crossing/,'sightseeing']
];
export function guessEntryType(step){
 const title=String(step?.title||'').toLowerCase();
 let best=null,at=Infinity;
 for(const t of ENTRY_TYPES){const m=t.words&&title.match(t.words);if(m&&m.index<at){best=t.id;at=m.index;}}
 if(best)return best;
 const place=String(step?.place||'').toLowerCase();
 return PLACES.find(([re])=>re.test(place))?.[1]||'other';
}
export const entryType=step=>BY_ID.get(BY_ID.has(step?.category)?step.category:guessEntryType(step));
// Ticking a stop off asks how it was only where the answer means something: a meal, a ride, a
// shrine. A train, a walk home, packing, a check-out or an early night are things that happened,
// not things anybody rates. A stop still waiting on a booking to be confirmed is not asked either.
export const UNRATED_TYPES=['transport','admin','hotel'];
export const worthRating=step=>!!step&&step.kind!=='review'&&!UNRATED_TYPES.includes(entryType(step).id);
