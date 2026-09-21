import React,{useState,useEffect,useRef,useMemo,useCallback} from 'react';
import {Trophy,RotateCcw,Lightbulb,Eye,Timer,Camera,WifiOff} from 'lucide-react';
import {photosFor,scoresFor} from './trip-features.js';
import {photoUrl} from './PhotoDay.jsx';
import {LEVELS,levelFor,hashSeed,workingSize,planRound,applyEdits,hitTest,hintFor,paneLayout,paneBox,spotScore,spotGame} from './spot-data.js';
// Spot the difference, out of the photos the boys took themselves. One of the two pictures has
// been quietly changed in a few places; tap wherever you see it, in either picture.
//
// Everything happens on the phone. The photo is already ours, the edits are painted here, and
// nothing about a round is sent anywhere. The same photo at the same level makes the same
// puzzle on every phone, so the two of them can race it properly.
// How much of the screen the pair of pictures may take, leaving the controls and the score
// visible without scrolling on a phone.
const HEIGHT_BUDGET=0.58;
function useViewport(){
 const [size,setSize]=useState(()=>({
  width:typeof window==='undefined'?360:window.innerWidth,
  height:typeof window==='undefined'?640:window.innerHeight
 }));
 useEffect(()=>{
  const measure=()=>setSize({width:window.innerWidth,height:window.innerHeight});
  measure();
  window.addEventListener('resize',measure);
  // Turning the phone fires this before the new size has settled on some phones, so measure
  // again on the next frame as well.
  const turned=()=>{measure();requestAnimationFrame(measure);};
  window.addEventListener('orientationchange',turned);
  return()=>{window.removeEventListener('resize',measure);window.removeEventListener('orientationchange',turned);};
 },[]);
 return size;
}
export default function SpotDifference({state,user,mutate,busy,online}){
 const photos=useMemo(()=>photosFor(state),[state.photos]);
 const [photoId,setPhotoId]=useState(()=>photos[0]?.id||'');
 const [levelId,setLevelId]=useState('normal');
 const [plan,setPlan]=useState(null),[status,setStatus]=useState('idle'),[problem,setProblem]=useState('');
 const [found,setFound]=useState([]),[misses,setMisses]=useState(0),[hints,setHints]=useState(0);
 const [miss,setMiss]=useState(null),[hint,setHint]=useState(null),[seconds,setSeconds]=useState(0);
 const [revealed,setRevealed]=useState(false),[aspect,setAspect]=useState(1.5);
 const original=useRef(null),edited=useRef(null),saved=useRef(''),watcher=useRef(null),source=useRef(null);
 const [boardWidth,setBoardWidth]=useState(0);
 const viewport=useViewport();
 // The board measures itself rather than being guessed at, because a tap is turned into a
 // place on the photo and that only works if the box on screen is the size we think it is.
 const board=useCallback(node=>{
  watcher.current?.disconnect();watcher.current=null;
  if(!node)return;
  setBoardWidth(node.clientWidth);
  if(typeof ResizeObserver==='undefined')return;
  watcher.current=new ResizeObserver(([entry])=>setBoardWidth(Math.round(entry.contentRect.width)));
  watcher.current.observe(node);
 },[]);
 useEffect(()=>()=>watcher.current?.disconnect(),[]);
 const photo=photos.find(p=>p.id===photoId)||photos[0]||null;
 const level=levelFor(levelId);
 const game=photo?spotGame(photo.id,level.count):'';
 const total=plan?.edits.length||0;
 const finished=!!total&&found.length>=total;
 // Whichever way round gives each picture more room. On a phone held upright that is one
 // above the other; turn it sideways and they go side by side, without being asked.
 const width=boardWidth||viewport.width-32,height=viewport.height*HEIGHT_BUDGET;
 const mode=paneLayout({width,height,aspect});
 const box=paneBox({width,height,aspect,mode});
 const reset=useCallback(()=>{
  setFound([]);setMisses(0);setHints(0);setMiss(null);setHint(null);setSeconds(0);setRevealed(false);
  saved.current='';
 },[]);
 // Work the round out: measure the photo and choose the places worth changing. The painting
 // is a second step, below, because the two canvases do not exist until this has decided
 // there is a round to show and React has put them on the screen.
 useEffect(()=>{
  if(!photo)return;
  let cancelled=false;
  setStatus('loading');setProblem('');setPlan(null);reset();
  const image=new Image();
  image.decoding='async';
  image.onload=()=>{
   if(cancelled)return;
   try{
    const size=workingSize(image.naturalWidth,image.naturalHeight);
    if(!size.width)throw new Error('That photo came back empty.');
    const base=document.createElement('canvas');
    base.width=size.width;base.height=size.height;
    const baseCtx=base.getContext('2d',{willReadFrequently:true});
    baseCtx.drawImage(image,0,0,size.width,size.height);
    const shape=size.width/size.height;
    const round=planRound(baseCtx.getImageData(0,0,size.width,size.height),
     {level,seed:hashSeed(`${photo.id}:${level.id}`),aspect:shape});
    if(cancelled)return;
    setAspect(shape);
    if(round.tooPlain){
     setStatus('plain');
     setProblem(`There is not enough going on in that photo to hide ${level.count} changes fairly. Try another one, or fewer to find.`);
     return;
    }
    source.current={canvas:base,...size};
    setPlan(round);setStatus('playing');
   }catch(e){setStatus('error');setProblem(e.message||'That photo could not be opened.');}
  };
  image.onerror=()=>{if(!cancelled){setStatus('error');
   setProblem(online?'That photo would not load. It may have been removed.':'The photo has to come down once before this can be played.');}};
  image.src=photoUrl(photo);
  return()=>{cancelled=true;image.onload=null;image.onerror=null;};
 },[photoId,levelId,photos.length]);
 // Paint the pair, once the round exists and both canvases are on the screen. The photo goes
 // into both; the changes go into one of them.
 useEffect(()=>{
  const base=source.current;
  if(!plan||!base||!original.current||!edited.current)return;
  for(const canvas of [original.current,edited.current]){
   canvas.width=base.width;canvas.height=base.height;
   canvas.getContext('2d').drawImage(base.canvas,0,0);
  }
  applyEdits(edited.current.getContext('2d'),base.canvas,plan.edits,{width:base.width,height:base.height,
   makeCanvas:(w,h)=>{const tile=document.createElement('canvas');tile.width=w;tile.height=h;return tile;}});
 },[plan]);
 // The clock only runs while there is something left to find.
 useEffect(()=>{
  if(status!=='playing'||finished||revealed)return;
  const tick=setInterval(()=>setSeconds(s=>s+1),1000);
  return()=>clearInterval(tick);
 },[status,finished,revealed]);
 const score=spotScore({found:found.length,total,misses,hints,seconds});
 // Saved once, when the round is finished honestly. A round that was given away is not one.
 useEffect(()=>{
  if(!finished||revealed||!game||saved.current===game)return;
  saved.current=game;
  if(score>0)mutate({type:'gameScore',person:user.name,game,score});
 },[finished,revealed,game,score]);
 function tap(e){
  if(status!=='playing'||finished||revealed)return;
  const rect=e.currentTarget.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const point={x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height};
  const hit=hitTest(plan.edits,point,{found});
  if(hit&&!hit.already){setFound(f=>[...f,hit.id]);setMiss(null);setHint(null);return;}
  // Tapping one you have already found is not a mistake, so it costs nothing.
  if(hit)return;
  setMisses(m=>m+1);setMiss({...point,at:Date.now()});
 }
 function askHint(){
  const next=hintFor(plan?.edits||[],found);
  if(!next)return;
  setHints(h=>h+1);setHint(next.id);
  setTimeout(()=>setHint(h=>h===next.id?null:h),2500);
 }
 const marks=plan?plan.edits.filter(e=>found.includes(e.id)||revealed||hint===e.id):[];
 const pane=ref=><div className="spot-pane" style={{width:box.width,height:box.height}}>
  <canvas ref={ref} onPointerDown={tap} aria-label="Tap anywhere you can see a difference"/>
  <div className="spot-marks" aria-hidden="true">
   {marks.map(e=>{
    // Found beats revealed beats hinted: once they are all showing, the one that was hinted
    // at is just another one they did not get.
    const kind=found.includes(e.id)?'got':revealed?'shown':'hint';
    // A hint circles the area rather than the thing, so it points without giving it away.
    const size=kind==='hint'?2.2:1.35;
    return <span key={e.id} className={`spot-mark ${kind}`}
     style={{left:`${(e.x+e.w/2)*100}%`,top:`${(e.y+e.h/2)*100}%`,
      width:`${e.w*size*100}%`,height:`${e.h*size*100}%`}}/>;
   })}
   {miss&&<span className="spot-miss" key={miss.at} style={{left:`${miss.x*100}%`,top:`${miss.y*100}%`}}>✕</span>}
  </div>
 </div>;
 if(!photos.length)return <>
  <p>This one is made out of our own photos: one of the two pictures is quietly changed in a few places, and you tap wherever you can see it.</p>
  <p className="callout"><Camera size={16}/> There are no photos yet. Take some under <strong>Photo of the day</strong> and they will show up here — the more you take, the more rounds there are.</p>
 </>;
 const others=scoresFor(state,game);
 return <>
  <p>One of these two pictures has been changed in {level.count} places. Tap each one you find, in either picture. Every photo is one of ours, and the same photo makes the same puzzle on everyone's phone — so it is a fair race.</p>
  <div className="form-row">
   <label>Photo<select value={photo?.id||''} disabled={status==='loading'} onChange={e=>setPhotoId(e.target.value)}>
    {photos.map(p=><option key={p.id} value={p.id}>{p.by} · {p.title||p.feedback?.title||p.day}</option>)}
   </select></label>
  </div>
  <div className="segmented game-picker">{LEVELS.map(l=>
   <button key={l.id} className={levelId===l.id?'selected':''} disabled={status==='loading'} onClick={()=>setLevelId(l.id)}>{l.label}</button>)}</div>
  {!online&&status==='error'&&<p className="callout"><WifiOff size={15}/> {problem}</p>}
  {status==='loading'&&<p className="game-status">Making the puzzle on this phone…</p>}
  {(status==='plain'||(status==='error'&&online))&&<p className="callout">{problem}</p>}
  {status==='playing'&&<>
   <div className={`spot-board ${mode}`} ref={board}>{pane(original)}{pane(edited)}</div>
   <p className="game-status">
    {finished?<><Trophy size={16}/> All {total} found in {seconds}s — {score} points.</>
     :revealed?`There they are. ${found.length} of ${total} were yours.`
     :<><Timer size={15}/> {found.length} of {total} found · {seconds}s{misses?` · ${misses} wrong`:''}</>}
   </p>
   <div className="row wrap">
    <button type="button" className="primary" onClick={reset}><RotateCcw size={16}/> Start again</button>
    <button type="button" disabled={finished||revealed} onClick={askHint}><Lightbulb size={16}/> Hint{hints?` (${hints})`:''}</button>
    <button type="button" disabled={finished||revealed} onClick={()=>setRevealed(true)}><Eye size={16}/> Show me</button>
   </div>
   {revealed&&<p><small>A revealed round is not scored — that is the point of it.</small></p>}
  </>}
  {!!Object.keys(others).length&&<p className="game-status"><Trophy size={15}/> Best on this photo: {Object.entries(others).sort((a,b)=>b[1]-a[1]).map(([n,s])=>`${n} ${s}`).join(' · ')}</p>}
 </>;
}
