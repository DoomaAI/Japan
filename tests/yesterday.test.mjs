import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {yesterdayLog,dayBefore} from '../src/yesterday-data.js';
const state={days:[{date:'2026-09-24',title:'Asakusa'},{date:'2026-09-25',title:'Disney'}],choices:{},steps:[
 {id:'a',day:'2026-09-24',order:1,status:'done',participants:['Lauren','Boston']},
 {id:'b',day:'2026-09-24',order:2,status:'todo',time:'14:00',participants:['Lauren']},
 {id:'c',day:'2026-09-24',order:3,status:'started',participants:['Boston']},
 {id:'d',day:'2026-09-24',order:4,status:'skipped',participants:['Boston']},
 {id:'e',day:'2026-09-25',order:1,status:'todo',participants:['Boston']}]};
test('the day before crosses a month end',()=>{assert.equal(dayBefore('2026-10-01'),'2026-09-30');});
test('log yesterday lists the stops left open the day before, done and skipped ones aside',()=>{
 const log=yesterdayLog(state,'Lauren',true,'2026-09-25');
 assert.equal(log.day,'2026-09-24');assert.equal(log.title,'Asakusa');
 assert.deepEqual(log.open.map(s=>s.id),['b','c']);
});
test('anyone but a parent is asked only about the stops they were on',()=>{
 assert.deepEqual(yesterdayLog(state,'Boston',false,'2026-09-25').open.map(s=>s.id),['c']);
});
test('nothing to log when yesterday was not a trip day, or is all ticked off',()=>{
 assert.equal(yesterdayLog(state,'Lauren',true,'2026-09-24'),null);
 assert.equal(yesterdayLog(state,'Nate',false,'2026-09-25'),null);
});
test('the line sits on Home above the cards and is dismissed for the day on this phone',async()=>{
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/<YesterdayLine key=\{japanDate\(now\)\}/);
 const line=await readFile(new URL('../src/YesterdayLine.jsx',import.meta.url),'utf8');
 assert.match(line,/japan\.yesterday\.\$\{user\?\.name\}\.\$\{today\}/);
});
