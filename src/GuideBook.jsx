import React,{useEffect,useRef,useState} from 'react';
import {swipeDelta,leafProgress} from './swipe.js';
import {panLimit} from './guide-lens.js';
// The guide is a book, so a page turns like one: it lifts off its spine under the finger and
// swings over, showing the next page underneath as it goes. Let go early and it falls back; go
// far enough, or flick, and it finishes the turn by itself. The buttons and arrow keys turn it
// the same way, and nothing here decides the page — it only ever asks turn() once it has landed.
export const LAST_PAGE=72;
const src=n=>`/api/guide?page=${n}`;
const TURN_MS=420;
const still=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,m)=>Math.min(m,Math.max(-m,v));
export const ZOOM=2.5;
const DOUBLE_TAP_MS=280;
export default function GuideBook({page,turn,flipRef,onMissing,onTap,zoomable}){
 const box=useRef(null),touch=useRef(null),timer=useRef(null),flipNow=useRef(null),tapped=useRef(null);
 // dir 1 forward (the right edge lifts and swings left), -1 back (the left edge swings right).
 const [leaf,setLeaf]=useState(null);
 // Full screen, a landscape page on an upright phone is too small to read, so a double tap
 // zooms in where it lands and the finger then moves the page about rather than turning it.
 const [zoom,setZoom]=useState(null);
 const open=d=>page+d>=1&&page+d<=LAST_PAGE;
 useEffect(()=>()=>{clearTimeout(timer.current);clearTimeout(tapped.current?.timer);},[]);
 // Two books can be open at once — the page and the full-screen reader over it — so the one
 // that answers the buttons is whichever took the handle last, and it only lets go of its own.
 flipNow.current=d=>flip(d);
 useEffect(()=>{
  if(!flipRef)return;
  const mine=d=>flipNow.current(d);
  flipRef.current=mine;
  return()=>{if(flipRef.current===mine)flipRef.current=null;};
 },[flipRef]);
 // A page chosen from the list or a day lands flat and unzoomed, whatever was half turned.
 useEffect(()=>{clearTimeout(timer.current);setLeaf(null);setZoom(null);},[page]);
 // The pages either side are fetched ahead, so the one underneath is there as the turn starts.
 useEffect(()=>{
  if(typeof Image==='undefined')return;
  for(const n of [page-1,page+1])if(n>=1&&n<=LAST_PAGE)new Image().src=src(n);
 },[page]);
 const land=(dir,p,finish)=>{
  const ms=still()?0:Math.round(TURN_MS*Math.max(.35,finish?1-p:p));
  setLeaf({dir,p:finish?1:0,ms});
  clearTimeout(timer.current);
  timer.current=setTimeout(()=>{if(finish)turn(dir);setLeaf(null);},ms);
 };
 const flip=dir=>{
  if(!open(dir)||leaf)return;
  setZoom(null);
  if(still())return turn(dir);
  setLeaf({dir,p:0,ms:0});
  requestAnimationFrame(()=>requestAnimationFrame(()=>land(dir,0,true)));
 };
 const down=e=>{
  if(leaf?.ms||!e.isPrimary)return;
  const r=box.current?.getBoundingClientRect();
  touch.current={x:e.clientX,y:e.clientY,id:e.pointerId,axis:null,
   left:r?e.clientX-r.left:0,right:r?r.right-e.clientX:0,width:r?.width||0,from:zoom&&!zoom.out?zoom:null};
 };
 const zoomAt=e=>{
  if(zoom){
   if(still())return setZoom(null);
   setZoom({...zoom,x:0,y:0,s:1,ms:200,out:true});
   clearTimeout(timer.current);timer.current=setTimeout(()=>setZoom(null),220);
   return;
  }
  const el=box.current,r=el?.getBoundingClientRect();if(!r)return;
  // The point tapped stays where it was tapped: it sits d from the middle, lands at d·s once
  // scaled, so the page moves back by d·(s−1).
  const m=panLimit(ZOOM,el.offsetWidth,el.offsetHeight);
  const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  setZoom({s:ZOOM,x:clamp(-dx*(ZOOM-1),m.x),y:clamp(-dy*(ZOOM-1),m.y),ms:200});
 };
 const tap=e=>{
  if(!zoomable)return onTap?.(e);
  const last=tapped.current,now=Date.now();
  if(last&&now-last.at<DOUBLE_TAP_MS&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<40){
   clearTimeout(last.timer);tapped.current=null;return zoomAt(e);
  }
  const {clientX,clientY}=e;
  tapped.current={at:now,x:clientX,y:clientY,timer:setTimeout(()=>{tapped.current=null;onTap?.({clientX,clientY});},DOUBLE_TAP_MS)};
 };
 const move=e=>{
  const t=touch.current;if(!t||e.pointerId!==t.id)return;
  const dx=e.clientX-t.x,dy=e.clientY-t.y;
  // Up and down is the page scrolling, and the browser takes it; only sideways is a turn.
  if(!t.axis){
   if(Math.hypot(dx,dy)<8)return;
   t.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
   if(t.axis==='x'||t.from)e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  if(t.from){
   const el=box.current,m=panLimit(t.from.s,el?.offsetWidth||0,el?.offsetHeight||0);
   setZoom({...t.from,x:clamp(t.from.x+dx,m.x),y:clamp(t.from.y+dy,m.y),ms:0});
   return;
  }
  if(t.axis!=='x')return;
  const dir=dx<0?1:-1;
  setLeaf({dir,p:leafProgress(dx,dir>0?t.left:t.right,t.width,dir,open(dir)),ms:0});
 };
 const up=e=>{
  const t=touch.current;touch.current=null;
  if(t&&!t.axis)return tap(e);
  if(!t||t.from||t.axis!=='x'||!leaf)return;
  const flicked=swipeDelta(t,{x:e.clientX,y:e.clientY})===leaf.dir;
  land(leaf.dir,leaf.p,open(leaf.dir)&&(flicked||leaf.p>.4));
 };
 const cancel=()=>{touch.current=null;if(leaf&&!leaf.ms)land(leaf.dir,leaf.p,false);};
 const dir=leaf?.dir||1;
 const under=leaf&&open(dir)?page+dir:page;
 const angle=(leaf?.p||0)*180*(dir>0?-1:1);
 const lens=zoom&&{transform:`translate(${zoom.x}px,${zoom.y}px) scale(${zoom.s})`,transition:`transform ${still()?0:zoom.ms}ms ease-out`};
 return <div className={`guide-book${leaf?' turning':''}${zoom&&!zoom.out?' zoomed':''}`} ref={box} style={lens||undefined}
  onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
  <img className="guide-image" src={src(under)} alt={`Japan travel guide page ${under}`} draggable={false}
   onError={onMissing}/>
  {leaf&&<>
   <i className={`guide-shadow ${dir>0?'forward':'back'}`} style={{opacity:(1-leaf.p)*.5,transition:`opacity ${leaf.ms}ms ease-out`}}/>
   <div className={`guide-leaf ${dir>0?'forward':'back'}`}
    style={{transform:`rotateY(${angle}deg)`,transition:`transform ${leaf.ms}ms ease-out`}}>
    <img src={src(page)} alt="" draggable={false}/>
    <i className="guide-curl" style={{opacity:Math.min(1,leaf.p*2.2),transition:`opacity ${leaf.ms}ms ease-out`}}/>
    <b className="guide-back" aria-hidden="true"/>
   </div>
  </>}
 </div>;
}
