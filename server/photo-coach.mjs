import {AppError} from './model.mjs';
export const coachReady=()=>!!process.env.ANTHROPIC_API_KEY;
const MEDIA_TYPES=['image/jpeg','image/png','image/webp'];
const MAX_BASE64=3_000_000;
const SCHEMA={
 type:'object',additionalProperties:false,
 required:['readable','title','good','tip','score','subject'],
 properties:{
  readable:{type:'boolean',description:'False if the file is not a photograph at all.'},
  title:{type:'string',description:'A short, warm title for the photo, four words or fewer.'},
  subject:{type:'string',description:'What the photo is of, in a few words.'},
  good:{type:'array',description:'One to three things this photographer genuinely did well. Specific, never generic praise.',items:{type:'string'}},
  tip:{type:'string',description:'One thing to try next time, phrased as an experiment rather than a correction.'},
  score:{type:'integer',description:'Out of ten, judged against what a child of this age could do — not against a professional.'}}
};
const system=age=>`You are looking at a photograph taken by a ${age}-year-old on a family holiday in Japan, and giving them feedback.

Rules:
- Talk to the child, not about them. Short sentences. No jargon: say "the light was behind you" rather than "backlit".
- "good" must be specific to THIS photo — what they framed, caught, noticed or waited for. Generic praise is worthless and children can tell.
- "tip" is one thing to try next time, as an experiment: "next time crouch down to his height and see what happens". Never a list, never a telling-off.
- The score is out of ten against what a child of this age could manage, not against a professional. Be generous but not dishonest: a genuinely lovely photo can be a 9, a blurry one of a bin is a 3, and most are 5 to 8.
- If there are people in it, never guess who they are, never describe how anyone looks, and never comment on anybody's body or face.
- If it is not a photograph, set readable to false.`;
export async function coachPhoto({image,mediaType,age}){
 if(!coachReady())throw new AppError('Photo feedback is not switched on. Add an Anthropic API key to the deployment.',503);
 if(typeof image!=='string'||!image)throw new AppError('Choose a photo.');
 const data=image.includes(',')&&image.startsWith('data:')?image.slice(image.indexOf(',')+1):image;
 if(!/^[A-Za-z0-9+/=]+$/.test(data))throw new AppError('That photo could not be read.');
 if(data.length>MAX_BASE64)throw new AppError('That photo is too large.',413);
 if(!MEDIA_TYPES.includes(mediaType))throw new AppError('Use a JPEG, PNG or WebP photo.');
 const years=Number.isInteger(age)&&age>=3&&age<=18?age:8;
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let response;
 try{
  response=await client.messages.create({
   model:'claude-opus-5',max_tokens:2000,system:system(years),
   thinking:{type:'adaptive'},
   output_config:{effort:'low',format:{type:'json_schema',schema:SCHEMA}},
   messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:mediaType,data}},
    {type:'text',text:'Tell them what they did well and one thing to try next time.'}]}]
  });
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected.',502);
  if(e?.status===429)throw new AppError('Busy. Try again in a moment.',429);
  throw new AppError('The feedback could not be fetched. The photo is still saved.',502);
 }
 if(response.stop_reason==='refusal')throw new AppError('No feedback for that one. Try another photo.',422);
 const text=response.content.filter(b=>b.type==='text').map(b=>b.text).join('');
 let parsed;try{parsed=JSON.parse(text);}catch{throw new AppError('The feedback came back unreadable. Try again.',502);}
 if(!parsed.readable)throw new AppError('That does not look like a photograph.',422);
 return {...parsed,score:Math.max(1,Math.min(10,parsed.score||5)),usage:{input:response.usage?.input_tokens??0,output:response.usage?.output_tokens??0}};
}
