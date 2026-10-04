import React,{useEffect,useMemo,useRef,useState} from 'react';
import GuideByline from './GuideByline.jsx';
import PageTitle from './PageTitle.jsx';
import {AlertCircle,CalendarDays,Check,ExternalLink,ConciergeBell,MessageCircleQuestion,Navigation,Search,Trash2,WifiOff} from 'lucide-react';
import {ASK_LIMIT,askDayLabel,askHistory,askItem,askStarters,readThread,sharesThread,stepStarters,threadFor,writeThread} from './ask-thread.js';
import Dictate from './Dictate.jsx';
import {joinSpoken} from './dictation.js';
import {profileFilled} from './trip-features.js';
import {DraftChange} from './DayCheck.jsx';
import AskVoice from './AskVoice.jsx';
import {quickAnswer} from './concierge-quick.js';
import FindResults,{findTarget} from './FindResults.jsx';
// Asking about the trip. It reads the plan and answers; it cannot touch it. That line is on the
// screen rather than only in the prompt, because a box that answers questions looks like a box
// that does things, and nobody should find out otherwise by asking it to move a booking.
// Opened from a stop's card, it is the same box about one stop: the day is that stop's, the
// questions offered are about it, and only what was asked about it is shown and sent back.
// `assistant` is the same box opened from the microphone in the corner of any page: only the
// voice panel and what was asked in it this time, so it is a quick word, not the whole screen.
// It is also the one place to type anything: what is already on the phone (a stop, a ticket, a
// phrase, a screen) is found as the words go in, with no signal, and anything that is not a name
// is asked. Tapped, it opens ready to type; held, or pressed on the AirPods, it opens listening.
// On a phone the Concierge is not for, the same box only finds.
// Asked with no signal, a question the plan cannot answer is kept and asked once the phone is
// back in touch with the Concierge open, rather than lost.
// The page opens the way a concierge greets you: by the time of day where we are, which is Japan.
const greeting=(now=new Date())=>{const h=Number(new Intl.DateTimeFormat('en-AU',{timeZone:'Asia/Tokyo',hour:'numeric',hourCycle:'h23'}).format(now));return h>=5&&h<12?'Good morning':h>=12&&h<18?'Good afternoon':'Good evening';};
export default function AskTrip({state,user,day,step,config,online=true,request,mutate,go,selectDay,notice,assistant=false,canAsk=true,listen=false,find=null}){
 const [local,setThread]=useState(()=>readThread(user?.name));
 // A parent sees the trip's thread and this phone's together; a boy sees only his own phone's.
 const shared=sharesThread(user)&&!!mutate,all=threadFor(state,user,local);
 const [opened]=useState(()=>new Date().toISOString());
 const thread=step?all.filter(item=>item.step===step.id):assistant?all.filter(item=>item.pending||String(item.at||'')>=opened):all;
 const [question,setQuestion]=useState(''),[about,setAbout]=useState(state.days.some(d=>d.date===day)?day:'');
 const [working,setWorking]=useState(false),[error,setError]=useState('');
 const box=useRef(null),voice=useRef(null);
 const ready=!!config?.ask&&canAsk;
 const starters=useMemo(()=>step?stepStarters(step):askStarters(state,about||day),[state.days,state.proposals,state.weather,about,day,step]);
 useEffect(()=>{setThread(readThread(user?.name));},[user?.name]);
 useEffect(()=>{if(assistant&&!listen){const t=setTimeout(()=>box.current?.focus(),60);return()=>clearTimeout(t);}},[]);
 const keep=next=>setThread(writeThread(user?.name,next));
 // Clearing takes the shown questions out of the trip as well as off this phone, for a parent.
 const clear=()=>{keep(step?local.filter(item=>item.step!==step.id):[]);if(shared&&thread.length)mutate({type:'askForget',ids:thread.map(i=>i.id)});};
 // One question, typed or said, sent and kept. Said out loud, the answer is asked for in words
 // that work read back, and the item comes back to the assistant to read.
 // What is next, how long until, the way there: answered at once from the plan on this phone,
 // with or without a signal, and kept on this phone only — they are not worth the other
 // parent's thread. Asked from a stop's card, "there" is that stop, so those go to the Concierge.
 async function send(asked,spoken=false){
  const quick=step?null:quickAnswer(state,asked,{person:user?.name||null,day:about||day});
  if(quick){
   const item={id:`${Date.now()}`,at:new Date().toISOString(),question:asked,about:null,...quick,...(spoken?{spoken:true}:{})};
   setThread(prev=>writeThread(user?.name,[item,...prev]));
   return item;
  }
  if(!online){
   const item={id:`${Date.now()}`,at:new Date().toISOString(),question:asked,about:about||null,step:step?.id||null,pending:true,answer:'No signal, so this one is kept and asked as soon as the phone is back in touch.',...(spoken?{spoken:true}:{})};
   setThread(prev=>writeThread(user?.name,[item,...prev]));
   return item;
  }
  const answer=await request('ask',{question:asked,day:about||null,step:step?.id||null,history:askHistory(thread),...(spoken?{spoken:true}:{})});
  const item={id:`${Date.now()}`,at:new Date().toISOString(),...answer,...(spoken?{spoken:true}:{})};
  // The phone first, so the answer is kept even if the trip cannot be reached; then the trip.
  setThread(prev=>writeThread(user?.name,[item,...prev]));
  if(shared)mutate({type:'askKeep',item:askItem(item,user.name)});
  return item;
 }
 // Back in touch: what was kept is asked, oldest first, each answer taking its question's place.
 const flushing=useRef(false);
 useEffect(()=>{
  const waiting=local.filter(item=>item.pending).reverse();
  if(!online||!ready||!waiting.length||flushing.current)return;
  flushing.current=true;
  (async()=>{for(const kept of waiting){
   try{
    const answer=await request('ask',{question:kept.question,day:kept.about||null,step:kept.step||null,history:[]});
    const item={...answer,id:kept.id,at:new Date().toISOString(),question:answer.question||kept.question};
    setThread(prev=>writeThread(user?.name,prev.map(x=>x.id===kept.id?item:x)));
    if(shared)mutate({type:'askKeep',item:askItem(item,user.name)});
   }catch{break;}
  }flushing.current=false;})();
 },[online,ready,local]);
 async function ask(text){
  const asked=(text??question).trim();
  if(!asked){setError('Type a question first.');return;}
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
  {assistant?(ready?<p className="ask-assistant-about">Type a name to find it, or ask {about?`about ${askDayLabel(about)} and the days around it`:'about the whole trip'}. {go&&<button className="linkish" onClick={()=>go('ask')}>Open the Concierge page</button>}</p>:<p className="ask-assistant-about">Type a stop, a hotel, a ticket, a phrase or a screen.</p>):step?<p>Ask anything about {step.title} — how long it takes, what to eat, what the boys will like. It reads this stop and the rest of the day, and searches for what the plan cannot say.</p>:<>
  <p className="eyebrow">CONCIERGE</p>
  <PageTitle help={<><p>Ask anything about the trip in your own words: better today or tomorrow, what to do if it rains. Answers are for you first.</p><p>Every question is answered from the trip as it is right now: every day and what is booked, the forecast we last checked, the board and its votes, the places we saved, how each stop was rated, and everyone’s profile, with yours first. Change any of those and the next answer knows. It searches only for what the plan cannot say.</p></>}>{greeting()}. How can we help?</PageTitle></>}
  {!step&&!assistant&&ready&&user?.name&&state.members?.includes(user.name)&&!profileFilled(state,user.name)&&<p className="callout"><AlertCircle size={18}/><span>Your profile is empty, so recommendations can only go by the whole family. {go&&<button className="linkish" onClick={()=>go('planning')}>Fill it in on the Planning board</button>}</span></p>}
  {!ready&&!assistant&&<p className="callout"><AlertCircle size={18}/>Asking is not switched on for this deployment. Anything already answered is still below.</p>}
  {!online&&ready&&<p className="callout"><WifiOff size={18}/>No signal. Old answers are saved on this phone. What is next, how long until something and the way there are answered from the plan; anything else is kept and asked once the phone is back in touch.</p>}
  {ready&&<>
   <AskVoice ask={text=>send(text,true)} apply={applyItem} canApply={canApply} state={state} online={online} step={step} autoStart={assistant&&listen} control={voice}/>
   {!assistant&&!step&&<label>About which day<select value={about} onChange={e=>setAbout(e.target.value)}>
    <option value="">The whole trip</option>
    {state.days.map(d=><option key={d.date} value={d.date}>{askDayLabel(d.date)} · {d.title}</option>)}
   </select></label>}
   {!assistant&&!!starters.length&&<div className="chips ask-starters">{starters.map(text=><button className="chip" key={text} onClick={()=>{setQuestion(text);box.current?.focus();}}>{text}</button>)}</div>}
  </>}
  {(ready||assistant)&&<>
   <label>{assistant?(ready?'Or type it':''):'Your question'}<textarea ref={box} data-throwaway={assistant||undefined} onFocus={()=>voice.current?.cancel()} rows={assistant?2:3} value={question} maxLength={ASK_LIMIT} placeholder={assistant?(ready?'A stop, a ticket, a phrase, or a question':'A stop, a hotel, a ticket, a phrase…'):step?`What should we know before ${step.title}?`:'Is it better to do Fushimi Inari today or tomorrow?'}
    onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey||(assistant&&!e.shiftKey))){e.preventDefault();if(ready)ask();}}}/></label>
  </>}
  {ready&&<>
   {/* This box is held in React, so what is heard goes through state rather than into the
       element — and it is only ever put in the box, never asked. The boys ask too, and the
       question has to be theirs to read back and change before it goes. */}
   {!assistant&&<Dictate onText={heard=>setQuestion(q=>joinSpoken(q,heard).slice(0,ASK_LIMIT))} label="Say it" what="your question"/>}
   <div className="ask-send">
    <small>{ASK_LIMIT-question.length} left · one question at a time gets a better answer</small>
    <button className="primary" onClick={()=>ask()} disabled={working||!question.trim()}><Search size={18}/>{working?'Having a think…':assistant?'Ask the Concierge':'Ask'}</button>
   </div>
  </>}
  {/* Under the Ask button, so a question typed is one tap from asking whatever it matched. */}
  {assistant&&find&&<FindResults state={state} user={user} query={question} choose={h=>findTarget(h,find)} searchAll={()=>find.go('search')}/>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {thread.map(item=><article className="feature-card ask-card" key={item.id}>
   <p className="ask-question"><MessageCircleQuestion size={17}/>{item.question}</p>
   {item.by&&item.by!==user?.name&&<p className="ask-by"><small>Asked by {item.by}</small></p>}
   {!item.quick&&!item.pending&&<GuideByline state={state}/>}
   {item.verdict&&<h3>{item.verdict}</h3>}
   {item.answer&&<p>{item.answer}</p>}
   {!!item.because?.length&&<ul className="ask-because">{item.because.map((line,i)=><li key={i}><Check size={15}/>{line}</li>)}</ul>}
   {!!item.days?.length&&<div className="row wrap ask-days">{item.days.map(date=><button key={date} onClick={()=>selectDay?.(date)}><CalendarDays size={15}/>{askDayLabel(date)}</button>)}</div>}
   {item.link?.url&&<a className="button" href={item.link.url} target="_blank" rel="noopener noreferrer"><Navigation size={16}/>{item.link.label||'Directions'}</a>}
   {item.draft&&<DraftChange state={state} draft={item.draft} canApply={canApply} apply={()=>applyItem(item)}/>}
   {item.checkFirst&&<p className="callout"><AlertCircle size={18}/>Check first: {item.checkFirst}</p>}
   {!!item.sources?.length&&<details className="ask-sources"><summary>Where it looked ({item.sources.length})</summary>
    {item.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title||s.url} <ExternalLink size={13}/></a>)}</details>}
   {item.pending?<small>Waiting for a signal · asked when the phone is back in touch with the Concierge open</small>:item.quick?<small>Answered from the plan on this phone · nothing was changed</small>:<small>{item.step&&!step?`About ${state.steps.find(s=>s.id===item.step)?.title||'a stop'} · `:''}{item.about?`About ${askDayLabel(item.about)}`:'About the whole trip'} · {item.usage?.searches??item.searches??0} web {(item.usage?.searches??item.searches)===1?'search':'searches'} · {item.draft?.appliedAt?`change applied by ${item.draft.appliedBy||'a parent'}`:'nothing was changed'}</small>}
  </article>)}
  {!thread.length&&ready&&!assistant&&<div className="empty"><ConciergeBell/><h2>Nothing asked yet</h2><p>Tap one of the questions above, or write your own. {shared?'Answers are kept in the trip, so both of you can read them again, and on this phone for when there is no signal.':'Answers are kept on this phone so you can read them again with no signal.'}</p></div>}
  {!!thread.length&&!assistant&&<div className="row wrap"><button onClick={()=>{clear();notice?.(step?'The questions about this stop are cleared.':shared?'The shared questions are cleared.':'Your questions on this phone are cleared.');}}><Trash2 size={16}/>{step?'Clear these questions':shared?'Clear our questions':'Clear my questions'}</button>
   {!step&&<button onClick={()=>go?.('planning')}>Planning board</button>}</div>}
  {ready&&!assistant&&<p className="callout"><AlertCircle size={18}/>This reads the plan and gives an opinion. It never moves or adds a stop, changes a booking or tells anybody anything by itself: when the answer is a change to the day, it hands it back as a draft {user?.role==='parent'?'for you to look over and apply — on the screen, or with a yes when you asked out loud':'for a parent to apply'}. It can be wrong about what is open, what a ticket costs and what is on, so check anything you are about to rely on.</p>}
 </div>;
}
