import React,{useEffect,useRef,useState} from 'react';
import {ArrowUpDown} from 'lucide-react';
import {useDragOrder} from './drag-order.jsx';
import {placeBefore} from './drag-list.js';
import {mergeVisible} from './wobble.js';
// Any list of our own put in order the way Home's cards are: hold a row for a moment and the
// list wobbles; while it wobbles a row is dragged by itself to the green line where it should go,
// and a tap anywhere off the list, or Escape, settles it. Reorder beside the filters does the same
// for anybody who does not find the hold, and the arrow keys move a focused row up and down.
//
// A filtered list is still put in order: the rows on show swap places among themselves and the
// rows filtered out stay where they were (mergeVisible), so nothing hidden is shuffled unseen.
//
// The caller spreads listProps onto the element whose direct children are the rows and row(id)
// onto each row. A list split into groups (the to-do list by day) shares one editing state, so
// holding a row in any group sets every group going; each group is ordered only within itself.
const HOLD=500,SLOP=10;
const CONTROLS='button,a,input,select,textarea,label,summary,[role=button],[contenteditable],[data-link],audio,video';
// off leaves the list as it is, for a list being shown in some other order (by price, by date)
// that a drag would only fight.
export function useListWobble({ids,full=ids,save,editing:shared,setEditing:setShared,off=false}){
 const [own,setOwn]=useState(false);
 const editing=shared??own,setEditing=setShared||setOwn;
 const place=(id,before)=>{const next=placeBefore(ids,id,before);if(next.join()!==ids.join())save(mergeVisible(full,next).filter(id=>!String(id).startsWith('pending-')));};
 const {handlers,rowClass,key}=useDragOrder(ids,place);
 const press=useRef(null),eat=useRef(false);
 const cancel=()=>{clearTimeout(press.current?.timer);press.current=null;};
 useEffect(()=>{
  if(!editing)return;
  const esc=e=>{if(e.key==='Escape')setEditing(false);};
  const away=e=>{if(!e.target.closest?.('[data-list-wobbling],[data-wobble-tool]'))setEditing(false);};
  document.addEventListener('keydown',esc);document.addEventListener('pointerdown',away);
  return ()=>{document.removeEventListener('keydown',esc);document.removeEventListener('pointerdown',away);};
 },[editing]);
 useEffect(()=>()=>cancel(),[]);
 const listProps={
  'data-list-wobbling':editing||undefined,
  onPointerDown:e=>{
   if(off||editing||e.button>0||ids.length<2)return;
   const row=e.target.closest?.('[data-drag-id]');
   // A row whose name is its fold button marks it data-wobble-hold, so a hold on the name still counts.
   const control=e.target.closest(CONTROLS);
   if(!row||!e.currentTarget.contains(row)||(control&&!control.matches('[data-wobble-hold]')))return;
   eat.current=false;cancel();
   press.current={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{
    press.current=null;eat.current=true;
    try{window.getSelection?.()?.removeAllRanges();navigator.vibrate?.(12);}catch{}
    setEditing(true);
   },HOLD)};
  },
  onPointerMove:e=>{const p=press.current;if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>SLOP)cancel();},
  onPointerUp:cancel,onPointerCancel:cancel,
  onContextMenu:e=>{if(editing||eat.current)e.preventDefault();},
  // While the list wobbles nothing in a row takes a tap, and the lift of the finger that set it
  // wobbling is not a tap on whatever it was resting on.
  onClickCapture:e=>{
   if(e.target.closest?.('[data-wobble-tool]'))return;
   if(eat.current||(editing&&e.target.closest?.('[data-drag-id]'))){eat.current=false;e.preventDefault();e.stopPropagation();}
  }
 };
 const row=id=>editing&&!off?{'data-drag-id':id,tabIndex:0,'aria-roledescription':'movable row',className:rowClass(id),onKeyDown:e=>key(e,id),...handlers(id)}:{'data-drag-id':id,className:''};
 const toggle=ids.length>1&&!off?<button type="button" data-wobble-tool className={`list-reorder${editing?' on':''}`} aria-pressed={editing} onClick={()=>setEditing(!editing)}><ArrowUpDown size={15}/>{editing?'Done':'Reorder'}</button>:null;
 const bar=editing&&!off?<div className="wobble-done" role="status"><small>Drag a row to the line where it should go. Tap outside the list to finish.</small></div>:null;
 return {editing,setEditing,listProps,row,toggle,bar};
}
export {inOrder,listOrder} from './drag-list.js';
