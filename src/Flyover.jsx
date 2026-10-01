import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Play,Pause,Video,X,Square} from 'lucide-react';
import {replayFrames,frameSound} from './memory-map.js';
import {createMixer,voiceUrl} from './sound-mix.js';
import {photoOfTheDay} from './trip-features.js';
import {flightPlan,cameraAt,offsetKm,project,recordingType,DAY_PAUSE} from './flyover-data.js';
const W=1080,H=1080,photoUrl=p=>`/api/photo?id=${encodeURIComponent(p.id)}`;
const dayLabel=d=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(`${d}T12:00:00+09:00`));
// The flyover, drawn frame by frame on a square canvas: the ground at a slant, the route drawn as
// the camera flies it, the stop names as it passes, and each day's photo of the day rising out of
// the ground as the day begins. Record turns the same drawing into a video on this phone.
export default function Flyover({state,close,notice}){
 const {frames}=useMemo(()=>replayFrames(state),[state]);
 const plan=useMemo(()=>flightPlan(frames),[frames]);
 const canvas=useRef(null),images=useRef({}),clock=useRef({t:0,last:null}),rec=useRef(null);
 const [playing,setPlaying]=useState(true),[recording,setRecording]=useState(false),[t,setT]=useState(0);
 // The sound postcards play as the camera passes the stop they were recorded at, and are recorded
 // into the video with the picture.
 const mixer=useRef(null),lastLeg=useRef(-1);
 useEffect(()=>()=>mixer.current?.close(),[]);
 useEffect(()=>{if(!playing)mixer.current?.stopAll();},[playing]);
 // Each day's photo of the day, loaded once from our own server so the canvas stays recordable.
 useEffect(()=>{for(const d of new Set(frames.map(f=>f.day))){const best=photoOfTheDay(state,d)?.winners?.[0];if(best&&!images.current[d]){const img=new Image();img.src=photoUrl(best);images.current[d]=img;}}},[frames]);
 useEffect(()=>{
  let raf;const tick=now=>{
   const c=clock.current;if(c.last!=null&&playing)c.t=Math.min(plan.duration,c.t+(now-c.last)/1000);c.last=now;
   draw(canvas.current,c.t);setT(c.t);
   const cam=cameraAt(plan,c.t);
   if(cam&&playing&&cam.index!==lastLeg.current){lastLeg.current=cam.index;const v=frameSound(state,cam.leg.to);if(v){mixer.current??=createMixer();mixer.current?.play(voiceUrl(v.id));}}
   if(c.t>=plan.duration&&rec.current?.state==='recording')rec.current.stop();
   raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[playing,plan]);
 function draw(cv,t){
  if(!cv)return;cv.width=W;cv.height=H;const ctx=cv.getContext('2d');
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#16383b');sky.addColorStop(.2,'#28665a');sky.addColorStop(.21,'#e9e2d0');sky.addColorStop(1,'#d6cdb4');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const cam=cameraAt(plan,t);if(!cam)return;
  const view={width:cam.width,w:W,h:H};
  // The ground's grid, so the slant reads as ground.
  ctx.strokeStyle='rgba(22,56,59,.12)';ctx.lineWidth=2;
  const step=cam.width/8;
  for(let k=-12;k<=12;k++){const a=project({x:k*step,y:-cam.width},view),b=project({x:k*step,y:cam.width*2},view);if(a&&b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
  // The route: flown so far bright, still to come faint.
  const pts=frames.map(f=>project(offsetKm(cam,f),view));
  const line=(from,to,style,width)=>{ctx.strokeStyle=style;ctx.lineWidth=width;ctx.lineJoin='round';ctx.beginPath();let on=false;for(let i=from;i<=to;i++){const p=pts[i];if(!p){on=false;continue;}if(on)ctx.lineTo(p.x,p.y);else{ctx.moveTo(p.x,p.y);on=true;}}ctx.stroke();};
  // Only today's route: the whole trip at once is a tangle of long lines across the ground.
  const dayStart=frames.findIndex(x=>x.day===cam.frame.day),dayEnd=frames.length-1-[...frames].reverse().findIndex(x=>x.day===cam.frame.day);
  line(Math.max(0,dayStart-1),dayEnd,'rgba(218,104,79,.3)',4);
  line(Math.max(0,dayStart-1),Math.min(cam.index,dayEnd),'#da684f',8);
  const here=project({x:0,y:0},view);
  if(here){ctx.fillStyle='#da684f';ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(here.x,here.y,16,0,Math.PI*2);ctx.fill();ctx.stroke();}
  // The day, and the stop just passed.
  const f=cam.frame;
  ctx.fillStyle='#fff';ctx.font="700 54px 'DM Sans',system-ui,sans-serif";ctx.fillText(`Day ${f.dayNumber} · ${f.city}`,60,100);
  ctx.globalAlpha=.85;ctx.font="400 34px 'DM Sans',system-ui,sans-serif";ctx.fillText(dayLabel(f.day),60,148);ctx.globalAlpha=1;
  ctx.fillStyle='#16383b';ctx.font="600 40px 'DM Sans',system-ui,sans-serif";
  const title=f.titles.at(-1)||'';ctx.fillText(title.length>40?title.slice(0,39)+'…':title,60,H-60);
  // The day's photo rises out of the ground as the day begins, holds, and settles away.
  const leg=cam.leg,img=images.current[f.day];
  if(leg.newDay&&img?.complete&&img.naturalWidth){
   const into=(t-leg.start)-(leg.end-leg.start-DAY_PAUSE),life=leg.end-leg.start;
   const rise=Math.min(1,Math.max(0,(t-leg.start)/0.8)),fade=Math.min(1,Math.max(0,(leg.end-t)/0.5));
   const size=380*rise,x=W-size-70,y=H*0.62-size*rise;
   if(size>4&&life>0){ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='#fff';ctx.fillRect(x-10,y-10,size+20,size+20);
    const s=Math.min(img.naturalWidth,img.naturalHeight);ctx.drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,x,y,size,size);ctx.restore();}
   void into;
  }
 }
 function record(){
  const type=recordingType();
  if(!type||!canvas.current?.captureStream){notice?.('This browser cannot record the flyover. Safari on an iPhone can.');return;}
  mixer.current??=createMixer();
  const video=canvas.current.captureStream(30),stream=new MediaStream([...video.getVideoTracks(),...(mixer.current?.stream.getAudioTracks()||[])]);
  const chunks=[],r=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:6000000});
  r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  r.onstop=async()=>{
   setRecording(false);
   const blob=new Blob(chunks,{type:type.split(';')[0]}),file=new File([blob],`Japan flyover.${type.includes('mp4')?'mp4':'webm'}`,{type:blob.type});
   try{if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Our Japan flyover'});
    else{const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:file.name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);notice?.('Saved to the phone.');}}
   catch(e){if(e?.name!=='AbortError')notice?.('The video could not be shared.');}
  };
  clock.current.t=0;lastLeg.current=-1;setPlaying(true);rec.current=r;r.start(1000);setRecording(true);
 }
 return <div className="replay flyover" role="dialog" aria-modal="true" aria-label="Flyover of the trip">
  <canvas ref={canvas} className="flyover-canvas" aria-label="The trip, flown over"/>
  <button type="button" className="replay-close icon" aria-label="Close the flyover" onClick={()=>{rec.current?.state==='recording'&&rec.current.stop();close();}}><X/></button>
  <div className="replay-card">
   {!frames.length?<p>Nothing to fly over yet. Tick off a stop and it will appear here.</p>:<>
    <input type="range" min="0" max={Math.round(plan.duration*10)} value={Math.round(t*10)} aria-label="Where in the flight" disabled={recording} onChange={e=>{clock.current.t=+e.target.value/10;setPlaying(false);}}/>
    <div className="row replay-controls">
     <button type="button" className="primary" disabled={recording} onClick={()=>{if(t>=plan.duration)clock.current.t=0;setPlaying(p=>!p);}}>{playing&&t<plan.duration?<><Pause size={17}/>Pause</>:<><Play size={17}/>Play</>}</button>
     {recording?<button type="button" onClick={()=>rec.current?.stop()}><Square size={15}/>Stop recording</button>
      :<button type="button" onClick={record}><Video size={17}/>Record a video</button>}
     <span>{Math.floor(t/60)}:{String(Math.floor(t%60)).padStart(2,'0')} / {Math.floor(plan.duration/60)}:{String(Math.floor(plan.duration%60)).padStart(2,'0')}</span>
    </div>
    <p><small>Recorded on this phone: nothing is uploaded. Keep the screen on until it finishes.</small></p>
   </>}
  </div>
 </div>;
}
