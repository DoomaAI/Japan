import React,{useState} from 'react';
import {AlertCircle,ArrowRight,BedDouble,Check,ExternalLink,Luggage,MapPin,RefreshCw,Tag} from 'lucide-react';
import {moveCard,MOVE_FIELDS} from './move-data.js';
import {shortDay as fmt,shortWhen as when} from './format.js';
// The hotel-move concierge on Home: the evening before a move and the morning of it. What to do
// and by when, the forwarding label in Japanese to copy onto the slip, the overnight bag, and what
// a lookup of both hotels found. Nothing here books or sends anything; the desk does that.
export default function HotelMove({state,user,day,config,online=true,request,mutate,accept,notice,busy,go}){
 const card=moveCard(state,day);
 const parent=user?.role==='parent',[working,setWorking]=useState(false),[error,setError]=useState('');
 if(!card)return null;
 const {move,phase,forwarding,found}=card;
 async function lookUp(){
  if(!online){setError('Looking up needs a signal.');return;}
  setWorking(true);setError('');
  try{const r=await request('day-check',{day:move.date,parts:['move']});accept(r);notice?.(r.moveError?`The lookup did not finish: ${r.moveError}`:'Both hotels looked up.');}
  catch(e){setError(e.message||'The lookup did not work. Try again in a moment.');}
  finally{setWorking(false);}
 }
 return <section className="hotel-move" aria-label="Hotel move">
  <p className="eyebrow">{phase==='eve'?'HOTEL MOVE TOMORROW':'HOTEL MOVE TODAY'} · {fmt(move.date)}</p>
  <h2 className="hotel-move-route"><span>{move.from}</span><ArrowRight size={18}/><span>{move.to}</span></h2>
  <ol className="hotel-move-steps">{card.steps.map(s=><li key={s.id}><strong>{s.text}</strong>{s.note&&<small>{s.note}</small>}</li>)}</ol>
  {parent?<div className="hotel-move-forward" role="group" aria-label="Luggage forwarding">
   <span><Luggage size={16}/>Sending the cases ahead?</span>
   <button type="button" aria-pressed={forwarding} className={forwarding?'is-on':''} disabled={busy} onClick={()=>!forwarding&&mutate({type:'moveForwarding',date:move.date,forwarding:true})}>Yes</button>
   <button type="button" aria-pressed={!forwarding} className={!forwarding?'is-on':''} disabled={busy} onClick={()=>forwarding&&mutate({type:'moveForwarding',date:move.date,forwarding:false})}>We take them</button>
  </div>:forwarding&&<p className="hotel-move-line"><Luggage size={16}/>The big cases go ahead by courier; we carry the overnight bag.</p>}
  {forwarding&&!!card.trackers.length&&<p className="hotel-move-line"><MapPin size={16}/>Tracked overnight: {card.trackers.join(', ')}. Watch it in Find My.</p>}
  {forwarding&&card.label.length>0&&<details className="hotel-move-fold"><summary><Tag size={16}/>The forwarding label, in Japanese</summary>
   <p>Ask the desk for a luggage forwarding slip (<span lang="ja">宅急便の伝票</span>) and copy each box across. One slip per case.</p>
   {card.label.map(f=><div className="move-label-row" key={f.box}>
    <small><span lang="ja">{f.box}</span> · {f.en}</small>
    <strong lang="ja">{f.value}</strong>
    {f.missing?<p className="callout"><AlertCircle size={16}/>{f.missing}</p>:f.note&&<small>{f.note}</small>}
   </div>)}
   {parent&&!state.stays?.[card.arriving?.hotel]?.guest&&<p><small>The name on the booking is a guess. Set it on Tonight’s stay, under Edit stay details.</small></p>}
  </details>}
  {forwarding&&card.bag.length>0&&<details className="hotel-move-fold"><summary><BedDouble size={16}/>The overnight bag</summary>
   <ul>{card.bag.map(item=><li key={item}>{item}</li>)}</ul>
   {go&&<button type="button" className="linkish" onClick={()=>go('packing')}>Open the packing list</button>}
  </details>}
  {found&&<details className="hotel-move-fold"><summary><Check size={16}/>What the two hotels say · {when(card.foundAt)}</summary>
   <dl>{MOVE_FIELDS.filter(([k])=>found[k]).map(([k,label])=><div key={k}><dt>{label}</dt><dd>{found[k]}</dd></div>)}</dl>
   {!!found.sources?.length&&<p className="day-check-sources">{found.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title||new URL(s.url).hostname} <ExternalLink size={12}/></a>)}</p>}
   <small>Taken from the hotels’ pages; confirm the cut-off at the desk.</small>
  </details>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {parent&&config?.tomorrow&&<button type="button" disabled={working||!online} onClick={lookUp}><RefreshCw size={16}/>{working?'Looking up both hotels…':found?'Look up both hotels again':'Look up both hotels'}</button>}
 </section>;
}
