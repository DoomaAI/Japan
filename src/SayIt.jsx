import React,{useState,useEffect} from 'react';
import {Volume2,Square,Snail} from 'lucide-react';
import {useReadAloud} from './AdventurePages.jsx';
import {voiceState,settled,canOffer,speechKey,speechRate,SLOW_RATE,phonicChunks} from './speech.js';
const voices=()=>{try{return window.speechSynthesis?.getVoices()||null;}catch{return null;}};
export const hasJapaneseVoice=()=>voiceState(voices())==='yes';
// The voice list arrives late, and on some phones the voiceschanged event never comes at all,
// so look again a few times before settling on an answer.
export function useJapaneseVoice(){
 const [state,setState]=useState(()=>voiceState(voices()));
 useEffect(()=>{
  if(settled(state)||typeof window==='undefined'||!window.speechSynthesis)return;
  let live=true;
  const check=()=>{if(live)setState(voiceState(voices()));};
  window.speechSynthesis.addEventListener?.('voiceschanged',check);
  const timers=[80,300,900,2500].map(ms=>setTimeout(check,ms));
  return ()=>{live=false;timers.forEach(clearTimeout);window.speechSynthesis.removeEventListener?.('voiceschanged',check);};
 },[state]);
 return state;
}
// Japanese, what it means, and how to say it. The phone reads the Japanese aloud unless it
// has told us it has no Japanese voice, in which case the button is not offered.
export default function SayIt({phrase,size='',showRomaji=true}){
 const {supported,reading,read,problem}=useReadAloud();
 const japanese=useJapaneseVoice();
 if(!phrase?.ja)return null;
 // Two speeds, because a phrase read at talking pace is no use to someone learning it.
 // Each speed is its own button, so tapping the other one switches rather than stops.
 const key=speed=>speechKey(phrase.ja,speed);
 const button=(speed,rate,label,Icon,size_)=>
  <button type="button" className={`hear-it${speed==='slow'?' slow':''}`} aria-label={reading===key(speed)?'Stop':label}
   onClick={()=>read(key(speed),phrase.ja,'ja-JP',rate)}>
   {reading===key(speed)?<><Square size={14}/>Stop</>:<><Icon size={size_}/>{label}</>}</button>;
 return <div className={`say-it ${size}`}>
  <p className="japanese" lang="ja">{phrase.ja}</p>
  {phrase.en&&<p className="say-en">{phrase.en}</p>}
  <p className="say-phonics"><span aria-hidden="true">say</span> <span>{phonicChunks(phrase.say,phrase.hold).map((c,i)=>
   c.hold?<b key={i} title="Hold this one — two beats, not one">{c.text}</b>:<React.Fragment key={i}>{c.text}</React.Fragment>)}</span></p>
  {showRomaji&&phrase.romaji&&<small>{phrase.romaji}</small>}
  {canOffer(supported,japanese)&&<span className="hear-row">
   {button('normal',undefined,'Hear it',Volume2,15)}
   {button('slow',SLOW_RATE,'Slowly',Snail,16)}
  </span>}
  {problem&&<small className="hear-problem">{problem}</small>}
 </div>;
}
