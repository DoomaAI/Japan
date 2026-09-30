import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PLAN_TYPES,PLAN_TYPE_IDS,DEFAULT_PLAN,planOf,planContext,moduleOn,modulesOff,validPlanPatch,applyPlanPatch,validTimeZone} from '../src/plan-context.js';
import {ensureFeatures} from '../src/trip-features.js';
import {PAGES,pagesFor,setPlan} from '../src/nav-data.js';
import {setPlanZone,planZone,japanDate,japanClock,zonedInstant,zoneOffsetMinutes,calendarFeed,calendarEvent} from '../src/timing.js';
import {applyOperation} from '../server/model.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
// The second fixture: six adults, one evening, Sydney. Not this family, not Japan, not a trip.
const dinner=JSON.parse(await readFile(new URL('./fixtures/dinner.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};

test('the family trip reads as a trip in Japan with nothing it had switched off',()=>{
 const state=ensureFeatures(seed);
 assert.deepEqual(state.plan,{...DEFAULT_PLAN,title:'Japan 2026'});
 assert.equal(planContext(state).members.length,4);
 assert.deepEqual(modulesOff(state),['guests','invitation']);
 for(const id of Object.keys(PAGES))assert.equal(moduleOn(state,id),!['guests','invitation'].includes(id),id);
});
test('a plan saved before the record existed is upgraded without changing what it shows',()=>{
 const {plan,...older}=ensureFeatures(seed);
 assert.deepEqual(ensureFeatures(older).plan,plan);
 assert.equal(planOf({}).type,'trip');assert.equal(planOf({plan:{type:'not-a-type'}}).type,'trip');
});
test('the dinner is an outing: no packing, no passports, no missions; the wallet, the split and the photos stay',()=>{
 const state=ensureFeatures(dinner);
 assert.equal(state.plan.type,'outing');assert.equal(state.plan.timeZone,'Australia/Sydney');assert.equal(state.plan.currency,'AUD');
 for(const id of ['packing','vault','challenges','guide','arrival','flyinghome','phrases','stamps'])assert.equal(moduleOn(state,id),false,id);
 for(const id of ['today','glance','tickets','ledger','photos','memorymap','meeting','safety','todo','planning','weather','settings'])assert.equal(moduleOn(state,id),true,id);
 assert.ok(modulesOff(state).includes('packing'));
 // Every module a type names is a real page, so a renamed page cannot leave a dangling switch.
 for(const t of PLAN_TYPES)for(const id of t.off)assert.ok(id in PAGES,`${t.id}: ${id}`);
 assert.deepEqual(PLAN_TYPE_IDS.at(-1),'trip');
});
test('an organiser can switch a module on or off against the type, and back to the type’s default',()=>{
 const plan=planOf(dinner);
 assert.equal(moduleOn(applyPlanPatch(plan,{modules:{packing:true}}),'packing'),true);
 assert.equal(moduleOn(applyPlanPatch(plan,{modules:{photos:false}}),'photos'),false);
 const back=applyPlanPatch(applyPlanPatch(plan,{modules:{packing:true}}),{modules:{packing:null}});
 assert.equal('packing' in back.modules,false);assert.equal(moduleOn(back,'packing'),false);
});
test('the menu follows the plan: the dinner offers no packing list, the trip still does',()=>{
 try{
  setPlan(ensureFeatures(dinner).plan);
  const pages=pagesFor({name:'Sam',role:'parent'});
  assert.ok(!pages.includes('packing'));assert.ok(!pages.includes('vault'));assert.ok(pages.includes('tickets'));
  setPlan(ensureFeatures(seed).plan);
  assert.ok(pagesFor(parent).includes('packing'));
 }finally{setPlan(null);}
 assert.ok(pagesFor(parent).includes('packing'));
});
test('plan settings are checked: a real time zone, ISO codes, known fields, booleans for modules',()=>{
 assert.equal(validPlanPatch({type:'wedding',title:'Sam and Priya',timeZone:'Australia/Sydney',country:'AU',currency:'AUD',modules:{games:true}}),null);
 assert.match(validPlanPatch({type:'picnic'}),/kind of plan/);
 assert.match(validPlanPatch({timeZone:'Mars/Olympus'}),/time zone/);
 assert.match(validPlanPatch({country:'Australia'}),/two-letter/);
 assert.match(validPlanPatch({currency:'$'}),/three-letter/);
 assert.match(validPlanPatch({dialCode:'+61'}),/dialling/);
 assert.match(validPlanPatch({colour:'red'}),/Unsupported/);
 assert.match(validPlanPatch({modules:{packing:'yes'}}),/on, off/);
 assert.match(validPlanPatch({modules:{nothing:true}},Object.keys(PAGES)),/Unknown module/);
 assert.equal(validTimeZone('Asia/Tokyo'),true);assert.equal(validTimeZone(''),false);
});
test('a parent changes the plan record through one operation; a child cannot; the change is in the history',()=>{
 const next=applyOperation(seed,{type:'planSettings',patch:{title:'Japan, spring 2027',modules:{games:false}}},parent);
 assert.equal(next.plan.title,'Japan, spring 2027');assert.equal(next.plan.type,'trip');assert.equal(moduleOn(next,'games'),false);
 assert.equal(next.history[0].type,'planSettings');assert.match(next.history[0].title,/Japan, spring 2027/);
 assert.throws(()=>applyOperation(seed,{type:'planSettings',patch:{title:'Mine'}},child),e=>e.status===403);
 assert.throws(()=>applyOperation(seed,{type:'planSettings',patch:{timeZone:'Nowhere/Here'}},parent),/time zone/);
 assert.throws(()=>applyOperation(seed,{type:'planSettings',patch:{modules:{nothing:true}}},parent),/Unknown module/);
 assert.throws(()=>applyOperation(seed,{type:'planSettings'},parent),/Invalid plan settings/);
});
test('the clock follows the plan’s time zone, on both sides of daylight saving',()=>{
 try{
  setPlanZone('Australia/Sydney');
  assert.equal(planZone(),'Australia/Sydney');
  // 09:00Z on 13 November is 20:00 in Sydney (AEDT, +11); on 13 June it is 19:00 (AEST, +10).
  assert.equal(japanClock(new Date('2026-11-13T09:00:00Z')),'20:00');assert.equal(japanDate(new Date('2026-11-13T14:00:00Z')),'2026-11-14');
  assert.equal(zoneOffsetMinutes(new Date('2026-11-13T09:00:00Z')),660);assert.equal(zoneOffsetMinutes(new Date('2026-06-13T09:00:00Z')),600);
  assert.equal(zonedInstant('2026-11-13','19:30').toISOString(),'2026-11-13T08:30:00.000Z');
  assert.equal(zonedInstant('2026-06-13','19:30').toISOString(),'2026-06-13T09:30:00.000Z');
  // The calendar names the plan and its zone, and the dinner's fixed booking lands at 19:30 Sydney time.
  const feed=calendarFeed(ensureFeatures(dinner),'https://example.test');
  assert.match(feed,/X-WR-CALNAME:Dinner at Chin Chin/);assert.match(feed,/X-WR-TIMEZONE:Australia\/Sydney/);
  assert.match(feed,/DTSTART:20261113T083000Z/);
 }finally{setPlanZone('Asia/Tokyo');}
 assert.equal(planZone(),'Asia/Tokyo');
 assert.equal(zonedInstant('2026-09-24','12:30').toISOString(),'2026-09-24T03:30:00.000Z');
 assert.match(calendarFeed(ensureFeatures(seed)),/X-WR-CALNAME:Japan 2026/);
 assert.match(calendarFeed(ensureFeatures(seed)),/X-WR-TIMEZONE:Asia\/Tokyo/);
});
