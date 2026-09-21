import React,{useState,useRef,useEffect} from 'react';
import {Lightbulb,ArrowLeft,ArrowRight,Sparkles,Check,BookOpen} from 'lucide-react';
import {ALL_FACTS,factsForDay} from './fact-data.js';
import {japanDate} from './timing.js';
import {dayLabel} from './AdventurePages.jsx';
import {searchText,factQueue,factLogFor,factsSeenBy} from './trip-features.js';
import {swipeDelta,isControl,typesText,stepIndex} from './swipe.js';
// The day's fun fact, and as many more as anyone wants to swipe through. Everything actually
// put on screen is handed back when it closes, so the log records what was really seen and
// nobody is ever shown the same fact twice.
export function FactOfDay({queue,dateLabel,busy,dismiss,openPage}){
 const [index,setIndex]=useState(0),touch=useRef(null),seen=useRef(new Set());
 const fact=queue[index]||queue[0];
 const move=delta=>setIndex(i=>stepIndex(i,delta,queue.length));
 useEffect(()=>{if(fact)seen.current.add(fact.id);},[fact?.id]);
 useEffect(()=>{
  const onKey=e=>{
   if(typesText(e.target))return;
   if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1);
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[queue.length]);
 if(!fact)return null;
 return <div className="fact-of-day"
  onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
  onTouchEnd={e=>{
   if(!touch.current||isControl(e.target.tagName))return;
   move(swipeDelta(touch.current,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY}));
   touch.current=null;
  }}>
  <p className="eyebrow"><Lightbulb size={14}/> {index?`ONE MORE · ${index+1} OF ${queue.length}`:`TODAY’S FUN FACT · ${dateLabel}`}</p>
  <span className="fact-picture" role="img" aria-label={fact.title}>{fact.icon}</span>
  <strong className="fact-title">{fact.title}</strong>
  <p className="fact-text">{fact.text}</p>
  {queue.length>1&&<div className="swipe-controls">
   <button type="button" disabled={index<=0} onClick={()=>move(-1)}><ArrowLeft size={16}/> Back</button>
   <span>Swipe for more</span>
   <button type="button" disabled={index>=queue.length-1} onClick={()=>move(1)}>One more <ArrowRight size={16}/></button>
  </div>}
  <button className="primary" disabled={busy} onClick={()=>dismiss([...seen.current])}>Got it</button>
  {openPage&&<button type="button" onClick={()=>openPage(fact.page,[...seen.current])}><BookOpen size={16}/> Page {fact.page} of the guide</button>}
  <p><small>One fact each day about what that day actually holds, straight out of the guide, and as many more as you like. Everything you see is kept under More → Fun facts.</small></p>
 </div>;
}
// The whole collection, the ones tied to today, and everything this person has already met.
export default function FunFacts({state,user,day,mutate,busy,openPage}){
 const [extra,setExtra]=useState(null),[open,setOpen]=useState(false),[q,setQ]=useState('');
 const total=ALL_FACTS().length,log=factLogFor(state,user.name),seen=factsSeenBy(state,user.name);
 const queue=factQueue(state,user.name,day).filter(f=>!seen[f.id]);
 const todays=factsForDay(state.days,day);
 const query=searchText(q);
 const found=query?ALL_FACTS().filter(f=>searchText(`${f.title} ${f.text}`).includes(query)):null;
 async function another(){
  const pick=queue[0];if(!pick)return;
  setExtra(pick);await mutate({type:'factSeen',person:user.name,factIds:[pick.id]});
 }
 const when=at=>{const d=new Date(at);return Number.isFinite(d.getTime())?dayLabel(japanDate(d)):'';};
 return <>
  <section className="my-phrases">
   <h2>Facts you have seen</h2>
   <p>{log.length} of {total}{log.length<total?` · ${total-log.length} still to meet`:' · the whole collection'}</p>
   {extra&&<div className="phrase-extra"><p className="eyebrow">ONE MORE</p><FactRow fact={extra}/></div>}
   <div className="row wrap">
    <button className="primary" disabled={busy||!queue.length} onClick={another}><Sparkles size={16}/> {extra?'And another':'Show me another'}</button>
    {!queue.length&&<span><Check size={15}/> You have seen every fact.</span>}
   </div>
   {!!log.length&&<details open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary>My log ({log.length})</summary>
    {log.map(f=><div className="list-row" key={f.id}><span>{f.title}<small>{f.text}</small></span><small>{when(f.at)}</small></div>)}
   </details>}
  </section>
  <label>Search<input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="A place, a food or a word from the guide"/></label>
  {found?<section className="fact-section">
   <h2>{found.length} {found.length===1?'fact':'facts'}</h2>
   {found.map(f=><FactRow key={f.id} fact={f} openPage={openPage}/>)}
   {!found.length&&<p>Nothing matched. Try a place, a food or a word from the guide.</p>}
  </section>:<>
   {!!todays.length&&<section className="fact-section">
    <h2>Today</h2>
    <p>Tied to what is actually coming up, best first.</p>
    {todays.map(f=><FactRow key={f.id} fact={f} openPage={openPage}/>)}
   </section>}
   <section className="fact-section">
    <h2>Every fact</h2>
    <p>All {total}, in the order they turn up on the trip. Nothing here needs signal.</p>
    {ALL_FACTS().map(f=><FactRow key={f.id} fact={f} openPage={openPage}/>)}
   </section>
  </>}
 </>;
}
export function FactRow({fact,openPage}){
 return <article className="fact-row">
  <span className="fact-icon" aria-hidden="true">{fact.icon}</span>
  <div>
   <strong>{fact.title}</strong>
   <p>{fact.text}</p>
   {openPage&&<button type="button" className="fact-page" onClick={()=>openPage(fact.page)}><BookOpen size={14}/> Page {fact.page}</button>}
  </div>
 </article>;
}
