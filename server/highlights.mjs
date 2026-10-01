// The highlights edit list, written by Claude. It looks at the family's own photos (a handful of
// the best, as images) and reads what is known about every other shot — the day, the stop, who took
// it, the stars — and the sound postcards, and hands back an ordered edit list: day cards, shots
// with captions, and which sound plays under which shot. It makes nothing; the phone renders it.
// Whatever comes back is checked against the trip (cleanEditList) before it is kept.
import {get} from '@vercel/blob';
import {AppError} from './model.mjs';
import {candidateShots,soundsOf,cleanEditList,defaultEditList,MAX_SHOTS} from '../src/highlights-data.js';
export const highlightsReady=()=>!!process.env.ANTHROPIC_API_KEY;
export const MAX_IMAGES=16;
const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
const RECORD={
 name:'record_edit',
 description:'Record the edit list for the highlights video, once, at the end.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['items'],properties:{
  items:{type:'array',description:`In playing order: an opening title, a title card at the start of each day used, shots, and a closing title. At most ${MAX_SHOTS} shots.`,items:{
   type:'object',additionalProperties:false,required:['kind','text','sub','ref','caption','seconds','sound'],properties:{
    kind:{type:'string',enum:['title','shot']},
    text:{type:'string',description:'For a title: the big words (the trip, the day). Empty for a shot.'},
    sub:{type:'string',description:'For a title: the small line under it. Empty for a shot.'},
    ref:{type:'string',description:'For a shot: the reference exactly as given (photo:… or doc:…). Empty for a title.'},
    caption:{type:'string',description:'For a shot: a few warm words, in the family’s voice, not a description of the picture. Empty for a title.'},
    seconds:{type:'number',description:'How long it is on screen: 2.5–4 for a photo, up to 6 for a clip, about 2.4 for a title.'},
    sound:{type:'string',description:'For a shot: the id of a sound postcard to start under it, exactly as given, each used at most once — best under a shot from the same stop. Empty otherwise.'}}}}}}
};
const SYSTEM=`You are cutting a short highlights video of one family's trip to Japan, out of their own photos and clips, for them to keep and share with the grandparents. You choose and order; the phone makes the video.

- Two to three minutes in all. Every day that has something worth showing gets a title card and two to four shots; skip a day with nothing good rather than padding it.
- Lead each day with its best moment (marked "photo of the day" or highly starred), favour faces and the boys' own photos, and avoid two near-identical shots in a row.
- Captions are short and warm, in the family's voice ("Boston's first bullet train"), never a description of what is plainly in the picture, and never invented facts.
- Sound postcards are short recordings made at a stop (a station melody, a temple bell). Start each one under a shot from the same stop or day, once.
- Use only references and sound ids exactly as given. Call record_edit exactly once.`;
async function imageBlock(shot,state){
 const [kind,id]=shot.ref.split(':');
 const item=kind==='photo'?state.photos?.find(p=>p.id===id):state.documents?.find(d=>d.id===id);
 if(!item?.pathname||!IMAGE_TYPES.includes(item.type))return null;
 const r=await get(item.pathname,{access:'private',useCache:false}).catch(()=>null);if(!r?.stream)return null;
 const chunks=[];for await(const c of r.stream)chunks.push(c);
 const buf=Buffer.concat(chunks.map(c=>Buffer.from(c)));if(buf.length>4500000)return null;
 return {type:'image',source:{type:'base64',media_type:item.type,data:buf.toString('base64')}};
}
export async function planHighlights(state,{images=true}={}){
 if(!highlightsReady())return defaultEditList(state);
 const shots=candidateShots(state),sounds=soundsOf(state);
 if(!shots.length)throw new AppError('There is nothing to cut a video from yet. Add some photos first.');
 // The best of each day as pictures, spread across the trip, the rest as words.
 const look=[];for(const day of [...new Set(shots.map(s=>s.day))])for(const s of shots.filter(x=>x.day===day&&x.kind==='image').slice(0,2))if(look.length<MAX_IMAGES)look.push(s);
 const blocks=[];
 if(images)for(const s of look){const b=await imageBlock(s,state);if(b)blocks.push({type:'text',text:`Picture ${s.ref}:`},b);}
 const days=(state.days||[]).map(d=>`${d.date} · ${d.city} · ${d.title}`).join('\n');
 const list=shots.map(s=>`[${s.ref}] ${s.day} · ${s.kind}${s.best?' · photo of the day':''}${s.stars?` · ${s.stars}★`:''}${s.who?` · by ${s.who}`:''}${s.stop?` · at ${s.stop}`:''}${s.title?` · “${s.title}”`:''}`).join('\n');
 const sound=sounds.map(v=>`[${v.id}] ${v.day} · ${v.title||'a sound'}${v.stepId?` · at ${(state.steps||[]).find(x=>x.id===v.stepId)?.title||''}`:''} · ${v.seconds||12}s`).join('\n');
 const ask=`The trip: ${state.tripName||'Japan'}, ${state.days?.length||0} days.\n${days}\n\nEvery shot there is:\n${list}\n\nSound postcards:\n${sound||'(none)'}\n\nSome of the pictures follow, so you can see them.`;
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let message;
 try{
  message=await client.messages.create({model:'claude-opus-5-5',max_tokens:8000,system:SYSTEM,thinking:{type:'adaptive'},output_config:{effort:'low'},
   tools:[RECORD],tool_choice:{type:'tool',name:'record_edit'},messages:[{role:'user',content:[{type:'text',text:ask},...blocks]}]});
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Busy. Try again in a moment.',429);
  throw new AppError('The plan could not be made. The automatic one is ready instead.',502);
 }
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_edit');
 const clean=cleanEditList({items:(call?.input?.items||[]).map(i=>({...i,sound:i.sound||undefined})),by:'claude'},state);
 if(!clean)throw new AppError('The plan came back without any of our photos in it. The automatic one is ready instead.',502);
 return clean;
}
