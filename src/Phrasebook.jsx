import React,{useState,useRef,useEffect} from 'react';
import {MessageSquare,Search,ArrowLeft,ArrowRight,Sparkles,Check,Languages,Trash2,Layers,List} from 'lucide-react';
import {PHRASEBOOK,ALL_PHRASES} from './phrasebook-data.js';
import {japanDate} from './timing.js';
import {dayLabel,SILENT_HINT} from './AdventurePages.jsx';
import {MENU_WORDS,SAY_TIP} from './food-data.js';
import {searchText,phraseLogFor,phrasesSeenBy,phraseQueue,ourPhrases} from './trip-features.js';
import {swipeDelta,isControl,typesText,stepIndex} from './swipe.js';
import SayIt from './SayIt.jsx';
import SoundCheck from './SoundCheck.jsx';
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
// A phrase the family wanted and the book did not have. The translation is a starting point
// you can edit, not an answer you have to accept — and it can be typed in without one.
function OurPhrases({state,user,mutate,busy,request,notice,config,q}){
 const [english,setEnglish]=useState(''),[draft,setDraft]=useState(null),[asking,setAsking]=useState(false),[editing,setEditing]=useState(null);
 const parent=user.role==='parent';
 // Searching the page searches ours too, rather than leaving them sitting above the results.
 const mine=ourPhrases(state).filter(p=>!q||searchText([p.en,p.ja,p.romaji,p.say,p.note].join(' ')).includes(q));
 async function ask(){
  if(!english.trim())return;
  setAsking(true);
  try{
   const r=await request('translate',{english:english.trim()});
   setDraft({en:english.trim(),ja:r.ja,romaji:r.romaji,say:r.say,note:r.note||'',literal:r.literal||'',source:'translated'});
  }catch(e){notice(e.message||'The translation did not come back. You can type the Japanese in yourself.');
   setDraft(d=>d||{en:english.trim(),ja:'',romaji:'',say:'',note:'',literal:'',source:'typed'});}
  finally{setAsking(false);}
 }
 async function save(e){
  e.preventDefault();
  const f=new FormData(e.currentTarget),values=Object.fromEntries(['en','ja','romaji','say','note'].map(k=>[k,f.get(k)]));
  if(await mutate({type:editing?'phraseEdit':'phraseAdd',id:editing?.id,...values,source:draft?.source})){
   setDraft(null);setEditing(null);setEnglish('');
  }
 }
 const form=editing||draft;
 return <section className="our-phrases">
  <h2>Our own phrases{q&&mine.length?` · ${mine.length} match`:''}</h2>
  {parent
   ?<><p>Something you need to say that is not in the book? Ask for it, check it, keep it.</p>
    <div className="form-row">
     <label>In English<input value={english} maxLength={200} onChange={e=>setEnglish(e.target.value)} placeholder="Could we sit away from the window?"/></label>
    </div>
    <div className="row wrap">
     <button type="button" className="primary" disabled={asking||busy||!english.trim()||!config?.translator} onClick={ask}>
      <Languages size={16}/> {asking?'Asking…':'Put it into Japanese'}</button>
     <button type="button" disabled={busy||!english.trim()} onClick={()=>setDraft({en:english.trim(),ja:'',romaji:'',say:'',note:'',literal:'',source:'typed'})}>Type it myself</button>
    </div>
    {!config?.translator&&<p className="callout">Translation needs an Anthropic API key on the deployment. You can still type a phrase in yourself.</p>}
    {form&&<form key={form.id||form.en} onSubmit={save} className="phrase-draft">
     {form.literal&&<p className="callout">This says, literally: <strong>{form.literal}</strong></p>}
     <label>English<input name="en" defaultValue={form.en} required maxLength={200}/></label>
     <label>Japanese<input name="ja" defaultValue={form.ja} required maxLength={200} lang="ja" placeholder="窓から離れた席はありますか？"/></label>
     <div className="form-row">
      <label>Romaji<input name="romaji" defaultValue={form.romaji} maxLength={200}/></label>
      <label>Say it<input name="say" defaultValue={form.say} maxLength={200} placeholder="ma-do ka-ra ha-na-reh-ta..."/></label>
     </div>
     <label>Note<input name="note" defaultValue={form.note} maxLength={500}/></label>
     <p><small>Check it before you keep it. A translation can be wrong, or right but strange to say.</small></p>
     <div className="row wrap">
      <button className="primary" disabled={busy}>{editing?'Save changes':'Keep this phrase'}</button>
      <button type="button" disabled={busy} onClick={()=>{setDraft(null);setEditing(null);}}>Cancel</button>
     </div>
    </form>}</>
   :<p>{mine.length?'Phrases Mum and Dad added for us.':'Nothing added yet.'}</p>}
  {mine.map(p=><div className="our-phrase" key={p.id}>
   <PhraseRow phrase={p} size=""/>
   <small>Added by {p.by}{p.source==='translated'?' · translated':''}</small>
   {parent&&<div className="row wrap">
    <button type="button" onClick={()=>{setEditing(p);setDraft(null);}}>Edit</button>
    <button type="button" className="danger" disabled={busy} onClick={()=>{if(confirm('Remove this phrase?'))mutate({type:'phraseRemove',id:p.id});}}><Trash2 size={14}/> Remove</button>
   </div>}
  </div>)}
 </section>;
}
// One phrase at a time, turned with a finger. The long list is still there and still the way
// to look something up — this is the way to go through them, which is a different job, and on
// a phone in a queue it is the better one.
function PhraseDeck({phrases,onList}){
 const [index,setIndex]=useState(0);
 const touch=useRef(null);
 const at=Math.min(index,Math.max(0,phrases.length-1));
 const phrase=phrases[at];
 // A new search is a new deck, so it starts at the top rather than somewhere in the middle
 // of results that no longer exist.
 useEffect(()=>{setIndex(0);},[phrases.length,phrases[0]?.id]);
 const move=delta=>setIndex(i=>stepIndex(Math.min(i,phrases.length-1),delta,phrases.length));
 useEffect(()=>{
  const onKey=e=>{
   if(typesText(e.target))return;
   if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1);
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[phrases.length]);
 if(!phrase)return null;
 return <section className="phrase-deck"
  onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
  onTouchEnd={e=>{
   const start=touch.current;touch.current=null;
   if(!start||isControl(e.target?.tagName))return;
   const delta=swipeDelta(start,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});
   if(delta)move(delta);
  }}>
  <div className="phrase-card" key={phrase.id}>
   <p className="eyebrow">{phrase.section||'Phrase'} · {at+1} of {phrases.length}</p>
   <strong className="phrase-en">{phrase.en}</strong>
   <SayIt phrase={{...phrase,en:''}}/>
   {phrase.note&&<p className="callout">{phrase.note}</p>}
  </div>
  <div className="swipe-controls">
   <button type="button" disabled={at<=0} onClick={()=>move(-1)}><ArrowLeft size={16}/> Back</button>
   <span>Swipe the card</span>
   <button type="button" disabled={at>=phrases.length-1} onClick={()=>move(1)}>Next <ArrowRight size={16}/></button>
  </div>
  <button type="button" className="phrase-mode" onClick={onList}><List size={15}/> See them all as a list</button>
 </section>;
}
export default function Phrasebook({state,user,day,mutate,busy,request,notice,config}){
 const [query,setQuery]=useState(''),[section,setSection]=useState('');
 // Which way you like to go through them is a preference, so the phone remembers it. The
 // list stays the default: it is what search and the section filter are for.
 const [mode,setMode]=useState(()=>{try{return localStorage.getItem('japan.phrasemode')||'list';}catch{return 'list';}});
 const choose=next=>{setMode(next);try{localStorage.setItem('japan.phrasemode',next);}catch{}};
 const q=searchText(query);
 const matches=p=>!q||searchText([p.en,p.ja,p.romaji,p.say,p.note].join(' ')).includes(q);
 const sections=PHRASEBOOK.filter(s=>!section||s.id===section)
  .map(s=>({...s,phrases:s.phrases.filter(matches)})).filter(s=>s.phrases.length);
 // The menu words are their own section, so a section filter puts them away too.
 const words=section?[]:MENU_WORDS.filter(w=>!q||searchText([w.en,w.ja,w.romaji,w.say].join(' ')).includes(q));
 // The same phrases the list is showing, flattened into one deck and carrying the section
 // they came from, so swiping and reading show exactly the same set.
 const deck=[
  ...sections.flatMap(s=>s.phrases.map(p=>({...p,section:s.title}))),
  ...(section?[]:ourPhrases(state||{}).filter(p=>!q||searchText([p.en,p.ja,p.romaji,p.say,p.note].join(' ')).includes(q))
   .map(p=>({...p,section:'Ours'})))
 ];
 return <>
  <p>{SAY_TIP} Tap <strong>Hear it</strong> where your phone has a Japanese voice, <strong>Slowly</strong> to take it a chunk at a time, or hold the screen up and let someone read the Japanese. {SILENT_HINT}</p>
  <SoundCheck/>
  {state&&user&&<MyPhrases state={state} user={user} day={day} mutate={mutate} busy={busy}/>}
  {state&&user&&<OurPhrases state={state} user={user} mutate={mutate} busy={busy} request={request} notice={notice} config={config} q={q}/>}
  <div className="segmented game-picker phrase-modes">
   <button className={mode==='list'?'selected':''} onClick={()=>choose('list')}><List size={15}/> As a list</button>
   <button className={mode==='swipe'?'selected':''} onClick={()=>choose('swipe')}><Layers size={15}/> One at a time</button>
  </div>
  <div className="document-filters">
   <label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="English, Japanese or how it sounds"/></label>
   <label>Section<select value={section} onChange={e=>setSection(e.target.value)}><option value="">Everything</option>{PHRASEBOOK.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
  </div>
  {mode==='swipe'
   ?<PhraseDeck phrases={deck} onList={()=>choose('list')}/>
   :sections.map(s=><section className="phrase-section" key={s.id}>
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
