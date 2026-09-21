import React,{useState,useEffect,useRef} from 'react';
import {Trophy,RotateCcw} from 'lucide-react';
import {SIZES,EMPTY,BLACK,WHITE,newBoard,place,winsAt,full,aiMove,LEVELS,levelById,gomokuWorth,idx} from './gomoku.js';
import {bestScore} from './trip-features.js';
// Gomoku. You are black and you go first, which is how it is played and is also a real
// advantage — worth knowing rather than worth hiding.
export default function Gomoku({user,state,mutate,busy}){
 const [size,setSize]=useState(11);
 const [levelId,setLevelId]=useState('child');
 const [board,setBoard]=useState(()=>newBoard(11));
 const [over,setOver]=useState(null),[last,setLast]=useState(null),[stones,setStones]=useState(0);
 const saved=useRef(null);
 const level=levelById(levelId);
 const game=`gomoku-${level.id}-${size}`;
 const thinking=!over&&stones%2===1;
 // His move. The pause is not him thinking — he decides in a few milliseconds — it is so a
 // stone does not appear under the finger that has just put one down.
 useEffect(()=>{
  if(over||stones%2===0)return;
  const t=setTimeout(()=>{
   const at=aiMove(board,size,WHITE,level.id);
   const next=place(board,at,WHITE);
   setBoard(next);setLast(at);setStones(s=>s+1);
   if(winsAt(next,size,at,WHITE))setOver({winner:WHITE,at});
   else if(full(next))setOver({winner:null});
  },420);
  return ()=>clearTimeout(t);
 },[board,stones,over]);
 useEffect(()=>{
  if(over?.winner!==BLACK||saved.current===over)return;
  saved.current=over;
  mutate({type:'gameScore',person:user.name,game,score:gomokuWorth(level.id,stones)});
 },[over]);
 function put(at){
  if(over||thinking||board[at]!==EMPTY)return;
  const next=place(board,at,BLACK);
  setBoard(next);setLast(at);setStones(s=>s+1);
  if(winsAt(next,size,at,BLACK))setOver({winner:BLACK,at});
  else if(full(next))setOver({winner:null});
 }
 const restart=(nextSize=size,nextLevel=levelId)=>{
  setSize(nextSize);setLevelId(nextLevel);setBoard(newBoard(nextSize));
  setOver(null);setLast(null);setStones(0);saved.current=null;
 };
 return <>
  <p>Five of yours in a row — across, down or corner to corner — and you have won. You are the
   dark stones and you go first, which is a real advantage. Nothing else to learn.</p>
  <div className="segmented game-picker">{SIZES.map(s=>
   <button key={s} className={size===s?'selected':''} onClick={()=>restart(s,levelId)}>{s} × {s}</button>)}</div>
  <div className="segmented game-picker">{LEVELS.map(l=>
   <button key={l.id} className={`two-line${levelId===l.id?' selected':''}`} onClick={()=>restart(size,l.id)}>
    <b lang="ja">{l.ja}</b><small>{l.en}</small></button>)}</div>
  <p><small>{level.en} — {level.how}</small></p>
  <div className="goban" style={{'--n':size}}>
   {board.map((v,i)=>
    <button key={i} className={`goban-spot${v===BLACK?' black':v===WHITE?' white':''}${last===i?' last':''}${over?.at===i?' won':''}`}
     onClick={()=>put(i)} disabled={!!over||thinking||v!==EMPTY}
     aria-label={`Row ${Math.floor(i/size)+1} column ${i%size+1}${v===BLACK?', your stone':v===WHITE?', his stone':', empty'}`}/>)}
  </div>
  <p className="game-status">{over
   ?over.winner===BLACK?<><Trophy size={16}/> Five in a row. You win in {Math.ceil(stones/2)} stones — {gomokuWorth(level.id,stones)} points.</>
    :over.winner===WHITE?'He got five. Have another go.'
    :'The board is full and nobody got five. A draw.'
   :thinking?'He is choosing.':'Your move.'}</p>
  <div className="game-stats cols-4">
   <span><small>Stones down</small><strong>{stones}</strong></span>
   <span><small>Board</small><strong>{size} × {size}</strong></span>
   <span><small>Against</small><strong>{level.en}</strong></span>
   <span><small>Your best</small><strong>{bestScore(state,user.name,game)||'—'}</strong></span>
  </div>
  <button className={over?'primary':''} onClick={()=>restart()}><RotateCcw size={16}/> New game</button>
 </>;
}
