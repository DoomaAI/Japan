export const japanDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const japanClock=(date=new Date())=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
export const minutes=t=>t?Number(t.slice(0,2))*60+Number(t.slice(3)):null;
export const asClock=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export const activeSteps=(state,day)=>state.steps.filter(s=>s.day===day&&(!s.group||!state.choices[s.group]||state.choices[s.group]===s.option)).sort((a,b)=>a.order-b.order);
export function scheduleProposal(steps,delta){
 const changes=[],conflicts=[];
 for(const s of steps){
  if(s.locked||!s.time||['done','skipped'].includes(s.status))continue;
  const t=minutes(s.time)+delta;
  if(t<0||t>=1440){conflicts.push(`${s.title}: would move outside this day.`);continue;}
  changes.push({id:s.id,time:asClock(t)});
 }
 const changed=new Map(changes.map(x=>[x.id,x.time]));
 for(const [i,s]of steps.entries()){
  if(!changed.has(s.id))continue;
  const next=steps.slice(i+1).find(n=>n.locked&&n.time&&!['done','skipped'].includes(n.status));
  if(next&&minutes(changed.get(s.id))+(s.duration||0)>minutes(next.time))conflicts.push(`${s.title} may overlap ${next.title} at ${next.time}. Shorten or skip it first.`);
  const previous=steps.slice(0,i).reverse().find(n=>n.locked&&n.time&&n.status!=='skipped');
  if(previous&&minutes(changed.get(s.id))<minutes(previous.time)+(previous.duration||0))conflicts.push(`${s.title} would overlap or move before ${previous.title}. Keep it after the fixed activity.`);
 }
 return {changes,conflicts:[...new Set(conflicts)]};
}
export function calendarEvent(step){
 if(!step.time)return null;
 const start=new Date(`${step.day}T${step.time}:00+09:00`),end=new Date(+start+Math.max(step.duration||30,5)*60000);
 const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
 const esc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pasfield//Japan Trip//EN','BEGIN:VEVENT',`UID:${step.id}@pasfield-japan`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${esc(step.title)}`,`LOCATION:${esc(step.place)}`,`DESCRIPTION:${esc(step.notes)}`,`URL:${location.origin}/?day=${step.day}&step=${step.id}`,'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:Trip reminder','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
}
