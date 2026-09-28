import React,{useRef,useState} from 'react';
import {Star,Pencil,Check} from 'lucide-react';
import Dictate from './Dictate.jsx';
import {STEP_STARS,starText,stepRatings,stepThoughts,stepAverage,stepRated} from './trip-features.js';
// Stars, and what we actually thought. Kept per person so nobody's average washes out somebody
// else's — Nate giving the deer five and Lauren giving them two is the interesting bit, and an
// average that hides it is worth less than the two numbers.
// Each star is two targets: the left half of it gives a half star, the right half the whole
// one. Tapping what is already showing takes the rating back.
export function StarIcon({fill,size}){
 return <span className={`star-icon${fill?' on':''}`} style={{width:size,height:size}} aria-hidden="true">
  <Star size={size}/>{fill>0&&<span className="star-fill" style={{width:fill<1?'50%':'100%'}}><Star size={size} fill="currentColor"/></span>}
 </span>;
}
export const starFill=(value,n)=>value>=n?1:value>=n-.5?.5:0;
export function Stars({value,onPick,disabled,label,size=26}){
 return <div className="stars half-stars" role="group" aria-label={label}>
  {Array.from({length:STEP_STARS},(_,i)=>i+1).map(n=><span key={n} className="half-star">
   <StarIcon fill={starFill(value,n)} size={size}/>
   {[n-.5,n].map(v=><button key={v} type="button" disabled={disabled}
    aria-label={`${starText(v)} star${v>1?'s':''}`} aria-pressed={v===value}
    onClick={()=>onPick(v===value?0:v)}/>)}
  </span>)}
  {value>0&&<small className="stars-value">{starText(value)}</small>}
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
  </div>)}
 </section>;
}
