// Apps to download: the handful of local apps worth having on the phone for this trip, each with
// why, what to set up while there is still home Wi-Fi, and the App Store link. An app tied to part
// of the trip (the parks, the Shinkansen) finds its own days in the plan, so the list flags what is
// needed in the next two days and moves what is behind us out of the way. App Store ids checked
// September 2026.
import {bookedVia} from './booked-via.js';
const store=(slug,id)=>`https://apps.apple.com/au/app/${slug}/id${id}`;
export const APP_GROUPS=[['move','Getting around'],['talk','Reading and talking'],['parks','The theme parks'],['fly','Flying and staying safe']];
export const SUGGESTED_APPS=[
 {id:'maps',group:'move',name:'Google Maps',url:store('google-maps','585027354'),who:'Both parents',
  why:'Trains, walking and which exit, with live times. The links in this app open in it.',
  setup:'Sign in, then save Tokyo, Kyoto and Osaka as offline maps: tap your photo → Offline maps → Select your own map.'},
 {id:'navitime',group:'move',name:'Japan Travel by NAVITIME',url:store('japan-travel-smart-transit','686373726'),who:'One parent',
  why:'The second opinion on trains: platform numbers, which carriage is nearest the exit, and the JR lines Google sometimes gets wrong.',
  setup:'Nothing to set up; the free version is enough.'},
 {id:'suica',group:'move',name:'Welcome Suica Mobile',url:store('welcome-suica-mobile','6738336566'),who:'Each parent',
  why:'A Suica card in Apple Wallet for trains, buses, lockers and konbini, topped up with Apple Pay. Takes more foreign cards than topping up in Wallet itself.',
  setup:'Make it and top it up before flying; Australia is one of the countries allowed to. Needs iOS 17.2 or later.'},
 {id:'go',group:'move',name:'GO taxi',url:store('go-taxi-app-for-japan','1254341709'),who:'One parent',
  why:'Calls a taxi to where we are standing, with the destination already set, so there is nothing to explain. Works in Tokyo, Kyoto and Osaka.',
  setup:'Add a credit card to GO Pay at home, and we just get out at the end.'},
 {id:'smartex',group:'move',name:'Shinkansen smartEX',url:store('shinkansen-smartex-app','1253336330'),who:'The parent with the bookings',match:/nozomi|hikari|shinkansen/i,booked:'SmartEX',
  why:'Our Tokaido Shinkansen seats: change a train for free before boarding, and pick seats off the map.',
  setup:'Log in and check both Nozomi bookings are there. Keep the pickup code, in case a machine asks for it.'},
 {id:'klook',group:'move',name:'Klook',url:store('klook-travel-activities','961850126'),who:'The parent who booked',booked:'Klook',only:true,
  why:'The vouchers for what we booked through Klook, shown at the door, and where to change or cancel them.',
  setup:'Log in with the account the bookings are on, and open each voucher once so it is saved on the phone.'},
 {id:'translate',group:'talk',name:'Google Translate',url:store('google-translate','414706506'),who:'Both parents',
  why:'Point the camera at a menu, a sign or a ticket machine; or talk, and it speaks back in Japanese.',
  setup:'Download Japanese for offline: tap your photo → Downloaded languages → Japanese.'},
 {id:'usj',group:'parks',name:'Universal Studios Japan',url:store('universal-studios-japan','532097000'),who:'The parent with the tickets',match:/universal|usj/i,
  why:'Wait times, the map, Express Pass times, the Super Nintendo World entry ticket, and ordering food ahead.',
  setup:'Link everyone’s park tickets and the Express Pass in the app before the day.'},
 {id:'disney',group:'parks',name:'Tokyo Disney Resort App',url:store('tokyo-disney-resort-app','1313147771'),who:'Both parents',match:/disney/i,
  why:'Wait times, Premier Access, Standby Passes, restaurant bookings and ordering ahead, for both parks.',
  setup:'Make an account and link all four park tickets. Premier Access can only be bought in here.'},
 {id:'qantas',group:'fly',name:'Qantas',url:store('qantas-airways','640437525'),who:'Both parents',ends:true,
  why:'Boarding passes, seats and gate changes, and the Australia Travel Declaration for the flight home.',
  setup:'Add the booking so the boarding passes come to the phone.'},
 {id:'safety',group:'fly',name:'Safety tips',url:store('safety-tips','858357174'),who:'Both parents',
  why:'The Japan Tourism Agency’s own app: earthquake, tsunami, typhoon and heat alerts in English, and what to do.',
  setup:'Allow notifications, or the alerts never arrive.'}
];
// The trip days an app is for: the days whose title or stops match it or whose stops were booked
// through it, the two flight days for the airline, or the whole trip for the rest. An app that is
// only there for bookings made through it (`only`) has no days, and is not suggested, until one is.
export function appDays(state,app){
 const days=(state?.days||[]).map(d=>d.date);
 if(app.ends)return [...new Set([days[0],days.at(-1)].filter(Boolean))];
 if(!app.match&&!app.booked)return days;
 const hit=new Set();
 for(const d of state?.days||[])if(app.match?.test(`${d.title||''} ${d.city||''}`))hit.add(d.date);
 for(const s of state?.steps||[])if(s.day&&(app.match?.test(s.title||'')||(app.booked&&bookedVia(s)?.label===app.booked)))hit.add(s.day);
 return days.filter(d=>hit.has(d));
}
// Each app with the next trip day it is for; an app whose days are all behind us is done, and one
// tied to part of the trip that comes up within two days is soon.
export function suggestedApps(state,today){
 return SUGGESTED_APPS.map(app=>({app,days:appDays(state,app)})).filter(({app,days})=>!app.only||days.length).map(({app,days})=>{
  const next=days.find(d=>d>=today)||null;
  const gap=next?(Date.parse(`${next}T00:00:00Z`)-Date.parse(`${today}T00:00:00Z`))/86400000:null;
  return {...app,days,next,done:days.length>0&&!next,soon:!!(app.match||app.booked||app.ends)&&gap!==null&&gap<=2};
 });
}
// Reminders: the evening before an app tied to part of the trip is first needed, and a week before
// we fly for everything needed from the first day. The server cannot see which phone has what, so
// these go to both parents; the briefing card, which can, hides an app once this phone has it.
export const APP_REMIND_AT='19:00',APP_REMIND_WEEK=7;
const shift=(d,n)=>new Date(Date.parse(`${d}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);
export function appReminders(state){
 const days=(state?.days||[]).map(d=>d.date);
 if(!days.length)return [];
 const tied=SUGGESTED_APPS.filter(a=>a.match||a.booked).map(app=>({app,first:appDays(state,app)[0]})).filter(x=>x.first>days[0]);
 const early=SUGGESTED_APPS.filter(a=>!a.only&&!tied.some(x=>x.app.id===a.id));
 return [{id:'before',day:shift(days[0],-APP_REMIND_WEEK),apps:early},...tied.map(({app,first})=>({id:app.id,day:shift(first,-1),first,apps:[app]}))];
}
// The apps tied to part of the trip whose first day is this day or the next, for the briefing.
export function appsDue(state,day){
 return appReminders(state).filter(r=>r.first&&(r.first===day||r.day===day)).map(r=>({id:r.apps[0].id,name:r.apps[0].name,today:r.first===day}));
}
