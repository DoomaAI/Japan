import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyOperation} from '../server/model.mjs';
import {undoOrder,positionsOn} from '../src/day-moves.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};
const dates=seed.days.map(d=>d.date);
const on=(state,d)=>state.steps.filter(s=>s.day===d);
const swap=(a,b)=>dates.map(d=>d===a?b:d===b?a:d);

test('swapping two days moves their names, cities, pages and unbooked stops; dates and hotels stay',()=>{
 const [a,b]=['2026-09-26','2026-09-28'];
 const A=seed.days.find(d=>d.date===a),B=seed.days.find(d=>d.date===b);
 const next=applyOperation(seed,{type:'orderDays',order:swap(a,b)},parent);
 const nA=next.days.find(d=>d.date===a),nB=next.days.find(d=>d.date===b);
 assert.equal(nA.title,B.title);assert.equal(nA.city,B.city);assert.deepEqual(nA.pages,B.pages);assert.equal(nA.hotel,A.hotel);
 assert.equal(nB.title,A.title);
 assert.deepEqual(new Set(on(next,a).map(s=>s.id)),new Set(on(seed,b).map(s=>s.id)));
 assert.deepEqual(new Set(on(next,b).map(s=>s.id)),new Set(on(seed,a).map(s=>s.id)));
 for(const s of next.steps){const was=seed.steps.find(x=>x.id===s.id);assert.equal(s.time,was.time);}
 assert.match(next.alerts[0].summary,/Days rearranged/);
 assert.throws(()=>applyOperation(seed,{type:'orderDays',order:swap(a,b)},child),e=>e.status===403);
});

test('booked stops stay on their date unless asked to move, and undo puts every day back',()=>{
 const [a,b]=['2026-09-25','2026-09-27'],booked=on(seed,a).filter(s=>s.locked);
 assert.ok(booked.length);
 const order=swap(a,b),kept=applyOperation(seed,{type:'orderDays',order},parent);
 for(const s of booked)assert.equal(kept.steps.find(x=>x.id===s.id).day,a);
 const moved=applyOperation(seed,{type:'orderDays',order,moveLocked:true},parent);
 for(const s of booked)assert.equal(moved.steps.find(x=>x.id===s.id).day,b);
 const back=applyOperation(moved,{type:'orderDays',order:undoOrder(dates,order),moveLocked:true},parent);
 assert.deepEqual(back.days,seed.days);
 for(const s of seed.steps)assert.equal(back.steps.find(x=>x.id===s.id).day,s.day);
});

test('a new order of three days rotates them, and undo restores it',()=>{
 const order=[...dates];[order[5],order[6],order[7]]=[dates[7],dates[5],dates[6]];
 const next=applyOperation(seed,{type:'orderDays',order},parent);
 assert.equal(next.days[5].title,seed.days[7].title);assert.equal(next.days[6].title,seed.days[5].title);
 assert.deepEqual(applyOperation(next,{type:'orderDays',order:undoOrder(dates,order)},parent).days,seed.days);
});

test('a day that has begun, or an order that is not every day once, is refused',()=>{
 const s=on(seed,'2026-09-26')[0];
 const begun=applyOperation(seed,{type:'status',id:s.id,status:'done',at:'2026-09-19T02:00:00.000Z'},parent);
 assert.throws(()=>applyOperation(begun,{type:'orderDays',order:swap('2026-09-26','2026-09-28')},parent),/begun/);
 assert.throws(()=>applyOperation(seed,{type:'orderDays',order:dates.slice(1)},parent),/Reload/);
 assert.throws(()=>applyOperation(seed,{type:'orderDays',order:dates},parent),/different order/);
});

test('ticked stops move to another day, slotted in by time, with their option alternatives',()=>{
 const from='2026-09-27',to='2026-09-28';
 const picks=on(seed,from).filter(s=>!s.locked).slice(0,2);
 const grouped=on(seed,from).find(s=>s.group&&!s.locked);
 const ids=[...picks.map(s=>s.id),...(grouped?[grouped.id]:[])];
 const next=applyOperation(seed,{type:'moveSteps',ids,to},parent);
 for(const id of ids)assert.equal(next.steps.find(s=>s.id===id).day,to);
 if(grouped)for(const s of seed.steps.filter(s=>s.day===from&&s.group===grouped.group))assert.equal(next.steps.find(x=>x.id===s.id).day,to);
 // Each moved stop with a time comes before every stop already there that is due later.
 const list=on(next,to).sort((a,b)=>a.order-b.order);
 for(const s of list.filter(s=>ids.includes(s.id)&&s.time))assert.ok(!list.slice(0,list.indexOf(s)).some(x=>!ids.includes(x.id)&&x.time&&x.time>s.time),s.title);
 assert.match(next.alerts[0].summary,/moved from/);
});

