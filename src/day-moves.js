// Rearranging the plan by more than one stop at a time: whole days swapped or put in a new order,
// or a handful of stops picked off one day and moved to another (or traded for some of its stops).
//
// A day's dates and its hotel do not move: the hotel is where we sleep that night whatever we do in
// the daytime. What moves is the day itself — its name, its city, its guide pages and its stops.
// A stop with a locked time is a booking for that date, so by default it stays where it is and the
// rest of the day moves around it; it moves only when the parent says so.
//
// A day that has begun (a stop done or under way) stays put, and so does any stop that is done or
// under way: what happened on a date happened on that date.
//
// Every function here is pure apart from the state it is handed, and reports a problem through
// `fail`, so the server and the preview in the app answer the same way.

export const DAY_FIELDS=['title','city','pages'];
const begun=s=>s.status==='done'||s.status==='started';
export const dayBegun=(state,date)=>state.steps.some(s=>s.day===date&&begun(s));
const minutes=t=>t?Number(t.slice(0,2))*60+Number(t.slice(3,5)):null;

// The stops picked, with every alternative of an option group they belong to on the same day:
// moving one plan of a pair and leaving the other behind would split a choice across two days.
export function withGroupMates(state,ids){
 const picked=state.steps.filter(s=>ids.includes(s.id));
 const groups=new Set(picked.filter(s=>s.group).map(s=>`${s.day}|${s.group}`));
 return state.steps.filter(s=>ids.includes(s.id)||(s.group&&groups.has(`${s.day}|${s.group}`)));
}

// Puts stops onto a date among the stops already there. The stops arriving keep their own order
// (a day moved whole is the same day, however it had been arranged); each one with a target time
// goes in before the first stop already there that is due later, and the day is numbered afresh.
export function placeOnDay(state,date,incoming){
 const coming=new Set(incoming.map(s=>s.id));
 const list=state.steps.filter(s=>s.day===date&&!coming.has(s.id)).sort((a,b)=>a.order-b.order);
 let last=-1;
 for(const s of [...incoming].sort((a,b)=>a.order-b.order)){
  const t=minutes(s.time);
  const later=t===null?-1:list.findIndex(x=>!coming.has(x.id)&&x.time&&minutes(x.time)>t);
  const at=Math.max(last+1,later<0?list.length:later);
  list.splice(at,0,s);last=at;
 }
 for(const s of incoming)s.day=date;
 list.forEach((s,i)=>{s.order=(i+1)*10;});
}

// Where every stop on some days was, so an undo can put each one back on its day in its exact place
// rather than slotting it in again by time.
export const positionsOn=(state,dates)=>state.steps.filter(s=>dates.includes(s.day)).map(s=>({id:s.id,day:s.day,order:s.order}));
export function restorePositions(state,positions,dates,fail){
 if(positions===undefined)return;
 if(!Array.isArray(positions)||positions.length>2000)fail('The plan changed. Reload before undoing.');
 for(const p of positions){
  const s=state.steps.find(x=>x.id===p?.id);
  if(!s||!dates.includes(p.day)||!dates.includes(s.day)||!Number.isFinite(p.order)||Math.abs(p.order)>100000)fail('The plan changed. Reload before undoing.');
 }
 for(const p of positions)Object.assign(state.steps.find(x=>x.id===p.id),{day:p.day,order:p.order});
}

// Days in a new order: `order` lists every trip date, and the day now on order[i] moves to the i-th
// date. A swap is the same thing with two dates traded.
export function orderDays(state,order,{moveLocked=false,positions}={},fail){
 const dates=state.days.map(d=>d.date);
 if(!Array.isArray(order)||order.length!==dates.length||new Set(order).size!==dates.length||order.some(d=>!dates.includes(d)))fail('The trip days changed. Reload before rearranging them.');
 const moves=dates.map((to,i)=>({from:order[i],to})).filter(m=>m.from!==m.to);
 if(!moves.length)fail('Choose a different order for at least one day.');
 const started=[...new Set(moves.flatMap(m=>[m.from,m.to]))].filter(d=>dayBegun(state,d));
 if(started.length)fail(`${started.join(', ')} ${started.length===1?'has':'have'} already begun, so ${started.length===1?'it stays':'they stay'} where ${started.length===1?'it is':'they are'}.`);
 const content=new Map(state.days.map(d=>[d.date,Object.fromEntries(DAY_FIELDS.map(k=>[k,structuredClone(d[k])]))]));
 const travelling=new Map(moves.map(m=>[m.from,state.steps.filter(s=>s.day===m.from&&(moveLocked||!s.locked))]));
 for(const m of moves)Object.assign(state.days.find(d=>d.date===m.to),content.get(m.from));
 // Every travelling stop leaves its date before any arrives, so a stop never lands among the stops
 // it is about to be swapped with.
 for(const list of travelling.values())for(const s of list)s.day=null;
 for(const m of moves)placeOnDay(state,m.to,travelling.get(m.from));
 restorePositions(state,positions,moves.map(m=>m.to),fail);
 return moves;
}

// Stops picked from one day go to another; with `swapIds`, stops picked there come back the other way.
export function moveSteps(state,{ids,to,swapIds=[],moveLocked=false,positions},fail){
 if(!Array.isArray(ids)||!ids.length||!Array.isArray(swapIds)||ids.length+swapIds.length>200)fail('Choose the stops to move.');
 if(!state.days.some(d=>d.date===to))fail('Choose a trip day to move them to.');
 const going=withGroupMates(state,ids),coming=withGroupMates(state,swapIds);
 if(going.length<new Set(ids).size||coming.length<new Set(swapIds).size)fail('A stop you picked is no longer on the plan. Reload and pick again.');
 const from=[...new Set(going.map(s=>s.day))];
 if(from.length!==1||from[0]===null)fail('Pick stops from one day at a time.');
 if(from[0]===to)fail('Choose a different day to move them to.');
 if(coming.some(s=>s.day!==to))fail('Stops to swap back must be on the day you are moving to.');
 const all=[...going,...coming];
 const done=all.filter(begun);
 if(done.length)fail(`${done.map(s=>s.title).join(', ')} ${done.length===1?'is':'are'} done or under way, so ${done.length===1?'it stays':'they stay'} on ${done.length===1?'its':'their'} day.`);
 const locked=all.filter(s=>s.locked);
 if(locked.length&&!moveLocked)fail(`${locked.map(s=>s.title).join(', ')} ${locked.length===1?'has a booked time':'have booked times'}. Tick “Move booked stops too” or leave ${locked.length===1?'it':'them'} out.`);
 for(const s of all)s.day=null;
 placeOnDay(state,to,going);
 if(coming.length)placeOnDay(state,from[0],coming);
 restorePositions(state,positions,[from[0],to],fail);
 return {from:from[0],to,going,coming};
}

// The order that puts a rearrangement back: what moved to each date goes back to where it came from.
export const undoOrder=(dates,order)=>dates.map(d=>dates[order.indexOf(d)]);
