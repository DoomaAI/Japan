import React,{useState,useEffect,useRef} from 'react';
import {Trophy,RotateCcw,Check} from 'lucide-react';
import {TRICKS,MOSHIKAME,HANG,trickById,trickAt,airtime,judge,moshikameWindow,kendamaScore,moshikameScore} from './kendama.js';
import {bestScore} from './trip-features.js';
const INK='#16383b',WOOD='#c9884a',DARK='#9c6433';
// The kendama itself: the crosspiece with the big cup one side and the small cup the other,
// the base cup underneath, and the spike on top. Drawn rather than photographed, like
// everything else here, so it works in a tunnel and looks the same on every phone.
const Ken=({tilt=0})=><g transform={`rotate(${tilt} 50 74)`}>
 <rect x="45" y="52" width="10" height="40" rx="3" fill={WOOD} stroke={INK} strokeWidth="1.6"/>
 <path d="M50 52 47 40h6Z" fill={DARK} stroke={INK} strokeWidth="1.4" strokeLinejoin="round"/>
 <rect x="20" y="56" width="60" height="8" rx="3" fill={WOOD} stroke={INK} strokeWidth="1.6"/>
 <path d="M14 56h14l-2 8H16Z" fill={DARK} stroke={INK} strokeWidth="1.4" strokeLinejoin="round"/>
 <path d="M75 56h11l-2 8h-7Z" fill={DARK} stroke={INK} strokeWidth="1.4" strokeLinejoin="round"/>
 <rect x="41" y="92" width="18" height="6" rx="2" fill={DARK} stroke={INK} strokeWidth="1.4"/>
</g>;
const Tama=({x,y})=><g><circle cx={x} cy={y} r="9" fill="#c0392b" stroke={INK} strokeWidth="1.6"/>
 <circle cx={x} cy={y-3} r="2.6" fill="#7d1f16"/></g>;
