import React,{useState} from 'react';
import {UtensilsCrossed,X,ExternalLink,Copy,Plus,Footprints,Search,Heart,PartyPopper,RotateCcw,List} from 'lucide-react';
import {dinnerShows,dinnerOf,dinnerAnchors,reservationMessage,dinnerOptions,myDinnerVotes,dinnerMatches,BOOKING,CHANNELS,MENUS} from './dinner-data.js';
import {SuggestDeck} from './SuggestDeck.jsx';
import {activeSteps} from './timing.js';
import GuideByline from './GuideByline.jsx';
// Dinner tonight, on Home from four o'clock on a day with no dinner on the plan: somewhere near
// the last stop and somewhere at or near the hotel. Put away on this phone for the day with one
// tap; gone for everyone once a parent puts a dinner on the plan.
const label=(list,id)=>list.find(([k])=>k===id)?.[1]||'';
const KEY=day=>`japan.dinner.dismissed.${day}`;
const wasDismissed=day=>{try{return localStorage.getItem(KEY(day))==='1';}catch{return false;}};
export default function DinnerTonight({state,user,day,today,clock,config,request,accept,mutate,busy,notice,openNearby}){
 const parent=user?.role==='parent';
 const [dismissed,setDismissed]=useState(()=>wasDismissed(day)),[working,setWorking]=useState(false),[open,setOpen]=useState(null),[time,setTime]=useState('18:00'),[asList,setAsList]=useState(false),[voting,setVoting]=useState(false);
 if(!dinnerShows(state,day,today,clock,dismissed||wasDismissed(day)))return null;
 const found=dinnerOf(state,day),anchors=dinnerAnchors(state,day);
 const dismiss=()=>{try{localStorage.setItem(KEY(day),'1');}catch{}setDismissed(true);};
 async function find(){setWorking(true);try{accept(await request('dinner',{day}));}catch(e){notice?.(e.message);}finally{setWorking(false);}}
 async function eatHere(o){
  const last=activeSteps(state,day).at(-1);
  const ok=await mutate({type:'add',step:{title:`Dinner: ${o.title}`,day,time,duration:75,place:o.area||o.title,japanese:o.japanese,category:'food',
   website:o.bookingUrl||o.website||'',kind:'flexible',page:state.days.find(d=>d.date===day)?.pages?.[0]||1,participants:[...state.members],
   notes:[o.cuisine,o.why,o.cashOnly?'Cash only':'',o.cancellation?`Cancellation: ${o.cancellation}`:''].filter(Boolean).join('\n'),...(last?{order:last.order+1}:{})}});
  if(ok)notice?.(`Dinner at ${o.title} is on the plan for ${time}.`);
 }
 // Everyone swipes on their own phone; a vote that did not save leaves the card where it was.
 async function vote(x,v){setVoting(true);try{accept(await request('dinner-swipe',{day,key:x.key,vote:v}));return true;}catch(e){notice?.(e.message);return false;}finally{setVoting(false);}}
 async function resetVotes(){setVoting(true);try{accept(await request('dinner-swipe',{day,reset:true}));}catch(e){notice?.(e.message);}finally{setVoting(false);}}
 const message=reservationMessage({time,name:user?.name||''});
 const optionBody=(o,id)=><>
     <strong>{o.title}</strong>{o.japanese&&<span lang="ja" className="dinner-ja"> {o.japanese}</span>}
     <p><small>{[o.cuisine,o.walkMinutes!=null?`${o.walkMinutes} min walk`:'',o.priceBand,o.rating?`Google ${o.rating}★${o.ratingCount?` (${o.ratingCount})`:''}`:''].filter(Boolean).join(' · ')}</small></p>
     <ul className="dinner-flags">
      {o.kidsWelcome&&<li className="good">Kids welcome</li>}
      {o.nonSmoking===true&&<li className="good">Non-smoking</li>}{o.nonSmoking===false&&<li className="warn">Smoking allowed</li>}
      <li className={o.booking==='required'?'warn':o.booking==='walk-in'?'good':''}>{label(BOOKING,o.booking)}</li>
      {o.menu!=='unknown'&&<li className={o.menu==='japanese'?'warn':'good'}>{label(MENUS,o.menu)}</li>}
      {o.cashOnly===true&&<li className="warn">Cash only</li>}
     </ul>
     {o.why&&<p>{o.why}</p>}
     {(o.channel!=='unknown'||o.cancellation)&&<p><small>{o.channel==='none'?'Doesn’t take bookings.':o.channel!=='unknown'?`Books via ${label(CHANNELS,o.channel)}.`:''}{o.cancellation?` Cancellation: ${o.cancellation}`:''}</small></p>}
     {o.openNote&&<p><small>{o.openNote}</small></p>}
     <div className="row wrap">
      {o.bookingUrl&&<a className="button" href={o.bookingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Book</a>}
      {o.website&&!o.bookingUrl&&<a className="button" href={o.website} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Website</a>}
      {o.booking!=='walk-in'&&o.channel!=='none'&&<button type="button" onClick={()=>setOpen(open===id?null:id)}>Booking message</button>}
      {parent&&<button type="button" className="primary" disabled={busy} onClick={()=>eatHere(o)}><Plus size={15}/>We’ll eat here</button>}
     </div>
     {open===id&&<div className="dinner-message"><p lang="ja">{message.ja}</p><p><small>{message.en}</small></p><button type="button" onClick={()=>copy(message.ja)}><Copy size={15}/>Copy the Japanese</button></div>}
    </>;
 const members=state.members||[],opts=dinnerOptions(found),mine=myDinnerVotes(found,user?.name),toSwipe=opts.filter(x=>!mine[x.key]);
 const swiping=opts.length>1&&!asList,matches=dinnerMatches(found,members),best=matches[0];
 const copy=t=>navigator.clipboard?.writeText(t).then(()=>notice?.('Copied.'),()=>{});
 return <section className="dinner-card" aria-label="Dinner tonight">
  <div className="section-heading"><h3><UtensilsCrossed size={17}/> Dinner tonight</h3>
   <button type="button" className="icon" aria-label="Not tonight: put this away for today" onClick={dismiss}><X size={17}/></button></div>
  {!found?<>
   <p>Nothing on the plan for dinner yet. {anchors.map((a,i)=>`${i?'or ':''}${a.id==='hotel'?'at or near':'near'} ${a.label}`).join(', ').replace(/^./,c=>c.toUpperCase())}?</p>
   <div className="row wrap">
    {parent&&config?.dinner&&<button type="button" className="primary" disabled={working||busy} onClick={find}><Search size={16}/>{working?'Looking…':'Find somewhere for dinner'}</button>}
    {openNearby&&<button type="button" onClick={openNearby}><Footprints size={16}/>What’s near here</button>}
    <button type="button" onClick={dismiss}>We’re sorted</button>
   </div>
   {!parent&&<small>A grown-up can look for somewhere from their phone.</small>}
  </>:<>
   <GuideByline state={state} verb='Picked by'/>
   <label className="dinner-time">Eating at<input type="time" value={time} onChange={e=>setTime(e.target.value||'18:00')}/></label>
   {swiping&&toSwipe.length>0&&<>
    <p className="dinner-swipe-hint"><small>Everyone swipes on their own phone: right if you feel like it, left if not. Matches show once you’ve been through them.</small></p>
    <SuggestDeck items={toSwipe} keyOf={x=>x.key} titleOf={x=>x.option.title} busy={voting||busy}
     onKeep={x=>vote(x,'yes')} onPass={x=>vote(x,'no')} keepLabel="I feel like it" keepStamp="Yum" passLabel="Not tonight" passStamp="Nope" keptWord="liked"
     render={x=><article className="dinner-option deck-dinner"><p className="eyebrow">{x.group.anchor==='hotel'?`At or near ${x.group.label}`:`Near ${x.group.label}`}</p>{optionBody(x.option,x.key)}</article>}/>
   </>}
   {swiping&&!toSwipe.length&&<div className="dinner-matches">
    {best?.everyone?<p className="dinner-match-all"><PartyPopper size={18}/><strong>It’s a match: everyone feels like {best.option.title}.</strong></p>
     :best?.clear?<p className="dinner-match-all"><Heart size={18}/><strong>{best.yes.join(', ')} all want {best.option.title}</strong>{best.waiting.length?` · still to swipe: ${best.waiting.join(', ')}`:''}</p>
     :<p>{matches.length?'No clear winner yet.':'Nobody has said yes to anything yet.'}{opts.some(x=>members.some(n=>!found.votes?.[x.key]?.[n]))?` Still to swipe: ${members.filter(n=>opts.some(x=>!found.votes?.[x.key]?.[n])).join(', ')}.`:''}</p>}
    <ol className="dinner-match-list">{matches.map(m=><li key={m.key} className={m.everyone?'all':m.clear?'clear':''}>
     <span><strong>{m.option.title}</strong><small>{m.yes.length} of {members.length} · {m.yes.join(', ')}{m.no.length?` · not ${m.no.join(', ')}`:''}{m.waiting.length?` · waiting on ${m.waiting.join(', ')}`:''}</small></span>
     {parent&&<button type="button" className={m===best?'primary':''} disabled={busy} onClick={()=>eatHere(m.option)}><Plus size={15}/>We’ll eat here</button>}
    </li>)}</ol>
    <div className="row wrap"><button type="button" disabled={voting} onClick={resetVotes}><RotateCcw size={15}/>Change my swipes</button></div>
   </div>}
   {opts.length>1&&<button type="button" className="hunt-link" onClick={()=>setAsList(v=>!v)}><List size={14}/>{asList?'Back to swiping':'See them all as a list'}</button>}
   {!swiping&&found.groups.map(g=><div key={g.anchor} className="dinner-group">
    <h4>{g.anchor==='hotel'?`At or near ${g.label}`:`Near ${g.label}`}</h4>
    {g.options.map((o,i)=><article key={`${g.anchor}-${i}`} className="dinner-option">{optionBody(o,`${g.anchor}-${i}`)}</article>)}
   </div>)}
   {found.note&&<p><small>{found.note}</small></p>}
   <div className="row wrap">{parent&&config?.dinner&&<button type="button" disabled={working||busy} onClick={find}>{working?'Looking…':'Look again'}</button>}<button type="button" onClick={dismiss}>Not tonight</button></div>
   <small>Looked up on the web{found.by?` for ${found.by}`:''}: opening hours and seats change, so ring or check before walking far.</small>
  </>}
 </section>;
}
