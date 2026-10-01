import React,{useEffect,useRef,useState} from 'react';
import {Mic2,Snail} from 'lucide-react';
import {wordsOf,litCount,beats} from './synced-words.js';
import {matchVoice,SLOW_RATE} from './speech.js';
// Say it with me: the romaji words light up as the phone says the phrase, at talking pace or
// slowly. Nothing to read for a boy who cannot yet; the lit word is where to join in.
export default function SyncedPhrase({phrase}){
 const words=wordsOf(phrase?.romaji),[lit,setLit]=useState(-1),[speaking,setSpeaking]=useState(false);
 const timers=useRef([]);
 const clear=()=>{timers.current.forEach(clearTimeout);timers.current=[];};
 useEffect(()=>()=>{clear();try{window.speechSynthesis?.cancel();}catch{}},[]);
 useEffect(()=>{clear();setLit(-1);setSpeaking(false);},[phrase?.id]);
 const synth=typeof window!=='undefined'?window.speechSynthesis:null;
 if(!phrase?.ja||!words.length||!synth||typeof SpeechSynthesisUtterance==='undefined')return null;
 function go(slow){
  clear();synth.cancel();
  const rate=slow?SLOW_RATE:0.8,u=new SpeechSynthesisUtterance(phrase.ja);
  u.lang='ja-JP';u.rate=rate;const v=matchVoice(synth.getVoices(),'ja');if(v)u.voice=v;
  let heard=false;
  u.onboundary=e=>{heard=true;clear();setLit(litCount(words,phrase.ja.length,e.charIndex)-1);};
  u.onstart=()=>{setSpeaking(true);setLit(0);
   // No word positions after a moment: fall back to a steady beat through the words.
   timers.current.push(setTimeout(()=>{if(heard)return;let t=0;beats(words,rate).forEach((ms,i)=>{timers.current.push(setTimeout(()=>{if(!heard)setLit(i);},t));t+=ms;});},350));};
  u.onend=u.onerror=()=>{clear();setSpeaking(false);setLit(words.length);timers.current.push(setTimeout(()=>setLit(-1),1200));};
  synth.speak(u);
 }
 return <div className="synced-phrase">
  <p className="synced-words" aria-live="off">{words.map((w,i)=><span key={i} className={i<lit?'said':i===lit?'now':''}>{w}</span>)}</p>
  <div className="row wrap">
   <button type="button" disabled={speaking} onClick={()=>go(false)}><Mic2 size={15}/>Say it with me</button>
   <button type="button" disabled={speaking} onClick={()=>go(true)}><Snail size={16}/>Slower</button>
  </div>
 </div>;
}
