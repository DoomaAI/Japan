import React,{useState} from 'react';
import {Languages, Trash2, AlertCircle} from 'lucide-react';
import SayIt from './SayIt.jsx';
// What a booking says, in the other language, without leaving the booking. A confirmation that
// arrived in Japanese is read into English; what we wrote in English is put into the Japanese to
// hold up at the counter. It is saved onto the ticket rather than shown once and lost, because
// the moment it is needed is at a gate with no signal — and because a translation is worth
// paying for once, not once per person who opens the ticket.
export const TICKET_FIELDS=[
 {key:'title',label:'Name'},
 {key:'reference',label:'Reference'},
 {key:'notes',label:'Notes'}];
export const translationKey=(field,direction)=>`${field}:${direction}`;
export const ticketTranslations=ticket=>Object.entries(ticket?.translations||{})
 .map(([key,value])=>({key,...value,field:value.field||key.split(':')[0],direction:value.direction||key.split(':')[1]}));
// A translation is of the words that were there when it was asked for. Edit the notes afterwards
// and it is still worth reading, but it is no longer the same booking, so it says so.
export const translationStale=(ticket,t)=>String(ticket?.[t.field]||'').trim()!==String(t.source||'').trim();

export default function TicketTranslate({ticket,user,config,busy,setBusy,request,accept,notice}){
 const [open,setOpen]=useState(false),[working,setWorking]=useState('');
 const parent=user.role==='parent';
 const held=ticketTranslations(ticket);
 const fields=TICKET_FIELDS.filter(f=>String(ticket[f.key]||'').trim());
 async function run(field,direction){
  setBusy(true);setWorking(translationKey(field,direction));
  try{accept(await request('ticket-translate',{id:ticket.id,field,direction}));}
  catch(e){notice(e.message||'The translation did not come back. What the booking says is still here.');}
  finally{setBusy(false);setWorking('');}
 }
 async function drop(field,direction){
  setBusy(true);
  try{accept(await request('ticket-translate',{id:ticket.id,field,direction,remove:true}));}
  catch(e){notice(e.message||'That translation could not be removed.');}
  finally{setBusy(false);}
 }
 if(!held.length&&(!parent||!fields.length))return null;
 return <div className="ticket-translate">
  {held.map(t=>{
   const label=TICKET_FIELDS.find(f=>f.key===t.field)?.label||t.field;
   return <div className={`ticket-translation ${t.direction}`} key={t.key}>
    <p className="eyebrow">{label} · {t.direction==='ja'?'In Japanese, to show someone':`In English${t.language?` · from ${t.language}`:''}`}</p>
    {t.direction==='ja'
     ?<SayIt phrase={{ja:t.ja,en:t.literal,say:t.say,romaji:t.romaji}}/>
     :<pre className="document-text">{t.english}</pre>}
    {t.note&&<p className="callout"><AlertCircle size={16}/>{t.note}</p>}
    {translationStale(ticket,t)&&<p className="callout"><AlertCircle size={16}/>The {label.toLowerCase()} has been edited since this was translated. Translate it again before showing it to anyone.</p>}
    <small>Translated by {t.by}{t.at?` · ${t.at.slice(0,10)}`:''}. A translation can be wrong; check anything that costs money or has a deadline against the booking itself.</small>
    {parent&&<div className="row wrap">
     <button type="button" disabled={busy} onClick={()=>run(t.field,t.direction)}>{working===t.key?'Translating…':'Translate again'}</button>
     <button type="button" className="danger" disabled={busy} onClick={()=>drop(t.field,t.direction)}><Trash2 size={15}/>Remove translation</button>
    </div>}
   </div>;
  })}
  {parent&&!!fields.length&&<details open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
   <summary><Languages size={15}/> Translate what this booking says</summary>
   {!config?.translator
    ?<p className="callout">Translating a booking needs an Anthropic API key on the deployment. Everything else on this ticket works without one.</p>
    :<><p>Only what is written on this booking is sent. The answer is kept here, so it still reads with no signal.</p>
     {fields.map(f=><div className="translate-row" key={f.key}>
      <strong>{f.label}</strong>
      <div className="row wrap">
       <button type="button" disabled={busy} onClick={()=>run(f.key,'en')}>{working===translationKey(f.key,'en')?'Reading…':'Into English'}</button>
       <button type="button" disabled={busy} onClick={()=>run(f.key,'ja')}>{working===translationKey(f.key,'ja')?'Translating…':'Into Japanese'}</button>
      </div>
     </div>)}</>}
  </details>}
 </div>;
}
