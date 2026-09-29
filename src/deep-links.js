import {NEARBY_KINDS} from './trip-features.js';
import {CAPTURE_MAX} from './capture-data.js';
// Addresses that do something the moment the app opens, for the Shortcuts app, Siri and the
// Action button. A web app cannot put a widget on the Home Screen or a button in the share
// sheet, but a Shortcut can open an address, and Siri can run a Shortcut by name: so "Hey Siri,
// Japan to-do" dictates a line and opens the list with the form already filled in. Every link
// is a plain query on the front door; the action is read once, done, and taken back out of the
// address so a reload does not do it twice.
export const DEEP_LINKS=[
 {id:'todo-add',label:'Add a to-do by voice',path:'/?tab=todo&add=',takes:'the words you dictated',
  how:'In Shortcuts: Dictate Text, then Open URLs with this address followed by the Dictated Text. Name it “Japan to-do” and Siri will run it by name.'},
 {id:'todo-say',label:'Open the To-do list ready to listen',path:'/?tab=todo&say=1',
  how:'One tap on the Action button and the list opens with the Just say it box waiting.'},
 {id:'nearby-toilet',label:'Nearest toilet',path:'/?open=nearby&need=toilet',how:'Opens Nearby with Toilets already ticked.'},
 {id:'nearby-konbini',label:'Nearest convenience store',path:'/?open=nearby&need=konbini',how:'Opens Nearby with Convenience store already ticked.'},
 {id:'nearby-food',label:'Somewhere to eat near here',path:'/?open=nearby&need=food',how:'Opens Nearby with Somewhere to eat already ticked.'},
 {id:'hotel',label:'Take me to tonight’s hotel',path:'/?open=hotel',how:'Goes straight to directions for tonight’s hotel in Maps. If the app has not been opened today it opens first and then goes on.'},
 {id:'capture',label:'Quick capture',path:'/?open=capture',how:'Opens the photo-or-note sheet for the day being looked at.'},
 {id:'allergy',label:'Allergy card',path:'/?tab=allergy&who=',takes:'a name, such as Nate',how:'Opens the card in Japanese for that person, ready to show at a counter.'},
 {id:'safety',label:'Safety card',path:'/?tab=safety',how:'The numbers, the meeting points and the phrases for when something has gone wrong.'}
];
export const deepLinkUrl=(link,origin='',value='')=>`${origin}${link.path}${link.takes?encodeURIComponent(value):''}`;
const ACTION_KEYS=['add','say','open','need'];
// What an address asks for on arrival, or null when it is an ordinary page or day. The kind
// passed to Nearby has to be one of its own, and a to-do line is cut to what the box takes.
export function deepLinkAction(search){
 const p=new URLSearchParams(search);
 const add=p.get('add');if(add&&add.trim())return {type:'todoAdd',text:add.trim().slice(0,CAPTURE_MAX)};
 if(p.get('say'))return {type:'todoSay'};
 const open=p.get('open');
 if(open==='nearby'){const need=p.get('need');return {type:'nearby',need:NEARBY_KINDS.some(([id])=>id===need)?need:null};}
 if(open==='hotel')return {type:'hotel'};
 if(open==='capture')return {type:'capture'};
 return null;
}
// The same address with the one-off action taken out, so the page it opened stays in the bar.
export function withoutDeepLink(search){
 const p=new URLSearchParams(search);for(const k of ACTION_KEYS)p.delete(k);
 const s=p.toString();return s?`/?${s}`:'/';
}
