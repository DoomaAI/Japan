import React,{useState,useRef,useEffect,useMemo,useCallback} from 'react';
import {upload} from '@vercel/blob/client';
import {ArrowLeft,ArrowRight,Check,RotateCcw,Trophy,Hand,Camera,Undo2,Trash2,Share2,Eraser,PencilLine,Sparkles,Plus,Download,Play} from 'lucide-react';
import {SUBJECTS,CATEGORIES,subjectById,stepFrames,lineArt,pathOf,drawGame,PENS,NIBS,RINGS,CRESTS,BLADE_RANGE,TOP_TYPES,topSubject,normaliseDesign} from './draw-data.js';
import {swipeDelta,isControl,typesText,stepIndex} from './swipe.js';
import {scoresFor,bestScore,drawingsFor,drawingOwner} from './trip-features.js';
import {shrinkPhoto} from './MenuReader.jsx';
import {saveDrawing,listDrawings,dropDrawing,markShared,saveDesign,listDesigns,dropDesign} from './drawing-store.js';
const INK='#16383b',GHOST='#c8d4d2',GUIDE='#b9c6c4';
export const drawingUrl=drawing=>`/api/drawing?id=${encodeURIComponent(drawing.id)}`;
// One step of a drawing. Everything already on the page is drawn flat; the lines belonging to
// this step arrive along themselves, because being shown a line appear is the whole difference
// between a step-by-step and a picture of a finished drawing with instructions underneath.
// pathLength="1" lets one keyframe do it for any length of line, so a whisker and the outline
// of a head take the same time to draw and the steps keep a rhythm.
export function StepArt({frame,size}){
 const done=frame?.now?.length?frame.now:[];
 return <svg className="draw-art" viewBox="0 0 100 100" width={size} height={size} role="img"
  aria-label={frame?.say||'Drawing step'}>
  {(frame?.past||[]).map((shape,i)=><path key={`p${i}`} d={pathOf(shape)} fill="none"
   stroke={shape.guide?GUIDE:INK} strokeWidth={shape.guide?0.9:1.6}
   strokeDasharray={shape.guide?'3 3':undefined} strokeLinecap="round" strokeLinejoin="round"/>)}
  {done.map((shape,i)=><path key={`n${frame.index}-${i}`} className="draw-now" d={pathOf(shape)} fill="none"
   stroke={frame.guide?GUIDE:INK} strokeWidth={frame.guide?0.9:1.8} pathLength="1"
   strokeLinecap="round" strokeLinejoin="round" style={{animationDelay:`${i*0.45}s`}}/>)}
 </svg>;
}
// The finished line work, flat: what a tracing sits under and what a colouring-in goes inside.
const ArtLayer=({shapes,className,stroke=INK,width=1.7})=>
 <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
  {shapes.map((shape,i)=><path key={i} d={pathOf(shape)} fill="none" stroke={stroke} strokeWidth={width}
   strokeLinecap="round" strokeLinejoin="round"/>)}</svg>;
