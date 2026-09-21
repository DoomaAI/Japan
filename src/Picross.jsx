import React,{useState,useMemo,useEffect,useRef} from 'react';
import {Trophy,RotateCcw,Check,X} from 'lucide-react';
import {PICTURES,SIZES,picturesOf,pictureById,puzzleFor,picrossScore} from './picross.js';
import {bestScore} from './trip-features.js';
// Picross. The numbers say how many squares in that line are filled and in what order; working
// out which is the game, and the picture is what you get for doing it. The name of the picture
// is kept back until it is solved, because a puzzle that tells you what you are drawing has
// given away half of what you were meant to work out.
const BLANK=0,FILL=1,CROSS=2;
export default function Picross({user,state,mutate,busy}){
 const [size,setSize]=useState(5);
 const list=useMemo(()=>picturesOf(size),[size]);
 const [id,setId]=useState(()=>picturesOf(5)[0].id);
 const [mode,setMode]=useState(FILL);
 const [cells,setCells]=useState(()=>Array(25).fill(BLANK));
 const [wrong,setWrong]=useState(0),[began,setBegan]=useState(null),[seconds,setSeconds]=useState(0);
 const saved=useRef(null);
 const picture=pictureById(id);
 const puzzle=useMemo(()=>puzzleFor(picture),[id]);
 const n=puzzle.size,game=`picross-${picture.id}`;
 const solved=useMemo(()=>puzzle.grid.every((row,r)=>row.every((v,c)=>
  v===1?cells[r*n+c]===FILL:cells[r*n+c]!==FILL)),[cells,puzzle]);
 useEffect(()=>{
  if(began===null||solved)return;
  const t=setInterval(()=>setSeconds((Date.now()-began)/1000),500);
  return ()=>clearInterval(t);
 },[began,solved]);
 useEffect(()=>{
  if(!solved||began===null||saved.current===id)return;
  saved.current=id;
  const taken=(Date.now()-began)/1000;setSeconds(taken);
  mutate({type:'gameScore',person:user.name,game,score:picrossScore(n,taken,wrong)});
 },[solved]);
 function open(next,nextSize=size){
  const picked=pictureById(next);
  setId(next);setSize(nextSize);setMode(FILL);
  setCells(Array(picked.art.length**2).fill(BLANK));
  setWrong(0);setBegan(null);setSeconds(0);saved.current=null;
 }
 function tap(r,c){
  if(solved)return;
  if(began===null)setBegan(Date.now());
  const i=r*n+c,was=cells[i];
  const next=[...cells];
  next[i]=was===mode?BLANK:mode;
  // Filling a square that is not in the picture is not stopped and not undone — you work it out
  // and cross it back off. It is counted, so that guessing does not out-score working it out.
  if(mode===FILL&&was!==FILL&&puzzle.grid[r][c]===0)setWrong(w=>w+1);
  setCells(next);
 }
 const done=bestScore(state,user.name,game)>0;
 const widest=Math.max(...puzzle.rows.map(r=>r.length));
 const tallest=Math.max(...puzzle.cols.map(c=>c.length));
 return <>
  <p>The numbers say how many squares in that line are filled in, and in what order — <strong>3 1</strong> means
   three together, a gap, then one. Work out which, and a picture comes out. Nothing here needs
   guessing: every puzzle can be got to by working it out, and one that could not was thrown away.</p>
  <div className="segmented game-picker">{SIZES.map(s=>
   <button key={s} className={size===s?'selected':''} onClick={()=>open(picturesOf(s)[0].id,s)}>{s} × {s}</button>)}</div>
  <div className="picross-list">{list.map((p,i)=>{
   const won=bestScore(state,user.name,`picross-${p.id}`)>0;
   return <button key={p.id} className={`picross-pick${p.id===id?' selected':''}${won?' won':''}`}
    onClick={()=>open(p.id)} aria-label={won?`Puzzle ${i+1}, solved: ${p.en}`:`Puzzle ${i+1}, not solved yet`}>
    {won?<><Check size={13}/> {p.en}</>:i+1}</button>;
  })}</div>
  <div className="picross-frame" style={{'--n':n,'--clue-w':widest,'--clue-h':tallest}}>
   <div className="picross-corner"/>
   <div className="picross-cols">{puzzle.cols.map((clue,c)=>
    <span key={c} className={clue[0]===0?'empty':''}>{clue.filter(v=>v).map((v,i)=><b key={i}>{v}</b>)}</span>)}</div>
   <div className="picross-rows">{puzzle.rows.map((clue,r)=>
    <span key={r} className={clue[0]===0?'empty':''}>{clue.filter(v=>v).map((v,i)=><b key={i}>{v}</b>)}</span>)}</div>
   <div className="picross-grid">{puzzle.grid.map((row,r)=>row.map((_,c)=>{
    const v=cells[r*n+c];
    return <button key={`${r}-${c}`} className={`picross-cell${v===FILL?' on':''}${v===CROSS?' off':''}${c%5===4&&c<n-1?' rule':''}${r%5===4&&r<n-1?' ruleb':''}`}
     onClick={()=>tap(r,c)} aria-label={`Row ${r+1} column ${c+1}, ${v===FILL?'filled':v===CROSS?'crossed off':'blank'}`}>
     {v===CROSS?<X size={n>5?11:15}/>:null}</button>;
   }))}</div>
  </div>
  <div className="segmented game-picker picross-mode">
   <button className={mode===FILL?'selected':''} onClick={()=>setMode(FILL)}>■ Fill in</button>
   <button className={mode===CROSS?'selected':''} onClick={()=>setMode(CROSS)}>✕ Cross off</button>
  </div>
  <p className="game-status">{solved
   ?<><Trophy size={16}/> It is {picture.en} — <b lang="ja">{picture.ja}</b>. {Math.round(seconds)} seconds{wrong?`, ${wrong} squares filled that should not have been`:', and nothing filled in that should not have been'} — {picrossScore(n,seconds,wrong)} points.</>
   :began===null?'Tap a square to start. The clock starts with you.'
   :`${cells.filter(v=>v===FILL).length} filled in`}</p>
  <div className="game-stats cols-4">
   <span><small>Puzzle</small><strong>{done?picture.en:`${n} × ${n}`}</strong></span>
   <span><small>Clock</small><strong>{Math.round(seconds)}s</strong></span>
   <span><small>Wrong so far</small><strong>{wrong}</strong></span>
   <span><small>Your best</small><strong>{bestScore(state,user.name,game)||'—'}</strong></span>
  </div>
  <div className="row wrap game-actions">
   <button className={solved?'primary':''} onClick={()=>open(id)}><RotateCcw size={16}/> Clear it</button>
   {solved&&list.some(p=>bestScore(state,user.name,`picross-${p.id}`)===0)&&
    <button className="primary" onClick={()=>open(list.find(p=>bestScore(state,user.name,`picross-${p.id}`)===0).id)}>Next one</button>}
  </div>
 </>;
}
