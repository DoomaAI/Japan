import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ensureFeatures} from '../src/trip-features.js';
import {tripProject,notOn,isChild} from '../src/trip-project.js';
import {tripBrief} from '../server/ask.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const locations=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url))).locations;
const trip=()=>({...ensureFeatures(structuredClone(seed)),locations});

test('Project: whose it is comes first, their profile leads, and a child is spoken to as one',()=>{
 const state=trip();
 const nate=tripProject(state,'Nate'),damien=tripProject(state,'Damien'),party=tripProject(state);
 assert.match(nate,/^# Whose project this is\n\n- This is \*\*Nate\*\*’s project/);
 assert.match(nate,/young child can follow/);assert.match(nate,/ask a parent/);
 assert.doesNotMatch(damien,/young child|ask a parent/);
 assert.match(party,/The whole party/);
 assert.match(nate,/\n## Nate — you\n/);
 assert.ok(nate.indexOf('## Nate')<nate.indexOf('## Damien'));
 assert.ok(damien.indexOf('## Damien')<damien.indexOf('## Nate'));
 state.party.people.Nate={age:14,interests:[],likes:[],loves:'',avoid:'',dietary:'',notes:''};
 assert.equal(isChild(state,'Nate'),false);
 assert.doesNotMatch(tripProject(state,'Nate'),/young child/);
 assert.match(tripProject(state,'Stranger'),/The whole party/,'someone not on the trip gets the party, not a project of their own');
});

test('Project: built live — a profile, an allergy, a rating or a vote changes the very next one',()=>{
 const state=trip();
 const step=state.steps.find(s=>s.day==='2026-09-22'&&/Meiji/.test(s.title));
 const before=tripProject(state,'Boston');
 state.party.people.Boston={age:8,interests:['trains','animals'],likes:['Shinkansen'],loves:'',avoid:'long queues',dietary:'',notes:''};
 state.party.priorities={Boston:{weights:{weather:0,cost:1,likes:3,votes:2}}};
 state.allergies={Nate:{allergens:['peanut','treenuts'],severe:true,note:'carries an EpiPen'}};
 state.stepReviews={[step.id]:{ratings:{Boston:4.5},thoughts:{Boston:{text:'The sake barrels!',at:'2026-09-22T01:00:00Z'}}}};
 state.proposals=[{id:'p1',title:'Railway Museum',place:'Kyoto',votes:{Boston:1,Lauren:-1},musts:{Boston:true},parked:false,stepId:null}];
 const after=tripProject(state,'Boston');
 assert.notEqual(before,after);
 assert.match(after,/## Boston \(8\) — you/);
 assert.match(after,/Interests: Trains & engineering, Animals/);
 assert.match(after,/Would rather avoid: long queues/);
 assert.match(after,/What we are into: Matters most/);
 assert.match(after,/a hard limit, severe: Peanut, All tree nuts — carries an EpiPen/);
 assert.match(after,/Meiji.*4\.5★: “The sake barrels!”/);
 assert.match(after,/Railway Museum · Kyoto — yes: Boston; no: Lauren; a must for Boston/);
 assert.match(after,/1 Hotel Tokyo/);
});

test('Project: the private parts of the trip never reach it',()=>{
 const state=trip();
 state.inbox=[{subject:'SECRET-INBOX'}];state.expenses=[{title:'SECRET-EXPENSE'}];state.askThread=[{question:'SECRET-ASK'}];
 state.contacts={Damien:'+61 400 000 000'};state.trackers=[{shareUrl:'https://secret.example'}];
 const all=tripProject(state,'Damien');
 for(const secret of ['SECRET-INBOX','SECRET-EXPENSE','SECRET-ASK','+61 400 000 000','secret.example'])assert.ok(!all.includes(secret),secret);
});

test('Project: a trip that is not this family and not Japan is its own project',()=>{
 const state=ensureFeatures({tripName:'Italy with friends',members:['Ana','Ben'],days:[{date:'2027-05-01',title:'Rome',city:'Rome',hotel:'Hotel Artemide'},{date:'2027-05-02',title:'Florence',city:'Florence',hotel:'Hotel Artemide'}],steps:[],choices:{},documents:[],history:[],notices:[]});
 const ana=tripProject(state,'Ana');
 assert.match(ana,/# The trip: Italy with friends/);assert.match(ana,/Travellers: Ana, Ben/);
 assert.match(ana,/Sat, 1 May–Sun, 2 May: Hotel Artemide \(Rome, Florence\)/);
 assert.doesNotMatch(ana,/Japan|Damien|Tokyo|young child/);
});

test('Project: stops a person is not on are marked “not you” on the plan sent with the question',()=>{
 const state=trip();
 const split=state.steps.find(s=>s.participants?.length&&!s.participants.includes('Nate')&&s.day);
 assert.equal(notOn(split,'Nate'),true);assert.equal(notOn(split,null),false);
 const brief=tripBrief(state,{day:split.day,person:'Nate',now:new Date(`${split.day}T01:00:00Z`)});
 assert.ok(brief.split('\n').some(l=>l.includes(split.title)&&l.includes('not you')));
 assert.doesNotMatch(tripBrief(state,{day:split.day,now:new Date(`${split.day}T01:00:00Z`)}),/not you/);
});
