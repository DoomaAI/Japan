import React,{useState} from 'react';
import {Users,Sparkles,Search,Plus,Check,AlertCircle,Coins,Clock,X} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {INTERESTS,PACES,SUGGEST_KINDS,PROPOSAL_KINDS,party,personProfile,partyInterests,profileFilled,interestLabel,paceLabel,yenPerAud,yenToAud} from './trip-features.js';
const kindLabel=id=>(PROPOSAL_KINDS.find(([key])=>key===id)||PROPOSAL_KINDS.at(-1))[1];
const flavourLabel=id=>(SUGGEST_KINDS.find(([key])=>key===id)||SUGGEST_KINDS[1])[1];
// Who is going, and what each of them would actually want out of a day. The boys fill in their
// own — a five-year-old who has ticked playgrounds gets a different list back from a brother who
// has ticked trains. None of it is on the plan; it is what the suggestions are built from.
export function TravelParty({state,user,mutate,busy}){
 const [editing,setEditing]=useState(null);
 const parent=user.role==='parent',us=party(state),shared=partyInterests(state);
 const blank=state.members.filter(n=>!profileFilled(state,n));
 async function savePerson(e,name){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:'partyPerson',name,age:f.get('age'),interests:f.getAll('interests'),
   loves:f.get('loves'),avoid:f.get('avoid'),dietary:f.get('dietary'),notes:f.get('notes')}))setEditing(null);
 }
 async function saveTrip(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:'partyTrip',pace:f.get('pace'),budget:f.get('budget'),notes:f.get('notes')}))setEditing(null);
 }
 return <details className="party-panel">
  <summary><Users size={17}/>Who we are, and what we like{blank.length?` · ${blank.length} still blank`:''}</summary>
  <p>Fill in your own and the suggestions get better. Everyone keeps their own; a parent can fill in the ones the five-year-old will not.</p>
  {!!shared.length&&<p className="row wrap plan-tags">{shared.map(i=><span className="tag" key={i.id}>{i.label} · {i.who.join(', ')}</span>)}</p>}
  {state.members.map(name=>{
   const me=personProfile(state,name),mine=parent||user.name===name;
   return <div className="party-person" key={name}>
    <div className="section-heading"><h3>{name}{me.age?` · ${me.age}`:''}</h3>{mine&&<button onClick={()=>setEditing(editing===name?null:name)}>{editing===name?'Close':profileFilled(state,name)?'Edit':'Fill this in'}</button>}</div>
    {editing!==name&&<>
     {me.interests.length?<div className="row wrap plan-tags">{me.interests.map(id=><span className="tag" key={id}>{interestLabel(id)}</span>)}</div>:<p><small>Nothing said yet.</small></p>}
     {me.loves&&<p><small><strong>Loves:</strong> {me.loves}</small></p>}
     {me.avoid&&<p><small><strong>Would rather avoid:</strong> {me.avoid}</small></p>}
     {me.dietary&&<p><small><strong>Food:</strong> {me.dietary}</small></p>}
     {me.notes&&<p><small>{me.notes}</small></p>}
    </>}
    {editing===name&&<form onSubmit={e=>savePerson(e,name)}>
     <label>Age<input name="age" type="number" min="0" max="120" defaultValue={me.age??''}/></label>
     <fieldset><legend>What {name} is into</legend><div className="chips">{INTERESTS.map(([id,label])=><label className="chip" key={id}><input type="checkbox" name="interests" value={id} defaultChecked={me.interests.includes(id)}/>{label}</label>)}</div></fieldset>
     <label>Loves<input name="loves" maxLength={500} defaultValue={me.loves} placeholder="a proper coffee · anything with a train in it"/></label>
     <label>Would rather avoid<input name="avoid" maxLength={500} defaultValue={me.avoid} placeholder="long queues · another temple"/></label>
     <label>Food<input name="dietary" maxLength={500} defaultValue={me.dietary} placeholder="no raw fish · allergies · will eat anything"/></label>
     <label>Anything else worth knowing<textarea name="notes" maxLength={500} defaultValue={me.notes} placeholder="Flags after about three o'clock."/></label>
     <div className="row wrap"><button className="primary" disabled={busy}>Save {name}</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></div>
    </form>}
   </div>;})}
  <div className="party-person">
   <div className="section-heading"><h3>How we want the days to go</h3>{parent&&<button onClick={()=>setEditing(editing==='trip'?null:'trip')}>{editing==='trip'?'Close':'Edit'}</button>}</div>
   {editing!=='trip'?<>
    <p><small><strong>Pace:</strong> {paceLabel(us.pace)}{us.budget?` · about ¥${us.budget.toLocaleString()} a day for the four of us (≈$${yenToAud(us.budget,yenPerAud(state)).toFixed(0)})`:''}</small></p>
    {us.notes&&<p><small>{us.notes}</small></p>}
   </>:<form onSubmit={saveTrip}>
    <label>Pace<select name="pace" defaultValue={us.pace}>{PACES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label>Rough daily budget for all four (yen)<input name="budget" type="number" min="0" max="10000000" defaultValue={us.budget??''}/></label>
    <label>Worth knowing<textarea name="notes" maxLength={2000} defaultValue={us.notes} placeholder="Nate flags after lunch. We have done enough temples. Save the big walk for a cool day."/></label>
    <div className="row wrap"><button className="primary" disabled={busy}>Save</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></div>
   </form>}
  </div>
 </details>;
}
// Ideas for a place, in the flavours asked for — the famous ones, the ones nobody finds on their
// own, and everything in between. Nothing is added to the board here: each one is put up by a
// person, and the rest of the family votes on it like any other idea.
export function Suggestions({state,user,day,request,mutate,busy,onLookUp,onAdded}){
 const [scope,setScope]=useState(day?`d:${day}`:'');
 const [elsewhere,setElsewhere]=useState(''),[kinds,setKinds]=useState(['landmark','unique']),[count,setCount]=useState(6);
 const [working,setWorking]=useState(false),[result,setResult]=useState(null),[error,setError]=useState(''),[added,setAdded]=useState([]);
 const cities=[...new Set(state.days.map(d=>d.city))];
 const filled=state.members.filter(n=>profileFilled(state,n));
 const toggle=id=>setKinds(k=>k.includes(id)?k.filter(x=>x!==id):[...k,id]);
 async function ask(e){
  e.preventDefault();
  if(!kinds.length){setError('Choose at least one kind of idea.');return;}
  setWorking(true);setError('');setResult(null);setAdded([]);
  try{
   const body={kinds,count:Number(count)};
   if(scope.startsWith('d:'))body.day=scope.slice(2);
   else if(scope.startsWith('c:'))body.city=scope.slice(2);
   else body.city=elsewhere;
   setResult(await request('suggest',body));
  }catch(e){setError(e.message||'Suggestions did not work. Add your own idea instead.');}
  finally{setWorking(false);}
 }
 async function add(item,look){
  const notes=[item.draft.notes,item.why].filter(Boolean).join('\n\n').slice(0,4000);
  const saved=await mutate({type:'proposalAdd',person:user.name,...item.draft,notes});
  if(!saved)return;
  setAdded(a=>[...a,item.draft.title]);onAdded?.();
  const created=saved?.state?.proposals?.at(-1);
  if(look&&created)onLookUp?.(created);
 }
 return <details className="party-panel suggest-panel">
  <summary><Sparkles size={17}/>Suggest some ideas</summary>
  <p>Built from who is going and what each of us said we are into{filled.length?` — ${filled.join(', ')} so far`:''}. {filled.length<state.members.length&&<strong>Fill in the rest above and these get sharper.</strong>}</p>
  <form onSubmit={ask}>
   <label>Where<select value={scope} onChange={e=>setScope(e.target.value)}>
    <option value="">Somewhere else…</option>
    <optgroup label="A day on the trip">{state.days.map(d=><option key={d.date} value={`d:${d.date}`}>{dayLabel(d.date)} · {d.city} · {d.title}</option>)}</optgroup>
    <optgroup label="Anywhere in">{cities.map(c=><option key={c} value={`c:${c}`}>{c}</option>)}</optgroup>
   </select></label>
   {!scope&&<label>Which place?<input value={elsewhere} onChange={e=>setElsewhere(e.target.value)} maxLength={120} placeholder="Nara · Gion after dark · near Tokyo Station"/></label>}
   <fieldset><legend>What kind of thing</legend><div className="chips">{SUGGEST_KINDS.map(([id,label])=><label className={`chip ${kinds.includes(id)?'on':''}`} key={id}><input type="checkbox" checked={kinds.includes(id)} onChange={()=>toggle(id)}/>{label}</label>)}</div></fieldset>
   <label>How many<select value={count} onChange={e=>setCount(e.target.value)}>{[4,6,8].map(n=><option key={n}>{n}</option>)}</select></label>
   <button className="primary" disabled={working||(!scope&&!elsewhere.trim())}><Sparkles size={17}/>{working?'Thinking, and checking what is on…':'Suggest ideas'}</button>
   <small>Searches for what is actually on while we are there. Rough costs and times only — nothing here is checked, and <strong>Look it up</strong> on an idea is what fills in the hours, the ticket page and the map.</small>
  </form>
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {result&&<div className="suggest-results">
   <h3>{result.suggestions.length} ideas for {result.where}</h3>
   {result.note&&<p className="callout"><AlertCircle size={18}/>{result.note}</p>}
   {result.suggestions.map(item=>{
    const done=added.includes(item.draft.title);
    return <article className={`feature-card suggest-card ${done?'finished':''}`} key={item.draft.title}>
     <div className="section-heading"><div><span className="eyebrow">{flavourLabel(item.flavour)}</span><h4>{item.draft.title}</h4></div></div>
     {item.draft.place&&<p><small>{item.draft.place}{item.draft.japanese&&<span lang="ja"> · {item.draft.japanese}</span>}</small></p>}
     <p className="suggest-why">{item.why}</p>
     <p>{item.draft.notes}</p>
     <div className="plan-facts">
      <span>{kindLabel(item.draft.category)}</span>
      {!!item.draft.duration&&<span><Clock size={14}/>About {item.draft.duration} min</span>}
      {item.draft.cost!==null&&<span><Coins size={14}/>Around ¥{item.draft.cost.toLocaleString()}{item.draft.costNote?` · ${item.draft.costNote}`:''}</span>}
      {item.bookAhead&&<span>Usually booked ahead</span>}
      <span>{item.draft.suitableFor.length?`Suits ${item.draft.suitableFor.join(', ')}`:'Suits everyone'}</span>
     </div>
     <div className="row wrap">
      {done?<span className="tag"><Check size={13}/>On the board</span>:<>
       <button className="primary" disabled={busy} onClick={()=>add(item,false)}><Plus size={16}/>Put it on the board</button>
       <button disabled={busy} onClick={()=>add(item,true)}><Search size={16}/>Add and look it up</button>
      </>}
     </div>
    </article>;})}
   <small>{result.usage.searches} web {result.usage.searches===1?'search':'searches'}. These are ideas, not checked facts — costs and times are rough, and anything you plan around needs looking up first.</small>
   <button onClick={()=>setResult(null)}><X size={16}/>Clear these</button>
  </div>}
 </details>;
}
