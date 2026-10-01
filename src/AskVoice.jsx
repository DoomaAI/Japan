import React,{useEffect,useRef,useState} from 'react';
import {AlertCircle,Check,Mic,Square,Volume2,X} from 'lucide-react';
import {useDictation} from './Dictate.jsx';
import {joinSpoken} from './dictation.js';
import {draftPreview} from './day-check.js';
import {confirmReply,englishVoice,speechChunks,spokenAnswer} from './ask-voice.js';
import {warmUp} from './speech.js';
// The assistant: Ask with the screen taken out. Tap, say it — "move the garden to after lunch",
// "add a ramen stop near the hotel tonight", "is tomorrow too much for Nate?" — and it is sent
// when you stop talking, answered out loud, and any change it suggests is put as a question:
// "Shall I make that change?" A parent's yes applies it exactly as the Apply button would; a no,
// or anything else, leaves the plan alone. The answer and the change are on the screen below too.
const synth=()=>{try{return typeof window!=='undefined'&&window.speechSynthesis&&window.SpeechSynthesisUtterance?window.speechSynthesis:null;}catch{return null;}};
// How long to wait for a yes or no before leaving the change on the screen instead.
const CONFIRM_TRIES=1;
export default function AskVoice({ask,apply,canApply,state,online,step}){
 const [phase,setPhase]=useState('idle'),[heard,setHeard]=useState(''),[said,setSaid]=useState(''),[error,setError]=useState('');
 const words=useRef(''),purpose=useRef(''),pending=useRef(null),tries=useRef(0),alive=useRef(true),turn=useRef(0);
 // Everything the listener calls back into is read fresh: it was started on an earlier render.
 const live=useRef({});live.current={ask,apply,canApply,state};
 useEffect(()=>()=>{alive.current=false;hush();},[]);
 const listener=useDictation({continuous:false,onText:t=>{words.current=joinSpoken(words.current,t);setHeard(words.current);},onEnd:()=>heardAll()});
 // Each reading has its own turn, so one cut off (by a tap, or by the next reading) never runs
 // what was meant to follow it: some phones report a cancelled utterance as finished.
 function hush(){turn.current++;try{synth()?.cancel();}catch{}}
 function speak(text,then){
  const s=synth();setSaid(text);
  if(!s||!text){then?.();return;}
  setPhase('speaking');
  hush();const mine=turn.current,next=()=>{if(alive.current&&turn.current===mine)then?.();};
  const voice=englishVoice(s.getVoices?.());
  const chunks=speechChunks(text);
  chunks.forEach((chunk,i)=>{
   const u=new window.SpeechSynthesisUtterance(chunk);
   u.lang=voice?.lang||'en-AU';if(voice)u.voice=voice;u.rate=1;
   if(i===chunks.length-1){u.onend=next;u.onerror=e=>{if(!['interrupted','canceled'].includes(e?.error))next();};}
   s.speak(u);
  });
 }
 function listen(why){
  purpose.current=why;words.current='';setHeard('');
  if(listener.start())setPhase(why==='confirm'?'confirm':'listening');
  else setPhase(why==='confirm'?'confirm':'idle');
 }
 // A listener stopped by one of the buttons has already been answered; it says nothing more.
 function heardAll(){
  const why=purpose.current;purpose.current='';
  if(!alive.current||!why)return;
  const text=words.current.trim();
  if(why==='confirm'){
   const reply=confirmReply(text);
   if(reply==='yes')return yes();
   if(reply==='no')return no();
   // Not a yes or a no: a fresh question, if there was one; otherwise the buttons wait.
   if(text)return send(text);
   if(tries.current++<CONFIRM_TRIES)return speak('Say yes to make the change, or no to leave it.',()=>listen('confirm'));
   return setPhase('confirm');
  }
  if(text)send(text);else setPhase('idle');
 }
 async function send(text){
  setPhase('thinking');setError('');pending.current=null;
  try{
   const item=await live.current.ask(text);
   const preview=item.draft?draftPreview(live.current.state,item.draft):null;
   const offer=!!(live.current.canApply&&item.draft&&!preview.stale&&!preview.conflicts.length);
   if(!alive.current)return;
   pending.current=offer?item:null;tries.current=0;
   speak(spokenAnswer(item,{offer,preview}),()=>offer?listen('confirm'):setPhase('idle'));
  }catch(e){
   if(!alive.current)return;
   const message=e?.message||'That did not work. Try asking it another way.';
   setError(message);speak(message,()=>setPhase('idle'));
  }
 }
 async function yes(){
  const item=pending.current;pending.current=null;
  if(!item)return setPhase('idle');
  setPhase('thinking');
  const ok=await live.current.apply(item);
  if(alive.current)speak(ok?'Done. The day is updated on every phone.':'That did not go through. The change is still on the screen to look at.',()=>setPhase('idle'));
 }
 function no(){pending.current=null;speak('Left as it is.',()=>setPhase('idle'));}
 // One button does whatever stops the noise: finish talking (and send it), or cut the answer off.
 function tap(){
  setError('');
  if(phase==='listening'||(phase==='confirm'&&listener.listening))return listener.stop();
  if(phase==='speaking'){hush();return setPhase(pending.current?'confirm':'idle');}
  if(phase==='thinking')return;
  if(!online){setError('Asking needs a signal. The plan itself is on this phone either way.');return;}
  // The speaker is woken inside the tap, or Safari stays silent for the answer that follows it.
  try{warmUp(window.speechSynthesis,window.SpeechSynthesisUtterance);}catch{}
  hush();pending.current=null;listen('ask');
 }
 if(!listener.supported)return null;
 const label={idle:'Talk to the trip',listening:'Done talking',thinking:'Having a think…',speaking:'Stop reading',confirm:listener.listening?'Listening for yes or no':'Ask something else'}[phase];
 return <section className={`ask-voice ${phase}`} aria-label="Ask out loud">
  <button type="button" className="ask-voice-button" onClick={tap} disabled={phase==='thinking'} aria-pressed={phase==='listening'}>
   {phase==='listening'?<Square size={22}/>:phase==='speaking'?<Volume2 size={22}/>:<Mic size={22}/>}<span>{label}</span></button>
  <p className="ask-voice-hint">{phase==='listening'?(heard||listener.thinking||'Listening… it sends when you stop talking.')
   :step?`Say what you want to know about ${step.title}.`:'Say it: “move the garden to after lunch”, “add ramen near the hotel at seven”, “make Thursday easier”.'}</p>
  {heard&&phase!=='listening'&&<p className="ask-voice-heard"><small>You said</small>{heard}</p>}
  {said&&phase==='speaking'&&<p className="ask-voice-said" aria-live="polite">{said}</p>}
  {phase==='confirm'&&pending.current&&<div className="row wrap ask-voice-confirm">
   <button type="button" className="primary" onClick={()=>{listener.stop();purpose.current='';yes();}}><Check size={16}/>Yes, make the change</button>
   <button type="button" onClick={()=>{listener.stop();purpose.current='';no();}}><X size={16}/>No, leave it</button></div>}
  {(error||listener.problem)&&<p className="callout"><AlertCircle size={18}/>{error||listener.problem}</p>}
 </section>;
}
