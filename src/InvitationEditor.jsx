import React,{useEffect,useState} from 'react';
import {Share2,Copy,ExternalLink,Plus,Trash2,Eye} from 'lucide-react';
import {invitationOf,QUESTION_KINDS,MAX_QUESTIONS,whenWhere} from './rsvp-data.js';
// The invitation as the organiser writes it: the words, the switches, the questions, and the
// link. Saved as one operation with only what changed, so two parents editing different fields
// on the same evening do not overwrite each other. The when and the where are read off the plan
// and shown here, not typed twice.
const Switch=({label,note,on,set})=><div className="setting-row"><span className="setting-text"><strong>{label}</strong>{note&&<small>{note}</small>}</span><button type="button" role="switch" aria-checked={on} aria-label={label} className={`setting-switch${on?' on':''}`} onClick={()=>set(!on)}><i aria-hidden="true"/><span>{on?'On':'Off'}</span></button></div>;
export default function InvitationEditor({state,mutate,busy,request,notice}){
 const saved=invitationOf(state),[inv,setInv]=useState(saved),[link,setLink]=useState(null),[linking,setLinking]=useState(false);
 useEffect(()=>{request('invite-link').then(r=>setLink(r.url)).catch(()=>{});},[]);
 const w=whenWhere(state),field=(k,v)=>setInv(i=>({...i,[k]:v}));
 const changed=Object.fromEntries(Object.entries(inv).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(saved[k])));
 const save=async()=>{if(Object.keys(changed).length)await mutate({type:'invitationEdit',patch:changed});};
 const publish=async on=>{await mutate({type:'invitationEdit',patch:{...changed,published:on}});setInv(i=>({...i,published:on}));};
 const question=(i,patch)=>field('questions',inv.questions.map((q,j)=>j===i?{...q,...patch}:q));
 const makeLink=async stop=>{setLinking(true);try{const r=await request('invite-link',stop?{stop:true}:{});setLink(r.url);notice(stop?'The invitation link is withdrawn. Anyone opening it now sees nothing.':'The invitation link is ready to send.');}catch(e){notice(e.message);}finally{setLinking(false);}};
 return <>
  <p className="eyebrow">THE INVITATION</p><h1>{state.plan?.title||'The plan'}</h1>
  <p className="callout">{w.date?<span>Guests will read: <strong>{w.title}</strong>{w.time?` at ${w.time}`:''} on {w.date}{w.place?`, ${w.place}`:''}{w.city?`, ${w.city}`:''}. That comes from the first fixed stop on the plan; change the stop to change it.</span>:'Add a day and a stop to the plan first: the invitation reads the when and the where from them.'}</p>
  <section className="settings-section">
   <h2>The words</h2>
   <label>From<input value={inv.hosts} maxLength={250} placeholder="Sam and Priya" onChange={e=>field('hosts',e.target.value)}/></label>
   <label>Message<textarea value={inv.message} maxLength={2000} placeholder="Come and celebrate with us…" onChange={e=>field('message',e.target.value)}/></label>
   <label>Dress<input value={inv.dress} maxLength={250} placeholder="Whatever you like" onChange={e=>field('dress',e.target.value)}/></label>
   <label>Bring<input value={inv.bring} maxLength={250} placeholder="A plate to share" onChange={e=>field('bring',e.target.value)}/></label>
   <label>Gifts<input value={inv.giftsNote} maxLength={250} placeholder="Your company is the present" onChange={e=>field('giftsNote',e.target.value)}/></label>
   <label>Reply by<input type="date" value={inv.rsvpBy||''} onChange={e=>field('rsvpBy',e.target.value||null)}/></label>
   <label>The stop the invitation is about<select value={inv.stepId||''} onChange={e=>field('stepId',e.target.value||null)}><option value="">The first fixed stop</option>{state.steps.filter(s=>s.day).map(s=><option key={s.id} value={s.id}>{s.day} · {s.time||'—'} · {s.title}</option>)}</select></label>
  </section>
  <section className="settings-section">
   <h2>What guests are asked</h2>
   <Switch label="Children welcome" note="Off, and the form says grown-ups only" on={inv.childrenWelcome} set={v=>field('childrenWelcome',v)}/>
   <Switch label="Plus-ones" note="Guests may name someone they are bringing" on={inv.plusOnes} set={v=>field('plusOnes',v)}/>
   <Switch label="Ask what they can’t eat" note="Goes to you, and to the caterer list" on={inv.askDietary} set={v=>field('askDietary',v)}/>
   <Switch label="Show who is in to everyone" note="Off, and guests see only a count" on={inv.showNames==='everyone'} set={v=>field('showNames',v?'everyone':'organiser')}/>
   {inv.questions.map((q,i)=><div className="option-card question-card" key={q.id}>
    <label>Question<input value={q.label} maxLength={120} onChange={e=>question(i,{label:e.target.value})}/></label>
    <label>Kind<select value={q.kind} onChange={e=>question(i,{kind:e.target.value})}>{QUESTION_KINDS.map(([id,l])=><option key={id} value={id}>{l}</option>)}</select></label>
    {q.kind==='choice'&&<label>Options, one per line<textarea value={q.options.join('\n')} onChange={e=>question(i,{options:e.target.value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,8)})}/></label>}
    <button type="button" className="danger" onClick={()=>field('questions',inv.questions.filter((_,j)=>j!==i))}><Trash2 size={15}/>Remove</button>
   </div>)}
   {inv.questions.length<MAX_QUESTIONS&&<button type="button" onClick={()=>field('questions',[...inv.questions,{id:`q${Date.now().toString(36)}`,label:'',kind:'text',options:[]}])}><Plus size={16}/>Add a question</button>}
  </section>
  <div className="row wrap"><button type="button" className="primary" disabled={busy||!Object.keys(changed).length} onClick={save}>Save the invitation</button></div>
  <section className="settings-section">
   <h2>Out, or not yet</h2>
   <Switch label="Save the date" note="The link shows the day and the place only, until the invitation is published" on={inv.saveTheDate} set={v=>field('saveTheDate',v)}/>
   <Switch label="Published" note={saved.published?'Guests at the link can read it and answer':'Guests at the link see nothing yet'} on={saved.published} set={publish}/>
  </section>
  <section className="settings-section">
   <h2>The link</h2>
   <p>One link for everyone, sent however you like. Whoever opens it reads the invitation and answers by name; a new name joins the plan as a guest. Withdraw it and the old link stops working; the next one made is a different link.</p>
   {link?<><textarea readOnly value={link}/><div className="row wrap"><button type="button" onClick={()=>navigator.clipboard.writeText(link).then(()=>notice('Invitation link copied.')).catch(()=>notice('Select and copy the link.'))}><Copy size={16}/>Copy</button><a className="button" href={link} target="_blank" rel="noreferrer"><Eye size={16}/>See it as a guest</a>{navigator.share&&<button type="button" onClick={()=>navigator.share({title:state.plan?.title,text:`You’re invited: ${state.plan?.title}`,url:link}).catch(()=>{})}><Share2 size={16}/>Send</button>}<button type="button" className="danger" disabled={linking} onClick={()=>{if(confirm('Withdraw the invitation link? Anyone opening it will see nothing, and the next link made is a different one.'))makeLink(true);}}>Withdraw</button></div></>
   :<button type="button" className="primary" disabled={linking} onClick={()=>makeLink(false)}><ExternalLink size={16}/>Make the invitation link</button>}
  </section>
 </>;
}
