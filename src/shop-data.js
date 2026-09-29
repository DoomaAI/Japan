// The trip shop: the things worth buying for a trip like this one, and when. Two halves.
//
// The essentials pack is what has to be sorted before the flight — a plug that fits, data on
// landing, the first yen, a travel card — each with how far ahead to do it, so it can one day
// sit on the run-up countdown next to the booking windows. The keepsakes are the things made out
// of the trip itself: shirts with the boys' own characters before we go, and the photobook, a
// calendar and prints once we are home.
//
// Nothing here is sold by the app. Every link goes straight to the shop or the official page.
// Three seams are left for a version that might one day earn from it, all in this file so the
// screen never has to change:
//
// 1. shopLink() is the only way a link leaves this page. A partner's referral tag goes in
//    PARTNERS, keyed by host, and every link to that host picks it up.
// 2. partnered() says whether a link carries one, and the screen shows a plain disclosure line
//    when any link on it does. Australian consumer law expects that to be said up front.
// 3. Each keepsake names the trip material it is made from and a print provider (none yet), so
//    ordering can later be a call from the server with the family's own pictures.
//
// Written September 2026. The official pages were checked by search; the shop links have not
// yet been opened from a phone. Shops move their pages; the official ones move less.

// host -> function(url) returning the partnered URL. Empty: nothing on this page earns anything.
export const PARTNERS={};
const hostOf=url=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}};
export const partnered=url=>!!PARTNERS[hostOf(url)];
export function shopLink(url){
 const tag=PARTNERS[hostOf(url)];
 if(!tag)return url;
 try{return tag(url);}catch{return url;}
}

// Essentials: `lead` is days before the flight to have it done by; `page` is a screen in the app
// that already covers part of it; `buy` is a list of [label, url].
export const ESSENTIALS=[
 {id:'insurance',emoji:'🛡️',title:'Travel insurance',lead:60,
  why:'Bought when the flights are booked, so cancellation is covered from then. Check it covers the boys, theme-park rides and any existing conditions.',
  page:'safety',buy:[['Smartraveller: choosing a policy','https://www.smartraveller.gov.au/before-you-go/travel-insurance'],['Smartraveller: Japan advice','https://www.smartraveller.gov.au/destinations/asia/japan']]},
 {id:'rail',emoji:'🚄',title:'Rail passes and big tickets',lead:45,
  why:'Work out whether a JR Pass beats single tickets for the route before buying one; since the 2023 price rise it often does not. Theme-park tickets and sumo go on sale on set dates.',
  page:'windows',buy:[['Japan Rail Pass (official)','https://japanrailpass.net/en/']]},
 {id:'cash',emoji:'💴',title:'Core cash',lead:14,
  why:'Japan still runs on cash in small places: shrines, food stalls, lockers, gachapon. Land with enough yen for the first day, then top up from 7-Eleven ATMs, which take Australian cards.',
  page:'paying',buy:[['Wise travel card','https://wise.com/au/card/'],['Travelex (order yen)','https://www.travelex.com.au/'],['Seven Bank ATMs for overseas cards','https://www.sevenbank.co.jp/intlcard/card2.html']]},
 {id:'esim',emoji:'📶',title:'eSIM for data',lead:7,
  why:'Installed at home on wi-fi, switched on at landing. Phones must be carrier-unlocked. Keep the Australian SIM on for bank codes by text, with its roaming off.',
  buy:[['Airalo Japan eSIM','https://www.airalo.com/japan-esim'],['Ubigi','https://www.ubigi.com/'],['Telstra international roaming','https://www.telstra.com.au/international-roaming']]},
 {id:'power',emoji:'🔌',title:'Plug adapters',lead:7,
  why:'Japan uses flat two-pin plugs (Type A) at 100 volts. Australian plugs do not fit. Phone and laptop chargers work on 100–240 V; check hair tools. One adapter each plus a small power board covers a hotel room.',
  page:'packing',buy:[['JB Hi-Fi: travel adapters','https://www.jbhifi.com.au/search?query=travel%20adapter%20japan'],['Officeworks: travel adapters','https://www.officeworks.com.au/shop/officeworks/search?q=travel%20adapter%20japan']]},
 {id:'ic',emoji:'🎫',title:'IC travel cards',lead:3,
  why:'Suica or PASMO pays for trains, buses, lockers and convenience stores. Parents can add one to Apple Wallet before landing; the boys get child cards at a station office with their passports.',
  page:'money',buy:[['JR East: Suica','https://www.jreast.co.jp/en/multi/pass/suica.html'],['JR East: Welcome Suica for visitors','https://www.jreast.co.jp/en/multi/welcomesuica/welcomesuica.html']]},
 {id:'battery',emoji:'🔋',title:'Power banks',lead:3,
  why:'Maps and tickets drain phones by mid-afternoon. Power banks go in hand luggage only, never the checked case, and airlines limit their size.',
  page:'packing',buy:[['JB Hi-Fi: power banks','https://www.jbhifi.com.au/search?query=power%20bank']]},
 {id:'luggage',emoji:'🧳',title:'Luggage forwarding',lead:0,
  why:'Done on the trip, not before: send the big cases hotel to hotel the day before a train move and travel light. Hotel front desks book it.',
  buy:[['Yamato: hands-free travel','https://www.global-yamato.com/en/hands-free-travel/']]}
];

