import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures,factQueue} from '../src/trip-features.js';
import {ALL_FACTS,gentleFacts} from '../src/fact-data.js';
import {gentleOnly} from '../src/child-levels.js';
import {kanaRun,readingBump,BUMP_RUN} from '../src/level-nudge.js';
import {puzzleFor,puzzleKey} from '../src/puzzle-data.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Lauren',role:'parent'};
const fresh=()=>ensureFeatures(structuredClone(seed));

test('a boy who is always with a grown-up gets only the gentle facts, everywhere they are shown',async()=>{
 let state=fresh();
 const grim=ALL_FACTS().filter(f=>f.gentle===false).map(f=>f.id).sort();
 assert.deepEqual(grim,['chopsticks','hachiko','tokyo-station'],'a death, a bombing, a funeral');
 assert.equal(gentleOnly(state,'Nate'),true);assert.equal(gentleOnly(state,'Boston'),false);assert.equal(gentleOnly(state,'Damien'),false);
 for(const day of state.days.map(d=>d.date))assert.ok(!factQueue(state,'Nate',day).some(f=>f.gentle===false));
 assert.ok(factQueue(state,'Boston','2026-09-22').some(f=>f.id==='hachiko'));
 // Moving his awareness dial up gives him the whole collection.
 state=applyOperation(state,{type:'childLevels',name:'Nate',awareness:'told'},parent);
 assert.ok(factQueue(state,'Nate','2026-09-22').some(f=>f.id==='hachiko'));
 for(const f of ['FunFacts.jsx','main.jsx','FoodList.jsx','ParkGuide.jsx','LocationDirectory.jsx']){
  const src=await readFile(new URL(`../src/${f}`,import.meta.url),'utf8');
  assert.match(src,/gentleOnly\(/,`${f} filters for the gentle facts`);
 }
 assert.equal(gentleFacts(ALL_FACTS()).length,ALL_FACTS().length-3);
});

test('three katakana puzzles solved in a row offer a parent the next reading step, and nothing moves on its own',async()=>{
 let state=fresh();
 const kanaDays=state.days.map(d=>d.date).filter(d=>puzzleFor(state,d)?.kind==='katakana');
 assert.ok(kanaDays.length>=BUMP_RUN);
 const today=kanaDays[BUMP_RUN-1];
 const score=(st,day,n)=>applyOperation(st,{type:'gameScore',person:'Nate',game:puzzleKey(day),score:n},parent);
 state=score(state,kanaDays[0],6);state=score(state,kanaDays[1],5);
 assert.equal(readingBump(state,'Nate',today),null,'two is not three');
 state=score(state,kanaDays[2],1);
 assert.equal(readingBump(state,'Nate',today),null,'a puzzle played but not solved breaks the run');
 state=score(state,kanaDays[2],4);
 const bump=readingBump(state,'Nate',today);
 assert.deepEqual({from:bump.from,to:bump.to,days:bump.days},{from:'none',to:'sounding',days:[kanaDays[2],kanaDays[1],kanaDays[0]]});
 assert.deepEqual(kanaRun(state,'Nate',today).map(r=>r.solved),[true,true,true]);
 assert.equal(readingBump(state,'Nate',kanaDays[0]),null,'only puzzles up to today count');
 // The parent takes it: the dial moves through the ordinary operation, and the offer goes.
 const moved=applyOperation(state,{type:'childLevels',name:'Nate',reading:'sounding'},parent);
 assert.equal(readingBump(moved,'Nate',today)?.to,'reads','three more solved would offer the next step');
 const top=applyOperation(state,{type:'childLevels',name:'Nate',reading:'reads'},parent);
 assert.equal(readingBump(top,'Nate',today),null,'nothing above reading on his own');
 assert.equal(readingBump(state,'Damien',today),null);
 const brief=await readFile(new URL('../src/Briefing.jsx',import.meta.url),'utf8');
 assert.match(brief,/\{parent&&day===today&&<ReadingBumps /,'a parent’s line, on the day itself');
 assert.match(brief,/mutate\(\{type:'childLevels',name:b\.name,reading:b\.to\}\)/);
});
