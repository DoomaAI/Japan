import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Play,Pause,Video,Square,Sparkles,Wand2,Trash2,ArrowUp,ArrowDown,Upload,Volume2,VolumeX} from 'lucide-react';
import {upload} from '@vercel/blob/client';
import {candidateShots,highlightsMaterial,currentEditList,cleanEditList,defaultEditList,timeline,runningTime,itemAt} from './highlights-data.js';
import {createMixer} from './sound-mix.js';
import {recordingType} from './flyover-data.js';
import {voiceUrl} from './api-urls.js';
// The trip highlights video. Claude chooses the moments and writes the captions (the edit list);
// this phone draws them on a tall canvas — a slow pan and zoom over each photo, the clips playing,
// a card at the start of each day — with the sound postcards under the shots they belong to, and
// records the canvas and the sound together into a video to share or keep.
const W=1080,H=1920,FADE=.45;
const mmss=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function cover(ctx,src,sw,sh,zoom,dx,dy){
 const scale=Math.max(W/sw,H/sh)*zoom,w=sw*scale,h=sh*scale;
 ctx.drawImage(src,(W-w)/2+dx*(w-W)/2,(H-h)/2+dy*(h-H)/2,w,h);
}
function wrap(ctx,text,width){
 const words=String(text||'').split(/\s+/),lines=[];let line='';
 for(const w of words){const next=line?`${line} ${w}`:w;if(ctx.measureText(next).width>width&&line){lines.push(line);line=w;}else line=next;}
 if(line)lines.push(line);return lines.slice(0,3);
}
export default function Highlights({state,user,config,request,accept,notice,busy}){
 const parent=user?.role==='parent';
 const material=useMemo(()=>highlightsMaterial(state),[state]);
 const shots=useMemo(()=>new Map(candidateShots(state).map(s=>[s.ref,s])),[state]);
 const saved=useMemo(()=>currentEditList(state),[state]);
 const [draft,setDraft]=useState(null),list=draft||saved,line=useMemo(()=>timeline(list),[list]);
 const total=line.at(-1)?.end||0;
 const canvas=useRef(null),media=useRef({}),clock=useRef({t:0,last:null}),mixer=useRef(null),rec=useRef(null),shown=useRef(-1);
 const [t,setT]=useState(0),[playing,setPlaying]=useState(false),[recording,setRecording]=useState(false),[sound,setSound]=useState(true);
 const [planning,setPlanning]=useState(false),[made,setMade]=useState(null),[saving,setSaving]=useState('');
 // Every picture and clip in the plan, loaded once from our own server so the canvas stays recordable.
 useEffect(()=>{
  for(const it of list.items)if(it.kind==='shot'&&!media.current[it.ref]){
   const s=shots.get(it.ref);if(!s)continue;
   if(s.kind==='video'){const v=document.createElement('video');v.src=s.url;v.preload='auto';v.playsInline=true;v.crossOrigin='anonymous';media.current[it.ref]=v;}
   else{const img=new Image();img.decoding='async';img.src=s.url;media.current[it.ref]=img;}
  }
 },[list,shots]);
 useEffect(()=>()=>{mixer.current?.close();Object.values(media.current).forEach(m=>m.pause?.());},[]);
 useEffect(()=>{mixer.current?.setMuted(!sound);},[sound]);
 function enter(index){
  const prev=line[shown.current],it=line[index];shown.current=index;
  if(prev?.kind==='shot')media.current[prev.ref]?.pause?.();
  if(!it)return;
  if(it.kind==='shot'){
   const m=media.current[it.ref];
   if(m?.tagName==='VIDEO'){mixer.current?.attach&&!m.dataset.mixed&&(m.dataset.mixed=mixer.current.attach(m,{volume:.7})?'1':'');m.currentTime=it.from||0;m.play().catch(()=>{});}
   if(it.sound)mixer.current?.play(voiceUrl({id:it.sound}));
  }
 }
 function draw(time){
  const c=canvas.current;if(!c)return;const ctx=c.getContext('2d');
  const {index,item,prev,into}=itemAt(line,time);
  if(index!==shown.current&&playing)enter(index);
  ctx.fillStyle='#1d2a2b';ctx.fillRect(0,0,W,H);
  const paint=(it,alpha)=>{if(!it)return;ctx.save();ctx.globalAlpha=alpha;
   if(it.kind==='title'){
    ctx.fillStyle='#f6efe2';ctx.fillRect(0,0,W,H);ctx.fillStyle='#1d2a2b';ctx.textAlign='center';
    ctx.font='600 104px Fraunces, Georgia, serif';wrap(ctx,it.text,W-160).forEach((l,i,a)=>ctx.fillText(l,W/2,H/2-((a.length-1)*60)+i*120));
    if(it.sub){ctx.fillStyle='#8a6d2f';ctx.font='500 52px system-ui, sans-serif';ctx.fillText(it.sub,W/2,H/2+170);}
   }else{
    const m=media.current[it.ref],p=Math.min(1,Math.max(0,(time-it.start)/(it.end-it.start))),even=line.indexOf(it)%2===0;
    if(m?.tagName==='VIDEO'&&m.videoWidth)cover(ctx,m,m.videoWidth,m.videoHeight,1,0,0);
    else if(m?.complete&&m.naturalWidth)cover(ctx,m,m.naturalWidth,m.naturalHeight,1.04+.1*(even?p:1-p),even?-.6+1.2*p:.6-1.2*p,.2-.4*p);
    if(it.caption){
     const g=ctx.createLinearGradient(0,H-560,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=g;ctx.fillRect(0,H-560,W,560);
     ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='600 64px system-ui, sans-serif';
     wrap(ctx,it.caption,W-160).forEach((l,i,a)=>ctx.fillText(l,80,H-140-(a.length-1-i)*78));
    }
   }
   ctx.restore();};
  const fading=prev&&into<FADE;
  if(fading)paint(prev,1);
  paint(item,fading?into/FADE:1);
 }
 useEffect(()=>{
  let raf;const c=clock.current;c.last=null;
  const step=now=>{
   if(playing){c.t=Math.min(total,c.t+(c.last==null?0:(now-c.last)/1000));c.last=now;
    if(c.t>=total){setPlaying(false);mixer.current?.stopAll();if(rec.current?.state==='recording')setTimeout(()=>rec.current?.stop(),400);}}
   draw(c.t);setT(c.t);raf=requestAnimationFrame(step);
  };
  raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);
 },[playing,line]);
 useEffect(()=>{if(!playing){mixer.current?.stopAll();Object.values(media.current).forEach(m=>m.pause?.());shown.current=-1;}},[playing]);
 function play(){mixer.current??=createMixer();mixer.current?.setMuted(!sound);if(clock.current.t>=total)clock.current.t=0;setPlaying(p=>!p);}
 function record(){
  const type=recordingType();
  if(!type||!canvas.current?.captureStream){notice?.('This browser cannot record the video. Safari on an iPhone can.');return;}
  mixer.current??=createMixer();mixer.current?.setMuted(false);setSound(true);
  const video=canvas.current.captureStream(30),stream=new MediaStream([...video.getVideoTracks(),...(mixer.current?.stream.getAudioTracks()||[])]);
  const chunks=[],r=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:8000000});
  r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  r.onstop=()=>{setRecording(false);setPlaying(false);
   const blob=new Blob(chunks,{type:type.split(';')[0]});
   setMade(new File([blob],`${state.tripName||'Japan'} highlights.${type.includes('mp4')?'mp4':'webm'}`,{type:blob.type}));};
  clock.current.t=0;shown.current=-1;rec.current=r;r.start(1000);setRecording(true);setPlaying(true);
 }
 async function share(){
  try{if(navigator.canShare?.({files:[made]}))await navigator.share({files:[made],title:`${state.tripName||'Our trip'}: the highlights`});
   else{const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(made),download:made.name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);notice?.('Saved to the phone.');}}
  catch(e){if(e?.name!=='AbortError')notice?.('The video could not be shared.');}
 }
 async function keep(){
  setSaving('Uploading…');
  try{const blob=await upload(`tickets/${user.id}/${crypto.randomUUID()}-highlights.${made.name.split('.').pop()}`,made,{access:'private',multipart:true,contentType:made.type,handleUploadUrl:'/api/upload',onUploadProgress:p=>setSaving(`Uploading · ${Math.round(p.percentage)}%`)});
   accept(await request('document',{pathname:blob.pathname,title:`${state.tripName||'Our trip'}: the highlights`,notes:'',tags:['highlights'],person:user.name,category:'memory',reference:''}));
   notice?.('In the family gallery for everyone.');setMade(null);}
  catch(e){notice?.(e.message||'The video could not be uploaded.');}finally{setSaving('');}
 }
 async function plan(body){
  setPlanning(true);
  try{accept(await request('highlights-plan',body));setDraft(null);clock.current.t=0;notice?.(body.auto?'The automatic plan is back.':body.list?'Saved for everyone.':'Planned. Have a look, then record it.');}
  catch(e){notice?.(e.message);}finally{setPlanning(false);}
 }
 const edit=fn=>{const items=[...list.items];fn(items);setDraft(cleanEditList({items,by:list.by},state)||list);clock.current.t=0;setPlaying(false);};
 if(!material.shots)return <div className="highlights"><p className="eyebrow">LOOKING BACK</p><h1>Highlights video</h1>
  <p className="empty">Nothing to make a video from yet. Photos of the day, the boys’ photos and the gallery all feed into it.</p></div>;
 return <div className="highlights">
  <p className="eyebrow">LOOKING BACK</p><h1>Highlights video</h1>
  <p>{material.shots} photos and clips over {material.days} days{material.sounds?`, and ${material.sounds} sound postcard${material.sounds===1?'':'s'}`:''}. {list.by==='claude'?'Chosen and captioned for us':'The best of each day, chosen automatically'}{state.highlights?.by?` · kept by ${state.highlights.by}`:''}.</p>
  <canvas ref={canvas} width={W} height={H} className="highlights-canvas" aria-label="The highlights video"/>
  <input type="range" min="0" max={Math.round(total*10)} value={Math.round(t*10)} aria-label="Where in the video" disabled={recording} onChange={e=>{clock.current.t=+e.target.value/10;setPlaying(false);}}/>
  <div className="row wrap highlights-controls">
   <button type="button" className="primary" disabled={recording} onClick={play}>{playing?<><Pause size={17}/>Pause</>:<><Play size={17}/>Play</>}</button>
   {recording?<button type="button" onClick={()=>rec.current?.stop()}><Square size={15}/>Stop recording</button>
    :<button type="button" onClick={record}><Video size={17}/>Record the video</button>}
   <button type="button" className="icon" aria-label={sound?'Sound off':'Sound on'} disabled={recording} onClick={()=>setSound(s=>!s)}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>
   <span>{mmss(t)} / {mmss(total)}</span>
  </div>
  <p><small>Recorded on this phone, in real time: keep the screen on until it finishes.</small></p>
  {made&&<div className="highlights-made">
   <strong>Your video is ready.</strong>
   <div className="row wrap"><button type="button" className="primary" onClick={share}>Share or save it</button>
    {parent&&<button type="button" disabled={!!saving} onClick={keep}><Upload size={16}/>{saving||'Put it in the family gallery'}</button>}</div>
  </div>}
  {parent&&<section className="highlights-plan">
   <h2>The plan</h2>
   <div className="row wrap">
    {config?.highlights&&<button type="button" className="primary" disabled={planning||busy} onClick={()=>plan({})}><Sparkles size={16}/>{planning?'Choosing…':'Choose the moments for us'}</button>}
    <button type="button" disabled={planning||busy} onClick={()=>plan({auto:true})}><Wand2 size={16}/>Automatic plan</button>
    {draft&&<button type="button" className="primary" disabled={planning} onClick={()=>plan({list:draft})}>Save these changes</button>}
    {draft&&<button type="button" onClick={()=>setDraft(null)}>Undo changes</button>}
   </div>
   <ol className="highlights-list">
    {list.items.map((it,i)=>{const s=it.kind==='shot'?shots.get(it.ref):null;
     return <li key={`${it.ref||it.text}-${i}`} className={it.kind}>
      {s?<img src={s.kind==='video'?undefined:s.url} alt="" loading="lazy"/>:<span className="highlights-card" aria-hidden="true">Aa</span>}
      <div>
       {it.kind==='title'?<strong>{it.text}{it.sub?` · ${it.sub}`:''}</strong>
        :<input aria-label="Caption" maxLength={90} defaultValue={it.caption} onBlur={e=>e.target.value!==it.caption&&edit(items=>{items[i]={...it,caption:e.target.value};})}/>}
       <small>{it.seconds}s{s?` · ${s.day}${s.kind==='video'?' · clip':''}`:''}{it.sound?' · 🔊 sound postcard':''}</small>
      </div>
      <div className="highlights-move">
       <button type="button" className="icon" aria-label="Earlier" disabled={!i} onClick={()=>edit(items=>{[items[i-1],items[i]]=[items[i],items[i-1]];})}><ArrowUp size={15}/></button>
       <button type="button" className="icon" aria-label="Later" disabled={i===list.items.length-1} onClick={()=>edit(items=>{[items[i+1],items[i]]=[items[i],items[i+1]];})}><ArrowDown size={15}/></button>
       <button type="button" className="icon" aria-label="Leave it out" onClick={()=>edit(items=>{items.splice(i,1);})}><Trash2 size={15}/></button>
      </div>
     </li>;})}
   </ol>
   <p><small>{list.items.filter(i=>i.kind==='shot').length} shots · about {mmss(runningTime(list))}. {defaultEditList(state).items.length?'':'Nothing to plan from yet.'}</small></p>
  </section>}
 </div>;
}
