import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AlertCircle,CalendarDays,Check,ExternalLink,MessageCircleQuestion,Search,Trash2,WifiOff} from 'lucide-react';
import {ASK_LIMIT,askDayLabel,askHistory,askStarters,readThread,writeThread} from './ask-thread.js';
import Dictate from './Dictate.jsx';
import {joinSpoken} from './dictation.js';
// Asking about the trip. It reads the plan and answers; it cannot touch it. That line is on the
// screen rather than only in the prompt, because a box that answers questions looks like a box
// that does things, and nobody should find out otherwise by asking it to move a booking.
export default function AskTrip({state,user,day,config,online=true,request,go,selectDay,notice}){
 const [thread,setThread]=useState(()=>readThread(user?.name));
 const [question,setQuestion]=useState(''),[about,setAbout]=useState(state.days.some(d=>d.date===day)?day:'');
 const [working,setWorking]=useState(false),[error,setError]=useState('');
 const box=useRef(null);
 const ready=!!config?.ask;
 const starters=useMemo(()=>askStarters(state,about||day),[state.days,state.proposals,state.weather,about,day]);
 useEffect(()=>{setThread(readThread(user?.name));},[user?.name]);
 const keep=next=>setThread(writeThread(user?.name,next));
 async function ask(text){
  const asked=(text??question).trim();
  if(!asked){setError('Type a question first.');return;}
  if(!online){setError('Asking needs a signal. The plan itself is on this phone either way.');return;}
  setWorking(true);setError('');
  try{
   const answer=await request('ask',{question:asked,day:about||null,history:askHistory(thread)});
   keep([{id:`${Date.now()}`,at:new Date().toISOString(),...answer},...thread]);
   setQuestion('');
  }catch(e){setError(e.message||'That did not work. Try asking it another way.');}
  finally{setWorking(false);}
 }
 return <div className="ask">
  <p className="eyebrow">ASK ABOUT OUR TRIP</p>
  <h1>Better today or tomorrow?</h1>
  <p>Ask anything about the trip in your own words. It reads our plan — every day, what is booked, the forecast we last checked and what is still on the board — and answers out of that, searching only for what the plan cannot say.</p>
  {!ready&&<p className="callout"><AlertCircle size={18}/>Asking is not switched on for this deployment. Anything already answered is still below.</p>}
  {!online&&<p className="callout"><WifiOff size={18}/>No signal. Old answers are saved on this phone; a new question has to wait.</p>}
  {ready&&<>
   <label>About which day<select value={about} onChange={e=>setAbout(e.target.value)}>
    <option value="">The whole trip</option>
    {state.days.map(d=><option key={d.date} value={d.date}>{askDayLabel(d.date)} · {d.title}</option>)}
   </select></label>
   {!!starters.length&&<div className="chips ask-starters">{starters.map(text=><button className="chip" key={text} onClick={()=>{setQuestion(text);box.current?.focus();}}>{text}</button>)}</div>}
   <label>Your question<textarea ref={box} rows={3} value={question} maxLength={ASK_LIMIT} placeholder="Is it better to do Fushimi Inari today or tomorrow?"
    onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))ask();}}/></label>
   {/* This box is held in React, so what is heard goes through state rather than into the
       element — and it is only ever put in the box, never asked. The boys ask too, and the
       question has to be theirs to read back and change before it goes. */}
   <Dictate onText={heard=>setQuestion(q=>joinSpoken(q,heard).slice(0,ASK_LIMIT))} label="Say it" what="your question"/>
   <div className="ask-send">
    <small>{ASK_LIMIT-question.length} left · one question at a time gets a better answer</small>
    <button className="primary" onClick={()=>ask()} disabled={working||!online||!question.trim()}><Search size={18}/>{working?'Having a think…':'Ask'}</button>
   </div>
  </>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {thread.map(item=><article className="feature-card ask-card" key={item.id}>
   <p className="ask-question"><MessageCircleQuestion size={17}/>{item.question}</p>
   {item.verdict&&<h3>{item.verdict}</h3>}
   {item.answer&&<p>{item.answer}</p>}
   {!!item.because?.length&&<ul className="ask-because">{item.because.map((line,i)=><li key={i}><Check size={15}/>{line}</li>)}</ul>}
   {!!item.days?.length&&<div className="row wrap ask-days">{item.days.map(date=><button key={date} onClick={()=>selectDay?.(date)}><CalendarDays size={15}/>{askDayLabel(date)}</button>)}</div>}
   {item.checkFirst&&<p className="callout"><AlertCircle size={18}/>Check first: {item.checkFirst}</p>}
   {!!item.sources?.length&&<details className="ask-sources"><summary>Where it looked ({item.sources.length})</summary>
    {item.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title||s.url} <ExternalLink size={13}/></a>)}</details>}
   <small>{item.about?`About ${askDayLabel(item.about)}`:'About the whole trip'} · {item.usage?.searches||0} web {item.usage?.searches===1?'search':'searches'} · nothing was changed</small>
  </article>)}
  {!thread.length&&ready&&<div className="empty"><MessageCircleQuestion/><h2>Nothing asked yet</h2><p>Tap one of the questions above, or write your own. Answers are kept on this phone so you can read them again with no signal.</p></div>}
  {!!thread.length&&<div className="row wrap"><button onClick={()=>{keep([]);notice?.('Your questions on this phone are cleared.');}}><Trash2 size={16}/>Clear my questions</button>
   <button onClick={()=>go?.('planning')}>Planning board</button></div>}
  {ready&&<p className="callout"><AlertCircle size={18}/>This reads the plan and gives an opinion. It cannot move an activity, change a booking or tell anybody anything — every change is still made by one of us, on the day it belongs to. It can be wrong about what is open, what a ticket costs and what is on, so check anything you are about to rely on.</p>}
 </div>;
}
