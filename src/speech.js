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
