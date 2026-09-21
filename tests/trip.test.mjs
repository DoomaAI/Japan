import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {applyOperation,AppError} from '../server/model.mjs';
import {activeSteps,scheduleProposal,japanClock,japanDate} from '../src/timing.js';
import handler from '../server/handler.mjs';
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
 const {PAGES,PRIMARY,primaryNav,moreSections,moreIds,navActive}=await import('../src/nav-data.js');
 const damien={name:'Damien',role:'parent'},lauren={name:'Lauren',role:'parent'},nate={name:'Nate',role:'child'};
 for(const user of [damien,lauren,nate]){
  const bar=primaryNav(user),more=moreIds(user),all=[...bar,...more];
  // Nothing appears twice, and nothing is stranded.
  assert.equal(new Set(all).size,all.length,`${user.name} lists a page twice`);
  const expected=Object.keys(PAGES).filter(id=>(id!=='thanks'||user.name==='Damien')&&(id!=='inbox'||user.role==='parent'));
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
 // Forwarded email carries bookings and whatever else an email brought with it, so it is a
 // parents' screen and the boys are never sent to it.
 assert.ok(moreIds(lauren).includes('inbox'));
 assert.ok(!moreIds(nate).includes('inbox'));
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
 assert.deepEqual(parsed['2026-09-21'],{city:'Tokyo',code:61,max:24,min:19,rain:80});
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
 assert.deepEqual(forecastFor(state,seed.days[0].date),{city:'Tokyo',code:61,max:24,min:19,rain:80});
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
 // One place decides what page we are on, so a swipe, an arrow key and a button cannot drift.
 assert.match(source,/function turnPage\(delta\)\{/);
 assert.match(source,/Math\.min\(72,Math\.max\(1,guidePage\+delta\)\)/,'clamped at both ends rather than wrapping');
 assert.match(source,/if\(n===guidePage\)return;/,'and a turn that changes nothing does nothing');
 // Every way of turning goes through it.
 assert.equal((source.match(/turnPage\(-1\)/g)||[]).length,2,'the back button and the left arrow key');
 assert.equal((source.match(/turnPage\(1\)/g)||[]).length,2,'the forward button and the right arrow key');
 assert.match(source,/turnPage\(dx<0\?1:-1\)/,'and the swipe');
 assert.doesNotMatch(source,/setGuidePage\(guidePage[-+]1\)/,'nothing sets the page behind its back');
 // A swipe is a sideways movement, not a scroll, and typing in the page box is not a turn.
 assert.match(source,/Math\.abs\(dx\)>55&&Math\.abs\(dy\)<45/);
 assert.match(source,/\['INPUT','SELECT','TEXTAREA'\]\.includes\(e\.target\.tagName\)\)return/);
 // The keys are only listened for while the guide is open, and let go of afterwards.
 assert.match(source,/if\(tab!=='guide'\)return;/);
 assert.match(source,/removeEventListener\('keydown',onKey\)/);
 // The page can still be scrolled up and down while it is swiped sideways.
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.guide-view\{touch-action:pan-y\}/);
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
 // A drag under ten pixels is a tap, so the old way of playing still works.
 assert.match(source,/if\(!d\.moved&&Math\.hypot\(e\.clientX-d\.x,e\.clientY-d\.y\)>10\)d\.moved=true/);
 assert.match(source,/if\(!d\.moved\)return d\.i/,'a tap comes back as the tile that was tapped');
 // The target is where the finger lifted, not where it started.
 assert.match(source,/document\.elementFromPoint\(x,y\)\?\.closest\('\[data-tile\]'\)/);
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
 const nav=await import('../src/nav-data.js');
 assert.ok(nav.PAGES.weather?.label&&nav.PAGES.weather?.note,'weather has its own screen');
 const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(source,/tab==='weather'/);
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
 const entries=[...source.matchAll(/\{id:'([a-z]+)',title:'([^']+)',needs:(OFFLINE|'[^']+'),Component:(\w+)\}/g)];
 assert.equal(entries.length,11);
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
 // One component draws both ladders, so the ranks and the merge ladder cannot drift apart,
 // and neither is left as a ragged run of inline text.
 assert.equal([...source.matchAll(/<Ladder /g)].length,2);
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
 const {wavDataUri,silenceUri,toneUri}=await import('../src/speech.js');
 const decode=uri=>{
  assert.match(uri,/^data:audio\/wav;base64,/);
  return Buffer.from(uri.slice(uri.indexOf(',')+1),'base64');
 };
 const wav=decode(silenceUri(1,8000));
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
 // Silence really is silent, and the beep really is not — a beep you cannot hear answers
 // nothing when someone is trying to find out whether their phone makes a sound.
 const loudest=buffer=>{let peak=0;for(let i=44;i<buffer.length;i+=2)peak=Math.max(peak,Math.abs(buffer.readInt16LE(i)));return peak;};
 assert.equal(loudest(wav),0);
 assert.ok(loudest(decode(toneUri()))>8000);
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
