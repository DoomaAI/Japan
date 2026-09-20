import React from 'react';
import {Volume2,Square} from 'lucide-react';
import {useReadAloud} from './AdventurePages.jsx';
// Japanese, what it means, and how to say it. The phone reads the Japanese aloud when it has
// a Japanese voice installed — iOS does; where it does not, the button simply is not offered.
export const hasJapaneseVoice=()=>{
 try{return (window.speechSynthesis?.getVoices()||[]).some(v=>String(v.lang).toLowerCase().startsWith('ja'));}catch{return false;}
};
export default function SayIt({phrase,size='',showRomaji=true}){
 const {supported,reading,read}=useReadAloud();
 if(!phrase?.ja)return null;
 const canHear=supported&&hasJapaneseVoice();
 return <div className={`say-it ${size}`}>
  <p className="japanese" lang="ja">{phrase.ja}</p>
  {phrase.en&&<p className="say-en">{phrase.en}</p>}
  <p className="say-phonics"><span aria-hidden="true">say</span> {phrase.say}</p>
  {showRomaji&&phrase.romaji&&<small>{phrase.romaji}</small>}
  {canHear&&<button type="button" className="hear-it" onClick={()=>read(phrase.ja,phrase.ja,'ja-JP')}>
   {reading===phrase.ja?<><Square size={14}/>Stop</>:<><Volume2 size={15}/>Hear it</>}</button>}
 </div>;
}
