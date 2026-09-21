import React,{useState,useEffect,useRef} from 'react';
import {Trophy,RotateCcw,Heart} from 'lucide-react';
import {CHANT,CHANT_SAY,LEVELS,levelById,TRACK,TICK,newRun,start,darumaTick,resume,darumaWorth} from './daruma.js';
import {bestScore} from './trip-features.js';
import {useKanaVoice} from './SayIt.jsx';
const INK='#16383b';
// The daruma himself. Facing the wall he is a red dome and nothing else; turned round he has
// the eyes, and by then it is too late to be moving. One inline drawing, two faces.
const Doll=({watching})=><svg viewBox="0 0 60 64" className="daruma-doll" role="img"
 aria-label={watching?'The daruma has turned round and is looking at you':'The daruma is facing the wall'}>
 <path d="M30 4c13 0 20 12 20 28 0 18-9 28-20 28S10 50 10 32C10 16 17 4 30 4Z"
  fill={watching?'#d2423a':'#b8362f'} stroke={INK} strokeWidth="2"/>
 {watching
  ?<><ellipse cx="30" cy="30" rx="16" ry="13" fill="#f6e7d2"/>
    <circle cx="23" cy="29" r="3.6" fill={INK}/><circle cx="37" cy="29" r="3.6" fill={INK}/>
    <path d="M22 41q8 5 16 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M16 20q6-5 12-1M44 20q-6-5-12-1" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round"/></>
  :<><path d="M14 28q16-6 32 0" stroke="#8d241f" strokeWidth="2" fill="none"/>
    <path d="M13 40q17-5 34 0" stroke="#8d241f" strokeWidth="2" fill="none"/></>}
