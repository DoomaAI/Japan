import React,{useState,useEffect,useMemo} from 'react';
import {Trophy,RotateCcw} from 'lucide-react';
import {newGame,play,movesFor,dropsFor,aiMove,pieceById,PIECES,LEVELS,levelById,shogiWorth} from './shogi.js';
import {bestScore} from './trip-features.js';
import {WinBurst} from './Win.jsx';
// Dōbutsu shōgi. Your side is the bottom of the board and his is the top, always, because a
// board that turns around between moves is how a child loses track of which lion is his.
const HELD=['giraffe','elephant','chick'];
export default function AnimalShogi({user,state,mutate,busy}){
 const [levelId,setLevelId]=useState('chick');
 const [game,setGame]=useState(newGame);
 const [picked,setPicked]=useState(null),[score,setScore]=useState(0),[won,setWon]=useState(0);
 const level=levelById(levelId);
 const key=`shogi-${level.id}`;
 // His move. The wait is not the machine thinking — it decides in a few milliseconds — it is
 // there so a piece does not vanish from under the finger that just moved.
 useEffect(()=>{
  if(game.turn!=='them'||game.over)return;
  const t=setTimeout(()=>setGame(g=>{
   if(g.turn!=='them'||g.over)return g;
   const move=aiMove(g,level.depth);
   return move?play(g,move):g;
  }),450);
  return ()=>clearTimeout(t);
 },[game,level.depth]);
 useEffect(()=>{
  if(game.over?.winner!=='me')return;
  const total=score+shogiWorth(level.depth,game.ply);
  setScore(total);setWon(w=>w+1);
  mutate({type:'gameScore',person:user.name,game:key,score:Math.min(9999,total)});
 },[game.over]);
 const mine=game.turn==='me'&&!game.over;
 const targets=useMemo(()=>{
  if(!picked||!mine)return [];
  return picked.drop?dropsFor(game.board):movesFor(game.board,picked.from);
 },[picked,game,mine]);
 function tapSquare(i){
  if(!mine)return;
  if(picked&&targets.includes(i)){
   setGame(play(game,picked.drop?{drop:picked.drop,to:i}:{from:picked.from,to:i}));
   setPicked(null);return;
  }
  const cell=game.board[i];
  setPicked(cell?.side==='me'&&picked?.from!==i?{from:i}:null);
 }
 const restart=(next={})=>{setLevelId(next.levelId??levelId);setGame(newGame());setPicked(null);};
 const hand=side=>HELD.filter(p=>game.hands[side].includes(p))
  .map(p=>({piece:p,count:game.hands[side].filter(h=>h===p).length}));
 const verdict=game.over&&(game.over.winner==='me'
  ?game.over.how==='try'?'Your lion walked all the way to his back row. You win.':'You took his lion. You win.'
  :game.over.winner==='them'?game.over.how==='try'?'His lion reached your back row. He wins.':'He took your lion.'
  :'Nobody got anywhere. A draw.');
 return <>
  <p>Take his lion, or walk yours to the far row and survive there. A piece you take changes
   sides — put it back on the board as one of yours.</p>
  <div className="segmented game-picker">{LEVELS.map(l=>
   <button key={l.id} className={levelId===l.id?'selected':''} onClick={()=>restart({levelId:l.id})}>
    <span aria-hidden="true">{l.icon}</span> {l.en}</button>)}</div>
  <p><small>{level.how}</small></p>
  <div className="shogi-hand theirs">
   <small>His</small>
   {hand('them').length?hand('them').map(h=><span key={h.piece} aria-label={pieceById(h.piece).en}>
    {pieceById(h.piece).icon}{h.count>1?<b>×{h.count}</b>:null}</span>):<em>nothing</em>}
  </div>
  <div className="shogi-board">{game.board.map((cell,i)=>{
   const target=targets.includes(i);
   return <button key={i} className={`shogi-square${cell?` filled ${cell.side}`:''}${picked?.from===i?' picked':''}${target?' target':''}`}
    disabled={!mine||(!target&&cell?.side!=='me')} onClick={()=>tapSquare(i)}
    aria-label={cell?`${cell.side==='me'?'Your':'His'} ${pieceById(cell.piece).en}`:'Empty square'}>
    {cell&&<><span aria-hidden="true">{pieceById(cell.piece).icon}</span>
     <small lang="ja">{pieceById(cell.piece).ja}</small></>}
    {target&&<i aria-hidden="true"/>}</button>;
  })}</div>
  <div className="shogi-hand mine">
   <small>Yours</small>
   {hand('me').length?hand('me').map(h=>
    <button key={h.piece} type="button" className={picked?.drop===h.piece?'picked':''} disabled={!mine}
     onClick={()=>setPicked(picked?.drop===h.piece?null:{drop:h.piece})}>
     {pieceById(h.piece).icon}{h.count>1?<b>×{h.count}</b>:null}</button>):<em>nothing</em>}
  </div>
  <WinBurst on={game.over?.winner==='me'} label="You win!" sub={game.over?.winner==='me'?verdict:''}/>
  <p className="game-status">{game.over?<><Trophy size={16}/> {verdict}</>
   :mine?picked?.drop?`Put the ${pieceById(picked.drop).en.toLowerCase()} on any empty square.`
    :picked?'Now tap where he goes.':'Your move.'
   :'He is thinking.'}</p>
  <div className="game-stats cols-4">
   <span><small>Games won</small><strong>{won}</strong></span>
   <span><small>Points</small><strong>{score}</strong></span>
   <span><small>Moves</small><strong>{game.ply}</strong></span>
   <span><small>Your best</small><strong>{bestScore(state,user.name,key)||'—'}</strong></span>
  </div>
  <button className={game.over?'primary':''} onClick={()=>restart()}><RotateCcw size={16}/> New game</button>
  <details className="merge-ladder"><summary>What each animal does</summary>
   <div className="ladder-grid notes">{PIECES.map(p=>
    <span key={p.id}><b aria-hidden="true">{p.icon}</b><b>{p.en}</b><small lang="ja">{p.ja}</small>
     <small>{p.how}</small></span>)}</div>
  </details>
 </>;
}
