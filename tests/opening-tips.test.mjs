import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {TIP_KEY,readTips,writeTips,cleanTips,toggleTip,showsFacts,showsWords,showsTips} from '../src/opening-tips.js';
import {TIPS,TIP_GROUPS,allTips,tipsForDay} from '../src/tip-data.js';

const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};
const ALL=['facts','words','tips'];

test('the opening tips default to all three kinds, and keep a choice on this phone',()=>{
 const store=memory();
 assert.deepEqual(readTips(store),ALL);
 assert.deepEqual(writeTips(['tips','words'],store),['words','tips']);
 assert.equal(store.getItem(TIP_KEY),'words,tips');
 assert.deepEqual(readTips(store),['words','tips']);
 assert.deepEqual(writeTips([],store),[]);
 assert.equal(store.getItem(TIP_KEY),'off');
 assert.deepEqual(readTips(store),[]);
 // Anything unknown falls back rather than leaving the screen with no choice made.
 assert.deepEqual(cleanTips('sometimes'),ALL);
 assert.deepEqual(readTips({getItem:()=>{throw new Error('blocked');}}),ALL);
});

test('a choice kept by an earlier version still reads the same way',()=>{
 assert.deepEqual(cleanTips('both'),ALL,'the old default is everything');
 assert.deepEqual(cleanTips('facts'),['facts']);
 assert.deepEqual(cleanTips('words'),['words']);
 assert.deepEqual(cleanTips('off'),[]);
});

test('each kind turns on and off on its own',()=>{
 assert.deepEqual(toggleTip(ALL,'words'),['facts','tips']);
 assert.deepEqual(toggleTip(['facts'],'tips'),['facts','tips']);
 const t=['facts','tips'];
 assert.deepEqual([showsFacts(t),showsWords(t),showsTips(t)],[true,false,true]);
});

test('tips cover far more than manners, and every one is ready to show',()=>{
 const all=allTips();
 assert.ok(all.every(t=>t.id&&t.group&&t.title&&t.icon&&t.text));
 assert.equal(new Set(all.map(t=>t.id)).size,all.length,'every tip has its own id');
 for(const g of ['around','money','phone','boys','food','comfort','manners'])assert.ok(all.some(t=>t.group===TIP_GROUPS[g].label),g);
 assert.ok(all.some(t=>t.title==='At a shrine'),'manners are in there too');
 assert.ok(TIPS.every(t=>TIP_GROUPS[t.group]),'every tip is in a group');
 assert.ok(allTips(true).every(t=>t.text),'a young reader only gets tips written for him');
});

test('a day’s own tips come first: its guide pages, then what its stops call for',()=>{
 const days=[{date:'2026-09-27',pages:[38,39],city:'Nara / Kyoto'},{date:'2026-09-24',pages:[28,29],city:'Kyoto'}];
 const nara=tipsForDay(days,'2026-09-27',[{title:'Todai-ji',place:'Nara'}]);
 assert.equal(nara[0].id,'deer');
 assert.ok(nara.slice(0,4).some(t=>t.title==='At a temple'),'and the temple manners for the stop');
 assert.ok(tipsForDay(days,'2026-09-24',[]).slice(0,4).some(t=>t.id==='usj-breakfast'),'a day-only tip comes on its day');
 assert.ok(!allTips().some(t=>t.id==='usj-breakfast'),'and not on any other');
 assert.equal(tipsForDay(days,'2026-09-27',[{title:'Fushimi Inari Shrine'}],true).find(t=>t.title==='At a shrine').text,'Bow at the big gate.');
});

test('every day of the trip has tips of its own from its guide pages',()=>{
 const seed=JSON.parse(readFileSync(new URL('../data/seed.json',import.meta.url)));
 for(const d of seed.days){
  const own=TIPS.filter(t=>!t.anytime&&d.pages.includes(t.page));
  assert.ok(own.length,`${d.date} has a tip of its own`);
  assert.equal(tipsForDay(seed.days,d.date)[0].id,own[0].id,`${d.date} leads with it`);
 }
 assert.equal(new Set(TIPS.map(t=>t.id)).size,TIPS.length);
 assert.ok(TIPS.every(t=>t.title&&t.text&&t.title.length<=32),'headlines stay short enough for the card');
});
