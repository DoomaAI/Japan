import React,{useState,useRef,useEffect} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {phraseForDay} from './phrasebook-data.js';
import {swipeDelta,isControl,stepIndex} from './swipe.js';
import PhraseReplies from './PhraseReplies.jsx';
// The phrase of the day, the fun fact of the day and the tip of the day, each a Home card of its own under the day
// in brief. Being Home cards, each folds to its label or is put away until tomorrow from its own
// bar, and either can be taken off Home for good under Customise — one without the others.
// Each swipes through its queue — the day's own first, then the ones this person has not met —
// so another is a flick away without opening anything. Swiping only looks: nothing is logged
// until a card is tapped open, so a glance on the way past never spends tomorrow's. The phrase
// card folds out what you are likely to hear back, so the answer is not the surprise.
const LIMIT=20;
function SwipeCard({eyebrow,items,render,open,fresh,more}){
 const [index,setIndex]=useState(0),touch=useRef(null);
 const list=items.slice(0,LIMIT),item=list[index]||list[0];
 const move=delta=>setIndex(i=>stepIndex(i,delta,list.length));
 // A queue that shrinks underneath (one opened and logged) never leaves the card past its end.
 useEffect(()=>{if(index>=list.length)setIndex(Math.max(0,list.length-1));},[list.length]);
 if(!item)return null;
 const at=list.indexOf(item);
 return <div className="todays-card" aria-roledescription="carousel"
  onTouchStart={e=>{touch.current=isControl(e.target.tagName)?null:{x:e.touches[0].clientX,y:e.touches[0].clientY};}}
  onTouchEnd={e=>{if(!touch.current)return;move(swipeDelta(touch.current,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY}));touch.current=null;}}
  onKeyDown={e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}else if(e.key==='ArrowRight'){e.preventDefault();move(1);}}}>
  <p className="eyebrow">{at?`One more · ${at+1} of ${list.length}`:eyebrow}{!at&&fresh&&<em className="briefing-new">New</em>}</p>
  {open?<button type="button" className="todays-japan-row" onClick={()=>open(item,at)} aria-label={`${render(item).label}. Tap to open.`}>
   <span aria-hidden="true">{item.icon}</span>
   {render(item).body}
  </button>:<div className="todays-japan-row" aria-label={render(item).label}>
   <span aria-hidden="true">{item.icon}</span>
   {render(item).body}
  </div>}
  {more?.(item)}
  {list.length>1&&<div className="todays-card-nav">
   <button type="button" className="icon" disabled={at<=0} onClick={()=>move(-1)} aria-label="Previous"><ChevronLeft size={16}/></button>
   <small>Swipe for more</small>
   <button type="button" className="icon" disabled={at>=list.length-1} onClick={()=>move(1)} aria-label="Next"><ChevronRight size={16}/></button>
  </div>}
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
