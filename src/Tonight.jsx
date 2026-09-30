import React from 'react';
import {Moon,Check,Mic,NotebookPen,AlarmClock} from 'lucide-react';
import {tonightShows,tonightFor} from './tonight-data.js';
import {Stars} from './StepReview.jsx';
import {photoUrl} from './PhotoDay.jsx';
// The Tonight widget: the day wrapped up in three taps, shown from five in the evening, and on
// any earlier day that still has something left to do.
export default function Tonight({state,user,day,today,clock,mutate,busy,openVoice,go}){
 if(!user||!tonightShows(day,today,clock))return null;
 const parent=user.role==='parent',t=tonightFor(state,day,user.name,parent);
 if(day<today&&t.complete)return null;
 const rate=(id,rating)=>mutate({type:'stepRating',id,person:user.name,rating});
 const vote=id=>mutate({type:'photoVote',day,person:user.name,id:t.vote===id?null:id});
 return <section className={`tonight${t.complete?' complete':''}`} aria-label="Tonight">
  <div className="tonight-head"><Moon size={18}/><div><p className="eyebrow">{day===today?'Tonight':'Still to wrap up'}</p><strong>{t.complete?'Day wrapped. Sleep well.':`${t.finished} of ${t.total} done`}</strong></div></div>
  {!t.tasks.rate&&<div className="tonight-part"><h3>Star the best bits</h3>{t.toRate.map(s=><div className="tonight-rate" key={s.id}><span>{s.title}</span><Stars value={0} size={22} disabled={busy} label={`Rate ${s.title}`} onPick={v=>rate(s.id,v)}/></div>)}</div>}
  {t.photos.length>0&&<div className="tonight-part"><h3>{t.vote?'Your photo of the day':'Vote for the photo of the day'}</h3><div className="tonight-photos">{t.photos.map(p=><button type="button" key={p.id} className={t.vote===p.id?'on':''} aria-pressed={t.vote===p.id} disabled={busy} onClick={()=>vote(p.id)}><img loading="lazy" src={photoUrl(p)} alt={p.feedback?.subject||'A photo from today'}/>{t.vote===p.id&&<Check size={18}/>}</button>)}</div></div>}
  {day===today&&go&&<div className="tonight-part"><button type="button" onClick={()=>go('nightstand')}><AlarmClock size={17}/>Put the phone on the nightstand</button></div>}
  {!t.tasks.memory&&<div className="tonight-part"><h3>Say something about today</h3><div className="row wrap"><button type="button" onClick={openVoice}><Mic size={17}/>Voice note</button>{parent&&<button type="button" onClick={()=>go('diary')}><NotebookPen size={17}/>Diary line</button>}</div></div>}
 </section>;
}
