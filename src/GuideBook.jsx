import React,{useEffect,useRef,useState} from 'react';
import {swipeDelta,leafProgress} from './swipe.js';
import {panLimit,spreadOf,stepPage,LAST_PAGE} from './guide-lens.js';
// The guide is a book, so a page turns like one: it lifts off its spine under the finger and
// swings over, showing the next page underneath as it goes. Let go early and it falls back; go
// far enough, or flick, and it finishes the turn by itself. The buttons and arrow keys turn it
// the same way, and nothing here decides the page — it only ever asks turn() once it has landed.
// Open as a spread, the right-hand page swings over the spine and lands on the left, its back
// being the left page of the next spread, exactly as a magazine's does.
export {LAST_PAGE};
const src=n=>`/api/guide?page=${n}`;
const TURN_MS=420;
const still=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,m)=>Math.min(m,Math.max(-m,v));
export const ZOOM=2.5;
const DOUBLE_TAP_MS=280;
export default function GuideBook({page,turn,flipRef,onMissing,onTap,zoomable,spread=false}){
 const box=useRef(null),touch=useRef(null),timer=useRef(null),flipNow=useRef(null),tapped=useRef(null);
 // dir 1 forward (the right edge lifts and swings left), -1 back (the left edge swings right).
 const [leaf,setLeaf]=useState(null);
 // Full screen, a landscape page on an upright phone is too small to read, so a double tap
 // zooms in where it lands and the finger then moves the page about rather than turning it.
 const [zoom,setZoom]=useState(null);
 const next=d=>stepPage(page,d,spread);
 const open=d=>next(d)!==null;
 const go=d=>{const to=next(d);if(to!==null)turn(to-page);};
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
 useEffect(()=>{clearTimeout(timer.current);setLeaf(null);setZoom(null);},[page,spread]);
 // The pages either side are fetched ahead, so the one underneath is there as the turn starts.
 useEffect(()=>{
  if(typeof Image==='undefined')return;
  const near=spread?[-1,1].map(d=>stepPage(page,d,true)).filter(Boolean).flatMap(n=>spreadOf(n)):[page-1,page+1];
  for(const n of near)if(n>=1&&n<=LAST_PAGE)new Image().src=src(n);
 },[page,spread]);
 const land=(dir,p,finish)=>{
  const ms=still()?0:Math.round(TURN_MS*Math.max(.35,finish?1-p:p));
  setLeaf({dir,p:finish?1:0,ms});
  clearTimeout(timer.current);
  timer.current=setTimeout(()=>{if(finish)go(dir);setLeaf(null);},ms);
 };
 const flip=dir=>{
  if(!open(dir)||leaf)return;
  setZoom(null);
  if(still())return go(dir);
  setLeaf({dir,p:0,ms:0});
  requestAnimationFrame(()=>requestAnimationFrame(()=>land(dir,0,true)));
 };
 const down=e=>{
  if(leaf?.ms||!e.isPrimary)return;
  // How far from the spine the page was picked up: the left edge of a single page, the middle
  // of a spread.
  const r=box.current?.getBoundingClientRect();
  const spine=r?(spread?r.left+r.width/2:r.left):0,width=r?(spread?r.width/2:r.width):0;
  touch.current={x:e.clientX,y:e.clientY,id:e.pointerId,axis:null,
   left:e.clientX-spine,right:spread?spine-e.clientX:(r?r.right-e.clientX:0),width,from:zoom&&!zoom.out?zoom:null};
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
 const angle=(leaf?.p||0)*180*(dir>0?-1:1);
 const lens=zoom&&{transform:`translate(${zoom.x}px,${zoom.y}px) scale(${zoom.s})`,transition:`transform ${still()?0:zoom.ms}ms ease-out`};
 const face=(n,cls)=>n?<img className={cls} src={src(n)} alt={`Japan travel guide page ${n}`} draggable={false} onError={onMissing}/>:null;
 const fade=ms=>({transition:`opacity ${ms}ms ease-out`});
 // What lies flat, and what is in the air. One page: the next page under the one turning.
 // A spread: this spread's untouched side, the next spread's far side, and between them the
 // leaf — this spread's near page on its front, the next spread's near page on its back.
 let flat,front,back=null;
 if(spread){
  const [l,r]=spreadOf(page),to=leaf&&open(dir)?spreadOf(next(dir)):null;
  flat=<>
   <div className="guide-half">{face(dir<0&&to?to[0]:l)}</div>
   <div className="guide-half">{face(dir>0&&to?to[1]:r)}</div>
  </>;
  front=dir>0?r:l;back=to?(dir>0?to[0]:to[1]):null;
 }else{
  flat=face(leaf&&open(dir)?next(dir):page,'guide-image');
  front=page;
 }
 return <div className={`guide-book${spread?' spread':''}${leaf?' turning':''}${zoom&&!zoom.out?' zoomed':''}`} ref={box} style={lens||undefined}
  onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
  {flat}
  {leaf&&front&&<>
   <i className={`guide-shadow ${dir>0?'forward':'back'}`} style={{opacity:(1-leaf.p)*.5,...fade(leaf.ms)}}/>
   <div className={`guide-leaf ${dir>0?'forward':'back'}`}
    style={{transform:`rotateY(${angle}deg)`,transition:`transform ${leaf.ms}ms ease-out`}}>
    <img src={src(front)} alt="" draggable={false}/>
    <i className="guide-curl" style={{opacity:Math.min(1,leaf.p*2.2),...fade(leaf.ms)}}/>
    <b className="guide-back" aria-hidden="true">{back&&<img src={src(back)} alt="" draggable={false}/>}</b>
   </div>
  </>}
 </div>;
}
