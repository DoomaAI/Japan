// The family leaderboard: who has tried the most foods, ridden the most rides, taken the most
// photos. Counted from the same ticks as the stamp book, so it can never disagree with it.
// A tie is a tie — two people on the same number share the place — and a nought is not a
// place at all, because coming last at something you have not started is not a result.
import {personCounts} from './stamp-data.js';
export function rankings(state){
 const people=state.members||[],counts=Object.fromEntries(people.map(p=>[p,personCounts(state,p)]));
 const ids=Object.keys(personCounts(state,people[0]||''));
 return ids.map(id=>{
  const {label,icon}=counts[people[0]]?.[id]||{};
  const rows=people.map(person=>({person,count:counts[person][id].count})).sort((a,b)=>b.count-a.count||a.person.localeCompare(b.person));
  let place=0,last=null;
  rows.forEach((r,i)=>{if(r.count!==last){place=i+1;last=r.count;}r.place=r.count>0?place:null;});
  return {id,label,icon,rows,leaders:rows.filter(r=>r.place===1).map(r=>r.person)};
 });
}
// Crowns: how many of the boards each person leads, the overall table.
export function crowns(state){
 const tally=Object.fromEntries((state.members||[]).map(p=>[p,0]));
 for(const board of rankings(state))for(const p of board.leaders)tally[p]++;
 return Object.entries(tally).map(([person,n])=>({person,crowns:n})).sort((a,b)=>b.crowns-a.crowns||a.person.localeCompare(b.person));
}
