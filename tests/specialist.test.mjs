import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures} from '../src/trip-features.js';
import {cleanDayCheck,cleanPlanB,cleanDraft,draftPreview,applyDraft,openNotes,keepChecks,MAX_NOTES,MAX_REST} from '../src/day-check.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},lauren={name:'Lauren',role:'parent'},child={name:'Nate',role:'child'};
const fresh=()=>ensureFeatures(structuredClone(seed));
const src=[{title:'Tokyo National Museum',url:'https://www.tnm.jp/'}];
// What a run of the check writes, the way the nightly route writes it.
const withCheck=(state,day,notes)=>({...state,dayChecks:{...state.dayChecks,[day]:cleanDayCheck({summary:'One thing',notes},state,day,'2026-10-01T10:30:00.000Z')}});

test('tomorrow’s check keeps only sourced notes, about stops on the day, and remembers what a parent decided',()=>{
 const state=fresh(),day='2026-10-02';
 const check=cleanDayCheck({summary:'x'.repeat(500),notes:[
  {kind:'closed',stepId:'2026-10-02-03',title:'Closed on the 2nd',detail:'Check the calendar.',act:true,sources:src},
  {kind:'weather',stepId:'',title:'Heavy rain from noon',detail:'',act:false,sources:[{title:'JMA',url:'https://www.jma.go.jp/'}]},
  {kind:'hours',stepId:'2026-10-03-17',title:'A stop on another day',detail:'',act:false,sources:src},
  {kind:'made-up',stepId:'nope',title:'Unsourced',detail:'',act:true,sources:[]},
  {kind:'other',stepId:'',title:'Insecure',detail:'',act:false,sources:[{title:'x',url:'http://example.com'}]}]},state,day);
 assert.equal(check.summary.length,300,'cut to what the card draws');
 assert.deepEqual(check.notes.map(n=>n.title),['Closed on the 2nd','Heavy rain from noon','A stop on another day']);
 assert.equal(check.notes[2].stepId,null,'a stop on another day is not pointed at');
 assert.ok(check.notes.every(n=>n.status==='open'&&n.id));
 const many=cleanDayCheck({notes:Array.from({length:20},(_,i)=>({kind:'other',stepId:'',title:`Note ${i}`,detail:'',act:false,sources:src}))},state,day);
 assert.equal(many.notes.length,MAX_NOTES);
 // Run again after a parent dismissed one: the same note keeps its id and stays dismissed.
 let s=withCheck(state,day,check.notes);
 const gone=s.dayChecks[day].notes[1];
 s=applyOperation(s,{type:'dayCheckNote',day,id:gone.id,status:'dismissed'},lauren);
 const again=cleanDayCheck({notes:[{kind:'weather',stepId:'',title:'Heavy rain from noon',detail:'Still.',act:false,sources:src}]},s,day);
 assert.equal(again.notes[0].id,gone.id);assert.equal(again.notes[0].status,'dismissed');assert.equal(again.notes[0].decidedBy,'Lauren');
 assert.equal(Object.keys(keepChecks(Object.fromEntries(Array.from({length:30},(_,i)=>[`2026-10-${String(i+1).padStart(2,'0')}`,{}])))).length,20);
});

test('a parent accepts a check note into the stop’s own notes, or dismisses it; the boys cannot',()=>{
 const day='2026-10-02';
 let state=withCheck(fresh(),day,[{kind:'closed',stepId:'2026-10-02-03',title:'Closed on the 2nd',detail:'Go to Ueno Park instead.',act:true,sources:src}]);
 const note=state.dayChecks[day].notes[0];
 assert.equal(openNotes(state,day).length,1);
 assert.throws(()=>applyOperation(state,{type:'dayCheckNote',day,id:note.id,status:'accepted'},child),/parent/);
 assert.throws(()=>applyOperation(state,{type:'dayCheckNote',day,id:'nope',status:'accepted'},parent),/no longer on the day/);
 assert.throws(()=>applyOperation(state,{type:'dayCheckNote',day,id:note.id,status:'maybe'},parent),/Accept or dismiss/);
 state=applyOperation(state,{type:'dayCheckNote',day,id:note.id,status:'accepted'},parent);
 const step=state.steps.find(s=>s.id==='2026-10-02-03');
 assert.match(step.notes,/Checked 2026-10-02: Closed on the 2nd — Go to Ueno Park instead\. \(https:\/\/www\.tnm\.jp\/\)$/);
 assert.equal(state.dayChecks[day].notes[0].status,'accepted');assert.equal(state.dayChecks[day].notes[0].decidedBy,'Damien');
 assert.equal(openNotes(state,day).length,0);
 // Accepting twice does not write the line twice.
 const twice=applyOperation(applyOperation(state,{type:'dayCheckNote',day,id:note.id,status:'open'},parent),{type:'dayCheckNote',day,id:note.id,status:'accepted'},parent);
 assert.equal(twice.steps.find(s=>s.id==='2026-10-02-03').notes.split('Checked 2026-10-02').length,2);
});

