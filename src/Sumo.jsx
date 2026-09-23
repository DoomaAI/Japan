import React,{useState} from 'react';
import {Download,ExternalLink,RefreshCw,Search,Trophy,AlertCircle,User,Clock,X,Check,Lock} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {SUMO_SITE_DIVISIONS,sumoSiteUrl,sumo,sumoCard,sumoBouts,divisionLabel,wrestlerProfile,boutResult,currentBout,boutPredictions,predictionsClosed,predictionTally,predictionLeaders,predictionLadder,tippingTable} from './trip-features.js';
import {japanClock} from './timing.js';
import {PRINTED_CARD} from './sumo-printed.js';
import {sumoName} from './sumo-names.js';
import SayIt from './SayIt.jsx';
// Rank and stable, each on a line of its own and each labelled, because "Isegahama" on its own
// means nothing to a first-timer. The record going into the day rides on the rank's line, which
// is where the printed programme puts it too.
const splitRank=rank=>{const m=/^(.*?)(?:\s*·\s*)?(\d{1,2}-\d{1,2})$/.exec(rank||'');return m?{rank:m[1],record:m[2]}:{rank:rank||'',record:''};};
const Standing=({man,side})=>{const {rank,record}=splitRank(man.rank);
 if(!rank&&!record&&!man.stable)return <small className="sumo-standing">{side||'Tap to look him up'}</small>;
 return <small className="sumo-standing">
  {(side||rank||record)&&<span>{[side,rank].filter(Boolean).join(' · ')}{record&&<>{side||rank?' · ':''}<b>{record}</b></>}</span>}
  {man.stable&&<span>{man.stable} stable</span>}
 </small>;};
// Each side carries the name as it is written in the arena and how to say it, because the ring
// announcer calls it in Japanese and the board up top is in kanji.
const Side=({man,onLook,won,lost,how})=>{const jp=sumoName(man.name);
 return <button className={`sumo-side ${won?'won':''} ${lost?'lost':''}`} onClick={()=>onLook(man)}>
 <strong>{man.name}</strong>
 {jp&&<span className="sumo-jp"><span lang="ja">{jp.kanji}</span><i>{jp.say}</i></span>}
 <Standing man={man}/>
 {won&&<span className="sumo-won"><Trophy size={13}/>Won{how?` · ${how}`:''}</span>}
</button>;};
// The official pages for the day, one per division. Each division and day has its own address on
// the association's site, so these go straight to the right page rather than to its front door.
const OfficialLinks=({dayNumber})=><div className="row wrap sumo-official">
 {SUMO_SITE_DIVISIONS.map(([id,,label])=><a key={id} className="button" href={sumoSiteUrl(dayNumber??undefined,id)} target="_blank" rel="noopener noreferrer">
  {label} · official <ExternalLink size={14}/></a>)}
