// The paperwork at each end of the flight. Japan's side is Visit Japan Web: one QR code each,
// the boys included, made before landing and shown on a phone at immigration and again at
// customs. Australia's side is the Australia Travel Declaration, the digital form taking over from
// the paper card: done in the Qantas app up to 72 hours before the flight home, on the routes it
// has reached so far, with the paper card on board as the fallback. Both change; both pages are linked.
// Checked September 2026.
export const VISIT_JAPAN_WEB='https://www.vjw.digital.go.jp/';
export const VJW_STEPS=[
 ['Make an account','One account for the family, on the Visit Japan Web site, with an email address and a password.'],
 ['Add each person','Yourself first, then “Add family member” for everyone else, with their passport details. The boys each get their own QR code, linked to a parent’s account.'],
 ['Add the trip','The flight, the arrival date, and the first hotel as the address in Japan.'],
 ['Fill in immigration and customs','One form for each person. Since January 2024 it makes one QR code for both.'],
 ['Have the codes on the phone','Show each code on the phone at immigration, then again at customs, or once at a combined kiosk. A printout is not accepted.']
];
export const TRAVEL_DECLARATION='https://www.abf.gov.au/entering-and-leaving-australia/crossing-the-border/at-the-border/incoming-passenger-card-(ipc)';
export const ATD_HOURS=72;
export const ATD_STEPS=[
 ['Up to 72 hours before the flight home','In the Qantas app, fill in the Australia Travel Declaration for each of us. The QR codes come to the app and by email.'],
 ['Where it works','Qantas flights into Brisbane and selected flights into Sydney and Melbourne so far; every Australian airport over the next year or so. The Qantas app offers it if our flight is included.'],
 ['If it is not offered','The paper Incoming Passenger Card is handed out on the plane. Fill in one each, and tick yes to any food.']
];
// Whether a trip day falls inside the 72 hours before the flight home, which leaves on the last day.
export function declarationDue(state,day){
 const days=state?.days||[],last=days.at(-1)?.date;
 if(!last||!day)return false;
 const gap=(Date.parse(`${last}T00:00:00Z`)-Date.parse(`${day}T00:00:00Z`))/86400000;
 return gap>=0&&gap<=2;
}
