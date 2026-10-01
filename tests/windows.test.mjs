import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {windowOf,windowText,latestStart,scheduleProposal,calendarFeed} from '../src/timing.js';
import {delayedDayProposal,ensureFeatures} from '../src/trip-features.js';
import {draftPreview} from '../src/day-check.js';
import {windowsSeeded,DISNEY_WINDOWS,WINDOW_SEED} from '../src/timed-entry.js';
import {applyOperation} from '../server/model.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'};

test('a timed entry opens a window from its booking time, and an exact time has none',()=>{
 const ride={time:'15:30',bookingTime:'15:30',windowMinutes:60,locked:true};
 assert.deepEqual(windowOf(ride),{start:930,end:990,minutes:60,from:'15:30',until:'16:30'});
 assert.equal(windowText(ride),'15:30–16:30');assert.equal(latestStart(ride),990);
 assert.equal(windowText({...ride,bookingTime:'15:45'}),'15:45–16:45','the booking time leads the target');
 assert.equal(windowOf({time:'11:20',locked:true}),null);assert.equal(latestStart({time:'11:20'}),680);
 assert.equal(windowOf({windowMinutes:60}),null,'no time, no window');
});
test('running late is not too tight for a ride until its window closes',()=>{
 const steps=[
  {id:'a',title:'Sindbad',time:'13:15',duration:30,status:'todo'},
  {id:'b',title:'Soaring',time:'15:30',duration:30,status:'todo',locked:true,bookingTime:'15:30',windowMinutes:60},
  {id:'c',title:'Nemo',time:'16:00',duration:30,status:'todo'}];
 assert.deepEqual(delayedDayProposal(steps,0,960).warnings,[],'at 16:00 the 15:30 ride is still open');
 assert.equal(delayedDayProposal(steps,0,1000).warnings.length,1,'at 16:40 it has closed');
 const exact=steps.map(s=>s.id==='b'?{...s,windowMinutes:0}:s);
 assert.equal(delayedDayProposal(exact,0,960).warnings.length,1,'an exact time is tight at once');
 // A flexible stop before it may now run into the window rather than be dropped.
 const late=delayedDayProposal(steps,90);
 assert.deepEqual(late.backlog.map(s=>s.id),[]);assert.deepEqual(late.changes.find(c=>c.id==='a').time,'14:45');
 assert.deepEqual(delayedDayProposal(exact,90).backlog.map(s=>s.id),['a']);
 assert.equal(late.changes.find(c=>c.id==='c').time,'17:30','what follows runs on from the ride, at the latest');
});
test('shifting the day and a draft only clash with a timed entry when the window cannot take it',()=>{
 const steps=[{id:'a',title:'Journey',time:'09:00',duration:30,status:'todo'},{id:'b',title:'Peter Pan',time:'09:30',duration:30,status:'todo',locked:true,bookingTime:'09:30',windowMinutes:60}];
 assert.deepEqual(scheduleProposal(steps,30).conflicts,[]);
 assert.equal(scheduleProposal(steps,61).conflicts.length,1);
 assert.equal(scheduleProposal(steps.map(s=>({...s,windowMinutes:0})),30).conflicts.length,1);
 const state={steps:steps.map(s=>({...s,day:'2026-10-01',duration:60})),choices:{},groupModes:{}};
 const clash=time=>draftPreview(state,{changes:[{id:'a',action:'move',day:'2026-10-01',time}]}).conflicts;
 assert.deepEqual(clash('09:20'),[],'an hour from 9:20 still leaves the ride its 10:20 entry');
 assert.match(clash('09:35')[0],/entry window 09:30–10:30/,'an hour from 9:35 misses the window either side');
 const exact={...state,steps:state.steps.map(s=>({...s,windowMinutes:0}))};
 assert.equal(draftPreview(exact,{changes:[{id:'a',action:'move',day:'2026-10-01',time:'09:20'}]}).conflicts.length,1);
});
test('the Disney rides on DPA and the package carry an hour, once, and restaurants stay exact',()=>{
 const byId=Object.fromEntries(seed.steps.map(s=>[s.id,s]));
 for(const id of Object.keys(DISNEY_WINDOWS))assert.equal(byId[id].windowMinutes,60,byId[id].title);
 assert.equal(byId['2026-09-30-10'].windowMinutes,undefined,'lunch booking is exact');
 const live={steps:[{id:'2026-10-01-12',title:'Soaring'},{id:'2026-10-01-04',title:'Peter Pan',windowMinutes:30},{id:'x',title:'Other'}]};
 const out=windowsSeeded(live),get=id=>out.steps.find(s=>s.id===id);
 assert.equal(get('2026-10-01-12').windowMinutes,60);assert.equal(get('2026-10-01-04').windowMinutes,30,'a window set by hand stays');
 assert.equal(get('x').windowMinutes,undefined);assert.equal(out.windowSeed,WINDOW_SEED);
 assert.equal(windowsSeeded({...out,steps:[{id:'2026-10-01-12'}]}).steps[0].windowMinutes,undefined,'and it only ever runs once');
});
test('a window is set from the editor, checked on the server and named in the calendar',()=>{
 const state=ensureFeatures(structuredClone(seed));
 const id='2026-10-01-06';
 const next=applyOperation(state,{type:'patch',id,patch:{windowMinutes:30}},parent);
 const step=(next.state||next).steps.find(s=>s.id===id);
 assert.equal(step.windowMinutes,30);
 for(const bad of [-5,241,1.5,'60'])assert.throws(()=>applyOperation(state,{type:'patch',id,patch:{windowMinutes:bad}},parent),/entry window/);
 assert.ok(applyOperation(state,{type:'patch',id,patch:{windowMinutes:null}},parent));
 assert.match(calendarFeed(state).replace(/\r\n /g,''),/entry window 11:30–12:30/);
});
