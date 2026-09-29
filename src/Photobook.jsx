import React,{useEffect} from 'react';
import {Printer} from 'lucide-react';
import {photobookPages} from './photobook-data.js';
const src=p=>p.kind==='photo'?`/api/photo?id=${encodeURIComponent(p.item.id)}`:`/api/document?id=${encodeURIComponent(p.item.id)}`;
// The photobook: a page per day on screen, and the same pages on paper — Print hides the rest
// of the app so only the book goes to the printer or into the PDF.
export default function Photobook({state,dayLabel}){
 const pages=photobookPages(state);
 useEffect(()=>{const after=()=>document.body.classList.remove('print-photobook');addEventListener('afterprint',after);return()=>{removeEventListener('afterprint',after);after();};},[]);
 const print=()=>{document.body.classList.add('print-photobook');setTimeout(()=>window.print(),50);};
 return <div className="photobook">
  <div className="photobook-intro"><p className="eyebrow">TO KEEP</p><h1>Our photobook</h1>
   <p>A page for each day: the photo of the day, the stops we loved and the diary. Print it, or choose Save as PDF, and send it to be printed.</p>
   <button type="button" className="primary" onClick={print}><Printer size={18}/>Print or save as PDF</button></div>
  <section className="pb-cover"><p>The Pasfield family</p><h2>{state.tripName||'Japan'}</h2><p>{dayLabel(pages[0]?.date,{day:'numeric',month:'long'})} – {dayLabel(pages.at(-1)?.date,{day:'numeric',month:'long',year:'numeric'})}</p></section>
  {pages.map(p=><section className="pb-page" key={p.date}>
   <header><span>Day {p.number}</span><h2>{p.title}</h2><small>{dayLabel(p.date,{weekday:'long',day:'numeric',month:'long'})} · {p.city}</small></header>
   {p.hero?<figure className="pb-hero"><img src={src(p.hero)} alt={`${p.title}, the day’s best photo`} loading="lazy"/>{p.winner&&<figcaption>Photo of the day</figcaption>}</figure>:<div className="pb-hero empty">No photos kept from this day</div>}
   {p.more.length>0&&<div className="pb-more">{p.more.map(m=><img key={m.item.id} src={src(m)} alt="" loading="lazy"/>)}</div>}
   <div className="pb-words">
    {p.best.length>0&&<ol>{p.best.map(b=><li key={b.id}>{b.title} <b>★ {b.average.toFixed(1)}</b></li>)}</ol>}
    {p.quote&&<blockquote>“{p.quote.text}” <cite>{p.quote.person}, {p.quote.title}</cite></blockquote>}
    {p.note&&<p className="pb-note">{p.note}</p>}
   </div>
  </section>)}
 </div>;
}
