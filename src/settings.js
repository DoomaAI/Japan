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
export const SETTINGS=[
 {id:'dailyPhrase',label:'Phrase of the day',
  on:'One new Japanese phrase each morning, with how to say it.',
  off:'No phrase will pop up. The whole phrasebook stays under More, and Show me another still hands over the next one.'},
 {id:'dailyFact',label:'Fun fact of the day',
  on:'One fact each morning about what that day actually holds, out of our own guide — and one as each activity it is about gets started.',
  off:'No fact will pop up. Every fact stays under More, and Show me another still hands over the next one.'}
];
// On unless somebody has said otherwise, so a phone that has never opened this page behaves
// exactly as it always did.
export const DEFAULTS=Object.fromEntries(SETTINGS.map(s=>[s.id,true]));
const KEY=person=>`japan.settings.${person||'everyone'}`;
const device=()=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}};
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
export const settingOn=(settings,id)=>settings?.[id]!==false;
