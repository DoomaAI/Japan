// Home is a stack of widgets, and which ones are on it — and in what order — is up to whoever is
// holding the phone. Lauren wants the step card and the tickets; Boston wants the weather and his
// to-dos above everything else; Nate wants the step card and nothing to scroll past. Like the
// bottom bar, it is kept on the phone rather than in the trip: it changes what this screen shows
// and nothing about where we are going, so there is nothing to sync and nothing to agree on.
//
// The day's heading and its strip of dates are not widgets. They say which day Home is about,
// and a Home that could be told to forget which day it was on would be no Home at all.
// On this day leads on an anniversary and is empty every other day; the day in brief comes next, a few lines read over breakfast; then the step we are on; what's next and what to carry
// sit straight under it, and the things read once a day — the guide, the tally, shop finds —
// come after.
export const HOME_WIDGETS={
 countdown:{label:'Trip countdown',note:'Days to go before we fly, then which day of the trip it is',off:true},
 onthisday:{label:'On this day',note:'After the trip: a day of it brought back a month, a year, on from when it happened'},
 runup:{label:'The run-up',note:'Before we fly: days to go, and a family task unlocked at 100, 50, 30, 14 and 7 days'},
 dailyjapan:{label:'A little Japan each day',note:'Before we fly: one phrase to say and one fact to read, every day of the run-up'},
 bookingwindows:{label:'Booking windows',note:'Bookings opening in the next fortnight, and any open but not yet booked',page:'windows'},
 briefing:{label:'The day in brief',note:'Which day it is, the stops, fixed times, weather, a hotel move and any app to set up'},
 todaysjapan:{label:'Phrase and fun fact of the day',note:'On the trip: the day’s phrase to say and fact to read, folded to one line or open'},
 step:{label:'The step we are on',note:'The current stop, swipe for the rest of the day'},
 reports:{label:'Reports from the family',note:'What the other phones said in the last two hours: the queue, the toilets, sold out'},
 codes:{label:'Codes found',note:'Parents: a ticket’s QR code has been read; add it to the Wallet, or leave it out'},
 nextup:{label:'What’s next',note:'The next stop, how long until it, and running late'},
 needs:{label:'Before we head out',note:'A tick for each thing to carry out the door, fresh each morning, with a streak'},
 links:{label:'Next fixed time',note:'The next time that cannot move, one tap from its stop'},
 stay:{label:'Tonight’s stay',note:'The hotel, which night, check-in and check-out, the confirmation number, directions and the taxi card'},
 running:{label:'Is everything running?',note:'Service status for today’s trains, and flight status on a flight day'},
 weather:{label:'Weather',note:'The day’s forecast, folded or open',page:'weather'},
 glance:{label:'The day at a glance',note:'A button to the day’s stops in order',off:true,action:true,page:'glance'},
 adjust:{label:'Adjust the day',note:'Move the rest of the day on (parents only)',off:true,action:true},
 tired:{label:'We’re tired',note:'Ways to take the rest of the day easier',off:true,action:true},
 apps:{label:'Useful apps',note:'Maps, translation, trains and the rest',off:true,action:true,page:'help'},
 todos:{label:'To-dos for the day',note:'Things to do or buy that are on this day',page:'todo'},
 packing:{label:'Packing reminder',note:'What is still out of the case before a hotel move',page:'packing'},
 tally:{label:'Day tally and tools',note:'How many are done, photos, voice notes and tickets'},
 finds:{label:'Shop finds',note:'Things we photographed in a shop on this day',page:'shortlist'},
 tonight:{label:'Tonight',note:'From five in the evening: star the best bits, vote for the photo of the day, leave a voice note'},
 guide:{label:'This day in the guide',note:'The original guide pages for the day',page:'guide'}
};
// The countdown starts put away and sits at the top once brought out, above the step card.
// The day's buttons — the day at a glance, adjust the day, we're tired, useful apps — live on
// Today, beside the stops they act on, so Home starts without them. Each can still be put on
// Home as a widget of its own; side by side they share one grid rather than stacking.
// The screen a widget is a slice of, where there is one, so More can say which screens are
// already on Home.
export const homePages=prefs=>new Set(homeShown(prefs).map(id=>HOME_WIDGETS[id].page).filter(Boolean));
export const HOME_OFF=Object.keys(HOME_WIDGETS).filter(id=>HOME_WIDGETS[id].off);
// Older phones stored the four as one 'actions' widget; wherever it sat, the four sit instead.
const LEGACY={actions:Object.keys(HOME_WIDGETS).filter(id=>HOME_WIDGETS[id].action)};
// The order Home comes in untouched, which is also where a widget added in a later version
// lands for somebody who has already arranged theirs.
export const HOME_DEFAULT=Object.keys(HOME_WIDGETS);
// hidden is what has been put away; shown is what has been brought out that starts off put away.
export const emptyHome=()=>({order:null,hidden:[],shown:[]});
// Whatever comes back out of localStorage was written by some version of this app, possibly an
// older one with widgets that no longer exist or without ones that do. So it is cleaned on the
// way in: unknown ids go, duplicates go, and anything new lands just after the widget it follows
// by default, wherever that has been moved to, rather than being lost at the foot of Home.
export function cleanHome(prefs){
 const known=id=>Object.hasOwn(HOME_WIDGETS,id);
 const shown=[...new Set((Array.isArray(prefs?.shown)?prefs.shown:[]).filter(id=>known(id)&&HOME_WIDGETS[id].off))];
 const hidden=[...new Set([...(Array.isArray(prefs?.hidden)?prefs.hidden:[]).filter(known),...HOME_OFF])].filter(id=>!shown.includes(id));
 if(!Array.isArray(prefs?.order))return {order:null,hidden,shown};
 const order=[...new Set(prefs.order.flatMap(id=>LEGACY[id]||[id]).filter(known))];
 HOME_DEFAULT.forEach((id,i)=>{if(!order.includes(id))order.splice(i?order.indexOf(HOME_DEFAULT[i-1])+1:0,0,id);});
 return {order,hidden,shown};
}
// Every widget in the order this person has put them, shown or not.
export const homeOrder=prefs=>cleanHome(prefs).order||HOME_DEFAULT;
// Just the ones Home actually draws.
export const homeShown=prefs=>{const {hidden}=cleanHome(prefs);return homeOrder(prefs).filter(id=>!hidden.includes(id));};
export function moveWidget(prefs,id,by){
 const order=[...homeOrder(prefs)],at=order.indexOf(id),to=at+by;
 if(at<0||to<0||to>=order.length)return cleanHome(prefs);
 order[at]=order[to];order[to]=id;
 return cleanHome({...prefs,order});
}
export function toggleWidget(prefs,id){
 const {hidden,shown}=cleanHome(prefs),off=hidden.includes(id);
 return cleanHome({order:homeOrder(prefs),
  hidden:off?hidden.filter(x=>x!==id):[...hidden,id],
  shown:off?[...shown,id]:shown.filter(x=>x!==id)});
}
// Home draws widgets in turn, except that the day's buttons, when they sit next to each other,
// are gathered into one run so they share a grid.
export function homeRuns(ids){
 const runs=[];
 for(const id of ids){
  const last=runs.at(-1);
  if(HOME_WIDGETS[id]?.action){if(Array.isArray(last))last.push(id);else runs.push([id]);}
  else runs.push(id);
 }
 return runs;
}
