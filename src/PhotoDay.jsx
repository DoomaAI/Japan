import React,{useState,useRef} from 'react';
import {developingCount,inMoment,momentFor} from './film-data.js';
import {photoPosition} from './exif-gps.js';
import {upload} from '@vercel/blob/client';
import {Camera,Trophy,Trash2,Check,Users,AlertCircle,Tv,Mail} from 'lucide-react';
import {shrinkPhoto} from './MenuReader.jsx';
import {kudosFor,kudosLine} from './kudos-data.js';
import {ageOf} from './child-levels.js';
import {postcardText} from './postcard-data.js';
import {photosFor,photosOf,photoOwner,photoCounts,photoVotesFor,photoOfTheDay,BOYS} from './trip-features.js';
import {photoUrl} from './api-urls.js';
// The photo coach is told how old the photographer is, from the travel party.
// The boys' own photographs: take one, hear what was good about it (never a score or a tip), and
// then everybody votes for the day's best. The feedback talks to the child, and the vote is
// the family's rather than the app's — nobody wants a computer choosing between brothers.
//
// A photo belongs to somebody, which is not always whoever put it on: a parent photographs
// something a boy did, on their own phone, and hands it to him. Filter by a name and you get
// everything of theirs across the whole trip, which is the one place to look for it — the same
// screen rather than another entry in a menu that already has twenty-two.
export default function PhotoDay({state,user,day,config,busy,setBusy,request,accept,mutate,notice,dayLabel,person='',setPerson}){
 // A real postcard: the card's words from the day and what the boy said, with the photo, to
 // whichever app on the phone prints and posts, or to Messages. No provider is built in.
 async function sendPostcard(p){
  const card=postcardText(state,p);
  try{
   let files=[];
   try{const r=await fetch(photoUrl(p));if(r.ok){const b=await r.blob();files=[new File([b],`postcard-${p.id}.jpg`,{type:b.type||'image/jpeg'})];}}catch{}
   if(navigator.share&&(!files.length||navigator.canShare?.({files}))){await navigator.share({title:card.title,text:card.text,...(files.length?{files}:{})});return;}
   await navigator.clipboard.writeText(card.text);notice('The postcard words are copied. Paste them into a postcard app with the photo.');
  }catch(e){if(e?.name!=='AbortError')notice('Could not open the share sheet. The words are: '+card.text);}
 }
 const [working,setWorking]=useState(''),[preview,setPreview]=useState(null);
 // A photo that did not go up stays offered, with the file still in hand, so a dropped signal
 // is one tap to try again rather than choosing the photo all over again.
 const [failed,setFailed]=useState(''),last=useRef(null);
 const [belongsTo,setBelongsTo]=useState(user.name);
 const parent=user.role==='parent';
 const whole=!!person;
 // A named person is their whole trip; nobody named is today, which is what the vote is about.
 // The moment's photos sit together at the top of the day's vote, as a set.
 const entries=(whole?photosOf(state,person):photosFor(state,day)).slice().sort((a,b)=>(b.moment?1:0)-(a.moment?1:0));
 const votes=photoVotesFor(state,day),result=photoOfTheDay(state,day);
 const myVote=votes[user.name];
 const counts=photoCounts(state);
 const mine=photosOf(state,belongsTo,day);
 const [film,setFilm]=React.useState(false);
 const developing=developingCount(state,day),moment=momentFor(day),momentNow=inMoment(day);
 async function add(file){
  if(!file)return;
  if(!config?.uploads)return notice('Photos need private file storage connected.');
  if(!navigator.onLine)return notice('Adding a photo needs signal. It will have to wait.');
  last.current=file;setFailed('');
  setBusy(true);setWorking('Shrinking the photo…');
  try{
   const shot=await shrinkPhoto(file,1600,0.75);
   setPreview(shot.preview);
   let feedback=null;
   if(config?.photoCoach){
    setWorking('Having a look at it…');
    try{feedback=await request('photo-feedback',{image:shot.image,mediaType:shot.mediaType,age:ageOf(state,belongsTo)||10});}
    catch(e){notice(`${e.message} The photo is still going up.`);}
   }
   setWorking('Saving it for the family…');
   const blob=await upload(`photos/${user.id}/${crypto.randomUUID()}.jpg`,
    await (await fetch(shot.preview)).blob(),{access:'private',contentType:'image/jpeg',handleUploadUrl:'/api/upload'});
   accept(await request('photo',{pathname:blob.pathname,day,for:belongsTo,title:feedback?.title||'',feedback,gps:await photoPosition(file),film,moment:inMoment(day)}));
   setPreview(null);
   notice(film?'On the film. It develops at seven tomorrow morning.':feedback?.title?`${feedback.title} — added.`:`Photo added${belongsTo===user.name?'':` for ${belongsTo}`}.`);
  }catch(e){setFailed(e.message||'That photo could not be added.');setPreview(null);}
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
   {momentNow&&<p className="photo-moment-now">⏱ <b>It’s the moment.</b> Two minutes: a photo of whatever you are doing, right now.</p>}
   <label className="checkline photo-film"><input type="checkbox" checked={film} onChange={e=>setFilm(e.target.checked)}/>Film · nobody sees it until seven tomorrow morning</label>
   <label className="menu-shoot button primary">
    <Camera size={16}/> {working||`Add a photo${mine.length?` (${mine.length} of 12)`:''}`}
    <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>{add(e.target.files?.[0]);e.target.value='';}}/>
   </label>
   <label className="menu-shoot button">Choose one I already took
    <input type="file" accept="image/*" disabled={busy} onChange={e=>{add(e.target.files?.[0]);e.target.value='';}}/></label>
   {parent&&belongsTo!==user.name&&<p><small>This one will be {belongsTo}’s, and counts towards {belongsTo}’s twelve for the day.</small></p>}
  </>}
  {preview&&<img className="menu-shot" src={preview} alt="The photo being added"/>}
  {failed&&!working&&<p className="callout"><AlertCircle size={16}/> {failed}<button type="button" className="try-again" disabled={busy} onClick={()=>add(last.current)}>Try again</button></p>}
  {!whole&&result?.winners?.length===1&&<p className="photo-winner"><Trophy size={16}/> <strong>{photoOwner(result.winners[0])}</strong> has photo of the day with {result.votes} vote{result.votes===1?'':'s'}.</p>}
  {!whole&&result?.winners?.length>1&&<p className="photo-winner"><Trophy size={16}/> A tie on {result.votes} vote{result.votes===1?'':'s'} — {result.winners.map(photoOwner).join(' and ')}.</p>}
  {!whole&&developing>0&&<p className="photo-developing">🎞️ {developing} photo{developing===1?'':'s'} on the film, developing until seven tomorrow morning.</p>}
  {!entries.length&&<p className="callout">{whole?`Nothing of ${person}’s yet.`:'No photos yet today. First one in sets the bar.'}</p>}
  <div className="photo-grid">{entries.map(p=>{
   const count=Object.values(votes).filter(id=>id===p.id).length;
   const owner=photoOwner(p);
   return <article className={`photo-card${myVote===p.id?' mine':''}${!whole&&result?.winners?.some(w=>w.id===p.id)&&result.votes?' winner':''}`} key={p.id}>
    <img loading="lazy" src={photoUrl(p)} alt={p.feedback?.subject||`A photo by ${owner}`}/>
    <div className="photo-body">
     <strong>{owner}{p.feedback?.title?` · ${p.feedback.title}`:''}</strong>
     {(p.moment||p.film)&&<small className="photo-badges">{p.moment?`⏱ The moment · ${moment.clock}`:''}{p.moment&&p.film?' · ':''}{p.film?'🎞️ From the film':''}</small>}
     {whole&&<small>{dayLabel(p.day)}</small>}
     {p.by!==owner&&<small>Added by {p.by}</small>}
     {kudosFor(state,'photo',p.id).total>0&&<small className="photo-kudos">{kudosLine(kudosFor(state,'photo',p.id))} · from {Object.keys(kudosFor(state,'photo',p.id).names).join(', ')}</small>}
     {!!p.feedback?.good?.length&&<ul>{p.feedback.good.map((g,i)=><li key={i}>{g}</li>)}</ul>}
     <div className="row wrap">
      {!whole&&<button type="button" className={myVote===p.id?'primary':''} disabled={busy}
       onClick={()=>mutate({type:'photoVote',person:user.name,day,id:myVote===p.id?null:p.id})}>
       {myVote===p.id?<><Check size={14}/> My vote</>:'Vote for this'}{count?` · ${count}`:''}</button>}
      {parent&&<button type="button" disabled={busy} onClick={()=>sendPostcard(p)}><Mail size={14}/> Postcard</button>}
      {parent&&<button type="button" className={p.frame?'primary':''} aria-pressed={!!p.frame} disabled={busy} onClick={()=>mutate({type:'photoFrame',id:p.id,on:!p.frame})}><Tv size={14}/> {p.frame?'On the frame':'Put on the frame'}</button>}
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
