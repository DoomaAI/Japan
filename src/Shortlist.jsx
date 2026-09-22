import React,{useEffect,useRef,useState} from 'react';
import {upload} from '@vercel/blob/client';
import {Camera,Trash2,ShoppingBag,PiggyBank,MapPin,Tag,X,Plus,CalendarDays,ChevronRight,Star,LocateFixed,AlertCircle} from 'lucide-react';
import {shrinkPhoto} from './MenuReader.jsx';
import {SHORTLIST_STATUS,SHORTLIST_SORTS,SHORTLIST_STARS,shortlistStatusLabel,shortlistFor,shortlistTotals,shortlistTags,
 shortlistStep,shortlistPlace,shortlistDay,shortlistWhere,shortlistPin,shortlistRating,shoppedAlready,
 PIN_PLACES,pinText,yenPerAud,yenToAud} from './trip-features.js';
import {askPhoneWhereItIs} from './geo.js';
import {locationDirections} from './locations.js';
import {dayLabel} from './AdventurePages.jsx';
import {japanClock} from './timing.js';
export const shortlistPhotoUrl=s=>`/api/shortlist?id=${encodeURIComponent(s.id)}`;
const yen=n=>`¥${Math.round(n||0).toLocaleString('en-AU')}`;
// Both figures, the way every other price in the app is shown: yen is what the ticket says while
// you are standing in front of it, dollars is what decides whether it comes home.
const both=(n,rate)=>`${yen(n)} · ≈$${yenToAud(n||0,rate).toFixed(2)}`;
const splitTags=v=>[...new Set(String(v||'').split(',').map(t=>t.trim()).filter(Boolean))];
// Getting back to it. A place off the trip's own map has a real address, so it gets real walking
// directions; anything else is the best search we can build out of what was actually written down.
export function findMap(state,item){
 // A position the phone was standing in beats every name written down, because it cannot be
 // misread, mistranslated or half-remembered — so if there is one, that is where we walk to.
 const pin=shortlistPin(item);
 if(pin)return `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}&travelmode=walking`;
 const place=shortlistPlace(state,item);
 if(place)return locationDirections(place,'walking');
 const step=shortlistStep(state,item);
 const words=[item.shop,item.place,step?.place||step?.title].filter(Boolean).join(' ')||item.title;
 return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(words+' Japan')}`;
}
// One dropdown for the one question a find really has to answer: where was it? An activity on the
// timeline — "the one by the temple, on the Nara day" — or a place off the trip's own map, which
// is what gets an address and directions back to it. Not both: two answers to one question is a
// card that can disagree with itself. The shop's own name is typed separately, because a stall
// inside Nakamise-dori is not Nakamise-dori.
export function AnchorSelect({state,value,onChange,name}){
 const cities=[...new Set((state.locations||[]).map(l=>l.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 return <select name={name} value={value} onChange={onChange} aria-label="Where were we?">
  <option value="">Nowhere in particular</option>
  <optgroup label="Something on the plan">
   {state.days.flatMap(d=>state.steps.filter(s=>s.day===d.date)
    .map(s=><option key={s.id} value={`step:${s.id}`}>{dayLabel(d.date)} · {s.time?`${s.time} `:''}{s.title}</option>))}
  </optgroup>
  {cities.map(city=><optgroup key={city} label={`Places in ${city}`}>
   {(state.locations||[]).filter(l=>l.city===city).map(l=>
    <option key={l.id} value={`loc:${l.id}`}>{l.name}{l.district?` · ${l.district}`:''}</option>)}
  </optgroup>)}
 </select>;
}
// How much we want it, which is the question a price cannot answer and the one that actually
// decides between two things we can only afford one of. Nought to five, and tapping the star
// already showing takes the answer back rather than leaving one nobody meant to give.
export function Stars({value,onRate,disabled,label}){
 return <span className="stars" role="group" aria-label={label}>{Array.from({length:SHORTLIST_STARS},(_,i)=>i+1).map(n=>
  <button key={n} type="button" className={`star${n<=value?' on':''}`} disabled={disabled}
   aria-label={`${n} star${n>1?'s':''}`} aria-pressed={n===value}
   onClick={()=>onRate(n===value?0:n)}><Star size={18}/></button>)}</span>;
}
export const anchorValue=item=>item?.stepId?`step:${item.stepId}`:item?.locationId?`loc:${item.locationId}`:'';
export const readAnchor=v=>({stepId:String(v||'').startsWith('step:')?String(v).slice(5):null,
 locationId:String(v||'').startsWith('loc:')?String(v).slice(4):null});
// A find, and what has been decided about it. The picture is the point of the card — it is the
// thing itself, which is what nobody can describe three days later — so it is first and it is
// large, and the words sit underneath it rather than beside it.
export function Find({item,state,user,parent,busy,mutate,photo,drop,edit,onTag,onPin,rate,go}){
 const stars=shortlistRating(item)??0,pin=shortlistPin(item);
 // A find still waiting on signal has no id the trip knows yet, so nothing that names one by id
 // — a photograph, a decision, the bin — is offered on it until it has synced.
 const held=!!item.pending,mine=(parent||item.addedBy===user.name)&&!held;
 const step=shortlistStep(state,item),place=shortlistPlace(state,item),seen=shortlistDay(state,item);
 const where=shortlistWhere(state,item);
 // Deciding to get it is the moment it stops being a shortlist question and becomes shopping, so
 // the card offers the shopping list exactly then, and stops offering it once it has gone across.
 const shopped=!held&&shoppedAlready(state,item);
 const toShop=!held&&['yes','bought'].includes(item.status)&&!shopped;
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
  {!!where.length&&<p className="find-where"><MapPin size={15}/> {where.join(' · ')}</p>}
  {pin&&<small className="find-where"><LocateFixed size={14}/> Pinned where we stood · {pinText(pin)} · walking directions come back here</small>}
  {(step||place)&&<button className="find-pin" onClick={()=>onPin?.(item)}>
   {step?<><CalendarDays size={14}/>{step.time?`${step.time} · `:''}{step.title}</>
        :<><MapPin size={14}/>{place.name}{place.district?` · ${place.district}`:''}</>}
   <ChevronRight size={14}/></button>}
  <small>{seen?`Seen ${dayLabel(seen)}`:'Day not noted'} · added by {item.addedBy}</small>
  {item.notes&&<p>{item.notes}</p>}
  {held&&<small>Saved on this phone. It joins the family shortlist — and can be photographed — as soon as there is signal.</small>}
  {!!item.tags?.length&&<div className="row wrap">{item.tags.map(t=><button className="tag" key={t} onClick={()=>onTag?.(t)}><Tag size={11}/>{t}</button>)}</div>}
  {!held&&<div className="find-want">
   <span>How much we want it</span>
   <Stars value={stars} disabled={busy} label={`How much we want ${item.title}`}
    onRate={n=>mutate({type:'shortlistRating',id:item.id,rating:n})}/>
   <small>{stars?`${stars} of ${SHORTLIST_STARS}`:'Not rated yet'}</small>
  </div>}
  {held&&!!stars&&<small className="find-want-held"><Star size={13}/> {stars} of {SHORTLIST_STARS}</small>}
  {!held&&<div className="segmented find-decision" role="group" aria-label={`Where we got to on ${item.title}`}>{SHORTLIST_STATUS.map(([id,label])=>
   <button key={id} className={item.status===id?'selected':''} disabled={busy}
    aria-pressed={item.status===id} onClick={()=>mutate({type:'shortlistStatus',id:item.id,status:id,by:user.name})}>{label}</button>)}</div>}
  {item.decidedBy&&<small>{shortlistStatusLabel(item.status)} · {item.decidedBy}{item.decidedAt?` · ${japanClock(new Date(item.decidedAt))} JST`:''}</small>}
  {toShop&&<button className="find-toshop" disabled={busy}
   onClick={()=>mutate({type:'shortlistShop',id:item.id})}><ShoppingBag size={15}/>Put it on the shopping list</button>}
  {shopped&&<small className="find-shopped"><ShoppingBag size={13}/> On the shopping list{go&&<> · <button className="linkish" onClick={()=>go('shopping',null,item.shoppingId)}>open it</button></>}</small>}
  <div className="row wrap">
   <a href={findMap(state,item)} target="_blank" rel="noreferrer">{pin||place?'Walk there':'Find the shop'}</a>
   {mine&&<><button onClick={()=>edit(item)}>Edit</button>
    <button className="danger" disabled={busy} onClick={()=>{if(confirm(`Take ${item.title} off the shortlist?`))mutate({type:'shortlistRemove',id:item.id});}}><Trash2 size={14}/></button></>}
  </div>
 </article>;
}
// What we saw on this day, on this day's own screen — pinned to one of its activities, or simply
// written down on it. A strip of photographs rather than the cards: standing in the city it is in,
// the useful thing is seeing there is something to go back for, not reading the whole list again.
export function DayFinds({state,day,go}){
 const list=shortlistFor(state,{day,sort:'decide'});
 if(!list.length)return null;
 const open=list.filter(s=>s.status==='thinking').length;
 return <section className="day-finds" aria-label="Things we saw on this day">
  <div className="section-heading">
   <div><p className="eyebrow">SEEN IT, NOT BOUGHT IT</p>
    <h2>{list.length} {list.length===1?'thing':'things'} we saw on this day</h2></div>
   {go&&<button onClick={()=>go('shortlist')}>Shortlist<ChevronRight size={16}/></button>}
  </div>
  <p><small>{open?`${open} still to decide about.`:'All decided.'}</small></p>
  <div className="day-find-strip">{list.slice(0,8).map(s=>
   <button key={s.id} className="day-find" onClick={()=>go?.('shortlist',null,s.id)}>
    {s.photo
     ? <img loading="lazy" src={shortlistPhotoUrl(s)} alt={s.title}/>
     : <span className="day-find-noshot"><Camera size={18}/></span>}
    <strong>{s.title}</strong>
    <small>{shortlistWhere(state,s)[0]||shortlistStatusLabel(s.status)}</small>
   </button>)}</div>
 </section>;
}
// Things we have seen in a shop and not bought. The shopping list is what we decided to buy
// before we left; this is everything we walked past and could not decide about on the spot, kept
// with the one thing that makes it decidable later — a photograph of it — plus which shop, where
// that shop was, what the ticket said and a couple of words for what it is.
export default function Shortlist({state,user,day,config,busy,setBusy,mutate,request,accept,notice,go,selectStep,initialId}){
 // Arrived here from the one search box, or from a day's own screen: open on the find that was
 // asked for rather than on the whole list with it somewhere down it.
 const initial=(state.shortlist||[]).find(s=>s.id===initialId);
 const [query,setQuery]=useState(initial?.title||''),[person,setPerson]=useState(''),[status,setStatus]=useState(''),[date,setDate]=useState(''),[tag,setTag]=useState('');
 const [sort,setSort]=useState('decide'),[anchor,setAnchor]=useState(''),[least,setLeast]=useState('');
 const [edit,setEdit]=useState(null),[working,setWorking]=useState(''),[chosen,setChosen]=useState('');
 const [stars,setStars]=useState(0),[pin,setPin]=useState(null),[locating,setLocating]=useState(false),[geoTrouble,setGeoTrouble]=useState('');
 const form=useRef(null);
 // The file input is invisible under its button, so a phone that has swallowed a photograph
 // without saying so is a phone that gets the photograph taken twice. The form says which one
 // it is holding, by name.
 const openForm=next=>{setChosen('');setGeoTrouble('');setAnchor(anchorValue(next));
  setStars(shortlistRating(next)??0);setPin(shortlistPin(next));setEdit(next);};
 // The form is the whole reason the button exists, so opening it has to be something you can
 // see happen. On a phone the list is longer than the screen and a form appended below it is a
 // button that does nothing: it opens somewhere nobody is looking. So the form comes to the
 // person — it sits at the top of the page, under the button that asked for it, and the page
 // goes to it and puts the cursor in the first field.
 useEffect(()=>{
  if(!edit||!form.current)return;
  form.current.scrollIntoView({behavior:'smooth',block:'start'});
  form.current.querySelector('input[name="title"]')?.focus({preventScroll:true});
 },[edit]);
 // Standing in front of the thing is the one moment its position is free, and the address of a
 // stall in a covered arcade is the one part of this form nobody can fill in. So the phone
 // answers it, exactly as it does for a stop on the day.
 async function pinHere(){
  setLocating(true);setGeoTrouble('');
  try{setPin(await askPhoneWhereItIs(PIN_PLACES));}
  catch(e){setGeoTrouble(`${e.message}. Say where we were with the dropdown below instead.`);}
  finally{setLocating(false);}
 }
 const parent=user.role==='parent',rate=yenPerAud(state);
 const filtered=!!(query||person||status||date||tag||least);
 const items=shortlistFor(state,{person,day:date,status,tag,query,sort,rating:least});
 const totals=shortlistTotals(items),tags=shortlistTags(state);
 const everything=(state.shortlist||[]).length;
 // Following a pin back to whatever it was pinned to: an activity opens that activity on its own
 // day, a place opens the map list. A pin is only worth having if it goes somewhere.
 function followPin(item){
  const step=shortlistStep(state,item);
  if(step&&selectStep)selectStep(step);
  else if(step)go?.('today',step.day);
  else go?.('places');
 }
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
   price:f.get('price')===''?null:Number(f.get('price')),tags:splitTags(f.get('tags')),notes:f.get('notes'),
   rating:stars||null,pin:pin||null,...readAnchor(anchor)};
  // Which one is new is worked out from the ids we already had rather than guessed at from the
  // end of the list, because the family's phones are adding to the same list at the same time.
  const before=new Set((state.shortlist||[]).map(s=>s.id));
  const result=await mutate(edit.id?{type:'shortlistEdit',id:edit.id,...fields}:{type:'shortlistAdd',...fields,by:user.name});
  if(!result)return;
  const item=edit.id?{id:edit.id}:result?.state?.shortlist?.find(s=>!before.has(s.id));
  openForm(null);
  if(file&&file.size>0){
   if(!item){notice('Saved on this phone. Photograph it from its card once we are back on signal.');return;}
   if(await attach(item,file))notice(edit.id?'Saved, with its photo.':'Added to the shortlist, with its photo.');
  }
 }
 return <>
  <p className="eyebrow">SEEN IT, NOT BOUGHT IT</p>
  <h1>Purchase shortlist</h1>
  <p>The things we have actually seen in a shop and not bought — a photo of it, which shop, whereabouts, what the ticket said and a word or two for what it is. Pin one to the place we were at or the activity we were on, and it comes back on that day’s screen. Then we decide, once we have seen everything, rather than on the spot with two tired boys in the doorway.</p>
  <div className="row wrap">
   <button className="primary" onClick={()=>openForm({person:user.name,day:day||null})}><Plus size={16}/> Add something we have seen</button>
   {filtered&&<button onClick={()=>{setQuery('');setPerson('');setStatus('');setDate('');setTag('');setLeast('');}}>Browse all {everything}</button>}
  </div>
  {!config?.uploads&&<p className="callout">Photos become available when private file storage is connected. Everything else on this page works without it.</p>}
  {edit&&<form ref={form} key={edit.id||'new'} className="feature-card find-form" onSubmit={save}>
   <h2>{edit.id?'Edit this find':'Something we have seen'}</h2>
   <label>What is it<input name="title" required maxLength={250} defaultValue={edit.title||''} placeholder="Blue kitsune mask"/></label>
   <div className="form-row">
    <label>For<select name="person" defaultValue={edit.person||'Family'}>{['Family',...state.members].map(n=><option key={n}>{n}</option>)}</select></label>
    <label>Price on the ticket (yen)<input name="price" type="number" min="0" max="10000000" step="1" defaultValue={edit.price??''}/></label>
   </div>
   <div className="find-want">
    <span>How much we want it</span>
    <Stars value={stars} disabled={busy} label="How much we want it" onRate={setStars}/>
    <small>{stars?`${stars} of ${SHORTLIST_STARS}`:'Optional — and it can be changed from the card'}</small>
   </div>
   <label>Shop<input name="shop" maxLength={250} defaultValue={edit.shop||''} placeholder="Nakamise-dori stall, third on the left"/></label>
   <label>Where were we?<AnchorSelect state={state} name="anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}/></label>
   <p><small>Pin it to what we were doing at the time, or to a place off our own map, and it comes back on that day’s screen. A place off the map gets walking directions back to it later.</small></p>
   {!anchor.startsWith('step:')&&<label>Day we saw it<select name="day" defaultValue={edit.day||''}><option value="">Not noted</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>}
   <label>Whereabouts<input name="place" maxLength={250} defaultValue={edit.place||''} placeholder="Asakusa, near the temple gate"/></label>
   <div className="pin-row">
    <button type="button" disabled={busy||locating} onClick={pinHere}><LocateFixed size={18}/>{locating?'Finding you…':pin?'Move the pin to where I am now':'Pin where we are standing'}</button>
    {pin&&<span className="tag pin-tag"><MapPin size={13}/>{pinText(pin)}<button type="button" aria-label="Remove the pinned position" onClick={()=>setPin(null)}><X size={14}/></button></span>}
   </div>
   {geoTrouble
    ? <p className="callout"><AlertCircle size={18}/>{geoTrouble}</p>
    : <p><small>A stall in a covered arcade has no address anybody can read off it, so the phone says where it is instead. It asks before sharing, the position is rounded to about ten metres, and walking directions back to this find go to the pin rather than to the words above.</small></p>}
   <label>Tags, separated by commas<input name="tags" maxLength={1200} defaultValue={(edit.tags||[]).join(', ')} placeholder="present, ceramics, for Grandma"/></label>
   <label>Notes<textarea name="notes" maxLength={2000} defaultValue={edit.notes||''} placeholder="Size, colour, whether they had another one, what the shop said"/></label>
   <label className="menu-shoot button"><Camera size={16}/> {chosen?`Photo chosen · ${chosen}`:edit.photo?'Replace the photo':'Photograph it, or choose one already taken'}
    <input type="file" name="photo" accept="image/*" disabled={busy||!config?.uploads} onChange={e=>setChosen(e.target.files?.[0]?.name||'')}/></label>
   <p><small>{config?.uploads
    ?'The photo is optional and can be added or replaced later from the card. The find itself saves with no signal; the photo needs one.'
    :'Photos need private file storage connected. Everything else on this form saves without it.'}</small></p>
   <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save changes':'Add to the shortlist'}</button>
    <button type="button" onClick={()=>openForm(null)}>Cancel</button></div>
  </form>}
  <div className="document-filters">
   <label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Thing, shop, area or note"/></label>
   <div className="form-row">
    <label>Order<select value={sort} onChange={e=>setSort(e.target.value)}>{SHORTLIST_SORTS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label>For<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Everyone</option>{['Family',...state.members].map(n=><option key={n}>{n}</option>)}</select></label>
    <label>Where we got to<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All of them</option>{SHORTLIST_STATUS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label>Day we saw it<select value={date} onChange={e=>setDate(e.target.value)}><option value="">Whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
    <label>How much we want it<select value={least} onChange={e=>setLeast(e.target.value)}><option value="">Any</option>{Array.from({length:SHORTLIST_STARS},(_,i)=>SHORTLIST_STARS-i).map(n=><option key={n} value={n}>{n} {n===1?'star':'stars'} or more</option>)}</select></label>
    {!!tags.length&&<label>Tag<select value={tag} onChange={e=>setTag(e.target.value)}><option value="">Any tag</option>{tags.map(t=><option key={t}>{t}</option>)}</select></label>}
   </div>
  </div>
  <p><strong>{items.length}{filtered?` of ${everything}`:''} on the shortlist</strong> · {totals.open} still to decide{totals.openYen?` (${both(totals.openYen,rate)} if we said yes to all of them)`:''} · {totals.yes} we are getting{totals.yesYen?` (${both(totals.yesYen,rate)})`:''}{totals.bought?` · ${totals.bought} bought`:''}
   {!!totals.unpriced&&<small>{totals.unpriced} of them {totals.unpriced===1?'has':'have'} no price written down, so {totals.unpriced===1?'it is':'they are'} not in those totals.</small>}
   <small>At $1 = ¥{Math.round(rate)}.</small></p>
  {working&&<p className="callout">{working}</p>}
  <div className="feature-grid">{items.map(s=>
   <Find key={s.id} item={s} state={state} user={user} parent={parent} busy={busy} mutate={mutate} go={go}
    photo={attach} drop={dropPhoto} edit={openForm} onTag={setTag} onPin={followPin} rate={rate}/>)}</div>
  {!items.length&&<div className="empty"><Camera size={30}/><h3>Nothing on the shortlist{filtered?' matches':' yet'}</h3><p>{filtered?'Try Browse all, or a different order.':'Next time we walk out of a shop still thinking about something, photograph it here.'}</p></div>}
  {go&&<>
   <p className="callout"><ShoppingBag size={18}/><span>Once we have said we are getting something, it goes across to the <button onClick={()=>go('shopping')}>Shopping list</button> — the page with the budget, the quantity and the tick — from its own card.</span></p>
   <p className="callout"><PiggyBank size={18}/><span>What the boys are buying out of their own money is counted on <button onClick={()=>go('spending')}>Spending money</button>, against what they actually have left.</span></p>
  </>}
 </>;
}
