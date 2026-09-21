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
     suggestions:[{ja:'ロースかつ膳',en:'Pork loin katsu set',why:'The dish this place is known for.',forWhom:['Damien','Lauren','Boston'],matchesOurList:'tonkatsu',spicy:false,price:'¥2,100'},
                  {ja:'白ごはん',en:'Plain rice',why:'Nate will always eat this.',forWhom:['Nate'],matchesOurList:'gohan',spicy:false,price:''}],
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
  assert.equal(answer.suggestions.length,2);
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
 const {PAGES,PRIMARY,primaryNav,moreSections,moreIds,navActive}=await import('../src/nav-data.js');
 const damien={name:'Damien',role:'parent'},lauren={name:'Lauren',role:'parent'},nate={name:'Nate',role:'child'};
 for(const user of [damien,lauren,nate]){
  const bar=primaryNav(user),more=moreIds(user),all=[...bar,...more];
  // Nothing appears twice, and nothing is stranded.
  assert.equal(new Set(all).size,all.length,`${user.name} lists a page twice`);
  const expected=Object.keys(PAGES).filter(id=>id!=='thanks'||user.name==='Damien');
  assert.deepEqual([...all].sort(),[...expected].sort(),`${user.name} cannot reach every page`);
  // The bar holds five, plus More, which is what the layout has room for.
  assert.equal(bar.length,5,user.name);
  for(const id of all)assert.ok(PAGES[id]?.label&&PAGES[id]?.note,`${id} is missing a label or note`);
  // Sections are non-empty and the pages already in the bar are not repeated below.
  for(const [title,ids] of moreSections(user)){assert.ok(title&&ids.length);for(const id of ids)assert.ok(!bar.includes(id),`${id} is in both`);}
 }
 // Lauren's private notes belong to Damien's phone alone.
 assert.ok(moreIds(damien).includes('thanks'));
 for(const user of [lauren,nate])assert.ok(!moreIds(user).includes('thanks'),user.name);
 // Parents reach for tickets and prices; the boys reach for their missions.
 assert.deepEqual(PRIMARY.parent,['today','days','tickets','food','money']);
 assert.deepEqual(PRIMARY.child,['today','days','challenges','food','diary']);
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
 assert.equal(claimPlayback(null),'not supported');
 assert.equal(claimPlayback({}),'not supported');
 assert.equal(claimPlayback({audioSession:{type:'auto'}}),'playback','it asks to be treated as playback');
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
