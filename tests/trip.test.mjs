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
