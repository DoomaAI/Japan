import React,{useState} from 'react';
import {upload} from '@vercel/blob/client';
import {Image as ImageIcon,X,Plus} from 'lucide-react';
const dateLabel=day=>day?new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(day+'T12:00:00+09:00')):'Unscheduled';
const fileUrl=d=>`/api/document?id=${encodeURIComponent(d.id)}`;
export default function MediaGallery({state,user,day,step,initialSearch='',config,busy,setBusy,accept,mutate,notice,request}){
 const [filter,setFilter]=useState(day||''),[query,setQuery]=useState(initialSearch),[kind,setKind]=useState(''),[editing,setEditing]=useState(null),[view,setView]=useState(null),[progress,setProgress]=useState(''),[retry,setRetry]=useState(null),[reset,setReset]=useState(0);
 const parent=user.role==='parent';
 const assignedDay=d=>d.stepId?state.steps.find(s=>s.id===d.stepId)?.day:d.day;
 const items=state.documents.filter(d=>d.category==='memory'&&(!step||d.stepId===step.id)&&(!filter||assignedDay(d)===filter)&&(!kind||d.type.startsWith(kind))&&[d.title,d.notes,...(d.tags||[])].join(' ').toLowerCase().includes(query.toLowerCase()));
 async function submit(e){
  e.preventDefault();const form=e.currentTarget,f=new FormData(form),target=f.get('target')||'',stepId=target.startsWith('step:')?target.slice(5):null,assigned=target.startsWith('day:')?target.slice(4):null;
  const details={title:String(f.get('title')||'').trim(),notes:String(f.get('notes')||''),tags:[...new Set(String(f.get('tags')||'').split(',').map(s=>s.trim()).filter(Boolean))],person:editing?.person||user.name,category:'memory',reference:'',stepId,day:assigned};
  if(editing){if(await mutate({type:'editDocument',id:editing.id,...details})){setEditing(null);notice('Memory updated.');}return;}
  const files=f.getAll('media').filter(file=>file.size>0);
  if(!retry&&!files.length){notice('Choose a photo or video.');return;}
  const supported=['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm'];
  if(!retry&&files.some(file=>!supported.includes(file.type)||file.size>(file.type.startsWith('video/')?100:25)*1024*1024)){notice('Choose JPEG, PNG, WebP, HEIC/HEIF photos up to 25 MB or MP4, MOV, WebM videos up to 100 MB.');return;}
  if(details.tags.length>20||details.tags.some(t=>t.length>50)){notice('Use up to 20 tags, each under 50 characters.');return;}
  setBusy(true);
  try{
   const pending=retry?[retry]:files.map((file,i)=>({file,details:{...details,title:details.title?(files.length>1?`${details.title} (${i+1})`:details.title):file.name}}));
   for(let i=0;i<pending.length;i++){
    const item=pending[i];setRetry(item);
    try{
     const blob=item.blob||await upload(`tickets/${user.id}/${crypto.randomUUID()}-${item.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`,item.file,{access:'private',multipart:true,handleUploadUrl:'/api/upload',onUploadProgress:p=>setProgress(`${i+1}/${pending.length} · ${Math.round(p.percentage)}%`)});
     item.blob=blob;setRetry(item);
     accept(await request('document',{pathname:blob.pathname,...item.details}));setRetry(null);
    }catch(error){notice(`${error.message||'Upload failed.'} ${i} saved from this batch; ${pending.length-i-1} remaining files were not uploaded. Retry the current file, then select any remaining files.`);throw error;}
   }
   setReset(n=>n+1);notice('Photos and videos added to the family gallery.');
  }catch{}finally{setProgress('');setBusy(false);}
 }
 return <section className="media-section"><p>Photos, videos and the little moments we want to remember.</p><div className="document-filters"><label>Search memories<input type="search" placeholder="Caption or tag" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="form-row">{!day&&!step&&<label>Day<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dateLabel(d.date)} · {d.city}</option>)}</select></label>}<label>Type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Photos and videos</option><option value="image/">Photos</option><option value="video/">Videos</option></select></label></div></div>
 {!items.length&&<div className="empty"><ImageIcon size={30}/><h3>Room for your memories</h3><p>Add photos or videos from this part of the trip.</p></div>}
 <div className="media-grid">{items.map(d=><article className="memory-card" key={d.id}>{d.type.startsWith('video/')?<video controls playsInline preload="none" src={fileUrl(d)} onError={()=>notice('If this format does not play on your phone, open the original file or upload an MP4 copy.')}/>:d.type==='image/heic'||d.type==='image/heif'?<a className="memory-original" href={fileUrl(d)} target="_blank" rel="noreferrer">Open original HEIC photo</a>:<button className="photo-button" onClick={()=>setView(d)} aria-label={`Enlarge ${d.title}`}><img loading="lazy" src={fileUrl(d)} alt={d.title}/></button>}<div className="memory-details"><h3>{d.title}</h3><small>{dateLabel(assignedDay(d))} · {d.person}</small>{d.stepId&&<small>{state.steps.find(s=>s.id===d.stepId)?.title}</small>}<p>{d.notes}</p><div className="row wrap">{(d.tags||[]).map(t=><button className="tag" key={t} onClick={()=>setQuery(t)}>{t}</button>)}</div><div className="row wrap"><a href={fileUrl(d)} target="_blank" rel="noreferrer">Open original</a>{parent&&<><button onClick={()=>setEditing(d)}>Edit caption / move</button><button className="danger" onClick={()=>{if(confirm('Remove this memory from the trip?'))mutate({type:'removeDocument',id:d.id});}}>Remove</button></>}</div></div></article>)}</div>
 {parent&&<details key={editing?.id||`new-${reset}`} open={!!editing||!items.length}><summary><Plus size={16}/> {editing?'Edit memory':'Add photos or videos'}</summary>{!config?.uploads&&!editing&&<p className="callout">Uploads become available when private file storage is connected.</p>}<form onSubmit={submit}><label>Attach to<select name="target" defaultValue={editing?(editing.stepId?`step:${editing.stepId}`:editing.day?`day:${editing.day}`:''):step?`step:${step.id}`:day?`day:${day}`:''}><option value="">Whole trip</option><optgroup label="Day albums">{state.days.map(d=><option key={d.date} value={`day:${d.date}`}>{dateLabel(d.date)} · {d.title}</option>)}</optgroup><optgroup label="Activities">{state.steps.map(s=><option key={s.id} value={`step:${s.id}`}>{dateLabel(s.day)} · {s.title}</option>)}</optgroup></select></label><label>Title<input name="title" required={!!editing} maxLength={220} defaultValue={editing?.title||''} placeholder="Our first evening in Tokyo"/></label><label>Caption / notes<textarea name="notes" maxLength={4000} defaultValue={editing?.notes||''}/></label><label>Tags (comma-separated)<input name="tags" defaultValue={(editing?.tags||[]).join(', ')} placeholder="family, food, Tokyo"/></label>{!editing&&<><label>Choose photos or videos<input key={reset} type="file" name="media" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm" disabled={busy||!config?.uploads||!!retry}/></label><p>Photos up to 25 MB each; videos up to 100 MB each. MP4 offers the widest playback support. HEIC originals can be saved and opened; no automatic conversion is applied.</p></>}<button className="button primary" disabled={busy||(!editing&&!config?.uploads)}>{busy?`Uploading ${progress}`:editing?'Save changes':retry?'Retry saving current upload':'Upload to family gallery'}</button>{editing&&<button type="button" className="button" onClick={()=>setEditing(null)}>Cancel</button>}</form></details>}
 {view&&<div className="ticket-view"><header><strong>{view.title}</strong><button aria-label="Close photo" onClick={()=>setView(null)}><X/></button></header><img src={fileUrl(view)} alt={view.title}/><p>{view.notes}</p></div>}
 </section>;
}
