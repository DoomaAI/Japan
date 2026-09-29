import React,{useState} from 'react';
import {Maximize2,SunMedium,ChevronRight} from 'lucide-react';
import DocumentThumb from './DocumentThumb.jsx';
import TicketViewer from './TicketViewer.jsx';
import {attachmentsOf,documentThumbnail} from './trip-features.js';
import {nextPasses} from './wallet-data.js';
const fmt=d=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(d+'T12:00:00+09:00'));
const KIND={ticket:'Ticket',reservation:'Reservation',luggage:'Luggage tag',other:'Booking'};
// The next passes, the first one large: what it is for, when, the reference, and a button that
// opens it full screen for the gate, with a reminder to turn the brightness up for the scanner.
export default function NextPasses({state,date,selectStep}){
 const [view,setView]=useState(null);
 const passes=nextPasses(state,date);
 if(!passes.length)return null;
 return <section className="wallet-next" aria-label="Up next">
  <p className="eyebrow">UP NEXT</p>
  {passes.map(({doc,step},i)=>{
   const files=attachmentsOf(state,doc),picture=documentThumbnail(doc,files);
   return <article className={`pass${i===0?' first':''}`} key={doc.id}>
    <DocumentThumb doc={doc} attachments={files} onView={setView}/>
    <div className="pass-body">
     <small>{KIND[doc.category||'ticket']} · {doc.person}</small>
     <strong>{doc.title}</strong>
     <button type="button" className="pass-step" onClick={()=>selectStep(step)}>{fmt(step.day)}{step.time?` · ${step.time}`:''} · {step.title}<ChevronRight size={14}/></button>
     {doc.reference&&<span className="pass-ref">Ref <b>{doc.reference}</b></span>}
     {i===0&&picture&&<button type="button" className="primary pass-open" onClick={()=>setView(picture)}><Maximize2 size={17}/>Show at the gate</button>}
     {i===0&&picture&&<small className="pass-hint"><SunMedium size={14}/>Turn the brightness up so the scanner can read it.</small>}
    </div>
   </article>;})}
  {view&&<TicketViewer documents={state.documents} tickets={passes.map(p=>p.doc)} view={view} setView={setView}/>}
 </section>;
}
