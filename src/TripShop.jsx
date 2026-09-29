import React,{useState} from 'react';
import HowThisWorks from './HowThisWorks.jsx';
import {ExternalLink,ArrowRight,Check,ThumbsUp,ThumbsDown} from 'lucide-react';
import {ESSENTIALS,KEEPSAKES,essentialDue,daysUntil,keepsakeMaterial,keepsakeReady,shopLink,partnered,shopEntry,shopLogged,SHOP_NOTE_MAX} from './shop-data.js';
// The trip shop: the essentials pack to sort before the flight, and keepsakes made from the trip,
// before it and after. Every link goes out through shopLink(), so a partner tag added in
// shop-data.js reaches every link at once, and the disclosure below shows itself when one does.
const DUE={now:'Do it now',soon:'Coming up',later:'Later'};
const Links=({buy})=><div className="shop-links">{buy.map(([label,url])=><a key={url} className="button" href={shopLink(url)} target="_blank" rel={partnered(url)?"noopener noreferrer sponsored":"noopener noreferrer"}><ExternalLink size={15}/> {label}</a>)}</div>;
// The log for next time, under each item. A parent ticks it, says whether it was worth it and
// leaves a line; everyone else sees what was said. The note saves when the box is left.
function LogRow({item,entry,parent,busy,mutate,done}){
 const [note,setNote]=useState(entry?.note||'');
 const log=patch=>mutate({type:'shopLog',id:item.id,...patch});
 if(!parent)return entry&&(entry.sortedAt||entry.verdict||entry.note)?<p className="shop-log-read">{entry.sortedAt&&<><Check size={14}/> {done}. </>}{entry.verdict==='yes'&&'Worth it. '}{entry.verdict==='no'&&'Not worth it. '}{entry.note}</p>:null;
 const verdict=v=>log({verdict:entry?.verdict===v?'':v});
 return <div className="shop-log">
  <button type="button" className={entry?.sortedAt?'on':''} aria-pressed={!!entry?.sortedAt} disabled={busy} onClick={()=>log({sorted:!entry?.sortedAt})}><Check size={15}/> {done}</button>
  <button type="button" className={entry?.verdict==='yes'?'on':''} aria-pressed={entry?.verdict==='yes'} disabled={busy} onClick={()=>verdict('yes')}><ThumbsUp size={15}/> Worth it</button>
  <button type="button" className={entry?.verdict==='no'?'on':''} aria-pressed={entry?.verdict==='no'} disabled={busy} onClick={()=>verdict('no')}><ThumbsDown size={15}/> Not worth it</button>
  <label className="shop-note">For next time<input value={note} maxLength={SHOP_NOTE_MAX} placeholder="What we would do differently" onChange={e=>setNote(e.target.value)} onBlur={()=>{if(note.trim()!==(entry?.note||''))log({note});}}/></label>
 </div>;
}
export default function TripShop({state,user,today,go,mutate,busy}){
 const parent=user?.role==='parent',logged=shopLogged(state);
 const logRow=(item,done)=><LogRow key={`log-${item.id}`} item={item} entry={shopEntry(state,item.id)} parent={parent} busy={busy} mutate={mutate} done={done}/>;
 const toGo=daysUntil(state,today),started=toGo!=null&&toGo<0;
 const material=keepsakeMaterial(state);
 const anyPartner=[...ESSENTIALS,...KEEPSAKES].some(i=>i.buy.some(([,u])=>partnered(u)));
 const essential=item=>{const due=essentialDue(item,toGo);return <li key={item.id} className={`shop-item due-${due}`}>
  <h3><span aria-hidden="true">{item.emoji}</span> {item.title}<small>{item.lead?`${item.lead} days before the flight`:'On the trip'}{due!=='past'&&` · ${DUE[due]}`}</small></h3>
  <p>{item.why}</p><Links buy={item.buy}/>
  {item.page&&<button type="button" className="hunt-link" onClick={()=>go(item.page)}>In the app <ArrowRight size={14}/></button>}
  {logRow(item,'Sorted')}
 </li>;};
 const keepsake=item=>{const r=keepsakeReady(item,material);return <li key={item.id} className="shop-item">
  <h3><span aria-hidden="true">{item.emoji}</span> {item.title}<small>{r.ready?'Ready to make':`${r.have} of ${r.need} ${item.from} so far`}</small></h3>
  <p>{item.why}</p><Links buy={item.buy}/>
  {item.page&&<button type="button" className="hunt-link" onClick={()=>go(item.page)}>What it is made from <ArrowRight size={14}/></button>}
  {logRow(item,'Ordered')}
 </li>;};
 const before=KEEPSAKES.filter(k=>k.when==='before'),after=KEEPSAKES.filter(k=>k.when==='after');
 return <>
  <p className="eyebrow">BEFORE WE GO, AND ONCE WE ARE HOME</p><h1>Trip shop</h1>
  <p>The essentials to sort before the flight, and keepsakes made out of our own trip.</p>
 <HowThisWorks><p>The app sells nothing: each link goes straight to the shop or the official page.</p></HowThisWorks>
  {anyPartner&&<p className="callout">Some links here carry a referral tag, and the app may earn a small commission from them. The price is the same for us.</p>}
  <section className="arrival-part"><h2>The essentials pack</h2>
   <p>{started?'For the next trip: what had to be sorted before this one, in the order to do it.':toGo!=null?`${toGo} day${toGo===1?'':'s'} to go. In the order to do them.`:'In the order to do them.'}</p>
   <p className="shop-tally">{logged.sorted} of {logged.total} sorted{logged.notes?` · ${logged.notes} note${logged.notes===1?'':'s'} for next time`:''}</p>
   <ol className="shop-list">{ESSENTIALS.map(essential)}</ol></section>
  <section className="arrival-part"><h2>Keepsakes to make before we go</h2><ul className="shop-list">{before.map(keepsake)}</ul></section>
  <section className="arrival-part"><h2>Keepsakes for when we are home</h2><ul className="shop-list">{after.map(keepsake)}</ul></section>
 </>;
}
