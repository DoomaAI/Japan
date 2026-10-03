import React,{useEffect,useRef,useState} from 'react';
import {AlertTriangle,Check,CheckCircle2,Footprints,TrainFront,TrainFrontTunnel,TramFront,Bus,Radio,ExternalLink,LocateFixed,Square,Eye,Ticket,Baby,ChevronDown,ArrowLeft,ArrowRight,Luggage,MapPinPlus,Trash2,Pencil,CarTaxiFront,Clock,Navigation,Shuffle,Undo2} from 'lucide-react';
import {LINES,legStops,stationLabel,whereOnRoute,rideTrouble,restartRide,liveTimes,routeFares,yen,lineSymbols,inkOn,symbolStyle,symbolColour,legCount,legDone,legsTicked,legToDo,legStrip,ROUTES,MAX_WAYPOINTS,WAYPOINT_KINDS,routeMinutes,addedMinutes,SWAP_MODES,LEG_LABELS,legName,legLabel,swappable,baseMinutes,ownJourney,guideRoute} from './route-data.js';
import {minutes as clockMinutes,asClock} from './timing.js';
import {swipeDelta,isControl,typesText,stepIndex} from './swipe.js';
import {GEO_TROUBLE,GEO_UNKNOWN} from './geo.js';
import BigSteps,{BigStepsButton} from './BigSteps.jsx';
// Follows the phone along the route while it is open and tracking is on. GPS fades underground,
// so the last good fix is kept and its age shown rather than guessing. The fixes of the last half
// hour are kept too, rough ones left out, so a train going the wrong way or off the route can be
// told from a phone that has just lost its place.
const TRAIL=30*60000,ROUGH=200;
function useTracking(rides,rideLegs){
 const [on,setOn]=useState(false),[fix,setFix]=useState(null),[trail,setTrail]=useState([]),[trouble,setTrouble]=useState(''),[fine,setFine]=useState(()=>new Set()),buzzed=useRef(new Set());
 useEffect(()=>{
  if(!on){setTrail([]);return;}
  if(!navigator.geolocation){setTrouble('This phone cannot share its position');setOn(false);return;}
  const id=navigator.geolocation.watchPosition(p=>{
   const f={lat:p.coords.latitude,lng:p.coords.longitude,at:Date.now()};
   setTrouble('');setFix(f);
   if(!(p.coords.accuracy>ROUGH))setTrail(t=>[...t.filter(x=>f.at-x.at<TRAIL),f]);
  },e=>setTrouble(GEO_TROUBLE[e?.code]||GEO_UNKNOWN),{enableHighAccuracy:true,maximumAge:10000,timeout:30000});
  return ()=>navigator.geolocation.clearWatch(id);
 },[on]);
 const where=fix&&whereOnRoute(rides,fix);
 const problem=on&&trail.length>1?rideTrouble(rideLegs,trail,rides):null,wrong=problem&&!fine.has(`${problem.i}:${problem.kind}`)?problem:null;
 useEffect(()=>{
  if(!where?.ready)return;
  const key=`${where.i}`;
  if(buzzed.current.has(key))return;
  buzzed.current.add(key);navigator.vibrate?.([200,100,200]);
 },[where?.i,where?.ready]);
 // Said once a ride: a long buzz, and a notification as well when the app is not on screen.
 useEffect(()=>{
  if(!wrong)return;
  const key=`wrong:${wrong.i}:${wrong.kind}`;
  if(buzzed.current.has(key))return;
  buzzed.current.add(key);navigator.vibrate?.([600,200,600,200,600]);
  if(document.visibilityState!=='visible'&&typeof Notification!=='undefined'&&Notification.permission==='granted')
   navigator.serviceWorker?.ready.then(r=>r.showNotification(wrongWords(wrong,rideLegs[wrong.i]).title,{body:wrongWords(wrong,rideLegs[wrong.i]).text,tag:`wrong-${wrong.kind}-${wrong.i}`,icon:'/icon-192.png',badge:'/favicon-32.png',data:{url:location.href}})).catch(()=>{});
 },[wrong?.i,wrong?.kind]);
 const rightWay=w=>setFine(s=>new Set(s).add(`${w.i}:${w.kind}`));
 // A ride started again is watched afresh from here: the trail so far went the wrong way.
 const restart=()=>{setTrail(t=>t.slice(-1));for(const k of [...buzzed.current])if(k.startsWith('wrong:')||!k.includes(':'))buzzed.current.delete(k);};
 return {on,setOn,fix,where,wrong,rightWay,restart,trouble};
}
const vehicle=leg=>LINES[leg.line].kind==='Bus'?'bus':'train';
function wrongWords(wrong,leg){
 const v=vehicle(leg),line=LINES[leg.line].name,towards=leg.towards.replace(/[.]$/,'');
 if(wrong.kind==='route')return {title:'Off the route?',
  text:`About ${(wrong.metres/1000).toFixed(1)} km off the ${line} between ${wrong.from.name} and ${wrong.to.name}, last on it near ${wrong.left.name}: this ${v} may be on another line or branch.`,
  fix:`Get off at the next stop and check the signs: the ${line} to ${wrong.to.name} runs towards ${towards}. Live times can find the way back from where you are.`};
 const where=wrong.behind?`Near ${stationLabel(wrong.behind)}, back the other way from ${wrong.from.name}`:`Moving away from ${wrong.from.name} on the far side from the next stop`;
 return {title:'Going the wrong way?',text:`${where}: this ${v} looks to be heading away from ${wrong.to.name}.`,fix:`Get off at the next stop and take a ${v} back to ${wrong.from.name}, then board towards ${towards}.`};
}
function WrongWay({wrong,leg,onFine,onRestart}){
 const w=wrongWords(wrong,leg);
 return <div className="route-wrong" role="alert"><p><AlertTriangle size={16}/><strong>{w.title}</strong></p><span>{w.text}</span><span>{w.fix}</span>
  <div className="route-wrong-actions"><button type="button" onClick={onRestart}><Undo2 size={14}/>Yes, wrong {vehicle(leg)}: show the way back</button>
  <button type="button" onClick={onFine}><Check size={14}/>We are on the right {vehicle(leg)}</button></div></div>;
}
function Tracker({legs,rides,track,status,onPress,onRestart}){
 const {on,setOn,fix,where,wrong,trouble}=track,[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!on)return;const t=setInterval(()=>setNow(Date.now()),15000);return ()=>clearInterval(t);},[on]);
 const rideLegs=legs.filter(l=>l.mode==='ride'),leg=where&&rideLegs[where.i],stops=where&&rides[where.i];
 const age=fix?Math.round((now-fix.at)/60000):0;
 return <>
 <button className={`route-track-toggle${on?' is-on':''}`} aria-pressed={on} onClick={()=>{onPress();setOn(!on);}}>{on?<><Square size={14}/>Stop tracking</>:<><LocateFixed size={14}/>Track this ride</>}</button>
 {status&&<div className={`route-track${where?.ready?' ready':''}`} aria-live="polite">
  {on&&!fix&&!trouble&&<span>Finding you…</span>}
  {on&&wrong&&<WrongWay wrong={wrong} leg={rideLegs[wrong.i]} onFine={()=>track.rightWay(wrong)} onRestart={()=>onRestart(wrong)}/>}
  {trouble&&<span>{trouble}. Count the stops from the list instead.</span>}
  {on&&fix&&!where&&!wrong&&<span>Not near any {rideLegs.some(l=>LINES[l.line].kind!=='Bus')?'station':'stop'} on this route yet.</span>}
  {on&&where&&!wrong&&(where.arrived
   ?<p className="route-now"><strong>At {stationLabel(where.nearest)}. Get off here.</strong>{leg.exit&&<span>{leg.exit}</span>}</p>
   :<p className="route-now"><small>{where.at?'Next stop':'Approaching'}{where.next===stops.length-1?' · get off here':''}</small><strong>{stationLabel(where.upcoming)}</strong><span>{where.at?`Now at ${stationLabel(where.nearest)} · `:''}{where.togo} stop{where.togo===1?'':'s'} to {stationLabel(stops[stops.length-1])} on the {LINES[leg.line].name}</span></p>)}
  {on&&fix&&age>=2&&<small>Last position {age} min ago; underground the phone often loses it.</small>}
 </div>}
 </>;
}
// The line symbol as the operator draws it (see symbolStyle): a ring round a white centre, a
// colour-filled shape, or JR East's framed square with the code on a black tab.
function LineSymbol({code,line}){
 const style=symbolStyle(line),colour=symbolColour(line,code);
 if(style==='jre')return <b className="line-symbol jre" style={{borderColor:colour}} aria-hidden="true"><span>{code}</span></b>;
 const [kind,shape]=style.split(' ');
 return <b className={`line-symbol ${kind} ${shape}`} style={kind==='ring'?{borderColor:colour}:{background:colour,color:inkOn(colour)}} aria-hidden="true">{code}</b>;
}
const KIND_ICON={Subway:TrainFrontTunnel,Bus,Monorail:TramFront};
// The tick beside one leg. Whoever may tick the stop may tick its legs; everyone else still sees
// which legs are behind the family. The mark is the same circle as a stop's on the day at a glance,
// with the checkbox laid invisibly over the whole label so the finger target stays generous.
function LegTick({step,k,label,canTick,busy,onTick}){
 const done=legDone(step,k);
 return <label className={`route-leg-tick${done?' is-done':''}`}><input type="checkbox" checked={done} disabled={busy||!canTick} aria-label={`${done?'Done':'Mark done'}: leg ${k+1}, ${label}`} onChange={e=>onTick(k,e.target.checked)}/><span className="route-leg-dot" aria-hidden="true">{done&&<Check size={10} strokeWidth={3}/>}</span><span>{done?'Done':'Done?'}</span></label>;
}
// The strip along the top of a route of several legs: one segment per leg, coloured by its
// standing (done, now, to come) and marked under the leg on show. Tapping a segment turns to
// that leg, so a parent can look ahead at the change without swiping through the walk first.
const STATUS_WORD={done:'Done',now:'Now','to come':'To come'};
function LegStrip({legs,strip,go}){
 const n=strip.length,on=strip.find(l=>l.showing),done=strip.filter(l=>l.done).length;
 return <div className="route-legs">
  <div className="route-leg-strip" role="tablist" aria-label="Legs of this route">
   {strip.map(l=>{
    const leg=legs[l.k],Icon=LEG_ICON[l.mode]||KIND_ICON[LINES[leg.line].kind]||TrainFront;
    return <button type="button" role="tab" key={l.k} id={`route-leg-tab-${l.k}`} aria-selected={l.showing} aria-controls="route-leg-page" aria-label={`Leg ${l.k+1} of ${n}: ${l.label}, ${STATUS_WORD[l.status].toLowerCase()}`}
     className={`route-leg-pip is-${l.status.replace(' ','-')}${l.showing?' is-showing':''}`} style={l.colour?{'--line':l.colour}:undefined} onClick={()=>go(l.k)}>
     <span className="route-leg-bar" aria-hidden="true"/><span className="route-leg-mark" aria-hidden="true">{l.done?<Check size={12} strokeWidth={3}/>:<Icon size={13}/>}</span>
    </button>;
   })}
  </div>
  <p className="route-leg-caption" aria-live="polite"><b>Leg {on.k+1} of {n} · {on.label}</b><span className={`route-leg-status is-${on.status.replace(' ','-')}`}>{STATUS_WORD[on.status]}</span><small>{done} of {n} done</small></p>
 </div>;
}
// A stop on the way or a leg of the family's own (a walk, a taxi): what it is for, where on the
// route it goes (before the first leg, or after any leg of the guide's route) and roughly how
// long it takes. The same form changes one already added.
const LEG_ICON={stop:Luggage,walk:Footprints,taxi:CarTaxiFront,other:Navigation};
const ADD_ICON={...LEG_ICON,other:TrainFront};
const PLACEHOLDER={stop:'Pick up bags at the hotel',walk:'Walk to the station',taxi:'Taxi to the station',other:'Ginza Line from Shibuya to Asakusa'};
function WaypointForm({step,busy,editing,onSave,onClose}){
 const base=guideRoute(step)||[],[kind,setKind]=useState(editing?.kind||'stop'),[text,setText]=useState(editing?.text||''),[after,setAfter]=useState(editing?editing.after:Math.min(1,base.length)),[minutes,setMinutes]=useState(String(editing?editing.minutes??'':15));
 const submit=async e=>{e.preventDefault();const m=parseInt(minutes,10);if(await onSave({kind,text:text.trim(),after,minutes:m>0?m:null}))onClose();};
 return <form className="route-waypoint-form" onSubmit={submit}>
  <fieldset className="route-waypoint-kinds"><legend>Add</legend>{Object.entries(WAYPOINT_KINDS).map(([k,label])=>{const Icon=ADD_ICON[k];return <label key={k} className={kind===k?'is-on':''}><input type="radio" name="waypoint-kind" value={k} checked={kind===k} onChange={()=>setKind(k)}/><Icon size={14}/>{k==='stop'?'A stop':label}</label>;})}</fieldset>
  <label>{kind==='stop'?'Stop for':kind==='other'?'Which train or bus, from where to where':'Where to'}<input value={text} maxLength={160} required placeholder={PLACEHOLDER[kind]} onChange={e=>setText(e.target.value)}/></label>
  {base.length>0&&<label>Where on the way<select value={after} onChange={e=>setAfter(Number(e.target.value))}>
   <option value={0}>Before setting off</option>
   {base.map((l,k)=>{const s=(step.swaps||[]).find(x=>x.from<=k&&k<=x.to);if(s&&k<s.to)return null;return <option key={k} value={k+1}>{k+1===base.length?'At the end, ':''}after leg {k+1}, {s?`${legName({mode:s.mode})} instead`:legName(l)}</option>;})}
  </select></label>}
  <label>About how long (min)<input type="number" inputMode="numeric" min={1} max={180} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>
  <div className="route-waypoint-actions"><button type="submit" disabled={busy||!text.trim()}>{editing?<><Check size={14}/>Save changes</>:<><MapPinPlus size={14}/>{base.length?'Add to the journey':'Add this leg'}</>}</button><button type="button" onClick={onClose}>Cancel</button></div>
 </form>;
}
// Going another way for part or all of the guide's route: how (a taxi, on foot, another way),
// which legs it stands in for, what to tell the driver or where to walk, and how long it takes.
// The legs on offer are the travel legs not yet done and not already changed; the time starts as
// the guide's own for those legs. The same form changes one already made.
const SWAP_PLACEHOLDER={taxi:'Taxi from the station to the hotel',walk:'Walk to the hotel',other:'Hotel shuttle bus'};
function SwapForm({step,busy,editing,onSave,onClose}){
 const base=guideRoute(step)||[],open=swappable(step,editing?.id),first=open.indexOf(true);
 const [mode,setMode]=useState(editing?.mode||'taxi'),[from,setFrom]=useState(editing?editing.from:first),[to,setTo]=useState(editing?editing.to:first);
 const [text,setText]=useState(editing?.text||''),[minutes,setMinutes]=useState(String(editing?editing.minutes:baseMinutes(step,first,first)||15)),[touched,setTouched]=useState(!!editing);
 // The legs to the end of the run open from the first one chosen; a stop on the way or a leg already done ends it.
 const reach=[];for(let k=from;k>=0&&k<base.length&&open[k];k++)reach.push(k);
 const pick=(f,t)=>{setFrom(f);setTo(t);if(!touched)setMinutes(String(baseMinutes(step,f,t)||15));};
 const runs=[];for(let k=0;k<base.length;k++)if(open[k]&&!open[k-1]){let e=k;while(open[e+1])e++;runs.push([k,e]);}
 // Saying what to tell the driver is optional; left blank, the leg is just called by how ("Taxi").
 const submit=async e=>{e.preventDefault();const m=parseInt(minutes,10);if(await onSave({mode,text:text.trim()||SWAP_MODES[mode],from,to,minutes:m}))onClose();};
 if(first<0&&!editing)return <div className="route-waypoint-form"><p>Every leg is already done or changed.</p><div className="route-waypoint-actions"><button type="button" onClick={onClose}>Close</button></div></div>;
 return <form className="route-waypoint-form route-swap-form" onSubmit={submit}>
  <fieldset className="route-waypoint-kinds"><legend>Go by</legend>{Object.entries(SWAP_MODES).map(([k,label])=>{const Icon=LEG_ICON[k];return <label key={k} className={mode===k?'is-on':''}><input type="radio" name="swap-mode" value={k} checked={mode===k} onChange={()=>setMode(k)}/><Icon size={14}/>{label}</label>;})}</fieldset>
  {runs.length>0&&<div className="route-swap-quick" role="group" aria-label="Quick choice">{runs.map(([a,b])=><button type="button" key={a} aria-pressed={from===a&&to===b} className={from===a&&to===b?'is-on':''} onClick={()=>pick(a,b)}>{a===0&&b===base.length-1?'The whole journey':`${a===b?`Leg ${a+1}`:`Legs ${a+1}–${b+1}`}${b===base.length-1?', to the end':''}`}</button>)}</div>}
  <label>From<select value={from} onChange={e=>{const f=Number(e.target.value);pick(f,f);}}>
   {base.map((l,k)=>open[k]&&<option key={k} value={k}>Leg {k+1}, {legName(l)}</option>)}
  </select></label>
  <label>To<select value={to} onChange={e=>pick(from,Number(e.target.value))}>
   {reach.map(k=><option key={k} value={k}>Leg {k+1}, {legName(base[k])}{k===base.length-1?' (the end)':''}</option>)}
  </select></label>
  <p className="route-swap-instead"><small>Instead of: {base.slice(from,to+1).map(legName).join(', ')}.</small></p>
  <label>{mode==='walk'?'Where to':'What to tell the driver, or how'} <small>(optional)</small><input value={text} maxLength={160} placeholder={SWAP_PLACEHOLDER[mode]} onChange={e=>setText(e.target.value)}/></label>
  <label>About how long (min)<input type="number" inputMode="numeric" min={1} max={240} required value={minutes} onChange={e=>{setTouched(true);setMinutes(e.target.value);}}/></label>
  <div className="route-waypoint-actions"><button type="submit" disabled={busy||!(parseInt(minutes,10)>0)}>{editing?<><Check size={14}/>Save changes</>:<><Shuffle size={14}/>Go this way instead</>}</button><button type="button" onClick={onClose}>Cancel</button></div>
 </form>;
}
// The whole journey door to door, which grows and shrinks as stops and legs are added, and when
// that gets the family there from the journey's start time.
function JourneyTime({legs,step}){
 const total=routeMinutes(legs),extra=addedMinutes(step),changes=legs.filter(l=>l.mode==='ride').length>1;
 if(!total)return null;
 // The legs' own times leave out the walk between one train and the next, so a route with a
 // change says so rather than promising an arrival it cannot keep.
 const arrive=step?.time?asClock((clockMinutes(step.time)+total)%1440):null;
 return <p className="route-total"><Clock size={15}/><span><b>Journey: about {total} min{changes?' on the legs':''}</b>{changes?', plus the changes between trains':''}{arrive?`; ${changes?'no earlier than':'there about'} ${arrive} leaving at ${step.time}`:''}.{extra?` Includes ${extra} min the family added.`:''}</span></p>;
}
// A stop the guide gives no route: the family can build a journey of their own to get there, leg
// by leg (a walk, a train or bus, a taxi, a stop on the way). Until the first leg it is one button.
// A stop whose guide route was set aside for the family's own can have it back.
export function AddJourney({step,busy,onWaypoint,onJourney,startOpen=false}){
 const [open,setOpen]=useState(startOpen);
 return <section className="route-card route-card-empty" aria-label="Route">
  {!open&&<div className="route-waypoint-buttons"><button type="button" className="route-waypoint-add" onClick={()=>setOpen(true)}><MapPinPlus size={14}/>{step.ownRoute?'Add a new journey to get here':'Add a journey to get here'}</button>
   {step.ownRoute&&onJourney&&<button type="button" className="route-waypoint-add" disabled={busy} onClick={()=>onJourney('guide')}><Undo2 size={14}/>Back to the guide's route</button>}</div>}
  {open&&<><div className="route-card-head"><p className="eyebrow">ROUTE</p></div><p className="route-own"><small>The first leg of the way here. Add the rest one at a time after it.</small></p>
   <WaypointForm step={step} busy={busy} onSave={w=>onWaypoint({action:'add',...w})} onClose={()=>setOpen(false)}/></>}
 </section>;
}
// A journey whose ends have moved since it was planned (the stop is somewhere else now, or the
// stop before it changed) says so, from where to where it was planned and where it runs now. The
// family say it is still right, change a leg below, or start a new journey of their own.
const endsText=(e,other)=>e.to!==other.to?`to ${e.to}`:`from ${e.from||'the start of the day'}`;
function MovedJourney({step,ends,busy,canTick,onJourney}){
 const was=step.routeStale.was,now=ends||was,both=was.to!==now.to&&was.from!==now.from;
 const what=both?`This stop and the one before it have changed since this journey was planned (from ${was.from||'the start of the day'} to ${was.to}).`
  :was.to!==now.to?`This stop has moved since the journey was planned: it was planned ${endsText(was,now)}, and the stop is now at ${now.to}.`
  :`The stop before this one has changed: the journey was planned ${endsText(was,now)}, and now starts from ${now.from||'the start of the day'}.`;
 return <div className="route-moved" role="status"><p><AlertTriangle size={15}/><span><b>Check the way here.</b> {what}{step.routeStale.by?` Changed by ${step.routeStale.by}.`:''}</span></p>
  {canTick&&onJourney&&<div className="route-waypoint-actions"><button type="button" disabled={busy} onClick={()=>onJourney('keep')}><Check size={14}/>Still right</button><button type="button" disabled={busy} onClick={()=>onJourney('replace')}><Navigation size={14}/>Plan a new journey</button></div>}</div>;
}
export default function RouteCard({legs,step,canTick,busy,onTick,onWaypoint,onSwap,onJourney,ends,lookOpen=false}){
 // A ride confirmed as the wrong train starts again from where the phone is (restartRide), until
 // the family goes back to the planned stations. Kept on this phone only, like the tracking itself.
 const [restarts,setRestarts]=useState({}),rideLegs=legs.filter(l=>l.mode==='ride'),rides=rideLegs.map((l,i)=>restarts[i]||legStops(l));
 const track=useTracking(rides,rideLegs),where=track.on&&track.where;
 const restart=w=>{if(!track.fix)return;setRestarts(r=>({...r,[w.i]:restartRide(rideLegs[w.i],w,track.fix)}));track.restart();};
 const unrestart=i=>{setRestarts(({[i]:_,...r})=>r);track.restart();};
 const fares=routeFares(legs),priced=legs.some(l=>l.yen||l.options),rideAt=legs.map((l,k)=>legs.slice(0,k).filter(x=>x.mode==='ride').length);
 // Every ride offers the one tracker; its status sits with the ride it is following (the one pressed until it knows).
 const [pressed,setPressed]=useState(0),focus=track.wrong||where,trackAt=focus?focus.i:pressed;
 // Tapping a line's name opens or closes what to look for to find it. Settings chooses how each
 // one starts; the lines tapped since are kept as the ones flipped from that.
 const [flipped,setFlipped]=useState(()=>new Set()),looking=k=>lookOpen!==flipped.has(k),toggleLook=k=>setFlipped(s=>{const n=new Set(s);n.has(k)?n.delete(k):n.add(k);return n;});
 const ticks=step&&onTick?legCount(step):0;
 // A route of several legs turns like a page, one leg at a time: a swipe, the arrows, a tap on
 // the strip, or an arrow key while the card has focus. It opens on the leg the family is up
 // to, ticking a leg off turns to the next, and a tracked ride pulls the card to where the
 // phone is. A drag that began on a button or the tick is a press, not a turn.
 const paged=legs.length>1,[index,setIndex]=useState(()=>legToDo(step,legs.length)),touch=useRef(null),[big,setBig]=useState(false),[form,setForm]=useState(null),[swapForm,setSwapForm]=useState(null);
 // A stop added or removed changes how many legs there are; the page stays on a leg that exists.
 useEffect(()=>{if(index>legs.length-1)setIndex(Math.max(0,legs.length-1));},[legs.length]);
 const own=ownJourney(step),canAdd=onWaypoint&&canTick&&step&&(step.waypoints||[]).length<MAX_WAYPOINTS&&step.status!=='done';
 const canSwap=onSwap&&canTick&&step&&guideRoute(step)&&step.status!=='done'&&swappable(step).some(Boolean);
 const go=k=>setIndex(i=>stepIndex(i,k-i,legs.length)),move=d=>setIndex(i=>stepIndex(i,d,legs.length));
 useEffect(()=>{if(focus&&focus.i>=0){const k=legs.findIndex((l,j)=>l.mode==='ride'&&rideAt[j]===focus.i);if(k>=0)setIndex(k);}},[focus&&focus.i]);
 const tick=(k,label)=>ticks?<LegTick step={step} k={k} label={label} canTick={canTick} busy={busy} onTick={(leg,done)=>{onTick(leg,done);if(done&&leg===index)move(1);}}/>:null,doneClass=k=>ticks>0&&legDone(step,k)?' leg-done':'';
 const renderLeg=(leg,k)=>{
   // The family's own legs say who added them and can be changed or taken off again.
   const added=leg.added&&<p className="route-stop-by"><small>Added{leg.added.by?` by ${leg.added.by}`:''}</small>{onWaypoint&&canTick&&<span>
    <button type="button" disabled={busy} onClick={()=>setForm({editing:{id:leg.added.id,kind:leg.added.kind,text:leg.text,after:leg.added.after,minutes:leg.minutes}})}><Pencil size={13}/>Change</button>
    <button type="button" disabled={busy} onClick={()=>onWaypoint({action:'remove',waypointId:leg.added.id,text:leg.text})}><Trash2 size={13}/>Remove</button></span>}</p>;
   // A leg the family changed says what it stands in for and who changed it, and can be changed again or undone.
   if(leg.swap){const Icon=LEG_ICON[leg.mode],n=leg.swap.to-leg.swap.from+1;return <div className={`route-stop-leg is-${leg.mode==='walk'?'walk':'taxi'} is-swap${doneClass(k)}`} key={k}><p><Icon size={15}/><span><b>{LEG_LABELS[leg.mode]}:</b> {leg.text}{leg.minutes?` About ${leg.minutes} min.`:''}</span>{tick(k,LEG_LABELS[leg.mode].toLowerCase())}</p>
    <p className="route-swap-instead"><small>Instead of {n===1?'leg':'legs'} {leg.swap.from+1}{n>1?`–${leg.swap.to+1}`:''}: {leg.swap.instead.join(', ')}.</small></p>
    <p className="route-stop-by"><small>Changed{leg.swap.by?` by ${leg.swap.by}`:''}</small>{onSwap&&canTick&&step.status!=='done'&&<span>
     <button type="button" disabled={busy} onClick={()=>setSwapForm({editing:{id:leg.swap.id,mode:leg.swap.mode,text:leg.text,from:leg.swap.from,to:leg.swap.to,minutes:leg.minutes}})}><Pencil size={13}/>Change</button>
     <button type="button" disabled={busy} onClick={()=>onSwap({action:'remove',swapId:leg.swap.id,text:leg.text})}><Undo2 size={13}/>Back to the plan</button></span>}</p></div>;}
   if(leg.mode==='stop'||leg.mode==='taxi'||leg.mode==='other'){const Icon=ADD_ICON[leg.mode],label=legLabel(leg);return <div className={`route-stop-leg is-${leg.mode==='other'?'taxi':leg.mode}${doneClass(k)}`} key={k}><p><Icon size={15}/><span><b>{label}:</b> {leg.text}{leg.minutes?` About ${leg.minutes} min.`:''}</span>{tick(k,label.toLowerCase())}</p>{added}</div>;}
   if(leg.mode==='walk'&&leg.added)return <div className={`route-stop-leg is-walk${doneClass(k)}`} key={k}><p><Footprints size={15}/><span><b>Walk:</b> {leg.text}{leg.minutes?` About ${leg.minutes} min.`:''}</span>{tick(k,'walk')}</p>{added}</div>;
   if(leg.mode==='walk')return <p className={`route-walk${doneClass(k)}`} key={k}><Footprints size={15}/><span>{leg.text}{leg.minutes?` About ${leg.minutes} min.`:''}</span>{tick(k,'walk')}</p>;
   const r=rideAt[k],line=LINES[leg.line],stops=rides[r],on=where&&where.i===r,here=on?where.index:-1,next=on&&!where.arrived?where.next:-1;
   const Icon=KIND_ICON[line.kind]||TrainFront,fast=line.fast||[],symbols=lineSymbols(stops);
   return <div className={`route-ride${doneClass(k)}`} key={k} style={{'--line':line.colour}}>
    <div className="route-head"><strong className="route-line"><button type="button" className="route-line-toggle" aria-expanded={looking(k)} aria-controls={`route-look-${k}`} onClick={()=>toggleLook(k)}><Icon size={16}/>{symbols.map(c=><LineSymbol key={c} code={c} line={line}/>)}{line.name} <span lang="ja">{line.ja}</span><ChevronDown size={15} className="route-line-chevron" aria-hidden="true"/></button></strong>{tick(k,line.name)}</div>
    {looking(k)&&<p className="route-look" id={`route-look-${k}`}><Eye size={14}/><span><b>Look for:</b> {line.look}</span></p>}
    <p className="route-kind">{symbols.length===0&&<i aria-hidden="true"/>}{line.kind} · {line.operator}</p>
    {restarts[r]?<div className="route-restarted"><p><Undo2 size={14}/><span><b>The way back.</b> From {stops[0].here?'where you get off':<b>{stationLabel(stops[0])}</b>}, back to <b>{stationLabel(stops.find(s=>s.rejoin))}</b> and on. Board towards: {leg.towards}{/[.)]$/.test(leg.towards)?'':'.'}</span></p><button type="button" onClick={()=>unrestart(r)}>Back to the planned stations</button></div>
    :<p>Board at <b>{stationLabel(stops[0])}</b>. Towards: {leg.towards}{/[.)]$/.test(leg.towards)?'':'.'}</p>}
    <p>Get off at <b>{stationLabel(stops[stops.length-1])}</b> · {stops.length-1} stop{stops.length===2?'':'s'}{leg.minutes&&!leg.options?` · about ${leg.minutes} min`:''}</p>
    {leg.yen&&!leg.options&&<p className="route-fare"><b>Fare:</b> adult {yen(leg.yen[0])} · child {yen(leg.yen[1])}{fares?`, a separate ${line.operator} ticket`:''}{leg.through?`, which also covers the ${LINES[legs[k+1]?.line]?.name||'next ride'} after it: change trains without going out through the gates`:''}. Tap an IC card at the gates, or buy a ticket from the fare machines.{line.childIc?` ${line.childIc}`:''}</p>}
    {leg.ownTicket&&<p className="route-fare"><b>Fare:</b> a ticket of its own now the ride before it goes another way. Tap an IC card at the gates, or buy a ticket from the fare machines.</p>}
    {leg.sameTicket&&<p className="route-fare"><b>Fare:</b> nothing more; the ticket or IC tap from the ride before covers this one. Stay inside the gates to change.</p>}
    {leg.booked&&<p className="route-fare"><b>Tickets:</b> {leg.booked}</p>}
    {leg.options&&<div className="route-options"><b>Options</b>{leg.options.map(o=><div key={o.name}><strong>{o.name} {o.ja&&<span lang="ja">{o.ja}</span>}<small>about {o.minutes} min</small></strong><span>{o.fare}</span><p>{o.how}</p></div>)}</div>}
    <div className="route-follow">
     <details open={here>=0||undefined}><summary>{line.kind==='Bus'?'Stops':'Stations'}</summary>
      {fast.length>0&&<p className="route-fast">{line.allStop} trains stop at all of these. {fast.map(f=><span key={f.tag}><mark>{f.tag}</mark> marks where {/^[AEIOU]/.test(f.name)?'an':'a'} {f.name} stops{f.some?'; “some” means only some of them':''}. </span>)}</p>}
      <ol className="route-stops">{stops.map((s,n)=><li key={n} className={`${n===next?'next':n===here&&where.at?'here':n<(next>=0?next:here)?'passed':''}${s.back?' back':''}`}><span>{s.name}</span>{n===next&&<em>Next</em>}{s.back&&!s.here&&<mark className="back">Back</mark>}{s.rejoin&&<mark className="back">Back on the way</mark>}{s.code&&<code>{s.code}</code>}<span lang="ja">{s.ja}</span>{fast.map(f=>f.at.includes(s.name)?<mark key={f.tag}>{f.tag}</mark>:f.some?.includes(s.name)?<mark key={f.tag} className="some">{f.tag}, some</mark>:null)}</li>)}</ol>
     </details>
     <Tracker legs={legs} rides={rides} track={track} status={r===trackAt} onPress={()=>setPressed(r)} onRestart={restart}/>
    </div>
    <div className="route-links"><a href={liveTimes(leg,stops)} target="_blank" rel="noreferrer"><Radio size={14}/>Live times</a><a href={line.status} target="_blank" rel="noreferrer"><ExternalLink size={14}/>{line.operator} service status</a></div>
    {leg.exit&&<p className="route-exit"><b>Exit{leg.exitAsPlanned?', for the route as planned':''}:</b> {leg.exit}</p>}
   </div>;
 };
 return <section className="route-card" aria-label="Route">
  <div className="route-card-head"><p className="eyebrow">ROUTE</p><BigStepsButton onClick={()=>setBig(true)}/></div>
  {big&&<BigSteps legs={legs} step={step} canTick={canTick&&ticks>0} busy={busy} onTick={onTick} onClose={()=>setBig(false)}/>}
  {ticks>0&&<p className="route-progress"><CheckCircle2 size={15}/><span>{step.status==='done'?<><b>Every leg is done.</b> This stop is complete.</>:<><b>{legsTicked(step)} of {ticks} legs done.</b> Tick each leg as you finish it; the last one ticks off the whole stop.</>}</span></p>}
  {fares&&<p className="route-fares"><Ticket size={15}/><span><b>Fare: adult {yen(fares.adult)} · child {yen(fares.child)} each,</b> as {fares.rides.length} separate tickets, one per company: {fares.rides.map(r=>`${r.operator} ${yen(r.yen[0])} / ${yen(r.yen[1])}`).join(' + ')}. An IC card covers them all: tap out at one company's gates and in again at the next, and each part is charged.{legs.some(l=>l.options)?' Seat tickets on the options below are extra.':''}</span></p>}
  {priced&&<p className="route-fares"><Baby size={15}/><span><b>Under 6 (not yet at school): free.</b> Up to two ride free with each paying adult or child, no ticket; walk through the wide gate with a parent. Only a child aged 6 or over pays the child fare.</span></p>}
  {step?.routeStale&&step.status!=='done'&&<MovedJourney step={step} ends={ends} busy={busy} canTick={canTick} onJourney={onJourney}/>}
  {own&&<p className="route-own"><small>Our own journey{step.ownRoute?', in place of the guide\'s route':': the guide has no route for this stop'}.</small>{step.ownRoute&&onJourney&&canTick&&step.status!=='done'&&<button type="button" className="route-waypoint-add" disabled={busy} onClick={()=>onJourney('guide')}><Undo2 size={13}/>Back to the guide's route</button>}</p>}
  <JourneyTime legs={legs} step={step}/>
  {(canAdd&&!form||canSwap&&!swapForm)&&<div className="route-waypoint-buttons">
   {canAdd&&!form&&<button type="button" className="route-waypoint-add" onClick={()=>{setSwapForm(null);setForm({});}}><MapPinPlus size={14}/>{own?'Add the next leg':'Add a stop or leg on the way'}</button>}
   {canSwap&&!swapForm&&<button type="button" className="route-waypoint-add" onClick={()=>{setForm(null);setSwapForm({});}}><Shuffle size={14}/>Change how we get there</button>}
  </div>}
  {swapForm&&<SwapForm key={swapForm.editing?.id||'new'} step={step} busy={busy} editing={swapForm.editing} onSave={s=>onSwap(swapForm.editing?{action:'update',swapId:swapForm.editing.id,...s}:{action:'add',...s})} onClose={()=>setSwapForm(null)}/>}
  {form&&<WaypointForm key={form.editing?.id||'new'} step={step} busy={busy} editing={form.editing} onSave={w=>onWaypoint(form.editing?{action:'update',waypointId:form.editing.id,...w}:{action:'add',...w})} onClose={()=>setForm(null)}/>}
  {!paged&&legs.map(renderLeg)}
  {paged&&<>
   <LegStrip legs={legs} strip={legStrip(legs,step,index)} go={go}/>
   <div className="route-pager" id="route-leg-page" role="tabpanel" aria-labelledby={`route-leg-tab-${index}`} tabIndex={-1}
    onKeyDown={e=>{if(typesText(e.target))return;if(e.key==='ArrowLeft'){move(-1);e.preventDefault();}else if(e.key==='ArrowRight'){move(1);e.preventDefault();}}}
    onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
    onTouchEnd={e=>{
     const start=touch.current;touch.current=null;
     if(!start||isControl(e.target.tagName)||e.target.closest?.('a,button,label,summary'))return;
     move(swipeDelta(start,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY}));
    }}>
    <div className="route-leg-page" key={index}>{renderLeg(legs[index],index)}</div>
   </div>
   <div className="swipe-controls route-leg-controls">
    <button type="button" disabled={index<=0} onClick={()=>move(-1)}><ArrowLeft size={16}/> Back</button>
    <span>Swipe for the {index>=legs.length-1?'legs before':'next leg'}</span>
    <button type="button" disabled={index>=legs.length-1} onClick={()=>move(1)}>Next leg <ArrowRight size={16}/></button>
   </div>
  </>}
 </section>;
}
