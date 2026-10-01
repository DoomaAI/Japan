import React,{useState} from 'react';
import {Maximize2,SunMedium,ChevronRight} from 'lucide-react';
import DocumentThumb from './DocumentThumb.jsx';
import TicketViewer from './TicketViewer.jsx';
import {attachmentsOf,documentThumbnail} from './trip-features.js';
import {nextPasses} from './wallet-data.js';
import {codesFor} from './wallet-codes.js';
import GateCode from './GateCode.jsx';
import {shortDay as fmt} from './format.js';
const KIND={ticket:'Ticket',reservation:'Reservation',luggage:'Luggage tag',other:'Booking'};
// The next passes, the first one large: what it is for, when, the reference, and a button that
// opens it full screen for the gate, with a reminder to turn the brightness up for the scanner.
export default function NextPasses({state,date,selectStep,user,busy,mutate,notice}){
 const [view,setView]=useState(null),[gate,setGate]=useState(null);
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
     {/* The code drawn fresh when it has been read; the photo when it has not; and for a code
         that changes each time, which app to open instead. */}
     {doc.codeLive
      ?<small className="pass-live">Show this one in {doc.codeApp||'the operator’s app'}: its code changes each time.</small>
      :codesFor(state,doc).length
       ?<button type="button" className={i===0?'primary pass-open':'pass-open'} onClick={()=>setGate(doc)}><Maximize2 size={17}/>Show at the gate{codesFor(state,doc).length>1?` (${codesFor(state,doc).length})`:''}</button>
       :i===0&&picture&&<><button type="button" className="primary pass-open" onClick={()=>setView(picture)}><Maximize2 size={17}/>Show at the gate</button><small className="pass-hint"><SunMedium size={14}/>Turn the brightness up so the scanner can read it.</small></>}
    </div>
   </article>;})}
  {gate&&<GateCode state={state} doc={gate} onClose={()=>setGate(null)} onPhoto={file=>{setGate(null);if(file)setView(file);}} user={user} busy={busy} mutate={mutate} notice={notice}/>}
  {view&&<TicketViewer documents={state.documents} tickets={passes.map(p=>p.doc)} view={view} setView={setView}/>}
 </section>;
}
