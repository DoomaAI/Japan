import React,{useState} from 'react';
import {Check,ExternalLink,Lightbulb,Pencil,Target,X} from 'lucide-react';
import {INSIDER_FIELDS,insiderShown} from './insider-data.js';
import {etiquetteFor} from './etiquette-data.js';
import {isChild} from './child-levels.js';
// The insider notes for one stop, on its card. Everyone reads what a parent has passed; a parent
// sees a fresh draft first, with a line to correct any field, and passes or dismisses it.
export function StopInsider({state,step,user,mutate,busy}){
 const parent=user?.role==='parent',note=insiderShown(state,step?.id,parent);
 const [editing,setEditing]=useState(false);
 if(!note)return null;
 const draft=note.status==='draft';
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const patch=Object.fromEntries(INSIDER_FIELDS.map(([k])=>[k,String(f.get(k)||'')]));
  if(await mutate({type:'insiderReview',stepId:step.id,status:'reviewed',patch}))setEditing(false);
 }
 return <details className={`stop-insider${draft?' draft':''}`} open={draft&&parent?true:undefined}>
  <summary><Lightbulb size={16}/>Insider notes{draft?' · a draft to check':''}</summary>
  {editing?<form onSubmit={save}>
   {INSIDER_FIELDS.map(([k,label])=><label key={k}>{label}<textarea name={k} maxLength={300} rows={2} defaultValue={note[k]||''}/></label>)}
   <div className="row wrap"><button className="primary" disabled={busy}>Save and pass</button><button type="button" onClick={()=>setEditing(false)}>Cancel</button></div>
  </form>:<dl>{INSIDER_FIELDS.filter(([k])=>note[k]).map(([k,label,icon])=><div key={k}><dt><span aria-hidden="true">{icon}</span> {label}</dt><dd>{note[k]}</dd></div>)}</dl>}
  {!!note.sources?.length&&!editing&&<p className="day-check-sources">{note.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title||new URL(s.url).hostname} <ExternalLink size={12}/></a>)}</p>}
  {draft&&parent&&!editing&&<div className="row wrap">
   <button type="button" className="primary" disabled={busy} onClick={()=>mutate({type:'insiderReview',stepId:step.id,status:'reviewed'})}><Check size={16}/>Looks right</button>
   <button type="button" disabled={busy} onClick={()=>setEditing(true)}><Pencil size={16}/>Correct it</button>
   <button type="button" disabled={busy} onClick={()=>mutate({type:'insiderReview',stepId:step.id,status:'dismissed'})}><X size={16}/>Dismiss</button>
  </div>}
  {!draft&&<small>Checked by {note.reviewedBy||'a parent'}. Looked up on the web; things change, so ask if something looks different.</small>}
 </details>;
}
// How to do it here: the manners for this kind of stop, the boys' version for a boy, and a
// button that makes the stop's mission his for the day.
export function StopEtiquette({state,step,user,mutate,busy,city}){
 const rules=etiquetteFor(step,city);
 const child=isChild(state,user?.name),parent=user?.role==='parent';
 if(!rules.length)return null;
 const boys=(state.members||[]).filter(n=>isChild(state,n));
 const taken=(rule,person)=>(state.challenges||[]).some(c=>c.day===step.day&&c.participants?.includes(person)&&c.title===rule.mission?.[0]);
 return <details className="stop-etiquette">
  <summary><span aria-hidden="true">{rules[0].icon}</span>How to do it here{rules.length===1?`: ${rules[0].label}`:''}</summary>
  {rules.map(r=><div key={r.id} className="etiquette-rule">
   {rules.length>1&&<h4><span aria-hidden="true">{r.icon}</span> {r.label}</h4>}
   <ul>{(child?r.boys:r.grown).map(line=><li key={line}>{line}</li>)}</ul>
   {!child&&r.boys?.length>0&&<p className="etiquette-boys"><small><b>For the boys:</b> {r.boys.join(' ')}</small></p>}
   {r.mission&&step.day&&<div className="row wrap">{(child?[user.name]:parent?boys:[]).map(p=>taken(r,p)
    ?<small key={p}><Check size={13}/> {child?'Your':`${p}’s`} mission today</small>
    :<button type="button" key={p} disabled={busy} onClick={()=>mutate({type:'etiquetteMission',person:p,rule:r.id,stepId:step.id})}><Target size={15}/>{child?'Make it my mission':`Mission for ${p}`}</button>)}</div>}
  </div>)}
 </details>;
}
