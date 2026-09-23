import React,{useState} from 'react';
import {Camera,Plus,AlertCircle,Check,Languages,Flame,Image as ImageIcon,List,Package} from 'lucide-react';
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
 const [opened,setOpened]=useState({});
 // A menu, or a single packet, bottle or snack off a shelf. The two are read differently: a packet
 // prints its own ingredients, a menu does not.
 const [mode,setMode]=useState('menu');
 const packet=mode==='packet';
 async function choose(file){
  if(!file)return;
  setError('');setResult(null);setAdded([]);setPictures({});setOpened({});
  if(!navigator.onLine){setError(`Reading a ${packet?'packet':'menu'} needs a connection. The food list still works offline.`);return;}
  setReading(true);setBusy(true);
  try{
   const shot=await shrinkPhoto(file);
   setPreview(shot.preview);
   const answer=await request(packet?'packet':'menu',{image:shot.image,mediaType:shot.mediaType});
   setResult({...answer,mode});
   if(!answer.readable)setError(packet?'That photo could not be read as a food or drink item. Try again closer, with the label in the light.':'That photo could not be read as a menu. Try again closer, with more light, and hold still.');
  }catch(e){setError(e.message||`The ${packet?'packet':'menu'} could not be read. Try again.`);}
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
 const openIngredients=key=>setOpened(o=>({...o,[key]:!o[key]}));
 async function keep(item){
  const op=result?.mode==='packet'
   ?{type:'foodAdd',en:item.en,ja:item.ja,romaji:'',kind:'snack',note:`From a packet we photographed${item.maker?` (${item.maker})`:''}. ${item.why}`}
   :{type:'foodAdd',en:item.en,ja:item.ja,romaji:'',kind:'meal',note:`From a menu we photographed${result?.place?` at ${result.place}`:''}. ${item.why}`};
  if(await mutate(op)){setAdded(list=>[...list,item.ja||item.en]);notice('Saved to our food list.');}
 }
 const known=id=>FOOD.find(f=>f.id===id);
 const hot=(result?.suggestions||[]).filter(i=>i.spicy);
 return <section className="menu-reader">
  <div className="section-heading"><h2><Camera size={18}/> Read a menu or a packet</h2></div>
  <div className="segmented">
   <button type="button" className={packet?'':'selected'} aria-pressed={!packet} disabled={reading} onClick={()=>setMode('menu')}><Camera size={16}/>A menu</button>
   <button type="button" className={packet?'selected':''} aria-pressed={packet} disabled={reading} onClick={()=>setMode('packet')}><Package size={16}/>A packet or item</button>
  </div>
  <p>{packet
   ?'Photograph a snack, a drink, a packet or anything off a shelf — the back of it too, if you can, where the ingredients are. We will say what it is, what the label says is in it, and whether this family would like it.'
   :'Photograph the menu and we will pick out what this family would like, using what everyone has already rated.'}</p>
  <label className="button primary menu-shoot">
   {packet?<Package size={18}/>:<Camera size={18}/>}{reading?(packet?'Reading the packet…':'Reading the menu…'):(packet?'Take a photo of the item':'Take a photo of the menu')}
   <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy||reading} onChange={e=>{choose(e.target.files[0]);e.target.value='';}}/>
  </label>
  {preview&&<img className="menu-shot" src={preview} alt={result?.mode==='packet'?'The item we photographed':'The menu we photographed'}/>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {result?.readable&&result.mode==='packet'&&<PacketCard item={result} state={state} user={user} busy={busy} saved={added.includes(result.ja||result.en)} shot={pictures.packet} open={opened.packet}
   onShow={()=>show({type:'foodcard',item:{en:result.en,ja:result.ja,romaji:''}})} onPicture={()=>picture('packet',result)} onIngredients={()=>openIngredients('packet')} onKeep={()=>keep(result)}/>}
  {result?.readable&&result.mode!=='packet'&&<>
   {result.place&&<h3>{result.place}</h3>}
   {result.note&&<p className="menu-note">{result.note}</p>}
   {!!hot.length&&<div className="callout menu-spicy"><Flame size={18}/><div>
    <strong>{hot.length===1?'One of these is likely spicy':`${hot.length} of these are likely spicy`}</strong>
    <p>{hot.map(i=>i.en).join(', ')} — not for Nate. Each card says what makes it hot.</p></div></div>}
   <div className="food-list">{(result.suggestions||[]).map((item,i)=>{
    const match=known(item.matchesOurList),saved=added.includes(item.ja||item.en),shot=pictures[i],open=opened[i];
    return <article className="food-card" key={`${item.ja}-${i}`}>
     <div className="food-top"><div><strong>{item.en}</strong><small>{(item.forWhom||[]).join(', ')||'Anyone'}{item.price?` · ${item.price}`:''}</small></div>
      {item.spicy&&<span className="food-score spicy" title="Likely spicy"><Flame size={14}/>spicy</span>}</div>
     {item.ja&&<p className="japanese food-ja" lang="ja">{item.ja}</p>}
     <p>{item.why}</p>
     {item.spicy&&<p className={`dish-warning${item.heat==='very hot'?' fierce':''}`}><Flame size={15}/><span>
      <strong>Likely spicy{item.heat&&item.heat!=='none'?` · ${item.heat}`:''}.</strong> {item.spiceNote||'Ask how hot it is before you order it for the boys.'}</span></p>}
     {match&&<small className="menu-match"><Check size={14}/> On our list already as {match.en}{triedFood(state,match.id).Nate?' — Nate has tried it':''}</small>}
     <div className="row wrap">
      {item.ja&&<button onClick={()=>show({type:'foodcard',item:{en:item.en,ja:item.ja,romaji:''}})}><Languages size={16}/>Show someone</button>}
      <button aria-expanded={!!shot} onClick={()=>picture(i,item)}><ImageIcon size={16}/>{shot?'Hide the picture':'See a picture'}</button>
      {!!(item.ingredients||[]).length&&<button aria-expanded={!!open} onClick={()=>openIngredients(i)}><List size={16}/>{open?'Hide ingredients':'See ingredients'}</button>}
      {!match&&user.role==='parent'&&<button disabled={busy||saved} onClick={()=>keep(item)}><Plus size={16}/>{saved?'Saved':'Keep this'}</button>}
     </div>
     {shot&&<figure className="dish-picture">
      {shot.loading&&<p><small>Looking for a picture…</small></p>}
      {shot.error&&<p><small><AlertCircle size={14}/> {shot.error}</small></p>}
      {shot.found&&<><img src={shot.found.src} alt={`${item.en}, as pictured on Wikipedia`} loading="lazy"/>
       <figcaption><small>A picture of <span lang={shot.found.language}>{shot.found.title}</span> from Wikipedia — the dish in general, not this restaurant's. <a href={shot.found.page} target="_blank" rel="noopener noreferrer">The page it came from</a></small></figcaption></>}
      {shot.found===null&&<p><small>No picture of this one on Wikipedia. <a href={imageSearchUrl(item.dish||item.ja||item.en)} target="_blank" rel="noopener noreferrer">Search the web for one</a>.</small></p>}
     </figure>}
     {open&&<div className="dish-ingredients">
      <strong>Usually in this dish</strong>
      <ul>{item.ingredients.map((what,n)=><li key={n}>{what}</li>)}</ul>
      <small>What a dish of this name is normally made of — not read off the menu, and not this kitchen's own recipe. It is not a full list and it cannot tell you what a dish is <em>free</em> of: <strong>ask the staff about anything allergy-related</strong>.</small>
     </div>}
    </article>;})}</div>
   {!!(result.avoid||[]).length&&<div className="callout menu-avoid"><AlertCircle size={18}/><div><strong>Worth knowing before you order</strong>{result.avoid.map((a,i)=><p key={i}>{a.en} — {a.why}</p>)}</div></div>}
   <p><small>Read from your photo by Claude. It can misread a menu, and it cannot tell you what is in a dish — <strong>confirm anything allergy-related with the staff</strong>. Prices and availability are whatever the menu says on the day. <strong>See a picture</strong> looks the dish up on Wikipedia and shows a photograph of it in general: what arrives at this restaurant may look nothing like it. <strong>See ingredients</strong> is what a dish of that name usually contains, worked out from the name rather than read off the menu, and the spice warnings are how the dish is normally served — a kitchen can always do it differently.</small></p>
  </>}
 </section>;
}
// One item off a shelf. The ingredients here are what the label printed, which makes them more
// use than a menu's guess — but still not a promise about what is absent.
function PacketCard({item,state,user,busy,saved,shot,open,onShow,onPicture,onIngredients,onKeep}){
 const match=FOOD.find(f=>f.id===item.matchesOurList);
 const ingredients=item.ingredients||[],allergens=item.allergens||[],warnings=item.warnings||[];
 return <>
  <article className="food-card">
   <div className="food-top"><div><strong>{item.en}</strong><small>{[item.maker,(item.forWhom||[]).join(', ')||'Anyone',item.price].filter(Boolean).join(' · ')}</small></div>
    {item.spicy&&<span className="food-score spicy" title="Likely spicy"><Flame size={14}/>spicy</span>}</div>
   {item.ja&&<p className="japanese food-ja" lang="ja">{item.ja}</p>}
   {item.what&&<p>{item.what}</p>}
   {item.why&&<p>{item.why}</p>}
   {item.spicy&&<p className={`dish-warning${item.heat==='very hot'?' fierce':''}`}><Flame size={15}/><span>
    <strong>Spicy{item.heat&&item.heat!=='none'?` · ${item.heat}`:''}.</strong> {item.spiceNote||'Taste it before you hand it to the boys.'}</span></p>}
   {!!allergens.length&&<p className="dish-warning"><AlertCircle size={15}/><span><strong>The label names these allergens:</strong> {allergens.join(', ')}.</span></p>}
   {item.howTo&&<p><small><strong>How to have it:</strong> {item.howTo}</small></p>}
   {match&&<small className="menu-match"><Check size={14}/> On our list already as {match.en}{triedFood(state,match.id).Nate?' — Nate has tried it':''}</small>}
   <div className="row wrap">
    {item.ja&&<button onClick={onShow}><Languages size={16}/>Show someone</button>}
    <button aria-expanded={!!shot} onClick={onPicture}><ImageIcon size={16}/>{shot?'Hide the picture':'See a picture'}</button>
    {!!ingredients.length&&<button aria-expanded={!!open} onClick={onIngredients}><List size={16}/>{open?'Hide ingredients':'See ingredients'}</button>}
    {!match&&user.role==='parent'&&<button disabled={busy||saved} onClick={onKeep}><Plus size={16}/>{saved?'Saved':'Keep this'}</button>}
   </div>
   {shot&&<figure className="dish-picture">
    {shot.loading&&<p><small>Looking for a picture…</small></p>}
    {shot.error&&<p><small><AlertCircle size={14}/> {shot.error}</small></p>}
    {shot.found&&<><img src={shot.found.src} alt={`${item.en}, as pictured on Wikipedia`} loading="lazy"/>
     <figcaption><small>A picture of <span lang={shot.found.language}>{shot.found.title}</span> from Wikipedia — this kind of food in general, not this packet. <a href={shot.found.page} target="_blank" rel="noopener noreferrer">The page it came from</a></small></figcaption></>}
    {shot.found===null&&<p><small>No picture of this one on Wikipedia. <a href={imageSearchUrl(item.dish||item.ja||item.en)} target="_blank" rel="noopener noreferrer">Search the web for one</a>.</small></p>}
   </figure>}
   {open&&<div className="dish-ingredients">
    <strong>What the label says is in it</strong>
    <ul>{ingredients.map((what,n)=><li key={n}>{what}</li>)}</ul>
    <small>Translated from the label in your photo, and a translation can slip. A label only has to name some allergens and says nothing about shared equipment, so this cannot tell you what it is <em>free</em> of: <strong>check anything allergy-related with the staff or the maker</strong>.</small>
   </div>}
  </article>
  {!!warnings.length&&<div className="callout menu-avoid"><AlertCircle size={18}/><div><strong>Worth knowing before you hand it over</strong>{warnings.map((w,i)=><p key={i}>{w}</p>)}</div></div>}
  {!ingredients.length&&<p className="menu-note">The ingredients were not in the photo. Turn the packet over and photograph the back to see what the label says is in it.</p>}
  <p><small>Read from your photo by Claude. It can misread a label, and a missing allergen is never proof it is not there — <strong>confirm anything allergy-related with the staff or the maker</strong>. <strong>See a picture</strong> shows this kind of food in general from Wikipedia, not this product.</small></p>
 </>;
}
