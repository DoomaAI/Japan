import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {guideOf,guidePrompt,guideMemory,cleanGuideName,withGuide,GUIDE_DEFAULT} from '../src/guide-data.js';
import {photosToFeed,recordFed,frameKeyView,keyAccess} from '../src/frame-mail-data.js';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures} from '../src/trip-features.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const src=f=>readFile(new URL(`../${f}`,import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
test('the guide: a default name and voice, a parent can change them, and a bad one is refused',()=>{
 const state=ensureFeatures(structuredClone(seed));
 assert.deepEqual(guideOf(state),GUIDE_DEFAULT);
 const next=applyOperation(state,{type:'guideSet',name:'  Hana!! ',voice:'brief'},{name:state.members[0],role:'parent'});
 assert.equal(guideOf(next).name,'Hana');assert.equal(guideOf(next).voice,'brief');
 assert.throws(()=>applyOperation(state,{type:'guideSet',name:'X',voice:'shouty'},{name:state.members[0],role:'parent'}));
 assert.throws(()=>applyOperation(state,{type:'guideSet',name:'X',voice:'warm'},{name:'Boston',role:'child'}));
 assert.equal(cleanGuideName('<b>Tabi</b>'),'bTabib');assert.equal(cleanGuideName('A very long guide name indeed').length,20);
});
test('the guide remembers the last days as they went, what was eaten and what was asked',()=>{
 const state=ensureFeatures(structuredClone(seed)),[d1,d2]=state.days;
 const steps=state.steps.filter(s=>s.day===d1.date).slice(0,3);
 state.stepReviews={[steps[0].id]:{ratings:{Damien:5,Nate:5}},[steps[1].id]:{ratings:{Damien:2}}};
 state.steps=state.steps.map(s=>s.id===steps[2].id?{...s,status:'skipped'}:s);
 state.food={ramen:{ratings:{Boston:5}}};state.askThread=[{question:'Is the aquarium worth it?',verdict:'Yes, go early'}];
 const m=guideMemory(state,d2.date);
 assert.match(m,new RegExp(`best: ${steps[0].title.replace(/[()]/g,'.')} \\(5★\\)`));
 assert.match(m,/least: .*\(2★\)/);assert.match(m,new RegExp(`skipped: .*${steps[2].title.slice(0,10).replace(/[()]/g,'.')}`));
 assert.match(m,/Eaten so far: Ramen/);assert.match(m,/aquarium worth it\?” → Yes, go early/);
 assert.equal(guideMemory(ensureFeatures(structuredClone(seed)),'2000-01-01'),'');
 const p=guidePrompt({...state,guide:{name:'Hana',voice:'playful'}},d2.date);
 assert.match(p,/You are Hana/);assert.match(p,/playful/);assert.match(p,/never invent a memory/);
 assert.match(withGuide('SYS',state,d2.date),/^SYS\n\nYou are Tabi/);
});
test('the guide speaks in Ask, Nearby, Suggest and the night-before check, and its name is on each',async()=>{
 const ask=await src('server/ask.mjs');assert.match(ask,/cache_control:CACHE\},\{type:'text',text:guidePrompt\(state,japanDate\(now\)\)\}\]/,'last and uncached');
 for(const f of ['server/nearby.mjs','server/suggest.mjs'])assert.match(await src(f),/system:withGuide\(SYSTEM,state,japanDate\(\)\)/);
 const t=await src('server/tomorrow.mjs');for(const k of ['CHECK','PLANB','MOVE'])assert.match(t,new RegExp(`run\\(withGuide\\(${k}_SYSTEM,state`));
 for(const f of ['src/AskTrip.jsx','src/Nearby.jsx','src/PlanningParty.jsx','src/DayCheck.jsx'])assert.match(await src(f),/<GuideByline state=\{state\}/);
 assert.match(await src('src/Settings.jsx'),/type:'guideSet'/);
});
test('an Apple album frame is fed each new photo once, and only on its own key',async()=>{
 const days=[{date:'2026-11-01',city:'Tokyo',title:'A'},{date:'2026-11-02',city:'Tokyo',title:'B'}];
 const state={...structuredClone(seed),days,members:['Mum'],photos:[{id:'p1',day:'2026-11-01',pathname:'x',by:'Mum',frame:true},{id:'p2',day:'2026-11-02',pathname:'y',by:'Mum',frame:true}],
  frameKeys:[{id:'f1',label:'TV',kind:'album',key:'b'.repeat(64)}]};
 const frame=state.frameKeys[0];
 assert.deepEqual(photosToFeed(state,frame,'2026-11-02').map(p=>p.id),['p1','p2']);
 const fed=recordFed(state,'f1',['p1'],'t');assert.deepEqual(photosToFeed(fed,fed.frameKeys[0],'2026-11-02').map(p=>p.id),['p2']);
 assert.deepEqual(photosToFeed(fed,fed.frameKeys[0],'2026-11-02',{all:true}).map(p=>p.id),['p1','p2']);
 assert.deepEqual(frameKeyView(fed.frameKeys[0]),{id:'f1',label:'TV',kind:'album',createdAt:undefined,createdBy:'',fedAt:'t',fed:1});
 assert.equal(keyAccess(state,'b'.repeat(64),hash).kind,'frame');
 const h=await src('server/handler.mjs');
 assert.match(h,/route==='frame-feed'&&req\.method==='GET'\)\{\n\s*const key=.*\n\s*if\(access\?\.kind!=='frame'\)throw/);
 assert.match(h,/action==='restart'/);
});
