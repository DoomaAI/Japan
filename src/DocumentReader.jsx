import React,{useState} from 'react';
import {FileText,Copy,Check,AlertCircle,Clock} from 'lucide-react';
import {shrinkPhoto} from './MenuReader.jsx';
const readAsBase64=file=>new Promise((resolve,reject)=>{
 const reader=new FileReader();
 reader.onload=()=>resolve(String(reader.result));
 reader.onerror=()=>reject(new Error('That file could not be opened.'));
 reader.readAsDataURL(file);
});
// A letter from a hotel, a form from a school, a notice on a door. Photograph it or pick the
// PDF, and get it back in English with the parts that matter pulled out.
export default function DocumentReader({config,busy,setBusy,request,notice,mutate}){
 const [result,setResult]=useState(null),[name,setName]=useState(''),[note,setNote]=useState('');
 const [working,setWorking]=useState(''),[copied,setCopied]=useState(false),[saved,setSaved]=useState(false);
 async function choose(file){
  if(!file)return;
  setResult(null);setCopied(false);setSaved(false);setName(file.name||'photo');
  setBusy(true);setWorking('Reading…');
  try{
   const pdf=file.type==='application/pdf';
   const data=pdf?await readAsBase64(file):await shrinkPhoto(file);
   const answer=await request('read-document',{file:data,mediaType:pdf?'application/pdf':'image/jpeg',note});
   if(!answer.readable)notice('That could not be read. Try a straighter, closer photo, or one page at a time.');
   setResult(answer);
  }catch(e){notice(e.message||'That document could not be read.');}
  finally{setBusy(false);setWorking('');}
 }
 async function keep(){
  if(!result)return;
  const body=[result.translation,'',...(result.summary||[]).map(s=>`• ${s}`),
   ...(result.actions||[]).map(a=>`• ${a.what}${a.when?` — ${a.when}`:''}`)].join('\n').slice(0,3900);
  if(await mutate({type:'documentNote',title:result.title||name||'Translated document',category:'other',
   notes:body,tags:['translated']}))setSaved(true);
 }
 const copy=async()=>{try{await navigator.clipboard.writeText(result.translation||'');setCopied(true);}catch{notice('This phone would not let the app copy. Select the text and copy it by hand.');}};
 return <section className="menu-reader document-reader">
  <h2><FileText size={18}/> Read a document</h2>
  <p>A letter from the hotel, a form, a notice, a receipt. Photograph it or choose a PDF and it comes back in English, with anything you have to do pulled out.</p>
  {!config?.documentReader
   ?<p className="callout">This needs an Anthropic API key on the deployment. Everything else on this page works without one.</p>
   :<>
    <label>Anything particular you want to know? (optional)
     <input value={note} maxLength={500} onChange={e=>setNote(e.target.value)} placeholder="Is there a deadline? What do we owe?"/></label>
    <div className="row wrap">
     <label className="menu-shoot button primary">Photograph it
      <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/></label>
     <label className="menu-shoot button">Choose a file or PDF
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/></label>
    </div>
    {working&&<p className="game-status"><Clock size={15}/> {working} A page takes a few seconds.</p>}
   </>}
  {result&&result.readable&&<div className="document-result">
   <p className="eyebrow">{result.kind||'Document'}{result.language?` · ${result.language}`:''}</p>
   <h3>{result.title||name}</h3>
   {!!result.summary?.length&&<ul className="document-summary">{result.summary.map((line,i)=><li key={i}>{line}</li>)}</ul>}
   {!!result.actions?.length&&<div className="document-actions">
    <strong>Things to do</strong>
    {result.actions.map((a,i)=><p key={i}><AlertCircle size={14}/> {a.what}{a.when?<b> · {a.when}</b>:''}</p>)}
   </div>}
   <details open><summary>The whole thing in English</summary>
    <pre className="document-text">{result.translation}</pre>
   </details>
   <div className="row wrap">
    <button type="button" onClick={copy}>{copied?<><Check size={15}/> Copied</>:<><Copy size={15}/> Copy the English</>}</button>
    <button type="button" className="primary" disabled={busy||saved} onClick={keep}>{saved?<><Check size={15}/> Kept under Tickets</>:'Keep this with our documents'}</button>
   </div>
   <small>A translation can be wrong, and a photograph can hide a line. Check anything that costs money or has a deadline against the original, and take the original with you.</small>
  </div>}
 </section>;
}
