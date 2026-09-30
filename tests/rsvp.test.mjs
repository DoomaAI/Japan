import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {invitationOf,invitationProblem,mainMoment,whenWhere,rsvpProblem,applyRsvp,answersClosed,guestSummary,guestsCsv,invitationView,visibleRsvps,EMPTY_INVITATION} from '../src/rsvp-data.js';
import {ensureFeatures} from '../src/trip-features.js';
import {applyOperation} from '../server/model.mjs';
import {visibleTrip} from '../server/visibility.mjs';
import {pagesFor,setPlan,PAGES} from '../src/nav-data.js';
import {moduleOn} from '../src/plan-context.js';
import handler from '../server/handler.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const dinner=JSON.parse(await readFile(new URL('./fixtures/dinner.json',import.meta.url)));
const sam={name:'Sam',role:'parent'},priya={name:'Priya',role:'child'},mei={name:'Mei',role:'child'};
const published=state=>applyOperation(state,{type:'invitationEdit',patch:{published:true,hosts:'Sam',message:'Dinner, then a wander.',plusOnes:true,rsvpBy:'2026-11-10',questions:[{id:'song',label:'A song for the playlist',kind:'text',options:[]},{id:'sitting',label:'Which sitting',kind:'choice',options:['Early','Late']},{id:'lift',label:'Need a lift',kind:'yesno',options:[]}]}},sam);

