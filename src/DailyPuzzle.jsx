import React,{useEffect,useState} from 'react';
import {Share2,Delete,CornerDownLeft,Puzzle,ChevronRight} from 'lucide-react';
import {useStored} from './stored.js';
import {puzzleFor,markGuess,puzzleScore,puzzleKey,puzzleResults,shareGrid} from './puzzle-data.js';
import {japanDate} from './timing.js';
import {dayLabel} from './AdventurePages.jsx';
import WinBurst from './Win.jsx';
import {documentUrl as fileUrl} from './api-urls.js';
// The one puzzle everyone does today. Guesses stay on the phone until it is solved; the score
// goes into the trip against the day, so the others can see who has done it without seeing how.
async function shareText(text){
 if(navigator.share){try{await navigator.share({text});return 'shared';}catch(e){if(e?.name==='AbortError')return '';}}
 await navigator.clipboard.writeText(text);return 'copied';
}
export default function DailyPuzzle({state,user,mutate,busy,notice}){
 const today=japanDate(),puzzle=puzzleFor(state,today);
 const [saved,setSaved]=useStored(`japan.puzzle.${today}.${user.name}`,{guesses:[],solved:false,over:false,scored:false});
 const [typed,setTyped]=useState(''),[burst,setBurst]=useState(false);
 useEffect(()=>{
  if(!puzzle||!saved.over||saved.scored)return;
  mutate({type:'gameScore',person:user.name,game:puzzleKey(today),score:puzzleScore(puzzle.tries,saved.guesses.length,saved.solved)});
  setSaved(s=>({...s,scored:true}));
 },[saved.over]);
 if(!puzzle)return <p className="puzzle-empty">No puzzle today: nothing to ask yet.</p>;
 const finish=(guesses,solved)=>{setSaved({guesses,solved,over:solved||guesses.length>=puzzle.tries,scored:false});if(solved)setBurst(true);};
 const results=puzzleResults(state,today).filter(r=>r.person!==user.name);
 const share=async()=>{const r=await shareText(shareGrid(puzzle,saved.guesses,saved.solved));if(r)notice?.(r==='copied'?'Copied. Paste it into Messages.':'Shared.');};
 const head=<p className="eyebrow"><Puzzle size={13}/> Day {puzzle.dayNumber} · {puzzle.kind==='katakana'?'Today’s katakana':puzzle.kind==='stop'?'Where was this?':'What did it cost?'}</p>;
 const foot=saved.over&&<div className="puzzle-foot">
  <p>{saved.solved?`Got it in ${saved.guesses.length} of ${puzzle.tries}.`:`Not this time. It was ${puzzle.kind==='katakana'?`${puzzle.word} (${puzzle.romaji})`:puzzle.kind==='stop'?puzzle.options.find(o=>o.id===puzzle.answer)?.title:`¥${puzzle.answer.toLocaleString('en')}`}.`}</p>
  {puzzle.kind==='katakana'&&<p className="puzzle-where"><b>{puzzle.word}</b> {puzzle.romaji} · {puzzle.en}. {puzzle.where}</p>}
  <div className="row wrap"><button type="button" onClick={share}><Share2 size={16}/>Share the grid</button></div>
  {results.length>0&&<p className="puzzle-others">{results.map(r=>`${r.person} ${r.score>=2?'✔':'✖'}`).join(' · ')}</p>}
 </div>;
 if(puzzle.kind==='katakana'){
  const n=puzzle.length,rows=[...saved.guesses,...Array(Math.max(0,puzzle.tries-saved.guesses.length)).fill(null)];
  const submit=()=>{if(Array.from(typed).length!==n||saved.over)return;const marks=markGuess(puzzle.word,typed);const guesses=[...saved.guesses,{text:typed,marks}];setTyped('');finish(guesses,marks.every(m=>m==='hit'));};
  const used=new Map();saved.guesses.forEach(g=>Array.from(g.text).forEach((c,i)=>{const m=g.marks[i],old=used.get(c);used.set(c,old==='hit'||m==='hit'?'hit':old==='near'||m==='near'?'near':'miss');}));
  return <div className="puzzle katakana">{head}
   <p className="puzzle-clue">{n} katakana for <b>{puzzle.en}</b>. {puzzle.tries} goes.</p>
   <div className="puzzle-grid" style={{'--n':n}}>{rows.map((g,r)=><div className="puzzle-row" key={r}>{Array.from({length:n},(_,i)=>{const c=g?Array.from(g.text)[i]:r===saved.guesses.length?Array.from(typed)[i]:'';return <span key={i} className={`puzzle-cell${g?` is-${g.marks[i]}`:c?' is-typed':''}`} lang="ja">{c||''}</span>;})}</div>)}</div>
   {!saved.over&&<div className="puzzle-keys">{puzzle.keys.map(k=><button type="button" key={k} lang="ja" className={used.get(k)?`is-${used.get(k)}`:''} disabled={Array.from(typed).length>=n} onClick={()=>setTyped(t=>t+k)}>{k}</button>)}
    <button type="button" className="puzzle-key-wide" onClick={()=>setTyped(t=>Array.from(t).slice(0,-1).join(''))} aria-label="Delete"><Delete size={18}/></button>
    <button type="button" className="puzzle-key-wide primary" disabled={Array.from(typed).length!==n} onClick={submit} aria-label="Enter"><CornerDownLeft size={18}/></button></div>}
   {foot}<WinBurst on={burst} label="Got it!" sub={puzzle.romaji}/>
  </div>;
 }
 if(puzzle.kind==='stop'){
  const zoom=puzzle.zoom[Math.min(saved.guesses.length,puzzle.zoom.length-1)];
  const guess=o=>{if(saved.over)return;const hit=o.id===puzzle.answer;finish([...saved.guesses,{text:o.title,marks:[hit?'hit':'miss']}],hit);};
  return <div className="puzzle stop">{head}
   <p className="puzzle-clue">A photo from {dayLabel(puzzle.day)}. Which stop? It zooms out with each go.</p>
   <div className="puzzle-photo"><img src={fileUrl(puzzle.photo)} alt="A close crop of one of our photos" style={{transform:`scale(${saved.over?1:zoom})`}}/></div>
   <div className="puzzle-options">{puzzle.options.map(o=>{const tried=saved.guesses.find(g=>g.text===o.title);return <button type="button" key={o.id} disabled={saved.over||!!tried} className={tried?(o.id===puzzle.answer?'is-hit':'is-miss'):saved.over&&o.id===puzzle.answer?'is-hit':''} onClick={()=>guess(o)}>{o.title}<ChevronRight size={16}/></button>;})}</div>
   {foot}<WinBurst on={burst} label="That’s the one!"/>
  </div>;
 }
 const guess=v=>{if(saved.over)return;const hit=v===puzzle.answer;finish([...saved.guesses,{text:String(v),marks:[hit?'hit':v<puzzle.answer?'near':'miss']}],hit);};
 return <div className="puzzle price">{head}
  <p className="puzzle-clue">{puzzle.item.person} bought <b>{puzzle.item.title}</b>{puzzle.item.day?` on ${dayLabel(puzzle.item.day)}`:''}. What did it cost? {puzzle.tries} goes; a wrong one says higher or lower.</p>
  <div className="puzzle-options">{puzzle.options.map(v=>{const tried=saved.guesses.find(g=>g.text===String(v));return <button type="button" key={v} disabled={saved.over||!!tried} className={tried?(v===puzzle.answer?'is-hit':'is-miss'):saved.over&&v===puzzle.answer?'is-hit':''} onClick={()=>guess(v)}>¥{v.toLocaleString('en')}{tried&&v!==puzzle.answer&&<small>{v<puzzle.answer?'higher':'lower'}</small>}</button>;})}</div>
  {foot}<WinBurst on={burst} label="Spot on!"/>
 </div>;
}
// The line on Home: what today's is, who has done it, and a way in.
export function PuzzleLine({state,user,open}){
 const today=japanDate(),puzzle=puzzleFor(state,today);
 if(!puzzle)return null;
 const results=puzzleResults(state,today),mine=results.find(r=>r.person===user.name);
 return <button type="button" className="puzzle-line" onClick={open}>
  <span aria-hidden="true">🧩</span>
  <span><b>Today’s puzzle · {puzzle.kind==='katakana'?`${puzzle.length} katakana`:puzzle.kind==='stop'?'where was this photo?':'what did it cost?'}</b>
   <small>{mine?`You: ${mine.score>=2?'done ✔':'tried'}`:'Not played yet'}{results.filter(r=>r.person!==user.name).length?` · ${results.filter(r=>r.person!==user.name).map(r=>`${r.person} ${r.score>=2?'✔':'✖'}`).join(', ')}`:''}</small></span>
  <ChevronRight size={18}/>
 </button>;
}