test('ticked stops can be swapped for ticked stops on the other day; booked and done stops need care',()=>{
 const a='2026-09-26',b='2026-09-28',x=on(seed,a)[0],y=on(seed,b)[0];
 const next=applyOperation(seed,{type:'moveSteps',ids:[x.id],to:b,swapIds:[y.id]},parent);
 assert.equal(next.steps.find(s=>s.id===x.id).day,b);assert.equal(next.steps.find(s=>s.id===y.id).day,a);
 assert.match(next.alerts[0].summary,/swapped with/);
 const booked=seed.steps.find(s=>s.locked&&s.day==='2026-09-25');
 assert.throws(()=>applyOperation(seed,{type:'moveSteps',ids:[booked.id],to:b},parent),/booked time/);
 assert.equal(applyOperation(seed,{type:'moveSteps',ids:[booked.id],to:b,moveLocked:true},parent).steps.find(s=>s.id===booked.id).day,b);
 const done=applyOperation(seed,{type:'status',id:x.id,status:'done',at:'2026-09-19T02:00:00.000Z'},parent);
 assert.throws(()=>applyOperation(done,{type:'moveSteps',ids:[x.id],to:b},parent),/done or under way/);
 assert.throws(()=>applyOperation(seed,{type:'moveSteps',ids:[x.id,y.id],to:b},parent),/one day/);
 assert.throws(()=>applyOperation(seed,{type:'moveSteps',ids:[x.id],to:a},parent),/different day/);
 assert.throws(()=>applyOperation(seed,{type:'moveSteps',ids:[x.id],to:b},child),e=>e.status===403);
});

// A day arranged by hand, out of time order: its last stop dragged to the top.
const activeIds=(state,date)=>state.steps.filter(s=>s.day===date&&(!s.group||state.choices[s.group]===s.option)).sort((a,b)=>a.order-b.order).map(s=>s.id);
const handOrdered=(state,date)=>{const ids=activeIds(state,date);return applyOperation(state,{type:'reorder',day:date,ids:[ids.at(-1),...ids.slice(0,-1)]},parent);};
const layout=state=>Object.fromEntries(state.steps.map(s=>[s.id,`${s.day}|${s.order}`]));
const sequence=(state,date)=>on(state,date).sort((a,b)=>a.order-b.order).map(s=>s.id);

test('a day moved whole keeps the order it was arranged in, even out of time order',()=>{
 const [a,b]=['2026-09-26','2026-09-28'],start=handOrdered(seed,a);
 const before=sequence(start,a);
 const next=applyOperation(start,{type:'orderDays',order:swap(a,b)},parent);
 assert.deepEqual(sequence(next,b),before);
});

test('undoing a day swap or a stop move puts every stop back exactly where it was',()=>{
 const [a,b]=['2026-09-25','2026-09-27'],start=handOrdered(handOrdered(seed,a),b),order=swap(a,b);
 const positions=positionsOn(start,[a,b]);
 const moved=applyOperation(start,{type:'orderDays',order},parent);
 const back=applyOperation(moved,{type:'orderDays',order:undoOrder(dates,order),positions},parent);
 assert.deepEqual(layout(back),layout(start));
 const x=on(start,'2026-09-26').filter(s=>!s.locked&&!s.group).map(s=>s.id).slice(1,3),y=on(start,'2026-09-28').filter(s=>!s.locked&&!s.group)[0].id;
 const pos=positionsOn(start,['2026-09-26','2026-09-28']);
 const went=applyOperation(start,{type:'moveSteps',ids:x,to:'2026-09-28',swapIds:[y]},parent);
 const undone=applyOperation(went,{type:'moveSteps',ids:x,to:'2026-09-26',swapIds:[y],positions:pos},parent);
 assert.deepEqual(layout(undone),layout(start));
 assert.throws(()=>applyOperation(went,{type:'moveSteps',ids:x,to:'2026-09-26',swapIds:[y],positions:[{id:'nope',day:'2026-09-26',order:10}]},parent),/Reload/);
});

test('a stop moved out of step with its neighbours is offered the middle of the gap',async()=>{
 const {retimeAfterMove}=await import('../src/timing.js');
 const a={id:'a',time:'09:00',duration:60},b={id:'b',time:'13:00'},lunch={id:'l',time:'16:30'};
 assert.equal(retimeAfterMove([a,lunch,b],'l').time,'11:30','from the end of the one before to the start of the next');
 assert.equal(retimeAfterMove([a,{...lunch,time:'11:00'},b],'l'),null,'a time that still fits is left alone');
 assert.equal(retimeAfterMove([a,{...lunch,locked:true},b],'l'),null,'a locked time is never asked about');
 assert.equal(retimeAfterMove([a,{id:'n'},b],'n'),null,'nor one with no time');
 assert.equal(retimeAfterMove([{...lunch,time:'15:00'},a,b],'l').time,'08:30','first of the day goes before the next');
 assert.equal(retimeAfterMove([a,b,{...lunch,time:'10:00'}],'l').time,'13:30','last of the day goes after the one before');
 assert.equal(retimeAfterMove([{id:'x',time:'09:00',duration:300},{...lunch,time:'08:00'},{id:'y',time:'12:00'}],'l').time,'10:30','a long stop running past the next is measured from its start');
});
