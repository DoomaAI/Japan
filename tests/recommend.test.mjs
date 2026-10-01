import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyOperation} from '../server/model.mjs';
import {pendingProgress,proposalStepNotes,rankedProposals} from '../src/trip-features.js';
import {splitRecommendations,matchProposal,recommenderList,recommendedProposals,placeKey} from '../src/recommend-data.js';
import {normaliseRecommendations} from '../server/recommend.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};

test('a pasted message splits into one recommendation a line, with the tip kept and the chat left out',()=>{
 const items=splitRecommendations(`Hi guys!! So jealous.
- Ichiran Ramen - get the solo booth
2. Nishiki Market: go before 10, it gets packed
• teamLab Planets
Have a great trip xx
Did you book Ghibli yet?
- ichiran ramen`);
 assert.deepEqual(items.map(i=>i.title),['Ichiran Ramen','Nishiki Market','teamLab Planets']);
 assert.equal(items[0].said,'get the solo booth');
 assert.equal(items[1].said,'go before 10, it gets packed');
});
test('the same place is matched however it is written, and a short name does not match by accident',()=>{
 const board=[{id:'a',title:'teamLab Planets Toyosu'},{id:'b',title:'Ichiran Ramen (Shibuya)'},{id:'c',title:'Zoo'}];
 assert.equal(matchProposal(board,'TeamLab Planets')?.id,'a');
 assert.equal(matchProposal(board,'ichiran ramen')?.id,'b');
 assert.equal(matchProposal(board,'Ueno Zoo'),null);
 assert.equal(placeKey('The Ghibli Museum!'),'ghibli museum');
});
test('a recommendation puts a new idea up, and the same place again adds a name rather than a copy',()=>{
 let state=applyOperation(seed,{type:'proposalRecommend',name:'Aunty Sue',said:'Go early',title:'Fushimi Inari',place:'Kyoto',category:'place'},child);
 const p=state.proposals.at(-1);
 assert.equal(p.source,'recommended');assert.equal(p.addedBy,'Nate');
 assert.deepEqual(p.recommendedBy.map(r=>[r.name,r.said,r.by]),[['Aunty Sue','Go early','Nate']]);
 assert.match(state.alerts[0].summary,/Aunty Sue's recommendation, Fushimi Inari/);
 const count=state.proposals.length;
 state=applyOperation(state,{type:'proposalRecommend',name:'Tom',said:'Hike to the top',title:'fushimi inari'},parent);
 state=applyOperation(state,{type:'proposalRecommend',name:'aunty sue',said:'Really, go early',title:'Fushimi Inari'},parent);
 assert.equal(state.proposals.length,count,'no second copy');
 const merged=state.proposals.at(-1);
 assert.deepEqual(merged.recommendedBy.map(r=>[r.name,r.said]),[['Tom','Hike to the top'],['aunty sue','Really, go early']]);
 assert.deepEqual(recommenderList(state.proposals).map(r=>[r.name,r.ideas.length]),[['aunty sue',1],['Tom',1]]);
 assert.equal(recommendedProposals(state.proposals)[0].id,merged.id);
 // Searching the board for a name finds what they recommended, and the notes carry it onto the day.
 assert.ok(rankedProposals(state,{query:'tom'}).some(x=>x.id===merged.id));
 assert.match(proposalStepNotes(merged),/Recommended by Tom: Hike to the top/);
 // Votes and editing leave the names alone.
 state=applyOperation(state,{type:'proposalEdit',id:merged.id,title:'Fushimi Inari Taisha',source:'recommended'},parent);
 assert.equal(state.proposals.at(-1).recommendedBy.length,2);assert.equal(state.proposals.at(-1).source,'recommended');
});
test('a name comes off only for whoever put it there or a parent, and bad input is refused',()=>{
 let state=applyOperation(seed,{type:'proposalRecommend',name:'Pop',title:'Railway Museum'},parent);
 const id=state.proposals.at(-1).id;
 assert.throws(()=>applyOperation(state,{type:'proposalRecommend',id,name:'Pop',remove:true},child),e=>e.status===403);
 state=applyOperation(state,{type:'proposalRecommend',id,name:'Pop',remove:true},parent);
 assert.deepEqual(state.proposals.at(-1).recommendedBy,[]);
 for(const bad of [{name:'',title:'X'},{name:'Pop',title:'  '},{name:'x'.repeat(81),title:'X'},{name:'Pop',title:'X',said:'y'.repeat(501)},{name:'Pop',title:'X',category:'nonsense'}])
  assert.throws(()=>applyOperation(seed,{type:'proposalRecommend',...bad},parent));
});
test('a recommendation made with no signal shows on the board at once, merged the same way',()=>{
 const base=applyOperation(seed,{type:'proposalAdd',title:'Nara deer park'},parent);
 const queue=[{operationId:'q1',type:'proposalRecommend',person:'Lauren',name:'Grandma',said:'Buy the crackers',title:'nara deer park',at:'2026-10-01T01:00:00.000Z'},
  {operationId:'q2',type:'proposalRecommend',person:'Lauren',name:'Grandma',title:'Kobe beef lunch',at:'2026-10-01T01:00:00.000Z'}].map(operation=>({operation,live:false}));
 const shown=pendingProgress(base,queue);
 assert.equal(shown.proposals.length,base.proposals.length+1);
 assert.equal(shown.proposals.find(p=>p.title==='Nara deer park').recommendedBy[0].said,'Buy the crackers');
 assert.equal(shown.proposals.at(-1).source,'recommended');
});
test('what the model reads out of a message is cut to size and checked',()=>{
 const items=normaliseRecommendations([{title:'  Katsu sando ',place:'Tokyo Station',category:'food',said:'x'.repeat(900)},{title:'',category:'food'},{title:'Odd',category:'bogus',said:''}]);
 assert.equal(items.length,2);assert.equal(items[0].title,'Katsu sando');assert.equal(items[0].said.length,500);assert.equal(items[1].category,'place');
});
