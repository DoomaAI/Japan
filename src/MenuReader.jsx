import React,{useState} from 'react';
import {Camera,Plus,AlertCircle,Check,Languages,Flame,Image as ImageIcon} from 'lucide-react';
import {FOOD} from './food-data.js';
import {triedFood} from './trip-features.js';
import {findDishPicture,imageSearchUrl} from './dish-picture.js';
// Shrink the photo on the phone before it goes anywhere: a 1600px JPEG reads just as well,
// costs a fraction to send and to read, and keeps us inside the request size limit.
export async function shrinkPhoto(file,max=1600,quality=0.72){
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
 bitmap.close?.();
 const url=canvas.toDataURL('image/jpeg',quality);
 return {image:url.slice(url.indexOf(',')+1),mediaType:'image/jpeg',preview:url};
}
export default function MenuReader({state,user,request,mutate,busy,setBusy,notice,show}){
 const [preview,setPreview]=useState(''),[result,setResult]=useState(null),[error,setError]=useState('');
 const [reading,setReading]=useState(false),[added,setAdded]=useState([]);
 const [pictures,setPictures]=useState({});
 async function choose(file){
  if(!file)return;
  setError('');setResult(null);setAdded([]);setPictures({});
  if(!navigator.onLine){setError('Reading a menu needs a connection. The food list still works offline.');return;}
  setReading(true);setBusy(true);
  try{
   const shot=await shrinkPhoto(file);
   setPreview(shot.preview);
   const answer=await request('menu',{image:shot.image,mediaType:shot.mediaType});
   setResult(answer);
   if(!answer.readable)setError('That photo could not be read as a menu. Try again closer, with more light, and hold still.');
  }catch(e){setError(e.message||'The menu could not be read. Try again.');}
  finally{setReading(false);setBusy(false);}
 }
 // Asked for rather than fetched with the answer: a picture is a second request over whatever
 // signal a restaurant has, and most of the time the Japanese and the English are enough.
 async function picture(key,item){
  if(pictures[key]){setPictures(p=>{const {[key]:_gone,...rest}=p;return rest;});return;}
  if(!navigator.onLine){setPictures(p=>({...p,[key]:{error:'Looking up a picture needs a connection.'}}));return;}
  setPictures(p=>({...p,[key]:{loading:true}}));
  try{const found=await findDishPicture(item);setPictures(p=>({...p,[key]:{found}}));}
  catch(e){setPictures(p=>({...p,[key]:{error:e.message||'No picture could be looked up.'}}));}
 }
 async function keep(item){
  const op={type:'foodAdd',en:item.en,ja:item.ja,romaji:'',kind:'meal',note:`From a menu we photographed${result?.place?` at ${result.place}`:''}. ${item.why}`};
  if(await mutate(op)){setAdded(list=>[...list,item.ja||item.en]);notice('Saved to our food list.');}
 }
 const known=id=>FOOD.find(f=>f.id===id);
 return <section className="menu-reader">
  <div className="section-heading"><h2><Camera size={18}/> Read a menu</h2></div>
  <p>Photograph the menu and we will pick out what this family would like, using what everyone has already rated.</p>
  <label className="button primary menu-shoot">
   <Camera size={18}/>{reading?'Reading the menu…':'Take a photo of the menu'}
   <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy||reading} onChange={e=>{choose(e.target.files[0]);e.target.value='';}}/>
  </label>
  {preview&&<img className="menu-shot" src={preview} alt="The menu we photographed"/>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {result?.readable&&<>
   {result.place&&<h3>{result.place}</h3>}
   {result.note&&<p className="menu-note">{result.note}</p>}
   <div className="food-list">{(result.suggestions||[]).map((item,i)=>{
    const match=known(item.matchesOurList),saved=added.includes(item.ja||item.en),shot=pictures[i];
    return <article className="food-card" key={`${item.ja}-${i}`}>
     <div className="food-top"><div><strong>{item.en}</strong><small>{(item.forWhom||[]).join(', ')||'Anyone'}{item.price?` · ${item.price}`:''}</small></div>
      {item.spicy&&<span className="food-score spicy" title="Likely spicy"><Flame size={14}/>spicy</span>}</div>
     {item.ja&&<p className="japanese food-ja" lang="ja">{item.ja}</p>}
     <p>{item.why}</p>
     {match&&<small className="menu-match"><Check size={14}/> On our list already as {match.en}{triedFood(state,match.id).Nate?' — Nate has tried it':''}</small>}
     <div className="row wrap">
      {item.ja&&<button onClick={()=>show({type:'foodcard',item:{en:item.en,ja:item.ja,romaji:''}})}><Languages size={16}/>Show someone</button>}
      <button aria-expanded={!!shot} onClick={()=>picture(i,item)}><ImageIcon size={16}/>{shot?'Hide the picture':'See a picture'}</button>
      {!match&&user.role==='parent'&&<button disabled={busy||saved} onClick={()=>keep(item)}><Plus size={16}/>{saved?'Saved':'Keep this'}</button>}
     </div>
     {shot&&<figure className="dish-picture">
      {shot.loading&&<p><small>Looking for a picture…</small></p>}
      {shot.error&&<p><small><AlertCircle size={14}/> {shot.error}</small></p>}
      {shot.found&&<><img src={shot.found.src} alt={`${item.en}, as pictured on Wikipedia`} loading="lazy"/>
       <figcaption><small>A picture of <span lang={shot.found.language}>{shot.found.title}</span> from Wikipedia — the dish in general, not this restaurant's. <a href={shot.found.page} target="_blank" rel="noopener noreferrer">The page it came from</a></small></figcaption></>}
      {shot.found===null&&<p><small>No picture of this one on Wikipedia. <a href={imageSearchUrl(item.dish||item.ja||item.en)} target="_blank" rel="noopener noreferrer">Search the web for one</a>.</small></p>}
     </figure>}
    </article>;})}</div>
   {!!(result.avoid||[]).length&&<div className="callout menu-avoid"><AlertCircle size={18}/><div><strong>Worth knowing before you order</strong>{result.avoid.map((a,i)=><p key={i}>{a.en} — {a.why}</p>)}</div></div>}
   <p><small>Read from your photo by Claude. It can misread a menu, and it cannot tell you what is in a dish — <strong>confirm anything allergy-related with the staff</strong>. Prices and availability are whatever the menu says on the day. <strong>See a picture</strong> looks the dish up on Wikipedia and shows a photograph of it in general: what arrives at this restaurant may look nothing like it.</small></p>
  </>}
 </section>;
}
