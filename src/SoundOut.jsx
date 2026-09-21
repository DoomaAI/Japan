import React,{useState,useContext} from 'react';
import {Volume2,Square} from 'lucide-react';
import {VOWELS,MOUTH,vowel,bubbleRows} from './phonics.js';
import {useReadAloud} from './AdventurePages.jsx';
import {useJapaneseVoice} from './SayIt.jsx';
import {canOffer,speechRate,SLOW_RATE,speechKey} from './speech.js';
import {PhraseAudio,ClipButton} from './PhraseAudio.jsx';
// The mouth you make for one of the five Japanese vowels, drawn rather than lettered — the
// letter is the thing he cannot read. A face with no eyes, because it is the mouth that
// matters and a face with eyes gets looked at instead.
export function Mouth({id,size=44}){
 const v=vowel(id),shape=MOUTH[id];
 if(!v||!shape)return null;
 return <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Mouth shape for “${v.say}”`}>
  <circle cx="50" cy="50" r="48" fill={v.colour}/>
  <ellipse cx="50" cy={50+shape.curve} rx={shape.rx} ry={shape.ry} fill="#2b1a1a"/>
  <ellipse cx="50" cy={50+shape.curve-shape.ry*0.45} rx={shape.rx*0.82} ry={shape.ry*0.22} fill="#ffffff" opacity=".85"/>
 </svg>;
}
// A chart of all five, for the grown-up sitting next to him the first time.
export function MouthKey(){
 return <details className="mouth-key"><summary>The five mouths</summary>
  <div className="mouth-key-row">{VOWELS.map(v=>
   <div key={v.id}><Mouth id={v.id} size={52}/><strong>{v.say}</strong><small>{v.hint}</small></div>)}</div>
  <p><small>Every Japanese syllable lands on one of these five. Make the shape, then put the first sound in front of it.</small></p>
 </details>;
}
// Sounding a phrase out one bubble at a time. Tap a mouth and the phone says just that
// syllable, slowly; tap the big one and it says the lot. Nothing here has to be read.
export default function SoundOut({phrase}){
 const {supported,reading,read,problem}=useReadAloud();
 const japanese=useJapaneseVoice();
 const audio=useContext(PhraseAudio);
 const [lit,setLit]=useState(-1);
 const clip=phrase?.id?audio?.clips?.[phrase.id]:null;
 const canSpeak=canOffer(supported,japanese);
 const rows=bubbleRows(phrase?.say);
 if(!rows.length)return null;
 // One syllable, said on its own and slowly. The English spelling of the chunk is what the
 // phone is given — it is an English voice making an English sound, which is the point.
 const sayChunk=(bubble)=>{
  setLit(bubble.index);
  setTimeout(()=>setLit(now=>now===bubble.index?-1:now),900);
  if(canSpeak)read(`chunk-${phrase.id}-${bubble.index}`,bubble.text,'en-AU',SLOW_RATE);
 };
 const whole=speechKey(phrase.ja,'nate');
 return <div className="sound-out">
  <div className="sound-rows">{rows.map((row,r)=>
   <div className="sound-row" key={r}>{row.map(bubble=>
    <button type="button" key={bubble.index} className={`sound-bubble${lit===bubble.index?' lit':''}`}
     aria-label={`Say ${bubble.text}`} onClick={()=>sayChunk(bubble)}>
     <Mouth id={bubble.vowel}/>
     <small>{bubble.text}</small>
    </button>)}</div>)}
  </div>
  <div className="row wrap sound-play">
   {clip
    ?<ClipButton clip={clip} label="All together"/>
    :canSpeak&&<button type="button" className="hear-it big"
      onClick={()=>read(whole,phrase.ja,'ja-JP',speechRate('ja'))}>
      {reading===whole?<><Square size={16}/> Stop</>:<><Volume2 size={18}/> All together</>}</button>}
  </div>
  {problem&&<small className="hear-problem">{problem}</small>}
 </div>;
}