test('Plan B keeps fallbacks for stops on the day only, and builds its own map links',()=>{
 const state=fresh(),day='2026-10-02';
 const plan=cleanPlanB({stops:[
  {stepId:'2026-10-02-03',kind:'rain',title:'Tokyo National Museum',area:'Ueno Park',japanese:'東京国立博物館',why:'Indoors, five minutes away.',walkMinutes:5},
  {stepId:'2026-10-02-03',kind:'rain',title:'A duplicate for the same stop and reason',area:'',japanese:'',why:'',walkMinutes:5},
  {stepId:'2026-10-03-17',kind:'closed',title:'Another day',area:'',japanese:'',why:'',walkMinutes:1},
  {stepId:'2026-10-02-05',kind:'nonsense',title:'Yodobashi Akiba',area:'Akihabara',japanese:'',why:'',walkMinutes:999}],
  rest:Array.from({length:6},(_,i)=>({kind:'kids-floor',title:`Floor ${i}`,area:'Ueno',japanese:'',why:'',walkMinutes:3}))},state,day);
 assert.deepEqual(plan.stops.map(s=>s.title),['Tokyo National Museum','Yodobashi Akiba']);
 assert.equal(plan.stops[0].reason,'rain');assert.equal(plan.stops[1].reason,'tired','an unknown reason is read as the last one');
 assert.equal(plan.stops[1].walkMinutes,null,'an impossible walk is dropped, not believed');
 assert.match(plan.stops[0].mapUrl,/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
 assert.equal(plan.rest.length,MAX_REST);
});

test('a draft from Ask moves only stops that can move, and says what it would run into',()=>{
 const state=fresh();
 assert.equal(cleanDraft({changes:[{stepId:'2026-10-03-17',action:'move',day:'2026-10-04',time:'10:00'}]},state),null,'a booked stop is not the model’s to move');
 assert.equal(cleanDraft({changes:[{stepId:'nope',action:'move',day:'2026-10-04',time:'10:00'}]},state),null);
 assert.equal(cleanDraft({changes:[{stepId:'2026-10-03-09',action:'move',day:'2026-10-03',time:'14:15'}]},state),null,'moving to where it already is is not a change');
 const draft=cleanDraft({summary:'Tamagotchi to Friday',changes:[
  {stepId:'2026-10-03-09',action:'move',day:'2026-10-02',time:'13:00'},
  {stepId:'2026-10-03-09',action:'skip',day:'',time:''},
  {stepId:'2026-10-03-11',action:'skip',day:'',time:''},
  {stepId:'2026-10-03-10',action:'later',day:'',time:''},
  {stepId:'2026-10-03-06',action:'move',day:'2099-01-01',time:'25:00'}]},state);
 assert.deepEqual(draft.changes.map(c=>[c.id,c.action,c.day,c.time]),[
  ['2026-10-03-09','move','2026-10-02','13:00'],['2026-10-03-11','skip','2026-10-03','14:45'],['2026-10-03-10','later',null,null]],'one change per stop; a bad day and time mean no change');
 assert.deepEqual(draftPreview(state,draft).conflicts,[]);
 // Onto the booked Giants game: said plainly, and refused when applied.
 const clash=cleanDraft({changes:[{stepId:'2026-10-03-09',action:'move',day:'2026-10-03',time:'18:10'}]},state);
 assert.match(draftPreview(state,clash).conflicts[0],/would run into Giants vs DeNA \(booked for 18:00\)/);
 assert.throws(()=>applyOperation(state,{type:'askDraftApply',changes:clash.changes},parent),/Giants vs DeNA/);
});

test('a parent applies a draft in one tap; the whole of it goes through or none of it does',()=>{
 let state=fresh();
 const draft=cleanDraft({summary:'Tamagotchi to Friday',changes:[{stepId:'2026-10-03-09',action:'move',day:'2026-10-02',time:'13:00'},{stepId:'2026-10-03-11',action:'skip'},{stepId:'2026-10-03-10',action:'later'}]},state);
 state=applyOperation(state,{type:'askKeep',item:{id:'q1',at:'2026-10-01T09:00:00.000Z',question:'Should we move Tamagotchi?',verdict:'Yes',answer:'Friday is lighter.',draft}},parent);
 assert.equal(state.askThread[0].draft.changes.length,3,'the draft is kept with the answer for the other parent');
 assert.throws(()=>applyOperation(state,{type:'askDraftApply',itemId:'q1',changes:draft.changes},child),/parent/);
 const after=applyOperation(state,{type:'askDraftApply',itemId:'q1',changes:draft.changes},lauren);
 const moved=after.steps.find(s=>s.id==='2026-10-03-09');
 assert.equal(moved.day,'2026-10-02');assert.equal(moved.time,'13:00');
 const friday=after.steps.filter(s=>s.day==='2026-10-02').sort((a,b)=>a.order-b.order).map(s=>s.id);
 assert.ok(friday.indexOf('2026-10-03-09')>friday.indexOf('2026-10-02-05')&&friday.indexOf('2026-10-03-09')<friday.indexOf('2026-10-02-09'),'slotted in by its time');
 assert.equal(after.steps.find(s=>s.id==='2026-10-03-11').status,'skipped');
 const later=after.steps.find(s=>s.id==='2026-10-03-10');assert.equal(later.day,null);assert.equal(later.backlogFrom.day,'2026-10-03');
 assert.equal(after.askThread[0].draft.appliedBy,'Lauren');assert.ok(after.askThread[0].draft.appliedAt);
 assert.match(after.alerts[0].summary,/^From Ask: Tamagotchi Factory → 2026-10-02 13:00; THE MATCHA TOKYO skipped; Cat Street browse back to Options$/,'the other phones are told what moved');
 // Once applied, the same draft is stale: nothing is moved a second time.
 assert.throws(()=>applyOperation(after,{type:'askDraftApply',changes:draft.changes},parent),/moved on/);
 // Keeping the answer again does not undo the record of who applied it.
 const kept=applyOperation(after,{type:'askKeep',item:{id:'q1',at:'2026-10-01T09:00:00.000Z',question:'Should we move Tamagotchi?',draft}},parent);
 assert.equal(kept.askThread[0].draft.appliedBy,'Lauren');
 // A stop ticked off in the meantime fails the whole draft rather than half of it.
 const ticked=applyOperation(state,{type:'status',id:'2026-10-03-11',status:'done'},parent);
 assert.throws(()=>applyOperation(ticked,{type:'askDraftApply',changes:draft.changes},parent),/moved on/);
 assert.equal(applyOperation(state,{type:'status',id:'2026-10-03-11',status:'todo'},parent).steps.find(s=>s.id==='2026-10-03-09').day,'2026-10-03');
});

test('Ask hands a draft to a parent only, and the check names what it is searching for',async()=>{
 const {normaliseAnswer}=await import('../server/ask.mjs');
 const state=fresh();
 const found={verdict:'Move it',answer:'Friday is lighter.',because:[],days:[],checkFirst:'',sources:[],
  draft:{summary:'Tamagotchi to Friday',changes:[{stepId:'2026-10-03-09',action:'move',day:'2026-10-02',time:''}]}};
 assert.deepEqual(normaliseAnswer(found,state,parent).draft.changes,[{id:'2026-10-03-09',action:'move',day:'2026-10-02',time:null}]);
 assert.equal(normaliseAnswer(found,state,child).draft,undefined,'a boy gets the answer, not the button');
 assert.equal(normaliseAnswer({...found,draft:{summary:'',changes:[]}},state,parent).draft,undefined);
 const {tomorrowOf,dayBrief}=await import('../server/tomorrow.mjs');
 assert.equal(tomorrowOf(state,new Date('2026-10-01T10:30:00Z')),'2026-10-02','19:30 in Japan checks the next day');
 assert.equal(tomorrowOf(state,new Date('2026-10-01T16:30:00Z')),'2026-10-02','a scheduler running late, after midnight, still checks the day about to start');
 assert.equal(tomorrowOf(state,new Date('2026-10-06T10:30:00Z')),null,'the last evening has no tomorrow to check');
 const brief=dayBrief(state,'2026-10-03');
 assert.match(brief,/^The day: Saturday 2026-10-03, in Tokyo/);
 assert.match(brief,/\[2026-10-03-17\] 18:00 · Giants vs DeNA · .*booked for 18:00/);
});

test('the check keeps a source only when its site came back in the search, and runs within the function’s minute',async()=>{
 let seen=[];
 const upstream=createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{
  const r=JSON.parse(body);seen.push(r);const check=r.tools.some(t=>t.name==='record_check');
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({id:'m',type:'message',role:'assistant',model:r.model,stop_reason:'tool_use',usage:{input_tokens:1,output_tokens:1,server_tool_use:{web_search_requests:2}},
   content:[{type:'web_search_tool_result',tool_use_id:'s1',content:[{type:'web_search_result',url:'https://www.kahaku.go.jp/english/',title:'Kahaku'}]},
    check?{type:'tool_use',id:'c1',name:'record_check',input:{summary:'One thing',notes:[
     {kind:'hours',stepId:'2026-10-02-03',title:'Last entry 16:30',detail:'Closes at 17:00.',act:false,sources:[{title:'Kahaku',url:'https://www.kahaku.go.jp/english/visit/'},{title:'Invented',url:'https://made-up.example/'}]},
     {kind:'closed',stepId:'2026-10-02-04',title:'Only an invented source',detail:'',act:true,sources:[{title:'Invented',url:'https://made-up.example/'}]}]}}
    :{type:'tool_use',id:'c2',name:'record_plan_b',input:{stops:[],rest:[{kind:'playground',title:'Kids floor',area:'Ueno',japanese:'',why:'',walkMinutes:4}]}}]}));
 });});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const previousKey=process.env.ANTHROPIC_API_KEY,previousUrl=process.env.ANTHROPIC_BASE_URL;
 process.env.ANTHROPIC_API_KEY='test-key';process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {checkDay,planBDay}=await import('../server/tomorrow.mjs');
  const state=fresh();
  const {check}=await checkDay(state,'2026-10-02');
  assert.deepEqual(check.notes.map(n=>n.title),['Last entry 16:30'],'a note whose only source was never searched is dropped');
  assert.deepEqual(check.notes[0].sources.map(s=>s.url),['https://www.kahaku.go.jp/english/visit/']);
  const {planB}=await planBDay(state,'2026-10-02');
  assert.equal(planB.rest[0].title,'Kids floor');
  const [first]=seen;
  assert.equal(first.tools.find(t=>t.name==='web_search').max_uses,6);
  assert.deepEqual(first.output_config,{effort:'low'},'kept quick: the function has sixty seconds for both');
  assert.match(first.system,/Many Tokyo and Kyoto museums, galleries and gardens close on Mondays/);
  assert.match(first.system,/Early October is still typhoon season/);
  assert.match(first.messages[0].content,/\[2026-10-02-03\] 09:15 · Tsukiji market snacks/);
 }finally{
  upstream.close();
  if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;
  if(previousUrl===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=previousUrl;
 }
});

