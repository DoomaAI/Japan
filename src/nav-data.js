// One registry drives both the bottom bar and the More screen, so every page is reachable
// from exactly one place and nothing can be orphaned when a new page is added.
export const PAGES={
 today:{label:'Home',note:'Your own widgets for the day: what’s next, weather, to-dos and more'},
 days:{label:'Itinerary',note:'All sixteen days of the trip'},
 glance:{label:'Plan',note:'Today\u2019s stops in order, ticked off as they happen, and every day of the trip one switch away'},
 tickets:{label:'Wallet',note:'Tonight’s stay, the next pass to scan, and every booking, tag and QR code'},
 inbox:{label:'Forwarded email',note:'Booking emails you sent in, waiting to be filed'},
 food:{label:'Food',note:'Dishes in Japanese and English, ticked and rated'},
 hunts:{label:'Hunts & lists',note:'Rate and rank every matcha, gachapon and ramen, lists of our own, and where each one was'},
 local:{label:'Like a local',note:'The bathhouse, the food hall, the tram and the Sunday market: what the locals do more than visitors, by base'},
 money:{label:'Yen',note:'What a price is in dollars, signal or not'},
 paying:{label:'Which card?',note:'The cheapest card or cash for a payment or an ATM, and each card\u2019s fees looked up'},
 ledger:{label:'Family spending',note:'What we have spent, by day and category, in yen and dollars'},
 challenges:{label:'Missions',note:'Daily missions and whole-trip quests'},
 games:{label:'Games',note:'Letters, sumo, snake, and spot the difference in our own photos'},
 photos:{label:'Photos',note:'Everyone\u2019s photos, whose is whose, and the daily vote'},
 memorymap:{label:'Memory map',note:'Photos, voice notes and stars where they happened, and where the family last was'},
 noticed:{label:'Things we noticed',note:'The little moments, said out loud and tagged to where they happened or what they were about'},
 diary:{label:'Diary',note:'Completed stops, discoveries and photos'},
 recap:{label:'Our trip story',note:'The trip in swipeable cards: the numbers, the places, our best bits and everyone’s favourite'},
 book:{label:'Photobook',note:'A page for each day, with the photo of the day, the stops we loved and the diary, to print'},
 places:{label:'Places & our map',note:'Directions and our Google My Map'},
 meeting:{label:'Meeting card',note:'If we get separated'},
 allergy:{label:'Allergy card',note:'What each of us cannot eat, in Japanese, to show the waiter'},
 safety:{label:'Safety & emergencies',note:'Emergency numbers, the boys\u2019 lost cards, the embassy, earthquakes and typhoons'},
 phrases:{label:'Phrases',note:'Greetings and travel Japanese, with how to say it'},
 stamps:{label:'Stamp book',note:'Stamps for the places, sights, rides and trains we have done, and everyone’s milestones'},
 leaderboard:{label:'Leaderboard',note:'Who has tried the most foods, ridden the most rides and taken the most photos'},
 facts:{label:'Fun facts',note:'A fact a day about what is coming up, and the whole collection'},
 help:{label:'Help & useful apps',note:'Translation, hotel directions, reminders'},
 options:{label:'Options & ideas',note:'Places and stops saved for later'},
 apps:{label:'Apps to download',note:'The local apps worth having for trains, taxis, the parks and alerts, and what to set up in each'},
 vault:{label:'Passports & visas',note:'Passport details, photos of each page, visas and insurance, encrypted, for Mum and Dad only'},
 arrival:{label:'Arrival paperwork',note:'Visit Japan Web for landing in Japan, and the Australia Travel Declaration for home'},
 flyinghome:{label:'Flying home',note:'What we bought against the passenger card, the duty-free allowance and the scales, read off our own lists'},
 homefront:{label:'Home while we’re away',note:'The house while we are gone and the first day back, one tap onto the to-do list, and the clocks-change note'},
 windows:{label:'Booking windows',note:'When the bookings that sell out open, in Japan and home time, with calendar alerts'},
 predictions:{label:'Sealed predictions',note:'Guess how the trip will go; the answers stay sealed until we are home'},
 planning:{label:'Planning board',note:'Who we are, what we like, suggested ideas, and voting on them'},
 ask:{label:'Ask about our trip',note:'Better today or tomorrow? Ask, and get an answer out of our own plan'},
 todo:{label:'To-do list',note:'Things to do or buy, on the day we will do them'},
 trackers:{label:'Tracker tags',note:'Which AirTag is in which bag, and the Find My link to where it is'},
 shop:{label:'Trip shop',note:'Adapters, cash, eSIMs and the rest to sort before we fly, and keepsakes made from the trip'},
 packing:{label:'Packing list',note:'What goes in the case, with suggestions for the weather and the days ahead'},
 spending:{label:'Spending money',note:'What the boys have, what they bought and what is left'},
 weather:{label:'Weather',note:'Every day and every hour, with the graphs'},
 parks:{label:'Theme park rides',note:'Checklists, height limits and park maps'},
 shopping:{label:'Shopping list',note:'Souvenirs, gifts and things we need'},
 shortlist:{label:'Purchase shortlist',note:'Things we have seen in a shop, photographed, priced and still to decide on'},
 printguide:{label:'Print our guide',note:'The travel guide rebuilt from the plan as it stands, to print or save as a PDF'},
 guide:{label:'Original travel guide',note:'All 72 pages, linked and searchable'},
 bin:{label:'Recently deleted',note:'Anything taken off a list in the last thirty days, ready to put back'},
 updates:{label:'Family updates',note:'What changed and who has seen it'},
 search:{label:'Search everything',note:'Find a booking, note, shop or guide page'},
 mascot:{label:'Our characters',note:'Design your own Japanese character and use it in the app'},
 thanks:{label:'Daily notes',note:'Write and schedule the daily pop-up notes for Lauren, Nate and Boston'},
 personalise:{label:'Customise',note:'Your bar, your Home widgets, and what you see'},
 settings:{label:'Settings',note:'The order of the shortcuts along the bottom, and the daily phrase or fun fact'}
};
// Four and More, as the leading hotel and event apps have it. Home is the dashboard and Plan is
// the day's stops with the whole trip one switch away. After that, parents reach for the wallet
// and the yen at a till or a gate; the boys reach for their missions and the food. Everything
// else lives in More, and anybody can put any screen back on their own bar.
export const PRIMARY={
 parent:['today','glance','tickets','money'],
 child:['today','glance','challenges','food']
};
// Ordered by whose hands the screen is for, top to bottom. The practical half of the trip is
// what Lauren and I open a menu for — the weather on the way out, the ticket at the gate, what
// is still to buy — so it sits at the top where a thumb lands first. The boys' half is last,
// as one block they can scroll to and recognise, rather than their missions being stranded
// between the bookings and the paperwork.
// Money is a section of its own: six screens about yen were scattered between what to see and
// what to pack, and a parent at a till wants them side by side. Looking back holds only the
// memories now; the app's own housekeeping (updates, the bin, search, the original guide) has
// a shelf of its own rather than sitting among the photos.
export const MORE_SECTIONS=[
 ['Out and about',['weather','ask','places','food','allergy','hunts','local','phrases','meeting','safety','help','apps']],
 ['Money',['money','paying','ledger','shopping','shortlist','shop']],
 ['The plan',['glance','days','todo','packing','trackers','windows','arrival','flyinghome','homefront','vault','planning','predictions','options','printguide','parks','tickets','inbox']],
 ['Looking back',['noticed','photos','memorymap','diary','recap','book']],
 ['Housekeeping',['updates','bin','search','guide']],
 ['Just for you',['personalise','settings','thanks']],
 ['For the boys',['challenges','stamps','leaderboard','games','spending','facts','mascot']]
];
// Some screens only exist where the deployment can do the thing they are about. Forwarded email
// needs a mail provider connected to it; until there is one the screen would be a page about a
// setting nobody has set, so it is not offered at all — not on the bar, not in the menu, not in
// the list of pages you can add. The app tells this module what the deployment can do when its
// config arrives, so connecting a provider brings the screen back on its own with no code change.
//
// Asking about the trip is the same shape: it needs an Anthropic key, and without one the screen
// would be a box that always answers "not switched on". So the registry holds one flag per such
// screen rather than a rule per screen, and a page with no flag is simply always there.
let available={inbox:false,ask:false};
export const setAvailable=next=>{available={...available,...next};};
export const isAvailable=id=>!(id in available)||available[id];
// Screens a child is not ready for yet, from the awareness dial a parent set (child-levels.js):
// out of the bar, More, favourites and search alike, and back the moment the dial moves.
let held=new Set();
export const setHeldBack=ids=>{held=new Set(ids||[]);};
export const isHeldBack=id=>held.has(id);
// The parents' screens: forwarded email, their money, and the family's passports.
export const PARENT_PAGES=['inbox','ledger','paying','vault'];
const allowed=(id,user)=>(id!=='thanks'||user?.name==='Damien')&&(!PARENT_PAGES.includes(id)||user?.role==='parent')&&isAvailable(id)&&!isHeldBack(id);
export const pagesFor=user=>Object.keys(PAGES).filter(id=>allowed(id,user));
// The handful of pages wanted in a hurry, in one row at the top of More, above the long list:
// the ones reached for with a child crying, a waiter waiting or the sky darkening. Nothing
// here is taken out of its section below; this row is a second way in, not a move.
export const RIGHT_NOW=['safety','meeting','allergy','phrases','weather','help'];
export const rightNow=user=>{const ok=new Set(pagesFor(user));return RIGHT_NOW.filter(id=>ok.has(id));};
// Favourites: the row at the top of More, made each person's own. Starring a card in any section
// puts it in the row; unstarring takes it out. It starts as the Right now six, so an untouched
// phone sees what it always has. Kept on the phone like the bar, and cleaned the same way on the
// way out of storage: unknown or no-longer-allowed screens are dropped, repeats collapse, and the
// row stops at a dozen so it stays a row of shortcuts rather than a second menu. An empty list is
// a real choice — somebody who unstars everything gets no row, not the defaults back.
export const FAV_MAX=12;
export const favourites=(user,saved)=>{
 if(!Array.isArray(saved))return rightNow(user);
 const ok=new Set(pagesFor(user));
 return [...new Set(saved.filter(id=>typeof id==='string'&&ok.has(id)))].slice(0,FAV_MAX);
};
export const toggleFavourite=(user,saved,id)=>{
 const now=favourites(user,saved);
 return now.includes(id)?now.filter(x=>x!==id):now.length<FAV_MAX?[...now,id]:now;
};
// The menu, as this person has arranged it. Four of us carry the same app and want different
// things out of it: Lauren lives on tickets and the plan, Boston on his missions and his money,
// and Nate opens three screens in the whole trip. So the bar is theirs to set — which screens
// are on it, in which order — and anything nobody on that phone ever opens can be put away.
//
// It is kept on the phone rather than in the trip, alongside the sumo rank and the saved guide
// pages, because it is about the phone in your hand and not about where we are going. Nothing
// here can change the plan, so nothing here needs to travel or to be agreed with anybody.
//
// Three rules hold whatever is stored, and all three are here rather than in the screen that
// edits it,
// because a stored menu outlives the screen that wrote it and can arrive from an older version
// of the app, from another person's phone, or half-eaten out of a full localStorage:
//
// 1. Home and My menu can never be hidden or dropped. One is the way back from anywhere, the
//    other is the way to undo whatever was just done here.
// 2. A bar that came out too short is not a bar. Anything under three is thrown away and the
//    one for your role is used instead, so nobody can leave themselves with a blank bottom.
// 3. Home is always first on the bar. It is pinned to the left edge, outside the strip that
//    scrolls, the way More is pinned to the right — the way back is never swiped out of reach —
//    and a swipe down the bar lands on whatever is first, which has to be somewhere to land.
//
// The strip between Home and More scrolls sideways like the days along the top, so the bar can
// hold more shortcuts than fit across a phone.
export const BAR_MIN=3,BAR_MAX=12;
export const FIXED=['today','personalise'];
export const emptyNav=()=>({bar:null,hidden:[]});
export function cleanNav(prefs,user){
 const ok=id=>!!PAGES[id]&&allowed(id,user);
 const hidden=[...new Set((Array.isArray(prefs?.hidden)?prefs.hidden:[]).filter(id=>ok(id)&&!FIXED.includes(id)))];
 let wanted=Array.isArray(prefs?.bar)
  ?[...new Set(prefs.bar.filter(id=>ok(id)&&!hidden.includes(id)))]
  :null;
 if(wanted)wanted=['today',...wanted.filter(id=>id!=='today')];
 if(wanted)wanted=wanted.slice(0,BAR_MAX);
 return {bar:wanted&&wanted.length>=BAR_MIN?wanted:null,hidden};
}
// The bar for somebody who has not arranged one, which is not simply the one for their role:
// a screen they have put away cannot come back on the bar through the back door. Taking one
// out can leave the row too short, so it is topped up from what they can still see, in menu
// order, rather than left as two buttons and a gap.
function fallbackBar(user,hidden){
 const away=new Set(hidden),mine=PRIMARY[user?.role==='child'?'child':'parent'];
 const base=mine.filter(id=>!away.has(id));
 if(base.length>=BAR_MIN)return base;
 const rest=menuOrder(user).filter(id=>!away.has(id)&&!base.includes(id));
 return [...base,...rest].slice(0,BAR_MIN);
}
// Everything this person can see, in the order the menu itself puts it: the practical half
// first and the boys' block last, which is the order they already know from More. Home, Today
// and the Itinerary are in every bar rather than in a section, so they come first when one of
// them has been taken off a bar and is being offered back.
export const menuOrder=user=>{
 const order=[...new Set(['today','glance','days',...MORE_SECTIONS.flatMap(([,ids])=>ids),...Object.keys(PAGES)])];
 return order.filter(id=>allowed(id,user));
};
// The bar along the bottom: theirs if they have set one, the one for their role if they have not.
export const primaryNav=(user,prefs)=>{
 const {bar,hidden}=cleanNav(prefs,user);
 return bar||fallbackBar(user,hidden);
};
export const hiddenNav=(user,prefs)=>cleanNav(prefs,user).hidden;
// Whatever the bottom bar does not already show, grouped so a long list stays scannable, and
// without whatever this person has put away. Nothing put away is lost: My menu lists it, and
// My menu is one of the two screens that can never be put away itself.
// With withBar, the bar's own screens are listed too, in their places, so More can mark them.
export const moreSections=(user,prefs,withBar=false)=>{
 const shown=new Set(withBar?[]:primaryNav(user,prefs)),away=new Set(hiddenNav(user,prefs));
 return MORE_SECTIONS
  .map(([title,ids])=>[title,ids.filter(id=>!shown.has(id)&&!away.has(id)&&allowed(id,user))])
  .filter(([,ids])=>ids.length);
};
export const moreIds=(user,prefs)=>moreSections(user,prefs).flatMap(([,ids])=>ids);
// What is left to put on the bar, in the order the menu itself is in, so the screen offering
// them is not offering a jumble.
export const addableNav=(user,prefs)=>{
 const on=new Set(primaryNav(user,prefs)),away=new Set(hiddenNav(user,prefs));
 return menuOrder(user).filter(id=>!on.has(id)&&!away.has(id));
};
// The bottom bar's More button stands in for every page it holds, so you never lose your place.
// Plan covers the whole trip as well as today, unless the Itinerary has a button of its own.
const covered=(tab,bar)=>bar.includes(tab)||(tab==='days'&&bar.includes('glance'));
export const navActive=(tab,id,user,prefs)=>{
 const bar=primaryNav(user,prefs);
 if(id==='more')return !covered(tab,bar);
 return tab===id||(id==='glance'&&tab==='days'&&!bar.includes('days'));
};