export default function Kendama({user,state,mutate,busy}){
 const [mode,setMode]=useState('tricks');
 const [step,setStep]=useState(0),[landed,setLanded]=useState([]);
 const [phase,setPhase]=useState('ready'),[power,setPower]=useState(0);
 const [flight,setFlight]=useState(0),[said,setSaid]=useState(null);
 const [reps,setReps]=useState(0),[bestRun,setBestRun]=useState(0);
 const tossed=useRef(0),drag=useRef(null),area=useRef(null),saved=useRef(null);
 const trick=mode==='tricks'?trickAt(step):MOSHIKAME;
 const window_=mode==='tricks'?trick.window:moshikameWindow(reps);
 const game=mode==='tricks'?'kendama-tricks':'kendama-moshikame';
 // The ball, while it is up. Everything is worked out from how long ago it was thrown, so the
 // catch is judged against the clock rather than against whatever the screen managed to draw.
 useEffect(()=>{
  if(phase!=='flying')return;
  const t=setInterval(()=>{
   const gone=Date.now()-tossed.current;
   setFlight(gone);
   if(gone>airtime(power)+window_+120)miss({says:'It came down and nobody caught it.'});
  },28);
  return ()=>clearInterval(t);
 },[phase,power,window_]);
 function miss(result){
  setPhase('missed');setSaid(result);
  if(mode==='moshikame'&&reps>0){
   setBestRun(r=>Math.max(r,reps));
   mutate({type:'gameScore',person:user.name,game,score:moshikameScore(reps)});
  }
 }
 function pull(strength){
  setPower(strength);setFlight(0);
  // A pull outside the band is already a miss, and you can see that with a real one the moment
  // it leaves your hand — the ball plainly is not going to reach. So it says so straight away
  // rather than making a five-year-old tap a catch that was never going to happen.
  const doomed=judge({band:trick.band,window:window_},strength,airtime(strength));
  if(!doomed.landed)return miss(doomed);
  setSaid(null);tossed.current=Date.now();setPhase('flying');
 }
 function grab(){
  if(phase!=='flying')return;
  const result=judge({band:trick.band,window:window_},power,Date.now()-tossed.current);
  if(!result.landed)return miss(result);
  if(mode==='moshikame'){
   const next=reps+1;setReps(next);setBestRun(r=>Math.max(r,next));
   // The rhythm carries on by itself: in a real one you are not re-throwing, you are keeping
   // it going, and the window closes a little every time.
   tossed.current=Date.now();setFlight(0);setSaid({landed:true,rep:next});
   return;
  }
  const done=[...landed,trick.id];
  setLanded(done);setPhase('landed');setSaid(result);
  mutate({type:'gameScore',person:user.name,game,score:kendamaScore(done)});
 }
 // The pull: a swipe up the kendama, and how far you drag it is how hard you pull.
 const down=e=>{if(phase==='flying')return;drag.current={y:e.clientY};};
 const up=e=>{
  const from=drag.current;drag.current=null;
  if(!from||phase==='flying')return;
  const box=area.current?.getBoundingClientRect();
  const pulled=Math.max(0,from.y-e.clientY)/Math.max(60,(box?.height||220)*0.62);
  if(pulled<0.04)return;
  pull(Math.min(1,pulled));
 };
 const reset=next=>{
  setMode(next);setStep(0);setLanded([]);setPhase('ready');setPower(0);
  setFlight(0);setSaid(null);setReps(0);saved.current=null;
 };
 const again=()=>{setPhase('ready');setSaid(null);setFlight(0);if(mode==='moshikame')setReps(0);};
 const nextTrick=()=>{setStep(s=>Math.min(TRICKS.length-1,s+1));setPhase('ready');setSaid(null);};
 // Where the ball is drawn. It leaves the hang, arcs up, and comes down into the cup this
 // trick is actually named after — the big cup is out on the wide arm, the base cup is
 // underneath the handle, and the spike is on top.
 const cup=mode==='moshikame'?(reps%2===1?MOSHIKAME.alt:MOSHIKAME.land):trick.land;
 const total=airtime(power);
 const flying=phase==='flying'||!!said?.rep;
 const along=flying?Math.min(1,flight/total):0;
 const resting=phase==='landed'||said?.rep?1:0;
 const at=flying?along:resting;
 const lift=Math.sin(Math.PI*along)*(26+power*30);
 const ballX=HANG[0]+(cup[0]-HANG[0])*at;
 const ballY=HANG[1]+(cup[1]-HANG[1])*at-lift;
 const finished=mode==='tricks'&&landed.length===TRICKS.length;
 return <>
  <p>A ball on a string and a handle with three cups and a spike. <strong>Swipe up</strong> to
   pull the ball into the air — how far you swipe is how hard you pull — then <strong>tap
   catch</strong> at the moment it comes down onto the cup. Both have to be right.</p>
  <div className="segmented game-picker">
   <button className={mode==='tricks'?'selected':''} onClick={()=>reset('tricks')}>Tricks</button>
   <button className={mode==='moshikame'?'selected':''} onClick={()=>reset('moshikame')} lang="ja">もしかめ</button>
  </div>
  <div className="kendama-trick">
   <b lang="ja">{trick.ja}</b><em>{trick.romaji}</em><span>{trick.en}</span>
   <small>{trick.how}</small>
  </div>
  <div className="kendama-stage" ref={area} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{drag.current=null;}}>
   <svg viewBox="0 0 100 120" role="img" aria-label={phase==='flying'?'The ball is in the air':'A kendama, ready'}>
    <path d={`M${ballX} ${ballY+9} Q ${(ballX+52)/2+6} ${(ballY+78)/2} 52 70`} fill="none" stroke="#b9ae97" strokeWidth="1"/>
    <Ken tilt={mode==='moshikame'&&reps%2===1?180:0}/>
    <Tama x={ballX} y={ballY}/>
   </svg>
   {phase==='ready'&&<span className="kendama-hint">Swipe up</span>}
  </div>
  {phase==='flying'
   ?<button className="kendama-catch" onClick={grab}>Catch</button>
   :<button className="kendama-catch" disabled>Catch</button>}
  <p className="game-status">{
   said?.rep?`${said.rep} in a row. Keep going.`
   :said?.landed?<><Trophy size={16}/> {trick.ja} landed. {trick.en.toLowerCase()} — {trick.worth} points.</>
   :said?said.says
   :phase==='flying'?'It is up. Wait for it.'
   :mode==='moshikame'&&reps?`${reps} in a row.`
   :'Swipe up the kendama to pull.'}</p>
  <div className="game-stats cols-4">
   {mode==='tricks'?<>
    <span><small>Tricks landed</small><strong>{landed.length} of {TRICKS.length}</strong></span>
    <span><small>This trick</small><strong lang="ja">{trick.ja}</strong></span>
    <span><small>Points</small><strong>{kendamaScore(landed)}</strong></span>
   </>:<>
    <span><small>In a row</small><strong>{reps}</strong></span>
    <span><small>Best run</small><strong>{bestRun}</strong></span>
    <span><small>Window</small><strong>{window_}ms</strong></span>
   </>}
   <span><small>Your best</small><strong>{bestScore(state,user.name,game)||'—'}</strong></span>
  </div>
  <div className="row wrap game-actions">
   {phase==='landed'&&!finished&&mode==='tricks'&&<button className="primary" onClick={nextTrick}>Next trick</button>}
   <button className={phase==='missed'?'primary':''} onClick={again}><RotateCcw size={16}/> Try again</button>
  </div>
  {mode==='tricks'&&<div className="ladder-grid notes kendama-list">{TRICKS.map((t,i)=>
   <span key={t.id} className={landed.includes(t.id)?'done':i===step?'here':''}>
    {landed.includes(t.id)&&<Check size={13}/>}<b lang="ja">{t.ja}</b><small>{t.romaji}</small>
    <small>{t.en}</small></span>)}</div>}
 </>;
}