test('the nightly route needs the cron secret, and the day is checked on the day’s own screen',async()=>{
 const handler=(await import('../server/handler.mjs')).default;
 const call=async(url,headers={})=>{let status=200,body='';const res={statusCode:200,setHeader(){},end(b){body=b;status=this.statusCode;}};
  await handler({method:'GET',url,headers:{host:'localhost',...headers}},res);return {status,body:JSON.parse(body)};};
 const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='a-long-enough-secret-for-cron';
 try{
  assert.equal((await call('/api/tomorrow-check')).status,403);
  assert.equal((await call('/api/tomorrow-check',{authorization:'Bearer wrong-secret-of-some-length'})).status,403);
 }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
 const vercel=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.deepEqual(vercel.crons,[{path:'/api/tomorrow-check',schedule:'30 10 * * *'}],'19:30 in Japan, every evening');
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/import DayCheck,\{StopPlanB\} from '\.\/DayCheck\.jsx';/,'in the shell, for no signal');
 assert.match(main,/<StopPlanB state=\{visibleState\} step=\{current\}\/>/);
 const page=await readFile(new URL('../src/DayCheck.jsx',import.meta.url),'utf8');
 assert.match(page,/request\('day-check',\{day,parts\}\)/);
 assert.match(page,/mutate\(\{type:'dayCheckNote',day,id:n\.id,status:'accepted'\}\)/);
});
