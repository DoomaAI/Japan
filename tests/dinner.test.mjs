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
