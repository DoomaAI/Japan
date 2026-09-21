import React,{useState} from 'react';
import {Star,Pencil,Check} from 'lucide-react';
import {STEP_STARS,stepRatings,stepThoughts,stepAverage,stepRated} from './trip-features.js';
// Stars, and what we actually thought. Kept per person so nobody's average washes out somebody
// else's — Nate giving the deer five and Lauren giving them two is the interesting bit, and an
// average that hides it is worth less than the two numbers.
export function Stars({value,onPick,disabled,label}){
 return <div className="stars" role="group" aria-label={label}>
  {Array.from({length:STEP_STARS},(_,i)=>i+1).map(n=>
   <button key={n} type="button" className={n<=value?'on':''} disabled={disabled}
    aria-label={`${n} star${n>1?'s':''}`} aria-pressed={n===value}
    onClick={()=>onPick(n===value?0:n)}><Star size={20}/></button>)}
 </div>;
}
export default function StepReview({state,user,step,mutate,busy,compact}){
 const [writing,setWriting]=useState(false);
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
   <label>What did you think?<textarea name="thought" maxLength={2000} defaultValue={myThought} autoFocus
    placeholder="The deer bowed back. Boston laughed for ten minutes."/></label>
   <div className="row wrap"><button className="primary" disabled={busy}><Check size={16}/>Save</button>
    <button type="button" onClick={()=>setWriting(false)}>Cancel</button></div>
  </form>}
  {others.map(name=><div className="review-other" key={name}>
   <div className="review-mine"><span>{name}</span>
    {ratings[name]
     ?<span className="stars read" aria-label={`${name} gave ${ratings[name]} of ${STEP_STARS}`}>
       {Array.from({length:STEP_STARS},(_,i)=><Star key={i} size={15} className={i<ratings[name]?'on':''}/>)}</span>
     :<small>no stars yet</small>}</div>
   {thoughts[name]&&<p>{thoughts[name].text}</p>}
  </div>)}
 </section>;
}
