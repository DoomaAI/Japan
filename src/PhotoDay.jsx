import React,{useState} from 'react';
import {upload} from '@vercel/blob/client';
import {Camera,Trophy,Trash2,Check,Sparkles} from 'lucide-react';
import {shrinkPhoto} from './MenuReader.jsx';
import {photosFor,photoVotesFor,photoOfTheDay,BOYS} from './trip-features.js';
export const photoUrl=p=>`/api/photo?id=${encodeURIComponent(p.id)}`;
const AGES={Nate:5,Boston:8};
// The boys' own photographs: take one, hear what was good about it and one thing to try, and
// then everybody votes for the day's best. The feedback talks to the child, and the vote is
// the family's rather than the app's — nobody wants a computer choosing between brothers.
export default function PhotoDay({state,user,day,config,busy,setBusy,request,accept,mutate,notice,dayLabel}){
 const [working,setWorking]=useState(''),[preview,setPreview]=useState(null);
 const entries=photosFor(state,day),votes=photoVotesFor(state,day),result=photoOfTheDay(state,day);
 const myVote=votes[user.name];
 const mine=entries.filter(p=>p.by===user.name);
 async function add(file){
  if(!file)return;
  if(!config?.uploads)return notice('Photos need private file storage connected.');
  if(!navigator.onLine)return notice('Adding a photo needs signal. It will have to wait.');
  setBusy(true);setWorking('Shrinking the photo…');
  try{
   const shot=await shrinkPhoto(file,1600,0.75);
   setPreview(shot.preview);
   let feedback=null;
   if(config?.photoCoach){
    setWorking('Having a look at it…');
    try{feedback=await request('photo-feedback',{image:shot.image,mediaType:shot.mediaType,age:AGES[user.name]||10});}
    catch(e){notice(`${e.message} The photo is still going up.`);}
   }
   setWorking('Saving it for the family…');
   const blob=await upload(`photos/${user.id}/${crypto.randomUUID()}.jpg`,
    await (await fetch(shot.preview)).blob(),{access:'private',contentType:'image/jpeg',handleUploadUrl:'/api/upload'});
   accept(await request('photo',{pathname:blob.pathname,day,title:feedback?.title||'',feedback}));
   setPreview(null);
   notice(feedback?`${feedback.title} — ${feedback.score}/10`:'Photo added.');
  }catch(e){notice(e.message||'That photo could not be added.');setPreview(null);}
  finally{setBusy(false);setWorking('');}
 }
 const canEnter=BOYS.includes(user.name)||user.role==='parent';
 return <section className="photo-day">
  <div className="section-heading"><div><p className="eyebrow">{dayLabel(day)}</p><h2>Photo of the day</h2></div></div>
  <p>Take a photo, hear what was good about it, and everyone votes for the best one of the day.</p>
  {canEnter&&<>
   <label className="menu-shoot button primary">
    <Camera size={16}/> {working||`Add a photo${mine.length?` (${mine.length} of 12)`:''}`}
    <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>{add(e.target.files?.[0]);e.target.value='';}}/>
   </label>
   <label className="menu-shoot button">Choose one I already took
    <input type="file" accept="image/*" disabled={busy} onChange={e=>{add(e.target.files?.[0]);e.target.value='';}}/></label>
  </>}
  {preview&&<img className="menu-shot" src={preview} alt="The photo being added"/>}
  {!config?.photoCoach&&canEnter&&<p><small>Feedback needs an API key on the deployment. Photos and voting work without one.</small></p>}
  {result?.winners?.length===1&&<p className="photo-winner"><Trophy size={16}/> <strong>{result.winners[0].by}</strong> has photo of the day with {result.votes} vote{result.votes===1?'':'s'}.</p>}
  {result?.winners?.length>1&&<p className="photo-winner"><Trophy size={16}/> A tie on {result.votes} vote{result.votes===1?'':'s'} — {result.winners.map(w=>w.by).join(' and ')}.</p>}
  {!entries.length&&<p className="callout">No photos yet today. First one in sets the bar.</p>}
  <div className="photo-grid">{entries.map(p=>{
   const count=Object.values(votes).filter(id=>id===p.id).length;
   return <article className={`photo-card${myVote===p.id?' mine':''}${result?.winners?.some(w=>w.id===p.id)&&result.votes?' winner':''}`} key={p.id}>
    <img loading="lazy" src={photoUrl(p)} alt={p.feedback?.subject||`A photo by ${p.by}`}/>
    <div className="photo-body">
     <strong>{p.by}{p.feedback?.title?` · ${p.feedback.title}`:''}</strong>
     {p.feedback&&<>
      {!!p.feedback.good?.length&&<ul>{p.feedback.good.map((g,i)=><li key={i}>{g}</li>)}</ul>}
      {p.feedback.tip&&<p className="photo-tip"><Sparkles size={13}/> {p.feedback.tip}</p>}
      {p.feedback.score&&<small>{p.feedback.score}/10 for a {AGES[p.by]||'young'}-year-old photographer</small>}
     </>}
     <div className="row wrap">
      <button type="button" className={myVote===p.id?'primary':''} disabled={busy}
       onClick={()=>mutate({type:'photoVote',person:user.name,day,id:myVote===p.id?null:p.id})}>
       {myVote===p.id?<><Check size={14}/> My vote</>:'Vote for this'}{count?` · ${count}`:''}</button>
      {(user.role==='parent'||p.by===user.name)&&<button type="button" className="danger" disabled={busy}
       onClick={()=>{if(confirm('Remove this photo?'))mutate({type:'photoRemove',id:p.id});}}><Trash2 size={13}/></button>}
     </div>
    </div>
   </article>;})}</div>
  {!!entries.length&&<small>Everyone gets one vote, and you can change it. Voting for your own is allowed — everybody can see who voted for what.</small>}
 </section>;
}
