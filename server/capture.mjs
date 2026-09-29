import {AppError,MEMBERS} from './model.mjs';
import {parseCaptureLocally,CAPTURE_MAX} from '../src/capture-data.js';
import {japanDate} from '../src/timing.js';
// A sentence into a to-do. Claude reads the whole trip's days and the family's names, so
// "get Nate's Disney hat sorted the day we're at DisneySea" comes back as a buy, for Nate, on
// the DisneySea day. Without a key, or when Claude cannot be reached, the plain parser answers
// instead, so the box never dies: it only gets less clever.
export const captureReady=()=>!!process.env.ANTHROPIC_API_KEY;
const SCHEMA={
 type:'object',additionalProperties:false,
 required:['title','kind','day','person','notes'],
 properties:{
  title:{type:'string',description:'The job, as a short imperative line of at most 80 characters, with the day and the person taken out of it. Keep the verb: "Buy a SIM at the airport", "Post the postcards".'},
  kind:{type:'string',enum:['do','buy'],description:'"buy" if the job is buying or picking up a thing; otherwise "do".'},
  day:{type:['string','null'],description:'One of the trip dates given, as YYYY-MM-DD, when the sentence ties the job to a day, a weekday, a city or a place we are visiting on a known day. Otherwise null. Never invent a date.'},
  person:{type:'string',description:'The family member it is for, spelt exactly as in the list, or "Family" when it is for everyone or nobody in particular.'},
  notes:{type:'string',description:'Anything said that does not belong in the title: where, how many, which shop, a price. Otherwise empty.'}}
};
const SYSTEM=`You turn one sentence, spoken or typed by a parent on a family trip to Japan, into a to-do item.
The family is Damien and Lauren with their sons Boston (8) and Nate (5). You are given the trip's days with their cities and today's date in Japan; use them to resolve "tomorrow", weekdays, "the Disney day", "when we're in Kyoto". Relative days count from today's date in Japan.
Rules: keep the title short and in the words they used; put detail in notes; pick "buy" only for getting a thing; never invent a date or a name that is not in the lists; if unsure of the day, leave it null.`;
export async function parseCapture({text,day},state,now=new Date()){
 if(typeof text!=='string'||!text.trim())throw new AppError('Say or type what needs doing first.');
 if(text.length>CAPTURE_MAX)throw new AppError(`Keep it under ${CAPTURE_MAX} characters. One job at a time.`);
 const today=japanDate(now),members=state.members?.length?state.members:MEMBERS;
 if(!captureReady())return parseCaptureLocally(text,state,today);
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let response;
 try{
  response=await client.messages.create({
   model:'claude-opus-5-5',
   max_tokens:1000,
   system:SYSTEM,
   output_config:{effort:'low',format:{type:'json_schema',schema:SCHEMA}},
   messages:[{role:'user',content:`Today in Japan: ${today}.${day&&state.days.some(d=>d.date===day)?` They are looking at the plan for ${day}.`:''}
Family: ${members.join(', ')}.
Trip days:
${state.days.map(d=>`${d.date} ${d.city}`).join('\n')}

What they said: ${text.trim()}`}]
  });
 }catch{
  // Any trouble reaching Claude and the plain parser answers; the form is checked either way.
  return parseCaptureLocally(text,state,today);
 }
 if(response.stop_reason==='refusal')return parseCaptureLocally(text,state,today);
 let parsed;try{parsed=JSON.parse(response.content.filter(b=>b.type==='text').map(b=>b.text).join(''));}catch{return parseCaptureLocally(text,state,today);}
 // What comes back is checked against the plan the same way a typed form is, then trusted no further.
 const local=parseCaptureLocally(text,state,today);
 return {
  title:(typeof parsed.title==='string'&&parsed.title.trim()?parsed.title.trim():local.title).slice(0,250),
  kind:parsed.kind==='buy'?'buy':'do',
  day:parsed.day&&state.days.some(d=>d.date===parsed.day)?parsed.day:null,
  person:['Family',...members].includes(parsed.person)?parsed.person:'Family',
  notes:typeof parsed.notes==='string'?parsed.notes.trim().slice(0,2000):'',
  via:'claude',usage:{input:response.usage?.input_tokens??0,output:response.usage?.output_tokens??0}};
}
