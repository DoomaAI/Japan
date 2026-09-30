import React from 'react';
import {TrendingUp} from 'lucide-react';
import {runway} from './runway-data.js';
import {japanDate} from './timing.js';
// One line about what happens next with the money, on the Yen page and above the ledger.
export default function Runway({state,user}){
 if(user?.role!=='parent')return null;
 const r=runway(state,japanDate());
 if(!r)return null;
 return <section className={`runway is-${r.tone}`} aria-label="Runway">
  <p className="eyebrow"><TrendingUp size={13}/> Runway</p>
  <strong>{r.text}</strong>
  <small>About ¥{r.pace.toLocaleString('en')} a day over the last {r.paceDays===1?'day':`${r.paceDays} days`}{r.budget?`, against ¥${r.budget.toLocaleString('en')} a day`:''} · {r.daysLeft} day{r.daysLeft===1?'':'s'} to go{r.category?` · mostly ${r.category.emoji} ${r.category.label.toLowerCase()}, ${r.category.share}%`:''}</small>
 </section>;
}
