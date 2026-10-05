import {moduleOn} from './plan-context.js';
// Apps to download used to be a page of its own beside Help; they are one page now, so a
// reminder, a briefing note or an old link that still says apps lands on Help.
export const PAGE_ALIASES={apps:'help'};
export const pageFor=id=>PAGE_ALIASES[id]||id;
// One registry drives both the bottom bar and the More screen, so every page is reachable
// from exactly one place and nothing can be orphaned when a new page is added.
export const PAGES={
 today:{label:'Home',note:'Your own widgets for the day: what’s next, weather, to-dos and more'},
 days:{label:'Itinerary',note:'All sixteen days of the trip'},
 glance:{label:'Plan',note:'Today\u2019s stops in order, ticked off as they happen, and every day of the trip one switch away'},
 tickets:{label:'Wallet',note:'Tonight’s stay, the next pass to scan, every booking, tag and QR code, and the emails still to file'},
 inbox:{label:'Forwarded email',note:'Booking emails you sent in, waiting to be filed'},
 food:{label:'Food',note:'Dishes in Japanese and English, ticked and rated'},
 hunts:{label:'Hunts & lists',note:'Rate and rank every matcha, gachapon and ramen, lists of our own, and where each one was'},
 local:{label:'Like a local',note:'The bathhouse, the food hall, the tram and the Sunday market: what the locals do more than visitors, by base'},
 money:{label:'FX',note:'What a price is in dollars, signal or not'},
 paying:{label:'Which card?',note:'The cheapest card or cash for a payment or an ATM, and each card\u2019s fees looked up'},
 ledger:{label:'Family spending',note:'What we have spent, by day and category, in yen and dollars'},
 challenges:{label:'Missions',note:'Daily missions and whole-trip quests'},
 games:{label:'Games',note:'Letters, sumo, snake, and spot the difference in our own photos'},
 photos:{label:'Photos',note:'Everyone\u2019s photos, whose is whose, and the daily vote'},
 memorymap:{label:'Memory map',note:'Photos, voice notes and stars where they happened, and where the family last was'},
 noticed:{label:'Things we noticed',note:'The little moments, said out loud and tagged to where they happened or what they were about'},
 nexttime:{label:'Next time',note:'What we would do differently, written on the stop while it was fresh, in one list for the next plan'},
 capsule:{label:'Open next year',note:'A note from each of us to the family a year on, sealed until the anniversary of the last day'},
 showtell:{label:'Show and tell',note:'One page per boy for the first day back at school: his photos, missions, a noticing, a phrase, read aloud first'},
 diary:{label:'Diary',note:'Completed stops, discoveries and photos'},
 highlights:{label:'Highlights video',note:'The best of the trip, cut into a short video with our sounds, to share'},
 recap:{label:'Our trip story',note:'The trip in swipeable cards, the highlights video to share, and the photobook to print'},
 book:{label:'Photobook',note:'A page for each day, with the photo of the day, the stops we loved and the diary, to print'},
 places:{label:'Places & our map',note:'Directions and our Google My Map'},
 meeting:{label:'Meeting card',note:'If we get separated'},
 whereabouts:{label:'Where we are',note:'The family on a map, sharing where you are for a while, and telling the others you’re running late'},
 allergy:{label:'Allergy card',note:'What each of us cannot eat, in Japanese, to show the waiter'},
 safety:{label:'Safety & emergencies',note:'Emergency numbers, the meeting card if we get separated, and what to do when something is lost'},
 lost:{label:'Lost something',note:'The Japanese to hand over, the right desk for today’s trains and parks, the kōban report and what the insurer asks for'},
 phrases:{label:'Phrases',note:'Greetings and travel Japanese, with how to say it'},
 stamps:{label:'Stamp book',note:'Stamps for the places, sights, rides and trains we have done, and everyone’s milestones'},
 leaderboard:{label:'Leaderboard',note:'Who has tried the most foods, ridden the most rides and taken the most photos'},
 facts:{label:'Fun facts',note:'A fact a day about what is coming up, and the whole collection'},
 help:{label:'Help & apps',note:'Hotel directions, translation, and the apps to download with what to set up in each'},
 options:{label:'Options & ideas',note:'Places and stops saved for later'},
 vault:{label:'Passports & visas',note:'Passport details, photos of each page, visas and insurance, encrypted, for Mum and Dad only'},
 arrival:{label:'Borders & customs',note:'Visit Japan Web on the way in; the declaration, passenger card, duty-free and the scales on the way home'},
 flyinghome:{label:'Flying home',note:'What we bought against the passenger card, the duty-free allowance and the scales, read off our own lists'},
 homefront:{label:'Home while we’re away',note:'The house while we are gone and the first day back, one tap onto the to-do list, and the clocks-change note'},
 windows:{label:'Booking windows',note:'When the bookings that sell out open, in Japan and home time, with calendar alerts'},
 predictions:{label:'Sealed predictions',note:'Guess how the trip will go; the answers stay sealed until we are home'},
 guests:{label:'Who’s coming',note:'Your answer to the invitation, who is in, and what the organiser needs to know'},
 invitation:{label:'Invitation',note:'What guests read at the link, the questions they are asked, and the link itself'},
 planning:{label:'Planning board',note:'Who we are, what we like, suggested ideas, voting on them, and the ideas with no date yet'},
 ask:{label:'Concierge',note:'Better today or tomorrow? Ask, and get an answer from our own plan'},
 todo:{label:'To-do list',note:'Things to do or buy, on the day we will do them'},
 trackers:{label:'Tracker tags',note:'Which AirTag is in which bag, and the Find My link to where it is'},
 shop:{label:'Trip shop',note:'Adapters, cash, eSIMs and the rest to sort before we fly, and keepsakes made from the trip'},
 packing:{label:'Packing list',note:'What goes in the case, with suggestions for the weather and the days ahead'},
 spending:{label:'Spending money',note:'What the boys have, what they bought and what is left'},
 weather:{label:'Weather',note:'Every day and every hour, with the graphs'},
 nightstand:{label:'Nightstand',note:'The phone by the bed: the clock, tomorrow’s first fixed time and leave-by, the forecast and the alarm, dim after ten'},
 parks:{label:'Theme park rides',note:'Checklists, height limits and park maps'},
 shopping:{label:'Shopping list',note:'Souvenirs, gifts and things we need, what we saw and have not decided on, and the trip shop'},
 shortlist:{label:'Purchase shortlist',note:'Things we have seen in a shop, photographed, priced and still to decide on'},
 printguide:{label:'Print our guide',note:'The travel guide rebuilt from the plan as it stands, to print or save as a PDF'},
 guide:{label:'Original travel guide',note:'All 72 pages, linked and searchable'},
 bin:{label:'Recently deleted',note:'Anything taken off a list in the last thirty days, ready to put back'},
 updates:{label:'Family updates',note:'What changed and who has seen it'},
 search:{label:'Search everything',note:'Find a booking, note, shop or guide page'},
 mascot:{label:'Our characters',note:'Design your own Japanese character and use it in the app'},
 thanks:{label:'Daily notes',note:'Write and schedule the daily pop-up notes for Lauren, Nate and Boston'},
 personalise:{label:'Customise',note:'Your bar, your Home widgets and what you see, and the app’s settings'},
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
// Screens that answer one question from two or three sides are one card (JOINED, below), so a
// joined screen is reached through its host's card and the switch at the top of the page.
export const MORE_SECTIONS=[
 ['Out and about',['weather','ask','places','food','allergy','hunts','local','phrases','whereabouts','safety','help']],
 ['Money',['money','paying','ledger','shopping']],
 ['The plan',['glance','guests','invitation','todo','packing','trackers','windows','arrival','homefront','vault','planning','predictions','printguide','parks','tickets']],
 ['Looking back',['noticed','nexttime','photos','memorymap','diary','recap','capsule']],
 ['Housekeeping',['updates','bin','search','guide']],
 ['Just for you',['nightstand','personalise','thanks']],
 ['For the boys',['challenges','stamps','leaderboard','games','spending','facts','mascot','showtell']]
];
// The boys' own pages. Under a quiet look (Washi) these keep their colour and their rounder
// corners, since a game board or a stamp book is meant to be bright.
export const KIDS_PAGES=MORE_SECTIONS.find(([label])=>label==='For the boys')[1];
export const isKidsPage=id=>KIDS_PAGES.includes(id);
// One card, several screens. Each group is one question seen from two or three sides — the day
// and the whole trip; something
// has gone wrong; the passes and the emails still to be filed;
// the border on the way in and on the way out; the board and the ideas with no date yet; the
// trip told three ways; what to buy, what we saw and what to sort before and after; the phone arranged and the app set up — so More has one card for it,
// the host (first), and every screen in it carries the same switch at the top, the way Plan's
// Today | All days does. The screens keep their own ids, so a deep link, a favourite, a bar
// somebody has already arranged and every go('meeting') in the app still land where they did.
export const JOINED=[
 ['glance','days'],
 ['safety','meeting','lost'],
 ['tickets','inbox'],
 ['arrival','flyinghome'],
 ['planning','options'],
 ['recap','highlights','book'],
 ['shopping','shortlist','shop'],
 ['personalise','settings']
];
// The words on the switch, short enough for three across a phone.
export const JOINED_TABS={glance:'Today',days:'All days',safety:'Emergency',meeting:'Separated',lost:'Lost item',
 tickets:'Passes',inbox:'To file',arrival:'Paperwork',flyinghome:'Flying home',planning:'Board',options:'No date yet',
 recap:'Story',highlights:'Video',book:'Photobook',shopping:'To buy',shortlist:'Seen it',shop:'Trip shop',personalise:'Customise',settings:'Settings'};
export const joinedGroup=id=>JOINED.find(g=>g.includes(id))||null;
export const joinedTitle=id=>PAGES[joinedGroup(id)?.[0]]?.label||'';
// Screens with no card of their own: reached through their host, never offered as a card.
export const isJoinedMember=id=>!!joinedGroup(id)&&joinedGroup(id)[0]!==id;
// The switch for the screen in hand: the screens of its group this person can open, or nothing
// when that is only the one (a boy's Wallet has no emails to file, so it has no switch).
export const joinedTabs=(id,user)=>{
 const g=joinedGroup(id);if(!g)return [];
 const ok=g.filter(x=>allowed(x,user));
 return ok.length>1&&ok.includes(id)?ok:[];
};
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
export const PARENT_PAGES=['inbox','ledger','paying','vault','invitation'];
// And what kind of plan this is (plan-context.js): a dinner has no packing list and no
// passports page, a wedding has no missions. The app hands the plan record over when the plan
// arrives, and the type's switches and the organiser's own take the page out of the bar, More,
// favourites and search alike. A plan with no record is the family trip, which switches off nothing.
let plan=null;
export const setPlan=next=>{plan=next||null;};
export const isModuleOn=id=>!plan||moduleOn(plan,id);
const allowed=(id,user)=>(id!=='thanks'||user?.name==='Damien')&&(!PARENT_PAGES.includes(id)||user?.role==='parent')&&isAvailable(id)&&!isHeldBack(id)&&isModuleOn(id);
export const pagesFor=user=>Object.keys(PAGES).filter(id=>allowed(id,user));
// The handful of pages wanted in a hurry (the meeting card is the first tab of Safety), in one row at the top of More, above the long list:
// the ones reached for with a child crying, a waiter waiting or the sky darkening. Nothing
// here is taken out of its section below; this row is a second way in, not a move.
export const RIGHT_NOW=['safety','allergy','phrases','weather','help'];
export const rightNow=user=>{const ok=new Set(pagesFor(user));return RIGHT_NOW.filter(id=>ok.has(id));};
// Favourites: the row at the top of More, made each person's own. Starring a card in any section
// puts it in the row; unstarring takes it out. It starts as the Right now five, so an untouched
// phone sees what it always has. Kept on the phone like the bar, and cleaned the same way on the
// way out of storage: unknown or no-longer-allowed screens are dropped, repeats collapse, and the
// row stops at a dozen so it stays a row of shortcuts rather than a second menu. An empty list is
// a real choice — somebody who unstars everything gets no row, not the defaults back.
//
// A screen is on the bar or in favourites, never both: the bar is already one tap away, so a
// favourite that is also on the bar is a wasted place in the sheet. Whatever the bar holds is
// left out of the favourites as they are read, so no way of putting a screen on the bar —
// the sheet, Customise, an old saved list — can make a double.
export const FAV_MAX=12;
export const favourites=(user,saved,bar=[])=>{
 const off=new Set(bar||[]);
 if(!Array.isArray(saved))return rightNow(user).filter(id=>!off.has(id));
 const ok=new Set(pagesFor(user));
 return [...new Set(saved.filter(id=>typeof id==='string'&&ok.has(id)&&!off.has(id)))].slice(0,FAV_MAX);
};
export const toggleFavourite=(user,saved,id,bar=[])=>{
 const now=favourites(user,saved,bar);
 if((bar||[]).includes(id))return now;
 return now.includes(id)?now.filter(x=>x!==id):now.length<FAV_MAX?[...now,id]:now;
};
// The same favourites open as a sheet from the bar: a swipe up it, or the handle on top of it.
// One list, kept in one place, so a card starred on More is in the sheet and one chosen in the
// sheet is in the row on More. The sheet is only as tall as the favourites in it — rows of
// FAV_COLS, so the default five are two rows and a full dozen three — and never a scroll.
export const FAV_COLS=4;
export const favRows=n=>Math.max(1,Math.ceil(Math.max(0,n|0)/FAV_COLS));
// Choosing favourites in the sheet lists every screen this person can open, the bar's own
// included, in the sections More uses, so it is plain which are chosen and where the rest are.
// Typing narrows it by name or by what the screen is for; sections with nothing left drop out.
export const pickerSections=(user,prefs,find='')=>{
 const q=String(find||'').trim().toLowerCase();
 const hit=id=>!q||PAGES[id].label.toLowerCase().includes(q)||PAGES[id].note.toLowerCase().includes(q);
 return moreSections(user,prefs,true).map(([title,ids])=>[title,ids.filter(hit)]).filter(([,ids])=>ids.length);
};
// Where a card dragged about on More lands in the row. Onto another favourite it takes that
// one's place, whether it was already in the row or has come up from a section; onto the row's
// empty end it goes last; dropped anywhere else (null) it leaves the row. A new card is turned
// away once the row is full, the same cap as starring.
export const dropFavourite=(list,id,onto,max=FAV_MAX)=>{
 const had=list.includes(id),rest=list.filter(x=>x!==id);
 if(onto===null)return rest;
 if(!had&&list.length>=max)return [...list];
 const at=onto===id?list.indexOf(id):onto===undefined?rest.length:list.indexOf(onto);
 if(at<0)return [...rest,id];
 rest.splice(at,0,id);
 return rest;
};
// The bar and the favourites, arranged together in the sheet. Each screen is in one place:
// the bar, the favourites, or neither. placeScreen moves one screen to 'bar', 'fav' or null
// (out of both), next to `onto` if it is given and at the end if not, and hands back both
// lists. The bar's own rules still hold — Home first and never moved, Customise never taken
// off, no fewer than BAR_MIN and no more than BAR_MAX — and each list keeps its cap. A move
// that would break one comes back unchanged with `refused` saying why, for the sheet to show.
export const menuLayout=(user,prefs,saved)=>{
 const bar=primaryNav(user,prefs);
 return {bar,favs:favourites(user,saved,bar)};
};
export function placeScreen(user,prefs,saved,id,to,onto){
 const layout=menuLayout(user,prefs,saved);
 if(!PAGES[id]||!pagesFor(user).includes(id))return layout;
 return moveScreen(layout,id,to,onto);
}
// The same move on lists already in hand, so a drag can show where a chip will land as it goes.
export function moveScreen({bar,favs},id,to,onto){
 const same={bar,favs};
 const from=bar.includes(id)?'bar':favs.includes(id)?'fav':null;
 if(id===bar[0]&&to!=='bar')return {...same,refused:`${PAGES[id].label} is always first on the bar.`};
 if(from==='bar'&&to!=='bar'){
  if(FIXED.includes(id))return {...same,refused:`${PAGES[id].label} stays on the bar.`};
  if(bar.length<=BAR_MIN)return {...same,refused:`The bar needs at least ${BAR_MIN-1} shortcuts.`};
 }
 if(to==='bar'&&from!=='bar'&&bar.length>=BAR_MAX)return {...same,refused:`The bar is full at ${BAR_MAX-1} shortcuts.`};
 if(to==='fav'&&from!=='fav'&&favs.length>=FAV_MAX)return {...same,refused:`Favourites are full at ${FAV_MAX}.`};
 let nextBar=to==='bar'?bar:bar.filter(x=>x!==id),nextFavs=to==='fav'?favs:favs.filter(x=>x!==id);
 if(to==='bar'){
  // Nothing goes in front of Home: dropped on it, a screen lands just after.
  const at=onto===bar[0]?bar[1]:onto;
  nextBar=dropFavourite(bar,id,at===undefined||at===null?undefined:at,BAR_MAX);
  if(nextBar[0]!==bar[0])nextBar=[bar[0],...nextBar.filter(x=>x!==bar[0])];
 }
 if(to==='fav')nextFavs=dropFavourite(favs,id,onto===null?undefined:onto);
 return {bar:nextBar,favs:nextFavs};
}
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
export const emptyNav=()=>({bar:null,hidden:[],order:[]});
export function cleanNav(prefs,user){
 const ok=id=>!!PAGES[id]&&allowed(id,user);
 const hidden=[...new Set((Array.isArray(prefs?.hidden)?prefs.hidden:[]).filter(id=>ok(id)&&!FIXED.includes(id)))];
 let wanted=Array.isArray(prefs?.bar)
  ?[...new Set(prefs.bar.filter(id=>ok(id)&&!hidden.includes(id)))]
  :null;
 if(wanted)wanted=['today',...wanted.filter(id=>id!=='today')];
 if(wanted)wanted=wanted.slice(0,BAR_MAX);
 // The order of the cards on More, as this person arranged them. Only what they can see is
 // kept; anything new or never moved falls in after it, where the menu itself puts it.
 const order=[...new Set((Array.isArray(prefs?.order)?prefs.order:[]).filter(ok))];
 return {bar:wanted&&wanted.length>=BAR_MIN?wanted:null,hidden,order};
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
// them has been taken off a bar and is being offered back. A joined screen is offered as its
// host, never on its own; a bar or favourite that already holds one keeps it. The Itinerary is
// the exception, as it was before: it is what a bar short of screens falls back on.
export const menuOrder=user=>{
 const order=[...new Set(['today','glance','days',...MORE_SECTIONS.flatMap(([,ids])=>ids),...Object.keys(PAGES)])];
 return order.filter(id=>allowed(id,user)&&(id==='days'||!isJoinedMember(id)));
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
// The yen converter is the one card Money always shows, on the bar or not: Money is where a
// parent at a till looks for it, and a shelf of money without the yen on it reads as missing one.
export const ALWAYS_LISTED=['money'];
export const moreSections=(user,prefs,withBar=false)=>{
 const shown=new Set(withBar?[]:primaryNav(user,prefs).filter(id=>!ALWAYS_LISTED.includes(id))),away=new Set(hiddenNav(user,prefs));
 const rank=arranged(cleanNav(prefs,user).order);
 return MORE_SECTIONS
  .map(([title,ids])=>[title,inOrder(ids.filter(id=>!shown.has(id)&&!away.has(id)&&allowed(id,user)),rank)])
  .filter(([,ids])=>ids.length);
};
// Cards are arranged within their own section: a card moved to the top of Out and about stays
// in Out and about. Anything this person has never moved keeps the place the menu gives it,
// after the ones they have.
const arranged=order=>new Map(order.map((id,i)=>[id,i]));
const inOrder=(ids,rank)=>ids.map((id,i)=>[id,rank.has(id)?rank.get(id):ORDER_TAIL+i]).sort((a,b)=>a[1]-b[1]).map(([id])=>id);
const ORDER_TAIL=1e6;
// One card along its section by one place, as the section is on the screen right now. The
// whole section is written down in its new order, so the next move starts from what was seen.
export const moveInMore=(prefs,section,id,by)=>{
 const at=section.indexOf(id),to=at+by;
 if(at<0||to<0||to>=section.length)return prefs;
 const list=[...section];list[at]=list[to];list[to]=id;
 return arrangeInMore(prefs,list);
};
// A whole section in a new order, as it was left after dragging its cards about.
export const arrangeInMore=(prefs,list)=>{
 const rest=(Array.isArray(prefs?.order)?prefs.order:[]).filter(x=>!list.includes(x));
 return {...prefs,order:[...rest,...list]};
};
// Put away straight from More, with the same rule as Customise: Home and Customise stay.
export const hideInMore=(prefs,id)=>FIXED.includes(id)?prefs:{
 ...prefs,
 bar:Array.isArray(prefs?.bar)?prefs.bar.filter(x=>x!==id):prefs?.bar??null,
 hidden:[...new Set([...(prefs?.hidden||[]),id])]
};
export const moreIds=(user,prefs)=>moreSections(user,prefs).flatMap(([,ids])=>ids);
// What is left to put on the bar, in the order the menu itself is in, so the screen offering
// them is not offering a jumble.
export const addableNav=(user,prefs)=>{
 const on=new Set(primaryNav(user,prefs)),away=new Set(hiddenNav(user,prefs));
 return menuOrder(user).filter(id=>!on.has(id)&&!away.has(id));
};
// The bottom bar's More button stands in for every page it holds, so you never lose your place.
// Plan covers the whole trip as well as today, unless the Itinerary has a button of its own;
// a joined screen lights its host's button the same way.
// A joined screen is covered by the first of its group on the bar, when it is not there itself.
const joinedLit=(tab,bar)=>bar.includes(tab)?null:(joinedGroup(tab)||[]).find(x=>bar.includes(x))||null;
const covered=(tab,bar)=>bar.includes(tab)||(tab==='days'&&bar.includes('glance'))||!!joinedLit(tab,bar);
export const navActive=(tab,id,user,prefs)=>{
 const bar=primaryNav(user,prefs);
 if(id==='more')return !covered(tab,bar);
 return tab===id||(id==='glance'&&tab==='days'&&!bar.includes('days'))||joinedLit(tab,bar)===id;
};
