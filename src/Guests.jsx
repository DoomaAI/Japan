import React,{useState} from 'react';
import {Users,Download,ExternalLink,Utensils} from 'lucide-react';
import {RSVP_STATUSES,STATUS_IDS,rsvpOf,guestSummary,guestsCsv,invitationOf,answersClosed} from './rsvp-data.js';
import {roleLabel,householdOf} from './people.js';
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
const WORD={in:'In',maybe:'Maybe',out:'Out',none:'No answer'};
// Your own answer, written from inside the plan rather than from the public link; the guest list
// for the organiser, with what the caterer asks; and for everyone, who is in when the organiser
// shares names. Everything here is one operation, rsvpSet, so the public link and this page
// cannot disagree about what an answer is.
function MyAnswer({state,user,mutate,busy,name,heading}){
 const inv=invitationOf(state),current=rsvpOf(state,name)||{};
 const [answer,setAnswer]=useState({status:current.status||'in',plusOne:current.plusOne||'',children:current.children||0,dietary:current.dietary||'',note:current.note||'',answers:current.answers||{}});
 const closed=answersClosed(state)&&user.role!=='parent';
 return <details className="party-panel" open={!current.status}><summary><Users size={17}/>{heading}{current.status?` · ${WORD[current.status]}`:''}</summary>
  {closed?<p>Answers closed on {inv.rsvpBy}. Ask the organiser to change yours.</p>:<form onSubmit={async e=>{e.preventDefault();await mutate({type:'rsvpSet',name,answer});}}>
   <div className="segmented" role="radiogroup" aria-label="Answer">{RSVP_STATUSES.map(([id,label])=><button type="button" key={id} role="radio" aria-checked={answer.status===id} className={answer.status===id?'selected':''} onClick={()=>setAnswer(a=>({...a,status:id}))}>{label}</button>)}</div>
   {answer.status!=='out'&&<>
    {inv.plusOnes&&<label>Bringing someone? Their name<input value={answer.plusOne} maxLength={40} onChange={e=>setAnswer(a=>({...a,plusOne:e.target.value}))}/></label>}
    {inv.childrenWelcome&&<label>Children coming<input type="number" min={0} max={10} value={answer.children} onChange={e=>setAnswer(a=>({...a,children:Math.max(0,Math.min(10,Number(e.target.value)||0))}))}/></label>}
    {inv.askDietary&&<label>Anything you can’t eat<input value={answer.dietary} maxLength={200} onChange={e=>setAnswer(a=>({...a,dietary:e.target.value}))}/></label>}
    {inv.questions.map(q=><label key={q.id}>{q.label}{q.kind==='text'&&<input value={answer.answers[q.id]||''} maxLength={200} onChange={e=>setAnswer(a=>({...a,answers:{...a.answers,[q.id]:e.target.value}}))}/>}
     {q.kind==='choice'&&<select value={answer.answers[q.id]||''} onChange={e=>setAnswer(a=>({...a,answers:{...a.answers,[q.id]:e.target.value}}))}><option value="">Choose…</option>{q.options.map(o=><option key={o}>{o}</option>)}</select>}
     {q.kind==='yesno'&&<select value={answer.answers[q.id]===true?'yes':answer.answers[q.id]===false?'no':''} onChange={e=>setAnswer(a=>({...a,answers:{...a.answers,[q.id]:e.target.value==='yes'?true:e.target.value==='no'?false:null}}))}><option value="">Choose…</option><option value="yes">Yes</option><option value="no">No</option></select>}</label>)}
   </>}
   <label>A note to the organiser<textarea value={answer.note} maxLength={500} onChange={e=>setAnswer(a=>({...a,note:e.target.value}))}/></label>
   <button className="primary" disabled={busy}>Save my answer</button>
  </form>}
 </details>;
}
export default function Guests({state,user,mutate,busy,go}){
 const parent=user.role==='parent',inv=invitationOf(state);
 const summary=guestSummary(state),counts=state.rsvpCounts||summary.counts;
 const [filter,setFilter]=useState('all'),[who,setWho]=useState('');
 const shown=state.members.filter(n=>filter==='all'||(rsvpOf(state,n)?.status||'none')===filter);
 return <>
  <p className="eyebrow">WHO’S COMING</p><h1>{state.plan?.title||'The plan'}</h1>
  <p className="guest-counts">{STATUS_IDS.map(id=><span key={id}><strong>{counts[id]}</strong> {WORD[id].toLowerCase()}</span>)}<span><strong>{counts.none}</strong> not yet answered</span></p>
  {!inv.published&&<p className="callout">{parent?'The invitation is not out yet. Write it and publish it under Invitation.':'The invitation is not out yet.'}</p>}
  <MyAnswer state={state} user={user} mutate={mutate} busy={busy} name={user.name} heading="Your answer"/>
  {parent&&<>
   <div className="row wrap"><button type="button" onClick={()=>go('invitation')}><ExternalLink size={16}/>The invitation and its link</button><button type="button" onClick={()=>download('guests.csv',guestsCsv(state),'text/csv;charset=utf-8')}><Download size={16}/>Download the list</button></div>
   <p><strong>For the caterer:</strong> {summary.heads.adults} adult{summary.heads.adults===1?'':'s'} and {summary.heads.children} child{summary.heads.children===1?'':'ren'} in, counting plus-ones.</p>
   {summary.dietary.length>0&&<details className="party-panel"><summary><Utensils size={17}/>What people can’t eat · {summary.dietary.length}</summary><ul>{summary.dietary.map(d=><li key={d.name}><strong>{d.name}</strong>: {d.text}</li>)}</ul></details>}
   <div className="segmented" role="group" aria-label="Show">{[['all','Everyone'],...STATUS_IDS.map(id=>[id,WORD[id]]),['none','No answer']].map(([id,label])=><button type="button" key={id} className={filter===id?'selected':''} onClick={()=>setFilter(id)}>{label}</button>)}</div>
   {shown.map(n=>{const r=rsvpOf(state,n),h=householdOf(state,n);return <div className="list-row guest-row" key={n}><span><strong>{n}</strong><small>{roleLabel(state,state.people?.[n]?.role)}{h?` · ${h}`:''}{r?.plusOne?` · +1 ${r.plusOne}`:''}{r?.children?` · ${r.children} child${r.children===1?'':'ren'}`:''}{r?.note?` · “${r.note}”`:''}{r?.answeredBy&&r.answeredBy!==n?` · answered by ${r.answeredBy}`:''}</small></span>
    <span className="guest-status">{STATUS_IDS.map(id=><button type="button" key={id} className={`chip${r?.status===id?' on':''}`} aria-pressed={r?.status===id} disabled={busy} onClick={()=>mutate({type:'rsvpSet',name:n,answer:{status:id}})}>{WORD[id]}</button>)}</span></div>;})}
   {shown.length===0&&<p>Nobody here yet.</p>}
   <details className="party-panel"><summary>Answer in full for someone</summary><label>Who<select value={who} onChange={e=>setWho(e.target.value)}><option value="">Choose…</option>{state.members.filter(n=>n!==user.name).map(n=><option key={n}>{n}</option>)}</select></label>{who&&<MyAnswer key={who} state={state} user={user} mutate={mutate} busy={busy} name={who} heading={`${who}’s answer`}/>}</details>
  </>}
  {!parent&&inv.showNames==='everyone'&&<details className="party-panel" open><summary><Users size={17}/>Who’s in</summary><p>{state.members.filter(n=>rsvpOf(state,n)?.status==='in').join(', ')||'Nobody has said yes yet.'}</p></details>}
 </>;
}
