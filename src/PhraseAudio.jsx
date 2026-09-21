import React,{useState,useRef,useEffect,useContext,createContext} from 'react';
import {upload} from '@vercel/blob/client';
import {Mic,Square,Play,Trash2,Check} from 'lucide-react';
import {claimPlayback,holdPlayback,releasePlayback} from './speech.js';
import {canRecord,recorderType} from './VoiceNotes.jsx';
// A phrase said out loud once, by someone in the family, and kept.
//
// An iPhone's ring switch silences the phone's own speaking voice and no web page can
// override it. It does not silence a recording. So a phrase that will not speak on a silent
// phone can still be heard — as long as somebody recorded it on a device where the speaking
// does work, which is exactly what an iPad is for.
export const PhraseAudio=createContext(null);
export const phraseClipUrl=id=>`/api/phrase-audio?phrase=${encodeURIComponent(id)}`;
const MAX_SECONDS=20;
const EXTENSION=type=>/mp4|aac/.test(type||'')?'m4a':/ogg/.test(type||'')?'ogg':'webm';
// Play the recording. This goes through the media session rather than the speech engine,
// which is the whole reason it exists, so it is worth holding the session while it runs.
export function ClipButton({clip,label='Hear it'}){
 const [playing,setPlaying]=useState(false),audio=useRef(null);
 useEffect(()=>()=>{try{audio.current?.pause();}catch{}if(playing)releasePlayback();},[playing]);
 function toggle(){
  const el=audio.current||(audio.current=new Audio());
  if(playing){try{el.pause();}catch{}setPlaying(false);releasePlayback();return;}
  claimPlayback();holdPlayback();
  const stop=()=>{setPlaying(false);releasePlayback();};
  el.src=phraseClipUrl(clip.phraseId);
  el.onended=stop;el.onerror=stop;
  setPlaying(true);
  const started=el.play?.();
  if(started?.catch)started.catch(()=>stop());
 }
 return <button type="button" className="hear-it recorded" onClick={toggle}
  aria-label={playing?'Stop':`${label}, recorded by ${clip.by}`}>
  {playing?<><Square size={14}/>Stop</>:<><Play size={14}/>{label} · {clip.by}</>}</button>;
}
// Recording one phrase: hold the button, say it, keep it. Deliberately short — this is a
// reference pronunciation, not a voice note.
export function PhraseRecorder({phrase,onDone}){
 const audio=useContext(PhraseAudio);
 const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0);
 const [clip,setClip]=useState(null),[saving,setSaving]=useState(false);
 const recorder=useRef(null),chunks=useRef([]),began=useRef(0),timer=useRef(null);
 useEffect(()=>()=>{clearInterval(timer.current);recorder.current?.stream?.getTracks?.().forEach(t=>t.stop());},[]);
 useEffect(()=>()=>{if(clip?.url)URL.revokeObjectURL(clip.url);},[clip?.url]);
 if(!audio)return null;
 const {user,request,accept,notice,config,busy}=audio;
 async function start(){
  if(!canRecord())return notice('This device will not record from the browser. Try the iPad, or Safari on a phone.');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const type=recorderType();
   const rec=new MediaRecorder(stream,type?{mimeType:type}:undefined);
   chunks.current=[];began.current=Date.now();
   rec.ondataavailable=e=>{if(e.data?.size)chunks.current.push(e.data);};
   rec.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());clearInterval(timer.current);
    const length=Math.min(MAX_SECONDS,Math.max(1,Math.round((Date.now()-began.current)/1000)));
    const blob=new Blob(chunks.current,{type:rec.mimeType||type||'audio/webm'});
    setClip({blob,url:URL.createObjectURL(blob),seconds:length});setRecording(false);
   };
   rec.start();recorder.current=rec;setRecording(true);setSeconds(0);setClip(null);
   timer.current=setInterval(()=>{
    const elapsed=Math.round((Date.now()-began.current)/1000);setSeconds(elapsed);
    if(elapsed>=MAX_SECONDS)stop();
   },500);
  }catch(e){notice(e?.name==='NotAllowedError'
   ?'This device would not give the app the microphone. Allow microphone access for this site and try again.'
   :`The microphone could not be started: ${e.message||'unknown error'}`);}
 }
 function stop(){try{if(recorder.current?.state==='recording')recorder.current.stop();}catch{}clearInterval(timer.current);}
 async function keep(){
  if(!clip)return;
  if(!config?.uploads)return notice('Recording a phrase needs private file storage connected.');
  if(!navigator.onLine)return notice('Keeping a recording needs signal. Try again when you have some.');
  setSaving(true);
  try{
   const blob=await upload(`phrases/${user.id}/${crypto.randomUUID()}.${EXTENSION(clip.blob.type)}`,clip.blob,
    {access:'private',contentType:clip.blob.type,handleUploadUrl:'/api/upload'});
   accept(await request('phrase-audio',{phraseId:phrase.id,pathname:blob.pathname,seconds:clip.seconds}));
   URL.revokeObjectURL(clip.url);setClip(null);
   notice('Kept. Every phone will play this now, silent switch or not.');
   onDone?.();
  }catch(e){notice(e.message||'That recording could not be kept.');}
  finally{setSaving(false);}
 }
 return <div className="phrase-recorder">
  <p><small>Say it once, clearly. Everyone's phone will play this instead of trying to speak it.</small></p>
  <div className="row wrap">
   {!recording&&!clip&&<button type="button" className="primary" onClick={start}><Mic size={15}/> Record it</button>}
   {recording&&<button type="button" className="danger" onClick={stop}><Square size={14}/> Stop · {seconds}s</button>}
   {clip&&<>
    <audio src={clip.url} controls preload="metadata"/>
    <button type="button" className="primary" disabled={saving||busy} onClick={keep}><Check size={15}/> {saving?'Keeping…':'Keep it'}</button>
    <button type="button" disabled={saving} onClick={()=>{URL.revokeObjectURL(clip.url);setClip(null);}}>Again</button>
   </>}
   <button type="button" disabled={saving} onClick={()=>{stop();onDone?.();}}>Cancel</button>
  </div>
 </div>;
}
// The row of controls under a phrase: the recording if there is one, the option to make one
// if there is not, and whatever the phone can do on its own either way.
export function PhraseClipControls({phrase}){
 const audio=useContext(PhraseAudio);
 const [open,setOpen]=useState(false);
 if(!audio||!phrase?.id)return null;
 const {clips,user,request,accept,notice,busy}=audio;
 const clip=clips?.[phrase.id];
 const parent=user?.role==='parent';
 const remove=async()=>{
  if(!confirm('Remove this recording? The phone will go back to saying it itself.'))return;
  try{accept(await request('phrase-audio',{phraseId:phrase.id,remove:true}));}
  catch(e){notice(e.message||'That recording could not be removed.');}
 };
 return <>
  {clip&&<ClipButton clip={clip}/>}
  {parent&&!open&&<button type="button" className="hear-it quiet" onClick={()=>setOpen(true)}>
   <Mic size={13}/> {clip?'Record again':'Record it'}</button>}
  {parent&&clip&&!open&&<button type="button" className="hear-it quiet danger" disabled={busy}
   aria-label={`Remove the recording of ${phrase.en||'this phrase'}`} onClick={remove}><Trash2 size={13}/></button>}
  {open&&<PhraseRecorder phrase={phrase} onDone={()=>setOpen(false)}/>}
 </>;
}
