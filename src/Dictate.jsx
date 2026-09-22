import React,{useEffect,useRef,useState} from 'react';
import {Mic,Square} from 'lucide-react';
import {canDictate,dictationEngine,dictationProblem,DICTATE_LANG,joinSpoken,heardSoFar,MAX_LISTEN_SECONDS,NO_DICTATION,writeInto} from './dictation.js';
// The microphone that sits under a box somebody has to fill in. It listens on the phone and
// writes words into the box; it does not record, send or keep anything, and it never saves —
// what was heard is still there to read, change and send yourself, exactly like typing.
export function useDictation({lang=DICTATE_LANG,onText}={}){
 const [listening,setListening]=useState(false),[thinking,setThinking]=useState(''),[problem,setProblem]=useState('');
 const engine=useRef(null),stopper=useRef(null),settled=useRef(0),write=useRef(onText);
 write.current=onText;
 const supported=canDictate();
 // A listener left running when the screen changes keeps the microphone open, and iOS shows
 // the phone as listening long after the page has gone.
 useEffect(()=>()=>{clearTimeout(stopper.current);try{engine.current?.abort();}catch{}engine.current=null;},[]);
 function stop(){clearTimeout(stopper.current);try{engine.current?.stop();}catch{}}
 function start(){
  const Engine=dictationEngine();
  if(!Engine)return setProblem(NO_DICTATION);
  let rec;
  try{rec=new Engine();}catch{return setProblem(NO_DICTATION);}
  setProblem('');setThinking('');settled.current=0;
  rec.lang=lang;rec.interimResults=true;rec.continuous=true;
  rec.onresult=e=>{
   const {said,thinking:rest,settled:done}=heardSoFar(e?.results,settled.current);
   settled.current=done;
   if(said)write.current?.(said);
   setThinking(rest);
  };
  // 'aborted' and a listener that simply stops after a silence say nothing: a child who has
  // finished talking has not done anything wrong.
  rec.onerror=e=>{const message=dictationProblem(e?.error);if(message)setProblem(message);};
  rec.onend=()=>{clearTimeout(stopper.current);engine.current=null;setListening(false);setThinking('');};
  try{rec.start();}catch{return setProblem(NO_DICTATION);}
  engine.current=rec;setListening(true);
  stopper.current=setTimeout(()=>{try{rec.stop();}catch{}},MAX_LISTEN_SECONDS*1000);
 }
 return {supported,listening,thinking,problem,toggle:()=>listening?stop():start(),stop};
}
// `into` is a reference to the box itself, for a form that reads its boxes when it is sent;
// `onText` is for a box React is holding in state. One or the other, never both.
export default function Dictate({into,onText,lang,label='Say it',what='what you want to say'}){
 const {supported,listening,thinking,problem,toggle}=useDictation({lang,onText:heard=>{
  // Deliberately not focused: on an iPhone, focusing the box throws the keyboard up over
  // the screen mid-sentence, and the words are going in whether it is focused or not.
  if(onText)onText(heard);else writeInto(into?.current,heard);
 }});
 // Where the phone will not do it there is no button: the keyboard's own microphone key is
 // sitting right there, and a dead button is worse than none.
 if(!supported)return null;
 return <div className="dictate-row">
  <button type="button" className={`dictate${listening?' listening':''}`} aria-pressed={listening}
   aria-label={listening?'Stop listening':`${label} — say ${what} instead of typing it`} onClick={toggle}>
   {listening?<><Square size={15}/>Stop</>:<><Mic size={16}/>{label}</>}</button>
  {listening&&<span className="dictate-live" aria-live="polite">{thinking||'Listening…'}</span>}
  {problem&&<small className="hear-problem">{problem}</small>}
 </div>;
}
export {joinSpoken};
