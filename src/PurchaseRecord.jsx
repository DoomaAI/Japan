import React,{useState,useRef,useEffect} from 'react';
import {upload} from '@vercel/blob/client';
import {Camera,Video,Mic,Square,NotebookPen,Trash2,Play,Paperclip,X} from 'lucide-react';
import {receiptsFor} from './trip-features.js';
import {shrinkPhoto} from './MenuReader.jsx';
import {canRecord,recorderType} from './VoiceNotes.jsx';
import {japanDate} from './timing.js';
export const receiptUrl=r=>`/api/receipt?id=${encodeURIComponent(r.id)}`;
const MAX_SECONDS=300;
const clock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const safeName=name=>String(name||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-60);

// What got pinned to a purchase: a photo of the thing, a video of it working, the boy saying
// what it was, or a line written down. The point is that in three years they will remember the
// Gachapon and not the ¥400, so the ¥400 needs the picture attached to it.
export function ReceiptStrip({state,item,mine,busy,mutate}){
 const list=receiptsFor(state,item.id);
 if(!list.length)return null;
 return <div className="receipts">
  {list.map(r=><figure className={`receipt receipt-${r.kind}`} key={r.id}>
   {r.kind==='photo'&&<a href={receiptUrl(r)} target="_blank" rel="noreferrer">
    <img src={receiptUrl(r)} alt={r.caption||`Photo of ${item.title}`} loading="lazy"/></a>}
   {r.kind==='video'&&<video src={receiptUrl(r)} controls preload="metadata" playsInline/>}
   {r.kind==='voice'&&<audio src={receiptUrl(r)} controls preload="none"/>}
   {r.kind==='note'&&<blockquote>{r.text}</blockquote>}
   <figcaption>
    <span>{r.caption||{photo:'Photo',video:'Video',voice:`Voice note${r.seconds?` · ${clock(r.seconds)}`:''}`,note:'Note'}[r.kind]}</span>
    <small>{r.by}{r.at?` · ${japanDate(new Date(r.at))}`:''}{r.pending?' · Waiting to sync':''}</small>
    {mine&&!r.pending&&<button className="icon danger" aria-label={`Remove this ${r.kind}`} disabled={busy}
     onClick={()=>{if(confirm('Take this off the purchase?'))mutate({type:'spendReceiptRemove',id:r.id});}}><Trash2 size={14}/></button>}
   </figcaption>
  </figure>)}
 </div>;
}

