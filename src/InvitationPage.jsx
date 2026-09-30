import React,{useEffect,useState} from 'react';
import {CalendarDays,MapPin,Check} from 'lucide-react';
import {RSVP_STATUSES} from './rsvp-data.js';
// The page a guest opens from the invitation link: no login, nothing to install. What the hosts
// wrote, when and where, and the answer. The name typed here is the account: a new name joins the
// plan as a guest and this phone stays signed in as them; the same name again changes the answer.
const fmtWhen=(iso,zone,locale,opts)=>new Intl.DateTimeFormat(locale||'en-AU',{...opts,timeZone:zone}).format(new Date(iso));
const ics=(view)=>{const w=view.when,stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z'),esc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\;');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Plan//Invitation//EN','BEGIN:VEVENT',`UID:${encodeURIComponent(view.plan.title)}-${w.date}@plan`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(w.startsAt)}`,`DTEND:${stamp(w.endsAt)}`,`SUMMARY:${esc(view.plan.title)}`,`LOCATION:${esc(w.place)}`,`DESCRIPTION:${esc(view.message)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');};
export default function InvitationPage({inviteKey}){
 const [view,setView]=useState(null),[error,setError]=useState(''),[done,setDone]=useState(null),[busy,setBusy]=useState(false);
 const [name,setName]=useState(()=>{try{return localStorage.getItem('plan.rsvp.name')||'';}catch{return '';}});
 const [answer,setAnswer]=useState({status:'in',plusOne:'',children:0,dietary:'',note:'',answers:{}});
 const load=()=>fetch(`/api/invitation?key=${encodeURIComponent(inviteKey)}`).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'This link is not working right now.');setView(b);setError('');}).catch(e=>setError(e.message||'No connection right now.'));
 useEffect(()=>{load();},[inviteKey]);
 useEffect(()=>{if(view?.plan?.title)document.title=`${view.plan.title} · You’re invited`;},[view?.plan?.title]);
 const submit=async e=>{e.preventDefault();setBusy(true);setError('');
  try{const r=await fetch('/api/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:inviteKey,name:name.trim(),answer})});const b=await r.json();if(!r.ok)throw new Error(b.error||'That could not be saved.');
   try{localStorage.setItem('plan.rsvp.name',b.name);}catch{}setDone(b);setView(b.view);}
  catch(err){setError(err.message);}finally{setBusy(false);}};
 if(!view)return <main className="entry"><div className="brand-mark">✿</div><h1>You’re invited</h1><p>{error||'Opening the invitation…'}</p></main>;
 const {when,plan}=view,zone=plan.timeZone,locale=plan.locale;
 const calendar=()=>{const u=URL.createObjectURL(new Blob([ics(view)],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='invitation.ics';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
 return <main className="follow invite">
  <header className="follow-head"><p className="eyebrow">{view.saveTheDate?'Save the date':'You’re invited'}{view.hosts?` · from ${view.hosts}`:''}</p><h1>{plan.title}</h1>
   {when?.startsAt?<p className="invite-when"><CalendarDays size={18}/>{fmtWhen(when.startsAt,zone,locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {fmtWhen(when.startsAt,zone,locale,{hour:'numeric',minute:'2-digit'})}</p>:when?.date?<p className="invite-when"><CalendarDays size={18}/>{new Intl.DateTimeFormat(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(when.date+'T12:00:00Z'))}</p>:null}
   {when?.place&&<p className="invite-where"><MapPin size={18}/>{when.title&&when.title!==plan.title?`${when.title} · `:''}{when.place}{when.city?`, ${when.city}`:''}</p>}
  </header>
  {!view.published&&view.saveTheDate&&<p>The full invitation is on its way. Keep the day free.</p>}
  {!view.published&&!view.saveTheDate&&<p>The invitation is not out yet. Come back soon.</p>}
  {view.published&&<>
   {view.message&&<p className="invite-message">{view.message}</p>}
   <dl className="invite-details">
    {view.dress&&<><dt>Dress</dt><dd>{view.dress}</dd></>}
    {view.bring&&<><dt>Bring</dt><dd>{view.bring}</dd></>}
    <dt>Children</dt><dd>{view.childrenWelcome?'Welcome':'Grown-ups only this time'}</dd>
    {view.giftsNote&&<><dt>Gifts</dt><dd>{view.giftsNote}</dd></>}
    {view.rsvpBy&&<><dt>Reply by</dt><dd>{new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(view.rsvpBy+'T12:00:00Z'))}</dd></>}
    {view.coming>0&&<><dt>Coming</dt><dd>{view.coming}{view.names?`: ${view.names.join(', ')}`:''}</dd></>}
   </dl>
   <div className="row wrap">{when?.startsAt&&<button type="button" onClick={calendar}><CalendarDays size={16}/>Add to calendar</button>}{when?.place&&<a className="button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(when.place+(when.city?', '+when.city:''))}`} target="_blank" rel="noreferrer"><MapPin size={16}/>Directions</a>}</div>
   {done?<section className="invite-done"><h2><Check size={20}/>Thanks, {done.name}.</h2><p>{{in:'You’re in.',maybe:'You’re a maybe. Change it here any time before the reply date.',out:'Sorry you can’t make it.'}[answer.status]}</p>{done.joined&&<p>This phone is now signed in to the plan as {done.name}, so the day itself is one tap away.</p>}<div className="row wrap"><a className="button primary" href="/">Open the plan</a><button type="button" onClick={()=>setDone(null)}>Change my answer</button></div></section>
   :view.closed?<p className="callout">Answers closed on {view.rsvpBy}. Ask {view.hosts||'the organiser'} to change yours.</p>
   :<form className="invite-form" onSubmit={submit}>
    <h2>Your answer</h2>
    <label>Your name<input value={name} required autoComplete="name" maxLength={40} placeholder="As the hosts know you" onChange={e=>setName(e.target.value)}/></label>
    <div className="segmented" role="radiogroup" aria-label="Your answer">{RSVP_STATUSES.map(([id,label])=><button type="button" key={id} role="radio" aria-checked={answer.status===id} className={answer.status===id?'selected':''} onClick={()=>setAnswer(a=>({...a,status:id}))}>{label}</button>)}</div>
    {answer.status!=='out'&&<>
     {view.plusOnes&&<label>Bringing someone? Their name<input value={answer.plusOne} maxLength={40} onChange={e=>setAnswer(a=>({...a,plusOne:e.target.value}))}/></label>}
     {view.childrenWelcome&&<label>Children coming<input type="number" min={0} max={10} value={answer.children} onChange={e=>setAnswer(a=>({...a,children:Math.max(0,Math.min(10,Number(e.target.value)||0))}))}/></label>}
     {view.askDietary&&<label>Anything you can’t eat<input value={answer.dietary} maxLength={200} placeholder="Vegetarian, no nuts, halal…" onChange={e=>setAnswer(a=>({...a,dietary:e.target.value}))}/></label>}
     {view.questions.map(q=><label key={q.id}>{q.label}{q.kind==='text'&&<input value={answer.answers[q.id]||''} maxLength={200} onChange={e=>setAnswer(a=>({...a,answers:{...a.answers,[q.id]:e.target.value}}))}/>}
      {q.kind==='choice'&&<select value={answer.answers[q.id]||''} onChange={e=>setAnswer(a=>({...a,answers:{...a.answers,[q.id]:e.target.value}}))}><option value="">Choose…</option>{q.options.map(o=><option key={o}>{o}</option>)}</select>}
      {q.kind==='yesno'&&<select value={answer.answers[q.id]===true?'yes':answer.answers[q.id]===false?'no':''} onChange={e=>setAnswer(a=>({...a,answers:{...a.answers,[q.id]:e.target.value==='yes'?true:e.target.value==='no'?false:null}}))}><option value="">Choose…</option><option value="yes">Yes</option><option value="no">No</option></select>}</label>)}
    </>}
    <label>A note to {view.hosts||'the hosts'}<textarea value={answer.note} maxLength={500} onChange={e=>setAnswer(a=>({...a,note:e.target.value}))}/></label>
    {error&&<p className="callout">{error}</p>}
    <button className="primary" disabled={busy||name.trim().length<2}>{busy?'Sending…':'Send my answer'}</button>
    <p><small>Only your name and your answer are kept. Your note and what you can’t eat go to the hosts, nobody else.</small></p>
   </form>}
  </>}
  <footer className="follow-foot">A private invitation. Please don’t pass the link on.</footer>
 </main>;
}
