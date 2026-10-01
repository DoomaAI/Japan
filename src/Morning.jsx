import React,{useState} from 'react';
import {Check,Flame,RotateCcw} from 'lucide-react';
import {morningList,readTicks,writeTicks,readStreak,writeStreak,nextStreak,streakWords} from './morning-data.js';
// The Before we head out widget: one tap per thing to carry, reset each morning by itself, and
// a streak for finishing. It is only about today; other days have no morning to get ready for.
export default function MorningChecklist({state,day,today}){
 const [ticks,setTicks]=useState(()=>readTicks(day)),[streak,setStreak]=useState(readStreak);
 if(day!==today)return null;
 const items=morningList(state,day),done=items.filter(i=>ticks.includes(i.id)).length,complete=items.length>0&&done===items.length;
 const toggle=id=>{
  const next=ticks.includes(id)?ticks.filter(x=>x!==id):[...ticks,id];
  setTicks(next);writeTicks(day,next);
  if(items.every(i=>next.includes(i.id))){const s=nextStreak(streak,day,state.days);setStreak(s);writeStreak(s);}
 };
 const reset=()=>{setTicks([]);writeTicks(day,[]);};
 const streakLine=streak.count>0&&(complete||streak.last!==day)?streakWords(streak.count,streak.forgiven&&streak.last===day?streak.forgiven:null):'';
 return <section className={`morning${complete?' complete':''}`}>
  <div className="morning-head">
   <div><h2 className="eyebrow">Before we head out</h2><strong>{complete?'Out the door.':`${done} of ${items.length} in the bag`}</strong></div>
   {streakLine&&<span className="morning-streak"><Flame size={15}/>{streakLine}</span>}
  </div>
  {!complete&&<div className="chips morning-chips">{items.map(i=><button type="button" key={i.id} className={`chip${ticks.includes(i.id)?' on':''}`} aria-pressed={ticks.includes(i.id)} title={i.why||''} onClick={()=>toggle(i.id)}>{ticks.includes(i.id)?<Check size={14}/>:<span aria-hidden="true">{i.emoji}</span>}{i.label}</button>)}</div>}
  {!complete&&items.some(i=>i.why&&!['passports','ic'].includes(i.id))&&<p className="morning-why">{items.filter(i=>i.why&&!['passports','ic'].includes(i.id)).map(i=>`${i.emoji} ${i.why}`).join(' ')}</p>}
  {complete&&<button type="button" className="linkish" onClick={reset}><RotateCcw size={13}/> Check again</button>}
 </section>;
}