// Where an essential stands against the flight. `daysToGo` is whole days until the first day of
// the trip; null once the trip has started.
export function essentialDue(item,daysToGo){
 if(daysToGo==null||daysToGo<0)return item.lead===0?'now':'past';
 if(daysToGo<=item.lead)return 'now';
 return daysToGo-item.lead<=14?'soon':'later';
}
export const daysUntil=(state,today)=>{
 const first=state?.days?.[0]?.date;
 if(!first||!today)return null;
 return Math.round((Date.parse(`${first}T00:00:00Z`)-Date.parse(`${today}T00:00:00Z`))/86400000);
};

// Keepsakes: `when` is before or after the trip; `from` is the trip material it is made from;
// `provider` is the print service an order would go to, null until one is chosen.
export const KEEPSAKES=[
 {id:'shirts',when:'before',emoji:'👕',title:'Family trip shirts',from:'characters',
  why:'Each shirt with its wearer’s own character from Our characters, in one bright colour for everyone, so the boys are easy to spot in a station crowd.',
  page:'mascot',provider:null,buy:[['Redbubble (Australian print on demand)','https://www.redbubble.com/'],['Printful','https://www.printful.com/']]},
 {id:'tags',when:'before',emoji:'🏷️',title:'Bag tags and stickers',from:'characters',
  why:'A character sticker sheet for each boy, and name tags on the cases to match the tracker tags.',
  page:'trackers',provider:null,buy:[['Redbubble: stickers','https://www.redbubble.com/shop/stickers']]},
 {id:'book',when:'after',emoji:'📖',title:'Printed photobook',from:'photos',
  why:'The Photobook page, printed and bound: a page a day with the photo of the day, the stops we loved and the diary.',
  page:'book',provider:null,buy:[['Momento (Australian photobooks)','https://www.momento.com.au/'],['Officeworks photo printing','https://www.officeworks.com.au/']]},
 {id:'calendar',when:'after',emoji:'🗓️',title:'A calendar for next year',from:'photos',
  why:'Twelve photos of the day, one a month, with the date each was taken. A present for the grandparents.',
  page:'photos',provider:null,buy:[['Momento: calendars','https://www.momento.com.au/']]},
 {id:'map',when:'after',emoji:'🗺️',title:'Our route, printed',from:'days',
  why:'The memory map as a wall print: every city and the line between them, with the stops we starred.',
  page:'memorymap',provider:null,buy:[['Gelato (print on demand, prints in Australia)','https://www.gelato.com/']]},
 {id:'stamps',when:'after',emoji:'🔴',title:'Stamp book poster',from:'stamps',
  why:'Every stamp the family earned, on one sheet, for the boys’ walls.',
  page:'stamps',provider:null,buy:[['Officeworks photo printing','https://www.officeworks.com.au/']]}
];

// What the trip has given us to make keepsakes from, so each one can say whether it is ready.
export function keepsakeMaterial(state){
 const people=state?.members||[];
 const characters=people.filter(p=>String(state?.mascots?.[p]?.name||'').trim()).length;
 const votes=state?.photoVotes||{};
 const photos=Object.keys(votes).filter(d=>Object.keys(votes[d]||{}).length).length;
 const days=new Set((state?.steps||[]).filter(s=>s.status==='done').map(s=>s.day)).size;
 // Stops ticked done stand in for stamps: every stamp in the stamp book comes from one.
 const stamps=(state?.steps||[]).filter(s=>s.status==='done').length;
 return {characters,photos,days,stamps};
}
export function keepsakeReady(item,material){
 const n=material?.[item.from]||0;
 const need={characters:1,photos:6,days:3,stamps:10}[item.from]||1;
 return {have:n,need,ready:n>=need};
}
