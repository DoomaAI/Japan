import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {dropLink,stepLink} from './card-links.js';
const HOLD=450,SLOP=10;
// The row of buttons under a stop, in this person's order. Press and hold any of them and the
// row starts to wobble, like the icons on an iPhone's home screen: while it wobbles, a tap does
// nothing but pick a button up, dragging it over another puts it there, and Done (or a tap
// anywhere else) settles the row and saves the order. The arrow keys move a focused button
// along for anybody not using a finger.
//
// Each button sits in a slot of its own so it can be picked up and hit-tested without touching
// the button itself, which keeps doing exactly what it did before when the row is still.
export default function StopButtons({order,setOrder,buttons,label}){
 const [editing,setEditing]=useState(false),[live,setLive]=useState(null),[held,setHeld]=useState(null);
 const row=useRef(null),bar=useRef(null),press=useRef(null),drag=useRef(null),eat=useRef(false);
 const current=live||order,shown=current.filter(id=>buttons[id]);
 const finish=()=>{setEditing(false);setHeld(null);drag.current=null;};
 // A tap anywhere outside the row settles it, as it does on the home screen.
 useEffect(()=>{
  if(!editing)return;
  const away=e=>{if(!row.current?.contains(e.target)&&!bar.current?.contains(e.target))finish();};
  const esc=e=>{if(e.key==='Escape')finish();};
  document.addEventListener('pointerdown',away);document.addEventListener('keydown',esc);
  return ()=>{document.removeEventListener('pointerdown',away);document.removeEventListener('keydown',esc);};
 },[editing]);
 useEffect(()=>()=>{clearTimeout(press.current?.timer);cancelAnimationFrame(drag.current?.frame);},[]);
 // The button being dragged is drawn under the finger. Its slot moves as the others shuffle and
 // as the row scrolls, so the offset is worked out afresh from where the slot is now.
 const follow=()=>{
  const d=drag.current;if(!d)return;
  const dx=d.x-d.startX+(row.current.scrollLeft-d.scroll)-(d.el.offsetLeft-d.left),dy=d.y-d.startY-(d.el.offsetTop-d.top);
  d.el.style.transform=`translate(${dx}px,${dy}px) scale(1.12)`;
 };
 // Over another button, the held one takes its place.
 const hit=()=>{
  const d=drag.current;if(!d)return;
  const onto=[...row.current.querySelectorAll('[data-link]')].find(s=>{
   if(s===d.el)return false;
   const r=s.getBoundingClientRect();
   return d.x>=r.left&&d.x<=r.right&&d.y>=r.top&&d.y<=r.bottom;
  });
  if(onto)setLive(was=>dropLink(was||order,d.id,onto.dataset.link));
 };
 // On a phone the row scrolls sideways, so a button held near either end carries on scrolling
 // it, the way a home screen turns the page, until it is over where it is going.
 const edge=()=>{
  const d=drag.current,box=row.current;if(!d||!box)return;
  const r=box.getBoundingClientRect(),by=d.x<r.left+40?-6:d.x>r.right-40?6:0;
  // Scrolled no further than the row really goes: the lifted button, drawn past the end, would
  // otherwise stretch the row and carry it on scrolling into nothing.
  const to=Math.max(0,Math.min(d.max,box.scrollLeft+by));
  if(to!==box.scrollLeft){box.scrollLeft=to;follow();hit();}
  d.frame=requestAnimationFrame(edge);
 };
 useLayoutEffect(follow,[live]);
 const slotOf=e=>e.target.closest?.('[data-link]');
 function down(e){
  const slot=slotOf(e);if(!slot)return;
  eat.current=false;
  if(!editing){
   clearTimeout(press.current?.timer);
   press.current={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{
    press.current=null;eat.current=true;setEditing(true);
    try{navigator.vibrate?.(12);}catch{}
   },HOLD)};
   return;
  }
  e.preventDefault();
  try{slot.setPointerCapture(e.pointerId);}catch{}
  drag.current={id:slot.dataset.link,el:slot,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,left:slot.offsetLeft,top:slot.offsetTop,scroll:row.current.scrollLeft,max:row.current.scrollWidth-row.current.clientWidth};
  drag.current.frame=requestAnimationFrame(edge);
  setLive(order);setHeld(slot.dataset.link);
 }
 function move(e){
  const p=press.current;
  if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>SLOP){clearTimeout(p.timer);press.current=null;}
  const d=drag.current;if(!d)return;
  d.x=e.clientX;d.y=e.clientY;follow();hit();
 }
 function up(){
  clearTimeout(press.current?.timer);press.current=null;
  const d=drag.current;if(!d)return;
  cancelAnimationFrame(d.frame);d.el.style.transform='';drag.current=null;setHeld(null);
  if(live&&live.join()!==order.join())setOrder(live);
  setLive(null);
 }
 function key(e,id){
  if(!editing)return;
  const by={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[e.key];
  if(!by)return;
  e.preventDefault();setOrder(stepLink(order,id,by,shown));
 }
 // While the row wobbles a tap picks a button up rather than opening it, and the tap that ends
 // the long press is not a tap on the button either.
 return <>
  <div ref={row} className={`card-links${editing?' editing':''}`} aria-label={label}
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
   onContextMenu={e=>{if(slotOf(e))e.preventDefault();}}
   onClickCapture={e=>{if(editing||eat.current){if(slotOf(e)){e.preventDefault();e.stopPropagation();}eat.current=false;}}}>
   {shown.map(id=><span key={id} data-link={id} className={`card-link-slot${held===id?' held':''}`}
    onKeyDown={e=>key(e,id)}>{buttons[id]}</span>)}
  </div>
  {/* Outside the row, so it is on screen however far along the row has been scrolled. */}
  {editing&&<div ref={bar} className="card-links-editing" role="status">
   <small>Drag them into the order you want{shown.length>1?'. Arrow keys work too.':'.'}</small>
   <button type="button" className="card-links-done" onClick={finish}>Done</button>
  </div>}
 </>;
}
