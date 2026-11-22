import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import handler from '../server/handler.mjs';
import {runInPlan,readTrip,currentPlan,enterPlan,createPlan,planExists,FAMILY_PLAN} from '../server/store.mjs';
import {shareCheckin,listCheckins,resetDemoCheckins} from '../server/checkins.mjs';
import {subscribe,subscriptions,resetDemoPush} from '../server/push.mjs';
import {ensureFeatures} from '../src/trip-features.js';
import {applyOperation} from '../server/model.mjs';
import {planDays} from '../src/ski-data.js';
import {planType,moduleOn} from '../src/plan-context.js';
process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
const skiSeed=JSON.parse(await readFile(new URL('../data/ski-seed.json',import.meta.url),'utf8'));
const days=planDays({from:'2027-01-20',to:'2027-01-28'}).days;

test('the ski plan starts with its own state: none of the family’s Express Pass, Disney days or booking windows',()=>{
 const s=ensureFeatures(structuredClone({...skiSeed,days}));
 assert.equal(s.ownSeed,true);assert.equal(s.plan.type,'ski');assert.equal(s.plan.title,'Sapporo ski');
 assert.deepEqual(s.steps,[]);assert.equal((s.expressSlots||[]).length,0);assert.equal((s.bookingWindows||[]).length,0);
 assert.equal(s.proposals.length,18);
 const bases=new Set(s.proposals.flatMap(p=>p.tags));for(const t of ['Osaka','Nara','Kyoto','Universal'])assert.ok(bases.has(t),t);
 for(const p of s.proposals){assert.ok(['flex','window','fixed'].includes(p.timing),p.id);assert.match(p.mapUrl,/^https:\/\//);if(p.website)assert.match(p.website,/^https:\/\//);}
 assert.ok(s.proposals.filter(p=>p.parentId).every(p=>s.proposals.some(q=>q.id===p.parentId)),'every part belongs to an idea on the board');
 // The family's plan is untouched by the change: it is still seeded as it always was.
 assert.ok(ensureFeatures({days:[],steps:[],members:[]}).expressSlots.length>0);
});
test('a ski trip keeps the ski fields and the board, and leaves the family’s own pages off',()=>{
 const plan={plan:{type:'ski'}};
 for(const id of ['ski','days','planning','food','money','phrases','whereabouts','arrival'])assert.equal(moduleOn(plan,id),true,id);
 for(const id of ['vault','guide','parks','games','spending','thanks','invitation'])assert.equal(moduleOn(plan,id),false,id);
 assert.equal(planType('nope').id,'trip','an unknown type is still the family trip');
});
test('the dates make the days: Osaka first, the snow after, places kept when the dates move',()=>{
 assert.equal(days.length,9);assert.equal(days[0].city,'Osaka');assert.equal(days[1].city,'Sapporo');assert.equal(days[1].title,'Sapporo · on the snow');
 const moved=planDays({from:'2027-01-19',to:'2027-01-24',places:{'2027-01-19':'Kyoto'}},days.map(d=>d.date==='2027-01-21'?{...d,city:'Nara',title:'Nara'}:d)).days;
 assert.deepEqual(moved.map(d=>d.city),['Kyoto','Osaka','Nara','Sapporo','Sapporo','Sapporo']);
 assert.match(planDays({from:'2027-01-28',to:'2027-01-20'}).problem,/before/);
 assert.match(planDays({from:'2027-01-01',to:'2027-03-30'}).problem,/under/);
 assert.match(planDays({from:'soon',to:''}).problem,/first and the last/);
 // An organiser moves the dates; a stop on a day that went is kept as an idea with no date.
 const org={name:'Damien',role:'parent'};
 let s=ensureFeatures(structuredClone({...skiSeed,days,members:['Damien','Sam'],people:{Damien:{role:'parent'},Sam:{role:'child'}}}));
 s.steps=[{id:'x',day:'2027-01-28',title:'Last run',time:'15:00',status:'todo',participants:[],kind:'flexible',order:10}];
 s=applyOperation(s,{type:'planDays',from:'2027-01-20',to:'2027-01-26',places:{}},org);
 assert.equal(s.days.length,7);assert.equal(s.steps[0].day,null);assert.equal(s.steps[0].backlogFrom.day,'2027-01-28');
 assert.throws(()=>applyOperation(s,{type:'planDays',from:'2027-01-20',to:'2027-01-26'},{name:'Sam',role:'child'}),/parent/);
 const family=ensureFeatures({days:[{date:'2026-09-20',title:'x',city:'Tokyo'}],steps:[],members:['Damien'],people:{Damien:{role:'parent'}}});
 assert.throws(()=>applyOperation(family,{type:'planDays',from:'2027-01-20',to:'2027-01-26'},org),/guide/);
});
test('each plan reads and writes its own state, and keeps its own positions and phones',async()=>{
 resetDemoCheckins();resetDemoPush();
 await runInPlan('ski',async()=>{await createPlan('ski','Damien',days);});
 const fam=await runInPlan(FAMILY_PLAN,()=>readTrip()),ski=await runInPlan('ski',()=>readTrip());
 assert.equal(fam.state.plan.type,'trip');assert.equal(ski.state.plan.title,'Sapporo ski');assert.deepEqual(ski.state.members,['Damien']);
 assert.equal(await runInPlan('ski',()=>planExists('ski')),true);
 assert.equal(runInPlan('nowhere',()=>currentPlan()),FAMILY_PLAN,'an unknown plan is the family’s');
 assert.throws(()=>runInPlan(FAMILY_PLAN,()=>enterPlan('nowhere')),/does not exist/);
 const damien={name:'Damien',role:'parent'};
 await runInPlan('ski',()=>shareCheckin(damien,{lat:43.07,lng:141.19}));
 assert.equal((await runInPlan('ski',()=>listCheckins(damien))).length,1);
 assert.equal((await runInPlan(FAMILY_PLAN,()=>listCheckins(damien))).length,0,'a position on the snow is not on the family’s map');
 const sub={endpoint:'https://push.example/1',keys:{p256dh:'k',auth:'a'}};
 await runInPlan('ski',()=>subscribe(damien,sub,{}));
 assert.equal((await runInPlan('ski',()=>subscriptions())).length,1);
 assert.equal((await runInPlan(FAMILY_PLAN,()=>subscriptions())).length,0,'the family’s notifications do not go to a phone in the ski plan');
});
test('API: the plans list, starting the ski plan with its dates, and the passports staying the family’s',async()=>{
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,base=`http://127.0.0.1:${port}`;
 try{
  let cookie='';
  const call=async(path,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
   const set=r.headers.getSetCookie?.()||[];for(const c of set){const [kv]=c.split(';');if(kv.startsWith('japan_preview_plan='))cookie=kv.endsWith('=')?'':kv;}
   return {status:r.status,body:await r.json()};};
  const plans=await call('/api/plans');assert.equal(plans.body.current.id,'family');
  const started=await call('/api/plan-open',{plan:'ski',from:'2027-01-20',to:'2027-01-28'});assert.equal(started.status,200);assert.match(cookie,/japan_preview_plan=ski/);
  const state=await call('/api/state');assert.equal(state.body.state.plan.title,'Sapporo ski');assert.equal(state.body.state.days[0].city,'Osaka');
  assert.equal((await call('/api/vault')).status,404,'no passports outside the family’s plan');
  assert.equal((await call('/api/plan-open',{plan:'ski'})).status,403,'only from the family’s plan');
  await call('/api/plan-switch',{});
  assert.equal((await call('/api/state')).body.state.plan.type,'trip','back in the family’s plan');
  assert.equal((await call('/api/plan-open',{plan:'family'})).status,404);
 }finally{server.close();}
});
