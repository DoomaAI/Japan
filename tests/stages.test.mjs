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
test('tonight asks for stars, a photo vote and a memory, and counts what is left',async()=>{
 const {tonightShows,tonightFor}=await import('../src/tonight-data.js');
 assert.equal(tonightShows('2026-09-29','2026-09-29','16:59'),false);
 assert.equal(tonightShows('2026-09-29','2026-09-29','17:00'),true);
 assert.equal(tonightShows('2026-09-28','2026-09-29','09:00'),true,'an earlier day can still be wrapped');
 assert.equal(tonightShows('2026-09-30','2026-09-29','20:00'),false);
 const day='2026-09-22',state=upgraded(seed);
 const ids=state.steps.filter(s=>s.day===day).slice(0,4).map(s=>s.id);
 state.steps=state.steps.map(s=>ids.includes(s.id)?{...s,status:'done'}:s);
 let t=tonightFor(state,day,'Nate');
 assert.equal(t.tasks.rate,false);assert.equal(t.toRate.length,3);assert.equal(t.tasks.vote,true,'no photos, nothing to vote on');
 assert.equal(t.complete,false);
 state.stepReviews={[t.toRate[0].id]:{ratings:{Nate:4}}};
 assert.equal(tonightFor(state,day,'Nate').toRate.length,2);
 state.photos=[{id:'p1',day,by:'Nate',at:'2026-09-22T10:00:00Z'}];
 assert.equal(tonightFor(state,day,'Nate').tasks.vote,false);
 state.photoVotes={[day]:{Nate:'p1'}};state.journal={[day]:'A great day.'};
 assert.equal(tonightFor(state,day,'Nate').tasks.memory,false,'the diary is a parent’s; Nate needs a voice note');
 assert.equal(tonightFor(state,day,'Damien',true).tasks.memory,true);
 state.voiceNotes=[{id:'v',day,by:'Nate',at:'2026-09-22T11:00:00Z'}];
 state.stepReviews={...state.stepReviews,...Object.fromEntries(ids.slice(1,3).map(id=>[id,{ratings:{Nate:5}}]))};
 t=tonightFor(state,day,'Nate');assert.equal(t.complete,true);assert.equal(t.finished,4);
});
test('tonight has a parent catch up the stops nobody ticked, at the time they were planned',async()=>{
 const {tonightFor,caughtUpAt}=await import('../src/tonight-data.js');
 const day='2026-09-22',state=upgraded(seed);
 const steps=state.steps.filter(s=>s.day===day);
 assert.ok(steps.length>2);
 assert.equal(tonightFor(state,day,'Nate').open.length,0,'the boys are not asked to catch up');
 assert.equal(tonightFor(state,day,'Nate').tasks.catchUp,true);
 let t=tonightFor(state,day,'Damien',true);
 assert.ok(t.open.length>0);assert.equal(t.tasks.catchUp,false);
 state.steps=state.steps.map(s=>s.day===day?{...s,status:s.id===steps[0].id?'skipped':'done'}:s);
 t=tonightFor(state,day,'Damien',true);
 assert.equal(t.open.length,0,'done and skipped are both dealt with');assert.equal(t.tasks.catchUp,true);
 const later=new Date('2026-09-23T00:00:00Z');
 assert.equal(caughtUpAt({time:'09:30'},day,later),'2026-09-22T00:30:00.000Z','at its planned time, Japan time');
 assert.equal(caughtUpAt({time:null},day,later),'2026-09-22T03:00:00.000Z','midday when it had no time');
 const early=new Date('2026-09-22T00:00:00Z');
 assert.equal(caughtUpAt({time:'18:00'},day,early),early.toISOString(),'never in the future');
});
test('tonight says whether tomorrow has been checked the night before',async()=>{
 const {tomorrowCheck}=await import('../src/tonight-data.js');
 const state=upgraded(seed),day=state.days[1].date,next=state.days[2].date;
 let t=tomorrowCheck(state,day);
 assert.equal(t.day,next);assert.equal(t.checked,false);assert.equal(t.open.length,0);
 state.dayChecks={[next]:{day:next,at:'2026-09-22T10:00:00Z',notes:[{id:'a',title:'Closed for a festival',status:'open'},{id:'b',title:'Seen',status:'dismissed'}]}};
 t=tomorrowCheck(state,day);
 assert.equal(t.checked,true);assert.deepEqual(t.open.map(n=>n.id),['a'],'only what nobody has dealt with');assert.equal(t.planB,false);
 assert.equal(tomorrowCheck(state,state.days.at(-1).date),null,'no tomorrow on the last day');
});
test('the stamp book is earned from what is ticked off, with milestones per person',async()=>{
 const {familyStamps,personalStamps,cityNames,MILESTONES}=await import('../src/stamp-data.js');
 const state=upgraded(seed);
 assert.deepEqual(cityNames(state).slice(0,4),['Tokyo','Kyoto','Osaka','Nara'],'Nara / Kyoto is two places');
 let f=familyStamps(state,'2026-09-20');
 assert.ok(f.every(c=>c.earned===0),'nothing before we land');
 const meiji=state.steps.find(s=>s.title==='Meiji Jingu forest and shrine');
 state.steps=state.steps.map(s=>s.id===meiji.id?{...s,status:'done',completedAt:'2026-09-22T01:00:00Z'}:s);
 f=familyStamps(state,'2026-09-20');
 const sight=f.find(c=>c.id==='sights').stamps.find(s=>s.id===meiji.id);
 assert.equal(sight.earned,true);assert.equal(sight.icon,'⛩️');assert.equal(sight.on,'2026-09-22');
 assert.equal(f.find(c=>c.id==='cities').stamps.find(s=>s.label==='Tokyo').earned,true,'a stop done in a city earns the city');
 assert.ok(f.find(c=>c.id==='trains').stamps.some(s=>s.label==='Nozomi 33 to Kyoto'&&s.icon==='🚅'));
 assert.ok(!f.find(c=>c.id==='rides').stamps.some(s=>/^Meet/.test(s.label)),'meeting a guide is not a ride');
 state.food={a:{tried:{Nate:'x'}},b:{tried:{Nate:'x',Boston:'x'}},c:{tried:{Nate:'x'}},d:{tried:{Nate:'x'}},e:{tried:{Nate:'x'}},f:{tried:{Boston:'x'}}};
 const food=personalStamps(state,'Nate').find(c=>c.id==='food');
 assert.equal(food.count,5);assert.deepEqual(food.stamps.map(s=>s.milestone),[1,5]);assert.equal(food.next,10);
 assert.equal(personalStamps(state,'Boston').find(c=>c.id==='food').count,2);
 assert.deepEqual(MILESTONES,[1,5,10,25,50]);
});
test('the leaderboard ranks everyone per board, shares a tie and gives no place for nought',async()=>{
 const {rankings,crowns}=await import('../src/leaderboard-data.js');
 const state=upgraded(seed);
 state.food={a:{tried:{Nate:'x',Boston:'x'}},b:{tried:{Nate:'x',Boston:'x'}},c:{tried:{Lauren:'x'}}};
 state.parkRides={r:{ridden:{Boston:'x'}}};
 const food=rankings(state).find(b=>b.id==='food');
 assert.deepEqual(food.rows.map(r=>[r.person,r.count,r.place]),[['Boston',2,1],['Nate',2,1],['Lauren',1,3],['Damien',0,null]]);
 assert.deepEqual(food.leaders,['Boston','Nate']);
 assert.deepEqual(rankings(state).find(b=>b.id==='photos').leaders,[],'nobody leads a board nobody has started');
 assert.deepEqual(crowns(state).slice(0,2),[{person:'Boston',crowns:2},{person:'Nate',crowns:1}]);
});
test('the trip story is counted out of what we kept, and leaves out a card with nothing to say',async()=>{
 const {recapStory}=await import('../src/recap-story.js');
 const state=upgraded(seed);
 let cards=recapStory(state,{today:'2026-09-29'});
 assert.deepEqual(cards.map(c=>c.kind),['title','numbers','places','end']);
 assert.equal(cards[0].sofar,true);assert.equal(cards[0].dayNumber,9);assert.equal(cards.at(-1).over,false);
 const meiji=state.steps.find(s=>s.title==='Meiji Jingu forest and shrine');
 state.steps=state.steps.map(s=>s.id===meiji.id?{...s,status:'done'}:s);
 state.stepReviews={[meiji.id]:{ratings:{Nate:5,Boston:4},thoughts:{Nate:{text:'The big gate!',at:'x'}}}};
 state.photos=[{id:'p1',day:'2026-09-22',by:'Boston',at:'2026-09-22T02:00:00Z'}];state.photoVotes={'2026-09-22':{Nate:'p1'}};
 state.food={tonkatsu:{tried:{Nate:'x'},ratings:{Nate:5}}};
 state.expenses=[{id:'e',day:'2026-09-22',yen:9800,category:'food',method:'card',paidBy:'Damien',title:'Lunch'}];
 cards=recapStory(state,{today:'2026-10-07',parent:true});
 assert.equal(cards[0].sofar,false);assert.equal(cards.at(-1).over,true);
 assert.equal(cards.find(c=>c.kind==='top').moments[0].average,4.5);
 assert.equal(cards.find(c=>c.kind==='photos').winners[0].photo.id,'p1');
 assert.equal(cards.find(c=>c.kind==='food').best[0].name,'Tonkatsu');
 const nate=cards.find(c=>c.kind==='person'&&c.person==='Nate');
 assert.equal(nate.favourite.title,meiji.title);assert.equal(nate.favourite.thought,'The big gate!');
 assert.equal(cards.find(c=>c.kind==='money').total,9800);
 assert.ok(!recapStory(state,{today:'2026-10-07'}).some(c=>c.kind==='money'),'spending is for parents');
});
test('replaying the trip draws what we did, or the plan before anything is ticked, and always has a place',async()=>{
 const {replayFrames,kmBetween}=await import('../src/memory-map.js');
 const state=upgraded(seed);
 let r=replayFrames(state);
 assert.equal(r.plan,true);assert.ok(r.frames.length>40);
 assert.ok(r.frames.every(f=>Number.isFinite(f.lat)&&Number.isFinite(f.lng)),'every frame has somewhere to be, even with no map coordinates');
 assert.equal(r.frames[0].dayNumber,1);assert.equal(r.frames.at(-1).dayNumber,16);
 const meiji=state.steps.find(s=>s.title==='Meiji Jingu forest and shrine'),nozomi=state.steps.find(s=>s.title==='Nozomi 33 to Kyoto');
 state.steps=state.steps.map(s=>[meiji.id,nozomi.id].includes(s.id)?{...s,status:'done'}:s);
 r=replayFrames(state);
 assert.equal(r.plan,false);assert.deepEqual(r.frames.map(f=>f.titles.at(-1)),[meiji.title,nozomi.title]);
 state.placeCoords={places:{},at:null,by:null};state.steps=state.steps.map(s=>s.id===meiji.id?{...s,pin:{lat:35.6764,lng:139.6993}}:s);
 assert.equal(replayFrames(state).frames[0].exact,true,'a pin is exact');
 assert.ok(Math.abs(kmBetween({lat:35.6812,lng:139.7671},{lat:34.9858,lng:135.7588})-364)<10,'Tokyo to Kyoto Station is about 364 km');
});
test('the photobook has a page for every day, led by the photo of the day',async()=>{
 const {photobookPages}=await import('../src/photobook-data.js');
 const state=upgraded(seed);
 let pages=photobookPages(state);
 assert.equal(pages.length,16);assert.equal(pages[0].hero,null,'a day with nothing kept still gets its page');
 const day='2026-09-22',meiji=state.steps.find(s=>s.title==='Meiji Jingu forest and shrine');
 state.photos=[{id:'a',day,by:'Nate',at:'2026-09-22T01:00:00Z'},{id:'b',day,by:'Boston',at:'2026-09-22T02:00:00Z'}];
 state.photoVotes={[day]:{Nate:'a',Lauren:'a'}};
 state.steps=state.steps.map(s=>s.id===meiji.id?{...s,status:'done'}:s);
 state.stepReviews={[meiji.id]:{ratings:{Nate:5},thoughts:{Nate:{text:'So many trees',at:'x'}}}};
 state.journal={[day]:'Rain in the morning, sun by lunch.'};
 const p=photobookPages(state).find(x=>x.date===day);
 assert.equal(p.hero.item.id,'a');assert.equal(p.winner,true);assert.deepEqual(p.more.map(m=>m.item.id),['b']);
 assert.equal(p.best[0].title,meiji.title);assert.equal(p.quote.text,'So many trees');assert.equal(p.note,'Rain in the morning, sun by lunch.');
});
test('on this day brings a trip day back a month, and a year, on',async()=>{
 const {anniversary}=await import('../src/anniversary-data.js');
 const state=upgraded(seed);
 assert.equal(anniversary(state,'2026-09-29'),null,'not during the trip');
 assert.equal(anniversary(state,'2026-10-07'),null,'not the day after');
 assert.equal(anniversary(state,'2026-10-21').label,'One month ago today');
 assert.equal(anniversary(state,'2026-10-21').day,'2026-09-21');
 assert.equal(anniversary(state,'2027-01-23').label,'Four months ago today');
 assert.equal(anniversary(state,'2027-01-23').day,'2026-09-23');
 state.journal={'2026-09-23':'Sumo!'};
 const a=anniversary(state,'2027-09-23');
 assert.equal(a.label,'One year ago today');assert.equal(a.note,'Sumo!');
 assert.equal(anniversary(state,'2028-10-06').label,'Two years ago today');
 assert.equal(anniversary(state,'2027-10-15'),null,'a day that was not a trip day');
 assert.equal(anniversary(state,'2028-02-22'),null,'seventeen months is not an anniversary');
});
test('following along sends only the allow-list: days so far, photos, stars, words and the diary',async()=>{
 const {followView,followPhoto}=await import('../src/follow-data.js');
 const state=upgraded(seed),day='2026-09-22',meiji=state.steps.find(s=>s.title==='Meiji Jingu forest and shrine');
 state.steps=state.steps.map(s=>s.id===meiji.id?{...s,status:'done',pin:{lat:35.67,lng:139.69},bookingReference:'ABC123',phone:'03-1234-5678'}:s);
 state.stepReviews={[meiji.id]:{ratings:{Nate:5,Boston:4},thoughts:{Nate:{text:'Huge gate',at:'x'}}}};
 state.photos=[{id:'p1',day,by:'Nate',pathname:'photos/Nate/a.jpg',type:'image/jpeg',gps:{lat:35.6,lng:139.7},at:'2026-09-22T01:00:00Z'},{id:'p2',day:'2026-10-01',by:'Nate',pathname:'photos/Nate/b.jpg',type:'image/jpeg',at:'x'}];
 state.photoVotes={[day]:{Lauren:'p1'}};state.journal={[day]:'A day in the forest.'};
 state.expenses=[{id:'e',yen:5000}];state.contacts={Damien:'+61 400 000 000'};
 const v=followView(state,'2026-09-29');
 assert.equal(v.days.length,9,'only the days that have begun');assert.equal(v.days[0].number,9,'newest first');
 const d=v.days.find(x=>x.date===day);
 // Kudos from home is on the list on purpose: who clapped, and with which of the three, and nothing else.
 assert.deepEqual(d.photos,[{id:'p1',by:'Nate',best:true,frame:false,kudos:{}}]);
 assert.deepEqual(d.stops,[{id:meiji.id,title:meiji.title,stars:4.5,kudos:{},said:[{person:'Nate',text:'Huge gate'}]}]);
 assert.equal(d.diary,'A day in the forest.');
 const text=JSON.stringify(v);
 for(const secret of ['ABC123','03-1234-5678','+61','35.67','35.6','pathname','hotel','Hilton','Kanra','5000','Fantasy Springs'])assert.ok(!text.includes(secret),`${secret} must not reach a follower`);
 assert.equal(followPhoto(state,'p1','2026-09-29')?.id,'p1');
 assert.equal(followPhoto(state,'p2','2026-09-29'),null,'not a photo from a day still to come');
 assert.equal(followPhoto(state,(state.documents[0]||{}).id,'2026-09-29'),null,'never a ticket');
});
test('API: the follow-along link is a parent’s to make and stop, and a wrong or stopped key learns nothing',async()=>{
 const {createServer}=await import('node:http');const handler=(await import('../server/handler.mjs')).default;
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});
  assert.equal((await fetch(base+'/api/follow?key='+'a'.repeat(64))).status,403,'no link made yet');
  const {url}=await(await post('follow-link',{})).json();
  const key=new URL(url).searchParams.get('follow');assert.match(key,/^[a-f0-9]{64}$/);
  assert.equal((await(await post('follow-link',{})).json()).url,url,'asking again hands out the same link');
  const state=(await(await fetch(base+'/api/state')).json()).state;
  assert.equal('followKey' in state,false,'the key never travels with the trip');
  const r=await fetch(`${base}/api/follow?key=${key}`,{headers:{cookie:''}});assert.equal(r.status,200);
  const view=await r.json();assert.ok(Array.isArray(view.days));assert.equal('documents' in view,false);
  assert.equal((await fetch(`${base}/api/follow?key=${'b'.repeat(64)}`)).status,403);
  assert.equal((await fetch(`${base}/api/follow?key=nonsense`)).status,403);
  assert.equal((await fetch(`${base}/api/follow-photo?key=${key}&id=nope`)).status,404);
  await post('follow-link',{stop:true});
  assert.equal((await fetch(`${base}/api/follow?key=${key}`)).status,403,'a stopped link stops at once');
  const again=(await(await post('follow-link',{})).json()).url;assert.notEqual(again,url,'the next link is a different one');
 }finally{delete process.env.LOCAL_DEMO;await new Promise(r=>server.close(r));}
});
test('the run-up unlocks a family task at 100, 50, 30, 14 and 7 days, each counted from the trip',async()=>{
 const {runUp,prepMeasures,MILESTONES}=await import('../src/prep-data.js');
 const state=upgraded(seed);
 assert.equal(runUp(state,'2026-09-21'),null,'not once we have landed');
 let r=runUp(state,'2026-05-01');
 assert.equal(r.days,143);assert.equal(r.now,null);assert.equal(r.next.at,100);
 r=runUp(state,'2026-08-22');
 assert.equal(r.days,30);assert.equal(r.now.measure,'profiles','the oldest open task comes first');
 state.party={people:Object.fromEntries(state.members.map(n=>[n,{age:30}])),pace:'steady',budget:null,notes:''};
 r=runUp(state,'2026-08-22');assert.equal(r.milestones[0].complete,true);assert.equal(r.now.measure,'votes');
 const m=prepMeasures(state);
 assert.equal(m.phrases.total,20);assert.ok(m.tickets.total>0,'the fixed bookings are counted');
 assert.equal(m.packing.total,0);assert.equal(MILESTONES.map(x=>x.at).join(),'100,50,30,14,7');
 assert.equal(runUp(state,'2026-09-20').days,1);
});
test('a little Japan each day counts back from the flight, and remembers what each person has learnt',async()=>{
 const {dailyJapan}=await import('../src/daily-japan-data.js');
 const state=upgraded(seed);
 assert.equal(dailyJapan(state,'2026-09-21','Nate'),null,'only before we fly');
 const eve=dailyJapan(state,'2026-09-20','Nate');
 assert.equal(eve.days,1);assert.equal(eve.phrase.id,'hello');assert.equal(eve.fact.id,'flight','the day before ends on the flight itself');
 assert.notEqual(dailyJapan(state,'2026-09-19','Nate').phrase.id,'hello','a new phrase each day');
 assert.equal(eve.phraseLearnt,false);
 state.phraseLog={Nate:{hello:'x'}};state.factLog={Nate:{flight:'x'}};
 const again=dailyJapan(state,'2026-09-20','Nate');
 assert.equal(again.phraseLearnt,true);assert.equal(again.factRead,true);
 assert.equal(dailyJapan(state,'2026-09-20','Boston').phraseLearnt,false,'each their own');
 const {applyOperation}=await import('../server/model.mjs');
 const next=applyOperation(state,{type:'phraseSeen',person:'Nate',day:null,phraseIds:['thanks']},{name:'Nate',role:'child'});
 assert.ok(next.phraseLog.Nate.thanks,'the run-up can log a phrase with no trip day');
});
test('sealed predictions are written before we fly, hidden from the others, and open once we are home',async()=>{
 const {applyOperation}=await import('../server/model.mjs');
 const {visibleTrip}=await import('../server/visibility.mjs');
 const {predictionPhase,visiblePredictions}=await import('../src/prediction-data.js');
 const {recapStory}=await import('../src/recap-story.js');
 assert.equal(predictionPhase(seed.days,'2026-09-20'),'open');assert.equal(predictionPhase(seed.days,'2026-09-21'),'sealed');assert.equal(predictionPhase(seed.days,'2026-10-07'),'revealed');
 const state=upgraded(seed);
 state.predictions={Nate:{fuji:{text:'Yes, from the train',at:'x'}},Boston:{food:{text:'Ramen',at:'x'},fuji:{text:'No',at:'x'}}};
 const seen=visiblePredictions(state,'Nate','2026-09-25');
 assert.deepEqual(seen.Nate,state.predictions.Nate,'your own you can read');
 assert.deepEqual(seen.Boston,{food:{sealed:true},fuji:{sealed:true}},'his are only a count');
 assert.ok(!JSON.stringify(visibleTrip(state,{name:'Nate',role:'child'},new Date('2026-09-25T03:00:00Z'))).includes('Ramen'),'not in what the server sends');
 assert.ok(JSON.stringify(visibleTrip(state,{name:'Nate',role:'child'},new Date('2026-10-07T03:00:00Z'))).includes('Ramen'),'opened once we are home');
 // The trip has begun by today's date, so the server refuses a change.
 assert.throws(()=>applyOperation(state,{type:'predictionSet',person:'Nate',id:'fuji',text:'Maybe'},{name:'Nate',role:'child'}),/sealed/);
 const cards=recapStory(state,{today:'2026-10-07'});
 const p=cards.find(c=>c.kind==='predictions');
 assert.deepEqual(p.asked.find(q=>q.id==='fuji').answers.map(a=>a.person),['Nate','Boston']);
 assert.ok(!recapStory(state,{today:'2026-09-29'}).some(c=>c.kind==='predictions'),'not before we are home');
});
test('ready to go weighs each of the five the same, and an empty list is not ready',async()=>{
 const {readiness}=await import('../src/prep-data.js');
 const state=upgraded(seed);
 let r=readiness(state);
 assert.equal(r.parts.length,5);assert.equal(r.parts.find(p=>p.id==='packing').share,0,'no packing list is not started');
 const before=r.percent;
 state.party={people:Object.fromEntries(state.members.map(n=>[n,{age:30}])),pace:'steady',budget:null,notes:''};
 r=readiness(state);assert.equal(r.percent,before+20,'four profiles are a fifth of ready, however few they are');
 state.packing={items:[{id:'a',title:'Hats',packedAt:'x'},{id:'b',title:'Socks',packedAt:null}],dismissed:{}};
 assert.equal(readiness(state).parts.find(p=>p.id==='packing').share,.5);
});
test('hunt picks: each of us picks the hunts to do, the boys their own, and everyone sees who picked what',async()=>{
 const {applyOperation}=await import('../server/model.mjs');
 const {huntPickers,pickedBy}=await import('../src/hunt-data.js');
 let state=upgraded(seed);
 state=applyOperation(state,{type:'huntPick',person:'Nate',hunt:'gachapon',picked:true},{name:'Nate',role:'child'});
 state=applyOperation(state,{type:'huntPick',person:'Boston',hunt:'gachapon',picked:true},{name:'Damien',role:'parent'});
 state=applyOperation(state,{type:'huntPick',person:'Nate',hunt:'ramen',picked:true},{name:'Nate',role:'child'});
 assert.deepEqual(huntPickers(state,'gachapon'),['Boston','Nate']);
 assert.deepEqual(pickedBy(state,'Nate').map(h=>h.id),['gachapon','ramen']);
 state=applyOperation(state,{type:'huntPick',person:'Nate',hunt:'ramen',picked:false},{name:'Nate',role:'child'});
 assert.deepEqual(pickedBy(state,'Nate').map(h=>h.id),['gachapon']);
 assert.throws(()=>applyOperation(state,{type:'huntPick',person:'Boston',hunt:'ramen',picked:true},{name:'Nate',role:'child'}),/own/);
 assert.throws(()=>applyOperation(state,{type:'huntPick',person:'Nate',hunt:'nope',picked:true},{name:'Nate',role:'child'}),/Choose a hunt/);
});
test('booking windows: when a booking opens, suggested from the plan, kept by a parent, and alerted in the calendar',async()=>{
 const {opensFor,suggestedWindows,windowState,upcomingWindows,findRule}=await import('../src/booking-window-data.js');
 const {applyOperation}=await import('../server/model.mjs');
 const {calendarFeed}=await import('../src/timing.js');
 // Japan time, turned into the instant it is everywhere else.
 assert.equal(opensFor(findRule('pokemon-cafe'),'2026-10-04'),'2026-09-03T09:00:00.000Z','31 days before, 18:00 in Japan');
 assert.equal(opensFor(findRule('ghibli'),'2026-03-05'),'2026-02-10T01:00:00.000Z','the 10th of the month before');
 assert.equal(opensFor(findRule('disney-dining'),'2026-03-31'),'2026-03-01T01:00:00.000Z','a month before a date February lacks is the 1st of March');
 assert.equal(opensFor(findRule('disney-dining'),'2026-09-30'),'2026-08-30T01:00:00.000Z');
 assert.equal(opensFor(findRule('disney-hotel'),'2026-10-31'),'2026-07-01T02:00:00.000Z','four months before at 11:00, as the official example says');
 let state=upgraded(seed);
 const s=suggestedWindows(state),titles=s.map(w=>w.title);
 assert.ok(titles.some(t=>/Chef Mickey dinner/.test(t)));assert.ok(titles.some(t=>/Nozomi 33/.test(t)));
 assert.ok(!titles.some(t=>/Buy breakfast|Hilton|Leave for/.test(t)),'only the meals that are bookable');
 assert.equal(s.filter(w=>w.ruleId==='disney-tickets').length,2,'one for each park day');
 const pick=s.find(w=>/Chef Mickey/.test(w.title));
 assert.throws(()=>applyOperation(state,{type:'bookingWindowAdd',...pick},{name:'Nate',role:'child'}),/parent/);
 state=applyOperation(state,{type:'bookingWindowAdd',...pick},{name:'Damien',role:'parent'});
 assert.ok(!suggestedWindows(state).some(w=>w.key===pick.key),'added, so no longer suggested');
 assert.throws(()=>applyOperation(state,{type:'bookingWindowAdd',...pick},{name:'Damien',role:'parent'}),/already/);
 const w=state.bookingWindows[0];
 assert.equal(windowState(w,new Date('2026-08-28T00:00:00Z')).kind,'soon');
 assert.equal(windowState(w,new Date('2026-08-29T01:00:00Z')).kind,'open');
 assert.equal(upcomingWindows(state,new Date('2026-08-20T00:00:00Z')).length,1,'inside the fortnight');
 assert.equal(upcomingWindows(state,new Date('2026-08-01T00:00:00Z')).length,0,'not a month out');
 assert.equal(upcomingWindows(state,new Date('2026-10-02T00:00:00Z')).length,0,'not once its day has gone');
 let ics=calendarFeed(state,'https://x');
 assert.match(ics,/SUMMARY:Booking opens: Tokyo Disney restaurant/);assert.match(ics,/DTSTART:20260829T010000Z/);assert.match(ics,/TRIGGER:-P1D/);
 state=applyOperation(state,{type:'bookingWindowBooked',id:w.id,booked:true},{name:'Lauren',role:'parent'});
 assert.equal(windowState(state.bookingWindows[0]).kind,'booked');
 assert.doesNotMatch(calendarFeed(state,'https://x'),/Booking opens/,'a booked one leaves the calendar');
 assert.throws(()=>applyOperation(state,{type:'bookingWindowAdd',title:'X',opensAt:'soon'},{name:'Damien',role:'parent'}),/when the booking opens/);
 assert.throws(()=>applyOperation(state,{type:'bookingWindowAdd',title:'X',opensAt:'2026-08-01T00:00:00Z',url:'http://insecure'},{name:'Damien',role:'parent'}),/https/);
});
test('the follow-along link is sent with a message written for family at home',async()=>{
 const src=await readFile(new URL('../src/Settings.jsx',import.meta.url),'utf8');
 assert.match(src,/navigator\.share\(\{title:'Follow our Japan trip',text\}\)/,'the phone’s own share sheet');
 assert.match(src,/Send to family at home/);
 const m=src.match(/export const followMessage=url=>`([^`]+)`/)[1];
 assert.match(m,/\$\{url\}/);assert.match(m,/No login needed/);assert.match(m,/don't pass it on/);
});
test('push: what falls due, who wants it, and nothing sent twice',async()=>{
 const {pushMoments,duePushes,wants,PUSH_LATE_LIMIT}=await import('../src/push-data.js');
 const {tick,tellChange,subscribe,resetDemoPush}=await import('../server/push.mjs');
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;resetDemoPush();
 try{
  const state=upgraded(seed),nozomi=state.steps.find(s=>s.title==='Nozomi 33 to Kyoto');
  const leave=pushMoments(state).find(m=>m.key.startsWith(`leave|${nozomi.id}`));
  assert.equal(new Date(leave.at).toISOString(),new Date(Date.parse('2026-09-24T12:30:00+09:00')-((nozomi.travelMinutes??20)+(nozomi.arrivalBuffer??15))*60000).toISOString(),'the same leave-by the calendar uses');
  assert.equal(new Date(pushMoments(state).find(m=>m.key==='morning|2026-09-24').at).toISOString(),'2026-09-23T22:30:00.000Z','7:30 in Japan');
  assert.deepEqual(duePushes(state,leave.at-1,leave.at).map(m=>m.key),[leave.key]);
  assert.deepEqual(duePushes(state,leave.at-1,leave.at+PUSH_LATE_LIMIT+1),[],'too late to be any use is not sent');
  assert.equal(wants({name:'Nate',prefs:{leave:false}},leave),false);
  assert.equal(wants({name:'Nate',prefs:{}},{...leave,to:['Damien']}),false,'not your booking');
  const sub=n=>({endpoint:`https://push.example/${n}`,keys:{p256dh:'k'.repeat(20),auth:'a'.repeat(10)}});
  await subscribe({name:'Nate'},sub('nate'),{});await subscribe({name:'Damien'},sub('damien'),{leave:false});
  const sent=[],send=async(s,p)=>{sent.push([s.endpoint,p.title]);};
  await tick(state,leave.at-10*60000,send);
  const out=await tick(state,leave.at+60000,send);
  assert.deepEqual(out.map(o=>o.key),[leave.key]);
  assert.ok(sent.some(([e,t])=>e.endsWith('/nate')&&/Nozomi 33/.test(t)));
  assert.ok(!sent.some(([e])=>e.endsWith('/damien')),'Damien turned leave-by off');
  assert.deepEqual(await tick(state,leave.at+120000,send),[],'nothing twice');
  sent.length=0;
  await tellChange({id:'a1',summary:'Dinner moved to 19:00',stepId:null},'Nate',send);
  assert.deepEqual(sent.map(([e])=>e),['https://push.example/damien'],'everyone but whoever changed it');
  await tellChange({id:'a1',summary:'again'},'Nate',send);assert.equal(sent.length,1,'a change is told once');
  const gone=async()=>{const e=new Error('Gone');e.statusCode=410;throw e;};
  await tellChange({id:'a2',summary:'x'},'Nate',gone);sent.length=0;
  await tellChange({id:'a3',summary:'y'},'Nate',send);assert.equal(sent.length,0,'a phone the push service says is gone is dropped');
 }finally{delete process.env.LOCAL_DEMO;resetDemoPush();}
});
test('API: the push tick needs the cron secret, and a phone cannot subscribe until the server has keys',async()=>{
 const {createServer}=await import('node:http');const handler=(await import('../server/handler.mjs')).default;
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;delete process.env.VAPID_PUBLIC_KEY;delete process.env.VAPID_PRIVATE_KEY;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});
  delete process.env.CRON_SECRET;
  assert.equal((await fetch(base+'/api/push-tick')).status,403,'no secret set, nobody gets in');
  process.env.CRON_SECRET='s'.repeat(32);
  assert.equal((await fetch(base+'/api/push-tick?key=wrong')).status,403);
  const r=await fetch(base+'/api/push-tick',{headers:{authorization:`Bearer ${'s'.repeat(32)}`}});assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{ok:true,ready:false,sent:[]},'no keys, nothing sent');
  assert.equal((await(await fetch(base+'/api/config')).json()).push,false);
  assert.equal((await post('push-subscribe',{subscription:{}})).status,503);
 }finally{delete process.env.LOCAL_DEMO;delete process.env.CRON_SECRET;await new Promise(r=>server.close(r));}
});
test('tax-free: a flag on shopping and shortlist items, carried across, and a per-shop total against ¥5,000',async()=>{
 const {applyOperation}=await import('../server/model.mjs');
 const {taxFreeTally,TAX_FREE_MIN}=await import('../src/shopping-groups.js');
 const parent={name:'Damien',role:'parent'};
 let state=upgraded(seed);
 state=applyOperation(state,{type:'shoppingAdd',title:'Kit Kats',store:'Don Quijote, Shibuya',budget:3000,quantity:1,taxFree:true},parent);
 state=applyOperation(state,{type:'shoppingAdd',title:'Socks',store:'Don Quijote',budget:1500,quantity:1,taxFree:true},parent);
 state=applyOperation(state,{type:'shoppingAdd',title:'Postcard',store:'Don Quijote',budget:900,quantity:1},parent);
 assert.equal(state.shopping.at(-1).taxFree,false);
 let t=taxFreeTally(state.shopping);
 assert.equal(t.total,4500);assert.equal(t.reached,false);assert.equal(t.short,500);assert.equal(TAX_FREE_MIN,5000);
 state=applyOperation(state,{type:'shoppingEdit',id:state.shopping.at(-1).id,title:'Postcard',store:'Don Quijote',budget:900,quantity:1,taxFree:true},parent);
 t=taxFreeTally(state.shopping);assert.equal(t.reached,true);
 assert.equal(taxFreeTally([{taxFree:true,store:'',budget:9000}]),null,'no shop, no visit to count');
 state=applyOperation(state,{type:'shortlistAdd',title:'Kimono jacket',shop:'Nakamise',price:12000,taxFree:true},parent);
 const find=state.shortlist.at(-1);assert.equal(find.taxFree,true);
 state=applyOperation(state,{type:'shortlistStatus',id:find.id,status:'yes'},parent);
 state=applyOperation(state,{type:'shortlistShop',id:find.id},parent);
 assert.equal(state.shopping.at(-1).taxFree,true,'the flag comes across with it');
});
test('shopping: a souvenir for friends and family back home carries the name it is for',async()=>{
 const {applyOperation}=await import('../server/model.mjs');
 const {GIFT,forLabel,shoppingFor}=await import('../src/shopping-groups.js');
 const parent={name:'Damien',role:'parent'};
 let state=upgraded(seed);
 assert.deepEqual(shoppingFor(['Damien']),['Family','Damien',GIFT]);
 state=applyOperation(state,{type:'shoppingAdd',title:'Furoshiki',person:GIFT,giftFor:'  Grandma ',quantity:1},parent);
 const gift=state.shopping.at(-1);
 assert.equal(gift.person,GIFT);assert.equal(gift.giftFor,'Grandma');assert.equal(forLabel(gift),'For Grandma');
 assert.equal(forLabel({person:GIFT,giftFor:''}),GIFT,'no name, the group still shows');
 state=applyOperation(state,{type:'shoppingEdit',id:gift.id,title:'Furoshiki',person:'Family',giftFor:'Grandma',quantity:1},parent);
 assert.equal(state.shopping.at(-1).giftFor,'','a name only goes with a gift');
 assert.throws(()=>applyOperation(state,{type:'shoppingAdd',title:'X',person:'Someone else',quantity:1},parent),/Choose who it is for/);
});
test('arrival paperwork: the declaration reminder shows in the 72 hours before the flight home',async()=>{
 const {declarationDue,VJW_STEPS,VISIT_JAPAN_WEB,TRAVEL_DECLARATION}=await import('../src/arrival-data.js');
 const {dayBriefing}=await import('../src/briefing-data.js');
 const state=upgraded(seed);
 assert.deepEqual(state.days.map(d=>declarationDue(state,d.date)).map((v,i)=>v?i+1:0).filter(Boolean),[14,15,16],'the last three days');
 assert.equal(dayBriefing(state,'2026-10-06').declaration,true);assert.equal(dayBriefing(state,'2026-09-29').declaration,false);
 assert.equal(VJW_STEPS.length,5);assert.match(VISIT_JAPAN_WEB,/^https:\/\/www\.vjw\.digital\.go\.jp\//);assert.match(TRAVEL_DECLARATION,/^https:\/\/www\.abf\.gov\.au\//);
});
test('the day map is drawn from positions the trip holds, needs no network, and keeps true distances',async()=>{
 const {dayMap,project,scaleBar}=await import('../src/day-map-data.js');
 const state=upgraded(seed),m=dayMap(state,'2026-09-24');
 assert.ok(m.marks.length>=2);assert.equal(m.legs.length,m.path.length-1);
 const order=m.path.flatMap(i=>m.marks[i].stops.map(s=>s.n));
 assert.ok(m.path.every((x,i)=>i===0||x!==m.path[i-1]),'no leg from a place to itself');
 assert.equal(new Set(order).size,m.marks.flatMap(x=>x.stops).length,'every stop is on the route');
 const back=dayMap(state,'2026-09-22');
 assert.ok(back.path.length>back.marks.length,'a place visited twice is gone back to');
 assert.ok(m.legs.some(l=>l.km>300),'Tokyo to Kyoto is the long leg');
 const p=project([{lat:35,lng:139},{lat:35,lng:139.01},{lat:35.01,lng:139}],300,300,0);
 const east=p.points[1].x-p.points[0].x,north=p.points[0].y-p.points[2].y;
 assert.ok(Math.abs(east/north-Math.cos(35*Math.PI/180))<.01,'a degree east is shorter than a degree north');
 assert.equal(scaleBar(.01,360).label,'500 m');assert.equal(scaleBar(1,360).label,'50 km');
 const src=await readFile(new URL('../src/DayMap.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(src,/fetch\(|tile\.openstreetmap|https?:\/\//,'nothing in the map comes from the network');
});
test('the printed guide is rebuilt from the plan in the original guide’s order',async()=>{
 const {travelGuide,stays,glance,cropFrame,guideDays,HOTEL_ART}=await import('../src/travel-guide-data.js');
 const state=upgraded(seed);
 // Nights, not days: the last day of the trip is the day we leave, so the Hilton is five nights.
 assert.deepEqual(stays(state).map(s=>[s.hotel,s.nights,s.from,s.to,s.city]),[
  ['1 Hotel Tokyo',3,'2026-09-21','2026-09-24','Tokyo'],['Hotel Kanra Kyoto',5,'2026-09-24','2026-09-29','Kyoto'],
  ['Fantasy Springs Hotel',2,'2026-09-29','2026-10-01','Disney Resort'],['Hilton Tokyo',5,'2026-10-01','2026-10-06','Tokyo']]);
 for(const s of stays(state))assert.ok(HOTEL_ART[s.hotel],`${s.hotel} has its picture from page 13`);
 const g=travelGuide(state,{printedOn:'29 September 2026'});
 assert.equal(g.chapters.length,16);assert.equal(g.nights,15);assert.equal(g.whole,true);
 assert.deepEqual(g.legs.map(l=>l.city),['Tokyo','Kyoto','Disney Resort','Tokyo']);
 assert.equal(g.phrases.length,6);assert.ok(g.phrases.every(p=>p.ja&&p.say&&p.en));
 const tue=g.chapters[1];
 assert.equal(tue.eyebrow,'TOKYO / TUESDAY 22 SEPTEMBER');
 assert.deepEqual(tue.banner&&{page:tue.banner.page,y:tue.banner.y},{page:20,y:0},'the banner is the top of the day’s first original page');
 assert.ok(tue.glance.length<=5&&tue.glance.some(x=>x.title==='SHIBUYA SKY'&&x.fixed),'the booked time is always at a glance');
 assert.deepEqual(tue.items.map(i=>i.n),tue.items.map((_,k)=>k+1));
 // The sketch map numbers its marks as the steps are numbered, so the two can be read together.
 if(tue.map)for(const m of tue.map.marks)for(const s of m.stops)assert.equal(tue.items[s.n-1].id,s.id);
 assert.ok(!/^(breakfast|head to|walk to|return)/i.test(tue.lede.split(' · ')[0]),'the line under the title is what the day is for');
 // A skipped stop is not printed, and a chosen option replaces the others.
 const edited=upgraded(seed);edited.steps.find(s=>s.title==='Kiddy Land').status='skipped';
 assert.ok(!travelGuide(edited).chapters[1].items.some(i=>i.title==='Kiddy Land'));
 assert.deepEqual(guideDays(state,{range:'ahead',today:'2026-10-04'}).map(d=>d.date),['2026-10-04','2026-10-05','2026-10-06']);
 assert.equal(travelGuide(state,{range:'day',day:'2026-09-24'}).chapters[0].moving,true,'a hotel change is said');
 assert.ok(g.checks.some(c=>/Qantas/.test(c)),'what the plan itself says to check goes in the front');
 // A crop is the page scaled inside a frame of the piece's shape.
 const f=cropFrame({x:.5,y:.25,w:.5,h:.25});
 assert.equal(f.width,200);assert.equal(f.left,-100);assert.equal(f.top,-100);assert.ok(Math.abs(f.ratio-(.5*1247)/(.25*1800))<1e-9);
 assert.deepEqual(glance([{time:'08:00'},{time:'09:00',kind:'optional'},{time:'10:00',locked:true},{time:'11:00'},{time:'12:00',kind:'optional'},{time:'13:00'},{time:'14:00'}]).map(s=>s.time),['08:00','10:00','11:00','13:00','14:00']);
});
test('the trip shop orders the essentials by lead time, and every link leaves through one seam',async()=>{
 const shop=await import('../src/shop-data.js');
 const {PAGES,MORE_SECTIONS}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 assert.ok(PAGES.shop?.label&&PAGE_RULES.shop,'a screen with something to say');
 // The shop moved to the Money shelf when More was regrouped: it is about what we buy.
 assert.ok(MORE_SECTIONS.find(([t])=>t==='Money')[1].includes('shop'));
 const leads=shop.ESSENTIALS.map(e=>e.lead);
 assert.deepEqual(leads,[...leads].sort((a,b)=>b-a),'in the order to do them');
 for(const id of ['power','cash','esim','ic'])assert.ok(shop.ESSENTIALS.some(e=>e.id===id),`${id} is in the pack`);
 for(const item of [...shop.ESSENTIALS,...shop.KEEPSAKES]){
  assert.ok(item.buy.length,`${item.id} has somewhere to go`);
  for(const [,url] of item.buy)assert.match(url,/^https:\/\//,`${item.id} links over https`);
  if(item.page)assert.ok(PAGES[item.page],`${item.id} points at a real screen`);
 }
 const cash=shop.ESSENTIALS.find(e=>e.id==='cash');
 assert.equal(shop.essentialDue(cash,25),'soon');assert.equal(shop.essentialDue(cash,14),'now');
 assert.equal(shop.essentialDue(cash,90),'later');assert.equal(shop.essentialDue(cash,-3),'past');
 assert.equal(shop.essentialDue(shop.ESSENTIALS.find(e=>e.id==='luggage'),-3),'now','forwarding is done on the trip');
 assert.equal(shop.daysUntil({days:[{date:'2026-09-21'}]},'2026-09-01'),20);
 assert.equal(shop.daysUntil({days:[]},'2026-09-01'),null);
 // No partner yet: links go out untouched and nothing claims a commission.
 const url='https://www.airalo.com/japan-esim';
 assert.equal(shop.shopLink(url),url);assert.equal(shop.partnered(url),false);
 shop.PARTNERS['airalo.com']=u=>`${u}?ref=trip`;
 try{assert.equal(shop.shopLink(url),`${url}?ref=trip`);assert.equal(shop.partnered(url),true);}
 finally{delete shop.PARTNERS['airalo.com'];}
 assert.equal(shop.shopLink('not a url'),'not a url');
});
test('keepsakes say whether the trip has given them enough to be made from',async()=>{
 const {KEEPSAKES,keepsakeMaterial,keepsakeReady}=await import('../src/shop-data.js');
 const state={members:['Nate','Boston'],mascots:{Nate:{name:'Kitsu'},Boston:{name:' '}},
  photoVotes:{'2026-09-21':{Nate:'p1'},'2026-09-22':{}},steps:[{day:'2026-09-21',status:'done'},{day:'2026-09-22',status:'done'},{day:'2026-09-22',status:'todo'}]};
 const m=keepsakeMaterial(state);
 assert.deepEqual(m,{characters:1,photos:1,days:2,stamps:2});
 assert.equal(keepsakeReady(KEEPSAKES.find(k=>k.id==='shirts'),m).ready,true);
 assert.deepEqual(keepsakeReady(KEEPSAKES.find(k=>k.id==='book'),m),{have:1,need:6,ready:false});
 for(const k of KEEPSAKES){assert.ok(['before','during','after'].includes(k.when));assert.ok(k.from in m,`${k.id} is made from something counted`);assert.equal(k.provider,null,'no print provider chosen yet');}
 assert.deepEqual(keepsakeMaterial({}),{characters:0,photos:0,days:0,stamps:0});
});
test('the trip shop log keeps what was sorted and whether it was worth it, for the next trip',async()=>{
 const {applyOperation}=await import('../server/model.mjs');
 const {shopEntry,shopLogged}=await import('../src/shop-data.js');
 const {visibleTrip}=await import('../server/visibility.mjs');
 const lauren={name:'Lauren',role:'parent'};
 let state=upgraded(seed);
 assert.deepEqual(state.shopLog,{});
 state=applyOperation(state,{type:'shopLog',id:'esim',sorted:true},lauren);
 state=applyOperation(state,{type:'shopLog',id:'esim',verdict:'no',note:'  Dropped out in Hakone.  '},lauren);
 const e=shopEntry(state,'esim');
 assert.ok(e.sortedAt,'the tick survives a later note');assert.equal(e.verdict,'no');assert.equal(e.note,'Dropped out in Hakone.');assert.equal(e.by,'Lauren');
 state=applyOperation(state,{type:'shopLog',id:'esim',verdict:''},lauren);
 assert.equal(shopEntry(state,'esim').verdict,null);assert.equal(shopEntry(state,'esim').note,'Dropped out in Hakone.');
 state=applyOperation(state,{type:'shopLog',id:'book',sorted:true},lauren);
 assert.deepEqual(shopLogged(state),{sorted:1,total:8,notes:1},'a keepsake ordered is not an essential sorted');
 assert.throws(()=>applyOperation(state,{type:'shopLog',id:'esim',sorted:true},{name:'Nate',role:'child'}),/parent/);
 assert.throws(()=>applyOperation(state,{type:'shopLog',id:'nope',sorted:true},lauren),/Unknown trip shop item/);
 assert.throws(()=>applyOperation(state,{type:'shopLog',id:'esim',verdict:'maybe'},lauren),/worth it/);
 assert.throws(()=>applyOperation(state,{type:'shopLog',id:'esim',note:'x'.repeat(281)},lauren),/Invalid note/);
 assert.throws(()=>applyOperation(state,{type:'shopLog',id:'esim',sorted:'yes'},lauren),/Invalid tick/);
 assert.ok(visibleTrip(state,{name:'Nate',role:'child'}).shopLog.esim,'the boys can read what was learned');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/'bookingWindowBooked','shopLog'\]/,'a tick made with no signal is queued');
});
test('apps to download: each app finds its days in the plan, and ones behind us are done',async()=>{
 const {SUGGESTED_APPS,APP_GROUPS,appDays,suggestedApps}=await import('../src/apps-data.js');
 const {PAGES,MORE_SECTIONS}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 const state=upgraded(seed),byId=id=>SUGGESTED_APPS.find(a=>a.id===id);
 assert.deepEqual(appDays(state,byId('usj')),['2026-09-25']);
 assert.deepEqual(appDays(state,byId('smartex')),['2026-09-24','2026-09-29'],'both Nozomi days');
 assert.deepEqual(appDays(state,byId('disney')),['2026-09-29','2026-09-30','2026-10-01']);
 assert.deepEqual(appDays(state,byId('qantas')),['2026-09-21','2026-10-06'],'the two flight days');
 assert.equal(appDays(state,byId('maps')).length,16,'the rest are for the whole trip');
 const mid=Object.fromEntries(suggestedApps(state,'2026-09-28').map(a=>[a.id,a]));
 assert.equal(mid.usj.done,true);assert.equal(mid.disney.soon,true);assert.equal(mid.disney.next,'2026-09-29');
 assert.equal(mid.maps.soon,false,'whole-trip apps are never flagged');assert.equal(mid.qantas.soon,false);
 assert.equal(suggestedApps(state,'2026-09-01').filter(a=>a.done).length,0,'nothing is done before the trip');
 for(const a of SUGGESTED_APPS){assert.match(a.url,/^https:\/\/apps\.apple\.com\/au\/app\/[a-z-]+\/id\d+$/,a.id);assert.ok(APP_GROUPS.some(([g])=>g===a.group),a.id);assert.ok(a.why&&a.setup&&a.who,a.id);}
 // Apps to download is part of Help now, not a page of its own, and an old link to it lands on Help.
 const {pageFor}=await import('../src/nav-data.js');
 assert.ok(!PAGES.apps&&!PAGE_RULES.apps,'no separate apps page');
 assert.ok(!MORE_SECTIONS.flatMap(([,ids])=>ids).includes('apps'));
 assert.ok(MORE_SECTIONS.find(([t])=>t==='Out and about')[1].includes('help'));
 assert.equal(pageFor('apps'),'help');assert.equal(pageFor('weather'),'weather');
 assert.match(PAGES.help.label,/apps/i);assert.match(PAGE_RULES.help,/earthquakes/);
});
test('apps to download: reminders a week before we fly, the evening before each park and train, and on the briefing',async()=>{
 const {appReminders,appsDue}=await import('../src/apps-data.js');
 const {pushMoments,PUSH_KIND_IDS}=await import('../src/push-data.js');
 const {dayBriefing}=await import('../src/briefing-data.js');
 const state=upgraded(seed);
 assert.deepEqual(appReminders(state).map(r=>[r.id,r.day]),[['before','2026-09-14'],['smartex','2026-09-23'],['usj','2026-09-24'],['disney','2026-09-28']]);
 assert.ok(appReminders(state)[0].apps.some(a=>a.id==='qantas'),'the flight home is covered by the week-before list');
 assert.ok(PUSH_KIND_IDS.includes('apps'));
 const pushes=pushMoments(state).filter(m=>m.kind==='apps');
 assert.equal(pushes.length,4);assert.equal(new Date(pushes.find(m=>m.key==='apps|disney|2026-09-28').at).toISOString(),'2026-09-28T10:00:00.000Z','7pm in Japan');
 assert.equal(pushes.find(m=>m.key.startsWith('apps|disney')).title,'Tomorrow: Tokyo Disney Resort App');
 for(const m of pushes){assert.equal(m.url,'/?tab=help');assert.ok(m.to.every(n=>['Damien','Lauren'].includes(n)),'parents only');}
 assert.deepEqual(appsDue(state,'2026-09-28'),[{id:'disney',name:'Tokyo Disney Resort App',today:false}]);
 assert.deepEqual(dayBriefing(state,'2026-09-25').apps.map(a=>[a.id,a.today]),[['usj',true]]);
 assert.deepEqual(dayBriefing(state,'2026-09-22').apps,[]);
});
test('apps to download: an app a stop was booked through is suggested for that stop’s day, and not before',async()=>{
 const {suggestedApps,appReminders}=await import('../src/apps-data.js');
 const state=upgraded(seed);
 assert.ok(!suggestedApps(state,'2026-09-01').some(a=>a.id==='klook'),'nothing booked through Klook, no Klook');
 const tea=state.steps.find(s=>s.day==='2026-09-26');
 const booked={...state,steps:state.steps.map(s=>s.id===tea.id?{...s,bookedVia:'klook'}:s)};
 assert.deepEqual(suggestedApps(booked,'2026-09-01').find(a=>a.id==='klook').days,['2026-09-26']);
 assert.deepEqual(appReminders(booked).find(r=>r.id==='klook').day,'2026-09-25','the evening before');
 assert.ok(!appReminders(booked)[0].apps.some(a=>a.id==='klook'),'and not in the week-before list');
});
test('like a local: every experience is for a base on the trip, finds its days, and is wired in',async()=>{
 const local=await import('../src/local-data.js');
 const {PAGES,MORE_SECTIONS}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 const {HOME_WIDGETS}=await import('../src/home-widgets.js');
 const {PROPOSAL_KINDS,tripAreas,proposalDraft}=await import('../src/trip-features.js');
 const state=upgraded(seed),areas=tripAreas(state),kinds=local.LOCAL_KINDS.map(([k])=>k);
 const ids=new Set();
 for(const e of local.LOCAL_EXPERIENCES){
  assert.ok(!ids.has(e.id),`${e.id} is unique`);ids.add(e.id);
  assert.ok(areas.includes(e.area),`${e.id} is for a base we visit (${e.area})`);
  assert.ok(kinds.includes(e.kind),`${e.id} has a kind`);
  assert.ok(e.title&&e.where&&e.why&&e.how&&e.cost,`${e.id} says where, why, how and what it costs`);
  assert.match(e.ja,/[぀-ヿ一-鿿]/,`${e.id} has a Japanese name to point at`);
  assert.ok(['yes','care'].includes(e.boys),`${e.id} says whether it works with the boys`);
  assert.ok(local.LOCAL_KIND_ICON[e.kind],`${e.kind} has an icon`);
  const draft=proposalDraft(local.localDraft(e));
  assert.ok(PROPOSAL_KINDS.some(([k])=>k===draft.category),`${e.id} lands on a real board category`);
  assert.ok(draft.tags.includes('like a local')&&draft.notes.includes(e.how),`${e.id} keeps its why and how on the board`);
  assert.match(local.localMapUrl(e),/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
 }
 assert.ok(local.LOCAL_EXPERIENCES.filter(e=>e.area==='Tokyo').length>=10,'Tokyo, where six days remain, has the most');
 // Days: a Kyoto one is only on the Kyoto days, a Tokyo one counts the Disney days, a weekend
 // market waits for the weekend we are in Tokyo.
 const byId=id=>local.LOCAL_EXPERIENCES.find(e=>e.id===id);
 assert.deepEqual(local.localDays(state,byId('kamodelta')),['2026-09-24','2026-09-26','2026-09-27']);
 assert.deepEqual(local.localDays(state,byId('fleamarket')),['2026-10-03','2026-10-04'],'Saturday and Sunday in Tokyo; the Kyoto weekend does not count');
 assert.ok(local.localDays(state,byId('sento')).includes('2026-09-30'),'a Disney day is within Tokyo’s reach');
 const oct2=Object.fromEntries(local.localExperiences(state,'2026-10-02').map(e=>[e.id,e]));
 assert.equal(oct2.kamodelta.done,true,'Kyoto is behind us');assert.equal(oct2.kamodelta.here,false);
 assert.equal(oct2.sento.here,true);assert.equal(oct2.sento.done,false);
 assert.equal(oct2.fleamarket.next,'2026-10-03');assert.equal(oct2.fleamarket.done,false);
 const oct5=Object.fromEntries(local.localExperiences(state,'2026-10-05').map(e=>[e.id,e]));
 assert.equal(oct5.fleamarket.done,true,'the last weekend has gone');assert.equal(oct5.sento.done,false);
 assert.deepEqual(local.localAreaOrder(state,'2026-10-02'),{here:['Tokyo'],ahead:[],behind:['Kyoto','Osaka','Nara']});
 assert.deepEqual(local.localAreaOrder(state,'2026-09-27'),{here:['Nara','Kyoto'],ahead:['Osaka','Tokyo'],behind:[]});
 // Home: only where we are, the market leading on its days, and the rest turned over day by day.
 const sat=local.localPicks(state,'2026-10-03'),fri=local.localPicks(state,'2026-10-02'),sun=local.localPicks(state,'2026-10-04');
 assert.equal(sat[0].id,'fleamarket');assert.equal(fri[0].id,'fleamarket','the day before too');assert.equal(sun[0].id,'fleamarket');
 assert.ok(sat.length<=3&&sat.every(e=>e.area==='Tokyo'));
 assert.notDeepEqual(fri.slice(1).map(e=>e.id),local.localPicks(state,'2026-10-05').slice(1).map(e=>e.id),'not the same three all week');
 assert.deepEqual(local.localPicks(state,'2026-09-20'),[],'nothing before the trip');
 assert.deepEqual(local.localPicks(state,'2026-09-25').map(e=>e.area),local.localPicks(state,'2026-09-25').map(()=>'Osaka'),'the USJ day is an Osaka day');
 // Search, Ask and the shell.
 assert.ok(local.searchLocal('tram').some(h=>h.id==='toden'&&h.type==='Like a local'));
 assert.ok(local.searchLocal('銭湯').some(h=>h.id==='sento'),'found by the Japanese too');
 assert.deepEqual(local.searchLocal(''),[]);
 const brief=local.localBrief(state);
 assert.match(brief,/^# Like a local/);assert.match(brief,/## Tokyo \(2026-09-21 to 2026-10-06\)/);assert.match(brief,/weekends only/);
 const {tripProject}=await import('../src/trip-project.js');
 assert.match(tripProject(state).shared,/# Like a local/,'Ask is told about them');
 assert.equal(local.localBrief(upgraded({members:['Ana'],days:[{date:'2027-05-01',title:'Rome',city:'Rome'}],steps:[],choices:{},documents:[],history:[],notices:[]})),'','another trip is told nothing about Tokyo');
 assert.ok(PAGES.local?.label&&PAGE_RULES.local,'a page and a spoken rule');
 assert.ok(MORE_SECTIONS.find(([t])=>t==='Out and about')[1].includes('local'));
 assert.equal(HOME_WIDGETS.local?.page,'local','the Home card points at the page');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/tab==='local'&&<LikeALocal /);assert.match(main,/local:<LikeALocalCard /);
 const search=await readFile(new URL('../src/PracticalPages.jsx',import.meta.url),'utf8');
 assert.match(search,/'Like a local':'local'/,'a search hit opens the page');
});
test('like a local: a parent checks a card against the web, and what comes back is saved for everyone, cleaned',async()=>{
 const {cleanLocalCheck,localBrief}=await import('../src/local-data.js');
 const {normaliseLocalCheck}=await import('../server/local-check.mjs');
 const {applyOperation}=await import('../server/model.mjs');
 const state=upgraded(seed);
 assert.deepEqual(state.localChecks,{},'starts empty');
 const found={found:true,open:' 9:00–20:30 daily ',closed:'',price:'Free',changed:false,differences:'',summary:'Open every day to 8:30 pm and free.  The lift is on the ground floor.',checkFirst:'',
  sources:[{title:'Bunkyo City',url:'https://www.city.bunkyo.lg.jp/x'},{title:'bad',url:'http://insecure.example'},{title:'junk',url:'not a url'}]};
 const clean=normaliseLocalCheck(found);
 assert.equal(clean.open,'9:00–20:30 daily');assert.equal(clean.summary,'Open every day to 8:30 pm and free. The lift is on the ground floor.');
 assert.deepEqual(clean.sources.map(s=>s.url),['https://www.city.bunkyo.lg.jp/x'],'only https sources survive');
 assert.equal(clean.changed,false);
 assert.equal(cleanLocalCheck({summary:'x'.repeat(2000)}).value.summary.length,1000,'cut to length');
 assert.ok(cleanLocalCheck({summary:''}).error,'a check that said nothing is refused');
 assert.ok(cleanLocalCheck(null).error);
 const lauren={name:'Lauren',role:'parent'},nate={name:'Nate',role:'child'};
 const after=applyOperation(state,{type:'localCheck',id:'bunkyo',check:found},lauren);
 assert.equal(after.localChecks.bunkyo.by,'Lauren');assert.ok(after.localChecks.bunkyo.at);assert.equal(after.localChecks.bunkyo.open,'9:00–20:30 daily');
 assert.throws(()=>applyOperation(state,{type:'localCheck',id:'bunkyo',check:found},nate),/parent/);
 assert.throws(()=>applyOperation(state,{type:'localCheck',id:'nowhere',check:found},lauren),/not one of ours/);
 assert.throws(()=>applyOperation(state,{type:'localCheck',id:'bunkyo',check:{summary:''}},lauren),/said nothing/);
 const changed=applyOperation(after,{type:'localCheck',id:'toymuseum',check:{...found,changed:true,differences:'Now ¥1,200 an adult.',price:'¥1,200 / ¥900'}},lauren);
 assert.match(changed.alerts[0].summary,/Lauren checked Tokyo Toy Museum, in an old school on the web: something differs from the card/,'a difference is a family alert');
 assert.equal(after.alerts.length,state.alerts.length,'a check that agrees with the card is not');
 assert.equal(changed.history[0].title,'Tokyo Toy Museum, in an old school');
 assert.match(localBrief(changed),/Tokyo Toy Museum.*checked on the web \d{4}-\d{2}-\d{2}: .*Differs from the card: Now ¥1,200 an adult\./,'Ask reads the check');
 const handler=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 assert.match(handler,/route==='local-check'&&post\)\{\s*parent\(user\)/,'the route is a parent’s');
 const server=await readFile(new URL('../server/local-check.mjs',import.meta.url),'utf8');
 assert.match(server,/web_search_20260209/);assert.match(server,/record_check/);assert.match(server,/user_location:\{type:'approximate',country:'JP'/,'asked from Japan');
 const page=await readFile(new URL('../src/LikeALocal.jsx',import.meta.url),'utf8');
 assert.match(page,/request\('local-check',\{id:e\.id,today\}\)/);assert.match(page,/mutate\(\{type:'localCheck',id:e\.id,check:found\}\)/,'saved through the ordinary mutation');
 assert.match(page,/user\?\.role==='parent'&&!!config\?\.research&&online/,'offered to a parent with the key and a signal');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/<LikeALocal [^\n]*request=\{request\} config=\{config\} online=\{online\}/);
});
test('home while we’re away: the house list and the first day home go onto the to-do list, and the clocks-change note is worked out from the zones',async()=>{
 const {zoneOffset,homeAhead,clockShift,clockNotice,AWAY_LIST,LANDING_LIST,onTodoList,HOME_ZONE}=await import('../src/home-front.js');
 const {dayBriefing}=await import('../src/briefing-data.js');
 const {PAGES,MORE_SECTIONS}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 const {applyOperation}=await import('../server/model.mjs');
 const state=upgraded(seed);
 // Sydney is an hour ahead of Tokyo in September and two ahead once daylight saving starts.
 assert.equal(zoneOffset(new Date('2026-09-21T03:00:00Z'),'Asia/Tokyo'),9);
 assert.equal(zoneOffset(new Date('2026-09-21T03:00:00Z'),HOME_ZONE),10);
 assert.equal(homeAhead('2026-09-21'),1);assert.equal(homeAhead('2026-10-05'),2);
 assert.equal(homeAhead('2026-09-21',HOME_ZONE,'Australia/Perth'),2,'any pair of zones');
 // This trip crosses the first Sunday of October; a March trip, or a family in Brisbane, does not.
 assert.deepEqual(clockShift(seed.days),{day:'2026-10-04',before:1,after:2,home:HOME_ZONE,away:'Asia/Tokyo'});
 assert.equal(clockShift(seed.days,'Australia/Brisbane'),null);
 assert.equal(clockShift(seed.days.slice(0,5)),null);
 assert.equal(clockShift([]),null);
 // Nothing until the day before; a heads-up then; the new gap from the day itself on.
 assert.equal(clockNotice(state,'2026-09-30'),null);
 assert.match(clockNotice(state,'2026-10-03').text,/^Clocks at home change tomorrow, Sunday 4 October: from then on home is 2 hours ahead of here, not one hour\./);
 assert.match(clockNotice(state,'2026-10-04').text,/^Clocks at home changed today: home is now 2 hours ahead of here, not one hour\./);
 assert.match(clockNotice(state,'2026-10-06').text,/changed on Sunday 4 October: home is now 2 hours ahead/);
 assert.equal(dayBriefing(state,'2026-10-05').clocks.when,'since');assert.equal(dayBriefing(state,'2026-09-25').clocks,null);
 // The lists: a line goes onto the family to-do list once, and the page then says so.
 assert.ok(AWAY_LIST.length>=6&&LANDING_LIST.length>=6);
 for(const item of [...AWAY_LIST,...LANDING_LIST])assert.ok(item.id&&item.title&&item.note,item.id);
 assert.equal(onTodoList(state,LANDING_LIST[0]),null);
 const parent={name:'Damien',role:'parent'};
 const next=applyOperation(state,{type:'todoAdd',title:LANDING_LIST[0].title,kind:'do',day:'2026-10-06',person:'Family',notes:LANDING_LIST[0].note},parent);
 assert.equal(onTodoList(next,LANDING_LIST[0]).day,'2026-10-06');
 // Its place in the app.
 assert.ok(PAGES.homefront?.label&&PAGE_RULES.homefront);
 assert.ok(MORE_SECTIONS.find(([t])=>t==='The plan')[1].includes('homefront'));
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/\{tab==='homefront'&&<HomeFront state=\{visibleState\} mutate=\{mutate\} busy=\{busy\} go=\{go\}\/>\}/);
 const briefing=await readFile(new URL('../src/Briefing.jsx',import.meta.url),'utf8');
 assert.match(briefing,/\{b\.clocks&&<button[^>]*onClick=\{\(\)=>go\('homefront'\)\}>/,'the day in brief carries the note');
});
test('flying home: what we bought is read off our own lists and set against the passenger card, the allowance and the scales',async()=>{
 const {classify,boughtItems,declareGroups,dutyFree,weightOf,weightBudget,ADULT_AUD,CHILD_AUD,ALLOWANCE_KG,DEFAULT_KG}=await import('../src/flying-home.js');
 const {PAGES,MORE_SECTIONS}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 const {applyOperation}=await import('../server/model.mjs');
 const {yenPerAud}=await import('../src/trip-features.js');
 const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};
 // The words on the card.
 assert.equal(classify('Matcha KitKats for school'),'food');assert.equal(classify('Kokeshi doll'),'wood');
 assert.equal(classify('Bonito flakes'),'animal');assert.equal(classify('Bonsai seeds'),'plants');assert.equal(classify('Pokémon plush'),null);assert.equal(classify(''),null);
 // Only what was actually bought counts, from all three lists.
 let state=upgraded(seed);
 assert.deepEqual(boughtItems(state),[]);
 state=applyOperation(state,{type:'shoppingAdd',title:'Matcha KitKats',quantity:4,budget:600,person:'Family'},parent);
 state=applyOperation(state,{type:'shoppingAdd',title:'Kokeshi doll',budget:3500,person:'Lauren'},parent);
 state=applyOperation(state,{type:'shoppingAdd',title:'Not bought yet',budget:9999},parent);
 const [kitkats,kokeshi]=state.shopping;
 state=applyOperation(state,{type:'shoppingStatus',id:kitkats.id,done:true},parent);
 state=applyOperation(state,{type:'shoppingStatus',id:kokeshi.id,done:true},parent);
 state=applyOperation(state,{type:'shortlistAdd',title:'Bottle of sake',price:2800,person:'Damien'},parent);
 state=applyOperation(state,{type:'shortlistStatus',id:state.shortlist.at(-1).id,status:'bought'},parent);
 state=applyOperation(state,{type:'shortlistAdd',title:'Tetsubin teapot',price:12000},parent);
 const bought=boughtItems(state);
 assert.deepEqual(bought.map(i=>[i.title,i.qty,i.yen,i.declare,i.kg]),[['Matcha KitKats',4,600,'food',1],['Kokeshi doll',1,3500,'wood',0.8],['Bottle of sake',1,2800,'food',1.4]]);
 const {groups,unsure,any}=declareGroups(state);
 assert.ok(any);assert.deepEqual(groups.map(g=>[g.id,g.items.length]),[['food',2],['wood',1]]);assert.deepEqual(unsure,[]);
 // The allowance: two adults and two boys, pooled, in dollars at the trip's own rate.
 const duty=dutyFree(state),rate=yenPerAud(state);
 assert.equal(duty.allowance,2*ADULT_AUD+2*CHILD_AUD);assert.equal(duty.yen,4*600+3500+2800);assert.equal(duty.aud,Math.round(duty.yen/rate*100)/100);assert.equal(duty.over,0);assert.equal(duty.counted,3);
 // The scales: guessed weights, the room typed in, and the heaviest things to post if it does not fit.
 assert.equal(weightOf('Bottle of sake'),1.4);assert.equal(weightOf('Something odd'),DEFAULT_KG);
 const w=weightBudget(state,2);
 assert.equal(w.added,3.2);assert.equal(w.over,1.2);assert.deepEqual(w.post.map(i=>i.title),['Bottle of sake']);assert.equal(w.allowanceEach,ALLOWANCE_KG);
 assert.equal(weightBudget(state,null).over,null);assert.equal(weightBudget(state,10).over,0);
 // A boy's purse counts too, at what the till took, and is his.
 let purse=applyOperation(state,{type:'spendAdd',person:'Nate',title:'Pokémon plush',estimate:1500},child);
 purse=applyOperation(purse,{type:'spendBought',id:purse.spending.items.at(-1).id,done:true,spent:1800},child);
 assert.deepEqual(boughtItems(purse).at(-1),{id:`purse-${purse.spending.items.at(-1).id}`,title:'Pokémon plush',qty:1,yen:1800,who:'Nate',source:'purse',taxFree:false,day:null,declare:null,kg:0.5});
 assert.deepEqual(declareGroups(purse).unsure.map(i=>i.title),['Pokémon plush'],'a thing the words cannot place is listed to look at');
 assert.equal(dutyFree(purse).yen,duty.yen+1800);
 // Its place in the app.
 assert.ok(PAGES.flyinghome?.label&&PAGE_RULES.flyinghome);
 assert.ok(MORE_SECTIONS.find(([t])=>t==='The plan')[1].includes('flyinghome'));
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/\{tab==='flyinghome'&&<FlyingHome state=\{visibleState\} go=\{go\} mutate=\{parent\?mutate:null\} busy=\{busy\} parent=\{parent\}\/>\}/);
});
test('lost something: the Japanese to hand over, the right desk for the day’s lines and parks, the kōban and the claim',async()=>{
 const {ITEMS,COLOURS,DESKS,desksFor,deskFor,lostDraft,KOBAN,CLAIM,claimSummary}=await import('../src/lost-data.js');
 const {PAGES,MORE_SECTIONS}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 const state=upgraded(seed);
 // The words: big Japanese first, the colour on the thing, the number to ring back.
 const d=lostDraft({item:'wallet',colour:'red',where:'on the JR Yamanote Line',when:'this morning',phone:'+61 400 000 000'});
 assert.deepEqual(d.ja,['すみません、落とし物をしました。','this morning、on the JR Yamanote Lineで赤い財布をなくしました。','見つかったら、この番号に連絡してください：+61 400 000 000']);
 assert.equal(d.en[1],'this morning, I lost a red wallet on the JR Yamanote Line.');
 assert.equal(lostDraft({item:'umbrella'}).en[1],'I lost an umbrella.');assert.equal(lostDraft({item:'glasses',colour:'black'}).en[1],'I lost black glasses.');assert.equal(lostDraft({item:'other'}).en[1],'I lost something.');
 assert.match(d.text,/^すみません/);
 assert.equal(lostDraft().ja.length,2,'nothing said, nothing padded');
 assert.equal(lostDraft({item:'nonsense'}).ja[1],'忘れ物をなくしました。','an unknown thing is still a lost thing');
 assert.ok(ITEMS.every(([id,en,ja])=>id&&en&&ja)&&COLOURS[0][0]==='');
 // The desks: every operator on the route cards has one, with a page to check the number on.
 const {LINES}=await import('../src/route-data.js');
 for(const op of new Set(Object.values(LINES).map(l=>l.operator).filter(Boolean)))assert.ok(DESKS.some(x=>x.operator===op&&!x.for),`a desk for ${op}`);
 for(const x of DESKS)assert.ok(x.title&&(x.url||x.note),x.id);
 // A Kyoto day rides Kyoto's subway and JR West; the Disney day names the resort line and the parks; a flight day names Haneda.
 assert.deepEqual(desksFor(state,'2026-09-26').today.map(x=>x.operator),['Kyoto Municipal Subway','JR West']);
 const disney=desksFor(state,'2026-09-30').today.map(x=>x.id);
 assert.ok(disney.includes('disney'),disney.join());
 assert.ok(desksFor(state,'2026-10-06').today.some(x=>x.id==='haneda'));
 assert.equal(desksFor(state,'2026-09-26').rest.length+desksFor(state,'2026-09-26').today.length,DESKS.length,'nothing is lost between the two lists');
 assert.equal(desksFor({days:[],steps:[]},'2026-09-26').today.length,0);
 assert.equal(deskFor('metro').phone,'0120-104-767');
 // The kōban and the claim.
 assert.ok(KOBAN.length>=4&&CLAIM.length>=4);
 assert.match(claimSummary({draft:d,day:'2026-09-23',stepTitle:'Shibuya crossing',report:'R-123',policy:'POL-9'}),/^Lost-property claim\nDate: 2026-09-23 · Shibuya crossing\nItem: this morning, I lost a red wallet on the JR Yamanote Line\.\nPolice report number: R-123\nPolicy: POL-9$/);
 assert.match(claimSummary({draft:d}),/\(add from the kōban slip\)/);
 // Its place in the app: under Out and about beside Safety, and a button on Safety itself.
 assert.ok(PAGES.lost?.label&&PAGE_RULES.lost);
 assert.ok(MORE_SECTIONS.find(([t])=>t==='Out and about')[1].includes('lost'));
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/\{tab==='lost'&&<Lost state=\{visibleState\} user=\{user\} day=\{day\} go=\{go\} notice=\{notice\}\/>\}/);
 const safety=await readFile(new URL('../src/Safety.jsx',import.meta.url),'utf8');
 assert.match(safety,/onClick=\{\(\)=>go\('lost'\)\}/);
});
test('the checkout sweep, the nightstand and price sense',async()=>{
 const {SWEEP,toggleSweep,sweepWords}=await import('../src/sweep-data.js');
 const {priceSense,HOME_PRICES}=await import('../src/price-sense.js');
 const {alarmFor}=await import('../src/Nightstand.jsx').catch(()=>({alarmFor:null}));
 const {PAGES,MORE_SECTIONS}=await import('../src/nav-data.js');
 const {PAGE_RULES}=await import('../src/spoken-rules.js');
 // The sweep: the same hiding places in every room, ticked one at a time.
 assert.ok(SWEEP.length>=8&&SWEEP.every(s=>s.id&&s.title&&s.note));
 let ids=[];ids=toggleSweep(ids,'charger');ids=toggleSweep(ids,'safe');assert.deepEqual(ids,['charger','safe']);
 assert.deepEqual(toggleSweep(ids,'safe'),['charger']);
 assert.equal(sweepWords([]),'Once round the room before the bags go');
 assert.equal(sweepWords(['charger']),`${SWEEP.length-1} of ${SWEEP.length} still to look in`);
 assert.equal(sweepWords(SWEEP.map(s=>s.id)),'Room swept. Nothing left behind.');
 // Price sense: what the same thing costs at home, from the words, and nothing for a thing it cannot place.
 const rate=100;
 assert.deepEqual(priceSense('Bowl of ramen at Ichiran',1200,rate),{home:20,here:12,what:'a bowl of ramen',verdict:'cheaper here',line:'About $12 here; at home a bowl of ramen is about $20 — cheaper here.'});
 assert.equal(priceSense('Lego Shinkansen set',9000,rate).verdict,'dearer here');
 assert.equal(priceSense('Matcha KitKats',350,rate).verdict,'about the same');
 assert.equal(priceSense('A mysterious thing',1000,rate),null);
 assert.equal(priceSense('ramen',null,rate),null);assert.equal(priceSense('ramen',0,rate),null);assert.equal(priceSense('',500,rate),null);
 assert.ok(HOME_PRICES.every(([aud,what,words])=>aud>0&&what&&words.length));
 // The nightstand's alarm is an hour before leaving.
 if(alarmFor){assert.equal(alarmFor(new Date('2026-09-25T08:30:00+09:00')).toISOString(),'2026-09-24T22:30:00.000Z');assert.equal(alarmFor(null),null);}
 // Where they land.
 const packing=await readFile(new URL('../src/Packing.jsx',import.meta.url),'utf8');
 assert.match(packing,/\{next\.date===day&&<CheckoutSweep key=\{day\} day=\{day\}\/>\}/,'the sweep opens under the nudge on the move day itself');
 const spending=await readFile(new URL('../src/Spending.jsx',import.meta.url),'utf8');
 assert.match(spending,/priceSense\(item\.title,bought\?spendCost\(item\):item\.estimate,rate\)/,'the line reads the real price once bought');
 const tonight=await readFile(new URL('../src/Tonight.jsx',import.meta.url),'utf8');
 assert.match(tonight,/onClick=\{\(\)=>go\('nightstand'\)\}/);
 assert.ok(PAGES.nightstand?.label&&PAGE_RULES.nightstand);
 assert.ok(MORE_SECTIONS.find(([t])=>t==='Just for you')[1].includes('nightstand'));
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/\{tab==='nightstand'&&<Nightstand state=\{visibleState\} now=\{now\} go=\{go\}\/>\}/);
 const night=await readFile(new URL('../src/Nightstand.jsx',import.meta.url),'utf8');
 assert.match(night,/navigator\.wakeLock\?\.request\('screen'\)/,'the screen stays awake');
 assert.match(night,/const late=hour>=22\|\|hour<6,dim=late&&!bright;/,'dim after ten, a tap brightens');
});
test('people to buy for: details, ideas by interest and trip day, and gifts on the list tied to them',async()=>{
 const {applyOperation}=await import('../server/model.mjs');
 const {GIFT}=await import('../src/shopping-groups.js');
 const {giftIdeas,giftProgress,daysIn,cleanGuideIdea,giftBrief}=await import('../src/gift-data.js');
 const {giftIdeasRequest}=await import('../server/gift-ideas.mjs');
 const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};
 let state=upgraded(seed);
 assert.deepEqual(state.giftPeople,[]);
 state=applyOperation(state,{type:'giftPersonAdd',name:' Grandma ',relation:'Nan',age:'older',interests:['tea','crafts','nope'],likes:'cats',budget:5000},parent);
 const nan=state.giftPeople[0];
 assert.equal(nan.name,'Grandma');assert.deepEqual(nan.interests,['tea','crafts'],'unknown interests dropped');
 assert.throws(()=>applyOperation(state,{type:'giftPersonAdd',name:''},parent),/Write their name/);
 // A boy adds his own friend, and can change his own but not Grandma.
 state=applyOperation(state,{type:'giftPersonAdd',name:'Ollie',age:'child',interests:['anime','drinks']},child);
 const ollie=state.giftPeople[1];
 assert.throws(()=>applyOperation(state,{type:'giftPersonEdit',id:nan.id,name:'Gran'},child),e=>e.status===403);
 // Ideas: only cities still ahead, inside the budget, and never alcohol for a child.
 assert.deepEqual(daysIn(state,'Kyoto','2026-10-01'),[]);assert.ok(daysIn(state,'Tokyo','2026-10-01').includes('2026-10-04'));
 assert.ok(daysIn(state,'Kyoto','2026-09-20').includes('2026-09-27'),'Nara / Kyoto counts for Kyoto');
 const late=giftIdeas(state,nan,'2026-10-01');
 assert.ok(late.length>0);assert.ok(late.every(x=>x.anywhere||x.days.every(d=>d>='2026-10-01')));
 assert.ok(!late.some(x=>x.title.startsWith('Kiyomizu-yaki')),'Kyoto is behind us');
 assert.ok(late.every(x=>x.yen[0]<=5000));
 assert.ok(giftIdeas(state,nan,'2026-09-20').some(x=>x.title.startsWith('Kiyomizu-yaki')),'before Kyoto it is offered');
 assert.ok(late.some(x=>x.declare==='food'),'tea is flagged for customs');
 assert.equal(late.find(x=>x.title.startsWith('Bamboo tea whisk'))?.declare,'wood','a whisk is bamboo, not tea');
 assert.ok(!giftIdeas(state,ollie,'2026-10-01').some(x=>x.interest==='drinks'));
 assert.ok(giftIdeas(state,{...nan,interests:[],age:''},'2026-10-01').length>0,'something for someone we know little about');
 // On the shopping list: tied to the person, named as they are, and renamed with them.
 const idea=late[0];
 state=applyOperation(state,{type:'shoppingAdd',title:idea.title,person:GIFT,giftPersonId:nan.id,giftFor:'ignored',quantity:1,budget:3000},parent);
 const gift=state.shopping.at(-1);assert.equal(gift.giftPersonId,nan.id);assert.equal(gift.giftFor,'Grandma');
 assert.ok(!giftIdeas(state,nan,'2026-10-01').some(x=>x.title===idea.title),'an idea already on the list is not offered again');
 assert.deepEqual([giftProgress(state,nan).planned,giftProgress(state,nan).done],[1,false]);
 state=applyOperation(state,{type:'shoppingStatus',id:gift.id,done:true},parent);
 assert.equal(giftProgress(state,nan).done,true);
 state=applyOperation(state,{type:'giftPersonEdit',id:nan.id,name:'Nanna',interests:['tea']},parent);
 assert.equal(state.shopping.at(-1).giftFor,'Nanna');
 assert.throws(()=>applyOperation(state,{type:'shoppingAdd',title:'X',person:GIFT,giftPersonId:'gone',quantity:1},parent),/no longer on the list/);
 // Removing someone goes to Recently deleted; their gift keeps the name.
 state=applyOperation(state,{type:'giftPersonRemove',id:nan.id},parent);
 assert.equal(state.giftPeople.length,1);assert.equal(state.bin[0].kind,'giftPerson');assert.equal(state.shopping.at(-1).giftFor,'Nanna');
 // The guide's ideas are checked before they are kept.
 assert.match(giftBrief(ollie),/Ollie, child\nInto: Anime/);
 assert.throws(()=>giftIdeasRequest({personId:'gone'},state),/no longer on the list/);
 const g=cleanGuideIdea({title:' Matcha set ',why:'tea lover',where:'Ippodo',area:'Marunouchi',day:'soon',yen:-5,website:'https://x.example'},()=>'');
 assert.deepEqual([g.title,g.day,g.yen,g.website,g.declare],['Matcha set','',null,'','food']);
 assert.equal(cleanGuideIdea({title:''}),null);
});
