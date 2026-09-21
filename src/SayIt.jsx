import React,{useState,useEffect} from 'react';
import {Volume2,Square} from 'lucide-react';
import {useReadAloud} from './AdventurePages.jsx';
import {voiceState,settled,canOffer} from './speech.js';
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
 const {supported,reading,read}=useReadAloud();
 const japanese=useJapaneseVoice();
 if(!phrase?.ja)return null;
 return <div className={`say-it ${size}`}>
  <p className="japanese" lang="ja">{phrase.ja}</p>
  {phrase.en&&<p className="say-en">{phrase.en}</p>}
  <p className="say-phonics"><span aria-hidden="true">say</span> {phrase.say}</p>
  {showRomaji&&phrase.romaji&&<small>{phrase.romaji}</small>}
  {canOffer(supported,japanese)&&<button type="button" className="hear-it" onClick={()=>read(phrase.ja,phrase.ja,'ja-JP')}>
   {reading===phrase.ja?<><Square size={14}/>Stop</>:<><Volume2 size={15}/>Hear it</>}</button>}
 </div>;
}
