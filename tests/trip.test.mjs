import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {applyOperation,AppError} from '../server/model.mjs';
import {activeSteps,scheduleProposal,japanClock,japanDate,scheduleVariance,stayPlan} from '../src/timing.js';
import handler from '../server/handler.mjs';
import {REST,MAX_ZOOM,clampView,zoomAbout,pinchView,tapView} from '../src/zoom.js';
import {htmlToText,parseInbound,addToInbox,MAX_INBOX} from '../server/email.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'},child_=child;

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

test('Options retains notes, links and media across scheduling, and deletion preserves day association',()=>{
 let state=applyOperation(seed,{type:'add',step:{title:'Maybe a cafe',day:null,notes:'Try the cake',website:'https://example.com'}},parent);
 const id=state.steps.at(-1).id;
 state=applyOperation(state,{type:'documentNote',title:'Cafe memory',category:'memory',stepId:id,tags:['food','food'],notes:'Great cake'},parent);
 const doc=state.documents.at(-1);assert.deepEqual(doc.tags,['food']);
 state=applyOperation(state,{type:'schedule',id,day:seed.days[0].date,time:'14:00'},parent);
 state=applyOperation(state,{type:'backlog',id},parent);
 assert.equal(state.steps.at(-1).day,null);assert.equal(state.steps.at(-1).time,null);assert.equal(state.documents.at(-1).stepId,id);
 assert.equal(state.steps.at(-1).notes,'Try the cake');assert.equal(state.steps.at(-1).backlogFrom.time,'14:00');
 state=applyOperation(state,{type:'schedule',id,day:seed.days[1].date},parent);
 state=applyOperation(state,{type:'remove',id},parent);
 assert.equal(state.documents.at(-1).stepId,null);assert.equal(state.documents.at(-1).day,seed.days[1].date);
 assert.throws(()=>applyOperation(seed,{type:'backlog',id:seed.steps.find(s=>s.locked).id},parent),/Unlock/);
});
test('reorder moves only active steps and preserves all target times and alternative plans',()=>{
 const day='2026-10-02',active=activeSteps(seed,day),ids=active.map(s=>s.id).reverse();
 const result=applyOperation(seed,{type:'reorder',day,ids},parent);
 assert.deepEqual(activeSteps(result,day).map(s=>s.id),ids);
 for(const s of result.steps){const old=seed.steps.find(x=>x.id===s.id);assert.equal(s.time,old.time);assert.equal(s.bookingTime,old.bookingTime);if(!ids.includes(s.id))assert.equal(s.order,old.order);}
 assert.throws(()=>applyOperation(seed,{type:'reorder',day,ids:ids.slice(1)},parent),/Reload/);
 assert.throws(()=>applyOperation(seed,{type:'reorder',day,ids},child),e=>e.status===403);
});
test('a stop added from a gap in the day timeline lands in that gap and survives a reorder',()=>{
 const day='2026-10-02',active=activeSteps(seed,day),target=active[1];
 const state=applyOperation(seed,{type:'add',step:{title:'Coffee before the train',day,order:target.order-0.5}},parent);
 const after=activeSteps(state,day),added=after.find(s=>s.title==='Coffee before the train');
 assert.equal(after.indexOf(added),1);assert.equal(after[2].id,target.id);
 // Reordering hands out the day's existing slots, so the half-slot the new stop arrived on is
 // tidied away without moving it.
 const tidied=activeSteps(applyOperation(state,{type:'reorder',day,ids:after.map(s=>s.id)},parent),day);
 assert.deepEqual(tidied.map(s=>s.id),after.map(s=>s.id));
 // Two stops added to the same gap both land in it, in the order they were added.
 const second=applyOperation(state,{type:'add',step:{title:'One more',day,order:target.order-0.5}},parent);
 assert.deepEqual(activeSteps(second,day).slice(1,4).map(s=>s.title),['Coffee before the train','One more',target.title]);
 assert.throws(()=>applyOperation(seed,{type:'add',step:{title:'Nope',day,order:target.order-0.5}},child),e=>e.status===403);
});
test('removing a stop takes nothing else with it, and the family is asked first',async()=>{
 const {removalEffects,voiceNotesFor,shortlistDay}=await import('../src/trip-features.js');
 const day='2026-10-02',step=activeSteps(seed,day)[1];
 let state=applyOperation(seed,{type:'documentNote',title:'Park ticket',category:'ticket',stepId:step.id,notes:'Two adults'},parent);
 state=applyOperation(state,{type:'documentNote',title:'The deer',category:'memory',stepId:step.id},parent);
 state=applyOperation(state,{type:'shortlistAdd',title:'Tea bowl',stepId:step.id,price:900},parent);
 state.voiceNotes=[{id:'v1',by:'Nate',day,stepId:step.id,pathname:'voice/1/a.webm',seconds:6,title:'The deer bowed'}];
 // What the question says is worked out from the state, so the pop-up cannot promise one thing
 // while the removal does another.
 const effects=removalEffects(state,step);
 assert.deepEqual(effects,{tickets:1,photos:1,voiceNotes:1,finds:1,idea:false});
 assert.deepEqual(removalEffects(state,{id:'nothing-here'}),{tickets:0,photos:0,voiceNotes:0,finds:0,idea:false});
 const after=applyOperation(state,{type:'remove',id:step.id},parent);
 assert.ok(!after.steps.some(s=>s.id===step.id));
 // The ticket and the photo stay filed, held against the day the stop was on rather than a step
 // that is gone.
 assert.equal(after.documents.length,state.documents.length);
 for(const d of after.documents.filter(d=>['Park ticket','The deer'].includes(d.title))){
  assert.equal(d.stepId,null);assert.deepEqual(d.stepIds,[]);assert.equal(d.day,day);
 }
 // The recording is still in that day's voice notes, and the find still shows on the day we saw it.
 assert.equal(after.voiceNotes[0].stepId,null);
 assert.equal(voiceNotesFor(after,{day}).length,1);
 assert.equal(after.shortlist[0].stepId,null);
 assert.equal(shortlistDay(after,after.shortlist[0]),day);
 // A locked time is not removed by accident: it has to be unlocked deliberately first, which is
 // what the pop-up offers rather than doing it for you.
 const locked=seed.steps.find(s=>s.locked);
 assert.throws(()=>applyOperation(seed,{type:'remove',id:locked.id},parent),/Unlock before deleting/);
 assert.ok(applyOperation(applyOperation(seed,{type:'lock',id:locked.id,locked:false},parent),{type:'remove',id:locked.id},parent));
 // It stays a parent's change, and a stop that is already gone cannot be removed twice.
 assert.throws(()=>applyOperation(seed,{type:'remove',id:step.id},child),e=>e.status===403);
 assert.throws(()=>applyOperation(after,{type:'remove',id:step.id},parent),e=>e.status===404);
 // The reversible answer the pop-up offers beside it: the same stop saved to Options is still
 // there, whole, off the calendar, with its ticket and its voice note still on it and the day it
 // came off remembered.
 const kept=applyOperation(state,{type:'backlog',id:step.id},parent);
 const saved=kept.steps.find(s=>s.id===step.id);
 assert.equal(saved.day,null);assert.equal(saved.time,null);assert.equal(saved.bookingTime,null);
 assert.equal(saved.backlogFrom.day,day);assert.equal(saved.status,'todo');
 assert.equal(kept.documents.find(d=>d.title==='Park ticket').stepId,step.id);
 assert.equal(kept.voiceNotes[0].stepId,step.id);
 // From Options it goes back onto a day whenever it fits, which is the point of offering it.
 assert.equal(applyOperation(kept,{type:'schedule',id:step.id,day,time:'09:00'},parent).steps.find(s=>s.id===step.id).time,'09:00');
});
test('the bin on a stop asks before anything happens, and only a parent is offered it',async()=>{
 const timeline=await readFile(new URL('../src/DayTimeline.jsx',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const panel=await readFile(new URL('../src/RemoveStop.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // The bin is offered beside the reorder tools, to a parent only, and hands the stop upwards
 // rather than removing anything itself.
 assert.match(timeline,/className="remove-stop"/);
 assert.match(timeline,/const drop=s=>parent&&removeStep\?/);
 assert.match(timeline,/onClick=\{\(\)=>removeStep\(s\)\}/);
 assert.doesNotMatch(timeline,/type:'remove'/,'the timeline never removes a stop on the tap itself');
 // The gentler answer has an icon of its own beside the bin, so nobody has to reach for the bin
 // to find it. It is a parent's too, and the row still decides nothing itself.
 assert.match(timeline,/className="to-options"/);
 assert.match(timeline,/const park=s=>parent&&optionStep\?/);
 assert.match(timeline,/onClick=\{\(\)=>optionStep\(s\)\}/);
 assert.match(timeline,/\{park\(s\)\}\{drop\(s\)\}/,'the tray sits before the bin');
 assert.doesNotMatch(timeline,/type:'backlog'/,'the move is handled above the row, like every other change');
 // Moving is reversible, so it goes on the tap; a locked time is answered without a round trip.
 assert.match(main,/async function optionStop\(s\)\{/);
 assert.match(main,/if\(s\.locked\)\{notice\('Unlock its fixed time before saving this stop to Options\.'\);return;\}/);
 assert.match(main,/mutate\(\{type:'backlog',id:s\.id\}\)/);
 // What happens to a stop is decided in one place, so the row in the timeline and the card for
 // the same stop cannot drift into two different answers.
 assert.match(main,/const removeStop=s=>setModal\(\{type:'remove',step:s\}\)/);
 assert.match(main,/removeStep=\{removeStop\} optionStep=\{optionStop\}/);
 assert.doesNotMatch(main,/optionStep=\{async/,'the timeline uses that handler rather than a copy of it');
 // The card offers the same pair on the stop you are standing in front of, to a parent only.
 assert.match(main,/className="icon to-options" aria-label=\{`Save \$\{current\.title\} to Options`\} onClick=\{\(\)=>optionStop\(current\)\}/);
 assert.match(main,/className="icon remove-stop" aria-label=\{`Remove \$\{current\.title\} from this day`\} onClick=\{\(\)=>removeStop\(current\)\}/);
 assert.match(css,/\.to-options,\.remove-stop\{color:#8b7a76\}/,'and reads the same in both places');
 // Both ways in — the bin on the timeline and the button in the edit form — open the same
 // question, and the form no longer asks in the browser's own box.
 assert.match(main,/onRemove=\{s=>setModal\(\{type:'remove',step:s\}\)\}/);
 assert.match(main,/onClick=\{\(\)=>onRemove\(step\)\}/);
 assert.doesNotMatch(main,/confirm\('Remove this activity/,'the confirmation is the in-app pop-up now');
 assert.match(main,/remove:'Remove this stop\?'/);
 // The panel reads the live step, so unlocking a time inside the pop-up frees the button that
 // the lock had disabled.
 assert.match(main,/step=\{state\.steps\.find\(s=>s\.id===modal\.step\.id\)\|\|modal\.step\}/);
 // Only the danger button removes anything; every other way out of the pop-up keeps the stop.
 assert.match(panel,/mutate\(\{type:'remove',id:step\.id\}\)/);
 assert.equal((panel.match(/type:'remove'/g)||[]).length,1);
 assert.match(panel,/disabled=\{busy\|\|step\.locked\}/);
 assert.match(panel,/onClick=\{\(\)=>close\(null\)\}/,'keeping the stop is the safe default');
 assert.match(panel,/type:'lock',id:step\.id,locked:false/,'with the lock offered rather than worked around');
 // The reversible answer sits beside it, offered only for a stop that is actually on a day, and
 // a locked one waits for the unlock exactly as the removal does.
 assert.match(panel,/mutate\(\{type:'backlog',id:step\.id\}\)/);
 assert.match(panel,/\{step\.day&&<div className="confirm-instead">/);
 assert.equal((panel.match(/disabled=\{busy\|\|step\.locked\}/g)||[]).length,2);
});
test('a stop is ticked off where the day is read, and says when it was finished',async()=>{
 const {doneClock,doneStamp}=await import('../src/timing.js');
 const timeline=await readFile(new URL('../src/DayTimeline.jsx',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // The tick is the card's change, so it is the card's rule: whoever the stop is assigned to can
 // tick it and a parent can tick any, rather than the parent-only rule the editing tools use.
 assert.match(timeline,/const mine=s=>parent\|\|\(s\.participants\|\|\[\]\)\.includes\(user\?\.name\)/);
 assert.match(timeline,/type="checkbox" checked=\{s\.status==='done'\} disabled=\{busy\|\|!mine\(s\)\}/);
 assert.match(timeline,/status:done\?'done':'todo'/);
 assert.match(main,/<DayTimeline steps=\{steps\}[^>]*state=\{visibleState\}[^>]*user=\{user\}/,'with the family and the plan it needs to decide that');
 // The box sits outside the row's own button, so ticking cannot be mistaken for opening the stop.
 assert.match(timeline,/<span className="timeline-tick">/);
 assert.ok(timeline.indexOf('className="timeline-tick"')<timeline.indexOf('className={`timeline-step'),'the tick comes before the row’s own button rather than inside it');
 // The time it was finished is editable in place, saved when the field is left rather than on a
 // half-typed hour, and never accepts a time that has not happened yet.
 assert.match(timeline,/onBlur=\{e=>retime\(s,e\.target\.value\)\}/);
 assert.match(timeline,/status:'done',at:at\.toISOString\(\)/);
 assert.match(timeline,/at\.getTime\(\)>Date\.now\(\)\+60000/);
 assert.match(timeline,/if\(doneClock\(s\)===clock\)return;/,'and re-saving the same time is not a change');
 // The chronology carries the time it actually happened once it has, with the target kept beside
 // it, and the finished row steps back without taking its tick or its tools with it.
 assert.match(timeline,/s\.status==='done'&&s\.completedAt\?doneClock\(s\):\(s\.time\|\|'—'\)/);
 assert.match(timeline,/`Completed\$\{s\.time\?` · due \$\{s\.time\}`:''\}`/);
 assert.match(timeline,/className=\{`timeline-row \$\{s\.status\}/);
 assert.match(css,/\.timeline-row\.done \.timeline-step\{opacity:\.55\}/);
 assert.match(css,/\.timeline-row\.done \.timeline-step \.timeline-dot\{opacity:1\}/);
 // The two clock helpers agree with each other: a stamp read back in Japan time is the time that
 // was typed, whatever the phone reading it is set to.
 const step={day:'2026-10-02',completedAt:doneStamp({day:'2026-10-02'},'14:20').toISOString()};
 assert.equal(doneClock(step),'14:20');
 assert.equal(doneClock({}),'');
 // And the server takes exactly that: the stamp is a real completion time on that step.
 const target=seed.steps.find(s=>s.day&&!s.locked);
 const at=doneStamp(target,'08:05').toISOString();
 const ticked=applyOperation(seed,{type:'status',id:target.id,status:'done',at},parent);
 assert.equal(ticked.steps.find(s=>s.id===target.id).completedAt,at);
 assert.throws(()=>applyOperation(seed,{type:'status',id:target.id,status:'done',at:new Date(Date.now()+3600000).toISOString()},parent),/valid past completion time/);
});

test('the day at a glance is its own screen, and Home leads with the step we are on',async()=>{
 const {PAGES,moreIds,primaryNav,MORE_SECTIONS}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 const nav=await readFile(new URL('../src/Navigation.jsx',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // The running order of the day used to sit in a column beside the step card, which on a phone
 // meant scrolling past the whole of Home to reach it. It is a screen of its own now, so it can
 // be opened on its own and put on the bottom bar by anybody who lives in it.
 assert.ok(PAGES.glance?.label&&PAGES.glance?.note,'the day at a glance has its own entry');
 assert.ok(PAGE_RULES.glance,'and something to say when the speaker is pressed');
 assert.match(nav,/glance:CalendarCheck/,'with an icon of its own, not the to-do list one');
 assert.equal(PAGES.glance.label,'Today','and it is the Today tab');
 assert.ok(MORE_SECTIONS.find(([title])=>title==='The plan')[1].includes('glance'),'it is the day\u2019s plan');
 // It is on everybody's bar as Today, so it is not repeated under More.
 for(const user of [{name:'Damien',role:'parent'},{name:'Nate',role:'child'}]){
  assert.ok(primaryNav(user).includes('glance'),`${user.name} can reach it`);
  assert.ok(!moreIds(user).includes('glance'),'and only once');
 }
 // Home no longer splits into two columns, so the step card has the screen to itself and the
 // timeline is not rendered twice.
 assert.equal((main.match(/<DayTimeline /g)||[]).length,1,'the timeline is rendered once, on its own screen');
 assert.match(main,/\{tab==='glance'&&<>\s*\{dayHeading\}\s*\{dayStrip\(d=>go\('glance',d\)\)\}\s*<DayTimeline /,'it opens with the day it is about');
 assert.doesNotMatch(main,/today-layout/,'Home is one column now');
 assert.doesNotMatch(css,/today-layout/,'and the grid that made two of them is gone with it');
 // Choosing a day on the day at a glance stays on the day at a glance. selectDay goes Home, so
 // the strip is told where a tap lands rather than assuming it.
 assert.match(main,/const dayStrip=pick=><div className="date-strip"/);
 assert.match(main,/onClick=\{\(\)=>pick\(d\.date\)\}/);
 assert.match(main,/\{dayStrip\(selectDay\)\}/,'and Home still lands on Home');
 // Tapping a stop there opens its card, which is the one place a step is read in full.
 assert.match(main,/<DayTimeline steps=\{steps\}[^>]*selectStep=\{selectStep\}/);
 assert.match(main,/function selectStep\(s\)\{[\s\S]*?setSelected\(s\.id\);setTab\('today'\)/);
 // And Home says where the rest of the day went.
 assert.match(main,/onClick=\{\(\)=>go\('glance'\)\}>The day at a glance<\/Button>/);
});
test('the day’s dashboard is about what is next, not about the book’s cover',async()=>{
 const home=await readFile(new URL('../src/HomeFeatures.jsx',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 const sw=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
 // The dashboard carries no cover, and the column that was cut around it is gone with it rather
 // than left holding a gap.
 assert.doesNotMatch(home,/cover\.jpg/,'the cover is not on the dashboard');
 assert.doesNotMatch(css,/\.next-up>img/,'and nothing is left styling an image that is not there');
 assert.doesNotMatch(css,/\.next-up\{display:grid/,'the two-column layout went with it');
 // It is still the welcome screen's and the Days screen's, and still saved on the phone, because
 // both of those work with no signal.
 assert.equal((main.match(/cover\.jpg/g)||[]).length,2,'the welcome and Days screens keep it');
 assert.match(sw,/cover\.jpg/,'and it stays in the offline shell for them');
});
test('the dashboard opens as a small tile and keeps the leave-by time on it',async()=>{
 const {isOpen,setOpen}=await import('../src/fold.js');
 const store=new Map(),fake={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
 // The weather is open until somebody folds it; the dashboard is small until somebody opens it.
 assert.equal(isOpen('dashboard',fake,false),false,'a phone that has never opened it sees the tile');
 assert.equal(isOpen('weather',fake),true,'and the sections that open by default are untouched');
 assert.equal(setOpen('dashboard',true,fake),true);
 assert.equal(isOpen('dashboard',fake,false),true,'opened, it is still open tomorrow');
 assert.equal(setOpen('dashboard',false,fake),false);
 assert.equal(isOpen('dashboard',fake,false),false);
 // A phone that refuses storage gets the caller's answer rather than a throw.
 const refuses={getItem(){throw new Error('no storage');},setItem(){throw new Error('no storage');}};
 assert.equal(isOpen('dashboard',refuses,false),false);
 assert.equal(isOpen('weather',refuses),true);
 const home=await readFile(new URL('../src/HomeFeatures.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(home,/const \[shown,setShown\]=useState\(\(\)=>isOpen\(FOLD_ID,undefined,false\)\)/,'the tile starts folded');
 assert.match(home,/const fold=\(\)=>setShown\(v=>setOpen\(FOLD_ID,!v\)\)/);
 assert.match(home,/aria-expanded=\{shown\}/,'and says which way it is folded');
 // Folded, it still carries the stop we are on and the time we have to leave by, and both are
 // still one tap into the step itself.
 assert.match(home,/className="next-title" onClick=\{\(\)=>selectStep\(current\)\}/);
 assert.match(home,/\{fixed&&!shown&&<button className="next-peek" onClick=\{\(\)=>selectStep\(fixed\)\}/);
 assert.match(home,/leave \{japanClock\(departure\)\}/);
 // The booking detail and the drawer of everything else wait behind the fold.
 assert.match(home,/\{shown&&<>\{fixed&&<div className="departure">/);
 assert.match(home,/className="dashboard-actions"/);
 assert.doesNotMatch(home,/<h2>\{current\?'What’s next\?'/,'the display headline went with the full tile');
 assert.match(css,/\.next-up\.folded\{/);
 assert.doesNotMatch(css,/\.next-up h2\{font-size/,'nothing reclaims the headline size');
});
test('the weather folds away on the phone that folded it, and says what it is for while folded',async()=>{
 const {isOpen,setOpen}=await import('../src/fold.js');
 // A phone that has never folded anything sees everything, exactly as it always did.
 const store=new Map(),fake={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
 assert.equal(isOpen('weather',fake),true);
 assert.equal(setOpen('weather',false,fake),false);
 assert.equal(store.get('japan.fold.weather'),'closed');
 assert.equal(isOpen('weather',fake),false,'and it is still folded tomorrow, not sprung open by a reload');
 assert.equal(isOpen('anything-else',fake),true,'folding one section says nothing about another');
 assert.equal(setOpen('weather',true,fake),true);
 assert.equal(isOpen('weather',fake),true);
 // A phone that refuses storage shows the section rather than losing it, and never throws.
 const refuses={getItem(){throw new Error('no storage');},setItem(){throw new Error('no storage');}};
 assert.equal(isOpen('weather',refuses),true);
 assert.equal(setOpen('weather',false,refuses),false);
 assert.equal(isOpen('weather',null),true);
 // Folded, the section still says what it is for: a chevron over its own name is wasted space.
 const weather=await readFile(new URL('../src/Weather.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(weather,/const \[open,setShown\]=useState\(\(\)=>isOpen\(FOLD_ID\)\)/);
 assert.match(weather,/const fold=\(\)=>setShown\(v=>setOpen\(FOLD_ID,!v\)\)/);
 assert.match(weather,/aria-expanded=\{open\}/,'and says which way it is folded');
 assert.match(weather,/\{!open&&<span className="weather-peek">\{peek\}<\/span>\}/);
 assert.match(weather,/const peek=today\?`\$\{describe\(today\.code\)\[1\]\} \$\{today\.max\}° \/ \$\{today\.min\}°/);
 assert.match(css,/\.weather\.folded\{/);
});
test('a day we have walked through folds down and greys in the Days menu',async()=>{
 const {dayProgress}=await import('../src/timing.js');
 const day=seed.days[0].date,steps=activeSteps(seed,day);
 assert.equal(dayProgress(seed,day).finished,false,'a day with stops still ahead of us is not behind us');
 assert.equal(dayProgress(seed,day).steps,steps.length);
 // Settling every stop finishes the day, and a deliberate skip settles one as surely as a tick.
 let state=seed;
 for(const [i,s] of steps.entries())state=applyOperation(state,{type:'status',id:s.id,status:i===0?'skipped':'done'},parent);
 const progress=dayProgress(state,day);
 assert.equal(progress.finished,true);
 assert.equal(progress.skipped,1);assert.equal(progress.done,steps.length-1);
 // Undoing one stop puts the day back in the middle of itself.
 assert.equal(dayProgress(applyOperation(state,{type:'status',id:steps[1].id,status:'todo'},parent),day).finished,false);
 // A day with nothing on it is empty rather than finished, so an unplanned day is not folded away.
 assert.equal(dayProgress({steps:[],choices:{}},day).finished,false);
 // The tile folds to its name, tally and city, greys, and is still one tap into its photos.
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(main,/className=\{`day-tile\$\{progress\.finished\?' finished':''\}/);
 assert.match(main,/progress\.finished\?<small className="day-finished">/);
 assert.match(main,/key=\{d\.date\} onClick=\{\(\)=>go\('glance',d\.date\)\}/,'a day is one tap into its day at a glance');
 assert.match(css,/\.day-tile\.finished\{[^}]*opacity:\.6/);
 assert.match(css,/\.days-grid\{align-items:start\}/,'so a folded tile does not stretch to its neighbour');
});
test('the Days cover is a book to swipe, and the day on the open page is picked out below',async()=>{
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const book=await readFile(new URL('../src/GuideBook.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // It opens on the cover the offline shell keeps, and turns through the rest of the guide.
 assert.match(main,/const coverSource=n=>n===1\?'\/cover\.jpg':`\/api\/guide\?page=\$\{n\}`/);
 assert.match(main,/<GuideBook page=\{coverPage\} source=\{coverSource\}/);
 assert.match(book,/source=src\}\)\{/,'the guide tab still draws every page from the guide');
 // Every page of a day's section lights up that day's tile, and the caption scrolls to it.
 assert.match(main,/d\.pages\?\.includes\(coverPage\)\?' on-page':''/);
 assert.match(main,/getElementById\(`day-tile-\$\{onPage\.date\}`\)\?\.scrollIntoView/);
 assert.match(css,/\.day-tile\.on-page\{opacity:1;outline:/,'a finished day still shows when its page is open');
 // Every day's guide pages are pages of the book, so each one can be reached by swiping.
 for(const d of seed.days)for(const n of d.pages||[])assert.ok(n>=1&&n<=72,`${d.date} page ${n}`);
});
test('day and activity attachments validate associations and keep caption edits scoped',()=>{
 let state=applyOperation(seed,{type:'documentNote',title:'Luggage',category:'luggage',reference:'ABC123',day:seed.days[0].date,notes:'Blue bag',tags:['Tokyo']},parent);
 const id=state.documents.at(-1).id;
 assert.equal(state.documents.at(-1).day,seed.days[0].date);
 state=applyOperation(state,{type:'editDocument',id,title:'Bags',category:'luggage',notes:'Collect at hotel',stepId:seed.steps[0].id,tags:['forwarding']},parent);
 assert.equal(state.documents.at(-1).day,null);assert.equal(state.documents.at(-1).stepId,seed.steps[0].id);
 for(const extra of [{day:'2099-01-01'},{stepId:'missing'},{day:seed.days[0].date,stepId:seed.steps[0].id},{tags:['x'.repeat(51)]}])assert.throws(()=>applyOperation(state,{type:'editDocument',id,title:'Bad',...extra},parent));
 const locked=seed.steps.find(s=>s.locked);
 assert.throws(()=>applyOperation(seed,{type:'patch',id:locked.id,patch:{bookingTime:'23:59'}},parent),/Unlock/);
 const edited=applyOperation(seed,{type:'patch',id:locked.id,patch:{locked:false,bookingTime:'23:59'}},parent).steps.find(s=>s.id===locked.id);
 assert.equal(edited.bookingHistory.at(-1).to,'23:59');
});
test('photo/video registration rejects unsupported files and enforces per-type size limits',async()=>{
 const {validateFile}=await import('../server/files.mjs');
 validateFile('video/mp4',100*1024*1024,'memory');validateFile('video/quicktime',10,'memory');validateFile('image/heic',10,'memory');
 assert.throws(()=>validateFile('video/mp4',100*1024*1024+1,'memory'));
 assert.throws(()=>validateFile('image/jpeg',25*1024*1024+1,'memory'));
 assert.throws(()=>validateFile('application/pdf',10,'memory'));
 assert.throws(()=>validateFile('text/html',10,'ticket'));
});

test('daily and whole-trip missions correctly assign Boston age 8 and Nate age 5',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');const state=ensureFeatures(seed);
 assert.equal(state.challenges.length,108);
 for(const name of ['Nate','Boston']){
  assert.equal(state.challenges.filter(c=>c.day&&c.participants.includes(name)).length,48);
  assert.equal(state.challenges.filter(c=>!c.day&&c.participants.includes(name)).length,6);
 }
 // The Universal day reads the park for Boston and the feelings of it for Nate.
 assert.equal(state.challenges.find(c=>c.id==='mission-2026-09-25-Boston-1').title,'Theme-park strategist');
 assert.equal(state.challenges.find(c=>c.id==='mission-2026-09-25-Nate-1').title,'Ride bravery badge');
 const id='mission-2026-09-25-Nate-2';
 const done=applyOperation(state,{type:'challengeStatus',id,person:'Nate',done:true,response:'I found a question block.',at:'2026-09-19T12:00:00Z'},child);
 assert.ok(done.challenges.find(c=>c.id===id).completions.Nate);
 assert.equal(done.challenges.find(c=>c.id===id).responses.Nate,'I found a question block.');
 assert.throws(()=>applyOperation(state,{type:'challengeStatus',id:'mission-2026-09-25-Boston-1',person:'Boston',done:true},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'challengeAdd',title:'Replace plan',day:null,participants:['Nate']},child),e=>e.status===403);
 assert.deepEqual(ensureFeatures(done).challenges,done.challenges);
});
test('shopping is shared, validated and tracked without permitting child admin edits',()=>{
 const added=applyOperation(seed,{type:'shoppingAdd',title:'Stationery',person:'Boston',quantity:2,budget:1200,store:'Tokyo stationery shop',url:'https://example.com',day:seed.days[0].date},child),item=added.shopping[0];
 const bought=applyOperation(added,{type:'shoppingStatus',id:item.id,done:true},parent);
 assert.equal(bought.shopping[0].boughtBy,'Damien');assert.ok(bought.shopping[0].boughtAt);
 assert.equal(applyOperation(bought,{type:'shoppingStatus',id:item.id,done:false},child).shopping[0].boughtAt,null);
 assert.throws(()=>applyOperation(added,{type:'shoppingRemove',id:item.id},child),e=>e.status===403);
 for(const fields of [{quantity:-1},{budget:-10},{url:'javascript:alert(1)'},{day:'2099-01-01'}])assert.throws(()=>applyOperation(seed,{type:'shoppingAdd',title:'Bad',...fields},parent));
});

test('the purchase shortlist keeps a find whole, and whoever found it keeps it',async()=>{
 const {shortlistFor,shortlistTotals,shortlistTags,shortlistStatusLabel,SHORTLIST_STATUS}=await import('../src/trip-features.js');
 const day=seed.days[0].date;
 // Anyone finds something, including a boy standing in front of it with his own money in his
 // pocket. It arrives undecided, because being undecided is the reason it is on the list at all.
 let state=applyOperation(seed,{type:'shortlistAdd',title:'Kitsune mask',shop:'Nakamise stall',place:'Asakusa',
  price:1800,day,person:'Nate',tags:[' mask ','mask','present'],notes:'The blue one'},child);
 const find=state.shortlist[0];
 assert.equal(find.addedBy,'Nate');assert.equal(find.status,'thinking');assert.equal(find.photo,null);
 assert.equal(find.decidedBy,null);assert.equal(find.decidedAt,null);
 assert.deepEqual(find.tags,['mask','present'],'a tag typed twice is one tag');
 // And it is a shortlist, not the shopping list: neither one writes into the other.
 assert.deepEqual(state.shopping,[]);
 // The decision is anybody's to make and is stamped with who made it. Taking it back to
 // undecided takes the name back too, rather than leaving somebody answering for an answer
 // nobody is giving any more.
 state=applyOperation(state,{type:'shortlistStatus',id:find.id,status:'yes'},parent);
 assert.equal(state.shortlist[0].status,'yes');assert.equal(state.shortlist[0].decidedBy,'Damien');
 assert.ok(state.shortlist[0].decidedAt);
 state=applyOperation(state,{type:'shortlistStatus',id:find.id,status:'thinking'},child);
 assert.equal(state.shortlist[0].decidedBy,null);assert.equal(state.shortlist[0].decidedAt,null);
 assert.throws(()=>applyOperation(state,{type:'shortlistStatus',id:find.id,status:'maybe'},parent),/still deciding/);
 assert.throws(()=>applyOperation(state,{type:'shortlistStatus',id:'nope',status:'yes'},parent),e=>e.status===404);
 // A find belongs to whoever found it. Boston cannot rewrite Nate's or throw it away; Nate can
 // do both to his own, and a parent can do both to anybody's.
 assert.throws(()=>applyOperation(state,{type:'shortlistEdit',id:find.id,title:'Mine now'},{name:'Boston',role:'child'}),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'shortlistRemove',id:find.id},{name:'Boston',role:'child'}),e=>e.status===403);
 const edited=applyOperation(state,{type:'shortlistEdit',id:find.id,title:'Kitsune mask',price:2000,shop:'Nakamise stall',place:'Asakusa'},child);
 assert.equal(edited.shortlist[0].price,2000);assert.equal(edited.shortlist[0].addedBy,'Nate');
 assert.equal(applyOperation(edited,{type:'shortlistRemove',id:find.id},child).shortlist.length,0);
 assert.equal(applyOperation(edited,{type:'shortlistRemove',id:find.id},parent).shortlist.length,0);
 // What the ticket said, and nothing a ticket never says.
 for(const fields of [{title:'   '},{price:1800.5},{price:-1},{price:10000001},{day:'2099-01-01'},{person:'Grandma'},
  {tags:Array.from({length:21},(_,i)=>`t${i}`)},{tags:['x'.repeat(51)]},{notes:'n'.repeat(2001)},{shop:'s'.repeat(251)},{place:'p'.repeat(251)}])
  assert.throws(()=>applyOperation(seed,{type:'shortlistAdd',title:'Bad',...fields},parent),`${JSON.stringify(fields)} should be refused`);
 // Undecided first, because those are the ones the page is asking about; newest first inside
 // each, because the thing just photographed is the thing being looked at.
 let many=seed;
 for(const [title,at] of [['Oldest','2026-09-20T01:00:00.000Z'],['Newest','2026-09-20T03:00:00.000Z'],['Passed','2026-09-20T02:00:00.000Z']])
  many=applyOperation(many,{type:'shortlistAdd',title,at},parent);
 many=applyOperation(many,{type:'shortlistStatus',id:many.shortlist.find(s=>s.title==='Passed').id,status:'no'},parent);
 assert.deepEqual(shortlistFor(many).map(s=>s.title),['Newest','Oldest','Passed']);
 // Filters are the questions actually asked of it: whose, which day, where it got to, what it
 // was tagged, and the word somebody half remembers.
 assert.deepEqual(shortlistFor(many,{status:'no'}).map(s=>s.title),['Passed']);
 let mixed=applyOperation(seed,{type:'shortlistAdd',title:'Kitsune mask',person:'Nate',day,price:1800,tags:['present'],shop:'Nakamise stall'},parent);
 mixed=applyOperation(mixed,{type:'shortlistAdd',title:'Spinning top',person:'Boston',price:900},parent);
 mixed=applyOperation(mixed,{type:'shortlistAdd',title:'Tea bowl',person:'Family'},parent);
 assert.deepEqual(shortlistFor(mixed,{person:'Nate'}).map(s=>s.title),['Kitsune mask']);
 assert.deepEqual(shortlistFor(mixed,{day}).map(s=>s.title),['Kitsune mask']);
 assert.deepEqual(shortlistFor(mixed,{tag:'present'}).map(s=>s.title),['Kitsune mask']);
 assert.deepEqual(shortlistFor(mixed,{query:'nakamise'}).map(s=>s.title),['Kitsune mask']);
 assert.deepEqual(shortlistTags(mixed),['present']);
 // A total that quietly leaves things out is the one a budget gets set against, so what has no
 // price on it is counted separately rather than treated as free.
 const totals=shortlistTotals(shortlistFor(mixed));
 assert.equal(totals.open,3);assert.equal(totals.openYen,2700);assert.equal(totals.unpriced,1);
 const decided=applyOperation(mixed,{type:'shortlistStatus',id:mixed.shortlist[0].id,status:'yes'},parent);
 const after=shortlistTotals(shortlistFor(decided));
 assert.equal(after.yes,1);assert.equal(after.yesYen,1800);assert.equal(after.open,2);assert.equal(after.openYen,900);
 // Every state the list can be in has words for it, because the card says them out loud.
 for(const [id] of SHORTLIST_STATUS)assert.ok(shortlistStatusLabel(id).length>2,id);
 assert.equal(shortlistStatusLabel('nothing-like-this'),'Still deciding');
});

test('a find says how much we want it and where the phone was standing, and the form opens where it is asked for',async()=>{
 const {shortlistFor,shortlistRating,shortlistPin,SHORTLIST_SORTS,SHORTLIST_STARS}=await import('../src/trip-features.js');
 const {pendingProgress,ensureFeatures}=await import('../src/trip-features.js');
 // How much we want it is the half of deciding a price cannot answer, so it is written on the
 // find itself. Nobody having said is not nought out of five — it is a question still open.
 let state=applyOperation(seed,{type:'shortlistAdd',title:'Kitsune mask',rating:4},child);
 const find=state.shortlist[0];
 assert.equal(find.rating,4);assert.equal(shortlistRating(find),4);
 assert.equal(applyOperation(seed,{type:'shortlistAdd',title:'Tea bowl'},child).shortlist[0].rating,null);
 assert.equal(shortlistRating({rating:null}),null);assert.equal(shortlistRating({rating:0}),null);
 // Anyone rates one, from its own card, the same way anyone says where we got to on it — and
 // rating the star already showing takes the answer back rather than leaving a score nobody meant.
 state=applyOperation(state,{type:'shortlistRating',id:find.id,rating:2},parent);
 assert.equal(state.shortlist[0].rating,2);
 state=applyOperation(state,{type:'shortlistRating',id:find.id,rating:0},{name:'Boston',role:'child'});
 assert.equal(state.shortlist[0].rating,null,'nought is the question reopened, not a bad score');
 for(const rating of [6,-1,1.5,'4',null])
  assert.throws(()=>applyOperation(state,{type:'shortlistRating',id:find.id,rating},parent),`${rating} should be refused`);
 for(const rating of [6,-1,1.5,'4'])
  assert.throws(()=>applyOperation(seed,{type:'shortlistAdd',title:'Bad',rating},parent),`${rating} should be refused`);
 assert.throws(()=>applyOperation(state,{type:'shortlistRating',id:'nope',rating:3},parent),e=>e.status===404);
 // A stall in a covered arcade has no address anybody can read off it, so the phone says where
 // it is instead. Stored exactly as it was read or not at all.
 const pin={lat:35.7148,lng:139.7967};
 const pinned=applyOperation(seed,{type:'shortlistAdd',title:'Kitsune mask',pin},parent).shortlist[0];
 assert.deepEqual(pinned.pin,pin);assert.deepEqual(shortlistPin(pinned),pin);
 assert.equal(applyOperation(seed,{type:'shortlistAdd',title:'Tea bowl'},parent).shortlist[0].pin,null);
 assert.equal(shortlistPin(null),null,'a form opened on nothing is not a find with a bad pin');
 assert.equal(shortlistPin({pin:{lat:35.7}}),null);
 for(const bad of [{lat:35.7},{lat:35.7,lng:139.8,accuracy:5},{lat:200,lng:139.8},'35.7,139.8'])
  assert.throws(()=>applyOperation(seed,{type:'shortlistAdd',title:'Bad',pin:bad},parent),/latitude and a longitude/);
 // Walking directions go to the pin rather than to the words, because a pin cannot be misread.
 const shortlistSource=await readFile(new URL('../src/Shortlist.jsx',import.meta.url),'utf8');
 assert.match(shortlistSource,/const pin=shortlistPin\(item\);\n\s*if\(pin\)return `https:\/\/www\.google\.com\/maps\/dir/);
 // Read it by how much we want it, and filtered down to the ones worth the argument. Unrated
 // goes last rather than bottom: nobody has answered, which is not the same as answering nought.
 assert.ok(SHORTLIST_SORTS.some(([id])=>id==='want'));
 let many=seed;
 for(const [title,rating,at] of [['Maybe',2,'2026-09-20T01:00:00.000Z'],['Must have',5,'2026-09-20T02:00:00.000Z'],['Unrated',null,'2026-09-20T03:00:00.000Z']])
  many=applyOperation(many,{type:'shortlistAdd',title,rating,at},parent);
 assert.deepEqual(shortlistFor(many,{sort:'want'}).map(s=>s.title),['Must have','Maybe','Unrated']);
 assert.deepEqual(shortlistFor(many,{rating:3}).map(s=>s.title),['Must have']);
 assert.deepEqual(shortlistFor(many,{rating:''}).length,3,'no answer to the filter is not a filter');
 assert.equal(SHORTLIST_STARS,5);
 // Both of them survive a shop with no signal in it, which is most shops.
 const offline=pendingProgress(ensureFeatures(structuredClone(seed)),[{operation:{type:'shortlistAdd',operationId:'op-1',
  title:'Kitsune mask',rating:4,pin,by:'Nate',at:'2026-09-20T01:00:00.000Z'}}]);
 assert.equal(offline.shortlist[0].rating,4);assert.deepEqual(offline.shortlist[0].pin,pin);
 const saved=applyOperation(seed,{type:'shortlistAdd',title:'Tea bowl'},parent);
 const rated=pendingProgress(saved,[{operation:{type:'shortlistRating',operationId:'op-2',id:saved.shortlist[0].id,rating:3}}]);
 assert.equal(rated.shortlist[0].rating,3);assert.equal(rated.shortlist[0].pending,true);
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/'shortlistRating'/,'a rating given in a shop has to be able to wait for signal');
 // The button that opens the form is only a button if the form opens where it can be seen. On a
 // phone the list is longer than the screen, so the form sits above it rather than below it, and
 // the page goes to it — a form appended under the list is a button that does nothing.
 assert.ok(shortlistSource.indexOf('className="feature-card find-form"')<shortlistSource.indexOf('className="feature-grid"'),
  'the add form has to come before the list it is added to');
 assert.match(shortlistSource,/scrollIntoView/);
 assert.match(shortlistSource,/input\[name="title"\]'\)\?\.focus/);
 // And the photograph is offered whether the find is new or already on the list, because the
 // picture is the whole card and the shop is usually revisited before the form is.
 assert.equal(shortlistSource.match(/type="file" name="photo"/g).length,1);
 assert.doesNotMatch(shortlistSource,/\{!edit\.id&&<label className="menu-shoot button">/);
});

test('a find and its photograph are two things, and losing the picture never loses the find',async()=>{
 const {ensureFeatures,pendingProgress,searchTrip}=await import('../src/trip-features.js');
 // Most shops have no signal in them, so the words go on the list there and then and the
 // photograph follows when there is something to send it over.
 const queued=[{operation:{type:'shortlistAdd',operationId:'op-1',title:'Kitsune mask',shop:'Nakamise stall',
  place:'Asakusa',price:1800,tags:['present'],by:'Nate',at:'2026-09-20T01:00:00.000Z'}}];
 const pending=pendingProgress(ensureFeatures(structuredClone(seed)),queued);
 assert.equal(pending.shortlist.length,1);
 assert.equal(pending.shortlist[0].pending,true,'the card has to say it is still on this phone');
 assert.equal(pending.shortlist[0].addedBy,'Nate');assert.equal(pending.shortlist[0].photo,null);
 assert.equal(pending.shortlist[0].status,'thinking');
 // A decision made offline shows where it got to straight away, and says who made it, because
 // the whole point of the page is standing in a shop deciding.
 const saved=applyOperation(seed,{type:'shortlistAdd',title:'Tea bowl'},parent);
 const at='2026-09-20T02:00:00.000Z';
 const decided=pendingProgress(saved,[{operation:{type:'shortlistStatus',operationId:'op-2',id:saved.shortlist[0].id,status:'yes',by:'Lauren',at}}]);
 assert.equal(decided.shortlist[0].status,'yes');assert.equal(decided.shortlist[0].decidedBy,'Lauren');
 assert.equal(decided.shortlist[0].decidedAt,at);assert.equal(decided.shortlist[0].pending,true);
 // Taking it back to undecided offline takes the name back with it, exactly as it will on the
 // server, so the card does not say one thing now and another after it syncs.
 const undone=pendingProgress(saved,[{operation:{type:'shortlistStatus',operationId:'op-3',id:saved.shortlist[0].id,status:'thinking',by:'Lauren',at}}]);
 assert.equal(undone.shortlist[0].decidedBy,null);assert.equal(undone.shortlist[0].decidedAt,null);
 // And a find is findable by everything written on it, from the one search box.
 const state=applyOperation(seed,{type:'shortlistAdd',title:'Kitsune mask',shop:'Nakamise stall',place:'Asakusa',tags:['present']},parent);
 for(const q of ['kitsune','nakamise','asakusa','present'])
  assert.ok(searchTrip(state,q).some(h=>h.type==='Shortlist'),`${q} should find it`);
 assert.equal(searchTrip(state,'kitsune')[0].detail,'Nakamise stall · Asakusa','the result says where it was, most specific first');
 // The search result opens the page it came from rather than the nearest-looking one.
 const practical=await readFile(new URL('../src/PracticalPages.jsx',import.meta.url),'utf8');
 assert.match(practical,/Shortlist:'shortlist'/);
});

test('a find is pinned to the trip itself — an activity on the timeline or a place off our own map',async()=>{
 const {shortlistFor,shortlistWhere,shortlistDay,shortlistStep,shortlistPlace,shortlistOnDay}=await import('../src/trip-features.js');
 const step=seed.steps.find(s=>s.day),otherDay=seed.days.find(d=>d.date!==step.day).date;
 const withMap={...structuredClone(seed),locations:[{id:'map-nakamise',name:'Nakamise-dori',city:'Tokyo',district:'Asakusa',address:'1 Asakusa, Taito City, Tokyo, Japan'}]};
 // Pinned to an activity, the day comes from the activity rather than being typed a second time
 // and left to drift away from it.
 let state=applyOperation(withMap,{type:'shortlistAdd',title:'Kitsune mask',shop:'Third stall on the left',
  stepId:step.id,day:otherDay},parent);
 const pinned=state.shortlist[0];
 assert.equal(pinned.stepId,step.id);assert.equal(pinned.locationId,null);
 assert.equal(pinned.day,null,'the activity carries the day');
 assert.equal(shortlistDay(state,pinned),step.day);
 assert.equal(shortlistStep(state,pinned).id,step.id);
 // It turns up on that day's own screen, which is the point of pinning it there.
 assert.deepEqual(shortlistOnDay(state,step.day).map(s=>s.title),['Kitsune mask']);
 assert.deepEqual(shortlistOnDay(state,otherDay),[]);
 // Pinned to a place off the map instead, which is what gets an address and directions back.
 state=applyOperation(withMap,{type:'shortlistAdd',title:'Tea bowl',locationId:'map-nakamise'},parent);
 const atPlace=state.shortlist[0];
 assert.equal(shortlistPlace(state,atPlace).name,'Nakamise-dori');
 assert.equal(shortlistDay(state,atPlace),null,'a place says nothing about which day we were there');
 // Where it was, said once, most specific first, with nothing repeated back at you.
 assert.deepEqual(shortlistWhere(state,atPlace),['Nakamise-dori','Asakusa']);
 assert.deepEqual(shortlistWhere(withMap,{shop:'Third stall',place:'Asakusa'}),['Third stall','Asakusa']);
 assert.deepEqual(shortlistWhere(withMap,{shop:'Asakusa',place:'Asakusa'}),['Asakusa']);
 // One anchor, never two: a place and an activity are two answers to the same question.
 assert.throws(()=>applyOperation(withMap,{type:'shortlistAdd',title:'Both',stepId:step.id,locationId:'map-nakamise'},parent),/not both/);
 assert.throws(()=>applyOperation(withMap,{type:'shortlistAdd',title:'Nowhere',locationId:'map-not-real'},parent),/map list/);
 assert.throws(()=>applyOperation(withMap,{type:'shortlistAdd',title:'Nowhere',stepId:'not-a-step'},parent),e=>e.status===404);
 // Unpinning it puts the typed day back in charge, rather than leaving the find stranded on a
 // day it can no longer name.
 let onStep=applyOperation(withMap,{type:'shortlistAdd',title:'Kitsune mask',stepId:step.id},parent);
 const id=onStep.shortlist[0].id;
 onStep=applyOperation(onStep,{type:'shortlistEdit',id,title:'Kitsune mask',stepId:null,day:otherDay},parent);
 assert.equal(onStep.shortlist[0].stepId,null);
 assert.equal(shortlistDay(onStep,onStep.shortlist[0]),otherDay);
 assert.deepEqual(shortlistOnDay(onStep,step.day),[]);
 // And moving it to a place off the map drops the activity rather than keeping both.
 const moved=applyOperation(onStep,{type:'shortlistEdit',id,title:'Kitsune mask',locationId:'map-nakamise'},parent);
 assert.equal(moved.shortlist[0].stepId,null);assert.equal(moved.shortlist[0].locationId,'map-nakamise');
 // The order finds come back in on a day is the page's order: still to decide first.
 let busyDay=applyOperation(withMap,{type:'shortlistAdd',title:'Passed one',stepId:step.id,at:'2026-09-20T03:00:00.000Z'},parent);
 busyDay=applyOperation(busyDay,{type:'shortlistStatus',id:busyDay.shortlist[0].id,status:'no'},parent);
 busyDay=applyOperation(busyDay,{type:'shortlistAdd',title:'Undecided one',day:step.day,at:'2026-09-20T01:00:00.000Z'},parent);
 assert.deepEqual(shortlistOnDay(busyDay,step.day).map(s=>s.title),['Undecided one','Passed one']);
 assert.deepEqual(shortlistFor(busyDay,{day:step.day,status:'no'}).map(s=>s.title),['Passed one']);
});

test('the shortlist can be read in whatever order the question needs',async()=>{
 const {shortlistFor,SHORTLIST_SORTS}=await import('../src/trip-features.js');
 const [first,second]=seed.days.map(d=>d.date);
 let state=seed;
 for(const [title,at,price,shop,day] of [
  ['Mask','2026-09-20T01:00:00.000Z',1800,'Nakamise stall',second],
  ['Bowl','2026-09-20T03:00:00.000Z',9000,'Asakusa pottery',first],
  ['Charm','2026-09-20T02:00:00.000Z',null,'Zakka shop',null]])
  state=applyOperation(state,{type:'shortlistAdd',title,at,price,shop,day},parent);
 const order=sort=>shortlistFor(state,{sort}).map(s=>s.title);
 assert.deepEqual(order('new'),['Bowl','Charm','Mask']);
 assert.deepEqual(order('old'),['Mask','Charm','Bowl']);
 // A find with no price cannot be put in a price order, so it goes last in both rather than
 // being treated as free and leading the cheap list.
 assert.deepEqual(order('dear'),['Bowl','Mask','Charm']);
 assert.deepEqual(order('cheap'),['Mask','Bowl','Charm']);
 assert.deepEqual(order('shop'),['Bowl','Mask','Charm']);
 assert.deepEqual(order('day'),['Bowl','Mask','Charm'],'by the day we saw it, and no day last');
 // Undecided first is the default, because a shortlist is a pile of unanswered questions.
 assert.deepEqual(order('decide'),order(undefined));
 assert.deepEqual(order('nothing-like-this'),order('decide'));
 // Every order the page offers actually sorts by something, and says what in plain words.
 for(const [id,label] of SHORTLIST_SORTS){assert.equal(order(id).length,3,id);assert.ok(label.length>4,id);}
});

test('deciding to get something hands it to the shopping list, once, and keeps both ends linked',async()=>{
 const {shortlistToShop,shoppedAlready}=await import('../src/trip-features.js');
 const day=seed.days[0].date;
 let state=applyOperation(seed,{type:'shortlistAdd',title:'Kitsune mask',shop:'Nakamise stall',place:'Asakusa',
  price:1800,person:'Nate',day,notes:'The blue one'},child);
 const find=state.shortlist[0];
 // Still deciding is not shopping. The list is for what we have said we are getting.
 assert.deepEqual(shortlistToShop(state),[]);
 assert.throws(()=>applyOperation(state,{type:'shortlistShop',id:find.id},parent),/getting it first/);
 state=applyOperation(state,{type:'shortlistStatus',id:find.id,status:'yes'},parent);
 assert.deepEqual(shortlistToShop(state).map(s=>s.title),['Kitsune mask']);
 // Across it goes, carrying the shop, the price and the notes, and linked at both ends.
 state=applyOperation(state,{type:'shortlistShop',id:find.id},child);
 const item=state.shopping.at(-1);
 assert.equal(item.title,'Kitsune mask');assert.equal(item.store,'Nakamise stall · Asakusa');
 assert.equal(item.budget,1800);assert.equal(item.person,'Nate');assert.equal(item.day,day);
 assert.equal(item.quantity,1);assert.equal(item.notes,'The blue one');
 assert.equal(item.shortlistId,find.id);
 assert.equal(state.shortlist[0].shoppingId,item.id);
 assert.equal(shoppedAlready(state,state.shortlist[0]),true);
 // Offered once. Nobody wants two of the same mask on the list because two people pressed it.
 assert.deepEqual(shortlistToShop(state),[]);
 assert.throws(()=>applyOperation(state,{type:'shortlistShop',id:find.id},parent),/already on the shopping list/);
 // Taking the find off the shortlist leaves the thing to buy where it is — it is shopping now,
 // not a question — but it stops claiming to have come from a find that is gone.
 const removed=applyOperation(state,{type:'shortlistRemove',id:find.id},parent);
 assert.equal(removed.shopping.length,1);assert.equal(removed.shopping[0].shortlistId,null);
 assert.equal(removed.shortlist.length,0);
 // And a find pinned to an activity takes that activity's day across with it.
 const step=seed.steps.find(s=>s.day);
 let pinned=applyOperation(seed,{type:'shortlistAdd',title:'Tea bowl',stepId:step.id,price:900},parent);
 pinned=applyOperation(pinned,{type:'shortlistStatus',id:pinned.shortlist[0].id,status:'bought'},parent);
 pinned=applyOperation(pinned,{type:'shortlistShop',id:pinned.shortlist[0].id},parent);
 assert.equal(pinned.shopping.at(-1).day,step.day);
});

test('API: a shortlist photo is refused unless the find is yours and the folder is yours',async()=>{
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});
  const before=await(await fetch(base+'/api/state')).json();
  const {state}=await(await post('mutate',{revision:before.revision,operation:{type:'shortlistAdd',title:'Kitsune mask',price:1800,operationId:'shortlist-photo-test'}})).json();
  const find=state.shortlist.at(-1);
  const fails=async(body,pattern)=>{
   const r=await post('shortlist',body);assert.equal(r.status>=400,true,JSON.stringify(body));
   assert.match((await r.json()).error,pattern);
  };
  await fails({id:'no-such-find',pathname:'shortlist/preview/mask.jpg'},/no longer on the shortlist/);
  // Someone else's folder, another feature's folder, and a way out of your own.
  await fails({id:find.id,pathname:'shortlist/someone-else/mask.jpg'},/Invalid photo/);
  await fails({id:find.id,pathname:'photos/preview/mask.jpg'},/Invalid photo/);
  await fails({id:find.id,pathname:'shortlist/preview/../../secret.jpg'},/Invalid photo/);
  // Taking off a photo that was never there is not an error; there is simply nothing to do.
  assert.equal((await post('shortlist',{id:find.id,remove:true})).status,200);
  // A find with no photograph has no photograph to serve, rather than serving somebody else's.
  assert.equal((await fetch(`${base}/api/shortlist?id=${find.id}`)).status,404);
  assert.equal((await fetch(base+'/api/shortlist?id=no-such-find')).status,404);
  // A valid request gets past validation and only then reaches storage, which is not connected here.
  const r=await post('shortlist',{id:find.id,pathname:'shortlist/preview/mask.jpg'});
  assert.equal(r.status>=400,true);assert.doesNotMatch((await r.json()).error,/Invalid photo|shortlist\./);
  // Anyone photographs their own find, so the upload folder is open the way the photo one is.
  assert.equal((await post('upload',{pathname:'shortlist/preview/mask.jpg'})).status,503,'shortlist photos reach storage');
 }finally{delete process.env.LOCAL_DEMO;await new Promise(r=>server.close(r));}
});
test('booking alerts retain changes and acknowledgements belong to the signed-in family member',()=>{
 const step=seed.steps.find(s=>!s.locked);
 let next=applyOperation(seed,{type:'patch',id:step.id,patch:{time:'18:30'}},parent);
 const alert=next.alerts[0];assert.match(alert.summary,/18:30/);assert.ok(alert.seenBy.Damien);assert.equal(alert.seenBy.Nate,undefined);
 next=applyOperation(next,{type:'acknowledge',id:alert.id,person:'Lauren'},child);
 assert.ok(next.alerts[0].seenBy.Nate);assert.equal(next.alerts[0].seenBy.Lauren,undefined);
 assert.throws(()=>applyOperation(next,{type:'meeting',day:seed.days[0].date,place:'Gate'},child),e=>e.status===403);
 const meeting=applyOperation(next,{type:'meeting',day:seed.days[0].date,place:'Hotel lobby',time:'17:00',contacts:{Damien:'+61 400 000 000',Lauren:''}},parent);
 assert.equal(meeting.meetings[seed.days[0].date].place,'Hotel lobby');assert.match(meeting.alerts[0].summary,/17:00/);
});
test('delay planning protects fixed/started/completed steps, allows travel time and saves missed stops atomically',async()=>{
 const {delayedDayProposal}=await import('../src/trip-features.js');
 const steps=[{id:'a',title:'Cafe',time:'09:00',duration:30,status:'todo',day:'2026-10-03',order:10},{id:'b',title:'Museum',time:'10:00',duration:60,status:'todo',day:'2026-10-03',order:20},{id:'c',title:'Booking',time:'11:00',duration:30,status:'todo',locked:true,travelMinutes:20,arrivalBuffer:10,day:'2026-10-03',order:30},{id:'d',title:'Already done',time:'08:00',duration:10,status:'done',day:'2026-10-03',order:40}];
 const plan=delayedDayProposal(steps,30);assert.deepEqual(plan.changes.map(c=>[c.id,c.time]),[['a','09:30']]);assert.deepEqual(plan.backlog.map(s=>s.id),['b']);
 const source={...structuredClone(seed),steps,documents:[{id:'photo',stepId:'b',category:'memory'}]};
 const next=applyOperation(source,{type:'runningLate',day:'2026-10-03',delay:30},parent);
 assert.equal(next.steps.find(s=>s.id==='c').time,'11:00');assert.equal(next.steps.find(s=>s.id==='d').time,'08:00');assert.equal(next.steps.find(s=>s.id==='b').day,null);assert.equal(next.documents[0].stepId,'b');
 assert.throws(()=>applyOperation(source,{type:'runningLate',day:'2026-10-03',delay:500},parent));
 assert.ok(delayedDayProposal(steps,20,700).warnings.length);
});
test('offline readiness includes relevant and general tickets but does not claim external links are downloaded',async()=>{
 const {ensureFeatures,offlineManifest,pendingProgress}=await import('../src/trip-features.js');const state=ensureFeatures(structuredClone(seed)),day=state.days[0].date,step=state.steps.find(s=>s.day===day);
 state.documents=[{id:'ticket',stepId:step.id,pathname:'x',type:'image/png'},{id:'general',pathname:'y',type:'application/pdf'},{id:'external',type:'link',url:'https://example.com'},{id:'movie',category:'memory',day,pathname:'z',type:'video/mp4'}];
 const manifest=offlineManifest(state,day);assert.ok(manifest.files.some(f=>f.key==='doc-ticket'));assert.ok(manifest.files.some(f=>f.key==='doc-general'));assert.ok(!manifest.files.some(f=>f.key==='doc-movie'));assert.equal(manifest.links.length,1);
 const c=state.challenges.find(c=>c.participants.includes('Nate'));
 const pending=pendingProgress(state,[{operation:{type:'challengeStatus',id:c.id,person:'Nate',done:true,at:'2026-09-20T01:00:00Z',response:'Spotted a pattern'}}]);
 assert.equal(pending.challenges.find(x=>x.id===c.id).responses.Nate,'Spotted a pattern');assert.equal(c.completions.Nate,undefined);
});
test('search spans documents, ideas, shopping, challenges and diary, and diary follows Japan completion dates',async()=>{
 const {ensureFeatures,searchTrip,diaryDays,nextSummary}=await import('../src/trip-features.js');let state=ensureFeatures(structuredClone(seed));
 state=applyOperation(state,{type:'shoppingAdd',title:'Blue notebook',notes:'blue suitcase'},parent);
 state=applyOperation(state,{type:'documentNote',title:'Luggage tag',notes:'Blue suitcase',category:'luggage'},parent);
 state=applyOperation(state,{type:'journal',day:'2026-09-21',notes:'Our blue suitcase arrived.'},parent);
 const results=searchTrip(state,'blue suitcase');assert.ok(results.some(r=>r.type==='Shopping'));assert.ok(results.some(r=>r.type==='Document'));assert.ok(results.some(r=>r.type==='Diary'));
 const c=state.challenges[0];c.completions[c.participants[0]]='2026-09-20T16:00:00Z';c.responses={[c.participants[0]]:'I worked it out'};
 assert.match(diaryDays(state,'2026-09-21')[0].challenges[0],/I worked it out/);
 const fixedDay=state.steps.find(s=>s.locked&&s.time).day;const summary=nextSummary(state,fixedDay);assert.ok(summary.current);assert.ok(summary.departure instanceof Date);
});

test('all imported locations retain source rows and produce correctly encoded directions',async()=>{
 const {locations}=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url)));
 const {locationDirections,locationDestination}=await import('../src/locations.js');
 assert.equal(locations.length,209);assert.equal(new Set(locations.map(l=>l.id)).size,209);
 assert.deepEqual(locations.map(l=>l.sourceRow),Array.from({length:209},(_,i)=>i+2));
 for(const l of locations){assert.ok(l.address);for(const mode of ['transit','walking','driving']){const url=new URL(locationDirections(l,mode));assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('destination'),locationDestination(l));assert.equal(url.searchParams.get('travelmode'),mode);assert.equal(url.searchParams.get('api'),'1');assert.ok(url.href.length<2048);}}
 const shrine=locations.find(l=>l.name==='Jishu Jinja Shrine');assert.ok(shrine.referenceOnly);assert.match(shrine.notes,/CLOSED/);
});
test('Japanese names and addresses are kept safe from a fresh import and show on the step card',async()=>{
 const {locations}=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url)));
 const kept=JSON.parse(await readFile(new URL('../data/location-japanese.json',import.meta.url)));
 const {showLocationDetails}=await import('../src/locations.js');
 assert.equal(Object.keys(kept).length,locations.length);
 for(const l of locations)assert.deepEqual(kept[l.id],{japanese:l.japanese,japaneseAddress:l.japaneseAddress,...(l.phone?{phone:l.phone}:{})},l.name);
 // An activity's own Japanese wording still wins over the catalogue's.
 assert.equal(showLocationDetails({locations},{place:'1 Hotel Tokyo',japanese:'ワン ホテル'}).japanese,'ワン ホテル');
});
test('asking a phone where it is rounds to the asked precision, and never waits forever',async()=>{
 const {askPhoneWhereItIs,GEO_TROUBLE}=await import('../src/geo.js');
 const {COORD_PLACES,PIN_PLACES}=await import('../src/trip-features.js');
 const phone=impl=>Object.defineProperty(globalThis,'navigator',{value:{geolocation:{getCurrentPosition:impl}},configurable:true});
 const real=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 try{
  phone(ok=>ok({coords:{latitude:35.65858051,longitude:139.74543291}}));
  // The pin is worth about eleven metres; a position sent off to be looked up is rounded harder.
  assert.deepEqual(await askPhoneWhereItIs(PIN_PLACES),{lat:35.6586,lng:139.7454});
  assert.deepEqual(await askPhoneWhereItIs(COORD_PLACES),{lat:35.659,lng:139.745});
  for(const code of [1,2,3]){
   phone((ok,fail)=>fail({code}));
   await assert.rejects(askPhoneWhereItIs(PIN_PLACES),e=>e.message===GEO_TROUBLE[code]);
  }
  phone((ok,fail)=>fail({}));
  await assert.rejects(askPhoneWhereItIs(PIN_PLACES),/could not be read/);
  // A permission sheet swiped away rather than answered never calls back, and the browser's own
  // timeout does not cover that wait — so the button has to come back by itself.
  phone(()=>{});
  await assert.rejects(askPhoneWhereItIs(PIN_PLACES,50),e=>e.message===GEO_TROUBLE[3]);
  Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
  await assert.rejects(askPhoneWhereItIs(PIN_PLACES),/cannot share its position/);
 }finally{if(real)Object.defineProperty(globalThis,'navigator',real);else delete globalThis.navigator;}
});
test('a stop pinned where the family stood is stored whole and beats every other way of saying where it is',async()=>{
 const {locations}=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url)));
 const {destinationFor,resolveLocation}=await import('../src/locations.js');const state={...seed,locations};
 const day=seed.days[0].date,pin={lat:35.6586,lng:139.7454};
 const added=applyOperation(state,{type:'add',step:{title:'The bakery on the corner',day,pin}},parent).steps.at(-1);
 assert.deepEqual(added.pin,pin);
 assert.equal(destinationFor(state,added),'35.6586,139.7454');
 // A pin outranks a name the catalogue knows: it is the spot the family actually stood on.
 const named=seed.steps.find(s=>s.place==='HARRY Harajuku Terrace');
 assert.match(destinationFor(state,named),/HARRY Harajuku Terrace/);
 const pinned=applyOperation(state,{type:'patch',id:named.id,patch:{pin}},parent).steps.find(s=>s.id===named.id);
 assert.equal(destinationFor(state,pinned),'35.6586,139.7454');
 assert.ok(resolveLocation(state,pinned));
 // Dropping the pin hands the stop back to its name.
 const cleared=applyOperation(state,{type:'patch',id:named.id,patch:{pin:null}},parent).steps.find(s=>s.id===named.id);
 assert.equal(cleared.pin,null);assert.match(destinationFor(state,cleared),/HARRY Harajuku Terrace/);
 // Half a pair, a value off the planet, or anything else wearing the same name is not a place.
 for(const bad of [{lat:35.6586},{lat:35.6586,lng:139.7454,accuracy:5},{lat:'35.6586',lng:139.7454},{lat:91,lng:139.7454},{lat:35.6586,lng:181},{lat:NaN,lng:139.7454},[35.6586,139.7454]])
  assert.throws(()=>applyOperation(state,{type:'patch',id:named.id,patch:{pin:bad}},parent),/latitude and a longitude/);
 assert.throws(()=>applyOperation(state,{type:'patch',id:named.id,patch:{pin}},child),e=>e.status===403);
});
test('every catalogue place can be shown to a taxi driver in Japanese',async()=>{
 const {locations}=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url)));
 const {showLocationDetails}=await import('../src/locations.js');const state={...seed,locations};
 const japanese=/[぀-ヿ一-龯]/;
 for(const l of locations){
  assert.match(l.japanese||'',japanese,`${l.name} has no Japanese name`);
  assert.match(l.japaneseAddress||'',japanese,`${l.name} has no Japanese address`);
  // The block number and postcode must carry over unchanged, or the driver goes to the wrong door.
  for(const n of l.address.match(/\b\d+(?:-\d+)+\b/g)||[])if(!/^\d{3}-\d{4}$/.test(n))assert.ok(l.japaneseAddress.includes(n),`${l.name}: ${n}`);
  const postcode=l.address.match(/\b(\d{3}-\d{4})\b/);if(postcode)assert.ok(l.japaneseAddress.includes(`〒${postcode[1]}`),`${l.name} postcode`);
 }
 const hotel=showLocationDetails(state,{place:'1 Hotel Tokyo',japanese:''});
 assert.equal(hotel.japanese,'1ホテル東京');assert.equal(hotel.japaneseAddress,'〒107-0052 東京都港区赤坂2-17-22');
 assert.match(hotel.address,/Akasaka/);assert.equal(hotel.phone,'03-6441-3040');
 assert.deepEqual(hotel.copyText.split('\n'),['1ホテル東京','〒107-0052 東京都港区赤坂2-17-22','TEL 03-6441-3040','1 Hotel Tokyo','2-17-22 Akasaka, Minato-ku, Tokyo 107-0052, Japan']);
 // Every hotel the family sleeps in has a number a taxi's navigation can find; an activity's own number wins.
 for(const name of new Set(seed.days.map(d=>d.hotel)))assert.match(showLocationDetails(state,{place:name}).phone,/^0\d{1,3}-\d{3,4}-\d{4}$/,name);
 assert.equal(showLocationDetails(state,{place:'1 Hotel Tokyo',phone:'03-0000-0000'}).phone,'03-0000-0000');
});
test('address matches preserve exact branches and leave ambiguous areas or station entrances alone',async()=>{
 const {locations}=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url)));
 const {resolveLocation,destinationFor,locationsForPage}=await import('../src/locations.js');const state={...seed,locations};
 assert.equal(seed.steps.filter(s=>resolveLocation(state,s)).length,186);
 const harry=resolveLocation(state,'HARRY Harajuku Terrace');assert.match(harry.name,/Terrace/);assert.doesNotMatch(harry.name,/Station Front/);
 assert.equal(resolveLocation(state,'Harajuku Tokyo'),null);assert.equal(resolveLocation(state,'Tokyo Station Yaesu entrance'),null);
 assert.equal(resolveLocation(state,'THE MATCHA TOKYO Omotesando').name,'THE MATCHA TOKYO Omotesando');
 assert.match(destinationFor(state,'Hilton Tokyo'),/6-6-2/);
 const step=seed.steps.find(s=>s.place==='HARRY Harajuku Terrace');assert.ok(locationsForPage(state,step.page).some(l=>l.id===harry.id));
 const explicit={place:'Custom meeting point',locationId:harry.id};assert.match(destinationFor(state,explicit),/HARRY Harajuku Terrace/);
 const detached={place:'Custom meeting point',locationId:null};assert.equal(destinationFor(state,detached),'Custom meeting point');
 const updated=applyOperation(state,{type:'patch',id:step.id,patch:{place:'A different meeting point'}},parent).steps.find(s=>s.id===step.id);
 assert.equal(updated.locationId,null);assert.equal(destinationFor(state,updated),'A different meeting point');
 assert.throws(()=>applyOperation(state,{type:'patch',id:step.id,patch:{locationId:'missing-location'}},parent));
});

test('ticket attachments stay grouped on edits and removal, and reject invalid parents',async()=>{
 const {ticketParent}=await import('../server/model.mjs');
 const s=structuredClone(seed);
 const root={id:'ticket-root',title:'Family entry',person:'Family',type:'note',category:'ticket',stepId:null,day:null};
 const a={id:'ticket-photo',parentDocumentId:root.id,title:'Boston QR',person:'Boston',type:'image/png',category:'ticket',stepId:null,day:null};
 s.documents=[root,a];
 assert.equal(ticketParent(root.id,s),root);
 assert.throws(()=>ticketParent(a.id,s),/existing ticket/);
 assert.throws(()=>ticketParent('missing',s),/existing ticket/);
 const edited=applyOperation(s,{type:'editDocument',id:root.id,title:'Entry booking',person:'Family',category:'reservation',stepId:seed.steps[0].id},parent);
 assert.equal(edited.documents[1].stepId,seed.steps[0].id);
 assert.equal(edited.documents[1].category,'reservation');
 assert.equal(edited.documents[1].person,'Boston');
 const relabel=applyOperation(edited,{type:'editDocument',id:a.id,title:'Nate QR',person:'Nate',category:'other'},parent);
 assert.equal(relabel.documents[1].person,'Nate');
 assert.equal(relabel.documents[1].category,'reservation');
 assert.equal(relabel.documents[1].stepId,seed.steps[0].id);
 assert.equal(applyOperation(s,{type:'removeDocument',id:a.id},parent).documents.length,1);
 assert.equal(applyOperation(s,{type:'removeDocument',id:root.id},parent).documents.length,0);
 assert.throws(()=>applyOperation(s,{type:'removeDocument',id:root.id},child),AppError);
});

test('a used ticket is archived rather than deleted: it and its files leave the list, the offline download and the strip, and come back whole',async()=>{
 const {ticketList,isArchived,offlineManifest,searchTrip}=await import('../src/trip-features.js');
 const s=structuredClone(seed);
 const day=seed.days[0].date,step=seed.steps.find(x=>x.day===day);
 const root={id:'ticket-root',title:'Skyliner seats',person:'Family',type:'application/pdf',pathname:'tickets/skyliner.pdf',category:'ticket',stepId:step.id,day:null};
 const file={id:'ticket-photo',parentDocumentId:root.id,title:'Boston QR',person:'Boston',type:'image/png',pathname:'tickets/qr.png',category:'ticket',stepId:step.id,day:null};
 const other={id:'ticket-other',title:'Hotel booking',person:'Family',type:'note',category:'reservation',stepId:null,day:null};
 s.documents=[root,file,other];
 assert.equal(ticketList(s).length,2);
 assert.equal(ticketList(s,{archived:true}).length,0);

 const used=applyOperation(s,{type:'archiveDocument',id:root.id,archived:true},parent);
 const [archivedRoot,archivedFile]=used.documents;
 assert.ok(isArchived(archivedRoot)&&isArchived(archivedFile),'the ticket and its files are archived together');
 assert.equal(archivedRoot.archivedBy,'Damien');
 assert.deepEqual(ticketList(used).map(d=>d.id),['ticket-other']);
 assert.deepEqual(ticketList(used,{archived:true}).map(d=>d.id),['ticket-root']);
 // Filters still apply to the used pile, so the count beside the toggle is the list it opens.
 assert.equal(ticketList(used,{archived:true,person:'Boston'}).length,1);
 assert.equal(ticketList(used,{archived:true,category:'reservation'}).length,0);
 assert.equal(ticketList(used,{archived:true,search:'skyliner'}).length,1);
 // Nothing archived is downloaded for the day it belonged to, and nothing is lost either.
 assert.equal(offlineManifest(s,day).files.filter(f=>f.key.startsWith('doc-')).length,2);
 assert.equal(offlineManifest(used,day).files.filter(f=>f.key.startsWith('doc-')).length,0);
 assert.equal(used.documents.length,3);
 assert.equal(searchTrip(used,'Skyliner').find(h=>h.document)?.type,'Used ticket');
 assert.equal(searchTrip(used,'Hotel booking').find(h=>h.document)?.type,'Document');
 assert.equal(used.history[0].title,'Skyliner seats');
 assert.equal(used.alerts.length,(s.alerts||[]).length,'archiving a used ticket does not wake the family');

 const back=applyOperation(used,{type:'archiveDocument',id:root.id,archived:false},parent);
 assert.ok(back.documents.every(d=>!isArchived(d)));
 assert.deepEqual(ticketList(back).map(d=>d.id),['ticket-root','ticket-other']);

 assert.throws(()=>applyOperation(s,{type:'archiveDocument',id:root.id,archived:true},child),e=>e.status===403);
 assert.throws(()=>applyOperation(s,{type:'archiveDocument',id:'missing',archived:true},parent),e=>e.status===404);
 assert.throws(()=>applyOperation(s,{type:'archiveDocument',id:file.id,archived:true},parent),/its files go with it/);
 assert.throws(()=>applyOperation(s,{type:'archiveDocument',id:root.id},parent),/archive change/);
 const memory={...structuredClone(s),documents:[{id:'memory-1',title:'Nate at the gate',person:'Nate',type:'image/png',category:'memory'}]};
 assert.throws(()=>applyOperation(memory,{type:'archiveDocument',id:'memory-1',archived:true},parent),/gallery/);
});

test('ticking off an activity ticks off the bookings that got us in, and undoing it brings them back',async()=>{
 const {ticketList,isArchived,pendingProgress}=await import('../src/trip-features.js');
 const s=structuredClone(seed);
 const step=seed.steps.find(x=>x.day===seed.days[0].date),other=seed.steps.find(x=>x.id!==step.id&&x.day);
 const root={id:'gate',title:'Skyliner seats',person:'Family',type:'application/pdf',pathname:'tickets/skyliner.pdf',category:'ticket',stepId:step.id,day:null};
 const file={id:'gate-photo',parentDocumentId:root.id,title:'Boston QR',person:'Boston',type:'image/png',pathname:'tickets/qr.png',category:'ticket',stepId:step.id,day:null};
 const byHand={id:'bag',title:'Blue suitcase tag',person:'Family',type:'note',category:'luggage',stepId:step.id,day:null};
 const elsewhere={id:'dinner',title:'Dinner booking',person:'Family',type:'note',category:'reservation',stepId:other.id,day:null};
 const memory={id:'photo',title:'Nate at the gate',person:'Nate',type:'image/png',pathname:'memories/nate.png',category:'memory',stepId:step.id,day:null};
 s.documents=[root,file,byHand,elsewhere,memory];
 // A ticket the family had already put away by hand is left where they put it.
 const prepared=applyOperation(s,{type:'archiveDocument',id:byHand.id,archived:true},parent);
 const done=applyOperation(prepared,{type:'status',id:step.id,status:'done'},parent);
 const doc=id=>done.documents.find(d=>d.id===id);
 assert.ok(isArchived(doc('gate'))&&isArchived(doc('gate-photo')),'the booking and its files go together');
 assert.equal(doc('gate').archivedWith,step.id);
 assert.equal(doc('gate').archivedBy,'Damien');
 assert.equal(doc('gate').archivedAt,done.steps.find(x=>x.id===step.id).completedAt);
 assert.equal(doc('bag').archivedWith,null,'one archived by hand is not claimed by the activity');
 assert.ok(!isArchived(doc('dinner')),'another activity’s booking is untouched');
 assert.ok(!isArchived(doc('photo')),'a memory is not a ticket and is never ticked off');
 assert.deepEqual(ticketList(done).map(d=>d.id),['dinner']);

 const undone=applyOperation(done,{type:'status',id:step.id,status:'todo'},parent);
 assert.ok(!isArchived(undone.documents.find(d=>d.id==='gate')),'undoing the activity brings its tickets back');
 assert.ok(!isArchived(undone.documents.find(d=>d.id==='gate-photo')));
 assert.equal(undone.documents.find(d=>d.id==='gate').archivedWith,null);
 assert.ok(isArchived(undone.documents.find(d=>d.id==='bag')),'and leaves the hand-archived one where it was');
 // Put back by hand while the activity stays done, and it stays back.
 const kept=applyOperation(done,{type:'archiveDocument',id:root.id,archived:false},parent);
 assert.equal(kept.documents.find(d=>d.id==='gate').archivedWith,null);

 // Skipping is not using: a booking for something we did not do stays on the list.
 assert.ok(!isArchived(applyOperation(s,{type:'status',id:step.id,status:'skipped'},parent).documents.find(d=>d.id==='gate')));
 // The boys tick activities off too, and the ticket they walked through goes with it.
 const byChild=applyOperation(s,{type:'status',id:step.id,status:'done'},child);
 assert.equal(byChild.documents.find(d=>d.id==='gate').archivedBy,'Nate');

 // The same thing happens on a phone with no signal, rather than waiting for the sync.
 const at='2026-09-24T02:00:00.000Z';
 const offline=pendingProgress(s,[{operation:{type:'status',id:step.id,status:'done',at}}]);
 assert.equal(offline.documents.find(d=>d.id==='gate').archivedAt,at);
 assert.deepEqual(ticketList(offline).map(d=>d.id),['dinner'],'everything that activity got us into leaves the list at once');
 assert.ok(!isArchived(pendingProgress(offline,[{operation:{type:'status',id:step.id,status:'todo',at}}]).documents.find(d=>d.id==='gate')));
});

test('daily thank-you notes schedule one note per trip day, honour pins and reorder',async()=>{
 const {ensureFeatures,thankYouSchedule,thankYouForDay,thankYouNotes,thankYouSpares,initialThankYou}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 assert.equal(initialThankYou().length,20);
 assert.equal(state.thankYou.messages.length,20);
 const schedule=thankYouSchedule(state);
 assert.equal(schedule.length,state.days.length);
 assert.deepEqual(schedule.map(e=>e.day),state.days.map(d=>d.date));
 assert.ok(schedule.every(e=>e.message&&e.message.text));
 assert.equal(new Set(schedule.map(e=>e.message.id)).size,state.days.length);
 assert.equal(thankYouSpares(state).length,20-state.days.length);
 assert.equal(thankYouForDay(state,'2099-01-01'),null);

 const last=thankYouNotes(state).at(-1);
 const pinned=applyOperation(state,{type:'thankYouEdit',id:last.id,text:last.text,day:'2026-09-21'},parent);
 assert.equal(thankYouForDay(pinned,'2026-09-21').id,last.id);
 assert.throws(()=>applyOperation(pinned,{type:'thankYouAdd',text:'Clash',day:'2026-09-21'},parent),/already has a note/);

 const first=thankYouNotes(state)[0],second=thankYouNotes(state)[1];
 const swapped=applyOperation(state,{type:'thankYouReorder',ids:[second.id,first.id,...thankYouNotes(state).slice(2).map(m=>m.id)]},parent);
 assert.equal(thankYouForDay(swapped,state.days[0].date).id,second.id);
 assert.throws(()=>applyOperation(state,{type:'thankYouReorder',ids:[first.id]},parent),/Reload before reordering/);

 const added=applyOperation(state,{type:'thankYouAdd',text:'  A brand new note.  '},parent);
 assert.equal(thankYouNotes(added).at(-1).text,'A brand new note.');
 assert.throws(()=>applyOperation(state,{type:'thankYouAdd',text:'   '},parent),/1–1200/);
 assert.throws(()=>applyOperation(state,{type:'thankYouEdit',id:'missing',text:'Hello'},parent),e=>e.status===404);
 const removed=applyOperation(state,{type:'thankYouRemove',id:first.id},parent);
 assert.equal(removed.thankYou.messages.length,19);
 assert.equal(thankYouForDay(removed,state.days[0].date).id,second.id);
});

test('only Damien writes the notes, only Lauren marks one read, and they never reach the boys',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {visibleTrip}=await import('../server/visibility.mjs');
 const lauren={name:'Lauren',role:'parent'},boston={name:'Boston',role:'child'};
 const state=ensureFeatures(structuredClone(seed)),note=state.thankYou.messages[0];
 for(const op of [{type:'thankYouAdd',text:'Mine now'},{type:'thankYouEdit',id:note.id,text:'Rewritten'},{type:'thankYouRemove',id:note.id},{type:'thankYouReorder',ids:state.thankYou.messages.map(m=>m.id)}]){
  assert.throws(()=>applyOperation(state,op,lauren),e=>e.status===403);
  assert.throws(()=>applyOperation(state,op,boston),e=>e.status===403);
 }
 assert.throws(()=>applyOperation(state,{type:'thankYouSeen',day:seed.days[0].date},parent),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'thankYouSeen',day:seed.days[0].date},boston),e=>e.status===403);
 const read=applyOperation(state,{type:'thankYouSeen',day:seed.days[0].date},lauren);
 assert.ok(read.thankYou.seen[seed.days[0].date]);
 assert.throws(()=>applyOperation(state,{type:'thankYouSeen',day:'2099-01-01'},lauren),/trip day/);

 // Private: no family alert, no shared history entry.
 const written=applyOperation(state,{type:'thankYouAdd',text:'A quiet note'},parent);
 assert.equal(written.alerts.length,state.alerts.length);
 assert.equal((written.history||[]).length,(state.history||[]).length);
 assert.equal(read.alerts.length,state.alerts.length);

 // Redaction: Damien keeps the list, Lauren gets only the current day, the boys get nothing.
 const onTrip=new Date(`${seed.days[1].date}T09:00:00+09:00`),offTrip=new Date('2026-08-01T09:00:00+09:00');
 assert.equal(visibleTrip(read,parent,onTrip).thankYou.messages.length,20);
 const hers=visibleTrip(read,lauren,onTrip);
 assert.equal(hers.thankYou.messages,undefined);
 assert.equal(hers.thankYou.today.day,seed.days[1].date);
 assert.equal(hers.thankYou.today.text,state.thankYou.messages[1].text);
 assert.ok(hers.thankYou.seen[seed.days[0].date]);
 assert.equal(visibleTrip(read,lauren,offTrip).thankYou.today,null);
 for(const person of [boston,{name:'Nate',role:'child'}]){
  const theirs=visibleTrip(read,person,onTrip);
  assert.deepEqual(theirs.thankYou,{seen:{},today:null});
  assert.equal(JSON.stringify(theirs).includes(state.thankYou.messages[1].text),false);
 }
 // Redacted state must not re-seed the list when the phone normalises it.
 assert.equal(ensureFeatures(visibleTrip(read,boston,onTrip)).thankYou.messages,undefined);
 assert.equal(ensureFeatures(hers).thankYou.messages,undefined);
});

test('the full-screen ticket viewer groups a ticket with its attached files, skipping notes and links',async()=>{
 const {attachmentGroup}=await import('../src/trip-features.js');
 const photoTicket={id:'root-photo',pathname:'a',type:'image/png'};
 const one={id:'a1',parentDocumentId:'root-photo',pathname:'b',type:'image/jpeg'};
 const two={id:'a2',parentDocumentId:'root-photo',pathname:'c',type:'application/pdf'};
 const writtenTicket={id:'root-note',type:'note'};
 const noteChild={id:'a3',parentDocumentId:'root-note',pathname:'d',type:'image/png'};
 const linkDoc={id:'link',type:'link',url:'https://example.com'};
 const other={id:'elsewhere',pathname:'e',type:'image/png'};
 const docs=[photoTicket,one,two,writtenTicket,noteChild,linkDoc,other];
 // The ticket leads, then its own files, in order, and nothing from another ticket.
 assert.deepEqual(attachmentGroup(docs,photoTicket).map(d=>d.id),['root-photo','a1','a2']);
 assert.deepEqual(attachmentGroup(docs,two).map(d=>d.id),['root-photo','a1','a2']);
 // A ticket held as written details has no file of its own, so only its attachments are shown.
 assert.deepEqual(attachmentGroup(docs,noteChild).map(d=>d.id),['a3']);
 // A lone file and an unknown document still give a single, navigable entry.
 assert.deepEqual(attachmentGroup(docs,other).map(d=>d.id),['elsewhere']);
 assert.deepEqual(attachmentGroup(docs,{id:'gone',pathname:'z'}).map(d=>d.id),['gone']);
 assert.deepEqual(attachmentGroup(docs,null),[]);
});

test('the viewer reads the whole Tickets page as one strip, ticket after ticket',async()=>{
 const {attachmentReel}=await import('../src/trip-features.js');
 const flight={id:'flight',title:'Flights',pathname:'a',type:'application/pdf'};
 const boarding={id:'boarding',parentDocumentId:'flight',pathname:'b',type:'image/png'};
 const dinner={id:'dinner',title:'Dinner',type:'note'};
 const dinnerShot={id:'dinner-shot',parentDocumentId:'dinner',pathname:'c',type:'image/jpeg'};
 const bagTag={id:'bag',title:'Blue bag',type:'link',url:'https://example.com'};
 const park={id:'park',title:'Disney',pathname:'d',type:'image/png'};
 const loose={id:'loose',title:'Somewhere else',pathname:'e',type:'image/png'};
 const docs=[flight,boarding,dinner,dinnerShot,bagTag,park,loose];
 const listed=[flight,dinner,bagTag,park];
 // Each ticket's own file first, then its attachments, then straight on into the next ticket,
 // in the order the page is listing them. A link holds no file, so it is not a page in between.
 const reel=attachmentReel(docs,listed,flight);
 assert.deepEqual(reel.map(e=>e.file.id),['flight','boarding','dinner-shot','park']);
 assert.deepEqual(reel.map(e=>e.ticket.id),['flight','flight','dinner','park']);
 // Opening an attachment reads the same strip, so Previous still reaches the ticket before it.
 assert.deepEqual(attachmentReel(docs,listed,dinnerShot).map(e=>e.file.id),['flight','boarding','dinner-shot','park']);
 // A file whose ticket is not on the page - it was filtered away underneath the viewer - keeps
 // its own ticket's set rather than emptying out.
 assert.deepEqual(attachmentReel(docs,listed,loose).map(e=>e.file.id),['loose']);
 assert.deepEqual(attachmentReel(docs,[],flight).map(e=>e.file.id),['flight','boarding']);
 // Nothing listed and nothing open is an empty strip, not a crash.
 assert.deepEqual(attachmentReel(docs,[],null),[]);
});

test('read receipts report whether Lauren opened each note, and when she opened it late',async()=>{
 const {noteReadState}=await import('../src/trip-features.js');
 const today='2026-09-25';
 // Opened during the day it was scheduled for.
 const sameDay=noteReadState('2026-09-23',{'2026-09-23':'2026-09-23T00:14:00Z'},today);
 assert.equal(sameDay.read,true);assert.equal(sameDay.readDay,'2026-09-23');assert.equal(sameDay.late,false);
 assert.equal(sameDay.when.toISOString(),'2026-09-23T00:14:00.000Z');
 // Opened after midnight in Japan: still that day's note, but reported against the day she read it.
 const late=noteReadState('2026-09-23',{'2026-09-23':'2026-09-23T22:30:00Z'},today);
 assert.equal(late.read,true);assert.equal(late.readDay,'2026-09-24');assert.equal(late.late,true);
 // A day that is late in UTC but still the same Japan day is not counted as late.
 assert.equal(noteReadState('2026-09-23',{'2026-09-23':'2026-09-23T14:00:00Z'},today).late,false);
 // Not opened: past, current and future days are distinguished.
 assert.deepEqual(noteReadState('2026-09-23',{},today).pending,'missed');
 assert.deepEqual(noteReadState(today,{},today).pending,'today');
 assert.deepEqual(noteReadState('2026-09-28',{},today).pending,'waiting');
 for(const day of ['2026-09-23',today,'2026-09-28']){
  const s=noteReadState(day,{},today);assert.equal(s.read,false);assert.equal(s.when,null);assert.equal(s.late,false);
 }
 assert.equal(noteReadState('2026-09-23',undefined,today).read,false);
});

test('each boy gets three day-specific missions on every trip day',async()=>{
 const {initialChallenges,DAY_MISSIONS,BOYS}=await import('../src/trip-features.js');
 const challenges=initialChallenges(seed.days);
 assert.equal(new Set(challenges.map(c=>c.id)).size,challenges.length);
 for(const d of seed.days)for(const boy of BOYS){
  const mine=challenges.filter(c=>c.day===d.date&&c.participants[0]===boy);
  assert.equal(mine.length,3,`${d.date} ${boy}`);
  for(const c of mine){assert.ok(c.title.trim());assert.ok(c.notes.trim());assert.deepEqual(c.participants,[boy]);}
  // Nate and Boston get different work on the same day.
  const other=challenges.filter(c=>c.day===d.date&&c.participants[0]!==boy).map(c=>c.title);
  assert.ok(mine.every(c=>!other.includes(c.title)),`${d.date} shares a title`);
 }
 // Missions are written per day, not recycled.
 assert.equal(Object.keys(DAY_MISSIONS).length,seed.days.length);
 assert.equal(challenges.filter(c=>c.day).length,seed.days.length*2*3);
 assert.equal(challenges.filter(c=>!c.day).length,12);
});

test('the fuller mission set is added once without losing completions or parent challenges',async()=>{
 const {ensureFeatures,seededChallenges,MISSION_SEED}=await import('../src/trip-features.js');
 const day=seed.days[0].date;
 const old={
  challenges:[
   {id:`mission-${day}-Nate`,title:'Old mission Nate did',notes:'x',day,participants:['Nate'],completions:{Nate:'2026-09-21T02:00:00Z'},responses:{Nate:'I found it'}},
   {id:`mission-${day}-Boston`,title:'Old mission nobody did',notes:'x',day,participants:['Boston'],completions:{}},
   {id:'quest-Nate-0',title:'Existing quest',notes:'x',day:null,participants:['Nate'],completions:{Nate:'2026-09-22T02:00:00Z'}},
   {id:'custom-1',title:'A challenge Damien wrote',notes:'x',day,participants:['Nate'],completions:{}}],
  days:seed.days};
 const merged=seededChallenges(old),ids=merged.challenges.map(c=>c.id);
 assert.equal(merged.missionSeed,MISSION_SEED);
 // Completed work, discovery notes and parent-written challenges all survive.
 const kept=merged.challenges.find(c=>c.id===`mission-${day}-Nate`);
 assert.equal(kept.completions.Nate,'2026-09-21T02:00:00Z');assert.equal(kept.responses.Nate,'I found it');
 assert.ok(ids.includes('custom-1'));
 assert.equal(merged.challenges.find(c=>c.id==='quest-Nate-0').title,'Existing quest');
 // The superseded single mission nobody completed is dropped, and the new sets arrive.
 assert.ok(!ids.includes(`mission-${day}-Boston`));
 for(const n of [1,2,3])for(const boy of ['Nate','Boston'])assert.ok(ids.includes(`mission-${day}-${boy}-${n}`));
 // Running again changes nothing, and a fresh trip seeds straight to the new set.
 assert.deepEqual(seededChallenges({...old,...merged}).challenges.map(c=>c.id),ids);
 assert.equal(ensureFeatures(structuredClone(seed)).challenges.length,seed.days.length*6+12);
 assert.equal(ensureFeatures(structuredClone(seed)).missionSeed,MISSION_SEED);
});

test('every mission carries a picture, and the shape-based ones carry a diagram',async()=>{
 const {initialChallenges,EXTRA_MISSIONS,BOYS}=await import('../src/trip-features.js');
 const {hasMissionArt}=await import('../src/MissionArt.jsx').catch(()=>({hasMissionArt:null}));
 const challenges=initialChallenges(seed.days);
 for(const c of challenges)assert.ok(c.icon&&[...c.icon].length<=2,`${c.title} has no picture`);
 for(const boy of BOYS)for(const [title,notes,icon] of EXTRA_MISSIONS[boy]){assert.ok(title&&notes&&icon,title);}
 const drawn=challenges.filter(c=>c.diagram);
 assert.deepEqual([...new Set(drawn.map(c=>c.diagram))].sort(),['arch','bamboo','crossing','paw','scoreboard','top','torii']);
 // Diagrams are for the five-year-old, where the shape is the point.
 assert.ok(drawn.every(c=>c.participants[0]==='Nate'));
 if(hasMissionArt)for(const c of drawn)assert.ok(hasMissionArt(c.diagram),`no art for ${c.diagram}`);
});

test('a boy can skip his own mission and bring it back, but cannot touch his brother’s',async()=>{
 const {ensureFeatures,pendingProgress}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const nate={name:'Nate',role:'child'},boston={name:'Boston',role:'child'};
 const id='mission-2026-09-22-Nate-2',at='2026-09-19T01:00:00.000Z';
 const skipped=applyOperation(state,{type:'challengeSkip',id,person:'Nate',done:true,at},nate);
 assert.equal(skipped.challenges.find(c=>c.id===id).skips.Nate,at);
 // Skipping clears any tick, and bringing it back clears the skip.
 const ticked=applyOperation(state,{type:'challengeStatus',id,person:'Nate',done:true},nate);
 const thenSkipped=applyOperation(ticked,{type:'challengeSkip',id,person:'Nate',done:true},nate);
 assert.equal(thenSkipped.challenges.find(c=>c.id===id).completions.Nate,undefined);
 assert.deepEqual(applyOperation(skipped,{type:'challengeSkip',id,person:'Nate',done:false},nate).challenges.find(c=>c.id===id).skips,{});
 // Only your own, and a parent may skip for either boy.
 assert.throws(()=>applyOperation(state,{type:'challengeSkip',id,person:'Nate',done:true},boston),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'challengeSkip',id,person:'Boston',done:true},boston),e=>e.status===403);
 assert.ok(applyOperation(state,{type:'challengeSkip',id,person:'Nate',done:true},parent));
 assert.throws(()=>applyOperation(state,{type:'challengeSkip',id:'missing',person:'Nate',done:true},nate),e=>e.status===404);
 assert.throws(()=>applyOperation(state,{type:'challengeSkip',id,person:'Nate',done:'yes'},nate),/Invalid skip/);
 // A skip made offline shows immediately on the phone.
 const pending=pendingProgress(state,[{operation:{type:'challengeSkip',id,person:'Nate',done:true,at}}]);
 assert.equal(pending.challenges.find(c=>c.id===id).skips.Nate,at);
 assert.equal(state.challenges.find(c=>c.id===id).skips.Nate,undefined);
});

test('asking for a different mission draws a fresh one, up to a daily limit',async()=>{
 const {ensureFeatures,EXTRA_MISSIONS,GENERATED_PER_DAY,generatedMissions}=await import('../src/trip-features.js');
 let state=ensureFeatures(structuredClone(seed));
 const day='2026-09-22',nate={name:'Nate',role:'child'},boston={name:'Boston',role:'child'};
 for(let i=0;i<GENERATED_PER_DAY;i++)state=applyOperation(state,{type:'challengeNew',day,person:'Nate'},nate);
 const extra=generatedMissions(state,day,'Nate');
 assert.equal(extra.length,GENERATED_PER_DAY);
 // Each draw is a different mission, drawn from the reserve pool, and belongs to that boy alone.
 assert.equal(new Set(extra.map(c=>c.title)).size,GENERATED_PER_DAY);
 for(const c of extra){
  assert.ok(EXTRA_MISSIONS.Nate.some(([title])=>title===c.title));
  assert.deepEqual(c.participants,['Nate']);assert.equal(c.day,day);assert.ok(c.icon);assert.ok(c.generated);
 }
 assert.throws(()=>applyOperation(state,{type:'challengeNew',day,person:'Nate'},nate),/3 new missions/);
 // Boston's own count is separate, and his draws come from his own pool.
 const forBoston=applyOperation(state,{type:'challengeNew',day,person:'Boston'},boston);
 assert.ok(EXTRA_MISSIONS.Boston.some(([title])=>title===generatedMissions(forBoston,day,'Boston')[0].title));
 // You cannot draw for someone else, or onto a day that is not on the trip.
 assert.throws(()=>applyOperation(state,{type:'challengeNew',day,person:'Boston'},nate),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'challengeNew',day,person:'Damien'},parent),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'challengeNew',day:'2099-01-01',person:'Nate'},parent),/trip day/);
});

test('a phone number becomes a dialable link, and a WhatsApp link when the country is known',async()=>{
 const {phoneLinks}=await import('../src/trip-features.js');
 // Written the Japanese way: the leading 0 is replaced by +81.
 const local=phoneLinks('03-1234-5678');
 assert.equal(local.tel,'tel:+81312345678');
 assert.equal(local.whatsapp,'https://wa.me/81312345678');
 assert.equal(local.international,'+81312345678');
 assert.equal(local.assumed,true);
 assert.equal(local.written,'03-1234-5678');
 // Written with a country code: taken as given, and never flagged as assumed.
 for(const written of ['+81 3 1234 5678','0081 3 1234 5678','+81(3)1234-5678']){
  const given=phoneLinks(written);
  assert.equal(given.whatsapp,'https://wa.me/81312345678',written);
  assert.equal(given.assumed,false,written);
 }
 // An Australian number written without its code is the case the flag exists for.
 const au=phoneLinks('0412 345 678');
 assert.equal(au.assumed,true);
 assert.equal(phoneLinks('+61 412 345 678').assumed,false);
 assert.equal(phoneLinks('+61 412 345 678').whatsapp,'https://wa.me/61412345678');
 // Too short to be an international number: still dialable, but no WhatsApp link offered.
 assert.equal(phoneLinks('12345').whatsapp,null);
 assert.equal(phoneLinks('12345').tel,'tel:12345');
 for(const empty of ['','   ','no digits here',null,undefined])assert.equal(phoneLinks(empty),null,String(empty));
 // The activity editor stores it, and the server rejects anything that is not a number.
 const s=structuredClone(seed),id=s.steps[0].id;
 assert.equal(applyOperation(s,{type:'patch',id,patch:{phone:'+81 3 1234 5678'}},parent).steps[0].phone,'+81 3 1234 5678');
 assert.equal(applyOperation(s,{type:'patch',id,patch:{phone:''}},parent).steps[0].phone,'');
 for(const bad of ['call me maybe','<script>',123])assert.throws(()=>applyOperation(s,{type:'patch',id,patch:{phone:bad}},parent),/phone number|too long/i,String(bad));
});

test('I spy runs on the Shinkansen legs, per boy, and points Fuji the right way',async()=>{
 const {ensureFeatures,pendingProgress,EYE_SPY,isTrainLeg,trainLegs,fujiSide,eyeSpySpotted,eyeSpyHint}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const nate={name:'Nate',role:'child'},boston={name:'Boston',role:'child'};
 const legs=trainLegs(state);
 assert.equal(legs.length,2);
 assert.deepEqual(legs.map(l=>l.title),['Nozomi 33 to Kyoto','Nozomi 250 to Tokyo']);
 assert.ok(!isTrainLeg(state.steps.find(s=>s.title==='Taxi to Tokyo Station')));
 assert.ok(!isTrainLeg(null)&&!isTrainLeg(undefined));
 // Fuji is south of the line: right heading west, left coming back.
 assert.equal(fujiSide(legs[0]),'right');
 assert.equal(fujiSide(legs[1]),'left');
 assert.match(eyeSpyHint(EYE_SPY[0],legs[1]),/on the left/);
 assert.match(eyeSpyHint(EYE_SPY[0],legs[0]),/out of Tokyo/);
 assert.match(eyeSpyHint(EYE_SPY[0],legs[1]),/before we reach Tokyo/);
 for(const leg of legs)for(const item of EYE_SPY)assert.doesNotMatch(eyeSpyHint(item,leg),/\{/,item.id);
 assert.equal(new Set(EYE_SPY.map(i=>i.id)).size,EYE_SPY.length);
 for(const item of EYE_SPY){assert.ok(item.icon&&item.title);assert.equal(typeof item.hint,'string');}

 const leg=legs[0].id,at='2026-09-19T03:00:00.000Z';
 const spotted=applyOperation(state,{type:'eyeSpy',stepId:leg,item:'fuji',person:'Nate',done:true,at},nate);
 assert.deepEqual(eyeSpySpotted(spotted,leg,'Nate').map(i=>i.id),['fuji']);
 // Each boy keeps his own list, on each leg separately.
 assert.equal(eyeSpySpotted(spotted,leg,'Boston').length,0);
 assert.equal(eyeSpySpotted(spotted,legs[1].id,'Nate').length,0);
 assert.equal(eyeSpySpotted(applyOperation(spotted,{type:'eyeSpy',stepId:leg,item:'fuji',person:'Nate',done:false},nate),leg,'Nate').length,0);
 // Only your own list; a parent may tick for either boy.
 assert.throws(()=>applyOperation(state,{type:'eyeSpy',stepId:leg,item:'fuji',person:'Boston',done:true},nate),e=>e.status===403);
 assert.ok(applyOperation(state,{type:'eyeSpy',stepId:leg,item:'fuji',person:'Boston',done:true},parent));
 // Only real legs and real things to spot.
 assert.throws(()=>applyOperation(state,{type:'eyeSpy',stepId:state.steps[0].id,item:'fuji',person:'Nate',done:true},nate),/train leg/);
 assert.throws(()=>applyOperation(state,{type:'eyeSpy',stepId:leg,item:'dragon',person:'Nate',done:true},nate),/Unknown thing/);
 assert.throws(()=>applyOperation(state,{type:'eyeSpy',stepId:leg,item:'fuji',person:'Damien',done:true},parent),e=>e.status===403);
 // A tunnel has no signal, so ticks queue on the phone and show straight away.
 const pending=pendingProgress(state,[{operation:{type:'eyeSpy',stepId:leg,item:'tunnel',person:'Nate',done:true,at}}]);
 assert.deepEqual(eyeSpySpotted(pending,leg,'Nate').map(i=>i.id),['tunnel']);
 assert.equal(eyeSpySpotted(state,leg,'Nate').length,0);
});

test('the ride checklists cover the three park days and match the itinerary',async()=>{
 const {PARKS,parkForDay,findRide,allRides,parkLands,ridePlanned}=await import('../src/park-data.js');
 const {ensureFeatures}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 assert.deepEqual(PARKS.map(p=>p.day),['2026-09-25','2026-09-30','2026-10-01']);
 for(const park of PARKS){
  assert.ok(seed.days.some(d=>d.date===park.day),park.name);
  assert.equal(parkForDay(park.day).id,park.id);
  assert.ok(park.rides.length>=15,park.name);
  assert.ok(parkLands(park).length>=4,park.name);
  for(const r of park.rides){
   assert.ok(r.id.startsWith(park.id+'-')&&r.name&&r.land&&r.note,r.id);
   assert.ok(r.height===null||(Number.isInteger(r.height)&&r.height>=80&&r.height<=140),`${r.id} height`);
   assert.ok(park.site.startsWith('https://')&&park.app.startsWith('https://'));
  }
  // Each park's checklist recognises the rides already booked into that day.
  assert.ok(park.rides.filter(r=>ridePlanned(state,park,r)).length>=4,`${park.name} matched too few planned rides`);
 }
 assert.equal(new Set(allRides().map(r=>r.id)).size,allRides().length);
 assert.equal(parkForDay('2026-09-22'),null);
 assert.equal(findRide('nope'),null);
 assert.equal(findRide('tds-journey').height,117);
});

test('a height turns a ride limit into a plain yes or no, per boy',async()=>{
 const {heightCheck,riddenBy,isMustDo,parkProgress}=await import('../src/trip-features.js');
 const {parkById,findRide}=await import('../src/park-data.js');
 const open=findRide('tdl-pooh'),tall=findRide('usj-minecart');
 // No limit at all.
 assert.deepEqual(heightCheck(open,'Nate',{Nate:112}),{limit:false,ok:true,label:'Everyone can ride'});
 // A limit with no height recorded yet just states the limit.
 const unknown=heightCheck(tall,'Nate',{});
 assert.equal(unknown.ok,null);assert.equal(unknown.limit,true);assert.match(unknown.label,/132cm minimum/);
 // With a height it says plainly, and by how much.
 const small=heightCheck(tall,'Nate',{Nate:112});
 assert.equal(small.ok,false);assert.equal(small.short,20);assert.equal(small.label,'20cm too short for Nate');
 const big=heightCheck(tall,'Boston',{Boston:132});
 assert.equal(big.ok,true);assert.equal(big.short,0);assert.equal(big.label,'Boston is tall enough');
 // Exactly on the limit counts as tall enough.
 assert.equal(heightCheck(tall,'Nate',{Nate:132}).ok,true);
 assert.equal(heightCheck(tall,'Nate',{Nate:131}).ok,false);
 // Reading helpers cope with an untouched trip.
 assert.deepEqual(riddenBy({},'tdl-pooh'),{});
 assert.equal(isMustDo({},'tdl-pooh'),false);
 assert.equal(parkProgress({parkRides:{}},parkById('tdl'),'Nate'),0);
});

test('ride ticks, must-do stars and heights are recorded with the right permissions',async()=>{
 const {ensureFeatures,pendingProgress,riddenBy,isMustDo,parkProgress}=await import('../src/trip-features.js');
 const {parkById}=await import('../src/park-data.js');
 const state=ensureFeatures(structuredClone(seed));
 const nate={name:'Nate',role:'child'},boston={name:'Boston',role:'child'};
 const id='tdl-pooh',at='2026-09-19T04:00:00.000Z';
 const ridden=applyOperation(state,{type:'parkRide',rideId:id,person:'Nate',done:true,at},nate);
 assert.equal(riddenBy(ridden,id).Nate,at);
 assert.equal(parkProgress(ridden,parkById('tdl'),'Nate'),1);
 assert.equal(parkProgress(ridden,parkById('tdl'),'Boston'),0);
 assert.deepEqual(riddenBy(applyOperation(ridden,{type:'parkRide',rideId:id,person:'Nate',done:false},nate),id),{});
 // A parent may tick for anyone, including themselves; a boy only for himself.
 assert.ok(applyOperation(state,{type:'parkRide',rideId:id,person:'Lauren',done:true},parent));
 assert.throws(()=>applyOperation(state,{type:'parkRide',rideId:id,person:'Boston',done:true},nate),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'parkRide',rideId:'nope',person:'Nate',done:true},nate),e=>e.status===404);
 // Starring a must-do is a parent's call, and survives a later tick.
 const starred=applyOperation(ridden,{type:'parkMust',rideId:id,must:true},parent);
 assert.equal(isMustDo(starred,id),true);
 assert.equal(riddenBy(starred,id).Nate,at);
 assert.equal(isMustDo(applyOperation(starred,{type:'parkMust',rideId:id,must:false},parent),id),false);
 assert.throws(()=>applyOperation(state,{type:'parkMust',rideId:id,must:true},nate),e=>e.status===403);
 // Heights are validated and parent-set.
 assert.deepEqual(applyOperation(state,{type:'familyHeights',heights:{Nate:112,Boston:132}},parent).heights,{Nate:112,Boston:132});
 assert.deepEqual(applyOperation(state,{type:'familyHeights',heights:{Nate:112,Boston:''}},parent).heights,{Nate:112});
 for(const bad of [{Nate:10},{Nate:300},{Nate:112.5},{Nate:'tall'}])assert.throws(()=>applyOperation(state,{type:'familyHeights',heights:bad},parent),/between 50cm and 220cm/,JSON.stringify(bad));
 assert.throws(()=>applyOperation(state,{type:'familyHeights',heights:{Nate:112}},nate),e=>e.status===403);
 // A tick made in a queue with no signal shows straight away on the phone.
 const pending=pendingProgress(state,[{operation:{type:'parkRide',rideId:'tds-soaring',person:'Boston',done:true,at}}]);
 assert.equal(riddenBy(pending,'tds-soaring').Boston,at);
 assert.deepEqual(riddenBy(state,'tds-soaring'),{});
});

test('the food list carries every dish in Japanese and English, with ordering phrases',async()=>{
 const {FOOD,FOOD_KINDS,ORDERING,FOOD_KIND_LABEL}=await import('../src/food-data.js');
 assert.ok(FOOD.length>=40);
 assert.equal(new Set(FOOD.map(f=>f.id)).size,FOOD.length);
 const japanese=/[぀-ヿ一-龯]/;
 for(const f of FOOD){
  assert.ok(f.en&&f.note,f.id);
  assert.match(f.ja,japanese,`${f.id} has no Japanese`);
  assert.ok(f.romaji&&!japanese.test(f.romaji),`${f.id} romaji`);
  assert.ok(FOOD_KINDS.some(([k])=>k===f.kind),`${f.id} kind ${f.kind}`);
 }
 // Every group is actually used, so no filter option leads to an empty list.
 for(const [k,label] of FOOD_KINDS){assert.ok(FOOD.some(f=>f.kind===k),`nothing in ${k}`);assert.equal(FOOD_KIND_LABEL(k),label);}
 // The plain fallbacks a five-year-old will need on a hard day.
 for(const id of ['gohan','poteto','teriyaki'])assert.equal(FOOD.find(f=>f.id===id).kind,'safe');
 assert.equal(new Set(ORDERING.map(o=>o.id)).size,ORDERING.length);
 for(const o of ORDERING){assert.ok(o.en&&o.romaji);assert.match(o.ja,japanese,o.id);}
 for(const id of ['nowasabi','allergy','notspicy'])assert.ok(ORDERING.some(o=>o.id===id),id);
});

test('food is ticked and rated per person, and four stars makes it a favourite',async()=>{
 const {ensureFeatures,pendingProgress,triedFood,foodRatings,foodAverage,isFavourite,FAVOURITE_AT}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const nate={name:'Nate',role:'child'},at='2026-09-19T05:00:00.000Z';
 const tried=applyOperation(state,{type:'foodTried',itemId:'tonkatsu',person:'Nate',done:true,at},nate);
 assert.equal(triedFood(tried,'tonkatsu').Nate,at);
 assert.deepEqual(triedFood(applyOperation(tried,{type:'foodTried',itemId:'tonkatsu',person:'Nate',done:false},nate),'tonkatsu'),{});
 // Rating something records that you ate it, so the two can never disagree.
 const rated=applyOperation(state,{type:'foodRating',itemId:'tonkatsu',person:'Nate',rating:5},nate);
 assert.equal(foodRatings(rated,'tonkatsu').Nate,5);
 assert.ok(triedFood(rated,'tonkatsu').Nate);
 // The card shows the family average, and four or more makes it a favourite.
 const both=applyOperation(rated,{type:'foodRating',itemId:'tonkatsu',person:'Damien',rating:4},parent);
 assert.equal(foodAverage(both,'tonkatsu'),4.5);
 assert.equal(isFavourite(both,'tonkatsu'),true);
 const mixed=applyOperation(both,{type:'foodRating',itemId:'tonkatsu',person:'Damien',rating:1},parent);
 assert.equal(foodAverage(mixed,'tonkatsu'),3);
 assert.equal(isFavourite(mixed,'tonkatsu'),false);
 assert.equal(foodAverage(state,'ramen'),null);
 assert.equal(isFavourite(state,'ramen'),false);
 assert.ok(FAVOURITE_AT===4);
 // Clearing a rating leaves the tick alone.
 const cleared=applyOperation(rated,{type:'foodRating',itemId:'tonkatsu',person:'Nate',rating:0},nate);
 assert.equal(foodRatings(cleared,'tonkatsu').Nate,undefined);
 assert.ok(triedFood(cleared,'tonkatsu').Nate);
 // Only your own, unless you are a parent, and only real dishes and real scores.
 assert.throws(()=>applyOperation(state,{type:'foodRating',itemId:'tonkatsu',person:'Boston',rating:5},nate),e=>e.status===403);
 assert.ok(applyOperation(state,{type:'foodRating',itemId:'tonkatsu',person:'Boston',rating:5},parent));
 assert.throws(()=>applyOperation(state,{type:'foodTried',itemId:'sausage-roll',person:'Nate',done:true},nate),e=>e.status===404);
 for(const bad of [6,-1,2.5,'five'])assert.throws(()=>applyOperation(state,{type:'foodRating',itemId:'ramen',person:'Nate',rating:bad},nate),/1 to 5/,String(bad));
 // A tick made with no signal shows on the phone straight away.
 const pending=pendingProgress(state,[{operation:{type:'foodRating',itemId:'ramen',person:'Nate',rating:3}},{operation:{type:'foodTried',itemId:'udon',person:'Nate',done:true,at}}]);
 assert.equal(foodRatings(pending,'ramen').Nate,3);
 assert.equal(triedFood(pending,'udon').Nate,at);
 assert.deepEqual(foodRatings(state,'ramen'),{});
});

test('a parent can add dishes the family likes, but not delete the built-in ones',async()=>{
 const {ensureFeatures,triedFood}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const nate={name:'Nate',role:'child'};
 const added=applyOperation(state,{type:'foodAdd',en:'  Chicken katsu, no sauce  ',ja:'チキンカツ ソース抜き',romaji:'chikin katsu sōsu nuki',kind:'safe',note:'Nate will eat this anywhere.'},parent);
 assert.equal(added.foodItems.length,1);
 const ours=added.foodItems[0];
 assert.equal(ours.en,'Chicken katsu, no sauce');
 assert.equal(ours.kind,'safe');
 assert.equal(ours.addedBy,'Damien');
 // Our own dishes tick and rate exactly like the built-in ones.
 assert.ok(triedFood(applyOperation(added,{type:'foodTried',itemId:ours.id,person:'Nate',done:true},nate),ours.id).Nate);
 const edited=applyOperation(added,{type:'foodEdit',id:ours.id,en:'Chicken katsu',ja:'チキンカツ',romaji:'chikin katsu',kind:'meal',note:''},parent);
 assert.equal(edited.foodItems[0].en,'Chicken katsu');
 assert.equal(applyOperation(edited,{type:'foodRemove',id:ours.id},parent).foodItems.length,0);
 // Built-in dishes belong to the app, not the family list.
 assert.throws(()=>applyOperation(added,{type:'foodRemove',id:'tonkatsu'},parent),e=>e.status===404);
 assert.throws(()=>applyOperation(added,{type:'foodEdit',id:'tonkatsu',en:'Mine now'},parent),e=>e.status===404);
 // Validation and permissions.
 assert.throws(()=>applyOperation(state,{type:'foodAdd',en:'  '},parent),/English name/);
 assert.throws(()=>applyOperation(state,{type:'foodAdd',en:'Thing',kind:'banquet'},parent),/food group/);
 assert.throws(()=>applyOperation(state,{type:'foodAdd',en:'Thing'},nate),e=>e.status===403);
 assert.throws(()=>applyOperation(added,{type:'foodRemove',id:ours.id},nate),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'foodNonsense'},parent),/Unknown food action/);
});

test('the menu reader sends a well-formed vision request and reads the answer back',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures}=await import('../src/trip-features.js');
 let seen=null;
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen={path:req.url,headers:req.headers,json:JSON.parse(body)};
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'msg_1',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'end_turn',
    usage:{input_tokens:1500,output_tokens:400},
    content:[{type:'text',text:JSON.stringify({readable:true,place:'Maisen',note:'Order the rice separately for Nate.',
     suggestions:[{ja:'ロースかつ膳',en:'Pork loin katsu set',why:'The dish this place is known for.',forWhom:['Damien','Lauren','Boston'],matchesOurList:'tonkatsu',ingredients:['Pork loin','Wheat flour','Egg','Panko'],spicy:false,heat:'none',spiceNote:'',price:'¥2,100'},
                  {ja:'白ごはん',en:'Plain rice',why:'Nate will always eat this.',forWhom:['Nate'],matchesOurList:'gohan',ingredients:['Short-grain rice'],spicy:false,heat:'none',spiceNote:'',price:''},
                  {ja:'辛味噌ラーメン',en:'Spicy miso ramen',why:'The one the parents will want.',forWhom:['Damien','Lauren'],matchesOurList:'',ingredients:['Wheat noodles','Miso','Chilli oil','Pork'],spicy:true,heat:'hot',spiceNote:'Dressed in chilli oil before it leaves the kitchen.',price:'¥1,150'}],
     avoid:[{en:'Karashi mustard',why:'Very sharp for a child.'}]})}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {readMenu,menuReaderReady}=await import('../server/menu.mjs');
  assert.equal(menuReaderReady(),true);
  let state=ensureFeatures(structuredClone(seed));
  state=applyOperation(state,{type:'foodRating',itemId:'tonkatsu',person:'Boston',rating:5},parent);
  const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const answer=await readMenu({image:`data:image/png;base64,${pixel}`,mediaType:'image/png'},state);

  // The request the SDK actually put on the wire.
  assert.equal(seen.path,'/v1/messages');
  assert.equal(seen.json.model,'claude-opus-5');
  assert.equal(seen.json.max_tokens,8000);
  assert.deepEqual(seen.json.thinking,{type:'adaptive'});
  assert.equal(seen.json.output_config.effort,'medium');
  assert.equal(seen.json.output_config.format.type,'json_schema');
  assert.equal(seen.json.output_config.format.schema.additionalProperties,false);
  assert.deepEqual(seen.json.output_config.format.schema.required,['readable','place','suggestions','avoid','note']);
  const [image,text]=seen.json.messages[0].content;
  assert.equal(image.type,'image');
  assert.equal(image.source.media_type,'image/png');
  assert.equal(image.source.data,pixel,'the data: prefix must be stripped before sending');
  // The prompt carries this family's own tastes, not a generic one.
  assert.match(seen.json.system,/Nate is five/);
  assert.match(text.text,/Loved \(4\+\): tonkatsu .*Boston 5\/5/);
  assert.match(text.text,/Still want to try:.*gohan=Plain white rice/);

  // And the answer comes back in the shape the screen expects.
  assert.equal(answer.readable,true);
  assert.equal(answer.place,'Maisen');
  assert.equal(answer.suggestions.length,3);
  // What is usually in the dish, and how hot it usually is, both come back per dish.
  assert.deepEqual(answer.suggestions[0].ingredients,['Pork loin','Wheat flour','Egg','Panko']);
  assert.equal(answer.suggestions[2].heat,'hot');
  assert.match(answer.suggestions[2].spiceNote,/chilli oil/);
  assert.deepEqual(answer.suggestions.filter(s=>s.spicy).map(s=>s.en),['Spicy miso ramen']);
  assert.equal(answer.suggestions[0].matchesOurList,'tonkatsu');
  assert.equal(answer.suggestions[1].forWhom[0],'Nate');
  assert.deepEqual(answer.usage,{input:1500,output:400});

  // Input guards, before anything is sent anywhere.
  for(const [input,pattern] of [
   [{image:'',mediaType:'image/png'},/Take or choose a photo/],
   [{image:'not base64!!',mediaType:'image/png'},/could not be read/],
   [{image:pixel,mediaType:'image/gif'},/JPEG, PNG or WebP/],
   [{image:'A'.repeat(3_000_001),mediaType:'image/png'},/too large/]
  ])await assert.rejects(()=>readMenu(input,state),pattern,JSON.stringify(input).slice(0,40));
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
});

test('every ticket gets a thumbnail: its own photo, an attached one, or a labelled tile',async()=>{
 const {documentThumbnail,isDrawable,DRAWABLE}=await import('../src/trip-features.js');
 const photo={id:'a',pathname:'x/a.png',type:'image/png'};
 const pdf={id:'b',pathname:'x/b.pdf',type:'application/pdf'};
 const note={id:'c',type:'note'};
 const link={id:'d',type:'link',url:'https://example.com'};
 const heic={id:'e',pathname:'x/e.heic',type:'image/heic'};
 const video={id:'f',pathname:'x/f.mp4',type:'video/mp4'};
 // Only the formats a browser can actually draw stand in as a picture.
 assert.deepEqual(DRAWABLE,['image/jpeg','image/png','image/webp']);
 for(const d of [photo,{...photo,type:'image/jpeg'},{...photo,type:'image/webp'}])assert.equal(isDrawable(d),true,d.type);
 for(const d of [pdf,note,link,heic,video])assert.equal(isDrawable(d),false,d.type);
 // A record with no file of its own cannot be drawn even if its type looks like an image.
 assert.equal(isDrawable({id:'g',type:'image/png'}),false);
 // A ticket that is a photo is its own thumbnail.
 assert.equal(documentThumbnail(photo,[]),photo);
 // A written tag or a PDF borrows the first drawable photo attached to it.
 assert.equal(documentThumbnail(note,[pdf,heic,photo]),photo);
 assert.equal(documentThumbnail(pdf,[photo]),photo);
 // Order matters: the first drawable attachment wins.
 const second={id:'h',pathname:'x/h.jpg',type:'image/jpeg'};
 assert.equal(documentThumbnail(note,[photo,second]),photo);
 // Nothing drawable anywhere means a tile instead, never a broken image.
 for(const attachments of [[],[pdf],[heic],[video],[pdf,heic,video]])
  assert.equal(documentThumbnail(note,attachments),null,JSON.stringify(attachments.map(a=>a.type)));
 assert.equal(documentThumbnail(heic,[]),null);
 assert.equal(documentThumbnail(video,[]),null);
 assert.equal(documentThumbnail(link,[]),null);
 // Called with no attachments argument at all.
 assert.equal(documentThumbnail(photo),photo);
 assert.equal(documentThumbnail(note),null);
});

test('the yen converter works from a shared rate, set by a parent',async()=>{
 const {ensureFeatures,yenPerAud,rateIsSet,yenToAud,audToYen,DEFAULT_YEN_PER_AUD}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const nate={name:'Nate',role:'child'};
 // Until someone sets it, an estimate is used and the app can tell that nobody has.
 assert.equal(yenPerAud(state),DEFAULT_YEN_PER_AUD);
 assert.equal(rateIsSet(state),false);
 // Conversion both ways, rounded the way money is read.
 assert.equal(yenToAud(1000,100),10);
 assert.equal(yenToAud(1280,101.37),12.63);
 assert.equal(audToYen(50,98),4900);
 assert.equal(audToYen(12.63,101.37),1280);
 // A parent sets it; everyone then converts at the same number.
 const set=applyOperation(state,{type:'exchangeRate',perAud:101.37,source:'live'},parent);
 assert.equal(yenPerAud(set),101.37);
 assert.equal(rateIsSet(set),true);
 assert.equal(set.rates.by,'Damien');
 assert.equal(set.rates.source,'live');
 assert.ok(Date.parse(set.rates.at));
 // Cents are kept: rounding the rate to a whole yen misreports every conversion.
 assert.equal(applyOperation(state,{type:'exchangeRate',perAud:98.456},parent).rates.perAud,98.46);
 assert.equal(applyOperation(state,{type:'exchangeRate',perAud:100},parent).rates.source,'manual');
 // A rate nobody could have meant is refused, and a child cannot set one.
 for(const bad of [0,0.5,1001,-20,NaN,'ninety','',null])
  assert.throws(()=>applyOperation(state,{type:'exchangeRate',perAud:bad},parent),/how many yen/,String(bad));
 assert.throws(()=>applyOperation(state,{type:'exchangeRate',perAud:100},nate),e=>e.status===403);
 // A trip saved before this feature existed still converts.
 const older=structuredClone(seed);delete older.rates;
 assert.equal(yenPerAud(ensureFeatures(older)),DEFAULT_YEN_PER_AUD);
 assert.equal(yenPerAud({}),DEFAULT_YEN_PER_AUD);
 assert.equal(yenPerAud({rates:{perAud:0}}),DEFAULT_YEN_PER_AUD);
 assert.equal(rateIsSet({rates:{perAud:100}}),false,'a rate with no timestamp is not "set"');
});

test('every screen is reachable exactly once, from the bar or from More',async()=>{
 const {PAGES,PRIMARY,MORE_SECTIONS,primaryNav,moreSections,moreIds,navActive,setAvailable}=await import('../src/nav-data.js');
 const damien={name:'Damien',role:'parent'},lauren={name:'Lauren',role:'parent'},nate={name:'Nate',role:'child'};
 // Forwarded email is only offered where a mail provider is connected to the deployment, and
 // asking about the trip only where there is a key to answer with. The rest of this is about a
 // menu with both connected, so both are switched on for the check.
 setAvailable({inbox:true,ask:true});
 for(const user of [damien,lauren,nate]){
  const bar=primaryNav(user),more=moreIds(user),all=[...bar,...more];
  // Nothing appears twice, and nothing is stranded.
  assert.equal(new Set(all).size,all.length,`${user.name} lists a page twice`);
  const expected=Object.keys(PAGES).filter(id=>(id!=='thanks'||user.name==='Damien')&&(id!=='inbox'||user.role==='parent'));
  assert.deepEqual([...all].sort(),[...expected].sort(),`${user.name} cannot reach every page`);
  // The bar holds six, plus More: Home, Today and the Itinerary, and three for whoever it is.
  assert.equal(bar.length,6,user.name);
  for(const id of all)assert.ok(PAGES[id]?.label&&PAGES[id]?.note,`${id} is missing a label or note`);
  // Sections are non-empty and the pages already in the bar are not repeated below.
  for(const [title,ids] of moreSections(user)){assert.ok(title&&ids.length);for(const id of ids)assert.ok(!bar.includes(id),`${id} is in both`);}
 }
 // Lauren's private notes belong to Damien's phone alone.
 assert.ok(moreIds(damien).includes('thanks'));
 for(const user of [lauren,nate])assert.ok(!moreIds(user).includes('thanks'),user.name);
 // Forwarded email carries bookings and whatever else an email brought with it, so it is a
 // parents' screen and the boys are never sent to it.
 assert.ok(moreIds(lauren).includes('inbox'));
 assert.ok(!moreIds(nate).includes('inbox'));
 // With no mail provider connected there is no screen about forwarding email, and with no key
 // to answer with there is no screen for asking about the trip: neither is on anyone's menu, and
 // neither is something a link or an old bar setting can reach either.
 setAvailable({inbox:false,ask:false});
 try{
  for(const user of [damien,lauren,nate])for(const id of ['inbox','ask']){
   assert.ok(!moreIds(user).includes(id),`${user.name} is offered a screen this deployment cannot use`);
   assert.ok(!primaryNav(user).includes(id),user.name);
  }
  // Everything else is still exactly where it was: hiding one page strands none of the others.
  const expected=Object.keys(PAGES).filter(id=>!['inbox','ask'].includes(id)&&(id!=='thanks'||'Damien'==='Damien'));
  assert.deepEqual([...primaryNav(damien),...moreIds(damien)].sort(),expected.sort());
 }finally{setAvailable({inbox:true,ask:true});}
 // Parents reach for tickets and prices; the boys reach for their missions.
 assert.deepEqual(PRIMARY.parent,['today','glance','days','tickets','food','money']);
 assert.deepEqual(PRIMARY.child,['today','glance','days','challenges','food','diary']);
 // And the menu is ordered by whose screen it is. The practical half — the weather on the way
 // out, the ticket at the gate, what is still to buy — is at the top, where the thumb of
 // whoever is navigating lands first. The boys' own screens are the last block, all together,
 // rather than their missions sitting between the bookings and the paperwork.
 assert.equal(MORE_SECTIONS.at(-1)[0],'For the boys');
 for(const id of ['challenges','games','spending','facts','mascot'])
  assert.ok(MORE_SECTIONS.at(-1)[1].includes(id),`${id} is the boys' and belongs at the bottom`);
 const order=MORE_SECTIONS.flatMap(([,ids])=>ids),theirs=order.indexOf('challenges');
 for(const id of ['weather','ask','places','tickets','inbox','todo','planning','shopping','guide','help'])
  assert.ok(order.indexOf(id)<theirs,`${id} is practical and belongs above the boys' block`);
 for(const user of [damien,lauren,nate])
  assert.equal(moreSections(user).at(-1)[0],'For the boys',`${user.name} is shown the boys' block last`);
 // The bug this replaces: on a sub-page nothing used to be highlighted, so you lost your place.
 for(const [tab,expected] of [['food','food'],['today','today'],['parks','more'],['guide','more'],['thanks','more'],['search','more']]){
  const lit=[...primaryNav(damien),'more'].filter(id=>navActive(tab,id,damien));
  assert.deepEqual(lit,[expected],`on ${tab}`);
 }
 // A child on their own primary page lights that, not More.
 assert.equal(navActive('challenges','challenges',nate),true);
 assert.equal(navActive('challenges','more',nate),false);
 assert.equal(navActive('tickets','more',nate),true,'tickets live under More for the boys');
});

test('each phone arranges its own menu, and nothing put away is lost',async()=>{
 const {PAGES,PRIMARY,BAR_MIN,BAR_MAX,FIXED,emptyNav,cleanNav,primaryNav,hiddenNav,moreIds,moreSections,addableNav,pagesFor,menuOrder,navActive,setAvailable}
  =await import('../src/nav-data.js');
 const damien={name:'Damien',role:'parent'},lauren={name:'Lauren',role:'parent'},nate={name:'Nate',role:'child'};
 // This is about arranging a menu, not about which screens a deployment has, so forwarded email
 // and asking about the trip are switched on rather than left to whatever an earlier test
 // happened to leave behind.
 setAvailable({inbox:true,ask:true});
 // Nobody has touched it: everything is exactly where it was before any of this existed.
 for(const user of [damien,lauren,nate]){
  assert.deepEqual(primaryNav(user,emptyNav()),primaryNav(user));
  assert.deepEqual(moreIds(user,emptyNav()),moreIds(user));
 }
 // A bar somebody set is used, in the order they set it.
 const mine={bar:['today','games','spending','challenges'],hidden:[]};
 assert.deepEqual(primaryNav(nate,mine),['today','games','spending','challenges']);
 // What comes back out of localStorage is whatever was last written there by any version of
 // this app, so everything is cleaned on the way in rather than trusted.
 assert.deepEqual(primaryNav(nate,{bar:['today','games','nothing-like-this','games','spending']}),
  ['today','games','spending'],'unknown and repeated screens are dropped');
 assert.deepEqual(primaryNav(nate,{bar:['today','days','thanks','inbox','food','diary']}),
  ['today','days','food','diary'],'and so are the ones this person is not allowed');
 assert.deepEqual(primaryNav(nate,{bar:['today','games']}),primaryNav(nate),
  'a bar that came out too short is thrown away rather than left half empty');
 assert.equal(primaryNav(damien,{bar:pagesFor(damien)}).length,BAR_MAX,'and a greedy one is trimmed');
 for(const rubbish of [null,undefined,'today',{bar:'today'},{bar:[1,2,3]},{hidden:'guide'},{bar:null,hidden:null}])
  assert.deepEqual(primaryNav(lauren,rubbish),PRIMARY.parent,`${JSON.stringify(rubbish)} took the bar down`);
 // Putting a screen away takes it off the bar and out of More, both.
 const away={bar:['today','days','tickets','food','money'],hidden:['parks','guide']};
 assert.ok(!moreIds(lauren,away).includes('parks'));
 assert.ok(!moreIds(lauren,away).includes('guide'));
 assert.deepEqual(primaryNav(lauren,{bar:['today','days','parks','food','money'],hidden:['parks']}),
  ['today','days','food','money'],'and it cannot be on the bar and away at the same time');
 assert.deepEqual(hiddenNav(lauren,away).sort(),['guide','parks']);
 // But nothing put away is lost: My menu lists it, and My menu is one of the two screens that
 // can never be put away — the other is Home, the way back from a bad arrangement.
 assert.deepEqual(FIXED,['today','personalise']);
 for(const id of FIXED){
  assert.deepEqual(hiddenNav(damien,{hidden:[id]}),[],`${id} must never be hideable`);
  assert.ok(PAGES[id],`${id} is a real screen`);
 }
 assert.ok(moreIds(nate,emptyNav()).includes('personalise'),'and every phone can reach it');
 // What is left to put on the bar is everything this person can see and has not already got.
 const spare=addableNav(damien,away);
 for(const id of primaryNav(damien,away))assert.ok(!spare.includes(id),`${id} is already on the bar`);
 for(const id of hiddenNav(damien,away))assert.ok(!spare.includes(id),`${id} was put away`);
 assert.ok(!addableNav(nate,emptyNav()).includes('inbox'),'a boy is never offered the parents’ email');
 // Sections that empty out are not left as headings with nothing under them.
 for(const [title,ids] of moreSections(lauren,away))assert.ok(title&&ids.length);
 // And whatever the bar holds, More stands in for everything it does not.
 assert.equal(navActive('games','more',nate,mine),false,'a screen on the bar lights the bar');
 assert.equal(navActive('weather','more',nate,mine),true,'and everything else lights More');
 assert.ok(BAR_MIN>=3&&BAR_MAX<=8&&BAR_MIN<BAR_MAX);
 assert.deepEqual(cleanNav(undefined,nate),{bar:null,hidden:[]});
 // Home is on the bar wherever they put it. It can be moved along the row but not off it: a
 // swipe down the bar lands on whatever is first, and that has to be somewhere to land.
 assert.deepEqual(primaryNav(lauren,{bar:['games','weather','places','food']}),
  ['today','games','weather','places','food']);
 assert.ok(primaryNav(damien,{bar:pagesFor(damien).filter(id=>id!=='today')}).includes('today'));
 // A screen put away cannot come back through the back door. Without a bar of their own the
 // one for their role is used, minus anything they put away, topped up in the order the menu
 // itself is in rather than left as two buttons and a gap.
 const bare=primaryNav(lauren,{hidden:['tickets','food','money']});
 for(const id of ['tickets','food','money'])assert.ok(!bare.includes(id),`${id} came back on the bar`);
 assert.ok(bare.length>=BAR_MIN,'and the row is never left short');
 assert.deepEqual(bare,['today','glance','days'],'Home, Today and the Itinerary still make a bar');
 const barer=primaryNav(lauren,{hidden:['glance','tickets','food','money']});
 assert.deepEqual(barer,['today','days','weather'],'topped up from the top of the menu');
 // The order things are offered in is the order they already know from More.
 const order=menuOrder(damien);
 assert.deepEqual([...new Set(order)],order,'nothing is offered twice');
 assert.deepEqual([...order].sort(),[...pagesFor(damien)].sort(),'and nothing is left out');
 assert.ok(order.indexOf('weather')<order.indexOf('games'),'the practical half first, as in More');
});

test('the bottom bar swipes up for the rest of the menu, and is the one each person arranged',async()=>{
 const nav=await readFile(new URL('../src/Navigation.jsx',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const screen=await readFile(new URL('../src/Personalise.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 const {swipeVertical,SWIPE_UP}=await import('../src/swipe.js');
 // Up for everything else, down to come back. A diagonal drag is a scroll, not a swipe, and a
 // mostly sideways one belongs to the strip of tabs, which was already swiping that way.
 assert.equal(swipeVertical({x:0,y:200},{x:0,y:200-SWIPE_UP.up-1}),1);
 assert.equal(swipeVertical({x:0,y:200},{x:0,y:200+SWIPE_UP.up+1}),-1);
 assert.equal(swipeVertical({x:0,y:200},{x:0,y:190}),0,'a nudge is not a swipe');
 assert.equal(swipeVertical({x:0,y:200},{x:SWIPE_UP.across+1,y:200-SWIPE_UP.up-1}),0,'a diagonal is a scroll');
 assert.equal(swipeVertical(null,{x:0,y:0}),0);
 assert.match(nav,/const way=swipeVertical\(from,/);
 assert.match(nav,/if\(way===1&&!moreOn\)go\('more'\);/);
 assert.match(nav,/else if\(way===-1&&moreOn\)go\(bar\[0\]\);/);
 // A gesture nobody can see is a gesture nobody uses, and it is never the only way through:
 // the handle is a button, and the More button beside it still does the same job.
 assert.match(nav,/className="nav-grip"/);
 assert.match(nav,/aria-label=\{moreOn\?'Close the menu':'Open the whole menu'\}/);
 assert.match(nav,/className=\{`nav-more\$\{moreOn\?' active':''\}`\}/);
 assert.match(css,/\.bottom-nav \.nav-grip\{position:absolute/);
 // The bar is the one this person arranged, and so is what More has left to show.
 assert.match(nav,/const bar=primaryNav\(user,prefs\);/);
 assert.match(nav,/moreSections\(user,prefs\)/);
 // Both go through navGo, which sends Today to today's date on a trip day.
 assert.match(main,/<BottomNav tab=\{tab\} user=\{user\} go=\{navGo\} prefs=\{navPrefs\}/);
 assert.match(main,/<MorePage user=\{user\} tab=\{tab\} go=\{navGo\} prefs=\{navPrefs\}>/);
 // Kept on the phone, per person, and cleaned on the way in as well as on the way out.
 assert.match(main,/localStorage\.setItem\(`japan\.nav\.\$\{user\.name\}`/);
 assert.match(main,/setNavPrefs\(cleanNav\(stored\(`japan\.nav\.\$\{user\.name\}`,emptyNav\(\)\),user\)\)/);
 // Arrows rather than dragging: a drag list fights the page scroll and needs a steady hand,
 // and the person most likely to be rearranging this is five.
 assert.match(screen,/aria-label=\{`Move \$\{PAGES\[id\]\.label\} up`\}/);
 assert.match(screen,/aria-label=\{`Move \$\{PAGES\[id\]\.label\} down`\}/);
 assert.doesNotMatch(screen,/draggable/);
 // And a way out of any arrangement at all.
 assert.match(screen,/setPrefs\(emptyNav\(\)\)/);
 assert.match(main,/tab==='personalise'&&<Personalise/);
});

test('Home is a column of widgets each phone orders and puts away for itself',async()=>{
 const {HOME_WIDGETS,HOME_DEFAULT,emptyHome,cleanHome,homeOrder,homeShown,moveWidget,toggleWidget}=await import('../src/home-widgets.js');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const screen=await readFile(new URL('../src/Personalise.jsx',import.meta.url),'utf8');
 // Untouched, Home is what it always was, in the order it always came in.
 assert.deepEqual(homeShown(emptyHome()),HOME_DEFAULT);
 assert.equal(HOME_DEFAULT[1],'step','the step card is still near the top');
 for(const id of HOME_DEFAULT)assert.ok(HOME_WIDGETS[id].label&&HOME_WIDGETS[id].note,id);
 // Moved and put away, and nothing lost: a widget put away is still in the order to come back.
 let prefs=moveWidget(emptyHome(),'weather',-10);
 assert.deepEqual(homeOrder(prefs),HOME_DEFAULT,'a move off the end does nothing');
 prefs=moveWidget(emptyHome(),'weather',-1);
 assert.equal(homeOrder(prefs).indexOf('weather'),HOME_DEFAULT.indexOf('weather')-1);
 prefs=toggleWidget(prefs,'guide');
 assert.ok(!homeShown(prefs).includes('guide'));
 assert.ok(homeOrder(prefs).includes('guide'));
 assert.ok(homeShown(toggleWidget(prefs,'guide')).includes('guide'),'and it comes back');
 // Whatever localStorage hands back is cleaned: unknown and repeated ids go, new widgets arrive.
 assert.deepEqual(cleanHome({order:['finds','nothing','finds'],hidden:['nothing','step']}),
  {order:['finds',...HOME_DEFAULT.filter(id=>id!=='finds')],hidden:['step']});
 for(const rubbish of [null,undefined,'x',{order:'x'},{hidden:'step'}])
  assert.deepEqual(homeShown(rubbish),HOME_DEFAULT,JSON.stringify(rubbish));
 // Home draws them by id, the day heading and strip stay put, and the phone keeps the choice.
 assert.match(main,/\{dayStrip\(selectDay\)\}\s*\{homeShown\(homePrefs\)\.map\(id=>/);
 for(const id of HOME_DEFAULT)assert.match(main,new RegExp(`\\n  ${id}:`),`${id} is drawn`);
 assert.match(main,/localStorage\.setItem\(`japan\.home\.\$\{user\.name\}`/);
 assert.match(main,/onClick=\{\(\)=>go\('personalise'\)\}>Customise Home<\/Button>/);
 assert.match(screen,/<HomeWidgets home=\{home\} setHome=\{setHome\}\/>/);
 assert.match(screen,/setHome\(emptyHome\(\)\)/);
});

test('Days is the Itinerary, and Today is its own tab',async()=>{
 const {PAGES,PRIMARY}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.equal(PAGES.days.label,'Itinerary');
 assert.match(PAGE_RULES.days,/^Itinerary\./);
 assert.match(main,/<h1>Our itinerary<\/h1>/);
 assert.equal(PAGES.glance.label,'Today');
 assert.match(PAGE_RULES.glance,/^Today\./);
 for(const bar of Object.values(PRIMARY))assert.deepEqual(bar.slice(0,3),['today','glance','days']);
 assert.match(main,/function navGo\(id\)\{go\(id,id==='glance'&&[^}]*japanDate\(\)/,'Today lands on today');
});

test('every row in the menu draws an icon, and the bar swipes across the bottom',async()=>{
 const {PAGES}=await import('../src/nav-data.js');
 const nav=await readFile(new URL('../src/Navigation.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // The bug this replaces: weather, the to-do list, the planning board and forwarded email had
 // no icon, so More rendered <undefined/> and React took the whole screen down with it — and
 // More is the one screen every other screen is reached from.
 const icons=new Set([...nav.match(/const ICONS=\{[\s\S]*?\};/)[0].matchAll(/([a-z]+):/g)].map(m=>m[1]));
 for(const id of Object.keys(PAGES))assert.ok(icons.has(id),`${id} has no icon, so its row cannot render`);
 // And a page added tomorrow without one falls back rather than blanking the menu.
 assert.match(nav,/export const iconFor=id=>ICONS\[id\]\|\|Circle;/);
 assert.equal((nav.match(/iconFor\(id\)/g)||[]).length,2,'the bar and the More list both go through the fallback');
 assert.ok(!/const Icon=ICONS\[id\]/.test(nav),'nothing indexes ICONS directly any more');
 // Six tabs do not fit a narrow phone at a readable size, so the five that are yours scroll.
 assert.match(css,/\.nav-tabs\{flex:1;min-width:0;display:flex;[^}]*overflow-x:auto/);
 assert.match(css,/\.nav-tabs button\{flex:1 0 auto;min-width:68px;scroll-snap-align:center\}/);
 assert.match(css,/\.nav-tabs::-webkit-scrollbar\{display:none\}/);
 // Auto margins centre the strip while it fits and fall to zero when it overflows, so the
 // first tab stays reachable — which is exactly what justify-content:center would clip.
 assert.match(css,/\.nav-tabs button:first-child\{margin-left:auto\}/);
 assert.match(css,/\.nav-tabs button:last-child\{margin-right:auto\}/);
 // More is not in the scroller. It is the way to every other screen, so it is pinned to the
 // end of the bar and cannot be swiped off the edge the way the reported bug had it.
 assert.match(nav,/<\/div>\s*\n\s*<button className=\{`nav-more/,'More sits outside the scrolling strip');
 assert.match(css,/\.bottom-nav \.nav-more\{flex:0 0 auto/);
 // A tab stopped by a hard edge reads as the end of the bar, so the side with more on it fades.
 assert.match(nav,/data-swipe=\{swipe\|\|undefined\}/);
 for(const side of ['end','start','both'])assert.match(css,new RegExp(`\\.nav-tabs\\[data-swipe="${side}"\\]\\{-webkit-mask-image:linear-gradient`),side);
 // And a strip that is a couple of stray pixels over reads as fitting, rather than fading for nothing.
 assert.match(nav,/const room=box\.scrollWidth-box\.clientWidth;\n\s*setSwipe\(room<SLACK\?''/);
 // Whatever is lit is brought into view, so the current tab is never parked off the edge.
 assert.match(nav,/box\.scrollTo\(\{left:on\.offsetLeft-\(box\.clientWidth-on\.offsetWidth\)\/2/);
 assert.match(nav,/prefers-reduced-motion:reduce/,'and it does not animate for anyone who asked it not to');
});

test('every Japanese word and phrase in the app carries a sound-it-out',async()=>{
 const {FOOD,ORDERING,MENU_WORDS,SAY_TIP}=await import('../src/food-data.js');
 const {PHRASES}=await import('../src/phrases.js');
 const {ALL_PHRASES}=await import('../src/phrasebook-data.js');
 const japanese=/[぀-ヿ一-龯]/;
 const variants=FOOD.flatMap(f=>f.variants||[]);
 const everything=[...FOOD,...variants,...ORDERING,...MENU_WORDS,...ALL_PHRASES(),...Object.values(PHRASES)];
 for(const item of everything){
  const id=item.id||item.en;
  assert.match(item.ja,japanese,`${id} has no Japanese`);
  assert.ok(item.say,`${id} has no sound-it-out`);
  // The phonics must be readable English: no Japanese characters, no macrons to trip over.
  assert.doesNotMatch(item.say,japanese,`${id} phonics still has Japanese`);
  assert.doesNotMatch(item.say,/[āīūēō]/,`${id} phonics uses a macron`);
  assert.equal(item.say,item.say.toLowerCase(),`${id} phonics should not shout`);
  // Chunked, so each part gets the same weight rather than an English stress. A word
  // that is only one sound ("hye", "men") has nothing to chunk.
  assert.ok(/-/.test(item.say)||item.say.length<=4,`${id} phonics is not chunked`);
 }
 assert.equal(FOOD.length+ORDERING.length,68);
 assert.equal(variants.length,47,'the chicken/pork/prawn/vege/cucumber/avocado choices under the dishes');
 assert.ok(SAY_TIP.includes('evenly'));
 // The endings a learner would otherwise get wrong, because the vowel goes silent.
 assert.equal(ORDERING.find(o=>o.id==='four').say,'yo-neen dess','desu is said "dess"');
 assert.equal(ORDERING.find(o=>o.id==='delicious').say,'go-chee-soh-sa-ma desh-ta','deshita is said "desh-ta"');
 assert.match(ORDERING.find(o=>o.id==='bill').say,/shee-mass$/,'masu is said "mass"');
 assert.equal(PHRASES.lost.say,'mee-chee nee ma-yo-ee-mash-ta');
 assert.equal(FOOD.find(f=>f.id==='tonkatsu').say,'ton-kat-soo');
 // Romaji is kept alongside — it is what you type into a translator.
 for(const item of everything)assert.ok(item.romaji,`${item.id||item.en} lost its romaji`);
});

test('a parent can give their own dish a sound-it-out',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const added=applyOperation(state,{type:'foodAdd',en:'Chicken katsu',ja:'チキンカツ',romaji:'chikin katsu',say:'  chee-keen kat-soo  ',kind:'safe'},parent);
 assert.equal(added.foodItems[0].say,'chee-keen kat-soo');
 // Optional, and bounded like the other text fields.
 assert.equal(applyOperation(state,{type:'foodAdd',en:'Plain toast'},parent).foodItems[0].say,'');
 assert.throws(()=>applyOperation(state,{type:'foodAdd',en:'Thing',say:'x'.repeat(201)},parent),/Invalid say/);
});

test('a word a day, in trip order, practical and never repeated inside the trip',async()=>{
 const {PHRASEBOOK,ALL_PHRASES,DAILY_ORDER,phraseForDay,findPhrase}=await import('../src/phrasebook-data.js');
 const all=ALL_PHRASES();
 assert.equal(new Set(all.map(p=>p.id)).size,all.length,'phrase ids must be unique');
 assert.ok(PHRASEBOOK.every(s=>s.phrases.length),'no empty section');
 // Every day of the trip gets a phrase, and no phrase comes round twice in 16 days.
 const daily=seed.days.map(d=>phraseForDay(seed.days,d.date));
 assert.equal(daily.filter(Boolean).length,seed.days.length);
 assert.equal(new Set(daily.map(p=>p.id)).size,seed.days.length);
 assert.equal(daily[0].id,'hello');assert.equal(daily.at(-1).id,'bye');
 // The rota only ever names phrases that exist.
 for(const id of DAILY_ORDER)assert.ok(findPhrase(id),`${id} is not in the phrasebook`);
 assert.equal(phraseForDay(seed.days,'2099-01-01'),null,'a day off the trip gets nothing');
});

test('marking the daily phrase seen is per person, per day, and keeps the first time',async()=>{
 const {ensureFeatures,phraseSeenBy}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const day=seed.days[0].date,at='2026-09-19T01:00:00.000Z';
 const seen=applyOperation(state,{type:'phraseSeen',person:'Nate',day,at},child);
 assert.equal(phraseSeenBy(seen,day).Nate,at);
 // Seeing it again does not move the timestamp, and one person's tick is not another's.
 const again=applyOperation(seen,{type:'phraseSeen',person:'Nate',day,at:'2026-09-19T09:00:00.000Z'},child);
 assert.equal(phraseSeenBy(again,day).Nate,at);
 assert.equal(phraseSeenBy(again,day).Damien,undefined);
 const both=applyOperation(again,{type:'phraseSeen',person:'Damien',day},parent);
 assert.ok(both.phraseSeen[day].Damien);
 // You tick your own, on a real trip day, for a real member of the family.
 assert.throws(()=>applyOperation(state,{type:'phraseSeen',person:'Damien',day},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'phraseSeen',person:'Nate',day:'2099-01-01'},child),/trip day/);
 assert.throws(()=>applyOperation(state,{type:'phraseSeen',person:'Grandma',day},parent),/family member/);
});

test('a fun fact a day, tied to the guide page for what is actually coming up',async()=>{
 const {FACTS,ALL_FACTS,ANYTIME_FACTS,findFact,factsForDay,factForDay,orderedFacts}=await import('../src/fact-data.js');
 const all=ALL_FACTS();
 assert.equal(new Set(all.map(f=>f.id)).size,all.length,'fact ids must be unique');
 assert.ok(all.every(f=>f.title&&f.text&&f.icon),'every fact has a headline, a fact and a picture');
 assert.ok(all.every(f=>f.page>=1&&f.page<=72),'every fact names a real guide page');
 // A fact belongs to a day through the guide page it came from. Anything the guide's opening
 // pages carry belongs to no single day and fills in behind whatever the day has of its own.
 const dayPages=new Set(seed.days.flatMap(d=>d.pages||[]));
 for(const f of all)assert.equal(dayPages.has(f.page),!f.anytime,`${f.id} is on the wrong side of the day split`);
 assert.ok(ANYTIME_FACTS().length>=15,'enough facts that fit any day');
 // Every one of the sixteen days has its own facts, and no fact lands on two days.
 const landed=[];
 for(const d of seed.days){
  const todays=factsForDay(seed.days,d.date);
  assert.ok(todays.length>=3,`${d.date} needs facts of its own`);
  assert.equal(factForDay(seed.days,d.date),todays[0],'the day opens on its first fact');
  landed.push(...todays.map(f=>f.id));
 }
 assert.equal(new Set(landed).size,landed.length,'a fact belongs to one day only');
 // The ones that matter are the ones about what is coming up: sumo on sumo day, the lucky
 // cats on the morning we go and find them.
 assert.equal(factForDay(seed.days,'2026-09-23').id,'sumo-old');
 assert.equal(factForDay(seed.days,'2026-10-06').id,'maneki-neko');
 assert.equal(factForDay(seed.days,'2099-01-01'),null,'a day off the trip gets nothing of its own');
 // "One more" works through the day's own facts first, then the anytime ones, then the rest,
 // and it offers the whole collection exactly once.
 const ordered=orderedFacts(seed.days,'2026-09-23');
 assert.equal(ordered.length,all.length);
 assert.equal(new Set(ordered.map(f=>f.id)).size,all.length);
 assert.deepEqual(ordered.slice(0,6).map(f=>f.id),factsForDay(seed.days,'2026-09-23').map(f=>f.id));
 assert.ok(ordered[6].anytime,'the anytime facts come next');
 assert.deepEqual(orderedFacts(seed.days,'2099-01-01').map(f=>f.id).slice(0,ANYTIME_FACTS().length),ANYTIME_FACTS().map(f=>f.id));
 for(const f of FACTS)assert.equal(findFact(f.id),f);
 assert.equal(findFact('nonsense'),null);
});

test('a fact rides the card for the thing it is about, and only that card',async()=>{
 const {ALL_FACTS,factsForItem,factsForStep}=await import('../src/fact-data.js');
 const {FOOD}=await import('../src/food-data.js');
 const {locations}=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url)));
 const all=ALL_FACTS();
 assert.ok(all.every(f=>Array.isArray(f.match)),'every fact says what it is about, even if that is nothing');
 assert.ok(all.every(f=>f.match.every(t=>typeof t==='string'&&t.trim())),'no empty term, which would match everything');
 const ids=list=>list.map(f=>f.id);
 // The card's own words are the linkage, so the fact lands on the thing rather than on the day.
 const step=t=>seed.steps.find(s=>s.title===t);
 assert.deepEqual(ids(factsForStep(step('Find seats and enjoy sumo'))),['sumo-old','sumo-ring','sumo-salt','sumo-topknot','sumo-tournament']);
 assert.deepEqual(ids(factsForStep(step('Crossing and Hachiko'))),['hachiko','crossing']);
 assert.deepEqual(ids(factsForStep(step('Deer feeding'))),['deer-bow','deer-crackers']);
 assert.deepEqual(ids(factsForStep(step('Explore Gotokuji'))),['maneki-neko','which-paw','cat-shelves','shoes','temizuya']);
 // Same day, same guide page, different card: the taxi to Kyoto Station is not the bullet train,
 // and a shrine is offered the etiquette the guide's opening pages carry wherever it turns up.
 assert.deepEqual(ids(factsForStep(step('Nozomi 33 to Kyoto'))),['shinkansen','tokyo-station','quiet-trains','queue']);
 assert.deepEqual(ids(factsForStep(step('Taxi to Tokyo Station'))),['tokyo-station','no-tipping','taxi-doors']);
 assert.ok(ids(factsForStep(step('Yasaka Shrine at dusk'))).includes('temizuya'),'an anytime fact lands on the card it fits');
 // A card with nothing to say gets nothing rather than the day's leftovers.
 assert.deepEqual(factsForStep(step('Omotesando Hills')),[]);
 assert.deepEqual(factsForItem(''),[]);
 assert.deepEqual(factsForItem(null,undefined),[]);
 // Whole words only, so the dish is not answered for by a word inside another one.
 assert.deepEqual(ids(factsForItem('Zaru soba — cold soba to dip','Served cold on a bamboo tray.')),['slurp']);
 assert.deepEqual(ids(factsForItem('Okonomiyaki — savoury pancake')),[]);
 assert.deepEqual(ids(factsForItem('Soufflé pancakes','FLIPPER’S on our last Shibuya morning.')),['souffle-pancakes']);
 // Places and dishes are matched the same way, off what the card says they are.
 const dish=en=>FOOD.find(i=>i.en===en);
 assert.deepEqual(ids(factsForItem(dish('Onigiri — rice ball').en,dish('Onigiri — rice ball').note)),['bins','konbini','seven-atm','onigiri']);
 assert.deepEqual(ids(factsForItem(dish('Takoyaki — octopus balls').en,dish('Takoyaki — octopus balls').note)),['takoyaki']);
 const place=name=>locations.find(l=>l.name===name);
 const card=l=>ids(factsForItem(l.name,l.district,l.category));
 assert.ok(card(place('Arashiyama Bamboo Grove')).includes('bamboo'),'the grove carries the bamboo');
 assert.ok(card(place('1 Hotel Tokyo')).length===0,'a hotel is not about anything in particular');
 // Most of the trip is covered, and the handful of facts that belong on no card are named, so
 // a fact quietly losing its terms shows up here rather than on nobody's screen.
 const covered=seed.steps.filter(s=>factsForStep(s).length).length;
 assert.ok(covered>150,`only ${covered} of ${seed.steps.length} activities carry a fact`);
 const landed=new Set();
 for(const s of seed.steps)for(const f of factsForStep(s))landed.add(f.id);
 for(const l of locations)for(const f of factsForItem(l.name,l.district,l.category))landed.add(f.id);
 for(const i of FOOD)for(const f of factsForItem(i.en,i.romaji,i.note))landed.add(f.id);
 assert.deepEqual(all.filter(f=>!landed.has(f.id)).map(f=>f.id),['sumimasen','voltage','scripts','lost-property']);
 assert.ok(all.filter(f=>!f.match.length).every(f=>!landed.has(f.id)),'a fact naming nothing lands nowhere');
});

test('marking the daily fun fact seen is per person, per day, and keeps the first time',async()=>{
 const {ensureFeatures,factSeenBy}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const day=seed.days[0].date,at='2026-09-19T01:00:00.000Z';
 const seen=applyOperation(state,{type:'factSeen',person:'Nate',day,at},child);
 assert.equal(factSeenBy(seen,day).Nate,at);
 const again=applyOperation(seen,{type:'factSeen',person:'Nate',day,at:'2026-09-19T09:00:00.000Z'},child);
 assert.equal(factSeenBy(again,day).Nate,at);
 assert.equal(factSeenBy(again,day).Damien,undefined);
 const both=applyOperation(again,{type:'factSeen',person:'Damien',day},parent);
 assert.ok(both.factSeen[day].Damien);
 // You tick your own, on a real trip day, for a real member of the family.
 assert.throws(()=>applyOperation(state,{type:'factSeen',person:'Damien',day},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'factSeen',person:'Nate',day:'2099-01-01'},child),/trip day/);
 assert.throws(()=>applyOperation(state,{type:'factSeen',person:'Grandma',day},parent),/family member/);
 assert.throws(()=>applyOperation(state,{type:'factSeen',person:'Nate',day,factIds:['nonsense']},child),e=>e.status===404);
});

test('the fun fact log records what was swiped through, once each, and never repeats one',async()=>{
 const {ensureFeatures,factLogFor,factsSeenBy,factQueue}=await import('../src/trip-features.js');
 const {ALL_FACTS,factsForDay}=await import('../src/fact-data.js');
 const state=ensureFeatures(structuredClone(seed)),day='2026-09-23',at='2026-09-19T01:00:00.000Z';
 assert.deepEqual(state.factLog,{});
 // Opening on sumo day offers the sumo facts first, in the order they are written.
 const opened=factQueue(state,'Nate',day);
 assert.equal(opened.length,ALL_FACTS().length);
 assert.deepEqual(opened.slice(0,3).map(f=>f.id),factsForDay(seed.days,day).slice(0,3).map(f=>f.id));
 // Closing the pop-up hands back every fact actually put on screen, and marks the day done.
 const swiped=opened.slice(0,3).map(f=>f.id);
 const first=applyOperation(state,{type:'factSeen',person:'Nate',day,factIds:swiped,at},child);
 assert.deepEqual(Object.keys(factsSeenBy(first,'Nate')),swiped);
 assert.ok(first.factSeen[day].Nate);
 // Meeting one twice keeps the first time, and one person's log is not another's.
 const later='2026-09-19T23:30:00.000Z';
 const again=applyOperation(first,{type:'factSeen',person:'Nate',factIds:[swiped[0],'bins'],at:later},child);
 assert.equal(factsSeenBy(again,'Nate')[swiped[0]],at,'the first time it was met is kept');
 assert.equal(factsSeenBy(again,'Nate').bins,later);
 assert.deepEqual(factsSeenBy(again,'Boston'),{});
 // Newest first in the log, and the queue never offers back a fact this person has met.
 assert.equal(factLogFor(again,'Nate')[0].id,'bins');
 assert.equal(factLogFor(again,'Nate').length,4);
 assert.deepEqual(factLogFor(again,'Boston'),[]);
 const next=factQueue(again,'Nate',day);
 assert.equal(next.length,ALL_FACTS().length-4);
 assert.ok(!next.some(f=>factsSeenBy(again,'Nate')[f.id]),'nothing already met comes round again');
 assert.equal(next[0].id,factsForDay(seed.days,day)[3].id,'still the day’s own facts first');
 // Once the whole collection has been met there is nothing new left, so the pop-up falls
 // back to the day's own first fact rather than opening onto nothing.
 const everything=applyOperation(state,{type:'factSeen',person:'Boston',day,factIds:ALL_FACTS().map(f=>f.id),at},{name:'Boston',role:'child'});
 const exhausted=factQueue(everything,'Boston',day);
 assert.equal(exhausted.length,1);
 assert.equal(exhausted[0].id,factsForDay(seed.days,day)[0].id);
});

test('every fun fact can be read aloud, and Nate gets it slower and first',async()=>{
 const {ALL_FACTS,factForDay,factAloud}=await import('../src/fact-data.js');
 const {YOUNG_RATE,SLOW_RATE,speechRate}=await import('../src/speech.js');
 // The headline then the fact, and never the picture: a phone saying "aeroplane" before the
 // sentence helps nobody.
 const sumo=factForDay(seed.days,'2026-09-23');
 assert.equal(factAloud(sumo),`${sumo.title}. ${sumo.text}`);
 assert.doesNotMatch(factAloud(sumo),/\p{Extended_Pictographic}/u);
 // Every fact has to survive being spoken by an English voice at a five-year-old: plain
 // English all the way through, and short enough to still be listening at the end.
 for(const f of ALL_FACTS()){
  const said=factAloud(f);
  assert.doesNotMatch(said,/\p{Extended_Pictographic}/u,`${f.id} would be read out as a picture`);
  assert.doesNotMatch(said,/[　-ヿ一-鿿]/,`${f.id} has Japanese an English voice would mangle`);
  assert.ok(said.length<=360,`${f.id} is too long to be read to a five-year-old`);
 }
 // Slower than talking pace for Nate, but still a sentence rather than the phrase drill.
 assert.ok(YOUNG_RATE<speechRate('en-AU')&&YOUNG_RATE>SLOW_RATE,'a story speed, between talking and the drill');
 const facts=await readFile(new URL('../src/FunFacts.jsx',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 // The pop-up and every row on the page both offer it, whoever is holding the phone — a
 // parent sitting with Nate needs the button as much as he does.
 assert.equal(facts.match(/<ReadAloudButton/g)?.length,2,'the pop-up and the row both offer it');
 assert.match(facts,/const \{supported:canRead,reading,read,problem\}=useReadAloud\(\)/,'and it says so when the phone stays silent');
 assert.match(facts,/what="fact"/);
 // Nate is the reason it exists, so he gets the slower voice and a button he cannot miss.
 assert.match(facts,/young=user\?\.name==='Nate'/);
 assert.match(facts,/rate=\{young\?YOUNG_RATE:undefined\}/);
 assert.match(facts,/className=\{young\?'young':''\}/);
 assert.match(main,/<FactOfDay[^>]*young=\{user\.name==='Nate'\}/,'the pop-up is told whose phone it is on');
 // The missions the button started on keep the wording they had.
 const adventure=await readFile(new URL('../src/AdventurePages.jsx',import.meta.url),'utf8');
 assert.match(adventure,/what='mission'/,'missions keep their own label by default');
});

test('a fun fact ticked off with no signal is kept on the phone and lands when it syncs',async()=>{
 const {ensureFeatures,pendingProgress,factSeenBy,factsSeenBy}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed)),day='2026-09-27',at='2026-09-19T00:30:00.000Z';
 const queued=[{operation:{type:'factSeen',person:'Nate',day,factIds:['deer-bow','deer-crackers'],at}}];
 const shown=pendingProgress(state,queued);
 assert.equal(factSeenBy(shown,day).Nate,at);
 assert.deepEqual(Object.keys(factsSeenBy(shown,'Nate')),['deer-bow','deer-crackers']);
 assert.deepEqual(factsSeenBy(state,'Nate'),{},'the queue does not touch the trip until it lands');
});

test('the dishes carry the chicken, pork, prawn and vegetarian choices, and how to ask',async()=>{
 const {FOOD,ORDERING,MENU_WORDS}=await import('../src/food-data.js');
 const withVariants=FOOD.filter(f=>f.variants?.length);
 assert.ok(withVariants.length>=10,'the dishes that come in versions');
 for(const dish of withVariants){
  const labels=dish.variants.map(v=>v.en);
  assert.equal(new Set(labels).size,labels.length,`${dish.id} repeats a version`);
 }
 assert.ok(FOOD.find(f=>f.id==='yakitori').variants.some(v=>/chicken/i.test(v.en)));
 assert.ok(FOOD.find(f=>f.id==='katsucurry').variants.some(v=>/vegetable/i.test(v.en)));
 assert.ok(FOOD.find(f=>f.id==='gyoza').variants.some(v=>/prawn/i.test(v.en)));
 assert.ok(FOOD.find(f=>f.id==='tonkatsu').variants.some(v=>/pork/i.test(v.en)));
 // The words to spot on a menu, and the questions to ask about what is in a dish.
 for(const id of ['chicken','pork','prawn','beef','egg','cucumber','avocado'])assert.ok(MENU_WORDS.find(w=>w.id===id),`${id} missing from the menu words`);
 for(const id of ['chickenplease','nomeat','meatinthis','vegetarian','cucumberroll','norawfish'])assert.ok(ORDERING.find(o=>o.id===id),`${id} missing from ordering`);
 // The no-fish sushi orders, which are the point of the sushi list for a five-year-old.
 const sushi=FOOD.find(f=>f.id==='sushi').variants.map(v=>v.en.toLowerCase());
 for(const want of ['cucumber','avocado','egg'])assert.ok(sushi.some(v=>v.includes(want)),`sushi has no ${want}`);
 assert.ok(FOOD.find(f=>f.id==='makizushi').variants.some(v=>/cucumber/i.test(v.en)));
 assert.ok(FOOD.find(f=>f.id==='inari'),'a sushi with no fish in it at all');
});

test('searching works from an English keyboard — no macrons, no punctuation',async()=>{
 const {searchText}=await import('../src/trip-features.js');
 const {ALL_PHRASES}=await import('../src/phrasebook-data.js');
 const find=q=>ALL_PHRASES().filter(p=>searchText([p.en,p.ja,p.romaji,p.say,p.note].join(' ')).includes(searchText(q)));
 assert.ok(find('arigato').some(p=>p.id==='thanks'),'"arigato" must find "arigatō gozaimasu"');
 assert.ok(find('ohayo').some(p=>p.id==='morning'));
 assert.ok(find('Where is the toilet').some(p=>p.id==='wheretoilet'),'the question mark must not block it');
 assert.ok(find('こんにちは').some(p=>p.id==='hello'),'and Japanese still searches as itself');
 assert.equal(searchText('  Arigatō  gozaimasu? '),'arigato gozaimasu');
 assert.equal(searchText(undefined),'');
});

test('a voice note is checked before it is ever stored',async()=>{
 const {validateAudio,VOICE_MAX_BYTES}=await import('../server/files.mjs');
 // What a phone's own recorder produces, and nothing else.
 validateAudio('audio/webm;codecs=opus',40000);validateAudio('audio/mp4',900000);
 for(const bad of [['application/pdf',1000],['image/jpeg',1000],['audio/webm',0],['audio/webm',VOICE_MAX_BYTES+1],[undefined,1000]])
  assert.throws(()=>validateAudio(...bad),/five minutes/,`${bad[0]} ${bad[1]} should be refused`);
});

test('API: a voice note is refused unless it belongs to you, a real day and a real activity',async()=>{
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});
  const {state}=await(await fetch(base+'/api/state')).json();
  const day=state.days[0].date,stepToday=state.steps.find(s=>s.day===day),other=state.steps.find(s=>s.day&&s.day!==day);
  const good={pathname:'voice/preview/note.webm',day,seconds:12};
  const fails=async (body,pattern)=>{
   const r=await post('voice',body);assert.equal(r.status>=400,true,JSON.stringify(body));
   assert.match((await r.json()).error,pattern);
  };
  // Someone else's folder, or a way out of it.
  await fails({...good,pathname:'voice/someone-else/note.webm'},/Invalid voice note/);
  await fails({...good,pathname:'tickets/preview/note.webm'},/Invalid voice note/);
  await fails({...good,pathname:'voice/preview/../../secret.webm'},/Invalid voice note/);
  // A day we are not in Japan, and an activity that is not on the day claimed.
  await fails({...good,day:'2099-01-01'},/trip day/);
  await fails({...good,stepId:other.id},/Activity not found/);
  await fails({...good,stepId:'no-such-step'},/Activity not found/);
  // Lengths that cannot be real, and a label nobody wants to read.
  for(const seconds of [0,-5,301,'abc'])await fails({...good,seconds},/one second and five minutes/);
  await fails({...good,title:'x'.repeat(201)},/label short/);
  // A valid request gets past validation and only then reaches storage, which is not connected here.
  const r=await post('voice',{...good,stepId:stepToday.id});
  assert.equal(r.status>=400,true);assert.doesNotMatch((await r.json()).error,/trip day|Activity|Invalid voice note/);
  // A child may upload a voice note; everything else in the upload route stays parent-only.
  assert.equal((await post('upload',{pathname:'voice/preview/x.webm'})).status,503,'voice uploads reach storage');
 }finally{delete process.env.LOCAL_DEMO;await new Promise(r=>server.close(r));}
});

test('voice notes belong to the person who recorded them',async()=>{
 const {ensureFeatures,voiceNotesFor,voiceLength}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 assert.deepEqual(state.voiceNotes,[]);
 const day=seed.days[0].date,step=seed.steps.find(s=>s.day===day);
 state.voiceNotes=[
  {id:'v1',by:'Nate',day,stepId:step.id,title:'The deer',seconds:65,at:'2026-09-21T02:00:00.000Z',pathname:'voice/n/1.webm',type:'audio/webm'},
  {id:'v2',by:'Damien',day,stepId:null,title:'End of day',seconds:9,at:'2026-09-21T11:00:00.000Z',pathname:'voice/d/2.webm',type:'audio/webm'},
  {id:'v3',by:'Lauren',day:seed.days[1].date,stepId:null,title:'',seconds:30,at:'2026-09-22T11:00:00.000Z',pathname:'voice/l/3.webm',type:'audio/webm'}
 ];
 // Newest first, and a day shows the activity notes with it.
 assert.deepEqual(voiceNotesFor(state,{day}).map(v=>v.id),['v2','v1']);
 assert.deepEqual(voiceNotesFor(state,{stepId:step.id}).map(v=>v.id),['v1']);
 assert.deepEqual(voiceNotesFor(state,{day,stepId:null}).map(v=>v.id),['v2'],'the day itself, without the activity notes');
 assert.equal(voiceNotesFor(state).length,3);
 assert.equal(voiceLength(65),'1:05');assert.equal(voiceLength(9),'0:09');assert.equal(voiceLength(300),'5:00');
 // A child removes and labels his own; he cannot touch anyone else's.
 assert.deepEqual(applyOperation(state,{type:'voiceNoteRemove',id:'v1'},child).voiceNotes.map(v=>v.id),['v2','v3']);
 assert.equal(applyOperation(state,{type:'voiceNoteLabel',id:'v1',title:'  The deer at Nara  '},child).voiceNotes[0].title,'The deer at Nara');
 for(const op of [{type:'voiceNoteRemove',id:'v2'},{type:'voiceNoteLabel',id:'v2',title:'no'}])
  assert.throws(()=>applyOperation(state,op,child),e=>e.status===403);
 // A parent can clear up any of them.
 assert.deepEqual(applyOperation(state,{type:'voiceNoteRemove',id:'v1'},parent).voiceNotes.map(v=>v.id),['v2','v3']);
 assert.throws(()=>applyOperation(state,{type:'voiceNoteRemove',id:'nope'},parent),e=>e.status===404);
 assert.throws(()=>applyOperation(state,{type:'voiceNoteLabel',id:'v2',title:'x'.repeat(201)},parent),/label short/);
});

test('saving a voice note trusts storage, not the phone, for what the file is',async()=>{
 const {checkVoiceNote,addVoiceNote}=await import('../server/voice.mjs');
 const {ensureFeatures}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const nate={id:'grant-nate',name:'Nate',role:'child'};
 const day=seed.days[0].date,step=seed.steps.find(s=>s.day===day);
 const body={pathname:`voice/${nate.id}/abc.webm`,day,stepId:step.id,title:'  The bamboo  ',seconds:'42.4'};
 const checked=checkVoiceNote(state,body,nate);
 assert.deepEqual(checked,{pathname:body.pathname,day,stepId:step.id,title:'The bamboo',seconds:42});
 const blob={contentType:'audio/webm',size:120000};
 const saved=addVoiceNote(state,checked,nate,blob,'2026-09-21T03:00:00.000Z');
 assert.equal(saved.voiceNotes.length,1);
 assert.deepEqual({...saved.voiceNotes[0],id:'x'},{id:'x',by:'Nate',pathname:body.pathname,day,stepId:step.id,title:'The bamboo',seconds:42,type:'audio/webm',size:120000,at:'2026-09-21T03:00:00.000Z'});
 // A second save of the same recording is the same note, not a duplicate.
 assert.equal(addVoiceNote(saved,checked,nate,blob),saved);
 // A phone claiming a photo is a voice note gets nowhere: the type comes from storage.
 assert.throws(()=>addVoiceNote(state,checked,nate,{contentType:'image/jpeg',size:120000}),/five minutes/);
 assert.throws(()=>addVoiceNote(state,checked,nate,{contentType:'audio/webm',size:0}),/five minutes/);
 // A note with no activity belongs to the day itself.
 assert.equal(checkVoiceNote(state,{...body,stepId:undefined},nate).stepId,null);
 // And one person cannot write into another's folder.
 assert.throws(()=>checkVoiceNote(state,body,{id:'grant-boston',name:'Boston',role:'child'}),/Invalid voice note/);
});

test('a phone that has not listed its voices yet is not treated as having none',async()=>{
 const {matchVoice,voiceState,settled,canOffer}=await import('../src/speech.js');
 const ja={lang:'ja-JP',name:'Kyoko'},en={lang:'en-AU',name:'Karen'};
 assert.equal(matchVoice([en,ja],'ja-JP'),ja);
 assert.equal(matchVoice([{lang:'ja_JP'}],'ja')?.lang,'ja_JP','an underscore is still Japanese');
 assert.equal(matchVoice([en],'ja'),null);
 assert.equal(matchVoice(null,'ja'),null);
 // The three answers, and the one that matters: an empty list is "not yet", not "never".
 assert.equal(voiceState([en,ja]),'yes');
 assert.equal(voiceState([en]),'no');
 assert.equal(voiceState([]),'unknown','Safari returns an empty list before it is ready');
 assert.equal(voiceState(null),'unknown');
 assert.equal(voiceState(undefined),'unknown');
 assert.ok(settled('yes')&&settled('no')&&!settled('unknown'));
 // So the button is offered unless the phone has actually told us it cannot.
 assert.equal(canOffer(true,'yes'),true);
 assert.equal(canOffer(true,'unknown'),true,'this is the case that was hiding the button');
 assert.equal(canOffer(true,'no'),false);
 assert.equal(canOffer(false,'yes'),false,'no speech support at all');
});

test('the phrase log records what was actually put on screen, once each',async()=>{
 const {ensureFeatures,phraseLogFor,phrasesSeenBy,phraseQueue}=await import('../src/trip-features.js');
 const {ALL_PHRASES}=await import('../src/phrasebook-data.js');
 const state=ensureFeatures(structuredClone(seed));
 assert.deepEqual(state.phraseLog,{});
 const day=seed.days[0].date,at='2026-09-20T23:00:00.000Z';
 // Closing the pop-up hands back every phrase swiped through, and marks the day done.
 const first=applyOperation(state,{type:'phraseSeen',person:'Nate',day,phraseIds:['hello','thanks','excuse'],at},child);
 assert.deepEqual(Object.keys(phrasesSeenBy(first,'Nate')),['hello','thanks','excuse']);
 assert.ok(first.phraseSeen[day].Nate);
 // Seeing one again keeps the first time, and one person's log is their own.
 const again=applyOperation(first,{type:'phraseSeen',person:'Nate',phraseIds:['hello','please'],at:'2026-09-20T23:30:00.000Z'},child);
 assert.equal(phrasesSeenBy(again,'Nate').hello,at,'the first time it was met is kept');
 assert.equal(phrasesSeenBy(again,'Nate').please,'2026-09-20T23:30:00.000Z');
 assert.deepEqual(phrasesSeenBy(again,'Boston'),{});
 // The log reads newest first.
 assert.deepEqual(phraseLogFor(again,'Nate').map(p=>p.id),['please','hello','thanks','excuse']);
 assert.equal(phraseLogFor(again,'Nate')[0].en,'Please');
 // What to show next never repeats what this person has already met.
 const queue=phraseQueue(again,'Nate',seed.days[2].date);
 assert.equal(queue[0].id,'excuse','the day of the trip still leads with its own phrase');
 assert.equal(new Set(queue.map(p=>p.id)).size,queue.length);
 assert.ok(!queue.slice(1).some(p=>phrasesSeenBy(again,'Nate')[p.id]),'no phrase comes round twice');
 assert.equal(queue.length,ALL_PHRASES().length-3);
 // "Show me another" logs a phrase without touching the day's pop-up.
 const extra=applyOperation(again,{type:'phraseSeen',person:'Damien',phraseIds:['bye']},parent);
 assert.ok(phrasesSeenBy(extra,'Damien').bye);
 assert.deepEqual(extra.phraseSeen,again.phraseSeen,'no day is marked off by a spare phrase');
 // It is still your own log, and only real phrases go in it.
 assert.throws(()=>applyOperation(state,{type:'phraseSeen',person:'Damien',phraseIds:['hello']},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'phraseSeen',person:'Nate',phraseIds:['not-a-phrase']},child),/Unknown phrase/);
 assert.throws(()=>applyOperation(state,{type:'phraseSeen',person:'Nate',phraseIds:'hello'},child),/Invalid phrase list/);
 assert.throws(()=>applyOperation(state,{type:'phraseSeen',person:'Nate'},child),/trip day/);
 assert.throws(()=>applyOperation(state,{type:'phraseSeen',person:'Nate',day:'2099-01-01',phraseIds:['hello']},child),/trip day/);
});

test('a queued phrase log still shows on the phone before it syncs',async()=>{
 const {ensureFeatures,pendingProgress,phrasesSeenBy}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const day=seed.days[0].date,at='2026-09-20T23:00:00.000Z';
 const preview=pendingProgress(state,[{operation:{type:'phraseSeen',person:'Nate',day,phraseIds:['hello','thanks'],at}}]);
 assert.deepEqual(Object.keys(phrasesSeenBy(preview,'Nate')),['hello','thanks']);
 assert.ok(preview.phraseSeen[day].Nate);
});

test('two speeds, and the quirks that make a phone say nothing at all',async()=>{
 const {speechRate,speechKey,needsSettle,isRealFailure,SLOW_RATE}=await import('../src/speech.js');
 // Japanese is read a little under pace already; the snail is slower again.
 assert.equal(speechRate('ja-JP'),.8);
 assert.equal(speechRate('en-AU'),.85);
 assert.equal(speechRate('ja-JP',true),SLOW_RATE);
 assert.ok(SLOW_RATE<.8,'the slow one has to be properly slower to be worth a button');
 assert.equal(speechRate(undefined),.85);
 // Each speed is its own button, so tapping the other one switches rather than stops.
 assert.notEqual(speechKey('こんにちは','slow'),speechKey('こんにちは','normal'));
 // Speaking straight after a cancel is what silences Safari, so we only wait when we must.
 assert.equal(needsSettle({speaking:true,pending:false}),true);
 assert.equal(needsSettle({speaking:false,pending:true}),true,'queued counts as busy');
 assert.equal(needsSettle({speaking:false,pending:false}),false,'a quiet engine speaks now, inside the tap');
 assert.equal(needsSettle(null),false);
 // Interrupting one phrase with another is not a fault to report.
 assert.equal(isRealFailure('interrupted'),false);
 assert.equal(isRealFailure('canceled'),false);
 assert.equal(isRealFailure('cancelled'),false);
 assert.equal(isRealFailure('synthesis-failed'),true);
 assert.equal(isRealFailure(undefined),false);
});

test('the sound check turns "nothing happened" into something to act on',async()=>{
 const {soundCheckLines,describeVoices,claimPlayback,warmUp}=await import('../src/speech.js');
 const read=facts=>Object.fromEntries(soundCheckLines(facts));
 // A phone that has a Japanese voice and spoke.
 const good=read({build:'b',standalone:true,supported:true,voices:[{lang:'en-AU',name:'Karen'},{lang:'ja-JP',name:'Kyoko'}],audioSession:'playback',started:true,startedAfter:35,ended:true,error:''});
 assert.equal(good['Opened from'],'Home Screen icon');
 assert.match(good['Voices found'],/Japanese: Kyoko/);
 assert.match(good['It started speaking'],/yes, after 35ms/);
 assert.equal(good['Reported fault'],'none');
 // A phone that accepted the words and then did nothing — the case being reported.
 const mute=read({build:'b',standalone:true,supported:true,voices:[{lang:'ja-JP',name:'Kyoko'}],audioSession:'not supported',started:false,ended:false,error:''});
 assert.equal(mute['It started speaking'],'no — nothing began');
 assert.equal(mute['Silent-switch override'],'not supported');
 // A phone with voices but none of them Japanese, and one that cannot speak at all.
 assert.match(read({voices:[{lang:'en-AU',name:'Karen'}]})['Voices found'],/none of them Japanese/);
 assert.equal(read({supported:false,voices:null})['Speech support'],'no — this browser cannot speak');
 assert.equal(read({voices:null})['Voices found'],'none yet');
 assert.equal(read({})['Build'],'unknown');
 assert.deepEqual(describeVoices([{lang:'ja_JP',name:'K'},{lang:'en-US'}]),{count:2,japanese:['K'],state:'yes'});
 // The two iOS workarounds degrade quietly where the phone has never heard of them.
 const {resetPlaybackClaim,playbackClaim}=await import('../src/speech.js');
 resetPlaybackClaim();assert.equal(claimPlayback(null),'not supported');
 resetPlaybackClaim();assert.equal(claimPlayback({}),'not supported');
 resetPlaybackClaim();
 const phone={audioSession:{type:'auto'}};
 assert.equal(claimPlayback(phone),'playback','Safari starts as ambient, which the switch mutes');
 // Claimed once and then left alone: changing the type mid-session is what makes iOS play
 // nothing at all, so every call after the first must be a no-op.
 phone.audioSession.type='ambient';
 assert.equal(claimPlayback(phone),'playback','the answer is remembered, not asked again');
 assert.equal(phone.audioSession.type,'ambient','and the phone is not poked a second time');
 assert.equal(playbackClaim(),'playback');
 resetPlaybackClaim();
 assert.equal(warmUp(null,null),false);
 warmUp.done=false;
 let spoken=[];
 assert.equal(warmUp({speak:u=>spoken.push(u)},class{constructor(t){this.text=t;}}),true);
 assert.equal(spoken.length,1);assert.equal(spoken[0].volume,0,'the warm-up is silent');
 assert.equal(warmUp({speak:u=>spoken.push(u)},class{}),false,'only ever once');
 assert.equal(spoken.length,1);
});

test('a phrase of our own: asked for, checked, then kept',async()=>{
 const {createServer}=await import('node:http');
 let seen=null,reply={sensible:true,ja:'窓から離れた席はありますか？',romaji:'mado kara hanareta seki wa arimasu ka?',
  say:'ma-do ka-ra ha-na-reh-ta seh-kee wa a-ree-mass ka',literal:'Is there a seat away from the window?',note:''};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen={path:req.url,json:JSON.parse(body)};
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'msg_2',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'end_turn',
    usage:{input_tokens:300,output_tokens:120},content:[{type:'text',text:JSON.stringify(reply)}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {translatePhrase,translatorReady}=await import('../server/translate.mjs');
  assert.equal(translatorReady(),true);
  const out=await translatePhrase({english:'  Could we sit away from the window?  '});
  assert.equal(out.ja,reply.ja);
  assert.equal(out.literal,'Is there a seat away from the window?','what it actually says, back in English');
  assert.equal(out.usage.input,300);
  // The request itself: a schema-shaped answer, and the phrase as typed.
  assert.equal(seen.path,'/v1/messages');
  assert.equal(seen.json.model,'claude-opus-5');
  assert.equal(seen.json.output_config.format.type,'json_schema');
  assert.deepEqual(seen.json.output_config.format.schema.required,['ja','romaji','say','literal','note','sensible']);
  assert.match(seen.json.system,/polite form a visitor would use/);
  assert.match(JSON.stringify(seen.json.messages),/Could we sit away from the window\?/);
  assert.doesNotMatch(JSON.stringify(seen.json.messages),/ {2}Could/,'the phrase is trimmed before it is sent');
  // Nothing worth keeping gets refused rather than saved as an empty phrase.
  reply={sensible:false,ja:'',romaji:'',say:'',literal:'',note:''};
  await assert.rejects(()=>translatePhrase({english:'asdfghjkl'}),/does not look like something to say/);
  await assert.rejects(()=>translatePhrase({english:'   '}),/Type the phrase/);
  await assert.rejects(()=>translatePhrase({english:'x'.repeat(301)}),/one short phrase/);
 }finally{
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
  await new Promise(r=>upstream.close(r));
 }
});

test('our own phrases are checked here, not trusted because a model produced them',async()=>{
 const {ensureFeatures,ourPhrases}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 assert.deepEqual(state.customPhrases,[]);
 const good={type:'phraseAdd',en:'  Could we sit away from the window?  ',ja:'  窓から離れた席はありますか？  ',
  romaji:'mado kara hanareta seki wa arimasu ka?',say:'ma-do ka-ra ha-na-reh-ta seh-kee wa a-ree-mass ka',source:'translated'};
 const added=applyOperation(state,good,parent);
 const kept=added.customPhrases[0];
 assert.equal(kept.en,'Could we sit away from the window?','trimmed');
 assert.equal(kept.ja,'窓から離れた席はありますか？');
 assert.equal(kept.by,'Damien');assert.equal(kept.source,'translated');assert.ok(kept.at&&kept.id);
 // Japanese that is not Japanese is the failure a translator, or a typo, would produce.
 assert.throws(()=>applyOperation(state,{...good,ja:'mado kara'},parent),/needs to be in Japanese/);
 assert.throws(()=>applyOperation(state,{...good,ja:''},parent),/Add the Japanese/);
 assert.throws(()=>applyOperation(state,{...good,en:'   '},parent),/Add the English/);
 assert.throws(()=>applyOperation(state,{...good,say:'x'.repeat(201)},parent),/Invalid say/);
 // A typed-in phrase is marked as such rather than claiming to be translated.
 assert.equal(applyOperation(state,{...good,source:'anything else'},parent).customPhrases[0].source,'typed');
 // Editing keeps it in place; removing takes it away; the boys can do neither.
 const edited=applyOperation(added,{...good,type:'phraseEdit',id:kept.id,en:'Could we sit inside?'},parent);
 assert.equal(edited.customPhrases[0].en,'Could we sit inside?');
 assert.equal(edited.customPhrases[0].id,kept.id);
 assert.deepEqual(applyOperation(added,{type:'phraseRemove',id:kept.id},parent).customPhrases,[]);
 assert.throws(()=>applyOperation(added,{type:'phraseRemove',id:'nope'},parent),e=>e.status===404);
 for(const op of [good,{type:'phraseRemove',id:kept.id},{...good,type:'phraseEdit',id:kept.id}])
  assert.throws(()=>applyOperation(added,op,child),e=>e.status===403);
 // Newest first, and kept out of the book's own rota so the daily phrase never breaks.
 const two=applyOperation({...added,customPhrases:[{...kept,at:'2026-09-21T00:00:00.000Z'}]},{...good,en:'Later one'},parent);
 assert.deepEqual(ourPhrases(two).map(p=>p.en),['Later one','Could we sit away from the window?']);
 const {ALL_PHRASES}=await import('../src/phrasebook-data.js');
 assert.ok(!ALL_PHRASES().some(p=>p.id===kept.id),'our phrases stay out of the book');
});

test('kana, loanwords and a shuffle that every phone agrees on',async()=>{
 const {HIRAGANA,KATAKANA,KANA,LOANWORDS,shuffled,THROWS,jankenWinner,findThrow}=await import('../src/kana-data.js');
 assert.equal(HIRAGANA.length,46);assert.equal(KATAKANA.length,46);assert.equal(KANA.length,92);
 // Every kana is a single character, with a romaji, and the two sets line up sound for sound.
 for(const k of KANA){assert.equal([...k.kana].length,1,k.romaji);assert.match(k.romaji,/^[a-z]{1,3}$/);}
 assert.deepEqual(HIRAGANA.map(k=>k.romaji),KATAKANA.map(k=>k.romaji));
 assert.equal(new Set(KATAKANA.map(k=>k.kana)).size,46,'no kana repeated');
 // The loanwords have to be katakana, or the game teaches the wrong thing.
 assert.ok(LOANWORDS.length>=35);
 for(const w of LOANWORDS){
  assert.match(w.ja,/^[ァ-ヿー]+$/u,`${w.en} is not written in katakana`);
  assert.ok(w.en&&w.romaji,`${w.ja} is missing its English or romaji`);
 }
 assert.equal(new Set(LOANWORDS.map(w=>w.ja)).size,LOANWORDS.length);
 assert.ok(LOANWORDS.some(w=>w.en==='Toilet')&&LOANWORDS.some(w=>w.en==='Curry'));
 // Same seed, same board — so a shuffle is repeatable rather than jumping about on redraw.
 assert.deepEqual(shuffled(LOANWORDS,42).map(w=>w.ja),shuffled(LOANWORDS,42).map(w=>w.ja));
 assert.notDeepEqual(shuffled(LOANWORDS,42).map(w=>w.ja),shuffled(LOANWORDS,43).map(w=>w.ja));
 assert.equal(shuffled(LOANWORDS,7).length,LOANWORDS.length,'nothing is lost in the shuffle');
 assert.deepEqual([...shuffled(LOANWORDS,7)].map(w=>w.ja).sort(),LOANWORDS.map(w=>w.ja).sort());
 assert.deepEqual(shuffled([],5),[]);
 // Janken: the three hands, and who beats whom.
 assert.deepEqual(THROWS.map(t=>t.id),['rock','scissors','paper']);
 assert.equal(jankenWinner('rock','scissors'),'a');
 assert.equal(jankenWinner('scissors','rock'),'b');
 assert.equal(jankenWinner('paper','rock'),'a');
 assert.equal(jankenWinner('rock','rock'),null,'a draw');
 assert.equal(jankenWinner('rock','nonsense'),undefined);
 assert.equal(findThrow('paper').ja,'パー');
});

test('janken is played across two phones without either seeing the other hand',async()=>{
 const {ensureFeatures,jankenRound,jankenScores,roundComplete}=await import('../src/trip-features.js');
 const {visibleTrip}=await import('../server/visibility.mjs');
 const boston={name:'Boston',role:'child'};
 let state=ensureFeatures(structuredClone(seed));
 const players=['Boston','Nate'];
 // Nate throws first. What Boston's phone is sent must not contain Nate's hand.
 state=applyOperation(state,{type:'jankenThrow',person:'Nate',choice:'rock',players},child);
 assert.equal(jankenRound(state).throws.Nate,'rock');
 assert.equal(roundComplete(jankenRound(state),players),false);
 const toBoston=visibleTrip(state,boston),toNate=visibleTrip(state,child);
 assert.equal(toBoston.games.janken.round.throws.Nate,'hidden','Boston cannot see it');
 assert.equal(toNate.games.janken.round.throws.Nate,'rock','Nate still sees his own');
 assert.doesNotMatch(JSON.stringify(toBoston.games),/"rock"/,'and it is nowhere in what he is sent');
 // Boston answers. Now the round is done and both hands are shown to everyone.
 state=applyOperation(state,{type:'jankenThrow',person:'Boston',choice:'scissors',players},boston);
 const done=jankenRound(state);
 assert.equal(done.done,true);assert.equal(done.winner,'Nate','rock beats scissors');
 assert.equal(jankenScores(state).Nate,1);
 assert.equal(visibleTrip(state,boston).games.janken.round.throws.Nate,'rock','a finished round is open');
 // Throwing again after a finished round starts the next one rather than reopening it.
 const nextRound=applyOperation(state,{type:'jankenThrow',person:'Nate',choice:'paper',players},child);
 assert.notEqual(jankenRound(nextRound).id,done.id);
 assert.deepEqual(jankenRound(nextRound).throws,{Nate:'paper'});
 assert.equal(jankenScores(nextRound).Nate,1,'the score so far survives');
 // One hand per round, your own hand only, and two real players.
 assert.throws(()=>applyOperation(nextRound,{type:'jankenThrow',person:'Nate',choice:'rock',players},child),/already thrown/);
 assert.throws(()=>applyOperation(state,{type:'jankenThrow',person:'Boston',choice:'rock',players},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'jankenThrow',person:'Nate',choice:'dynamite',players},child),/rock, paper or scissors/);
 assert.throws(()=>applyOperation(state,{type:'jankenThrow',person:'Nate',choice:'rock',players:['Nate','Nate']},child),/two players/);
 assert.throws(()=>applyOperation(state,{type:'jankenThrow',person:'Nate',choice:'rock',players:['Damien','Lauren']},child),e=>e.status===403);
 // A draw scores nobody and can be thrown again.
 let drawn=applyOperation(applyOperation(ensureFeatures(structuredClone(seed)),{type:'jankenThrow',person:'Nate',choice:'paper',players},child),
  {type:'jankenThrow',person:'Boston',choice:'paper',players},boston);
 assert.equal(jankenRound(drawn).winner,null);
 assert.deepEqual(jankenScores(drawn),{});
 assert.equal(jankenRound(applyOperation(drawn,{type:'jankenNewRound'},child)),null);
 // Only a parent wipes the running score.
 assert.throws(()=>applyOperation(state,{type:'jankenReset'},child),e=>e.status===403);
 assert.deepEqual(jankenScores(applyOperation(state,{type:'jankenReset'},parent)),{});
});

test('a best score only ever goes up, and only your own',async()=>{
 const {ensureFeatures,bestScore}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 assert.deepEqual(state.games.scores,{});
 const first=applyOperation(state,{type:'gameScore',person:'Nate',game:'kana-hiragana',score:24},child);
 assert.equal(bestScore(first,'Nate','kana-hiragana'),24);
 assert.equal(bestScore(applyOperation(first,{type:'gameScore',person:'Nate',game:'kana-hiragana',score:9},child),'Nate','kana-hiragana'),24,'a worse round does not erase a best');
 assert.equal(bestScore(applyOperation(first,{type:'gameScore',person:'Nate',game:'kana-hiragana',score:30},child),'Nate','kana-hiragana'),30);
 assert.equal(bestScore(first,'Boston','kana-hiragana'),0,'each their own');
 assert.equal(bestScore(first,'Nate','katakana-decoder'),0,'each game its own');
 assert.throws(()=>applyOperation(state,{type:'gameScore',person:'Boston',game:'x',score:1},child),e=>e.status===403);
 for(const score of [-1,1.5,10000,'12'])assert.throws(()=>applyOperation(state,{type:'gameScore',person:'Nate',game:'kana-hiragana',score},child),/Invalid score/);
 assert.throws(()=>applyOperation(state,{type:'gameScore',person:'Nate',game:'',score:1},child),/Unknown game/);
});

test('every page in the registry is a tab the app will actually open',async()=>{
 const {PAGES}=await import('../src/nav-data.js');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 // The list of openable tabs is derived from the registry rather than typed out beside it,
 // which is what let a new page be reachable in the menu but not by its own link.
 assert.match(source,/const TABS=\[\.\.\.Object\.keys\(PAGES\),'more'\]/);
 for(const id of Object.keys(PAGES))
  assert.match(source,new RegExp(`tab==='${id}'`),`${id} is in the menu but nothing renders it`);
});

test('what a boy can do with no signal at all, and what has to wait',async()=>{
 const {ensureFeatures,pendingProgress,bestScore,phrasesSeenBy}=await import('../src/trip-features.js');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const list=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 // Everything the boys do on their own is progress, and progress keeps on a dead phone.
 // Anything that records what happened, or adds something new, is still right whenever it
 // lands, so it can wait on the phone.
 for(const op of ['status','challengeStatus','challengeSkip','eyeSpy','parkRide','foodTried','foodRating','phraseSeen','gameScore',
                  'journal','shoppingAdd','shoppingStatus','acknowledge','thankYouSeen','phraseAdd','foodAdd','documentNote'])
  assert.ok(list.includes(op),`${op} should survive with no signal`);
 // A janken hand is not progress — it is a move in a game the other phone is waiting on.
 assert.ok(!list.includes('jankenThrow'),'a hand thrown into a queue is not a game');
 // A stale reading overwriting a fresh one is worse than not saving it at all.
 for(const op of ['exchangeRate','weatherUpdate'])
  assert.ok(!list.includes(op),`${op} would overwrite a fresher answer`);
 // And anything that reshapes the plan needs the latest revision to be safe.
 for(const op of ['add','patch','remove','schedule','reschedule','choose','lock','backlog','challengeNew'])
  assert.ok(!list.includes(op),`${op} changes the plan and needs the latest revision`);
 // And the phone shows queued progress straight away rather than looking like it did nothing.
 const state=ensureFeatures(structuredClone(seed));
 const queue=[{operation:{type:'gameScore',person:'Nate',game:'kana-hiragana',score:28}},
              {operation:{type:'phraseSeen',person:'Nate',day:seed.days[0].date,phraseIds:['hello'],at:'2026-09-20T23:00:00.000Z'}}];
 const preview=pendingProgress(state,queue);
 assert.equal(bestScore(preview,'Nate','kana-hiragana'),28);
 assert.ok(phrasesSeenBy(preview,'Nate').hello);
 assert.equal(bestScore(state,'Nate','kana-hiragana'),0,'the real trip is untouched until it syncs');
});

test('a forecast is read, sanity-checked, and kept for when there is no signal',async()=>{
 const {forecastUrl,parseForecast,pointFor,describe,advice,ageLabel,forecastAge,forecastFor}=await import('../src/weather-data.js');
 const {ensureFeatures}=await import('../src/trip-features.js');
 // Each day of the trip has a real place to ask about, and the Disney days are Urayasu.
 for(const d of seed.days)assert.ok(pointFor(d.city).lat>30&&pointFor(d.city).lat<46,`${d.city} has no sensible point`);
 assert.equal(pointFor('Kyoto').name,'Kyoto');
 assert.notEqual(pointFor('Disneyland').lon,pointFor('Tokyo').lon,'the bay is not central Tokyo');
 const url=new URL(forecastUrl(pointFor('Tokyo'),'2026-09-21','2026-09-28'));
 assert.equal(url.origin+url.pathname,'https://api.open-meteo.com/v1/forecast');
 assert.equal(url.searchParams.get('timezone'),'Asia/Tokyo','or every day is off by one');
 assert.equal(url.searchParams.get('start_date'),'2026-09-21');
 assert.match(url.searchParams.get('daily'),/temperature_2m_max/);
 assert.ok(!url.search.includes('key')&&!url.search.includes('token'),'this service needs no key');
 // Parallel arrays in, one entry per day out — and nonsense dropped rather than displayed.
 const parsed=parseForecast({daily:{time:['2026-09-21','2026-09-22','2026-09-23','2026-09-24'],
  weather_code:[61,0,null,3],temperature_2m_max:[24.4,27.8,25,9999],temperature_2m_min:[19.2,20.1,18,3],
  precipitation_probability_max:[80,5,10,null]}},'Tokyo');
 assert.deepEqual(Object.keys(parsed),['2026-09-21','2026-09-22'],'a missing code or a silly temperature is dropped');
 assert.deepEqual(parsed['2026-09-21'],{city:'Tokyo',code:61,max:24,min:19,rain:80,sunrise:null,sunset:null});
 assert.deepEqual(parseForecast({},'Tokyo'),{});
 assert.deepEqual(parseForecast({daily:{time:'nope'}},'Tokyo'),{});
 assert.deepEqual(parseForecast({daily:{time:['2026-09-21'],weather_code:[0],temperature_2m_max:[10],temperature_2m_min:[20]}},'Tokyo'),{},'a minimum above the maximum is not a reading');
 // Words and a picture, and something to actually do about it.
 assert.deepEqual(describe(61),['Light rain','🌦️']);
 assert.deepEqual(describe(999)[0],'Unknown');
 assert.match(advice({code:61,max:22,min:18,rain:80}),/[Uu]mbrella/);
 assert.match(advice({code:95,max:24,min:20,rain:60}),/indoor/);
 assert.match(advice({code:0,max:33,min:26,rain:0}),/Hot/);
 assert.match(advice({code:0,max:9,min:2,rain:0}),/Cold/);
 assert.equal(advice({code:0,max:22,min:16,rain:10}),'','a fine day needs no advice');
 assert.equal(advice(null),'');
 // Stored in the trip, so it is on the phone whether or not there is signal.
 let state=ensureFeatures(structuredClone(seed));
 assert.equal(forecastFor(state,seed.days[0].date),null);
 assert.equal(forecastAge(state),null);
 assert.equal(ageLabel(null),'never checked');
 const at='2026-09-21T00:00:00.000Z';
 state=applyOperation(state,{type:'weatherUpdate',days:{[seed.days[0].date]:{city:'Tokyo',code:61,max:24,min:19,rain:80},'2099-01-01':{city:'Nowhere',code:0,max:20,min:10,rain:0}}},child);
 assert.deepEqual(forecastFor(state,seed.days[0].date),{city:'Tokyo',code:61,max:24,min:19,rain:80,sunrise:null,sunset:null});
 assert.equal(forecastFor(state,'2099-01-01'),null,'a day we are not in Japan is not stored');
 assert.ok(state.weather.at&&state.weather.by==='Nate');
 assert.equal(ageLabel(0.2),'checked just now');
 assert.equal(ageLabel(3),'checked 3 hours ago');
 assert.equal(ageLabel(49),'checked 2 days ago');
 // Rubbish from a service, or from anyone else, is refused rather than stored.
 const bad=v=>assert.throws(()=>applyOperation(state,{type:'weatherUpdate',days:{[seed.days[1].date]:v}},parent),/Invalid forecast/);
 bad({city:'Tokyo',code:61,max:24,min:30,rain:0});
 bad({city:'Tokyo',code:61.5,max:24,min:19,rain:0});
 bad({city:'Tokyo',code:61,max:900,min:19,rain:0});
 bad({city:'Tokyo',code:61,max:24,min:19,rain:400});
 bad(null);
 assert.throws(()=>applyOperation(state,{type:'weatherUpdate',days:[]},parent),/Invalid forecast/);
});

test('a queue cannot be jammed by one update the family plan has moved past',async()=>{
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const flush=source.slice(source.indexOf('async function flush'),source.indexOf('async function mutate'));
 // A 404 at the head of the queue used to block everything behind it forever.
 assert.match(flush,/if\(!err\.status\|\|err\.status===409\|\|err\.status>=500\)throw err/,
  'a permanent refusal must be dropped, not retried forever');
 assert.match(flush,/dropped\.push/);
 assert.match(flush,/saveQueue\(queueRef\.current\.slice\(1\)\)/);
 // A conflict and a server having a moment are both still worth retrying.
 assert.match(flush,/409/);
});

test('a recording waits on the phone in its own store, not in the little JSON queue',async()=>{
 const source=await readFile(new URL('../src/pending-store.js',import.meta.url),'utf8');
 const voice=await readFile(new URL('../src/VoiceNotes.jsx',import.meta.url),'utf8');
 // Audio is megabytes; the queue lives in localStorage and would not survive it.
 assert.match(source,/indexedDB/);
 assert.doesNotMatch(source,/localStorage\./,'the audio must not go near the little JSON queue');
 // Every path out of the store has to cope with a phone that will not give us one.
 for(const fn of ['listPending','dropPending','pendingSupported'])assert.match(source,new RegExp(`export (async )?function ${fn}|export const ${fn}`),`${fn} is missing`);
 assert.match(source,/catch\{return \[\];\}/,'listing must degrade to nothing pending');
 // Losing signal keeps the recording rather than throwing it away.
 assert.match(voice,/if\(!navigator\.onLine\)return hold\(/);
 assert.match(voice,/if\(!navigator\.onLine\)await hold\('The signal went while it was uploading\.'\)/);
 // And what is waiting is sent on its own once there is signal.
 assert.match(voice,/if\(waiting\.length&&navigator\.onLine&&config\?\.uploads\)sendWaiting\(\)/);
 assert.match(voice,/await dropPending\(entry\.id\)/);
});

test('the merge board slides, merges once, and knows when it is stuck',async()=>{
 const {slideLine,slide,addTile,canMove,emptyBoard,mergeTile,MERGE_LADDER,bestTile}=await import('../src/kana-data.js');
 // A pair merges, and the result does not merge again in the same move.
 assert.deepEqual(slideLine([2,2,4,0]),{line:[4,4,0,0],gained:4});
 assert.deepEqual(slideLine([2,2,2,2]),{line:[4,4,0,0],gained:8},'two separate pairs, not one chain');
 assert.deepEqual(slideLine([4,2,2,0]),{line:[4,4,0,0],gained:4});
 assert.deepEqual(slideLine([0,0,0,2]),{line:[2,0,0,0],gained:0});
 assert.deepEqual(slideLine([0,0,0,0]),{line:[0,0,0,0],gained:0});
 assert.deepEqual(slideLine([2048,2048,0,0]),{line:[2048,2048,0,0],gained:0},'the top of the ladder is the top');
 // Every direction works, and a move that changes nothing is refused.
 let board=emptyBoard();board[0]=2;board[3]=2;
 assert.deepEqual(slide(board,'left').board.slice(0,4),[4,0,0,0]);
 assert.deepEqual(slide(board,'right').board.slice(0,4),[0,0,0,4]);
 assert.equal(slide(slide(board,'left').board,'left').changed,false,'nothing to do is not a move');
 let column=emptyBoard();column[0]=2;column[4]=2;
 assert.equal(slide(column,'up').board[0],4);
 assert.equal(slide(column,'down').board[12],4);
 assert.equal(slide(emptyBoard(),'up').changed,false);
 // A new tile lands on a free square and never on top of something.
 const full=Array(16).fill(2);
 assert.deepEqual(addTile(full,5),full,'a full board stays as it is');
 const one=addTile(emptyBoard(),7);
 assert.equal(one.filter(Boolean).length,1);
 assert.ok([2,4].includes(one.find(Boolean)));
 // Stuck means no space and no pair anywhere.
 const stuck=[2,4,2,4, 4,2,4,2, 2,4,2,4, 4,2,4,2];
 assert.equal(canMove(stuck),false);
 assert.equal(canMove(full),true,'a full board of pairs can still move');
 assert.equal(canMove(emptyBoard()),true);
 // The ladder climbs by doubling, all the way to Fuji.
 MERGE_LADDER.forEach((t,i)=>{assert.equal(t.value,2**(i+1));assert.ok(t.icon&&t.en&&t.ja);});
 assert.equal(MERGE_LADDER.at(-1).en,'Mount Fuji');
 assert.equal(mergeTile(64).en,'Cherry blossom');
 assert.equal(mergeTile(3),null);
 assert.equal(bestTile(stuck),4);
});

test('anyone can put an idea on the planning board, and it is checked before it lands',async()=>{
 const {proposalPlacement,proposalScore}=await import('../src/trip-features.js');
 const idea={type:'proposalAdd',title:'teamLab Planets',place:'Toyosu, Koto City',category:'activity',timing:'window',
  availability:'Daily 09:00–21:00, last entry 20:00',cost:3800,costNote:'each',website:'https://www.teamlab.art/e/planets/',
  suitableFor:['Nate','Boston'],tags:['book ahead','Tokyo'],notes:'Barefoot, so roll the trousers up.',duration:120};
 // A boy who cannot edit a single activity can still say where he wants to go.
 const added=applyOperation(seed,idea,child),p=added.proposals.at(-1);
 assert.equal(p.addedBy,'Nate');assert.equal(p.cost,3800);assert.deepEqual(p.suitableFor,['Nate','Boston']);
 assert.deepEqual(p.tags,['book ahead','Tokyo']);assert.equal(p.stepId,null);
 assert.equal(proposalPlacement(added,p).state,'open');assert.equal(proposalScore(p),0);
 // The rest of the family hears about it, because an idea nobody sees is not a plan.
 assert.match(added.alerts[0].summary,/Nate added teamLab Planets/);
 assert.equal(added.history[0].title,'teamLab Planets');
 for(const bad of [{...idea,title:'   '},{...idea,website:'http://example.com'},{...idea,mapUrl:'javascript:alert(1)'},
  {...idea,cost:-5},{...idea,category:'nonsense'},{...idea,timing:'whenever'},{...idea,day:'2099-01-01'},
  {...idea,suitableFor:['Grandma']},{...idea,time:'25:00'},{...idea,duration:5000},{...idea,tags:Array.from({length:21},(_,i)=>`tag-${i}`)},{...idea,tags:['x'.repeat(51)]}])
  assert.throws(()=>applyOperation(seed,bad,parent),`${JSON.stringify(bad).slice(0,60)} should be refused`);
});
test('a vote belongs to the person who cast it, and only a parent puts an idea on a day',async()=>{
 const {proposalScore,proposalVoters,proposalMusts}=await import('../src/trip-features.js');
 let state=applyOperation(seed,{type:'proposalAdd',title:'Nara deer park'},parent);
 const id=state.proposals.at(-1).id,at=state=>state.proposals.find(p=>p.id===id);
 state=applyOperation(state,{type:'proposalVote',id,person:'Nate',vote:1},child);
 state=applyOperation(state,{type:'proposalVote',id,person:'Lauren',vote:-1},parent);
 state=applyOperation(state,{type:'proposalMust',id,person:'Nate',must:true},child);
 assert.equal(proposalScore(at(state)),0);
 assert.deepEqual(proposalVoters(at(state),1),['Nate']);
 assert.deepEqual(proposalVoters(at(state),-1),['Lauren']);
 assert.deepEqual(proposalMusts(at(state)),['Nate']);
 // Changing your mind replaces your vote; clearing it takes it away entirely.
 state=applyOperation(state,{type:'proposalVote',id,person:'Nate',vote:-1},child);
 assert.equal(proposalScore(at(state)),-2);
 state=applyOperation(state,{type:'proposalVote',id,person:'Nate',vote:0},child);
 assert.equal(proposalScore(at(state)),-1);
 assert.deepEqual(proposalMusts(at(state)),['Nate'],'clearing a vote is not giving up a must-do');
 // Nobody votes for anybody else, and nobody but a parent moves the itinerary.
 for(const op of [{type:'proposalVote',id,person:'Boston',vote:1},{type:'proposalMust',id,person:'Boston',must:true},
  {type:'proposalSchedule',id,day:seed.days[0].date,time:'10:00'}])
  assert.throws(()=>applyOperation(state,op,child),e=>e.status===403);
 // Votes are not news. They stay out of the family alert feed.
 assert.ok(!state.alerts.some(a=>a.summary.includes('Nara deer park')&&/vote/i.test(a.summary)));
 assert.equal(state.history[0].title,'Planning · Nara deer park');
});
test('a parent turns a backed idea into an activity, carrying its hours and cost across',async()=>{
 const {proposalPlacement}=await import('../src/trip-features.js');
 const day=seed.days[2].date;
 let state=applyOperation(seed,{type:'proposalAdd',title:'Fushimi Inari at dawn',place:'Fushimi Inari Taisha',timing:'window',
  availability:'Open all hours',cost:0,costNote:'free',suitableFor:['Damien','Boston'],notes:'Go early, before the crowds.',duration:90},parent);
 const id=state.proposals.at(-1).id;
 state=applyOperation(state,{type:'proposalSchedule',id,day,time:'06:30',kind:'flexible'},parent);
 const where=proposalPlacement(state,state.proposals.find(p=>p.id===id));
 assert.equal(where.state,'scheduled');assert.equal(where.day,day);assert.equal(where.time,'06:30');assert.equal(where.locked,false);
 assert.equal(where.step.fromProposalId,id);assert.deepEqual(where.step.participants,['Damien','Boston']);
 assert.equal(where.step.duration,90);assert.equal(where.step.place,'Fushimi Inari Taisha');
 // What someone standing outside the gate needs is the opening hours and the price, so both
 // travel with the activity rather than staying behind on the board.
 assert.match(where.step.notes,/Go early/);
 assert.match(where.step.notes,/Available: Open all hours/);
 assert.match(where.step.notes,/Estimated cost ¥0 · free/);
 assert.ok(activeSteps(state,day).some(s=>s.id===where.step.id),'the new activity shows up on its day');
 assert.match(state.alerts[0].summary,/Fushimi Inari at dawn added to/);
 // It only goes on once, and a locked time has to be a time.
 assert.throws(()=>applyOperation(state,{type:'proposalSchedule',id,day,time:'07:00'},parent),/already on the itinerary/);
 // The page you buy the ticket on is the one wanted on the day, so it wins the activity's link.
 let booked=applyOperation(seed,{type:'proposalAdd',title:'Ghibli Museum',website:'https://www.ghibli-museum.jp/',ticketUrl:'https://l-tike.com/ghibli/'},parent);
 const ghibli=booked.proposals.at(-1).id;
 booked=applyOperation(booked,{type:'proposalSchedule',id:ghibli,day,time:'10:00',kind:'fixed'},parent);
 assert.equal(proposalPlacement(booked,booked.proposals.find(p=>p.id===ghibli)).step.website,'https://l-tike.com/ghibli/');
 const spare=applyOperation(seed,{type:'proposalAdd',title:'Kabuki matinee',timing:'fixed'},parent);
 const spareId=spare.proposals.at(-1).id;
 assert.throws(()=>applyOperation(spare,{type:'proposalSchedule',id:spareId,day,kind:'fixed'},parent),/needs a time/);
 assert.throws(()=>applyOperation(spare,{type:'proposalSchedule',id:spareId,day:'2099-01-01',time:'13:00'},parent),/trip day/);
});
test('a scheduled idea moves between days under the same lock, and comes back if its activity goes',async()=>{
 const {proposalPlacement}=await import('../src/trip-features.js');
 const [a,b]=[seed.days[1].date,seed.days[4].date];
 let state=applyOperation(seed,{type:'proposalAdd',title:'Pokémon Center',timing:'fixed'},parent);
 const id=state.proposals.at(-1).id,at=s=>proposalPlacement(s,s.proposals.find(p=>p.id===id));
 state=applyOperation(state,{type:'proposalSchedule',id,day:a,time:'11:00',kind:'fixed'},parent);
 assert.equal(at(state).locked,true,'an idea that needs a fixed time arrives locked');
 assert.equal(at(state).step.bookingTime,'11:00');
 // A step made from an idea is a step like any other: the lock is what guards its time.
 assert.throws(()=>applyOperation(state,{type:'patch',id:at(state).step.id,patch:{day:b}},parent),/Unlock/);
 state=applyOperation(state,{type:'lock',id:at(state).step.id,locked:false},parent);
 state=applyOperation(state,{type:'patch',id:at(state).step.id,patch:{day:b,time:'15:00'}},parent);
 assert.equal(at(state).day,b);assert.equal(at(state).time,'15:00');
 // Sent to Options, the board says exactly that rather than claiming a day it no longer has.
 assert.equal(at(applyOperation(state,{type:'backlog',id:at(state).step.id},parent)).state,'options');
 // And if the activity is deleted, the idea is simply an idea again.
 const removed=applyOperation(state,{type:'remove',id:at(state).step.id},parent);
 assert.equal(removed.proposals.find(p=>p.id===id).stepId,null);
 assert.equal(at(removed).state,'open');
 // While it is on the itinerary it cannot be deleted or parked out from under the activity.
 assert.throws(()=>applyOperation(state,{type:'proposalRemove',id},parent),/Remove the activity first/);
 assert.throws(()=>applyOperation(state,{type:'proposalPark',id,parked:true},parent),/Take this off the itinerary/);
 // A parked idea stays on the board but out of the way, and comes back when asked.
 const parked=applyOperation(removed,{type:'proposalPark',id,parked:true},parent);
 assert.equal(at(parked).state,'parked');
 assert.equal(at(applyOperation(parked,{type:'proposalPark',id,parked:false},parent)).state,'open');
});
test('the board ranks what the family wants most, and filters by who each idea suits',async()=>{
 const {rankedProposals}=await import('../src/trip-features.js');
 let state=seed;
 for(const [title,suitableFor,cost] of [['Ramen alley',[],1200],['Cat cafe',['Nate'],2000],['Whisky bar',['Damien','Lauren'],null]])
  state=applyOperation(state,{type:'proposalAdd',title,suitableFor,cost},parent);
 const id=title=>state.proposals.find(p=>p.title===title).id;
 for(const person of ['Damien','Lauren','Boston'])state=applyOperation(state,{type:'proposalVote',id:id('Ramen alley'),person,vote:1},parent);
 state=applyOperation(state,{type:'proposalVote',id:id('Cat cafe'),person:'Nate',vote:1},parent);
 state=applyOperation(state,{type:'proposalMust',id:id('Cat cafe'),person:'Nate',must:true},parent);
 state=applyOperation(state,{type:'proposalVote',id:id('Whisky bar'),person:'Nate',vote:-1},parent);
 const titles=opts=>rankedProposals(state,opts).map(p=>p.title);
 assert.deepEqual(titles({}),['Ramen alley','Cat cafe','Whisky bar']);
 assert.deepEqual(titles({sort:'musts'}),['Cat cafe','Ramen alley','Whisky bar']);
 assert.deepEqual(titles({sort:'cost'}),['Ramen alley','Cat cafe','Whisky bar'],'no price yet sorts last, not free');
 // An idea with nobody named suits everyone; one named for Nate does not follow Damien around.
 assert.deepEqual(titles({suits:'Nate'}),['Ramen alley','Cat cafe']);
 assert.deepEqual(titles({suits:'Damien'}),['Ramen alley','Whisky bar']);
 // Who added it and who voted on it are both ways back to an idea.
 assert.deepEqual(titles({by:'Boston'}),['Ramen alley']);
 assert.deepEqual(titles({query:'cat'}),['Cat cafe']);
 assert.deepEqual(titles({placement:'open'}).length,3);
 assert.deepEqual(titles({placement:'scheduled'}),[]);
});
test('an idea thought of with no signal, and the votes on it, wait on the phone',async()=>{
 const {ensureFeatures,pendingProgress,proposalScore,proposalMusts}=await import('../src/trip-features.js');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const list=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 for(const op of ['proposalAdd','proposalVote','proposalMust'])assert.ok(list.includes(op),`${op} should survive with no signal`);
 // Putting one on a day reshapes the itinerary, so that one needs the latest revision.
 assert.ok(!list.includes('proposalSchedule'),'scheduling changes the plan and needs the latest revision');
 let state=applyOperation(ensureFeatures(structuredClone(seed)),{type:'proposalAdd',title:'Sumo morning practice'},parent);
 const id=state.proposals.at(-1).id,at='2026-09-19T02:00:00.000Z';
 const queue=[{operation:{type:'proposalAdd',operationId:'q1',person:'Boston',title:'Vending machine hunt',category:'activity',timing:'flex',at}},
              {operation:{type:'proposalVote',operationId:'q2',id,person:'Boston',vote:1}},
              {operation:{type:'proposalMust',operationId:'q3',id,person:'Boston',must:true,at}}];
 const preview=pendingProgress(state,queue),fresh=preview.proposals.find(p=>p.title==='Vending machine hunt');
 assert.equal(fresh.addedBy,'Boston');assert.ok(fresh.pending,'the phone says it has not synced yet');
 assert.equal(proposalScore(preview.proposals.find(p=>p.id===id)),1);
 assert.deepEqual(proposalMusts(preview.proposals.find(p=>p.id===id)),['Boston']);
 assert.equal(proposalScore(state.proposals.find(p=>p.id===id)),0,'the shared trip is untouched until it syncs');
 // What the phone drew is what the server builds when the queue finally lands.
 const landed=applyOperation(state,queue[0].operation,{name:'Boston',role:'child'});
 assert.equal(landed.proposals.at(-1).title,'Vending machine hunt');
 assert.equal(landed.proposals.at(-1).createdAt,at);
 assert.equal(landed.proposals.at(-1).addedBy,'Boston');
});
test('the planning board is searchable and reachable from the search results',async()=>{
 const {searchTrip}=await import('../src/trip-features.js');
 const state=applyOperation(seed,{type:'proposalAdd',title:'Owl forest cafe',place:'Akihabara',notes:'Boston found it.',tags:['rainy day']},parent);
 const hit=searchTrip(state,'owl forest')[0];
 assert.equal(hit.type,'Planning');assert.equal(hit.title,'Owl forest cafe');
 assert.equal(searchTrip(state,'rainy day')[0]?.type,'Planning','a tag finds it too');
 // The search result has somewhere to go: every hit type maps to a real page.
 const page=await readFile(new URL('../src/PracticalPages.jsx',import.meta.url),'utf8');
 assert.match(page,/Planning:'planning'/);
});

test('looking a place up searches the web, and nothing it says is taken on trust',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures}=await import('../src/trip-features.js');
 const seen=[];
 // Two replies: the search loop stopping for breath, then the findings. The second must arrive
 // without a "carry on" message of our own, which is how the server knows to resume.
 const replies=[
  {stop_reason:'pause_turn',content:[{type:'server_tool_use',id:'srv_1',name:'web_search',input:{query:'teamLab Planets hours'}}]},
  {stop_reason:'tool_use',content:[{type:'tool_use',id:'call_1',name:'record_findings',input:{
   found:true,title:'teamLab Planets TOKYO',place:'Toyosu, Koto City',address:'6-1-16 Toyosu, Koto City, Tokyo',
   japanese:'チームラボプラネッツ TOKYO',availability:'Daily 09:00–22:00, last entry 21:00, closed 2nd Tuesday',
   cost:3800,costNote:'adult; ¥1,500 for Boston, free for Nate',duration:120,category:'activity',timing:'fixed',
   website:'https://www.teamlab.art/e/planets/',ticketUrl:'https://ticket.teamlab.art/planets',
   mapUrl:'https://maps.app.goo.gl/abc123',suitableFor:['Damien','Lauren','Nate','Boston'],
   tags:['Tokyo','book ahead','indoors'],notes:'Barefoot and knee-deep in water, so roll the trousers up.',
   bestDay:seed.days[1].date,checkFirst:'Times and the closed Tuesday change — check the official ticket page before booking.',
   sources:[{title:'teamLab Planets official site',url:'https://www.teamlab.art/e/planets/'},{title:'A blog',url:'http://notsecure.example.com'}]}}]}
 ];
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen.push(JSON.parse(body));
   const reply=replies[Math.min(seen.length-1,replies.length-1)];
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:`msg_${seen.length}`,type:'message',role:'assistant',model:'claude-opus-5',
    usage:{input_tokens:9000,output_tokens:800,server_tool_use:{web_search_requests:3}},...reply}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {researchPlace,researchReady,normaliseFindings}=await import('../server/research.mjs');
  assert.equal(researchReady(),true);
  const state=ensureFeatures(structuredClone(seed));
  const answer=await researchPlace({title:'teamLab Planets',place:'Tokyo'},state);

  // The request the SDK actually put on the wire.
  assert.equal(seen.length,2,'a paused search is resumed');
  const [first,resumed]=seen;
  assert.equal(first.model,'claude-opus-5');
  assert.deepEqual(first.thinking,{type:'adaptive'});
  assert.equal(first.output_config.effort,'medium');
  const search=first.tools.find(t=>t.name==='web_search');
  assert.equal(search.type,'web_search_20260209');
  assert.equal(search.max_uses,8);
  assert.equal(search.user_location.country,'JP','asked from Japan, so the local pages come back');
  const record=first.tools.find(t=>t.name==='record_findings');
  assert.equal(record.strict,true);
  assert.equal(record.input_schema.additionalProperties,false);
  for(const field of ['availability','ticketUrl','mapUrl','cost','checkFirst','sources'])
   assert.ok(record.input_schema.required.includes(field),`${field} must come back`);
  // The trip itself is in the question, so it can pick a day we are in the right city.
  assert.match(first.messages[0].content,/teamLab Planets/);
  assert.match(first.messages[0].content,new RegExp(`${seed.days[0].date} · `));
  assert.match(first.system,/Nate is five/);
  assert.match(first.system,/You are not booking anything/);
  assert.equal(resumed.messages.length,2,'the paused turn is sent back, and nothing else');
  assert.equal(resumed.messages[1].role,'assistant');

  // And what comes back is a draft in the same shape the board already validates.
  assert.equal(answer.draft.title,'teamLab Planets TOKYO');
  assert.match(answer.draft.place,/Toyosu, Koto City · 6-1-16 Toyosu/);
  assert.equal(answer.draft.availability,'Daily 09:00–22:00, last entry 21:00, closed 2nd Tuesday');
  assert.equal(answer.draft.cost,3800);
  assert.equal(answer.draft.duration,120);
  assert.equal(answer.draft.timing,'fixed');
  assert.equal(answer.draft.ticketUrl,'https://ticket.teamlab.art/planets');
  assert.equal(answer.draft.mapUrl,'https://maps.app.goo.gl/abc123');
  assert.deepEqual(answer.draft.suitableFor,[],'suiting all four is the same as suiting everyone');
  assert.equal(answer.bestDay,seed.days[1].date);
  assert.equal(answer.draft.day,seed.days[1].date,'the suggested day fills the blank like any other');
  assert.match(answer.checkFirst,/check the official ticket page/);
  assert.deepEqual(answer.sources.map(s=>s.url),['https://www.teamlab.art/e/planets/'],'a plain http source is dropped');
  assert.equal(answer.usage.searches,3);

  // A draft is only a draft: it still has to pass the board's own checks to be saved.
  const saved=applyOperation(state,{type:'proposalAdd',...answer.draft},parent).proposals.at(-1);
  assert.equal(saved.ticketUrl,'https://ticket.teamlab.art/planets');
  assert.equal(saved.addedBy,'Damien');

  // Nothing a model returns is trusted: invented links go, out-of-range numbers go, and a
  // map link that is not a map becomes a plain Maps search for the address instead.
  const junk=normaliseFindings({found:true,title:'A'.repeat(400),place:'',address:'1 Somewhere',japanese:'',
   availability:'',cost:-40,costNote:'',duration:99999,category:'teleportation',timing:'whenever',
   website:'javascript:alert(1)',ticketUrl:'http://insecure.example.com',mapUrl:'https://evil.example.com/maps',
   suitableFor:['Nate','Grandma'],tags:Array.from({length:40},(_,i)=>`t${i}`),notes:'',bestDay:'2099-01-01',
   checkFirst:'',sources:[{title:'x',url:'ftp://nope'}]},state);
  assert.equal(junk.draft.title.length,250);
  assert.equal(junk.draft.cost,null,'a nonsense price is dropped, not corrected');
  assert.equal(junk.draft.duration,60);
  assert.equal(junk.draft.category,'place');
  assert.equal(junk.draft.timing,'flex');
  assert.equal(junk.draft.website,'');
  assert.equal(junk.draft.ticketUrl,'','a ticket link has to be HTTPS');
  assert.match(junk.draft.mapUrl,/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  assert.deepEqual(junk.draft.suitableFor,['Nate']);
  assert.equal(junk.draft.tags.length,20);
  assert.equal(junk.bestDay,null,'a day that is not on this trip is not a day');
  assert.deepEqual(junk.sources,[]);
  // Whatever survives that is still something the board will accept.
  assert.ok(applyOperation(state,{type:'proposalAdd',...junk.draft},parent).proposals.at(-1));

  await assert.rejects(()=>researchPlace({title:'   '},state),/Type what you want looked up/);
  await assert.rejects(()=>researchPlace({title:'x'.repeat(251)},state),/Keep the name/);
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
});
test('a lookup that found nothing says so, and only a parent can start one',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 const {researchPlace,researchReady}=await import('../server/research.mjs');
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 delete process.env.ANTHROPIC_API_KEY;
 try{
  assert.equal(researchReady(),false);
  await assert.rejects(()=>researchPlace({title:'Anywhere'},state),e=>e.status===503&&/not switched on/.test(e.message));
 }finally{if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;}
 const bodies=[
  {stop_reason:'tool_use',content:[{type:'tool_use',id:'c1',name:'record_findings',input:{found:false,checkFirst:'There is no such museum in Kyoto. Check the name.',title:'',place:'',address:'',japanese:'',availability:'',cost:null,costNote:'',duration:0,category:'place',timing:'flex',website:'',ticketUrl:'',mapUrl:'',suitableFor:[],tags:[],notes:'',bestDay:'',sources:[]}}]},
  {stop_reason:'end_turn',content:[{type:'text',text:'I had a look around.'}]},
  {stop_reason:'refusal',content:[]}
 ];
 let turn=0;
 const upstream=createServer((req,res)=>{
  req.on('data',()=>{});
  req.on('end',()=>{res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m',type:'message',role:'assistant',model:'claude-opus-5',usage:{input_tokens:1,output_tokens:1},...bodies[turn++]}));});
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  // Told plainly that it could not find the place, rather than handed a different one.
  await assert.rejects(()=>researchPlace({title:'The Kyoto museum of nothing'},state),e=>e.status===404&&/no such museum/.test(e.message));
  // An answer with no findings call in it is not an answer.
  await assert.rejects(()=>researchPlace({title:'Somewhere'},state),e=>e.status===502&&/nothing to fill in/.test(e.message));
  await assert.rejects(()=>researchPlace({title:'Somewhere'},state),e=>e.status===422&&/declined/.test(e.message));
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
 // The route itself is a parent's, like the menu reader and the translator.
 const handlerSource=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 assert.match(handlerSource,/route==='research'&&post\)\{\s*parent\(user\)/);
 assert.match(handlerSource,/research:researchReady\(\)/,'the app has to be told whether it is switched on');
});

test('everyone keeps their own travel profile, and a parent keeps the ones a five-year-old will not',async()=>{
 const {personProfile,party,partyBrief,partyInterests,profileFilled,INTERESTS}=await import('../src/trip-features.js');
 let state=applyOperation(seed,{type:'partyPerson',name:'Damien',age:41,interests:['food','drink','views'],
  loves:'a proper coffee',avoid:'long queues',dietary:'',notes:''},parent);
 // A boy fills in his own, with no edit rights anywhere else in the app.
 state=applyOperation(state,{type:'partyPerson',name:'Nate',age:5,interests:['kids','animals','trains'],
  loves:'anything with a train in it',avoid:'',dietary:'nothing spicy',notes:'Flags after about three o’clock.'},child);
 assert.equal(personProfile(state,'Damien').age,41);
 assert.deepEqual(personProfile(state,'Nate').interests,['kids','animals','trains']);
 assert.equal(personProfile(state,'Nate').by,'Nate');
 assert.equal(profileFilled(state,'Boston'),false,'a profile nobody has filled in says so');
 // What the family as a whole is after, most shared first.
 state=applyOperation(state,{type:'partyPerson',name:'Boston',interests:['trains','sport']},parent);
 assert.deepEqual(partyInterests(state)[0],{id:'trains',label:'Trains & engineering',who:['Nate','Boston']});
 // The paragraph a model reads is what was actually said, and blank where nothing was.
 const brief=partyBrief(state);
 assert.match(brief,/Damien, 41 — likes Food & markets, Bars, sake & coffee, Views & high places; loves a proper coffee; would rather avoid long queues/);
 assert.match(brief,/Nate, 5 —.*food: nothing spicy/);
 assert.match(brief,/Lauren — nothing said yet/);
 assert.match(brief,/Pace: Steady/);
 // Nobody fills in anybody else's, and the pace and the budget are a parent's.
 assert.throws(()=>applyOperation(state,{type:'partyPerson',name:'Boston',interests:['art']},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'partyTrip',pace:'gentle'},child),e=>e.status===403);
 for(const bad of [{type:'partyPerson',name:'Grandma',interests:[]},{type:'partyPerson',name:'Nate',age:400},
  {type:'partyPerson',name:'Nate',interests:['skydiving']},{type:'partyPerson',name:'Nate',loves:'x'.repeat(501)},
  {type:'partyTrip',pace:'frantic'},{type:'partyTrip',pace:'gentle',budget:-5}])
  assert.throws(()=>applyOperation(state,bad,parent),`${JSON.stringify(bad).slice(0,50)} should be refused`);
 // A blank age clears it; leaving the field out keeps what was there.
 assert.equal(personProfile(applyOperation(state,{type:'partyPerson',name:'Damien',age:''},parent),'Damien').age,null);
 assert.equal(personProfile(applyOperation(state,{type:'partyPerson',name:'Damien',interests:['art']},parent),'Damien').age,41);
 state=applyOperation(state,{type:'partyTrip',pace:'gentle',budget:25000,notes:'We have done enough temples.'},parent);
 assert.equal(party(state).pace,'gentle');assert.equal(party(state).budget,25000);
 assert.match(partyBrief(state),/Rough budget: ¥25,000 a day/);
 assert.match(partyBrief(state),/Worth knowing: We have done enough temples/);
 assert.ok(INTERESTS.length>=12,'enough to describe four different people');
 // None of this is the plan, so it never lands in the family alert feed.
 assert.ok(!state.alerts.some(a=>/profile|pace|budget/i.test(a.summary||'')));
});
test('suggestions are built from who is going, and land on the board as ordinary ideas',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures,proposalPlacement}=await import('../src/trip-features.js');
 let seen=null;
 const answer={note:'Checked what is on in Tokyo in late September.',suggestions:[
  {title:'A morning at a sumo stable practice',place:'Ryogoku, Tokyo',japanese:'相撲部屋 朝稽古',flavour:'unique',
   category:'activity',timing:'fixed',duration:120,cost:12000,costNote:'for all four, through a guide',
   suitableFor:['Damien','Lauren','Boston'],tags:['early start'],notes:'Watching training from the edge of the ring.',
   why:'Boston ticked sport and sumo.',bookAhead:true},
  {title:'Shibuya Scramble Crossing',place:'Shibuya, Tokyo',japanese:'渋谷スクランブル交差点',flavour:'landmark',
   category:'place',timing:'flex',duration:60,cost:0,costNote:'',suitableFor:['Damien','Lauren','Nate','Boston'],
   tags:['views'],notes:'The crossing everybody photographs.',why:'Damien ticked views.',bookAhead:false},
  // Junk, to prove the same checks run here as everywhere else.
  {title:'A'.repeat(400),place:'',japanese:'',flavour:'teleportation',category:'nonsense',timing:'whenever',
   duration:99999,cost:-3,costNote:'',suitableFor:['Grandma'],tags:Array.from({length:40},(_,i)=>`t${i}`),
   notes:'',why:'',bookAhead:false}]};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen=JSON.parse(body);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m1',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'tool_use',
    usage:{input_tokens:12000,output_tokens:1400,server_tool_use:{web_search_requests:3}},
    content:[{type:'tool_use',id:'c1',name:'record_suggestions',input:answer}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {suggestIdeas,suggestReady,normaliseSuggestion}=await import('../server/suggest.mjs');
  assert.equal(suggestReady(),true);
  let state=ensureFeatures(structuredClone(seed));
  state=applyOperation(state,{type:'partyPerson',name:'Boston',age:8,interests:['sport','trains']},parent);
  state=applyOperation(state,{type:'partyTrip',pace:'gentle',budget:25000,notes:''},parent);
  state=applyOperation(state,{type:'proposalAdd',title:'Nara deer park'},parent);
  const result=await suggestIdeas({city:'Tokyo',kinds:['landmark','unique','drink'],count:6},state);

  // The request the SDK actually put on the wire.
  assert.equal(seen.model,'claude-opus-5');
  assert.deepEqual(seen.thinking,{type:'adaptive'});
  const search=seen.tools.find(t=>t.name==='web_search');
  assert.equal(search.type,'web_search_20260209');
  assert.equal(search.max_uses,5);
  const record=seen.tools.find(t=>t.name==='record_suggestions');
  assert.equal(record.strict,true);
  assert.deepEqual(record.input_schema.properties.suggestions.items.required.includes('why'),true);
  const ask=seen.messages[0].content;
  assert.match(ask,/Suggest 6 ideas in Tokyo/);
  assert.match(ask,/The famous ones, Only-in-Japan, off the usual list, Drink/);
  assert.match(ask,/Boston, 8 — likes Sport & sumo, Trains & engineering/,'the party goes in the question');
  assert.match(ask,/Pace: Gentle/);
  assert.match(ask,/Rough budget: ¥25,000/);
  assert.match(ask,/Nara deer park/,'what is already on the board is not suggested again');
  assert.match(ask,new RegExp(seed.steps[0].title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'nor what is already on the plan');
  assert.match(seen.system,/Only-in-Japan, off the usual list/);
  assert.match(seen.system,/you are not checking opening hours, prices/);

  // What comes back is board-ready, and the junk one is cut to size rather than dropped whole.
  assert.equal(result.where,'Tokyo');
  assert.equal(result.suggestions.length,3);
  const [sumo,shibuya,junk]=result.suggestions;
  assert.equal(sumo.flavour,'unique');
  assert.equal(sumo.draft.source,'suggested','an idea a model thought of never passes as one we found');
  assert.equal(sumo.draft.cost,12000);
  assert.ok(sumo.draft.tags.includes('book ahead'),'needing a booking becomes a tag you can filter on');
  assert.deepEqual(shibuya.draft.suitableFor,[],'suiting all four is the same as suiting everyone');
  assert.equal(junk.draft.title.length,250);
  assert.equal(junk.draft.cost,null);
  assert.equal(junk.draft.duration,60);
  assert.equal(junk.draft.category,'place');
  assert.equal(junk.flavour,'unique');
  assert.deepEqual(junk.draft.suitableFor,[]);
  assert.equal(junk.draft.tags.length,20);
  // A suggestion carries no links at all: nothing here has been checked.
  for(const item of result.suggestions)for(const key of ['website','ticketUrl','mapUrl'])
   assert.equal(item.draft[key],'',`${key} must be left to Look it up`);
  assert.equal(result.usage.searches,3);

  // Putting one up is an ordinary idea, added by a person, that the family then votes on.
  const board=applyOperation(state,{type:'proposalAdd',...sumo.draft,notes:`${sumo.draft.notes}\n\n${sumo.why}`},child);
  const added=board.proposals.at(-1);
  assert.equal(added.addedBy,'Nate');
  assert.equal(added.source,'suggested');
  assert.match(added.notes,/Boston ticked sport and sumo/);
  assert.equal(proposalPlacement(board,added).state,'open');
  // Editing it later does not quietly relabel it as something we found ourselves.
  assert.equal(applyOperation(board,{type:'proposalEdit',id:added.id,...sumo.draft,title:'Sumo practice'},parent).proposals.at(-1).source,'suggested');

  // Guards, before anything is sent anywhere.
  await assert.rejects(()=>suggestIdeas({city:'Tokyo',kinds:[]},state),/at least one kind/);
  await assert.rejects(()=>suggestIdeas({kinds:['landmark']},state),/Choose a day or type where/);
  await assert.rejects(()=>suggestIdeas({day:'2099-01-01',kinds:['landmark']},state),/Choose a trip day/);
  // A day is enough on its own: it names the city and the day they will be there.
  await suggestIdeas({day:seed.days[0].date,kinds:['food']},state);
  assert.match(seen.messages[0].content,new RegExp(`ideas in ${seed.days[0].city}`));
  assert.match(seen.messages[0].content,new RegExp(`for ${seed.days[0].date}`));
  assert.equal(normaliseSuggestion({},state).draft.title,'');
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
 const handlerSource=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 assert.match(handlerSource,/route==='suggest'&&post\)\{\s*\n?\s*parent\(user\)/);
 assert.match(handlerSource,/suggest:suggestReady\(\)/);
});

test('what is near here answers from a position or a planned place, and adds straight to the day',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures,walkingLink,roundCoord,NEARBY_KINDS}=await import('../src/trip-features.js');
 let seen=null;
 const answer={anchor:'Ryogoku, by the north exit of the station',note:'Named shops change hands often — check the sign before you commit.',options:[
  {title:'Lawson',japanese:'ローソン',kind:'konbini',what:'Convenience store with a toilet, a cash machine and hot food.',
   area:'On the main road, north exit',walkMinutes:3,priceBand:'cheap',openNote:'Usually 24 hours, but check',kidFriendly:true,
   why:'Answers the toilet, the cash and lunch for Nate in one stop.'},
  {title:'Chanko Tomoegata',japanese:'ちゃんこ巴潟',kind:'food',what:'Sumo stew, the local dish, in a sit-down room.',
   area:'Ryogoku 2-chome',walkMinutes:8,priceBand:'mid',openNote:'Lunch about 11:30–14:00, guessing',kidFriendly:false,
   why:'The thing to eat in this neighbourhood, but it is a long sit for a five-year-old.'},
  {title:'B'.repeat(400),japanese:'',kind:'teleport',what:'',area:'',walkMinutes:9999,priceBand:'gold',openNote:'',kidFriendly:true,why:''}]};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen=JSON.parse(body);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m1',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'tool_use',
    usage:{input_tokens:4000,output_tokens:600,server_tool_use:{web_search_requests:2}},
    content:[{type:'tool_use',id:'c1',name:'record_nearby',input:answer}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {nearbyPlaces,nearbyReady}=await import('../server/nearby.mjs');
  assert.equal(nearbyReady(),true);
  let state=ensureFeatures(structuredClone(seed));
  state=applyOperation(state,{type:'partyPerson',name:'Nate',age:5,dietary:'nothing spicy'},parent);
  const result=await nearbyPlaces({lat:35.6963214,lng:139.7930871,place:'Ryogoku Kokugikan',city:'Tokyo',
   kinds:['food','toilet','konbini'],note:'twenty minutes before the train'},state);

  // A position is cut down before it is ever sent — a hundred metres, not a hotel room.
  assert.match(seen.messages[0].content,/Position, rounded to about a hundred metres: 35\.696, 139\.793/);
  assert.ok(!seen.messages[0].content.includes('35.6963214'),'the precise position never leaves');
  assert.match(seen.messages[0].content,/At or beside: Ryogoku Kokugikan/);
  assert.match(seen.messages[0].content,/In: Tokyo/);
  assert.match(seen.messages[0].content,/Somewhere to eat, Toilets, Convenience store/);
  assert.match(seen.messages[0].content,/twenty minutes before the train/);
  assert.match(seen.messages[0].content,/Nate, 5 —.*food: nothing spicy/,'who is with them shapes the answer');
  assert.equal(seen.output_config.effort,'low','the one asked standing in the street is tuned for speed');
  assert.equal(seen.tools.find(t=>t.name==='web_search').max_uses,4);
  assert.equal(seen.tools.find(t=>t.name==='record_nearby').strict,true);
  assert.match(seen.system,/You cannot see a map/);

  // Nearest first, and the junk one clamped rather than believed.
  assert.deepEqual(result.options.map(o=>o.draft.title.slice(0,20)),['Lawson','Chanko Tomoegata','BBBBBBBBBBBBBBBBBBBB']);
  assert.deepEqual(result.from,{lat:35.696,lng:139.793});
  const [lawson,chanko,junk]=result.options;
  assert.equal(lawson.walkMinutes,3);assert.equal(lawson.kidFriendly,true);
  assert.equal(lawson.draft.japanese,'ローソン','the name to point at comes back');
  assert.equal(lawson.draft.category,'food');
  assert.deepEqual(lawson.draft.suitableFor,[],'fine with Nate means fine with everyone');
  assert.deepEqual(chanko.draft.suitableFor,['Damien','Lauren','Boston'],'not one for Nate says so on the card');
  assert.equal(junk.kind,'food');assert.equal(junk.walkMinutes,null);assert.equal(junk.priceBand,'');
  assert.equal(junk.draft.title.length,250);
  // Nothing carries a link of its own; the app builds the walk from pieces it checked.
  for(const o of result.options)for(const key of ['website','ticketUrl','mapUrl'])assert.equal(o.draft[key],'');
  assert.equal(walkingLink('Lawson','north exit',result.from),
   'https://www.google.com/maps/dir/?api=1&origin=35.696,139.793&destination=Lawson%20north%20exit&travelmode=walking');
  assert.equal(walkingLink('Lawson','north exit',null),'https://www.google.com/maps/search/?api=1&query=Lawson%20north%20exit');
  assert.equal(roundCoord(35.6963214),35.696);

  // Quick add: straight onto today, right after whatever we are in the middle of.
  const day=seed.days[3].date,before=activeSteps(state,day);
  const after=applyOperation(state,{type:'add',step:{title:lawson.draft.title,day,time:null,duration:20,
   place:lawson.area,japanese:lawson.draft.japanese,notes:lawson.what,kind:'flexible',page:1,
   participants:[...state.members],order:before[0].order+0.5}},parent);
  const added=activeSteps(after,day);
  assert.equal(added.length,before.length+1);
  assert.equal(added[1].title,'Lawson','it lands after the step we are on, not at the end of the day');
  assert.equal(added[1].locked,false);assert.equal(added[1].status,'todo');
  // A boy cannot add to the itinerary, so his button saves it to the board instead.
  assert.throws(()=>applyOperation(state,{type:'add',step:{title:'Lawson',day}},child),e=>e.status===403);
  assert.equal(applyOperation(state,{type:'proposalAdd',...lawson.draft},child).proposals.at(-1).source,'suggested');

  // A planned place is enough on its own — no position needed, and none is sent.
  await nearbyPlaces({place:'Fushimi Inari Taisha',city:'Kyoto',kinds:['coffee']},state);
  assert.ok(!seen.messages[0].content.includes('Position'),'no position, nothing sent about one');
  assert.match(seen.messages[0].content,/At or beside: Fushimi Inari Taisha/);
  for(const [bad,pattern] of [
   [{kinds:['food']},/Say where you are/],
   [{place:'Ryogoku',kinds:[]},/Choose what you are looking for/],
   [{lat:999,lng:0,kinds:['food']},/position could not be read/]
  ])await assert.rejects(()=>nearbyPlaces(bad,state),pattern,JSON.stringify(bad));
  assert.ok(NEARBY_KINDS.some(([id])=>id==='toilet'),'amenities, not just food');
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
 // This one is not a parent's: whoever needs a toilet is whoever is holding the phone.
 const handlerSource=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 const from=handlerSource.indexOf("route==='nearby'");
 const route=handlerSource.slice(from,handlerSource.indexOf('\n  }',from));
 assert.ok(route.includes('nearbyPlaces'),'the route body was found');
 assert.ok(!route.includes('parent(user)'),'anyone in the family can ask what is near them');
 assert.match(handlerSource,/nearby:nearbyReady\(\)/);
 // And the position is never written into the trip.
 const nearbySource=await readFile(new URL('../server/nearby.mjs',import.meta.url),'utf8');
 assert.ok(!/state\.(steps|proposals|documents|journal)\s*=/.test(nearbySource),'a lookup writes nothing into the trip');
});

test('the food page hunts a dish rather than a meal, and only a dish we asked after',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures,NEARBY_KINDS,FOOD_NEARBY_KINDS,MAX_DISH_HUNT,matchDish}=await import('../src/trip-features.js');
 const {FOOD}=await import('../src/food-data.js');
 // The list writes a dish long — "Takoyaki — octopus balls" — and an answer that says "Mochi" is
 // talking about the same thing. One nobody asked about is an invention, however good it sounds.
 assert.equal(matchDish('Takoyaki — octopus balls',['Takoyaki — octopus balls']),'Takoyaki — octopus balls');
 assert.equal(matchDish('Mochi',['Mochi — pounded rice cake']),'Mochi — pounded rice cake');
 assert.equal(matchDish('Wagyu steak',['Mochi — pounded rice cake']),'');
 assert.equal(matchDish('',['Mochi — pounded rice cake']),'');
 assert.equal(matchDish('Mochi',[]),'');
 assert.equal(matchDish('Mochi ice cream',['Mochi — pounded rice cake']),'','a different dish that starts the same is not ours');
 for(const id of FOOD_NEARBY_KINDS)assert.ok(NEARBY_KINDS.some(([key])=>key===id),`${id} is a kind the lookup knows`);
 assert.ok(!FOOD_NEARBY_KINDS.includes('toilet'),'the amenity half is put away when the question is a dish');

 let seen=null;
 const answer={anchor:'Dotonbori, by the bridge',note:'Stalls move and close — look for the queue.',options:[
  {title:'FamilyMart',japanese:'ファミリーマート',kind:'konbini',what:'Convenience store with hot food.',
   area:'Under the bridge',walkMinutes:2,priceBand:'cheap',openNote:'Usually 24 hours, but check',kidFriendly:true,
   why:'Two minutes away if nobody can wait.',dish:''},
  {title:'Takoyaki Wanaka',japanese:'たこ焼き わなか',kind:'quick',what:'Takoyaki counter, eight to a tray.',
   area:'Sennichimae',walkMinutes:6,priceBand:'cheap',openNote:'Daytime into the evening, guessing',kidFriendly:true,
   why:'The Osaka one the boys have been promised.',dish:'Takoyaki — octopus balls'},
  {title:'Nakatanidou',japanese:'中谷堂',kind:'quick',what:'Mochi pounded in the shopfront.',
   area:'Sanjo-dori',walkMinutes:9,priceBand:'cheap',openNote:'Pounding through the day, guessing',kidFriendly:true,
   why:'Worth the extra three minutes for the show.',dish:'Mochi'},
  {title:'Sennari Steak',japanese:'',kind:'food',what:'Wagyu counter.',
   area:'Namba',walkMinutes:4,priceBand:'pricey',openNote:'',kidFriendly:false,
   why:'Good, but not what was asked for.',dish:'Wagyu steak'}]};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen=JSON.parse(body);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m2',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'tool_use',
    usage:{input_tokens:4000,output_tokens:600,server_tool_use:{web_search_requests:2}},
    content:[{type:'tool_use',id:'c1',name:'record_nearby',input:answer}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {nearbyPlaces}=await import('../server/nearby.mjs');
  const state=ensureFeatures(structuredClone(seed));
  const wishlist=['Takoyaki — octopus balls','Mochi — pounded rice cake','','   ','Takoyaki — octopus balls',
   'D'.repeat(300),...Array.from({length:14},(_,i)=>`Filler dish ${i}`)];
  const result=await nearbyPlaces({place:'Dotonbori',city:'Osaka',kinds:['food','quick'],wishlist},state);

  // The dishes go with the question, written out as the list writes them, deduped and capped.
  const asked=seen.messages[0].content;
  assert.match(asked,/Still on their food list, none of it tried yet/);
  assert.match(asked,/- Takoyaki — octopus balls/);
  assert.match(asked,/- Mochi — pounded rice cake/);
  const listed=asked.slice(asked.indexOf('copied exactly as written here:')).split('\n').slice(1);
  assert.equal(listed.findIndex(l=>!l.startsWith('- ')),MAX_DISH_HUNT,'a hunt carries twelve dishes, not fifty');
  assert.ok(!asked.includes('D'.repeat(200)),'a long name is cut down like everything else');
  assert.ok(!/- \s*$/m.test(asked),'an empty name is dropped rather than asked after');
  assert.match(seen.tools.find(t=>t.name==='record_nearby').input_schema.properties.options.items.required.join(' '),/dish/);
  assert.match(seen.system,/a ramen shop is not takoyaki/);

  // The place that does a dish we are hunting goes above the closer one that does not, and a dish
  // nobody asked after is dropped rather than put on a card.
  assert.deepEqual(result.options.map(o=>o.draft.title),['Takoyaki Wanaka','Nakatanidou','FamilyMart','Sennari Steak']);
  const [wanaka,nakatanidou,familymart,steak]=result.options;
  assert.equal(wanaka.dish,'Takoyaki — octopus balls');
  assert.equal(nakatanidou.dish,'Mochi — pounded rice cake','the short answer is matched back to the list');
  assert.equal(familymart.dish,'');
  assert.equal(steak.dish,'','a dish nobody asked about does not become one we are hunting');
  assert.match(wanaka.draft.notes,/On our food list: Takoyaki — octopus balls/,'saved or scheduled, it says why it is there');
  assert.ok(!steak.draft.notes.includes('On our food list'));
  assert.ok(FOOD.some(f=>f.en==='Takoyaki — octopus balls'),'the hunt is written in the food list’s own words');

  // Asked with no dishes at all it is the street question again: nearest first, nothing about a list.
  const plain=await nearbyPlaces({place:'Dotonbori',city:'Osaka',kinds:['food'],wishlist:[]},state);
  assert.ok(!seen.messages[0].content.includes('Still on their food list'));
  assert.deepEqual(plain.options.map(o=>o.walkMinutes),[2,4,6,9]);
  for(const o of plain.options)assert.equal(o.dish,'');
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
 // The food page asks after what is still untried and shown, and leans on the same panel rather
 // than a second one of its own.
 const foodSource=await readFile(new URL('../src/FoodList.jsx',import.meta.url),'utf8');
 assert.match(foodSource,/type:'nearby',mode:'food'/);
 assert.match(foodSource,/list\.filter\(i=>!Object\.keys\(triedFood\(state,i\.id\)\)\.length\)/,'only what we have not eaten is hunted');
 assert.match(foodSource,/config\?\.nearby&&/,'no key, no button');
 const nearbySource=await readFile(new URL('../src/Nearby.jsx',import.meta.url),'utf8');
 assert.match(nearbySource,/FOOD_NEARBY_KINDS\.includes\(id\)/,'the food question offers the food kinds');
});
test('a recommendation is ranked by its Google rating against the walk to it',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures,placeScore,rankNearby,ratingText,validRating,isRatedKind,NEARBY_KINDS,FOOD_NEARBY_KINDS,MEAL_KINDS,RATED_KINDS,
  MINUTES_PER_STAR,MIN_RATING_VOTES,UNRATED_STARS}=await import('../src/trip-features.js');
 // The ask is the specific one, because somebody always minds: matcha, ramen, sushi, a bakery,
 // something the boys can hold. The broad two are still there for when nobody does.
 for(const id of ['matcha','ramen','sushi','bakery','sweets','izakaya','quick','coffee'])
  assert.ok(FOOD_NEARBY_KINDS.includes(id)&&NEARBY_KINDS.some(([key])=>key===id),`${id} is something you can ask for by name`);
 // And a rating is only asked for where there is a choice to make. Nobody picks a toilet on four
 // and a half stars, and the next Lawson is the same shop.
 assert.deepEqual(RATED_KINDS.filter(id=>!FOOD_NEARBY_KINDS.includes(id)),[],'only food and drink is rated');
 assert.ok(!isRatedKind('konbini')&&!isRatedKind('toilet')&&!isRatedKind('cash')&&!isRatedKind('lockers'));
 assert.ok(isRatedKind('matcha')&&isRatedKind('ramen')&&isRatedKind('food'));
 for(const id of MEAL_KINDS)assert.ok(FOOD_NEARBY_KINDS.includes(id),`${id} is a meal, so it is something to eat`);
 // The exchange rate the family actually uses: a minute on foot buys a tenth of a star, so the
 // same place one minute further away is worth exactly 0.1 less, and ten minutes is a whole star.
 assert.equal(MINUTES_PER_STAR,10);
 assert.equal(placeScore({rating:4.1,walkMinutes:1}),placeScore({rating:4.0,walkMinutes:0}));
 assert.equal(placeScore({rating:4.6,walkMinutes:0}),4.6);
 assert.equal(placeScore({rating:4.6,walkMinutes:10}),3.6,'ten minutes is a whole star');
 assert.ok(placeScore({rating:4.1,walkMinutes:2})>placeScore({rating:4.6,walkMinutes:9}),'four and a half stars nine minutes off loses to four round the corner');
 assert.ok(placeScore({rating:4.6,walkMinutes:2})>placeScore({rating:4.1,walkMinutes:2}),'same walk, better place, and it is that simple');
 // A rating is Google's number or it is nothing: out of range, missing or unreadable is not bent
 // into range, and an unrated place is ranked as the ordinary place it probably is.
 assert.equal(validRating(4.25),4.3);assert.equal(validRating(9.7),null);
 assert.equal(validRating(0),null);assert.equal(validRating(Number('four')),null);
 assert.equal(placeScore({rating:null,walkMinutes:0}),UNRATED_STARS);
 assert.equal(ratingText(4.2,1203),'4.2 · 1,203 ratings');
 assert.equal(ratingText(null,1203),'','no rating, nothing said about one');
 // A dish we are hunting still comes above all of it, and a tie goes to the nearer one.
 assert.ok(rankNearby({dish:'Takoyaki',score:2.6,walkMinutes:9},{dish:'',score:3.9,walkMinutes:2})<0);
 assert.ok(rankNearby({dish:'',score:3.7,walkMinutes:9},{dish:'',score:3.7,walkMinutes:1})>0);

 let seen=null;
 const answer={anchor:'Kyoto Station, the north side',note:'Ratings move, and a queue is its own review.',options:[
  {title:'Menya Inoichi',japanese:'麺屋 猪一',kind:'food',what:'Clear dashi ramen, sit-down.',
   area:'Shimogyo-ku',walkMinutes:9,rating:4.6,ratingCount:1200,priceBand:'mid',openNote:'Lunch into the evening, guessing',kidFriendly:true,
   why:'The best bowl within reach of the station.',dish:''},
  {title:'Ichiran',japanese:'一蘭',kind:'food',what:'Tonkotsu ramen in a booth of your own.',
   area:'By the north exit',walkMinutes:2,rating:4.1,ratingCount:6000,priceBand:'cheap',openNote:'Late, usually',kidFriendly:true,
   why:'Two minutes, and Nate can eat it plain.',dish:''},
  {title:'Ramen Sen no Kaze',japanese:'',kind:'food',what:'A counter somebody rated last week.',
   area:'Under the arches',walkMinutes:1,rating:4.9,ratingCount:3,priceBand:'cheap',openNote:'',kidFriendly:true,
   why:'Right there.',dish:''},
  {title:'Sky Diner',japanese:'',kind:'food',what:'Rated out of ten by somebody, apparently.',
   area:'Isetan, eleventh floor',walkMinutes:3,rating:9.7,ratingCount:400,priceBand:'pricey',openNote:'',kidFriendly:false,
   why:'The view.',dish:''},
  {title:'FamilyMart',japanese:'ファミリーマート',kind:'konbini',what:'Convenience store with hot food and a toilet.',
   area:'Hachijo side',walkMinutes:12,rating:null,ratingCount:null,priceBand:'cheap',openNote:'Usually 24 hours, but check',kidFriendly:true,
   why:'If nobody can face a queue.',dish:''}]};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen=JSON.parse(body);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m3',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'tool_use',
    usage:{input_tokens:4000,output_tokens:600,server_tool_use:{web_search_requests:3}},
    content:[{type:'tool_use',id:'c1',name:'record_nearby',input:reply}]}));
  });
 });
 let reply=answer;
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {nearbyPlaces}=await import('../server/nearby.mjs');
  const state=ensureFeatures(structuredClone(seed));
  const result=await nearbyPlaces({place:'Kyoto Station',city:'Kyoto',kinds:['food']},state);

  // The rating is asked for by name, with the count behind it, and the rule is said out loud so
  // the model chooses what to name by the same arithmetic the app orders it by.
  const asked=seen.tools.find(t=>t.name==='record_nearby').input_schema.properties.options.items;
  assert.ok(asked.required.includes('rating')&&asked.required.includes('ratingCount'));
  assert.match(asked.properties.rating.description,/Google Maps star rating/);
  assert.match(seen.system,/a minute on foot is worth a tenth of a star/);
  assert.match(seen.system,/A rating you have not actually seen is null/);

  // Best first, where best is the rating less a tenth of a star a minute — so the 4.6 nine minutes
  // away sits below the 4.1 two minutes away, and the convenience store twelve minutes off is last.
  assert.deepEqual(result.options.map(o=>o.draft.title),
   ['Ichiran','Ramen Sen no Kaze','Menya Inoichi','Sky Diner','FamilyMart']);
  const [ichiran,senno,inoichi,sky,familymart]=result.options;
  assert.equal(ichiran.rating,4.1);assert.equal(ichiran.ratingCount,6000);
  assert.equal(ichiran.score,3.9);assert.equal(inoichi.score,3.7);
  assert.equal(result.minutesPerStar,MINUTES_PER_STAR);
  // Five stars off three people is three people, not a rating, and a score out of ten is not one
  // either: both are carried as unrated rather than believed or bent into range.
  assert.equal(senno.rating,null,`fewer than ${MIN_RATING_VOTES} ratings is not a rating`);
  assert.equal(senno.ratingCount,null);
  assert.equal(sky.rating,null);assert.equal(sky.score,placeScore({rating:null,walkMinutes:3}));
  assert.equal(familymart.rating,null,'an unrated konbini is still worth naming, just ranked as an ordinary one');
  assert.equal(familymart.score,2.6);
  // The rating rides along into whatever it becomes, because three days later the card is gone.
  assert.match(ichiran.draft.notes,/Google 4\.1 · 6,000 ratings/);
  assert.ok(!familymart.draft.notes.includes('Google'),'nothing is written about a rating there is none of');

  // Asked for matcha and a toilet in the same breath: the tea house is ranked on its rating, and
  // the toilet and the convenience store are ranked on the walk however many stars come back with
  // them — a five-star toilet is somebody's joke, not a reason to walk past a nearer one.
  reply={anchor:'Shijo-dori',note:'Tea houses keep short hours.',options:[
   {title:'Ippodo Tea Kaboku',japanese:'一保堂茶舗 嘉木',kind:'matcha',what:'Tea house behind the shop, matcha whisked at the table.',
    area:'Teramachi-dori',walkMinutes:7,rating:4.5,ratingCount:900,priceBand:'mid',openNote:'Daytime, guessing',kidFriendly:true,
    why:'The matcha we came for, and Nate gets a sweet with it.',dish:''},
   {title:'Public toilets, Shijo subway',japanese:'四条駅トイレ',kind:'toilet',what:'Station toilets, down the stairs.',
    area:'Shijo station, exit 3',walkMinutes:2,rating:4.9,ratingCount:60,priceBand:'free',openNote:'Station hours',kidFriendly:true,
    why:'Two minutes and down the stairs.',dish:''},
   {title:'Lawson',japanese:'ローソン',kind:'konbini',what:'Convenience store with a toilet.',
    area:'On the corner',walkMinutes:1,rating:4.8,ratingCount:200,priceBand:'cheap',openNote:'Usually 24 hours, but check',kidFriendly:true,
    why:'Closer still if the stairs are too far.',dish:''}]};
  const mixed=await nearbyPlaces({place:'Shijo-dori',city:'Kyoto',kinds:['matcha','toilet']},state);
  assert.match(seen.messages[0].content,/Matcha & tea, Toilets/,'the specific ask goes over as asked');
  assert.deepEqual(mixed.options.map(o=>o.draft.title),['Ippodo Tea Kaboku','Lawson','Public toilets, Shijo subway']);
  const [ippodo,lawson,loo]=mixed.options;
  assert.equal(ippodo.rating,4.5);assert.equal(ippodo.score,3.8);
  assert.equal(loo.rating,null,'a toilet is found, not chosen, so its stars are dropped');
  assert.equal(lawson.rating,null,'the next Lawson is the same shop');
  assert.equal(loo.score,placeScore({rating:null,walkMinutes:2}));
  assert.ok(lawson.score>loo.score,'between two unrated ones it is simply the nearer');
  assert.ok(!loo.draft.notes.includes('Google'));
  assert.equal(ippodo.draft.duration,20,'tea is not a sit-down dinner');
  assert.match(seen.system,/Matcha means a tea house/);
  assert.match(seen.system,/The practical things are not rated/);
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
 // The card says what it is rated and how many people said so, and the panel says how the order
 // was arrived at — a ranking nobody can see the workings of is just a list in a funny order.
 const nearbySource=await readFile(new URL('../src/Nearby.jsx',import.meta.url),'utf8');
 assert.match(nearbySource,/nearby-rating/);
 assert.match(nearbySource,/ratingText\(item\.rating,item\.ratingCount\)/);
 assert.match(nearbySource,/No Google rating we could find/);
 assert.match(nearbySource,/a tenth of a star for every minute/);
 assert.match(nearbySource,/isRatedKind\(item\.kind\)&&/,'no star on a toilet, not even an empty one');
 assert.match(nearbySource,/Something to eat or drink/);
 assert.match(nearbySource,/The practical things/);
});
test('the recipe book is complete, sensible and reachable from the starting six',async()=>{
 const {ELEMENTS,RECIPES,SIGHTS,elementById,startingElements,combine,discoverable}=await import('../src/kana-data.js');
 const ids=ELEMENTS.map(e=>e.id);
 assert.equal(new Set(ids).size,ids.length,'no element defined twice');
 for(const e of ELEMENTS)assert.ok(e.icon&&e.en&&e.ja,`${e.id} is missing a picture or a name`);
 // A recipe that makes one of its own ingredients is a dud, and every id has to exist.
 for(const [a,b,c] of RECIPES){
  for(const id of [a,b,c])assert.ok(elementById(id),`${id} is in a recipe but not an element`);
  assert.ok(c!==a&&c!==b,`${a}+${b} makes something it is already made of`);
 }
 assert.equal(new Set(RECIPES.map(r=>r.slice(0,2).sort().join('+'))).size,RECIPES.length,'the same pair cannot make two things');
 // Order does not matter, and a pair with no recipe says so rather than inventing one.
 assert.equal(combine('rice','water'),'cookedrice');
 assert.equal(combine('water','rice'),'cookedrice');
 assert.equal(combine('fish','fish'),null);
 assert.equal(combine('nonsense','water'),null);
 // Everything can actually be reached by starting with what you are given.
 const have=new Set(startingElements());
 assert.equal(have.size,8);
 for(let pass=0;pass<ELEMENTS.length;pass++)
  for(const [a,b,c] of RECIPES)if(have.has(a)&&have.has(b))have.add(c);
 assert.deepEqual(ids.filter(id=>!have.has(id)),[],'every element must be makeable');
 assert.equal(discoverable().length,ids.length-startingElements().length);
 // And ramen is where a child would expect it to be.
 assert.equal(combine(combine('wheat','water'),combine(combine('bean','fire'),'water')),'ramen');
 // The picture pairs are real things with both names.
 assert.ok(SIGHTS.length>=16);
 assert.equal(new Set(SIGHTS.map(s=>s.id)).size,SIGHTS.length);
 for(const s of SIGHTS)assert.ok(s.icon&&s.en&&/[぀-ヿ]/.test(s.ja),`${s.id} needs a picture and a Japanese name`);
});

test('the morning reminder is about the jumper, not the meteorology',async()=>{
 const {morningNeeds,isMorning}=await import('../src/weather-data.js');
 // Rain, cold and heat each earn a line; a pleasant day earns silence.
 assert.deepEqual(morningNeeds({code:61,max:19,min:15,rain:80}).needs.map(n=>n.id),['umbrella']);
 assert.deepEqual(morningNeeds({code:0,max:14,min:7,rain:0}).needs.map(n=>n.id),['jumper']);
 assert.match(morningNeeds({code:0,max:14,min:7,rain:0}).summary,/Nate/,'the five-year-old is the one who feels it');
 assert.deepEqual(morningNeeds({code:63,max:15,min:9,rain:90}).needs.map(n=>n.id),['umbrella','jumper'],'both, when it is both');
 assert.deepEqual(morningNeeds({code:0,max:33,min:26,rain:0}).needs.map(n=>n.id),['water']);
 assert.equal(morningNeeds({code:0,max:24,min:18,rain:10}),null,'a fine day says nothing');
 assert.equal(morningNeeds({code:2,max:22,min:16,rain:0}),null);
 assert.equal(morningNeeds(null),null);
 // A high chance of rain counts even when the code is not itself wet.
 assert.ok(morningNeeds({code:2,max:22,min:18,rain:60}).needs.some(n=>n.id==='umbrella'));
 // And it is a morning reminder, so it is done by the middle of the day.
 assert.equal(isMorning('06:30'),true);
 assert.equal(isMorning('10:59'),true);
 assert.equal(isMorning('11:00'),false);
 assert.equal(isMorning('18:00'),false);
 assert.equal(isMorning(''),false);
});

test('what is marked in the phonics is length, and every mark lands on a real chunk',async()=>{
 const {phonicChunks,holdsOf}=await import('../src/speech.js');
 const {ALL_PHRASES}=await import('../src/phrasebook-data.js');
 const {FOOD,ORDERING,SAY_TIP}=await import('../src/food-data.js');
 const everything=[...ALL_PHRASES(),...FOOD,...ORDERING];
 // A mark that does not match a chunk would simply never show, and nobody would notice.
 let marked=0;
 for(const item of everything){
  const holds=holdsOf(item);if(!holds.length)continue;
  marked++;
  const chunks=phonicChunks(item.say,item.hold);
  for(const h of holds)assert.ok(chunks.some(c=>c.hold&&c.text.toLowerCase()===h.toLowerCase()),
   `${item.id||item.en}: "${h}" is not a chunk of "${item.say}"`);
  assert.equal(chunks.filter(c=>c.hold).length>=holds.length,true);
 }
 assert.ok(marked>=35,`only ${marked} entries carry a length mark`);
 // Only the ones that need it: a mark is there because the Japanese has a long vowel or a
 // double consonant, and everything without one is left alone.
 for(const item of everything){
  const needs=/[āīūēō]/.test(item.romaji||'')||/([kstpg])\1|tch/.test(item.romaji||'');
  if(!needs)assert.deepEqual(holdsOf(item),[],`${item.id||item.en} is marked but has nothing to hold`);
 }
 // The rendering keeps the word intact — the separators are still there.
 const chunks=phonicChunks('oh-ha-yoh go-zye-mass','yoh');
 assert.equal(chunks.map(c=>c.text).join(''),'oh-ha-yoh go-zye-mass');
 assert.deepEqual(chunks.filter(c=>c.hold).map(c=>c.text),['yoh']);
 // The same chunk twice is marked twice — kyūkyūsha is long in both halves.
 assert.equal(phonicChunks('kyoo-kyoo-sha','kyoo').filter(c=>c.hold).length,2);
 assert.deepEqual(phonicChunks('kon-nee-chee-wa').filter(c=>c.hold),[]);
 assert.deepEqual(phonicChunks('',null),[]);
 // And the screen explains what the mark means rather than leaving it to be guessed.
 assert.match(SAY_TIP,/two beats/);
 assert.match(SAY_TIP,/does not stress/,'the warning against an English thump stays');
});

test('a document is read as a document, a photo as a photo, and neither is trusted blindly',async()=>{
 const {createServer}=await import('node:http');
 let seen=null;
 const answer={readable:true,language:'Japanese',kind:'Hotel letter',title:'Luggage forwarding',
  summary:['They will send the bags to Kyoto on the 24th.','¥2,400, paid at the desk.'],
  translation:'荷物転送のご案内\n---\nLuggage forwarding\nCollection: 24 September, 08:00',
  actions:[{what:'Leave the bags at reception',when:'24 September, by 08:00'}]};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{seen=JSON.parse(body);res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'end_turn',
    usage:{input_tokens:2200,output_tokens:800},content:[{type:'text',text:JSON.stringify(answer)}]}));});
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const key=process.env.ANTHROPIC_API_KEY,url=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {readDocument,readerReady}=await import('../server/document-reader.mjs');
  assert.equal(readerReady(),true);
  const data=Buffer.from('a page of japanese').toString('base64');
  // A PDF is sent as a document block; a photo as an image block. Getting this wrong is a 400.
  const out=await readDocument({file:data,mediaType:'application/pdf',note:'  What do we owe?  '});
  assert.equal(seen.messages[0].content[0].type,'document');
  assert.equal(seen.messages[0].content[0].source.media_type,'application/pdf');
  assert.match(seen.messages[0].content[1].text,/They also asked: What do we owe\?$/,'the question is trimmed and passed on');
  await readDocument({file:data,mediaType:'image/jpeg'});
  assert.equal(seen.messages[0].content[0].type,'image');
  assert.equal(seen.messages[0].content[1].text,'Read this and tell them what it says.');
  // The answer comes back whole, with what it costs to have asked.
  assert.equal(out.title,'Luggage forwarding');
  assert.equal(out.actions[0].when,'24 September, by 08:00');
  assert.equal(out.usage.input,2200);
  assert.equal(seen.output_config.format.type,'json_schema');
  assert.deepEqual(seen.output_config.format.schema.required,['readable','kind','title','summary','translation','actions','language']);
  assert.match(seen.system,/Keep numbers, dates, times/);
  assert.match(seen.system,/Never guess at a number you cannot see/);
  assert.match(seen.system,/not advising/,'it reads the document, it does not advise on it');
  // What it refuses to send at all.
  await assert.rejects(()=>readDocument({file:'',mediaType:'image/jpeg'}),/Choose a photo or a PDF/);
  await assert.rejects(()=>readDocument({file:'not base64!!',mediaType:'image/jpeg'}),/could not be read/);
  await assert.rejects(()=>readDocument({file:data,mediaType:'image/gif'}),/JPEG, PNG or WebP photo, or a PDF/);
  await assert.rejects(()=>readDocument({file:'A'.repeat(4_500_001),mediaType:'image/jpeg'}),/too large/);
  await assert.rejects(()=>readDocument({file:data,mediaType:'image/jpeg',note:'x'.repeat(501)}),/note short/);
 }finally{
  if(key===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=key;
  if(url===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=url;
  await new Promise(r=>upstream.close(r));
 }
});

test('a photograph reaches the reader as base64, not as the object around it',async()=>{
 const source=await readFile(new URL('../src/DocumentReader.jsx',import.meta.url),'utf8');
 const menu=await readFile(new URL('../src/MenuReader.jsx',import.meta.url),'utf8');
 // shrinkPhoto returns {image,mediaType,preview}. Sending the whole object was the
 // difference between a photograph working and being refused as "choose a photo or a PDF".
 assert.match(menu,/return \{image:url\.slice/,'shrinkPhoto still hands back an object');
 assert.match(source,/\(await shrinkPhoto\(file\)\)\.image/,'the base64 is taken out of it');
 assert.doesNotMatch(source,/await shrinkPhoto\(file\),/);
 // An iPhone stores its photos as HEIC, so a picker that only offers JPEG is no use on the
 // phone this app is for.
 const accepts=[...source.matchAll(/accept="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(accepts.length,2);
 assert.ok(accepts.every(a=>a.includes('image/*')),`a picker still refuses an iPhone photo: ${accepts}`);
 assert.ok(accepts.some(a=>a.includes('application/pdf')),'and one of them takes a PDF');
 assert.ok(accepts.some((a,i)=>!source.split('accept="')[i+1].startsWith('image/*" capture')===false),'one opens the camera');
 // The server accepts exactly the types the phone can produce.
 const reader=await readFile(new URL('../server/document-reader.mjs',import.meta.url),'utf8');
 assert.match(reader,/IMAGE_TYPES=\['image\/jpeg','image\/png','image\/webp'\]/,'anything else is converted to JPEG on the phone first');
});

test('the stable promotes on a match, and a bout can be lost by anyone',async()=>{
 const {SUMO_RANKS,rankAt,TOP_RANK,emptyStable,recruit,promote,bestRank,stableFull,oddsOf,bout,challengerFor,STABLE_SIZE}=await import('../src/kana-data.js');
 // The ladder is the real one, in order, with both names.
 SUMO_RANKS.forEach((r,i)=>{assert.equal(r.level,i+1);assert.ok(r.icon&&r.en&&r.ja&&r.romaji);});
 assert.equal(SUMO_RANKS.at(-1).romaji,'yokozuna');
 assert.equal(rankAt(99),null);
 // A recruit lands on a free square, never on an occupied one, and never on a full stable.
 let stable=emptyStable();
 assert.equal(stable.length,STABLE_SIZE);
 stable=recruit(stable,3);
 assert.equal(stable.filter(Boolean).length,1);
 assert.ok([1,2].includes(stable.find(Boolean)),'and starts at or near the bottom');
 assert.equal(recruit(Array(STABLE_SIZE).fill(4),1),null,'a full stable takes nobody');
 // Two of the same become one of the next, and the other square is emptied.
 const pair=[2,2,0,0];
 const up=promote(pair,0,1);
 assert.deepEqual(up.stable,[0,3,0,0]);
 assert.equal(up.level,3);
 // Everything that is not a match is refused rather than fudged.
 assert.equal(promote([1,2,0,0],0,1),null,'different ranks');
 assert.equal(promote([1,0,0,0],0,1),null,'an empty square');
 assert.equal(promote([1,1,0,0],0,0),null,'the same square twice');
 assert.equal(promote([TOP_RANK,TOP_RANK,0,0],0,1),null,'there is nothing above a yokozuna');
 assert.equal(bestRank([0,3,7,2]),7);
 assert.equal(bestRank(emptyStable()),0);
 assert.equal(stableFull([1,1]),true);
 assert.equal(stableFull([1,0]),false);
 // Rank decides a bout, but never decides it entirely — an upset stays possible both ways.
 assert.equal(oddsOf(5,5),0.5);
 assert.ok(oddsOf(9,2)<=0.95&&oddsOf(9,2)>=0.9,'a yokozuna is not certain');
 assert.ok(oddsOf(2,9)>=0.05,'and a beginner is not hopeless');
 assert.equal(bout(5,4,0).won,true);
 assert.equal(bout(5,4,0.999).won,false);
 assert.equal(bout(5,4,0).reward,40,'beating a higher rank is worth more');
 assert.equal(bout(5,1,0).reward,10);
 assert.equal(bout(5,4,0.999).reward,0);
 assert.equal(bout(0,4,0.1),null);
 // The challenger tracks your best rather than running away from it.
 for(const best of [1,3,6,10])
  for(const cleared of [0,1,2,3]){
   const c=challengerFor(best,cleared);
   assert.ok(c>=1&&c<=TOP_RANK,`challenger ${c} is off the ladder`);
   assert.ok(Math.abs(c-best)<=1,'and is somewhere near you');
  }
});

test('the session is claimed on the first touch, and never flipped after that',async()=>{
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const speech=await readFile(new URL('../src/AdventurePages.jsx',import.meta.url),'utf8');
 // iOS ignores a session claimed before anybody has touched the page, so the claim is armed
 // at startup and spent on the first gesture rather than at load.
 assert.match(main,/useEffect\(\(\)=>\{armPlayback\(\);\},\[\]\)/,'armed once when the app starts');
 assert.doesNotMatch(main,/claimPlayback\(\)/,'main does not claim it directly any more');
 // The invariant that has not changed: the type is never set from inside the speaking path.
 // Flipping it part-way through is what makes iOS play nothing at all.
 assert.doesNotMatch(speech,/claimPlayback\(/,'never claimed from inside the speaking path');
 // What runs inside the tap now is the hold, and every hold is matched by a release.
 assert.match(speech,/holdPlayback\(\)/,'the session is held while the phone is talking');
 assert.match(speech,/releasePlayback\(\)/,'and let go afterwards');
 assert.doesNotMatch(speech,/nudgeOffAmbient/,'the one-shot nudge held nothing and is gone');
});

test('the advice matches what the phone actually did, not what we assume',async()=>{
 const {silenceAdvice,SILENCE_HELP,isStandalone,wakeSpeech}=await import('../src/speech.js');
 // The case that has been happening: nothing started, inside a Home Screen app.
 assert.equal(silenceAdvice({started:false,standalone:true}),'standalone');
 assert.match(SILENCE_HELP.standalone,/Safari/,'and it names the way out');
 // Nothing started, in the browser: the synthesiser is wedged from being in the background.
 assert.equal(silenceAdvice({started:false,standalone:false}),'never-started');
 assert.match(SILENCE_HELP['never-started'],/background/);
 // The answer only this test can give: it plays a recording and will not speak for itself.
 assert.equal(silenceAdvice({started:false,standalone:true,tone:'played'}),'record-instead');
 assert.equal(silenceAdvice({started:false,standalone:false,tone:'played'}),'record-instead');
 assert.match(SILENCE_HELP['record-instead'],/iPad/,'and names the device that will do it');
 assert.match(SILENCE_HELP['record-instead'],/no setting on it will change that/,'without blaming the switch again');
 // A recording that would not play says nothing new, so the older advice still stands.
 assert.equal(silenceAdvice({started:false,standalone:true,tone:'the phone would not allow it'}),'standalone');
 // It did start, so the sound is being blocked on its way out.
 assert.equal(silenceAdvice({started:true,standalone:true}),'muted');
 assert.equal(silenceAdvice({started:true,standalone:false}),'muted');
 assert.match(SILENCE_HELP.muted,/[Hh]eadphones/);
 assert.equal(silenceAdvice({started:null,standalone:false}),'muted','untested reads as the ordinary case');
 // Detection and the wake-up both survive a phone that has none of this.
 assert.equal(isStandalone(null),false);
 assert.equal(isStandalone({matchMedia:()=>{throw new Error('no');}}),false);
 assert.equal(isStandalone({navigator:{standalone:true}}),true);
 assert.equal(isStandalone({matchMedia:()=>({matches:true})}),true);
 assert.equal(wakeSpeech(null),false);
 assert.equal(wakeSpeech({}),false);
 let cancelled=0,resumed=0;
 assert.equal(wakeSpeech({speechSynthesis:{cancel:()=>cancelled++,resume:()=>resumed++}}),true);
 assert.equal(cancelled,1);assert.equal(resumed,1);
 assert.equal(wakeSpeech({speechSynthesis:{cancel:()=>{throw new Error('wedged');}}}),false);
});

test('coming back to the app clears a synthesiser that stopped while it was away',async()=>{
 const source=await readFile(new URL('../src/AdventurePages.jsx',import.meta.url),'utf8');
 assert.match(source,/visibilitychange/,'the app has to notice it came back');
 assert.match(source,/document\.visibilityState==='visible'\)wakeSpeech\(\)/);
 assert.match(source,/removeEventListener\('visibilitychange'/,'and let go of it afterwards');
 // The message shown is chosen from what happened, rather than always blaming the switch.
 assert.match(source,/SILENCE_HELP\[silenceAdvice\(\{started:false,standalone:isStandalone\(\)\}\)\]/);
});

test('the guide turns like a book, and stops at both covers',async()=>{
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const book=await readFile(new URL('../src/GuideBook.jsx',import.meta.url),'utf8');
 // One place decides what page we are on, so a swipe, an arrow key and a button cannot drift.
 assert.match(source,/function turnPage\(delta\)\{/);
 assert.match(source,/Math\.min\(72,Math\.max\(1,guidePage\+delta\)\)/,'clamped at both ends rather than wrapping');
 assert.match(source,/if\(n===guidePage\)return;/,'and a turn that changes nothing does nothing');
 // Every way of turning goes through the book, which hands the page to turnPage once it lands.
 assert.equal((source.match(/flipPage\(-1\)/g)||[]).length,2,'the back button and the left arrow key');
 assert.equal((source.match(/flipPage\(1\)/g)||[]).length,2,'the forward button and the right arrow key');
 assert.match(source,/<GuideBook page=\{guidePage\} turn=\{turnPage\} flipRef=\{reading\?null:guideFlip\}/,'and the swipe');
 assert.match(source,/else turnPage\(delta\)/,'without the book, a button still turns the page');
 assert.match(book,/if\(finish\)go\(dir\)/,'the page only changes once the turn has landed');
 assert.match(book,/const go=d=>\{const to=next\(d\);if\(to!==null\)turn\(to-page\);\}/,'and it lands through turnPage');
 assert.doesNotMatch(source,/setGuidePage\(guidePage[-+]1\)/,'nothing sets the page behind its back');
 // A swipe is a sideways movement, not a scroll, and typing in the page box is not a turn.
 assert.match(book,/swipeDelta\(t,\{x:e\.clientX,y:e\.clientY\}\)===leaf\.dir/);
 assert.match(book,/t\.axis=Math\.abs\(dx\)>Math\.abs\(dy\)\?'x':'y'/);
 assert.match(source,/if\(typesText\(e\.target\)\)return/);
 // The keys are only listened for while the guide is open, and let go of afterwards.
 assert.match(source,/if\(tab!=='guide'\)return;/);
 assert.match(source,/removeEventListener\('keydown',onKey\)/);
 // Nobody who has asked for less motion gets a page swinging about.
 assert.match(book,/prefers-reduced-motion: reduce/);
 // The page can still be scrolled up and down while it is swiped sideways.
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.guide-view\{touch-action:pan-y\}/);
 assert.match(css,/\.guide-leaf\.forward\{transform-origin:left center\}/,'a page turns on its spine');
});

test('the guide opens full screen like a magazine when the page is tapped',async()=>{
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const reader=await readFile(new URL('../src/GuideReader.jsx',import.meta.url),'utf8');
 const book=await readFile(new URL('../src/GuideBook.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // A tap on the page, or the button beside Save, opens the reader; a finger that moved is a turn.
 assert.match(main,/onTap=\{\(\)=>setReading\(true\)\}/);
 assert.match(main,/aria-label="Read full screen" onClick=\{\(\)=>setReading\(true\)\}/);
 assert.match(book,/if\(t&&!t\.axis\)return tap\(e\)/);
 // It turns through the same turnPage, and the arrow keys follow whichever book is showing.
 assert.match(main,/<GuideReader page=\{guidePage\}[\s\S]{0,200}? turn=\{turnPage\}[\s\S]{0,120}? flipRef=\{guideFlip\}/);
 assert.match(main,/flipRef=\{reading\?null:guideFlip\}/,'the page underneath lets go of the keys while the reader is open');
 assert.match(book,/if\(flipRef\.current===mine\)flipRef\.current=null/,'and a book only lets go of the keys if it still holds them');
 // Truly full screen where the browser allows, and leaving it closes the reader.
 assert.match(reader,/root\.requestFullscreen\(\)/);
 assert.match(reader,/addEventListener\('fullscreenchange',left\)/);
 assert.match(reader,/e\.key==='Escape'\)close\(\)/);
 assert.match(reader,/exitFullscreen/);
 // Double tap zooms in to read the small print; a single tap hides the bars.
 assert.match(reader,/zoomable spread=\{spread\} onTap=\{\(\)=>setBare\(b=>!b\)\}/);
 assert.match(css,/\.guide-reader \.guide-book\{[^}]*touch-action:none/);
 // It covers the bottom bar, and the page is sized for its own shape — portrait, 1247 by 1800.
 assert.match(css,/\.guide-reader\{position:fixed;inset:0;z-index:50/);
 assert.match(css,/\(100dvh - 150px\)\*\.6928/);
});

test('full screen, the guide opens as a two-page spread on its side and one page upright',async()=>{
 const {spreadOf,stepPage}=await import('../src/guide-lens.js');
 // Laid out as a magazine: the cover alone on the right, even pages facing odd, the back alone.
 assert.deepEqual(spreadOf(1),[null,1]);
 assert.deepEqual(spreadOf(2),[2,3]);
 assert.deepEqual(spreadOf(3),[2,3],'either page of a pair opens the same spread');
 assert.deepEqual(spreadOf(71),[70,71]);
 assert.deepEqual(spreadOf(72),[72,null]);
 // A spread turns a pair at a time, landing on the first page of the next pair either way.
 assert.equal(stepPage(1,1,true),2);
 assert.equal(stepPage(3,1,true),4);
 assert.equal(stepPage(3,-1,true),1);
 assert.equal(stepPage(71,1,true),72);
 assert.equal(stepPage(72,-1,true),70);
 assert.equal(stepPage(1,-1,true),null,'and stops at the front cover');
 assert.equal(stepPage(72,1,true),null,'and the back one');
 // One page at a time is unchanged.
 assert.equal(stepPage(5,1,false),6);
 assert.equal(stepPage(72,1,false),null);
 // Which way up decides, not the device — so an iPhone held upright keeps its single page —
 // and a swap is kept for that way up alone.
 const reader=await readFile(new URL('../src/GuideReader.jsx',import.meta.url),'utf8');
 assert.match(reader,/matchMedia\('\(orientation: landscape\)'\)/);
 assert.match(reader,/return typeof mine==='boolean'\?mine:landscape;/);
 assert.match(reader,/\[landscape\?'landscape':'portrait'\]:!spread/);
 assert.match(reader,/try\{localStorage\.setItem\(SPREAD_KEY/,'remembering it can fail without breaking the reader');
 assert.match(reader,/zoomable spread=\{spread\}/);
 assert.match(reader,/disabled=\{stepPage\(page,1,spread\)===null\}/);
 // The page underneath the reader, in the app itself, is always one page.
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(main,/<GuideBook [^>]*spread/);
});

test('a zoomed page is held inside the screen',async()=>{
 const {panLimit}=await import('../src/guide-lens.js');
 assert.deepEqual(panLimit(1,400,600),{x:0,y:0},'unzoomed it cannot be dragged at all');
 assert.deepEqual(panLimit(2.5,400,600),{x:300,y:450});
});

test('a page being turned stays under the finger that is turning it',async()=>{
 const {leafProgress}=await import('../src/swipe.js');
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} is not ${b}`);
 // Picked up at the edge of a 300px page: halfway to the spine is a quarter turn over...
 near(leafProgress(0,300,300,1,true),0);
 near(leafProgress(-150,300,300,1,true),1/3);
 near(leafProgress(-300,300,300,1,true),.5);
 near(leafProgress(-600,300,300,1,true),1);
 near(leafProgress(-900,300,300,1,true),1,'and never further than all the way');
 // ...and back the same, the other way.
 near(leafProgress(300,300,300,-1,true),.5);
 near(leafProgress(40,300,300,1,true),0,'a finger going the other way does not turn it');
 // Grabbed by the spine it does not whip over at a touch.
 assert.ok(leafProgress(-20,5,300,1,true)<.25);
 // A cover that cannot turn only gives a little.
 assert.ok(leafProgress(-300,300,300,1,false)<=.08);
});

test('a to-do belongs to a day, shows on it, and anyone can tick it off',async()=>{
 const {ensureFeatures,todosFor,todoProgress,unallocatedTodos,TODO_KINDS}=await import('../src/trip-features.js');
 const day=seed.days[4].date;
 let state=applyOperation(seed,{type:'todoAdd',title:'Post the postcards',kind:'do',day,person:'Lauren',notes:'The big post office by the station.'},parent);
 // A boy writes one down himself, with no edit rights anywhere else in the app.
 state=applyOperation(state,{type:'todoAdd',title:'Buy a Beyblade',kind:'buy',day,person:'Boston'},child);
 state=applyOperation(state,{type:'todoAdd',title:'Charge the power banks'},parent);
 assert.equal(state.todos.length,3);
 // The day's own list is what that day's screen shows.
 assert.deepEqual(todosFor(state,day).map(t=>t.title),['Post the postcards','Buy a Beyblade']);
 assert.deepEqual(todoProgress(state,day),{done:0,total:2,open:2});
 // One with no day sits apart until somebody gives it one.
 assert.deepEqual(unallocatedTodos(state).map(t=>t.title),['Charge the power banks']);
 assert.equal(todoProgress(state,seed.days[0].date).total,0,'a day with none shows none');
 const beyblade=state.todos.find(t=>t.title==='Buy a Beyblade');
 assert.equal(beyblade.kind,'buy');assert.equal(beyblade.createdBy,'Nate');assert.equal(beyblade.person,'Boston');
 assert.equal(beyblade.doneAt,null);
 // Anyone ticks anything off — it is a family list, not a set of private chores.
 state=applyOperation(state,{type:'todoStatus',id:beyblade.id,done:true},child);
 const ticked=state.todos.find(t=>t.id===beyblade.id);
 assert.ok(ticked.doneAt);assert.equal(ticked.doneBy,'Nate');
 assert.deepEqual(todoProgress(state,day),{done:1,total:2,open:1});
 // Still-to-do first, so the list reads as a queue rather than a pile.
 assert.deepEqual(todosFor(state,day).map(t=>t.title),['Post the postcards','Buy a Beyblade']);
 assert.equal(state.todos.find(t=>t.id===beyblade.id).doneBy,'Nate');
 // Unticking takes the record off with it.
 const undone=applyOperation(state,{type:'todoStatus',id:beyblade.id,done:false},parent).todos.find(t=>t.id===beyblade.id);
 assert.equal(undone.doneAt,null);assert.equal(undone.doneBy,null);
 // Allocating a day later is what moves it onto that day's screen.
 const moved=applyOperation(state,{type:'todoEdit',id:state.todos.find(t=>t.title==='Charge the power banks').id,
  title:'Charge the power banks',kind:'do',day:seed.days[0].date,person:'Damien'},parent);
 assert.equal(todoProgress(moved,seed.days[0].date).total,1);
 assert.equal(unallocatedTodos(moved).length,0);
 // Wording and the bin are a parent's; ticking and adding are not.
 assert.throws(()=>applyOperation(state,{type:'todoEdit',id:beyblade.id,title:'Something else'},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'todoRemove',id:beyblade.id},child),e=>e.status===403);
 assert.equal(applyOperation(state,{type:'todoRemove',id:beyblade.id},parent).todos.length,2);
 for(const bad of [{type:'todoAdd',title:'   '},{type:'todoAdd',title:'x'.repeat(251)},
  {type:'todoAdd',title:'A',day:'2099-01-01'},{type:'todoAdd',title:'A',person:'Grandma'},
  {type:'todoAdd',title:'A',notes:'n'.repeat(2001)},{type:'todoStatus',id:beyblade.id,done:'yes'},
  {type:'todoStatus',id:'nope',done:true},{type:'todoWhatever',title:'A'}])
  assert.throws(()=>applyOperation(state,bad,parent),`${JSON.stringify(bad).slice(0,48)} should be refused`);
 // A kind we do not know is a job to do, not a crash.
 assert.equal(applyOperation(state,{type:'todoAdd',title:'A',kind:'sing'},parent).todos.at(-1).kind,'do');
 assert.deepEqual(TODO_KINDS.map(([id])=>id),['do','buy'],'things we want to do, or buy');
 // None of it is the plan, so it stays out of the family alert feed.
 assert.ok(!state.alerts.some(a=>/postcards|Beyblade|power banks/.test(a.summary||'')));
 assert.equal(state.history[0].title,'Buy a Beyblade','but the family history still reads properly');
});
test('a job written down or ticked off with no signal waits on the phone',async()=>{
 const {ensureFeatures,pendingProgress,todosFor,todoProgress}=await import('../src/trip-features.js');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const list=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 for(const op of ['todoAdd','todoStatus'])assert.ok(list.includes(op),`${op} should survive with no signal`);
 // Rewording somebody else's job and taking one off the list both need the latest revision.
 for(const op of ['todoEdit','todoRemove'])assert.ok(!list.includes(op),`${op} changes the shared list`);
 const day=seed.days[2].date,at='2026-09-19T02:00:00.000Z';
 let state=applyOperation(ensureFeatures(structuredClone(seed)),{type:'todoAdd',title:'Return the locker key',day},parent);
 const key=state.todos.at(-1).id;
 const queue=[{operation:{type:'todoAdd',operationId:'q1',title:'Buy stamps',kind:'buy',day,person:'Family',by:'Boston',at}},
              {operation:{type:'todoStatus',operationId:'q2',id:key,done:true,by:'Boston',at}}];
 const preview=pendingProgress(state,queue);
 assert.deepEqual(todosFor(preview,day).map(t=>t.title),['Buy stamps','Return the locker key']);
 const fresh=preview.todos.find(t=>t.title==='Buy stamps');
 assert.equal(fresh.kind,'buy');assert.equal(fresh.createdBy,'Boston');assert.ok(fresh.pending);
 assert.equal(preview.todos.find(t=>t.id===key).doneBy,'Boston');
 assert.deepEqual(todoProgress(preview,day),{done:1,total:2,open:1});
 // And the shared trip is untouched until it syncs.
 assert.equal(todoProgress(state,day).total,1);
 assert.equal(state.todos.find(t=>t.id===key).doneAt,null);
 // What the phone drew is what the server builds when the queue lands.
 const landed=applyOperation(state,queue[0].operation,{name:'Boston',role:'child'});
 assert.equal(landed.todos.at(-1).createdAt,at);
 assert.equal(landed.todos.at(-1).createdBy,'Boston');
});
test('the day screen shows its own jobs, and the day tiles say how many are left',async()=>{
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 // The panel is on the day, not only on a page you have to go looking for.
 assert.match(source,/<DayTodos state=\{visibleState\} user=\{user\} day=\{day\}/,'the day screen renders its own to-dos');
 assert.match(source,/todoProgress\(visibleState,d\.date\)\.open>0/,'and a day tile counts what is left on it');
 assert.match(source,/tab==='todo'/,'the whole list has its own screen');
 const {PAGES}=await import('../src/nav-data.js');
 assert.ok(PAGES.todo?.label&&PAGES.todo?.note);
});

test('the snake quickens with every piece of sushi, but stays steerable',async()=>{
 const {snakeTick}=await import('../src/Games.jsx').catch(()=>({snakeTick:null}));
 // Games.jsx cannot be imported here, so the rule is checked where it is written.
 const source=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 assert.match(source,/export const snakeTick=eaten=>Math\.max\(110,SNAKE_TICK-eaten\*12\)/);
 const tick=eaten=>Math.max(110,260-eaten*12);
 assert.equal(tick(0),260,'it starts gentle');
 assert.ok(tick(5)<tick(0)&&tick(10)<tick(5),'and quickens as it goes');
 assert.equal(tick(20),110,'down to a floor');
 assert.equal(tick(80),110,'that holds however long it gets');
 // The loop has to notice the score changing, or the speed never actually changes.
 assert.match(source,/\},\[running,over,food,score\]\)/);
 assert.match(source,/snakeTick\(scoreRef\.current\)/);
});

test('a tile can be dragged onto another, and a tap still means a tap',async()=>{
 const source=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 const lift=await readFile(new URL('../src/lift.js',import.meta.url),'utf8');
 const timeline=await readFile(new URL('../src/DayTimeline.jsx',import.meta.url),'utf8');
 // A drag under ten pixels is a tap, so the old way of playing still works.
 assert.match(source,/if\(!d\.moved&&Math\.hypot\(e\.clientX-d\.x,e\.clientY-d\.y\)>10\)\{d\.moved=true;/);
 assert.match(source,/if\(!d\.moved\)\{letGo\(d,false\);return d\.i;\}/,'a tap comes back as the tile that was tapped');
 // The target is where the finger lifted, not where it started — the tile beneath the one
 // being carried, since that one is under the finger too.
 assert.match(source,/underFinger\(x,y,'\[data-tile\]',lifted\)/);
 assert.match(lift,/document\.elementsFromPoint\(x,y\)/);
 assert.match(lift,/hit!==lifted&&!lifted\?\.contains\(hit\)/);
 // The tile rides along under the finger while it is dragged, rather than waiting for the drop.
 assert.match(source,/follow\(d\.el,e\.clientX-d\.x,e\.clientY-d\.y\)/);
 assert.equal((source.match(/drag\.held===i\?' lifted':''/g)||[]).length,2);
 // Dropped on nothing it slides home; dropped on a tile it stays where the result is.
 assert.match(source,/letGo\(d,!took\)/);
 // The timeline's rows are carried the same way, allowing for the page scrolling under them.
 assert.match(timeline,/follow\(d\.row,0,e\.clientY-d\.y\+window\.scrollY-d\.scroll\)/);
 assert.match(timeline,/underFinger\(e\.clientX,e\.clientY,'\[data-step-id\]',d\.row\)/);
 // Both merge games use it, and both mark the tile being dragged over.
 assert.equal((source.match(/useDragTiles\(/g)||[]).length,3,'the helper and its two users');
 assert.equal((source.match(/drag\.over===i\?' over':''/g)||[]).length,2);
 assert.equal((source.match(/onPointerCancel=\{drag\.cancel\}/g)||[]).length,2,'a cancelled drag lets go');
 // Dragging a board must not scroll the page under it.
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.stable-grid,\.kitchen-grid\{touch-action:none\}/);
});

test('sumo has a speed for everyone, and the pairs boards can be sized',async()=>{
 const source=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 const levels=[...source.matchAll(/\['(\w+)','([^']+)',(\d+),(\d+)\]/g)].map(m=>({id:m[1],label:m[2],rate:+m[3],worth:+m[4]}));
 assert.ok(levels.length>=7,`only ${levels.length} sumo speeds`);
 // Faster opponents, worth more, in order — a harder bout has to pay better or nobody picks it.
 for(let i=1;i<levels.length;i++){
  assert.ok(levels[i].rate<levels[i-1].rate,`${levels[i].id} is not faster than ${levels[i-1].id}`);
  assert.ok(levels[i].worth>levels[i-1].worth,`${levels[i].id} is not worth more than ${levels[i-1].id}`);
 }
 assert.equal(levels[0].label,'Beginner');
 assert.equal(levels.at(-1).id,'yokozuna');
 // Both memory boards can be made smaller for Nate or bigger for Boston, and a best score
 // is kept per size so a four-pair round cannot flatter an eighteen-pair one.
 assert.match(source,/\[4,6,8,12,18\]\.map/,'Japan pairs sizes');
 assert.match(source,/\[4,6,8,10\]\.map/,'kana sizes');
 assert.match(source,/game:`sights-\$\{pairs\}`/);
 assert.match(source,/game:`kana-\$\{set\}-\$\{pairs\}`/);
});

test('the sumo lead-up is a game of its own, and pays into the bout rather than into the score',async()=>{
 const {SUMO_RITUALS,STOMP_WINDOW,stompScore,SALT_BAND,saltScore,MATTA,chargeScore,leadUpEffect,ceremonyScore,KIMARITE,kimariteById,theirWeight}=await import('../src/kana-data.js');
 // Three rituals, each with the Japanese for it, because the point is knowing what you are
 // looking at when the real one does it in Ryogoku.
 assert.deepEqual(SUMO_RITUALS.map(r=>r.id),['shiko','shio','tachiai']);
 for(const r of SUMO_RITUALS)for(const k of ['icon','en','ja','romaji','how','buys'])assert.ok(r[k],`${r.id} has no ${k}`);
 // Stamps are scored out of four however few you hit, so a beat nobody stamped is not free.
 assert.equal(stompScore([0,0,0,0]),1);
 assert.equal(stompScore([0,0]),0.5,'two beats out of four is half a stance');
 assert.equal(stompScore([STOMP_WINDOW,STOMP_WINDOW,STOMP_WINDOW,STOMP_WINDOW]),0,'a stamp a whole beat late is a stamp missed');
 assert.ok(stompScore([-80,80,-80,80])>0.7,'close enough counts');
 assert.equal(stompScore([]),0);
 // The salt lands in a band rather than on a point — a five-year-old cannot stop a sweep
 // on a pixel — and missing it altogether is a nothing rather than a penalty.
 assert.equal(saltScore(50,50),1);
 assert.equal(saltScore(50+SALT_BAND,50),0);
 assert.equal(saltScore(0,90),0);
 // Going before the gyoji calls is a matta, and it is the only score that can be negative.
 assert.equal(chargeScore(-1),MATTA);
 assert.equal(chargeScore(100),1);
 assert.equal(chargeScore(900),0);
 // What the ceremony buys: wind, a longer look at an opening, and ground already won.
 const clean=leadUpEffect({shiko:1,shio:1,charge:1}),none=leadUpEffect({});
 assert.ok(clean.stamina>none.stamina&&clean.rest>none.rest&&clean.opening>none.opening);
 assert.ok(clean.push>0&&none.push===0);
 assert.equal(leadUpEffect({charge:MATTA}).push,-2,'a false start hands him the ground');
 assert.ok(leadUpEffect({charge:MATTA}).matta);
 // A matta is a nothing in the scoring rather than a second punishment.
 assert.equal(ceremonyScore({shiko:1,shio:1,charge:MATTA}),ceremonyScore({shiko:1,shio:1,charge:0}));
 assert.equal(ceremonyScore({shiko:1,shio:1,charge:1}),1);
 // Four real finishing moves, each with the tell that calls for it.
 assert.equal(new Set(KIMARITE.map(k=>k.id)).size,4);
 for(const k of KIMARITE)for(const f of ['icon','en','ja','romaji','tell'])assert.ok(k[f],`${k.id} has no ${f}`);
 assert.equal(kimariteById('nothing'),null);
 assert.equal(kimariteById('oshidashi').ja,'押し出し');
 // A faster opponent leans harder, in the same order as the speeds themselves.
 assert.ok(theirWeight(330)>theirWeight(1100));
 // And the ring actually walks all of it, in order, before anybody pushes anybody.
 const source=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 for(const phase of ['shiko','shio','tachiai','bout'])assert.match(source,new RegExp(`phase==='${phase}'`),`the ring never reaches ${phase}`);
 for(const move of ["type:'brace'","type:'technique'","type:'push'"])assert.ok(source.includes(move),`no way to ${move}`);
});

test('a sumo bout is won by reading him, not by tapping',async()=>{
 const {startBout,sumoAction,leadUpEffect,SUMO_LIMIT,SHOVE_COST,SHOVE_GAIN,TIRED_GAIN,TECHNIQUE_GAIN,shovePower}=await import('../src/kana-data.js');
 const fresh=()=>startBout(leadUpEffect({}));
 // Every shove costs what it earns, so a whole bar of mashing crosses a fraction of the ring.
 const mashed=Array.from({length:40}).reduce(b=>sumoAction(b,{type:'push'}),fresh());
 assert.ok(!mashed.over,'mashing alone never pushes anyone out');
 assert.equal(mashed.stamina,0);
 assert.ok(mashed.push<SUMO_LIMIT/2);
 assert.equal(shovePower(100),SHOVE_GAIN);
 assert.equal(shovePower(SHOVE_COST),TIRED_GAIN,'a tired wrestler shoves for less');
 assert.equal(shovePower(0),0,'and an empty one for nothing at all');
 // He gathers himself now and then, and it counts double while it lasts. Pushing into it
 // costs you ground; bracing into it costs him.
 const surging=sumoAction(fresh(),{type:'surge',on:true});
 assert.ok(sumoAction(surging,{type:'push'}).push<0);
 const held=sumoAction(surging,{type:'brace'});
 assert.equal(held.surge,false);
 assert.ok(held.push>0);
 assert.equal(sumoAction(surging,{type:'tick',their:1,rest:0}).push,-2);
 assert.equal(sumoAction(fresh(),{type:'tick',their:1,rest:0}).push,-1);
 // Bracing with nothing coming gives ground away, and gives your legs a rest.
 const shoved=sumoAction(fresh(),{type:'push'}),rested=sumoAction(shoved,{type:'brace'});
 assert.ok(rested.push<shoved.push&&rested.stamina>shoved.stamina);
 // An opening is taken by the move that answers the tell, and thrown away by anything else.
 const open=sumoAction(fresh(),{type:'open',id:'hatakikomi'});
 const took=sumoAction(open,{type:'technique',id:'hatakikomi'});
 assert.equal(took.push,TECHNIQUE_GAIN);
 assert.equal(took.opening,null);
 assert.ok(sumoAction(open,{type:'technique',id:'uwatenage'}).push<0,'the wrong move for that tell overbalances you');
 assert.ok(sumoAction(fresh(),{type:'technique',id:'uwatenage'}).push<0,'and there is nothing to take hold of when nothing is open');
 assert.ok(sumoAction(open,{type:'push'}).push<0,'mashing straight past an opening loses it');
 // Out of the ring either way ends it, the winning move is remembered, and nothing moves after.
 const won=sumoAction({...fresh(),push:SUMO_LIMIT-TECHNIQUE_GAIN,opening:'yorikiri'},{type:'technique',id:'yorikiri'});
 assert.equal(won.over,'won');
 assert.equal(won.won,'yorikiri');
 assert.equal(sumoAction(won,{type:'push'}),won);
 const lost=sumoAction({...fresh(),push:1-SUMO_LIMIT},{type:'tick',their:2,rest:0});
 assert.equal(lost.over,'lost');
 assert.equal(lost.won,'');
 // Shoving him out is still winning, and names no move.
 const pushedOut=sumoAction({...fresh(),push:SUMO_LIMIT-SHOVE_GAIN},{type:'push'});
 assert.equal(pushedOut.over,'won');
 assert.equal(pushedOut.won,'');
});

test('a sumo career climbs the banzuke, and the tournament decides the rest',async()=>{
 const {newCareer,SEKITORI,TOP_RANK,BASHO_DAYS,KACHIKOSHI,BASHO,AKI,bashoAt,climb,rankRate,bashoOpponent,bashoDay,bashoWorth}=await import('../src/kana-data.js');
 // A career starts at the bottom, unpaid, with the Autumn tournament next — the one that is
 // on in Ryogoku while we are there.
 const start=newCareer();
 assert.equal(start.rank,1);
 assert.equal(bashoAt(start.basho).romaji,'Aki basho');
 assert.equal(BASHO.length,6,'six tournaments a year, like the real calendar');
 for(const b of BASHO)for(const k of ['en','ja','romaji','where','month'])assert.ok(b[k],`${b.en} has no ${k}`);
 assert.equal(bashoAt(AKI+BASHO.length).romaji,'Aki basho','and the year comes round again');
 // The climb: up a rung for a win, down one for a loss, stopping at juryo either way.
 assert.equal(climb(1,true),2);
 assert.equal(climb(2,false),1);
 assert.equal(climb(1,false),1,'nobody falls out of the bottom');
 assert.equal(climb(SEKITORI,true),SEKITORI,'and nobody climbs past juryo this way');
 // A higher rank is a faster opponent, all the way up.
 for(let level=2;level<=TOP_RANK;level++)assert.ok(rankRate(level)<rankRate(level-1),`${level} is no faster than ${level-1}`);
 // The schedule is built like a real torikumi: below you to start with, above you at the
 // end, and the worst of them saved for senshuraku.
 assert.deepEqual(Array.from({length:BASHO_DAYS},(_,d)=>bashoOpponent(6,d)),[5,5,6,6,6,7,8]);
 assert.equal(bashoOpponent(TOP_RANK,6),TOP_RANK,'there is nobody above a yokozuna');
 assert.equal(bashoOpponent(1,0),1,'and nobody below the bottom');
 // Seven days, each going onto the record in the order it happened.
 let mid={...newCareer(),rank:SEKITORI};
 for(const won of [true,false,true])mid=bashoDay(mid,won);
 assert.equal(mid.day,3);
 assert.equal(mid.form,'wlw');
 assert.equal(mid.wins,2);assert.equal(mid.losses,1);
 assert.equal(mid.last,null,'a tournament is not over until the seventh day');
 // Four of seven is kachi-koshi and a promotion, and the record starts again after it.
 let up={...newCareer(),rank:SEKITORI};
 for(const won of [true,true,false,true,false,true,false])up=bashoDay(up,won);
 assert.equal(up.last.wins,4);
 assert.equal(up.last.kachikoshi,true);
 assert.equal(up.rank,SEKITORI+1);
 assert.equal(up.day,0);assert.equal(up.form,'');assert.equal(up.wins,0);
 assert.equal(up.basho,newCareer().basho+1,'and the next tournament is the next one of the year');
 assert.ok(KACHIKOSHI>BASHO_DAYS/2,'a winning record has to be most of them');
 // Three is make-koshi and the name moves down the sheet — but a sekitori stays a sekitori.
 let down={...newCareer(),rank:SEKITORI+1};
 for(let d=0;d<BASHO_DAYS;d++)down=bashoDay(down,d<3);
 assert.equal(down.last.kachikoshi,false);
 assert.equal(down.rank,SEKITORI);
 let bottom={...newCareer(),rank:SEKITORI};
 for(let d=0;d<BASHO_DAYS;d++)bottom=bashoDay(bottom,false);
 assert.equal(bottom.rank,SEKITORI,'nobody is demoted out of the tournament they earned');
 // A perfect seven is a zensho-yusho, and it is the thing worth keeping.
 let perfect={...newCareer(),rank:TOP_RANK};
 for(let d=0;d<BASHO_DAYS;d++)perfect=bashoDay(perfect,true);
 assert.equal(perfect.last.title,true);
 assert.equal(perfect.titles,1);
 assert.equal(perfect.rank,TOP_RANK,'there is nowhere above yokozuna');
 assert.equal(bashoWorth(0,SEKITORI),0);
 assert.ok(bashoWorth(4,TOP_RANK)>bashoWorth(4,SEKITORI),'the same record higher up is worth more');
 assert.ok(bashoWorth(BASHO_DAYS,TOP_RANK)>bashoWorth(BASHO_DAYS-1,TOP_RANK)*1.5,'and a perfect one pays for being perfect');
 // A quick bout takes the ceremony as read: better than skipping it, short of doing it
 // properly, so going straight to the pushing is neither a punishment nor a shortcut worth
 // taking in a tournament.
 const {TAKEN_AS_READ,leadUpEffect,ceremonyScore}=await import('../src/kana-data.js');
 const taken=leadUpEffect(TAKEN_AS_READ);
 assert.ok(taken.stamina>leadUpEffect({}).stamina&&taken.opening>leadUpEffect({}).opening);
 assert.ok(taken.stamina<leadUpEffect({shiko:1,shio:1,charge:1}).stamina);
 assert.ok(ceremonyScore(TAKEN_AS_READ)>0&&ceremonyScore(TAKEN_AS_READ)<1);
 assert.ok(!taken.matta);
 // Five ways into the ring, and the ones that are practice write nothing down.
 const source=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 for(const mode of ['quick','keiko','one','climb','basho'])assert.ok(source.includes(`id:'${mode}'`),`no ${mode} to choose`);
 assert.ok(source.includes("quick?'bout':'shiko'"),'a quick bout has to start in the ring');
 assert.ok(source.includes('if(result.drill)return;'),'a drill must never be scored');
 // Training is never handed the thing that writes, so it cannot record anything even by
 // accident — which is what makes it practice.
 assert.ok(!/function Keiko\(\{[^}]*mutate/.test(source),'keiko must not be given mutate');
 assert.ok(source.includes("game:'sumo-rank'")&&source.includes("game:'sumo-basho'"),'a career has to be worth keeping');
});

test('photo of the day: one vote each, and a tie stays a tie',async()=>{
 const {ensureFeatures,photosFor,photoVotesFor,photoOfTheDay}=await import('../src/trip-features.js');
 const boston={name:'Boston',role:'child'};
 let state=ensureFeatures(structuredClone(seed));
 const day=seed.days[0].date,other=seed.days[1].date;
 assert.deepEqual(state.photos,[]);
 assert.equal(photoOfTheDay(state,day),null,'no photos, no winner');
 state.photos=[
  {id:'p1',by:'Nate',day,pathname:'photos/n/1.jpg',type:'image/jpeg',at:'2026-09-21T01:00:00Z',feedback:{score:7}},
  {id:'p2',by:'Boston',day,pathname:'photos/b/2.jpg',type:'image/jpeg',at:'2026-09-21T02:00:00Z',feedback:{score:8}},
  {id:'p3',by:'Boston',day:other,pathname:'photos/b/3.jpg',type:'image/jpeg',at:'2026-09-22T02:00:00Z',feedback:null}
 ];
 assert.deepEqual(photosFor(state,day).map(p=>p.id),['p2','p1'],'newest first, that day only');
 assert.equal(photosFor(state).length,3);
 // Nobody has voted yet, so there is no winner — not a winner by default.
 assert.deepEqual(photoOfTheDay(state,day).winners,[]);
 // One vote each, and changing your mind replaces it rather than adding one.
 state=applyOperation(state,{type:'photoVote',person:'Nate',day,id:'p1'},child);
 state=applyOperation(state,{type:'photoVote',person:'Nate',day,id:'p2'},child);
 assert.deepEqual(photoVotesFor(state,day),{Nate:'p2'},'one vote, moved');
 state=applyOperation(state,{type:'photoVote',person:'Boston',day,id:'p2'},boston);
 assert.equal(photoOfTheDay(state,day).winners[0].id,'p2');
 assert.equal(photoOfTheDay(state,day).votes,2);
 // A tie is reported as a tie rather than resolved, because picking between brothers is worse.
 const tied=applyOperation(state,{type:'photoVote',person:'Boston',day,id:'p1'},boston);
 assert.deepEqual(photoOfTheDay(tied,day).winners.map(p=>p.id).sort(),['p1','p2']);
 assert.equal(photoOfTheDay(tied,day).votes,1);
 // A vote can be taken back.
 const withdrawn=applyOperation(state,{type:'photoVote',person:'Nate',day,id:null},child);
 assert.deepEqual(photoVotesFor(withdrawn,day),{Boston:'p2'});
 // Your own vote only, a real photo, a real day.
 assert.throws(()=>applyOperation(state,{type:'photoVote',person:'Boston',day,id:'p1'},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'photoVote',person:'Nate',day,id:'nope'},child),e=>e.status===404);
 assert.throws(()=>applyOperation(state,{type:'photoVote',person:'Nate',day,id:'p3'},child),e=>e.status===404,'a photo from another day is not on this ballot');
 assert.throws(()=>applyOperation(state,{type:'photoVote',person:'Nate',day:'2099-01-01',id:'p1'},child),/trip day/);
 // Removing a photo takes its votes with it rather than leaving them pointing at nothing.
 const removed=applyOperation(state,{type:'photoRemove',id:'p2'},boston);
 assert.deepEqual(removed.photos.map(p=>p.id),['p1','p3']);
 assert.deepEqual(photoVotesFor(removed,day),{},'both votes for it are gone');
 assert.throws(()=>applyOperation(state,{type:'photoRemove',id:'p2'},child),e=>e.status===403,'and only your own');
 assert.deepEqual(applyOperation(state,{type:'photoRemove',id:'p1'},parent).photos.map(p=>p.id),['p2','p3'],'a parent can remove any');
});

test('the photo coach talks to the child, and never about who is in the picture',async()=>{
 const {createServer}=await import('node:http');
 let seen=null;
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{seen=JSON.parse(body);res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'end_turn',
    usage:{input_tokens:900,output_tokens:200},content:[{type:'text',text:JSON.stringify({readable:true,title:'Deer at the gate',
     subject:'A deer beside a torii gate',good:['You waited until the deer looked up.'],tip:'Next time crouch to its height and see what happens.',score:14})}]}));});
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const key=process.env.ANTHROPIC_API_KEY,url=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {coachPhoto,coachReady}=await import('../server/photo-coach.mjs');
  assert.equal(coachReady(),true);
  const data=Buffer.from('a photo').toString('base64');
  const out=await coachPhoto({image:data,mediaType:'image/jpeg',age:5});
  // The age reaches the prompt, because feedback for a five-year-old is not feedback for an adult.
  assert.match(seen.system,/taken by a 5-year-old/);
  assert.match(seen.system,/never guess who they are/i,'and it is told not to describe people');
  assert.match(seen.system,/against what a child of this age could manage/);
  assert.equal(seen.messages[0].content[0].type,'image');
  // A score outside the scale is brought back onto it rather than shown as 14 out of 10.
  assert.equal(out.score,10);
  assert.equal(out.title,'Deer at the gate');
  // An age nobody could be falls back rather than being passed on.
  await coachPhoto({image:data,mediaType:'image/jpeg',age:99});
  assert.match(seen.system,/taken by a 8-year-old/);
  await assert.rejects(()=>coachPhoto({image:'',mediaType:'image/jpeg'}),/Choose a photo/);
  await assert.rejects(()=>coachPhoto({image:data,mediaType:'image/gif'}),/JPEG, PNG or WebP/);
 }finally{
  if(key===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=key;
  if(url===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=url;
  await new Promise(r=>upstream.close(r));
 }
});

test('the sumo card is read from the official schedule and kept for a basement with no signal',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures,sumo,sumoCard,currentBout,boutResult,SUMO_DAY}=await import('../src/trip-features.js');
 assert.ok(seed.steps.some(s=>s.day===SUMO_DAY&&/sumo/i.test(s.title)),'the sumo day is a real day on this trip');
 let seen=null;
 const card={found:true,basho:'Aki Basho 2026 (September, Tokyo)',dayNumber:11,venue:'Ryogoku Kokugikan',
  date:SUMO_DAY,doorsOpen:'08:00',notes:'The top division starts about 16:00, after the ring-entering ceremonies.',
  bouts:[
   {division:'makuuchi',order:40,time:'17:55',east:{name:'Hoshoryu',rank:'Ozeki',stable:'Tatsunami'},west:{name:'Kirishima',rank:'Sekiwake',stable:'Michinoku'}},
   {division:'juryo',order:20,time:'15:10',east:{name:'Tomokaze',rank:'Juryo 3',stable:'Oguruma'},west:{name:'Chiyoshoma',rank:'Juryo 5',stable:'Kokonoe'}},
   {division:'makuuchi',order:38,time:'17:40',east:{name:'Wakatakakage',rank:'Maegashira 1',stable:'Arashio'},west:{name:'Abi',rank:'Maegashira 2',stable:'Shikoroyama'}},
   // Junk, to prove the same gate runs here as everywhere else.
   {division:'teleport',order:0,time:'99:99',east:{name:''},west:{name:'Nobody'}}],
  sources:[{title:'Japan Sumo Association — torikumi',url:'https://www.sumo.or.jp/EnHonbashoMain/torikumi/'},{title:'A blog',url:'http://insecure.example.com'}]};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{seen=JSON.parse(body);
   const wants=(seen.tools||[]).some(t=>t.name==='record_wrestler');
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'tool_use',
    usage:{input_tokens:9000,output_tokens:900,server_tool_use:{web_search_requests:4}},
    content:[{type:'tool_use',id:'c1',name:wants?'record_wrestler':'record_sumo_day',
     input:wants?{found:true,name:'Hoshoryu',japanese:'豊昇龍',rank:'Ozeki',stable:'Tatsunami',hometown:'Ulaanbaatar, Mongolia',
      heightCm:187,weightKg:145,record:'8-3 after day 11',about:'Nephew of a great yokozuna. Throws rather than pushes.',
      sources:[{title:'JSA profile',url:'https://www.sumo.or.jp/EnSumoDataRikishi/profile/'}]}:card}]}));});
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {fetchSumoDay,fetchWrestler,sumoReady}=await import('../server/sumo.mjs');
  assert.equal(sumoReady(),true);
  let state=ensureFeatures(structuredClone(seed));
  const fetched=await fetchSumoDay({date:SUMO_DAY},state);

  assert.equal(seen.model,'claude-opus-5');
  assert.equal(seen.tools.find(t=>t.name==='web_search').type,'web_search_20260209');
  assert.equal(seen.tools.find(t=>t.name==='record_sumo_day').strict,true);
  assert.match(seen.system,/sumo\.or\.jp/,'the official site is the source that matters');
  assert.match(seen.system,/published the afternoon before/);
  assert.match(seen.messages[0].content,new RegExp(SUMO_DAY));
  // The day's own page on the official site is handed over to be read, not left to a search.
  assert.equal(seen.tools.find(t=>t.name==='web_fetch').type,'web_fetch_20260209');
  assert.deepEqual(seen.tools.find(t=>t.name==='web_fetch').allowed_domains,['sumo.or.jp']);
  assert.ok(seen.messages[0].content.includes('https://www.sumo.or.jp/EnHonbashoMain/torikumi/1/11/'));

  // The bout with nobody on one side of it is not a bout; the rest come back in running order.
  assert.deepEqual(fetched.bouts.map(b=>b.id),['juryo-20','makuuchi-38','makuuchi-40']);
  assert.equal(fetched.bouts[0].time,'15:10');
  assert.equal(fetched.dayNumber,11);assert.equal(fetched.doorsOpen,'08:00');
  assert.deepEqual(fetched.sources.map(s=>s.url),['https://www.sumo.or.jp/EnHonbashoMain/torikumi/'],'a plain http source is dropped');

  // Saved into the trip, which is what makes it work in a basement with no signal.
  state=applyOperation(state,{type:'sumoUpdate',...fetched},parent);
  assert.equal(sumo(state).bouts.length,3);assert.equal(sumo(state).by,'Damien');
  // Grouped the way the afternoon runs: the top division last.
  assert.deepEqual(sumoCard(state).map(g=>g.id),['juryo','makuuchi']);
  // Which bout is on, so the screen says "this one" rather than leaving you counting rows.
  assert.equal(currentBout(state,'17:45')?.id,'makuuchi-38');
  assert.equal(currentBout(state,'09:00'),null,'nothing has started yet');
  assert.equal(currentBout(state,'23:00')?.id,'makuuchi-40','the last one that started');

  // Anyone marks who won as they watch, and it survives the card being fetched again.
  state=applyOperation(state,{type:'sumoResult',id:'makuuchi-40',winner:'Hoshoryu'},child);
  assert.equal(boutResult(state,'makuuchi-40').winner,'Hoshoryu');
  assert.equal(boutResult(state,'makuuchi-40').by,'Nate');
  assert.equal(boutResult(applyOperation(state,{type:'sumoUpdate',...fetched},parent),'makuuchi-40').winner,'Hoshoryu');
  assert.equal(boutResult(applyOperation(state,{type:'sumoResult',id:'makuuchi-40',winner:null},parent),'makuuchi-40'),null);
  assert.throws(()=>applyOperation(state,{type:'sumoResult',id:'makuuchi-40',winner:'Somebody else'},parent),/One of the two/);
  assert.throws(()=>applyOperation(state,{type:'sumoResult',id:'nope',winner:'Hoshoryu'},parent),e=>e.status===404);
  // Fetching the card and looking a man up cost money, so they are a parent's.
  for(const op of [{type:'sumoUpdate',...fetched},{type:'sumoWrestler',profile:{name:'Hoshoryu'}}])
   assert.throws(()=>applyOperation(state,op,child),e=>e.status===403);

  // And the man whose name is on the card.
  const man=await fetchWrestler({name:'Hoshoryu'});
  assert.equal(man.heightCm,187);assert.equal(man.weightKg,145);
  assert.match(man.about,/Throws rather than pushes/);
  assert.match(seen.system,/Boston is eight/);
  const withMan=applyOperation(state,{type:'sumoWrestler',profile:man},parent);
  const {wrestlerProfile}=await import('../src/trip-features.js');
  assert.equal(wrestlerProfile(withMan,'hoshoryu').japanese,'豊昇龍','looked up once, then on everyone’s phone');
  assert.equal(wrestlerProfile(withMan,'HOSHORYU').rank,'Ozeki','the name is matched however it is typed');
  // Nothing believable is invented: a nonsense size is dropped rather than shown.
  assert.throws(()=>applyOperation(state,{type:'sumoWrestler',profile:{name:'X',heightCm:4}},parent),/believable size/);
  await assert.rejects(()=>fetchSumoDay({date:'2099-01-01'},state),/Choose a trip day/);
  await assert.rejects(()=>fetchWrestler({name:'   '}),/Choose a wrestler/);
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
 // Marking who won is a record of what happened, so it keeps on a dead phone.
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const list=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 assert.ok(list.includes('sumoResult'));
 assert.ok(!list.includes('sumoUpdate'),'fetching a card needs the latest revision');
});

test('the official schedule link goes to the day itself, not to a dead page',async()=>{
 const {SUMO_SITE,sumoSiteUrl,SUMO_DAY_NUMBER}=await import('../src/trip-features.js');
 assert.equal(SUMO_DAY_NUMBER,11,'23 September is day 11 of a basho that opens on 13 September');
 assert.equal(SUMO_SITE,'https://www.sumo.or.jp/EnHonbashoMain/torikumi/1/11/');
 assert.equal(sumoSiteUrl(12,'juryo'),'https://www.sumo.or.jp/EnHonbashoMain/torikumi/2/12/');
 assert.equal(sumoSiteUrl(null),SUMO_SITE,'no day on the card yet means our day');
 assert.equal(sumoSiteUrl(99,'teleport'),SUMO_SITE);
 const page=await readFile(new URL('../src/Sumo.jsx',import.meta.url),'utf8');
 assert.ok(!/EnHonbashoMain\/torikumi\/['"`]/.test(page),'the bare /torikumi/ address is not linked anywhere');
});

test('a parent pulls the winners in from the official site, and the site is the record',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures,sumo,boutResult,predictionTally,SUMO_DAY}=await import('../src/trip-features.js');
 const card={type:'sumoUpdate',basho:'Aki Basho 2026',dayNumber:11,venue:'Ryogoku Kokugikan',date:SUMO_DAY,
  bouts:[{id:'juryo-20',division:'juryo',order:20,time:'15:10',east:{name:'Tomokaze'},west:{name:'Chiyoshoma'}},
   {id:'makuuchi-38',division:'makuuchi',order:38,time:'17:40',east:{name:'Daieisho'},west:{name:'Kirishima'}},
   {id:'makuuchi-40',division:'makuuchi',order:40,time:'17:55',east:{name:'Hoshoryu'},west:{name:'Kotozakura'}}]};
 let state=applyOperation(ensureFeatures(structuredClone(seed)),card,parent);
 state=applyOperation(state,{type:'sumoPredict',id:'makuuchi-40',person:'Boston',winner:'Kotozakura'},child);
 // Somebody in the arena tapped the wrong man.
 state=applyOperation(state,{type:'sumoResult',id:'makuuchi-38',winner:'Daieisho'},child);


 let seen=null;
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{seen=JSON.parse(body);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'tool_use',
    usage:{input_tokens:5000,output_tokens:300},
    content:[{type:'tool_use',id:'c1',name:'record_sumo_results',input:{found:true,dayNumber:11,notes:'Makuuchi under way.',
     results:[{id:'juryo-20',winner:'east',kimarite:'oshidashi'},{id:'makuuchi-38',winner:'west',kimarite:'yorikiri'},
      {id:'makuuchi-38',winner:'east',kimarite:''},{id:'not-on-card',winner:'east',kimarite:''}],
     sources:[{title:'JSA',url:'https://www.sumo.or.jp/EnHonbashoMain/torikumi/1/11/'}]}}]}));});
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {fetchSumoResults}=await import('../server/sumo.mjs');
  const read=await fetchSumoResults({date:SUMO_DAY},state);
  // Nothing in the app asks for this on a timer: it is a button, because every read costs money.
  const page=await readFile(new URL('../src/Sumo.jsx',import.meta.url),'utf8');
  assert.ok(!/setInterval|setTimeout/.test(page),'no polling');
  const tool=seen.tools.find(t=>t.name==='record_sumo_results');
  assert.equal(tool.strict,true);
  assert.deepEqual(tool.input_schema.properties.results.items.properties.id.enum,['juryo-20','makuuchi-38','makuuchi-40'],'only bouts on our card');
  assert.ok(seen.tools.some(t=>t.name==='web_fetch'));
  assert.ok(seen.messages[0].content.includes('https://www.sumo.or.jp/EnHonbashoMain/torikumi/2/11/'));
  assert.match(seen.messages[0].content,/east Hoshoryu v west Kotozakura/);
  // A side becomes a name, a bout is answered once, and one not on the card is not a result.
  assert.deepEqual(read.results,[{id:'juryo-20',winner:'Tomokaze',kimarite:'oshidashi'},{id:'makuuchi-38',winner:'Kirishima',kimarite:'yorikiri'}]);

  const next=applyOperation(state,{type:'sumoResults',results:read.results,note:read.notes},parent);
  assert.equal(boutResult(next,'juryo-20').winner,'Tomokaze');
  assert.equal(boutResult(next,'juryo-20').kimarite,'oshidashi');
  assert.equal(boutResult(next,'makuuchi-38').winner,'Kirishima','the site wins over a wrong tap');
  assert.equal(boutResult(next,'makuuchi-38').official,true);
  assert.equal(boutResult(next,'makuuchi-40'),null,'a bout still to come is left alone');
  assert.equal(predictionTally(next).find(t=>t.name==='Boston').waiting,1);
  assert.ok(sumo(next).resultsAt);assert.equal(sumo(next).resultsNote,'Makuuchi under way.');
  // Reading the site is a parent's, because it costs money; the rest is checked like any tap.
  assert.throws(()=>applyOperation(state,{type:'sumoResults',results:[]},child),e=>e.status===403);
  assert.throws(()=>applyOperation(state,{type:'sumoResults',results:[{id:'juryo-20',winner:'Somebody'}]},parent),/One of the two/);
  assert.throws(()=>applyOperation(state,{type:'sumoResults',results:[{id:'nope',winner:'Tomokaze'}]},parent),e=>e.status===404);
  // Nothing to ask about until there is a card for that day.
  await assert.rejects(()=>fetchSumoResults({date:SUMO_DAY},ensureFeatures(structuredClone(seed))),/Load the day/);
  await assert.rejects(()=>fetchSumoResults({date:'2026-09-24'},state),/different day/);
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
});

test('we rate an activity and say what we thought, each of us for ourselves',async()=>{
 const {ensureFeatures,stepAverage,stepRatings,stepThoughts,ratedSteps,dayRating,diaryDays,pendingProgress}=await import('../src/trip-features.js');
 const step=seed.steps.find(s=>s.day==='2026-09-23'),other=seed.steps.find(s=>s.day==='2026-09-23'&&s.id!==step.id);
 let state=applyOperation(ensureFeatures(structuredClone(seed)),{type:'stepRating',id:step.id,person:'Nate',rating:5},child);
 state=applyOperation(state,{type:'stepRating',id:step.id,person:'Lauren',rating:2},parent);
 state=applyOperation(state,{type:'stepThought',id:step.id,person:'Nate',thought:'The deer bowed back.'},child);
 assert.equal(stepAverage(state,step.id),3.5);
 assert.deepEqual(stepRatings(state,step.id),{Nate:5,Lauren:2});
 assert.equal(stepThoughts(state,step.id).Nate.text,'The deer bowed back.');
 assert.ok(stepThoughts(state,step.id).Nate.at,'and when he said it');
 // Nobody's stars average away anybody else's — the two numbers are the interesting bit.
 assert.equal(stepAverage(applyOperation(state,{type:'stepRating',id:step.id,person:'Lauren',rating:4},parent),step.id),4.5);
 // Changing your mind replaces your stars; zero takes them back.
 const cleared=applyOperation(state,{type:'stepRating',id:step.id,person:'Nate',rating:0},child);
 assert.deepEqual(stepRatings(cleared,step.id),{Lauren:2});
 assert.equal(stepThoughts(cleared,step.id).Nate.text,'The deer bowed back.','clearing stars is not deleting what he said');
 assert.deepEqual(stepThoughts(applyOperation(state,{type:'stepThought',id:step.id,person:'Nate',thought:'  '},child),step.id),{});
 // It is our own opinion, not each other's — and only for real activities.
 assert.throws(()=>applyOperation(state,{type:'stepRating',id:step.id,person:'Boston',rating:5},child),e=>e.status===403);
 for(const bad of [{type:'stepRating',id:step.id,person:'Nate',rating:6},{type:'stepRating',id:step.id,person:'Nate',rating:2.5},
  {type:'stepRating',id:'nope',person:'Nate',rating:3},{type:'stepRating',id:step.id,person:'Grandma',rating:3},
  {type:'stepThought',id:step.id,person:'Nate',thought:'x'.repeat(2001)}])
  assert.throws(()=>applyOperation(state,bad,parent),`${JSON.stringify(bad).slice(0,46)} should be refused`);
 // These are opinions about a day that happened, not the plan — the step's own notes are untouched.
 assert.equal(state.steps.find(s=>s.id===step.id).notes,step.notes);
 assert.ok(!state.alerts.some(a=>/deer bowed/.test(a.summary||'')));
 // The days we would do again, best first, and what the day came to overall.
 state=applyOperation(state,{type:'stepRating',id:other.id,person:'Damien',rating:5},parent);
 assert.deepEqual(ratedSteps(state).map(r=>r.step.id),[other.id,step.id]);
 assert.equal(dayRating(state,'2026-09-23'),4.3,'a day is the average of its rated activities, to one place');
 assert.equal(dayRating(state,'2026-09-21'),null,'a day nobody rated has no score, rather than a zero');
 assert.deepEqual(ratedSteps(state,{min:4}).map(r=>r.step.id),[other.id]);
 // The diary is where it pays off.
 const diary=diaryDays(state,'2026-09-23')[0];
 assert.equal(diary.rating,4.3);assert.equal(diary.reviews.length,2);
 // Stars given on a mountain with no signal wait on the phone and show straight away.
 const queue=[{operation:{type:'stepRating',operationId:'q1',id:step.id,person:'Boston',rating:4}},
              {operation:{type:'stepThought',operationId:'q2',id:step.id,person:'Boston',thought:'Better than the temple.',at:'2026-09-19T02:00:00.000Z'}}];
 const preview=pendingProgress(state,queue);
 assert.equal(stepRatings(preview,step.id).Boston,4);
 assert.equal(stepThoughts(preview,step.id).Boston.text,'Better than the temple.');
 assert.equal(stepRatings(state,step.id).Boston,undefined,'the shared trip is untouched until it syncs');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const list=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 for(const op of ['stepRating','stepThought'])assert.ok(list.includes(op),`${op} should survive with no signal`);
 assert.match(source,/<StepReview state=\{visibleState\} user=\{user\} step=\{current\}/,'and it is on the activity card');
 // Finishing something used to move the card on, which is the one moment anybody has an
 // opinion about it. It now stays put, as the message has always promised it would.
 assert.match(source,/setSelected\(done\);updateUrl\(day,done\)/);
});

test('the forecast comes back by the hour, and the graph is drawn from checked numbers',async()=>{
 const {forecastUrl,parseHourly,parseForecast,daySummary,hoursFor,hoursAhead,hourLabel,pointFor}=await import('../src/weather-data.js');
 const {ensureFeatures}=await import('../src/trip-features.js');
 const day=seed.days[3].date;
 // One request carries both the daily numbers and the hourly ones — the trip moves cities, so
 // asking twice per place would double a lookup that is already once per city.
 const url=forecastUrl(pointFor('Kyoto'),day,day);
 assert.match(url,/hourly=temperature_2m%2Capparent_temperature%2Cprecipitation_probability%2Cweather_code/);
 assert.match(url,/daily=weather_code/);
 assert.match(url,/timezone=Asia%2FTokyo/);
 const hourly={time:[],temperature_2m:[],apparent_temperature:[],precipitation_probability:[],weather_code:[]};
 for(let h=0;h<24;h++){hourly.time.push(`${day}T${String(h).padStart(2,'0')}:00`);
  hourly.temperature_2m.push(h===14?24.4:12+h*0.4);hourly.apparent_temperature.push(11+h*0.4);
  hourly.precipitation_probability.push(h>=16&&h<=18?70:5);hourly.weather_code.push(h>=16?61:1);}
 // Readings that cannot be true are dropped rather than drawn.
 hourly.time.push(`${day}T24:00`,'rubbish',`${seed.days[4].date}T09:00`);
 hourly.temperature_2m.push(999,10,18);hourly.apparent_temperature.push(0,0,17);
 hourly.precipitation_probability.push(0,0,500);hourly.weather_code.push(0,0,2);
 const hours=parseHourly({hourly});
 assert.equal(hours[day].length,24,'one entry per hour, and nothing that is not an hour');
 assert.equal(hours[day][0].h,0);assert.equal(hours[day][14].temp,24);
 assert.equal(hours[day][16].rain,70);
 assert.equal(hours[seed.days[4].date][0].rain,null,'a percentage over a hundred is not a percentage');
 assert.deepEqual(parseHourly({}),{});
 // The shape of the day in a line, which is what the unopened card shows.
 const shape=daySummary(hours[day]);
 assert.equal(shape.warmest,14);assert.equal(shape.coldest,0);
 assert.equal(shape.peakRain,70);assert.equal(shape.wettestHour,16);
 assert.equal(daySummary([]),null);
 assert.equal(hourLabel(7),'07:00');
 // Kept in the trip beside the daily numbers, checked again on the way in.
 let state=ensureFeatures(structuredClone(seed));
 state=applyOperation(state,{type:'weatherUpdate',days:parseForecast({daily:{time:[day],weather_code:[61],
  temperature_2m_max:[24],temperature_2m_min:[12],precipitation_probability_max:[70]}},'Kyoto'),hours},parent);
 assert.equal(hoursFor(state,day).length,24);
 assert.equal(hoursFor(state,seed.days[0].date),null,'a day nobody asked about stays empty');
 assert.equal(hoursAhead(state,day,15).length,9,'from this hour to the end of the day');
 assert.equal(hoursAhead(state,seed.days[0].date,0),null);
 // A graph drawn from nonsense is a more convincing kind of wrong, so the hours are gated too.
 for(const bad of [{[day]:[{h:24,temp:20}]},{[day]:[{h:1,temp:900}]},{[day]:[{h:1,temp:20,rain:200}]},
  {[day]:[]},{[day]:'nope'},{[day]:Array.from({length:25},(_,h)=>({h:h%24,temp:20}))}])
  assert.throws(()=>applyOperation(state,{type:'weatherUpdate',days:{},hours:bad},parent),/forecast/i,JSON.stringify(bad).slice(0,44));
 // Checking the forecast has always been anybody's job, and still is.
 assert.ok(applyOperation(state,{type:'weatherUpdate',days:{},hours:{[day]:hours[day]}},child));
 // Two measures on one pair of axes would be a lie, so the chart is two charts over one x-axis.
 const chart=await readFile(new URL('../src/WeatherCharts.jsx',import.meta.url),'utf8');
 assert.match(chart,/Deliberately not one chart with\n\/\/ two scales/);
 assert.equal((chart.match(/className="chart-line"/g)||[]).length,1,'one temperature series, so no legend box to disambiguate');
 assert.ok(!/<legend|className="legend"/.test(chart));
 assert.match(chart,/HourlyTable/,'and everything drawn is available as a table');
 // The hours open up on the day you are standing in, on the page you are already on. Leaving
 // the day to find out when the rain starts was the long way round to a two-hour question.
 const card=await readFile(new URL('../src/Weather.jsx',import.meta.url),'utf8');
 assert.match(card,/import HourlyChart,\{HourlyTable,DayShape\} from '\.\/WeatherCharts\.jsx'/,'the card draws the same graph as the weather screen, not a second one');
 assert.match(card,/aria-expanded=\{openHours\}/,'and the toggle says whether it is open');
 assert.match(card,/openHours\?'Hide the hours':'Hour by hour'/);
 assert.match(card,/<HourlyPanel key=\{day\}/,'a new day starts with no hour selected');
 assert.match(card,/All sixteen days/,'the whole trip is still one tap away');
 // The now line belongs to the day we are actually in, not to whichever day is on screen.
 assert.match(card,/japanDate\(now\)===day\?Number\(japanClock\(now\)\.slice\(0,2\)\):null/);
 const nav=await import('../src/nav-data.js');
 assert.ok(nav.PAGES.weather?.label&&nav.PAGES.weather?.note,'weather has its own screen');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(source,/tab==='weather'/);
 assert.match(source,/<Weather state=\{visibleState\} day=\{day\} now=\{now\}/,'the card is told the time, so it can mark now on the graph');
});

// Spot the difference, built out of the boys' own photographs. The puzzle is made on the
// phone, so all of this runs without a canvas, a network or an API key.
const spotImage=(width,height,fill)=>{
 const data=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<width*height;i++){
  const [r,g,b]=fill(i%width,Math.floor(i/width));
  data[i*4]=r;data[i*4+1]=g;data[i*4+2]=b;data[i*4+3]=255;
 }
 return {data,width,height};
};
// Something going on in every part of it, and something plain enough that no honest puzzle
// can be made from it at all.
const busyPhoto=spotImage(320,240,(x,y)=>{const n=(x*7919+y*104729)%256;return [n,(n*3)%256,(n*7)%256];});
const plainPhoto=spotImage(320,240,()=>[128,128,128]);

test('the same photo makes the same puzzle on every phone, and a different one for each level',async()=>{
 const {planRound,levelFor,hashSeed}=await import('../src/spot-data.js');
 const id='7c62d139-abcd-4000-9000-000000000000';
 const round=()=>planRound(busyPhoto,{level:levelFor('normal'),seed:hashSeed(`${id}:normal`),aspect:4/3});
 assert.deepEqual(round().edits,round().edits,'two phones opening the same photo must get the same board');
 assert.equal(round().edits.length,5);
 const harder=planRound(busyPhoto,{level:levelFor('hard'),seed:hashSeed(`${id}:hard`),aspect:4/3});
 assert.equal(harder.edits.length,7);
 assert.notDeepEqual(harder.edits,round().edits);
 // A different photo is a different puzzle, or the second one would already be solved.
 const other=planRound(busyPhoto,{level:levelFor('normal'),seed:hashSeed('another-photo:normal'),aspect:4/3});
 assert.notDeepEqual(other.edits.map(e=>`${e.x},${e.y}`),round().edits.map(e=>`${e.x},${e.y}`));
});

test('nothing is hidden where a child could not find it',async()=>{
 const {planRound,levelFor,pickCells,detailMap,kindsFor,DETAIL_FLOOR,COLOUR_FLOOR}=await import('../src/spot-data.js');
 // A flat photo is refused outright rather than being given changes nobody could see.
 const plain=planRound(plainPhoto,{level:levelFor('normal'),seed:1,aspect:4/3});
 assert.equal(plain.tooPlain,true);
 assert.equal(plain.edits.length,0);
 const busy=planRound(busyPhoto,{level:levelFor('normal'),seed:1,aspect:4/3});
 assert.equal(busy.tooPlain,false);
 // Every change lands somewhere with enough going on, and inside the picture.
 const cells=detailMap(busyPhoto,6,5);
 for(const cell of cells)assert.ok(cell.detail>=DETAIL_FLOOR);
 for(const cell of detailMap(plainPhoto,6,5))assert.ok(cell.detail<DETAIL_FLOOR);
 for(const e of busy.edits){
  assert.ok(e.x>=0&&e.x+e.w<=1.0001,'a change cannot run off the side of the photo');
  assert.ok(e.y>=0&&e.y+e.h<=1.0001);
  if(e.from){assert.ok(e.from.x>=0&&e.from.x+e.w<=1.0001);assert.ok(e.from.y>=0&&e.from.y+e.h<=1.0001);}
 }
 // Recolouring something grey is not a difference, so it is not offered there.
 assert.ok(!kindsFor({colour:COLOUR_FLOOR-1}).includes('recolour'));
 assert.ok(kindsFor({colour:COLOUR_FLOOR+1}).includes('recolour'));
 // Spread out: five differences in one corner is a worse game than five across the picture.
 const chosen=pickCells(cells,{count:5,random:()=>0.5});
 for(const a of chosen)for(const b of chosen)
  if(a!==b)assert.ok(Math.abs(a.col-b.col)>=2||Math.abs(a.row-b.row)>=2,'two changes cannot sit on top of each other');
});

test('a finger is not a pixel, and being sure of an answer you already gave costs nothing',async()=>{
 const {hitTest,hintFor}=await import('../src/spot-data.js');
 const edits=[{id:'d1',x:0.1,y:0.1,w:0.2,h:0.2},{id:'d2',x:0.6,y:0.6,w:0.2,h:0.2}];
 assert.equal(hitTest(edits,{x:0.2,y:0.2}).id,'d1','a tap in the middle of it counts');
 assert.equal(hitTest(edits,{x:0.305,y:0.2}).id,'d1','and just outside it, because a finger is wide');
 assert.equal(hitTest(edits,{x:0.45,y:0.2}),null,'but not halfway across the photo');
 assert.equal(hitTest(edits,{x:0.7,y:0.7}).id,'d2');
 // Tapping one already found is neither a hit nor a miss: it must not cost a five-year-old.
 assert.deepEqual(hitTest(edits,{x:0.2,y:0.2},{found:['d1']}),{id:'d1',already:true});
 assert.equal(hitTest(edits,{x:NaN,y:0.2}),null);
 assert.equal(hitTest(edits,null),null);
 // A hint is always one they have not got yet, and runs out rather than repeating itself.
 assert.equal(hintFor(edits,[]).id,'d1');
 assert.equal(hintFor(edits,['d1']).id,'d2');
 assert.equal(hintFor(edits,['d1','d2']),null);
});

test('the two pictures go side by side or one above the other, whichever shows more of them',async()=>{
 const {paneLayout,paneBox}=await import('../src/spot-data.js');
 // A phone held upright, with an ordinary landscape photo: one above the other.
 assert.equal(paneLayout({width:390,height:500,aspect:4/3}),'rows');
 // The same phone turned sideways: side by side, without being asked.
 assert.equal(paneLayout({width:844,height:320,aspect:4/3}),'columns');
 // A tall photo on an upright phone is better off side by side, and says so.
 assert.equal(paneLayout({width:390,height:500,aspect:0.5}),'columns');
 assert.equal(paneLayout({width:0,height:0,aspect:0}),'rows','and nonsense falls back to stacked');
 // The box a tap is measured against is exactly the shape of the photo in it.
 const box=paneBox({width:390,height:500,aspect:4/3,mode:'rows'});
 assert.ok(Math.abs(box.width/box.height-4/3)<0.02);
 assert.ok(box.height<=250,'and both panes fit in the room they were given');
 const side=paneBox({width:844,height:320,aspect:4/3,mode:'columns'});
 assert.ok(side.width<=(844-12)/2&&side.height<=320);
});

test('looking is never punished into not looking, and a revealed round cannot be banked',async()=>{
 const {spotScore,SPOT_SCORE}=await import('../src/spot-data.js');
 const base={total:5,misses:0,hints:0,seconds:20};
 // A find is always worth more than a miss costs, so a guess is worth making.
 assert.ok(SPOT_SCORE.find>SPOT_SCORE.miss);
 for(let found=0;found<5;found++)
  assert.ok(spotScore({...base,found:found+1})>spotScore({...base,found}),'more found is always more');
 assert.ok(spotScore({...base,found:4,misses:3})<spotScore({...base,found:4}),'a wrong tap always costs');
 assert.ok(spotScore({...base,found:4,hints:1})<spotScore({...base,found:4}),'and so does a hint');
 // The time bonus is only paid for finishing — there is no prize for giving up quickly.
 assert.equal(spotScore({total:5,found:4,seconds:0}),spotScore({total:5,found:4,seconds:400}));
 assert.ok(spotScore({total:5,found:5,seconds:1})>spotScore({total:5,found:5,seconds:200}));
 // Never below nothing, and never above what the server will accept.
 assert.equal(spotScore({total:5,found:0,misses:99}),0);
 assert.ok(spotScore({total:99,found:99,seconds:0})<=9999);
 assert.equal(spotScore(),0);
});

test('each change is painted on its own and faded in at the edges, and the original is left alone',async()=>{
 const {applyEdits,rotateChannels}=await import('../src/spot-data.js');
 const recorder=()=>{
  const calls=[];
  const ctx={calls,
   drawImage:(...a)=>calls.push(['drawImage',...a]),
   translate:(...a)=>calls.push(['translate',...a]),
   scale:(...a)=>calls.push(['scale',...a]),
   setTransform:(...a)=>calls.push(['setTransform',...a]),
   fillRect:(...a)=>calls.push(['fillRect',...a]),
   createRadialGradient:()=>({addColorStop(){}}),
   getImageData:(x,y,w,h)=>({data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>[200,50,10,255][i%4]),width:w,height:h}),
   putImageData:img=>calls.push(['putImageData',img]),
   set globalCompositeOperation(v){calls.push(['composite',v]);},get globalCompositeOperation(){return 'source-over';},
   set fillStyle(v){calls.push(['fillStyle']);},get fillStyle(){return '';}};
  return ctx;
 };
 const main=recorder(),tiles=[];
 const makeCanvas=(w,h)=>{const ctx=recorder();const tile={width:w,height:h,getContext:()=>ctx,ctx};tiles.push(tile);return tile;};
 const edits=[
  {id:'d1',kind:'patch',x:0.1,y:0.1,w:0.2,h:0.2,from:{x:0.4,y:0.1}},
  {id:'d2',kind:'flip',x:0.5,y:0.5,w:0.2,h:0.2},
  {id:'d3',kind:'recolour',x:0.1,y:0.6,w:0.2,h:0.2,shift:1},
  {id:'d4',kind:'grow',x:0.6,y:0.1,w:0.2,h:0.2,scale:1.25}
 ];
 const source={width:400,height:300};
 const painted=applyEdits(main.ctx||main,source,edits,{width:400,height:300,makeCanvas});
 assert.deepEqual(painted,['d1','d2','d3','d4']);
 assert.equal(tiles.length,4,'each change is built on its own canvas so it disturbs nothing around it');
 // Every tile lands back on the picture at exactly the place it came from.
 const landed=main.calls.filter(c=>c[0]==='drawImage');
 assert.equal(landed.length,4);
 assert.deepEqual(landed.map(c=>[c[2],c[3]]),[[40,30],[200,150],[40,180],[240,30]]);
 // A patch is taken from somewhere else in the photo — that is what makes a thing vanish.
 const patch=tiles[0].ctx.calls.find(c=>c[0]==='drawImage');
 assert.deepEqual([patch[2],patch[3]],[160,30]);
 assert.notDeepEqual([patch[2],patch[3]],[40,30]);
 // A flip is mirrored and then puts the brush back where it found it.
 assert.deepEqual(tiles[1].ctx.calls.find(c=>c[0]==='scale'),['scale',-1,1]);
 assert.ok(tiles[1].ctx.calls.some(c=>c[0]==='setTransform'));
 // A recolour really does change the colours, rather than only claiming to.
 const put=tiles[2].ctx.calls.find(c=>c[0]==='putImageData');
 assert.deepEqual([...put[1].data.slice(0,4)],[50,10,200,255]);
 // A grow takes a smaller piece of the photo and fills the same hole with it.
 const grown=tiles[3].ctx.calls.find(c=>c[0]==='drawImage');
 assert.ok(grown[4]<80&&grown[5]<60,'the piece taken is smaller than the hole it fills');
 // Every change is faded out at its edges before it lands, so there is no tell-tale seam.
 for(const tile of tiles)assert.ok(tile.ctx.calls.some(c=>c[0]==='composite'&&c[1]==='destination-in'));
 // A change too small to see is not made at all.
 const tiny=[];
 assert.deepEqual(applyEdits(recorder(),source,[{id:'x',kind:'flip',x:0,y:0,w:0.005,h:0.005}],
  {width:400,height:300,makeCanvas:(w,h)=>{tiny.push([w,h]);return makeCanvas(w,h);}}),[]);
 assert.equal(tiny.length,0);
 // The channel rotation on its own: red, green and blue move round, nothing is invented.
 const solo=recorder();
 rotateChannels(solo,1,1,2);
 assert.deepEqual([...solo.calls.find(c=>c[0]==='putImageData')[1].data.slice(0,3)],[10,200,50]);
});

test('a spot-the-difference score is one the server will actually take',async()=>{
 const {spotGame,spotScore}=await import('../src/spot-data.js');
 const {ensureFeatures,scoresFor,bestScore}=await import('../src/trip-features.js');
 const game=spotGame('7c62d139-abcd-4000-9000-000000000000',7);
 assert.ok(game.length<=40,'the server refuses a game name longer than this');
 const score=spotScore({found:7,total:7,misses:2,hints:0,seconds:30});
 let state=ensureFeatures(structuredClone(seed));
 state=applyOperation(state,{type:'gameScore',person:'Nate',game,score},child);
 assert.equal(bestScore(state,'Nate',game),score);
 // The head-to-head: everyone's best on this photo, and nobody who has not had a go yet.
 state=applyOperation(state,{type:'gameScore',person:'Boston',game,score:score-50},{name:'Boston',role:'child'});
 assert.deepEqual(scoresFor(state,game),{Nate:score,Boston:score-50});
 assert.deepEqual(scoresFor(state,'spot-nobody-5'),{});
 // A boy cannot post a score for his brother.
 assert.throws(()=>applyOperation(state,{type:'gameScore',person:'Boston',game,score:9999},child),/your own/i);
});

test('every game in the picker says what it needs, and spot the difference is one of them',async()=>{
 const source=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 const entries=[...source.matchAll(/\{id:'([a-z]+)',title:'([^']+)',[^\n]*?needs:(OFFLINE|'[^']+'),Component:(\w+)/g)];
 assert.equal(entries.length,24);
 for(const [,id,title,needs,component]of entries){
  assert.ok(needs.trim(),`${id} must say what it needs`);
  assert.ok(new RegExp(`function ${component}\\b`).test(source)||new RegExp(`import ${component} from`).test(source),
   `${title} must have a component that exists`);
 }
 assert.ok(entries.some(([,id])=>id==='spot'));
 assert.match(source,/import SpotDifference from '\.\/SpotDifference\.jsx'/);
 // The old yes-or-no is gone: one of these needs the other phone and one needs a photo.
 assert.doesNotMatch(source,/offline:(true|false)/);
 const game=await readFile(new URL('../src/SpotDifference.jsx',import.meta.url),'utf8');
 // A revealed round is not scored, and the score is only ever saved once.
 assert.match(game,/if\(!finished\|\|revealed\|\|!game\|\|saved\.current===game\)return/);
 // Nothing about a round leaves the phone: no request, no upload, only the photo coming down.
 assert.doesNotMatch(game,/\brequest\(/);
 assert.doesNotMatch(game,/upload\(/);
});

test('a game that really is Japanese says so, and one that only looks it says nothing',async()=>{
 const source=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 const entries=[...source.matchAll(/\{id:'([a-z]+)',title:'([^']+)',([^\n]*?)needs:/g)]
  .map(([,id,title,middle])=>({id,title,
   ja:middle.match(/ja:'([^']+)'/)?.[1]||null,
   origin:middle.match(/origin:'([a-z]+)'/)?.[1]||null}));
 // The ones that are genuinely Japanese games, and nothing else. Sumo stable and Onigiri to
 // Fuji are games about Japan, which is a different claim and is not made.
 assert.deepEqual(entries.filter(g=>g.origin==='traditional').map(g=>g.id).sort(),
  ['beigoma','daruma','fukuwarai','gomoku','hanafuda','janken','karuta','kendama','kingyo','origami','shiritori','sumo']);
 assert.deepEqual(entries.filter(g=>g.origin==='modern').map(g=>g.id).sort(),['picross','shogi']);
 for(const g of entries.filter(g=>g.origin))
  assert.ok(g.ja,`${g.title} claims to be Japanese, so it must say what it is called in Japanese`);
 for(const g of entries.filter(g=>!g.origin))
  assert.equal(g.ja,null,`${g.title} makes no claim, so it carries no Japanese name either`);
 // Only two kinds of claim exist, and each game that makes one carries its own story.
 assert.match(source,/const ORIGINS=\{\n traditional:.*\n modern:.*\n\};/);
 for(const g of entries.filter(g=>g.origin))
  assert.match(source,new RegExp(`id:'${g.id}'[\\s\\S]{0,600}?story:'`),`${g.title} must say why`);
});

test('a hanafuda deck with the wrong number of anything is a scoring system that lies',async()=>{
 const H=await import('../src/hanafuda.js');
 // Forty-eight cards, twelve months, four a month, and five brights, nine animals, ten ribbons
 // and twenty-four plains. Every one of those numbers is load-bearing for the scoring.
 assert.equal(H.DECK.length,48);
 assert.equal(H.MONTHS.length,12);
 assert.equal(new Set(H.DECK.map(c=>c.id)).size,48,'every card must be its own card');
 for(const month of H.MONTHS){
  assert.equal(H.DECK.filter(c=>c.m===month.m).length,4,`month ${month.m} must have four cards`);
  assert.ok(month.ja&&month.romaji&&month.en,`month ${month.m} needs its flower named`);
 }
 const kinds={[H.HIKARI]:5,[H.TANE]:9,[H.TAN]:10,[H.KASU]:24};
 for(const [kind,n] of Object.entries(kinds))
  assert.equal(H.DECK.filter(c=>c.kind===kind).length,n,`there must be ${n} of ${kind}`);
 // The named cards the combinations are built from must all actually exist.
 for(const tag of ['crane','curtain','moon','rainman','phoenix','boar','deer','butterfly','sake','poetry','blue'])
  assert.ok(H.DECK.some(c=>c.tag===tag),`no card carries ${tag}`);
 assert.equal(H.DECK.filter(c=>c.tag==='poetry').length,3,'three poetry ribbons');
 assert.equal(H.DECK.filter(c=>c.tag==='blue').length,3,'three blue ribbons');
 const bright=t=>H.DECK.find(c=>c.tag===t);
 const brights=H.DECK.filter(c=>c.kind===H.HIKARI);
 // The two rules everybody gets wrong: the man with the umbrella spoils four brights, and the
 // bright combinations do not stack with each other.
 const noRain=brights.filter(c=>c.tag!=='rainman');
 assert.deepEqual(H.scoreOf(noRain.slice(0,4)).yaku.map(y=>y.id),['shiko']);
 assert.equal(H.scoreOf(noRain.slice(0,4)).points,8);
 assert.deepEqual(H.scoreOf([...noRain.slice(0,3),bright('rainman')]).yaku.map(y=>y.id),['ameshiko']);
 assert.equal(H.scoreOf([...noRain.slice(0,3),bright('rainman')]).points,7);
 assert.deepEqual(H.scoreOf(noRain.slice(0,3)).yaku.map(y=>y.id),['sanko']);
 assert.equal(H.scoreOf(brights).points,10,'five brights is ten, not ten plus eight plus five');
 assert.deepEqual(H.scoreOf(brights).yaku.map(y=>y.id),['goko']);
 assert.equal(H.scoreOf([...noRain.slice(0,2),bright('rainman')]).points,0,
  'three including the rain man is not three brights');
 // The set combinations, and the ones that pay one more for every extra card.
 assert.equal(H.scoreOf([bright('boar'),bright('deer'),bright('butterfly')]).points,5);
 assert.equal(H.scoreOf([bright('curtain'),bright('sake')]).points,5,'a drink under the blossom');
 assert.equal(H.scoreOf([bright('moon'),bright('sake')]).points,5,'and one under the moon');
 const animals=H.DECK.filter(c=>c.kind===H.TANE);
 assert.equal(H.scoreOf(animals.slice(0,4)).points,0,'four animals is nothing');
 const five=H.scoreOf(animals.slice(0,5)),six=H.scoreOf(animals.slice(0,6));
 assert.ok(five.points>=1&&six.points===five.points+1,'and every animal past five is one more');
 const plains=H.DECK.filter(c=>c.kind===H.KASU);
 assert.equal(H.scoreOf(plains.slice(0,9)).points,0);
 assert.equal(H.scoreOf(plains.slice(0,10)).points,1);
 assert.equal(H.scoreOf(plains.slice(0,12)).points,3);
 // Saying koi-koi doubles what the round pays, every time it is said.
 assert.equal(H.payout(5,0),5);
 assert.equal(H.payout(5,1),10);
 assert.equal(H.payout(5,3),40);
 // The deal is a real deal: eight each, eight down, the rest in the deck, and no card twice.
 const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
 for(let s=1;s<=20;s++){
  const g=H.deal(rng(s*7919));
  assert.equal(g.hands.me.length,H.HAND);
  assert.equal(g.hands.them.length,H.HAND);
  assert.equal(g.table.length,H.TABLE);
  assert.equal(g.deck.length,48-H.HAND*2-H.TABLE);
  const all=[...g.hands.me,...g.hands.them,...g.table,...g.deck].map(c=>c.id);
  assert.equal(new Set(all).size,48,'the deal must not lose or duplicate a card');
 }
 // And a whole game plays out: cards only ever move, somebody stops or the hands run out, and
 // no card is ever in two places at once.
 const play=seed=>{
  const rand=rng(seed);
  let g=H.deal(rand),guard=0;
  while(!g.over&&guard++<400){
   const total=[...g.hands.me,...g.hands.them,...g.table,...g.deck,...g.piles.me,...g.piles.them];
   assert.equal(new Set(total.map(c=>c.id)).size,48,'a card went missing mid-game');
   if(g.phase==='decide'){g=H.heStops(g)?H.stop(g):H.koikoi(g);continue;}
   if(g.pending){g=H.step(g,{cardId:g.pending.card.id,pickId:g.pending.options[0].id});continue;}
   if(!g.hands[g.turn].length){g=H.step(g,{});break;}
   g=H.step(g,H.hisMove({...g,hands:{...g.hands,them:g.hands[g.turn]},piles:{...g.piles,them:g.piles[g.turn]}},rand));
  }
  return g;
 };
 let finished=0,scored=0;
 for(let s=1;s<=30;s++){
  const g=play(s*104729);
  assert.ok(g.over,`game ${s} never finished`);
  finished++;
  if(g.over.winner)scored++;
  if(g.over.winner)assert.ok(g.over.points>0,'a winner must have scored something');
 }
 assert.equal(finished,30);
 assert.ok(scored>=15,`only ${scored} of 30 games were won by anybody, which is too few`);
 // Matching is by month and by nothing else, which is the one rule the whole game rests on.
 const table=[H.DECK.find(c=>c.m===3),H.DECK.find(c=>c.m===7)];
 assert.deepEqual(H.matches({m:3},table).map(c=>c.m),[3]);
 assert.deepEqual(H.matches({m:11},table),[]);
});

test('beigoma is decided by the throw, and each top is good at something different',async()=>{
 const B=await import('../src/beigoma.js');
 assert.deepEqual(B.TOPS.map(t=>t.id),['omo','nami','karu']);
 assert.deepEqual(B.RIVALS.map(r=>r.id),['first','second','third','fourth','fifth']);
 for(const t of B.TOPS)assert.ok(t.ja&&t.romaji&&t.en&&t.how&&t.mass>0&&t.r>0);
 for(let i=1;i<B.RIVALS.length;i++)
  assert.ok(B.RIVALS[i].skill>=B.RIVALS[i-1].skill&&B.RIVALS[i].pays>B.RIVALS[i-1].pays,
   'the ladder must get harder and pay more');
 // The trade every child works out with a file: weight decides who survives being hit, and the
 // filed edge decides who does the hitting. Neither top may be better at both.
 const heavy=B.topById('omo'),light=B.topById('karu');
 assert.ok(heavy.mass>light.mass&&heavy.decay<light.decay,'heavy must outlast');
 assert.ok(light.push>heavy.push&&light.speed>heavy.speed,'and light must hit and move');
 const play=(mine,ri,angle,power,seed)=>{
  const rand=B.rng(seed);
  let bout=B.newBout({mine,theirs:B.rivalAt(ri),angle,power,rand});
  let guard=0;
  while(!bout.over&&guard++<5000)bout=B.beigomaTick(bout,rand);
  return bout;
 };
 const rate=(mine,ri,power,n=40)=>{
  let won=0;
  for(let s=1;s<=n;s++)if(play(mine,ri,(s%13)/13*Math.PI*2,power,s*7919).over.won)won++;
  return won/n;
 };
 // Every bout ends, and it ends one of the ways it is allowed to.
 const ways=new Set();
 for(const mine of B.TOPS.map(t=>t.id))for(let ri=0;ri<B.RIVALS.length;ri++)
  for(let s=1;s<=6;s++){
   const bout=play(mine,ri,(s%7)/7*Math.PI*2,0.8,s*31);
   assert.ok(bout.over,`${mine} v ${ri} never finished`);
   ways.add(bout.over.how);
  }
 for(const how of ways)assert.ok(['knocked','stopped','knockedOut','ranDown','timeout'].includes(how),how);
 // Both ways of winning have to be live, or it is a game about one number.
 assert.ok(ways.has('knocked')||ways.has('knockedOut'),'knocking one out must happen');
 assert.ok(ways.has('stopped')||ways.has('ranDown'),'and running one down must happen');
 // The throw is the whole skill, so it has to be worth far more than anything else.
 for(const mine of B.TOPS.map(t=>t.id))
  assert.ok(rate(mine,1,1)>rate(mine,1,0.4)+0.3,
   `${mine}: a good throw must be worth much more than a poor one`);
 // The ladder really is a ladder, measured rather than asserted.
 assert.ok(rate('omo',0,1)>rate('omo',4,1)+0.2,'the champion must be harder than the little one');
 // And each top has somewhere it is the right choice. The plain one walls against the filed
 // rivals, which is the honest answer: you have to file yours to beat the boys who filed theirs.
 assert.ok(rate('karu',0,1)>0.5,'light must beat the little one');
 assert.ok(rate('omo',4,1)>rate('nami',4,1),'heavy must do better against the champion than plain');
 assert.ok(rate('karu',4,1)>0,'and light must keep a puncher’s chance');
 // Nothing escapes the ring while it is still in play, and a finished bout stays finished.
 const done=play('omo',0,0.7,1,99);
 assert.equal(B.beigomaTick(done,B.rng(1)),done,'a finished bout does not carry on');
 assert.ok(B.beigomaWorth(B.rivalAt(4),50)>B.beigomaWorth(B.rivalAt(0),50),'a better rival pays more');
 assert.ok(B.beigomaWorth(B.rivalAt(2),80)>B.beigomaWorth(B.rivalAt(2),0),'and so does finishing with spin left');
 assert.ok(B.beigomaWorth(B.rivalAt(4),9999)<=9999);
});

test('kendama wants the pull and the catch both right, and gets harder in the order it is learned',async()=>{
 const K=await import('../src/kendama.js');
 // The tricks are in the order they are really learned, and each one is tighter than the last
 // in both things at once — a narrower pull to find and a shorter moment to find it in.
 assert.deepEqual(K.TRICKS.map(t=>t.id),
  ['ozara','kozara','chuzara','rosoku','tomeken','hikoki','furiken']);
 // Each trick names a cup and has to put the ball in it. The first drawing landed everything
 // in the middle of the crosspiece, which is not where any of them go.
 const CUPS={ozara:[21,54],kozara:[80,54],chuzara:[50,90],rosoku:[50,90],
  tomeken:[50,38],hikoki:[50,38],furiken:[50,38]};
 for(const t of K.TRICKS){
  assert.deepEqual(t.land,CUPS[t.id],`${t.id} must land in the cup it is named after`);
  assert.ok(t.ja&&t.romaji&&t.en&&t.how,`${t.id} is missing a name`);
  assert.ok(t.band[0]<t.band[1]&&t.band[0]>=0&&t.band[1]<=1,`${t.id} has an impossible band`);
  assert.ok(t.window>0&&t.worth>0);
 }
 for(let i=1;i<K.TRICKS.length;i++){
  assert.ok(K.TRICKS[i].window<K.TRICKS[i-1].window,`${K.TRICKS[i].id} must want a shorter moment`);
  assert.ok(K.TRICKS[i].worth>K.TRICKS[i-1].worth,`${K.TRICKS[i].id} must be worth more`);
  const wide=b=>b[1]-b[0];
  assert.ok(wide(K.TRICKS[i].band)<=wide(K.TRICKS[i-1].band),`${K.TRICKS[i].id} must want a narrower pull`);
 }
 // A harder pull is a longer wait, which is what ties the two halves together.
 assert.ok(K.airtime(0.9)>K.airtime(0.2));
 assert.equal(K.airtime(0),K.PULL_BASE);
 // Both have to be right. Each way of getting it wrong is named, because a child who is told
 // only that he missed learns nothing about which half he got wrong.
 const spike=K.trickById('tomeken');
 const ideal=K.airtime(0.5);
 assert.equal(K.judge(spike,0.5,ideal).landed,true);
 assert.equal(K.judge(spike,0.05,ideal).why,'soft');
 assert.equal(K.judge(spike,0.99,ideal).why,'hard');
 assert.equal(K.judge(spike,0.5,ideal-spike.window-1).why,'early');
 assert.equal(K.judge(spike,0.5,ideal+spike.window+1).why,'late');
 // The edges of the window are inside it, not outside.
 assert.equal(K.judge(spike,0.5,ideal-spike.window).landed,true);
 assert.equal(K.judge(spike,0.5,ideal+spike.window).landed,true);
 // A perfect pull on an easy trick is still a catch on a hard one's clock, so the pull band is
 // genuinely the thing separating them rather than the timing doing all the work.
 const easy=K.trickById('ozara');
 assert.equal(K.judge(easy,0.2,K.airtime(0.2)).landed,true);
 assert.equal(K.judge(K.trickById('furiken'),0.2,K.airtime(0.2)).why,'soft');
 // Moshikame closes its window as the run goes on, and never past its floor.
 assert.ok(K.moshikameWindow(0)>K.moshikameWindow(10));
 assert.equal(K.moshikameWindow(9999),K.MOSHIKAME.floor);
 assert.ok(K.MOSHIKAME.floor>0&&K.MOSHIKAME.floor<K.MOSHIKAME.window);
 // And it really does alternate between two different cups, which is the whole trick.
 assert.notDeepEqual(K.MOSHIKAME.land,K.MOSHIKAME.alt);
 assert.deepEqual(K.MOSHIKAME.land,K.trickById('ozara').land,'moshikame starts on the big cup');
 assert.deepEqual(K.MOSHIKAME.alt,K.trickById('chuzara').land,'and alternates with the base cup');
 // The ball hangs below the handle before anybody pulls it.
 assert.ok(K.HANG[1]>Math.max(...K.TRICKS.map(t=>t.land[1])),'it must hang below every cup');
 // Scoring: going up the list beats doing the easy one over and over.
 assert.equal(K.kendamaScore([]),0);
 assert.ok(K.kendamaScore(['ozara','kozara','chuzara'])>K.kendamaScore(['ozara']));
 assert.ok(K.kendamaScore(['furiken'])>K.kendamaScore(['ozara','kozara','chuzara']),
  'the hardest trick alone must beat the three easiest');
 assert.ok(K.kendamaScore(K.TRICKS.map(t=>t.id))<=9999);
 assert.equal(K.moshikameScore(0),0);
 assert.ok(K.moshikameScore(20)>K.moshikameScore(5));
 assert.ok(K.moshikameScore(99999)<=9999);
});

test('gomoku knows a five when it sees one, and the harder opponent really is harder',async()=>{
 const G=await import('../src/gomoku.js');
 const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
 // Nine was measured and thrown out: two engines that both block well drew most games on it.
 assert.deepEqual(G.SIZES,[11,13]);
 const size=11,at=(r,c)=>G.idx(size,r,c);
 // Five in a row wins, in every direction, and four does not.
 for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
  let board=G.newBoard(size);
  const from=[5,5];
  for(let k=0;k<4;k++)board=G.place(board,at(from[0]+dr*k,from[1]+dc*k),G.BLACK);
  const fourth=at(from[0]+dr*3,from[1]+dc*3);
  assert.equal(G.winsAt(board,size,fourth,G.BLACK),false,'four is not five');
  const fifth=at(from[0]+dr*4,from[1]+dc*4);
  board=G.place(board,fifth,G.BLACK);
  assert.equal(G.winsAt(board,size,fifth,G.BLACK),true,`five must win going ${dr},${dc}`);
  assert.equal(G.winsAt(board,size,fifth,G.WHITE),false,'and it must be your five, not his');
 }
 // An open three is worth more than a blocked four, which is the one judgement the whole
 // evaluation rests on.
 assert.ok(G.shapeValue({count:3,open:2})>G.shapeValue({count:4,open:1}));
 assert.ok(G.shapeValue({count:4,open:2})>G.shapeValue({count:3,open:2}));
 assert.equal(G.shapeValue({count:4,open:0}),0,'a line shut at both ends is worth nothing');
 assert.equal(G.shapeValue({count:5,open:0}),G.SHAPE[5],'except when it is already five');
 // Only squares near a stone are considered, and on an empty board that is the middle.
 assert.deepEqual(G.candidates(G.newBoard(size),size),[at(5,5)]);
 assert.ok(G.candidates(G.place(G.newBoard(size),at(5,5),G.BLACK),size).length<=24);
 // He takes a win when it is there, and blocks yours when it is not.
 let board=G.newBoard(size);
 for(let k=0;k<4;k++)board=G.place(board,at(2,2+k),G.WHITE);
 assert.ok([at(2,1),at(2,6)].includes(G.aiMove(board,size,G.WHITE,'child',rng(1))),'he must finish his own five');
 board=G.newBoard(size);
 for(let k=0;k<4;k++)board=G.place(board,at(2,2+k),G.BLACK);
 assert.ok([at(2,1),at(2,6)].includes(G.aiMove(board,size,G.WHITE,'child',rng(1))),'and block yours');
 // Taking the win comes before blocking, when both are on offer.
 board=G.newBoard(size);
 for(let k=0;k<4;k++){board=G.place(board,at(2,2+k),G.BLACK);board=G.place(board,at(6,2+k),G.WHITE);}
 assert.ok([at(6,1),at(6,6)].includes(G.aiMove(board,size,G.WHITE,'master',rng(1))),'winning beats blocking');
 // He never plays on top of a stone or off the board, at any level.
 for(const level of G.LEVELS){
  let live=G.newBoard(13),side=G.BLACK;
  for(let i=0;i<40;i++){
   const move=G.aiMove(live,13,side,level.id,rng(i+3));
   assert.ok(Number.isInteger(move)&&move>=0&&move<169,`${level.id} played off the board`);
   assert.equal(live[move],G.EMPTY,`${level.id} played on top of a stone`);
   live=G.place(live,move,side);
   if(G.winsAt(live,13,move,side))break;
   side=G.other(side);
  }
 }
 // And the levels really are a ladder. They differ only in how often they MISS something — a
 // search and a threat ladder were both written here first and both made him play worse, and
 // varying the block weight by level put the ladder out of order on the bigger board. So this
 // is the only thing making them levels, and it is measured rather than asserted. Both colours
 // are played in every pairing, because going first in gomoku is a real advantage.
 const play=(a,b,seed)=>{
  const rand=rng(seed);let live=G.newBoard(11),side=G.BLACK,stones=0;
  while(stones<121){
   const move=G.aiMove(live,11,side,side===G.BLACK?a:b,rand);
   live=G.place(live,move,side);stones++;
   if(G.winsAt(live,11,move,side))return side;
   side=G.other(side);
  }
  return null;
 };
 const duel=(a,b,n=18)=>{
  let aWins=0,bWins=0;
  for(let s=1;s<=n;s++)for(const [x,y] of [[a,b],[b,a]]){
   const won=play(x,y,s*104729);
   if(won===G.BLACK){x===a?aWins++:bWins++;}else if(won){y===a?aWins++:bWins++;}
  }
  return [aWins,bWins];
 };
 const [masterOverChild,childOverMaster]=duel('master','child');
 assert.ok(masterOverChild>=childOverMaster*2,
  `master ${masterOverChild} child ${childOverMaster}: the hard one must be clearly harder`);
 const [grownOverChild,childOverGrown]=duel('grown','child');
 assert.ok(grownOverChild>childOverGrown,`grown ${grownOverChild} child ${childOverGrown}`);
 const [masterOverGrown,grownOverMaster]=duel('master','grown');
 assert.ok(masterOverGrown>grownOverMaster,`master ${masterOverGrown} grown ${grownOverMaster}`);
 // Missing a four is the lever, so the easy one has to actually do it and the hard one must not.
 assert.equal(G.levelById('master').misses,0);
 assert.ok(G.levelById('child').misses>G.levelById('grown').misses);
 // And the block weight belongs to the engine, not the level, for the reason above.
 for(const level of G.LEVELS)assert.equal(level.block,undefined,`${level.id} must not carry its own block weight`);
 // A win pays by who you beat and how few stones it took.
 assert.ok(G.gomokuWorth('master',20)>G.gomokuWorth('child',20));
 assert.ok(G.gomokuWorth('grown',12)>G.gomokuWorth('grown',50),'a short win is worth more');
 assert.ok(G.gomokuWorth('child',999)>=G.levelById('child').pays,'but a long one still pays');
 assert.ok(G.gomokuWorth('master',0)<=9999);
});

test('no picross puzzle can reach a child unless it can be worked out without guessing',async()=>{
 const P=await import('../src/picross.js');
 assert.deepEqual(P.cluesOf([1,1,0,1,1]),[2,2]);
 assert.deepEqual(P.cluesOf([0,0,0]),[0],'an empty line is a nought, not nothing');
 assert.deepEqual(P.cluesOf([1,1,1]),[3]);
 assert.deepEqual(P.arrangements([2],4).map(a=>a.join('')),['1100','0110','0011']);
 assert.deepEqual(P.arrangements([0],3).map(a=>a.join('')),['000']);
 assert.deepEqual(P.arrangements([1,1],3).map(a=>a.join('')),['101'],'runs need a gap between them');
 // The solver only ever deduces and never guesses, which is what makes it a gate rather than
 // a hint: a two-by-two checkerboard has two solutions and it must refuse it.
 assert.equal(P.solvable({art:['#.','.#']}),false,'an ambiguous picture is not solvable');
 assert.equal(P.solvable({art:['..#..','..#..','#####','..#..','..#..']}),true);
 // And this is the rule the whole game rests on. Every picture in the list, every time.
 const guessy=P.PICTURES.filter(p=>!P.solvable(p)).map(p=>p.id);
 assert.deepEqual(guessy,[],'these need guessing and must not ship');
 assert.ok(P.PICTURES.length>=12,'there must be enough puzzles to be worth opening');
 assert.equal(new Set(P.PICTURES.map(p=>p.id)).size,P.PICTURES.length);
 for(const picture of P.PICTURES){
  const n=picture.art.length;
  assert.ok(P.SIZES.includes(n),`${picture.id} is ${n} squares, which is not a size we offer`);
  for(const row of picture.art){
   assert.equal(row.length,n,`${picture.id} is not square`);
   assert.match(row,/^[#.]+$/,`${picture.id} has something other than a square in it`);
  }
  assert.ok(picture.en&&picture.ja,`${picture.id} must have a name in both languages`);
  // A picture nobody could recognise is not worth solving, and an almost-empty grid is not a
  // puzzle either.
  const filled=P.gridOf(picture).flat().filter(Boolean).length;
  assert.ok(filled>=n*n*0.2&&filled<=n*n*0.85,`${picture.id} fills ${filled} of ${n*n}`);
 }
 for(const size of P.SIZES)assert.ok(P.picturesOf(size).length>=4,`only ${P.picturesOf(size).length} at ${size} square`);
 // The clues really do describe the picture, which is the one thing a wrong solver would hide.
 for(const picture of P.PICTURES){
  const q=P.puzzleFor(picture);
  const found=P.solve(q.rows,q.cols);
  assert.deepEqual(found,q.grid,`${picture.id} does not solve back to its own picture`);
  assert.equal(q.rows.length,q.size);
  assert.equal(q.cols.length,q.size);
 }
 // Working it out beats guessing at it, and a bigger picture is worth more than a small one.
 assert.ok(P.picrossScore(10,60,0)>P.picrossScore(10,60,5),'guessing must cost something');
 assert.ok(P.picrossScore(10,60,0)>P.picrossScore(5,60,0),'a bigger picture is worth more');
 assert.ok(P.picrossScore(5,30,0)>P.picrossScore(5,200,0),'and quicker is worth more');
 assert.ok(P.picrossScore(5,9999,999)>=5,'but a slow messy solve still counts as a solve');
 assert.ok(P.picrossScore(10,0,0)<=9999);
});

test('the paper always goes, and going carefully beats going greedily on every grade',async()=>{
 const K=await import('../src/kingyo.js');
 assert.deepEqual(K.LEVELS.map(l=>l.id),['yon','go','roku']);
 // Thinner paper is a shorter game and a better-paid one, which is the trade at a real stall.
 for(let i=1;i<K.LEVELS.length;i++){
  assert.ok(K.LEVELS[i].paper<K.LEVELS[i-1].paper,'the grades must get thinner');
  assert.ok(K.LEVELS[i].pays>K.LEVELS[i-1].pays,'and pay more for it');
 }
 // Drawn rather than emoji, so each one has to carry its own colours — and the black moor has
 // to actually be dark, which is the reason they stopped being emoji in the first place.
 for(const f of K.FISH)assert.ok(f.en&&f.ja&&f.romaji&&f.worth>0&&f.body&&f.fin&&f.belly&&f.girth,`${f.id} is incomplete`);
 const dark=hex=>parseInt(hex.slice(1,3),16)+parseInt(hex.slice(3,5),16)+parseInt(hex.slice(5,7),16);
 assert.ok(dark(K.fishById('demekin').body)<200,'a black moor has to be black');
 assert.ok(K.fishById('demekin').eye>K.fishById('wakin').eye,'and demekin means the one with the eyes sticking out');
 // The slow ones are worth more, which is true of the stall: everybody goes for the black one.
 const sorted=[...K.FISH].sort((a,b)=>a.speed-b.speed);
 assert.deepEqual(sorted.map(f=>f.worth),[...sorted.map(f=>f.worth)].sort((a,b)=>b-a));
 assert.ok(Math.abs(K.FISH.reduce((s,f)=>s+f.share,0)-1)<0.001,'the fish must add up to a tankful');
 const tank=K.newTank('go',K.rng(4));
 assert.equal(tank.fish.length,K.levelById('go').fish);
 assert.equal(tank.paper,K.levelById('go').paper);
 assert.equal(tank.over,null);
 // Nothing at all happens while the finger is off the tank except the fish swimming about.
 const idle=K.kingyoTick(tank,{x:50,y:50,down:false,rand:K.rng(9)});
 assert.equal(idle.paper,tank.paper,'paper out of the water does not soak');
 assert.equal(idle.bowl.length,0);
 assert.notDeepEqual(idle.fish.map(f=>[f.x,f.y]),tank.fish.map(f=>[f.x,f.y]),'but the fish move');
 // Under water it soaks, and dragging it about tears it faster than holding it still.
 const still=K.kingyoTick(tank,{x:50,y:50,down:true,rand:K.rng(9)});
 const dragged=K.kingyoTick({...tank,poi:{x:10,y:10,down:true}},{x:80,y:80,down:true,rand:K.rng(9)});
 assert.ok(still.paper<tank.paper,'soaking costs something');
 assert.ok(dragged.paper<still.paper,'and dragging costs more');
 // Greed is the real rule: two fish at once is far worse than twice one fish.
 const under=(n)=>({...K.newTank('yon',K.rng(1)),paper:1,poi:{x:50,y:50,down:true},
  fish:[...Array(n)].map((_,i)=>({key:`x${i}`,kind:'wakin',x:50+i*0.4,y:50,dir:0,speed:0}))});
 const one=K.kingyoTick(under(1),{x:50,y:50,down:false,rand:K.rng(2)});
 const two=K.kingyoTick(under(2),{x:50,y:50,down:false,rand:K.rng(2)});
 assert.equal(one.bowl.length,1);
 assert.equal(two.bowl.length,2);
 assert.ok(1-two.paper>(1-one.paper)*2,'two at once must cost more than twice one');
 // The paper always goes in the end. Hold it under long enough and it is gone, and once it is
 // gone nothing else happens, however hard anybody presses.
 let soaking=K.newTank('roku',K.rng(3));
 for(let i=0;i<4000&&!soaking.over;i++)soaking=K.kingyoTick(soaking,{x:50,y:50,down:true,rand:K.rng(i+1)});
 assert.deepEqual(soaking.over,{won:false,how:'torn'});
 assert.equal(K.kingyoTick(soaking,{x:50,y:50,down:true,rand:K.rng(1)}),soaking,'a torn scoop is finished');
 // And the whole point: the technique pays. Played headlessly, a careful hand beats a greedy
 // one and a hurried one on every grade of paper.
 const play=(id,seed,style)=>{
  const rand=K.rng(seed);let t=K.newTank(id,rand),ticks=0;
  while(!t.over&&ticks++<4000){
   if(!t.fish.length)break;
   const near=t.fish.reduce((a,b)=>Math.hypot(b.x-t.poi.x,b.y-t.poi.y)<Math.hypot(a.x-t.poi.x,a.y-t.poi.y)?b:a);
   const d=Math.hypot(near.x-t.poi.x,near.y-t.poi.y)||1;
   const step=style==='fast'?4:1.6;
   const nx=t.poi.x+(near.x-t.poi.x)/d*Math.min(step,d),ny=t.poi.y+(near.y-t.poi.y)/d*Math.min(step,d);
   const on=t.fish.filter(f=>Math.hypot(f.x-nx,f.y-ny)<=K.POI_R).length;
   const lift=style==='greedy'?on>=2:on>=1;
   t=K.kingyoTick(t,{x:nx,y:ny,down:!lift,rand});
   if(lift)t=K.kingyoTick(t,{x:nx,y:ny,down:false,rand});
  }
  return t;
 };
 const average=(id,style)=>{let n=0;for(let s=1;s<=12;s++)n+=play(id,s*7919,style).bowl.length;return n/12;};
 for(const level of K.LEVELS){
  const careful=average(level.id,'careful');
  assert.ok(careful>average(level.id,'greedy'),`${level.id}: waiting for two fish must not pay`);
  assert.ok(careful>average(level.id,'fast'),`${level.id}: dragging it about must not pay`);
  assert.ok(careful>=2.5,`${level.id}: a careful hand only gets ${careful.toFixed(1)} fish`);
 }
 assert.ok(average('yon','careful')>average('roku','careful'),'thick paper must catch more fish');
 // Scoring: a rare fish is worth more than a common one, and an empty bowl scores nothing.
 assert.equal(K.bowlWorth([]),0);
 assert.ok(K.bowlWorth(['ranchu'])>K.bowlWorth(['wakin']));
 assert.equal(K.kingyoScore('go',[],0),0,'no fish is no score');
 assert.ok(K.kingyoScore('roku',['wakin'],0)>K.kingyoScore('yon',['wakin'],0),'thinner paper pays more');
 assert.ok(K.kingyoScore('roku',[...Array(40)].map(()=>'ranchu'),1)<=9999);
});

test('shiritori takes the last sound of a word, and a word ending in n loses',async()=>{
 const S=await import('../src/shiritori-data.js');
 // The rules are about sound, not spelling, and that is where every edge case lives.
 assert.equal(S.tailOf('カレー'),'れ','the long mark is a held vowel, not a letter');
 assert.equal(S.headOf('カレー'),'か','and katakana is the same sound as hiragana');
 assert.equal(S.tailOf('じんじゃ'),'や','a small kana counts as its big one');
 assert.equal(S.tailOf('しっぽ'),'ほ','and so does a dakuten');
 assert.equal(S.headOf('ぞう'),'そ','which is how children play it: か and が are one letter');
 assert.equal(S.tailOf('ラーメン'),'ん');
 assert.ok(S.losesOn('ラーメン')&&S.losesOn('ほん')&&!S.losesOn('すし'));
 assert.ok(S.follows(S.wordById('りんご'),S.OPENER),'the chain opens on the word shiritori itself');
 assert.equal(S.OPENER.tail,'り');
 // Every word is a real entry, and none of them is a dead end: a word whose last sound
 // nothing else starts with strangles the game on the turn it is played. This was measured
 // and it was true of thirteen words before the list was fixed.
 for(const w of S.WORDS)assert.ok(w.ja&&w.romaji&&w.en&&w.icon&&w.head&&w.tail,`${w.ja} is incomplete`);
 assert.equal(new Set(S.WORDS.map(w=>w.id)).size,S.WORDS.length,'no word appears twice');
 const stuck=S.WORDS.filter(w=>!w.dead&&S.startingWith(w.tail).filter(x=>x.id!==w.id).length===0);
 assert.deepEqual(stuck.map(w=>w.ja),[],'every word must have somewhere to go');
 assert.ok(S.WORDS.filter(w=>w.dead).length>=8,'there must be enough traps to be worth avoiding');
 // What is on offer always contains something playable, and only the harder level lays traps.
 const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
 for(const level of S.LEVELS){
  for(let s=1;s<=40;s++){
   const opts=S.optionsFor({used:[S.OPENER.id],letter:S.OPENER.tail,level:level.id,rand:rng(s*31)});
   assert.equal(opts.length,level.choices,`${level.id} must offer ${level.choices}`);
   assert.ok(opts.some(o=>o.head===S.OPENER.tail),`${level.id} must always offer a real answer`);
   assert.equal(new Set(opts.map(o=>o.id)).size,opts.length,'and never the same word twice');
   if(!level.traps)assert.ok(!opts.some(o=>o.head===S.OPENER.tail&&o.dead),
    'nothing a five-year-old can legally pick may lose the game for him');
  }
 }
 // And that holds everywhere, not just on the opening letter. Sweep every letter, with the
 // pool worn down to the point where the only word that fits is a trap — which is exactly the
 // position a real game walks into, and where this first got it wrong.
 for(const letter of new Set(S.WORDS.map(w=>w.head))){
  const here=S.WORDS.filter(w=>w.head===letter);
  const used=here.filter(w=>!w.dead).map(w=>w.id);
  const left=S.optionsFor({used,letter,level:'pictures',rand:rng(5)});
  assert.ok(!left.some(o=>o.head===letter&&o.dead),
   `on ${letter} with the safe words gone, pictures offered a losing card`);
  if(here.some(w=>w.dead))assert.ok(S.optionsFor({used,letter,level:'words',rand:rng(5)}).length,
   `on ${letter} the harder level should still offer the trap`);
 }
 // He plays to win, so he never walks into the trap himself; when he has nothing he says so.
 for(let s=1;s<=60;s++){
  const his=S.phoneReply({used:[S.OPENER.id],letter:S.OPENER.tail,rand:rng(s*17)});
  assert.ok(his&&!his.dead&&his.head===S.OPENER.tail);
 }
 assert.equal(S.phoneReply({used:S.WORDS.map(w=>w.id),letter:'り',rand:rng(1)}),null,'and running out is how you beat him');
 // A whole game, played out with no screen. The chain has to be long enough to be a game:
 // before the list was fixed this averaged four words and every run died on the same letter.
 const play=seed=>{
  const rand=rng(seed);
  let used=[S.OPENER.id],letter=S.OPENER.tail,chain=1;
  for(let turn=0;turn<300;turn++){
   const good=S.optionsFor({used,letter,level:'words',rand}).filter(o=>o.head===letter&&!o.dead);
   if(!good.length)break;
   used.push(good[0].id);chain++;letter=good[0].tail;
   const his=S.phoneReply({used,letter,rand});
   if(!his)break;
   used.push(his.id);chain++;letter=his.tail;
  }
  return chain;
 };
 const runs=[...Array(40)].map((_,i)=>play((i+1)*7919));
 const average=runs.reduce((a,b)=>a+b,0)/runs.length;
 assert.ok(average>15,`a game averages ${average.toFixed(1)} words, which is too short to be one`);
 assert.ok(Math.min(...runs)>=8,`the worst game is ${Math.min(...runs)} words`);
 assert.ok(S.shiritoriScore('words',20)>S.shiritoriScore('pictures',20),'the harder level pays more');
 assert.ok(S.shiritoriScore('words',400)<=9999);
});

test('every page and every game can be heard rather than read, in words a five-year-old follows',async()=>{
 const {GAME_RULES,PAGE_RULES,gameRule,pageRule}=await import('../src/spoken-rules.js');
 const {PAGES}=await import('../src/nav-data.js');
 const games=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 const ids=[...games.matchAll(/\{id:'([a-z]+)',title:'([^']+)',[^\n]*?needs:/g)].map(([,id,title])=>({id,title}));
 // The one he presses is always the one nobody remembered to write, so nothing is allowed to
 // ship without it — every page in the registry and every game in the picker, and no strays.
 assert.deepEqual(Object.keys(PAGE_RULES).sort(),Object.keys(PAGES).sort());
 assert.deepEqual(Object.keys(GAME_RULES).sort(),ids.map(g=>g.id).sort());
 const all=[...Object.entries(PAGE_RULES),...Object.entries(GAME_RULES)];
 for(const [id,text] of all){
  // This is spoken, not read. A phone says a dash as nothing and Japanese script in an
  // Australian voice as nothing useful, so neither belongs in a line meant to be heard.
  assert.doesNotMatch(text,/[　-鿿＀-￯]/,`${id} has Japanese script in it`);
  assert.doesNotMatch(text,/[—–()\[\]/*_#]/,`${id} has something unspeakable in it`);
  assert.doesNotMatch(text,/\b(otherwise|therefore|via|per|ensure|approximately)\b/i,`${id} is not five-year-old English`);
  assert.match(text,/\.$/,`${id} must end in a full stop so the voice stops`);
  assert.ok(text.length>60&&text.length<700,`${id} is ${text.length} characters, which is the wrong length to listen to`);
  // Short sentences. Anything much over thirty words is a sentence a five-year-old loses.
  for(const sentence of text.split(/(?<=\.)\s+/))
   assert.ok(sentence.split(/\s+/).length<=34,`${id} has a sentence too long to follow: "${sentence.slice(0,60)}"`);
 }
 // It is the same thing said differently, not the screen read back, so no two are identical.
 assert.equal(new Set(all.map(([,t])=>t)).size,all.length,'two of them say exactly the same thing');
 // Each game's rules name the game, so a child who pressed the wrong button hears that at once.
 for(const {id,title} of ids)
  assert.ok(gameRule(id).toLowerCase().startsWith(title.toLowerCase().split(' ')[0]),
   `${title} must say what it is first`);
 assert.equal(gameRule('nothing-like-this'),'');
 assert.equal(pageRule('nothing-like-this'),'');
 // And the button is actually on the screen: one per page, one per game. The page one lives in
 // the top bar beside the updates bell rather than in a band of its own, so it is in the same
 // place on every page — the person who needs it cannot read the screen to find it again.
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const topbar=main.match(/<div className="top-actions">[\s\S]*?<\/header>/)?.[0]||'';
 assert.match(topbar,/<SpeakRules id=\{`page-\$\{tab\}`\} text=\{pageRule\(tab\)\} label="What is this page\?" compact\/>/,
  'the page speaker is in the top bar');
 assert.ok(topbar.indexOf('notification-button')<topbar.indexOf('<SpeakRules'),'it sits beside the updates bell');
 assert.doesNotMatch(main,/<main>\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<SpeakRules/,'and no longer takes a section of its own');
 assert.match(games,/<SpeakRules id=\{`rules-\$\{current\.id\}`\} text=\{gameRule\(current\.id\)\}/);
 const pages=await readFile(new URL('../src/AdventurePages.jsx',import.meta.url),'utf8');
 // Read at a slower pace than the app reads anything else, and in English rather than the
 // page's own language, because these are instructions and they have to land the first time.
 assert.match(pages,/read\(id,text,'en-AU',0\.8\)/);
 assert.match(pages,/if\(!supported\|\|!text\)return null;/,'a phone with no voice is offered nothing');
});

test('the games are offered easiest first, and can be narrowed to the Japanese ones',async()=>{
 const games=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 const rows=[...games.matchAll(/\{id:'([a-z]+)',title:'([^']+)',ease:(\d),[^\n]*?(origin:'(\w+)')?[^\n]*?needs:/g)]
  .map(([line,id,title,ease])=>({id,title,ease:Number(ease),traditional:/origin:'traditional'/.test(line)}));
 assert.ok(rows.length>=21,'every game is in the picker with a difficulty on it');
 const easeOf=id=>rows.find(r=>r.id===id)?.ease;
 // Three bands, and which game is in which is the whole point of the ordering: band one is
 // what Nate plays without anybody sitting next to him, band three is what an adult has to
 // think about. A picker that opens on sumo is a picker he scrolls past.
 for(const r of rows)assert.ok(r.ease>=1&&r.ease<=3,`${r.title} has no band`);
 for(const id of ['match','sights','fukuwarai','kitchen','draw','daruma','snake','janken'])
  assert.equal(easeOf(id),1,`${id} is one a five-year-old plays on his own`);
 for(const id of ['picross','gomoku','shogi','sumo','hanafuda'])
  assert.equal(easeOf(id),3,`${id} is one of the hard ones`);
 assert.equal(easeOf('beigoma'),1,'one flick and then watching');
 assert.equal(easeOf('kendama'),2,'the pull and the catch both have to be right');
 assert.match(games,/const \[game,setGame\]=useState\('match'\)/,'and it opens on an easy one');
 // Easiest first inside each band, and the bands walked in order rather than sorted by hand.
 assert.match(games,/\.sort\(\(a,b\)=>a\.ease-b\.ease\)/);
 assert.match(games,/const BANDS=\[\n \[1,/);
 assert.match(games,/BANDS\.map\(\(\[level,label,note\]\)=>\{/);
 // "Show me a real Japanese one" is a thing both boys ask, and the marks to answer it were
 // already on every card — this turns them into a way to choose.
 assert.match(games,/\['traditional','Traditional Japanese',g=>g\.origin==='traditional'\]/);
 assert.match(games,/\['rest','Everything else',g=>g\.origin!=='traditional'\]/);
 assert.ok(rows.filter(r=>r.traditional).length>=8,'the traditional filter has something in it');
 assert.ok(rows.filter(r=>!r.traditional).length>=8,'and so does everything else');
 // The filter changes what is on offer, so it changes what you are playing rather than leaving
 // a board up that nothing in the picker points at any more.
 assert.match(games,/if\(!list\.some\(g=>g\.id===game\)\)setGame\(list\[0\]\.id\)/);
});

test('winning is celebrated once, and only where there is something to win',async()=>{
 // Win.jsx is JSX and cannot be imported here, so the rules are checked where they are written.
 const win=await readFile(new URL('../src/Win.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // On the edge, not on the flag: every game holds its finished state while the winning board
 // sits there, so a re-render must not set the confetti off a second time.
 assert.match(win,/if\(was\.current\)return;/);
 assert.match(win,/setTimeout\(\(\)=>setGoing\(false\),WIN_MS\)/);
 assert.match(win,/export const WIN_MS=(\d+);/);
 assert.ok(Number(win.match(/export const WIN_MS=(\d+);/)[1])<=3000,'and it gets out of the way');
 // Said in words as well as in paper, because a burst nobody can see is not an announcement.
 assert.match(win,/role="status"/);
 assert.match(win,/className="win-paper" aria-hidden="true"/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.win-paper\{display:none\}/,
  'a phone that asked for less movement gets the words and none of the paper');
 assert.match(css,/pointer-events:none/,'and it never swallows the tap for the next round');
 // Every game with a win says so.
 for(const file of ['Karuta','AnimalShogi','Fukuwarai','Daruma','Shiritori','Picross','Gomoku','SpotDifference','Origami','Kendama','Beigoma','Hanafuda']){
  const source=await readFile(new URL(`../src/${file}.jsx`,import.meta.url),'utf8');
  assert.match(source,/<WinBurst on=\{/,`${file} never celebrates`);
 }
 const games=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 assert.ok((games.match(/<WinBurst on=\{/g)||[]).length>=8,'the games on the page itself celebrate too');
 // And the ones you cannot win do not pretend you did. The goldfish stall ends when the paper
 // tears, which it always does, and a fanfare for that teaches the wrong thing.
 const kingyo=await readFile(new URL('../src/Kingyo.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(kingyo,/WinBurst/);
});

test('every game is written out in full, in words that need no Japanese',async()=>{
 const {GAME_GUIDES,gameGuide}=await import('../src/game-guide.js');
 const games=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 const ids=[...games.matchAll(/\{id:'([a-z]+)',title:'([^']+)',[^\n]*?needs:/g)].map(([,id,title])=>({id,title}));
 // The written rules are the ones a parent reads out when somebody says "but can he take it
 // back?", so a game without them is a game nobody can settle an argument about.
 assert.deepEqual(Object.keys(GAME_GUIDES).sort(),ids.map(g=>g.id).sort());
 for(const {id,title} of ids){
  const guide=gameGuide(id);
  // Four parts, always: what you are trying to do, what to set up, how it goes, how it ends.
  assert.ok(guide.objective&&guide.win,`${title} is missing what it is for or how it ends`);
  assert.ok(Array.isArray(guide.setup)&&guide.setup.length,`${title} does not say how to set it up`);
  assert.ok(Array.isArray(guide.rules)&&guide.rules.length>=3,`${title} has too few rules to play by`);
  for(const line of [guide.objective,guide.win,...guide.setup,...guide.rules]){
   // No kana and no kanji anywhere. The boy reading this cannot read them, and neither can a
   // grandparent — anything Japanese worth knowing is spelt the way it sounds, with what it
   // means straight after it.
   assert.doesNotMatch(line,/[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/,`${title} makes you read Japanese: "${line.slice(0,50)}"`);
   assert.match(line,/[.!?]$/,`${title} has a line that does not finish: "${line.slice(0,50)}"`);
   // Short sentences, because these are read out to a five-year-old.
   for(const sentence of line.split(/(?<=[.!?])\s+/))
    assert.ok(sentence.split(/\s+/).length<=36,`${title} has a sentence too long to follow: "${sentence.slice(0,60)}"`);
  }
 }
 assert.equal(gameGuide('nothing-like-this'),null);
 // And it is on the screen, under the game's own name, with all four headings on it.
 assert.match(games,/<GameGuide game=\{current\}\/>/,'the guide is rendered on the games page');
 for(const heading of ['What you are trying to do','Set up','The rules','How to win'])
  assert.ok(games.includes(`<h3>${heading}</h3>`),`the guide is missing its "${heading}" heading`);
 // The speaker button still comes first: the person who cannot read the guide needs the
 // spoken one before anything else on the page.
 assert.ok(games.indexOf('<SpeakRules')<games.indexOf('<GameGuide'),'the guide is above the speaker button');
});

test('a game whose choices are named in Japanese says what they are in English too',async()=>{
 // The bug this replaces: the goldfish stall offered a choice of four-go, five-go and six-go
 // paper, written in kanji and nothing else, so a player who cannot read it picked a
 // difficulty by guessing. Every picker like it now carries the English underneath.
 for(const [file,data,field] of [
  ['Kingyo','kingyo.js','LEVELS'],
  ['Daruma','daruma.js','LEVELS'],
  ['Gomoku','gomoku.js','LEVELS'],
  ['Karuta','karuta-data.js','KARUTA_DECKS'],
  ['Fukuwarai','fukuwarai-data.js','FACES'],
  ['Beigoma','beigoma.js','TOPS']
 ]){
  const source=await readFile(new URL(`../src/${file}.jsx`,import.meta.url),'utf8');
  const list=(await import(`../src/${data}`))[field];
  for(const item of list)assert.ok(item.en,`${field} ${item.id} has no English name`);
  assert.match(source,/<b lang="ja">\{[a-z]\.ja\}<\/b><small>/,`${file} names its choices in Japanese alone`);
 }
 const games=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 assert.match(games,/<b lang="ja">ひらがな<\/b><small>Hiragana/,'even the two alphabets say which is which');
});

test('fukuwarai hands the pieces over one at a time, and marks how far each one landed from home',async()=>{
 const {FACES,faceById,PARTS,TARGETS,targetFor,partPoints,fukuwaraiScore,verdictOf,PART_PAR,PART_REACH,PERFECT}=await import('../src/fukuwarai-data.js');
 // The two faces it is always played with, and six pieces handed over in a fixed order,
 // because there is no going back in this game and a child needs to know what is coming.
 assert.deepEqual(FACES.map(f=>f.id),['otafuku','hyottoko']);
 assert.deepEqual(PARTS.map(p=>p.id),['brow-l','brow-r','eye-l','eye-r','nose','mouth']);
 for(const p of PARTS)assert.ok(p.en&&p.ja&&p.romaji,`${p.id} is missing a name`);
 for(const face of FACES)for(const part of PARTS){
  const [x,y]=targetFor(face.id,part.id);
  assert.ok(x>10&&x<90&&y>10&&y<90,`${face.id} keeps its ${part.id} off the picture`);
 }
 // The face's left is on the right of the screen, the same way round as on a real person.
 assert.ok(targetFor('otafuku','eye-l')[0]>targetFor('otafuku','eye-r')[0]);
 // And his mouth is off to one side on purpose: putting it in the middle is the mistake.
 assert.equal(TARGETS.otafuku.mouth[0],50);
 assert.ok(TARGETS.hyottoko.mouth[0]<50,'a hyottoko is blowing sideways');
 // On the spot is full marks, a third of a face away is nothing, and nothing goes negative.
 assert.equal(partPoints([50,50],[50,50]).points,PART_PAR);
 assert.equal(partPoints([50,50],[50,50+PART_REACH]).points,0);
 assert.equal(partPoints([0,0],[99,99]).points,0,'a piece on the floor still scores nothing rather than minus');
 assert.ok(partPoints([50,50],[50,56]).points<PART_PAR);
 const spot=Object.fromEntries(PARTS.map(p=>[p.id,targetFor('otafuku',p.id)]));
 assert.equal(fukuwaraiScore('otafuku',spot).total,PERFECT);
 // A piece never placed is not a piece worth points, and it does not crash the marking either.
 const half=fukuwaraiScore('otafuku',{'brow-l':spot['brow-l']});
 assert.equal(half.total,PART_PAR);
 assert.equal(half.parts.find(p=>p.id==='mouth').away,null);
 // The perfect face is scored against the face being played, not against the other one.
 const hisSpots=Object.fromEntries(PARTS.map(p=>[p.id,targetFor('hyottoko',p.id)]));
 assert.equal(fukuwaraiScore('hyottoko',hisSpots).total,PERFECT);
 assert.ok(fukuwaraiScore('otafuku',hisSpots).total<PERFECT);
 // And the verdict is kind at the bottom, because a face that has gone wrong is the good bit.
 assert.notEqual(verdictOf(0),verdictOf(PERFECT));
 for(const total of [0,40,80,PERFECT])assert.ok(verdictOf(total).length>10);
 assert.equal(faceById('nonsense').id,'otafuku');
 // The blindfold takes the face with it, which is the game: you look, it goes, and you place
 // six pieces onto an empty board from memory. A screen that leaves the face up is a guessing
 // game with the answer printed on it.
 const screen=await readFile(new URL('../src/Fukuwarai.jsx',import.meta.url),'utf8');
 assert.match(screen,/const blind=phase==='blind',revealed=phase==='off';/);
 assert.match(screen,/\{!blind&&blank\[faceId\]\(face\)\}/,'the face is drawn only when it is not hidden');
 assert.match(screen,/if\(!next\|\|!blind\)return;/,'and nothing is placed before the blindfold is on');
 assert.match(screen,/onClick=\{\(\)=>setPhase\('blind'\)\}/);
});

test('the daruma chant is ten syllables, and anybody still moving when he turns is caught',async()=>{
 const D=await import('../src/daruma.js');
 assert.equal(D.CHANT.join(''),'だるまさんがころんだ');
 assert.equal(D.CHANT.length,10);
 // Each syllable gets its own length, leaning slower at the start and quicker at the end —
 // which is how a child chants it, and is the only reason the game is hard.
 for(const level of D.LEVELS){
  const tempo=D.chantTempo(level,D.rng(5));
  assert.equal(tempo.length,D.CHANT.length);
  for(const beat of tempo)assert.ok(beat>=90&&beat<level.beat[1]*2,`${level.id} beat out of range: ${beat}`);
  assert.notDeepEqual(tempo,D.chantTempo(level,D.rng(99)),'two chants are not the same chant');
 }
 // Crossing must take several chants. One chant that gets you there means letting go is never
 // a decision, and letting go is the whole game.
 for(const level of D.LEVELS){
  const chant=D.chantTempo(level,D.rng(5)).reduce((a,b)=>a+b,0);
  const inOneChant=(chant/D.TICK)*level.step;
  assert.ok(inOneChant<D.TRACK*0.5,`${level.id} crosses too much of the track in one chant`);
 }
 // Playing it out with no screen. A player who lets go while the chant is still running walks
 // it; one who never lets go is caught three times and that is the end of it.
 const play=(levelId,style)=>{
  let run=D.start(D.newRun(levelId,D.rng(3)),0),now=0,guard=0;
  while(!run.over&&guard++<20000){
   now+=D.TICK;
   const left=run.phase==='chant'?run.tempo.slice(run.index).reduce((a,b)=>a+b,0):0;
   const held=style==='never'?true:run.phase==='chant'&&left>400;
   run=D.darumaTick(run,{held,now,rand:D.rng(now+7)});
   if(run.phase==='caught')run=D.resume(run,now,D.rng(now));
  }
  return run;
 };
 for(const level of D.LEVELS){
  const careful=play(level.id,'careful');
  assert.deepEqual(careful.over,{won:true,how:'touched'},`${level.id} must be winnable`);
  assert.equal(careful.distance,D.TRACK);
  const greedy=play(level.id,'never');
  assert.deepEqual(greedy.over,{won:false,how:'caught'},`${level.id} must punish a finger that never lifts`);
  assert.equal(greedy.lives,0);
  assert.equal(greedy.caught,3);
 }
 // The rules themselves, one at a time. Moving while he is watching is caught, at once.
 const watching={...D.newRun('gentle',D.rng(1)),phase:'watch',at:0,lives:3,distance:40};
 assert.equal(D.darumaTick(watching,{held:true,now:10,rand:D.rng(1)}).phase,'caught');
 assert.equal(D.darumaTick(watching,{held:true,now:10,rand:D.rng(1)}).distance,0,'and you go back to the wall');
 assert.equal(D.darumaTick(watching,{held:false,now:10,rand:D.rng(1)}).phase,'watch','standing still is safe');
 // Still moving when the grace runs out is caught; stopping inside it is not.
 const turning={...D.newRun('gentle',D.rng(1)),phase:'turn',at:0,lives:3,distance:40};
 const grace=D.levelById('gentle').grace;
 assert.equal(D.darumaTick(turning,{held:true,now:grace-50,rand:D.rng(1)}).phase,'turn','the brave get a step out of the turn');
 assert.equal(D.darumaTick(turning,{held:true,now:grace+50,rand:D.rng(1)}).phase,'caught');
 assert.equal(D.darumaTick(turning,{held:false,now:grace+50,rand:D.rng(1)}).phase,'watch');
 // Nothing happens at all until it has been started.
 const ready=D.newRun('gentle',D.rng(1));
 assert.equal(ready.phase,'ready');
 assert.equal(D.darumaTick(ready,{held:true,now:9999,rand:D.rng(1)}),ready);
 assert.equal(ready.lives,3);
 // A win always pays for the level it was won on, however long it took.
 for(const level of D.LEVELS){
  assert.ok(D.darumaWorth(level,9999,0)>=level.pays);
  assert.ok(D.darumaWorth(level,5,3)<=9999);
  assert.ok(D.darumaWorth(level,5,3)>D.darumaWorth(level,50,3),'quicker is worth more');
  assert.ok(D.darumaWorth(level,20,3)>D.darumaWorth(level,20,1),'and so is not being caught');
 }
 assert.ok(D.darumaWorth(D.LEVELS[2],20,3)>D.darumaWorth(D.LEVELS[0],20,3),'the demon pays more than the gentle one');
});

test('karuta deals the same round from the same seed, and every proverb is filed under its own letter',async()=>{
 const {KOTOWAZA,KARUTA_DECKS,KARUTA_SIZES,karutaRound,karutaScore,KARUTA_PAR,OTETSUKI}=await import('../src/karuta-data.js');
 // The card is found by the letter the reading opens with. That is the whole game, so every
 // proverb must actually begin with the letter it is filed under, and no two may share one.
 assert.equal(new Set(KOTOWAZA.map(p=>p.kana)).size,KOTOWAZA.length,'one card per letter');
 for(const p of KOTOWAZA){
  assert.ok(p.ja&&p.romaji&&p.en&&p.literal&&p.icon,`${p.kana} is missing something`);
  assert.equal(p.kana.length,1);
 }
 assert.ok(KOTOWAZA.length>=KARUTA_SIZES.at(-1),'the biggest round must be dealable');
 // Two phones on the same seed get the same floor and the same reading order, so the boys can
 // race it properly rather than arguing about who got the easier one.
 const a=karutaRound('kotowaza',10,4242),b=karutaRound('kotowaza',10,4242);
 assert.deepEqual(a.cards.map(c=>c.id),b.cards.map(c=>c.id));
 assert.deepEqual(a.calls,b.calls);
 assert.notDeepEqual(a.calls,karutaRound('kotowaza',10,9999).calls);
 // Every card is called exactly once, and the call is never written on the card it belongs to.
 assert.equal(a.calls.length,a.cards.length);
 assert.deepEqual([...a.calls].sort(),a.cards.map(c=>c.id).sort());
 for(const size of KARUTA_SIZES)for(const deck of KARUTA_DECKS)
  assert.equal(karutaRound(deck.id,size,7).cards.length,size,`${deck.id} must deal ${size}`);
 // A clean fast round beats a slow one, otetsuki costs, and the worst round still scores.
 assert.equal(karutaScore(10,0,0),10*KARUTA_PAR);
 assert.ok(karutaScore(10,8,0)>karutaScore(10,20,0));
 assert.equal(karutaScore(10,8,1),karutaScore(10,8,0)-OTETSUKI);
 assert.equal(karutaScore(6,9999,40),1,'a terrible round is still worth showing up for');
 assert.ok(karutaScore(16,0,0)<=9999);
});

test('animal shogi is shogi: a taken piece changes sides and comes back as yours',async()=>{
 const S=await import('../src/shogi.js');
 const blank=()=>({board:Array(S.SQUARES).fill(null),hands:{me:[],them:[]},turn:'me',over:null,ply:0});
 const start=S.newGame();
 assert.equal(start.board[S.at(3,1)].piece,'lion');
 assert.equal(start.board[S.at(0,1)].piece,'lion');
 assert.equal(S.legalMoves(start).length,4,'the opening really is that narrow');
 // A chick that reaches the far row is a hen and has no say in it; a hen that is taken goes
 // back to being a chick in the hand, which is the rule that stops one side running away.
 let g=blank();
 g.board[S.at(1,0)]={piece:'chick',side:'me'};g.board[S.at(3,2)]={piece:'lion',side:'me'};g.board[S.at(0,2)]={piece:'lion',side:'them'};
 assert.equal(S.play(g,{from:S.at(1,0),to:S.at(0,0)}).board[S.at(0,0)].piece,'hen');
 g=blank();
 g.board[S.at(2,1)]={piece:'hen',side:'them'};g.board[S.at(3,1)]={piece:'giraffe',side:'me'};
 g.board[S.at(3,0)]={piece:'lion',side:'me'};g.board[S.at(0,0)]={piece:'lion',side:'them'};
 const took=S.play(g,{from:S.at(3,1),to:S.at(2,1)});
 assert.deepEqual(took.hands.me,['chick']);
 // And back on the board as one of mine, on any empty square, still a chick even on the far row.
 const mine={...took,turn:'me'};
 const dropped=S.play(mine,{drop:'chick',to:S.at(0,1)});
 assert.deepEqual(dropped.board[S.at(0,1)],{piece:'chick',side:'me'});
 assert.deepEqual(dropped.hands.me,[]);
 assert.equal(S.play(mine,{drop:'chick',to:S.at(0,0)}),mine,'a drop never lands on a piece');
 // Each animal moves its own way and no other.
 const only=(piece,square)=>{const b=Array(S.SQUARES).fill(null);b[square]={piece,side:'me'};return S.movesFor(b,square).sort((x,y)=>x-y);};
 assert.deepEqual(only('giraffe',S.at(2,1)),[S.at(1,1),S.at(2,0),S.at(2,2),S.at(3,1)]);
 assert.deepEqual(only('elephant',S.at(2,1)),[S.at(1,0),S.at(1,2),S.at(3,0),S.at(3,2)]);
 assert.deepEqual(only('chick',S.at(2,1)),[S.at(1,1)]);
 assert.equal(only('lion',S.at(2,1)).length,8);
 assert.equal(only('hen',S.at(2,1)).length,6,'everywhere but backwards on the diagonal');
 // His chick walks the other way, because forward is not a direction, it is a side.
 const his=Array(S.SQUARES).fill(null);his[S.at(1,1)]={piece:'chick',side:'them'};
 assert.deepEqual(S.movesFor(his,S.at(1,1)),[S.at(2,1)]);
});

test('a lion taken ends it, and a lion that walks the board ends it only if it survives there',async()=>{
 const S=await import('../src/shogi.js');
 const blank=()=>({board:Array(S.SQUARES).fill(null),hands:{me:[],them:[]},turn:'me',over:null,ply:0});
 let g=blank();
 g.board[S.at(1,1)]={piece:'lion',side:'me'};g.board[S.at(0,1)]={piece:'lion',side:'them'};
 assert.deepEqual(S.play(g,{from:S.at(1,1),to:S.at(0,1)}).over,{winner:'me',how:'capture'});
 // The try: reach his back row and you have won — unless something there can take you, in
 // which case you have merely walked your lion somewhere silly.
 g=blank();g.board[S.at(1,0)]={piece:'lion',side:'me'};g.board[S.at(3,2)]={piece:'lion',side:'them'};
 assert.deepEqual(S.play(g,{from:S.at(1,0),to:S.at(0,0)}).over,{winner:'me',how:'try'});
 g.board[S.at(1,1)]={piece:'elephant',side:'them'};
 const walked=S.play(g,{from:S.at(1,0),to:S.at(0,0)});
 assert.equal(walked.over,null,'an elephant is looking straight at that square');
 assert.deepEqual(S.play(walked,{from:S.at(1,1),to:S.at(0,0)}).over,{winner:'them',how:'capture'});
 // Nobody sits through two lions shuffling at each other for ever.
 assert.equal(S.play({...blank(),ply:S.MAX_PLY-1,board:(()=>{const b=Array(S.SQUARES).fill(null);
  b[S.at(2,0)]={piece:'lion',side:'me'};b[S.at(0,2)]={piece:'lion',side:'them'};return b;})()},
  {from:S.at(2,0),to:S.at(2,1)}).over.how,'draw');
});

test('the harder opponent is harder, and a win pays for how hard he was',async()=>{
 const S=await import('../src/shogi.js');
 // He never plays an illegal move, whatever depth he is set to.
 for(const level of S.LEVELS){
  let g=S.newGame();
  for(let i=0;i<8&&!g.over;i++){
   const move=S.aiMove(g,level.depth);
   assert.ok(S.legalMoves(g).some(m=>m.from===move.from&&m.to===move.to&&m.drop===move.drop),
    `${level.en} played something he is not allowed to`);
   g=S.play(g,move);
  }
 }
 // A lion he can take, he takes. His own lion sits on his own back row, out of the way: put it
 // on mine and the position is already won by the try rule, and he is spoilt for choice.
 const board=Array(S.SQUARES).fill(null);
 board[S.at(1,1)]={piece:'lion',side:'me'};board[S.at(2,1)]={piece:'giraffe',side:'them'};board[S.at(0,0)]={piece:'lion',side:'them'};
 const hanging={board,hands:{me:[],them:[]},turn:'them',over:null,ply:4};
 // Which piece he takes it with is his business — his giraffe and his lion can both reach it,
 // and he picks between two winning moves at random. That it ends up taken is the test.
 const chosen=S.aiMove(hanging,2);
 assert.equal(chosen.to,S.at(1,1),'he must go for the lion');
 assert.deepEqual(S.play(hanging,chosen).over,{winner:'them',how:'capture'});
 // And the deeper he looks the better he does, which is the only thing the levels promise. He
 // picks between equal-looking moves at random, so the dice are handed to him here rather than
 // left to chance — a test of three levels that passes four times in five is not a test.
 const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
 const beats=(mine,theirs,games)=>{
  let won=0;
  for(let i=1;i<=games;i++){
   const rand=rng(i*7919);
   let g=S.newGame();
   while(!g.over)g=S.play(g,S.aiMove(g,g.turn==='me'?mine:theirs,rand));
   if(g.over.winner==='me')won++;
  }
  return won;
 };
 const [chick,giraffe,lion]=S.LEVELS.map(l=>l.depth);
 assert.equal(beats(giraffe,chick,10),10,'the giraffe must beat the chick every time');
 assert.equal(beats(lion,chick,10),10,'and so must the lion');
 assert.ok(beats(lion,giraffe,10)>=8,'and the lion must have the better of the giraffe');
 assert.ok(S.shogiWorth(5,10)>S.shogiWorth(1,10),'a harder opponent is worth more');
 assert.ok(S.shogiWorth(3,8)>S.shogiWorth(3,60),'and a short game is worth more than a long one');
 assert.equal(S.shogiWorth(3,900),60,'but a long one never goes negative');
});

test('a change is never hidden in the sky when there is a photograph underneath it',async()=>{
 const {planRound,levelFor}=await import('../src/spot-data.js');
 // The shape of a real photograph: flat sky across the top half, everything worth looking at
 // below it. Nothing may be hidden in a patch that is entirely sky.
 const SKY=0.5;
 const photo=spotImage(320,240,(x,y)=>y<240*SKY?[150,180,215]
  :[(x*7919+y*104729)%256,(x*31+y*17)%256,(y*7)%256]);
 const round=planRound(photo,{level:levelFor('normal'),seed:99,aspect:4/3});
 assert.equal(round.tooPlain,false,'half a photograph is still a photograph');
 assert.equal(round.edits.length,5);
 for(const e of round.edits)
  assert.ok(e.y+e.h>SKY,`a change with nothing but sky in it cannot be found — ${e.y}..${e.y+e.h}`);
 // And what it copies from is not sky either, or a patch would paint a blue square.
 for(const e of round.edits.filter(e=>e.from))
  assert.ok(e.from.y+e.h>SKY,`and it cannot be copied out of the sky — ${e.from.y}`);
});

test('a rank name is cut to what fits on a tile, and the long one is kept for the list',async()=>{
 const {SUMO_RANKS,shortRank,rankAt}=await import('../src/kana-data.js');
 // The only one with a long name, and the reason this exists at all.
 assert.equal(rankAt(5).en,'Juryo — now paid');
 assert.equal(shortRank(rankAt(5)),'Juryo');
 for(const rank of SUMO_RANKS){
  assert.ok(shortRank(rank).length<=12,`${shortRank(rank)} is too long for a tile`);
  assert.ok(rank.en.startsWith(shortRank(rank)),'the short name is the start of the real one');
 }
 assert.equal(shortRank(null),'');
});

test('the two boards say which squares are empty, and both ladders are laid out the same way',async()=>{
 const source=await readFile(new URL('../src/Games.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // One component draws every ladder — the merge one, the ranks, the rituals and the tells —
 // so they cannot drift apart, and none is left as a ragged run of inline text.
 assert.equal([...source.matchAll(/<Ladder /g)].length,4);
 assert.equal([...source.matchAll(/<details className="merge-ladder">/g)].length,1,
  'only the shared component draws one — no game writes its own');
 assert.match(css,/\.ladder-grid\{display:grid/);
 // An empty square has to look empty. Before this the empty and filled squares were within a
 // few percent of each other and the board read as one blank slab.
 for(const [empty,filled] of [['.merge-tile','.merge-tile.filled'],['.stable-cell','.stable-cell.filled']]){
  const last=name=>[...css.matchAll(new RegExp(`\\${name}\\{([^}]*)\\}`,'g'))]
   .map(m=>/background:(#[0-9a-f]{3,6})\b/.exec(m[1])?.[1]).filter(Boolean).pop();
  const [a,b]=[last(empty),last(filled)];
  assert.ok(a&&b,`${empty} and ${filled} must both set a background`);
  // #fff and #ffffff are the same colour written two ways.
  const channels=hex=>{
   const full=hex.length===4?`#${[...hex.slice(1)].map(c=>c+c).join('')}`:hex;
   return [1,3,5].map(i=>parseInt(full.slice(i,i+2),16));
  };
  const gap=Math.max(...channels(a).map((v,i)=>Math.abs(v-channels(b)[i])));
  assert.ok(gap>=24,`${empty} and ${filled} are too close to tell apart (${a} v ${b}, ${gap})`);
 }
 // Every number on a games screen goes through the one figures block rather than being
 // written into a sentence, so they line up instead of wrapping.
 assert.ok([...source.matchAll(/<Stats /g)].length>=2);
});

test('the app can build the two sounds it needs without shipping a file',async()=>{
 const {wavDataUri,holdUri,toneUri,HOLD_SECONDS}=await import('../src/speech.js');
 const decode=uri=>{
  assert.match(uri,/^data:audio\/wav;base64,/);
  return Buffer.from(uri.slice(uri.indexOf(',')+1),'base64');
 };
 const wav=decode(holdUri(1,8000));
 // A real WAV header, or a phone will not play it — which is the whole point of the thing.
 assert.equal(wav.slice(0,4).toString('ascii'),'RIFF');
 assert.equal(wav.slice(8,12).toString('ascii'),'WAVE');
 assert.equal(wav.slice(12,16).toString('ascii'),'fmt ');
 assert.equal(wav.slice(36,40).toString('ascii'),'data');
 assert.equal(wav.readUInt16LE(20),1,'PCM');
 assert.equal(wav.readUInt16LE(22),1,'mono');
 assert.equal(wav.readUInt32LE(24),8000);
 assert.equal(wav.readUInt16LE(34),16,'16-bit');
 assert.equal(wav.readUInt32LE(40),8000*2,'a second of it');
 assert.equal(wav.length,44+8000*2);
 assert.equal(wav.readUInt32LE(4),36+8000*2,'the size in the header matches the file');
 // The hold is inaudible but it is NOT digital silence: a buffer of zeroes is exactly what
 // iOS is entitled to decide is not playback, and a page that is not playing anything is
 // ambient again and back under the ring switch. One step either side of zero is about
 // ninety decibels down — no ear finds it, no heuristic calls it nothing. The beep, which
 // is answering "can you hear this", really does have to be heard.
 const loudest=buffer=>{let peak=0;for(let i=44;i<buffer.length;i+=2)peak=Math.max(peak,Math.abs(buffer.readInt16LE(i)));return peak;};
 assert.equal(loudest(wav),1,'audible to nobody, and not nothing');
 assert.ok(loudest(decode(toneUri()))>8000);
 // It crosses zero rather than sitting at one step: a constant offset is a DC level, which
 // is not playing a sound either.
 let below=0;for(let i=44;i<wav.length;i+=2)if(wav.readInt16LE(i)<0)below++;
 assert.ok(below>0&&below<8000,'it alternates rather than sitting still');
 // Every loop seam is a moment with nothing playing, so the hold is seconds rather than one.
 assert.ok(HOLD_SECONDS>=3);
 assert.equal(decode(holdUri()).length,44+HOLD_SECONDS*8000*2);
 // It fades in rather than starting square, because a click is not an answer either.
 const tone=decode(toneUri());
 assert.ok(Math.abs(tone.readInt16LE(44))<1500,'starts quietly');
 assert.equal(wavDataUri(new Float32Array(0),8000).length>40,true);
});

test('the playback session is held for as long as there is something to say',async()=>{
 const {holdPlayback,releasePlayback,playbackHeld,resetHold,armPlayback,resetArm,resetPlaybackClaim,playbackClaim}=await import('../src/speech.js');
 resetHold();
 const made=[];
 const make=src=>{const el={src,loop:false,plays:0,pauses:0,play(){this.plays++;},pause(){this.pauses++;}};made.push(el);return el;};
 assert.equal(holdPlayback(make),true);
 assert.equal(made.length,1);
 assert.equal(made[0].loop,true,'a one-shot ends before the speaking starts and holds nothing');
 assert.match(made[0].src,/^data:audio\/wav/);
 // Two phrases overlapping: the first to finish must not pull the session out from under
 // the second.
 holdPlayback(make);
 assert.equal(made.length,1,'the same element is reused');
 assert.equal(playbackHeld(),true);
 releasePlayback();
 assert.equal(playbackHeld(),true);
 assert.equal(made[0].pauses,0);
 releasePlayback();
 assert.equal(playbackHeld(),false);
 assert.equal(made[0].pauses,1);
 // Letting go more often than you took hold cannot drive it negative.
 releasePlayback();releasePlayback();
 assert.equal(playbackHeld(),false);
 // Arming: iOS ignores a session claimed before anyone has touched the page, and will not
 // play a media element later that was never played inside a gesture. Both happen on the
 // first touch, once.
 resetHold();resetArm();resetPlaybackClaim();
 const listeners={};
 const session={type:'ambient'};
 const win={navigator:{audioSession:session},
  addEventListener:(e,fn)=>{listeners[e]=fn;},
  removeEventListener:e=>{delete listeners[e];}};
 assert.equal(armPlayback(win),true);
 assert.equal(armPlayback(win),false,'armed once, not on every render');
 assert.deepEqual(Object.keys(listeners).sort(),['pointerdown','touchend']);
 assert.equal(playbackClaim(),null,'nothing is claimed before anyone touches anything');
 listeners.pointerdown();
 assert.equal(session.type,'playback');
 assert.equal(playbackClaim(),'playback');
 assert.deepEqual(Object.keys(listeners),[],'and it lets go of the page afterwards');
 resetHold();resetArm();resetPlaybackClaim();
});

test('the hold is really playing before a word is said, and is put back when iOS takes it',async()=>{
 const {holdPlayback,releasePlayback,keepHolding,whenHolding,resetHold}=await import('../src/speech.js');
 // A phone's play() is a promise. A phrase begun before it lands is a phrase begun while the
 // page is still ambient, which is the category the ring switch mutes — so the speaking waits
 // for the hold rather than racing it.
 resetHold();
 let land=null;
 const slow={paused:true,plays:0,pauses:0,
  play(){this.plays++;this.paused=false;return new Promise(r=>{land=r;});},
  pause(){this.pauses++;this.paused=true;}};
 holdPlayback(()=>slow);
 let said=0;
 assert.equal(whenHolding(()=>said++,50,()=>{}),true,'there is a promise to wait on');
 assert.equal(said,0,'nothing is said into an ambient page');
 land();await Promise.resolve();await Promise.resolve();
 assert.equal(said,1);
 // Pausing before that promise settles aborts the play rather than stopping it, and an
 // aborted play is not the gesture-unlock iOS remembers — which is how arming the page on
 // the first touch managed to unarm itself.
 resetHold();
 let settle=null;
 slow.play=function(){this.plays++;this.paused=false;return new Promise(r=>{settle=r;});};
 holdPlayback(()=>slow);
 releasePlayback();
 assert.equal(slow.pauses,0,'not while the play request is still in the air');
 settle();await Promise.resolve();await Promise.resolve();
 assert.equal(slow.pauses,1);
 // A hold that never settles must never cost anybody the phrase.
 resetHold();
 const stuck={paused:true,play(){this.paused=false;return new Promise(()=>{});},pause(){this.paused=true;}};
 holdPlayback(()=>stuck);
 let late=0;
 whenHolding(()=>late++,250,fn=>fn());
 assert.equal(late,1,'the deadline speaks where the promise will not');
 // Nothing to wait on runs on the spot rather than waiting for nothing.
 resetHold();
 const plain={paused:true,play(){this.paused=false;},pause(){this.paused=true;}};
 holdPlayback(()=>plain);
 let now=0;whenHolding(()=>now++,250,()=>{});
 assert.equal(now,1);
 // iOS pauses a page's audio for reasons of its own — an interruption, a route change — and
 // the moment it does the page is ambient again and the switch is back in charge.
 resetHold();
 const drop={paused:true,plays:0,play(){this.plays++;this.paused=false;},pause(){this.paused=true;}};
 assert.equal(keepHolding(),false,'nothing held, nothing to put back');
 holdPlayback(()=>drop);
 assert.equal(drop.plays,1);
 assert.equal(keepHolding(),false,'still playing, so leave it alone');
 drop.paused=true;
 assert.equal(keepHolding(),true);
 assert.equal(drop.plays,2,'and the page counts as media again');
 releasePlayback();
 assert.equal(keepHolding(),false,'and not a moment longer than the talking');
 resetHold();
});

test('the warm-up is spent on the first touch, never left in front of a real phrase',async()=>{
 const {warmUp,armPlayback,resetArm,resetPlaybackClaim,resetHold}=await import('../src/speech.js');
 const speech=await readFile(new URL('../src/AdventurePages.jsx',import.meta.url),'utf8');
 // WebKit ignores the first thing a page says, so something throwaway goes first. But WebKit
 // does not reliably finish a silent utterance either, and it speaks its queue in order: one
 // that never ends is one every real phrase waits behind for the rest of the session. That is
 // a phone where every button works, the engine reports itself busy, and not one word is ever
 // heard — which is exactly what was being reported.
 assert.doesNotMatch(speech,/warmUp/,'never queued in front of the thing somebody asked for');
 warmUp.done=false;
 const spoken=[],cancels=[],waits=[];
 const synth={speak:u=>spoken.push(u),cancel:()=>cancels.push(1)};
 assert.equal(warmUp(synth,class{constructor(t){this.text=t;}},(fn,ms)=>waits.push([fn,ms])),true);
 assert.equal(spoken.length,1);
 assert.equal(spoken[0].volume,0,'the warm-up is silent');
 assert.equal(cancels.length,0,'the speak() call itself is what unlocks the engine');
 assert.equal(waits.length,1);
 // On the next turn, not after a wait: the first touch is very often the tap on 'Hear it'
 // itself, and a cancel still pending when that phrase starts would stop the very thing the
 // warm-up exists to help.
 assert.equal(waits[0][1],0);
 waits[0][0]();
 assert.equal(cancels.length,1,'then the queue is cleared, whether it finished or not');
 // And it is spent on the first touch anywhere, which is a touch that asked for no sound.
 resetHold();resetArm();resetPlaybackClaim();warmUp.done=false;
 const listeners={};
 const win={navigator:{audioSession:{type:'ambient'}},
  speechSynthesis:{speak:()=>{},cancel:()=>{}},
  SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},
  addEventListener:(e,fn)=>{listeners[e]=fn;},removeEventListener:e=>{delete listeners[e];}};
 armPlayback(win);
 assert.equal(warmUp.done,false,'nothing is warmed before anybody touches anything');
 listeners.pointerdown();
 assert.equal(warmUp.done,true);
 resetHold();resetArm();resetPlaybackClaim();
});

test('a reading that was heard is never reported as silence',async()=>{
 const speech=await readFile(new URL('../src/AdventurePages.jsx',import.meta.url),'utf8');
 // Whether a sound was made comes from the engine rather than a stopwatch. A short line — a
 // kana, a chunk, a mission title — is finished well inside any deadline, and treating that
 // as "nothing began" told a phone that had just read something out that it had done nothing.
 assert.match(speech,/say\.onstart=\(\)=>\{began=true;\}/);
 assert.match(speech,/if\(began\|\|synth\.speaking\|\|synth\.pending\)return;/);
 assert.match(speech,/silenceAdvice\(\{started:began,standalone:isStandalone\(\)\}\)/,'and a failure reports what really happened');
 // Held while talking, put back if iOS takes it away, and let go exactly once.
 assert.match(speech,/setInterval\(keepHolding,1000\)/);
 assert.match(speech,/whenHolding\(\(\)=>\{try\{synth\.speak\(say\);\}catch\{done\(\);\}\}\)/);
 // iOS does not always report an utterance it was told to drop, so whoever interrupts one
 // lets go of the hold it took rather than waiting to be told.
 assert.match(speech,/if\(busy\)synth\.cancel\(\);\n  release\(\);/);
 // The sixty-second safety net is tracked now, so one left over from an earlier reading
 // cannot stop the button on the reading happening right now.
 assert.match(speech,/guard\.current=setTimeout\(done,60000\)/);
 assert.match(speech,/clearTimeout\(timer\.current\);clearTimeout\(guard\.current\)/);
});

test('no spoken section leaves a silent phone unexplained',async()=>{
 const src=async n=>readFile(new URL(`../src/${n}`,import.meta.url),'utf8');
 // A button that does nothing and says nothing is the whole complaint, so every place with
 // one takes the reason off the hook and puts it on the screen.
 for(const name of ['FunFacts.jsx','SayIt.jsx','SoundOut.jsx','AdventurePages.jsx'])
  assert.match(await src(name),/\{problem&&/,`${name} keeps the reason to itself`);
 const adventure=await src('AdventurePages.jsx');
 assert.equal((adventure.match(/useReadAloud\(\)/g)||[]).length,3,'the hook, the rules button, the missions');
 assert.doesNotMatch(adventure,/\{supported,reading,read\}=useReadAloud/,'the rules button used to drop it');
 assert.doesNotMatch(adventure,/\{supported:canRead,reading,read\}=useReadAloud/,'and so did the missions');
 assert.match(await src('SoundOut.jsx'),/\{supported,reading,read,problem\}=useReadAloud\(\)/);
 // The facts page is where "I pressed it and nothing happened" actually gets said, so the
 // two-button test is there as well as in the phrasebook.
 assert.match(await src('FunFacts.jsx'),/<SoundCheck\/>/);
 // And the check's verdict uses the beep it just played: a phone that plays a recording and
 // will not speak for itself has a fix that nothing else on the screen can name.
 const check=await src('SoundCheck.jsx');
 assert.match(check,/silenceAdvice\(\{started:facts\.started,standalone:facts\.standalone,tone:facts\.tone\}\)/);
 assert.doesNotMatch(check,/warmUp/,'the warm-up belongs to the first touch, not to a test run');
 assert.match(check,/setInterval\(keepHolding,1000\)/,'and it measures the path everything else takes');
 assert.match(check,/whenHolding\(/);
});

test('a recorded phrase is the family’s own, one per phrase, described by storage',async()=>{
 const {checkPhraseClip,addPhraseClip,removePhraseClip,phraseClip,PHRASE_CLIP_SECONDS}=await import('../server/phrase-audio.mjs');
 const {ensureFeatures}=await import('../src/trip-features.js');
 const mum={name:'Lauren',role:'parent',id:'grant-lauren'},dad={name:'Damien',role:'parent',id:'grant-damien'};
 const good={phraseId:'hello',pathname:'phrases/grant-lauren/a.m4a',seconds:2};
 assert.deepEqual(checkPhraseClip(good,mum),{phraseId:'hello',pathname:'phrases/grant-lauren/a.m4a',seconds:2});
 // You cannot write into somebody else's folder, or out of the folder at all.
 assert.throws(()=>checkPhraseClip(good,dad),/Invalid recording/);
 assert.throws(()=>checkPhraseClip({...good,pathname:'phrases/grant-lauren/../x.m4a'},mum),/Invalid recording/);
 assert.throws(()=>checkPhraseClip({...good,pathname:'voice/grant-lauren/a.m4a'},mum),/Invalid recording/);
 assert.throws(()=>checkPhraseClip({...good,phraseId:''},mum),/Choose a phrase/);
 assert.throws(()=>checkPhraseClip({...good,seconds:0},mum),/second or two/);
 assert.throws(()=>checkPhraseClip({...good,seconds:PHRASE_CLIP_SECONDS+1},mum),/second or two/);
 const blob={contentType:'audio/mp4',size:9000};
 let state=ensureFeatures(structuredClone(seed));
 state=addPhraseClip(state,checkPhraseClip(good,mum),mum,blob,'2026-09-22T01:00:00.000Z');
 const kept=phraseClip(state,'hello');
 assert.equal(kept.by,'Lauren');
 assert.equal(kept.type,'audio/mp4','the file is described by storage, not by the phone');
 assert.equal(kept.size,9000);
 assert.equal(kept.seconds,2);
 // Saving the very same recording twice is the same recording.
 assert.equal(addPhraseClip(state,checkPhraseClip(good,mum),mum,blob),state);
 // Recording it again replaces it — this is a reference pronunciation, not a conversation,
 // and two of them only raise the question of which one is right.
 const again={phraseId:'hello',pathname:'phrases/grant-lauren/b.m4a',seconds:3};
 const redone=addPhraseClip(state,checkPhraseClip(again,mum),mum,blob);
 assert.equal(Object.keys(redone.phraseAudio).length,1);
 assert.equal(phraseClip(redone,'hello').pathname,'phrases/grant-lauren/b.m4a');
 assert.equal(phraseClip(redone,'hello').replaced,'phrases/grant-lauren/a.m4a');
 // A file storage says is not audio is refused however it was uploaded.
 assert.throws(()=>addPhraseClip(state,checkPhraseClip({...good,phraseId:'bye'},mum),mum,{contentType:'text/html',size:20}),/./);
 // Removing it puts the phrase back to the phone saying it itself.
 assert.equal(phraseClip(removePhraseClip(redone,'hello'),'hello'),null);
 assert.throws(()=>removePhraseClip(redone,'nothing-here'),/no recording/i);
 // Nothing else in the trip is disturbed by any of it.
 assert.equal(redone.steps,state.steps);
});

test('the sound check reports the recording and the speaking apart',async()=>{
 const {soundCheckLines}=await import('../src/speech.js');
 const read=facts=>Object.fromEntries(soundCheckLines(facts));
 assert.equal(read({}) ['A recording played'],'not tested');
 assert.match(read({tone:'played'})['A recording played'],/yes — so recorded phrases will be heard/);
 assert.match(read({tone:'the phone would not allow it'})['A recording played'],/^no — the phone would not allow it/);
 // The two questions stay apart: a phone that plays a recording but will not speak is the
 // exact case the recordings exist for, and the report has to be able to say so.
 const both=read({tone:'played',started:false,supported:true,voices:[]});
 assert.match(both['A recording played'],/yes/);
 assert.match(both['It started speaking'],/no/);
});

test('we call the bouts from one phone, and the picks close once it has been watched',async()=>{
 const {ensureFeatures,sumo,boutPredictions,predictionsClosed,predictionTally,predictionLeaders,pendingProgress}=await import('../src/trip-features.js');
 const card={type:'sumoUpdate',basho:'Aki Basho 2026',dayNumber:11,venue:'Ryogoku Kokugikan',date:'2026-09-23',
  doorsOpen:'08:00',notes:'',sources:[],bouts:[
   {id:'makuuchi-38',division:'makuuchi',order:38,time:'17:40',east:{name:'Kirishima',rank:'Sekiwake',stable:'Michinoku'},west:{name:'Daieisho',rank:'Komusubi',stable:'Oitekaze'}},
   {id:'makuuchi-40',division:'makuuchi',order:40,time:'17:55',east:{name:'Hoshoryu',rank:'Ozeki',stable:'Tatsunami'},west:{name:'Kotozakura',rank:'Ozeki',stable:'Sadogatake'}}]};
 let state=applyOperation(ensureFeatures(structuredClone(seed)),card,parent);
 // One phone is out and four people are shouting at it, so whoever holds it enters all four.
 // This is the one place in the app where you record somebody else's answer.
 for(const [person,pick] of [['Damien','Hoshoryu'],['Lauren','Kotozakura'],['Nate','Hoshoryu'],['Boston','Kotozakura']])
  state=applyOperation(state,{type:'sumoPredict',id:'makuuchi-40',person,winner:pick},child);
 assert.deepEqual(boutPredictions(state,'makuuchi-40'),{Damien:'Hoshoryu',Lauren:'Kotozakura',Nate:'Hoshoryu',Boston:'Kotozakura'});
 assert.equal(predictionsClosed(state,'makuuchi-40'),false);
 // Before anything is watched, nobody is losing — a pick with no result yet is still to come.
 assert.deepEqual(predictionTally(state).map(t=>[t.name,t.right,t.wrong,t.waiting]),
  [['Boston',0,0,1],['Damien',0,0,1],['Lauren',0,0,1],['Nate',0,0,1]]);
 assert.deepEqual(predictionLeaders(state),[],'and nobody is leading');
 // Changing your mind before the bout is fine; tapping your own pick again takes it back.
 state=applyOperation(state,{type:'sumoPredict',id:'makuuchi-40',person:'Nate',winner:'Kotozakura'},child);
 assert.equal(boutPredictions(state,'makuuchi-40').Nate,'Kotozakura');
 const withdrawn=applyOperation(state,{type:'sumoPredict',id:'makuuchi-40',person:'Nate',winner:null},child);
 assert.equal(boutPredictions(withdrawn,'makuuchi-40').Nate,undefined);
 assert.equal(Object.keys(boutPredictions(withdrawn,'makuuchi-40')).length,3);
 // Then it happens.
 state=applyOperation(state,{type:'sumoResult',id:'makuuchi-40',winner:'Kotozakura'},child);
 assert.equal(predictionsClosed(state,'makuuchi-40'),true);
 assert.deepEqual(predictionTally(state).map(t=>[t.name,t.right,t.wrong]),
  [['Boston',1,0],['Lauren',1,0],['Nate',1,0],['Damien',0,1]]);
 assert.deepEqual(predictionLeaders(state),['Boston','Lauren','Nate']);
 // You cannot call a bout you have already watched — that is the whole point of a sweepstake.
 assert.throws(()=>applyOperation(state,{type:'sumoPredict',id:'makuuchi-40',person:'Damien',winner:'Kotozakura'},parent),/has been watched/);
 // Unless the result went in by mistake, which is why clearing it reopens them.
 const reopened=applyOperation(state,{type:'sumoResult',id:'makuuchi-40',winner:null},parent);
 assert.equal(predictionsClosed(reopened,'makuuchi-40'),false);
 assert.ok(applyOperation(reopened,{type:'sumoPredict',id:'makuuchi-40',person:'Damien',winner:'Kotozakura'},parent));
 assert.deepEqual(boutPredictions(reopened,'makuuchi-40'),boutPredictions(state,'makuuchi-40'),'and the picks were never thrown away');
 // Only the two men in the ring, only real people, only bouts on the card.
 for(const bad of [{type:'sumoPredict',id:'makuuchi-38',person:'Damien',winner:'Hoshoryu'},
  {type:'sumoPredict',id:'makuuchi-38',person:'Grandma',winner:'Kirishima'},
  {type:'sumoPredict',id:'nope',person:'Damien',winner:'Kirishima'}])
  assert.throws(()=>applyOperation(state,bad,parent),`${JSON.stringify(bad).slice(0,52)} should be refused`);
 // Picks survive the card being fetched again on the day, the same way results do.
 const refetched=applyOperation(state,card,parent);
 assert.deepEqual(boutPredictions(refetched,'makuuchi-40'),boutPredictions(state,'makuuchi-40'));
 // A bout dropped from a refreshed card takes its picks with it rather than haunting the tally.
 const shorter=applyOperation(state,{...card,bouts:[card.bouts[0]]},parent);
 assert.deepEqual(sumo(shorter).predictions,{});
 // Called in the arena with no signal, which is exactly where this happens.
 const queue=[{operation:{type:'sumoPredict',operationId:'q1',id:'makuuchi-38',person:'Boston',winner:'Daieisho'}}];
 assert.equal(boutPredictions(pendingProgress(state,queue),'makuuchi-38').Boston,'Daieisho');
 assert.equal(boutPredictions(state,'makuuchi-38').Boston,undefined,'the shared trip waits until it syncs');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const list=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 assert.ok(list.includes('sumoPredict'));
});

test('the picks are read as a tipping comp: a ladder and a sheet of who called what',async()=>{
 const {ensureFeatures,predictionLadder,predictionPeople,tippingTable}=await import('../src/trip-features.js');
 const card={type:'sumoUpdate',basho:'Aki Basho 2026',dayNumber:11,venue:'Ryogoku Kokugikan',date:'2026-09-23',
  doorsOpen:'08:00',notes:'',sources:[],bouts:[
   {id:'makuuchi-38',division:'makuuchi',order:38,time:'17:40',east:{name:'Kirishima',rank:'Sekiwake',stable:'Michinoku'},west:{name:'Daieisho',rank:'Komusubi',stable:'Oitekaze'}},
   {id:'makuuchi-40',division:'makuuchi',order:40,time:'17:55',east:{name:'Hoshoryu',rank:'Ozeki',stable:'Tatsunami'},west:{name:'Kotozakura',rank:'Ozeki',stable:'Sadogatake'}}]};
 const members=['Damien','Lauren','Nate','Boston'];
 let state=applyOperation(ensureFeatures(structuredClone(seed)),card,parent);
 // Everybody is on the ladder before a single bout is called, because a comp you join by
 // scoring is one a five-year-old is never on.
 assert.deepEqual(predictionLadder(state,members).map(t=>[t.place,t.name,t.right,t.waiting,t.percent]),
  [[1,'Boston',0,0,null],[1,'Damien',0,0,null],[1,'Lauren',0,0,null],[1,'Nate',0,0,null]]);
 // The sheet is empty until there is something to put on it: the card runs to forty-odd bouts
 // and the comp is only about the ones somebody called or we watched.
 assert.deepEqual(tippingTable(state,members).rows,[]);
 for(const [person,pick] of [['Damien','Hoshoryu'],['Lauren','Kotozakura'],['Nate','Kotozakura']])
  state=applyOperation(state,{type:'sumoPredict',id:'makuuchi-40',person,winner:pick},child);
 state=applyOperation(state,{type:'sumoPredict',id:'makuuchi-38',person:'Damien',winner:'Kirishima'},child);
 state=applyOperation(state,{type:'sumoResult',id:'makuuchi-40',winner:'Kotozakura'},child);
 const ladder=predictionLadder(state,members);
 assert.deepEqual(ladder.map(t=>[t.place,t.name,t.right,t.wrong,t.waiting,t.percent]),
  // Lauren and Nate share first on the same record. Under this ladder's rule — most right,
  // then fewest wrong — Boston has called nothing and so has nothing wrong either, which puts
  // him above Damien's one miss, with no hit rate at all rather than a hit rate of nought.
  [[1,'Lauren',1,0,0,100],[1,'Nate',1,0,0,100],[3,'Boston',0,0,0,null],[4,'Damien',0,1,1,0]]);
 const sheet=tippingTable(state,members);
 // Columns follow the family, not the ladder: a column that moves between bouts is unreadable.
 assert.deepEqual(sheet.people,members);
 assert.deepEqual(predictionPeople(state,members),members);
 // Bouts in running order, and a pick carries the side of the card it was on so four of them
 // fit across a phone.
 assert.deepEqual(sheet.rows.map(r=>[r.id,r.winner]),[['makuuchi-38',null],['makuuchi-40','Kotozakura']]);
 assert.deepEqual(sheet.rows[1].picks.map(p=>[p.name,p.pick,p.side,p.outcome]),
  [['Damien','Hoshoryu','east','wrong'],['Lauren','Kotozakura','west','right'],
   ['Nate','Kotozakura','west','right'],['Boston',null,null,'none']]);
 // The one nobody has watched is still to come rather than wrong, and a bout you sat out is
 // neither.
 assert.deepEqual(sheet.rows[0].picks.map(p=>p.outcome),['waiting','none','none','none']);
 assert.deepEqual(sheet.totals.map(t=>[t.name,t.right,t.wrong,t.waiting,t.called]),
  [['Damien',0,1,1,2],['Lauren',1,0,0,1],['Nate',1,0,0,1],['Boston',0,0,0,0]]);
 // A bout that was watched with nobody calling it still belongs on the sheet: it is the row
 // that says all four of us missed it.
 const watched=applyOperation(state,{type:'sumoResult',id:'makuuchi-38',winner:'Daieisho'},parent);
 const after=tippingTable(watched,members).rows[0];
 assert.equal(after.winner,'Daieisho');
 assert.deepEqual(after.picks.map(p=>p.outcome),['wrong','none','none','none']);
 // Somebody who called a bout without being in the members list — a cousin on the day, or a
 // name since changed — keeps their column rather than dropping off the sheet.
 const guest={...watched,sumo:{...watched.sumo,predictions:{...watched.sumo.predictions,
  'makuuchi-38':{...watched.sumo.predictions['makuuchi-38'],Grandma:'Daieisho'}}}};
 assert.deepEqual(tippingTable(guest,members).people,[...members,'Grandma']);
 assert.equal(predictionLadder(guest,members)[0].name,'Grandma','and is on the ladder where the record puts her');
});

test('a dish on a menu can be seen as well as read, and only Wikimedia can put it on the screen',async()=>{
 const {pictureQueries,pictureSearchUrl,pickPicture,findDishPicture,imageSearchUrl}=await import('../src/dish-picture.js');
 // The plain name the model stripped out of the menu's wording is asked for first: the menu
 // line itself has no article behind it, and the English name is the last resort.
 assert.deepEqual(pictureQueries({dish:'唐揚げ',ja:'名物!若鶏の唐揚げ定食',en:'Fried chicken set'}),
  [['ja','唐揚げ'],['ja','名物!若鶏の唐揚げ定食'],['en','Fried chicken set']]);
 // A dish whose plain name is what the menu printed is not looked up twice.
 assert.deepEqual(pictureQueries({dish:'親子丼',ja:'親子丼',en:'Chicken and egg rice bowl'}),
  [['ja','親子丼'],['en','Chicken and egg rice bowl']]);
 assert.deepEqual(pictureQueries({dish:'',ja:'',en:''}),[]);
 assert.deepEqual(pictureQueries(),[]);

 const url=new URL(pictureSearchUrl('ja','唐揚げ'));
 assert.equal(url.origin,'https://ja.wikipedia.org');
 assert.equal(url.searchParams.get('gsrsearch'),'唐揚げ');
 assert.equal(url.searchParams.get('origin'),'*','without this the browser is refused by CORS');
 assert.equal(url.searchParams.get('formatversion'),'2');
 // Three results asked for, and three thumbnails — pageimages hands back one by default, which
 // is how a dish with a picture looks like a dish without one.
 assert.equal(url.searchParams.get('gsrlimit'),'3');
 assert.equal(url.searchParams.get('pilimit'),'3');
 assert.equal(new URL(pictureSearchUrl('en','Tonkatsu')).origin,'https://en.wikipedia.org');

 const page=(index,title,source,extra={})=>({index,title,...(source?{thumbnail:{source}}:{}),...extra});
 const img='https://upload.wikimedia.org/wikipedia/commons/thumb/a/karaage.jpg/640px-karaage.jpg';
 // The best-ranked result that actually carries a photograph, not the best-ranked result.
 const found=pickPicture({query:{pages:[page(2,'鶏肉',img),page(1,'唐揚げ')]}},'ja');
 assert.equal(found.title,'鶏肉');
 assert.equal(found.src,img);
 assert.equal(found.page,'https://ja.wikipedia.org/wiki/%E9%B6%8F%E8%82%89','a page link is built when the API gives none');
 assert.equal(pickPicture({query:{pages:[page(1,'唐揚げ',img,{fullurl:'https://ja.wikipedia.org/wiki/%E5%94%90%E6%8F%9A%E3%81%92'})]}},'ja').page,
  'https://ja.wikipedia.org/wiki/%E5%94%90%E6%8F%9A%E3%81%92');
 // Nothing but a Wikimedia photograph over HTTPS is put in front of the family.
 for(const bad of ['http://upload.wikimedia.org/a.jpg','https://example.com/a.jpg','not a url','javascript:alert(1)'])
  assert.equal(pickPicture({query:{pages:[page(1,'唐揚げ',bad)]}},'ja'),null,bad);
 for(const empty of [{},{query:{}},{query:{pages:[]}},null])assert.equal(pickPicture(empty,'ja'),null);

 // Japanese is tried before English, and the first language with a picture wins.
 const asked=[];
 const reply=body=>({ok:true,json:async()=>body});
 const picture=await findDishPicture({dish:'ロースかつ',ja:'ロースかつ膳',en:'Pork loin katsu'},async u=>{
  asked.push(new URL(u));
  return reply(asked.length<3?{query:{pages:[page(1,'なにか')]}}:{query:{pages:[page(1,'とんかつ',img)]}});
 });
 assert.equal(picture.title,'とんかつ');
 assert.deepEqual(asked.map(u=>[u.hostname,u.searchParams.get('gsrsearch')]),
  [['ja.wikipedia.org','ロースかつ'],['ja.wikipedia.org','ロースかつ膳'],['en.wikipedia.org','Pork loin katsu']]);

 // A dish nobody has written about comes back as no picture, and is not asked for twice.
 let calls=0;
 const none=async()=>{calls++;return reply({query:{pages:[]}});};
 assert.equal(await findDishPicture({dish:'秘伝の一皿',ja:'秘伝の一皿',en:'House special'},none),null);
 assert.equal(calls,2);
 assert.equal(await findDishPicture({dish:'秘伝の一皿',ja:'秘伝の一皿',en:'House special'},none),null);
 assert.equal(calls,2,'the answer is kept for the rest of the meal');

 // A Wikipedia nobody could reach is a different answer from a dish with no picture, because
 // the screen offers to search the web for one only in the second case.
 await assert.rejects(()=>findDishPicture({dish:'寿司',ja:'寿司',en:'Sushi'},async()=>{throw new Error('offline');}),
  /could not be reached/);
 assert.match(imageSearchUrl('唐揚げ'),/^https:\/\/www\.google\.com\/search\?tbm=isch&q=%E5%94%90%E6%8F%9A%E3%81%92$/);

 // The screen asks for a picture only when somebody presses for one, and the menu reader gets
 // the plain dish name out of the model to look it up with.
 const menu=await readFile(new URL('../src/MenuReader.jsx',import.meta.url),'utf8');
 assert.match(menu,/onClick=\{\(\)=>picture\(i,item\)\}/);
 assert.match(menu,/shot\?'Hide the picture':'See a picture'/);
 assert.doesNotMatch(menu,/useEffect/,'nothing fetches a picture on its own');
 assert.match(menu,/setAdded\(\[\]\);setPictures\(\{\}\)/,'a new menu clears the old pictures');
 assert.match(menu,/A picture of <span lang=\{shot\.found\.language\}>\{shot\.found\.title\}<\/span> from Wikipedia — the dish in general/);
 const server=await readFile(new URL('../server/menu.mjs',import.meta.url),'utf8');
 assert.match(server,/required:\['ja','en','dish',/);
 assert.match(server,/dish:\{type:'string',description:'The plain common name/);
});

test('a packet or a single item off a shelf is read as well as a menu, from what its label prints',async()=>{
 const {createServer}=await import('node:http');
 const {ensureFeatures}=await import('../src/trip-features.js');
 let seen=null;
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen={path:req.url,json:JSON.parse(body)};
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'msg_2',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'end_turn',
    usage:{input_tokens:1200,output_tokens:300},
    content:[{type:'text',text:JSON.stringify({readable:true,ja:'ばかうけ 青のり味',en:'Seaweed rice crackers',dish:'せんべい',maker:'Befco',
     what:'Crunchy puffed rice crackers dusted with green seaweed.',why:'Salty and plain enough for Nate.',forWhom:['Nate','Boston'],matchesOurList:'',
     ingredients:['Rice','Vegetable oil','Soy sauce','Green laver'],allergens:['Wheat','Soy'],spicy:false,heat:'none',spiceNote:'',howTo:'',
     warnings:[],price:'¥198'})}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {readPacket}=await import('../server/menu.mjs');
  const state=ensureFeatures(structuredClone(seed));
  const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const answer=await readPacket({image:`data:image/png;base64,${pixel}`,mediaType:'image/png'},state);
  assert.equal(seen.path,'/v1/messages');
  assert.equal(seen.json.output_config.format.schema.additionalProperties,false);
  assert.ok(seen.json.output_config.format.schema.required.includes('allergens'));
  assert.equal(seen.json.messages[0].content[0].source.data,pixel);
  // A packet is read for what its label prints, never filled in from what such a thing usually holds.
  assert.match(seen.json.system,/read off the label in the photo/);
  assert.match(seen.json.system,/Never fill them in from what a product like this usually contains/);
  assert.match(seen.json.system,/never evidence that it is absent/);
  assert.match(seen.json.system,/alcohol/);
  assert.match(seen.json.messages[0].content[1].text,/Still want to try:/);
  assert.equal(answer.ja,'ばかうけ 青のり味');
  assert.deepEqual(answer.allergens,['Wheat','Soy']);
  assert.deepEqual(answer.usage,{input:1200,output:300});
  // The same guards as the menu, before anything is sent.
  await assert.rejects(()=>readPacket({image:pixel,mediaType:'image/gif'},state),/JPEG, PNG or WebP/);
  await assert.rejects(()=>readPacket({image:'A'.repeat(3_000_001),mediaType:'image/png'},state),/too large/);
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
 // The route is a parent's, like the menu, and takes a photo-sized body.
 const handler=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 assert.match(handler,/\['menu','packet',/);
 assert.match(handler,/route==='packet'&&post\)\{\n\s*parent\(user\)/);
 // And the screen switches between the two, sending a packet to its own reader.
 const screen=await readFile(new URL('../src/MenuReader.jsx',import.meta.url),'utf8');
 assert.match(screen,/request\(packet\?'packet':'menu'/);
 assert.match(screen,/A packet or item/);
 assert.match(screen,/What the label says is in it/);
 assert.match(screen,/a missing allergen is never proof it is not there/);
});

test('what is usually in a dish, and a warning on the ones a five-year-old cannot eat',async()=>{
 const server=await readFile(new URL('../server/menu.mjs',import.meta.url),'utf8');
 // Both come back with the dish rather than costing a second read of the menu.
 assert.match(server,/required:\['ja','en','dish','why','forWhom','matchesOurList','ingredients','spicy','heat','spiceNote','price'\]/);
 // Four grades, and the two that are not spicy at all are the same answer as spicy:false.
 const heat=server.match(/heat:\{type:'string',enum:(\[[^\]]+\])/);
 assert.deepEqual(JSON.parse(heat[1].replace(/'/g,'"')),['none','mild','hot','very hot']);
 // The reader is told what an ingredient list is not, because this is the one place in the app
 // where a wrong answer could matter to somebody with an allergy.
 assert.match(server,/never read as the kitchen's own recipe, never complete, and never evidence that something is absent/);
 assert.match(server,/never present a list of ingredients as complete/);
 assert.doesNotMatch(server,/free of an allergen[^;]*;(?! if it matters)/,'the allergen rule is not softened');
 // What counts as too hot for Nate is spelled out rather than left to the model's taste.
 for(const heat of ['chilli oil','karashi','shichimi','kimchi','mapo'])assert.ok(server.includes(heat),`${heat} is not named as a reason a dish is spicy`);

 const menu=await readFile(new URL('../src/MenuReader.jsx',import.meta.url),'utf8');
 // The warning is on the card, and the ones to watch are counted before any card is opened.
 assert.match(menu,/const hot=\(result\?\.suggestions\|\|\[\]\)\.filter\(i=>i\.spicy\)/);
 assert.match(menu,/hot\.length===1\?'One of these is likely spicy'/);
 assert.match(menu,/hot\.map\(i=>i\.en\)\.join\(', '\)\} — not for Nate/);
 assert.match(menu,/item\.spicy&&<p className=\{`dish-warning/);
 // A dish with no note of its own still warns rather than showing an empty warning.
 assert.match(menu,/item\.spiceNote\|\|'Ask how hot it is before you order it for the boys\.'/);
 // The list is offered only when there is one, and opening it is the reader's own choice.
 assert.match(menu,/\{!!\(item\.ingredients\|\|\[\]\)\.length&&<button aria-expanded=\{!!open\}/);
 assert.match(menu,/open\?'Hide ingredients':'See ingredients'/);
 assert.match(menu,/setPictures\(\{\}\);setOpened\(\{\}\)/,'a new menu closes the old lists');
 // And it says on the screen, next to the list itself, what the list is not.
 assert.match(menu,/not read off the menu, and not this kitchen's own recipe/);
 assert.match(menu,/ask the staff about anything allergy-related/);

 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 for(const rule of ['.menu-spicy','.dish-warning','.dish-ingredients'])assert.ok(css.includes(rule),`${rule} has no style`);
});

test('a swipe is a swipe, a scroll is a scroll, and a drag on a button is neither',async()=>{
 const {swipeDelta,isControl,typesText,stepIndex,SWIPE}=await import('../src/swipe.js');
 const from={x:200,y:300};
 assert.equal(swipeDelta(from,{x:200-SWIPE.across-1,y:300}),1,'left takes you on');
 assert.equal(swipeDelta(from,{x:200+SWIPE.across+1,y:300}),-1,'right takes you back');
 // Not far enough across is a tap that moved, not a swipe.
 assert.equal(swipeDelta(from,{x:200-SWIPE.across+1,y:300}),0);
 // Far enough across but a long way down is somebody scrolling the page.
 assert.equal(swipeDelta(from,{x:0,y:300+SWIPE.down+1}),0);
 assert.equal(swipeDelta(from,{x:0,y:300-SWIPE.down-1}),0);
 assert.equal(swipeDelta(null,{x:0,y:0}),0);
 assert.equal(swipeDelta(from,{x:NaN,y:0}),0);
 // Whether an arrow key belongs to what has focus is a DIFFERENT question from whether a
 // drag started on a control. A focused button does nothing with an arrow key, so swallowing
 // it there leaves the keyboard dead after every tap — which is what it did.
 for(const tag of ['INPUT','textarea','Select'])assert.ok(typesText({tagName:tag}),tag);
 for(const tag of ['BUTTON','A','AUDIO','DIV','SUMMARY'])assert.ok(!typesText({tagName:tag}),tag);
 assert.ok(typesText({tagName:'DIV',isContentEditable:true}),'and a box you can type in');
 assert.ok(!typesText(null));
 // A drag that began on something you press is not a page turn. Audio is in there because a
 // recorded phrase has a scrub bar and dragging it must not turn the card.
 for(const tag of ['BUTTON','a','Input','SELECT','TEXTAREA','AUDIO','summary','LABEL'])assert.ok(isControl(tag),tag);
 for(const tag of ['DIV','P','STRONG','SPAN',''])assert.ok(!isControl(tag),tag);
 assert.ok(!isControl(undefined));
 // It stops at both ends rather than wrapping, and a move that goes nowhere goes nowhere.
 assert.equal(stepIndex(0,-1,10),0);
 assert.equal(stepIndex(9,1,10),9);
 assert.equal(stepIndex(4,1,10),5);
 assert.equal(stepIndex(4,-1,10),3);
 assert.equal(stepIndex(0,0,10),0);
 assert.equal(stepIndex(5,1,0),0,'an empty deck has nowhere to go');
});

test('the phrases can be gone through one at a time, over exactly what the list is showing',async()=>{
 const source=await readFile(new URL('../src/Phrasebook.jsx',import.meta.url),'utf8');
 // Both ways of going through them, and the phone remembers which you like.
 assert.match(source,/localStorage\.getItem\('japan\.phrasemode'\)/);
 // The list is still the default for everyone who can read one; Nate is the exception, and
 // he is the reason the exception exists.
 assert.match(source,/const suits=user\?\.name==='Nate'\?'nate':'list'/);
 // The deck is built from the same filtered sections the list renders, so a search cannot
 // show one set and swipe through another.
 assert.match(source,/const deck=\[\s*\.\.\.sections\.flatMap/);
 assert.match(source,/<PhraseDeck phrases=\{deck\}/);
 // One place decides which card is showing, so the swipe, the keys and the buttons cannot
 // drift apart. Inside the deck the only other setIndex is the reset a new search needs.
 const body=source.slice(source.indexOf('function PhraseDeck'),source.indexOf('export default function Phrasebook'));
 assert.match(body,/const move=delta=>setIndex\(i=>stepIndex\(/);
 assert.deepEqual([...body.matchAll(/setIndex\(([^)]*)/g)].map(m=>m[1]),['0','i=>stepIndex(Math.min(i,phrases.length-1'],
  'every turn goes through move, and nothing sets the card behind its back');
 for(const caller of ['if(delta)move(delta)',"e.key==='ArrowLeft')move(-1)",'onClick={()=>move(-1)}','onClick={()=>move(1)}'])
  assert.ok(body.includes(caller),caller);
 // A drag on a control is not a turn, and the keys are let go of again.
 assert.match(source,/isControl\(e\.target\?\.tagName\)/,'a drag on a control is not a turn');
 assert.match(source,/typesText\(e\.target\)/,'and an arrow key in a field stays in the field');
 assert.match(source,/removeEventListener\('keydown',onKey\)/);
 // The card scrolls up and down normally while taking a sideways swipe.
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.phrase-deck\{[^}]*touch-action:pan-y/);
});

test('a Japanese email body survives the trip from HTML entities to readable text',()=>{
 const html='<p>&#20104;&#32004;&#30906;&#35469;</p><div>Check-in&nbsp;15:00<br>Room&#x20;A</div><script>alert(1)</script><style>p{color:red}</style>';
 const text=htmlToText(html);
 assert.equal(text,'予約確認\nCheck-in 15:00\nRoom A');
 assert.ok(!/alert|color:red/.test(text));
 // An email that is already plain text is left exactly as the sender wrote it.
 assert.equal(parseInbound({FromFull:{Email:'Damien@Example.com'},Subject:'Hotel',TextBody:'  Line one\n\nLine two  '}).text,'Line one\n\nLine two');
});
test('an inbound email is read defensively: sender, spam and shape are all checked before anything is kept',()=>{
 const base={FromFull:{Email:'damien.pasfield@gmail.com'},Subject:'Booking',TextBody:'Confirmed.'};
 const mail=parseInbound(base);
 assert.equal(mail.from,'damien.pasfield@gmail.com');assert.equal(mail.spam,false);
 // The From header, not just FromFull, and with the display name stripped off it.
 assert.equal(parseInbound({From:'Damien Pasfield <Damien.Pasfield@Gmail.com>',TextBody:'x'}).from,'damien.pasfield@gmail.com');
 // A body that is HTML only still arrives as words.
 assert.equal(parseInbound({...base,TextBody:'',HtmlBody:'<p>Hello</p>'}).text,'Hello');
 assert.equal(parseInbound({...base,Headers:[{Name:'X-Spam-Status',Value:'Yes, score=9.1'}]}).spam,true);
 assert.equal(parseInbound({Subject:'No sender',TextBody:'x'}),null);
 assert.equal(parseInbound('not an object'),null);
 // Ten attachments is the ceiling, and an empty one is not an attachment.
 const many=parseInbound({...base,Attachments:[...Array(14)].map((_,i)=>({Name:`f${i}.pdf`,ContentType:'application/pdf',Content:'AAAA'}))});
 assert.equal(many.attachments.length,10);
 assert.equal(parseInbound({...base,Attachments:[{Name:'empty.pdf',ContentType:'application/pdf',Content:''}]}).attachments.length,0);
 // A filename from an email never becomes a path.
 assert.equal(parseInbound({...base,Attachments:[{Name:'../../etc/passwd',ContentType:'application/pdf',Content:'AAAA'}]}).attachments[0].filename,'.._.._etc_passwd');
});
test('API: a forwarded email waits in the inbox, and only the right secret and the right sender get in',async()=>{
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 process.env.EMAIL_INBOX_SECRET='s3cret-forwarding-key';
 process.env.EMAIL_INBOX_SENDERS='damien.pasfield@gmail.com, lauren@example.com';
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const email=(secret,mail,init={})=>fetch(`${base}/api/email-in/${secret}`,{method:'POST',headers:{'Content-Type':'application/json',...init.headers},body:JSON.stringify(mail)});
 const hotel={FromFull:{Email:'Damien.Pasfield@gmail.com'},Subject:'ホテル予約確認',TextBody:'チェックインは15時です。',Date:'2026-09-20T09:00:00Z'};
 try{
  const config=await(await fetch(base+'/api/config')).json();assert.equal(config.emailInbox,true);
  // A wrong secret is answered like a wrong address: nothing to learn from it.
  assert.equal((await email('wrong-key',hotel)).status,404);
  assert.equal((await fetch(base+'/api/email-in',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(hotel)})).status,404);
  // The provider's own way of carrying the secret works too.
  const basic=await email('nope',hotel,{headers:{Authorization:'Basic '+Buffer.from('postmark:s3cret-forwarding-key').toString('base64')}});
  assert.equal((await basic.json()).filed,true);
  // Somebody else's email is dropped, but answered 200 so it is not retried all day.
  const stranger=await email('s3cret-forwarding-key',{FromFull:{Email:'spammer@elsewhere.test'},Subject:'You have won',TextBody:'Click here'});
  assert.equal(stranger.status,200);assert.equal((await stranger.json()).reason,'sender');
  const spam=await email('s3cret-forwarding-key',{...hotel,Headers:[{Name:'X-Spam-Status',Value:'Yes, score=12'}]});
  assert.equal((await spam.json()).reason,'spam');
  const accepted=await email('s3cret-forwarding-key',{...hotel,Attachments:[{Name:'voucher.pdf',ContentType:'application/pdf',Content:Buffer.from('%PDF-1.4 voucher').toString('base64')}]});
  assert.equal((await accepted.json()).filed,true);
  const {state,revision}=await(await fetch(base+'/api/state')).json();
  assert.equal(state.inbox.length,2);
  const item=state.inbox.find(i=>i.attachments.length);
  assert.equal(item.from,'damien.pasfield@gmail.com');assert.equal(item.subject,'ホテル予約確認');
  assert.equal(item.text,'チェックインは15時です。');assert.equal(item.reading,null);
  // With no Blob store connected the file cannot be kept, and the email says so rather than
  // pretending it has one.
  assert.equal(item.attachments[0].pathname,null);assert.match(item.attachments[0].skipped,/storage/i);
  // Filing it is a person's decision, and it is what puts it on the trip.
  const filed=await fetch(base+'/api/mutate',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},
   body:JSON.stringify({revision,operation:{type:'inboxFile',id:item.id,title:'Kyoto hotel',category:'reservation',person:'Family',day:state.days[2].date,notes:'Check in from 15:00.'}})});
  assert.equal(filed.status,200);
  const after=(await filed.json()).state;
  assert.equal(after.inbox.length,1);
  const doc=after.documents.find(d=>d.title==='Kyoto hotel');
  assert.equal(doc.category,'reservation');assert.equal(doc.day,state.days[2].date);assert.equal(doc.source,'email');
  assert.equal(doc.from,'damien.pasfield@gmail.com');assert.equal(doc.type,'note');assert.equal(doc.notes,'Check in from 15:00.');
  assert.equal((await(await fetch(base+'/api/inbox-file?id=nothing')).json()).error,'That attachment is not in the inbox.');
 }finally{
  delete process.env.LOCAL_DEMO;delete process.env.EMAIL_INBOX_SECRET;delete process.env.EMAIL_INBOX_SENDERS;
  await new Promise(r=>server.close(r));
 }
});
test('filing a forwarded email keeps its files together and its English where the phone can read it',()=>{
 const files=[{id:'f1',filename:'ticket.pdf',type:'application/pdf',size:120,pathname:'inbox/a/0-ticket.pdf'},
  {id:'f2',filename:'map.png',type:'image/png',size:90,pathname:'inbox/a/1-map.png'},
  {id:'f3',filename:'huge.mov',type:'video/quicktime',size:1,pathname:null,skipped:'This kind of file, or its size, is not accepted.'}];
 const item={id:'mail-1',from:'lauren@example.com',subject:'新幹線',receivedAt:'2026-09-25T02:00:00.000Z',text:'原文',
  attachments:files,reading:{readable:true,kind:'train ticket',language:'Japanese',title:'Nozomi 33 tickets',
   summary:['Two adults, two children.'],translation:'Nozomi 33, car 7.',actions:[{what:'Collect at the machine',when:'27 Sep'}]}};
 const seeded={...structuredClone(seed),inbox:[item]};
 const next=applyOperation(seeded,{type:'inboxFile',id:'mail-1',title:'Nozomi 33 tickets',category:'ticket',person:'Family'},parent);
 assert.equal(next.inbox.length,0);
 const root=next.documents.find(d=>d.title==='Nozomi 33 tickets');
 assert.equal(root.pathname,'inbox/a/0-ticket.pdf');assert.equal(root.category,'ticket');
 // The English is written into the ticket itself, so it is still readable with no signal.
 assert.match(root.notes,/Nozomi 33, car 7\./);assert.match(root.notes,/Collect at the machine — 27 Sep/);
 assert.match(root.notes,/Forwarded from lauren@example\.com on 2026-09-25/);
 const child=next.documents.find(d=>d.parentDocumentId===root.id);
 assert.equal(child.pathname,'inbox/a/1-map.png');assert.equal(child.notes,'');
 // The file that could not be kept does not become a document pointing at nothing.
 assert.equal(next.documents.filter(d=>d.source==='email').length,2);
 // A child cannot file or discard one, and neither can be aimed at a day and an activity at once.
 assert.throws(()=>applyOperation(seeded,{type:'inboxFile',id:'mail-1',title:'x'},child_),/parent/i);
 assert.throws(()=>applyOperation(seeded,{type:'inboxDiscard',id:'mail-1'},child_),/parent/i);
 assert.throws(()=>applyOperation(seeded,{type:'inboxFile',id:'mail-1',title:'x',day:seed.days[0].date,stepId:seed.steps[0].id},parent),/activity or a day/);
 assert.throws(()=>applyOperation(seeded,{type:'inboxFile',id:'gone',title:'x'},parent),/no longer in the inbox/);
 assert.throws(()=>applyOperation(seeded,{type:'inboxFile',id:'mail-1',title:'  '},parent),/title/i);
 assert.equal(applyOperation(seeded,{type:'inboxDiscard',id:'mail-1'},parent).inbox.length,0);
 // The inbox is a queue to work through, not an archive that grows without end.
 const many={...structuredClone(seed),inbox:[]};
 let piled=many;for(let i=0;i<MAX_INBOX+6;i++)piled=addToInbox(piled,{...item,id:`mail-${i}`});
 assert.equal(piled.inbox.length,MAX_INBOX);assert.equal(piled.inbox[0].id,`mail-${MAX_INBOX+5}`);
});
test('a forwarded email is a parent\'s to read, and the boys\' phones are never sent it',async()=>{
 const {visibleTrip}=await import('../server/visibility.mjs');
 const item={id:'mail-1',from:'damien.pasfield@gmail.com',subject:'Bank reference',text:'Account 1234.',attachments:[],reading:null};
 const state={...structuredClone(seed),inbox:[item],games:{scores:{},janken:{round:null,scores:{}}}};
 assert.equal(visibleTrip(state,parent).inbox.length,1);
 assert.equal(visibleTrip(state,{name:'Lauren',role:'parent'}).inbox.length,1);
 // Not hidden in the screen — removed from the answer, so no phone can fetch its way to it.
 assert.deepEqual(visibleTrip(state,child).inbox,[]);
 assert.deepEqual(visibleTrip(state,{name:'Boston',role:'child'}).inbox,[]);
 // Redacting a copy never touches what is stored for the family.
 assert.equal(state.inbox.length,1);
});
test('a forwarded email goes where the parent sends it, not only into Tickets',()=>{
 const file={id:'f1',filename:'voucher.pdf',type:'application/pdf',size:120,pathname:'inbox/m1/0-voucher.pdf'};
 const item={id:'m1',from:'damien.pasfield@gmail.com',subject:'ご予約',receivedAt:'2026-09-20T00:00:00.000Z',
  text:'Original',attachments:[file],reading:{readable:true,kind:'hotel letter',title:'Kyoto ryokan',
   summary:['Check in from 15:00.'],translation:'Check in from 15:00.',actions:[]}};
 const seeded={...structuredClone(seed),inbox:[item]},day=seed.days[3].date;
 const file_=(extra)=>applyOperation(seeded,{type:'inboxFile',id:'m1',title:'Kyoto ryokan',...extra},parent);
 // On a day, with a time: the same locked step as one typed in by hand, and the email's file
 // travels with it instead of being left behind in Tickets on its own.
 const onDay=file_({destination:'activity',day,time:'14:30'});
 const step=onDay.steps.find(s=>s.title==='Kyoto ryokan');
 assert.equal(step.day,day);assert.equal(step.time,'14:30');assert.equal(step.locked,true);
 assert.equal(step.bookingTime,'14:30');assert.equal(step.status,'todo');
 assert.match(step.notes,/Check in from 15:00\./);
 const carried=onDay.documents.find(d=>d.source==='email');
 assert.equal(carried.stepId,step.id);assert.equal(carried.day,null);assert.equal(carried.pathname,file.pathname);
 assert.ok(onDay.alerts[0].summary.includes('Kyoto ryokan'));
 // Options: the same activity with no day, and no time it could not honour.
 const options=file_({destination:'options'});
 const parked=options.steps.find(s=>s.title==='Kyoto ryokan');
 assert.equal(parked.day,null);assert.equal(parked.time,null);assert.equal(parked.locked,false);
 // The planning board, where the family votes on it before it gets a day.
 const idea=file_({destination:'idea',ideaKind:'food',day});
 const proposal=idea.proposals.at(-1);
 assert.equal(proposal.title,'Kyoto ryokan');assert.equal(proposal.category,'food');
 assert.equal(proposal.day,day);assert.equal(proposal.addedBy,'Damien');assert.equal(proposal.stepId,null);
 assert.match(idea.alerts[0].summary,/added Kyoto ryokan to the planning board/);
 // The to-do list, with the file still findable in Tickets against that day.
 const todo=file_({destination:'todo',todoKind:'buy',day,title:'Pay the balance'});
 assert.equal(todo.todos.at(-1).kind,'buy');assert.equal(todo.todos.at(-1).day,day);
 assert.equal(todo.documents.find(d=>d.source==='email').day,day);
 // With nothing attached, only a ticket needs a document: everywhere else already holds the
 // English on the thing that was just created.
 const bare={...structuredClone(seed),inbox:[{...item,attachments:[]}]};
 const bareTodo=applyOperation(bare,{type:'inboxFile',id:'m1',title:'Pay the balance',destination:'todo'},parent);
 assert.equal(bareTodo.documents.length,seed.documents.length);
 assert.match(bareTodo.todos.at(-1).notes,/Check in from 15:00\./);
 assert.equal(applyOperation(bare,{type:'inboxFile',id:'m1',title:'Kyoto ryokan'},parent).documents.length,seed.documents.length+1);
 // Nowhere invented, and an activity always lands on a real day.
 assert.throws(()=>file_({destination:'somewhere-else'}),/where this email goes/);
 assert.throws(()=>file_({destination:'activity'}),/trip day/);
 assert.throws(()=>file_({destination:'activity',day:'2020-01-01'}),/trip day/);
 // Whichever door it went through, it leaves the inbox exactly once.
 for(const d of ['ticket','activity','options','idea','todo'])assert.equal(file_({destination:d,day}).inbox.length,0);
});

test('a photo belongs to somebody, which is not always whoever put it on',async()=>{
 const {ensureFeatures,photoOwner,photosOf,photoCounts,photosFor}=await import('../src/trip-features.js');
 const boston={name:'Boston',role:'child'};
 let state=ensureFeatures(structuredClone(seed));
 const day=state.days[0].date,other=state.days[1].date;
 state.photos=[
  {id:'a',by:'Damien',for:'Nate',day,at:'2026-09-21T01:00:00.000Z'},
  {id:'b',by:'Boston',for:'Boston',day,at:'2026-09-21T02:00:00.000Z'},
  // Written before photos could be handed over: it belongs to whoever added it, which is not
  // a guess, it is what was true at the time.
  {id:'c',by:'Nate',day:other,at:'2026-09-21T03:00:00.000Z'}
 ];
 assert.equal(photoOwner(state.photos[0]),'Nate','a parent can take one for a boy');
 assert.equal(photoOwner(state.photos[2]),'Nate','and an older one is still his');
 assert.equal(photoOwner(null),'');
 // A name gets you the whole trip, newest first, not one day of it.
 assert.deepEqual(photosOf(state,'Nate').map(p=>p.id),['c','a']);
 assert.deepEqual(photosOf(state,'Nate',day).map(p=>p.id),['a']);
 assert.deepEqual(photosOf(state,'Lauren'),[]);
 assert.deepEqual(photoCounts(state),{Nate:2,Boston:1});
 assert.deepEqual(photoCounts(state,day),{Nate:1,Boston:1});
 // Handing one over afterwards, because whose it is gets worked out once everyone has seen it.
 let handed=applyOperation(state,{type:'photoAssign',id:'b',person:'Nate'},parent);
 assert.equal(photoOwner(handed.photos.find(p=>p.id==='b')),'Nate');
 assert.equal(handed.photos.find(p=>p.id==='b').by,'Boston','and who added it is not rewritten');
 // A boy can hand over one he added, and nobody else's.
 assert.equal(photoOwner(applyOperation(state,{type:'photoAssign',id:'b',person:'Nate'},boston).photos.find(p=>p.id==='b')),'Nate');
 assert.throws(()=>applyOperation(state,{type:'photoAssign',id:'a',person:'Boston'},boston),/parent/i);
 assert.throws(()=>applyOperation(state,{type:'photoAssign',id:'b',person:'Nobody'},parent),/family member/i);
 assert.throws(()=>applyOperation(state,{type:'photoAssign',id:'gone',person:'Nate'},parent),/not found/i);
 // Removing: yours if it is your photo OR you are the one who put it on.
 assert.equal(applyOperation(state,{type:'photoRemove',id:'b'},boston).photos.length,2);
 assert.equal(applyOperation(state,{type:'photoRemove',id:'a'},{name:'Nate',role:'child'}).photos.length,2,
  'a boy can remove a photo that was handed to him');
 assert.throws(()=>applyOperation(state,{type:'photoRemove',id:'a'},boston),/only remove your own/i);
 // The vote still names the owner rather than the uploader.
 const {photoOfTheDay}=await import('../src/trip-features.js');
 const voted={...state,photoVotes:{[day]:{Damien:'a',Lauren:'a'}}};
 assert.deepEqual(photoOfTheDay(voted,day).winners.map(photoOwner),['Nate']);
});

test('the photos live behind a filter rather than another entry in the menu',async()=>{
 const {PAGES,moreIds}=await import('../src/nav-data.js');
 const page=await readFile(new URL('../src/PhotoDay.jsx',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const party=await readFile(new URL('../src/PlanningParty.jsx',import.meta.url),'utf8');
 // One entry, not two: twenty-two is already a long menu.
 assert.equal(Object.keys(PAGES).filter(id=>/photo/i.test(id)).length,1);
 assert.match(PAGES.photos.note,/whose is whose/);
 // Whose photos you are looking at is in the address, so a profile links straight to it and
 // the back button does what it looks like it does.
 assert.match(main,/get\('who'\)/);
 assert.match(main,/\{tab:'photos',who:name\}/);
 assert.match(party,/href=\{`\/\?tab=photos&who=\$\{encodeURIComponent\(name\)\}`\}/);
 // A named person is their whole trip; nobody named is today, which is what the vote is for.
 assert.match(page,/const whole=!!person;/);
 assert.match(page,/whole\?photosOf\(state,person\):photosFor\(state,day\)/);
 // Voting is a thing you do to a day, so it is not offered on a whole-trip view.
 assert.match(page,/\{!whole&&<button type="button" className=\{myVote===p\.id\?'primary':''\}/);
 // The twelve-a-day allowance is the owner's, not the uploader's.
 const handler=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 assert.match(handler,/p\.for\|\|p\.by\)===owner&&p\.day===b\.day\).length>=12/);
 assert.match(handler,/user\.role!=='parent'&&owner!==user\.name/,'a boy can only speak for himself');
});

test('every phrase, katakana word and menu word says when you would actually use it',async()=>{
 const {PHRASEBOOK,ALL_PHRASES}=await import('../src/phrasebook-data.js');
 const {LOANWORDS}=await import('../src/kana-data.js');
 const {MENU_WORDS}=await import('../src/food-data.js');
 const lists=[
  ['phrase',ALL_PHRASES(),p=>p.note,p=>p.en],
  ['katakana word',LOANWORDS,w=>w.where,w=>w.ja],
  ['menu word',MENU_WORDS,w=>w.note,w=>w.en]
 ];
 for(const [kind,items,explain,name] of lists){
  for(const item of items){
   const said=explain(item);
   assert.ok(said&&said.trim(),`the ${kind} "${name(item)}" does not say when you would use it`);
   assert.ok(said.length>=20,`"${name(item)}" is explained too thinly: ${said}`);
   assert.ok(said.length<=320,`"${name(item)}" runs on: ${said}`);
   assert.ok(/[.!?]$/.test(said.trim()),`"${name(item)}" is not a finished sentence: ${said}`);
  }
  // A note copied from one entry to another is worse than none: it reads as an answer and
  // is not one.
  const said=items.map(explain);
  assert.equal(new Set(said).size,said.length,`two ${kind}s share an explanation`);
 }
 // Every section says what it is for as well.
 for(const section of PHRASEBOOK)assert.ok(section.note?.trim(),`${section.title} has no line`);
 assert.equal(new Set(PHRASEBOOK.map(s=>s.note)).size,PHRASEBOOK.length);
 // The one about allergies has to keep pointing at the staff rather than at us.
 const allergy=ALL_PHRASES().find(p=>p.id==='allergy');
 assert.match(allergy.note,/confirm/i);
 assert.match(allergy.note,/never trust a translation/i);
 // And the explanation is shown wherever the word is, not just on the phrases.
 const page=await readFile(new URL('../src/Phrasebook.jsx',import.meta.url),'utf8');
 assert.match(page,/\{w\.note&&<small className="menu-word-note">\{w\.note\}<\/small>\}/);
});

test('a five-year-old can sound anything out without reading a word of it',async()=>{
 const {VOWELS,MOUTH,CHUNK_VOWEL,vowelOf,soundBubbles,bubbleRows}=await import('../src/phonics.js');
 const {ALL_PHRASES}=await import('../src/phrasebook-data.js');
 const {MENU_WORDS}=await import('../src/food-data.js');
 const {phonicChunks}=await import('../src/speech.js');
 // Five vowels, five mouths, five colours — the whole idea is that there are only five.
 assert.equal(VOWELS.length,5);
 assert.deepEqual(VOWELS.map(v=>v.id),['a','i','u','e','o']);
 assert.equal(new Set(VOWELS.map(v=>v.colour)).size,5,'a colour each, or they cannot be told apart');
 for(const v of VOWELS){
  assert.ok(MOUTH[v.id],`${v.id} has no mouth to make`);
  assert.ok(v.hint.length>20,`${v.id} does not say what the mouth does`);
 }
 // The mouths have to differ from each other, or the picture says nothing.
 assert.equal(new Set(Object.values(MOUTH).map(m=>`${m.rx}x${m.ry}`)).size,5);
 // "ee" is the widest and flattest, "oo" the smallest — if that ever stops being true the
 // pictures are lying about the sound.
 assert.ok(MOUTH.i.rx>MOUTH.u.rx&&MOUTH.i.ry<MOUTH.u.ry);
 assert.ok(MOUTH.a.ry>MOUTH.i.ry,'“ah” is the open one');
 // Every syllable anywhere in the phrasebook or on a menu has a mouth. A bubble with no
 // picture is a bubble he has to read, which is the thing this exists to avoid.
 for(const item of [...ALL_PHRASES(),...MENU_WORDS])
  for(const bubble of soundBubbles(item.say))
   assert.ok(bubble.vowel,`“${bubble.text}” in “${item.en}” has no mouth`);
 // Written out rather than guessed from the spelling, because the tricky ones are the common
 // ones: ます swallows its u, and あい opens on the a.
 assert.equal(vowelOf('mass'),'a');
 assert.equal(vowelOf('dess'),'e');
 assert.equal(vowelOf('guy'),'a');
 assert.equal(vowelOf('sigh'),'a');
 assert.equal(vowelOf('koo'),'u');
 assert.equal(vowelOf('SHEE'),'i','however it is capitalised');
 assert.equal(vowelOf('nonsense'),null);
 assert.equal(vowelOf(''),null);
 for(const v of Object.values(CHUNK_VOWEL))assert.ok(MOUTH[v],v);
 // The bubbles are the same syllables the written sounding-out uses, with the dashes gone.
 const say='soo-mee-ma-sen';
 assert.deepEqual(soundBubbles(say).map(b=>b.text),phonicChunks(say).filter(c=>/[a-z]/i.test(c.text)).map(c=>c.text));
 assert.deepEqual(soundBubbles(say).map(b=>b.vowel),['u','i','a','e']);
 assert.deepEqual(soundBubbles(say).map(b=>b.index),[0,1,2,3]);
 // Four to a row: more than that and a five-year-old stops seeing them.
 assert.deepEqual(bubbleRows('a-b-c-d-e-f').map(r=>r.length),[4,2]);
 assert.deepEqual(bubbleRows(''),[]);
});

test('every phrase has a picture of what it means, so it can be found without reading',async()=>{
 const {ALL_PHRASES}=await import('../src/phrasebook-data.js');
 const all=ALL_PHRASES();
 for(const p of all){
  assert.ok(p.icon,`“${p.en}” has no picture`);
  // A flag is two code points and a variation selector is a third. Anything longer is a
  // joined sequence, which falls apart into separate people on a phone that lacks it.
  assert.ok([...p.icon].length<=3,`“${p.en}” uses a joined emoji: ${[...p.icon].length} code points`);
  assert.ok(!p.icon.includes('\u200d'),`“${p.en}” uses a zero-width joiner`);
 }
 // Two phrases wearing the same picture is worse than none — he picks by picture.
 const icons=all.map(p=>p.icon);
 assert.equal(new Set(icons).size,icons.length,'two phrases share a picture');
 const page=await readFile(new URL('../src/Phrasebook.jsx',import.meta.url),'utf8');
 const out=await readFile(new URL('../src/SoundOut.jsx',import.meta.url),'utf8');
 // Nate's card carries the picture, the Japanese and the mouths — and no romaji, no notes,
 // and no sounding-out line to read.
 assert.match(page,/<span className="phrase-picture"/);
 assert.match(page,/mode==='nate'/);
 assert.match(page,/<SoundOut phrase=\{phrase\}\/>/);
 const young=page.slice(page.indexOf('phrase-card young'),page.indexOf(':<div className="phrase-card"'));
 assert.doesNotMatch(young,/SayIt|phrase\.note|romaji/,'nothing on his card has to be read');
 // A tapped mouth says that syllable on its own and slowly; the big button says the lot.
 assert.match(out,/read\(`chunk-\$\{phrase\.id\}-\$\{bubble\.index\}`,bubble\.text,'en-AU',SLOW_RATE\)/);
 // Where somebody has recorded the phrase, that is what "all together" plays.
 assert.match(out,/clip\s*\?<ClipButton clip=\{clip\} label="All together"\/>/);
 // The daily pop-up is where he actually meets a phrase, so it carries the picture too.
 assert.match(page,/\{phrase\.icon&&<span className="phrase-picture small"/);
 // And he starts on his own mode rather than on a list of fifty-three written phrases.
 assert.match(page,/const suits=user\?\.name==='Nate'\?'nate':'list'/);
 assert.match(page,/localStorage\.getItem\('japan\.phrasemode'\)\|\|suits/,'and anybody can change it');
});

test('the origami diagrams are folded rather than drawn, so they cannot disagree with each other',async()=>{
 const o=await import('../src/origami-data.js');
 // A fold is a reflection. Get that wrong and every diagram after it is wrong too.
 assert.deepEqual(o.reflect([0,0],[5,0],[5,9]).map(Math.round),[10,0]);
 assert.deepEqual(o.reflect([2,8],[0,0],[10,0]).map(Math.round),[2,-8]);
 assert.deepEqual(o.reflect([3,4],[0,0],[0,0]),[3,4],'a crease with no length folds nothing');
 assert.equal(o.sideOf([1,1],[0,0],[10,0]),-o.sideOf([1,-1],[0,0],[10,0]));
 assert.equal(o.sideOf([5,0],[0,0],[10,0]),0,'on the crease is neither side');
 // Half a square, cut along the middle.
 const half=o.clipToSide([[0,0],[10,0],[10,10],[0,10]],[0,5],[10,5],o.sideOf([5,0],[0,5],[10,5]));
 assert.equal(half.length,4);
 assert.ok(half.every(([,y])=>y<=5.0001));
 // "Fold this corner onto that one" lands the corner exactly on the other one — which is what
 // the instruction says, so the picture has to agree with the words.
 const crease=o.creaseBringing([0,0],[10,10]);
 assert.deepEqual(o.reflect([0,0],crease[0],crease[1]).map(n=>Math.round(n*1e6)/1e6),[10,10]);
 assert.equal(o.creaseBringing([4,4],[4,4]),null);
 // Which side moves is worked out from the corner being folded, never written down: a sign
 // copied wrongly is invisible in the source and obvious in the diagram.
 const spec=o.foldSpec({bring:[10,10],to:[90,90]});
 assert.equal(o.sideOf([10,10],spec.crease[0],spec.crease[1]),spec.move);
 assert.equal(o.foldSpec({through:[[0,50],[100,50]]}),null,'a fold with nothing moving is not a fold');
 assert.equal(o.foldSpec(null),null);
 // Folding a square in half leaves two layers lying on top of each other.
 const folded=o.foldLayers([o.PAPER],[0,50],[100,50],o.sideOf([50,10],[0,50],[100,50]));
 assert.equal(folded.length,2);
 for(const layer of folded)assert.ok(layer.every(([,y])=>y>=49.999),'both layers end up on the same side');
 // Turning it over is a mirror about the PAPER, so it stays where it was rather than jumping
 // across the card — and the stack reverses, because what was the back is now the front.
 const over=o.flipLayers([[[10,20],[30,20],[30,40]],[[12,22],[28,22],[28,38]]]);
 assert.deepEqual(o.boundsOf(over),o.boundsOf([[[10,20],[30,20],[30,40]],[[12,22],[28,22],[28,38]]]),
  'it does not move');
 assert.deepEqual(over[0][0],[28,22],'the layer that was underneath is on top now');
 assert.deepEqual(o.flipLayers(o.flipLayers(over)),over,'and twice is where you started');
 // A rotation is re-fitted, or the step that needs looking at hardest walks off the card.
 const spun=o.fitLayers(o.rotateLayers([o.PAPER],37));
 const b=o.boundsOf(spun);
 assert.ok(b.minX>=9.99&&b.maxX<=90.01&&b.minY>=9.99&&b.maxY<=90.01);
 assert.equal(o.boundsOf([]),null);
 // The crease is trimmed to the paper: a perpendicular bisector is an infinite line and drawn
 // as one it stops looking like a fold in a sheet.
 const trimmed=o.creaseInBox([[-400,50],[400,50]],{minX:10,maxX:90,minY:10,maxY:90});
 assert.deepEqual(trimmed.map(p=>p.map(n=>Math.round(n*1e6)/1e6)),[[10,50],[90,50]]);
 assert.equal(o.creaseInBox([[5,0],[5,100]],{minX:10,maxX:90,minY:10,maxY:90}),null,'and misses entirely when it should');
 assert.equal(o.creaseInBox(null,{minX:0,maxX:1,minY:0,maxY:1}),null);
});

test('every origami model folds all the way to something, with a sentence at each step',async()=>{
 const {ORIGAMI,modelById,stepFrames,foldSpec,origamiGame,boundsOf}=await import('../src/origami-data.js');
 assert.ok(ORIGAMI.length>=1);
 assert.equal(new Set(ORIGAMI.map(m=>m.id)).size,ORIGAMI.length);
 for(const model of ORIGAMI){
  assert.ok(model.name&&model.ja&&model.icon,model.id);
  assert.ok(model.about.length>40&&model.finish.length>20,`${model.id} does not say what it becomes`);
  assert.ok(origamiGame(model.id).length<=40,'the server refuses a longer game name');
  const steps=stepFrames(model);
  assert.equal(steps.length,model.steps.length+1,'the finished thing is a step of its own');
  assert.ok(steps.at(-1).done);
  for(const step of steps){
   assert.ok(step.say&&step.say.trim().length>20,`a step of ${model.id} says too little: ${step.say}`);
   assert.ok(/[.!?]$/.test(step.say.trim()));
   assert.ok(step.layers.length,`a step of ${model.id} has no paper left`);
   // The picture is framed on the paper rather than on the sheet it started as, so a horn
   // sticking out past the top is fine — what is not fine is a coordinate that is not a number.
   const b=boundsOf(step.layers);
   for(const n of [b.minX,b.maxX,b.minY,b.maxY])assert.ok(Number.isFinite(n),`${model.id} has a coordinate that is not a number`);
   assert.ok(b.maxX-b.minX>5&&b.maxY-b.minY>5,`${model.id} folds away to nothing at step ${step.index}`);
  }
  // Each fold really folds: the paper after it is not the paper before it.
  for(const step of model.steps){
   if(!step.fold)continue;
   assert.ok(foldSpec(step.fold),`a fold of ${model.id} does not describe a crease and a side`);
  }
  // A step has to change SOMETHING. A crease leaves the paper where it was, so what it
  // changes is the set of lines on it — but a step that changes neither is a lie.
  const before=steps.map(s=>JSON.stringify([s.layers,s.creases]));
  assert.equal(new Set(before).size,before.length,`${model.id} has a step that changes nothing`);
  // Paper only ever gets more layers, never fewer: that is what folding is.
  for(let i=1;i<steps.length;i++)
   assert.ok(steps[i].layers.length>=steps[i-1].layers.length,`${model.id} loses a layer at step ${i}`);
 }
 const hat=modelById('hat');
 assert.ok(hat,'the hat is the one that is finished');
 assert.equal(modelById('nothing-like-this'),null);
 // It folds in half first, so the sheet it starts from is not square — a hat from a square has
 // no brim, and the diagram would quietly stop matching the words.
 const [[x0],[x1]]=[hat.paper[0],hat.paper[1]];
 assert.ok(Math.abs(x1-x0)<Math.abs(hat.paper[2][1]-hat.paper[1][1]),'the hat starts from a tall sheet');
});

test('a fold can take the front flap only, which is what a cup and a helmet are made of',async()=>{
 const o=await import('../src/origami-data.js');
 // Point in polygon, which is how a fold says WHICH flap it means. "The front one" cannot:
 // once you have folded one horn up, the front layer is that horn.
 const square=[[0,0],[10,0],[10,10],[0,10]];
 assert.ok(o.insidePoly(square,[5,5]));
 assert.ok(!o.insidePoly(square,[15,5]));
 assert.ok(!o.insidePoly(square,[5,-1]));
 // A stack of two, folded along the middle. All of it, or only the top, or only the bottom.
 const stack=[[[0,0],[10,0],[10,10],[0,10]],[[0,0],[10,0],[10,10],[0,10]]];
 const line=[[0,5],[10,5]],move=o.sideOf([5,0],line[0],line[1]);
 assert.equal(o.foldLayers(stack,line[0],line[1],move).length,4,'both sheets fold');
 const front=o.foldLayers(stack,line[0],line[1],move,'front');
 assert.equal(front.length,3,'one sheet stays whole, the other becomes two');
 const back=o.foldLayers(stack,line[0],line[1],move,'back');
 assert.equal(back.length,3);
 // The fold lands on TOP of the stack, because that is where a folded flap goes.
 assert.ok(front.at(-1).every(([,y])=>y>=4.999));
 // 'all' is a string, and 'all'.at is String.prototype.at — a function, not a point. Reaching
 // into it without checking threw on every model.
 assert.doesNotThrow(()=>o.foldLayers(stack,line[0],line[1],move,'all'));
 assert.doesNotThrow(()=>o.foldLayers(stack,line[0],line[1],move));
 // Naming the flap by a point in it: the topmost layer containing that point moves, and only it.
 const two=[[[0,0],[10,0],[10,10],[0,10]],[[0,0],[4,0],[4,4],[0,4]]];
 const named=o.foldLayers(two,line[0],line[1],move,{at:[2,2]});
 assert.equal(named.length,2,'the small flap moved whole, and the big sheet was left alone');
 assert.deepEqual(named[0],two[0],'untouched, not even cut');
 assert.ok(named[1].every(([,y])=>y>=4.999),'and it landed on the other side of the crease');
 // A point in no layer at all folds nothing, rather than folding something at random.
 assert.deepEqual(o.foldLayers(two,line[0],line[1],move,{at:[99,99]}),two);
 // Folding a stack over reverses it — what was underneath ends up on top. A diagram that got
 // that backwards would put the next front flap in the wrong place.
 const marked=[[[0,0],[10,0],[10,10],[0,10]],[[1,0],[9,0],[9,9],[1,9]]];
 const flipped=o.foldLayers(marked,line[0],line[1],move);
 const width=layer=>Math.max(...layer.map(([x])=>x))-Math.min(...layer.map(([x])=>x));
 assert.equal(width(flipped.at(-1)),10,'the outer sheet, which was underneath, is on top now');
 assert.equal(width(flipped.at(-2)),8,'and the inner one is under it');
 // Every model's single-flap folds actually pick something out: if a fold changes nothing the
 // step is a lie, and that is already asserted for each model.
 const helmet=o.modelById('helmet');
 assert.ok(helmet.steps.some(s=>s.fold&&s.fold.only),'the helmet needs single-flap folds');
 assert.ok(o.modelById('cup').steps.some(s=>s.fold&&s.fold.only==='front'||s.fold?.only?.at));
});

test('the origami diagram is framed on the paper, not on the sheet it started as',async()=>{
 const source=await readFile(new URL('../src/Origami.jsx',import.meta.url),'utf8');
 // By the eighth fold a fixed frame is showing a postage stamp in the middle of an empty card.
 assert.match(source,/const paper=boundsOf\(layers\)/);
 assert.match(source,/viewBox=\{`\$\{view\.x\} \$\{view\.y\} \$\{view\.size\} \$\{view\.size\}`\}/);
 // Squared off, so a fold that looks like forty-five degrees is forty-five degrees.
 assert.match(source,/size:Math\.max\(paper\.maxX-paper\.minX,paper\.maxY-paper\.minY\)/);
 // Every stroke scales with the frame, or the lines get fat as it zooms in.
 for(const stroke of ['0.8\\*ink','1.1\\*ink','1.4\\*ink'])assert.match(source,new RegExp(stroke));
});

test('the boys’ spending money: what went in, what went out, and what is left',async()=>{
 const {purse,spendItemsFor,topUpsFor,allowanceFor,allowanceDays,allowancePaid,spendCost}=await import('../src/trip-features.js');
 const first=seed.days[0].date,third=seed.days[2].date,last=seed.days.at(-1).date;
 const boston={name:'Boston',role:'child'};
 // Money only goes in on a parent's say-so, and only into a boy's purse.
 let state=applyOperation(seed,{type:'spendTopUp',person:'Nate',yen:3000,note:'Birthday money from Nan'},parent);
 assert.throws(()=>applyOperation(state,{type:'spendTopUp',person:'Nate',yen:5000},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'spendTopUp',person:'Lauren',yen:5000},parent),/Nate and Boston/);
 assert.deepEqual(topUpsFor(state,'Nate').map(t=>[t.yen,t.note,t.by]),[[3000,'Birthday money from Nan','Damien']]);
 assert.equal(topUpsFor(state,'Boston').length,0,'one purse is not the other');
 // An amount a day is worked out from the trip's own days rather than paid out overnight, so it
 // is right on a phone that has been switched off — and it never runs ahead of today.
 state=applyOperation(state,{type:'spendAllowance',person:'Nate',yenPerDay:500,from:first},parent);
 assert.equal(allowanceDays(state,'Nate','2026-09-01'),0,'nothing before the trip starts');
 assert.equal(allowanceDays(state,'Nate',third),3);
 assert.equal(allowancePaid(state,'Nate',third),1500);
 assert.equal(allowanceDays(state,'Nate','2026-12-25'),16,'and it stops at the last day of the trip');
 // A last day caps it, and a first day is required before any of it counts.
 const short=applyOperation(state,{type:'spendAllowance',person:'Nate',yenPerDay:500,from:first,to:seed.days[1].date},parent);
 assert.equal(allowancePaid(short,'Nate',last),1000);
 assert.throws(()=>applyOperation(state,{type:'spendAllowance',person:'Nate',yenPerDay:500},parent),/starts/);
 assert.throws(()=>applyOperation(state,{type:'spendAllowance',person:'Nate',yenPerDay:500,from:third,to:first},parent),/before the first/);
 assert.throws(()=>applyOperation(state,{type:'spendAllowance',person:'Nate',yenPerDay:500,from:first},child),e=>e.status===403);
 // Zero a day is how it stops, rather than a second way of undoing it.
 assert.equal(allowanceFor(applyOperation(state,{type:'spendAllowance',person:'Nate',yenPerDay:0},parent),'Nate'),null);
 // A boy writes down what he wants himself, and only for himself.
 state=applyOperation(state,{type:'spendAdd',person:'Nate',title:'A Beyblade',estimate:1500,day:third},child);
 state=applyOperation(state,{type:'spendAdd',person:'Nate',title:'Card pack',estimate:800},child);
 assert.throws(()=>applyOperation(state,{type:'spendAdd',person:'Boston',title:'Not his'},child),e=>e.status===403);
 assert.deepEqual(spendItemsFor(state,'Nate').map(i=>i.title),['A Beyblade','Card pack']);
 // Nothing bought yet: everything in is still there, and the list is only a promise against it.
 let money=purse(state,'Nate',third);
 assert.deepEqual([money.paidIn,money.spent,money.planned,money.left,money.after],[4500,0,2300,4500,2200]);
 assert.equal(money.allowance,1500);assert.equal(money.topUps,3000);
 // Buying it is the moment it becomes money out, and the till receipt beats the guess.
 const beyblade=spendItemsFor(state,'Nate')[0];
 state=applyOperation(state,{type:'spendBought',id:beyblade.id,done:true,spent:1980},child);
 const bought=spendItemsFor(state,'Nate').find(i=>i.id===beyblade.id);
 assert.equal(bought.spent,1980);assert.equal(bought.boughtBy,'Nate');assert.ok(bought.boughtAt);
 assert.equal(spendCost(bought),1980);
 money=purse(state,'Nate',third);
 assert.deepEqual([money.paidIn,money.spent,money.planned,money.left,money.after],[4500,1980,800,2520,1720]);
 assert.deepEqual([money.items,money.bought,money.waiting],[2,1,1]);
 // Bought things drop below the ones still waiting, the way a ticked-off job does.
 assert.deepEqual(spendItemsFor(state,'Nate').map(i=>i.title),['Card pack','A Beyblade']);
 // With no figure given it falls back to the guess rather than counting for nothing.
 const guessed=applyOperation(state,{type:'spendBought',id:spendItemsFor(state,'Nate')[0].id,done:true},child);
 assert.equal(purse(guessed,'Nate',third).spent,2780);
 // Putting it back on the list clears the price with it, so an old receipt cannot haunt a new one.
 const back=applyOperation(state,{type:'spendBought',id:beyblade.id,done:false},child);
 const returned=spendItemsFor(back,'Nate').find(i=>i.id===beyblade.id);
 assert.equal(returned.boughtAt,null);assert.equal(returned.spent,null);
 assert.equal(purse(back,'Nate',third).spent,0);
 // Wanting more than there is says so rather than showing a tidy figure.
 const greedy=applyOperation(state,{type:'spendAdd',person:'Nate',title:'A whole Gunpla kit',estimate:9000},child);
 assert.ok(purse(greedy,'Nate',third).after<0);
 // The money box drawn on the page reads the same purse, and has to stay inside its own outline:
 // every level is a share between 0 and 1, whatever a boy has managed to promise away.
 const {purseLevels}=await import('../src/trip-features.js');
 const drawn=purseLevels(purse(greedy,'Nate',third));
 assert.ok(drawn.level>0&&drawn.level<=1&&drawn.after===0,'a list bigger than the purse empties the box, it does not invert it');
 assert.equal(drawn.short,true);
 const fresh=purseLevels({paidIn:2000,spent:0,planned:0,left:2000,after:2000});
 assert.deepEqual(fresh,{level:1,after:1,promised:0,shortfall:0,short:false,empty:false});
 assert.deepEqual(purseLevels(null),{level:0,after:0,promised:0,shortfall:0,short:false,empty:true});
 // What the list wants and the box has not got is drawn above the money line, so it has to be a
 // share of the drawing too rather than a number that runs off the top of it.
 const over=purseLevels({paidIn:5000,spent:4200,planned:4000,left:800,after:-3200});
 assert.ok(over.shortfall>0&&over.shortfall<1&&over.level+over.shortfall<=1);
 // One boy cannot reach into the other's list, and a parent can.
 assert.throws(()=>applyOperation(state,{type:'spendRemove',id:beyblade.id},boston),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'spendEdit',id:beyblade.id,title:'Mine now'},boston),e=>e.status===403);
 assert.equal(spendItemsFor(applyOperation(state,{type:'spendRemove',id:beyblade.id},parent),'Nate').length,1);
 // Taking a top-up back off is a parent's, and the balance follows it.
 const top=topUpsFor(state,'Nate')[0];
 assert.throws(()=>applyOperation(state,{type:'spendTopUpRemove',id:top.id},child),e=>e.status===403);
 assert.equal(purse(applyOperation(state,{type:'spendTopUpRemove',id:top.id},parent),'Nate',third).paidIn,1500);
 for(const bad of [{type:'spendAdd',person:'Nate',title:'   '},{type:'spendAdd',person:'Nate',title:'x'.repeat(251)},
  {type:'spendAdd',person:'Nate',title:'A',estimate:-5},{type:'spendAdd',person:'Nate',title:'A',estimate:1.5},
  {type:'spendAdd',person:'Nate',title:'A',day:'2099-01-01'},{type:'spendAdd',person:'Nate',title:'A',notes:'n'.repeat(2001)},
  {type:'spendAdd',person:'Nate',title:'A',todoId:'nope'},{type:'spendTopUp',person:'Nate',yen:0},
  {type:'spendTopUp',person:'Nate',yen:20000000},{type:'spendBought',id:'nope',done:true},
  {type:'spendBought',id:beyblade.id,done:'yes'},{type:'spendTopUpRemove',id:'nope'},{type:'spendWhatever',person:'Nate'}])
  assert.throws(()=>applyOperation(state,bad,parent),`${JSON.stringify(bad).slice(0,52)} should be refused`);
 // Pocket money is not the itinerary, so it stays out of the family alert feed — except money
 // going in, which is the one piece of news a boy actually wants.
 assert.ok(state.alerts.some(a=>/Nate has ¥3,000 more spending money/.test(a.summary||'')));
 assert.ok(!state.alerts.some(a=>/Beyblade/.test(a.summary||'')));
 assert.equal(state.history[0].title,'A Beyblade','but the family history still reads properly');
});

test('a thing to buy moves off the to-do list and onto a boy’s spending money',async()=>{
 const {buyTodosFor,spendItemsFor,purse}=await import('../src/trip-features.js');
 const day=seed.days[3].date;
 let state=applyOperation(seed,{type:'todoAdd',title:'Buy a Beyblade',kind:'buy',day,person:'Nate'},child);
 state=applyOperation(state,{type:'todoAdd',title:'Buy stamps',kind:'buy',day,person:'Family'},parent);
 state=applyOperation(state,{type:'todoAdd',title:'Buy Lauren a fan',kind:'buy',day,person:'Lauren'},parent);
 state=applyOperation(state,{type:'todoAdd',title:'Post the postcards',kind:'do',day,person:'Nate'},parent);
 state=applyOperation(state,{type:'spendTopUp',person:'Nate',yen:5000},parent);
 // His own and the family's are offered; somebody else's job and a job that is not a buy are not.
 assert.deepEqual(buyTodosFor(state,'Nate').map(t=>t.title),['Buy a Beyblade','Buy stamps']);
 const job=state.todos.find(t=>t.title==='Buy a Beyblade');
 state=applyOperation(state,{type:'spendAdd',person:'Nate',title:job.title,notes:job.notes,day:job.day,todoId:job.id},child);
 const item=spendItemsFor(state,'Nate')[0];
 assert.equal(item.todoId,job.id);assert.equal(item.day,day);
 // Offered once: counting the same Beyblade against the purse twice is how a balance goes wrong.
 assert.deepEqual(buyTodosFor(state,'Nate').map(t=>t.title),['Buy stamps']);
 assert.throws(()=>applyOperation(state,{type:'spendAdd',person:'Nate',title:job.title,todoId:job.id},child),/already on the spending list/);
 // Buying it finishes the job it came from, so the day's screen is not still asking for it.
 state=applyOperation(state,{type:'spendBought',id:item.id,done:true,spent:1800},child);
 const finished=state.todos.find(t=>t.id===job.id);
 assert.ok(finished.doneAt);assert.equal(finished.doneBy,'Nate');
 assert.equal(purse(state,'Nate',day).spent,1800);
 // Putting it back on the spending list does not un-tick the job: it may have been ticked for
 // reasons of its own, and un-ticking somebody else's work is not ours to do.
 const back=applyOperation(state,{type:'spendBought',id:item.id,done:false},child);
 assert.ok(back.todos.find(t=>t.id===job.id).doneAt);
 assert.equal(purse(back,'Nate',day).spent,0);
});

test('spending money written down or spent with no signal waits on the phone',async()=>{
 const {ensureFeatures,pendingProgress,spendItemsFor,purse}=await import('../src/trip-features.js');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const list=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 // Wanting something and buying something both still make sense whenever they land.
 for(const op of ['spendAdd','spendBought'])assert.ok(list.includes(op),`${op} should survive with no signal`);
 // Money going in, and a purse being emptied, need the latest revision behind them.
 for(const op of ['spendAllowance','spendTopUp','spendTopUpRemove','spendEdit','spendRemove'])
  assert.ok(!list.includes(op),`${op} changes the shared purse`);
 const day=seed.days[2].date,at='2026-09-19T02:00:00.000Z';
 let state=applyOperation(ensureFeatures(structuredClone(seed)),{type:'spendTopUp',person:'Boston',yen:4000},parent);
 state=applyOperation(state,{type:'spendAdd',person:'Boston',title:'A Gachapon',estimate:400},{name:'Boston',role:'child'});
 const gacha=spendItemsFor(state,'Boston')[0];
 const queue=[{operation:{type:'spendAdd',operationId:'q1',person:'Boston',title:'A card pack',estimate:900,day,by:'Boston',at}},
              {operation:{type:'spendBought',operationId:'q2',id:gacha.id,done:true,spent:500,by:'Boston',at}}];
 const preview=pendingProgress(state,queue);
 assert.deepEqual(spendItemsFor(preview,'Boston').map(i=>i.title),['A card pack','A Gachapon']);
 const fresh=spendItemsFor(preview,'Boston').find(i=>i.title==='A card pack');
 assert.equal(fresh.estimate,900);assert.equal(fresh.createdBy,'Boston');assert.ok(fresh.pending);
 const spent=spendItemsFor(preview,'Boston').find(i=>i.id===gacha.id);
 assert.equal(spent.spent,500);assert.equal(spent.boughtBy,'Boston');assert.ok(spent.pending);
 // The purse on the screen is right before any of it has reached the family plan.
 const money=purse(preview,'Boston',day);
 assert.deepEqual([money.paidIn,money.spent,money.planned,money.left],[4000,500,900,3500]);
 assert.equal(purse(state,'Boston',day).spent,0,'and the saved trip is untouched until it syncs');
});

test('spending money has its own screen, and a thing to buy can be handed to it',async()=>{
 const {PAGES}=await import('../src/nav-data.js');
 assert.ok(PAGES.spending?.label&&PAGES.spending?.note);
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/tab==='spending'&&<Spending/,'the page is rendered');
 assert.match(main,/today=\{japanDate\(now\)\}/,'and told what day it is, so an amount a day stops at today');
 // The hand-off is offered on the to-do row itself, which is where a boy is looking when he
 // remembers he is paying for it.
 const todo=await readFile(new URL('../src/TodoList.jsx',import.meta.url),'utf8');
 assert.match(todo,/type:'spendAdd'/);
 assert.match(todo,/todoId:item\.id/,'and the two stay linked');
 // The bar is the whole answer, so it has to say the same thing to a screen reader.
 const page=await readFile(new URL('../src/Spending.jsx',import.meta.url),'utf8');
 assert.match(page,/role="img"/);
 assert.match(page,/aria-label=\{`\$\{yen\(spent\)\} spent and \$\{yen\(planned\)\} still to buy/);
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 for(const rule of ['.purse-meter{','.purse-spent{','.purse-planned{'])assert.ok(css.includes(rule),`${rule} is missing`);
});

test('a boy asks for more spending money and a parent is the one who approves it',async()=>{
 const {purse,requestsFor,requestedFor,openRequests,topUpsFor,REQUEST_STATES}=await import('../src/trip-features.js');
 const day=seed.days[2].date,boston={name:'Boston',role:'child'};
 let state=applyOperation(seed,{type:'spendTopUp',person:'Nate',yen:1000},parent);
 // He cannot pay himself, so asking is the only way the balance moves in his favour.
 assert.throws(()=>applyOperation(state,{type:'spendTopUp',person:'Nate',yen:2000},child),e=>e.status===403);
 state=applyOperation(state,{type:'spendRequest',person:'Nate',yen:2000,reason:'The Beyblade is ¥2,400 and I have ¥1,000'},child);
 const ask=requestsFor(state,'Nate')[0];
 assert.equal(ask.status,'open');assert.equal(ask.by,'Nate');assert.equal(ask.approvedYen,null);
 assert.equal(ask.decidedBy,null);
 // Asking does not move any money: that is the whole point of asking.
 assert.equal(purse(state,'Nate',day).paidIn,1000);
 assert.equal(requestedFor(state,'Nate'),2000);
 assert.deepEqual(openRequests(state).map(r=>r.person),['Nate']);
 // One boy cannot ask out of the other's purse, and cannot answer his own ask.
 assert.throws(()=>applyOperation(state,{type:'spendRequest',person:'Boston',yen:500},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'spendRequestDecide',id:ask.id,approve:true},child),e=>e.status===403);
 // Yes to a different figure is a real answer, and the money moves the moment it is given.
 const yes=applyOperation(state,{type:'spendRequestDecide',id:ask.id,approve:true,yen:1400,reply:'Half of it, and that is the lot until Kyoto.'},parent);
 const settled=requestsFor(yes,'Nate')[0];
 assert.equal(settled.status,'approved');assert.equal(settled.approvedYen,1400);
 assert.equal(settled.decidedBy,'Damien');assert.ok(settled.decidedAt);
 assert.equal(purse(yes,'Nate',day).paidIn,2400,'approving is what puts the money in');
 assert.equal(requestedFor(yes,'Nate'),0,'and it is no longer waiting on anybody');
 // The top-up it created says a parent approved it rather than looking like a bare gift.
 const paid=topUpsFor(yes,'Nate').find(t=>t.requestId===ask.id);
 assert.equal(paid.yen,1400);assert.equal(paid.approvedBy,'Damien');
 assert.equal(settled.topUpId,paid.id);
 // Left out, the approved amount is simply what was asked for.
 const full=applyOperation(state,{type:'spendRequestDecide',id:ask.id,approve:true},parent);
 assert.equal(purse(full,'Nate',day).paidIn,3000);
 // No is an answer too, and it moves nothing.
 const no=applyOperation(state,{type:'spendRequestDecide',id:ask.id,approve:false,reply:'Not this time.'},parent);
 assert.equal(requestsFor(no,'Nate')[0].status,'declined');
 assert.equal(purse(no,'Nate',day).paidIn,1000);
 assert.equal(topUpsFor(no,'Nate').length,1,'a no leaves no money behind it');
 // An answer is a record of what happened, so it is answered once and never taken back.
 for(const already of [yes,no])
  assert.throws(()=>applyOperation(already,{type:'spendRequestDecide',id:ask.id,approve:true},parent),/already been answered/);
 assert.throws(()=>applyOperation(yes,{type:'spendRequestCancel',id:ask.id},child),/answered already/);
 // While it is still waiting, the boy who asked can take it back — and only him.
 assert.throws(()=>applyOperation(state,{type:'spendRequestCancel',id:ask.id},boston),e=>e.status===403);
 assert.equal(requestsFor(applyOperation(state,{type:'spendRequestCancel',id:ask.id},child),'Nate').length,0);
 for(const bad of [{type:'spendRequest',person:'Nate',yen:0},{type:'spendRequest',person:'Nate',yen:-5},
  {type:'spendRequest',person:'Nate',yen:1.5},{type:'spendRequest',person:'Lauren',yen:500},
  {type:'spendRequest',person:'Nate',yen:500,reason:'r'.repeat(501)},
  {type:'spendRequestDecide',id:ask.id,approve:'yes'},{type:'spendRequestDecide',id:'nope',approve:true},
  {type:'spendRequestDecide',id:ask.id,approve:true,yen:0},{type:'spendRequestCancel',id:'nope'}])
  assert.throws(()=>applyOperation(state,bad,parent),`${JSON.stringify(bad).slice(0,52)} should be refused`);
 // Ten unanswered asks is enough; a boy cannot bury a parent in them.
 let many=state;
 for(let i=0;i<9;i++)many=applyOperation(many,{type:'spendRequest',person:'Nate',yen:100},child);
 assert.throws(()=>applyOperation(many,{type:'spendRequest',person:'Nate',yen:100},child),/ten asks waiting/);
 // Both the ask and the answer are family news, which is exactly what the updates feed is for.
 assert.ok(state.alerts.some(a=>/Nate is asking for ¥2,000/.test(a.summary||'')));
 assert.ok(yes.alerts.some(a=>/Damien approved ¥1,400 more spending money for Nate/.test(a.summary||'')));
 assert.ok(no.alerts.some(a=>/said not this time/.test(a.summary||'')));
 assert.deepEqual(REQUEST_STATES.map(([id])=>id),['open','approved','declined']);
});

test('an ask made with no signal waits on the phone, but answering it does not',async()=>{
 const {ensureFeatures,pendingProgress,requestsFor,requestedFor,purse}=await import('../src/trip-features.js');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const list=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 // A question asked on a train with no signal is still a fair question whenever it lands.
 assert.ok(list.includes('spendRequest'),'asking should survive with no signal');
 // Saying yes moves money, so it needs the latest plan behind it.
 for(const op of ['spendRequestDecide','spendRequestCancel'])
  assert.ok(!list.includes(op),`${op} changes the shared purse`);
 const day=seed.days[1].date,at='2026-09-19T02:00:00.000Z';
 const state=applyOperation(ensureFeatures(structuredClone(seed)),{type:'spendTopUp',person:'Boston',yen:500},parent);
 const preview=pendingProgress(state,[{operation:{type:'spendRequest',operationId:'q1',person:'Boston',yen:1500,reason:'A Gunpla kit',by:'Boston',at}}]);
 const ask=requestsFor(preview,'Boston')[0];
 assert.equal(ask.yen,1500);assert.equal(ask.status,'open');assert.ok(ask.pending);
 assert.equal(requestedFor(preview,'Boston'),1500);
 // It is a question, not money: the purse does not grow just because it was asked.
 assert.equal(purse(preview,'Boston',day).paidIn,500);
 assert.equal(requestsFor(state,'Boston').length,0,'and the saved trip is untouched until it syncs');
});

test('the asking and approving is on the page, and only a parent sees the answer buttons',async()=>{
 const page=await readFile(new URL('../src/Spending.jsx',import.meta.url),'utf8');
 assert.match(page,/type:'spendRequest'/,'a boy can ask');
 assert.match(page,/type:'spendRequestDecide'/,'and a parent can answer');
 // The Yes button is inside a parent-only branch; a boy only ever gets to take his ask back.
 assert.match(page,/\{open&&!answering&&<div className="ask-actions">/);
 assert.match(page,/\{parent&&<>\n    <button className="primary" disabled=\{busy\} onClick=\{\(\)=>setAnswering\('yes'\)\}/);
 assert.match(page,/\{mine&&!parent&&<button disabled=\{busy\} onClick=\{\(\)=>\{if\(confirm\('Take that ask back\?'\)\)/);
 // Approving a different figure has to be offered, or "approved" would read against a number
 // the boy never actually got.
 assert.match(page,/Approve how much, in yen\?/);
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 for(const rule of ['.ask-row{','.ask-row.open{','.ask-dot{'])assert.ok(css.includes(rule),`${rule} is missing`);
});

test('a parent can stand where a boy stands on the spending page, and act for him from there',async()=>{
 const page=await readFile(new URL('../src/Spending.jsx',import.meta.url),'utf8');
 // Standing in takes a parent's own powers off the screen rather than adding a second flag beside
 // every one of them, so the page a parent is shown is the page the boy is shown.
 assert.match(page,/const standing=grownUp&&standIn,parent=grownUp&&!standing;/);
 // What he can do, a parent standing there can still do for him: "mine" follows being a parent,
 // not the view, so nothing a boy can do is lost by looking at it his way.
 assert.match(page,/const rate=yenPerAud\(state\),mine=grownUp\|\|person===user\.name;/);
 assert.match(page,/className="segmented view-as"/,'the toggle is on the page');
 assert.match(page,/What \{person\} sees/);
 assert.match(page,/aria-pressed=\{standIn\}/,'and it says which way round it is to a screen reader');
 // The money-in panel and the answering buttons are exactly what standing in puts away.
 assert.match(page,/\{parent&&<><button className="spend-toggle"/);
 assert.match(page,/onClick=\{\(\)=>\{setStandIn\(true\);setShowMoney\(false\);setEdit\(null\);\}\}/,
  'and the money-in panel is not left open behind it');
 // Whose money it is and whose hands typed it are two different questions on every screen it shows on.
 assert.match(page,/ask\.by&&ask\.by!==ask\.person\?` · Put in by \$\{ask\.by\}`:''/);
 assert.match(page,/item\.createdBy&&item\.createdBy!==item\.person\?` · Written down by \$\{item\.createdBy\}`:''/);
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 for(const rule of ['.view-as{','.standing-in{'])assert.ok(css.includes(rule),`${rule} is missing`);
 // And the server already agrees: a parent writing an ask down for a boy is his ask, still open,
 // still moving no money, with the parent's name against it rather than words in the boy's mouth.
 const {purse,requestsFor,requestedFor}=await import('../src/trip-features.js');
 const day=seed.days[1].date;
 let state=applyOperation(seed,{type:'spendTopUp',person:'Nate',yen:1000},parent);
 state=applyOperation(state,{type:'spendRequest',person:'Nate',yen:2400,reason:'The Beyblade at the counter'},parent);
 const ask=requestsFor(state,'Nate')[0];
 assert.equal(ask.person,'Nate');assert.equal(ask.by,'Damien');assert.equal(ask.status,'open');
 assert.equal(purse(state,'Nate',day).paidIn,1000,'writing it down is not saying yes to it');
 assert.equal(requestedFor(state,'Nate'),2400);
 assert.ok(state.alerts.some(a=>/Damien put in an ask for Nate: ¥2,400/.test(a.summary||'')));
 assert.ok(!state.alerts.some(a=>/Nate is asking for ¥2,400/.test(a.summary||'')),'nobody puts words in his mouth');
 // Answering it is still a separate act, back in the parent's own view.
 const yes=applyOperation(state,{type:'spendRequestDecide',id:ask.id,approve:true},parent);
 assert.equal(purse(yes,'Nate',day).paidIn,3400);
 // And a parent can take a boy's open ask back for him, which a boy can only do to his own.
 assert.equal(requestsFor(applyOperation(state,{type:'spendRequestCancel',id:ask.id},parent),'Nate').length,0);
 // A parent can write something down on his list and tick it off for him, and it says who did.
 const added=applyOperation(state,{type:'spendAdd',person:'Nate',title:'A Gachapon go',estimate:400},parent);
 const bought=applyOperation(added,{type:'spendBought',id:added.spending.items.at(-1).id,done:true,spent:300},parent);
 const item=bought.spending.items.at(-1);
 assert.equal(item.person,'Nate');assert.equal(item.createdBy,'Damien');assert.equal(item.boughtBy,'Damien');
 assert.equal(purse(bought,'Nate',day).spent,300);
});

test('a part-approval reads as a part-approval, and a generous one does not',async()=>{
 const page=await readFile(new URL('../src/Spending.jsx',import.meta.url),'utf8');
 // Approving ¥400 of an ask for ¥600 is "¥400 of it". Approving ¥1,400 of an ask for ¥600 is
 // not part of anything, so it must not claim to be.
 assert.match(page,/approved \$\{both\(ask\.approvedYen,rate\)\}\$\{ask\.approvedYen<ask\.yen\?' of it':''\}/);
 // And the server lets a parent name any figure, because both answers are real ones.
 const {purse,requestsFor}=await import('../src/trip-features.js');
 const day=seed.days[1].date;
 let state=applyOperation(seed,{type:'spendRequest',person:'Nate',yen:600,reason:'A Gachapon go'},child);
 const ask=requestsFor(state,'Nate')[0];
 const less=applyOperation(state,{type:'spendRequestDecide',id:ask.id,approve:true,yen:400},parent);
 const more=applyOperation(state,{type:'spendRequestDecide',id:ask.id,approve:true,yen:1400},parent);
 assert.equal(purse(less,'Nate',day).paidIn,400);
 assert.equal(purse(more,'Nate',day).paidIn,1400);
 assert.equal(requestsFor(less,'Nate')[0].yen,600,'what was asked for is not rewritten by the answer');
});

test('folding and opening out again leaves a line, and the line goes with the paper',async()=>{
 const o=await import('../src/origami-data.js');
 const creased={id:'t',name:'t',ja:'t',icon:'x',about:'x'.repeat(50),finish:'y'.repeat(30),steps:[
  {say:'Fold it in half and open it out again, so there is a line down the middle.',
   crease:{through:[[50,0],[50,100]],moving:[20,50]}},
  {say:'Now fold the top left corner in to the line you just made.',fold:{bring:[10,10],to:[50,50]}},
  {say:'Turn the whole thing over and look at the back of it.',turn:true}
 ]};
 const frames=o.foldThrough(creased);
 // The paper does not move, and there is a line on it now.
 assert.deepEqual(frames[1].layers,frames[0].layers,'a crease is not a fold');
 assert.equal(frames[0].creases.length,0);
 assert.equal(frames[1].creases.length,1);
 // Trimmed to the paper, like any other crease.
 const [a,b]=frames[1].creases[0];
 assert.equal(Math.round(a[0]),50);assert.equal(Math.round(b[0]),50);
 assert.ok(Math.min(a[1],b[1])>=9.9&&Math.max(a[1],b[1])<=90.1,'it stops at the edge of the sheet');
 // A real fold after it leaves the line alone.
 assert.notDeepEqual(frames[2].layers,frames[1].layers);
 assert.deepEqual(frames[2].creases,frames[1].creases);
 // Turning it over takes the line with it — a guide line left behind where the paper used to
 // be is worse than no guide line at all.
 const over=frames[3].creases[0];
 assert.equal(frames[3].creases.length,1);
 for(const point of over)assert.ok(Number.isFinite(point[0])&&Number.isFinite(point[1]));
 const paper=o.boundsOf(frames[3].layers);
 assert.ok(over.every(([x])=>x>=paper.minX-1&&x<=paper.maxX+1),'and it lands on the paper');
 // Every step is drawn with the creases it had at the time, not the ones it ends up with.
 const shown=o.stepFrames(creased);
 assert.equal(shown[0].creases.length,0,'the first step has no line yet — you are about to make it');
 assert.equal(shown[1].creases.length,1);
});

test('the planes are planes: a rectangle, a centre line, and two wings',async()=>{
 const {ORIGAMI,modelById,stepFrames}=await import('../src/origami-data.js');
 const planes=['dart','glider','hammer'].map(modelById);
 assert.ok(planes.every(Boolean),'all three are there');
 assert.equal(ORIGAMI.length,7);
 for(const plane of planes){
  // A plane wants a rectangle. Folded from a square it comes out stubby and flies badly.
  const width=plane.paper[1][0]-plane.paper[0][0],height=plane.paper[2][1]-plane.paper[1][1];
  assert.ok(height>width*1.3,`${plane.id} should start from a long sheet`);
  // The centre line first, opened out again, because every later fold is lined up on it.
  assert.ok(plane.steps[0].crease,`${plane.id} should start by creasing the middle`);
  assert.equal(stepFrames(plane)[1].creases.length,1);
  // Folded in half, then a wing on each side — and the second one is folded after turning
  // over, so they end up mirrored rather than stacked.
  const wings=plane.steps.filter(s=>s.fold?.only==='front');
  assert.equal(wings.length,2,`${plane.id} needs two wings`);
  assert.ok(plane.steps.some(s=>s.turn),`${plane.id} has to be turned over between them`);
  assert.ok(plane.steps.indexOf(wings[0])<plane.steps.findIndex(s=>s.turn),'one wing before the turn');
  assert.ok(plane.steps.indexOf(wings[1])>plane.steps.findIndex(s=>s.turn),'and one after it');
  // It says how to throw it, which is the half everybody gets wrong.
  assert.match(plane.finish,/throw|let it go/i);
 }
});

test('a boy designs his own character, and it is nobody else’s to change',async()=>{
 const {mascotFor,mascotReady,describeMascot}=await import('../src/mascot-data.js');
 const boston={name:'Boston',role:'child'};
 const character={theme:'kitsune',shape:'fox',palette:'kitsune',eyes:'sparkle',mouth:'grin',marking:'whiskers',headwear:'flame',item:'bell',pattern:'asahi',
  name:'コン',romaji:'Kon',meaning:'the sound a fox makes',saying:'いくぞ！ Ikuzo — let’s go!',power:'Fox-fire that lights a dark lane'};
 let state=applyOperation(seed,{type:'mascotSave',person:'Nate',mascot:character},child);
 assert.equal(mascotFor(state,'Nate').name,'コン');
 assert.equal(mascotFor(state,'Nate').updatedBy,'Nate');
 assert.ok(mascotReady(mascotFor(state,'Nate')));
 assert.equal(mascotFor(state,'Boston'),null,'one boy’s character is not the other’s');
 assert.match(describeMascot(mascotFor(state,'Nate')),/Kon.*Fox spirit.*fox orange/);
 // Your own character only. A parent can sit with a boy and help him with his.
 assert.throws(()=>applyOperation(state,{type:'mascotSave',person:'Nate',mascot:character},boston),e=>e.status===403);
 state=applyOperation(state,{type:'mascotSave',person:'Boston',mascot:{...character,theme:'kappa',name:'キュウ'}},parent);
 assert.equal(state.mascots.Boston.updatedBy,'Damien','a parent can help a boy with his');
 // Only parts the app knows how to draw, so a saved character can never arrive unrenderable.
 for(const broken of [{shape:'unicorn'},{palette:'neon'},{headwear:'sombrero'},{pattern:'tartan'},{theme:'vampire'}])
  assert.throws(()=>applyOperation(state,{type:'mascotSave',person:'Nate',mascot:{...character,...broken}},child),/from the list/);
 assert.throws(()=>applyOperation(state,{type:'mascotSave',person:'Nate',mascot:{...character,name:'   '}},child),/name/);
 assert.throws(()=>applyOperation(state,{type:'mascotSave',person:'Nate',mascot:{...character,power:'x'.repeat(200)}},child),/under 140/);
 assert.throws(()=>applyOperation(state,{type:'mascotSave',person:'Ryu',mascot:character},parent),/family member/);
 // Changing it is changing it, not collecting a second one.
 state=applyOperation(state,{type:'mascotSave',person:'Nate',mascot:{...character,palette:'ai',name:' ホムラ '}},child);
 assert.equal(Object.keys(state.mascots).length,2);
 assert.equal(state.mascots.Nate.name,'ホムラ','a name is stored trimmed');
 assert.equal(state.mascots.Nate.palette,'ai');
 state=applyOperation(state,{type:'mascotRemove',person:'Nate'},child);
 assert.equal(mascotFor(state,'Nate'),null);
 assert.ok(mascotFor(state,'Boston'),'removing one leaves the rest alone');
 assert.throws(()=>applyOperation(state,{type:'mascotRemove',person:'Nate'},child),e=>e.status===404);
});

test('every part a character can be made of is a part the app can draw',async()=>{
 const data=await import('../src/mascot-data.js');
 const art=await readFile(new URL('../src/Mascot.jsx',import.meta.url),'utf8');
 const block=name=>{const from=art.indexOf(`const ${name}={`);assert.ok(from>0,`${name} is drawn`);return art.slice(from,art.indexOf('\n};',from));};
 for(const [field,map] of [['shape','SHAPES'],['marking','MARKINGS'],['eyes','EYES'],['mouth','MOUTHS'],['headwear','HEADWEAR'],['item','ITEMS'],['pattern','PATTERNS']]){
  const drawn=block(map);
  for(const option of data.CHOICES[field])assert.match(drawn,new RegExp(`[\\s{]${option.id}:`),`${field} · ${option.id} has no drawing`);
 }
 // Every spirit arrives with a look, a story, names and powers, all of them drawable.
 for(const theme of data.THEMES){
  assert.ok(theme.lore.length>60&&theme.known.length>20,`${theme.id} explains itself`);
  assert.ok(theme.names.length>=3&&theme.powers.length>=3,`${theme.id} offers suggestions`);
  assert.ok(theme.names.every(n=>n.name&&n.romaji&&n.meaning),`${theme.id} says what its names mean`);
  assert.ok(data.VIBES.some(([id])=>id===theme.vibe));
  for(const field of data.CHOICE_FIELDS)if(field!=='theme')assert.ok(data.validChoice(field,theme.suggest[field]),`${theme.id} suggests a real ${field}`);
 }
 // Surprise me has to produce something the server will accept, every time.
 for(let i=0;i<200;i++){
  const m=data.randomMascot();
  for(const field of data.CHOICE_FIELDS)assert.ok(data.validChoice(field,m[field]),`random ${field}`);
  for(const [field,max] of Object.entries(data.TEXT_FIELDS))assert.ok(m[field].length<=max,`random ${field} fits`);
  assert.ok(data.mascotReady(m));
 }
});

test('the character stands in for you wherever your name is, and is designed without a signal',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {PAGES,moreIds}=await import('../src/nav-data.js');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const maker=await readFile(new URL('../src/MascotMaker.jsx',import.meta.url),'utf8');
 const missions=await readFile(new URL('../src/AdventurePages.jsx',import.meta.url),'utf8');
 const spending=await readFile(new URL('../src/Spending.jsx',import.meta.url),'utf8');
 assert.ok(moreIds({name:'Nate',role:'child'}).includes('mascot'),'the boys can reach it');
 assert.ok(moreIds({name:'Lauren',role:'parent'}).includes('mascot'));
 assert.match(PAGES.mascot.note,/character/);
 assert.deepEqual(ensureFeatures({...seed}).mascots,{},'a trip with no characters still loads');
 assert.equal(ensureFeatures({...seed,mascots:{Nate:{name:'コン'}}}).mascots.Nate.name,'コン');
 // Designing one is recording something new, so it waits on the phone like any other progress,
 // and it stands beside the name straight away rather than waiting for the sync.
 assert.match(main,/'mascotSave','mascotRemove'\]/);
 const {pendingProgress}=await import('../src/trip-features.js');
 const queued=[{operation:{type:'mascotSave',person:'Nate',mascot:{name:'コン',shape:'fox'},at:'2026-09-21T02:00:00.000Z'}}];
 assert.equal(pendingProgress(seed,queued).mascots.Nate.name,'コン');
 assert.equal(pendingProgress({...seed,mascots:{Nate:{name:'コン'}}},[{operation:{type:'mascotRemove',person:'Nate'}}]).mascots.Nate,undefined);
 // The avatar, the family list, the missions and the purse all show it rather than a letter.
 assert.match(main,/<MascotBadge state=\{state\} person=\{user\.name\} size=\{38\}\/>/);
 assert.match(main,/family-people.*MascotBadge/);
 assert.match(missions,/<MascotBadge state=\{state\} person=\{n\} size=\{26\}\/>/);
 assert.match(spending,/<MascotBadge state=\{state\} person=\{n\} size=\{26\}\/>/);
 // Guided: a spirit lays out a whole look, and re-choosing the one you have keeps your changes.
 assert.match(maker,/const chooseTheme=id=>set\(id===draft\.theme\?\{theme:id\}:\{theme:id,\.\.\.themeFor\(id\)\.suggest\}\);/);
 assert.match(maker,/type:'mascotSave',person,mascot/);
});

test('a drawing is shapes rather than a picture, so the same beast fits a page and a forge disc',async()=>{
 const d=await import('../src/draw-data.js');
 // Every shape becomes a path, and a shape that describes nothing draws nothing rather than
 // throwing: one bad line should cost one line of a picture, not the whole game.
 assert.match(d.pathOf({line:[0,0,10,10]}),/^M0,0L10,10$/);
 assert.match(d.pathOf({circle:[50,50,10]}),/^M40,50a10,10 /);
 assert.match(d.pathOf({poly:[[0,0],[10,0],[10,10]]}),/Z$/);
 assert.doesNotMatch(d.pathOf({poly:[[0,0],[10,0]],close:false}),/Z$/);
 assert.match(d.pathOf({curve:[[0,0],[10,10],[20,0]],close:false}),/^M0,0C/);
 assert.equal(d.pathOf({circle:[50,50,0]}),'');
 assert.equal(d.pathOf({poly:[[0,0]]}),'');
 assert.equal(d.pathOf(null),'');
 assert.equal(d.pathOf({nonsense:true}),'');
 // Twelve o'clock is up and three o'clock is to the right, which is how a blade is described.
 assert.deepEqual(d.polar(50,50,10,0),[50,40]);
 assert.deepEqual(d.polar(50,50,10,90),[60,50]);
 // Shrinking is uniform: a squashed circle stops being a circle, and a crest that means
 // something squashed does not mean it any more.
 assert.deepEqual(d.scaleShape({circle:[50,50,10]},0.5,25,25).circle,[50,50,5]);
 assert.deepEqual(d.scaleShape({poly:[[0,0],[100,100]]},0.1,5,5).poly,[[5,5],[15,15]]);
 assert.equal(d.scaleShape(null,1),null);
 // Mirroring flips across the page and leaves the height alone — the bug that puts one eye
 // lower than the other is exactly the one this stops.
 assert.deepEqual(d.mirrorShape({poly:[[10,20],[30,40]]}).poly,[[90,20],[70,40]]);
 assert.deepEqual(d.mirrorShape({circle:[20,30,5]}).circle,[80,30,5]);
 assert.deepEqual(d.mirrorShape({arc:[40,50,10,20,70]}).arc,[60,50,10,-70,-20]);
 assert.equal(d.bothSides([{circle:[20,30,5]}]).length,2);
 assert.deepEqual(d.boundsOf([{circle:[50,50,10]},{line:[0,0,5,5]}]),{minX:0,maxX:60,minY:0,maxY:60});
 assert.equal(d.boundsOf([]),null);
 // What a shape is filled with, and how heavy its line is, survive being shrunk and mirrored:
 // a beast whose eyes are filled in loses the eyes otherwise the moment it becomes a decal.
 const eye={curve:[[10,10],[20,14],[30,10],[20,6]],fill:'#16383b',weight:1.3};
 assert.equal(d.scaleShape(eye,0.3,35,35).fill,'#16383b');
 assert.equal(d.scaleShape(eye,0.3,35,35).weight,1.3);
 assert.equal(d.mirrorShape(eye).fill,'#16383b');
 assert.equal(d.mirrorShape(eye).weight,1.3);
 // A run of points along a circle, so a curved outer edge is written as a curve rather than
 // as a straight line between two blade tips.
 const along=d.arcPoints(50,50,20,0,180,4);
 assert.equal(along.length,5);
 for(const [x,y] of along)assert.ok(Math.abs(Math.hypot(x-50,y-50)-20)<0.01);
});

test('every drawing goes one step at a time, and every step says what to draw',async()=>{
 const {SUBJECTS,CATEGORIES,subjectById,stepFrames,lineArt,guideArt,boundsOf,drawGame,pathOf}=await import('../src/draw-data.js');
 assert.ok(SUBJECTS.length>=12);
 assert.equal(new Set(SUBJECTS.map(s=>s.id)).size,SUBJECTS.length);
 for(const subject of SUBJECTS){
  assert.ok(subject.name&&subject.icon&&subject.kind,subject.id);
  assert.ok(CATEGORIES.some(c=>c.id===subject.kind),`${subject.id} is in no category`);
  assert.ok(subject.about.length>40&&subject.finish.length>20,`${subject.id} does not say what it is or how to finish it`);
  assert.ok(drawGame(subject.id).length<=40,'the server refuses a longer game name');
  assert.ok(subject.steps.length>=4,`${subject.id} is not worth calling step by step`);
  for(const step of subject.steps){
   assert.ok(step.say&&step.say.trim().length>20,`a step of ${subject.id} says too little: ${step.say}`);
   assert.ok(/[.!?]$/.test(step.say.trim()),`a step of ${subject.id} is not a sentence`);
   assert.ok(step.shapes.length,`a step of ${subject.id} draws nothing`);
   for(const shape of step.shapes)assert.ok(pathOf(shape),`a shape of ${subject.id} is not a line: ${JSON.stringify(shape)}`);
  }
  // Nothing is drawn off the edge of the card.
  const bounds=boundsOf(subject.steps.flatMap(s=>s.shapes));
  assert.ok(bounds.minX>=-0.01&&bounds.maxX<=100.01&&bounds.minY>=-0.01&&bounds.maxY<=100.01,`${subject.id} runs off the card`);
  // Guides are scaffolding, so they come first and are never part of the drawing itself —
  // trace a guide and the picture is wrong.
  const guides=subject.steps.map(s=>!!s.guide);
  assert.deepEqual([...guides].sort((a,b)=>Number(b)-Number(a)),guides,`${subject.id} puts a guide after real lines`);
  assert.ok(lineArt(subject).length,`${subject.id} is all scaffolding`);
  assert.equal(lineArt(subject).length+guideArt(subject).length,subject.steps.flatMap(s=>s.shapes).length);
  // Each step carries everything drawn so far and the lines being drawn now, kept apart,
  // because watching this one line arrive is the whole point of the game.
  const frames=stepFrames(subject);
  assert.equal(frames.length,subject.steps.length+1,'the finished drawing is a step of its own');
  assert.equal(frames[0].past.length,0);
  assert.equal(frames[1].past.length,subject.steps[0].shapes.length);
  assert.ok(frames.at(-1).done);
  assert.equal(frames.at(-1).now.length,0);
  assert.equal(frames.at(-1).past.length,subject.steps.flatMap(s=>s.shapes).length);
  // A guide line stays a guide line once it is behind you, or it gets drawn in ink.
  if(subject.steps[0].guide)assert.ok(frames[1].past.every(s=>s.guide));
 }
 assert.equal(subjectById('nothing-like-this'),null);
 assert.equal(stepFrames(null).length,0);
 // A drawing is not a wireframe: an eye, a stripe or a visor is filled in, and the outline of
 // a thing is heavier than the detail inside it. Both are what stopped these looking like
 // diagrams of an animal rather than a drawing of one.
 const solid=SUBJECTS.filter(s=>s.steps.some(st=>st.shapes.some(sh=>sh.fill)));
 assert.ok(solid.length>=10,`only ${solid.length} of the drawings have anything filled in`);
 const weighted=SUBJECTS.filter(s=>s.steps.some(st=>st.shapes.some(sh=>sh.weight>1)));
 assert.ok(weighted.length>=10,`only ${weighted.length} of the drawings have a heavier outline`);
 for(const subject of SUBJECTS)for(const step of subject.steps)for(const shape of step.shapes){
  if(shape.fill)assert.match(shape.fill,/^#[0-9a-f]{6}$/i,`${subject.id} has a fill that is not a colour`);
  if(shape.weight!==undefined)assert.ok(shape.weight>0&&shape.weight<=3,`${subject.id} has a silly line weight`);
 }
});

test('a spinner top is built rather than drawn, so one nobody has drawn yet still comes out right',async()=>{
 const d=await import('../src/draw-data.js');
 for(const blades of [3,5,8]){
  for(const ring of d.RINGS){
   const steps=d.topSteps({ring:ring.id,blades,crest:'dragon',name:'Test'});
   // The blades are counted off the design rather than drawn in, so the picture and the
   // sentence cannot disagree about how many there are.
   const bladeStep=steps.find(s=>s.say.includes(`the ${blades} blades`));
   assert.equal(bladeStep.shapes.length,blades,`${ring.id} with ${blades} blades`);
   // A blade is a chunk with a gap after it, not a spoke: it reaches the rim, it is rooted on
   // the hub, and half of each turn of the circle is left empty.
   for(const blade of bladeStep.shapes){
    const reach=blade.poly.map(([x,y])=>Math.hypot(x-50,y-50));
    assert.ok(Math.max(...reach)>=d.TOP_RADIUS.out-0.01,`${ring.id} blades fall short of the rim`);
    assert.ok(Math.min(...reach)<=d.TOP_RADIUS.hub+0.01,`${ring.id} blades float off the hub`);
    assert.ok(Math.max(...reach)<=d.TOP_RADIUS.out+4.01,`${ring.id} blades run off the card`);
   }
   const hubStep=steps[1];
   assert.deepEqual(hubStep.shapes.map(s=>s.circle[2]),[d.TOP_RADIUS.hub,d.TOP_RADIUS.core],'the hub is drawn before anything goes in it');
   // The beast sits inside the forge disc rather than over the blades.
   const crest=d.boundsOf(steps.filter(s=>s.crest).flatMap(s=>s.shapes));
   const reach=Math.max(50-crest.minX,crest.maxX-50,50-crest.minY,crest.maxY-50);
   assert.ok(reach<=22,`the ${ring.id} crest spills out of the forge disc (${reach})`);
  }
 }
 // A design typed in by a child is clamped rather than believed.
 const wild=d.normaliseDesign({name:'x'.repeat(80),blades:99,ring:'nonsense',crest:'unicorn',type:'Sneaky',colour:'red; drop table'});
 assert.equal(wild.name.length,24);
 assert.equal(wild.blades,d.BLADE_RANGE.max);
 assert.equal(wild.ring,d.RINGS[0].id);
 assert.equal(wild.crest,d.CRESTS[0].id);
 assert.equal(wild.type,'Balance');
 assert.match(wild.colour,/^#[0-9a-f]{6}$/);
 assert.equal(d.normaliseDesign(null).name,'My top');
 assert.equal(d.normaliseDesign({blades:1}).blades,d.BLADE_RANGE.min);
 // Every beast is drawn once and used twice: full size as a crest of its own, and shrunk into
 // the middle of a top. The steps are the same steps.
 const beast=d.crestById('tiger');
 const own=d.subjectById('crest-tiger');
 assert.equal(own.steps.length,beast.steps.length);
 const inside=d.topSteps({crest:'tiger',blades:4,ring:'saw'}).filter(s=>s.crest);
 assert.equal(inside.length,beast.steps.length);
 assert.deepEqual(inside[0].shapes[0].curve,d.placeShapes([beast.steps[0].shapes[0]],d.CREST_SCALE,d.CREST_SHIFT,d.CREST_SHIFT)[0].curve);
 // One of ours and one of your own are the same kind of thing, or the steps would only be
 // right for the ones we wrote down.
 const mine=d.topSubject({id:'own-1',name:'Mine',ring:'petal',blades:6,crest:'fox'});
 assert.equal(mine.steps.length,d.TOPS[0].steps.length-d.crestById('dragon').steps.length+d.crestById('fox').steps.length);
 assert.ok(mine.finish.includes('Mine'));
 assert.equal(d.nibById('nothing').id,'pen');
 assert.ok(d.PENS.length>=10&&new Set(d.PENS).size===d.PENS.length);
});

test('a drawing is the child’s own work: kept on the phone first, and never in the photo of the day',async()=>{
 const {ensureFeatures,drawingsFor,drawingsOf,drawingOwner}=await import('../src/trip-features.js');
 const state=ensureFeatures(structuredClone(seed));
 assert.deepEqual(state.drawings,[],'an older trip has no drawings rather than no field');
 state.drawings=[
  {id:'a',by:'Damien',for:'Nate',title:'Kaen Dragon',at:'2026-09-21T01:00:00.000Z'},
  {id:'b',by:'Boston',for:'Boston',title:'Shiba inu',at:'2026-09-21T03:00:00.000Z'}
 ];
 assert.deepEqual(drawingsFor(state).map(d=>d.id),['b','a'],'newest first');
 assert.deepEqual(drawingsOf(state,'Nate').map(d=>d.id),['a'],'a parent can send one a boy drew');
 assert.equal(drawingOwner(null),'');
 // Yours to remove if you drew it or you are the one who sent it, and nobody else's.
 assert.equal(applyOperation(state,{type:'drawingRemove',id:'b'},{name:'Boston',role:'child'}).drawings.length,1);
 assert.equal(applyOperation(state,{type:'drawingRemove',id:'a'},child).drawings.length,1,'a boy can remove the one drawn for him');
 assert.equal(applyOperation(state,{type:'drawingRemove',id:'a'},parent).drawings.length,1);
 assert.throws(()=>applyOperation(state,{type:'drawingRemove',id:'a'},{name:'Boston',role:'child'}),/only remove your own/i);
 assert.throws(()=>applyOperation(state,{type:'drawingRemove',id:'gone'},parent),/not found/i);
 // The photo of the day is a competition between photographs; a drawing is not entered in it.
 const handler=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 assert.match(handler,/route==='drawing'&&post/);
 assert.match(handler,/b\.pathname\.startsWith\(`art\/\$\{user\.id\}\/`\)/,'a drawing goes in its own place in storage');
 assert.match(handler,/current\.state\.drawings=\[/);
 assert.doesNotMatch(handler,/state\.photos=\[\.\.\.current\.state\.photos,\{[^}]*subject/);
 assert.match(handler,/DRAWING_LIMIT/);
 assert.match(handler,/user\.role!=='parent'&&owner!==user\.name\)throw new AppError\('That is not your drawing to add\.'/);
});

test('the pad keeps the lines, not the pixels, and the drawing that is saved has the lines in it',async()=>{
 const game=await readFile(new URL('../src/Drawing.jsx',import.meta.url),'utf8');
 const store=await readFile(new URL('../src/drawing-store.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 // Strokes are fractions of the pad rather than pixels, so turning the phone does not shear
 // everything drawn so far — and undo is then dropping the last one and drawing the rest.
 assert.match(game,/\(event\.clientX-box\.left\)\/box\.width/);
 assert.match(game,/setStrokes\(list=>list\.slice\(0,-1\)\)/);
 // The line being drawn arrives along itself. pathLength makes one keyframe do it whatever
 // the length of the line, so a whisker and a head outline take the same time.
 assert.match(game,/pathLength="1"/);
 assert.match(game,/className=\{shape\.fill\?'draw-now filled':'draw-now'\}/);
 // A filled shape — a pupil, a stripe, a visor — is inked along its outline and then floods,
 // rather than arriving as a solid blob with no line drawn.
 assert.match(css,/@keyframes draw-fill\{0%,70%\{fill-opacity:0\}100%\{fill-opacity:1\}\}/);
 assert.match(game,/fill=\{shape\.fill\|\|'none'\}/);
 assert.match(game,/strokeWidth=\{\(shape\.guide\?0\.9:1\.6\)\*\(shape\.weight\|\|1\)\}/,'an outline is heavier than the details inside it');
 assert.match(css,/@keyframes draw-line\{from\{stroke-dashoffset:1\}to\{stroke-dashoffset:0\}\}/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.draw-now\{animation:none/);
 // Tracing and colouring in are the same line work used two ways, and neither of them traces
 // the guides.
 assert.match(game,/under==='trace'&&<ArtLayer className="draw-under" shapes=\{art\}/);
 assert.match(game,/under==='colour'&&<ArtLayer className="draw-over" shapes=\{art\}/);
 assert.match(game,/const art=useMemo\(\(\)=>lineArt\(subject\),/);
 // A colouring-in is saved with the printed lines back over the top of it, or it is a page of
 // scribble with nothing to say what it was.
 assert.match(game,/ctx\.drawImage\(pad,0,0,out\.width,out\.height\);\n\s+if\(under==='colour'\)ctx\.drawImage\(await loadSvg/);
 // Kept on the phone first and sent second: the first one happens in a queue with no signal.
 assert.match(game,/const saved=await saveDrawing\(item\)\.catch\(\(\)=>null\);/);
 assert.match(game,/if\(navigator\.onLine&&config\?\.uploads\)await send\(item\)/,'and sent second, when there is signal to send it with');
 assert.match(store,/sort\(\(a,b\)=>String\(b\.at\)\.localeCompare\(String\(a\.at\)\)\)/,'newest first, like everything else that is a list of what we did');
 assert.match(store,/catch\{return \[\];\}/,'a phone with storage turned off says nothing is kept rather than breaking');
});

test('the two pop-ups can be turned off, one at a time, by the person they interrupt',async()=>{
 const {SETTINGS,DEFAULTS,readSettings,writeSetting,settingOn}=await import('../src/settings.js');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const page=await readFile(new URL('../src/Settings.jsx',import.meta.url),'utf8');
 const store=(saved={})=>({getItem:k=>saved[k]??null,setItem:(k,v)=>{saved[k]=v;},saved});
 // Nothing is off until somebody says so, so a phone that never opens this page behaves
 // exactly as it always did.
 assert.deepEqual(DEFAULTS,{dailyPhrase:true,dailyFact:true});
 assert.deepEqual(readSettings('Nate',store()),DEFAULTS);
 // One at a time: turning the fun fact off leaves the phrase alone, which is the whole point
 // of two switches rather than one.
 const phone=store();
 assert.deepEqual(writeSetting('Nate','dailyFact',false,phone),{dailyPhrase:true,dailyFact:false});
 assert.deepEqual(readSettings('Nate',phone),{dailyPhrase:true,dailyFact:false});
 // Under the person's own name. Two boys sharing a phone do not share an opinion about a
 // pop-up, and switching one off must never switch it off for somebody else.
 assert.deepEqual(readSettings('Boston',phone),DEFAULTS);
 assert.deepEqual(Object.keys(phone.saved),['japan.settings.Nate']);
 // It is a preference, not a fact about the trip: it lives on the phone, so it holds in a
 // tunnel with no signal and is never sent anywhere.
 assert.ok(!/mutate|fetch\(/.test(await readFile(new URL('../src/settings.js',import.meta.url),'utf8')));
 // A phone with storage turned off, a half-written key, or a setting from a version that has
 // not shipped yet: all of them fall back to the default rather than switching something off.
 assert.deepEqual(readSettings('Nate',null),DEFAULTS);
 assert.deepEqual(readSettings('Nate',store({'japan.settings.Nate':'not json at all'})),DEFAULTS);
 assert.deepEqual(readSettings('Nate',store({'japan.settings.Nate':'{"dailyFact":"no"}'})),DEFAULTS);
 assert.deepEqual(readSettings('Nate',store({'japan.settings.Nate':'{"dailyLater":false}'})),DEFAULTS);
 assert.deepEqual(writeSetting('Nate','dailyLater',false,phone),{dailyPhrase:true,dailyFact:false},'a setting nothing knows about is not written');
 assert.equal(settingOn(undefined,'dailyFact'),true,'before anything is read, everything is still on');
 // And the switches are actually wired to the pop-ups. Off counts as done with it, so the
 // phrase never opens — and the fun fact behind it stops waiting on a phrase that is never
 // coming, rather than being turned off along with it.
 assert.match(main,/const phraseDone=!settingOn\(settings,'dailyPhrase'\)\|\|!todaysPhrase/);
 assert.match(main,/const factDone=!settingOn\(settings,'dailyFact'\)\|\|!todaysFact/);
 // Read while rendering rather than in an effect. The bug this replaces: the person arrives a
 // moment after the first render, and settings fetched in an effect land in the same commit as
 // the pop-up's own effect — so the phrase opened on the defaults and somebody who switched it
 // off last night was shown it anyway.
 assert.match(main,/const settings=useMemo\(\(\)=>readSettings\(user\?\.name\),\[user\?\.name,settingsAt\]\)/);
 // Every switch says what it is, both ways round, and what stays behind either way — because
 // what stops somebody turning a thing off is not knowing what else goes with it.
 for(const s of SETTINGS){
  assert.ok(s.label&&s.on&&s.off,`${s.id} is missing its label or its two lines`);
  assert.match(s.off,/stays under More|Show me another/,`${s.id} does not say what is left when it is off`);
 }
 // It is a switch to a screen reader too, not a button whose meaning is in the word beside it.
 assert.match(page,/role="switch" aria-checked=\{on\} aria-label=\{s\.label\}/);
});

test('one booking, every gate it opens: a ticket is allocated to as many activities as it covers',async()=>{
 const {ticketList,isArchived,offlineManifest,pendingProgress,documentSteps,documentServesStep,documentStepList}=await import('../src/trip-features.js');
 const day=seed.days[0].date,[a,b]=activeSteps(seed,day).filter(s=>!s.locked).slice(0,2);
 const other=seed.steps.find(s=>s.day&&s.day!==day);
 assert.ok(a&&b&&other);
 // A rail pass that gets us through three gates is one booking held against all of them.
 let s=applyOperation(seed,{type:'documentNote',title:'Two-day pass',category:'ticket',stepIds:[a.id,b.id,a.id]},parent);
 const pass=s.documents.at(-1);
 assert.deepEqual(pass.stepIds,[a.id,b.id],'each activity once');
 assert.equal(pass.stepId,a.id,'the first of them is still where a ticket written last month keeps its activity');
 assert.deepEqual(documentSteps(pass),[a.id,b.id]);
 assert.deepEqual(documentStepList(s,pass).map(x=>x.title),[a.title,b.title]);
 // It shows against either activity, and is downloaded for the day either one falls on.
 assert.equal(ticketList(s,{step:a,all:false}).length,1);
 assert.equal(ticketList(s,{step:b,all:false}).length,1);
 assert.equal(ticketList(s,{step:other,all:false}).length,0);
 // A booking spanning two days is downloaded for both of them, and for neither once it is used.
 const across={id:'pass-file',title:'Two-day pass',person:'Family',type:'application/pdf',pathname:'tickets/pass.pdf',
  category:'ticket',stepIds:[a.id,other.id],stepId:a.id,day:null};
 const spanning={...structuredClone(seed),documents:[across]};
 assert.ok(offlineManifest(spanning,day).files.some(f=>f.key==='doc-pass-file'));
 assert.ok(offlineManifest(spanning,other.day).files.some(f=>f.key==='doc-pass-file'));
 const usedUp=applyOperation(applyOperation(spanning,{type:'status',id:a.id,status:'done'},parent),{type:'status',id:other.id,status:'done'},parent);
 assert.ok(!offlineManifest(usedUp,day).files.some(f=>f.key==='doc-pass-file'));
 assert.ok(!offlineManifest(usedUp,other.day).files.some(f=>f.key==='doc-pass-file'));

 // A pass is not finished at the first gate: it leaves the list once every activity it covers
 // has been ticked off, and not before.
 const first=applyOperation(s,{type:'status',id:a.id,status:'done'},parent);
 assert.ok(!isArchived(first.documents.find(d=>d.id===pass.id)),'one gate down, the pass is still needed');
 const both=applyOperation(first,{type:'status',id:b.id,status:'done'},parent);
 const spent=both.documents.find(d=>d.id===pass.id);
 assert.ok(isArchived(spent),'both gates walked through, the pass is finished');
 assert.equal(spent.archivedWith,b.id);
 // Undoing either of them brings it back, because it is needed again.
 const undone=applyOperation(both,{type:'status',id:a.id,status:'todo'},parent);
 assert.ok(!isArchived(undone.documents.find(d=>d.id===pass.id)));
 assert.equal(undone.documents.find(d=>d.id===pass.id).archivedWith,null);

 // The same rule on a phone with no signal, rather than waiting for the sync.
 const at='2026-09-24T02:00:00.000Z';
 const oneOffline=pendingProgress(s,[{operation:{type:'status',id:a.id,status:'done',at}}]);
 assert.ok(!isArchived(oneOffline.documents.find(d=>d.id===pass.id)));
 const bothOffline=pendingProgress(s,[{operation:{type:'status',id:a.id,status:'done',at}},{operation:{type:'status',id:b.id,status:'done',at}}]);
 assert.equal(bothOffline.documents.find(d=>d.id===pass.id).archivedAt,at);
 assert.ok(!isArchived(pendingProgress(bothOffline,[{operation:{type:'status',id:b.id,status:'todo',at}}]).documents.find(d=>d.id===pass.id)));

 // Deleting one activity leaves the booking against the rest; deleting the last one hands it
 // back to that activity's day rather than leaving it pointing at nothing.
 const droppedOne=applyOperation(s,{type:'remove',id:a.id},parent);
 assert.deepEqual(droppedOne.documents.find(d=>d.id===pass.id).stepIds,[b.id]);
 assert.equal(droppedOne.documents.find(d=>d.id===pass.id).stepId,b.id);
 assert.equal(droppedOne.documents.find(d=>d.id===pass.id).day,null);
 const droppedBoth=applyOperation(droppedOne,{type:'remove',id:b.id},parent);
 assert.deepEqual(droppedBoth.documents.find(d=>d.id===pass.id).stepIds,[]);
 assert.equal(droppedBoth.documents.find(d=>d.id===pass.id).stepId,null);
 assert.equal(droppedBoth.documents.find(d=>d.id===pass.id).day,b.day);

 // A ticket and the files attached to it are one allocation, so the files follow it.
 const withFile=applyOperation(s,{type:'documentNote',title:'Boston QR',parentDocumentId:pass.id},parent);
 withFile.documents.at(-1).parentDocumentId=pass.id;
 const synced=applyOperation(withFile,{type:'editDocument',id:pass.id,title:'Two-day pass',category:'ticket',stepIds:[b.id]},parent);
 assert.deepEqual(synced.documents.find(d=>d.parentDocumentId===pass.id).stepIds,[b.id]);
 assert.equal(synced.documents.find(d=>d.parentDocumentId===pass.id).stepId,b.id);

 // A ticket saved before a booking could cover more than one activity still reads correctly.
 const legacy={id:'legacy',title:'Old ticket',person:'Family',type:'note',category:'ticket',stepId:a.id,day:null};
 const old={...structuredClone(seed),documents:[legacy]};
 assert.deepEqual(documentSteps(legacy),[a.id]);
 assert.ok(documentServesStep(legacy,a.id));
 assert.equal(ticketList(old,{step:a,all:false}).length,1);
 assert.ok(isArchived(applyOperation(old,{type:'status',id:a.id,status:'done'},parent).documents[0]));

 // What cannot be allocated.
 assert.throws(()=>applyOperation(seed,{type:'documentNote',title:'Bad',stepIds:[a.id,'nope']},parent),/Activity not found/);
 assert.throws(()=>applyOperation(seed,{type:'documentNote',title:'Bad',stepIds:[a.id],day},parent),/activity or a day, not both/);
 assert.throws(()=>applyOperation(seed,{type:'documentNote',title:'Bad',stepIds:'all'},parent),/Choose the activities/);
 assert.throws(()=>applyOperation(seed,{type:'documentNote',title:'Bad',stepIds:activeSteps(seed,day).map(x=>x.id).concat(seed.steps.slice(0,25).map(x=>x.id))},parent),/at most 20 activities/);
});

test('a booking read in the other language, and kept on the booking where it will be needed',async()=>{
 const {createServer}=await import('node:http');
 let seen=null,reply={readable:true,language:'Japanese',english:'Check-in is from 15:00. Reference AB-9931.',note:''};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen={path:req.url,json:JSON.parse(body)};
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'msg_3',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'end_turn',
    usage:{input_tokens:410,output_tokens:95},content:[{type:'text',text:JSON.stringify(reply)}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});
 try{
  const {translateTicketText}=await import('../server/translate.mjs');
  // A confirmation that arrived in Japanese, read into English.
  const english=await translateTicketText({text:'  チェックインは15時です。予約番号 AB-9931  ',direction:'en',field:'notes',title:'Kyoto hotel'});
  assert.equal(english.english,reply.english);
  assert.equal(english.direction,'en');
  assert.equal(english.source,'チェックインは15時です。予約番号 AB-9931','what was translated is kept beside the translation');
  assert.equal(english.usage.input,410);
  assert.equal(seen.json.model,'claude-opus-5');
  assert.deepEqual(seen.json.output_config.format.schema.required,['readable','language','english','note']);
  assert.match(seen.json.system,/into English for an Australian family/);
  assert.match(JSON.stringify(seen.json.messages),/the notes on this booking/);
  assert.match(JSON.stringify(seen.json.messages),/Kyoto hotel/);

  // And the other way: what we wrote, in the Japanese to hold up at the counter.
  reply={sensible:true,ja:'予約番号はAB-9931です。',romaji:'yoyaku bangō wa AB-9931 desu.',
   say:'yo-ya-koo ban-goh wa AB-9931 dess',literal:'The booking reference is AB-9931.',note:''};
  const japanese=await translateTicketText({text:'Our booking reference is AB-9931.',direction:'ja',field:'reference'});
  assert.equal(japanese.ja,reply.ja);
  assert.equal(japanese.say,reply.say);
  assert.match(seen.json.system,/hold up at a counter/);
  assert.deepEqual(seen.json.output_config.format.schema.required,['ja','romaji','say','literal','note','sensible']);

  // What is refused rather than saved as an empty translation.
  await assert.rejects(()=>translateTicketText({text:'   ',direction:'en'}),/nothing written here/);
  await assert.rejects(()=>translateTicketText({text:'x',direction:'sideways'}),/English or Japanese/);
  await assert.rejects(()=>translateTicketText({text:'x'.repeat(1001),direction:'ja'}),/at a counter/);
  await assert.rejects(()=>translateTicketText({text:'x'.repeat(4001),direction:'en'}),/too long/);

  // Through the API, the answer is written onto the booking rather than handed to one screen.
  reply={readable:true,language:'Japanese',english:'Check-in is from 15:00. Reference AB-9931.',note:''};
  const {revision}=await(await fetch(base+'/api/state')).json();
  const made=await post('mutate',{revision,operation:{type:'documentNote',title:'Kyoto hotel',category:'reservation',
   reference:'AB-9931',notes:'チェックインは15時です。'}});
  assert.equal(made.status,200);
  const doc=(await made.json()).state.documents.at(-1);
  const translated=await post('ticket-translate',{id:doc.id,field:'notes',direction:'en'});
  assert.equal(translated.status,200);
  const saved=(await translated.json()).state.documents.find(d=>d.id===doc.id);
  assert.equal(saved.translations['notes:en'].english,reply.english);
  assert.equal(saved.translations['notes:en'].source,'チェックインは15時です。');
  assert.equal(saved.translations['notes:en'].by,'Damien');
  assert.equal(saved.translations['notes:en'].usage,undefined,'what it cost is not kept on the family’s ticket');
  // Only the booking's own words go anywhere, chosen by name.
  assert.equal((await(await post('ticket-translate',{id:doc.id,field:'person',direction:'en'})).json()).error,
   'Translate the booking’s name, its reference or its notes.');
  assert.equal((await(await post('ticket-translate',{id:doc.id,field:'notes',direction:'sideways'})).json()).error,'Choose English or Japanese.');
  assert.equal((await post('ticket-translate',{id:'missing',field:'notes',direction:'en'})).status,404);
  // It can be taken off again, and taking it off twice is not an error.
  const cleared=await post('ticket-translate',{id:doc.id,field:'notes',direction:'en',remove:true});
  assert.equal(cleared.status,200);
  assert.deepEqual((await cleared.json()).state.documents.find(d=>d.id===doc.id).translations,{});
  assert.equal((await post('ticket-translate',{id:doc.id,field:'notes',direction:'en',remove:true})).status,200);
 }finally{
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
  delete process.env.LOCAL_DEMO;
  await new Promise(r=>server.close(r));
  await new Promise(r=>upstream.close(r));
 }
});

test('a booking of several pages is one document: the pages keep their order and travel together',async()=>{
 const {ticketFiles,attachmentReel,attachmentsOf,documentThumbnail,offlineManifest,ticketList,isArchived}=await import('../src/trip-features.js');
 const day=seed.days[0].date,step=activeSteps(seed,day).find(s=>!s.locked);
 // What the add form makes of three pages chosen together: the first is the document itself and
 // carries its details, the rest are attached to it in the order they were picked.
 const root={id:'hotel',title:'Kyoto hotel',person:'Family',type:'application/pdf',pathname:'tickets/hotel-1.pdf',
  category:'reservation',reference:'AB-9931',stepIds:[step.id],stepId:step.id,day:null};
 const pages=[1,2].map(n=>({id:`hotel-p${n+1}`,parentDocumentId:'hotel',title:`page-${n+1}.jpg`,person:'Family',
  type:'image/jpeg',pathname:`tickets/hotel-${n+1}.jpg`,category:'reservation',stepIds:[step.id],stepId:step.id,day:null}));
 const s={...structuredClone(seed),documents:[root,...pages]};

 // One row on the list, not three.
 assert.deepEqual(ticketList(s).map(d=>d.id),['hotel']);
 assert.equal(attachmentsOf(s,root).length,2);
 // And one set to open and swipe, in the order the pages were chosen.
 assert.deepEqual(ticketFiles(s.documents,root).map(d=>d.id),['hotel','hotel-p2','hotel-p3']);
 assert.deepEqual(attachmentReel(s.documents,[root],root).map(e=>e.file.id),['hotel','hotel-p2','hotel-p3']);
 assert.deepEqual(attachmentReel(s.documents,[root],pages[1]).map(e=>e.ticket.id),['hotel','hotel','hotel']);
 // A PDF first page cannot be drawn, so the row's thumbnail is the first photo in the set.
 assert.equal(documentThumbnail(root,attachmentsOf(s,root))?.id,'hotel-p2');
 // Every page is downloaded for the day, and every page leaves with the booking.
 assert.equal(offlineManifest(s,day).files.filter(f=>f.key.startsWith('doc-hotel')).length,3);
 const used=applyOperation(s,{type:'status',id:step.id,status:'done'},parent);
 assert.ok(used.documents.every(d=>isArchived(d)),'a booking and all its pages are one thing to put away');
 assert.equal(offlineManifest(used,day).files.filter(f=>f.key.startsWith('doc-hotel')).length,0);
 // Removing the booking removes its pages; removing one page leaves the booking.
 assert.equal(applyOperation(s,{type:'removeDocument',id:'hotel'},parent).documents.length,0);
 assert.deepEqual(applyOperation(s,{type:'removeDocument',id:'hotel-p2'},parent).documents.map(d=>d.id),['hotel','hotel-p3']);
});

test('the sender list can be opened to everyone on purpose, but never by forgetting to fill it in',async()=>{
 const {senderAllowed,openToAnySender,emailInboxReady}=await import('../server/email.mjs');
 const set=(secret,senders)=>{
  if(secret===null)delete process.env.EMAIL_INBOX_SECRET;else process.env.EMAIL_INBOX_SECRET=secret;
  if(senders===null)delete process.env.EMAIL_INBOX_SENDERS;else process.env.EMAIL_INBOX_SENDERS=senders;
 };
 try{
  // An empty list is nobody, not everybody. Forgetting to set it fails closed.
  set('s',null);
  assert.equal(openToAnySender(),false);assert.equal(emailInboxReady(),false);
  assert.equal(senderAllowed('damien.pasfield@gmail.com'),false);
  set('s','   ,  ,');
  assert.equal(emailInboxReady(),false);assert.equal(senderAllowed('damien.pasfield@gmail.com'),false);
  // A named list still only lets those addresses through, whatever case they arrive in.
  set('s','Damien.Pasfield@gmail.com, lauren@example.com');
  assert.equal(openToAnySender(),false);
  assert.equal(senderAllowed('DAMIEN.PASFIELD@GMAIL.COM'),true);
  assert.equal(senderAllowed('stranger@elsewhere.test'),false);
  // One star, chosen deliberately, opens it to anyone — including the original sender of a
  // booking that Gmail forwarded on with its own From left intact.
  set('s','*');
  assert.equal(openToAnySender(),true);assert.equal(emailInboxReady(),true);
  for(const from of ['reservations@hotel.jp','stranger@elsewhere.test','damien.pasfield@gmail.com'])assert.equal(senderAllowed(from),true);
  // A star alongside addresses still means everyone: the wider rule wins rather than silently
  // narrowing to the list beside it.
  set('s','damien.pasfield@gmail.com,*');
  assert.equal(openToAnySender(),true);assert.equal(senderAllowed('anyone@anywhere.test'),true);
  // The star is a sender rule only. It is not a way past the secret.
  set(null,'*');
  assert.equal(emailInboxReady(),false);
 }finally{delete process.env.EMAIL_INBOX_SECRET;delete process.env.EMAIL_INBOX_SENDERS;}
});

test('ticking an activity off says how far ahead or behind schedule the day is',()=>{
 const step={day:'2026-09-21',time:'14:00',duration:45};
 assert.equal(scheduleVariance(step,new Date('2026-09-21T05:33:00Z')).text,'12 min ahead of schedule');
 assert.equal(scheduleVariance(step,new Date('2026-09-21T06:10:00Z')).text,'25 min behind schedule');
 assert.equal(scheduleVariance(step,new Date('2026-09-21T05:45:00Z')).text,'right on schedule');
 assert.equal(scheduleVariance(step,new Date('2026-09-21T05:45:00Z')).target,'14:45');
 // Long overruns are said in hours, because nobody converts 95 minutes in a station concourse.
 assert.equal(scheduleVariance(step,new Date('2026-09-21T07:20:00Z')).text,'1 hr 35 min behind schedule');
 assert.equal(scheduleVariance(step,new Date('2026-09-21T06:45:00Z')).text,'1 hr behind schedule');
 // Nothing to be ahead or behind of without a target time, and a bad timestamp says nothing.
 assert.equal(scheduleVariance({day:'2026-09-21',duration:45},new Date()),null);
 assert.equal(scheduleVariance(step,'not a time'),null);
});
test('arriving says how long we plan to stay, and arriving early does not shorten the stop',()=>{
 const step={day:'2026-09-21',time:'14:00',duration:45};
 assert.equal(stayPlan(step,new Date('2026-09-21T04:50:00Z')).until,'14:45');
 assert.equal(stayPlan(step,new Date('2026-09-21T05:20:00Z')).until,'15:05');
 assert.match(stayPlan(step,new Date('2026-09-21T05:20:00Z')).text,/about 45 min, moving on around 15:05/);
 const open={day:'2026-09-21',time:null,duration:0};
 assert.equal(stayPlan(open,new Date('2026-09-21T05:20:00Z')).until,null);
 assert.match(stayPlan(open,new Date('2026-09-21T05:20:00Z')).text,/No length set/);
});

test('a question about the trip is answered out of the plan, and cannot change a thing',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 let seen=null;
 const answer={
  verdict:'Do Fushimi Inari tomorrow morning, not today.',
  answer:'Today is the Kyoto travel day and the Nozomi is booked for 12:30, so the afternoon is already spoken for.',
  because:['70% chance of rain on the 24th, wettest around 15:00.','The 12:30 Nozomi is booked and cannot move.','A'.repeat(900)],
  days:['2026-09-24','2026-09-25','2099-01-01','2026-09-24'],
  checkFirst:'The shrine is open at all hours but the little shops on the path are not. Check before you rely on breakfast up there.',
  sources:[{title:'Fushimi Inari Taisha',url:'https://inari.jp/'},{title:'A blog',url:'http://not-secure.example'},{title:'No link at all',url:'not a url'}]
 };
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen=JSON.parse(body);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'m1',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'tool_use',
    usage:{input_tokens:9000,output_tokens:600,server_tool_use:{web_search_requests:1}},
    content:[{type:'tool_use',id:'c1',name:'record_answer',input:answer}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {askTrip,askReady,tripBrief,normaliseAnswer,conversation,MAX_QUESTION}=await import('../server/ask.mjs');
  assert.equal(askReady(),true);
  let state=ensureFeatures(structuredClone(seed));
  state=applyOperation(state,{type:'weatherUpdate',days:{'2026-09-24':{city:'Kyoto',code:61,max:24,min:18,rain:70}},
   hours:{'2026-09-24':[{h:9,temp:20,rain:30},{h:15,temp:24,rain:80}]}},parent);
  state=applyOperation(state,{type:'proposalAdd',title:'Fushimi Inari at dawn',place:'Kyoto',cost:0},parent);
  state=applyOperation(state,{type:'todoAdd',title:'Buy an umbrella',day:'2026-09-24'},parent);
  state=applyOperation(state,{type:'partyPerson',name:'Boston',age:8,interests:['sport','trains']},parent);
  const now=new Date('2026-09-24T01:00:00Z');
  const result=await askTrip({question:'Is Fushimi Inari better today or tomorrow?',day:'2026-09-24',
   history:[{role:'user',text:'What is the weather doing in Kyoto?'},{role:'assistant',text:'Wet on Thursday afternoon.'}]},state,parent,now);

  // The request the SDK actually put on the wire.
  assert.equal(seen.model,'claude-opus-5');
  assert.deepEqual(seen.thinking,{type:'adaptive'});
  const search=seen.tools.find(t=>t.name==='web_search');
  assert.equal(search.max_uses,5);
  assert.equal(search.user_location.country,'JP');
  const record=seen.tools.find(t=>t.name==='record_answer');
  assert.equal(record.strict,true);
  assert.deepEqual(record.input_schema.required.sort(),['answer','because','checkFirst','days','sources','verdict']);
  assert.match(seen.system,/cannot change their plan, move an activity, book anything/);
  assert.match(seen.system,/Never invent a web address/);
  // What was said before comes back as plain text, in order, before the new question.
  assert.equal(seen.messages.length,3);
  assert.deepEqual(seen.messages.slice(0,2),[{role:'user',content:'What is the weather doing in Kyoto?'},{role:'assistant',content:'Wet on Thursday afternoon.'}]);
  const ask=seen.messages[2].content;
  assert.match(ask,/Their question: Is Fushimi Inari better today or tomorrow\?$/);
  assert.match(ask,/Damien is asking\./);

  // The day asked about is written out activity by activity, with its notes.
  assert.match(ask,/12:30 · Nozomi 33 to Kyoto · Tokyo Station · 30 min · booked for 12:30/);
  assert.match(ask,/note: Green Car 8/);
  // Every other day is still there, but only its shape and whatever is booked and cannot move.
  assert.match(ask,/2026-10-03 · Tokyo · Harajuku & a Giants night/);
  assert.match(ask,/18:00 · Giants vs DeNA/);
  assert.doesNotMatch(ask,/Harajuku Takeshita Street/,'an unbooked activity on a far-off day is not worth the tokens');
  // The forecast, how fresh it is, the board, the jobs and who is going all go with it.
  assert.match(ask,/light rain, 18–24°C, 70% chance of rain, wettest around 15:00/);
  assert.match(ask,/The forecast above was checked .*, by Damien\./);
  assert.match(ask,/Fushimi Inari at dawn · Kyoto · free/);
  assert.match(ask,/Buy an umbrella · on 2026-09-24/);
  assert.match(ask,/Boston, 8 — likes Sport & sumo, Trains & engineering/);
  assert.match(ask,/In Japan it is 2026-09-24, 10:00\./);

  // What comes back is cut to what the screen can draw, and nothing else survives.
  assert.equal(result.verdict,'Do Fushimi Inari tomorrow morning, not today.');
  assert.equal(result.about,'2026-09-24');
  assert.equal(result.question,'Is Fushimi Inari better today or tomorrow?');
  assert.deepEqual(result.days,['2026-09-24','2026-09-25'],'a date that is not a trip day, or is said twice, is dropped');
  assert.equal(result.because.length,3);
  assert.equal(result.because[2].length,400,'a reason that ran away is cut rather than dropped');
  assert.deepEqual(result.sources,[{title:'Fushimi Inari Taisha',url:'https://inari.jp/'}],'only HTTPS pages survive');
  assert.equal(result.usage.searches,1);
  // Nothing was written anywhere: the answer is handed back and the family changes the plan.
  assert.deepEqual(state.proposals.length,1);
  assert.equal(state.steps.find(s=>s.title==='Nozomi 33 to Kyoto').time,'12:30');

  // A boy asking is told he is a boy asking, so the answer is not about money or bookings.
  await askTrip({question:'Can we do the monkeys?'},state,{name:'Boston',role:'child'},now);
  assert.match(seen.messages.at(-1).content,/Boston is asking, and he is one of the boys/);
  // No day chosen means the whole trip, anchored on the Japan day it actually is.
  assert.match(seen.messages.at(-1).content,/They are asking about 2026-09-24/);

  // Half a conversation is not a conversation. Anything that would make the API refuse the
  // call — a dangling question, two of the same speaker in a row, an empty turn — is dropped
  // here rather than sent and rejected.
  assert.deepEqual(conversation([{role:'assistant',text:'Out of nowhere.'}]),[]);
  assert.deepEqual(conversation([{role:'user',text:'One.'}]),[]);
  assert.deepEqual(conversation([{role:'user',text:'One.'},{role:'user',text:'Two.'},{role:'assistant',text:'Both.'}]),
   [{role:'user',content:'One.'},{role:'assistant',content:'Both.'}]);
  assert.deepEqual(conversation([{role:'user',text:'  '},{role:'user',text:'Real.'},{role:'assistant',text:'Yes.'},{role:'user',text:'And this one?'}]),
   [{role:'user',content:'Real.'},{role:'assistant',content:'Yes.'}]);
  assert.deepEqual(conversation('nonsense'),[]);
  assert.ok(conversation(Array.from({length:40},(_,i)=>({role:i%2?'assistant':'user',text:`turn ${i}`}))).length<=8);

  // Guards, before anything is sent anywhere.
  await assert.rejects(()=>askTrip({question:'   '},state,parent),/Type a question first/);
  await assert.rejects(()=>askTrip({question:'a'.repeat(MAX_QUESTION+1)},state,parent),/one at a time/);
  await assert.rejects(()=>askTrip({question:'When?',day:'2099-01-01'},state,parent),/Choose a trip day/);
  // And the brief is built for whatever day is asked about, not only for today.
  assert.match(tripBrief(state,{day:'2026-10-05',now}),/They are asking about 2026-10-05/);
  assert.equal(normaliseAnswer({},state).verdict,'');
  assert.deepEqual(normaliseAnswer({days:['2026-09-24'],sources:'rubbish',because:'rubbish'},state).sources,[]);
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
 const {askReady}=await import('../server/ask.mjs');
 assert.equal(askReady(),false,'with no key there is nothing to answer with');
 // Asked by whoever is holding the phone, not only by a parent — and answered from the trip as
 // that person is allowed to see it, so a question cannot read back what the screen hides.
 const handlerSource=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 assert.match(handlerSource,/route==='ask'&&post\)\{[\s\S]{0,200}askTrip\(b,visibleTrip\(state,user\),user\)/);
 assert.doesNotMatch(handlerSource,/route==='ask'&&post\)\{\s*\n?\s*parent\(user\)/);
 assert.match(handlerSource,/ask:askReady\(\)/);
 // And the screen is only offered where there is a key behind it, like forwarded email.
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/ask:!!config\?\.ask\|\|hasAskHistory\(user\)/);
 assert.match(main,/tab==='ask'&&<AskTrip/);
 // A link to it, or an old bar setting holding it, cannot strand somebody on a screen this
 // deployment cannot answer with: they land back on Home, the way forwarded email works.
 assert.match(main,/if\(tab==='ask'&&user&&!isAvailable\('ask'\)\)setTab\('today'\);\},\[tab,user\?\.name,config\?\.ask\]\)/);
 const screen=await readFile(new URL('../src/AskTrip.jsx',import.meta.url),'utf8');
 // The one line that has to be on the screen rather than only in the prompt: a box that answers
 // questions looks like a box that does things, and nobody should find that out by asking it to.
 assert.match(screen,/It cannot move an activity, change a booking or tell anybody anything/);
});

test('the questions offered first are built out of the day in front of them',async()=>{
 const {askStarters,askHistory,THREAD_KEEP,ASK_HISTORY}=await import('../src/ask-thread.js');
 const {ensureFeatures}=await import('../src/trip-features.js');
 let state=ensureFeatures(structuredClone(seed));
 state=applyOperation(state,{type:'weatherUpdate',days:{'2026-09-24':{city:'Kyoto',code:61,max:24,min:18,rain:70}}},parent);
 state=applyOperation(state,{type:'proposalAdd',title:'Fushimi Inari at dawn',place:'Kyoto'},parent);
 const starters=askStarters(state,'2026-09-24',new Date('2026-09-24T01:00:00Z'));
 assert.ok(starters.length>=3&&starters.length<=4);
 // Every one of them names something that is actually on the plan, so the first question is a
 // tap rather than a blank box.
 // Something they would actually weigh up moving — not a booking, and not breakfast at the
 // hotel they are standing in.
 assert.ok(starters.some(q=>/better on Thu, 24 Sept or the day after\?$/.test(q)),'the next thing that can still be moved');
 assert.ok(!starters.some(q=>/Breakfast|Check out|Pack and final/.test(q)),'and nothing nobody would ever move');
 assert.ok(starters.some(q=>/rain forecast for/.test(q)),'the forecast they last checked');
 assert.ok(starters.some(q=>/Nozomi 33 to Kyoto/.test(q)),'and what is booked and cannot be late');
 for(const q of starters)assert.ok(q.endsWith('?'),`"${q}" is not a question`);
 // A day with nothing on it still offers something rather than an empty row.
 assert.ok(askStarters(state,'2099-01-01').length,'an unknown day falls back rather than blanking');
 assert.deepEqual(askStarters({days:[]},'2026-09-24'),[]);
 assert.deepEqual(askStarters(undefined,'2026-09-24'),[]);
 // Only whole exchanges go back with the next question, oldest first, and only the last few of
 // them. A question waiting for its answer is not one of them.
 const thread=Array.from({length:9},(_,i)=>({id:`${i}`,question:`q${i}`,verdict:`v${i}`,answer:`a${i}`}));
 const history=askHistory(thread);
 assert.equal(history.length,ASK_HISTORY*2);
 assert.deepEqual(history.slice(0,2),[{role:'user',text:'q3'},{role:'assistant',text:'v3 a3'}]);
 assert.deepEqual(history.at(-1),{role:'assistant',text:'v0 a0'});
 for(let i=0;i<history.length;i++)assert.equal(history[i].role,i%2?'assistant':'user','it has to alternate or the API refuses it');
 assert.ok(THREAD_KEEP>=ASK_HISTORY,'more is kept on the phone than is ever sent back');
});

test('a boy can say his answer instead of typing it, and the words are still his to change',async()=>{
 const {joinSpoken,heardSoFar,tidySpoken,dictationProblem,canDictate,dictationEngine,writeInto,DICTATE_LANG,MAX_LISTEN_SECONDS,NO_DICTATION}=await import('../src/dictation.js');
 // The engine hands back everything it has heard on every result, so nothing is written into
 // the box twice: `settled` is how far the box has already been filled.
 const results=[{0:{transcript:'the deer bowed'},isFinal:true},{0:{transcript:' and then'},isFinal:false}];
 let heard=heardSoFar(results,0);
 assert.equal(heard.said,'the deer bowed');
 assert.equal(heard.thinking,'and then','what it is still thinking about is shown, not written');
 assert.equal(heard.settled,1);
 results[1]={0:{transcript:' and then it bowed again'},isFinal:true};
 heard=heardSoFar(results,heard.settled);
 assert.equal(heard.said,'and then it bowed again','only the new part, never the whole thing again');
 assert.equal(heard.settled,2);
 assert.deepEqual(heardSoFar(undefined,0),{said:'',thinking:'',settled:0});
 // Spoken words are added to whatever is in the box — typed, said a minute ago, or written by
 // a parent — and a new sentence gets its capital letter where carrying on from half of one
 // does not, because an engine sends "and then" as readily as it sends a whole thought.
 assert.equal(joinSpoken('','the deer bowed'),'The deer bowed');
 assert.equal(joinSpoken('We fed the deer.','it bowed back'),'We fed the deer. It bowed back');
 assert.equal(joinSpoken('We fed the deer and','it bowed back'),'We fed the deer and it bowed back');
 assert.equal(joinSpoken('We fed the deer','   '),'We fed the deer','a silence changes nothing');
 assert.equal(joinSpoken(undefined,'hello'),'Hello');
 assert.equal(tidySpoken('  the   deer \n bowed '),'the deer bowed');
 // A box a form reads with FormData is not held in React, so the words go straight into it.
 const box={value:'We fed the deer.'};
 assert.equal(writeInto(box,'it bowed back'),'We fed the deer. It bowed back');
 assert.equal(box.value,'We fed the deer. It bowed back');
 assert.equal(writeInto(null,'anything'),'','no box, nothing written and nothing thrown');
 // Stopping on purpose is not a fault worth telling a five-year-old about; everything else says
 // what happened and what to do about it, never a code on its own.
 assert.equal(dictationProblem('aborted'),'');
 assert.equal(dictationProblem(''),'');
 assert.match(dictationProblem('not-allowed'),/microphone/i);
 assert.match(dictationProblem('no-speech'),/Nothing was heard/);
 assert.match(dictationProblem('network'),/voice note/i,'no signal has a way through that does not need one');
 assert.match(dictationProblem('unheard-of'),/unheard-of[\s\S]*keyboard/,'an unknown fault still says what to do next');
 // No engine, no button — the keyboard has a microphone key of its own.
 const Engine=function(){};
 assert.equal(canDictate({}),false);
 assert.equal(dictationEngine({}),null);
 assert.equal(dictationEngine({webkitSpeechRecognition:Engine}),Engine,'Safari is the phone this is for');
 assert.equal(canDictate({SpeechRecognition:Engine}),true);
 assert.equal(DICTATE_LANG,'en-AU','a phone left to itself will mis-hear a child');
 assert.ok(MAX_LISTEN_SECONDS>=60&&MAX_LISTEN_SECONDS<=300,'long enough for a story, short enough to turn itself off');
 assert.match(NO_DICTATION,/keyboard/);
 const dictate=await readFile(new URL('../src/Dictate.jsx',import.meta.url),'utf8');
 // The phone listens and the words land in the box. Nothing is recorded, nothing is uploaded,
 // nothing is sent and nothing saves itself — each of those is a different feature, and none of
 // them belongs under a five-year-old's answer.
 assert.doesNotMatch(dictate,/MediaRecorder|getUserMedia|upload\(|request\(|fetch\(|mutate\(/);
 assert.match(dictate,/if\(!supported\)return null/);
 assert.match(dictate,/abort\(\)/,'a listener left running keeps the microphone open after the screen has gone');
 assert.match(dictate,/setTimeout\(\(\)=>\{try\{rec\.stop\(\)/,'and one left listening in a pocket stops itself');
 // Every box that asks somebody for their own words offers it.
 const missions=await readFile(new URL('../src/AdventurePages.jsx',import.meta.url),'utf8');
 assert.match(missions,/<textarea ref=\{box\} name="response"/);
 assert.match(missions,/\{mine&&<Dictate into=\{box\}/,'and only where that person is allowed to answer');
 assert.match(missions,/placeholder="Say it out loud, type it, or tell a parent"/);
 const review=await readFile(new URL('../src/StepReview.jsx',import.meta.url),'utf8');
 assert.match(review,/<Dictate into=\{box\}/);
 const ask=await readFile(new URL('../src/AskTrip.jsx',import.meta.url),'utf8');
 // The question box is held in React, so what is heard goes through state — and it is only ever
 // put in the box. Talking does not ask, any more than typing does.
 assert.match(ask,/<Dictate onText=\{heard=>setQuestion\(q=>joinSpoken\(q,heard\)\.slice\(0,ASK_LIMIT\)\)\}/);
 assert.doesNotMatch(ask,/onText=\{[^}]*\bask\(/);
});

test('each stop has its own forecast, for its neighbourhood at its hour, and the day has its sunrise and sunset',async()=>{
 const {forecastUrl,areaForecastUrl,parseForecast,parseHourly,stepPoint,stepHour,stepTargets,stepReadings,stepWeather,isDark,iconAt,pointFor}=await import('../src/weather-data.js');
 const {ensureFeatures}=await import('../src/trip-features.js');
 let state=ensureFeatures(structuredClone(seed));
 // Sunrise and sunset come with the day, as clock times in Japan.
 assert.match(forecastUrl(pointFor('Tokyo'),'2026-09-21','2026-09-21'),/sunrise%2Csunset/);
 const day=seed.days[0].date;
 const daily=parseForecast({daily:{time:[day],weather_code:[0],temperature_2m_max:[26],temperature_2m_min:[19],precipitation_probability_max:[10],
  sunrise:[`${day}T05:29`],sunset:[`${day}T17:41`]}},'Tokyo');
 assert.equal(daily[day].sunrise,'05:29');assert.equal(daily[day].sunset,'17:41');
 assert.ok(isDark(daily[day],20)&&isDark(daily[day],4)&&!isDark(daily[day],12));
 assert.equal(iconAt(0,true),'🌙','a clear night is a moon');assert.equal(iconAt(0,false),'☀️');
 // A stop is forecast where it is: Arashiyama is not central Kyoto, Haneda is not central Tokyo.
 assert.equal(stepPoint(state,{day:'2026-09-26',place:'Arashiyama Bamboo Grove',title:'Bamboo walk'}).name,'Arashiyama');
 assert.equal(stepPoint(state,{day,place:'Haneda Airport',title:'Arrive'}).name,'Haneda');
 assert.equal(stepPoint(state,{day,place:'Somewhere unheard of',title:'A walk'}).name,'Tokyo','an unknown place falls back to the day’s city');
 assert.equal(stepPoint(state,{day,place:'x',pin:{lat:35.6581,lng:139.7017}}).name,'where we pinned it');
 // Every seeded stop lands somewhere in Japan.
 for(const s of seed.steps){const p=stepPoint(state,s);assert.ok(p.lat>33&&p.lat<37&&p.lon>134&&p.lon<141,`${s.title} has no sensible point`);}
 // Its hour: its own time, rounded to the nearest hour, or placed after the timed stop before it.
 const list=[{id:'a',time:'09:40',duration:60},{id:'b',time:null,duration:30},{id:'c',time:null,duration:30},{id:'d',time:'14:10'}];
 assert.deepEqual(stepHour(list,list[0]),{h:10,approx:false});
 assert.deepEqual(stepHour(list,list[2]),{h:11,approx:true},'09:40 plus an hour and half an hour');
 assert.deepEqual(stepHour([{id:'x',time:null},{id:'y',time:'08:00'}],{id:'x'}),{h:8,approx:true});
 assert.equal(stepHour([{id:'x',time:null}],{id:'x'}),null,'a day with no times at all says nothing');
 // One lookup per neighbourhood, several neighbourhoods per request.
 const targets=stepTargets(state,day);
 assert.ok(targets.length>5&&targets.every(t=>t.items.length));
 assert.ok(targets.reduce((n,t)=>n+t.items.length,0)>200,'nearly every stop has an hour');
 const url=new URL(areaForecastUrl(targets.slice(0,3).map(t=>t.point),day,day));
 assert.equal(url.searchParams.get('latitude').split(',').length,3);
 assert.equal(url.searchParams.get('timezone'),'Asia/Tokyo');
 // The hours for each place, read back to each stop.
 const hourly=date=>({hourly:{time:Array.from({length:24},(_,h)=>`${date}T${String(h).padStart(2,'0')}:00`),
  temperature_2m:Array.from({length:24},(_,h)=>15+h/2),apparent_temperature:Array(24).fill(14),precipitation_probability:Array(24).fill(60),weather_code:Array(24).fill(61)}});
 const first=targets.find(t=>t.items.some(x=>x.date===day));
 const readings=stepReadings([first],[parseHourly(hourly(day))]);
 const item=first.items.find(x=>x.date===day);
 assert.equal(readings[item.id].area,first.point.name);assert.equal(readings[item.id].h,item.h);
 // Kept in the trip and checked on the way in, by anybody.
 state=applyOperation(state,{type:'weatherUpdate',days:daily,steps:{...readings,'no-such-stop':{h:1,temp:20,area:'x'}}},child);
 assert.equal(state.weather.steps[item.id].area,first.point.name);
 assert.equal(state.weather.steps['no-such-stop'],undefined,'a stop that is not in the plan is not kept');
 for(const bad of [{[item.id]:{h:30,temp:20,area:'x'}},{[item.id]:{h:3,temp:20}},{[item.id]:{h:3,temp:200,area:'x'}},[]])
  assert.throws(()=>applyOperation(state,{type:'weatherUpdate',days:{},steps:bad},parent),/forecast/i);
 assert.throws(()=>applyOperation(state,{type:'weatherUpdate',days:{[day]:{...daily[day],sunset:'25:99'}}},parent),/forecast/i);
 // The card reads the stop's own reading while it still describes the stop.
 const step=state.steps.find(s=>s.id===item.id);
 const w=stepWeather(state,step);
 assert.ok(w.local);assert.equal(w.area,first.point.name);assert.equal(w.rain,60);
 // Moved to another hour, it falls back to the city's hour, and says so — or to nothing.
 const moved={...step,time:step.time==='03:00'?'04:00':'03:00',locked:false};
 assert.equal(stepWeather(state,moved,[moved]),null,'no city hours saved, so nothing rather than a wrong answer');
 state=applyOperation(state,{type:'weatherUpdate',days:{},hours:parseHourly(hourly(step.day))},parent);
 const city=stepWeather(state,moved,[moved]);
 assert.equal(city.local,false);assert.equal(city.h,3);
 // Shown on the card and down the day at a glance.
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const timeline=await readFile(new URL('../src/DayTimeline.jsx',import.meta.url),'utf8');
 const weather=await readFile(new URL('../src/Weather.jsx',import.meta.url),'utf8');
 assert.match(main,/<StepWeather state=\{visibleState\} step=\{current\} steps=\{steps\} pill onOpen=\{\(\)=>go\('weather',day\)\}\/>/);
 assert.match(timeline,/<StepWeather state=\{state\} step=\{s\} steps=\{steps\} compact\/>/);
 assert.match(weather,/<SunTimes entry=\{today\}\/>/);
});
test('a photo pinches in about the fingers, stays inside its frame, and a double tap comes back out',()=>{
 const w=400,h=300;
 // Whatever sits under the fingers stays under them as the picture grows.
 const at=zoomAbout(REST,2,100,50,w,h);assert.deepEqual(at,{s:2,x:-100,y:-50});
 assert.equal((100-at.x)/at.s,100);assert.equal((50-at.y)/at.s,50);
 // Never smaller than fitted, never past the cap, never dragged so far an edge comes away.
 assert.deepEqual(clampView({s:.4,x:30,y:30},w,h),REST);
 assert.equal(clampView({s:99,x:0,y:0},w,h).s,MAX_ZOOM);
 assert.deepEqual(clampView({s:2,x:50,y:-900},w,h),{s:2,x:0,y:-300});
 // Fingers spreading to twice their distance doubles the view they started from, and the
 // midpoint moving carries the picture along with it.
 const start={s:2,x:-100,y:-50},from={mx:200,my:150,d:100};
 assert.deepEqual(pinchView(start,from,{mx:200,my:150,d:200},w,h),{s:4,x:-400,y:-250});
 assert.deepEqual(pinchView(start,from,{mx:180,my:140,d:100},w,h),{s:2,x:-120,y:-60});
 assert.deepEqual(pinchView(start,from,{mx:200,my:150,d:10},w,h),REST);
 // Double tap goes in on the spot, and again comes back to fitting the screen.
 const tapped=tapView(REST,200,150,w,h);assert.equal(tapped.s,2.5);assert.equal((200-tapped.x)/tapped.s,200);
 assert.deepEqual(tapView(tapped,10,10,w,h),REST);
});

test('both photo viewers hand their picture to the zoomable frame, and a zoomed photo holds the swipe back',async()=>{
 const viewer=await readFile(new URL('../src/TicketViewer.jsx',import.meta.url),'utf8');
 const gallery=await readFile(new URL('../src/MediaGallery.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(viewer,/<ZoomImage key=\{view\.id\}[^>]*onZoom=/);
 assert.match(viewer,/onTouchStart=\{e=>\{touch\.current=e\.touches\.length===1&&!zoomed\.current/);
 assert.match(viewer,/if\(!touch\.current\|\|zoomed\.current/);
 assert.match(gallery,/<ZoomImage src=\{fileUrl\(view\)\}/);
 // The frame takes every touch, so the page itself never zooms underneath the photo.
 assert.match(css,/\.zoom-frame\{[^}]*touch-action:none/);
});

test('the printed Day 11 programme loads as the card, with no site and no key',async()=>{
 const {PRINTED_CARD}=await import('../src/sumo-printed.js');
 const {sumo,sumoCard,boutPredictions}=await import('../src/trip-features.js');
 let state=applyOperation(structuredClone(seed),{type:'sumoUpdate',...PRINTED_CARD},parent);
 assert.equal(sumo(state).bouts.length,34);
 assert.deepEqual(sumoCard(state).map(g=>[g.id,g.bouts.length]),[['juryo',14],['makuuchi',20]]);
 const last=sumoCard(state).at(-1).bouts.at(-1);
 assert.equal(`${last.east.name} v ${last.west.name}`,'Onosato v Fujinokawa','the last bout of the day is the last on the sheet');
 assert.equal(last.east.rank,'Yokozuna · 9-1');assert.equal(last.west.stable,'Isenoumi');
 for(const b of sumo(state).bouts)for(const man of [b.east,b.west])assert.ok(man.stable,`${man.name} has no stable`);
 for(const b of sumo(state).bouts)for(const man of [b.east,b.west])assert.ok(man.rank,`${man.name} has no rank`);
 state=applyOperation(state,{type:'sumoPredict',id:last.id,person:'Boston',winner:'Onosato'},child);
 // Loading it again keeps the picks already made on it.
 state=applyOperation(state,{type:'sumoUpdate',...PRINTED_CARD},parent);
 assert.equal(boutPredictions(state,last.id).Boston,'Onosato');
});

test('every wrestler on the printed card has his name in Japanese and how to say it',async()=>{
 const {PRINTED_CARD}=await import('../src/sumo-printed.js');
 const {SUMO_NAMES,sumoName}=await import('../src/sumo-names.js');
 const {sayName,romajiName,plainName}=await import('../src/sumo-say.js');
 for(const b of PRINTED_CARD.bouts)for(const man of [b.east,b.west])assert.ok(sumoName(man.name),`${man.name} has no Japanese name`);
 // The kana is checked against the name as the programme spells it, so a slip in either shows.
 for(const [name,[kanji,kana]] of Object.entries(SUMO_NAMES)){
  assert.equal(plainName(kana).toLowerCase(),name.toLowerCase(),`${name}: ${kana} does not read as ${name}`);
  assert.match(kanji,/^[\p{Script=Han}ノの乃之]+$/u,`${name}: ${kanji}`);
 }
 assert.deepEqual(sayName('おおのさと'),{say:'oh-noh-sa-toh',hold:['oh']});
 assert.equal(romajiName('ほうしょうりゅう'),'Hōshōryū');
 assert.equal(sayName('だいえいしょう').say,'dye-ay-shoh');
 // A word boundary is not a long vowel: Hiradoumi is Hirado-umi, not Hiradōmi.
 assert.equal(romajiName('ひらど・うみ'),'Hiradoumi');assert.equal(sayName('ひらど・うみ').say,'hee-ra-doh-oo-mee');
 assert.equal(sumoName('Kazuma').kanji,'一意');assert.equal(sumoName('Onokatsu').kanji,'阿武剋');
 assert.equal(sumoName('Hiradoumi').phrase.ja,'ひらどうみ','the dot is only a marker and is not read aloud');
 assert.equal(sumoName('Nobody'),null);
});

test('the tipping comp keeps a running total bout by bout',async()=>{
 const {PRINTED_CARD}=await import('../src/sumo-printed.js');
 const {runningTotals}=await import('../src/trip-features.js');
 let state=applyOperation(structuredClone(seed),{type:'sumoUpdate',...PRINTED_CARD},parent);
 const [a,b,c]=PRINTED_CARD.bouts;
 for(const [bout,person,side] of [[a,'Boston','east'],[a,'Nate','west'],[b,'Boston','east'],[b,'Nate','east'],[c,'Nate','west']])
  state=applyOperation(state,{type:'sumoPredict',id:bout.id,person,winner:bout[side].name},child);
 assert.deepEqual(runningTotals(state,state.members),{},'nothing moves before a result');
 state=applyOperation(state,{type:'sumoResult',id:a.id,winner:a.east.name},child);
 state=applyOperation(state,{type:'sumoResult',id:b.id,winner:b.east.name},child);
 const after=runningTotals(state,state.members);
 assert.equal(after[a.id].Boston,1);assert.equal(after[a.id].Nate,0);
 assert.equal(after[b.id].Boston,2);assert.equal(after[b.id].Nate,1);
 assert.equal(after[c.id],undefined,'a bout still to come has no total yet');
 for(const name of state.members)assert.ok(name in after[b.id],`${name} is on the running total from the start`);
});

test('the handout details and photos are there for the wrestlers on it',async()=>{
 const {PRINTED_CARD}=await import('../src/sumo-printed.js');
 const {sumoProfile,SUMO_PROFILE_NAMES}=await import('../src/sumo-profiles.js');
 const {readdir}=await import('node:fs/promises');
 const photos=new Set(await readdir(new URL('../src/sumo-photos/',import.meta.url)));
 const onCard=new Set(PRINTED_CARD.bouts.flatMap(b=>[b.east.name,b.west.name]));
 for(const name of SUMO_PROFILE_NAMES){
  const p=sumoProfile(name);
  assert.ok(photos.has(`${name.toLowerCase()}.jpg`),`no photo for ${name}`);
  assert.ok(p.age>=18&&p.age<=45&&p.heightCm>=160&&p.heightCm<=210&&p.weightKg>=100&&p.weightKg<=250,`${name} does not look like a wrestler`);
  // Everybody on the sheet is on today's card, apart from the two it marks absent.
  assert.equal(onCard.has(name),!p.absent,`${name}: on the card ${onCard.has(name)}, absent ${p.absent}`);
  if(p.brother)assert.equal(sumoProfile(p.brother).brother,name,'brothers go both ways');
 }
 assert.deepEqual(sumoProfile('Shodai').notes,['Top-division champion ×1']);
 assert.ok(sumoProfile('Toshinofuji').notes.includes('New to the top division'));
 // Both pages of the handout: every man in the top division on today's card has his details.
 // (Dewanoryu is a juryo man fighting up a division today, so he is not on it.)
 for(const b of PRINTED_CARD.bouts.filter(b=>b.division==='makuuchi'))for(const man of [b.east,b.west])
  if(!/^Juryo/.test(man.rank))assert.ok(sumoProfile(man.name),`${man.name} has nothing from the handout`);
 assert.equal(sumoProfile('Onosato').titles,5);assert.ok(sumoProfile('Hoshoryu').absent);
 assert.equal(sumoProfile('Meisei'),null,'the handout is the top division only');
});

test('the next bout is the feature, and finished bouts go to the foot, latest first',async()=>{
 const {PRINTED_CARD}=await import('../src/sumo-printed.js');
 const {boutQueue}=await import('../src/trip-features.js');
 let state=applyOperation(structuredClone(seed),{type:'sumoUpdate',...PRINTED_CARD},parent);
 const ids=PRINTED_CARD.bouts.map(b=>b.id);
 let q=boutQueue(state);
 assert.equal(q.next.id,ids[0]);assert.equal(q.upcoming.length,33);assert.equal(q.finished.length,0);
 for(const id of ids.slice(0,2))state=applyOperation(state,{type:'sumoResult',id,winner:PRINTED_CARD.bouts.find(b=>b.id===id).east.name},child);
 q=boutQueue(state);
 assert.equal(q.next.id,ids[2]);assert.deepEqual(q.finished.map(b=>b.id),[ids[1],ids[0]],'latest first');
 // Held for the moment its win is shown, a decided bout stays where it was.
 q=boutQueue(state,ids[1]);
 assert.equal(q.next.id,ids[1]);assert.deepEqual(q.finished.map(b=>b.id),[ids[0]]);
 // Out of order is fine: the feature is always the first one still open.
 state=applyOperation(state,{type:'sumoResult',id:ids[5],winner:PRINTED_CARD.bouts[5].west.name},child);
 q=boutQueue(state);assert.equal(q.next.id,ids[2]);assert.equal(q.finished[0].id,ids[5]);
 assert.ok(!q.upcoming.some(b=>b.id===ids[5]));
});
test('each bout is numbered within its division, and a refreshed card renumbers itself', async()=>{
 const {PRINTED_CARD}=await import('../src/sumo-printed.js');
 const {boutNumbers}=await import('../src/trip-features.js');
 let state=applyOperation(structuredClone(seed),{type:'sumoUpdate',...PRINTED_CARD},parent);
 let n=boutNumbers(state);
 assert.deepEqual(n['juryo-1'],{number:1,of:14,division:'juryo'});
 assert.deepEqual(n['makuuchi-1'],{number:1,of:20,division:'makuuchi'});
 assert.deepEqual(n['makuuchi-20'],{number:20,of:20,division:'makuuchi'});
 // Drop the first top-division bout and load again: everything after it moves up one.
 state=applyOperation(state,{type:'sumoUpdate',...PRINTED_CARD,bouts:PRINTED_CARD.bouts.filter(b=>b.id!=='makuuchi-1')},parent);
 n=boutNumbers(state);
 assert.equal(n['makuuchi-1'],undefined);
 assert.deepEqual(n['makuuchi-2'],{number:1,of:19,division:'makuuchi'});
});

test('the packing list suggests from where we are, the weather, the days ahead and who is coming',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {allSuggestions,packingSuggestions,dismissedSuggestions,packingWeather,daysAhead,nextPackUp,packingProgress,PACK_CATEGORIES}=await import('../src/packing-data.js');
 const state=ensureFeatures(structuredClone(seed)),first=seed.days[0].date,ids=list=>list.map(s=>s.id);
 const before=allSuggestions(state,'2026-09-01');
 // Japan, whatever the plan: passports, plugs, cash, and somewhere to put our rubbish.
 for(const id of ['passports','adaptor','cash','ic-card','rubbish','medicines'])assert.ok(ids(before).includes(id),`${id} is always suggested`);
 assert.equal(before.find(s=>s.id==='passports').qty,seed.members.length,'one passport each');
 // The days: theme parks, the Shinkansen and the flight home are all on the plan.
 for(const id of ['ponchos','bigbags','biosecurity','walkingshoes','overnight'])assert.ok(ids(before).includes(id),`${id} follows from the plan`);
 const ponchos=before.find(s=>s.id==='ponchos');
 assert.equal(ponchos.sources[0],'activity');assert.match(ponchos.why[0],/Theme parks · /,'it names the days');
 // A ride called "Flight" is not a flight.
 assert.ok(!before.find(s=>s.id==='flight-kit').why[0].includes('25 Sept'),'Flight of the Hippogriff is not the plane home');
 // Who is coming: the boys get their own, and a food card follows a dietary note.
 assert.ok(before.some(s=>s.id==='meetingcard-Nate'&&s.person==='Nate'));
 assert.ok(before.some(s=>s.id==='stroller-Nate'),'Nate is five');
 assert.ok(!before.some(s=>s.id==='stroller-Boston'),'Boston is not');
 assert.ok(!before.some(s=>s.id.startsWith('foodcard-')));
 const fussy=ensureFeatures({...structuredClone(seed),party:{people:{Lauren:{age:40,interests:['photo'],dietary:'No shellfish'}}}});
 const lauren=allSuggestions(fussy,'2026-09-01');
 assert.match(lauren.find(s=>s.id==='foodcard-Lauren').note,/No shellfish/);
 assert.ok(lauren.some(s=>s.id==='camera-Lauren'));
 // Every suggestion is one line, in a real category, with at least one reason.
 assert.equal(new Set(ids(before)).size,before.length);
 for(const s of before){assert.ok(PACK_CATEGORIES.some(([id])=>id===s.category),s.id);assert.ok(s.why.length&&s.why.every(Boolean),s.id);}
 // Weather: with no forecast saved it uses the usual month, and says so.
 const usual=packingWeather(state,daysAhead(state,'2026-09-01'));
 assert.equal(usual.forecast,0);
 assert.match(before.find(s=>s.id==='umbrella').why[0],/typhoon/);
 assert.match(before.find(s=>s.id==='sunscreen').why[0],/^Usually up to/);
 // A saved forecast of rain and cold overrides it, and names the day.
 const wet=ensureFeatures({...structuredClone(seed),weather:{at:null,by:null,hours:{},days:{[first]:{max:12,min:6,rain:90,code:63,city:'Tokyo'}}}});
 const wetList=allSuggestions(wet,first);
 assert.match(wetList.find(s=>s.id==='umbrella').why[0],/^Rain forecast/);
 assert.ok(wetList.some(s=>s.id==='coats'),'six degrees is coat weather');
 // Once the trip is under way, a day we have already had suggests nothing.
 const late=allSuggestions(state,'2026-10-06');
 assert.ok(!ids(late).includes('ponchos'),'the parks are behind us');
 assert.ok(ids(late).includes('biosecurity'),'the flight home is not');
 // The next pack-up is the next change of hotel, and the last one is going home.
 assert.deepEqual(nextPackUp(state,'2026-09-23'),{date:'2026-09-24',from:'1 Hotel Tokyo',to:'Hotel Kanra Kyoto'});
 assert.equal(nextPackUp(state,'2026-10-06').home,true);
 assert.equal(nextPackUp(state,'2026-10-07'),null);
 // Added, it stops being suggested; turned down, it stays gone and can be brought back.
 const sug=packingSuggestions(state,'2026-09-01');
 let next=applyOperation(state,{type:'packAdd',title:ponchos.title,category:ponchos.category,person:'Family',qty:ponchos.qty,suggestionId:'ponchos'},child);
 assert.equal(packingSuggestions(next,'2026-09-01').length,sug.length-1);
 assert.ok(!ids(packingSuggestions(next,'2026-09-01')).includes('ponchos'));
 next=applyOperation(next,{type:'packDismiss',suggestionId:'goshuin',dismissed:true},child);
 assert.ok(!ids(packingSuggestions(next,'2026-09-01')).includes('goshuin'));
 assert.deepEqual(ids(dismissedSuggestions(next,'2026-09-01')),['goshuin']);
 assert.ok(ids(packingSuggestions(applyOperation(next,{type:'packDismiss',suggestionId:'goshuin',dismissed:false},parent),'2026-09-01')).includes('goshuin'));
 // Written in by hand under the same name is the same thing.
 const byHand=applyOperation(state,{type:'packAdd',title:'passports',category:'documents',person:'Family'},parent);
 assert.ok(!ids(packingSuggestions(byHand,'2026-09-01')).includes('passports'));
 // Adding every essential at once, twice, puts each on the list once.
 const essentials=sug.filter(s=>s.priority==='essential').map(s=>({title:s.title,category:s.category,person:s.person,qty:s.qty,suggestionId:s.id}));
 let all=applyOperation(state,{type:'packAddAll',items:essentials},parent);
 all=applyOperation(all,{type:'packAddAll',items:essentials},parent);
 assert.equal(all.packing.items.length,essentials.length);
});

test('anyone packs and ticks; changing it is whoever added it, and starting again is a parent’s',async()=>{
 const {ensureFeatures,pendingProgress}=await import('../src/trip-features.js');
 const {packingProgress}=await import('../src/packing-data.js');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const offline=source.match(/const OFFLINE_OPS=\[(.*?)\];/s)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 const boston={name:'Boston',role:'child'};
 let state=applyOperation(seed,{type:'packAdd',title:'Pokémon cards',category:'kids',person:'Nate',qty:1},child);
 state=applyOperation(state,{type:'packAdd',title:'Adaptors',category:'tech',person:'Family',qty:3,notes:'Two in the blue bag'},parent);
 const cards=state.packing.items[0],plugs=state.packing.items[1];
 assert.equal(cards.createdBy,'Nate');assert.equal(plugs.qty,3);
 state=applyOperation(state,{type:'packStatus',id:plugs.id,packed:true},boston);
 assert.equal(state.packing.items[1].packedBy,'Boston');
 assert.deepEqual(packingProgress(state),{packed:1,total:2,left:1});
 // Nate changes his own, not the family's; a parent changes either.
 assert.equal(applyOperation(state,{type:'packEdit',id:cards.id,title:'Pokémon cards and binder',category:'kids',person:'Nate',qty:2},child).packing.items[0].qty,2);
 assert.throws(()=>applyOperation(state,{type:'packEdit',id:plugs.id,title:'x',category:'tech',person:'Family'},child),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'packRemove',id:plugs.id},boston),e=>e.status===403);
 assert.equal(applyOperation(state,{type:'packRemove',id:cards.id},parent).packing.items.length,1);
 // Bad input is refused rather than stored.
 for(const bad of [{title:'',category:'kids'},{title:'x',category:'sweets'},{title:'x',category:'kids',person:'Grandma'},{title:'x',category:'kids',qty:0},{title:'x',category:'kids',qty:1.5}])
  assert.throws(()=>applyOperation(state,{type:'packAdd',...bad},parent),e=>e.status===400,JSON.stringify(bad));
 // The next pack-up unticks everything, and only a parent starts it.
 assert.throws(()=>applyOperation(state,{type:'packReset'},child),e=>e.status===403);
 assert.equal(packingProgress(applyOperation(state,{type:'packReset'},parent)).packed,0);
 // Packing, adding and turning a suggestion down all keep with no signal; starting again does not.
 for(const op of ['packAdd','packAddAll','packStatus','packDismiss'])assert.ok(offline.includes(op),`${op} should survive with no signal`);
 for(const op of ['packReset','packEdit','packRemove'])assert.ok(!offline.includes(op),`${op} waits for signal`);
 const queued=pendingProgress(ensureFeatures(structuredClone(state)),[
  {operation:{type:'packStatus',id:cards.id,packed:true,by:'Nate',at:'2026-09-23T10:00:00.000Z'}},
  {operation:{type:'packAddAll',operationId:'q1',items:[{title:'Hats',category:'weather',qty:4}],by:'Nate',at:'2026-09-23T10:00:00.000Z'}},
  {operation:{type:'packDismiss',suggestionId:'goshuin',dismissed:true,by:'Nate',at:'2026-09-23T10:00:00.000Z'}}]);
 assert.equal(queued.packing.items.find(i=>i.id===cards.id).packedBy,'Nate');
 assert.ok(queued.packing.items.some(i=>i.title==='Hats'&&i.pending&&i.qty===4));
 assert.ok(queued.packing.dismissed.goshuin);
});

test('a ticket’s own photo or PDF read into English and kept on the file',async()=>{
 const {createServer}=await import('node:http');
 let seen=null,reply={readable:true,language:'Japanese',kind:'hotel confirmation',title:'Kyoto hotel',
  summary:['Check-in is from 15:00.'],translation:'Check-in 15:00\nReference AB-9931',actions:[{what:'Show this at the desk',when:''}]};
 const upstream=createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
   seen={path:req.url,json:JSON.parse(body)};
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({id:'msg_4',type:'message',role:'assistant',model:'claude-opus-5',stop_reason:'end_turn',
    usage:{input_tokens:1200,output_tokens:140},content:[{type:'text',text:JSON.stringify(reply)}]}));
  });
 });
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';
 process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});
 try{
  const {translateStoredFile,MAX_FILE_BYTES}=await import('../server/document-reader.mjs');
  // The file is loaded by its own stored path, and read by the same reader as a photographed page.
  let loaded=null;
  const file={pathname:'tickets/u/1-confirm.png',type:'image/png',size:2000};
  const english=await translateStoredFile(file,async p=>{loaded=p;return Buffer.from('png-bytes');});
  assert.equal(loaded,file.pathname);
  assert.equal(english.translation,reply.translation);
  assert.deepEqual(english.actions,reply.actions);
  assert.equal(english.usage.input,1200);
  const sent=seen.json.messages[0].content[0];
  assert.equal(sent.type,'image');
  assert.equal(sent.source.media_type,'image/png');
  assert.equal(sent.source.data,Buffer.from('png-bytes').toString('base64'));
  // A PDF goes as a document.
  await translateStoredFile({...file,type:'application/pdf'},async()=>Buffer.from('%PDF'));
  assert.equal(seen.json.messages[0].content[0].type,'document');

  // What is refused before anything is loaded or sent.
  const never=async()=>{throw new Error('should not load');};
  await assert.rejects(()=>translateStoredFile({title:'note only'},never),/no photo or PDF/);
  await assert.rejects(()=>translateStoredFile({...file,type:'audio/webm'},never),/photo or a PDF/);
  await assert.rejects(()=>translateStoredFile({...file,size:MAX_FILE_BYTES+1},never),/too large/);
  // An unreadable file is an error, not an empty translation saved onto the ticket.
  reply={...reply,readable:false,translation:''};
  await assert.rejects(()=>translateStoredFile(file,async()=>Buffer.from('x')),/could be read/);

  // Through the API: parents only, a real file only, and a translation can be taken off again.
  const {revision}=await(await fetch(base+'/api/state')).json();
  const made=await post('mutate',{revision,operation:{type:'documentNote',title:'Kyoto hotel',category:'reservation',notes:'x'}});
  const doc=(await made.json()).state.documents.at(-1);
  assert.equal((await(await post('file-translate',{id:doc.id})).json()).error,'This ticket has no photo or PDF to translate.');
  assert.equal((await post('file-translate',{id:'missing'})).status,404);
  const cleared=await post('file-translate',{id:doc.id,remove:true});
  assert.equal(cleared.status,200);
  assert.equal((await cleared.json()).state.documents.find(d=>d.id===doc.id).fileTranslation,undefined);
 }finally{
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
  delete process.env.LOCAL_DEMO;
  await new Promise(r=>server.close(r));
  await new Promise(r=>upstream.close(r));
 }
});
// A split day: the same option group, marked as a split, so each option is a lane somebody is on.
const splitTrip=()=>{
 const trip=structuredClone(seed),day='2026-10-02';
 for(const s of trip.steps.filter(s=>s.group==='tokyo-reset')){
  if(s.option==='Tsukiji + Akihabara')s.participants=['Damien','Nate'];
  else if(s.option==='Ueno + dinosaurs')s.participants=['Lauren','Boston'];
  else{s.group='';s.option='';s.day=null;}
 }
 return {trip:applyOperation(trip,{type:'groupMode',group:'tokyo-reset',mode:'split'},parent),day};
};
test('a split keeps every lane on the day, each person sees their own, and everyone meets back up',async()=>{
 const {daySplits,stepsFor,laneOf,splitWarnings}=await import('../src/split.js');
 const {trip,day}=splitTrip();
 assert.equal(trip.groupModes['tokyo-reset'],'split');
 const all=activeSteps(trip,day).map(s=>s.title);
 assert.ok(all.includes('Games, gachapon and toys')&&all.includes('Ueno museum and park'),'both lanes are on the day, not just the chosen one');
 const [split]=daySplits(trip,day);
 assert.deepEqual(split.lanes.map(l=>l.members),[['Damien','Nate'],['Lauren','Boston']]);
 assert.equal(split.meet.title,'Return to Hilton','the first stop after with everyone on it');
 assert.equal(laneOf(split,'Boston').option,'Ueno + dinosaurs');
 const nate=stepsFor(trip,day,'Nate').map(s=>s.title);
 assert.ok(nate.includes('Breakfast')&&nate.includes('Games, gachapon and toys')&&!nate.includes('Ueno museum and park'),'Nate follows his own lane and the shared stops');
 assert.equal(stepsFor(trip,day,null).length,all.length,'everyone sees every lane');
 assert.deepEqual(splitWarnings(split,['Nate','Boston']),[]);
 const boysAlone=structuredClone(trip);for(const s of boysAlone.steps.filter(s=>s.option==='Ueno + dinosaurs'))s.participants=['Boston'];
 assert.match(splitWarnings(daySplits(boysAlone,day)[0],['Nate','Boston']).join(' '),/no grown-up/);
 const back=applyOperation(trip,{type:'groupMode',group:'tokyo-reset',mode:'choose'},parent);
 assert.ok(!activeSteps(back,day).some(s=>s.title==='Ueno museum and park'),'back to alternatives, only the chosen plan shows');
 assert.throws(()=>applyOperation(seed,{type:'groupMode',group:'tokyo-reset',mode:'split'},child),e=>e.status===403);
 assert.throws(()=>applyOperation(seed,{type:'groupMode',group:'nope',mode:'split'},parent),/not found/);
 assert.ok(trip.alerts[0].summary.includes('we split up'),'the family is told');
});
test('what somebody else is doing: what they marked arrived first, then the plan, said as the plan',async()=>{
 const {whereIs}=await import('../src/split.js');
 const {trip,day}=splitTrip();
 const ueno=trip.steps.find(s=>s.title==='Ueno museum and park');
 const arrived=structuredClone(trip);Object.assign(arrived.steps.find(s=>s.id===ueno.id),{status:'started',startedAt:'2026-10-02T01:00:00.000Z'});
 const boston=whereIs(arrived,day,'Boston',new Date('2026-10-02T02:00:00Z'));
 assert.equal(boston.how,'at');assert.equal(boston.step.title,'Ueno museum and park');assert.equal(boston.since,'10:00');
 const nate=whereIs(trip,day,'Nate',new Date('2026-10-02T03:20:00Z'));
 assert.equal(nate.how,'planned');assert.equal(nate.step.title,'Games, gachapon and toys');
 const early=whereIs(trip,day,'Nate',new Date('2026-09-20T00:00:00Z'));
 assert.equal(early.how,'next');assert.equal(early.step.title,'Breakfast');
});
test('reordering one lane on a split day keeps the whole day in one order',()=>{
 const {trip,day}=splitTrip();
 const ids=activeSteps(trip,day).map(s=>s.id);
 const moved=applyOperation(trip,{type:'reorder',day,ids:[...ids].reverse()},parent);
 assert.equal(activeSteps(moved,day)[0].id,ids.at(-1));
});
