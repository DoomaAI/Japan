// The row of buttons under each stop — tickets, photos, the guide page and the rest — comes in
// whatever order the person holding the phone has put it. Press and hold one until the row
// wobbles, then drag them about; Settings has the same list with arrows for anyone who would
// rather not. Like the bottom bar and Home, the order lives on the phone and not in the trip:
// it changes where a button sits and nothing about where we are going.
//
// Some buttons only turn up on some stops (the park map on a park day, the sumo card on sumo
// day, I spy on a train) or when a feature is switched on. They still have a place in the order,
// so they come back where they were put the next time they apply.
//
// Untouched, the day's own buttons lead, then the tickets and the guide page — the two opened at
// the door — then everything else, with Share last.
export const CARD_LINKS={
 park:{label:'Rides & park map',note:'On a theme park day'},
 sumo:{label:'Sumo card',note:'On sumo day'},
 eyespy:{label:'Japan bingo',note:'On a train'},
 tickets:{label:'Tickets',note:'Bookings and documents for the stop'},
 guide:{label:'Guide page',note:'The stop’s page in the original guide'},
 website:{label:'Website',note:'The place’s own website'},
 ask:{label:'Ask a question',note:'Ask about the stop, when it is switched on'},
 nearby:{label:'Nearby',note:'Food, toilets and shops near the stop'},
 photos:{label:'Photos',note:'Photos taken at the stop'},
 voice:{label:'Voice note',note:'Record or play a voice note'},
 remind:{label:'Remind me',note:'A calendar reminder or phone alarm'},
 share:{label:'Share',note:'Send the stop to someone'}
};
export const LINKS_DEFAULT=Object.keys(CARD_LINKS);
export const emptyLinks=()=>({order:null});
// What comes back out of localStorage was written by some version of this app: unknown and
// repeated ids go, and a button added since lands at the end rather than going missing.
export function cleanLinks(prefs){
 if(!Array.isArray(prefs?.order))return emptyLinks();
 const order=[...new Set(prefs.order.filter(id=>Object.hasOwn(CARD_LINKS,id)))];
 return {order:[...order,...LINKS_DEFAULT.filter(id=>!order.includes(id))]};
}
export const linkOrder=prefs=>cleanLinks(prefs).order||LINKS_DEFAULT;
// Dragged onto another button, a button takes that button's place and the rest shuffle along,
// the way icons do on a phone's home screen.
export function dropLink(order,id,onto){
 const list=[...order],from=list.indexOf(id),to=list.indexOf(onto);
 if(from<0||to<0||from===to)return list;
 list.splice(from,1);list.splice(to,0,id);
 return list;
}
// One step along among the buttons this stop actually shows, skipping any that are hidden here,
// for the arrows in Settings and the arrow keys while the row is wobbling.
export function stepLink(order,id,by,shown=order){
 const visible=order.filter(x=>shown.includes(x)),at=visible.indexOf(id),next=visible[at+by];
 return at<0||!next?[...order]:dropLink(order,id,next);
}
