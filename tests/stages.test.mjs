import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ensureFeatures as upgraded} from '../src/trip-features.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
// Before, during and after the trip: the briefing, the wrap-up, stamps, the recap and the run-up.
test('the day in brief gathers the day number, stops, fixed times and a hotel move from the trip',async()=>{
 const {dayBriefing,briefingGreeting}=await import('../src/briefing-data.js');
 const state=upgraded(seed),kyoto=state.days.find(d=>d.date==='2026-09-24');
 const b=dayBriefing(state,kyoto.date);
 assert.equal(b.dayNumber,4);assert.equal(b.total,16);assert.ok(b.stops>0);
 assert.ok(b.fixed.some(f=>f.title==='Nozomi 33 to Kyoto'));
 assert.equal(b.moving,true);assert.ok(b.phrase?.en);
 assert.equal(dayBriefing(state,'2027-01-01'),null);
 assert.equal(dayBriefing(state,state.days.at(-1).date).last,true);
 assert.equal(briefingGreeting('2026-09-29','2026-09-29','08:10'),'Good morning');
 assert.equal(briefingGreeting('2026-09-29','2026-09-29','14:00'),'Today');
 assert.equal(briefingGreeting('2026-09-30','2026-09-29','08:00'),'Coming up');
});
