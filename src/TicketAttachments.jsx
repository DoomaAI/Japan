import React,{useState} from 'react';
import {upload} from '@vercel/blob/client';
import DocumentThumb from './DocumentThumb.jsx';

export default function TicketAttachments({ticket,attachments,members,user,enabled,busy,setBusy,request,accept,notice,onView,onEdit,onRemove,saveOffline}){
 const [pending,setPending]=useState([]),[progress,setProgress]=useState('');
 function choose(files){setPending(old=>[...old,...Array.from(files).map(file=>({id:crypto.randomUUID(),file,person:ticket.person||'Family',blob:null}))]);}
 async function save(){
  if(pending.some(p=>p.file.size>25*1024*1024)){notice('Each file must be under 25 MB.');return;}
  setBusy(true);
  try{
   for(const item of pending){
    setProgress(item.file.name);
    const blob=item.blob||await upload(`tickets/${user.id}/${item.id}-${item.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`,item.file,{access:'private',handleUploadUrl:'/api/upload'});
    setPending(old=>old.map(p=>p.id===item.id?{...p,blob}:p));
    const result=await request('document',{pathname:blob.pathname,title:item.file.name.slice(0,250),person:item.person,parentDocumentId:ticket.id});
    accept(result);setPending(old=>old.filter(p=>p.id!==item.id));
   }
   notice('Files added to this ticket for the family.');
  }catch(e){notice(`${e.message||'Upload failed.'} Saved files are kept; retry the remaining files.`);}
  finally{setBusy(false);setProgress('');}
 }
 return <div className="ticket-attachments">
  {!!attachments.length&&<><h3>Ticket photos & files</h3>{attachments.map(a=><div className="ticket-attachment" key={a.id}><div className="attachment-head"><DocumentThumb doc={a} onView={onView}/><button type="button" className="attachment-name" onClick={()=>onView(a)}><strong>{a.person}</strong><small>{a.title}</small></button></div><div className="row wrap"><button onClick={()=>saveOffline(`/api/document?id=${a.id}`,`doc-${a.id}`)}>Save offline</button>{user.role==='parent'&&<><button onClick={()=>onEdit(a)}>Edit person / tags</button><button className="danger" disabled={busy} onClick={()=>onRemove(a)}>Remove file</button></>}</div></div>)}</>}
  {user.role==='parent'&&<details><summary>Add photos / files to this ticket</summary><p>Select several images, then label each person. Everyone in the family can view them.</p><label>Choose photos or PDFs<input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" disabled={!enabled||busy} onChange={e=>{choose(e.target.files);e.target.value='';}}/></label><label>Take another photo<input type="file" accept="image/jpeg,image/png" capture="environment" disabled={!enabled||busy} onChange={e=>{choose(e.target.files);e.target.value='';}}/></label>{pending.map(p=><div key={p.id} className="attachment-pending"><small>{p.file.name}</small><label>For<select value={p.person} disabled={busy} onChange={e=>setPending(old=>old.map(x=>x.id===p.id?{...x,person:e.target.value}:x))}><option>Family</option>{members.map(n=><option key={n}>{n}</option>)}</select></label><button type="button" disabled={busy} onClick={()=>setPending(old=>old.filter(x=>x.id!==p.id))}>Remove selection</button></div>)}{!!pending.length&&<button className="primary" disabled={busy||!enabled} onClick={save}>{busy?`Uploading ${progress}…`:`Add ${pending.length} file(s) to ticket`}</button>}{!enabled&&<small>Connect private Blob storage to enable uploads.</small>}</details>}
 </div>;
}
