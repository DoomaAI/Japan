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
// iOS 16.4 and later lets a page say what kind of audio it is making. 'playback' is the one
// that keeps playing with the ring/silent switch on, which is the usual reason a phone that
// looks like it is speaking makes no sound at all.
export function claimPlayback(nav=typeof navigator!=='undefined'?navigator:null){
 try{
  if(!nav?.audioSession)return 'not supported';
  if(nav.audioSession.type!=='playback')nav.audioSession.type='playback';
  return nav.audioSession.type;
 }catch{return 'refused';}
}
// Safari will ignore the very first thing a page tries to say. Spending that on a silent
// utterance means the first phrase anyone taps is the one they actually hear.
export function warmUp(synth,Utterance){
 if(!synth||!Utterance||warmUp.done)return false;
 warmUp.done=true;
 try{const u=new Utterance(' ');u.volume=0;synth.speak(u);return true;}catch{return false;}
}
export const describeVoices=voices=>{
 if(!Array.isArray(voices))return {count:0,japanese:[],state:'unknown'};
 const japanese=voices.filter(v=>String(v?.lang||'').toLowerCase().replace('_','-').startsWith('ja')).map(v=>v?.name||'unnamed');
 return {count:voices.length,japanese,state:voiceState(voices)};
};
// What the phone did, in words the person holding it can read out.
export function soundCheckLines(facts){
 const v=describeVoices(facts.voices);
 return [
  ['Build',facts.build||'unknown'],
  ['Opened from',facts.standalone?'Home Screen icon':'the browser'],
  ['Speech support',facts.supported?'yes':'no — this browser cannot speak'],
  ['Voices found',v.count?`${v.count}${v.japanese.length?` · Japanese: ${v.japanese.join(', ')}`:' · none of them Japanese'}`:'none yet'],
  ['Silent-switch override',facts.audioSession||'not supported'],
  ['It started speaking',facts.started===null?'not tested':facts.started?`yes, after ${facts.startedAfter}ms`:'no — nothing began'],
  ['It finished',facts.ended===null?'not tested':facts.ended?'yes':'no'],
  ['Reported fault',facts.error||'none']
 ];
}
// Japanese does not stress a syllable the way English does — saying ありがとう with a thump on
// one part is exactly the accent we are trying to avoid. What it does have is length: a long
// vowel is held for two beats, and a double consonant is a beat of silence. Getting that wrong
// changes the word (おばさん aunt, おばあさん grandmother), so that is what is marked.
export function phonicChunks(say,hold){
 const marks=new Set((Array.isArray(hold)?hold:hold?[hold]:[]).map(h=>String(h).toLowerCase()));
 return String(say||'').split(/([^a-z']+)/i).filter(p=>p!=='')
  .map(text=>({text,hold:marks.has(text.toLowerCase())}));
}
export const holdsOf=item=>Array.isArray(item?.hold)?item.hold:item?.hold?[item.hold]:[];