</div>;
// Four picks, one phone. In the arena there is a single phone out and everybody shouting at
// it, so whoever is holding it enters all four — this is the one place in the app where you
// record somebody else's answer. Each of us is a chip: drag it onto the wrestler you are backing,
// or back to the bench to take the pick away. A drag needs a steady thumb in a crowd, so tapping a
// chip and then a wrestler does the same thing. Picks close the moment the result goes in: you
// cannot call a bout you have already watched.
function Picks({state,bout,result,members,mutate,busy,open,onToggle,onAllIn}){
 const picks=boutPredictions(state,bout.id),closed=predictionsClosed(state,bout.id);
 const made=members.filter(n=>picks[n]);
 const [held,setHeld]=useState(null),[drag,setDrag]=useState(null),[over,setOver]=useState(null);
 const sideOf=name=>picks[name]===bout.east.name?'east':picks[name]===bout.west.name?'west':'bench';
 const zoneAt=(x,y)=>document.elementFromPoint(x,y)?.closest?.('[data-sumo-drop]')?.dataset.sumoDrop||null;
 async function place(name,zone){
  setHeld(null);setDrag(null);setOver(null);
  if(!zone||zone===sideOf(name)||busy)return;
  const winner=zone==='east'?bout.east.name:zone==='west'?bout.west.name:null;
  const ok=await mutate({type:'sumoPredict',id:bout.id,person:name,winner});
  // Everybody is in: move straight on to the next bout nobody has finished calling.
  if(ok&&winner&&members.every(n=>n===name||picks[n]))onAllIn?.();
 }
 const down=(name,e)=>{if(busy||e.button>0)return;e.currentTarget.setPointerCapture?.(e.pointerId);
  setDrag({name,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,moved:false});};
 const move=e=>{if(!drag)return;const moved=drag.moved||Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>8;
  setDrag({...drag,x:e.clientX,y:e.clientY,moved});if(moved)setOver(zoneAt(e.clientX,e.clientY));};
 const up=e=>{if(!drag)return;const {name,moved}=drag;
  if(moved)place(name,zoneAt(e.clientX,e.clientY));
  else{setDrag(null);setHeld(held===name?null:name);}};
 // Plain functions rather than components, so a re-render mid-drag keeps the same chip (and its
 // pointer capture) instead of mounting a new one.
 const chip=name=><button key={name} type="button" className={`sumo-chip ${held===name?'held':''} ${drag?.moved&&drag.name===name?'lifting':''}`}
  disabled={busy} aria-pressed={held===name} aria-label={`${name}${picks[name]?`, backing ${picks[name]}`:', not called yet'}. Tap, then tap a wrestler.`}
  onPointerDown={e=>down(name,e)} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{setDrag(null);setOver(null);}} onClick={e=>e.stopPropagation()}>{name}</button>;
 const dropZone=(zone,label,man,side)=>{const here=members.filter(n=>sideOf(n)===zone);
  return <div key={zone} role="button" tabIndex={held?0:-1} data-sumo-drop={zone} aria-label={held?`Put ${held} on ${label}`:label}
   className={`sumo-drop ${zone} ${over===zone?'over':''} ${held&&sideOf(held)!==zone?'ready':''}`}
   onClick={()=>held&&place(held,zone)} onKeyDown={e=>{if(held&&(e.key==='Enter'||e.key===' ')){e.preventDefault();place(held,zone);}}}>
   <span className="sumo-drop-label"><strong>{label}</strong>{zone!=='bench'&&sumoName(label)&&<span className="sumo-jp" lang="ja">{sumoName(label).kanji}</span>}{man&&<Standing man={man} side={side}/>}</span>
   <span className="sumo-drop-chips">{here.map(chip)}
    {!here.length&&<small className="sumo-drop-hint">{zone==='bench'?'Everybody has called it':'Drop a name here'}</small>}</span>
  </div>;};
 return <div className="sumo-picks">
  <div className="row wrap">
   <button className="sumo-pick-toggle" onClick={onToggle} aria-expanded={open}>
    {closed?<Lock size={13}/>:<Trophy size={13}/>}
    {made.length?`${made.length} of ${members.length} called it`:closed?'Nobody called this one':'Who do we think?'}
   </button>
   {!open&&made.map(name=>{
    const right=result&&result.winner===picks[name];
    return <span className={`tag pick ${result?(right?'up':'down'):''}`} key={name}>
     {result&&(right?<Check size={12}/>:<X size={12}/>)}{name}: {picks[name]}</span>;
   })}
  </div>
  {open&&(closed
   ?<div className="sumo-pick-grid"><p><small>This one has been watched, so the picks are closed. Clear the result above to reopen them.</small></p>
    <div className="row wrap">{made.map(name=>{const right=result&&result.winner===picks[name];
     return <span className={`tag pick ${right?'up':'down'}`} key={name}>{right?<Check size={12}/>:<X size={12}/>}{name}: {picks[name]}</span>;})}</div></div>
   :<div className="sumo-board">
    <div className="sumo-board-sides">
     {dropZone('east',bout.east.name,bout.east,'East')}
     {dropZone('west',bout.west.name,bout.west,'West')}
    </div>
    {dropZone('bench','Not called yet')}
    <small>{held?`Now tap the wrestler ${held} is backing.`:'Drag each name onto who they think will win — or tap a name, then a wrestler. Drag it back here to take a pick away.'}</small>
    {drag?.moved&&<span className="sumo-chip ghost" aria-hidden="true" style={{left:drag.x,top:drag.y}}>{drag.name}</span>}
   </div>)}
 </div>;
}
// The ladder, which is the half of a tipping comp people actually argue about: where everybody
// sits, how many each has called right, and how much is still to come. Everybody is on it from
// the first bout, including whoever has not called one yet, and a tie is a shared place.
function Ladder({ladder,leaders}){
 return <div className="sumo-tally">
  <p className="eyebrow">THE TIPPING TABLE</p>
  <table className="tipping-ladder">
   <thead><tr>
    <th scope="col" className="place">#</th><th scope="col" className="who">Who</th>
    <th scope="col">Right</th><th scope="col">Wrong</th><th scope="col">To come</th><th scope="col">Hit rate</th>
   </tr></thead>
   <tbody>{ladder.map(row=><tr key={row.name} className={leaders.includes(row.name)?'leader':''}>
    <td className="place">{row.place}</td>
    <th scope="row" className="who">{leaders.includes(row.name)&&<Trophy size={13}/>}{row.name}</th>
    <td className="score">{row.right}</td><td>{row.wrong}</td><td>{row.waiting||'—'}</td>
    <td>{row.percent===null?'—':`${row.percent}%`}</td>
   </tr>)}</tbody>
  </table>
 </div>;
}
// The sheet under it: every bout anybody called, and what each of them said. A phone held in one
// hand in a basement will not hold four columns of names like Kotozakura, so a pick is the side
// of the card it was on — east or west — with the two names spelled out in the bout column.
function Sheet({table}){
 if(!table.rows.length)return null;
 return <details className="sumo-sheet"><summary>The sheet — who called what</summary>
  <div className="sumo-sheet-scroll"><table>
   <thead><tr><th scope="col" className="bout">Bout</th>
    {table.people.map(name=><th scope="col" key={name}>{name}</th>)}</tr></thead>
   <tbody>{table.rows.map(row=><tr key={row.id}>
    <th scope="row" className="bout">
     <small>{row.time||'—'}</small>
     <b className={row.winner?(row.winner===row.east?'won':'lost'):''}>E&nbsp;{row.east}</b>
     <b className={row.winner?(row.winner===row.west?'won':'lost'):''}>W&nbsp;{row.west}</b>
    </th>
    {row.picks.map(pick=><td key={pick.name} className={pick.outcome}>
     {pick.pick?<>
      <span aria-hidden="true">{pick.side==='east'?'E':'W'}</span>
      {pick.outcome==='right'&&<Check size={12}/>}{pick.outcome==='wrong'&&<X size={12}/>}
      <span className="said">{pick.name} called {pick.pick}
       {pick.outcome==='right'?' and was right':pick.outcome==='wrong'?' and was wrong':', still to come'}</span>
     </>:<><span aria-hidden="true">·</span><span className="said">{pick.name} did not call this one</span></>}
    </td>)}
   </tr>)}</tbody>
   <tfoot><tr><th scope="row" className="bout">Called right</th>
    {table.totals.map(total=><td key={total.name}>{total.right}<small>/{total.called}</small></td>)}</tr></tfoot>
  </table></div>
  <p><small>E is the east side of the card and W the west, so a pick fits beside three others. The
   winner is the name in green, and the bottom row is how many each of us has called right.</small></p>
 </details>;
}
// The day's card, fetched from the official schedule before we go and then kept in the trip.
// The arena is a basement full of phones, so everything here has to work with the list already
// on the device: only fetching needs a connection.
export default function Sumo({state,user,day,mutate,busy,request,config,notice,now}){
 const card=sumo(state),groups=sumoCard(state),parent=user.role==='parent';
 const [fetching,setFetching]=useState(false),[error,setError]=useState('');
 const [looking,setLooking]=useState(null),[lookupError,setLookupError]=useState('');
 const [picking,setPicking]=useState(null);
 const [checking,setChecking]=useState(false),[resultsError,setResultsError]=useState('');
 const canFetch=parent&&!!config?.sumo;
 const tally=predictionTally(state),leaders=predictionLeaders(state);
 const ladder=predictionLadder(state,state.members),sheet=tippingTable(state,state.members);
 const clock=japanClock(now||new Date()),onNow=currentBout(state,clock);
 // After the last name goes onto a bout, the next one in running order that is still open and
 // still waiting on somebody, so the phone can go round the table bout after bout.
 const order=groups.flatMap(g=>g.bouts);
 const nextToCall=id=>{const from=order.findIndex(b=>b.id===id);
  return order.slice(from+1).find(b=>!predictionsClosed(state,b.id)&&state.members.some(n=>!boutPredictions(state,b.id)[n]))?.id??null;};
 async function load(){
  setFetching(true);setError('');
  try{
   const result=await request('sumo-card',{date:day});
   if(await mutate({type:'sumoUpdate',...result}))notice?.(`${result.bouts.length} bouts loaded. It works from here with no signal.`);
  }catch(e){setError(e.message||'The card could not be fetched. The official schedule is at sumo.or.jp.');}
  finally{setFetching(false);}
 }
 // The programme from the door, typed in, for when the official site cannot be read. It replaces
 // the card like a download does, so any winners and picks on bouts it shares are kept.
 async function usePrinted(){
  if(card.bouts.length&&!confirm('Replace the card on the phone with the printed Day 11 programme?'))return;
  setError('');
  if(await mutate({type:'sumoUpdate',...PRINTED_CARD}))notice?.(`${PRINTED_CARD.bouts.length} bouts loaded from the printed programme. It works from here with no signal.`);
 }
 // Who has won, as the official site has it. Only ever asked for by a parent pressing the button:
 // each read is a paid call, so it happens when somebody wants it and not on a timer.
 async function updateWinners(){
  setChecking(true);setResultsError('');
  try{
   const read=await request('sumo-results',{date:card.date});
   const fresh=read.results.filter(r=>{const had=boutResult(state,r.id);return !had?.official||had.winner!==r.winner;});
   if(await mutate({type:'sumoResults',results:read.results,note:read.notes||''}))
    notice?.(fresh.length?`${fresh.length} ${fresh.length===1?'winner':'winners'} in from the official site.`:'Nothing new on the official site yet.');
  }catch(e){setResultsError(e.message||'The official results could not be read.');}
  finally{setChecking(false);}
 }
 async function look(man){
  const known=wrestlerProfile(state,man.name);
  const fetch_=!known&&parent&&!!config?.sumo;
  setLookupError('');setLooking({name:man.name,profile:known,busy:fetch_});
  if(!fetch_)return;
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
  {!!tally.length&&<><Ladder ladder={ladder} leaders={leaders}/><Sheet table={sheet}/></>}
  {onNow&&<p className="sumo-now"><Clock size={16}/>About now: <strong>{onNow.east.name}</strong> v <strong>{onNow.west.name}</strong> · {divisionLabel(onNow.division)}</p>}
  {canFetch&&<div className="row wrap">
   <button className="primary" disabled={busy||fetching} onClick={load}>
    {card.bouts.length?<RefreshCw size={16}/>:<Download size={16}/>}
    {fetching?'Reading the official schedule…':card.bouts.length?'Refresh the card':'Download the day’s card'}</button>
   {card.bouts.length>0&&<button disabled={busy||checking} onClick={updateWinners}>
    <Trophy size={16}/>{checking?'Reading the results…':'Update winners from the site'}</button>}
  </div>}
  {parent&&<div className="row wrap">
   <button className={canFetch?'':'primary'} disabled={busy||fetching} onClick={usePrinted}>
    <Download size={16}/>{card.bouts.length?'Use the printed programme instead':'Use the printed Day 11 programme'}</button>
  </div>}
  {card.bouts.length>0&&<p className="sumo-results-status"><small>
   {card.resultsAt?`Winners last checked on the official site at ${japanClock(new Date(card.resultsAt))}${card.resultsNote?` — ${card.resultsNote}`:''}.`:'Winners have not been checked on the official site yet.'}
   {' '}Anyone can still tap who won as they watch; a parent can pull the official results in with the button above.</small></p>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {resultsError&&<p className="callout"><AlertCircle size={18}/>{resultsError}</p>}
  <OfficialLinks dayNumber={card.dayNumber}/>
  {!card.bouts.length&&<div className="empty">
   <h3>No card loaded yet</h3>
   <p>The match-ups are published on the official site the afternoon before, so fetch this the day before or on the morning of {dayLabel(day)}.{parent&&config?.sumo?'':' A parent does this while there is signal.'}</p>
  </div>}
  {groups.map(group=><section className="sumo-group" key={group.id}>
   <h4>{group.label}</h4>
   {group.bouts.map(bout=>{
    const result=boutResult(state,bout.id);
    return <article className={`sumo-bout ${onNow?.id===bout.id?'now':''}`} key={bout.id}>
     <span className="sumo-time">{bout.time||'—'}</span>
     <div className="bout-pair">
      <Side man={bout.east} onLook={look} won={result?.winner===bout.east.name} lost={!!result&&result.winner!==bout.east.name} how={result?.kimarite}/>
      <span className="sumo-v">v</span>
      <Side man={bout.west} onLook={look} won={result?.winner===bout.west.name} lost={!!result&&result.winner!==bout.west.name} how={result?.kimarite}/>
     </div>
     <div className="row wrap sumo-winner">
      <small>{result?.official?<><Check size={12}/> Official result</>:'Who won?'}</small>
      {[bout.east.name,bout.west.name].map(name=>
       <button key={name} className={result?.winner===name?'selected':''} disabled={busy}
        onClick={()=>mutate({type:'sumoResult',id:bout.id,winner:result?.winner===name?null:name,by:user.name})}>{name}</button>)}
     </div>
     <Picks state={state} bout={bout} result={result} members={state.members} mutate={mutate} busy={busy}
      open={picking===bout.id} onToggle={()=>setPicking(picking===bout.id?null:bout.id)} onAllIn={()=>setPicking(nextToCall(bout.id))}/>
    </article>;})}
  </section>)}
  {!!card.sources.length&&<details className="sumo-sources"><summary>Where this came from</summary>
   <ul>{card.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title||s.url} <ExternalLink size={12}/></a></li>)}</ul>
   <p><small>Times are approximate and cards change — wrestlers withdraw and the order shifts. The board in the arena is the one that counts.</small></p>
  </details>}
  {looking&&<div className="sumo-profile">
   <div className="section-heading"><h4><User size={17}/>{looking.name}</h4>
    <button className="icon" aria-label="Close" onClick={()=>{setLooking(null);setLookupError('');}}><X size={18}/></button></div>
   {sumoName(looking.name)&&<>
    <p className="destination-japanese" lang="ja">{sumoName(looking.name).kanji}</p>
    <SayIt phrase={sumoName(looking.name).phrase}/>
   </>}
   {looking.busy&&<p><Search size={15}/> Looking him up…</p>}
   {lookupError&&<p className="callout"><AlertCircle size={18}/>{lookupError}</p>}
   {looking.profile?<>
    {looking.profile.japanese&&!sumoName(looking.name)&&<p className="destination-japanese" lang="ja">{looking.profile.japanese}</p>}
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
   </>:!looking.busy&&!lookupError&&!sumoName(looking.name)&&<p>Nothing saved about him yet.{parent&&config?.sumo?'':' A parent can look him up while there is signal.'}</p>}
  </div>}
 </div>;
}
