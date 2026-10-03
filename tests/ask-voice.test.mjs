import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures} from '../src/trip-features.js';
import {cleanDraft,draftPreview} from '../src/day-check.js';
import {confirmReply,englishVoice,sayTime,speechChunks,spokenAnswer} from '../src/ask-voice.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};
const fresh=()=>ensureFeatures(structuredClone(seed));
const ramen={stepId:'',action:'add',day:'2026-10-03',time:'12:30',title:'Ramen at Ichiran Harajuku',place:'Ichiran Harajuku',minutes:45};

test('a draft can add a new stop to a day, checked like any other change',()=>{
 const state=fresh();
 const draft=cleanDraft({summary:'Ramen for lunch',changes:[ramen,{...ramen,time:'12:45'},
  {...ramen,title:'   '},{...ramen,title:'Somewhere',day:'2099-01-01'},{...ramen,title:'Breakfast',day:'2026-10-03'}]},state);
 assert.deepEqual(draft.changes,[{id:'add-1',action:'add',day:'2026-10-03',time:'12:30',title:'Ramen at Ichiran Harajuku',place:'Ichiran Harajuku',minutes:45}],
  'one per name and day; no name, no trip day, or a stop already there by that name, and it is dropped');
 assert.equal(cleanDraft({changes:[{...ramen,minutes:0,time:'late'}]},state).changes[0].minutes,60,'no length given means an hour');
 assert.equal(cleanDraft({changes:[{...ramen,time:'late'}]},state).changes[0].time,null);
 const {rows,conflicts,stale}=draftPreview(state,draft);
 assert.equal(rows[0].action,'add');assert.equal(rows[0].from,null);assert.equal(stale,false);assert.deepEqual(conflicts,[]);
 // Into the booked Giants game, said plainly and refused when applied.
 const clash=cleanDraft({changes:[{...ramen,time:'17:50'}]},state);
 assert.match(draftPreview(state,clash).conflicts[0],/Ramen at Ichiran Harajuku at 17:50 would run into Giants vs DeNA/);
 assert.throws(()=>applyOperation(state,{type:'askDraftApply',changes:clash.changes},parent),/Giants vs DeNA/);
});

test('a parent applies an added stop with a move in one go; applied once, it is not added twice',()=>{
 let state=fresh();
 const draft=cleanDraft({summary:'Ramen for lunch, Tamagotchi after',changes:[ramen,{stepId:'2026-10-03-09',action:'move',day:'2026-10-03',time:'13:30',title:'',place:'',minutes:0}]},state);
 assert.equal(draft.changes.length,2);
 assert.throws(()=>applyOperation(state,{type:'askDraftApply',changes:draft.changes},child),/parent/);
 const after=applyOperation(state,{type:'askDraftApply',changes:draft.changes},parent);
 const added=after.steps.find(s=>s.title==='Ramen at Ichiran Harajuku');
 assert.ok(added?.id&&added.id!=='add-1','a real stop with its own id');
 assert.deepEqual([added.day,added.time,added.duration,added.place,added.kind,added.status,added.locked],['2026-10-03','12:30',45,'Ichiran Harajuku','flexible','todo',false]);
 const order=after.steps.filter(s=>s.day==='2026-10-03').sort((a,b)=>a.order-b.order).map(s=>s.title);
 assert.equal(order[order.indexOf('Savoury lunch')+1],'Ramen at Ichiran Harajuku','slotted in by its time');
 assert.equal(after.steps.find(s=>s.id==='2026-10-03-09').time,'13:30');
 assert.ok(draftPreview(after,draft).stale,'the same draft is overtaken once applied');
 assert.throws(()=>applyOperation(after,{type:'askDraftApply',changes:draft.changes},parent),/moved on/);
 state=applyOperation(after,{type:'askKeep',item:{id:'q9',at:'2026-10-01T09:00:00.000Z',question:'Add ramen?',draft}},parent);
 assert.equal(state.askThread[0].draft,undefined,'kept for the other parent only while it can still apply');
});

test('Ask can be asked out loud, and only a parent gets a change to say yes to',async()=>{
 const {normaliseAnswer,SPOKEN}=await import('../server/ask.mjs');
 const state=fresh();
 const found={verdict:'Yes, at half past twelve.',answer:'Lunch is free then.',because:[],days:[],checkFirst:'',sources:[],draft:{summary:'Ramen',changes:[ramen]}};
 assert.equal(normaliseAnswer(found,state,parent).draft.changes[0].title,'Ramen at Ichiran Harajuku');
 assert.equal(normaliseAnswer(found,state,child).draft,undefined);
 assert.match(SPOKEN,/read back/);
});

