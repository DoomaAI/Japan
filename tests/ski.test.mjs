import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SKI_RESORTS,skiResort,overpassQuery,readOverpass,gradeOf,liftKind,meetingPlaces,skiRunId,validRunId,runsDoneAt,activeMeetups,meetupPush,quickTimes} from '../src/ski-data.js';
import {skiMap,resetSkiCache,meetupChange,positionSeers} from '../server/ski.mjs';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures,pendingProgress} from '../src/trip-features.js';
import {pushMoments,PUSH_KIND_IDS} from '../src/push-data.js';
import {parentsOf} from '../src/people.js';
import {PAGES,MORE_SECTIONS} from '../src/nav-data.js';
import {moduleOn} from '../src/plan-context.js';
import {PAGE_RULES} from '../src/spoken-rules.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const state0=()=>ensureFeatures(structuredClone(seed));
const [parentName,otherParent]=parentsOf(state0());
const childName=state0().members.find(n=>!parentsOf(state0()).includes(n));
const parent={name:parentName,role:'parent'},child={name:childName,role:'child'};
const teine=skiResort('teine');
// A small piece of Overpass's answer, in its own shape: a run in two pieces with the same name,
// a run with an English name, an unnamed run, a quad chair drawn bottom to top, a goods line,
// a restaurant as a node and a cafe as a way with a centre.
const FEED={elements:[
 {type:'way',id:1,tags:{'piste:type':'downhill','piste:difficulty':'easy',name:'パノラマコース'},geometry:[{lat:43.08,lon:141.19},{lat:43.081,lon:141.191}]},
 {type:'way',id:2,tags:{'piste:type':'downhill','piste:difficulty':'intermediate',name:'パノラマコース'},geometry:[{lat:43.081,lon:141.191},{lat:43.082,lon:141.192}]},
 {type:'way',id:3,tags:{'piste:type':'downhill','piste:difficulty':'expert',name:'北壁','name:en':'North Face'},geometry:[{lat:43.07,lon:141.18},{lat:43.071,lon:141.181}]},
 {type:'way',id:4,tags:{'piste:type':'downhill','piste:difficulty':'novice'},geometry:[{lat:43.09,lon:141.2},{lat:43.091,lon:141.201}]},
 {type:'way',id:5,tags:{aerialway:'chair_lift','aerialway:occupancy':'4',name:'ハイランドエクスプレス'},geometry:[{lat:43.07,lon:141.19},{lat:43.075,lon:141.185}]},
 {type:'way',id:6,tags:{aerialway:'goods'},geometry:[{lat:43.07,lon:141.19},{lat:43.075,lon:141.185}]},
 {type:'node',id:7,lat:43.0751,lon:141.1851,tags:{amenity:'restaurant',name:'Highland Lodge'}},
 {type:'way',id:8,center:{lat:43.09,lon:141.205},tags:{amenity:'cafe',name:'オリンピアカフェ'}},
 {type:'node',id:9,lat:43.09,lon:141.2,tags:{amenity:'cafe'}}
]};

