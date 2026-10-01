import React,{useEffect,useState} from 'react';
import {Play,ChevronRight,Trophy,X} from 'lucide-react';
import {COLOURS,WINDOW_SECONDS,questionOpen,secondsLeft,scores,points} from './quiz-data.js';
import {gentleOnly} from './child-levels.js';
// The dinner quiz screen, host and buzzer in one. The host's phone shows the question, the clock
// and who has answered; every other phone shows the four coloured answers. While it is open the
// screen asks for the trip every few seconds, which is as live as the phones get.
export default function DinnerQuiz({state,user,day,request,accept,refresh,notice}){
 const quiz=state.quiz||null,host=quiz?.host===user.name,parent=user.role==='parent';
 const [now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(t);},[]);
 useEffect(()=>{if(!quiz||quiz.done)return;const t=setInterval(()=>{refresh?.().catch?.(()=>{});},3000);return()=>clearInterval(t);},[quiz?.id,quiz?.done]);
 async function act(body){setBusy(true);try{accept(await request('quiz',body));}catch(e){notice?.(e.message);}finally{setBusy(false);}}
 if(!quiz)return <div className="quiz">
  <p>Five questions from the trip so far — the fun facts we have read, the phrases we have learned, and today’s stops. One phone hosts; everyone else’s phone is a buzzer. Points for right, more for fast.</p>
  <p><small>The phones catch up every few seconds rather than instantly, so each question stays open for {WINDOW_SECONDS} seconds. It is a game for a table, not a race to the millisecond.</small></p>
  {parent?<button type="button" className="primary" disabled={busy} onClick={()=>act({action:'start',day,seed:Date.now(),gentle:(state.members||[]).some(n=>gentleOnly(state,n))})}><Play size={16}/>Host a quiz</button>
   :<p className="callout">When Mum or Dad starts a quiz, it appears here.</p>}
 </div>;
 const q=quiz.questions[quiz.index],open=questionOpen(quiz,now),left=secondsLeft(quiz,now);
 const mine=quiz.answers?.[quiz.index]?.[user.name],answered=Object.keys(quiz.answers?.[quiz.index]||{});
 const board=scores(quiz);
 if(quiz.done)return <div className="quiz">
  <p className="eyebrow">FINAL SCORES</p>
  <ol className="quiz-board">{board.map((r,i)=><li key={r.person}>{i===0&&<Trophy size={16}/>}<b>{r.person}</b><span>{r.score}</span></li>)}</ol>
  {!board.length&&<p>Nobody answered. Next time!</p>}
  {parent&&<button type="button" disabled={busy} onClick={()=>act({action:'clear'})}><X size={16}/>Put the quiz away</button>}
 </div>;
 return <div className="quiz">
  <p className="eyebrow">QUESTION {quiz.index+1} OF {quiz.questions.length} · {open?`${left}s`:'CLOSED'}</p>
  <div className="quiz-clock" aria-hidden="true"><i style={{width:`${(left/WINDOW_SECONDS)*100}%`}}/></div>
  <h2 className="quiz-question">{q.q}</h2>
  <div className="quiz-options">{q.options.map((o,i)=>{
   const right=q.answer===i,chosen=mine?.choice===i;
   return <button type="button" key={i} className={`quiz-option ${COLOURS[i]}${!open&&q.answer!=null?right?' right':' wrong':''}${chosen?' chosen':''}`}
    disabled={busy||!open||!!mine||host} onClick={()=>act({action:'answer',index:quiz.index,choice:i})}>{o}</button>;})}</div>
  {host?<p><small>{answered.length?`Answered: ${answered.join(', ')}`:'Waiting for answers…'}</small></p>
   :mine?<p className="quiz-locked">Locked in.{!open&&q.answer!=null?(mine.choice===q.answer?` Right! +${points(quiz,quiz.index,mine)}`:' Not this time.'):''}</p>
   :!open&&<p className="quiz-locked">Time’s up.</p>}
  {!open&&!!board.length&&<ol className="quiz-board">{board.map(r=><li key={r.person}><b>{r.person}</b><span>{r.score}</span></li>)}</ol>}
  {host&&<div className="row wrap"><button type="button" className="primary" disabled={busy||open} onClick={()=>act({action:'next'})}><ChevronRight size={16}/>{quiz.index>=quiz.questions.length-1?'Final scores':'Next question'}</button>
   <button type="button" disabled={busy} onClick={()=>act({action:'end'})}>End the quiz</button></div>}
 </div>;
}
export function QuizLine({state,open}){
 const quiz=state.quiz;if(!quiz||quiz.done)return null;
 return <button type="button" className="moment-banner quiz-line" onClick={open}>🎯 <span><b>The dinner quiz is on</b><small>{quiz.host} is hosting · question {quiz.index+1} of {quiz.questions.length}. Tap to play.</small></span></button>;
}
