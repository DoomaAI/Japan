import React,{useState} from 'react';
import {upload} from '@vercel/blob/client';
import {Camera,Trash2,ShoppingBag,PiggyBank,MapPin,Tag,X,Plus} from 'lucide-react';
import {shrinkPhoto} from './MenuReader.jsx';
import {SHORTLIST_STATUS,shortlistStatusLabel,shortlistFor,shortlistTotals,shortlistTags,yenPerAud,yenToAud} from './trip-features.js';
import {dayLabel} from './AdventurePages.jsx';
import {japanClock} from './timing.js';
export const shortlistPhotoUrl=s=>`/api/shortlist?id=${encodeURIComponent(s.id)}`;
const yen=n=>`¥${Math.round(n||0).toLocaleString('en-AU')}`;
// Both figures, the way every other price in the app is shown: yen is what the ticket says while
// you are standing in front of it, dollars is what decides whether it comes home.
const both=(n,rate)=>`${yen(n)} · ≈$${yenToAud(n||0,rate).toFixed(2)}`;
const mapSearch=s=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.shop,s.place].filter(Boolean).join(' ')+' Japan')}`;
const splitTags=v=>[...new Set(String(v||'').split(',').map(t=>t.trim()).filter(Boolean))];
// A find, and what has been decided about it. The picture is the point of the card — it is the
// thing itself, which is what nobody can describe three days later — so it is first and it is
// large, and the words sit underneath it rather than beside it.
function Find({item,user,parent,busy,mutate,photo,drop,edit,onTag,rate}){
 // A find still waiting on signal has no id the trip knows yet, so nothing that names one by id
 // — a photograph, a decision, the bin — is offered on it until it has synced.
 const held=!!item.pending,mine=(parent||item.addedBy===user.name)&&!held;
 return <article className={`feature-card find ${item.status}`}>
  {item.photo
   ? <div className="find-photo"><img loading="lazy" src={shortlistPhotoUrl(item)} alt={item.title}/>
      {mine&&<div className="find-photo-actions">
       <label className="menu-shoot button">Replace<input type="file" accept="image/*" disabled={busy} onChange={e=>{photo(item,e.target.files?.[0]);e.target.value='';}}/></label>
       <button type="button" className="danger" disabled={busy} aria-label={`Remove the photo of ${item.title}`} onClick={()=>drop(item)}><X size={14}/></button>
      </div>}
     </div>
   : mine&&<label className="menu-shoot button find-shoot"><Camera size={16}/> Add a photo
      <input type="file" accept="image/*" disabled={busy} onChange={e=>{photo(item,e.target.files?.[0]);e.target.value='';}}/></label>}
  <h2>{item.title}</h2>
  <p>{item.price===null||item.price===undefined?<em>No price written down</em>:both(item.price,rate)}{item.person!=='Family'&&` · for ${item.person}`}</p>
  {(item.shop||item.place)&&<p className="find-where"><MapPin size={15}/> {[item.shop,item.place].filter(Boolean).join(' · ')}</p>}
  <small>{item.day?`Seen ${dayLabel(item.day)}`:'Day not noted'} · added by {item.addedBy}</small>
  {item.notes&&<p>{item.notes}</p>}
  {held&&<small>Saved on this phone. It joins the family shortlist — and can be photographed — as soon as there is signal.</small>}
  {!!item.tags?.length&&<div className="row wrap">{item.tags.map(t=><button className="tag" key={t} onClick={()=>onTag(t)}><Tag size={11}/>{t}</button>)}</div>}
  {!held&&<div className="segmented find-decision" role="group" aria-label={`Where we got to on ${item.title}`}>{SHORTLIST_STATUS.map(([id,label])=>
   <button key={id} className={item.status===id?'selected':''} disabled={busy}
    aria-pressed={item.status===id} onClick={()=>mutate({type:'shortlistStatus',id:item.id,status:id,by:user.name})}>{label}</button>)}</div>}
  {item.decidedBy&&<small>{shortlistStatusLabel(item.status)} · {item.decidedBy}{item.decidedAt?` · ${japanClock(new Date(item.decidedAt))} JST`:''}</small>}
  <div className="row wrap">
   <a href={mapSearch(item)} target="_blank" rel="noreferrer">Find the shop</a>
   {mine&&<><button onClick={()=>edit(item)}>Edit</button>
    <button className="danger" disabled={busy} onClick={()=>{if(confirm(`Take ${item.title} off the shortlist?`))mutate({type:'shortlistRemove',id:item.id});}}><Trash2 size={14}/></button></>}
  </div>
 </article>;
}
// Things we have seen in a shop and not bought. The shopping list is what we decided to buy
// before we left; this is everything we walked past and could not decide about on the spot, kept
// with the one thing that makes it decidable later — a photograph of it — plus which shop, where
// that shop was, what the ticket said and a couple of words for what it is.
export default function Shortlist({state,user,day,config,busy,setBusy,mutate,request,accept,notice,go,initialId}){
 // Arrived here from the one search box: open on the find that was searched for rather than on
 // the whole list with it somewhere down it.
 const initial=(state.shortlist||[]).find(s=>s.id===initialId);
 const [query,setQuery]=useState(initial?.title||''),[person,setPerson]=useState(''),[status,setStatus]=useState(''),[date,setDate]=useState(''),[tag,setTag]=useState('');
 const [edit,setEdit]=useState(null),[working,setWorking]=useState(''),[chosen,setChosen]=useState('');
 // The file input is invisible under its button, so a phone that has swallowed a photograph
 // without saying so is a phone that gets the photograph taken twice. The form says which one
 // it is holding, by name.
 const openForm=next=>{setChosen('');setEdit(next);};
 const parent=user.role==='parent',rate=yenPerAud(state);
 const items=shortlistFor(state,{person,day:date,status,tag,query});
 const totals=shortlistTotals(items),tags=shortlistTags(state);
 // The photo goes up on its own, after the find itself is saved, because the two need different
 // things: the find is words and survives a dead phone in a queue, and a photograph needs signal
 // and private storage. Losing the picture must never lose the find, so the find is written first
 // and the picture is attached to it second.
 async function attach(item,file){
  if(!file)return false;
  if(!config?.uploads){notice('Photos need private file storage connected. The find is saved without one.');return false;}
  if(!navigator.onLine){notice('Adding a photo needs signal. The find is saved; photograph it when we are back on.');return false;}
  setBusy(true);setWorking('Shrinking the photo…');
  try{
   const shot=await shrinkPhoto(file,1600,0.75);
   setWorking('Saving it…');
   const blob=await upload(`shortlist/${user.id}/${crypto.randomUUID()}.jpg`,
    await (await fetch(shot.preview)).blob(),{access:'private',contentType:'image/jpeg',handleUploadUrl:'/api/upload'});
   accept(await request('shortlist',{id:item.id,pathname:blob.pathname}));
   return true;
  }catch(e){notice(e.message||'That photo could not be added. The find is still on the list.');return false;}
  finally{setBusy(false);setWorking('');}
 }
 async function dropPhoto(item){
  if(!confirm('Remove this photo? The find stays on the shortlist.'))return;
  setBusy(true);
  try{accept(await request('shortlist',{id:item.id,remove:true}));}
  catch(e){notice(e.message||'That photo could not be removed.');}
  finally{setBusy(false);}
 }
 async function save(e){
  e.preventDefault();
  const f=new FormData(e.currentTarget),file=f.get('photo');
  const fields={title:f.get('title'),person:f.get('person'),day:f.get('day')||null,shop:f.get('shop'),place:f.get('place'),
   price:f.get('price')===''?null:Number(f.get('price')),tags:splitTags(f.get('tags')),notes:f.get('notes')};
  // Which one is new is worked out from the ids we already had rather than guessed at from the
  // end of the list, because the family's phones are adding to the same list at the same time.
  const before=new Set((state.shortlist||[]).map(s=>s.id));
  const result=await mutate(edit.id?{type:'shortlistEdit',id:edit.id,...fields}:{type:'shortlistAdd',...fields,by:user.name});
  if(!result)return;
  const item=edit.id?{id:edit.id}:result?.state?.shortlist?.find(s=>!before.has(s.id));
  openForm(null);
  if(file&&file.size>0){
   if(!item){notice('Saved on this phone. Photograph it from its card once we are back on signal.');return;}
   if(await attach(item,file))notice('Added to the shortlist, with its photo.');
  }
 }
 return <>
  <p className="eyebrow">SEEN IT, NOT BOUGHT IT</p>
  <h1>Purchase shortlist</h1>
  <p>The things we have actually seen in a shop and not bought — a photo of it, which shop, whereabouts, what the ticket said and a word or two for what it is. Then we decide, once we have seen everything, rather than on the spot with two tired boys in the doorway.</p>
  <div className="row wrap">
   <button className="primary" onClick={()=>openForm({person:user.name,day:day||null})}><Plus size={16}/> Add something we have seen</button>
  </div>
  {!config?.uploads&&<p className="callout">Photos become available when private file storage is connected. Everything else on this page works without it.</p>}
  <div className="document-filters">
   <label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Thing, shop, area or note"/></label>
   <div className="form-row">
    <label>For<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Everyone</option>{['Family',...state.members].map(n=><option key={n}>{n}</option>)}</select></label>
    <label>Where we got to<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All of them</option>{SHORTLIST_STATUS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label>Day we saw it<select value={date} onChange={e=>setDate(e.target.value)}><option value="">Whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
    {!!tags.length&&<label>Tag<select value={tag} onChange={e=>setTag(e.target.value)}><option value="">Any tag</option>{tags.map(t=><option key={t}>{t}</option>)}</select></label>}
   </div>
  </div>
  <p><strong>{items.length} on the shortlist</strong> · {totals.open} still to decide{totals.openYen?` (${both(totals.openYen,rate)} if we said yes to all of them)`:''} · {totals.yes} we are getting{totals.yesYen?` (${both(totals.yesYen,rate)})`:''}{totals.bought?` · ${totals.bought} bought`:''}
   {!!totals.unpriced&&<small>{totals.unpriced} of them {totals.unpriced===1?'has':'have'} no price written down, so {totals.unpriced===1?'it is':'they are'} not in those totals.</small>}
   <small>At $1 = ¥{Math.round(rate)}.</small></p>
  {working&&<p className="callout">{working}</p>}
  <div className="feature-grid">{items.map(s=>
   <Find key={s.id} item={s} user={user} parent={parent} busy={busy} mutate={mutate}
    photo={attach} drop={dropPhoto} edit={openForm} onTag={setTag} rate={rate}/>)}</div>
  {!items.length&&<div className="empty"><Camera size={30}/><h3>Nothing on the shortlist yet</h3><p>{query||person||status||date||tag?'Nothing matches those filters.':'Next time we walk out of a shop still thinking about something, photograph it here.'}</p></div>}
  {edit&&<form key={edit.id||'new'} className="feature-card" onSubmit={save}>
   <h2>{edit.id?'Edit this find':'Something we have seen'}</h2>
   <label>What is it<input name="title" required maxLength={250} defaultValue={edit.title||''} placeholder="Blue kitsune mask"/></label>
   <div className="form-row">
    <label>For<select name="person" defaultValue={edit.person||'Family'}>{['Family',...state.members].map(n=><option key={n}>{n}</option>)}</select></label>
    <label>Price on the ticket (yen)<input name="price" type="number" min="0" max="10000000" step="1" defaultValue={edit.price??''}/></label>
    <label>Day we saw it<select name="day" defaultValue={edit.day||''}><option value="">Not noted</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
   </div>
   <label>Shop<input name="shop" maxLength={250} defaultValue={edit.shop||''} placeholder="Nakamise-dori stall, third on the left"/></label>
   <label>Whereabouts<input name="place" maxLength={250} defaultValue={edit.place||''} placeholder="Asakusa, near the temple gate"/></label>
   <label>Tags, separated by commas<input name="tags" maxLength={1200} defaultValue={(edit.tags||[]).join(', ')} placeholder="present, ceramics, for Grandma"/></label>
   <label>Notes<textarea name="notes" maxLength={2000} defaultValue={edit.notes||''} placeholder="Size, colour, whether they had another one, what the shop said"/></label>
   {!edit.id&&<label className="menu-shoot button"><Camera size={16}/> {chosen?`Photo chosen · ${chosen}`:'Photograph it, or choose one already taken'}
    <input type="file" name="photo" accept="image/*" disabled={busy||!config?.uploads} onChange={e=>setChosen(e.target.files?.[0]?.name||'')}/></label>}
   {!edit.id&&<p><small>The photo is optional and can be added later from the card. The find itself saves with no signal; the photo needs one.</small></p>}
   <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save changes':'Add to the shortlist'}</button>
    <button type="button" onClick={()=>openForm(null)}>Cancel</button></div>
  </form>}
  {go&&<>
   <p className="callout"><ShoppingBag size={18}/><span>Things we decided to buy before we left — with budgets, quantities and a link — are on the <button onClick={()=>go('shopping')}>Shopping list</button>. This page is what we found once we got here.</span></p>
   <p className="callout"><PiggyBank size={18}/><span>What the boys are buying out of their own money is counted on <button onClick={()=>go('spending')}>Spending money</button>, against what they actually have left.</span></p>
  </>}
 </>;
}