// The same lines again as a file, for saving: a canvas cannot draw a React element, and the
// drawing that gets kept has to have the lines in it or a colouring-in is a page of scribble.
const svgMarkup=(shapes,stroke,width)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1000" height="1000">${
 shapes.map(s=>`<path d="${pathOf(s)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
const loadSvg=markup=>new Promise((resolve,reject)=>{
 const image=new Image();
 image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('The lines could not be drawn into the picture.'));
 image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
});
// The pad. Strokes are kept as fractions of the pad rather than pixels, so turning the phone
// or opening the keyboard does not shear everything that has been drawn so far; undo is then
// nothing more than dropping the last one and drawing the rest again.
export function DrawPad({subject,under,pen,nib,erasing,strokes,setStrokes,padRef}){
 const canvas=useRef(null),drawing=useRef(null);
 const art=useMemo(()=>lineArt(subject),[subject?.id]);
 const paint=useCallback(()=>{
  const el=canvas.current;if(!el)return;
  const ctx=el.getContext('2d');
  ctx.clearRect(0,0,el.width,el.height);
  for(const stroke of strokes){
   ctx.globalCompositeOperation=stroke.erase?'destination-out':'source-over';
   ctx.strokeStyle=stroke.colour;ctx.lineWidth=stroke.width/100*el.width;
   ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
   stroke.points.forEach(([x,y],i)=>{const px=x*el.width,py=y*el.height;
    if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);});
   // A tap is a dot. Without this, touching the pad once and lifting draws nothing at all,
   // which reads as a broken pen rather than as a very short line.
   if(stroke.points.length===1)ctx.lineTo(stroke.points[0][0]*el.width+0.01,stroke.points[0][1]*el.height);
   ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';
 },[strokes]);
 // The backing store follows the pad's real size on the screen, at the phone's own pixel
 // density, or every line comes out soft.
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  const fit=()=>{
   const box=el.getBoundingClientRect(),ratio=Math.min(3,window.devicePixelRatio||1);
   const width=Math.max(1,Math.round(box.width*ratio)),height=Math.max(1,Math.round(box.height*ratio));
   if(el.width!==width||el.height!==height){el.width=width;el.height=height;}
   paint();
  };
  fit();
  window.addEventListener('resize',fit);
  return()=>window.removeEventListener('resize',fit);
 },[paint]);
 useEffect(()=>{paint();},[paint]);
 useEffect(()=>{if(padRef)padRef.current={canvas:canvas.current,art:under==='colour'?art:[]};},[padRef,under,art,strokes]);
 const at=event=>{
  const box=canvas.current.getBoundingClientRect();
  return [Math.min(1,Math.max(0,(event.clientX-box.left)/box.width)),Math.min(1,Math.max(0,(event.clientY-box.top)/box.height))];
 };
 const down=event=>{
  event.preventDefault();
  canvas.current.setPointerCapture?.(event.pointerId);
  drawing.current={colour:pen,width:nib.width,erase:erasing,points:[at(event)]};
  setStrokes(list=>[...list,drawing.current]);
 };
 const move=event=>{
  if(!drawing.current)return;
  drawing.current.points.push(at(event));
  setStrokes(list=>[...list.slice(0,-1),{...drawing.current}]);
 };
 const up=()=>{drawing.current=null;};
 return <div className="draw-pad">
  {under==='trace'&&<ArtLayer className="draw-under" shapes={art} stroke={GHOST} width={1.8}/>}
  <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}/>
  {under==='colour'&&<ArtLayer className="draw-over" shapes={art}/>}
 </div>;
}
// Building your own: four choices, a name, and it comes out of the same machine every other
// top comes out of, so it has proper steps of its own rather than being a picture to copy.
function Builder({design,setDesign,save,cancel}){
 const set=(key,value)=>setDesign(d=>({...d,[key]:value}));
 const preview=useMemo(()=>topSubject(design),[design]);
 return <section className="draw-builder">
  <div className="row wrap draw-head"><button type="button" onClick={cancel}><ArrowLeft size={15}/> Back</button>
   <strong>Build your own</strong></div>
  <StepArt frame={{index:'preview',past:preview.steps.filter(s=>!s.guide).flatMap(s=>s.shapes),now:[],say:`${design.name||'Your top'}, finished`}} size={200}/>
  <label>What is it called?<input value={design.name} maxLength={24} placeholder="Kaen Dragon" onChange={e=>set('name',e.target.value)}/></label>
  <p className="eyebrow">THE RING</p>
  <div className="segmented game-picker">{RINGS.map(r=>
   <button key={r.id} className={design.ring===r.id?'selected':''} onClick={()=>set('ring',r.id)}>{r.name}</button>)}</div>
  <p className="eyebrow">THE BEAST IN THE MIDDLE</p>
  <div className="segmented game-picker">{CRESTS.map(c=>
   <button key={c.id} className={design.crest===c.id?'selected':''} onClick={()=>set('crest',c.id)}>{c.icon} {c.name}</button>)}</div>
  <p className="eyebrow">TYPE</p>
  <div className="segmented game-picker">{TOP_TYPES.map(t=>
   <button key={t} className={design.type===t?'selected':''} onClick={()=>set('type',t)}>{t}</button>)}</div>
  <label>Blades: {design.blades}
   <input type="range" min={BLADE_RANGE.min} max={BLADE_RANGE.max} value={design.blades} onChange={e=>set('blades',Number(e.target.value))}/></label>
  <div className="draw-pens">{PENS.slice(0,10).map(colour=>
   <button key={colour} type="button" aria-label={`Colour ${colour}`} className={`draw-pen${design.colour===colour?' on':''}`}
    style={{background:colour}} onClick={()=>set('colour',colour)}/>)}</div>
  <div className="row wrap">
   <button type="button" className="primary" onClick={save}><Check size={16}/> Save it and start drawing</button>
  </div>
 </section>;
}
// Everything kept on this phone. A drawing is saved here first and sent to the family second,
// because the first one happens in a queue at a station with no signal.
function Kept({items,urls,online,uploads,share,remove,sending}){
 if(!items.length)return <p className="callout">Nothing kept yet. Finish one and it is saved on this phone.</p>;
 return <div className="draw-kept">{items.map(item=>
  <article key={item.id} className="draw-kept-card">
   {urls[item.id]?<img src={urls[item.id]} alt={`${item.title} by ${item.by}`}/>:<div className="draw-kept-blank"/>}
   <strong>{item.title}</strong>
   <small>{item.by} · {item.kind==='paper'?'on paper':'on the phone'}</small>
   <div className="row wrap">
    {item.shared?<small className="draw-shared"><Check size={13}/> With the family</small>
     :<button type="button" disabled={!online||!uploads||sending===item.id} onClick={()=>share(item)}>
      <Share2 size={13}/> {sending===item.id?'Sending…':!uploads?'Family sharing not set up':online?'Send to the family':'Waiting for signal'}</button>}
    <button type="button" className="danger" aria-label={`Delete ${item.title}`} onClick={()=>remove(item)}><Trash2 size={13}/></button>
   </div>
  </article>)}</div>;
}
const blankDesign=()=>normaliseDesign({name:'',ring:'flame',blades:5,crest:'dragon',type:'Attack',colour:PENS[1]});
export default function Drawing({state,user,mutate,busy,online,config,setBusy,request,accept,notice,day}){
 const [view,setView]=useState('pick');
 const [category,setCategory]=useState('top');
 const [id,setId]=useState('');
 const [mine,setMine]=useState([]);
 const [design,setDesign]=useState(blankDesign);
 const [at,setAt]=useState(0);
 const [mode,setMode]=useState('paper');
 const [under,setUnder]=useState('blank');
 const [pen,setPen]=useState(PENS[0]),[nib,setNib]=useState(NIBS[1]),[erasing,setErasing]=useState(false);
 const [strokes,setStrokes]=useState([]);
 const [kept,setKept]=useState([]),[urls,setUrls]=useState({}),[sending,setSending]=useState('');
 const [working,setWorking]=useState('');
 const touch=useRef(null),padRef=useRef(null),shown=useRef({});
 const subject=useMemo(()=>subjectById(id)||mine.find(m=>m.id===id)||null,[id,mine]);
 const frames=useMemo(()=>subject?stepFrames(subject):[],[subject]);
 const frame=frames[Math.min(at,Math.max(0,frames.length-1))];
 const move=delta=>setAt(i=>stepIndex(Math.min(i,frames.length-1),delta,frames.length));
 const subjectsOf=kind=>SUBJECTS.filter(s=>s.kind===kind);
 useEffect(()=>{listDesigns().then(list=>setMine(list.map(d=>topSubject(d))));},[]);
 useEffect(()=>{setAt(0);setStrokes([]);},[id]);
 useEffect(()=>{
  if(!subject)return;
  const onKey=e=>{if(typesText(e.target))return;
   if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1);};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[id,frames.length]);
 // Pictures are held as blobs; the browser needs a URL for each one and gives it back when it
 // is finished with, or a long session of drawing leaks every picture it has ever shown.
 const refresh=useCallback(async()=>{
  const list=await listDrawings();
  const next=Object.fromEntries(list.filter(d=>d.blob).map(d=>[d.id,URL.createObjectURL(d.blob)]));
  const old=shown.current;shown.current=next;
  setKept(list);setUrls(next);
  for(const url of Object.values(old))URL.revokeObjectURL(url);
 },[]);
 useEffect(()=>{refresh();},[refresh]);
 useEffect(()=>()=>{for(const url of Object.values(shown.current))URL.revokeObjectURL(url);},[]);
 async function send(item){
  if(!config?.uploads)return notice('Sending a drawing to the family needs private file storage connected. It is still saved on this phone.');
  if(!navigator.onLine)return notice('No signal. It stays on this phone and can be sent later.');
  setSending(item.id);setBusy?.(true);
  try{
   const blob=await upload(`art/${user.id}/${item.id}.png`,item.blob,
    {access:'private',contentType:item.blob.type||'image/png',handleUploadUrl:'/api/upload'});
   accept(await request('drawing',{pathname:blob.pathname,title:item.title,subject:item.subject,for:item.by,day,paper:item.kind==='paper'}));
   await markShared(item.id,blob.pathname);
   await refresh();
   notice(`${item.title} is with the family.`);
  }catch(e){notice(e.message||'That drawing could not be sent. It is still on this phone.');}
  finally{setSending('');setBusy?.(false);}
 }
 async function keep(blob,kind){
  const item={id:crypto.randomUUID(),at:new Date().toISOString(),subject:subject.id,title:subject.name,
   by:user.name,kind,blob,shared:false};
  const saved=await saveDrawing(item).catch(()=>null);
  if(saved)await refresh();
  else notice('This phone will not keep pictures, so this one is not kept here. It still goes to the family when there is signal.');
  if(bestScore(state,user.name,drawGame(subject.id))<1)
   mutate({type:'gameScore',person:user.name,game:drawGame(subject.id),score:1});
  if(navigator.onLine&&config?.uploads)await send(item);
  else if(saved)notice(`${subject.name} is saved on this phone${navigator.onLine?'':' — it goes to the family when there is signal'}.`);
 }
 // The drawing on the pad, flattened into one picture: white paper, then what was drawn, then
 // the printed lines back over the top if this was a colouring-in.
 async function keepPad(){
  const pad=padRef.current?.canvas;
  if(!pad)return;
  setBusy?.(true);setWorking('Saving it…');
  try{
   const out=document.createElement('canvas');
   out.width=1000;out.height=1000;
   const ctx=out.getContext('2d');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,out.width,out.height);
   ctx.drawImage(pad,0,0,out.width,out.height);
   if(under==='colour')ctx.drawImage(await loadSvg(svgMarkup(lineArt(subject),INK,1.7)),0,0,out.width,out.height);
   const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));
   if(!blob)throw new Error('This phone would not turn the drawing into a picture.');
   await keep(blob,'screen');
  }catch(e){notice(e.message||'That drawing could not be saved.');}
  finally{setBusy?.(false);setWorking('');}
 }
 // A drawing done on paper: photograph it. Shrunk on the phone like any other photo, so it
 // costs nothing to keep and nothing to send.
 async function keepPaper(file){
  if(!file)return;
  setBusy?.(true);setWorking('Having a look at it…');
  try{
   const shot=await shrinkPhoto(file,1400,0.8);
   const blob=await (await fetch(shot.preview)).blob();
   await keep(blob,'paper');
  }catch(e){notice(e.message||'That photo could not be kept.');}
  finally{setBusy?.(false);setWorking('');}
 }
 async function saveDesignAndDraw(){
  const clean=normaliseDesign({...design,id:`own-${crypto.randomUUID().slice(0,8)}`});
  await saveDesign(clean);
  const list=await listDesigns();
  setMine(list.map(d=>topSubject(d)));
  setDesign(blankDesign());
  setId(clean.id);setView('draw');setMode('paper');
 }
 const drawn=subject?scoresFor(state,drawGame(subject.id)):{};
 if(view==='kept'){
  const family=drawingsFor(state);
  return <>
   <div className="row wrap draw-head"><button type="button" onClick={()=>setView('pick')}><ArrowLeft size={15}/> All of them</button>
    <strong>What I have drawn</strong></div>
   <p className="eyebrow">ON THIS PHONE</p>
   <Kept items={kept} urls={urls} online={online} uploads={!!config?.uploads} sending={sending} share={send}
    remove={async item=>{if(confirm(`Delete ${item.title}?`)){await dropDrawing(item.id);await refresh();}}}/>
   <p><small>Everything is kept here whether there is signal or not. Sending one to the family puts it below as well; it stays on this phone either way.</small></p>
   <p className="eyebrow">EVERYBODY’S</p>
   {family.length?<div className="draw-kept">{family.map(item=>
    <article key={item.id} className="draw-kept-card">
     <img loading="lazy" src={drawingUrl(item)} alt={`${item.title} by ${drawingOwner(item)}`}/>
     <strong>{item.title}</strong>
     <small>{drawingOwner(item)}{item.paper?' · on paper':''}</small>
     {(user.role==='parent'||item.by===user.name||drawingOwner(item)===user.name)&&
      <button type="button" className="danger" disabled={busy} aria-label={`Remove ${item.title}`}
       onClick={()=>{if(confirm('Remove this drawing from the family gallery?'))mutate({type:'drawingRemove',id:item.id});}}><Trash2 size={13}/></button>}
    </article>)}</div>:<p className="callout">Nothing sent to the family yet.</p>}
  </>;
 }
 if(view==='build')return <Builder design={design} setDesign={setDesign} save={saveDesignAndDraw} cancel={()=>setView('pick')}/>;
 if(!subject)return <>
  <p>Pick something and it is drawn for you one line at a time — on paper, or side by side with the pad on this phone. Ghost lines to trace, or the drawing printed for colouring in.</p>
  <div className="segmented game-picker">{CATEGORIES.map(c=>
   <button key={c.id} className={category===c.id?'selected':''} onClick={()=>setCategory(c.id)}>{c.name}</button>)}
   <button className={category==='own'?'selected':''} onClick={()=>setCategory('own')}>Mine</button></div>
  <p><small>{category==='own'?'Tops you have built and named. They are kept on this phone.':CATEGORIES.find(c=>c.id===category)?.note}</small></p>
  <div className="draw-picker">
   {category==='own'&&<button className="draw-card draw-new" onClick={()=>setView('build')}>
    <span className="draw-icon" aria-hidden="true"><Plus size={28}/></span><strong>Build your own</strong>
    <small>Ring, blades, beast, name</small></button>}
   {(category==='own'?mine:subjectsOf(category)).map(s=>{
    const who=Object.keys(scoresFor(state,drawGame(s.id)));
    return <button key={s.id} className="draw-card" onClick={()=>{setId(s.id);setView('draw');}}>
     <span className="draw-icon" aria-hidden="true">{s.icon}</span>
     <strong>{s.name}</strong>
     {s.ja&&<small lang="ja">{s.ja}{s.romaji?` · ${s.romaji}`:''}</small>}
     <small>{s.level} · {s.steps.length} steps</small>
     {!!who.length&&<small className="draw-done"><Check size={13}/> Drawn by {who.join(', ')}</small>}
    </button>;})}
   {category==='own'&&!mine.length&&<p className="callout">Nothing of your own yet. Build one — it gets proper steps, the same as ours.</p>}
  </div>
  <div className="row wrap">
   <button type="button" onClick={()=>setView('kept')}><Download size={15}/> What I have drawn{kept.length?` (${kept.length})`:''}</button>
  </div>
 </>;
 const done=!!frame?.done;
 return <>
  <div className="row wrap draw-head">
   <button type="button" onClick={()=>{setId('');setView('pick');}}><ArrowLeft size={15}/> All of them</button>
   <strong>{subject.icon} {subject.name}</strong>{subject.ja&&<small lang="ja">{subject.ja}</small>}
   <button type="button" className="draw-kept-link" onClick={()=>setView('kept')}><Download size={14}/> Kept{kept.length?` (${kept.length})`:''}</button>
  </div>
  {at===0&&<p>{subject.about}</p>}
  <div className="segmented game-picker">
   <button className={mode==='paper'?'selected':''} onClick={()=>setMode('paper')}>On paper</button>
   <button className={mode==='side'?'selected':''} onClick={()=>setMode('side')}>Side by side</button>
  </div>
  <div className={`draw-stage${mode==='side'?' side':''}`}>
   <section className="draw-steps"
    onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
    onTouchEnd={e=>{
     const start=touch.current;touch.current=null;
     if(!start||isControl(e.target?.tagName))return;
     const delta=swipeDelta(start,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});
     if(delta)move(delta);
    }}>
    <p className="eyebrow">{done?'FINISHED':`STEP ${frame.index+1} OF ${frame.count}`}</p>
    <StepArt frame={frame}/>
    <p className="draw-say">{frame.say}</p>
    <div className="swipe-controls">
     <button type="button" disabled={at<=0} onClick={()=>move(-1)}><ArrowLeft size={16}/> Back</button>
     <span><Hand size={13}/> Swipe the picture</span>
     <button type="button" disabled={at>=frames.length-1} onClick={()=>move(1)}>Next <ArrowRight size={16}/></button>
    </div>
   </section>
   {mode==='side'&&<section className="draw-side">
    <div className="segmented game-picker draw-under-picker">
     <button className={under==='blank'?'selected':''} onClick={()=>setUnder('blank')}><PencilLine size={14}/> Freehand</button>
     <button className={under==='trace'?'selected':''} onClick={()=>setUnder('trace')}><Sparkles size={14}/> Ghost trace</button>
     <button className={under==='colour'?'selected':''} onClick={()=>setUnder('colour')}>Colour in</button>
    </div>
    <DrawPad subject={subject} under={under} pen={pen} nib={nib} erasing={erasing} strokes={strokes} setStrokes={setStrokes} padRef={padRef}/>
    <div className="draw-pens">{PENS.map(colour=>
     <button key={colour} type="button" aria-label={`Pen ${colour}`} className={`draw-pen${pen===colour&&!erasing?' on':''}`}
      style={{background:colour}} onClick={()=>{setPen(colour);setErasing(false);}}/>)}</div>
    <div className="row wrap draw-tools">
     {NIBS.map(n=><button key={n.id} type="button" className={nib.id===n.id?'selected':''} onClick={()=>setNib(n)}>
      <i className="draw-nib" style={{width:`${n.width/2+3}px`,height:`${n.width/2+3}px`}}/> {n.name}</button>)}
     <button type="button" className={erasing?'selected':''} onClick={()=>setErasing(e=>!e)}><Eraser size={15}/> Rub out</button>
     <button type="button" disabled={!strokes.length} onClick={()=>setStrokes(list=>list.slice(0,-1))}><Undo2 size={15}/> Undo</button>
     <button type="button" disabled={!strokes.length} onClick={()=>{if(confirm('Clear the whole pad?'))setStrokes([]);}}><RotateCcw size={15}/> Start again</button>
    </div>
    <button type="button" className="primary" disabled={busy||!strokes.length} onClick={keepPad}>
     <Check size={16}/> {working||'Keep this drawing'}</button>
   </section>}
  </div>
  {mode==='paper'&&<div className="draw-paper-actions">
   <label className="menu-shoot button primary">
    <Camera size={16}/> {working||'Photograph what I drew'}
    <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>{keepPaper(e.target.files?.[0]);e.target.value='';}}/>
   </label>
   <label className="menu-shoot button">One I already photographed
    <input type="file" accept="image/*" disabled={busy} onChange={e=>{keepPaper(e.target.files?.[0]);e.target.value='';}}/></label>
   <p><small>It is kept on this phone first{config?.uploads?', and goes to the family straight away when there is signal.':'. Private file storage is not connected, so it stays here.'}</small></p>
  </div>}
  {done&&<div className="row wrap">
   <button type="button" onClick={()=>{setAt(0);}}><Play size={15}/> From the start</button>
   <button type="button" onClick={()=>setView('kept')}><Download size={15}/> What I have drawn</button>
  </div>}
  {!!Object.keys(drawn).length&&<p className="game-status"><Trophy size={15}/> Drawn by {Object.keys(drawn).join(' · ')}</p>}
 </>;
}
