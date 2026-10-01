import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures,partyBrief} from '../src/trip-features.js';
import {etiquetteFor,escalatorSide} from '../src/etiquette-data.js';
import {insiderWanted,cleanInsider,insiderShown} from '../src/insider-data.js';
import {tasteLines,learnedBrief,themesOf} from '../src/taste-data.js';
import {requestText,partyOf} from '../src/concierge-data.js';
import {tripProject} from '../src/trip-project.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const parent={name:'Damien',role:'parent'},nate={name:'Nate',role:'child'},boston={name:'Boston',role:'child'};
const fresh=()=>ensureFeatures(structuredClone(seed));
const step=(state,re)=>state.steps.find(s=>re.test(s.title));

test('etiquette is matched to the kind of stop, with a boys’ version and the escalator by city',()=>{
 const state=fresh();
 const todaiji=etiquetteFor(step(state,/Todai-ji/),'Nara / Kyoto');
 assert.equal(todaiji[0].id,'temple');assert.match(todaiji[0].grown[0],/No clapping at a temple/);assert.ok(todaiji[0].boys.length);
 const nozomi=etiquetteFor(step(state,/^Nozomi 33/),'Kyoto').map(e=>e.id);
 assert.deepEqual(nozomi.slice(0,2),['shinkansen','train'],'the Shinkansen first, then trains in general');
 assert.ok(nozomi.includes('escalator'));
 assert.equal(escalatorSide('Osaka').side,'right');assert.equal(escalatorSide('Tokyo').side,'left');
 assert.ok(etiquetteFor(step(state,/Takoyaki/),'Osaka').some(e=>e.id==='street-food'));
 assert.deepEqual(etiquetteFor({title:'Check in and reset',place:'Hotel Kanra Kyoto'}),[],'nothing to say about a hotel room');
});

test('a stop’s manners become a boy’s mission on that stop’s day, once',()=>{
 let state=fresh();const s=step(state,/Todai-ji/);
 state=applyOperation(state,{type:'etiquetteMission',person:'Nate',rule:'temple',stepId:s.id},nate);
 const m=state.challenges.at(-1);
 assert.equal(m.title,'Temple quiet');assert.equal(m.day,s.day);assert.deepEqual(m.participants,['Nate']);assert.match(m.notes,/Todai-ji/);
 assert.throws(()=>applyOperation(state,{type:'etiquetteMission',person:'Nate',rule:'temple',stepId:s.id},nate),/already on the day/);
 assert.throws(()=>applyOperation(state,{type:'etiquetteMission',person:'Boston',rule:'temple',stepId:s.id},nate),/your own/);
 assert.throws(()=>applyOperation(state,{type:'etiquetteMission',person:'Damien',rule:'temple',stepId:s.id},parent),/for the boys/);
 state=applyOperation(state,{type:'etiquetteMission',person:'Boston',rule:'temple',stepId:s.id},parent);
 assert.deepEqual(state.challenges.at(-1).participants,['Boston']);
});

test('insider notes are drafted for the stops worth one, read over by a parent, and shown to the boys only once passed',()=>{
 let state=fresh();
 const wanted=insiderWanted(state,'2026-10-03').map(s=>s.title);
 assert.ok(wanted.includes('Kawaii Monster Land'));assert.ok(!wanted.some(t=>/Shuttle|return to Hilton/i.test(t)),'not the train or the hotel');
 assert.ok(wanted.length<=8);
 assert.equal(cleanInsider({queue:'',payment:''}),null,'nothing useful, no note');
 const n=cleanInsider({queue:'Take a numbered ticket from the machine first.',payment:'Cash only.',access:'',lockers:'',bestTime:'',mistake:'x'.repeat(500),sources:[{title:'a',url:'https://a.jp'},{title:'b',url:'http://b.jp'}]});
 assert.equal(n.mistake.length,300);assert.deepEqual(n.sources.map(s=>s.url),['https://a.jp/']);
 const id=step(state,/Kawaii Monster/).id;
 state={...state,insider:{[id]:{...n,status:'draft',at:'2026-10-02T10:00:00Z'}}};
 assert.equal(insiderShown(state,id,false),null,'a boy does not see a draft');assert.ok(insiderShown(state,id,true));
 assert.throws(()=>applyOperation(state,{type:'insiderReview',stepId:id,status:'reviewed'},boston),/parent/);
 const passed=applyOperation(state,{type:'insiderReview',stepId:id,status:'reviewed',patch:{payment:'Cash and IC cards.'}},parent);
 assert.equal(passed.insider[id].payment,'Cash and IC cards.');assert.equal(passed.insider[id].reviewedBy,'Damien');
 assert.ok(insiderShown(passed,id,false));
 assert.ok(!insiderWanted(passed,'2026-10-03').some(s=>s.id===id),'a stop with a note is not looked up again');
 const gone=applyOperation(state,{type:'insiderReview',stepId:id,status:'dismissed'},parent);
 assert.equal(insiderShown(gone,id,true),null);
});

