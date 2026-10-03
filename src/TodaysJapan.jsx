import React,{useState,useRef,useEffect,useContext} from 'react';
import {createPortal} from 'react-dom';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {phraseForDay} from './phrasebook-data.js';
import {dragTurn,dragAxis,stepIndex} from './swipe.js';
import PhraseReplies from './PhraseReplies.jsx';
import {HomeBarSlot} from './home-bar.js';
// The phrase of the day, the fun fact of the day and the tip of the day, each a Home card of its own under What’s
// next. Being Home cards, each folds to its label or is put away until tomorrow from its own
// bar, and either can be taken off Home for good under Customise — one without the others.
// Each swipes through its queue — the day's own first, then the ones this person has not met —
// so another is a flick away without opening anything: the card itself is swiped, the arrows
// tucked into its heading for anyone who would rather tap. Swiping only looks: nothing is logged
// until a card is tapped open, so a glance on the way past never spends tomorrow's. The phrase
// card folds out what you are likely to hear back, so the answer is not the surprise.
const LIMIT=20;
function SwipeCard({eyebrow,items,render,open,fresh,more}){
 const [index,setIndex]=useState(0),[drag,setDrag]=useState(0),touch=useRef(null),slot=useContext(HomeBarSlot);
 const list=items.slice(0,LIMIT),item=list[index]||list[0];
 const move=delta=>setIndex(i=>stepIndex(i,delta,list.length));
 // A queue that shrinks underneath (one opened and logged) never leaves the card past its end.
 useEffect(()=>{if(index>=list.length)setIndex(Math.max(0,list.length-1));},[list.length]);
 if(!item)return null;
 const at=list.indexOf(item),many=list.length>1;
 // The card follows the finger sideways, so it plainly is something to swipe; past either end
 // it only gives a little, so it is plain there is nothing more that way.
 // The Home card's own title already names it, so with more than one the heading is the count.
 // The face of the card is itself the tap-to-open button, and a drag across it is still a swipe.
 // The way a drag goes is settled in its first few pixels and kept: a scroll never starts
 // dragging the card halfway down, and a drag the card has followed is judged on how far across
 // it went (or how fast), not undone because the thumb drifted down on the way.
 const follow=e=>{
  const t=touch.current;if(!t||!many)return;
  const dx=e.touches[0].clientX-t.x,dy=e.touches[0].clientY-t.y;
  t.axis=t.axis||dragAxis(dx,dy);
  if(t.axis!=='x')return;
  setDrag((dx>0&&at<=0)||(dx<0&&at>=list.length-1)?dx/4:dx);
 };
 // Only the arrows and the replies' recordings keep a drag to themselves; a sideways drag that
 // starts on the card's face or the "what you might hear back" fold still turns the card.
 const start=e=>{
  const el=e.target;
  touch.current=el.closest?.('.todays-card-steps')||['AUDIO','INPUT','SELECT','TEXTAREA'].includes(el.tagName)?null
   :{x:e.touches[0].clientX,y:e.touches[0].clientY,at:Date.now(),axis:null};
 };
 const end=e=>{
  const t=touch.current;touch.current=null;setDrag(0);
  if(!t||t.axis!=='x')return;
  move(dragTurn(e.changedTouches[0].clientX-t.x,Date.now()-t.at));
 };
 // On Home the count, the New mark and the arrows sit on the card's heading line; anywhere else
 // they make a row of their own.
 const heading=<>
  <span className="todays-card-count">{many?`${at+1} of ${list.length}`:slot?'':eyebrow}</span>{!at&&fresh&&<em className="briefing-new">New</em>}
  {many&&<span className="todays-card-steps">
   <button type="button" className="icon" disabled={at<=0} onClick={()=>move(-1)} aria-label="Previous"><ChevronLeft size={16}/></button>
   <button type="button" className="icon" disabled={at>=list.length-1} onClick={()=>move(1)} aria-label="Next"><ChevronRight size={16}/></button>
  </span>}
 </>;
 return <div className="todays-card" aria-roledescription="carousel"
  onTouchStart={start}
  onTouchMove={follow}
  onTouchEnd={end}
  onTouchCancel={()=>{touch.current=null;setDrag(0);}}
  onKeyDown={e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}else if(e.key==='ArrowRight'){e.preventDefault();move(1);}}}>
  {slot?createPortal(heading,slot):<p className="eyebrow">{heading}</p>}
  <div className={`todays-card-body${drag?' dragging':''}`} style={drag?{transform:`translateX(${drag}px)`}:undefined}>
   {open?<button type="button" className="todays-japan-row" onClick={()=>open(item,at)} aria-label={`${render(item).label}. Tap to open.`}>
    <span aria-hidden="true">{item.icon}</span>
    {render(item).body}
   </button>:<div className="todays-japan-row" aria-label={render(item).label}>
    <span aria-hidden="true">{item.icon}</span>
    {render(item).body}
   </div>}
   {more?.(item)}
  </div>
 </div>;
}
// queue is null when the phrase is switched off or Home is on another day; another day still
// shows its phrase, opening the phrasebook.
export function TodaysPhrase({state,day,queue=null,fresh=false,open,go}){
 const items=queue?.length?queue:[state?phraseForDay(state.days,day):null].filter(Boolean);
 return <SwipeCard eyebrow="Phrase of the day" items={items} fresh={fresh} open={queue?.length?open:()=>go('phrases')}
  more={p=><PhraseReplies phrase={p}/>}
  render={p=>({label:`${p.en}, ${p.ja}, said ${p.say}`,body:<span><b>{p.en} · <span lang="ja">{p.ja}</span></b><small>Say “{p.say}”</small></span>})}/>;
}
export function TodaysFact({queue=null,fresh=false,open}){
 if(!queue?.length)return null;
 return <SwipeCard eyebrow="Fun fact of the day" items={queue} fresh={fresh} open={open}
  render={f=>({label:`${f.title}. ${f.text}`,body:<span><b>{f.title}</b><small className="todays-card-text">{f.text}</small></span>})}/>;
}
// The tip has nothing to open or log: the whole tip is on the card. The day's own pages and stops
// come first (the deer at Nara, the Shinkansen, a shrine), then the rest of the book.
export function TodaysTip({tips=null}){
 if(!tips?.length)return null;
 return <SwipeCard eyebrow="Tip of the day" items={tips}
  render={t=>({label:`${t.group}: ${t.title}. ${t.text}`,body:<span><b>{t.title}</b><small className="todays-card-text">{t.text}</small></span>})}/>;
}
