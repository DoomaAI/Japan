import React,{useEffect,useRef} from 'react';
import {X,ArrowLeft,ArrowRight} from 'lucide-react';
import {attachmentGroup} from './trip-features.js';
const fileUrl=d=>`/api/document?id=${encodeURIComponent(d.id)}`;
export default function TicketViewer({documents,view,setView}){
 const group=attachmentGroup(documents,view),index=group.findIndex(d=>d.id===view.id),touch=useRef(null);
 const move=delta=>{const next=group[index+delta];if(next)setView(next);};
 useEffect(()=>{
  const onKey=e=>{if(e.key==='Escape')setView(null);else if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1);};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 });
 return <div className="ticket-view">
  <header><strong>{view.person} · {view.title}</strong><div className="row">{group.length>1&&<span className="ticket-view-count">{index+1} / {group.length}</span>}<button aria-label="Close ticket" onClick={()=>setView(null)}><X/></button></div></header>
  <div className="ticket-view-media"
   onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
   onTouchEnd={e=>{
    if(!touch.current||['BUTTON','A'].includes(e.target.tagName))return;
    const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;
    if(Math.abs(dx)>65&&Math.abs(dy)<50)move(dx<0?1:-1);
    touch.current=null;
   }}>
   {view.type==='application/pdf'
    ?<><iframe title={view.title} src={fileUrl(view)}/><a className="button" href={fileUrl(view)} target="_blank" rel="noopener noreferrer">Open PDF in browser</a></>
    :<img key={view.id} src={fileUrl(view)} alt={`${view.person}: ${view.title}`}/>}
  </div>
  {group.length>1&&<div className="ticket-view-nav">
   <button disabled={index<=0} onClick={()=>move(-1)}><ArrowLeft size={18}/>Previous</button>
   <span>Swipe or use the arrows</span>
   <button disabled={index>=group.length-1} onClick={()=>move(1)}>Next<ArrowRight size={18}/></button>
  </div>}
 </div>;
}
