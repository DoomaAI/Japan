import React,{useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {PlaneTakeoff,ClipboardCheck,Scale,Package,ExternalLink} from 'lucide-react';
import {declareGroups,dutyFree,weightBudget} from './flying-home.js';
import {BORDER_LINKS,DECLARE_RULE} from './going-home.js';
import {yenToAud} from './trip-features.js';
import {yen} from './format.js';
const dollars=(n,rate)=>`$${yenToAud(Math.abs(n||0),rate).toFixed(2)}`;
// What we bought, against the three things the airport asks: the card, the allowance, the scales.
const ROOM_KEY='japan.roomleft';
const readRoom=()=>{try{const v=Number(localStorage.getItem(ROOM_KEY));return Number.isFinite(v)&&v>0?v:null;}catch{return null;}};
export default function FlyingHome({state,go,mutate,busy,parent}){
 const {groups,unsure,any}=declareGroups(state),duty=dutyFree(state);
 const [room,setRoom]=useState(readRoom);
 const weight=weightBudget(state,room);
 const saveRoom=v=>{const n=v===''?null:Number(v);setRoom(Number.isFinite(n)&&n>0?n:null);try{n?localStorage.setItem(ROOM_KEY,String(n)):localStorage.removeItem(ROOM_KEY);}catch{}};
 const chips=items=><span className="row wrap plan-tags">{items.map(i=><span className="tag" key={i.id}>{i.title}{i.qty>1?` ×${i.qty}`:''}{i.who&&i.who!=='Family'?` · ${i.who}`:''}</span>)}</span>;
 return <>
  <p className="eyebrow">CAN WE BRING IT HOME?</p><PageTitle help={<p>Read off the shopping list, the purchase shortlist and the boys’ purses: nothing to type. Everything bought counts, tax-free or not.</p>}>Flying home</PageTitle>
  <p>{DECLARE_RULE}</p>
  <section className="arrival-part"><h2><ClipboardCheck size={20}/> On the Incoming Passenger Card</h2>
   {!any&&!unsure.length&&<p>Nothing bought yet that the card asks about. Tick things off the shopping list as they are bought and they turn up here.</p>}
   {groups.map(g=><div className="home-front-group" key={g.id}><p><strong>Tick yes to “{g.title}”</strong> · {g.text}</p>{chips(g.items)}</div>)}
   {!!unsure.length&&<div className="home-front-group"><p><strong>Have a look at these</strong> · the words do not say what they are. Food, plants, animal products, wood and straw all go on the card.</p>{chips(unsure)}</div>}
   <p className="row wrap">{BORDER_LINKS.map(([label,url])=><a key={url} className="button" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> {label}</a>)}</p>
  </section>
  <section className="arrival-part"><h2><Scale size={20}/> Duty-free allowance</h2>
   <p><strong>{yen(duty.yen)}</strong> bought so far, about <strong>{dollars(duty.yen,duty.rate)}</strong>, against <strong>A${duty.allowance.toLocaleString('en-AU')}</strong> for the family together.{duty.over>0?` That is A$${duty.over.toLocaleString('en-AU')} over: declare it, and duty is charged on the whole of what is over, not the part.`:' Inside the allowance.'}{duty.unpriced?` ${duty.unpriced} thing${duty.unpriced===1?' has':'s have'} no price written down and ${duty.unpriced===1?'is':'are'} not counted.`:''}</p>
   {/* The sum, shown as its parts: the lists, and what the ledger adds that no list has. */}
   {(duty.ledger.extra.length>0||duty.ledger.matched.length>0)&&<div className="home-front-group duty-ledger">
    <p>From the lists: <strong>{yen(duty.lists)}</strong> · from the family ledger, not on any list: <strong>{yen(duty.ledger.yen)}</strong></p>
    {duty.ledger.extra.map(e=><div className="list-row" key={e.id}><span>{e.title} · {yen(e.yen)}</span>{mutate&&<button type="button" className="linkish" disabled={busy} onClick={()=>mutate({type:'expenseCounted',id:e.id,counted:true})}>Already on a list</button>}</div>)}
    {duty.ledger.matched.length>0&&<details><summary>Left out, already counted ({duty.ledger.matched.length})</summary>
     {duty.ledger.matched.map(e=><div className="list-row" key={e.id}><span>{e.title} · {yen(e.yen)} <small>{e.flagged?'marked by a parent':`same as “${e.twin}”`}</small></span>{e.flagged&&mutate&&<button type="button" className="linkish" disabled={busy} onClick={()=>mutate({type:'expenseCounted',id:e.id,counted:false})}>Count it</button>}</div>)}</details>}
   </div>}
   <p><small>A$900 each adult and A$450 each child, pooled. Alcohol has its own limit: 2.25 litres an adult, none for the boys.</small></p>
  </section>
  <section className="arrival-part"><h2><Package size={20}/> Will it fit in the cases?</h2>
   <p>What we bought adds about <strong>{weight.added} kg</strong>, guessed from the names. The airline allows about {weight.allowanceEach} kg a person checked in; the fare on the ticket is the last word.</p>
   <label>Room left in the cases on the way over, in kg<input type="number" inputMode="decimal" min="0" max="200" step="0.5" value={room??''} onChange={e=>saveRoom(e.target.value)} placeholder="e.g. 12"/></label>
   {weight.room!==null&&(weight.over
    ?<p className="callout"><Package size={18}/><span><strong>About {weight.over} kg over.</strong> Post the heaviest by Japan Post or hand it to the hotel’s Yamato counter for the airport: {weight.post.map(i=>i.title).join(', ')}.</span></p>
    :<p className="callout"><Package size={18}/><span><strong>It fits</strong>, with about {Math.round((weight.room-weight.added)*10)/10} kg to spare.</span></p>)}
   <p><small>Kept on this phone. Weigh the cases at the hotel, or the airport, and type the number.</small></p>
  </section>
  {go&&<p className="row wrap"><button type="button" onClick={()=>go('arrival')}><PlaneTakeoff size={16}/> Arrival paperwork</button><button type="button" onClick={()=>go('shopping')}>Shopping list</button></p>}
 </>;
}
