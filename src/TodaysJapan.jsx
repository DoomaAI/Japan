import React from 'react';
import {ChevronDown,ChevronRight} from 'lucide-react';
import {useStored} from './stored.js';
import {phraseForDay} from './phrasebook-data.js';
// The phrase and the fun fact of the day, as a widget of their own under the day in brief rather
// than as two rows at the foot of it. It folds to one line, and the fold is kept on the phone;
// folded, it still says how many are new, so nothing waiting is hidden. phrase and fact are null
// when switched off or not today; another day still shows its phrase, opening the phrasebook.
export default function TodaysJapan({state,day,phrase=null,fact=null,go}){
 const [open,setOpen]=useStored('japan.home.todaysjapan.open',true);
 // The row names what tapping it opens: the head of this person's own queue, not the day's default.
 const said=phrase?.item||(state?phraseForDay(state.days,day):null);
 if(!said&&!fact)return null;
 const fresh=(said&&phrase?.fresh?1:0)+(fact?.fresh?1:0);
 return <details className="todays-japan" open={open} onToggle={e=>setOpen(e.currentTarget.open)} aria-label="Phrase and fun fact of the day">
  <summary><span className="eyebrow">Phrase &amp; fun fact of the day</span>{fresh>0&&<em className="briefing-new">{fresh} new</em>}<ChevronDown size={18} className="todays-japan-fold" aria-hidden="true"/></summary>
  {said&&<button type="button" className="todays-japan-row" onClick={phrase?phrase.open:()=>go('phrases')}><span aria-hidden="true">{said.icon}</span><span><b>{said.en} · <span lang="ja">{said.ja}</span></b><small>{phrase?.fresh&&<em className="briefing-new">New</em>}Say “{said.say}”</small></span><ChevronRight size={16}/></button>}
  {fact&&<button type="button" className="todays-japan-row" onClick={fact.open}><span aria-hidden="true">{fact.icon}</span><span><b>{fact.title}</b><small>{fact.fresh&&<em className="briefing-new">New</em>}Fun fact · tap to read</small></span><ChevronRight size={16}/></button>}
 </details>;
}
