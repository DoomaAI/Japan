import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyOperation} from '../server/model.mjs';
import {ensureFeatures} from '../src/trip-features.js';
import {press,shown,KEYS} from '../src/numpad-data.js';
import {timeLeft,dayPace,spoken} from '../src/time-left.js';
import {wordsOf,litCount,beats} from '../src/synced-words.js';
import {findAnything} from '../src/find-data.js';
import {ringsFor,dayScore,PHOTO_TARGET,cleanRings,shownRings,RING_IDS} from '../src/rings-data.js';
import {rankings} from '../src/leaderboard-data.js';
import {blendFor,blendLines,blendDue} from '../src/blend-data.js';
import {isDeveloping,developsAt,momentFor,inMoment,momentAccepts,rollFor,developingStub} from '../src/film-data.js';
import {buildQuiz,quizAction,scores,questionOpen,WINDOW_SECONDS} from '../src/quiz-data.js';
import {flightPlan,cameraAt,project,offsetKm,recordingType} from '../src/flyover-data.js';
import {replayFrames} from '../src/memory-map.js';
import {visibleTrip} from '../server/visibility.mjs';
import {photosFor} from '../src/trip-features.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const damien={name:'Damien',role:'parent'},lauren={name:'Lauren',role:'parent'},nate={name:'Nate',role:'child'},boston={name:'Boston',role:'child'};
const fresh=()=>ensureFeatures(structuredClone(seed));

test('the number pad takes digits like a payment app, and flips with the answer carried across',()=>{
 let a='';for(const k of ['1','2','0','0'])a=press(a,k,'JPY');
 assert.equal(a,'1200');assert.equal(shown(a,'JPY'),'¥1,200');
 assert.equal(press(a,'.','JPY'),'1200','yen have no cents');assert.equal(press(a,'back','JPY'),'120');
 assert.equal(press('0','5','JPY'),'5','no leading noughts');assert.equal(press('123456789','1','JPY'),'123456789','nine digits is plenty');
 let d=press('','.','AUD');assert.equal(d,'0.');d=press(press(d,'5','AUD'),'0','AUD');assert.equal(d,'0.50');assert.equal(press(d,'1','AUD'),'0.50','two decimals for dollars');
 assert.deepEqual(KEYS('JPY').slice(-3),['00','0','back']);assert.deepEqual(KEYS('AUD').slice(-3),['.','0','back']);
});

test('time left in today scales what is still to do by how fast the day has actually gone',()=>{
 let state=fresh();const day='2026-09-28';
 const first=timeLeft(state,day,new Date(`${day}T00:00:00Z`));
 assert.match(first.text,/^About .* of plan left · \d+ stops, done around \d\d:\d\d$/);assert.equal(first.pace,null,'no pace until something is done');
 const steps=state.steps.filter(s=>s.day===day).slice(0,2);
 for(const s of steps){state=applyOperation(state,{type:'status',id:s.id,status:'started',at:'2026-09-27T23:00:00.000Z'},damien);state=applyOperation(state,{type:'status',id:s.id,status:'done',at:'2026-09-28T00:00:00.000Z'},damien);}
 assert.equal(dayPace(state.steps.filter(s=>s.day===day)),2,'an hour each for half-hour stops, capped at twice as slow');
 const slow=timeLeft(state,day,new Date(`${day}T01:00:00Z`));
 assert.match(slow.text,/at this pace/);assert.equal(slow.paceWord,'running slower than planned');assert.ok(slow.minutes>first.minutes*1.5);
 assert.equal(spoken(130),'2 hours 15 min');assert.equal(spoken(5),'15 min');
});

test('synced words light the romaji in step with the voice, or on a steady beat',()=>{
 const words=wordsOf('Sumimasen, eigo no menyū wa arimasu ka?');
 assert.equal(words.length,7);
 assert.equal(litCount(words,20,0),1);assert.equal(litCount(words,20,19),7);assert.equal(litCount(words,20,10),4);
 const b=beats(['arigatō','gozaimasu'],0.8);assert.ok(b[1]>b[0]);assert.ok(beats(['a'],0.4)[0]>beats(['a'],0.8)[0],'slower is longer');
});

test('type anything finds a screen, a phrase, a hotel, a person and a stop, best match first',()=>{
 const state=fresh();
 assert.deepEqual(findAnything(state,'h',damien),[],'one letter is not a search');
 assert.equal(findAnything(state,'wallet',damien)[0].kind,'Screen');
 assert.ok(findAnything(state,'thank you',damien).some(h=>h.kind==='Phrase'));
 assert.equal(findAnything(state,'hilton',damien)[0].kind,'Hotel');
 assert.ok(findAnything(state,'boston',damien).some(h=>h.kind==='Person'));
 assert.ok(findAnything(state,'giants',damien).some(h=>h.step?.title==='Giants vs DeNA'));
 assert.ok(!findAnything(state,'ledger',nate).some(h=>h.page==='ledger'),'a boy is not offered the parents’ screens');
 assert.ok(findAnything(state,'a',damien).length<=8);
});

