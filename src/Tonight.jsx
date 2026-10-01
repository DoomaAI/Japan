import React from 'react';
import {Moon,Check,Mic,NotebookPen,AlarmClock,Inbox,Plus} from 'lucide-react';
import {tonightShows,tonightFor,caughtUpAt} from './tonight-data.js';
import {capsuleWritable,capsuleFor} from './capsule-data.js';
import {Stars,DayRate} from './StepReview.jsx';
import {photoUrl} from './PhotoDay.jsx';
// The Tonight widget: the day wrapped up in three taps, shown from five in the evening, and on
// any earlier day that still has something left to do. A parent catches up first: each stop
// nobody ticked is either done after all, or goes back to Options to fit in another day.
export default function Tonight({state,user,day,today,clock,mutate,busy,openVoice,go,addStop,notice}){
 if(!user||!tonightShows(day,today,clock))return null;
 const parent=user.role==='parent',t=tonightFor(state,day,user.name,parent);
 if(day<today&&t.complete)return null;
 const rate=(id,rating)=>mutate({type:'stepRating',id,person:user.name,rating});
 const didIt=s=>mutate({type:'status',id:s.id,status:'done',at:caughtUpAt(s,day)});
 // A fixed time is unlocked on the way, since the booking it held has been missed either way.
 async function toOptions(s){
  if(s.locked&&!await mutate({type:'lock',id:s.id,locked:false}))return;
  if(await mutate({type:'backlog',id:s.id}))notice?.(`${s.title} is back in Options, with everything on it.`);
 }
 const vote=id=>mutate({type:'photoVote',day,person:user.name,id:t.vote===id?null:id});
 return <section className={`tonight${t.complete?' complete':''}`} aria-label="Tonight">
  <div className="tonight-head"><Moon size={18}/><div><p className="eyebrow">{day===today?'Tonight':'Still to wrap up'}</p><strong>{t.complete?'Day wrapped. Sleep well.':`${t.finished} of ${t.total} done`}</strong></div></div>
  {parent&&(t.open.length>0||addStop)&&<div className="tonight-part"><h3>{t.open.length?'Catch up on the day':'Anything we did that is not on the day?'}</h3>
   {t.open.map(s=><div className="tonight-catch" key={s.id}><span>{s.time&&<small>{s.time}</small>}{s.title}</span><div className="row"><button type="button" disabled={busy} aria-label={`We did ${s.title}`} onClick={()=>didIt(s)}><Check size={16}/>Did it</button><button type="button" disabled={busy} aria-label={`Save ${s.title} to Options`} onClick={()=>toOptions(s)}><Inbox size={16}/>To Options</button></div></div>)}
   {addStop&&<div className="row"><button type="button" disabled={busy} onClick={addStop}><Plus size={16}/>Add something we did</button></div>}</div>}
  {!t.tasks.rate&&<div className="tonight-part"><h3>Star the best bits</h3>{t.toRate.map(s=><div className="tonight-rate" key={s.id}><span>{s.title}</span><Stars value={0} size={22} disabled={busy} label={`Rate ${s.title}`} onPick={v=>rate(s.id,v)}/></div>)}</div>}
  <div className="tonight-part"><h3>How was the whole day?</h3><DayRate state={state} user={user} day={day} mutate={mutate} busy={busy} label="Your stars"/></div>
  {t.photos.length>0&&<div className="tonight-part"><h3>{t.vote?'Your photo of the day':'Vote for the photo of the day'}</h3><div className="tonight-photos">{t.photos.map(p=><button type="button" key={p.id} className={t.vote===p.id?'on':''} aria-pressed={t.vote===p.id} disabled={busy} onClick={()=>vote(p.id)}><img loading="lazy" src={photoUrl(p)} alt={p.feedback?.subject||'A photo from today'}/>{t.vote===p.id&&<Check size={18}/>}</button>)}</div></div>}
  {day===today&&go&&capsuleWritable(state,today)&&!capsuleFor(state,user.name)?.text&&<div className="tonight-part"><h3>A note to open next year</h3><button type="button" onClick={()=>go('capsule')}><NotebookPen size={17}/>Write yours</button></div>}
  {day===today&&go&&<div className="tonight-part"><button type="button" onClick={()=>go('nightstand')}><AlarmClock size={17}/>Put the phone on the nightstand</button></div>}
  {!t.tasks.memory&&<div className="tonight-part"><h3>Say something about today</h3><div className="row wrap"><button type="button" onClick={openVoice}><Mic size={17}/>Voice note</button>{parent&&<button type="button" onClick={()=>go('diary')}><NotebookPen size={17}/>Diary line</button>}</div></div>}
 </section>;
}
