import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {hasDinnerPlan,dinnerAnchors,dinnerShows,reservationMessage,cleanDinnerOption,rankDinner} from '../src/dinner-data.js';
import {ensureFeatures} from '../src/trip-features.js';
import {activeSteps} from '../src/timing.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const src=f=>readFile(new URL(`../${f}`,import.meta.url),'utf8');
const base=()=>ensureFeatures(structuredClone(seed));
// A day of the seed with a hotel, its dinner stops taken off so there is nothing planned.
function noDinnerDay(){
 const state=base();
 const day=state.days.find(d=>d.hotel&&activeSteps(state,d.date).length>2&&state.days.at(-1).date!==d.date).date;
 state.steps=state.steps.filter(s=>!(s.day===day&&/dinner|supper|izakaya|yakiniku/i.test(`${s.title} ${s.notes||''}`))).map(s=>s.day===day&&/^(16|17|18|19|20|21)/.test(s.time||'')&&/food|eat|restaurant/i.test(s.title)?{...s,status:'skipped'}:s);
 return {state,day};
}
test('dinner: only on a day with no dinner on the plan, from four, and not once put away',()=>{
 const {state,day}=noDinnerDay();
 if(hasDinnerPlan(state,day))state.steps=state.steps.map(s=>s.day===day&&s.category==='food'?{...s,status:'skipped'}:s);
 assert.equal(hasDinnerPlan(state,day),false);
 assert.equal(dinnerShows(state,day,day,'16:05'),true);
 assert.equal(dinnerShows(state,day,day,'15:59'),false);assert.equal(dinnerShows(state,day,day,'21:45'),false);
 assert.equal(dinnerShows(state,day,day,'17:00',true),false,'dismissed on this phone');
 assert.equal(dinnerShows(state,day,'2099-01-01','17:00'),false,'only on the day itself');
 const planned={...state,steps:[...state.steps,{...state.steps.find(s=>s.day===day),id:'dn',title:'Dinner: Gyukatsu Motomura',time:'18:00',status:'todo',order:999}]};
 assert.equal(hasDinnerPlan(planned,day),true);assert.equal(dinnerShows(planned,day,day,'17:00'),false,'gone once dinner is planned');
 const lunch={...state,steps:[...state.steps,{...state.steps.find(s=>s.day===day),id:'ln',title:'Lunch at the food hall',time:'12:00',category:'food',status:'todo',order:998}]};
 assert.equal(hasDinnerPlan(lunch,day),false,'lunch is not dinner');
});
test('dinner: looks near the last real stop and the hotel',()=>{
 const {state,day}=noDinnerDay(),a=dinnerAnchors(state,day);
 assert.ok(a.length>=1&&a.length<=2);assert.ok(a.some(x=>x.id==='hotel'));
 const last=a.find(x=>x.id==='last');if(last)assert.ok(state.steps.find(s=>s.id===last.stepId));
});
test('dinner: the booking message is the app’s own Japanese, with the English beside it',()=>{
 const m=reservationMessage({time:'18:30',name:'Lauren'});
 assert.match(m.ja,/本日18:30から4名（大人2名・子ども2名、8歳と5歳）/);assert.match(m.ja,/禁煙席/);assert.match(m.ja,/名前はLaurenです/);
 assert.match(m.en,/table for 4 today from 18:30 \(2 adults and 2 children, aged 8 and 5\)/);
});
test('dinner: what comes back is checked, and family-friendly walk-ins lead',()=>{
 const raw={title:'Saizeriya',japanese:'サイゼリヤ',cuisine:'family restaurant',area:'B1',walkMinutes:4,kidsWelcome:true,nonSmoking:true,booking:'walk-in',channel:'none',menu:'picture',cashOnly:false,cancellation:'',rating:3.9,ratingCount:400,priceBand:'¥',openNote:'',why:'Easy',website:'https://evil.test/x',bookingUrl:''};
 const o=cleanDinnerOption(raw,u=>u.includes('evil')?null:u);assert.equal(o.website,'');assert.equal(o.booking,'walk-in');
 assert.equal(cleanDinnerOption({...raw,booking:'maybe',menu:'x',rating:9}).booking,'unknown');
 assert.equal(cleanDinnerOption({...raw,rating:4.8,ratingCount:3}).rating,null,'too few ratings');
 assert.equal(cleanDinnerOption({...raw,title:''}),null);
 const bar=cleanDinnerOption({...raw,title:'Bar',kidsWelcome:false,nonSmoking:false,rating:4.9});
 const booked=cleanDinnerOption({...raw,title:'Booked',booking:'required'});
 assert.deepEqual(rankDinner([bar,booked,o]).map(x=>x.title),['Saizeriya','Booked','Bar']);
});
test('dinner: a parent asks, the answer is kept on the day for every phone, and the card is on Home',async()=>{
 const h=await src('server/handler.mjs');assert.match(h,/route==='dinner'&&post\)\{\n\s*parent\(user\)/);
 const d=await src('server/dinner.mjs');assert.match(d,/strict:true/);assert.match(d,/withGuide\(SYSTEM/);assert.match(d,/checkedLink/);
 const {HOME_WIDGETS}=await import('../src/home-widgets.js');assert.ok(HOME_WIDGETS.dinner);
 const card=await src('src/DinnerTonight.jsx');assert.match(card,/japan\.dinner\.dismissed\./);assert.match(card,/title:`Dinner: \$\{o\.title\}`/);
 assert.match(await src('src/main.jsx'),/dinner:<DinnerTonight/);
});
test('dinner swipes: each of the family votes once per place, and the matches lead with what everyone wants',async()=>{
 const {applyDinnerVote,dinnerMatches,myDinnerVotes,dinnerOptions}=await import('../src/dinner-data.js');
 const o=t=>({title:t});
 let state={members:['Damien','Lauren','Boston','Nate'],dinner:{d1:{groups:[{anchor:'last',label:'A',options:[o('Sushi'),o('Ramen')]},{anchor:'hotel',label:'H',options:[o('Buffet')]}]}}};
 assert.deepEqual(dinnerOptions(state.dinner.d1).map(x=>x.key),['last:Sushi','last:Ramen','hotel:Buffet']);
 const v=(name,key,vote)=>{const r=applyDinnerVote(state,{day:'d1',key,vote},name);assert.ok(!r.error,r.error);state=r.state;};
 for(const n of state.members)v(n,'last:Sushi','yes');
 v('Damien','hotel:Buffet','yes');v('Lauren','hotel:Buffet','yes');
 v('Damien','last:Ramen','yes');v('Nate','last:Ramen','no');v('Nate','last:Ramen','yes');
 const m=dinnerMatches(state.dinner.d1,state.members);
 assert.equal(m[0].option.title,'Sushi');assert.ok(m[0].everyone);
 assert.deepEqual(m.map(x=>x.option.title),['Sushi','Ramen','Buffet'],'a changed vote counts once; ties fall to fewer noes');
 assert.deepEqual(m[1].waiting,['Lauren','Boston']);
 assert.deepEqual(myDinnerVotes(state.dinner.d1,'Nate'),{'last:Sushi':'yes','last:Ramen':'yes'});
 assert.match(applyDinnerVote(state,{day:'d1',key:'last:Pizza',vote:'yes'},'Nate').error,/not on the card/);
 assert.match(applyDinnerVote(state,{day:'d1',key:'last:Sushi',vote:'yes'},'Stranger').error,/Only the family/);
 assert.match(applyDinnerVote(state,{day:'d1',key:'last:Sushi',vote:'maybe'},'Nate').error,/yes or no/);
 const reset=applyDinnerVote(state,{day:'d1',reset:true},'Nate').state;assert.deepEqual(myDinnerVotes(reset.dinner.d1,'Nate'),{});
 assert.deepEqual(myDinnerVotes(reset.dinner.d1,'Boston'),{'last:Sushi':'yes'});
 const h=await src('server/handler.mjs');assert.match(h,/route==='dinner-swipe'&&post\)\{\n\s*let problem=null;\n\s*const saved=await updateTrip/,'merged onto the latest trip, not refused on a revision');
 const card=await src('src/DinnerTonight.jsx');assert.match(card,/<SuggestDeck items=\{toSwipe\}/);assert.match(card,/opts\.length>1&&!asList/,'only when there is more than one place');
});
