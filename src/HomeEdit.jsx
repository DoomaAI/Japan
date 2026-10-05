import React,{createContext,useContext,useEffect,useRef} from 'react';
import {Plus,Minus} from 'lucide-react';
import {useDragOrder} from './drag-order.jsx';
// Home arranged on Home itself, the way icons are on an iPhone's home screen: hold any card for a
// moment and every card wobbles. While they wobble a card is dragged by itself to the green line
// where it should go, the − in its corner takes it off Home, and a tap anywhere off the cards, or
// Escape, settles them.
// Customise still lists every widget, with an eye to bring back one taken off, and is one tap
// away from the bar along the top while Home wobbles.
//
// A hold that starts on a button, a link or a field is that control's, and a finger that moves
// is a scroll or a swipe, so neither sets Home wobbling. While it wobbles the cards show only
// their top, so a long Home is short enough to drag along, and nothing inside them takes a tap.
const HOLD=500,SLOP=10;
// Rows that wobble on their own (the buttons under a stop, the rings) keep their own hold.
const CONTROLS='button,a,input,select,textarea,label,summary,canvas,[role=button],[contenteditable],[data-link],[data-wobbling],audio,video';
export const HomeEditing=createContext(null);
export const useHomeEditing=()=>useContext(HomeEditing);
export function HomeStack({editing,setEditing,ids,place,remove,add,children}){
 const {handlers,rowClass}=useDragOrder(ids,place);
 const press=useRef(null),eat=useRef(false);
 const cancel=()=>{clearTimeout(press.current?.timer);press.current=null;};
 useEffect(()=>{
  if(!editing)return;
  const esc=e=>{if(e.key==='Escape')setEditing(false);};
  // Add stays a button of its own; anything else that is not a card is a tap outside.
  const away=e=>{if(!e.target.closest?.('.home-card,.home-edit-bar button'))setEditing(false);};
  document.addEventListener('keydown',esc);document.addEventListener('pointerdown',away);
  return ()=>{document.removeEventListener('keydown',esc);document.removeEventListener('pointerdown',away);};
 },[editing]);
 // Leaving Home settles it, so it never opens again already wobbling.
 useEffect(()=>()=>{cancel();setEditing(false);},[]);
 const hold={
  onPointerDown:e=>{
   if(editing||e.button>0||!e.target.closest('.home-card')||e.target.closest(CONTROLS))return;
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
  // The lift of the finger that set Home wobbling is not a tap on whatever it was resting on.
  onClickCapture:e=>{if(eat.current){eat.current=false;e.preventDefault();e.stopPropagation();}}
 };
 return <HomeEditing.Provider value={editing?{handlers,rowClass,remove}:null}>
  <div className={`home${editing?' arranging':''}`} data-home-wobbling={editing||undefined} {...hold}>
   {editing&&<div className="home-edit-bar" role="status">
    <span>Drag a card to move it. Tap <Minus size={12} strokeWidth={3} aria-label="minus"/> to take it off Home. Tap outside the cards to finish.</span>
    <button type="button" onClick={add}><Plus size={16}/> Add</button>
   </div>}
   {children}
  </div>
 </HomeEditing.Provider>;
}
// What a card on Home carries while Home wobbles: the drag, and the − in its corner.
export function homeCardEdit(edit,id,label){
 if(!edit)return {props:{},badge:null,className:''};
 const rows=edit.rowClass(id);
 return {
  props:{'data-drag-id':id,...edit.handlers(id)},
  className:` editing${rows?` ${rows}`:''}`,
  badge:<button type="button" className="home-card-remove" aria-label={`Take ${label} off Home`} onClick={()=>edit.remove(id)}><Minus size={14} strokeWidth={3}/></button>
 };
}
