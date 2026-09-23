import React,{useState} from 'react';
import {Languages,Trash2,AlertCircle} from 'lucide-react';
// A ticket's photo or PDF, read into English and kept on the file. The screenshot of a Japanese
// confirmation is the one thing on a ticket nobody can read, so this sits right beside it. A
// parent asks for it once; after that everyone who opens the ticket can read it, with no signal.
const READABLE=['image/jpeg','image/png','image/webp','application/pdf'];
const MAX_BYTES=3_300_000;
export const fileTranslatable=doc=>!!doc?.pathname&&READABLE.includes(doc.type)&&Number(doc.size||0)<=MAX_BYTES;

export default function FileTranslate({doc,user,config,busy,setBusy,request,accept,notice}){
 const [working,setWorking]=useState(false);
 const parent=user.role==='parent';
 const held=doc.fileTranslation;
 if(!doc.pathname||!READABLE.includes(doc.type))return null;
 if(!held&&!parent)return null;
 async function run(){
  setBusy(true);setWorking(true);
  try{accept(await request('file-translate',{id:doc.id}));}
  catch(e){notice(e.message||'The translation did not come back. The file itself is still here.');}
  finally{setBusy(false);setWorking(false);}
 }
 async function drop(){
  setBusy(true);
  try{accept(await request('file-translate',{id:doc.id,remove:true}));}
  catch(e){notice(e.message||'That translation could not be removed.');}
  finally{setBusy(false);}
 }
 if(!held){
  if(!config?.documentReader)return <small className="file-translate-off">Translating a file needs an Anthropic API key on the deployment.</small>;
  if(!fileTranslatable(doc))return <small className="file-translate-off">This file is too large to translate. A photo of the page that matters will work.</small>;
  return <div className="file-translate"><button type="button" disabled={busy} onClick={run}><Languages size={15}/>{working?'Translating… a page takes a few seconds':'Translate into English'}</button></div>;
 }
 return <div className="file-translate ticket-translation en">
  <details open>
   <summary><Languages size={15}/> In English{held.language?` · from ${held.language}`:''}</summary>
   {!!held.summary?.length&&<ul className="document-summary">{held.summary.map((line,i)=><li key={i}>{line}</li>)}</ul>}
   {!!held.actions?.length&&<div className="document-actions">
    <strong>Things to do</strong>
    {held.actions.map((a,i)=><p key={i}><AlertCircle size={14}/> {a.what}{a.when?<b> · {a.when}</b>:''}</p>)}
   </div>}
   <pre className="document-text">{held.translation}</pre>
   <small>Translated by {held.by}{held.at?` · ${held.at.slice(0,10)}`:''}. A translation can be wrong; check anything that costs money or has a deadline against the file itself.</small>
   {parent&&<div className="row wrap">
    <button type="button" disabled={busy} onClick={run}>{working?'Translating…':'Translate again'}</button>
    <button type="button" className="danger" disabled={busy} onClick={drop}><Trash2 size={15}/>Remove translation</button>
   </div>}
  </details>
 </div>;
}
