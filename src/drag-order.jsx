import React,{useEffect,useRef,useState} from 'react';
import {GripVertical} from 'lucide-react';
import {follow,settle} from './lift.js';
import {END,stepBefore} from './drag-list.js';
// A list put in order by dragging, as on the day at a glance: Customise and Settings drag a row
// by its handle, and Home, while it wobbles, drags a whole card.
//
// A finger rests for a moment before the row lifts, so a thumb scrolling past carries on
// scrolling (a mouse needs no hold); the row follows the finger, the page scrolls near the top
// and bottom, and it lands on the green line between two rows rather than on a row, so where it
// goes is never a guess about above or below. A drag let go of over nothing slides back and
// changes nothing. The arrow keys move a focused handle up and down for anybody not using a
// finger, so the list needs no arrow buttons of its own.
//
// The list is the ids in order, each row carrying data-drag-id; onPlace(id,before) saves it in
// front of the row before, or at the end for END.
const HOLD=220,SLOP=8;
export function useDragOrder(list,onPlace){
 const drag=useRef(null),[held,setHeld]=useState(null),[gap,setGap]=useState(null);
 const letGo=()=>{clearTimeout(drag.current?.timer);drag.current=null;setHeld(null);setGap(null);};
 // Once a row is lifted the page must not scroll under the finger; before that, a swipe scrolls.
 useEffect(()=>{const stop=e=>{if(drag.current?.lifted)e.preventDefault();};document.addEventListener('touchmove',stop,{passive:false});return()=>{document.removeEventListener('touchmove',stop);clearTimeout(drag.current?.timer);};},[]);
 const lift=d=>{d.lifted=true;setHeld(d.id);try{navigator.vibrate?.(12);}catch{}};
 // The line nearest the finger, among the rows of this list only.
 const gapAt=(y,row)=>{for(const r of row.parentElement.querySelectorAll(':scope>[data-drag-id]')){if(r===row)continue;const b=r.getBoundingClientRect();if(y<b.top+b.height/2)return r.dataset.dragId;}return END;};
 // The two lines either side of the row being carried would leave it where it is.
 const still=(d,g)=>g===d.id||g===(list[list.indexOf(d.id)+1]??END);
 // The pointer handlers, for a handle or for a whole card. A press on a button inside a card is
 // that button's, not the start of a drag.
 const handlers=id=>({
  onPointerDown:e=>{if(e.button>0||(e.target.closest('button')&&e.target.closest('button')!==e.currentTarget))return;e.currentTarget.setPointerCapture?.(e.pointerId);const d={id,x:e.clientX,y:e.clientY,scroll:window.scrollY,row:e.currentTarget.closest('[data-drag-id]'),gap:null,lifted:false};drag.current=d;if(e.pointerType==='mouse')lift(d);else d.timer=setTimeout(()=>{if(drag.current===d)lift(d);},HOLD);},
  onPointerMove:e=>{const d=drag.current;if(!d)return;
   if(!d.lifted){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>SLOP)letGo();return;}
   follow(d.row,0,e.clientY-d.y+window.scrollY-d.scroll);
   const g=gapAt(e.clientY,d.row);d.gap=still(d,g)?null:g;setGap(d.gap);
   if(e.clientY<100)window.scrollBy(0,-16);if(e.clientY>window.innerHeight-100)window.scrollBy(0,16);},
  onPointerUp:()=>{const d=drag.current;letGo();if(!d?.lifted)return;settle(d.row,d.gap===null);if(d.gap!==null)onPlace(d.id,d.gap);},
  onPointerCancel:()=>{const d=drag.current;letGo();if(d?.lifted)settle(d.row,true);}});
 const key=(e,id)=>{const by={ArrowUp:-1,ArrowDown:1}[e.key];if(!by)return;e.preventDefault();const before=stepBefore(list,id,by);if(before)onPlace(id,before);};
 const grip=(id,label)=><button type="button" className="rank-grip menu-grip" aria-label={`Drag ${label}, or use the up and down arrow keys`}
  {...handlers(id)} onKeyDown={e=>key(e,id)}><GripVertical size={18}/></button>;
 // The classes for a row: lifted while it is carried, and the green line above it (or, for the
 // last row, below it) where the carried row will land.
 const rowClass=id=>[held===id&&'held',gap===id&&'drop-before',gap===END&&id===list.at(-1)&&'drop-after'].filter(Boolean).join(' ');
 return {grip,handlers,key,rowClass,held};
}
