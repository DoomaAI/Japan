import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures} from '../src/trip-features.js';
import {parkById} from '../src/park-data.js';
import {nextDpa,dpaFor,dpaReturn,hasDpa} from '../src/dpa.js';
import {activeSteps} from '../src/timing.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};
const run=(state,op,user=parent)=>{const out=applyOperation(state,op,user);return out.state||out;};
const tds=parkById('tds');

test('the next DPA opens an hour after the last one was bought',()=>{
 let state=ensureFeatures(structuredClone(seed));
 assert.equal(nextDpa(state,tds),null,'none bought: buy straight away');
 assert.ok(hasDpa(tds)&&hasDpa(parkById('tdl'))&&!hasDpa(parkById('usj')));
 state=run(state,{type:'dpaAdd',park:'tds',rideId:'tds-soaring',at:'08:45',returnTime:'15:30'});
 assert.equal(nextDpa(state,tds),'09:45');
 state=run(state,{type:'dpaAdd',park:'tds',rideId:'tds-toystory',at:'09:50',returnTime:'13:10'});
 assert.equal(nextDpa(state,tds),'10:50');
 assert.deepEqual(dpaFor(state,tds).map(d=>dpaReturn(d)),['15:30–16:30','13:10–14:10']);
 state=run(state,{type:'dpaRemove',id:dpaFor(state,tds)[1].id});
 assert.equal(nextDpa(state,tds),'09:45','taking one off the log counts from the one before');
});
test('a DPA puts its return time in the day as a one-hour timed entry, in clock order',()=>{
 let state=ensureFeatures(structuredClone(seed));
 state=run(state,{type:'dpaAdd',park:'tds',rideId:'tds-toystory',at:'09:50',returnTime:'13:10',addToPlan:true});
 const toy=state.steps.find(s=>s.id==='2026-10-01-13');
 assert.deepEqual([toy.time,toy.bookingTime,toy.locked,toy.windowMinutes],['13:10','13:10',true,60]);
 const order=activeSteps(state,'2026-10-01').map(s=>s.id);
 assert.ok(order.indexOf('2026-10-01-13')<order.indexOf('2026-10-01-09-2'),'now before the 14:00 Raging Spirits');
 assert.equal(dpaFor(state,tds)[0].stepId,'2026-10-01-13');
 // A ride not in the plan is added to it.
 state=run(state,{type:'dpaAdd',park:'tds',rideId:'tds-nemo',at:'11:00',returnTime:'12:40',addToPlan:true});
 const nemo=state.steps.find(s=>s.id===dpaFor(state,tds)[1].stepId);
 assert.ok(nemo&&nemo.day==='2026-10-01'&&nemo.windowMinutes===60&&nemo.locked);
});
test('only a parent logs a DPA, and only a sensible one',()=>{
 const state=ensureFeatures(structuredClone(seed));
 assert.throws(()=>run(state,{type:'dpaAdd',park:'tds',rideId:'tds-soaring',at:'08:45',returnTime:'15:30'},child));
 assert.throws(()=>run(state,{type:'dpaAdd',park:'usj',rideId:'usj-jaws',at:'08:45',returnTime:'15:30'}),/Disney/);
 assert.throws(()=>run(state,{type:'dpaAdd',park:'tds',rideId:'tdl-pooh',at:'08:45',returnTime:'15:30'}),/this park/);
 assert.throws(()=>run(state,{type:'dpaAdd',park:'tds',rideId:'tds-soaring',at:'15:45',returnTime:'15:30'}),/after/);
 assert.throws(()=>run(state,{type:'dpaAdd',park:'tds',rideId:'tds-soaring',at:'8:45',returnTime:'15:30'}),/valid time/);
});
