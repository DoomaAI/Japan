import React,{useEffect,useRef,useState} from 'react';
import {Share2,Sparkles,ChevronRight} from 'lucide-react';
import {halfwayCard,halfwayDue,drawHalfway} from './halfway-data.js';
import {japanDate} from './timing.js';
// The square, drawn on the phone and handed to the share sheet as a picture; saved instead on a
// browser that cannot share a file. Nothing leaves the phone that is not on the picture.
export default function HalfwayCard({state,notice,go}){
 const today=japanDate(),card=halfwayCard(state,{today}),ref=useRef(null),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!card||!ref.current)return;let on=true;(document.fonts?.ready||Promise.resolve()).then(()=>{if(on)drawHalfway(card,ref.current);});return()=>{on=false;};},[JSON.stringify(card)]);
 if(!card)return <p>Nothing to wrap up yet.</p>;
 const share=async()=>{setBusy(true);try{await shareSquare(ref.current,`Japan so far - day ${card.dayNumber}.png`,'Japan so far',`Day ${card.dayNumber} of ${card.total}.`,notice);}finally{setBusy(false);}};
 return <div className="halfway">
  <p>Day {card.dayNumber} of {card.total}: the trip so far on one square, for Messages or the grandparents.</p>
  <canvas ref={ref} className="halfway-canvas" aria-label="The trip so far, as a picture"/>
  <div className="row wrap"><button type="button" className="primary" disabled={busy} onClick={share}><Share2 size={16}/>{navigator.canShare?'Share the picture':'Save the picture'}</button>{go&&<button type="button" onClick={()=>go('recap')}><Sparkles size={16}/>The whole story so far</button>}</div>
 </div>;
}
export function HalfwayLine({state,open}){
 const today=japanDate();
 if(!halfwayDue(state,today))return null;
 const card=halfwayCard(state,{today});if(!card)return null;
 return <button type="button" className="puzzle-line halfway-line" onClick={open}><span aria-hidden="true">✨</span><span><b>Halfway there · day {card.dayNumber} of {card.total}</b><small>The trip so far on one square, to share</small></span><ChevronRight size={18}/></button>;
}
// A square on a canvas, to the share sheet as a picture, or saved where a browser cannot share
// a file. Shared by the halfway card and the Blend.
export async function shareSquare(canvas,name,title,text,notice){
 try{
  const blob=await new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(new Error('The card could not be drawn.')),'image/png'));
  const file=new File([blob],name,{type:'image/png'});
  if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title,text});
  else{const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:file.name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);notice?.('Saved to the phone.');}
 }catch(e){if(e?.name!=='AbortError')notice?.(e?.message||'The card could not be shared.');}
}
