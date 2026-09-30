// Next time. Stars say how a stop was; this is the lesson, written while it is fresh: book the
// nine o'clock slot, skip the queue and do the park first, half a day is enough. One tap on a
// chip or a line typed, per person, on the stop itself. It is the part of a trip that is
// usually lost by the time the next one is planned, so it is kept where the next plan will
// look: on a page of its own, and in what the model is told when it suggests anything.
export const NEXT_TIME_CHIPS=[
 'Book the early slot','Skip the queue: come at opening','Half a day is enough','Give it the whole day','Come hungry','Bring the stroller',
 'Not for the boys','Do it again','Once was enough','Go on a weekday','Better in the rain','Wear the good shoes'
];
export const MAX_NEXT_TIME=300;
export const nextTimeFor=(state,id)=>state?.stepReviews?.[id]?.nextTime||{};
// Every lesson so far, by day and stop, with who said it.
export function nextTimeNotes(state){
 const out=[];
 for(const [id,entry] of Object.entries(state?.stepReviews||{})){
  const step=(state.steps||[]).find(s=>s.id===id);if(!step||!entry.nextTime)continue;
  for(const [person,n] of Object.entries(entry.nextTime))if(n?.text)out.push({id,title:step.title,day:step.day,person,text:n.text,at:n.at||''});
 }
 return out.sort((a,b)=>String(a.day).localeCompare(String(b.day))||a.title.localeCompare(b.title)||a.person.localeCompare(b.person));
}
// The lines the model reads, so a suggestion for the next trip, or the next day, carries them.
export function nextTimeBrief(state,max=20){
 const notes=nextTimeNotes(state);
 if(!notes.length)return '';
 return ['Lessons the family wrote on stops, for next time:',...notes.slice(0,max).map(n=>`- ${n.title}: ${n.text} (${n.person})`)].join('\n');
}
export const nextTimeText=state=>nextTimeNotes(state).map(n=>`${n.day} · ${n.title} — ${n.text} (${n.person})`).join('\n');
