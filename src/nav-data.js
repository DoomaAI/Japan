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
 thanks:{label:'Notes for Lauren',note:'Write and schedule her daily pop-up notes'}
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
 ['Just for you',['thanks']],
 ['For the boys',['challenges','games','spending','facts','mascot']]
];
export const primaryNav=user=>PRIMARY[user?.role==='child'?'child':'parent'];
const allowed=(id,user)=>(id!=='thanks'||user?.name==='Damien')&&(id!=='inbox'||user?.role==='parent');
// Whatever the bottom bar does not already show, grouped so a long list stays scannable.
export const moreSections=user=>{
 const shown=new Set(primaryNav(user));
 return MORE_SECTIONS
  .map(([title,ids])=>[title,ids.filter(id=>!shown.has(id)&&allowed(id,user))])
  .filter(([,ids])=>ids.length);
};
export const moreIds=user=>moreSections(user).flatMap(([,ids])=>ids);
// The bottom bar's More button stands in for every page it holds, so you never lose your place.
export const navActive=(tab,id,user)=>id==='more'?!primaryNav(user).includes(tab):tab===id;
