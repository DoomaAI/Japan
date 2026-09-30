import React,{useRef,useState} from 'react';
import {Star,Pencil,Check,X} from 'lucide-react';
import Dictate from './Dictate.jsx';
import {STEP_STARS,starText,stepRatings,stepThoughts,stepAverage,stepRated,dayRatingsFor,dayThoughtsFor} from './trip-features.js';
import {NEXT_TIME_CHIPS,nextTimeFor,MAX_NEXT_TIME} from './next-time.js';
import {Repeat} from 'lucide-react';
// Stars, and what we actually thought. Kept per person so nobody's average washes out somebody
// else's — Nate giving the deer five and Lauren giving them two is the interesting bit, and an
// average that hides it is worth less than the two numbers.
// The stars are a slider: tap or drag along them and the rating follows the finger in tenths,
// so "a bit under four" can be 3.8. Nothing is saved until the finger lifts. Arrow keys step a
// tenth at a time; the cross takes the rating back.
// The star is drawn from 2 to 22 of its 24-wide box, so a fill is measured across the star
// itself rather than the box — otherwise 4.2 looks like 4.
const EDGE=2/24,BODY=20/24;
export function StarIcon({fill,size}){
 return <span className={`star-icon${fill?' on':''}`} style={{width:size,height:size}} aria-hidden="true">
  <Star size={size}/>{fill>0&&<span className="star-fill" style={{width:`${fill<1?(EDGE+fill*BODY)*100:100}%`}}><Star size={size} fill="currentColor"/></span>}
 </span>;
}
export const starFill=(value,n)=>Math.min(1,Math.max(0,value-(n-1)));
const tenth=v=>Math.min(STEP_STARS,Math.max(.1,Math.round(v*10)/10));
export function Stars({value,onPick,disabled,label,size=26}){
 const row=useRef(null),[draft,setDraft]=useState(null);
 const shown=draft??value;
 const at=e=>{
  const r=row.current.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*STEP_STARS,n=Math.floor(Math.min(x,STEP_STARS-.001));
  return tenth(n+Math.min(1,Math.max(0,(x-n-EDGE)/BODY)));
 };
 const down=e=>{if(disabled||e.button>0)return;e.currentTarget.setPointerCapture?.(e.pointerId);setDraft(at(e));};
 const move=e=>{if(draft!==null)setDraft(at(e));};
 const up=e=>{if(draft===null)return;const v=at(e);setDraft(null);if(v!==value)onPick(v);};
 const key=e=>{if(disabled)return;
  const step={ArrowRight:.1,ArrowUp:.1,ArrowLeft:-.1,ArrowDown:-.1,PageUp:1,PageDown:-1}[e.key];
  if(step){e.preventDefault();const v=tenth((value||0)+step);if(v!==value)onPick(v);}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(value)onPick(0);}
 };
 return <div className="stars slide-stars">
  <div ref={row} className="slide-stars-row" role="slider" tabIndex={disabled?-1:0} aria-label={label} aria-disabled={disabled||undefined}
   aria-valuemin={0} aria-valuemax={STEP_STARS} aria-valuenow={shown||0} aria-valuetext={shown?`${starText(shown)} of ${STEP_STARS} stars`:'Not rated'}
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>setDraft(null)} onKeyDown={key}>
   {Array.from({length:STEP_STARS},(_,i)=><StarIcon key={i} fill={starFill(shown,i+1)} size={size}/>)}
  </div>
  {shown>0&&<small className="stars-value">{starText(shown)}</small>}
  {value>0&&!disabled&&draft===null&&<button type="button" className="stars-clear" aria-label="Clear rating" onClick={()=>onPick(0)}><X size={14}/></button>}
 </div>;
}
export function ReadStars({value,size=15,label}){
 return <span className="stars read" aria-label={label}>
  {Array.from({length:STEP_STARS},(_,i)=><StarIcon key={i} fill={starFill(value,i+1)} size={size}/>)}</span>;
}
export default function StepReview({state,user,step,mutate,busy,compact}){
 const [writing,setWriting]=useState(false);
 // Talking fills this box too. What the boys thought of a place is the part of the diary
 // most likely to go unwritten, and at five it is certain to unless he can say it.
 const box=useRef(null);
 const ratings=stepRatings(state,step.id),thoughts=stepThoughts(state,step.id);
 const average=stepAverage(state,step.id),count=stepRated(state,step.id);
 const mine=ratings[user.name]||0,myThought=thoughts[user.name]?.text||'';
 const others=state.members.filter(n=>n!==user.name&&(ratings[n]||thoughts[n]));
 // The lesson for next time: a chip, or a line, per person.
 const nextTime=nextTimeFor(state,step.id),myNext=nextTime[user.name]?.text||'';
 const [nextOpen,setNextOpen]=useState(false);
 const saveNext=text=>mutate({type:'stepNextTime',id:step.id,person:user.name,text});
 async function saveThought(e){
  e.preventDefault();const form=e.currentTarget,f=new FormData(form);
  if(await mutate({type:'stepThought',id:step.id,person:user.name,thought:f.get('thought')}))setWriting(false);
 }
 if(compact&&!count&&!mine)return null;
 return <section className="step-review" aria-label={`What we thought of ${step.title}`}>
  <div className="section-heading">
   <div><p className="eyebrow">WHAT DID WE THINK?</p>
    {average!==null&&<h3>{average} <small>from {count} of us</small></h3>}</div>
  </div>
  <div className="review-mine">
   <span>{user.name}</span>
   <Stars value={mine} disabled={busy} label={`Your rating for ${step.title}`}
    onPick={rating=>mutate({type:'stepRating',id:step.id,person:user.name,rating})}/>
  </div>
  {!writing&&<button type="button" className="review-write" onClick={()=>setWriting(true)}>
   {myThought?<><Pencil size={15}/>{myThought}</>:<><Pencil size={15}/>Add a line about it</>}</button>}
  {writing&&<form onSubmit={saveThought}>
   <label>What did you think?<textarea ref={box} name="thought" maxLength={2000} defaultValue={myThought} autoFocus
    placeholder="The deer bowed back. Boston laughed for ten minutes."/></label>
   <Dictate into={box} label="Say it" what="what you thought"/>
   <div className="row wrap"><button className="primary" disabled={busy}><Check size={16}/>Save</button>
    <button type="button" onClick={()=>setWriting(false)}>Cancel</button></div>
  </form>}
  {others.map(name=><div className="review-other" key={name}>
   <div className="review-mine"><span>{name}</span>
    {ratings[name]
     ?<ReadStars value={ratings[name]} label={`${name} gave ${starText(ratings[name])} of ${STEP_STARS}`}/>
     :<small>no stars yet</small>}</div>
   {thoughts[name]&&<p>{thoughts[name].text}</p>}
   {nextTime[name]&&<p className="next-time-line"><Repeat size={13}/> Next time: {nextTime[name].text}</p>}
  </div>)}
  {/* Next time: the lesson while it is fresh. A chip saves at once; a line typed saves on Enter;
      the same chip again, or a blank line, takes it back. */}
  <div className="next-time">
   <button type="button" className="review-write" aria-expanded={nextOpen} onClick={()=>setNextOpen(o=>!o)}><Repeat size={15}/>{myNext?`Next time: ${myNext}`:'Next time…'}</button>
   {nextOpen&&<>
    <div className="chips">{NEXT_TIME_CHIPS.map(c=><button type="button" key={c} className={`chip${myNext===c?' on':''}`} disabled={busy} onClick={()=>saveNext(myNext===c?'':c)}>{c}</button>)}</div>
    <form onSubmit={e=>{e.preventDefault();saveNext(new FormData(e.currentTarget).get('next'));setNextOpen(false);}}>
     <label>Or in your own words<input name="next" maxLength={MAX_NEXT_TIME} defaultValue={myNext} placeholder="Book the 9 am slot; the queue was an hour by ten."/></label>
     <div className="row wrap"><button className="primary" disabled={busy}><Check size={16}/>Save</button><button type="button" onClick={()=>setNextOpen(false)}>Close</button></div>
    </form>
   </>}
  </div>
 </section>;
}
// The day as a whole, in your own stars. Shown in the evening and again in the diary, so it can
// be given at bedtime or picked up afterwards; everyone else's stars sit beside it, read-only.
export function DayRate({state,user,day,mutate,busy,label='How was the day?'}){
 const [writing,setWriting]=useState(false),box=useRef(null);
 const ratings=dayRatingsFor(state,day),thoughts=dayThoughtsFor(state,day),mine=ratings[user.name]||0,myThought=thoughts[user.name]?.text||'';
 const others=state.members.filter(n=>n!==user.name&&(ratings[n]||thoughts[n]));
 async function save(e){
  e.preventDefault();
  if(await mutate({type:'dayThought',day,person:user.name,thought:new FormData(e.currentTarget).get('thought')}))setWriting(false);
 }
 return <div className="day-rate">
  <div className="review-mine"><span>{label}</span>
   <Stars value={mine} disabled={busy} label={`Your rating for the whole day, ${day}`}
    onPick={rating=>mutate({type:'dayRating',day,person:user.name,rating})}/></div>
  {!writing&&<button type="button" className="review-write" onClick={()=>setWriting(true)}>
   <Pencil size={15}/>{myThought||'Add why — what made it that kind of day'}</button>}
  {writing&&<form onSubmit={save}>
   <label>Why that rating?<textarea ref={box} name="thought" maxLength={2000} defaultValue={myThought} autoFocus
    placeholder="Best ramen of the trip, but the train was a squash."/></label>
   <Dictate into={box} label="Say it" what="why you rated the day that way"/>
   <div className="row wrap"><button className="primary" disabled={busy}><Check size={16}/>Save</button>
    <button type="button" onClick={()=>setWriting(false)}>Cancel</button></div>
  </form>}
  {others.map(name=><div className="review-other" key={name}>
   <div className="review-mine"><span>{name}</span>
    {ratings[name]?<ReadStars value={ratings[name]} label={`${name} gave the day ${starText(ratings[name])} of ${STEP_STARS}`}/>:<small>no stars yet</small>}</div>
   {thoughts[name]&&<p>{thoughts[name].text}</p>}
  </div>)}
 </div>;
}
