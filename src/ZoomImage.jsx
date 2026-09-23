import React,{useEffect,useRef,useState} from 'react';
import {REST,clampView,pinchView,tapView,zoomAbout} from './zoom.js';
// A photo that can be looked at closely: pinch to zoom, drag to look around once zoomed in, and
// double-tap to jump in on a spot or back out. The page itself never zooms — the frame takes
// every touch — so the header and the close button stay where they are while the picture moves.
// onZoom hears whether the picture is zoomed in, so a viewer that swipes between photos can hold
// the swipe back while a finger is really dragging around inside this one.
export default function ZoomImage({src,alt,onZoom}){
 const frame=useRef(null),[view,setView]=useState(REST),[moving,setMoving]=useState(false);
 const live=useRef(REST),points=useRef(new Map()),gesture=useRef(null),lastTap=useRef(null);
 const size=()=>{const r=frame.current.getBoundingClientRect();return {r,w:r.width,h:r.height};};
 const apply=next=>{live.current=next;setView(next);};
 useEffect(()=>{onZoom?.(view.s>1);},[view.s>1]);
 useEffect(()=>()=>onZoom?.(false),[]);
 // A trackpad pinch arrives as a wheel with ctrlKey, and a mouse wheel zooms too. Neither can be
 // held back from scrolling the page through React's passive wheel handler, hence the listener.
 useEffect(()=>{
  const el=frame.current;
  const onWheel=e=>{
   e.preventDefault();const {r,w,h}=size(),v=live.current;
   apply(zoomAbout(v,v.s*Math.exp(-e.deltaY*(e.ctrlKey?.01:.002)),e.clientX-r.left,e.clientY-r.top,w,h));
  };
  // Turning the phone reshapes the frame, and a zoom measured against the old shape would no
  // longer line up with its edges, so the picture settles back to fitting the screen. Only the
  // width counts: Safari's toolbar sliding in and out resizes the window too, and that alone
  // should not throw away a zoom.
  let wide=el.clientWidth;
  const onResize=()=>{if(el.clientWidth!==wide){wide=el.clientWidth;apply(REST);}};
  el.addEventListener('wheel',onWheel,{passive:false});window.addEventListener('resize',onResize);
  return()=>{el.removeEventListener('wheel',onWheel);window.removeEventListener('resize',onResize);};
 },[]);
 const spread=()=>{
  const {r}=size(),[a,b]=[...points.current.values()];
  return {mx:(a.x+b.x)/2-r.left,my:(a.y+b.y)/2-r.top,d:Math.hypot(a.x-b.x,a.y-b.y)||1};
 };
 // Each gesture starts from a snapshot of the view, so it is measured against where the fingers
 // first landed. A finger joining or leaving starts a fresh one from wherever the picture is now.
 const begin=()=>{
  const n=points.current.size,[p]=points.current.values();
  gesture.current=n>=2?{kind:'pinch',start:live.current,from:spread()}:n===1?{kind:'pan',start:live.current,x:p.x,y:p.y,moved:false}:null;
 };
 const down=e=>{
  try{frame.current.setPointerCapture(e.pointerId);}catch{}
  points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});setMoving(true);begin();
  if(points.current.size>1)lastTap.current=null;
 };
 const move=e=>{
  if(!points.current.has(e.pointerId))return;
  points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const g=gesture.current,{w,h}=size();if(!g)return;
  if(g.kind==='pinch'){apply(pinchView(g.start,g.from,spread(),w,h));return;}
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(Math.hypot(dx,dy)>8)g.moved=true;
  if(g.start.s>1)apply(clampView({s:g.start.s,x:g.start.x+dx,y:g.start.y+dy},w,h));
 };
 const up=e=>{
  if(!points.current.has(e.pointerId))return;
  const g=gesture.current;points.current.delete(e.pointerId);
  if(g?.kind==='pan'&&!g.moved&&!points.current.size){
   const now=Date.now(),t=lastTap.current;
   if(t&&now-t.at<300&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<30){const {r,w,h}=size();lastTap.current=null;setMoving(false);apply(tapView(live.current,e.clientX-r.left,e.clientY-r.top,w,h));gesture.current=null;return;}
   lastTap.current={at:now,x:e.clientX,y:e.clientY};
  }else if(g?.kind==='pinch')lastTap.current=null;
  begin();if(!points.current.size)setMoving(false);
 };
 return <div className="zoom-frame" ref={frame} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
  <img src={src} alt={alt} draggable={false} style={{transform:`translate(${view.x}px,${view.y}px) scale(${view.s})`,transition:moving?'none':'transform .2s ease-out'}}/>
 </div>;
}
