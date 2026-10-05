import React,{useRef,useState} from 'react';
import {Star,Pencil,Check,X,Repeat} from 'lucide-react';
import Dictate from './Dictate.jsx';
import {STEP_STARS,starText,stepRatings,stepThoughts,stepAverage,stepRated,dayRatingsFor,dayThoughtsFor} from './trip-features.js';
import {NEXT_TIME_CHIPS,nextTimeFor,MAX_NEXT_TIME} from './next-time.js';
// Stars, and what we actually thought. Kept per person so nobody's average washes out somebody
// else's — Nate giving the deer five and Lauren giving them two is the interesting bit, and an
// average that hides it is worth less than the two numbers.
// A tap on a star gives that many whole stars, which is all most ratings need and the one thing
// a thumb on a moving train can hit. Dragging along the row follows the finger in half-stars,
// for "better than three, not quite four". Nothing is saved until the finger lifts. Arrow keys
// step a half at a time; the cross takes the rating back. Tenths given before still show as given.
// The star is drawn from 2 to 22 of its 24-wide box, so a fill is measured across the star
// itself rather than the box — otherwise 4.2 looks like 4.
const EDGE=2/24,BODY=20/24;
export function StarIcon({fill,size}){
 return <span className={`star-icon${fill?' on':''}`} style={{width:size,height:size}} aria-hidden="true">
  <Star size={size}/>{fill>0&&<span className="star-fill" style={{width:`${fill<1?(EDGE+fill*BODY)*100:100}%`}}><Star size={size} fill="currentColor"/></span>}
 </span>;
}
export const starFill=(value,n)=>Math.min(1,Math.max(0,value-(n-1)));
const half=v=>Math.min(STEP_STARS,Math.max(.5,Math.round(v*2)/2));
// Further than this (in px) and the finger is dragging, not tapping.
const DRAG=8;
export function Stars({value,onPick,disabled,label,size=30}){
 const row=useRef(null),from=useRef(null),[draft,setDraft]=useState(null);
 const shown=draft??value;
 const place=e=>{const r=row.current.getBoundingClientRect();return Math.min(Math.max((e.clientX-r.left)/r.width*STEP_STARS,0),STEP_STARS-.001);};
 // A tap: the star under the finger, whole. A drag: half-stars, measured across the star itself.
 const whole=e=>Math.floor(place(e))+1;
 const slid=e=>{const x=place(e),n=Math.floor(x);return half(n+Math.min(1,Math.max(0,(x-n-EDGE)/BODY)));};
 const dragging=e=>from.current!==null&&Math.abs(e.clientX-from.current)>DRAG;
 const down=e=>{if(disabled||e.button>0)return;e.currentTarget.setPointerCapture?.(e.pointerId);from.current=e.clientX;setDraft(whole(e));};
 const move=e=>{if(draft!==null)setDraft(dragging(e)?slid(e):whole(e));};
 const up=e=>{if(draft===null)return;const v=dragging(e)?slid(e):whole(e);from.current=null;setDraft(null);if(v!==value)onPick(v);};
 const key=e=>{if(disabled)return;
  const step={ArrowRight:.5,ArrowUp:.5,ArrowLeft:-.5,ArrowDown:-.5,PageUp:1,PageDown:-1}[e.key];
  if(step){e.preventDefault();const v=half((value||0)+step);if(v!==value)onPick(v);}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(value)onPick(0);}
 };
 return <div className="stars slide-stars">
  <div ref={row} className="slide-stars-row" role="slider" tabIndex={disabled?-1:0} aria-label={label} aria-disabled={disabled||undefined}
   aria-valuemin={0} aria-valuemax={STEP_STARS} aria-valuenow={shown||0} aria-valuetext={shown?`${starText(shown)} of ${STEP_STARS} stars`:'Not rated'}
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{from.current=null;setDraft(null);}} onKeyDown={key}>
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
// "How was it?", the moment a stop is ticked off: the one time everybody has an opinion and the
// phone is already in a hand. Big stars that save on the tap, then an optional line, and Later
// to get on with the day. The same rating is on the stop afterwards, so nothing here is final.
export function RateNow({state,user,step,mutate,busy,close}){
 const box=useRef(null);
 const mine=stepRatings(state,step.id)[user.name]||0,myThought=stepThoughts(state,step.id)[user.name]?.text||'';
 const [saved,setSaved]=useState(false);
 async function finish(e){
  e.preventDefault();
  const thought=String(new FormData(e.currentTarget).get('thought')||'').trim();
  if(thought!==myThought&&!await mutate({type:'stepThought',id:step.id,person:user.name,thought}))return;
  close();
 }
 return <form className="rate-now" onSubmit={finish}>
  <p className="rate-now-title">{step.title}</p>
  <Stars value={mine} disabled={busy} size={44} label={`How was ${step.title}?`}
   onPick={async rating=>{if(await mutate({type:'stepRating',id:step.id,person:user.name,rating}))setSaved(true);}}/>
  <small className="rate-now-hint">{mine?saved?'Saved. Tap again to change it.':'Tap a star to change it.':'Tap a star. Slide along for a half.'}</small>
  {mine>0&&<>
   <label>Anything to remember? <small>(optional)</small><textarea ref={box} name="thought" maxLength={2000} defaultValue={myThought} rows={2}
    placeholder="The deer bowed back. Boston laughed for ten minutes."/></label>
   <Dictate into={box} label="Say it" what="what you thought"/>
  </>}
  <div className="row wrap">
   {mine>0&&<button className="primary" disabled={busy}><Check size={16}/>Done</button>}
   <button type="button" onClick={close}>{mine?'Close':'Later'}</button>
  </div>
 </form>;
}
