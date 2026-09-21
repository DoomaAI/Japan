// Which voices a phone has is not known at once. Safari returns an empty list on the first
// call and fills it in a moment later, so anything that asks once and believes the answer
// decides "no Japanese voice" on a phone that has one.
export const matchVoice=(voices,lang)=>{
 const want=String(lang||'').slice(0,2).toLowerCase();
 return (voices||[]).find(v=>String(v?.lang||'').toLowerCase().replace('_','-').startsWith(want))||null;
};
// 'yes' — there is a Japanese voice. 'no' — the phone listed its voices and none of them
// is Japanese. 'unknown' — nothing has been listed yet, which is not the same as none.
export function voiceState(voices,lang='ja'){
 if(!Array.isArray(voices))return 'unknown';
 if(matchVoice(voices,lang))return 'yes';
 return voices.length?'no':'unknown';
}
export const settled=state=>state==='yes'||state==='no';
// An unknown phone still gets the button: it may well speak Japanese, and hiding it there
// costs the family the feature outright, while offering it costs one tap to find out.
export const canOffer=(supported,state)=>!!supported&&state!=='no';
// Two speeds. The slow one is for learning a phrase, not for listening to it — slow enough
// that each chunk is separate, which is the whole point of the sound-it-out line above it.
export const SLOW_RATE=.45;
export const speechRate=(lang,slow)=>slow?SLOW_RATE:(String(lang||'').startsWith('ja')?.8:.85);
export const speechKey=(id,speed)=>`${id}|${speed}`;
// Safari goes silent when speak() follows cancel() in the same breath, so when the engine
// was already talking we let it settle first.
export const needsSettle=synth=>!!(synth&&(synth.speaking||synth.pending));
// Stopping one phrase to start another is not a failure worth telling anyone about.
export const isRealFailure=error=>!!error&&!['interrupted','canceled','cancelled'].includes(String(error));
