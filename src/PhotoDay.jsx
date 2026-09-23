import React,{useState} from 'react';
import {photoPosition} from './exif-gps.js';
import {upload} from '@vercel/blob/client';
import {Camera,Trophy,Trash2,Check,Sparkles,Users} from 'lucide-react';
import {shrinkPhoto} from './MenuReader.jsx';
import {photosFor,photosOf,photoOwner,photoCounts,photoVotesFor,photoOfTheDay,BOYS} from './trip-features.js';
export const photoUrl=p=>`/api/photo?id=${encodeURIComponent(p.id)}`;
const AGES={Nate:5,Boston:8};
// The boys' own photographs: take one, hear what was good about it and one thing to try, and
// then everybody votes for the day's best. The feedback talks to the child, and the vote is
// the family's rather than the app's — nobody wants a computer choosing between brothers.
//
// A photo belongs to somebody, which is not always whoever put it on: a parent photographs
// something a boy did, on their own phone, and hands it to him. Filter by a name and you get
// everything of theirs across the whole trip, which is the one place to look for it — the same
// screen rather than another entry in a menu that already has twenty-two.
export default function PhotoDay({state,user,day,config,busy,setBusy,request,accept,mutate,notice,dayLabel,person='',setPerson}){
 const [working,setWorking]=useState(''),[preview,setPreview]=useState(null);
 const [belongsTo,setBelongsTo]=useState(user.name);
 const parent=user.role==='parent';
 const whole=!!person;
 // A named person is their whole trip; nobody named is today, which is what the vote is about.
 const entries=whole?photosOf(state,person):photosFor(state,day);
 const votes=photoVotesFor(state,day),result=photoOfTheDay(state,day);
 const myVote=votes[user.name];
 const counts=photoCounts(state);
 const mine=photosOf(state,belongsTo,day);
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
    try{feedback=await request('photo-feedback',{image:shot.image,mediaType:shot.mediaType,age:AGES[belongsTo]||10});}
    catch(e){notice(`${e.message} The photo is still going up.`);}
   }
   setWorking('Saving it for the family…');
   const blob=await upload(`photos/${user.id}/${crypto.randomUUID()}.jpg`,
    await (await fetch(shot.preview)).blob(),{access:'private',contentType:'image/jpeg',handleUploadUrl:'/api/upload'});
   accept(await request('photo',{pathname:blob.pathname,day,for:belongsTo,title:feedback?.title||'',feedback,gps:await photoPosition(file)}));
   setPreview(null);
   notice(feedback?`${feedback.title} — ${feedback.score}/10`:`Photo added${belongsTo===user.name?'':` for ${belongsTo}`}.`);
  }catch(e){notice(e.message||'That photo could not be added.');setPreview(null);}
  finally{setBusy(false);setWorking('');}
 }
 const canEnter=BOYS.includes(user.name)||parent;
 return <section className="photo-day">
  <div className="section-heading"><div>
   <p className="eyebrow">{whole?`${person}’s photos`:dayLabel(day)}</p>
   <h2>{whole?`Everything ${person} has taken`:'Photo of the day'}</h2>
  </div></div>
  <p>{whole
   ? `Every photo that belongs to ${person}, newest first, across the whole trip. Pick “Today’s vote” to go back to the day.`
   : 'Take a photo, hear what was good about it, and everyone votes for the best one of the day.'}</p>
  <div className="segmented game-picker photo-whose">
   <button className={!person?'selected':''} onClick={()=>setPerson?.('')}>Today’s vote</button>
   {state.members.map(name=>
    <button key={name} className={person===name?'selected':''} onClick={()=>setPerson?.(name)}>
     <Users size={14}/> {name}{counts[name]?` · ${counts[name]}`:''}</button>)}
  </div>
  {canEnter&&!whole&&<>
   {parent&&<label className="photo-owner">Whose photo is this?
    <select value={belongsTo} disabled={busy} onChange={e=>setBelongsTo(e.target.value)}>
     {state.members.map(name=><option key={name}>{name}</option>)}</select></label>}
   <label className="menu-shoot button primary">
    <Camera size={16}/> {working||`Add a photo${mine.length?` (${mine.length} of 12)`:''}`}
    <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>{add(e.target.files?.[0]);e.target.value='';}}/>
   </label>
   <label className="menu-shoot button">Choose one I already took
    <input type="file" accept="image/*" disabled={busy} onChange={e=>{add(e.target.files?.[0]);e.target.value='';}}/></label>
   {parent&&belongsTo!==user.name&&<p><small>This one will be {belongsTo}’s, and counts towards {belongsTo}’s twelve for the day.</small></p>}
  </>}
  {preview&&<img className="menu-shot" src={preview} alt="The photo being added"/>}
  {!config?.photoCoach&&canEnter&&!whole&&<p><small>Feedback needs an API key on the deployment. Photos and voting work without one.</small></p>}
  {!whole&&result?.winners?.length===1&&<p className="photo-winner"><Trophy size={16}/> <strong>{photoOwner(result.winners[0])}</strong> has photo of the day with {result.votes} vote{result.votes===1?'':'s'}.</p>}
  {!whole&&result?.winners?.length>1&&<p className="photo-winner"><Trophy size={16}/> A tie on {result.votes} vote{result.votes===1?'':'s'} — {result.winners.map(photoOwner).join(' and ')}.</p>}
  {!entries.length&&<p className="callout">{whole?`Nothing of ${person}’s yet.`:'No photos yet today. First one in sets the bar.'}</p>}
  <div className="photo-grid">{entries.map(p=>{
   const count=Object.values(votes).filter(id=>id===p.id).length;
   const owner=photoOwner(p);
   return <article className={`photo-card${myVote===p.id?' mine':''}${!whole&&result?.winners?.some(w=>w.id===p.id)&&result.votes?' winner':''}`} key={p.id}>
    <img loading="lazy" src={photoUrl(p)} alt={p.feedback?.subject||`A photo by ${owner}`}/>
    <div className="photo-body">
     <strong>{owner}{p.feedback?.title?` · ${p.feedback.title}`:''}</strong>
     {whole&&<small>{dayLabel(p.day)}</small>}
     {p.by!==owner&&<small>Added by {p.by}</small>}
     {p.feedback&&<>
      {!!p.feedback.good?.length&&<ul>{p.feedback.good.map((g,i)=><li key={i}>{g}</li>)}</ul>}
      {p.feedback.tip&&<p className="photo-tip"><Sparkles size={13}/> {p.feedback.tip}</p>}
      {p.feedback.score&&<small>{p.feedback.score}/10 for a {AGES[owner]||'young'}-year-old photographer</small>}
     </>}
     <div className="row wrap">
      {!whole&&<button type="button" className={myVote===p.id?'primary':''} disabled={busy}
       onClick={()=>mutate({type:'photoVote',person:user.name,day,id:myVote===p.id?null:p.id})}>
       {myVote===p.id?<><Check size={14}/> My vote</>:'Vote for this'}{count?` · ${count}`:''}</button>}
      {parent&&<label className="photo-assign">Whose?
       <select value={owner} disabled={busy} onChange={e=>mutate({type:'photoAssign',id:p.id,person:e.target.value})}>
        {state.members.map(name=><option key={name}>{name}</option>)}</select></label>}
      {(parent||p.by===user.name||owner===user.name)&&<button type="button" className="danger" disabled={busy}
       onClick={()=>{if(confirm('Remove this photo?'))mutate({type:'photoRemove',id:p.id});}}><Trash2 size={13}/></button>}
     </div>
    </div>
   </article>;})}</div>
  {!!entries.length&&!whole&&<small>Everyone gets one vote, and you can change it. Voting for your own is allowed — everybody can see who voted for what.</small>}
 </section>;
}
