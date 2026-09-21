import React,{useState} from 'react';
import {Volume2,Stethoscope} from 'lucide-react';
import {soundCheckLines,claimPlayback,warmUp,matchVoice} from './speech.js';
const build=typeof __BUILD__!=='undefined'?__BUILD__:'development';
const standalone=()=>{
 try{return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;}catch{return false;}
};
// When someone says "I pressed it and nothing happened", this is what turns that into
// something anyone can act on: the phone says what it did, in plain words.
export default function SoundCheck(){
 const [facts,setFacts]=useState(null),[running,setRunning]=useState(false);
 function run(){
  const supported=typeof window!=='undefined'&&'speechSynthesis'in window&&'SpeechSynthesisUtterance'in window;
  const synth=supported?window.speechSynthesis:null;
  let voices=null;try{voices=synth?.getVoices()||null;}catch{}
  const base={build,standalone:standalone(),supported,voices,audioSession:claimPlayback(),started:null,ended:null,startedAfter:null,error:''};
  if(!supported){setFacts(base);return;}
  setRunning(true);
  const began=Date.now();
  try{synth.cancel();}catch{}
  const say=new window.SpeechSynthesisUtterance('こんにちは');
  say.lang='ja-JP';say.rate=.8;
  const voice=matchVoice(voices,'ja');if(voice)say.voice=voice;
  const result={...base,started:false,ended:false};
  say.onstart=()=>{result.started=true;result.startedAfter=Date.now()-began;setFacts({...result});};
  say.onend=()=>{result.ended=true;setFacts({...result});setRunning(false);};
  say.onerror=e=>{result.error=e?.error||'unknown';setFacts({...result});setRunning(false);};
  try{synth.resume();}catch{}
  warmUp(synth,window.SpeechSynthesisUtterance);
  synth.speak(say);
  setFacts({...result});
  // If the phone never reports back, stop waiting on it and show what we have.
  setTimeout(()=>{setRunning(false);setFacts(f=>f?{...f,...result}:f);},2500);
 }
 return <details className="sound-check">
  <summary><Stethoscope size={15}/> Sound check — no sound when you tap Hear it?</summary>
  <ol>
   <li>On an iPhone, look at the <strong>switch above the volume buttons</strong>. If you can see orange, the phone is on silent and no app can talk its way past it.</li>
   <li>Turn the volume up with the phone unlocked and this page open.</li>
   <li>Tap the button below. It says <span lang="ja">こんにちは</span> and then reports what the phone actually did.</li>
  </ol>
  <button type="button" className="primary" disabled={running} onClick={run}><Volume2 size={16}/> {running?'Listening…':'Test the sound'}</button>
  {facts&&<div className="sound-report">
   {soundCheckLines(facts).map(([label,value])=><p key={label}><span>{label}</span><strong>{value}</strong></p>)}
   <small>{facts.started===false&&!facts.error
    ?'The phone never started speaking. That is the phone refusing, not the app failing — check the silent switch first.'
    :facts.started&&!facts.error
     ?'The phone says it spoke. If you heard nothing, it is the silent switch or the volume, not the app.'
     :'Read this back to whoever is helping you and they will know where to look.'}</small>
  </div>}
 </details>;
}
