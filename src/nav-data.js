// One registry drives both the bottom bar and the More screen, so every page is reachable
// from exactly one place and nothing can be orphaned when a new page is added.
export const PAGES={
 today:{label:'Home',note:'What’s next today'},
 days:{label:'Days',note:'All sixteen days of the trip'},
 tickets:{label:'Tickets',note:'Bookings, luggage tags and QR codes'},
 inbox:{label:'Forwarded email',note:'Booking emails you sent in, waiting to be filed'},
 food:{label:'Food',note:'Dishes in Japanese and English, ticked and rated'},
 money:{label:'Yen',note:'What a price is in dollars, signal or not'},
 challenges:{label:'Missions',note:'Daily missions and whole-trip quests'},
 games:{label:'Games',note:'Letters, sumo, snake, and spot the difference in our own photos'},
 photos:{label:'Photos',note:'Everyone\u2019s photos, whose is whose, and the daily vote'},
 diary:{label:'Diary',note:'Completed activities, discoveries and photos'},
 places:{label:'Places & our map',note:'Directions and our Google My Map'},
 meeting:{label:'Meeting card',note:'If we get separated'},
 phrases:{label:'Phrases',note:'Greetings and travel Japanese, with how to say it'},
 facts:{label:'Fun facts',note:'A fact a day about what is coming up, and the whole collection'},
 help:{label:'Help & useful apps',note:'Translation, hotel directions, reminders'},
 options:{label:'Options & ideas',note:'Places and activities saved for later'},
 planning:{label:'Planning board',note:'Who we are, what we like, suggested ideas, and voting on them'},
 todo:{label:'To-do list',note:'Things to do or buy, on the day we will do them'},
 spending:{label:'Spending money',note:'What the boys have, what they bought and what is left'},
 weather:{label:'Weather',note:'Every day and every hour, with the graphs'},
 parks:{label:'Theme park rides',note:'Checklists, height limits and park maps'},
 shopping:{label:'Shopping list',note:'Souvenirs, gifts and things we need'},
 guide:{label:'Original travel guide',note:'All 72 pages, linked and searchable'},
 updates:{label:'Family updates',note:'What changed and who has seen it'},
 search:{label:'Search everything',note:'Find a booking, note, shop or guide page'},
 mascot:{label:'Our characters',note:'Design your own Japanese character and use it in the app'},
 thanks:{label:'Notes for Lauren',note:'Write and schedule her daily pop-up notes'},
 personalise:{label:'My menu',note:'Choose what you see, and the order it comes in'},
 settings:{label:'Settings',note:'Turn the daily phrase or the daily fun fact off'}
};
// The five that earn a place in the bottom bar, by who is holding the phone. Parents reach
// for tickets and prices; the boys reach for their missions. Everything else lives in More.
export const PRIMARY={
 parent:['today','days','tickets','food','money'],
 child:['today','days','challenges','food','diary']
};
// Ordered by whose hands the screen is for, top to bottom. The practical half of the trip is
// what Lauren and I open a menu for — the weather on the way out, the ticket at the gate, what
// is still to buy — so it sits at the top where a thumb lands first. The boys' half is last,
// as one block they can scroll to and recognise, rather than their missions being stranded
// between the bookings and the paperwork.
export const MORE_SECTIONS=[
 ['Out and about',['weather','places','money','food','phrases','meeting','help']],
 ['The plan',['todo','planning','options','parks','shopping','tickets','inbox']],
 ['Looking back',['photos','diary','updates','search','guide']],
 ['Just for you',['personalise','settings','thanks']],
 ['For the boys',['challenges','games','spending','facts','mascot']]
];
const allowed=(id,user)=>(id!=='thanks'||user?.name==='Damien')&&(id!=='inbox'||user?.role==='parent');
export const pagesFor=user=>Object.keys(PAGES).filter(id=>allowed(id,user));
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
// 3. Home is on the bar wherever they put it. It can be moved anywhere along it, but not off:
//    a swipe down the bar lands on whatever is first, and that has to be somewhere to land.
export const BAR_MIN=3,BAR_MAX=8;
export const FIXED=['today','personalise'];
export const emptyNav=()=>({bar:null,hidden:[]});
export function cleanNav(prefs,user){
 const ok=id=>!!PAGES[id]&&allowed(id,user);
 const hidden=[...new Set((Array.isArray(prefs?.hidden)?prefs.hidden:[]).filter(id=>ok(id)&&!FIXED.includes(id)))];
 let wanted=Array.isArray(prefs?.bar)
  ?[...new Set(prefs.bar.filter(id=>ok(id)&&!hidden.includes(id)))]
  :null;
 if(wanted&&!wanted.includes('today'))wanted=['today',...wanted];
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
// first and the boys' block last, which is the order they already know from More. Home and
// Days are in every bar rather than in a section, so they come first when one of them has been
// taken off a bar and is being offered back.
export const menuOrder=user=>{
 const order=[...new Set(['today','days',...MORE_SECTIONS.flatMap(([,ids])=>ids),...Object.keys(PAGES)])];
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
export const moreSections=(user,prefs)=>{
 const shown=new Set(primaryNav(user,prefs)),away=new Set(hiddenNav(user,prefs));
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
export const navActive=(tab,id,user,prefs)=>id==='more'?!primaryNav(user,prefs).includes(tab):tab===id;
