import React,{useState} from 'react';
import {photoDetails} from './exif-gps.js';
import {sortPhoto,sortedTarget,sortReason} from './photo-sort.js';
import {upload} from '@vercel/blob/client';
import {Image as ImageIcon,X,Plus} from 'lucide-react';
import ZoomImage from './ZoomImage.jsx';
import {documentUrl as fileUrl} from './api-urls.js';
const dateLabel=day=>day?new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(day+'T12:00:00+09:00')):'Unscheduled';
const takenLabel=t=>new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(t.length===19?`${t}+09:00`:t));
export default function MediaGallery({state,user,day,step,initialSearch='',config,busy,setBusy,accept,mutate,notice,request}){
 const [filter,setFilter]=useState(day||''),[query,setQuery]=useState(initialSearch),[kind,setKind]=useState(''),[editing,setEditing]=useState(null),[view,setView]=useState(null),[progress,setProgress]=useState(''),[retry,setRetry]=useState(null),[reset,setReset]=useState(0),[sorting,setSorting]=useState(null),[reading,setReading]=useState(false);
 const parent=user.role==='parent';
 const assignedDay=d=>d.stepId?state.steps.find(s=>s.id===d.stepId)?.day:d.day;
 const items=state.documents.filter(d=>d.category==='memory'&&(!step||d.stepId===step.id)&&(!filter||assignedDay(d)===filter)&&(!kind||d.type.startsWith(kind))&&[d.title,d.notes,...(d.tags||[])].join(' ').toLowerCase().includes(query.toLowerCase()));
 // Targets the gallery offers: the whole trip, a day's album, or one activity.
 const targetOptions=<><option value="">Whole trip</option><optgroup label="Day albums">{state.days.map(d=><option key={d.date} value={`day:${d.date}`}>{dateLabel(d.date)} · {d.title}</option>)}</optgroup><optgroup label="Activities">{state.steps.map(s=><option key={s.id} value={`step:${s.id}`}>{dateLabel(s.day)} · {s.title}</option>)}</optgroup></>;
 const placeOf=target=>target.startsWith('step:')?{stepId:target.slice(5),day:null}:target.startsWith('day:')?{stepId:null,day:target.slice(4)}:{stepId:null,day:null};
 const cityOf=({stepId,day})=>state.days.find(d=>d.date===(stepId?state.steps.find(s=>s.id===stepId)?.day:day))?.city||'';
 function formDetails(f){
  return {title:String(f.get('title')||'').trim(),notes:String(f.get('notes')||''),tags:[...new Set(String(f.get('tags')||'').split(',').map(s=>s.trim()).filter(Boolean))],person:editing?.person||user.name,category:'memory',reference:''};
 }
 async function submit(e){
  e.preventDefault();const form=e.currentTarget,f=new FormData(form),target=String(f.get('target')||'');
  const details={...formDetails(f),...placeOf(target==='auto'?'':target)};
  if(editing){if(await mutate({type:'editDocument',id:editing.id,...details})){setEditing(null);notice('Memory updated.');}return;}
  const files=f.getAll('media').filter(file=>file.size>0);
  if(!retry&&!files.length){notice('Choose a photo or video.');return;}
  const supported=['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm'];
  if(!retry&&files.some(file=>!supported.includes(file.type)||file.size>(file.type.startsWith('video/')?100:25)*1024*1024)){notice('Choose JPEG, PNG, WebP, HEIC/HEIF photos up to 25 MB or MP4, MOV, WebM videos up to 100 MB.');return;}
  if(details.tags.length>20||details.tags.some(t=>t.length>50)){notice('Use up to 20 tags, each under 50 characters.');return;}
  if(retry)return send([retry]);
  const numbered=(file,i)=>details.title?(files.length>1?`${details.title} (${i+1})`:details.title):file.name;
  if(target!=='auto')return send(await Promise.all(files.map(async(file,i)=>({file,...await photoDetails(file),details:{...details,title:numbered(file,i)}}))));
  // Sorting: read each photo's own time and place, propose where it goes, and let the parent
  // look down the list and change any of them before anything is uploaded.
  setBusy(true);setReading(true);
  try{
   const list=[];
   for(const [i,file] of files.entries()){
    const meta=await photoDetails(file),sorted=sortPhoto(state,meta);
    list.push({key:`${i}-${file.name}`,file,...meta,target:sortedTarget(sorted),reason:sortReason(state,sorted,meta.takenAt),preview:/^image\/(jpeg|png|webp)$/.test(file.type)?URL.createObjectURL(file):null,details:{...details,title:numbered(file,i)}});
   }
   list.sort((a,b)=>(a.takenAt||'~').localeCompare(b.takenAt||'~'));
   setSorting(list);
  }finally{setReading(false);setBusy(false);}
 }
 function closeSorting(){sorting?.forEach(item=>item.preview&&URL.revokeObjectURL(item.preview));setSorting(null);}
 async function sendSorted(){
  // A photo already saved from an earlier try is not sent again, and one whose file went up
  // before the signal dropped is saved from the file already up.
  const list=sorting.filter(entry=>!entry.done).map(entry=>{
   const {preview,reason,key,target,done,src,...item}=entry,at=placeOf(target),city=cityOf(at);
   return {...item,src:entry,details:{...item.details,...at,tags:city&&item.details.tags.length<20&&!item.details.tags.includes(city)?[...item.details.tags,city]:item.details.tags}};
  });
  if(await send(list,false))closeSorting();else setSorting(list=>[...list]);
 }
 async function send(pending,form=true){
  setBusy(true);
  try{
   for(let i=0;i<pending.length;i++){
    const item=pending[i];if(form)setRetry(item);
    try{
     const blob=item.blob||await upload(`tickets/${user.id}/${crypto.randomUUID()}-${item.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`,item.file,{access:'private',multipart:true,handleUploadUrl:'/api/upload',onUploadProgress:p=>setProgress(`${i+1}/${pending.length} · ${Math.round(p.percentage)}%`)});
     item.blob=blob;if(item.src)item.src.blob=blob;if(form)setRetry(item);
     accept(await request('document',{pathname:blob.pathname,...item.details,gps:item.gps||null,takenAt:item.takenAt||null}));if(item.src)item.src.done=true;setRetry(null);
    }catch(error){notice(form?`${error.message||'Upload failed.'} ${i} saved from this batch; ${pending.length-i-1} remaining files were not uploaded. Retry the current file, then select any remaining files.`:`${error.message||'Upload failed.'} ${i} saved; the other ${pending.length-i} are still on the list to try again.`);throw error;}
   }
   setReset(n=>n+1);notice('Photos and videos added to the family gallery.');return true;
  }catch{return false;}finally{setProgress('');setBusy(false);}
 }
 return <section className="media-section"><p>Photos, videos and the little moments we want to remember.</p><div className="document-filters"><label>Search memories<input type="search" placeholder="Caption or tag" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="form-row">{!day&&!step&&<label>Day<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dateLabel(d.date)} · {d.city}</option>)}</select></label>}<label>Type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Photos and videos</option><option value="image/">Photos</option><option value="video/">Videos</option></select></label></div></div>
 {!items.length&&<div className="empty"><ImageIcon size={30}/><h3>Room for your memories</h3><p>Add photos or videos from this part of the trip.</p></div>}
 <div className="media-grid">{items.map(d=><article className="memory-card" key={d.id}>{d.type.startsWith('video/')?<video controls playsInline preload="none" src={fileUrl(d)} onError={()=>notice('If this format does not play on your phone, open the original file or upload an MP4 copy.')}/>:d.type==='image/heic'||d.type==='image/heif'?<a className="memory-original" href={fileUrl(d)} target="_blank" rel="noreferrer">Open original HEIC photo</a>:<button className="photo-button" onClick={()=>setView(d)} aria-label={`Enlarge ${d.title}`}><img loading="lazy" src={fileUrl(d)} alt={d.title}/></button>}<div className="memory-details"><h3>{d.title}</h3><small>{dateLabel(assignedDay(d))}{d.takenAt?` · ${takenLabel(d.takenAt)}`:''} · {d.person}</small>{d.stepId&&<small>{state.steps.find(s=>s.id===d.stepId)?.title}</small>}<p>{d.notes}</p><div className="row wrap">{(d.tags||[]).map(t=><button className="tag" key={t} onClick={()=>setQuery(t)}>{t}</button>)}</div><div className="row wrap"><a href={fileUrl(d)} target="_blank" rel="noreferrer">Open original</a>{parent&&<><button onClick={()=>setEditing(d)}>Edit caption / move</button><button className="danger" onClick={()=>{if(confirm('Remove this memory from the trip?'))mutate({type:'removeDocument',id:d.id});}}>Remove</button></>}</div></div></article>)}</div>
 {parent&&<details key={editing?.id||`new-${reset}`} open={!!editing||!items.length}><summary><Plus size={16}/> {editing?'Edit memory':'Add photos or videos'}</summary>{!config?.uploads&&!editing&&<p className="callout">Uploads become available when private file storage is connected.</p>}{sorting?<div className="photo-sort">
  <p>Each photo is going where it says it was taken. Change any that are wrong, then upload.{sorting.some(i=>i.done)?` ${sorting.filter(i=>i.done).length} already saved.`:''}</p>
  <ul>{sorting.map((item,i)=><li key={item.key} className={item.done?'saved':''}>
   {item.preview?<img src={item.preview} alt=""/>:<span className="photo-sort-thumb"><ImageIcon size={20}/></span>}
   <div><strong>{item.file.name}</strong><small>{item.reason}</small>
    <select aria-label={`Where ${item.file.name} goes`} value={item.target} disabled={busy||item.done} onChange={e=>setSorting(list=>list.map((x,j)=>j===i?{...x,target:e.target.value}:x))}>{targetOptions}</select></div>
  </li>)}</ul>
  <button type="button" className="button primary" disabled={busy} onClick={sendSorted}>{busy?`Uploading ${progress}`:sorting.some(i=>i.done)?`Try the other ${sorting.filter(i=>!i.done).length} again`:`Upload ${sorting.length} to the family gallery`}</button>
  <button type="button" className="button" disabled={busy} onClick={closeSorting}>Cancel</button>
 </div>:<form onSubmit={submit}><label>Attach to<select name="target" defaultValue={editing?(editing.stepId?`step:${editing.stepId}`:editing.day?`day:${editing.day}`:''):step?`step:${step.id}`:day?`day:${day}`:'auto'}>{!editing&&<option value="auto">Sort each photo by where and when it was taken</option>}{targetOptions}</select></label><label>Title<input name="title" required={!!editing} maxLength={220} defaultValue={editing?.title||''} placeholder="Our first evening in Tokyo"/></label><label>Caption / notes<textarea name="notes" maxLength={4000} defaultValue={editing?.notes||''}/></label><label>Tags (comma-separated)<input name="tags" defaultValue={(editing?.tags||[]).join(', ')} placeholder="family, food, Tokyo"/></label>{!editing&&<><label>Choose photos or videos<input key={reset} type="file" name="media" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm" disabled={busy||!config?.uploads||!!retry}/></label><p>Photos up to 25 MB each; videos up to 100 MB each. MP4 offers the widest playback support. HEIC originals can be saved and opened; no automatic conversion is applied.</p></>}<button className="button primary" disabled={busy||(!editing&&!config?.uploads)}>{reading?'Reading each photo…':busy?`Uploading ${progress}`:editing?'Save changes':retry?'Retry saving current upload':'Upload to family gallery'}</button>{editing&&<button type="button" className="button" onClick={()=>setEditing(null)}>Cancel</button>}</form>}</details>}
 {view&&<div className="ticket-view"><header><strong>{view.title}</strong><button aria-label="Close photo" onClick={()=>setView(null)}><X/></button></header><ZoomImage src={fileUrl(view)} alt={view.title}/><p>{view.notes}</p></div>}
 </section>;
}
