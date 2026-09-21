import React,{useState,useRef} from 'react';
import {Volume2,Stethoscope,Music} from 'lucide-react';
import {soundCheckLines,claimPlayback,matchVoice,isStandalone,silenceAdvice,SILENCE_HELP,toneUri,holdPlayback,releasePlayback,keepHolding,whenHolding} from './speech.js';
const build=typeof __BUILD__!=='undefined'?__BUILD__:'development';
const standalone=isStandalone;
// When someone says "I pressed it and nothing happened", this is what turns that into
// something anyone can act on: the phone says what it did, in plain words.
//
// There are two separate questions and they have different answers, which is why there are
// two tests. A recorded sound and the phone's own speaking voice go through different parts
// of iOS: the ring switch can silence the speaking while a recording plays perfectly well.
// Knowing which of the two a phone will do is the difference between a fix and a guess.
export default function SoundCheck(){
 const [facts,setFacts]=useState(null),[running,setRunning]=useState(false);
 const [tone,setTone]=useState(null),[playing,setPlaying]=useState(false);
 const player=useRef(null);
 async function playTone(){
  setTone(null);setPlaying(true);
  try{
   claimPlayback();
   holdPlayback();
   const audio=player.current||(player.current=new Audio());
   audio.src=toneUri();
   audio.onended=()=>{releasePlayback();setPlaying(false);};
   audio.onerror=()=>{releasePlayback();setPlaying(false);setTone('the phone refused to play it');};
   await audio.play();
   setTone('played');
  }catch(e){releasePlayback();setPlaying(false);setTone(e?.name==='NotAllowedError'?'the phone would not allow it':(e?.message||'it would not play'));}
 }
 function run(){
  const supported=typeof window!=='undefined'&&'speechSynthesis'in window&&'SpeechSynthesisUtterance'in window;
  const synth=supported?window.speechSynthesis:null;
  let voices=null;try{voices=synth?.getVoices()||null;}catch{}
  const base={build,standalone:standalone(),supported,voices,audioSession:claimPlayback(),tone,started:null,ended:null,startedAfter:null,error:''};
  if(!supported){setFacts(base);return;}
  setRunning(true);
  const began=Date.now();
  try{synth.cancel();}catch{}
  const say=new window.SpeechSynthesisUtterance('こんにちは');
  say.lang='ja-JP';say.rate=.8;
  const voice=matchVoice(voices,'ja');if(voice)say.voice=voice;
  const result={...base,started:false,ended:false};
  const stop=()=>releasePlayback();
  say.onstart=()=>{result.started=true;result.startedAfter=Date.now()-began;setFacts({...result});};
  say.onend=()=>{stop();result.ended=true;setFacts({...result});setRunning(false);};
  say.onerror=e=>{stop();result.error=e?.error||'unknown';setFacts({...result});setRunning(false);};
  try{synth.resume();}catch{}
  holdPlayback();
  // The same two rules the rest of the app speaks under, or this measures a path nobody else
  // takes: speak once the hold is really playing, and put the hold back if iOS drops it.
  const nudge=setInterval(keepHolding,1000);
  whenHolding(()=>{try{synth.speak(say);}catch(e){stop();result.error=e?.message||'it would not speak';setFacts({...result});setRunning(false);}});
  setFacts({...result});
  // If the phone never reports back, stop waiting on it and show what we have.
  setTimeout(()=>{clearInterval(nudge);stop();setRunning(false);setFacts(f=>f?{...f,...result}:f);},2500);
 }
 return <details className="sound-check">
  <summary><Stethoscope size={15}/> Sound check — no sound when you tap Hear it?</summary>
  <ol>
   <li><strong>Headphones or AirPods always work</strong>, silent switch or not. That is the sure way.</li>
   <li>Otherwise, on an iPhone look at the <strong>switch above the volume buttons</strong>. If you can see orange, the phone is on silent.</li>
   <li>Turn the volume up with the phone unlocked and this page open.</li>
   <li>Tap <strong>both</strong> buttons below and note which ones you could hear. They are different parts of the phone and one can work when the other does not.</li>
  </ol>
  <div className="row wrap">
   <button type="button" disabled={playing} onClick={playTone}><Music size={16}/> {playing?'Playing…':'1 · Play a beep'}</button>
   <button type="button" className="primary" disabled={running} onClick={run}><Volume2 size={16}/> {running?'Listening…':'2 · Say a word'}</button>
  </div>
  <p><small>The beep is a recording. The word is the phone speaking for itself. <strong>If you can hear the beep but not the word, the phrases can still be heard</strong> — record them once from a device where the speaking works and every phone will play the recording instead.</small></p>
  {facts&&<div className="sound-report">
   {soundCheckLines(facts).map(([label,value])=><p key={label}><span>{label}</span><strong>{value}</strong></p>)}
   {/* The beep is half the answer and it was being thrown away here: a phone that plays a
       recording and will not speak has a fix nothing else names, and only this screen knows
       both halves. */}
   <p className="sound-verdict">{SILENCE_HELP[silenceAdvice({started:facts.started,standalone:facts.standalone,tone:facts.tone})]}</p>
   {facts.started===false&&facts.standalone&&<p><a href={location.href} target="_blank" rel="noopener">Open this page in Safari</a> — speech usually works there when it will not here.</p>}
   <small>Read this back to whoever is helping you and they will know where to look.</small>
  </div>}
 </details>;
}