test('the answer is read back as speech, and a change is put as a question only when it can be applied',()=>{
 const state=fresh();
 const draft=cleanDraft({summary:'Ramen',changes:[ramen,{stepId:'2026-10-03-11',action:'skip'}]},state);
 const item={verdict:'Yes.',answer:'Lunch is free then.',draft,checkFirst:''};
 const offered=spokenAnswer(item,{offer:true,preview:draftPreview(state,draft)});
 assert.match(offered,/^Yes\. Lunch is free then\. The change is to add Ramen at Ichiran Harajuku on Saturday at half past 12 in the afternoon and skip THE MATCHA TOKYO\. Shall I make that change\? Say yes or no\.$/);
 const clash=cleanDraft({changes:[{...ramen,time:'17:50'}]},state);
 const blocked=spokenAnswer({answer:'Go before the game.',draft:clash},{offer:false,preview:draftPreview(state,clash)});
 assert.match(blocked,/not ready to apply: .*Giants vs DeNA/);assert.doesNotMatch(blocked,/Shall I/);
 assert.equal(spokenAnswer({verdict:'Do it tomorrow',answer:'Do it tomorrow morning, before the rain.'}),'Do it tomorrow morning, before the rain.','the verdict is not said twice');
 assert.equal(sayTime('09:00'),'9 o’clock in the morning');assert.equal(sayTime('12:00'),'midday');assert.equal(sayTime('19:15'),'7:15 in the evening');
});

test('only a plain yes is a yes',()=>{
 for(const yes of ['Yes','yeah','Yes please.','OK','okay do it','go ahead','Apply it'])assert.equal(confirmReply(yes),'yes',yes);
 for(const no of ['No','nope','No thanks','leave it','not now','cancel'])assert.equal(confirmReply(no),'no',no);
 for(const neither of ['','yes but move the garden instead','what time is the game','yesterday was great','now add ramen'])assert.equal(confirmReply(neither),null,neither);
});

test('long answers go out a few sentences at a time, in an English voice',()=>{
 const chunks=speechChunks('One. '.repeat(100),40);
 assert.ok(chunks.length>5&&chunks.every(c=>c.length<=40));
 assert.equal(chunks.join(' ').split('One.').length-1,100,'nothing lost');
 assert.equal(englishVoice([{lang:'ja-JP'},{lang:'en-US',name:'us'},{lang:'en_AU',name:'au'}]).name,'au');
 assert.equal(englishVoice([{lang:'ja-JP'},{lang:'en-US',name:'us'}]).name,'us');
 assert.equal(englishVoice([{lang:'ja-JP'}]),null);
});

test('the assistant is a button on every page, switched on by default and off per person',async()=>{
 const {DEFAULTS,SETTINGS}=await import('../src/settings.js');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.equal(DEFAULTS.voiceAssistant,true);
 assert.equal(SETTINGS.find(s=>s.id==='voiceAssistant').group,'assistant');
 // One way in to type or say anything, on every page but Ask and under no sheet. Where Ask works
 // it is the Concierge's bell; elsewhere it only finds. Put away, the top bar's magnifier returns.
 assert.match(main,/const canAsk=!!\(config\?\.ask&&isAvailable\('ask'\)\);\n const conciergeButton=!!\(user&&settingOn\(settings,'voiceAssistant'\)\);/);
 assert.match(main,/\{conciergeButton&&tab!=='ask'&&!modal&&<ConciergeButton canAsk=\{canAsk\} open=\{listen=>setModal\(\{type:'assistant',listen\}\)\}\/>\}/,'not over Ask or a sheet');
 assert.match(main,/\{!conciergeButton&&<button className="icon top-search" aria-label="Search everything"/,'the magnifier only when the corner button is put away');
 assert.match(main,/modal\.type==='assistant'&&<AskTrip assistant canAsk=\{canAsk\} listen=\{!!modal\.listen\} find=/);
 assert.match(main,/className="assistant-fab" aria-label=\{canAsk\?'Concierge[^']*':'Find[^']*'\}[\s\S]*?\{canAsk\?<><ConciergeBell size=\{24\}\/><span className="assistant-fab-mic"[^\n]*:<Search size=\{24\}\/>\}/,'the bell with the microphone on it, or a magnifier where it only finds');
 // A tap opens it to type; held, a deep link or the AirPods open it listening.
 assert.match(main,/setTimeout\(\(\)=>\{fired\.current=true;open\(true\);\},450\)/);
 assert.match(main,/action\.type==='concierge'\)setModal\(\{type:'assistant',listen:true\}\)/);
 assert.match(main,/if\(!open\)setModal\(\{type:'assistant',listen:true\}\)/);
 const ask=await readFile(new URL('../src/AskTrip.jsx',import.meta.url),'utf8');
 assert.match(ask,/autoStart=\{assistant&&listen\}/);
 assert.match(ask,/<FindResults state=\{state\} user=\{user\} query=\{question\}/,'names found as the box is typed in');
});
