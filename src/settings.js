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
  on:'A bell sits in the corner of every page. Tap it to type: a stop, a ticket or a phrase is found as you type, with no signal, and anything else is asked. Hold it to say it instead and hear the answer.',
  off:'No button in the corner. The magnifier in the top bar searches everything, and Talk to the trip and the question box are still on the Concierge page.'},
 // Off until asked for: while it is on and the app is open, the AirPods' press belongs to the
 // Concierge rather than to the music, which nobody should find out by having a podcast stop.
 {id:'headphoneConcierge',label:'Ask with my AirPods',group:'assistant',default:false,
  on:'While the app is open, press the AirPods stem (or play on any headphones) and the Concierge listens: “what’s next?”, “how long until dinner?”, “how do we get to the temple?”. Press again to stop it talking. Music on this phone pauses while the app is on the screen, and comes back when you leave it.',
  off:'The AirPods press stays with your music. The bell in the corner and “Hey Siri, Concierge” still work.'},
 // Off until asked for: it follows the phone's position while the app is open, which costs
 // battery and is nobody's business until they want it (src/matcha-nearby.js).
 {id:'matchaNearby',label:'Matcha nearby',group:'out',default:false,
  on:'While the app is open, the phone buzzes and says so when you come within the distance below of one of our matcha places: the ones marked matcha on our map list, and the Matcha hunt finds with a pin, a stop or a place. Each place once a day. With notifications allowed, it shows on the screen too if the app has just been put away.',
  off:'Nothing watches where you are for matcha. The places are still on our map list and the Matcha hunt.'},
 // On by default: the faces on the day in brief each morning. It folds away by itself once the
 // first stop is done, can be folded for the day, and off here it stays off on this phone.
 {id:'morningCheck',label:'How is everyone this morning?',group:'home',
  on:'Five faces each on the day in brief until the first stop is done, then it tidies itself away. Fold it for the day with the arrow.',
  off:'No faces on the day in brief. Take it easier and Adjust the day are still on the day itself.'},
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
