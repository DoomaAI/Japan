import React,{useEffect,useMemo,useRef,useState} from 'react';
import HowThisWorks from './HowThisWorks.jsx';
import {AlertCircle,CalendarDays,Check,ExternalLink,MessageCircleQuestion,Search,Trash2,WifiOff} from 'lucide-react';
import {ASK_LIMIT,askDayLabel,askHistory,askItem,askStarters,readThread,sharesThread,stepStarters,threadFor,writeThread} from './ask-thread.js';
import Dictate from './Dictate.jsx';
import {joinSpoken} from './dictation.js';
import {profileFilled} from './trip-features.js';
import {DraftChange} from './DayCheck.jsx';
import AskVoice from './AskVoice.jsx';
// Asking about the trip. It reads the plan and answers; it cannot touch it. That line is on the
// screen rather than only in the prompt, because a box that answers questions looks like a box
// that does things, and nobody should find out otherwise by asking it to move a booking.
// Opened from a stop's card, it is the same box about one stop: the day is that stop's, the
// questions offered are about it, and only what was asked about it is shown and sent back.
// `assistant` is the same box opened from the microphone in the corner of any page: only the
// voice panel and what was asked in it this time, so it is a quick word, not the whole screen.
export default function AskTrip({state,user,day,step,config,online=true,request,mutate,go,selectDay,notice,assistant=false}){
 const [local,setThread]=useState(()=>readThread(user?.name));
 // A parent sees the trip's thread and this phone's together; a boy sees only his own phone's.
 const shared=sharesThread(user)&&!!mutate,all=threadFor(state,user,local);
 const [opened]=useState(()=>new Date().toISOString());
 const thread=step?all.filter(item=>item.step===step.id):assistant?all.filter(item=>String(item.at||'')>=opened):all;
 const [question,setQuestion]=useState(''),[about,setAbout]=useState(state.days.some(d=>d.date===day)?day:'');
 const [working,setWorking]=useState(false),[error,setError]=useState('');
 const box=useRef(null),voice=useRef(null);
 const ready=!!config?.ask;
 const starters=useMemo(()=>step?stepStarters(step):askStarters(state,about||day),[state.days,state.proposals,state.weather,about,day,step]);
 useEffect(()=>{setThread(readThread(user?.name));},[user?.name]);
 const keep=next=>setThread(writeThread(user?.name,next));
 // Clearing takes the shown questions out of the trip as well as off this phone, for a parent.
 const clear=()=>{keep(step?local.filter(item=>item.step!==step.id):[]);if(shared&&thread.length)mutate({type:'askForget',ids:thread.map(i=>i.id)});};
 // One question, typed or said, sent and kept. Said out loud, the answer is asked for in words
 // that work read back, and the item comes back to the assistant to read.
 async function send(asked,spoken=false){
  const answer=await request('ask',{question:asked,day:about||null,step:step?.id||null,history:askHistory(thread),...(spoken?{spoken:true}:{})});
  const item={id:`${Date.now()}`,at:new Date().toISOString(),...answer,...(spoken?{spoken:true}:{})};
  // The phone first, so the answer is kept even if the trip cannot be reached; then the trip.
  setThread(prev=>writeThread(user?.name,[item,...prev]));
  if(shared)mutate({type:'askKeep',item:askItem(item,user.name)});
  return item;
 }
 async function ask(text){
  const asked=(text??question).trim();
  if(!asked){setError('Type a question first.');return;}
  if(!online){setError('Asking needs a signal. The plan itself is on this phone either way.');return;}
  setWorking(true);setError('');
  try{await send(asked);setQuestion('');}
  catch(e){setError(e.message||'That did not work. Try asking it another way.');}
  finally{setWorking(false);}
 }
 const canApply=user?.role==='parent'&&!!mutate&&online;
 // The same apply for the button on the card and a yes said to the assistant.
 async function applyItem(item){
  const ok=await mutate({type:'askDraftApply',itemId:item.id,changes:item.draft.changes});
  if(ok){setThread(prev=>writeThread(user?.name,prev.map(x=>x.id===item.id?{...x,draft:{...x.draft,appliedAt:new Date().toISOString(),appliedBy:user.name}}:x)));notice?.('Applied. The day is updated on every phone.');}
  return ok;
 }
 return <div className="ask">
  {assistant?<p className="ask-assistant-about">{about?`About ${askDayLabel(about)} and the days around it.`:'About the whole trip.'} {go&&<button className="linkish" onClick={()=>go('ask')}>Type a question instead</button>}</p>:step?<p>Ask anything about {step.title} — how long it takes, what to eat, what the boys will like. It reads this stop and the rest of the day, and searches for what the plan cannot say.</p>:<>
  <p className="eyebrow">ASK ABOUT OUR TRIP</p>
  <h1>Better today or tomorrow?</h1>
  <p>Ask anything about the trip in your own words. Answers are for you first.</p>
 <HowThisWorks><p>Every question is answered from the trip as it is right now: every day and what is booked, the forecast we last checked, the board and its votes, the places we saved, how each stop was rated, and everyone’s profile, with yours first. Change any of those and the next answer knows. It searches only for what the plan cannot say.</p></HowThisWorks></>}
  {!step&&!assistant&&ready&&user?.name&&state.members?.includes(user.name)&&!profileFilled(state,user.name)&&<p className="callout"><AlertCircle size={18}/><span>Your profile is empty, so recommendations can only go by the whole family. {go&&<button className="linkish" onClick={()=>go('planning')}>Fill it in on the Planning board</button>}</span></p>}
  {!ready&&<p className="callout"><AlertCircle size={18}/>Asking is not switched on for this deployment. Anything already answered is still below.</p>}
  {!online&&<p className="callout"><WifiOff size={18}/>No signal. Old answers are saved on this phone; a new question has to wait.</p>}
  {ready&&<>
   {online&&<AskVoice ask={text=>send(text,true)} apply={applyItem} canApply={canApply} state={state} online={online} step={step} autoStart={assistant} control={voice}/>}
   {!assistant&&!step&&<label>About which day<select value={about} onChange={e=>setAbout(e.target.value)}>
    <option value="">The whole trip</option>
    {state.days.map(d=><option key={d.date} value={d.date}>{askDayLabel(d.date)} · {d.title}</option>)}
   </select></label>}
   {!assistant&&!!starters.length&&<div className="chips ask-starters">{starters.map(text=><button className="chip" key={text} onClick={()=>{setQuestion(text);box.current?.focus();}}>{text}</button>)}</div>}
   <label>{assistant?'Or type it':'Your question'}<textarea ref={box} onFocus={()=>voice.current?.cancel()} rows={3} value={question} maxLength={ASK_LIMIT} placeholder={step?`What should we know before ${step.title}?`:'Is it better to do Fushimi Inari today or tomorrow?'}
    onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))ask();}}/></label>
   {/* This box is held in React, so what is heard goes through state rather than into the
       element — and it is only ever put in the box, never asked. The boys ask too, and the
       question has to be theirs to read back and change before it goes. */}
   {!assistant&&<Dictate onText={heard=>setQuestion(q=>joinSpoken(q,heard).slice(0,ASK_LIMIT))} label="Say it" what="your question"/>}
   <div className="ask-send">
    <small>{ASK_LIMIT-question.length} left · one question at a time gets a better answer</small>
    <button className="primary" onClick={()=>ask()} disabled={working||!online||!question.trim()}><Search size={18}/>{working?'Having a think…':'Ask'}</button>
   </div>
  </>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {thread.map(item=><article className="feature-card ask-card" key={item.id}>
   <p className="ask-question"><MessageCircleQuestion size={17}/>{item.question}</p>
   {item.by&&item.by!==user?.name&&<p className="ask-by"><small>Asked by {item.by}</small></p>}
   {item.verdict&&<h3>{item.verdict}</h3>}
   {item.answer&&<p>{item.answer}</p>}
   {!!item.because?.length&&<ul className="ask-because">{item.because.map((line,i)=><li key={i}><Check size={15}/>{line}</li>)}</ul>}
   {!!item.days?.length&&<div className="row wrap ask-days">{item.days.map(date=><button key={date} onClick={()=>selectDay?.(date)}><CalendarDays size={15}/>{askDayLabel(date)}</button>)}</div>}
   {item.draft&&<DraftChange state={state} draft={item.draft} canApply={canApply} apply={()=>applyItem(item)}/>}
   {item.checkFirst&&<p className="callout"><AlertCircle size={18}/>Check first: {item.checkFirst}</p>}
   {!!item.sources?.length&&<details className="ask-sources"><summary>Where it looked ({item.sources.length})</summary>
    {item.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title||s.url} <ExternalLink size={13}/></a>)}</details>}
   <small>{item.step&&!step?`About ${state.steps.find(s=>s.id===item.step)?.title||'a stop'} · `:''}{item.about?`About ${askDayLabel(item.about)}`:'About the whole trip'} · {item.usage?.searches??item.searches??0} web {(item.usage?.searches??item.searches)===1?'search':'searches'} · {item.draft?.appliedAt?`change applied by ${item.draft.appliedBy||'a parent'}`:'nothing was changed'}</small>
  </article>)}
  {!thread.length&&ready&&!assistant&&<div className="empty"><MessageCircleQuestion/><h2>Nothing asked yet</h2><p>Tap one of the questions above, or write your own. {shared?'Answers are kept in the trip, so both of you can read them again, and on this phone for when there is no signal.':'Answers are kept on this phone so you can read them again with no signal.'}</p></div>}
  {!!thread.length&&!assistant&&<div className="row wrap"><button onClick={()=>{clear();notice?.(step?'The questions about this stop are cleared.':shared?'The shared questions are cleared.':'Your questions on this phone are cleared.');}}><Trash2 size={16}/>{step?'Clear these questions':shared?'Clear our questions':'Clear my questions'}</button>
   {!step&&<button onClick={()=>go?.('planning')}>Planning board</button>}</div>}
  {ready&&!assistant&&<p className="callout"><AlertCircle size={18}/>This reads the plan and gives an opinion. It never moves or adds a stop, changes a booking or tells anybody anything by itself: when the answer is a change to the day, it hands it back as a draft {user?.role==='parent'?'for you to look over and apply — on the screen, or with a yes when you asked out loud':'for a parent to apply'}. It can be wrong about what is open, what a ticket costs and what is on, so check anything you are about to rely on.</p>}
 </div>;
}
