import React,{useState} from 'react';
import {Check,Star,Languages,Plus,Trash2,Copy,AlertCircle} from 'lucide-react';
import {FOOD,FOOD_KINDS,FOOD_KIND_LABEL,ORDERING} from './food-data.js';
import {triedFood,foodRatings,foodAverage,isFavourite,FAVOURITE_AT} from './trip-features.js';
export const allFood=state=>[...FOOD,...(state.foodItems||[]).map(i=>({...i,custom:true}))];
function Stars({value,onRate,disabled,label}){
 return <span className="stars" role="group" aria-label={label}>{[1,2,3,4,5].map(n=>
  <button key={n} type="button" className={`star${n<=value?' on':''}`} disabled={disabled} aria-label={`${n} star${n>1?'s':''}`} aria-pressed={n===value}
   onClick={()=>onRate(n===value?0:n)}><Star size={17}/></button>)}</span>;
}
export default function FoodList({state,user,mutate,busy,notice,show}){
 const [kind,setKind]=useState(''),[only,setOnly]=useState(''),[query,setQuery]=useState(''),[edit,setEdit]=useState(null);
 const parent=user.role==='parent',items=allFood(state);
 const list=items.filter(i=>(!kind||i.kind===kind)
  &&(only!=='tried'||Object.keys(triedFood(state,i.id)).length)
  &&(only!=='todo'||!Object.keys(triedFood(state,i.id)).length)
  &&(only!=='loved'||isFavourite(state,i.id))
  &&[i.en,i.ja,i.romaji,i.note].join(' ').toLowerCase().includes(query.toLowerCase()));
 const tallies=items.filter(i=>Object.keys(triedFood(state,i.id)).length).length;
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const op={type:edit.id?'foodEdit':'foodAdd',id:edit.id,en:f.get('en'),ja:f.get('ja'),romaji:f.get('romaji'),kind:f.get('kind'),note:f.get('note')};
  if(await mutate(op))setEdit(null);
 }
 return <>
  <p className="callout"><AlertCircle size={18}/>The Japanese is how a dish is usually written on a menu, as a helper for reading and pointing. Menus vary and shops write things their own way. <strong>Anything allergy-related must be confirmed with the restaurant, not with this list.</strong></p>
  <div className="quest-progress"><strong>{tallies} / {items.length} tried</strong><progress max={items.length} value={tallies}/><span>Rate what you eat. Four stars or more and it lands in Our favourites.</span></div>
  <div className="document-filters">
   <label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Dish, Japanese or note"/></label>
   <div className="form-row">
    <label>Group<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Everything</option>{FOOD_KINDS.map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label>
    <label>Show<select value={only} onChange={e=>setOnly(e.target.value)}><option value="">All</option><option value="todo">Not tried yet</option><option value="tried">Tried</option><option value="loved">Our favourites</option></select></label>
   </div>
  </div>
  {parent&&<button className="button" onClick={()=>setEdit({kind:'meal'})}><Plus size={18}/>Add something we like</button>}
  {edit&&<form className="feature-card" key={edit.id||'new'} onSubmit={save}>
   <h2>{edit.id?'Edit this dish':'Something we like'}</h2>
   <label>English name<input name="en" required maxLength={200} defaultValue={edit.en||''} placeholder="Chicken katsu, no sauce"/></label>
   <label>Japanese (to show at the counter)<input name="ja" maxLength={200} defaultValue={edit.ja||''} placeholder="チキンカツ"/></label>
   <label>How to say it<input name="romaji" maxLength={200} defaultValue={edit.romaji||''} placeholder="chikin katsu"/></label>
   <label>Group<select name="kind" defaultValue={edit.kind}>{FOOD_KINDS.map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label>
   <label>Note<textarea name="note" maxLength={2000} defaultValue={edit.note||''} placeholder="Where we had it, what to ask for"/></label>
   <div className="row wrap"><button className="primary" disabled={busy}>Save</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button></div>
  </form>}
  <div className="food-list">{list.map(item=>{
   const tried=triedFood(state,item.id),ratings=foodRatings(state,item.id),average=foodAverage(state,item.id);
   return <article className={`food-card${Object.keys(tried).length?' tried':''}${isFavourite(state,item.id)?' loved':''}`} key={item.id}>
    <div className="food-top">
     <div><strong>{item.en}</strong><small>{FOOD_KIND_LABEL(item.kind)}{item.custom?' · ours':''}</small></div>
     {average!==null&&<span className="food-score" title={`${Object.keys(ratings).length} rating(s)`}><Star size={14}/>{average}</span>}
    </div>
    {item.ja&&<p className="japanese food-ja" lang="ja">{item.ja}</p>}
    {item.romaji&&<small className="food-romaji">{item.romaji}</small>}
    {item.note&&<p>{item.note}</p>}
    <div className="food-people">{state.members.map(n=>
     <div className="food-person" key={n}>
      <button className={`rider${tried[n]?' on':''}`} disabled={busy||(!parent&&n!==user.name)} aria-pressed={!!tried[n]}
       onClick={()=>mutate({type:'foodTried',itemId:item.id,person:n,done:!tried[n]})}>{tried[n]&&<Check size={14}/>}{n}</button>
      <Stars value={ratings[n]||0} disabled={busy||(!parent&&n!==user.name)} label={`${n}’s rating for ${item.en}`}
       onRate={rating=>mutate({type:'foodRating',itemId:item.id,person:n,rating})}/>
     </div>)}</div>
    <div className="row wrap">
     {item.ja&&<button onClick={()=>show({type:'foodcard',item})}><Languages size={16}/>Show someone</button>}
     {parent&&item.custom&&<><button onClick={()=>setEdit(item)}>Edit</button><button className="danger" onClick={()=>{if(confirm('Remove this from our food list?'))mutate({type:'foodRemove',id:item.id});}}><Trash2 size={15}/>Remove</button></>}
    </div>
   </article>;})}</div>
  {!list.length&&<div className="empty"><p>Nothing matches that. Try another group, or add something we like.</p></div>}
  <details className="ordering">
   <summary>Asking for it — {ORDERING.length} phrases</summary>
   <p>Tap a phrase to copy it, or hold your phone up and let someone read it.</p>
   {ORDERING.map(o=><div className="phrase" key={o.id}>
    <div><strong>{o.en}</strong><p className="japanese small" lang="ja">{o.ja}</p><small>{o.romaji}</small></div>
    <button onClick={()=>navigator.clipboard.writeText(o.ja).then(()=>notice('Copied in Japanese.')).catch(()=>notice('Select the Japanese to copy it.'))}><Copy size={15}/>Copy</button>
   </div>)}
  </details>
 </>;
}
export function FoodCard({item,notice}){
 return <>
  <p className="eyebrow">WE WOULD LIKE THIS, PLEASE</p>
  <div className="destination"><h2 lang="ja">{item.ja}</h2><h3>{item.en}</h3>{item.romaji&&<p>{item.romaji}</p>}</div>
  <p className="japanese" lang="ja">これをください。</p>
  <p>This one, please.</p>
  <button className="button" onClick={()=>navigator.clipboard.writeText(item.ja).then(()=>notice('Copied in Japanese.')).catch(()=>notice('Select the Japanese to copy it.'))}><Copy size={16}/>Copy the Japanese</button>
  <p><small>Written as it usually appears on a menu. Staff are the authority on what is actually in a dish.</small></p>
 </>;
}
