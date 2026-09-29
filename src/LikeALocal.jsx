import React,{useEffect,useState} from 'react';
import {MapPin,Plus,CircleCheck,Circle,ClipboardList,Baby} from 'lucide-react';
import HowThisWorks from './HowThisWorks.jsx';
import {LOCAL_KINDS,LOCAL_KIND_LABEL,LOCAL_KIND_ICON,localExperiences,localAreaOrder,localMapUrl,localDraft,localOnBoard} from './local-data.js';
import {useStored} from './stored.js';
// Like a local: the things people who live here do more than visitors, by base. Where we are
// leads, the bases still ahead follow, and the ones behind us fold away. Each card has directions,
// Put it on the board (anyone, the boys included, and it queues with no signal like any other
// idea) and a tick for the ones we have actually done, kept on this phone.
const whenLine=(e,today,dayLabel)=>{
 if(e.done)return 'Behind us';
 if(!e.next)return '';
 if(e.weekdays)return e.next===today?'Today':`${dayLabel(e.next)}${e.days.length>1?` or ${dayLabel(e.days[1])}`:''}`;
 return e.here?`Any day we are in ${e.area}`:`From ${dayLabel(e.next)}`;
};
function LocalCard({e,today,dayLabel,done,toggle,onBoard,add,busy,go}){
 const ticked=!!done[e.id];
 return <article id={`local-${e.id}`} className={`local-item${ticked?' done':''}`}>
  <header>
   <span className="local-kind" aria-hidden="true">{LOCAL_KIND_ICON[e.kind]}</span>
   <div><h3>{e.title}</h3><small><span lang="ja">{e.ja}</span>{e.say&&<> · say “{e.say}”</>}</small></div>
   {whenLine(e,today,dayLabel)&&<span className={`local-when${e.done?' past':''}`}>{whenLine(e,today,dayLabel)}</span>}
  </header>
  <p className="local-why">{e.why}</p>
  <p className="local-how"><b>How:</b> {e.how}</p>
  <p className="local-facts"><span><MapPin size={14}/>{e.where}</span></p>
  <p className="local-facts"><span>{e.cost}</span>{e.when&&<span>{e.when}</span>}<span><Baby size={14}/>{e.boys==='care'?'Fine with the boys, with a hand':'Good for the boys'}</span></p>
  <div className="row wrap">
   <a className="button" href={localMapUrl(e)} target="_blank" rel="noopener noreferrer"><MapPin size={16}/> Directions</a>
   {onBoard?<button type="button" onClick={()=>go('planning')}><ClipboardList size={16}/> On the board</button>
    :<button type="button" disabled={busy||e.done} onClick={()=>add(e)}><Plus size={16}/> Put it on the board</button>}
   <button type="button" aria-pressed={ticked} onClick={()=>toggle(e.id)}>{ticked?<CircleCheck size={16}/>:<Circle size={16}/>} {ticked?'We did it':'Did it'}</button>
  </div>
 </article>;
}
export default function LikeALocal({state,user,today,dayLabel,mutate,busy,notice,go}){
 const [done,setDone]=useStored('japan.local.done',{});
 const [kind,setKind]=useState('');
 const toggle=id=>setDone(d=>({...d,[id]:!d[id]}));
 const all=localExperiences(state,today).filter(e=>!kind||e.kind===kind);
 const order=localAreaOrder(state,today);
 const behind=all.filter(e=>e.done);
 // Opened from a Home row or a search hit: land on that card.
 useEffect(()=>{const id=new URLSearchParams(location.search).get('item');if(!id)return;const el=document.getElementById(`local-${id}`);if(el){el.scrollIntoView({block:'start'});el.classList.add('local-flash');}},[]);
 async function add(e){
  const saved=await mutate({type:'proposalAdd',person:user.name,...localDraft(e)});
  if(saved)notice?.(`${e.title} is on the planning board.`);
 }
 const card=e=><LocalCard key={e.id} e={e} today={today} dayLabel={dayLabel} done={done} toggle={toggle} onBoard={localOnBoard(state,e)} add={add} busy={busy} go={go}/>;
 const section=(area,live,label)=>live.length>0&&<section className="local-area" key={area}><h2>{area}{label&&<small>{label}</small>}</h2>{live.map(card)}</section>;
 const tally=Object.keys(done).filter(id=>done[id]&&all.some(e=>e.id===id)).length;
 return <>
  <p className="eyebrow">WHERE THE LOCALS GO</p><h1>Like a local</h1>
  <p>The bathhouse, the basement food hall, the tram and the Sunday market: what people who live here do more than visitors, with how to do it and what it costs.</p>
  <HowThisWorks><p>Everything here works with no signal. Where we are today leads; a base we have left folds away at the bottom. <b>Put it on the board</b> puts one up as an ordinary idea on the planning board for everyone to vote on, with the why and the how in its notes, and a parent can then put it on a day. <b>Did it</b> is a tick kept on this phone. Prices are rounded and were right in September 2026; the card says “about” for a reason.</p></HowThisWorks>
  <div className="row wrap local-kinds" role="tablist" aria-label="Kind">
   <button role="tab" aria-selected={!kind} className={!kind?'selected':''} onClick={()=>setKind('')}>All</button>
   {LOCAL_KINDS.map(([id,label])=><button key={id} role="tab" aria-selected={kind===id} className={kind===id?'selected':''} onClick={()=>setKind(id)}><span aria-hidden="true">{LOCAL_KIND_ICON[id]}</span> {label}</button>)}
  </div>
  {tally>0&&<p className="app-count">{tally} done{kind?` · ${LOCAL_KIND_LABEL(kind)}`:''}</p>}
  {order.here.map(area=>section(area,all.filter(e=>e.area===area&&!e.done),'where we are'))}
  {order.ahead.map(area=>section(area,all.filter(e=>e.area===area&&!e.done),'still ahead'))}
  {!order.here.length&&!order.ahead.length&&<p className="callout">The trip is behind us; everything here is under Behind us, for next time.</p>}
  {behind.length>0&&<details className="local-behind"><summary>Behind us ({behind.length})</summary>{[...new Set([...order.behind,...behind.map(e=>e.area)])].map(area=>section(area,behind.filter(e=>e.area===area)))}</details>}
 </>;
}
