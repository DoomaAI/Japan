import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyOperation} from '../server/model.mjs';
import {undoOrder} from '../src/day-moves.js';
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
