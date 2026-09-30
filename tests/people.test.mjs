import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {peopleOf,roleOf,parentsOf,roleLabel,nameProblem,cleanName,joinMember,changeRole,changeHousehold,householdOf} from '../src/people.js';
import {ensureFeatures} from '../src/trip-features.js';
import {applyOperation} from '../server/model.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const dinner=JSON.parse(await readFile(new URL('./fixtures/dinner.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},child={name:'Nate',role:'child'};
const sam={name:'Sam',role:'parent'},priya={name:'Priya',role:'child'};

test('the family gets its records: two parents, two children, nothing else read from a name',()=>{
 const state=ensureFeatures(seed);
 assert.deepEqual(Object.keys(state.people).sort(),['Boston','Damien','Lauren','Nate']);
 assert.deepEqual(parentsOf(state),['Damien','Lauren']);assert.equal(roleOf(state,'Nate'),'child');assert.equal(roleOf(state,'Nobody'),null);
 assert.equal(roleLabel(state,'parent'),'Parent editor');assert.equal(roleLabel(state,'child'),'Family member');
 // A record with a role the app does not know is given the safer one; a record for a name no
 // longer on the list is dropped.
 const odd=peopleOf({members:['Damien','Nate'],people:{Damien:{role:'king'},Boston:{role:'child'}}});
 assert.equal(odd.Damien.role,'child');assert.equal('Boston' in odd,false);
});
test('the dinner keeps the records it was given, and calls them organiser and guest',()=>{
 const state=ensureFeatures(dinner);
 assert.deepEqual(parentsOf(state),['Sam']);assert.equal(householdOf(state,'Alex'),'Jordan and Alex');
 assert.equal(roleLabel(state,'parent'),'Organiser');assert.equal(roleLabel(state,'child'),'Guest');
});
test('a name is two to forty characters, letters first, not the word for everyone, and not taken',()=>{
 const state=ensureFeatures(dinner);
 assert.equal(nameProblem('Kim',state),null);assert.equal(nameProblem('Anne-Marie O’Neil',state),null);assert.equal(nameProblem('Zoë',state),null);
 assert.match(nameProblem('K',state),/two to forty/);assert.match(nameProblem('x'.repeat(41),state),/two to forty/);
 assert.match(nameProblem('sam',state),/already in the plan/);assert.match(nameProblem('Family',state),/everybody/);
 assert.match(nameProblem('<script>',state),/letters/);assert.match(nameProblem('1st',state),/letters/);
 assert.equal(cleanName('  Kim   Lee '),'Kim Lee');
});
test('joining puts the person on the members list with the link’s role and household',()=>{
 const state=ensureFeatures(dinner);
 assert.equal(joinMember(state,{name:'Kim',role:'child',household:'The Lees',via:'grant-1',now:'2026-10-02T00:00:00.000Z'}),null);
 assert.ok(state.members.includes('Kim'));assert.deepEqual(state.people.Kim,{role:'child',household:'The Lees',joinedAt:'2026-10-02T00:00:00.000Z',via:'grant-1'});
 assert.match(joinMember(state,{name:'Kim',role:'child'}),/already in the plan/);
 assert.match(joinMember(state,{name:'Lee',role:'vendor'}),/role/);
 assert.match(joinMember(state,{name:'Lee',role:'child',household:'x'.repeat(81)}),/household/i);
 assert.equal(state.members.length,7);
});
test('the last organiser cannot be made a guest; anyone else can change either way',()=>{
 const state=ensureFeatures(dinner);
 assert.match(changeRole(state,{name:'Sam',role:'child'}),/at least one organiser/);
 assert.equal(changeRole(state,{name:'Priya',role:'parent'}),null);assert.equal(changeRole(state,{name:'Sam',role:'child'}),null);
 assert.deepEqual(parentsOf(state),['Priya']);
 assert.match(changeRole(state,{name:'Nobody',role:'parent'}),/not in the plan/);
 assert.equal(changeHousehold(state,{name:'Mei',household:'Mei and Tom'}),null);assert.equal(householdOf(state,'Mei'),'Mei and Tom');
});
test('a step on the dinner can be for its own people, and never for the family',()=>{
 const state=ensureFeatures(dinner);
 const next=applyOperation(state,{type:'add',step:{title:'Gelato',day:'2026-11-13',participants:['Sam','Mei']}},sam);
 assert.deepEqual(next.steps.at(-1).participants,['Sam','Mei']);
 assert.throws(()=>applyOperation(state,{type:'add',step:{title:'Gelato',day:'2026-11-13',participants:['Damien']}},sam),/in the plan/);
 const everyone=applyOperation(state,{type:'add',step:{title:'Walk',day:'2026-11-13'}},sam);
 assert.deepEqual(everyone.steps.at(-1).participants,state.members);
});
test('the member operations are a parent’s, and go into the history',()=>{
 const state=ensureFeatures(dinner);
 const added=applyOperation(state,{type:'memberAdd',name:' Kim ',role:'child',household:''},sam);
 assert.ok(added.members.includes('Kim'));assert.equal(added.people.Kim.via,'added by Sam');assert.match(added.history[0].title,/Kim was added to the plan as guest/);
 assert.throws(()=>applyOperation(state,{type:'memberAdd',name:'Kim',role:'child'},priya),e=>e.status===403);
 assert.throws(()=>applyOperation(state,{type:'memberAdd',name:'Sam',role:'child'},sam),/already in the plan/);
 const promoted=applyOperation(state,{type:'memberRole',name:'Priya',role:'parent'},sam);
 assert.equal(roleOf(promoted,'Priya'),'parent');assert.match(promoted.history[0].title,/Priya is now organiser/);
 assert.throws(()=>applyOperation(state,{type:'memberRole',name:'Sam',role:'child'},sam),/at least one organiser/);
 const housed=applyOperation(state,{type:'memberHousehold',name:'Tom',household:'Mei and Tom'},sam);
 assert.equal(householdOf(housed,'Tom'),'Mei and Tom');
 // On the family trip the same words come out as the family says them.
 const family=applyOperation(seed,{type:'memberAdd',name:'Grandma',role:'child'},parent);
 assert.match(family.history[0].title,/Grandma was added to the plan as family member/);
 assert.throws(()=>applyOperation(seed,{type:'memberAdd',name:'Grandma',role:'child'},child),e=>e.status===403);
});
