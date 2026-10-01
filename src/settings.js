// What a person has asked not to be shown. Two things in this app open themselves without
// being asked for: the phrase of the day and the fun fact of the day. Both are meant kindly,
// and both are still an interruption on a morning that already has a train to catch — so each
// one can be turned off by the person it interrupts, and turning one off leaves the other
// alone. Nothing else in here opens itself, which is why there are two of them and not twenty.
//
// A choice, not a fact about the trip, so it is kept on the phone rather than on the server:
// turning the fun fact off has to work in a tunnel with no signal, it has to hold tomorrow
// morning whether or not anything synced, and it must not reach anybody else's phone. It is
// still kept under the person's own name, because the pop-ups are per person and two people
// sharing a phone do not share an opinion about them.
//
// Every call degrades to the defaults rather than throwing. A private window or a phone with
// storage turned off must not be the reason a family loses a pop-up it still wants.
import {localStore as device} from './browser.js';
export const SETTINGS=[
 {id:'dailyPhrase',label:'Phrase of the day',
  on:'One new Japanese phrase each morning, on the day in brief on Home, with how to say it. Tap it to hear it.',
  off:'The day in brief leaves the phrase out. The whole phrasebook stays under More, and Show me another still hands over the next one.'},
 {id:'dailyFact',label:'Fun fact of the day',
  on:'One fact each morning about what that day actually holds, out of our own guide, on the day in brief on Home — and one as each stop it is about gets started.',
  off:'The day in brief leaves the fact out, and none pops up at a stop. Every fact stays under More, and Show me another still hands over the next one.'},
 // Off until asked for: it listens with the phone's speech engine while a voice note records,
 // which on some phones means the words go through Apple's or Google's servers.
 {id:'transcribeVoice',label:'Write down my voice notes',group:'voice',default:false,
  on:'While you record a voice note, the phone writes down what is said. You read it and fix it before saving, and the words can be found in Search everything.',
  off:'Voice notes are kept as sound only. Words can still be added to any of your notes afterwards, by typing or saying them.'},
 // On by default wherever Ask is switched on: a button that sits on every page and is only
 // ever heard when tapped. Off takes the button away; Ask itself is untouched.
 {id:'voiceAssistant',label:'Concierge on every page',group:'assistant',
  on:'A bell sits in the corner of every page. Tap it and say or type what you want — move a stop, add one, adjust the day — and hear the answer.',
  off:'No button in the corner. Talk to the trip and the question box are still on the Concierge page.'},
 // Closed until asked for, so a route card stays short; tapping a line's name opens it either way.
 {id:'routeLookOpen',label:'Show what to look for',group:'route',default:false,
  on:'Each train, subway and bus on a route card opens with what to look for to find it. Tap the line’s name to close it.',
  off:'Each line on a route card starts closed. Tap the line’s name to see what to look for.'}
];
// On unless somebody has said otherwise, so a phone that has never opened this page behaves
// exactly as it always did — apart from a setting that says it starts off.
export const DEFAULTS=Object.fromEntries(SETTINGS.map(s=>[s.id,s.default??true]));
const KEY=person=>`japan.settings.${person||'everyone'}`;
// Only the settings this version knows about, and only where the saved value is a real
// true/false. Anything else — a half-written key, a setting from a later version, a string
// where a boolean should be — falls back to the default rather than switching something off.
function merge(saved){
 const out={...DEFAULTS};
 if(saved&&typeof saved==='object')for(const {id} of SETTINGS)if(typeof saved[id]==='boolean')out[id]=saved[id];
 return out;
}
export function readSettings(person,store=device()){
 let saved=null;
 try{saved=JSON.parse(store?.getItem(KEY(person))||'null');}catch{saved=null;}
 return merge(saved);
}
// Hands back what the settings now are, so the screen can be drawn from the answer rather than
// from a guess about whether the phone accepted it.
export function writeSetting(person,id,value,store=device()){
 const current=readSettings(person,store);
 if(!Object.hasOwn(DEFAULTS,id))return current;
 const next={...current,[id]:!!value};
 try{store?.setItem(KEY(person),JSON.stringify(next));}catch{}
 return next;
}
export const settingOn=(settings,id)=>(settings?.[id]??DEFAULTS[id]??true)!==false;
