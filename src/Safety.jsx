import React,{useState} from 'react';
import {Phone} from 'lucide-react';
import SayIt from './SayIt.jsx';
import {PHRASES} from './phrases.js';
import {EMERGENCY,CONSULAR,SAFETY_LINKS,DISASTER,lostCard,lostCardNames} from './safety-data.js';
const tel=n=>`tel:${n.replace(/[^+#\d]/g,'').replace('#','%23')}`;
// The card a boy holds up. Big Japanese first, because it is for the adult reading it.
export function LostCard({state,name,day}){
 const c=lostCard(state,name,day);
 return <div className="lost-card">
  <h2>{c.name} · {c.kana}</h2>
  {c.ja.map(line=><p key={line} className="japanese" lang="ja"><strong>{line}</strong></p>)}
  {c.en.map(line=><p key={line}>{line}</p>)}
  <h2>親 / Parents</h2>
  {c.parents.map(p=><p key={p.name}><strong>{p.name}</strong><br/>{p.phone?<a href={tel(p.phone)}>{p.phone}</a>:'Phone number not entered yet'}</p>)}
  <h2>ホテル / Hotel</h2>
  <p><strong>{c.hotel.name||'Not set'}</strong>{c.hotel.english&&<><br/>{c.hotel.english}</>}{c.hotel.address&&<><br/>{c.hotel.address}</>}</p>
 </div>;
}
export function LostCards({state,user,day}){
 const names=lostCardNames(state);
 const mine=names.includes(user?.name)?user.name:null;
 const [who,setWho]=useState(mine||names[0]||'');
 if(!names.length)return null;
 return <section>
  <h2>If a boy is lost on his own</h2>
  <p>Each boy shows his card to a station attendant, a shop worker or a police officer at a police box. It has his name, both phone numbers and tonight’s hotel in Japanese. Screenshot it onto his phone or print it for his pocket.</p>
  {!mine&&<div className="row wrap">{names.map(n=><button key={n} className={who===n?'primary':''} onClick={()=>setWho(n)}>{n}</button>)}</div>}
  {who&&<LostCard state={state} name={who} day={day}/>}
  <button onClick={()=>{document.body.classList.add('print-lost');window.print();document.body.classList.remove('print-lost');}}>Print / save PDF</button>
 </section>;
}
export default function Safety({state,user,day,go}){
 const insurance=(state.documents||[]).filter(d=>d.category!=='memory'&&(d.tags||[]).some(t=>/insurance/i.test(t)));
 return <>
  <p className="eyebrow">IF SOMETHING GOES WRONG</p>
  <h1>Safety and emergencies</h1>
  {/* The two numbers first, as buttons that dial, before a word of explanation: the moment this
      page is opened in earnest is not a moment for scrolling. */}
  <div className="call-row">{EMERGENCY.filter(e=>['police','ambulance'].includes(e.id)).map(e=><a key={e.id} className={`call-chip call-${e.id}`} href={tel(e.number)}><Phone size={20}/><strong>{e.number}</strong><span>{e.id==='police'?'Police':'Ambulance · Fire'}</span></a>)}</div>
  <p>Everything on this page works with no signal.</p>
  <h2>Emergency numbers</h2>
  <div className="help-grid">{EMERGENCY.map(e=><a key={e.id} className="help-card" href={tel(e.number)}><Phone/><h2>{e.number}</h2><p><strong>{e.title}.</strong> {e.note}</p></a>)}</div>
  <h2>Say it</h2>
  {['help','ambulance','police','hospital','separated'].map(k=><SayIt key={k} phrase={PHRASES[k]}/>)}
  <LostCards state={state} user={user} day={day}/>
  <h2>Australian government</h2>
  <ul>{CONSULAR.map(c=><li key={c.id}><strong>{c.title}</strong><br/><a href={tel(c.number)}>{c.number}</a><br/><small>{c.address}</small></li>)}</ul>
  <h2>Travel insurance</h2>
  {insurance.length
   ?<ul>{insurance.map(d=><li key={d.id}><strong>{d.title}</strong>{d.reference&&<> · {d.reference}</>}{d.notes&&<><br/><small>{d.notes}</small></>}</li>)}</ul>
   :<p>Nothing tagged <strong>insurance</strong> in Tickets yet. Add the policy there with its emergency assistance number in the notes, and it will show here.</p>}
  {go&&<button onClick={()=>go('tickets')}>Open Tickets</button>}
  <h2>Earthquakes, tsunamis and typhoons</h2>
  {DISASTER.map(d=><details key={d.id} className="callout"><summary><strong>{d.title}</strong></summary><ol>{d.steps.map(s=><li key={s}>{s}</li>)}</ol></details>)}
  <h2>Worth having</h2>
  <ul>{SAFETY_LINKS.map(([label,href])=><li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{label}</a></li>)}</ul>
  <p><small>Numbers as published by the Japanese and Australian governments. Check the embassy details on Smartraveller if you have signal.</small></p>
 </>;
}
