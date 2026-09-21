import React,{useState} from 'react';
import {Download,ExternalLink,RefreshCw,Search,Trophy,AlertCircle,User,Clock,X} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {SUMO_SITE,sumo,sumoCard,sumoBouts,divisionLabel,wrestlerProfile,boutResult,currentBout} from './trip-features.js';
import {japanClock} from './timing.js';
const Side=({man,onLook,won,lost})=><button className={`sumo-side ${won?'won':''} ${lost?'lost':''}`} onClick={()=>onLook(man)}>
 <strong>{man.name}</strong>
 <small>{[man.rank,man.stable].filter(Boolean).join(' · ')||'Tap to look him up'}</small>
 {won&&<span className="sumo-won"><Trophy size={13}/>Won</span>}
</button>;
// The day's card, fetched from the official schedule before we go and then kept in the trip.
// The arena is a basement full of phones, so everything here has to work with the list already
// on the device: only fetching needs a connection.
export default function Sumo({state,user,day,mutate,busy,request,config,notice,now}){
 const card=sumo(state),groups=sumoCard(state),parent=user.role==='parent';
 const [fetching,setFetching]=useState(false),[error,setError]=useState('');
 const [looking,setLooking]=useState(null),[lookupError,setLookupError]=useState('');
 const clock=japanClock(now||new Date()),onNow=currentBout(state,clock);
 async function load(){
  setFetching(true);setError('');
  try{
   const result=await request('sumo-card',{date:day});
   if(await mutate({type:'sumoUpdate',...result}))notice?.(`${result.bouts.length} bouts loaded. It works from here with no signal.`);
  }catch(e){setError(e.message||'The card could not be fetched. The official schedule is at sumo.or.jp.');}
  finally{setFetching(false);}
 }
 async function look(man){
  const known=wrestlerProfile(state,man.name);
  setLookupError('');setLooking({name:man.name,profile:known,busy:!known});
  if(known||!parent||!config?.sumo)return;
  try{
   const profile=await request('sumo-wrestler',{name:man.name});
   await mutate({type:'sumoWrestler',profile});
   setLooking({name:man.name,profile,busy:false});
  }catch(e){setLookupError(e.message||'Nothing came back about him.');setLooking(l=>l&&{...l,busy:false});}
 }
 return <div className="sumo">
  {card.bouts.length>0&&<div className="sumo-head">
   <div><p className="eyebrow">{card.basho||'The tournament'}{card.dayNumber?` · DAY ${card.dayNumber} OF 15`:''}</p>
    <h3>{card.venue||'Ryogoku Kokugikan'}</h3>
    <small>{card.doorsOpen?`Doors ${card.doorsOpen} · `:''}{card.bouts.length} bouts{card.at?` · loaded ${japanClock(new Date(card.at))} by ${card.by}`:''}</small></div>
  </div>}
  {card.notes&&<p className="sumo-notes">{card.notes}</p>}
  {onNow&&<p className="sumo-now"><Clock size={16}/>About now: <strong>{onNow.east.name}</strong> v <strong>{onNow.west.name}</strong> · {divisionLabel(onNow.division)}</p>}
  {parent&&config?.sumo&&<div className="row wrap">
   <button className="primary" disabled={busy||fetching} onClick={load}>
    {card.bouts.length?<RefreshCw size={16}/>:<Download size={16}/>}
    {fetching?'Reading the official schedule…':card.bouts.length?'Refresh the card':'Download the day’s card'}</button>
  </div>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {!card.bouts.length&&<div className="empty">
   <h3>No card loaded yet</h3>
   <p>The match-ups are published on the official site the afternoon before, so fetch this the day before or on the morning of {dayLabel(day)}.{parent&&config?.sumo?'':' A parent does this while there is signal.'}</p>
   <a className="button" href={SUMO_SITE} target="_blank" rel="noopener noreferrer">The official schedule <ExternalLink size={14}/></a>
  </div>}
  {groups.map(group=><section className="sumo-group" key={group.id}>
   <h4>{group.label}</h4>
   {group.bouts.map(bout=>{
    const result=boutResult(state,bout.id);
    return <article className={`sumo-bout ${onNow?.id===bout.id?'now':''}`} key={bout.id}>
     <span className="sumo-time">{bout.time||'—'}</span>
     <div className="bout-pair">
      <Side man={bout.east} onLook={look} won={result?.winner===bout.east.name} lost={!!result&&result.winner!==bout.east.name}/>
      <span className="sumo-v">v</span>
      <Side man={bout.west} onLook={look} won={result?.winner===bout.west.name} lost={!!result&&result.winner!==bout.west.name}/>
     </div>
     <div className="row wrap sumo-winner">
      <small>Who won?</small>
      {[bout.east.name,bout.west.name].map(name=>
       <button key={name} className={result?.winner===name?'selected':''} disabled={busy}
        onClick={()=>mutate({type:'sumoResult',id:bout.id,winner:result?.winner===name?null:name,by:user.name})}>{name}</button>)}
     </div>
    </article>;})}
  </section>)}
  {!!card.sources.length&&<details className="sumo-sources"><summary>Where this came from</summary>
   <ul>{card.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title||s.url} <ExternalLink size={12}/></a></li>)}</ul>
   <p><small>Times are approximate and cards change — wrestlers withdraw and the order shifts. The board in the arena is the one that counts.</small></p>
  </details>}
  {looking&&<div className="sumo-profile">
   <div className="section-heading"><h4><User size={17}/>{looking.name}</h4>
    <button className="icon" aria-label="Close" onClick={()=>{setLooking(null);setLookupError('');}}><X size={18}/></button></div>
   {looking.busy&&<p><Search size={15}/> Looking him up…</p>}
   {lookupError&&<p className="callout"><AlertCircle size={18}/>{lookupError}</p>}
   {looking.profile?<>
    {looking.profile.japanese&&<p className="destination-japanese" lang="ja">{looking.profile.japanese}</p>}
    <div className="plan-facts">
     {looking.profile.rank&&<span>{looking.profile.rank}</span>}
     {looking.profile.stable&&<span>{looking.profile.stable} stable</span>}
     {looking.profile.hometown&&<span>From {looking.profile.hometown}</span>}
     {looking.profile.heightCm&&<span>{looking.profile.heightCm}cm</span>}
     {looking.profile.weightKg&&<span>{looking.profile.weightKg}kg</span>}
    </div>
    {looking.profile.record&&<p><strong>This tournament:</strong> {looking.profile.record}</p>}
    {looking.profile.about&&<p>{looking.profile.about}</p>}
    {!!looking.profile.sources?.length&&<p className="row wrap">{looking.profile.sources.map(s=>
     <a className="button" key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title||'Source'} <ExternalLink size={13}/></a>)}</p>}
    <small>Records change every day of a tournament. This is what the page said when it was read.</small>
   </>:!looking.busy&&!lookupError&&<p>Nothing saved about him yet.{parent&&config?.sumo?'':' A parent can look him up while there is signal.'}</p>}
  </div>}
 </div>;
}
