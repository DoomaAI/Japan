// Home is a stack of widgets, and which ones are on it — and in what order — is up to whoever is
// holding the phone. Lauren wants the step card and the tickets; Boston wants the weather and his
// to-dos above everything else; Nate wants the step card and nothing to scroll past. Like the
// bottom bar, it is kept on the phone rather than in the trip: it changes what this screen shows
// and nothing about where we are going, so there is nothing to sync and nothing to agree on.
//
// The day's heading and its strip of dates are not widgets. They say which day Home is about,
// and a Home that could be told to forget which day it was on would be no Home at all.
// The step we are on comes first and fills the screen on its own; what's next and what to carry
// sit straight under it, and the things read once a day — the guide, the tally, shop finds —
// come after.
export const HOME_WIDGETS={
 step:{label:'The step we are on',note:'The current stop, swipe for the rest of the day'},
 nextup:{label:'What’s next',note:'The next stop, how long until it, and running late'},
 needs:{label:'Before we head out',note:'What to carry out the door this morning'},
 links:{label:'Next fixed time and hotel',note:'The next time that cannot move, then tonight’s hotel'},
 weather:{label:'Weather',note:'The day’s forecast, folded or open'},
 glance:{label:'The day at a glance',note:'A button to the day’s stops in order',off:true,action:true},
 adjust:{label:'Adjust the day',note:'Move the rest of the day on (parents only)',off:true,action:true},
 tired:{label:'We’re tired',note:'Ways to take the rest of the day easier',off:true,action:true},
 apps:{label:'Useful apps',note:'Maps, translation, trains and the rest',off:true,action:true},
 todos:{label:'To-dos for the day',note:'Things to do or buy that are on this day'},
 packing:{label:'Packing reminder',note:'What is still out of the case before a hotel move'},
 tally:{label:'Day tally and tools',note:'How many are done, photos, voice notes and tickets'},
 finds:{label:'Shop finds',note:'Things we photographed in a shop on this day'},
 guide:{label:'This day in the guide',note:'The original guide pages for the day'}
};
// The day's buttons — the day at a glance, adjust the day, we're tired, useful apps — live on
// Today, beside the stops they act on, so Home starts without them. Each can still be put on
// Home as a widget of its own; side by side they share one grid rather than stacking.
export const HOME_OFF=Object.keys(HOME_WIDGETS).filter(id=>HOME_WIDGETS[id].off);
// Older phones stored the four as one 'actions' widget; wherever it sat, the four sit instead.
const LEGACY={actions:HOME_OFF};
// The order Home comes in untouched, which is also where a widget added in a later version
// lands for somebody who has already arranged theirs.
export const HOME_DEFAULT=Object.keys(HOME_WIDGETS);
// hidden is what has been put away; shown is what has been brought out that starts off put away.
export const emptyHome=()=>({order:null,hidden:[],shown:[]});
// Whatever comes back out of localStorage was written by some version of this app, possibly an
// older one with widgets that no longer exist or without ones that do. So it is cleaned on the
// way in: unknown ids go, duplicates go, and anything new is added at the end rather than lost.
export function cleanHome(prefs){
 const known=id=>Object.hasOwn(HOME_WIDGETS,id);
 const shown=[...new Set((Array.isArray(prefs?.shown)?prefs.shown:[]).filter(id=>known(id)&&HOME_WIDGETS[id].off))];
 const hidden=[...new Set([...(Array.isArray(prefs?.hidden)?prefs.hidden:[]).filter(known),...HOME_OFF])].filter(id=>!shown.includes(id));
 if(!Array.isArray(prefs?.order))return {order:null,hidden,shown};
 const order=[...new Set(prefs.order.flatMap(id=>LEGACY[id]||[id]).filter(known))];
 return {order:[...order,...HOME_DEFAULT.filter(id=>!order.includes(id))],hidden,shown};
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
