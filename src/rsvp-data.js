// The invitation and the answers to it. An invitation is one record on the plan: what a guest
// reads at the public link, which questions they are asked, and whether it is out yet. An RSVP
// is one record per guest: in, maybe or out, who they are bringing, what they cannot eat, and
// their answers. Both are kept on the plan's state beside the steps, so the day, the time and
// the place come from the plan itself and cannot drift from it. Shared by the phone and the
// server; no dependencies; problems come back as sentences. (docs/design/events-and-rsvp.md)
import {zonedInstant} from './timing.js';
export const RSVP_STATUSES=[['in','I’m in'],['maybe','Maybe'],['out','Can’t make it']];
export const STATUS_IDS=RSVP_STATUSES.map(([id])=>id);
export const QUESTION_KINDS=[['text','A line of text'],['choice','One of a few options'],['yesno','Yes or no']];
export const MAX_QUESTIONS=8,MAX_OPTIONS=8,MAX_CHILDREN=10;
export const EMPTY_INVITATION={published:false,saveTheDate:false,hosts:'',message:'',dress:'',bring:'',childrenWelcome:true,plusOnes:false,giftsNote:'',rsvpBy:null,askDietary:true,showNames:'organiser',questions:[],stepId:null};
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const isoDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'));
export function invitationOf(state){
 const given=state?.invitation||{};
 return {...EMPTY_INVITATION,...given,questions:Array.isArray(given.questions)?given.questions.map(q=>({...q,options:Array.isArray(q.options)?[...q.options]:[]})):[]};
}
export const INVITATION_FIELDS=Object.keys(EMPTY_INVITATION);
export function invitationProblem(patch,state=null){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))return 'Invalid invitation.';
 for(const [k,v] of Object.entries(patch)){
  if(!INVITATION_FIELDS.includes(k))return 'Unsupported invitation field.';
  if(['published','saveTheDate','childrenWelcome','plusOnes','askDietary'].includes(k)&&typeof v!=='boolean')return 'That switch is on or off.';
  if(['hosts','dress','bring','giftsNote'].includes(k)&&!text(v,250))return 'Keep that under 250 characters.';
  if(k==='message'&&!text(v,2000))return 'Keep the message under 2,000 characters.';
  if(k==='rsvpBy'&&v!==null&&!isoDay(v))return 'Give the RSVP date as a day.';
  if(k==='showNames'&&!['organiser','everyone'].includes(v))return 'Names are for the organiser, or for everyone.';
  if(k==='stepId'&&v!==null&&!(state?.steps||[]).some(s=>s.id===v))return 'Choose a stop that is on the plan.';
  if(k==='questions'){
   if(!Array.isArray(v)||v.length>MAX_QUESTIONS)return `Ask up to ${MAX_QUESTIONS} questions.`;
   const ids=new Set();
   for(const q of v){
    if(!q||typeof q!=='object'||!text(q.id,40)||!q.id||ids.has(q.id))return 'Each question needs its own id.';ids.add(q.id);
    if(!text(q.label,120)||!q.label.trim())return 'Give each question its wording.';
    if(!QUESTION_KINDS.some(([id])=>id===q.kind))return 'Choose a kind of question from the list.';
    if(q.kind==='choice'&&(!Array.isArray(q.options)||q.options.length<2||q.options.length>MAX_OPTIONS||q.options.some(o=>!text(o,60)||!o.trim())))return `A choice needs two to ${MAX_OPTIONS} options.`;
   }
  }
 }
 return null;
}
// The moment the invitation is about: the stop the organiser chose, else the first fixed stop
// with a time, else the first stop with a time, else the first stop, on the plan's first day.
export function mainMoment(state){
 const inv=invitationOf(state),days=state?.days||[],dates=new Set(days.map(d=>d.date));
 // Only stops on the plan's own days: the seeders still add the family's stops to any state.
 const steps=(state?.steps||[]).filter(s=>s.day&&dates.has(s.day)).sort((a,b)=>(a.day.localeCompare(b.day))||(a.order-b.order));
 const chosen=inv.stepId?steps.find(s=>s.id===inv.stepId):null;
 const step=chosen||steps.find(s=>s.locked&&s.time)||steps.find(s=>s.time)||steps[0]||null;
 const day=days.find(d=>d.date===(step?.day||days[0]?.date))||days[0]||null;
 return {day,step};
}
export function whenWhere(state){
 const {day,step}=mainMoment(state);
 const startsAt=day&&step?.time?zonedInstant(day.date,step.time,state?.plan?.timeZone).toISOString():null;
 const endsAt=startsAt?new Date(Date.parse(startsAt)+Math.max(step.duration||120,15)*60000).toISOString():null;
 return {date:day?.date||null,time:step?.time||null,startsAt,endsAt,title:step?.title||day?.title||'',place:step?.place||'',city:day?.city||'',notes:step?.notes||''};
}
// The answers: one record per guest, written by the guest or by a parent for them.
export const rsvpOf=(state,name)=>state?.rsvps?.[name]||null;
export const EMPTY_RSVP={status:null,plusOne:'',children:0,dietary:'',note:'',answers:{}};
export function rsvpProblem(answer,invitation){
 if(!answer||typeof answer!=='object'||Array.isArray(answer))return 'Invalid answer.';
 const inv={...EMPTY_INVITATION,...(invitation||{})};
 if(!STATUS_IDS.includes(answer.status))return 'Say whether you are in, a maybe, or out.';
 if(answer.plusOne!==undefined&&(!text(answer.plusOne,40)||(answer.plusOne&&!inv.plusOnes)))return inv.plusOnes?'Keep the plus-one’s name under 40 characters.':'This invitation is for the people named on it.';
 if(answer.children!==undefined&&(!Number.isInteger(answer.children)||answer.children<0||answer.children>MAX_CHILDREN||(answer.children>0&&!inv.childrenWelcome)))return inv.childrenWelcome?`Children: 0 to ${MAX_CHILDREN}.`:'This one is grown-ups only.';
 if(answer.dietary!==undefined&&!text(answer.dietary,200))return 'Keep dietary needs under 200 characters.';
 if(answer.note!==undefined&&!text(answer.note,500))return 'Keep the note under 500 characters.';
 if(answer.answers!==undefined){
  if(!answer.answers||typeof answer.answers!=='object'||Array.isArray(answer.answers))return 'Invalid answers.';
  for(const [id,v] of Object.entries(answer.answers)){
   const q=(inv.questions||[]).find(q=>q.id===id);if(!q)return 'That question is not on the invitation.';
   if(q.kind==='text'&&!text(v,200))return `Keep “${q.label}” under 200 characters.`;
   if(q.kind==='choice'&&v!==''&&!q.options.includes(v))return `Choose one of the options for “${q.label}”.`;
   if(q.kind==='yesno'&&![true,false,null].includes(v))return `“${q.label}” is yes or no.`;
  }
 }
 return null;
}
// Answers close at the end of the RSVP day in the plan's time; a parent can still answer for
// someone after that, the way a phone call from an aunt is answered.
export const answersClosed=(state,now=new Date())=>{const by=invitationOf(state).rsvpBy;return !!by&&now.getTime()>=zonedInstant(by,'23:59',state?.plan?.timeZone).getTime()+60000;};
export function applyRsvp(state,{name,answer,by,now,override=false}){
 if(!(state.members||[]).includes(name))return 'That person is not in the plan.';
 const inv=invitationOf(state),problem=rsvpProblem(answer,inv);if(problem)return problem;
 if(!override&&answersClosed(state,new Date(now||Date.now())))return `Answers closed on ${inv.rsvpBy}. Ask the organiser to change yours.`;
 const previous=state.rsvps?.[name]||EMPTY_RSVP;
 state.rsvps={...(state.rsvps||{}),[name]:{...EMPTY_RSVP,...previous,status:answer.status,plusOne:answer.plusOne??previous.plusOne,children:answer.children??previous.children,dietary:answer.dietary??previous.dietary,note:answer.note??previous.note,answers:{...previous.answers,...(answer.answers||{})},answeredBy:by,answeredAt:now||new Date().toISOString()}};
 return null;
}
// What the organiser reads off the list: how many in, out, maybe and silent; heads for the
// caterer; what people cannot eat; and who has not answered.
export function guestSummary(state){
 const rsvps=state?.rsvps||{},members=state?.members||[];
 const counts={in:0,maybe:0,out:0,none:0},heads={adults:0,children:0},dietary=[],byStatus={in:[],maybe:[],out:[],none:[]};
 for(const name of members){
  const r=rsvps[name],status=r?.status||'none';counts[status]++;byStatus[status].push(name);
  if(status==='in'){heads.adults+=1+(r.plusOne?1:0);heads.children+=r.children||0;}
  if(r?.dietary)dietary.push({name,text:r.dietary});
 }
 return {counts,heads,dietary,byStatus,unanswered:byStatus.none,total:members.length};
}
const csvCell=v=>{const t=String(v??'');return /[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t;};
export function guestsCsv(state){
 const inv=invitationOf(state),rows=[['Name','Household','Status','Plus-one','Children','Dietary','Note',...inv.questions.map(q=>q.label),'Answered by','Answered at']];
 for(const name of state.members||[]){const r=state.rsvps?.[name]||{},h=state.people?.[name]?.household||'';rows.push([name,h,r.status||'',r.plusOne||'',r.children||0,r.dietary||'',r.note||'',...inv.questions.map(q=>{const v=r.answers?.[q.id];return v===true?'Yes':v===false?'No':v??'';}),r.answeredBy||'',r.answeredAt||'']);}
 return rows.map(r=>r.map(csvCell).join(',')).join('\n');
}
// What the public link sends: only what a guest is meant to read. Nothing about the other
// guests beyond a count, and their names only when the organiser said so; never a household's
// notes, never anyone's dietary needs, never a ticket or a phone number.
export function invitationView(state,now=new Date()){
 const inv=invitationOf(state),plan=state.plan||{},open=inv.published||inv.saveTheDate;
 const base={plan:{title:plan.title||state.tripName||'',type:plan.type||'trip',timeZone:plan.timeZone||'Asia/Tokyo',locale:plan.locale||'en-AU'},published:inv.published,saveTheDate:inv.saveTheDate&&!inv.published};
 if(!open)return {...base,when:null};
 const summary=guestSummary(state);
 return {...base,when:whenWhere(state),hosts:inv.hosts,message:inv.published?inv.message:'',dress:inv.published?inv.dress:'',bring:inv.published?inv.bring:'',giftsNote:inv.published?inv.giftsNote:'',
  childrenWelcome:inv.childrenWelcome,plusOnes:inv.plusOnes,askDietary:inv.askDietary,rsvpBy:inv.rsvpBy,closed:answersClosed(state,now),questions:inv.published?inv.questions:[],
  coming:summary.counts.in,names:inv.showNames==='everyone'?summary.byStatus.in:null};
}
// What a guest on their own phone sees of the others: their own record whole; everyone else's
// status only when the organiser shares names, otherwise nothing but the counts.
export function visibleRsvps(state,user){
 if(user?.role==='parent')return state.rsvps||{};
 const inv=invitationOf(state),out={};
 for(const [name,r] of Object.entries(state.rsvps||{})){if(name===user?.name)out[name]=r;else if(inv.showNames==='everyone')out[name]={status:r.status};}
 return out;
}
