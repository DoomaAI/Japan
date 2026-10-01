import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ledgerShopping,dutyFree} from '../src/flying-home.js';
import {showTellFor,showTellSpeech} from '../src/show-tell.js';
import {stampsFor} from '../src/stamp-data.js';
import {frameSound} from '../src/memory-map.js';
import {candidateShots,defaultEditList,cleanEditList,currentEditList,timeline,itemAt,runningTime,highlightsMaterial,MAX_SHOTS} from '../src/highlights-data.js';
import {applyOperation} from '../server/model.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const src=f=>readFile(new URL(`../${f}`,import.meta.url),'utf8');

test('#289 Flying home adds the ledger’s shopping that no list has, and a parent can mark a twin',()=>{
 const state={shopping:[{id:'s1',title:'Pokemon plush toy',boughtAt:'x',budget:3000,day:'2026-11-02'}],expenses:[
  {id:'e1',category:'shopping',title:'Pokemon plush',yen:3000,day:'2026-11-02'},
  {id:'e2',category:'shopping',title:'Kit Kats',yen:1200,day:'2026-11-03'},
  {id:'e3',category:'food',title:'Ramen',yen:2400},
  {id:'e4',category:'shopping',title:'Chopsticks',yen:800,alreadyCounted:true}]};
 const l=ledgerShopping(state);
 assert.deepEqual(l.extra.map(e=>e.id),['e2']);
 assert.deepEqual(l.matched.map(e=>e.id).sort(),['e1','e4']);
 assert.equal(l.yen,1200);
 const d=dutyFree(state);assert.equal(d.yen,3000+1200);assert.equal(d.ledger.yen,1200);
});
test('#289 expenseCounted is a parent’s, and the page offers it',async()=>{
 const state=JSON.parse(JSON.stringify(seed));state.expenses=[{id:'e2',category:'shopping',title:'Kit Kats',yen:1200}];
 const next=applyOperation(state,{type:'expenseCounted',id:'e2',counted:true},{name:state.members[0],role:'parent'});
 assert.equal(next.expenses[0].alreadyCounted,true);
 assert.match(await src('src/FlyingHome.jsx'),/expenseCounted/);
});
test('#290 Show and tell counts the stamp book and says it',()=>{
 const state=JSON.parse(JSON.stringify(seed)),boy=state.members.at(-1),today=state.days.at(-1).date;
 const pack=showTellFor(state,boy,today);
 assert.equal(pack.stamps,stampsFor(state,boy,today).length);
 const speech=showTellSpeech({...pack,stamps:7});
 assert.match(Array.isArray(speech)?speech.join(' '):String(speech),/collected 7 stamps in my stamp book/);
});
test('#286 a replay frame finds the sound postcard recorded at its stop',async()=>{
 const state={voiceNotes:[{id:'v1',kind:'sound',pathname:'voice/a.webm',stepId:'s2'},{id:'v2',kind:'voice',pathname:'voice/b.webm',stepId:'s1'}]};
 assert.equal(frameSound(state,{stepIds:['s1','s2']})?.id,'v1');
 assert.equal(frameSound(state,{stepIds:['s1']}),null);
 for(const f of ['src/TripReplay.jsx','src/Flyover.jsx'])assert.match(await src(f),/frameSound\(.*createMixer|createMixer[\s\S]*frameSound|frameSound[\s\S]*createMixer/);
 assert.match(await src('src/Flyover.jsx'),/getAudioTracks/);
});
const trip={tripName:'Japan 2026',days:[{date:'2026-11-01',city:'Tokyo',title:'Arrive'},{date:'2026-11-02',city:'Tokyo',title:'Shibuya'}],
 steps:[{id:'st1',day:'2026-11-02',title:'Shibuya Crossing'}],
 photos:[{id:'p1',day:'2026-11-01',pathname:'photos/p1.jpg',by:'Boston'},{id:'p2',day:'2026-11-02',pathname:'photos/p2.jpg',by:'Mum'}],
 documents:[{id:'d1',category:'memory',type:'video/mp4',pathname:'tickets/u/d1.mp4',stepId:'st1',title:'The crossing'},
  {id:'d2',category:'memory',type:'application/pdf',pathname:'tickets/u/d2.pdf',day:'2026-11-02'},
  {id:'d3',category:'memory',type:'video/mp4',pathname:'tickets/u/d3.mp4',day:'2026-11-02',tags:['highlights']}],
 voiceNotes:[{id:'v1',kind:'sound',pathname:'voice/v1.webm',stepId:'st1',day:'2026-11-02'}]};
test('highlights: shots are our own photos and clips, never a PDF or the highlights video itself',()=>{
 assert.deepEqual(candidateShots(trip).map(s=>s.ref).sort(),['doc:d1','photo:p1','photo:p2']);
 assert.equal(candidateShots(trip).find(s=>s.ref==='doc:d1').kind,'video');
 assert.deepEqual(highlightsMaterial(trip),{shots:3,images:2,videos:1,sounds:1,days:2,bestOfDay:highlightsMaterial(trip).bestOfDay});
});
test('highlights: the automatic plan opens, has a card per day, lays the sound under its stop, and closes',()=>{
 const l=defaultEditList(trip);
 assert.equal(l.items[0].kind,'title');assert.equal(l.items.at(-1).text,'ありがとう');
 assert.equal(l.items.filter(i=>i.kind==='title').length,4);
 assert.equal(l.items.find(i=>i.ref==='doc:d1').sound,'v1');
 assert.equal(l.items.filter(i=>i.sound).length,1);
});
test('highlights: a plan from Claude is checked — strangers dropped, sounds used once, times kept in reason',()=>{
 const clean=cleanEditList({by:'claude',items:[{kind:'shot',ref:'photo:nope'},{kind:'shot',ref:'photo:p1',seconds:99,sound:'v1'},{kind:'shot',ref:'photo:p2',sound:'v1'},{kind:'shot',ref:'doc:d1',seconds:.2,sound:'vX'},{kind:'zoom'}]},trip);
 assert.deepEqual(clean.items.map(i=>i.ref),['photo:p1','photo:p2','doc:d1']);
 assert.equal(clean.items[0].seconds,5);assert.equal(clean.items[0].sound,'v1');assert.equal(clean.items[1].sound,undefined);
 assert.equal(clean.items[2].seconds,1.5);assert.equal(clean.by,'claude');
 assert.equal(cleanEditList({items:[{kind:'title',text:'Only words'}]},trip),null);
 const many=cleanEditList({items:Array.from({length:60},()=>({kind:'shot',ref:'photo:p1'}))},trip);
 assert.equal(many.items.length,MAX_SHOTS);
});
test('highlights: the kept plan is rechecked against the trip, and the clock finds the item on screen',()=>{
 assert.deepEqual(currentEditList({...trip,highlights:{list:{items:[{kind:'shot',ref:'photo:gone'}]}}}),defaultEditList(trip));
 const line=timeline({items:[{kind:'title',text:'a',seconds:2},{kind:'shot',ref:'photo:p1',seconds:3}]});
 assert.deepEqual(line.map(i=>[i.start,i.end]),[[0,2],[2,5]]);
 assert.equal(itemAt(line,2.5).index,1);assert.equal(itemAt(line,2.5).prev.text,'a');assert.equal(itemAt(line,99).index,1);
 assert.equal(runningTime({items:line}),5);
});
test('highlights: Claude plans on the server for a parent, the phone draws and records with the sounds',async()=>{
 const server=await src('server/highlights.mjs'),handler=await src('server/handler.mjs'),page=await src('src/Highlights.jsx'),main=await src('src/main.jsx');
 assert.match(server,/strict:true/);assert.match(server,/cleanEditList/);assert.match(server,/defaultEditList\(state\)/);
 assert.match(handler,/route==='highlights-plan'&&post\)\{\n\s*parent\(user\)/);
 assert.match(page,/captureStream/);assert.match(page,/getAudioTracks/);assert.match(page,/createMixer/);
 assert.match(main,/tab==='highlights'&&<Highlights/);
 assert.match(await src('src/RecapStory.jsx'),/go\('highlights'\)/);
});