test('the guide learns from stars, foods, skips and noticings, and every model call hears it',()=>{
 let state=fresh();
 const rides=state.steps.filter(s=>s.day==='2026-09-30'&&themesOf(s).includes('rides')).slice(0,3);
 assert.equal(rides.length,3);
 for(const s of rides)state=applyOperation(state,{type:'stepRating',id:s.id,person:'Boston',rating:5},parent);
 const temples=state.steps.filter(s=>themesOf(s).includes('temples')).slice(0,2);
 for(const s of temples)state=applyOperation(state,{type:'stepRating',id:s.id,person:'Boston',rating:2},parent);
 state=applyOperation(state,{type:'foodRating',itemId:'takoyaki',person:'Boston',rating:5},parent);
 const lines=tasteLines(state,'Boston');
 assert.match(lines[0],/^rides and theme parks \(5★ over 3\) lands with Boston$/);
 assert.match(lines[1],/^temples and shrines \(2★ over 2\) does not$/);
 assert.match(lines.join('\n'),/loved: Takoyaki/);
 assert.deepEqual(tasteLines(state,'Nate'),[],'one star from one person is not learning about another');
 assert.match(learnedBrief(state),/weigh suggestions towards what landed/);
 assert.match(partyBrief(state),/- Boston: rides and theme parks \(5★ over 3\) lands with Boston/,'suggestions and near-here searches hear it');
 assert.match(tripProject(state,'Boston').personal,/What the trip so far has shown/,'and so does Ask');
 for(const s of state.steps.filter(s=>themesOf(s).includes('temples')).slice(2,4))state=applyOperation(state,{type:'status',id:s.id,status:'skipped'},parent);
 assert.match(learnedBrief(state),/Skipped more than once: temples and shrines \(2\)/);
});

test('the front desk gets the request in polite Japanese, with the party and the allergies filled in',()=>{
 let state=fresh();
 state=applyOperation(state,{type:'partyPerson',name:'Nate',age:5},parent);
 state=applyOperation(state,{type:'partyPerson',name:'Boston',age:8},parent);
 state=applyOperation(state,{type:'allergySet',person:'Nate',allergens:['peanut'],severe:true,note:''},parent);
 assert.deepEqual(partyOf(state),{adults:2,children:2,ages:[5,8]});
 const r=requestText(state,'restaurant',{place:'Sushi Dai',japanese:'寿司大',date:'2026-10-03',time:'18:30',flex:'17:30–19:30'});
 assert.equal(r.ja[0],'恐れ入りますが、こちらのレストランの予約をお願いできますでしょうか。');
 assert.ok(r.ja.includes('店名：寿司大'));assert.ok(r.ja.includes('日時：10月3日 18:30'));
 assert.ok(r.ja.includes('人数：大人2名、子ども2名（5歳・8歳）'));
 assert.ok(r.ja.some(l=>/^アレルギー：落花生（重度です）/.test(l)));
 assert.ok(r.en.some(l=>/Peanut \(severe\)/.test(l)));
 const taxi=requestText(state,'taxi',{date:'2026-10-03',time:'16:30',place:'Tokyo Dome',bags:'0'});
 assert.ok(taxi.ja.includes('チャイルドシートがあればお願いします。'),'a five-year-old asks for a child seat');
 assert.ok(!taxi.ja.some(l=>/スーツケース/.test(l)));
 assert.match(requestText(state,'lost',{item:'Blue backpack',where:'Ginza Line',date:'2026-10-02',time:'15:00'}).ja.join('\n'),/忘れ物：Blue backpack\n場所：Ginza Line\n日時：10月2日 15:00頃/);
 assert.equal(requestText(state,'nope',{}),null);
});

test('the nightly run drafts insider notes for tomorrow, keeping a source only when it was searched',async()=>{
 const upstream=createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{const r=JSON.parse(body);
  const id=(r.messages[0].content.match(/\[([^\]]+)\]/)||[])[1];
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({id:'m',type:'message',role:'assistant',model:r.model,stop_reason:'tool_use',usage:{input_tokens:1,output_tokens:1,server_tool_use:{web_search_requests:1}},
   content:[{type:'web_search_tool_result',tool_use_id:'s',content:[{type:'web_search_result',url:'https://kawaii.example.jp/',title:'k'}]},
    {type:'tool_use',id:'c',name:'record_insider',input:{stops:[{stepId:id,queue:'Book a time slot online; walk-ins wait.',payment:'Cards',access:'',lockers:'Coin lockers at the station',bestTime:'Opening',mistake:'',sources:[{title:'Official',url:'https://kawaii.example.jp/visit'},{title:'Made up',url:'https://nowhere.example/'}]},{stepId:'not-a-stop',queue:'x',payment:'',access:'',lockers:'',bestTime:'',mistake:'',sources:[]}]}}]}));});});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const prev=[process.env.ANTHROPIC_API_KEY,process.env.ANTHROPIC_BASE_URL];
 process.env.ANTHROPIC_API_KEY='k';process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 try{
  const {insiderDay}=await import('../server/tomorrow.mjs');
  const {notes}=await insiderDay(fresh(),'2026-10-03');
  const [id]=Object.keys(notes);
  assert.equal(Object.keys(notes).length,1,'a stop that is not on the day is dropped');
  assert.equal(notes[id].queue,'Book a time slot online; walk-ins wait.');
  assert.deepEqual(notes[id].sources.map(s=>s.url),['https://kawaii.example.jp/visit']);
 }finally{
  upstream.close();
  if(prev[0]===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=prev[0];
  if(prev[1]===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=prev[1];
 }
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/<StopInsider state=\{visibleState\} step=\{current\}/);assert.match(main,/<StopEtiquette state=\{visibleState\} step=\{current\}/);
 assert.match(await readFile(new URL('../src/StayCard.jsx',import.meta.url),'utf8'),/\{parent&&<ConciergeDesk state=\{state\} day=\{day\} notice=\{notice\}\/>\}/);
});
