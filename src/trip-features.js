import {activeSteps,minutes,asClock,japanDate,japanClock} from './timing.js';
export const BOYS=['Nate','Boston'];
export function initialChallenges(days){
 const junior=[
 ['Airport code detective','Find HND or another airport code on a sign. Match it to a boarding pass with a parent. Stretch: what might the letters stand for?'],
 ['Nature pattern hunter','Find three different leaf shapes or repeating patterns. Sort them your way and explain your rule.'],
 ['Art detective','Choose an artwork or display. Predict what will happen when you move, then test your idea.'],
 ['Train map navigator','Find our start and destination on a map with a parent. Count the stops or match the line colours.'],
 ['Design a game power-up','Invent a power-up for a ride or game. Explain its special ability and one rule that keeps it fair.'],
 ['Bamboo engineer','Look at bamboo from the path. Find its repeating sections and design a tall tower using the same idea.'],
 ['Deer observer','Watch deer from a respectful distance with a parent. Describe two behaviours and guess what each means.'],
 ['Food sign detective','Find three food pictures or shop signs. Work out what each shop sells using the clues.'],
 ['Journey comparison','Compare two ways we travelled today. Which carries more people? Which felt faster? Explain your clues.'],
 ['Imagineer for a day','Choose a ride or scene. Explain how sound, colour or movement helps tell its story.'],
 ['Harbour designer','Find three details that make a place look like a harbour. Draw an imaginary boat and explain its job.'],
 ['Yen puzzle','With a parent, choose two price labels. Which costs more? Can you make 100 yen using different coins?'],
 ['Scoreboard detective','At the game or on a photo, find the score. Explain who is ahead and how many more they have.'],
 ['Souvenir decision','Compare two things you like. Give one reason to choose each, then decide which you would use most at home.'],
 ['City pattern hunt','Spot a repeating shape, a symbol and a clever way people queue. Explain what each helps people do.'],
 ['Museum of our trip','Choose three favourite memories. Put them in order and give your tiny museum a name.']
 ];
 const senior=[
 ['Arrival planner','Read the arrival information with a parent. Work out the time until our next step. Stretch: explain the Japan–Sydney time difference using the phone clocks.'],
 ['Old and new investigator','Find a traditional detail and a modern one. Explain what job each does and how the city fits both together.'],
 ['Prediction and evidence','Choose an interactive artwork or a sumo moment. Make a prediction, observe what happens, then explain whether your evidence supports it.'],
 ['Rail journey analyst','Find our route on a map. Estimate the distance or count stops, then compare the estimate with the journey information.'],
 ['Theme-park strategist','Using posted wait times with a parent, choose two attractions and explain the best order. Include time to walk and take a break.'],
 ['Bamboo structure challenge','Sketch a bamboo stem and label two features that could help it stay tall or bend. Compare your ideas with a building or tower.'],
 ['Animal behaviour notebook','Observe deer quietly with a parent. Record three behaviours. Separate what you actually saw from what you think it means.'],
 ['Menu value puzzle','Using real menu prices, build two snack combinations under a parent-agreed yen budget. Which is better value, and why?'],
 ['Transfer planner','Read the travel plan with a parent. Work out how much time we have between two steps and suggest a sensible buffer.'],
 ['Imagineering review','Choose an attraction. Explain how it uses at least three of sound, light, movement, scenery and timing to tell a story.'],
 ['Design a new port','Invent a DisneySea-style port. Give it a setting, a ride idea and one detail that makes the story believable.'],
 ['Market comparison','Compare prices or sizes for three similar items. Work out which you would choose and explain a reason besides price.'],
 ['Baseball analyst','Use the scoreboard or a game summary to explain innings, runs and who is ahead. Predict one result and compare it with what happens.'],
 ['Smart souvenir buyer','Compare two souvenirs for price, quality, luggage space and usefulness at home. Make a recommendation within an agreed budget.'],
 ['Urban design detective','Find one feature that helps lots of people move safely. Explain the problem it solves and suggest an improvement.'],
 ['Trip curator','Choose five trip highlights and arrange them as a story. Add one thing you learned and one question you still want to investigate.']
 ];
 const overall={
 Nate:[['Japanese phrase explorer','Learn and use five useful Japanese words or phrases with a parent. Explain what each means.'],['Stamp and symbol collector','Find three different station or attraction stamps or symbols. Sketch or photograph them where allowed and compare their designs.'],['Money master','Show two different ways to make the same amount of yen with coins, with a parent helping.'],['Three-city detective','Choose a detail that makes Tokyo, Kyoto and Osaka feel different. Tell us why.'],['Photo story maker','Choose four photos and tell a story with a beginning, middle and end.'],['Invent a Japan game','Make a simple game inspired by the trip and teach the family its rules.']],
 Boston:[['Japanese mini conversation','Learn five useful phrases and try a short polite exchange with a parent alongside. Explain which phrase fits which situation.'],['Route master','Help plan three real routes with a parent. Compare travel time, transfers and walking.'],['Yen budget keeper','Set an agreed souvenir budget, record purchases and calculate what remains.'],['Evidence collector','Investigate three questions about Japan. For each, record what you observed and where you checked the answer.'],['Trip documentary','Create a six-photo story or short video with captions explaining something you learned.'],['Design the next family day','Propose a day with travel, an activity, food, a break and a backup option. Explain how the timing works.']]
 };
 return [...days.flatMap((d,i)=>BOYS.map(person=>{const mission=(person==='Nate'?junior:senior)[i%junior.length];return {id:`mission-${d.date}-${person}`,title:mission[0],notes:mission[1],day:d.date,participants:[person],completions:{},responses:{}};})),...BOYS.flatMap(person=>overall[person].map(([title,notes],i)=>({id:`quest-${person}-${i}`,title,notes,day:null,participants:[person],completions:{},responses:{}})))];
}
export function ensureFeatures(state){
 return {...state,mapUrl:(state.mapUrl||'').replace('1SDEq4N32fF5lTAzSNS00w5A1R0Ldarw','1mztIuWzTviCEZSLdDxEUqo2WK3HUNfo'),mapEmbed:(state.mapEmbed||'').replace('1SDEq4N32fF5lTAzSNS00w5A1R0Ldarw','1mztIuWzTviCEZSLdDxEUqo2WK3HUNfo'),challenges:state.challenges??initialChallenges(state.days),shopping:state.shopping??[],meetings:state.meetings??{},contacts:state.contacts??{Damien:'',Lauren:''},alerts:state.alerts??[],journal:state.journal??{}};
}
export function delayedDayProposal(steps,delay,nowMinute=null){
 const changes=[],backlog=[],warnings=[];let cursor=nowMinute??0;
 for(let i=0;i<steps.length;i++){
  const s=steps[i];if(['done','skipped'].includes(s.status))continue;
  if(s.locked||s.status==='started'){
   if(s.time){const start=minutes(s.time);if(s.locked&&cursor>start)warnings.push(`${s.title} at ${s.time} may already be too tight. Check directions and the booking.`);cursor=Math.max(cursor,start+(s.duration||0));}
   continue;
  }
  if(!s.time)continue;
  const candidate=Math.max(minutes(s.time)+delay,cursor),next=steps.slice(i+1).find(n=>n.locked&&n.time&&!['done','skipped'].includes(n.status));
  const cutoff=next?minutes(next.time)-(next.travelMinutes??20)-(next.arrivalBuffer??15):1440;
  if(candidate+(s.duration||0)>cutoff||candidate>=1440){backlog.push({id:s.id,title:s.title,reason:next?`Make room to reach ${next.title}`:'No room left today'});continue;}
  if(candidate!==minutes(s.time))changes.push({id:s.id,title:s.title,from:s.time,time:asClock(candidate)});
  cursor=candidate+(s.duration||0);
 }
 return {changes,backlog,warnings};
}
export function delayForDay(state,day,delay,now=new Date()){
 return delayedDayProposal(activeSteps(state,day),delay,day===japanDate(now)?minutes(japanClock(now)):null);
}
export function nextSummary(state,day){
 const remaining=activeSteps(state,day).filter(s=>!['done','skipped'].includes(s.status));
 const current=remaining.find(s=>s.status==='started')||remaining[0];
 const fixed=remaining.filter(s=>s.locked&&s.time).sort((a,b)=>a.time.localeCompare(b.time))[0];
 const departure=fixed?new Date(new Date(`${day}T${fixed.time}:00+09:00`).getTime()-((fixed.travelMinutes??20)+(fixed.arrivalBuffer??15))*60000):null;
 return {current,fixed,departure};
}
export function offlineManifest(state,day){
 const d=state.days.find(d=>d.date===day),ids=new Set(activeSteps(state,day).map(s=>s.id));
 const docs=state.documents.filter(d=>d.category!=='memory'&&(d.day===day||ids.has(d.stepId)||(!d.day&&!d.stepId)));
 return {files:[...(d?.pages||[]).map(p=>({key:`page-${p}`,title:`Guide page ${p}`,url:`/api/guide?page=${p}`})),...docs.filter(d=>d.pathname).map(d=>({key:`doc-${d.id}`,title:d.title,url:`/api/document?id=${d.id}`}))],links:docs.filter(d=>d.type==='link')};
}
export function searchTrip(state,query,guide=[]){
 const q=query.trim().toLowerCase();if(!q)return [];
 const hits=[],match=(...parts)=>parts.flat().filter(Boolean).join(' ').toLowerCase().includes(q);
 for(const s of state.steps)if(match(s.title,s.place,s.japanese,s.notes,s.bookingReference,s.website))hits.push({type:s.day?'Activity':'Option',id:s.id,title:s.title,detail:s.notes,day:s.day,step:s});
 for(const d of state.documents)if(match(d.title,d.reference,d.notes,d.tags))hits.push({type:d.category==='memory'?'Memory':'Document',id:d.id,title:d.title,detail:d.notes,day:d.day||state.steps.find(s=>s.id===d.stepId)?.day,document:d});
 for(const l of state.locations||[])if(match(l.name,l.district,l.city,l.address,l.category,l.notes))hits.push({type:'Location',id:l.id,title:l.name,detail:l.address});
 for(const s of state.shopping)if(match(s.title,s.notes,s.store,s.person,s.tags))hits.push({type:'Shopping',id:s.id,title:s.title,detail:s.store,day:s.day});
 for(const c of state.challenges)if(match(c.title,c.notes))hits.push({type:'Challenge',id:c.id,title:c.title,day:c.day});
 for(const [day,m]of Object.entries(state.meetings))if(match(m.place,m.japanese,m.notes))hits.push({type:'Meeting',id:day,title:m.place,detail:m.notes,day});
 for(const [day,n]of Object.entries(state.journal))if(match(n))hits.push({type:'Diary',id:day,title:`Diary · ${day}`,detail:n,day});
 for(const p of guide)if(match(p.text))hits.push({type:'Guide',id:p.number,title:`Guide page ${p.number}`,page:p.number});
 return hits;
}
export function diaryDays(state,day){
 return state.days.filter(d=>!day||d.date===day).map(d=>{
  const steps=state.steps.filter(s=>s.day===d.date&&s.status==='done').sort((a,b)=>(a.completedAt||'').localeCompare(b.completedAt||''));
  const media=state.documents.filter(m=>m.category==='memory'&&(m.day===d.date||state.steps.find(s=>s.id===m.stepId)?.day===d.date));
  const challenges=state.challenges.flatMap(c=>Object.entries(c.completions||{}).filter(([,at])=>at&&japanDate(new Date(at))===d.date).map(([name])=>`${name}: ${c.title}${c.responses?.[name]?' — '+c.responses[name]:''}`));
  return {...d,steps,media,challenges,note:state.journal[d.date]||''};
 });
}
export function pendingProgress(state,queue){
 const next=ensureFeatures(structuredClone(state));
 for(const {operation:o}of queue){
  if(o.type==='status'){const s=next.steps.find(s=>s.id===o.id);if(s){s.status=o.status;s.pending=true;if(o.status==='done')s.completedAt=o.at;if(o.status==='started')s.startedAt=o.at;if(o.status==='todo'){delete s.startedAt;delete s.completedAt;}}}
  if(o.type==='challengeStatus'){const c=next.challenges.find(c=>c.id===o.id);if(c){c.completions={...c.completions};if(o.done)c.completions[o.person]=c.completions[o.person]||o.at;else delete c.completions[o.person];if(o.response!==undefined)c.responses={...(c.responses||{}),[o.person]:o.response};}}
 }
 return next;
}
