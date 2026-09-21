import React,{useState,useEffect,useRef} from 'react';
import {Trophy,RotateCcw} from 'lucide-react';
import {TANK,TICK,POI_R,FISH,fishById,LEVELS,levelById,newTank,kingyoTick,bowlWorth,kingyoScore,rng} from './kingyo.js';
import {bestScore} from './trip-features.js';
// One fish, drawn facing the way it is swimming. A body, a tail and an eye is enough at this
// size; the demekin gets a bigger eye because that is literally what its name means — the fish
// with the eyes sticking out.
const Fish=({kind,size=1,deg=0})=><g transform={`rotate(${deg}) scale(${size})`}>
 <path d={`M-3.4 0 -6.6 -${3*kind.girth} -6.6 ${3*kind.girth}Z`} fill={kind.fin}/>
 <ellipse cx="0" cy="0" rx="4.4" ry={4.4*kind.girth} fill={kind.body}/>
 <ellipse cx="-0.4" cy={1.5*kind.girth} rx="3" ry={1.5*kind.girth} fill={kind.belly} opacity=".55"/>
 <circle cx="2.5" cy={-1.1*kind.girth} r={kind.eye} fill="#12100f"/>
 {kind.eye>1.2&&<circle cx="2.5" cy={-1.1*kind.girth} r={kind.eye} fill="none" stroke="#f2ede4" strokeWidth=".35"/>}
</g>;
// Out of the tank — in the bowl, and in the list of what is swimming about — the same fish on
// its own little square of water, so the one worth six is recognisably the one worth six.
const FishChip=({kind,size=26})=><svg viewBox="-9 -7 18 14" width={size} height={size*14/18}
 role="img" aria-label={kind.en}><Fish kind={kind} size={1.25}/></svg>;