test('five resorts inside Sapporo, each with a page for what is open today and a site',()=>{
 assert.deepEqual(SKI_RESORTS.map(r=>r.id),['teine','kokusai','bankei','fus','moiwa']);
 for(const r of SKI_RESORTS){
  assert.match(r.status,/^https:\/\//,r.id);assert.match(r.site,/^https:\/\//,r.id);
  assert.ok(r.radius>=1000&&r.radius<=4000&&r.centre.lat>42.9&&r.centre.lat<43.15&&r.centre.lon>141&&r.centre.lon<141.4,r.id);
  assert.ok(r.about&&r.queues,r.id);
 }
});
test('the Overpass query asks for downhill runs and lifts with their lines, and places to eat with a point',()=>{
 const q=overpassQuery(teine);
 assert.match(q,/\[out:json\]/);assert.match(q,/"piste:type"="downhill"/);assert.match(q,/way\["aerialway"\]/);
 assert.match(q,/out tags geom;/);assert.match(q,/out tags center;/);assert.match(q,/around:3200,43\.083,141\.195/);
});
test('the map is read into runs grouped by name, lifts bottom to top, and places to eat',()=>{
 const map=readOverpass(FEED,teine);
 assert.equal(map.runs.length,2,'two named runs; the unnamed one is drawn but not listed');
 const pano=map.runs.find(r=>r.name==='パノラマコース');
 assert.equal(pano.id,'teine:パノラマコース');assert.equal(pano.lines.length,2);assert.equal(pano.grade,'red','the harder of its pieces');
 assert.ok(pano.lengthM>200&&pano.lengthM<400,`${pano.lengthM}`);
 const north=map.runs.find(r=>r.name==='North Face');
 assert.equal(north.id,'teine:北壁','the id keeps the name as signed');assert.equal(north.ja,'北壁');assert.equal(north.grade,'black');
 assert.equal(map.runs[0].grade,'red','sorted easiest first');
 assert.equal(map.unnamed.length,1);assert.equal(map.unnamed[0].grade,'green');
 assert.equal(map.lifts.length,1,'a goods line is not a lift');
 assert.equal(map.lifts[0].kind,'Quad chair');assert.deepEqual(map.lifts[0].bottom,[43.07,141.19]);assert.deepEqual(map.lifts[0].top,[43.075,141.185]);
 assert.deepEqual(map.food.map(f=>f.name).sort(),['Highland Lodge','オリンピアカフェ'],'an unnamed cafe is left out');
 assert.deepEqual(map.food.find(f=>f.kind==='cafe').lat,43.09);
 const places=meetingPlaces(map);
 assert.deepEqual(places.map(p=>p.label),['Highland Lodge','オリンピアカフェ','Bottom of ハイランドエクスプレス','Top of ハイランドエクスプレス']);
 assert.equal(readOverpass({},teine).runs.length,0);assert.deepEqual(meetingPlaces(null),[]);
});
test('grades fold into green, red and black, and lift kinds are named',()=>{
 assert.equal(gradeOf('novice'),'green');assert.equal(gradeOf('easy'),'green');assert.equal(gradeOf('intermediate'),'red');
 assert.equal(gradeOf('freeride'),'black');assert.equal(gradeOf(undefined),null);
 assert.equal(liftKind({aerialway:'gondola'}),'Gondola');assert.equal(liftKind({aerialway:'chair_lift','aerialway:occupancy':'2'}),'Pair chair');
 assert.equal(liftKind({aerialway:'zip_line'}),null);
});
test('the server reads a resort once, keeps it, and gives the last read back when Overpass is down',async()=>{
 resetSkiCache();let calls=0;
 const ok=async(url,opts)=>{calls++;assert.match(url,/overpass-api\.de/);assert.equal(opts.method,'POST');assert.match(decodeURIComponent(opts.body),/piste:type/);return {ok:true,json:async()=>FEED};};
 const t=Date.parse('2027-01-10T01:00:00Z');
 const a=await skiMap('teine',t,ok);assert.equal(a.runs.length,2);assert.match(a.source,/OpenStreetMap/);
 await skiMap('teine',t+3600000,ok);assert.equal(calls,1,'kept for half a day');
 const down=async()=>({ok:false,status:504});
 const b=await skiMap('teine',t+13*3600000,down);assert.equal(b.stale,true);assert.equal(b.runs.length,2);
 await assert.rejects(skiMap('kokusai',t,down),/not answering/);
 await assert.rejects(skiMap('niseko',t,ok),/not one of the Sapporo resorts/);
});
test('runs are ticked and starred like the park rides: your own, or anyone’s by a parent',()=>{
 const id=skiRunId('teine','パノラマコース');
 assert.ok(validRunId(id));assert.ok(!validRunId('niseko:Hirafu'));assert.ok(!validRunId('teine:'));
 let s=applyOperation(state0(),{type:'skiRun',runId:id,name:'Panorama',person:childName,done:true},child);
 assert.ok(s.skiRuns[id].done[childName]);assert.equal(s.skiRuns[id].name,'Panorama');
 assert.equal(runsDoneAt(s,'teine',childName),1);assert.equal(runsDoneAt(s,'kokusai',childName),0);
 assert.throws(()=>applyOperation(s,{type:'skiRun',runId:id,person:parentName,done:true},child),/your own/);
 s=applyOperation(s,{type:'skiRun',runId:id,person:otherParent,done:true},parent);assert.ok(s.skiRuns[id].done[otherParent]);
 s=applyOperation(s,{type:'skiWant',runId:id,person:childName,want:true},child);assert.ok(s.skiRuns[id].wants[childName]);
 s=applyOperation(s,{type:'skiRun',runId:id,person:childName,done:false},child);assert.ok(!s.skiRuns[id].done[childName]);assert.ok(s.skiRuns[id].wants[childName]);
 assert.throws(()=>applyOperation(s,{type:'skiRun',runId:'nowhere',person:childName,done:true},child),/Unknown run/);
 assert.ok(!(s.history||[]).some(h=>h.type==='skiRun'),'ticks do not flood Family updates');
 // The phone shows a tick straight away, the way the server will save it.
 const shown=pendingProgress(state0(),[{operation:{type:'skiRun',runId:id,name:'Panorama',person:childName,done:true,at:'2027-01-10T01:00:00Z'},live:true}]);
 assert.equal(shown.skiRuns[id].done[childName],'2027-01-10T01:00:00Z');
});
test('a meet-up is set by anyone, answered by each, and called off by whoever set it or a parent',()=>{
 const at=new Date(Date.now()+3600000).toISOString();
 let s=applyOperation(state0(),{type:'meetupAdd',resort:'teine',place:{label:'Top of Highland Express',lat:43.0751234,lon:141.18},at,note:'Lunch'},child);
 const m=s.meetups[0];
 assert.equal(m.by,childName);assert.equal(m.place.lat,43.07512);assert.equal(m.note,'Lunch');assert.equal(m.answers[childName].answer,'yes');
 assert.equal(activeMeetups(s).length,1);
 assert.throws(()=>applyOperation(s,{type:'meetupAdd',resort:'niseko',place:{label:'x'},at},child),/resorts/);
 assert.throws(()=>applyOperation(s,{type:'meetupAdd',resort:'teine',place:{label:''},at},child),/where/);
 assert.throws(()=>applyOperation(s,{type:'meetupAdd',resort:'teine',place:{label:'x'},at:'2020-01-01T00:00:00Z'},child),/next week/);
 s=applyOperation(s,{type:'meetupAnswer',id:m.id,answer:'late',minutes:10},parent);
 assert.deepEqual({a:s.meetups[0].answers[parentName].answer,m:s.meetups[0].answers[parentName].minutes},{a:'late',m:10});
 assert.throws(()=>applyOperation(s,{type:'meetupAnswer',id:m.id,answer:'maybe'},parent),/Coming/);
 s=applyOperation(s,{type:'meetupHere',id:m.id},parent);assert.ok(s.meetups[0].here[parentName]);
 const other={name:otherParent,role:'child'};
 assert.throws(()=>applyOperation(s,{type:'meetupCancel',id:m.id},other),/Only whoever set it/);
 s=applyOperation(s,{type:'meetupCancel',id:m.id},parent);assert.ok(s.meetups[0].cancelledAt);
 assert.equal(activeMeetups(s).length,0);
 assert.throws(()=>applyOperation(s,{type:'meetupAnswer',id:m.id,answer:'yes'},parent),/cancelled/);
});
test('a meet-up tells the right people, once, in words that say where and when',()=>{
 const at='2027-01-10T03:30:00.000Z';// 12:30 in Sapporo
 const before=state0();before.meetups=[];
 const added=applyOperation(before,{type:'meetupAdd',resort:'teine',place:{label:'Highland Lodge'},at:new Date(Date.now()+3600000).toISOString(),note:'Lunch'},child);
 added.meetups[0].at=at;
 const n=meetupChange(before,added,{type:'meetupAdd'},child);
 assert.equal(n.kind,'meetups');assert.equal(n.title,'🎿 Meet at Highland Lodge · 12:30');assert.match(n.body,new RegExp(`^${childName}: Lunch`));
 assert.ok(!n.to.includes(childName));assert.equal(n.to.length,added.members.length-1);assert.match(n.url,/tab=ski&meetup=/);
 const id=added.meetups[0].id;
 const late=applyOperation(added,{type:'meetupAnswer',id,answer:'late',minutes:15},parent);
 const ln=meetupChange(added,late,{type:'meetupAnswer',id},parent);
 assert.equal(ln.title,`${parentName} is running 15 min late`);assert.match(ln.body,/Highland Lodge, Teine at 12:30/);assert.ok(!ln.to.includes(parentName));
 assert.equal(meetupChange(late,applyOperation(late,{type:'meetupAnswer',id,answer:'late',minutes:15},parent),{type:'meetupAnswer',id},parent),null,'the same lateness twice is not news');
 assert.equal(meetupChange(added,applyOperation(added,{type:'meetupAnswer',id,answer:'yes'},parent),{type:'meetupAnswer',id},parent),null,'coming is not news');
 const no=applyOperation(late,{type:'meetupAnswer',id,answer:'no'},{name:otherParent,role:'parent'});
 const here=applyOperation(no,{type:'meetupHere',id},parent);
 const hn=meetupChange(no,here,{type:'meetupHere',id},parent);
 assert.equal(hn.title,`${parentName} is at Highland Lodge`);assert.ok(!hn.to.includes(otherParent),'not to somebody who cannot come');
 const off=applyOperation(here,{type:'meetupCancel',id},child);
 assert.match(meetupChange(here,off,{type:'meetupCancel',id},child).title,/^Cancelled: Highland Lodge at 12:30/);
 assert.equal(meetupPush('soon',added.meetups[0],'').title,'In 15 minutes: Highland Lodge');
});
test('fifteen minutes before a meet-up the tick reminds everyone still coming',()=>{
 const s=state0();
 s.meetups=[{id:'meet-1',resort:'kokusai',place:{label:'Top of the gondola'},at:'2099-01-10T03:30:00.000Z',note:'',by:parentName,answers:{[parentName]:{answer:'yes'},[childName]:{answer:'no'}},here:{}},
  {id:'meet-2',resort:'kokusai',place:{label:'Gone'},at:'2099-01-10T05:00:00.000Z',by:parentName,answers:{},here:{},cancelledAt:'2099-01-01T00:00:00Z'}];
 const r=pushMoments(s).filter(m=>m.kind==='meetups');
 assert.equal(r.length,1);assert.equal(r[0].at,Date.parse('2099-01-10T03:15:00.000Z'));
 assert.ok(r[0].to.includes(parentName));assert.ok(!r[0].to.includes(childName));
 assert.ok(PUSH_KIND_IDS.includes('meetups'));
});
test('a group can let everyone see everyone on the map; otherwise it is the parents, as before',()=>{
 const s=state0();
 assert.deepEqual(positionSeers(s,parentsOf),parentsOf(s));
 assert.throws(()=>applyOperation(s,{type:'whereaboutsOpen',open:true},child),/parent/);
 const open=applyOperation(s,{type:'whereaboutsOpen',open:true},parent);
 assert.deepEqual(positionSeers(open,parentsOf),open.members);
});
test('quick times land on the next five minutes',()=>{
 const t=Date.parse('2027-01-10T03:02:00Z');
 assert.deepEqual(quickTimes(t).map(q=>q.at),['2027-01-10T03:20:00.000Z','2027-01-10T03:35:00.000Z','2027-01-10T04:05:00.000Z']);
});
test('the ski fields are a page on a trip, in Out and about, with words to read aloud, and off for a dinner',()=>{
 assert.ok(PAGES.ski?.label);assert.ok(PAGE_RULES.ski);
 assert.ok(MORE_SECTIONS.find(([t])=>t==='Out and about')[1].includes('ski'));
 assert.equal(moduleOn({plan:{type:'trip'}},'ski'),true);assert.equal(moduleOn({plan:{type:'outing'}},'ski'),false);
});