</svg>;
export default function Daruma({user,state,mutate,busy}){
 const [levelId,setLevelId]=useState('gentle');
 const [run,setRun]=useState(()=>newRun('gentle'));
 const [began,setBegan]=useState(null),[seconds,setSeconds]=useState(0);
 // The finger is kept in both a ref and a state: the ticker reads the ref, because a closure
 // over state is a tick behind, and the screen reads the state, because a ref does not redraw.
 // What it holds is where the finger actually is, not where the game would like it to be —
 // being sent back to the wall does not take a five-year-old's thumb off the glass, so he is
 // creeping again the moment the chant restarts, exactly as he would be in a playground.
 const [holding,setHolding]=useState(false);
 const held=useRef(false),saved=useRef(null);
 const level=levelById(levelId);
 const game=`daruma-${level.id}`;
 const speak=useKanaVoice(false);
 const watching=run.phase==='watch'||run.phase==='lost';
 const turning=run.phase==='turn';
 // The clock. Everything the game decides it decides in daruma.js; this only tells it what
 // the finger is doing and how long it has been doing it.
 useEffect(()=>{
  if(run.over||run.phase==='ready'||run.phase==='caught')return;
  const t=setInterval(()=>setRun(r=>darumaTick(r,{held:held.current,now:Date.now()})),TICK);
  return ()=>clearInterval(t);
 },[run.phase,run.over]);
 useEffect(()=>{
  if(began===null||run.over)return;
  const t=setInterval(()=>setSeconds((Date.now()-began)/1000),200);
  return ()=>clearInterval(t);
 },[began,run.over]);
 // Caught. A beat of standing still where you are, then back to the wall to start again.
 useEffect(()=>{
  if(run.phase!=='caught')return;
  const t=setTimeout(()=>setRun(r=>resume(r,Date.now())),1100);
  return ()=>clearTimeout(t);
 },[run.phase,run.caught]);
 useEffect(()=>{
  if(!run.over?.won||saved.current===run)return;
  saved.current=run;
  const taken=(Date.now()-began)/1000;
  setSeconds(taken);
  mutate({type:'gameScore',person:user.name,game,score:darumaWorth(level,taken,run.lives)});
 },[run.over]);
 // He says it as well as showing it, where the phone has a Japanese voice — the boys will hear
 // this in a playground and it is the one line of Japanese they are most likely to hear shouted.
 useEffect(()=>{
  if(run.phase==='chant'&&run.index===0&&began!==null)speak('だるまさんがころんだ',`daruma-${run.caught}-${run.distance|0}`);
 },[run.phase,run.index]);
 function begin(id=levelId){
  setLevelId(id);held.current=false;setHolding(false);saved.current=null;
  setRun(start(newRun(id),Date.now()));setBegan(Date.now());setSeconds(0);
 }
 const reset=id=>{setLevelId(id);held.current=false;setHolding(false);saved.current=null;setRun(newRun(id));setBegan(null);setSeconds(0);};
 // A finger lifting always counts, whatever the game is doing. A finger going down only
 // counts once there is something to creep towards.
 const grab=on=>()=>{
  if(on&&(run.over||run.phase==='ready'))return;
  held.current=on;setHolding(on);
 };
 const playing=began!==null&&!run.over;
 return <>
  <p>He is facing the wall, chanting. Creep up while he chants — <strong>hold the button to
   move</strong> — and let go before he turns round, because anybody still moving is caught.
   Touch him and you have won.</p>
  <div className="segmented game-picker">{LEVELS.map(l=>
   <button key={l.id} className={`two-line${levelId===l.id?' selected':''}`} onClick={()=>reset(l.id)}>
    <b lang="ja">{l.ja}</b><small>{l.en}</small></button>)}</div>
  <p><small>{level.en} — {level.how}</small></p>
  <div className={`daruma-scene${watching?' watching':''}${turning?' turning':''}`}>
   <Doll watching={watching}/>
   <div className="daruma-chant" aria-hidden="true">{CHANT.map((kana,i)=>
    <span key={i} className={run.phase==='chant'&&i<run.index?'said':''} lang="ja">{kana}</span>)}</div>
   <div className="daruma-track">
    <div className="daruma-you" style={{left:`${Math.min(96,run.distance*0.96)}%`}}>
     <span aria-hidden="true">{run.phase==='caught'||run.phase==='lost'?'🙍':holding?'🏃':'🧍'}</span></div>
   </div>
  </div>
  <p className="game-status daruma-says" lang="ja">{CHANT.join('')}<small>{CHANT_SAY} — "the daruma fell over"</small></p>
  <button type="button" className={`daruma-hold${holding?' down':''}`} disabled={!playing}
   onPointerDown={grab(true)} onPointerUp={grab(false)} onPointerLeave={grab(false)} onPointerCancel={grab(false)}>
   {playing?'Hold to creep up':'Not started'}</button>
  <p className="game-status">
   {run.over?run.over.won?<><Trophy size={16}/> You got him, in {seconds.toFixed(1)} seconds with {run.lives} {run.lives===1?'life':'lives'} left — {darumaWorth(level,seconds,run.lives)} points.</>
     :'Caught for the third time. Back to the wall.'
   :run.phase==='ready'?'Press start when you are ready.'
   :run.phase==='caught'?'Caught. Back to the start.'
   :watching?'He is looking straight at you. Do not move.'
   :turning?'He is turning!'
   :'He is chanting. Go.'}</p>
  <div className="game-stats cols-4">
   <span><small>How close</small><strong>{Math.round(run.distance)}%</strong></span>
   <span><small>Lives</small><strong className="daruma-lives">{[0,1,2].map(i=>
    <Heart key={i} size={13} fill={i<run.lives?'currentColor':'none'}/>)}</strong></span>
   <span><small>Clock</small><strong>{seconds.toFixed(1)}s</strong></span>
   <span><small>Your best</small><strong>{bestScore(state,user.name,game)||'—'}</strong></span>
  </div>
  <div className="row wrap game-actions">
   {/* The hold button is the game while one is running, so it is the only loud thing on the
       screen until the run is over and going again is the thing to do next. */}
   <button className={began===null||run.over?'primary':''} onClick={()=>begin()}>
    {began===null?'Start':<><RotateCcw size={16}/> Go again</>}</button>
  </div>
 </>;
}
