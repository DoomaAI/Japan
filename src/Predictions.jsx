import React,{useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {Lock} from 'lucide-react';
import {PREDICTIONS,PREDICTION_MAX,predictionPhase,predictionsOf,predictionCount} from './prediction-data.js';
// Sealed predictions: write them before we fly, see them sealed during, and open them together
// when we are home. A parent can write for a boy who would rather say his out loud.
function Answer({state,person,q,mutate,busy}){
 const saved=predictionsOf(state,person)[q.id]?.text||'',[text,setText]=useState(saved);
 const changed=text.trim()!==saved;
 return <form className="prediction" onSubmit={e=>{e.preventDefault();mutate({type:'predictionSet',person,id:q.id,text:text.trim()});}}>
  <label><span><span aria-hidden="true">{q.icon}</span> {q.ask}</span><input value={text} maxLength={PREDICTION_MAX} placeholder="Your guess" onChange={e=>setText(e.target.value)}/></label>
  {changed?<button type="submit" className="primary" disabled={busy}>Seal it</button>:saved?<small className="prediction-sealed"><Lock size={13}/> Sealed</small>:null}
 </form>;
}
export default function Predictions({state,user,today,mutate,busy}){
 const phase=predictionPhase(state.days,today),parent=user?.role==='parent';
 const [person,setPerson]=useState(state.members.includes(user?.name)?user.name:state.members[0]);
 return <>
  <p className="eyebrow">{phase==='revealed'?'OPENED AT LAST':'SEALED UNTIL WE ARE HOME'}</p><PageTitle help={phase==='open'?<p>Guess how the trip will go. Nobody sees anybody else’s until we are home, and once we land they are sealed for good.</p>:phase==='sealed'?<p>Sealed when the trip began. They open the day after we get home, in the trip story.</p>:null}>Sealed predictions</PageTitle>
  <ul className="prediction-people">{state.members.map(n=><li key={n}><strong>{n}</strong><span>{predictionCount(state,n)} of {PREDICTIONS.length}</span></li>)}</ul>
  {phase==='open'&&<>
   {parent&&<label className="prediction-who">Writing for<select value={person} onChange={e=>setPerson(e.target.value)}>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>}
   {PREDICTIONS.map(q=><Answer key={`${person}-${q.id}`} state={state} person={person} q={q} mutate={mutate} busy={busy}/>)}
  </>}
  {phase==='sealed'&&<ul className="prediction-list">{PREDICTIONS.map(q=>{const a=predictionsOf(state,user?.name)[q.id]?.text;return <li key={q.id}><span aria-hidden="true">{q.icon}</span><div><small>{q.ask}</small><strong>{a||'—'}</strong></div><Lock size={15}/></li>;})}</ul>}
  {phase==='revealed'&&PREDICTIONS.map(q=><section className="prediction-reveal" key={q.id}><h2><span aria-hidden="true">{q.icon}</span> {q.ask}</h2>
   <ul>{state.members.map(n=>{const a=predictionsOf(state,n)[q.id]?.text;return <li key={n}><b>{n}</b>{a||<small>no guess</small>}</li>;})}</ul></section>)}
 </>;
}
