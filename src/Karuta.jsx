import React,{useState,useMemo,useEffect,useRef} from 'react';
import {Trophy,RotateCcw,Volume2} from 'lucide-react';
import {KARUTA_DECKS,KARUTA_SIZES,karutaRound,karutaScore,OTETSUKI} from './karuta-data.js';
import {bestScore,scoresFor} from './trip-features.js';
import {useKanaVoice} from './SayIt.jsx';
// Karuta. The cards lie face up, the reader calls one, and the first hand on it keeps it —
// which on one phone means the clock is the brother you are racing. The call is deliberately
// not written on the card: if the card showed you the answer it would be a matching game, and
// there is already a matching game two buttons to the left.
const tenths=ms=>(Math.max(0,ms)/1000).toFixed(1);
export default function Karuta({user,state,mutate,busy}){
 const [deckId,setDeckId]=useState('hiragana'),[size,setSize]=useState(6);
 const [seed,setSeed]=useState(()=>Date.now()%100000);
 const [taken,setTaken]=useState([]),[wrong,setWrong]=useState(0),[missed,setMissed]=useState(null);
 const [started,setStarted]=useState(null),[elapsed,setElapsed]=useState(0);
 const round=useMemo(()=>karutaRound(deckId,size,seed),[deckId,size,seed]);
 const kotowaza=round.deck.id==='kotowaza';
 const speak=useKanaVoice(!kotowaza);
 const calling=round.calls[taken.length]||null;
 const card=calling?round.cards.find(c=>c.id===calling):null;
 const finished=taken.length===round.cards.length;
 const game=`karuta-${round.deck.id}-${round.cards.length}`;
 // The clock is the whole game, so it runs on its own rather than on a re-render.
 useEffect(()=>{
  if(started===null||finished)return;
  const t=setInterval(()=>setElapsed(Date.now()-started),100);
  return ()=>clearInterval(t);
 },[started,finished]);
 useEffect(()=>{
  if(!finished||started===null)return;
  mutate({type:'gameScore',person:user.name,game,score:karutaScore(round.cards.length,elapsed/1000,wrong)});
 },[finished]);
 // Reading the call aloud is the reader's whole job, so it happens by itself as each one comes
 // up rather than waiting for a button. The button is there for hearing it again.
 useEffect(()=>{if(card&&started!==null)speak(card.say,`karuta-${card.id}-${taken.length}`);},[card?.id,started]);
 function reset(next={}){
  setDeckId(next.deckId??deckId);setSize(next.size??size);
  setSeed(Date.now()%100000);setTaken([]);setWrong(0);setMissed(null);setStarted(null);setElapsed(0);
 }
 function grab(id){
  if(started===null||finished||taken.includes(id))return;
  // The clock ticks a tenth at a time for the sake of the screen, but the last card stops it
  // exactly, because that number is the score rather than something to look at.
  if(id===calling){setTaken(t=>{const next=[...t,id];if(next.length===round.cards.length)setElapsed(Date.now()-started);return next;});setMissed(null);return;}
  // Otetsuki. In a real game the wrong hand costs you a card you had already won; here it
  // costs points, because a five-year-old who has cards taken back off him stops playing. The
  // card flinches so he knows it cost something without having to read a number.
  setWrong(w=>w+1);setMissed(id);
  setTimeout(()=>setMissed(m=>m===id?null:m),600);
 }
 const board=scoresFor(state,game);
 return <>
  <p>The reader calls one card. Find it and take it before the clock does. {round.deck.how}</p>
  <div className="segmented game-picker">{KARUTA_DECKS.map(d=>
   <button key={d.id} className={deckId===d.id?'selected':''} onClick={()=>reset({deckId:d.id})} lang="ja">{d.ja}</button>)}</div>
  <div className="segmented game-picker">{KARUTA_SIZES.map(n=>
   <button key={n} className={size===n?'selected':''} onClick={()=>reset({size:n})}>{n} cards</button>)}</div>
  {started===null
   ?<div className="karuta-call ready">
     <p>{round.cards.length} cards, face up. The clock starts when you do.</p>
     <button className="primary" onClick={()=>{setStarted(Date.now());setElapsed(0);}}>Read the first one</button>
    </div>
   :finished
    ?<div className="karuta-call done">
      <p className="game-status"><Trophy size={16}/> All {round.cards.length} in {tenths(elapsed)} seconds
       {wrong?` — ${wrong} otetsuki`:' with a clean hand'}.</p>
      <p className="karuta-points">{karutaScore(round.cards.length,elapsed/1000,wrong)} points</p>
     </div>
    :<div className="karuta-call">
      <small>The reader says</small>
      <strong className={kotowaza?'long':''} lang={kotowaza?'ja':undefined}>{kotowaza?card.ja:card.call}</strong>
      {kotowaza&&<em>{card.romaji}</em>}
      {kotowaza&&<span>{card.meaning}</span>}
      <button type="button" onClick={()=>speak(card.say,`karuta-again-${card.id}-${taken.length}`)}>
       <Volume2 size={15}/> Again</button>
     </div>}
  <div className={`karuta-grid${kotowaza?' pictures':''}`} style={{'--cols':round.cards.length<=6?3:4}}>
   {round.cards.map(c=>{
   const gone=taken.includes(c.id);
   // The letter is the answer on the proverb deck, so it is on the card and the picture is
   // only there to be recognised across a table. On the letter decks the letter is the card.
   return <button key={c.id} className={`karuta-card${gone?' taken':''}${missed===c.id?' missed':''}`}
    disabled={gone||finished||started===null} onClick={()=>grab(c.id)} lang="ja" aria-label={c.under||c.face}>
    <span aria-hidden="true">{c.face}</span>{c.under&&<small aria-hidden="true" lang="ja">{c.under}</small>}</button>;
  })}</div>
  <div className="game-stats cols-4">
   <span><small>Taken</small><strong>{taken.length} of {round.cards.length}</strong></span>
   <span><small>Clock</small><strong>{tenths(started===null?0:elapsed)}s</strong></span>
   <span><small>Otetsuki</small><strong>{wrong}{wrong?<small>−{wrong*OTETSUKI}</small>:null}</strong></span>
   <span><small>Your best</small><strong>{bestScore(state,user.name,game)||'—'}</strong></span>
  </div>
  {Object.keys(board).length>1&&<p className="game-status">
   {Object.entries(board).map(([name,points])=>`${name} ${points}`).join(' · ')}</p>}
  <button onClick={()=>reset()}><RotateCcw size={16}/> New round</button>
  {kotowaza&&<details className="merge-ladder"><summary>What the sayings mean</summary>
   <div className="ladder-grid notes">{round.cards.map(c=>
    <span key={c.id}><b aria-hidden="true">{c.face}</b><b lang="ja">{c.ja}</b><small>{c.romaji}</small>
     <small>{c.literal} {c.meaning}</small></span>)}</div>
  </details>}
 </>;
}