// Adding one. A written note needs no upload, so it is the only kind that works standing in a
// shop with no signal — everything else waits for a bar of reception and says so plainly.
export function AddToPurchase({item,user,config,busy,setBusy,request,accept,mutate,notice}){
 const [open,setOpen]=useState(false),[working,setWorking]=useState('');
 const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[clip,setClip]=useState(null);
 const recorder=useRef(null),chunks=useRef([]),started=useRef(0),timer=useRef(null);
 const uploads=!!config?.uploads;
 useEffect(()=>()=>{clearInterval(timer.current);recorder.current?.stream?.getTracks?.().forEach(t=>t.stop());},[]);
 useEffect(()=>()=>{if(clip?.url)URL.revokeObjectURL(clip.url);},[clip?.url]);
 async function send(body,blob,contentType){
  const path=`receipts/${user.id}/${crypto.randomUUID()}-${body.name||'clip'}`;
  const put=await upload(path,blob,{access:'private',contentType,handleUploadUrl:'/api/upload'});
  accept(await request('receipt',{...body,pathname:put.pathname,itemId:item.id}));
 }
 async function addFile(file,kind){
  if(!file)return;
  if(!uploads)return notice('Photos and videos need private file storage connected.');
  if(!navigator.onLine)return notice('A photo or video needs signal. Write a note instead — that one works offline.');
  setBusy(true);setWorking(kind==='photo'?'Shrinking the photo…':'Sending the video up…');
  try{
   if(kind==='photo'){
    const shot=await shrinkPhoto(file,1600,0.75);
    await send({kind:'photo',name:'photo.jpg'},await (await fetch(shot.preview)).blob(),'image/jpeg');
   }else await send({kind:'video',name:safeName(file.name)},file,file.type);
   notice(kind==='photo'?'Photo pinned to the purchase.':'Video pinned to the purchase.');
   setOpen(false);
  }catch(e){notice(e.message||'That would not go up. Try again.');}
  finally{setBusy(false);setWorking('');}
 }
 async function startRecording(){
  if(!canRecord())return notice('This phone will not record from the browser. Write a note instead.');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const type=recorderType(),rec=new MediaRecorder(stream,type?{mimeType:type}:undefined);
   chunks.current=[];started.current=Date.now();
   rec.ondataavailable=e=>{if(e.data?.size)chunks.current.push(e.data);};
   rec.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());clearInterval(timer.current);
    const length=Math.min(MAX_SECONDS,Math.max(1,Math.round((Date.now()-started.current)/1000)));
    const blob=new Blob(chunks.current,{type:rec.mimeType||type||'audio/webm'});
    setClip({blob,url:URL.createObjectURL(blob),seconds:length});setRecording(false);
   };
   rec.start();recorder.current=rec;setRecording(true);setSeconds(0);setClip(null);
   timer.current=setInterval(()=>{
    const elapsed=Math.round((Date.now()-started.current)/1000);setSeconds(elapsed);
    if(elapsed>=MAX_SECONDS)stopRecording();
   },500);
  }catch(e){notice(e?.name==='NotAllowedError'
   ?'The phone would not give the app the microphone. Allow it for this site and try again.'
   :'The microphone could not be started.');}
 }
 function stopRecording(){try{if(recorder.current?.state==='recording')recorder.current.stop();}catch{}clearInterval(timer.current);}
 async function sendClip(){
  if(!uploads)return notice('Voice notes need private file storage connected.');
  if(!navigator.onLine)return notice('Sending a voice note needs signal. Write a note instead.');
  setBusy(true);setWorking('Sending it up…');
  try{
   await send({kind:'voice',seconds:clip.seconds,name:'note'},clip.blob,clip.blob.type);
   URL.revokeObjectURL(clip.url);setClip(null);setOpen(false);notice('Voice note pinned to the purchase.');
  }catch(e){notice(e.message||'That would not go up. Try again.');}
  finally{setBusy(false);setWorking('');}
 }
 async function addNote(e){
  e.preventDefault();const form=e.currentTarget,text=new FormData(form).get('text');
  if(!String(text||'').trim())return notice('Write something down first.');
  if(await mutate({type:'spendNote',itemId:item.id,text,by:user.name})){form.reset();setOpen(false);}
 }
 if(!open)return <button className="add-to-purchase" disabled={busy} onClick={()=>setOpen(true)}>
  <Paperclip size={15}/>Add a photo, video, voice note or note</button>;
 return <div className="purchase-add">
  <div className="section-heading">
   <p className="eyebrow">PIN SOMETHING TO {item.title.toUpperCase()}</p>
   <button className="icon" aria-label="Close" onClick={()=>setOpen(false)}><X size={16}/></button>
  </div>
  <div className="row wrap purchase-add-kinds">
   <label className={`button${!uploads||busy?' disabled':''}`}><Camera size={16}/>Photo
    <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
     disabled={!uploads||busy} onChange={e=>addFile(e.target.files[0],'photo')}/></label>
   <label className={`button${!uploads||busy?' disabled':''}`}><Video size={16}/>Video
    <input type="file" accept="video/mp4,video/quicktime,video/webm"
     disabled={!uploads||busy} onChange={e=>addFile(e.target.files[0],'video')}/></label>
   {recording
    ? <button className="danger" onClick={stopRecording}><Square size={16}/>Stop · {clock(seconds)}</button>
    : <button disabled={busy} onClick={startRecording}><Mic size={16}/>Record</button>}
  </div>
  {clip&&<div className="purchase-clip">
   <audio src={clip.url} controls/>
   <div className="row wrap">
    <button className="primary" disabled={busy} onClick={sendClip}><Play size={15}/>Keep it · {clock(clip.seconds)}</button>
    <button disabled={busy} onClick={()=>{URL.revokeObjectURL(clip.url);setClip(null);}}>Throw it away</button>
   </div>
  </div>}
  <form className="purchase-note" onSubmit={addNote}>
   <label><NotebookPen size={15}/> Or just write it down
    <textarea name="text" maxLength={2000} placeholder="Got the last blue one. The man in the shop let me pick it out of the box myself."/></label>
   <button className="primary" disabled={busy}>Save the note</button>
  </form>
  {working&&<p><small>{working}</small></p>}
  {!uploads&&<p className="callout"><span>Photos, videos and voice notes need private file storage connected. A written note works either way, signal or not.</span></p>}
 </div>;
}
