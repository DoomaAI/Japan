import React from 'react';
import {ExternalLink,ArrowRight} from 'lucide-react';
import {ESSENTIALS,KEEPSAKES,essentialDue,daysUntil,keepsakeMaterial,keepsakeReady,shopLink,partnered} from './shop-data.js';
// The trip shop: the essentials pack to sort before the flight, and keepsakes made from the trip,
// before it and after. Every link goes out through shopLink(), so a partner tag added in
// shop-data.js reaches every link at once, and the disclosure below shows itself when one does.
const DUE={now:'Do it now',soon:'Coming up',later:'Later'};
const Links=({buy})=><div className="shop-links">{buy.map(([label,url])=><a key={url} className="button" href={shopLink(url)} target="_blank" rel={partnered(url)?"noopener noreferrer sponsored":"noopener noreferrer"}><ExternalLink size={15}/> {label}</a>)}</div>;
export default function TripShop({state,today,go}){
 const toGo=daysUntil(state,today),started=toGo!=null&&toGo<0;
 const material=keepsakeMaterial(state);
 const anyPartner=[...ESSENTIALS,...KEEPSAKES].some(i=>i.buy.some(([,u])=>partnered(u)));
 const essential=item=>{const due=essentialDue(item,toGo);return <li key={item.id} className={`shop-item due-${due}`}>
  <h3><span aria-hidden="true">{item.emoji}</span> {item.title}<small>{item.lead?`${item.lead} days before the flight`:'On the trip'}{due!=='past'&&` · ${DUE[due]}`}</small></h3>
  <p>{item.why}</p><Links buy={item.buy}/>
  {item.page&&<button type="button" className="hunt-link" onClick={()=>go(item.page)}>In the app <ArrowRight size={14}/></button>}
 </li>;};
 const keepsake=item=>{const r=keepsakeReady(item,material);return <li key={item.id} className="shop-item">
  <h3><span aria-hidden="true">{item.emoji}</span> {item.title}<small>{r.ready?'Ready to make':`${r.have} of ${r.need} ${item.from} so far`}</small></h3>
  <p>{item.why}</p><Links buy={item.buy}/>
  {item.page&&<button type="button" className="hunt-link" onClick={()=>go(item.page)}>What it is made from <ArrowRight size={14}/></button>}
 </li>;};
 const before=KEEPSAKES.filter(k=>k.when==='before'),after=KEEPSAKES.filter(k=>k.when==='after');
 return <>
  <p className="eyebrow">BEFORE WE GO, AND ONCE WE ARE HOME</p><h1>Trip shop</h1>
  <p>The essentials to sort before the flight, and keepsakes made out of our own trip. The app sells nothing: each link goes straight to the shop or the official page.</p>
  {anyPartner&&<p className="callout">Some links here carry a referral tag, and the app may earn a small commission from them. The price is the same for us.</p>}
  <section className="arrival-part"><h2>The essentials pack</h2>
   <p>{started?'For the next trip: what had to be sorted before this one, in the order to do it.':toGo!=null?`${toGo} day${toGo===1?'':'s'} to go. In the order to do them.`:'In the order to do them.'}</p>
   <ol className="shop-list">{ESSENTIALS.map(essential)}</ol></section>
  <section className="arrival-part"><h2>Keepsakes to make before we go</h2><ul className="shop-list">{before.map(keepsake)}</ul></section>
  <section className="arrival-part"><h2>Keepsakes for when we are home</h2><ul className="shop-list">{after.map(keepsake)}</ul></section>
 </>;
}
