import React,{useState,useRef,useEffect} from 'react';
import {upload} from '@vercel/blob/client';
import {Mic, Square, Trash2, Play} from 'lucide-react';
import {voiceNotesFor,voiceLength} from './trip-features.js';
export const voiceUrl=note=>`/api/voice?id=${encodeURIComponent(note.id)}`;
const MAX_SECONDS=300;
// Safari records mp4, everything else webm/opus. Ask for what the phone actually supports
// rather than assuming, because an unsupported type makes MediaRecorder throw.
export function recorderType(){
 if(typeof MediaRecorder==='undefined')return null;
 for(const type of ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/aac','audio/ogg'])
  if(MediaRecorder.isTypeSupported?.(type))return type;
 return '';
}
export const canRecord=()=>typeof navigator!=='undefined'&&!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined';
export default function VoiceNotes({state,user,day,step,config,busy,setBusy,request,accept,mutate,notice,dayLabel}){
 const initialDay=step?.day||day||state.days[0].date;
 const [noteDay,setNoteDay]=useState(initialDay),[stepId,setStepId]=useState(step?.id||'');
 const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0);
 const [clip,setClip]=useState(null),[label,setLabel]=useState(''),[uploaded,setUploaded]=useState(null),[progress,setProgress]=useState(0);
 const recorder=useRef(null),chunks=useRef([]),started=useRef(0),timer=useRef(null);
 const supported=canRecord();
 // Only that day's activities, because a list of every stop on the trip is unusable on a phone.
 const daySteps=state.steps.filter(s=>s.day===noteDay);
 useEffect(()=>()=>{clearInterval(timer.current);recorder.current?.stream?.getTracks?.().forEach(t=>t.stop());},[]);
 useEffect(()=>()=>{if(clip?.url)URL.revokeObjectURL(clip.url);},[clip?.url]);
 async function start(){
  if(!supported)return notice('This phone will not record from the browser. Use the voice recorder app and attach the file instead.');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const type=recorderType();
   const rec=new MediaRecorder(stream,type?{mimeType:type}:undefined);
   chunks.current=[];started.current=Date.now();
   rec.ondataavailable=e=>{if(e.data?.size)chunks.current.push(e.data);};
   rec.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());clearInterval(timer.current);
    const length=Math.min(MAX_SECONDS,Math.max(1,Math.round((Date.now()-started.current)/1000)));
    const blob=new Blob(chunks.current,{type:rec.mimeType||type||'audio/webm'});
    setClip({blob,url:URL.createObjectURL(blob),seconds:length});setRecording(false);
   };
   rec.start();recorder.current=rec;setRecording(true);setSeconds(0);setClip(null);setUploaded(null);
   timer.current=setInterval(()=>{
    const elapsed=Math.round((Date.now()-started.current)/1000);setSeconds(elapsed);
    if(elapsed>=MAX_SECONDS)stop();
   },500);
  }catch(e){notice(e?.name==='NotAllowedError'?'The phone would not give the app the microphone. Allow microphone access for this site and try again.':'The microphone could not be started: '+(e.message||'unknown error'));}
 }
 function stop(){try{recorder.current?.state==='recording'&&recorder.current.stop();}catch{}clearInterval(timer.current);}
 async function save(){
  if(!clip)return;
  if(!config?.uploads)return notice('Voice notes need private file storage connected.');
  if(!navigator.onLine)return notice('A voice note needs signal to save. Keep this screen open until you are back on.');
  setBusy(true);
  try{
   const blob=uploaded||await upload(`voice/${user.id}/${crypto.randomUUID()}.${(clip.blob.type.includes('mp4')||clip.blob.type.includes('aac'))?'m4a':'webm'}`,clip.blob,
    {access:'private',contentType:clip.blob.type.split(';')[0],handleUploadUrl:'/api/upload',onUploadProgress:p=>setProgress(p.percentage)});
   setUploaded(blob);
   accept(await request('voice',{pathname:blob.pathname,day:noteDay,stepId:stepId||null,seconds:clip.seconds,title:label}));
   URL.revokeObjectURL(clip.url);setClip(null);setLabel('');setUploaded(null);setProgress(0);
   notice('Voice note saved for the family.');
  }catch(e){notice((e.message||'The voice note did not save.')+' The recording is still here — try again.');}
  finally{setBusy(false);}
 }
 const notes=voiceNotesFor(state,step?{stepId:step.id}:day?{day}:{});
 const stepTitle=id=>state.steps.find(s=>s.id===id)?.title||'';
 return <>
  <p>Anyone can leave a voice note — during something, at the end of it, or at the end of the day. Everyone in the family can play it back on their own phone.</p>
  <div className="voice-recorder">
   <div className="form-row">
    <label>Day<select value={noteDay} onChange={e=>{setNoteDay(e.target.value);setStepId('');}} disabled={recording||!!clip}>
     {state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.title}</option>)}
    </select></label>
    <label>About<select value={stepId} onChange={e=>setStepId(e.target.value)} disabled={recording||!!clip}>
     <option value="">The day itself</option>
     {daySteps.map(s=><option key={s.id} value={s.id}>{s.time?`${s.time} · `:''}{s.title}</option>)}
    </select></label>
   </div>
   {!clip&&<div className="row wrap">
    {!recording
     ?<button type="button" className="primary" disabled={busy||!supported} onClick={start}><Mic size={16}/> Record</button>
     :<button type="button" className="danger" onClick={stop}><Square size={16}/> Stop · {voiceLength(seconds)}</button>}
    {recording&&<span className="recording-dot" aria-live="polite">Recording…</span>}
   </div>}
   {!supported&&<p className="callout">This browser will not record audio. On an iPhone use Safari, and allow the microphone when it asks.</p>}
   {recording&&<p><small>Up to five minutes; it stops itself at five.</small></p>}
   {clip&&<div className="voice-pending">
    <audio controls src={clip.url} preload="metadata"/>
    <label>Label (optional)<input value={label} maxLength={200} onChange={e=>setLabel(e.target.value)} placeholder="What Nate said about the deer"/></label>
    <div className="row wrap">
     <button type="button" className="primary" disabled={busy||!config?.uploads} onClick={save}>{busy?`Saving ${Math.round(progress)}%…`:uploaded?'Retry saving':`Save ${voiceLength(clip.seconds)} note`}</button>
     <button type="button" onClick={()=>{URL.revokeObjectURL(clip.url);setClip(null);setUploaded(null);}} disabled={busy}>Discard</button>
    </div>
    <small>The recording is held on this phone until you save it. It is not kept if the app is closed first.</small>
    {!config?.uploads&&<p className="callout">Voice notes become available when private file storage is connected.</p>}
   </div>}
  </div>
  <h3>{notes.length?`${notes.length} voice note${notes.length===1?'':'s'}`:'No voice notes yet'}</h3>
  {notes.map(v=><article className="voice-note" key={v.id}>
   <div className="voice-head"><strong>{v.by}</strong><small>{dayLabel(v.day)}{v.stepId?` · ${stepTitle(v.stepId)}`:''} · {voiceLength(v.seconds)}</small></div>
   {v.title&&<p>{v.title}</p>}
   <audio controls preload="none" src={voiceUrl(v)}/>
   {(user.role==='parent'||v.by===user.name)&&<div className="row wrap">
    <button className="danger" disabled={busy} onClick={()=>{if(confirm('Delete this voice note for everyone?'))mutate({type:'voiceNoteRemove',id:v.id});}}><Trash2 size={14}/> Delete</button>
   </div>}
  </article>)}
  {!notes.length&&<p><small><Play size={13}/> Recorded notes appear here, newest first, and on the day they belong to.</small></p>}
 </>;
}
