import React,{useEffect,useRef,useState} from 'react';
import {Share2} from 'lucide-react';
import {blendFor,blendDue,drawBlend} from './blend-data.js';
import {shareSquare} from './HalfwayCard.jsx';
import {japanDate} from './timing.js';
import {isChild} from './child-levels.js';
// The Blend: pick any two of us, see what we both starred and where we parted ways, and share it
// as a square. Starts on the two boys, because they are the pair everyone wants to see.
export default function BlendCard({state,notice}){
 const people=state.members||[],kids=people.filter(n=>isChild(state,n));
 const [a,setA]=useState(kids[0]||people[0]),[b,setB]=useState(kids[1]||people.find(n=>n!==(kids[0]||people[0])));
 const bl=blendFor(state,a,b),ref=useRef(null),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!bl||!ref.current)return;let on=true;(document.fonts?.ready||Promise.resolve()).then(()=>{if(on)drawBlend(bl,ref.current);});return()=>{on=false;};},[JSON.stringify(bl)]);
 const pick=(value,set,other)=><select value={value} onChange={e=>set(e.target.value)}>{people.filter(n=>n!==other).map(n=><option key={n}>{n}</option>)}</select>;
 return <div className="halfway blend">
  <p>Any two of us: what you both gave five stars, the food you both loved, and the stop you never agreed on.</p>
  <div className="row wrap blend-pick">{pick(a,setA,b)}<span>+</span>{pick(b,setB,a)}</div>
  {bl&&<canvas ref={ref} className="halfway-canvas" aria-label={`The Blend for ${a} and ${b}, as a picture`}/>}
  {bl&&<button type="button" className="primary" disabled={busy} onClick={async()=>{setBusy(true);try{await shareSquare(ref.current,`Blend - ${a} and ${b}.png`,'The Blend',`${a} + ${b}`,notice);}finally{setBusy(false);}}}><Share2 size={16}/>{navigator.canShare?'Share the picture':'Save the picture'}</button>}
 </div>;
}
export function BlendLine({state,open}){
 if(!blendDue(state,japanDate()))return null;
 return <button type="button" className="puzzle-line halfway-line" onClick={open}><span aria-hidden="true">🎧</span><span><b>The Blend</b><small>What any two of us both starred, and where we never agreed</small></span></button>;
}
