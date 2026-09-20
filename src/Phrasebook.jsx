import React,{useState} from 'react';
import {MessageSquare,Search} from 'lucide-react';
import {PHRASEBOOK,ALL_PHRASES} from './phrasebook-data.js';
import {MENU_WORDS,SAY_TIP} from './food-data.js';
import {searchText} from './trip-features.js';
import SayIt from './SayIt.jsx';
export function PhraseRow({phrase,size='small'}){
 return <article className="phrase-row">
  <strong>{phrase.en}</strong>
  <SayIt phrase={{...phrase,en:''}} size={size}/>
  {phrase.note&&<small className="phrase-note">{phrase.note}</small>}
 </article>;
}
export default function Phrasebook(){
 const [query,setQuery]=useState(''),[section,setSection]=useState('');
 const q=searchText(query);
 const matches=p=>!q||searchText([p.en,p.ja,p.romaji,p.say,p.note].join(' ')).includes(q);
 const sections=PHRASEBOOK.filter(s=>!section||s.id===section)
  .map(s=>({...s,phrases:s.phrases.filter(matches)})).filter(s=>s.phrases.length);
 // The menu words are their own section, so a section filter puts them away too.
 const words=section?[]:MENU_WORDS.filter(w=>!q||searchText([w.en,w.ja,w.romaji,w.say].join(' ')).includes(q));
 return <>
  <p>{SAY_TIP} Tap <strong>Hear it</strong> where your phone has a Japanese voice, or hold the screen up and let someone read the Japanese.</p>
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
export function PhraseOfDay({phrase,day,dayLabel,busy,dismiss}){
 return <div className="phrase-of-day">
  <p className="eyebrow"><MessageSquare size={14}/> TODAY’S PHRASE · {dayLabel}</p>
  <strong className="phrase-en">{phrase.en}</strong>
  <SayIt phrase={{...phrase,en:''}}/>
  {phrase.note&&<p className="callout">{phrase.note}</p>}
  <button className="primary" disabled={busy} onClick={dismiss}>Got it</button>
  <p><small>One new phrase each day. All of them live under More → Phrases.</small></p>
 </div>;
}
