// Runway, the way Up and Monzo say it: not a table of what was spent but one line about what
// happens next — at this pace the budget lasts until Saturday, and most of it is going on 🍜.
// Everything in it is already in the ledger and the travel party; this only does the division.
import {expenseSummary,EXPENSE_CATEGORIES} from './trip-features.js';
export const CATEGORY_EMOJI={food:'🍜',transport:'🚃',activities:'🎟️',shopping:'🛍️',stay:'🏨',other:'📦'};
export const PACE_DAYS=3;
const weekday=d=>new Intl.DateTimeFormat('en-AU',{weekday:'long',timeZone:'Asia/Tokyo'}).format(new Date(d+'T12:00:00+09:00'));
// The pace: the average of the last three days before today that had anything on them, or the
// whole trip's average until there are three.
export function spendPace(state,today){
 const byDay={};for(const e of state.expenses||[])if(e.day&&e.day<today&&Number.isFinite(e.yen))byDay[e.day]=(byDay[e.day]||0)+e.yen;
 const days=Object.keys(byDay).sort().slice(-PACE_DAYS);
 if(!days.length)return null;
 return {yenPerDay:Math.round(days.reduce((a,d)=>a+byDay[d],0)/days.length),days:days.length};
}
export function biggestCategory(state,today){
 const since=Object.keys((state.expenses||[]).reduce((o,e)=>{if(e.day&&e.day<today)o[e.day]=1;return o;},{})).sort().slice(-PACE_DAYS);
 const totals={};for(const e of state.expenses||[])if(since.includes(e.day)&&Number.isFinite(e.yen))totals[e.category]=(totals[e.category]||0)+e.yen;
 const [id,yen]=Object.entries(totals).sort((a,b)=>b[1]-a[1])[0]||[];
 if(!id)return null;
 const all=Object.values(totals).reduce((a,b)=>a+b,0);
 return {id,yen,share:Math.round(yen/all*100),emoji:CATEGORY_EMOJI[id]||'📦',label:EXPENSE_CATEGORIES.find(([k])=>k===id)?.[1]||id};
}
// The line. With a budget: whether it lasts, and if not, which day it runs out. Without one:
// what the rest of the trip comes to at this pace.
export function runway(state,today){
 const days=(state.days||[]).map(d=>d.date),left=days.filter(d=>d>=today);
 const pace=spendPace(state,today);
 if(!pace||!left.length)return null;
 const budget=expenseSummary(state).budget||null,rest=pace.yenPerDay*left.length,category=biggestCategory(state,today);
 const spentToday=expenseSummary(state,{day:today}).total;
 let text,tone='calm',runsOut=null;
 if(!budget)text=`At this pace (about ¥${pace.yenPerDay.toLocaleString('en')} a day) the rest of the trip comes to about ¥${rest.toLocaleString('en')}.`;
 else{
  const allowance=budget*left.length-spentToday,spare=allowance-rest;
  if(pace.yenPerDay<=budget){text=`At this pace the budget lasts to the end, with about ¥${Math.max(0,spare).toLocaleString('en')} to spare.`;}
  else{
   const daysOfMoney=Math.floor(allowance/pace.yenPerDay);
   runsOut=left[Math.min(left.length-1,Math.max(0,daysOfMoney))];
   const short=daysOfMoney<left.length;
   tone=short?'warm':'calm';
   text=short?`At this pace the budget runs out on ${weekday(runsOut)}, ${left.length-daysOfMoney} day${left.length-daysOfMoney===1?'':'s'} before we fly home.`:`At this pace the budget just lasts.`;
  }
 }
 return {text,tone,pace:pace.yenPerDay,paceDays:pace.days,daysLeft:left.length,budget,runsOut,category};
}
