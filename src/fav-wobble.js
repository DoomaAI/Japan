import {useEffect,useRef,useState} from 'react';
import {dropFavourite} from './nav-data.js';
const HOLD=450,LIFT=160,SLOP=10,NEAR=28,EDGE=70,NAV=120;
const still=e=>{if(e.cancelable)e.preventDefault();};
// Favourites on More, edited the way an iPhone's home screen is: hold any card until the page
// wobbles, then drag. A favourite dragged along the row takes the place of the one it is held
// over; a card dragged up out of a section joins the row where it is let go; a favourite
// dragged out of the row and let go anywhere else leaves it. The sections themselves never
// change — a favourite is a second way in, not a move — so a card taken up into the row is
// still in its section afterwards, the way an app stays in the App Library.
//
// wobble.js does the same for a single row that scrolls sideways. This page scrolls down, and a
// card has to travel between two different grids, so rather than sliding the card itself a copy
// of it (the ghost) follows the finger, the card it came from is dimmed where it was, and the
// row opens a gap for it wherever it would land. The page scrolls on its own when the ghost is
// held near the top or bottom, so the row can be reached from a section far below it.
//
// Once the page wobbles a short hold picks a card up, so a quick swipe still scrolls the page;
// a mouse picks one up at once. A tap on a card does nothing while it wobbles. Done, Escape or a
// tap on nothing in particular settles it. The arrow keys move a focused favourite along the
// row, and Delete takes it out, for anybody not using a finger.
export function useFavWobble({favs,onChange}){
 const [editing,setEditing]=useState(false),[live,setLive]=useState(null),[ghost,setGhost]=useState(null);
 const page=useRef(null),row=useRef(null),press=useRef(null),drag=useRef(null),eat=useRef(false),touched=useRef(null);
 const order=live||favs;
 const stop=()=>{
  clearTimeout(press.current?.timer);press.current=null;
  const d=drag.current;if(d){cancelAnimationFrame(d.frame);d.touch?.removeEventListener('touchmove',still);}
  drag.current=null;setGhost(null);setLive(null);
  return d;
 };
 const finish=()=>{stop();setEditing(false);};
 useEffect(()=>{
  if(!editing)return;
  const esc=e=>{if(e.key==='Escape')finish();};
  document.addEventListener('keydown',esc);
  return ()=>document.removeEventListener('keydown',esc);
 },[editing]);
 // A held card must not also scroll the page under it. Pointer events alone cannot say so
 // once the page is allowed to scroll, so the touch that carries the card is held still — on
 // the very element the finger first landed on. A touch keeps going to that element even after
 // it has left the page (a favourite dragged out of the row is no longer drawn there), and from
 // a detached element it never reaches the document, so a listener there would miss it, the
 // page would scroll, and the drag would be cancelled halfway.
 useEffect(()=>{
  const land=e=>{touched.current=e.target;};
  document.addEventListener('touchstart',land,{passive:true,capture:true});
  return ()=>{document.removeEventListener('touchstart',land,{capture:true});stop();};
 },[]);
 const inside=(r,x,y,m=0)=>x>=r.left-m&&x<=r.right+m&&y>=r.top-m&&y<=r.bottom+m;
 // Where the card would land if it were let go now, worked out afresh from what is on the
 // screen: the row moves as it opens gaps and as the page scrolls.
 const hit=()=>{
  const d=drag.current,box=row.current;if(!d)return;
  const over=!!box&&inside(box.getBoundingClientRect(),d.x,d.y,NEAR);
  let next;
  if(!over)next=d.fromFav?dropFavourite(d.base,d.id,null):d.base;
  else{
   const onto=[...box.querySelectorAll('[data-link]')].find(s=>s.dataset.link!==d.id&&inside(s.getBoundingClientRect(),d.x,d.y));
   next=onto?dropFavourite(d.list,d.id,onto.dataset.link):d.list.includes(d.id)?d.list:dropFavourite(d.list,d.id,undefined);
  }
  const full=over&&!next.includes(d.id);
  setGhost({id:d.id,x:d.x,y:d.y,leaving:d.fromFav&&!over,full});
  if(next.join()!==d.list.join()){d.list=next;setLive(next);}
 };
 const edge=()=>{
  const d=drag.current;if(!d)return;
  // Only once the card has been carried somewhere: one picked up near the bottom of the screen
  // would otherwise set the page scrolling before it had moved at all.
  if(!d.moved&&Math.hypot(d.x-d.startX,d.y-d.startY)>SLOP*3)d.moved=true;
  const by=!d.moved?0:d.y<EDGE?-8:d.y>window.innerHeight-NAV?8:0;
  if(by){const was=window.scrollY;window.scrollBy(0,by);if(window.scrollY!==was)hit();}
  d.frame=requestAnimationFrame(edge);
 };
 const lift=(el,x,y,pointer)=>{
  try{page.current?.setPointerCapture(pointer);}catch{}
  const touch=el.contains(touched.current)?touched.current:null;
  touch?.addEventListener('touchmove',still,{passive:false});
  drag.current={id:el.dataset.link,fromFav:!!el.dataset.fav,x,y,startX:x,startY:y,base:favs,list:favs,touch};
  drag.current.frame=requestAnimationFrame(edge);
  setLive(favs);hit();
 };
 const itemOf=e=>{
  if(e.target.closest?.('.more-badge'))return null;
  const el=e.target.closest?.('[data-link]');return el&&page.current?.contains(el)?el:null;
 };
 function down(e){
  if(e.button>0)return;
  const el=itemOf(e);
  if(!el){
   // A tap on the page between the cards, as on a home screen, is the way out.
   if(editing&&!e.target.closest?.('button,a,input,[data-link]'))finish();
   return;
  }
  eat.current=false;clearTimeout(press.current?.timer);
  const {clientX:x,clientY:y,pointerId}=e,was=editing;
  press.current={x,y,timer:setTimeout(()=>{
   press.current=null;
   if(!was){eat.current=true;setEditing(true);try{navigator.vibrate?.(12);}catch{}}
   lift(el,x,y,pointerId);
  },was?(e.pointerType==='mouse'?0:LIFT):HOLD)};
 }
 function move(e){
  const p=press.current;
  if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>SLOP){clearTimeout(p.timer);press.current=null;}
  const d=drag.current;if(!d)return;
  e.preventDefault();d.x=e.clientX;d.y=e.clientY;hit();
 }
 function up(){
  const d=stop();
  if(d&&d.list.join()!==d.base.join())onChange(d.list);
 }
 function key(e,id){
  if(!editing||!favs.includes(id))return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();onChange(dropFavourite(favs,id,null));return;}
  const by={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[e.key],next=by&&favs[favs.indexOf(id)+by];
  if(!by)return;
  e.preventDefault();
  if(next)onChange(dropFavourite(favs,id,next));
 }
 return {editing,start:()=>setEditing(true),finish,order,ghost,row,
  pageProps:{ref:page,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:()=>{stop();},
   onContextMenu:e=>{if(itemOf(e))e.preventDefault();},
   // While the page wobbles a tap on a card does not open it, and neither does the tap that
   // ends the long press. The badges on the cards are buttons of their own and still work.
   onClickCapture:e=>{if(editing||eat.current){if(itemOf(e)){e.preventDefault();e.stopPropagation();}eat.current=false;}}},
  item:(id,inFav)=>({'data-link':id,'data-fav':inFav||undefined,onKeyDown:e=>key(e,id)})};
}
