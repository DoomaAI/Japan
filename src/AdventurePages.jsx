import React,{useEffect,useState,useRef} from 'react';
import {MascotBadge} from './Mascot.jsx';
import {Volume2,Square,SkipForward,RotateCcw,Sparkles} from 'lucide-react';
import MissionArt from './MissionArt.jsx';
import {BOYS,yenPerAud,yenToAud} from './trip-features.js';
import {japanClock,japanDate} from './timing.js';
import {matchVoice,speechRate,needsSettle,isRealFailure,holdPlayback,releasePlayback,keepHolding,whenHolding,isStandalone,wakeSpeech,silenceAdvice,SILENCE_HELP} from './speech.js';
export const dayLabel=d=>d?new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',weekday:'short',timeZone:'Asia/Tokyo'}).format(new Date(d+'T12:00:00+09:00')):'Whole trip';
export function DaySelect({state,value,onChange,name,allowAll=false}){return <select name={name} value={value} onChange={onChange}><option value="">{allowAll?'Whole trip':'Unscheduled'}</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select>;}
// Reads a mission aloud, so Nate can follow his own missions before he can read them.
// Uses the browser's own speech; nothing is sent anywhere and it needs no connection.
export const SILENT_HINT='No sound? Headphones always work, silent switch or not, and so does a phrase somebody has recorded. Otherwise flick the iPhone\u2019s side switch off silent and turn the volume up.';
export function useReadAloud(){
 const supported=typeof window!=='undefined'&&'speechSynthesis'in window&&'SpeechSynthesisUtterance'in window;
 const [reading,setReading]=useState(''),[problem,setProblem]=useState('');
 const timer=useRef(null),guard=useRef(null),letGo=useRef(null);
 // Let go of the session this hook is holding, whoever asked. Each reading registers its own
 // release rather than a shared flag, so a late 'finished' from a phrase that was cancelled
 // minutes ago cannot pull the session out from under the one talking now.
 const release=()=>{const go=letGo.current;letGo.current=null;go?.();};
 useEffect(()=>()=>{
  clearTimeout(timer.current);clearTimeout(guard.current);release();
  if(supported)window.speechSynthesis.cancel();
 },[supported]);
 // iOS stops speaking once the app has been in the background, which is every time the phone
 // goes in a pocket. Clearing the queue on the way back in is what starts it again.
 useEffect(()=>{
  if(!supported)return;
  const back=()=>{if(document.visibilityState==='visible')wakeSpeech();};
  document.addEventListener('visibilitychange',back);
  return()=>document.removeEventListener('visibilitychange',back);
 },[supported]);
 function read(id,text,lang='en-AU',rate){
  if(!supported)return;
  const synth=window.speechSynthesis;
  const busy=needsSettle(synth);
  clearTimeout(timer.current);clearTimeout(guard.current);
  // iOS does not always deliver 'end' or 'error' for an utterance it was told to drop, so the
  // hold that utterance took is let go here rather than waited on. A hold nobody lets go of
  // keeps the loop running for the rest of the day.
  if(busy)synth.cancel();
  release();
  if(reading===id){setReading('');return;}
  setProblem('');
  const start=()=>{
   const say=new window.SpeechSynthesisUtterance(text);
   say.lang=lang;say.rate=rate??speechRate(lang);
   // Name the voice as well as the language: left to itself a phone will happily read
   // Japanese with an English voice.
   try{const voice=matchVoice(synth.getVoices(),lang);if(voice)say.voice=voice;}catch{}
   // Released exactly once however this ends — finished, failed, or never started — because
   // a hold that is never let go keeps the loop running for the rest of the day.
   let holding=true,began=false,nudge=null;
   const mine=()=>{if(holding){holding=false;releasePlayback();}};
   const done=()=>{
    if(letGo.current===mine)letGo.current=null;
    mine();clearInterval(nudge);setReading(now=>now===id?'':now);
   };
   // Whether a sound was ever made is the one fact the advice turns on, so it comes from the
   // engine saying it started rather than from a stopwatch — a short phrase is finished well
   // inside the deadline below, and calling that silence is how a phone that read something
   // out perfectly was told it had done nothing.
   say.onstart=()=>{began=true;};
   say.onend=done;
   say.onerror=e=>{done();if(isRealFailure(e?.error))setProblem(SILENCE_HELP[silenceAdvice({started:began,standalone:isStandalone()})]);};
   setReading(id);
   // Safari can leave the engine paused after a cancel, and then says nothing at all.
   try{synth.resume();}catch{}
   // Hold the page in the playback audio category for as long as the phone is talking. The
   // session is only honoured while something is really playing, so this is an inaudible loop
   // rather than a one-shot that is over before the speaking begins.
   letGo.current=mine;holdPlayback();
   nudge=setInterval(keepHolding,1000);
   // And speak once that loop is actually playing: play() is a promise, and a phrase begun
   // before it lands is a phrase begun while the page is still ambient — which is the
   // category the ring switch mutes.
   whenHolding(()=>{try{synth.speak(say);}catch{done();}});
   // If it never even starts, the phone is not going to explain why. We can.
   timer.current=setTimeout(()=>{
    if(began||synth.speaking||synth.pending)return;
    done();setProblem(SILENCE_HELP[silenceAdvice({started:false,standalone:isStandalone()})]);
   },2000);
   // And if it starts but never ends — which iOS does after a spell in the background — let
   // the session go anyway rather than looping indefinitely. Tracked, so that a guard left
   // over from an earlier reading cannot stop the button on the one happening now.
   guard.current=setTimeout(done,60000);
  };
  // Speaking straight after a cancel in the same breath is the classic way to get silence
  // out of Safari, so when something was already talking, let the engine settle first.
  if(busy)timer.current=setTimeout(start,150);else start();
 }
 return {supported,reading,read,problem,dismissProblem:()=>setProblem('')};
}
// `what` names the thing being read, for the screen reader; `rate` is for a listener who
// needs it slower than talking pace. Both default to the missions this started as.
export function ReadAloudButton({id,text,reading,read,what='mission',rate,className=''}){
 return <button type="button" className={`read-aloud${className?' '+className:''}`} aria-label={reading===id?'Stop reading':`Read this ${what} aloud`} onClick={()=>read(id,text,'en-AU',rate)}>{reading===id?<><Square size={15}/>Stop</>:<><Volume2 size={16}/>Read to me</>}</button>;
}
// The same thing for a page or a game, for somebody who cannot read the page it is on. Where
// ReadAloudButton reads a thing that is on the screen — a mission, a fact — this reads what
// the screen is FOR, and what it says is deliberately not the screen read back: the writing
// on the page is for whoever can read it, and spoken-rules.js is the same thing said to a
// five-year-old. Slower than the app reads anything else, because instructions heard once
// have to land the first time.
export function SpeakRules({id,text,label='How to play'}){
 const {supported,reading,read,problem}=useReadAloud();
 if(!supported||!text)return null;
 const going=reading===id;
 // A button that does nothing and says nothing is the complaint. Where the phone took the
 // words and made no sound, this says so here rather than leaving a child tapping it.
 return <><button type="button" className={`speak-rules${going?' going':''}`}
  aria-label={going?'Stop reading':`${label}, read aloud`} onClick={()=>read(id,text,'en-AU',0.8)}>
  {going?<><Square size={15}/> Stop</>:<><Volume2 size={17}/> {label}</>}</button>
  {problem&&<small className="hear-problem">{problem}</small>}</>;
}
export function Challenges({state,user,day,mutate,busy,initialId}){
 const {supported:canRead,reading,read,problem}=useReadAloud();
 const initial=state.challenges.find(c=>c.id===initialId);
 const [scope,setScope]=useState(initial&&!initial.day?'overall':'daily'),[date,setDate]=useState(initial?.day||day),[boy,setBoy]=useState(initial?.participants[0]||(BOYS.includes(user.name)?user.name:'Nate')),[edit,setEdit]=useState(null);
 const [showSkipped,setShowSkipped]=useState(false);
 const parent=user.role==='parent',mine=state.challenges.filter(c=>(scope==='daily'?c.day===date:c.day===null)&&c.participants.includes(boy));
 const skipped=mine.filter(c=>c.skips?.[boy]),list=mine.filter(c=>!c.skips?.[boy]),done=list.filter(c=>c.completions[boy]).length;
 const canChange=parent||user.name===boy;
 async function save(e){e.preventDefault();const f=new FormData(e.currentTarget);if(await mutate({type:edit?.id?'challengeEdit':'challengeAdd',id:edit?.id,title:f.get('title'),notes:f.get('notes'),day:f.get('day')||null,icon:f.get('icon')||'',participants:f.getAll('participants')}))setEdit(null);}
 return <><p className="eyebrow">CURIOUS MINDS, BIG ADVENTURES</p><h1>Japan explorers</h1><p>Daily missions and whole-trip quests. Try a stretch, work together, or leave a mission for another day. A parent can read the clues aloud.</p>{problem&&<p className="callout">{problem}</p>}<div className="segmented with-mascots">{BOYS.map(n=><button key={n} className={boy===n?'selected':''} onClick={()=>setBoy(n)}><MascotBadge state={state} person={n} size={26}/>{n} · {n==='Nate'?'5':'8'}</button>)}</div><div className="segmented"><button className={scope==='daily'?'selected':''} onClick={()=>setScope('daily')}>Daily missions</button><button className={scope==='overall'?'selected':''} onClick={()=>setScope('overall')}>Whole-trip quests</button></div>{scope==='daily'&&<label>Day<select value={date} onChange={e=>setDate(e.target.value)}>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.title}</option>)}</select></label>}<div className="quest-progress"><strong>{done} / {list.length} explored</strong><progress max={Math.max(list.length,1)} value={done}/><span>{done===list.length&&done>0?'All these missions completed!':'Collect discoveries at your own pace.'}{skipped.length>0&&` · ${skipped.length} skipped`}</span></div>
 <div className="feature-grid">{list.map(c=><article className={`feature-card quest ${c.completions[boy]?'finished':''}`} key={`${c.id}-${boy}`}><span className="eyebrow">{c.day?'DAILY MISSION':'TRIP QUEST'}{c.generated?' · NEW':''}</span><div className="quest-head">{c.icon&&<span className={`quest-icon${boy==='Nate'?' big':''}`} aria-hidden="true">{c.icon}</span>}<h2>{c.title}</h2></div>{c.diagram&&<MissionArt name={c.diagram} title={c.title}/>}<p>{c.notes}</p>{canRead&&<ReadAloudButton id={c.id} text={`${c.title}. ${c.notes}`} reading={reading} read={read}/>}{c.completions[boy]&&<small>Completed {dayLabel(japanDate(new Date(c.completions[boy])))} · {japanClock(new Date(c.completions[boy]))} JST</small>}<form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await mutate({type:'challengeStatus',id:c.id,person:boy,done:true,response:f.get('response')});}}><label>My discovery<textarea name="response" maxLength={2000} defaultValue={c.responses?.[boy]||''} placeholder="Tell a parent, type a note, or record your answer here" disabled={!parent&&user.name!==boy}/></label><div className="row wrap"><button className="primary" disabled={busy||(!parent&&user.name!==boy)}>{c.completions[boy]?'Save my discovery':'I did it!'}</button>{c.completions[boy]&&<button type="button" disabled={busy||!canChange} onClick={()=>mutate({type:'challengeStatus',id:c.id,person:boy,done:false})}>Undo</button>}{!c.completions[boy]&&<button type="button" disabled={busy||!canChange} onClick={()=>mutate({type:'challengeSkip',id:c.id,person:boy,done:true})}><SkipForward size={16}/>Not this one</button>}{parent&&<button type="button" onClick={()=>setEdit(c)}>Edit mission</button>}</div></form></article>)}</div>{!list.length&&<p>{skipped.length?'Every mission here has been skipped. Bring one back, or ask for a new one.':'No missions here yet. Ask for a new one, or add your own idea.'}</p>}
 {scope==='daily'&&canChange&&<button className="button new-mission" disabled={busy} onClick={()=>mutate({type:'challengeNew',day:date,person:boy})}><Sparkles size={18}/>Give me a different mission</button>}
 {skipped.length>0&&<details className="skipped-missions" open={showSkipped} onToggle={e=>setShowSkipped(e.currentTarget.open)}><summary>Skipped ({skipped.length})</summary>{skipped.map(c=><div className="list-row" key={c.id}><span>{c.icon&&<span aria-hidden="true">{c.icon} </span>}{c.title}<small>{c.notes}</small></span><button disabled={busy||!canChange} onClick={()=>mutate({type:'challengeSkip',id:c.id,person:boy,done:false})}><RotateCcw size={15}/>Bring it back</button></div>)}</details>}
 {parent&&<><button className="button" onClick={()=>setEdit({day:scope==='daily'?date:null,participants:[boy],title:'',notes:'',icon:''})}>Add a challenge</button>{edit&&<form className="feature-card" key={edit.id||'new'} onSubmit={save}><h2>{edit.id?'Edit challenge':'New challenge'}</h2><label>Title<input name="title" required maxLength={250} defaultValue={edit.title}/></label><label>Clues / stretch task<textarea name="notes" maxLength={2000} defaultValue={edit.notes}/></label><label>Picture (an emoji, optional)<input name="icon" maxLength={8} defaultValue={edit.icon||''} placeholder="🦌"/></label><label>When<select name="day" defaultValue={edit.day||''}><option value="">Whole-trip quest</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label><fieldset><legend>Explorers</legend>{BOYS.map(n=><label className="checkline" key={n}><input type="checkbox" name="participants" value={n} defaultChecked={edit.participants.includes(n)}/>{n}</label>)}</fieldset><div className="row wrap"><button className="primary" disabled={busy}>Save challenge</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button>{edit.id&&<button type="button" className="danger" onClick={async()=>{if(confirm('Remove this challenge and its progress?')&&await mutate({type:'challengeRemove',id:edit.id}))setEdit(null);}}>Remove</button>}</div></form>}</>}
 </>;
}
export function Shopping({state,user,day,mutate,busy,initialId}){
 const initial=state.shopping.find(s=>s.id===initialId);
 const [query,setQuery]=useState(initial?.title||''),[person,setPerson]=useState(''),[date,setDate]=useState(''),[status,setStatus]=useState(initial?'all':'needed'),[edit,setEdit]=useState(null);
 const parent=user.role==='parent',items=state.shopping.filter(s=>(!person||s.person===person)&&(!date||s.day===date)&&(status==='all'||(status==='bought'?!!s.boughtAt:!s.boughtAt))&&[s.title,s.store,s.notes].join(' ').toLowerCase().includes(query.toLowerCase()));
 async function save(e){e.preventDefault();const f=new FormData(e.currentTarget);if(await mutate({type:edit.id?'shoppingEdit':'shoppingAdd',id:edit.id,title:f.get('title'),person:f.get('person'),day:f.get('day')||null,quantity:Number(f.get('quantity')),budget:f.get('budget')===''?null:Number(f.get('budget')),store:f.get('store'),url:f.get('url'),notes:f.get('notes')}))setEdit(null);}
 return <><p className="eyebrow">GOOD FINDS, USEFUL THINGS</p><h1>Shopping list</h1><p>Souvenirs, gifts, snacks and things we need, with budgets, quantities and where to get them. For the small things you just need to remember, the To-do list is quicker.</p><button className="primary" onClick={()=>setEdit({person:user.name,day:null,quantity:1})}>Add an item</button><div className="document-filters"><label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Item, shop or note"/></label><div className="form-row"><label>For<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Everyone</option>{['Family',...state.members].map(n=><option key={n}>{n}</option>)}</select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="needed">Still needed</option><option value="bought">Bought</option><option value="all">Everything</option></select></label><label>Day<DaySelect state={state} value={date} onChange={e=>setDate(e.target.value)} allowAll/></label></div></div><p><strong>{items.length} items</strong> · listed budgets ¥{items.reduce((sum,s)=>sum+(s.budget||0),0).toLocaleString()} <small>≈ ${yenToAud(items.reduce((sum,s)=>sum+(s.budget||0),0),yenPerAud(state)).toFixed(2)} at $1 = ¥{Math.round(yenPerAud(state))}</small> <small>Budget is the total for each item, including its quantity.</small></p><div className="feature-grid">{items.map(s=><article className={`feature-card ${s.boughtAt?'finished':''}`} key={s.id}><div className="section-heading"><h2>{s.title}</h2><input aria-label={`Mark ${s.title} bought`} type="checkbox" checked={!!s.boughtAt} disabled={busy} onChange={e=>mutate({type:'shoppingStatus',id:s.id,done:e.target.checked})}/></div><p>{s.quantity} × · {s.person}{s.budget!==null&&` · Budget ¥${s.budget.toLocaleString()} (≈$${yenToAud(s.budget,yenPerAud(state)).toFixed(2)})`}</p><small>{s.day?dayLabel(s.day):'Any day'}</small><p>{s.store}</p><p>{s.notes}</p>{s.boughtAt&&<small>Bought by {s.boughtBy} · {japanClock(new Date(s.boughtAt))} JST</small>}<div className="row wrap">{s.store&&<a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.store+' Japan')}`}>Find shop</a>}{s.url&&<a href={s.url} target="_blank" rel="noreferrer">Website</a>}{parent&&<><button onClick={()=>setEdit(s)}>Edit</button><button className="danger" onClick={()=>{if(confirm('Remove this shopping item?'))mutate({type:'shoppingRemove',id:s.id});}}>Remove</button></>}</div></article>)}</div>{!items.length&&<div className="empty">Nothing on this list yet.</div>}
 {edit&&<form key={edit.id||'new'} className="feature-card" onSubmit={save}><h2>{edit.id?'Edit item':'Add to the list'}</h2><label>Item<input name="title" required maxLength={250} defaultValue={edit.title||''}/></label><div className="form-row"><label>For<select name="person" defaultValue={edit.person}>{['Family',...state.members].map(n=><option key={n}>{n}</option>)}</select></label><label>Quantity<input name="quantity" type="number" min="1" max="999" defaultValue={edit.quantity}/></label><label>Total budget (yen)<input name="budget" type="number" min="0" max="10000000" step="1" defaultValue={edit.budget??''}/></label></div><label>Day<select name="day" defaultValue={edit.day||''}><option value="">Any day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label><label>Shop / area<input name="store" maxLength={2000} defaultValue={edit.store||''}/></label><label>Website<input name="url" type="url" maxLength={2000} placeholder="https://…" defaultValue={edit.url||''}/></label><label>Notes<textarea name="notes" maxLength={2000} placeholder="Size, colour, who it is for, or where we saw it" defaultValue={edit.notes||''}/></label><div className="row"><button className="primary" disabled={busy}>Save item</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button></div></form>}
 </>;
}
