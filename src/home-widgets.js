// Home is a stack of widgets, and which ones are on it — and in what order — is up to whoever is
// holding the phone. Lauren wants the step card and the tickets; Boston wants the weather and his
// to-dos above everything else; Nate wants the step card and nothing to scroll past. Like the
// bottom bar, it is kept on the phone rather than in the trip: it changes what this screen shows
// and nothing about where we are going, so there is nothing to sync and nothing to agree on.
//
// The day's heading and its strip of dates are not widgets. They say which day Home is about,
// and a Home that could be told to forget which day it was on would be no Home at all.
export const HOME_WIDGETS={
 needs:{label:'Before we head out',note:'What to carry out the door this morning'},
 step:{label:'The step we are on',note:'The current stop, swipe for the rest of the day'},
 links:{label:'Hotel and next fixed time',note:'Tonight’s hotel and the next time that cannot move'},
 actions:{label:'Quick actions',note:'The day at a glance, adjust the day, we’re tired, useful apps'},
 nextup:{label:'What’s next',note:'The next stop, how long until it, and running late'},
 tally:{label:'Day tally and tools',note:'How many are done, photos, voice notes and tickets'},
 guide:{label:'This day in the guide',note:'The original guide pages for the day'},
 weather:{label:'Weather',note:'The day’s forecast, folded or open'},
 packing:{label:'Packing reminder',note:'What is still out of the case before a hotel move'},
 todos:{label:'To-dos for the day',note:'Things to do or buy that are on this day'},
 finds:{label:'Shop finds',note:'Things we photographed in a shop on this day'}
};
// The order Home has always come in, which is also where a widget added in a later version
// lands for somebody who has already arranged theirs.
export const HOME_DEFAULT=Object.keys(HOME_WIDGETS);
export const emptyHome=()=>({order:null,hidden:[]});
// Whatever comes back out of localStorage was written by some version of this app, possibly an
// older one with widgets that no longer exist or without ones that do. So it is cleaned on the
// way in: unknown ids go, duplicates go, and anything new is added at the end rather than lost.
export function cleanHome(prefs){
 const known=id=>Object.hasOwn(HOME_WIDGETS,id);
 const hidden=[...new Set((Array.isArray(prefs?.hidden)?prefs.hidden:[]).filter(known))];
 if(!Array.isArray(prefs?.order))return {order:null,hidden};
 const order=[...new Set(prefs.order.filter(known))];
 return {order:[...order,...HOME_DEFAULT.filter(id=>!order.includes(id))],hidden};
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
 const {hidden}=cleanHome(prefs);
 return cleanHome({order:homeOrder(prefs),hidden:hidden.includes(id)?hidden.filter(x=>x!==id):[...hidden,id]});
}
