import React,{useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
// The page a follower opens: no login, no menu, nothing to press but refresh. The days so far,
// newest first, each with its photos, the stops we did and what we said about them, and the
// diary. It asks again every few minutes, so a phone left open on it keeps up with the trip.
const fmt=(d,o={weekday:'long',day:'numeric',month:'long'})=>new Intl.DateTimeFormat('en-AU',{...o,timeZone:'Asia/Tokyo'}).format(new Date(d+'T12:00:00+09:00'));
export default function FollowAlong({followKey}){
 const [view,setView]=useState(null),[error,setError]=useState(''),[open,setOpen]=useState(null);
 const load=()=>fetch(`/api/follow?key=${encodeURIComponent(followKey)}`,{credentials:'omit'}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'This link is not working right now.');setView(b);setError('');}).catch(e=>setError(e.message||'No connection right now.'));
 useEffect(()=>{document.title='Following along · Japan 2026';load();const t=setInterval(load,5*60000);return()=>clearInterval(t);},[followKey]);
 const img=id=>`/api/follow-photo?key=${encodeURIComponent(followKey)}&id=${encodeURIComponent(id)}`;
 if(!view)return <main className="entry"><div className="brand-mark">日</div><h1>Following along</h1><p>{error||'Opening the trip…'}</p></main>;
 const latest=view.days[0];
 return <main className="follow">
  <header className="follow-head"><p className="eyebrow">Following along · the {view.members.length===4?'Pasfield family':'family'}</p><h1>{view.tripName}</h1>
   <p>{latest?`Day ${latest.number} of ${view.total} · ${latest.city}`:`Starts ${fmt(view.from,{day:'numeric',month:'long'})}`}</p>
   <button type="button" onClick={load}><RefreshCw size={16}/>Refresh</button>{error&&<p className="callout">{error}</p>}</header>
  {!view.days.length&&<p>Nothing to see yet. The first day will appear here once the trip starts.</p>}
  {view.days.map(d=>{const best=d.photos.find(p=>p.best)||d.photos[0];return <article className="follow-day" key={d.date}>
   <p className="eyebrow">Day {d.number} · {fmt(d.date)} · {d.city}</p><h2>{d.title}</h2>
   {best&&<button type="button" className="follow-hero" onClick={()=>setOpen(best.id)}><img src={img(best.id)} alt={`A photo by ${best.by}`} loading="lazy"/>{best.best&&<span>Photo of the day · {best.by}</span>}</button>}
   {d.photos.length>1&&<div className="follow-more">{d.photos.filter(p=>p!==best).map(p=><button type="button" key={p.id} onClick={()=>setOpen(p.id)}><img src={img(p.id)} alt={`A photo by ${p.by}`} loading="lazy"/></button>)}</div>}
   {d.diary&&<p className="follow-diary">{d.diary}</p>}
   {d.stops.length>0&&<ul className="follow-stops">{d.stops.map(s=><li key={s.id}><span>{s.title}</span>{s.stars&&<b>★ {s.stars.toFixed(1)}</b>}{s.said.map(x=><q key={x.person}>{x.text} <cite>{x.person}</cite></q>)}</li>)}</ul>}
   {d.noticed.length>0&&<ul className="follow-noticed">{d.noticed.map((n,i)=><li key={i}>“{n.text}” <cite>{n.by}</cite></li>)}</ul>}
  </article>;})}
  {open&&<div className="follow-view" role="dialog" aria-label="Photo" onClick={()=>setOpen(null)}><img src={img(open)} alt="A photo from the trip"/></div>}
  <footer className="follow-foot">A private link from the Pasfields. Please don’t pass it on.</footer>
 </main>;
}
