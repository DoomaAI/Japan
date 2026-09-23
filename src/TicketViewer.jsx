import React,{useEffect,useRef} from 'react';
import {X,ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,Film,Image as ImageIcon} from 'lucide-react';
import {attachmentReel,isDrawable} from './trip-features.js';
import ZoomImage from './ZoomImage.jsx';
const fileUrl=d=>`/api/document?id=${encodeURIComponent(d.id)}`;
// The whole Tickets page reads as one strip rather than one booking at a time: swiping past the
// last photo of a ticket carries on into the next ticket instead of stopping dead. Tickets are
// still a unit, so the arrows along the bottom jump a whole booking at a time for the times when
// you want the next reservation, not the fourth photo of this one.
export default function TicketViewer({documents,tickets=[],view,setView}){
 const reel=attachmentReel(documents,tickets,view),index=reel.findIndex(e=>e.file.id===view.id),touch=useRef(null),zoomed=useRef(false);
 const here=reel[index],ticket=here?.ticket||null;
 const order=[...new Set(reel.map(e=>e.ticket?.id))],ticketAt=order.indexOf(ticket?.id);
 const within=reel.filter(e=>e.ticket?.id===ticket?.id),place=within.findIndex(e=>e.file.id===view.id);
 const move=delta=>{const next=reel[index+delta];if(next)setView(next.file);};
 // Jumping lands on a ticket's own first file, so the next booking opens at its ticket rather
 // than wherever the previous one happened to leave off.
 const jump=delta=>{const at=ticketAt+delta;if(at<0||at>=order.length)return;const next=reel.find(e=>e.ticket?.id===order[at]);if(next)setView(next.file);};
 useEffect(()=>{
  const onKey=e=>{
   if(e.key==='Escape')setView(null);
   else if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1);
   // Up and down step a whole booking; they are held back from scrolling the overlay so a
   // tall PDF does not slide away underneath the jump.
   else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();jump(e.key==='ArrowUp'?-1:1);}
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 });
 return <div className="ticket-view">
  <header>
   <div className="ticket-view-title"><strong>{view.person} · {view.title}</strong>{ticket&&ticket.id!==view.id&&<small>Attached to {ticket.title}</small>}</div>
   <div className="row">{reel.length>1&&<span className="ticket-view-count">{index+1} / {reel.length}</span>}<button aria-label="Close ticket" onClick={()=>setView(null)}><X/></button></div>
  </header>
  <div className="ticket-view-media"
   // A swipe is one finger on a photo at its normal size. A second finger is a pinch, and once
   // the photo is zoomed a drag looks around it, so neither turns the page.
   onTouchStart={e=>{touch.current=e.touches.length===1&&!zoomed.current?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;}}
   onTouchEnd={e=>{
    if(!touch.current||zoomed.current||['BUTTON','A'].includes(e.target.tagName))return;
    const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;
    if(Math.abs(dx)>65&&Math.abs(dy)<50)move(dx<0?1:-1);
    touch.current=null;
   }}>
   {view.type==='application/pdf'
    ?<><iframe title={view.title} src={fileUrl(view)}/><a className="button" href={fileUrl(view)} target="_blank" rel="noopener noreferrer">Open PDF in browser</a></>
    :isDrawable(view)
     ?<ZoomImage key={view.id} src={fileUrl(view)} alt={`${view.person}: ${view.title}`} onZoom={z=>{zoomed.current=z;}}/>
     // A HEIC photo or a video cannot be drawn here, and now that the strip runs on past one
     // ticket it can be reached by a swipe rather than only by choosing it. Say what it is and
     // hand it to the phone, which opens both natively, instead of showing a broken picture.
     :<div className="ticket-view-tile">{view.type?.startsWith('video/')?<Film size={34}/>:<ImageIcon size={34}/>}<p>{view.type?.startsWith('video/')?'A video, which this page cannot play.':'A photo in a format this browser cannot draw.'}</p><a className="button" href={fileUrl(view)} target="_blank" rel="noopener noreferrer">Open the original</a></div>}
  </div>
  {reel.length>1&&<div className="ticket-view-nav">
   <button disabled={index<=0} onClick={()=>move(-1)}><ArrowLeft size={18}/>Previous</button>
   <span>Swipe or use the arrows · pinch to zoom{order.length>1?' · it carries on into the next ticket':''}</span>
   <button disabled={index>=reel.length-1} onClick={()=>move(1)}>Next<ArrowRight size={18}/></button>
  </div>}
  {order.length>1&&<div className="ticket-view-tickets">
   <button disabled={ticketAt<=0} aria-label="Previous ticket" onClick={()=>jump(-1)}><ChevronLeft size={18}/>Ticket</button>
   <span><strong>{ticket?.title}</strong>Ticket {ticketAt+1} of {order.length}{within.length>1?` · file ${place+1} of ${within.length}`:''}</span>
   <button disabled={ticketAt>=order.length-1} aria-label="Next ticket" onClick={()=>jump(1)}>Ticket<ChevronRight size={18}/></button>
  </div>}
 </div>;
}
