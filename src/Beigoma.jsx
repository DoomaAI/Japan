import React,{useState,useEffect,useRef} from 'react';
import {Trophy,RotateCcw} from 'lucide-react';
import {RING,TICK,EDGE,TOPS,topById,RIVALS,rivalAt,SPIN,newBout,beigomaTick,beigomaWorth,rng} from './beigoma.js';
import {bestScore} from './trip-features.js';
import {WinBurst} from './Win.jsx';
const INK='#16383b';
// A beigoma seen from above, which is how you watch one: a small iron disc with a notched rim
// and a mark on the crown. The one in MissionArt is drawn from the side, which is right for a
// spinning top on a table and no use at all looking down into a barrel.
const Koma=({top,spin,turn,dim})=>{
 const notches=[...Array(12)].map((_,i)=>i*30);
 const iron=top.id==='omo'?'#3f4348':top.id==='karu'?'#8d6b4a':'#5b5f64';
 const edge=top.id==='omo'?'#23262a':top.id==='karu'?'#6b4f33':'#3c4045';
 return <g opacity={dim?0.35:1} transform={`rotate(${turn})`}>
  <circle r={top.r} fill={iron} stroke={INK} strokeWidth="0.8"/>
  {notches.map(a=><rect key={a} x={-0.7} y={-top.r} width="1.4" height="1.8" fill={edge} transform={`rotate(${a})`}/>)}
  <circle r={top.r*0.58} fill={edge}/>
  <circle r={top.r*0.3} fill={top.id==='karu'?'#d8a25c':'#9aa1a8'}/>
  <circle r={top.r*0.11} fill={INK}/>
 </g>;
};
export default function Beigoma({user,state,mutate,busy}){
 const [mine,setMine]=useState('nami');
 const [rung,setRung]=useState(0),[beaten,setBeaten]=useState(0);
 const [bout,setBout]=useState(null),[aim,setAim]=useState(null);
 const rand=useRef(rng(Date.now()%100000)),drag=useRef(null),ring=useRef(null),saved=useRef(null);
 const rival=rivalAt(rung);
 const game='beigoma';
 useEffect(()=>{
  if(!bout||bout.over)return;
  const t=setInterval(()=>setBout(b=>b&&!b.over?beigomaTick(b,rand.current):b),TICK);
  return ()=>clearInterval(t);
 },[bout]);
 useEffect(()=>{
  if(!bout?.over||saved.current===bout)return;
  saved.current=bout;
  if(!bout.over.won)return;
  const next=Math.min(RIVALS.length-1,rung+1);
  setBeaten(b=>Math.max(b,rung+1));
  mutate({type:'gameScore',person:user.name,game,score:beigomaWorth(rival,bout.mine.spin)});
  setTimeout(()=>setRung(next),900);
 },[bout?.over]);
 // The throw: a flick across the ring. Which way you flick is where it comes in from, and how
 // far you flick is how hard it was wound. After that you are a spectator, same as the real one.
 const spot=e=>{
  const box=ring.current?.getBoundingClientRect();
  if(!box)return null;
  return {x:((e.clientX-box.left)/box.width)*RING-EDGE,y:((e.clientY-box.top)/box.height)*RING-EDGE,w:box.width};
 };
 const down=e=>{if(bout&&!bout.over)return;drag.current=spot(e);setAim(null);};
 const move=e=>{
  const from=drag.current;if(!from)return;
  const now=spot(e);if(!now)return;
  const dx=now.x-from.x,dy=now.y-from.y;
  const len=Math.hypot(dx,dy);
  if(len>3)setAim({angle:Math.atan2(dy,dx)+Math.PI,power:Math.min(1,len/(RING*0.42))});
 };
 const up=()=>{
  const flick=aim;drag.current=null;
  if(!flick||flick.power<0.08)return setAim(null);
  saved.current=null;
  setBout(newBout({mine,theirs:rival,angle:flick.angle,power:flick.power,rand:rand.current}));
  setAim(null);
 };
 const reset=(top=mine,at=rung)=>{setMine(top);setRung(at);setBout(null);setAim(null);saved.current=null;};
 const running=bout&&!bout.over;
 const turnOf=one=>one?one.spin*6+bout.ticks*(8+one.spin/6):0;
 return <>
  <p>Small iron tops, thrown into a ring with a cloth stretched over it. The cloth sags, so they
   find each other whether you meant them to or not. <strong>Flick across the ring</strong> —
   which way you flick is where yours comes in from, and how far you flick is how hard it was
   wound. Then you watch, because that is all anybody does once it has left their hand.</p>
  <div className="segmented game-picker">{TOPS.map(t=>
   <button key={t.id} className={`two-line${mine===t.id?' selected':''}`} disabled={!!running} onClick={()=>reset(t.id)}>
    <b lang="ja">{t.ja}</b><small>{t.en}</small></button>)}</div>
  <p><small>{topById(mine).how}</small></p>
  <div className="bei-rival">
   <small>Facing</small><b lang="ja">{rival.ja}</b><span>{rival.en}</span>
   <small>His is {topById(rival.top).en.toLowerCase()}. Beaten {beaten} of {RIVALS.length}.</small>
  </div>
  <div className="bei-ring" ref={ring} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
   <svg viewBox={`${-EDGE} ${-EDGE} ${RING} ${RING}`} role="img"
    aria-label={running?'The tops are in the ring':'A ring, waiting for a throw'}>
    <circle r={EDGE-0.5} fill="#d9c8a8" stroke="#8a6f45" strokeWidth="1.6"/>
    <circle r={EDGE*0.66} fill="none" stroke="#c0ac88" strokeWidth="0.6"/>
    <circle r={EDGE*0.33} fill="none" stroke="#c0ac88" strokeWidth="0.6"/>
    {bout&&<>
     {!bout.theirs.out&&<g transform={`translate(${bout.theirs.x} ${bout.theirs.y})`}>
      <Koma top={topById(bout.theirs.top)} spin={bout.theirs.spin} turn={turnOf(bout.theirs)} dim={bout.theirs.spin<=0}/></g>}
     {!bout.mine.out&&<g transform={`translate(${bout.mine.x} ${bout.mine.y})`}>
      <Koma top={topById(bout.mine.top)} spin={bout.mine.spin} turn={turnOf(bout.mine)} dim={bout.mine.spin<=0}/></g>}
    </>}
    {aim&&<line x1={Math.cos(aim.angle)*EDGE*0.8} y1={Math.sin(aim.angle)*EDGE*0.8}
     x2={-Math.cos(aim.angle)*EDGE*0.5*aim.power} y2={-Math.sin(aim.angle)*EDGE*0.5*aim.power}
     stroke="#c0392b" strokeWidth="1.6" strokeDasharray="3 2"/>}
   </svg>
   {!bout&&!aim&&<span className="bei-hint">Flick across the ring</span>}
  </div>
  {bout&&<div className="bei-spin">
   <span><small>Yours</small><i style={{width:`${Math.max(0,Math.min(100,bout.mine.spin/SPIN*100))}%`}}/></span>
   <span><small>His</small><i className="his" style={{width:`${Math.max(0,Math.min(100,bout.theirs.spin/SPIN*100))}%`}}/></span>
  </div>}
  <WinBurst on={!!bout?.over?.won} label="Last one spinning!" sub={bout?.over?.how==='knocked'?'Knocked clean out of the ring':'His stopped first'}/>
  <p className="game-status">{
   bout?.over
    ?bout.over.won
      ?<><Trophy size={16}/> {bout.over.how==='knocked'?'Knocked clean out of the ring.':'His stopped first.'} {beigomaWorth(rival,bout.mine.spin)} points.</>
      :bout.over.how==='knockedOut'?'Yours went over the edge.'
       :bout.over.how==='timeout'?'Both still going. Call it a draw and throw again.'
       :'Yours ran down first.'
   :running?'In the ring.'
   :'Flick across the ring to throw.'}</p>
  <div className="game-stats cols-4">
   <span><small>Rivals beaten</small><strong>{beaten} of {RIVALS.length}</strong></span>
   <span><small>Your top</small><strong lang="ja">{topById(mine).ja} {topById(mine).en}</strong></span>
   <span><small>Worth if you win</small><strong>{rival.pays}+</strong></span>
   <span><small>Your best</small><strong>{bestScore(state,user.name,game)||'—'}</strong></span>
  </div>
  <div className="row wrap game-actions">
   <button className={bout?.over?'primary':''} disabled={!!running} onClick={()=>setBout(null)}>
    <RotateCcw size={16}/> Throw again</button>
   {beaten>0&&<button disabled={!!running} onClick={()=>reset(mine,0)}>Back to the start</button>}
  </div>
 </>;
}
