import React,{useRef,useState} from 'react';
import {X,Heart,RotateCcw,Check} from 'lucide-react';
import {flingDirection,cardTilt,stampStrength,typesText} from './swipe.js';
// Suggestions one at a time, as a pile of cards: swipe right to keep one, left to pass on it.
// The buttons underneath and the arrow keys do exactly what the swipes do, so nobody has to
// drag to use it. A pass is only put aside on this phone — it can be undone, and the passed
// ones can be gone through again at the end; nothing is thrown away.
const LEAVE_MS=220;
const PRESSABLE='button,a,input,select,textarea,summary,label,audio';
const reduced=()=>typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export function SuggestDeck({items,keyOf,render,kept=[],onKeep,keepLabel='Keep',keepStamp=keepLabel,passLabel='Pass',keptWord='kept',busy,onClear}){
 const [passed,setPassed]=useState([]);
 const [drag,setDrag]=useState(null),[leaving,setLeaving]=useState(null);
 const hold=useRef(null),card=useRef(null);
 const left=items.filter(item=>!kept.includes(keyOf(item))&&!passed.includes(keyOf(item)));
 const top=left[0],under=left[1];
 const place=items.length-left.length+1;
 async function decide(dir){
  if(!top||leaving||busy)return;
  const key=keyOf(top);
  setLeaving({key,dir});setDrag(null);
  await new Promise(done=>setTimeout(done,reduced()?0:LEAVE_MS));
  // A keep that did not save comes back to the middle rather than vanishing.
  if(dir<0)setPassed(p=>[...p,key]);
  else await onKeep(top);
  setLeaving(null);
 }
 function down(e){
  if(e.button>0||leaving||e.target.closest?.(PRESSABLE))return;
  hold.current={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastT:e.timeStamp,vx:0};
  e.currentTarget.setPointerCapture?.(e.pointerId);
 }
 function move(e){
  const h=hold.current;if(!h||h.id!==e.pointerId)return;
  const dt=e.timeStamp-h.lastT;
  if(dt>0){h.vx=(e.clientX-h.lastX)/dt;h.lastX=e.clientX;h.lastT=e.timeStamp;}
  setDrag({dx:e.clientX-h.x,dy:e.clientY-h.y});
 }
 function up(e){
  const h=hold.current;if(!h||h.id!==e.pointerId)return;
  hold.current=null;
  const dx=e.clientX-h.x,dy=e.clientY-h.y;
  const dir=flingDirection(dx,dy,card.current?.offsetWidth,h.vx);
  if(dir)decide(dir);else setDrag(null);
 }
 function cancel(){hold.current=null;setDrag(null);}
 function onKey(e){
  if(typesText(e.target))return;
  if(e.key==='ArrowRight'){e.preventDefault();decide(1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();decide(-1);}
 }
 const width=card.current?.offsetWidth||320;
 const dx=drag?.dx||0,dy=drag?.dy||0;
 const going=leaving&&top&&leaving.key===keyOf(top)?leaving.dir:0;
 const style=going?{transform:`translate(${going*130}%,${dy*.2}px) rotate(${going*18}deg)`,opacity:0}
  :drag?{transform:`translate(${dx}px,${dy*.2}px) rotate(${cardTilt(dx,width)}deg)`,transition:'none'}:undefined;
 const sure=going?1:stampStrength(dx,width);
 const leaning=going||Math.sign(dx);
 const keptHere=items.filter(item=>kept.includes(keyOf(item)));
 if(!top)return <div className="deck deck-done">
  <p><Check size={17}/><strong>That is all of them.</strong> {keptHere.length} {keptWord}, {passed.length} passed.</p>
  {!!keptHere.length&&<ul className="deck-kept">{keptHere.map(item=><li key={keyOf(item)}><Heart size={13}/>{item.draft?.title||keyOf(item)}</li>)}</ul>}
  <div className="row wrap">
   {!!passed.length&&<button onClick={()=>setPassed([])}><RotateCcw size={16}/>Go through the {passed.length} passed again</button>}
   {onClear&&<button onClick={onClear}><X size={16}/>Clear these</button>}
  </div>
 </div>;
 return <div className="deck" tabIndex={0} onKeyDown={onKey} aria-roledescription="card deck" aria-label={`Suggestion ${place} of ${items.length}. Right arrow: ${keepLabel}. Left arrow: ${passLabel}.`}>
  <p className="deck-count"><span>{place} of {items.length}</span><small>Swipe right: {keepLabel}. Left: {passLabel}.</small></p>
  <div className="deck-stack">
   {under&&<div className="deck-card under" aria-hidden="true">{render(under)}</div>}
   <div ref={card} key={keyOf(top)} className={`deck-card top${drag?' held':''}`} style={style}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
    <span className="deck-stamp keep" style={{opacity:leaning>0?sure:0}} aria-hidden="true">{keepStamp}</span>
    <span className="deck-stamp pass" style={{opacity:leaning<0?sure:0}} aria-hidden="true">{passLabel}</span>
    {render(top)}
   </div>
  </div>
  <div className="deck-actions">
   <button className="deck-pass" disabled={!!leaving||busy} onClick={()=>decide(-1)} aria-label={passLabel}><X size={26}/></button>
   <button className="deck-undo" disabled={!passed.length||!!leaving} onClick={()=>setPassed(p=>p.slice(0,-1))} aria-label="Undo the last pass"><RotateCcw size={18}/></button>
   <button className="deck-keep" disabled={!!leaving||busy} onClick={()=>decide(1)} aria-label={keepLabel}><Heart size={26}/></button>
  </div>
 </div>;
}