// The tank, seen from above, the way you stand over it at a stall. The poi follows your finger
// and is only in the water while the finger is down, which is the whole of the control scheme
// and is also exactly what your hand does at the real thing.
export default function Kingyo({user,state,mutate,busy}){
 const [levelId,setLevelId]=useState('yon');
 const [tank,setTank]=useState(()=>newTank('yon'));
 const [going,setGoing]=useState(false);
 const pointer=useRef({x:TANK/2,y:TANK/2,down:false}),box=useRef(null),saved=useRef(null);
 const rand=useRef(rng(Date.now()%100000));
 const level=levelById(levelId);
 const game=`kingyo-${level.id}`;
 useEffect(()=>{
  if(!going||tank.over)return;
  const t=setInterval(()=>setTank(current=>kingyoTick(current,{...pointer.current,rand:rand.current})),TICK);
  return ()=>clearInterval(t);
 },[going,tank.over]);
 useEffect(()=>{
  if(!tank.over||saved.current===tank)return;
  saved.current=tank;
  const points=kingyoScore(level.id,tank.bowl,tank.paper);
  if(points>0)mutate({type:'gameScore',person:user.name,game,score:points});
 },[tank.over]);
 // Where the finger is, on the tank's own hundred-square rather than in pixels.
 const spot=e=>{
  const rect=box.current?.getBoundingClientRect();
  if(!rect)return null;
  return {x:Math.max(0,Math.min(TANK,((e.clientX-rect.left)/rect.width)*TANK)),
   y:Math.max(0,Math.min(TANK,((e.clientY-rect.top)/rect.height)*TANK))};
 };
 const move=e=>{const at=spot(e);if(at)pointer.current={...pointer.current,...at};};
 const press=down=>e=>{
  if(!going||tank.over)return;
  const at=spot(e)||pointer.current;
  pointer.current={...at,down};
  // A lift is the moment the finger comes up, so it is resolved now rather than on the next
  // tick — fifty milliseconds is long enough for a fish to swim off the paper.
  if(!down)setTank(current=>kingyoTick(current,{...at,down:false,rand:rand.current}));
 };
 const begin=(id=levelId)=>{
  rand.current=rng(Date.now()%100000);saved.current=null;
  pointer.current={x:TANK/2,y:TANK/2,down:false};
  setLevelId(id);setTank(newTank(id,rand.current));setGoing(true);
 };
 const reset=id=>{setLevelId(id);setTank(newTank(id));setGoing(false);saved.current=null;};
 const poi=tank.poi,paper=Math.round(tank.paper/level.paper*100);
 return <>
  <p>A paper scoop and a bowl. <strong>Hold your finger on the tank</strong> to put the scoop
   under the water, slide it beneath a fish, and <strong>lift your finger</strong> to scoop.
   The paper is soaking the whole time it is under, tears if you drag it about, and two fish at
   once is far worse than twice one fish. It always goes in the end. That is the game.</p>
  <div className="segmented game-picker">{LEVELS.map(l=>
   <button key={l.id} className={`two-line${levelId===l.id?' selected':''}`} onClick={()=>reset(l.id)}>
    <b lang="ja">{l.ja}</b><small>{l.en}</small></button>)}</div>
  <p><small>{level.en} — {level.how}</small></p>
  <div className="kingyo-tank" ref={box} onPointerDown={press(true)} onPointerMove={move}
   onPointerUp={press(false)} onPointerLeave={press(false)} onPointerCancel={press(false)}>
   <svg viewBox={`0 0 ${TANK} ${TANK}`} role="img" aria-label={`${tank.fish.length} fish left, paper ${paper} per cent`}>
    <rect x="0" y="0" width={TANK} height={TANK} rx="6" fill="#dceaf0"/>
    {tank.fish.map(f=><g key={f.key} transform={`translate(${f.x} ${f.y})`} data-fish={f.kind}>
     <Fish kind={fishById(f.kind)} deg={f.dir*180/Math.PI+180}/></g>)}
    {going&&!tank.over&&<g className={poi.down?'poi under':'poi'}>
     <circle cx={poi.x} cy={poi.y} r={POI_R} fill={poi.down?'rgba(255,255,255,.5)':'none'}
      stroke={poi.down?'#7a5a3a':'#b08a5e'} strokeWidth={poi.down?'1.6':'1.1'}/>
     <circle cx={poi.x} cy={poi.y} r="1.4" fill="#7a5a3a"/></g>}
   </svg>
   {!going&&<button className="kingyo-start primary" onClick={()=>begin()}>Take a scoop</button>}
  </div>
  <div className="kingyo-paper"><small>Paper</small>
   <span><i style={{width:`${Math.max(0,paper)}%`}} className={paper<30?'thin':''}/></span>
   <small>{Math.max(0,paper)}%</small></div>
  <div className="kingyo-bowl">
   <small>Bowl</small>
   {tank.bowl.length?tank.bowl.map((id,i)=><FishChip key={i} kind={fishById(id)}/>)
    :<em>nothing yet</em>}
  </div>
  <p className="game-status">{tank.over
   ?tank.over.how==='cleared'?<><Trophy size={16}/> The whole tank. Nobody does that.</>
    :<><Trophy size={16}/> The paper went, with {tank.bowl.length} {tank.bowl.length===1?'fish':'fish'} in the bowl — {kingyoScore(level.id,tank.bowl,tank.paper)} points.</>
   :going?poi.down?'Under the water. Slide it beneath one and lift.':'Hold your finger on the tank.'
   :'Press take a scoop when you are ready.'}</p>
  <div className="game-stats cols-4">
   <span><small>In the bowl</small><strong>{tank.bowl.length}</strong></span>
   <span><small>Worth</small><strong>{bowlWorth(tank.bowl)}</strong></span>
   <span><small>Still swimming</small><strong>{tank.fish.length}</strong></span>
   <span><small>Your best</small><strong>{bestScore(state,user.name,game)||'—'}</strong></span>
  </div>
  <div className="row wrap game-actions">
   <button className={tank.over||!going?'primary':''} onClick={()=>begin()}>
    {going?<><RotateCcw size={16}/> Another scoop</>:'Take a scoop'}</button>
  </div>
  <details className="merge-ladder"><summary>What is in the tank</summary>
   <div className="ladder-grid notes">{FISH.map(f=>
    <span key={f.id}><FishChip kind={f} size={34}/><b>{f.en}</b><small lang="ja">{f.ja}</small>
     <small>Worth {f.worth}. {f.speed<0.5?'Barely swims, which is why everybody goes for it.'
      :f.speed<0.8?'A poor swimmer, and worth three of the orange ones.':'Quick, and there are more of them than anything else.'}</small></span>)}</div>
  </details>
 </>;
}
