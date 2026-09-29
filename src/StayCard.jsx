import React,{useState} from 'react';
import {BedDouble,Navigation,Languages,Phone,Copy,Pencil,Ticket,LogIn,LogOut} from 'lucide-react';
import {stayFor,STAY_FIELDS} from './stay-data.js';
import {phoneLinks} from './trip-features.js';
const fmt=d=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(d+'T12:00:00+09:00'));
// Tonight's stay as a hotel app shows one: the hotel, which night, when we can get in and when we
// must be out, the confirmation number, and the three things you want at the kerb — directions,
// the taxi card, and the front desk's number.
export default function StayCard({state,day,parent,busy,mutate,notice,directions,onShow,onTickets}){
 const stay=stayFor(state,day);
 const [editing,setEditing]=useState(false);
 if(!stay)return null;
 const tel=stay.phone?phoneLinks(stay.phone)?.tel:null;
 const copy=async()=>{try{await navigator.clipboard.writeText(stay.reference);notice('Confirmation number copied.');}catch{notice('This phone would not let the app copy. Select the number and copy it by hand.');}};
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const patch=Object.fromEntries(STAY_FIELDS.map(([k])=>[k,f.get(k)||'']));
  if(await mutate({type:'stayEdit',hotel:stay.hotel,patch})){setEditing(false);notice('Saved for everyone.');}
 }
 return <section className="stay-card" aria-label="Tonight’s stay">
  <div className="stay-head">
   <span className="stay-icon" aria-hidden="true"><BedDouble size={20}/></span>
   <div><p className="eyebrow">{stay.checkingOut?'CHECKING OUT TODAY':stay.moving?'CHECKING IN TODAY':stay.leaving?'LAST NIGHT HERE':'TONIGHT’S STAY'}{stay.checkingOut?'':` · NIGHT ${stay.night} OF ${stay.total}`}</p>
    <h2>{stay.hotel}</h2>
    {stay.japanese&&<p className="stay-ja" lang="ja">{stay.japanese}</p>}</div>
  </div>
  <dl className="stay-facts">
   <div><dt><LogIn size={14}/>Check in</dt><dd>{fmt(stay.from)}{stay.checkIn?` · from ${stay.checkIn}`:''}</dd></div>
   <div><dt><LogOut size={14}/>Check out</dt><dd>{fmt(stay.to)}{stay.checkOut?` · by ${stay.checkOut}`:''}</dd></div>
   {stay.reference&&<div className="stay-ref"><dt>Confirmation</dt><dd><span className="stay-number">{stay.reference}</span><button type="button" className="icon" aria-label="Copy the confirmation number" onClick={copy}><Copy size={15}/></button></dd></div>}
   {stay.address&&<div className="stay-wide"><dt>Address</dt><dd>{stay.address}</dd></div>}
  </dl>
  {stay.notes&&<p className="stay-notes">{stay.notes}</p>}
  <div className="stay-actions">
   <a className="button primary" href={directions(stay.address||stay.hotel)} target="_blank" rel="noopener noreferrer"><Navigation size={17}/>Directions</a>
   <button type="button" onClick={()=>onShow(stay.place)}><Languages size={17}/>Taxi card</button>
   {tel&&<a className="button" href={tel}><Phone size={17}/>Call</a>}
   <button type="button" onClick={()=>onTickets(stay.hotel)}><Ticket size={17}/>Booking</button>
  </div>
  {parent&&!editing&&<button type="button" className="link-button stay-edit" onClick={()=>setEditing(true)}><Pencil size={14}/>{stay.reference||stay.phone?'Edit stay details':'Add the confirmation number and front desk phone'}</button>}
  {parent&&editing&&<form className="stay-form" onSubmit={save}>
   {STAY_FIELDS.map(([k,label,max])=>k==='notes'
    ?<label key={k}>{label}<textarea name={k} maxLength={max} defaultValue={stay[k]||''}/></label>
    :<label key={k}>{label}<input name={k} maxLength={max} defaultValue={stay[k]||''} inputMode={k==='phone'?'tel':undefined} placeholder={k==='checkIn'?'15:00':k==='checkOut'?'11:00':undefined}/></label>)}
   <div className="row wrap"><button className="primary" disabled={busy}>Save for everyone</button><button type="button" onClick={()=>setEditing(false)}>Cancel</button></div>
  </form>}
 </section>;
}
