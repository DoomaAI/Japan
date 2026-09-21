import React,{useState,useRef,useEffect} from 'react';
import {MessageSquare,Search,ArrowLeft,ArrowRight,Sparkles,Check} from 'lucide-react';
import {PHRASEBOOK,ALL_PHRASES} from './phrasebook-data.js';
import {japanDate} from './timing.js';
import {dayLabel} from './AdventurePages.jsx';
import {MENU_WORDS,SAY_TIP} from './food-data.js';
import {searchText,phraseLogFor,phrasesSeenBy,phraseQueue} from './trip-features.js';
import SayIt from './SayIt.jsx';
export function PhraseRow({phrase,size='small'}){
 return <article className="phrase-row">
  <strong>{phrase.en}</strong>
  <SayIt phrase={{...phrase,en:''}} size={size}/>
  {phrase.note&&<small className="phrase-note">{phrase.note}</small>}
 </article>;
}
// The phrases this person has already been shown, and a way to be shown one more.
function MyPhrases({state,user,day,mutate,busy}){
 const [extra,setExtra]=useState(null),[open,setOpen]=useState(false);
 const log=phraseLogFor(state,user.name),total=ALL_PHRASES().length;
 const queue=phraseQueue(state,user.name,day).filter(p=>!phrasesSeenBy(state,user.name)[p.id]);
 async function another(){
  const pick=queue[0];if(!pick)return;
  setExtra(pick);await mutate({type:'phraseSeen',person:user.name,phraseIds:[pick.id]});
 }
 const when=at=>{const d=new Date(at);return Number.isFinite(d.getTime())?dayLabel(japanDate(d)):'';};
 return <section className="my-phrases">
  <h2>Phrases you have seen</h2>
  <p>{log.length} of {total}{log.length<total?` · ${total-log.length} still to meet`:' · the whole book'}</p>
  {extra&&<div className="phrase-extra"><p className="eyebrow">ONE MORE</p><PhraseRow phrase={extra} size=""/></div>}
  <div className="row wrap">
   <button className="primary" disabled={busy||!queue.length} onClick={another}><Sparkles size={16}/> {extra?'And another':'Show me another'}</button>
   {!queue.length&&<span><Check size={15}/> You have seen every phrase.</span>}
  </div>
  {!!log.length&&<details open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
   <summary>My log ({log.length})</summary>
   {log.map(p=><div className="list-row" key={p.id}><span>{p.en}<small lang="ja">{p.ja} · {p.say}</small></span><small>{when(p.at)}</small></div>)}
  </details>}
 </section>;
}
export default function Phrasebook({state,user,day,mutate,busy}){
 const [query,setQuery]=useState(''),[section,setSection]=useState('');
 const q=searchText(query);
 const matches=p=>!q||searchText([p.en,p.ja,p.romaji,p.say,p.note].join(' ')).includes(q);
 const sections=PHRASEBOOK.filter(s=>!section||s.id===section)
  .map(s=>({...s,phrases:s.phrases.filter(matches)})).filter(s=>s.phrases.length);
 // The menu words are their own section, so a section filter puts them away too.
 const words=section?[]:MENU_WORDS.filter(w=>!q||searchText([w.en,w.ja,w.romaji,w.say].join(' ')).includes(q));
 return <>
  <p>{SAY_TIP} Tap <strong>Hear it</strong> where your phone has a Japanese voice, or hold the screen up and let someone read the Japanese.</p>
  {state&&user&&<MyPhrases state={state} user={user} day={day} mutate={mutate} busy={busy}/>}
  <div className="document-filters">
   <label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="English, Japanese or how it sounds"/></label>
   <label>Section<select value={section} onChange={e=>setSection(e.target.value)}><option value="">Everything</option>{PHRASEBOOK.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
  </div>
  {sections.map(s=><section className="phrase-section" key={s.id}>
   <h2>{s.title}</h2>{s.note&&<p>{s.note}</p>}
   {s.phrases.map(p=><PhraseRow key={p.id} phrase={p}/>)}
  </section>)}
  {!sections.length&&!words.length&&<div className="empty"><p>Nothing matches “{query}”.</p></div>}
  {!!words.length&&<section className="phrase-section">
   <h2>Words on a menu or a sign</h2>
   <p>Not phrases — just the words that tell you what something is.</p>
   <div className="menu-words">{words.map(w=><div className="menu-word" key={w.id}>
    <span className="japanese" lang="ja">{w.ja}</span><strong>{w.en}</strong><small>{w.say}</small>
   </div>)}</div>
  </section>}
  <p><small>{ALL_PHRASES().length} phrases. Written the way they are usually said to a stranger — polite, and safe to use with anyone.</small></p>
 </>;
}
// The day's phrase, and as many more as anyone wants to swipe through. Everything actually
// put on screen is handed back when it closes, so the log records what was really seen.
export function PhraseOfDay({queue,day,dateLabel,busy,dismiss}){
 const [index,setIndex]=useState(0),touch=useRef(null),seen=useRef(new Set());
 const phrase=queue[index]||queue[0];
 const move=delta=>setIndex(i=>Math.min(queue.length-1,Math.max(0,i+delta)));
 useEffect(()=>{seen.current.add(phrase.id);},[phrase.id]);
 useEffect(()=>{
  const onKey=e=>{if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1);};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[queue.length]);
 return <div className="phrase-of-day"
  onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
  onTouchEnd={e=>{
   if(!touch.current||['BUTTON','A'].includes(e.target.tagName))return;
   const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;
   if(Math.abs(dx)>65&&Math.abs(dy)<50)move(dx<0?1:-1);
   touch.current=null;
  }}>
  <p className="eyebrow"><MessageSquare size={14}/> {index?`ONE MORE · ${index+1} OF ${queue.length}`:`TODAY’S PHRASE · ${dateLabel}`}</p>
  <strong className="phrase-en">{phrase.en}</strong>
  <SayIt phrase={{...phrase,en:''}}/>
  {phrase.note&&<p className="callout">{phrase.note}</p>}
  {queue.length>1&&<div className="swipe-controls">
   <button type="button" disabled={index<=0} onClick={()=>move(-1)}><ArrowLeft size={16}/> Back</button>
   <span>Swipe for more</span>
   <button type="button" disabled={index>=queue.length-1} onClick={()=>move(1)}>One more <ArrowRight size={16}/></button>
  </div>}
  <button className="primary" disabled={busy} onClick={()=>dismiss([...seen.current])}>Got it</button>
  <p><small>One new phrase each day, and as many more as you like. Everything you see is kept under More → Phrases.</small></p>
 </div>;
}
