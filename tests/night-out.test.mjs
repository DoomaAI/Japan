import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NIGHT_MOODS,moodsFor,whoFor,nightAnchor,nightShows,nightPlanned,cleanNightOption,rankNight,nightStep} from '../src/night-out-data.js';
import {nightRequest} from '../server/night-out.mjs';
import {ensureFeatures} from '../src/trip-features.js';
import {applyOperation} from '../server/model.mjs';
import {hasDinnerPlan} from '../src/dinner-data.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const src=f=>readFile(new URL(`../${f}`,import.meta.url),'utf8');
const base=()=>ensureFeatures(structuredClone(seed));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};
const DAY='2026-10-01';
test('after dinner: what each person can ask for, and who is coming',()=>{
 assert.deepEqual(NIGHT_MOODS.map(m=>m.id),['nightcap','drink','out','treat']);
 assert.deepEqual(moodsFor(parent).map(m=>m.id),['nightcap','drink','out','treat']);
 assert.deepEqual(moodsFor(child).map(m=>m.id),['treat'],'the boys get the late treat');
 assert.equal(whoFor('nightcap','family'),'adults');assert.equal(whoFor('treat','adults'),'family');
 assert.equal(whoFor('drink','family'),'family');assert.equal(whoFor('out',undefined),'adults');
});
test('after dinner: looks near tonight’s hotel, in the evening, until put away',()=>{
 const state=base();
 assert.match(nightAnchor(state,DAY).label,/Hilton/);
 assert.equal(nightShows(state,DAY,DAY,'18:30'),true);
 assert.equal(nightShows(state,DAY,DAY,'18:29'),false);assert.equal(nightShows(state,DAY,DAY,'23:30'),false);
 assert.equal(nightShows(state,DAY,DAY,'20:00',true),false,'dismissed on this phone');
 assert.equal(nightShows(state,DAY,'2099-01-01','20:00'),false,'only on the day itself');
});
test('after dinner: a request is checked, and a child can only ask for a treat',()=>{
 const state=base();
 assert.deepEqual(nightRequest({day:DAY,mood:'drink',who:'family',want:'  sake  '},state,parent),{day:DAY,mood:NIGHT_MOODS[1],want:'sake',who:'family'});
 assert.throws(()=>nightRequest({day:DAY,mood:'drink'},state,child),e=>e.status===403);
 assert.equal(nightRequest({day:DAY,mood:'treat'},state,child).who,'family');
 assert.throws(()=>nightRequest({day:DAY,mood:'karaoke'},state,parent),/what you are after/);
 assert.throws(()=>nightRequest({day:'2099-01-01',mood:'treat'},state,parent),/trip day/);
 assert.equal(nightRequest({day:DAY,mood:'out',want:'x'.repeat(200)},state,parent).want.length,80);
});
test('after dinner: what comes back is checked, and with the boys only places that let them in',()=>{
 const o=cleanNightOption({title:' Bar One ',kind:'whisky bar',walkMinutes:4,vibe:'loud',kidsWelcome:'yes',nonSmoking:true,cover:'¥1,000',pay:'cash',rating:4.6,ratingCount:5,website:'https://bad.example'},()=>'');
 assert.equal(o.title,'Bar One');assert.equal(o.vibe,'relaxed');assert.equal(o.kidsWelcome,false);assert.equal(o.rating,null,'too few votes');assert.equal(o.website,'');assert.equal(o.pay,'cash');
 assert.equal(cleanNightOption({title:''}),null);
 const list=[{title:'Far',walkMinutes:15,kidsWelcome:true,nonSmoking:true},{title:'Near',walkMinutes:2,kidsWelcome:false},{title:'Mid',walkMinutes:8,kidsWelcome:true,nonSmoking:false}];
 assert.deepEqual(rankNight(list,'adults').map(o=>o.title),['Near','Mid','Far']);
 assert.deepEqual(rankNight(list,'family').map(o=>o.title),['Far','Mid']);
});
test('after dinner: a place goes on the plan as an optional stop, and the card says so',()=>{
 let state=base();
 const step=nightStep(state,DAY,'nightcap',{title:'Lounge Bar',area:'Hilton Tokyo, 1F',japanese:'',kind:'hotel bar',why:'Two minutes from the room.',cover:'¥500',pay:'card',openNote:'Last orders about 23:30'},'21:15','adults');
 assert.equal(step.kind,'optional');assert.equal(step.title,'Nightcap: Lounge Bar');assert.equal(step.time,'21:15');
 assert.deepEqual(step.participants,['Damien','Lauren'],'a nightcap is the grown-ups’');
 assert.match(step.notes,/Cover charge: ¥500/);assert.match(step.notes,/skip it if we are tired/);
 state=applyOperation(state,{type:'add',step},parent);
 assert.equal(nightPlanned(state,DAY).length,1);
 // A late treat is everyone's, and is not taken for dinner.
 const treat=nightStep(state,DAY,'treat',{title:'Parfait Café',area:'Shinjuku'},null,'family');
 assert.deepEqual(treat.participants,state.members);assert.equal(treat.time,'19:30');
 const withTreat=applyOperation(state,{type:'add',step:treat},parent);
 assert.equal(hasDinnerPlan(withTreat,DAY),hasDinnerPlan(state,DAY),'a treat does not hide the dinner card');
 // A drink with the boys along includes them.
 assert.deepEqual(nightStep(state,DAY,'drink',{title:'Beer Hall'},null,'family').participants,state.members);
});
test('after dinner: wired up on Home, the server and the config',async()=>{
 const main=await src('src/main.jsx'),handler=await src('server/handler.mjs'),widgets=await src('src/home-widgets.js'),card=await src('src/NightOut.jsx');
 assert.match(main,/nightout:<NightOut key=\{`nightout-\$\{day\}`\}/);
 assert.match(widgets,/nightout:\{label:'After dinner'/);
 assert.match(handler,/route==='night-out'&&post/);assert.match(handler,/nightOut:nightOutReady\(\)/);
 assert.match(card,/Add as an option/);assert.match(card,/request\('night-out',\{day,mood,who:going,want\}\)/);
});