test('the invitation reads its when and where off the plan: the first fixed stop, or the one chosen',()=>{
 const state=ensureFeatures(dinner);
 assert.equal(invitationOf(state).published,false);assert.deepEqual(invitationOf(state).questions,[]);
 const {day,step}=mainMoment(state);assert.equal(day.date,'2026-11-13');assert.equal(step.id,'dinner');
 const w=whenWhere(state);assert.equal(w.time,'19:30');assert.equal(w.startsAt,'2026-11-13T08:30:00.000Z');assert.equal(w.place,'69 Commonwealth St, Surry Hills');assert.equal(w.city,'Sydney');
 const chosen=applyOperation(state,{type:'invitationEdit',patch:{stepId:'drinks'}},sam);
 assert.equal(mainMoment(chosen).step.id,'drinks');assert.equal(whenWhere(chosen).time,'18:00');
 assert.throws(()=>applyOperation(state,{type:'invitationEdit',patch:{stepId:'nope'}},sam),/on the plan/);
});
test('the invitation is checked field by field, and only a parent writes it',()=>{
 const state=ensureFeatures(dinner);
 assert.equal(invitationProblem({hosts:'Sam',message:'Hi',rsvpBy:'2026-11-10',showNames:'everyone',questions:[{id:'a',label:'Song?',kind:'text',options:[]}]}),null);
 assert.match(invitationProblem({colour:'red'}),/Unsupported/);assert.match(invitationProblem({published:'yes'}),/on or off/);
 assert.match(invitationProblem({rsvpBy:'soon'}),/day/);assert.match(invitationProblem({showNames:'friends'}),/organiser/);
 assert.match(invitationProblem({questions:[{id:'a',label:'',kind:'text'}]}),/wording/);
 assert.match(invitationProblem({questions:[{id:'a',label:'Which',kind:'choice',options:['one']}]}),/two to/);
 assert.match(invitationProblem({questions:[{id:'a',label:'x',kind:'text'},{id:'a',label:'y',kind:'text'}]}),/own id/);
 assert.match(invitationProblem({questions:Array.from({length:9},(_,i)=>({id:`q${i}`,label:'q',kind:'text'}))}),/up to 8/);
 assert.throws(()=>applyOperation(state,{type:'invitationEdit',patch:{hosts:'Priya'}},priya),e=>e.status===403);
 const out=published(state);assert.equal(out.invitation.published,true);assert.match(out.history[0].title,/went out/);assert.equal(out.alerts[0].summary,'The invitation is out');
 const down=applyOperation(out,{type:'invitationEdit',patch:{published:false}},sam);assert.match(down.history[0].title,/taken down/);
});
test('an answer is in, maybe or out, with only what the invitation allows',()=>{
 const inv={...EMPTY_INVITATION,plusOnes:false,childrenWelcome:false,questions:[{id:'sitting',label:'Which sitting',kind:'choice',options:['Early','Late']}]};
 assert.equal(rsvpProblem({status:'in'},inv),null);
 assert.match(rsvpProblem({status:'yes'},inv),/in, a maybe, or out/);
 assert.match(rsvpProblem({status:'in',plusOne:'Kim'},inv),/named on it/);
 assert.match(rsvpProblem({status:'in',children:1},inv),/grown-ups/);
 assert.match(rsvpProblem({status:'in',answers:{sitting:'Midnight'}},inv),/one of the options/);
 assert.match(rsvpProblem({status:'in',answers:{other:'x'}},inv),/not on the invitation/);
 assert.equal(rsvpProblem({status:'in',plusOne:'Kim',children:2,dietary:'No nuts',answers:{sitting:'Early'}},{...inv,plusOnes:true,childrenWelcome:true}),null);
});
test('answers land on the plan, close on the reply day for guests and not for a parent, and are counted for the caterer',()=>{
 const state=published(ensureFeatures(dinner));
 const a=applyOperation(state,{type:'rsvpSet',answer:{status:'in',plusOne:'Kim',children:1,dietary:'Vegetarian',answers:{song:'Blue Moon',sitting:'Late',lift:true}}},priya);
 assert.equal(a.rsvps.Priya.status,'in');assert.equal(a.rsvps.Priya.plusOne,'Kim');assert.equal(a.rsvps.Priya.answeredBy,'Priya');assert.match(a.history[0].title,/Priya is in/);
 assert.throws(()=>applyOperation(a,{type:'rsvpSet',name:'Mei',answer:{status:'out'}},priya),e=>e.status===403);
 const b=applyOperation(a,{type:'rsvpSet',name:'Mei',answer:{status:'out'}},sam);
 assert.match(b.history[0].title,/Mei can’t make it \(answered by Sam\)/);
 const s=guestSummary(b);assert.deepEqual(s.counts,{in:1,maybe:0,out:1,none:4});assert.deepEqual(s.heads,{adults:2,children:1});assert.deepEqual(s.dietary,[{name:'Priya',text:'Vegetarian'}]);assert.deepEqual(s.unanswered,['Sam','Jordan','Alex','Tom']);
 // A partial answer keeps what was said before.
 const c=applyOperation(b,{type:'rsvpSet',answer:{status:'maybe'}},priya);assert.equal(c.rsvps.Priya.plusOne,'Kim');assert.equal(c.rsvps.Priya.answers.song,'Blue Moon');
 // Closing: the end of the reply day in Sydney.
 assert.equal(answersClosed(state,new Date('2026-11-10T12:59:00.000Z')),false);
 assert.equal(answersClosed(state,new Date('2026-11-10T13:01:00.000Z')),true);
 const late=structuredClone(state);assert.match(applyRsvp(late,{name:'Tom',answer:{status:'in'},by:'Tom',now:'2026-11-11T00:00:00.000Z'}),/Answers closed/);
 assert.equal(applyRsvp(late,{name:'Tom',answer:{status:'in'},by:'Sam',now:'2026-11-11T00:00:00.000Z',override:true}),null);
 assert.match(applyRsvp(late,{name:'Nobody',answer:{status:'in'},by:'Sam'}),/not in the plan/);
 const csv=guestsCsv(b);assert.match(csv.split('\n')[0],/^Name,Household,Status,Plus-one,Children,Dietary,Note,A song for the playlist,Which sitting,Need a lift/);assert.match(csv,/Priya,,in,Kim,1,Vegetarian,,Blue Moon,Late,Yes/);
});
test('the public view is an allow-list: the words, the when and where, a count, names only when shared',()=>{
 const closed=ensureFeatures(dinner);
 assert.deepEqual(invitationView(closed).when,null);assert.equal(invitationView(closed).published,false);
 const state=applyOperation(published(closed),{type:'rsvpSet',answer:{status:'in',dietary:'No nuts',note:'So excited'}},priya);
 const v=invitationView(state,new Date('2026-11-01T00:00:00Z'));
 assert.equal(v.plan.title,'Dinner at Chin Chin');assert.equal(v.plan.timeZone,'Australia/Sydney');assert.equal(v.when.startsAt,'2026-11-13T08:30:00.000Z');
 assert.equal(v.coming,1);assert.equal(v.names,null);assert.equal(v.closed,false);assert.equal(v.questions.length,3);
 for(const key of ['rsvps','members','people','steps','documents','dietary','note','inviteKey'])assert.equal(key in v,false,key);
 assert.ok(!JSON.stringify(v).includes('No nuts'));assert.ok(!JSON.stringify(v).includes('So excited'));
 const shared=applyOperation(state,{type:'invitationEdit',patch:{showNames:'everyone'}},sam);
 assert.deepEqual(invitationView(shared).names,['Priya']);
 // Save the date shows the day and the place and none of the words.
 const std=applyOperation(closed,{type:'invitationEdit',patch:{saveTheDate:true,message:'Secret for now'}},sam);
 const sv=invitationView(std);assert.equal(sv.saveTheDate,true);assert.equal(sv.when.date,'2026-11-13');assert.equal(sv.message,'');
});
test('at the boundary a guest gets their own answer whole, the others’ status only when shared, and the counts either way',()=>{
 const state=applyOperation(applyOperation(published(ensureFeatures({...dinner,inviteKey:'a'.repeat(64)})),{type:'rsvpSet',answer:{status:'in',dietary:'No nuts'}},priya),{type:'rsvpSet',answer:{status:'maybe',note:'Depends on work'}},mei);
 const forMei=visibleTrip(state,mei);
 assert.equal('inviteKey' in forMei,false);assert.deepEqual(Object.keys(forMei.rsvps),['Mei']);assert.equal(forMei.rsvps.Mei.note,'Depends on work');assert.deepEqual(forMei.rsvpCounts,{in:1,maybe:1,out:0,none:4});
 const forSam=visibleTrip(state,sam);assert.equal(forSam.rsvps.Priya.dietary,'No nuts');assert.equal('inviteKey' in forSam,false);
 const shared=applyOperation(state,{type:'invitationEdit',patch:{showNames:'everyone'}},sam);
 const forMei2=visibleTrip(shared,mei);assert.deepEqual(forMei2.rsvps.Priya,{status:'in'});assert.equal(forMei2.rsvps.Mei.note,'Depends on work');
 assert.deepEqual(visibleRsvps(shared,{name:'Tom',role:'child'}),{Priya:{status:'in'},Mei:{status:'maybe'}});
});
test('the two pages belong to gatherings: a dinner offers them, the trip does not',()=>{
 try{
  setPlan(ensureFeatures(dinner).plan);const pages=pagesFor({name:'Sam',role:'parent'});assert.ok(pages.includes('guests'));assert.ok(pages.includes('invitation'));
  assert.ok(!pagesFor({name:'Mei',role:'child'}).includes('invitation'),'the editor is the organiser’s');assert.ok(pagesFor({name:'Mei',role:'child'}).includes('guests'));
  setPlan(ensureFeatures(seed).plan);assert.ok(!pagesFor({name:'Damien',role:'parent'}).includes('guests'));
 }finally{setPlan(null);}
 assert.equal(moduleOn(ensureFeatures(seed),'guests'),false);assert.ok('guests' in PAGES&&'invitation' in PAGES);
});
test('API: the invitation link needs the key, a wrong key learns nothing, and an unpublished invitation refuses answers',async()=>{
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const get=async path=>{const r=await fetch(base+path);return {status:r.status,body:await r.json()};};
  const post=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','Origin':`http://127.0.0.1:${server.address().port}`,'Host':`127.0.0.1:${server.address().port}`},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  assert.equal((await get('/api/invitation?key='+'b'.repeat(64))).status,403,'no key on the plan yet');
  const made=await post('/api/invite-link',{});assert.match(made.body.url,/\?invite=[a-f0-9]{64}$/);
  const key=made.body.url.split('invite=')[1];
  assert.deepEqual((await post('/api/invite-link',{})).body.url,made.body.url,'the same link again, not a second one');
  assert.equal((await get('/api/invitation?key='+'b'.repeat(64))).status,403);
  const v=await get('/api/invitation?key='+key);assert.equal(v.status,200);assert.equal(v.body.published,false);assert.equal(v.body.plan.title,'Japan 2026');
  const refused=await post('/api/rsvp',{key,name:'Grandma',answer:{status:'in'}});assert.equal(refused.status,403);assert.match(refused.body.error,/not out yet/);
  const state=await get('/api/state');assert.equal('inviteKey' in state.body.state,false,'the key never rides with the plan');
  const stopped=await post('/api/invite-link',{stop:true});assert.equal(stopped.body.url,null);
  assert.equal((await get('/api/invitation?key='+key)).status,403,'withdrawn');
 }finally{delete process.env.LOCAL_DEMO;delete process.env.VERCEL;await new Promise(r=>server.close(r));}
});
