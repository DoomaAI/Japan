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
// Slower again than talking pace, but still a sentence rather than a word list. It is the
// speed a grown-up reads a story at, and it is what Nate gets for anything in English he
// cannot read himself.
export const YOUNG_RATE=.72;
export const speechRate=(lang,slow)=>slow?SLOW_RATE:(String(lang||'').startsWith('ja')?.8:.85);
export const speechKey=(id,speed)=>`${id}|${speed}`;
// Safari goes silent when speak() follows cancel() in the same breath, so when the engine
// was already talking we let it settle first.
export const needsSettle=synth=>!!(synth&&(synth.speaking||synth.pending));
// Stopping one phrase to start another is not a failure worth telling anyone about.
export const isRealFailure=error=>!!error&&!['interrupted','canceled','cancelled'].includes(String(error));
// iOS 16.4 and later lets a page say what kind of audio it is making. Safari starts every
// page as 'ambient', which is the category the ring/silent switch mutes — that is why a phone
// that reports it is speaking can still make no sound. 'playback' is the media category, and
// it is not muted by the switch.
//
// It has to be claimed ONCE, early, and then left alone: changing the type part-way through a
// session is known to confuse iOS into playing nothing at all. So this remembers that it has
// run and does nothing on every call after the first.
let claimed=null;
export function claimPlayback(nav=typeof navigator!=='undefined'?navigator:null){
 if(claimed!==null)return claimed;
 try{
  if(!nav?.audioSession)return claimed='not supported';
  nav.audioSession.type='playback';
  return claimed=nav.audioSession.type;
 }catch{return claimed='refused';}
}
// Only for tests, which need each case from a clean start.
export const resetPlaybackClaim=()=>{claimed=null;};
export const playbackClaim=()=>claimed;
// A WAV built here rather than shipped as a file, because the only two sounds the app needs
// to make on its own are a hold nobody can hear and a short beep, and neither is worth
// downloading. Sixteen-bit mono PCM, which every phone plays.
export function wavDataUri(samples,rate=8000){
 const size=samples.length*2,buffer=new ArrayBuffer(44+size),view=new DataView(buffer);
 const text=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,36+size,true);text(8,'WAVE');
 text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
 text(36,'data');view.setUint32(40,size,true);
 for(let i=0;i<samples.length;i++)view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
 const bytes=new Uint8Array(buffer);let binary='';
 for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
 return `data:audio/wav;base64,${btoa(binary)}`;
}
// Long enough that the loop point comes round rarely: every seam is a moment with nothing
// playing, and a moment with nothing playing is a moment iOS can drop the session.
export const HOLD_SECONDS=4;
// The sound that holds the audio session open. It is NOT digital silence: iOS decides whether
// a page is really playing media by looking at what comes out of it, and a buffer of zeroes is
// exactly what it is entitled to throw away — at which point the page falls back to the ambient
// category the ring switch mutes, which is the bug this whole file exists to fix. One step
// either side of zero is about ninety decibels below full scale: no ear will find it and no
// heuristic can call it nothing. Slow enough not to be a Nyquist square wave, which resamplers
// do strange things to.
export function holdUri(seconds=HOLD_SECONDS,rate=8000){
 const n=Math.round(seconds*rate),data=new Float32Array(n),half=Math.max(1,Math.round(rate/200));
 for(let i=0;i<n;i++)data[i]=(Math.floor(i/half)%2?1:-1)/32767;
 return wavDataUri(data,rate);
}
// Something you can actually hear, for the sound check. Faded at both ends, because a square
// start is a click on a phone speaker and a click is not an answer to 'can you hear this'.
export function toneUri(seconds=0.7,freq=440,rate=8000){
 const n=Math.round(seconds*rate),data=new Float32Array(n),edge=Math.max(1,rate*0.02);
 for(let i=0;i<n;i++)
  data[i]=Math.sin(2*Math.PI*freq*i/rate)*0.35*Math.min(1,i/edge,(n-i)/edge);
 return wavDataUri(data,rate);
}
// THE THING THAT ACTUALLY MUTES AN IPHONE.
//
// Setting the audio session to 'playback' is not enough on its own: iOS only treats the page
// as playing media while something really is playing. A one-shot sample is over before the
// speaking starts, so it holds nothing. This keeps an inaudible loop running for as long as
// there is something to say, which is what keeps the page out of the ambient category the
// ring switch mutes.
//
// It counts holders rather than tracking one, so two phrases overlapping cannot have the
// first one to finish pull the session out from under the second.
let holder=null,holding=0,started=null;
export function holdPlayback(make=typeof Audio!=='undefined'?src=>new Audio(src):null){
 if(!make)return false;
 try{
  if(!holder){holder=make(holdUri());holder.loop=true;}
  holding++;
  const played=holder.play?.();
  started=played?.then?played:null;
  if(played?.catch)played.catch(()=>{});
  return true;
 }catch{holding=Math.max(0,holding-1);return false;}
}
export function releasePlayback(){
 holding=Math.max(0,holding-1);
 if(holding)return false;
 // Pausing before play() has settled aborts the request rather than stopping it, and an
 // aborted play is not the gesture-unlock iOS remembers — which is how arming the page on the
 // first touch managed to unarm itself. So where there is a promise, wait for it.
 const stop=()=>{if(holding)return;try{holder?.pause?.();}catch{}};
 if(started?.then)started.then(stop,stop);else stop();
 return true;
}
// iOS pauses a page's audio for reasons of its own — an interruption, a route change, coming
// back from the lock screen — and the moment it does, the page is ambient again and the ring
// switch is back in charge. Put it back while there is still something being said.
export function keepHolding(){
 if(!holding||!holder)return false;
 try{
  if(holder.paused===false)return false;
  const played=holder.play?.();
  started=played?.then?played:null;
  if(played?.catch)played.catch(()=>{});
  return true;
 }catch{return false;}
}
// Speaking before the hold is really playing is speaking into the ambient category, so this
// runs the speaking once play() has landed. Capped, because the phrase must never be lost to
// a promise that never settles, and short, because iOS only counts a tap as a gesture for a
// few seconds after it.
export function whenHolding(run,cap=250,wait=typeof setTimeout!=='undefined'?setTimeout:null){
 if(!started?.then){run();return false;}
 let spent=false;
 const go=()=>{if(spent)return;spent=true;run();};
 started.then(go,go);
 wait?.(go,cap);
 return true;
}
export const playbackHeld=()=>holding>0;
export const resetHold=()=>{holder=null;holding=0;started=null;};
// iOS ignores an audio session claimed before anyone has touched the page, and it will not
// let a media element play later unless it was first played inside a real gesture. So all of
// it happens on the first touch anywhere in the app, once, and then never again — which is
// also why the very first 'Hear it' works rather than being the tap that arms it.
export function armPlayback(win=typeof window!=='undefined'?window:null){
 if(!win?.addEventListener||armPlayback.armed)return false;
 armPlayback.armed=true;
 const arm=()=>{
  claimPlayback(win.navigator);
  // The warm-up belongs here and nowhere else. See warmUp: it is a throwaway utterance, and
  // a throwaway utterance in front of a real one is how a phone ends up taking the words and
  // saying nothing. Spent on a touch that asked for no sound, it cannot be in anybody's way.
  warmUp(win.speechSynthesis,win.SpeechSynthesisUtterance);
  holdPlayback();releasePlayback();
  for(const event of ['pointerdown','touchend'])win.removeEventListener(event,arm,true);
 };
 for(const event of ['pointerdown','touchend'])win.addEventListener(event,arm,true);
 return true;
}
export const resetArm=()=>{armPlayback.armed=false;};
// Safari will ignore the very first thing a page tries to say. Spending that on a silent
// utterance means the first phrase anyone taps is the one they actually hear.
//
// But WebKit does not reliably finish a silent utterance, and it speaks its queue in order:
// one that never ends is one that everything behind it waits on for the rest of the session.
// That is a page where every button works, the engine reports itself busy, and not one word
// is ever heard. So the queue is cleared straight afterwards. What unlocks the synthesiser is
// the speak() call itself, inside the gesture, and that has already happened by then; what is
// cleared is only the risk of it sitting at the front of the queue forever.
//
// Cleared on the next turn rather than after a wait, and this matters: the first touch is
// very often the tap on 'Hear it' itself, and a cancel still pending when that phrase starts
// would stop the very thing it was meant to help.
export function warmUp(synth,Utterance,wait=typeof setTimeout!=='undefined'?setTimeout:null){
 if(!synth||!Utterance||warmUp.done)return false;
 warmUp.done=true;
 try{
  const u=new Utterance(' ');u.volume=0;synth.speak(u);
  wait?.(()=>{try{synth.cancel?.();}catch{}},0);
  return true;
 }catch{return false;}
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
  ['A recording played',facts.tone===null||facts.tone===undefined?'not tested':facts.tone==='played'?'yes — so recorded phrases will be heard':`no — ${facts.tone}`],
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
// Two things silence iOS that have nothing to do with the mute switch.
//
// The first: speech often does not work at all inside a Home Screen app. WebKit's speech
// synthesiser is unreliable in standalone display mode and fine in Safari itself, which is
// why a phone can report that it spoke and produce nothing.
export const isStandalone=(win=typeof window!=='undefined'?window:null)=>{
 try{return !!(win?.matchMedia?.('(display-mode: standalone)').matches||win?.navigator?.standalone===true);}
 catch{return false;}
};
// The second: the synthesiser wedges when the app has been in the background — the very
// thing that happens every time a phone is put in a pocket. Cancelling on the way back in
// clears the stuck queue, which is the documented way to get it speaking again without a
// reload.
export function wakeSpeech(win=typeof window!=='undefined'?window:null){
 try{
  const synth=win?.speechSynthesis;
  if(!synth)return false;
  synth.cancel();
  synth.resume?.();
  return true;
 }catch{return false;}
}
// What to tell someone whose phone said nothing, given what the phone just did.
export function silenceAdvice({started,standalone,tone}){
 // The most useful answer there is, and only this test can produce it: the phone plays a
 // recording perfectly well and will not speak for itself. Nothing about the phone will fix
 // that — recording the phrases will, and it says so instead of blaming the switch again.
 if(tone==='played'&&started===false)return 'record-instead';
 if(started===false&&standalone)return 'standalone';
 if(started===false)return 'never-started';
 return 'muted';
}
export const SILENCE_HELP={
 'record-instead':'This device plays a recording perfectly well but will not speak for itself, and no setting on it will change that. Record the phrases from something that does speak — the iPad, off silent, is ideal — and every phone will play the recording instead, silent switch or not.',
 standalone:'iPhones often will not speak inside an app added to the Home Screen — the same page in Safari does. Open it in Safari for the Japanese, or use headphones.',
 'never-started':'The phone took the words and did nothing. Close the app fully and open it again — iOS stops speaking once it has been in the background.',
 muted:'The phone says it spoke, so this is the sound getting out: headphones always work, or flick the side switch off silent and turn the volume up.'
};
