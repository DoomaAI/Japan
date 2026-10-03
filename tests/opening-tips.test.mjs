import test from 'node:test';
import assert from 'node:assert/strict';
import {TIP_KEY,readTips,writeTips,cleanTips,toggleTip,showsFacts,showsWords,showsEtiquette} from '../src/opening-tips.js';
import {ALL_ETIQUETTE,etiquetteForDay} from '../src/etiquette-data.js';

const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};
const ALL=['facts','words','etiquette'];

test('the opening tips default to all three kinds, and keep a choice on this phone',()=>{
 const store=memory();
 assert.deepEqual(readTips(store),ALL);
 assert.deepEqual(writeTips(['etiquette','words'],store),['words','etiquette']);
 assert.equal(store.getItem(TIP_KEY),'words,etiquette');
 assert.deepEqual(readTips(store),['words','etiquette']);
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
 assert.deepEqual(toggleTip(ALL,'words'),['facts','etiquette']);
 assert.deepEqual(toggleTip(['facts'],'etiquette'),['facts','etiquette']);
 const t=['facts','etiquette'];
 assert.deepEqual([showsFacts(t),showsWords(t),showsEtiquette(t)],[true,false,true]);
});

test('etiquette tips put the day’s own stops first, in the boys’ words for a boy',()=>{
 const all=ALL_ETIQUETTE();
 assert.ok(all.length>20&&all.every(t=>t.id&&t.label&&t.icon&&t.text));
 assert.equal(new Set(all.map(t=>t.id)).size,all.length,'every tip has its own id');
 const day=etiquetteForDay([{title:'Fushimi Inari Shrine',place:'Kyoto'}],'Kyoto');
 assert.equal(day[0].label,'At a shrine');
 assert.equal(day.length,all.length,'the rest of the book follows, nothing twice');
 const young=etiquetteForDay([{title:'Fushimi Inari Shrine'}],'',true);
 assert.equal(young[0].text,'Bow at the big gate.');
});
