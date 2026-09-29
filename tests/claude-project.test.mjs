import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import handler from '../server/handler.mjs';
import {ensureFeatures} from '../src/trip-features.js';
import {projectPack,packPerson,PROJECT_FILES,projectSlug} from '../src/claude-project.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const now=new Date('2026-09-29T21:00:00Z');

test('Claude Project pack: instructions put the trip files first, and every day and step is in the itinerary',()=>{
 const pack=projectPack(ensureFeatures(seed),now);
 assert.deepEqual(Object.keys(pack.files),PROJECT_FILES);
 assert.equal(pack.slug,'japan-2026');
 assert.match(pack.files['00-project-instructions.md'],/primary source/);
 assert.match(pack.files['00-project-instructions.md'],/Never contradict a step marked \*\*locked\*\*/);
 const itinerary=pack.files['02-itinerary.md'];
 assert.equal((itinerary.match(/^## /gm)||[]).length,seed.days.length);
 for(const s of seed.steps.filter(s=>s.day&&s.title).slice(0,40))assert.ok(itinerary.includes(s.title.replace(/\s+/g,' ').trim()),s.title);
 assert.match(pack.files['02-itinerary.md'],/^> Snapshot of Japan 2026 taken 2026-09-29 21:00 UTC/);
});

test('Claude Project pack: profiles carry interests, likes, allergies, priorities and what each person rated',()=>{
 const state=ensureFeatures(structuredClone(seed));
 const step=state.steps.find(s=>s.day==='2026-09-22'&&/Meiji/.test(s.title));
 state.party.people.Boston={age:8,interests:['trains','animals'],likes:['Shinkansen'],loves:'',avoid:'long queues',dietary:'',notes:''};
 state.party.priorities={Boston:{weights:{weather:0,cost:1,likes:3,votes:2}}};
 state.allergies={Nate:{allergens:['peanut','treenuts'],severe:true,note:'carries an EpiPen'}};
 state.stepReviews={[step.id]:{ratings:{Boston:4.5},thoughts:{Boston:{text:'The sake barrels!',at:now.toISOString()}}}};
 const profiles=projectPack(state,now).files['03-traveller-profiles.md'];
 assert.match(profiles,/## Boston \(8\)/);
 assert.match(profiles,/Trains & engineering, Animals/);
 assert.match(profiles,/Own likes:\*\* Shinkansen/);
 assert.match(profiles,/Would rather avoid:\*\* long queues/);
 assert.match(profiles,/What we are into: Matters most/);
 assert.match(profiles,/hard constraint, severe\):\*\* Peanut, All tree nuts — carries an EpiPen/);
 assert.match(profiles,/Meiji.*4\.5★: “The sake barrels!”/);
 assert.match(projectPack(state,now).files['05-ideas-and-feedback.md'],/4\.5★ \(Boston 4\.5\)/);
});

test('Claude Project pack: private parts of the trip stay out',()=>{
 const state=ensureFeatures(structuredClone(seed));
 state.inbox=[{subject:'SECRET-INBOX-SUBJECT'}];state.expenses=[{title:'SECRET-EXPENSE'}];
 state.askThread=[{text:'SECRET-ASK'}];state.contacts={Damien:'+61 400 000 000'};state.trackers=[{url:'https://secret.example'}];
 const all=Object.values(projectPack(state,now).files).join('\n');
 for(const secret of ['SECRET-INBOX-SUBJECT','SECRET-EXPENSE','SECRET-ASK','+61 400 000 000','secret.example'])assert.ok(!all.includes(secret),secret);
});

test('Claude Project pack: a second trip that is not this family and not Japan makes its own project',()=>{
 const state=ensureFeatures({tripName:'Italy with friends',members:['Ana','Ben'],days:[{date:'2027-05-01',title:'Rome',city:'Rome',hotel:'Hotel Artemide'},{date:'2027-05-02',title:'Florence',city:'Florence',hotel:''}],steps:[{id:'a',day:'2027-05-01',title:'Colosseum',time:'09:00',place:'Colosseo',locked:true,order:0,participants:['Ana','Ben']}],choices:{},documents:[],history:[],notices:[]});
 const pack=projectPack(state,now);
 assert.equal(projectSlug(state),'italy-with-friends');
 assert.match(pack.files['00-project-instructions.md'],/Italy with friends .*Rome, Florence.*travellers are Ana, Ben/s);
 assert.match(pack.files['02-itinerary.md'],/09:00 · Colosseum · Colosseo \*\*\[locked\]\*\*/);
 assert.match(pack.files['02-itinerary.md'],/Sun, 2 May 2027 — Florence\nFlorence · stay: not set\n\n- Nothing planned yet\./);
 assert.ok(!/Japan|Damien|Tokyo/.test(Object.values(pack.files).join('\n')));
});

test('Claude Project pack for one person: their project, their profile first, their steps marked',()=>{
 const state=ensureFeatures(structuredClone(seed));
 const split=state.steps.find(s=>s.participants?.length&&!s.participants.includes('Nate'));
 const nate=projectPack(state,now,'Nate'),damien=projectPack(state,now,'Damien'),party=projectPack(state,now);
 assert.equal(nate.slug,'japan-2026-nate');assert.equal(nate.name,'Japan 2026 — Nate');assert.equal(nate.person,'Nate');
 assert.equal(party.person,null);assert.equal(party.slug,'japan-2026');
 assert.match(nate.files['00-project-instructions.md'],/You are Nate’s own planning companion/);
 assert.match(nate.files['00-project-instructions.md'],/young child can read/);
 assert.match(nate.files['00-project-instructions.md'],/suggest asking a parent/);
 assert.doesNotMatch(damien.files['00-project-instructions.md'],/young child|asking a parent/);
 assert.doesNotMatch(party.files['00-project-instructions.md'],/Whose project this is/);
 assert.match(nate.files['03-traveller-profiles.md'],/\n## Nate — you\n/);
 assert.ok(nate.files['03-traveller-profiles.md'].indexOf('## Nate')<nate.files['03-traveller-profiles.md'].indexOf('## Damien'));
 assert.ok(nate.files['02-itinerary.md'].split('\n').some(l=>l.includes(split.title.replace(/\s+/g,' ').trim())&&l.includes('not you')));
 assert.doesNotMatch(party.files['02-itinerary.md'],/not you/);
 state.party.people.Nate={age:14,interests:[],likes:[],loves:'',avoid:'',dietary:'',notes:''};
 assert.doesNotMatch(projectPack(state,now,'Nate').files['00-project-instructions.md'],/young child/);
 assert.throws(()=>projectPack(state,now,'Stranger'),/not on this trip/);
});

test('Claude Project pack: everyone takes their own; only a parent takes anyone else\'s or the party\'s',()=>{
 const members=seed.members,nate={name:'Nate',role:'child'},lauren={name:'Lauren',role:'parent'};
 assert.deepEqual(packPerson(nate,null,members),{person:'Nate'});
 assert.deepEqual(packPerson(nate,'Nate',members),{person:'Nate'});
 assert.equal(packPerson(nate,'Boston',members).status,403);
 assert.equal(packPerson(nate,'party',members).status,403);
 assert.deepEqual(packPerson(lauren,'Boston',members),{person:'Boston'});
 assert.deepEqual(packPerson(lauren,'party',members),{person:null});
 assert.equal(packPerson(lauren,'Stranger',members).status,404);
});

test('API: claude-project hands a parent the pack for the trip as it stands',async()=>{
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const r=await fetch(base+'/api/claude-project');assert.equal(r.status,200);
  const pack=await r.json();assert.deepEqual(Object.keys(pack.files),PROJECT_FILES);assert.equal(pack.slug,'japan-2026-damien');
  assert.equal((await(await fetch(base+'/api/claude-project?for=party')).json()).slug,'japan-2026');
  assert.equal((await(await fetch(base+'/api/claude-project?for=Boston')).json()).person,'Boston');
  assert.equal((await fetch(base+'/api/claude-project?for=Stranger')).status,404);
  assert.match(pack.files['04-places.md'],/1 Hotel Tokyo/);
 }finally{delete process.env.LOCAL_DEMO;await new Promise(r=>server.close(r));}
});
