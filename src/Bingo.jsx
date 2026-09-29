import React,{useState} from 'react';
import {Check,Eye,Volume2,RefreshCw} from 'lucide-react';
import {useReadAloud} from './AdventurePages.jsx';
import {BINGO_KINDS,FREE,findSquare,kindOf,cardScore,partDone,partsDone,squareDone,nextCard,bingoOf} from './bingo-data.js';
import {fujiSide} from './trip-features.js';
// Japan bingo: one card each, for the whole trip. Tap a square to see what it is and tick it;
// a square that is a set, such as every coin, ticks one part at a time. Five in a line is a
// bingo, and all twenty-five is a full card and a new one.
export default function Bingo({state,user,mutate,busy,step=null}){
 const members=state.members||[];
 const [who,setWho]=useState(members.includes(user.name)?user.name:members[0]);
 const [open,setOpen]=useState(null);
 const {read,reading}=useReadAloud();
 const parent=user.role==='parent',canTick=parent||user.name===who;
 const score=cardScore(state,who),square=open&&findSquare(open);
 const tick=(id,done,part)=>mutate({type:'bingoTick',person:who,square:id,...(part!=null?{part}:{}),done});
 async function deal(){
  if(!score.full&&!confirm(`Start a new card for ${who}? Squares already done stay done, and the new card is made from ones not done yet.`))return;
  const {round,card}=nextCard(state,who);
  if(await mutate({type:'bingoCard',person:who,round,card}))setOpen(null);
 }
 const lines=score.lines.length,own=id=>!!bingoOf(state,who).done?.[id];
 return <div className="bingo">
  <p>{step?<>Out of the window on the {step.title}, and everywhere else on the trip. Mount Fuji is on the <strong>{fujiSide(step)}</strong> today.</>
   :'Spot it, taste it, buy it, hear it, say it and collect it. Five in a row is bingo. Works with no signal.'}</p>
  <div className="segmented">{members.map(n=><button key={n} type="button" className={who===n?'selected':''} onClick={()=>{setWho(n);setOpen(null);}}>{n}</button>)}</div>
  <div className={`bingo-status${lines?' won':''}`} role="status">
   <strong>{score.full?'Full card! Every square.':lines?`BINGO${lines>1?` ×${lines}`:''}!`:`${score.count} of 24`}</strong>
   <span>{score.full?'Deal a new one below.':lines?`${score.count} of 24 squares done. Keep going for a full card.`:'Get five in a row, down, across or corner to corner.'}</span>
  </div>
  {!canTick&&<p className="callout"><Eye size={18}/>This is {who}’s card. Switch back to your own name to tick things off.</p>}
  <div className="bingo-card" role="grid" aria-label={`${who}’s bingo card`}>
   {score.card.map((id,i)=>{
    if(id===FREE)return <div key="free" className="bingo-cell free in-line" role="gridcell"><span className="bingo-icon" aria-hidden="true">🇯🇵</span><small>Free</small></div>;
    const s=findSquare(id),done=score.ticked[i],k=kindOf(s.kind);
    return <button key={id} type="button" role="gridcell" data-kind={s.kind} aria-pressed={done} aria-label={`${k.label}: ${s.title}${done?', done':''}`}
     className={`bingo-cell${done?' done':''}${score.inLine.has(i)?' in-line':''}${open===id?' open':''}`} onClick={()=>setOpen(open===id?null:id)}>
     <span className="bingo-icon" aria-hidden="true">{done?<Check size={22}/>:s.icon}</span>
     <small>{s.short||s.title}</small>
     {s.parts&&!done&&<i>{partsDone(state,who,s)}/{s.parts.length}</i>}
    </button>;})}
  </div>
  <div className="bingo-legend">{BINGO_KINDS.map(k=><span key={k.id} data-kind={k.id}>{k.icon} {k.label}</span>)}</div>
  {square&&<section className="bingo-detail" data-kind={square.kind}>
   <p className="eyebrow">{kindOf(square.kind).icon} {kindOf(square.kind).label}</p>
   <h3><span aria-hidden="true">{square.icon}</span> {square.title}</h3>
   {square.ja&&<div className="say-it small"><p className="japanese" lang="ja">{square.ja}</p><p className="say-phonics"><span>Say</span>{square.romaji}</p>
    <button type="button" className="hear-it" onClick={()=>read(`bingo-${square.id}`,square.ja,'ja-JP')}><Volume2 size={15}/>{reading===`bingo-${square.id}`?'Stop':'Hear it'}</button></div>}
   {square.hint&&<p>{square.hint}</p>}
   {square.parts?<div className="bingo-parts">{square.parts.map(p=>{const on=partDone(state,who,square.id,p.id);
    return <button key={p.id} type="button" className={`chip${on?' on':''}`} aria-pressed={on} disabled={busy||!canTick} onClick={()=>tick(square.id,!on,p.id)}>{on&&<Check size={14}/>}{p.label}</button>;})}</div>
   :own(square.id)?<button type="button" disabled={busy||!canTick} onClick={()=>tick(square.id,false)}>Not yet, untick it</button>
   :squareDone(state,who,square.id)?<p><small>Spotted from the train window, so it counts.</small></p>
   :<button type="button" className="primary" disabled={busy||!canTick} onClick={()=>tick(square.id,true)}><Check size={16}/> Done it!</button>}
  </section>}
  {canTick&&<button type="button" className={score.full?'primary':''} disabled={busy} onClick={deal}><RefreshCw size={16}/> {score.full?'Deal a new card':'New card'}</button>}
 </div>;
}
