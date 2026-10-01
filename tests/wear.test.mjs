import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures} from '../src/trip-features.js';
import {whatToWear,outHours,walkingLoad,DRESS_RULES} from '../src/wear-data.js';
import {cleanDayCheck} from '../src/day-check.js';
import {activeSteps} from '../src/timing.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'};
const fresh=()=>ensureFeatures(structuredClone(seed));
// A Saturday that starts cool, turns warm, rains mid-afternoon and is cold by the end of the game.
const withHours=(state,day,f)=>({...state,weather:{...state.weather,days:{...state.weather.days,[day]:{city:'Tokyo',code:61,max:26,min:14,rain:70}},
 hours:{...state.weather.hours,[day]:Array.from({length:17},(_,i)=>{const h=i+7;return {h,temp:f(h),feels:null,rain:h>=14&&h<=16?70:10,code:61};})}}});

test('what to wear says when the day turns warm and when it turns cool again, from the hours we are out',()=>{
 const day='2026-10-03';
 const state=withHours(fresh(),day,h=>h<10?15:h<16?26:h<19?20:14);
 const w=whatToWear(state,day);
 assert.deepEqual(outHours(activeSteps(state,day)),[8,22],'from breakfast to the end of the game, not the whole day');
 const layers=w.weather.find(l=>l.id==='layers');
 assert.match(layers.text,/^Cool to start \(15° at 08:00\), warm by 10:00 \(26°\), cooling to 14° by 22:00: layers/);
 assert.match(w.weather.find(l=>l.id==='evening').text,/drops to 14° by 22:00/);
 assert.match(w.weather.find(l=>l.id==='rain').text,/Rain likely 14:00–17:00/);
 assert.match(w.headline,/^Layers, rain gear, your comfiest trainers/);
 assert.deepEqual(w.stops.find(r=>r.id==='night-game').stops,['Giants vs DeNA'],'the booked game is named, not the dinner before it');
 // Hot, and nothing else: no layers line when it barely moves.
 const hot=whatToWear(withHours(fresh(),day,h=>h<11?28:31),day);
 assert.ok(!hot.weather.some(l=>l.id==='layers'));assert.match(hot.weather.find(l=>l.id==='hot').text,/feels 31°/);
 // Without hours, the day's min and max still say something; without either, it says to check.
 const daily=fresh();daily.weather={...daily.weather,days:{[day]:{city:'Tokyo',code:3,max:24,min:15,rain:10}},hours:{}};
 assert.match(whatToWear(daily,day).weather[0].text,/15° at the coolest and 24° at the warmest/);
 assert.equal(whatToWear(fresh(),day).weather[0].id,'no-forecast');
});

test('the shoes follow the walking, and a park day is the biggest of all',()=>{
 const state=fresh();
 assert.equal(walkingLoad(state,'2026-09-30',activeSteps(state,'2026-09-30')).park,true);
 const park=whatToWear(state,'2026-09-30');
 assert.equal(park.load.level,'big');assert.match(park.shoes.text,/theme-park day — often 15,000–20,000 steps: the most comfortable broken-in trainers/);
 const withAge=applyOperation(state,{type:'partyPerson',name:'Nate',age:5},parent);
 assert.match(whatToWear(withAge,'2026-09-30').shoes.text,/Nate will tire well before the end/,'the youngest is named when his age is known');
 assert.ok(!park.stops.find(r=>r.id==='park').stops.some(t=>/leave|forwarding/i.test(t)),'the rule is about the park, not the trip to it');
 assert.ok(!park.stops.some(r=>r.id==='water-trip'),'a ride called a cruise or a river railroad is not a boat');
});

test('stops with dress rules are named with the rule, and the night-before check adds what a venue publishes',()=>{
 let state=fresh();const nara='2026-09-27';
 const w=whatToWear(state,nara);
 assert.ok(w.stops.find(r=>r.id==='temple').stops.includes('Todai-ji and Great Buddha'));
 assert.match(w.headline,/socks for shoes-off/);
 assert.ok(!w.stops.find(r=>r.id==='deer').stops.some(t=>/^Bus/.test(t)),'the bus to the park is not where the deer are');
 for(const [title,id] of [['teamLab Planets','water'],['Onsen at the ryokan','onsen'],['Shibuya Sky at sunset','rooftop'],['Omakase dinner','counter'],['Fushimi Inari hike','steps']])
  assert.ok(DRESS_RULES.find(r=>r.id===id).test.test(title),`${title} → ${id}`);
 const step=activeSteps(state,nara).find(s=>/Todai-ji/.test(s.title));
 state={...state,dayChecks:{[nara]:cleanDayCheck({notes:[{kind:'dress',stepId:step.id,title:'Hall floors are wooden; shoes stay on',detail:'Only the inner sanctum is shoes-off.',act:false,sources:[{title:'Todai-ji',url:'https://www.todaiji.or.jp/'}]}]},state,nara)}};
 const found=whatToWear(state,nara).stops.find(r=>r.id.startsWith('check-'));
 assert.match(found.text,/^Hall floors are wooden; shoes stay on — Only the inner sanctum/);assert.equal(found.source,'https://www.todaiji.or.jp/');
 assert.deepEqual(found.stops,[step.title]);
});

test('what to wear sits in the day in brief, and the check is asked for venue dress rules',async()=>{
 const brief=await readFile(new URL('../src/Briefing.jsx',import.meta.url),'utf8');
 assert.match(brief,/<WhatToWear state=\{state\} day=\{day\}\/>/);
 const server=await readFile(new URL('../server/tomorrow.mjs',import.meta.url),'utf8');
 assert.match(server,/Dress rules a venue publishes for itself/);
});
