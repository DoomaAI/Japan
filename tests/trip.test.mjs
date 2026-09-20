import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {applyOperation,AppError} from '../server/model.mjs';
import {activeSteps,scheduleProposal,japanClock,japanDate} from '../src/timing.js';
import handler from '../server/handler.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};

test('every day, activity and alternative is linked to a real guide page',()=>{
 assert.equal(seed.days.length,16);assert.equal(seed.steps.length,237);assert.equal(new Set(seed.steps.map(s=>s.id)).size,237);
 for(const s of seed.steps){assert.ok(seed.days.some(d=>d.date===s.day));assert.ok(s.page>=1&&s.page<=72);assert.equal(Boolean(s.group),Boolean(s.option));}
 for(const [g,o]of Object.entries(seed.choices))assert.ok(seed.steps.some(s=>s.group===g&&s.option===o));
});
test('locked booking cannot be shifted until explicitly unlocked; original booking survives',()=>{
 const s=seed.steps.find(s=>s.title==='Nozomi 33 to Kyoto');
 assert.throws(()=>applyOperation(seed,{type:'patch',id:s.id,patch:{time:'13:00'}},parent),/Unlock/);
 const unlocked=applyOperation(seed,{type:'lock',id:s.id,locked:false},parent);
 const edited=applyOperation(unlocked,{type:'patch',id:s.id,patch:{time:'13:00'}},parent).steps.find(x=>x.id===s.id);
 assert.equal(edited.time,'13:00');assert.equal(edited.originalTime,'12:30');assert.equal(edited.bookingTime,'12:30');assert.equal(s.time,'12:30');
});
test('children can record offline completion for assigned activities but cannot edit or skip',()=>{
 const s=seed.steps[0],at='2026-09-19T02:00:00.000Z';
 const next=applyOperation(seed,{type:'status',id:s.id,status:'done',at},child);
 assert.equal(next.steps[0].completedAt,at);assert.equal(next.steps[0].updatedBy,'Nate');
 for(const op of [{type:'patch',id:s.id,patch:{title:'Changed'}},{type:'status',id:s.id,status:'skipped'},{type:'lock',id:s.id,locked:false},{type:'documentLink',title:'A',url:'https://example.com'}])assert.throws(()=>applyOperation(seed,op,child),e=>e.status===403);
 const privateStep=structuredClone(seed);privateStep.steps[0].participants=['Damien'];
 assert.throws(()=>applyOperation(privateStep,{type:'status',id:s.id,status:'done'},child),e=>e.status===403);
});
test('choosing an alternative retains both plans and changes active steps only',()=>{
 const chosen=applyOperation(seed,{type:'choose',group:'tokyo-reset',option:'Hotel reset'},parent);
 assert.equal(chosen.steps.length,seed.steps.length);
 const active=activeSteps(chosen,'2026-10-02');assert.ok(active.some(s=>s.title==='Rest, pool and an easy day'));assert.ok(!active.some(s=>s.title==='Tsukiji snacks and matcha'));
});
test('new fixed activity locks its time and validates day, names, URLs and fields',()=>{
 const result=applyOperation(seed,{type:'add',step:{title:'New booking',day:'2026-09-24',time:'20:00',kind:'fixed'}},parent);
 assert.ok(result.steps.at(-1).locked);
 assert.throws(()=>applyOperation(seed,{type:'add',step:{title:'Bad',day:'2099-01-01'}},parent));
 assert.throws(()=>applyOperation(seed,{type:'patch',id:seed.steps[0].id,patch:{status:'done'}},parent));
 assert.throws(()=>applyOperation(seed,{type:'documentLink',title:'Bad',url:'javascript:alert(1)'},parent));
 assert.throws(()=>applyOperation(seed,{type:'add',step:{title:'Bad',day:'2026-09-24',group:'x'}},parent));
});
test('rescheduling leaves locked/completed steps and catches crossing a booking in both directions',()=>{
 const steps=[{id:'a',title:'Train',time:'10:00',duration:30,locked:true,status:'todo'},{id:'b',title:'Cafe',time:'11:00',duration:20,status:'todo'},{id:'c',title:'Lunch',time:'12:00',duration:30,locked:true,status:'todo'},{id:'d',title:'Done',time:'14:00',status:'done'}];
 const p=scheduleProposal(steps,15);assert.deepEqual(p.changes,[{id:'b',time:'11:15'}]);assert.equal(p.conflicts.length,0);
 assert.ok(scheduleProposal(steps,60).conflicts.length>0);assert.ok(scheduleProposal(steps,-90).conflicts.length>0);
});
test('Japan dates remain correct across UTC midnight',()=>{
 assert.equal(japanDate(new Date('2026-09-23T16:00:00Z')),'2026-09-24');assert.equal(japanClock(new Date('2026-09-23T16:00:00Z')),'01:00');
});
test('API: local preview, optimistic conflicts, retry idempotency, private guide and fail-closed production',async()=>{
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const before=await(await fetch(base+'/api/state')).json();assert.equal(before.user.demo,true);assert.equal(before.state.days.length,16);
  const operation={type:'status',id:before.state.steps[0].id,status:'done',operationId:'test-retry-unique'};
  const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});
  const r=await post('mutate',{revision:before.revision,operation});assert.equal(r.status,200);const after=await r.json();assert.equal(after.revision,before.revision+1);
  const retry=await post('mutate',{revision:before.revision,operation});assert.equal(retry.status,200);assert.equal((await retry.json()).revision,after.revision);
  const stale=await post('mutate',{revision:before.revision,operation:{type:'status',id:operation.id,status:'todo'}});assert.equal(stale.status,409);
  const page=await fetch(base+'/api/guide?page=28');assert.equal(page.headers.get('content-type'),'image/jpeg');assert.ok((await page.arrayBuffer()).byteLength>10000);
  assert.equal((await fetch(base+'/api/guide?page=../secret')).status,404);
  const external=await fetch(base+'/api/mutate',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.example'},body:JSON.stringify({})});assert.equal(external.status,403);
  process.env.VERCEL='1';delete process.env.DATABASE_URL;delete process.env.APP_ORIGIN;
  assert.equal((await fetch(base+'/api/state')).status,401);assert.equal((await fetch(base+'/api/guide?page=28')).status,401);
  const blocked=await post('setup',{secret:'x',name:'Damien'});assert.equal(blocked.status,403);
 }finally{delete process.env.LOCAL_DEMO;delete process.env.VERCEL;await new Promise(r=>server.close(r));}
});
