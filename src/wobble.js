import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {dropLink} from './card-links.js';
const HOLD=450,SLOP=10;
// Press and hold, then drag: the way icons are rearranged on an iPhone's home screen, for any
// row of buttons whose order is somebody's own — the buttons under a stop, and the shortcuts
// along the bottom bar.
//
// Holding any item for a moment sets the row wobbling. While it wobbles a tap does nothing but
// pick an item up, an item dragged over another takes its place, and a row that scrolls
// sideways carries on scrolling when an item is held near either end. A tap anywhere outside
// the row or Escape settles it, and the new order is handed to onMove once, on the drop. The arrow
// keys move a focused item along for anybody not using a finger.
//
// It is a hook rather than a component so the row and its items stay the elements they already
// were: the caller spreads rowProps onto the row and item(id) onto each item, and marks the row
// data-wobbling while editing is true.
//
// Several rows can wobble as one, as every section of More does: pass the same editing and
// setEditing to each, and a tap on an item in any of them keeps them all wobbling. Anything
// marked data-wobble-tool (a badge on an item, a Done button) is left to its own tap.
export function useWobble({ids,onMove,editing:shared,setEditing:setShared}){
 const [own,setOwn]=useState(false),[live,setLive]=useState(null),[held,setHeld]=useState(null);
 const editing=shared??own,setEditing=setShared||setOwn;
 const row=useRef(null),bar=useRef(null),press=useRef(null),drag=useRef(null),eat=useRef(false);
 const order=live||ids;
 const finish=()=>{setEditing(false);setHeld(null);drag.current=null;};
 useEffect(()=>{
  if(!editing)return;
  const away=e=>{
   if(e.target.closest?.('[data-wobble-tool]'))return;
   if(setShared?e.target.closest?.('[data-link]'):row.current?.contains(e.target))return;
   finish();
  };
  const esc=e=>{if(e.key==='Escape')finish();};
  document.addEventListener('pointerdown',away);document.addEventListener('keydown',esc);
  return ()=>{document.removeEventListener('pointerdown',away);document.removeEventListener('keydown',esc);};
 },[editing]);
 useEffect(()=>()=>{clearTimeout(press.current?.timer);cancelAnimationFrame(drag.current?.frame);},[]);
 // The item being dragged is drawn under the finger. Its place moves as the others shuffle and
 // as the row scrolls, so the offset is worked out afresh from where the item is laid out now.
 const follow=()=>{
  const d=drag.current;if(!d)return;
  const dx=d.x-d.startX+(row.current.scrollLeft-d.scroll)-(d.el.offsetLeft-d.left),dy=d.y-d.startY-(d.el.offsetTop-d.top);
  d.el.style.transform=`translate(${dx}px,${dy}px) scale(1.1)`;
 };
 useLayoutEffect(follow,[live]);
 const hit=()=>{
  const d=drag.current;if(!d)return;
  const onto=[...row.current.querySelectorAll('[data-link]')].find(s=>{
   if(s===d.el)return false;
   const r=s.getBoundingClientRect();
   return d.x>=r.left&&d.x<=r.right&&d.y>=r.top&&d.y<=r.bottom;
  });
  if(onto)setLive(was=>dropLink(was||ids,d.id,onto.dataset.link));
 };
 // Scrolled no further than the row really goes: the lifted item, drawn past the end, would
 // otherwise stretch the row and carry it on scrolling into nothing.
 const edge=()=>{
  const d=drag.current,box=row.current;if(!d||!box)return;
  const r=box.getBoundingClientRect(),by=d.x<r.left+40?-6:d.x>r.right-40?6:0;
  const to=Math.max(0,Math.min(d.max,box.scrollLeft+by));
  if(to!==box.scrollLeft){box.scrollLeft=to;follow();hit();}
  d.frame=requestAnimationFrame(edge);
 };
 const itemOf=e=>{
  if(e.target.closest?.('[data-wobble-tool]'))return null;
  const el=e.target.closest?.('[data-link]');return el&&row.current?.contains(el)?el:null;
 };
 function down(e){
  const el=itemOf(e);if(!el)return;
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
  try{el.setPointerCapture(e.pointerId);}catch{}
  const box=row.current;
  drag.current={id:el.dataset.link,el,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,
   left:el.offsetLeft,top:el.offsetTop,scroll:box.scrollLeft,max:box.scrollWidth-box.clientWidth};
  drag.current.frame=requestAnimationFrame(edge);
  setLive(ids);setHeld(el.dataset.link);
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
  if(live&&live.join()!==ids.join())onMove(live);
  setLive(null);
 }
 function key(e,id){
  if(!editing)return;
  const by={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[e.key],next=by&&ids[ids.indexOf(id)+by];
  if(!by)return;
  e.preventDefault();
  if(next)onMove(dropLink(ids,id,next));
 }
 return {editing,finish,order,row,bar,
  rowProps:{ref:row,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,
   onContextMenu:e=>{if(itemOf(e))e.preventDefault();},
   // While the row wobbles a tap picks an item up rather than opening it, and the tap that
   // ends the long press is not a tap on the item either.
   onClickCapture:e=>{if(editing||eat.current){if(itemOf(e)){e.preventDefault();e.stopPropagation();}eat.current=false;}}},
  item:id=>({'data-link':id,onKeyDown:e=>key(e,id),held:held===id})};
}
// The visible items of a longer list, put in a new order, back into that list: each visible
// item's place is kept for whichever visible item now comes there, and the rest stay put.
export function mergeVisible(full,visible){
 const seen=new Set(visible);let i=0;
 return full.map(id=>seen.has(id)?visible[i++]:id);
}