test('three rings close on the day’s stops, five photos and the phrase, and score the leaderboard',()=>{
 let state=fresh();const day='2026-10-02';
 const rings=ringsFor(state,'Nate',day);
 assert.deepEqual(rings.map(r=>[r.id,r.done,r.target]),[['stops',0,rings[0].target],['photos',0,PHOTO_TARGET],['phrase',0,1]]);
 state=applyOperation(state,{type:'phraseSeen',person:'Nate',day},nate);
 assert.equal(dayScore(state,'Nate',day),1);
 for(const s of state.steps.filter(s=>s.day===day))state=applyOperation(state,{type:'status',id:s.id,status:'done'},damien);
 assert.equal(dayScore(state,'Nate',day),2);
 const board=rankings(state,'2026-10-02').find(b=>b.id==='rings');
 assert.equal(board.label,'Rings closed');assert.deepEqual(board.leaders,['Nate']);
});

test('extra rings are chosen and ordered on the phone, and never change the score',()=>{
 let state=fresh();const day='2026-10-02';
 assert.deepEqual(shownRings(null),['stops','photos','phrase']);
 const prefs=cleanRings({order:['voice','nope','stops','voice'],shown:['voice','fact','nope']});
 assert.deepEqual(prefs.order,['voice','stops',...RING_IDS.filter(id=>!['voice','stops'].includes(id))],'unknown and repeated ids go, the rest follow');
 assert.deepEqual(shownRings(prefs),['voice','fact']);
 assert.deepEqual(cleanRings({shown:[]}).shown,['stops','photos','phrase'],'never an empty card');
 state=applyOperation(state,{type:'factSeen',person:'Nate',day},nate);
 const [fact,rated]=ringsFor(state,'Nate',day,['fact','rated']);
 assert.equal(fact.closed,true);assert.equal(rated.target,0);
 assert.equal(dayScore(state,'Nate',day),0,'only the first three count on the leaderboard');
});

test('the Blend finds what two of us both starred and the stop we never agreed on',()=>{
 let state=fresh();const steps=state.steps.filter(s=>s.day==='2026-09-30').slice(0,3);
 const rate=(s,p,r)=>{state=applyOperation(state,{type:'stepRating',id:s.id,person:p,rating:r},damien);};
 rate(steps[0],'Nate',5);rate(steps[0],'Boston',5);rate(steps[1],'Nate',5);rate(steps[1],'Boston',1);rate(steps[2],'Nate',3);rate(steps[2],'Boston',3.5);
 const bl=blendFor(state,'Nate','Boston');
 assert.deepEqual(bl.both.map(s=>s.title),[steps[0].title]);
 assert.equal(bl.apart.title,steps[1].title);assert.equal(bl.match,67,'two of three within a star');
 const lines=blendLines(bl).map(([,t])=>t);
 assert.ok(lines.includes('Nate + Boston'));assert.ok(lines.some(l=>l.startsWith(`${steps[1].title}: Nate 5★, Boston 1★`)));
 assert.equal(blendFor(state,'Nate','Nate'),null);
 assert.equal(blendDue(state,'2026-09-30'),false);assert.equal(blendDue(state,'2026-10-05'),true);assert.equal(blendDue(state,'2026-10-20'),true);
});

test('a film photo is hidden from every phone until seven the next morning; the moment is the same two minutes everywhere',()=>{
 const p={id:'p1',by:'Nate',for:'Nate',day:'2026-10-02',film:true,pathname:'photos/x.jpg',gps:{lat:1,lng:2},at:'2026-10-02T05:00:00Z'};
 assert.equal(new Date(developsAt(p)).toISOString(),'2026-10-02T22:00:00.000Z','07:00 Japan time on the 3rd');
 assert.equal(isDeveloping(p,Date.parse('2026-10-02T21:59:00Z')),true);assert.equal(isDeveloping(p,Date.parse('2026-10-02T22:00:00Z')),false);
 let state={...fresh(),photos:[p,{...p,id:'p2',film:false}]};
 const seen=visibleTrip(state,nate,new Date('2026-10-02T12:00:00Z'));
 assert.deepEqual(seen.photos[0],developingStub(p),'not even to the boy who took it');assert.equal(seen.photos[0].pathname,undefined);
 assert.equal(seen.photos[1].pathname,'photos/x.jpg');
 assert.equal(visibleTrip(state,nate,new Date('2026-10-03T00:00:00Z')).photos[0].pathname,'photos/x.jpg','developed');
 assert.deepEqual(rollFor(state,'2026-10-03',Date.parse('2026-10-02T22:30:00Z')).map(x=>x.id),['p1']);
 const m=momentFor('2026-10-02');
 assert.deepEqual(momentFor('2026-10-02'),m,'the same on every phone');
 const [h]=m.clock.split(':').map(Number);assert.ok(h>=10&&h<20);assert.equal(m.end-m.start,120000);
 assert.equal(inMoment('2026-10-02',m.start+60000),true);assert.equal(inMoment('2026-10-02',m.end),false);
 assert.equal(momentAccepts('2026-10-02',m.end+60000),true,'an upload still on its way');assert.notEqual(momentFor('2026-10-03').clock,m.clock);
});

