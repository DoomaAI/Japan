import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {applyOperation} from '../server/model.mjs';
import {pendingProgress,proposalStepNotes,rankedProposals} from '../src/trip-features.js';
import {splitRecommendations,matchProposal,recommenderList,recommendedProposals,placeKey,forwardedSender,handRecommendation,peekRecommendation,clearRecommendation} from '../src/recommend-data.js';
import {deepLinkAction,withoutDeepLink,DEEP_LINKS} from '../src/deep-links.js';
import {readRecommendations} from '../server/recommend.mjs';
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

test('each name says how the recommendation reached us, and a made-up channel is refused',()=>{
 let state=applyOperation(seed,{type:'proposalRecommend',name:'Sue',via:'email',title:'Kiyomizu-dera'},parent);
 assert.equal(state.proposals.at(-1).recommendedBy[0].via,'email');
 state=applyOperation(state,{type:'proposalRecommend',name:'Sue',said:'And the sesame ice cream',title:'kiyomizu dera'},parent);
 assert.equal(state.proposals.at(-1).recommendedBy[0].via,'message','the latest way she told us');
 assert.throws(()=>applyOperation(seed,{type:'proposalRecommend',name:'Sue',via:'pigeon',title:'X'},parent),/how the recommendation reached us/);
});
test('a forwarded email is credited to whoever first sent it, not to the parent who forwarded it',()=>{
 const gmail='Thought you would like these!\n\n---------- Forwarded message ---------\nFrom: Sue Pasfield <sue@example.com>\nDate: Mon\n\nNara: buy the crackers';
 assert.equal(forwardedSender(gmail,'Damien <damien@example.com>'),'Sue Pasfield');
 assert.equal(forwardedSender('Begin forwarded message:\n\nFrom: tom.b@work.example\nSubject: Japan'),'tom.b');
 assert.equal(forwardedSender('Go to Nara','"Pop" <pop@example.com>'),'Pop','sent straight to the trip address');
 assert.equal(forwardedSender('Go to Nara',''),'');
});
test('a tip shared from a phone opens the recommendations, from a Shortcut or from Android share',()=>{
 const link=DEEP_LINKS.find(l=>l.id==='recommend');
 assert.equal(link.path,'/?open=recommend&text=');
 assert.deepEqual(deepLinkAction('?open=recommend&text=Ichiran%20-%20solo%20booths&from=Tom'),{type:'recommend',text:'Ichiran - solo booths',from:'Tom'});
 assert.deepEqual(deepLinkAction('?share_title=Nara&share_text=Nara%20deer%20park&share_url=https%3A%2F%2Fnara.example'),{type:'recommend',text:'Nara\nNara deer park\nhttps://nara.example',from:''});
 assert.equal(withoutDeepLink('?share_text=a&share_url=b&tab=planning'),'/?tab=planning');
 const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url)));
 assert.deepEqual(manifest.share_target.params,{title:'share_title',text:'share_text',url:'share_url'});
});
test('a hand-off to the panel survives being read twice and is gone once cleared',()=>{
 handRecommendation({from:'Sue',text:'Nara',via:'email',inboxId:'i1'});
 assert.equal(peekRecommendation().inboxId,'i1');assert.equal(peekRecommendation().via,'email');
 clearRecommendation();assert.equal(peekRecommendation(),null);
 assert.equal(handRecommendation({text:'x',via:'carrier pigeon'}).via,'message');
});
test('screenshots are checked before anything is sent to be read',async()=>{
 const key=process.env.ANTHROPIC_API_KEY;process.env.ANTHROPIC_API_KEY='test';
 try{
  await assert.rejects(readRecommendations({text:''}),/Paste the message or add a screenshot/);
  await assert.rejects(readRecommendations({images:Array.from({length:5},()=>({image:'AAAA',mediaType:'image/jpeg'}))}),/Up to 4/);
  await assert.rejects(readRecommendations({images:[{image:'AAAA',mediaType:'image/gif'}]}),/JPEG, PNG or WebP/);
  await assert.rejects(readRecommendations({images:[{image:'not base64!',mediaType:'image/png'}]}),/could not be read/);
 }finally{if(key===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=key;}
});
