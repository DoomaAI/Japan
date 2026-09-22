// Talking instead of typing. Nate is five: he can tell you exactly what the deer did and he
// cannot write a word of it, so every box that asks a person what they thought offers the
// microphone beside the keyboard. The phone's own listener does the work — nothing is recorded,
// nothing is uploaded and nothing is kept; the words land in the box and the box is still his
// to change. A voice note is the other half of this and stays where it is: that keeps the
// voice, this keeps the words.
export const dictationEngine=(win=typeof window!=='undefined'?window:null)=>win?.SpeechRecognition||win?.webkitSpeechRecognition||null;
export const canDictate=win=>!!dictationEngine(win);
// The family speaks Australian English. Asking for it by name matters: left to itself a phone
// set up in another language will confidently mis-hear a child.
export const DICTATE_LANG='en-AU';
// Long enough for a five-year-old telling the whole story of a deer; short enough that a
// microphone left listening in a pocket turns itself off rather than running all afternoon.
export const MAX_LISTEN_SECONDS=120;
const upperFirst=s=>s.charAt(0).toUpperCase()+s.slice(1);
export const tidySpoken=text=>String(text??'').replace(/\s+/g,' ').trim();
// The engine hands back everything it has heard, over and over, with the part it is still
// thinking about on the end. `from` is how many of those results have already been written into
// the box, so the same sentence is never written twice — engines differ on whether they re-send
// what they have already settled, and a doubled sentence is worse than a missing one.
export function heardSoFar(results,from=0){
 const list=results||[];let said='',thinking='',settled=from;
 for(let i=Math.max(0,from);i<(list.length||0);i++){
  const text=list[i]?.[0]?.transcript||'';
  if(list[i]?.isFinal){said+=' '+text;settled=i+1;}
  else thinking+=' '+text;
 }
 return {said:tidySpoken(said),thinking:tidySpoken(thinking),settled};
}
// Spoken words are added to whatever is already in the box rather than replacing it, because
// the box may hold something typed, something said a minute ago, or something a parent wrote.
// A new sentence gets its capital letter; carrying on from a half-finished one does not, since
// an engine sends "and then the deer bowed" as readily as it sends a whole thought.
export function joinSpoken(existing,heard){
 const said=tidySpoken(heard);
 const had=String(existing??'');
 if(!said)return had;
 if(!had.trim())return upperFirst(said);
 const ended=/[.!?…]["'”’)\]]?$/.test(had.trimEnd());
 return `${had.trimEnd()} ${ended?upperFirst(said):said}`;
}
// Said to whoever is holding the phone, which may be a five-year-old on his own: what happened
// and what to do about it, never an error code on its own.
export const DICTATION_PROBLEM={
 'not-allowed':'The phone would not let the app listen. Allow the microphone for this site, then tap Say it again.',
 'service-not-allowed':'The phone would not let the app listen. Allow the microphone for this site, then tap Say it again.',
 'no-speech':'Nothing was heard. Hold the phone closer, tap Say it and talk as you would to somebody next to you.',
 'audio-capture':'The microphone could not be used — something else on the phone may have it.',
 network:'Turning talking into words needs a signal, and there is none right now. Type it, or leave a voice note and it will go up later.',
 'language-not-supported':'This phone will not listen in English here. Use the microphone key on the keyboard instead.',
};
// Stopping on purpose is not a problem, and neither is the listener ending itself after a
// silence, so neither says anything.
export function dictationProblem(error){
 const code=String(error||'');
 if(!code||code==='aborted')return '';
 return DICTATION_PROBLEM[code]||`The phone stopped listening (${code}). Tap Say it to start again, or use the microphone key on the keyboard.`;
}
export const NO_DICTATION='This browser will not turn talking into words. The keyboard has a microphone key that will, and a voice note works with no signal at all.';
// A textarea that a form reads with FormData is not held in React state, so what was heard is
// written straight into the box — which is what the form sends either way. The caret goes to
// the end so the keyboard carries on from where the talking stopped.
export function writeInto(box,heard){
 if(!box)return '';
 const next=joinSpoken(box.value,heard);
 if(next===box.value)return next;
 box.value=next;
 try{box.setSelectionRange(next.length,next.length);}catch{}
 try{box.dispatchEvent(new Event('input',{bubbles:true}));}catch{}
 return next;
}