test('the dinner quiz: five questions from the trip, answers from every phone, the answer hidden until the question closes',()=>{
 let state=fresh();
 state=applyOperation(state,{type:'factSeen',person:'Nate',day:'2026-09-23',factIds:['sumo-salt','haneda','crossing','meiji-forest','clocks']},nate);
 const qs=buildQuiz(state,'2026-10-03',42);
 assert.ok(qs.length>=3&&qs.length<=5);for(const q of qs){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4,q.q);assert.ok(q.answer>=0&&q.answer<4);}
 assert.deepEqual(buildQuiz(state,'2026-10-03',42),qs,'the host’s seed fixes the quiz for every phone');
 const t0=new Date('2026-10-03T09:00:00Z');
 assert.equal(quizAction(state,{action:'start',day:'2026-10-03',seed:42},nate,t0).error,'A parent hosts the quiz.');
 state=quizAction(state,{action:'start',day:'2026-10-03',seed:42},lauren,t0).state;
 assert.equal(state.quiz.host,'Lauren');assert.equal(state.quiz.index,0);
 const q=state.quiz.questions[0];
 // A buzzer phone is not sent the answer while the question is open.
 const buzzer=visibleTrip(state,nate,new Date(+t0+5000)).quiz;
 assert.equal(buzzer.questions[0].answer,null);assert.equal(visibleTrip(state,lauren,new Date(+t0+5000)).quiz.questions[0].answer,q.answer);
 state=quizAction(state,{action:'answer',index:0,choice:q.answer},nate,new Date(+t0+2000)).state;
 state=quizAction(state,{action:'answer',index:0,choice:(q.answer+1)%4},boston,new Date(+t0+3000)).state;
 assert.equal(quizAction(state,{action:'answer',index:0,choice:q.answer},boston,new Date(+t0+4000)).state.quiz.answers[0].Boston.choice,(q.answer+1)%4,'first answer stands');
 assert.deepEqual(Object.keys(visibleTrip(state,boston,new Date(+t0+5000)).quiz.answers[0]),['Boston'],'nobody else’s answer while it is open');
 assert.equal(quizAction(state,{action:'answer',index:0,choice:1},damien,new Date(+t0+(WINDOW_SECONDS+1)*1000)).error,'Too late for that one.');
 assert.equal(questionOpen(state.quiz,+t0+(WINDOW_SECONDS+1)*1000),false);
 assert.equal(visibleTrip(state,nate,new Date(+t0+(WINDOW_SECONDS+1)*1000)).quiz.questions[0].answer,q.answer,'shown once it closes');
 const board=scores(state.quiz);assert.equal(board[0].person,'Nate');assert.ok(board[0].score>900,'right and fast');assert.equal(board.find(r=>r.person==='Boston').score,0);
 assert.equal(quizAction(state,{action:'next'},nate,t0).error,'The host moves the quiz on.');
 const next=quizAction(state,{action:'next'},lauren,new Date(+t0+60000)).state;assert.equal(next.quiz.index,1);
 assert.equal(quizAction(next,{action:'end'},lauren,new Date(+t0+70000)).state.quiz.done,true);
});

test('the flyover flies the replay’s frames: quick legs in town, long glides between cities, a pause for each new day',()=>{
 const state=fresh(),{frames}=replayFrames(state),plan=flightPlan(frames);
 assert.ok(frames.length>10);assert.equal(plan.legs.length,frames.length);
 assert.ok(plan.legs.some(l=>l.far),'a Shinkansen somewhere');
 assert.ok(plan.duration>30&&plan.duration<600,`${plan.duration}s is a watchable video`);
 const mid=plan.legs.find(l=>l.far),cam=cameraAt(plan,(mid.start+mid.end)/2-0.8);
 assert.ok(cam.width>20,'pulled out wide over a long hop');
 assert.equal(cameraAt(plan,0).frame,frames[0]);assert.equal(cameraAt(plan,plan.duration+5).frame,frames.at(-1));
 const view={width:6,w:1080,h:1080};
 const ahead=project({x:0,y:2},view),here=project({x:0,y:0},view);
 assert.ok(ahead.y<here.y&&ahead.scale<here.scale,'further ahead is higher up and smaller');
 assert.equal(project({x:0,y:500},view),null,'past the horizon is not drawn');
 assert.ok(Math.abs(offsetKm({lat:35,lng:139},{lat:35.01,lng:139}).y-1.1)<0.01);
 assert.equal(recordingType(t=>t==='video/mp4'),'video/mp4');assert.equal(recordingType(()=>false),null);
});
