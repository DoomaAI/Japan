import React,{useState,useRef,useEffect,useMemo} from 'react';
import {ArrowLeft,ArrowRight,Check,RotateCcw,Trophy,Hand} from 'lucide-react';
import {ORIGAMI,modelById,stepFrames,origamiGame,foldSpec,creaseInBox,clipToSide,reflect,boundsOf} from './origami-data.js';
import {swipeDelta,isControl,typesText,stepIndex} from './swipe.js';
import {scoresFor,bestScore} from './trip-features.js';
// One diagram. The paper is drawn layer by layer, oldest underneath, with the crease you are
// about to make dashed across it and an arrow showing which way the flap goes.
function Diagram({step,size=260}){
 const layers=step.layers||[];
 const spec=foldSpec(step.fold),crease=spec?.crease;
 // The picture is framed on the paper as it is now, not on the sheet it started as. Folding
 // makes the paper smaller every time, and by the eighth fold a fixed frame is showing a
 // postage stamp in the middle of an empty card.
 const paper=boundsOf(layers);
 const pad=Math.max(6,Math.max(paper?paper.maxX-paper.minX:0,paper?paper.maxY-paper.minY:0)*0.12);
 const view=paper?{
  x:paper.minX-pad,y:paper.minY-pad,
  size:Math.max(paper.maxX-paper.minX,paper.maxY-paper.minY)+pad*2
 }:{x:0,y:0,size:100};
 // Squared off, so nothing is stretched and a fold that looks like 45 degrees is 45 degrees.
 const box={minX:view.x,maxX:view.x+view.size,minY:view.y,maxY:view.y+view.size};
 const drawn=creaseInBox(crease,box);
 const ink=view.size/100;
 // The arrow runs from the middle of the bit that moves to where that bit ends up, which is
 // the one thing a fold line on its own never tells you.
 const arrow=useMemo(()=>{
  if(!crease||!step.after?.length)return null;
  const [a,b]=crease;
  const mid=([x1,y1],[x2,y2])=>[(x1+x2)/2,(y1+y2)/2];
  const centre=points=>points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);
  // The bit that moves is the part of the paper on that side of the crease, cut along it —
  // not the corners that happen to be over there. A corner fold has exactly one vertex on the
  // moving side, which is why looking at vertices drew no arrow on half the steps.
  const moving=layers.map(l=>clipToSide(l,a,b,spec.move)).filter(l=>l.length>2)
   .sort((x,y)=>y.length-x.length)[0];
  if(!moving)return null;
  const from=centre(moving),to=centre(moving.map(p=>reflect(p,a,b)));
  if(Math.hypot(to[0]-from[0],to[1]-from[1])<view.size*0.05)return null;
  return {from,to,over:mid(from,to)};
 },[step.index,view.size]);
 return <svg className="fold-diagram" viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`}
  width={size} height={size} role="img" aria-label={step.say}>
  <defs><marker id="foldhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
   <path d="M0,0 L10,5 L0,10 z" fill="#16383b"/></marker></defs>
  {layers.map((layer,i)=>
   <polygon key={i} points={layer.map(p=>p.join(',')).join(' ')}
    fill={i?'#ffffff':'#f0e6d2'} stroke="#8aa3a0" strokeWidth={0.8*ink} strokeLinejoin="round"/>)}
  {drawn&&<line x1={drawn[0][0]} y1={drawn[0][1]} x2={drawn[1][0]} y2={drawn[1][1]}
   stroke="#c2523c" strokeWidth={1.1*ink} strokeDasharray={`${4*ink} ${3*ink}`}/>}
  {arrow&&<path d={`M${arrow.from[0]},${arrow.from[1]} Q${arrow.over[0]+(arrow.to[1]-arrow.from[1])*0.32},${arrow.over[1]-(arrow.to[0]-arrow.from[0])*0.32} ${arrow.to[0]},${arrow.to[1]}`}
   fill="none" stroke="#16383b" strokeWidth={1.4*ink} markerEnd="url(#foldhead)"/>}
  {step.turn&&<text x={view.x+view.size/2} y={view.y+view.size*0.54} textAnchor="middle" fontSize={16*ink}>↻</text>}
 </svg>;
}
// The finished thing first, then one fold at a time, swiped. A five-year-old following a
// diagram needs one picture and one sentence on screen, not eight of each.
export default function Origami({state,user,mutate,busy}){
 const [id,setId]=useState('');
 const [at,setAt]=useState(0);
 const touch=useRef(null);
 const model=modelById(id);
 const steps=useMemo(()=>model?stepFrames(model):[],[id]);
 const step=steps[Math.min(at,Math.max(0,steps.length-1))];
 const move=delta=>setAt(i=>stepIndex(Math.min(i,steps.length-1),delta,steps.length));
 useEffect(()=>{setAt(0);},[id]);
 useEffect(()=>{
  if(!model)return;
  const onKey=e=>{
   if(typesText(e.target))return;
   if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1);
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[id,steps.length]);
 if(!model)return <>
  <p>Pick one and it shows you the finished thing, then one fold at a time. Swipe the picture to go on. All you need is a square of paper.</p>
  <div className="origami-picker">{ORIGAMI.map(m=>{
   const made=scoresFor(state,origamiGame(m.id));
   return <button key={m.id} className="origami-card" onClick={()=>setId(m.id)}>
    <span className="origami-icon" aria-hidden="true">{m.icon}</span>
    <strong>{m.name}</strong>
    <small lang="ja">{m.ja} · {m.romaji}</small>
    <small>{m.level} · about {m.minutes} minutes</small>
    {!!Object.keys(made).length&&<small className="origami-made"><Check size={13}/> Made by {Object.keys(made).join(', ')}</small>}
   </button>;})}</div>
  <p><small>No scissors and no glue. Any square will do — a serviette works, and a sheet of newspaper makes a helmet that fits a boy. The hat wants a rectangle.</small></p>
 </>;
 const done=!!step?.done;
 return <>
  <div className="row wrap origami-head">
   <button type="button" onClick={()=>setId('')}><ArrowLeft size={15}/> All of them</button>
   <strong>{model.icon} {model.name}</strong><small lang="ja">{model.ja}</small>
  </div>
  {at===0&&<p>{model.about}</p>}
  <section className="origami-steps"
   onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
   onTouchEnd={e=>{
    const start=touch.current;touch.current=null;
    if(!start||isControl(e.target?.tagName))return;
    const delta=swipeDelta(start,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});
    if(delta)move(delta);
   }}>
   <p className="eyebrow">{done?'FINISHED':`FOLD ${step.index+1} OF ${steps.length-1}`}</p>
   <Diagram step={step}/>
   <p className="origami-say">{step.say}</p>
  </section>
  <div className="swipe-controls">
   <button type="button" disabled={at<=0} onClick={()=>move(-1)}><ArrowLeft size={16}/> Back</button>
   <span><Hand size={13}/> Swipe the picture</span>
   <button type="button" disabled={at>=steps.length-1} onClick={()=>move(1)}>Next <ArrowRight size={16}/></button>
  </div>
  {done&&<div className="row wrap">
   <button type="button" className="primary" disabled={busy||bestScore(state,user.name,origamiGame(model.id))>0}
    onClick={()=>mutate({type:'gameScore',person:user.name,game:origamiGame(model.id),score:1})}>
    {bestScore(state,user.name,origamiGame(model.id))>0?<><Check size={16}/> You have made this</>:'I made it!'}</button>
   <button type="button" onClick={()=>setAt(0)}><RotateCcw size={16}/> From the start</button>
  </div>}
  {done&&!!Object.keys(scoresFor(state,origamiGame(model.id))).length&&
   <p className="game-status"><Trophy size={15}/> Made by {Object.keys(scoresFor(state,origamiGame(model.id))).join(' · ')}</p>}
 </>;
}
