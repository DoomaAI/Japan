import React,{useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Crown} from 'lucide-react';
import {recapStory} from './recap-story.js';
import {swipeDelta} from './swipe.js';
import {photoUrl} from './PhotoDay.jsx';
import {asAud} from './trip-features.js';
// The trip as a story: one card at a time, a bar along the top for how far through, a tap on
// the right or a swipe to go on. Built for the sofa at home, and readable as "so far" during.
function Card({c,dayLabel}){
 const short=d=>dayLabel(d,{day:'numeric',month:'short'});
 switch(c.kind){
  case 'title':return <><p className="eyebrow">{c.sofar?(c.dayNumber?`So far · day ${c.dayNumber} of ${c.days}`:'So far'):'Our trip'}</p><h2>{c.title}</h2><p className="recap-big">{c.days} days · {c.people} of us</p>{c.from&&<p>{short(c.from)} – {short(c.to)}</p>}</>;
  case 'numbers':return <><p className="eyebrow">By the numbers</p><ul className="recap-stats">{c.stats.map(([icon,n,label])=><li key={label}><span aria-hidden="true">{icon}</span><strong>{n.toLocaleString('en-AU')}</strong>{label}</li>)}</ul></>;
  case 'places':return <><p className="eyebrow">Where we went</p><ul className="recap-places">{c.places.map(p=><li key={p.city}><span aria-hidden="true">{p.icon}</span><strong>{p.city}</strong><small>{p.days} day{p.days===1?'':'s'}</small></li>)}</ul></>;
  case 'top':return <><p className="eyebrow">The best bits</p><h2>Our top {c.moments.length}</h2><ol className="recap-top">{c.moments.map(m=><li key={m.id}><strong>{m.title}</strong><small>{short(m.day)} · ★ {m.average.toFixed(1)}</small></li>)}</ol></>;
  case 'photos':return <><p className="eyebrow">Photo of the day</p><div className="recap-photos">{c.winners.map(w=><figure key={w.day}><img loading="lazy" src={photoUrl(w.photo)} alt={`Photo of the day, ${short(w.day)}`}/><figcaption>{short(w.day)}</figcaption></figure>)}</div></>;
  case 'food':return <><p className="eyebrow">What we ate</p><h2>{c.tried} foods tried</h2><ol className="recap-top">{c.best.map(f=><li key={f.id}><strong>{f.name}</strong><small>★ {f.average.toFixed(1)}</small></li>)}</ol></>;
  case 'person':return <><p className="eyebrow">{c.crowns?<><Crown size={14}/> {c.crowns} crown{c.crowns===1?'':'s'}</>:'Starring'}</p><h2>{c.person}</h2>{c.favourite&&<div className="recap-fav"><small>Favourite moment</small><strong>{c.favourite.title}</strong><span>★ {c.favourite.stars.toFixed(1)}</span>{c.favourite.thought&&<blockquote>“{c.favourite.thought}”</blockquote>}</div>}<ul className="recap-mini">{c.counts.map(x=><li key={x.label}><span aria-hidden="true">{x.icon}</span> {x.count} {x.label.toLowerCase()}</li>)}</ul></>;
  case 'predictions':return <><p className="eyebrow">Sealed before we flew</p><h2>What we predicted</h2><ul className="recap-predictions">{c.asked.slice(0,4).map(q=><li key={q.id}><small>{q.icon} {q.ask}</small>{q.answers.map(a=><span key={a.person}><b>{a.person}</b> {a.text}</span>)}</li>)}</ul></>;
  case 'money':return <><p className="eyebrow">What it cost</p><h2>¥{c.total.toLocaleString('en-AU')}</h2><p className="recap-big">{asAud(c.aud)}</p>{c.dailyAverage&&<p>About ¥{c.dailyAverage.toLocaleString('en-AU')} a day</p>}</>;
  default:return <><p className="eyebrow">{c.over?'The end':'To be continued'}</p><h2 lang="ja">またね</h2><p className="recap-big">{c.over?'Until next time, Japan.':'More to come tomorrow.'}</p></>;
 }
}
export default function RecapStory({state,user,today,dayLabel,go}){
 const cards=recapStory(state,{today,parent:user?.role==='parent'}),[at,setAt]=useState(0),start=useRef(null);
 const i=Math.min(at,cards.length-1),move=by=>setAt(n=>Math.max(0,Math.min(cards.length-1,n+by)));
 useEffect(()=>{const key=e=>{if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[cards.length]);
 const c=cards[i];
 return <div className="recap">
  <div className="recap-bars" aria-hidden="true">{cards.map((_,n)=><span key={n} className={n<=i?'on':''}/>)}</div>
  <section className={`recap-card recap-${c.kind}`} aria-live="polite" aria-label={`Card ${i+1} of ${cards.length}`}
   onPointerDown={e=>{start.current={x:e.clientX,y:e.clientY};}}
   onPointerUp={e=>{const d=swipeDelta(start.current,{x:e.clientX,y:e.clientY});start.current=null;if(d)move(d);else if(!e.target.closest('button,a')){const r=e.currentTarget.getBoundingClientRect();move(e.clientX-r.left<r.width/3?-1:1);}}}>
   <Card c={c} dayLabel={dayLabel}/>
  </section>
  <div className="recap-nav"><button type="button" aria-label="Back" disabled={i===0} onClick={()=>move(-1)}><ChevronLeft/></button><span>{i+1} / {cards.length}</span><button type="button" aria-label="Next" disabled={i===cards.length-1} onClick={()=>move(1)}><ChevronRight/></button></div>
  {i===cards.length-1&&<div className="row wrap recap-after"><button type="button" onClick={()=>setAt(0)}>Watch again</button><button type="button" onClick={()=>go('highlights')}>Trip highlights</button></div>}
 </div>;
}
