// The dinner quiz: Kahoot's shape for a table waiting on its food. A parent's phone hosts five
// questions built from the trip — the fun facts we have read, the phrases we have learned, today's
// stops and their times — and every other phone is a buzzer with four coloured answers. Points for
// right, and more for fast.
//
// There is no live line between the phones: a phone hears about the quiz on its refresh, which the
// quiz screen runs every few seconds while it is open. So each question has a generous window on a
// shared clock, answers are taken until it closes, and the host shows the scores after. Fast enough
// for a table, not for a millisecond buzzer, and the screen says so.
import {ALL_FACTS,gentleFacts} from './fact-data.js';
import {ALL_PHRASES} from './phrasebook-data.js';
import {activeSteps,minutes,asClock} from './timing.js';
export const QUESTIONS=5,WINDOW_SECONDS=25,BASE_POINTS=500,SPEED_POINTS=500;
export const COLOURS=['red','blue','yellow','green'];
// A small seeded shuffle, so every phone builds nothing itself: the host's start fixes the order.
function rng(seed){let s=seed>>>0||1;return()=>{s=Math.imul(s^(s>>>15),2246822507)>>>0;s=Math.imul(s^(s>>>13),3266489909)>>>0;s^=s>>>16;return (s>>>0)/4294967296;};}
const shuffle=(list,r)=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const seenBy=(state,key)=>new Set(Object.values(state?.[key]||{}).flatMap(o=>Object.keys(o||{})));
// Four options with the right one somewhere among them; the index of the right one is kept.
const ask=(q,right,wrong,r,source)=>{const options=shuffle([right,...wrong.slice(0,3)],r);return {q,options,answer:options.indexOf(right),source};};
// A number in a fact, blanked out, with three plausible neighbours.
function factQuestion(f,r){
 const m=/\b(\d{2,5})\b/.exec(f.text.replace(/,(\d{3})/g,'$1'));if(!m)return null;
 const n=Number(m[1]),text=f.text.replace(/,(\d{3})/g,'$1');
 const near=[...new Set([n*2,Math.round(n/2),n+10,n-10,n+100,Math.round(n*1.5)].filter(x=>x>0&&x!==n&&!(n>=1800&&n<=2100&&Math.abs(x-n)>60)))];
 const years=n>=1800&&n<=2100?[n-12,n+9,n-31]:near;
 const q=`${f.icon||'💡'} Fill the gap: “${text.slice(Math.max(0,m.index-90),m.index).replace(/^\S*\s/,'…')}___${text.slice(m.index+m[1].length,m.index+m[1].length+40).replace(/\s\S*$/,'')}…”`;
 return ask(q,String(n),shuffle(years,r).map(String),r,`fact:${f.id}`);
}
function phraseQuestion(p,pool,r){
 if(!p.romaji||!p.en)return null;
 return ask(`💬 What does “${p.romaji}” mean?`,p.en,shuffle(pool.filter(x=>x.id!==p.id&&x.en&&x.en!==p.en).map(x=>x.en),r),r,`phrase:${p.id}`);
}
function stopQuestions(state,day,r){
 const steps=activeSteps(state,day).filter(s=>s.status!=='skipped'&&s.time);
 const out=[];
 const timed=steps.filter(s=>s.locked||s.bookingTime);
 for(const s of shuffle(timed,r).slice(0,1)){
  const t=minutes(s.time),wrong=[t-30,t+30,t+60,t-60,t+90].filter(x=>x>=0&&x<1440).map(asClock);
  out.push(ask(`⏰ What time was ${s.title}?`,s.time,shuffle(wrong,r),r,`stop:${s.id}`));
 }
 if(steps.length>=4){
  const four=shuffle(steps,r).slice(0,4),first=[...four].sort((a,b)=>a.time.localeCompare(b.time))[0];
  out.push(ask('🗓️ Which of these came first today?',first.title,four.filter(s=>s!==first).map(s=>s.title),r,'stop:first'));
 }
 return out;
}
// Five questions from what the family has met so far. Gentle facts only when a boy who is always
// with a grown-up is at the table.
export function buildQuiz(state,day,seed,{gentle=false}={}){
 const r=rng(seed),seenFacts=seenBy(state,'factLog'),seenPhrases=seenBy(state,'phraseLog');
 let facts=ALL_FACTS().filter(f=>seenFacts.has(f.id));if(gentle)facts=gentleFacts(facts);
 const phrases=ALL_PHRASES().filter(p=>seenPhrases.has(p.id));
 const pool=[...stopQuestions(state,day,r),
  ...shuffle(facts,r).map(f=>factQuestion(f,r)).filter(Boolean).slice(0,3),
  ...shuffle(phrases.length>=4?phrases:ALL_PHRASES().slice(0,40),r).map(p=>phraseQuestion(p,ALL_PHRASES(),r)).filter(Boolean).slice(0,3)];
 const picked=shuffle(pool,r).slice(0,QUESTIONS);
 return picked.filter(q=>q.options.length===4&&q.answer>=0);
}
const at=(quiz,now)=>Math.max(0,(now-Date.parse(quiz.openedAt||0))/1000);
export const questionOpen=(quiz,now=Date.now())=>!!quiz&&!quiz.done&&quiz.index>=0&&at(quiz,now)<WINDOW_SECONDS;
export const secondsLeft=(quiz,now=Date.now())=>quiz?Math.max(0,Math.ceil(WINDOW_SECONDS-at(quiz,now))):0;
export function points(quiz,index,answer){
 const q=quiz.questions[index];if(!q||!answer||answer.choice!==q.answer)return 0;
 const took=Math.max(0,(Date.parse(answer.at)-Date.parse(quiz.opened?.[index]||quiz.openedAt))/1000);
 return BASE_POINTS+Math.round(SPEED_POINTS*Math.max(0,1-took/WINDOW_SECONDS));
}
export function scores(quiz){
 const total={};
 for(const [i,answers] of Object.entries(quiz?.answers||{}))for(const [person,a] of Object.entries(answers))total[person]=(total[person]||0)+points(quiz,Number(i),a);
 return Object.entries(total).map(([person,score])=>({person,score})).sort((a,b)=>b.score-a.score||a.person.localeCompare(b.person));
}
// Every quiz action, on the trip as it stands; answers from many phones at once are each added to
// whatever is there, so none of them is turned away for arriving second.
export function quizAction(state,b,user,now=new Date()){
 const iso=now.toISOString(),parent=user?.role==='parent',quiz=state.quiz||null;
 const fail=m=>({error:m});
 if(b.action==='start'){
  if(!parent)return fail('A parent hosts the quiz.');
  if(!state.days?.some(d=>d.date===b.day))return fail('Choose a trip day.');
  const questions=buildQuiz(state,b.day,Number(b.seed)||Date.now(),{gentle:!!b.gentle});
  if(questions.length<3)return fail('Not enough of the trip has been met yet to make a quiz. Read a few fun facts first.');
  return {state:{...state,quiz:{id:`quiz-${iso}`,host:user.name,day:b.day,questions,index:0,openedAt:iso,opened:{0:iso},answers:{},done:false}}};
 }
 if(!quiz)return fail('There is no quiz on.');
 if(b.action==='next'||b.action==='end'){
  if(user.name!==quiz.host&&!parent)return fail('The host moves the quiz on.');
  if(b.action==='end'||quiz.index>=quiz.questions.length-1)return {state:{...state,quiz:{...quiz,done:true,endedAt:iso}}};
  const index=quiz.index+1;
  return {state:{...state,quiz:{...quiz,index,openedAt:iso,opened:{...quiz.opened,[index]:iso}}}};
 }
 if(b.action==='answer'){
  if(!state.members?.includes(user.name))return fail('Only the family plays.');
  if(b.index!==quiz.index)return fail('That question has gone.');
  if(!questionOpen(quiz,+now))return fail('Too late for that one.');
  if(!Number.isInteger(b.choice)||b.choice<0||b.choice>3)return fail('Choose one of the four.');
  if(quiz.answers?.[quiz.index]?.[user.name])return {state};
  const answers={...quiz.answers,[quiz.index]:{...(quiz.answers?.[quiz.index]||{}),[user.name]:{choice:b.choice,at:iso}}};
  return {state:{...state,quiz:{...quiz,answers}}};
 }
 if(b.action==='clear'){if(!parent)return fail('A parent clears the quiz.');const {quiz:_,...rest}=state;return {state:rest};}
 return fail('Unknown quiz action.');
}
